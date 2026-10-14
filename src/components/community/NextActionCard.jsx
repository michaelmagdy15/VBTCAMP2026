import React, { useId } from 'react';
import {
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  UserPlus,
  Compass,
  BookOpen,
  Users,
  CheckCheck,
  Heart,
  Phone,
  BarChart3,
  QrCode,
  FileText,
  RefreshCw,
  PlusCircle,
  Shield,
  Zap,
  Info,
  ChevronRight,
} from 'lucide-react';

/**
 * Registry of icons supported in CTA buttons and badges
 */
const ICON_REGISTRY = {
  UserPlus,
  Compass,
  Sparkles,
  Calendar,
  CheckCircle: CheckCircle2,
  CheckCircle2,
  BookOpen,
  CheckCheck,
  FileText,
  RefreshCw,
  PlusCircle,
  Users,
  BarChart3,
  Heart,
  Phone,
  QrCode,
  WifiOff,
  Clock,
  MapPin,
  Shield,
  Zap,
  AlertCircle,
  Info,
};

/**
 * Resolve an icon component from name or fallback
 */
function resolveIcon(iconName, FallbackIcon = ArrowRight) {
  if (!iconName) return FallbackIcon;
  if (typeof iconName === 'function' || typeof iconName === 'object') return iconName;
  return ICON_REGISTRY[iconName] || FallbackIcon;
}

/**
 * Variant configuration tokens for styling and glow
 */
const VARIANT_CONFIGS = {
  info: {
    bg: 'bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950/90',
    border: 'border-cyan-500/30 hover:border-cyan-500/50',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    ctaPrimary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-900/40',
    glowColor: 'rgba(6, 182, 212, 0.15)',
    iconColor: 'text-cyan-400',
  },
  primary: {
    bg: 'bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-slate-950/90',
    border: 'border-blue-500/30 hover:border-blue-500/50',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    ctaPrimary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    iconColor: 'text-blue-400',
  },
  success: {
    bg: 'bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-950/90',
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    ctaPrimary: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    iconColor: 'text-emerald-400',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-950/90',
    border: 'border-amber-500/35 hover:border-amber-500/60',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    ctaPrimary: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black shadow-amber-900/40',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    iconColor: 'text-amber-400',
  },
  urgent: {
    bg: 'bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950/90',
    border: 'border-rose-500/40 hover:border-rose-500/60',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    ctaPrimary: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-900/40',
    glowColor: 'rgba(244, 63, 94, 0.15)',
    iconColor: 'text-rose-400',
  },
  default: {
    bg: 'bg-slate-900/90',
    border: 'border-slate-800 hover:border-slate-700',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
    ctaPrimary: 'bg-slate-800 hover:bg-slate-700 text-white shadow-slate-900/40',
    glowColor: 'rgba(148, 163, 184, 0.1)',
    iconColor: 'text-slate-400',
  },
};

/**
 * NextActionCard Component
 *
 * Presents the single highest-priority next action for community participants:
 * - 8 Persona-aware themes & actions
 * - Accessible ARIA markup & keyboard controls
 * - Prominent CTA button and optional secondary action
 * - Metadata badge chips (arrival time, location, unfilled roles count, offline notice)
 * - Spiritual encouragement quote block
 */
export default function NextActionCard({
  action,
  summary,
  personaState: explicitPersonaState,
  onPrimaryAction,
  onSecondaryAction,
  onDismiss,
  compact = false,
  className = '',
}) {
  const headingId = useId();
  const descId = useId();

  // Normalize incoming action object
  const activeAction = action || summary?.nextAction || null;

  if (!activeAction) {
    return null;
  }

  const {
    id = 'vbt_next_action',
    title = 'Recommended Next Step',
    description = '',
    badge = 'Next Action',
    badgeVariant = 'primary',
    priority = 'high',
    primaryCta,
    secondaryCta,
    metadata = {},
    encouragement = '',
  } = activeAction;

  const config = VARIANT_CONFIGS[badgeVariant] || VARIANT_CONFIGS.default;
  const isUrgent = priority === 'urgent' || priority === 'high';

  // Primary & Secondary Icons
  const PrimaryIcon = resolveIcon(primaryCta?.icon, ArrowRight);
  const SecondaryIcon = resolveIcon(secondaryCta?.icon, ChevronRight);

  // Extract key metadata pills
  const metadataPills = [];

  if (metadata.isOffline) {
    metadataPills.push({
      key: 'offline_notice',
      label: 'Offline Ready',
      icon: WifiOff,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/25',
    });
  }

  if (metadata.arrivalTime) {
    metadataPills.push({
      key: 'arrival_time',
      label: `Arrive: ${metadata.arrivalTime}`,
      icon: Clock,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/25',
    });
  }

  if (metadata.location) {
    metadataPills.push({
      key: 'location',
      label: typeof metadata.location === 'object' ? metadata.location.name : metadata.location,
      icon: MapPin,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/25',
    });
  }

  if (typeof metadata.unfilledRolesCount === 'number' && metadata.unfilledRolesCount > 0) {
    metadataPills.push({
      key: 'unfilled_roles',
      label: `${metadata.unfilledRolesCount} Spots Open`,
      icon: Users,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/25',
    });
  }

  if (typeof metadata.unconfirmedAssignmentsCount === 'number' && metadata.unconfirmedAssignmentsCount > 0) {
    metadataPills.push({
      key: 'unconfirmed_count',
      label: `${metadata.unconfirmedAssignmentsCount} To Confirm`,
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/25',
    });
  }

  if (metadata.careFollowUpFlag) {
    metadataPills.push({
      key: 'care_flag',
      label: 'Pastoral Care Check-In',
      icon: Heart,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/25',
    });
  }

  if (metadata.nextActivity?.date) {
    metadataPills.push({
      key: 'activity_date',
      label: metadata.nextActivity.date,
      icon: Calendar,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/25',
    });
  }

  // Action Handlers
  const handlePrimaryClick = (e) => {
    e.stopPropagation();
    if (typeof onPrimaryAction === 'function') {
      onPrimaryAction(activeAction);
    }
  };

  const handleSecondaryClick = (e) => {
    e.stopPropagation();
    if (typeof onSecondaryAction === 'function') {
      onSecondaryAction(activeAction);
    }
  };

  return (
    <article
      role="region"
      aria-labelledby={headingId}
      aria-describedby={description ? descId : undefined}
      data-testid="next-action-card"
      data-action-id={id}
      data-persona={explicitPersonaState || activeAction.personaState}
      className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-4 sm:p-6 transition-all duration-300 shadow-xl backdrop-blur-md ${className}`}
      style={{
        boxShadow: `0 8px 30px -4px ${config.glowColor}, 0 2px 8px -2px rgba(0, 0, 0, 0.6)`,
      }}
    >
      {/* Background Decorative Accent Glow */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: config.glowColor }}
        aria-hidden="true"
      />

      {/* Header Row: Badge & Priority Indicator */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Persona / Category Status Badge */}
          <span
            data-testid="next-action-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${config.badgeBg}`}
          >
            <Sparkles className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>{badge}</span>
          </span>

          {/* Priority Pill if Urgent/High */}
          {isUrgent && (
            <span
              data-testid="next-action-priority"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
              <span>Priority</span>
            </span>
          )}
        </div>

        {/* Optional Dismiss button */}
        {typeof onDismiss === 'function' && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss next action recommendation"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        )}
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5 mb-4">
        <h3
          id={headingId}
          data-testid="next-action-title"
          className="text-lg sm:text-xl font-black text-white tracking-tight flex items-start gap-2"
        >
          <span>{title}</span>
        </h3>
        {description && (
          <p
            id={descId}
            data-testid="next-action-description"
            className="text-sm sm:text-base text-slate-300 leading-relaxed"
          >
            {description}
          </p>
        )}
      </div>

      {/* Metadata Chips / Status Pill Grid */}
      {metadataPills.length > 0 && (
        <div
          data-testid="next-action-metadata"
          className="flex flex-wrap items-center gap-2 mb-4"
          aria-label="Action Details"
        >
          {metadataPills.map((pill) => {
            const PillIcon = pill.icon;
            return (
              <div
                key={pill.key}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${pill.bg} ${pill.color}`}
              >
                <PillIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{pill.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Encouragement / Scripture quote box */}
      {encouragement && !compact && (
        <div
          data-testid="next-action-encouragement"
          className="mb-5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs sm:text-sm text-slate-300 italic flex items-start gap-2.5"
        >
          <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="leading-snug">{encouragement}</span>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
        {/* Primary CTA Button */}
        {primaryCta && (
          <button
            type="button"
            data-testid="next-action-primary-cta"
            onClick={handlePrimaryClick}
            aria-label={`${primaryCta.label}: ${title}`}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${config.ctaPrimary}`}
          >
            <span>{primaryCta.label}</span>
            <PrimaryIcon className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
        )}

        {/* Secondary CTA Button */}
        {secondaryCta && (
          <button
            type="button"
            data-testid="next-action-secondary-cta"
            onClick={handleSecondaryClick}
            aria-label={`${secondaryCta.label}: ${title}`}
            className="min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 transition-all flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <span>{secondaryCta.label}</span>
            <SecondaryIcon className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
