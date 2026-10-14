import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  SkipForward,
  Compass,
  Trophy,
  Calendar,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Heart,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Flame,
  Award,
  Users,
  Edit3,
  BookmarkCheck,
} from 'lucide-react';
import {
  ONBOARDING_SPORTS,
  ONBOARDING_AGE_GROUPS,
  SERVING_STYLES,
  SERVING_STYLE_OPTIONS,
  SERVING_FREQUENCIES,
  SERVING_FREQUENCY_OPTIONS,
  SKILLS_EXPERIENCE,
  SKILLS_EXPERIENCE_OPTIONS,
  WORK_STYLE_PREFERENCES,
  WORK_STYLE_OPTIONS,
  computeOnboardingRecommendations,
  saveOnboardingResponses,
  getOnboardingResponses,
  requestRoleOrAssignmentApproval,
} from '../../services/onboardingService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';

/**
 * Sport visual icons and badges map
 */
const SPORT_ICONS = {
  Football: '⚽',
  Basketball: '🏀',
  Volleyball: '🏐',
  Running: '🏃',
  'Table Tennis': '🏓',
  'Fitness/Calisthenics': '🏋️',
  'Chess/Board Games': '♟️',
};

/**
 * FindYourPlaceModal
 *
 * Guided onboarding questionnaire helping members discover where to serve at VBT Sports Camp.
 *
 * Core Guarantees:
 * - 100% skippable questions
 * - Transparent, explainable rationale for every recommendation
 * - Safe interest tracking: never assigns sensitive roles without leader approval
 * - Editable at any time
 */
export default function FindYourPlaceModal({
  isOpen = false,
  onClose,
  currentUser,
  memberProfile,
  communityId = DEFAULT_COMMUNITY_ID,
  availableTeams = [],
  availableOpportunities = [],
  availableTrainings = [],
  onComplete,
  onNavigateToTraining,
  onNavigateToOpportunity,
}) {
  // Navigation: Step 0 (Intro), 1..6 (Questions), 7 (Recommendations)
  const [currentStep, setCurrentStep] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [requestedTeamId, setRequestedTeamId] = useState(null);
  const [requestSuccessMsg, setRequestSuccessMsg] = useState('');

  // Questionnaire responses state
  const [sports, setSports] = useState([]);
  const [ageGroups, setAgeGroups] = useState([]);
  const [servingStyle, setServingStyle] = useState('');
  const [frequency, setFrequency] = useState('');
  const [skills, setSkills] = useState([]);
  const [workStylePreference, setWorkStylePreference] = useState('');
  const [hasExistingResponses, setHasExistingResponses] = useState(false);

  const memberId = currentUser?.uid || currentUser?.id || memberProfile?.id || '';

  // Load existing responses if member previously filled them out
  useEffect(() => {
    if (!isOpen || !memberId) return;

    let isMounted = true;
    async function loadSaved() {
      setLoadingInitial(true);
      try {
        const saved = await getOnboardingResponses(communityId, memberId);
        if (saved?.responses && isMounted) {
          setHasExistingResponses(true);
          const r = saved.responses;
          if (Array.isArray(r.sports)) setSports(r.sports);
          if (Array.isArray(r.ageGroups)) setAgeGroups(r.ageGroups);
          if (r.servingStyle) setServingStyle(r.servingStyle);
          if (r.frequency) setFrequency(r.frequency);
          if (Array.isArray(r.skills)) setSkills(r.skills);
          if (r.workStylePreference) setWorkStylePreference(r.workStylePreference);
        }
      } catch (err) {
        console.warn('[FindYourPlaceModal] Could not fetch saved responses:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [isOpen, memberId, communityId]);

  // Derived current recommendations
  const recommendations = useMemo(() => {
    return computeOnboardingRecommendations(
      {
        sports,
        ageGroups,
        servingStyle,
        frequency,
        skills,
        workStylePreference,
      },
      availableTeams,
      availableOpportunities,
      availableTrainings
    );
  }, [
    sports,
    ageGroups,
    servingStyle,
    frequency,
    skills,
    workStylePreference,
    availableTeams,
    availableOpportunities,
    availableTrainings,
  ]);

  if (!isOpen) return null;

  // Toggle helpers for multi-select arrays
  const toggleSport = (sport) => {
    setSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const toggleAgeGroup = (group) => {
    setAgeGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const toggleSkill = (skillId) => {
    setSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    );
  };

  // Skip question and proceed
  const handleSkipQuestion = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setCurrentStep(7);
    }
  };

  // Skip entire questionnaire directly to recommendations
  const handleSkipAll = () => {
    setCurrentStep(7);
  };

  // Next step handler
  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setCurrentStep(7);
    }
  };

  // Back step handler
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Save questionnaire responses
  const handleSaveAndFinish = async () => {
    if (!memberId) {
      onClose();
      return;
    }

    setSaving(true);
    setErrorMessage('');
    try {
      await saveOnboardingResponses(communityId, memberId, {
        sports,
        ageGroups,
        servingStyle,
        frequency,
        skills,
        workStylePreference,
        computedRecommendations: recommendations,
        hasCompletedAll: sports.length > 0 && Boolean(servingStyle),
        hasPreviousSave: hasExistingResponses,
      });

      setSaveSuccess(true);
      if (typeof onComplete === 'function') {
        onComplete(recommendations);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('[FindYourPlaceModal] Error saving responses:', err);
      setErrorMessage('Could not save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Request to join recommended team (requires leader review)
  const handleRequestJoinTeam = async (team) => {
    if (!memberId || !team) return;

    setSaving(true);
    setRequestSuccessMsg('');
    try {
      await requestRoleOrAssignmentApproval(communityId, memberId, {
        requestedRole: 'volunteer',
        targetType: 'team',
        targetId: team.id,
        targetTitle: team.name,
        memberName:
          currentUser?.displayName ||
          memberProfile?.displayName ||
          memberProfile?.firstName ||
          'Camp Member',
        notes: `Joined through Find Your Place onboarding. Matches sports: ${sports.join(
          ', '
        ) || 'general'}.`,
        responsesSummary: {
          sports,
          ageGroups,
          servingStyle,
          frequency,
          skills,
        },
      });

      setRequestedTeamId(team.id);
      setRequestSuccessMsg(
        `Request submitted! Coordinator ${team.leader?.name || 'Lead'} will review and contact you.`
      );
    } catch (err) {
      console.error('[FindYourPlaceModal] Team join request error:', err);
      setErrorMessage('Could not submit team join request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Total question steps = 6
  const totalQuestions = 6;
  const progressPercent = currentStep === 0 ? 0 : Math.min(100, Math.round((currentStep / totalQuestions) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="find-your-place-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 id="find-your-place-title" className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Find Your Place
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                  VBT Guide
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {currentStep === 0
                  ? 'Discover your serving home in 2 minutes'
                  : currentStep === 7
                  ? 'Your explainable recommendations'
                  : `Question ${currentStep} of ${totalQuestions} · All skippable`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar (Visible on questions 1-6) */}
        {currentStep > 0 && currentStep <= 6 && (
          <div className="w-full bg-slate-800/50 h-1.5">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loadingInitial ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm">Loading your serving profile...</p>
            </div>
          ) : (
            <>
              {/* STEP 0: Welcome / Intro */}
              {currentStep === 0 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="relative p-6 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-slate-800/50 to-blue-500/10 border border-cyan-500/20 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-2">
                      <Sparkles className="w-4 h-4" /> Welcome to the Team
                    </div>
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">
                      Where will you make your mark?
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Every game, court station, and prayer circle in VBT runs on servants like you.
                      Answer 6 quick questions to discover your best-fit team, first serving step,
                      and personal coordinator.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">2-Minute Discovery</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Quick, engaging questions you can skip anytime.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Safe Exploration</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Never automatically assigns sensitive roles without coordinator review.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Explainable Fit</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Clear reasons explaining why each opportunity matches you.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Always Editable</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Update your answers anytime as your passions grow.
                        </p>
                      </div>
                    </div>
                  </div>

                  {hasExistingResponses && (
                    <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-between text-xs text-cyan-300">
                      <span>You have previously saved onboarding answers.</span>
                      <button
                        onClick={handleSkipAll}
                        className="font-semibold underline hover:text-cyan-200"
                      >
                        View My Recommendations →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: Sports You Enjoy */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Question 1 of 6
                    </span>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      Which sports do you enjoy?
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Select all that sound fun. We’ll match you with court stations and tournaments.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {ONBOARDING_SPORTS.map((sport) => {
                      const isSelected = sports.includes(sport);
                      return (
                        <button
                          key={sport}
                          type="button"
                          onClick={() => toggleSport(sport)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-slate-100 shadow-sm shadow-cyan-500/10'
                              : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{SPORT_ICONS[sport] || '🏅'}</span>
                            <span className="text-sm font-medium">{sport}</span>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                                : 'border-slate-700 bg-slate-900/50'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Age Groups */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Question 2 of 6
                    </span>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      Which age groups are you comfortable serving?
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose the age stages you connect with most naturally.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    {ONBOARDING_AGE_GROUPS.map((group) => {
                      const isSelected = ageGroups.includes(group);
                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() => toggleAgeGroup(group)}
                          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-slate-100'
                              : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-semibold text-slate-200">{group}</span>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {group === 'Kids 6-9'
                                ? 'Cheering, active mini-games, and joyful coaching'
                                : group === 'Pre-teens 10-12'
                                ? 'Skill drills, team spirit, and energetic encouragement'
                                : group === 'Teens 13-17'
                                ? 'Competitive games, mentorship, and life discussions'
                                : group === 'Young Adults'
                                ? 'Peer community, tournament organization, and fellowship'
                                : 'Flexible across all ages and family camp activities'}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors shrink-0 ml-3 ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                                : 'border-slate-700 bg-slate-900/50'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: Preferred Serving Style */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Question 3 of 6
                    </span>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      Preferred serving style
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Select the atmosphere where your heart thrives most.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    {SERVING_STYLE_OPTIONS.map((opt) => {
                      const isSelected = servingStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setServingStyle(opt.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-slate-100 ring-1 ring-cyan-500/30'
                              : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-semibold text-slate-200">{opt.label}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ml-3 ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                                : 'border-slate-700 bg-slate-900/50'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: Serving Frequency */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Question 4 of 6
                    </span>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      Serving frequency
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      How often would you like to participate in camp events?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    {SERVING_FREQUENCY_OPTIONS.map((freq) => {
                      const isSelected = frequency === freq.id;
                      return (
                        <button
                          key={freq.id}
                          type="button"
                          onClick={() => setFrequency(freq.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-slate-100 ring-1 ring-cyan-500/30'
                              : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-semibold text-slate-200">{freq.label}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{freq.description}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ml-3 ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                                : 'border-slate-700 bg-slate-900/50'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 5: Skills or Experience */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Question 5 of 6
                    </span>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      Skills or experience
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Any practical talents you bring? No formal experience required!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {SKILLS_EXPERIENCE_OPTIONS.map((skill) => {
                      const isSelected = skills.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(skill.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-slate-100'
                              : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-medium text-slate-200">{skill.label}</span>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {skill.description}
                            </p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors shrink-0 ml-2 ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                                : 'border-slate-700 bg-slate-900/50'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 6: Front-facing vs Behind-the-scenes */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Question 6 of 6
                    </span>
                    <h3 className="text-xl font-bold text-slate-100 mt-1">
                      Interaction preference
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Do you prefer front-line camper energy, behind-the-scenes support, or a mix?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    {WORK_STYLE_OPTIONS.map((pref) => {
                      const isSelected = workStylePreference === pref.id;
                      return (
                        <button
                          key={pref.id}
                          type="button"
                          onClick={() => setWorkStylePreference(pref.id)}
                          className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-500/40 text-slate-100 ring-1 ring-cyan-500/30'
                              : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-semibold text-slate-200">{pref.label}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{pref.description}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ml-3 ${
                              isSelected
                                ? 'bg-cyan-500 border-cyan-500 text-slate-950'
                                : 'border-slate-700 bg-slate-900/50'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 7: Review & Explainable Recommendations */}
              {currentStep === 7 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Archetype banner */}
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-900/40 via-blue-900/30 to-purple-900/40 border border-cyan-500/30">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5" /> Your Serving Archetype
                        </span>
                        <h3 className="text-xl font-bold text-slate-100 mt-0.5">
                          {recommendations.fitSummary.archetype}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit Answers
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {recommendations.fitSummary.topStrengths.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-medium"
                        >
                          ✦ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {requestSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{requestSuccessMsg}</span>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* 4 Recommendations Cards */}
                  <div className="space-y-3.5">
                    {/* 1. Recommended Team */}
                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                              Recommended Team
                            </span>
                            <h4 className="text-base font-bold text-slate-100">
                              {recommendations.recommendedTeam.name}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {recommendations.recommendedTeam.sport} · {recommendations.recommendedTeam.ageGroup}
                            </p>
                          </div>
                        </div>
                        {requestedTeamId === recommendations.recommendedTeam.id ? (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Requested
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRequestJoinTeam(recommendations.recommendedTeam)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-all shadow-md shadow-cyan-500/10 active:scale-95 disabled:opacity-50"
                          >
                            Request to Join
                          </button>
                        )}
                      </div>

                      {/* Explainable Rationale */}
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong className="text-cyan-300">Why recommended: </strong>
                          {recommendations.recommendedTeam.reasoning}
                        </p>
                      </div>
                    </div>

                    {/* 2. First Serving Opportunity */}
                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                              First Serving Opportunity
                            </span>
                            <h4 className="text-base font-bold text-slate-100">
                              {recommendations.recommendedOpportunity.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {recommendations.recommendedOpportunity.date} ·{' '}
                              <span className="text-amber-400">
                                {recommendations.recommendedOpportunity.spotsRemaining} spots available
                              </span>
                            </p>
                          </div>
                        </div>
                        {onNavigateToOpportunity && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToOpportunity(recommendations.recommendedOpportunity);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                          >
                            View Spot
                          </button>
                        )}
                      </div>

                      {/* Explainable Rationale */}
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong className="text-amber-300">Why recommended: </strong>
                          {recommendations.recommendedOpportunity.reasoning}
                        </p>
                      </div>
                    </div>

                    {/* 3. Recommended Training Module */}
                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                              Recommended Training Module
                            </span>
                            <h4 className="text-base font-bold text-slate-100">
                              {recommendations.recommendedTraining.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {recommendations.recommendedTraining.durationMinutes} min · {recommendations.recommendedTraining.badgeIcon}{' '}
                              Certification
                            </p>
                          </div>
                        </div>
                        {onNavigateToTraining && (
                          <button
                            type="button"
                            onClick={() => {
                              onNavigateToTraining(recommendations.recommendedTraining);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-semibold transition-all"
                          >
                            Start Module
                          </button>
                        )}
                      </div>

                      {/* Explainable Rationale */}
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong className="text-purple-300">Why recommended: </strong>
                          {recommendations.recommendedTraining.reasoning}
                        </p>
                      </div>
                    </div>

                    {/* 4. Coordinator Contact */}
                    <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                              Your Coordinator Contact
                            </span>
                            <h4 className="text-base font-bold text-slate-100">
                              {recommendations.coordinatorContact.name}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {recommendations.coordinatorContact.role} · {recommendations.coordinatorContact.contactChannel}
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                          Guide
                        </span>
                      </div>

                      {/* Explainable Rationale */}
                      <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong className="text-blue-300">Role: </strong>
                          {recommendations.coordinatorContact.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Safety & Sensitive Role Protection Notice */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Safe Discovery:</strong> Completing this questionnaire saves your
                      interests to help coordinators mentor you. Official assignments or sensitive
                      leadership roles require coordinator approval and will never be assigned
                      automatically.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-5 py-4 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 sticky bottom-0 z-20">
          {currentStep === 0 ? (
            <>
              <button
                type="button"
                onClick={handleSkipAll}
                className="px-4 py-2 rounded-2xl text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
              >
                Skip & View Suggestions
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95"
              >
                Start Guided Discovery
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : currentStep <= 6 ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  className="px-3 py-2 rounded-2xl text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSkipAll}
                  className="hidden sm:inline-block px-3 py-2 text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  Skip All
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95"
                >
                  {currentStep === 6 ? 'See Recommendations' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            // CurrentStep === 7 (Results Screen)
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Re-take Questionnaire
              </button>

              <button
                type="button"
                onClick={handleSaveAndFinish}
                disabled={saving || saveSuccess}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" /> Saved!
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="w-4 h-4" /> Save Preferences & Close
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
