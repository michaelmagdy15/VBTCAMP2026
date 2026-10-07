import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  QrCode,
  Heart,
  Users,
  Award,
  Trophy,
  Sparkles,
  Clock,
  ArrowRight,
  Bell,
  Shield,
  MapPin,
  Flame,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Copy,
  Check,
  RotateCw,
  Zap,
  Info,
} from 'lucide-react';
import {
  subscribeToUpcomingServices,
  formatTimeRange,
  getNextDayOfWeekDate,
  SERVICE_TYPES,
} from '../services/serviceMeetingService';
import { subscribeToMembers } from '../services/memberService';
import { DEFAULT_COMMUNITY_ID } from '../firebase';

// Role Badge and Styling Configurations
const ROLE_CONFIG = {
  admin: {
    label: 'Admin / Director',
    rank: 'Director Level',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/30',
    icon: Shield,
  },
  coordinator: {
    label: 'Coordinator',
    rank: 'Lead Coordinator',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    icon: Award,
  },
  service_leader: {
    label: 'Service Leader',
    rank: 'Service Lead',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    icon: Award,
  },
  team_leader: {
    label: 'Team Leader',
    rank: 'Team Shepherd',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    icon: Users,
  },
  leader: {
    label: 'Team Leader',
    rank: 'Team Shepherd',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    icon: Users,
  },
  game_leader: {
    label: 'Game Leader',
    rank: 'Sports Official',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: Trophy,
  },
  referee: {
    label: 'Referee',
    rank: 'Sports Official',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    icon: Trophy,
  },
  servant: {
    label: 'Servant',
    rank: 'Faithful Servant',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    border: 'border-cyan-500/30',
    icon: Sparkles,
  },
  volunteer: {
    label: 'Volunteer',
    rank: 'Active Volunteer',
    color: 'text-slate-300',
    bg: 'bg-slate-700/50',
    border: 'border-slate-600',
    icon: Heart,
  },
  member: {
    label: 'Community Member',
    rank: 'Valued Member',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    icon: Users,
  },
};

// Curated Weekly Spiritual Verses
const SPIRITUAL_VERSES = [
  {
    ref: '1 Corinthians 9:24-25',
    text: 'Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize. Everyone who competes in the games goes into strict training. They do it to get a crown that will not last, but we do it to get a crown that will last forever.',
    arabic: 'ألستم تعلمون أن الذين يركضون في الميدان جميعهم يركضون، ولكن واحداً يأخذ الجعالة؟ هكذا اركضوا لكي تنالوا.',
    tag: '#Discipline & Eternity',
    theme: 'Endurance',
  },
  {
    ref: 'Hebrews 12:1-2',
    text: 'Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us, fixing our eyes on Jesus.',
    arabic: 'لذلك نحن أيضاً إذ لنا سحابة من الشهود مقدار هذه محيطة بنا، لنطرح كل ثقل، ولنحاضر بالصبر في الجهاد الموضوع أمامنا، ناظرين إلى رئيس الإيمان ومكمله يسوع.',
    tag: '#EyesOnJesus',
    theme: 'Perseverance',
  },
  {
    ref: 'Colossians 3:23-24',
    text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters, since you know that you will receive an inheritance from the Lord as a reward. It is the Lord Christ you are serving.',
    arabic: 'وكل ما فعلتم، فاعملوا من القلب، كما للرب ليس للناس، عالمين أنكم من الرب ستأخذون جزاء الميراث، لأنكم تخدمون الرب المسيح.',
    tag: '#ServeWithHeart',
    theme: 'Service',
  },
  {
    ref: 'Philippians 4:13',
    text: 'I can do all things through Christ who gives me strength.',
    arabic: 'أستطيع كل شيء في المسيح الذي يقويني.',
    tag: '#StrengthInChrist',
    theme: 'Courage',
  },
  {
    ref: 'Ecclesiastes 4:9-10',
    text: 'Two are better than one, because they have a good return for their labor: If either of them falls down, one can help the other up. But pity anyone who falls and has no one to help them up.',
    arabic: 'اثنان خير من واحد، لأن لهما أجرة صالحة لتعبهما. لأنه إن وقع أحدهما يقيمه رفيقه.',
    tag: '#Brotherhood & Fellowship',
    theme: 'Unity',
  },
  {
    ref: '1 Timothy 4:8',
    text: 'For physical training is of some value, but godliness has value for all things, holding promise for both the present life and the life to come.',
    arabic: 'لأن الرياضة الجسدية نافعة لقليل، ولكن التقوى نافعة لكل شيء، إذ لها موعد الحياة الحاضرة والعتيدة.',
    tag: '#SpiritualFitness',
    theme: 'Holiness',
  },
];

// Helper to safely format friendly date
function formatFriendlyDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Helper to parse location string or object
function getDisplayLocation(location) {
  if (!location) return 'Main Sanctuary & Gym Court';
  if (typeof location === 'string') return location;
  if (typeof location === 'object') {
    return location.name || location.address || 'Main Sanctuary & Gym Court';
  }
  return 'Main Sanctuary & Gym Court';
}

// Helper to compute countdown values
function computeCountdown(gathering, currentTimestamp) {
  if (!gathering || !gathering.date) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isLive: false };
  }

  const parts = gathering.date.split('-');
  if (parts.length !== 3) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isLive: false };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const timeParts = (gathering.startTime || '18:30').split(':');
  const hours = parseInt(timeParts[0], 10) || 18;
  const minutes = parseInt(timeParts[1], 10) || 30;

  const targetDate = new Date(year, month, day, hours, minutes, 0);
  const targetMs = targetDate.getTime();
  const diffMs = targetMs - currentTimestamp;

  // Gathering duration window: 3.5 hours
  const eventDurationMs = 3.5 * 60 * 60 * 1000;

  if (diffMs <= 0 && diffMs >= -eventDurationMs) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isLive: true };
  }

  if (diffMs < -eventDurationMs) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isLive: false };
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  return { days: d, hours: h, minutes: m, seconds: s, isPast: false, isLive: false };
}

export default function CommunityHomeDashboard({
  currentUser,
  currentUserProfile,
  isAdmin = false,
  isLeader = false,
  communityId = DEFAULT_COMMUNITY_ID,
  onNavigateTab,
  onOpenQRScanner,
  onOpenProfile,
}) {
  const [services, setServices] = useState([]);
  const [members, setMembers] = useState([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [verseOffset, setVerseOffset] = useState(0);
  const [copiedVerse, setCopiedVerse] = useState(false);
  const [rsvpFeedback, setRsvpFeedback] = useState('');

  // Local storage RSVP tracker initialized without triggering cascading render
  const [rsvpMap, setRsvpMap] = useState(() => {
    try {
      const stored = localStorage.getItem('vbt_gathering_rsvps');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Ticking interval for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time subscription to upcoming services
  useEffect(() => {
    const unsub = subscribeToUpcomingServices(communityId, (list) => {
      setServices(list);
    });
    return () => unsub();
  }, [communityId]);

  // Real-time subscription to community members
  useEffect(() => {
    const unsub = subscribeToMembers(communityId, (list) => {
      setMembers(list);
    });
    return () => unsub();
  }, [communityId]);

  // Determine greeting based on local hour
  const timeGreeting = useMemo(() => {
    const hour = new Date(nowMs).getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, [nowMs]);

  // Extract member name
  const memberName = useMemo(() => {
    return (
      currentUserProfile?.displayName ||
      currentUserProfile?.firstName ||
      currentUser?.name ||
      currentUser?.displayName ||
      'VBT Servant'
    );
  }, [currentUserProfile, currentUser]);

  // Extract avatar initials
  const avatarInitials = useMemo(() => {
    if (currentUserProfile?.firstName && currentUserProfile?.lastName) {
      return `${currentUserProfile.firstName[0]}${currentUserProfile.lastName[0]}`.toUpperCase();
    }
    const cleanName = memberName.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '').trim();
    const parts = cleanName.split(' ');
    if (parts.length > 1 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return cleanName[0] ? cleanName[0].toUpperCase() : 'V';
  }, [currentUserProfile, memberName]);

  // Role info and rank
  const effectiveRole = currentUserProfile?.role || currentUser?.role || (isAdmin ? 'admin' : isLeader ? 'leader' : 'member');
  const roleMeta = ROLE_CONFIG[effectiveRole] || ROLE_CONFIG.member;
  const RoleIcon = roleMeta.icon;

  // Fallback next Friday gathering if no services currently created
  const fallbackGathering = useMemo(() => {
    const nextFridayDate = getNextDayOfWeekDate(5);
    return {
      id: `std_friday_${nextFridayDate}`,
      title: 'Friday VBT Fellowship & Sports',
      serviceType: SERVICE_TYPES.WEEKLY_SERVICE,
      date: nextFridayDate,
      startTime: '18:30',
      endTime: '21:30',
      location: 'Church Sanctuary & Sports Court',
      description: 'Weekly worship, spiritual message, followed by basketball, volleyball, and community games.',
      leadServantName: 'VBT Leadership Team',
      attendeesCount: 48,
    };
  }, []);

  // Primary next gathering
  const nextGathering = useMemo(() => {
    if (services && services.length > 0) {
      return services[0];
    }
    return fallbackGathering;
  }, [services, fallbackGathering]);

  // Countdown calculations for next gathering
  const countdown = useMemo(() => {
    return computeCountdown(nextGathering, nowMs);
  }, [nextGathering, nowMs]);

  // RSVP status for the next gathering
  const userRsvpKey = useMemo(() => {
    const userId = currentUser?.uid || currentUserProfile?.id || 'guest';
    const serviceId = nextGathering?.id || 'default';
    return `${userId}_${serviceId}`;
  }, [currentUser, currentUserProfile, nextGathering]);

  const isRsvpDone = Boolean(rsvpMap[userRsvpKey]);

  // Toggle RSVP handler
  const handleToggleRsvp = useCallback(() => {
    setRsvpMap((prev) => {
      const nextState = !prev[userRsvpKey];
      const updated = { ...prev, [userRsvpKey]: nextState };
      try {
        localStorage.setItem('vbt_gathering_rsvps', JSON.stringify(updated));
      } catch {
        // Safe localStorage fallback
      }
      return updated;
    });

    if (!isRsvpDone) {
      setRsvpFeedback("You're RSVP'd! See you at the gathering! 🎉");
    } else {
      setRsvpFeedback('RSVP cancelled.');
    }

    setTimeout(() => {
      setRsvpFeedback('');
    }, 3500);
  }, [userRsvpKey, isRsvpDone]);

  // Current Spiritual Verse selection
  const weekNumber = useMemo(() => {
    const d = new Date();
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  }, []);

  const currentVerse = useMemo(() => {
    const idx = (weekNumber + verseOffset) % SPIRITUAL_VERSES.length;
    const safeIdx = idx >= 0 ? idx : (idx + SPIRITUAL_VERSES.length) % SPIRITUAL_VERSES.length;
    return SPIRITUAL_VERSES[safeIdx] || SPIRITUAL_VERSES[0];
  }, [weekNumber, verseOffset]);

  // Copy spiritual verse to clipboard
  const handleCopyVerse = useCallback(async () => {
    try {
      const textToShare = `"${currentVerse.text}"\n${currentVerse.arabic}\n— ${currentVerse.ref} (VBT Fellowship)`;
      await navigator.clipboard.writeText(textToShare);
      setCopiedVerse(true);
      setTimeout(() => setCopiedVerse(false), 2500);
    } catch {
      // Ignore clipboard write restrictions
    }
  }, [currentVerse]);

  // Safe tab navigation caller
  const handleNavigate = useCallback(
    (tabId) => {
      if (typeof onNavigateTab === 'function') {
        onNavigateTab(tabId);
      }
    },
    [onNavigateTab]
  );

  // Safe QR scanner caller
  const handleOpenScanner = useCallback(() => {
    if (typeof onOpenQRScanner === 'function') {
      onOpenQRScanner();
    }
  }, [onOpenQRScanner]);

  // Safe Profile caller
  const handleOpenUserProfile = useCallback(() => {
    if (typeof onOpenProfile === 'function') {
      onOpenProfile();
    }
  }, [onOpenProfile]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalMembers = members.length > 0 ? members.length : 42;
    const activeServants = members.filter((m) =>
      ['admin', 'coordinator', 'service_leader', 'team_leader', 'leader', 'game_leader', 'referee', 'servant'].includes(
        m.role
      )
    ).length;
    const weeklyGatheringsCount = services.length > 0 ? services.length : 2;

    return {
      totalMembers,
      weeklyGatheringsCount,
      activeServants: activeServants > 0 ? activeServants : 14,
      attendanceRate: '94%',
    };
  }, [members, services]);

  return (
    <div className="space-y-6 pb-24 text-slate-100 max-w-7xl mx-auto px-3 sm:px-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. WELCOME BANNER & SERVANT BADGE */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6 sm:p-8 border border-slate-800 shadow-2xl">
        {/* Ambient Decorative Lighting */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* User Introduction */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Value Blessings Team Community</span>
              </span>

              {/* Servant Role Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleMeta.bg} ${roleMeta.color} ${roleMeta.border}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <span>{roleMeta.label}</span>
              </span>
            </div>

            <div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 tracking-wide uppercase">
                {timeGreeting},
              </p>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2 mt-0.5">
                <span>{memberName}</span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Active" />
              </h1>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Serving together in fellowship, prayer, and sports. Stay connected with weekly services and live team
              activities.
            </p>
          </div>

          {/* Quick Profile Pill / Avatar Button & Notifications */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleNavigate('timeline')}
              className="p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700/80 shadow-lg hover:border-amber-500/40 transition-all relative group"
              title="View Community Announcements & Feed"
            >
              <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full" />
            </button>

            <button
              onClick={handleOpenUserProfile}
              className="flex items-center gap-3.5 p-2 pr-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 shadow-lg hover:border-cyan-500/40 transition-all group"
              title="View and edit your servant profile"
            >
              <div className="relative">
                {currentUserProfile?.photoUrl ? (
                  <img
                    src={currentUserProfile.photoUrl}
                    alt={memberName}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-600 group-hover:border-cyan-400 transition-colors"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-base shadow-inner">
                    {avatarInitials}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>

              <div className="text-left">
                <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <span>My Profile</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {roleMeta.rank}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. QUICK ACTION ROW (4 HIGH-PRIORITY ACTION CARDS) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Scan QR Check-in (Prominent 1-Tap Card) */}
        <button
          onClick={handleOpenScanner}
          className="relative group text-left overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 p-5 shadow-xl shadow-cyan-900/30 border border-cyan-400/40 hover:scale-[1.02] active:scale-[0.99] transition-all"
        >
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <QrCode className="w-6 h-6 group-hover:rotate-6 transition-transform" />
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/25 text-[11px] font-bold text-cyan-200 border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
              <span>1-Tap Scan</span>
            </span>
          </div>

          <h3 className="text-base font-extrabold text-white">Scan QR Check-in</h3>
          <p className="text-xs text-cyan-100 mt-1 line-clamp-2">
            Instant attendance at weekly gathering or sports court
          </p>

          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
            <span>Open Scanner</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* Card 2: Next Gathering Preview */}
        <button
          onClick={() => handleNavigate('services')}
          className="relative text-left rounded-2xl bg-slate-900/80 hover:bg-slate-850 p-5 border border-slate-800 hover:border-cyan-500/40 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                Gatherings
              </span>
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
              Next Gathering
            </h3>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-medium">
              {nextGathering.title}
            </p>
            <p className="text-[11px] text-cyan-400/90 mt-1 font-mono">
              {formatFriendlyDate(nextGathering.date)} • {nextGathering.startTime || '18:30'}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 group-hover:text-cyan-300 transition-colors">
            <span>View Schedule</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 3: Serving Roster */}
        <button
          onClick={() => handleNavigate('serve')}
          className="relative text-left rounded-2xl bg-slate-900/80 hover:bg-slate-850 p-5 border border-slate-800 hover:border-purple-500/40 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-800/40">
                Active Roles
              </span>
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
              Serving Roster
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Active sports stations, hospitality & logistics spots
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 group-hover:text-purple-300 transition-colors">
            <span>Browse Spots</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Card 4: Prayer Wall */}
        <button
          onClick={() => handleNavigate('prayer')}
          className="relative text-left rounded-2xl bg-slate-900/80 hover:bg-slate-850 p-5 border border-slate-800 hover:border-rose-500/40 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Heart className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-800/40">
                Spiritual
              </span>
            </div>

            <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
              Prayer Wall
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Share requests, pray for teammates, and celebrate praises
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 group-hover:text-rose-300 transition-colors">
            <span>Lift in Prayer</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. NEXT UPCOMING GATHERING HERO CARD (WITH LIVE COUNTDOWN & RSVP) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-2xl p-6 sm:p-8">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Gathering Details */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>UPCOMING GATHERING</span>
              </span>

              {countdown.isLive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold border border-emerald-500/40 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>HAPPENING NOW • CHECK IN OPEN</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {countdown.days > 0 ? `In ${countdown.days} day${countdown.days > 1 ? 's' : ''}` : 'Today'}
                  </span>
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {nextGathering.title}
            </h2>

            {nextGathering.description && (
              <p className="text-sm text-slate-300 leading-relaxed">
                {nextGathering.description}
              </p>
            )}

            {/* Information Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Date & Time</div>
                  <div className="font-semibold text-white">
                    {formatFriendlyDate(nextGathering.date)} • {formatTimeRange(nextGathering.startTime, nextGathering.endTime) || '6:30 PM - 9:30 PM'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Location</div>
                  <div className="font-semibold text-white">
                    {getDisplayLocation(nextGathering.location)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown & Action Box */}
          <div className="flex flex-col items-center lg:items-end justify-center gap-5 shrink-0 bg-slate-950/60 p-6 rounded-2xl border border-slate-800 shadow-inner">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center lg:text-right">
              {countdown.isLive ? 'Gathering In Session' : 'Countdown to Kickoff'}
            </div>

            {/* Live Timer Digits */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 min-w-[56px] sm:min-w-[64px]">
                <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                  {String(countdown.days).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Days</div>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 min-w-[56px] sm:min-w-[64px]">
                <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                  {String(countdown.hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Hours</div>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 min-w-[56px] sm:min-w-[64px]">
                <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                  {String(countdown.minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Mins</div>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-2.5 min-w-[56px] sm:min-w-[64px]">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  {String(countdown.seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Secs</div>
              </div>
            </div>

            {/* RSVP and Check-in Buttons */}
            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 mt-1">
              {/* RSVP Button */}
              <button
                onClick={handleToggleRsvp}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  isRsvpDone
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {isRsvpDone ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Attending (RSVP&apos;d)</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-slate-400" />
                    <span>1-Tap RSVP</span>
                  </>
                )}
              </button>

              {/* Check-in QR Scanner Button */}
              <button
                onClick={handleOpenScanner}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>Check In</span>
              </button>
            </div>

            {rsvpFeedback && (
              <p className="text-xs text-emerald-400 font-semibold animate-fade-in text-center">
                {rsvpFeedback}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. WEEKLY SPIRITUAL VERSE & ENCOURAGEMENT CARD */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-7 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Spiritual Focus for the Week</span>
                <span className="text-[11px] font-normal text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {currentVerse.tag}
                </span>
              </h3>
            </div>
          </div>

          {/* Verse Actions: Next/Previous & Copy */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setVerseOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              title="Read another scripture verse"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyVerse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Copy scripture to share"
            >
              {copiedVerse ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Verse Content */}
        <div className="space-y-3">
          <blockquote className="text-sm sm:text-base font-medium text-slate-200 italic leading-relaxed">
            &ldquo;{currentVerse.text}&rdquo;
          </blockquote>

          {currentVerse.arabic && (
            <p className="text-xs sm:text-sm text-amber-200/90 font-arabic text-right leading-relaxed" dir="rtl">
              &laquo;{currentVerse.arabic}&raquo;
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-cyan-400 tracking-wide">
              {currentVerse.ref}
            </span>
            <span className="text-[11px] text-slate-400">
              VBT Spiritual Growth & Fellowship
            </span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 5. COMMUNITY METRICS AT A GLANCE */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>Community Pulse</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Real-time sync</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Stat 1: Total Members */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Total Members</span>
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.totalMembers}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">+100%</span>
              <span>registered profile</span>
            </div>
          </div>

          {/* Stat 2: Weekly Gatherings */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Scheduled Gatherings</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.weeklyGatheringsCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Friday & Sunday slots
            </div>
          </div>

          {/* Stat 3: Active Servants */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Active Servants</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {metrics.activeServants}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Leadership & Ministry
            </div>
          </div>

          {/* Stat 4: Community Fellowship Spirit */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Fellowship Streak</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 flex items-center gap-1.5">
              <span>Active</span>
              <Flame className="w-6 h-6 fill-amber-400" />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Reliable weekly attendance
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 6. EXPLORE COMMUNITY FEATURES & MODULES */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Community Hub</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Hub 1: Teams & Squads */}
          <button
            onClick={() => handleNavigate('teams')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                Teams & Groups
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Rosters, points & camp squads
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-300 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Hub 2: Scoreboard & Standings */}
          <button
            onClick={() => handleNavigate('scoreboard')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                Camp Scoreboard
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Live rankings & match results
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Hub 3: Spiritual Growth */}
          <button
            onClick={() => handleNavigate('growth')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Spiritual Growth
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Bible studies & servant lessons
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Hub 4: Community Directory */}
          <button
            onClick={() => handleNavigate('community')}
            className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                Member Directory
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Connect with servant family
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 7. LEADERSHIP PORTAL SHORTCUTS (FOR ADMINS & LEADERS) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {(isAdmin || isLeader) && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-900/50 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>Leader & Coordinator Console</span>
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                  {isAdmin ? 'ADMIN' : 'LEADER'}
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Schedule services, manage projector QR attendance, and review roster status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleNavigate('services')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              Manage Services
            </button>
            <button
              onClick={() => handleNavigate('community')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
            >
              Directory
            </button>
          </div>
        </div>
      )}

      {/* Footer Info Note */}
      <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
        <Info className="w-3.5 h-3.5 text-cyan-400" />
        <span>VBT Sports Community App • Value Blessings Team &copy; 2026</span>
      </div>
    </div>
  );
}
