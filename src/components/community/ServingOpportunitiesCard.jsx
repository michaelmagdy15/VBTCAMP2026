import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  HeartHandshake,
  HandHeart,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  CalendarClock,
  Award,
  WifiOff,
  Send,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  MEMBER_SERVING_STATES,
  resolveMemberServingState,
  getRoleDisplayInfo,
  formatServingDateTime,
  formatSpotsRemaining,
  getOpportunityBadges,
  formatMemberAvailabilitySummary,
} from './servingOpportunitiesUtils';

/**
 * Lightweight Modal / Form for Expressing Serving Interest
 */
export function ServeInterestModal({
  opportunity,
  currentUser,
  isOpen,
  onClose,
  onSubmit,
}) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !opportunity) return null;

  const roleInfo = getRoleDisplayInfo(opportunity);
  const dateTimeStr = formatServingDateTime(opportunity);
  const spotsInfo = formatSpotsRemaining(opportunity);
  const locationStr =
    opportunity.location?.name ||
    opportunity.location?.address ||
    opportunity.location ||
    opportunity.venue ||
    'Main Church Gymnasium';
  const activityName =
    opportunity.activityName ||
    opportunity.serviceTitle ||
    opportunity.activityTitle ||
    opportunity.serviceName ||
    'Friday Service & Youth Sports';

  const memberName =
    currentUser?.displayName || currentUser?.name || 'Servant';

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (typeof onSubmit === 'function') {
        await onSubmit(opportunity, note);
      }
      setNote('');
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to submit serving interest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="serve-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-950/40 text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top warm gold accent line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <HandHeart className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3
                id="serve-modal-title"
                className="text-lg sm:text-xl font-black text-white tracking-tight"
              >
                {`I Can Serve: ${roleInfo.roleTitle}`}
              </h3>
              <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                {activityName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-850 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Opportunity Details Summary Box */}
          <div className="p-3.5 rounded-xl bg-slate-850/90 border border-slate-800 text-xs sm:text-sm space-y-2 text-slate-200">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-semibold text-white">{dateTimeStr}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {spotsInfo.label}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="line-clamp-1">{locationStr}</span>
            </div>

            <div className="pt-1.5 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
              <span>
                Applying as: <strong className="text-slate-200">{memberName}</strong>
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Note Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="serve-interest-notes"
              className="block text-xs sm:text-sm font-semibold text-slate-200"
            >
              Add a note for coordinators <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="serve-interest-notes"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Available 30 min before setup, certified in CPR, or preferring station 2..."
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 hover:border-slate-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 p-3 text-sm text-white placeholder-slate-500 transition-all outline-none resize-none"
            />
            <p className="text-[11px] text-slate-400">
              The ministry team will review and confirm your serving station.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 font-bold text-sm transition-all flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-slate-950 font-black text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirm & Express Interest</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * ServingOpportunitiesCard Component
 *
 * Displays 2-3 open serving opportunities in the VBT community homepage,
 * with role needed, activity name, schedule, location, spots remaining, badges,
 * member state, "I can serve" modal flow, and quick availability management.
 */
export default function ServingOpportunitiesCard({
  opportunities = [],
  memberAvailability = null,
  currentUser = null,
  onExpressInterest,
  onSetAvailability,
  onOpenServePage,
  isLoading = false,
  isOffline = false,
  maxItems = 3,
  className = '',
}) {
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Take top 2-3 open opportunities
  const visibleOpportunities = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    return opportunities.slice(0, maxItems || 3);
  }, [opportunities, maxItems]);

  const availabilitySummary = useMemo(() => {
    return formatMemberAvailabilitySummary(memberAvailability);
  }, [memberAvailability]);

  const handleOpenModal = useCallback((opp) => {
    setSelectedOpportunity(opp);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedOpportunity(null);
  }, []);

  const handleModalSubmit = useCallback(
    async (opp, note) => {
      if (typeof onExpressInterest === 'function') {
        await onExpressInterest(opp, note);
      }
    },
    [onExpressInterest]
  );

  // 1. LOADING SKELETON
  if (isLoading) {
    return (
      <section
        role="status"
        aria-busy="true"
        aria-label="Loading serving opportunities..."
        className={`relative overflow-hidden rounded-[20px] bg-slate-900/95 border border-slate-800 shadow-xl p-5 sm:p-6 ${className}`}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 absolute top-0 left-0 right-0" />
        <span className="sr-only">Loading serving opportunities...</span>

        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-5 w-36 rounded-lg bg-slate-800 animate-pulse" />
              <div className="h-3 w-48 rounded bg-slate-800/70 animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-28 rounded-xl bg-slate-800 animate-pulse" />
        </div>

        {/* Opportunity Card Skeletons */}
        <div className="space-y-3.5 mb-5">
          {[1, 2].map((idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-850/80 border border-slate-800 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 rounded-lg bg-slate-800" />
                <div className="h-5 w-20 rounded-full bg-slate-800" />
              </div>
              <div className="h-4 w-3/4 rounded bg-slate-800/80" />
              <div className="flex gap-4">
                <div className="h-4 w-28 rounded bg-slate-800/70" />
                <div className="h-4 w-32 rounded bg-slate-800/70" />
              </div>
              <div className="h-11 w-full rounded-xl bg-slate-800" />
            </div>
          ))}
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-9 w-36 rounded-xl bg-slate-800 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-800 animate-pulse" />
        </div>
      </section>
    );
  }

  // 2. EMPTY STATE
  if (!visibleOpportunities || visibleOpportunities.length === 0) {
    return (
      <section
        aria-label="Serve with VBT Opportunities"
        className={`relative overflow-hidden rounded-[20px] bg-slate-900/95 border border-slate-800/90 shadow-xl p-5 sm:p-7 text-center ${className}`}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 absolute top-0 left-0 right-0" />

        {isOffline && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Working offline — showing cached schedule.</span>
          </div>
        )}

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4 shadow-inner">
          <CheckCircle2 className="w-7 h-7 text-amber-400" />
        </div>

        <h3 className="text-lg sm:text-xl font-black text-white mb-2 tracking-tight">
          All serving spots are filled this week. Thank you!
        </h3>

        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6 font-medium">
          Every station is covered by faithful servants. Thank you for making our sports camp possible!
          You can keep your serving availability up to date for upcoming weeks.
        </p>

        {availabilitySummary && (
          <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Your current availability: <strong className="text-white">{availabilitySummary}</strong></span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSetAvailability}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-white font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 transition-all shadow-sm"
          >
            <CalendarClock className="w-4 h-4 text-amber-400" />
            <span>Update My Availability</span>
          </button>

          <button
            type="button"
            onClick={onOpenServePage}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 text-amber-300 hover:text-amber-200 font-bold text-xs sm:text-sm border border-amber-500/40 flex items-center gap-2 transition-all"
          >
            <span>View all serving opportunities</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    );
  }

  // 3. ACTIVE OPPORTUNITIES RENDER
  return (
    <section
      aria-label="Serve with VBT Opportunities"
      className={`relative overflow-hidden rounded-[20px] bg-slate-900/95 border border-slate-800/90 shadow-xl p-5 sm:p-6 ${className}`}
    >
      {/* Warm Gold / Coral top highlight banner */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 absolute top-0 left-0 right-0" />

      {/* Offline Notice Banner */}
      {isOffline && (
        <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Working offline — showing cached serving opportunities. Interest submissions will sync when reconnected.</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <HeartHandshake className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Serve with VBT
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {`${visibleOpportunities.length} Open`}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Step into ministry · Volunteer alongside your teammates
            </p>
          </div>
        </div>

        {/* Quick availability action in header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSetAvailability}
            aria-label="Update My Availability"
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <CalendarClock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Update My Availability</span>
          </button>
        </div>
      </div>

      {/* Member Availability Overview (if configured) */}
      {availabilitySummary && (
        <div className="mb-4 px-3.5 py-2 rounded-xl bg-slate-850/80 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Your current availability:</span>
            <strong className="text-white font-semibold">{availabilitySummary}</strong>
          </div>
          <button
            type="button"
            onClick={onSetAvailability}
            className="min-h-[44px] text-amber-400 hover:text-amber-300 font-bold text-xs underline underline-offset-2 flex items-center"
          >
            Edit
          </button>
        </div>
      )}

      {/* Opportunities List (2 or 3 items) */}
      <div className="space-y-3.5 mb-5">
        {visibleOpportunities.map((opportunity, index) => {
          const oppId = opportunity.id || `opp_${index}`;
          const roleInfo = getRoleDisplayInfo(opportunity);
          const RoleIcon = roleInfo.icon;
          const dateTimeStr = formatServingDateTime(opportunity);
          const spotsInfo = formatSpotsRemaining(opportunity);
          const badges = getOpportunityBadges(opportunity);
          const memberState = resolveMemberServingState(opportunity, currentUser);

          const activityName =
            opportunity.activityName ||
            opportunity.serviceTitle ||
            opportunity.activityTitle ||
            opportunity.serviceName ||
            'Friday Service & Youth Sports';

          const locationStr =
            opportunity.location?.name ||
            opportunity.location?.address ||
            opportunity.location ||
            opportunity.venue ||
            'Main Church Gymnasium';

          return (
            <article
              key={oppId}
              aria-label={`Serving Opportunity: ${roleInfo.roleTitle}`}
              className="p-4 sm:p-5 rounded-2xl bg-slate-850/90 border border-slate-800/90 hover:border-amber-500/40 transition-all shadow-sm"
            >
              {/* Role & Spots Header */}
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <RoleIcon className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base sm:text-lg tracking-tight">
                      {roleInfo.roleTitle}
                    </h3>
                    <p className="text-xs text-amber-400/90 font-medium">
                      {activityName}
                    </p>
                  </div>
                </div>

                {/* Spots Remaining Badge with Warm Accent */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      spotsInfo.isUrgent
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : spotsInfo.isFull
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        spotsInfo.isUrgent
                          ? 'bg-orange-400 animate-pulse'
                          : spotsInfo.isFull
                          ? 'bg-slate-500'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span>{spotsInfo.label}</span>
                  </span>
                </div>
              </div>

              {/* Schedule & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2 text-slate-200">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">{dateTimeStr}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="line-clamp-1">{locationStr}</span>
                </div>
              </div>

              {/* Training / Badges (if any) */}
              {badges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                  {badges.map((badge, bIdx) => (
                    <span
                      key={bIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700 text-[11px] font-medium"
                    >
                      <Award className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Current Member State & Action Area */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {/* Member Status Badge */}
                <div>
                  {memberState === MEMBER_SERVING_STATES.PENDING && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Pending Review</span>
                    </span>
                  )}

                  {memberState === MEMBER_SERVING_STATES.CONFIRMED && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Confirmed Servant</span>
                    </span>
                  )}

                  {memberState === MEMBER_SERVING_STATES.DECLINED && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Declined</span>
                    </span>
                  )}

                  {memberState === MEMBER_SERVING_STATES.REPLACEMENT_NEEDED && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>Replacement Needed</span>
                    </span>
                  )}

                  {memberState === MEMBER_SERVING_STATES.NOT_APPLIED && (
                    <span className="text-xs text-slate-400 font-medium">
                      Open for volunteer application
                    </span>
                  )}
                </div>

                {/* Primary Action Button */}
                <div>
                  {memberState === MEMBER_SERVING_STATES.NOT_APPLIED && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal(opportunity)}
                      aria-label={`I can serve as ${roleInfo.roleTitle}`}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
                    >
                      <HandHeart className="w-4 h-4" />
                      <span>I can serve</span>
                    </button>
                  )}

                  {memberState === MEMBER_SERVING_STATES.REPLACEMENT_NEEDED && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal(opportunity)}
                      aria-label={`Cover spot as ${roleInfo.roleTitle}`}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-orange-500/20"
                    >
                      <HandHeart className="w-4 h-4" />
                      <span>Cover Spot</span>
                    </button>
                  )}

                  {memberState === MEMBER_SERVING_STATES.PENDING && (
                    <button
                      type="button"
                      disabled
                      aria-label="Serving interest submitted and pending review"
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-slate-400 border border-slate-700/80 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-not-allowed opacity-80"
                    >
                      <Clock className="w-4 h-4 text-amber-400/70" />
                      <span>Interest Submitted</span>
                    </button>
                  )}

                  {memberState === MEMBER_SERVING_STATES.CONFIRMED && (
                    <div className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/35 text-emerald-300 font-bold text-xs sm:text-sm">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>You're Scheduled</span>
                    </div>
                  )}

                  {memberState === MEMBER_SERVING_STATES.DECLINED && (
                    <button
                      type="button"
                      onClick={() => handleOpenModal(opportunity)}
                      aria-label={`Re-apply to serve as ${roleInfo.roleTitle}`}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Re-apply</span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Footer Navigation Link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        <span className="text-xs text-slate-400 font-medium">
          Have questions? Connect with your ministry coordinator.
        </span>

        <button
          type="button"
          onClick={onOpenServePage}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/25 text-amber-400 hover:text-amber-300 font-bold text-xs sm:text-sm border border-amber-500/30 flex items-center justify-center gap-2 transition-all"
        >
          <span>View all serving opportunities</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Modal */}
      <ServeInterestModal
        opportunity={selectedOpportunity}
        currentUser={currentUser}
        isOpen={Boolean(selectedOpportunity)}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
      />
    </section>
  );
}
