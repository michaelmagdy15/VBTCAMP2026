import React, { useState, useMemo } from 'react';
import {
  Zap,
  QrCode,
  Share2,
  Copy,
  Check,
  Calendar,
  Users,
  ShieldCheck,
  Sparkles,
  Bot,
  Award,
  Radio,
  Sun,
  HeartHandshake,
  ArrowRight,
  X,
  ClipboardList,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Clock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Build a clean, formatted WhatsApp / Clipboard briefing message for servants and leaders
 */
export function buildServantBriefingText({
  communityName = 'Value Blessings Team (VBT)',
  activeActivity = null,
  scripture = null,
  activities = [],
  currentUser = null,
  eventCode = 'july6',
}) {
  const primary = activeActivity || activities[0] || {
    title: 'VBT Service — Ard el Golf',
    date: 'Upcoming Service',
    time: '18:30',
    location: 'Main Court / Church Grounds',
  };

  const title = primary.title || primary.name || 'VBT Gathering';
  const dateStr = primary.date || 'This Week';
  const timeStr = primary.time || primary.startTime || '6:30 PM';
  const rawLoc = primary.location;
  const locStr =
    typeof rawLoc === 'object' && rawLoc !== null
      ? rawLoc.name || rawLoc.address || 'Main Church Court'
      : rawLoc || 'Main Church Court';
  const codeStr = primary.eventCode || primary.code || primary.id || eventCode || 'july6';

  const lines = [
    `⛪ *${communityName} — Servant Briefing*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📅 *Gathering:* ${title}`,
    `🕒 *Date & Time:* ${dateStr} · ${timeStr}`,
    `📍 *Location:* ${locStr}`,
    `🔑 *Live Room Code:* ${codeStr}`,
  ];

  if (currentUser?.name || currentUser?.displayName) {
    const uName = currentUser.displayName || currentUser.name;
    const uRole = (currentUser.role || 'Servant').replace(/_/g, ' ').toUpperCase();
    lines.push(`👤 *Sent by:* ${uName} (${uRole})`);
  }

  if (scripture?.reference && scripture?.textEn) {
    lines.push(
      ``,
      `📖 *Weekly Scripture (${scripture.reference}):*`,
      `"${scripture.textEn}"`
    );
    if (scripture.textAr) {
      lines.push(`"${scripture.textAr}"`);
    }
  }

  lines.push(
    ``,
    `⚡ *Quick Checklist for Servants:*`,
    `1️⃣ Arrive 30 mins early for prayer & station setup`,
    `2️⃣ Wear your VBT Servant Shirt`,
    `3️⃣ Scan the Door QR or enter code *${codeStr}* in the VBT App to check in & view your station`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🌐 Open App: ${typeof window !== 'undefined' ? window.location.origin : 'https://vbt-sports-team.web.app'}/?event=${encodeURIComponent(codeStr)}&checkin=1`
  );

  return lines.join('\n');
}

/**
 * LeaderCommandSheet Component
 *
 * A unified, thumb-friendly 3-Tab Command Hub (Before / During / After)
 * that gives church servants and meeting leaders 1-tap access to every power function
 * without cluttering the main feed.
 */
export default function LeaderCommandSheet({
  isOpen = false,
  onClose,
  initialTab = 'live', // 'prep' | 'live' | 'care'
  currentUser = null,
  activeActivity = null,
  activities = [],
  scripture = null,
  onCreateNewEvent,
  onEnterLiveEvent,
  onOpenSmartAssignment,
  onOpenServantMode,
  onOpenAiAssistant,
  onOpenSafetyManager,
  onOpenCareDashboard,
  onOpenVolunteerPass,
  onOpenCheckIn,
  onToggleFieldMode,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'live');
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const eventCode = useMemo(() => {
    return (
      activeActivity?.eventCode ||
      activeActivity?.code ||
      activeActivity?.id ||
      activities?.[0]?.eventCode ||
      activities?.[0]?.code ||
      activities?.[0]?.id ||
      'july6'
    );
  }, [activeActivity, activities]);

  const eventTitle = useMemo(() => {
    return (
      activeActivity?.title ||
      activeActivity?.name ||
      activities?.[0]?.title ||
      activities?.[0]?.name ||
      'VBT Service — Ard el Golf'
    );
  }, [activeActivity, activities]);

  const checkInUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vbt-sports-team.web.app';
    return `${origin}/?event=${encodeURIComponent(eventCode)}&checkin=1`;
  }, [eventCode]);

  const briefingText = useMemo(() => {
    return buildServantBriefingText({
      activeActivity,
      activities,
      scripture,
      currentUser,
      eventCode,
    });
  }, [activeActivity, activities, scripture, currentUser, eventCode]);

  if (!isOpen) return null;

  const handleCopyBriefing = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(briefingText);
      }
      setCopiedBriefing(true);
      setTimeout(() => setCopiedBriefing(false), 2500);
    } catch {
      setCopiedBriefing(true);
      setTimeout(() => setCopiedBriefing(false), 2500);
    }
  };

  const handleCopyCheckInLink = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(checkInUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(briefingText)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leader-command-sheet-title"
      data-testid="leader-command-sheet"
      className="fixed inset-0 z-[1250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-700/80 shadow-2xl text-white overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Grab Handle for Mobile */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="leader-command-sheet-title"
                  className="text-base sm:text-lg font-black tracking-tight text-white"
                >
                  Servant &amp; Leader Command Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  1-Tap Flow
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Everything you need before, during, and after service in one place
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close command hub"
            data-testid="close-command-sheet-btn"
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Mode Context Tabs: Before (Prep) | During (Live) | After (Care & Share) */}
        <div className="px-5 pt-3 pb-2 bg-slate-950/50 border-b border-slate-800/80 grid grid-cols-3 gap-2">
          <button
            type="button"
            data-testid="command-tab-prep"
            onClick={() => setActiveTab('prep')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'prep'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>1. Prep &amp; Plan</span>
          </button>

          <button
            type="button"
            data-testid="command-tab-live"
            onClick={() => setActiveTab('live')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2. Live On-Court</span>
          </button>

          <button
            type="button"
            data-testid="command-tab-care"
            onClick={() => setActiveTab('care')}
            className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'care'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>3. Share &amp; Care</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* ─── TAB 1: PREP & PLAN (BEFORE SERVICE / TUESDAY MEETING) ─── */}
          {activeTab === 'prep' && (
            <div data-testid="command-panel-prep" className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-blue-950/50 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    Fast Event Setup
                  </span>
                  <h3 className="text-sm font-black text-white mt-0.5">
                    Launch or Clone Next Friday&apos;s Service
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Pre-fills all 6 game stations, locations, and servant roles in 1 tap.
                  </p>
                </div>
                {onCreateNewEvent && (
                  <button
                    type="button"
                    data-testid="cmd-launch-event-btn"
                    onClick={() => {
                      onClose?.();
                      onCreateNewEvent();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Launch / Clone Event</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tuesday Servant Meeting Hub */}
                <button
                  type="button"
                  data-testid="cmd-servant-meeting-btn"
                  onClick={() => {
                    onClose?.();
                    onOpenServantMode?.();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                        Tuesday Meeting Mode
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Live agenda timer, station voting, action items &amp; attendance.
                    </p>
                  </div>
                </button>

                {/* Smart Auto-Assign */}
                <button
                  type="button"
                  data-testid="cmd-smart-assign-btn"
                  onClick={() => {
                    onClose?.();
                    onOpenSmartAssignment?.();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                        Smart Station Assigner
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Auto-balance referees and team leaders across Red &amp; Blue teams.
                    </p>
                  </div>
                </button>

                {/* AI Planning Assistant */}
                <button
                  type="button"
                  data-testid="cmd-ai-assistant-btn"
                  onClick={() => {
                    onClose?.();
                    onOpenAiAssistant?.();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                        AI Game &amp; Lesson Helper
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Generate sport station rules paired with biblical reflections.
                    </p>
                  </div>
                </button>

                {/* My Servant Passport */}
                <button
                  type="button"
                  data-testid="cmd-passport-btn"
                  onClick={() => {
                    onClose?.();
                    onOpenVolunteerPass?.();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                        My Servant Passport
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Update your weekly availability, role preferences &amp; badges.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 2: LIVE ON-COURT (DURING SERVICE / QR / SCOREBOARD) ─── */}
          {activeTab === 'live' && (
            <div data-testid="command-panel-live" className="space-y-4">
              {/* Instant Door QR Card for Leaders & Servants */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-800/95 via-slate-900 to-slate-950 border border-amber-500/35 shadow-lg">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div
                    onClick={() => setShowFullscreenQR(!showFullscreenQR)}
                    className={`bg-white p-3 rounded-2xl shadow-md cursor-pointer transition-all shrink-0 ${
                      showFullscreenQR ? 'scale-105 ring-4 ring-amber-400' : 'hover:scale-105'
                    }`}
                    title="Tap to enlarge QR code for scanning"
                  >
                    <QRCodeSVG
                      value={checkInUrl}
                      size={showFullscreenQR ? 210 : 128}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                      <QrCode className="w-3 h-3" />
                      <span>Door Check-In &amp; Auto-Assign QR</span>
                    </div>
                    <h3 className="text-base font-black text-white">
                      {eventTitle}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Hold up your phone so arriving servants can scan this QR with their camera to check in and get their station assignment automatically.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs font-bold text-cyan-300">
                        {`Code: ${eventCode}`}
                      </span>
                      <button
                        type="button"
                        data-testid="copy-checkin-link-btn"
                        onClick={handleCopyCheckInLink}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                            <span>Copy Check-In Link</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFullscreenQR(!showFullscreenQR)}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 cursor-pointer transition-colors"
                      >
                        {showFullscreenQR ? 'Shrink QR' : 'Enlarge QR'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Tap Live Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Enter Live Room */}
                <button
                  type="button"
                  data-testid="cmd-enter-live-room-btn"
                  onClick={() => {
                    onClose?.();
                    onEnterLiveEvent?.(eventCode);
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-rose-600/25 to-amber-600/20 hover:from-rose-600/35 hover:to-amber-600/30 border border-rose-500/40 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">
                        Enter Live Scoreboard &amp; Radio
                      </span>
                      <ArrowRight className="w-4 h-4 text-rose-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Open live court rotations, scores, and walkie-talkie for <strong>{eventCode}</strong>.
                    </p>
                  </div>
                </button>

                {/* Self Check-In / Camera Scanner */}
                <button
                  type="button"
                  data-testid="cmd-scan-qr-btn"
                  onClick={() => {
                    onClose?.();
                    onOpenCheckIn?.(activeActivity);
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">
                        My Attendance Check-In
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Scan a QR code or enter session token to confirm your attendance.
                    </p>
                  </div>
                </button>

                {/* Youth Safety & Medical Check */}
                <button
                  type="button"
                  data-testid="cmd-safety-manager-btn"
                  onClick={() => {
                    onClose?.();
                    onOpenSafetyManager?.();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-white">
                        Youth Safety &amp; Medical Roster
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Guardian pickup verification, allergy alerts &amp; incident log.
                    </p>
                  </div>
                </button>

                {/* Sunlight Field Mode Toggle */}
                {onToggleFieldMode && (
                  <button
                    type="button"
                    data-testid="cmd-field-mode-btn"
                    onClick={() => {
                      onToggleFieldMode();
                      onClose?.();
                    }}
                    className="p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-white">
                          Switch to Sunlight Field Mode
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Giant 1-thumb buttons &amp; simplified court view for referees.
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 3: SHARE & CARE (WHATSAPP BRIEFING & PASTORAL FOLLOW-UP) ─── */}
          {activeTab === 'care' && (
            <div data-testid="command-panel-care" className="space-y-4">
              {/* 1-Tap WhatsApp Briefing Generator */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/90 border border-emerald-500/35 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      1-Tap Servant Group Briefing
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">Ready for WhatsApp</span>
                </div>

                <pre
                  data-testid="briefing-preview-text"
                  className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto"
                >
                  {briefingText}
                </pre>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    data-testid="share-whatsapp-briefing-btn"
                    onClick={handleShareWhatsApp}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Send to WhatsApp Group</span>
                  </button>

                  <button
                    type="button"
                    data-testid="copy-briefing-text-btn"
                    onClick={handleCopyBriefing}
                    className="py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {copiedBriefing ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Briefing Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Pastoral Care & Follow-Up */}
              <button
                type="button"
                data-testid="cmd-care-dashboard-btn"
                onClick={() => {
                  onClose?.();
                  onOpenCareDashboard?.();
                }}
                className="w-full p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-left transition-all flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white group-hover:text-rose-300 transition-colors">
                      Pastoral Care &amp; Absent Follow-Up
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    See members who missed recent services, log pastoral check-ins, and celebrate milestones.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
