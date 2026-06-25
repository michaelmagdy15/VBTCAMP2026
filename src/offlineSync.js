/**
 * offlineSync.js
 * IndexedDB-based offline sync queue for VBT Sports Camp.
 * Buffers Firestore writes while offline and replays them on reconnect
 * using a last-write-wins strategy.
 */

const DB_NAME = 'vbt-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

/**
 * Opens (or creates) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

class OfflineSyncQueue {
  /**
   * Enqueue a pending write to be replayed when connectivity returns.
   * @param {string} collection - Firestore collection name
   * @param {string} docPath - Full document path (e.g. "games/abc123")
   * @param {Object} data - The data payload to write
   * @param {number} timestamp - Unix timestamp (ms) for last-write-wins ordering
   * @returns {Promise<void>}
   */
  async enqueueUpdate(collection, docPath, data, timestamp) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.add({
        collection,
        docPath,
        data,
        timestamp,
        createdAt: Date.now()
      });

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    } catch (err) {
      console.warn('[OfflineSyncQueue] enqueueUpdate failed:', err);
    }
  }

  /**
   * Replay all queued writes using the provided firebase update function,
   * then clear them. Uses last-write-wins: if two writes target the same
   * docPath, only the one with the latest timestamp is replayed.
   * @param {function} firebaseUpdateFn - async (collection, docPath, data) => void
   * @returns {Promise<void>}
   */
  async flushQueue(firebaseUpdateFn) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      // Read all queued items
      const items = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (!items || items.length === 0) return;

      // Last-write-wins: keep only the entry with the highest timestamp per docPath
      const latestByPath = new Map();
      for (const item of items) {
        const existing = latestByPath.get(item.docPath);
        if (!existing || item.timestamp > existing.timestamp) {
          latestByPath.set(item.docPath, item);
        }
      }

      // Replay each deduplicated write
      for (const item of latestByPath.values()) {
        try {
          await firebaseUpdateFn(item.collection, item.docPath, item.data);
        } catch (err) {
          console.warn('[OfflineSyncQueue] Failed to replay write for', item.docPath, err);
        }
      }

      // Clear queue after successful replay
      await this.clearQueue();
    } catch (err) {
      console.warn('[OfflineSyncQueue] flushQueue failed:', err);
    }
  }

  /**
   * Returns the count of pending updates in the queue.
   * @returns {Promise<number>}
   */
  async getQueueSize() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const count = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      db.close();
      return count;
    } catch (err) {
      console.warn('[OfflineSyncQueue] getQueueSize failed:', err);
      return 0;
    }
  }

  /**
   * Removes all pending updates from the queue.
   * @returns {Promise<void>}
   */
  async clearQueue() {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.clear();

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });

      db.close();
    } catch (err) {
      console.warn('[OfflineSyncQueue] clearQueue failed:', err);
    }
  }
}

/** Singleton instance */
export const offlineQueue = new OfflineSyncQueue();

/**
 * Sets up a listener on the window 'online' event to trigger sync when
 * connectivity is restored.
 * @param {function} flushCallback - Called when the browser comes back online
 */
export function setupOnlineListener(flushCallback) {
  try {
    window.addEventListener('online', () => {
      console.log('[OfflineSyncQueue] Back online – triggering flush');
      flushCallback();
    });
  } catch (err) {
    console.warn('[OfflineSyncQueue] setupOnlineListener failed:', err);
  }
}

export { OfflineSyncQueue };
