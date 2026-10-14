import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ASSIGNMENT_STATUS,
  VALID_STATUS_TRANSITIONS,
  validateStatusTransition,
  checkBurnoutRisk,
  scoreCandidateForOpportunity,
  getRecommendedCandidatesForOpportunity,
  getRecommendedOpportunitiesForMember,
  findReplacementCandidates,
  generateAssignmentNotificationPayload,
  transitionAssignmentStatus,
  createSmartAssignment,
  getSmartAssignmentById,
  getAssignmentsForOpportunity,
  subscribeToAssignmentsForOpportunity,
  saveMemberAvailability,
  getMemberAvailability,
  smartAssignmentDocPath,
  smartAssignmentsCollectionPath,
  memberAvailabilityDocPath,
} from './smartAssignmentService';

const mockFirestoreDocs = new Map();

vi.mock('../firebase', () => ({
  db: { _isMock: true },
  DEFAULT_COMMUNITY_ID: 'vbt_community_main',
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, path) => ({ type: 'collection', path })),
  doc: vi.fn((_db, path, id) => ({
    type: 'doc',
    path: id ? `${path}/${id}` : path,
  })),
  getDoc: vi.fn(async (docRef) => {
    const data = mockFirestoreDocs.get(docRef.path);
    return {
      exists: () => !!data,
      id: docRef.path.split('/').pop(),
      data: () => data,
    };
  }),
  getDocs: vi.fn(async (queryOrCol) => {
    const targetPath = queryOrCol.path || queryOrCol._path || '';
    const results = [];
    for (const [p, val] of mockFirestoreDocs.entries()) {
      if (p.startsWith(targetPath + '/')) {
        // Simple mock matching for opportunityId if where clause attached
        if (!queryOrCol._whereFilter || val.opportunityId === queryOrCol._whereFilter) {
          results.push({
            id: p.split('/').pop(),
            data: () => val,
          });
        }
      }
    }
    return {
      forEach: (fn) => results.forEach(fn),
      size: results.length,
    };
  }),
  setDoc: vi.fn(async (docRef, data, options = {}) => {
    const existing = options.merge ? mockFirestoreDocs.get(docRef.path) || {} : {};
    mockFirestoreDocs.set(docRef.path, { ...existing, ...data });
    return true;
  }),
  updateDoc: vi.fn(async (docRef, data) => {
    const existing = mockFirestoreDocs.get(docRef.path) || {};
    mockFirestoreDocs.set(docRef.path, { ...existing, ...data });
    return true;
  }),
  query: vi.fn((colRef, whereClause) => ({
    type: 'query',
    path: colRef.path,
    _path: colRef.path,
    _whereFilter: whereClause?._value,
  })),
  where: vi.fn((field, op, value) => ({ _field: field, _op: op, _value: value })),
  onSnapshot: vi.fn((queryOrRef, onNext, onError) => {
    if (queryOrRef._triggerError) {
      if (onError) onError(new Error('Simulated snapshot error'));
      return () => {};
    }
    const targetPath = queryOrRef.path || queryOrRef._path || '';
    const results = [];
    for (const [p, val] of mockFirestoreDocs.entries()) {
      if (p.startsWith(targetPath + '/')) {
        results.push({
          id: p.split('/').pop(),
          data: () => val,
        });
      }
    }
    onNext({
      forEach: (fn) => results.forEach(fn),
      size: results.length,
    });
    return () => {};
  }),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp', seconds: Date.now() / 1000 })),
}));

describe('smartAssignmentService', () => {
  beforeEach(() => {
    mockFirestoreDocs.clear();
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Path Helpers
  // --------------------------------------------------------------------------
  describe('Path helpers', () => {
    it('generates correct Firestore paths for smart assignments and availability', () => {
      expect(smartAssignmentDocPath('comm1', 'asgn123')).toBe(
        'vbt_communities/comm1/smart_assignments/asgn123'
      );
      expect(smartAssignmentsCollectionPath('comm1')).toBe(
        'vbt_communities/comm1/smart_assignments'
      );
      expect(memberAvailabilityDocPath('comm1', 'mem456')).toBe(
        'vbt_communities/comm1/member_availability/mem456'
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. State Machine & Transition Validation
  // --------------------------------------------------------------------------
  describe('Assignment State Machine', () => {
    it('validates permitted status transitions across the lifecycle', () => {
      // open -> interest_submitted
      expect(validateStatusTransition(ASSIGNMENT_STATUS.OPEN, ASSIGNMENT_STATUS.INTEREST_SUBMITTED).isValid).toBe(true);
      // open -> pending_leader_review
      expect(validateStatusTransition(ASSIGNMENT_STATUS.OPEN, ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW).isValid).toBe(true);
      // interest_submitted -> pending_leader_review
      expect(validateStatusTransition(ASSIGNMENT_STATUS.INTEREST_SUBMITTED, ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW).isValid).toBe(true);
      // pending_leader_review -> confirmed
      expect(validateStatusTransition(ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW, ASSIGNMENT_STATUS.CONFIRMED).isValid).toBe(true);
      // confirmed -> replacement_needed
      expect(validateStatusTransition(ASSIGNMENT_STATUS.CONFIRMED, ASSIGNMENT_STATUS.REPLACEMENT_NEEDED).isValid).toBe(true);
      // replacement_needed -> reassigned
      expect(validateStatusTransition(ASSIGNMENT_STATUS.REPLACEMENT_NEEDED, ASSIGNMENT_STATUS.REASSIGNED).isValid).toBe(true);
      // reassigned -> completed
      expect(validateStatusTransition(ASSIGNMENT_STATUS.REASSIGNED, ASSIGNMENT_STATUS.COMPLETED).isValid).toBe(true);
      // same status is valid (idempotent)
      expect(validateStatusTransition(ASSIGNMENT_STATUS.CONFIRMED, ASSIGNMENT_STATUS.CONFIRMED).isValid).toBe(true);
    });

    it('rejects invalid or skipped transitions', () => {
      // open directly to completed should fail
      const bad1 = validateStatusTransition(ASSIGNMENT_STATUS.OPEN, ASSIGNMENT_STATUS.COMPLETED);
      expect(bad1.isValid).toBe(false);
      expect(bad1.error).toContain('Invalid transition');

      // completed back to interest_submitted should fail
      const bad2 = validateStatusTransition(ASSIGNMENT_STATUS.COMPLETED, ASSIGNMENT_STATUS.INTEREST_SUBMITTED);
      expect(bad2.isValid).toBe(false);
    });

    it('handles missing or unknown status gracefully', () => {
      expect(validateStatusTransition(null, ASSIGNMENT_STATUS.CONFIRMED).isValid).toBe(false);
      expect(validateStatusTransition('non_existent_status', ASSIGNMENT_STATUS.CONFIRMED).isValid).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Burnout Risk Checker
  // --------------------------------------------------------------------------
  describe('checkBurnoutRisk', () => {
    it('returns low risk when candidate has no active assignments', () => {
      const risk = checkBurnoutRisk('mem_1', [], 4);
      expect(risk.isAtRisk).toBe(false);
      expect(risk.riskLevel).toBe('low');
      expect(risk.currentCount).toBe(0);
      expect(risk.maxAllowed).toBe(4);
    });

    it('returns moderate risk when approaching 75% limit', () => {
      const assignments = [
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED, scheduledDate: '2026-10-01' },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.COMPLETED, scheduledDate: '2026-10-08' },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED, scheduledDate: '2026-10-15' },
      ];
      const risk = checkBurnoutRisk('mem_1', assignments, 4);
      expect(risk.currentCount).toBe(3);
      expect(risk.riskLevel).toBe('moderate');
      expect(risk.isAtRisk).toBe(false);
    });

    it('returns high risk when reaching exact quota', () => {
      const assignments = [
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
      ];
      const risk = checkBurnoutRisk('mem_1', assignments, 4);
      expect(risk.currentCount).toBe(4);
      expect(risk.riskLevel).toBe('high');
      expect(risk.isAtRisk).toBe(true);
    });

    it('flags exceeded risk when assignments surpass monthly limit', () => {
      const assignments = [
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_1', status: ASSIGNMENT_STATUS.CONFIRMED },
      ];
      const risk = checkBurnoutRisk('mem_1', assignments, 4);
      expect(risk.currentCount).toBe(5);
      expect(risk.riskLevel).toBe('exceeded');
      expect(risk.isAtRisk).toBe(true);
      expect(risk.message).toContain('Workload alert');
    });

    it('respects member custom maxServingPerMonth preference', () => {
      const member = { id: 'mem_custom', maxServingPerMonth: 2 };
      const assignments = [
        { memberId: 'mem_custom', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'mem_custom', status: ASSIGNMENT_STATUS.CONFIRMED },
      ];
      const risk = checkBurnoutRisk(member, assignments);
      expect(risk.maxAllowed).toBe(2);
      expect(risk.isAtRisk).toBe(true);
      expect(risk.riskLevel).toBe('high');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Candidate Scoring Engine
  // --------------------------------------------------------------------------
  describe('scoreCandidateForOpportunity', () => {
    const baseOpportunity = {
      id: 'opp_ref_1',
      title: 'Head Referee - Saturday Tournament',
      role: 'referee',
      category: 'referee',
      date: '2026-10-10', // Saturday
      dayOfWeek: 'Saturday',
      shift: 'morning',
      requiredSkills: ['refereeing'],
      requiredModules: ['vbt_child_safety_101'],
      teamId: 'team_sports',
    };

    it('handles null or missing parameters gracefully', () => {
      const res = scoreCandidateForOpportunity(null, null);
      expect(res.totalScore).toBe(0);
      expect(res.eligible).toBe(false);
    });

    it('calculates high match score for fully qualified and available candidate', () => {
      const candidate = {
        id: 'servant_prime',
        name: 'David Mark',
        skills: ['refereeing', 'first_aid'],
        completedModules: ['vbt_child_safety_101', 'referee_rules'],
        preferredRoles: ['referee'],
        interests: ['sports', 'referee'],
        teamId: 'team_sports',
        tier: 'servant',
        availability: {
          availableDays: ['saturday', 'sunday'],
          shifts: ['morning'],
        },
      };

      const result = scoreCandidateForOpportunity(candidate, baseOpportunity, []);
      expect(result.totalScore).toBeGreaterThanOrEqual(85);
      expect(result.eligible).toBe(true);
      expect(result.burnoutWarning).toBe(false);
      expect(result.factors.availability.score).toBe(25);
      expect(result.factors.skillsAndTraining.score).toBe(25);
      expect(result.factors.interestsAndRole.score).toBe(20);
      expect(result.rationale).toContain('Has all 1 required skill(s)');
      expect(result.rationale).toContain('Completed Child Safety & Youth Protection Certification');
    });

    it('disqualifies or penalizes candidate with blocked date', () => {
      const candidate = {
        id: 'busy_servant',
        name: 'Sarah Paul',
        skills: ['refereeing'],
        completedModules: ['vbt_child_safety_101'],
        availability: {
          blockedDates: ['2026-10-10'],
        },
      };

      const result = scoreCandidateForOpportunity(candidate, baseOpportunity, []);
      expect(result.eligible).toBe(false);
      expect(result.factors.availability.score).toBe(0);
      expect(result.rationale).toContain('Unavailable on scheduled date (2026-10-10)');
    });

    it('deducts points when required training is missing for child/youth opportunities', () => {
      const youthOpportunity = {
        id: 'opp_kids_1',
        title: 'Junior Camp Coach',
        category: 'kids',
        role: 'coach',
        date: '2026-10-10',
        dayOfWeek: 'saturday',
      };

      const candidateWithoutChildSafety = {
        id: 'new_vol',
        name: 'John Doe',
        tier: 'volunteer',
        completedModules: [],
        availability: { availableDays: ['saturday'] },
      };

      const result = scoreCandidateForOpportunity(candidateWithoutChildSafety, youthOpportunity, []);
      expect(result.factors.skillsAndTraining.missingRequirements).toContain(
        'Child Safety & Youth Protection (vbt_child_safety_101)'
      );
      expect(result.factors.skillsAndTraining.score).toBeLessThan(25);
    });

    it('rewards historical experience without turning reliability into a public scoreboard', () => {
      const veteranCandidate = {
        id: 'vet_1',
        name: 'Peter John',
        preferredRoles: ['referee'],
        availability: { availableDays: ['saturday'] },
      };

      const history = [
        { memberId: 'vet_1', role: 'referee', status: ASSIGNMENT_STATUS.COMPLETED },
        { memberId: 'vet_1', role: 'referee', status: ASSIGNMENT_STATUS.COMPLETED },
      ];

      const result = scoreCandidateForOpportunity(veteranCandidate, baseOpportunity, history);
      expect(result.factors.reliability.score).toBeGreaterThan(10);
      expect(result.rationale.some((r) => r.includes('Previously served in this role'))).toBe(true);
    });

    it('penalizes burned out candidates with a score deduction and warning flag', () => {
      const candidate = {
        id: 'overworked_servant',
        name: 'Martha Stewart',
        maxServingPerMonth: 3,
        skills: ['refereeing'],
        completedModules: ['vbt_child_safety_101'],
        preferredRoles: ['referee'],
        availability: { availableDays: ['saturday'] },
      };

      const excessiveHistory = [
        { memberId: 'overworked_servant', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'overworked_servant', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'overworked_servant', status: ASSIGNMENT_STATUS.CONFIRMED },
        { memberId: 'overworked_servant', status: ASSIGNMENT_STATUS.CONFIRMED },
      ];

      const result = scoreCandidateForOpportunity(candidate, baseOpportunity, excessiveHistory);
      expect(result.burnoutWarning).toBe(true);
      expect(result.factors.burnout.deduction).toBeGreaterThan(0);
      expect(result.rationale.some((r) => r.includes('Burnout Warning'))).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Leader Recommendations Tool
  // --------------------------------------------------------------------------
  describe('getRecommendedCandidatesForOpportunity', () => {
    it('ranks candidates by total score descending', () => {
      const opportunity = {
        id: 'opp_worship',
        role: 'praise',
        category: 'worship',
        date: '2026-10-11',
        dayOfWeek: 'sunday',
      };

      const candidates = [
        {
          id: 'c1',
          name: 'Praise Singer',
          preferredRoles: ['praise'],
          interests: ['worship'],
          availability: { availableDays: ['sunday'] },
        },
        {
          id: 'c2',
          name: 'Logistics Servant',
          preferredRoles: ['logistics'],
          availability: { availableDays: ['sunday'] },
        },
        {
          id: 'c3_busy',
          name: 'Unavailable Servant',
          availability: { blockedDates: ['2026-10-11'] },
        },
      ];

      const ranked = getRecommendedCandidatesForOpportunity(opportunity, candidates, []);
      expect(ranked).toHaveLength(3);
      expect(ranked[0].candidate.id).toBe('c1');
      expect(ranked[0].totalScore).toBeGreaterThan(ranked[1].totalScore);
      // Ineligible candidate ranked last
      expect(ranked[2].candidate.id).toBe('c3_busy');
      expect(ranked[2].eligible).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Member Opportunity Discovery
  // --------------------------------------------------------------------------
  describe('getRecommendedOpportunitiesForMember', () => {
    it('returns ranked opportunities for a member and excludes cancelled opportunities', () => {
      const member = {
        id: 'mem_referee',
        name: 'George Referee',
        skills: ['refereeing'],
        preferredRoles: ['referee'],
        availability: { availableDays: ['saturday'] },
      };

      const opportunities = [
        { id: 'o1', role: 'referee', date: '2026-10-10', dayOfWeek: 'saturday', status: 'open' },
        { id: 'o2', role: 'media', date: '2026-10-10', dayOfWeek: 'saturday', status: 'open' },
        { id: 'o3', role: 'referee', date: '2026-10-10', dayOfWeek: 'saturday', status: 'cancelled' },
      ];

      const results = getRecommendedOpportunitiesForMember(member, opportunities);
      expect(results).toHaveLength(2); // cancelled filtered out
      expect(results[0].opportunity.id).toBe('o1'); // Referee matches role preference
      expect(results[0].matchScore).toBeGreaterThan(results[1].matchScore);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Replacement Candidate Finder
  // --------------------------------------------------------------------------
  describe('findReplacementCandidates', () => {
    it('excludes cancelling servant and surfaces emergency-ready replacements', () => {
      const opportunity = {
        id: 'opp_urgent',
        role: 'logistics',
        date: '2026-10-12',
        dayOfWeek: 'monday',
      };

      const cancelledAssignment = {
        id: 'asgn_old',
        memberId: 'servant_cancelling',
      };

      const candidates = [
        {
          id: 'servant_cancelling',
          name: 'Cancelling Servant',
          availability: { availableDays: ['monday'] },
        },
        {
          id: 'servant_backup',
          name: 'Ready Backup',
          tier: 'lead_servant',
          preferredRoles: ['logistics'],
          availability: { availableDays: ['monday'] },
        },
      ];

      const replacements = findReplacementCandidates(opportunity, cancelledAssignment, candidates, []);
      expect(replacements).toHaveLength(1);
      expect(replacements[0].candidate.id).toBe('servant_backup');
      expect(replacements[0].isEmergencyReady).toBe(true);
      expect(replacements[0].rationale).toContain('Experienced servant ready to step in quickly');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Explicit Notifications & Auditable Lifecycle Transitions
  // --------------------------------------------------------------------------
  describe('generateAssignmentNotificationPayload', () => {
    it('creates appropriate notification payload for confirmed status', () => {
      const payload = generateAssignmentNotificationPayload({
        assignment: { id: 'asgn_1', memberId: 'mem_1' },
        opportunity: { id: 'opp_1', title: 'Soccer Referee' },
        candidate: { id: 'mem_1', name: 'John Mark' },
        actor: { name: 'Coach Mina', role: 'coordinator' },
        newStatus: ASSIGNMENT_STATUS.CONFIRMED,
      });

      expect(payload.recipientId).toBe('mem_1');
      expect(payload.title).toContain('Confirmed Serving Assignment');
      expect(payload.body).toContain('Coach Mina has confirmed your serving assignment');
      expect(payload.actionUrl).toContain('/community/serve?opp=opp_1&assign=asgn_1');
    });
  });

  describe('transitionAssignmentStatus & Firestore persistence', () => {
    it('executes valid transition, saves audit trail, and generates notification', async () => {
      const commId = 'vbt_community_main';
      const assignmentId = 'asgn_test_1';

      // Pre-seed an initial assignment
      mockFirestoreDocs.set(smartAssignmentDocPath(commId, assignmentId), {
        id: assignmentId,
        opportunityId: 'opp_1',
        memberId: 'mem_1',
        memberName: 'David Volunteer',
        status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
        auditTrail: [],
      });

      const leaderActor = { id: 'leader_1', name: 'Pastor Peter', role: 'leader' };
      const result = await transitionAssignmentStatus(
        commId,
        assignmentId,
        ASSIGNMENT_STATUS.CONFIRMED,
        leaderActor,
        { reason: 'Leader approved after reviewing qualifications' }
      );

      expect(result.success).toBe(true);
      expect(result.assignment.status).toBe(ASSIGNMENT_STATUS.CONFIRMED);
      expect(result.auditEntry.fromStatus).toBe(ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW);
      expect(result.auditEntry.toStatus).toBe(ASSIGNMENT_STATUS.CONFIRMED);
      expect(result.auditEntry.actor.name).toBe('Pastor Peter');
      expect(result.notificationPayload.title).toContain('Confirmed');

      // Check stored document
      const stored = mockFirestoreDocs.get(smartAssignmentDocPath(commId, assignmentId));
      expect(stored.status).toBe(ASSIGNMENT_STATUS.CONFIRMED);
      expect(stored.auditTrail).toHaveLength(1);
    });

    it('throws error and halts when transition is invalid', async () => {
      const commId = 'vbt_community_main';
      const assignmentId = 'asgn_invalid_test';

      mockFirestoreDocs.set(smartAssignmentDocPath(commId, assignmentId), {
        id: assignmentId,
        status: ASSIGNMENT_STATUS.OPEN,
      });

      await expect(
        transitionAssignmentStatus(commId, assignmentId, ASSIGNMENT_STATUS.COMPLETED, { id: 'lead' })
      ).rejects.toThrow(/Invalid transition/);
    });
  });

  // --------------------------------------------------------------------------
  // 9. Availability Settings & Subscriptions
  // --------------------------------------------------------------------------
  describe('Member Availability & Smart Assignment Operations', () => {
    it('saves and reads member availability calendar', async () => {
      const commId = 'vbt_community_main';
      const memberId = 'mem_avail_1';

      const saved = await saveMemberAvailability(commId, memberId, {
        availableDays: ['saturday'],
        shifts: ['morning', 'afternoon'],
        maxServingPerMonth: 3,
        blockedDates: ['2026-10-25'],
      });

      expect(saved.maxServingPerMonth).toBe(3);
      expect(saved.blockedDates).toContain('2026-10-25');

      const retrieved = await getMemberAvailability(commId, memberId);
      expect(retrieved).not.toBeNull();
      expect(retrieved.shifts).toContain('morning');
    });

    it('creates smart assignment with initial audit entry', async () => {
      const commId = 'vbt_community_main';
      const assignment = await createSmartAssignment(commId, {
        opportunityId: 'opp_match_1',
        opportunityTitle: 'Scorekeeper',
        memberId: 'mem_scorer',
        memberName: 'Simon Scorer',
        matchScore: 92,
      });

      expect(assignment.status).toBe(ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW);
      expect(assignment.auditTrail).toHaveLength(1);

      const fetched = await getSmartAssignmentById(commId, assignment.id);
      expect(fetched.matchScore).toBe(92);
    });

    it('fetches assignments by opportunity', async () => {
      const commId = 'vbt_community_main';
      mockFirestoreDocs.set(smartAssignmentDocPath(commId, 'asg_1'), {
        id: 'asg_1',
        opportunityId: 'opp_shared',
        status: ASSIGNMENT_STATUS.CONFIRMED,
      });

      const list = await getAssignmentsForOpportunity(commId, 'opp_shared');
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('asg_1');
    });

    it('subscribes to assignments for opportunity', () => {
      const callback = vi.fn();
      const unsub = subscribeToAssignmentsForOpportunity('comm1', 'opp_sub', callback);
      expect(typeof unsub).toBe('function');
      expect(callback).toHaveBeenCalled();
    });
  });
});
