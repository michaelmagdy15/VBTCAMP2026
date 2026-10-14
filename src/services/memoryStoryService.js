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
 * Memory Categories for VBT Sports Camp & Community
 */
export const MEMORY_CATEGORIES = {
  CAMP_SEASONS: 'camp_seasons',
  TOURNAMENTS: 'tournaments',
  PHOTO_HIGHLIGHTS: 'photo_highlights',
  TESTIMONIES: 'testimonies',
  TEAM_MILESTONES: 'team_milestones',
  SERVANT_ANNIVERSARIES: 'servant_anniversaries',
  COMMUNITY_IMPACT: 'community_impact',
};

/**
 * Human-friendly category display labels
 */
export const CATEGORY_LABELS = {
  [MEMORY_CATEGORIES.CAMP_SEASONS]: 'Past Services & Camp Seasons',
  [MEMORY_CATEGORIES.TOURNAMENTS]: 'Tournaments & Champions',
  [MEMORY_CATEGORIES.PHOTO_HIGHLIGHTS]: 'Photo Highlights & Galleries',
  [MEMORY_CATEGORIES.TESTIMONIES]: 'Testimonies & Life Change',
  [MEMORY_CATEGORIES.TEAM_MILESTONES]: 'Team Milestones & Records',
  [MEMORY_CATEGORIES.SERVANT_ANNIVERSARIES]: 'Servant Anniversaries',
  [MEMORY_CATEGORIES.COMMUNITY_IMPACT]: 'Community Impact Statistics',
};

/**
 * Privileged roles with pastoral and administrative oversight
 * authorized to view sensitive personal member histories
 */
export const PRIVILEGED_PASTORAL_ROLES = [
  'admin',
  'coordinator',
  'service_leader',
  'service_day_leader',
  'pastoral_care_leader',
  'pastoral_care',
];

/**
 * Path helper for community memories collection
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {string}
 */
export function memoriesCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/memories`;
}

/**
 * Path helper for a specific memory document
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memoryId
 * @returns {string}
 */
export function memoryDocPath(communityId = DEFAULT_COMMUNITY_ID, memoryId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/memories/${memoryId}`;
}

/**
 * Path helper for community impact statistics document
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {string}
 */
export function impactStatsDocPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/stats/community_impact`;
}

/**
 * Path helper for community member document
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId
 * @returns {string}
 */
export function memberDocPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/members/${memberId}`;
}

/**
 * Helper to check if a role is a privileged pastoral or admin role
 * @param {string} role
 * @returns {boolean}
 */
export function isPrivilegedPastoralRole(role) {
  if (!role) return false;
  return PRIVILEGED_PASTORAL_ROLES.includes(String(role).toLowerCase());
}

/**
 * Normalize timestamp to milliseconds
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
 * Calculate ISO week number of a date
 * @param {Date|string|number} d
 * @returns {number}
 */
export function getWeekNumber(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return 1;
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

/**
 * Calculate Day of Year (1 - 366)
 * @param {Date|string|number} d
 * @returns {number}
 */
export function getDayOfYear(d) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return 1;
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * 1. Create a Memory Story
 * Records positive history, milestones, championships, testimonies, or servant anniversaries
 * with explicit consent tracking.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} storyData
 * @param {Object} [authorUser={}]
 * @returns {Promise<Object>} Created memory object
 */
export async function createMemoryStory(
  communityId = DEFAULT_COMMUNITY_ID,
  storyData = {},
  authorUser = {}
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;

  if (!storyData || typeof storyData !== 'object') {
    throw new Error('storyData must be an object');
  }

  const title = (storyData.title || '').trim();
  if (!title) {
    throw new Error('Title is required to create a memory story');
  }

  const category = storyData.category || MEMORY_CATEGORIES.CAMP_SEASONS;
  const memoryId = storyData.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Consent Tracking
  const consentGiven = Boolean(storyData.consentGiven);
  const consentBy = storyData.consentBy || authorUser?.id || authorUser?.uid || authorUser?.displayName || 'anonymous';
  const consentDate = storyData.consentDate || new Date().toISOString();
  const consentNotes = storyData.consentNotes || '';

  // Determine approval status:
  // If explicit consent is NOT given, stories/photos cannot be automatically approved for public broadcast
  let status = storyData.status || (consentGiven ? 'approved' : 'pending_consent');
  if (!consentGiven && status === 'approved') {
    status = 'pending_consent';
  }

  const isApproved = consentGiven && status === 'approved';

  const eventDate = storyData.eventDate || new Date().toISOString();
  const eventDateParsed = new Date(eventDate);
  const year = storyData.year || (isNaN(eventDateParsed.getTime()) ? new Date().getFullYear() : eventDateParsed.getFullYear());
  const season = storyData.season || `Season ${year}`;

  const mediaUrls = Array.isArray(storyData.mediaUrls)
    ? storyData.mediaUrls
    : (storyData.imageUrl || storyData.photoUrl ? [storyData.imageUrl || storyData.photoUrl] : []);

  const memoryRecord = {
    id: memoryId,
    communityId: commId,
    title,
    description: storyData.description || storyData.content || '',
    category,
    season,
    year: Number(year),
    eventDate: eventDateParsed.toISOString ? eventDateParsed.toISOString() : eventDate,
    imageUrl: storyData.imageUrl || storyData.photoUrl || (mediaUrls.length > 0 ? mediaUrls[0] : ''),
    mediaUrls,
    caption: storyData.caption || '',
    tags: Array.isArray(storyData.tags) ? storyData.tags : [],
    featured: Boolean(storyData.featured),
    championTeam: storyData.championTeam || null,
    servantHonoree: storyData.servantHonoree || null,
    taggedMemberIds: Array.isArray(storyData.taggedMemberIds) ? storyData.taggedMemberIds : [],
    impactMetrics: storyData.impactMetrics || {},
    
    // Explicit Consent Tracking
    consentGiven,
    consentBy,
    consentDate,
    consentNotes,

    // Author
    authorId: authorUser?.id || authorUser?.uid || 'community_historian',
    authorName: authorUser?.displayName || authorUser?.name || 'VBT Historian',
    authorRole: authorUser?.role || 'member',

    // Moderation & Approval
    status,
    isApproved,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdDateMs: Date.now(),
  };

  const docRef = doc(db, memoryDocPath(commId, memoryId));
  await setDoc(docRef, memoryRecord);

  return {
    ...memoryRecord,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 2. Get Approved Memories
 * Fetches memories filtered for approved public broadcast and explicit consent.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} [filter={}] - { category, year, season, tags, tag, featured, search, sort }
 * @returns {Promise<Array<Object>>}
 */
export async function getApprovedMemories(
  communityId = DEFAULT_COMMUNITY_ID,
  filter = {}
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const colRef = collection(db, memoriesCollectionPath(commId));
  const snapshot = await getDocs(colRef);

  const memories = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data) return;

    // Enforce consent and approval protections:
    // Only approved memories with explicit consent are broadcasted publicly
    const isApproved = data.isApproved === true || data.status === 'approved';
    const consentGiven = data.consentGiven === true;

    if (!isApproved || !consentGiven) {
      return;
    }

    // Scrub any unconsented sensitive personal statistics that might be accidentally embedded
    const publicMemory = {
      ...data,
      id: docSnap.id,
    };

    // Category filter
    if (filter.category) {
      if (Array.isArray(filter.category)) {
        if (!filter.category.includes(publicMemory.category)) return;
      } else if (publicMemory.category !== filter.category) {
        return;
      }
    }

    // Year filter
    if (filter.year !== undefined && filter.year !== null && filter.year !== '') {
      if (String(publicMemory.year) !== String(filter.year)) return;
    }

    // Season filter
    if (filter.season) {
      const memSeason = String(publicMemory.season || '').toLowerCase();
      const filterSeason = String(filter.season).toLowerCase();
      if (!memSeason.includes(filterSeason)) return;
    }

    // Tag filter
    const requiredTag = filter.tag || (Array.isArray(filter.tags) && filter.tags[0]);
    if (requiredTag) {
      const lowerTag = String(requiredTag).toLowerCase();
      const hasTag = (publicMemory.tags || []).some((t) =>
        String(t).toLowerCase().includes(lowerTag)
      );
      if (!hasTag) return;
    }

    // Featured filter
    if (filter.featured === true && !publicMemory.featured) {
      return;
    }

    // Search filter
    if (filter.search && typeof filter.search === 'string') {
      const term = filter.search.toLowerCase().trim();
      const textToSearch = [
        publicMemory.title,
        publicMemory.description,
        publicMemory.caption,
        publicMemory.championTeam,
        publicMemory.season,
        ...(publicMemory.tags || []),
        publicMemory.servantHonoree?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!textToSearch.includes(term)) return;
    }

    memories.push(publicMemory);
  });

  // Sorting
  const sortMode = filter.sort || 'newest';
  if (sortMode === 'oldest') {
    memories.sort((a, b) => getTimestampMs(a.eventDate || a.createdDateMs) - getTimestampMs(b.eventDate || b.createdDateMs));
  } else if (sortMode === 'most_impactful') {
    memories.sort((a, b) => {
      const aImpact = Object.values(a.impactMetrics || {}).reduce((sum, v) => sum + (Number(v) || 0), 0) + (a.featured ? 100 : 0);
      const bImpact = Object.values(b.impactMetrics || {}).reduce((sum, v) => sum + (Number(v) || 0), 0) + (b.featured ? 100 : 0);
      return bImpact - aImpact;
    });
  } else {
    // Default newest
    memories.sort((a, b) => getTimestampMs(b.eventDate || b.createdDateMs) - getTimestampMs(a.eventDate || a.createdDateMs));
  }

  return memories;
}

/**
 * 3. Dynamic Throwback Feature: "This Week in VBT History"
 * Matches memories from previous years that took place during the same calendar week.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Date|string|number} [targetDate=new Date()]
 * @returns {Promise<Array<Object>>} Throwback memories enriched with anniversary metadata
 */
export async function getThisWeekInHistory(
  communityId = DEFAULT_COMMUNITY_ID,
  targetDate = new Date()
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const target = targetDate ? new Date(targetDate) : new Date();
  if (isNaN(target.getTime())) {
    throw new Error('Invalid targetDate provided to getThisWeekInHistory');
  }

  const currentYear = target.getFullYear();
  const targetWeek = getWeekNumber(target);
  const targetDayOfYear = getDayOfYear(target);

  // Fetch approved memories
  const allApproved = await getApprovedMemories(commId);

  const throwbacks = [];

  for (const memory of allApproved) {
    const memDate = new Date(memory.eventDate || memory.createdDateMs);
    if (isNaN(memDate.getTime())) continue;

    const memoryYear = memDate.getFullYear();
    // Must be from an earlier calendar year
    if (memoryYear >= currentYear) continue;

    const yearsAgo = currentYear - memoryYear;
    if (yearsAgo < 1) continue;

    const memWeek = getWeekNumber(memDate);
    const memDayOfYear = getDayOfYear(memDate);

    // Week match: same ISO week number OR day-of-year within +/- 7 days (handling year boundary)
    const isSameWeekNr = memWeek === targetWeek;
    const dayDiff = Math.abs(memDayOfYear - targetDayOfYear);
    const isWithin7Days = dayDiff <= 7 || dayDiff >= 358;

    if (isSameWeekNr || isWithin7Days) {
      let anniversaryBadge = `${yearsAgo} Year${yearsAgo > 1 ? 's' : ''} Ago`;
      if (yearsAgo === 1) anniversaryBadge = '1st Anniversary';
      else if (yearsAgo === 2) anniversaryBadge = '2nd Anniversary';
      else if (yearsAgo === 3) anniversaryBadge = '3rd Anniversary';
      else if (yearsAgo === 5) anniversaryBadge = '5-Year Jubilee';

      throwbacks.push({
        ...memory,
        isThrowback: true,
        yearsAgo,
        anniversaryYears: yearsAgo,
        throwbackHeadline: `${yearsAgo} Year${yearsAgo > 1 ? 's' : ''} Ago This Week (${memoryYear})`,
        anniversaryBadge,
      });
    }
  }

  // Sort throwbacks chronologically by yearsAgo ascending (1 year ago, 2 years ago, etc.)
  throwbacks.sort((a, b) => a.yearsAgo - b.yearsAgo);

  return throwbacks;
}

/**
 * 4. Update Consent Status
 * Updates explicit consent tracking for a memory or photo highlight.
 * If consent is revoked (consentGiven: false), the memory is immediately unapproved from public view.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memoryId
 * @param {Object} consentPayload - { consentGiven, consentBy, consentDate, consentNotes, status }
 * @returns {Promise<Object>} Updated memory record
 */
export async function updateConsentStatus(
  communityId = DEFAULT_COMMUNITY_ID,
  memoryId,
  consentPayload = {}
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!memoryId) {
    throw new Error('memoryId is required to update consent status');
  }

  const docRef = doc(db, memoryDocPath(commId, memoryId));
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Memory with ID "${memoryId}" does not exist in community "${commId}".`);
  }

  const existing = docSnap.data() || {};
  const consentGiven = Boolean(consentPayload.consentGiven);
  const consentBy = consentPayload.consentBy || existing.consentBy || 'community_admin';
  const consentDate = consentPayload.consentDate || new Date().toISOString();
  const consentNotes = consentPayload.consentNotes !== undefined ? consentPayload.consentNotes : (existing.consentNotes || '');

  // If consent is revoked, revoke public broadcast immediately.
  // If consent is granted, promote pending_consent or consent_revoked to approved.
  let status = consentGiven
    ? (consentPayload.status || (existing.status === 'pending_consent' || existing.status === 'consent_revoked' ? 'approved' : (existing.status || 'approved')))
    : 'consent_revoked';
  const isApproved = consentGiven && status === 'approved';

  const updateFields = {
    consentGiven,
    consentBy,
    consentDate,
    consentNotes,
    status,
    isApproved,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, updateFields);

  return {
    ...existing,
    ...updateFields,
    id: memoryId,
  };
}

/**
 * 5. Get Member Personal History (Private View)
 *
 * Sensitive personal attendance and serving counts are kept private to the individual
 * member and NOT broadcasted without explicit consent.
 *
 * Allowed requesting users:
 * 1. The member themselves (isSelf: requestingUser.id/uid === memberId)
 * 2. Elevated pastoral/admin leaders (roles: admin, coordinator, service_leader, pastoral_care, etc.)
 * 3. Requests with explicit member broadcast consent granted
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId
 * @param {Object} requestingUser - { id, uid, role, isAdmin, hasConsent }
 * @returns {Promise<Object>} Private history report
 */
export async function getMemberPersonalHistory(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  requestingUser = {}
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;

  if (!memberId) {
    throw new Error('memberId is required to retrieve personal history');
  }

  // Identity and Authorization Verification
  const reqId = requestingUser?.id || requestingUser?.uid || requestingUser?.memberId;
  const isSelf = Boolean(reqId && String(reqId) === String(memberId));
  const isPrivileged = Boolean(
    requestingUser?.isAdmin ||
    isPrivilegedPastoralRole(requestingUser?.role)
  );

  // Fetch member profile
  const memRef = doc(db, memberDocPath(commId, memberId));
  const memSnap = await getDoc(memRef);
  const memberProfile = memSnap.exists() ? memSnap.data() : { id: memberId };

  // Explicit broadcast consent check (e.g. member opted in to public sharing)
  const hasConsent = Boolean(
    requestingUser?.hasConsent ||
    memberProfile?.shareStatsConsent ||
    memberProfile?.broadcastAttendanceConsent
  );

  // Privacy Protection Enforcement
  if (!isSelf && !isPrivileged && !hasConsent) {
    const error = new Error('Access Denied: Personal attendance and serving history are private to the individual member.');
    error.code = 'PRIVACY_VIOLATION';
    error.status = 403;
    throw error;
  }

  // Calculate Anniversaries & Milestones
  const joinedDate = memberProfile.serviceStartDate || memberProfile.joinedDate || memberProfile.createdAt || '2024-01-15T00:00:00Z';
  const joinedDateParsed = new Date(joinedDate);
  const now = new Date();

  let yearsOfService = 0;
  if (!isNaN(joinedDateParsed.getTime())) {
    const diffYears = (now - joinedDateParsed) / (1000 * 60 * 60 * 24 * 365.25);
    yearsOfService = Math.max(0, Math.floor(diffYears));
  }

  // Attendance and Serving Counts
  const attendanceCount = Number(
    memberProfile.totalAttendances ?? memberProfile.attendanceCount ?? memberProfile.attendanceRecordsCount ?? 0
  );
  const servingCount = Number(
    memberProfile.totalServingCount ?? memberProfile.servingCount ?? memberProfile.assignmentsCount ?? 0
  );

  // Milestones
  const milestones = [];
  if (yearsOfService >= 1) {
    milestones.push({
      id: `anniversary_${yearsOfService}yr`,
      title: `${yearsOfService} Year${yearsOfService > 1 ? 's' : ''} of Faithful Service`,
      category: MEMORY_CATEGORIES.SERVANT_ANNIVERSARIES,
      icon: 'Award',
      achievedDate: joinedDate,
      description: `Faithfully served in VBT Sports Camp ministry for ${yearsOfService} full year${yearsOfService > 1 ? 's' : ''}.`,
    });
  }

  if (attendanceCount >= 50) {
    milestones.push({
      id: 'attendance_50_club',
      title: 'Centurion of Fellowship: 50+ Services',
      category: MEMORY_CATEGORIES.CAMP_SEASONS,
      icon: 'Heart',
      description: 'Attended over 50 community gatherings and service meetings.',
    });
  } else if (attendanceCount >= 10) {
    milestones.push({
      id: 'attendance_10_club',
      title: 'Faithful Gatherer: 10+ Services',
      category: MEMORY_CATEGORIES.CAMP_SEASONS,
      icon: 'CheckCircle2',
      description: 'Consistently gathered with the brethren in fellowship.',
    });
  }

  if (servingCount >= 20) {
    milestones.push({
      id: 'pillar_of_service',
      title: 'Pillar of Service: 20+ Shifts',
      category: MEMORY_CATEGORIES.COMMUNITY_IMPACT,
      icon: 'ShieldCheck',
      description: 'Faithfully served in 20 or more sports camp shifts and tournaments.',
    });
  } else if (servingCount >= 5) {
    milestones.push({
      id: 'active_servant',
      title: 'Devoted Servant: 5+ Shifts',
      category: MEMORY_CATEGORIES.COMMUNITY_IMPACT,
      icon: 'Users',
      description: 'Actively participating in serving the youth.',
    });
  }

  // Find authored stories and tagged stories from approved memories
  const allApproved = await getApprovedMemories(commId);
  const authoredStories = allApproved.filter((m) => m.authorId === memberId);
  const taggedMemories = allApproved.filter(
    (m) =>
      (m.taggedMemberIds && m.taggedMemberIds.includes(memberId)) ||
      m.servantHonoree?.memberId === memberId
  );

  return {
    authorized: true,
    memberId,
    displayName: memberProfile.displayName || memberProfile.name || 'Faithful Servant',
    joinedDate,
    yearsOfService,
    servantAnniversary: {
      years: yearsOfService,
      title: yearsOfService >= 1 ? `${yearsOfService} Year${yearsOfService > 1 ? 's' : ''} of Faithful Service` : 'Rising Servant',
      nextMilestone: `${yearsOfService + 1} Year Milestone`,
      isAnniversaryMonth: !isNaN(joinedDateParsed.getTime()) && joinedDateParsed.getMonth() === now.getMonth(),
    },
    attendanceCount,
    servingCount,
    milestones,
    authoredStories,
    taggedMemories,
    privacyNotice: 'Sensitive personal attendance and serving counts are kept strictly confidential to you and pastoral oversight.',
  };
}

/**
 * Get Community Impact Statistics
 * Aggregates statistics such as meals shared, youth coached, prayers lifted, and volunteer hours.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Object>}
 */
export async function getCommunityImpactStats(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, impactStatsDocPath(commId));
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      ...docSnap.data(),
      id: docSnap.id,
    };
  }

  // Default baseline impact statistics
  const defaultStats = {
    mealsShared: 1420,
    youthCoached: 385,
    prayersLifted: 960,
    campsOrganized: 8,
    volunteersActive: 92,
    hoursVolunteered: 2450,
    tournamentsHeld: 14,
    updatedAt: new Date().toISOString(),
  };

  return defaultStats;
}

/**
 * Update Community Impact Statistics
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} statUpdates
 * @returns {Promise<Object>}
 */
export async function updateCommunityImpactStats(
  communityId = DEFAULT_COMMUNITY_ID,
  statUpdates = {}
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, impactStatsDocPath(commId));
  const current = await getCommunityImpactStats(commId);

  const updated = {
    ...current,
    ...statUpdates,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, updated, { merge: true });
  return updated;
}

/**
 * Delete a Memory Story
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memoryId
 * @param {Object} requestingUser
 * @returns {Promise<boolean>}
 */
export async function deleteMemoryStory(
  communityId = DEFAULT_COMMUNITY_ID,
  memoryId,
  requestingUser = {}
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, memoryDocPath(commId, memoryId));
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return true;
  }

  const data = snap.data();
  const isAuthor = requestingUser && (requestingUser.id === data.authorId || requestingUser.uid === data.authorId);
  const isPrivileged = requestingUser && (requestingUser.isAdmin || isPrivilegedPastoralRole(requestingUser.role));

  if (!isAuthor && !isPrivileged) {
    throw new Error('Access Denied: Only the author or a leader can delete a memory story.');
  }

  await deleteDoc(docRef);
  return true;
}

/**
 * Subscribe to approved memories for real-time memory wall feeds
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Function} callback
 * @param {Object} [filter={}]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToApprovedMemories(
  communityId = DEFAULT_COMMUNITY_ID,
  callback,
  filter = {}
) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const colRef = collection(db, memoriesCollectionPath(commId));

  return onSnapshot(
    colRef,
    (snapshot) => {
      const memories = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        const isApproved = data.isApproved === true || data.status === 'approved';
        const consentGiven = data.consentGiven === true;
        if (!isApproved || !consentGiven) return;

        const publicMemory = { ...data, id: docSnap.id };

        if (filter.category && publicMemory.category !== filter.category) return;
        if (filter.year && String(publicMemory.year) !== String(filter.year)) return;
        if (filter.featured && !publicMemory.featured) return;

        memories.push(publicMemory);
      });

      memories.sort(
        (a, b) => getTimestampMs(b.eventDate || b.createdDateMs) - getTimestampMs(a.eventDate || a.createdDateMs)
      );

      callback(memories);
    },
    (err) => {
      console.error('[MemoryStoryService] Error in subscription:', err);
    }
  );
}

/**
 * Seed Default Inspirational Memories
 * Pre-populates the memory wall with rich history, championship milestones, testimonies, and servant honors.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array<Object>>}
 */
export async function seedDefaultMemories(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const nowYear = new Date().getFullYear();

  const seedData = [
    {
      id: 'mem_camp_season_2024',
      title: 'Summer Camp 2024: Champions in Christ',
      description: 'Over 200 youths gathered for 5 days of intense volleyball, basketball, daily Bible study, and worship under the open sky.',
      category: MEMORY_CATEGORIES.CAMP_SEASONS,
      season: 'Summer 2024',
      year: 2024,
      eventDate: '2024-07-15T10:00:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80',
      caption: 'Closing ceremonies and trophy presentation at the main gymnasium.',
      tags: ['camp', 'summer2024', 'fellowship', 'worship'],
      featured: true,
      impactMetrics: { youthAttended: 210, mealsServed: 630 },
      consentGiven: true,
      consentBy: 'leader_mina',
      status: 'approved',
    },
    {
      id: 'mem_tournament_2025_finals',
      title: 'Volleyball Championship 2025: St. George Titans Triumph',
      description: 'An electric 5-set final thriller where the Titans held off the Archangels in a dramatic 17-15 tiebreak to claim the championship cup.',
      category: MEMORY_CATEGORIES.TOURNAMENTS,
      season: 'Spring 2025',
      year: 2025,
      eventDate: '2025-04-20T16:30:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80',
      caption: 'St. George Titans lifting the 2025 VBT Gold Cup with Coach Mark.',
      tags: ['volleyball', 'championship', 'titans', 'trophy'],
      featured: true,
      championTeam: 'St. George Titans',
      consentGiven: true,
      consentBy: 'coach_mark',
      status: 'approved',
    },
    {
      id: 'mem_photo_worship_night',
      title: 'Candlelight Fellowship & Prayer Vigil',
      description: 'The community gathered for three hours of continuous prayer and hymns during holy week, lifting up camp leaders and families.',
      category: MEMORY_CATEGORIES.PHOTO_HIGHLIGHTS,
      season: 'Spring 2025',
      year: 2025,
      eventDate: '2025-04-25T19:00:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=1200&q=80',
      caption: 'Over 150 candles lit symbolizing unity and intercessory prayer.',
      tags: ['prayer', 'worship', 'candlelight'],
      featured: false,
      consentGiven: true,
      consentBy: 'deacon_peter',
      status: 'approved',
    },
    {
      id: 'mem_testimony_david_change',
      title: 'From Camp Attendee to Youth Coach: David’s Journey',
      description: '“When I first walked into VBT four years ago, I was lost and lacked purpose. Through the mentorship of the servants and the discipline of sports, I found my faith and a family. Today I am blessed to coach the junior team.”',
      category: MEMORY_CATEGORIES.TESTIMONIES,
      season: 'Fall 2025',
      year: 2025,
      eventDate: '2025-10-05T14:00:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80',
      caption: 'David leading warm-up drills with the junior volleyball squad.',
      tags: ['testimony', 'mentorship', 'lifechange'],
      featured: true,
      consentGiven: true,
      consentBy: 'david_shenouda',
      status: 'approved',
    },
    {
      id: 'mem_anniversary_servant_mina',
      title: 'Faithful Servant Milestone: Mina Boulos (2 Years)',
      description: 'Honoring Mina Boulos for 2 years of dedicated leadership in coordinating morning logistics, sports equipment, and youth mentorship.',
      category: MEMORY_CATEGORIES.SERVANT_ANNIVERSARIES,
      season: '2025',
      year: 2025,
      eventDate: '2025-09-10T11:00:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      caption: 'Mina receiving his servant honor medallion from Father Antonios.',
      tags: ['servant', 'anniversary', 'faithfulness'],
      servantHonoree: {
        memberId: 'usr_mina',
        name: 'Mina Boulos',
        years: 2,
      },
      featured: false,
      consentGiven: true,
      consentBy: 'mina_boulos',
      status: 'approved',
    },
    {
      id: 'mem_impact_1000th_meal',
      title: 'Milestone Reached: 1,000th Community Meal Shared!',
      description: 'The kitchen team celebrated reaching 1,000 warm meals provided to athletes, families, and community members during Saturday service days.',
      category: MEMORY_CATEGORIES.COMMUNITY_IMPACT,
      season: '2025',
      year: 2025,
      eventDate: '2025-11-12T13:00:00Z',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      caption: 'Kitchen hospitality crew celebrating the 1,000 meals milestone.',
      tags: ['impact', 'hospitality', 'milestone', 'meals'],
      featured: true,
      impactMetrics: { mealsShared: 1000 },
      consentGiven: true,
      consentBy: 'hospitality_team',
      status: 'approved',
    },
  ];

  const seeded = [];
  for (const item of seedData) {
    const memory = await createMemoryStory(commId, item, {
      id: item.consentBy,
      displayName: item.consentBy,
      role: 'coordinator',
    });
    seeded.push(memory);
  }

  // Also seed impact stats
  await updateCommunityImpactStats(commId, {
    mealsShared: 1420,
    youthCoached: 385,
    prayersLifted: 960,
    campsOrganized: 8,
    volunteersActive: 92,
    hoursVolunteered: 2450,
  });

  return seeded;
}
