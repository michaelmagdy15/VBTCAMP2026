/**
 * offlineQueue.js — IndexedDB-backed write queue for offline Firestore sync.
 * When the app is offline, mutations are stored here.
 * The Service Worker replays them when connectivity is restored.
 */

const DB_NAME = 'vbt-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'sync-queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Add a failed Firestore write to the offline queue.
 * @param {string} path     Firestore document path e.g. 'vbt_events/ABC123'
 * @param {object} data     Data to write
 * @param {boolean} merge   Whether to merge (true) or overwrite (false)
 */
export async function enqueueWrite(path, data, merge = true) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      path,
      data,
      merge,
      queuedAt: new Date().toISOString(),
    });
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    console.log('[OfflineQueue] Enqueued write for', path);
    // Tell SW to register a background sync
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('vbt-sync-queue');
    }
  } catch (err) {
    console.error('[OfflineQueue] enqueueWrite error:', err);
  }
}

/**
 * Get all pending writes from the queue.
 * @returns {Promise<Array>}
 */
export async function getQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] getQueue error:', err);
    return [];
  }
}

/**
 * Remove a successfully replayed item from the queue.
 * @param {number} id The auto-incremented IDB key
 */
export async function dequeueWrite(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] dequeueWrite error:', err);
  }
}

/**
 * Returns the number of pending writes in the queue.
 * @returns {Promise<number>}
 */
export async function getQueueLength() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return 0;
  }
}

/**
 * Clear the entire queue (used after a full sync).
 */
export async function clearQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch (err) {
    console.error('[OfflineQueue] clearQueue error:', err);
  }
}
