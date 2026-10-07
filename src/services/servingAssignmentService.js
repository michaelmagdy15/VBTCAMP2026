import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
  CONFIRMED: 'confirmed',
  REPLACEMENT_REQUESTED: 'replacement_requested',
};

/**
 * Path helper for applications collection within a serving opportunity
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @returns {string}
 */
export function applicationsCollectionPath(communityId = DEFAULT_COMMUNITY_ID, opportunityId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/serving_opportunities/${opportunityId}/applications`;
}

/**
 * Path helper for a specific application document
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @param {string} applicationId
 * @returns {string}
 */
export function applicationDocPath(communityId = DEFAULT_COMMUNITY_ID, opportunityId, applicationId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/serving_opportunities/${opportunityId}/applications/${applicationId}`;
}

/**
 * Apply for a serving opportunity
 * @param {Object} params
 * @param {string} [params.communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} params.opportunityId
 * @param {Object} params.member
 * @param {string} [params.notes='']
 * @param {string} [params.serviceId=null]
 * @param {string} [params.applicationId=null]
 * @returns {Promise<Object>}
 */
export async function applyForOpportunity({
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId,
  member,
  notes = '',
  serviceId = null,
  applicationId = null,
}) {
  if (!opportunityId) {
    throw new Error('opportunityId is required to apply for opportunity');
  }
  if (!member) {
    throw new Error('member information is required to apply for opportunity');
  }

  const memberId = member.id || member.memberId || member.uid || applicationId;
  if (!memberId) {
    throw new Error('member id is required to apply for opportunity');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const appId = applicationId || memberId;
  const docRef = doc(db, applicationDocPath(commId, opportunityId, appId));

  const applicationData = {
    id: appId,
    opportunityId,
    serviceId: serviceId || member.serviceId || null,
    memberId,
    memberName: member.memberName || member.name || member.displayName || 'Anonymous Member',
    memberRole: member.memberRole || member.role || 'servant',
    team: member.team || member.teamId || '',
    status: APPLICATION_STATUS.PENDING,
    appliedAt: serverTimestamp(),
    resolvedAt: null,
    resolvedBy: null,
    notes: notes || member.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, applicationData, { merge: true });
  return applicationData;
}

/**
 * Update the review status of a volunteer application by a coordinator or leader
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @param {string} applicationId
 * @param {string} newStatus - Value from APPLICATION_STATUS
 * @param {string} [leaderName=null]
 * @returns {Promise<Object>}
 */
export async function updateApplicationStatus(
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId,
  applicationId,
  newStatus,
  leaderName = null
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!opportunityId || !applicationId) {
    throw new Error('opportunityId and applicationId are required');
  }
  if (!newStatus) {
    throw new Error('newStatus is required');
  }

  const docRef = doc(db, applicationDocPath(commId, opportunityId, applicationId));
  const updates = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (newStatus === APPLICATION_STATUS.PENDING) {
    updates.resolvedAt = null;
    updates.resolvedBy = null;
  } else {
    updates.resolvedAt = serverTimestamp();
    updates.resolvedBy = leaderName || null;
  }

  await setDoc(docRef, updates, { merge: true });
  return { id: applicationId, ...updates };
}

/**
 * Confirm volunteer assignment once approved
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @param {string} applicationId
 * @returns {Promise<Object>}
 */
export async function confirmAssignment(
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId,
  applicationId
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!opportunityId || !applicationId) {
    throw new Error('opportunityId and applicationId are required');
  }

  const docRef = doc(db, applicationDocPath(commId, opportunityId, applicationId));
  const updates = {
    status: APPLICATION_STATUS.CONFIRMED,
    confirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, updates, { merge: true });
  return { id: applicationId, ...updates };
}

/**
 * Request a replacement if a volunteer cannot fulfill their confirmed or approved serving role
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @param {string} applicationId
 * @param {string} [reason='']
 * @returns {Promise<Object>}
 */
export async function requestReplacement(
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId,
  applicationId,
  reason = ''
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!opportunityId || !applicationId) {
    throw new Error('opportunityId and applicationId are required');
  }

  const docRef = doc(db, applicationDocPath(commId, opportunityId, applicationId));
  const updates = {
    status: APPLICATION_STATUS.REPLACEMENT_REQUESTED,
    replacementReason: reason || '',
    replacementRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, updates, { merge: true });
  return { id: applicationId, ...updates };
}

/**
 * Get all applications for a specific serving opportunity
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @returns {Promise<Array>}
 */
export async function getOpportunityApplications(
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!opportunityId) return [];

  try {
    const colRef = collection(db, applicationsCollectionPath(commId, opportunityId));
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    return list;
  } catch (error) {
    console.error(`[ServingAssignment] Failed to get applications for opportunity ${opportunityId}:`, error);
    return [];
  }
}

/**
 * Retrieve a single application by ID
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @param {string} applicationId
 * @returns {Promise<Object|null>}
 */
export async function getApplicationById(
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId,
  applicationId
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!opportunityId || !applicationId) return null;

  try {
    const docRef = doc(db, applicationDocPath(commId, opportunityId, applicationId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[ServingAssignment] Failed to get application ${applicationId}:`, error);
    return null;
  }
}

/**
 * Subscribe to real-time applications updates for a serving opportunity
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToOpportunityApplications(
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId,
  callback
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!opportunityId) {
    if (typeof callback === 'function') callback([]);
    return () => {};
  }

  const colRef = collection(db, applicationsCollectionPath(commId, opportunityId));
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      if (typeof callback === 'function') {
        callback(list);
      }
    },
    (err) => {
      console.error(`[ServingAssignment] Subscription error for opportunity ${opportunityId}:`, err);
      if (typeof callback === 'function') {
        callback([]);
      }
    }
  );
}

/**
 * Compute summary statistics from a list of applications
 * @param {Array} applications
 * @returns {Object}
 */
export function calculateApplicationStats(applications = []) {
  const stats = {
    total: applications.length,
    pending: 0,
    approved: 0,
    declined: 0,
    confirmed: 0,
    replacement_requested: 0,
    byTeam: {},
    byRole: {},
  };

  for (const app of applications) {
    const status = app.status || APPLICATION_STATUS.PENDING;
    if (stats[status] !== undefined) {
      stats[status]++;
    }

    const team = app.team || 'Unassigned';
    stats.byTeam[team] = (stats.byTeam[team] || 0) + 1;

    const role = app.memberRole || 'servant';
    stats.byRole[role] = (stats.byRole[role] || 0) + 1;
  }

  return stats;
}
