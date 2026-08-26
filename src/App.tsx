import React, { useState, useEffect } from "react";
import { AppState, Bot, Announcement, Feedback, BotRequest } from "./types";
import AdminPanel from "./components/AdminPanel";
import UserPanel from "./components/UserPanel";
import OAuthLoginModal from "./components/OAuthLoginModal";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { 
  Flower2, Lock, Eye, Bell, Facebook, MessageCircle, Moon, Sun, 
  Sparkles, Megaphone, Terminal, User, BookOpen, Volume2, ShieldCheck, X, RefreshCw
} from "lucide-react";
import { db } from "./firebase";
import { collection, getDocs, doc, setDoc, onSnapshot } from "firebase/firestore";
import AboutAuthor from "./components/AboutAuthor";
import { getCachedAppState, setCachedAppState } from "./lib/indexedDbCache";

export default function App() {
  // Global State fetched from the Express backend
  const [state, setState] = useState<AppState>({
    bots: [],
    announcements: [],
    feedbacks: [],
    botRequests: [],
    polls: []
  });

  // Loading & Sync states
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [totalClicksSync, setTotalClicksSync] = useState<number>(0);

  // Current user metadata representing the client
  const [nickname, setNickname] = useState("Vị Khách Đại Dương");
  const [avatar, setAvatar] = useState("🌊");
  const [userId, setUserId] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Mode: 'user' | 'admin'
  const [viewMode, setViewMode] = useState<"user" | "admin">("user");
  // Switch button ripples
  const [btnRipples, setBtnRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isUserBtnHovered, setIsUserBtnHovered] = useState(false);

  // Admin lock states
  const [passcode, setPasscode] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // Banner Push alert/notifications state
  const [pushAlert, setPushAlert] = useState<{ show: boolean; title: string; desc: string; type: "post" | "announcement" | "comment" | "reply" } | null>(null);
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
  const [showAnnOverlay, setShowAnnOverlay] = useState(true);

  // Sound play toggle for bells
  const [playAlertSound, setPlayAlertSound] = useState(true);

  // NSFW Acceptance state
  const [nsfwAccepted, setNsfwAccepted] = useState(true);
  const [isStaleFallback, setIsStaleFallback] = useState(false);

  // Sync Progress Countdown
  const [syncCountdown, setSyncCountdown] = useState(8);

  // Read config state from API with automatic retries and robust data structure verification
  const fetchStateWithRetry = async (silent = false, retries = 3, delay = 1000): Promise<AppState> => {
    try {
      const response = await fetch(`/api/state?_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Server returned HTTP status ${response.status}`);
      }
      
      const text = await response.text();
      const trimmed = text.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        console.error("[DEBUG UPSTREAM] Nhận phản hồi không hợp lệ (Không phải JSON) từ backend:", {
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          bodySample: trimmed.substring(0, 500)
        });
        throw new Error(`Phản hồi từ máy chủ không phải định dạng JSON (Upstream error: ${trimmed.substring(0, 30)}...)`);
      }
      let data: any;
      try {
        data = JSON.parse(trimmed);
      } catch (err) {
        throw new Error("Dữ liệu phản hồi từ máy chủ không hợp lệ (Không thể phân giải JSON)");
      }

      setIsStaleFallback(!!data?.isStaleFallback);

      // Strict data format verification to prevent UI errors
      if (!data || typeof data !== "object") {
        throw new Error("Phản hồi không phải là một đối tượng hợp lệ");
      }
      if (!Array.isArray(data.bots)) {
        throw new Error("Dữ liệu danh sách Bot không đúng định dạng mảng");
      }
      if (!Array.isArray(data.announcements)) {
        throw new Error("Dữ liệu thông báo không đúng định dạng mảng");
      }
      if (!Array.isArray(data.feedbacks)) {
        throw new Error("Dữ liệu góp ý không đúng định dạng mảng");
      }
      if (!Array.isArray(data.botRequests)) {
        throw new Error("Dữ liệu đề xuất không đúng định dạng mảng");
      }
      
      setIsOffline(false);
      return data as AppState;
    } catch (error: any) {
      if (retries > 0) {
        console.warn(`[Auto-Retry] Lỗi đồng bộ dữ liệu: "${error.message}". Thử lại sau ${delay}ms... (Còn lại ${retries} lần)`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchStateWithRetry(silent, retries - 1, delay * 1.5);
      }
      
      setIsOffline(true);
      throw error;
    }
  };

  // Utility function to execute a deep sanity check and repair logic on the bots list
  const deepSanityCheckBots = (currentState: AppState): AppState => {
    try {
      if (!currentState || !Array.isArray(currentState.bots)) return currentState;

      const repairedBots: Bot[] = currentState.bots.map(bot => {
        const likes = typeof bot.likes === "number" && !isNaN(bot.likes) ? bot.likes : 0;
        const tags = Array.isArray(bot.tags) ? bot.tags.filter(t => typeof t === "string" && t.trim() !== "") : [];
        const comments = Array.isArray(bot.comments) ? bot.comments : [];

        return {
          ...bot,
          likes,
          tags,
          comments: comments.map(c => ({
            ...c,
            replies: Array.isArray(c.replies) ? c.replies : []
          }))
        };
      });

      return {
        ...currentState,
        bots: repairedBots
      };
    } catch (e) {
      console.error("[SanityCheck] Lỗi trong quá trình kiểm tra cấu trúc dữ liệu:", e);
      return currentState;
    }
  };

  const cleanupDuplicateBots = async () => {
    if (!isAdminUnlocked) {
      alert("Bạn cần mở khóa quyền quản trị viên trước.");
      return;
    }

    try {
      const map: Record<string, Bot[]> = {};
      state.bots.forEach(b => {
        const linkStr = b.links && b.links.length > 0 
          ? b.links.map(l => l.url).sort().join('|') 
          : b.name;
        if (!map[linkStr]) map[linkStr] = [];
        map[linkStr].push(b);
      });

      const toDelete: Bot[] = [];
      const keptBots: Bot[] = [];

      Object.values(map).forEach(group => {
        if (group.length > 1) {
          group.sort((a, b) => b.views - a.views);
          keptBots.push(group[0]);
          for (let i = 1; i < group.length; i++) {
            toDelete.push(group[i]);
          }
        } else {
          keptBots.push(group[0]);
        }
      });

      if (toDelete.length > 0) {
        if (!window.confirm(`Tìm thấy ${toDelete.length} bot trùng link. Bạn có chắc chắn muốn dọn dẹp (chỉ giữ lại bot nhiều lượt click nhất)?`)) {
          return;
        }

        // Delete from server
        for (const b of toDelete) {
          await fetch(`/api/bots/${b.id}?passcode=${encodeURIComponent(passcode)}`, {
            method: "DELETE",
            headers: { "x-admin-passcode": passcode }
          });
        }
        
        // Optimistic UI update
        const newState = { ...state, bots: keptBots };
        handleUpdateLocalState(newState);
        alert(`Đã dọn dẹp ${toDelete.length} bot trùng lặp thành công!`);
        fetchState();
      } else {
        alert("Không tìm thấy bot nào bị trùng link.");
      }
    } catch (e) {
      console.error("Lỗi khi dọn dẹp bot:", e);
      alert("Đã xảy ra lỗi khi dọn dẹp bot.");
    }
  };

  const fetchState = async (silent = false) => {
    // Only set full loading screen if we have no state loaded at all yet
    if (!silent && state.bots.length === 0) setLoading(true);
    if (silent || state.bots.length > 0) setIsSyncing(true);
    try {
      const rawData = await fetchStateWithRetry(silent);
      const data = deepSanityCheckBots(rawData);
      
      // Calculate totals for comments and replies
      let totalComments = 0;
      let totalReplies = 0;
      let newestComment: { nickname: string; content: string; botName: string; createdAt: string } | null = null;
      let newestReply: { nickname: string; content: string; botName: string; createdAt: string } | null = null;

      data.bots.forEach(bot => {
        if (bot.comments) {
          totalComments += bot.comments.length;
          bot.comments.forEach(c => {
            if (!newestComment || new Date(c.createdAt) > new Date(newestComment.createdAt)) {
              newestComment = {
                nickname: c.nickname,
                content: c.content,
                botName: bot.name,
                createdAt: c.createdAt
              };
            }
            if (c.replies) {
              totalReplies += c.replies.length;
              c.replies.forEach(r => {
                if (!newestReply || new Date(r.createdAt) > new Date(newestReply.createdAt)) {
                  newestReply = {
                    nickname: r.nickname,
                    content: r.content,
                    botName: bot.name,
                    createdAt: r.createdAt
                  };
                }
              });
            }
          });
        }
      });

      // Push notice logic – compare counts with cached storage to detect new creations
      if (state.bots.length > 0) {
        const cachedBotCount = parseInt(localStorage.getItem("portal_prev_bot_count") || "0");
        const cachedAnnCount = parseInt(localStorage.getItem("portal_prev_ann_count") || "0");
        const cachedCommentCount = parseInt(localStorage.getItem("portal_prev_comment_count") || "0");
        const cachedReplyCount = parseInt(localStorage.getItem("portal_prev_reply_count") || "0");

        if (data.bots.length > cachedBotCount && data.bots.length > 0) {
          const newlyAdded = data.bots[0];
          triggerPushNotification(
            "💎 Bài đăng Bot mới!",
            `Tác giả vừa tải lên bot mới: '${newlyAdded.name}'`,
            "post"
          );
        } else if (data.announcements.length > cachedAnnCount && data.announcements.length > 0) {
          const newlyAddedAnn = data.announcements[0];
          triggerPushNotification(
            "📢 Thông báo từ tác giả!",
            newlyAddedAnn.title,
            "announcement"
          );
          setHasNewAnnouncements(true);
        } else if (totalComments > cachedCommentCount && newestComment) {
          triggerPushNotification(
            "💬 Bình luận mới!",
            `'${newestComment.nickname}' vừa bình luận trên Bot '${newestComment.botName}': "${newestComment.content.substring(0, 40)}..."`,
            "comment"
          );
        } else if (totalReplies > cachedReplyCount && newestReply) {
          triggerPushNotification(
            "💬 Câu trả lời bình luận mới!",
            `'${newestReply.nickname}' vừa phản hồi trên Bot '${newestReply.botName}': "${newestReply.content.substring(0, 40)}..."`,
            "reply"
          );
        }
      }

      // Cache the newest state counts
      localStorage.setItem("portal_prev_bot_count", data.bots.length.toString());
      localStorage.setItem("portal_prev_ann_count", data.announcements.length.toString());
      localStorage.setItem("portal_prev_comment_count", totalComments.toString());
      localStorage.setItem("portal_prev_reply_count", totalReplies.toString());
      handleUpdateLocalState(data);
    } catch (error: any) {
      setIsOffline(true);
      if (!silent) {
        console.warn("Gặp lỗi khi đồng bộ trạng thái backend sau nhiều lần thử lại (Đang tự động chuyển sang chế độ dự phòng cục bộ):", error);
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // New: Specialized sync function for click counts only
  const syncClickCount = async () => {
    try {
      const res = await fetch("/api/sync-clicks");
      if (res.ok) {
        const data = await res.json();
        setTotalClicksSync(data.totalClicks);
      }
    } catch (e) {
      console.warn("Click sync failed:", e);
    }
  };



  // Hàm syncFromFirestore đồng bộ danh sách bots từ Firestore về máy chủ và ứng dụng
  const syncFromFirestore = async () => {
    console.log("🔥 [App.tsx syncFromFirestore] Gọi API đồng bộ hóa dữ liệu từ Firestore lên máy chủ...");
    setLoading(true);
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error(`Đồng bộ thất bại với HTTP status ${response.status}`);
      }
      const resData = await response.json();
      if (resData.success && resData.state) {
        console.log("✅ [App.tsx syncFromFirestore] Đồng bộ máy chủ từ Firestore thành công!");
        const data = deepSanityCheckBots(resData.state);
        handleUpdateLocalState(data);
      } else {
        throw new Error(resData.error || "Không nhận được dữ liệu trạng thái hợp lệ từ server");
      }
    } catch (err: any) {
      console.error("❌ [App.tsx syncFromFirestore] Lỗi khi đồng bộ dữ liệu:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  // Helper trigger notification
  const triggerPushNotification = (title: string, desc: string, type: "post" | "announcement" | "comment" | "reply") => {
    setPushAlert({ show: true, title, desc, type });
    
    // Web Sound effect implementation
    if (playAlertSound) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
        
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      } catch (err) {
        // Safe catch browser policy blocking Audio Context
      }
    }

    // Auto close push alert
    setTimeout(() => {
      setPushAlert(null);
    }, 8000);
  };

  // Set initial visitor ID and load profile configurations
  useEffect(() => {
    // Generate unique user ID for up voting tracking
    let cachedUid = localStorage.getItem("cl_portal_uid");
    if (!cachedUid) {
      cachedUid = "usr_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("cl_portal_uid", cachedUid);
    }
    setUserId(cachedUid);

    // Load nickname configurations
    const cachedNick = localStorage.getItem("cl_portal_nickname");
    const cachedAv = localStorage.getItem("cl_portal_avatar");
    if (cachedNick) setNickname(cachedNick);
    if (cachedAv) setAvatar(cachedAv);

    // Checked locked admin
    const storedAdminCode = localStorage.getItem("admin_passcode");
    if (storedAdminCode === "1492007") {
      setPasscode("1492007");
      setIsAdminUnlocked(true);
    }

    // Dark mode state check
    const storedDark = localStorage.getItem("portal_dark");
    if (storedDark === "true") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    // NSFW acceptance check
    const nsfwCheck = localStorage.getItem("cl_portal_nsfw_accepted");
    if (!nsfwCheck) {
      setNsfwAccepted(false);
    }

    syncClickCount();
    
    // Fetch state directly from server
    fetchState(false);

    // Real-Time Sync via Server-Sent Events (ZERO Firestore Reads)
    const eventSource = new EventSource("/api/stream");
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "STATE_UPDATED") {
          console.log("⚡ [Real-Time SSE] State updated on server, fetching new state from RAM cache...");
          fetchState(true);
        }
      } catch (err) {}
    };
    eventSource.onerror = () => {
      console.warn("⚠️ [Real-Time SSE] Connection lost, reconnecting...");
    };

    // Periodic silent background auto-sync to guarantee multi-user updates across separate instances & browser tabs
    const pollInterval = setInterval(() => {
      fetchState(true);
    }, 12000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Sync state manually & update IndexedDB cache
  // Highly optimized state equality checker to completely eliminate thread blocking and UI stuttering
  const fastStateEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;

    // Direct timestamp check
    if (a.updatedAt && b.updatedAt && a.updatedAt !== b.updatedAt) return false;
    if (a.lastUpdated && b.lastUpdated && a.lastUpdated !== b.lastUpdated) return false;

    // Length checks for lists
    if (a.bots?.length !== b.bots?.length) return false;
    if (a.feedbacks?.length !== b.feedbacks?.length) return false;
    if (a.botRequests?.length !== b.botRequests?.length) return false;
    if (a.announcements?.length !== b.announcements?.length) return false;
    if (a.polls?.length !== b.polls?.length) return false;

    // Fast check for bots metrics to see if views or likes changed
    if (a.bots && b.bots) {
      for (let i = 0; i < a.bots.length; i++) {
        const botA = a.bots[i];
        const botB = b.bots[i];
        if (!botA || !botB) return false;
        if (botA.id !== botB.id || botA.views !== botB.views || botA.likes !== botB.likes || botA.comments?.length !== botB.comments?.length) {
          return false;
        }
      }
    }

    return true;
  };

  function handleUpdateLocalState(
    newState: AppState,
    syncOnlyOnChange: boolean = true,
    diff?: { type: string; id: string; action?: "update" | "delete"; patch?: any }
  ) {
    if (!newState) return;

    // Sync Only on Change: Skip update if new state is identical to current state
    if (syncOnlyOnChange && state && fastStateEqual(state, newState)) {
      return;
    }

    // Timestamp check: Prevent older state from overwriting newer local state
    const currentTs = state?.lastUpdated || (state?.updatedAt ? new Date(state.updatedAt).getTime() : 0);
    const newTs = newState.lastUpdated || (newState.updatedAt ? new Date(newState.updatedAt).getTime() : 0);
    if (currentTs > 0 && newTs > 0 && newTs < currentTs) {
      console.warn("⚠️ [handleUpdateLocalState] Đã bỏ qua dữ liệu cũ hơn để tránh ghi đè thay đổi mới.");
      return;
    }

    const stateToSet = { ...newState, lastUpdated: newTs || Date.now() };
    setState(stateToSet);

    // Send small diff patch to server if provided to eliminate full state network overwrites
    if (diff) {
      fetch("/api/patch-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...diff, nickname })
      }).catch(err => console.warn("Lỗi gửi diff patch:", err));
    }
  };

  const handleAcceptNsfw = () => {
    localStorage.setItem("cl_portal_nsfw_accepted", "true");
    setNsfwAccepted(true);
  };

  // Register social profile logins
  const handleLoginSuccess = (newNick: string, newAv: string) => {
    setNickname(newNick);
    setAvatar(newAv);
    localStorage.setItem("cl_portal_nickname", newNick);
    localStorage.setItem("cl_portal_avatar", newAv);
  };

  // Dark mode switch handler
  const toggleDarkMode = () => {
    const val = !isDarkMode;
    setIsDarkMode(val);
    localStorage.setItem("portal_dark", val.toString());
    if (val) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 relative flex flex-col overflow-x-hidden ${
      viewMode === "user"
        ? "bg-[#fff2f5] dark:bg-[#12070e] text-pink-950 dark:text-pink-100"
        : "bg-[#edf7ff] dark:bg-[#070b14] text-slate-900 dark:text-slate-100"
    }`}>
      
      {!nsfwAccepted && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center space-y-5">
            <div className="absolute inset-0 bg-gradient-to-t from-rose-900/20 to-transparent pointer-events-none"></div>
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500/30 relative z-10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-rose-500 uppercase tracking-wide relative z-10">Cảnh báo Nội dung</h2>
            <p className="text-slate-300 text-sm leading-relaxed relative z-10">
              Trang web này chứa các nội dung <strong className="text-white">NSFW (Not Safe For Work)</strong> và có thể không phù hợp với mọi độ tuổi. 
              Vui lòng đảm bảo bạn đã <strong className="text-white">đủ 18 tuổi</strong> để tiếp tục truy cập.
            </p>
            <div className="flex flex-col gap-3 pt-3 relative z-10">
              <button 
                onClick={handleAcceptNsfw} 
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                Tôi đã đủ 18 tuổi - Tiếp tục
              </button>
              <button 
                onClick={() => window.location.href = "https://google.com"} 
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
              >
                Rời khỏi trang web
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 100% SCREEN SAKURA CHERRY BLOSSOM ABSTRACT GLOWING BACKDROP WITH ROMANTIC PINK THEMES */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-grid">
        {/* Soft pink radial glow matching cherry blossom aesthetic */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-400/[0.04] to-transparent dark:via-pink-500/[0.06]"></div>
        
        {/* Glowing Sakura core backdrops */}
        <div className="absolute top-10 right-10 w-[450px] h-[450px] bg-gradient-to-tr from-pink-300/10 via-rose-450/15 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-[350px] h-[350px] bg-gradient-to-br from-rose-500/10 via-pink-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* HEADER SECTION (100% Full Width, No margins, glassy blur with Cherry Blossom accents) */}
      <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-pink-150 dark:border-white/10 relative z-10 transition-colors">
        <div className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Panel with gradient matched text in pink sakura style */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-pink-400 to-rose-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20 animate-float-slow">
              <Flower2 className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Zeze và những người mẹ trẻ
              </h1>
              <p className="text-[10px] text-pink-600 dark:text-pink-400 font-bold uppercase tracking-widest italic mt-0.5">Cổng chia sẻ Bot GL & FUTA</p>
            </div>
          </div>

          {/* Header Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link 
              to="/" 
              className="p-1 px-3 rounded-lg bg-pink-500/10 hover:bg-pink-600 hover:text-white text-pink-700 dark:text-pink-400 dark:hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-pink-500/10"
            >
              <Flower2 className="w-3.5 h-3.5" />
              <span>Trang Chủ</span>
            </Link>
            <Link 
              to="/about" 
              className="p-1 px-3 rounded-lg bg-pink-500/10 hover:bg-pink-600 hover:text-white text-pink-700 dark:text-pink-400 dark:hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-pink-500/10"
            >
              <span className="text-sm">🌸</span>
              <span>Về Tác Giả</span>
            </Link>
          </div>

          {/* Settings & View Switcher */}
          <div className="flex items-center gap-3">
            
            {/* Dark mode switch */}
            <button
              onClick={toggleDarkMode}
              className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-amber-400 cursor-pointer transition-colors"
              title={isDarkMode ? "Chuyển sang Giao diện Sáng" : "Chuyển sang Giao diện Tối"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Bell Announcement Indicator Modal Trigger */}
            <div className="relative">
              <button
                onClick={() => { setHasNewAnnouncements(false); setShowAnnOverlay(true); }}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-cyan-400 cursor-pointer transition relative"
                title="Bản tin từ tác giả"
              >
                <Bell className="w-4 h-4" />
                {hasNewAnnouncements && (
                  <span className="w-2.5 h-2.5 bg-red-500 border border-white rounded-full absolute top-1 right-1 animate-ping"></span>
                )}
              </button>
            </div>

            {/* View Switcher: User Dashboard <-> Admin (Guarded) */}
            <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden p-0.5 bg-slate-50 dark:bg-slate-950">
              <div className="relative group">
                <button
                  id="btn-switch-user-mode"
                  onMouseEnter={() => setIsUserBtnHovered(true)}
                  onMouseLeave={() => setIsUserBtnHovered(false)}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    const id = Date.now();
                    setBtnRipples((prev) => [...prev, { id, x, y }]);
                    setTimeout(() => {
                      setBtnRipples((prev) => prev.filter((r) => r.id !== id));
                    }, 500);
                    setViewMode("user");
                  }}
                  className={`relative overflow-hidden px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 hover:scale-105 hover:-translate-y-[2px] active:scale-95 active:opacity-75 transition-all duration-300 ease-out touch-manipulation ${
                    viewMode === "user"
                      ? "bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-400 hover:to-indigo-400 text-white shadow-lg shadow-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/50 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/60"
                      : "text-slate-600 dark:text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/20 hover:shadow-xl hover:shadow-indigo-500/30"
                  }`}
                >
                  {/* Click ripples */}
                  {btnRipples.map((ripple) => (
                    <span
                      key={ripple.id}
                      className="absolute bg-white/30 rounded-full pointer-events-none will-change-transform"
                      style={{
                        left: `${ripple.x}%`,
                        top: `${ripple.y}%`,
                        width: '120px',
                        height: '120px',
                        transform: 'translate(-50%, -50%)',
                        animation: 'ripple-effect 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards',
                      }}
                    />
                  ))}
                  
                  {isUserBtnHovered ? (
                    <Sparkles className="w-3.5 h-3.5 relative z-10 text-pink-200 dark:text-pink-100 animate-pulse transition-transform duration-300 rotate-12" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 relative z-10 transition-transform duration-300" />
                  )}
                  <span className="relative z-10">Thư Viện Bot</span>
                  <div
                    key={state.bots?.length || 0}
                    className="relative z-10 inline-flex items-center justify-center w-5 h-5 transition-all duration-300 animate-pop-in animate-pulse hover:scale-110 drop-shadow-[0_1.5px_3px_rgba(99,102,241,0.35)] shrink-0"
                    title={`Đang có ${state.bots?.length || 0} bot`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`absolute inset-0 w-full h-full fill-current transition-colors duration-300 ${
                        viewMode === "user"
                          ? "text-white dark:text-indigo-900"
                          : "text-indigo-500 dark:text-indigo-700"
                      }`}
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    <span
                      className={`relative z-20 text-[8px] font-black leading-none -mt-0.5 select-none ${
                        viewMode === "user"
                          ? "text-indigo-600 dark:text-indigo-300"
                          : "text-white dark:text-indigo-200"
                      }`}
                    >
                      {state.bots?.length || 0}
                    </span>
                  </div>
                </button>
                
                {/* CSS Tooltip (Lag-free group-hover, instant hover without transition delay) */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold rounded-lg shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-75 delay-0 pointer-events-none whitespace-nowrap z-50 border border-slate-800">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span>Đang quản lý {state.bots?.length || 0} bot trong thư viện</span>
                  </div>
                </div>
              </div>

              <button
                id="btn-switch-admin-mode"
                onClick={() => setViewMode("admin")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                  viewMode === "admin"
                    ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow shadow-cyan-500/25"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Mục Tác Giả</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* CORE WEB FRAME (100% Full layout width inside Container, no margins, sleek responsive padding) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 relative z-10">
        

        <Routes>
          <Route 
            path="/" 
            element={
              viewMode === "admin" ? (
                <AdminPanel
                  state={state}
                  onRefresh={(silent = true) => fetchState(silent)}
                  onUpdateState={handleUpdateLocalState}
                  passcode={passcode}
                  setPasscode={setPasscode}
                  isAdminUnlocked={isAdminUnlocked}
                  setIsAdminUnlocked={setIsAdminUnlocked}
                  onCleanupDuplicates={cleanupDuplicateBots}
                  totalClicksSync={totalClicksSync}
                  syncClickCount={syncClickCount}
                />
                ) : (
                  <UserPanel
                    state={state}
                    onRefresh={(silent = true) => fetchState(silent)}
                    onUpdateState={handleUpdateLocalState}
                    nickname={nickname}
                    avatar={avatar}
                    onOpenLogin={() => setIsLoginModalOpen(true)}
                    userId={userId}
                    isAdminUnlocked={isAdminUnlocked}
                    passcode={passcode}
                    loading={loading}
                  />
                )
              } 
            />
            <Route 
              path="/about" 
              element={
                <div className="max-w-4xl mx-auto space-y-6 px-4 py-2 animate-fade-in">
                  <AboutAuthor state={state} onRefresh={fetchState} nickname={nickname} />
                </div>
              } 
            />
          </Routes>
      </main>

      {/* REVOLUTIONARY REAL-TIME PUSH NOTIFICATION ALERT TOAST */}
      {pushAlert && pushAlert.show && (
        <div 
          id="push-alert-toast"
          className="fixed bottom-6 right-6 z-[100] w-full max-w-sm bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-2xl border border-cyan-500/40 p-4 animate-bounce-short relative overflow-hidden"
        >
          {/* Animated Wave bar inside toast */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-indigo-500 animate-pulse"></div>
          
          <button
            onClick={() => setPushAlert(null)}
            className="absolute top-3 right-3 text-white/55 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
              {pushAlert.type === "post" ? (
                <Sparkles className="w-5 h-5 animate-pulse" />
              ) : pushAlert.type === "announcement" ? (
                <Megaphone className="w-5 h-5 animate-bounce-slow" />
              ) : (
                <MessageCircle className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div className="flex-1 text-xs select-text">
              <h5 className="font-display font-black text-sm text-cyan-200 tracking-tight">{pushAlert.title}</h5>
              <p className="text-slate-300 mt-1">{pushAlert.desc}</p>
              <div className="mt-2.5 flex justify-between items-center text-[10px] text-slate-400">
                <span className="italic">*Có âm thanh báo tin</span>
                <span className="font-bold underline cursor-pointer hover:text-white" onClick={() => { setPushAlert(null); setViewMode("user"); }}>
                  Xem ngay &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOCIAL LOGINS INPUT MODAL */}
      <OAuthLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onLogout={() => {
          setNickname("Vị Khách Đại Dương");
          setUserId("");
          setAvatar("🌊");
          localStorage.removeItem("cl_portal_nickname");
          localStorage.removeItem("cl_portal_uid");
          localStorage.removeItem("cl_portal_avatar");
          setPasscode("");
          setIsAdminUnlocked(false);
          localStorage.removeItem("admin_passcode");
        }}
        currentNickname={nickname}
        currentAvatar={avatar}
      />

      {/* CENTRAL ANNOUNCEMENT MODAL */}
      {showAnnOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAnnOverlay(false)}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 animate-fade-in-up flex flex-col max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h4 className="font-display font-bold text-sm md:text-base flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                <Megaphone className="w-4 h-4 text-amber-500 animate-pulse" />
                Bản tin mới từ tác giả
              </h4>
              <button
                onClick={() => setShowAnnOverlay(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto w-full">
              {state.announcements.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">Hiện tại chưa có thông báo nào từ tác giả.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.announcements.map((ann) => (
                    <div key={ann.id} className="bg-amber-50/50 dark:bg-slate-950/50 p-4 rounded-xl border border-amber-100/50 dark:border-slate-800 space-y-1.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{ann.title}</p>
                      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed text-justify whitespace-pre-wrap select-text">
                        {ann.content}
                      </p>
                      <p className="text-[10px] text-slate-400 text-right mt-2 font-mono">{new Date(ann.createdAt).toLocaleDateString("vi-VN")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {state.announcements.length > 0 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
                <button
                  onClick={() => setShowAnnOverlay(false)}
                  className="px-5 py-2 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Đã rõ & Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER METRICS AND CREDIT (Highly polished, 100% full stretch) */}
      <footer className="bg-white/80 dark:bg-slate-900/80 border-t border-cyan-100 dark:border-slate-900 text-slate-400 text-xs py-8 relative z-10 mt-auto">
        <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="space-y-1 text-center md:text-left">
            <p className="font-display font-extrabold text-slate-700 dark:text-slate-300">
              &copy; 2026 Zeze và những người mẹ trẻ
            </p>
            <p className="text-[10px] text-slate-400 text-justify">
              Giao diện đa năng do tác giả Zeze quản lý trực tiếp. Link và thông tin bài đăng hoàn toàn tùy chỉnh để chuyển tiếp độc giả một cách tiện lợi.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span>Báo chuông bài mới:</span>
            <button
              onClick={() => setPlayAlertSound(!playAlertSound)}
              className={`p-1 px-3 rounded-full border text-[10px] font-bold cursor-pointer transition ${
                playAlertSound
                  ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 border-emerald-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300"
              }`}
            >
              {playAlertSound ? "BẬT CHUÔNG 🔊" : "TẮT CHUÔNG 🔇"}
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
}
