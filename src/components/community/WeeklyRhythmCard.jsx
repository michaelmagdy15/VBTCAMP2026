import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  WifiOff,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Church,
  Dumbbell,
  HeartHandshake,
  Trophy,
  RefreshCw,
  UserPlus,
  QrCode,
  CalendarPlus,
  CalendarX,
  AlertCircle,
  Columns2,
  Layers,
} from 'lucide-react';
import { exportToCalendar } from '../../services/communityAdapterService';
import {
  CARD_STATES,
  getTypeBadgeConfig,
  formatActivityTime,
} from './activityCardUtils';
import ActivityCard from './ActivityCard';

/**
 * Valid Registration States (VBT Community Spec)
 */
export const REGISTRATION_STATES = {
  UPCOMING: 'upcoming',
  REGISTERED: 'registered',
  WAITLIST: 'waitlist',
};

/**
 * Valid Attendance States (VBT Community Spec)
 */
export const ATTENDANCE_STATES = {
  OPEN: 'open',
  CHECKED_IN: 'checked_in',
  PENDING: 'pending',
};

/**
 * Icon mapping by activity type
 */
const RHYTHM_TYPE_ICONS = {
  weekly_service: Church,
  servant_meeting: Users,
  practice: Dumbbell,
  tournament: Trophy,
  outreach: HeartHandshake,
  other: Calendar,
};

/**
 * Normalizes input activities into an array or loading/empty flags
 * Handles: array of activities, object { weeklyService, servantMeeting }, single activity, loading, null
 *
 * @param {Array|Object|string} activities
 * @param {boolean} [explicitLoading=false]
 * @returns {{ isLoading: boolean, isEmpty: boolean, items: Array<Object> }}
 */
export function normalizeActivities(activities, explicitLoading = false) {
  if (explicitLoading || activities === 'loading' || (typeof activities === 'object' && activities?.isLoading)) {
    return { isLoading: true, isEmpty: false, items: [] };
  }

  if (!activities) {
    return { isLoading: false, isEmpty: true, items: [] };
  }

  if (Array.isArray(activities)) {
    const valid = activities.filter(Boolean);
    if (valid.length === 0) {
      return { isLoading: false, isEmpty: true, items: [] };
    }
    return { isLoading: false, isEmpty: false, items: valid };
  }

  if (typeof activities === 'object') {
    if (activities.isEmpty) {
      return { isLoading: false, isEmpty: true, items: [] };
    }
    if (Array.isArray(activities.activities)) {
      const valid = activities.activities.filter(Boolean);
      return { isLoading: false, isEmpty: valid.length === 0, items: valid };
    }
    if (activities.weeklyService || activities.servantMeeting) {
      const pair = [activities.weeklyService, activities.servantMeeting].filter(Boolean);
      return { isLoading: false, isEmpty: pair.length === 0, items: pair };
    }
    // Single activity object
    if (activities.id || activities.title || activities.date) {
      return { isLoading: false, isEmpty: false, items: [activities] };
    }
  }

  return { isLoading: false, isEmpty: true, items: [] };
}

/**
 * Categorizes a list of activities into Weekly Service and Servant Meeting
 *
 * @param {Array<Object>} items
 * @returns {{ weeklyService: Object|null, servantMeeting: Object|null, others: Array<Object> }}
 */
export function categorizeWeeklyActivities(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return { weeklyService: null, servantMeeting: null, others: [] };
  }

  let weeklyService = null;
  let servantMeeting = null;
  const others = [];

  for (const item of items) {
    if (!item) continue;
    const typeStr = String(item.type || item.serviceType || '').toLowerCase();
    const titleStr = String(item.title || '').toLowerCase();

    const isService =
      typeStr === 'weekly_service' ||
      typeStr.includes('weekly') ||
      typeStr.includes('service') ||
      titleStr.includes('service') ||
      titleStr.includes('worship') ||
      titleStr.includes('friday');

    const isServant =
      typeStr === 'servant_meeting' ||
      typeStr.includes('servant') ||
      titleStr.includes('servant') ||
      titleStr.includes('leader') ||
      titleStr.includes('planning') ||
      titleStr.includes('tuesday');

    if (isService && !weeklyService) {
      weeklyService = item;
    } else if (isServant && !servantMeeting) {
      servantMeeting = item;
    } else {
      others.push(item);
    }
  }

  // Graceful fallbacks if not specifically tagged
  if (!weeklyService && items.length > 0) {
    weeklyService = items[0];
  }
  if (!servantMeeting && items.length > 1) {
    const candidate = items.find((it) => it !== weeklyService);
    if (candidate) {
      servantMeeting = candidate;
      const idx = others.indexOf(candidate);
      if (idx !== -1) others.splice(idx, 1);
    }
  }

  return { weeklyService, servantMeeting, others };
}

/**
 * Resolves participation record for a specific activity
 * Handles: map keyed by ID, array of participations, or single object
 *
 * @param {Object} activity
 * @param {Object|Array} participation
 * @returns {Object|null}
 */
export function getParticipationForActivity(activity, participation) {
  if (!activity || !participation) return null;
  const actId = activity.id;

  if (actId && typeof participation === 'object' && !Array.isArray(participation) && participation[actId]) {
    return participation[actId];
  }

  if (Array.isArray(participation)) {
    const found = participation.find((p) => p && (p.activityId === actId || p.serviceId === actId || p.id === actId));
    if (found) return found;
  }

  if (typeof participation === 'object') {
    if (participation.activityId && actId && participation.activityId === actId) {
      return participation;
    }
    if (participation.serviceId && actId && participation.serviceId === actId) {
      return participation;
    }
    if ('registered' in participation || 'checkedIn' in participation || 'status' in participation) {
      return participation;
    }
  }

  return null;
}

/**
 * Resolves current registration state (upcoming, registered, waitlist)
 *
 * @param {Object} activity
 * @param {Object} part
 * @returns {'upcoming'|'registered'|'waitlist'}
 */
export function getRegistrationState(activity, part) {
  if (
    part?.registered === true ||
    part?.status === 'registered' ||
    activity?.isUserRegistered ||
    activity?.registered === true
  ) {
    return REGISTRATION_STATES.REGISTERED;
  }

  if (
    part?.waitlist === true ||
    part?.status === 'waitlist' ||
    part?.isWaitlist === true ||
    activity?.isWaitlist ||
    activity?.status === 'waitlist' ||
    activity?.state === 'waitlist' ||
    activity?.isFull
  ) {
    return REGISTRATION_STATES.WAITLIST;
  }

  return REGISTRATION_STATES.UPCOMING;
}

/**
 * Resolves current attendance state (open, checked_in, pending)
 *
 * @param {Object} activity
 * @param {Object} part
 * @returns {'open'|'checked_in'|'pending'}
 */
export function getAttendanceState(activity, part) {
  if (
    part?.checkedIn === true ||
    part?.status === 'checked_in' ||
    activity?.checkedIn === true ||
    activity?.isCheckedIn === true
  ) {
    return ATTENDANCE_STATES.CHECKED_IN;
  }

  if (
    activity?.attendanceOpen === true ||
    activity?.isAttendanceOpen === true ||
    activity?.status === 'attendance_open' ||
    activity?.state === 'attendance_open' ||
    activity?.isAttendanceActive === true
  ) {
    return ATTENDANCE_STATES.OPEN;
  }

  return ATTENDANCE_STATES.PENDING;
}

/**
 * Formats full human date with weekday (e.g., "Friday, Oct 16, 2026")
 */
export function formatFullDate(dateVal) {
  if (!dateVal) return 'Date TBA';
  let d;
  if (typeof dateVal?.toDate === 'function') d = dateVal.toDate();
  else if (dateVal?.seconds) d = new Date(dateVal.seconds * 1000);
  else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, day] = dateVal.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateVal);
  }

  if (isNaN(d?.getTime())) return String(dateVal);

  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats short human date (e.g., "Fri, Oct 16")
 */
export function formatShortDate(dateVal) {
  if (!dateVal) return 'Date TBA';
  let d;
  if (typeof dateVal?.toDate === 'function') d = dateVal.toDate();
  else if (dateVal?.seconds) d = new Date(dateVal.seconds * 1000);
  else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, day] = dateVal.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateVal);
  }

  if (isNaN(d?.getTime())) return String(dateVal);

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns uppercase 3-letter day pill (e.g., "FRI", "TUE")
 */
export function getDayName(dateVal) {
  if (!dateVal) return 'DAY';
  let d;
  if (typeof dateVal?.toDate === 'function') d = dateVal.toDate();
  else if (dateVal?.seconds) d = new Date(dateVal.seconds * 1000);
  else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, day] = dateVal.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateVal);
  }

  if (isNaN(d?.getTime())) return 'DAY';
  return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
}

/**
 * Extracts friendly location name
 */
export function getLocationName(loc) {
  if (!loc) return 'VBT Sports Complex';
  if (typeof loc === 'string') return loc;
  return loc.name || loc.address || 'VBT Sports Complex';
}

/**
 * Extracts location address
 */
export function getLocationAddress(loc) {
  if (!loc || typeof loc === 'string') return '';
  return loc.address || '';
}

/**
 * Interactive Add To Calendar Dropdown using communityAdapterService.exportToCalendar
 */
function RhythmAddToCalendarMenu({ activity, compact = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const calendarData = useMemo(() => {
    return exportToCalendar(activity || {}, false);
  }, [activity]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Add ${activity?.title || 'gathering'} to calendar`}
        className={`min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-850 text-slate-200 hover:text-white border border-slate-700/80 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
          compact ? 'px-2.5 py-1.5' : ''
        }`}
      >
        <CalendarPlus className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>Add to Calendar</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Add to calendar options"
          className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mt-2 mb-2 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const res = exportToCalendar(activity || {}, true);
              if (res && typeof res.download === 'function') {
                res.download();
              }
              setOpen(false);
            }}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Apple / Outlook (.ics)</span>
          </button>
          <a
            role="menuitem"
            href={calendarData.googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Google Calendar</span>
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Gathering Card within the Weekly Rhythm Container
 */
function RhythmGatheringCard({
  activity,
  participation,
  currentUser,
  onRegister,
  onCancelRegistration,
  onCheckIn,
  onOpenActivity,
  onScanQR,
  isFeatured = false,
  cardKey = 'gathering',
}) {
  const part = useMemo(
    () => getParticipationForActivity(activity, participation),
    [activity, participation]
  );

  const regState = useMemo(
    () => getRegistrationState(activity, part),
    [activity, part]
  );

  const attState = useMemo(
    () => getAttendanceState(activity, part),
    [activity, part]
  );

  const typeConfig = useMemo(
    () => getTypeBadgeConfig(activity?.type || activity?.serviceType),
    [activity?.type, activity?.serviceType]
  );

  const TypeIcon = RHYTHM_TYPE_ICONS[typeConfig.typeKey] || Calendar;
  const dayName = useMemo(() => getDayName(activity?.date), [activity?.date]);
  const dateFormatted = useMemo(() => formatFullDate(activity?.date), [activity?.date]);
  const timeFormatted = useMemo(
    () => formatActivityTime(activity?.startTime, activity?.endTime),
    [activity?.startTime, activity?.endTime]
  );
  const locationName = useMemo(() => getLocationName(activity?.location), [activity?.location]);
  const locationAddress = useMemo(() => getLocationAddress(activity?.location), [activity?.location]);

  const handleCardClick = useCallback(
    (e) => {
      // Don't trigger if clicked on interactive controls
      if (e.target.closest('button') || e.target.closest('a')) {
        return;
      }
      if (typeof onOpenActivity === 'function') {
        onOpenActivity(activity);
      }
    },
    [onOpenActivity, activity]
  );

  return (
    <article
      data-testid={`rhythm-card-${cardKey}`}
      onClick={handleCardClick}
      className={`relative overflow-hidden rounded-[20px] transition-all duration-200 border cursor-pointer ${
        isFeatured
          ? 'bg-slate-900/95 border-slate-700/80 shadow-2xl hover:border-slate-600'
          : 'bg-slate-900/80 border-slate-800 shadow-xl hover:border-slate-700'
      } p-5 sm:p-6`}
      style={{
        fontFamily: "var(--font-body, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* Glow / Subtle Accent Backdrops */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent blur-2xl pointer-events-none" />

      {/* TOP HEADER ROW: DAY BADGE + TYPE BADGE + STATUS BADGES */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          {/* Day of Week Pill */}
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-wider bg-slate-800 text-amber-300 border border-amber-500/30 uppercase shadow-sm">
            {dayName}
          </span>

          {/* Activity Type Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border} shadow-sm`}
          >
            <TypeIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{typeConfig.label}</span>
          </span>
        </div>

        {/* State Indicators (Registration & Attendance) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Attendance State Badge */}
          {attState === ATTENDANCE_STATES.OPEN && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Attendance Open</span>
            </span>
          )}

          {attState === ATTENDANCE_STATES.CHECKED_IN && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>✓ Checked In</span>
            </span>
          )}

          {/* Registration State Badge */}
          {regState === REGISTRATION_STATES.REGISTERED && attState !== ATTENDANCE_STATES.CHECKED_IN && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Registered</span>
            </span>
          )}

          {regState === REGISTRATION_STATES.WAITLIST && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Waitlist</span>
            </span>
          )}

          {regState === REGISTRATION_STATES.UPCOMING && attState === ATTENDANCE_STATES.PENDING && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 shadow-sm">
              <span>Upcoming</span>
            </span>
          )}
        </div>
      </div>

      {/* ACTIVITY TITLE */}
      <h3
        className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug mb-3 hover:text-amber-300 transition-colors"
        style={{
          fontFamily: "var(--font-title, 'Outfit', -apple-system, sans-serif)",
        }}
      >
        {activity?.title || 'Community Gathering'}
      </h3>

      {/* DESCRIPTION IF AVAILABLE */}
      {activity?.description && (
        <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 leading-relaxed mb-4">
          {activity.description}
        </p>
      )}

      {/* METADATA DETAILS (DATE, TIME, LOCATION) - OUTDOOR HIGH CONTRAST */}
      <div className="space-y-2.5 mb-5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
        {/* Date */}
        <div className="flex items-center gap-2.5 text-slate-200 text-xs sm:text-sm font-semibold">
          <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{dateFormatted}</span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2.5 text-slate-200 text-xs sm:text-sm font-semibold">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{timeFormatted}</span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2.5 text-slate-200 text-xs sm:text-sm">
          <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">{locationName}</span>
            {locationAddress && (
              <span className="block text-slate-400 text-xs mt-0.5">{locationAddress}</span>
            )}
          </div>
        </div>

        {/* Lead Servant / Pastoral Mention */}
        {activity?.leadServantName && (
          <div className="flex items-center gap-2.5 text-slate-300 text-xs pt-1 border-t border-slate-800/60">
            <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Led by {activity.leadServantName}</span>
          </div>
        )}
      </div>

      {/* ATTENDANCE CONFIRMED BANNER */}
      {attState === ATTENDANCE_STATES.CHECKED_IN && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm mb-4 flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Attendance Verified — You are checked in for this gathering!</span>
        </div>
      )}

      {/* WAITLIST BANNER */}
      {regState === REGISTRATION_STATES.WAITLIST && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>You are on the waitlist for this gathering. We will notify you if space opens.</span>
        </div>
      )}

      {/* ACTIONS ROW (ALL BUTTONS >=44PX TOUCH TARGET) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* ⚡ CHECK IN NOW (STRONG GLOWING BUTTON WHEN ATTENDANCE IS OPEN) */}
          {attState === ATTENDANCE_STATES.OPEN && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onCheckIn === 'function') onCheckIn(activity);
              }}
              aria-label={`Check in now for ${activity?.title || 'gathering'}`}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 active:scale-[0.98] text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto cursor-pointer animate-pulse border border-amber-300/60"
            >
              <Zap className="w-5 h-5 fill-current shrink-0" />
              <span style={{ fontFamily: "var(--font-title, 'Outfit', -apple-system, sans-serif)" }}>
                ⚡ Check In Now
              </span>
            </button>
          )}

          {/* SCAN QR ACTION */}
          {onScanQR && attState === ATTENDANCE_STATES.OPEN && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onScanQR(activity);
              }}
              aria-label={`Scan QR for ${activity?.title || 'gathering'}`}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Scan QR</span>
            </button>
          )}

          {/* REGISTRATION: REGISTER BUTTON */}
          {regState === REGISTRATION_STATES.UPCOMING && attState !== ATTENDANCE_STATES.OPEN && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onRegister === 'function') onRegister(activity);
              }}
              aria-label={`Register for ${activity?.title || 'gathering'}`}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Register</span>
            </button>
          )}

          {/* REGISTRATION: CANCEL REGISTRATION BUTTON */}
          {regState === REGISTRATION_STATES.REGISTERED && attState !== ATTENDANCE_STATES.CHECKED_IN && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onCancelRegistration === 'function') {
                  onCancelRegistration(activity, part);
                }
              }}
              aria-label={`Cancel registration for ${activity?.title || 'gathering'}`}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Cancel registration</span>
            </button>
          )}
        </div>

        {/* RIGHT ACTIONS: ADD TO CALENDAR + OPEN DETAILS */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Add to Calendar (.ics & Google Calendar via exportToCalendar) */}
          <RhythmAddToCalendarMenu activity={activity} />

          {/* Open Details Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onOpenActivity === 'function') {
                onOpenActivity(activity);
              }
            }}
            aria-label={`Open details for ${activity?.title || 'gathering'}`}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 hover:text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Open details</span>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * WeeklyRhythmCard Component
 * Contract:
 * <WeeklyRhythmCard
 *   activities={activities}
 *   participation={participation}
 *   currentUser={currentUser}
 *   onRegister={onRegister}
 *   onCancelRegistration={onCancelRegistration}
 *   onCheckIn={onCheckIn}
 *   onOpenActivity={onOpenActivity}
 *   onScanQR={onScanQR}
 *   isOffline={isOffline}
 * />
 */
export default function WeeklyRhythmCard({
  activities,
  participation,
  currentUser,
  onRegister,
  onCancelRegistration,
  onCheckIn,
  onOpenActivity,
  onOpen, // fallback alias
  onScanQR,
  isOffline = false,
  isLoading: propLoading = false,
  defaultTab,
  className = '',
  style = {},
  useActivityCard = false,
  onRefresh,
}) {
  const handleOpen = onOpenActivity || onOpen;

  // Normalize data and state
  const { isLoading, isEmpty, items } = useMemo(
    () => normalizeActivities(activities, propLoading),
    [activities, propLoading]
  );

  // Categorize weekly service and servant meeting
  const { weeklyService, servantMeeting, others } = useMemo(
    () => categorizeWeeklyActivities(items),
    [items]
  );

  // Active tab state: defaults to 'service' or first available
  const [activeTabKey, setActiveTabKey] = useState(() => {
    if (defaultTab) return defaultTab;
    if (weeklyService) return 'service';
    if (servantMeeting) return 'servant';
    return '0';
  });

  // Layout mode state: 'tabs' (mobile/compact friendly) vs 'side-by-side' (parallel cards)
  const [layoutMode, setLayoutMode] = useState('tabs');

  // Check if offline is flagged on data or prop
  const effectiveOffline = Boolean(isOffline || items.some((it) => it?.isOffline));

  // Determine active gathering
  const activeGathering = useMemo(() => {
    if (activeTabKey === 'service' && weeklyService) return weeklyService;
    if (activeTabKey === 'servant' && servantMeeting) return servantMeeting;
    const numericIdx = parseInt(activeTabKey, 10);
    if (!isNaN(numericIdx) && others[numericIdx]) return others[numericIdx];
    return weeklyService || servantMeeting || items[0] || null;
  }, [activeTabKey, weeklyService, servantMeeting, others, items]);

  // Determine companion gathering (the other gathering shown in tab mode preview)
  const companionGathering = useMemo(() => {
    if (activeGathering === weeklyService && servantMeeting) return servantMeeting;
    if (activeGathering === servantMeeting && weeklyService) return weeklyService;
    return null;
  }, [activeGathering, weeklyService, servantMeeting]);

  // ─────────────────────────────────────────────
  // 1. LOADING STATE SKELETON
  // ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <section
        role="status"
        aria-busy="true"
        aria-label="Loading weekly rhythm..."
        className={`relative overflow-hidden rounded-[24px] bg-slate-900/95 border border-slate-800 shadow-2xl p-5 sm:p-7 ${className}`}
        style={style}
      >
        <span className="sr-only">Loading weekly rhythm card...</span>

        {/* Top Header Placeholder */}
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded-full bg-slate-800 animate-pulse" />
            <div className="h-7 w-56 rounded-xl bg-slate-800 animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-full bg-slate-800/80 animate-pulse" />
        </div>

        {/* Tabs Placeholder */}
        <div className="flex gap-2.5 mb-6">
          <div className="h-11 w-44 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-11 w-44 rounded-xl bg-slate-800/70 animate-pulse" />
        </div>

        {/* Body Card Placeholder */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-6 w-32 rounded-lg bg-slate-800 animate-pulse" />
            <div className="h-6 w-24 rounded-full bg-slate-800 animate-pulse" />
          </div>
          <div className="h-8 w-3/4 rounded-xl bg-slate-800 animate-pulse" />
          <div className="space-y-2 py-2">
            <div className="h-5 w-1/2 rounded-md bg-slate-800/80 animate-pulse" />
            <div className="h-5 w-2/3 rounded-md bg-slate-800/80 animate-pulse" />
            <div className="h-5 w-1/3 rounded-md bg-slate-800/80 animate-pulse" />
          </div>
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="h-12 w-36 rounded-xl bg-slate-800 animate-pulse" />
            <div className="h-12 w-32 rounded-xl bg-slate-800/70 animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  // ─────────────────────────────────────────────
  // 2. EMPTY STATE
  // ─────────────────────────────────────────────
  if (isEmpty) {
    return (
      <section
        role="region"
        aria-label="This week's rhythm empty state"
        className={`relative overflow-hidden rounded-[24px] bg-slate-900/95 border border-slate-800/90 shadow-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center ${className}`}
        style={style}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
          <CalendarX className="w-8 h-8" />
        </div>
        <h3
          className="text-lg sm:text-2xl font-black text-white mb-2 tracking-tight"
          style={{ fontFamily: "var(--font-title, 'Outfit', -apple-system, sans-serif)" }}
        >
          This Week&apos;s Rhythm
        </h3>
        <p
          className="text-sm sm:text-base text-slate-300 max-w-md mx-auto leading-relaxed mb-6 font-medium"
          style={{ fontFamily: "var(--font-body, 'Inter', -apple-system, sans-serif)" }}
        >
          No activity is published for this week yet. Check back soon or ask a VBT coordinator.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof onRefresh === 'function') onRefresh();
            else if (typeof handleOpen === 'function') handleOpen(null, 'empty');
          }}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          <span>Ask a Coordinator / Refresh</span>
        </button>
      </section>
    );
  }

  // ─────────────────────────────────────────────
  // 3. UNIFIED WEEKLY RHYTHM CARD
  // ─────────────────────────────────────────────
  return (
    <section
      role="region"
      aria-label="This week's community gatherings and rhythm"
      className={`relative overflow-hidden rounded-[24px] bg-slate-900/95 border border-slate-800 shadow-2xl p-5 sm:p-7 ${className}`}
      style={{
        fontFamily: "var(--font-body, 'Inter', -apple-system, sans-serif)",
        ...style,
      }}
    >
      {/* Background Ambience / Deep Navy Gradients */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-blue-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-20 w-80 h-80 rounded-full bg-gradient-to-tr from-amber-500/10 via-rose-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* TOP RHYTHM HEADER: EYEBROW + TITLE + OFFLINE + VIEW MODE TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 relative z-10 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 select-none">
              THIS WEEK&apos;S RHYTHM • Weekly Rhythm
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          </div>
          <h2
            className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight"
            style={{
              fontFamily: "var(--font-title, 'Outfit', -apple-system, sans-serif)",
            }}
          >
            Weekly Sports &amp; Fellowship Rhythm
          </h2>
        </div>

        {/* Right Status Controls: Offline badge + Layout switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* OFFLINE INDICATOR */}
          {effectiveOffline && (
            <div
              role="status"
              aria-label="Offline status"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm"
            >
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>Offline Cache</span>
            </div>
          )}

          {/* Side-by-side vs Tabs toggle (available when 2+ gatherings exist) */}
          {items.length > 1 && (
            <div
              role="group"
              aria-label="Layout view switcher"
              className="hidden sm:inline-flex p-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-bold"
            >
              <button
                type="button"
                onClick={() => setLayoutMode('tabs')}
                className={`min-h-[36px] px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutMode === 'tabs'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-pressed={layoutMode === 'tabs'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tabs</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('side-by-side')}
                className={`min-h-[36px] px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  layoutMode === 'side-by-side'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-pressed={layoutMode === 'side-by-side'}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Side-by-Side</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RHYTHM SELECTOR TABS (WHEN IN TABS MODE OR MOBILE) */}
      {layoutMode === 'tabs' && items.length > 1 && (
        <div
          role="tablist"
          aria-label="Weekly gathering tabs"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-5 relative z-10"
        >
          {weeklyService && (
            <button
              type="button"
              role="tab"
              id="tab-weekly-service"
              aria-controls="panel-weekly-service"
              aria-selected={activeTabKey === 'service'}
              onClick={() => setActiveTabKey('service')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border shrink-0 ${
                activeTabKey === 'service'
                  ? 'bg-slate-800 text-white border-amber-400/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
              <span className="text-amber-300 font-extrabold">{getDayName(weeklyService.date)}</span>
              <span className="text-slate-500">•</span>
              <span className="truncate max-w-[150px] sm:max-w-[210px]">{weeklyService.title}</span>
            </button>
          )}

          {servantMeeting && (
            <button
              type="button"
              role="tab"
              id="tab-servant-meeting"
              aria-controls="panel-servant-meeting"
              aria-selected={activeTabKey === 'servant'}
              onClick={() => setActiveTabKey('servant')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border shrink-0 ${
                activeTabKey === 'servant'
                  ? 'bg-slate-800 text-white border-amber-400/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
              <span className="text-amber-300 font-extrabold">{getDayName(servantMeeting.date)}</span>
              <span className="text-slate-500">•</span>
              <span className="truncate max-w-[150px] sm:max-w-[210px]">{servantMeeting.title}</span>
            </button>
          )}

          {/* Any other additional gatherings */}
          {others.map((otherAct, idx) => (
            <button
              key={otherAct.id || idx}
              type="button"
              role="tab"
              id={`tab-other-${idx}`}
              aria-controls={`panel-other-${idx}`}
              aria-selected={activeTabKey === String(idx)}
              onClick={() => setActiveTabKey(String(idx))}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border shrink-0 ${
                activeTabKey === String(idx)
                  ? 'bg-slate-800 text-white border-amber-400/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span className="text-amber-300 font-extrabold">{getDayName(otherAct.date)}</span>
              <span className="truncate max-w-[150px] sm:max-w-[210px]">{otherAct.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* VIEWPORT CONTENT */}
      {layoutMode === 'side-by-side' && items.length > 1 ? (
        /* SIDE-BY-SIDE DUAL GATHERINGS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 relative z-10">
          {items.map((act, idx) => {
            if (useActivityCard) {
              return (
                <ActivityCard
                  key={act.id || idx}
                  activity={act}
                  participation={getParticipationForActivity(act, participation)}
                  currentUser={currentUser}
                  onRegister={onRegister}
                  onCancelRegistration={onCancelRegistration}
                  onCheckIn={onCheckIn}
                  onOpen={handleOpen}
                />
              );
            }
            return (
              <RhythmGatheringCard
                key={act.id || idx}
                cardKey={String(idx)}
                activity={act}
                participation={participation}
                currentUser={currentUser}
                onRegister={onRegister}
                onCancelRegistration={onCancelRegistration}
                onCheckIn={onCheckIn}
                onOpenActivity={handleOpen}
                onScanQR={onScanQR}
                isFeatured={true}
              />
            );
          })}
        </div>
      ) : (
        /* TABBED / FOCUSED VIEW WITH COMPANION STRIP */
        <div className="space-y-4 relative z-10">
          {/* Active Featured Gathering */}
          {activeGathering && (
            <div
              id={`panel-${activeTabKey}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTabKey}`}
            >
              {useActivityCard ? (
                <ActivityCard
                  activity={activeGathering}
                  participation={getParticipationForActivity(activeGathering, participation)}
                  currentUser={currentUser}
                  onRegister={onRegister}
                  onCancelRegistration={onCancelRegistration}
                  onCheckIn={onCheckIn}
                  onOpen={handleOpen}
                />
              ) : (
                <RhythmGatheringCard
                  cardKey="active"
                  activity={activeGathering}
                  participation={participation}
                  currentUser={currentUser}
                  onRegister={onRegister}
                  onCancelRegistration={onCancelRegistration}
                  onCheckIn={onCheckIn}
                  onOpenActivity={handleOpen}
                  onScanQR={onScanQR}
                  isFeatured={true}
                />
              )}
            </div>
          )}

          {/* RHYTHM COMPANION: ALSO THIS WEEK IN VBT */}
          {companionGathering && (
            <div className="pt-4 border-t border-slate-800/90">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Also This Week in VBT
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (companionGathering === weeklyService) setActiveTabKey('service');
                    else if (companionGathering === servantMeeting) setActiveTabKey('servant');
                  }}
                  className="min-h-[44px] px-2 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Switch Gathering</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                onClick={() => {
                  if (companionGathering === weeklyService) setActiveTabKey('service');
                  else if (companionGathering === servantMeeting) setActiveTabKey('servant');
                }}
                className="p-4 rounded-2xl bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0 group-hover:border-amber-400/40 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {getDayName(companionGathering.date)}
                    </span>
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h4
                      className="text-base font-bold text-white group-hover:text-amber-300 transition-colors"
                      style={{
                        fontFamily: "var(--font-title, 'Outfit', -apple-system, sans-serif)",
                      }}
                    >
                      {companionGathering.title}
                    </h4>
                    <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-0.5">
                      <span>{formatShortDate(companionGathering.date)}</span>
                      <span>•</span>
                      <span>{formatActivityTime(companionGathering.startTime, companionGathering.endTime)}</span>
                      <span>•</span>
                      <span className="text-slate-400">{getLocationName(companionGathering.location)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    <span>View Rhythm</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
