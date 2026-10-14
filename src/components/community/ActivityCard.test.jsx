import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import ActivityCard from './ActivityCard';
import {
  CARD_STATES,
  ACTIVITY_TYPES,
  getTypeBadgeConfig,
  resolveActivityState,
  formatActivityDate,
  formatActivityTime,
  formatRegistrationDate,
  formatCheckInTime,
  generateIcsContent,
  downloadIcsFile,
  getGoogleCalendarUrl,
} from './activityCardUtils';

describe('ActivityCard & activityCardUtils', () => {
  const sampleActivity = {
    id: 'act-101',
    title: 'Friday VBT Fellowship & Sports',
    type: ACTIVITY_TYPES.WEEKLY_SERVICE,
    date: '2026-10-16',
    startTime: '18:30',
    endTime: '21:30',
    location: 'Main Sanctuary & Gym Court',
    description: 'Praise and sports fellowship evening for youth.',
    cancellationReason: 'Court maintenance scheduled.',
  };

  const sampleParticipation = {
    userId: 'user-abc',
    registered: true,
    registeredAt: '2026-10-12T15:00:00Z',
    checkedIn: true,
    checkedInAt: '2026-10-16T18:34:00Z',
  };

  describe('getTypeBadgeConfig', () => {
    it('resolves Weekly Service badge', () => {
      const config = getTypeBadgeConfig('weekly_service');
      expect(config.label).toBe('Weekly Service');
      expect(config.typeKey).toBe('weekly_service');
      expect(config.text).toContain('text-cyan-300');
    });

    it('resolves Servant Meeting badge', () => {
      const config = getTypeBadgeConfig('servant_meeting');
      expect(config.label).toBe('Servant Meeting');
      expect(config.typeKey).toBe('servant_meeting');
      expect(config.text).toContain('text-purple-300');
    });

    it('resolves Practice badge', () => {
      const config = getTypeBadgeConfig('sports_practice');
      expect(config.label).toBe('Practice');
      expect(config.typeKey).toBe('practice');
      expect(config.text).toContain('text-amber-300');
    });

    it('resolves Tournament badge', () => {
      const config = getTypeBadgeConfig('tournament');
      expect(config.label).toBe('Tournament');
      expect(config.typeKey).toBe('tournament');
      expect(config.text).toContain('text-emerald-300');
    });

    it('resolves Outreach badge', () => {
      const config = getTypeBadgeConfig('outreach');
      expect(config.label).toBe('Outreach');
      expect(config.typeKey).toBe('outreach');
      expect(config.text).toContain('text-rose-300');
    });

    it('provides graceful fallback for custom gathering types', () => {
      const config = getTypeBadgeConfig('special_awards_night');
      expect(config.label).toBe('special awards night');
      expect(config.typeKey).toBe('other');
    });
  });

  describe('resolveActivityState - 11 States Priority', () => {
    it('returns empty when activity is null or has isEmpty flag', () => {
      expect(resolveActivityState(null)).toBe(CARD_STATES.EMPTY);
      expect(resolveActivityState({ isEmpty: true })).toBe(CARD_STATES.EMPTY);
    });

    it('returns loading when activity is loading', () => {
      expect(resolveActivityState('loading')).toBe(CARD_STATES.LOADING);
      expect(resolveActivityState({ isLoading: true })).toBe(CARD_STATES.LOADING);
    });

    it('returns offline when offline flag is true', () => {
      expect(resolveActivityState({ isOffline: true })).toBe(CARD_STATES.OFFLINE);
      expect(resolveActivityState({}, { isOffline: true })).toBe(CARD_STATES.OFFLINE);
    });

    it('respects explicit state override prop', () => {
      expect(resolveActivityState(sampleActivity, {}, 'attendance_open')).toBe(CARD_STATES.ATTENDANCE_OPEN);
      expect(resolveActivityState(sampleActivity, {}, 'cancelled')).toBe(CARD_STATES.CANCELLED);
    });

    it('respects explicit state declared on activity object', () => {
      expect(resolveActivityState({ ...sampleActivity, state: 'checked_in' })).toBe(CARD_STATES.CHECKED_IN);
      expect(resolveActivityState({ ...sampleActivity, status: 'in_progress' })).toBe(CARD_STATES.IN_PROGRESS);
      expect(resolveActivityState({ ...sampleActivity, status: 'serving_needed' })).toBe(CARD_STATES.SERVING_NEEDED);
    });

    it('incurs cancelled when activity.cancelled is true', () => {
      expect(resolveActivityState({ ...sampleActivity, cancelled: true })).toBe(CARD_STATES.CANCELLED);
    });

    it('incurs checked_in when participation.checkedIn is true', () => {
      expect(resolveActivityState(sampleActivity, { checkedIn: true })).toBe(CARD_STATES.CHECKED_IN);
    });

    it('incurs in_progress when activity is live', () => {
      expect(resolveActivityState({ ...sampleActivity, isLive: true })).toBe(CARD_STATES.IN_PROGRESS);
    });

    it('incurs attendance_open when attendanceOpen is true', () => {
      expect(resolveActivityState({ ...sampleActivity, attendanceOpen: true })).toBe(CARD_STATES.ATTENDANCE_OPEN);
    });

    it('incurs registered when participation.registered is true', () => {
      expect(resolveActivityState(sampleActivity, { registered: true })).toBe(CARD_STATES.REGISTERED);
    });

    it('incurs serving_needed when openRolesCount > 0', () => {
      expect(resolveActivityState({ ...sampleActivity, openRolesCount: 4 })).toBe(CARD_STATES.SERVING_NEEDED);
    });

    it('incurs completed when activity.completed is true', () => {
      expect(resolveActivityState({ ...sampleActivity, completed: true })).toBe(CARD_STATES.COMPLETED);
    });

    it('defaults to upcoming', () => {
      expect(resolveActivityState({ ...sampleActivity, openRolesCount: 0 })).toBe(CARD_STATES.UPCOMING);
    });
  });

  describe('formatActivityDate & formatActivityTime', () => {
    it('formats YYYY-MM-DD date string', () => {
      const formatted = formatActivityDate('2026-10-16');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });

    it('formats Firestore-style timestamp object', () => {
      const formatted = formatActivityDate({ seconds: 1792176000 });
      expect(formatted).toBeTruthy();
    });

    it('handles null date gracefully', () => {
      expect(formatActivityDate(null)).toBe('Date TBA');
    });

    it('formats 24h start and end times to 12h range', () => {
      expect(formatActivityTime('18:30', '21:30')).toBe('6:30 PM – 9:30 PM');
      expect(formatActivityTime('09:00', '11:00')).toBe('9:00 AM – 11:00 AM');
      expect(formatActivityTime('12:00', '13:30')).toBe('12:00 PM – 1:30 PM');
    });

    it('handles start time only without end time', () => {
      expect(formatActivityTime('18:30')).toBe('6:30 PM');
    });

    it('handles null time gracefully', () => {
      expect(formatActivityTime(null)).toBe('Time TBA');
    });
  });

  describe('formatRegistrationDate & formatCheckInTime', () => {
    it('formats registration date', () => {
      expect(formatRegistrationDate('2026-10-12T15:00:00Z')).toContain('2026');
      expect(formatRegistrationDate(null)).toBe('Recently');
    });

    it('formats check-in time', () => {
      const timeFmt = formatCheckInTime('2026-10-16T18:34:00Z');
      expect(timeFmt).toBeTruthy();
      expect(formatCheckInTime(null)).toBe('Just now');
    });
  });

  describe('Calendar Helper Utilities', () => {
    it('generates standard RFC 5545 .ics content', () => {
      const ics = generateIcsContent(sampleActivity);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('SUMMARY:Friday VBT Fellowship & Sports');
      expect(ics).toContain('LOCATION:Main Sanctuary & Gym Court');
      expect(ics).toContain('DTSTART:20261016T183000');
      expect(ics).toContain('DTEND:20261016T213000');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('generates Google Calendar render URL', () => {
      const url = getGoogleCalendarUrl(sampleActivity);
      expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
      expect(url).toContain('Friday%20VBT%20Fellowship%20%26%20Sports');
      expect(url).toContain('dates=20261016T183000/20261016T213000');
    });

    it('downloads .ics file via blob URL', () => {
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      const mockAnchor = {
        click: vi.fn(),
        setAttribute: vi.fn(),
      };
      const mockDoc = {
        createElement: vi.fn(() => mockAnchor),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };
      const originalDoc = global.document;
      const originalWindow = global.window;
      global.document = mockDoc;
      global.window = global;
      URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      URL.revokeObjectURL = vi.fn();

      downloadIcsFile(sampleActivity);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      global.document = originalDoc;
      global.window = originalWindow;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });

  describe('ActivityCard Component - 11 States Rendering', () => {
    // 1. Loading State
    it('renders loading state skeleton shimmer card', () => {
      const html = renderToString(<ActivityCard state={CARD_STATES.LOADING} />);
      expect(html).toContain('role="status"');
      expect(html).toContain('Loading activity schedule...');
      expect(html).toContain('animate-pulse');
    });

    // 2. Empty State
    it('renders friendly empty state message', () => {
      const html = renderToString(<ActivityCard activity={null} />);
      expect(html).toContain('No Scheduled Activity');
      expect(html).toContain('No activity published for this week yet. Check back soon or ask a VBT coordinator.');
    });

    // 3. Upcoming State
    it('renders upcoming state with title, date, location, type badge, Register button, and Add to Calendar', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          state={CARD_STATES.UPCOMING}
        />
      );
      expect(html).toContain('Friday VBT Fellowship &amp; Sports');
      expect(html).toContain('Weekly Service');
      expect(html).toContain('Main Sanctuary &amp; Gym Court');
      expect(html).toContain('Register');
      expect(html).toContain('Add to Calendar');
    });

    // 4. Registered State
    it('renders registered state with green badge, registered on date, and cancel registration button', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          participation={sampleParticipation}
          state={CARD_STATES.REGISTERED}
        />
      );
      expect(html).toContain('Registered');
      expect(html).toContain('Registered on');
      expect(html).toContain('Cancel registration');
    });

    // 5. Attendance Open State
    it('renders attendance_open state with glowing card and Check In Now button', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          state={CARD_STATES.ATTENDANCE_OPEN}
        />
      );
      expect(html).toContain('⚡ Check In Now');
      expect(html).toContain('Check-In Open');
      expect(html).toContain('border-amber-400');
    });

    // 6. Checked In State
    it('renders checked_in state with Checked In badge, check-in timestamp, and Pass active indicator', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          participation={sampleParticipation}
          state={CARD_STATES.CHECKED_IN}
        />
      );
      expect(html).toContain('✓ Checked In');
      expect(html).toContain('Checked in at');
      expect(html).toContain('Pass active');
      expect(html).toContain('View Pass');
    });

    // 7. Serving Needed State
    it('renders serving_needed state with Servants Needed badge, open roles, and I can serve button', () => {
      const servingActivity = {
        ...sampleActivity,
        openRolesCount: 3,
        openRoles: ['Sound Engineer', 'Referee', 'Hospitality'],
      };
      const html = renderToString(
        <ActivityCard
          activity={servingActivity}
          state={CARD_STATES.SERVING_NEEDED}
        />
      );
      expect(html).toContain('🤝 Servants Needed');
      expect(html).toContain('Servant Spots Open');
      expect(html).toContain('I can serve');
    });

    // 8. In Progress State
    it('renders in_progress state with Live Now badge, pulsing dot, and Enter Activity button', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          state={CARD_STATES.IN_PROGRESS}
        />
      );
      expect(html).toContain('🔴 Live Now');
      expect(html).toContain('Live Session in Progress');
      expect(html).toContain('Enter Activity / Live Scoreboard');
    });

    // 9. Completed State
    it('renders completed state with Completed badge and View Recap / Scores button', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          state={CARD_STATES.COMPLETED}
        />
      );
      expect(html).toContain('Completed');
      expect(html).toContain('View Recap / Scores');
    });

    // 10. Cancelled State
    it('renders cancelled state with Cancelled badge and cancellation reason notice', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          state={CARD_STATES.CANCELLED}
        />
      );
      expect(html).toContain('Cancelled');
      expect(html).toContain('Cancellation Reason:');
      expect(html).toContain('Court maintenance scheduled.');
      expect(html).toContain('line-through');
    });

    // 11. Offline State
    it('renders offline state with amber banner indicating cached schedule data', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          state={CARD_STATES.OFFLINE}
        />
      );
      expect(html).toContain('Working offline — showing cached schedule. Changes will sync when reconnected.');
      expect(html).toContain('Cached');
    });

    // Compact Mode
    it('renders compact mode without crashing', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          compact={true}
        />
      );
      expect(html).toContain('Friday VBT Fellowship &amp; Sports');
      expect(html).toContain('Register');
    });

    // User Attribution
    it('includes currentUser context in accessibility label if provided', () => {
      const html = renderToString(
        <ActivityCard
          activity={sampleActivity}
          currentUser={{ displayName: 'Coach John' }}
        />
      );
      expect(html).toContain('User: Coach John');
    });
  });
});
