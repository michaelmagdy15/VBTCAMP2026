import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc,
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

// Firebase config — project: crm-production (ID: faa-test-guide-v2)
// VBT data is isolated in the dedicated 'db-vbt' database.
// Other databases (db-gyms, db-inzanathletics, db-shockgym, etc.) are untouched.
const firebaseConfig = {
  projectId: "faa-test-guide-v2",
  appId: "1:492280162134:web:08307e50672d6ae12d98f7",  // VBT Web App
  apiKey: "AIzaSyAUvzDIKoTvtbMEWaP1pDSyNfqpS3_11wI",
  authDomain: "faa-test-guide-v2.firebaseapp.com",
  storageBucket: "faa-test-guide-v2.firebasestorage.app",
  messagingSenderId: "492280162134"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// 'db-vbt' is a dedicated Firestore database — completely separate from all other project databases.
export const db = getFirestore(app, 'db-vbt');

// ─────────────────────────────────────────────
// Helper: Build per-event Firestore paths
// ─────────────────────────────────────────────
function eventScoresPath(eventCode) {
  return `vbt_events/${eventCode}/live_scores/state`;
}
function eventSchedulePath(eventCode) {
  return `vbt_events/${eventCode}/schedule_data/main`;
}
function eventConfigPath(eventCode) {
  return `vbt_events/${eventCode}/config/main`;
}
function eventAnnouncementsPath(eventCode) {
  return `vbt_events/${eventCode}/announcements`;
}

// ─────────────────────────────────────────────
// EVENT REGISTRY
// ─────────────────────────────────────────────

/**
 * Subscribes to the event registry listing all available events.
 * @param {function} callback - Called with an array of event summaries.
 * @returns {function} Unsubscribe function.
 */
export function subscribeToEventRegistry(callback) {
  const docRef = doc(db, 'vbt_event_registry/events');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().list || []);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Error subscribing to event registry:", error);
    callback([]);
  });
}

/**
 * Checks whether an event with this code already exists in Firestore.
 * Use this before creating OR joining to prevent collisions.
 * @param {string} eventCode
 * @returns {Promise<boolean>}
 */
export async function checkEventExists(eventCode) {
  try {
    const docRef = doc(db, eventConfigPath(eventCode));
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (error) {
    console.warn('Could not check event existence:', error);
    return false;
  }
}

/**
 * Creates a new event. Throws if the event code already exists, to prevent overwriting.
 * All data is written exclusively to: vbt_events/{eventCode}/
 * This NEVER touches any other Firestore collection.
 * @param {string} eventCode - Short unique code (e.g. 'summer_2025')
 * @param {object} config - Event configuration object
 */
export async function createEvent(eventCode, config) {
  try {
    // Safety check — refuse to overwrite an existing event
    const exists = await checkEventExists(eventCode);
    if (exists) {
      throw new Error(`Event code "${eventCode}" already exists. Choose a different code.`);
    }

    // Write event config (path: vbt_events/{eventCode}/config/main)
    await setDoc(doc(db, eventConfigPath(eventCode)), {
      ...config,
      createdAt: new Date().toISOString()
    });

    // Write empty live_scores doc (path: vbt_events/{eventCode}/live_scores/state)
    await setDoc(doc(db, eventScoresPath(eventCode)), {
      blockScores: {},
      teamDeductions: {},
      tokens: { side1: 0, side2: 0 },
      timeShiftMinutes: 0,
      isTimerPaused: false,
      timerPausedAt: null,
      appsScriptWebappUrl: '',
      createdAt: new Date().toISOString()
    });

    console.log(`[Firebase] Event '${eventCode}' created at vbt_events/${eventCode}/`);
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────
// EVENT CONFIG
// ─────────────────────────────────────────────

/**
 * Subscribes to real-time updates for an event's configuration (branding, passcodes, side names).
 * @param {string} eventCode
 * @param {function} callback
 * @returns {function} Unsubscribe function.
 */
export function subscribeToEventConfig(eventCode, callback) {
  const docRef = doc(db, eventConfigPath(eventCode));
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to event config:", error);
  });
}

/**
 * Updates an event's configuration.
 * @param {string} eventCode
 * @param {object} config - Partial config fields to update.
 */
export async function updateEventConfig(eventCode, config) {
  const docRef = doc(db, eventConfigPath(eventCode));
  try {
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating event config:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
// CAMP STATE (SCORES, TOKENS, DEDUCTIONS)
// ─────────────────────────────────────────────

/**
 * Subscribes to real-time updates for the camp state of a specific event.
 * @param {string} eventCode
 * @param {function} callback
 * @returns {function} Unsubscribe function.
 */
export function subscribeToCampState(eventCode, callback) {
  const docRef = doc(db, eventScoresPath(eventCode));
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
 * Updates the camp state in Firestore for a specific event.
 * @param {string} eventCode
 * @param {object} updates - Object containing state updates.
 */
export async function updateCampState(eventCode, updates) {
  const docRef = doc(db, eventScoresPath(eventCode));
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

// ─────────────────────────────────────────────
// SCHEDULE DATA
// ─────────────────────────────────────────────

/**
 * Subscribes to real-time updates for the schedule/matchups data of a specific event.
 * @param {string} eventCode
 * @param {function} callback
 * @returns {function} Unsubscribe function.
 */
export function subscribeToScheduleData(eventCode, callback) {
  const docRef = doc(db, eventSchedulePath(eventCode));
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

// ─────────────────────────────────────────────
// ANNOUNCEMENTS / FEED
// ─────────────────────────────────────────────

/**
 * Subscribes to the recent announcements/notifications timeline for a specific event.
 * @param {string} eventCode
 * @param {function} callback
 * @param {number} maxItems
 * @returns {function} Unsubscribe function.
 */
export function subscribeToAnnouncements(eventCode, callback, maxItems = 50) {
  const colRef = collection(db, eventAnnouncementsPath(eventCode));
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
 * Adds a new announcement/notification to the timeline of a specific event.
 * @param {string} eventCode
 * @param {string} text
 * @param {string} sender
 * @param {string} type
 * @param {string|null} image
 */
export async function addAnnouncement(eventCode, text, sender, type = 'announcement', image = null) {
  const colRef = collection(db, eventAnnouncementsPath(eventCode));
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
 * @param {string} eventCode
 * @param {string} id - Document ID.
 * @param {object} reactions - Updated reactions map.
 */
export async function updateAnnouncementReactions(eventCode, id, reactions) {
  const docRef = doc(db, eventAnnouncementsPath(eventCode), id);
  try {
    await updateDoc(docRef, { reactions });
  } catch (error) {
    console.error("Error updating reactions:", error);
  }
}

// ─────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// SERVICE MODE DATA (Brief, Groups, Games+Lessons)
// ─────────────────────────────────────────────

/**
 * Subscribes to the service data (brief, groups, games+lessons) for a specific event.
 * Stored at: vbt_events/{eventCode}/service_data/main
 * Shape: { serviceBrief: string, groups: [{leaderName, kidCount}], games: [{name, howToPlay, lesson}] }
 * @param {string} eventCode
 * @param {function} callback
 * @returns {function} Unsubscribe function.
 */
export function subscribeToServiceData(eventCode, callback) {
  const docRef = doc(db, `vbt_events/${eventCode}/service_data/main`);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Error subscribing to service data:", error);
    callback(null);
  });
}

/**
 * Saves the full service data for a specific event.
 * @param {string} eventCode
 * @param {object} data - { serviceBrief, groups, games }
 */
export async function updateServiceData(eventCode, data) {
  const docRef = doc(db, `vbt_events/${eventCode}/service_data/main`);
  try {
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating service data:", error);
    throw error;
  }
}
