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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export { DEFAULT_COMMUNITY_ID };

/**
 * Standard group types supported in VBT communities
 */
export const GROUP_TYPES = {
  SERVANT_CIRCLE: 'servant_circle',
  BIBLE_STUDY: 'bible_study',
  YOUTH_FELLOWSHIP: 'youth_fellowship',
  OUTREACH_SQUAD: 'outreach_squad',
};

/**
 * Path helper for the teams collection in a community
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {string}
 */
export function teamsCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/teams`;
}

/**
 * Path helper for a specific team document
 * @param {string} communityId
 * @param {string} [teamId]
 * @returns {string}
 */
export function teamDocPath(communityId, teamId) {
  let commId = communityId;
  let tId = teamId;
  if (tId === undefined && commId) {
    tId = commId;
    commId = DEFAULT_COMMUNITY_ID;
  }
  return `vbt_communities/${commId || DEFAULT_COMMUNITY_ID}/teams/${tId}`;
}

/**
 * Path helper for the groups collection in a community
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {string}
 */
export function groupsCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/groups`;
}

/**
 * Path helper for a specific group document
 * @param {string} communityId
 * @param {string} [groupId]
 * @returns {string}
 */
export function groupDocPath(communityId, groupId) {
  let commId = communityId;
  let gId = groupId;
  if (gId === undefined && commId) {
    gId = commId;
    commId = DEFAULT_COMMUNITY_ID;
  }
  return `vbt_communities/${commId || DEFAULT_COMMUNITY_ID}/groups/${gId}`;
}

/**
 * Create a new team in the community
 * @param {string|Object} communityId
 * @param {Object} [teamData]
 * @returns {Promise<Object>}
 */
export async function createTeam(communityId, teamData) {
  let effectiveCommunityId = communityId;
  let effectiveTeamData = teamData;

  if (typeof communityId === 'object' && communityId !== null && teamData === undefined) {
    effectiveTeamData = communityId;
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  const data = effectiveTeamData || {};
  const teamId = data.id || `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, teamDocPath(effectiveCommunityId, teamId));

  const newTeam = {
    ...data,
    id: teamId,
    name: data.name || '',
    color: data.color || '#3B82F6',
    emblem: data.emblem || '🛡️',
    leaderUid: data.leaderUid || null,
    leaderName: data.leaderName || '',
    memberCount: typeof data.memberCount === 'number' ? data.memberCount : 0,
    wins: typeof data.wins === 'number' ? data.wins : 0,
    losses: typeof data.losses === 'number' ? data.losses : 0,
    motto: data.motto || '',
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newTeam, { merge: true });
  return newTeam;
}

/**
 * Retrieve all teams for a given community
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array>}
 */
export async function getTeams(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  try {
    const colRef = collection(db, teamsCollectionPath(commId));
    const snap = await getDocs(colRef);
    const list = [];
    if (snap && typeof snap.forEach === 'function') {
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
    }
    return list;
  } catch (error) {
    console.error(`[TeamGroupService] Failed to get teams for ${commId}:`, error);
    return [];
  }
}

/**
 * Real-time subscription to teams in a community
 * @param {string|Function} communityId
 * @param {Function} [callback]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToTeams(communityId, callback) {
  let effectiveCommunityId = communityId;
  let effectiveCallback = callback;

  if (typeof communityId === 'function') {
    effectiveCallback = communityId;
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (typeof effectiveCallback !== 'function') {
    return () => {};
  }

  try {
    const colRef = collection(db, teamsCollectionPath(effectiveCommunityId));
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = [];
        if (snapshot && typeof snapshot.forEach === 'function') {
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() });
          });
        }
        effectiveCallback(list);
      },
      (error) => {
        console.error(`[TeamGroupService] Error in teams subscription for ${effectiveCommunityId}:`, error);
        effectiveCallback([]);
      }
    );
  } catch (error) {
    console.error(`[TeamGroupService] Failed to subscribe to teams:`, error);
    effectiveCallback([]);
    return () => {};
  }
}

/**
 * Retrieve a single team by ID
 * @param {string} communityId
 * @param {string} [teamId]
 * @returns {Promise<Object|null>}
 */
export async function getTeamById(communityId, teamId) {
  let effectiveCommunityId = communityId;
  let effectiveTeamId = teamId;

  if (teamId === undefined && communityId !== undefined) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectiveTeamId = communityId;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveTeamId) return null;

  try {
    const docRef = doc(db, teamDocPath(effectiveCommunityId, effectiveTeamId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error(`[TeamGroupService] Failed to get team ${effectiveTeamId}:`, err);
    return null;
  }
}

/**
 * Update an existing team
 * @param {string} communityId
 * @param {string|Object} teamId
 * @param {Object} [updates]
 * @returns {Promise<Object>}
 */
export async function updateTeam(communityId, teamId, updates) {
  let effectiveCommunityId = communityId;
  let effectiveTeamId = teamId;
  let effectiveUpdates = updates;

  if (updates === undefined && teamId !== undefined && typeof teamId === 'object') {
    effectiveUpdates = teamId;
    effectiveTeamId = communityId;
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveTeamId) throw new Error('teamId is required');

  const docRef = doc(db, teamDocPath(effectiveCommunityId, effectiveTeamId));
  const payload = {
    ...effectiveUpdates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  return { id: effectiveTeamId, ...payload };
}

/**
 * Delete a team
 * @param {string} communityId
 * @param {string} [teamId]
 * @returns {Promise<boolean>}
 */
export async function deleteTeam(communityId, teamId) {
  let effectiveCommunityId = communityId;
  let effectiveTeamId = teamId;

  if (teamId === undefined && communityId !== undefined) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectiveTeamId = communityId;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveTeamId) throw new Error('teamId is required');

  const docRef = doc(db, teamDocPath(effectiveCommunityId, effectiveTeamId));
  await deleteDoc(docRef);
  return true;
}

/**
 * Create a new group in the community
 * @param {string|Object} communityId
 * @param {Object} [groupData]
 * @returns {Promise<Object>}
 */
export async function createGroup(communityId, groupData) {
  let effectiveCommunityId = communityId;
  let effectiveGroupData = groupData;

  if (typeof communityId === 'object' && communityId !== null && groupData === undefined) {
    effectiveGroupData = communityId;
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  const data = effectiveGroupData || {};
  const groupId = data.id || `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, groupDocPath(effectiveCommunityId, groupId));

  const newGroup = {
    ...data,
    id: groupId,
    name: data.name || '',
    type: data.type || GROUP_TYPES.BIBLE_STUDY,
    leaderUid: data.leaderUid || null,
    leaderName: data.leaderName || '',
    meetingDay: data.meetingDay || 'Friday',
    meetingTime: data.meetingTime || '18:00',
    memberIds: Array.isArray(data.memberIds) ? data.memberIds : [],
    maxMembers: typeof data.maxMembers === 'number' ? data.maxMembers : 15,
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newGroup, { merge: true });
  return newGroup;
}

/**
 * Retrieve all groups for a given community
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array>}
 */
export async function getGroups(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  try {
    const colRef = collection(db, groupsCollectionPath(commId));
    const snap = await getDocs(colRef);
    const list = [];
    if (snap && typeof snap.forEach === 'function') {
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
    }
    return list;
  } catch (error) {
    console.error(`[TeamGroupService] Failed to get groups for ${commId}:`, error);
    return [];
  }
}

/**
 * Real-time subscription to groups in a community
 * @param {string|Function} communityId
 * @param {Function} [callback]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToGroups(communityId, callback) {
  let effectiveCommunityId = communityId;
  let effectiveCallback = callback;

  if (typeof communityId === 'function') {
    effectiveCallback = communityId;
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (typeof effectiveCallback !== 'function') {
    return () => {};
  }

  try {
    const colRef = collection(db, groupsCollectionPath(effectiveCommunityId));
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = [];
        if (snapshot && typeof snapshot.forEach === 'function') {
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...d.data() });
          });
        }
        effectiveCallback(list);
      },
      (error) => {
        console.error(`[TeamGroupService] Error in groups subscription for ${effectiveCommunityId}:`, error);
        effectiveCallback([]);
      }
    );
  } catch (error) {
    console.error(`[TeamGroupService] Failed to subscribe to groups:`, error);
    effectiveCallback([]);
    return () => {};
  }
}

/**
 * Retrieve a single group by ID
 * @param {string} communityId
 * @param {string} [groupId]
 * @returns {Promise<Object|null>}
 */
export async function getGroupById(communityId, groupId) {
  let effectiveCommunityId = communityId;
  let effectiveGroupId = groupId;

  if (groupId === undefined && communityId !== undefined) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectiveGroupId = communityId;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveGroupId) return null;

  try {
    const docRef = doc(db, groupDocPath(effectiveCommunityId, effectiveGroupId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error(`[TeamGroupService] Failed to get group ${effectiveGroupId}:`, err);
    return null;
  }
}

/**
 * Update an existing group
 * @param {string} communityId
 * @param {string|Object} groupId
 * @param {Object} [updates]
 * @returns {Promise<Object>}
 */
export async function updateGroup(communityId, groupId, updates) {
  let effectiveCommunityId = communityId;
  let effectiveGroupId = groupId;
  let effectiveUpdates = updates;

  if (updates === undefined && groupId !== undefined && typeof groupId === 'object') {
    effectiveUpdates = groupId;
    effectiveGroupId = communityId;
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveGroupId) throw new Error('groupId is required');

  const docRef = doc(db, groupDocPath(effectiveCommunityId, effectiveGroupId));
  const payload = {
    ...effectiveUpdates,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(docRef, payload);
  return { id: effectiveGroupId, ...payload };
}

/**
 * Delete a group
 * @param {string} communityId
 * @param {string} [groupId]
 * @returns {Promise<boolean>}
 */
export async function deleteGroup(communityId, groupId) {
  let effectiveCommunityId = communityId;
  let effectiveGroupId = groupId;

  if (groupId === undefined && communityId !== undefined) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectiveGroupId = communityId;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveGroupId) throw new Error('groupId is required');

  const docRef = doc(db, groupDocPath(effectiveCommunityId, effectiveGroupId));
  await deleteDoc(docRef);
  return true;
}

/**
 * Join a small group.
 * Validates group existence and max capacity constraints.
 *
 * @param {string} communityId
 * @param {string} groupId
 * @param {string} [memberId]
 * @returns {Promise<Object>}
 */
export async function joinGroup(communityId, groupId, memberId) {
  let effectiveCommunityId = communityId;
  let effectiveGroupId = groupId;
  let effectiveMemberId = memberId;

  if (memberId === undefined && groupId !== undefined) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectiveGroupId = communityId;
    effectiveMemberId = groupId;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveGroupId) throw new Error('groupId is required');
  if (!effectiveMemberId) throw new Error('memberId is required');

  const docRef = doc(db, groupDocPath(effectiveCommunityId, effectiveGroupId));
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(`Group ${effectiveGroupId} not found`);
  }

  const groupData = snap.data() || {};
  const currentMembers = Array.isArray(groupData.memberIds) ? groupData.memberIds : [];

  if (currentMembers.includes(effectiveMemberId)) {
    return {
      success: true,
      alreadyMember: true,
      groupId: effectiveGroupId,
      memberId: effectiveMemberId,
      memberIds: currentMembers,
    };
  }

  if (
    typeof groupData.maxMembers === 'number' &&
    groupData.maxMembers > 0 &&
    currentMembers.length >= groupData.maxMembers
  ) {
    throw new Error(`Group ${effectiveGroupId} has reached maximum capacity of ${groupData.maxMembers} members`);
  }

  await updateDoc(docRef, {
    memberIds: arrayUnion(effectiveMemberId),
    updatedAt: serverTimestamp(),
  });

  return {
    success: true,
    alreadyMember: false,
    groupId: effectiveGroupId,
    memberId: effectiveMemberId,
    memberIds: [...currentMembers, effectiveMemberId],
  };
}

/**
 * Leave a small group.
 * Idempotently removes the member from group memberIds.
 *
 * @param {string} communityId
 * @param {string} groupId
 * @param {string} [memberId]
 * @returns {Promise<Object>}
 */
export async function leaveGroup(communityId, groupId, memberId) {
  let effectiveCommunityId = communityId;
  let effectiveGroupId = groupId;
  let effectiveMemberId = memberId;

  if (memberId === undefined && groupId !== undefined) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectiveGroupId = communityId;
    effectiveMemberId = groupId;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveGroupId) throw new Error('groupId is required');
  if (!effectiveMemberId) throw new Error('memberId is required');

  const docRef = doc(db, groupDocPath(effectiveCommunityId, effectiveGroupId));
  await updateDoc(docRef, {
    memberIds: arrayRemove(effectiveMemberId),
    updatedAt: serverTimestamp(),
  });

  return {
    success: true,
    groupId: effectiveGroupId,
    memberId: effectiveMemberId,
  };
}
