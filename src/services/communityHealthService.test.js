import { describe, it, expect, vi } from 'vitest';
import {
  NORTH_STAR_METRIC_NAME,
  NORTH_STAR_METRIC_DESCRIPTION,
  COORDINATOR_ROLES,
  CARE_SIGNAL_LABELS,
  BURNOUT_THRESHOLDS,
  INACTIVITY_THRESHOLDS,
  CARE_ACTION_CATEGORIES,
  CARE_ACTION_STATUS,
  FORBIDDEN_CARE_WORDS,
  isAuthorizedCoordinator,
  assertCoordinatorRole,
  sanitizePastoralConfidentialData,
  containsForbiddenCareWords,
  calculateWeeklyActiveMembers,
  identifyCareFollowUpSignals,
  identifyBurnoutRiskSignals,
  computeCommunityHealthMetrics,
  generateCareActionChecklist,
  exportCareChecklistToMarkdown,
  exportCareChecklistToText,
  exportCareChecklistToCsv,
  createMockCommunityHealthData,
} from './communityHealthService';
import { SERVICE_TYPES } from './serviceMeetingService';
import { APPLICATION_STATUS } from './servingAssignmentService';
import { ATTENDANCE_STATUS } from './attendanceService';

describe('CommunityHealthService', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Authorization & Role Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('Authorization & Security Checks', () => {
    it('accurately identifies authorized coordinator roles', () => {
      expect(isAuthorizedCoordinator('coordinator')).toBe(true);
      expect(isAuthorizedCoordinator('admin')).toBe(true);
      expect(isAuthorizedCoordinator('pastoral_care_leader')).toBe(true);
      expect(isAuthorizedCoordinator('pastoral_care')).toBe(true);

      // Object forms
      expect(isAuthorizedCoordinator({ role: 'coordinator' })).toBe(true);
      expect(isAuthorizedCoordinator({ role: 'admin' })).toBe(true);
      expect(isAuthorizedCoordinator({ role: 'pastoral_care_leader' })).toBe(true);
      expect(isAuthorizedCoordinator({ isAdmin: true })).toBe(true);
      expect(isAuthorizedCoordinator({ isCoordinator: true })).toBe(true);
      expect(isAuthorizedCoordinator({ isPastoralCare: true })).toBe(true);
    });

    it('rejects unauthorized roles, members, guests, and falsy inputs', () => {
      expect(isAuthorizedCoordinator('member')).toBe(false);
      expect(isAuthorizedCoordinator('volunteer')).toBe(false);
      expect(isAuthorizedCoordinator('servant')).toBe(false);
      expect(isAuthorizedCoordinator('team_leader')).toBe(false);
      expect(isAuthorizedCoordinator('game_leader')).toBe(false);
      expect(isAuthorizedCoordinator('guest')).toBe(false);
      expect(isAuthorizedCoordinator('')).toBe(false);
      expect(isAuthorizedCoordinator(null)).toBe(false);
      expect(isAuthorizedCoordinator(undefined)).toBe(false);
      expect(isAuthorizedCoordinator({})).toBe(false);
      expect(isAuthorizedCoordinator({ role: 'servant' })).toBe(false);
    });

    it('assertCoordinatorRole passes for coordinators and throws for unauthorized callers', () => {
      expect(() => assertCoordinatorRole({ role: 'coordinator' })).not.toThrow();
      expect(() => assertCoordinatorRole('admin')).not.toThrow();

      expect(() => assertCoordinatorRole({ role: 'member' })).toThrow(/Unauthorized/i);
      expect(() => assertCoordinatorRole(null)).toThrow(/Unauthorized/i);
      expect(() => assertCoordinatorRole({ role: 'servant' })).toThrow(/Unauthorized/i);
    });

    it('sanitizes pastoral confidential notes and private data from objects', () => {
      const sensitiveMember = {
        id: 'mem_99',
        displayName: 'John Sensitive',
        role: 'member',
        pastoralNotes: 'Confidential: struggling with family distress, keep private',
        privateNotes: 'Sensitive spiritual counseling history',
        confidentialNotes: 'High confidentiality',
        medicalNotes: 'Asthma inhaler in red bag',
        rawPhoneNumber: '+201009998877',
      };

      const sanitized = sanitizePastoralConfidentialData(sensitiveMember);

      expect(sanitized.id).toBe('mem_99');
      expect(sanitized.displayName).toBe('John Sensitive');
      expect(sanitized.pastoralNotes).toBeUndefined();
      expect(sanitized.privateNotes).toBeUndefined();
      expect(sanitized.confidentialNotes).toBeUndefined();
      expect(sanitized.medicalNotes).toBeUndefined();
      expect(sanitized.rawPhoneNumber).toBeUndefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. North-Star Metric Calculation
  // ───────────────────────────────────────────────────────────────────────────
  describe('calculateWeeklyActiveMembers (North-Star Metric)', () => {
    it('has the exact required North-Star metric name and definition', () => {
      expect(NORTH_STAR_METRIC_NAME).toBe('Weekly Active Community Members');
      expect(NORTH_STAR_METRIC_DESCRIPTION).toBe(
        'Weekly active community members who participate, serve, or meaningfully connect.'
      );
    });

    it('unifies attendance, serving, and connection records without double-counting', () => {
      // Member 1: Attended, Served, and Connected (Multi-category)
      // Member 2: Attended only
      // Member 3: Served only
      // Member 4: Connected only
      const attendances = [
        { memberId: 'mem_1', status: 'present' },
        { memberId: 'mem_2', status: 'present' },
      ];

      const servings = [
        { memberId: 'mem_1', status: 'confirmed' },
        { memberId: 'mem_3', status: 'approved' },
      ];

      const connections = [
        { memberId: 'mem_1', requestConnection: true },
        { memberId: 'mem_4', type: 'prayer' },
      ];

      const result = calculateWeeklyActiveMembers(attendances, servings, connections, {
        totalCommunityCount: 10,
      });

      expect(result.northStarName).toBe('Weekly Active Community Members');
      expect(result.count).toBe(4); // mem_1, mem_2, mem_3, mem_4
      expect(result.rate).toBe(40.0); // 4 out of 10 = 40%

      expect(result.breakdown.uniqueAttendees).toBe(2);
      expect(result.breakdown.uniqueServants).toBe(2);
      expect(result.breakdown.uniqueConnectors).toBe(2);

      // Mutually exclusive single categories vs multi-category
      expect(result.breakdown.multiCategory).toBe(1); // mem_1
      expect(result.breakdown.participatingOnly).toBe(1); // mem_2
      expect(result.breakdown.servingOnly).toBe(1); // mem_3
      expect(result.breakdown.connectingOnly).toBe(1); // mem_4
    });

    it('ignores absent attendance records and declined serving applications', () => {
      const attendances = [
        { memberId: 'mem_active', status: 'present' },
        { memberId: 'mem_absent', status: 'absent' },
      ];

      const servings = [
        { memberId: 'mem_declined', status: 'declined' },
        { memberId: 'mem_rejected', status: 'rejected' },
        { memberId: 'mem_cancelled', status: 'cancelled' },
      ];

      const connections = [];

      const result = calculateWeeklyActiveMembers(attendances, servings, connections);
      expect(result.count).toBe(1);
      expect(result.activeMemberIds).toEqual(['mem_active']);
    });

    it('handles empty or malformed inputs gracefully without errors', () => {
      const result = calculateWeeklyActiveMembers(null, undefined, 'bad_input');
      expect(result.count).toBe(0);
      expect(result.activeMemberIds).toEqual([]);
      expect(result.rate).toBe(0);
      expect(result.breakdown.multiCategory).toBe(0);
    });

    it('respects date window filtering when window bounds are specified', () => {
      const attendances = [
        { memberId: 'mem_in_window', date: '2026-10-05', status: 'present' },
        { memberId: 'mem_outside_window', date: '2026-09-01', status: 'present' },
      ];

      const result = calculateWeeklyActiveMembers(attendances, [], [], {
        windowStart: '2026-10-01',
        windowEnd: '2026-10-07',
      });

      expect(result.count).toBe(1);
      expect(result.activeMemberIds).toEqual(['mem_in_window']);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Inactivity Identification & Compassionate Follow-Up
  // ───────────────────────────────────────────────────────────────────────────
  describe('identifyCareFollowUpSignals (Inactivity & Connection)', () => {
    it('identifies members absent for 3+ consecutive sessions and flags them neutrally', () => {
      const members = [
        { id: 'mem_absentee', displayName: 'Peter Absentee', role: 'member' },
        { id: 'mem_consistent', displayName: 'Mark Faithful', role: 'servant' },
      ];

      const attendances = [
        // mem_absentee: 3 consecutive absences
        { memberId: 'mem_absentee', date: '2026-10-09', status: 'absent' },
        { memberId: 'mem_absentee', date: '2026-10-06', status: 'absent' },
        { memberId: 'mem_absentee', date: '2026-10-02', status: 'absent' },
        { memberId: 'mem_absentee', date: '2026-09-25', status: 'present' },

        // mem_consistent: present recently
        { memberId: 'mem_consistent', date: '2026-10-09', status: 'present' },
        { memberId: 'mem_consistent', date: '2026-10-06', status: 'present' },
        { memberId: 'mem_consistent', date: '2026-10-02', status: 'present' },
      ];

      const signals = identifyCareFollowUpSignals(members, attendances);

      expect(signals.length).toBe(1);
      const flag = signals[0];
      expect(flag.memberId).toBe('mem_absentee');
      expect(flag.careStatus).toBe('May need follow-up');
      expect(flag.consecutiveAbsences).toBe(3);
      expect(flag.tone).toBe('compassionate');
      expect(flag.suggestedAction).toMatch(/pastoral check-in|friendly text/i);
    });

    it('does NOT flag members who only missed 1 or 2 sessions', () => {
      const members = [{ id: 'mem_short_absence', displayName: 'Mary' }];
      const attendances = [
        { memberId: 'mem_short_absence', date: '2026-10-09', status: 'absent' },
        { memberId: 'mem_short_absence', date: '2026-10-06', status: 'absent' },
        { memberId: 'mem_short_absence', date: '2026-10-02', status: 'present' }, // streak broken!
      ];

      const signals = identifyCareFollowUpSignals(members, attendances, [], {
        thresholdSessions: 3,
      });

      expect(signals.length).toBe(0);
    });

    it('identifies members who requested connection or pastoral prayer', () => {
      const members = [{ id: 'mem_prayer_req', displayName: 'Thomas' }];
      const prayerRequests = [
        {
          id: 'req_1',
          memberId: 'mem_prayer_req',
          requestConnection: true,
          category: 'Family support',
          // Notice: confidential pastoral notes are NOT passed to care follow-up
        },
      ];

      const signals = identifyCareFollowUpSignals(members, [], [], { prayerRequests });
      const prayerSignal = signals.find((s) => s.memberId === 'mem_prayer_req');

      expect(prayerSignal).toBeDefined();
      expect(prayerSignal.careStatus).toBe('Requested connection or prayer');
      expect(prayerSignal.signalType).toBe('connection_request');
      expect(prayerSignal.tone).toBe('compassionate');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Burnout Risk Signals & Servant Well-Being
  // ───────────────────────────────────────────────────────────────────────────
  describe('identifyBurnoutRiskSignals', () => {
    it('detects servants scheduled > 3 times in 2 weeks', () => {
      const members = [
        { id: 'srv_overloaded', displayName: 'Martha Busy', role: 'servant' },
        { id: 'srv_balanced', displayName: 'Lydia Balanced', role: 'servant' },
      ];

      const refDate = '2026-10-10';
      const assignments = [
        // srv_overloaded: 4 assignments within 14 days
        { memberId: 'srv_overloaded', date: '2026-10-02', role: 'Referee', status: 'confirmed' },
        { memberId: 'srv_overloaded', date: '2026-10-05', role: 'Coach', status: 'confirmed' },
        { memberId: 'srv_overloaded', date: '2026-10-08', role: 'Hydration', status: 'confirmed' },
        { memberId: 'srv_overloaded', date: '2026-10-10', role: 'Media', status: 'confirmed' },

        // srv_balanced: 2 assignments
        { memberId: 'srv_balanced', date: '2026-10-02', role: 'Praise', status: 'confirmed' },
        { memberId: 'srv_balanced', date: '2026-10-09', role: 'Praise', status: 'confirmed' },
      ];

      const signals = identifyBurnoutRiskSignals(members, assignments, {
        referenceDate: refDate,
      });

      expect(signals.length).toBe(1);
      const signal = signals[0];
      expect(signal.memberId).toBe('srv_overloaded');
      expect(signal.assignmentCount).toBe(4);
      expect(signal.riskFactor).toBe('high_frequency');
      expect(signal.careStatus).toBe('Rest and replenishment suggested');
      expect(signal.tone).toBe('compassionate');
      expect(signal.suggestedAction).toMatch(/serving break|pair with an apprentice/i);
    });

    it('detects servants scheduled in multiple consecutive roles on the same day', () => {
      const members = [{ id: 'srv_double_booked', displayName: 'David Double', role: 'servant' }];
      const assignments = [
        {
          memberId: 'srv_double_booked',
          date: '2026-10-09',
          role: 'Referee',
          status: 'confirmed',
        },
        {
          memberId: 'srv_double_booked',
          date: '2026-10-09',
          role: 'Snack Coordinator',
          status: 'confirmed',
        },
      ];

      const signals = identifyBurnoutRiskSignals(members, assignments, {
        referenceDate: '2026-10-09',
      });

      expect(signals.length).toBe(1);
      const signal = signals[0];
      expect(signal.memberId).toBe('srv_double_booked');
      expect(signal.hasMultipleConsecutiveRolesOnSameDay).toBe(true);
      expect(signal.consecutiveRolesCount).toBe(2);
      expect(signal.careStatus).toBe('Rest and replenishment suggested');
    });

    it('marks riskFactor as "both" when a servant is both high frequency and has multiple roles on same date', () => {
      const members = [{ id: 'srv_critical', displayName: 'Chloe Champion', role: 'servant' }];
      const assignments = [
        { memberId: 'srv_critical', date: '2026-10-01', role: 'Role A', status: 'confirmed' },
        { memberId: 'srv_critical', date: '2026-10-05', role: 'Role B', status: 'confirmed' },
        { memberId: 'srv_critical', date: '2026-10-10', role: 'Role C1', status: 'confirmed' },
        { memberId: 'srv_critical', date: '2026-10-10', role: 'Role C2', status: 'confirmed' }, // 4 assignments + 2 on same day
      ];

      const signals = identifyBurnoutRiskSignals(members, assignments, {
        referenceDate: '2026-10-10',
      });

      expect(signals.length).toBe(1);
      expect(signals[0].riskFactor).toBe('both');
      expect(signals[0].isBurnoutRisk).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. CRITICAL CARE RULES: Neutral Phrasing & Non-Punitive Philosophy
  // ───────────────────────────────────────────────────────────────────────────
  describe('Care Philosophy & Non-Punitive Phrasing', () => {
    it('verifies that no forbidden punitive or gamified words exist in labels', () => {
      Object.values(CARE_SIGNAL_LABELS).forEach((label) => {
        expect(containsForbiddenCareWords(label)).toBe(false);
      });
    });

    it('prohibits gamified or competitive terms like score, rank, leaderboard, or dropout', () => {
      expect(containsForbiddenCareWords('Current member leaderboard')).toBe(true);
      expect(containsForbiddenCareWords('High score volunteer')).toBe(true);
      expect(containsForbiddenCareWords('Dropout risk high')).toBe(true);
      expect(containsForbiddenCareWords('Member rank: 5')).toBe(true);
      expect(containsForbiddenCareWords('Bad servant')).toBe(true);

      // Compassionate phrasing should be clean
      expect(containsForbiddenCareWords('May need follow-up')).toBe(false);
      expect(containsForbiddenCareWords('Rest and replenishment suggested')).toBe(false);
      expect(containsForbiddenCareWords('Available for encouragement')).toBe(false);
    });

    it('ensures output of computeCommunityHealthMetrics does not contain forbidden words', () => {
      const mockData = createMockCommunityHealthData();
      const metrics = computeCommunityHealthMetrics('vbt_main', mockData, { role: 'coordinator' });

      // Check overall metrics JSON for forbidden words
      expect(containsForbiddenCareWords(metrics.signals.inactivityFlags)).toBe(false);
      expect(containsForbiddenCareWords(metrics.signals.burnoutRiskSignals)).toBe(false);
      expect(containsForbiddenCareWords(metrics.careSummary)).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. All 12 Health & Care Signals Computation
  // ───────────────────────────────────────────────────────────────────────────
  describe('computeCommunityHealthMetrics (12 Signals)', () => {
    it('throws when called by an unauthorized user', () => {
      const mockData = createMockCommunityHealthData();
      expect(() => {
        computeCommunityHealthMetrics('vbt_main', mockData, { role: 'member' });
      }).toThrow(/Unauthorized/i);
    });

    it('accurately computes all 12 signals for an authorized coordinator', () => {
      const mockData = createMockCommunityHealthData();
      const metrics = computeCommunityHealthMetrics('vbt_main', mockData, { role: 'coordinator' });

      expect(metrics.communityId).toBe('vbt_main');
      expect(metrics.northStar).toBeDefined();
      expect(metrics.northStar.count).toBeGreaterThan(0);

      const { signals } = metrics;

      // 1. New members joining
      expect(signals.newMembersJoining).toBeDefined();
      expect(signals.newMembersJoining.count).toBeGreaterThanOrEqual(1);

      // 2. Returning members consistency
      expect(signals.returningMembersConsistency).toBeDefined();
      expect(signals.returningMembersConsistency.count).toBeGreaterThanOrEqual(1);

      // 3. First-time servants
      expect(signals.firstTimeServants).toBeDefined();
      expect(signals.firstTimeServants.count).toBeGreaterThanOrEqual(1);
      expect(signals.firstTimeServants.servants[0].memberName).toBe('Kirollos Girgis');

      // 4. Active regular servants
      expect(signals.activeRegularServants).toBeDefined();
      expect(signals.activeRegularServants.count).toBeGreaterThanOrEqual(1);

      // 5. Weekly service attendance rate
      expect(signals.weeklyServiceAttendanceRate).toBeDefined();
      expect(signals.weeklyServiceAttendanceRate.rate).toBeGreaterThan(0);

      // 6. Servant meeting attendance rate
      expect(signals.servantMeetingAttendanceRate).toBeDefined();
      expect(signals.servantMeetingAttendanceRate.rate).toBeGreaterThan(0);

      // 7. Open roles vs filled ratio
      expect(signals.openRolesVsFilledRatio).toBeDefined();
      expect(signals.openRolesVsFilledRatio.openSpots).toBeGreaterThanOrEqual(0);
      expect(signals.openRolesVsFilledRatio.ratioFormatted).toMatch(/\d+\/\d+/);

      // 8. Unconfirmed assignments
      expect(signals.unconfirmedAssignments).toBeDefined();
      expect(signals.unconfirmedAssignments.count).toBeGreaterThanOrEqual(1);

      // 9. Training completion rate
      expect(signals.trainingCompletionRate).toBeDefined();
      expect(signals.trainingCompletionRate.completedCount).toBeGreaterThanOrEqual(1);

      // 10. Inactivity flags
      expect(signals.inactivityFlags).toBeDefined();
      expect(signals.inactivityFlags.count).toBeGreaterThanOrEqual(1);
      expect(signals.inactivityFlags.label).toBe('May need follow-up');

      // 11. Burnout risk signals
      expect(signals.burnoutRiskSignals).toBeDefined();
      expect(signals.burnoutRiskSignals.count).toBeGreaterThanOrEqual(1);
      expect(signals.burnoutRiskSignals.label).toBe('Rest and replenishment suggested');

      // 12. Members requesting connection or prayer
      expect(signals.connectionAndPrayerRequests).toBeDefined();
      expect(signals.connectionAndPrayerRequests.count).toBeGreaterThanOrEqual(1);
      expect(signals.connectionAndPrayerRequests.label).toBe('Requested connection or prayer');

      // Overall health summary
      expect(metrics.careSummary).toBeDefined();
      expect(['Thriving', 'Healthy', 'Attention Needed']).toContain(
        metrics.careSummary.overallHealthStatus
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Care Action Checklist & Export Formats
  // ───────────────────────────────────────────────────────────────────────────
  describe('generateCareActionChecklist', () => {
    it('throws if caller is not an authorized coordinator', () => {
      const mockData = createMockCommunityHealthData();
      const metrics = computeCommunityHealthMetrics('vbt_main', mockData, { role: 'admin' });

      expect(() => {
        generateCareActionChecklist(metrics, { role: 'volunteer' });
      }).toThrow(/Unauthorized/i);
    });

    it('generates prioritized, actionable care items for coordinators', () => {
      const mockData = createMockCommunityHealthData();
      const metrics = computeCommunityHealthMetrics('vbt_main', mockData, { role: 'coordinator' });
      const checklist = generateCareActionChecklist(metrics, { role: 'coordinator' });

      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist.length).toBeGreaterThan(0);

      // Should have care items for follow-up and burnout
      const followUpAction = checklist.find((item) => item.category === CARE_ACTION_CATEGORIES.PASTORAL_CARE);
      const restAction = checklist.find((item) => item.category === CARE_ACTION_CATEGORIES.SERVANT_CARE);
      const prayerAction = checklist.find((item) => item.category === CARE_ACTION_CATEGORIES.PRAYER_CONNECTION);

      expect(followUpAction).toBeDefined();
      expect(followUpAction.neutralTag).toBe('May need follow-up');
      expect(followUpAction.status).toBe(CARE_ACTION_STATUS.PENDING);

      expect(restAction).toBeDefined();
      expect(restAction.neutralTag).toBe('Rest and replenishment suggested');

      expect(prayerAction).toBeDefined();
      expect(prayerAction.neutralTag).toBe('Requested connection or prayer');
    });

    it('exports care action checklist to markdown, text, and csv with zero forbidden words', () => {
      const mockData = createMockCommunityHealthData();
      const metrics = computeCommunityHealthMetrics('vbt_main', mockData, { role: 'coordinator' });
      const checklist = generateCareActionChecklist(metrics, { role: 'coordinator' });

      // Markdown export
      const md = exportCareChecklistToMarkdown(checklist);
      expect(md).toContain('# VBT Community Care & Volunteer Well-Being Action Plan');
      expect(md).toContain('[ ]');
      expect(containsForbiddenCareWords(md)).toBe(false);

      // Plain text export
      const txt = exportCareChecklistToText(checklist);
      expect(txt).toContain('[TODO]');
      expect(containsForbiddenCareWords(txt)).toBe(false);

      // CSV export
      const csv = exportCareChecklistToCsv(checklist);
      expect(csv).toContain('ID,Category,Title,Description,Priority,Status,Tag');
      expect(containsForbiddenCareWords(csv)).toBe(false);
    });
  });
});
