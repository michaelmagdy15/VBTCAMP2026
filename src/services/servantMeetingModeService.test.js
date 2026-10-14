import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MEETING_MODES,
  servantMeetingSessionDocPath,
  servantMeetingFeedbackCollectionPath,
  createDefaultMeetingSession,
  getMeetingSession,
  updateMeetingPhase,
  submitPollResponse,
  recordMeetingDecisions,
  submitMeetingFeedback,
  getLiveAttendanceStats,
  updateAgendaItemProgress,
  confirmServingRole,
  toggleActionItemStatus,
  broadcastMeetingAnnouncement,
  quickSelfCheckIn,
} from './servantMeetingModeService';
import { VBT_ROLES } from '../contracts/communityContracts';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, path) => ({ path })),
    doc: vi.fn((_db, path, id) => ({ path: id ? `${path}/${id}` : path })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn((col) => col),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
  };
});

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('./attendanceService', () => ({
  getServiceAttendance: vi.fn(),
  recordAttendance: vi.fn(),
  ATTENDANCE_STATUS: {
    PRESENT: 'present',
    LATE: 'late',
    EXCUSED: 'excused',
    ABSENT: 'absent',
  },
  CHECKIN_METHOD: {
    QR_SCAN: 'qr_scan',
    MANUAL_LEADER: 'manual_leader',
    SELF_KIOSK: 'self_kiosk',
  },
}));

import { getDoc, setDoc } from 'firebase/firestore';
import { getServiceAttendance, recordAttendance } from './attendanceService';

describe('ServantMeetingModeService', () => {
  const testCommunityId = 'vbt_main';
  const testServiceId = 'svc_servant_meeting_101';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Path helpers & Default Session', () => {
    it('generates proper document paths', () => {
      expect(servantMeetingSessionDocPath(testCommunityId, testServiceId)).toBe(
        `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}`
      );
      expect(servantMeetingFeedbackCollectionPath(testCommunityId, testServiceId)).toBe(
        `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}/feedback`
      );
    });

    it('creates rich default meeting session spanning all 3 phases', () => {
      const session = createDefaultMeetingSession(testCommunityId, testServiceId);
      expect(session.id).toBe(testServiceId);
      expect(session.serviceId).toBe(testServiceId);
      expect(session.phase).toBe(MEETING_MODES.BEFORE);

      // Phase 1 (Before) elements
      expect(session.meetingLocation.room).toBeTruthy();
      expect(session.qrCodeStatus.active).toBe(true);
      expect(session.agenda.length).toBeGreaterThanOrEqual(5);
      expect(session.preparationMaterials.length).toBeGreaterThanOrEqual(2);
      expect(session.openServingRoles.length).toBeGreaterThanOrEqual(2);
      expect(session.prayerTopics.length).toBeGreaterThanOrEqual(2);
      expect(session.urgentAnnouncements.length).toBeGreaterThanOrEqual(1);

      // Phase 2 (During) elements
      expect(session.polls.length).toBeGreaterThanOrEqual(2);
      expect(session.discussionPrompts.length).toBeGreaterThanOrEqual(2);

      // Phase 3 (After) elements
      expect(session.decisions.length).toBeGreaterThanOrEqual(2);
      expect(session.actionItems.length).toBeGreaterThanOrEqual(2);
      expect(session.nextMeeting).toBeDefined();
    });
  });

  describe('getMeetingSession', () => {
    it('throws error when serviceId is missing', async () => {
      await expect(getMeetingSession(testCommunityId, '')).rejects.toThrow('serviceId is required');
    });

    it('returns existing session when document exists in Firestore', async () => {
      const mockData = {
        title: 'Special Summer Servant Huddle',
        phase: MEETING_MODES.DURING,
        agenda: [{ id: 'a1', title: 'Prayer', completed: true }],
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => mockData,
      });

      const session = await getMeetingSession(testCommunityId, testServiceId);
      expect(session.id).toBe(testServiceId);
      expect(session.title).toBe('Special Summer Servant Huddle');
      expect(session.phase).toBe(MEETING_MODES.DURING);
    });

    it('initializes default session via setDoc when document does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const session = await getMeetingSession(testCommunityId, testServiceId);
      expect(session.id).toBe(testServiceId);
      expect(session.phase).toBe(MEETING_MODES.BEFORE);

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}`,
        }),
        expect.objectContaining({ id: testServiceId, phase: MEETING_MODES.BEFORE })
      );
    });
  });

  describe('updateMeetingPhase', () => {
    it('transitions through valid phases (BEFORE -> DURING -> AFTER)', async () => {
      const leaderActor = {
        id: 'usr_lead_1',
        displayName: 'Mina Leader',
        role: VBT_ROLES.SERVICE_LEADER,
      };

      const duringRes = await updateMeetingPhase(
        testCommunityId,
        testServiceId,
        MEETING_MODES.DURING,
        leaderActor
      );
      expect(duringRes.success).toBe(true);
      expect(duringRes.phase).toBe(MEETING_MODES.DURING);
      expect(duringRes.updatedBy).toBe('Mina Leader');

      const afterRes = await updateMeetingPhase(
        testCommunityId,
        testServiceId,
        MEETING_MODES.AFTER,
        leaderActor
      );
      expect(afterRes.success).toBe(true);
      expect(afterRes.phase).toBe(MEETING_MODES.AFTER);

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}`,
        }),
        expect.objectContaining({
          phase: MEETING_MODES.AFTER,
          phaseUpdatedAt: 'MOCK_SERVER_TIMESTAMP',
        }),
        { merge: true }
      );
    });

    it('rejects invalid phase names', async () => {
      await expect(
        updateMeetingPhase(testCommunityId, testServiceId, 'invalid_phase')
      ).rejects.toThrow(/Invalid meeting phase/);
    });

    it('blocks non-leader actor from changing phase', async () => {
      const nonLeaderActor = {
        id: 'usr_volunteer',
        displayName: 'Guest Volunteer',
        role: VBT_ROLES.VOLUNTEER,
      };

      await expect(
        updateMeetingPhase(
          testCommunityId,
          testServiceId,
          MEETING_MODES.DURING,
          nonLeaderActor
        )
      ).rejects.toThrow(/Only leaders can update the meeting phase/);
    });
  });

  describe('submitPollResponse', () => {
    it('records and tallies member poll response correctly', async () => {
      const initialPolls = [
        {
          id: 'poll_readiness',
          question: 'Are you ready?',
          options: ['Yes', 'Need help'],
          responses: {
            usr_1: { memberId: 'usr_1', answer: 'Yes' },
          },
        },
      ];

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ polls: initialPolls }),
      });

      const res = await submitPollResponse(
        testCommunityId,
        testServiceId,
        'poll_readiness',
        'usr_2',
        'Yes'
      );

      expect(res.success).toBe(true);
      expect(res.pollId).toBe('poll_readiness');
      expect(res.totalResponses).toBe(2);
      expect(res.tally['Yes']).toBe(2);
      expect(res.tally['Need help']).toBe(0);

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}`,
        }),
        expect.objectContaining({
          polls: expect.arrayContaining([
            expect.objectContaining({
              id: 'poll_readiness',
              responses: expect.objectContaining({
                usr_1: expect.objectContaining({ answer: 'Yes' }),
                usr_2: expect.objectContaining({ answer: 'Yes' }),
              }),
            }),
          ]),
        }),
        { merge: true }
      );
    });

    it('throws error if pollId does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ polls: [] }),
      });

      await expect(
        submitPollResponse(
          testCommunityId,
          testServiceId,
          'nonexistent_poll',
          'usr_1',
          'Yes'
        )
      ).rejects.toThrow(/not found/);
    });
  });

  describe('recordMeetingDecisions & Action Items Delegation', () => {
    it('records decisions and assigned action items with owners and due dates', async () => {
      const leaderActor = {
        id: 'usr_lead',
        displayName: 'Peter Coordinator',
        role: VBT_ROLES.COORDINATOR,
      };

      const decisions = [
        'Confirmed additional water station at Court 3',
        'Extended warm-up time by 10 minutes',
      ];

      const actionItems = [
        {
          title: 'Order new cones and bibs',
          ownerId: 'usr_mark',
          ownerName: 'Mark S.',
          dueDate: '2026-07-20',
          completed: false,
          notes: 'Deliver to field house',
        },
      ];

      const result = await recordMeetingDecisions(
        testCommunityId,
        testServiceId,
        decisions,
        actionItems,
        leaderActor
      );

      expect(result.success).toBe(true);
      expect(result.decisions).toEqual(decisions);
      expect(result.actionItems[0].ownerName).toBe('Mark S.');
      expect(result.actionItems[0].id).toBeTruthy();

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}`,
        }),
        expect.objectContaining({
          decisions,
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              title: 'Order new cones and bibs',
              ownerName: 'Mark S.',
            }),
          ]),
          decisionsUpdatedBy: 'Peter Coordinator',
        }),
        { merge: true }
      );
    });

    it('rejects decision recording from non-leader roles', async () => {
      const nonLeader = {
        id: 'usr_m',
        displayName: 'Member Mary',
        role: VBT_ROLES.MEMBER,
      };

      await expect(
        recordMeetingDecisions(testCommunityId, testServiceId, ['Decide something'], [], nonLeader)
      ).rejects.toThrow(/Only leaders can record meeting decisions/);
    });
  });

  describe('submitMeetingFeedback', () => {
    it('submits servant feedback and stores rating and comments', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ feedback: [] }),
      });

      const feedbackPayload = {
        rating: 5,
        positives: 'The devotional was uplifting and the role breakdown was very clear.',
        improvements: 'Start right on time next week.',
        notes: 'Ready for court setup!',
        memberName: 'Fady Servant',
      };

      const res = await submitMeetingFeedback(
        testCommunityId,
        testServiceId,
        'usr_fady',
        feedbackPayload
      );

      expect(res.success).toBe(true);
      expect(res.feedback.rating).toBe(5);
      expect(res.feedback.memberName).toBe('Fady Servant');
      expect(res.totalFeedback).toBe(1);

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}`,
        }),
        expect.objectContaining({
          feedback: expect.arrayContaining([
            expect.objectContaining({
              memberId: 'usr_fady',
              rating: 5,
              positives: expect.stringContaining('devotional was uplifting'),
            }),
          ]),
        }),
        { merge: true }
      );
    });

    it('replaces existing feedback when same servant resubmits', async () => {
      const existing = [
        {
          id: 'fb_1',
          memberId: 'usr_fady',
          rating: 4,
          positives: 'Good',
        },
      ];

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ feedback: existing }),
      });

      const res = await submitMeetingFeedback(
        testCommunityId,
        testServiceId,
        'usr_fady',
        { rating: 5, positives: 'Even better now' }
      );

      expect(res.totalFeedback).toBe(1);
      expect(res.feedback.rating).toBe(5);
    });
  });

  describe('getLiveAttendanceStats', () => {
    it('fetches and aggregates attendance numbers from attendance service', async () => {
      getServiceAttendance.mockResolvedValueOnce([
        { id: '1', displayName: 'David K.', status: 'present' },
        { id: '2', displayName: 'Sarah M.', status: 'present' },
        { id: '3', displayName: 'John D.', status: 'late' },
        { id: '4', displayName: 'Mary P.', status: 'excused' },
      ]);

      const stats = await getLiveAttendanceStats(testCommunityId, testServiceId);
      expect(stats.total).toBe(4);
      expect(stats.present).toBe(2);
      expect(stats.late).toBe(1);
      expect(stats.excused).toBe(1);
      expect(stats.attendees.length).toBe(4);
      expect(stats.qrActive).toBe(true);
    });
  });

  describe('updateAgendaItemProgress', () => {
    it('updates agenda item completed flag and timestamp', async () => {
      const initialAgenda = [
        { id: 'item_1', title: 'Opening Prayer', completed: false },
        { id: 'item_2', title: 'Court Breakdown', completed: false },
      ];

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ agenda: initialAgenda }),
      });

      const updatedAgenda = await updateAgendaItemProgress(
        testCommunityId,
        testServiceId,
        'item_1',
        true,
        { displayName: 'Leader Joe', role: VBT_ROLES.TEAM_LEADER }
      );

      expect(updatedAgenda[0].completed).toBe(true);
      expect(updatedAgenda[0].completedBy).toBe('Leader Joe');
      expect(updatedAgenda[1].completed).toBe(false);

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: `vbt_communities/${testCommunityId}/servant_meeting_sessions/${testServiceId}`,
        }),
        expect.objectContaining({
          agenda: expect.arrayContaining([
            expect.objectContaining({ id: 'item_1', completed: true }),
          ]),
        }),
        { merge: true }
      );
    });
  });

  describe('confirmServingRole', () => {
    it('confirms on-the-spot role assignment during the meeting', async () => {
      const initialRoles = [
        {
          id: 'role_court_ref',
          role: 'Basketball Referee',
          spotsNeeded: 2,
          spotsFilled: 0,
          assignedMembers: [],
        },
      ];

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ openServingRoles: initialRoles }),
      });

      const updatedRoles = await confirmServingRole(
        testCommunityId,
        testServiceId,
        'role_court_ref',
        { id: 'usr_andrew', displayName: 'Andrew Sports' },
        { displayName: 'Athletics Leader' }
      );

      expect(updatedRoles[0].spotsFilled).toBe(1);
      expect(updatedRoles[0].assignedMembers[0].id).toBe('usr_andrew');
      expect(updatedRoles[0].assignedMembers[0].name).toBe('Andrew Sports');
    });
  });

  describe('toggleActionItemStatus', () => {
    it('toggles action item completion', async () => {
      const initialActions = [
        { id: 'act_101', title: 'Bring extra whistles', completed: false },
      ];

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ actionItems: initialActions }),
      });

      const updated = await toggleActionItemStatus(
        testCommunityId,
        testServiceId,
        'act_101',
        true,
        { displayName: 'David Servant' }
      );

      expect(updated[0].completed).toBe(true);
      expect(updated[0].completedBy).toBe('David Servant');
    });
  });

  describe('broadcastMeetingAnnouncement', () => {
    it('broadcasts an urgent announcement to the session', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: testServiceId,
        data: () => ({ urgentAnnouncements: [] }),
      });

      const list = await broadcastMeetingAnnouncement(
        testCommunityId,
        testServiceId,
        { title: 'Rain Plan Triggered', message: 'Move to Gym', priority: 'high' },
        { displayName: 'Service Coordinator', role: VBT_ROLES.COORDINATOR }
      );

      expect(list.length).toBe(1);
      expect(list[0].title).toBe('Rain Plan Triggered');
      expect(list[0].priority).toBe('high');
      expect(list[0].broadcastBy).toBe('Service Coordinator');
    });
  });

  describe('quickSelfCheckIn', () => {
    it('calls attendanceService.recordAttendance with self check-in parameters', async () => {
      recordAttendance.mockResolvedValueOnce({ id: 'usr_me', status: 'present' });

      const res = await quickSelfCheckIn(testCommunityId, testServiceId, {
        id: 'usr_me',
        displayName: 'Me Servant',
        role: 'active_servant',
      });

      expect(recordAttendance).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: testCommunityId,
          serviceId: testServiceId,
          member: expect.objectContaining({ id: 'usr_me' }),
          checkInMethod: 'self_kiosk',
        })
      );
      expect(res.status).toBe('present');
    });
  });
});
