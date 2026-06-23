import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

// Config from faa-test-guide-v2
const firebaseConfig = {
  projectId: "faa-test-guide-v2",
  appId: "1:492280162134:web:1515094f029665cf2d98f7",
  apiKey: "AIzaSyAUvzDIKoTvtbMEWaP1pDSyNfqpS3_11wI",
  authDomain: "faa-test-guide-v2.firebaseapp.com",
  storageBucket: "faa-test-guide-v2.firebasestorage.app",
  messagingSenderId: "492280162134"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Firestore document paths
const SCORES_DOC_PATH = 'vbt_camp/live_scores';
const SCHEDULE_DOC_PATH = 'vbt_camp/schedule_data';
const ANNOUNCEMENTS_COL_PATH = 'vbt_camp_announcements';

/**
 * Subscribes to real-time updates for the VBT camp schedule/matchups data.
 * @param {function} callback - Callback function with the new schedule data.
 * @returns {function} Unsubscribe function.
 */
export function subscribeToScheduleData(callback) {
  const docRef = doc(db, SCHEDULE_DOC_PATH);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to schedule data:", error);
  });
}

/**
 * Subscribes to real-time updates for the VBT camp state.
 * This includes matchups, point deductions, and tokens.
 * @param {function} callback - Callback function with the new state.
 * @returns {function} Unsubscribe function.
 */
export function subscribeToCampState(callback) {
  const docRef = doc(db, SCORES_DOC_PATH);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to camp state:", error);
  });
}

/**
 * Updates the VBT camp state in Firestore.
 * @param {object} updates - Object containing state updates.
 */
export async function updateCampState(updates) {
  const docRef = doc(db, SCORES_DOC_PATH);
  try {
    await setDoc(docRef, {
      ...updates,
      lastUpdatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating camp state:", error);
    throw error;
  }
}

/**
 * Subscribes to the recent announcements/notifications timeline.
 * @param {function} callback - Callback function with the list of announcements.
 * @param {number} maxItems - Maximum number of announcements to retrieve.
 * @returns {function} Unsubscribe function.
 */
export function subscribeToAnnouncements(callback, maxItems = 50) {
  const colRef = collection(db, ANNOUNCEMENTS_COL_PATH);
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(maxItems));
  
  return onSnapshot(q, (querySnapshot) => {
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    callback(list);
  }, (error) => {
    console.error("Error subscribing to announcements:", error);
  });
}

/**
 * Adds a new announcement/notification to the timeline.
 * @param {string} text - Message text.
 * @param {string} sender - Leader name who sent it.
 * @param {string} type - 'score' | 'deduction' | 'announcement' | 'system'
 */
export async function addAnnouncement(text, sender, type = 'announcement', image = null) {
  const colRef = collection(db, ANNOUNCEMENTS_COL_PATH);
  try {
    await addDoc(colRef, {
      text,
      sender,
      type,
      image,
      reactions: { thumbsup: [], congrats: [], fire: [] },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error adding announcement:", error);
  }
}

/**
 * Updates the reactions for a specific announcement.
 * @param {string} id - Document ID.
 * @param {object} reactions - Updated reactions map.
 */
export async function updateAnnouncementReactions(id, reactions) {
  const docRef = doc(db, ANNOUNCEMENTS_COL_PATH, id);
  try {
    await updateDoc(docRef, { reactions });
  } catch (error) {
    console.error("Error updating reactions:", error);
  }
}

/**
 * Lazily loads and returns the Firebase Messaging instance if supported.
 */
export async function getFirebaseMessaging() {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (e) {
    console.warn("FCM is not supported in this environment:", e);
  }
  return null;
}

/**
 * Saves a device push token (web FCM or native APNs/FCM) to Firestore.
 */
export async function registerDevicePushToken(userId, role, tokenOrVapidKey, platform = 'web') {
  try {
    let token = null;

    if (platform === 'native') {
      // Native APNs/FCM token is passed directly from Capacitor
      token = tokenOrVapidKey;
    } else {
      // Web PWA FCM token requires fetching via the Web VAPID key
      const messaging = await getFirebaseMessaging();
      if (!messaging) return null;

      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn("Notification permission was denied by the user.");
          return null;
        }
      }

      const registration = await navigator.serviceWorker.ready;
      token = await getToken(messaging, {
        vapidKey: tokenOrVapidKey,
        serviceWorkerRegistration: registration
      });
    }

    if (token) {
      const tokenRef = doc(db, 'vbt_push_tokens', token);
      await setDoc(tokenRef, {
        token,
        userId: userId || 'anonymous',
        role: role || 'viewer',
        platform: platform,
        userAgent: navigator.userAgent,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`[Push] Registered ${platform} push token in Firestore:`, token);
      return token;
    }
  } catch (error) {
    console.error(`Failed to register ${platform} push token:`, error);
  }
  return null;
}

