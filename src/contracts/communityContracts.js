/**
 * VBT Community Platform - Shared Domain Contracts & Types
 *
 * Defines source-of-truth constants, enums, state machines, and schemas
 * for all next-level community modules.
 */

// 1. Community Roles & Progression
export const VBT_ROLES = {
  GUEST: 'guest',
  MEMBER: 'member',
  VOLUNTEER: 'volunteer',
  TRAINED_SERVANT: 'trained_servant',
  ACTIVE_SERVANT: 'active_servant',
  SERVANT: 'servant', // backward-compatible alias for active_servant
  TEAM_LEADER: 'team_leader',
  SERVICE_LEADER: 'service_leader',
  GAME_LEADER: 'game_leader',
  COORDINATOR: 'coordinator',
  PASTORAL_CARE: 'pastoral_care_leader',
  ADMIN: 'admin',
};

// Explicit Servant Progression Pathway (Section 5)
export const SERVANT_PROGRESSION = {
  INTERESTED: 'interested',
  VOLUNTEER: 'volunteer',
  TRAINED_SERVANT: 'trained_servant',
  ACTIVE_SERVANT: 'active_servant',
  TEAM_LEADER: 'team_leader',
  COORDINATOR: 'coordinator',
  MENTOR: 'mentor',
};

export const SERVANT_PROGRESSION_ORDER = [
  SERVANT_PROGRESSION.INTERESTED,
  SERVANT_PROGRESSION.VOLUNTEER,
  SERVANT_PROGRESSION.TRAINED_SERVANT,
  SERVANT_PROGRESSION.ACTIVE_SERVANT,
  SERVANT_PROGRESSION.TEAM_LEADER,
  SERVANT_PROGRESSION.COORDINATOR,
  SERVANT_PROGRESSION.MENTOR,
];

export const SERVANT_PROGRESSION_DETAILS = {
  [SERVANT_PROGRESSION.INTERESTED]: {
    label: 'Interested',
    title: 'Community Explorer',
    level: 0,
    badge: '🌱',
    description: 'Exploring VBT sports community, learning values, discovering where to serve.',
    nextStep: 'Complete Find Your Place onboarding and attend orientation.',
  },
  [SERVANT_PROGRESSION.VOLUNTEER]: {
    label: 'Volunteer',
    title: 'Camp Volunteer',
    level: 1,
    badge: '🌿',
    description: 'Participating in sports events, assisting stations, getting hands-on experience.',
    nextStep: 'Complete Foundations of Service and Safety Basics training modules.',
  },
  [SERVANT_PROGRESSION.TRAINED_SERVANT]: {
    label: 'Trained Servant',
    title: 'Certified Servant',
    level: 2,
    badge: '⭐',
    description: 'Certified in safety, logistics, and station assistance. Ready for assigned duty.',
    nextStep: 'Serve consistently in 5 activities and participate in weekly servant meetings.',
  },
  [SERVANT_PROGRESSION.ACTIVE_SERVANT]: {
    label: 'Active Servant',
    title: 'Active Servant',
    level: 3,
    badge: '🔥',
    description: 'Consistently serving at stations, sports courts, media, or logistics teams.',
    nextStep: 'Mentor new volunteers and complete Leadership & Mentoring training.',
  },
  [SERVANT_PROGRESSION.TEAM_LEADER]: {
    label: 'Team Leader',
    title: 'Team Leader',
    level: 4,
    badge: '🏆',
    description: 'Leading a station team, coordinating group members, ensuring station excellence.',
    nextStep: 'Shadow a coordinator and manage cross-station event operations.',
  },
  [SERVANT_PROGRESSION.COORDINATOR]: {
    label: 'Coordinator',
    title: 'Ministry Coordinator',
    level: 5,
    badge: '👑',
    description: 'Overseeing weekly services, team health, serving discovery, and camp operations.',
    nextStep: 'Guide multi-season mentors and nurture community culture.',
  },
  [SERVANT_PROGRESSION.MENTOR]: {
    label: 'Mentor',
    title: 'Senior Mentor',
    level: 6,
    badge: '🕊️',
    description: 'Spiritual and leadership father/mother guiding servants across seasons.',
    nextStep: 'Multiply leadership by raising the next generation of coordinators.',
  },
};

// 2. Persona States for Personalized Experience (Section 1)
export const PERSONA_STATES = {
  NEW_VISITOR: 'new_visitor',
  NEW_MEMBER: 'new_member',
  RETURNING_MEMBER: 'returning_member',
  FIRST_TIME_SERVANT: 'first_time_servant',
  ACTIVE_SERVANT: 'active_servant',
  LEADER: 'leader',
  INACTIVE_MEMBER: 'inactive_member',
  OFFLINE_USER: 'offline_user',
};

// 3. Assignment State Machine (Section 3)
export const ASSIGNMENT_STATUS = {
  OPEN: 'open',
  INTEREST_SUBMITTED: 'interest_submitted',
  PENDING_LEADER_REVIEW: 'pending_leader_review',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  REPLACEMENT_NEEDED: 'replacement_needed',
  REASSIGNED: 'reassigned',
  COMPLETED: 'completed',
};

export const VALID_ASSIGNMENT_TRANSITIONS = {
  [ASSIGNMENT_STATUS.OPEN]: [ASSIGNMENT_STATUS.INTEREST_SUBMITTED, ASSIGNMENT_STATUS.CONFIRMED],
  [ASSIGNMENT_STATUS.INTEREST_SUBMITTED]: [ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW, ASSIGNMENT_STATUS.CANCELLED],
  [ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW]: [ASSIGNMENT_STATUS.CONFIRMED, ASSIGNMENT_STATUS.DECLINED, ASSIGNMENT_STATUS.CANCELLED],
  [ASSIGNMENT_STATUS.CONFIRMED]: [ASSIGNMENT_STATUS.DECLINED, ASSIGNMENT_STATUS.CANCELLED, ASSIGNMENT_STATUS.REPLACEMENT_NEEDED, ASSIGNMENT_STATUS.COMPLETED],
  [ASSIGNMENT_STATUS.DECLINED]: [ASSIGNMENT_STATUS.OPEN, ASSIGNMENT_STATUS.REASSIGNED],
  [ASSIGNMENT_STATUS.CANCELLED]: [ASSIGNMENT_STATUS.REPLACEMENT_NEEDED, ASSIGNMENT_STATUS.OPEN],
  [ASSIGNMENT_STATUS.REPLACEMENT_NEEDED]: [ASSIGNMENT_STATUS.REASSIGNED, ASSIGNMENT_STATUS.OPEN],
  [ASSIGNMENT_STATUS.REASSIGNED]: [ASSIGNMENT_STATUS.CONFIRMED, ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW],
  [ASSIGNMENT_STATUS.COMPLETED]: [],
};

// 4. Privacy & Visibility Scopes (Section 6 & 9)
export const VISIBILITY_SCOPES = {
  PRIVATE: 'private',
  GROUP: 'group',
  TEAM: 'team',
  COMMUNITY: 'community',
  LEADER_ONLY: 'leader_only',
  PASTORAL_PRIVATE: 'pastoral_private',
};

// 5. Weekly Servant Meeting Stages (Section 4)
export const MEETING_MODES = {
  BEFORE: 'before',
  DURING: 'during',
  AFTER: 'after',
};

// 6. Weekly Community Ritual Phases (Section 11)
export const WEEKLY_RITUAL_PHASE = {
  EARLY_WEEK: 'early_week',     // Mon - Wed: See upcoming service and meeting
  MIDWEEK: 'midweek',           // Wed - Thu: Choose a serving opportunity
  BEFORE_EVENT: 'before_event', // Thu - Fri morning: Confirm assignment & complete prep
  MEETING_DAY: 'meeting_day',   // Fri / Tue: Scan attendance QR and serve
  AFTER_EVENT: 'after_event',   // Sat - Sun: Read recap, celebrate, follow up
  NEXT_CYCLE: 'next_cycle',     // Sunday night: Receive next suggested step
};

// 7. Audit Action Types (Section 3, 6, 9, 10)
export const AUDIT_ACTIONS = {
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_APPROVED: 'role_approved',
  ASSIGNMENT_CREATED: 'assignment_created',
  ASSIGNMENT_CONFIRMED: 'assignment_confirmed',
  ASSIGNMENT_DECLINED: 'assignment_declined',
  ASSIGNMENT_REPLACED: 'assignment_replaced',
  POST_REPORTED: 'post_reported',
  POST_HIDDEN: 'post_hidden',
  POST_RESTORED: 'post_restored',
  POST_ARCHIVED: 'post_archived',
  YOUTH_RECORD_ACCESSED: 'youth_record_accessed',
  GUARDIAN_CONSENT_RECORDED: 'guardian_consent_recorded',
  MEDICAL_NOTE_ACCESSED: 'medical_note_accessed',
  AI_ACTION_EXECUTED: 'ai_action_executed',
  TIER_PROMOTED: 'tier_promoted',
};

// Helper: Check valid assignment transition
export function canTransitionAssignment(currentStatus, targetStatus) {
  if (currentStatus === targetStatus) return true;
  const allowed = VALID_ASSIGNMENT_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

// Helper: Determine if role is leadership
export function isLeaderRole(role) {
  return [
    VBT_ROLES.ADMIN,
    VBT_ROLES.COORDINATOR,
    VBT_ROLES.TEAM_LEADER,
    VBT_ROLES.SERVICE_LEADER,
    VBT_ROLES.PASTORAL_CARE,
  ].includes(role);
}

// Helper: Determine if role can view pastoral_private data
export function canViewPastoral(role) {
  return [
    VBT_ROLES.ADMIN,
    VBT_ROLES.PASTORAL_CARE,
    VBT_ROLES.COORDINATOR,
  ].includes(role);
}

// Helper: Audit Log Entry Factory
export function createAuditRecord({
  action,
  targetId,
  targetType,
  performedBy,
  actorRole = 'unknown',
  communityId = 'vbt_main',
  details = {},
}) {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    communityId,
    action,
    targetId,
    targetType,
    performedBy,
    actorRole,
    details,
    timestamp: new Date().toISOString(),
  };
}
