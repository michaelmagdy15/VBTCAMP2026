import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

/**
 * ============================================================================
 * VBT SMART ASSIGNMENT & SERVING DISCOVERY ENGINE
 * ============================================================================
 * Handles multi-factor candidate scoring, volunteer availability calendars,
 * burnout protection limits, replacement recommendations, explicit leader-confirmed
 * assignments, and an auditable 9-stage state machine.
 */

// ----------------------------------------------------------------------------
// 1. STATE MACHINE & STATUS DEFINITIONS
// ----------------------------------------------------------------------------

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

/**
 * Valid state transitions mapping for assignment lifecycle.
 * Ensures integrity and auditable step-by-step progress.
 */
export const VALID_STATUS_TRANSITIONS = {
  [ASSIGNMENT_STATUS.OPEN]: [
    ASSIGNMENT_STATUS.INTEREST_SUBMITTED,
    ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
    ASSIGNMENT_STATUS.CANCELLED,
  ],
  [ASSIGNMENT_STATUS.INTEREST_SUBMITTED]: [
    ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
    ASSIGNMENT_STATUS.DECLINED,
    ASSIGNMENT_STATUS.CANCELLED,
  ],
  [ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW]: [
    ASSIGNMENT_STATUS.CONFIRMED,
    ASSIGNMENT_STATUS.DECLINED,
    ASSIGNMENT_STATUS.OPEN,
    ASSIGNMENT_STATUS.CANCELLED,
  ],
  [ASSIGNMENT_STATUS.CONFIRMED]: [
    ASSIGNMENT_STATUS.DECLINED,
    ASSIGNMENT_STATUS.CANCELLED,
    ASSIGNMENT_STATUS.REPLACEMENT_NEEDED,
    ASSIGNMENT_STATUS.COMPLETED,
  ],
  [ASSIGNMENT_STATUS.DECLINED]: [
    ASSIGNMENT_STATUS.OPEN,
    ASSIGNMENT_STATUS.INTEREST_SUBMITTED,
    ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
  ],
  [ASSIGNMENT_STATUS.CANCELLED]: [
    ASSIGNMENT_STATUS.REPLACEMENT_NEEDED,
    ASSIGNMENT_STATUS.OPEN,
    ASSIGNMENT_STATUS.DECLINED,
  ],
  [ASSIGNMENT_STATUS.REPLACEMENT_NEEDED]: [
    ASSIGNMENT_STATUS.REASSIGNED,
    ASSIGNMENT_STATUS.OPEN,
    ASSIGNMENT_STATUS.CANCELLED,
  ],
  [ASSIGNMENT_STATUS.REASSIGNED]: [
    ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
    ASSIGNMENT_STATUS.CONFIRMED,
    ASSIGNMENT_STATUS.CANCELLED,
    ASSIGNMENT_STATUS.COMPLETED,
  ],
  [ASSIGNMENT_STATUS.COMPLETED]: [
    // Terminal state - allows audit / notes updates
    ASSIGNMENT_STATUS.COMPLETED,
  ],
};

/**
 * Validates whether a state transition is permitted.
 * @param {string} currentStatus
 * @param {string} newStatus
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateStatusTransition(currentStatus, newStatus) {
  if (!currentStatus || !newStatus) {
    return {
      isValid: false,
      error: `Both currentStatus ("${currentStatus}") and newStatus ("${newStatus}") are required.`,
    };
  }

  if (currentStatus === newStatus) {
    return { isValid: true };
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowedTransitions) {
    return {
      isValid: false,
      error: `Unknown current status: "${currentStatus}".`,
    };
  }

  if (!allowedTransitions.includes(newStatus)) {
    return {
      isValid: false,
      error: `Invalid transition from "${currentStatus}" to "${newStatus}". Allowed targets: [${allowedTransitions.join(', ')}].`,
    };
  }

  return { isValid: true };
}

// ----------------------------------------------------------------------------
// 2. PATH HELPERS
// ----------------------------------------------------------------------------

export function smartAssignmentDocPath(communityId = DEFAULT_COMMUNITY_ID, assignmentId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/smart_assignments/${assignmentId}`;
}

export function smartAssignmentsCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/smart_assignments`;
}

export function memberAvailabilityDocPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/member_availability/${memberId}`;
}

// ----------------------------------------------------------------------------
// 3. BURNOUT RISK CHECKER
// ----------------------------------------------------------------------------

/**
 * Evaluates servant workload to prevent burnout.
 * Analyzes active and recent assignments within a 30-day window against max quota.
 *
 * @param {string|Object} memberId - Member ID string or member object
 * @param {Array<Object>} recentAssignments - Historical/recent assignments
 * @param {number} [maxAllowedPerMonth=4] - Target ceiling for monthly serving
 * @returns {{
 *   memberId: string,
 *   isAtRisk: boolean,
 *   currentCount: number,
 *   maxAllowed: number,
 *   utilizationRatio: number,
 *   riskLevel: 'low'|'moderate'|'high'|'exceeded',
 *   message: string
 * }}
 */
export function checkBurnoutRisk(memberId, recentAssignments = [], maxAllowedPerMonth = 4) {
  const resolvedMemberId = typeof memberId === 'object' && memberId !== null
    ? memberId.id || memberId.uid || memberId.memberId
    : memberId;

  const resolvedMax = (typeof memberId === 'object' && memberId?.maxServingPerMonth)
    ? Number(memberId.maxServingPerMonth)
    : (Number(maxAllowedPerMonth) || 4);

  if (!resolvedMemberId) {
    return {
      memberId: 'unknown',
      isAtRisk: false,
      currentCount: 0,
      maxAllowed: resolvedMax,
      utilizationRatio: 0,
      riskLevel: 'low',
      message: 'No member specified.',
    };
  }

  // Filter to active assignments for this member within the last 30 days
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const relevantStatuses = [
    ASSIGNMENT_STATUS.CONFIRMED,
    ASSIGNMENT_STATUS.REASSIGNED,
    ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
    ASSIGNMENT_STATUS.COMPLETED,
  ];

  const memberAssignments = (recentAssignments || []).filter((assignment) => {
    if (!assignment) return false;
    const aMemberId = assignment.memberId || assignment.servantId || assignment.userId;
    if (aMemberId !== resolvedMemberId) return false;

    // Check status
    const status = assignment.status || ASSIGNMENT_STATUS.CONFIRMED;
    if (!relevantStatuses.includes(status)) return false;

    // Check date window (if assignment has a date)
    const rawDate = assignment.date || assignment.scheduledDate || assignment.createdAt;
    if (!rawDate) return true; // count if date not specified

    let assignmentTime = 0;
    if (typeof rawDate === 'number') {
      assignmentTime = rawDate;
    } else if (rawDate instanceof Date) {
      assignmentTime = rawDate.getTime();
    } else if (typeof rawDate.toDate === 'function') {
      assignmentTime = rawDate.toDate().getTime();
    } else if (typeof rawDate === 'string') {
      assignmentTime = new Date(rawDate).getTime();
    } else if (rawDate.seconds) {
      assignmentTime = rawDate.seconds * 1000;
    }

    if (isNaN(assignmentTime) || assignmentTime === 0) return true;
    return Math.abs(now - assignmentTime) <= thirtyDaysMs;
  });

  const currentCount = memberAssignments.length;
  const utilizationRatio = resolvedMax > 0 ? Number((currentCount / resolvedMax).toFixed(2)) : 1;

  let riskLevel = 'low';
  let isAtRisk = false;
  let message = `Serving ${currentCount}/${resolvedMax} slots (healthy capacity)`;

  if (currentCount > resolvedMax) {
    riskLevel = 'exceeded';
    isAtRisk = true;
    message = `Workload alert: Serving ${currentCount}/${resolvedMax} slots (exceeds recommended maximum)`;
  } else if (currentCount === resolvedMax) {
    riskLevel = 'high';
    isAtRisk = true;
    message = `At serving ceiling: ${currentCount}/${resolvedMax} slots allocated this month`;
  } else if (currentCount >= Math.ceil(resolvedMax * 0.75)) {
    riskLevel = 'moderate';
    isAtRisk = false;
    message = `Approaching limit: ${currentCount}/${resolvedMax} slots allocated this month`;
  }

  return {
    memberId: resolvedMemberId,
    isAtRisk,
    currentCount,
    maxAllowed: resolvedMax,
    utilizationRatio,
    riskLevel,
    message,
  };
}

// ----------------------------------------------------------------------------
// 4. MULTI-FACTOR SCORING ENGINE
// ----------------------------------------------------------------------------

/**
 * Calculates a comprehensive match score (0 - 100) for a candidate against an opportunity.
 * Produces explainable breakdown factors and respects internal privacy
 * (reliability is used purely internally, never exposed as a public scoreboard).
 *
 * @param {Object} candidate - Member/servant profile
 * @param {Object} opportunity - Serving opportunity details
 * @param {Array<Object>} [historicalAssignments=[]] - Previous assignments for reliability & workload
 * @returns {{
 *   totalScore: number,
 *   factors: Object,
 *   rationale: Array<string>,
 *   burnoutWarning: boolean,
 *   eligible: boolean
 * }}
 */
export function scoreCandidateForOpportunity(candidate = {}, opportunity = {}, historicalAssignments = []) {
  if (!candidate || !opportunity) {
    return {
      totalScore: 0,
      factors: {},
      rationale: ['Invalid candidate or opportunity parameters.'],
      burnoutWarning: false,
      eligible: false,
    };
  }

  const rationale = [];
  let eligible = true;

  // -------------------------------------------------
  // Factor 1: Availability Match (Weight: 25 max)
  // -------------------------------------------------
  let availabilityScore = 18; // Default baseline for flexible servant
  let availabilityDetails = 'General open availability';

  const memberAvail = candidate.availability || {};
  const oppDate = opportunity.date || opportunity.scheduledDate;
  const oppDayOfWeek = opportunity.dayOfWeek
    ? String(opportunity.dayOfWeek).toLowerCase()
    : (oppDate ? new Date(oppDate).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() : null);
  const oppShift = opportunity.shift || opportunity.timeSlot || 'morning';

  // Check explicit blackout dates
  const blockedDates = Array.isArray(memberAvail.blockedDates) ? memberAvail.blockedDates : [];
  if (oppDate && blockedDates.includes(oppDate)) {
    availabilityScore = 0;
    eligible = false;
    availabilityDetails = `Explicitly unavailable on ${oppDate}`;
    rationale.push(`Unavailable on scheduled date (${oppDate})`);
  } else if (Array.isArray(memberAvail.availableDates) && oppDate && memberAvail.availableDates.includes(oppDate)) {
    availabilityScore = 25;
    availabilityDetails = `Explicitly marked available for ${oppDate}`;
    rationale.push(`Calendar confirmed available for date (${oppDate})`);
  } else if (Array.isArray(memberAvail.availableDays) && oppDayOfWeek) {
    const normalizedDays = memberAvail.availableDays.map((d) => String(d).toLowerCase());
    if (normalizedDays.includes(oppDayOfWeek)) {
      // Check shift/slot match if provided
      const availableShifts = Array.isArray(memberAvail.shifts) ? memberAvail.shifts : [];
      if (availableShifts.length === 0 || availableShifts.includes(oppShift) || availableShifts.includes('any')) {
        availabilityScore = 25;
        availabilityDetails = `Regularly available on ${oppDayOfWeek} (${oppShift})`;
        rationale.push(`Matches typical schedule: ${oppDayOfWeek} ${oppShift}`);
      } else {
        availabilityScore = 15;
        availabilityDetails = `Available on ${oppDayOfWeek}, prefers ${availableShifts.join('/')}`;
        rationale.push(`Available on ${oppDayOfWeek} but shift mismatch (${oppShift})`);
      }
    } else {
      availabilityScore = 8;
      availabilityDetails = `Not marked available on ${oppDayOfWeek}`;
    }
  }

  // -------------------------------------------------
  // Factor 2: Skills & Completed Training (Weight: 25 max)
  // -------------------------------------------------
  let skillsScore = 25;
  let skillsDetails = 'No specialized training required';
  const missingRequirements = [];

  const requiredSkills = Array.isArray(opportunity.requiredSkills)
    ? opportunity.requiredSkills
    : (opportunity.skills ? [opportunity.skills].flat() : []);

  const requiredModules = Array.isArray(opportunity.requiredModules)
    ? opportunity.requiredModules
    : (opportunity.requiredTraining ? [opportunity.requiredTraining].flat() : []);

  const candidateSkills = Array.isArray(candidate.skills)
    ? candidate.skills.map((s) => String(s).toLowerCase())
    : [];

  const candidateModules = Array.isArray(candidate.completedModules)
    ? candidate.completedModules
    : (Array.isArray(candidate.completedTraining) ? candidate.completedTraining : []);

  // Child Safety check for opportunities involving youth
  const oppCategory = String(opportunity.category || opportunity.role || '').toLowerCase();
  const requiresChildSafety = requiredModules.includes('vbt_child_safety_101') ||
    oppCategory.includes('kids') ||
    oppCategory.includes('youth');

  const hasChildSafety = candidateModules.some((m) =>
    typeof m === 'string' && (m.includes('child_safety') || m === 'vbt_child_safety_101')
  ) || (candidate.tier && candidate.tier !== 'volunteer');

  if (requiresChildSafety) {
    if (hasChildSafety) {
      rationale.push('Completed Child Safety & Youth Protection Certification');
    } else {
      missingRequirements.push('Child Safety & Youth Protection (vbt_child_safety_101)');
      skillsScore -= 12;
    }
  }

  // Check required skills match
  if (requiredSkills.length > 0) {
    let matchedSkills = 0;
    requiredSkills.forEach((req) => {
      const normalizedReq = String(req).toLowerCase();
      if (candidateSkills.some((s) => s.includes(normalizedReq) || normalizedReq.includes(s))) {
        matchedSkills += 1;
      } else {
        missingRequirements.push(`Skill: ${req}`);
      }
    });

    const skillRatio = matchedSkills / requiredSkills.length;
    skillsScore = Math.round(15 * skillRatio) + (hasChildSafety || !requiresChildSafety ? 10 : 0);
    if (matchedSkills === requiredSkills.length) {
      rationale.push(`Has all ${requiredSkills.length} required skill(s)`);
    } else if (matchedSkills > 0) {
      rationale.push(`Matches ${matchedSkills}/${requiredSkills.length} required skills`);
    }
    skillsDetails = `Matched ${matchedSkills}/${requiredSkills.length} required skills`;
  } else if (requiredModules.length > 0) {
    let matchedMods = 0;
    requiredModules.forEach((mod) => {
      if (candidateModules.includes(mod)) {
        matchedMods += 1;
      } else if (!missingRequirements.includes(mod)) {
        missingRequirements.push(`Training: ${mod}`);
      }
    });
    const modRatio = matchedMods / requiredModules.length;
    skillsScore = Math.round(25 * modRatio);
    skillsDetails = `Completed ${matchedMods}/${requiredModules.length} required modules`;
  }

  skillsScore = Math.max(0, Math.min(25, skillsScore));

  // -------------------------------------------------
  // Factor 3: Expressed Interests & Role Preference (Weight: 20 max)
  // -------------------------------------------------
  let interestScore = 12; // Baseline interest
  let interestDetails = 'General volunteer interest';

  const candidateInterests = Array.isArray(candidate.interests)
    ? candidate.interests.map((i) => String(i).toLowerCase())
    : (Array.isArray(candidate.servingInterests) ? candidate.servingInterests.map((i) => String(i).toLowerCase()) : []);

  const preferredRoles = Array.isArray(candidate.preferredRoles)
    ? candidate.preferredRoles.map((r) => String(r).toLowerCase())
    : (candidate.preferredRole ? [String(candidate.preferredRole).toLowerCase()] : []);

  const oppRole = String(opportunity.role || opportunity.roleKey || '').toLowerCase();

  const isRolePreferred = preferredRoles.some((r) => r === oppRole || oppRole.includes(r) || r.includes(oppRole));
  const isInterestMatched = candidateInterests.some((i) => i === oppRole || oppRole.includes(i) || oppCategory.includes(i));

  if (isRolePreferred) {
    interestScore = 20;
    interestDetails = `Direct role preference for ${oppRole}`;
    rationale.push(`Expresses direct role preference for "${oppRole}"`);
  } else if (isInterestMatched) {
    interestScore = 16;
    interestDetails = `Serving interest matches ministry domain`;
    rationale.push(`Interest aligned with ${oppCategory || oppRole}`);
  } else {
    interestScore = 10;
  }

  // -------------------------------------------------
  // Factor 4: Previous Experience & Reliability History (Weight: 15 max)
  // NOTE: Strictly internal! Never turn this into a public leaderboard.
  // -------------------------------------------------
  let reliabilityScore = 10; // Default welcoming baseline for newcomers
  let reliabilityDetails = 'New servant baseline';

  const candidateId = candidate.id || candidate.uid || candidate.memberId;
  const memberPastAssignments = (historicalAssignments || []).filter((a) => {
    if (!a) return false;
    const aId = a.memberId || a.servantId;
    return aId === candidateId;
  });

  if (memberPastAssignments.length > 0) {
    const completedCount = memberPastAssignments.filter((a) => a.status === ASSIGNMENT_STATUS.COMPLETED).length;
    const cancelledCount = memberPastAssignments.filter((a) => a.status === ASSIGNMENT_STATUS.CANCELLED).length;
    const sameRoleExperience = memberPastAssignments.filter((a) => {
      const pastRole = String(a.role || a.opportunityRole || '').toLowerCase();
      return pastRole === oppRole;
    }).length;

    const totalEvaluated = completedCount + cancelledCount;
    const completionRate = totalEvaluated > 0 ? completedCount / totalEvaluated : 1;

    // Experienced servant bonus + high reliability
    reliabilityScore = Math.round(10 * completionRate) + (sameRoleExperience > 0 ? 5 : 2);
    reliabilityScore = Math.max(4, Math.min(15, reliabilityScore));

    if (sameRoleExperience > 0) {
      rationale.push(`Previously served in this role (${sameRoleExperience} time${sameRoleExperience > 1 ? 's' : ''})`);
      reliabilityDetails = `Past experience in role (${sameRoleExperience}x) with ${Math.round(completionRate * 100)}% completion`;
    } else {
      reliabilityDetails = `${completedCount} completed services (${Math.round(completionRate * 100)}% completion)`;
    }
  } else {
    rationale.push('Eager new servant (growth opportunity)');
  }

  // -------------------------------------------------
  // Factor 5: Team Balance & Serving Cadence (Weight: 15 max)
  // -------------------------------------------------
  let teamBalanceScore = 10;
  let teamBalanceDetails = 'Standard team alignment';

  const oppTeamId = opportunity.teamId || opportunity.team;
  const candTeamId = candidate.teamId || candidate.team;

  if (oppTeamId && candTeamId && oppTeamId === candTeamId) {
    teamBalanceScore += 3;
    rationale.push('Same team ministry alignment');
  }

  // Leader / Mentorship pairing balance: Lead servants give high value when mentoring
  if (candidate.tier === 'lead_servant' || candidate.tier === 'coordinator') {
    teamBalanceScore += 2;
    rationale.push('Experienced leader available for team mentorship');
  }

  teamBalanceScore = Math.min(15, teamBalanceScore);

  // -------------------------------------------------
  // Factor 6: Workload & Burnout Guard Check
  // -------------------------------------------------
  const burnoutCheck = checkBurnoutRisk(candidate, historicalAssignments, candidate.maxServingPerMonth || 4);
  let burnoutPenalty = 0;
  let burnoutWarning = false;

  if (burnoutCheck.riskLevel === 'exceeded') {
    burnoutPenalty = 35;
    burnoutWarning = true;
    rationale.push(`Burnout Warning: Exceeds monthly capacity (${burnoutCheck.currentCount}/${burnoutCheck.maxAllowed})`);
  } else if (burnoutCheck.riskLevel === 'high') {
    burnoutPenalty = 15;
    burnoutWarning = true;
    rationale.push(`Workload Notice: At monthly capacity (${burnoutCheck.currentCount}/${burnoutCheck.maxAllowed})`);
  }

  // Compute final composite score
  const rawTotal = availabilityScore + skillsScore + interestScore + reliabilityScore + teamBalanceScore - burnoutPenalty;
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  return {
    totalScore,
    factors: {
      availability: { score: availabilityScore, max: 25, details: availabilityDetails },
      skillsAndTraining: { score: skillsScore, max: 25, details: skillsDetails, missingRequirements },
      interestsAndRole: { score: interestScore, max: 20, details: interestDetails },
      reliability: { score: reliabilityScore, max: 15, details: reliabilityDetails },
      teamBalance: { score: teamBalanceScore, max: 15, details: teamBalanceDetails },
      burnout: { deduction: burnoutPenalty, riskLevel: burnoutCheck.riskLevel, details: burnoutCheck.message },
    },
    rationale,
    burnoutWarning,
    eligible,
  };
}

// ----------------------------------------------------------------------------
// 5. RECOMMENDATION ENGINES
// ----------------------------------------------------------------------------

/**
 * Returns ranked candidate recommendations for a specific opportunity.
 * Leader-only tool: Ranks candidates by score and explainable factors.
 *
 * @param {Object} opportunity
 * @param {Array<Object>} candidates
 * @param {Array<Object>} [historicalAssignments=[]]
 * @returns {Array<Object>} Ranked candidates with detailed match breakdowns
 */
export function getRecommendedCandidatesForOpportunity(
  opportunity = {},
  candidates = [],
  historicalAssignments = []
) {
  if (!opportunity || !Array.isArray(candidates)) return [];

  const scoredCandidates = candidates.map((candidate) => {
    const scoreResult = scoreCandidateForOpportunity(candidate, opportunity, historicalAssignments);
    const burnoutCheck = checkBurnoutRisk(candidate, historicalAssignments, candidate.maxServingPerMonth || 4);

    return {
      candidate,
      totalScore: scoreResult.totalScore,
      factors: scoreResult.factors,
      rationale: scoreResult.rationale,
      burnoutWarning: scoreResult.burnoutWarning,
      burnoutRisk: burnoutCheck,
      eligible: scoreResult.eligible,
    };
  });

  // Sort descending by total score, prioritizing eligible candidates
  return scoredCandidates.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.totalScore - a.totalScore;
  });
}

/**
 * Returns recommended serving opportunities for a specific member/servant.
 * Helps members discover suitable serving roles matching their schedule and gifts.
 *
 * @param {Object} member
 * @param {Array<Object>} opportunities
 * @param {Object} [memberAvailability=null]
 * @param {Array<Object>} [historicalAssignments=[]]
 * @returns {Array<Object>}
 */
export function getRecommendedOpportunitiesForMember(
  member = {},
  opportunities = [],
  memberAvailability = null,
  historicalAssignments = []
) {
  if (!member || !Array.isArray(opportunities)) return [];

  const candidateWithAvail = {
    ...member,
    availability: memberAvailability || member.availability || {},
  };

  const scoredOpps = opportunities
    .filter((opp) => opp && opp.status !== 'cancelled')
    .map((opportunity) => {
      const scoreResult = scoreCandidateForOpportunity(candidateWithAvail, opportunity, historicalAssignments);
      return {
        opportunity,
        matchScore: scoreResult.totalScore,
        factors: scoreResult.factors,
        rationale: scoreResult.rationale,
        burnoutWarning: scoreResult.burnoutWarning,
        eligible: scoreResult.eligible,
      };
    });

  return scoredOpps.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.matchScore - a.matchScore;
  });
}

/**
 * Finds urgent replacement candidates when a servant cancels an assignment.
 * Excludes the cancelling servant and prioritizes high availability, qualified replacements.
 *
 * @param {Object} opportunity
 * @param {Object} cancelledAssignment
 * @param {Array<Object>} candidates
 * @param {Array<Object>} [historicalAssignments=[]]
 * @returns {Array<Object>} Ranked replacement recommendations
 */
export function findReplacementCandidates(
  opportunity = {},
  cancelledAssignment = {},
  candidates = [],
  historicalAssignments = []
) {
  if (!opportunity || !Array.isArray(candidates)) return [];

  const cancelledMemberId = cancelledAssignment?.memberId || cancelledAssignment?.servantId;

  // Filter out the servant who cancelled
  const eligibleCandidates = candidates.filter((cand) => {
    if (!cand) return false;
    const candId = cand.id || cand.uid || cand.memberId;
    return candId !== cancelledMemberId;
  });

  const recommendations = getRecommendedCandidatesForOpportunity(
    opportunity,
    eligibleCandidates,
    historicalAssignments
  );

  // Enhance rationale for emergency replacement context
  return recommendations.map((rec) => {
    const replacementRationale = [...rec.rationale];
    if (rec.candidate.tier === 'lead_servant' || rec.candidate.tier === 'coordinator') {
      replacementRationale.unshift('Experienced servant ready to step in quickly');
    }
    if (!rec.burnoutWarning) {
      replacementRationale.unshift('Healthy capacity for short-notice assignment');
    }

    return {
      ...rec,
      isEmergencyReady: !rec.burnoutWarning && rec.eligible && rec.totalScore >= 70,
      rationale: replacementRationale,
    };
  });
}

// ----------------------------------------------------------------------------
// 6. NOTIFICATION PAYLOAD GENERATOR
// ----------------------------------------------------------------------------

/**
 * Generates an explicit notification payload when an assignment status changes.
 * Automation NEVER silently assigns; leaders explicitly confirm, which triggers
 * notifications to the servant.
 *
 * @param {Object} params
 * @param {Object} params.assignment
 * @param {Object} params.opportunity
 * @param {Object} params.candidate
 * @param {Object} params.actor
 * @param {string} params.newStatus
 * @returns {Object} Structured notification payload
 */
export function generateAssignmentNotificationPayload({
  assignment = {},
  opportunity = {},
  candidate = {},
  actor = {},
  newStatus = ASSIGNMENT_STATUS.CONFIRMED,
}) {
  const memberName = candidate.name || candidate.displayName || assignment.memberName || 'Servant';
  const roleTitle = opportunity.title || opportunity.role || 'Serving Role';
  const oppDate = opportunity.date || opportunity.scheduledDate || 'upcoming event';
  const leaderName = actor.name || actor.displayName || 'Ministry Coordinator';

  let title = `Serving Assignment Update: ${roleTitle}`;
  let body = `Your assignment status has been updated to "${newStatus}".`;

  switch (newStatus) {
    case ASSIGNMENT_STATUS.CONFIRMED:
      title = `🎉 Confirmed Serving Assignment: ${roleTitle}`;
      body = `Hi ${memberName}, ${leaderName} has confirmed your serving assignment for ${roleTitle} on ${oppDate}. Thank you for your servant heart!`;
      break;
    case ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW:
      title = `📋 Serving Assignment Under Review: ${roleTitle}`;
      body = `Hi ${memberName}, your interest in ${roleTitle} on ${oppDate} is being reviewed by camp leadership.`;
      break;
    case ASSIGNMENT_STATUS.REPLACEMENT_NEEDED:
      title = `⚠️ Urgent Replacement Needed: ${roleTitle}`;
      body = `A replacement is needed for ${roleTitle} on ${oppDate}. Please check the serving portal if you are available.`;
      break;
    case ASSIGNMENT_STATUS.REASSIGNED:
      title = `🔄 Reassigned Serving Role: ${roleTitle}`;
      body = `Hi ${memberName}, you have been selected as a replacement for ${roleTitle} on ${oppDate}. Please review and confirm your availability.`;
      break;
    case ASSIGNMENT_STATUS.DECLINED:
      title = `Serving Assignment Update: ${roleTitle}`;
      body = `The assignment for ${roleTitle} on ${oppDate} was declined. Thank you for your readiness to serve!`;
      break;
    case ASSIGNMENT_STATUS.CANCELLED:
      title = `Serving Assignment Cancelled: ${roleTitle}`;
      body = `The assignment for ${roleTitle} on ${oppDate} has been cancelled.`;
      break;
    case ASSIGNMENT_STATUS.COMPLETED:
      title = `✨ Serving Milestone Completed: ${roleTitle}`;
      body = `Thank you ${memberName} for faithfully serving as ${roleTitle} on ${oppDate}! Your service was recorded.`;
      break;
    default:
      break;
  }

  return {
    recipientId: candidate.id || candidate.uid || assignment.memberId,
    recipientName: memberName,
    type: 'SERVING_ASSIGNMENT_UPDATE',
    status: newStatus,
    title,
    body,
    opportunityId: opportunity.id || assignment.opportunityId,
    assignmentId: assignment.id,
    timestamp: new Date().toISOString(),
    channel: 'push_and_inapp',
    actionUrl: `/community/serve?opp=${opportunity.id || assignment.opportunityId}&assign=${assignment.id}`,
    actor: {
      id: actor.id || actor.uid || 'leader',
      name: leaderName,
      role: actor.role || 'leader',
    },
  };
}

// ----------------------------------------------------------------------------
// 7. AUDIT TRAIL & FIRESTORE LIFECYCLE MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * Executes a valid status transition for an assignment, updates Firestore,
 * and records an immutable audit log entry.
 *
 * @param {string} communityId
 * @param {string} assignmentId
 * @param {string} newStatus
 * @param {Object} actor - Leader or system initiating transition
 * @param {Object} [metadata={}] - Additional details/notes
 * @returns {Promise<Object>} Updated assignment and audit trail record
 */
export async function transitionAssignmentStatus(
  communityId = DEFAULT_COMMUNITY_ID,
  assignmentId,
  newStatus,
  actor = {},
  metadata = {}
) {
  if (!assignmentId) {
    throw new Error('assignmentId is required to transition assignment status.');
  }
  if (!newStatus) {
    throw new Error('newStatus is required to transition assignment status.');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, smartAssignmentDocPath(commId, assignmentId));
  const docSnap = await getDoc(docRef);

  let currentData = {};
  if (docSnap && typeof docSnap.exists === 'function' && docSnap.exists()) {
    currentData = docSnap.data() || {};
  } else if (metadata?.currentAssignment) {
    currentData = metadata.currentAssignment;
  }

  const currentStatus = currentData.status || ASSIGNMENT_STATUS.OPEN;

  // Validate state machine rule
  const validation = validateStatusTransition(currentStatus, newStatus);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const auditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    assignmentId,
    fromStatus: currentStatus,
    toStatus: newStatus,
    timestamp: new Date().toISOString(),
    actor: {
      id: actor.id || actor.uid || 'system_leader',
      name: actor.name || actor.displayName || 'Leader',
      role: actor.role || 'coordinator',
    },
    reason: metadata.reason || metadata.notes || '',
    metadata: { ...metadata },
  };

  const existingAuditTrail = Array.isArray(currentData.auditTrail) ? currentData.auditTrail : [];
  const updatedAuditTrail = [...existingAuditTrail, auditEntry];

  const updatePayload = {
    ...currentData,
    id: assignmentId,
    communityId: commId,
    status: newStatus,
    updatedAt: serverTimestamp(),
    auditTrail: updatedAuditTrail,
  };

  if (newStatus === ASSIGNMENT_STATUS.CONFIRMED) {
    updatePayload.confirmedAt = serverTimestamp();
    updatePayload.confirmedBy = auditEntry.actor;
  } else if (newStatus === ASSIGNMENT_STATUS.CANCELLED) {
    updatePayload.cancelledAt = serverTimestamp();
    updatePayload.cancellationReason = metadata.reason || 'Cancelled by leader or servant';
  } else if (newStatus === ASSIGNMENT_STATUS.REPLACEMENT_NEEDED) {
    updatePayload.replacementRequestedAt = serverTimestamp();
    updatePayload.replacementReason = metadata.reason || 'Replacement requested';
  } else if (newStatus === ASSIGNMENT_STATUS.REASSIGNED) {
    updatePayload.reassignedAt = serverTimestamp();
    updatePayload.reassignedTo = metadata.newMemberId || null;
  } else if (newStatus === ASSIGNMENT_STATUS.COMPLETED) {
    updatePayload.completedAt = serverTimestamp();
  }

  await setDoc(docRef, updatePayload, { merge: true });

  const notificationPayload = generateAssignmentNotificationPayload({
    assignment: updatePayload,
    opportunity: metadata.opportunity || { id: updatePayload.opportunityId },
    candidate: metadata.candidate || { id: updatePayload.memberId, name: updatePayload.memberName },
    actor: auditEntry.actor,
    newStatus,
  });

  return {
    success: true,
    assignment: updatePayload,
    auditEntry,
    notificationPayload,
  };
}

/**
 * Creates or initialises a new smart assignment record
 * @param {string} communityId
 * @param {Object} assignmentData
 * @returns {Promise<Object>}
 */
export async function createSmartAssignment(communityId = DEFAULT_COMMUNITY_ID, assignmentData = {}) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const assignmentId = assignmentData.id || `assign_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, smartAssignmentDocPath(commId, assignmentId));

  const initialStatus = assignmentData.status || ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW;

  const initialAudit = {
    id: `audit_init_${Date.now()}`,
    assignmentId,
    fromStatus: 'none',
    toStatus: initialStatus,
    timestamp: new Date().toISOString(),
    actor: assignmentData.createdActor || { id: 'system', name: 'Leader Initiated' },
    reason: 'Initial assignment recommendation created for leader review',
  };

  const payload = {
    id: assignmentId,
    communityId: commId,
    opportunityId: assignmentData.opportunityId,
    opportunityTitle: assignmentData.opportunityTitle || '',
    memberId: assignmentData.memberId,
    memberName: assignmentData.memberName || 'Volunteer',
    role: assignmentData.role || 'servant',
    matchScore: assignmentData.matchScore || 0,
    matchFactors: assignmentData.matchFactors || null,
    status: initialStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    auditTrail: [initialAudit],
  };

  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Retrieves a smart assignment by ID
 * @param {string} communityId
 * @param {string} assignmentId
 * @returns {Promise<Object|null>}
 */
export async function getSmartAssignmentById(communityId = DEFAULT_COMMUNITY_ID, assignmentId) {
  if (!assignmentId) return null;
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, smartAssignmentDocPath(commId, assignmentId));
  const snap = await getDoc(docRef);
  if (snap && typeof snap.exists === 'function' && snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Retrieves all smart assignments for a given opportunity
 * @param {string} communityId
 * @param {string} opportunityId
 * @returns {Promise<Array<Object>>}
 */
export async function getAssignmentsForOpportunity(communityId = DEFAULT_COMMUNITY_ID, opportunityId) {
  if (!opportunityId) return [];
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const colRef = collection(db, smartAssignmentsCollectionPath(commId));
  const q = query(colRef, where('opportunityId', '==', opportunityId));
  const snap = await getDocs(q);

  const results = [];
  if (snap && typeof snap.forEach === 'function') {
    snap.forEach((d) => {
      results.push({ id: d.id, ...d.data() });
    });
  }
  return results;
}

/**
 * Real-time listener for smart assignments of an opportunity
 * @param {string} communityId
 * @param {string} opportunityId
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToAssignmentsForOpportunity(communityId = DEFAULT_COMMUNITY_ID, opportunityId, callback) {
  if (!opportunityId || typeof callback !== 'function') return () => {};
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const colRef = collection(db, smartAssignmentsCollectionPath(commId));
  const q = query(colRef, where('opportunityId', '==', opportunityId));

  return onSnapshot(
    q,
    (snap) => {
      const results = [];
      if (snap && typeof snap.forEach === 'function') {
        snap.forEach((d) => {
          results.push({ id: d.id, ...d.data() });
        });
      }
      callback(results);
    },
    (err) => {
      console.warn('[SmartAssignmentService] Subscription error:', err);
      callback([]);
    }
  );
}

/**
 * Saves or updates a member's serving availability calendar and preferences
 * @param {string} communityId
 * @param {string} memberId
 * @param {Object} availabilityData
 * @returns {Promise<Object>}
 */
export async function saveMemberAvailability(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  availabilityData = {}
) {
  if (!memberId) throw new Error('memberId is required to save availability');
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, memberAvailabilityDocPath(commId, memberId));

  const payload = {
    memberId,
    availableDays: availabilityData.availableDays || ['saturday', 'sunday'],
    shifts: availabilityData.shifts || ['morning'],
    preferredFrequency: availabilityData.preferredFrequency || 'weekly', // 'weekly'|'biweekly'|'monthly'
    maxServingPerMonth: Number(availabilityData.maxServingPerMonth) || 4,
    availableDates: availabilityData.availableDates || [],
    blockedDates: availabilityData.blockedDates || [],
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Retrieves member's availability calendar settings
 * @param {string} communityId
 * @param {string} memberId
 * @returns {Promise<Object|null>}
 */
export async function getMemberAvailability(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  if (!memberId) return null;
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, memberAvailabilityDocPath(commId, memberId));
  const snap = await getDoc(docRef);
  if (snap && typeof snap.exists === 'function' && snap.exists()) {
    return snap.data();
  }
  return null;
}
