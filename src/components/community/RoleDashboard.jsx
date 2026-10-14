/* eslint-disable react-refresh/only-export-components */
import { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Plus,
  FileText,
  Settings,
  LogOut,
  User,
  WifiOff,
  ChevronRight,
  ClipboardList,
  Check,
  BookOpen,
  Activity,
  CalendarDays,
  UserCheck,
  FolderLock,
} from 'lucide-react';
import { ROLE_DASHBOARD_CONFIG, normalizeUserRole } from './roleDashboardUtils';

export { ROLE_DASHBOARD_CONFIG, normalizeUserRole };

/**
 * RoleDashboard Component
 *
 * Role-aware operational dashboard rendered after shared community content.
 *
 * STRICT PRIVACY & PERMISSION PRINCIPLE:
 * If `!currentUser` or user is a guest, returns `null` ensuring zero administrative
 * controls, service request queues, or private attendance data leak to public visitors.
 *
 * @param {Object} props
 * @param {Object|null} props.currentUser - Authenticated user object { uid, displayName, role, ... }
 * @param {Object|null} props.memberContext - Personalization data (registrations, duties, attendance, stats)
 * @param {Array} props.serviceRequests - List of incoming outreach/service requests
 * @param {Array} props.eventRegistry - Active community events & gatherings
 * @param {Function} props.onConfirmAssignment - Callback when servant confirms duty assignment
 * @param {Function} props.onApproveServiceRequest - Callback when coordinator approves a service request
 * @param {Function} props.onCreateNewEvent - Callback to launch new event creation
 * @param {Function} props.onSelectEvent - Callback when user clicks an event or roster
 * @param {Function} props.onOpenProfile - Callback to view or edit user profile/availability
 * @param {Function} props.onLogout - Callback to sign out
 * @param {boolean} props.isOffline - Network offline flag
 */
export function RoleDashboard({
  currentUser = null,
  memberContext = null,
  serviceRequests = null,
  eventRegistry = null,
  onConfirmAssignment = null,
  onApproveServiceRequest = null,
  onCreateNewEvent = null,
  onSelectEvent = null,
  onOpenProfile = null,
  onLogout = null,
  isOffline = false,
}) {
  const baseRole = currentUser ? normalizeUserRole(currentUser.role) : 'guest';
  const isGuest = !currentUser || currentUser.role === 'guest' || currentUser.isGuest || baseRole === 'guest';

  // Allow coordinators/admins to preview role perspectives if desired
  const isSuperUser = baseRole === 'admin' || baseRole === 'coordinator';
  const [activeRoleView, setActiveRoleView] = useState(baseRole);

  // Local state for missing kids follow-up notes (Team Leader view)
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpNotesList, setFollowUpNotesList] = useState([
    {
      id: 'f-1',
      memberName: 'Mark B.',
      status: 'Absent 2 weeks',
      note: 'Need to call parents regarding football scrimmage schedule.',
      date: '2026-10-06',
    },
    {
      id: 'f-2',
      memberName: 'David F.',
      status: 'Absent today',
      note: 'Family travelling out of town; returning next Friday.',
      date: '2026-10-07',
    },
  ]);

  // Local state for availability feedback
  const [availabilityNotice, setAvailabilityNotice] = useState(null);

  // Local state for audit logs modal toggle (Admin view)
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  // Local state for system settings toggle (Admin view)
  const [showSystemSettings, setShowSystemSettings] = useState(false);

  // Extract or default Member Registrations
  const myRegistrations = useMemo(() => {
    if (memberContext?.registrations && Array.isArray(memberContext.registrations)) {
      return memberContext.registrations;
    }
    if (memberContext?.myRegistrations && Array.isArray(memberContext.myRegistrations)) {
      return memberContext.myRegistrations;
    }
    return [
      {
        id: 'reg-youth-sports',
        title: 'Friday Community Sports & Fellowship',
        date: '2026-10-16',
        time: '18:30 - 21:30',
        location: 'Main Gymnasium Court',
        status: 'Registered',
      },
      {
        id: 'reg-summer-scrimmage',
        title: 'Sunday Youth Basketball Scrimmage',
        date: '2026-10-18',
        time: '16:00 - 18:00',
        location: 'Court A & B',
        status: 'Confirmed',
      },
    ];
  }, [memberContext]);

  // Attendance summary text calculation
  const attendanceSummaryText = useMemo(() => {
    if (memberContext?.attendanceSummary) {
      return memberContext.attendanceSummary;
    }
    if (memberContext?.recentAttendance && Array.isArray(memberContext.recentAttendance)) {
      const total = memberContext.recentAttendance.length;
      const present = memberContext.recentAttendance.filter(
        (a) => a.status === 'present' || a.checkedIn
      ).length;
      if (total > 0) {
        return `Attended ${present} of last ${total} services`;
      }
    }
    return 'Attended 4 of last 5 services';
  }, [memberContext]);

  // Active serving applications
  const activeApplications = useMemo(() => {
    if (memberContext?.pendingApplications && Array.isArray(memberContext.pendingApplications)) {
      if (memberContext.pendingApplications.length > 0) {
        return memberContext.pendingApplications;
      }
    }
    if (memberContext?.servingApplications && Array.isArray(memberContext.servingApplications)) {
      if (memberContext.servingApplications.length > 0) {
        return memberContext.servingApplications;
      }
    }
    return [
      {
        id: 'app-station-leader',
        roleTitle: 'Station Leader',
        status: 'Pending review',
        submittedAt: '2026-10-04',
        track: 'Sports Court Logistics',
      },
    ];
  }, [memberContext]);

  // Assigned Serving Duties (Servant view)
  const assignedDuties = useMemo(() => {
    if (memberContext?.assignedDuties && Array.isArray(memberContext.assignedDuties)) {
      if (memberContext.assignedDuties.length > 0) {
        return memberContext.assignedDuties;
      }
    }
    if (memberContext?.assignments && Array.isArray(memberContext.assignments)) {
      if (memberContext.assignments.length > 0) {
        return memberContext.assignments;
      }
    }
    return [
      {
        id: 'duty-referee-court-a',
        role: 'Court A Referee',
        activity: 'Friday Youth Sports Gathering',
        time: '18:00 - 20:30',
        location: 'Upper Court & Gymnasium',
        status: 'pending_confirmation',
        briefingUrl: '#briefing',
      },
      {
        id: 'duty-welcomer',
        role: 'Station Welcomer',
        activity: 'Sunday Community Fellowship',
        time: '10:00 - 12:30',
        location: 'Main Sanctuary Entrance',
        status: 'confirmed',
        briefingUrl: '#briefing',
      },
    ];
  }, [memberContext]);

  // Team Overview (Leader view)
  const teamOverview = useMemo(() => {
    return {
      name: memberContext?.team?.name || currentUser?.team || 'Team Blue 3',
      division: memberContext?.team?.division || 'Junior Youth Division (Ages 10-13)',
      presentCount: memberContext?.team?.presentCount ?? 8,
      totalCount: memberContext?.team?.totalCount ?? 10,
    };
  }, [memberContext, currentUser]);

  // Outreach Service Requests (Coordinator view)
  const requestsList = useMemo(() => {
    if (serviceRequests && Array.isArray(serviceRequests)) {
      return serviceRequests;
    }
    return [
      {
        id: 'req-outreach-1',
        title: 'Community Food Drive & Sports Clinic',
        requesterName: 'St. Mary Youth Outreach',
        type: 'Court Equipment & Logistics',
        date: '2026-10-20',
        status: 'pending',
        description: 'Needs 4 volunteer station referees and court safety supervisor.',
      },
      {
        id: 'req-outreach-2',
        title: 'Middle School Tournament Setup',
        requesterName: 'Fellowship Athletics Team',
        type: 'Sound & First Aid Support',
        date: '2026-10-24',
        status: 'pending',
        description: 'Requesting certified CPR servant and referee whistle pack.',
      },
    ];
  }, [serviceRequests]);

  // Active Events (Coordinator/Admin view)
  const activeEvents = useMemo(() => {
    if (eventRegistry && Array.isArray(eventRegistry)) {
      const filtered = eventRegistry.filter((e) => e.active !== false && !e.expired);
      if (filtered.length > 0) return filtered;
    }
    return [
      {
        code: 'friday-fellowship',
        name: 'Friday Community Sports & Fellowship',
        date: '2026-10-16',
        location: 'Main Gymnasium Court',
        registeredCount: 42,
        capacity: 60,
      },
      {
        code: 'july6',
        name: 'Setup July 6th Service',
        date: '2026-07-06',
        location: 'Sanctuary & Sports Complex',
        registeredCount: 88,
        capacity: 120,
      },
    ];
  }, [eventRegistry]);

  // Global Community Health Metrics (Admin view)
  const adminStats = useMemo(() => {
    const totalMembers = memberContext?.stats?.totalMembers ?? 148;
    const activeEventsCount = activeEvents.length;
    const pendingRequestsCount = requestsList.filter((r) => r.status === 'pending').length;
    return {
      totalMembers,
      activeEventsCount,
      pendingRequestsCount,
      healthStatus: 'Excellent (98% Active Engagement)',
    };
  }, [memberContext, activeEvents, requestsList]);

  // STRICT PRIVACY CHECK: If visitor is unauthenticated or guest, render nothing.
  if (isGuest) {
    return null;
  }

  // Fallback to baseRole if activeRoleView was modified externally
  const effectiveRole = activeRoleView || baseRole;
  const config = ROLE_DASHBOARD_CONFIG[effectiveRole] || ROLE_DASHBOARD_CONFIG.member;
  const RoleIcon = config.icon || Shield;

  // Display name extraction
  const displayName =
    currentUser.displayName ||
    currentUser.name ||
    (currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null) ||
    'Community Member';

  // Onboarding Count (Coordinator view)
  const onboardingCount = memberContext?.onboardingCount ?? 14;

  // Handler for adding follow-up notes (Team Leader view)
  const handleAddFollowUpNote = (e) => {
    e.preventDefault();
    if (!followUpNote.trim()) return;
    const newEntry = {
      id: `f-${Date.now()}`,
      memberName: 'Follow-Up Follower',
      status: 'Note Added',
      note: followUpNote.trim(),
      date: new Date().toISOString().split('T')[0],
    };
    setFollowUpNotesList([newEntry, ...followUpNotesList]);
    setFollowUpNote('');
  };

  return (
    <section
      role="region"
      aria-label="Role-aware operations dashboard"
      className="w-full my-8 p-4 sm:p-6 lg:p-8 rounded-3xl bg-slate-950/90 border border-slate-800/80 shadow-2xl backdrop-blur-md transition-all text-slate-100"
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & IDENTITY BAR */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl ${config.bg} border ${config.border} flex items-center justify-center ${config.color} shadow-lg shrink-0`}
          >
            <RoleIcon className="w-6 h-6" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                Operations Console
              </h2>
              {/* Role Badge with High Contrast */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.color} border ${config.border}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <span>{config.label}</span>
              </span>

              {/* Offline indicator */}
              {isOffline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline Mode</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              Welcome back, <strong className="text-slate-200">{displayName}</strong> &bull;{' '}
              {config.badgeText}
            </p>
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Profile Action */}
          {onOpenProfile && (
            <button
              type="button"
              onClick={() => onOpenProfile()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all hover:border-slate-500"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Profile</span>
            </button>
          )}

          {/* Logout Action */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}

          {/* Perspective switcher for Admins & Coordinators */}
          {isSuperUser && (
            <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-0.5 text-xs">
              <span className="px-2 text-[10px] uppercase font-bold text-slate-500 hidden sm:inline">
                View:
              </span>
              {['admin', 'coordinator', 'leader', 'servant', 'member'].map((roleKey) => (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setActiveRoleView(roleKey)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    effectiveRole === roleKey
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {roleKey}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Offline Alert Bar */}
      {isOffline && (
        <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-3 text-xs text-amber-200">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You are currently working in <strong>offline mode</strong>. Operational tools are displaying
            cached local state. Status changes will synchronize automatically when connection is restored.
          </span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. ROLE-SPECIFIC TOOLS VIEWPORT */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="mt-6">
        {/* ============================================================ */}
        {/* ROLE A: MEMBER TOOLS */}
        {/* ============================================================ */}
        {effectiveRole === 'member' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Attendance Summary */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <h3 className="text-sm font-bold text-white">Attendance Summary</h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                    Faithful Presence
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {attendanceSummaryText}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Consistent attendance builds spiritual fellowship and strengthens teammates.
                  </p>

                  {/* Attendance visual ratio bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-blue-500 h-2.5 rounded-full"
                      style={{ width: '80%' }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Target: 80%+ consistency</span>
                    <span className="text-sky-300 font-bold">80% Achieved</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Active Serving Applications & Availability */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-bold text-white">Active Serving Applications</h3>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Discovery
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {activeApplications.map((app) => (
                      <div
                        key={app.id || app.roleTitle}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {`${app.roleTitle}: ${app.status || 'Pending review'}`}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {app.track || 'Camp Ministry Pathway'}
                          </div>
                        </div>
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {app.status || 'Pending review'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* "Update My Availability" Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenProfile) {
                        onOpenProfile('availability');
                      } else {
                        setAvailabilityNotice('Availability updated for the current cycle.');
                        setTimeout(() => setAvailabilityNotice(null), 3000);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Update My Availability</span>
                  </button>
                  {availabilityNotice && (
                    <div className="mt-2 text-center text-[11px] text-emerald-400 font-semibold animate-pulse">
                      {availabilityNotice}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* My Registrations Section */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-bold text-white">My Registrations</h3>
                </div>
                <span className="text-xs text-slate-400">
                  {myRegistrations.length} Upcoming Gathering{myRegistrations.length === 1 ? '' : 's'}
                </span>
              </div>

              {myRegistrations.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No upcoming registrations found. Browse the weekly rhythm to register!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {myRegistrations.map((reg) => (
                    <div
                      key={reg.id || reg.title}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{reg.title}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            {reg.status || 'Registered'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-sky-400" />
                            <span>{reg.date} &bull; {reg.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate">{reg.location}</span>
                          </div>
                        </div>
                      </div>

                      {onSelectEvent && (
                        <button
                          type="button"
                          onClick={() => onSelectEvent(reg)}
                          className="self-end text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                        >
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ROLE B: SERVANT TOOLS */}
        {/* ============================================================ */}
        {effectiveRole === 'servant' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Upcoming Assigned Serving Duties
                    </h3>
                    <p className="text-xs text-slate-400">
                      Confirm assignments and review station briefing materials before gathering.
                    </p>
                  </div>
                </div>

                {/* Servant Briefing Link */}
                <button
                  type="button"
                  onClick={() =>
                    onSelectEvent ? onSelectEvent({ type: 'briefing' }) : null
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Servant Briefing</span>
                </button>
              </div>

              {/* Assigned duties list */}
              <div className="mt-4 space-y-3">
                {assignedDuties.map((duty) => {
                  const isConfirmed = duty.status === 'confirmed';
                  const isPending =
                    duty.status === 'pending_confirmation' || duty.status === 'pending';

                  return (
                    <div
                      key={duty.id || duty.role}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-extrabold text-white">
                            {duty.role}
                          </span>
                          <span className="text-xs text-slate-400">&bull;</span>
                          <span className="text-xs font-semibold text-cyan-300">
                            {duty.activity}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{duty.time}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{duty.location}</span>
                          </span>
                        </div>
                      </div>

                      {/* Confirmation state controls */}
                      <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => onConfirmAssignment && onConfirmAssignment(duty.id || duty)}
                            className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Assignment</span>
                          </button>
                        )}

                        {isConfirmed && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Confirmed</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            onSelectEvent ? onSelectEvent({ ...duty, type: 'briefing' }) : null
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
                        >
                          Briefing Link
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ROLE C: TEAM LEADER / LEADER TOOLS */}
        {/* ============================================================ */}
        {effectiveRole === 'leader' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team Overview Card */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">Assigned Team Overview</h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Active Shepherd
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-2xl font-black text-white">{teamOverview.name}</div>
                  <div className="text-xs text-slate-400">{teamOverview.division}</div>

                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        Live Attendance
                      </div>
                      <div className="text-lg font-black text-blue-300">
                        {`${teamOverview.presentCount}/${teamOverview.totalCount} kids present`}
                      </div>
                    </div>

                    {/* Roster Check-In Link */}
                    <button
                      type="button"
                      onClick={() => (onSelectEvent ? onSelectEvent('roster') : null)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-950/40"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Roster Check-In</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Missing Kids Follow-Up Notes */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">
                        Missing Kids Follow-Up Notes
                      </h3>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      Care Signals
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {followUpNotesList.map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-white">{f.memberName}</strong>
                          <span className="text-[10px] text-rose-300 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/50">
                            {f.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{f.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Follow-Up Note Form */}
                <form onSubmit={handleAddFollowUpNote} className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      placeholder="Add missing kid pastoral check-in note..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={!followUpNote.trim()}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0"
                    >
                      Save Note
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ROLE D: COORDINATOR / SERVICE LEADER TOOLS */}
        {/* ============================================================ */}
        {effectiveRole === 'coordinator' && (
          <div className="space-y-6">
            {/* Action Bar: Create Service Day & Member Onboarding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                <div>
                  <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">
                    Member Onboarding
                  </div>
                  <div className="text-xl font-black text-white mt-0.5">
                    {`${onboardingCount} members in onboarding`}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Volunteers in progress with safety & foundations.
                  </p>
                </div>
                <Users className="w-8 h-8 text-amber-400 opacity-80 shrink-0" />
              </div>

              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">
                    Outreach Queue
                  </div>
                  <div className="text-xl font-black text-white mt-0.5">
                    {requestsList.filter((r) => r.status === 'pending').length} Pending Requests
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Community partnerships & sports service requests.
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-400 opacity-80 shrink-0" />
              </div>

              {/* Action Button: Create New Service Day */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-center gap-2 sm:col-span-2 lg:col-span-1">
                <button
                  type="button"
                  onClick={() => (onCreateNewEvent ? onCreateNewEvent('service_day') : null)}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-950/50"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Service Day</span>
                </button>
              </div>
            </div>

            {/* Incoming Outreach Service Requests */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Incoming Outreach Service Requests
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {requestsList.length} Total Requests
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {requestsList.map((req) => (
                  <div
                    key={req.id || req.title}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{req.title || req.type}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        From: <strong className="text-white">{req.requesterName}</strong> &bull; Date:{' '}
                        {req.date}
                      </p>
                      {req.description && (
                        <p className="text-[11px] text-slate-400">{req.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
                      <button
                        type="button"
                        onClick={() =>
                          onApproveServiceRequest && onApproveServiceRequest(req.id || req)
                        }
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Request</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Services Quick-Access */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white">Active Services Quick-Access</h3>
                </div>
                <span className="text-xs text-slate-400">
                  {activeEvents.length} Active Events
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {activeEvents.map((ev) => (
                  <button
                    key={ev.code || ev.name}
                    type="button"
                    onClick={() => onSelectEvent && onSelectEvent(ev)}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition-all text-left group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                        {ev.name || ev.code}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{ev.date}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ROLE E: ADMIN TOOLS */}
        {/* ============================================================ */}
        {effectiveRole === 'admin' && (
          <div className="space-y-6">
            {/* Global Community Health Cards */}
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>Global Community Health</span>
                </h3>
                <span className="text-xs text-rose-300 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                  {adminStats.healthStatus}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Active Members
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {adminStats.totalMembers}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    +12 joined this month
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Active Events
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {adminStats.activeEventsCount}
                  </div>
                  <div className="text-[11px] text-sky-400 font-semibold mt-1">
                    Next service: July 6th
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pending Requests
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {adminStats.pendingRequestsCount}
                  </div>
                  <div className="text-[11px] text-amber-400 font-semibold mt-1">
                    Requires leadership action
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                <span>Executive Operations & Event Setup</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* "+ Create New Event" Button */}
                <button
                  type="button"
                  onClick={() => (onCreateNewEvent ? onCreateNewEvent() : null)}
                  className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-950/50"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Event</span>
                </button>

                {/* "Setup July 6th Service" Preset Button */}
                <button
                  type="button"
                  onClick={() =>
                    onCreateNewEvent
                      ? onCreateNewEvent({
                          title: 'July 6th Service',
                          code: 'july6',
                          date: '2026-07-06',
                        })
                      : null
                  }
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <span>Setup July 6th Service</span>
                </button>

                {/* "Audit Logs" Link Button */}
                <button
                  type="button"
                  onClick={() => setShowAuditLogs(!showAuditLogs)}
                  className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Audit Logs</span>
                </button>

                {/* "System Settings" Link Button */}
                <button
                  type="button"
                  onClick={() => setShowSystemSettings(!showSystemSettings)}
                  className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>System Settings</span>
                </button>
              </div>

              {/* Collapsible Audit Logs View */}
              {showAuditLogs && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <FolderLock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Security & Role Audit Trail</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAuditLogs(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1.5 pt-1">
                    <div>&bull; 2026-10-07 14:22: Role 'servant' confirmed by Mina Shenouda.</div>
                    <div>&bull; 2026-10-06 18:30: July 6th Service roster parameters published.</div>
                    <div>&bull; 2026-10-05 09:12: New outreach request approved by Lead Coordinator.</div>
                  </div>
                </div>
              )}

              {/* Collapsible System Settings View */}
              {showSystemSettings && (
                <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-rose-400" />
                      <span>Community System Parameters</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSystemSettings(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1.5 pt-1">
                    <div>&bull; Security Scope: Privacy & Youth Protection Active.</div>
                    <div>&bull; Offline Sync: Auto-push queue on reconnect enabled.</div>
                    <div>&bull; Community ID: vbt_main &bull; Version: 2026.10</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default RoleDashboard;
