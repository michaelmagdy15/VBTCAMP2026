import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Heart,
  Users,
  Shield,
  Award,
  Zap,
  Radio,
  QrCode,
  KeyRound,
  LogIn,
  LogOut,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  X,
  Compass,
  HeartHandshake,
  Bot,
  Activity,
  WifiOff,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  Share2,
} from 'lucide-react';
import CommunityHeader from './CommunityHeader';
import BottomNavigation from './BottomNavigation';
import WelcomeHero from './WelcomeHero';
import WeeklyRhythmCard from './WeeklyRhythmCard';
import ServingOpportunitiesCard from './ServingOpportunitiesCard';
import AttendanceCheckInCard from './AttendanceCheckInCard';
import CommunityPulse from './CommunityPulse';
import RoleDashboard from './RoleDashboard';
import FindYourPlaceModal from './FindYourPlaceModal';
import ServantPassportModal from './ServantPassportModal';
import ServantMeetingMode from './ServantMeetingMode';
import CommunityHealthDashboard from './CommunityHealthDashboard';
import YouthSafetyManagerModal from './YouthSafetyManagerModal';
import SmartAssignmentModal from './SmartAssignmentModal';
import VbtAiAssistantModal from './VbtAiAssistantModal';
import LeaderCommandSheet from './LeaderCommandSheet';
import TeamCultureFeed from './TeamCultureFeed';
import CommunityMemoryWall from './CommunityMemoryWall';
import WeeklyRitualBanner from './WeeklyRitualBanner';
import { useCommunityData } from '../../services/communityAdapterService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';

/**
 * Join with Code Modal Drawer
 */
function JoinCodeModal({ isOpen, onClose, onJoinCode }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCode('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const cleanCode = code.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanCode) {
      setError('Please enter a valid activity or event code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (typeof onJoinCode === 'function') {
        await onJoinCode(cleanCode);
      }
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not verify event code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-code-title"
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 sm:p-7 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close code dialog"
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 id="join-code-title" className="text-xl font-black tracking-tight">
              Join with Code
            </h3>
            <p className="text-xs text-slate-300">
              Enter the passcode provided by your coordinator
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="activity-code-input" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Activity / Event Passcode
            </label>
            <input
              id="activity-code-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. VBT2026 or FRIDAY"
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 text-white font-mono text-base tracking-widest uppercase outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-cyan-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Joining...' : 'Enter Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * CommunityHome Component
 *
 * Top-level Orchestrator for the VBT Community Homepage Redesign.
 * Connects header, welcome hero, weekly rhythms, serving opportunities,
 * community pulse, role dashboards, contextual modals, and live activity entry.
 */
export default function CommunityHome({
  currentUser = null,
  eventRegistry = [],
  serviceRequests = [],
  onEnterActivity = null,
  onJoinEventCode = null,
  onRequestService = null,
  onOpenAdminLogin = null,
  onCreateNewEvent = null,
  onLogout = null,
  onOpenProfile = null,
  onOpenNotifications = null,
  isOffline: propIsOffline = false,
  communityId = DEFAULT_COMMUNITY_ID,
  communityName = 'Value Blessings Team',
  initialTab = 'home',
  activities: propActivities = null,
  opportunities: propOpportunities = null,
  memberContext: propMemberContext = null,
}) {
  // Navigation & View state: 'home' | 'community' | 'serve' | 'schedule' | 'profile'
  const [currentTab, setCurrentTab] = useState(initialTab || 'home');

  // Modal states
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInActivity, setCheckInActivity] = useState(null);
  const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);
  const [isFindYourPlaceOpen, setIsFindYourPlaceOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isServantMeetingModeOpen, setIsServantMeetingModeOpen] = useState(false);
  const [isHealthDashboardOpen, setIsHealthDashboardOpen] = useState(false);
  const [isSafetyManagerOpen, setIsSafetyManagerOpen] = useState(false);
  const [isSmartAssignmentOpen, setIsSmartAssignmentOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [isCommandSheetOpen, setIsCommandSheetOpen] = useState(false);
  const [commandSheetTab, setCommandSheetTab] = useState('live');

  const handleOpenCommandSheet = useCallback((tab = 'live') => {
    setCommandSheetTab(tab);
    setIsCommandSheetOpen(true);
  }, []);

  // Community data hook (adapter)
  const hookData = useCommunityData(communityId, currentUser);

  const activities = useMemo(() => {
    if (propActivities && Array.isArray(propActivities)) return propActivities;
    return hookData.activities || [];
  }, [propActivities, hookData.activities]);

  const opportunities = useMemo(() => {
    if (propOpportunities && Array.isArray(propOpportunities)) return propOpportunities;
    return hookData.opportunities || [];
  }, [propOpportunities, hookData.opportunities]);

  const memberContext = useMemo(() => {
    if (propMemberContext) return propMemberContext;
    return hookData.memberContext || null;
  }, [propMemberContext, hookData.memberContext]);

  const announcements = useMemo(() => {
    return hookData.announcements || [];
  }, [hookData.announcements]);

  const scripture = useMemo(() => {
    return hookData.scripture || undefined;
  }, [hookData.scripture]);

  const newMembers = useMemo(() => {
    return hookData.newMembers || [];
  }, [hookData.newMembers]);

  const celebrations = useMemo(() => {
    return hookData.celebrations || [];
  }, [hookData.celebrations]);

  const prayers = useMemo(() => {
    return hookData.prayers || [];
  }, [hookData.prayers]);

  const isOffline = propIsOffline || hookData.isOffline || false;

  // Active / live events detected from eventRegistry
  const activeEvents = useMemo(() => {
    if (!Array.isArray(eventRegistry)) return [];
    return eventRegistry.filter(
      (ev) => ev && ev.active !== false && !ev.expired && ev.code !== 'june26'
    );
  }, [eventRegistry]);

  // Primary upcoming activity for Hero contextual CTA
  const primaryUpcomingActivity = useMemo(() => {
    if (activities && activities.length > 0) {
      return activities[0];
    }
    return null;
  }, [activities]);

  // Pending serving assignment for Hero contextual CTA
  const pendingAssignment = useMemo(() => {
    if (memberContext?.assignedDuties && memberContext.assignedDuties.length > 0) {
      return memberContext.assignedDuties[0];
    }
    if (memberContext?.pendingApplications && memberContext.pendingApplications.length > 0) {
      return memberContext.pendingApplications[0];
    }
    return null;
  }, [memberContext]);

  // Open serving count
  const openOpportunitiesCount = useMemo(() => {
    if (!Array.isArray(opportunities)) return 0;
    return opportunities.reduce((acc, curr) => {
      const needed = Number(curr.neededCount || curr.capacity || 2);
      const filled = Number(curr.filledCount || 0);
      return acc + Math.max(0, needed - filled);
    }, 0);
  }, [opportunities]);

  // Handle Tab Navigation
  const handleSelectTab = useCallback((tabId) => {
    setCurrentTab(tabId);
    // Smooth scroll to relevant section if on mobile/home
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Attendance check-in trigger
  const handleOpenCheckIn = useCallback((activity = null) => {
    setCheckInActivity(activity || primaryUpcomingActivity);
    setIsCheckInOpen(true);
  }, [primaryUpcomingActivity]);

  // Handle Join Code submit
  const handleJoinCodeSubmit = useCallback(
    async (code) => {
      if (typeof onJoinEventCode === 'function') {
        return onJoinEventCode(code);
      }
      if (typeof onEnterActivity === 'function') {
        return onEnterActivity(code);
      }
    },
    [onJoinEventCode, onEnterActivity]
  );

  // Handle Activity Select / Live entry
  const handleOpenActivity = useCallback(
    (act) => {
      const code = act?.eventCode || act?.code || act?.id;
      if (code && typeof onEnterActivity === 'function') {
        onEnterActivity(code);
      }
    },
    [onEnterActivity]
  );

  // Express interest submission
  const handleExpressInterest = useCallback(
    async (opportunity, note) => {
      if (typeof hookData.applyServing === 'function') {
        return hookData.applyServing({
          opportunityId: opportunity?.id,
          note,
        });
      }
    },
    [hookData]
  );

  // Check-in success handler
  const handleCheckInSuccess = useCallback(() => {
    setIsCheckInOpen(false);
    if (typeof hookData.refresh === 'function') {
      hookData.refresh();
    }
  }, [hookData]);

  // Render content based on currentTab
  const isHomeTab = currentTab === 'home';
  const isCommunityTab = currentTab === 'community';
  const isServeTab = currentTab === 'serve';
  const isScheduleTab = currentTab === 'schedule';
  const isProfileTab = currentTab === 'profile';

  return (
    <div
      data-testid="community-home-root"
      className="vbt-community-home-container w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #0d1b3e 0%, #060914 80%, #03050a 100%)',
        fontFamily: "var(--font-body, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* Background Ambience Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* TOP COMMUNITY HEADER */}
      <CommunityHeader
        currentUser={currentUser}
        communityName={communityName}
        isOffline={isOffline}
        unreadCount={0}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile || (() => setCurrentTab('profile'))}
        onOpenAuth={onOpenAdminLogin}
      />

      {/* LIVE EVENT HIGHLIGHT BANNER (If any live camp/gathering is ongoing) */}
      {activeEvents.length > 0 && (
        <section
          data-testid="live-activity-banner"
          className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 pt-4"
        >
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-amber-950/50 border border-rose-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 animate-pulse">
                <Radio className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white animate-pulse">
                    LIVE NOW
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    {activeEvents[0].name || activeEvents[0].title || 'Active VBT Gathering'}
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  Live scoreboard, court challenges, and logistics are active!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                data-testid="banner-door-qr-btn"
                onClick={() => handleOpenCommandSheet('live')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Show scannable Door QR for arriving servants"
              >
                <QrCode className="w-4 h-4" />
                <span>Door QR</span>
              </button>

              <button
                type="button"
                data-testid="banner-whatsapp-brief-btn"
                onClick={() => handleOpenCommandSheet('care')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Copy or share servant briefing to WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp Brief</span>
              </button>

              <button
                type="button"
                onClick={() => onEnterActivity?.(activeEvents[0].code || activeEvents[0].id)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Enter Live Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-12 space-y-6">
        {/* VIEW: HOME TAB */}
        {isHomeTab && (
          <div className="space-y-6">
            {/* SERVANT & LEADER 1-TAP COCKPIT STRIP (When signed in) */}
            {currentUser && currentUser.role !== 'guest' && (
              <section
                data-testid="servant-duty-cockpit"
                className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-cyan-500/35 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {(currentUser.role || 'Servant').replace(/_/g, ' ')} Cockpit
                      </span>
                      {(currentUser.teamCode || currentUser.roleCode) && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Assigned: {(currentUser.teamCode || currentUser.roleCode).replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white mt-1">
                      Ready to serve, {currentUser.firstName || currentUser.displayName || currentUser.name || 'Servant'} — 1-Tap Field &amp; Meeting Controls
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    data-testid="cockpit-command-hub-btn"
                    onClick={() => handleOpenCommandSheet('live')}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Command Hub</span>
                  </button>

                  <button
                    type="button"
                    data-testid="cockpit-tuesday-hub-btn"
                    onClick={() => setIsServantMeetingModeOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Tuesday Meeting</span>
                  </button>

                  <button
                    type="button"
                    data-testid="cockpit-whatsapp-btn"
                    onClick={() => handleOpenCommandSheet('care')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Briefing</span>
                  </button>
                </div>
              </section>
            )}

            {/* WELCOME HERO */}
            <WelcomeHero
              currentUser={currentUser}
              memberProfile={memberContext?.profile}
              upcomingActivity={primaryUpcomingActivity}
              pendingAssignment={pendingAssignment}
              openOpportunitiesCount={openOpportunitiesCount}
              onCheckIn={() => handleOpenCheckIn(primaryUpcomingActivity)}
              onConfirmServing={() => setIsPassportOpen(true)}
              onExploreWeek={() => handleSelectTab('schedule')}
              onJoinCommunity={() => setIsFindYourPlaceOpen(true)}
              onScanQR={() => handleOpenCheckIn()}
              onEnterCode={() => setIsJoinCodeOpen(true)}
              onOpenServe={() => handleSelectTab('serve')}
            />

            {/* RESPONSIVE 2-COLUMN GRID (Desktop: 2-col, Tablet: 2-col This Week + Serve, Mobile: 1-col) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* PRIMARY COLUMN (Desktop: 7 of 12 cols, Tablet: full width) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                {/* THIS WEEK'S RHYTHM CARD */}
                <div id="weekly-rhythm-section">
                    <WeeklyRhythmCard
                      activities={activities}
                      currentUser={currentUser}
                      onCheckIn={handleOpenCheckIn}
                      onOpenActivity={handleOpenActivity}
                      onScanQR={() => handleOpenCheckIn()}
                      isOffline={isOffline}
                    />
                  </div>

                  {/* SERVING OPPORTUNITIES MARKETPLACE CARD */}
                  <div id="serving-marketplace-section">
                    <ServingOpportunitiesCard
                      opportunities={opportunities}
                      memberAvailability={memberContext?.availability}
                      currentUser={currentUser}
                      onExpressInterest={handleExpressInterest}
                      onSetAvailability={() => setIsPassportOpen(true)}
                      onOpenServePage={() => handleSelectTab('serve')}
                      isOffline={isOffline}
                      maxItems={3}
                    />
                  </div>
              </div>

              {/* SECONDARY SIDEBAR / RAIL (Desktop: 5 of 12 cols) */}
              <aside className="lg:col-span-5 xl:col-span-4 space-y-6">
                {/* ROLE DASHBOARD (When logged in) */}
                {currentUser && currentUser.role !== 'guest' && (
                  <div data-testid="role-dashboard-container">
                    <RoleDashboard
                      currentUser={currentUser}
                      memberContext={memberContext}
                      onOpenVolunteerPass={() => setIsPassportOpen(true)}
                      onOpenServantMode={() => setIsServantMeetingModeOpen(true)}
                      onOpenCareDashboard={() => setIsHealthDashboardOpen(true)}
                      onOpenSafetyManager={() => setIsSafetyManagerOpen(true)}
                      onOpenSmartAssignment={() => setIsSmartAssignmentOpen(true)}
                      onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                      onOpenProfile={onOpenProfile}
                      onLogout={onLogout}
                      isOffline={isOffline}
                    />
                  </div>
                )}

                {/* QUICK ACTIONS BAR */}
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg space-y-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                        Quick Community Actions
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400">1-Tap Tools</span>
                  </div>

                  {/* Primary 1-Tap Command Hub Opener */}
                  <button
                    type="button"
                    data-testid="open-command-sheet-btn"
                    onClick={() => handleOpenCommandSheet('live')}
                    className="w-full p-3.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/15 to-blue-500/20 hover:from-amber-500/30 hover:to-blue-500/30 border border-amber-500/40 text-left transition-all flex items-center justify-between gap-3 cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">
                          Servant &amp; Leader Command Hub
                        </span>
                        <span className="text-[10px] text-slate-300 block">
                          Door QR · WhatsApp Brief · Meeting Mode · Auto-Assign
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" />
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Enter Code */}
                    <button
                      type="button"
                      onClick={() => setIsJoinCodeOpen(true)}
                      className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-850 border border-slate-700/80 text-left transition-all flex flex-col gap-1 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">Join with Code</span>
                      <span className="text-[10px] text-slate-300">Enter activity PIN</span>
                    </button>

                    {/* QR Check-In */}
                    <button
                      type="button"
                      onClick={() => handleOpenCheckIn()}
                      className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-850 border border-slate-700/80 text-left transition-all flex flex-col gap-1 cursor-pointer"
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-white">Check In / Scan</span>
                      <span className="text-[10px] text-slate-300">Fast QR Attendance</span>
                    </button>

                    {/* Request VBT Service */}
                    <button
                      type="button"
                      onClick={() => onRequestService?.()}
                      className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-850 border border-slate-700/80 text-left transition-all flex flex-col gap-1 cursor-pointer"
                    >
                      <Building className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">Request Service</span>
                      <span className="text-[10px] text-slate-300">Book VBT team</span>
                    </button>

                    {/* Find Your Place */}
                    <button
                      type="button"
                      onClick={() => setIsFindYourPlaceOpen(true)}
                      className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-850 border border-slate-700/80 text-left transition-all flex flex-col gap-1 cursor-pointer"
                    >
                      <Compass className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">Find Your Place</span>
                      <span className="text-[10px] text-slate-300">Ministry survey</span>
                    </button>
                  </div>

                  {/* Unified Servant & Coordinator Sign-In Gate */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onOpenAdminLogin?.()}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        {currentUser ? 'Switch Servant / Coordinator Account' : 'Servant & Coordinator Sign-In'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  {/* Create New Event Wizard shortcut */}
                  {onCreateNewEvent && (
                    <div>
                      <button
                        type="button"
                        onClick={onCreateNewEvent}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 hover:from-blue-900/60 hover:to-indigo-900/60 border border-blue-500/30 text-blue-200 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                          Launch / Clone Service Event
                        </span>
                        <ChevronRight className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* VISITOR DISCOVERY CARD: FIND YOUR CALLING IN SPORTS */}
                {!currentUser && (
                  <div className="rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-950 border border-slate-800 p-5 shadow-lg relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                          Ministry Discovery
                        </span>
                        <h4 className="text-sm font-black text-white">Find Your Place in VBT</h4>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
                      Discover the serving station, sports team, or ministry role tailored to your gifts, passions, and availability.
                    </p>
                    <div className="space-y-2 mb-4 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span>Sports coaching &amp; court officiating</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Media, sound, &amp; worship projection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                        <span>Hospitality, check-in, &amp; medical care</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFindYourPlaceOpen(true)}
                      className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Take 2-Min Discovery Quiz</span>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </button>
                  </div>
                )}
              </aside>
            </div>

            {/* FULL-WIDTH COMMUNITY CULTURE & PULSE SECTION */}
            <div id="community-pulse-section" className="pt-2">
              <CommunityPulse
                announcements={announcements}
                scripture={scripture}
                newMembers={newMembers}
                celebrations={celebrations}
                prayers={prayers}
                isOffline={isOffline}
                onOpenPrayerWall={() => handleSelectTab('community')}
                onOpenAnnouncements={() => handleSelectTab('community')}
              />
            </div>
          </div>
        )}

        {/* VIEW: COMMUNITY TAB */}
        {isCommunityTab && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">Community & Fellowship</h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Culture, testimonies, memory wall, and spiritual encouragement
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('home')}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                ← Back to Home
              </button>
            </div>

            <TeamCultureFeed
              communityId={communityId}
              currentUser={currentUser}
            />

            <CommunityPulse
              announcements={announcements}
              scripture={scripture}
              newMembers={newMembers}
              celebrations={celebrations}
              prayers={prayers}
              isOffline={isOffline}
            />

            <CommunityMemoryWall
              communityId={communityId}
              currentUser={currentUser}
            />
          </div>
        )}

        {/* VIEW: SERVE TAB */}
        {isServeTab && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">Serving Marketplace</h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Step up to serve across sports, logistics, media, and hospitality
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('home')}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                ← Back to Home
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFindYourPlaceOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>Take "Find Your Place" Quiz</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPassportOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>My Servant Passport</span>
              </button>
            </div>

            <ServingOpportunitiesCard
              opportunities={opportunities}
              memberAvailability={memberContext?.availability}
              currentUser={currentUser}
              onExpressInterest={handleExpressInterest}
              onSetAvailability={() => setIsPassportOpen(true)}
              isOffline={isOffline}
              maxItems={10}
            />
          </div>
        )}

        {/* VIEW: SCHEDULE TAB */}
        {isScheduleTab && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">Gathering Rhythm & Schedule</h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Weekly Friday youth services, Tuesday servant planning, and tournaments
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('home')}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                ← Back to Home
              </button>
            </div>

            <WeeklyRhythmCard
              activities={activities}
              currentUser={currentUser}
              onCheckIn={handleOpenCheckIn}
              onOpenActivity={handleOpenActivity}
              onScanQR={() => handleOpenCheckIn()}
              isOffline={isOffline}
            />
          </div>
        )}

        {/* VIEW: PROFILE TAB */}
        {isProfileTab && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">Member Profile & Tools</h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Manage your credentials, serving passport, and preferences
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectTab('home')}
                className="text-xs font-bold text-cyan-400 hover:underline"
              >
                ← Back to Home
              </button>
            </div>

            {currentUser ? (
              <div className="space-y-6">
                <RoleDashboard
                  currentUser={currentUser}
                  memberContext={memberContext}
                  onOpenVolunteerPass={() => setIsPassportOpen(true)}
                  onOpenServantMode={() => setIsServantMeetingModeOpen(true)}
                  onOpenCareDashboard={() => setIsHealthDashboardOpen(true)}
                  onOpenSafetyManager={() => setIsSafetyManagerOpen(true)}
                  onOpenSmartAssignment={() => setIsSmartAssignmentOpen(true)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  onOpenProfile={onOpenProfile}
                  onLogout={onLogout}
                  isOffline={isOffline}
                />

                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-6 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:text-white hover:bg-rose-500/25 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Profile</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
                <Shield className="w-12 h-12 text-slate-500 mx-auto" />
                <h2 className="text-xl font-black text-white">Sign In to View Profile</h2>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Access your serving history, servant passport, and coordinator permissions.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenAdminLogin}
                    className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Coordinator & Admin Login</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION (<1024px) */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        currentUser={currentUser}
        unreadCount={0}
      />

      {/* MODAL: ATTENDANCE CHECK-IN MODAL */}
      <AttendanceCheckInCard
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        currentUser={currentUser}
        activeService={checkInActivity || primaryUpcomingActivity}
        onCheckInSuccess={handleCheckInSuccess}
        communityId={communityId}
        isInline={false}
      />

      {/* MODAL: JOIN ACTIVITY WITH CODE */}
      <JoinCodeModal
        isOpen={isJoinCodeOpen}
        onClose={() => setIsJoinCodeOpen(false)}
        onJoinCode={handleJoinCodeSubmit}
      />

      {/* MODAL: FIND YOUR PLACE (ONBOARDING) */}
      <FindYourPlaceModal
        isOpen={isFindYourPlaceOpen}
        onClose={() => setIsFindYourPlaceOpen(false)}
        currentUser={currentUser}
      />

      {/* MODAL: SERVANT PASSPORT */}
      <ServantPassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        currentUser={currentUser}
      />

      {/* MODAL: TUESDAY SERVANT MEETING MODE */}
      {isServantMeetingModeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto"
        >
          <div className="relative w-full max-w-5xl my-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-white">
            <div className="p-4 bg-slate-850 border-b border-slate-700 flex justify-between items-center">
              <span className="font-black text-sm text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Servant Meeting & Planning Hub
              </span>
              <button
                type="button"
                onClick={() => setIsServantMeetingModeOpen(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
              <ServantMeetingMode
                isOpen={isServantMeetingModeOpen}
                onClose={() => setIsServantMeetingModeOpen(false)}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COORDINATOR CARE / HEALTH DASHBOARD */}
      {isHealthDashboardOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto"
        >
          <div className="relative w-full max-w-5xl my-8 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-white">
            <div className="p-4 bg-slate-850 border-b border-slate-700 flex justify-between items-center">
              <span className="font-black text-sm text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Community Health & Pastoral Care
              </span>
              <button
                type="button"
                onClick={() => setIsHealthDashboardOpen(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
              <CommunityHealthDashboard
                communityId={communityId}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: YOUTH SAFETY MANAGER */}
      <YouthSafetyManagerModal
        isOpen={isSafetyManagerOpen}
        onClose={() => setIsSafetyManagerOpen(false)}
        currentUser={currentUser}
      />

      {/* MODAL: SMART ASSIGNMENT */}
      <SmartAssignmentModal
        isOpen={isSmartAssignmentOpen}
        onClose={() => setIsSmartAssignmentOpen(false)}
        currentUser={currentUser}
      />

      {/* MODAL: VBT AI ASSISTANT */}
      <VbtAiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        currentUser={currentUser}
      />

      {/* MODAL: UNIFIED 3-TAB SERVANT & LEADER COMMAND SHEET */}
      <LeaderCommandSheet
        isOpen={isCommandSheetOpen}
        onClose={() => setIsCommandSheetOpen(false)}
        initialTab={commandSheetTab}
        currentUser={currentUser}
        activeActivity={primaryUpcomingActivity || activeEvents[0]}
        activities={activities}
        scripture={scripture}
        onCreateNewEvent={onCreateNewEvent}
        onEnterLiveEvent={(code) => onEnterActivity?.(code)}
        onOpenSmartAssignment={() => setIsSmartAssignmentOpen(true)}
        onOpenServantMode={() => setIsServantMeetingModeOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onOpenSafetyManager={() => setIsSafetyManagerOpen(true)}
        onOpenCareDashboard={() => setIsHealthDashboardOpen(true)}
        onOpenVolunteerPass={() => setIsPassportOpen(true)}
        onOpenCheckIn={(act) => handleOpenCheckIn(act)}
      />
    </div>
  );
}
