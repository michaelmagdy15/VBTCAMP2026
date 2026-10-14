import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hook harness tracking
let hookStates = [];
let hookSetters = [];
let hookEffects = [];
let hookPointer = 0;

vi.mock('react', () => ({
  useState: vi.fn((initial) => {
    const idx = hookPointer++;
    if (hookStates[idx] === undefined) {
      hookStates[idx] = typeof initial === 'function' ? initial() : initial;
    }
    if (!hookSetters[idx]) {
      hookSetters[idx] = vi.fn((newVal) => {
        hookStates[idx] = typeof newVal === 'function' ? newVal(hookStates[idx]) : newVal;
      });
    }
    return [hookStates[idx], hookSetters[idx]];
  }),
  useEffect: vi.fn((fn) => {
    hookEffects.push(fn);
  }),
  useCallback: vi.fn((fn) => fn),
}));

// Mocks for dependencies
vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
  getEventRegistry: vi.fn(),
  getServants: vi.fn().mockResolvedValue([]),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, path) => ({ type: 'collection', path })),
  doc: vi.fn((_db, path, id) => ({ type: 'doc', path: id ? `${path}/${id}` : path })),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('./serviceMeetingService', () => ({
  SERVICE_TYPES: {
    WEEKLY_SERVICE: 'weekly_service',
    SERVANT_MEETING: 'servant_meeting',
    SPORTS_PRACTICE: 'sports_practice',
    TOURNAMENT: 'tournament',
  },
  getUpcomingServices: vi.fn(),
  getNextDayOfWeekDate: vi.fn((day) => {
    if (day === 5) return '2026-10-16'; // Next Friday
    if (day === 2) return '2026-10-13'; // Next Tuesday
    return '2026-10-10';
  }),
  formatLocalDate: vi.fn(() => '2026-10-07'),
}));

vi.mock('./servingOpportunityService', () => ({
  OPPORTUNITY_ROLES: {
    REFEREE: 'referee',
    PRAISE: 'praise',
    LOGISTICS: 'logistics',
    FIRST_AID: 'first_aid',
    MEDIA: 'media',
    GENERAL: 'general',
  },
  getOpportunities: vi.fn(),
  getRemainingSpots: vi.fn((opp) => {
    if (!opp) return 0;
    const needed = opp.spotsNeeded || 0;
    const filled = opp.spotsFilled || 0;
    return Math.max(0, needed - filled);
  }),
}));

vi.mock('./servingAssignmentService', () => ({
  applyForOpportunity: vi.fn(),
  getOpportunityApplications: vi.fn(),
}));

vi.mock('./attendanceService', () => ({
  CHECKIN_METHOD: {
    QR_SCAN: 'qr_scan',
    MANUAL_LEADER: 'manual_leader',
    SELF_KIOSK: 'self_kiosk',
  },
  recordAttendance: vi.fn(),
  getMemberServiceStatus: vi.fn(),
}));

vi.mock('./memberService', () => ({
  getMemberPublicProfile: vi.fn(),
}));

import {
  WEEKLY_SCRIPTURE,
  buildWeeklyRhythmActivities,
  buildFallbackServingOpportunities,
  buildFallbackAnnouncements,
  getCommunityActivities,
  getServingOpportunities,
  getCommunityServingOpportunities,
  getCommunityAnnouncements,
  getMemberAssignments,
  getMemberContext,
  submitAttendanceCheckIn,
  submitServingInterest,
  getOfflineAttendanceQueue,
  saveToOfflineAttendanceQueue,
  clearOfflineAttendanceQueue,
  syncOfflineAttendanceQueue,
  parseTimeToHoursAndMinutes,
  formatICalDate,
  exportToCalendar,
  useCommunityData,
} from './communityAdapterService';

import { getEventRegistry } from '../firebase';
import { getUpcomingServices } from './serviceMeetingService';
import { getOpportunities } from './servingOpportunityService';
import { applyForOpportunity, getOpportunityApplications } from './servingAssignmentService';
import { recordAttendance, getMemberServiceStatus } from './attendanceService';
import { getMemberPublicProfile } from './memberService';
import { getDocs } from 'firebase/firestore';

function resetHookHarness() {
  hookStates = [];
  hookSetters = [];
  hookEffects = [];
  hookPointer = 0;
}

describe('CommunityAdapterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOfflineAttendanceQueue();
    resetHookHarness();

    // Default online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    clearOfflineAttendanceQueue();
  });

  describe('Static & Fallback Builders', () => {
    it('builds weekly rhythm activities with Friday service and Tuesday servant meeting', () => {
      const rhythm = buildWeeklyRhythmActivities('vbt_main');
      expect(rhythm).toHaveLength(2);

      const fridayService = rhythm.find((a) => a.serviceType === 'weekly_service');
      expect(fridayService).toBeDefined();
      expect(fridayService.date).toBe('2026-10-16');
      expect(fridayService.startTime).toBe('18:30');
      expect(fridayService.isFallback).toBe(true);

      const tuesdayMeeting = rhythm.find((a) => a.serviceType === 'servant_meeting');
      expect(tuesdayMeeting).toBeDefined();
      expect(tuesdayMeeting.date).toBe('2026-10-13');
      expect(tuesdayMeeting.startTime).toBe('19:00');
      expect(tuesdayMeeting.isFallback).toBe(true);
    });

    it('builds fallback serving opportunities with 4 core roles and remaining spots', () => {
      const opps = buildFallbackServingOpportunities('vbt_main');
      expect(opps.length).toBeGreaterThanOrEqual(4);

      const stationLeader = opps.find((o) => o.id === 'fallback_opp_station_leader');
      expect(stationLeader).toBeDefined();
      expect(stationLeader.spotsNeeded).toBe(4);
      expect(stationLeader.spotsFilled).toBe(2);
      expect(stationLeader.spotsRemaining).toBe(2);
      expect(stationLeader.requirements.length).toBeGreaterThan(0);

      const mediaOpp = opps.find((o) => o.id === 'fallback_opp_media_sound');
      expect(mediaOpp).toBeDefined();
      expect(mediaOpp.role).toBe('media');

      const refereeOpp = opps.find((o) => o.id === 'fallback_opp_referee');
      expect(refereeOpp).toBeDefined();
      expect(refereeOpp.role).toBe('referee');
    });

    it('builds fallback announcements with dates, pinned flags, and weekly scripture', () => {
      const announcements = buildFallbackAnnouncements('vbt_main');
      expect(announcements.length).toBe(3);
      expect(announcements[0].pinned).toBe(true);
      expect(announcements[0].title).toContain('2026');
      expect(WEEKLY_SCRIPTURE.reference).toBe('Colossians 3:23');
    });
  });

  describe('getCommunityActivities', () => {
    it('returns scheduled services directly when available from Firestore', async () => {
      getUpcomingServices.mockResolvedValueOnce([
        {
          id: 'svc_101',
          title: 'Friday Sports Night',
          serviceType: 'weekly_service',
          date: '2026-10-16',
          startTime: '18:30',
        },
      ]);

      const activities = await getCommunityActivities('vbt_main');
      expect(activities).toHaveLength(1);
      expect(activities[0].id).toBe('svc_101');
      expect(activities[0].source).toBe('service');
      expect(activities[0].isFallback).toBe(false);
    });

    it('falls back to active registry events and weekly rhythm when Firestore services are empty', async () => {
      getUpcomingServices.mockResolvedValueOnce([]);
      getEventRegistry.mockResolvedValueOnce([
        {
          code: 'tournament_july',
          name: 'Summer Tournament 2026',
          date: '2026-10-15',
          startTime: '10:00',
          active: true,
        },
        {
          code: 'archived_camp',
          name: 'Old Camp',
          active: false,
        },
      ]);

      const activities = await getCommunityActivities('vbt_main');
      expect(activities.length).toBeGreaterThanOrEqual(3);

      // Active event should be included
      const tournament = activities.find((a) => a.linkedEventCode === 'tournament_july');
      expect(tournament).toBeDefined();
      expect(tournament.title).toBe('Summer Tournament 2026');
      expect(tournament.isFallback).toBe(true);

      // Archived event should NOT be included
      const archived = activities.find((a) => a.linkedEventCode === 'archived_camp');
      expect(archived).toBeUndefined();

      // Weekly rhythm items should be included
      const friday = activities.find((a) => a.serviceType === 'weekly_service');
      const tuesday = activities.find((a) => a.serviceType === 'servant_meeting');
      expect(friday).toBeDefined();
      expect(tuesday).toBeDefined();

      // Should be sorted chronologically
      for (let i = 0; i < activities.length - 1; i++) {
        expect(activities[i].date <= activities[i + 1].date).toBe(true);
      }
    });

    it('falls back seamlessly when offline without calling Firestore getUpcomingServices', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      getEventRegistry.mockResolvedValueOnce([]);

      const activities = await getCommunityActivities('vbt_main');
      expect(getUpcomingServices).not.toHaveBeenCalled();
      expect(activities).toHaveLength(2); // Weekly rhythm items
    });

    it('catches Firestore service errors and safely returns fallback items', async () => {
      getUpcomingServices.mockRejectedValueOnce(new Error('Network Firestore Error'));
      getEventRegistry.mockResolvedValueOnce([]);

      const activities = await getCommunityActivities('vbt_main');
      expect(activities.length).toBe(2);
      expect(activities[0].isFallback).toBe(true);
    });
  });

  describe('getCommunityServingOpportunities', () => {
    it('returns queried opportunities with calculated remaining spots when available', async () => {
      getOpportunities.mockResolvedValueOnce([
        {
          id: 'opp_db_1',
          title: 'Basketball Coach',
          spotsNeeded: 5,
          spotsFilled: 2,
        },
      ]);

      const opps = await getCommunityServingOpportunities('vbt_main');
      expect(opps).toHaveLength(1);
      expect(opps[0].id).toBe('opp_db_1');
      expect(opps[0].spotsRemaining).toBe(3);
      expect(opps[0].isFallback).toBe(false);
    });

    it('returns fallback opportunities with spots remaining when Firestore query is empty', async () => {
      getOpportunities.mockResolvedValueOnce([]);

      const opps = await getCommunityServingOpportunities('vbt_main');
      expect(opps.length).toBe(4);
      expect(opps[0].isFallback).toBe(true);
      expect(opps.every((o) => typeof o.spotsRemaining === 'number')).toBe(true);
    });

    it('returns fallback opportunities when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const opps = await getServingOpportunities('vbt_main');
      expect(getOpportunities).not.toHaveBeenCalled();
      expect(opps.length).toBe(4);
    });

    it('handles query error gracefully by falling back', async () => {
      getOpportunities.mockRejectedValueOnce(new Error('Permission denied'));

      const opps = await getCommunityServingOpportunities('vbt_main');
      expect(opps.length).toBe(4);
    });
  });

  describe('getCommunityAnnouncements', () => {
    it('returns announcements from Firestore and attaches weekly scripture', async () => {
      getDocs.mockResolvedValueOnce([
        { id: 'ann_live_1', data: () => ({ title: 'Live Announcement', message: 'Hello' }) },
      ]);

      const result = await getCommunityAnnouncements('vbt_main');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ann_live_1');
      expect(result.scripture.reference).toBe('Colossians 3:23');
      expect(result.announcements).toBeDefined();
    });

    it('returns fallback announcements and scripture when Firestore query is empty or fails', async () => {
      getDocs.mockRejectedValueOnce(new Error('Firestore offline'));

      const result = await getCommunityAnnouncements('vbt_main');
      expect(result.length).toBe(3);
      expect(result[0].title).toContain('Welcome');
      expect(result.scripture).toEqual(WEEKLY_SCRIPTURE);
    });
  });

  describe('getMemberAssignments', () => {
    it('returns empty array if memberId is empty', async () => {
      const res = await getMemberAssignments('vbt_main', null);
      expect(res).toEqual([]);
    });

    it('fetches applications across opportunities and returns matched member assignments', async () => {
      getOpportunities.mockResolvedValueOnce([
        {
          id: 'opp_soccer',
          title: 'Soccer Referee',
          serviceTitle: 'Friday Game',
          serviceDate: '2026-10-16',
          role: 'referee',
          requirements: ['Whistle'],
        },
      ]);

      getOpportunityApplications.mockResolvedValueOnce([
        {
          id: 'app_user_1',
          memberId: 'user_1',
          status: 'confirmed',
          notes: 'Ready to serve',
        },
        {
          id: 'app_user_2',
          memberId: 'user_2',
          status: 'pending',
        },
      ]);

      const assignments = await getMemberAssignments('vbt_main', 'user_1');
      expect(assignments).toHaveLength(1);
      expect(assignments[0].id).toBe('app_user_1');
      expect(assignments[0].opportunityId).toBe('opp_soccer');
      expect(assignments[0].opportunityTitle).toBe('Soccer Referee');
      expect(assignments[0].serviceDate).toBe('2026-10-16');
    });

    it('returns empty array if an error occurs', async () => {
      getOpportunities.mockRejectedValueOnce(new Error('Network error'));
      const assignments = await getMemberAssignments('vbt_main', 'user_1');
      expect(assignments).toEqual([]);
    });
  });

  describe('getMemberContext', () => {
    it('returns unauthenticated guest context when memberId and currentUser are null', async () => {
      const ctx = await getMemberContext('vbt_main', null, null);
      expect(ctx.memberId).toBeNull();
      expect(ctx.isRegistered).toBe(false);
      expect(ctx.role).toBe('guest');
      expect(ctx.canManageServices).toBe(false);
      expect(ctx.canCheckIn).toBe(false);
      expect(ctx.assignedDuties).toEqual([]);
    });

    it('evaluates registered member with profile, assigned duties, and recent attendance', async () => {
      getMemberPublicProfile.mockResolvedValueOnce({
        id: 'user_john',
        displayName: 'John Doe',
        role: 'team_leader',
      });

      // Mock assignments query
      getOpportunities.mockResolvedValueOnce([
        {
          id: 'opp_lead',
          title: 'Station Leader',
          serviceTitle: 'Friday Youth Gathering',
        },
      ]);
      getOpportunityApplications.mockResolvedValueOnce([
        {
          id: 'app_1',
          memberId: 'user_john',
          status: 'confirmed',
        },
        {
          id: 'app_2',
          memberId: 'user_john',
          status: 'pending',
        },
      ]);

      // Mock upcoming services for attendance check
      getUpcomingServices.mockResolvedValueOnce([
        { id: 'svc_recent_1', title: 'Last Friday Service', date: '2026-10-09' },
      ]);
      getMemberServiceStatus.mockResolvedValueOnce({
        id: 'user_john',
        status: 'present',
        checkInMethod: 'qr_scan',
      });

      const ctx = await getMemberContext('vbt_main', 'user_john');
      expect(ctx.isRegistered).toBe(true);
      expect(ctx.role).toBe('team_leader');
      expect(ctx.canManageServices).toBe(true);
      expect(ctx.canCheckIn).toBe(true);
      expect(ctx.assignedDuties).toHaveLength(1);
      expect(ctx.pendingApplications).toHaveLength(1);
      expect(ctx.recentAttendance).toHaveLength(1);
      expect(ctx.stats.attendanceCount).toBe(1);
      expect(ctx.stats.assignmentsCount).toBe(1);
      expect(ctx.stats.pendingCount).toBe(1);
    });

    it('evaluates unregistered user with currentUser auth payload', async () => {
      getMemberPublicProfile.mockResolvedValueOnce(null);
      getOpportunities.mockResolvedValueOnce([]);
      getUpcomingServices.mockResolvedValueOnce([]);

      const currentUser = { uid: 'auth_guest', displayName: 'Visiting Player' };
      const ctx = await getMemberContext('vbt_main', null, currentUser);

      expect(ctx.memberId).toBe('auth_guest');
      expect(ctx.isRegistered).toBe(false);
      expect(ctx.role).toBe('unregistered');
      expect(ctx.profile.displayName).toBe('Visiting Player');
      expect(ctx.canManageServices).toBe(false);
      expect(ctx.canCheckIn).toBe(true);
    });
  });

  describe('submitAttendanceCheckIn', () => {
    it('returns error if serviceId or memberId is missing', async () => {
      const res = await submitAttendanceCheckIn('vbt_main', { serviceId: '' });
      expect(res.success).toBe(false);
      expect(res.status).toBe('error');
    });

    it('returns expired if QR token is expired', async () => {
      const res = await submitAttendanceCheckIn('vbt_main', {
        serviceId: 'svc_1',
        memberId: 'm_1',
        token: 'expired',
      });
      expect(res.success).toBe(false);
      expect(res.status).toBe('expired');

      const resObj = await submitAttendanceCheckIn('vbt_main', {
        serviceId: 'svc_1',
        memberId: 'm_1',
        token: { isExpired: true },
      });
      expect(resObj.status).toBe('expired');
    });

    it('returns already_checked_in if member has already recorded present status', async () => {
      getMemberServiceStatus.mockResolvedValueOnce({
        id: 'm_1',
        status: 'present',
      });

      const res = await submitAttendanceCheckIn('vbt_main', {
        serviceId: 'svc_1',
        memberId: 'm_1',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('already_checked_in');
      expect(recordAttendance).not.toHaveBeenCalled();
    });

    it('records attendance online when not checked in yet', async () => {
      getMemberServiceStatus.mockResolvedValueOnce(null);
      recordAttendance.mockResolvedValueOnce({
        id: 'm_1',
        status: 'present',
      });

      const res = await submitAttendanceCheckIn('vbt_main', {
        serviceId: 'svc_1',
        memberId: 'm_1',
        memberName: 'Mark',
        method: 'qr_scan',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('present');
      expect(recordAttendance).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceId: 'svc_1',
          checkInMethod: 'qr_scan',
          status: 'present',
        })
      );
    });

    it('queues check-in when offline and returns status pending', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const res = await submitAttendanceCheckIn('vbt_main', {
        serviceId: 'svc_offline_1',
        memberId: 'm_off_1',
        memberName: 'Offline Mark',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('pending');

      const queue = getOfflineAttendanceQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].serviceId).toBe('svc_offline_1');
      expect(queue[0].memberId).toBe('m_off_1');
    });

    it('queues check-in if online submission throws network error', async () => {
      getMemberServiceStatus.mockResolvedValueOnce(null);
      recordAttendance.mockRejectedValueOnce(new Error('Network connection dropped'));

      const res = await submitAttendanceCheckIn('vbt_main', {
        serviceId: 'svc_fail_1',
        memberId: 'm_fail_1',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('pending');
      expect(getOfflineAttendanceQueue()).toHaveLength(1);
    });
  });

  describe('Offline Attendance Queue Management', () => {
    it('saves, retrieves, and clears offline attendance queue', () => {
      saveToOfflineAttendanceQueue({ serviceId: 'svc_q1', memberId: 'm_1' });
      saveToOfflineAttendanceQueue({ serviceId: 'svc_q2', memberId: 'm_2' });

      expect(getOfflineAttendanceQueue()).toHaveLength(2);

      clearOfflineAttendanceQueue();
      expect(getOfflineAttendanceQueue()).toHaveLength(0);
    });

    it('syncs offline attendance queue when online', async () => {
      saveToOfflineAttendanceQueue({
        communityId: 'vbt_main',
        serviceId: 'svc_sync_1',
        memberId: 'm_sync_1',
        memberName: 'User 1',
      });
      saveToOfflineAttendanceQueue({
        communityId: 'vbt_main',
        serviceId: 'svc_sync_2',
        memberId: 'm_sync_2',
        memberName: 'User 2',
      });

      recordAttendance.mockResolvedValue({ id: 'ok', status: 'present' });

      const result = await syncOfflineAttendanceQueue();
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(0);
      expect(getOfflineAttendanceQueue()).toHaveLength(0);
    });

    it('retains failing items in queue during sync', async () => {
      saveToOfflineAttendanceQueue({
        communityId: 'vbt_main',
        serviceId: 'svc_pass',
        memberId: 'm_1',
      });
      saveToOfflineAttendanceQueue({
        communityId: 'vbt_main',
        serviceId: 'svc_err',
        memberId: 'm_2',
      });

      recordAttendance
        .mockResolvedValueOnce({ id: 'm_1' })
        .mockRejectedValueOnce(new Error('Sync failed'));

      const result = await syncOfflineAttendanceQueue();
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(1);
      expect(getOfflineAttendanceQueue()).toHaveLength(1);
      expect(getOfflineAttendanceQueue()[0].serviceId).toBe('svc_err');
    });
  });

  describe('submitServingInterest', () => {
    it('validates opportunityId and memberId', async () => {
      const res = await submitServingInterest('vbt_main', null, null);
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('submits application via applyForOpportunity when online', async () => {
      applyForOpportunity.mockResolvedValueOnce({
        id: 'app_new_1',
        status: 'pending',
      });

      const res = await submitServingInterest(
        'vbt_main',
        'opp_referee',
        'user_david',
        'I have 3 years referee experience',
        { displayName: 'David' }
      );

      expect(res.success).toBe(true);
      expect(res.applicationId).toBe('app_new_1');
      expect(applyForOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          communityId: 'vbt_main',
          opportunityId: 'opp_referee',
          notes: 'I have 3 years referee experience',
          member: expect.objectContaining({
            id: 'user_david',
            displayName: 'David',
          }),
        })
      );
    });

    it('queues application offline when connection is unavailable', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const res = await submitServingInterest(
        'vbt_main',
        'opp_referee',
        'user_david',
        'Offline note'
      );

      expect(res.success).toBe(true);
      expect(res.queued).toBe(true);
      expect(res.status).toBe('pending');
      expect(applyForOpportunity).not.toHaveBeenCalled();
    });

    it('returns error if application fails online', async () => {
      applyForOpportunity.mockRejectedValueOnce(new Error('Database write rejected'));

      const res = await submitServingInterest('vbt_main', 'opp_1', 'user_1', 'Note');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Database write rejected');
    });
  });

  describe('exportToCalendar & Calendar Helpers', () => {
    it('parses 24h and AM/PM time strings properly', () => {
      expect(parseTimeToHoursAndMinutes('18:30')).toEqual({ hour: 18, minute: 30 });
      expect(parseTimeToHoursAndMinutes('6:30 PM')).toEqual({ hour: 18, minute: 30 });
      expect(parseTimeToHoursAndMinutes('9:00 AM')).toEqual({ hour: 9, minute: 0 });
      expect(parseTimeToHoursAndMinutes('12:00 PM')).toEqual({ hour: 12, minute: 0 });
      expect(parseTimeToHoursAndMinutes('12:00 AM')).toEqual({ hour: 0, minute: 0 });
      expect(parseTimeToHoursAndMinutes('')).toEqual({ hour: 18, minute: 30 });
    });

    it('formats UTC iCal date properly', () => {
      const date = new Date(Date.UTC(2026, 9, 16, 18, 30, 0));
      expect(formatICalDate(date)).toBe('20261016T183000Z');
    });

    it('exports activity to valid iCalendar content and Google Calendar URL', () => {
      const activity = {
        id: 'act_101',
        title: 'Friday Night Tournament',
        description: 'Championship finals and worship celebration.',
        date: '2026-10-16',
        startTime: '18:30',
        endTime: '21:30',
        location: {
          name: 'Main Gymnasium',
          address: 'Court 1',
        },
      };

      const { icsContent, googleCalendarUrl, download } = exportToCalendar(activity);

      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).toContain('SUMMARY:Friday Night Tournament');
      expect(icsContent).toContain('LOCATION:Main Gymnasium, Court 1');
      expect(icsContent).toContain('UID:act_101@vbtcamp.app');

      expect(googleCalendarUrl).toContain('https://calendar.google.com/calendar/render');
      expect(googleCalendarUrl).toContain('Friday%20Night%20Tournament');
      expect(typeof download).toBe('function');
    });
  });

  describe('useCommunityData React Hook', () => {
    it('initializes and provides refresh, checkIn, applyServing, and exportToCalendar', async () => {
      getUpcomingServices.mockResolvedValue([
        { id: 'svc_1', title: 'Community Service', date: '2026-10-16' },
      ]);
      getOpportunities.mockResolvedValue([
        { id: 'opp_1', title: 'Station Servant', spotsNeeded: 3, spotsFilled: 1 },
      ]);
      getDocs.mockResolvedValue([
        { id: 'ann_1', data: () => ({ title: 'Welcome', message: 'Hi' }) },
      ]);
      getMemberPublicProfile.mockResolvedValue({
        id: 'usr_1',
        displayName: 'Peter',
        role: 'servant',
      });
      getOpportunityApplications.mockResolvedValue([]);

      const hookResult = useCommunityData('vbt_main', { uid: 'usr_1', displayName: 'Peter' });

      expect(typeof hookResult.refresh).toBe('function');
      expect(typeof hookResult.checkIn).toBe('function');
      expect(typeof hookResult.applyServing).toBe('function');
      expect(typeof hookResult.exportToCalendar).toBe('function');

      // Trigger refresh
      await hookResult.refresh();

      // Verify setters were called for state updates
      expect(hookSetters[5]).toHaveBeenCalledWith(false); // setLoading(false)
      expect(hookSetters[0]).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'svc_1' })])
      );
    });

    it('invokes checkIn and triggers optimistic updates', async () => {
      getUpcomingServices.mockResolvedValue([]);
      getOpportunities.mockResolvedValue([]);
      getDocs.mockResolvedValue([]);
      getMemberPublicProfile.mockResolvedValue({ id: 'u_tester', displayName: 'Tester' });
      getOpportunityApplications.mockResolvedValue([]);
      getMemberServiceStatus.mockResolvedValue(null);
      recordAttendance.mockResolvedValue({ id: 'u_tester', status: 'present' });

      const hookResult = useCommunityData('vbt_main', { uid: 'u_tester', displayName: 'Tester' });

      const checkInRes = await hookResult.checkIn({
        serviceId: 'svc_test_checkin',
        method: 'qr_scan',
      });

      expect(checkInRes.success).toBe(true);
      expect(checkInRes.status).toBe('present');
      expect(hookSetters[4]).toHaveBeenCalled(); // setMemberContext was updated
    });
  });
});
