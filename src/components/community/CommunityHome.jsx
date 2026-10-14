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
  UserCheck,
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
import {
  useCommunityData,
  getSavedServantProfile,
  saveServantProfile,
  clearSavedServantProfile,
} from '../../services/communityAdapterService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';
import { triggerHaptic, isStandaloneApp, isIOSDevice } from '../../utils/haptics';

/**
 * Native Bottom Sheet: 10-Second Passwordless Servant & Player Identity Claim
 */
function QuickIdentitySheet({ isOpen, onClose, initialProfile, onSaveIdentity, pendingActionLabel }) {
  const [name, setName] = useState(initialProfile?.displayName || '');
  const [role, setRole] = useState(initialProfile?.role || 'servant');
  const [station, setStation] = useState(initialProfile?.station || 'Sports & Court');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialProfile?.displayName || '');
      setRole(initialProfile?.role || 'servant');
      setStation(initialProfile?.station || 'Sports & Court');
      setPhone(initialProfile?.phone || '');
      setError('');
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const stations = [
    'Sports & Court',
    'Football Station',
    'Basketball / Volleyball',
    'Court Referee',
    'Media & Sound',
    'Welcome & Hospitality',
    'Safety & First Aid',
  ];

  const roles = [
    { id: 'servant', label: '⚡ Church Servant' },
    { id: 'team_leader', label: '🏆 Team Leader' },
    { id: 'member', label: '🏀 Youth / Player' },
  ];

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!name.trim()) {
      triggerHaptic('warning');
      setError('Please enter your first and last name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      triggerHaptic('success');
      await onSaveIdentity?.({
        displayName: name.trim(),
        role,
        station,
        phone: phone.trim(),
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Could not save your pass. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-identity-sheet-title"
      data-testid="quick-identity-sheet"
      className="fixed inset-0 z-[1360] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="vbt-sheet-animate relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl p-6 pb-8 sm:p-7 text-white max-h-[92vh] overflow-y-auto"
        onTouchStart={(e) => setTouchStartY(e.touches?.[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const endY = e.changedTouches?.[0]?.clientY ?? null;
          if (touchStartY !== null && endY !== null && endY - touchStartY > 65) {
            triggerHaptic('light');
            onClose?.();
          }
          setTouchStartY(null);
        }}
      >
        <div className="vbt-sheet-grabber sm:hidden" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close identity sheet"
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 mt-1">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              10-Second Setup · No Password Needed
            </span>
            <h3 id="quick-identity-sheet-title" className="text-lg font-black tracking-tight text-white mt-1">
              Claim Your VBT Digital Pass
            </h3>
            <p className="text-xs text-slate-300">
              {pendingActionLabel || 'Saved on your phone for 1-tap check-in & station sign-ups'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-claim-name" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Your Full Name *
            </label>
            <input
              id="quick-claim-name"
              data-testid="quick-claim-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abanoub Magdy"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white text-sm font-bold outline-none transition-all placeholder:text-slate-500"
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              I am a...
            </span>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setRole(r.id);
                  }}
                  className={`py-2.5 px-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    role === r.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Primary Station / Sport
            </span>
            <div className="flex flex-wrap gap-1.5">
              {stations.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setStation(st);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    station === st
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="quick-claim-phone" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              WhatsApp / Mobile (Optional)
            </label>
            <input
              id="quick-claim-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 012XXXXXXXX"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-400 text-white text-xs outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            data-testid="save-quick-claim-btn"
            disabled={saving}
            className="w-full min-h-[46px] py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-cyan-600/30 cursor-pointer transition-all"
          >
            {saving ? 'Saving Pass...' : 'Save My Pass & Continue ⚡'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Native Bottom Sheet: Install VBT App to Home Screen (iOS / Android Standalone Guide)
 */
function NativeInstallSheet({ isOpen, onClose, isIOS }) {
  const [touchStartY, setTouchStartY] = useState(null);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-app-sheet-title"
      data-testid="native-install-sheet"
      className="fixed inset-0 z-[1350] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="vbt-sheet-animate relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl p-6 pb-8 sm:p-7 text-white"
        onTouchStart={(e) => setTouchStartY(e.touches?.[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const endY = e.changedTouches?.[0]?.clientY ?? null;
          if (touchStartY !== null && endY !== null && endY - touchStartY > 65) {
            triggerHaptic('light');
            onClose?.();
          }
          setTouchStartY(null);
        }}
      >
        <div className="vbt-sheet-grabber sm:hidden" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close install guide"
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mt-2 mb-4">
          <img
            src="/Final VBT Re-Branding 2026-02 (3).png"
            alt="VBT App Icon"
            className="w-13 h-13 rounded-2xl bg-slate-950 p-1.5 border border-cyan-500/40 shadow-lg shrink-0 object-contain"
          />
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Fullscreen Native Mode
            </span>
            <h3 id="install-app-sheet-title" className="text-lg font-black tracking-tight text-white mt-1">
              Install VBT Mobile App
            </h3>
            <p className="text-xs text-slate-300">
              Launch from your Home Screen with zero browser bars &amp; instant court alerts
            </p>
          </div>
        </div>

        <div className="space-y-3 my-4">
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <p className="text-xs font-bold text-white">
                {isIOS
                  ? 'Tap the "Share" button (⬆️) at the bottom of Safari'
                  : 'Tap the browser menu (⋮) in the top corner'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isIOS
                  ? 'Located in your iPhone or iPad bottom navigation bar'
                  : 'Or tap "Install App" directly if prompted by Chrome'}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-start gap-3">
            <span className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-black text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="text-xs font-bold text-white">
                Select &ldquo;Add to Home Screen&rdquo; (➕)
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tap &ldquo;Add&rdquo; in the top-right corner — the VBT icon will appear on your phone just like a native App Store app!
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] py-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 text-white font-black text-sm shadow-lg shadow-cyan-600/30 cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}

/**
 * Join with Code Native Bottom Sheet Drawer
 */
function JoinCodeModal({ isOpen, onClose, onJoinCode }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);

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
      triggerHaptic('warning');
      setError('Please enter a valid activity or event code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      triggerHaptic('success');
      if (typeof onJoinCode === 'function') {
        await onJoinCode(cleanCode);
      }
      onClose?.();
    } catch (err) {
      triggerHaptic('error');
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
      className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="vbt-sheet-animate relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl p-6 pb-8 sm:p-7 text-white"
        onTouchStart={(e) => setTouchStartY(e.touches?.[0]?.clientY ?? null)}
        onTouchEnd={(e) => {
          const endY = e.changedTouches?.[0]?.clientY ?? null;
          if (touchStartY !== null && endY !== null && endY - touchStartY > 65) {
            triggerHaptic('light');
            onClose?.();
          }
          setTouchStartY(null);
        }}
      >
        <div className="vbt-sheet-grabber sm:hidden" aria-hidden="true" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close code dialog"
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 mt-1">
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
              placeholder="e.g. JULY6 or FRIDAY"
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
 * Top-level Native-Feel Orchestrator for the VBT Community Homepage.
 * Features a locked 100dvh app shell on mobile, momentum scroll container with
 * Pull-to-Refresh, iOS-style Segmented Control to prevent endless scrolling,
 * tactile haptic feedback, and swipeable bottom sheets.
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

  // Mobile Segmented Control state on Home tab: 'week' | 'serve' | 'pulse' | 'tools'
  const [homeSegment, setHomeSegment] = useState('week');

  // Native Pull-to-Refresh state
  const [pullStartY, setPullStartY] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Native Standalone App Install prompt & banner state
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneApp());
  const [installBannerDismissed, setInstallBannerDismissed] = useState(false);
  const [isInstallSheetOpen, setIsInstallSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    setIsStandalone(isStandaloneApp());
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleTriggerInstallApp = useCallback(async () => {
    triggerHaptic('medium');
    if (deferredInstallPrompt && typeof deferredInstallPrompt.prompt === 'function') {
      try {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        setDeferredInstallPrompt(null);
        return;
      } catch {
        // Fall through to visual guide sheet
      }
    }
    setIsInstallSheetOpen(true);
  }, [deferredInstallPrompt]);

  // Passwordless 10-Second Servant Identity state (persisted on phone)
  const [claimedIdentity, setClaimedIdentity] = useState(() => getSavedServantProfile());
  const [isQuickIdentityOpen, setIsQuickIdentityOpen] = useState(false);
  const [pendingRsvpStatus, setPendingRsvpStatus] = useState(null);
  const [pendingActionLabel, setPendingActionLabel] = useState('');

  // Effective user combines full admin/coordinator auth with 10s passwordless servant pass
  const effectiveUser = currentUser || claimedIdentity;

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
    triggerHaptic('light');
    setCommandSheetTab(tab);
    setIsCommandSheetOpen(true);
  }, []);

  // Community data hook (adapter)
  const hookData = useCommunityData(communityId, effectiveUser);

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

  const weeklyRollCall = useMemo(() => {
    return hookData.weeklyRollCall || [];
  }, [hookData.weeklyRollCall]);

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
    triggerHaptic('selection');
    setCurrentTab(tabId);
    const viewport = typeof document !== 'undefined' ? document.querySelector('.vbt-native-scroll-viewport') : null;
    if (viewport && typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Handle Mobile Segmented Control switch on Home tab
  const handleSelectHomeSegment = useCallback((segId) => {
    triggerHaptic('selection');
    setHomeSegment(segId);
  }, []);

  // Touch Pull-to-Refresh handlers on the native scroll viewport
  const handleViewportTouchStart = useCallback((e) => {
    const el = e.currentTarget;
    if (el && el.scrollTop <= 2 && !isRefreshing) {
      setPullStartY(e.touches?.[0]?.clientY ?? null);
    } else {
      setPullStartY(null);
    }
  }, [isRefreshing]);

  const handleViewportTouchMove = useCallback((e) => {
    if (pullStartY === null || isRefreshing) return;
    const currentY = e.touches?.[0]?.clientY ?? pullStartY;
    const delta = currentY - pullStartY;
    if (delta > 0 && e.currentTarget.scrollTop <= 2) {
      setPullDistance(Math.min(92, Math.round(delta * 0.48)));
    } else {
      setPullDistance(0);
    }
  }, [pullStartY, isRefreshing]);

  const handleViewportTouchEnd = useCallback(async () => {
    if (pullDistance >= 54 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(52);
      triggerHaptic('medium');
      try {
        if (typeof hookData.refresh === 'function') {
          await hookData.refresh();
        }
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 450);
      }
    } else {
      setPullDistance(0);
    }
    setPullStartY(null);
  }, [pullDistance, isRefreshing, hookData]);

  // Attendance check-in trigger
  const handleOpenCheckIn = useCallback((activity = null) => {
    triggerHaptic('light');
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
      triggerHaptic('medium');
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
    triggerHaptic('success');
    setIsCheckInOpen(false);
    if (typeof hookData.refresh === 'function') {
      hookData.refresh();
    }
  }, [hookData]);

  // Save 10-second passwordless servant identity & run any pending RSVP action
  const handleSaveQuickIdentity = useCallback(
    async (profileInput) => {
      const saved = await saveServantProfile(communityId, profileInput);
      setClaimedIdentity(saved);
      if (pendingRsvpStatus && typeof hookData.submitRsvp === 'function') {
        await hookData.submitRsvp({
          memberId: saved.uid,
          name: saved.displayName,
          role: saved.role,
          station: saved.station,
          status: pendingRsvpStatus,
        });
        setPendingRsvpStatus(null);
      }
      setPendingActionLabel('');
    },
    [communityId, pendingRsvpStatus, hookData]
  );

  // 1-Tap Weekly Roll Call RSVP handler
  const handleTapRsvp = useCallback(
    async (status) => {
      triggerHaptic('medium');
      if (!effectiveUser) {
        setPendingRsvpStatus(status);
        setPendingActionLabel('Enter your name once to confirm your spot for this week:');
        setIsQuickIdentityOpen(true);
        return;
      }
      if (typeof hookData.submitRsvp === 'function') {
        await hookData.submitRsvp({
          memberId: effectiveUser.uid || effectiveUser.id,
          name: effectiveUser.displayName || effectiveUser.name || effectiveUser.firstName || 'Servant',
          role: effectiveUser.role || 'servant',
          station: effectiveUser.teamCode || effectiveUser.station || '',
          status,
        });
      }
    },
    [effectiveUser, hookData]
  );

  // Current user's RSVP entry for this week
  const myRsvpEntry = useMemo(() => {
    if (!effectiveUser || !Array.isArray(weeklyRollCall)) return null;
    const myId = effectiveUser.uid || effectiveUser.id;
    return weeklyRollCall.find((item) => item.memberId === myId) || null;
  }, [effectiveUser, weeklyRollCall]);

  // Confirmed count & list (Friday or Tuesday)
  const confirmedRollCall = useMemo(() => {
    if (!Array.isArray(weeklyRollCall)) return [];
    return weeklyRollCall.filter((item) => item.status !== 'unavailable');
  }, [weeklyRollCall]);

  // Deep-link URL query parameter auto-triggers (?checkin=1, ?serve=1, ?rsvp=friday, ?claim=1, ?meeting=1)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.location?.search) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkin') === '1' || params.get('checkin') === 'true') {
      setIsCheckInOpen(true);
    } else if (params.get('serve') === '1' || params.get('tab') === 'serve') {
      setHomeSegment('serve');
    } else if (params.get('meeting') === '1') {
      setIsServantMeetingModeOpen(true);
    } else if (params.get('rsvp') === 'friday' || params.get('claim') === '1') {
      if (!effectiveUser) {
        setPendingRsvpStatus('friday');
        setPendingActionLabel('Confirm your spot for Friday VBT Service in 10 seconds:');
        setIsQuickIdentityOpen(true);
      }
    }
  }, [effectiveUser]);

  // Render content based on currentTab
  const isHomeTab = currentTab === 'home';
  const isCommunityTab = currentTab === 'community';
  const isServeTab = currentTab === 'serve';
  const isScheduleTab = currentTab === 'schedule';
  const isProfileTab = currentTab === 'profile';

  return (
    <div
      data-testid="community-home-root"
      className="vbt-community-home-container vbt-native-shell w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col relative selection:bg-cyan-500/30 selection:text-cyan-200"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #0d1b3e 0%, #060914 80%, #03050a 100%)',
        fontFamily: "var(--font-body, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* Background Ambience Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* FIXED TOP NATIVE APP HEADER */}
      <CommunityHeader
        currentUser={effectiveUser}
        communityName={communityName}
        isOffline={isOffline}
        unreadCount={0}
        onOpenNotifications={onOpenNotifications}
        onOpenProfile={onOpenProfile || (() => handleSelectTab('profile'))}
        onOpenAuth={onOpenAdminLogin}
      />

      {/* NATIVE MOMENTUM SCROLL VIEWPORT (Independent scroll + Pull-to-Refresh) */}
      <main
        data-testid="native-scroll-viewport"
        onTouchStart={handleViewportTouchStart}
        onTouchMove={handleViewportTouchMove}
        onTouchEnd={handleViewportTouchEnd}
        className="vbt-native-scroll-viewport flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-12 space-y-4 sm:space-y-6"
      >
        {/* NATIVE PULL-TO-REFRESH INDICATOR */}
        {(pullDistance > 12 || isRefreshing) && (
          <div
            data-testid="pull-to-refresh-indicator"
            style={{ height: `${Math.max(36, pullDistance)}px` }}
            className="flex items-center justify-center transition-all duration-150 overflow-hidden"
          >
            <div className="px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-cyan-500/40 shadow-lg flex items-center gap-2 text-xs font-bold text-cyan-300">
              <span className={isRefreshing ? 'animate-spin' : ''}>
                {isRefreshing ? '🔄' : pullDistance >= 54 ? '⚡' : '↓'}
              </span>
              <span>
                {isRefreshing
                  ? 'Syncing live community data...'
                  : pullDistance >= 54
                  ? 'Release to refresh'
                  : 'Pull down to refresh'}
              </span>
            </div>
          </div>
        )}

        {/* STANDALONE FULLSCREEN APP INSTALL BANNER (When running in mobile browser tab) */}
        {!isStandalone && !installBannerDismissed && (
          <div
            data-testid="install-app-banner"
            className="lg:hidden p-3 rounded-2xl bg-gradient-to-r from-blue-950/90 via-slate-900/95 to-cyan-950/90 border border-cyan-500/35 shadow-md flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/Final VBT Re-Branding 2026-02 (3).png"
                alt="VBT Icon"
                className="w-9 h-9 rounded-xl bg-slate-950 p-1 border border-cyan-500/30 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate">
                  Get the Fullscreen VBT Mobile App
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  Remove browser bars &amp; enable instant court alerts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="install-app-cta-btn"
                onClick={handleTriggerInstallApp}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer shadow-sm"
              >
                Install
              </button>
              <button
                type="button"
                aria-label="Dismiss install banner"
                onClick={() => setInstallBannerDismissed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* LIVE EVENT HIGHLIGHT BANNER (If any live camp/gathering is ongoing) */}
        {activeEvents.length > 0 && (
          <section
            data-testid="live-activity-banner"
            className="w-full"
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
                  onClick={() => {
                    triggerHaptic('medium');
                    onEnterActivity?.(activeEvents[0].code || activeEvents[0].id);
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Enter Live Room</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* VIEW: HOME TAB */}
        {isHomeTab && (
          <div className="space-y-4 sm:space-y-6">
            {/* 10-SECOND PASSWORDLESS SERVANT & PLAYER PASS CLAIM STRIP (When not signed in yet) */}
            {!effectiveUser && (
              <section
                data-testid="quick-identity-claim-banner"
                className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-cyan-950/70 border border-emerald-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        No Password Needed
                      </span>
                      <span className="text-xs font-black text-white">
                        Servant or Youth Member?
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Set your name &amp; station once on your phone for 1-tap Friday check-in and station sign-ups.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  data-testid="open-quick-claim-btn"
                  onClick={() => {
                    triggerHaptic('light');
                    setPendingActionLabel('');
                    setIsQuickIdentityOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer shrink-0 transition-all"
                >
                  <span>Set My Name (10s)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </section>
            )}

            {/* SERVANT & LEADER 1-TAP COCKPIT STRIP (When signed in or quick-claimed) */}
            {effectiveUser && effectiveUser.role !== 'guest' && (
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
                        {(effectiveUser.role || 'Servant').replace(/_/g, ' ')} Cockpit
                      </span>
                      {(effectiveUser.teamCode || effectiveUser.roleCode || effectiveUser.station) && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Assigned: {(effectiveUser.teamCode || effectiveUser.roleCode || effectiveUser.station).replace(/_/g, ' ')}
                        </span>
                      )}
                      {effectiveUser.isQuickClaimed && (
                        <button
                          type="button"
                          onClick={() => setIsQuickIdentityOpen(true)}
                          className="text-[10px] font-bold text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                        >
                          Edit Pass
                        </button>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white mt-1">
                      Ready to serve, {effectiveUser.firstName || effectiveUser.displayName || effectiveUser.name || 'Servant'} — 1-Tap Field &amp; Meeting Controls
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
                    onClick={() => {
                      triggerHaptic('light');
                      setIsServantMeetingModeOpen(true);
                    }}
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
              currentUser={effectiveUser}
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

            {/* NATIVE iOS SEGMENTED CONTROL (Mobile/Tablet <1024px: Eliminates 4,000px Webpage Scroll) */}
            <div
              data-testid="native-home-segmented-control"
              className="lg:hidden sticky top-2 z-30"
            >
              <div className="vbt-segmented-control" role="tablist" aria-label="Home sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={homeSegment === 'week'}
                  data-testid="segment-tab-week"
                  onClick={() => handleSelectHomeSegment('week')}
                  className={`vbt-segmented-pill ${homeSegment === 'week' ? 'active' : ''}`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>This Week</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={homeSegment === 'serve'}
                  data-testid="segment-tab-serve"
                  onClick={() => handleSelectHomeSegment('serve')}
                  className={`vbt-segmented-pill ${homeSegment === 'serve' ? 'active' : ''}`}
                >
                  <Heart className="w-3.5 h-3.5 shrink-0" />
                  <span>Serve</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={homeSegment === 'pulse'}
                  data-testid="segment-tab-pulse"
                  onClick={() => handleSelectHomeSegment('pulse')}
                  className={`vbt-segmented-pill ${homeSegment === 'pulse' ? 'active' : ''}`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Pulse</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={homeSegment === 'tools'}
                  data-testid="segment-tab-tools"
                  onClick={() => handleSelectHomeSegment('tools')}
                  className={`vbt-segmented-pill ${homeSegment === 'tools' ? 'active' : ''}`}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>Quick Hub</span>
                </button>
              </div>
            </div>

            {/* RESPONSIVE 2-COLUMN GRID (Desktop: 2-col full dashboard; Mobile: Focused Active Segment) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* PRIMARY COLUMN (Desktop: 7 of 12 cols) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                {/* THIS WEEK'S RHYTHM & 1-TAP LIVE ROLL CALL SECTION */}
                <div
                  id="weekly-rhythm-section"
                  className={`space-y-4 ${homeSegment === 'week' ? 'block vbt-segment-animate' : 'hidden lg:block'}`}
                >
                  {/* 1-TAP WEEKLY ROLL CALL ("WHO'S IN THIS FRIDAY?") */}
                  <div
                    data-testid="weekly-roll-call-card"
                    className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950/40 to-slate-900 border border-cyan-500/35 shadow-lg space-y-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          ⚡ This Week&apos;s Roll Call
                        </span>
                        <h3 className="text-sm font-black text-white">
                          Are You Serving This Week?
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">
                        {confirmedRollCall.length > 0
                          ? `${confirmedRollCall.length} Confirmed`
                          : 'Tap below to confirm'}
                      </span>
                    </div>

                    {/* 3 1-Tap RSVP Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        data-testid="rsvp-btn-friday"
                        onClick={() => handleTapRsvp('friday')}
                        className={`py-2.5 px-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          myRsvpEntry?.status === 'friday'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Serving Friday</span>
                      </button>

                      <button
                        type="button"
                        data-testid="rsvp-btn-tuesday"
                        onClick={() => handleTapRsvp('tuesday')}
                        className={`py-2.5 px-2.5 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          myRsvpEntry?.status === 'tuesday'
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-white'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Tue + Fri</span>
                      </button>

                      <button
                        type="button"
                        data-testid="rsvp-btn-unavailable"
                        onClick={() => handleTapRsvp('unavailable')}
                        className={`py-2.5 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          myRsvpEntry?.status === 'unavailable'
                            ? 'bg-amber-500/25 text-amber-200 border-amber-400'
                            : 'bg-slate-900/70 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Can&apos;t Make It</span>
                      </button>
                    </div>

                    {/* Real-Data Confirmed Servant Roster Pills */}
                    {confirmedRollCall.length > 0 ? (
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {confirmedRollCall.slice(0, 8).map((person) => (
                            <span
                              key={person.id || person.memberId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/90 border border-slate-800 text-[11px] font-bold text-slate-200"
                            >
                              <span className="w-4 h-4 rounded-full bg-cyan-500/25 text-cyan-300 text-[9px] font-black flex items-center justify-center">
                                {person.initials || 'V'}
                              </span>
                              <span>{person.firstName || person.name}</span>
                              {person.station && (
                                <span className="text-[9px] text-amber-300 font-semibold">
                                  · {person.station.split(' ')[0]}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>

                        {myRsvpEntry && myRsvpEntry.status !== 'unavailable' && (
                          <button
                            type="button"
                            data-testid="share-rsvp-whatsapp-btn"
                            onClick={() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vbt-sports-team.web.app';
                              const msg = `✅ I just confirmed for Friday VBT Service (${myRsvpEntry.station || 'Servant Team'})! 🏀⚡\nTap to confirm your spot in 10 seconds:\n${origin}/?rsvp=friday`;
                              if (typeof window !== 'undefined') {
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Invite Team on WhatsApp</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Be the first servant to confirm for this week — tap your status above!
                      </p>
                    )}
                  </div>

                  <WeeklyRhythmCard
                    activities={activities}
                    currentUser={effectiveUser}
                    onCheckIn={handleOpenCheckIn}
                    onOpenActivity={handleOpenActivity}
                    onScanQR={() => handleOpenCheckIn()}
                    isOffline={isOffline}
                  />
                </div>

                {/* SERVING OPPORTUNITIES MARKETPLACE CARD */}
                <div
                  id="serving-marketplace-section"
                  className={homeSegment === 'serve' ? 'block vbt-segment-animate' : 'hidden lg:block'}
                >
                  <ServingOpportunitiesCard
                    opportunities={opportunities}
                    memberAvailability={memberContext?.availability}
                    currentUser={effectiveUser}
                    onExpressInterest={handleExpressInterest}
                    onSetAvailability={() => setIsPassportOpen(true)}
                    onOpenServePage={() => handleSelectTab('serve')}
                    isOffline={isOffline}
                    maxItems={3}
                  />
                </div>
              </div>

              {/* SECONDARY SIDEBAR / RAIL (Desktop: 5 of 12 cols; Mobile: 'tools' segment) */}
              <aside
                className={`lg:col-span-5 xl:col-span-4 space-y-6 ${
                  homeSegment === 'tools' ? 'block vbt-segment-animate' : 'hidden lg:block'
                }`}
              >
                {/* ROLE DASHBOARD (When logged in or quick-claimed) */}
                {effectiveUser && effectiveUser.role !== 'guest' && (
                  <div data-testid="role-dashboard-container">
                    <RoleDashboard
                      currentUser={effectiveUser}
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
                      onClick={() => {
                        triggerHaptic('light');
                        setIsJoinCodeOpen(true);
                      }}
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
                      onClick={() => {
                        triggerHaptic('light');
                        onRequestService?.();
                      }}
                      className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-850 border border-slate-700/80 text-left transition-all flex flex-col gap-1 cursor-pointer"
                    >
                      <Building className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white">Request Service</span>
                      <span className="text-[10px] text-slate-300">Book VBT team</span>
                    </button>

                    {/* Find Your Place */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setIsFindYourPlaceOpen(true);
                      }}
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
                      onClick={() => {
                        triggerHaptic('light');
                        onOpenAdminLogin?.();
                      }}
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
                        onClick={() => {
                          triggerHaptic('medium');
                          onCreateNewEvent();
                        }}
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
                      onClick={() => {
                        triggerHaptic('light');
                        setIsFindYourPlaceOpen(true);
                      }}
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

            {/* FULL-WIDTH COMMUNITY CULTURE & PULSE SECTION (Mobile: 'pulse' segment; Desktop: always shown) */}
            <div
              id="community-pulse-section"
              className={`pt-2 ${homeSegment === 'pulse' ? 'block vbt-segment-animate' : 'hidden lg:block'}`}
            >
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
              currentUser={effectiveUser}
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
              currentUser={effectiveUser}
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
              currentUser={effectiveUser}
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
              currentUser={effectiveUser}
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

            {effectiveUser ? (
              <div className="space-y-6">
                <RoleDashboard
                  currentUser={effectiveUser}
                  memberContext={memberContext}
                  onOpenVolunteerPass={() => setIsPassportOpen(true)}
                  onOpenServantMode={() => setIsServantMeetingModeOpen(true)}
                  onOpenCareDashboard={() => setIsHealthDashboardOpen(true)}
                  onOpenSafetyManager={() => setIsSafetyManagerOpen(true)}
                  onOpenSmartAssignment={() => setIsSmartAssignmentOpen(true)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  onOpenProfile={() => setIsQuickIdentityOpen(true)}
                  onLogout={() => {
                    clearSavedServantProfile();
                    setClaimedIdentity(null);
                    onLogout?.();
                  }}
                  isOffline={isOffline}
                />

                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRsvpStatus(null);
                      setPendingActionLabel(null);
                      setIsQuickIdentityOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/25 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Edit My Servant / Player Pass</span>
                  </button>
                  {!currentUser && (
                    <button
                      type="button"
                      onClick={onOpenAdminLogin}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Coordinator Admin Login</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      clearSavedServantProfile();
                      setClaimedIdentity(null);
                      onLogout?.();
                    }}
                    className="px-6 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:text-white hover:bg-rose-500/25 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out of Profile</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
                <Shield className="w-12 h-12 text-cyan-400 mx-auto" />
                <h2 className="text-xl font-black text-white">Claim Your Servant or Player Pass</h2>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Enter your name and station in 10 seconds to unlock 1-tap attendance check-in, weekly RSVP, and your servant passport.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRsvpStatus(null);
                      setPendingActionLabel(null);
                      setIsQuickIdentityOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>⚡ Claim Pass (No Password)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAdminLogin}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer"
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
        currentUser={effectiveUser}
        unreadCount={0}
      />

      {/* MODAL: ATTENDANCE CHECK-IN MODAL */}
      <AttendanceCheckInCard
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        currentUser={effectiveUser}
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
        currentUser={effectiveUser}
      />

      {/* MODAL: SERVANT PASSPORT */}
      <ServantPassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        currentUser={effectiveUser}
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
                currentUser={effectiveUser}
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
                currentUser={effectiveUser}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: YOUTH SAFETY MANAGER */}
      <YouthSafetyManagerModal
        isOpen={isSafetyManagerOpen}
        onClose={() => setIsSafetyManagerOpen(false)}
        currentUser={effectiveUser}
      />

      {/* MODAL: SMART ASSIGNMENT */}
      <SmartAssignmentModal
        isOpen={isSmartAssignmentOpen}
        onClose={() => setIsSmartAssignmentOpen(false)}
        currentUser={effectiveUser}
      />

      {/* MODAL: VBT AI ASSISTANT */}
      <VbtAiAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        currentUser={effectiveUser}
      />

      {/* MODAL: UNIFIED 3-TAB SERVANT & LEADER COMMAND SHEET */}
      <LeaderCommandSheet
        isOpen={isCommandSheetOpen}
        onClose={() => setIsCommandSheetOpen(false)}
        initialTab={commandSheetTab}
        currentUser={effectiveUser}
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

      {/* MODAL: NATIVE STANDALONE APP INSTALL SHEET */}
      <NativeInstallSheet
        isOpen={isInstallSheetOpen}
        onClose={() => setIsInstallSheetOpen(false)}
        isIOS={isIOSDevice()}
      />

      {/* MODAL: 10-SECOND PASSWORDLESS SERVANT & PLAYER IDENTITY SHEET */}
      <QuickIdentitySheet
        isOpen={isQuickIdentityOpen}
        onClose={() => {
          setIsQuickIdentityOpen(false);
          setPendingRsvpStatus(null);
          setPendingActionLabel(null);
        }}
        initialProfile={effectiveUser}
        onSaveIdentity={handleSaveQuickIdentity}
        pendingActionLabel={pendingActionLabel}
      />
    </div>
  );
}
