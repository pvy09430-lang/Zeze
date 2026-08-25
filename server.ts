
const sseClients = new Set<express.Response>();

function broadcastStateUpdate() {
  const message = 'data: ' + JSON.stringify({ type: "STATE_UPDATED", timestamp: Date.now() }) + '\n\n';
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Jimp } from "jimp";
import { AppState, Bot, Announcement, Feedback, BotRequest, Comment, CommentReply, Poll, PollOption, VisitorLog } from "./src/types.js";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, setLogLevel, increment, arrayUnion, arrayRemove } from "firebase/firestore";
import { v2 as cloudinary } from "cloudinary";

const DB_FILE = path.join(process.cwd(), "db.json");

// Load Firebase Config & lazy initialization helper
let db: any = null;

function getDb() {
  if (db) return db;
  try {
    const CONFIG_PATH = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(CONFIG_PATH)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      const firebaseApp = initializeApp(firebaseConfig);
      db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
      return db;
    } else {
      console.warn("⚠️ firebase-applet-config.json not found! Firestore functions will be bypassed/skipped.");
    }
  } catch (err: any) {
    console.error("❌ Failed to initialize Firebase Firestore:", err.message);
  }
  return null;
}

// Set log level to silent to suppress internal SDK warnings like benign idle gRPC stream cancellations.
// This does not affect our custom operational error handling and logging.
setLogLevel("silent");

// Cloudinary Cloud Storage Configuration
let isCloudinaryConfigured = false;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  const apiKey = process.env.CLOUDINARY_API_KEY.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET.trim();

  // Basic validation to filter out obvious placeholder values like dummy numbers
  if (apiKey === "25000" || apiKey === "" || apiSecret === "") {
    console.log("⚠️ [Cloudinary] Detected placeholder credentials (e.g. key '25000'). Disabling Cloudinary, falling back to local storage.");
  } else {
    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      isCloudinaryConfigured = true;
      console.log("☁️ [Cloudinary] Cloudinary configured successfully for secure CDN image hosting!");
    } catch (err: any) {
      console.warn("⚠️ [Cloudinary] Error configuring Cloudinary:", err.message);
    }
  }
} else {
  console.log("⚠️ [Cloudinary] Cloudinary credentials missing. Fallback base64 compression will be used.");
}

async function uploadToCloudinary(base64Str: string, folder = "bot_hub"): Promise<string> {
  if (!isCloudinaryConfigured) return base64Str;
  try {
    if (!base64Str || !base64Str.startsWith("data:")) {
      return base64Str;
    }
    const uploadRes = await cloudinary.uploader.upload(base64Str, {
      folder: folder,
      resource_type: "auto",
    });
    console.log(`☁️ [Cloudinary] Image uploaded successfully! CDN URL: ${uploadRes.secure_url}`);
    return uploadRes.secure_url;
  } catch (err: any) {
    const errMsg = err.message || String(err);
    console.error("❌ [Cloudinary] Upload failed, falling back to base64:", errMsg);
    
    // Auto-disable Cloudinary configuration on authentication/credential failures to avoid repeated failing calls and protect app performance
    if (
      errMsg.includes("Unknown API key") ||
      errMsg.includes("Must supply") ||
      errMsg.includes("invalid") ||
      errMsg.includes("secret") ||
      errMsg.includes("credentials") ||
      errMsg.includes("unauthorized") ||
      errMsg.includes("25000")
    ) {
      console.warn("⚠️ [Cloudinary] Auto-disabled Cloudinary integration temporarily due to bad/invalid credentials. Please correct your environment variables in AI Studio settings.");
      isCloudinaryConfigured = false;
    }
    return base64Str;
  }
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: "server",
      isServer: true
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const cleanObj: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      cleanObj[key] = cleanUndefined(val);
    }
  }
  return cleanObj;
}

// Persistent Pending Write Queue File
const PENDING_QUEUE_FILE = path.join(process.cwd(), "pending_writes.json");

interface PendingWriteItem {
  key: string;
  collPath: string;
  docId: string;
  data: any;
  action: 'set' | 'delete';
  timestamp: number;
}

let pendingQueue: PendingWriteItem[] = loadPendingQueue();

function loadPendingQueue(): PendingWriteItem[] {
  try {
    if (fs.existsSync(PENDING_QUEUE_FILE)) {
      const content = fs.readFileSync(PENDING_QUEUE_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        console.log(`📦 Đã tải ${parsed.length} mục dữ liệu mới đang chờ từ pending_writes.json`);
        return parsed;
      }
    }
  } catch (err) {
    console.error("Lỗi đọc file pending_writes.json:", err);
  }
  return [];
}

function savePendingQueue() {
  try {
    fs.writeFileSync(PENDING_QUEUE_FILE, JSON.stringify(pendingQueue, null, 2));
  } catch (err) {
    console.error("Lỗi ghi file pending_writes.json:", err);
  }
}

function enqueuePendingWrite(key: string, collPath: string, docId: string, data: any, action: 'set' | 'delete') {
  const existingIndex = pendingQueue.findIndex(item => item.key === key);
  const item: PendingWriteItem = {
    key,
    collPath,
    docId,
    data: action === 'set' ? cleanUndefined(data) : null,
    action,
    timestamp: Date.now()
  };
  if (existingIndex >= 0) {
    pendingQueue[existingIndex] = item;
  } else {
    pendingQueue.push(item);
  }
  savePendingQueue();
  console.log(`📦 [Hàng Đợi Chờ Cloud] Đã lưu mục mới [${key}] vào đệm. Sẽ tự động đẩy lên Cloud khi thêm lượt/làm mới. Tổng số mục chờ: ${pendingQueue.length}`);
}

function removeFromPendingQueue(key: string) {
  const initialLen = pendingQueue.length;
  pendingQueue = pendingQueue.filter(item => item.key !== key);
  if (pendingQueue.length !== initialLen) {
    savePendingQueue();
  }
}

async function firestoreWrite(collPath: string, docId: string, data: any) {
  const key = `${collPath}/${docId}`;
  try {
    const database = getDb();
    if (!database) {
      console.warn(`Firestore chưa sẵn sàng, đã lưu [${key}] vào hàng đợi đệm.`);
      enqueuePendingWrite(key, collPath, docId, data, 'set');
      return;
    }
    const cleanedData = cleanUndefined(data);
    await setDoc(doc(database, collPath, docId), cleanedData);
    recordFirestoreWrites(1, `write:${collPath}`);
    removeFromPendingQueue(key);
  } catch (error: any) {
    console.error(`⚠️ Lỗi ghi Firestore [${key}] (Có thể hết Quota/mất mạng). Đã lưu dữ liệu mới vào Hàng Đợi Chờ:`, error?.message || String(error));
    enqueuePendingWrite(key, collPath, docId, data, 'set');
  }
}

async function firestoreDelete(collPath: string, docId: string) {
  const key = `${collPath}/${docId}`;
  try {
    const database = getDb();
    if (!database) {
      console.warn(`Firestore chưa sẵn sàng, đã lưu lệnh xóa [${key}] vào hàng đợi đệm.`);
      enqueuePendingWrite(key, collPath, docId, null, 'delete');
      return;
    }
    await deleteDoc(doc(database, collPath, docId));
    recordFirestoreWrites(1, `delete:${collPath}`);
    removeFromPendingQueue(key);
  } catch (error: any) {
    console.error(`⚠️ Lỗi xóa Firestore [${key}] (Có thể hết Quota/mất mạng). Đã lưu lệnh xóa vào Hàng Đợi Chờ:`, error?.message || String(error));
    enqueuePendingWrite(key, collPath, docId, null, 'delete');
  }
}

let lastFirestoreReadTime = 0;
let firestoreReadBlockedUntil = 0;
const READ_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

interface ReadLogEntry {
  timestamp: number;
  readsCount: number;
  source: string;
}

interface WriteLogEntry {
  timestamp: number;
  writesCount: number;
  source: string;
}

const serverStartTime = Date.now();
let totalFirestoreReads = 0;
let totalFirestoreWrites = 0;
let totalReadsSavedByCache = 0;
let readLogsHistory: ReadLogEntry[] = [];
let writeLogsHistory: WriteLogEntry[] = [];

function recordFirestoreReads(count: number, source: string) {
  if (count <= 0) return;
  totalFirestoreReads += count;
  const now = Date.now();
  readLogsHistory.push({ timestamp: now, readsCount: count, source });
  const oneDayAgo = now - 24 * 3600 * 1000;
  readLogsHistory = readLogsHistory.filter(l => l.timestamp >= oneDayAgo);
}

function recordFirestoreWrites(count: number, source: string) {
  if (count <= 0) return;
  totalFirestoreWrites += count;
  const now = Date.now();
  console.log(`✍️ [Firestore Write Log] Nguồn: ${source} | Tiêu thụ: ${count} Write(s) | Tổng số Write trong phiên: ${totalFirestoreWrites}`);
  writeLogsHistory.push({ timestamp: now, writesCount: count, source });
  const oneDayAgo = now - 24 * 3600 * 1000;
  writeLogsHistory = writeLogsHistory.filter(l => l.timestamp >= oneDayAgo);
}

function getQuotaStats() {
  const now = Date.now();
  const uptimeHours = Math.max((now - serverStartTime) / (3600 * 1000), 1 / 60);
  
  const oneHourAgo = now - 3600 * 1000;
  const readsLastHour = readLogsHistory
    .filter(l => l.timestamp >= oneHourAgo)
    .reduce((sum, l) => sum + l.readsCount, 0);

  const readsLast24Hours = readLogsHistory.reduce((sum, l) => sum + l.readsCount, 0);

  // Estimate daily reads based on current frequency
  const hourlyRate = uptimeHours < 1 ? (readsLastHour / uptimeHours) : (readsLast24Hours / Math.min(uptimeHours, 24));
  const estimatedDailyReads = Math.round(hourlyRate * 24);

  const DAILY_FREE_QUOTA = 50000;
  const estimatedQuotaPercent = Number(((estimatedDailyReads / DAILY_FREE_QUOTA) * 100).toFixed(2));
  const currentUsedPercent = Number(((readsLast24Hours / DAILY_FREE_QUOTA) * 100).toFixed(2));

  let status: 'safe' | 'warning' | 'critical' = 'safe';
  if (estimatedQuotaPercent > 80 || currentUsedPercent > 80 || now < firestoreReadBlockedUntil) {
    status = 'critical';
  } else if (estimatedQuotaPercent > 40 || currentUsedPercent > 40) {
    status = 'warning';
  }

  return {
    dailyFreeQuota: DAILY_FREE_QUOTA,
    totalFirestoreReads,
    totalFirestoreWrites,
    totalReadsSavedByCache,
    readsLastHour,
    readsLast24Hours,
    estimatedDailyReads,
    estimatedQuotaPercent,
    currentUsedPercent,
    status,
    uptimeHours: Number(uptimeHours.toFixed(2)),
    lastReadTimestamp: lastFirestoreReadTime,
    readCacheTTLSeconds: 300,
    timeUntilCacheExpirySeconds: Math.max(0, Math.ceil((lastFirestoreReadTime + READ_CACHE_TTL_MS - now) / 1000)),
    isCooldownActive: now < firestoreReadBlockedUntil,
    cooldownRemainingSeconds: Math.max(0, Math.ceil((firestoreReadBlockedUntil - now) / 1000)),
    pendingWritesCount: pendingQueue.length
  };
}

async function flushPendingWrites(): Promise<{ processed: number; remaining: number; success: boolean; error?: string }> {
  if (pendingQueue.length === 0) {
    return { processed: 0, remaining: 0, success: true };
  }

  const database = getDb();
  if (!database) {
    return { processed: 0, remaining: pendingQueue.length, success: false, error: "Firebase DB chưa được khởi tạo." };
  }

  console.log(`🚀 [Đẩy Hàng Đợi] Đang bắt đầu đẩy ${pendingQueue.length} mục dữ liệu mới lên Cloud...`);
  const queueToProcess = [...pendingQueue];
  let processedCount = 0;
  let lastError: string | undefined;

  for (const item of queueToProcess) {
    try {
      // 250ms pace delay between writes to avoid hitting Firestore "Rate exceeded / Write rate exceeded"
      await new Promise(r => setTimeout(r, 250));

      if (item.action === 'set') {
        let cleanedData = cleanUndefined(item.data);
        if (item.key === "appData/mainState" && cleanedData) {
          if (Array.isArray(cleanedData.bots)) {
            cleanedData.bots = cleanedData.bots.map((b: any) => {
              const cleanComments = (b.comments || []).map((c: any) => {
                const cleanReplies = (c.replies || []).map((r: any) => {
                  if (r.avatar && r.avatar.startsWith("data:image/")) {
                    return { ...r, avatar: "" };
                  }
                  return r;
                });
                const cleanedComment = { ...c, replies: cleanReplies };
                if (c.avatar && c.avatar.startsWith("data:image/")) {
                  cleanedComment.avatar = "";
                }
                return cleanedComment;
              });
              return {
                ...b,
                imageUrl: (b.imageUrl && b.imageUrl.startsWith("data:image/")) ? "" : b.imageUrl,
                comments: cleanComments
              };
            });
          }
          if (Array.isArray(cleanedData.feedbacks)) {
            cleanedData.feedbacks = cleanedData.feedbacks.map((f: any) => {
              const cleanReplies = (f.replies || []).map((r: any) => {
                if (r.avatar && r.avatar.startsWith("data:image/")) {
                  return { ...r, avatar: "" };
                }
                return r;
              });
              return {
                ...f,
                avatar: (f.avatar && f.avatar.startsWith("data:image/")) ? "" : f.avatar,
                replies: cleanReplies
              };
            });
          }
          if (Array.isArray(cleanedData.botRequests)) {
            cleanedData.botRequests = cleanedData.botRequests.map((r: any) => {
              const cleanReplies = (r.userReplies || []).map((rp: any) => {
                if (rp.avatar && rp.avatar.startsWith("data:image/")) {
                  return { ...rp, avatar: "" };
                }
                return rp;
              });
              return {
                ...r,
                avatar: (r.avatar && r.avatar.startsWith("data:image/")) ? "" : r.avatar,
                userReplies: cleanReplies
              };
            });
          }
          cleanedData.visitorLogs = [];
        }
        await setDoc(doc(database, item.collPath, item.docId), cleanedData);
      } else if (item.action === 'delete') {
        await deleteDoc(doc(database, item.collPath, item.docId));
      }
      removeFromPendingQueue(item.key);
      processedCount++;
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`⚠️ [Đẩy Hàng Đợi] Chưa đẩy được [${item.key}]: ${lastError}`);
      if (lastError.includes("RESOURCE_EXHAUSTED") || lastError.includes("quota") || lastError.includes("Rate exceeded") || lastError.includes("rate limit")) {
        console.warn(`⚠️ Hạn ngạch hoặc Tốc độ ghi Firebase vượt ngưỡng (Rate exceeded). Dừng đẩy đệm và giữ lại ${pendingQueue.length} mục chờ.`);
        break;
      }
    }
  }

  console.log(`✅ [Đẩy Hàng Đợi] Đã đẩy thành công ${processedCount} mục lên Cloud. Còn lại trong hàng đợi: ${pendingQueue.length}`);
  return {
    processed: processedCount,
    remaining: pendingQueue.length,
    success: pendingQueue.length === 0,
    error: lastError
  };
}

// Highly efficient on-the-fly base64 image compressor to support huge storage expansions
async function compressBase64(base64Str: string, maxWidth = 320, quality = 60): Promise<string> {
  if (!base64Str || !base64Str.startsWith("data:image/")) {
    return base64Str;
  }
  
  // If the image is already small (e.g., less than 15,000 chars, which is ~11KB), no need to compress!
  if (base64Str.length < 15000) {
    return base64Str;
  }

  try {
    const matches = base64Str.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
    if (!matches) {
      return base64Str;
    }
    const mimeType = matches[1];
    
    // WebP is already a highly optimized next-gen format, and SVG is vector markup.
    // They do not require Jimp decoding/re-compression.
    if (mimeType === "image/webp" || mimeType === "image/svg+xml") {
      return base64Str;
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const img = await Jimp.read(buffer);
    
    // Resize image if its width is greater than maxWidth
    if (img.width > maxWidth) {
      img.resize({ w: maxWidth });
    }
    
    // Output as JPEG format for maximum compression efficiency
    const compressedBuffer = await img.getBuffer("image/jpeg", { quality });
    return "data:image/jpeg;base64," + compressedBuffer.toString("base64");
  } catch (err) {
    console.warn("⚠️ [Compressor] Failed to compress image base64, using fallback original:", err instanceof Error ? err.message : String(err));
    return base64Str;
  }
}

// Deep sweeper that compresses all large inline base64 images and uploads them to Cloudinary if configured
async function optimizeStateData(state: AppState): Promise<AppState> {
  const optimized = { ...state };
  if (!optimized.bots) optimized.bots = [];

  console.log("🧹 [Storage Optimizer] Beginning deep sweep of state images to upgrade storage capacity...");
  let optimizedCount = 0;
  let cloudinaryUploadCount = 0;
  
  // 1. Optimize bot images
  for (const bot of optimized.bots) {
    if (bot.imageUrl && bot.imageUrl.startsWith("data:")) {
      if (isCloudinaryConfigured) {
        const url = await uploadToCloudinary(bot.imageUrl, "bot_covers");
        if (url.startsWith("http")) {
          bot.imageUrl = url;
          cloudinaryUploadCount++;
        }
      } else if (bot.imageUrl.length > 20000) {
        const oldLen = bot.imageUrl.length;
        bot.imageUrl = await compressBase64(bot.imageUrl, 400, 70); // Slightly better quality for main bot covers
        if (bot.imageUrl.length < oldLen) {
          optimizedCount++;
          console.log(`[Storage Optimizer] Compressed bot '${bot.name}' cover image from ${oldLen} to ${bot.imageUrl.length} chars.`);
        }
      }
    }

    // 2. Optimize comments and replies
    if (bot.comments) {
      for (const comment of bot.comments) {
        if (comment.avatar && comment.avatar.startsWith("data:")) {
          if (isCloudinaryConfigured) {
            const url = await uploadToCloudinary(comment.avatar, "avatars");
            if (url.startsWith("http")) {
              comment.avatar = url;
              cloudinaryUploadCount++;
            }
          } else if (comment.avatar.length > 10000) {
            const oldLen = comment.avatar.length;
            comment.avatar = await compressBase64(comment.avatar, 160, 60); // Small avatar is plenty
            if (comment.avatar.length < oldLen) {
              optimizedCount++;
              console.log(`[Storage Optimizer] Compressed comment avatar of '${comment.nickname}' from ${oldLen} to ${comment.avatar.length} chars.`);
            }
          }
        }

        if (comment.replies) {
          for (const reply of comment.replies) {
            if (reply.avatar && reply.avatar.startsWith("data:")) {
              if (isCloudinaryConfigured) {
                const url = await uploadToCloudinary(reply.avatar, "avatars");
                if (url.startsWith("http")) {
                  reply.avatar = url;
                  cloudinaryUploadCount++;
                }
              } else if (reply.avatar.length > 10000) {
                const oldLen = reply.avatar.length;
                reply.avatar = await compressBase64(reply.avatar, 160, 60);
                if (reply.avatar.length < oldLen) {
                  optimizedCount++;
                  console.log(`[Storage Optimizer] Compressed reply avatar of '${reply.nickname}' from ${oldLen} to ${reply.avatar.length} chars.`);
                }
              }
            }
          }
        }
      }
    }
  }

  // 3. Optimize feedbacks
  if (optimized.feedbacks) {
    for (const fb of optimized.feedbacks) {
      if (fb.avatar && fb.avatar.startsWith("data:")) {
        if (isCloudinaryConfigured) {
          const url = await uploadToCloudinary(fb.avatar, "avatars");
          if (url.startsWith("http")) {
            fb.avatar = url;
            cloudinaryUploadCount++;
          }
        } else if (fb.avatar.length > 10000) {
          const oldLen = fb.avatar.length;
          fb.avatar = await compressBase64(fb.avatar, 160, 60);
          if (fb.avatar.length < oldLen) optimizedCount++;
        }
      }
      if (fb.replies) {
        for (const reply of fb.replies) {
          if (reply.avatar && reply.avatar.startsWith("data:")) {
            if (isCloudinaryConfigured) {
              const url = await uploadToCloudinary(reply.avatar, "avatars");
              if (url.startsWith("http")) {
                reply.avatar = url;
                cloudinaryUploadCount++;
              }
            } else if (reply.avatar.length > 10000) {
              const oldLen = reply.avatar.length;
              reply.avatar = await compressBase64(reply.avatar, 160, 60);
              if (reply.avatar.length < oldLen) optimizedCount++;
            }
          }
        }
      }
    }
  }

  // 4. Optimize bot requests
  if (optimized.botRequests) {
    for (const req of optimized.botRequests) {
      if (req.avatar && req.avatar.startsWith("data:")) {
        if (isCloudinaryConfigured) {
          const url = await uploadToCloudinary(req.avatar, "avatars");
          if (url.startsWith("http")) {
            req.avatar = url;
            cloudinaryUploadCount++;
          }
        } else if (req.avatar.length > 10000) {
          const oldLen = req.avatar.length;
          req.avatar = await compressBase64(req.avatar, 160, 60);
          if (req.avatar.length < oldLen) optimizedCount++;
        }
      }
      if (req.userReplies) {
        for (const reply of req.userReplies) {
          if (reply.avatar && reply.avatar.startsWith("data:")) {
            if (isCloudinaryConfigured) {
              const url = await uploadToCloudinary(reply.avatar, "avatars");
              if (url.startsWith("http")) {
                reply.avatar = url;
                cloudinaryUploadCount++;
              }
            } else if (reply.avatar.length > 10000) {
              const oldLen = reply.avatar.length;
              reply.avatar = await compressBase64(reply.avatar, 160, 60);
              if (reply.avatar.length < oldLen) optimizedCount++;
            }
          }
        }
      }
    }
  }

  console.log(`✅ [Storage Optimizer] Deep sweep complete! Cloudinary Uploaded: ${cloudinaryUploadCount}, Locally Compressed: ${optimizedCount} images.`);
  return optimized;
}

// Global in-memory local server state synced instantly to file and loaded asynchronously from Firestore
let state: AppState;
let isFirestoreLoaded = false;

// Views buffering to reduce Firestore write operations and save quota limits on high-frequency click events
const viewsBuffer: Record<string, number> = {};

function flushViewsToFirestore() {
  const database = getDb();
  if (!database) return;

  const entries = Object.entries(viewsBuffer);
  if (entries.length === 0) return;

  console.log(`📊 [Views Buffer] Flushing accumulated views for ${entries.length} bots to Firestore...`);
  for (const [id, count] of entries) {
    if (count > 0) {
      delete viewsBuffer[id]; // Clear first to avoid race conditions
      updateDoc(doc(database, "bots", id), { views: increment(count) })
        .then(() => {
          console.log(`📊 [Views Buffer] Successfully flushed +${count} views to bot ${id}`);
        })
        .catch((err) => {
          console.warn(`📊 [Views Buffer] Failed to flush views for bot ${id}, restoring count:`, err.message);
          viewsBuffer[id] = (viewsBuffer[id] || 0) + count; // Restore count on failure
        });
    }
  }
}

// Automatically flush buffered views to Firestore every 3 minutes
setInterval(flushViewsToFirestore, 3 * 60 * 1000);

// Helper function to log activity
async function logActivity(nickname: string, action: string, userAgent?: string) {
  try {
    const database = getDb();
    if (!database || !state) return;
    
    const log: VisitorLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      nickname: nickname || "Khách ẩn danh",
      action,
      timestamp: new Date().toISOString(),
      userAgent
    };
    
    // Keep up to 2000 newest logs in memory and local backup file
    state.visitorLogs = [log, ...(state.visitorLogs || [])].slice(0, 2000);
    
    // Save to local backup file and trigger throttled cloud sync
    saveStateBackup(state);
  } catch (err) {
    console.warn("Logging activity failed:", err);
  }
}

// Helper function to load local state from db.json instantly
function loadStateLocalOnly(): AppState {
  const defaultState: AppState = {
    bots: [],
    announcements: [],
    feedbacks: [],
    botRequests: [],
    polls: [],
    visitorLogs: [],
    authorSettings: {
      authorName: "Zeze",
      welcomeTitle: "Zeze và những người mẹ trẻ",
      welcomeSubtitle: "Cổng chia sẻ Bot GL & FUTA chất lượng cao!",
      welcomeIntro: "Chào mừng bạn ghé thăm trang web của mình! Tất cả các liên kết chat đều được kết nối trực tiếp đến Google AI Studio. Hãy tự do khám phá và đóng góp ý kiến sáng tạo tại đây để chúng mình ngày càng cải tiến nhé.",
      facebookUrl: "https://www.facebook.com/share/1LhJeDJet4/",
      discordUrl: "zelig6411"
    }
  };

  let localState = { ...defaultState };
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      localState = JSON.parse(data) as AppState;
      console.log(`Loaded local backup with: ${localState.bots?.length || 0} Bots, ${localState.feedbacks?.length || 0} Feedbacks, ${localState.botRequests?.length || 0} Bot Requests.`);
    }
  } catch (err) {
    console.error("Lỗi khi đọc file db.json local:", err);
  }
  return localState;
}

// saveMainStateToFirestore removed to prevent data overwrite and quota exhaustion

// Helper function to load state on startup from Firestore with smart local merge
async function loadStateFromFirestore(force = false): Promise<AppState> {
  let localState = loadStateLocalOnly();

  const database = getDb();
  if (!database) {
    console.log("⚠️ Firebase not initialized. Using local backup state entirely.");
    return localState;
  }

  // Caching tuyệt đối: Chỉ đọc từ Firestore lần đầu (cold-start) hoặc khi Admin bấm Sync.
  if (!force && state) {
    console.log("⚡ [In-Memory Caching] Trả về dữ liệu trực tiếp từ RAM, không gọi Firestore.");
    return state;
  }

  try {
    console.log("Starting state restoration from Firestore and merging with local backup...");

    let mainStateDoc: any = null;
    let loadedFromMainState = false;
    let mainStateData: any = null;

    // Load consolidated mainState. Since Cloudinary is active, images are light URLs, fitting safely under 1MB limit.
    try {
      const mainStateRef = doc(database, "appData", "mainState");
      mainStateDoc = await getDoc(mainStateRef);
      recordFirestoreReads(1, "Consolidated mainState Loading");
      if (mainStateDoc.exists()) {
        mainStateData = mainStateDoc.data();
        if (mainStateData && Array.isArray(mainStateData.bots) && mainStateData.bots.length > 0) {
          console.log(`⚡ [Consolidated Loading Mode] Loaded all ${mainStateData.bots.length} bots from a single Firestore document (1 read operation instead of 41+)!`);
          loadedFromMainState = true;
        }
      }
    } catch (e: any) {
      console.warn("⚠️ Consolidated mainState could not be read, falling back to multi-collection slow read path:", e.message);
      loadedFromMainState = false;
    }

    if (loadedFromMainState) {
      // Smart Merge: Restore base64 images and comment/reply avatars from local db.json if Firestore stripped them
      const mergedBots = (mainStateData.bots || []).map((fbBot: Bot) => {
        const localBot = (localState.bots || []).find((b: Bot) => b.id === fbBot.id);
        const restoredImageUrl = (localBot && localBot.imageUrl && (!fbBot.imageUrl || fbBot.imageUrl === ""))
          ? localBot.imageUrl
          : fbBot.imageUrl;

        const mergedComments = (fbBot.comments || []).map((fbComment) => {
          const localComment = localBot
            ? (localBot.comments || []).find((c) => c.id === fbComment.id)
            : null;
          
          const restoredAvatar = (localComment && localComment.avatar && (!fbComment.avatar || fbComment.avatar === ""))
            ? localComment.avatar
            : fbComment.avatar;

          const mergedReplies = (fbComment.replies || []).map((fbReply) => {
            const localReply = localComment
              ? (localComment.replies || []).find((r) => r.id === fbReply.id)
              : null;
            
            const restoredReplyAvatar = (localReply && localReply.avatar && (!fbReply.avatar || fbReply.avatar === ""))
              ? localReply.avatar
              : fbReply.avatar;

            return {
              ...fbReply,
              avatar: restoredReplyAvatar
            };
          });

          return {
            ...fbComment,
            avatar: restoredAvatar,
            replies: mergedReplies
          };
        });

        return {
          ...fbBot,
          imageUrl: restoredImageUrl,
          comments: mergedComments
        };
      });

      const mergedFeedbacks = (mainStateData.feedbacks || []).map((fbFeedback: any) => {
        const localFeedback = (localState.feedbacks || []).find((f) => f.id === fbFeedback.id);
        const restoredAvatar = (localFeedback && localFeedback.avatar && (!fbFeedback.avatar || fbFeedback.avatar === ""))
          ? localFeedback.avatar
          : fbFeedback.avatar;
        
        const mergedReplies = (fbFeedback.replies || []).map((fbReply: any) => {
          const localReply = localFeedback
            ? (localFeedback.replies || []).find((r) => r.id === fbReply.id)
            : null;
          const restoredReplyAvatar = (localReply && localReply.avatar && (!fbReply.avatar || fbReply.avatar === ""))
            ? localReply.avatar
            : fbReply.avatar;
          return { ...fbReply, avatar: restoredReplyAvatar };
        });

        return { ...fbFeedback, avatar: restoredAvatar, replies: mergedReplies };
      });

      const mergedBotRequests = (mainStateData.botRequests || []).map((fbRequest: any) => {
        const localRequest = (localState.botRequests || []).find((r) => r.id === fbRequest.id);
        const restoredAvatar = (localRequest && localRequest.avatar && (!fbRequest.avatar || fbRequest.avatar === ""))
          ? localRequest.avatar
          : fbRequest.avatar;

        const mergedReplies = (fbRequest.userReplies || []).map((fbReply: any) => {
          const localReply = localRequest
            ? (localRequest.userReplies || []).find((r) => r.id === fbReply.id)
            : null;
          const restoredReplyAvatar = (localReply && localReply.avatar && (!fbReply.avatar || fbReply.avatar === ""))
            ? localReply.avatar
            : fbReply.avatar;
          return { ...fbReply, avatar: restoredReplyAvatar };
        });

        return { ...fbRequest, avatar: restoredAvatar, userReplies: mergedReplies };
      });

      const restoredState: AppState = {
        bots: mergedBots,
        announcements: mainStateData.announcements || [],
        feedbacks: mergedFeedbacks,
        botRequests: mergedBotRequests,
        authorSettings: mainStateData.authorSettings || localState.authorSettings,
        polls: mainStateData.polls || [],
        visitorLogs: mainStateData.visitorLogs || localState.visitorLogs || []
      };

      lastFirestoreReadTime = Date.now();
      return restoredState;
    }

    console.log("⚠️ Consolidated mainState not found. Falling back to multi-collection slow read path...");

    // Fallback: Individual collection reads (Legacy Logic)
    // 1. Author Settings
    let authorSettings = localState.authorSettings || {
      authorName: "Zeze",
      welcomeTitle: "Zeze và những người mẹ trẻ",
      welcomeSubtitle: "Cổng chia sẻ Bot GL & FUTA chất lượng cao!",
      welcomeIntro: "Chào mừng bạn ghé thăm trang web của mình! Tất cả các liên kết chat đều được kết nối trực tiếp đến Google AI Studio. Hãy tự do khám phá và đóng góp ý kiến sáng tạo tại đây để chúng mình ngày càng cải tiến nhé.",
      facebookUrl: "https://www.facebook.com/share/1LhJeDJet4/",
      discordUrl: "zelig6411"
    };
    try {
      const authorDoc = await getDoc(doc(database, "global", "authorSettings"));
      if (authorDoc.exists()) {
        authorSettings = authorDoc.data() as any;
      }
    } catch (e) {
      console.warn("Could not load authorSettings from Firestore:", (e as any).message);
    }

    // 2. Bots from Firestore
    let firestoreBots: Bot[] = [];
    try {
      const botsSnap = await getDocs(collection(database, "bots"));
      botsSnap.forEach((d) => {
        firestoreBots.push(d.data() as Bot);
      });
    } catch (e) {
      console.warn("Could not load bots from Firestore:", (e as any).message);
    }

    // 3. Announcements from Firestore
    let firestoreAnnouncements: Announcement[] = [];
    try {
      const annSnap = await getDocs(collection(database, "announcements"));
      annSnap.forEach((d) => {
        firestoreAnnouncements.push(d.data() as Announcement);
      });
    } catch (e) {
      console.warn("Could not load announcements from Firestore:", (e as any).message);
    }

    // 4. Feedbacks from Firestore
    let firestoreFeedbacks: Feedback[] = [];
    try {
      const fbSnap = await getDocs(collection(database, "feedbacks"));
      fbSnap.forEach((d) => {
        firestoreFeedbacks.push(d.data() as Feedback);
      });
    } catch (e) {
      console.warn("Could not load feedbacks from Firestore:", (e as any).message);
    }

    // 5. Bot Requests from Firestore
    let firestoreRequests: BotRequest[] = [];
    try {
      const reqSnap = await getDocs(collection(database, "botRequests"));
      reqSnap.forEach((d) => {
        firestoreRequests.push(d.data() as BotRequest);
      });
    } catch (e) {
      console.warn("Could not load botRequests from Firestore:", (e as any).message);
    }

    // 5.5 Polls from Firestore
    let firestorePolls: Poll[] = [];
    try {
      const pollSnap = await getDocs(collection(database, "polls"));
      pollSnap.forEach((d) => {
        firestorePolls.push(d.data() as Poll);
      });
    } catch (e) {
      console.warn("Could not load polls from Firestore:", (e as any).message);
    }

    // 6. Visitor Logs - Load from dedicated document 'appData/visitorLogs' on startup to prevent reset/data loss
    let firestoreLogs: VisitorLog[] = [];
    try {
      const logsDoc = await getDoc(doc(database, "appData", "visitorLogs"));
      recordFirestoreReads(1, "Visitor Logs Restoration");
      if (logsDoc.exists()) {
        const logsData = logsDoc.data();
        if (logsData && Array.isArray(logsData.visitorLogs)) {
          firestoreLogs = logsData.visitorLogs;
          console.log(`⚡ [Visitor Logs Restored] Loaded ${firestoreLogs.length} logs from Cloud.`);
        }
      }
    } catch (e: any) {
      console.warn("Could not load visitor logs from Firestore:", e.message);
    }
    if (firestoreLogs.length === 0) {
      firestoreLogs = localState.visitorLogs || [];
    }

    // Gộp dữ liệu Bots thông minh (comments, replies, v.v.)
    const localBots = localState.bots || [];
    const botMap = new Map<string, Bot>();
    localBots.forEach(bot => botMap.set(bot.id, { ...bot }));
    
    firestoreBots.forEach(fsBot => {
      const localBot = botMap.get(fsBot.id);
      if (!localBot) {
        botMap.set(fsBot.id, { ...fsBot });
      } else {
        // Gộp comments
        const localComments = localBot.comments || [];
        const fsComments = fsBot.comments || [];
        const commentMap = new Map<string, Comment>();
        localComments.forEach(c => commentMap.set(c.id, { ...c }));
        fsComments.forEach(fsC => {
          const localC = commentMap.get(fsC.id);
          if (!localC) {
            commentMap.set(fsC.id, { ...fsC });
          } else {
            // Gộp replies của comment
            const localReplies = localC.replies || [];
            const fsReplies = fsC.replies || [];
            const replyMap = new Map<string, CommentReply>();
            localReplies.forEach(r => replyMap.set(r.id, r));
            fsReplies.forEach(fsR => replyMap.set(fsR.id, fsR));
            localC.replies = Array.from(replyMap.values()).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            
            // Gộp likes
            const likedUsers = new Set([...(localC.likedUserIds || []), ...(fsC.likedUserIds || [])]);
            localC.likedUserIds = Array.from(likedUsers);
            localC.likes = Math.max(localC.likes || 0, fsC.likes || 0, localC.likedUserIds.length);
            
            commentMap.set(fsC.id, localC);
          }
        });
        
        const mergedComments = Array.from(commentMap.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        botMap.set(fsBot.id, {
          ...localBot,
          ...fsBot,
          views: Math.max(localBot.views || 0, fsBot.views || 0),
          likes: Math.max(localBot.likes || 0, fsBot.likes || 0),
          likedUserIds: Array.from(new Set([...(localBot.likedUserIds || []), ...(fsBot.likedUserIds || [])])),
          comments: mergedComments
        });
      }
    });
    
    const bots = Array.from(botMap.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Gộp Announcements
    const annMap = new Map<string, Announcement>();
    (localState.announcements || []).forEach(ann => annMap.set(ann.id, ann));
    firestoreAnnouncements.forEach(fsAnn => annMap.set(fsAnn.id, fsAnn));
    const announcements = Array.from(annMap.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Gộp Feedbacks
    const fbMap = new Map<string, Feedback>();
    (localState.feedbacks || []).forEach(fb => fbMap.set(fb.id, { ...fb }));
    firestoreFeedbacks.forEach(fsFb => {
      const localFb = fbMap.get(fsFb.id);
      if (!localFb) {
        fbMap.set(fsFb.id, { ...fsFb });
      } else {
        // Gộp replies của feedback
        const localReplies = localFb.replies || [];
        const fsReplies = fsFb.replies || [];
        const replyMap = new Map<string, any>();
        localReplies.forEach(r => replyMap.set(r.id, r));
        fsReplies.forEach(fsR => replyMap.set(fsR.id, fsR));
        
        fbMap.set(fsFb.id, {
          ...localFb,
          ...fsFb,
          replies: Array.from(replyMap.values()).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        });
      }
    });
    const feedbacks = Array.from(fbMap.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Gộp BotRequests
    const reqMap = new Map<string, BotRequest>();
    (localState.botRequests || []).forEach(req => reqMap.set(req.id, { ...req }));
    firestoreRequests.forEach(fsReq => {
      const localReq = reqMap.get(fsReq.id);
      if (!localReq) {
        reqMap.set(fsReq.id, { ...fsReq });
      } else {
        // Gộp userReplies
        const localReplies = localReq.userReplies || [];
        const fsReplies = fsReq.userReplies || [];
        const replyMap = new Map<string, any>();
        localReplies.forEach(r => replyMap.set(r.id, r));
        fsReplies.forEach(fsR => replyMap.set(fsR.id, fsR));
        
        reqMap.set(fsReq.id, {
          ...localReq,
          ...fsReq,
          votes: Math.max(localReq.votes || 0, fsReq.votes || 0),
          votedUserIds: Array.from(new Set([...(localReq.votedUserIds || []), ...(fsReq.votedUserIds || [])])),
          userReplies: Array.from(replyMap.values()).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        });
      }
    });
    const botRequests = Array.from(reqMap.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Gộp Polls
    const pollMap = new Map<string, Poll>();
    (localState.polls || []).forEach(p => pollMap.set(p.id, p));
    firestorePolls.forEach(fsP => pollMap.set(fsP.id, fsP));
    const polls = Array.from(pollMap.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Gộp Visitor Logs (Keep up to 2000 newest logs)
    const logMap = new Map<string, VisitorLog>();
    (localState.visitorLogs || []).forEach(log => logMap.set(log.id, log));
    firestoreLogs.forEach(log => logMap.set(log.id, log));
    const visitorLogs = Array.from(logMap.values())
      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-2000);

    console.log(`Success! Smart Merged: ${bots.length} Bots, ${announcements.length} Announcements, ${feedbacks.length} Feedbacks, ${botRequests.length} Bot Requests, ${polls.length} Polls, ${visitorLogs.length} Visitor Logs.`);

    isFirestoreLoaded = true;
    lastFirestoreReadTime = Date.now();
    const totalReads = 2 + firestoreBots.length + firestoreAnnouncements.length + firestoreFeedbacks.length + firestoreRequests.length + firestorePolls.length;
    recordFirestoreReads(totalReads, "Cloud Sync (Fallback)");

    return {
      bots,
      announcements,
      feedbacks,
      botRequests,
      authorSettings,
      polls,
      visitorLogs
    };
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("Gặp lỗi khi tải và gộp dữ liệu từ Firestore. Sử dụng hoàn toàn dữ liệu db.json local làm dự phòng:", msg);
    if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Rate exceeded") || msg.includes("quota")) {
      console.warn("⚠️ [Rate Exceeded Detected] Kích hoạt chế độ nghỉ 5 phút cho Firestore Read để khôi phục hạn ngạch.");
      firestoreReadBlockedUntil = Date.now() + 5 * 60 * 1000;
    }
    isFirestoreLoaded = false;
    return state || localState;
  }
}

// Helper function to save redundant local fallback asynchronously and in a throttled, non-blocking manner
let saveTimeout: NodeJS.Timeout | null = null;
let isSaving = false;
let pendingSaveState: AppState | null = null;

// Throttled visitor logs backup to Firestore appData/visitorLogs
let lastVisitorLogsSyncTime = 0;
let lastMainStateSyncTime = 0;

function saveVisitorLogsToFirestoreThrottled() {
  const now = Date.now();
  if (now - lastVisitorLogsSyncTime < 5 * 60 * 1000) {
    return; // Sync at most once every 5 minutes to protect write operations quota
  }

  const database = getDb();
  if (!database || !state || !state.visitorLogs || state.visitorLogs.length === 0) return;

  lastVisitorLogsSyncTime = now;
  console.log("☁️ [Visitor Logs Cloud Backup] Syncing visitor logs to Firestore...");
  setDoc(doc(database, "appData", "visitorLogs"), {
    visitorLogs: state.visitorLogs,
    updatedAt: new Date().toISOString()
  })
  .then(() => {
    console.log(`✅ [Visitor Logs Cloud Backup] Successfully backed up ${state.visitorLogs.length} visitor logs to Firestore!`);
  })
  .catch((err) => {
    console.warn("⚠️ [Visitor Logs Cloud Backup] Failed to backup visitor logs:", err.message);
  });
}

function saveMainStateToFirestoreThrottled(force = false) {
  const now = Date.now();
  if (!force && now - lastMainStateSyncTime < 2 * 60 * 1000) {
    return; // Sync at most once every 2 minutes to protect write operations quota
  }

  const database = getDb();
  if (!database || !state || !state.bots || state.bots.length === 0) return;

  lastMainStateSyncTime = now;
  console.log("☁️ [Consolidated Cloud Backup] Syncing consolidated mainState to Firestore...");

  // Sanitize bots to ensure zero raw base64 images remain in Firestore, ensuring safe <1MB sizes
  const sanitizedBots = state.bots.map((b) => {
    if (b.imageUrl && b.imageUrl.startsWith("data:image/")) {
      return { ...b, imageUrl: "" };
    }
    return b;
  });

  const mainStateData = {
    bots: sanitizedBots,
    announcements: state.announcements || [],
    feedbacks: state.feedbacks || [],
    botRequests: state.botRequests || [],
    authorSettings: state.authorSettings || {},
    polls: state.polls || [],
    visitorLogs: [], // Visitor logs are persistingly saved in their own separate cloud document
    updatedAt: new Date().toISOString()
  };

  setDoc(doc(database, "appData", "mainState"), mainStateData)
    .then(() => {
      console.log(`✅ [Consolidated Cloud Backup] Successfully backed up complete state to appData/mainState in Firestore!`);
    })
    .catch((err) => {
      console.warn("⚠️ [Consolidated Cloud Backup] Failed to backup mainState to Firestore:", err.message);
    });
}

function saveStateBackup(state: AppState) {
  broadcastStateUpdate(); // Real-time push to all online clients
  pendingSaveState = state;
  if (saveTimeout) {
    return; // Already scheduled to save soon
  }

  // Schedule a save in 2000ms to throttle high-frequency writes
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    if (pendingSaveState) {
      performSave(pendingSaveState);
    }
  }, 2000);
}

function performSave(state: AppState) {
  if (isSaving) {
    // If we are currently writing to disk, defer until current write completes
    saveStateBackup(state);
    return;
  }

  // Safety Shield: Protect existing db.json from being overwritten by an empty state
  try {
    if (Array.isArray(state.bots) && state.bots.length === 0 && fs.existsSync(DB_FILE)) {
      const existingStr = fs.readFileSync(DB_FILE, "utf-8");
      const existingJson = JSON.parse(existingStr);
      if (existingJson && Array.isArray(existingJson.bots) && existingJson.bots.length > 0) {
        console.warn("⚠️ [Safety Shield] Ngăn chặn ghi đè db.json bằng dữ liệu mảng Bot rỗng!");
        isSaving = false;
        return;
      }
    }
  } catch (err) {
    console.warn("Safety check read error:", err);
  }

  isSaving = true;
  pendingSaveState = null;
  const data = JSON.stringify(state, null, 2);
  
  fs.writeFile(DB_FILE, data, "utf-8", (err) => {
    isSaving = false;
    if (err) {
      console.error("Error saving state redundant backup locally:", err);
    } else {
      console.log(`💾 Backup state saved asynchronously successfully (${data.length} bytes).`);
      // Throttled visitor logs backup to Firestore appData/visitorLogs
      saveVisitorLogsToFirestoreThrottled();
      // Throttled consolidated state backup to Firestore appData/mainState
      saveMainStateToFirestoreThrottled();
    }

    // If a new save request came in while writing, trigger it
    if (pendingSaveState) {
      performSave(pendingSaveState);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Prevent browser caching for all API responses to ensure real-time updates
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // In-memory local server state synced instantly to file and loaded asynchronously from Firestore
  state = loadStateLocalOnly();

  // Restore/Merge from Firestore ONCE on server startup
  loadStateFromFirestore().then(async (restoredState) => {
    // CRITICAL SAFETY: Only merge if we actually got valid bots back from Firestore.
    // If Firestore is exhausted (Quota Exceeded), it returns 0 docs. 
    // We MUST NOT overwrite local data with an empty state in that case.
    if (restoredState && restoredState.bots && restoredState.bots.length > 0) {
      console.log("✅ [Initial Firestore Restoration] Merging data successfully.");
      state = await optimizeStateData(restoredState);
      saveStateBackup(state);
    } else {
      console.log("⚠️ [Initial Firestore Restoration] Firestore returned empty or failed. Keeping local state to prevent data loss.");
    }

    // Try flushing any pending writes queued while offline / quota exceeded
    if (pendingQueue.length > 0) {
      console.log(`📦 Phát hiện ${pendingQueue.length} mục dữ liệu mới trong hàng đợi đệm. Bắt đầu đẩy lên Cloud...`);
      await flushPendingWrites().catch(console.warn);
    }
  }).catch((err) => {
    console.error("⚠️ Initial Firestore state restoration failed:", err);
  });

  // Cứu dữ liệu lượt views bị mất khi Cloud Run tự động Reset (Graceful Shutdown)
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Nhận tín hiệu ${signal} từ Cloud Run! Bắt đầu sao lưu khẩn cấp dữ liệu đệm lên Cloud Firestore...`);
    try {
      await flushPendingWrites();
      console.log(`✅ Hoàn tất sao lưu khẩn cấp trước khi tắt server. Safe to exit.`);
    } catch (e) {
      console.error(`⚠️ Lỗi khi sao lưu khẩn cấp:`, e);
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Simple admin check based on passphrase headers/passcodes
  // Secret passcode to identify admin: '1492007'
  const ADMIN_PASSCODE = "1492007";

  function isAdmin(req: express.Request): boolean {
    const code = req.headers["x-admin-passcode"] || req.query.passcode || req.body.passcode;
    return code === ADMIN_PASSCODE;
  }

  // --- API ROUTING ---

  // Submit a login/register request
  app.post("/api/auth/login", async (req, res) => {
    let { nickname, password, avatar } = req.body;
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: "Biệt danh không được để trống!" });
    }
    const cleanNick = nickname.trim();
    const lowerNick = cleanNick.toLowerCase();

    // Compress avatar if it is a large base64 image
    if (avatar && avatar.startsWith("data:")) {
      avatar = await compressBase64(avatar, 160, 60);
    }

    // Prevent reserving or stealing "Admin", "Zeze" etc if they are not the true admin!
    const reservedNames = ["admin", "zeze", "moderator", "quản trị", "quản trị viên", "tác giả"];
    if (reservedNames.includes(lowerNick)) {
      if (password !== ADMIN_PASSCODE) {
        return res.status(403).json({ error: "Biệt danh này đã được bảo lưu hệ thống. Vui lòng điền đúng Passcode Admin để tiếp tục!" });
      }
    }

    // Exclusive reservation for Stalk Zeze
    if (lowerNick === "stalk zeze") {
      if (password !== "1234567890") {
        return res.status(403).json({ error: "Biệt danh này đã được bảo lưu độc quyền. Vui lòng nhập đúng mật khẩu để tiếp tục!" });
      }
    }

    try {
      const database = getDb();
      if (!database) {
        return res.status(500).json({ error: "Không thể kết nối đến hệ thống xác thực (Hệ thống chưa cấu hình Firebase)!" });
      }
      const userRef = doc(database, "users", lowerNick);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (password && userData.password === password) {
          // Update avatar if provided and different
          if (avatar && avatar !== userData.avatar) {
            userData.avatar = avatar;
            await setDoc(userRef, userData, { merge: true });
          }
          // Log Activity of login
          return res.json({ 
            success: true, 
            isNew: false, 
            nickname: userData.nickname, 
            avatar: userData.avatar 
          });
        } else if (password) {
          return res.status(401).json({ 
            error: "Mật khẩu không chính xác cho biệt danh bảo mật này! Vui lòng thử lại hoặc chọn biệt danh khác." 
          });
        } else {
          return res.status(401).json({
            error: "Biệt danh này đã được kích hoạt bảo mật. Vui lòng nhập mật khẩu hợp lệ để tiếp tục!"
          });
        }
      } else {
        // Automatically register as a brand-new secured account
        const newUser = {
          nickname: cleanNick,
          avatar: avatar || "🌊",
          password: password || "",
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newUser);
        return res.json({ 
          success: true, 
          isNew: true, 
          nickname: cleanNick, 
          avatar: newUser.avatar 
        });
      }
    } catch (err) {
      console.error("Auth register error:", err);
      // Fallback locally if Firebase fails
      return res.json({ 
        success: true, 
        isNew: true, 
        nickname: cleanNick, 
        avatar: avatar || "🌊",
        fallback: true 
      });
    }
  });

  // 1. Get full state
  app.post("/api/auth/update-avatar", async (req, res) => {
    let { nickname, avatar } = req.body;
    if (!nickname || !nickname.trim()) {
      return res.status(400).json({ error: "Nickname is required" });
    }
    const cleanNick = nickname.trim();
    const lowerNick = cleanNick.toLowerCase();

    // Compress or upload avatar to Cloudinary if configured
    if (avatar && avatar.startsWith("data:")) {
      if (isCloudinaryConfigured) {
        avatar = await uploadToCloudinary(avatar, "avatars");
      } else {
        avatar = await compressBase64(avatar, 160, 60);
      }
    }

    try {
      // Safely attempt to write avatar to Firestore without breaking on Quota Exceeded
      try {
        const database = getDb();
        if (database) {
          const userRef = doc(database, "users", lowerNick);
          await setDoc(userRef, { avatar }, { merge: true });
        }
      } catch (fsErr) {
        console.warn("Could not write avatar to Firestore (Quota Exceeded or Network Error), using memory & local fallback:", fsErr instanceof Error ? fsErr.message : String(fsErr));
      }
      
      // Sync avatars across the app state for historical comments and feedbacks in background
      setImmediate(async () => {
          try {
            let stateChanged = false;
            
            state.bots.forEach(bot => {
              let botChanged = false;
              bot.comments.forEach(c => {
                if (c.nickname === cleanNick) {
                  c.avatar = avatar;
                  botChanged = true;
                  stateChanged = true;
                }
                if (c.replies) {
                  c.replies.forEach(r => {
                    if (r.nickname === cleanNick) {
                      r.avatar = avatar;
                      botChanged = true;
                      stateChanged = true;
                    }
                  });
                }
              });
              if (botChanged) firestoreWrite("bots", bot.id, bot).catch(console.error);
            });
            
            state.feedbacks.forEach(fb => {
              let fbChanged = false;
              if (fb.nickname === cleanNick) {
                fb.avatar = avatar;
                fbChanged = true;
                stateChanged = true;
              }
              if (fb.replies) {
                fb.replies.forEach(r => {
                  if (r.nickname === cleanNick) {
                    r.avatar = avatar;
                    fbChanged = true;
                    stateChanged = true;
                  }
                });
              }
              if (fbChanged) firestoreWrite("feedbacks", fb.id, fb).catch(console.error);
            });
            
            state.botRequests.forEach(req => {
              let reqChanged = false;
              if (req.nickname === cleanNick) {
                req.avatar = avatar;
                reqChanged = true;
                stateChanged = true;
              }
              if (req.userReplies) {
                req.userReplies.forEach(ur => {
                  if (ur.nickname === cleanNick) {
                    ur.avatar = avatar;
                    reqChanged = true;
                    stateChanged = true;
                  }
                });
              }
              if (reqChanged) firestoreWrite("botRequests", req.id, req).catch(console.error);
            });
            
            if (stateChanged) saveStateBackup(state);
          } catch (bgErr) {
            console.error("Background sync avatar error:", bgErr);
          }
        });
        
        return res.json({ success: true, nickname: cleanNick, avatar });
    } catch (e: any) {
      console.error("Error updating avatar:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });


// --- Server-Sent Events (SSE) for Real-Time Sync without Firestore Reads ---


app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); 
  res.write('data: {"type":"CONNECTED"}\n\n');

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

  app.get("/api/state", (req, res) => {
    res.json({
      ...state,
      isStaleFallback: !isFirestoreLoaded,
      pendingWritesCount: pendingQueue.length,
      quotaStats: getQuotaStats()
    });
  });

  app.get("/api/quota-stats", (req, res) => {
    res.json(getQuotaStats());
  });

  app.get("/api/pending-writes", (req, res) => {
    res.json({
      pendingCount: pendingQueue.length,
      items: pendingQueue.map(item => ({
        key: item.key,
        action: item.action,
        timestamp: item.timestamp
      }))
    });
  });

  app.post("/api/flush-pending", async (req, res) => {
    try {
      console.log("⚡ [Yêu Cầu Tác Giả] Thủ công kích hoạt đẩy Hàng Đợi Chờ lên Cloud...");
      const result = await flushPendingWrites();
      res.json(result);
    } catch (e: any) {
      console.error("Lỗi khi đẩy hàng đợi đệm:", e);
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  app.get("/api/sync-clicks", (req, res) => {
    const total = state.bots.reduce((sum, b) => sum + (b.views || 0), 0);
    res.json({ totalClicks: total });
  });

  app.post("/api/visitor-logs", async (req, res) => {
    const { nickname, action } = req.body;
    const ua = req.headers["user-agent"];
    await logActivity(nickname, action, ua);
    res.json({ success: true });
  });


  app.get("/api/cloudinary-signature", (req, res) => {
    if (!isCloudinaryConfigured) {
      return res.status(503).json({ error: "Cloudinary not configured" });
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: "bot_hub" },
      process.env.CLOUDINARY_API_SECRET!
    );
    res.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    });
  });

  app.post("/api/upload", async (req, res) => {
    try {
      const { image, folder } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image content" });
      }
      if (isCloudinaryConfigured) {
        const url = await uploadToCloudinary(image, folder || "general");
        return res.json({ success: true, url });
      } else {
        const compressed = await compressBase64(image, 400, 70);
        return res.json({ success: false, url: compressed, message: "Cloudinary not configured, fell back to local base64 compression" });
      }
    } catch (e: any) {
      console.error("Upload proxy error:", e);
      res.status(500).json({ error: e.message || "Failed to upload image" });
    }
  });

  app.post("/api/sync", async (req, res) => {
    try {
      console.log("🔄 Đồng bộ dữ liệu từ Cloud & Đẩy hàng đợi đệm...");
      // First try flushing any queued pending writes to Cloud!
      const flushRes = await flushPendingWrites().catch(() => ({ processed: 0 }));

      const newState = await loadStateFromFirestore(true);
      state = await optimizeStateData(newState);
      saveStateBackup(state);
      res.json({
        success: true,
        message: `Đồng bộ thành công từ Cloud! (Đã đẩy ${flushRes.processed} mục chờ lên Cloud)`,
        pendingCount: pendingQueue.length,
        state
      });
    } catch (e: any) {
      console.error("Lỗi khi đồng bộ Firestore:", e);
      res.status(500).json({ error: "Lỗi đồng bộ từ Firestore: " + e.message });
    }
  });

  // Client Auto-Recovery / Backup Restore Endpoint
  app.post("/api/restore-backup", async (req, res) => {
    try {
      const backupState: AppState = req.body;
      if (backupState && Array.isArray(backupState.bots) && backupState.bots.length > 0) {
        console.log(`📥 [Auto-Recovery] Khôi phục dữ liệu từ thiết bị trình duyệt (${backupState.bots.length} Bots)!`);
        
        // Merge with existing state if any
        const botMap = new Map<string, Bot>();
        (state.bots || []).forEach(b => botMap.set(b.id, b));
        backupState.bots.forEach(b => botMap.set(b.id, b));

        const mergedBots = Array.from(botMap.values());
        
        state = await optimizeStateData({
          ...state,
          ...backupState,
          bots: mergedBots,
          announcements: backupState.announcements && backupState.announcements.length > 0 ? backupState.announcements : (state.announcements || []),
          feedbacks: backupState.feedbacks && backupState.feedbacks.length > 0 ? backupState.feedbacks : (state.feedbacks || []),
          botRequests: backupState.botRequests && backupState.botRequests.length > 0 ? backupState.botRequests : (state.botRequests || []),
          authorSettings: backupState.authorSettings || state.authorSettings
        });

        // Write directly to db.json synchronously
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
          console.log(`💾 [Auto-Recovery] Đã lưu thành công ${state.bots.length} Bots vào db.json!`);
        } catch (fsErr) {
          console.error("Lỗi ghi db.json khi khôi phục:", fsErr);
        }

        return res.json({ success: true, count: state.bots.length, state });
      }
      return res.status(400).json({ error: "Dữ liệu bản sao lưu không hợp lệ hoặc không có bot nào." });
    } catch (e: any) {
      console.error("Lỗi khi khôi phục dữ liệu từ client backup:", e);
      return res.status(500).json({ error: "Lỗi máy chủ khi khôi phục dữ liệu." });
    }
  });

  // 3. Add or update bot (Admin Only)
  app.post("/api/bots", async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên (Passcode không đúng hoặc trống)!" });
    }

    const { bot }: { bot: Bot } = req.body;
    if (!bot || !bot.name || !bot.type) {
      return res.status(400).json({ error: "Thông tin Bot không hợp lệ!" });
    }

    // Upload or compress bot cover image to save space
    if (bot.imageUrl && bot.imageUrl.startsWith("data:")) {
      if (isCloudinaryConfigured) {
        bot.imageUrl = await uploadToCloudinary(bot.imageUrl, "bot_covers");
      } else {
        const oldLen = bot.imageUrl.length;
        bot.imageUrl = await compressBase64(bot.imageUrl, 400, 70);
        console.log(`[On-The-Fly Compressor] Compressed bot '${bot.name}' cover image from ${oldLen} to ${bot.imageUrl.length} chars.`);
      }
    }

    // Clean and deduplicate tags
    if (bot.tags && Array.isArray(bot.tags)) {
      bot.tags = Array.from(new Set(bot.tags.map(t => t.trim()).filter(Boolean)));
    }

    const index = state.bots.findIndex((b) => b.id === bot.id);
    let targetBot: Bot;
    if (index >= 0) {
      // Update
      const oldBot = state.bots[index];
      targetBot = {
        ...bot,
        createdAt: oldBot.createdAt || bot.createdAt,
        updatedAt: new Date().toISOString(),
        views: oldBot.views,
        comments: oldBot.comments || [],
        likes: oldBot.likes !== undefined ? oldBot.likes : 0,
        likedUserIds: oldBot.likedUserIds || []
      };
      state.bots[index] = targetBot;
    } else {
      // Create new
      targetBot = {
        ...bot,
        id: "b_" + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: 0,
        likes: 0,
        likedUserIds: [],
        comments: []
      };
      state.bots.unshift(targetBot);
    }

    saveStateBackup(state);
    firestoreWrite("bots", targetBot.id, targetBot).catch(console.error);
    res.json({ success: true, state });
  });

  // 4. Delete bot (Admin Only)
  app.delete("/api/bots/:id", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }

    const { id } = req.params;
    const bot = state.bots.find(b => b.id === id);
    if (bot) {
      state.bots = state.bots.filter(b => b.id !== id);
      saveStateBackup(state);
      saveMainStateToFirestoreThrottled(true);
      firestoreDelete("bots", id).catch(console.error);
      res.json({ success: true, state });
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  // Global Tag Rename (Admin Only)
  app.post("/api/admin/tags/rename", async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { oldTag, newTag } = req.body;
    if (!oldTag || !oldTag.trim() || !newTag || !newTag.trim()) {
      return res.status(400).json({ error: "Tên nhãn cũ và nhãn mới không hợp lệ!" });
    }
    const cleanOld = oldTag.trim();
    const cleanNew = newTag.trim();

    let affectedCount = 0;
    for (let i = 0; i < state.bots.length; i++) {
      const bot = state.bots[i];
      if (bot.tags && bot.tags.includes(cleanOld)) {
        bot.tags = Array.from(new Set(
          bot.tags.map(t => t === cleanOld ? cleanNew : t)
        ));
        affectedCount++;
        // Write backup to firestore
        await firestoreWrite("bots", bot.id, bot).catch(console.error);
      }
    }

    if (affectedCount > 0) {
      saveStateBackup(state);
    }
    res.json({ success: true, affectedCount, state });
  });

  // Global Tag Delete (Admin Only)
  app.post("/api/admin/tags/delete", async (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { tag } = req.body;
    if (!tag || !tag.trim()) {
      return res.status(400).json({ error: "Thẻ Tag không hợp lệ!" });
    }
    const cleanTag = tag.trim();

    let affectedCount = 0;
    for (let i = 0; i < state.bots.length; i++) {
      const bot = state.bots[i];
      if (bot.tags && bot.tags.includes(cleanTag)) {
        bot.tags = bot.tags.filter(t => t !== cleanTag);
        affectedCount++;
        // Write backup to firestore
        await firestoreWrite("bots", bot.id, bot).catch(console.error);
      }
    }

    if (affectedCount > 0) {
      saveStateBackup(state);
    }
    res.json({ success: true, affectedCount, state });
  });

  // Helper to sync single bot from firestore before mutations
  async function syncSingleBotFromFirestore(botId: string): Promise<Bot | null> {
    try {
      const database = getDb();
      if (!database) return null;
      const docRef = doc(database, "bots", botId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const fsBot = docSnap.data() as Bot;
        const index = state.bots.findIndex(b => b.id === botId);
        if (index >= 0) {
          const localBot = state.bots[index];
          // Gộp comments
          const localComments = localBot.comments || [];
          const fsComments = fsBot.comments || [];
          const commentMap = new Map<string, Comment>();
          localComments.forEach(c => commentMap.set(c.id, { ...c }));
          fsComments.forEach(fsC => {
            const localC = commentMap.get(fsC.id);
            if (!localC) {
              commentMap.set(fsC.id, { ...fsC });
            } else {
              // Gộp replies
              const localReplies = localC.replies || [];
              const fsReplies = fsC.replies || [];
              const replyMap = new Map<string, CommentReply>();
              localReplies.forEach(r => replyMap.set(r.id, r));
              fsReplies.forEach(fsR => replyMap.set(fsR.id, fsR));
              localC.replies = Array.from(replyMap.values()).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              
              // Gộp likes
              const likedUsers = new Set([...(localC.likedUserIds || []), ...(fsC.likedUserIds || [])]);
              localC.likedUserIds = Array.from(likedUsers);
              localC.likes = Math.max(localC.likes || 0, fsC.likes || 0, localC.likedUserIds.length);
              
              commentMap.set(fsC.id, localC);
            }
          });
          const mergedComments = Array.from(commentMap.values()).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          state.bots[index] = {
            ...localBot,
            ...fsBot,
            views: Math.max(localBot.views || 0, fsBot.views || 0),
            likes: Math.max(localBot.likes || 0, fsBot.likes || 0),
            likedUserIds: Array.from(new Set([...(localBot.likedUserIds || []), ...(fsBot.likedUserIds || [])])),
            comments: mergedComments
          };
          saveStateBackup(state);
          return state.bots[index];
        }
      }
    } catch (error) {
      console.warn(`[Sync Single Bot] Failed for bot ${botId}:`, error);
    }
    return null;
  }

  // 5. Increment views (Zero Firestore Cost: stored in memory, local db.json, and batched in viewsBuffer)
  app.post("/api/bots/:id/views", async (req, res) => {
    const { id } = req.params;

    const bot = state.bots.find(b => b.id === id);
    if (bot) {
      if (typeof bot.views !== 'number') bot.views = 0;
      bot.views += 1;
      saveStateBackup(state);
      
      // Buffer the view increment to flush as a single batched operation later
      viewsBuffer[id] = (viewsBuffer[id] || 0) + 1;
      
      res.json({ success: true, views: bot.views });
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  // 5.5 Toggle Like Bot
  const handleToggleLikeBot = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { userId, nickname } = req.body;
    
    const identifier = userId || nickname;
    if (!identifier) {
       return res.status(400).json({ error: "Bạn cần đăng nhập hoặc có ID hợp lệ để sử dụng chức năng này!" });
    }

    const bot = state.bots.find(b => b.id === id);
    if (bot) {
      if (!bot.likedUserIds) bot.likedUserIds = [];
      if (!bot.likes) bot.likes = 0;

      let isLiking = false;
      if (bot.likedUserIds.includes(identifier)) {
        bot.likedUserIds = bot.likedUserIds.filter(v => v !== identifier);
        bot.likes = Math.max(0, bot.likes - 1);
      } else {
        isLiking = true;
        bot.likedUserIds.push(identifier);
        bot.likes += 1;
      }
      
      saveStateBackup(state);
      
      // Atomic increment & array manipulation on Cloud
      try {
        const database = getDb();
        if (database) {
          updateDoc(doc(database, "bots", bot.id), {
            likes: increment(isLiking ? 1 : -1),
            likedUserIds: isLiking ? arrayUnion(identifier) : arrayRemove(identifier)
          }).catch(console.error);
        }
      } catch (e) {
        console.warn("Could not update likes on Firestore:", e);
      }
      
      res.json({ success: true, likes: bot.likes, likedUserIds: bot.likedUserIds });
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  };

  app.post("/api/bots/:id/like", handleToggleLikeBot);
  app.patch("/api/bots/:id/like", handleToggleLikeBot);

  // 6. Comments
  app.post("/api/bots/:id/comments", async (req, res) => {
    const { id } = req.params;
    let { nickname, content, isAdminComment, avatar, userId, userBadge } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Bình luận không được bỏ trống!" });
    }

    // Compress avatar if it is a large base64 image
    if (avatar && avatar.startsWith("data:")) {
      avatar = await compressBase64(avatar, 160, 60);
    }

    const bot = state.bots.find(b => b.id === id);
    if (bot) {
      const newComment: Comment = {
        id: "c_" + Date.now(),
        nickname: nickname || "Khách ẩn danh",
        content,
        createdAt: new Date().toISOString(),
        isAdmin: !!(isAdminComment && isAdmin(req)),
        avatar: avatar,
        userId: userId,
        userBadge: userBadge
      };
      
      if (!bot.comments) bot.comments = [];
      bot.comments.push(newComment);
      
      saveStateBackup(state);
      if (getDb()) updateDoc(doc(getDb(), "bots", bot.id), { comments: bot.comments }).catch(console.error);
      res.json({ success: true, comment: newComment });
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  // 12. Delete bot comment (Anyone can delete their own; Admin can delete any)
  app.delete("/api/bots/:botId/comments/:commentId", (req, res) => {
    const { botId, commentId } = req.params;
    const userId = req.query.userId as string;
    const nickname = req.query.nickname as string;

    const bot = state.bots.find(b => b.id === botId);
    if (bot) {
      const comment = bot.comments?.find(c => c.id === commentId);
      if (!comment) {
        return res.status(404).json({ error: "Không tìm thấy bình luận" });
      }

      const isAuthor = (comment.userId && comment.userId === userId) || (!comment.userId && comment.nickname === nickname);
      
      if (isAdmin(req) || isAuthor) {
        bot.comments = bot.comments.filter(c => c.id !== commentId);
        saveStateBackup(state);
        saveMainStateToFirestoreThrottled(true);
        if (getDb()) updateDoc(doc(getDb(), "bots", botId), { comments: bot.comments }).catch(console.error);
        res.json({ success: true });
      } else {
        res.status(403).json({ error: "Bạn không có quyền xóa bình luận này!" });
      }
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  // 12b. Add reply to bot comment
  app.post("/api/bots/:botId/comments/:commentId/replies", async (req, res) => {
    const { botId, commentId } = req.params;
    let { nickname, content, isAdminComment, avatar, userId, userBadge } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Nội dung trả lời không được bỏ trống!" });
    }

    // Compress avatar if it is a large base64 image
    if (avatar && avatar.startsWith("data:")) {
      avatar = await compressBase64(avatar, 160, 60);
    }

    const bot = state.bots.find(b => b.id === botId);
    if (bot) {
      if (!bot.comments) bot.comments = [];
      const comment = bot.comments.find(c => c.id === commentId);
      if (comment) {
        if (!comment.replies) comment.replies = [];
        const newReply: CommentReply = {
          id: "cr_" + Date.now(),
          nickname: nickname || "Khách ẩn danh",
          content,
          createdAt: new Date().toISOString(),
          isAdmin: !!(isAdminComment && isAdmin(req)),
          avatar: avatar,
          userId: userId,
          userBadge: userBadge
        };
        comment.replies.push(newReply);

        saveStateBackup(state);
        if (getDb()) updateDoc(doc(getDb(), "bots", bot.id), { comments: bot.comments }).catch(console.error);
        res.json({ success: true, reply: newReply, comment: comment });
      } else {
        res.status(404).json({ error: "Không tìm thấy bình luận" });
      }
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  // 12c. Delete reply to bot comment
  app.delete("/api/bots/:botId/comments/:commentId/replies/:replyId", (req, res) => {
    const { botId, commentId, replyId } = req.params;
    const userId = req.query.userId as string;
    const nickname = req.query.nickname as string;

    const bot = state.bots.find(b => b.id === botId);
    if (bot) {
      if (!bot.comments) bot.comments = [];
      const comment = bot.comments.find(c => c.id === commentId);
      if (comment) {
        const reply = comment.replies?.find(r => r.id === replyId);
        if (!reply) {
          return res.status(404).json({ error: "Không tìm thấy câu trả lời" });
        }

        const isReplyAuthor = (reply.userId && reply.userId === userId) || (!reply.userId && reply.nickname === nickname);
        const isCommentAuthor = (comment.userId && comment.userId === userId) || (!comment.userId && comment.nickname === nickname);

        if (isAdmin(req) || isReplyAuthor || isCommentAuthor) {
          comment.replies = comment.replies!.filter(r => r.id !== replyId);
          saveStateBackup(state);
          saveMainStateToFirestoreThrottled(true);
          if (getDb()) updateDoc(doc(getDb(), "bots", botId), { comments: bot.comments }).catch(console.error);
          res.json({ success: true, comment: comment });
        } else {
          res.status(403).json({ error: "Bạn không có quyền xóa câu trả lời này!" });
        }
      } else {
        res.status(404).json({ error: "Không tìm thấy bình luận" });
      }
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  // 13. Like bot comment
  app.post("/api/bots/:botId/comments/:commentId/like", (req, res) => {
    const { botId, commentId } = req.params;
    const { userId } = req.body;
    const bot = state.bots.find(b => b.id === botId);
    if (bot) {
      if (!bot.comments) bot.comments = [];
      const comment = bot.comments.find(c => c.id === commentId);
      if (comment) {
        if (!comment.likedUserIds) comment.likedUserIds = [];
        const likedIndex = comment.likedUserIds.indexOf(userId);

        if (likedIndex >= 0) {
          // un-like
          comment.likedUserIds.splice(likedIndex, 1);
          comment.likes = Math.max(0, (comment.likes || 1) - 1);
          res.json({ success: true, likes: comment.likes, liked: false });
        } else {
          // like
          comment.likedUserIds.push(userId);
          comment.likes = (comment.likes || 0) + 1;
          res.json({ success: true, likes: comment.likes, liked: true });
        }
        saveStateBackup(state);
        if (getDb()) updateDoc(doc(getDb(), "bots", botId), { comments: bot.comments }).catch(console.error);
      } else {
        res.status(404).json({ error: "Không tìm thấy bình luận" });
      }
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  app.post("/api/bots/:botId/comments/:commentId/replies/:replyId/like", (req, res) => {
    const { botId, commentId, replyId } = req.params;
    const { userId } = req.body;
    const bot = state.bots.find(b => b.id === botId);
    if (bot) {
      if (!bot.comments) bot.comments = [];
      const comment = bot.comments.find(c => c.id === commentId);
      if (comment) {
        if (!comment.replies) comment.replies = [];
        const reply = comment.replies.find(r => r.id === replyId);
        if (reply) {
          if (!reply.likedUserIds) reply.likedUserIds = [];
          const likedIndex = reply.likedUserIds.indexOf(userId);

          if (likedIndex >= 0) {
            // un-like
            reply.likedUserIds.splice(likedIndex, 1);
            reply.likes = Math.max(0, (reply.likes || 1) - 1);
            res.json({ success: true, likes: reply.likes, liked: false });
          } else {
            // like
            reply.likedUserIds.push(userId);
            reply.likes = (reply.likes || 0) + 1;
            res.json({ success: true, likes: reply.likes, liked: true });
          }
          saveStateBackup(state);
          if (getDb()) updateDoc(doc(getDb(), "bots", botId), { comments: bot.comments }).catch(console.error);
        } else {
          res.status(404).json({ error: "Không tìm thấy phản hồi bình luận" });
        }
      } else {
        res.status(404).json({ error: "Không tìm thấy bình luận" });
      }
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });

  // 7. Add announcement (Admin Only)
  app.post("/api/announcements", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }

    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Tiêu đề và nội dung là bắt buộc!" });
    }

    const newAnnouncement: Announcement = {
      id: "a_" + Date.now(),
      title,
      content,
      createdAt: new Date().toISOString()
    };

    state.announcements.unshift(newAnnouncement);
    saveStateBackup(state);
    firestoreWrite("announcements", newAnnouncement.id, newAnnouncement).catch(console.error);
    res.json({ success: true, state });
  });

  // 8. Delete announcement (Admin Only)
  app.delete("/api/announcements/:id", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }

    const { id } = req.params;
    const oldAnn = state.announcements.find(a => a.id === id);
    if (oldAnn) {
      state.announcements = state.announcements.filter(a => a.id !== id);
      saveStateBackup(state);
      saveMainStateToFirestoreThrottled(true);
      firestoreDelete("announcements", id).catch(console.error);
      res.json({ success: true, state });
    } else {
      res.status(404).json({ error: "Không tìm thấy thông báo" });
    }
  });

  // 9. Feedback (User submits)
  app.post("/api/feedbacks", (req, res) => {
    const { nickname, isAnonymous, content, userId, userBadge } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Nội dung góp ý không được trống!" });
    }

    const newFeedback: Feedback = {
      id: "f_" + Date.now(),
      nickname: isAnonymous ? "Khách ẩn danh" : (nickname || "Khách ẩn danh"),
      isAnonymous: !!isAnonymous,
      content,
      createdAt: new Date().toISOString(),
      userId,
      userBadge: userBadge
    };

    state.feedbacks.unshift(newFeedback);
    // Removed to keep visitor logs focused on key actions only
    saveStateBackup(state);
    firestoreWrite("feedbacks", newFeedback.id, newFeedback).catch(console.error);
    res.json({ success: true, feedback: newFeedback });
  });

  // 10. Reply to feedback (Admin Only)
  app.post("/api/feedbacks/:id/reply", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }

    const { id } = req.params;
    const { reply } = req.body;
    const feedback = state.feedbacks.find(f => f.id === id);
    if (feedback) {
      feedback.reply = reply;
      saveStateBackup(state);
      firestoreWrite("feedbacks", feedback.id, feedback).catch(console.error);
      res.json({ success: true, feedback });
    } else {
      res.status(404).json({ error: "Không tìm thấy ý kiến góp ý" });
    }
  });

  // Delete Feedback (Admin Only)
  app.delete("/api/feedbacks/:id", (req, res) => {
    const { id } = req.params;
    const nickname = req.headers["x-nickname"];
    
    const feedback = state.feedbacks.find(f => f.id === id);
    if (!feedback) {
      return res.status(404).json({ error: "Không tìm thấy phản hồi" });
    }

    if (feedback.nickname !== nickname && !isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên hoặc tác giả phản hồi!" });
    }

    state.feedbacks = state.feedbacks.filter(f => f.id !== id);
    saveStateBackup(state);
    saveMainStateToFirestoreThrottled(true);
    firestoreDelete("feedbacks", id).catch(console.error);
    res.json({ success: true });
  });

  // Edit Feedback
  app.put("/api/feedbacks/:id", (req, res) => {
    const { id } = req.params;
    const { nickname, content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Nội dung không được để trống!" });
    }

    const index = state.feedbacks.findIndex(f => f.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Không tìm thấy phản hồi" });
    }

    const feedback = state.feedbacks[index];
    if (feedback.nickname !== nickname && !isAdmin(req)) {
      return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa phản hồi này!" });
    }

    feedback.content = content;
    feedback.updatedAt = new Date().toISOString();
    
    saveStateBackup(state);
    firestoreWrite("feedbacks", id, feedback).catch(console.error);
    res.json({ success: true, feedback });
  });

  // Reply to Feedback
  app.post("/api/feedbacks/:id/replies", (req, res) => {
    const { id } = req.params;
    const { nickname, content, avatar, isAdmin: clientIsAdmin, userId, passcode } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Nội dung trả lời không được trống!" });
    }

    const index = state.feedbacks.findIndex(f => f.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Không tìm thấy phản hồi" });
    }

    const feedback = state.feedbacks[index];

    // Helper to check if request is by admin
    const reqIsAdmin = passcode === "1492007" || !!(clientIsAdmin && isAdmin(req));
    const isFeedbackAuthor = (feedback.userId && feedback.userId === userId) || (!feedback.userId && feedback.nickname === nickname && nickname !== "Khách ẩn danh");

    if (!reqIsAdmin && !isFeedbackAuthor) {
      return res.status(403).json({ error: "Bạn không thể trả lời góp ý này vì nó thuộc về người khác!" });
    }

    const newReply = {
      id: "fr_" + Date.now(),
      nickname: nickname || "Khách",
      content,
      createdAt: new Date().toISOString(),
      avatar: avatar,
      isAdmin: reqIsAdmin
    };

    if (!state.feedbacks[index].replies) {
      state.feedbacks[index].replies = [];
    }
    state.feedbacks[index].replies!.push(newReply);

    saveStateBackup(state);
    firestoreWrite("feedbacks", id, state.feedbacks[index]).catch(console.error);
    res.json({ success: true, feedback: state.feedbacks[index] });
  });

  // 11. Custom bot request (User registers desire for upcoming bots)
  app.post("/api/requests", (req, res) => {
    const { nickname, title, type, description, avatar, userBadge } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Tên bot muốn đề xuất và mô tả không được trống!" });
    }

    const newRequest: BotRequest = {
      id: "r_" + Date.now(),
      nickname: nickname || "Khách ẩn danh",
      title,
      type: type === "Futa" ? "Futa" : "GL",
      description,
      createdAt: new Date().toISOString(),
      votes: 1,
      votedUserIds: [],
      avatar: avatar,
      userBadge: userBadge
    };

    state.botRequests.unshift(newRequest);
    // Removed to keep visitor logs focused on key actions only
    saveStateBackup(state);
    firestoreWrite("botRequests", newRequest.id, newRequest).catch(console.error);
    res.json({ success: true, request: newRequest });
  });

  // Upvote custom bot request
  app.post("/api/requests/:id/vote", (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // client session ID to prevent spamming
    const request = state.botRequests.find(r => r.id === id);
    if (request) {
      if (!request.votedUserIds) request.votedUserIds = [];
      const index = request.votedUserIds.indexOf(userId);
      let isVoting = false;
      if (index >= 0) {
        // Devote
        request.votes = Math.max(0, request.votes - 1);
        request.votedUserIds.splice(index, 1);
      } else {
        // Vote
        isVoting = true;
        request.votes += 1;
        request.votedUserIds.push(userId);
      }
      saveStateBackup(state);
      
      try {
        const database = getDb();
        if (database) {
          updateDoc(doc(database, "botRequests", request.id), {
            votes: increment(isVoting ? 1 : -1),
            votedUserIds: isVoting ? arrayUnion(userId) : arrayRemove(userId)
          }).catch(console.error);
        }
      } catch (e) {
        console.warn("Could not update request votes on Firestore:", e);
      }
      
      res.json({ success: true, votes: request.votes, voted: isVoting });
    } else {
      res.status(404).json({ error: "Không tìm thấy đề cử" });
    }
  });

  // Delete Request (Admin Only)
  app.delete("/api/requests/:id", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { id } = req.params;
    const request = state.botRequests.find(r => r.id === id);
    const title = request ? request.title : "yêu cầu";
    state.botRequests = state.botRequests.filter(r => r.id !== id);
    saveStateBackup(state);
    saveMainStateToFirestoreThrottled(true);
    firestoreDelete("botRequests", id).catch(console.error);
    res.json({ success: true, state });
  });

  // Interact/Reply with Requests (Admin Only)
  app.post("/api/requests/:id/interact", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { id } = req.params;
    const { reply, status } = req.body;
    const request = state.botRequests.find(r => r.id === id);
    if (request) {
      if (reply !== undefined) request.reply = reply;
      if (status !== undefined) request.status = status;
      saveStateBackup(state);
      firestoreWrite("botRequests", request.id, request).catch(console.error);
      res.json({ success: true, request, state });
    } else {
      res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }
  });

  // Submit a user reply to a request
  app.post("/api/requests/:id/replies", (req, res) => {
    const { id } = req.params;
    const { nickname, content, isAdmin: clientIsAdmin, avatar } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Nội dung phản hồi không được trống!" });
    }
    const request = state.botRequests.find(r => r.id === id);
    if (!request) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
    }
    if (!request.userReplies) {
      request.userReplies = [];
    }
    const newReply = {
      id: "rep_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      nickname: nickname || "Khách ẩn danh",
      content,
      createdAt: new Date().toISOString(),
      isAdmin: !!clientIsAdmin,
      avatar: avatar
    };
    request.userReplies.push(newReply);
    saveStateBackup(state);
    if (getDb()) updateDoc(doc(getDb(), "botRequests", request.id), { userReplies: request.userReplies }).catch(console.error);
    res.json({ success: true, request, state });
  });

  // Delete user reply from request (Admin Only)
  app.delete("/api/requests/:id/replies/:replyId", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { id, replyId } = req.params;
    const request = state.botRequests.find(r => r.id === id);
    if (request && request.userReplies) {
      request.userReplies = request.userReplies.filter(r => r.id !== replyId);
      saveStateBackup(state);
      if (getDb()) updateDoc(doc(getDb(), "botRequests", request.id), { userReplies: request.userReplies }).catch(console.error);
      res.json({ success: true, state });
    } else {
      res.status(404).json({ error: "Không tìm thấy yêu cầu hoặc phản hồi" });
    }
  });

  // 12. Save Author Settings (Admin Only)
  app.post("/api/author-settings", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ error: "Dữ liệu cấu hình trống!" });
    }
    state.authorSettings = settings;
    saveStateBackup(state);
    firestoreWrite("global", "authorSettings", state.authorSettings).catch(console.error);
    res.json({ success: true, settings: state.authorSettings, state });
  });

  // 14. Create alternative Poll (Admin Only)
  app.post("/api/polls", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { question, options }: { question: string, options: string[] } = req.body;
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "Câu hỏi khảo sát và các phương án lựa chọn không hợp lệ (tối thiểu 2 phương án)!" });
    }

    const pollOptions: PollOption[] = options.map((opt, i) => ({
      id: "opt_" + i + "_" + Math.random().toString(36).substring(2, 6),
      text: opt.trim(),
      votes: 0
    })).filter(o => o.text !== "");

    if (pollOptions.length < 2) {
      return res.status(400).json({ error: "Cần tối thiểu 2 phương án lựa chọn hợp lệ!" });
    }

    const newPoll: Poll = {
      id: "poll_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      question: question.trim(),
      options: pollOptions,
      createdAt: new Date().toISOString(),
      votedUsers: {}
    };

    if (!state.polls) state.polls = [];
    state.polls.unshift(newPoll);
    saveStateBackup(state);
    firestoreWrite("polls", newPoll.id, newPoll).catch(console.error);
    res.json({ success: true, poll: newPoll, state });
  });

  // 15. Vote on a Poll
  app.post("/api/polls/:id/vote", (req, res) => {
    const { id } = req.params;
    const { userId, optionId, nickname, avatar } = req.body;
    if (!userId || !optionId) {
      return res.status(400).json({ error: "Thiếu thông tin người dùng hoặc phương án bình chọn!" });
    }

    if (!state.polls) state.polls = [];
    const poll = state.polls.find(p => p.id === id);
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy ý kiến khảo sát!" });
    }

    if (!poll.votedUsers) poll.votedUsers = {};
    if (!poll.votedUsersMeta) poll.votedUsersMeta = {};

    const previousOptionId = poll.votedUsers[userId];
    if (previousOptionId === optionId) {
      // Toggle off if clicking the same selected option
      delete poll.votedUsers[userId];
      if (poll.votedUsersMeta) {
        delete poll.votedUsersMeta[userId];
      }
      const opt = poll.options.find(o => o.id === optionId);
      if (opt) {
        opt.votes = Math.max(0, opt.votes - 1);
      }
    } else {
      // Subtract vote from previous option if existing
      if (previousOptionId) {
        const prevOpt = poll.options.find(o => o.id === previousOptionId);
        if (prevOpt) {
          prevOpt.votes = Math.max(0, prevOpt.votes - 1);
        }
      }
      // Cast vote to new option
      poll.votedUsers[userId] = optionId;
      if (nickname && avatar) {
        poll.votedUsersMeta[userId] = { nickname, avatar };
      }
      const opt = poll.options.find(o => o.id === optionId);
      if (opt) {
        opt.votes = (opt.votes || 0) + 1;
      }
    }

    saveStateBackup(state);
    firestoreWrite("polls", poll.id, poll).catch(console.error);
    res.json({ success: true, poll, state });
  });

  // 15b. Add custom option to Poll (Discord/Facebook style)
  app.post("/api/polls/:id/add-option", (req, res) => {
    const { id } = req.params;
    const { userId, optionText, nickname, avatar } = req.body;
    if (!userId || !optionText || !optionText.trim()) {
      return res.status(400).json({ error: "Thiếu thông tin người dùng hoặc nội dung phương án!" });
    }

    if (!state.polls) state.polls = [];
    const poll = state.polls.find(p => p.id === id);
    if (!poll) {
      return res.status(404).json({ error: "Không tìm thấy khảo sát!" });
    }

    if (!poll.options) poll.options = [];
    if (!poll.votedUsers) poll.votedUsers = {};
    if (!poll.votedUsersMeta) poll.votedUsersMeta = {};

    const textTrimmed = optionText.trim();
    
    // Check if the option already exists (case insensitive)
    let existingOpt = poll.options.find(o => o.text.toLowerCase() === textTrimmed.toLowerCase());

    const previousOptionId = poll.votedUsers[userId];
    if (previousOptionId) {
      const prevOpt = poll.options.find(o => o.id === previousOptionId);
      if (prevOpt) {
        prevOpt.votes = Math.max(0, prevOpt.votes - 1);
      }
    }

    if (nickname && avatar) {
      poll.votedUsersMeta[userId] = { nickname, avatar };
    }

    let chosenText = textTrimmed;
    if (existingOpt) {
      // Option already exists, just vote for it
      poll.votedUsers[userId] = existingOpt.id;
      existingOpt.votes = (existingOpt.votes || 0) + 1;
      chosenText = existingOpt.text;
    } else {
      // Create new custom option
      const newOptId = "opt_custom_" + Math.random().toString(36).substring(2, 6);
      const newOpt: PollOption = {
        id: newOptId,
        text: textTrimmed,
        votes: 1
      };
      poll.options.push(newOpt);
      poll.votedUsers[userId] = newOptId;
    }


    saveStateBackup(state);
    firestoreWrite("polls", poll.id, poll).catch(console.error);
    res.json({ success: true, poll, state });
  });

  // 16. Delete a Poll (Admin Only)
  app.delete("/api/polls/:id", (req, res) => {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Yêu cầu quyền Quản trị viên!" });
    }
    const { id } = req.params;
    if (!state.polls) state.polls = [];
    const poll = state.polls.find(p => p.id === id);
    if (poll) {
      state.polls = state.polls.filter(p => p.id !== id);
      saveStateBackup(state);
      saveMainStateToFirestoreThrottled(true);
      firestoreDelete("polls", id).catch(console.error);
      res.json({ success: true, state });
    } else {
      res.status(404).json({ error: "Không tìm thấy khảo sát ý kiến" });
    }
  });


  // Expose /src/assets folder statically
  app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GL & Futa Bot Portal backend serving on port ${PORT}`);
  });
}

startServer();
