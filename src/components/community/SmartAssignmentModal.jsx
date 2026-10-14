import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  UserCheck,
  UserPlus,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Clock,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Award,
  ChevronRight,
  Flame,
  Info,
  History,
  Users,
  Send,
  ArrowRight,
  Bell,
  HeartHandshake,
  Check,
  ShieldAlert,
} from 'lucide-react';
import {
  ASSIGNMENT_STATUS,
  scoreCandidateForOpportunity,
  getRecommendedCandidatesForOpportunity,
  findReplacementCandidates,
  transitionAssignmentStatus,
  createSmartAssignment,
  subscribeToAssignmentsForOpportunity,
  checkBurnoutRisk,
} from '../../services/smartAssignmentService';
import { getMembers } from '../../services/memberService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';

/**
 * Leader-Facing Smart Assignment & Serving Recommendation Modal
 *
 * Provides multi-factor candidate scoring, burnout guards, an auditable 9-stage state machine,
 * explicit leader-confirmation workflows (never silent auto-assignments), and an emergency
 * replacement finder.
 */
export default function SmartAssignmentModal({
  isOpen,
  onClose,
  opportunity,
  currentUser = {},
  communityId = DEFAULT_COMMUNITY_ID,
  initialAssignment = null,
  initialTab = 'recommendations',
  onAssignmentUpdated = null,
}) {
  // Active view tab: 'recommendations' | 'active' | 'replacement' | 'audit'
  const [activeTab, setActiveTab] = useState(initialTab);
  const [candidates, setCandidates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('all'); // 'all' | 'available' | 'high_match'
  const [filterBurnoutSafe, setFilterBurnoutSafe] = useState(false);

  // Replacement selection
  const [selectedCancelledAssignment, setSelectedCancelledAssignment] = useState(initialAssignment);

  // Confirmation Drawer State (Automation requires explicit leader confirmation)
  const [pendingConfirmation, setPendingConfirmation] = useState(null); // { candidate, targetStatus, isReplacement }
  const [leaderNotes, setLeaderNotes] = useState('');
  const [successToast, setSuccessToast] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Reset tab when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSelectedCancelledAssignment(initialAssignment);
      setErrorMessage(null);
    }
  }, [isOpen, initialTab, initialAssignment]);

  // Load community members & real-time assignments
  useEffect(() => {
    if (!isOpen || !opportunity?.id) return;

    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const membersList = await getMembers(communityId);
        if (isMounted) {
          setCandidates(membersList || []);
        }
      } catch (err) {
        console.error('[SmartAssignmentModal] Error loading members:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Subscribe to assignments for this opportunity
    const unsubscribe = subscribeToAssignmentsForOpportunity(
      communityId,
      opportunity.id,
      (list) => {
        if (isMounted) {
          setAssignments(list);
          // Auto-select first cancelled or replacement_needed assignment if none selected
          if (!selectedCancelledAssignment) {
            const needRep = list.find(
              (a) =>
                a.status === ASSIGNMENT_STATUS.REPLACEMENT_NEEDED ||
                a.status === ASSIGNMENT_STATUS.CANCELLED
            );
            if (needRep) setSelectedCancelledAssignment(needRep);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isOpen, opportunity?.id, communityId]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        if (pendingConfirmation) {
          setPendingConfirmation(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pendingConfirmation, onClose]);

  // Toast auto-clear
  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(null), 4000);
    return () => clearTimeout(timer);
  }, [successToast]);

  // Compute recommended candidates with multi-factor scoring
  const recommendations = useMemo(() => {
    if (!opportunity) return [];
    const scored = getRecommendedCandidatesForOpportunity(opportunity, candidates, assignments);

    return scored.filter((rec) => {
      // Search term
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (rec.candidate.displayName || rec.candidate.name || '').toLowerCase();
        const role = (rec.candidate.role || '').toLowerCase();
        const skills = (rec.candidate.skills || []).join(' ').toLowerCase();
        if (!name.includes(query) && !role.includes(query) && !skills.includes(query)) {
          return false;
        }
      }
      // Availability filter
      if (filterAvailability === 'available' && !rec.eligible) return false;
      if (filterAvailability === 'high_match' && rec.totalScore < 75) return false;
      // Burnout safety filter
      if (filterBurnoutSafe && rec.burnoutWarning) return false;

      return true;
    });
  }, [opportunity, candidates, assignments, searchQuery, filterAvailability, filterBurnoutSafe]);

  // Compute emergency replacements for selected cancelled assignment
  const replacementCandidates = useMemo(() => {
    if (!opportunity || !selectedCancelledAssignment) return [];
    return findReplacementCandidates(
      opportunity,
      selectedCancelledAssignment,
      candidates,
      assignments
    );
  }, [opportunity, selectedCancelledAssignment, candidates, assignments]);

  // Extract all audit trail events across assignments
  const auditTimeline = useMemo(() => {
    const allLogs = [];
    assignments.forEach((asg) => {
      const trail = asg.auditTrail || [];
      trail.forEach((log) => {
        allLogs.push({
          ...log,
          assignmentId: asg.id,
          memberName: asg.memberName,
          role: asg.role,
        });
      });
    });

    return allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [assignments]);

  // --------------------------------------------------------------------------
  // ACTIONS: EXPLICIT LEADER CONFIRMATION WORKFLOWS
  // --------------------------------------------------------------------------

  // Step 1: Open explicit confirmation drawer for a candidate
  const handleInitiateAssignment = useCallback((candidate, isReplacement = false) => {
    setPendingConfirmation({
      candidate,
      isReplacement,
      targetStatus: ASSIGNMENT_STATUS.CONFIRMED,
    });
    setLeaderNotes('');
    setErrorMessage(null);
  }, []);

  // Step 2: Leader submits explicit confirmation
  const handleConfirmAssignment = useCallback(async () => {
    if (!pendingConfirmation || !opportunity?.id) return;

    setActionLoading(true);
    setErrorMessage(null);

    const { candidate, isReplacement } = pendingConfirmation;
    const actor = {
      id: currentUser?.uid || currentUser?.id || 'leader_user',
      name: currentUser?.displayName || currentUser?.name || 'Ministry Leader',
      role: currentUser?.role || 'coordinator',
    };

    try {
      if (isReplacement && selectedCancelledAssignment?.id) {
        // Transition the cancelled assignment to REASSIGNED with replacement metadata
        await transitionAssignmentStatus(
          communityId,
          selectedCancelledAssignment.id,
          ASSIGNMENT_STATUS.REASSIGNED,
          actor,
          {
            reason: leaderNotes || 'Leader confirmed replacement servant',
            newMemberId: candidate.id || candidate.uid,
            newMemberName: candidate.displayName || candidate.name,
            opportunity,
            candidate,
          }
        );

        // Also create a confirmed assignment record for the replacement servant
        await createSmartAssignment(communityId, {
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title || opportunity.role,
          memberId: candidate.id || candidate.uid,
          memberName: candidate.displayName || candidate.name || 'Servant',
          role: opportunity.role || 'servant',
          matchScore: scoreCandidateForOpportunity(candidate, opportunity, assignments).totalScore,
          status: ASSIGNMENT_STATUS.CONFIRMED,
          createdActor: actor,
        });

        setSuccessToast(`Successfully reassigned ${candidate.displayName || candidate.name} as replacement!`);
      } else {
        // Regular smart assignment flow:
        // Create initial assignment and transition to confirmed with leader audit
        const newAssignment = await createSmartAssignment(communityId, {
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title || opportunity.role,
          memberId: candidate.id || candidate.uid,
          memberName: candidate.displayName || candidate.name || 'Servant',
          role: opportunity.role || 'servant',
          matchScore: scoreCandidateForOpportunity(candidate, opportunity, assignments).totalScore,
          status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
          createdActor: actor,
        });

        await transitionAssignmentStatus(
          communityId,
          newAssignment.id,
          ASSIGNMENT_STATUS.CONFIRMED,
          actor,
          {
            reason: leaderNotes || 'Leader reviewed match factors and confirmed assignment',
            opportunity,
            candidate,
          }
        );

        setSuccessToast(`Confirmed assignment for ${candidate.displayName || candidate.name}. Servant notified!`);
      }

      setPendingConfirmation(null);
      if (typeof onAssignmentUpdated === 'function') onAssignmentUpdated();
    } catch (err) {
      console.error('[SmartAssignmentModal] Error confirming assignment:', err);
      setErrorMessage(err.message || 'Failed to confirm assignment.');
    } finally {
      setActionLoading(false);
    }
  }, [
    pendingConfirmation,
    opportunity,
    currentUser,
    communityId,
    selectedCancelledAssignment,
    leaderNotes,
    assignments,
    onAssignmentUpdated,
  ]);

  // Transition active assignment status
  const handleTransitionStatus = useCallback(
    async (assignmentId, newStatus, reason = '') => {
      setActionLoading(true);
      setErrorMessage(null);
      const actor = {
        id: currentUser?.uid || currentUser?.id || 'leader_user',
        name: currentUser?.displayName || currentUser?.name || 'Ministry Leader',
        role: currentUser?.role || 'coordinator',
      };

      try {
        await transitionAssignmentStatus(communityId, assignmentId, newStatus, actor, {
          reason: reason || `Updated to ${newStatus} by leader`,
          opportunity,
        });
        setSuccessToast(`Assignment updated to ${newStatus.replace('_', ' ')}.`);
        if (typeof onAssignmentUpdated === 'function') onAssignmentUpdated();
      } catch (err) {
        console.error('[SmartAssignmentModal] Error transitioning status:', err);
        setErrorMessage(err.message || 'Failed to update assignment status.');
      } finally {
        setActionLoading(false);
      }
    },
    [communityId, currentUser, opportunity, onAssignmentUpdated]
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-assignment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* ================================================================= */}
        {/* MODAL HEADER */}
        {/* ================================================================= */}
        <div className="flex flex-col border-b border-slate-800 bg-slate-900/90 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="smart-assignment-modal-title"
                    className="text-lg sm:text-xl font-bold text-white tracking-tight"
                  >
                    Smart Serving Engine
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Leader Tool
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Multi-factor recommendations, burnout safeguards & auditable state machine
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Opportunity Details Bar */}
          {opportunity && (
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs sm:text-sm text-slate-300">
              <span className="font-semibold text-white">{opportunity.title || 'Serving Opportunity'}</span>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{opportunity.date || opportunity.dayOfWeek || 'Scheduled Event'}</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="capitalize">{opportunity.shift || opportunity.timeSlot || 'Morning'}</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {assignments.filter((a) => a.status === ASSIGNMENT_STATUS.CONFIRMED).length} /{' '}
                  {opportunity.spotsNeeded || 1} spots filled
                </span>
              </div>
            </div>
          )}

          {/* Explicit Governance Banner */}
          <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-xs text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              <strong>Leader Accountability:</strong> Automation suggests rankings, but leaders must review and explicitly confirm. No silent auto-assignments.
            </span>
          </div>

          {/* Toast Notification */}
          {successToast && (
            <div className="mt-2.5 flex items-center justify-between px-3 py-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{successToast}</span>
              </div>
              <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-emerald-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-2.5 flex items-center justify-between px-3 py-2 bg-red-950/80 border border-red-500/40 text-red-300 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-3 border-b border-slate-800 -mb-4 pt-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'recommendations'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Smart Recommendations</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {recommendations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'active'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Active Assignments</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {assignments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('replacement')}
              className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'replacement'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Replacement Finder</span>
              {assignments.some(
                (a) =>
                  a.status === ASSIGNMENT_STATUS.REPLACEMENT_NEEDED ||
                  a.status === ASSIGNMENT_STATUS.CANCELLED
              ) && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Trail</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {auditTimeline.length}
              </span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MODAL BODY */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: SMART RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name, role, or skill..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-950/70 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={filterAvailability}
                    onChange={(e) => setFilterAvailability(e.target.value)}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Candidates</option>
                    <option value="available">Available Only</option>
                    <option value="high_match">High Match (≥75%)</option>
                  </select>

                  <button
                    onClick={() => setFilterBurnoutSafe(!filterBurnoutSafe)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                      filterBurnoutSafe
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Burnout-Safe Only</span>
                  </button>
                </div>
              </div>

              {/* Recommendations List */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
                  <p className="text-sm">Evaluating candidates against multi-factor scoring criteria...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-6">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-semibold text-slate-200">No matching candidates found</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Try broadening your filters or searching by a different name or skill.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {recommendations.map((rec) => {
                    const { candidate, totalScore, factors, rationale, burnoutWarning, eligible, burnoutRisk } = rec;
                    const isAlreadyAssigned = assignments.some(
                      (a) =>
                        a.memberId === (candidate.id || candidate.uid) &&
                        (a.status === ASSIGNMENT_STATUS.CONFIRMED ||
                          a.status === ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW)
                    );

                    return (
                      <div
                        key={candidate.id || candidate.uid}
                        className={`p-4 rounded-xl border transition-all ${
                          isAlreadyAssigned
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-75'
                            : totalScore >= 80
                            ? 'bg-gradient-to-r from-slate-900 to-indigo-950/20 border-indigo-500/30 hover:border-indigo-500/60'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          {/* Left: Avatar & Candidate Info */}
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                                {(candidate.displayName || candidate.name || 'S')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')}
                              </div>
                              {candidate.tier === 'lead_servant' && (
                                <span className="absolute -bottom-1 -right-1 text-xs" title="Lead Servant">
                                  🏆
                                </span>
                              )}
                              {candidate.tier === 'coordinator' && (
                                <span className="absolute -bottom-1 -right-1 text-xs" title="Coordinator">
                                  👑
                                </span>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">
                                  {candidate.displayName || candidate.name || 'Servant Volunteer'}
                                </h4>
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md uppercase tracking-wider bg-slate-800 text-slate-300">
                                  {candidate.tier || candidate.role || 'Servant'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {candidate.team ? `Team: ${candidate.team}` : 'General Ministry'} •{' '}
                                {candidate.sportsInterests?.join(', ') || 'Community Volunteer'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Score Gauge & Assign Action */}
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span
                                  className={`text-lg font-extrabold ${
                                    totalScore >= 85
                                      ? 'text-emerald-400'
                                      : totalScore >= 70
                                      ? 'text-amber-400'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {totalScore}%
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                  Match
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                {factors.availability?.details || 'Flexible availability'}
                              </p>
                            </div>

                            {isAlreadyAssigned ? (
                              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Assigned
                              </span>
                            ) : (
                              <button
                                onClick={() => handleInitiateAssignment(candidate, false)}
                                disabled={actionLoading}
                                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5 shrink-0"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Assign</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Factor Score Pills */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-[11px]">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/40">
                            <span className="text-slate-400">Availability:</span>
                            <span className="font-semibold text-slate-200">
                              {factors.availability?.score || 0}/25
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/40">
                            <span className="text-slate-400">Training & Skills:</span>
                            <span className="font-semibold text-slate-200">
                              {factors.skillsAndTraining?.score || 0}/25
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/40">
                            <span className="text-slate-400">Role Preference:</span>
                            <span className="font-semibold text-slate-200">
                              {factors.interestsAndRole?.score || 0}/20
                            </span>
                          </div>

                          <div
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                              burnoutWarning
                                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                                : 'bg-slate-950/50 border-slate-800/40 text-slate-300'
                            }`}
                          >
                            <span className="text-slate-400 flex items-center gap-1">
                              <Flame
                                className={`w-3 h-3 ${burnoutWarning ? 'text-amber-400' : 'text-slate-500'}`}
                              />
                              Workload:
                            </span>
                            <span className="font-semibold">
                              {burnoutRisk?.currentCount || 0}/{burnoutRisk?.maxAllowed || 4} slots
                            </span>
                          </div>
                        </div>

                        {/* Rationale Bullet Tags */}
                        {rationale && rationale.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {rationale.map((reason, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 text-[11px] rounded-md flex items-center gap-1 ${
                                  reason.includes('Burnout Warning') || reason.includes('Workload Notice')
                                    ? 'bg-amber-900/30 text-amber-300 border border-amber-700/40'
                                    : reason.includes('Unavailable')
                                    ? 'bg-red-900/30 text-red-300 border border-red-700/40'
                                    : 'bg-indigo-950/50 text-indigo-300 border border-indigo-800/40'
                                }`}
                              >
                                {reason.includes('Child Safety') ? (
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                ) : reason.includes('Burnout') ? (
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                ) : (
                                  <Check className="w-3 h-3 text-indigo-400" />
                                )}
                                <span>{reason}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE ASSIGNMENTS & STATE MACHINE */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Tracking assignments through the auditable 9-stage lifecycle:
                </span>
                <span className="text-indigo-400 font-semibold">{assignments.length} total assignments</span>
              </div>

              {assignments.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-slate-800/60 p-6">
                  <UserCheck className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200">No active assignments yet</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Select candidates from the Smart Recommendations tab to assign servants to this opportunity.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((asg) => {
                    const statusColors = {
                      [ASSIGNMENT_STATUS.OPEN]: 'bg-slate-800 text-slate-300 border-slate-700',
                      [ASSIGNMENT_STATUS.INTEREST_SUBMITTED]: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                      [ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW]: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      [ASSIGNMENT_STATUS.CONFIRMED]: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                      [ASSIGNMENT_STATUS.DECLINED]: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                      [ASSIGNMENT_STATUS.CANCELLED]: 'bg-red-500/20 text-red-300 border-red-500/30',
                      [ASSIGNMENT_STATUS.REPLACEMENT_NEEDED]: 'bg-orange-500/20 text-orange-300 border-orange-500/40 animate-pulse',
                      [ASSIGNMENT_STATUS.REASSIGNED]: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                      [ASSIGNMENT_STATUS.COMPLETED]: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
                    };

                    return (
                      <div
                        key={asg.id}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{asg.memberName || 'Servant'}</h4>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border uppercase tracking-wider ${
                                statusColors[asg.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {(asg.status || 'open').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Role: <span className="text-slate-300 capitalize">{asg.role || 'Servant'}</span> • ID:{' '}
                            <span className="font-mono text-[10px]">{asg.id.substring(0, 12)}...</span>
                          </p>
                        </div>

                        {/* State Transition Actions for Leaders */}
                        <div className="flex flex-wrap items-center gap-2">
                          {asg.status === ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW && (
                            <>
                              <button
                                onClick={() =>
                                  handleTransitionStatus(asg.id, ASSIGNMENT_STATUS.CONFIRMED, 'Leader confirmed assignment')
                                }
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() =>
                                  handleTransitionStatus(asg.id, ASSIGNMENT_STATUS.DECLINED, 'Declined by leader')
                                }
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {asg.status === ASSIGNMENT_STATUS.CONFIRMED && (
                            <>
                              <button
                                onClick={() =>
                                  handleTransitionStatus(asg.id, ASSIGNMENT_STATUS.COMPLETED, 'Service successfully fulfilled')
                                }
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Completed</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCancelledAssignment(asg);
                                  handleTransitionStatus(
                                    asg.id,
                                    ASSIGNMENT_STATUS.REPLACEMENT_NEEDED,
                                    'Servant unavailable - replacement requested'
                                  );
                                  setActiveTab('replacement');
                                }}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:bg-amber-600/50 transition-colors flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Find Replacement</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleTransitionStatus(asg.id, ASSIGNMENT_STATUS.CANCELLED, 'Cancelled by leader')
                                }
                                disabled={actionLoading}
                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {asg.status === ASSIGNMENT_STATUS.REPLACEMENT_NEEDED && (
                            <button
                              onClick={() => {
                                setSelectedCancelledAssignment(asg);
                                setActiveTab('replacement');
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Select Replacement Now</span>
                            </button>
                          )}

                          {asg.status === ASSIGNMENT_STATUS.COMPLETED && (
                            <span className="text-xs font-semibold text-teal-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Fulfilled</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REPLACEMENT FINDER */}
          {activeTab === 'replacement' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold">Urgent Replacement Engine</h5>
                  <p className="mt-0.5 text-amber-300/80">
                    Find available servants to cover cancelled shifts. Excludes the withdrawing servant and prioritizes
                    volunteers with past experience in this role and healthy workload capacity.
                  </p>
                </div>
              </div>

              {/* Selector for which cancelled assignment to cover */}
              {assignments.length > 0 && (
                <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                    Replacing Servant:
                  </span>
                  <select
                    value={selectedCancelledAssignment?.id || ''}
                    onChange={(e) => {
                      const found = assignments.find((a) => a.id === e.target.value);
                      setSelectedCancelledAssignment(found || null);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Assignment Needing Coverage --</option>
                    {assignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.memberName} ({a.status.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Replacement Recommendations List */}
              {replacementCandidates.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-slate-800 p-6">
                  <HeartHandshake className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200">No replacement candidates to show</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Select an assignment requiring coverage above or ensure candidates are registered in the community.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {replacementCandidates.map((rec) => {
                    const { candidate, totalScore, rationale, isEmergencyReady } = rec;
                    return (
                      <div
                        key={candidate.id || candidate.uid}
                        className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {candidate.displayName || candidate.name}
                            </h4>
                            {isEmergencyReady && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Emergency Ready
                              </span>
                            )}
                            <span className="text-xs font-bold text-emerald-400 ml-1">
                              {totalScore}% Match
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {rationale.slice(0, 3).map((r, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => handleInitiateAssignment(candidate, true)}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-md shadow-amber-500/20"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Confirm Replacement</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Immutable state transition logs & accountability records</span>
                <span className="font-semibold text-indigo-400">{auditTimeline.length} events logged</span>
              </div>

              {auditTimeline.length === 0 ? (
                <div className="py-12 text-center bg-slate-950/40 rounded-xl border border-slate-800 p-6">
                  <History className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-200">No audit events recorded yet</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    State transitions for this serving opportunity will appear here with timestamps and actor details.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-800 ml-4 pl-4 space-y-4">
                  {auditTimeline.map((item, idx) => (
                    <div key={item.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-slate-900" />

                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">
                            {item.actor?.name || 'Leader'} ({item.actor?.role || 'coordinator'})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-slate-300">
                          <span className="capitalize font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {item.fromStatus?.replace(/_/g, ' ') || 'none'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="capitalize font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {item.toStatus?.replace(/_/g, ' ')}
                          </span>
                          {item.memberName && (
                            <span className="text-slate-400 ml-1">for {item.memberName}</span>
                          )}
                        </div>

                        {item.reason && (
                          <p className="text-slate-400 text-[11px] mt-1.5 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 italic">
                            "{item.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* EXPLICIT LEADER CONFIRMATION DRAWER (POPUP OVERLAY) */}
        {/* ================================================================= */}
        {pendingConfirmation && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="w-full max-w-md bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Leader Review & Confirmation</h3>
                  <p className="text-xs text-slate-400">Explicit confirmation required to dispatch assignment</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Servant:</span>
                  <span className="font-bold text-white">
                    {pendingConfirmation.candidate?.displayName || pendingConfirmation.candidate?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Opportunity:</span>
                  <span className="font-medium text-slate-200">{opportunity?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mode:</span>
                  <span className="font-semibold text-amber-400">
                    {pendingConfirmation.isReplacement ? 'Urgent Replacement' : 'Primary Assignment'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Leader Notes / Special Instructions (Optional):
                </label>
                <textarea
                  value={leaderNotes}
                  onChange={(e) => setLeaderNotes(e.target.value)}
                  placeholder="e.g. Reviewed referee qualifications. Assigned to Court A."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setPendingConfirmation(null)}
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={actionLoading}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm & Notify</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
