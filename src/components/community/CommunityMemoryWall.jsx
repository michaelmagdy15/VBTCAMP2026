import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Sparkles,
  History,
  Calendar,
  Camera,
  Heart,
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  X,
  Lock,
  Clock,
  Flame,
  ChevronRight,
  Share2,
  Tag,
  AlertCircle,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import {
  DEFAULT_COMMUNITY_ID,
  MEMORY_CATEGORIES,
  CATEGORY_LABELS,
  createMemoryStory,
  getApprovedMemories,
  getThisWeekInHistory,
  getMemberPersonalHistory,
  getCommunityImpactStats,
  seedDefaultMemories,
} from '../../services/memoryStoryService';

/**
 * Category Visual Styling Map
 */
export const CATEGORY_STYLES = {
  [MEMORY_CATEGORIES.CAMP_SEASONS]: {
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    icon: Flame,
    label: 'Camp Seasons',
  },
  [MEMORY_CATEGORIES.TOURNAMENTS]: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
    icon: Trophy,
    label: 'Tournaments & Champions',
  },
  [MEMORY_CATEGORIES.PHOTO_HIGHLIGHTS]: {
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
    icon: Camera,
    label: 'Photo Highlights',
  },
  [MEMORY_CATEGORIES.TESTIMONIES]: {
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30',
    icon: Heart,
    label: 'Testimonies & Grace',
  },
  [MEMORY_CATEGORIES.TEAM_MILESTONES]: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
    icon: Award,
    label: 'Team Milestones',
  },
  [MEMORY_CATEGORIES.SERVANT_ANNIVERSARIES]: {
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10',
    border: 'border-indigo-400/30',
    icon: ShieldCheck,
    label: 'Servant Anniversaries',
  },
  [MEMORY_CATEGORIES.COMMUNITY_IMPACT]: {
    color: 'text-teal-400',
    bg: 'bg-teal-400/10',
    border: 'border-teal-400/30',
    icon: Users,
    label: 'Community Impact',
  },
};

/**
 * Format ISO or Date string nicely
 * @param {string|number|Date} dateStr
 * @returns {string}
 */
export function formatMemoryDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * CommunityMemoryWall Component
 *
 * Visually engaging story wall with timeline filters, dynamic "This Week in VBT History" banner,
 * photo modal with captions, story submission dialog with required explicit consent checkbox,
 * community impact counters, and private personal history view.
 */
export default function CommunityMemoryWall({
  communityId = DEFAULT_COMMUNITY_ID,
  currentUser = null,
  memberProfile = null,
  onOpenPersonalHistory = null,
  className = '',
}) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;

  // Data states
  const [memories, setMemories] = useState([]);
  const [throwbacks, setThrowbacks] = useState([]);
  const [impactStats, setImpactStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');

  // Modals
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isPersonalHistoryOpen, setIsPersonalHistoryOpen] = useState(false);
  const [personalHistory, setPersonalHistory] = useState(null);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalError, setPersonalError] = useState(null);

  // Submission Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState(MEMORY_CATEGORIES.CAMP_SEASONS);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formSeason, setFormSeason] = useState(`Season ${new Date().getFullYear()}`);
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formChampionTeam, setFormChampionTeam] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formConsent, setFormConsent] = useState(false); // REQUIRED
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Fetch Wall Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allMemories, weekThrowbacks, stats] = await Promise.all([
        getApprovedMemories(commId, {
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          year: selectedYear !== 'all' ? selectedYear : undefined,
          search: searchQuery.trim() || undefined,
          sort: sortOption,
        }),
        getThisWeekInHistory(commId, new Date()),
        getCommunityImpactStats(commId),
      ]);

      setMemories(allMemories);
      setThrowbacks(weekThrowbacks);
      setImpactStats(stats);
    } catch (err) {
      console.error('[CommunityMemoryWall] Failed to load memories:', err);
      setError('Unable to load community memories. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [commId, selectedCategory, selectedYear, searchQuery, sortOption]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Seed default memories helper
  const handleSeedMemories = async () => {
    try {
      setLoading(true);
      await seedDefaultMemories(commId);
      await loadData();
    } catch (err) {
      console.error('Failed to seed memories:', err);
      setError('Failed to seed memories.');
      setLoading(false);
    }
  };

  // Open Personal History Drawer/Modal
  const handleOpenPersonalHistory = async () => {
    if (onOpenPersonalHistory) {
      onOpenPersonalHistory();
      return;
    }

    const memberId = currentUser?.id || currentUser?.uid || memberProfile?.id;
    if (!memberId) {
      alert('Please log in or identify yourself to view your private journey.');
      return;
    }

    setIsPersonalHistoryOpen(true);
    setPersonalLoading(true);
    setPersonalError(null);

    try {
      const history = await getMemberPersonalHistory(commId, memberId, currentUser || { id: memberId });
      setPersonalHistory(history);
    } catch (err) {
      console.error('[CommunityMemoryWall] Error loading personal history:', err);
      setPersonalError(err.message || 'Access restricted. Personal history is private.');
    } finally {
      setPersonalLoading(false);
    }
  };

  // Handle Form Submission with required consent
  const handleSubmitStory = async (e) => {
    e.preventDefault();
    if (!formConsent) {
      setFormError('Explicit consent is required to share stories, photos, or testimonies.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Please enter a memory headline/title.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please share the story or description.');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError(null);

      const parsedTags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const storyPayload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        eventDate: new Date(formDate).toISOString(),
        season: formSeason.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
        caption: formCaption.trim() || undefined,
        championTeam: formChampionTeam.trim() || undefined,
        tags: parsedTags,
        consentGiven: true,
        consentBy: currentUser?.displayName || currentUser?.name || currentUser?.id || 'Community Member',
        consentDate: new Date().toISOString(),
        consentNotes: 'Submitted via Community Story Wall with explicit digital consent.',
        status: 'approved',
      };

      await createMemoryStory(commId, storyPayload, currentUser || {});

      setFormSuccess(true);
      setTimeout(() => {
        setIsSubmitOpen(false);
        setFormSuccess(false);
        // Reset form
        setFormTitle('');
        setFormDescription('');
        setFormImageUrl('');
        setFormCaption('');
        setFormChampionTeam('');
        setFormTags('');
        setFormConsent(false);
        loadData();
      }, 1000);
    } catch (err) {
      console.error('[CommunityMemoryWall] Submission failed:', err);
      setFormError(err.message || 'Failed to submit memory story.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Available unique years in memories for filter
  const availableYears = useMemo(() => {
    const years = new Set([2026, 2025, 2024]);
    memories.forEach((m) => {
      if (m.year) years.add(Number(m.year));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [memories]);

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 py-6 space-y-8 ${className}`} data-testid="community-memory-wall">
      {/* 1. Header & Story Wall Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-800/40 p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>VBT Memory & Fellowship Archive</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Community Story Wall
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Recording God’s faithfulness, unforgettable camp seasons, tournament champions,
              servant anniversaries, and life-changing testimonies across the generations.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSubmitOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              data-testid="submit-story-btn"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Submit Memory / Photo</span>
            </button>

            <button
              onClick={handleOpenPersonalHistory}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-cyan-500/30 text-sm font-semibold shadow active:scale-95 transition-all cursor-pointer"
              data-testid="my-personal-history-btn"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>My Faithful Journey</span>
            </button>
          </div>
        </div>

        {/* 2. Impact Counters Bar */}
        {impactStats && (
          <div className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            <div className="bg-slate-950/60 border border-amber-400/20 rounded-2xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-black text-amber-400">
                {(impactStats.mealsShared || 1420).toLocaleString()}+
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-1">
                <span>🍽️ Meals Shared</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-cyan-400/20 rounded-2xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-black text-cyan-400">
                {(impactStats.youthCoached || 385).toLocaleString()}+
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-1">
                <span>🏐 Youth Coached</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-rose-400/20 rounded-2xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-black text-rose-400">
                {(impactStats.prayersLifted || 960).toLocaleString()}+
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-1">
                <span>🙏 Prayers Lifted</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-purple-400/20 rounded-2xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-black text-purple-400">
                {(impactStats.campsOrganized || 8).toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-1">
                <span>⛺ Camp Seasons</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-950/60 border border-emerald-400/20 rounded-2xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-black text-emerald-400">
                {(impactStats.hoursVolunteered || 2450).toLocaleString()}h
              </div>
              <div className="text-xs text-slate-400 font-medium mt-1 flex items-center justify-center gap-1">
                <span>⏱️ Hours Volunteered</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. "This Week in VBT History" Dynamic Throwback Banner */}
      {throwbacks && throwbacks.length > 0 && (
        <div className="space-y-4" data-testid="throwback-section">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              This Week in VBT History
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold">
              Flashback
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {throwbacks.map((tb) => {
              const style = CATEGORY_STYLES[tb.category] || CATEGORY_STYLES[MEMORY_CATEGORIES.CAMP_SEASONS];
              const CategoryIcon = style.icon;

              return (
                <div
                  key={`tb_${tb.id}`}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 p-5 shadow-xl flex flex-col sm:flex-row gap-4 group"
                  data-testid="throwback-card"
                >
                  {tb.imageUrl && (
                    <div
                      className="w-full sm:w-36 h-36 rounded-xl overflow-hidden bg-slate-800 shrink-0 cursor-pointer relative"
                      onClick={() =>
                        setSelectedPhoto({
                          url: tb.imageUrl,
                          caption: tb.caption || tb.title,
                          title: tb.title,
                          date: tb.eventDate,
                        })
                      }
                    >
                      <img
                        src={tb.imageUrl}
                        alt={tb.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
                          {tb.anniversaryBadge || `${tb.yearsAgo} Years Ago`}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatMemoryDate(tb.eventDate)}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                        {tb.title}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                        {tb.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <CategoryIcon className={`w-3.5 h-3.5 ${style.color}`} />
                        <span>{style.label}</span>
                      </div>
                      {tb.championTeam && (
                        <span className="text-cyan-400 font-semibold flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {tb.championTeam}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Timeline Filters & Search Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search memories, champions, servants, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 transition-colors"
              data-testid="search-memories-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort & Year selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                data-testid="year-filter-select"
              >
                <option value="all" className="bg-slate-900 text-white">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                data-testid="sort-filter-select"
              >
                <option value="newest" className="bg-slate-900 text-white">Newest First</option>
                <option value="oldest" className="bg-slate-900 text-white">Oldest First</option>
                <option value="most_impactful" className="bg-slate-900 text-white">Most Impactful</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            All Archive
          </button>

          {Object.entries(CATEGORY_STYLES).map(([key, style]) => {
            const Icon = style.icon;
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? `${style.bg} ${style.color} border ${style.border} font-bold`
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Memory Cards Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3" data-testid="loading-state">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Opening fellowship archives...</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="py-16 text-center space-y-4 rounded-3xl bg-slate-900/40 border border-slate-800 p-8" data-testid="empty-state">
          <History className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No memories found in this view</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'all' || selectedYear !== 'all'
              ? 'Try adjusting your filters or search keywords.'
              : 'Be the first to record a camp milestone, championship victory, or testimony!'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedYear('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Reset Filters
            </button>
            <button
              onClick={handleSeedMemories}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              data-testid="seed-memories-btn"
            >
              Seed Inspirational History
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="memory-grid">
          {memories.map((mem) => {
            const style = CATEGORY_STYLES[mem.category] || CATEGORY_STYLES[MEMORY_CATEGORIES.CAMP_SEASONS];
            const CategoryIcon = style.icon;

            return (
              <div
                key={mem.id}
                className="group flex flex-col rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                data-testid="memory-card"
              >
                {/* Photo Thumbnail */}
                {mem.imageUrl && (
                  <div
                    className="relative w-full h-48 sm:h-52 bg-slate-950 overflow-hidden cursor-pointer"
                    onClick={() =>
                      setSelectedPhoto({
                        url: mem.imageUrl,
                        caption: mem.caption || mem.title,
                        title: mem.title,
                        date: mem.eventDate,
                        category: style.label,
                      })
                    }
                  >
                    <img
                      src={mem.imageUrl}
                      alt={mem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                    {/* Category pill on photo */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md ${style.bg} ${style.color} border ${style.border}`}
                      >
                        <CategoryIcon className="w-3.5 h-3.5" />
                        <span>{style.label}</span>
                      </span>
                    </div>

                    {/* Season / Year Pill */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-300 text-xs font-semibold border border-slate-700/60">
                        {mem.season || mem.year}
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Header if no image */}
                    {!mem.imageUrl && (
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${style.bg} ${style.color} border ${style.border}`}
                        >
                          <CategoryIcon className="w-3.5 h-3.5" />
                          <span>{style.label}</span>
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {mem.season || mem.year}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatMemoryDate(mem.eventDate)}</span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                      {mem.title}
                    </h3>

                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                      {mem.description}
                    </p>

                    {/* Champion or Honoree Callout */}
                    {mem.championTeam && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold">
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Champion: {mem.championTeam}</span>
                      </div>
                    )}

                    {mem.servantHonoree && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-400/10 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          Honoring {mem.servantHonoree.name} ({mem.servantHonoree.years} Years)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Tags & Consent Verification */}
                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    {mem.tags && mem.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {mem.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400/90 text-[11px] font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Explicit Consent Verified</span>
                      </span>

                      <span className="text-slate-400 text-[11px]">
                        By {mem.authorName || 'VBT Historian'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setSelectedPhoto(null)}
          data-testid="photo-modal"
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition-colors cursor-pointer"
              data-testid="close-photo-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full max-h-[70vh] bg-black flex items-center justify-center">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title || 'Memory photo'}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="p-6 space-y-2 bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{formatMemoryDate(selectedPhoto.date)}</span>
                {selectedPhoto.category && (
                  <span className="font-semibold text-amber-400">{selectedPhoto.category}</span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white">{selectedPhoto.title}</h3>
              {selectedPhoto.caption && (
                <p className="text-sm text-slate-300 italic">{selectedPhoto.caption}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Story Submission Dialog with Required Consent */}
      {isSubmitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
          data-testid="submit-story-dialog"
        >
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" />
                  Submit Community Story / Photo
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Share a camp memory, tournament win, or life testimony.
                </p>
              </div>
              <button
                onClick={() => setIsSubmitOpen(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccess ? (
              <div className="py-12 text-center space-y-3" data-testid="submit-success">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Memory Recorded Successfully!</h3>
                <p className="text-sm text-slate-300">
                  Thank you for contributing to VBT’s living history and fellowship archive.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitStory} className="space-y-4">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Memory Title / Headline *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Volleyball Finals 2025 Victory"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                    data-testid="form-title-input"
                  />
                </div>

                {/* Category & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none cursor-pointer"
                      data-testid="form-category-select"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                        <option key={catKey} value={catKey}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Season & Champion Team */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Camp Season (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Summer 2025"
                      value={formSeason}
                      onChange={(e) => setFormSeason(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Champion Team (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. St. George Titans"
                      value={formChampionTeam}
                      onChange={(e) => setFormChampionTeam(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description / Testimony */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Story / Testimony Narrative *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the moment, testimony of faith, or celebration..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none resize-none"
                    data-testid="form-description-input"
                  />
                </div>

                {/* Image URL & Caption */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Photo / Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                      data-testid="form-image-input"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Photo Caption (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lifting the 2025 Cup"
                      value={formCaption}
                      onChange={(e) => setFormCaption(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. volleyball, worship, camp2025"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* REQUIRED CONSENT CHECKBOX & PRIVACY SHIELD */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="consentCheckbox"
                      checked={formConsent}
                      onChange={(e) => setFormConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-amber-400 text-amber-500 focus:ring-amber-400 cursor-pointer"
                      data-testid="consent-checkbox"
                    />
                    <label htmlFor="consentCheckbox" className="text-xs text-amber-200 leading-snug cursor-pointer select-none">
                      <span className="font-bold">Required Consent Agreement:</span> I confirm that I give explicit
                      consent for this photo, story, and testimony to be published on the VBT Community Memory Wall
                      in accordance with camp privacy guidelines.
                    </label>
                  </div>

                  <p className="text-[11px] text-slate-400 pl-7 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>
                      Notice: Sensitive personal attendance and serving counts are kept private to individual members
                      and are NEVER publicly broadcasted without explicit consent.
                    </span>
                  </p>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsSubmitOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!formConsent || formSubmitting}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
                      !formConsent || formSubmitting
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 active:scale-95 cursor-pointer'
                    }`}
                    data-testid="submit-form-btn"
                  >
                    {formSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Record Memory</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 8. "My Faithful Journey" (Personal Private History Modal) */}
      {isPersonalHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
          data-testid="personal-history-modal"
        >
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold uppercase tracking-wider">
                  <Lock className="w-3 h-3" />
                  <span>Confidential Personal History</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  My Faithful Journey & Milestones
                </h2>
              </div>
              <button
                onClick={() => setIsPersonalHistoryOpen(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {personalLoading ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Retrieving confidential history...</p>
              </div>
            ) : personalError ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Privacy Notice</span>
                </div>
                <p className="text-xs leading-relaxed">{personalError}</p>
              </div>
            ) : personalHistory ? (
              <div className="space-y-6">
                {/* Privacy Badge Callout */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 text-xs text-cyan-200/90 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{personalHistory.privacyNotice}</span>
                </div>

                {/* Milestone Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <div className="text-2xl font-black text-amber-400">
                      {personalHistory.attendanceCount ?? 0}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Sessions Attended</div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <div className="text-2xl font-black text-cyan-400">
                      {personalHistory.servingCount ?? 0}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Serving Shifts</div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <div className="text-2xl font-black text-indigo-400">
                      {personalHistory.yearsOfService ?? 0}y
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Years of Service</div>
                  </div>
                </div>

                {/* Servant Anniversary Status */}
                {personalHistory.servantAnniversary && (
                  <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                        Servant Anniversary
                      </span>
                      <h4 className="text-base font-bold text-white">
                        {personalHistory.servantAnniversary.title}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Next goal: {personalHistory.servantAnniversary.nextMilestone}
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-indigo-400 shrink-0" />
                  </div>
                )}

                {/* Milestones List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Ministry Milestones
                  </h4>

                  {personalHistory.milestones && personalHistory.milestones.length > 0 ? (
                    <div className="space-y-2">
                      {personalHistory.milestones.map((m) => (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <div className="text-sm font-bold text-white">{m.title}</div>
                            <p className="text-xs text-slate-400">{m.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      No milestones recorded yet. Keep serving and attending to unlock milestone badges!
                    </p>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-2 text-right">
              <button
                onClick={() => setIsPersonalHistoryOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
