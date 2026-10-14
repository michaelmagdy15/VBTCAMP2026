import React, { useState, useMemo, useCallback } from 'react';
import {
  Compass,
  HeartHandshake,
  ClipboardCheck,
  QrCode,
  Sparkles,
  RotateCw,
  Calendar,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Info,
  Flame,
  Shield,
  Award,
  BookOpen,
  X,
} from 'lucide-react';
import {
  getCurrentRitualPhase,
  getRitualPhaseGuidance,
  formatRitualTimeline,
  WEEKLY_RITUAL_PHASE,
} from '../../services/weeklyRitualService';
import { VBT_ROLES } from '../../contracts/communityContracts';

/**
 * Icon component mapping for ritual phases
 */
const PHASE_ICONS = {
  [WEEKLY_RITUAL_PHASE.EARLY_WEEK]: Compass,
  [WEEKLY_RITUAL_PHASE.MIDWEEK]: HeartHandshake,
  [WEEKLY_RITUAL_PHASE.BEFORE_EVENT]: ClipboardCheck,
  [WEEKLY_RITUAL_PHASE.MEETING_DAY]: QrCode,
  [WEEKLY_RITUAL_PHASE.AFTER_EVENT]: Sparkles,
  [WEEKLY_RITUAL_PHASE.NEXT_CYCLE]: RotateCw,
};

/**
 * WeeklyRitualBanner Component
 *
 * Compact, elegant banner placed at the top of the community homepage.
 * Displays the current stage in the weekly ritual, guidance text, and a prompt
 * for the user's weekly next step, with an expandable 6-stage rhythm roadmap.
 */
export default function WeeklyRitualBanner({
  userRole = VBT_ROLES.MEMBER,
  userStatus = 'normal',
  currentUser = null,
  currentUserProfile = null,
  currentDate = null,
  onNavigateTab = null,
  onAction = null,
  onOpenQRScanner = null,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [copiedVerse, setCopiedVerse] = useState(false);

  // Compute effective role from props or profile
  const effectiveRole = useMemo(() => {
    return currentUserProfile?.role || currentUser?.role || userRole || VBT_ROLES.MEMBER;
  }, [currentUserProfile, currentUser, userRole]);

  // Compute effective status
  const effectiveStatus = useMemo(() => {
    return userStatus || currentUserProfile?.status || 'normal';
  }, [userStatus, currentUserProfile]);

  // Compute current ritual phase and guidance
  const currentPhase = useMemo(() => {
    return getCurrentRitualPhase(currentDate);
  }, [currentDate]);

  const guidance = useMemo(() => {
    return getRitualPhaseGuidance(currentPhase, effectiveRole, effectiveStatus);
  }, [currentPhase, effectiveRole, effectiveStatus]);

  const timeline = useMemo(() => {
    return formatRitualTimeline(currentDate);
  }, [currentDate]);

  // Select matching Lucide icon
  const PhaseIcon = PHASE_ICONS[currentPhase] || Compass;

  // Handle CTA button click
  const handleCtaClick = useCallback(() => {
    const { actionType, targetTab } = guidance.callToAction;

    if (actionType === 'qr_scan' && typeof onOpenQRScanner === 'function') {
      onOpenQRScanner();
      return;
    }

    if (typeof onAction === 'function') {
      onAction(actionType, targetTab);
    }

    if (typeof onNavigateTab === 'function' && targetTab) {
      onNavigateTab(targetTab);
    }
  }, [guidance, onAction, onNavigateTab, onOpenQRScanner]);

  // Copy scripture verse to clipboard
  const handleCopyVerse = useCallback(async () => {
    if (!guidance.reflectionVerse) return;
    try {
      const textToCopy = `"${guidance.reflectionVerse.text}"\n${guidance.reflectionVerse.arabic || ''}\n— ${guidance.reflectionVerse.ref} (VBT Fellowship)`;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
      setCopiedVerse(true);
      setTimeout(() => setCopiedVerse(false), 2500);
    } catch {
      // Non-blocking clipboard error
    }
  }, [guidance.reflectionVerse]);

  // If user minimized the banner, render a sleek compact pill
  if (isMinimized) {
    return (
      <aside
        aria-label="Weekly Community Ritual Summary"
        className={`w-full bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 px-4 shadow-lg transition-all duration-300 hover:border-slate-700 ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
              style={{ backgroundColor: guidance.accentColor }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">
              Weekly Rhythm: <span className="text-white font-bold">{guidance.title}</span> ({guidance.stageRange})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleCtaClick}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1"
            >
              <span>{guidance.callToAction.label}</span>
              <ArrowRight className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Expand Ritual Banner"
              aria-label="Expand Ritual Banner"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Weekly Community Ritual Banner"
      className={`w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/90 shadow-xl p-4 sm:p-5 transition-all duration-300 ${className}`}
    >
      {/* Decorative ambient backdrop glow */}
      <div
        className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: guidance.accentColor }}
      />

      {/* Top Meta Bar: Stage Badge, Progress Dots, Rhythm Toggle, Minimize Button */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Phase Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${guidance.badgeBg} ${guidance.badgeBorder} ${guidance.badgeText}`}
          >
            <span
              className="w-2 h-2 rounded-full animate-ping"
              style={{ backgroundColor: guidance.accentColor }}
            />
            <span>
              Stage {guidance.stageNumber} of 6 • {guidance.title} ({guidance.stageRange})
            </span>
          </span>

          {/* Persona / Role Context Pill */}
          <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/50 border border-slate-700/40">
            For:{' '}
            <span className="text-slate-200">
              {effectiveRole
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (char) => char.toUpperCase())}
            </span>
          </span>

        </div>

        {/* 6-Stage Rhythm Dots & Expansion Controls */}
        <div className="flex items-center gap-3">
          {/* Mini 6-stage indicator */}
          <div
            className="hidden md:flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded-full border border-slate-800/60"
            title={timeline.formattedSummary}
          >
            {timeline.stages.map((stg) => {
              const isActive = stg.isCurrent;
              const isPast = stg.isPast;
              return (
                <div
                  key={stg.id}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-4 bg-white shadow-sm ring-1 ring-indigo-400'
                      : isPast
                      ? 'bg-slate-500'
                      : 'bg-slate-800'
                  }`}
                  title={`${stg.number}. ${stg.name} (${stg.days})`}
                />
              );
            })}
          </div>

          {/* Toggle Full Rhythm Journey */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 transition-colors"
            aria-expanded={isExpanded}
          >
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">
              {isExpanded ? 'Hide Weekly Rhythm' : 'View Weekly Rhythm'}
            </span>
            <span className="sm:hidden">{isExpanded ? 'Hide' : 'Rhythm'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize Banner Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
            title="Minimize banner"
            aria-label="Minimize banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Banner Body: Icon, Headline, Guidance, and Call-To-Action */}
      <div className="pt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 max-w-3xl">
          {/* Phase Hero Icon */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-inner transition-transform duration-300 hover:scale-105"
            style={{
              backgroundColor: `${guidance.accentColor}1A`,
              borderColor: `${guidance.accentColor}4D`,
            }}
          >
            <PhaseIcon className="w-5 h-5" style={{ color: guidance.accentColor }} />
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{guidance.headline}</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {guidance.guidanceText}
            </p>

            {/* Weekly Next Step Callout */}
            <div className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-amber-300/90">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/25">
                Next Step
              </span>
              <span className="truncate">{guidance.nextStep}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2 self-stretch md:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={handleCtaClick}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
            style={{
              backgroundColor: guidance.accentColor,
              boxShadow: `0 4px 14px ${guidance.accentColor}40`,
            }}
          >
            <span>{guidance.callToAction.label}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable 6-Stage Weekly Rhythm Roadmap & Devotional Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                The 6 Weekly Ritual Stages
              </h3>
              <p className="text-xs text-slate-400">
                The recurring spiritual and operational rhythm of the VBT community.
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/25">
              {timeline.completionPercentage}% Cycle Complete
            </span>
          </div>

          {/* 6 Stages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {timeline.stages.map((stage) => {
              const StageIconComponent = PHASE_ICONS[stage.id] || Compass;
              const isCurrent = stage.isCurrent;
              const isCompleted = stage.isPast;

              return (
                <div
                  key={stage.id}
                  className={`rounded-2xl p-3 border transition-all duration-200 ${
                    isCurrent
                      ? 'bg-slate-800/90 border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-md'
                      : isCompleted
                      ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                      : 'bg-slate-950/40 border-slate-900 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${stage.accentColor}20`,
                          color: stage.accentColor,
                        }}
                      >
                        <StageIconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-white truncate">
                        {stage.number}. {stage.name}
                      </span>
                    </div>

                    {/* Status Pill */}
                    {isCurrent ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Current
                      </span>
                    ) : isCompleted ? (
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        Done
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">Upcoming</span>
                    )}
                  </div>

                  <p className="text-[11px] font-semibold text-slate-400 mb-1">
                    {stage.days}
                  </p>
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                    {stage.summary}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Stage Spiritual Verse & Role Checklist Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Reflection Scripture Card */}
            {guidance.reflectionVerse && (
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800/80 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Spiritual Focus • {guidance.reflectionVerse.ref}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyVerse}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                  >
                    {copiedVerse ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-200 italic leading-relaxed">
                  "{guidance.reflectionVerse.text}"
                </p>
                {guidance.reflectionVerse.arabic && (
                  <p className="text-xs text-amber-200/80 font-arabic text-right leading-relaxed dir-rtl" dir="rtl">
                    {guidance.reflectionVerse.arabic}
                  </p>
                )}
              </div>
            )}

            {/* Stage Checklist Card */}
            {guidance.checklist && guidance.checklist.length > 0 && (
              <div className="rounded-2xl bg-slate-950/70 border border-slate-800/80 p-3.5 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400/90 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  This Stage’s Focus Checklist
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {guidance.checklist.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
