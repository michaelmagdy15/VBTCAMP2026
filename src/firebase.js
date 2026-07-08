import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
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
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';

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
// Initialize with multi-tab offline persistence (modern v10+ syntax)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, 'db-vbt');

export const auth = getAuth(app);

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
    let docSnap;

    if (!navigator.onLine) {
      try {
        docSnap = await getDoc(docRef, { source: 'cache' });
      } catch(e) {}
    } else {
      try {
        docSnap = await Promise.race([
          getDoc(docRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
      } catch (e) {
        console.warn("Network fetch timed out or failed. Falling back to cache for registry.");
        docSnap = await getDoc(docRef, { source: 'cache' }).catch(() => null);
      }
    }

    if (docSnap && docSnap.exists()) {
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
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'vbt_secret_camp_2026_key'
      },
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
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'vbt_secret_camp_2026_key'
      },
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

  const getCustomColorName = (colorKey) => {
    const customColors = configData.teamNames || { red: 'Red', white: 'White', black: 'Black', blue: 'Blue' };
    const key = colorKey.toLowerCase();
    const custom = customColors[key];
    if (custom && custom.trim()) return custom.trim();
    return colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
  };

  const activeSubTeams = []; // e.g. ["Red 1", "Red 2", "White 1", "White 2", ...]
  const teamLeaders = {}; // teamName -> leaderName
  const teams = {};

  // If teams are already pre-divided (e.g. from Day Service Roster Import)
  if (configData.teams && Object.keys(configData.teams).length > 0) {
    Object.entries(configData.teams).forEach(([code, t]) => {
      activeSubTeams.push(t.name);
      teamLeaders[t.name] = t.leaders || "Unassigned";
      teams[t.name] = {
        code: t.code || code,
        name: t.name,
        leaders: t.leaders || "Unassigned",
        side: t.side || "Red",
        kidCount: t.kids ? t.kids.length : (t.kidCount || 0),
        kids: t.kids || []
      };
    });
  } else {
    // Legacy/Fallback servant-based team creation
    const roleMapping = configData.servantAssignments || {};
    Object.entries(roleMapping).forEach(([servantId, roleCode]) => {
      if (!activeServantsList.includes(servantId)) return;

      if (roleCode.startsWith('team_')) {
        const servant = globalServants.find(s => s.id === servantId);
        if (servant) {
          const parts = roleCode.split('_'); // ["team", "white", "1"]
          const colorKey = parts[1]; // "white"
          const colorName = getCustomColorName(colorKey);
          const idx = parts[2]; // "1"
          const teamName = colorName + ' ' + idx; // "White 1"
          activeSubTeams.push(teamName);
          teamLeaders[teamName] = servant.name;
        }
      }
    });

    if (activeSubTeams.length === 0) {
      // Create at least 4 default teams if none assigned to prevent crash
      const defaultColors = ['Red', 'White', 'Black', 'Blue'];
      defaultColors.forEach((color) => {
        const teamName = `${color} 1`;
        activeSubTeams.push(teamName);
        teamLeaders[teamName] = "Unassigned";
      });
    }

    // Sort sub-teams predictably
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
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return aIdx - bIdx;
    });

    const T = activeSubTeams.length;
    const baseKids = Math.floor((configData.kidCount || 100) / T);
    const remainder = (configData.kidCount || 100) % T;

    activeSubTeams.forEach((teamName, idx) => {
      const colorName = teamName.split(' ').slice(0, -1).join(' ');
      let side = 'Red';
      if (colorName === getCustomColorName('white')) side = 'White';
      else if (colorName === getCustomColorName('black')) side = 'Black';
      else if (colorName === getCustomColorName('blue')) side = 'Blue';

      teams[teamName] = {
        code: 'team_' + colorName.toLowerCase() + '_' + teamName.split(' ').pop(),
        name: teamName,
        leaders: teamLeaders[teamName] || "Unassigned",
        side: side,
        kidCount: baseKids + (idx < remainder ? 1 : 0),
        kids: []
      };
    });
  }

  const getStationInfo = (stKey, defaultName) => {
    const st = configData.stations?.[stKey];
    return {
      name: st?.name || defaultName,
      location: st?.location || ('Station ' + stKey.replace('station_', '')),
      howToPlay: st?.howToPlay || '',
      lesson: st?.lesson || ''
    };
  };

  const stationData = {
    station_1: getStationInfo('station_1', 'Blind Builder'),
    station_2: getStationInfo('station_2', 'Skee Ball'),
    station_3: getStationInfo('station_3', 'Minefield'),
    station_4: getStationInfo('station_4', 'Helium Stick & Human Chairs'),
    station_5: getStationInfo('station_5', 'Whiffle Ball'),
    station_6: getStationInfo('station_6', 'Blind Shape')
  };

  const gamesList = [
    stationData.station_1.name,
    stationData.station_2.name,
    stationData.station_3.name,
    stationData.station_4.name,
    stationData.station_5.name,
    stationData.station_6.name
  ];
  const locationsList = [
    stationData.station_1.location,
    stationData.station_2.location,
    stationData.station_3.location,
    stationData.station_4.location,
    stationData.station_5.location,
    stationData.station_6.location
  ];

  const startTimeStr = configData.startTime || '20:00';
  const roundDur = Number(configData.roundDurationMinutes) || 10;
  const breakDur = configData.breakMinutes !== undefined ? Number(configData.breakMinutes) : 5;
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
    return strHours + ':' + strMinutes + ' ' + ampm;
  };

  const matchups = [];
  let idx = 0;

  // Split teams into two groups for Versus pairings
  const group1 = activeSubTeams.filter(t => {
    const side = teams[t]?.side;
    return side === 'Red' || side === 'Black';
  });
  const group2 = activeSubTeams.filter(t => {
    const side = teams[t]?.side;
    return side === 'White' || side === 'Blue';
  });
  
  // Fallbacks if groups are uneven or empty
  let g1 = [...group1];
  let g2 = [...group2];
  if (g1.length === 0 || g2.length === 0) {
    const half = Math.ceil(activeSubTeams.length / 2);
    g1 = activeSubTeams.slice(0, half);
    g2 = activeSubTeams.slice(half);
  }

  const daysToGenerate = Number(configData.daysCount) || 1;

  if (configData.eventType === 'camp' && configData.blocks && configData.blocks.length > 0) {
    // CAMP MODE (Multi-day chronological blocks builder)
    for (let day = 1; day <= daysToGenerate; day++) {
      configData.blocks.forEach((block, bIdx) => {
        const blockName = block.name || `Block ${bIdx + 1}`;
        const blockTime = block.startTime || getShiftedTime(bIdx * (roundDur + breakDur));
        const rotationLogic = block.rotationLogic || 'Rotation Double (Versus)';

        if (block.type === 'Games') {
          if (rotationLogic === 'Rotation Double (Versus)') {
            // Rotation Double (Versus): 2 teams face off. One moves CW, other moves CCW.
            for (let station = 1; station <= 6; station++) {
              const idx1 = (station - 1 + bIdx) % g1.length;
              const idx2 = (station - 1 - bIdx + g2.length * 10) % g2.length;

              matchups.push({
                id: `d${day}_b${bIdx + 1}_s${station}_${Date.now()}_${idx++}`,
                day,
                block: bIdx + 1,
                round: 1,
                time: blockTime,
                location: locationsList[station - 1] || `Station ${station}`,
                game: gamesList[station - 1],
                teamA: g1[idx1] || '',
                teamB: g2[idx2] || '',
                blockType: 'Games',
                rotationLogic
              });
            }
          } else {
            // Rotation Single: 1 team plays at a station, then rotates clockwise.
            for (let station = 1; station <= 6; station++) {
              const idxSingle = (station - 1 + bIdx) % activeSubTeams.length;
              matchups.push({
                id: `d${day}_b${bIdx + 1}_s${station}_${Date.now()}_${idx++}`,
                day,
                block: bIdx + 1,
                round: 1,
                time: blockTime,
                location: locationsList[station - 1] || `Station ${station}`,
                game: gamesList[station - 1],
                teamA: activeSubTeams[idxSingle] || '',
                teamB: '',
                blockType: 'Games',
                rotationLogic
              });
            }
          }
        } else if (block.type === 'Big Game') {
          // Big Game: All teams play together
          matchups.push({
            id: `d${day}_b${bIdx + 1}_bg_${Date.now()}_${idx++}`,
            day,
            block: bIdx + 1,
            round: 1,
            time: blockTime,
            location: stationData.big_game?.location || 'Football Field',
            game: stationData.big_game?.name || 'Loyalty (Big Game)',
            teamA: 'All Teams',
            teamB: 'Referees',
            blockType: 'Big Game',
            rotationLogic: 'Big Game'
          });
        } else {
          // Talk, Reflection, Giveaway: Placeholder block for schedule display
          matchups.push({
            id: `d${day}_b${bIdx + 1}_ph_${Date.now()}_${idx++}`,
            day,
            block: bIdx + 1,
            round: 1,
            time: blockTime,
            location: block.type === 'Reflection' ? (stationData.reflection?.location || 'Reflection Area') : 'Main Area',
            game: blockName + ` (${block.type})`,
            teamA: 'All Teams',
            teamB: '',
            blockType: block.type,
            rotationLogic: 'Big Game'
          });
        }
      });
    }
  } else {
    // DAY SERVICE MODE (Standard rotational matchups)
    const numBlocks = Math.max(6, activeSubTeams.length);
    const times = [];
    for (let block = 0; block < numBlocks; block++) {
      times.push(getShiftedTime(block * (roundDur + breakDur)));
    }

    for (let day = 1; day <= daysToGenerate; day++) {
      for (let block = 1; block <= numBlocks; block++) {
        for (let station = 1; station <= 6; station++) {
          // Versus default pairing: Red/Black CW vs White/Blue CCW
          const idx1 = (station - 1 + (block - 1)) % g1.length;
          const idx2 = (station - 1 - (block - 1) + g2.length * 10) % g2.length;

          matchups.push({
            id: `d${day}_b${block}_s${station}_${Date.now()}_${idx++}`,
            day,
            block: block,
            round: 1,
            time: times[block - 1],
            location: locationsList[station - 1] || `Station ${station}`,
            game: gamesList[station - 1],
            teamA: g1[idx1] || '',
            teamB: g2[idx2] || '',
            blockType: 'Games',
            rotationLogic: 'Rotation Double (Versus)'
          });
        }
      }
    }
  }

  const gamePoints = {};
  gamesList.forEach(gName => {
    gamePoints[gName] = 15;
  });

  // Construct schedule data payload
  const scheduleData = {
    teams,
    matchups,
    gamePoints
  };

  // Write to Firestore docs
  const scheduleDocRef = doc(db, eventSchedulePath(targetEventCode));
  await setDoc(scheduleDocRef, scheduleData);

  const configDocRef = doc(db, eventConfigPath(targetEventCode));
  await setDoc(configDocRef, configData);

  // Form group breakdowns and games list for service_data
  const groups = activeSubTeams.map((teamName) => {
    return {
      leaderName: teamName + ' (' + (teamLeaders[teamName] || 'Unassigned') + ')',
      kidCount: teams[teamName].kidCount
    };
  });

  const games = [
    {
      name: stationData.station_1.name + ' (Station 1 - ' + getLeaderNameForRole('station_1') + ')',
      howToPlay: stationData.station_1.howToPlay || "No rules provided.",
      lesson: stationData.station_1.lesson || "No lesson details provided."
    },
    {
      name: stationData.station_2.name + ' (Station 2 - ' + getLeaderNameForRole('station_2') + ')',
      howToPlay: stationData.station_2.howToPlay || "No rules provided.",
      lesson: stationData.station_2.lesson || "No lesson details provided."
    },
    {
      name: stationData.station_3.name + ' (Station 3 - ' + getLeaderNameForRole('station_3') + ')',
      howToPlay: stationData.station_3.howToPlay || "No rules provided.",
      lesson: stationData.station_3.lesson || "No lesson details provided."
    },
    {
      name: stationData.station_4.name + ' (Station 4 - ' + getLeaderNameForRole('station_4') + ')',
      howToPlay: stationData.station_4.howToPlay || "No rules provided.",
      lesson: stationData.station_4.lesson || "No lesson details provided."
    },
    {
      name: stationData.station_5.name + ' (Station 5 - ' + getLeaderNameForRole('station_5') + ')',
      howToPlay: stationData.station_5.howToPlay || "No rules provided.",
      lesson: stationData.station_5.lesson || "No lesson details provided."
    },
    {
      name: stationData.station_6.name + ' (Station 6 - ' + getLeaderNameForRole('station_6') + ')',
      howToPlay: stationData.station_6.howToPlay || "No rules provided.",
      lesson: stationData.station_6.lesson || "No lesson details provided."
    }
  ];

  const serviceBrief = configData.description || "";
  const serviceDataDocRef = doc(db, 'vbt_events/' + targetEventCode + '/service_data/main');
  await setDoc(serviceDataDocRef, {
    serviceBrief,
    groups,
    games,
    updatedAt: new Date().toISOString()
  });
}

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


// ─────────────────────────────────────────────────────────────────
// GAMES LIBRARY  (vbt_games — global cross-event game database)
// ─────────────────────────────────────────────────────────────────

/**
 * Real-time subscription to the global games library, ordered by timesUsed desc.
 */
export function subscribeToGames(callback) {
  const colRef = collection(db, 'vbt_games');
  const q = query(colRef, orderBy('timesUsed', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const games = [];
    snapshot.forEach((d) => games.push({ id: d.id, ...d.data() }));
    callback(games);
  }, (err) => {
    console.error('[Firebase] subscribeToGames error:', err);
    callback([]);
  });
}

/**
 * Create or update a game in the global library.
 * Automatically increments timesUsed and appends to eventHistory.
 * @param {string} gameId  - slugified game name
 * @param {object} data    - { name, type, location, howToPlay, lesson, tags, eventCode, eventName }
 */
export async function upsertGame(gameId, data) {
  if (!gameId) return;
  const docRef = doc(db, 'vbt_games', gameId);
  try {
    const snap = await getDoc(docRef);
    const now = new Date().toISOString();
    if (snap.exists()) {
      const existing = snap.data();
      const history = existing.eventHistory || [];
      if (data.eventCode && !history.find(h => h.eventCode === data.eventCode)) {
        history.push({ eventCode: data.eventCode, eventName: data.eventName || data.eventCode, date: now });
        if (history.length > 20) history.splice(0, history.length - 20);
      }
      await setDoc(docRef, {
        ...existing,
        name: data.name || existing.name,
        type: data.type || existing.type,
        location: data.location || existing.location,
        howToPlay: data.howToPlay || existing.howToPlay,
        lesson: data.lesson || existing.lesson,
        tags: data.tags || existing.tags || [],
        timesUsed: (existing.timesUsed || 0) + 1,
        lastUsedAt: now,
        lastUsedEvent: data.eventCode || existing.lastUsedEvent,
        eventHistory: history,
      }, { merge: true });
    } else {
      await setDoc(docRef, {
        id: gameId,
        name: data.name,
        type: data.type || 'station',
        location: data.location || '',
        howToPlay: data.howToPlay || '',
        lesson: data.lesson || '',
        tags: data.tags || [],
        timesUsed: 1,
        lastUsedAt: now,
        lastUsedEvent: data.eventCode || '',
        eventHistory: data.eventCode ? [{ eventCode: data.eventCode, eventName: data.eventName || data.eventCode, date: now }] : [],
        createdAt: now,
      });
    }
  } catch (err) {
    console.error('[Firebase] upsertGame error:', err);
    throw err;
  }
}

/**
 * Delete a game from the library.
 */
export async function deleteGame(gameId) {
  try {
    await deleteDoc(doc(db, 'vbt_games', gameId));
  } catch (err) {
    console.error('[Firebase] deleteGame error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────
// ROTATION TIMER  (vbt_timer/{eventCode} — shared countdown)
// ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to the shared rotation timer for an event.
 * Timer doc shape: { durationMin, startedAt, isPaused, pausedAt, totalPausedMs }
 */
export function subscribeToTimer(eventCode, callback) {
  if (!eventCode) return () => {};
  const docRef = doc(db, 'vbt_timer', eventCode);
  return onSnapshot(docRef, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  }, (err) => {
    console.error('[Firebase] subscribeToTimer error:', err);
    callback(null);
  });
}

/**
 * Write/update the shared rotation timer state.
 */
export async function setTimerState(eventCode, data) {
  if (!eventCode) return;
  try {
    await setDoc(doc(db, 'vbt_timer', eventCode), data, { merge: true });
  } catch (err) {
    console.error('[Firebase] setTimerState error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────
// EVENT DEBRIEFS  (vbt_debriefs/{eventCode})
// ─────────────────────────────────────────────────────────────────

/**
 * Save (or overwrite) the debrief report for an event.
 */
export async function saveDebrief(eventCode, data) {
  try {
    await setDoc(doc(db, 'vbt_debriefs', eventCode), {
      ...data,
      savedAt: new Date().toISOString(),
      eventCode,
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] saveDebrief error:', err);
    throw err;
  }
}

/**
 * Fetch the debrief report for an event.
 */
export async function getDebrief(eventCode) {
  try {
    const snap = await getDoc(doc(db, 'vbt_debriefs', eventCode));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('[Firebase] getDebrief error:', err);
    return null;
  }
}

/**
 * Get all debriefs (for analytics).
 */
export async function getAllDebriefs() {
  try {
    const snap = await getDocs(collection(db, 'vbt_debriefs'));
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.error('[Firebase] getAllDebriefs error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// SERVANT FEEDBACK  (vbt_feedback/{eventCode}/responses)
// ─────────────────────────────────────────────────────────────────

/**
 * Submit anonymous feedback for an event.
 */
export async function submitFeedback(eventCode, data) {
  try {
    const colRef = collection(db, 'vbt_feedback', eventCode, 'responses');
    await addDoc(colRef, {
      ...data,
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Firebase] submitFeedback error:', err);
    throw err;
  }
}

/**
 * Get all feedback responses for an event.
 */
export async function getFeedback(eventCode) {
  try {
    const colRef = collection(db, 'vbt_feedback', eventCode, 'responses');
    const q = query(colRef, orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.error('[Firebase] getFeedback error:', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// NOTIFICATION SCHEDULING  (vbt_notifications_scheduled)
// ─────────────────────────────────────────────────────────────────

/**
 * Schedule a push notification.
 */
export async function scheduleNotification(data) {
  try {
    await addDoc(collection(db, 'vbt_notifications_scheduled'), {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Firebase] scheduleNotification error:', err);
    throw err;
  }
}

/**
 * Get all scheduled notifications.
 */
export function subscribeToScheduledNotifications(callback) {
  const q = query(collection(db, 'vbt_notifications_scheduled'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    callback(list);
  }, (err) => {
    console.error('[Firebase] subscribeToScheduledNotifications error:', err);
    callback([]);
  });
}

/**
 * Cancel / delete a scheduled notification.
 */
export async function cancelScheduledNotification(notifId) {
  try {
    await deleteDoc(doc(db, 'vbt_notifications_scheduled', notifId));
  } catch (err) {
    console.error('[Firebase] cancelScheduledNotification error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────
// SERVANT — Auto-upsert on login + attendance history
// ─────────────────────────────────────────────────────────────────

/**
 * Called when a servant successfully logs into any event.
 * Creates the servant in vbt_servants if they don't exist,
 * updates lastSeen, and appends the event to their servicesAttended array.
 */
export async function upsertServantOnLogin(phoneNumber, firstName, eventCode, additionalData = {}) {
  if (!phoneNumber) return null;
  const servantId = phoneNumber.trim();
  try {
    const docRef = doc(db, 'vbt_servants', servantId);
    const snap = await getDoc(docRef);
    const now = new Date().toISOString();

    if (snap.exists()) {
      const existing = snap.data();
      const attended = existing.servicesAttended || [];
      // Only add this eventCode once per session
      if (eventCode && !attended.find(e => e.code === eventCode && e.date?.startsWith(now.slice(0, 10)))) {
        attended.push({ code: eventCode, date: now });
        if (attended.length > 50) attended.splice(0, attended.length - 50);
      }
      const updatedData = {
        ...existing,
        firstName: firstName || existing.firstName || existing.name || '',
        name: firstName || existing.name || '', // older UI compatibility
        lastSeen: now,
        servicesAttended: attended,
        ...additionalData
      };
      await setDoc(docRef, updatedData, { merge: true });
      return { id: servantId, ...updatedData };
    } else {
      // New servant / lead — auto-register as unregistered/fresh lead
      const newServant = {
        id: servantId,
        firstName: firstName || '',
        lastName: additionalData.lastName || '',
        name: firstName || '', // fallback for older components
        phoneNumber: servantId,
        role: 'unregistered', // Auto register as "Fresh Lead" or "Unregistered"
        lastSeen: now,
        servicesAttended: eventCode ? [{ code: eventCode, date: now }] : [],
        createdAt: now,
        assignedGames: [],
        assignedTeams: [],
        ...additionalData
      };
      await setDoc(docRef, newServant);
      return newServant;
    }
  } catch (err) {
    console.error('[Firebase] upsertServantOnLogin error:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL INVENTORY DATABASE (vbt_inventory)
// ─────────────────────────────────────────────────────────────────

/**
 * Real-time subscription to the global materials inventory stock.
 */
export function subscribeToInventory(callback) {
  const colRef = collection(db, 'vbt_inventory');
  return onSnapshot(colRef, (snapshot) => {
    const items = [];
    snapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));
    callback(items);
  }, (err) => {
    console.error('[Firebase] subscribeToInventory error:', err);
    callback([]);
  });
}

/**
 * Create or update an item in the global inventory.
 */
export async function upsertInventoryItem(materialId, itemData) {
  if (!materialId) return;
  const docRef = doc(db, 'vbt_inventory', materialId);
  try {
    const now = new Date().toISOString();
    await setDoc(docRef, {
      id: materialId,
      ...itemData,
      updatedAt: now
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] upsertInventoryItem error:', err);
    throw err;
  }
}

/**
 * Delete a material from the global inventory.
 */
export async function deleteInventoryItem(materialId) {
  try {
    await deleteDoc(doc(db, 'vbt_inventory', materialId));
  } catch (err) {
    console.error('[Firebase] deleteInventoryItem error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────
// GLOBAL LOCATIONS DIRECTORY (vbt_locations)
// ─────────────────────────────────────────────────────────────────

/**
 * Real-time subscription to the global physical locations list.
 */
export function subscribeToLocations(callback) {
  const colRef = collection(db, 'vbt_locations');
  return onSnapshot(colRef, (snapshot) => {
    const locations = [];
    snapshot.forEach((d) => locations.push({ id: d.id, ...d.data() }));
    // Sort locations by circuitOrder to ensure rotation mapping order
    locations.sort((a, b) => (a.circuitOrder || 0) - (b.circuitOrder || 0));
    callback(locations);
  }, (err) => {
    console.error('[Firebase] subscribeToLocations error:', err);
    callback([]);
  });
}

/**
 * Create or update a location in the directory.
 */
export async function upsertLocation(locationId, locationData) {
  if (!locationId) return;
  const docRef = doc(db, 'vbt_locations', locationId);
  try {
    await setDoc(docRef, {
      id: locationId,
      ...locationData
    }, { merge: true });
  } catch (err) {
    console.error('[Firebase] upsertLocation error:', err);
    throw err;
  }
}

/**
 * Delete a location from the global directory.
 */
export async function deleteLocation(locationId) {
  try {
    await deleteDoc(doc(db, 'vbt_locations', locationId));
  } catch (err) {
    console.error('[Firebase] deleteLocation error:', err);
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────
// PER-EVENT FINANCES (vbt_events/{eventCode}/finances/main)
// ─────────────────────────────────────────────────────────────────

/**
 * Real-time subscription to finances data for a specific event.
 */
export function subscribeToFinances(eventCode, callback) {
  if (!eventCode) return () => {};
  const docRef = doc(db, 'vbt_events', eventCode, 'finances', 'main');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({ budget: 0, expenses: [] });
    }
  }, (err) => {
    console.error('[Firebase] subscribeToFinances error:', err);
    callback({ budget: 0, expenses: [] });
  });
}

/**
 * Update the budget or expenses list for a specific event.
 */
export async function updateFinances(eventCode, financeData) {
  if (!eventCode) return;
  const docRef = doc(db, 'vbt_events', eventCode, 'finances', 'main');
  try {
    await setDoc(docRef, financeData, { merge: true });
  } catch (err) {
    console.error('[Firebase] updateFinances error:', err);
    throw err;
  }
}


