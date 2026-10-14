import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import ServantMeetingMode, {
  formatMinutes,
  getCountdownToDate,
} from './ServantMeetingMode';
import { MEETING_MODES, VBT_ROLES } from '../../contracts/communityContracts';

// Mock dependencies
vi.mock('../../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('../../services/servantMeetingModeService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getMeetingSession: vi.fn(),
    updateMeetingPhase: vi.fn(),
    submitPollResponse: vi.fn(),
    recordMeetingDecisions: vi.fn(),
    submitMeetingFeedback: vi.fn(),
    getLiveAttendanceStats: vi.fn().mockResolvedValue({
      total: 3,
      present: 2,
      late: 1,
      excused: 0,
      attendees: [
        { id: 'usr_1', displayName: 'David Servant', memberRole: 'active_servant' },
        { id: 'usr_2', displayName: 'Sarah Media', memberRole: 'servant' },
      ],
      qrActive: true,
    }),
    subscribeToMeetingSession: vi.fn((cid, sid, cb) => {
      const defaultSession = actual.createDefaultMeetingSession(cid, sid);
      cb(defaultSession);
      return vi.fn();
    }),
  };
});

vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => React.createElement('div', { 'data-testid': 'mock-qr' }, 'Mock QR'),
}));

describe('ServantMeetingMode Component & Helpers', () => {
  describe('Helper: formatMinutes', () => {
    it('formats minutes into human readable duration strings', () => {
      expect(formatMinutes(45)).toBe('45 mins');
      expect(formatMinutes(60)).toBe('1h');
      expect(formatMinutes(75)).toBe('1h 15m');
      expect(formatMinutes(120)).toBe('2h');
      expect(formatMinutes(0)).toBe('0 mins');
      expect(formatMinutes(null)).toBe('0 mins');
    });
  });

  describe('Helper: getCountdownToDate', () => {
    it('returns countdown or status string', () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
      const res = getCountdownToDate(futureDate, '18:00');
      expect(res).toContain('remaining');

      const pastDate = '2020-01-01';
      expect(getCountdownToDate(pastDate, '18:00')).toBe('Happening today / in session');

      expect(getCountdownToDate(null)).toBe('Scheduled soon');
    });
  });

  describe('Component Rendering across 3 Phases', () => {
    const leaderUser = {
      id: 'usr_leader_1',
      displayName: 'Peter Coordinator',
      role: VBT_ROLES.COORDINATOR,
    };

    const servantUser = {
      id: 'usr_servant_1',
      displayName: 'Andrew Servant',
      role: VBT_ROLES.ACTIVE_SERVANT,
    };

    it('renders Phase 1 (BEFORE THE MEETING) with agenda, location, open roles, prayer', () => {
      const html = renderToString(
        React.createElement(ServantMeetingMode, {
          serviceId: 'svc_test_meeting',
          currentUser: leaderUser,
          initialPhase: MEETING_MODES.BEFORE,
        })
      );

      // Verify phase tabs exist
      expect(html).toContain('1. Before Meeting');
      expect(html).toContain('2. During Meeting');
      expect(html).toContain('3. After Meeting');

      // Verify logistics & location
      expect(html).toContain('Meeting Room &amp; Time');
      expect(html).toContain('Arrival Time');

      // Verify QR Code & checkin
      expect(html).toContain('Attendance QR &amp; Check-In');

      // Verify agenda timeline
      expect(html).toContain('Meeting Agenda &amp; Timeline');
      expect(html).toContain('Opening Prayer &amp; Devotional');

      // Verify prep materials
      expect(html).toContain('Preparation Materials &amp; Scripture Notes');

      // Verify open serving roles
      expect(html).toContain('Open Serving Roles for Upcoming Service');

      // Verify prayer topics
      expect(html).toContain('Prayer Topics &amp; Spiritual Focus');
    });

    it('renders Phase 2 (DURING THE MEETING) with live attendance, agenda flow, and live polls', () => {
      const html = renderToString(
        React.createElement(ServantMeetingMode, {
          serviceId: 'svc_test_meeting',
          currentUser: servantUser,
          initialPhase: MEETING_MODES.DURING,
        })
      );

      // Verify during phase elements
      expect(html).toContain('Live Servant Attendance');
      expect(html).toContain('Live Agenda Flow &amp; Progress');
      expect(html).toContain('Live Meeting Polls &amp; Pulse Checks');
      expect(html).toContain('Team Readiness Pulse');
      expect(html).toContain('Shared Discussion Prompts');
    });

    it('renders Phase 3 (AFTER THE MEETING) with summary decisions, action items tracker, feedback form, next countdown', () => {
      const html = renderToString(
        React.createElement(ServantMeetingMode, {
          serviceId: 'svc_test_meeting',
          currentUser: servantUser,
          initialPhase: MEETING_MODES.AFTER,
        })
      );

      // Verify after phase elements
      expect(html).toContain('Meeting Summary &amp; Key Decisions');
      expect(html).toContain('Follow-Up Action Items Tracker');
      expect(html).toContain('Servant Meeting Feedback');
      expect(html).toContain('Submit Servant Feedback');
      expect(html).toContain('Next Cycle Reminder');
      expect(html).toContain('Countdown');
    });

    it('renders Leader Controls when current user is a leader', () => {
      const html = renderToString(
        React.createElement(ServantMeetingMode, {
          serviceId: 'svc_test_meeting',
          currentUser: leaderUser,
          initialPhase: MEETING_MODES.BEFORE,
        })
      );

      expect(html).toContain('Leader Meeting Controls');
      expect(html).toContain('Broadcast Alert');
      expect(html).toContain('+ Action Item');
    });

    it('omits Leader Controls when current user is regular servant', () => {
      const html = renderToString(
        React.createElement(ServantMeetingMode, {
          serviceId: 'svc_test_meeting',
          currentUser: servantUser,
          initialPhase: MEETING_MODES.BEFORE,
        })
      );

      expect(html).not.toContain('Leader Meeting Controls');
    });
  });
});
