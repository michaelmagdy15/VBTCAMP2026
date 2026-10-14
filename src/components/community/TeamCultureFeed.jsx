import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Heart,
  Send,
  Sparkles,
  Trophy,
  Award,
  Users,
  Shield,
  Lock,
  Flag,
  MoreVertical,
  EyeOff,
  Eye,
  Archive,
  RefreshCw,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  BookOpen,
  Flame,
  AlertTriangle,
  Smile,
  X,
  Share2,
  Camera,
  ChevronDown,
  Info,
  ShieldAlert,
  Clock,
  Pin,
} from 'lucide-react';
import {
  VISIBILITY_SCOPES,
  POST_TYPES,
  REACTION_TYPES,
  REACTION_EMOJIS,
  MODERATION_ACTIONS,
  FEED_FILTER_SCOPES,
  isUserLeader,
  isUserPastoral,
  canUserViewPost,
  getFilteredFeed,
  createCommunityPost,
  addPostReaction,
  sendThankServantNote,
  moderatePost,
  reportPost,
  getVerseOfTheWeek,
  joinChallenge,
  celebrateMilestone,
  createTeamChallenge,
  subscribeToFilteredFeed,
  DEFAULT_COMMUNITY_ID,
} from '../../services/teamCultureService';

// ─────────────────────────────────────────────
// Scope & Badge Metadata
// ─────────────────────────────────────────────

const SCOPE_CONFIG = {
  [VISIBILITY_SCOPES.COMMUNITY]: {
    label: 'Community',
    icon: Users,
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  [VISIBILITY_SCOPES.TEAM]: {
    label: 'Team Only',
    icon: Users,
    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  [VISIBILITY_SCOPES.GROUP]: {
    label: 'Servant Circle',
    icon: Sparkles,
    bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  [VISIBILITY_SCOPES.LEADER_ONLY]: {
    label: 'Leaders Only',
    icon: Shield,
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  [VISIBILITY_SCOPES.PASTORAL_PRIVATE]: {
    label: 'Pastoral Confidential',
    icon: Lock,
    bg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
  [VISIBILITY_SCOPES.PRIVATE]: {
    label: 'Private Note',
    icon: Lock,
    bg: 'bg-slate-700 text-slate-300 border-slate-600',
  },
};

const ROLE_BADGES = {
  admin: { label: 'Admin', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  coordinator: { label: 'Coordinator', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  team_leader: { label: 'Team Lead', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  service_leader: { label: 'Service Lead', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  game_leader: { label: 'Game Lead', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  pastoral_care_leader: { label: 'Pastoral Care', color: 'bg-purple-600/20 text-purple-200 border-purple-600/40' },
  pastoral_care: { label: 'Pastoral Care', color: 'bg-purple-600/20 text-purple-200 border-purple-600/40' },
  active_servant: { label: 'Servant', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  servant: { label: 'Servant', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  volunteer: { label: 'Volunteer', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  member: { label: 'Member', color: 'bg-slate-600/30 text-slate-300 border-slate-600/50' },
};

export default function TeamCultureFeed({
  communityId = DEFAULT_COMMUNITY_ID,
  currentUser = { id: 'usr_guest', name: 'Community Guest', role: 'member' },
  teamId = null,
  onNavigateTab = null,
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeScopeFilter, setActiveScopeFilter] = useState(FEED_FILTER_SCOPES.ALL);
  const [verseOfTheWeek, setVerseOfTheWeekState] = useState(null);
  const [showVerseFullReflection, setShowVerseFullReflection] = useState(false);
  const [memorizedVerse, setMemorizedVerse] = useState(false);

  // Modals & Panels
  const [showThankServantModal, setShowThankServantModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(null); // postId to report
  const [reportReason, setReportReason] = useState('');
  const [activeModerationMenuPostId, setActiveModerationMenuPostId] = useState(null);
  const [showAuditTrailPostId, setShowAuditTrailPostId] = useState(null);
  const [moderatorNoteInput, setModeratorNoteInput] = useState('');
  const [submittingNotePostId, setSubmittingNotePostId] = useState(null);

  // Thank Servant Form
  const [thankRecipientId, setThankRecipientId] = useState('');
  const [thankRecipientName, setThankRecipientName] = useState('');
  const [thankMessage, setThankMessage] = useState('');
  const [thankVisibility, setThankVisibility] = useState(VISIBILITY_SCOPES.COMMUNITY);
  const [thankSubmitting, setThankSubmitting] = useState(false);

  // Create Post Form
  const [newPostType, setNewPostType] = useState(POST_TYPES.GENERAL);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostVisibility, setNewPostVisibility] = useState(VISIBILITY_SCOPES.COMMUNITY);
  const [newPostMediaUrl, setNewPostMediaUrl] = useState('');
  const [newPostChallengeGoal, setNewPostChallengeGoal] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const isLeader = useMemo(() => isUserLeader(currentUser), [currentUser]);
  const isPastoral = useMemo(() => isUserPastoral(currentUser), [currentUser]);

  // Load verse of the week
  useEffect(() => {
    let isMounted = true;
    getVerseOfTheWeek(communityId)
      .then((verse) => {
        if (isMounted) setVerseOfTheWeekState(verse);
      })
      .catch((err) => {
        console.error('Failed to load verse of the week:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [communityId]);

  // Real-time subscription to feed
  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFilteredFeed(communityId, currentUser, {
        scope: activeScopeFilter,
        teamId: activeScopeFilter === FEED_FILTER_SCOPES.MY_TEAM ? (teamId || currentUser?.teamId) : null,
        includeHidden: isLeader,
      });
      setPosts(result);
    } catch (err) {
      console.error('Failed to load culture feed:', err);
      setError('Unable to load community feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [communityId, currentUser, activeScopeFilter, teamId, isLeader]);

  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = subscribeToFilteredFeed(
        communityId,
        currentUser,
        (updatedFeed) => {
          setPosts(updatedFeed);
          setLoading(false);
        },
        {
          scope: activeScopeFilter,
          teamId: activeScopeFilter === FEED_FILTER_SCOPES.MY_TEAM ? (teamId || currentUser?.teamId) : null,
          includeHidden: isLeader,
        }
      );
    } catch (err) {
      console.warn('Realtime subscription fallback to one-time load:', err);
      loadFeed();
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [communityId, currentUser, activeScopeFilter, teamId, isLeader, loadFeed]);

  // Reactions Handler
  const handleToggleReaction = async (postId, reactionType) => {
    const memberId = currentUser?.id || currentUser?.uid || 'anon_user';
    try {
      // Optimistic update
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id !== postId) return p;
          const currentList = Array.isArray(p.reactions?.[reactionType])
            ? p.reactions[reactionType]
            : [];
          const userAlready = currentList.includes(memberId);
          const nextList = userAlready
            ? currentList.filter((id) => id !== memberId)
            : [...currentList, memberId];
          const nextCounts = {
            ...(p.reactionCounts || {}),
            [reactionType]: nextList.length,
          };
          return {
            ...p,
            reactions: {
              ...(p.reactions || {}),
              [reactionType]: nextList,
            },
            reactionCounts: nextCounts,
          };
        })
      );

      await addPostReaction(communityId, postId, memberId, reactionType);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      loadFeed(); // Rollback
    }
  };

  // Submit Thank a Servant
  const handleSendThankServant = async (e) => {
    e.preventDefault();
    if (!thankRecipientId || !thankMessage.trim()) return;

    setThankSubmitting(true);
    try {
      await sendThankServantNote(
        communityId,
        currentUser,
        thankRecipientId,
        thankMessage.trim(),
        thankVisibility,
        {
          recipientName: thankRecipientName || thankRecipientId,
          teamId: currentUser?.teamId,
          groupId: currentUser?.groupId,
        }
      );
      setShowThankServantModal(false);
      setThankRecipientId('');
      setThankRecipientName('');
      setThankMessage('');
      setThankVisibility(VISIBILITY_SCOPES.COMMUNITY);
      loadFeed();
    } catch (err) {
      console.error('Failed to send thank you note:', err);
      alert('Could not send note: ' + err.message);
    } finally {
      setThankSubmitting(false);
    }
  };

  // Submit Create Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    setCreateSubmitting(true);
    try {
      const postPayload = {
        type: newPostType,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        visibility: newPostVisibility,
        teamId: newPostVisibility === VISIBILITY_SCOPES.TEAM ? (currentUser?.teamId || teamId) : null,
        groupId: newPostVisibility === VISIBILITY_SCOPES.GROUP ? currentUser?.groupId : null,
        media: newPostMediaUrl ? [{ url: newPostMediaUrl, caption: newPostTitle }] : [],
      };

      if (newPostType === POST_TYPES.CHALLENGE) {
        postPayload.challenge = {
          category: 'drill',
          targetGoal: newPostChallengeGoal || 'Daily sports drill & verse recitation',
          rewardPoints: 50,
          participants: [currentUser?.id || 'creator'],
          completions: [],
        };
      }

      await createCommunityPost(communityId, postPayload, currentUser);
      setShowCreatePostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostMediaUrl('');
      setNewPostChallengeGoal('');
      setNewPostVisibility(VISIBILITY_SCOPES.COMMUNITY);
      setNewPostType(POST_TYPES.GENERAL);
      loadFeed();
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('Could not create post: ' + err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Join Challenge
  const handleJoinChallenge = async (postId) => {
    try {
      await joinChallenge(communityId, postId, currentUser);
      loadFeed();
    } catch (err) {
      console.error('Failed to join challenge:', err);
    }
  };

  // Moderation Action Handler
  const handleModeration = async (postId, action, reason = '') => {
    try {
      await moderatePost(communityId, postId, action, currentUser, reason);
      setActiveModerationMenuPostId(null);
      loadFeed();
    } catch (err) {
      console.error(`Moderation action "${action}" failed:`, err);
      alert('Moderation error: ' + err.message);
    }
  };

  // Submit Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!showReportModal) return;

    try {
      await reportPost(
        communityId,
        showReportModal,
        currentUser,
        reportReason || 'Inappropriate content'
      );
      alert('Thank you. The post has been flagged for leader review.');
      setShowReportModal(null);
      setReportReason('');
      loadFeed();
    } catch (err) {
      console.error('Report submission failed:', err);
      alert('Could not submit report: ' + err.message);
    }
  };

  // Add Moderator Note
  const handleAddModeratorNote = async (postId) => {
    if (!moderatorNoteInput.trim()) return;
    try {
      await moderatePost(
        communityId,
        postId,
        MODERATION_ACTIONS.ADD_NOTE,
        currentUser,
        moderatorNoteInput.trim()
      );
      setModeratorNoteInput('');
      setSubmittingNotePostId(null);
      loadFeed();
    } catch (err) {
      alert('Could not add note: ' + err.message);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 px-2 sm:px-4 text-slate-100">
      {/* ─────────────────────────────────────────────
          1. Hero & Quick Actions Banner
      ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Community Fellowship & Culture
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Team Culture & Relationships
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-300 max-w-xl">
              Keep the sports camp flame alive between weekly meets. Celebrate milestones, encourage
              faithful servants, and take on team scripture challenges.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowThankServantModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-medium text-sm shadow-lg shadow-rose-900/30 transition-all active:scale-95"
            >
              <Heart className="w-4 h-4 fill-white" />
              Thank a Servant
            </button>

            <button
              onClick={() => setShowCreatePostModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Share with Squad
            </button>

            <button
              onClick={loadFeed}
              title="Refresh Feed"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Pastoral Privacy Badge Guarantee */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>
              <strong className="text-slate-200">Strict Privacy Enforcement:</strong> Pastoral
              confidential notes are isolated and never exposed to the public feed or AI context.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
            VBT Camp Security 2.0
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
          2. Verse of the Week Card
      ───────────────────────────────────────────── */}
      {verseOfTheWeek && (
        <div className="rounded-2xl bg-slate-900/90 border border-amber-500/20 p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Verse of the Week</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {verseOfTheWeek.theme || 'Faith & Athletics'}
              </span>
            </div>
            <button
              onClick={() => setMemorizedVerse(!memorizedVerse)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                memorizedVerse
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {memorizedVerse ? 'Memorized! 🌟' : 'I memorized this'}
            </button>
          </div>

          <div className="mt-3">
            <blockquote className="text-base sm:text-lg font-serif italic text-amber-100">
              "{verseOfTheWeek.verse}"
            </blockquote>
            <p className="mt-1 text-sm font-semibold text-amber-400/90 text-right">
              — {verseOfTheWeek.reference}
            </p>
          </div>

          {/* Devotion reflection */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs sm:text-sm text-slate-300 space-y-2">
            <p>
              <strong className="text-amber-300">Sports Camp Reflection: </strong>
              {verseOfTheWeek.reflection}
            </p>

            {verseOfTheWeek.sportsChallenge && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-200 text-xs">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Weekly Drill Challenge: </strong>
                  {verseOfTheWeek.sportsChallenge}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          3. Scope Selector Tabs Filter
      ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs sm:text-sm">
        {[
          { key: FEED_FILTER_SCOPES.ALL, label: 'All Feeds', icon: Users },
          { key: FEED_FILTER_SCOPES.MY_TEAM, label: 'My Team', icon: Trophy },
          { key: FEED_FILTER_SCOPES.SERVANTS, label: 'Servants', icon: Heart },
          { key: FEED_FILTER_SCOPES.ANNOUNCEMENTS, label: 'Announcements', icon: Award },
          { key: FEED_FILTER_SCOPES.CHALLENGES, label: 'Challenges', icon: Flame },
          { key: FEED_FILTER_SCOPES.CELEBRATIONS, label: 'Celebrations', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeScopeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveScopeFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────
          4. Feed Post List
      ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-slate-400 text-sm">Gathering community posts and celebrations...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadFeed}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium"
          >
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">No posts in this channel yet</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1">
              Be the first to share an encouragement, team milestone, or sports reflection!
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowThankServantModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow"
            >
              Thank a Servant
            </button>
            <button
              onClick={() => setShowCreatePostModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              Create Post
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const authorRoleMeta = ROLE_BADGES[post.author?.role] || ROLE_BADGES.member;
            const scopeMeta = SCOPE_CONFIG[post.visibility] || SCOPE_CONFIG[VISIBILITY_SCOPES.COMMUNITY];
            const ScopeIcon = scopeMeta.icon;
            const isAuthor =
              currentUser?.id && post.author?.id && String(currentUser.id) === String(post.author.id);
            const isHidden = post.status === 'hidden' || post.moderation?.hidden;
            const isFlagged = post.moderation?.isFlagged;

            return (
              <div
                key={post.id}
                className={`rounded-2xl bg-slate-900/90 border p-5 sm:p-6 transition-all duration-200 ${
                  post.pinned
                    ? 'border-indigo-500/50 shadow-indigo-950/20'
                    : isHidden
                    ? 'border-rose-500/30 bg-rose-950/10'
                    : 'border-slate-800/80 hover:border-slate-700 shadow-xl'
                }`}
              >
                {/* Moderation Warnings */}
                {isHidden && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <EyeOff className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>Hidden by Moderator:</strong> Only leaders and the author can view this post.
                    </span>
                  </div>
                )}

                {isFlagged && isLeader && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <strong>Flagged for Review:</strong> {post.moderation?.reportCount || 1} report(s).
                    </span>
                    <button
                      onClick={() => handleModeration(post.id, MODERATION_ACTIONS.RESOLVE_REPORT)}
                      className="underline text-amber-200 hover:text-white"
                    >
                      Resolve Flag
                    </button>
                  </div>
                )}

                {/* Post Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm sm:text-base">
                          {post.author?.name || 'Community Member'}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${authorRoleMeta.color}`}
                        >
                          {authorRoleMeta.label}
                        </span>
                        {post.author?.teamName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {post.author.teamName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span>
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                        <span>•</span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${scopeMeta.bg}`}
                        >
                          <ScopeIcon className="w-2.5 h-2.5" />
                          {scopeMeta.label}
                        </span>
                        {post.pinned && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 font-semibold">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Options / Moderation Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveModerationMenuPostId(
                          activeModerationMenuPostId === post.id ? null : post.id
                        )
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Post options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeModerationMenuPostId === post.id && (
                      <div className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-1 z-30 text-xs text-slate-200">
                        <button
                          onClick={() => {
                            setShowReportModal(post.id);
                            setActiveModerationMenuPostId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center gap-2 text-rose-300"
                        >
                          <Flag className="w-3.5 h-3.5" /> Report Post
                        </button>

                        {isLeader && (
                          <>
                            <div className="border-t border-slate-700 my-1" />
                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Leader Moderation
                            </div>

                            {isHidden ? (
                              <button
                                onClick={() => handleModeration(post.id, MODERATION_ACTIONS.RESTORE)}
                                className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center gap-2 text-emerald-300"
                              >
                                <Eye className="w-3.5 h-3.5" /> Restore to Feed
                              </button>
                            ) : (
                              <button
                                onClick={() => handleModeration(post.id, MODERATION_ACTIONS.HIDE, 'Leader hide')}
                                className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center gap-2 text-amber-300"
                              >
                                <EyeOff className="w-3.5 h-3.5" /> Hide from Feed
                              </button>
                            )}

                            <button
                              onClick={() => handleModeration(post.id, MODERATION_ACTIONS.ARCHIVE)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center gap-2 text-slate-300"
                            >
                              <Archive className="w-3.5 h-3.5" /> Archive Post
                            </button>

                            <button
                              onClick={() => {
                                setSubmittingNotePostId(post.id);
                                setActiveModerationMenuPostId(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center gap-2 text-indigo-300"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Add Leader Note
                            </button>

                            <button
                              onClick={() => {
                                setShowAuditTrailPostId(post.id);
                                setActiveModerationMenuPostId(null);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-700/70 flex items-center gap-2 text-slate-400"
                            >
                              <Shield className="w-3.5 h-3.5" /> View Audit Trail
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Specialized Card Types */}

                {/* 1. Thank a Servant Card */}
                {post.type === POST_TYPES.THANK_SERVANT && (
                  <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-pink-950/20 to-slate-900 border border-rose-500/20">
                    <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wide">
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      <span>Thank a Servant Encouragement</span>
                    </div>
                    {post.targetMemberName && (
                      <p className="text-sm font-semibold text-rose-200 mt-1">
                        Honoring: <span className="text-white underline">{post.targetMemberName}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Celebration & Milestone */}
                {post.type === POST_TYPES.MILESTONE && (
                  <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900 border border-amber-500/30 flex items-center gap-3">
                    <span className="text-3xl">{post.badge || '🎂'}</span>
                    <div>
                      <h4 className="font-bold text-amber-200 text-sm">
                        {post.milestone?.achievement || post.title || 'Community Celebration'}
                      </h4>
                      <p className="text-xs text-amber-300/80">
                        {post.targetMemberName ? `Celebrating ${post.targetMemberName}` : 'Milestone achieved!'}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Challenge Card */}
                {post.type === POST_TYPES.CHALLENGE && post.challenge && (
                  <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-blue-950/30 to-slate-900 border border-indigo-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span>Team Drill & Scripture Challenge</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
                        +{post.challenge.rewardPoints || 50} pts
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-200 font-medium">
                      🎯 Goal: {post.challenge.targetGoal}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400">
                        Participants: {post.challenge.participants?.length || 0} warriors
                      </span>
                      <button
                        onClick={() => handleJoinChallenge(post.id)}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all active:scale-95"
                      >
                        Join Challenge
                      </button>
                    </div>
                  </div>
                )}

                {/* Post Content */}
                <div className="mt-3 text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                {/* Post Media */}
                {Array.isArray(post.media) && post.media.length > 0 && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 max-h-96">
                    <img
                      src={post.media[0].url}
                      alt={post.media[0].caption || 'Post image'}
                      className="w-full object-cover"
                    />
                    {post.media[0].caption && (
                      <p className="p-2 bg-slate-950/80 text-xs text-slate-400 italic">
                        {post.media[0].caption}
                      </p>
                    )}
                  </div>
                )}

                {/* Moderator Notes (Visible only to leaders) */}
                {isLeader && post.moderation?.moderatorNotes?.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1 text-xs">
                    <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Leader Notes:
                    </div>
                    {post.moderation.moderatorNotes.map((n, i) => (
                      <div key={i} className="text-slate-300 pl-4 border-l-2 border-indigo-500">
                        "{n.note}" — <span className="text-slate-400">{n.moderatorName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Moderator Note Input (when toggled) */}
                {submittingNotePostId === post.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={moderatorNoteInput}
                      onChange={(e) => setModeratorNoteInput(e.target.value)}
                      placeholder="Add private note for leaders..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleAddModeratorNote(post.id)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setSubmittingNotePostId(null)}
                      className="p-1.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Reactions Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {[
                      { type: REACTION_TYPES.HEART, label: 'Love', emoji: '❤️' },
                      { type: REACTION_TYPES.AMEN, label: 'Amen', emoji: '✝️' },
                      { type: REACTION_TYPES.CLAP, label: 'Clap', emoji: '👏' },
                      { type: REACTION_TYPES.PRAY, label: 'Pray', emoji: '🙏' },
                      { type: REACTION_TYPES.FIRE, label: 'Fire', emoji: '🔥' },
                    ].map((btn) => {
                      const count = post.reactionCounts?.[btn.type] || 0;
                      const hasReacted =
                        Array.isArray(post.reactions?.[btn.type]) &&
                        currentUser?.id &&
                        post.reactions[btn.type].includes(currentUser.id);

                      return (
                        <button
                          key={btn.type}
                          onClick={() => handleToggleReaction(post.id, btn.type)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all active:scale-90 ${
                            hasReacted
                              ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                              : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                          }`}
                        >
                          <span>{btn.emoji}</span>
                          {count > 0 && <span className="font-semibold text-[11px]">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    {Object.values(post.reactionCounts || {}).reduce((a, b) => a + b, 0)} reactions
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          5. Thank a Servant Modal
      ───────────────────────────────────────────── */}
      {showThankServantModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowThankServantModal(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-rose-400 font-bold text-base">
              <Heart className="w-5 h-5 fill-rose-500" />
              <span>Thank a Servant</span>
            </div>

            <form onSubmit={handleSendThankServant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Recipient Servant Name
                </label>
                <input
                  type="text"
                  required
                  value={thankRecipientName}
                  onChange={(e) => {
                    setThankRecipientName(e.target.value);
                    setThankRecipientId(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  placeholder="e.g. Coach David or Mary Shenouda"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Encouragement Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={thankMessage}
                  onChange={(e) => setThankMessage(e.target.value)}
                  placeholder="Thank you for helping our station today and inspiring the kids..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Visibility
                </label>
                <select
                  value={thankVisibility}
                  onChange={(e) => setThankVisibility(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value={VISIBILITY_SCOPES.COMMUNITY}>Whole Community (Public Feed)</option>
                  <option value={VISIBILITY_SCOPES.TEAM}>My Team Only</option>
                  <option value={VISIBILITY_SCOPES.GROUP}>Servant Circle Only</option>
                  <option value={VISIBILITY_SCOPES.PRIVATE}>Private (Only Recipient & Leaders)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowThankServantModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={thankSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
                >
                  {thankSubmitting ? 'Sending Note...' : 'Post Encouragement 🙏'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          6. Create Post Modal ("Share with Squad")
      ───────────────────────────────────────────── */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowCreatePostModal(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-indigo-400 font-bold text-base">
              <Plus className="w-5 h-5" />
              <span>Share with Squad</span>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Post Type
                  </label>
                  <select
                    value={newPostType}
                    onChange={(e) => setNewPostType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={POST_TYPES.GENERAL}>General Post</option>
                    {isLeader && <option value={POST_TYPES.ANNOUNCEMENT}>Group Announcement</option>}
                    <option value={POST_TYPES.CHALLENGE}>Team Challenge</option>
                    <option value={POST_TYPES.PHOTO_MEMORY}>Photo Memory</option>
                    <option value={POST_TYPES.MILESTONE}>Celebration / Milestone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Visibility Scope
                  </label>
                  <select
                    value={newPostVisibility}
                    onChange={(e) => setNewPostVisibility(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={VISIBILITY_SCOPES.COMMUNITY}>Whole Community</option>
                    <option value={VISIBILITY_SCOPES.TEAM}>My Team Only</option>
                    <option value={VISIBILITY_SCOPES.GROUP}>Servant Group Only</option>
                    {isLeader && <option value={VISIBILITY_SCOPES.LEADER_ONLY}>Leaders Only</option>}
                    {isPastoral && (
                      <option value={VISIBILITY_SCOPES.PASTORAL_PRIVATE}>
                        Pastoral Confidential 🔒
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="e.g. Great practice scrimmage today!"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's inspiring you or happening on the courts?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {newPostType === POST_TYPES.CHALLENGE && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Challenge Target Goal
                  </label>
                  <input
                    type="text"
                    value={newPostChallengeGoal}
                    onChange={(e) => setNewPostChallengeGoal(e.target.value)}
                    placeholder="e.g. 50 free throws + recite Colossians 3:23"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              )}

              {newPostType === POST_TYPES.PHOTO_MEMORY && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Photo URL
                  </label>
                  <input
                    type="url"
                    value={newPostMediaUrl}
                    onChange={(e) => setNewPostMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-900/30 transition-all disabled:opacity-50"
                >
                  {createSubmitting ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          7. Report Post Modal
      ───────────────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowReportModal(null)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3 text-rose-400 font-bold text-base">
              <Flag className="w-5 h-5" />
              <span>Report Post</span>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Help keep our sports community safe and honoring Christ. Reports are reviewed by
              coordinators and station leaders.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Report
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200"
                >
                  <option value="Inappropriate language or behavior">Inappropriate language or behavior</option>
                  <option value="Off-topic or spam">Off-topic or spam</option>
                  <option value="Harassment or poor sportsmanship">Harassment or poor sportsmanship</option>
                  <option value="Pastoral or privacy concern">Pastoral or privacy concern</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
          8. Audit Trail Modal (Leaders Only)
      ───────────────────────────────────────────── */}
      {showAuditTrailPostId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowAuditTrailPostId(null)}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3 text-indigo-400 font-bold text-base">
              <Shield className="w-5 h-5" />
              <span>Post Audit Trail & Log</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 text-xs">
              {(() => {
                const targetPost = posts.find((p) => p.id === showAuditTrailPostId);
                const auditTrail = targetPost?.moderation?.auditTrail || [];
                if (auditTrail.length === 0) {
                  return <p className="text-slate-500">No moderation actions recorded yet.</p>;
                }
                return auditTrail.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-slate-200">
                      <span className="uppercase text-[10px] text-indigo-400">{item.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      By: <span className="font-semibold">{item.performedBy}</span> ({item.role})
                    </div>
                    {item.reason && (
                      <div className="text-slate-400 italic">Reason: "{item.reason}"</div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
