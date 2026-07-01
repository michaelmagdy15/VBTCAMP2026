import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence,
  doc, 
  getDoc,
  getDocs,
  onSnapshot, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  deleteDoc
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

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence failed: Multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence is not supported by the browser.');
  } else {
    console.error('Offline persistence error:', err);
  }
});

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
 * Fetches the event registry listing all available events once.
 * @returns {Promise<Array>} Array of event summaries.
 */
export async function getEventRegistry() {
  try {
    const docRef = doc(db, 'vbt_event_registry/events');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().list || [];
    }
  } catch (error) {
    console.error("Error fetching event registry:", error);
  }
  return [];
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
      tokens: { red: 0, white: 0, black: 0, blue: 0 },
      timeShiftMinutes: 0,
      isTimerPaused: false,
      timerPausedAt: null,
      appsScriptWebappUrl: '',
      createdAt: new Date().toISOString()
    });

    // Update the registry list doc (vbt_event_registry/events)
    const registryRef = doc(db, 'vbt_event_registry/events');
    const registrySnap = await getDoc(registryRef);
    let list = [];
    if (registrySnap.exists()) {
      list = registrySnap.data().list || [];
    }
    // Filter out if duplicate
    list = list.filter(item => item.code !== eventCode);
    list.push({
      code: eventCode,
      name: config.eventName,
      date: config.eventDate || '',
      active: true,
      eventType: config.eventType || 'service'
    });
    await setDoc(registryRef, { list }, { merge: true });

    console.log(`[Firebase] Event '${eventCode}' created and added to registry.`);
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
export async function addAnnouncement(eventCode, text, sender, type = 'announcement', image = null, senderRole = null) {
  const colRef = collection(db, eventAnnouncementsPath(eventCode));
  try {
    await addDoc(colRef, {
      text,
      sender,
      type,
      image,
      senderRole,
      reactions: { thumbsup: [], congrats: [], fire: [] },
      timestamp: new Date().toISOString()
    });

    // Fire push notification to all subscribed devices (best-effort)
    const isUrgent = type === 'ping' || type === 'urgent';
    const emoji = isUrgent ? '🚨' : type === 'round_start' ? '🏐' : type === 'schedule' ? '📅' : '📢';
    sendWebPushNotification(
      `${emoji} ${sender}`,
      text,
      type
    ).catch(() => {}); // never block the Firestore write

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
// WEB PUSH (using standard PushManager API)
// Works on iOS 16.4+ Safari PWA and Android Chrome
// ─────────────────────────────────────────────

// URL of the deployed Cloud Run notification service
// This will be updated automatically after the first deploy
export const NOTIFY_SERVICE_URL = 'https://vbt-notify-service-430356395102.europe-west1.run.app';

export const VAPID_PUBLIC_KEY = 'BE7Vwn_moGbtJ4gXEFj61BnvQ5HEnbmaaLneCm-65ITNq2CyzcdxtwqfrfyDar_EjMT8IpP1B_AmnPxk9NDYeTw';

/**
 * Subscribe this browser to Web Push and register with the notify service.
 * Call after notification permission is granted.
 * @param {string} uid  - user identifier
 * @param {string} name - display name
 * @param {string} role - user role
 */
export async function subscribeToWebPush(uid, name, role) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] PushManager not supported in this browser');
      return null;
    }
    const registration = await navigator.serviceWorker.ready;

    // Convert base64 VAPID key to Uint8Array
    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
    };

    // Always unsubscribe any existing subscription first.
    // This prevents VAPID-key mismatch if a prior FCM subscription exists.
    const existing = await registration.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Register subscription with our Cloud Run notification service
    const res = await fetch(`${NOTIFY_SERVICE_URL}/subscribe`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ uid, name, role, subscription }),
    });

    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    console.log('[Push] Web Push subscription registered successfully');
    return subscription;
  } catch (err) {
    console.error('[Push] Failed to subscribe to Web Push:', err);
    return null;
  }
}

/**
 * Send a push notification to all subscribed devices via the notify service.
 * Called automatically by addAnnouncement — no need to call manually.
 */
export async function sendWebPushNotification(title, body, type = 'announcement') {
  try {
    await fetch(`${NOTIFY_SERVICE_URL}/notify`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ title, body, type }),
    });
  } catch (err) {
    // Non-blocking — network may be down, Firestore write already succeeded
    console.warn('[Push] Failed to send push notification:', err);
  }
}

// Legacy FCM helpers (kept for compatibility)
export async function getFirebaseMessaging() {
  try {
    const supported = await isSupported();
    if (supported) return getMessaging(app);
  } catch (e) {
    console.warn('FCM not supported:', e);
  }
  return null;
}

export async function registerDevicePushToken(userId, role, tokenOrVapidKey, platform = 'web') {
  try {
    let token = null;
    if (platform === 'native') {
      token = tokenOrVapidKey;
    } else {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return null;
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;
      }
      const registration = await navigator.serviceWorker.ready;
      token = await getToken(messaging, { vapidKey: tokenOrVapidKey, serviceWorkerRegistration: registration });
    }
    if (token) {
      const tokenRef = doc(db, 'vbt_push_tokens', token);
      await setDoc(tokenRef, {
        token, userId: userId || 'anonymous', role: role || 'viewer',
        platform, userAgent: navigator.userAgent, updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Push] Registered ${platform} FCM token`);
      return token;
    }
  } catch (error) {
    console.error(`Failed to register push token:`, error);
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

// ─────────────────────────────────────────────
// SERVANTS DIRECTORY (Global Directory)
// ─────────────────────────────────────────────

/**
 * Fetches all servants once from the VBT servants collection.
 * @returns {Promise<Array>} A promise that resolves to the array of servants.
 */
export async function getServants() {
  try {
    const colRef = collection(db, 'vbt_servants');
    const querySnapshot = await getDocs(colRef);
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  } catch (error) {
    console.error("Error fetching servants:", error);
    throw error;
  }
}

/**
 * Subscribes to all servants in the VBT servants collection.
 * @param {function} callback
 * @returns {function} Unsubscribe function.
 */
export function subscribeToServants(callback) {
  const colRef = collection(db, 'vbt_servants');
  return onSnapshot(colRef, (querySnapshot) => {
    const list = [];
    querySnapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    callback(list);
  }, (error) => {
    console.error("Error subscribing to servants:", error);
    callback([]);
  });
}

/**
 * Updates a servant's passcode or other fields.
 */
export async function updateServant(servantId, updates) {
  const docRef = doc(db, 'vbt_servants', servantId);
  try {
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    console.error("Error updating servant:", error);
    throw error;
  }
}

/**
 * Adds a new servant to the global directory.
 */
export async function addServant(servant) {
  const docRef = doc(db, 'vbt_servants', servant.id);
  try {
    await setDoc(docRef, servant);
  } catch (error) {
    console.error("Error adding servant:", error);
    throw error;
  }
}

/**
 * Deletes a servant from the global directory.
 */
export async function deleteServant(servantId) {
  const docRef = doc(db, 'vbt_servants', servantId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting servant:", error);
    throw error;
  }
}

/**
 * Generates and saves a dynamic rotational schedule for Service Mode events.
 */
export async function generateAndSaveServiceSchedule(targetEventCode, configData, activeServantsList, globalServants) {
  // Helper to resolve leader names for games
  const getLeaderNameForRole = (role) => {
    const sId = Object.keys(configData.servantAssignments || {}).find(key => configData.servantAssignments[key] === role);
    if (!sId || !activeServantsList.includes(sId)) return "Unassigned";
    const s = globalServants.find(serv => serv.id === sId);
    return s ? s.name : "Unassigned";
  };

  const getLeaderNamesForBigGame = () => {
    const leaders = [];
    Object.entries(configData.servantAssignments || {}).forEach(([sId, rCode]) => {
      if (activeServantsList.includes(sId) && (rCode === 'big_game_1' || rCode === 'big_game_2' || rCode === 'referee' || sId === 'daniel_el_masry')) {
        const s = globalServants.find(serv => serv.id === sId);
        if (s) leaders.push(s.name);
      }
    });
    return leaders.length > 0 ? leaders.join(', ') : "Referees";
  };

  // 1. Determine active team leaders and sub-teams
  const customColors = configData.teamNames || { red: 'Red', white: 'White', black: 'Black', blue: 'Blue' };
  const getCustomColorName = (colorKey) => {
    const key = colorKey.toLowerCase();
    const custom = customColors[key];
    if (custom && custom.trim()) return custom.trim();
    return colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
  };

  const activeSubTeams = []; // e.g. ["Red 1", "Red 2", "White 1", "White 2", ...]
  const teamLeaders = {}; // teamName -> leaderName

  const roleMapping = configData.servantAssignments || {};
  Object.entries(roleMapping).forEach(([servantId, roleCode]) => {
    // Must be attending/active
    if (!activeServantsList.includes(servantId)) return;

    if (roleCode.startsWith('team_')) {
      const servant = globalServants.find(s => s.id === servantId);
      if (servant) {
        const parts = roleCode.split('_'); // ["team", "white", "1"]
        const colorKey = parts[1]; // "white"
        const colorName = getCustomColorName(colorKey);
        const idx = parts[2]; // "1"
        const teamName = `${colorName} ${idx}`; // "White 1"
        activeSubTeams.push(teamName);
        teamLeaders[teamName] = servant.name;
      }
    }
  });

  if (activeSubTeams.length === 0) {
    throw new Error("Please assign at least one servant as a Team Leader (Red 1, White 1, etc.) before generating schedule.");
  }

  // Sort sub-teams for predictable pairings (Red, White, Black, Blue order)
  activeSubTeams.sort((a, b) => {
    const aColor = a.split(' ').slice(0, -1).join(' ');
    const bColor = b.split(' ').slice(0, -1).join(' ');
    
    const getBaseColorOrder = (name) => {
      if (name === getCustomColorName('red')) return 0;
      if (name === getCustomColorName('white')) return 1;
      if (name === getCustomColorName('black')) return 2;
      if (name === getCustomColorName('blue')) return 3;
      return 99;
    };
    
    const aOrder = getBaseColorOrder(aColor);
    const bOrder = getBaseColorOrder(bColor);
    
    const aIdx = parseInt(a.split(' ').pop(), 10) || 1;
    const bIdx = parseInt(b.split(' ').pop(), 10) || 1;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return aIdx - bIdx;
  });

  const T = activeSubTeams.length;
  const baseKids = Math.floor(configData.kidCount / T);
  const remainder = configData.kidCount % T;

  // Create teams map
  const teams = {};
  activeSubTeams.forEach((teamName, idx) => {
    const colorName = teamName.split(' ').slice(0, -1).join(' ');
    let side = 'Red';
    if (colorName === getCustomColorName('white')) side = 'White';
    else if (colorName === getCustomColorName('black')) side = 'Black';
    else if (colorName === getCustomColorName('blue')) side = 'Blue';

    teams[teamName] = {
      code: teamName,
      name: teamName,
      leaders: teamLeaders[teamName] || "Unassigned",
      side: side,
      kidCount: baseKids + (idx < remainder ? 1 : 0)
    };
  });

  // Pair up teams
  const teamListForPairs = [...activeSubTeams];
  if (T % 2 !== 0) {
    teamListForPairs.push("Servants");
    teams["Servants"] = {
      code: "Servants",
      name: "Servants Team",
      leaders: "Volunteers / Refs",
      side: "System",
      kidCount: 0
    };
  }

  const P = teamListForPairs.length / 2;

  if (configData.randomizeMatchups) {
    const subTeamsPart = teamListForPairs.filter(t => t !== 'Servants');
    for (let i = subTeamsPart.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [subTeamsPart[i], subTeamsPart[j]] = [subTeamsPart[j], subTeamsPart[i]];
    }
    if (T % 2 !== 0) {
      subTeamsPart.push("Servants");
    }
    for (let i = 0; i < teamListForPairs.length; i++) {
      teamListForPairs[i] = subTeamsPart[i];
    }
  }

  const matchups = [];

  const stations = configData.stations || {
    station_1: { name: "Commitment", location: "Football Field", howToPlay: "", lesson: "" },
    station_2: { name: "Knock & Unlock", location: "Terrace", howToPlay: "", lesson: "" },
    station_3: { name: "Trust", location: "Court", howToPlay: "", lesson: "" },
    station_4: { name: "Communication", location: "Pool", howToPlay: "", lesson: "" }
  };

  const bigGameName = configData.bigGameName || "Loyalty (Big Game)";
  const bigGameLoc = configData.bigGameLocation || "Football Field";
  const reflectionName = configData.reflectionName || "Reflection";
  const reflectionLoc = configData.reflectionLocation || "Main Hall";

  const startTimeStr = configData.startTime || '15:15';
  const roundDur = Number(configData.roundDurationMinutes) || 20;
  const breakDur = configData.breakMinutes !== undefined ? Number(configData.breakMinutes) : 0;
  const [startHours, startMins] = startTimeStr.split(':').map(Number);

  const getShiftedTime = (minsOffset) => {
    const d = new Date();
    d.setHours(startHours, startMins + minsOffset, 0, 0);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    const strHours = hours < 10 ? '0' + hours : hours;
    return `${strHours}:${strMinutes} ${ampm}`;
  };

  const roundTimes = {
    1: getShiftedTime(0),
    2: getShiftedTime(1 * (roundDur + breakDur)),
    3: getShiftedTime(2 * (roundDur + breakDur)),
    4: getShiftedTime(3 * (roundDur + breakDur))
  };

  const bigGameTime = getShiftedTime(4 * roundDur + 3 * breakDur);
  const reflectionTime = getShiftedTime(4 * roundDur + 3 * breakDur + 35);

  // ─── Matchup Generator with Same-Color Prevention ──────────────────
  // Helper to extract base color (e.g. "Red 1" -> "Red")
  const getBaseColor = (name) => {
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts.slice(0, -1).join(' ');
    }
    return name;
  };

  // Backtracking solver to generate 4 rounds of collision-free matchups
  const generateFourRoundMatchups = (teamList) => {
    const T_size = teamList.length;
    const P_size = T_size / 2;
    const rounds = [];
    const playedPairs = new Set();
    const getPairKey = (tA, tB) => [tA, tB].sort().join('||');

    const solveRound = (roundIdx, currentRoundPairs, usedInRound, depth = 0) => {
      if (currentRoundPairs.length === P_size) return true;
      if (depth > 200) return false; // Fail-safe recursion guard

      let firstUnused = -1;
      for (let i = 0; i < T_size; i++) {
        if (!usedInRound.has(teamList[i])) {
          firstUnused = i;
          break;
        }
      }
      if (firstUnused === -1) return false;

      const teamA = teamList[firstUnused];
      const colorA = getBaseColor(teamA);

      for (let j = firstUnused + 1; j < T_size; j++) {
        const teamB = teamList[j];
        if (usedInRound.has(teamB)) continue;

        // Constraint: Red only plays Blue, White only plays Black, same-color matches are forbidden.
        if (teamA !== 'Servants' && teamB !== 'Servants') {
          const sideA = teams[teamA]?.side;
          const sideB = teams[teamB]?.side;
          const isValidColorMatch = 
            (sideA === 'Red' && sideB === 'Blue') ||
            (sideA === 'Blue' && sideB === 'Red') ||
            (sideA === 'White' && sideB === 'Black') ||
            (sideA === 'Black' && sideB === 'White');
          if (!isValidColorMatch) continue;
        }

        const pairKey = getPairKey(teamA, teamB);
        const isDuplicate = playedPairs.has(pairKey);

        usedInRound.add(teamA);
        usedInRound.add(teamB);
        currentRoundPairs.push([teamA, teamB]);
        if (!isDuplicate) playedPairs.add(pairKey);

        if (solveRound(roundIdx, currentRoundPairs, usedInRound, depth + 1)) {
          return true;
        }

        if (!isDuplicate) playedPairs.delete(pairKey);
        currentRoundPairs.pop();
        usedInRound.delete(teamA);
        usedInRound.delete(teamB);
      }
      return false;
    };

    for (let r = 0; r < 4; r++) {
      const currentRoundPairs = [];
      const usedInRound = new Set();
      let success = solveRound(r, currentRoundPairs, usedInRound, 0);
      if (!success) {
        // Relax duplicate opponent constraint if we run out of unique matchups, but keep same-color restriction
        playedPairs.clear();
        solveRound(r, currentRoundPairs, usedInRound, 0);
      }
      rounds.push(currentRoundPairs);
      currentRoundPairs.forEach(([tA, tB]) => playedPairs.add(getPairKey(tA, tB)));
    }
    return rounds;
  };

  const numLocations = Math.max(4, P);
  const daysCount = configData.daysCount || 1;

  for (let d = 1; d <= daysCount; d++) {
    // Generate fresh pairings for the 4 rounds of this day
    const dayPairings = generateFourRoundMatchups(teamListForPairs);

    for (let r = 1; r <= 4; r++) {
      const roundPairs = dayPairings[r - 1] || [];

      for (let p = 0; p < P; p++) {
        const pair = roundPairs[p] || [teamListForPairs[2 * p], teamListForPairs[2 * p + 1]];
        const teamA = pair[0];
        const teamB = pair[1];

        // Station index: circular shift per round to prevent collisions
        const stationIdx = (p + r - 1) % numLocations;

        let gameName = "Rest & Quiz";
        let locName = "Rest Area";

        if (stationIdx < 4) {
          const stKey = `station_${stationIdx + 1}`;
          gameName = stations[stKey].name;
          locName = stations[stKey].location;
        }

        matchups.push({
          day: d,
          block: 1, // block 1 is rotational rounds
          round: r,
          game: gameName,
          time: roundTimes[r],
          teamA: teamA,
          teamB: teamB,
          location: locName
        });
      }
    }

    // Add Big Game (Block 2)
    matchups.push({
      day: d,
      block: 2,
      round: 1,
      game: bigGameName,
      time: bigGameTime,
      teamA: "All Teams",
      teamB: "Referees",
      location: bigGameLoc
    });

    // Add Reflection (Block 3)
    matchups.push({
      day: d,
      block: 3,
      round: 1,
      game: reflectionName,
      time: reflectionTime,
      teamA: "All Teams",
      teamB: "Bible Discussion",
      location: reflectionLoc
    });
  }

  // Construct schedule data payload
  const scheduleData = {
    teams,
    matchups,
    gamePoints: {
      [stations.station_1.name]: 15,
      [stations.station_2.name]: 15,
      [stations.station_3.name]: 15,
      [stations.station_4.name]: 15,
      "Rest & Quiz": 0,
      [bigGameName]: 30,
      [reflectionName]: 0
    }
  };

  // Write to Firestore docs
  const scheduleDocRef = doc(db, eventSchedulePath(targetEventCode));
  await setDoc(scheduleDocRef, scheduleData);

  const configDocRef = doc(db, eventConfigPath(targetEventCode));
  await setDoc(configDocRef, configData);

  // Form group breakdowns and games list for service_data
  const groups = activeSubTeams.map((teamName, idx) => {
    return {
      leaderName: `${teamName} (${teamLeaders[teamName] || 'Unassigned'})`,
      kidCount: teams[teamName].kidCount
    };
  });

  const games = [
    {
      name: `${stations.station_1.name} (Station 1 - ${getLeaderNameForRole('station_1')})`,
      howToPlay: stations.station_1.howToPlay || "No rules provided.",
      lesson: stations.station_1.lesson || "No lesson details provided."
    },
    {
      name: `${stations.station_2.name} (Station 2 - ${getLeaderNameForRole('station_2')})`,
      howToPlay: stations.station_2.howToPlay || "No rules provided.",
      lesson: stations.station_2.lesson || "No lesson details provided."
    },
    {
      name: `${stations.station_3.name} (Station 3 - ${getLeaderNameForRole('station_3')})`,
      howToPlay: stations.station_3.howToPlay || "No rules provided.",
      lesson: stations.station_3.lesson || "No lesson details provided."
    },
    {
      name: `${stations.station_4.name} (Station 4 - ${getLeaderNameForRole('station_4')})`,
      howToPlay: stations.station_4.howToPlay || "No rules provided.",
      lesson: stations.station_4.lesson || "No lesson details provided."
    },
    {
      name: `Big Game: ${bigGameName} (Led by ${getLeaderNamesForBigGame()})`,
      howToPlay: configData.bigGameHowToPlay || "No rules provided.",
      lesson: configData.bigGameLesson || "No lesson details provided."
    },
    {
      name: `Reflection: ${reflectionName}`,
      howToPlay: configData.reflectionHowToPlay || "No rules provided.",
      lesson: configData.reflectionLesson || "No lesson details provided."
    }
  ];

  const serviceBrief = configData.description || "";
  const serviceDataDocRef = doc(db, `vbt_events/${targetEventCode}/service_data/main`);
  await setDoc(serviceDataDocRef, {
    serviceBrief,
    groups,
    games,
    updatedAt: new Date().toISOString()
  });
}

/**
 * Updates the schedule data in Firestore for a specific event.
 * @param {string} eventCode
 * @param {object} updates - Object containing state updates.
 */
export async function updateScheduleData(eventCode, updates) {
  const docRef = doc(db, eventSchedulePath(eventCode));
  try {
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    console.error("Error updating schedule data:", error);
    throw error;
  }
}

/**
 * Dynamically updates matchup scheduled times in Firestore based on new event configurations.
 */
export async function updateScheduleMatchupTimes(targetEventCode, startTimeStr, roundDur, breakDur) {
  const scheduleDocRef = doc(db, eventSchedulePath(targetEventCode));
  const scheduleSnap = await getDoc(scheduleDocRef);
  if (!scheduleSnap.exists()) return;

  const scheduleData = scheduleSnap.data();
  const matchups = scheduleData.matchups || [];

  const [startHours, startMins] = startTimeStr.split(':').map(Number);
  const getShiftedTime = (minsOffset) => {
    const d = new Date();
    d.setHours(startHours, startMins + minsOffset, 0, 0);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    const strHours = hours < 10 ? '0' + hours : hours;
    return `${strHours}:${strMinutes} ${ampm}`;
  };

  const roundTimes = {
    1: getShiftedTime(0),
    2: getShiftedTime(1 * (roundDur + breakDur)),
    3: getShiftedTime(2 * (roundDur + breakDur)),
    4: getShiftedTime(3 * (roundDur + breakDur))
  };
  const bigGameTime = getShiftedTime(4 * roundDur + 3 * breakDur);
  const reflectionTime = getShiftedTime(4 * roundDur + 3 * breakDur + 35);

  const updatedMatchups = matchups.map(m => {
    let newTime = m.time;
    if (m.block === 1) {
      newTime = roundTimes[m.round] || m.time;
    } else if (m.block === 2) {
      newTime = bigGameTime;
    } else if (m.block === 3) {
      newTime = reflectionTime;
    }
    return {
      ...m,
      time: newTime
    };
  });

  await setDoc(scheduleDocRef, { ...scheduleData, matchups: updatedMatchups }, { merge: true });
}

// ===============================================================
// SERVICE REQUESTS FUNCTIONS
// ===============================================================

/**
 * Submits a new VBT service request.
 * Saves to Firestore collection: vbt_events/service_requests/requests
 */
export async function submitServiceRequest(requestData) {
  try {
    const colRef = collection(db, 'vbt_events/service_requests/requests');
    const docRef = await addDoc(colRef, {
      ...requestData,
      status: 'pending', // 'pending' | 'approved' | 'rejected'
      createdAt: serverTimestamp()
    });
    console.log("[Firebase] Service request submitted with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error submitting service request:", error);
    throw error;
  }
}

/**
 * Subscribes to all VBT service requests.
 * Reads from Firestore collection: vbt_events/service_requests/requests
 */
export function subscribeToServiceRequests(callback) {
  const colRef = collection(db, 'vbt_events/service_requests/requests');
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const requests = [];
    snapshot.forEach((doc) => {
      requests.push({ id: doc.id, ...doc.data() });
    });
    callback(requests);
  }, (error) => {
    console.error("Error subscribing to service requests:", error);
  });
}

/**
 * Updates the status of a service request.
 */
export async function updateServiceRequestStatus(requestId, status) {
  try {
    const docRef = doc(db, 'vbt_events/service_requests/requests', requestId);
    await updateDoc(docRef, { status });
    console.log(`[Firebase] Service request ${requestId} status updated to ${status}`);
  } catch (error) {
    console.error("Error updating service request status:", error);
    throw error;
  }
}

/**
 * Deletes a service request.
 */
export async function deleteServiceRequest(requestId) {
  try {
    const docRef = doc(db, 'vbt_events/service_requests/requests', requestId);
    await deleteDoc(docRef);
    console.log(`[Firebase] Service request ${requestId} deleted`);
  } catch (error) {
    console.error("Error deleting service request:", error);
    throw error;
  }
}



