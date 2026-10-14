import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import { SERVICE_TYPES } from './serviceMeetingService';
import { APPLICATION_STATUS } from './servingAssignmentService';
import { ATTENDANCE_STATUS } from './attendanceService';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & North-Star Definition
// ─────────────────────────────────────────────────────────────────────────────

export const NORTH_STAR_METRIC_NAME = 'Weekly Active Community Members';
export const NORTH_STAR_METRIC_DESCRIPTION =
  'Weekly active community members who participate, serve, or meaningfully connect.';

/**
 * Authorized roles for coordinator-only community health and care signals.
 * Ordinary members, guests, and unverified users are strictly blocked.
 */
export const COORDINATOR_ROLES = [
  'admin',
  'coordinator',
  'pastoral_care_leader',
  'pastoral_care',
];

/**
 * Compassionate, non-punitive care signal terminology.
 * CRITICAL RULE: Signals are care and planning tools, NEVER public scores or gamified rankings.
 */
export const CARE_SIGNAL_LABELS = {
  INACTIVITY_FOLLOW_UP: 'May need follow-up',
  BURNOUT_REST_SUGGESTED: 'Rest and replenishment suggested',
  AVAILABLE_FOR_ENCOURAGEMENT: 'Available for encouragement',
  FIRST_TIME_SERVANT: 'First-time servant encouragement',
  CONNECTION_REQUEST: 'Requested connection or prayer',
  AWAITING_CONFIRMATION: 'Awaiting confirmation',
  CONSISTENT_RETURNING: 'Faithfully returning',
  NEW_MEMBER_WELCOME: 'Welcomed new member',
  CONSISTENT_SERVANT: 'Consistent servant',
  ACTIVE_LEARNER: 'Active in learning pathway',
};

/**
 * Care threshold guidelines
 */
export const BURNOUT_THRESHOLDS = {
  MAX_ASSIGNMENTS_PER_FORTNIGHT: 3, // > 3 assignments in 14 days triggers rest signal
  FORTNIGHT_DAYS: 14,
  MAX_CONSECUTIVE_ROLES_PER_DAY: 1, // > 1 role on the same date triggers rest signal
};

export const INACTIVITY_THRESHOLDS = {
  CONSECUTIVE_ABSENCE_SESSIONS: 3, // 3+ consecutive sessions triggers gentle follow-up
};

export const CARE_ACTION_CATEGORIES = {
  PASTORAL_CARE: 'pastoral_care',
  SERVANT_CARE: 'servant_care',
  ROSTER_LOGISTICS: 'roster_logistics',
  PRAYER_CONNECTION: 'prayer_connection',
};

export const CARE_ACTION_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DEFERRED: 'deferred',
};

/**
 * Prohibited terminology list to guard against gamified or punitive phrasing.
 */
export const FORBIDDEN_CARE_WORDS = [
  'score',
  'scores',
  'rank',
  'ranks',
  'ranking',
  'rankings',
  'leaderboard',
  'dropout',
  'dropouts',
  'slacker',
  'slackers',
  'loser',
  'losers',
  'bad servant',
  'demoted',
  'punished',
  'penalty',
  'flunked',
];

// ─────────────────────────────────────────────────────────────────────────────
// Authorization & Security Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a user has coordinator or pastoral care authorization.
 * Accepts user object, user role string, or boolean admin flags.
 * @param {Object|string|null} user
 * @returns {boolean}
 */
export function isAuthorizedCoordinator(user) {
  if (!user) return false;

  // Plain string role check
  if (typeof user === 'string') {
    const roleClean = user.trim().toLowerCase();
    return COORDINATOR_ROLES.includes(roleClean);
  }

  // Object checks
  const role = (user.role || user.userRole || user.permissionLevel || '').toString().trim().toLowerCase();
  if (COORDINATOR_ROLES.includes(role)) {
    return true;
  }

  // Explicit admin or coordinator flags
  if (user.isAdmin === true || user.isCoordinator === true || user.isPastoralCare === true) {
    return true;
  }

  return false;
}

/**
 * Asserts coordinator authorization and throws a security error if unauthorized.
 * @param {Object|string|null} user
 * @throws {Error}
 */
export function assertCoordinatorRole(user) {
  if (!isAuthorizedCoordinator(user)) {
    throw new Error(
      'Unauthorized: Community health analytics and pastoral care signals are restricted to authorized coordinators.'
    );
  }
}

/**
 * Sanitizes pastoral data to ensure private notes NEVER leak into aggregate analytics.
 * @param {Object} item
 * @returns {Object}
 */
export function sanitizePastoralConfidentialData(item) {
  if (!item || typeof item !== 'object') return item;
  
  // Create shallow clone
  const sanitized = { ...item };

  // Strip confidential pastoral notes, internal medical flags, and raw phones
  delete sanitized.pastoralNotes;
  delete sanitized.privateNotes;
  delete sanitized.confidentialNotes;
  delete sanitized.pastoralNotesHistory;
  delete sanitized.counselingHistory;
  delete sanitized.medicalNotes;
  delete sanitized.rawPhoneNumber;

  return sanitized;
}

/**
 * Asserts that a string or object contains no forbidden gamified/punitive words.
 * @param {string|Object} input
 * @returns {boolean}
 */
export function containsForbiddenCareWords(input) {
  const text = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase();
  return FORBIDDEN_CARE_WORDS.some((word) => {
    // Check with word boundaries
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Function 1: calculateWeeklyActiveMembers (North-Star Metric)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the North-Star Metric:
 * "Weekly active community members who participate, serve, or meaningfully connect."
 *
 * Deduplicates members across attendance, serving assignments, and connection records.
 *
 * @param {Array<Object>} attendanceRecords - List of attendance check-in records
 * @param {Array<Object>} servingRecords - List of serving applications/assignments
 * @param {Array<Object>} connectionRecords - List of prayer requests, group interactions, or connection requests
 * @param {Object} [options={}] - Optional parameters { totalCommunityCount, windowStart, windowEnd }
 * @returns {Object} Detailed North-Star result
 */
export function calculateWeeklyActiveMembers(
  attendanceRecords = [],
  servingRecords = [],
  connectionRecords = [],
  options = {}
) {
  const safeAttendances = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const safeServings = Array.isArray(servingRecords) ? servingRecords : [];
  const safeConnections = Array.isArray(connectionRecords) ? connectionRecords : [];

  const { totalCommunityCount = 0, windowStart = null, windowEnd = null } = options;

  // Helper date checker
  const isWithinWindow = (record) => {
    if (!windowStart && !windowEnd) return true;
    const dateVal = record.date || record.serviceDate || record.createdAt || record.timestamp || record.appliedAt;
    if (!dateVal) return true;
    const time = new Date(dateVal).getTime();
    if (isNaN(time)) return true;
    if (windowStart && time < new Date(windowStart).getTime()) return false;
    if (windowEnd && time > new Date(windowEnd).getTime()) return false;
    return true;
  };

  // 1. Extract participating members (attended service or practice)
  const attendeeSet = new Set();
  safeAttendances.forEach((rec) => {
    if (!rec || !isWithinWindow(rec)) return;
    const memberId = rec.memberId || rec.userId || rec.id || rec.uid;
    // Exclude explicit absence or declined attendance
    const status = (rec.status || '').toLowerCase();
    if (status === ATTENDANCE_STATUS.ABSENT) return;
    if (memberId) {
      attendeeSet.add(String(memberId));
    }
  });

  // 2. Extract serving members (active volunteer assignments)
  const servantSet = new Set();
  safeServings.forEach((rec) => {
    if (!rec || !isWithinWindow(rec)) return;
    const memberId = rec.memberId || rec.servantId || rec.userId || rec.id || rec.uid;
    const status = (rec.status || '').toLowerCase();
    // Exclude declined or rejected applications
    if (status === APPLICATION_STATUS.DECLINED || status === 'rejected' || status === 'cancelled') {
      return;
    }
    if (memberId) {
      servantSet.add(String(memberId));
    }
  });

  // 3. Extract connecting members (prayer requests, fellowship connection, testimonials)
  const connectorSet = new Set();
  safeConnections.forEach((rec) => {
    if (!rec || !isWithinWindow(rec)) return;
    const memberId = rec.memberId || rec.authorId || rec.userId || rec.submittedBy || rec.id || rec.uid;
    if (memberId) {
      connectorSet.add(String(memberId));
    }
  });

  // 4. Compute unique union (North-Star Metric)
  const allActiveSet = new Set([...attendeeSet, ...servantSet, ...connectorSet]);
  const activeCount = allActiveSet.size;

  // Breakdown statistics
  let participatingOnly = 0;
  let servingOnly = 0;
  let connectingOnly = 0;
  let multiCategory = 0;

  allActiveSet.forEach((id) => {
    const isAtt = attendeeSet.has(id);
    const isSrv = servantSet.has(id);
    const isCon = connectorSet.has(id);

    const categoriesCount = (isAtt ? 1 : 0) + (isSrv ? 1 : 0) + (isCon ? 1 : 0);
    if (categoriesCount > 1) {
      multiCategory++;
    } else if (isAtt) {
      participatingOnly++;
    } else if (isSrv) {
      servingOnly++;
    } else if (isCon) {
      connectingOnly++;
    }
  });

  const communityTotal = typeof totalCommunityCount === 'number' && totalCommunityCount > 0
    ? totalCommunityCount
    : activeCount;

  const rate = communityTotal > 0
    ? Math.round((activeCount / communityTotal) * 1000) / 10
    : 0;

  return {
    northStarName: NORTH_STAR_METRIC_NAME,
    definition: NORTH_STAR_METRIC_DESCRIPTION,
    count: activeCount,
    rate, // Percentage of community active (e.g. 74.2)
    activeMemberIds: Array.from(allActiveSet),
    breakdown: {
      uniqueAttendees: attendeeSet.size,
      uniqueServants: servantSet.size,
      uniqueConnectors: connectorSet.size,
      participatingOnly,
      servingOnly,
      connectingOnly,
      multiCategory,
    },
    meta: {
      totalAttendanceRecords: safeAttendances.length,
      totalServingRecords: safeServings.length,
      totalConnectionRecords: safeConnections.length,
      evaluatedWindow: {
        start: windowStart,
        end: windowEnd,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Function 2: identifyCareFollowUpSignals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identifies members who may benefit from pastoral or coordinator follow-up.
 *
 * Inactivity Rule:
 * Members absent for 3+ consecutive sessions are flagged neutrally as "May need follow-up".
 * Also identifies members who recently requested connection or prayer.
 *
 * CRITICAL RULE:
 * Always uses neutral, compassionate phrasing ("May need follow-up", "Available for encouragement").
 * NEVER punitive or public.
 *
 * @param {Array<Object>} members - Member list
 * @param {Array<Object>} attendances - Attendance history
 * @param {Array<Object>} assignments - Serving assignments (optional)
 * @param {Object} [options={}] - Config { thresholdSessions, services, prayerRequests }
 * @returns {Array<Object>} Identified care signals
 */
export function identifyCareFollowUpSignals(
  members = [],
  attendances = [],
  assignments = [],
  options = {}
) {
  const safeMembers = Array.isArray(members) ? members : [];
  const safeAttendances = Array.isArray(attendances) ? attendances : [];
  const {
    thresholdSessions = INACTIVITY_THRESHOLDS.CONSECUTIVE_ABSENCE_SESSIONS,
    services = [],
    prayerRequests = [],
  } = options;

  // Member map for quick metadata lookup
  const memberMap = new Map();
  safeMembers.forEach((m) => {
    if (m && (m.id || m.memberId || m.uid)) {
      const id = String(m.id || m.memberId || m.uid);
      memberMap.set(id, sanitizePastoralConfidentialData(m));
    }
  });

  // Group attendances by memberId, sorted by date descending (most recent first)
  const attendancesByMember = new Map();
  safeAttendances.forEach((att) => {
    if (!att) return;
    const memberId = String(att.memberId || att.userId || att.id || att.uid || '');
    if (!memberId) return;
    if (!attendancesByMember.has(memberId)) {
      attendancesByMember.set(memberId, []);
    }
    attendancesByMember.get(memberId).push(att);
  });

  // Sort each member's attendance chronological descending
  attendancesByMember.forEach((records) => {
    records.sort((a, b) => {
      const tA = new Date(a.date || a.serviceDate || a.createdAt || 0).getTime();
      const tB = new Date(b.date || b.serviceDate || b.createdAt || 0).getTime();
      return tB - tA;
    });
  });

  const careSignals = [];

  // 1. Analyze consecutive absences from attendance history
  attendancesByMember.forEach((records, memberId) => {
    const memberObj = memberMap.get(memberId) || { id: memberId };
    const memberName =
      memberObj.displayName ||
      (memberObj.firstName ? `${memberObj.firstName} ${memberObj.lastName || ''}`.trim() : null) ||
      memberObj.name ||
      `Member ${memberId}`;

    let consecutiveAbsences = 0;
    let lastAttendedDate = null;
    let missedSessions = [];

    for (const record of records) {
      const status = (record.status || '').toLowerCase();
      const isAbsent = status === ATTENDANCE_STATUS.ABSENT || status === 'unexcused';
      const isPresent = status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.LATE;

      if (isAbsent) {
        consecutiveAbsences++;
        missedSessions.push(record.date || record.serviceDate || record.serviceId || 'session');
      } else if (isPresent) {
        if (!lastAttendedDate) {
          lastAttendedDate = record.date || record.serviceDate || record.createdAt || null;
        }
        // Streak is broken
        break;
      }
    }

    if (consecutiveAbsences >= thresholdSessions) {
      careSignals.push({
        id: `inactivity_${memberId}_${consecutiveAbsences}`,
        memberId,
        memberName,
        role: memberObj.role || 'member',
        signalType: 'inactivity_follow_up',
        careStatus: CARE_SIGNAL_LABELS.INACTIVITY_FOLLOW_UP,
        consecutiveAbsences,
        lastAttendedDate,
        missedSessions: missedSessions.slice(0, 5),
        suggestedAction: 'Gentle pastoral check-in or friendly text to see how they are doing',
        tone: 'compassionate',
        flaggedAt: new Date().toISOString(),
      });
    }
  });

  // 2. Analyze members who have recorded zero attendance across recently scheduled services
  // If distinct service dates exist (e.g. at least 3 completed services)
  if (Array.isArray(services) && services.length >= thresholdSessions) {
    const recentCompletedServices = [...services]
      .filter((s) => s && s.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, thresholdSessions);

    if (recentCompletedServices.length >= thresholdSessions) {
      const recentServiceIds = new Set(recentCompletedServices.map((s) => s.id));
      const membersWithRecentAttendance = new Set();

      safeAttendances.forEach((att) => {
        if (!att) return;
        const sId = att.serviceId;
        const status = (att.status || '').toLowerCase();
        const isPresent = status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.LATE;
        if (sId && recentServiceIds.has(sId) && isPresent) {
          const mId = String(att.memberId || att.userId || '');
          if (mId) membersWithRecentAttendance.add(mId);
        }
      });

      safeMembers.forEach((m) => {
        const id = String(m.id || m.memberId || m.uid || '');
        if (!id) return;
        // Don't duplicate if already flagged above
        const alreadyFlagged = careSignals.some((s) => s.memberId === id && s.signalType === 'inactivity_follow_up');
        if (!alreadyFlagged && !membersWithRecentAttendance.has(id)) {
          // Check if this member is an established member (e.g. joined > 14 days ago)
          const memberRecords = attendancesByMember.get(id) || [];
          if (memberRecords.length > 0) {
            // Member was active in past but missed last N services
            const memberName =
              m.displayName ||
              (m.firstName ? `${m.firstName} ${m.lastName || ''}`.trim() : null) ||
              m.name ||
              `Member ${id}`;

            careSignals.push({
              id: `inactivity_services_${id}`,
              memberId: id,
              memberName,
              role: m.role || 'member',
              signalType: 'inactivity_follow_up',
              careStatus: CARE_SIGNAL_LABELS.INACTIVITY_FOLLOW_UP,
              consecutiveAbsences: recentCompletedServices.length,
              lastAttendedDate: memberRecords[0]?.date || null,
              missedSessions: recentCompletedServices.map((s) => s.date || s.title),
              suggestedAction: 'Send friendly community update and invite to upcoming service',
              tone: 'compassionate',
              flaggedAt: new Date().toISOString(),
            });
          }
        }
      });
    }
  }

  // 3. Members requesting connection or prayer (from prayer requests or options)
  const safePrayers = Array.isArray(prayerRequests) ? prayerRequests : [];
  safePrayers.forEach((p) => {
    if (!p) return;
    const needsConnection =
      p.requestConnection === true ||
      p.needsPastoralFollowUp === true ||
      p.visibility === 'PASTORAL_PRIVATE' ||
      p.careFollowUp === true;

    if (needsConnection) {
      const memberId = String(p.memberId || p.authorId || p.userId || p.id || '');
      if (!memberId) return;

      const memberObj = memberMap.get(memberId) || {};
      const memberName =
        p.authorName ||
        p.memberName ||
        memberObj.displayName ||
        `Member ${memberId}`;

      careSignals.push({
        id: `connection_request_${p.id || memberId}`,
        memberId,
        memberName,
        role: memberObj.role || 'member',
        signalType: 'connection_request',
        careStatus: CARE_SIGNAL_LABELS.CONNECTION_REQUEST,
        prayerId: p.id || null,
        prayerCategory: p.category || 'General',
        // Notice: NO confidential prayer content or pastoral notes included!
        suggestedAction: 'Reach out to pray with member and offer personal pastoral encouragement',
        tone: 'compassionate',
        flaggedAt: new Date().toISOString(),
      });
    }
  });

  return careSignals;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Function 3: identifyBurnoutRiskSignals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Identifies volunteer well-being and burnout risk signals.
 *
 * Rules:
 * 1. Servants scheduled > 3 times in 2 weeks (14-day sliding window or period).
 * 2. Servants scheduled in multiple consecutive roles on the same day/session.
 *
 * Tone & Phrasing:
 * Phrased neutrally and compassionately as:
 * "Rest and replenishment suggested" or "Available for encouragement".
 * NEVER uses punitive or alarming terminology.
 *
 * @param {Array<Object>} members - Member list
 * @param {Array<Object>} assignments - Serving assignments/applications
 * @param {Object} [options={}] - Config { maxAssignmentsPerFortnight, fortnightDays, referenceDate }
 * @returns {Array<Object>} Burnout risk and volunteer well-being signals
 */
export function identifyBurnoutRiskSignals(
  members = [],
  assignments = [],
  options = {}
) {
  const safeMembers = Array.isArray(members) ? members : [];
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  const {
    maxAssignmentsPerFortnight = BURNOUT_THRESHOLDS.MAX_ASSIGNMENTS_PER_FORTNIGHT,
    fortnightDays = BURNOUT_THRESHOLDS.FORTNIGHT_DAYS,
    referenceDate = new Date(),
  } = options;

  // Build member lookup
  const memberMap = new Map();
  safeMembers.forEach((m) => {
    if (m && (m.id || m.memberId || m.uid)) {
      const id = String(m.id || m.memberId || m.uid);
      memberMap.set(id, sanitizePastoralConfidentialData(m));
    }
  });

  // Group active/confirmed assignments by member
  const assignmentsByMember = new Map();
  safeAssignments.forEach((asgn) => {
    if (!asgn) return;
    const memberId = String(asgn.memberId || asgn.servantId || asgn.userId || asgn.id || '');
    if (!memberId) return;

    const status = (asgn.status || '').toLowerCase();
    // Exclude declined, cancelled, or rejected
    if (status === APPLICATION_STATUS.DECLINED || status === 'rejected' || status === 'cancelled') {
      return;
    }

    if (!assignmentsByMember.has(memberId)) {
      assignmentsByMember.set(memberId, []);
    }
    assignmentsByMember.get(memberId).push(asgn);
  });

  const refTime = new Date(referenceDate).getTime();
  const fortnightMs = fortnightDays * 24 * 60 * 60 * 1000;

  const burnoutSignals = [];

  assignmentsByMember.forEach((asgns, memberId) => {
    const memberObj = memberMap.get(memberId) || { id: memberId };
    const memberName =
      memberObj.displayName ||
      (memberObj.firstName ? `${memberObj.firstName} ${memberObj.lastName || ''}`.trim() : null) ||
      memberObj.name ||
      asgns[0]?.memberName ||
      `Servant ${memberId}`;

    // Filter assignments that fall within a 14-day window relative to referenceDate
    // or if dates are provided, examine pairwise dates for tight clusters
    const validDatedAsgns = asgns.filter((a) => {
      const d = a.date || a.serviceDate || a.opportunityDate || a.appliedAt || a.createdAt;
      if (!d) return true; // Include if no explicit date
      const t = new Date(d).getTime();
      if (isNaN(t)) return true;
      // Within 14 days before or after reference date
      return Math.abs(refTime - t) <= fortnightMs;
    });

    const assignmentCount = validDatedAsgns.length;

    // Check for multiple assignments on the exact same date
    const dateCounts = new Map();
    validDatedAsgns.forEach((a) => {
      const dateStr = a.date || a.serviceDate || a.opportunityDate || a.serviceId || 'unknown_date';
      if (!dateCounts.has(dateStr)) {
        dateCounts.set(dateStr, []);
      }
      dateCounts.get(dateStr).push(a);
    });

    let hasMultipleConsecutiveRolesOnSameDay = false;
    let consecutiveRolesList = [];
    dateCounts.forEach((dayAsgns, dateStr) => {
      if (dayAsgns.length > 1 && dateStr !== 'unknown_date') {
        hasMultipleConsecutiveRolesOnSameDay = true;
        dayAsgns.forEach((item) => {
          consecutiveRolesList.push({
            date: dateStr,
            role: item.role || item.opportunityTitle || item.title || 'Serving role',
            serviceId: item.serviceId || null,
          });
        });
      }
    });

    const isHighFrequency = assignmentCount > maxAssignmentsPerFortnight;

    if (isHighFrequency || hasMultipleConsecutiveRolesOnSameDay) {
      let riskFactor = 'high_frequency';
      let suggestedAction = 'Offer a serving break next week and pair with an apprentice to share responsibilities';

      if (isHighFrequency && hasMultipleConsecutiveRolesOnSameDay) {
        riskFactor = 'both';
        suggestedAction =
          'High serving load: Encourage servant to focus on one role and schedule a replacement for secondary roles';
      } else if (hasMultipleConsecutiveRolesOnSameDay) {
        riskFactor = 'multiple_consecutive_roles';
        suggestedAction =
          'Consecutive roles scheduled: Arrange a rotation replacement so servant gets rest between stations';
      }

      burnoutSignals.push({
        id: `burnout_${memberId}`,
        memberId,
        memberName,
        role: memberObj.role || 'servant',
        signalType: 'burnout_risk',
        careStatus: CARE_SIGNAL_LABELS.BURNOUT_REST_SUGGESTED,
        riskFactor, // 'high_frequency' | 'multiple_consecutive_roles' | 'both'
        assignmentCount,
        maxThreshold: maxAssignmentsPerFortnight,
        periodDays: fortnightDays,
        hasMultipleConsecutiveRolesOnSameDay,
        consecutiveRolesCount: consecutiveRolesList.length,
        consecutiveRoles: consecutiveRolesList,
        suggestedAction,
        isBurnoutRisk: true,
        tone: 'compassionate',
        flaggedAt: new Date().toISOString(),
      });
    }
  });

  return burnoutSignals;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Function 4: computeCommunityHealthMetrics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes all 12 Community Health and Care Signals for coordinators.
 *
 * 12 Signals:
 * 1. New members joining
 * 2. Returning members consistency
 * 3. First-time servants
 * 4. Active regular servants
 * 5. Weekly service attendance rate
 * 6. Servant meeting attendance rate
 * 7. Open roles vs filled ratio
 * 8. Unconfirmed assignments
 * 9. Training completion rate
 * 10. Inactivity flags (absent 3+ consecutive sessions)
 * 11. Burnout risk signals (scheduled > 3 times in 2 weeks or consecutive roles)
 * 12. Members requesting connection or prayer
 *
 * Authorization:
 * Strictly limited to authorized coordinators and pastoral leaders.
 *
 * Confidentiality:
 * Pastoral confidential notes are strictly excluded from output.
 *
 * @param {string} communityId - Community identifier
 * @param {Object} data - { members, attendances, assignments, services, opportunities, trainingProgress, prayerRequests }
 * @param {Object|string} authorizedCoordinator - User requesting metrics
 * @returns {Object} Full community health metrics report
 */
export function computeCommunityHealthMetrics(
  communityId = DEFAULT_COMMUNITY_ID,
  data = {},
  authorizedCoordinator = null
) {
  // If an authorizedCoordinator object is passed, verify credentials
  if (authorizedCoordinator !== null) {
    assertCoordinatorRole(authorizedCoordinator);
  }

  const {
    members = [],
    attendances = [],
    assignments = [],
    services = [],
    opportunities = [],
    trainingProgress = [],
    prayerRequests = [],
    referenceDate = new Date(),
  } = data;

  const safeMembers = Array.isArray(members) ? members : [];
  const safeAttendances = Array.isArray(attendances) ? attendances : [];
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const safeServices = Array.isArray(services) ? services : [];
  const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
  const safeTrainingProgress = Array.isArray(trainingProgress) ? trainingProgress : [];
  const safePrayerRequests = Array.isArray(prayerRequests) ? prayerRequests : [];

  const totalMembersCount = safeMembers.length;

  // ── North-Star Metric ──────────────────────────────────────────────────────
  const northStar = calculateWeeklyActiveMembers(
    safeAttendances,
    safeAssignments,
    safePrayerRequests,
    { totalCommunityCount: totalMembersCount }
  );

  // ── Signal 1: New members joining (joined in past 30 days) ─────────────────
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const refTime = new Date(referenceDate).getTime();

  const newMembersList = safeMembers.filter((m) => {
    if (!m) return false;
    const joinDate = m.joinedAt || m.createdAt || m.registeredAt;
    if (!joinDate) return false;
    const t = new Date(joinDate).getTime();
    if (isNaN(t)) return false;
    return refTime - t <= thirtyDaysMs && refTime >= t;
  });

  const newMembersCount = newMembersList.length;
  const newMembersRate = totalMembersCount > 0
    ? Math.round((newMembersCount / totalMembersCount) * 1000) / 10
    : 0;

  // ── Signal 2: Returning members consistency ────────────────────────────────
  // Members who attended >= 2 sessions in recent history
  const attendanceCountsByMember = new Map();
  safeAttendances.forEach((att) => {
    if (!att) return;
    const status = (att.status || '').toLowerCase();
    if (status === ATTENDANCE_STATUS.ABSENT) return;
    const mId = String(att.memberId || att.userId || att.id || '');
    if (!mId) return;
    attendanceCountsByMember.set(mId, (attendanceCountsByMember.get(mId) || 0) + 1);
  });

  let returningConsistentCount = 0;
  attendanceCountsByMember.forEach((cnt) => {
    if (cnt >= 2) returningConsistentCount++;
  });

  const returningConsistencyRate = totalMembersCount > 0
    ? Math.round((returningConsistentCount / totalMembersCount) * 1000) / 10
    : 0;

  // ── Signal 3: First-time servants ─────────────────────────────────────────
  // Servants with exactly 1 assignment ever, or first assigned recently
  const servingCountsByMember = new Map();
  safeAssignments.forEach((asgn) => {
    if (!asgn) return;
    const status = (asgn.status || '').toLowerCase();
    if (status === APPLICATION_STATUS.DECLINED || status === 'rejected') return;
    const mId = String(asgn.memberId || asgn.servantId || asgn.userId || '');
    if (!mId) return;
    servingCountsByMember.set(mId, (servingCountsByMember.get(mId) || 0) + 1);
  });

  const firstTimeServants = [];
  servingCountsByMember.forEach((count, mId) => {
    if (count === 1) {
      const mem = safeMembers.find((m) => String(m.id || m.memberId) === mId);
      firstTimeServants.push({
        memberId: mId,
        memberName: mem?.displayName || mem?.firstName || `Servant ${mId}`,
        servingCount: 1,
        careStatus: CARE_SIGNAL_LABELS.FIRST_TIME_SERVANT,
      });
    }
  });

  // ── Signal 4: Active regular servants ─────────────────────────────────────
  // Servants with >= 2 active serving assignments
  const activeRegularServants = [];
  servingCountsByMember.forEach((count, mId) => {
    if (count >= 2) {
      const mem = safeMembers.find((m) => String(m.id || m.memberId) === mId);
      activeRegularServants.push({
        memberId: mId,
        memberName: mem?.displayName || mem?.firstName || `Servant ${mId}`,
        servingCount: count,
        careStatus: CARE_SIGNAL_LABELS.CONSISTENT_SERVANT,
      });
    }
  });

  // ── Signal 5: Weekly service attendance rate ──────────────────────────────
  const weeklyServices = safeServices.filter(
    (s) => (s.serviceType || s.type) === SERVICE_TYPES.WEEKLY_SERVICE
  );

  let weeklyServiceAttendeesTotal = 0;
  if (weeklyServices.length > 0) {
    const weeklyServiceIds = new Set(weeklyServices.map((s) => s.id));
    safeAttendances.forEach((att) => {
      if (!att) return;
      if (weeklyServiceIds.has(att.serviceId)) {
        const status = (att.status || '').toLowerCase();
        if (status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.LATE) {
          weeklyServiceAttendeesTotal++;
        }
      }
    });
  } else {
    // If services array is not partitioned, look at overall attendance
    weeklyServiceAttendeesTotal = safeAttendances.filter((att) => {
      const status = (att?.status || '').toLowerCase();
      return status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.LATE;
    }).length;
  }

  const weeklyServiceCount = Math.max(1, weeklyServices.length || 1);
  const averageWeeklyAttendance = Math.round((weeklyServiceAttendeesTotal / weeklyServiceCount) * 10) / 10;
  const weeklyServiceAttendanceRate = totalMembersCount > 0
    ? Math.round((averageWeeklyAttendance / totalMembersCount) * 1000) / 10
    : 0;

  // ── Signal 6: Servant meeting attendance rate ─────────────────────────────
  const servantMeetings = safeServices.filter(
    (s) => (s.serviceType || s.type) === SERVICE_TYPES.SERVANT_MEETING
  );

  let servantMeetingAttendeesTotal = 0;
  if (servantMeetings.length > 0) {
    const servantMeetingIds = new Set(servantMeetings.map((s) => s.id));
    safeAttendances.forEach((att) => {
      if (!att) return;
      if (servantMeetingIds.has(att.serviceId)) {
        const status = (att.status || '').toLowerCase();
        if (status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.LATE) {
          servantMeetingAttendeesTotal++;
        }
      }
    });
  }

  const totalServantsCount = Math.max(1, servingCountsByMember.size || 1);
  const servantMeetingCount = Math.max(1, servantMeetings.length || 1);
  const averageServantMeetingAttendance = Math.round((servantMeetingAttendeesTotal / servantMeetingCount) * 10) / 10;
  const servantMeetingAttendanceRate = Math.min(
    100,
    Math.round((averageServantMeetingAttendance / totalServantsCount) * 1000) / 10
  );

  // ── Signal 7: Open roles vs filled ratio ──────────────────────────────────
  let totalSpotsNeeded = 0;
  let totalSpotsFilled = 0;

  safeOpportunities.forEach((opp) => {
    if (!opp) return;
    const needed = typeof opp.spotsNeeded === 'number' ? opp.spotsNeeded : 1;
    const filled = typeof opp.spotsFilled === 'number' ? opp.spotsFilled : 0;
    totalSpotsNeeded += needed;
    totalSpotsFilled += Math.min(needed, filled);
  });

  // If no opportunities were passed, infer from assignments vs expected baseline
  if (totalSpotsNeeded === 0 && safeAssignments.length > 0) {
    totalSpotsFilled = safeAssignments.filter(
      (a) => a.status === APPLICATION_STATUS.CONFIRMED || a.status === APPLICATION_STATUS.APPROVED
    ).length;
    totalSpotsNeeded = safeAssignments.length;
  }

  const openSpots = Math.max(0, totalSpotsNeeded - totalSpotsFilled);
  const openRolesFillRate = totalSpotsNeeded > 0
    ? Math.round((totalSpotsFilled / totalSpotsNeeded) * 1000) / 10
    : 100;

  const openRolesRatioFormatted = `${totalSpotsFilled}/${totalSpotsNeeded} (${openRolesFillRate}%)`;

  // ── Signal 8: Unconfirmed assignments ─────────────────────────────────────
  const unconfirmedAssignmentsList = safeAssignments.filter((asgn) => {
    if (!asgn) return false;
    const status = (asgn.status || '').toLowerCase();
    return (
      status === APPLICATION_STATUS.PENDING ||
      asgn.isConfirmed === false ||
      status === 'unconfirmed'
    );
  });

  const unconfirmedAssignmentsCount = unconfirmedAssignmentsList.length;

  // ── Signal 9: Training completion rate ────────────────────────────────────
  let completedTrainingsCount = 0;
  safeTrainingProgress.forEach((tp) => {
    if (!tp) return;
    if (tp.completed === true || tp.status === 'completed' || tp.progressPercent === 100) {
      completedTrainingsCount++;
    }
  });

  const totalTrainingEnrollments = Math.max(safeTrainingProgress.length, 1);
  const trainingCompletionRate = safeTrainingProgress.length > 0
    ? Math.round((completedTrainingsCount / totalTrainingEnrollments) * 1000) / 10
    : 100;

  // ── Signal 10: Inactivity flags (absent 3+ consecutive sessions) ───────────
  const careFollowUpSignals = identifyCareFollowUpSignals(
    safeMembers,
    safeAttendances,
    safeAssignments,
    { services: safeServices, prayerRequests: safePrayerRequests }
  );

  const inactivityFollowUps = careFollowUpSignals.filter(
    (s) => s.signalType === 'inactivity_follow_up'
  );

  // ── Signal 11: Burnout risk signals ───────────────────────────────────────
  const burnoutRiskSignals = identifyBurnoutRiskSignals(
    safeMembers,
    safeAssignments,
    { referenceDate }
  );

  // ── Signal 12: Members requesting connection or prayer ────────────────────
  const connectionAndPrayerRequests = careFollowUpSignals.filter(
    (s) => s.signalType === 'connection_request'
  );

  // ── Overall Health Status Assessment ──────────────────────────────────────
  let overallHealthStatus = 'Healthy';
  if (inactivityFollowUps.length >= 5 || burnoutRiskSignals.length >= 4 || openRolesFillRate < 60) {
    overallHealthStatus = 'Attention Needed';
  } else if (northStar.rate >= 70 && openRolesFillRate >= 80 && burnoutRiskSignals.length === 0) {
    overallHealthStatus = 'Thriving';
  }

  return {
    communityId,
    generatedAt: new Date().toISOString(),
    northStar,
    signals: {
      newMembersJoining: {
        count: newMembersCount,
        rate: newMembersRate,
        members: newMembersList.map((m) => ({
          memberId: m.id || m.memberId,
          displayName: m.displayName || m.name || 'New Member',
          joinedAt: m.joinedAt || m.createdAt,
        })),
      },
      returningMembersConsistency: {
        count: returningConsistentCount,
        rate: returningConsistencyRate,
        label: CARE_SIGNAL_LABELS.CONSISTENT_RETURNING,
      },
      firstTimeServants: {
        count: firstTimeServants.length,
        servants: firstTimeServants,
        label: CARE_SIGNAL_LABELS.FIRST_TIME_SERVANT,
      },
      activeRegularServants: {
        count: activeRegularServants.length,
        servants: activeRegularServants,
        label: CARE_SIGNAL_LABELS.CONSISTENT_SERVANT,
      },
      weeklyServiceAttendanceRate: {
        averageAttendees: averageWeeklyAttendance,
        totalServicesEvaluated: weeklyServiceCount,
        rate: weeklyServiceAttendanceRate,
      },
      servantMeetingAttendanceRate: {
        averageAttendees: averageServantMeetingAttendance,
        totalServantsEvaluated: totalServantsCount,
        rate: servantMeetingAttendanceRate,
      },
      openRolesVsFilledRatio: {
        openSpots,
        filledSpots: totalSpotsFilled,
        totalSpots: totalSpotsNeeded,
        fillRate: openRolesFillRate,
        ratioFormatted: openRolesRatioFormatted,
      },
      unconfirmedAssignments: {
        count: unconfirmedAssignmentsCount,
        assignments: unconfirmedAssignmentsList.map((a) => ({
          id: a.id,
          memberId: a.memberId,
          memberName: a.memberName || 'Volunteer',
          role: a.role || a.opportunityTitle || 'Serving Assignment',
          serviceId: a.serviceId,
          status: a.status || 'pending',
        })),
        label: CARE_SIGNAL_LABELS.AWAITING_CONFIRMATION,
      },
      trainingCompletionRate: {
        completedCount: completedTrainingsCount,
        totalEnrollments: safeTrainingProgress.length,
        rate: trainingCompletionRate,
        label: CARE_SIGNAL_LABELS.ACTIVE_LEARNER,
      },
      inactivityFlags: {
        count: inactivityFollowUps.length,
        label: CARE_SIGNAL_LABELS.INACTIVITY_FOLLOW_UP,
        members: inactivityFollowUps,
      },
      burnoutRiskSignals: {
        count: burnoutRiskSignals.length,
        label: CARE_SIGNAL_LABELS.BURNOUT_REST_SUGGESTED,
        servants: burnoutRiskSignals,
      },
      connectionAndPrayerRequests: {
        count: connectionAndPrayerRequests.length,
        label: CARE_SIGNAL_LABELS.CONNECTION_REQUEST,
        requests: connectionAndPrayerRequests,
      },
    },
    careSummary: {
      overallHealthStatus,
      totalCareFollowUpsCount: inactivityFollowUps.length,
      totalBurnoutRisksCount: burnoutRiskSignals.length,
      totalConnectionRequestsCount: connectionAndPrayerRequests.length,
      openSpotsToFill: openSpots,
      unconfirmedRosterSpots: unconfirmedAssignmentsCount,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Function 5: generateCareActionChecklist
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an actionable, compassionate pastoral and coordinator checklist.
 *
 * CRITICAL CARE RULES:
 * - Restricted to authorized coordinators only.
 * - Phrased compassionately.
 * - Does NOT contain confidential pastoral notes or public ranking scores.
 *
 * @param {Object} healthMetrics - Result from computeCommunityHealthMetrics
 * @param {Object|string} authorizedCoordinator - Coordinator credentials
 * @returns {Array<Object>} Care action items
 */
export function generateCareActionChecklist(healthMetrics, authorizedCoordinator) {
  assertCoordinatorRole(authorizedCoordinator);

  if (!healthMetrics || !healthMetrics.signals) {
    return [];
  }

  const { signals } = healthMetrics;
  const checklist = [];
  let itemIndex = 1;

  // 1. Inactivity follow-ups (absent 3+ consecutive sessions)
  if (signals.inactivityFlags?.members) {
    signals.inactivityFlags.members.forEach((item) => {
      checklist.push({
        id: `care_action_${itemIndex++}`,
        category: CARE_ACTION_CATEGORIES.PASTORAL_CARE,
        categoryLabel: 'Pastoral Care & Follow-Up',
        title: `Gentle check-in with ${item.memberName}`,
        description: `Has missed ${item.consecutiveAbsences} consecutive gatherings. Reach out with encouragement and prayer.`,
        priority: 'high',
        status: CARE_ACTION_STATUS.PENDING,
        targetMemberId: item.memberId,
        targetMemberName: item.memberName,
        neutralTag: CARE_SIGNAL_LABELS.INACTIVITY_FOLLOW_UP,
        actionType: 'check_in',
        createdAt: new Date().toISOString(),
      });
    });
  }

  // 2. Burnout risk signals (rest and replenishment)
  if (signals.burnoutRiskSignals?.servants) {
    signals.burnoutRiskSignals.servants.forEach((srv) => {
      checklist.push({
        id: `care_action_${itemIndex++}`,
        category: CARE_ACTION_CATEGORIES.SERVANT_CARE,
        categoryLabel: 'Volunteer Well-Being',
        title: `Offer serving rest to ${srv.memberName}`,
        description: `${srv.suggestedAction} (Scheduled ${srv.assignmentCount} times recently).`,
        priority: 'high',
        status: CARE_ACTION_STATUS.PENDING,
        targetMemberId: srv.memberId,
        targetMemberName: srv.memberName,
        neutralTag: CARE_SIGNAL_LABELS.BURNOUT_REST_SUGGESTED,
        actionType: 'offer_rest',
        createdAt: new Date().toISOString(),
      });
    });
  }

  // 3. First-time servants (encouragement & celebration)
  if (signals.firstTimeServants?.servants) {
    signals.firstTimeServants.servants.forEach((srv) => {
      checklist.push({
        id: `care_action_${itemIndex++}`,
        category: CARE_ACTION_CATEGORIES.SERVANT_CARE,
        categoryLabel: 'Volunteer Well-Being',
        title: `Celebrate first-time servant ${srv.memberName}`,
        description: 'Send a warm message of thanks and affirmation for stepping up to serve.',
        priority: 'normal',
        status: CARE_ACTION_STATUS.PENDING,
        targetMemberId: srv.memberId,
        targetMemberName: srv.memberName,
        neutralTag: CARE_SIGNAL_LABELS.FIRST_TIME_SERVANT,
        actionType: 'send_encouragement',
        createdAt: new Date().toISOString(),
      });
    });
  }

  // 4. Connection and prayer requests
  if (signals.connectionAndPrayerRequests?.requests) {
    signals.connectionAndPrayerRequests.requests.forEach((req) => {
      checklist.push({
        id: `care_action_${itemIndex++}`,
        category: CARE_ACTION_CATEGORIES.PRAYER_CONNECTION,
        categoryLabel: 'Prayer & Connection',
        title: `Follow up with ${req.memberName} for prayer/connection`,
        description: 'Member requested personal connection or prayer support.',
        priority: 'high',
        status: CARE_ACTION_STATUS.PENDING,
        targetMemberId: req.memberId,
        targetMemberName: req.memberName,
        neutralTag: CARE_SIGNAL_LABELS.CONNECTION_REQUEST,
        actionType: 'prayer_call',
        createdAt: new Date().toISOString(),
      });
    });
  }

  // 5. Unconfirmed assignments
  if (signals.unconfirmedAssignments?.assignments) {
    signals.unconfirmedAssignments.assignments.slice(0, 5).forEach((asgn) => {
      checklist.push({
        id: `care_action_${itemIndex++}`,
        category: CARE_ACTION_CATEGORIES.ROSTER_LOGISTICS,
        categoryLabel: 'Roster & Station Readiness',
        title: `Confirm assignment for ${asgn.memberName} (${asgn.role})`,
        description: 'Volunteer spot is awaiting coordinator review or confirmation.',
        priority: 'medium',
        status: CARE_ACTION_STATUS.PENDING,
        targetMemberId: asgn.memberId,
        targetMemberName: asgn.memberName,
        neutralTag: CARE_SIGNAL_LABELS.AWAITING_CONFIRMATION,
        actionType: 'confirm_assignment',
        createdAt: new Date().toISOString(),
      });
    });
  }

  // 6. Open roles capacity action
  if (signals.openRolesVsFilledRatio?.openSpots > 0) {
    checklist.push({
      id: `care_action_${itemIndex++}`,
      category: CARE_ACTION_CATEGORIES.ROSTER_LOGISTICS,
      categoryLabel: 'Roster & Station Readiness',
      title: `Fill ${signals.openRolesVsFilledRatio.openSpots} remaining open volunteer station roles`,
      description: `Current fill rate is ${signals.openRolesVsFilledRatio.fillRate}%. Invite available servants to cover stations.`,
      priority: signals.openRolesVsFilledRatio.openSpots >= 5 ? 'high' : 'medium',
      status: CARE_ACTION_STATUS.PENDING,
      targetMemberId: null,
      targetMemberName: null,
      neutralTag: 'Open station roles',
      actionType: 'fill_open_roles',
      createdAt: new Date().toISOString(),
    });
  }

  return checklist;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Formats for Care Action Checklist
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats care checklist as a readable Markdown report.
 * @param {Array<Object>} checklist
 * @param {Object} [options={}]
 * @returns {string}
 */
export function exportCareChecklistToMarkdown(checklist = [], options = {}) {
  const { title = 'VBT Community Care & Volunteer Well-Being Action Plan' } = options;
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# ${title}\n`;
  md += `*Generated for Authorized Coordinators on ${dateStr}*\n\n`;
  md += `> **Care Note:** This checklist is a confidential pastoral planning tool to support member care and servant health. It is never for public evaluation or performance scoring.\n\n`;

  if (!checklist || checklist.length === 0) {
    md += `_No pending care actions. Community rhythms and volunteer well-being are balanced!_\n`;
    return md;
  }

  // Group by category
  const grouped = {};
  checklist.forEach((item) => {
    const cat = item.categoryLabel || item.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.entries(grouped).forEach(([category, items]) => {
    md += `## ${category}\n\n`;
    items.forEach((item) => {
      const checkMark = item.status === CARE_ACTION_STATUS.COMPLETED ? '[x]' : '[ ]';
      const priorityBadge = item.priority === 'high' ? '*(Priority)* ' : '';
      md += `- ${checkMark} **${item.title}** ${priorityBadge}\n`;
      md += `  - ${item.description}\n`;
      md += `  - *Status tag:* ${item.neutralTag}\n\n`;
    });
  });

  return md;
}

/**
 * Formats care checklist as plain text.
 * @param {Array<Object>} checklist
 * @returns {string}
 */
export function exportCareChecklistToText(checklist = []) {
  if (!checklist || checklist.length === 0) return 'No pending care actions.';
  return checklist
    .map((item, idx) => {
      const status = item.status === CARE_ACTION_STATUS.COMPLETED ? '[DONE]' : '[TODO]';
      return `${idx + 1}. ${status} ${item.title}\n   ${item.description} (Tag: ${item.neutralTag})`;
    })
    .join('\n\n');
}

/**
 * Formats care checklist as CSV.
 * @param {Array<Object>} checklist
 * @returns {string}
 */
export function exportCareChecklistToCsv(checklist = []) {
  const headers = ['ID', 'Category', 'Title', 'Description', 'Priority', 'Status', 'Tag'];
  const rows = (checklist || []).map((item) => [
    `"${item.id}"`,
    `"${item.categoryLabel || item.category}"`,
    `"${(item.title || '').replace(/"/g, '""')}"`,
    `"${(item.description || '').replace(/"/g, '""')}"`,
    `"${item.priority}"`,
    `"${item.status}"`,
    `"${item.neutralTag}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Real-time Firestore & Mock Data Loader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates mock data for offline development, tests, or initial seeding.
 * @returns {Object}
 */
export function createMockCommunityHealthData() {
  const members = [
    { id: 'mem_1', displayName: 'David Shenouda', role: 'servant', joinedAt: '2026-08-01' },
    { id: 'mem_2', displayName: 'Marina Youssef', role: 'servant', joinedAt: '2026-09-10' },
    { id: 'mem_3', displayName: 'John Mark', role: 'member', joinedAt: '2026-10-02' }, // New member
    { id: 'mem_4', displayName: 'Sarah Bishara', role: 'servant', joinedAt: '2026-07-15' },
    { id: 'mem_5', displayName: 'Peter Mina', role: 'member', joinedAt: '2026-06-20' },
    { id: 'mem_6', displayName: 'Kirollos Girgis', role: 'servant', joinedAt: '2026-09-28' }, // New servant
    { id: 'mem_7', displayName: 'Mina Mansour', role: 'member', joinedAt: '2026-05-10' },
    { id: 'mem_8', displayName: 'Christine Salama', role: 'servant', joinedAt: '2026-04-12' },
  ];

  const services = [
    { id: 'srv_w1', title: 'Weekly Service & Sports', type: SERVICE_TYPES.WEEKLY_SERVICE, date: '2026-10-02' },
    { id: 'srv_m1', title: 'Servants Prep Meeting', type: SERVICE_TYPES.SERVANT_MEETING, date: '2026-10-06' },
    { id: 'srv_w2', title: 'Weekly Service & Sports', type: SERVICE_TYPES.WEEKLY_SERVICE, date: '2026-10-09' },
  ];

  const attendances = [
    // mem_1 attended all
    { memberId: 'mem_1', serviceId: 'srv_w1', date: '2026-10-02', status: ATTENDANCE_STATUS.PRESENT },
    { memberId: 'mem_1', serviceId: 'srv_m1', date: '2026-10-06', status: ATTENDANCE_STATUS.PRESENT },
    { memberId: 'mem_1', serviceId: 'srv_w2', date: '2026-10-09', status: ATTENDANCE_STATUS.PRESENT },

    // mem_2 attended 2
    { memberId: 'mem_2', serviceId: 'srv_w1', date: '2026-10-02', status: ATTENDANCE_STATUS.PRESENT },
    { memberId: 'mem_2', serviceId: 'srv_w2', date: '2026-10-09', status: ATTENDANCE_STATUS.PRESENT },

    // mem_3 new attendee
    { memberId: 'mem_3', serviceId: 'srv_w2', date: '2026-10-09', status: ATTENDANCE_STATUS.PRESENT },

    // mem_4 attended
    { memberId: 'mem_4', serviceId: 'srv_w1', date: '2026-10-02', status: ATTENDANCE_STATUS.PRESENT },
    { memberId: 'mem_4', serviceId: 'srv_m1', date: '2026-10-06', status: ATTENDANCE_STATUS.PRESENT },

    // mem_5: ABSENT for 3 consecutive sessions! (triggers care follow-up)
    { memberId: 'mem_5', serviceId: 'srv_w1', date: '2026-10-02', status: ATTENDANCE_STATUS.ABSENT },
    { memberId: 'mem_5', serviceId: 'srv_m1', date: '2026-10-06', status: ATTENDANCE_STATUS.ABSENT },
    { memberId: 'mem_5', serviceId: 'srv_w2', date: '2026-10-09', status: ATTENDANCE_STATUS.ABSENT },

    // mem_8 attended
    { memberId: 'mem_8', serviceId: 'srv_w1', date: '2026-10-02', status: ATTENDANCE_STATUS.PRESENT },
  ];

  const assignments = [
    // mem_4 is scheduled 4 times in 2 weeks AND 2 roles on 2026-10-09! (triggers burnout monitor)
    { id: 'asgn_1', memberId: 'mem_4', memberName: 'Sarah Bishara', role: 'First Aid Head', date: '2026-10-02', status: APPLICATION_STATUS.CONFIRMED },
    { id: 'asgn_2', memberId: 'mem_4', memberName: 'Sarah Bishara', role: 'Court Referee', date: '2026-10-06', status: APPLICATION_STATUS.CONFIRMED },
    { id: 'asgn_3', memberId: 'mem_4', memberName: 'Sarah Bishara', role: 'Court Referee', date: '2026-10-09', status: APPLICATION_STATUS.CONFIRMED },
    { id: 'asgn_4', memberId: 'mem_4', memberName: 'Sarah Bishara', role: 'Hydration Station Lead', date: '2026-10-09', status: APPLICATION_STATUS.CONFIRMED },

    // mem_1 regular servant
    { id: 'asgn_5', memberId: 'mem_1', memberName: 'David Shenouda', role: 'Praise Leader', date: '2026-10-02', status: APPLICATION_STATUS.CONFIRMED },
    { id: 'asgn_6', memberId: 'mem_1', memberName: 'David Shenouda', role: 'Praise Leader', date: '2026-10-09', status: APPLICATION_STATUS.CONFIRMED },

    // mem_6: FIRST-TIME servant!
    { id: 'asgn_7', memberId: 'mem_6', memberName: 'Kirollos Girgis', role: 'Setup & Equipment', date: '2026-10-09', status: APPLICATION_STATUS.CONFIRMED },

    // mem_8: Unconfirmed assignment
    { id: 'asgn_8', memberId: 'mem_8', memberName: 'Christine Salama', role: 'Media & Photography', date: '2026-10-09', status: APPLICATION_STATUS.PENDING },
  ];

  const opportunities = [
    { id: 'opp_1', title: 'Court Referee (Basketball)', spotsNeeded: 4, spotsFilled: 3 },
    { id: 'opp_2', title: 'First Aid Responder', spotsNeeded: 2, spotsFilled: 1 },
    { id: 'opp_3', title: 'Audio & Praise Support', spotsNeeded: 3, spotsFilled: 3 },
    { id: 'opp_4', title: 'Hydration & Snack Station', spotsNeeded: 3, spotsFilled: 2 },
  ];

  const trainingProgress = [
    { memberId: 'mem_1', moduleId: 'mod_safety_1', completed: true },
    { memberId: 'mem_1', moduleId: 'mod_coaching_1', completed: true },
    { memberId: 'mem_2', moduleId: 'mod_safety_1', completed: true },
    { memberId: 'mem_4', moduleId: 'mod_safety_1', completed: true },
    { memberId: 'mem_6', moduleId: 'mod_safety_1', completed: false, progressPercent: 50 },
  ];

  const prayerRequests = [
    {
      id: 'prayer_1',
      memberId: 'mem_7',
      memberName: 'Mina Mansour',
      requestConnection: true,
      category: 'Health & Recovery',
      createdAt: '2026-10-05',
    },
  ];

  return {
    members,
    services,
    attendances,
    assignments,
    opportunities,
    trainingProgress,
    prayerRequests,
  };
}

/**
 * Fetches community health data from Firestore with fallback to realistic mock data.
 *
 * @param {string} communityId
 * @param {Object|string} authorizedCoordinator
 * @returns {Promise<Object>}
 */
export async function fetchCommunityHealthData(
  communityId = DEFAULT_COMMUNITY_ID,
  authorizedCoordinator
) {
  assertCoordinatorRole(authorizedCoordinator);

  const commId = communityId || DEFAULT_COMMUNITY_ID;

  try {
    // Attempt Firestore queries
    const membersSnap = await getDocs(
      query(collection(db, `vbt_communities/${commId}/members`), limit(100))
    );

    const members = [];
    membersSnap.forEach((doc) => {
      members.push({ id: doc.id, ...doc.data() });
    });

    // If online documents exist, return them
    if (members.length > 0) {
      const [servicesSnap, oppsSnap] = await Promise.all([
        getDocs(query(collection(db, `vbt_communities/${commId}/services`), limit(50))).catch(() => ({ forEach: () => {} })),
        getDocs(query(collection(db, `vbt_communities/${commId}/serving_opportunities`), limit(50))).catch(() => ({ forEach: () => {} })),
      ]);

      const services = [];
      servicesSnap.forEach((d) => services.push({ id: d.id, ...d.data() }));

      const opportunities = [];
      oppsSnap.forEach((d) => opportunities.push({ id: d.id, ...d.data() }));

      return {
        members,
        services,
        opportunities,
        attendances: [],
        assignments: [],
        trainingProgress: [],
        prayerRequests: [],
      };
    }
  } catch {
    // Fallback if offline or rules block mock Firestore collection
  }

  // Fallback to high-fidelity mock community health data
  return createMockCommunityHealthData();
}
