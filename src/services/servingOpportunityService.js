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

export const OPPORTUNITY_ROLES = {
  REFEREE: 'referee',
  PRAISE: 'praise',
  LOGISTICS: 'logistics',
  FIRST_AID: 'first_aid',
  MEDIA: 'media',
  SETUP: 'setup',
  GENERAL: 'general',
};

export const OPPORTUNITY_STATUS = {
  OPEN: 'open',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
};

/**
 * Path helper for opportunity document
 * @param {string} communityId
 * @param {string} opportunityId
 * @returns {string}
 */
export function opportunityDocPath(communityId = DEFAULT_COMMUNITY_ID, opportunityId) {
  return `vbt_communities/${communityId}/serving_opportunities/${opportunityId}`;
}

/**
 * Path helper for serving opportunities collection
 * @param {string} communityId
 * @returns {string}
 */
export function opportunitiesCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  return `vbt_communities/${communityId}/serving_opportunities`;
}

/**
 * Helper to compute remaining open spots
 * @param {Object} opp
 * @returns {number}
 */
export function getRemainingSpots(opp) {
  if (!opp) return 0;
  const needed = typeof opp.spotsNeeded === 'number' ? opp.spotsNeeded : 0;
  const filled = typeof opp.spotsFilled === 'number' ? opp.spotsFilled : 0;
  return Math.max(0, needed - filled);
}

/**
 * Helper to check if opportunity is actively open for signup
 * @param {Object} opp
 * @returns {boolean}
 */
export function isOpportunityOpen(opp) {
  if (!opp) return false;
  return opp.status === OPPORTUNITY_STATUS.OPEN && getRemainingSpots(opp) > 0;
}

/**
 * Create a new serving opportunity
 * @param {string} communityId
 * @param {Object} oppData
 * @returns {Promise<Object>}
 */
export async function createOpportunity(communityId = DEFAULT_COMMUNITY_ID, oppData = {}) {
  let actualCommunityId = communityId;
  let data = oppData;

  if (typeof communityId === 'object' && communityId !== null) {
    data = communityId;
    actualCommunityId = data.communityId || DEFAULT_COMMUNITY_ID;
  }

  const oppId = data.id || `opp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, opportunityDocPath(actualCommunityId, oppId));

  const spotsNeeded = typeof data.spotsNeeded === 'number'
    ? data.spotsNeeded
    : (data.spotsNeeded !== undefined ? parseInt(data.spotsNeeded, 10) || 1 : 1);

  const spotsFilled = typeof data.spotsFilled === 'number'
    ? data.spotsFilled
    : (data.spotsFilled !== undefined ? parseInt(data.spotsFilled, 10) || 0 : 0);

  let status = data.status;
  if (!status) {
    status = spotsFilled >= spotsNeeded ? OPPORTUNITY_STATUS.FILLED : OPPORTUNITY_STATUS.OPEN;
  }

  const newDoc = {
    id: oppId,
    communityId: actualCommunityId,
    title: data.title || '',
    serviceId: data.serviceId || null,
    serviceTitle: data.serviceTitle || '',
    serviceDate: data.serviceDate || '',
    role: data.role || OPPORTUNITY_ROLES.GENERAL,
    description: data.description || '',
    spotsNeeded,
    spotsFilled,
    status,
    requirements: Array.isArray(data.requirements) ? data.requirements : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newDoc);
  return newDoc;
}

/**
 * Update an existing serving opportunity
 * @param {string} communityId
 * @param {string} opportunityId
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
export async function updateOpportunity(communityId = DEFAULT_COMMUNITY_ID, opportunityId, updates = {}) {
  let actualCommunityId = communityId;
  let actualOpportunityId = opportunityId;
  let actualUpdates = updates;

  // Support invocation where communityId was omitted: updateOpportunity('opp_1', { status: 'filled' })
  if (typeof opportunityId === 'object' && opportunityId !== null && Object.keys(updates).length === 0) {
    actualOpportunityId = communityId;
    actualUpdates = opportunityId;
    actualCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!actualOpportunityId) {
    throw new Error('opportunityId is required');
  }

  const docRef = doc(db, opportunityDocPath(actualCommunityId, actualOpportunityId));
  const filteredUpdates = {
    ...actualUpdates,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, filteredUpdates, { merge: true });
  return { id: actualOpportunityId, ...filteredUpdates };
}

/**
 * Delete a serving opportunity
 * @param {string} communityId
 * @param {string} opportunityId
 * @returns {Promise<boolean>}
 */
export async function deleteOpportunity(communityId = DEFAULT_COMMUNITY_ID, opportunityId) {
  let actualCommunityId = communityId;
  let actualOpportunityId = opportunityId;

  // Support invocation where communityId was omitted: deleteOpportunity('opp_1')
  if (opportunityId === undefined) {
    actualOpportunityId = communityId;
    actualCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!actualOpportunityId) {
    throw new Error('opportunityId is required');
  }

  const docRef = doc(db, opportunityDocPath(actualCommunityId, actualOpportunityId));
  await deleteDoc(docRef);
  return true;
}

/**
 * Retrieve a single opportunity by ID
 * @param {string} communityId
 * @param {string} opportunityId
 * @returns {Promise<Object|null>}
 */
export async function getOpportunityById(communityId = DEFAULT_COMMUNITY_ID, opportunityId) {
  let actualCommunityId = communityId;
  let actualOpportunityId = opportunityId;

  // Support invocation where communityId was omitted: getOpportunityById('opp_1')
  if (opportunityId === undefined) {
    actualOpportunityId = communityId;
    actualCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!actualOpportunityId) return null;

  try {
    const docRef = doc(db, opportunityDocPath(actualCommunityId, actualOpportunityId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[ServingOpportunityService] Failed to get opportunity ${actualOpportunityId}:`, error);
    return null;
  }
}

/**
 * Query serving opportunities with optional filters
 * @param {string} communityId
 * @param {Object} filterOptions
 * @returns {Promise<Array>}
 */
export async function getOpportunities(communityId = DEFAULT_COMMUNITY_ID, filterOptions = {}) {
  let actualCommunityId = communityId;
  let actualFilters = filterOptions;

  if (typeof communityId === 'object' && communityId !== null) {
    actualFilters = communityId;
    actualCommunityId = DEFAULT_COMMUNITY_ID;
  }

  try {
    const colRef = collection(db, opportunitiesCollectionPath(actualCommunityId));
    const constraints = [];

    if (actualFilters.status) {
      constraints.push(where('status', '==', actualFilters.status));
    }
    if (actualFilters.role) {
      constraints.push(where('role', '==', actualFilters.role));
    }
    if (actualFilters.serviceId) {
      constraints.push(where('serviceId', '==', actualFilters.serviceId));
    }
    if (actualFilters.serviceDate) {
      constraints.push(where('serviceDate', '==', actualFilters.serviceDate));
    }
    if (actualFilters.orderByField) {
      constraints.push(orderBy(actualFilters.orderByField, actualFilters.orderDirection || 'asc'));
    }
    const limitNum = actualFilters.limit || actualFilters.limitCount;
    if (limitNum && typeof limitNum === 'number') {
      constraints.push(limit(limitNum));
    }

    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    return list;
  } catch (error) {
    console.error(`[ServingOpportunityService] Failed to get opportunities:`, error);
    return [];
  }
}

/**
 * Real-time subscription to serving opportunities
 * @param {string} communityId
 * @param {Object|Function} [optionsOrCallback]
 * @param {Function} [callback]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToOpportunities(communityId = DEFAULT_COMMUNITY_ID, ...args) {
  let actualCommunityId = communityId;
  let filterOptions = {};
  let actualCallback = null;

  if (typeof actualCommunityId === 'function') {
    actualCallback = actualCommunityId;
    actualCommunityId = DEFAULT_COMMUNITY_ID;
  } else if (typeof actualCommunityId === 'object' && actualCommunityId !== null) {
    filterOptions = actualCommunityId;
    actualCommunityId = DEFAULT_COMMUNITY_ID;
    if (typeof args[0] === 'function') {
      actualCallback = args[0];
    }
  } else {
    if (typeof args[0] === 'function') {
      actualCallback = args[0];
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      filterOptions = args[0];
      if (typeof args[1] === 'function') {
        actualCallback = args[1];
      }
    }
  }

  if (typeof actualCallback !== 'function') {
    return () => {};
  }

  const colRef = collection(db, opportunitiesCollectionPath(actualCommunityId));
  const constraints = [];

  if (filterOptions.status) {
    constraints.push(where('status', '==', filterOptions.status));
  }
  if (filterOptions.role) {
    constraints.push(where('role', '==', filterOptions.role));
  }
  if (filterOptions.serviceId) {
    constraints.push(where('serviceId', '==', filterOptions.serviceId));
  }

  const limitNum = filterOptions.limit || filterOptions.limitCount;
  if (limitNum && typeof limitNum === 'number') {
    constraints.push(limit(limitNum));
  }

  const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      actualCallback(list);
    },
    (err) => {
      console.error(`[ServingOpportunityService] Subscription error:`, err);
      actualCallback([]);
    }
  );
}
