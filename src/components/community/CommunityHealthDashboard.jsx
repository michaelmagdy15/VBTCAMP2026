import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Heart,
  Flame,
  Users,
  Calendar,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircleHeart,
  TrendingUp,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  BarChart3,
  Coffee,
  HelpCircle,
  Send,
  EyeOff,
} from 'lucide-react';
import {
  NORTH_STAR_METRIC_NAME,
  NORTH_STAR_METRIC_DESCRIPTION,
  CARE_SIGNAL_LABELS,
  CARE_ACTION_CATEGORIES,
  CARE_ACTION_STATUS,
  isAuthorizedCoordinator,
  computeCommunityHealthMetrics,
  generateCareActionChecklist,
  exportCareChecklistToMarkdown,
  exportCareChecklistToCsv,
  fetchCommunityHealthData,
  createMockCommunityHealthData,
} from '../../services/communityHealthService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';

/**
 * CommunityHealthDashboard Component
 *
 * Coordinator-only analytics focused on community health, pastoral care opportunities,
 * and volunteer well-being.
 *
 * CRITICAL CARE RULES:
 * 1. Signals are care and planning tools, NEVER public scores or gamified rankings.
 * 2. Use neutral, compassionate language (e.g. "May need follow-up", "Available for encouragement").
 * 3. Pastoral confidential notes are strictly omitted from aggregate analytics.
 * 4. Restricted to coordinators and pastoral care leaders.
 */
export default function CommunityHealthDashboard({
  communityId = DEFAULT_COMMUNITY_ID,
  currentUser = { role: 'coordinator', displayName: 'Coordinator' },
  onNavigate = null,
  initialData = null,
}) {
  // ── Authorization Check ──────────────────────────────────────────────────
  const isAuthorized = isAuthorizedCoordinator(currentUser);

  // ── State ────────────────────────────────────────────────────────────────
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'care_signals' | 'burnout' | 'roster' | 'checklist' | 'all_signals'
  const [checklistFilter, setChecklistFilter] = useState('all');
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [timeWindow, setTimeWindow] = useState('this_week'); // 'this_week' | '14_days' | 'month'

  // ── Load Health Data ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      if (initialData) {
        setData(initialData);
      } else {
        const fetched = await fetchCommunityHealthData(communityId, currentUser);
        setData(fetched);
      }
    } catch {
      // Fallback to mock data so dashboard functions offline
      setData(createMockCommunityHealthData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId, currentUser, isAuthorized, initialData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // ── Compute Metrics ──────────────────────────────────────────────────────
  const healthMetrics = useMemo(() => {
    if (!data || !isAuthorized) return null;
    try {
      return computeCommunityHealthMetrics(communityId, data, currentUser);
    } catch (err) {
      console.error('[CommunityHealthDashboard] Metrics error:', err);
      return null;
    }
  }, [communityId, data, currentUser, isAuthorized]);

  // ── Compute Care Action Checklist ─────────────────────────────────────────
  const careChecklist = useMemo(() => {
    if (!healthMetrics || !isAuthorized) return [];
    try {
      return generateCareActionChecklist(healthMetrics, currentUser);
    } catch {
      return [];
    }
  }, [healthMetrics, currentUser, isAuthorized]);

  // Filtered Checklist
  const filteredChecklist = useMemo(() => {
    if (checklistFilter === 'all') return careChecklist;
    return careChecklist.filter((item) => item.category === checklistFilter);
  }, [careChecklist, checklistFilter]);

  // ── Checklist Actions ────────────────────────────────────────────────────
  const toggleTaskStatus = (taskId) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleCopyMarkdownReport = () => {
    if (!careChecklist || careChecklist.length === 0) return;
    const checklistWithStatus = careChecklist.map((item) => ({
      ...item,
      status: completedTaskIds.has(item.id)
        ? CARE_ACTION_STATUS.COMPLETED
        : CARE_ACTION_STATUS.PENDING,
    }));
    const md = exportCareChecklistToMarkdown(checklistWithStatus);
    navigator.clipboard?.writeText(md);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const handleDownloadCsv = () => {
    if (!careChecklist || careChecklist.length === 0) return;
    const checklistWithStatus = careChecklist.map((item) => ({
      ...item,
      status: completedTaskIds.has(item.id)
        ? CARE_ACTION_STATUS.COMPLETED
        : CARE_ACTION_STATUS.PENDING,
    }));
    const csv = exportCareChecklistToCsv(checklistWithStatus);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VBT_Care_Action_Plan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Unauthorized State ───────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto p-6 my-8 bg-slate-900/90 border border-slate-800 rounded-2xl text-slate-100 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4 text-amber-400">
          <ShieldAlert className="w-8 h-8 flex-shrink-0" />
          <h2 className="text-xl font-bold font-display">Coordinator & Pastoral Care View Only</h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          The Community Health & Care Signals dashboard is reserved exclusively for designated coordinators
          and pastoral care leaders. To safeguard member privacy and volunteer emotional well-being,
          pastoral care signals and volunteer rhythm analytics are never published as public rankings,
          scores, or leaderboards.
        </p>
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 mb-6 flex items-start gap-3">
          <EyeOff className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-200">Pastoral Care Confidentiality Guarantee:</p>
            <p>• All signals are caring planning tools, never public performance metrics.</p>
            <p>• Confidential notes and private spiritual requests are completely isolated from aggregate views.</p>
          </div>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('community_home')}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            Return to Community Home
          </button>
        )}
      </div>
    );
  }

  // ── Loading State ────────────────────────────────────────────────────────
  if (loading || !healthMetrics) {
    return (
      <div className="max-w-5xl mx-auto p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-4" />
        <p className="text-base font-medium">Computing Community Health & Care Signals...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating participation, volunteer well-being, and care follow-ups</p>
      </div>
    );
  }

  const { northStar, signals, careSummary } = healthMetrics;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-slate-100 font-sans space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Coordinator Confidential
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Heart className="w-3 h-3" />
              Care & Planning Tool
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white">
            Community Health & Care Signals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Pastoral care opportunities, volunteer well-being, and community vitality rhythms.
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Window Buttons */}
          <div className="inline-flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setTimeWindow('this_week')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeWindow === 'this_week'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeWindow('14_days')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeWindow === '14_days'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              14-Day View
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Refresh community signals"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Button */}
          <button
            onClick={handleCopyMarkdownReport}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedNotice ? 'Plan Copied!' : 'Copy Care Plan'}
          </button>
        </div>
      </header>

      {/* ── NORTH-STAR METRIC CARD ───────────────────────────────────────── */}
      <section
        aria-label="North Star Metric"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950/70 via-slate-900 to-indigo-950/60 border border-blue-500/30 p-6 shadow-xl"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp className="w-48 h-48 text-blue-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold tracking-wide uppercase">
                North-Star Metric
              </span>
              <span className="text-xs text-slate-400">Past 7 Days Rhythm</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              {northStar.northStarName}
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              &ldquo;{northStar.definition}&rdquo;
            </p>

            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-200">
                {northStar.count}
              </span>
              <span className="text-slate-300 text-base font-medium">
                Active Members
                {northStar.rate > 0 && (
                  <span className="ml-2 text-emerald-400 font-semibold text-sm">
                    ({northStar.rate}% of community)
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* 3 Pillars Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto md:min-w-[420px]">
            {/* Pillar 1: Participating */}
            <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Participating</span>
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {northStar.breakdown.uniqueAttendees}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Services & sports drills
              </div>
            </div>

            {/* Pillar 2: Serving */}
            <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Serving</span>
                <Users className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {northStar.breakdown.uniqueServants}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Active servant roles
              </div>
            </div>

            {/* Pillar 3: Connecting */}
            <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Connecting</span>
                <MessageCircleHeart className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {northStar.breakdown.uniqueConnectors}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Prayer & care circles
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Overlap Footnote */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              <strong>{northStar.breakdown.multiCategory} members</strong> engaged across 2+ pillars (participating, serving, and connecting).
            </span>
          </div>
          <span className="text-slate-500">
            Overall status: <strong className="text-slate-300">{careSummary.overallHealthStatus}</strong>
          </span>
        </div>
      </section>

      {/* ── CARE SIGNAL ALERT BADGES ─────────────────────────────────────── */}
      <section aria-label="Care Signal Quick Alerts" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Inactivity Alert */}
        <button
          onClick={() => setActiveTab('care_signals')}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            signals.inactivityFlags.count > 0
              ? 'bg-amber-950/40 border-amber-500/40 hover:border-amber-400 text-amber-200'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <Heart className="w-4 h-4 text-amber-400" />
            <span className="text-lg font-bold font-mono">{signals.inactivityFlags.count}</span>
          </div>
          <span className="text-xs font-semibold leading-tight">May Need Follow-Up</span>
          <span className="text-[10px] text-slate-400 mt-0.5">3+ absences</span>
        </button>

        {/* Burnout Risk Alert */}
        <button
          onClick={() => setActiveTab('burnout')}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            signals.burnoutRiskSignals.count > 0
              ? 'bg-rose-950/40 border-rose-500/40 hover:border-rose-400 text-rose-200'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <Coffee className="w-4 h-4 text-rose-400" />
            <span className="text-lg font-bold font-mono">{signals.burnoutRiskSignals.count}</span>
          </div>
          <span className="text-xs font-semibold leading-tight">Rest Suggested</span>
          <span className="text-[10px] text-slate-400 mt-0.5">High volunteer load</span>
        </button>

        {/* Connection & Prayer Requests */}
        <button
          onClick={() => setActiveTab('care_signals')}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1">
            <MessageCircleHeart className="w-4 h-4 text-purple-400" />
            <span className="text-lg font-bold font-mono">{signals.connectionAndPrayerRequests.count}</span>
          </div>
          <span className="text-xs font-semibold leading-tight">Connection / Prayer</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Pastoral touchpoint</span>
        </button>

        {/* First-time Servants */}
        <button
          onClick={() => setActiveTab('all_signals')}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-lg font-bold font-mono">{signals.firstTimeServants.count}</span>
          </div>
          <span className="text-xs font-semibold leading-tight">First-Time Servants</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Celebrate & encourage</span>
        </button>

        {/* Open Volunteer Spots */}
        <button
          onClick={() => setActiveTab('roster')}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 text-left transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-lg font-bold font-mono">{signals.openRolesVsFilledRatio.openSpots}</span>
          </div>
          <span className="text-xs font-semibold leading-tight">Open Station Roles</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{signals.openRolesVsFilledRatio.fillRate}% filled</span>
        </button>

        {/* Unconfirmed Assignments */}
        <button
          onClick={() => setActiveTab('roster')}
          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
            signals.unconfirmedAssignments.count > 0
              ? 'bg-amber-950/20 border-amber-600/30 hover:border-amber-500 text-amber-200'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-lg font-bold font-mono">{signals.unconfirmedAssignments.count}</span>
          </div>
          <span className="text-xs font-semibold leading-tight">Unconfirmed Slots</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Pending response</span>
        </button>
      </section>

      {/* ── NAVIGATION TABS ──────────────────────────────────────────────── */}
      <nav aria-label="Dashboard views" className="flex border-b border-slate-800 overflow-x-auto space-x-1 sm:space-x-2 text-xs sm:text-sm">
        {[
          { id: 'overview', label: 'Care Overview', icon: BarChart3 },
          { id: 'care_signals', label: 'Pastoral Care & Follow-Up', icon: Heart, badge: signals.inactivityFlags.count + signals.connectionAndPrayerRequests.count },
          { id: 'burnout', label: 'Servant Well-Being', icon: Coffee, badge: signals.burnoutRiskSignals.count },
          { id: 'roster', label: 'Roster & Open Roles', icon: Users, badge: signals.unconfirmedAssignments.count },
          { id: 'checklist', label: 'Care Action Checklist', icon: CheckCircle2, badge: careChecklist.length - completedTaskIds.size },
          { id: 'all_signals', label: 'All 12 Signals', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── TAB 1: OVERVIEW ──────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Care Snapshot */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  Pastoral Care Highlights
                </h3>
                <span className="text-xs text-slate-400">Compassionate Outreach</span>
              </div>

              {signals.inactivityFlags.count === 0 && signals.connectionAndPrayerRequests.count === 0 ? (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-sm text-slate-400">
                  No active follow-up flags. Members are engaged in regular rhythms!
                </div>
              ) : (
                <div className="space-y-3">
                  {signals.inactivityFlags.members.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{item.memberName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {item.careStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.suggestedAction}</p>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {item.consecutiveAbsences} sessions
                      </span>
                    </div>
                  ))}

                  {signals.connectionAndPrayerRequests.requests.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-purple-500/30 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{item.memberName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Requested Connection
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.suggestedAction}</p>
                      </div>
                      <span className="text-xs text-purple-300/80">Prayer care</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setActiveTab('care_signals')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View All Care Follow-Ups</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Volunteer Well-Being Snapshot */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-emerald-400" />
                  Servant Rhythms & Well-Being
                </h3>
                <span className="text-xs text-slate-400">Burnout Prevention</span>
              </div>

              {signals.burnoutRiskSignals.count === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Healthy Volunteer Rhythms</p>
                    <p className="text-xs text-emerald-400/80">
                      No servants are currently scheduled &gt; 3 times in 2 weeks or in back-to-back shifts.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {signals.burnoutRiskSignals.servants.slice(0, 3).map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-rose-500/30 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{srv.memberName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {srv.careStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{srv.suggestedAction}</p>
                      </div>
                      <span className="text-xs text-rose-400 font-mono">
                        {srv.assignmentCount} shifts / 14d
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setActiveTab('burnout')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Open Volunteer Burnout Monitor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Open Roles Thermometer Teaser */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Volunteer Capacity & Station Roster
                </h3>
                <p className="text-xs text-slate-400">
                  {signals.openRolesVsFilledRatio.filledSpots} of {signals.openRolesVsFilledRatio.totalSpots} spots covered ({signals.openRolesVsFilledRatio.fillRate}%)
                </p>
              </div>
              <span className="text-sm font-bold text-white font-mono">
                {signals.openRolesVsFilledRatio.openSpots} open spots
              </span>
            </div>

            {/* Thermometer Bar */}
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/80">
              <div
                className={`h-full transition-all duration-500 ${
                  signals.openRolesVsFilledRatio.fillRate >= 80
                    ? 'bg-gradient-to-r from-blue-500 to-emerald-400'
                    : signals.openRolesVsFilledRatio.fillRate >= 60
                    ? 'bg-gradient-to-r from-blue-500 to-amber-400'
                    : 'bg-gradient-to-r from-amber-500 to-rose-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, signals.openRolesVsFilledRatio.fillRate))}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span>{signals.unconfirmedAssignments.count} unconfirmed assignments awaiting response</span>
              <button
                onClick={() => setActiveTab('roster')}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Manage Roster Spots &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: CARE SIGNALS & PASTORAL FOLLOW-UP ─────────────────────── */}
      {activeTab === 'care_signals' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-amber-400" />
                  Pastoral Care Opportunities
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Members absent for 3+ consecutive sessions are flagged neutrally for caring check-ins.
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-full">
                {signals.inactivityFlags.count} follow-ups identified
              </span>
            </div>

            {signals.inactivityFlags.count === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">No Inactivity Flags</p>
                <p className="text-xs mt-1">Every active member has participated within the last 3 sessions.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {signals.inactivityFlags.members.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{item.memberName}</h4>
                        <span className="text-xs text-slate-400">Role: {item.role}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.careStatus}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <p className="text-slate-400 mb-1">
                        <strong>Observed Pattern:</strong> Absent for {item.consecutiveAbsences} consecutive gatherings.
                      </p>
                      {item.lastAttendedDate && (
                        <p className="text-slate-400">
                          Last attended: <strong>{new Date(item.lastAttendedDate).toLocaleDateString()}</strong>
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 italic">
                      &ldquo;{item.suggestedAction}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection & Prayer Requests */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageCircleHeart className="w-5 h-5 text-purple-400" />
                  Connection & Prayer Support
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Direct requests from members seeking pastoral conversation, encouragement, or fellowship.
                </p>
              </div>
              <span className="text-xs text-purple-300 font-semibold font-mono">
                {signals.connectionAndPrayerRequests.count} requests
              </span>
            </div>

            {signals.connectionAndPrayerRequests.count === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                No open connection requests at this time.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {signals.connectionAndPrayerRequests.requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-800/60 border border-purple-500/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{req.memberName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {req.careStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{req.suggestedAction}</p>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Category: {req.prayerCategory || 'General Pastoral Care'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: VOLUNTEER WELL-BEING & BURNOUT MONITOR ────────────────── */}
      {activeTab === 'burnout' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-emerald-400" />
                  Volunteer Well-Being & Burnout Monitor
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Monitors volunteer rhythms: flags servants scheduled &gt; 3 times in 2 weeks or in multiple consecutive roles on the same day.
                </p>
              </div>
              <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-full">
                {signals.burnoutRiskSignals.count} resting recommendations
              </span>
            </div>

            {signals.burnoutRiskSignals.count === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">Balanced Servant Health</p>
                <p className="text-xs mt-1">All volunteer schedules are within healthy rest and replenishment thresholds.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {signals.burnoutRiskSignals.servants.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-5 rounded-xl bg-slate-800/80 border border-rose-500/40 space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{srv.memberName}</h4>
                        <span className="text-xs text-slate-400">Volunteer Role: {srv.role}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        {srv.careStatus}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1.5">
                      <p>
                        <strong>Load Factor:</strong> {srv.assignmentCount} assignments in 14-day window (Limit: {srv.maxThreshold})
                      </p>
                      {srv.hasMultipleConsecutiveRolesOnSameDay && (
                        <p className="text-amber-300">
                          ⚠️ Multiple stations scheduled on the same date ({srv.consecutiveRolesCount} roles)
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 italic">
                      &ldquo;{srv.suggestedAction}&rdquo;
                    </p>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Recommendation:</span>
                      <span className="text-emerald-400 font-semibold">Offer next week off</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: ROSTER & OPEN ROLES ──────────────────────────────────── */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Capacity Thermometer Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Open Roles vs Filled Ratio (Thermometer)
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-300">Station Roster Coverage</span>
                <span className="text-blue-400 font-mono">{signals.openRolesVsFilledRatio.ratioFormatted}</span>
              </div>

              {/* Progress Thermometer */}
              <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700/80">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, signals.openRolesVsFilledRatio.fillRate))}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400 pt-1">
                <span>0% Empty</span>
                <span>{signals.openRolesVsFilledRatio.openSpots} spots remaining</span>
                <span>100% Fully Staffed</span>
              </div>
            </div>
          </div>

          {/* Unconfirmed Assignments */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  Unconfirmed Assignments Awaiting Response
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Volunteers who have been invited or applied but have not yet completed final confirmation.
                </p>
              </div>
              <span className="text-xs text-amber-400 font-semibold font-mono">
                {signals.unconfirmedAssignments.count} unconfirmed
              </span>
            </div>

            {signals.unconfirmedAssignments.count === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                All scheduled volunteers have confirmed their assignments!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {signals.unconfirmedAssignments.assignments.map((asgn) => (
                  <div
                    key={asgn.id}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-amber-500/30 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-sm text-white">{asgn.memberName}</p>
                      <p className="text-xs text-slate-400">{asgn.role}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {asgn.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: CARE ACTION CHECKLIST (INTERACTIVE & EXPORTABLE) ──────── */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                  Exportable Care Action Checklist
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Actionable pastoral and coordinator priorities to support volunteer well-being and community connection.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyMarkdownReport}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedNotice ? 'Copied!' : 'Copy Markdown'}
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {[
                { id: 'all', label: 'All Actions' },
                { id: CARE_ACTION_CATEGORIES.PASTORAL_CARE, label: 'Pastoral Follow-Up' },
                { id: CARE_ACTION_CATEGORIES.SERVANT_CARE, label: 'Volunteer Care' },
                { id: CARE_ACTION_CATEGORIES.PRAYER_CONNECTION, label: 'Prayer & Connection' },
                { id: CARE_ACTION_CATEGORIES.ROSTER_LOGISTICS, label: 'Roster Readiness' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setChecklistFilter(pill.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    checklistFilter === pill.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Interactive Task Items */}
            <div className="space-y-2.5 pt-2">
              {filteredChecklist.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No care actions in this category.
                </div>
              ) : (
                filteredChecklist.map((task) => {
                  const isDone = completedTaskIds.has(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTaskStatus(task.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isDone
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <button
                        type="button"
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 ${
                          isDone
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'border-slate-500 hover:border-blue-400'
                        }`}
                      >
                        {isDone && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`text-sm font-semibold ${
                              isDone ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/80 text-slate-300">
                            {task.neutralTag}
                          </span>
                          {task.priority === 'high' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Priority
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: ALL 12 SIGNALS OVERVIEW ──────────────────────────────── */}
      {activeTab === 'all_signals' && (
        <div className="space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white">All 12 Health & Care Signals</h3>
            <p className="text-xs text-slate-400 mt-1">
              Comprehensive community vitality and care metric indicators calculated for leadership review.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. New Members Joining */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">1. New Members Joining (30d)</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.newMembersJoining.count}</div>
              <div className="text-xs text-emerald-400">{signals.newMembersJoining.rate}% of community</div>
            </div>

            {/* 2. Returning Members Consistency */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">2. Returning Consistency</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.returningMembersConsistency.count}</div>
              <div className="text-xs text-blue-400">{signals.returningMembersConsistency.rate}% returning 2+ times</div>
            </div>

            {/* 3. First-Time Servants */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">3. First-Time Servants</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.firstTimeServants.count}</div>
              <div className="text-xs text-amber-300">Available for encouragement</div>
            </div>

            {/* 4. Active Regular Servants */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">4. Active Regular Servants</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.activeRegularServants.count}</div>
              <div className="text-xs text-indigo-400">Serving regularly</div>
            </div>

            {/* 5. Weekly Service Attendance Rate */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">5. Weekly Service Attendance</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.weeklyServiceAttendanceRate.rate}%</div>
              <div className="text-xs text-slate-400">Avg {signals.weeklyServiceAttendanceRate.averageAttendees} attendees</div>
            </div>

            {/* 6. Servant Meeting Attendance Rate */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">6. Servant Meeting Attendance</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.servantMeetingAttendanceRate.rate}%</div>
              <div className="text-xs text-slate-400">Avg {signals.servantMeetingAttendanceRate.averageAttendees} servants</div>
            </div>

            {/* 7. Open Roles vs Filled Ratio */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">7. Open Roles vs Filled</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.openRolesVsFilledRatio.ratioFormatted}</div>
              <div className="text-xs text-blue-400">{signals.openRolesVsFilledRatio.openSpots} remaining spots</div>
            </div>

            {/* 8. Unconfirmed Assignments */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">8. Unconfirmed Assignments</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.unconfirmedAssignments.count}</div>
              <div className="text-xs text-amber-300">Awaiting confirmation</div>
            </div>

            {/* 9. Training Completion Rate */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">9. Training Completion Rate</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.trainingCompletionRate.rate}%</div>
              <div className="text-xs text-emerald-400">{signals.trainingCompletionRate.completedCount} completed modules</div>
            </div>

            {/* 10. Inactivity Flags */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">10. Inactivity Flags</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.inactivityFlags.count}</div>
              <div className="text-xs text-amber-300">{signals.inactivityFlags.label}</div>
            </div>

            {/* 11. Burnout Risk Signals */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">11. Burnout Risk Signals</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.burnoutRiskSignals.count}</div>
              <div className="text-xs text-rose-300">{signals.burnoutRiskSignals.label}</div>
            </div>

            {/* 12. Connection & Prayer Requests */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">12. Connection / Prayer Requests</span>
              <div className="text-2xl font-bold text-white font-mono">{signals.connectionAndPrayerRequests.count}</div>
              <div className="text-xs text-purple-300">{signals.connectionAndPrayerRequests.label}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── CRITICAL CARE ETHICS FOOTNOTE ────────────────────────────────── */}
      <footer className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            <strong>Care Principles Safeguard:</strong> Signals are care and planning tools, NEVER public scores or gamified rankings.
          </span>
        </div>
        <span className="text-slate-500 text-[11px]">
          Confidential pastoral notes are strictly isolated from aggregate metrics.
        </span>
      </footer>
    </div>
  );
}
