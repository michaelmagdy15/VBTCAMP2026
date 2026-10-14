import { useState, useCallback } from 'react';
import {
  Heart,
  Sparkles,
  BookOpen,
  Bell,
  PartyPopper,
  Cake,
  Calendar,
  Users,
  ShieldCheck,
  Sun,
  WifiOff,
  ChevronRight,
  Copy,
  Check,
  Megaphone,
  UserPlus,
  Flame,
} from 'lucide-react';
import {
  DEFAULT_SCRIPTURE,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_NEW_MEMBERS,
  DEFAULT_CELEBRATIONS,
  DEFAULT_PRAYERS,
  sanitizePrayerContent,
  getFirstNameOnly,
  getMemberInitials,
  getCategoryBadgeStyle,
  getCelebrationIcon,
} from './communityPulseUtils';

/**
 * CommunityPulse Component
 *
 * Lightweight relational, warm, human community pulse section for the VBT homepage.
 * Keeps spirits high with scripture, coordinator updates, welcomed teammates,
 * milestone celebrations, and safe moderated prayer wall previews.
 *
 * Designed to feel warm, uplifting, and human — never like a clinical operations dashboard.
 */
export function CommunityPulse({
  announcements,
  scripture,
  celebrations,
  newMembers,
  prayers,
  onReactAmen,
  onOpenAnnouncements,
  onOpenPrayerWall,
  isOffline = false,
  className = '',
}) {
  // Scripture language view: 'both' | 'en' | 'ar'
  const [scriptureLang, setScriptureLang] = useState('both');
  const [copiedVerse, setCopiedVerse] = useState(false);
  const [outdoorContrast, setOutdoorContrast] = useState(false);

  // Fallbacks: when prop is undefined or null, use rich defaults; when explicitly [], show empty state
  const effectiveScripture = scripture === undefined ? DEFAULT_SCRIPTURE : scripture;
  const effectiveAnnouncements = announcements === undefined ? DEFAULT_ANNOUNCEMENTS : announcements;
  const effectiveNewMembers = newMembers === undefined ? DEFAULT_NEW_MEMBERS : newMembers;
  const effectiveCelebrations = celebrations === undefined ? DEFAULT_CELEBRATIONS : celebrations;
  const effectivePrayers = prayers === undefined ? DEFAULT_PRAYERS : prayers;

  // Local optimistic state for Amen reactions
  const [amenState, setAmenState] = useState({});

  const handleCopyScripture = useCallback(() => {
    if (!effectiveScripture) return;
    const en = effectiveScripture.textEn || '';
    const ar = effectiveScripture.textAr || '';
    const ref = effectiveScripture.reference || '';
    const textToCopy = `${en}\n${ar}\n— ${ref} ${effectiveScripture.tag || ''}`.trim();

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(
        () => {
          setCopiedVerse(true);
          setTimeout(() => setCopiedVerse(false), 2200);
        },
        () => {
          setCopiedVerse(true);
          setTimeout(() => setCopiedVerse(false), 2200);
        }
      );
    } else {
      setCopiedVerse(true);
      setTimeout(() => setCopiedVerse(false), 2200);
    }
  }, [effectiveScripture]);

  const handleAmenClick = useCallback(
    (prayerItem, e) => {
      e?.stopPropagation?.();
      const pId = prayerItem.id || 'pr-unknown';
      const current = amenState[pId] || {
        hasReacted: Boolean(prayerItem.hasAmen),
        count: typeof prayerItem.amenCount === 'number' ? prayerItem.amenCount : 0,
      };

      const newHasReacted = !current.hasReacted;
      const newCount = newHasReacted ? current.count + 1 : Math.max(0, current.count - 1);

      setAmenState((prev) => ({
        ...prev,
        [pId]: {
          hasReacted: newHasReacted,
          count: newCount,
        },
      }));

      onReactAmen?.(pId, e);
    },
    [amenState, onReactAmen]
  );

  return (
    <section
      aria-label="Community Pulse"
      data-testid="community-pulse-section"
      className={`relative w-full rounded-3xl transition-all duration-300 p-4 sm:p-6 lg:p-7 ${
        outdoorContrast
          ? 'bg-slate-950 border-2 border-amber-400 text-white shadow-2xl'
          : 'bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-slate-800/80 shadow-xl backdrop-blur-md'
      } ${className}`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & CULTURE HEADING */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 ${
              outdoorContrast
                ? 'bg-amber-400 text-slate-950'
                : 'bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-300 shadow-sm'
            }`}
          >
            <Heart className="w-5 h-5 fill-current animate-pulse text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                Community Pulse
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 hidden sm:inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  نبض المجتمع
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Spiritual encouragement, warm welcomes, and brotherly fellowship
            </p>
          </div>
        </div>

        {/* Action controls: Outdoor contrast toggle & Offline badge */}
        <div className="flex items-center gap-2">
          {isOffline && (
            <div
              data-testid="offline-indicator"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm"
              title="You are currently working offline. Cached content is displayed."
            >
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Offline Mode</span>
            </div>
          )}

          <button
            type="button"
            data-testid="outdoor-contrast-toggle"
            onClick={() => setOutdoorContrast((prev) => !prev)}
            aria-pressed={outdoorContrast}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              outdoorContrast
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300'
                : 'bg-slate-800/70 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle high-contrast outdoor mode for sunny sports fields"
          >
            <Sun className={`w-3.5 h-3.5 ${outdoorContrast ? 'text-slate-950 font-bold' : 'text-amber-400'}`} />
            <span>{outdoorContrast ? 'Outdoor Sun: ON' : 'Outdoor View'}</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. VERSE OF THE WEEK (SPIRITUAL ANCHOR) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {effectiveScripture && (
        <div
          data-testid="verse-of-week-card"
          className={`mb-6 rounded-2xl p-5 sm:p-6 transition-all border relative overflow-hidden ${
            outdoorContrast
              ? 'bg-slate-900 border-2 border-amber-300 text-white'
              : 'bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-purple-500/10 border-amber-500/25 shadow-lg'
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute -right-16 -top-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            {/* Top row: Scripture Label, Language Toggle, Copy Button */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Verse of the Week</span>
                </span>
                {effectiveScripture.tag && (
                  <span
                    data-testid="scripture-tag"
                    className="text-xs font-bold text-amber-400 tracking-wide px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20"
                  >
                    {effectiveScripture.tag}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div
                  data-testid="language-toggle-group"
                  className="inline-flex p-0.5 rounded-xl bg-slate-950/60 border border-slate-700/60 text-xs font-semibold"
                >
                  <button
                    type="button"
                    data-testid="lang-toggle-both"
                    onClick={() => setScriptureLang('both')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      scriptureLang === 'both'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Both / ثنائي
                  </button>
                  <button
                    type="button"
                    data-testid="lang-toggle-en"
                    onClick={() => setScriptureLang('en')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      scriptureLang === 'en'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    data-testid="lang-toggle-ar"
                    onClick={() => setScriptureLang('ar')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      scriptureLang === 'ar'
                        ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    العربية
                  </button>
                </div>

                {/* Copy Verse Button */}
                <button
                  type="button"
                  data-testid="copy-scripture-btn"
                  onClick={handleCopyScripture}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    copiedVerse
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                  title="Copy verse to clipboard"
                >
                  {copiedVerse ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scripture Passages */}
            <div className="space-y-3 my-2">
              {(scriptureLang === 'en' || scriptureLang === 'both') && effectiveScripture.textEn && (
                <p
                  data-testid="scripture-text-en"
                  className={`text-sm sm:text-base leading-relaxed italic ${
                    outdoorContrast ? 'text-white font-semibold' : 'text-slate-100 font-normal'
                  }`}
                >
                  &ldquo;{effectiveScripture.textEn}&rdquo;
                </p>
              )}

              {(scriptureLang === 'ar' || scriptureLang === 'both') && effectiveScripture.textAr && (
                <p
                  data-testid="scripture-text-ar"
                  dir="rtl"
                  className={`text-sm sm:text-base leading-loose font-serif ${
                    outdoorContrast ? 'text-amber-200 font-bold' : 'text-amber-200/95 font-medium'
                  }`}
                >
                  «{effectiveScripture.textAr}»
                </p>
              )}
            </div>

            {/* Reference & Reflection */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/60 mt-3">
              <div className="flex items-center gap-2">
                <span
                  data-testid="scripture-reference"
                  className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  {effectiveScripture.reference}
                  {effectiveScripture.referenceAr && scriptureLang !== 'en' && (
                    <span className="text-xs text-amber-400/80 mr-1">({effectiveScripture.referenceAr})</span>
                  )}
                </span>
                {effectiveScripture.theme && (
                  <span className="text-xs text-slate-400 font-medium hidden md:inline">
                    • {effectiveScripture.theme}
                  </span>
                )}
              </div>

              {effectiveScripture.reflection && (
                <span className="text-xs text-slate-300 italic max-w-md text-right hidden lg:inline">
                  &ldquo;{effectiveScripture.reflection}&rdquo;
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. RESPONSIVE MULTI-COLUMN RELATIONAL GRID */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* ========================================================== */}
        {/* LEFT COLUMN: ANNOUNCEMENTS & PRAYER PREVIEWS */}
        {/* ========================================================== */}
        <div className="space-y-5">
          {/* Card A: Recent Community Announcements */}
          <div
            data-testid="announcements-container"
            className={`rounded-2xl p-5 border transition-all ${
              outdoorContrast
                ? 'bg-slate-900 border-2 border-slate-600 text-white'
                : 'bg-slate-900/70 border-slate-800/80 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-300">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Community Announcements</h3>
                  <p className="text-[11px] text-slate-400">Published by coordinators & servants</p>
                </div>
              </div>

              {onOpenAnnouncements && (
                <button
                  type="button"
                  data-testid="view-all-announcements-btn"
                  onClick={() => onOpenAnnouncements()}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List or Empty State */}
            {effectiveAnnouncements && effectiveAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {effectiveAnnouncements.map((item) => {
                  const badgeStyle = getCategoryBadgeStyle(item.category);
                  return (
                    <div
                      key={item.id}
                      data-testid={`announcement-item-${item.id}`}
                      onClick={() => onOpenAnnouncements?.(item)}
                      className={`group p-3.5 rounded-xl border transition-all cursor-pointer ${
                        outdoorContrast
                          ? 'bg-slate-950 border-slate-700 hover:border-cyan-400'
                          : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                          {item.category || 'General'}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>{item.date}</span>
                        </div>
                      </div>

                      <h4
                        className={`text-sm font-bold group-hover:text-cyan-300 transition-colors ${
                          outdoorContrast ? 'text-white' : 'text-slate-100'
                        }`}
                      >
                        {item.title}
                      </h4>

                      {item.summary && (
                        <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                          {item.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 mt-2 border-t border-slate-800/50">
                        <span className="font-medium">By {item.publishedBy || 'Coordinators Team'}</span>
                        <span className="text-cyan-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                          Read details <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                data-testid="announcements-empty-state"
                className="py-6 px-4 text-center rounded-xl bg-slate-800/20 border border-dashed border-slate-800"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-400 mb-2">
                  <Bell className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">All caught up!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  No active announcements right now. Check back soon for weekend fixtures and fellowship notes.
                </p>
                {onOpenAnnouncements && (
                  <button
                    type="button"
                    onClick={() => onOpenAnnouncements()}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-cyan-300 border border-slate-700 hover:bg-slate-700"
                  >
                    View Announcement Archive
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card B: Safe Prayer & Testimony Preview */}
          <div
            data-testid="prayers-container"
            className={`rounded-2xl p-5 border transition-all ${
              outdoorContrast
                ? 'bg-slate-900 border-2 border-slate-600 text-white'
                : 'bg-slate-900/70 border-slate-800/80 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-300">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">Prayer & Testimony Preview</h3>
                    <span
                      data-testid="safe-prayer-badge"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      title="All shared prayers are gently moderated to uphold family privacy"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Safe & Moderated
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Lifting one another up in faith and brotherly love</p>
                </div>
              </div>

              {onOpenPrayerWall && (
                <button
                  type="button"
                  data-testid="open-prayer-wall-btn"
                  onClick={() => onOpenPrayerWall()}
                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 transition-colors"
                >
                  <span>Prayer Wall</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* List or Empty State */}
            {effectivePrayers && effectivePrayers.length > 0 ? (
              <div className="space-y-3">
                {effectivePrayers.map((prayer) => {
                  const pId = prayer.id || 'pr-unknown';
                  const currentAmen = amenState[pId] || {
                    hasReacted: Boolean(prayer.hasAmen),
                    count: typeof prayer.amenCount === 'number' ? prayer.amenCount : 0,
                  };
                  const authorName = getFirstNameOnly(prayer.authorFirstName || prayer.authorName, prayer.isAnonymous);
                  const sanitizedContent = sanitizePrayerContent(prayer.content || prayer.description || '');

                  return (
                    <div
                      key={pId}
                      data-testid={`prayer-item-${pId}`}
                      className={`p-3.5 rounded-xl border transition-all ${
                        outdoorContrast
                          ? 'bg-slate-950 border-slate-700'
                          : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold text-rose-300">
                            {prayer.isAnonymous ? '🕊️' : authorName[0] || 'V'}
                          </div>
                          <span className="text-xs font-bold text-slate-200">{authorName}</span>
                          {prayer.isAnonymous && (
                            <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                              Anonymous
                            </span>
                          )}
                        </div>

                        {prayer.tag && (
                          <span className="text-[11px] font-semibold text-purple-300 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20">
                            {prayer.tag}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed italic mb-3">
                        &ldquo;{sanitizedContent}&rdquo;
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/50 text-xs">
                        <span className="text-[11px] text-slate-400">Encouragement for the team</span>

                        {/* Interactive Amen / Praying Button */}
                        <button
                          type="button"
                          data-testid={`amen-btn-${pId}`}
                          onClick={(e) => handleAmenClick(prayer, e)}
                          aria-pressed={currentAmen.hasReacted}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            currentAmen.hasReacted
                              ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-sm scale-102'
                              : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30'
                          }`}
                          title="Click to pray and send an Amen"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-transform ${
                              currentAmen.hasReacted ? 'fill-rose-400 text-rose-400 scale-110' : 'text-slate-400'
                            }`}
                          />
                          <span>
                            {currentAmen.hasReacted ? 'Amen! Praying' : 'Amen'}
                            {currentAmen.count > 0 && ` (${currentAmen.count})`}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                data-testid="prayers-empty-state"
                className="py-6 px-4 text-center rounded-xl bg-slate-800/20 border border-dashed border-slate-800"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-400 mb-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">No prayer requests posted yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Have a burden or a praise report to share? Post gently on the community prayer wall.
                </p>
                {onOpenPrayerWall && (
                  <button
                    type="button"
                    onClick={() => onOpenPrayerWall()}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                  >
                    Share Prayer on Wall
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================== */}
        {/* RIGHT COLUMN: WELCOMED NEW MEMBERS & CELEBRATIONS */}
        {/* ========================================================== */}
        <div className="space-y-5">
          {/* Card C: New Members Welcomed This Week */}
          <div
            data-testid="new-members-container"
            className={`rounded-2xl p-5 border transition-all ${
              outdoorContrast
                ? 'bg-slate-900 border-2 border-slate-600 text-white'
                : 'bg-slate-900/70 border-slate-800/80 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-300">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Welcomed This Week</h3>
                  <p className="text-[11px] text-slate-400">New friends joining the VBT family</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {`${effectiveNewMembers?.length || 0} New`}
              </span>
            </div>

            {/* List or Empty State */}
            {effectiveNewMembers && effectiveNewMembers.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {effectiveNewMembers.map((member) => {
                    const firstName = getFirstNameOnly(member.firstName || member.name);
                    const initials = member.initials || getMemberInitials(member);

                    return (
                      <div
                        key={member.id}
                        data-testid={`new-member-item-${member.id}`}
                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                          outdoorContrast
                            ? 'bg-slate-950 border-slate-700'
                            : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/60 hover:border-emerald-500/30'
                        }`}
                      >
                        {/* Avatar initials with glowing ring */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-teal-500/20 border border-emerald-400/40 flex items-center justify-center text-xs font-black text-emerald-300 shrink-0 shadow-sm">
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              data-testid="member-first-name"
                              className={`text-sm font-bold truncate ${
                                outdoorContrast ? 'text-white' : 'text-slate-100'
                              }`}
                            >
                              {firstName}
                            </span>
                          </div>

                          <div className="mt-0.5">
                            <span
                              data-testid="member-welcoming-badge"
                              className="inline-block text-[10px] font-bold text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 truncate max-w-full"
                            >
                              {member.badge || 'Welcome! 🎉'}
                            </span>
                          </div>

                          {member.joinedText && (
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {member.joinedText}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 text-center border-t border-slate-800/50">
                  <p className="text-[11px] text-slate-300 font-medium flex items-center justify-center gap-1.5">
                    <span>Give them a warm high-five when you see them on the court this Friday! 🤝</span>
                  </p>
                </div>
              </div>
            ) : (
              <div
                data-testid="new-members-empty-state"
                className="py-6 px-4 text-center rounded-xl bg-slate-800/20 border border-dashed border-slate-800"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-400 mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">Our family is always open!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Invite a friend, teammate, or neighbor to join us at this Friday&apos;s youth sports gathering.
                </p>
              </div>
            )}
          </div>

          {/* Card D: Upcoming Birthdays & Celebrations */}
          <div
            data-testid="celebrations-container"
            className={`rounded-2xl p-5 border transition-all ${
              outdoorContrast
                ? 'bg-slate-900 border-2 border-slate-600 text-white'
                : 'bg-slate-900/70 border-slate-800/80 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/25 flex items-center justify-center text-fuchsia-300">
                  <PartyPopper className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Birthdays & Celebrations</h3>
                  <p className="text-[11px] text-slate-400">Rejoicing together with our community</p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-400">This Week</span>
            </div>

            {/* List or Empty State */}
            {effectiveCelebrations && effectiveCelebrations.length > 0 ? (
              <div className="space-y-2.5">
                {effectiveCelebrations.map((item) => {
                  const firstName = getFirstNameOnly(item.firstName || item.name);
                  const IconComponent = getCelebrationIcon(item.icon || item.type);

                  return (
                    <div
                      key={item.id}
                      data-testid={`celebration-item-${item.id}`}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        outdoorContrast
                          ? 'bg-slate-950 border-slate-700'
                          : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-300 shrink-0 shadow-sm">
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              data-testid="celebration-first-name"
                              className={`text-sm font-bold truncate ${
                                outdoorContrast ? 'text-white' : 'text-slate-100'
                              }`}
                            >
                              {firstName}
                            </span>
                            <span
                              data-testid="celebration-label"
                              className="text-[11px] font-semibold text-fuchsia-300 px-2 py-0.5 rounded-md bg-fuchsia-500/15 border border-fuchsia-500/20 shrink-0"
                            >
                              {item.label || 'Celebration 🎉'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span data-testid="celebration-date" className="font-medium text-slate-300">
                              {item.date}
                            </span>
                            {item.note && <span className="truncate">• {item.note}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700 inline-flex items-center gap-1">
                          <span>Blessings 🙏</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                data-testid="celebrations-empty-state"
                className="py-6 px-4 text-center rounded-xl bg-slate-800/20 border border-dashed border-slate-800"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800/60 mx-auto flex items-center justify-center text-slate-400 mb-2">
                  <Cake className="w-4 h-4 text-fuchsia-400" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">No birthdays scheduled this week</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Let&apos;s celebrate and thank each other every day on and off the court!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CommunityPulse;
