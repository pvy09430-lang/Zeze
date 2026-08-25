import { AppState } from "../types";

const DB_NAME = "GLFutaBotPortalDB";
const DB_VERSION = 1;
const STORE_NAME = "portalStateStore";
const STATE_KEY = "appState";
const TIMESTAMP_KEY = "lastUpdatedTimestamp";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

const DEFAULT_MAX_AGE_DAYS = 30;
const DEFAULT_MAX_AGE_MS = DEFAULT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Get cached AppState from IndexedDB with auto-purge for stale items (> 30 days)
 */
export async function getCachedAppState(maxAgeDays = DEFAULT_MAX_AGE_DAYS): Promise<{ state: AppState; timestamp: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);

      const stateRequest = store.get(STATE_KEY);
      const timeRequest = store.get(TIMESTAMP_KEY);

      tx.oncomplete = async () => {
        if (stateRequest.result) {
          const timestamp = (timeRequest.result as number) || 0;
          const ageMs = Date.now() - timestamp;
          const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

          // Auto-purge if cache is older than allowed maxAgeDays (default 30 days)
          if (timestamp > 0 && ageMs > maxAgeMs) {
            console.log(`🧹 [IndexedDB Auto-Purge] Dữ liệu đệm đã hết hạn (${Math.round(ageMs / (1000 * 3600 * 24))} ngày tuổi > ${maxAgeDays} ngày). Tự động dọn dẹp...`);
            await clearCachedAppState();
            resolve(null);
            return;
          }

          resolve({
            state: stateRequest.result as AppState,
            timestamp,
          });
        } else {
          resolve(null);
        }
      };

      tx.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn("[IndexedDB Cache] getCachedAppState failed:", err);
    return null;
  }
}

/**
 * Save AppState to IndexedDB (supports full objects including base64 images with no 5MB limit)
 */
export async function setCachedAppState(data: AppState): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      store.put(data, STATE_KEY);
      store.put(Date.now(), TIMESTAMP_KEY);

      tx.oncomplete = () => {
        resolve(true);
      };

      tx.onerror = () => {
        console.warn("[IndexedDB Cache] setCachedAppState transaction error:", tx.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn("[IndexedDB Cache] setCachedAppState failed:", err);
    return false;
  }
}

/**
 * Clear cached AppState from IndexedDB
 */
export async function clearCachedAppState(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(STATE_KEY);
    store.delete(TIMESTAMP_KEY);
  } catch (err) {
    console.warn("[IndexedDB Cache] clearCachedAppState failed:", err);
  }
}
