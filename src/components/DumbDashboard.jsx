import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import {
  Users,
  Clock,
  LogOut,
  Plus,
  Minus,
  Trophy,
  Bell,
  AlertTriangle,
  Send,
  MapPin,
  CheckCircle2,
  ChevronDown,
  Radio,
  Compass,
  ArrowLeft,
  BookOpen,
  LifeBuoy,
  Sparkles
} from 'lucide-react';

import BlessingBox from './BlessingBox';
import RulesBooklet from './RulesBooklet';
import EmergencySOS from './EmergencySOS';
import { triggerHaptic } from '../utils/haptics';
import { KeepAwake } from '@capacitor-community/keep-awake';

const WalkieTalkie = lazy(() => import('./WalkieTalkie'));
const TimelineFeedTab = lazy(() => import('./TimelineFeedTab'));
const ScoreboardTab = lazy(() => import('./ScoreboardTab'));

const S = {
  container: (hasBottomNav, showOutdoorHC) => ({
    minHeight: '100vh',
    width: '100%',
    maxWidth: '480px',
    margin: '0 auto',
    background: showOutdoorHC ? '#ffffff' : 'var(--bg-primary)',
    color: showOutdoorHC ? '#000000' : 'var(--text-primary)',
    fontFamily: "var(--font-body)",
    padding: hasBottomNav ? '16px 16px 80px 16px' : '16px 16px 24px 16px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    overflowX: 'hidden',
    ...(showOutdoorHC ? { border: '4px solid #000000' } : {})
  }),
  toggleUiBtn: {
    background: 'rgba(41, 182, 246, 0.15)',
    border: '1px solid rgba(41, 182, 246, 0.3)',
    borderRadius: '8px',
    color: '#29b6f6',
    fontSize: '11px',
    fontWeight: '800',
    padding: '6px 12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '64px',
    background: 'rgba(10, 16, 32, 0.95)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border-light)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    zIndex: 100
  },
  navTab: (active) => ({
    background: 'none',
    border: 'none',
    color: active ? 'var(--vbt-sky)' : 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'color 0.2s ease',
    flex: 1
  }),
  navLabel: {
    fontSize: '11px',
    fontWeight: '700'
  },
  cardButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s ease',
    textAlign: 'center'
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    padding: '8px 14px',
    cursor: 'pointer',
    marginBottom: '12px',
    outline: 'none',
    transition: 'background 0.2s ease'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--border-light)',
  },
  profile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  profileName: {
    fontSize: '16px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  profileRole: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '10px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '700',
    transition: 'all 0.2s',
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid',
    animation: 'pulseAlert 2.5s infinite ease-in-out',
  },
  alertTextContent: {
    flex: 1,
  },
  alertTitle: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    color: 'var(--text-primary)',
    marginBottom: '2px',
  },
  alertDesc: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    margin: 0,
    lineHeight: '1.4',
  },
  card: {
    background: 'var(--bg-surface)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    animation: 'subtleGlow 4s infinite ease-in-out',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    margin: 0,
  },
  currentActivityBox: {
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
    border: '1px solid var(--border-light)',
    marginBottom: '10px',
  },
  activityTimeBadge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--vbt-sky)',
    background: 'rgba(41, 182, 246, 0.1)',
    padding: '3px 8px',
    borderRadius: '6px',
    marginBottom: '6px',
  },
  currentActivityName: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
    margin: 0,
    lineHeight: '1.3',
  },
  nextActivityBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
  },
  nextLabel: {
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  nextText: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  deductButton: {
    width: '100%',
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
    transition: 'transform 0.1s',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  },
  broadcastBtn: (active) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    background: active ? 'var(--gradient-vbt)' : 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    color: active ? '#ffffff' : 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '700',
    cursor: active ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s',
  }),
  successText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    color: '#10b981',
    fontSize: '12px',
    fontWeight: '600',
    marginTop: '4px',
  },
  inputLabel: {
    fontSize: '10px',
    fontWeight: '800',
    color: 'var(--text-muted)',
    letterSpacing: '0.06em',
    marginBottom: '2px',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  singleGameDisplay: {
    padding: '12px 14px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  scoringContainer: {
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
    border: '1px solid var(--border-light)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  matchupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoringPadsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  scorePad: {
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    border: '1px solid var(--border-light)',
  },
  scoreTeamName: {
    fontSize: '13px',
    fontWeight: '800',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginBottom: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: '100%',
  },
  scoreNumber: {
    fontSize: '42px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
    margin: '4px 0 10px 0',
  },
  padButtonContainer: {
    display: 'flex', alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  padBtnMinus: {
    flex: 1,
    height: '42px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  padBtnPlus: (color) => ({
    flex: 1.5,
    height: '42px',
    borderRadius: '8px',
    background: `${color}15`,
    border: `1px solid ${color}35`,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }),
  submitScoreBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.15)',
  },
  feedScrollContainer: {
    maxHeight: '220px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '4px',
  },
  feedItem: {
    padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
  },
  feedMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  feedSender: {
    fontSize: '11px',
    fontWeight: '800',
  },
  feedTime: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  feedText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: '1.4',
    wordBreak: 'break-word',
  },
  noAnnouncements: {
    textAlign: 'center',
    padding: '24px',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(var(--bg-primary-rgb, 7 10 19) / 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: '480px',
    background: 'var(--bg-surface)',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    border: '1px solid var(--border-light)',
    borderBottom: 'none',
    padding: '20px',
    boxSizing: 'border-box',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '20px',
    cursor: 'pointer',
  },
  modalOptionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
  },
  modalOptionCard: (selected) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '10px',
    background: selected ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-elevated)',
    border: selected ? '2px solid #ef4444' : '1px solid var(--border-light)',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--text-primary)',
  }),
  modalOptionLabel: {
    fontSize: '13px',
    fontWeight: '600',
  },
  modalOptionPts: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#ef4444',
  },
  customDeductInputs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    borderRadius: '10px',
  },
  numberInput: {
    width: '100%',
    padding: '10px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  },
  textInput: {
    width: '100%',
    padding: '10px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-light)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  submitDeductBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    background: '#ef4444',
    border: 'none',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '800',
    cursor: 'pointer',
    marginTop: '10px',
  }
};


// ─── Helpers ──────────────────────────────────────────────────

const getSideColor = (sideName) => {
  const s = String(sideName || '').toLowerCase();
  if (s.includes('red') || s === 'r') return '#ef4444';
  if (s.includes('white') || s === 'w') return '#ffffff';
  if (s.includes('black') || s === 'k') return '#94a3b8';
  if (s.includes('blue') || s === 'b') return '#29b6f6';
  return 'var(--vbt-sky)';
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    // If it's an ISO timestamp
    if (typeof timestamp === 'string' && timestamp.includes('T')) {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return String(timestamp);
  } catch (e) {
    return String(timestamp);
  }
};

const DEDUCTION_OPTIONS = [
  { points: 5, label: '⏱️ Lateness / Late to Station', reason: 'Lateness' },
  { points: 5, label: '👕 Uniform Violation / No VBT Shirt', reason: 'Uniform' },
  { points: 5, label: '🗣️ Foul Language / Bad Sportsmanship', reason: 'Language' },
  { points: 10, label: '⚠️ Severe Disrespect / Bad Behavior', reason: 'Behavior' },
  { points: 1, label: '🛑 Minor Offense', reason: 'Minor Offense' },
  { points: 0, label: '✏️ Custom Deduction...', reason: 'Custom' }
];

export default function DumbDashboard({
  currentUser,
  activeEventCode,
  eventConfig,
  campData,
  activeScheduleItem,
  standings,
  onLogout,
  onSubmitDeduction,
  onSubmitScore,
  onPostAnnouncement,
  announcements = [],
  urgentAlert = { show: false, text: '' },
  activePingAlert = { show: false, text: '' },
  onToggleUiMode,

  // New props
  timeRemainingSecs,
  isOutdoorMode,

  // Feed Tab Props
  announcementText: propAnnouncementText,
  uploadImage,
  fileInputRef,
  eventLabels,
  firebaseConnected,
  setShowFeedbackModal,
  setAnnouncementText: propSetAnnouncementText,
  setUploadImage,

  // Scoreboard Tab Props
  scoreViewMode,
  expandedBlocks,
  expandedGames,
  uniqueGames,
  side1Name,
  side2Name,
  shakesPercentage,
  friesPercentage,
  getTeamColorHex,
  setScoreViewMode,
  setExpandedBlocks,
  setExpandedGames,
  handleToggleWinner,
  getEffectiveTimeShift,
  getShiftedTimeStr,
  isTimeSlotActive,
  getEventCurrentDay,
  parseTimeToMs,

  // SOS Trigger
  triggerRemotePushNotification
}) {
  const isLeader = currentUser?.role === 'leader';
  const isReferee = currentUser?.role === 'referee';
  const showOutdoorHC = isOutdoorMode && (isLeader || isReferee);

  const getCardStyle = (extraStyles = {}) => {
    return {
      ...S.card,
      ...extraStyles,
      ...(showOutdoorHC ? {
        background: '#ffffff',
        color: '#000000',
        border: '4px solid #000000',
        borderColor: '#000000',
        borderLeft: '4px solid #000000',
        boxShadow: 'none',
        animation: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none'
      } : {})
    };
  };

  useEffect(() => {
    const lockWakeState = async () => {
      try {
        await KeepAwake.keepAwake();
      } catch (err) {
        console.warn('KeepAwake error:', err);
      }
    };
    lockWakeState();
    return () => {
      const releaseWakeState = async () => {
        try {
          await KeepAwake.allowSleep();
        } catch (err) {
          console.warn('AllowSleep error:', err);
        }
      };
      releaseWakeState();
    };
  }, []);

  // ─── Flip Rules and Location States ───
  const [flipRulesGame, setFlipRulesGame] = useState(null);

  const handleFlipRules = (gameName) => {
    if (!gameName) return;
    let found = null;
    if (eventConfig?.stations) {
      found = Object.values(eventConfig.stations).find(s => 
        (s.name || '').toLowerCase().includes(gameName.toLowerCase()) || 
        gameName.toLowerCase().includes((s.name || '').toLowerCase())
      );
    }
    if (!found && eventConfig?.bigGameName && (gameName.toLowerCase().includes(eventConfig.bigGameName.toLowerCase()) || eventConfig.bigGameName.toLowerCase().includes(gameName.toLowerCase()))) {
      found = { name: eventConfig.bigGameName, howToPlay: eventConfig.bigGameHowToPlay, lesson: eventConfig.bigGameLesson };
    }
    if (!found && eventConfig?.reflectionName && (gameName.toLowerCase().includes(eventConfig.reflectionName.toLowerCase()) || eventConfig.reflectionName.toLowerCase().includes(gameName.toLowerCase()))) {
      found = { name: eventConfig.reflectionName, howToPlay: eventConfig.reflectionHowToPlay, lesson: eventConfig.reflectionLesson };
    }
    if (!found) {
      found = { name: gameName, howToPlay: "No specific rules provided for this activity.", lesson: "No specific lesson details." };
    }
    setFlipRulesGame(found);
  };

  // Find active/current block index
  const activeBlockNum = useMemo(() => {
    if (!campData?.matchups) return null;
    const currentDay = getEventCurrentDay ? getEventCurrentDay() : 1;
    const todaysMatchups = campData.matchups.filter(m => {
      const mDay = m.day || (eventConfig?.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
      return mDay === currentDay;
    });
    const activeMatchup = todaysMatchups.find(m => isTimeSlotActive ? isTimeSlotActive(m.time, `Block ${m.block}`, m.day) : false);
    return activeMatchup ? activeMatchup.block : null;
  }, [campData, eventConfig, isTimeSlotActive, getEventCurrentDay]);

  const currentBlockIndex = useMemo(() => {
    if (activeBlockNum !== null) return activeBlockNum;
    const currentDay = getEventCurrentDay ? getEventCurrentDay() : 1;
    const todaysMatchups = campData?.matchups?.filter(m => {
      const mDay = m.day || (eventConfig?.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
      return mDay === currentDay;
    }) || [];
    
    const shift = getEffectiveTimeShift ? getEffectiveTimeShift() : 0;
    const blocksWithTime = [];
    const seenBlocks = new Set();
    todaysMatchups.forEach(m => {
      if (!seenBlocks.has(m.block)) {
        seenBlocks.add(m.block);
        const startMs = parseTimeToMs ? parseTimeToMs(m.time) + shift * 60 * 1000 : 0;
        blocksWithTime.push({ block: m.block, startMs });
      }
    });
    
    blocksWithTime.sort((a, b) => a.startMs - b.startMs);
    const nowMs = Date.now();
    const upcoming = blocksWithTime.find(b => b.startMs > nowMs);
    return upcoming ? upcoming.block : 1;
  }, [activeBlockNum, campData, eventConfig, getEventCurrentDay, getEffectiveTimeShift, parseTimeToMs]);

  const currentBlockMatchup = useMemo(() => {
    if (!campData?.matchups || !currentUser?.teamCode) return null;
    const myCodeNorm = currentUser.teamCode.toLowerCase().replace(/[\s_-]+/g, '');
    const dayMatchups = campData.matchups.filter(m => {
      const currentDay = getEventCurrentDay ? getEventCurrentDay() : 1;
      const mDay = m.day || (eventConfig?.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
      return mDay === currentDay && m.block === currentBlockIndex;
    });
    
    const specific = dayMatchups.find(m => {
      const tANorm = (m.teamA || '').toLowerCase().replace(/[\s_-]+/g, '');
      const tBNorm = (m.teamB || '').toLowerCase().replace(/[\s_-]+/g, '');
      return tANorm === myCodeNorm || tBNorm === myCodeNorm;
    });
    return specific || dayMatchups[0] || null;
  }, [campData, currentUser, currentBlockIndex, eventConfig, getEventCurrentDay]);

  const nextBlockMatchup = useMemo(() => {
    if (!campData?.matchups || !currentUser?.teamCode) return null;
    const myCodeNorm = currentUser.teamCode.toLowerCase().replace(/[\s_-]+/g, '');
    const dayMatchups = campData.matchups.filter(m => {
      const currentDay = getEventCurrentDay ? getEventCurrentDay() : 1;
      const mDay = m.day || (eventConfig?.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
      return mDay === currentDay && m.block === (currentBlockIndex + 1);
    });
    
    const specific = dayMatchups.find(m => {
      const tANorm = (m.teamA || '').toLowerCase().replace(/[\s_-]+/g, '');
      const tBNorm = (m.teamB || '').toLowerCase().replace(/[\s_-]+/g, '');
      return tANorm === myCodeNorm || tBNorm === myCodeNorm;
    });
    return specific || dayMatchups[0] || null;
  }, [campData, currentUser, currentBlockIndex, eventConfig, getEventCurrentDay]);

  // ─── State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'feed' | 'scores' | 'radio' | 'rules' | 'sos'

  // Deduction Modal (Leader only)
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [selectedDeductIdx, setSelectedDeductIdx] = useState(0);
  const [customPoints, setCustomPoints] = useState(5);
  const [customReason, setCustomReason] = useState('');
  const [deductSuccessMsg, setDeductSuccessMsg] = useState('');

  const [timeLeft, setTimeLeft] = useState(timeRemainingSecs);

  useEffect(() => {
    setTimeLeft(timeRemainingSecs);
  }, [timeRemainingSecs]);

  useEffect(() => {
    if (timeLeft === undefined || timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev > 0) return prev - 1;
        clearInterval(interval);
        return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatCountdown = (seconds) => {
    if (seconds === undefined || seconds === null || seconds < 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Announcement Text (Leader only)
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);

  // Referee scoring selection
  const assignedGames = currentUser?.assignedGames || [];
  const [selectedGame, setSelectedGame] = useState(assignedGames[0] || '');

  // Extract all unique games from matchups if none assigned
  const allGames = useMemo(() => {
    if (campData?.games) {
      return campData.games.map(g => g.name || g);
    }
    if (campData?.matchups) {
      const unique = new Set(campData.matchups.map(m => m.game));
      return Array.from(unique);
    }
    return [];
  }, [campData]);

  // Set default game if not assigned
  useEffect(() => {
    if (!selectedGame) {
      if (assignedGames.length > 0) {
        setSelectedGame(assignedGames[0]);
      } else if (allGames.length > 0) {
        setSelectedGame(allGames[0]);
      }
    }
  }, [assignedGames, allGames, selectedGame]);

  // Filter matchups for the selected game
  const gameMatchups = useMemo(() => {
    if (!campData?.matchups || !selectedGame) return [];
    return campData.matchups.filter(m => m.game === selectedGame);
  }, [campData, selectedGame]);

  const getMatchupScoreStatus = (m) => {
    if (!m) return null;
    const key = `${m.block}_${m.round}_${m.game}`;
    const scoreVal = campData?.blockScores?.[key] || campData?.campState?.blockScores?.[key];
    return scoreVal || null;
  };

  // Find active/selected matchup for scoring
  const [selectedMatchup, setSelectedMatchup] = useState(null);

  useEffect(() => {
    if (gameMatchups.length > 0) {
      // Default to first unsubmitted matchup, or first matchup
      const unsubmitted = gameMatchups.find(m => {
        const score = getMatchupScoreStatus(m);
        return !score || score === 'NA';
      });
      setSelectedMatchup(unsubmitted || gameMatchups[0]);
    } else {
      setSelectedMatchup(null);
    }
  }, [gameMatchups]);

  // Referee Scores
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [refSubmitSuccess, setRefSubmitSuccess] = useState(false);

  // Pre-load score if already saved
  useEffect(() => {
    if (selectedMatchup) {
      const key = `${selectedMatchup.block}_${selectedMatchup.round}_${selectedMatchup.game}`;
      const savedScore = campData?.blockScores?.[key] || campData?.campState?.blockScores?.[key];
      if (savedScore && typeof savedScore === 'string' && savedScore.includes('-')) {
        const parts = savedScore.split('-').map(s => parseInt(s.trim(), 10));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setScoreA(parts[0]);
          setScoreB(parts[1]);
          return;
        }
      }
      setScoreA(0);
      setScoreB(0);
    }
  }, [selectedMatchup, campData]);

  // ─── Computed Values ────────────────────────────────────────

  // Leader score & rank calculations
  const leaderStats = useMemo(() => {
    let score = 0;
    let rank = 1;
    const mySide = currentUser?.side || '';
    const myTeam = currentUser?.teamCode || '';

    if (standings && standings.finalScores) {
      score = standings.finalScores[mySide] || standings.finalScores[myTeam] || 0;
      const sorted = Object.entries(standings.finalScores).sort((a, b) => b[1] - a[1]);
      const idx = sorted.findIndex(([k]) => k.toLowerCase() === myTeam.toLowerCase() || k.toLowerCase() === mySide.toLowerCase());
      if (idx !== -1) rank = idx + 1;
    } else if (campData?.teams && campData.teams[myTeam]) {
      score = campData.teams[myTeam].score || 0;
    }
    return { score, rank };
  }, [currentUser, standings, campData]);

  const leaderScore = leaderStats.score;
  const leaderRank = leaderStats.rank;

  // Sorted Announcements (Most recent first)
  const sortedAnnouncements = useMemo(() => {
    if (!announcements) return [];
    return [...announcements].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [announcements]);

  // Active Schedule item current and next
  const scheduleSlots = useMemo(() => {
    if (!activeScheduleItem) return { current: null, next: null };
    if (activeScheduleItem.current) {
      return {
        current: activeScheduleItem.current,
        next: activeScheduleItem.next || null
      };
    }
    if (activeScheduleItem.game || activeScheduleItem.activity || activeScheduleItem.time) {
      return {
        current: activeScheduleItem,
        next: activeScheduleItem.next || null
      };
    }
    return { current: null, next: null };
  }, [activeScheduleItem]);

  const isBreak = useMemo(() => {
    if (!scheduleSlots.current) return false;
    const name = (scheduleSlots.current.game || scheduleSlots.current.activity || '').toLowerCase();
    return name.includes('break') || name.includes('lunch') || name.includes('dinner') || name.includes('snack') || name.includes('free time') || name.includes('transition') || name.includes('rest');
  }, [scheduleSlots.current]);

  // ─── Actions ────────────────────────────────────────────────

  const handlePostDeductionSubmit = () => {
    const option = DEDUCTION_OPTIONS[selectedDeductIdx];
    const points = option.reason === 'Custom' ? parseInt(customPoints, 10) : option.points;
    const reason = option.reason === 'Custom' ? customReason.trim() : option.reason;

    if (!points || points <= 0) {
      alert('Please specify points greater than 0');
      return;
    }
    if (!reason) {
      alert('Please specify a reason');
      return;
    }

    if (onSubmitDeduction) {
      onSubmitDeduction(currentUser.teamCode, points, reason);
      triggerHaptic('warning');
      setDeductSuccessMsg(`Deducted ${points} pts successfully!`);
      setTimeout(() => {
        setDeductSuccessMsg('');
        setShowDeductModal(false);
      }, 1500);
    }
  };

  const handlePostAnnouncementSubmit = (e) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    if (onPostAnnouncement) {
      onPostAnnouncement(announcementText.trim());
      triggerHaptic('success');
      setAnnouncementText('');
      setAnnouncementSuccess(true);
      setTimeout(() => setAnnouncementSuccess(false), 2000);
    }
  };

  const handleRefereeScoreSubmit = () => {
    if (!selectedMatchup) return;

    const matchupId = selectedMatchup.id || `${selectedMatchup.block}_${selectedMatchup.round}_${selectedMatchup.game}`;
    const teamA = selectedMatchup.teamA || 'Team A';
    const teamB = selectedMatchup.teamB || 'Team B';

    const scores = {
      scoreA,
      scoreB,
      [teamA]: scoreA,
      [teamB]: scoreB,
      winner: scoreA > scoreB ? teamA : scoreB > scoreA ? teamB : 'TIE',
      scoreString: `${scoreA} - ${scoreB}`
    };

    if (onSubmitScore) {
      onSubmitScore(matchupId, scores);
      triggerHaptic('success');
      setRefSubmitSuccess(true);
      setTimeout(() => setRefSubmitSuccess(false), 2000);
    }
  };

  const teamA = selectedMatchup?.teamA || 'Team A';
  const teamB = selectedMatchup?.teamB || 'Team B';

  return (
    <div 
      style={S.container(currentUser && (currentUser.role === 'admin' || currentUser.role === 'coordinator'), showOutdoorHC)}
      className={showOutdoorHC ? 'outdoor-hc-active' : ''}
    >
      <style>{`
        @keyframes pulseAlert {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.99); opacity: 0.85; }
        }
        @keyframes subtleGlow {
          0%, 100% { box-shadow: 0 4px 20px rgba(0, 176, 255, 0.05); }
          50% { box-shadow: 0 4px 30px rgba(0, 176, 255, 0.15); }
        }
        .outdoor-hc-active {
          --bg-primary: #ffffff !important;
          --bg-surface: #ffffff !important;
          --bg-elevated: #ffffff !important;
          --bg-card: #ffffff !important;
          --border-light: #000000 !important;
          --text-primary: #000000 !important;
          --text-secondary: #000000 !important;
          --text-muted: #000000 !important;
          --text-label: #000000 !important;
          background: #ffffff !important;
          color: #000000 !important;
          border: 4px solid #000000 !important;
        }
        .outdoor-hc-active .outdoor-card {
          background: #ffffff !important;
          color: #000000 !important;
          border: 4px solid #000000 !important;
          box-shadow: none !important;
          animation: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .outdoor-hc-active .outdoor-subbox {
          background: #ffffff !important;
          color: #000000 !important;
          border: 3px solid #000000 !important;
        }
        .outdoor-hc-active .outdoor-badge {
          background: #000000 !important;
          color: #ffffff !important;
          border: 2px solid #000000 !important;
        }
        .outdoor-hc-active .outdoor-card-button-rules,
        .outdoor-hc-active .outdoor-card-button-sos {
          background: #ffffff !important;
          border: 3px solid #000000 !important;
          color: #000000 !important;
        }
        .outdoor-hc-active .outdoor-deduct-btn,
        .outdoor-hc-active .outdoor-broadcast-btn,
        .outdoor-hc-active .outdoor-submit-score-btn {
          background: #000000 !important;
          color: #ffffff !important;
          border: 3px solid #000000 !important;
          box-shadow: none !important;
        }
        .outdoor-hc-active .outdoor-textarea,
        .outdoor-hc-active .outdoor-select,
        .outdoor-hc-active .outdoor-number-input,
        .outdoor-hc-active .outdoor-text-input {
          background: #ffffff !important;
          border: 2px solid #000000 !important;
          color: #000000 !important;
        }
        .outdoor-hc-active .outdoor-score-btn-win,
        .outdoor-hc-active .outdoor-score-btn-lose {
          background: #ffffff !important;
          color: #000000 !important;
          border: 3px solid #000000 !important;
        }
        .outdoor-hc-active * {
          color: #000000 !important;
          text-shadow: none !important;
        }
        .outdoor-hc-active .outdoor-badge *,
        .outdoor-hc-active .outdoor-deduct-btn *,
        .outdoor-hc-active .outdoor-broadcast-btn *,
        .outdoor-hc-active .outdoor-submit-score-btn * {
          color: #ffffff !important;
        }
      `}</style>

      {/* ─── Header ─────────────────────────────────────────────── */}
      <header style={S.header}>
        <div style={S.profile}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={S.profileName}>{currentUser?.name || 'VBT Leader'}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              background: getSideColor(currentUser?.side),
              color: '#070a13',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase'
            }}>
              {currentUser?.side || 'Camp'}
            </span>
          </div>
          <span style={S.profileRole}>
            {currentUser?.role === 'admin' ? 'System Administrator' : currentUser?.role === 'leader' ? `Team Leader • ${currentUser?.teamCode}` : 'Game Referee'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={S.toggleUiBtn} onClick={onToggleUiMode}>
            <span>✨ Detailed UI</span>
          </button>
          <button style={S.logoutBtn} onClick={onLogout}>
            <LogOut size={16} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* ─── Pulsing Alerts Banner ─────────────────────────────── */}
      {urgentAlert?.show && (
        <div style={{ ...S.alertBanner, background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.35) 0%, rgba(185, 28, 28, 0.15) 100%)', borderColor: '#ef4444' }}>
          <AlertTriangle size={24} style={{ color: '#ef4444' }} />
          <div style={S.alertTextContent}>
            <span style={S.alertTitle}>CRITICAL ALERT</span>
            <p style={S.alertDesc}>{urgentAlert.text}</p>
          </div>
        </div>
      )}

      {activePingAlert?.show && !urgentAlert?.show && (
        <div style={{ ...S.alertBanner, background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.35) 0%, rgba(161, 98, 7, 0.15) 100%)', borderColor: '#eab308' }}>
          <Bell size={24} style={{ color: '#eab308' }} />
          <div style={S.alertTextContent}>
            <span style={S.alertTitle}>BROADCAST PING</span>
            <p style={S.alertDesc}>{activePingAlert.text}</p>
          </div>
        </div>
      )}

      {/* ─── Tab Content Views ─────────────────────────────────── */}
      <div key={activeTab} className="animate-fade-tab">
      
      {/* Tab: Actions */}
      {activeTab === 'actions' && (
        <>
          {/* Schedule Block */}
          <section style={getCardStyle()} className="outdoor-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={18} style={{ color: 'var(--vbt-sky)' }} />
              <h3 style={S.sectionTitle}>Timeline & Activity</h3>
            </div>

            {scheduleSlots.current ? (
              <div>
                <div style={S.currentActivityBox} className="outdoor-subbox">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={S.activityTimeBadge} className="outdoor-badge">
                      {scheduleSlots.current.time || 'NOW'}
                    </span>
                    {timeLeft !== undefined && timeLeft !== null && timeLeft > 0 && (
                      <span style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: showOutdoorHC ? '#000000' : '#f87171',
                        background: showOutdoorHC ? '#ffffff' : 'rgba(239, 68, 68, 0.1)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: showOutdoorHC ? '2px solid #000000' : 'none'
                      }} className="outdoor-badge">
                        <Clock size={12} />
                        <span>{formatCountdown(timeLeft)}</span>
                      </span>
                    )}
                  </div>
                  <h2 style={S.currentActivityName}>{scheduleSlots.current.game || scheduleSlots.current.activity}</h2>
                  {scheduleSlots.current.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} style={{ color: 'var(--vbt-sky)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>{scheduleSlots.current.location}</span>
                    </div>
                  )}
                </div>

                {scheduleSlots.next && (
                  <div style={S.nextActivityBox} className="outdoor-subbox">
                    <span style={S.nextLabel}>UP NEXT:</span>
                    <span style={S.nextText}>
                      {scheduleSlots.next.game || scheduleSlots.next.activity} ({scheduleSlots.next.time})
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={S.emptyState}>
                <p>No active schedule item running.</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Check back once coordinators publish rounds.</p>
              </div>
            )}
          </section>

          {/* Quick Utilities Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => setActiveTab('rules')}
              style={{
                ...S.cardButton,
                background: 'linear-gradient(135deg, rgba(41, 182, 246, 0.12) 0%, rgba(13, 20, 38, 0.5) 100%)',
                border: '1px solid rgba(41, 182, 246, 0.3)',
                color: '#29b6f6'
              }}
              className="outdoor-card-button-rules"
            >
              <BookOpen size={20} />
              <span style={{ fontWeight: '750', fontSize: '12px' }}>Rules Booklet</span>
            </button>
            <button
              onClick={() => setActiveTab('sos')}
              style={{
                ...S.cardButton,
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(13, 20, 38, 0.5) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444'
              }}
              className="outdoor-card-button-sos"
            >
              <LifeBuoy size={20} />
              <span style={{ fontWeight: '750', fontSize: '12px' }}>Emergency SOS</span>
            </button>
          </div>

          {/* Leader View */}
          {isLeader && (
            <>
              {/* Team Score & Deduct Button */}
              <section style={getCardStyle({ borderLeft: `5px solid ${getSideColor(currentUser?.side)}` })} className="outdoor-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      My Team: {currentUser?.teamCode}
                    </h3>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-title)' }}>
                      {leaderScore} <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-muted)' }}>total pts</span>
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Standing</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', color: '#fbbf24', fontWeight: '700' }}>
                      <Trophy size={16} />
                      <span>#{leaderRank}</span>
                    </div>
                  </div>
                </div>

                <button style={S.deductButton} className="outdoor-deduct-btn" onClick={() => setShowDeductModal(true)}>
                  <span>⚠️ Deduct Points</span>
                </button>
              </section>

              {/* CURRENT & NEXT LOCATION PANEL */}
              <section style={getCardStyle({
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                border: '2px solid #ffffff',
                padding: '24px 16px',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                textAlign: 'center'
              })} className="outdoor-card">
                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: getSideColor(currentUser?.side),
                  fontFamily: 'var(--font-title)',
                  margin: '0 0 16px 0',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 15px ${getSideColor(currentUser?.side)}33`
                }}>
                  {(currentUser.teamCode || 'TEAM').replace(/^team_/i, '').replace(/_/g, ' ')}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Current Location */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1.5px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '18px 12px'
                  }} className="outdoor-subbox">
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      📍 CURRENT STATION
                    </span>
                    {currentBlockMatchup ? (
                      <div style={{ marginTop: '8px' }}>
                        <div
                          onClick={() => handleFlipRules(currentBlockMatchup.game)}
                          style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', lineHeight: 1.2 }}
                          title="Tap to read game rules"
                        >
                          {currentBlockMatchup.location} <BookOpen size={16} style={{ color: 'var(--vbt-sky)' }} />
                        </div>
                        <div
                          onClick={() => handleFlipRules(currentBlockMatchup.game)}
                          style={{ fontSize: '14px', color: '#a78bfa', marginTop: '6px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Game: {currentBlockMatchup.game}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '8px', fontWeight: '700' }}>
                        No active game scheduled
                      </div>
                    )}
                  </div>

                  {/* Next Location */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1.5px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '18px 12px'
                  }} className="outdoor-subbox">
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      ➡️ NEXT STATION
                    </span>
                    {nextBlockMatchup ? (
                      <div style={{ marginTop: '8px' }}>
                        <div
                          onClick={() => handleFlipRules(nextBlockMatchup.game)}
                          style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', lineHeight: 1.2 }}
                          title="Tap to read game rules"
                        >
                          {nextBlockMatchup.location} <BookOpen size={15} style={{ color: 'var(--vbt-sky)' }} />
                        </div>
                        <div
                          onClick={() => handleFlipRules(nextBlockMatchup.game)}
                          style={{ fontSize: '13px', color: '#a78bfa', marginTop: '6px', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Game: {nextBlockMatchup.game}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '8px', fontWeight: '700' }}>
                        End of Day / No further games
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Broadcast Announcement */}
              <section style={getCardStyle()} className="outdoor-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Bell size={18} style={{ color: 'var(--vbt-sky)' }} />
                  <h3 style={S.sectionTitle}>Broadcast to Camp</h3>
                </div>
                <form onSubmit={handlePostAnnouncementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Type a quick notice to all camps..."
                    style={S.textarea}
                    className="outdoor-textarea"
                    rows={3}
                  />
                  <button type="submit" disabled={!announcementText.trim()} style={S.broadcastBtn(announcementText.trim())} className="outdoor-broadcast-btn">
                    <Send size={16} />
                    <span>Send Broadcast</span>
                  </button>
                  {announcementSuccess && (
                    <div style={S.successText}>
                      <CheckCircle2 size={14} />
                      <span>Broadcast Sent!</span>
                    </div>
                  )}
                </form>
              </section>
            </>
          )}

          {/* Referee View */}
          {isReferee && (
            <section style={getCardStyle()} className="outdoor-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Game / Station Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={S.inputLabel}>REF STATION / GAME</label>
                  {assignedGames.length <= 1 ? (
                    <div
                      onClick={() => handleFlipRules(selectedGame)}
                      style={{ ...S.singleGameDisplay, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
                      title="Tap to read game rules"
                      className="outdoor-subbox"
                    >
                      <span>{selectedGame || 'No game assigned'}</span>
                      {selectedGame && <BookOpen size={14} style={{ color: 'var(--vbt-sky)' }} />}
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedGame}
                        onChange={(e) => setSelectedGame(e.target.value)}
                        style={S.select}
                        className="outdoor-select"
                      >
                        {assignedGames.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                    </div>
                  )}
                </div>

                {/* Matchup Selection */}
                {gameMatchups.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={S.inputLabel}>CHOOSE MATCHUP TO SCORE</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={selectedMatchup ? `${selectedMatchup.block}_${selectedMatchup.round}_${selectedMatchup.game}` : ''}
                          onChange={(e) => {
                            const match = gameMatchups.find(m => `${m.block}_${m.round}_${m.game}` === e.target.value);
                            if (match) setSelectedMatchup(match);
                          }}
                          style={S.select}
                          className="outdoor-select"
                        >
                          {gameMatchups.map(m => {
                            const val = `${m.block}_${m.round}_${m.game}`;
                            const score = getMatchupScoreStatus(m);
                            const label = `Block ${m.block} • R${m.round}: ${m.teamA} vs ${m.teamB} ${score ? `(${score})` : '[UNSCORED]'}`;
                            return (
                              <option key={val} value={val}>{label}</option>
                            );
                          })}
                        </select>
                        <ChevronDown size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                      </div>
                    </div>

                    {selectedMatchup && (
                      <div style={S.scoringContainer} className="outdoor-subbox">
                        <div
                          onClick={() => handleFlipRules(selectedMatchup.game)}
                          style={{ ...S.matchupHeader, cursor: 'pointer' }}
                          title="Tap to read game rules"
                        >
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--vbt-sky)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Block {selectedMatchup.block} • Round {selectedMatchup.round} <BookOpen size={11} />
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            📍 {selectedMatchup.location}
                          </span>
                        </div>

                        {/* Giant Scoring Pads */}
                        <div style={S.scoringPadsGrid}>
                          {/* Team A */}
                          <div style={{ ...S.scorePad, borderTop: `4px solid ${getSideColor(teamA)}`, padding: '16px 12px' }} className="outdoor-subbox">
                            <span style={{ ...S.scoreTeamName, fontSize: '15px' }}>{teamA}</span>
                            <div style={{ ...S.scoreNumber, fontSize: '48px', margin: '8px 0' }}>{scoreA}</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <button
                                style={{
                                  width: '100%',
                                  height: '56px',
                                  borderRadius: '12px',
                                  background: scoreA === 15 ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                                  border: `2px solid ${scoreA === 15 ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}`,
                                  color: scoreA === 15 ? '#ffffff' : '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '900',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease',
                                }}
                                className="outdoor-score-btn-win"
                                onClick={() => {
                                  setScoreA(15);
                                  setScoreB(5);
                                }}
                              >
                                🏆 WIN
                              </button>
                              <button
                                style={{
                                  width: '100%',
                                  height: '50px',
                                  borderRadius: '12px',
                                  background: scoreA === 5 ? '#ef4444' : 'rgba(239, 68, 68, 0.06)',
                                  border: `2px solid ${scoreA === 5 ? '#ef4444' : 'rgba(239, 68, 68, 0.2)'}`,
                                  color: scoreA === 5 ? '#ffffff' : '#f87171',
                                  fontSize: '14px',
                                  fontWeight: '900',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease',
                                }}
                                className="outdoor-score-btn-lose"
                                onClick={() => {
                                  setScoreA(5);
                                  setScoreB(15);
                                }}
                              >
                                ❌ LOSE
                              </button>
                            </div>
                          </div>

                          {/* Team B */}
                          <div style={{ ...S.scorePad, borderTop: `4px solid ${getSideColor(teamB)}`, padding: '16px 12px' }} className="outdoor-subbox">
                            <span style={{ ...S.scoreTeamName, fontSize: '15px' }}>{teamB}</span>
                            <div style={{ ...S.scoreNumber, fontSize: '48px', margin: '8px 0' }}>{scoreB}</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <button
                                style={{
                                  width: '100%',
                                  height: '56px',
                                  borderRadius: '12px',
                                  background: scoreB === 15 ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                                  border: `2px solid ${scoreB === 15 ? '#10b981' : 'rgba(16, 185, 129, 0.3)'}`,
                                  color: scoreB === 15 ? '#ffffff' : '#10b981',
                                  fontSize: '14px',
                                  fontWeight: '900',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease',
                                }}
                                className="outdoor-score-btn-win"
                                onClick={() => {
                                  setScoreB(15);
                                  setScoreA(5);
                                }}
                              >
                                🏆 WIN
                              </button>
                              <button
                                style={{
                                  width: '100%',
                                  height: '50px',
                                  borderRadius: '12px',
                                  background: scoreB === 5 ? '#ef4444' : 'rgba(239, 68, 68, 0.06)',
                                  border: `2px solid ${scoreB === 5 ? '#ef4444' : 'rgba(239, 68, 68, 0.2)'}`,
                                  color: scoreB === 5 ? '#ffffff' : '#f87171',
                                  fontSize: '14px',
                                  fontWeight: '900',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease',
                                }}
                                className="outdoor-score-btn-lose"
                                onClick={() => {
                                  setScoreB(5);
                                  setScoreA(15);
                                }}
                              >
                                ❌ LOSE
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Submit Score Button */}
                        <button style={S.submitScoreBtn} className="outdoor-submit-score-btn" onClick={handleRefereeScoreSubmit}>
                          <CheckCircle2 size={18} />
                          <span>Save & Submit Score</span>
                        </button>

                        {refSubmitSuccess && (
                          <div style={S.successText}>
                            <CheckCircle2 size={14} />
                            <span>Scores Published Successfully!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={S.emptyState}>
                    <p>No matchups available for game "{selectedGame || 'assigned game'}".</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Praise & Blessings Box */}
          {isBreak ? (
            <div style={getCardStyle()} className="outdoor-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Sparkles size={20} style={{ color: showOutdoorHC ? '#000000' : '#fbbf24' }} />
                <h3 style={S.sectionTitle}>Praise & Blessings Box</h3>
              </div>
              <div style={S.emptyState}>
                <p>Blessings are paused during breaks.</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Enjoy your rest! Check back once activities resume.</p>
              </div>
            </div>
          ) : (
            <BlessingBox
              currentUser={currentUser}
              activeEventCode={activeEventCode}
              campData={campData}
            />
          )}

          {/* Scrollable Announcements Feed */}
          <section style={getCardStyle({ flex: 1, display: 'flex', flexDirection: 'column' })} className="outdoor-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Bell size={18} style={{ color: 'var(--vbt-sky)' }} />
              <h3 style={S.sectionTitle}>Announcement Feed</h3>
            </div>

            <div style={S.feedScrollContainer}>
              {sortedAnnouncements.length > 0 ? (
                sortedAnnouncements.map((ann) => (
                  <div key={ann.id || Math.random()} style={S.feedItem}>
                    <div style={S.feedMeta}>
                      <span style={{
                        ...S.feedSender,
                        color: ann.senderRole === 'admin' ? '#fbbf24' : getSideColor(ann.senderRole || ann.sender)
                      }}>
                        {ann.sender}
                      </span>
                      <span style={S.feedTime}>{formatTime(ann.timestamp)}</span>
                    </div>
                    <p style={S.feedText}>{ann.text}</p>
                  </div>
                ))
              ) : (
                <div style={S.noAnnouncements}>
                  <p>No announcements posted yet.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Tab: Live Feed */}
      {activeTab === 'feed' && (
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '16px', background: 'rgba(13,20,38,0.4)', border: '1px solid var(--border-light)' }}>
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Loading Feed...</div>}>
            <TimelineFeedTab
              announcements={announcements}
              announcementText={propAnnouncementText}
              uploadImage={uploadImage}
              fileInputRef={fileInputRef}
              currentUser={currentUser}
              currentEventCode={activeEventCode}
              eventLabels={eventLabels}
              firebaseConnected={firebaseConnected}
              setShowFeedbackModal={setShowFeedbackModal}
              setAnnouncementText={propSetAnnouncementText}
              setUploadImage={setUploadImage}
            />
          </Suspense>
        </div>
      )}

      {/* Tab: Scores */}
      {activeTab === 'scores' && (
        <div className="glass-panel" style={{ padding: '12px', borderRadius: '16px', background: 'rgba(13,20,38,0.4)', border: '1px solid var(--border-light)' }}>
          <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Loading Scoreboard...</div>}>
            <ScoreboardTab
              eventConfig={eventConfig}
              scoreCalculations={standings}
              campData={campData}
              campState={campData?.campState}
              currentUser={currentUser}
              scoreViewMode={scoreViewMode}
              expandedBlocks={expandedBlocks}
              expandedGames={expandedGames}
              uniqueGames={uniqueGames}
              side1Name={side1Name}
              side2Name={side2Name}
              shakesPercentage={shakesPercentage}
              friesPercentage={friesPercentage}
              getTeamColorHex={getTeamColorHex}
              setScoreViewMode={setScoreViewMode}
              setExpandedBlocks={setExpandedBlocks}
              setExpandedGames={setExpandedGames}
              handleToggleWinner={handleToggleWinner}
              getEffectiveTimeShift={getEffectiveTimeShift}
              getShiftedTimeStr={getShiftedTimeStr}
              isTimeSlotActive={isTimeSlotActive}
            />
          </Suspense>
        </div>
      )}

      {/* Tab: Radio */}
      {activeTab === 'radio' && (
        (currentUser?.role === 'admin' || currentUser?.role === 'coordinator' || currentUser?.role === 'sports_head' || currentUser?.role === 'logistics_head') ? (
          <div className="glass-panel" style={{ padding: '4px', borderRadius: '16px', background: 'rgba(13,20,38,0.4)', border: '1px solid var(--border-light)' }}>
            <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>Connecting Radio...</div>}>
              <WalkieTalkie
                eventCode={activeEventCode}
                currentUser={currentUser}
              />
            </Suspense>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '36px 24px', borderRadius: '16px', background: 'rgba(13,20,38,0.4)', border: '1px solid var(--border-light)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Radio size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h3 style={{ fontFamily: 'var(--font-title)', color: '#ffffff', margin: '0 0 8px', fontSize: '17px' }}>
              Radio Channel Locked
            </h3>
            <p style={{ fontSize: '13px', lineHeight: '1.4', margin: 0 }}>
              The Walkie-Talkie voice channel is reserved for Service Coordinators and Logistics Heads to ensure clear coordination.
            </p>
          </div>
        )
      )}

      {/* View: Game Rules Booklet */}
      {activeTab === 'rules' && (
        <div>
          <button type="button" onClick={() => setActiveTab('actions')} style={S.backBtn}>
            <ArrowLeft size={16} />
            <span>Back to Actions</span>
          </button>
          <RulesBooklet campData={campData} />
        </div>
      )}

      {/* View: Emergency SOS */}
      {activeTab === 'sos' && (
        <div>
          <button type="button" onClick={() => setActiveTab('actions')} style={S.backBtn}>
            <ArrowLeft size={16} />
            <span>Back to Actions</span>
          </button>
          <EmergencySOS
            currentUser={currentUser}
            activeEventCode={activeEventCode}
            eventConfig={eventConfig}
            triggerRemotePushNotification={triggerRemotePushNotification}
          />
        </div>
      )}
      </div>

      {/* Bottom Navigation Bar */}
      {currentUser && (currentUser.role === 'admin' || currentUser.role === 'coordinator') && (
        <nav style={S.bottomNav}>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            style={S.navTab(activeTab === 'actions' || activeTab === 'rules' || activeTab === 'sos')}
          >
            <Compass size={18} />
            <span style={S.navLabel}>Actions</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            style={S.navTab(activeTab === 'feed')}
          >
            <Bell size={18} />
            <span style={S.navLabel}>Feed</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scores')}
            style={S.navTab(activeTab === 'scores')}
          >
            <Trophy size={18} />
            <span style={S.navLabel}>Scores</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('radio')}
            style={S.navTab(activeTab === 'radio')}
          >
            <Radio size={18} />
            <span style={S.navLabel}>Radio</span>
          </button>
        </nav>
      )}

      {/* ─── Point Deduction Popup Modal ─────────────────────── */}
      {showDeductModal && (
        <div style={S.modalOverlay}>
          <div style={S.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>Point Deduction</h3>
              <button style={S.closeModalBtn} onClick={() => setShowDeductModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Reporting deduction for sub-team: <strong style={{ color: '#ffffff' }}>{currentUser?.teamCode}</strong>
              </div>

              {/* Grid of Choices */}
              <div style={S.modalOptionsGrid}>
                {DEDUCTION_OPTIONS.map((opt, idx) => (
                  <button
                    key={idx}
                    style={S.modalOptionCard(selectedDeductIdx === idx)}
                    onClick={() => setSelectedDeductIdx(idx)}
                  >
                    <span style={S.modalOptionLabel}>{opt.label}</span>
                    {opt.points > 0 && <span style={S.modalOptionPts}>-{opt.points} pts</span>}
                  </button>
                ))}
              </div>

              {/* Custom Options Panel */}
              {DEDUCTION_OPTIONS[selectedDeductIdx].reason === 'Custom' && (
                <div style={S.customDeductInputs}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={S.inputLabel}>Points to Deduct</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={customPoints}
                      onChange={(e) => setCustomPoints(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      style={S.numberInput}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={S.inputLabel}>Reason / Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Broken rule, safety violation..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      style={S.textInput}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <button style={S.submitDeductBtn} onClick={handlePostDeductionSubmit}>
                <span>Submit Point Deduction</span>
              </button>

              {deductSuccessMsg && (
                <div style={S.successText}>
                  <CheckCircle2 size={14} />
                  <span>{deductSuccessMsg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ─── Flip Rules overlay Modal ──────────────────────── */}
      {flipRulesGame && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 20, 0.9)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={getCardStyle({
            width: '100%',
            maxWidth: '400px',
            maxHeight: '85vh',
            overflowY: 'auto',
            border: '1.5px solid rgba(41, 182, 246, 0.4)',
            padding: '24px',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          })} className="outdoor-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} style={{ color: 'var(--vbt-sky)' }} /> Game Rules
              </h3>
              <button
                onClick={() => setFlipRulesGame(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#29b6f6', margin: '0 0 6px 0' }}>
                {flipRulesGame.name}
              </h4>
              
              <div style={{ marginTop: '14px' }}>
                <h5 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>
                  HOW TO PLAY
                </h5>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                  {flipRulesGame.howToPlay || flipRulesGame.rules || "No instructions."}
                </p>
              </div>

              <div style={{ marginTop: '16px' }}>
                <h5 style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', textTransform: 'uppercase', margin: '0 0 4px 0' }}>
                  LESSON LEARNED
                </h5>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                  {flipRulesGame.lesson || "No lesson details."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Styles ────────────────────────────────────────────

