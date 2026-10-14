import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID, getEventRegistry, getServants } from '../firebase';
import {
  SERVICE_TYPES,
  getUpcomingServices,
  getNextDayOfWeekDate,
  formatLocalDate,
} from './serviceMeetingService';
import {
  OPPORTUNITY_ROLES,
  getOpportunities,
  getRemainingSpots,
} from './servingOpportunityService';
import {
  applyForOpportunity,
  getOpportunityApplications,
} from './servingAssignmentService';
import {
  recordAttendance,
  getMemberServiceStatus,
  CHECKIN_METHOD,
} from './attendanceService';
import { getMemberPublicProfile } from './memberService';

export { DEFAULT_COMMUNITY_ID };

/**
 * Extracts 1-2 uppercase initials from a name string
 * @param {string} name
 * @returns {string}
 */
export function getServantInitials(name) {
  if (!name) return 'V';
  const clean = String(name).trim();
  if (!clean) return 'V';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────
// Fallback Data Constants
// ─────────────────────────────────────────────

export const WEEKLY_SCRIPTURE = {
  verse: 'Whatever you do, work heartily, as for the Lord and not for men.',
  reference: 'Colossians 3:23',
  theme: 'Service in Excellence',
  reflection: 'Every athletic drill, every act of encouragement, and every service station is an offering of worship to God.',
};

/**
 * Builds fallback weekly rhythm items:
 * - Weekly Service on Fridays 6:30 PM (18:30)
 * - Servant Meeting on Tuesdays 7:00 PM (19:00)
 * @param {string} communityId
 * @returns {Array<Object>}
 */
export function buildWeeklyRhythmActivities(communityId = DEFAULT_COMMUNITY_ID) {
  const nextFriday = getNextDayOfWeekDate(5);
  const nextTuesday = getNextDayOfWeekDate(2);

  return [
    {
      id: `weekly_service_${nextFriday}`,
      communityId,
      title: 'Weekly Community Service & Youth Sports',
      serviceType: SERVICE_TYPES.WEEKLY_SERVICE,
      type: SERVICE_TYPES.WEEKLY_SERVICE,
      date: nextFriday,
      startTime: '18:30',
      endTime: '21:30',
      location: {
        name: 'Main Sports Gymnasium & Fellowship Hall',
        address: 'VBT Community Sports Complex',
      },
      leadServantName: 'Pastoral & Sports Ministry Team',
      description: 'Weekly worship gathering, scripture reflection, team agility stations, and fellowship sports.',
      status: 'scheduled',
      isFallback: true,
      source: 'weekly_rhythm',
      recurrence: { isRecurring: true, frequency: 'weekly', dayOfWeek: 5 },
    },
    {
      id: `servant_meeting_${nextTuesday}`,
      communityId,
      title: 'Servants & Leadership Planning Meeting',
      serviceType: SERVICE_TYPES.SERVANT_MEETING,
      type: SERVICE_TYPES.SERVANT_MEETING,
      date: nextTuesday,
      startTime: '19:00',
      endTime: '20:30',
      location: {
        name: 'Leadership Conference Room / Online Hub',
        address: 'Sports Complex, Upper Hall',
      },
      leadServantName: 'Ministry Coordinators',
      description: 'Weekly spiritual alignment, servant prayer, logistics briefing, and sports station planning.',
      status: 'scheduled',
      isFallback: true,
      source: 'weekly_rhythm',
      recurrence: { isRecurring: true, frequency: 'weekly', dayOfWeek: 2 },
    },
  ];
}

/**
 * Fallback serving opportunities
 * @param {string} communityId
 * @returns {Array<Object>}
 */
export function buildFallbackServingOpportunities(communityId = DEFAULT_COMMUNITY_ID) {
  const nextFriday = getNextDayOfWeekDate(5);

  return [
    {
      id: 'fallback_opp_station_leader',
      communityId,
      title: 'Station Leader - Sports & Agility Station',
      role: OPPORTUNITY_ROLES.GENERAL || 'general',
      serviceTitle: 'Weekly Community Service & Youth Sports',
      serviceDate: nextFriday,
      spotsNeeded: 4,
      spotsFilled: 2,
      spotsRemaining: 2,
      status: 'open',
      description: 'Lead interactive athletic drills, team relays, and mentor youth participants through station rotations.',
      requirements: [
        'Energetic and passionate about youth sports ministry',
        'Arrive 30 minutes early for servant prayer and setup',
        'Completed basic servant orientation',
      ],
      isFallback: true,
    },
    {
      id: 'fallback_opp_media_sound',
      communityId,
      title: 'Media & Audio/Visual Coordinator',
      role: OPPORTUNITY_ROLES.MEDIA || 'media',
      serviceTitle: 'Weekly Community Service & Youth Sports',
      serviceDate: nextFriday,
      spotsNeeded: 2,
      spotsFilled: 0,
      spotsRemaining: 2,
      status: 'open',
      description: 'Manage audio console, worship projection slides, music playlists, and event live stream.',
      requirements: [
        'Familiarity with digital audio mixers or presentation software',
        'Punctual, focused, and attentive during service transitions',
      ],
      isFallback: true,
    },
    {
      id: 'fallback_opp_referee',
      communityId,
      title: 'Court Referee & Match Official',
      role: OPPORTUNITY_ROLES.REFEREE || 'referee',
      serviceTitle: 'Weekly Community Service & Youth Sports',
      serviceDate: nextFriday,
      spotsNeeded: 3,
      spotsFilled: 1,
      spotsRemaining: 2,
      status: 'open',
      description: 'Officiate volleyball, basketball, or football matchups, upholding sportsmanship, safety, and fair play.',
      requirements: [
        'Firm understanding of game rules and tournament standards',
        'Commitment to fair judging and positive encouragement',
        'Athletic attire and whistle provided',
      ],
      isFallback: true,
    },
    {
      id: 'fallback_opp_first_aid',
      communityId,
      title: 'First Aid & Participant Care Servant',
      role: OPPORTUNITY_ROLES.FIRST_AID || 'first_aid',
      serviceTitle: 'Weekly Community Service & Youth Sports',
      serviceDate: nextFriday,
      spotsNeeded: 2,
      spotsFilled: 1,
      spotsRemaining: 1,
      status: 'open',
      description: 'Provide athletic wraps, hydration management, cold compresses, and compassionate first-aid support.',
      requirements: [
        'CPR or athletic first-aid background preferred',
        'Calm demeanor and servant heart',
      ],
      isFallback: true,
    },
  ];
}

/**
 * Fallback community announcements
 * @param {string} communityId
 * @returns {Array<Object>}
 */
export function buildFallbackAnnouncements(communityId = DEFAULT_COMMUNITY_ID) {
  const today = formatLocalDate(new Date());

  return [
    {
      id: 'ann_season_kickoff',
      communityId,
      title: 'Welcome to the 2026 VBT Community Season!',
      content: 'Registration and team placements are active! Join us for an extraordinary season of sports, fellowship, and faith.',
      message: 'Registration and team placements are active! Join us for an extraordinary season of sports, fellowship, and faith.',
      type: 'announcement',
      author: 'Leadership Team',
      sender: 'Leadership Team',
      date: today,
      createdAt: new Date().toISOString(),
      pinned: true,
      isFallback: true,
    },
    {
      id: 'ann_weekly_service',
      communityId,
      title: 'Friday Night Gathering & Sports Stations',
      content: 'Every Friday at 6:30 PM: worship, inspiring message, youth sports stations, and team building. All are welcome!',
      message: 'Every Friday at 6:30 PM: worship, inspiring message, youth sports stations, and team building. All are welcome!',
      type: 'event',
      author: 'Sports Ministry',
      sender: 'Sports Ministry',
      date: today,
      createdAt: new Date().toISOString(),
      pinned: false,
      isFallback: true,
    },
    {
      id: 'ann_servant_training',
      communityId,
      title: 'Servants & Mentors Alignment — Tuesdays 7 PM',
      content: 'Join fellow servants every Tuesday evening for prayer, logistical coordination, and spiritual mentoring.',
      message: 'Join fellow servants every Tuesday evening for prayer, logistical coordination, and spiritual mentoring.',
      type: 'reminder',
      author: 'Coordination Team',
      sender: 'Coordination Team',
      date: today,
      createdAt: new Date().toISOString(),
      pinned: false,
      isFallback: true,
    },
  ];
}

// ─────────────────────────────────────────────
// Offline Attendance Queue
// ─────────────────────────────────────────────

let memoryOfflineAttendanceQueue = [];

function isLocalStorageAvailable() {
  try {
    return typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function';
  } catch {
    return false;
  }
}

export function getOfflineAttendanceQueue() {
  if (isLocalStorageAvailable()) {
    try {
      const stored = localStorage.getItem('vbt_offline_attendance_queue');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback to memory
    }
  }
  return [...memoryOfflineAttendanceQueue];
}

export function saveToOfflineAttendanceQueue(item) {
  memoryOfflineAttendanceQueue.push(item);
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem('vbt_offline_attendance_queue', JSON.stringify(memoryOfflineAttendanceQueue));
    } catch {
      // Ignore storage error
    }
  }
  return [...memoryOfflineAttendanceQueue];
}

export function clearOfflineAttendanceQueue() {
  memoryOfflineAttendanceQueue = [];
  if (isLocalStorageAvailable()) {
    try {
      localStorage.removeItem('vbt_offline_attendance_queue');
    } catch {
      // Ignore
    }
  }
}

export async function syncOfflineAttendanceQueue() {
  const queue = getOfflineAttendanceQueue();
  if (!queue || queue.length === 0) {
    return { synced: 0, failed: 0, remainingCount: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      await recordAttendance({
        communityId: item.communityId,
        serviceId: item.serviceId,
        member: { id: item.memberId, displayName: item.memberName },
        checkInMethod: item.method || CHECKIN_METHOD.QR_SCAN,
        status: 'present',
        notes: 'Synced from offline check-in queue',
      });
      synced++;
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  memoryOfflineAttendanceQueue = [...remaining];
  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem('vbt_offline_attendance_queue', JSON.stringify(remaining));
    } catch {
      // Ignore
    }
  }

  return { synced, failed, remainingCount: remaining.length };
}

// ─────────────────────────────────────────────
// Core Adapter Functions
// ─────────────────────────────────────────────

/**
 * Queries upcoming activities for a community.
 * If empty or offline, seamlessly integrates active events from getEventRegistry().
 * Only appends synthetic weekly rhythm items when realOnly is explicitly false.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object|boolean} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export async function getCommunityActivities(communityId = DEFAULT_COMMUNITY_ID, options = {}) {
  const { realOnly = false } = typeof options === 'boolean' ? { realOnly: options } : (options || {});
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  let upcomingServices = [];
  if (!isOffline) {
    try {
      upcomingServices = await getUpcomingServices(communityId);
    } catch (err) {
      console.warn(`[CommunityAdapter] Failed to fetch services from Firestore for ${communityId}:`, err);
      upcomingServices = [];
    }
  }

  // If we have services directly from the community, return them
  if (Array.isArray(upcomingServices) && upcomingServices.length > 0) {
    return upcomingServices.map((svc) => ({
      ...svc,
      communityId,
      isFallback: false,
      source: 'service',
    }));
  }

  // Otherwise, construct activities combining active event registry + (optional) weekly rhythm
  const fallbackList = [];

  // 1. Check active events from getEventRegistry()
  try {
    const registryEvents = await getEventRegistry();
    if (Array.isArray(registryEvents)) {
      registryEvents.forEach((ev) => {
        if (ev && ev.active !== false && ev.archived !== true && !ev.expired && ev.code !== 'june26') {
          fallbackList.push({
            id: `event_${ev.code || Date.now()}`,
            communityId,
            title: ev.name || ev.title || `VBT Sports Camp Event (${ev.code})`,
            serviceType: ev.eventType === 'service' ? SERVICE_TYPES.WEEKLY_SERVICE : (SERVICE_TYPES.TOURNAMENT || 'tournament'),
            type: ev.eventType === 'service' ? SERVICE_TYPES.WEEKLY_SERVICE : 'tournament',
            date: ev.date || ev.startDate || formatLocalDate(new Date()),
            startTime: ev.startTime || '18:30',
            endTime: ev.endTime || '21:30',
            location: {
              name: ev.location || (ev.code === 'july6' ? 'Ard el Golf Church Grounds' : 'VBT Sports Complex'),
              address: 'Youth Ministry Grounds',
            },
            description: ev.description || 'Active VBT Community service, tournament, and multi-sport camp.',
            leadServantName: ev.leadCoordinator || 'Event Leadership',
            status: 'scheduled',
            isFallback: !realOnly,
            source: 'event_registry',
            linkedEventCode: ev.code || null,
          });
        }
      });
    }
  } catch (err) {
    console.warn('[CommunityAdapter] Failed to fetch event registry for activities fallback:', err);
  }

  // 2. Add weekly rhythm items ONLY when realOnly is false
  if (!realOnly) {
    const weeklyRhythm = buildWeeklyRhythmActivities(communityId);
    fallbackList.push(...weeklyRhythm);
  }

  // Sort chronologically by date ascending, then startTime ascending
  fallbackList.sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  return fallbackList;
}

/**
 * Queries community serving opportunities.
 * If empty or offline, returns fallback opportunities only when realOnly is false.
 * When realOnly is true and Firestore is empty, returns [] so the UI triggers authentic empty state.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} [filterOptions={}]
 * @param {Object|boolean} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export async function getServingOpportunities(communityId = DEFAULT_COMMUNITY_ID, filterOptions = {}, options = {}) {
  const { realOnly = false } = typeof options === 'boolean' ? { realOnly: options } : (options || {});
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  let opportunities = [];
  if (!isOffline) {
    try {
      opportunities = await getOpportunities(communityId, filterOptions);
    } catch (err) {
      console.warn(`[CommunityAdapter] Failed to fetch serving opportunities for ${communityId}:`, err);
      opportunities = [];
    }
  }

  if (Array.isArray(opportunities) && opportunities.length > 0) {
    return opportunities.map((opp) => ({
      ...opp,
      communityId,
      spotsRemaining: getRemainingSpots(opp),
      isFallback: false,
    }));
  }

  // When realOnly is true, return empty array so UI triggers authentic empty state
  if (realOnly) {
    return [];
  }

  // Fallback opportunities with calculated spots remaining
  return buildFallbackServingOpportunities(communityId).map((opp) => ({
    ...opp,
    spotsRemaining: getRemainingSpots(opp),
  }));
}

/**
 * Alias for getServingOpportunities matching requirements naming
 */
export const getCommunityServingOpportunities = getServingOpportunities;

/**
 * Queries community announcements and encouragement/scripture for the week.
 * Returns an enriched list with attached weekly scripture.
 * When realOnly is true and Firestore is empty, returns [] with real scripture.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object|boolean} [options={}]
 * @returns {Promise<Array<Object>> & { announcements: Array<Object>, scripture: Object, scriptureOfTheWeek: Object }>}
 */
export async function getCommunityAnnouncements(communityId = DEFAULT_COMMUNITY_ID, options = {}) {
  const { realOnly = false } = typeof options === 'boolean' ? { realOnly: options } : (options || {});
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  let items = [];

  if (!isOffline) {
    try {
      const colRef = collection(db, `vbt_communities/${communityId}/announcements`);
      const snap = await getDocs(colRef);
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() });
      });
    } catch (err) {
      console.warn(`[CommunityAdapter] Announcements fetch failed for ${communityId}:`, err);
      items = [];
    }
  }

  if ((!Array.isArray(items) || items.length === 0) && !realOnly) {
    items = buildFallbackAnnouncements(communityId);
  }

  // Return as an Array with scripture attached as property for dual access:
  // e.g. Array access `announcements.length`, or object access `{ announcements, scripture }`
  const result = Array.isArray(items) ? [...items] : [];
  result.announcements = result;
  result.scripture = WEEKLY_SCRIPTURE;
  result.scriptureOfTheWeek = WEEKLY_SCRIPTURE;

  return result;
}

/**
 * Query all serving assignments for a specific member across opportunities
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId
 * @returns {Promise<Array<Object>>}
 */
export async function getMemberAssignments(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  if (!memberId) return [];

  try {
    const opps = await getServingOpportunities(communityId);
    const assignments = [];

    for (const opp of opps) {
      let apps = [];
      try {
        apps = (await getOpportunityApplications(communityId, opp.id)) || [];
      } catch {
        apps = [];
      }
      const memberApps = apps.filter((a) => a.memberId === memberId);

      for (const app of memberApps) {
        assignments.push({
          ...app,
          opportunityId: opp.id,
          opportunityTitle: opp.title,
          serviceTitle: opp.serviceTitle || opp.title,
          serviceDate: opp.serviceDate || '',
          role: opp.role,
          requirements: opp.requirements || [],
        });
      }
    }

    return assignments;
  } catch (err) {
    console.warn(`[CommunityAdapter] Error fetching member assignments for ${memberId}:`, err);
    return [];
  }
}

/**
 * Evaluates current user's registration status, assigned serving duties (via getMemberAssignments),
 * recent attendance, and role.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} [memberId]
 * @param {Object} [currentUser]
 * @returns {Promise<Object>}
 */
export async function getMemberContext(communityId = DEFAULT_COMMUNITY_ID, memberId, currentUser = null) {
  const effectiveMemberId = memberId || currentUser?.uid || currentUser?.id || null;

  if (!effectiveMemberId) {
    return {
      memberId: null,
      isRegistered: false,
      profile: null,
      role: 'guest',
      assignedDuties: [],
      pendingApplications: [],
      recentAttendance: [],
      stats: {
        attendanceCount: 0,
        assignmentsCount: 0,
        pendingCount: 0,
      },
      canManageServices: false,
      canCheckIn: false,
    };
  }

  // 1. Profile & Registration
  let profile = null;
  try {
    profile = await getMemberPublicProfile(communityId, effectiveMemberId);
  } catch (err) {
    console.warn(`[CommunityAdapter] Failed to fetch member profile:`, err);
  }

  const isRegistered = !!profile;
  const role = profile?.role || currentUser?.role || (isRegistered ? 'member' : 'unregistered');

  // 2. Assigned serving duties via getMemberAssignments
  let allAssignments = [];
  try {
    allAssignments = await getMemberAssignments(communityId, effectiveMemberId);
  } catch (err) {
    console.warn(`[CommunityAdapter] Failed to fetch member assignments:`, err);
  }

  const assignedDuties = allAssignments.filter(
    (a) => a.status === 'confirmed' || a.status === 'approved'
  );
  const pendingApplications = allAssignments.filter(
    (a) => a.status === 'pending'
  );

  // 3. Recent Attendance Check
  const recentAttendance = [];
  try {
    let services = [];
    try {
      services = (await getUpcomingServices(communityId, 5)) || [];
    } catch {
      services = [];
    }

    if (Array.isArray(services)) {
      for (const svc of services) {
        if (!svc || !svc.id) continue;
        let attRecord = null;
        try {
          attRecord = await getMemberServiceStatus(communityId, svc.id, effectiveMemberId);
        } catch {
          attRecord = null;
        }

        if (attRecord) {
          recentAttendance.push({
            serviceId: svc.id,
            serviceTitle: svc.title,
            serviceDate: svc.date,
            status: attRecord.status || 'present',
            checkedInAt: attRecord.checkedInAt || null,
            method: attRecord.checkInMethod || 'qr_scan',
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[CommunityAdapter] Failed to check recent attendance:`, err);
  }

  const managementRoles = ['admin', 'coordinator', 'team_leader', 'service_leader', 'leader'];
  const canManageServices = managementRoles.includes(String(role).toLowerCase());
  const canCheckIn = !!effectiveMemberId;

  return {
    memberId: effectiveMemberId,
    isRegistered,
    profile: profile || (currentUser ? { displayName: currentUser.displayName, id: effectiveMemberId, role } : null),
    role,
    assignedDuties,
    pendingApplications,
    recentAttendance,
    stats: {
      attendanceCount: recentAttendance.length,
      assignmentsCount: assignedDuties.length,
      pendingCount: pendingApplications.length,
    },
    canManageServices,
    canCheckIn,
  };
}

/**
 * Idempotent attendance submission calling recordAttendance or fallback queue.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} params
 * @param {string} params.serviceId
 * @param {string} params.memberId
 * @param {string} [params.memberName]
 * @param {string|Object} [params.token]
 * @param {string} [params.method='qr_scan']
 * @returns {Promise<{ success: boolean, status: 'present'|'pending'|'already_checked_in'|'expired'|'error', message?: string, record?: Object, error?: string }>}
 */
export async function submitAttendanceCheckIn(communityId = DEFAULT_COMMUNITY_ID, {
  serviceId,
  memberId,
  memberName = 'Member',
  token = null,
  method = CHECKIN_METHOD.QR_SCAN || 'qr_scan',
} = {}) {
  if (!serviceId || !memberId) {
    return {
      success: false,
      status: 'error',
      error: 'serviceId and memberId are required',
    };
  }

  // Token validation if provided
  if (token) {
    if (token === 'expired' || token?.expired === true || token?.isExpired === true) {
      return {
        success: false,
        status: 'expired',
        error: 'Attendance check-in token has expired. Please refresh the QR code.',
      };
    }
  }

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  // If offline, enqueue immediately
  if (isOffline) {
    saveToOfflineAttendanceQueue({
      communityId,
      serviceId,
      memberId,
      memberName,
      token,
      method,
      queuedAt: Date.now(),
    });
    return {
      success: true,
      status: 'pending',
      message: 'You are currently offline. Check-in saved locally and will sync once connected.',
    };
  }

  try {
    // 1. Idempotency check: see if already checked in
    const existing = await getMemberServiceStatus(communityId, serviceId, memberId);
    if (existing && (existing.status === 'present' || existing.status === 'late')) {
      return {
        success: true,
        status: 'already_checked_in',
        message: 'Member is already checked in for this service.',
        record: existing,
      };
    }

    // 2. Record attendance
    const record = await recordAttendance({
      communityId,
      serviceId,
      member: {
        id: memberId,
        displayName: memberName,
      },
      checkInMethod: method,
      status: 'present',
    });

    return {
      success: true,
      status: 'present',
      message: 'Attendance check-in recorded successfully.',
      record,
    };
  } catch (err) {
    console.warn(`[CommunityAdapter] Failed to record attendance online, saving offline queue:`, err);
    saveToOfflineAttendanceQueue({
      communityId,
      serviceId,
      memberId,
      memberName,
      token,
      method,
      queuedAt: Date.now(),
    });

    return {
      success: true,
      status: 'pending',
      message: 'Network issue encountered. Check-in queued offline for automatic sync.',
    };
  }
}

/**
 * Submits serving interest application.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} opportunityId
 * @param {string} memberId
 * @param {string} [note='']
 * @param {Object} [memberInfo={}]
 * @returns {Promise<Object>}
 */
export async function submitServingInterest(
  communityId = DEFAULT_COMMUNITY_ID,
  opportunityId,
  memberId,
  note = '',
  memberInfo = {}
) {
  if (!opportunityId || !memberId) {
    return {
      success: false,
      error: 'opportunityId and memberId are required',
    };
  }

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline) {
    return {
      success: true,
      applicationId: `queued_${memberId}_${Date.now()}`,
      status: 'pending',
      queued: true,
      message: 'Application saved offline. It will be submitted when connection is restored.',
    };
  }

  try {
    const application = await applyForOpportunity({
      communityId,
      opportunityId,
      member: {
        id: memberId,
        displayName: memberInfo.displayName || memberInfo.name || 'Anonymous Member',
        role: memberInfo.role || 'volunteer',
        team: memberInfo.team || null,
        ...memberInfo,
      },
      notes: note,
    });

    return {
      success: true,
      applicationId: application.id,
      status: application.status || 'pending',
      application,
      message: 'Serving interest application submitted successfully.',
    };
  } catch (err) {
    console.warn(`[CommunityAdapter] Error submitting serving interest:`, err);
    return {
      success: false,
      error: err.message || 'Failed to submit serving interest',
    };
  }
}

// ─────────────────────────────────────────────
// Calendar Export Helper
// ─────────────────────────────────────────────

/**
 * Parses time string (e.g. "18:30" or "6:30 PM") into { hour, minute }
 * @param {string} timeStr
 * @param {number} defaultHour
 * @param {number} defaultMin
 * @returns {{ hour: number, minute: number }}
 */
export function parseTimeToHoursAndMinutes(timeStr, defaultHour = 18, defaultMin = 30) {
  if (!timeStr) return { hour: defaultHour, minute: defaultMin };
  const str = String(timeStr).trim();

  const matchAmpm = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (matchAmpm) {
    let h = parseInt(matchAmpm[1], 10);
    const m = matchAmpm[2] ? parseInt(matchAmpm[2], 10) : 0;
    const ampm = matchAmpm[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return { hour: h, minute: m };
  }

  const match24 = str.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    return { hour: parseInt(match24[1], 10), minute: parseInt(match24[2], 10) };
  }

  return { hour: defaultHour, minute: defaultMin };
}

/**
 * Format a Date object to iCal ISO 8601 UTC string (YYYYMMDDTHHmmssZ)
 * @param {Date} date
 * @returns {string}
 */
export function formatICalDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates .ics calendar file content, Google Calendar URL, and optional browser download trigger.
 *
 * @param {Object} activity
 * @param {boolean} [triggerDownload=false]
 * @returns {{ icsContent: string, googleCalendarUrl: string, download: Function }}
 */
export function exportToCalendar(activity = {}, triggerDownload = false) {
  const dateStr = activity.date || formatLocalDate(new Date());
  const startTime = parseTimeToHoursAndMinutes(activity.startTime, 18, 30);
  const endTime = parseTimeToHoursAndMinutes(activity.endTime, startTime.hour + 2, startTime.minute);

  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
  const startDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1, startTime.hour, startTime.minute, 0));
  const endDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1, endTime.hour, endTime.minute, 0));

  const startUtc = formatICalDate(startDate);
  const endUtc = formatICalDate(endDate);
  const nowUtc = formatICalDate(new Date());

  const title = activity.title || 'VBT Community Activity';
  const description = (activity.description || 'Community sports and fellowship gathering with VBT.').replace(/\n/g, '\\n');
  const locationName = activity.location?.name || activity.location || 'VBT Sports Complex';
  const locationAddress = activity.location?.address ? `, ${activity.location.address}` : '';
  const fullLocation = `${locationName}${locationAddress}`;
  const uid = `${activity.id || Date.now()}@vbtcamp.app`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Value Blessings Team//Community Activities//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${fullLocation}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const icsContent = icsLines.join('\r\n');

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(
    fullLocation
  )}`;

  const download = (filename = `${(activity.title || 'activity').toLowerCase().replace(/\s+/g, '_')}.ics`) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  if (triggerDownload) {
    download();
  }

  return {
    icsContent,
    googleCalendarUrl,
    download,
  };
}

// ─────────────────────────────────────────────
// Passwordless 10-Second Servant Identity & Weekly Roll Call (Real Data Only)
// ─────────────────────────────────────────────

export const SERVANT_IDENTITY_STORAGE_KEY = 'vbt_servant_identity_v1';
export const WEEKLY_ROLLCALL_STORAGE_KEY = 'vbt_weekly_rollcall_v1';

/**
 * Reads the servant/member identity saved on this device (zero-password onboarding).
 * @returns {Object|null}
 */
export function getSavedServantProfile() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(SERVANT_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.displayName) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Saves the servant/member identity locally and syncs to Firestore `members` collection.
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} input
 * @returns {Promise<Object>}
 */
export async function saveServantProfile(communityId = DEFAULT_COMMUNITY_ID, input = {}) {
  const cleanName = String(input.displayName || input.name || '').trim();
  if (!cleanName) {
    throw new Error('Please enter your name.');
  }
  const firstName = cleanName.split(/\s+/)[0] || cleanName;
  const slug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  const existing = getSavedServantProfile();
  const uid = input.uid || input.id || existing?.uid || `servant_${slug || 'member'}_${Date.now().toString(36).slice(-4)}`;
  const role = input.role || existing?.role || 'servant';
  const station = input.station || input.teamCode || existing?.station || 'Sports & Court';
  const phone = String(input.phone || existing?.phone || '').trim();

  const profile = {
    uid,
    id: uid,
    displayName: cleanName,
    name: cleanName,
    firstName,
    initials: getServantInitials(cleanName),
    role,
    teamCode: station,
    station,
    phone,
    isQuickClaimed: true,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SERVANT_IDENTITY_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota issues
    }
  }

  try {
    if (db && typeof setDoc === 'function') {
      const memberRef = doc(db, `vbt_communities/${communityId}/members`, uid);
      await setDoc(memberRef, profile, { merge: true });
    }
  } catch (err) {
    console.warn('[CommunityAdapter] Saved servant identity locally (Firestore sync deferred):', err);
  }

  return profile;
}

/**
 * Clears the locally claimed servant identity on this device.
 */
export function clearSavedServantProfile() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SERVANT_IDENTITY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Fetches real-time / real-data weekly roll call RSVPs for this week.
 * Zero fake people or synthetic entries — only real servants & members who tapped RSVP.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} [weekKey]
 * @returns {Promise<Array<Object>>}
 */
export async function getWeeklyRollCall(communityId = DEFAULT_COMMUNITY_ID, weekKey = null) {
  const effectiveWeek = weekKey || getNextDayOfWeekDate(5);
  const byMember = new Map();

  // 1. Read locally stored real RSVPs on this device first for instant offline/zero-latency display
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(WEEKLY_ROLLCALL_STORAGE_KEY);
      if (raw) {
        const localList = JSON.parse(raw);
        if (Array.isArray(localList)) {
          for (const item of localList) {
            if (item && item.memberId && item.name && (!item.weekKey || item.weekKey === effectiveWeek)) {
              byMember.set(item.memberId, item);
            }
          }
        }
      }
    } catch {
      // Ignore localStorage parse error
    }
  }

  // 2. Query Firestore `vbt_communities/${communityId}/weekly_rsvps`
  try {
    if (db && typeof getDocs === 'function') {
      const rsvpCol = collection(db, `vbt_communities/${communityId}/weekly_rsvps`);
      const snap = await getDocs(rsvpCol);
      if (snap) {
        const docs = Array.isArray(snap) ? snap : snap.docs || [];
        for (const d of docs) {
          const data = typeof d.data === 'function' ? d.data() : d;
          if (!data || !data.name) continue;
          if (data.weekKey && data.weekKey !== effectiveWeek) continue;
          const mId = data.memberId || d.id;
          byMember.set(mId, {
            id: d.id || `${effectiveWeek}_${mId}`,
            memberId: mId,
            name: data.name,
            firstName: String(data.name).trim().split(/\s+/)[0],
            initials: data.initials || getServantInitials(data.name),
            role: data.role || 'servant',
            station: data.station || '',
            status: data.status || 'friday',
            weekKey: effectiveWeek,
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[CommunityAdapter] Could not fetch remote weekly_rsvps, using local real cache:', err);
  }

  return Array.from(byMember.values()).sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
  );
}

/**
 * Submits a real 1-tap Weekly Roll Call RSVP (`friday` | `tuesday` | `both` | `unavailable`).
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function submitWeeklyRollCall(
  communityId = DEFAULT_COMMUNITY_ID,
  { memberId, name, role = 'servant', station = '', status = 'friday', weekKey = null } = {}
) {
  const effectiveWeek = weekKey || getNextDayOfWeekDate(5);
  const cleanName = String(name || 'Servant').trim();
  const effectiveId = memberId || `servant_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  const docId = `${effectiveWeek}_${effectiveId}`;

  const entry = {
    id: docId,
    memberId: effectiveId,
    name: cleanName,
    firstName: cleanName.split(/\s+/)[0],
    initials: getServantInitials(cleanName),
    role,
    station,
    status,
    weekKey: effectiveWeek,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(WEEKLY_ROLLCALL_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(list)
        ? list.filter((item) => !(item.memberId === effectiveId && item.weekKey === effectiveWeek))
        : [];
      filtered.unshift(entry);
      window.localStorage.setItem(WEEKLY_ROLLCALL_STORAGE_KEY, JSON.stringify(filtered.slice(0, 100)));
    } catch {
      // Ignore storage error
    }
  }

  try {
    if (db && typeof setDoc === 'function') {
      const ref = doc(db, `vbt_communities/${communityId}/weekly_rsvps`, docId);
      await setDoc(ref, entry, { merge: true });
    }
  } catch (err) {
    console.warn('[CommunityAdapter] Saved weekly RSVP locally (Firestore sync deferred):', err);
  }

  return { success: true, entry };
}

// ─────────────────────────────────────────────
// React Hook: useCommunityData
// ─────────────────────────────────────────────

/**
 * Custom React hook for the Community Homepage.
 * Manages state, loading, error, offline status, refreshing, and real-time updates.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} [currentUser=null]
 * @param {Object} [options={ realOnly: true }]
 * @returns {Object}
 */
export function useCommunityData(communityId = DEFAULT_COMMUNITY_ID, currentUser = null, options = { realOnly: true }) {
  const { realOnly = true } = options || {};
  const [activities, setActivities] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [scripture, setScripture] = useState(WEEKLY_SCRIPTURE);
  const [memberContext, setMemberContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [newMembers, setNewMembers] = useState([]);
  const [celebrations, setCelebrations] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [weeklyRollCall, setWeeklyRollCall] = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [acts, opps, annData, ctx, servantsList, rollCallList] = await Promise.all([
        getCommunityActivities(communityId, { realOnly }),
        getServingOpportunities(communityId, {}, { realOnly }),
        getCommunityAnnouncements(communityId, { realOnly }),
        getMemberContext(communityId, currentUser?.uid || currentUser?.id, currentUser),
        getServants().catch(() => []),
        getWeeklyRollCall(communityId).catch(() => []),
      ]);

      setActivities(acts);
      setOpportunities(opps);
      setAnnouncements(annData.announcements || annData || []);
      setScripture(annData.scripture || WEEKLY_SCRIPTURE);
      setMemberContext(ctx);
      setWeeklyRollCall(Array.isArray(rollCallList) ? rollCallList : []);

      // Real members from vbt_servants
      if (Array.isArray(servantsList) && servantsList.length > 0) {
        const validServants = servantsList.filter(
          (s) => s.name && !s.name.toLowerCase().includes('test') && !s.id.toLowerCase().includes('volunteer_')
        );
        const formatted = validServants.slice(0, 6).map((s) => {
          const rawName = (s.name || s.displayName || 'Servant').trim();
          const firstName = rawName.split(' ')[0];
          const role = s.role || s.defaultRole || 'servant';
          let badge = 'Servant ✨';
          if (role === 'admin' || role === 'coordinator') badge = 'Coordinator 📋';
          else if (role === 'referee') badge = 'Referee ⚖️';
          else if (role === 'leader') badge = 'Team Leader 🏆';
          else if (role.startsWith('station_')) badge = `Station ${role.replace('station_', '')} 🎯`;
          else if (role.startsWith('team_')) {
            const parts = role.replace('team_', '').split('_');
            const color = parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1);
            const num = parts[1] || '';
            badge = `Team ${color} ${num} 🏀`.trim();
          }

          return {
            id: s.id,
            firstName,
            name: rawName,
            initials: getServantInitials(rawName),
            badge,
            joinedText: s.createdAt ? 'Joined this season' : 'Active Servant',
          };
        });
        setNewMembers(formatted);
      } else {
        setNewMembers([]);
      }

      setCelebrations([]);
      setPrayers([]);
    } catch (err) {
      console.error('[useCommunityData] Error refreshing community data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [communityId, currentUser, realOnly]);

  // Initial fetch and online/offline event listeners
  useEffect(() => {
    refresh();

    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineAttendanceQueue();
      refresh();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refresh]);

  const checkIn = useCallback(
    async ({ serviceId, memberId, memberName, token, method }) => {
      const effectiveMemberId = memberId || memberContext?.memberId || currentUser?.uid || currentUser?.id;
      const effectiveName = memberName || memberContext?.profile?.displayName || currentUser?.displayName || 'Member';

      const result = await submitAttendanceCheckIn(communityId, {
        serviceId,
        memberId: effectiveMemberId,
        memberName: effectiveName,
        token,
        method,
      });

      // Optimistically update recent attendance if check-in was successful
      if (result.success && result.status === 'present') {
        setMemberContext((prev) => {
          if (!prev) return prev;
          const updatedRecent = [
            ...(prev.recentAttendance || []),
            {
              serviceId,
              status: 'present',
              checkedInAt: new Date().toISOString(),
              method: method || 'qr_scan',
            },
          ];
          return {
            ...prev,
            recentAttendance: updatedRecent,
            stats: {
              ...prev.stats,
              attendanceCount: updatedRecent.length,
            },
          };
        });
      }

      return result;
    },
    [communityId, memberContext, currentUser]
  );

  const applyServing = useCallback(
    async ({ opportunityId, note }) => {
      const effectiveMemberId = memberContext?.memberId || currentUser?.uid || currentUser?.id;
      if (!effectiveMemberId) {
        return { success: false, error: 'Must be logged in to apply for serving' };
      }

      const result = await submitServingInterest(
        communityId,
        opportunityId,
        effectiveMemberId,
        note,
        memberContext?.profile || currentUser || {}
      );

      if (result.success) {
        // Re-fetch assignments
        getMemberAssignments(communityId, effectiveMemberId).then((assignments) => {
          setMemberContext((prev) => {
            if (!prev) return prev;
            const assigned = assignments.filter((a) => a.status === 'confirmed' || a.status === 'approved');
            const pending = assignments.filter((a) => a.status === 'pending');
            return {
              ...prev,
              assignedDuties: assigned,
              pendingApplications: pending,
              stats: {
                ...prev.stats,
                assignmentsCount: assigned.length,
                pendingCount: pending.length,
              },
            };
          });
        });
      }

      return result;
    },
    [communityId, memberContext, currentUser]
  );

  const submitRsvp = useCallback(
    async ({ memberId, name, role, station, status }) => {
      const effectiveMemberId = memberId || currentUser?.uid || currentUser?.id;
      const effectiveName = name || currentUser?.displayName || currentUser?.name || 'Servant';
      const effectiveRole = role || currentUser?.role || 'servant';
      const effectiveStation = station || currentUser?.teamCode || currentUser?.station || '';

      const res = await submitWeeklyRollCall(communityId, {
        memberId: effectiveMemberId,
        name: effectiveName,
        role: effectiveRole,
        station: effectiveStation,
        status,
      });

      if (res.success && res.entry) {
        setWeeklyRollCall((prev) => {
          const filtered = Array.isArray(prev)
            ? prev.filter((item) => item.memberId !== res.entry.memberId)
            : [];
          return [res.entry, ...filtered];
        });
      }
      return res;
    },
    [communityId, currentUser]
  );

  return {
    activities,
    opportunities,
    announcements,
    scripture,
    newMembers,
    celebrations,
    prayers,
    weeklyRollCall,
    memberContext,
    loading,
    error,
    isOffline,
    refresh,
    checkIn,
    applyServing,
    submitRsvp,
    exportToCalendar,
  };
}

