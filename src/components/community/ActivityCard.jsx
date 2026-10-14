import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  CheckCircle2,
  XCircle,
  Zap,
  Check,
  Users,
  Radio,
  CheckCheck,
  AlertTriangle,
  CalendarX,
  CalendarPlus,
  WifiOff,
  Download,
  ExternalLink,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  HandHeart,
  Activity,
  Trophy,
  Church,
  Dumbbell,
  HeartHandshake,
  FileText,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import {
  CARD_STATES,
  getTypeBadgeConfig,
  resolveActivityState,
  formatActivityDate,
  formatActivityTime,
  formatRegistrationDate,
  formatCheckInTime,
  downloadIcsFile,
  getGoogleCalendarUrl,
} from './activityCardUtils';

/**
 * Icon resolver mapping for activity types
 */
const TYPE_ICONS = {
  weekly_service: Church,
  servant_meeting: Users,
  practice: Dumbbell,
  tournament: Trophy,
  outreach: HeartHandshake,
  other: Calendar,
};

/**
 * Interactive Add To Calendar Helper Component
 */
function AddToCalendarButton({ activity, compact = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

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
        aria-label="Add activity to calendar"
        className={`min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 hover:text-white border border-slate-700/80 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm ${
          compact ? 'px-2.5 py-1.5' : ''
        }`}
      >
        <CalendarPlus className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>Add to Calendar</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Calendar options"
          className="absolute right-0 bottom-full sm:bottom-auto sm:top-full mt-2 mb-2 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              downloadIcsFile(activity);
              setOpen(false);
            }}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Apple / Outlook (.ics)</span>
          </button>
          <a
            role="menuitem"
            href={getGoogleCalendarUrl(activity)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-xl hover:bg-slate-800 text-left text-xs sm:text-sm font-semibold text-slate-200 hover:text-white flex items-center gap-2.5 transition-colors"
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
 * Universal Activity Card Component
 * Contract:
 * <ActivityCard
 *   activity={activity}
 *   participation={participation}
 *   currentUser={currentUser}
 *   onRegister={onRegister}
 *   onCancelRegistration={onCancelRegistration}
 *   onCheckIn={onCheckIn}
 *   onOpen={onOpen}
 *   compact={false}
 * />
 */
export default function ActivityCard({
  activity,
  participation,
  currentUser,
  onRegister,
  onCancelRegistration,
  onCheckIn,
  onOpen,
  onOpenMeetingMode,
  compact = false,
  state: explicitStateProp,
}) {
  const currentState = useMemo(() => {
    return resolveActivityState(activity, participation, explicitStateProp);
  }, [activity, participation, explicitStateProp]);

  const typeConfig = useMemo(() => {
    return getTypeBadgeConfig(activity?.type);
  }, [activity?.type]);

  const TypeIcon = TYPE_ICONS[typeConfig.typeKey] || Calendar;

  const handleCardClick = useCallback(
    (e) => {
      // Don't trigger if clicked on interactive controls
      if (e.target.closest('button') || e.target.closest('a')) {
        return;
      }
      if (typeof onOpen === 'function') {
        onOpen(activity, currentState);
      }
    },
    [onOpen, activity, currentState]
  );

  // 1. LOADING STATE (Skeleton shimmer loader card)
  if (currentState === CARD_STATES.LOADING) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading activity schedule..."
        className={`relative overflow-hidden rounded-[18px] bg-slate-900/90 border border-slate-800 shadow-xl ${
          compact ? 'p-4' : 'p-5 sm:p-6'
        }`}
      >
        <span className="sr-only">Loading activity card...</span>
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 rounded-full bg-slate-800 animate-pulse" />
          <div className="h-5 w-20 rounded-md bg-slate-800 animate-pulse" />
        </div>
        <div className="space-y-3 mb-6">
          <div className="h-7 w-3/4 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-5 w-1/2 rounded-lg bg-slate-800/80 animate-pulse" />
          <div className="h-5 w-2/3 rounded-lg bg-slate-800/80 animate-pulse" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-11 w-32 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-11 w-36 rounded-xl bg-slate-800/60 animate-pulse" />
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (currentState === CARD_STATES.EMPTY) {
    return (
      <div
        className={`relative overflow-hidden rounded-[18px] bg-slate-900/95 border border-slate-800/90 shadow-xl text-center flex flex-col items-center justify-center ${
          compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-inner">
          <CalendarX className="w-7 h-7" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Scheduled Activity</h3>
        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6 font-medium">
          No activity published for this week yet. Check back soon or ask a VBT coordinator.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof onOpen === 'function') onOpen(null, 'empty');
          }}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 transition-all shadow-md"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          <span>Ask a Coordinator / Refresh</span>
        </button>
      </div>
    );
  }

  // Format activity details
  const displayTitle = activity?.title || 'Community Gathering';
  const displayDate = formatActivityDate(activity?.date);
  const displayTime = formatActivityTime(activity?.startTime, activity?.endTime);
  const displayLocation =
    typeof activity?.location === 'object' && activity?.location !== null
      ? activity.location.name || activity.location.address || 'Main Sanctuary & Gym Court'
      : activity?.location || 'Main Sanctuary & Gym Court';
  const displayDescription = activity?.description || '';

  // Determine card base container styling based on current state
  const isAttendanceOpen = currentState === CARD_STATES.ATTENDANCE_OPEN;
  const isCompleted = currentState === CARD_STATES.COMPLETED;
  const isCancelled = currentState === CARD_STATES.CANCELLED;
  const isInProgress = currentState === CARD_STATES.IN_PROGRESS;
  const isCheckedIn = currentState === CARD_STATES.CHECKED_IN;

  let containerBorderGlow = 'border-slate-800 hover:border-slate-700';
  let containerBg = 'bg-slate-900/95';

  if (isAttendanceOpen) {
    containerBorderGlow = 'border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)]';
    containerBg = 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40';
  } else if (isInProgress) {
    containerBorderGlow = 'border-2 border-emerald-500/80 shadow-[0_0_26px_rgba(16,185,129,0.25)]';
    containerBg = 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30';
  } else if (isCheckedIn) {
    containerBorderGlow = 'border border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.15)]';
    containerBg = 'bg-slate-900/95';
  } else if (isCancelled) {
    containerBorderGlow = 'border border-rose-500/40';
    containerBg = 'bg-slate-900/90';
  } else if (isCompleted) {
    containerBorderGlow = 'border border-slate-800/80';
    containerBg = 'bg-slate-900/60 opacity-90';
  }

  // Contextual registration info
  const registeredDateStr = formatRegistrationDate(
    participation?.registeredAt || participation?.date || activity?.date
  );
  const checkedInTimeStr = formatCheckInTime(
    participation?.checkedInAt || participation?.checkInTime
  );

  return (
    <div
      onClick={handleCardClick}
      className={`relative overflow-hidden rounded-[18px] ${containerBg} ${containerBorderGlow} transition-all duration-200 cursor-pointer ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      {/* OFFLINE BANNER (if state is offline or activity is flagged cached) */}
      {(currentState === CARD_STATES.OFFLINE || activity?.isOffline) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold mb-4">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Working offline — showing cached schedule. Changes will sync when reconnected.</span>
        </div>
      )}

      {/* IN PROGRESS / LIVE TOP BANNER */}
      {isInProgress && (
        <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs sm:text-sm font-semibold mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span>Live Session in Progress</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-extrabold text-[11px]">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>🔴 Live Now</span>
          </div>
        </div>
      )}

      {/* HEADER: BADGES ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Type Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}
          >
            <TypeIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{typeConfig.label}</span>
          </span>

          {/* Explicit State Badges */}
          {currentState === CARD_STATES.REGISTERED && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Registered</span>
            </span>
          )}

          {currentState === CARD_STATES.ATTENDANCE_OPEN && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 border border-amber-300 shadow-md animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Check-In Open</span>
            </span>
          )}

          {currentState === CARD_STATES.CHECKED_IN && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3] shrink-0" />
              <span>✓ Checked In</span>
            </span>
          )}

          {currentState === CARD_STATES.SERVING_NEEDED && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
              <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>🤝 Servants Needed</span>
            </span>
          )}

          {currentState === CARD_STATES.COMPLETED && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              <CheckCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Completed</span>
            </span>
          )}

          {currentState === CARD_STATES.CANCELLED && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Cancelled</span>
            </span>
          )}

          {currentState === CARD_STATES.OFFLINE && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
              <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Cached</span>
            </span>
          )}
        </div>

        {/* Pass Active Badge for Checked-In Members */}
        {currentState === CARD_STATES.CHECKED_IN && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/35 text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Pass active</span>
          </div>
        )}
      </div>

      {/* ACTIVITY TITLE */}
      <h3
        className={`font-black text-white tracking-tight ${
          isCancelled ? 'line-through text-slate-400' : ''
        } ${compact ? 'text-base sm:text-lg mb-2' : 'text-lg sm:text-xl md:text-2xl mb-2.5'}`}
      >
        {displayTitle}
      </h3>

      {/* CANCELLED STATE NOTICE */}
      {isCancelled && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-200 text-xs sm:text-sm flex items-start gap-2.5 my-3 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Cancellation Reason:</strong>{' '}
            {activity?.cancellationReason ||
              activity?.reason ||
              'This scheduled activity was cancelled due to program adjustment.'}
          </div>
        </div>
      )}

      {/* SCHEDULE & LOCATION METADATA (HIGH OUTDOOR CONTRAST) */}
      <div className="space-y-1.5 mb-4 text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-2 text-slate-200">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold text-white">{displayDate}</span>
          <span className="text-slate-400">•</span>
          <span className="text-cyan-300 font-semibold">{displayTime}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="line-clamp-1">{displayLocation}</span>
        </div>
      </div>

      {/* OPTIONAL DESCRIPTION */}
      {displayDescription && !compact && !isCancelled && (
        <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 mb-4 leading-relaxed font-normal">
          {displayDescription}
        </p>
      )}

      {/* STATE-SPECIFIC CONTEXT INFORMATION */}
      {currentState === CARD_STATES.REGISTERED && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-200 mb-4 bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl font-medium">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Registered on {registeredDateStr}</span>
        </div>
      )}

      {currentState === CARD_STATES.CHECKED_IN && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-200 mb-4 bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl font-medium">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Checked in at {checkedInTimeStr}</span>
        </div>
      )}

      {currentState === CARD_STATES.SERVING_NEEDED && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm mb-4 space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{`${activity?.openRolesCount || activity?.servantsNeeded || 3} Servant Spots Open`}</span>
          </div>
          {Array.isArray(activity?.openRoles) && activity.openRoles.length > 0 && (
            <p className="text-slate-300 text-xs">
              Open spots: {activity.openRoles.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ACTIONS & BUTTONS ROW (ALL BUTTONS >=44PX TOUCH TARGET) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* UPCOMING STATE: REGISTER BUTTON */}
          {currentState === CARD_STATES.UPCOMING && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onRegister === 'function') onRegister(activity);
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-900/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Register</span>
            </button>
          )}

          {/* ATTENDANCE OPEN: PROMINENT GLOWING CHECK-IN BUTTON */}
          {currentState === CARD_STATES.ATTENDANCE_OPEN && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onCheckIn === 'function') onCheckIn(activity);
              }}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 active:scale-[0.98] text-slate-950 font-black text-sm sm:text-base shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <Zap className="w-5 h-5 fill-current shrink-0" />
              <span>⚡ Check In Now</span>
            </button>
          )}

          {/* IN PROGRESS: ENTER ACTIVITY / LIVE SCOREBOARD BUTTON */}
          {currentState === CARD_STATES.IN_PROGRESS && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpen === 'function') onOpen(activity, 'live');
              }}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <Activity className="w-5 h-5 shrink-0" />
              <span>Enter Activity / Live Scoreboard</span>
            </button>
          )}

          {/* SERVING NEEDED: I CAN SERVE BUTTON */}
          {currentState === CARD_STATES.SERVING_NEEDED && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpen === 'function') {
                  onOpen(activity, 'serve');
                } else if (typeof onRegister === 'function') {
                  onRegister(activity);
                }
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-900/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <HandHeart className="w-4 h-4 shrink-0" />
              <span>I can serve</span>
            </button>
          )}

          {/* REGISTERED STATE: CANCEL REGISTRATION BUTTON */}
          {currentState === CARD_STATES.REGISTERED && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onCancelRegistration === 'function') {
                  onCancelRegistration(activity, participation);
                }
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all"
            >
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Cancel registration</span>
            </button>
          )}

          {/* COMPLETED STATE: VIEW RECAP / SCORES */}
          {currentState === CARD_STATES.COMPLETED && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpen === 'function') onOpen(activity, 'recap');
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>View Recap / Scores</span>
            </button>
          )}

          {/* CHECKED IN: VIEW PASS / REFRESH DETAILS */}
          {currentState === CARD_STATES.CHECKED_IN && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpen === 'function') onOpen(activity, 'pass');
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>View Pass</span>
            </button>
          )}

          {/* SERVANT MEETING MODE ACTION (REUSABLE MODE) */}
          {typeConfig.typeKey === 'servant_meeting' && !isCancelled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (typeof onOpenMeetingMode === 'function') {
                  onOpenMeetingMode(activity);
                } else if (typeof onOpen === 'function') {
                  onOpen(activity, 'meeting_mode');
                }
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 active:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm w-full sm:w-auto"
            >
              <Users className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Meeting Mode</span>
            </button>
          )}
        </div>

        {/* CALENDAR HELPER & DETAILS LINK */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Add to Calendar helper is included on upcoming, registered, attendance_open, serving_needed, offline */}
          {[
            CARD_STATES.UPCOMING,
            CARD_STATES.REGISTERED,
            CARD_STATES.ATTENDANCE_OPEN,
            CARD_STATES.SERVING_NEEDED,
            CARD_STATES.OFFLINE,
          ].includes(currentState) && (
            <AddToCalendarButton activity={activity} compact={compact} />
          )}

          {/* Open Details Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onOpen === 'function') onOpen(activity, currentState);
            }}
            aria-label={`View details for ${displayTitle}${currentUser?.displayName ? ` (User: ${currentUser.displayName})` : ''}`}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Details</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
