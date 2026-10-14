/**
 * Activity Type Definition Constants & Helpers
 */
export const ACTIVITY_TYPES = {
  WEEKLY_SERVICE: 'weekly_service',
  SERVANT_MEETING: 'servant_meeting',
  SPORTS_PRACTICE: 'sports_practice',
  PRACTICE: 'practice',
  TOURNAMENT: 'tournament',
  OUTREACH: 'outreach',
  SPECIAL_EVENT: 'special_event',
};

/**
 * Valid Explicit Card States (11 states required by VBT specification)
 */
export const CARD_STATES = {
  UPCOMING: 'upcoming',
  REGISTERED: 'registered',
  ATTENDANCE_OPEN: 'attendance_open',
  CHECKED_IN: 'checked_in',
  SERVING_NEEDED: 'serving_needed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EMPTY: 'empty',
  LOADING: 'loading',
  OFFLINE: 'offline',
};

/**
 * Get Type Badge Configuration (label, styling, color tokens)
 */
export function getTypeBadgeConfig(typeStr = '') {
  const norm = String(typeStr).toLowerCase().trim();

  if (norm.includes('weekly') || norm.includes('service') || norm === ACTIVITY_TYPES.WEEKLY_SERVICE) {
    return {
      typeKey: 'weekly_service',
      label: 'Weekly Service',
      bg: 'bg-cyan-500/15',
      text: 'text-cyan-300',
      border: 'border-cyan-500/40',
    };
  }

  if (norm.includes('servant') || norm === ACTIVITY_TYPES.SERVANT_MEETING) {
    return {
      typeKey: 'servant_meeting',
      label: 'Servant Meeting',
      bg: 'bg-purple-500/15',
      text: 'text-purple-300',
      border: 'border-purple-500/40',
    };
  }

  if (norm.includes('practice') || norm.includes('sport') || norm === ACTIVITY_TYPES.SPORTS_PRACTICE) {
    return {
      typeKey: 'practice',
      label: 'Practice',
      bg: 'bg-amber-500/15',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
    };
  }

  if (norm.includes('tournament') || norm === ACTIVITY_TYPES.TOURNAMENT) {
    return {
      typeKey: 'tournament',
      label: 'Tournament',
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-300',
      border: 'border-emerald-500/40',
    };
  }

  if (norm.includes('outreach') || norm === ACTIVITY_TYPES.OUTREACH) {
    return {
      typeKey: 'outreach',
      label: 'Outreach',
      bg: 'bg-rose-500/15',
      text: 'text-rose-300',
      border: 'border-rose-500/40',
    };
  }

  return {
    typeKey: 'other',
    label: typeStr ? typeStr.replace(/_/g, ' ') : 'Gathering',
    bg: 'bg-blue-500/15',
    text: 'text-blue-300',
    border: 'border-blue-500/40',
  };
}

/**
 * Resolve the effective card state based on props and data
 */
export function resolveActivityState(activity, participation, explicitState) {
  if (explicitState) return explicitState;
  if (!activity || activity.isEmpty) return CARD_STATES.EMPTY;
  if (activity === 'loading' || activity.isLoading) return CARD_STATES.LOADING;
  if (activity.isOffline || participation?.isOffline) return CARD_STATES.OFFLINE;

  // Check declared state or status
  const raw = (activity.state || activity.status || '').toLowerCase();
  const allStates = Object.values(CARD_STATES);
  if (allStates.includes(raw)) {
    return raw;
  }

  // Canonical inferred states
  if (activity.cancelled || raw === 'canceled') return CARD_STATES.CANCELLED;
  if (activity.completed || raw === 'finished' || raw === 'completed') return CARD_STATES.COMPLETED;
  if (participation?.checkedIn || participation?.status === 'checked_in') return CARD_STATES.CHECKED_IN;
  if (activity.isLive || raw === 'live' || raw === 'in_progress') return CARD_STATES.IN_PROGRESS;
  if (activity.attendanceOpen || activity.isAttendanceOpen || raw === 'attendance_open') return CARD_STATES.ATTENDANCE_OPEN;
  if (participation?.registered || participation?.status === 'registered') return CARD_STATES.REGISTERED;
  if (activity.servingNeeded || (activity.openRolesCount && activity.openRolesCount > 0)) return CARD_STATES.SERVING_NEEDED;

  return CARD_STATES.UPCOMING;
}

/**
 * Format friendly human date
 */
export function formatActivityDate(dateVal) {
  if (!dateVal) return 'Date TBA';
  let d;
  if (typeof dateVal?.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal?.seconds) {
    d = new Date(dateVal.seconds * 1000);
  } else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, day] = dateVal.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateVal);
  }

  if (isNaN(d.getTime())) return String(dateVal);

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format friendly time range (e.g. "6:30 PM – 9:30 PM")
 */
export function formatActivityTime(startTime, endTime) {
  if (!startTime) return 'Time TBA';
  const parseHour = (t) => {
    if (!t) return '';
    const parts = t.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const startFmt = parseHour(startTime);
  if (!endTime) return startFmt;
  return `${startFmt} – ${parseHour(endTime)}`;
}

/**
 * Format registration timestamp
 */
export function formatRegistrationDate(val) {
  if (!val) return 'Recently';
  let d;
  if (typeof val?.toDate === 'function') {
    d = val.toDate();
  } else if (val?.seconds) {
    d = new Date(val.seconds * 1000);
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return String(val);

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format check-in timestamp
 */
export function formatCheckInTime(val) {
  if (!val) return 'Just now';
  let d;
  if (typeof val?.toDate === 'function') {
    d = val.toDate();
  } else if (val?.seconds) {
    d = new Date(val.seconds * 1000);
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) return String(val);

  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Generate standard RFC 5545 .ics Calendar Content
 */
export function generateIcsContent(activity) {
  const title = activity?.title || 'VBT Community Activity';
  const location = activity?.location || 'Main Sanctuary & Gym Court';
  const description = activity?.description || 'VBT Sports Camp & Community Gathering';

  let dateStr = activity?.date;
  if (typeof dateStr?.toDate === 'function') {
    dateStr = dateStr.toDate().toISOString().slice(0, 10);
  } else if (dateStr?.seconds) {
    dateStr = new Date(dateStr.seconds * 1000).toISOString().slice(0, 10);
  } else if (dateStr instanceof Date) {
    dateStr = dateStr.toISOString().slice(0, 10);
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    dateStr = dateStr.slice(0, 10);
  }

  const cleanDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const startRaw = (activity?.startTime || '18:30').replace(':', '').padEnd(4, '0') + '00';
  const endRaw = (activity?.endTime || '21:30').replace(':', '').padEnd(4, '0') + '00';

  const dtStart = `${cleanDate}T${startRaw}`;
  const dtEnd = `${cleanDate}T${endRaw}`;
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const uid = `vbt-${activity?.id || 'event'}-${cleanDate}@vbtcommunity.com`;

  const escapeIcs = (str) =>
    (str || '').replace(/[\\;,\n]/g, (m) => {
      if (m === '\n') return '\\n';
      return `\\${m}`;
    });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VBT Sports Camp//Community Activity//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Trigger .ics download
 */
export function downloadIcsFile(activity) {
  if (typeof document === 'undefined') return;

  try {
    const icsContent = generateIcsContent(activity);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (activity?.title || 'vbt-activity')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);
    a.download = `${slug}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download calendar event:', err);
  }
}

/**
 * Generate Google Calendar URL
 */
export function getGoogleCalendarUrl(activity) {
  const title = encodeURIComponent(activity?.title || 'VBT Community Activity');
  const location = encodeURIComponent(activity?.location || 'Main Sanctuary & Gym Court');
  const details = encodeURIComponent(activity?.description || 'VBT Sports Camp & Community Gathering');

  let dateStr = activity?.date;
  if (typeof dateStr?.toDate === 'function') {
    dateStr = dateStr.toDate().toISOString().slice(0, 10);
  } else if (dateStr?.seconds) {
    dateStr = new Date(dateStr.seconds * 1000).toISOString().slice(0, 10);
  } else if (dateStr instanceof Date) {
    dateStr = dateStr.toISOString().slice(0, 10);
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    dateStr = dateStr.slice(0, 10);
  }

  const cleanDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const startRaw = (activity?.startTime || '18:30').replace(':', '').padEnd(4, '0') + '00';
  const endRaw = (activity?.endTime || '21:30').replace(':', '').padEnd(4, '0') + '00';
  const dates = `${cleanDate}T${startRaw}/${cleanDate}T${endRaw}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}
