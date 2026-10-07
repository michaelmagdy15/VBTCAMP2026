import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export const SERVICE_TYPES = {
  WEEKLY_SERVICE: 'weekly_service',
  SERVANT_MEETING: 'servant_meeting',
  SPORTS_PRACTICE: 'sports_practice',
  TOURNAMENT: 'tournament',
  OUTREACH: 'outreach',
  SPECIAL_EVENT: 'special_event',
};

export const SERVICE_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/**
 * Format path helper
 */
export function serviceDocPath(communityId, serviceId) {
  return `vbt_communities/${communityId}/services/${serviceId}`;
}

export function servicesCollectionPath(communityId) {
  return `vbt_communities/${communityId}/services`;
}

/**
 * Format human-readable time range (e.g. "6:00 PM - 9:30 PM")
 * @param {string} startTime - "18:00"
 * @param {string} endTime - "21:30"
 * @returns {string}
 */
export function formatTimeRange(startTime, endTime) {
  if (!startTime) return '';
  const parseHour = (t) => {
    if (!t) return '';
    const parts = t.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const startFormatted = parseHour(startTime);
  if (!endTime) return startFormatted;
  return `${startFormatted} - ${parseHour(endTime)}`;
}

/**
 * Retrieve upcoming scheduled services and meetings
 * @param {string} communityId
 * @param {number} [maxCount=10]
 * @returns {Promise<Array>}
 */
export async function getUpcomingServices(communityId = DEFAULT_COMMUNITY_ID, maxCount = 10) {
  try {
    const colRef = collection(db, servicesCollectionPath(communityId));
    const today = new Date().toISOString().slice(0, 10);
    const q = query(
      colRef,
      where('date', '>=', today),
      orderBy('date', 'asc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    return list;
  } catch (error) {
    console.error(`[ServiceMeeting] Failed to get upcoming services:`, error);
    return [];
  }
}

/**
 * Retrieve a specific service by ID
 * @param {string} communityId
 * @param {string} serviceId
 * @returns {Promise<Object|null>}
 */
export async function getServiceById(communityId = DEFAULT_COMMUNITY_ID, serviceId) {
  if (!serviceId) return null;
  try {
    const docRef = doc(db, serviceDocPath(communityId, serviceId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[ServiceMeeting] Failed to get service ${serviceId}:`, error);
    return null;
  }
}

/**
 * Create a new service or meeting
 * @param {string} communityId
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
export async function createService(communityId = DEFAULT_COMMUNITY_ID, serviceData) {
  const serviceId = serviceData.id || `svc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, serviceDocPath(communityId, serviceId));

  const newDoc = {
    id: serviceId,
    communityId,
    title: serviceData.title || 'Weekly Gathering',
    serviceType: serviceData.serviceType || SERVICE_TYPES.WEEKLY_SERVICE,
    description: serviceData.description || '',
    date: serviceData.date || new Date().toISOString().slice(0, 10),
    startTime: serviceData.startTime || '18:00',
    endTime: serviceData.endTime || '21:00',
    location: serviceData.location || {
      name: 'Main Church Gymnasium',
      address: 'Sports Complex',
    },
    linkedEventCode: serviceData.linkedEventCode || null,
    leadServantName: serviceData.leadServantName || 'Leadership Team',
    leadServantId: serviceData.leadServantId || null,
    recurrence: serviceData.recurrence || {
      isRecurring: false,
      frequency: 'weekly',
      dayOfWeek: 5, // Friday
    },
    assignedGroups: serviceData.assignedGroups || [],
    capacity: serviceData.capacity || null,
    status: serviceData.status || SERVICE_STATUS.SCHEDULED,
    qrSessionActive: false,
    qrSessionId: null,
    attendeesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newDoc);
  return newDoc;
}

/**
 * Update an existing service or meeting
 * @param {string} communityId
 * @param {string} serviceId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateService(communityId = DEFAULT_COMMUNITY_ID, serviceId, updates) {
  if (!serviceId) throw new Error('serviceId is required');
  const docRef = doc(db, serviceDocPath(communityId, serviceId));

  const filteredUpdates = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, filteredUpdates, { merge: true });
  return filteredUpdates;
}

/**
 * Delete a service or meeting
 * @param {string} communityId
 * @param {string} serviceId
 */
export async function deleteService(communityId = DEFAULT_COMMUNITY_ID, serviceId) {
  if (!serviceId) throw new Error('serviceId is required');
  const docRef = doc(db, serviceDocPath(communityId, serviceId));
  await deleteDoc(docRef);
  return true;
}

/**
 * Real-time subscription to upcoming services and meetings
 * @param {string} communityId
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToUpcomingServices(communityId = DEFAULT_COMMUNITY_ID, callback) {
  const colRef = collection(db, servicesCollectionPath(communityId));
  const today = new Date().toISOString().slice(0, 10);

  // Query upcoming and recent services (from today onwards, sorted by date asc)
  const q = query(
    colRef,
    where('date', '>=', today),
    orderBy('date', 'asc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      callback(list);
    },
    (err) => {
      console.error(`[ServiceMeeting] Subscription error:`, err);
      // Fallback: query without where clause if index is building
      const fallbackQuery = query(colRef, limit(20));
      onSnapshot(fallbackQuery, (fbSnap) => {
        const list = [];
        fbSnap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        callback(list);
      });
    }
  );
}

/**
 * Format local date as YYYY-MM-DD avoiding UTC conversion offsets
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function formatLocalDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to compute next occurrence date for recurring services
 * @param {number} targetDayOfWeek - 0 (Sun) to 6 (Sat)
 * @param {Date} [from=new Date()]
 * @returns {string} ISO Date string YYYY-MM-DD
 */
export function getNextDayOfWeekDate(targetDayOfWeek, from = new Date()) {
  const result = new Date(from);
  const currentDay = result.getDay();
  let distance = targetDayOfWeek - currentDay;
  if (distance < 0) {
    distance += 7;
  }
  result.setDate(result.getDate() + distance);
  return formatLocalDate(result);
}
