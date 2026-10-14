/**
 * VBT Community Platform - Next-Action & Persona Engine
 *
 * Implements Section 1 of VBT Next-Level Community Specifications:
 * - Detects all 8 persona states:
 *   1. new_visitor
 *   2. new_member
 *   3. returning_member
 *   4. first_time_servant
 *   5. active_servant
 *   6. leader
 *   7. inactive_member
 *   8. offline_user
 * - Computes the single clearest, highest-leverage next action per persona.
 * - Produces rich personalized summaries for community dashboard integration.
 * - Adheres strictly to src/contracts/communityContracts.js
 */

import {
  PERSONA_STATES,
  isLeaderRole,
  SERVANT_PROGRESSION,
  ASSIGNMENT_STATUS,
} from '../contracts/communityContracts';

export { PERSONA_STATES };

/**
 * Human-friendly labels for each persona state
 */
export const PERSONA_LABELS = {
  [PERSONA_STATES.NEW_VISITOR]: 'New Visitor',
  [PERSONA_STATES.NEW_MEMBER]: 'New Member',
  [PERSONA_STATES.RETURNING_MEMBER]: 'Returning Member',
  [PERSONA_STATES.FIRST_TIME_SERVANT]: 'First-Time Servant',
  [PERSONA_STATES.ACTIVE_SERVANT]: 'Active Servant',
  [PERSONA_STATES.LEADER]: 'Community Leader',
  [PERSONA_STATES.INACTIVE_MEMBER]: 'Inactive Member',
  [PERSONA_STATES.OFFLINE_USER]: 'Offline User',
};

/**
 * Priority values for next actions
 */
export const ACTION_PRIORITIES = {
  URGENT: 'urgent',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/**
 * Format persona state into a human-friendly string
 * @param {string} personaState
 * @returns {string}
 */
export function formatPersonaLabel(personaState) {
  return PERSONA_LABELS[personaState] || 'Community Member';
}

/**
 * Helper to compute an earlier arrival time for servants (e.g. 30 mins before)
 * @param {string} timeString - Format "HH:mm" or "HH:mm:ss"
 * @param {number} [minutesPrior=30]
 * @returns {string} Formatted "HH:mm"
 */
export function calculateArrivalTime(timeString = '17:30', minutesPrior = 30) {
  if (!timeString || typeof timeString !== 'string') {
    return '17:00';
  }
  const parts = timeString.split(':');
  if (parts.length < 2) return timeString;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeString;

  let totalMinutes = hours * 60 + minutes - minutesPrior;
  if (totalMinutes < 0) totalMinutes += 24 * 60;

  const arrH = Math.floor(totalMinutes / 60) % 24;
  const arrM = totalMinutes % 60;

  return `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`;
}

/**
 * Helper: Find the nearest upcoming activity from an array of activities
 * @param {Array<Object>} activities
 * @returns {Object|null}
 */
export function findNearestUpcomingActivity(activities = []) {
  if (!Array.isArray(activities) || activities.length === 0) return null;

  const now = new Date();
  const sorted = [...activities]
    .filter((a) => a && (a.date || a.serviceDate || a.startTime))
    .sort((a, b) => {
      const dateA = new Date(a.date || a.serviceDate || a.startTime || 0);
      const dateB = new Date(b.date || b.serviceDate || b.startTime || 0);
      return dateA - dateB;
    });

  // Find first activity that is in the future or today
  const upcoming = sorted.find((a) => {
    const actDate = new Date(a.date || a.serviceDate || a.startTime);
    return actDate.setHours(23, 59, 59, 999) >= now.getTime();
  });

  return upcoming || sorted[0] || null;
}

/**
 * Helper: Find the nearest assignment for a member
 * @param {Array<Object>} assignments
 * @param {Object} [member]
 * @returns {Object|null}
 */
export function findNearestAssignment(assignments = [], member = null) {
  if (!Array.isArray(assignments) || assignments.length === 0) return null;

  const memberId = member?.id || member?.uid || null;
  const relevant = assignments.filter((a) => {
    if (!a) return false;
    if (memberId) {
      if (a.memberId && a.memberId !== memberId && a.assignedTo !== memberId) {
        return false;
      }
    }
    // Exclude cancelled, completed, or declined
    return a.status !== ASSIGNMENT_STATUS.CANCELLED &&
      a.status !== ASSIGNMENT_STATUS.DECLINED &&
      a.status !== ASSIGNMENT_STATUS.COMPLETED;
  });

  if (relevant.length === 0) return null;

  // Sort by date / time
  return relevant.sort((a, b) => {
    const dateA = new Date(a.serviceDate || a.date || a.scheduledDate || 0);
    const dateB = new Date(b.serviceDate || b.date || b.scheduledDate || 0);
    return dateA - dateB;
  })[0];
}

/**
 * Helper to compute days between two dates
 * @param {string|Date} dateVal
 * @returns {number} Days elapsed
 */
function getDaysElapsed(dateVal) {
  if (!dateVal) return Infinity;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return Infinity;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Helper: Summarize attendance record status
 * @param {Array<Object>} attendances
 * @param {Object} [member]
 * @returns {string}
 */
export function getAttendanceStatusSummary(attendances = [], member = null) {
  const count =
    Array.isArray(attendances) && attendances.length > 0
      ? attendances.length
      : (typeof member?.attendanceCount === 'number' ? member.attendanceCount : 0);

  if (count === 0) {
    return 'No sessions attended yet';
  }
  if (count === 1) {
    return '1 session attended';
  }
  return `${count} sessions attended — Active Streak`;
}

/**
 * Calculate leader metrics for unfilled roles and unconfirmed assignments
 * @param {Array<Object>} assignments
 * @param {Array<Object>} attendances
 * @param {Array<Object>} activities
 * @returns {Object}
 */
export function computeLeaderMetrics(assignments = [], attendances = [], activities = []) {
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const safeActivities = Array.isArray(activities) ? activities : [];
  const safeAttendances = Array.isArray(attendances) ? attendances : [];

  // Count unfilled spots across activities / opportunities
  let unfilledRolesCount = 0;
  for (const act of safeActivities) {
    if (typeof act?.spotsRemaining === 'number') {
      unfilledRolesCount += Math.max(0, act.spotsRemaining);
    } else if (typeof act?.spotsNeeded === 'number' && typeof act?.spotsFilled === 'number') {
      unfilledRolesCount += Math.max(0, act.spotsNeeded - act.spotsFilled);
    } else if (act?.status === 'open' || act?.status === 'unfilled') {
      unfilledRolesCount += 1;
    }
  }

  // Count assignments that are open without assigned volunteer
  const openAssignments = safeAssignments.filter(
    (a) => a && (a.status === ASSIGNMENT_STATUS.OPEN || !a.memberId)
  );
  if (openAssignments.length > unfilledRolesCount) {
    unfilledRolesCount = openAssignments.length;
  }

  // Count unconfirmed assignments (volunteer interest submitted or pending confirmation)
  const unconfirmedAssignmentsCount = safeAssignments.filter((a) => {
    if (!a) return false;
    const status = a.status || '';
    return (
      status === ASSIGNMENT_STATUS.INTEREST_SUBMITTED ||
      status === ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW ||
      status === 'pending' ||
      status === 'pending_confirmation' ||
      status === ASSIGNMENT_STATUS.REPLACEMENT_NEEDED
    );
  }).length;

  const totalCheckedIn = safeAttendances.filter(
    (att) => att && (att.status === 'present' || att.status === 'checked_in')
  ).length;

  const followUpTasks = [];
  if (unfilledRolesCount > 0) {
    followUpTasks.push(`Assign volunteers to ${unfilledRolesCount} vacant station spots`);
  }
  if (unconfirmedAssignmentsCount > 0) {
    followUpTasks.push(`Review and confirm ${unconfirmedAssignmentsCount} pending servant assignments`);
  }
  if (followUpTasks.length === 0) {
    followUpTasks.push('All stations staffed and ready for Friday gathering');
  }

  return {
    unfilledRolesCount,
    unconfirmedAssignmentsCount,
    attendanceSummary: {
      totalCheckedIn,
      totalRecords: safeAttendances.length,
      checkInRate: safeAttendances.length > 0 ? Math.round((totalCheckedIn / safeAttendances.length) * 100) : 100,
    },
    followUpTasks,
  };
}

/**
 * Determine the 1 of 8 persona states for a community participant
 *
 * @param {Object} params
 * @param {Object|null} [params.member] - Current member profile
 * @param {Array<Object>} [params.assignments=[]] - Serving assignments
 * @param {Array<Object>} [params.attendances=[]] - Past attendance records
 * @param {boolean} [params.isOffline=false] - Connection status
 * @param {Array<Object>} [params.activities=[]] - Upcoming activities
 * @returns {string} One of PERSONA_STATES
 */
export function determinePersonaState({
  member = null,
  assignments = [],
  attendances = [],
  isOffline = false,
  activities = [],
} = {}) {
  // 1. Offline user takes priority if device / session is offline
  if (isOffline === true) {
    return PERSONA_STATES.OFFLINE_USER;
  }
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.onLine === 'boolean' &&
    navigator.onLine === false &&
    isOffline !== false
  ) {
    return PERSONA_STATES.OFFLINE_USER;
  }

  // 2. Explicit manual override (useful for testing or profile simulation)
  const explicitState = member?.personaOverride || member?.personaState;
  if (explicitState && Object.values(PERSONA_STATES).includes(explicitState)) {
    return explicitState;
  }

  // 3. New Visitor Check: Unregistered, guest role, or missing profile identity
  if (
    !member ||
    (!member.id && !member.uid && !member.displayName) ||
    member.role === 'guest' ||
    member.role === 'unregistered' ||
    member.isRegistered === false ||
    member.isVisitor === true ||
    member.status === 'visitor' ||
    member.status === 'guest'
  ) {
    return PERSONA_STATES.NEW_VISITOR;
  }

  // 4. Inactive Member Check: Explicit status or prolonged lapse
  const isExplicitlyInactive =
    member.status === 'inactive' ||
    member.isInactive === true ||
    member.status === 'lapsed' ||
    member.requiresPastoralCare === true ||
    member.careFollowUpFlag === true;

  if (isExplicitlyInactive) {
    return PERSONA_STATES.INACTIVE_MEMBER;
  }

  // Check implicit inactivity: has past history, but no attendance in >= 30 days
  const hasHistory =
    (Array.isArray(attendances) && attendances.length > 0) ||
    (typeof member.attendanceCount === 'number' && member.attendanceCount > 0) ||
    Boolean(member.lastAttendedAt);

  if (hasHistory) {
    let latestAttendanceDate = member.lastAttendedAt || null;
    if (Array.isArray(attendances) && attendances.length > 0) {
      const sortedAtt = [...attendances].sort((a, b) => {
        const dA = new Date(a.serviceDate || a.checkedInAt || a.date || 0);
        const dB = new Date(b.serviceDate || b.checkedInAt || b.date || 0);
        return dB - dA;
      });
      if (sortedAtt[0]) {
        latestAttendanceDate = sortedAtt[0].serviceDate || sortedAtt[0].checkedInAt || sortedAtt[0].date;
      }
    }

    if (latestAttendanceDate) {
      const daysSince = getDaysElapsed(latestAttendanceDate);
      const hasUpcomingConfirmedDuty = Array.isArray(assignments) && assignments.some(
        (a) => a && (a.status === ASSIGNMENT_STATUS.CONFIRMED || a.status === 'approved')
      );

      // If absent for >= 30 days without confirmed upcoming duty, and not explicitly new
      if (
        daysSince >= 30 &&
        !hasUpcomingConfirmedDuty &&
        member.status !== 'new' &&
        member.isNewMember !== true
      ) {
        return PERSONA_STATES.INACTIVE_MEMBER;
      }
    }
  }

  // Also check if member account was created > 30 days ago, never attended, and has no assignments
  if (!hasHistory && member.createdAt && member.status !== 'new' && member.isNewMember !== true) {
    const daysSinceCreated = getDaysElapsed(member.createdAt);
    const hasAssignments = Array.isArray(assignments) && assignments.length > 0;
    if (daysSinceCreated >= 30 && !hasAssignments) {
      return PERSONA_STATES.INACTIVE_MEMBER;
    }
  }

  // 5. Leadership Check: Role or progression indicates leadership oversight
  const memberRole = String(member.role || '').toLowerCase();
  const isLeader =
    isLeaderRole(memberRole) ||
    memberRole === 'leader' ||
    memberRole === 'coordinator' ||
    memberRole === 'team_leader' ||
    memberRole === 'admin' ||
    member.isLeader === true ||
    member.servantProgression === SERVANT_PROGRESSION.COORDINATOR ||
    member.servantProgression === SERVANT_PROGRESSION.MENTOR ||
    member.servantProgression === SERVANT_PROGRESSION.TEAM_LEADER;

  if (isLeader) {
    return PERSONA_STATES.LEADER;
  }

  // 6. Servant States: First-Time Servant vs Active Servant
  const safeAssignments = Array.isArray(assignments) ? assignments : [];
  const memberAssignments = safeAssignments.filter((a) => {
    if (!a) return false;
    const memberId = member.id || member.uid;
    return !a.memberId || a.memberId === memberId || a.assignedTo === memberId;
  });

  const hasServingDuty =
    memberAssignments.length > 0 ||
    Array.isArray(member.assignedDuties) && member.assignedDuties.length > 0 ||
    memberRole === 'volunteer' ||
    memberRole === 'first_time_servant' ||
    memberRole === 'active_servant' ||
    memberRole === 'servant' ||
    memberRole === 'trained_servant' ||
    Boolean(member.servantProgression);

  if (hasServingDuty) {
    const priorServices = member.timesServed ?? member.servicesServed ?? member.completedAssignments ?? null;
    const hasServedBefore =
      (typeof priorServices === 'number' && priorServices > 0) ||
      (Array.isArray(attendances) && attendances.some((att) => att.role === 'servant' || att.isServantCheckIn));

    const isExplicitFirstTime =
      memberRole === 'first_time_servant' ||
      member.isFirstTimeServant === true ||
      member.servantProgression === SERVANT_PROGRESSION.INTERESTED ||
      (memberRole === 'volunteer' && !hasServedBefore);

    if (isExplicitFirstTime || (!hasServedBefore && memberAssignments.length > 0)) {
      return PERSONA_STATES.FIRST_TIME_SERVANT;
    }

    return PERSONA_STATES.ACTIVE_SERVANT;
  }

  // 7. General Member States: New Member vs Returning Member
  const attendanceCount = Array.isArray(attendances)
    ? attendances.length
    : (typeof member.attendanceCount === 'number' ? member.attendanceCount : 0);

  const isExplicitNew =
    member.isNewMember === true ||
    member.status === 'new' ||
    member.onboardingCompleted === false ||
    member.findYourPlaceCompleted === false ||
    member.servantProgression === SERVANT_PROGRESSION.INTERESTED;

  if (isExplicitNew || attendanceCount <= 1) {
    return PERSONA_STATES.NEW_MEMBER;
  }

  return PERSONA_STATES.RETURNING_MEMBER;
}

/**
 * Compute the single clearest next action tailored to the determined persona
 *
 * @param {Object} params
 * @param {string} [params.personaState]
 * @param {Object} [params.member]
 * @param {Array<Object>} [params.assignments=[]]
 * @param {Array<Object>} [params.activities=[]]
 * @param {Array<Object>} [params.attendances=[]]
 * @returns {Object} Structured action item
 */
export function computeNextAction({
  personaState,
  member = null,
  assignments = [],
  activities = [],
  attendances = [],
} = {}) {
  // If personaState is not provided, evaluate it dynamically
  const resolvedState = personaState || determinePersonaState({ member, assignments, attendances, activities });
  const nextActivity = findNearestUpcomingActivity(activities);

  switch (resolvedState) {
    // 1. New Visitor Action
    case PERSONA_STATES.NEW_VISITOR: {
      const actTitle = nextActivity?.title || 'This Friday\'s Sports Gathering';
      const actDate = nextActivity?.date || nextActivity?.serviceDate || 'Upcoming Friday';
      const actTime = nextActivity?.startTime || '17:30';

      return {
        id: 'action_new_visitor_join',
        personaState: PERSONA_STATES.NEW_VISITOR,
        type: 'join_community',
        badge: 'New Visitor',
        badgeVariant: 'info',
        priority: ACTION_PRIORITIES.HIGH,
        title: 'Welcome to VBT Sports Camp! Take Your First Step',
        description:
          'VBT brings youth together through athletic competition, faith-building mentorship, and joyful fellowship. Join our community family today or explore upcoming sessions.',
        primaryCta: {
          label: 'Join VBT Community',
          action: 'join_community',
          targetTab: 'connect',
          icon: 'UserPlus',
        },
        secondaryCta: {
          label: 'Explore Gathering Schedule',
          action: 'explore_activities',
          targetTab: 'schedule',
          icon: 'Compass',
        },
        metadata: {
          simpleExplanation: 'VBT is a youth sports fellowship community combining athletics, discipleship, and practical servant leadership.',
          nextActivity: nextActivity ? { title: actTitle, date: actDate, time: actTime } : null,
          recommendedStep: 'Complete free member registration to receive team placement and updates.',
        },
        encouragement: '“Let all that you do be done in love.” — 1 Corinthians 16:14',
      };
    }

    // 2. New Member Action
    case PERSONA_STATES.NEW_MEMBER: {
      const isOnboardingComplete = Boolean(member?.onboardingCompleted || member?.findYourPlaceCompleted);
      const actTitle = nextActivity?.title || 'Weekly Sports Fellowship';

      if (!isOnboardingComplete) {
        return {
          id: 'action_new_member_find_place',
          personaState: PERSONA_STATES.NEW_MEMBER,
          type: 'complete_onboarding',
          badge: 'New Member',
          badgeVariant: 'primary',
          priority: ACTION_PRIORITIES.HIGH,
          title: 'Complete "Find Your Place" Onboarding',
          description:
            'Discover your spiritual gifts, sports skills, and serving passion. Complete onboarding to get matched with your team station.',
          primaryCta: {
            label: 'Start "Find Your Place"',
            action: 'start_onboarding',
            targetTab: 'connect',
            icon: 'Sparkles',
          },
          secondaryCta: {
            label: 'View Next Activity',
            action: 'view_activity',
            targetTab: 'schedule',
            icon: 'Calendar',
          },
          metadata: {
            registrationStatus: member?.status || 'Active Member',
            onboardingCompleted: false,
            profileCompletion: member?.profileCompletion || 65,
            nextActivity,
          },
          encouragement: '“For just as each of us has one body with many members... so in Christ we, though many, form one body.” — Romans 12:4-5',
        };
      }

      return {
        id: 'action_new_member_ready',
        personaState: PERSONA_STATES.NEW_MEMBER,
        type: 'attend_activity',
        badge: 'Onboarding Complete',
        badgeVariant: 'success',
        priority: ACTION_PRIORITIES.MEDIUM,
        title: `You're All Set! Next Up: ${actTitle}`,
        description: 'You have completed onboarding! Check the upcoming schedule and connect with your team group.',
        primaryCta: {
          label: 'View Gathering Details',
          action: 'view_activity',
          targetTab: 'schedule',
          icon: 'Calendar',
        },
        secondaryCta: {
          label: 'Meet Your Team',
          action: 'view_team',
          targetTab: 'connect',
          icon: 'Users',
        },
        metadata: {
          registrationStatus: member?.status || 'Active Member',
          onboardingCompleted: true,
          nextActivity,
        },
        encouragement: '“Welcome home! We are excited to walk and compete together in faith.”',
      };
    }

    // 3. Returning Member Action
    case PERSONA_STATES.RETURNING_MEMBER: {
      const actTitle = nextActivity?.title || 'Friday Sports Gathering & Fellowship';
      const teamName = member?.team?.name || member?.group?.name || member?.team || 'Athletic Community';
      const attSummary = getAttendanceStatusSummary(attendances, member);

      return {
        id: 'action_returning_member_rsvp',
        personaState: PERSONA_STATES.RETURNING_MEMBER,
        type: 'confirm_attendance',
        badge: 'Active Member',
        badgeVariant: 'success',
        priority: ACTION_PRIORITIES.MEDIUM,
        title: `Confirm Attendance: ${actTitle}`,
        description: `Gather with ${teamName} this week. Check station schedule details and confirm your attendance.`,
        primaryCta: {
          label: 'Confirm Attendance',
          action: 'rsvp_activity',
          targetTab: 'schedule',
          icon: 'CheckCircle',
          payload: { activityId: nextActivity?.id },
        },
        secondaryCta: {
          label: 'View Team Roster',
          action: 'view_team',
          targetTab: 'connect',
          icon: 'Users',
        },
        metadata: {
          nextActivity,
          attendanceStatus: attSummary,
          attendanceCount: attendances.length || member?.attendanceCount || 0,
          teamInfo: teamName,
        },
        encouragement: '“As iron sharpens iron, so one person sharpens another.” — Proverbs 27:17',
      };
    }

    // 4. First-Time Servant Action
    case PERSONA_STATES.FIRST_TIME_SERVANT: {
      const assignment = findNearestAssignment(assignments, member);
      const roleTitle = assignment?.roleTitle || assignment?.title || 'Sports Station Assistant';
      const rawStart = assignment?.startTime || nextActivity?.startTime || '17:30';
      const arrivalTime = assignment?.arrivalTime || calculateArrivalTime(rawStart, 30);
      const location = assignment?.location?.name || assignment?.location || nextActivity?.location?.name || 'Main Sports Complex';
      const prepMaterial = assignment?.prepMaterial || 'Foundations of Service & Safety Orientation';

      return {
        id: 'action_first_time_servant_prep',
        personaState: PERSONA_STATES.FIRST_TIME_SERVANT,
        type: 'servant_prep',
        badge: 'First-Time Servant',
        badgeVariant: 'primary',
        priority: ACTION_PRIORITIES.HIGH,
        title: `Prepare for Your First Duty: ${roleTitle}`,
        description: `You are serving as ${roleTitle}! Please arrive by ${arrivalTime} for leadership prayer and hands-on orientation.`,
        primaryCta: {
          label: 'Review Orientation Guide',
          action: 'view_orientation',
          targetTab: 'serve',
          icon: 'BookOpen',
          payload: { assignmentId: assignment?.id, prepMaterial },
        },
        secondaryCta: {
          label: 'Confirm Assignment',
          action: 'confirm_assignment',
          targetTab: 'serve',
          icon: 'CheckCheck',
          payload: { assignmentId: assignment?.id },
        },
        metadata: {
          assignment,
          roleTitle,
          arrivalTime,
          location,
          orientationNeeded: true,
          prepMaterial,
          confirmationStatus: assignment?.status || 'pending',
        },
        encouragement: '“Don’t let anyone look down on you because you are young, but set an example for the believers.” — 1 Timothy 4:12',
      };
    }

    // 5. Active Servant Action
    case PERSONA_STATES.ACTIVE_SERVANT: {
      const assignment = findNearestAssignment(assignments, member);
      const isConfirmed = assignment?.status === ASSIGNMENT_STATUS.CONFIRMED || assignment?.status === 'approved';
      const roleTitle = assignment?.roleTitle || assignment?.title || 'Station Leader';
      const rawStart = assignment?.startTime || nextActivity?.startTime || '17:30';
      const arrivalTime = assignment?.arrivalTime || calculateArrivalTime(rawStart, 30);
      const location = assignment?.location?.name || assignment?.location || nextActivity?.location?.name || 'Court A - Main Field';
      const prepMaterial = assignment?.prepMaterial || 'Weekly Station Drills & Safety Checklist';

      if (!assignment) {
        return {
          id: 'action_active_servant_select_duty',
          personaState: PERSONA_STATES.ACTIVE_SERVANT,
          type: 'select_duty',
          badge: 'Active Servant',
          badgeVariant: 'primary',
          priority: ACTION_PRIORITIES.MEDIUM,
          title: 'Select This Week\'s Serving Assignment',
          description: 'Station rosters for this Friday are open. Choose your preferred sports court or logistics station.',
          primaryCta: {
            label: 'Browse Serving Opportunities',
            action: 'browse_serving',
            targetTab: 'serve',
            icon: 'PlusCircle',
          },
          secondaryCta: {
            label: 'View Meeting Schedule',
            action: 'view_meetings',
            targetTab: 'schedule',
            icon: 'Calendar',
          },
          metadata: {
            assignment: null,
            confirmationStatus: 'none',
            nextActivity,
          },
          encouragement: '“Whatever you do, work at it with all your heart, as working for the Lord.” — Colossians 3:23',
        };
      }

      if (!isConfirmed) {
        return {
          id: `action_active_servant_confirm_${assignment.id || 'duty'}`,
          personaState: PERSONA_STATES.ACTIVE_SERVANT,
          type: 'confirm_assignment',
          badge: 'Confirmation Needed',
          badgeVariant: 'warning',
          priority: ACTION_PRIORITIES.HIGH,
          title: `Action Needed: Confirm ${roleTitle}`,
          description: `Please confirm your duty by Thursday evening. Location: ${location}. Required arrival: ${arrivalTime}.`,
          primaryCta: {
            label: 'Confirm Assignment',
            action: 'confirm_assignment',
            targetTab: 'serve',
            icon: 'CheckCircle',
            payload: { assignmentId: assignment.id },
          },
          secondaryCta: {
            label: 'Review Station Prep',
            action: 'view_prep',
            targetTab: 'serve',
            icon: 'FileText',
            payload: { assignmentId: assignment.id, prepMaterial },
          },
          metadata: {
            assignment,
            roleTitle,
            confirmationStatus: assignment.status || 'pending',
            location,
            arrivalTime,
            prepMaterial,
          },
          encouragement: '“Your faithful service inspires the entire camp. Thank you for leading with joy!”',
        };
      }

      return {
        id: `action_active_servant_prep_${assignment.id || 'duty'}`,
        personaState: PERSONA_STATES.ACTIVE_SERVANT,
        type: 'review_prep',
        badge: 'Confirmed Servant',
        badgeVariant: 'success',
        priority: ACTION_PRIORITIES.MEDIUM,
        title: `Confirmed: ${roleTitle}`,
        description: `You are confirmed! Arrive at ${arrivalTime} at ${location}. Review station drills and game safety guidelines.`,
        primaryCta: {
          label: 'View Station Prep Material',
          action: 'view_prep',
          targetTab: 'serve',
          icon: 'FileText',
          payload: { assignmentId: assignment.id, prepMaterial },
        },
        secondaryCta: {
          label: 'Request Shift Replacement',
          action: 'request_replacement',
          targetTab: 'serve',
          icon: 'RefreshCw',
          payload: { assignmentId: assignment.id },
        },
        metadata: {
          assignment,
          roleTitle,
          confirmationStatus: 'confirmed',
          location,
          arrivalTime,
          prepMaterial,
        },
        encouragement: '“Whatever you do, work at it with all your heart, as working for the Lord.” — Colossians 3:23',
      };
    }

    // 6. Leader Action
    case PERSONA_STATES.LEADER: {
      const leaderMetrics = computeLeaderMetrics(assignments, attendances, activities);
      const { unfilledRolesCount, unconfirmedAssignmentsCount, attendanceSummary, followUpTasks } = leaderMetrics;

      const hasStaffingGaps = unfilledRolesCount > 0 || unconfirmedAssignmentsCount > 0;

      return {
        id: 'action_leader_manage_operations',
        personaState: PERSONA_STATES.LEADER,
        type: 'leader_management',
        badge: 'Leadership & Oversight',
        badgeVariant: hasStaffingGaps ? 'warning' : 'success',
        priority: hasStaffingGaps ? ACTION_PRIORITIES.HIGH : ACTION_PRIORITIES.MEDIUM,
        title: hasStaffingGaps
          ? `Leadership Alert: ${unfilledRolesCount} Unfilled & ${unconfirmedAssignmentsCount} Unconfirmed`
          : 'Leadership Hub: All Station Roles Staffed',
        description: hasStaffingGaps
          ? `There are ${unfilledRolesCount} vacant station roles and ${unconfirmedAssignmentsCount} pending volunteer confirmations for this week.`
          : 'All stations are fully covered! Monitor live check-ins and review weekly pastoral follow-ups.',
        primaryCta: {
          label: hasStaffingGaps ? 'Manage Station Roster' : 'View Team Roster',
          action: 'manage_roster',
          targetTab: 'serve',
          icon: 'Users',
        },
        secondaryCta: {
          label: 'Attendance Summary',
          action: 'view_attendance_summary',
          targetTab: 'schedule',
          icon: 'BarChart3',
        },
        metadata: {
          unfilledRolesCount,
          unconfirmedAssignmentsCount,
          attendanceSummary,
          followUpTasks,
        },
        encouragement: '“Be shepherds of God’s flock that is under your care, watching over them... eagerly.” — 1 Peter 5:2',
      };
    }

    // 7. Inactive Member Action
    case PERSONA_STATES.INACTIVE_MEMBER: {
      const actTitle = nextActivity?.title || 'This Friday\'s Sports Gathering';
      const actDate = nextActivity?.date || nextActivity?.serviceDate || 'Upcoming Friday';

      return {
        id: 'action_inactive_reconnect',
        personaState: PERSONA_STATES.INACTIVE_MEMBER,
        type: 'reconnect_member',
        badge: 'We Miss You',
        badgeVariant: 'info',
        priority: ACTION_PRIORITIES.HIGH,
        title: 'Welcome Back! We Missed You in the VBT Family',
        description:
          'Your presence is an irreplaceable blessing to our camp. Reconnect with fellow teammates or request a warm pastoral check-in.',
        primaryCta: {
          label: 'Reconnect & Join This Friday',
          action: 'reconnect_rsvp',
          targetTab: 'schedule',
          icon: 'Heart',
          payload: { activityId: nextActivity?.id },
        },
        secondaryCta: {
          label: 'Request Pastoral Care Call',
          action: 'request_pastoral_care',
          targetTab: 'connect',
          icon: 'Phone',
        },
        metadata: {
          careFollowUpFlag: true,
          nextActivity: nextActivity ? { title: actTitle, date: actDate } : null,
          reconnectStep: 'Confirm your attendance for Friday\'s sports fellowship or share a private prayer request.',
          pastoralSupportAvailable: true,
        },
        encouragement: '“The Lord your God is with you... He will quiet you with his love, he will rejoice over you with singing.” — Zephaniah 3:17',
      };
    }

    // 8. Offline User Action
    case PERSONA_STATES.OFFLINE_USER:
    default: {
      return {
        id: 'action_offline_readiness',
        personaState: PERSONA_STATES.OFFLINE_USER,
        type: 'offline_mode',
        badge: 'Offline Mode',
        badgeVariant: 'warning',
        priority: ACTION_PRIORITIES.HIGH,
        title: 'Offline Mode: Ready for QR Check-In',
        description:
          'You are currently offline. Your schedule is cached, and your personal attendance QR is ready for station scanning.',
        primaryCta: {
          label: 'Show Offline QR Code',
          action: 'show_offline_qr',
          targetTab: 'profile',
          icon: 'QrCode',
        },
        secondaryCta: {
          label: 'View Cached Schedule',
          action: 'view_cached_schedule',
          targetTab: 'schedule',
          icon: 'Calendar',
        },
        metadata: {
          isOffline: true,
          cachedScheduleAvailable: true,
          offlineQrReady: true,
          syncStatusMessage: 'Check-ins saved offline will automatically sync as soon as internet connection is restored.',
        },
        encouragement: '“The Lord is near to all who call on him, to all who call on him in truth.” — Psalm 145:18',
      };
    }
  }
}

/**
 * Build a complete personalized summary payload for community home dashboards
 *
 * @param {Object} params
 * @param {Object|null} [params.member]
 * @param {Array<Object>} [params.assignments=[]]
 * @param {Array<Object>} [params.activities=[]]
 * @param {Array<Object>} [params.attendances=[]]
 * @param {boolean} [params.isOffline=false]
 * @returns {Object} Comprehensive personalized summary
 */
export function getPersonalizedSummary({
  member = null,
  assignments = [],
  activities = [],
  attendances = [],
  isOffline = false,
} = {}) {
  const personaState = determinePersonaState({
    member,
    assignments,
    attendances,
    isOffline,
    activities,
  });

  const nextAction = computeNextAction({
    personaState,
    member,
    assignments,
    activities,
    attendances,
  });

  const displayName =
    member?.displayName ||
    member?.firstName ||
    member?.name ||
    (personaState === PERSONA_STATES.NEW_VISITOR ? 'Friend' : 'Member');

  let headline = `Welcome, ${displayName}!`;
  let subheading = 'Here is your personalized camp overview and next step.';

  const highlights = [];
  const badges = [
    {
      label: formatPersonaLabel(personaState),
      variant: nextAction.badgeVariant || 'default',
    },
  ];

  switch (personaState) {
    case PERSONA_STATES.NEW_VISITOR:
      headline = `Welcome, ${displayName}!`;
      subheading = 'Discover faith, athletic growth, and fellowship at VBT Sports Camp.';
      highlights.push('Open community with zero barrier to entry');
      highlights.push('Free registration & sports station activities');
      highlights.push('Mentor-guided youth development');
      break;

    case PERSONA_STATES.NEW_MEMBER:
      headline = `Welcome to the Family, ${displayName}!`;
      subheading = 'Take your first step to find where you belong.';
      highlights.push(`Membership Status: ${member?.status || 'Active'}`);
      highlights.push(
        member?.onboardingCompleted
          ? 'Onboarding completed — Ready for Friday'
          : 'Step 1: Complete "Find Your Place" survey'
      );
      if (nextAction.metadata?.nextActivity?.title) {
        highlights.push(`Next Event: ${nextAction.metadata.nextActivity.title}`);
      }
      break;

    case PERSONA_STATES.RETURNING_MEMBER:
      headline = `Welcome Back, ${displayName}!`;
      subheading = 'Great to see you again! Here is your upcoming gathering status.';
      highlights.push(`Team: ${member?.team?.name || member?.team || 'Campers Hub'}`);
      highlights.push(getAttendanceStatusSummary(attendances, member));
      if (nextAction.metadata?.nextActivity?.title) {
        highlights.push(`Next Gathering: ${nextAction.metadata.nextActivity.title}`);
      }
      break;

    case PERSONA_STATES.FIRST_TIME_SERVANT:
      headline = `Welcome to the Servant Family, ${displayName}!`;
      subheading = 'Your first serving duty is scheduled. We are here to prepare you!';
      highlights.push(`Role: ${nextAction.metadata?.roleTitle || 'Station Assistant'}`);
      highlights.push(`Arrival: ${nextAction.metadata?.arrivalTime || '17:00'}`);
      highlights.push('Orientation & prayer briefing ready');
      break;

    case PERSONA_STATES.ACTIVE_SERVANT:
      headline = `Greetings, Servant ${displayName}!`;
      subheading = 'Thank you for your continuous dedication to our community.';
      highlights.push(`Duty: ${nextAction.metadata?.roleTitle || 'Station Leader'}`);
      highlights.push(`Status: ${nextAction.metadata?.confirmationStatus === 'confirmed' ? 'Confirmed' : 'Pending Confirmation'}`);
      highlights.push(`Location: ${nextAction.metadata?.location || 'Main Sports Complex'}`);
      break;

    case PERSONA_STATES.LEADER:
      headline = `Greetings, Leader ${displayName}!`;
      subheading = 'Leadership Oversight & Community Readiness Dashboard.';
      highlights.push(`${nextAction.metadata?.unfilledRolesCount || 0} vacant serving spots`);
      highlights.push(`${nextAction.metadata?.unconfirmedAssignmentsCount || 0} pending confirmations`);
      highlights.push(`Check-In Rate: ${nextAction.metadata?.attendanceSummary?.checkInRate || 100}%`);
      break;

    case PERSONA_STATES.INACTIVE_MEMBER:
      headline = `We Miss You, ${displayName}!`;
      subheading = 'You are always warmly welcomed. Reconnect with your sports camp family.';
      highlights.push('Pastoral care and fellowship support available');
      highlights.push('RSVP anytime with no pressure');
      if (nextAction.metadata?.nextActivity?.title) {
        highlights.push(`Upcoming Gathering: ${nextAction.metadata.nextActivity.title}`);
      }
      break;

    case PERSONA_STATES.OFFLINE_USER:
      headline = `Offline Mode: Welcome, ${displayName}`;
      subheading = 'Your app is offline, but attendance readiness and schedule cache are intact.';
      highlights.push('Offline QR code ready for check-in');
      highlights.push('Schedule and assignments saved locally');
      highlights.push('Auto-sync enabled when reconnected');
      break;

    default:
      break;
  }

  return {
    personaState,
    personaLabel: formatPersonaLabel(personaState),
    isOffline: personaState === PERSONA_STATES.OFFLINE_USER || Boolean(isOffline),
    member: {
      id: member?.id || member?.uid || null,
      displayName,
      role: member?.role || 'guest',
      servantProgression: member?.servantProgression || null,
      team: member?.team || member?.group || null,
      status: member?.status || 'active',
      isRegistered: Boolean(member?.id || member?.uid) && member?.role !== 'guest' && member?.role !== 'unregistered',
    },
    headline,
    subheading,
    nextAction,
    highlights,
    badges,
    quickStats: {
      attendanceCount: Array.isArray(attendances) ? attendances.length : (member?.attendanceCount || 0),
      assignmentsCount: Array.isArray(assignments) ? assignments.length : (member?.assignedDuties?.length || 0),
      isLeader: personaState === PERSONA_STATES.LEADER,
      careFollowUpFlag: Boolean(nextAction.metadata?.careFollowUpFlag),
    },
  };
}
