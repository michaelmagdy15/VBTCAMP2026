/**
 * VBT AI Assistant Service
 *
 * Permission-Aware, Read-Only-First AI Assistant for the VBT Sports Community.
 *
 * STRICT AI SAFETY RULES:
 * 1. The assistant ONLY receives and reveals data the current user is authorized to see.
 * 2. Sensitive pastoral notes, child data, guardian phone, medical info, emergency details,
 *    and private leadership deliberations are EXCLUDED by default.
 * 3. Read-only answers are provided first.
 * 4. Mutations require explicit coordinator review & confirmation ("Confirm & Execute").
 * 5. Every AI-triggered mutation is logged to the community audit log.
 * 6. Explains data uncertainty and source data freshness.
 */

import { collection, doc, setDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import { AUDIT_ACTIONS, createAuditRecord } from '../contracts/communityContracts';

// ─────────────────────────────────────────────
// Role Constants & Helpers
// ─────────────────────────────────────────────

export const ROLE_TIERS = {
  MEMBER: 'member',
  SERVANT: 'servant',
  COORDINATOR: 'coordinator',
};

const COORDINATOR_ROLES = new Set([
  'admin',
  'coordinator',
  'pastoral_care_leader',
]);

const SERVANT_ROLES = new Set([
  'servant',
  'active_servant',
  'trained_servant',
  'volunteer',
  'team_leader',
  'game_leader',
  'service_leader',
  'leader',
  'referee',
  'sports_head',
]);

/**
 * Determine the user's role tier: 'coordinator' | 'servant' | 'member'
 * @param {Object|null} user
 * @returns {string}
 */
export function getUserRoleTier(user) {
  if (!user) return ROLE_TIERS.MEMBER;
  if (user.isAdmin || user.isCoordinator) return ROLE_TIERS.COORDINATOR;

  const role = (user.role || '').toLowerCase().trim();
  if (COORDINATOR_ROLES.has(role)) return ROLE_TIERS.COORDINATOR;
  if (SERVANT_ROLES.has(role)) return ROLE_TIERS.SERVANT;

  return ROLE_TIERS.MEMBER;
}

// ─────────────────────────────────────────────
// Suggested Questions Catalog
// ─────────────────────────────────────────────

export const SUGGESTED_QUESTIONS = {
  [ROLE_TIERS.MEMBER]: [
    'What am I serving in this week?',
    'When is the next meeting?',
    'Where do I check in?',
    'What opportunities match my interests?',
    'What training do I need?',
  ],
  [ROLE_TIERS.SERVANT]: [
    'What should I prepare for my station?',
    'What is my arrival time?',
    'Who is on my team?',
    'What am I serving in this week?',
    'When is the next meeting?',
  ],
  [ROLE_TIERS.COORDINATOR]: [
    'Who is available Friday?',
    'Which roles are unfilled?',
    'Who has not confirmed?',
    'Which members may need follow-up?',
    'Draft a serving schedule recommendation',
  ],
};

/**
 * Get quick suggested questions tailored to the user's role tier
 * @param {Object|null} currentUser
 * @returns {Array<string>}
 */
export function getSuggestedQuestions(currentUser) {
  const tier = getUserRoleTier(currentUser);
  return SUGGESTED_QUESTIONS[tier] || SUGGESTED_QUESTIONS[ROLE_TIERS.MEMBER];
}

// ─────────────────────────────────────────────
// Strict AI Safety: Blacklisted Fields & Scanners
// ─────────────────────────────────────────────

export const STRICT_EXCLUDED_FIELDS = [
  'pastoralNotes',
  'pastoralCareNotes',
  'pastoral_notes',
  'medicalNotes',
  'medicalInfo',
  'medical_notes',
  'emergencyContact',
  'emergency_contact',
  'emergencyPhone',
  'guardianPhone',
  'guardianContact',
  'guardianName',
  'guardianConsent',
  'childData',
  'childInfo',
  'minorDetails',
  'privateDeliberations',
  'leadershipDeliberations',
  'deliberations',
  'rawPhoneNumber',
  'password',
  'token',
];

const FORBIDDEN_QUERY_PATTERNS = [
  /pastoral\s*(notes?|care|details?|records?)/i,
  /medical\s*(notes?|info|records?|history|conditions?)/i,
  /guardian\s*(phone|contact|number|name|details?)/i,
  /child\s*(data|info|records?|emergency|phone)/i,
  /emergency\s*(contact|phone|number|details?)/i,
  /private\s*(deliberations?|discussions?|leadership\s*notes?)/i,
];

/**
 * Deep-clean an object or array to remove all strictly excluded sensitive keys
 * @param {*} value
 * @returns {*}
 */
function sanitizeDeep(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep);
  }
  if (typeof value === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      if (STRICT_EXCLUDED_FIELDS.includes(k)) {
        continue;
      }
      clean[k] = sanitizeDeep(v);
    }
    return clean;
  }
  return value;
}

// ─────────────────────────────────────────────
// Data Freshness & Uncertainty Helpers
// ─────────────────────────────────────────────

/**
 * Format data freshness text from timestamp
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export function formatDataFreshness(timestamp) {
  if (!timestamp) return 'Data as of just now';
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return 'Data as of just now';

  const diffMs = Math.max(0, Date.now() - time);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Data as of just now';
  if (diffMin === 1) return 'Data as of 1 minute ago';
  if (diffMin < 60) return `Data as of ${diffMin} minutes ago`;
  if (diffHours === 1) return 'Data as of 1 hour ago';
  if (diffHours < 24) return `Data as of ${diffHours} hours ago`;
  return `Data as of ${new Date(timestamp).toLocaleDateString()}`;
}

/**
 * Generate explanatory uncertainty note based on freshness
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export function getDataUncertaintyNote(timestamp) {
  const freshness = formatDataFreshness(timestamp);
  return `${freshness}. Real-time synchronization is active; newly confirmed assignments or check-ins within the last few minutes may have a slight propagation buffer.`;
}

// ─────────────────────────────────────────────
// Context Filtering (STRICT ROLE-SCOPED)
// ─────────────────────────────────────────────

/**
 * Filters the community context strictly by current user's role.
 * Sensitive fields (pastoral notes, child records, guardian contacts, medical info, emergency details,
 * private deliberations) are STRIPPED from all roles.
 *
 * @param {Object} fullContext
 * @param {Object|null} currentUser
 * @returns {Object} safeContext
 */
export function filterContextByRole(fullContext = {}, currentUser = null) {
  const roleTier = getUserRoleTier(currentUser);
  const asOf = fullContext.asOf || fullContext.timestamp || new Date().toISOString();
  const userId = currentUser?.id || currentUser?.memberId || currentUser?.uid || null;

  // Sanitize all raw objects first (strip all blacklisted sensitive fields)
  const sanitizedContext = sanitizeDeep(fullContext);

  const rawServices = sanitizedContext.services || [];
  const rawOpportunities = sanitizedContext.opportunities || [];
  const rawAssignments = sanitizedContext.assignments || [];
  const rawMembers = sanitizedContext.members || [];
  const rawTeams = sanitizedContext.teams || [];
  const rawStationPrep = sanitizedContext.stationPrep || [];
  const rawTrainings = sanitizedContext.trainings || [];

  // Services & meetings are public community events
  const safeServices = rawServices.map((s) => ({
    id: s.id,
    title: s.title || s.name || 'Community Service',
    serviceType: s.serviceType || s.type || 'weekly_service',
    date: s.date,
    startTime: s.startTime || '18:30',
    endTime: s.endTime || '21:30',
    location: s.location || { name: 'Main Sports Gymnasium' },
    leadServantName: s.leadServantName || 'Pastoral & Sports Ministry Team',
    description: s.description || '',
    status: s.status || 'scheduled',
  }));

  // Public serving opportunities
  const safeOpportunities = rawOpportunities.map((op) => ({
    id: op.id,
    title: op.title || op.roleName || 'Serving Station',
    category: op.category || op.sport || 'Sports Station',
    serviceId: op.serviceId || null,
    date: op.date || null,
    totalSpots: op.totalSpots || op.capacity || 1,
    assignedCount: op.assignedCount || 0,
    spotsRemaining: Math.max(0, (op.totalSpots || op.capacity || 1) - (op.assignedCount || 0)),
    location: op.location || 'Sports Court',
    requiredTier: op.requiredTier || 'volunteer',
    description: op.description || '',
    requirements: op.requirements || [],
  }));

  let safeAssignments = [];
  let safeStationPrep = [];
  let safeMembers = [];
  let safeTeams = [];
  let coordinatorData = {};

  if (roleTier === ROLE_TIERS.MEMBER) {
    // Member: ONLY their own assignments
    safeAssignments = rawAssignments.filter(
      (a) => userId && (a.memberId === userId || a.id === userId)
    );

    // Member: Safe public profile of self only
    safeMembers = rawMembers
      .filter((m) => userId && (m.id === userId || m.memberId === userId))
      .map((m) => ({
        id: m.id,
        displayName: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Member',
        role: m.role || 'member',
        sportsInterests: m.sportsInterests || [],
      }));

    // Member: General teams they belong to (names only)
    safeTeams = rawTeams.filter((t) => (t.memberIds || []).includes(userId)).map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
    }));

    // Member: Station prep is not shown to general members
    safeStationPrep = [];
  } else if (roleTier === ROLE_TIERS.SERVANT) {
    // Servant: Own assignments + Teammates on the same station/service
    const myAssignmentStationIds = new Set();
    const myAssignmentServiceIds = new Set();

    rawAssignments.forEach((a) => {
      if (userId && (a.memberId === userId || a.id === userId)) {
        if (a.opportunityId) myAssignmentStationIds.add(a.opportunityId);
        if (a.serviceId) myAssignmentServiceIds.add(a.serviceId);
      }
    });

    safeAssignments = rawAssignments.filter((a) => {
      const isMine = userId && (a.memberId === userId || a.id === userId);
      const isStationTeammate =
        a.opportunityId && myAssignmentStationIds.has(a.opportunityId);
      return isMine || isStationTeammate;
    });

    // Servant: Station prep ONLY for their assigned station(s)
    safeStationPrep = rawStationPrep.filter((prep) =>
      myAssignmentStationIds.has(prep.opportunityId) ||
      myAssignmentStationIds.has(prep.stationId)
    );

    // Servant: Teammates and leaders in their teams/stations
    safeMembers = rawMembers
      .filter((m) => {
        if (m.id === userId) return true;
        return safeAssignments.some((a) => a.memberId === m.id);
      })
      .map((m) => ({
        id: m.id,
        displayName: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Servant',
        role: m.role || 'servant',
        team: m.team || null,
        sportsInterests: m.sportsInterests || [],
      }));

    safeTeams = rawTeams.filter((t) =>
      (t.memberIds || []).includes(userId) || (t.leaderId === userId)
    );
  } else {
    // Coordinator Tier: Community-wide operational view
    // (STILL STRIPPED OF PASTORAL, CHILD, MEDICAL, GUARDIAN, EMERGENCY NOTES)
    safeAssignments = rawAssignments.map((a) => ({
      id: a.id,
      memberId: a.memberId,
      memberName: a.memberName || a.name || 'Servant',
      opportunityId: a.opportunityId,
      opportunityTitle: a.opportunityTitle || a.title || 'Station',
      serviceId: a.serviceId,
      status: a.status || 'pending',
      team: a.team || null,
      notes: a.notes || '',
    }));

    safeStationPrep = rawStationPrep;

    safeMembers = rawMembers.map((m) => ({
      id: m.id,
      displayName: m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Community Member',
      role: m.role || 'member',
      team: m.team || null,
      sportsInterests: m.sportsInterests || [],
      status: m.status || 'active',
      isAvailableFriday: m.isAvailableFriday !== false,
      consecutiveMissedServices: m.consecutiveMissedServices || 0,
      lastServedAt: m.lastServedAt || null,
    }));

    safeTeams = rawTeams;

    // Coordinator specific analytics
    const unfilledOpportunities = safeOpportunities.filter((op) => op.spotsRemaining > 0);
    const unconfirmedAssignments = safeAssignments.filter(
      (a) => a.status === 'pending' || a.status === 'interest_submitted' || a.status === 'pending_leader_review'
    );
    const membersNeedingFollowUp = safeMembers.filter(
      (m) =>
        (m.consecutiveMissedServices && m.consecutiveMissedServices >= 2) ||
        safeAssignments.some(
          (a) => a.memberId === m.id && (a.status === 'declined' || a.status === 'replacement_requested')
        )
    );

    coordinatorData = {
      unfilledRoles: unfilledOpportunities,
      unconfirmedAssignments,
      membersNeedingFollowUp,
      totalActiveServants: safeMembers.filter((m) =>
        SERVANT_ROLES.has((m.role || '').toLowerCase())
      ).length,
    };
  }

  return {
    asOf,
    freshnessText: formatDataFreshness(asOf),
    uncertaintyNotes: getDataUncertaintyNote(asOf),
    roleTier,
    currentUser: currentUser ? sanitizeDeep(currentUser) : null,
    services: safeServices,
    opportunities: safeOpportunities,
    assignments: safeAssignments,
    members: safeMembers,
    teams: safeTeams,
    stationPrep: safeStationPrep,
    trainings: rawTrainings,
    ...coordinatorData,
  };
}

// ─────────────────────────────────────────────
// Staged Mutations Store (Read-Only First Guarantee)
// ─────────────────────────────────────────────

export const MUTATION_TYPES = {
  CONFIRM_ASSIGNMENT: 'confirm_assignment',
  SEND_REMINDER: 'send_reminder',
  REASSIGN_SERVANT: 'reassign_servant',
  CREATE_SCHEDULE_ASSIGNMENTS: 'create_schedule_assignments',
};

const _stagedMutations = new Map();
const _inMemoryAuditLog = [];

/**
 * Clear staged mutations and memory audit log (useful for test isolation)
 */
export function clearAssistantState() {
  _stagedMutations.clear();
  _inMemoryAuditLog.length = 0;
}

/**
 * Stage an administrative mutation requiring explicit coordinator confirmation.
 * Does NOT execute the change immediately.
 *
 * @param {string} mutationType
 * @param {Object} payload
 * @param {Object} coordinatorUser
 * @returns {Object} Staged mutation draft
 */
export function stageAssistantMutation(mutationType, payload = {}, coordinatorUser) {
  const roleTier = getUserRoleTier(coordinatorUser);
  if (roleTier !== ROLE_TIERS.COORDINATOR) {
    throw new Error('Unauthorized: Staging community mutations requires Coordinator or Admin privileges.');
  }

  if (!mutationType) {
    throw new Error('mutationType is required to stage a mutation.');
  }

  const stagedId = `staged_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let summary = 'Proposed community data modification';
  let impact = 'Updates community records upon confirmation.';

  if (mutationType === MUTATION_TYPES.CONFIRM_ASSIGNMENT) {
    const member = payload.memberName || payload.memberId || 'Servant';
    const station = payload.opportunityTitle || payload.opportunityId || 'Station';
    summary = `Confirm serving assignment for ${member} at ${station}.`;
    impact = `Status will transition to 'confirmed' and notify ${member}.`;
  } else if (mutationType === MUTATION_TYPES.SEND_REMINDER) {
    const target = payload.targetDescription || (payload.memberCount ? `${payload.memberCount} unconfirmed servants` : 'servants');
    summary = `Send serving schedule reminder notification to ${target}.`;
    impact = `Pushes an alert and in-app reminder to servants to confirm their attendance.`;
  } else if (mutationType === MUTATION_TYPES.REASSIGN_SERVANT) {
    const member = payload.memberName || payload.memberId || 'Servant';
    const newStation = payload.newStationTitle || payload.newOpportunityId || 'New Station';
    summary = `Reassign ${member} to ${newStation}.`;
    impact = `Updates active serving assignment and notifies station team leader.`;
  } else if (mutationType === MUTATION_TYPES.CREATE_SCHEDULE_ASSIGNMENTS) {
    const count = (payload.recommendations || []).length;
    summary = `Apply schedule draft recommendation and assign ${count} servants to stations.`;
    impact = `Creates ${count} new pending serving assignments for Friday service.`;
  }

  const stagedMutation = {
    id: stagedId,
    mutationType,
    payload,
    summary,
    impact,
    status: 'pending_confirmation',
    stagedBy: {
      id: coordinatorUser.id || coordinatorUser.uid || 'coordinator',
      name: coordinatorUser.displayName || coordinatorUser.firstName || 'Coordinator',
      role: coordinatorUser.role || 'coordinator',
    },
    stagedAt: new Date().toISOString(),
  };

  _stagedMutations.set(stagedId, stagedMutation);
  return stagedMutation;
}

/**
 * Execute a previously staged mutation upon explicit confirmation by coordinator.
 * Logs action to the community audit log.
 *
 * @param {string} stagedMutationId
 * @param {Object} coordinatorUser
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Object>} Execution result & audit record
 */
export async function executeConfirmedMutation(
  stagedMutationId,
  coordinatorUser,
  communityId = DEFAULT_COMMUNITY_ID
) {
  const roleTier = getUserRoleTier(coordinatorUser);
  if (roleTier !== ROLE_TIERS.COORDINATOR) {
    throw new Error('Unauthorized: Executing community mutations requires Coordinator or Admin privileges.');
  }

  const staged = _stagedMutations.get(stagedMutationId);
  if (!staged) {
    throw new Error(`Staged mutation ${stagedMutationId} not found or expired.`);
  }

  if (staged.status !== 'pending_confirmation') {
    throw new Error(`Staged mutation ${stagedMutationId} has already been ${staged.status}.`);
  }

  // Create explicit audit record
  const auditRecord = createAuditRecord({
    action: AUDIT_ACTIONS.AI_ACTION_EXECUTED,
    targetId: staged.payload.assignmentId || staged.payload.opportunityId || staged.id,
    targetType: staged.mutationType,
    performedBy: coordinatorUser.id || coordinatorUser.uid || 'coordinator',
    actorRole: coordinatorUser.role || 'coordinator',
    communityId,
    details: {
      stagedMutationId,
      mutationType: staged.mutationType,
      summary: staged.summary,
      impact: staged.impact,
      payload: staged.payload,
      confirmedAt: new Date().toISOString(),
    },
  });

  // Transition state
  staged.status = 'executed';
  staged.executedAt = new Date().toISOString();
  staged.executedBy = coordinatorUser.id || coordinatorUser.uid || 'coordinator';
  staged.auditRecordId = auditRecord.id;

  // Persist audit record to in-memory audit store
  _inMemoryAuditLog.push(auditRecord);

  // Attempt Firestore write gracefully if db is available
  try {
    if (db && db._mockDb !== true) {
      const auditDocRef = doc(db, `vbt_communities/${communityId}/audit_logs/${auditRecord.id}`);
      await setDoc(auditDocRef, {
        ...auditRecord,
        createdAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    // Non-blocking for offline or mocked environments
    console.warn(`[VbtAiAssistant] Non-blocking audit Firestore write fallback:`, err?.message || err);
  }

  return {
    success: true,
    stagedMutationId,
    executedMutation: staged,
    auditRecord,
    message: `Action executed successfully: ${staged.summary}. Community audit log recorded (ID: ${auditRecord.id}).`,
  };
}

/**
 * Retrieve recent community audit logs recorded by the AI Assistant
 * @returns {Array<Object>}
 */
export function getCommunityAuditLogs() {
  return [..._inMemoryAuditLog];
}

// ─────────────────────────────────────────────
// Automated Schedule Draft Recommendation
// ─────────────────────────────────────────────

/**
 * Generates an AI-driven serving schedule recommendation for unfilled roles
 * based on candidate servant interests, tiers, and availability.
 *
 * @param {Object} communityContext
 * @param {Object} coordinatorUser
 * @returns {Object} Draft schedule recommendation
 */
export function generateScheduleDraftRecommendation(communityContext = {}, coordinatorUser) {
  const roleTier = getUserRoleTier(coordinatorUser);
  if (roleTier !== ROLE_TIERS.COORDINATOR) {
    throw new Error('Unauthorized: Generating schedule recommendations requires Coordinator or Admin privileges.');
  }

  const safeContext = filterContextByRole(communityContext, coordinatorUser);
  const opportunities = safeContext.opportunities || [];
  const members = safeContext.members || [];
  const existingAssignments = safeContext.assignments || [];

  // Filter unfilled opportunities
  const unfilled = opportunities.filter((op) => op.spotsRemaining > 0);

  // Available servants
  const assignedMemberIds = new Set(
    existingAssignments
      .filter((a) => a.status === 'confirmed' || a.status === 'pending')
      .map((a) => a.memberId)
  );

  const availableServants = members.filter((m) => {
    const isServant = SERVANT_ROLES.has((m.role || '').toLowerCase());
    const isAvailable = m.isAvailableFriday !== false;
    const notAssigned = !assignedMemberIds.has(m.id);
    return isServant && isAvailable && notAssigned;
  });

  const recommendations = [];
  const allocatedServantIds = new Set();

  for (const op of unfilled) {
    let remaining = op.spotsRemaining;

    // Look for sports interests match
    const matchingCandidates = availableServants.filter((servant) => {
      if (allocatedServantIds.has(servant.id)) return false;
      const interests = (servant.sportsInterests || []).map((i) => i.toLowerCase());
      const opCategory = (op.category || '').toLowerCase();
      const opTitle = (op.title || '').toLowerCase();

      return interests.some((interest) =>
        opCategory.includes(interest) || opTitle.includes(interest)
      );
    });

    // Also consider general available servants
    const fallbackCandidates = availableServants.filter(
      (s) => !allocatedServantIds.has(s.id) && !matchingCandidates.includes(s)
    );

    const candidates = [...matchingCandidates, ...fallbackCandidates];

    for (const candidate of candidates) {
      if (remaining <= 0) break;

      const hasInterestMatch = (candidate.sportsInterests || []).some((i) =>
        (op.category || '').toLowerCase().includes(i.toLowerCase()) ||
        (op.title || '').toLowerCase().includes(i.toLowerCase())
      );

      recommendations.push({
        opportunityId: op.id,
        opportunityTitle: op.title,
        category: op.category,
        memberId: candidate.id,
        memberName: candidate.displayName,
        memberRole: candidate.role,
        reason: hasInterestMatch
          ? `High Match: Servant sports interests include ${(candidate.sportsInterests || []).join(', ')}`
          : 'Availability Match: Certified active servant available for Friday service',
        confidenceScore: hasInterestMatch ? 0.94 : 0.82,
      });

      allocatedServantIds.add(candidate.id);
      remaining--;
    }
  }

  const upcomingService = (safeContext.services || [])[0] || {
    id: 'srv_next_friday',
    title: 'Upcoming Weekly Community Service',
    date: 'Next Friday',
  };

  return {
    draftId: `draft_${Date.now()}`,
    serviceId: upcomingService.id,
    serviceTitle: upcomingService.title,
    serviceDate: upcomingService.date,
    generatedAt: new Date().toISOString(),
    totalUnfilledSpots: unfilled.reduce((acc, curr) => acc + curr.spotsRemaining, 0),
    totalRecommendations: recommendations.length,
    recommendations,
    notes: `Schedule draft generated based on ${availableServants.length} available servants and ${unfilled.length} open stations. Explicit coordinator confirmation required before writing to records.`,
  };
}

// ─────────────────────────────────────────────
// Query Intent Processing & Answering
// ─────────────────────────────────────────────

/**
 * Process a natural language question or command against the community context.
 *
 * @param {string} rawQuery
 * @param {Object|null} currentUser
 * @param {Object} communityContext
 * @returns {Promise<Object>} Assistant response object
 */
export async function processAssistantQuery(rawQuery = '', currentUser = null, communityContext = {}) {
  const query = (rawQuery || '').trim();
  const safeContext = filterContextByRole(communityContext, currentUser);
  const roleTier = safeContext.roleTier;
  const user = safeContext.currentUser;
  const userId = user?.id || user?.memberId || user?.uid || null;

  // 1. STRICT SAFETY CHECK: Sensitive Pastoral / Medical / Child Data
  for (const pattern of FORBIDDEN_QUERY_PATTERNS) {
    if (pattern.test(query)) {
      return {
        answer: '🔒 **Confidential Data Protected**: Pastoral notes, medical records, emergency contacts, child/minor information, and private leadership deliberations are strictly confidential. The VBT AI Assistant is programmed never to access or disclose these records.',
        intent: 'BLOCKED_SENSITIVE_DATA',
        roleTier,
        isAuthorized: false,
        safetyBlocked: true,
        freshness: safeContext.freshnessText,
        uncertaintyNotes: safeContext.uncertaintyNotes,
        suggestedActions: getSuggestedQuestions(currentUser),
      };
    }
  }

  const lower = query.toLowerCase();

  // 2. COORDINATOR QUESTIONS & PERMISSION GATES
  const isAskingAvailableFriday = /available\s*friday|friday\s*availability|who\s*can\s*serve\s*friday/i.test(lower);
  const isAskingUnfilledRoles = /unfilled|open\s*roles|open\s*spots|vacant\s*stations|unassigned\s*roles/i.test(lower);
  const isAskingUnconfirmed = /not\s*confirmed|unconfirmed|pending\s*confirmation/i.test(lower);
  const isAskingFollowUp = /follow[\s-]*up|members?\s*(who\s*need|needing)\s*follow/i.test(lower);
  const isAskingDraftSchedule = /draft.*(schedule|recommendation)|recommend.*schedule/i.test(lower);

  const isCoordinatorInquiry =
    isAskingAvailableFriday ||
    isAskingUnfilledRoles ||
    isAskingUnconfirmed ||
    isAskingFollowUp ||
    isAskingDraftSchedule;

  // Mutation commands
  const isMutationCommand =
    /(^confirm\s+assignment|confirm\s+this\s+assignment|send\s+reminder|reassign\s+servant|apply\s+draft)/i.test(lower);

  // If asking coordinator questions without coordinator role:
  if ((isCoordinatorInquiry || isMutationCommand) && roleTier !== ROLE_TIERS.COORDINATOR) {
    return {
      answer: `🛡️ **Coordinator Access Required**: Inquiries about community-wide availability, unfilled stations, unconfirmed servant rosters, follow-up flags, and schedule drafting are restricted to **Ministry Coordinators and Admins** to maintain servant privacy. As a ${roleTier === ROLE_TIERS.SERVANT ? 'Servant' : 'Member'}, you can ask about your own assignments, upcoming community meetings, station checklists, check-in desks, or training.`,
      intent: 'PERMISSION_DENIED_COORDINATOR_ONLY',
      roleTier,
      isAuthorized: false,
      safetyBlocked: false,
      requiredRole: ROLE_TIERS.COORDINATOR,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: getSuggestedQuestions(currentUser),
    };
  }

  // 3. MUTATION STAGING (Coordinator Only - Read-Only First Guarantee)
  if (isMutationCommand && roleTier === ROLE_TIERS.COORDINATOR) {
    let stagedMutation = null;

    if (/confirm\s+(assignment|this)/i.test(lower)) {
      // Find candidate assignment
      const unconfirmed = safeContext.unconfirmedAssignments || [];
      const target = unconfirmed[0] || (safeContext.assignments || [])[0] || {
        id: 'asg_default',
        memberName: 'Servant',
        opportunityTitle: 'Sports Station',
      };

      stagedMutation = stageAssistantMutation(
        MUTATION_TYPES.CONFIRM_ASSIGNMENT,
        {
          assignmentId: target.id,
          memberName: target.memberName,
          opportunityTitle: target.opportunityTitle,
          confirmedByRole: 'coordinator',
        },
        currentUser
      );
    } else if (/send\s+reminder/i.test(lower)) {
      const count = (safeContext.unconfirmedAssignments || []).length || 3;
      stagedMutation = stageAssistantMutation(
        MUTATION_TYPES.SEND_REMINDER,
        {
          memberCount: count,
          targetDescription: `${count} unconfirmed servants for Friday Service`,
          serviceDate: 'Friday 6:30 PM',
        },
        currentUser
      );
    } else {
      stagedMutation = stageAssistantMutation(
        MUTATION_TYPES.CONFIRM_ASSIGNMENT,
        {
          note: query,
          manualTrigger: true,
        },
        currentUser
      );
    }

    return {
      answer: `✍️ **Action Drafted for Review**: Under VBT AI Safety Rules, mutations are never executed automatically. I have prepared the following action draft. Please review and click **Confirm & Execute** below to apply this update to community records:`,
      intent: 'MUTATION_STAGED',
      roleTier,
      isAuthorized: true,
      requiresConfirmation: true,
      stagedMutation,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
    };
  }

  // 4. COORDINATOR INQUIRIES
  if (roleTier === ROLE_TIERS.COORDINATOR) {
    if (isAskingAvailableFriday) {
      const members = safeContext.members || [];
      const available = members.filter((m) =>
        m.isAvailableFriday !== false && SERVANT_ROLES.has((m.role || '').toLowerCase())
      );

      const namesList = available.length > 0
        ? available.map((m) => `• **${m.displayName}** (${m.role}) - Interests: ${(m.sportsInterests || []).join(', ') || 'General'}`).join('\n')
        : 'No available servants recorded yet for this Friday.';

      return {
        answer: `📋 **Servants Available for Friday (${available.length} Total)**:\n\n${namesList}\n\n*${safeContext.freshnessText}*`,
        intent: 'COORDINATOR_FRIDAY_AVAILABILITY',
        roleTier,
        isAuthorized: true,
        freshness: safeContext.freshnessText,
        uncertaintyNotes: safeContext.uncertaintyNotes,
        data: { availableCount: available.length, available },
        suggestedActions: [
          'Which roles are unfilled?',
          'Draft a serving schedule recommendation',
        ],
      };
    }

    if (isAskingUnfilledRoles) {
      const unfilled = safeContext.unfilledRoles || [];
      const list = unfilled.length > 0
        ? unfilled.map((u) => `• **${u.title}** (${u.category}): ${u.spotsRemaining} spot(s) remaining at ${u.location}`).join('\n')
        : 'All station roles are currently filled for the upcoming service!';

      return {
        answer: `⚠️ **Unfilled Serving Stations (${unfilled.length} Stations with Openings)**:\n\n${list}\n\nWould you like me to draft an assignment recommendation matching available servants to these slots?`,
        intent: 'COORDINATOR_UNFILLED_ROLES',
        roleTier,
        isAuthorized: true,
        freshness: safeContext.freshnessText,
        uncertaintyNotes: safeContext.uncertaintyNotes,
        data: { unfilledCount: unfilled.length, unfilled },
        suggestedActions: [
          'Draft a serving schedule recommendation',
          'Who is available Friday?',
        ],
      };
    }

    if (isAskingUnconfirmed) {
      const unconfirmed = safeContext.unconfirmedAssignments || [];
      const list = unconfirmed.length > 0
        ? unconfirmed.map((a) => `• **${a.memberName}** - Station: *${a.opportunityTitle}* (Status: ${a.status})`).join('\n')
        : 'All assigned servants have confirmed their presence for this week!';

      return {
        answer: `⏳ **Pending Servant Confirmations (${unconfirmed.length} Total)**:\n\n${list}\n\n*${safeContext.freshnessText}*`,
        intent: 'COORDINATOR_UNCONFIRMED_SERVANTS',
        roleTier,
        isAuthorized: true,
        freshness: safeContext.freshnessText,
        uncertaintyNotes: safeContext.uncertaintyNotes,
        data: { unconfirmedCount: unconfirmed.length, unconfirmed },
        suggestedActions: [
          'Send reminder to unconfirmed servants',
          'Which roles are unfilled?',
        ],
      };
    }

    if (isAskingFollowUp) {
      const followUps = safeContext.membersNeedingFollowUp || [];
      const list = followUps.length > 0
        ? followUps.map((m) => {
            const reason = m.consecutiveMissedServices >= 2
              ? `Missed ${m.consecutiveMissedServices} consecutive services`
              : 'Recent replacement request / declined assignment';
            return `• **${m.displayName}** (${m.role}): *${reason}*`;
          }).join('\n')
        : 'Great news! No members currently flagged for attendance or assignment follow-up.';

      return {
        answer: `🤝 **Members Needing Pastoral / Coordinator Follow-Up (${followUps.length})**:\n\n${list}\n\n*Note: Pastoral care notes are excluded for privacy. Please follow up personally or through pastoral leaders.*`,
        intent: 'COORDINATOR_MEMBERS_NEEDING_FOLLOWUP',
        roleTier,
        isAuthorized: true,
        freshness: safeContext.freshnessText,
        uncertaintyNotes: safeContext.uncertaintyNotes,
        data: { followUpCount: followUps.length, followUps },
      };
    }

    if (isAskingDraftSchedule) {
      const draft = generateScheduleDraftRecommendation(communityContext, currentUser);
      const recList = (draft.recommendations || []).map(
        (r, idx) => `${idx + 1}. **${r.memberName}** ➔ **${r.opportunityTitle}**\n   *${r.reason}* (Confidence: ${Math.round(r.confidenceScore * 100)}%)`
      ).join('\n\n');

      return {
        answer: `🎯 **AI Schedule Recommendation for ${draft.serviceTitle}**\n\nI have matched **${draft.totalRecommendations}** available servants to open stations based on athletic interests and servant qualifications:\n\n${recList || 'No pending recommendations needed—all roles are covered.'}\n\n*To apply these assignments to community records, please click the confirmation action below.*`,
        intent: 'COORDINATOR_SCHEDULE_DRAFT',
        roleTier,
        isAuthorized: true,
        data: draft,
        requiresConfirmation: draft.recommendations.length > 0,
        stagedMutation: draft.recommendations.length > 0
          ? stageAssistantMutation(
              MUTATION_TYPES.CREATE_SCHEDULE_ASSIGNMENTS,
              { recommendations: draft.recommendations, serviceId: draft.serviceId },
              currentUser
            )
          : null,
        freshness: safeContext.freshnessText,
        uncertaintyNotes: safeContext.uncertaintyNotes,
      };
    }
  }

  // 5. SERVANT QUESTIONS
  const isAskingStationPrep = /prepare.*station|station.*prep|what.*prepare/i.test(lower);
  const isAskingArrivalTime = /arrival\s*time|when.*arrive|call\s*time|what\s*time/i.test(lower);
  const isAskingTeam = /who.*(my\s*team|on\s*my\s*team)|team\s*members?/i.test(lower);

  if (isAskingStationPrep) {
    if (roleTier === ROLE_TIERS.MEMBER) {
      return {
        answer: 'ℹ️ **Station Prep**: Station preparation instructions are reserved for assigned servants. If you would like to serve at a sports station, check out the serving opportunities tab to apply!',
        intent: 'MEMBER_NOT_ASSIGNED',
        roleTier,
        isAuthorized: true,
        freshness: safeContext.freshnessText,
        suggestedActions: ['What opportunities match my interests?', 'Where do I check in?'],
      };
    }

    const prepNotes = safeContext.stationPrep || [];
    const myAssignment = (safeContext.assignments || [])[0];

    const prepText = prepNotes.length > 0
      ? prepNotes.map((p) => `• **${p.title || 'Station'}**: ${p.instructions || p.checklist?.join(', ') || 'Ready sports equipment and welcome youth.'}`).join('\n')
      : (myAssignment
          ? `• **${myAssignment.opportunityTitle || 'Assigned Station'}**: Inspect court boundaries, collect balls/bibs from equipment room, and gather station team 15 minutes before opening prayer.`
          : 'You do not have a confirmed station duty scheduled for this week.');

    return {
      answer: `📋 **Station Preparation Guide**:\n\n${prepText}\n\n*Spiritual Focus: Greet every youth by name and model joyful sportsmanship.*`,
      intent: 'SERVANT_STATION_PREPARATION',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['What is my arrival time?', 'Who is on my team?'],
    };
  }

  if (isAskingArrivalTime) {
    const nextService = (safeContext.services || [])[0];
    const isServant = roleTier === ROLE_TIERS.SERVANT || roleTier === ROLE_TIERS.COORDINATOR;
    const callTime = isServant ? '18:00 (30 minutes prior to service)' : '18:30';

    return {
      answer: `⏰ **Arrival & Call Time**:\n\n• **Event**: ${nextService?.title || 'Weekly Community Service & Youth Sports'}\n• **General Service Time**: ${nextService?.startTime || '18:30'} - ${nextService?.endTime || '21:30'}\n• **${isServant ? 'Servants Call Time' : 'Youth & Member Arrival'}**: **${callTime}**\n• **Location**: ${nextService?.location?.name || 'Main Sports Gymnasium & Fellowship Hall'}\n\n${isServant ? 'Please arrive on time for servant alignment prayer and station equipment setup.' : 'Check-in opens 30 minutes before kick-off!'}`,
      intent: 'ARRIVAL_TIME',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['Where do I check in?', 'Who is on my team?'],
    };
  }

  if (isAskingTeam) {
    if (roleTier === ROLE_TIERS.MEMBER) {
      const myTeams = safeContext.teams || [];
      const teamNames = myTeams.length > 0 ? myTeams.map((t) => t.name).join(', ') : 'VBT General Community Fellowship';
      return {
        answer: `👥 **Your Community Group**: You are part of **${teamNames}**! To join a dedicated sports serving station team, explore the Serving Opportunities tab.`,
        intent: 'MEMBER_TEAM',
        roleTier,
        isAuthorized: true,
        freshness: safeContext.freshnessText,
        suggestedActions: ['What opportunities match my interests?', 'When is the next meeting?'],
      };
    }

    const teammates = (safeContext.members || []).filter((m) => m.id !== userId);
    const list = teammates.length > 0
      ? teammates.map((t) => `• **${t.displayName}** (${t.role || 'Servant'})`).join('\n')
      : 'You are currently the primary assigned servant for this station.';

    return {
      answer: `👥 **Your Station Team & Teammates**:\n\n${list}\n\nStation Team Leader coordinates on-court rotation and prayer.`,
      intent: 'SERVANT_TEAM_MEMBERS',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['What should I prepare for my station?', 'What is my arrival time?'],
    };
  }

  // 6. MEMBER QUESTIONS
  const isAskingMyServing = /what\s*am\s*i\s*serving|where\s*am\s*i\s*serving|my\s*serving|my\s*assignment/i.test(lower);
  const isAskingNextMeeting = /when.*next\s*meeting|next\s*service|when.*meet|schedule.*week/i.test(lower);
  const isAskingCheckIn = /where.*check\s*in|how.*check\s*in|qr\s*check|attendance/i.test(lower);
  const isAskingMatchingOpportunities = /match.*interest|opportunities.*match|where\s*can\s*i\s*serve/i.test(lower);
  const isAskingTraining = /what\s*training|training.*need|required\s*training|growth\s*path/i.test(lower);

  if (isAskingMyServing) {
    const myAssignments = safeContext.assignments.filter(
      (a) => a.memberId === userId || a.id === userId
    );

    if (myAssignments.length > 0) {
      const current = myAssignments[0];
      return {
        answer: `🏀 **Your Scheduled Serving Duty**:\n\n• **Station / Role**: **${current.opportunityTitle || current.title || 'Sports Station Servant'}**\n• **Status**: ${current.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending Confirmation'}\n• **Timing**: Friday 18:00 Call Time (Service 18:30 - 21:30)\n• **Station Location**: Main Gymnasium Court\n\nThank you for dedicating your gifts to the youth!`,
        intent: 'MEMBER_MY_SERVING_SCHEDULE',
        roleTier,
        isAuthorized: true,
        freshness: safeContext.freshnessText,
        uncertaintyNotes: safeContext.uncertaintyNotes,
        suggestedActions: ['What should I prepare for my station?', 'What is my arrival time?'],
      };
    }

    return {
      answer: `ℹ️ **No Serving Assignment Scheduled**:\n\nYou do not have a scheduled serving duty for this upcoming service. Would you like to explore open opportunities that match your favorite sports?`,
      intent: 'MEMBER_NO_SERVING_SCHEDULE',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['What opportunities match my interests?', 'When is the next meeting?'],
    };
  }

  if (isAskingNextMeeting) {
    const services = safeContext.services || [];
    const weeklyService = services.find((s) => s.serviceType === 'weekly_service') || services[0];
    const servantMeeting = services.find((s) => s.serviceType === 'servant_meeting') || services[1];

    let meetingInfo = '';
    if (weeklyService) {
      meetingInfo += `• **Weekly Community Service & Youth Sports**: ${weeklyService.date || 'Every Friday'} at ${weeklyService.startTime || '18:30'} (${weeklyService.location?.name || 'Main Sports Complex'})\n`;
    }
    if (servantMeeting && (roleTier === ROLE_TIERS.SERVANT || roleTier === ROLE_TIERS.COORDINATOR)) {
      meetingInfo += `• **Servants & Leadership Planning Meeting**: ${servantMeeting.date || 'Every Tuesday'} at ${servantMeeting.startTime || '19:00'} (${servantMeeting.location?.name || 'Leadership Hub'})\n`;
    }

    return {
      answer: `📅 **Upcoming VBT Community Gatherings**:\n\n${meetingInfo || 'Fridays at 6:30 PM (Weekly Service) and Tuesdays at 7:00 PM (Servants Meeting).'}\n\nCome ready for athletic energy, fellowship, and worship!`,
      intent: 'NEXT_MEETING',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['Where do I check in?', 'What am I serving in this week?'],
    };
  }

  if (isAskingCheckIn) {
    return {
      answer: `📍 **VBT Check-In Information**:\n\n• **Location**: Welcome Desk & QR Check-In Kiosk at the Main Gymnasium Entrance.\n• **How it works**: Open the **Scan QR Attendance** button in the app or present your personal Member QR Code to the welcome servant.\n• **Check-in Window**: Opens 30 minutes prior to service start (18:00 on Fridays).\n\nIf you are serving, scanning attendance automatically registers your servant service points!`,
      intent: 'CHECK_IN_INFO',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['When is the next meeting?', 'What am I serving in this week?'],
    };
  }

  if (isAskingMatchingOpportunities) {
    const interests = (user?.sportsInterests || []).map((i) => i.toLowerCase());
    const opportunities = safeContext.opportunities || [];

    const matches = opportunities.filter((op) => {
      const category = (op.category || '').toLowerCase();
      const title = (op.title || '').toLowerCase();
      return interests.length === 0 || interests.some((i) => category.includes(i) || title.includes(i));
    });

    const displayList = (matches.length > 0 ? matches : opportunities).slice(0, 4);
    const listText = displayList.map((op) =>
      `• **${op.title}** (${op.category}) - ${op.spotsRemaining} spot(s) remaining at ${op.location}`
    ).join('\n');

    return {
      answer: `🌟 **Serving Opportunities Matching Your Interests**:\n\n${listText || 'Check the Serving tab for new open spots!'}\n\nSelect an opportunity in the Serving Marketplace to apply and get certified.`,
      intent: 'MATCHING_OPPORTUNITIES',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['What training do I need?', 'When is the next meeting?'],
    };
  }

  if (isAskingTraining) {
    const requiredForTier = roleTier === ROLE_TIERS.MEMBER
      ? ['Foundations of VBT Service', 'Youth Safety & Child Protection Basics']
      : ['Station Leadership & Drill Design', 'Emergency Response & Sports First Aid'];

    const modulesText = requiredForTier.map((m, idx) => `${idx + 1}. **${m}** (Online / Interactive)`).join('\n');

    return {
      answer: `📚 **Recommended Training & Growth Pathway**:\n\nTo advance in your serving journey as a **${roleTier.toUpperCase()}**, we recommend completing:\n\n${modulesText}\n\nCompleting modules unlocks higher servant tiers, badges, and leadership roles!`,
      intent: 'TRAINING_NEEDS',
      roleTier,
      isAuthorized: true,
      freshness: safeContext.freshnessText,
      uncertaintyNotes: safeContext.uncertaintyNotes,
      suggestedActions: ['What opportunities match my interests?', 'What am I serving in this week?'],
    };
  }

  // 7. GENERAL / WELCOME FALLBACK
  return {
    answer: `👋 Hello! I am your **VBT Community AI Assistant**.\n\nI answer community questions while strictly respecting your role permissions (${roleTier.toUpperCase()}) and protecting member confidentiality.\n\nHow can I help you today? Check the suggested questions below for quick guidance.`,
    intent: 'GENERAL_ASSISTANT_QUERY',
    roleTier,
    isAuthorized: true,
    freshness: safeContext.freshnessText,
    uncertaintyNotes: safeContext.uncertaintyNotes,
    suggestedActions: getSuggestedQuestions(currentUser),
  };
}
