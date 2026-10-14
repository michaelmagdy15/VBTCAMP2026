import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Shield,
  Star,
  Compass,
  ChevronRight,
  GraduationCap,
  Check,
  X,
  Sparkles,
  Lock,
  Clock,
  Heart,
  Send,
  MessageSquare,
  Calendar,
  BadgeCheck,
  AlertCircle,
  User,
  FileText,
  Flame,
  Bookmark,
  Share2,
  Info,
  ChevronDown,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../../utils/haptics';
import {
  PASSPORT_TIERS,
  PASSPORT_TIER_ORDER,
  STANDARD_SERVANT_ROLES,
  getTierById,
  getNextTier,
  canAccessPassport,
  canApprovePromotion,
  getServantPassport,
  requestTierPromotion,
  approveTierPromotion,
  addEncouragementNote,
  computeGrowthNextStep,
} from '../../services/servantPassportService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';

/**
 * Stamp Badge Component for visual passport stamps (Seasons, Trainings, Roles)
 */
function StampBadge({ title, subtitle, icon, category = 'season', verified = true, date = '' }) {
  const getBadgeStyle = () => {
    switch (category) {
      case 'season':
        return 'border-amber-500/40 bg-amber-950/20 text-amber-200 shadow-amber-900/20';
      case 'training':
        return 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200 shadow-emerald-900/20';
      case 'role':
        return 'border-sky-500/40 bg-sky-950/20 text-sky-200 shadow-sky-900/20';
      case 'milestone':
        return 'border-purple-500/40 bg-purple-950/20 text-purple-200 shadow-purple-900/20';
      default:
        return 'border-slate-600/40 bg-slate-800/40 text-slate-200 shadow-slate-900/20';
    }
  };

  return (
    <div
      className={`relative group flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed transition-all duration-300 hover:scale-105 hover:border-solid shadow-md ${getBadgeStyle()}`}
    >
      {/* Ink stamp circular accent */}
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-black/30 border border-current/30 text-lg">
        {icon || '🏷️'}
      </div>
      <span className="text-xs font-bold tracking-wider text-center uppercase leading-tight line-clamp-1">
        {title}
      </span>
      {subtitle && (
        <span className="text-[10px] opacity-75 text-center line-clamp-1 mt-0.5">
          {subtitle}
        </span>
      )}
      {date && (
        <span className="text-[9px] font-mono opacity-60 mt-1 uppercase tracking-widest">
          {date}
        </span>
      )}
      {verified && (
        <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow">
          <Check size={10} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

/**
 * Main ServantPassportModal Component
 */
export default function ServantPassportModal({
  isOpen = false,
  onClose,
  memberId,
  currentUser,
  communityId = DEFAULT_COMMUNITY_ID,
  initialPassport = null,
}) {
  const [passport, setPassport] = useState(initialPassport);
  const [loading, setLoading] = useState(!initialPassport);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'pathway' | 'stamps' | 'blessings' | 'leader'
  const [selectedTierDetail, setSelectedTierDetail] = useState(null);

  // Encouragement form state
  const [newEncouragement, setNewEncouragement] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [scriptureVerse, setScriptureVerse] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState('');

  // Promotion request modal / input
  const [showPromotionRequest, setShowPromotionRequest] = useState(false);
  const [promotionNotes, setPromotionNotes] = useState('');
  const [submittingPromotion, setSubmittingPromotion] = useState(false);
  const [promotionSuccessMsg, setPromotionSuccessMsg] = useState('');

  // Leader approval state
  const [leaderReviewNotes, setLeaderReviewNotes] = useState('');
  const [approvingTier, setApprovingTier] = useState(false);

  // Check if current user is viewing their own passport
  const isSelf = useMemo(() => {
    if (!currentUser || !memberId) return false;
    const uid = currentUser.id || currentUser.memberId || currentUser.uid;
    return String(uid) === String(memberId);
  }, [currentUser, memberId]);

  // Check if leader permissions are held
  const isLeader = useMemo(() => {
    return canApprovePromotion(currentUser);
  }, [currentUser]);

  // Check permission to view passport
  const hasAccess = useMemo(() => {
    return canAccessPassport(currentUser, memberId);
  }, [currentUser, memberId]);

  // Fetch or refresh passport data
  const loadPassport = async () => {
    if (!isOpen || !memberId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getServantPassport(communityId, memberId, currentUser);
      setPassport(data);
    } catch (err) {
      console.error('[ServantPassportModal] Error loading passport:', err);
      setError(err.message || 'Unable to load private servant passport.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && memberId) {
      loadPassport();
    }
  }, [isOpen, memberId, currentUser]);

  // Current tier & next tier calculations
  const currentTier = useMemo(() => {
    return getTierById(passport?.currentTier);
  }, [passport?.currentTier]);

  const nextTier = useMemo(() => {
    return getNextTier(currentTier?.id);
  }, [currentTier?.id]);

  const nextGrowthStep = useMemo(() => {
    return passport?.nextGrowthStep || computeGrowthNextStep(passport);
  }, [passport]);

  // Handle Tab Switch with subtle haptic
  const handleTabChange = (tab) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  // Submit Encouragement Note
  const handleSendEncouragement = async (e) => {
    e.preventDefault();
    if (!newEncouragement.trim()) return;

    setSendingNote(true);
    setNoteSuccess('');
    try {
      await addEncouragementNote(
        communityId,
        memberId,
        currentUser,
        newEncouragement.trim(),
        isPrivateNote,
        { scriptureVerse: scriptureVerse.trim(), blessingTag: 'Servant Heart' }
      );
      triggerHaptic('success');
      setNoteSuccess('Blessing added to servant passport!');
      setNewEncouragement('');
      setScriptureVerse('');
      setIsPrivateNote(false);
      await loadPassport();
      setTimeout(() => setNoteSuccess(''), 3500);
    } catch (err) {
      console.error('[ServantPassportModal] Failed to add encouragement:', err);
      alert(err.message || 'Failed to send encouragement.');
    } finally {
      setSendingNote(false);
    }
  };

  // Submit Tier Promotion Request
  const handleRequestPromotion = async (e) => {
    e.preventDefault();
    if (!nextTier) return;

    setSubmittingPromotion(true);
    setPromotionSuccessMsg('');
    try {
      await requestTierPromotion(
        communityId,
        memberId,
        nextTier.id,
        promotionNotes.trim(),
        currentUser
      );
      triggerHaptic('success');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      setPromotionSuccessMsg(`Promotion request to ${nextTier.title} submitted! Our ministry leaders will review with prayer.`);
      setPromotionNotes('');
      setShowPromotionRequest(false);
      await loadPassport();
    } catch (err) {
      console.error('[ServantPassportModal] Failed to request promotion:', err);
      alert(err.message || 'Unable to submit promotion request.');
    } finally {
      setSubmittingPromotion(false);
    }
  };

  // Leader Approves Promotion
  const handleApprovePromotion = async (targetTierId) => {
    if (!isLeader) return;
    setApprovingTier(true);
    try {
      await approveTierPromotion(
        communityId,
        memberId,
        targetTierId,
        currentUser,
        leaderReviewNotes.trim()
      );
      triggerHaptic('success');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
      setLeaderReviewNotes('');
      await loadPassport();
    } catch (err) {
      console.error('[ServantPassportModal] Leader approval failed:', err);
      alert(err.message || 'Failed to approve tier promotion.');
    } finally {
      setApprovingTier(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-950/30 overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100">
        
        {/* Top Gold Embossed Header / Border Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600" />

        {/* Modal Navigation & Controls Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Award size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  Servant Passport
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PRIVATE
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                VBT Kingdom Service • 7-Tier Growth Pathway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60"
              aria-label="Close Servant Passport"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Access Denied Warning State */}
        {!hasAccess ? (
          <div className="p-8 text-center my-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4">
              <Lock size={32} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Private Servant Passport</h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
              Servant passports contain private growth steps, personal blessings, and confidential leadership milestones. Passports are strictly accessible to the servant themselves and authorized community leaders.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all border border-slate-700"
            >
              Return to Community
            </button>
          </div>
        ) : loading ? (
          /* Loading State */
          <div className="p-16 flex flex-col items-center justify-center my-auto">
            <div className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-amber-200/80">Opening servant passport records...</p>
            <p className="text-xs text-slate-400 mt-1">Reflecting on fruitful seasons & ministry blessings</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="p-8 text-center my-auto">
            <AlertCircle size={36} className="text-rose-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-rose-300">{error}</p>
            <button
              onClick={loadPassport}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          /* Main Passport Content */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-x-auto text-xs font-medium">
              <button
                onClick={() => handleTabChange('overview')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold shadow-md shadow-amber-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Compass size={14} />
                Passport Overview
              </button>

              <button
                onClick={() => handleTabChange('pathway')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'pathway'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold shadow-md shadow-amber-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers size={14} />
                7-Tier Pathway
              </button>

              <button
                onClick={() => handleTabChange('stamps')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'stamps'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold shadow-md shadow-amber-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BadgeCheck size={14} />
                Stamps & Badges
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                  {(passport?.seasonsServing?.length || 0) + (passport?.trainingsCompleted?.length || 0)}
                </span>
              </button>

              <button
                onClick={() => handleTabChange('blessings')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'blessings'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-bold shadow-md shadow-amber-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Heart size={14} />
                Blessings & Words
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                  {passport?.encouragements?.length || 0}
                </span>
              </button>

              {isLeader && (
                <button
                  onClick={() => handleTabChange('leader')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                    activeTab === 'leader'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-md shadow-purple-900/30'
                      : 'text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/20'
                  }`}
                >
                  <Shield size={14} />
                  Leader Actions
                  {passport?.promotionRequests?.some((r) => r.status === 'pending') && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              )}
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Visual Passport Card (Official Royal Aesthetic) */}
                <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-950 border-2 border-amber-500/40 shadow-xl shadow-amber-950/20 overflow-hidden">
                  
                  {/* Subtle Background Watermark Emblem */}
                  <div className="absolute right-3 -bottom-8 pointer-events-none opacity-5 text-amber-300 select-none">
                    <Award size={260} />
                  </div>

                  {/* Passport Card Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-amber-500/20">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border-2 border-amber-400/60 flex items-center justify-center text-3xl shadow-inner overflow-hidden">
                          {passport?.photoUrl ? (
                            <img
                              src={passport.photoUrl}
                              alt={passport.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{currentTier?.badgeIcon || '🌱'}</span>
                          )}
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow">
                          LVL {currentTier?.level}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {passport?.displayName || 'Faithful Servant'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            {currentTier?.badgeIcon} {currentTier?.title}
                          </span>
                          <span className="text-[11px] text-slate-400 font-serif italic">
                            "{currentTier?.blessingTitle}"
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Passport ID: <span className="font-mono text-slate-300">VBT-{memberId?.slice(-6)?.toUpperCase()}</span>
                        </p>
                      </div>
                    </div>

                    {/* Passport Stamp Seal */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-amber-500/30 text-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block">
                          Service Seasons
                        </span>
                        <span className="text-sm font-black text-white">
                          {passport?.seasonsServing?.length || 1} Fruitful Season{passport?.seasonsServing?.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Calendar size={13} className="text-amber-400" />
                        <span>Activities Served</span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        {passport?.activitiesServed || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Camp sports & stations</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <GraduationCap size={13} className="text-emerald-400" />
                        <span>Trainings & Safety</span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        {passport?.trainingsCompleted?.length || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Certified modules</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Sparkles size={13} className="text-yellow-400" />
                        <span>Endorsed Gifts</span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        {passport?.endorsedSkills?.length || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ministry competencies</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                        <Heart size={13} className="text-rose-400" />
                        <span>Blessings Received</span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        {passport?.encouragements?.length || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Encouragement notes</div>
                    </div>
                  </div>

                  {/* Roles Performed Tags */}
                  {Array.isArray(passport?.rolesPerformed) && passport.rolesPerformed.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                        <BadgeCheck size={13} className="text-amber-400" />
                        Roles Performed:
                      </span>
                      {passport.rolesPerformed.map((role, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-medium px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestone Celebration Banner */}
                {Array.isArray(passport?.leadershipMilestones) && passport.leadershipMilestones.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl shrink-0">
                        {passport.leadershipMilestones[0]?.badgeIcon || '🏆'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                            Latest Milestone
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(passport.leadershipMilestones[0]?.achievedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-white mt-0.5">
                          {passport.leadershipMilestones[0]?.title}
                        </h4>
                        <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                          {passport.leadershipMilestones[0]?.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommended Next Growth Step Card */}
                <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          {nextGrowthStep.blessingTitle}
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                        Growth Area: {nextGrowthStep.growthArea}
                      </h4>
                    </div>

                    {!nextGrowthStep.isMaxTier && (
                      <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-400">Target Calling:</span>
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          {nextGrowthStep.targetTierBadge} {nextGrowthStep.targetTierTitle}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Encouraging Message (Biblically Grounded & Warm) */}
                  <div className="py-4">
                    <p className="text-sm text-slate-200 leading-relaxed italic bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-500/20">
                      "{nextGrowthStep.encouragingMessage}"
                    </p>
                  </div>

                  {/* Action Steps Checklist */}
                  {nextGrowthStep.actionSteps?.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <span className="text-xs font-semibold text-slate-400 block mb-1">
                        Recommended Next Steps in Faith:
                      </span>
                      {nextGrowthStep.actionSteps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60"
                        >
                          <CheckCircle2 size={14} className="text-amber-400 mt-0.5 shrink-0" />
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress Criteria Evaluation & Request Promotion Button */}
                  {!nextGrowthStep.isMaxTier && (
                    <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="w-full sm:w-auto">
                        <span className="text-xs text-slate-400">Pathway Readiness:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-36 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                              style={{ width: `${nextGrowthStep.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {nextGrowthStep.progressPercentage}%
                          </span>
                        </div>
                      </div>

                      {/* Promotion Request Action */}
                      <div className="w-full sm:w-auto flex justify-end">
                        <button
                          onClick={() => {
                            triggerHaptic('medium');
                            setShowPromotionRequest(!showPromotionRequest);
                          }}
                          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                            nextGrowthStep.isEligibleForPromotion
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Award size={15} />
                          {nextGrowthStep.isEligibleForPromotion
                            ? `Request Elevation to ${nextTier?.title}`
                            : `Request Growth Blessing (${nextTier?.title})`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Promotion Request Form Popup / Collapse */}
                  {showPromotionRequest && (
                    <form
                      onSubmit={handleRequestPromotion}
                      className="mt-4 p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <Sparkles size={14} />
                          Submit Request for Elevation to {nextTier?.title}
                        </h5>
                        <button
                          type="button"
                          onClick={() => setShowPromotionRequest(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Tier promotions require explicit leader review and prayerful approval. Share your heart or the services you have recently undertaken.
                      </p>
                      <textarea
                        value={promotionNotes}
                        onChange={(e) => setPromotionNotes(e.target.value)}
                        placeholder="E.g., I have completed child safety training and served at the last two camp match days with great joy..."
                        rows={3}
                        className="w-full text-xs p-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPromotionRequest(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingPromotion}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          {submittingPromotion ? 'Submitting...' : 'Send Request to Leaders'}
                        </button>
                      </div>
                    </form>
                  )}

                  {promotionSuccessMsg && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0" />
                      <span>{promotionSuccessMsg}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: 7-TIER PROGRESSION PATHWAY MAP */}
            {activeTab === 'pathway' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Compass size={18} className="text-amber-400" />
                    The 7-Tier VBT Servant Calling Pathway
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Every servant journey begins with an open heart. Click on any tier along the progression pathway to inspect its spiritual calling, responsibilities, and equipping milestones.
                  </p>
                </div>

                {/* 7-Tier Stepped Progression Pathway Map */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {PASSPORT_TIER_ORDER.map((tierKey, index) => {
                    const tier = PASSPORT_TIERS[tierKey.toUpperCase()] || getTierById(tierKey);
                    const isCompleted = (currentTier?.level || 1) > tier.level;
                    const isCurrent = (currentTier?.level || 1) === tier.level;
                    const isUpcoming = (currentTier?.level || 1) < tier.level;

                    return (
                      <div
                        key={tier.id}
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedTierDetail(tier);
                        }}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 relative flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-gradient-to-b from-amber-950/40 to-slate-900 border-amber-500 shadow-lg shadow-amber-950/30 scale-[1.02]'
                            : isCompleted
                            ? 'bg-slate-900/50 border-emerald-500/40 hover:border-emerald-500/70'
                            : 'bg-slate-950/40 border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-700'
                        }`}
                      >
                        {/* Current Calling Pill */}
                        {isCurrent && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                            Current
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-slate-400">
                              Tier {tier.level}
                            </span>
                            {isCompleted ? (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            ) : isCurrent ? (
                              <Sparkles size={14} className="text-amber-400" />
                            ) : (
                              <Lock size={12} className="text-slate-500" />
                            )}
                          </div>

                          <div className="text-2xl text-center my-1.5">{tier.badgeIcon}</div>

                          <h4 className="text-xs font-bold text-center text-white line-clamp-1">
                            {tier.title}
                          </h4>
                          <p className="text-[10px] text-center text-slate-400 mt-1 line-clamp-2">
                            {tier.tagline}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/60 text-center">
                          <span className="text-[9px] text-amber-400/80 font-medium">
                            Details & Blessing →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inspected Tier Detail Card */}
                {selectedTierDetail && (
                  <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/40 shadow-xl relative animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button
                      onClick={() => setSelectedTierDetail(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                    >
                      <X size={16} />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                        {selectedTierDetail.badgeIcon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            TIER {selectedTierDetail.level} OF 7
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {selectedTierDetail.title}
                          </span>
                        </div>
                        <h4 className="text-lg font-bold text-white">
                          {selectedTierDetail.blessingTitle}
                        </h4>
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {selectedTierDetail.description}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 font-semibold block mb-1">
                          Equipping Milestones:
                        </span>
                        <p className="text-slate-200">{selectedTierDetail.requirementsSummary}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 font-semibold block mb-1">
                          Ministry Thresholds:
                        </span>
                        <p className="text-slate-200">
                          {selectedTierDetail.minActivitiesServed} Activities Served • {selectedTierDetail.minTrainingsCompleted} Trainings • {selectedTierDetail.minSeasonsServed} Seasons
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: STAMPS & BADGES */}
            {activeTab === 'stamps' && (
              <div className="space-y-6">
                
                {/* Seasons Served Stamps */}
                <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Calendar size={16} className="text-amber-400" />
                        Fruitful Camp Seasons
                      </h4>
                      <p className="text-xs text-slate-400">
                        Official season verification stamps in the VBT community
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                      {passport?.seasonsServing?.length || 1} Seasons Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.isArray(passport?.seasonsServing) && passport.seasonsServing.length > 0 ? (
                      passport.seasonsServing.map((season, idx) => (
                        <StampBadge
                          key={idx}
                          title={season}
                          subtitle="Faithful Service"
                          icon="☀️"
                          category="season"
                          verified={true}
                        />
                      ))
                    ) : (
                      <StampBadge
                        title="Summer 2026"
                        subtitle="Current Season"
                        icon="☀️"
                        category="season"
                        verified={true}
                      />
                    )}
                  </div>
                </div>

                {/* Training & Certification Stamps */}
                <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <GraduationCap size={16} className="text-emerald-400" />
                        Equipping Modules & Certifications
                      </h4>
                      <p className="text-xs text-slate-400">
                        Safeguarding, refereeing, and spiritual leadership credentials
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                      {passport?.trainingsCompleted?.length || 0} Modules Completed
                    </span>
                  </div>

                  {Array.isArray(passport?.trainingsCompleted) && passport.trainingsCompleted.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {passport.trainingsCompleted.map((t, idx) => (
                        <StampBadge
                          key={idx}
                          title={t.title || 'Training Module'}
                          subtitle={t.category || 'Child Safety'}
                          icon={t.badgeIcon || '🛡️'}
                          category="training"
                          verified={true}
                          date={t.completedAt ? new Date(t.completedAt).toLocaleDateString() : ''}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
                      <p className="text-xs text-slate-400">
                        No training modules completed yet. Explore the Child Safety & Referee modules to earn your equipping stamp!
                      </p>
                    </div>
                  )}
                </div>

                {/* Endorsed Ministry Skills & Roles */}
                <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-yellow-400" />
                    Endorsed Ministry Gifts & Roles
                  </h4>

                  {Array.isArray(passport?.endorsedSkills) && passport.endorsedSkills.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {passport.endorsedSkills.map((sk, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <h5 className="text-xs font-bold text-white">{sk.skill}</h5>
                            <span className="text-[10px] text-slate-400">
                              {sk.category || 'Ministry'} • Endorsed by {sk.endorsedBy || 'Leader'}
                            </span>
                          </div>
                          <div className="px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-bold">
                            ★ {sk.endorsementsCount || 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
                      <p className="text-xs text-slate-400">
                        Ministry skills can be endorsed by court coordinators and team leaders after shared service.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: BLESSINGS & ENCOURAGEMENTS */}
            {activeTab === 'blessings' && (
              <div className="space-y-6">
                
                {/* Header info */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Heart size={16} className="text-rose-400" />
                      Encouragement & Blessings Wall
                    </h4>
                    <p className="text-xs text-slate-400">
                      Uplifting words, prayers, and private blessings received from the fellowship
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    {passport?.encouragements?.length || 0} Blessings
                  </span>
                </div>

                {/* Form to Write a Blessing (For peers / leaders) */}
                <form
                  onSubmit={handleSendEncouragement}
                  className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3"
                >
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Send size={13} className="text-amber-400" />
                    Write a Blessing Note to {passport?.displayName || 'this servant'}
                  </h5>
                  <textarea
                    value={newEncouragement}
                    onChange={(e) => setNewEncouragement(e.target.value)}
                    placeholder="Speak life and blessing into their service (e.g. 'Your joy at the prayer station lifted my spirit today!')..."
                    rows={2}
                    className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={scriptureVerse}
                        onChange={(e) => setScriptureVerse(e.target.value)}
                        placeholder="Optional Scripture (e.g. Col 3:23)"
                        className="text-xs p-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 w-full sm:w-48 focus:outline-none"
                      />
                      {isLeader && (
                        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isPrivateNote}
                            onChange={(e) => setIsPrivateNote(e.target.checked)}
                            className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <Lock size={12} className="text-amber-400" />
                          <span>Private Leader Blessing</span>
                        </label>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={sendingNote || !newEncouragement.trim()}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold disabled:opacity-50 transition"
                    >
                      {sendingNote ? 'Sharing...' : 'Send Blessing'}
                    </button>
                  </div>

                  {noteSuccess && (
                    <p className="text-xs text-emerald-400 font-medium">{noteSuccess}</p>
                  )}
                </form>

                {/* Encouragement Cards List */}
                <div className="space-y-3">
                  {Array.isArray(passport?.encouragements) && passport.encouragements.length > 0 ? (
                    passport.encouragements.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          item.isPrivate
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : 'bg-slate-900/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-300 border border-amber-500/30">
                              {item.authorName?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white">
                                {item.authorName}
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1.5">
                                • {item.authorRole || 'Fellow Servant'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {item.isPrivate && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Lock size={9} /> Private
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed pl-9">
                          "{item.note}"
                        </p>

                        {item.scriptureVerse && (
                          <div className="mt-2 pl-9">
                            <span className="text-[10px] font-serif italic text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                              📖 {item.scriptureVerse}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800">
                      <Heart size={28} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">
                        No encouragement notes recorded yet. Be the first to speak a blessing!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: LEADER ACTION PANEL */}
            {activeTab === 'leader' && isLeader && (
              <div className="space-y-6">
                <div className="p-5 rounded-3xl bg-purple-950/20 border border-purple-500/30">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield size={16} className="text-purple-400" />
                    Authorized Leader Promotion Approval Desk
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Tier promotions require explicit leader approval. Review pending elevation requests or commission the servant into their next tier.
                  </p>
                </div>

                {/* Pending Promotion Requests */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Pending Elevation Requests:
                  </h5>

                  {Array.isArray(passport?.promotionRequests) &&
                  passport.promotionRequests.some((r) => r.status === 'pending') ? (
                    passport.promotionRequests
                      .filter((r) => r.status === 'pending')
                      .map((req) => (
                        <div
                          key={req.id}
                          className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                Target Tier: {req.targetTierTitle}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                                PENDING APPROVAL
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(req.requestedAt).toLocaleDateString()}
                            </span>
                          </div>

                          {req.notes && (
                            <p className="text-xs text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                              "{req.notes}"
                            </p>
                          )}

                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <input
                              type="text"
                              value={leaderReviewNotes}
                              onChange={(e) => setLeaderReviewNotes(e.target.value)}
                              placeholder="Add commission blessing / leader notes..."
                              className="w-full text-xs p-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                            />

                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleApprovePromotion(req.targetTier)}
                                disabled={approvingTier}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow"
                              >
                                <Check size={14} strokeWidth={3} />
                                {approvingTier ? 'Blessing...' : `Approve & Elevate to ${req.targetTierTitle}`}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 text-center">
                      <p className="text-xs text-slate-400">
                        No pending promotion requests for this servant.
                      </p>
                    </div>
                  )}
                </div>

                {/* Direct Tier Elevation (Override / Leadership Elevation) */}
                {nextTier && (
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-white">
                        Direct Ministry Elevation: {nextTier.title}
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Commission this servant directly to Tier {nextTier.level} ({nextTier.title}) with leadership blessing.
                      </p>
                    </div>
                    <button
                      onClick={() => handleApprovePromotion(nextTier.id)}
                      disabled={approvingTier}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles size={14} />
                      {approvingTier ? 'Elevating...' : `Direct Elevate to ${nextTier.title}`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer info bar */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield size={12} className="text-amber-400" />
            Kingdom Servant Passport • Confidential & Blessed
          </span>
          <span className="font-mono text-slate-500">
            Tier {currentTier?.level || 1} / 7
          </span>
        </div>
      </div>
    </div>
  );
}
