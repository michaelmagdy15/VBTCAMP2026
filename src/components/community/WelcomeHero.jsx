import React, { useState, useMemo } from 'react';
import {
  Camera,
  QrCode,
  Key,
  Flame,
  Trophy,
  Heart,
  Users,
  Shield,
  Award,
  Sparkles,
  Zap,
  Calendar,
  Clock,
  ArrowRight,
  User,
  HeartHandshake,
  CheckCircle2,
  ChevronRight,
  Tag,
  Hash
} from 'lucide-react';

/**
 * Brand Pillars configuration for Visitor State
 */
const BRAND_PILLARS = [
  {
    key: 'faith',
    label: 'Faith',
    icon: Flame,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/25',
    glow: 'rgba(251, 191, 36, 0.15)',
  },
  {
    key: 'sport',
    label: 'Sport',
    icon: Trophy,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/25',
    glow: 'rgba(34, 211, 238, 0.15)',
  },
  {
    key: 'service',
    label: 'Service',
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/25',
    glow: 'rgba(251, 113, 133, 0.15)',
  },
  {
    key: 'community',
    label: 'Community',
    icon: Users,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/25',
    glow: 'rgba(96, 165, 250, 0.15)',
  },
];

/**
 * Role badge metadata mappings
 */
const ROLE_CONFIGS = {
  admin: {
    label: 'Admin',
    icon: Shield,
    textColor: 'text-rose-300',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-500/30',
  },
  coordinator: {
    label: 'Coordinator',
    icon: Award,
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
  },
  team_leader: {
    label: 'Team Leader',
    icon: Users,
    textColor: 'text-blue-300',
    bgColor: 'bg-blue-500/15',
    borderColor: 'border-blue-500/30',
  },
  servant: {
    label: 'Servant',
    icon: Sparkles,
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/30',
  },
  member: {
    label: 'Member',
    icon: User,
    textColor: 'text-sky-300',
    bgColor: 'bg-sky-500/15',
    borderColor: 'border-sky-500/30',
  },
};

/**
 * Compute time-based greeting
 */
export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Extract clean first name
 */
export function getFirstName(currentUser, memberProfile) {
  if (memberProfile?.firstName && String(memberProfile.firstName).trim()) {
    return String(memberProfile.firstName).trim();
  }
  const rawDisplayName = currentUser?.displayName || currentUser?.name || memberProfile?.displayName || memberProfile?.name;
  if (rawDisplayName && typeof rawDisplayName === 'string') {
    const clean = rawDisplayName.trim();
    const parts = clean.split(/\s+/);
    if (parts[0]) return parts[0];
  }
  return 'Servant';
}

/**
 * Extract 2-letter uppercase initials
 */
export function getInitials(currentUser, memberProfile) {
  if (memberProfile?.firstName && memberProfile?.lastName) {
    return `${memberProfile.firstName[0]}${memberProfile.lastName[0]}`.toUpperCase();
  }
  const rawName = memberProfile?.firstName || currentUser?.displayName || currentUser?.name || memberProfile?.name || 'V';
  const clean = String(rawName).replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean[0] ? clean[0].toUpperCase() : 'V';
}

/**
 * Normalize arbitrary role string into standardized key
 */
export function normalizeRoleKey(rawRole) {
  if (!rawRole) return 'member';
  const r = String(rawRole).toLowerCase().trim();
  if (r.includes('admin') || r.includes('director')) return 'admin';
  if (r.includes('coord')) return 'coordinator';
  if (r.includes('team_leader') || r.includes('team leader')) return 'team_leader';
  if (r.includes('servant') || r.includes('service') || r.includes('volunteer')) return 'servant';
  if (r.includes('leader')) return 'team_leader';
  return 'member';
}

/**
 * Contextual CTA Priority Engine
 * Returns highest priority action item according to business rules:
 * 1. Attendance open for today's activity -> ⚡ Check in to {activity.title}
 * 2. Pending serving assignment -> 🤝 Confirm your serving assignment
 * 3. Upcoming weekly service registration available -> 📅 See this week's service
 * 4. Open serving opportunities exist -> ❤️ Find a way to serve ({openOpportunitiesCount} spots open)
 * 5. Default -> ✨ Explore community
 */
export function resolveContextualCta({
  upcomingActivity,
  pendingAssignment,
  openOpportunitiesCount,
  onCheckIn,
  onConfirmServing,
  onExploreWeek,
  onOpenServe,
}) {
  // 1. Attendance is open for today's activity
  const isAttendanceOpen = Boolean(
    upcomingActivity &&
    (upcomingActivity.isAttendanceOpen === true ||
      upcomingActivity.isCheckInOpen === true ||
      upcomingActivity.attendanceOpen === true ||
      upcomingActivity.checkInAvailable === true ||
      upcomingActivity.status === 'live' ||
      (upcomingActivity.status === 'active' && upcomingActivity.isToday))
  );

  if (isAttendanceOpen) {
    const activityTitle = upcomingActivity.title || upcomingActivity.name || "Today's Activity";
    return {
      priority: 1,
      type: 'check_in',
      label: `⚡ Check in to ${activityTitle}`,
      ariaLabel: `Check in to ${activityTitle}`,
      icon: Zap,
      badge: 'Live Attendance',
      gradient: 'from-blue-600 via-cyan-500 to-indigo-600 hover:from-blue-500 hover:via-cyan-400 hover:to-indigo-500',
      borderGlow: 'border-cyan-300/50 shadow-cyan-500/30',
      accentColor: 'text-cyan-300',
      onClick: () => onCheckIn?.(upcomingActivity),
    };
  }

  // 2. Pending serving assignment
  const hasPendingAssignment = Boolean(
    pendingAssignment &&
    (pendingAssignment.status === 'pending' ||
      pendingAssignment.status === 'assigned' ||
      pendingAssignment.needsConfirmation === true ||
      (!pendingAssignment.status && (pendingAssignment.role || pendingAssignment.roleTitle)))
  );

  if (hasPendingAssignment) {
    const roleTitle = pendingAssignment.roleTitle || pendingAssignment.role || 'Service Position';
    return {
      priority: 2,
      type: 'confirm_serving',
      label: '🤝 Confirm your serving assignment',
      ariaLabel: `Confirm your serving assignment for ${roleTitle}`,
      icon: HeartHandshake,
      badge: roleTitle,
      gradient: 'from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400',
      borderGlow: 'border-amber-300/50 shadow-amber-500/30',
      accentColor: 'text-amber-300',
      onClick: () => onConfirmServing?.(pendingAssignment),
    };
  }

  // 3. Upcoming weekly service registration available
  const hasUpcomingService = Boolean(
    upcomingActivity &&
    (upcomingActivity.isRegistrationOpen === true ||
      upcomingActivity.canRegister === true ||
      upcomingActivity.serviceType ||
      upcomingActivity.date ||
      upcomingActivity.title)
  );

  if (hasUpcomingService) {
    return {
      priority: 3,
      type: 'see_service',
      label: "📅 See this week's service",
      ariaLabel: "See this week's service details and register",
      icon: Calendar,
      badge: upcomingActivity.title || 'Weekly Gathering',
      gradient: 'from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600',
      borderGlow: 'border-blue-400/40 shadow-blue-600/30',
      accentColor: 'text-blue-300',
      onClick: () => onExploreWeek?.(upcomingActivity),
    };
  }

  // 4. Open serving opportunities exist
  const count = typeof openOpportunitiesCount === 'number' ? openOpportunitiesCount : 0;
  if (count > 0) {
    const pluralSpots = count === 1 ? '1 spot open' : `${count} spots open`;
    return {
      priority: 4,
      type: 'open_serve',
      label: `❤️ Find a way to serve (${pluralSpots})`,
      ariaLabel: `Find a way to serve, ${pluralSpots}`,
      icon: Heart,
      badge: pluralSpots,
      gradient: 'from-rose-500 via-pink-600 to-amber-500 hover:from-rose-400 hover:via-pink-500 hover:to-amber-400',
      borderGlow: 'border-rose-400/40 shadow-rose-500/30',
      accentColor: 'text-rose-300',
      onClick: () => onOpenServe?.(),
    };
  }

  // 5. Default
  return {
    priority: 5,
    type: 'explore_community',
    label: '✨ Explore community',
    ariaLabel: 'Explore VBT community activities and updates',
    icon: Sparkles,
    badge: 'Connect',
    gradient: 'from-blue-600 via-cyan-600 to-indigo-600 hover:from-blue-500 hover:via-cyan-500 hover:to-indigo-500',
    borderGlow: 'border-cyan-400/40 shadow-cyan-600/25',
    accentColor: 'text-cyan-300',
    onClick: () => onExploreWeek?.(),
  };
}

/**
 * WelcomeHero Component
 * 
 * Supports both:
 * 1. Visitor State (when !currentUser)
 * 2. Member State (when currentUser is truthy)
 */
export default function WelcomeHero({
  currentUser = null,
  memberProfile = null,
  upcomingActivity = null,
  pendingAssignment = null,
  openOpportunitiesCount = 0,
  onCheckIn,
  onConfirmServing,
  onExploreWeek,
  onJoinCommunity,
  onScanQR,
  onEnterCode,
  onOpenServe,
}) {
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  // Time-based greeting
  const greeting = useMemo(() => getTimeGreeting(), []);

  // Personalized name & initials
  const firstName = useMemo(() => getFirstName(currentUser, memberProfile), [currentUser, memberProfile]);
  const initials = useMemo(() => getInitials(currentUser, memberProfile), [currentUser, memberProfile]);

  // Role metadata
  const rawRole = memberProfile?.role || currentUser?.role;
  const roleKey = normalizeRoleKey(rawRole);
  const roleMeta = ROLE_CONFIGS[roleKey] || ROLE_CONFIGS.member;
  const RoleIcon = roleMeta.icon;

  // Assigned team identification
  const assignedTeam =
    memberProfile?.teamName ||
    memberProfile?.team ||
    memberProfile?.assignedTeam ||
    currentUser?.team ||
    currentUser?.teamName;

  // Avatar photo
  const photoUrl = memberProfile?.photoUrl || memberProfile?.photoURL || currentUser?.photoURL;

  // Contextual Primary Action Button
  const contextualCta = useMemo(() => {
    return resolveContextualCta({
      upcomingActivity,
      pendingAssignment,
      openOpportunitiesCount,
      onCheckIn,
      onConfirmServing,
      onExploreWeek,
      onOpenServe,
    });
  }, [
    upcomingActivity,
    pendingAssignment,
    openOpportunitiesCount,
    onCheckIn,
    onConfirmServing,
    onExploreWeek,
    onOpenServe,
  ]);

  const CtaIcon = contextualCta.icon;

  return (
    <section
      aria-label="Welcome and Quick Actions"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#091124] via-[#0B1528] to-[#070D18] p-6 sm:p-8 md:p-10 border border-slate-800/90 shadow-2xl text-slate-100 transition-all duration-300"
      style={{
        fontFamily: "var(--font-body, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* ── Ambient Background Glows ──────────────────────────────── */}
      <div
        className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-25"
        style={{
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-28 -left-20 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{
          background: pendingAssignment
            ? 'radial-gradient(circle, #f59e0b 0%, transparent 70%)'
            : 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40"
        aria-hidden="true"
      />

      {/* ── Content Container ─────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col gap-6 sm:gap-7">
        {!currentUser ? (
          /* ─────────────────────────────────────────────────────────── */
          /* VISITOR STATE                                               */
          /* ─────────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Brand Pillars Micro-Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 select-none">
                VBT Pillars:
              </span>
              {BRAND_PILLARS.map((pillar) => {
                const PillarIcon = pillar.icon;
                return (
                  <span
                    key={pillar.key}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${pillar.bg} ${pillar.color} ${pillar.border} backdrop-blur-md shadow-sm transition-all hover:scale-105 select-none`}
                  >
                    <PillarIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{pillar.label}</span>
                  </span>
                );
              })}
            </div>

            {/* Headline & Subtitle */}
            <div className="space-y-2 max-w-3xl">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight"
                style={{
                  fontFamily: "var(--font-title, 'Outfit', -apple-system, sans-serif)",
                }}
              >
                Find your place in VBT
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
                A church sports community built around faith, friendship, and serving.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              {/* [Join VBT] - Bright VBT Blue */}
              <button
                type="button"
                onClick={() => onJoinCommunity?.()}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-base shadow-xl shadow-blue-600/35 border border-blue-400/40 transition-all duration-200 active:scale-[0.98] min-h-[48px] cursor-pointer group"
                aria-label="Join VBT Community"
              >
                <span>Join VBT</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* [Explore this week] - Glass Button */}
              <button
                type="button"
                onClick={() => onExploreWeek?.()}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white font-semibold text-base border border-white/20 backdrop-blur-md shadow-lg transition-all duration-200 active:scale-[0.98] min-h-[48px] cursor-pointer group"
                aria-label="Explore this week's activities"
              >
                <span>Explore this week</span>
                <ChevronRight className="w-4 h-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            {/* Secondary Quick Action Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Quick Actions:
              </span>

              <button
                type="button"
                onClick={() => onScanQR?.()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.98] cursor-pointer"
                aria-label="Scan Attendance QR Code"
              >
                <Camera className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-semibold">Scan Attendance QR</span>
              </button>

              <button
                type="button"
                onClick={() => onEnterCode?.()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.98] cursor-pointer"
                aria-label="Join with event code"
              >
                <Key className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold">Join with event code</span>
              </button>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────── */
          /* MEMBER STATE                                                */
          /* ─────────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Header: Personalized Greeting & Headline */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                  {greeting}, {firstName}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
              </div>

              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight"
                style={{
                  fontFamily: "var(--font-title, 'Outfit', -apple-system, sans-serif)",
                }}
              >
                Welcome back to VBT
              </h1>
            </div>

            {/* Member Status Row */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              {/* Avatar / Initials with Active Dot */}
              <div className="relative shrink-0">
                {photoUrl && !avatarImgFailed ? (
                  <img
                    src={photoUrl}
                    alt={`${firstName}'s avatar`}
                    onError={() => setAvatarImgFailed(true)}
                    className="w-11 h-11 rounded-full object-cover border-2 border-slate-700 shadow-md"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-sm border-2 border-slate-700 shadow-md select-none">
                    {initials}
                  </div>
                )}
                <span
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#091124]"
                  title="Active"
                />
              </div>

              {/* Identity & Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Role Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleMeta.bgColor} ${roleMeta.textColor} ${roleMeta.borderColor} shadow-sm select-none`}
                >
                  <RoleIcon className="w-3.5 h-3.5" />
                  <span>{roleMeta.label}</span>
                </span>

                {/* Assigned Team Badge (if applicable) */}
                {assignedTeam && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-sm select-none">
                    <Trophy className="w-3.5 h-3.5 text-blue-400" />
                    <span>{`Team ${assignedTeam}`}</span>
                  </span>
                )}

                {/* Additional Serving/Ministry hint if available */}
                {memberProfile?.ministry && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-slate-300 bg-slate-800/80 border border-slate-700 select-none">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{memberProfile.ministry}</span>
                  </span>
                )}
              </div>
            </div>

            {/* ── Contextual Primary Action Button ────────────────────── */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={contextualCta.onClick}
                aria-label={contextualCta.ariaLabel}
                className={`w-full group relative overflow-hidden flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r ${contextualCta.gradient} text-white shadow-xl ${contextualCta.borderGlow} border transition-all duration-200 active:scale-[0.99] cursor-pointer min-h-[56px] text-left`}
              >
                {/* Subtle sheen highlight effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    <CtaIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <span className="block text-base sm:text-lg font-black tracking-tight leading-snug drop-shadow-sm">
                      {contextualCta.label}
                    </span>
                    {contextualCta.badge && (
                      <span className="inline-block mt-0.5 text-xs font-semibold text-white/90">
                        {contextualCta.badge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 shrink-0 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </button>

              {/* ── Quick Action Chips Below ───────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                {/* Chip 1: Scan QR */}
                <button
                  type="button"
                  onClick={() => onScanQR?.()}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  aria-label="Scan QR Code"
                >
                  <QrCode className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Scan QR</span>
                </button>

                {/* Chip 2: Enter Code */}
                <button
                  type="button"
                  onClick={() => onEnterCode?.()}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  aria-label="Enter Attendance or Event Code"
                >
                  <Key className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Enter Code</span>
                </button>

                {/* Chip 3: My Schedule */}
                <button
                  type="button"
                  onClick={() => onExploreWeek?.(upcomingActivity)}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 text-xs sm:text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  aria-label="View My Schedule and Services"
                >
                  <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>My Schedule</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}


export { WelcomeHero };
