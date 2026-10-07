import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

/**
 * Mask a phone number to protect privacy when shown to ordinary community members.
 * E.g., "+201000680580" -> "+20 100 *** *580" or "01000680580" -> "010 **** 0580"
 * @param {string} phone
 * @returns {string}
 */
export function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (clean.length < 7) return '***';
  
  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start} *** *${end}`;
}

/**
 * Valid roles in the VBT community
 */
export const COMMUNITY_ROLES = {
  MEMBER: 'member',
  VOLUNTEER: 'volunteer',
  SERVANT: 'servant',
  TEAM_LEADER: 'team_leader',
  GAME_LEADER: 'game_leader',
  SERVICE_LEADER: 'service_leader',
  COORDINATOR: 'coordinator',
  PASTORAL_CARE: 'pastoral_care_leader',
  ADMIN: 'admin',
};

/**
 * List of fields a member is permitted to edit on their own public profile.
 * Sensitive fields like role, status, or legacyServantPhone cannot be changed by the member.
 */
export const ALLOWED_SELF_EDIT_PUBLIC_FIELDS = [
  'firstName',
  'lastName',
  'displayName',
  'photoUrl',
  'bio',
  'sportsInterests',
  'preferredLanguage',
];

/**
 * List of fields a member is permitted to edit on their own private profile.
 * Pastoral notes and internal leadership flags cannot be edited by the member.
 */
export const ALLOWED_SELF_EDIT_PRIVATE_FIELDS = [
  'rawPhoneNumber',
  'email',
  'birthDate',
  'emergencyContact',
  'medicalNotes',
  'notificationPreferences',
];

/**
 * Reference helpers for paths
 */
export function memberDocPath(communityId, memberId) {
  return `vbt_communities/${communityId}/members/${memberId}`;
}

export function memberPrivateDocPath(communityId, memberId) {
  return `vbt_communities/${communityId}/members/${memberId}/private/profile`;
}

/**
 * Retrieve a member's public profile.
 * @param {string} communityId
 * @param {string} memberId
 * @returns {Promise<Object|null>}
 */
export async function getMemberPublicProfile(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  if (!memberId) return null;
  try {
    const docRef = doc(db, memberDocPath(communityId, memberId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[MemberService] Error fetching public profile ${memberId}:`, error);
    return null;
  }
}

/**
 * Retrieve a member's confidential private profile.
 * Strictly permitted only for the member themselves or a verified community admin.
 * @param {string} communityId
 * @param {string} memberId
 * @returns {Promise<Object|null>}
 */
export async function getMemberPrivateProfile(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  if (!memberId) return null;
  try {
    const docRef = doc(db, memberPrivateDocPath(communityId, memberId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.warn(`[MemberService] Permission denied or not found for private profile ${memberId}:`, error);
    return null;
  }
}

/**
 * Create or provision a permanent member profile from login or registration.
 * Seamlessly bridges existing legacy vbt_servants records into permanent member profiles.
 *
 * @param {string} communityId
 * @param {Object} params
 * @param {string} params.memberId - Firebase Auth UID or stable UUID
 * @param {string} params.phoneNumber - Raw phone number
 * @param {string} params.firstName - First name
 * @param {string} [params.lastName] - Last name
 * @param {string} [params.role] - Initial role (defaults to 'member' or 'unregistered')
 * @param {Object} [params.additionalPublic] - Additional public fields
 * @param {Object} [params.additionalPrivate] - Additional private fields
 * @returns {Promise<{publicProfile: Object, privateProfile: Object}>}
 */
export async function createOrGetMemberProfile(communityId = DEFAULT_COMMUNITY_ID, {
  memberId,
  phoneNumber,
  firstName,
  lastName = '',
  role = 'member',
  additionalPublic = {},
  additionalPrivate = {}
}) {
  if (!memberId) throw new Error('memberId is required');

  const cleanPhone = phoneNumber ? phoneNumber.trim() : '';
  const memberRef = doc(db, memberDocPath(communityId, memberId));
  const memberPrivateRef = doc(db, memberPrivateDocPath(communityId, memberId));

  const [publicSnap, privateSnap] = await Promise.all([
    getDoc(memberRef),
    getDoc(memberPrivateRef).catch(() => null)
  ]);

  const now = new Date().toISOString();

  // If public profile already exists, update last seen and return
  if (publicSnap.exists()) {
    const existing = publicSnap.data();
    await setDoc(memberRef, {
      lastSeenAt: now,
      ...(cleanPhone && !existing.phoneNumberMasked ? { phoneNumberMasked: maskPhoneNumber(cleanPhone) } : {})
    }, { merge: true });

    return {
      publicProfile: { id: memberId, ...existing, lastSeenAt: now },
      privateProfile: privateSnap && privateSnap.exists() ? { id: memberId, ...privateSnap.data() } : null
    };
  }

  // Check if there is a legacy servant record in vbt_servants
  let legacyServantData = null;
  if (cleanPhone) {
    try {
      const legacySnap = await getDoc(doc(db, 'vbt_servants', cleanPhone));
      if (legacySnap.exists()) {
        legacyServantData = legacySnap.data();
      }
    } catch {
      // Legacy lookup error ignored
    }
  }

  // Derive role: prioritize legacy servant role if found and elevated
  let assignedRole = role;
  if (legacyServantData?.role) {
    if (legacyServantData.role === 'admin' || legacyServantData.role === 'coordinator') assignedRole = 'admin';
    else if (legacyServantData.role === 'leader') assignedRole = 'team_leader';
    else if (legacyServantData.role === 'referee') assignedRole = 'game_leader';
    else if (legacyServantData.role === 'service_leader') assignedRole = 'service_leader';
    else assignedRole = legacyServantData.role;
  }

  const effectiveFirstName = firstName || legacyServantData?.firstName || legacyServantData?.name || '';
  const effectiveLastName = lastName || legacyServantData?.lastName || '';
  const displayName = `${effectiveFirstName} ${effectiveLastName}`.trim() || effectiveFirstName || 'VBT Member';

  const publicData = {
    id: memberId,
    communityId,
    firebaseUid: memberId,
    firstName: effectiveFirstName,
    lastName: effectiveLastName,
    displayName,
    phoneNumberMasked: maskPhoneNumber(cleanPhone),
    photoUrl: additionalPublic.photoUrl || null,
    role: assignedRole,
    status: 'active',
    sportsInterests: additionalPublic.sportsInterests || [],
    legacyServantPhone: cleanPhone || null,
    joinedAt: legacyServantData?.createdAt || now,
    lastSeenAt: now,
    ...additionalPublic
  };

  const privateData = {
    memberId,
    rawPhoneNumber: cleanPhone,
    email: additionalPrivate.email || '',
    birthDate: additionalPrivate.birthDate || '',
    emergencyContact: additionalPrivate.emergencyContact || { name: '', relation: '', phone: '' },
    medicalNotes: additionalPrivate.medicalNotes || '',
    pastoralNotes: '',
    notificationPreferences: {
      pushAnnouncements: true,
      pushReminders: true,
      servingAlerts: true,
      ...(additionalPrivate.notificationPreferences || {})
    },
    updatedAt: now,
  };

  await Promise.all([
    setDoc(memberRef, publicData, { merge: true }),
    setDoc(memberPrivateRef, privateData, { merge: true })
  ]);

  // If a legacy servant record existed, update it with permanent memberId link
  if (cleanPhone) {
    try {
      await setDoc(doc(db, 'vbt_servants', cleanPhone), {
        permanentMemberId: memberId,
        communityId
      }, { merge: true });
    } catch {
      // Non-blocking
    }
  }

  return {
    publicProfile: publicData,
    privateProfile: privateData
  };
}

/**
 * Update allowed fields on a member's public profile.
 * Prevents non-admins from changing their role or status.
 *
 * @param {string} communityId
 * @param {string} memberId
 * @param {Object} updates
 * @param {boolean} [isAdmin=false]
 */
export async function updateMemberPublicProfile(communityId = DEFAULT_COMMUNITY_ID, memberId, updates, isAdmin = false) {
  if (!memberId) throw new Error('memberId is required');

  const filteredUpdates = {};
  Object.keys(updates).forEach((key) => {
    if (isAdmin || ALLOWED_SELF_EDIT_PUBLIC_FIELDS.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  if (filteredUpdates.firstName || filteredUpdates.lastName) {
    const existing = await getMemberPublicProfile(communityId, memberId);
    const fName = filteredUpdates.firstName ?? existing?.firstName ?? '';
    const lName = filteredUpdates.lastName ?? existing?.lastName ?? '';
    filteredUpdates.displayName = `${fName} ${lName}`.trim() || fName;
  }

  const docRef = doc(db, memberDocPath(communityId, memberId));
  await setDoc(docRef, {
    ...filteredUpdates,
    updatedAt: serverTimestamp()
  }, { merge: true });

  return filteredUpdates;
}

/**
 * Update allowed fields on a member's confidential private profile.
 *
 * @param {string} communityId
 * @param {string} memberId
 * @param {Object} updates
 * @param {boolean} [isAdmin=false]
 */
export async function updateMemberPrivateProfile(communityId = DEFAULT_COMMUNITY_ID, memberId, updates, isAdmin = false) {
  if (!memberId) throw new Error('memberId is required');

  const filteredUpdates = {};
  Object.keys(updates).forEach((key) => {
    if (isAdmin || ALLOWED_SELF_EDIT_PRIVATE_FIELDS.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  const docRef = doc(db, memberPrivateDocPath(communityId, memberId));
  await setDoc(docRef, {
    ...filteredUpdates,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return filteredUpdates;
}

/**
 * Retrieve all members in a community (public safe profile fields)
 * @param {string} communityId
 * @returns {Promise<Array>}
 */
export async function getMembers(communityId = DEFAULT_COMMUNITY_ID) {
  try {
    const colRef = collection(db, `vbt_communities/${communityId}/members`);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    list.sort((a, b) => (a.displayName || a.firstName || '').localeCompare(b.displayName || b.firstName || ''));
    return list;
  } catch (err) {
    console.error(`[MemberService] Error getting members for ${communityId}:`, err);
    return [];
  }
}

/**
 * Real-time subscription to the community members collection.
 * Only returns public safe fields.
 *
 * @param {string} communityId
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToMembers(communityId = DEFAULT_COMMUNITY_ID, callback) {
  const colRef = collection(db, `vbt_communities/${communityId}/members`);
  return onSnapshot(colRef, (snapshot) => {
    const list = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    // Sort alphabetically by displayName
    list.sort((a, b) => (a.displayName || a.firstName || '').localeCompare(b.displayName || b.firstName || ''));
    callback(list);
  }, (error) => {
    console.error(`[MemberService] Error subscribing to members for ${communityId}:`, error);
    callback([]);
  });
}

/**
 * Search members in memory or via simple filter.
 * Case-insensitive match on displayName, firstName, lastName, or role.
 *
 * @param {Array} membersList
 * @param {string} searchTerm
 * @returns {Array}
 */
export function searchMembers(membersList, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return membersList;
  const term = searchTerm.toLowerCase().trim();

  return membersList.filter((m) => {
    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    const displayName = (m.displayName || '').toLowerCase();
    const role = (m.role || '').toLowerCase();
    const sports = (m.sportsInterests || []).join(' ').toLowerCase();

    return fullName.includes(term) ||
           displayName.includes(term) ||
           role.includes(term) ||
           sports.includes(term);
  });
}
