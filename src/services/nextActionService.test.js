import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PERSONA_STATES,
  PERSONA_LABELS,
  ACTION_PRIORITIES,
  formatPersonaLabel,
  calculateArrivalTime,
  findNearestUpcomingActivity,
  findNearestAssignment,
  getAttendanceStatusSummary,
  computeLeaderMetrics,
  determinePersonaState,
  computeNextAction,
  getPersonalizedSummary,
} from './nextActionService';
import {
  VBT_ROLES,
  SERVANT_PROGRESSION,
  ASSIGNMENT_STATUS,
} from '../contracts/communityContracts';

describe('nextActionService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Utility Functions
  // =========================================================================
  describe('formatPersonaLabel', () => {
    it('returns human-friendly label for all 8 persona states', () => {
      expect(formatPersonaLabel(PERSONA_STATES.NEW_VISITOR)).toBe('New Visitor');
      expect(formatPersonaLabel(PERSONA_STATES.NEW_MEMBER)).toBe('New Member');
      expect(formatPersonaLabel(PERSONA_STATES.RETURNING_MEMBER)).toBe('Returning Member');
      expect(formatPersonaLabel(PERSONA_STATES.FIRST_TIME_SERVANT)).toBe('First-Time Servant');
      expect(formatPersonaLabel(PERSONA_STATES.ACTIVE_SERVANT)).toBe('Active Servant');
      expect(formatPersonaLabel(PERSONA_STATES.LEADER)).toBe('Community Leader');
      expect(formatPersonaLabel(PERSONA_STATES.INACTIVE_MEMBER)).toBe('Inactive Member');
      expect(formatPersonaLabel(PERSONA_STATES.OFFLINE_USER)).toBe('Offline User');
    });

    it('returns default fallback for unknown persona state', () => {
      expect(formatPersonaLabel('unknown_state')).toBe('Community Member');
      expect(formatPersonaLabel(null)).toBe('Community Member');
      expect(formatPersonaLabel(undefined)).toBe('Community Member');
    });
  });

  describe('calculateArrivalTime', () => {
    it('calculates arrival time 30 minutes before start by default', () => {
      expect(calculateArrivalTime('17:30', 30)).toBe('17:00');
      expect(calculateArrivalTime('18:00', 30)).toBe('17:30');
      expect(calculateArrivalTime('09:15', 30)).toBe('08:45');
    });

    it('calculates arrival time with custom minutes prior', () => {
      expect(calculateArrivalTime('18:00', 45)).toBe('17:15');
      expect(calculateArrivalTime('18:00', 60)).toBe('17:00');
      expect(calculateArrivalTime('18:00', 15)).toBe('17:45');
    });

    it('handles midnight wrap-around', () => {
      expect(calculateArrivalTime('00:15', 30)).toBe('23:45');
    });

    it('handles invalid or empty inputs gracefully', () => {
      expect(calculateArrivalTime(null)).toBe('17:00');
      expect(calculateArrivalTime('')).toBe('17:00');
      expect(calculateArrivalTime('invalid')).toBe('invalid');
    });
  });

  describe('findNearestUpcomingActivity', () => {
    it('finds the nearest upcoming activity sorted by date', () => {
      const today = new Date();
      const future1 = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
      const future2 = new Date(today.getTime() + 172800000).toISOString().split('T')[0];

      const activities = [
        { id: 'act_2', title: 'Later Event', date: future2 },
        { id: 'act_1', title: 'Soonest Event', date: future1 },
      ];

      const result = findNearestUpcomingActivity(activities);
      expect(result).not.toBeNull();
      expect(result.id).toBe('act_1');
    });

    it('returns null for empty or non-array inputs', () => {
      expect(findNearestUpcomingActivity([])).toBeNull();
      expect(findNearestUpcomingActivity(null)).toBeNull();
      expect(findNearestUpcomingActivity(undefined)).toBeNull();
    });
  });

  describe('findNearestAssignment', () => {
    it('filters assignments for member and excludes cancelled/completed/declined', () => {
      const assignments = [
        { id: 'asgn_completed', memberId: 'm1', status: ASSIGNMENT_STATUS.COMPLETED, serviceDate: '2026-10-10' },
        { id: 'asgn_declined', memberId: 'm1', status: ASSIGNMENT_STATUS.DECLINED, serviceDate: '2026-10-11' },
        { id: 'asgn_other_member', memberId: 'm2', status: ASSIGNMENT_STATUS.CONFIRMED, serviceDate: '2026-10-12' },
        { id: 'asgn_valid', memberId: 'm1', status: ASSIGNMENT_STATUS.CONFIRMED, serviceDate: '2026-10-15' },
        { id: 'asgn_valid_later', memberId: 'm1', status: ASSIGNMENT_STATUS.OPEN, serviceDate: '2026-10-20' },
      ];

      const result = findNearestAssignment(assignments, { id: 'm1' });
      expect(result).not.toBeNull();
      expect(result.id).toBe('asgn_valid');
    });

    it('returns null if no assignments match', () => {
      expect(findNearestAssignment([], { id: 'm1' })).toBeNull();
      expect(findNearestAssignment(null)).toBeNull();
    });
  });

  describe('getAttendanceStatusSummary', () => {
    it('returns appropriate message based on attendance record count', () => {
      expect(getAttendanceStatusSummary([])).toBe('No sessions attended yet');
      expect(getAttendanceStatusSummary([{ id: 'att_1' }])).toBe('1 session attended');
      expect(getAttendanceStatusSummary([{ id: 'att_1' }, { id: 'att_2' }])).toBe('2 sessions attended — Active Streak');
    });

    it('falls back to member.attendanceCount if attendances is empty', () => {
      expect(getAttendanceStatusSummary([], { attendanceCount: 5 })).toBe('5 sessions attended — Active Streak');
    });
  });

  describe('computeLeaderMetrics', () => {
    it('computes unfilled spots and unconfirmed assignments accurately', () => {
      const activities = [
        { id: 'a1', spotsRemaining: 2 },
        { id: 'a2', spotsNeeded: 5, spotsFilled: 2 }, // 3 unfilled
      ];
      const assignments = [
        { id: 'as1', status: ASSIGNMENT_STATUS.INTEREST_SUBMITTED },
        { id: 'as2', status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW },
        { id: 'as3', status: ASSIGNMENT_STATUS.CONFIRMED },
      ];
      const attendances = [
        { id: 'att1', status: 'present' },
        { id: 'att2', status: 'checked_in' },
        { id: 'att3', status: 'absent' },
      ];

      const metrics = computeLeaderMetrics(assignments, attendances, activities);
      expect(metrics.unfilledRolesCount).toBe(5); // 2 + 3
      expect(metrics.unconfirmedAssignmentsCount).toBe(2);
      expect(metrics.attendanceSummary.totalCheckedIn).toBe(2);
      expect(metrics.attendanceSummary.checkInRate).toBe(67); // 2/3 = 67%
      expect(metrics.followUpTasks.length).toBeGreaterThan(0);
    });

    it('handles empty inputs gracefully', () => {
      const metrics = computeLeaderMetrics([], [], []);
      expect(metrics.unfilledRolesCount).toBe(0);
      expect(metrics.unconfirmedAssignmentsCount).toBe(0);
      expect(metrics.attendanceSummary.checkInRate).toBe(100);
      expect(metrics.followUpTasks[0]).toContain('All stations staffed');
    });
  });

  // =========================================================================
  // 2. Persona State Determination (All 8 States)
  // =========================================================================
  describe('determinePersonaState', () => {
    it('1. detects OFFLINE_USER when isOffline is true', () => {
      const state = determinePersonaState({
        member: { id: 'm1', role: VBT_ROLES.ADMIN },
        isOffline: true,
      });
      expect(state).toBe(PERSONA_STATES.OFFLINE_USER);
    });

    it('respects manual persona override in member profile', () => {
      const state = determinePersonaState({
        member: { id: 'm1', personaOverride: PERSONA_STATES.FIRST_TIME_SERVANT },
        isOffline: false,
      });
      expect(state).toBe(PERSONA_STATES.FIRST_TIME_SERVANT);
    });

    it('2. detects NEW_VISITOR when member is null, guest, or unregistered', () => {
      expect(determinePersonaState({ member: null })).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(determinePersonaState({ member: {} })).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(determinePersonaState({ member: { role: 'guest' } })).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(determinePersonaState({ member: { role: 'unregistered' } })).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(determinePersonaState({ member: { id: 'm1', isRegistered: false } })).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(determinePersonaState({ member: { id: 'm1', isVisitor: true } })).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(determinePersonaState({ member: { id: 'm1', status: 'visitor' } })).toBe(PERSONA_STATES.NEW_VISITOR);
    });

    it('3. detects INACTIVE_MEMBER when explicitly marked inactive or flagged for pastoral care', () => {
      expect(determinePersonaState({
        member: { id: 'm1', role: 'member', status: 'inactive' },
      })).toBe(PERSONA_STATES.INACTIVE_MEMBER);

      expect(determinePersonaState({
        member: { id: 'm1', role: 'member', isInactive: true },
      })).toBe(PERSONA_STATES.INACTIVE_MEMBER);

      expect(determinePersonaState({
        member: { id: 'm1', role: 'member', requiresPastoralCare: true },
      })).toBe(PERSONA_STATES.INACTIVE_MEMBER);

      expect(determinePersonaState({
        member: { id: 'm1', role: 'member', careFollowUpFlag: true },
      })).toBe(PERSONA_STATES.INACTIVE_MEMBER);
    });

    it('3b. detects INACTIVE_MEMBER when attendance history is older than 30 days without upcoming confirmed duty', () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 86400000).toISOString();
      const state = determinePersonaState({
        member: { id: 'm1', role: 'member', attendanceCount: 3 },
        attendances: [{ serviceDate: fortyDaysAgo }],
        assignments: [],
      });
      expect(state).toBe(PERSONA_STATES.INACTIVE_MEMBER);
    });

    it('4. detects LEADER when member has leadership role or progression', () => {
      expect(determinePersonaState({ member: { id: 'm1', role: VBT_ROLES.ADMIN } })).toBe(PERSONA_STATES.LEADER);
      expect(determinePersonaState({ member: { id: 'm1', role: VBT_ROLES.COORDINATOR } })).toBe(PERSONA_STATES.LEADER);
      expect(determinePersonaState({ member: { id: 'm1', role: VBT_ROLES.TEAM_LEADER } })).toBe(PERSONA_STATES.LEADER);
      expect(determinePersonaState({ member: { id: 'm1', role: VBT_ROLES.SERVICE_LEADER } })).toBe(PERSONA_STATES.LEADER);
      expect(determinePersonaState({ member: { id: 'm1', role: VBT_ROLES.PASTORAL_CARE } })).toBe(PERSONA_STATES.LEADER);
      expect(determinePersonaState({ member: { id: 'm1', role: 'leader' } })).toBe(PERSONA_STATES.LEADER);
      expect(determinePersonaState({ member: { id: 'm1', isLeader: true } })).toBe(PERSONA_STATES.LEADER);
      expect(determinePersonaState({
        member: { id: 'm1', servantProgression: SERVANT_PROGRESSION.COORDINATOR },
      })).toBe(PERSONA_STATES.LEADER);
    });

    it('5. detects FIRST_TIME_SERVANT when member has serving duty and 0 prior services', () => {
      const state1 = determinePersonaState({
        member: { id: 'm1', role: 'volunteer', timesServed: 0 },
        assignments: [{ id: 'as1', memberId: 'm1', status: 'open' }],
      });
      expect(state1).toBe(PERSONA_STATES.FIRST_TIME_SERVANT);

      const state2 = determinePersonaState({
        member: { id: 'm1', role: 'member', isFirstTimeServant: true },
        assignments: [{ id: 'as1', memberId: 'm1', status: 'confirmed' }],
      });
      expect(state2).toBe(PERSONA_STATES.FIRST_TIME_SERVANT);

      const state3 = determinePersonaState({
        member: { id: 'm1', role: 'first_time_servant' },
      });
      expect(state3).toBe(PERSONA_STATES.FIRST_TIME_SERVANT);
    });

    it('6. detects ACTIVE_SERVANT when member has serving role or prior served count > 0', () => {
      const state1 = determinePersonaState({
        member: { id: 'm1', role: VBT_ROLES.ACTIVE_SERVANT },
      });
      expect(state1).toBe(PERSONA_STATES.ACTIVE_SERVANT);

      const state2 = determinePersonaState({
        member: { id: 'm1', role: VBT_ROLES.TRAINED_SERVANT },
      });
      expect(state2).toBe(PERSONA_STATES.ACTIVE_SERVANT);

      const state3 = determinePersonaState({
        member: { id: 'm1', role: 'volunteer', timesServed: 4 },
        assignments: [{ id: 'as1', memberId: 'm1', status: 'confirmed' }],
      });
      expect(state3).toBe(PERSONA_STATES.ACTIVE_SERVANT);
    });

    it('7. detects NEW_MEMBER when registered with <= 1 attendance or incomplete onboarding', () => {
      const state1 = determinePersonaState({
        member: { id: 'm1', role: 'member', onboardingCompleted: false },
        attendances: [],
      });
      expect(state1).toBe(PERSONA_STATES.NEW_MEMBER);

      const state2 = determinePersonaState({
        member: { id: 'm1', role: 'member', status: 'new' },
        attendances: [{ id: 'att_1' }],
      });
      expect(state2).toBe(PERSONA_STATES.NEW_MEMBER);

      const state3 = determinePersonaState({
        member: { id: 'm1', role: 'member', isNewMember: true },
      });
      expect(state3).toBe(PERSONA_STATES.NEW_MEMBER);
    });

    it('8. detects RETURNING_MEMBER when member has attendance > 1 and is active', () => {
      const state = determinePersonaState({
        member: { id: 'm1', role: 'member', status: 'active', onboardingCompleted: true },
        attendances: [
          { id: 'att_1', serviceDate: new Date().toISOString() },
          { id: 'att_2', serviceDate: new Date(Date.now() - 7 * 86400000).toISOString() },
        ],
      });
      expect(state).toBe(PERSONA_STATES.RETURNING_MEMBER);
    });
  });

  // =========================================================================
  // 3. Next-Action Computation (All 8 States)
  // =========================================================================
  describe('computeNextAction', () => {
    const mockActivity = {
      id: 'act_friday',
      title: 'Youth Sports Gathering & Tournaments',
      date: '2026-10-09',
      startTime: '17:30',
      location: { name: 'Main Sports Field' },
    };

    it('1. computes next action for NEW_VISITOR', () => {
      const action = computeNextAction({
        personaState: PERSONA_STATES.NEW_VISITOR,
        activities: [mockActivity],
      });

      expect(action.personaState).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(action.type).toBe('join_community');
      expect(action.badge).toBe('New Visitor');
      expect(action.badgeVariant).toBe('info');
      expect(action.primaryCta.label).toContain('Join');
      expect(action.secondaryCta.label).toContain('Explore');
      expect(action.metadata.simpleExplanation).toBeDefined();
      expect(action.metadata.recommendedStep).toBeDefined();
      expect(action.encouragement).toContain('1 Corinthians 16:14');
    });

    it('2. computes next action for NEW_MEMBER with onboarding incomplete', () => {
      const action = computeNextAction({
        personaState: PERSONA_STATES.NEW_MEMBER,
        member: { id: 'm1', onboardingCompleted: false },
        activities: [mockActivity],
      });

      expect(action.personaState).toBe(PERSONA_STATES.NEW_MEMBER);
      expect(action.type).toBe('complete_onboarding');
      expect(action.title).toContain('Find Your Place');
      expect(action.primaryCta.action).toBe('start_onboarding');
      expect(action.metadata.onboardingCompleted).toBe(false);
      expect(action.encouragement).toContain('Romans 12:4-5');
    });

    it('2b. computes next action for NEW_MEMBER with onboarding completed', () => {
      const action = computeNextAction({
        personaState: PERSONA_STATES.NEW_MEMBER,
        member: { id: 'm1', onboardingCompleted: true },
        activities: [mockActivity],
      });

      expect(action.personaState).toBe(PERSONA_STATES.NEW_MEMBER);
      expect(action.type).toBe('attend_activity');
      expect(action.title).toContain('Next Up');
      expect(action.metadata.onboardingCompleted).toBe(true);
    });

    it('3. computes next action for RETURNING_MEMBER', () => {
      const action = computeNextAction({
        personaState: PERSONA_STATES.RETURNING_MEMBER,
        member: { id: 'm1', team: { name: 'Eagles Basketball' }, attendanceCount: 4 },
        activities: [mockActivity],
        attendances: [{ id: 'a1' }, { id: 'a2' }],
      });

      expect(action.personaState).toBe(PERSONA_STATES.RETURNING_MEMBER);
      expect(action.type).toBe('confirm_attendance');
      expect(action.title).toContain('Confirm Attendance');
      expect(action.primaryCta.action).toBe('rsvp_activity');
      expect(action.description).toContain('Eagles Basketball');
      expect(action.metadata.attendanceStatus).toBeDefined();
      expect(action.encouragement).toContain('Proverbs 27:17');
    });

    it('4. computes next action for FIRST_TIME_SERVANT with arrival time and prep', () => {
      const assignment = {
        id: 'asgn_1',
        memberId: 'm1',
        roleTitle: 'Volleyball Station Leader',
        startTime: '18:00',
        prepMaterial: 'Volleyball Safety Drills & Rotation Rules',
      };

      const action = computeNextAction({
        personaState: PERSONA_STATES.FIRST_TIME_SERVANT,
        member: { id: 'm1' },
        assignments: [assignment],
      });

      expect(action.personaState).toBe(PERSONA_STATES.FIRST_TIME_SERVANT);
      expect(action.type).toBe('servant_prep');
      expect(action.title).toContain('Volleyball Station Leader');
      expect(action.metadata.arrivalTime).toBe('17:30'); // 30 min before 18:00
      expect(action.metadata.orientationNeeded).toBe(true);
      expect(action.primaryCta.action).toBe('view_orientation');
      expect(action.secondaryCta.action).toBe('confirm_assignment');
      expect(action.encouragement).toContain('1 Timothy 4:12');
    });

    it('5. computes next action for ACTIVE_SERVANT when assignment is unconfirmed', () => {
      const assignment = {
        id: 'asgn_active_1',
        memberId: 'm1',
        roleTitle: 'Soccer Referee',
        status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
        startTime: '17:30',
        location: 'Field B',
      };

      const action = computeNextAction({
        personaState: PERSONA_STATES.ACTIVE_SERVANT,
        member: { id: 'm1' },
        assignments: [assignment],
      });

      expect(action.personaState).toBe(PERSONA_STATES.ACTIVE_SERVANT);
      expect(action.type).toBe('confirm_assignment');
      expect(action.badge).toBe('Confirmation Needed');
      expect(action.priority).toBe(ACTION_PRIORITIES.HIGH);
      expect(action.primaryCta.action).toBe('confirm_assignment');
      expect(action.metadata.arrivalTime).toBe('17:00');
    });

    it('5b. computes next action for ACTIVE_SERVANT when assignment is confirmed', () => {
      const assignment = {
        id: 'asgn_active_2',
        memberId: 'm1',
        roleTitle: 'Soccer Referee',
        status: ASSIGNMENT_STATUS.CONFIRMED,
        startTime: '17:30',
        location: 'Field B',
      };

      const action = computeNextAction({
        personaState: PERSONA_STATES.ACTIVE_SERVANT,
        member: { id: 'm1' },
        assignments: [assignment],
      });

      expect(action.personaState).toBe(PERSONA_STATES.ACTIVE_SERVANT);
      expect(action.type).toBe('review_prep');
      expect(action.badge).toBe('Confirmed Servant');
      expect(action.primaryCta.action).toBe('view_prep');
      expect(action.secondaryCta.action).toBe('request_replacement');
    });

    it('5c. computes next action for ACTIVE_SERVANT when no assignment is currently booked', () => {
      const action = computeNextAction({
        personaState: PERSONA_STATES.ACTIVE_SERVANT,
        member: { id: 'm1' },
        assignments: [],
      });

      expect(action.personaState).toBe(PERSONA_STATES.ACTIVE_SERVANT);
      expect(action.type).toBe('select_duty');
      expect(action.primaryCta.action).toBe('browse_serving');
    });

    it('6. computes next action for LEADER showing unfilled roles and unconfirmed assignments', () => {
      const activities = [{ id: 'a1', spotsRemaining: 3 }];
      const assignments = [{ id: 'as1', status: 'pending' }];

      const action = computeNextAction({
        personaState: PERSONA_STATES.LEADER,
        member: { id: 'm1', role: VBT_ROLES.COORDINATOR },
        activities,
        assignments,
      });

      expect(action.personaState).toBe(PERSONA_STATES.LEADER);
      expect(action.type).toBe('leader_management');
      expect(action.metadata.unfilledRolesCount).toBe(3);
      expect(action.metadata.unconfirmedAssignmentsCount).toBe(1);
      expect(action.title).toContain('Leadership Alert');
      expect(action.primaryCta.action).toBe('manage_roster');
      expect(action.encouragement).toContain('1 Peter 5:2');
    });

    it('7. computes next action for INACTIVE_MEMBER with reconnect step and care follow-up flag', () => {
      const action = computeNextAction({
        personaState: PERSONA_STATES.INACTIVE_MEMBER,
        member: { id: 'm1' },
        activities: [mockActivity],
      });

      expect(action.personaState).toBe(PERSONA_STATES.INACTIVE_MEMBER);
      expect(action.type).toBe('reconnect_member');
      expect(action.badge).toBe('We Miss You');
      expect(action.metadata.careFollowUpFlag).toBe(true);
      expect(action.primaryCta.action).toBe('reconnect_rsvp');
      expect(action.secondaryCta.action).toBe('request_pastoral_care');
      expect(action.encouragement).toContain('Zephaniah 3:17');
    });

    it('8. computes next action for OFFLINE_USER with QR check-in readiness and sync notice', () => {
      const action = computeNextAction({
        personaState: PERSONA_STATES.OFFLINE_USER,
        member: { id: 'm1' },
      });

      expect(action.personaState).toBe(PERSONA_STATES.OFFLINE_USER);
      expect(action.type).toBe('offline_mode');
      expect(action.badge).toBe('Offline Mode');
      expect(action.metadata.offlineQrReady).toBe(true);
      expect(action.metadata.cachedScheduleAvailable).toBe(true);
      expect(action.primaryCta.action).toBe('show_offline_qr');
      expect(action.secondaryCta.action).toBe('view_cached_schedule');
      expect(action.encouragement).toContain('Psalm 145:18');
    });
  });

  // =========================================================================
  // 4. Personalized Summary Generation
  // =========================================================================
  describe('getPersonalizedSummary', () => {
    it('creates rich personalized summary for community home dashboard', () => {
      const summary = getPersonalizedSummary({
        member: {
          id: 'mem_123',
          displayName: 'Mark Shenouda',
          role: 'member',
          status: 'active',
          onboardingCompleted: true,
          team: { name: 'Red Lions' },
        },
        attendances: [{ id: 'att1' }, { id: 'att2' }],
      });

      expect(summary.personaState).toBe(PERSONA_STATES.RETURNING_MEMBER);
      expect(summary.personaLabel).toBe('Returning Member');
      expect(summary.headline).toContain('Mark Shenouda');
      expect(summary.member.isRegistered).toBe(true);
      expect(summary.nextAction).toBeDefined();
      expect(summary.highlights.length).toBeGreaterThan(0);
      expect(summary.quickStats.attendanceCount).toBe(2);
      expect(summary.quickStats.isLeader).toBe(false);
    });

    it('handles anonymous visitor summary gracefully', () => {
      const summary = getPersonalizedSummary({ member: null });

      expect(summary.personaState).toBe(PERSONA_STATES.NEW_VISITOR);
      expect(summary.personaLabel).toBe('New Visitor');
      expect(summary.headline).toBe('Welcome, Friend!');
      expect(summary.member.isRegistered).toBe(false);
      expect(summary.highlights.length).toBe(3);
    });

    it('handles leader summary with leader quick stats', () => {
      const summary = getPersonalizedSummary({
        member: { id: 'l1', displayName: 'Father Mina', role: VBT_ROLES.ADMIN },
      });

      expect(summary.personaState).toBe(PERSONA_STATES.LEADER);
      expect(summary.quickStats.isLeader).toBe(true);
      expect(summary.headline).toContain('Father Mina');
    });

    it('handles offline state accurately', () => {
      const summary = getPersonalizedSummary({
        member: { id: 'm1', displayName: 'Peter' },
        isOffline: true,
      });

      expect(summary.personaState).toBe(PERSONA_STATES.OFFLINE_USER);
      expect(summary.isOffline).toBe(true);
      expect(summary.headline).toContain('Offline Mode');
      expect(summary.nextAction.primaryCta.action).toBe('show_offline_qr');
    });
  });
});
