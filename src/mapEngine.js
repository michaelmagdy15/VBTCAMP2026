// ─── Map Engine — Firestore utility for map configuration ───
import { db } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── Default Map Configuration ───
export const DEFAULT_MAP_CONFIG = {
  center: { lat: 30.0444, lng: 31.2357 }, // Cairo, Egypt
  zoom: 18,
  satelliteUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  streetUrl:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
  waypoints: [],
};

// ─── Helpers ───
function getDb() {
  return db;
}

function configRef(eventCode) {
  const db = getDb();
  return doc(db, 'vbt_events', eventCode, 'map_config', 'settings');
}

// ─── subscribeToMapConfig ───
// Real-time listener on vbt_events/{eventCode}/map_config/settings
// Returns an unsubscribe function.
export function subscribeToMapConfig(eventCode, callback) {
  const ref = configRef(eventCode);

  const unsubscribe = onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        // Document doesn't exist yet — seed with defaults
        callback({ ...DEFAULT_MAP_CONFIG });
      }
    },
    (error) => {
      console.error('[mapEngine] onSnapshot error:', error);
      callback({ ...DEFAULT_MAP_CONFIG });
    }
  );

  return unsubscribe;
}

// ─── updateMapConfig ───
// Saves the full map config document (merge to preserve other fields).
export async function updateMapConfig(eventCode, configData) {
  const ref = configRef(eventCode);
  await setDoc(ref, configData, { merge: true });
}

// ─── updateWaypoints ───
// Updates only the waypoints array inside the config doc.
export async function updateWaypoints(eventCode, waypoints) {
  const ref = configRef(eventCode);
  await setDoc(ref, { waypoints }, { merge: true });
}

// ─── uploadMapScreenshot ───
// Uploads the map canvas screenshot to Firebase Storage.
export async function uploadMapScreenshot(eventCode, blob) {
  const app = getApps()[0];
  const storage = getStorage(app);
  const path = `vbt_events/${eventCode}/map_screenshot.png`;
  const storageRef = sRef(storage, path);
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
