import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  enableMultiTabIndexedDbPersistence,
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
    const isService = config.eventType === 'service';
    await setDoc(doc(db, eventScoresPath(eventCode)), {
      blockScores: {},
      teamDeductions: {},
      tokens: isService 
        ? { red: 0, white: 0, black: 0, blue: 0 } 
        : { shakes: 0, fries: 0 },
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

// ─────────────────────────────────────────────
// SERVANTS DIRECTORY (Global Directory)
// ─────────────────────────────────────────────

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

  const roundTimes = {
    1: "03:15 PM",
    2: "03:35 PM",
    3: "03:55 PM",
    4: "04:15 PM"
  };

  // Generate Rotational Matchups (4 Rounds) for each day
  const numLocations = Math.max(4, P);
  const daysCount = configData.daysCount || 1;

  for (let d = 1; d <= daysCount; d++) {
    for (let r = 1; r <= 4; r++) {
      for (let p = 0; p < P; p++) {
        const teamA = teamListForPairs[2 * p];
        const teamB = teamListForPairs[2 * p + 1];

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
          shakes: teamA,
          fries: teamB,
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
      time: "04:35 PM",
      shakes: "All Teams",
      fries: "Referees",
      location: bigGameLoc
    });

    // Add Reflection (Block 3)
    matchups.push({
      day: d,
      block: 3,
      round: 1,
      game: reflectionName,
      time: "05:10 PM",
      shakes: "All Teams",
      fries: "Bible Discussion",
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

