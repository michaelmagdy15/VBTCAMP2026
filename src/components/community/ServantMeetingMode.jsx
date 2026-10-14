import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  Circle,
  AlertTriangle,
  FileText,
  Download,
  Users,
  UserCheck,
  Send,
  Star,
  ChevronRight,
  ArrowLeft,
  Flame,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  Sparkles,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ThumbsUp,
  Heart,
  Award,
  Bell,
  Check,
  X,
  Volume2,
  CalendarCheck,
  Layers,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  MEETING_MODES,
  isLeaderRole,
  VBT_ROLES,
} from '../../contracts/communityContracts';
import {
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
  subscribeToMeetingSession,
  createDefaultMeetingSession,
} from '../../services/servantMeetingModeService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';
import { downloadIcsFile, getGoogleCalendarUrl } from './activityCardUtils';

/**
 * Format minutes into "X hrs Y mins" or "X mins"
 */
export function formatMinutes(mins) {
  if (!mins || isNaN(mins)) return '0 mins';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} mins`;
}

/**
 * Calculate countdown string to target date & time
 */
export function getCountdownToDate(targetDateStr, targetTimeStr = '18:00') {
  if (!targetDateStr) return 'Scheduled soon';
  const target = new Date(`${targetDateStr}T${targetTimeStr}:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (isNaN(diffMs)) return targetDateStr;
  if (diffMs <= 0) return 'Happening today / in session';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

/**
 * Servant Meeting Mode Component
 */
export default function ServantMeetingMode({
  isOpen = true,
  serviceId = 'svc_servant_meeting_weekly',
  communityId = DEFAULT_COMMUNITY_ID,
  currentUser = {
    id: 'usr_servant_current',
    displayName: 'Servant Leader',
    role: VBT_ROLES.ACTIVE_SERVANT,
  },
  activity = null,
  onClose = null,
  initialPhase = null,
}) {
  if (isOpen === false) return null;

  const isLeader = useMemo(() => isLeaderRole(currentUser?.role), [currentUser?.role]);

  // Session & Phase state
  const [session, setSession] = useState(() =>
    createDefaultMeetingSession(communityId, serviceId, activity || {})
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialPhase || MEETING_MODES.BEFORE);

  // Live Attendance
  const [attendance, setAttendance] = useState({
    total: 0,
    present: 0,
    late: 0,
    excused: 0,
    attendees: [],
    qrActive: true,
  });
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInSuccessMsg, setCheckInSuccessMsg] = useState('');

  // Interactive Modals / Drawers
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showNewActionModal, setShowNewActionModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Form states
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [newActionNotes, setNewActionNotes] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastPriority, setBroadcastPriority] = useState('high');

  // Pulse Polls state
  const [selectedPollAnswers, setSelectedPollAnswers] = useState({});
  const [submittingPollId, setSubmittingPollId] = useState(null);

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackPositives, setFeedbackPositives] = useState('');
  const [feedbackImprovements, setFeedbackImprovements] = useState('');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Prayer support clicks
  const [prayerLikes, setPrayerLikes] = useState({});

  // Role Confirmation feedback
  const [confirmingRoleId, setConfirmingRoleId] = useState(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState('');

  // Show temporary toast message helper
  const showNotice = useCallback((msg) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(''), 3500);
  }, []);

  // 1. Subscribe to meeting session updates
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToMeetingSession(communityId, serviceId, (data) => {
      if (data) {
        setSession(data);
        if (!initialPhase && data.phase) {
          setActiveTab(data.phase);
        }
      }
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [communityId, serviceId, initialPhase]);

  // 2. Fetch live attendance stats periodically
  const fetchAttendance = useCallback(async () => {
    try {
      const stats = await getLiveAttendanceStats(communityId, serviceId);
      setAttendance(stats);
      if (currentUser?.id && stats.attendees) {
        const found = stats.attendees.some(
          (a) => a.id === currentUser.id || a.memberId === currentUser.id
        );
        setIsCheckedIn(found);
      }
    } catch (e) {
      console.error('Error fetching attendance in ServantMeetingMode:', e);
    }
  }, [communityId, serviceId, currentUser?.id]);

  useEffect(() => {
    fetchAttendance();
    const timer = setInterval(fetchAttendance, 15000);
    return () => clearInterval(timer);
  }, [fetchAttendance]);

  // Total agenda minutes
  const totalAgendaMinutes = useMemo(() => {
    return (session?.agenda || []).reduce((acc, item) => acc + (item.estimatedMinutes || 0), 0);
  }, [session?.agenda]);

  // Completed agenda count
  const completedAgendaCount = useMemo(() => {
    return (session?.agenda || []).filter((item) => item.completed).length;
  }, [session?.agenda]);

  // Phase transition handler
  const handlePhaseChange = async (targetPhase) => {
    if (isLeader) {
      try {
        await updateMeetingPhase(communityId, serviceId, targetPhase, currentUser);
        showNotice(`Meeting phase transitioned to ${targetPhase.toUpperCase()}`);
      } catch (err) {
        console.error('Failed to update phase in cloud:', err);
      }
    }
    setActiveTab(targetPhase);
  };

  // Quick Self Check-in
  const handleQuickCheckIn = async () => {
    if (isCheckedIn || checkingIn) return;
    setCheckingIn(true);
    try {
      await quickSelfCheckIn(communityId, serviceId, currentUser);
      setIsCheckedIn(true);
      setCheckInSuccessMsg('Check-in confirmed! Welcome to the servant huddle.');
      await fetchAttendance();
      showNotice('Attendance verified via Quick Check-in');
    } catch (err) {
      console.error('Check-in failed:', err);
      setCheckInSuccessMsg('Self check-in recorded locally.');
      setIsCheckedIn(true);
    } finally {
      setCheckingIn(false);
    }
  };

  // Toggle agenda item
  const handleToggleAgenda = async (item) => {
    const nextCompleted = !item.completed;
    try {
      const updated = await updateAgendaItemProgress(
        communityId,
        serviceId,
        item.id,
        nextCompleted,
        currentUser
      );
      setSession((prev) => ({ ...prev, agenda: updated }));
      showNotice(`Agenda item marked as ${nextCompleted ? 'completed' : 'pending'}`);
    } catch (err) {
      console.error('Failed to toggle agenda progress:', err);
    }
  };

  // Submit Poll answer
  const handleSubmitPoll = async (pollId) => {
    const answer = selectedPollAnswers[pollId];
    if (!answer) return;

    setSubmittingPollId(pollId);
    try {
      const res = await submitPollResponse(
        communityId,
        serviceId,
        pollId,
        currentUser.id,
        answer
      );
      setSession((prev) => ({
        ...prev,
        polls: prev.polls.map((p) => (p.id === pollId ? res.poll : p)),
      }));
      showNotice('Pulse response recorded! Thanks for speaking up.');
    } catch (err) {
      console.error('Failed to submit poll answer:', err);
    } finally {
      setSubmittingPollId(null);
    }
  };

  // Confirm Open Serving Role
  const handleConfirmRole = async (roleId) => {
    setConfirmingRoleId(roleId);
    try {
      const updatedRoles = await confirmServingRole(
        communityId,
        serviceId,
        roleId,
        currentUser,
        currentUser
      );
      setSession((prev) => ({ ...prev, openServingRoles: updatedRoles }));
      showNotice('Serving spot confirmed! See you at the station.');
    } catch (err) {
      console.error('Role confirmation failed:', err);
    } finally {
      setConfirmingRoleId(null);
    }
  };

  // Toggle Action item
  const handleToggleAction = async (act) => {
    const nextVal = !act.completed;
    try {
      const updatedItems = await toggleActionItemStatus(
        communityId,
        serviceId,
        act.id,
        nextVal,
        currentUser
      );
      setSession((prev) => ({ ...prev, actionItems: updatedItems }));
      showNotice(`Action item marked ${nextVal ? 'done' : 'in progress'}`);
    } catch (err) {
      console.error('Failed to toggle action item:', err);
    }
  };

  // Add new Action item
  const handleCreateActionItem = async (e) => {
    e.preventDefault();
    if (!newActionTitle.trim()) return;

    const newItem = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newActionTitle.trim(),
      ownerId: currentUser.id,
      ownerName: newActionOwner.trim() || currentUser.displayName || 'Servant',
      dueDate: newActionDueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      completed: false,
      notes: newActionNotes.trim(),
    };

    const nextList = [...(session.actionItems || []), newItem];
    try {
      await recordMeetingDecisions(
        communityId,
        serviceId,
        session.decisions || [],
        nextList,
        currentUser
      );
      setSession((prev) => ({ ...prev, actionItems: nextList }));
      setNewActionTitle('');
      setNewActionOwner('');
      setNewActionDueDate('');
      setNewActionNotes('');
      setShowNewActionModal(false);
      showNotice('New action item delegated successfully');
    } catch (err) {
      console.error('Failed to save new action item:', err);
    }
  };

  // Broadcast announcement
  const handleBroadcastAnnouncement = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() && !broadcastMsg.trim()) return;

    try {
      const updatedList = await broadcastMeetingAnnouncement(
        communityId,
        serviceId,
        {
          title: broadcastTitle.trim() || 'Notice',
          message: broadcastMsg.trim(),
          priority: broadcastPriority,
        },
        currentUser
      );
      setSession((prev) => ({ ...prev, urgentAnnouncements: updatedList }));
      setBroadcastTitle('');
      setBroadcastMsg('');
      setShowBroadcastModal(false);
      showNotice('Urgent announcement broadcast to the team');
    } catch (err) {
      console.error('Broadcast failed:', err);
    }
  };

  // Submit Feedback
  const handleSubmitFeedbackForm = async (e) => {
    e.preventDefault();
    try {
      await submitMeetingFeedback(communityId, serviceId, currentUser.id, {
        rating: feedbackRating,
        positives: feedbackPositives,
        improvements: feedbackImprovements,
        notes: feedbackNotes,
        memberName: currentUser.displayName,
        memberRole: currentUser.role,
      });
      setFeedbackSubmitted(true);
      showNotice('Servant feedback saved! Thank you for helping us grow.');
    } catch (err) {
      console.error('Feedback submit failed:', err);
    }
  };

  // Toggle prayer like
  const handleTogglePrayer = (prayerId) => {
    setPrayerLikes((prev) => ({
      ...prev,
      [prayerId]: !prev[prayerId],
    }));
  };

  // Render QR Payload
  const qrPayload = useMemo(() => {
    return JSON.stringify({
      v: 1,
      c: communityId,
      s: session?.qrCodeStatus?.sessionId || `qrs_${serviceId}`,
      svc: serviceId,
      t: 'MEETING_TOKEN',
    });
  }, [communityId, serviceId, session?.qrCodeStatus?.sessionId]);

  return (
    <div
      data-testid="servant-meeting-mode-root"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white pb-24"
    >
      {/* Toast Notification */}
      {actionSuccessNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500/90 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm font-medium backdrop-blur-md animate-fade-in border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {/* Top App Header & Breadcrumb */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to activities"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Weekly Servant Meeting
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline-block">
                  • {session.serviceTitle}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5 flex items-center gap-2">
                <span>{session.title}</span>
                <Sparkles className="w-4 h-4 text-amber-400 inline" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick check-in indicator in header */}
            {isCheckedIn ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Present</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickCheckIn}
                disabled={checkingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition-all active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>{checkingIn ? 'Checking In...' : 'Quick Check-in'}</span>
              </button>
            )}

            {/* QR Modal trigger */}
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              aria-label="Show Attendance QR"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            >
              <QrCode className="w-5 h-5 text-purple-400" />
            </button>
          </div>
        </div>

        {/* 3-Phase Interactive Tab Stepper */}
        <div className="max-w-5xl mx-auto mt-3">
          <nav
            aria-label="Meeting phases"
            className="grid grid-cols-3 gap-1 bg-slate-950/70 p-1 rounded-2xl border border-slate-800/80"
          >
            {[
              { key: MEETING_MODES.BEFORE, label: '1. Before Meeting', sub: 'Prep & Focus' },
              { key: MEETING_MODES.DURING, label: '2. During Meeting', sub: 'Live Huddle & Flow' },
              { key: MEETING_MODES.AFTER, label: '3. After Meeting', sub: 'Action & Feedback' },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              const isCloudPhase = session.phase === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handlePhaseChange(tab.key)}
                  className={`relative flex flex-col items-center justify-center py-2 px-1 sm:px-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-600/30 text-white shadow-inner border border-purple-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
                    <span>{tab.label}</span>
                    {isCloudPhase && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:block">{tab.sub}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Phase Content View */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 mt-6 flex-1 space-y-6">
        {/* Leader Control Bar (when leader is viewing) */}
        {isLeader && (
          <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 border border-purple-500/25 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs font-semibold text-purple-300">Leader Meeting Controls</p>
                <p className="text-[11px] text-slate-400">
                  Active Cloud Phase: <span className="font-bold text-white uppercase">{session.phase}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Broadcast Alert</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewActionModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Action Item</span>
              </button>

              {session.phase === MEETING_MODES.BEFORE && (
                <button
                  type="button"
                  onClick={() => handlePhaseChange(MEETING_MODES.DURING)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/30 transition-all"
                >
                  Start Meeting →
                </button>
              )}

              {session.phase === MEETING_MODES.DURING && (
                <button
                  type="button"
                  onClick={() => handlePhaseChange(MEETING_MODES.AFTER)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all"
                >
                  Conclude Meeting →
                </button>
              )}

              {session.phase === MEETING_MODES.AFTER && (
                <button
                  type="button"
                  onClick={() => handlePhaseChange(MEETING_MODES.BEFORE)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  Reset to Prep
                </button>
              )}
            </div>
          </div>
        )}

        {/* Urgent Announcements Banner (Appears across all phases if active) */}
        {session.urgentAnnouncements && session.urgentAnnouncements.length > 0 && (
          <div className="space-y-2">
            {session.urgentAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 shadow-sm"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs sm:text-sm font-bold text-amber-300">{ann.title}</h2>
                    <span className="text-[10px] text-amber-400/80 font-mono">
                      {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    {ann.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE 1: BEFORE THE MEETING                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === MEETING_MODES.BEFORE && (
          <div className="space-y-6">
            {/* Top Grid: Location & Time Card + Attendance QR Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Meeting Logistics Card */}
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-400">
                    <MapPin className="w-5 h-5" />
                    <h2 className="font-bold text-sm tracking-wide text-white uppercase">
                      Meeting Room & Time
                    </h2>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Prep Mode
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/50">
                    <p className="text-xs text-slate-400">Location & Room</p>
                    <p className="font-semibold text-white text-base">
                      {session.meetingLocation?.room}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {session.meetingLocation?.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/50">
                      <p className="text-xs text-amber-400 font-medium">Arrival Time</p>
                      <p className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>{session.meetingLocation?.arrivalTime}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">30 mins early for prayer</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/50">
                      <p className="text-xs text-cyan-400 font-medium">Meeting Time</p>
                      <p className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5 mt-0.5">
                        <CalendarCheck className="w-4 h-4 text-cyan-400" />
                        <span>
                          {session.meetingLocation?.startTime} - {session.meetingLocation?.endTime}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Prompt start</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance QR & Quick Check-in Card */}
              <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <QrCode className="w-5 h-5" />
                      <h2 className="font-bold text-sm tracking-wide text-white uppercase">
                        Attendance QR & Check-In
                      </h2>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    {session.qrCodeStatus?.quickCheckInPrompt}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setShowQrModal(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowQrModal(true); }}
                      aria-label="Enlarge Attendance QR Code"
                      className="w-14 h-14 bg-white p-1 rounded-xl cursor-pointer hover:scale-105 transition-transform shrink-0"
                    >
                      <QRCodeSVG value={qrPayload} size={48} level="M" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Live Room Session</p>
                      <p className="text-[11px] text-slate-400">
                        {attendance.total} servant{attendance.total === 1 ? '' : 's'} registered
                      </p>
                    </div>
                  </div>

                  {isCheckedIn ? (
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Checked In</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleQuickCheckIn}
                      disabled={checkingIn}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 transition-all"
                    >
                      {checkingIn ? 'Checking...' : 'Check In Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Agenda Breakdown with Estimated Times */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <span>Meeting Agenda & Timeline</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {session.agenda?.length || 0} items • Estimated Duration:{' '}
                    {formatMinutes(totalAgendaMinutes)}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {(session.agenda || []).map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/50 hover:border-slate-700/80 transition-all flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/30">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        <span className="text-xs font-mono text-cyan-300 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/40">
                          {item.estimatedMinutes} mins
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Speaker: {item.speaker}</p>
                      {item.notes && (
                        <p className="text-xs text-slate-300/80 mt-1 italic">{item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preparation Materials & Downloadable Notes */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>Preparation Materials & Scripture Notes</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review these before arriving at the servant meeting
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(session.preparationMaterials || []).map((mat) => (
                  <div
                    key={mat.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            mat.required
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {mat.required ? 'Required' : 'Resource'}
                        </span>
                        <span className="text-xs text-slate-500 uppercase font-mono">
                          {mat.type}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                        {mat.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {mat.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveMaterial(mat)}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {mat.type === 'download' ? (
                        <>
                          <Download className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Download Guide</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                          <span>View Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Open Serving Roles for Upcoming Service */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span>Open Serving Roles for Upcoming Service</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Step up to fill spots before game kickoff
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(session.openServingRoles || []).map((role) => {
                  const spotsLeft = Math.max(
                    0,
                    (role.spotsNeeded || 0) - (role.spotsFilled || 0)
                  );
                  const isUserAssigned = (role.assignedMembers || []).some(
                    (m) => m.id === currentUser?.id
                  );

                  return (
                    <div
                      key={role.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-300 uppercase">
                            {role.department || 'Service'}
                          </span>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                              spotsLeft === 0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1">{role.role}</h3>

                        {/* Assigned servants */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {(role.assignedMembers || []).map((servant) => (
                            <span
                              key={servant.id}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60"
                            >
                              ✓ {servant.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {isUserAssigned ? (
                        <div className="py-2 text-center text-xs font-bold text-emerald-400 bg-emerald-950/30 rounded-xl border border-emerald-800/40">
                          ✓ You are Confirmed
                        </div>
                      ) : spotsLeft > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleConfirmRole(role.id)}
                          disabled={confirmingRoleId === role.id}
                          className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          {confirmingRoleId === role.id
                            ? 'Confirming...'
                            : 'Volunteer for this Role'}
                        </button>
                      ) : (
                        <div className="py-2 text-center text-xs text-slate-500">
                          Spots Filled
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prayer Topics */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-400" />
                  <span>Prayer Topics & Spiritual Focus</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lifting these up in private prayer and together at the meeting
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(session.prayerTopics || []).map((prayer) => {
                  const liked = prayerLikes[prayer.id];
                  return (
                    <div
                      key={prayer.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-300 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30">
                          {prayer.category || 'Spiritual'}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-2">{prayer.title}</h3>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          {prayer.topic}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePrayer(prayer.id)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                          liked
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${liked ? 'fill-rose-400 text-rose-400' : ''}`}
                        />
                        <span>{liked ? 'Praying with you' : "I'm praying for this"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE 2: DURING THE MEETING                                    */}
        {/* ------------------------------------------------------------- */}
        {activeTab === MEETING_MODES.DURING && (
          <div className="space-y-6">
            {/* Live Attendance Counter & Checked-In Servant List */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span>Live Servant Attendance</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time presence tracking for this session
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchAttendance}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  aria-label="Refresh attendance roster"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Attendance metrics */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/60 text-center">
                  <p className="text-xs text-slate-400">Total Count</p>
                  <p className="text-2xl font-black text-white mt-1">{attendance.total}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/60 text-center">
                  <p className="text-xs text-emerald-400 font-semibold">Present</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{attendance.present}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/60 text-center">
                  <p className="text-xs text-amber-400 font-semibold">Late / Excused</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">
                    {attendance.late + attendance.excused}
                  </p>
                </div>
              </div>

              {/* Servant Roster Pills */}
              <div className="mt-3">
                <p className="text-xs font-semibold text-slate-400 mb-2">Checked-in Servants:</p>
                {attendance.attendees && attendance.attendees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {attendance.attendees.map((attendee) => (
                      <div
                        key={attendee.id || attendee.memberId}
                        className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2 text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-semibold text-white">
                          {attendee.displayName || attendee.name || 'Servant'}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          ({attendee.memberRole || 'servant'})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/40 text-center text-xs text-slate-500 border border-slate-800/40">
                    No servants checked in yet. Scan the QR code or tap Quick Check-in.
                  </div>
                )}
              </div>
            </div>

            {/* Real-Time Agenda Progress Checklist */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    <span>Live Agenda Flow & Progress</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Check off topics as the meeting progresses
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-purple-300">
                    {completedAgendaCount} of {session.agenda?.length || 0} Done
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      session.agenda?.length
                        ? (completedAgendaCount / session.agenda.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="space-y-2.5">
                {(session.agenda || []).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleAgenda(item)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      item.completed
                        ? 'bg-slate-950/30 border-slate-800/40 text-slate-400 opacity-80'
                        : 'bg-slate-950/70 border-slate-800 hover:border-purple-500/50 text-white'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`Toggle ${item.title}`}
                      className="mt-0.5 text-purple-400 hover:text-purple-300"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`text-sm font-bold ${
                            item.completed ? 'line-through text-slate-500' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </h3>
                        <span className="text-xs font-mono text-cyan-300">
                          {item.estimatedMinutes}m
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Speaker: {item.speaker} {item.notes && `• ${item.notes}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Polls / Pulse Questions */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>Live Meeting Polls & Pulse Checks</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Instant anonymous sentiment and room feedback
                </p>
              </div>

              <div className="space-y-4">
                {(session.polls || []).map((poll) => {
                  const responses = poll.responses || {};
                  const totalVotes = Object.keys(responses).length;
                  const userResponse = responses[currentUser?.id]?.answer;
                  const selected = selectedPollAnswers[poll.id] || userResponse;

                  // Compute vote breakdown
                  const counts = {};
                  (poll.options || []).forEach((opt) => {
                    counts[opt] = 0;
                  });
                  Object.values(responses).forEach((res) => {
                    const ans = typeof res === 'object' ? res.answer : res;
                    if (counts[ans] !== undefined) counts[ans]++;
                  });

                  return (
                    <div
                      key={poll.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/70 space-y-3"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {poll.question}
                      </h3>

                      <div className="space-y-2">
                        {(poll.options || []).map((option) => {
                          const optCount = counts[option] || 0;
                          const pct = totalVotes > 0 ? Math.round((optCount / totalVotes) * 100) : 0;
                          const isOptionSelected = selected === option;

                          return (
                            <div
                              key={option}
                              onClick={() =>
                                setSelectedPollAnswers((prev) => ({
                                  ...prev,
                                  [poll.id]: option,
                                }))
                              }
                              className={`relative overflow-hidden p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs sm:text-sm font-semibold ${
                                isOptionSelected
                                  ? 'bg-purple-600/20 border-purple-500/60 text-white'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              {/* Background vote percentage fill */}
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-purple-500/15 pointer-events-none transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />

                              <div className="relative flex items-center gap-2.5 z-10">
                                <span
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isOptionSelected
                                      ? 'border-purple-400 bg-purple-500 text-white'
                                      : 'border-slate-600'
                                  }`}
                                >
                                  {isOptionSelected && <Check className="w-2.5 h-2.5" />}
                                </span>
                                <span>{option}</span>
                              </div>

                              <span className="relative z-10 text-xs font-mono text-purple-300">
                                {pct}% ({optCount})
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-slate-500">
                          {totalVotes} total response{totalVotes === 1 ? '' : 's'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSubmitPoll(poll.id)}
                          disabled={submittingPollId === poll.id || !selected}
                          className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all"
                        >
                          {submittingPollId === poll.id ? 'Submitting...' : 'Submit Pulse'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shared Discussion Prompts */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                  <span>Shared Discussion Prompts</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gather in small groups to share and encourage one another
                </p>
              </div>

              <div className="space-y-3">
                {(session.discussionPrompts || []).map((prompt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/25 flex items-start gap-3 text-slate-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      Q{idx + 1}
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* PHASE 3: AFTER THE MEETING                                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === MEETING_MODES.AFTER && (
          <div className="space-y-6">
            {/* Meeting Summary & Key Decisions */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    <span>Meeting Summary & Key Decisions</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official decisions confirmed by leadership
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {(session.decisions || []).map((dec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                      ✓
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed">{dec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Items with Assigned Owners & Due Dates (Follow-up Tracker) */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    <span>Follow-Up Action Items Tracker</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ownership and deliverables for the upcoming week
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewActionModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Action</span>
                </button>
              </div>

              <div className="space-y-3">
                {(session.actionItems || []).map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleAction(act)}
                        className="mt-0.5 text-purple-400 hover:text-purple-300"
                        aria-label={`Toggle action item: ${act.title}`}
                      >
                        {act.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-500" />
                        )}
                      </button>

                      <div>
                        <h3
                          className={`text-sm font-bold ${
                            act.completed ? 'line-through text-slate-500' : 'text-white'
                          }`}
                        >
                          {act.title}
                        </h3>
                        {act.notes && (
                          <p className="text-xs text-slate-400 mt-0.5">{act.notes}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                            Owner: {act.ownerName || 'Unassigned'}
                          </span>
                          <span>Due: {act.dueDate}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full self-start sm:self-center ${
                        act.completed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {act.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Servant Feedback Submission Form */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  <span>Servant Meeting Feedback</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  How can we improve our meetings, timing, and support for your team?
                </p>
              </div>

              {feedbackSubmitted ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-xs sm:text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Thank you, {currentUser.displayName}! Your feedback has been recorded for the
                    leadership team.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedbackForm} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Overall Meeting Rating
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackRating(star)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= feedbackRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      What went great today?
                    </label>
                    <textarea
                      rows={2}
                      value={feedbackPositives}
                      onChange={(e) => setFeedbackPositives(e.target.value)}
                      placeholder="e.g. Inspiring devotion, clear breakdown of court rules..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      What could be improved?
                    </label>
                    <textarea
                      rows={2}
                      value={feedbackImprovements}
                      onChange={(e) => setFeedbackImprovements(e.target.value)}
                      placeholder="e.g. Shorter announcements, earlier start..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-900/30 transition-all"
                  >
                    Submit Servant Feedback
                  </button>
                </form>
              )}
            </div>

            {/* Next Meeting Countdown & Reminder */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4 shadow-md backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                    Next Cycle Reminder
                  </span>
                  <h2 className="text-base font-bold text-white mt-1">
                    {session.nextMeeting?.title || 'Next Servant Meeting & Huddle'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {session.nextMeeting?.date} at {session.nextMeeting?.time} •{' '}
                    {session.nextMeeting?.location || 'Upper Room'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-2 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 text-center">
                    <p className="text-[10px] text-cyan-400 font-bold uppercase">Countdown</p>
                    <p className="text-sm font-black text-cyan-200">
                      {getCountdownToDate(
                        session.nextMeeting?.date,
                        session.nextMeeting?.time || '18:00'
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      downloadIcsFile({
                        title: session.nextMeeting?.title || 'VBT Servant Meeting',
                        date: session.nextMeeting?.date,
                        startTime: session.nextMeeting?.time || '18:00',
                        endTime: '19:30',
                        location: session.nextMeeting?.location || 'Upper Room',
                        description: 'Weekly VBT Servant Preparation & Fellowship Meeting',
                      })
                    }
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                    title="Add next meeting to calendar"
                  >
                    <Calendar className="w-5 h-5 text-cyan-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Preparation Material Viewer Modal */}
      {activeMaterial && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-indigo-400 font-bold">
                {activeMaterial.type}
              </span>
              <button
                type="button"
                onClick={() => setActiveMaterial(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-white">{activeMaterial.title}</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {activeMaterial.description}
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-white">Full Notes & Outline:</p>
              <p>
                1. Focus completely on the youth: encourage by name and cheer on every effort.
              </p>
              <p>
                2. Court safety: Always keep a clear perimeter around the basketball hoops and
                soccer boundaries.
              </p>
              <p>
                3. Lead with prayer: In moments of competition tension, gather the teams and pray
                for peace and sportsmanship.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveMaterial(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
            >
              Close Notes
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: QR Code Fullscreen / Presenter Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Room Attendance QR</h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
              <QRCodeSVG value={qrPayload} size={220} level="H" />
            </div>

            <p className="text-xs text-slate-300">
              Servants can scan this directly with their mobile phone cameras to check in.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Action Item Modal */}
      {showNewActionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateActionItem}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Assign New Action Item</h3>
              <button
                type="button"
                onClick={() => setShowNewActionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Action Title *
                </label>
                <input
                  type="text"
                  required
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  placeholder="e.g. Inspect volleyball nets on Court 2"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Assigned Servant Owner
                </label>
                <input
                  type="text"
                  value={newActionOwner}
                  onChange={(e) => setNewActionOwner(e.target.value)}
                  placeholder="e.g. David K. (or leave blank for yourself)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Due Date</label>
                <input
                  type="date"
                  value={newActionDueDate}
                  onChange={(e) => setNewActionDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newActionNotes}
                  onChange={(e) => setNewActionNotes(e.target.value)}
                  placeholder="Additional context or equipment locations..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewActionModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Save Action
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: Broadcast Urgent Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleBroadcastAnnouncement}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <span>Broadcast Urgent Notice</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Weather Alert / Gym Relocation"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Announcement Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Enter details for the team..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Priority</label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="high">High (Urgent Alert)</option>
                  <option value="normal">Normal (Informational)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition-all"
              >
                Broadcast Now
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
