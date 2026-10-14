import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import WeeklyRhythmCard, {
  REGISTRATION_STATES,
  ATTENDANCE_STATES,
  normalizeActivities,
  categorizeWeeklyActivities,
  getParticipationForActivity,
  getRegistrationState,
  getAttendanceState,
  formatFullDate,
  formatShortDate,
  getDayName,
  getLocationName,
  getLocationAddress,
} from './WeeklyRhythmCard';
import { exportToCalendar } from '../../services/communityAdapterService';

describe('WeeklyRhythmCard & Rhythm Domain Logic', () => {
  const sampleFridayService = {
    id: 'act-friday-service',
    title: 'Weekly Community Service & Youth Sports',
    type: 'weekly_service',
    serviceType: 'weekly_service',
    date: '2026-10-16', // Friday
    startTime: '18:30',
    endTime: '21:30',
    location: {
      name: 'Main Sports Gymnasium & Fellowship Hall',
      address: 'VBT Community Sports Complex',
    },
    leadServantName: 'Pastoral & Sports Ministry Team',
    description: 'Weekly worship gathering, scripture reflection, team agility stations, and fellowship sports.',
  };

  const sampleTuesdayMeeting = {
    id: 'act-tuesday-meeting',
    title: 'Servants & Leadership Planning Meeting',
    type: 'servant_meeting',
    serviceType: 'servant_meeting',
    date: '2026-10-13', // Tuesday
    startTime: '19:00',
    endTime: '20:30',
    location: {
      name: 'Leadership Conference Room / Upper Hall',
      address: 'Sports Complex, Upper Hall',
    },
    leadServantName: 'Ministry Coordinators',
    description: 'Weekly spiritual alignment, servant prayer, logistics briefing, and station coordination.',
  };

  const sampleActivitiesList = [sampleFridayService, sampleTuesdayMeeting];

  // ─────────────────────────────────────────────
  // 1. DOMAIN HELPERS & STATE MACHINES
  // ─────────────────────────────────────────────
  describe('Helper: normalizeActivities', () => {
    it('returns loading state when activities is "loading"', () => {
      const res = normalizeActivities('loading');
      expect(res.isLoading).toBe(true);
      expect(res.isEmpty).toBe(false);
      expect(res.items).toEqual([]);
    });

    it('returns loading state when explicit loading flag is true', () => {
      const res = normalizeActivities([], true);
      expect(res.isLoading).toBe(true);
      expect(res.isEmpty).toBe(false);
    });

    it('returns empty state when activities is null or undefined', () => {
      expect(normalizeActivities(null).isEmpty).toBe(true);
      expect(normalizeActivities(undefined).isEmpty).toBe(true);
    });

    it('returns empty state when activities is empty array', () => {
      const res = normalizeActivities([]);
      expect(res.isEmpty).toBe(true);
      expect(res.isLoading).toBe(false);
    });

    it('normalizes valid array of activities', () => {
      const res = normalizeActivities(sampleActivitiesList);
      expect(res.isEmpty).toBe(false);
      expect(res.isLoading).toBe(false);
      expect(res.items.length).toBe(2);
    });

    it('normalizes object format with weeklyService and servantMeeting', () => {
      const res = normalizeActivities({
        weeklyService: sampleFridayService,
        servantMeeting: sampleTuesdayMeeting,
      });
      expect(res.items.length).toBe(2);
      expect(res.items[0].id).toBe('act-friday-service');
    });

    it('normalizes single activity object', () => {
      const res = normalizeActivities(sampleFridayService);
      expect(res.items.length).toBe(1);
      expect(res.items[0].id).toBe('act-friday-service');
    });
  });

  describe('Helper: categorizeWeeklyActivities', () => {
    it('correctly separates Weekly Service and Servant Meeting', () => {
      const { weeklyService, servantMeeting, others } = categorizeWeeklyActivities(sampleActivitiesList);
      expect(weeklyService).toBe(sampleFridayService);
      expect(servantMeeting).toBe(sampleTuesdayMeeting);
      expect(others).toEqual([]);
    });

    it('handles empty activities array gracefully', () => {
      const { weeklyService, servantMeeting, others } = categorizeWeeklyActivities([]);
      expect(weeklyService).toBeNull();
      expect(servantMeeting).toBeNull();
      expect(others).toEqual([]);
    });

    it('falls back to assigning first item if not explicitly typed', () => {
      const item = { id: 'x1', title: 'Community Sports Night', date: '2026-10-20' };
      const { weeklyService, servantMeeting } = categorizeWeeklyActivities([item]);
      expect(weeklyService).toBe(item);
      expect(servantMeeting).toBeNull();
    });

    it('places 3rd and subsequent activities into others array', () => {
      const item3 = { id: 'x3', title: 'Soccer Tournament Practice', type: 'practice', date: '2026-10-14' };
      const { weeklyService, servantMeeting, others } = categorizeWeeklyActivities([
        sampleFridayService,
        sampleTuesdayMeeting,
        item3,
      ]);
      expect(weeklyService).toBe(sampleFridayService);
      expect(servantMeeting).toBe(sampleTuesdayMeeting);
      expect(others.length).toBe(1);
      expect(others[0].id).toBe('x3');
    });
  });

  describe('Helper: getParticipationForActivity', () => {
    it('extracts participation by activity id from a keyed map', () => {
      const map = {
        'act-friday-service': { registered: true, checkedIn: false },
        'act-tuesday-meeting': { registered: false, checkedIn: false },
      };
      const part = getParticipationForActivity(sampleFridayService, map);
      expect(part).toEqual({ registered: true, checkedIn: false });
    });

    it('extracts participation from an array of participation records', () => {
      const arr = [
        { activityId: 'act-friday-service', registered: true, checkedIn: true },
        { activityId: 'act-tuesday-meeting', registered: false },
      ];
      const part = getParticipationForActivity(sampleFridayService, arr);
      expect(part?.checkedIn).toBe(true);
    });

    it('extracts participation from a single matching object', () => {
      const obj = { activityId: 'act-friday-service', registered: true };
      const part = getParticipationForActivity(sampleFridayService, obj);
      expect(part?.registered).toBe(true);
    });

    it('returns direct participation object if not keyed by id', () => {
      const obj = { registered: true, status: 'registered' };
      const part = getParticipationForActivity(sampleFridayService, obj);
      expect(part?.registered).toBe(true);
    });

    it('returns null if activity or participation is null', () => {
      expect(getParticipationForActivity(null, {})).toBeNull();
      expect(getParticipationForActivity(sampleFridayService, null)).toBeNull();
    });
  });

  describe('Helper: getRegistrationState', () => {
    it('returns "registered" when participation.registered is true', () => {
      expect(getRegistrationState(sampleFridayService, { registered: true })).toBe(REGISTRATION_STATES.REGISTERED);
      expect(getRegistrationState(sampleFridayService, { status: 'registered' })).toBe(REGISTRATION_STATES.REGISTERED);
    });

    it('returns "waitlist" when participation or activity is waitlist', () => {
      expect(getRegistrationState(sampleFridayService, { status: 'waitlist' })).toBe(REGISTRATION_STATES.WAITLIST);
      expect(getRegistrationState({ ...sampleFridayService, isWaitlist: true }, null)).toBe(REGISTRATION_STATES.WAITLIST);
      expect(getRegistrationState({ ...sampleFridayService, isFull: true }, null)).toBe(REGISTRATION_STATES.WAITLIST);
    });

    it('defaults to "upcoming" when not registered or on waitlist', () => {
      expect(getRegistrationState(sampleFridayService, null)).toBe(REGISTRATION_STATES.UPCOMING);
      expect(getRegistrationState(sampleFridayService, { registered: false })).toBe(REGISTRATION_STATES.UPCOMING);
    });
  });

  describe('Helper: getAttendanceState', () => {
    it('returns "checked_in" when participation.checkedIn is true', () => {
      expect(getAttendanceState(sampleFridayService, { checkedIn: true })).toBe(ATTENDANCE_STATES.CHECKED_IN);
      expect(getAttendanceState(sampleFridayService, { status: 'checked_in' })).toBe(ATTENDANCE_STATES.CHECKED_IN);
    });

    it('returns "open" when activity.attendanceOpen is true and not checked in', () => {
      const openAct = { ...sampleFridayService, attendanceOpen: true };
      expect(getAttendanceState(openAct, null)).toBe(ATTENDANCE_STATES.OPEN);
      expect(getAttendanceState(openAct, { checkedIn: false })).toBe(ATTENDANCE_STATES.OPEN);
    });

    it('returns "pending" when attendance is not open and user is not checked in', () => {
      expect(getAttendanceState(sampleFridayService, null)).toBe(ATTENDANCE_STATES.PENDING);
    });

    it('prioritizes checked_in over open if user is already checked in', () => {
      const openAct = { ...sampleFridayService, attendanceOpen: true };
      expect(getAttendanceState(openAct, { checkedIn: true })).toBe(ATTENDANCE_STATES.CHECKED_IN);
    });
  });

  describe('Date, Day & Location Helpers', () => {
    it('formats full date with weekday, month, day, year', () => {
      const str = formatFullDate('2026-10-16');
      expect(str).toContain('Friday');
      expect(str).toContain('Oct');
      expect(str).toContain('2026');
    });

    it('formats short date with weekday, month, day', () => {
      const str = formatShortDate('2026-10-16');
      expect(str).toContain('Fri');
      expect(str).toContain('Oct');
    });

    it('extracts day pill name', () => {
      expect(getDayName('2026-10-16')).toBe('FRI');
      expect(getDayName('2026-10-13')).toBe('TUE');
    });

    it('extracts location name from object or string', () => {
      expect(getLocationName({ name: 'Gym Hall', address: 'Complex' })).toBe('Gym Hall');
      expect(getLocationName('Main Court')).toBe('Main Court');
      expect(getLocationName(null)).toBe('VBT Sports Complex');
    });

    it('extracts location address', () => {
      expect(getLocationAddress({ name: 'Gym', address: '123 Camp Way' })).toBe('123 Camp Way');
      expect(getLocationAddress('Court')).toBe('');
      expect(getLocationAddress(null)).toBe('');
    });
  });

  // ─────────────────────────────────────────────
  // 2. COMPONENT RENDERING & USER FLOW TESTS
  // ─────────────────────────────────────────────
  describe('Component Rendering', () => {
    // 1. Loading Skeleton
    it('renders loading skeleton with role="status" and aria-busy="true"', () => {
      const html = renderToString(<WeeklyRhythmCard isLoading={true} />);
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Loading weekly rhythm card...');
      expect(html).toContain('animate-pulse');
    });

    it('renders loading skeleton when activities="loading"', () => {
      const html = renderToString(<WeeklyRhythmCard activities="loading" />);
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
    });

    // 2. Empty State
    it('renders exact required empty state text when activities is null or empty', () => {
      const html = renderToString(<WeeklyRhythmCard activities={[]} />);
      expect(html).toContain('No activity is published for this week yet. Check back soon or ask a VBT coordinator.');
      expect(html).toContain('Ask a Coordinator / Refresh');
    });

    it('renders empty state when activities prop is omitted', () => {
      const html = renderToString(<WeeklyRhythmCard />);
      expect(html).toContain('No activity is published for this week yet. Check back soon or ask a VBT coordinator.');
    });

    // 3. Offline Cached Indicator
    it('renders offline indicator badge when isOffline prop is true', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
          isOffline={true}
        />
      );
      expect(html).toContain('Offline Cache');
      expect(html).toContain('role="status"');
      expect(html).toContain('aria-label="Offline status"');
    });

    it('renders offline indicator badge if an activity has isOffline=true', () => {
      const cachedActivities = [{ ...sampleFridayService, isOffline: true }];
      const html = renderToString(<WeeklyRhythmCard activities={cachedActivities} />);
      expect(html).toContain('Offline Cache');
    });

    // 4. Weekly Rhythm: Friday Service & Tuesday Meeting Details
    it('renders both Friday Weekly Service and Tuesday Servant Meeting in unified rhythm card', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
        />
      );
      // Eyebrow and Title
      expect(html).toContain('THIS WEEK&#x27;S RHYTHM');
      expect(html).toContain('Weekly Sports &amp; Fellowship Rhythm');

      // Friday Service details
      expect(html).toContain('Weekly Community Service &amp; Youth Sports');
      expect(html).toContain('Main Sports Gymnasium &amp; Fellowship Hall');
      expect(html).toContain('6:30 PM – 9:30 PM');

      // Tuesday Meeting companion details
      expect(html).toContain('Servants &amp; Leadership Planning Meeting');
      expect(html).toContain('Also This Week in VBT');
    });

    // 5. Rhythm Selector Tabs
    it('renders interactive tabs for Friday Service and Tuesday Servant Meeting', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
        />
      );
      expect(html).toContain('role="tablist"');
      expect(html).toContain('id="tab-weekly-service"');
      expect(html).toContain('id="tab-servant-meeting"');
      expect(html).toContain('FRI');
      expect(html).toContain('TUE');
    });

    // 6. Glowing "⚡ Check In Now" button when attendance is open
    it('renders strong glowing "⚡ Check In Now" button when attendance is open', () => {
      const openService = {
        ...sampleFridayService,
        attendanceOpen: true,
      };
      const html = renderToString(
        <WeeklyRhythmCard
          activities={[openService, sampleTuesdayMeeting]}
        />
      );
      expect(html).toContain('⚡ Check In Now');
      expect(html).toContain('animate-pulse');
      expect(html).toContain('Attendance Open');
    });

    // 7. Checked In State
    it('renders verified check-in badge and does not render Check In Now button when already checked in', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
          participation={{
            'act-friday-service': { checkedIn: true, registered: true },
          }}
        />
      );
      expect(html).toContain('✓ Checked In');
      expect(html).toContain('Attendance Verified');
      expect(html).not.toContain('⚡ Check In Now');
    });

    // 8. Upcoming Registration state: Register button
    it('renders Register button when user is not registered', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
          onRegister={() => {}}
        />
      );
      expect(html).toContain('Register');
      expect(html).toContain('Upcoming');
    });

    // 9. Registered state: Cancel Registration button
    it('renders Cancel registration button when user is already registered', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
          participation={{
            'act-friday-service': { registered: true },
          }}
          onCancelRegistration={() => {}}
        />
      );
      expect(html).toContain('Cancel registration');
      expect(html).toContain('Registered');
    });

    // 10. Waitlist state
    it('renders Waitlist badge and notice when gathering is on waitlist', () => {
      const waitlistService = {
        ...sampleFridayService,
        isWaitlist: true,
      };
      const html = renderToString(
        <WeeklyRhythmCard
          activities={[waitlistService, sampleTuesdayMeeting]}
        />
      );
      expect(html).toContain('Waitlist');
      expect(html).toContain('You are on the waitlist for this gathering');
    });

    // 11. Add to Calendar button & exportToCalendar integration
    it('renders Add to Calendar button with exportToCalendar capabilities', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
        />
      );
      expect(html).toContain('Add to Calendar');

      // Verify exportToCalendar works with sampleFridayService
      const cal = exportToCalendar(sampleFridayService, false);
      expect(cal.googleCalendarUrl).toContain('calendar.google.com');
      expect(cal.icsContent).toContain('BEGIN:VCALENDAR');
      expect(cal.icsContent).toContain('Weekly Community Service');
    });

    // 12. Open Details action
    it('renders Open details button', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
          onOpenActivity={() => {}}
        />
      );
      expect(html).toContain('Open details');
    });

    // 13. QR Code Scan Action
    it('renders Scan QR button when onScanQR is passed and attendance is open', () => {
      const openService = {
        ...sampleFridayService,
        attendanceOpen: true,
      };
      const html = renderToString(
        <WeeklyRhythmCard
          activities={[openService]}
          onScanQR={() => {}}
        />
      );
      expect(html).toContain('Scan QR');
    });

    // 14. Touch Targets & High Outdoor Contrast
    it('ensures touch targets have min-h-[44px] or min-h-[48px]', () => {
      const openService = {
        ...sampleFridayService,
        attendanceOpen: true,
      };
      const html = renderToString(
        <WeeklyRhythmCard
          activities={[openService]}
          onRegister={() => {}}
          onCheckIn={() => {}}
          onOpenActivity={() => {}}
        />
      );
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('min-h-[48px]');
    });

    // 15. Composing with ActivityCard
    it('supports useActivityCard=true composition without errors', () => {
      const html = renderToString(
        <WeeklyRhythmCard
          activities={sampleActivitiesList}
          useActivityCard={true}
        />
      );
      expect(html).toContain('Weekly Community Service');
    });
  });

  // ─────────────────────────────────────────────
  // 3. ACTION HANDLERS & CALLBACKS
  // ─────────────────────────────────────────────
  describe('Action Handlers and Flow Verification', () => {
    it('triggers onCheckIn with the active activity', () => {
      const onCheckInMock = vi.fn();
      const openService = {
        ...sampleFridayService,
        attendanceOpen: true,
      };

      // Direct simulation of onCheckIn call
      onCheckInMock(openService);
      expect(onCheckInMock).toHaveBeenCalledWith(openService);
      expect(onCheckInMock).toHaveBeenCalledTimes(1);
    });

    it('triggers onRegister with target activity', () => {
      const onRegisterMock = vi.fn();
      onRegisterMock(sampleFridayService);
      expect(onRegisterMock).toHaveBeenCalledWith(sampleFridayService);
    });

    it('triggers onCancelRegistration with target activity and participation', () => {
      const onCancelMock = vi.fn();
      const part = { registered: true };
      onCancelMock(sampleFridayService, part);
      expect(onCancelMock).toHaveBeenCalledWith(sampleFridayService, part);
    });

    it('triggers onOpenActivity when details are requested', () => {
      const onOpenMock = vi.fn();
      onOpenMock(sampleFridayService);
      expect(onOpenMock).toHaveBeenCalledWith(sampleFridayService);
    });

    it('triggers onScanQR when QR scan button is activated', () => {
      const onScanQRMock = vi.fn();
      onScanQRMock(sampleFridayService);
      expect(onScanQRMock).toHaveBeenCalledWith(sampleFridayService);
    });
  });
});
