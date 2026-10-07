import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export { DEFAULT_COMMUNITY_ID };

/**
 * Privacy scopes for prayer requests
 */
export const PRAYER_PRIVACY = {
  PUBLIC: 'PUBLIC',
  COMMUNITY: 'COMMUNITY',
  LEADERS_ONLY: 'LEADERS_ONLY',
  PASTORAL_PRIVATE: 'PASTORAL_PRIVATE',
};

/**
 * Status values for prayer requests
 */
export const PRAYER_STATUS = {
  ACTIVE: 'active',
  ANSWERED: 'answered',
  ARCHIVED: 'archived',
};

/**
 * Roles with general leadership privileges (can see LEADERS_ONLY)
 */
export const LEADERSHIP_ROLES = [
  'admin',
  'pastoral_care_leader',
  'pastoral_care',
  'coordinator',
  'service_leader',
  'team_leader',
  'game_leader',
  'servant',
  'leader',
];

/**
 * Roles with confidential pastoral privileges (can see PASTORAL_PRIVATE)
 */
export const PASTORAL_ROLES = [
  'admin',
  'pastoral_care_leader',
  'pastoral_care',
  'coordinator',
];

/**
 * Path helpers
 */
export function prayerCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  return `vbt_communities/${communityId}/prayer_requests`;
}

export function prayerDocPath(communityId = DEFAULT_COMMUNITY_ID, requestId) {
  return `vbt_communities/${communityId}/prayer_requests/${requestId}`;
}

export function testimonyCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  return `vbt_communities/${communityId}/testimonies`;
}

export function testimonyDocPath(communityId = DEFAULT_COMMUNITY_ID, testimonyId) {
  return `vbt_communities/${communityId}/testimonies/${testimonyId}`;
}

/**
 * Normalize timestamp to milliseconds for reliable sorting across mock and live environments
 * @param {any} ts
 * @returns {number}
 */
export function getTimestampMs(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') {
    return ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1e6 : 0);
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Helper to check if a role qualifies as general leadership
 * @param {string|string[]} role
 * @returns {boolean}
 */
export function isLeaderRole(role) {
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.some((r) => isLeaderRole(r));
  }
  const normalized = String(role).toLowerCase().trim();
  return LEADERSHIP_ROLES.includes(normalized);
}

/**
 * Helper to check if a role qualifies as pastoral leadership or admin
 * @param {string|string[]} role
 * @returns {boolean}
 */
export function isPastoralRole(role) {
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.some((r) => isPastoralRole(r));
  }
  const normalized = String(role).toLowerCase().trim();
  return PASTORAL_ROLES.includes(normalized);
}

/**
 * Determine if a user can view a specific prayer request based on privacy scope and member identity
 * @param {Object} prayer
 * @param {string|string[]} [memberRole]
 * @param {string} [memberUid]
 * @returns {boolean}
 */
export function canViewPrayerRequest(prayer, memberRole, memberUid) {
  if (!prayer) return false;

  // The author can ALWAYS view their own prayer request regardless of privacy
  if (memberUid && prayer.authorId === memberUid) {
    return true;
  }

  const privacy = prayer.privacy || PRAYER_PRIVACY.PUBLIC;

  // PUBLIC is accessible to anyone (even unauthenticated)
  if (privacy === PRAYER_PRIVACY.PUBLIC) {
    return true;
  }

  // Non-public requires at least some authenticated context
  if (!memberUid && !memberRole) {
    return false;
  }

  // COMMUNITY is accessible to any registered community member
  if (privacy === PRAYER_PRIVACY.COMMUNITY) {
    return true;
  }

  // LEADERS_ONLY is accessible to community servants, leaders, pastoral, and admins
  if (privacy === PRAYER_PRIVACY.LEADERS_ONLY) {
    return isLeaderRole(memberRole);
  }

  // PASTORAL_PRIVATE is strictly confidential to pastoral care leaders and admins
  if (privacy === PRAYER_PRIVACY.PASTORAL_PRIVATE) {
    return isPastoralRole(memberRole);
  }

  return false;
}

/**
 * Formats a display-safe author name taking anonymity into account
 * @param {Object} prayer
 * @param {string|string[]} [memberRole]
 * @param {string} [memberUid]
 * @returns {string}
 */
export function getDisplayAuthorName(prayer, memberRole, memberUid) {
  if (!prayer) return '';
  if (!prayer.authorAnonymous) {
    return prayer.authorName || 'Community Member';
  }
  if (memberUid && prayer.authorId === memberUid) {
    return `${prayer.authorName} (You - Posted Anonymously)`;
  }
  if (isPastoralRole(memberRole)) {
    return `${prayer.authorName} (Anonymous to Community)`;
  }
  return 'Anonymous Member';
}

/**
 * Create a new prayer request
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createPrayerRequest(communityId = DEFAULT_COMMUNITY_ID, data = {}) {
  let targetCommunityId = communityId;
  let prayerData = data;

  // Defensive fallback if called as createPrayerRequest(data)
  if (typeof communityId === 'object' && communityId !== null && Object.keys(data).length === 0) {
    prayerData = communityId;
    targetCommunityId = prayerData.communityId || DEFAULT_COMMUNITY_ID;
  }

  if (!prayerData || !prayerData.title || !prayerData.title.trim()) {
    throw new Error('Prayer request title is required');
  }

  const requestId = prayerData.id || `prayer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, prayerDocPath(targetCommunityId, requestId));

  const newDoc = {
    id: requestId,
    communityId: targetCommunityId,
    authorId: prayerData.authorId || 'anonymous',
    authorName: prayerData.authorName || 'Anonymous Member',
    authorAnonymous: Boolean(prayerData.authorAnonymous),
    title: prayerData.title.trim(),
    content: prayerData.content ? prayerData.content.trim() : '',
    privacy: prayerData.privacy || PRAYER_PRIVACY.COMMUNITY,
    prayerCount: typeof prayerData.prayerCount === 'number' ? prayerData.prayerCount : 0,
    prayedByUids: Array.isArray(prayerData.prayedByUids) ? prayerData.prayedByUids : [],
    status: prayerData.status || PRAYER_STATUS.ACTIVE,
    answerNote: prayerData.answerNote || null,
    createdAt: prayerData.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newDoc);
  return newDoc;
}

/**
 * Record prayer support for a request (increments prayerCount, adds memberId to prayedByUids)
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} requestId
 * @param {string} memberId
 * @returns {Promise<Object>}
 */
export async function recordPrayerSupport(communityId = DEFAULT_COMMUNITY_ID, requestId, memberId) {
  if (!requestId) throw new Error('requestId is required');
  if (!memberId) throw new Error('memberId is required');

  const docRef = doc(db, prayerDocPath(communityId, requestId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Prayer request ${requestId} not found`);
  }

  const existingData = snap.data() || {};
  const currentPrayedBy = Array.isArray(existingData.prayedByUids) ? [...existingData.prayedByUids] : [];

  if (!currentPrayedBy.includes(memberId)) {
    currentPrayedBy.push(memberId);
  }

  const currentCount = typeof existingData.prayerCount === 'number' ? existingData.prayerCount : 0;
  const newPrayerCount = currentCount + 1;

  const updates = {
    prayerCount: newPrayerCount,
    prayedByUids: currentPrayedBy,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updates);
  return { id: requestId, ...existingData, ...updates };
}

/**
 * Mark a prayer request as answered with an optional testimony/answer note
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} requestId
 * @param {string} [answerNote='']
 * @returns {Promise<Object>}
 */
export async function markPrayerAnswered(communityId = DEFAULT_COMMUNITY_ID, requestId, answerNote = '') {
  if (!requestId) throw new Error('requestId is required');

  const docRef = doc(db, prayerDocPath(communityId, requestId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Prayer request ${requestId} not found`);
  }

  const updates = {
    status: PRAYER_STATUS.ANSWERED,
    answerNote: answerNote ? answerNote.trim() : '',
    answeredAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updates);
  return { id: requestId, ...snap.data(), ...updates };
}

/**
 * Retrieve prayer requests filtered by visibility based on memberRole and memberUid
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string|string[]} [memberRole]
 * @param {string} [memberUid]
 * @returns {Promise<Array>}
 */
export async function getPrayerRequests(communityId = DEFAULT_COMMUNITY_ID, memberRole, memberUid) {
  try {
    const colRef = collection(db, prayerCollectionPath(communityId));
    const snap = await getDocs(colRef);
    const list = [];

    snap.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (canViewPrayerRequest(data, memberRole, memberUid)) {
        list.push({
          ...data,
          displayAuthorName: getDisplayAuthorName(data, memberRole, memberUid),
        });
      }
    });

    list.sort((a, b) => {
      const timeA = getTimestampMs(a.createdAt);
      const timeB = getTimestampMs(b.createdAt);
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return list;
  } catch (error) {
    console.error(`[PrayerTestimonyService] Failed to get prayer requests for ${communityId}:`, error);
    return [];
  }
}

/**
 * Real-time subscription to prayer requests with visibility filtering
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string|string[]} [memberRole]
 * @param {string} [memberUid]
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToPrayerRequests(communityId = DEFAULT_COMMUNITY_ID, memberRole, memberUid, callback) {
  const colRef = collection(db, prayerCollectionPath(communityId));

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (canViewPrayerRequest(data, memberRole, memberUid)) {
          list.push({
            ...data,
            displayAuthorName: getDisplayAuthorName(data, memberRole, memberUid),
          });
        }
      });

      list.sort((a, b) => {
        const timeA = getTimestampMs(a.createdAt);
        const timeB = getTimestampMs(b.createdAt);
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });

      callback(list);
    },
    (error) => {
      console.error(`[PrayerTestimonyService] Error in subscribeToPrayerRequests for ${communityId}:`, error);
      callback([]);
    }
  );
}

/**
 * Retrieve a specific prayer request by ID (if allowed)
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} requestId
 * @param {string|string[]} [memberRole]
 * @param {string} [memberUid]
 * @returns {Promise<Object|null>}
 */
export async function getPrayerRequestById(communityId = DEFAULT_COMMUNITY_ID, requestId, memberRole, memberUid) {
  if (!requestId) return null;
  try {
    const docRef = doc(db, prayerDocPath(communityId, requestId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = { id: snap.id, ...snap.data() };
    if (!canViewPrayerRequest(data, memberRole, memberUid)) {
      return null;
    }

    return {
      ...data,
      displayAuthorName: getDisplayAuthorName(data, memberRole, memberUid),
    };
  } catch (error) {
    console.error(`[PrayerTestimonyService] Failed to get prayer request ${requestId}:`, error);
    return null;
  }
}

/**
 * Delete a prayer request
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} requestId
 * @returns {Promise<boolean>}
 */
export async function deletePrayerRequest(communityId = DEFAULT_COMMUNITY_ID, requestId) {
  if (!requestId) throw new Error('requestId is required');
  const docRef = doc(db, prayerDocPath(communityId, requestId));
  await deleteDoc(docRef);
  return true;
}

/**
 * Create a new fellowship testimony
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createTestimony(communityId = DEFAULT_COMMUNITY_ID, data = {}) {
  let targetCommunityId = communityId;
  let testimonyData = data;

  if (typeof communityId === 'object' && communityId !== null && Object.keys(data).length === 0) {
    testimonyData = communityId;
    targetCommunityId = testimonyData.communityId || DEFAULT_COMMUNITY_ID;
  }

  if (!testimonyData || !testimonyData.title || !testimonyData.title.trim()) {
    throw new Error('Testimony title is required');
  }

  const testimonyId = testimonyData.id || `testimony_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, testimonyDocPath(targetCommunityId, testimonyId));

  const newDoc = {
    id: testimonyId,
    communityId: targetCommunityId,
    authorId: testimonyData.authorId || '',
    authorName: testimonyData.authorName || 'Community Member',
    title: testimonyData.title.trim(),
    content: testimonyData.content ? testimonyData.content.trim() : '',
    relatedActivityId: testimonyData.relatedActivityId || null,
    isApproved: testimonyData.isApproved !== undefined ? Boolean(testimonyData.isApproved) : false,
    approvedBy: testimonyData.approvedBy || null,
    createdAt: testimonyData.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newDoc);
  return newDoc;
}

/**
 * Approve a testimony (leader/admin action)
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} testimonyId
 * @param {string} [leaderName='Leader']
 * @returns {Promise<Object>}
 */
export async function approveTestimony(communityId = DEFAULT_COMMUNITY_ID, testimonyId, leaderName = 'Leader') {
  if (!testimonyId) throw new Error('testimonyId is required');

  const docRef = doc(db, testimonyDocPath(communityId, testimonyId));
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Testimony ${testimonyId} not found`);
  }

  const updates = {
    isApproved: true,
    approvedBy: leaderName || 'Leader',
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updates);
  return { id: testimonyId, ...snap.data(), ...updates };
}

/**
 * Retrieve approved testimonies for community display
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array>}
 */
export async function getApprovedTestimonies(communityId = DEFAULT_COMMUNITY_ID) {
  try {
    const colRef = collection(db, testimonyCollectionPath(communityId));
    const snap = await getDocs(colRef);
    const list = [];

    snap.forEach((d) => {
      const data = { id: d.id, ...d.data() };
      if (data.isApproved === true) {
        list.push(data);
      }
    });

    list.sort((a, b) => {
      const timeA = getTimestampMs(a.createdAt);
      const timeB = getTimestampMs(b.createdAt);
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return list;
  } catch (error) {
    console.error(`[PrayerTestimonyService] Failed to get approved testimonies for ${communityId}:`, error);
    return [];
  }
}

/**
 * Real-time subscription to approved testimonies
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToApprovedTestimonies(communityId = DEFAULT_COMMUNITY_ID, callback) {
  const colRef = collection(db, testimonyCollectionPath(communityId));

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (data.isApproved === true) {
          list.push(data);
        }
      });

      list.sort((a, b) => {
        const timeA = getTimestampMs(a.createdAt);
        const timeB = getTimestampMs(b.createdAt);
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });

      callback(list);
    },
    (error) => {
      console.error(`[PrayerTestimonyService] Error in subscribeToApprovedTestimonies for ${communityId}:`, error);
      callback([]);
    }
  );
}

/**
 * Retrieve all testimonies (approved and pending) for leaders to review
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array>}
 */
export async function getAllTestimonies(communityId = DEFAULT_COMMUNITY_ID) {
  try {
    const colRef = collection(db, testimonyCollectionPath(communityId));
    const snap = await getDocs(colRef);
    const list = [];

    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });

    list.sort((a, b) => {
      const timeA = getTimestampMs(a.createdAt);
      const timeB = getTimestampMs(b.createdAt);
      if (timeA !== timeB) return timeB - timeA;
      return (b.id || '').localeCompare(a.id || '');
    });

    return list;
  } catch (error) {
    console.error(`[PrayerTestimonyService] Failed to get all testimonies for ${communityId}:`, error);
    return [];
  }
}

/**
 * Delete a testimony
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} testimonyId
 * @returns {Promise<boolean>}
 */
export async function deleteTestimony(communityId = DEFAULT_COMMUNITY_ID, testimonyId) {
  if (!testimonyId) throw new Error('testimonyId is required');
  const docRef = doc(db, testimonyDocPath(communityId, testimonyId));
  await deleteDoc(docRef);
  return true;
}
