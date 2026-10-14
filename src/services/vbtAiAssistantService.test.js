import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ROLE_TIERS,
  getUserRoleTier,
  getSuggestedQuestions,
  formatDataFreshness,
  getDataUncertaintyNote,
  filterContextByRole,
  stageAssistantMutation,
  executeConfirmedMutation,
  generateScheduleDraftRecommendation,
  processAssistantQuery,
  getCommunityAuditLogs,
  clearAssistantState,
  MUTATION_TYPES,
  STRICT_EXCLUDED_FIELDS,
} from './vbtAiAssistantService';
import { AUDIT_ACTIONS } from '../contracts/communityContracts';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, path) => ({ path })),
    doc: vi.fn((_db, path) => ({ path })),
    setDoc: vi.fn(),
    getDocs: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

// Mock ../firebase
vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

describe('VbtAiAssistantService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAssistantState();
  });

  // Mock fixtures
  const memberUser = {
    id: 'user_member_1',
    displayName: 'Mark Shenouda',
    role: 'member',
    sportsInterests: ['Football', 'Padel'],
  };

  const servantUser = {
    id: 'user_servant_1',
    displayName: 'David Hanna',
    role: 'servant',
    team: 'football_station',
    sportsInterests: ['Football'],
  };

  const coordinatorUser = {
    id: 'user_coord_1',
    displayName: 'Coordinator Peter',
    role: 'coordinator',
    sportsInterests: ['Basketball'],
  };

  const fullMockContext = {
    asOf: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 mins ago
    services: [
      {
        id: 'srv_friday',
        title: 'Weekly Community Service & Youth Sports',
        serviceType: 'weekly_service',
        date: '2026-10-10',
        startTime: '18:30',
        endTime: '21:30',
        location: { name: 'Main Sports Complex' },
      },
      {
        id: 'srv_tuesday',
        title: 'Servants & Leadership Planning Meeting',
        serviceType: 'servant_meeting',
        date: '2026-10-14',
        startTime: '19:00',
        endTime: '20:30',
        location: { name: 'Leadership Hub' },
      },
    ],
    opportunities: [
      {
        id: 'op_football',
        title: 'Football Station Coach',
        category: 'Football',
        serviceId: 'srv_friday',
        totalSpots: 3,
        assignedCount: 2,
        location: 'Court A',
      },
      {
        id: 'op_basketball',
        title: 'Basketball Station Assistant',
        category: 'Basketball',
        serviceId: 'srv_friday',
        totalSpots: 2,
        assignedCount: 0,
        location: 'Court B',
      },
    ],
    assignments: [
      {
        id: 'asg_1',
        memberId: 'user_servant_1',
        memberName: 'David Hanna',
        opportunityId: 'op_football',
        opportunityTitle: 'Football Station Coach',
        serviceId: 'srv_friday',
        status: 'confirmed',
        team: 'football_station',
        pastoralNotes: 'CONFIDENTIAL PASTORAL NOTE - MUST BE STRIPPED',
        emergencyContact: { phone: '0100999999' },
      },
      {
        id: 'asg_2',
        memberId: 'user_servant_2',
        memberName: 'Mina Isaac',
        opportunityId: 'op_football',
        opportunityTitle: 'Football Station Coach',
        serviceId: 'srv_friday',
        status: 'pending',
        team: 'football_station',
        childData: { parentId: 'p_99' },
      },
      {
        id: 'asg_3',
        memberId: 'user_member_2',
        memberName: 'Samir Boutros',
        opportunityId: 'op_basketball',
        opportunityTitle: 'Basketball Station Assistant',
        serviceId: 'srv_friday',
        status: 'pending',
        team: 'basketball_station',
      },
    ],
    stationPrep: [
      {
        opportunityId: 'op_football',
        title: 'Football Station Prep',
        instructions: 'Setup 4 mini goals, 12 size-4 footballs, and yellow agility cones.',
      },
      {
        opportunityId: 'op_basketball',
        title: 'Basketball Station Prep',
        instructions: 'Check hoop nets and inflate balls to 8.5 PSI.',
      },
    ],
    members: [
      {
        id: 'user_member_1',
        displayName: 'Mark Shenouda',
        role: 'member',
        sportsInterests: ['Football', 'Padel'],
        pastoralNotes: 'Secret pastoral counseling record',
        medicalNotes: 'Asthmatic',
        guardianPhone: '0122334455',
        emergencyContact: { name: 'Mother', phone: '0122334455' },
        childData: { age: 14 },
      },
      {
        id: 'user_servant_1',
        displayName: 'David Hanna',
        role: 'servant',
        team: 'football_station',
        sportsInterests: ['Football'],
        isAvailableFriday: true,
      },
      {
        id: 'user_servant_2',
        displayName: 'Mina Isaac',
        role: 'servant',
        team: 'football_station',
        sportsInterests: ['Football', 'Basketball'],
        isAvailableFriday: true,
      },
      {
        id: 'user_servant_3',
        displayName: 'John Paul',
        role: 'servant',
        team: 'basketball_station',
        sportsInterests: ['Basketball'],
        isAvailableFriday: true,
        consecutiveMissedServices: 2,
      },
    ],
    teams: [
      {
        id: 'team_football',
        name: 'Football Station Team',
        memberIds: ['user_servant_1', 'user_servant_2'],
        leaderId: 'user_servant_1',
      },
    ],
  };

  describe('Role Determination and Suggested Questions', () => {
    it('accurately identifies coordinator roles and boolean flags', () => {
      expect(getUserRoleTier({ role: 'coordinator' })).toBe(ROLE_TIERS.COORDINATOR);
      expect(getUserRoleTier({ role: 'admin' })).toBe(ROLE_TIERS.COORDINATOR);
      expect(getUserRoleTier({ role: 'pastoral_care_leader' })).toBe(ROLE_TIERS.COORDINATOR);
      expect(getUserRoleTier({ role: 'member', isAdmin: true })).toBe(ROLE_TIERS.COORDINATOR);
      expect(getUserRoleTier({ role: 'member', isCoordinator: true })).toBe(ROLE_TIERS.COORDINATOR);
    });

    it('accurately identifies servant roles', () => {
      expect(getUserRoleTier({ role: 'servant' })).toBe(ROLE_TIERS.SERVANT);
      expect(getUserRoleTier({ role: 'active_servant' })).toBe(ROLE_TIERS.SERVANT);
      expect(getUserRoleTier({ role: 'trained_servant' })).toBe(ROLE_TIERS.SERVANT);
      expect(getUserRoleTier({ role: 'volunteer' })).toBe(ROLE_TIERS.SERVANT);
      expect(getUserRoleTier({ role: 'team_leader' })).toBe(ROLE_TIERS.SERVANT);
      expect(getUserRoleTier({ role: 'service_leader' })).toBe(ROLE_TIERS.SERVANT);
    });

    it('defaults to member for guest or unassigned users', () => {
      expect(getUserRoleTier(null)).toBe(ROLE_TIERS.MEMBER);
      expect(getUserRoleTier({ role: 'member' })).toBe(ROLE_TIERS.MEMBER);
      expect(getUserRoleTier({ role: 'guest' })).toBe(ROLE_TIERS.MEMBER);
    });

    it('provides tailored suggested questions per role', () => {
      const memberQuestions = getSuggestedQuestions(memberUser);
      expect(memberQuestions).toContain('What am I serving in this week?');
      expect(memberQuestions).toContain('When is the next meeting?');
      expect(memberQuestions).toContain('Where do I check in?');

      const servantQuestions = getSuggestedQuestions(servantUser);
      expect(servantQuestions).toContain('What should I prepare for my station?');
      expect(servantQuestions).toContain('What is my arrival time?');
      expect(servantQuestions).toContain('Who is on my team?');

      const coordQuestions = getSuggestedQuestions(coordinatorUser);
      expect(coordQuestions).toContain('Who is available Friday?');
      expect(coordQuestions).toContain('Which roles are unfilled?');
      expect(coordQuestions).toContain('Who has not confirmed?');
      expect(coordQuestions).toContain('Which members may need follow-up?');
      expect(coordQuestions).toContain('Draft a serving schedule recommendation');
    });
  });

  describe('filterContextByRole (Strict Safety & Scoping)', () => {
    it('STRICTLY strips pastoral notes, child data, medical info, and emergency contacts for all roles', () => {
      const safeContext = filterContextByRole(fullMockContext, coordinatorUser);

      // Verify members stripped
      safeContext.members.forEach((m) => {
        STRICT_EXCLUDED_FIELDS.forEach((field) => {
          expect(m[field]).toBeUndefined();
        });
      });

      // Verify assignments stripped
      safeContext.assignments.forEach((a) => {
        STRICT_EXCLUDED_FIELDS.forEach((field) => {
          expect(a[field]).toBeUndefined();
        });
      });
    });

    it('scopes member context to only their own data and public services', () => {
      const safeContext = filterContextByRole(fullMockContext, memberUser);

      expect(safeContext.roleTier).toBe(ROLE_TIERS.MEMBER);
      // Member has no assignments in mock
      expect(safeContext.assignments).toHaveLength(0);
      // Station prep is hidden from member
      expect(safeContext.stationPrep).toHaveLength(0);
      // Coordinator analytics omitted
      expect(safeContext.unfilledRoles).toBeUndefined();
      expect(safeContext.unconfirmedAssignments).toBeUndefined();
      expect(safeContext.membersNeedingFollowUp).toBeUndefined();
    });

    it('scopes servant context to their assignments, teammates, and their station prep', () => {
      const safeContext = filterContextByRole(fullMockContext, servantUser);

      expect(safeContext.roleTier).toBe(ROLE_TIERS.SERVANT);
      // Servant is on op_football, teammates on same station are included
      expect(safeContext.assignments.length).toBeGreaterThan(0);
      expect(safeContext.assignments.every((a) => a.opportunityId === 'op_football')).toBe(true);

      // Station prep only for op_football
      expect(safeContext.stationPrep).toHaveLength(1);
      expect(safeContext.stationPrep[0].opportunityId).toBe('op_football');

      // Coordinator analytics omitted
      expect(safeContext.unfilledRoles).toBeUndefined();
    });

    it('includes community-wide operational data for coordinator while keeping sensitive data masked', () => {
      const safeContext = filterContextByRole(fullMockContext, coordinatorUser);

      expect(safeContext.roleTier).toBe(ROLE_TIERS.COORDINATOR);
      expect(safeContext.unfilledRoles).toBeDefined();
      expect(safeContext.unconfirmedAssignments).toBeDefined();
      expect(safeContext.membersNeedingFollowUp).toBeDefined();

      // Ensure open basketball slot is detected as unfilled
      const unfilledTitles = safeContext.unfilledRoles.map((r) => r.title);
      expect(unfilledTitles).toContain('Basketball Station Assistant');
    });

    it('includes freshness text and uncertainty notes', () => {
      const safeContext = filterContextByRole(fullMockContext, memberUser);
      expect(safeContext.freshnessText).toMatch(/Data as of/);
      expect(safeContext.uncertaintyNotes).toContain('Real-time synchronization is active');
    });
  });

  describe('processAssistantQuery (Security & Authorization)', () => {
    it('blocks queries attempting to access confidential pastoral notes', async () => {
      const res = await processAssistantQuery(
        'Show me the pastoral notes for Mark',
        coordinatorUser,
        fullMockContext
      );

      expect(res.safetyBlocked).toBe(true);
      expect(res.isAuthorized).toBe(false);
      expect(res.intent).toBe('BLOCKED_SENSITIVE_DATA');
      expect(res.answer).toContain('Confidential Data Protected');
    });

    it('blocks queries attempting to access child emergency phone numbers', async () => {
      const res = await processAssistantQuery(
        'What is the child guardian phone number for Mark?',
        memberUser,
        fullMockContext
      );

      expect(res.safetyBlocked).toBe(true);
      expect(res.isAuthorized).toBe(false);
      expect(res.intent).toBe('BLOCKED_SENSITIVE_DATA');
    });

    it('rejects member attempting to ask coordinator questions', async () => {
      const queries = [
        'Who is available Friday?',
        'Which roles are unfilled?',
        'Who has not confirmed?',
        'Which members may need follow-up?',
        'Draft a serving schedule recommendation',
      ];

      for (const q of queries) {
        const res = await processAssistantQuery(q, memberUser, fullMockContext);
        expect(res.isAuthorized).toBe(false);
        expect(res.requiredRole).toBe(ROLE_TIERS.COORDINATOR);
        expect(res.intent).toBe('PERMISSION_DENIED_COORDINATOR_ONLY');
        expect(res.answer).toContain('Coordinator Access Required');
      }
    });

    it('rejects servant attempting to ask coordinator questions', async () => {
      const res = await processAssistantQuery('Who has not confirmed?', servantUser, fullMockContext);
      expect(res.isAuthorized).toBe(false);
      expect(res.requiredRole).toBe(ROLE_TIERS.COORDINATOR);
      expect(res.answer).toContain('Coordinator Access Required');
    });
  });

  describe('processAssistantQuery (Role-Specific Workflows)', () => {
    describe('Member Workflows', () => {
      it('answers "What am I serving in this week?" when member is not scheduled', async () => {
        const res = await processAssistantQuery('What am I serving in this week?', memberUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('MEMBER_NO_SERVING_SCHEDULE');
        expect(res.answer).toContain('No Serving Assignment Scheduled');
      });

      it('answers "What am I serving in this week?" when user has a scheduled assignment', async () => {
        const res = await processAssistantQuery('What am I serving in this week?', servantUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('MEMBER_MY_SERVING_SCHEDULE');
        expect(res.answer).toContain('Football Station Coach');
        expect(res.answer).toContain('Confirmed');
      });

      it('answers "When is the next meeting?" with service dates and times', async () => {
        const res = await processAssistantQuery('When is the next meeting?', memberUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('NEXT_MEETING');
        expect(res.answer).toContain('Weekly Community Service & Youth Sports');
      });

      it('answers "Where do I check in?" with desk location and QR check-in instructions', async () => {
        const res = await processAssistantQuery('Where do I check in?', memberUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('CHECK_IN_INFO');
        expect(res.answer).toContain('Welcome Desk & QR Check-In Kiosk');
      });

      it('answers "What opportunities match my interests?" based on user preferences', async () => {
        const res = await processAssistantQuery('What opportunities match my interests?', memberUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('MATCHING_OPPORTUNITIES');
        expect(res.answer).toContain('Football Station Coach');
      });

      it('answers "What training do I need?" with progression pathway', async () => {
        const res = await processAssistantQuery('What training do I need?', memberUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('TRAINING_NEEDS');
        expect(res.answer).toContain('Foundations of VBT Service');
      });
    });

    describe('Servant Workflows', () => {
      it('answers "What should I prepare for my station?" with station checklist', async () => {
        const res = await processAssistantQuery('What should I prepare for my station?', servantUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('SERVANT_STATION_PREPARATION');
        expect(res.answer).toContain('mini goals');
      });

      it('answers "What is my arrival time?" with servant call time', async () => {
        const res = await processAssistantQuery('What is my arrival time?', servantUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('ARRIVAL_TIME');
        expect(res.answer).toContain('18:00');
        expect(res.answer).toContain('30 minutes prior');
      });

      it('answers "Who is on my team?" with station teammates', async () => {
        const res = await processAssistantQuery('Who is on my team?', servantUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('SERVANT_TEAM_MEMBERS');
        expect(res.answer).toContain('Mina Isaac');
      });
    });

    describe('Coordinator Workflows & Mutation Staging', () => {
      it('answers "Who is available Friday?" with active servant roster', async () => {
        const res = await processAssistantQuery('Who is available Friday?', coordinatorUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('COORDINATOR_FRIDAY_AVAILABILITY');
        expect(res.answer).toContain('David Hanna');
      });

      it('answers "Which roles are unfilled?" with open station spots', async () => {
        const res = await processAssistantQuery('Which roles are unfilled?', coordinatorUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('COORDINATOR_UNFILLED_ROLES');
        expect(res.answer).toContain('Basketball Station Assistant');
      });

      it('answers "Who has not confirmed?" with pending servant assignments', async () => {
        const res = await processAssistantQuery('Who has not confirmed?', coordinatorUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('COORDINATOR_UNCONFIRMED_SERVANTS');
        expect(res.answer).toContain('Mina Isaac');
      });

      it('answers "Which members may need follow-up?" with missed service flags', async () => {
        const res = await processAssistantQuery('Which members may need follow-up?', coordinatorUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('COORDINATOR_MEMBERS_NEEDING_FOLLOWUP');
        expect(res.answer).toContain('John Paul');
        expect(res.answer).toContain('Missed 2 consecutive services');
      });

      it('answers "Draft a serving schedule recommendation" and provides staged draft action', async () => {
        const res = await processAssistantQuery('Draft a serving schedule recommendation', coordinatorUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('COORDINATOR_SCHEDULE_DRAFT');
        expect(res.answer).toContain('AI Schedule Recommendation');
        expect(res.requiresConfirmation).toBe(true);
        expect(res.stagedMutation).toBeDefined();
        expect(res.stagedMutation.status).toBe('pending_confirmation');
      });

      it('stages a mutation on "Confirm this assignment" without executing immediately (Read-Only First)', async () => {
        const res = await processAssistantQuery('Confirm this assignment', coordinatorUser, fullMockContext);
        expect(res.isAuthorized).toBe(true);
        expect(res.intent).toBe('MUTATION_STAGED');
        expect(res.requiresConfirmation).toBe(true);
        expect(res.stagedMutation).toBeDefined();
        expect(res.stagedMutation.status).toBe('pending_confirmation');
        expect(res.stagedMutation.mutationType).toBe(MUTATION_TYPES.CONFIRM_ASSIGNMENT);
        expect(res.answer).toContain('Confirm & Execute');
      });
    });
  });

  describe('generateScheduleDraftRecommendation', () => {
    it('generates structured recommendations for coordinator matching available servants', () => {
      const draft = generateScheduleDraftRecommendation(fullMockContext, coordinatorUser);
      expect(draft.draftId).toBeDefined();
      expect(draft.totalRecommendations).toBeGreaterThan(0);
      expect(draft.recommendations[0]).toHaveProperty('opportunityId');
      expect(draft.recommendations[0]).toHaveProperty('memberName');
      expect(draft.recommendations[0]).toHaveProperty('confidenceScore');
      expect(draft.recommendations[0].reason).toMatch(/Match/);
    });

    it('rejects non-coordinator user with an authorization error', () => {
      expect(() => {
        generateScheduleDraftRecommendation(fullMockContext, servantUser);
      }).toThrow(/Unauthorized/);
    });
  });

  describe('stageAssistantMutation & executeConfirmedMutation (Audit Logging)', () => {
    it('creates a staged mutation with pending_confirmation status', () => {
      const staged = stageAssistantMutation(
        MUTATION_TYPES.SEND_REMINDER,
        { memberCount: 4, targetDescription: '4 unconfirmed servants' },
        coordinatorUser
      );

      expect(staged.id).toBeDefined();
      expect(staged.status).toBe('pending_confirmation');
      expect(staged.stagedBy.name).toBe('Coordinator Peter');
      expect(staged.summary).toContain('Send serving schedule reminder');
    });

    it('throws when non-coordinator attempts to stage a mutation', () => {
      expect(() => {
        stageAssistantMutation(MUTATION_TYPES.CONFIRM_ASSIGNMENT, {}, memberUser);
      }).toThrow(/Unauthorized/);
    });

    it('executes confirmed mutation, logs to community audit log with AI_ACTION_EXECUTED, and records timestamp', async () => {
      const staged = stageAssistantMutation(
        MUTATION_TYPES.CONFIRM_ASSIGNMENT,
        { assignmentId: 'asg_test', memberName: 'Mina Isaac', opportunityTitle: 'Football Coach' },
        coordinatorUser
      );

      const result = await executeConfirmedMutation(staged.id, coordinatorUser);

      expect(result.success).toBe(true);
      expect(result.executedMutation.status).toBe('executed');
      expect(result.executedMutation.executedBy).toBe(coordinatorUser.id);
      expect(result.auditRecord).toBeDefined();
      expect(result.auditRecord.action).toBe(AUDIT_ACTIONS.AI_ACTION_EXECUTED);
      expect(result.auditRecord.targetId).toBe('asg_test');

      // Verify audit logs store
      const logs = getCommunityAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe(AUDIT_ACTIONS.AI_ACTION_EXECUTED);
      expect(logs[0].details.stagedMutationId).toBe(staged.id);
    });

    it('prevents executing an already executed staged mutation', async () => {
      const staged = stageAssistantMutation(
        MUTATION_TYPES.CONFIRM_ASSIGNMENT,
        { assignmentId: 'asg_test_2' },
        coordinatorUser
      );

      await executeConfirmedMutation(staged.id, coordinatorUser);

      await expect(
        executeConfirmedMutation(staged.id, coordinatorUser)
      ).rejects.toThrow(/already been executed/);
    });

    it('rejects execution when caller is not a coordinator', async () => {
      const staged = stageAssistantMutation(
        MUTATION_TYPES.CONFIRM_ASSIGNMENT,
        { assignmentId: 'asg_test_3' },
        coordinatorUser
      );

      await expect(
        executeConfirmedMutation(staged.id, memberUser)
      ).rejects.toThrow(/Unauthorized/);
    });
  });

  describe('formatDataFreshness and getDataUncertaintyNote', () => {
    it('returns "Data as of just now" for recent or missing timestamps', () => {
      expect(formatDataFreshness(Date.now())).toBe('Data as of just now');
      expect(formatDataFreshness(null)).toBe('Data as of just now');
      expect(formatDataFreshness('invalid-date')).toBe('Data as of just now');
    });

    it('formats minutes ago correctly', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(formatDataFreshness(tenMinutesAgo)).toBe('Data as of 10 minutes ago');
    });
  });
});
