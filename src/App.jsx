import { useServiceTimer } from './utils/useServiceTimer';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Bell, 
  Settings, 
  Plus, 
  Minus, 
  LogOut, 
  MapPin, 
  Clock, 
  Lock, 
  Unlock,
  Send, 
  Check, 
  AlertCircle, 
  Filter, 
  TrendingDown,
  Info,
  Map as MapIcon,
  HelpCircle,
  Clock3,
  Camera,
  ThumbsUp,
  Flame,
  Award,
  BarChart3,
  BookOpen,
  Shield,
  Radio,
  Package,
  Navigation,
  MoreHorizontal
} from 'lucide-react';
import { 
  subscribeToCampState, 
  updateCampState, 
  subscribeToAnnouncements, 
  addAnnouncement,
  updateAnnouncementReactions,
  subscribeToScheduleData,
  subscribeToEventConfig,
  updateEventConfig,
  createEvent,
  checkEventExists,
  getEventRegistry,
  subscribeToServiceData,
  updateServiceData,
  submitServiceRequest,
  subscribeToServiceRequests,
  updateServiceRequestStatus,
  deleteServiceRequest,
  registerDevicePushToken,
  getServants,
  subscribeToServants,
  upsertServantOnLogin,
  subscribeToGames,
  upsertGame,
  deleteGame,
  subscribeToTimer,
  setTimerState,
  saveDebrief,
  getDebrief,
  submitFeedback,
  getFeedback,
  scheduleNotification,
  subscribeToScheduledNotifications,
  cancelScheduledNotification,
  updateServant,
  addServant,
  deleteServant,
  generateAndSaveServiceSchedule,
  subscribeToWebPush,
  NOTIFY_SERVICE_URL,
  updateScheduleData,
  updateScheduleMatchupTimes,
  auth,
  db
} from './firebase';
import { setupPushNotifications } from './push_service';
import initialStaticCampData from './data/camp_data.json';

// ─── NEW COMPONENT IMPORTS (Future Improvements) ────────────────────────────
import InteractiveMap from './components/InteractiveMap';
import './components/InteractiveMap.css';
import StandingsAnalytics from './components/StandingsAnalytics';
import './components/StandingsAnalytics.css';
import AlertBanner from './components/AlertBanner';
import { soundBoard, ttsAnnouncer, transitionAlerter } from './notifications';
import { canEditScore, canEditDeductions, canEditTokens, canPostAnnouncement, canEditConfig, canSendPing, canCreateAlert, canControlStopwatch, ROLES } from './permissions';
import RoleLogin from './components/RoleLogin';
import PhotoFeed from './components/PhotoFeed';
import DynamicConfigurator from './components/DynamicConfigurator';
import DumbDashboard from './components/DumbDashboard';
import { generateRoundRobin, calculateTimeSlots, validateSchedule } from './matchupEngine';
import { saveAsTemplate, loadTemplates, deleteTemplate, PRESET_TEMPLATES } from './templates';


// VBT Phase 3 Operations & Logistics Components
import LogisticsPanel from './components/LogisticsPanel';
import LogisticsTab from './components/LogisticsTab';
import FeedMessage from './components/FeedMessage';
import ScheduleExporter from './components/ScheduleExporter';
const WalkieTalkie = React.lazy(() => import('./components/WalkieTalkie'));
import GPSMap from './components/GPSMap';
import ScheduleBuilder from './components/ScheduleBuilder';
import OfflineBackupModal from './components/OfflineBackupModal';
import { playChime, unlockAudioContext, getSharedAudioContext } from './chimes';
import { triggerHaptic } from './utils/haptics';
import { subscribeToMapConfig, updateMapConfig } from './mapEngine';

// Extracted Tab Components
import MyTeamTab from './components/MyTeamTab';
const TimelineFeedTab = React.lazy(() => import('./components/TimelineFeedTab'));
const ScoreboardTab = React.lazy(() => import('./components/ScoreboardTab'));
import ScheduleTab from './components/ScheduleTab';
import SettingsTab from './components/SettingsTab';
import ServiceTab from './components/ServiceTab';

// Firebase Web Push VAPID key (Generate in Firebase Console -> Project Settings -> Cloud Messaging -> Web Push Certificates)
// Replace this placeholder with your actual key to connect browser push notifications.
const WEBPUSH_VAPID_KEY = "BBWNlIKCRTY40ybSED7bBc5AUlRT7IHvZ0EajhdPVnxDcuSnZ7_3I50nXF79S6QG8cRcqr3UCIVBcC-v4Yvc3RU"; 

// Default state when Firestore is empty
const defaultCampState = {
  blockScores: {}, // key: "blockIndex_roundIndex_gameName" -> "teamA" | "teamB" | "TIE" | "NA"
  teamDeductions: {}, // key: teamCode -> number
  tokens: {},
  timeShiftMinutes: 0,
  isTimerPaused: false,
  timerPausedAt: null,
  appsScriptWebappUrl: ''
};

// Default event config (Service Mode first)
const defaultEventConfig = {
  eventName: 'VBT Sports Camp',
  description: 'Live scoring, schedule & team management',
  eventDate: '',
  side1Name: 'Team A',
  side2Name: 'Team B',
  primaryColor: '#1441a1',
  logoUrl: '/Final VBT Re-Branding 2026-02 (3).png',
  passcodeCoordinator: 'VBTADMIN',
  passcodeGameLeader: 'VBTREF',
  passcodeTeamLeader: 'VBT2026',
  eventType: 'service'
};

// Map Location Key data
const locationKey = [
  { id: '1', name: 'Football Field', label: '1. Football Field', games: ['Big Mac', 'Cheesy Strings', 'Big Bucket 1', 'Big Bucket 2', 'Golden Snitch 1', 'Golden Snitch 2'] },
  { id: '2', name: 'Terrace', label: '2. Terrace', games: ['Scale', 'Lift'] },
  { id: '3', name: 'Court', label: '3. Court', games: ['Cone Memory', 'Puzzle', 'Balloon Darts 1', 'Balloon Darts 2'] },
  { id: '4', name: 'Pool', label: '4. Pool', games: ['Chubby Bunny', 'Bible Whispers'] },
  { id: '5', name: 'Roof', label: '5. Roof', games: ['Nadala+ 1', 'Nadala+ 2'] },
  { id: 'MH', name: 'Main Hall', label: 'MH. Main Hall', games: ['Talk', 'Talk 1', 'Talk 2'] }
];

// FAQs data
const faqsList = [
  {
    q: "How are points awarded for each game?",
    a: "Points are calculated per matchup/round:\n• Big Mac, Cheesy Strings, Big Bucket 1 & 2: 30 points for the winner.\n• Cone Memory, Scale, Chubby Bunny, Lift, Bible Whispers, Puzzle, Nadala+ 1 & 2, Balloon Darts 1 & 2, Golden Snitch 1 & 2: 15 points for the winner.\n• Ties award points to neither side or split depending on manual score sheet inputs."
  },
  {
    q: "How do point deductions work?",
    a: "Camp leaders can penalize sub-teams (e.g., R1.1, W2.1) for lateness, poor sportsmanship, or missing team gear. Each deduction point subtracts 1 point from that team's overall score."
  },
  {
    q: "How do tokens work?",
    a: "Tokens can be awarded to teams throughout the day. Each token is worth +2 points and is added directly to the team's Final Total."
  },
  {
    q: "What are the location numbers on the map?",
    a: "• 1: Football Field\n• 2: Terrace\n• 3: Court\n• 4: Pool\n• 5: Roof\n• MH: Main Hall"
  },
  {
    q: "Who is allowed to enter scores?",
    a: "Authorized personnel (Coordinators with passcode VBTADMIN, Game Leaders with VBTREF, and Team Leaders with VBT2026) can enter scores and deductions based on their role."
  }
];

// Bell chime functions — delegate to chimes.js (plays real WAV files with oscillator fallback)
function playBellChime() {
  playChime('announcement'); // → Chord2.wav from akx/Notifications (CC0)
}

function playLoudDoubleChime() {
  playChime('round_start'); // → Loud horn/siren sound (same as start/end rounds)
}

// Vibration helper — uses Capacitor Haptics for native iOS/Android feel
function vibrate(patternType) {
  try {
    triggerHaptic(patternType);
  } catch (_) {}
}

// Vibration patterns
const VIBRATE_URGENT       = 'heavy';  // urgent / ping
const VIBRATE_ANNOUNCEMENT = 'medium'; // regular announcement
const VIBRATE_NOTIFICATION = 'light';  // subtle feed item

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Show local notification
function showLocalNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: body,
        icon: '/Final VBT Re-Branding 2026-02 (3).png',
        badge: '/Final VBT Re-Branding 2026-02 (3).png',
        tag: 'vbt-alert',
        renotify: true
      });
    }).catch(() => {
      new Notification(title, {
        body: body,
        icon: '/Final VBT Re-Branding 2026-02 (3).png'
      });
    });
  } else {
    new Notification(title, {
      body: body,
      icon: '/Final VBT Re-Branding 2026-02 (3).png'
    });
  }
}

// Trigger remote push notifications for all registered devices
const triggerRemotePushNotification = async (title, body, targetUrl = '/') => {
  try {
    const res = await fetch(`${NOTIFY_SERVICE_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url: targetUrl })
    });
    if (!res.ok) console.error('Failed to send remote push:', res.status);
  } catch (err) {
    console.error('Error triggering remote push:', err);
  }
};

// ─── Localized Stopwatch & Timer Components to Optimize Render Performance ───
function MatchupStopwatch({ actualStart, actualEnd, scheduledMinutes }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (actualStart && !actualEnd) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [actualStart, actualEnd]);

  if (actualStart && !actualEnd) {
    const start = new Date(actualStart).getTime();
    const elapsed = Math.max(0, Math.floor((now - start) / 1000));
    const elapsedMins = Math.floor(elapsed / 60);
    const elapsedSecs = elapsed % 60;
    return (
      <span style={{ color: '#4ade80', fontWeight: '700', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={14} /> RUNNING: {elapsedMins}m {elapsedSecs < 10 ? '0' : ''}{elapsedSecs}s
      </span>
    );
  } else if (actualStart && actualEnd) {
    const start = new Date(actualStart).getTime();
    const end = new Date(actualEnd).getTime();
    const totalSecs = Math.max(0, Math.floor((end - start) / 1000));
    const totalMins = Math.floor(totalSecs / 60);
    const totalSecsPart = totalSecs % 60;
    return (
      <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={14} /> TOOK: {totalMins}m {totalSecsPart < 10 ? '0' : ''}{totalSecsPart}s
      </span>
    );
  }
  return <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Scheduled: {scheduledMinutes || 30}m</span>;
}

function MatchupRunningStopwatch({ actualStart }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(actualStart).getTime()) / 1000));
  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const elapsedSecs = elapsedSeconds % 60;
  const formattedSecs = elapsedSecs < 10 ? `0${elapsedSecs}` : elapsedSecs;
  return (
    <span style={{ 
      fontSize: '0.62rem', 
      color: '#fbbf24', 
      background: 'rgba(251, 191, 36, 0.15)', 
      padding: '1px 6px', 
      borderRadius: '4px', 
      fontWeight: '700',
      animation: 'pulse-glow 1.5s infinite',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: 'monospace'
    }}>
      <Clock size={14} /> RUNNING: {elapsedMins}:{formattedSecs}
    </span>
  );
}

function RotationTimerDisplay({ rotationTimer, setShowRotateNow, handleTimerPause, handleTimerResume, handleTimerReset }) {
  const [rotationSecondsLeft, setRotationSecondsLeft] = useState(null);

  useEffect(() => {
    if (!rotationTimer) { setRotationSecondsLeft(null); return; }
    const tick = () => {
      const { durationMin = 15, startedAt, isPaused, pausedAt, totalPausedMs = 0 } = rotationTimer;
      if (!startedAt) { setRotationSecondsLeft(null); return; }
      const sLeft = Math.max(0, durationMin * 60 - (isPaused ? (new Date(pausedAt) - new Date(startedAt) - totalPausedMs) / 1000 : (Date.now() - new Date(startedAt) - totalPausedMs) / 1000));
      setRotationSecondsLeft(Math.round(sLeft));
      if (sLeft <= 0 && !isPaused) setShowRotateNow(true);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [rotationTimer, setShowRotateNow]);

  if (!rotationTimer?.startedAt) return null;

  return (
    <div style={{
      display:'flex',alignItems:'center',gap:'8px',
    }}>
      <span style={{fontSize:'0.7rem',color:rotationSecondsLeft<=60?'#f87171':'#4ade80',fontFamily:'monospace',fontWeight:'800'}}>
        {rotationSecondsLeft!=null ? (Math.floor(rotationSecondsLeft/60)+':'+(rotationSecondsLeft%60<10?'0':'')+(rotationSecondsLeft%60)) : '--:--'}
      </span>
      {!rotationTimer.isPaused ? (
        <button onClick={handleTimerPause} title='Pause' style={{background:'none',border:'none',cursor:'pointer',color:'#fbbf24',fontSize:'0.9rem',padding:'2px'}}>&#9646;&#9646;</button>
      ) : (
        <button onClick={handleTimerResume} title='Resume' style={{background:'none',border:'none',cursor:'pointer',color:'#4ade80',fontSize:'0.9rem',padding:'2px'}}>&#9654;</button>
      )}
      <button onClick={handleTimerReset} title='Reset' style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:'0.8rem',padding:'2px'}}>&#8635;</button>
    </div>
  );
}

function ScheduleTimelineTrackerCard({ 
  campData, 
  eventConfig, 
  getEffectiveTimeShift, 
  getShiftedTimeStr, 
  getEventCurrentDay, 
  parseTimeToMs, 
  getEventTimeRange, 
  getActiveSlotProgress,
  activeSlot,
  getTeamColorHex
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const range = getEventTimeRange(now);
  if (!range) return null;
  
  const nowMs = now.getTime();
  const totalDuration = range.endMs - range.startMs;
  const currentProgress = Math.max(0, Math.min(100, ((nowMs - range.startMs) / totalDuration) * 100));
  
  const todaysMatchups = campData.matchups.filter(m => {
    const currentDay = getEventCurrentDay(now);
    const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
    return String(mDay) === String(currentDay);
  });
  
  const timeToMsMap = {};
  todaysMatchups.forEach(m => {
    const ms = parseTimeToMs(m.time, now);
    if (ms > 0) timeToMsMap[m.time] = ms;
  });
  
  const sortedTimeLabels = Object.keys(timeToMsMap).sort((a, b) => timeToMsMap[a] - timeToMsMap[b]);
  const shift = getEffectiveTimeShift(now) * 60 * 1000;
  const currentActiveSlot = getActiveSlotProgress(now);
  
  let statusText = "";
  let countdownText = "";
  let statusColor = "var(--vbt-sky)";
  
  if (nowMs < range.startMs) {
    statusText = "Service Starting Soon";
    statusColor = "#c4b5fd";
    const diff = range.startMs - nowMs;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    countdownText = `${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`;
  } else if (nowMs >= range.startMs && nowMs < range.endMs) {
    statusText = "Service is Live";
    statusColor = "#4ade80";
    const diff = range.endMs - nowMs;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    countdownText = `${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s left`;
  } else {
    statusText = "Service has Completed";
    statusColor = "var(--text-muted)";
    countdownText = "Finished";
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(20, 65, 161, 0.08) 0%, rgba(13, 20, 38, 0.6) 100%)', borderColor: nowMs >= range.startMs && nowMs < range.endMs ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: '700' }}>Event Status</span>
          <h3 style={{ fontSize: '1.05rem', color: '#ffffff', fontWeight: '800', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            {statusText}
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: '700' }}>Countdown</span>
          <p style={{ fontSize: '1.05rem', color: statusColor, fontWeight: '800', margin: '2px 0 0 0', fontFamily: 'monospace' }}>
            {countdownText}
          </p>
        </div>
      </div>
      
      <div style={{ position: 'relative', height: '24px', marginTop: '16px', marginBottom: '24px', padding: '0 10px' }}>
        <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          width: `calc(${currentProgress}% - 20px)`, 
          height: '4px', 
          background: 'var(--gradient-vbt)', 
          borderRadius: '2px',
          boxShadow: '0 0 8px var(--vbt-sky)',
          transition: 'width 0.5s ease-in-out'
        }} />
        
        {sortedTimeLabels.map((timeLabel, idx) => {
          const timeMs = timeToMsMap[timeLabel];
          const pct = ((timeMs + shift - range.startMs) / totalDuration) * 100;
          
          const match = todaysMatchups.find(m => m.time === timeLabel);
          let labelText = `R${idx + 1}`;
          if (match) {
            if (match.block === 2) labelText = "BG";
            else if (match.block === 3) labelText = "Ref";
          }
          
          const isPast = (timeMs + shift) <= nowMs;
          const isCurrent = activeSlot && activeSlot.timeStr === timeLabel;
          
          return (
            <div 
              key={timeLabel} 
              style={{ 
                position: 'absolute', 
                left: `${pct}%`, 
                transform: 'translateX(-50%)',
                top: '2px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'help'
              }}
              title={`${match ? match.game : ''} (${timeLabel})`}
            >
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                background: isCurrent ? '#4ade80' : isPast ? 'var(--vbt-sky)' : '#334155', 
                border: '2px solid var(--bg-surface)',
                boxShadow: isCurrent ? '0 0 10px #4ade80' : 'none',
                transition: 'all 0.3s ease'
              }} />
              <span style={{ 
                fontSize: '0.58rem', 
                color: isCurrent ? '#4ade80' : isPast ? '#ffffff' : 'var(--text-muted)', 
                fontWeight: isCurrent || isPast ? '800' : '500',
                marginTop: '4px' 
              }}>
                {labelText}
              </span>
            </div>
          );
        })}
      </div>

      {activeSlot && (
        <div style={{ 
          marginTop: '12px', 
          background: 'rgba(255,255,255,0.02)', 
          border: '1px solid rgba(255,255,255,0.05)', 
          padding: '12px', 
          borderRadius: '8px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ffffff' }}>
              ⚡ Active Round: <span style={{ color: 'var(--vbt-sky)' }}>{activeSlot.name}</span>
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {Math.floor(activeSlot.remaining / 60000)}m {Math.floor((activeSlot.remaining % 60000) / 1000)}s left
            </span>
          </div>
          
          <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
            <div style={{ 
              width: `${activeSlot.percent}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, var(--vbt-sky) 0%, #4ade80 100%)',
              borderRadius: '4px',
              transition: 'width 1s linear'
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderCountdownBadge({ 
  getEventTimeRange, 
  getEventCurrentDay, 
  parseTimeToMs, 
  getEffectiveTimeShift 
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const range = getEventTimeRange(now);
  if (!range) return null;
  
  const nowMs = now.getTime();
  if (nowMs < range.startMs) {
    const diff = range.startMs - nowMs;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return (
      <span style={{ 
        fontSize: '0.55rem', 
        background: 'rgba(167, 139, 250, 0.2)', 
        border: '1px solid rgba(167, 139, 250, 0.4)', 
        color: '#c4b5fd', 
        padding: '1px 4px', 
        borderRadius: '4px', 
        fontWeight: '700',
        animation: 'pulse-glow 2s infinite'
      }}>
        {mins}m {secs}s
      </span>
    );
  } else if (nowMs >= range.startMs && nowMs < range.endMs) {
    const diff = range.endMs - nowMs;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return (
      <span style={{ 
        fontSize: '0.55rem', 
        background: 'rgba(34, 197, 94, 0.2)', 
        border: '1px solid rgba(34, 197, 94, 0.4)', 
        color: '#4ade80', 
        padding: '1px 4px', 
        borderRadius: '4px', 
        fontWeight: '700'
      }}>
        {mins}m left
      </span>
    );
  }
  return null;
}

export default function App() {
  // ─── EVENT SELECTION STATE ────────────────────────────────────────────────
  const [currentEventCode, setCurrentEventCode] = useState(() => {
    return localStorage.getItem('vbt_current_event') || '';
  });
  const [eventConfig, setEventConfig] = useState(defaultEventConfig);
  const [globalServants, setGlobalServants] = useState([]);
  const [isPreloading, setIsPreloading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [eventJoinInput, setEventJoinInput] = useState('');
  const [eventJoinError, setEventJoinError] = useState('');
  const [eventJoinLoading, setEventJoinLoading] = useState(false);
  const [eventRegistry, setEventRegistry] = useState([]);

  // New event creation state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showManualJoin, setShowManualJoin] = useState(false);
  const [newEventCode, setNewEventCode] = useState('');
  const [newEventName, setNewEventName] = useState('');

  // Quick Join State
  const [showQuickJoinForm, setShowQuickJoinForm] = useState(false);
  const [quickJoinData, setQuickJoinData] = useState({ firstName: '', lastName: '', phone: '', code: '' });
  const [newEventSide1, setNewEventSide1] = useState('Team A');
  const [newEventSide2, setNewEventSide2] = useState('Team B');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPassCoord, setNewEventPassCoord] = useState('');
  const [newEventPassGame, setNewEventPassGame] = useState('');
  const [newEventPassTeam, setNewEventPassTeam] = useState('');
  const [createEventError, setCreateEventError] = useState('');
  const [createEventLoading, setCreateEventLoading] = useState(false);

  // Custom team names for new event
  const [newTeamRed, setNewTeamRed] = useState('Red');
  const [newTeamWhite, setNewTeamWhite] = useState('White');
  const [newTeamBlack, setNewTeamBlack] = useState('Black');
  const [newTeamBlue, setNewTeamBlue] = useState('Blue');

  // New event creation wizard states
  const [creationStep, setCreationStep] = useState(1);
  const [newEventType, setNewEventType] = useState('service');
  const [newKidCount, setNewKidCount] = useState(100);
  const [newDaysCount, setNewDaysCount] = useState(1);
  const [newServiceBrief, setNewServiceBrief] = useState('Friend Request — Jesus is knocking... Will you open the door? (Revelation 3:20)\n\nAn outreach service featuring water games, rotational teamwork challenges, and reflection.');
  const [newStations, setNewStations] = useState({
    station_1: {
      name: 'Commitment',
      location: 'Football Field',
      howToPlay: 'Objective: One team must move from Point A to Point B while staying connected by holding hands. The opposing team tries to break their bond using water balloons and obstacles. The first team to reach Point B without breaking wins!\n\nRules:\n1. The moving team must hold hands at all times.\n2. Opposing team can throw water balloons.\n3. Opposing team can stand or move to create obstacles.\n4. If the chain breaks, the team returns to Point A and starts over.\n5. First team to reach Point B with the bond intact wins!\n\nTips for Success:\n- Communicate and move together.\n- Stay strong and don\'t let anything break your bond.\n- Persevere – every try brings you closer to success!',
      lesson: 'A game of bond, unity, and perseverance. Stay strong and don\'t let anything break your bond.'
    },
    station_2: {
      name: 'Knock & Unlock',
      location: 'Terrace',
      howToPlay: 'Objective: To teach the importance of showing love, care, and kindness to others.\n\nSetup:\n- A large square is set up with a bucket at each corner.\n- Two teams stand on opposite corners.\n- Each team is assigned the bucket on the opposite corner.\n\nHow to Play:\n1. Teams use cups or sponges to carry water to the opposing team\'s bucket.\n2. The goal is NOT to fill your own bucket, but to fill the other team\'s bucket.\n3. The more water you pour into the opposing bucket, the more puzzle pieces you earn! (Full bucket = 5 pieces, Half = 3, Less = 1-2, Very little = 0).\n4. After collecting pieces, teams combine their puzzle pieces, work together to assemble the puzzle, and identify what the puzzle represents.\n5. The first team to correctly identify the key wins the game!',
      lesson: 'Revelation 3:20 - Jesus stands at the door and knocks. A key is needed to open a door. In this game, the key symbolizes opening our hearts to Jesus. The lesson is that the more love, care, and kindness we show to others, the closer we grow to Christ. Just as teams receive more puzzle pieces when they help fill someone else\'s bucket, we receive more joy, purpose, and connection with Jesus when we serve and care for those around us.\n\nMain Message: THE MORE WE GIVE, THE MORE WE RECEIVE.'
    },
    station_3: {
      name: 'Trust',
      location: 'Court',
      howToPlay: 'Objective: To teach trust and faith, even when we cannot see the full picture.\n\nHow the Game Works:\n1. One team member (the "Describer") gets a drawing. He can only see it.\n2. He describes the shape to his team using only geometric shapes (e.g., "Draw half a circle, then a small triangle beside it...").\n3. The rest of the team listens carefully and draws what they hear on a board/paper. They cannot ask questions.\n4. When they think they are done, they show their drawing! The goal is to match the original shape.\n\nGame Rules:\n- The describer may only use names of geometric shapes.\n- No telling or showing the answer.\n- No questions allowed from the team.\n- The team has one chance to draw the shape.\n- The closer the drawing matches the original, the more points earned!\n\nTips for Success:\n- Listen carefully.\n- Be clear and specific in describing.\n- Trust the describer.\n- Work together and encourage each other.',
      lesson: 'Faith and trust. Many times, God asks us to trust Him even when we do not understand what He is doing or where He is leading us. Just like the teams could only see a small part of the logo, we often only see a small part of God\'s plan. However, God sees the complete picture.\n\nMain Message: TRUST GOD, EVEN WHEN YOU CANNOT SEE THE WHOLE PICTURE.'
    },
    station_4: {
      name: 'Communication',
      location: 'Pool',
      howToPlay: 'Objective: To teach the importance of communication and listening to one another.\n\nSetup: Set up a course with several obstacles between Point A and Point B.\nGoal: Safely transfer the item (water) through the course and reach Point B as a team!\n\nHow it Works - Rounds:\n- Round 1: Hearing (Verbal) - Player is blindfolded. Can only follow verbal instructions from teammates. Focus: Listening and giving clear verbal directions.\n- Round 2: Touch (Non-verbal) - Player is blindfolded. Cannot hear. Can only be guided through touch by a teammate. Focus: Non-verbal communication and trusting touch.\n\nTips for Success:\n- Speak clearly and simply.\n- Listen carefully and patiently.\n- Encourage and support one another.\n- Trust your teammates and work together.',
      lesson: 'Listening and understanding. Communication is essential in every relationship, especially in our friendship with God. Just as the players needed to listen carefully and trust the guidance they received, we need to take time to listen to God\'s voice and communicate with Him through prayer. Good communication helps us stay connected, understand one another, and move in the right direction.\n\nMain Message: A STRONG FRIENDSHIP REQUIRES CLEAR COMMUNICATION AND LISTENING.'
    },
    big_game: {
      name: 'Loyalty (Big Game)',
      location: 'Football Field',
      howToPlay: 'Objective: Each team has a flag that represents their friendship with God. During a large water color battle, teams must protect their own flag while trying to mark the flags of other teams with their team color.\n\nHow to Play:\n1. Each team is given a flag and a team color (water color).\n2. Protect your own flag while trying to mark (splash) other teams\' flags with your color.\n3. Throughout the game, teams must choose to attack others or defend their own flag.\n4. The team whose flag remains the cleanest at the end wins!\n\nHow to Defend Your Flag - Options:\n- Option 1: Stay Loyal. Stay Close. Keep a loyal teammate with the flag and protect him at all costs! (Stick together, Protect your flag bearer, Don\'t let them get marked!)\n- Option 2: Secure the Zone. Place the flag inside the safe zone. Players can attack the flag only if they enter the zone! (Safe zone around the flag, Attack only if you enter the zone, Control the zone to your advantage)\n\nVictory Condition: The first team to successfully mark all other teams\' flags wins!\n\nTips for Success:\n- Communicate with your team.\n- Work together and trust one another.\n- Balance offense and defense.\n- Be willing to sacrifice for your team.',
      lesson: 'Commitment and loyalty. In the game, protecting the flag required sacrifice, teamwork, and commitment. Some players had to give up the chance to attack in order to defend something important. Our relationship with God is the same. Loyalty means choosing to protect and strengthen our friendship with Him, even when it takes effort, time, and sacrifice.\n\nMain Message: WHAT IS VALUABLE IS WORTH PROTECTING. Loyalty means staying committed, even when it requires sacrifice.'
    },
    reflection: {
      name: 'Reflection',
      location: 'Main Hall',
      howToPlay: 'Review Bible targets, discuss lessons from the games, and share reflection insights.',
      lesson: 'Open your heart to Jesus and live in unity, love, and loyalty. Reflection leader: Daniel El Masry.'
    }
  });
  const [wizardAttending, setWizardAttending] = useState([]);
  const [wizardRoles, setWizardRoles] = useState({});
  const [quickServantName, setQuickServantName] = useState('');
  const [quickServantPasscode, setQuickServantPasscode] = useState('');
  const [quickServantLoading, setQuickServantLoading] = useState(false);

  // Live edit config states for existing active Service Mode event
  const [editKidCount, setEditKidCount] = useState(100);
  const [editDaysCount, setEditDaysCount] = useState(1);
  const [editAttending, setEditAttending] = useState([]);
  const [editRoles, setEditRoles] = useState({});
  
  // Custom team names for active event
  const [editTeamRed, setEditTeamRed] = useState('Red');
  const [editTeamWhite, setEditTeamWhite] = useState('White');
  const [editTeamBlack, setEditTeamBlack] = useState('Black');
  const [editTeamBlue, setEditTeamBlue] = useState('Blue');

  const [editStations, setEditStations] = useState({
    station_1: { name: '', location: '', howToPlay: '', lesson: '' },
    station_2: { name: '', location: '', howToPlay: '', lesson: '' },
    station_3: { name: '', location: '', howToPlay: '', lesson: '' },
    station_4: { name: '', location: '', howToPlay: '', lesson: '' }
  });
  const [editBigGameName, setEditBigGameName] = useState('');
  const [editBigGameLocation, setEditBigGameLocation] = useState('');
  const [editBigGameHowToPlay, setEditBigGameHowToPlay] = useState('');
  const [editBigGameLesson, setEditBigGameLesson] = useState('');
  const [editReflectionName, setEditReflectionName] = useState('Reflection');
  const [editReflectionLocation, setEditReflectionLocation] = useState('Main Hall');
  const [editDefaultMatchupSortMode, setEditDefaultMatchupSortMode] = useState('block');

  // Event setup edit state (for existing event)
  const [editEventConfig, setEditEventConfig] = useState(null);
  const [savingEventConfig, setSavingEventConfig] = useState(false);

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── DYNAMIC SIDE NAME HELPERS ────────────────────────────────────────────
  const side1Name = eventConfig.side1Name || 'Team A';
  const side2Name = eventConfig.side2Name || 'Team B';
  const daysCount = eventConfig.daysCount || (eventConfig.eventType === 'camp' ? 2 : 1);

  const getTeamColorHex = (teamCode) => {
    if (!teamCode) return '#ffffff';
    const team = campData?.teams?.[teamCode];
    const side = team ? team.side : teamCode;
    if (side.startsWith('Red') || side === 'Red') return '#ef4444';
    if (side.startsWith('White') || side === 'White') return '#ffffff';
    if (side.startsWith('Black') || side === 'Black') return '#94a3b8';
    if (side.startsWith('Blue') || side === 'Blue') return '#29b6f6';
    return '#ffffff';
  };

  // ─── CAMP DATA (SCHEDULE) ─────────────────────────────────────────────────
  // Dynamic Camp Schedule/Matchup data from Firestore or local fallback
  const [campData, setCampData] = useState(() => {
    if (!currentEventCode) return initialStaticCampData;
    const local = localStorage.getItem(`vbt_schedule_${currentEventCode}`);
    return local ? JSON.parse(local) : initialStaticCampData;
  });

  // Memoized lists dependent on the dynamic schedule data
  // Dynamic leader roster — built from eventConfig.leaderRoster (set by coordinator per service)
  const leadersList = useMemo(() => {
    const roster = eventConfig?.leaderRoster || [];
    return roster.map((entry, idx) => ({
      code: entry.id || `leader_${idx}`,
      fullName: entry.name,
      groupLabel: entry.groupLabel || '',
    }));
  }, [eventConfig]);

  const uniqueGames = useMemo(() => {
    return Array.from(new Set(
      campData.matchups
        .map(m => m.game)
        .filter(g => g && g.toUpperCase() !== 'SPLIT' && g.toUpperCase() !== 'TALK' && g.toUpperCase() !== 'END OF BLOCK')
    )).sort();
  }, [campData]);

  // Google Sheet manual sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncError, setSyncError] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const evCode = localStorage.getItem('vbt_current_event');
    if (!evCode) return null;
    const saved = localStorage.getItem(`vbt_user_${evCode}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [loginRole, setLoginRole] = useState('leader'); // 'leader' | 'admin' | 'referee'
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginUseSimpleLayout, setLoginUseSimpleLayout] = useState(false);

  // Refs for tracking initial load to prevent playing sounds for historical data
  const loadTime = useRef(Date.now());
  const prevAnnouncementsLength = useRef(0);

  // Camp State (Scores, Deductions, Tokens)
  const [campState, setCampState] = useState(defaultCampState);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [appsScriptWebappUrl, setAppsScriptWebappUrl] = useState(() => {
    const evCode = localStorage.getItem('vbt_current_event');
    return evCode ? (localStorage.getItem(`vbt_apps_url_${evCode}`) || '') : '';
  });

  // PWA & Onboarding UI State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (currentEventCode) {
      localStorage.setItem(`vbt_apps_url_${currentEventCode}`, appsScriptWebappUrl);
    }
  }, [appsScriptWebappUrl, currentEventCode]);

  // URL check for QR Check-in logic
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const urlEvent = searchParams.get('event');
    const urlCheckin = searchParams.get('checkin');

    if (urlEvent && urlCheckin === '1') {
      const code = urlEvent.toUpperCase();
      setCurrentEventCode(code);
      localStorage.setItem('vbt_current_event', code);
      // Clean up the URL so it doesn't run again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);

      const isAndroid = /android/i.test(navigator.userAgent || navigator.vendor || window.opera);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

      if ((isAndroid || isIOS) && !isStandalone) {
        setShowInstallPrompt(true);
      } else {
        setShowOnboarding(true);
      }
      
      const savedUserStr = localStorage.getItem(`vbt_user_${code}`);
      if (savedUserStr) {
        try {
          const userObj = JSON.parse(savedUserStr);
          setCurrentUser(userObj);
          if (!isOfflineMode) {
            addAnnouncement(code, `${userObj.name} checked in via QR`, 'System', 'system').catch(() => {});
          }
        } catch (e) {
          console.error("Error parsing saved user:", e);
        }
      } else {
        // Show quick join form to collect name/phone
        setQuickJoinData(prev => ({ ...prev, code }));
        setShowQuickJoinForm(true);
      }
    }
  }, []);

  const handleQuickJoinSubmit = async () => {
    const { firstName, lastName, phone, code } = quickJoinData;
    if (!firstName || !lastName || !phone) {
      alert("Please fill out all fields.");
      return;
    }
    const name = `${firstName.trim()} ${lastName.trim()}`;
    const newServant = {
      id: `s_${Date.now()}`,
      name,
      phone: phone.trim(),
      role: 'volunteer',
      defaultRole: 'volunteer',
      isVolunteer: true
    };
    
    try {
      await addServant(newServant);
      setGlobalServants(prev => [...prev, newServant]);
      
      await signInAnonymously(auth);
      const user = {
        name,
        role: ROLES.VOLUNTEER,
        passcode: '',
        assignedGames: [],
        assignedTeams: []
      };
      setCurrentUser(user);
      setShowQuickJoinForm(false);
      
      if (!isOfflineMode) {
        addAnnouncement(code, `${name} joined via QR as volunteer`, 'System', 'system').catch(() => {});
      }
    } catch (err) {
      console.error("Failed to join:", err);
      alert("Failed to join. Please try again.");
    }
  };

  // UI state
  const [currentTab, setCurrentTab] = useState('scoreboard');
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [infoSubTab, setInfoSubTab] = useState('map');
  const [settingsSubTab, setSettingsSubTab] = useState('config');
  const [auditLogFilter, setAuditLogFilter] = useState('All');

  // Refs for tracking state/data changes to trigger chimes
  const prevCampStateRef = useRef(null);
  const prevScheduleRef = useRef(null);
  const prevAnnouncementsRef = useRef(null);
  const [expandedBlocks, setExpandedBlocks] = useState({ 1: true, 2: false, 3: false, 4: false });
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [expandedFaqs, setExpandedFaqs] = useState({});
  const [scheduleTeamFilter, setScheduleTeamFilter] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('All');
  const [scheduleBlockFilter, setScheduleBlockFilter] = useState('All');
  const [scheduleDayFilter, setScheduleDayFilter] = useState('1');
  const [scheduleSortMode, setScheduleSortMode] = useState('block');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [lastSeenFeedTimestamp, setLastSeenFeedTimestamp] = useState(() => {
    return localStorage.getItem('vbt_last_seen_feed') || '';
  });
  const [showOnboardingTip, setShowOnboardingTip] = useState(() => {
    return localStorage.getItem('vbt_onboarded') !== 'true';
  });
  const [timeTick, setTimeTick] = useState(0);

  // ── Feature state ─────────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('vbt-theme') !== 'light');
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [rotationTimer, setRotationTimer] = useState(null);
  const [showRotateNow, setShowRotateNow] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueLen, setOfflineQueueLen] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [debriefData, setDebriefData] = useState({ kidsCount: '', highlights: '', challenges: '', notes: '' });
  const [debriefSaved, setDebriefSaved] = useState(false);
  const [debriefError, setDebriefError] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [showServantDirectoryModal, setShowServantDirectoryModal] = useState(false);
  const [showGamesLibraryModal, setShowGamesLibraryModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [servantDirectorySearch, setServantDirectorySearch] = useState('');
  const [gamesLibrarySearch, setGamesLibrarySearch] = useState('');
  const [gamesLibraryFilter, setGamesLibraryFilter] = useState('all');
  const [expandedServant, setExpandedServant] = useState(null);
  const [expandedGame, setExpandedGame] = useState(null);
  const [timerDurationMin, setTimerDurationMin] = useState(15);
  const lastScoreSnapshot = React.useRef(null);
  const [showUndoScore, setShowUndoScore] = useState(false);
  const undoTimerRef = React.useRef(null);
  const [pickGameTarget, setPickGameTarget] = useState(null);
  const [showNotifScheduler, setShowNotifScheduler] = useState(false);
  const [notifScheduleForm, setNotifScheduleForm] = useState({ title: '', body: '', sendAt: '' });
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [isWhereIsEveryoneCollapsed, setIsWhereIsEveryoneCollapsed] = useState(true);
  const [rosterSearch, setRosterSearch] = useState('');
  const [isRosterCollapsed, setIsRosterCollapsed] = useState(true);
  const [refereeSelectedGame, setRefereeSelectedGame] = useState(() => localStorage.getItem('vbt_ref_selected_game') || '');
  const [uploadImage, setUploadImage] = useState(null);
  const [mapConfig, setMapConfig] = useState(null);

  // ─── SERVICE MODE STATE ───────────────────────────────────────────────
  // Live service data from Firestore (brief + groups + games)
  const [serviceData, setServiceData] = useState({ serviceBrief: '', groups: [], games: [] });
  // Edit drafts (only used by Coordinator)
  const [editServiceBrief, setEditServiceBrief] = useState('');
  const [editGroups, setEditGroups] = useState([]);
  const [editGames, setEditGames] = useState([]);
  const [serviceEditMode, setServiceEditMode] = useState(false);

  // Service Requests States
  const [serviceRequests, setServiceRequests] = useState([]);
  const [showServiceRequestModal, setShowServiceRequestModal] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [serviceRequestStep, setServiceRequestStep] = useState(1);

  // Service Request Form State (16 fields)
  const [serviceRequestForm, setServiceRequestForm] = useState({
    serviceLocation: '',
    serviceDate: '',
    serviceStartTime: '',
    serviceEndTime: '',
    serviceTopic: '',
    targetGender: 'Mix', // 'Girls' | 'Boys' | 'Mix'
    targetAgeGrade: '',
    participantsCount: '',
    alreadySplitTeams: 'no', // 'yes' | 'no'
    teamsCount: '',
    needSpecificServantsCount: 'no', // 'yes' | 'no'
    servantsCount: '',
    servantsAvailableHelping: 'yes', // 'yes' | 'no'
    contactName: '',
    contactNumber: '',
    churchName: ''
  });

  // Coordinator management subtab inside settings
  const [settingsRequestFilter, setSettingsRequestFilter] = useState('All'); // 'All' | 'pending' | 'approved' | 'rejected'
  const [settingsRequestSearch, setSettingsRequestSearch] = useState('');
  const [expandedRequests, setExpandedRequests] = useState({});
  const [savingService, setSavingService] = useState(false);
  const [expandedServiceGame, setExpandedServiceGame] = useState({});

  // ─── LEADER ROSTER STATE (coordinator setup dashboard) ────────────────
  // editRoster: [{id, name, groupLabel}] — typed in by coordinator, saved to eventConfig.leaderRoster
  const [editRoster, setEditRoster] = useState([]);
  const [rosterEditMode, setRosterEditMode] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);

  // --- FALLBACK TRACKER FOR OFFLINE MODE ---
  const fallbackSchedule = useMemo(() => {
    if (!campData || !campData.matchups) return [];
    const today = new Date();
    const datePrefix = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()} `;
    
    const uniqueTimes = [];
    campData.matchups.forEach(m => {
      if (!uniqueTimes.find(t => t.time === m.time)) {
        uniqueTimes.push(m);
      }
    });

    return uniqueTimes.map((m, i) => {
      const startTime = new Date(datePrefix + m.time).getTime();
      return {
        round_number: i + 1,
        start_time: startTime,
        duration_mins: m.duration || timerDurationMin
      };
    });
  }, [campData, timerDurationMin]);

  const { currentRoundIndex, timeRemainingSecs, isStaticFallbackMode } = useServiceTimer(fallbackSchedule, !isOnline);
  // -----------------------------------------


  // Sync live updates (scores, tokens, deductions) back to the Google Sheet
  const syncToGoogleSheet = async (updateData) => {
    // Writeback to sheet disabled temporarily to prevent accidental sheet modifications
    const ENABLE_SHEET_WRITEBACK = false;
    if (!ENABLE_SHEET_WRITEBACK) {
      console.log("[Sheet Sync] Writeback is disabled. Skipping spreadsheet update:", updateData);
      return;
    }

    const targetUrl = appsScriptWebappUrl || campState.appsScriptWebappUrl;
    if (!targetUrl) return;

    // Capitalize score values to satisfy Google Sheets strict data validation
    const normalizedData = { ...updateData };
    if (normalizedData.blockScores) {
      const normalizedBlockScores = {};
      for (const key in normalizedData.blockScores) {
        const val = normalizedData.blockScores[key];
        if (val === 'teamA' || val === 'shakes') normalizedBlockScores[key] = side1Name;
        else if (val === 'teamB' || val === 'fries') normalizedBlockScores[key] = side2Name;
        else if (val === 'tie' || val === 'TIE') normalizedBlockScores[key] = 'Tie';
        else normalizedBlockScores[key] = 'NA';
      }
      normalizedData.blockScores = normalizedBlockScores;
    }

    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_scores',
          ...normalizedData
        })
      });
      console.log("[Sheet Sync] Sent update to Google Sheets Web App:", normalizedData);
    } catch (err) {
      console.error("[Sheet Sync] Error syncing to Google Sheets:", err);
    }
  };
  const [activePingAlert, setActivePingAlert] = useState({ show: false, text: '' });
  const [urgentAlert, setUrgentAlert] = useState({ show: false, text: '', type: 'urgent', timestamp: '' });
  const [statsSubTab, setStatsSubTab] = useState('charts');
  const [scoreViewMode, setScoreViewMode] = useState('block'); // 'block' | 'game'
  const [expandedGames, setExpandedGames] = useState({});
  const fileInputRef = useRef(null);

  const getEffectiveTimeShift = (now = new Date()) => {
    const { timeShiftMinutes = 0, isTimerPaused = false, timerPausedAt = null } = campState;
    if (isTimerPaused && timerPausedAt) {
      const pausedTime = new Date(timerPausedAt).getTime();
      const elapsedMs = Math.max(0, now.getTime() - pausedTime);
      const elapsedMins = Math.floor(elapsedMs / (60 * 1000));
      return timeShiftMinutes + elapsedMins;
    }
    return timeShiftMinutes;
  };

  const getShiftedTimeStr = (timeStr, shiftMinutes) => {
    if (!timeStr) return '';
    try {
      const timePart = timeStr.trim();
      const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return timeStr;
      
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const isPM = match[3].toUpperCase() === 'PM';
      
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      
      const date = new Date();
      date.setHours(hours, minutes + shiftMinutes, 0, 0);
      
      let newHours = date.getHours();
      const newMinutes = date.getMinutes();
      const ampm = newHours >= 12 ? 'PM' : 'AM';
      
      newHours = newHours % 12;
      newHours = newHours ? newHours : 12;
      const minStr = newMinutes < 10 ? '0' + newMinutes : newMinutes;
      
      return `${newHours}:${minStr} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const getEventCurrentDay = (now = new Date()) => {
    if (eventConfig && eventConfig.activeDayOverride) {
      return parseInt(eventConfig.activeDayOverride, 10) || 1;
    }
    if (!eventConfig || !eventConfig.eventDate) return 1;
    try {
      const start = new Date(eventConfig.eventDate);
      if (isNaN(start.getTime())) return 1;
      const today = new Date(now);
      start.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays < 1) return 1;
      const daysCount = eventConfig.daysCount || (eventConfig.eventType === 'camp' ? 2 : 1);
      if (diffDays > daysCount) return daysCount;
      return diffDays;
    } catch (e) {
      return 1;
    }
  };

  const isTimeSlotActive = (timeStr, blockName, matchupDay, now = new Date()) => {
    try {
      let timePart = timeStr.trim();
      const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return false;
      
      if (matchupDay) {
        const currentDay = getEventCurrentDay(now);
        if (matchupDay !== currentDay) return false;
      }
      
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const isPM = match[3].toUpperCase() === 'PM';
      
      const eventTime = new Date();
      eventTime.setHours(isPM ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours));
      eventTime.setMinutes(minutes);
      eventTime.setSeconds(0);

      const shift = getEffectiveTimeShift(now);
      const shiftedEventTime = new Date(eventTime.getTime() + shift * 60 * 1000);

      const durationMs = (eventConfig.roundDurationMinutes || 30) * 60 * 1000;
      const diff = now.getTime() - shiftedEventTime.getTime();

      return diff >= 0 && diff < durationMs;
    } catch (e) {
      return false;
    }
  };

  const parseTimeToMs = (timeStr, now = new Date()) => {
    try {
      const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const isPM = match[3].toUpperCase() === 'PM';
      
      const date = new Date(now);
      date.setHours(isPM ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours));
      date.setMinutes(minutes);
      date.setSeconds(0);
      date.setMilliseconds(0);
      return date.getTime();
    } catch (e) {
      return 0;
    }
  };

  const getEventTimeRange = (now = new Date()) => {
    if (!campData.matchups || campData.matchups.length === 0) return null;
    const currentDay = getEventCurrentDay(now);
    const todaysMatchups = campData.matchups.filter(m => {
      const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
      return String(mDay) === String(currentDay);
    });
    
    if (todaysMatchups.length === 0) return null;
    
    let earliest = Infinity;
    let latest = -Infinity;
    
    todaysMatchups.forEach(m => {
      const ms = parseTimeToMs(m.time, now);
      if (ms > 0) {
        if (ms < earliest) earliest = ms;
        if (ms > latest) latest = ms;
      }
    });
    
    if (earliest === Infinity || latest === -Infinity) return null;
    
    const shift = getEffectiveTimeShift(now) * 60 * 1000;
    const startMs = earliest + shift;
    const endMs = latest + shift + (30 * 60 * 1000);
    
    return { startMs, endMs };
  };

  const getActiveSlotProgress = (now = new Date()) => {
    if (!campData.matchups || campData.matchups.length === 0) return null;
    const currentDay = getEventCurrentDay(now);
    const todaysMatchups = campData.matchups.filter(m => {
      const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
      return String(mDay) === String(currentDay);
    });
    
    if (todaysMatchups.length === 0) return null;
    
    const timeToMsMap = {};
    todaysMatchups.forEach(m => {
      const ms = parseTimeToMs(m.time, now);
      if (ms > 0) {
        timeToMsMap[m.time] = ms;
      }
    });
    
    const uniqueTimes = Object.keys(timeToMsMap).sort((a, b) => timeToMsMap[a] - timeToMsMap[b]);
    const shift = getEffectiveTimeShift(now) * 60 * 1000;
    const nowMs = now.getTime();
    
    for (let i = 0; i < uniqueTimes.length; i++) {
      const timeStr = uniqueTimes[i];
      const startMs = timeToMsMap[timeStr] + shift;
      let endMs = 0;
      
      if (i < uniqueTimes.length - 1) {
        endMs = timeToMsMap[uniqueTimes[i + 1]] + shift;
      } else {
        endMs = startMs + (30 * 60 * 1000);
      }
      
      if (nowMs >= startMs && nowMs < endMs) {
        const sampleMatch = todaysMatchups.find(m => m.time === timeStr);
        let slotName = sampleMatch ? sampleMatch.game : "Round";
        if (sampleMatch) {
          if (sampleMatch.block === 1) {
            slotName = `Round ${sampleMatch.round}: Rotational Stations`;
          } else if (sampleMatch.block === 2) {
            slotName = `${sampleMatch.game}`;
          } else if (sampleMatch.block === 3) {
            slotName = `${sampleMatch.game}`;
          }
        }
        
        const totalDuration = endMs - startMs;
        const elapsed = nowMs - startMs;
        const remaining = endMs - nowMs;
        const percent = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
        
        return {
          name: slotName,
          startMs,
          endMs,
          timeStr,
          totalDuration,
          elapsed,
          remaining,
          percent
        };
      }
    }
    
    return null;
  };

  const liveLocationStatus = useMemo(() => {
    const activeMatchups = campData.matchups.filter(m => {
      const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
      return isTimeSlotActive(m.time, `Block ${m.block}`, mDay);
    });
    
    const effectiveLocationKey = eventConfig.locationKey || locationKey;
    
    return effectiveLocationKey.map(loc => {
      const active = activeMatchups.find(m => 
        m.location && (
          m.location.toLowerCase().includes(loc.name.toLowerCase()) || 
          loc.name.toLowerCase().includes(m.location.toLowerCase())
        )
      );
      
      return {
        ...loc,
        activeMatchup: active || null
      };
    });
  }, [campData, campState, timeTick, eventConfig]);

  // Watch for new announcements → play chime + vibrate + show notification
  useEffect(() => {
    if (announcements.length > 0) {
      const latest = announcements[0]; // ordered desc
      if (latest && latest.timestamp) {
        const itemTime = new Date(latest.timestamp).getTime();
        // Only fire for NEW items (posted after app loaded, and list grew)
        if (itemTime > loadTime.current + 2000 && announcements.length > prevAnnouncementsLength.current) {
          const type = latest.type || 'announcement';

          if (type === 'ping' || type === 'urgent') {
            // Urgent / ping — loud chime + strong vibration + banner
            playLoudDoubleChime();
            vibrate(VIBRATE_URGENT);
            setActivePingAlert({ show: true, text: latest.text });
            setTimeout(() => setActivePingAlert({ show: false, text: '' }), 6000);

          } else if (type === 'announcement' || type === 'round_start' || type === 'schedule') {
            // Important announcement — bell chime + medium vibration
            playChime(type === 'round_start' ? 'round_start' : type === 'schedule' ? 'schedule' : 'announcement');
            vibrate(VIBRATE_ANNOUNCEMENT);

          } else {
            // Regular feed item (photo, reaction, etc.) — soft chime + subtle vibration
            playBellChime();
            vibrate(VIBRATE_NOTIFICATION);
          }

          showLocalNotification(`VBT Alert: ${latest.sender}`, latest.text);
        }
      }
      prevAnnouncementsLength.current = announcements.length;
    }
  }, [announcements]);

  // Time tracker for Live indicators (ticks every 30 seconds to trigger schedule recalculations)
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(prev => prev + 1), 30000);

    // Mobile audio context & HTML5 audio autoplay unlocker
    // Uses the shared AudioContext from chimes.js to avoid creating duplicates
    const unlockAudio = () => {
      try {
        // Unlock the shared AudioContext (used by both chimes.js and playBellChime)
        unlockAudioContext();
        
        // Play a tiny silent buffer through the shared context to fully unlock on iOS Safari
        const ctx = getSharedAudioContext();
        if (ctx) {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        }
        
        // Also play a silent HTML5 Audio element to unlock native audio players
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        silentAudio.play().catch(() => {});
      } catch (e) {
        console.warn('[Audio] Failed to unlock AudioContext:', e);
      } finally {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      }
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      clearInterval(timer);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Smart auto-detection of current day on load
  useEffect(() => {
    if (campData && campData.matchups) {
      const hasActiveBlock4 = campData.matchups.some(m => {
        const mDay = m.day || (eventConfig.eventType === 'camp' ? (m.block === 4 ? 2 : 1) : 1);
        return m.block === 4 && isTimeSlotActive(m.time, `Block ${m.block}`, mDay);
      });
      if (hasActiveBlock4) {
        setScheduleDayFilter('2');
      }
    }
  }, [campData, eventConfig]);

  // Set up push notifications on first user gesture after login
  // iOS Safari PWA blocks both Notification.requestPermission() and pushManager.subscribe()
  // unless triggered from a direct user gesture (tap/click). This mirrors the audio unlock pattern.
  useEffect(() => {
    if (!currentUser) return;

    const trySubscribe = async () => {
      try {
        const uid  = currentUser.id || currentUser.uid || currentUser.name || 'user';
        const name = currentUser.name || 'Unknown';
        const role = currentUser.role || 'viewer';
        await subscribeToWebPush(uid, name, role);
        console.log('[Push] Subscribed successfully');
      } catch (err) {
        console.warn('[Push] Subscription failed:', err);
      }
    };

    // If permission is already granted, we can try to subscribe immediately.
    // However, iOS Safari might block it if not called from a user gesture.
    // So we try immediately, but we ALSO fall back to registering a one-time gesture listener
    // to ensure subscription succeeds on the first user interaction.
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      trySubscribe().catch(() => {});
    }

    const handleGesture = async () => {
      window.removeEventListener('click',      handleGesture);
      window.removeEventListener('touchstart', handleGesture);
      try {
        const permission = (typeof Notification !== 'undefined') 
          ? await Notification.requestPermission() 
          : 'default';
        if (permission !== 'granted') return;
        await trySubscribe();
        console.log('[Push] Subscribed via gesture handler');
      } catch (err) {
        console.warn('[Push] Gesture-based subscribe failed:', err);
      }
    };

    window.addEventListener('click',      handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });

    return () => {
      window.removeEventListener('click',      handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [currentUser]);

  // Auto-populate refereeSelectedGame for Service Mode referees based on their roleCode
  useEffect(() => {
    if (currentUser && currentUser.role === 'referee' && eventConfig.eventType === 'service' && currentUser.roleCode) {
      let autoGame = '';
      if (currentUser.roleCode.startsWith('station_')) {
        const key = currentUser.roleCode;
        if (eventConfig.stations?.[key]?.name) {
          autoGame = eventConfig.stations[key].name;
        }
      } else if (currentUser.roleCode.startsWith('big_game_')) {
        autoGame = eventConfig.bigGameName || 'Loyalty (Big Game)';
      } else if (currentUser.roleCode === 'reflection') {
        autoGame = eventConfig.reflectionName || 'Reflection';
      }
      if (autoGame && autoGame !== refereeSelectedGame) {
        setRefereeSelectedGame(autoGame);
        localStorage.setItem('vbt_ref_selected_game', autoGame);
      }
    }
  }, [currentUser, eventConfig, refereeSelectedGame]);

  // Listen for native push notifications in the foreground
  useEffect(() => {
    const handleNativePush = (e) => {
      const { title, body, data } = e.detail;
      console.log("[App] Native push event caught in foreground:", title, body);
      if (title && (title.toLowerCase().includes("sync") || title.toLowerCase().includes("round"))) {
        playLoudDoubleChime();
        setActivePingAlert({ show: true, text: body });
        setTimeout(() => setActivePingAlert({ show: false, text: '' }), 6000);
      } else {
        playBellChime();
      }
      showLocalNotification(title, body);
    };

    window.addEventListener('vbt-push-notification', handleNativePush);
    return () => window.removeEventListener('vbt-push-notification', handleNativePush);
  }, []);

  // Listen for urgent sound trigger from the service worker
  // When an urgent push arrives the SW broadcasts PLAY_URGENT_SOUND to all open clients
  useEffect(() => {
    const handleSwMessage = (event) => {
      if (event.data && event.data.type === 'PLAY_URGENT_SOUND') {
        playLoudDoubleChime();
        vibrate(VIBRATE_URGENT);
        console.log('[App] Urgent sound triggered by service worker push');
      }
    };
    navigator.serviceWorker && navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker && navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  // Set up online listener
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Offline Sync] Device back online.');
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Synchronize Block filter when Day changes
  useEffect(() => {
    if (scheduleDayFilter === '1' && scheduleBlockFilter === '4') {
      setScheduleBlockFilter('All');
    } else if (scheduleDayFilter === '2' && scheduleBlockFilter !== 'All' && scheduleBlockFilter !== '4') {
      setScheduleBlockFilter('All');
    }
  }, [scheduleDayFilter]);

  // Fetch event registry once on mount (to allow joining events)
  useEffect(() => {
    let active = true;
    const fetchRegistry = async () => {
      try {
        const list = await getEventRegistry();
        if (active) setEventRegistry(list);
      } catch (err) {
        console.error("Error fetching event registry:", err);
      }
    };
    fetchRegistry();
    return () => {
      active = false;
    };
  }, []);

  // Real-time servants directory
  useEffect(() => {
    const unsub = subscribeToServants(setGlobalServants);
    return unsub;
  }, []);

  // Games library subscription
  useEffect(() => {
    const unsub = subscribeToGames(setGamesLibrary);
    return unsub;
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('vbt-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Online/offline + SW message handler
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const onSWMsg = (e) => {
      if (e.data?.type === 'SYNC_DONE') setOfflineQueueLen(0);
      if (e.data?.type === 'SYNC_START') setOfflineQueueLen(e.data.count || 0);
    };
    navigator.serviceWorker?.addEventListener('message', onSWMsg);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      navigator.serviceWorker?.removeEventListener('message', onSWMsg);
    };
  }, []);

  // Rotation timer Firestore subscription
  useEffect(() => {
    if (!currentEventCode) return;
    const unsub = subscribeToTimer(currentEventCode, setRotationTimer);
    return unsub;
  }, [currentEventCode]);

  // Rotation timer countdown tick logic extracted to RotationTimerDisplay

  // Load debrief when modal opens
  useEffect(() => {
    if (showDebriefModal && currentEventCode) {
      getDebrief(currentEventCode).then(d => { if (d) setDebriefData(p => ({ ...p, ...d })); });
    }
  }, [showDebriefModal, currentEventCode]);

  // Preloader timer
  useEffect(() => {
    let timer = setInterval(() => {
      setPreloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsPreloading(false);
          }, 450);
          return 100;
        }
        return prev + 5;
      });
    }, 45);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to event config when an event is selected
  useEffect(() => {
    if (!currentEventCode) return;
    const unsub = subscribeToEventConfig(currentEventCode, (cfg) => {
      if (cfg) {
        setEventConfig({ ...defaultEventConfig, ...cfg });
        setEditEventConfig({ ...defaultEventConfig, ...cfg });
        
        // Auto-switch to schedule if in service mode and on camp-specific tabs
        if (cfg.eventType === 'service') {
          setCurrentTab(prev => {
            if (prev === 'scoreboard' || prev === 'myteam') {
              return 'schedule';
            }
            return prev;
          });
        }
      }
    });
    return () => unsub();
  }, [currentEventCode]);

  // Handle remote cache clear request
  useEffect(() => {
    if (eventConfig && eventConfig.clearCacheVersion) {
      let localVer = null;
      try {
        localVer = localStorage.getItem('vbt_clear_cache_version');
      } catch (err) {
        console.warn('[CacheClear] localStorage getItem failed:', err);
      }

      if (localVer === null) {
        // First-time user: no local version stored yet.
        // Silently record the current version so we don't reload them on first join.
        try {
          localStorage.setItem('vbt_clear_cache_version', String(eventConfig.clearCacheVersion));
        } catch (err) {
          console.warn('[CacheClear] Failed to write initial clearCacheVersion:', err);
        }
        return; // Do NOT reload — user is new to this event
      }

      if (localVer !== String(eventConfig.clearCacheVersion)) {
        console.log('[CacheClear] Mismatch detected. Local:', localVer, 'Remote:', eventConfig.clearCacheVersion);
        
        // Clear all caches
        if ('caches' in window) {
          caches.keys().then(names => {
            return Promise.all(names.map(name => caches.delete(name)));
          }).catch(err => console.error('[CacheClear] Failed to clear caches:', err));
        }

        // Unregister service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
              registration.unregister();
            }
          }).catch(err => console.error('[CacheClear] Failed to unregister SW:', err));
        }

        // Save new version to avoid infinite loop
        try {
          localStorage.setItem('vbt_clear_cache_version', String(eventConfig.clearCacheVersion));
        } catch (err) {
          console.warn('[CacheClear] Failed to write clearCacheVersion to localStorage:', err);
          // If we cannot write to localStorage, abort the reload to prevent infinite loops
          return;
        }

        // Reload the page forcing fresh fetch
        console.log('[CacheClear] Reloading page to apply updates...');
        setTimeout(() => {
          window.location.reload(true);
        }, 800);
      }
    }
  }, [eventConfig]);

  // Subscribe to Map Config
  useEffect(() => {
    if (!currentEventCode) return;
    const unsub = subscribeToMapConfig(currentEventCode, (cfg) => {
      setMapConfig(cfg);
    });
    return () => unsub();
  }, [currentEventCode]);

  // Subscribe to service data when an event is selected
  useEffect(() => {
    if (!currentEventCode) return;
    const unsub = subscribeToServiceData(currentEventCode, (data) => {
      if (data) {
        setServiceData({ serviceBrief: data.serviceBrief || '', groups: data.groups || [], games: data.games || [] });
        setEditServiceBrief(data.serviceBrief || '');
        setEditGroups(data.groups || []);
        setEditGames(data.games || []);
      }
    });
    return () => unsub();
  }, [currentEventCode]);

  // Subscribe to service requests (only if admin)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      setServiceRequests([]);
      return;
    }
    const unsub = subscribeToServiceRequests((requests) => {
      setServiceRequests(requests);
    });
    return () => unsub();
  }, [currentUser]);

  // Initialize wizard servants when modal opens
  useEffect(() => {
    if (showCreateEvent && globalServants.length > 0) {
      const allIds = globalServants.map(s => s.id);
      setWizardAttending(allIds);
      
      const defaultAssignments = {
        michel_ghobrial: "station_1",
        phelo: "station_2",
        emily_boshra: "station_3",
        john_kamal: "station_4",
        amberto: "big_game_1",
        daniel_el_masry: "reflection",
        kirollos_remon: "big_game_2",
        julina: "team_white_1",
        karen_oberoi: "team_white_2",
        sara_zaki: "team_black_1",
        michel_remon: "team_black_2",
        kiro_wagdy: "team_red_1",
        martina_rizk: "team_red_2",
        martina_sobhy: "team_blue_1",
        andrew: "team_blue_2",
        michael_mitry: "media"
      };
      
      const roles = {};
      globalServants.forEach(s => {
        roles[s.id] = defaultAssignments[s.id] || "volunteer";
      });
      setWizardRoles(roles);
      setCreationStep(1);
    }
  }, [showCreateEvent, globalServants]);

  // Live configurator state sync when active event config changes
  useEffect(() => {
    if (eventConfig) {
      if (eventConfig.eventType !== 'normal') {
        setEditKidCount(eventConfig.kidCount || 100);
        setEditDaysCount(eventConfig.daysCount || 1);
        setEditAttending(eventConfig.activeServants || []);
        setEditRoles(eventConfig.servantAssignments || {});
        const teamNames = eventConfig.teamNames || { red: 'Red', white: 'White', black: 'Black', blue: 'Blue' };
        setEditTeamRed(teamNames.red || 'Red');
        setEditTeamWhite(teamNames.white || 'White');
        setEditTeamBlack(teamNames.black || 'Black');
        setEditTeamBlue(teamNames.blue || 'Blue');
        setEditStations(eventConfig.stations || {
          station_1: { name: 'Commitment', location: 'Football Field', howToPlay: '', lesson: '' },
          station_2: { name: 'Knock & Unlock', location: 'Terrace', howToPlay: '', lesson: '' },
          station_3: { name: 'Trust', location: 'Court', howToPlay: '', lesson: '' },
          station_4: { name: 'Communication', location: 'Pool', howToPlay: '', lesson: '' }
        });
        setEditBigGameName(eventConfig.bigGameName || 'Loyalty (Big Game)');
        setEditBigGameLocation(eventConfig.bigGameLocation || 'Football Field');
        setEditBigGameHowToPlay(eventConfig.bigGameHowToPlay || '');
        setEditBigGameLesson(eventConfig.bigGameLesson || '');
        setEditReflectionName(eventConfig.reflectionName || 'Reflection');
        setEditReflectionLocation(eventConfig.reflectionLocation || 'Main Hall');
        const defaultSort = eventConfig.defaultMatchupSortMode || 'block';
        setEditDefaultMatchupSortMode(defaultSort);
        setScheduleSortMode(defaultSort);
      } else {
        setEditDaysCount(eventConfig.daysCount || 2);
      }
    }
  }, [eventConfig]);

  // Save service data to Firestore
  const handleSaveServiceData = async () => {
    if (!currentEventCode) return;
    setSavingService(true);
    try {
      await updateServiceData(currentEventCode, {
        serviceBrief: editServiceBrief,
        groups: editGroups,
        games: editGames
      });
      setServiceEditMode(false);
    } catch (err) {
      alert('Failed to save service data: ' + err.message);
    } finally {
      setSavingService(false);
    }
  };

  // Group helpers
  const handleAddGroup = () => setEditGroups(prev => [...prev, { leaderName: '', kidCount: '' }]);
  const handleRemoveGroup = (idx) => {
    const groupName = editGroups[idx]?.leaderName ? `Group led by ${editGroups[idx].leaderName}` : `this group`;
    if (!window.confirm(`Are you sure you want to remove ${groupName}?`)) return;
    setEditGroups(prev => prev.filter((_, i) => i !== idx));
  };
  const handleGroupChange = (idx, field, val) => setEditGroups(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));
  const totalKids = editGroups.reduce((sum, g) => sum + (parseInt(g.kidCount) || 0), 0);

  // Game helpers
  const handleAddGame = () => setEditGames(prev => [...prev, { name: '', howToPlay: '', lesson: '' }]);
  const handleRemoveGame = (idx) => {
    const gameName = editGames[idx]?.name ? `game "${editGames[idx].name}"` : `this game`;
    if (!window.confirm(`Are you sure you want to remove ${gameName}?`)) return;
    setEditGames(prev => prev.filter((_, i) => i !== idx));
  };
  const handleGameChange = (idx, field, val) => setEditGames(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));

  // ─── LEADER ROSTER helpers ────────────────────────────────────────────
  const handleOpenRosterEdit = () => {
    setEditRoster((eventConfig?.leaderRoster || []).map(e => ({ ...e })));
    setRosterEditMode(true);
  };
  const handleAddRosterEntry = () => setEditRoster(prev => [...prev, { id: `l_${Date.now()}`, name: '', groupLabel: '' }]);
  const handleRemoveRosterEntry = (idx) => {
    const entryName = editRoster[idx]?.name ? `roster entry "${editRoster[idx].name}"` : `this roster entry`;
    if (!window.confirm(`Are you sure you want to remove ${entryName}?`)) return;
    setEditRoster(prev => prev.filter((_, i) => i !== idx));
  };
  const handleRosterEntryChange = (idx, field, val) => setEditRoster(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  const handleSaveRoster = async () => {
    if (!currentEventCode) return;
    setSavingRoster(true);
    try {
      // Filter out blank entries before saving
      const cleaned = editRoster.filter(e => e.name.trim());
      await updateEventConfig(currentEventCode, { leaderRoster: cleaned });
      setRosterEditMode(false);
    } catch (err) {
      alert('Failed to save roster: ' + err.message);
    } finally {
      setSavingRoster(false);
    }
  };

  // Initialize and Sync state
  useEffect(() => {
    if (!currentEventCode) return;

    if (isOfflineMode) {
      setFirebaseConnected(false);
      const local = localStorage.getItem(`vbt_state_${currentEventCode}`);
      if (local) setCampState(JSON.parse(local));
      const localSchedule = localStorage.getItem(`vbt_schedule_${currentEventCode}`);
      if (localSchedule) setCampData(JSON.parse(localSchedule));
      return;
    }

    // Subscribe to Firestore for camp state
    const unsubscribeCamp = subscribeToCampState(currentEventCode, (data) => {
      if (data) {
        const normalized = {
          blockScores: data.blockScores || {},
          teamDeductions: data.teamDeductions || {},
          tokens: data.tokens || { shakes: 0, fries: 0 },
          timeShiftMinutes: data.timeShiftMinutes || 0,
          isTimerPaused: !!data.isTimerPaused,
          timerPausedAt: data.timerPausedAt || null,
          lastUpdatedAt: data.lastUpdatedAt || null,
          appsScriptWebappUrl: data.appsScriptWebappUrl || ''
        };

        // Chimes for live score/deduction/token updates
        if (prevCampStateRef.current) {
          const prev = prevCampStateRef.current;
          const tokensChanged = prev.tokens?.shakes !== normalized.tokens?.shakes || prev.tokens?.fries !== normalized.tokens?.fries;
          const blockScoresChanged = JSON.stringify(prev.blockScores) !== JSON.stringify(normalized.blockScores);
          const deductionsChanged = JSON.stringify(prev.teamDeductions) !== JSON.stringify(normalized.teamDeductions);
          
          if (tokensChanged || blockScoresChanged || deductionsChanged) {
            playChime('score');
          }
        }
        prevCampStateRef.current = normalized;

        setCampState(normalized);
        localStorage.setItem(`vbt_state_${currentEventCode}`, JSON.stringify(normalized));
        if (data.appsScriptWebappUrl) setAppsScriptWebappUrl(data.appsScriptWebappUrl);
      } else {
        setCampState(defaultCampState);
      }
      setFirebaseConnected(true);
    });

    // Subscribe to Firestore for schedule/matchup data
    const unsubscribeSchedule = subscribeToScheduleData(currentEventCode, (data) => {
      if (data) {
        // Chimes for live schedule matchups modifications
        if (prevScheduleRef.current) {
          const matchupsChanged = JSON.stringify(prevScheduleRef.current.matchups) !== JSON.stringify(data.matchups);
          if (matchupsChanged) {
            playChime('schedule');
          }
        }
        prevScheduleRef.current = data;

        setCampData(data);
        localStorage.setItem(`vbt_schedule_${currentEventCode}`, JSON.stringify(data));
      }
    });

    // Subscribe to announcements
    // NOTE: Chime playback is handled by the useEffect on [announcements] (line ~707)
    // Do NOT add chimes here — it causes double-chiming since both fire for the same event.
    const unsubscribeAnnouncements = subscribeToAnnouncements(currentEventCode, (list) => {
      prevAnnouncementsRef.current = list;
      setAnnouncements(list);
    });

    return () => {
      unsubscribeCamp();
      unsubscribeSchedule();
      unsubscribeAnnouncements();
    };
  }, [isOfflineMode, currentEventCode]);

  // Handle updates to camp state
  const handleUpdateCampState = async (updatedFields) => {
    const newState = { ...campState, ...updatedFields };
    setCampState(newState);
    if (currentEventCode) localStorage.setItem(`vbt_state_${currentEventCode}`, JSON.stringify(newState));

    if (firebaseConnected && !isOfflineMode && currentEventCode) {
      try {
        await updateCampState(currentEventCode, updatedFields);
      } catch (error) {
        console.error("Firebase update failed, falling back to local:", error);
      }
    }
  };

  // Google Sheets Synchronizer trigger
  const handleSyncGoogleSheet = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('Connecting to Google Sheet parser...');
    setSyncError(false);
    
    try {
      const res = await fetch('https://sync-vbt-sheet-75ez7bhuzq-ew.a.run.app', {
        method: 'POST'
      });
      
      if (!res.ok) {
        throw new Error(`Sync function returned HTTP status ${res.status}`);
      }
      
      const result = await res.json();
      if (result.status === 'success') {
        setSyncStatus(`Successfully imported ${result.matchups} matchups!`);
        playBellChime();
        setTimeout(() => setSyncStatus(''), 4000);
      } else {
        throw new Error(result.message || 'Unknown sync error');
      }
    } catch (err) {
      console.error("Manual sync failed:", err);
      setSyncError(true);
      setSyncStatus(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Login Handler — uses dynamic per-event passcodes from eventConfig
  const handleLogin = (userAttempt) => {
    const { role, name, passcode, assignedTeams, assignedGames } = userAttempt;
    const normalizedPasscode = (passcode || '').trim().toUpperCase();

    let resolvedRole = 'viewer';
    let teamCode = '';
    let side = 'System';
    let grade = 'All';

    if (role === ROLES.VOLUNTEER) {
      resolvedRole = 'volunteer';
    } else {
      if (role === ROLES.TEAM_LEADER) {
        resolvedRole = 'leader';
        teamCode = assignedTeams?.[0] || 'Unknown';
      } else if (role === ROLES.GAME_LEADER) {
        const gamePass = (eventConfig.passcodeGameLeader || 'VBT2026').toUpperCase();
        if (normalizedPasscode !== gamePass && normalizedPasscode !== 'VBT2026') {
          setLoginError('Incorrect Game Leader passcode.');
          return;
        }
        resolvedRole = 'referee';
        teamCode = 'REF';
      } else if (role === ROLES.SERVICE_LEADER) {
        const servicePass = (eventConfig.passcodeServiceLeader || 'VBT2026').toUpperCase();
        if (normalizedPasscode !== servicePass && normalizedPasscode !== 'VBT2026') {
          setLoginError('Incorrect Service Leader passcode.');
          return;
        }
        resolvedRole = 'service_day_leader';
        teamCode = 'SERVICE';
      } else if (role === ROLES.COORDINATOR) {
        const coordPass = (eventConfig.passcodeCoordinator || 'VBTADMIN').toUpperCase();
        if (normalizedPasscode !== coordPass) {
          setLoginError('Incorrect Coordinator passcode.');
          return;
        }
        resolvedRole = 'admin';
        teamCode = 'ADMIN';
      }
    }

    const user = {
      role: resolvedRole,
      name: name || (resolvedRole === 'admin' ? 'Coordinator' : 'Guest'),
      teamCode,
      side,
      grade,
      assignedTeams,
      assignedGames,
      uiMode: loginUseSimpleLayout ? 'dumb' : 'detailed'
    };
    
    setCurrentUser(user);
    if (currentEventCode) {
      localStorage.setItem(`vbt_user_${currentEventCode}`, JSON.stringify(user));
    }
    setLoginError('');
    setLoginPassword('');
    
    if (resolvedRole === 'admin' || resolvedRole === 'service_day_leader' || resolvedRole === 'referee') {
      setCurrentTab(eventConfig?.eventType === 'service' ? 'schedule' : 'scoreboard');
    } else if (resolvedRole === 'leader') {
      setCurrentTab(eventConfig?.eventType === 'service' ? 'schedule' : 'myteam');
      // Auto-filter schedule to show only this leader's team
      if (teamCode && teamCode !== 'Unknown') {
        setScheduleTeamFilter(teamCode);
      }
    } else {
      setCurrentTab(eventConfig?.eventType === 'service' ? 'schedule' : 'scoreboard');
    }
    
    if (!isOfflineMode) {
      addAnnouncement(currentEventCode, `${user.name} signed in`, 'System', 'system');
    }
  };

  const handleLogout = () => {
    if (currentUser && !isOfflineMode) {
      addAnnouncement(currentEventCode, `${currentUser.name} signed out`, 'System', 'system');
    }
    setCurrentUser(null);
    if (currentEventCode) localStorage.removeItem(`vbt_user_${currentEventCode}`);
  };

  const handleToggleUiMode = async () => {
    if (!currentUser) return;
    const currentMode = (currentUser.id && globalServants.find(s => s.id === currentUser.id)?.uiMode) || currentUser.uiMode || 'detailed';
    const newMode = currentMode === 'dumb' ? 'detailed' : 'dumb';
    const updatedUser = { ...currentUser, uiMode: newMode };
    setCurrentUser(updatedUser);
    if (currentEventCode) {
      localStorage.setItem(`vbt_user_${currentEventCode}`, JSON.stringify(updatedUser));
    }
    if (currentUser.id && !isOfflineMode) {
      try {
        await updateServant(currentUser.id, { uiMode: newMode });
      } catch (err) {
        console.error("Error updating uiMode in DB:", err);
      }
    }
  };

  // Leave Event — returns to event selection screen
  const handleLeaveEvent = () => {
    if (currentUser) handleLogout();
    setCurrentEventCode('');
    setEventConfig(defaultEventConfig);
    setCampState(defaultCampState);
    setCampData(initialStaticCampData);
    setFirebaseConnected(false);
    localStorage.removeItem('vbt_current_event');
  };

  // Join Event Handler — validates the code exists before accepting
  const handleJoinEvent = async (e) => {
    e.preventDefault();
    const code = eventJoinInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (!code) { setEventJoinError('Please enter an event code.'); return; }
    setEventJoinLoading('manual');
    setEventJoinError('');

    try {
      // Verify the event actually exists in Firestore before joining
      const exists = await checkEventExists(code);
      if (!exists) {
        setEventJoinError('Event not found. Double-check the code with your coordinator.');
        setEventJoinLoading(false);
        return;
      }
      // Event verified — safe to join
      setCurrentEventCode(code);
      localStorage.setItem('vbt_current_event', code);
    } catch (err) {
      setEventJoinError('Could not verify event. Check your connection and try again.');
    } finally {
      setEventJoinLoading(false);
      setEventJoinInput('');
    }
  };

  // Direct join by event code (used by Quick Join button — skips form dispatch)
  const handleQuickJoin = async (code) => {
    const normalised = code.trim().toLowerCase().replace(/\s+/g, '_');
    if (!normalised) return;
    setEventJoinLoading(code);
    setEventJoinError('');
    try {
      const exists = await checkEventExists(normalised);
      if (!exists) {
        setEventJoinError('Event not found. Double-check the code with your coordinator.');
        return;
      }
      setCurrentEventCode(normalised);
      localStorage.setItem('vbt_current_event', normalised);
    } catch (err) {
      setEventJoinError('Could not verify event. Check your connection and try again.');
    } finally {
      setEventJoinLoading(false);
    }
  };
  const handleNewStationChange = (key, field, value) => {
    setNewStations(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const performMagicAutoAssign = (attendingList, currentRoles, teamNamesObj) => {
    const updatedRoles = { ...currentRoles };
    
    // Find all roles that are already specifically assigned to attending servants
    const assignedRoles = new Set();
    attendingList.forEach(sId => {
      const role = currentRoles[sId];
      if (role && role !== 'volunteer' && role !== 'none') {
        assignedRoles.add(role);
      }
    });

    const stationRoles = ['station_1', 'station_2', 'station_3', 'station_4'].filter(r => !assignedRoles.has(r));
    const teamRoles = [
      'team_red_1', 'team_red_2',
      'team_white_1', 'team_white_2',
      'team_black_1', 'team_black_2',
      'team_blue_1', 'team_blue_2'
    ].filter(r => !assignedRoles.has(r));
    let bigGame1Available = !assignedRoles.has('big_game_1');
    let bigGame2Available = !assignedRoles.has('big_game_2');
    let reflectionAvailable = !assignedRoles.has('reflection');

    let stationIdx = 0;
    let teamIdx = 0;

    attendingList.forEach(sId => {
      const existingRole = currentRoles[sId];
      if (existingRole && existingRole !== 'volunteer' && existingRole !== 'none') {
        // Keep their existing role!
        updatedRoles[sId] = existingRole;
        return;
      }

      // Otherwise, assign to next available role
      if (stationIdx < stationRoles.length) {
        updatedRoles[sId] = stationRoles[stationIdx];
        stationIdx++;
      } else if (teamIdx < teamRoles.length) {
        updatedRoles[sId] = teamRoles[teamIdx];
        teamIdx++;
      } else if (bigGame1Available) {
        updatedRoles[sId] = 'big_game_1';
        bigGame1Available = false;
      } else if (bigGame2Available) {
        updatedRoles[sId] = 'big_game_2';
        bigGame2Available = false;
      } else if (reflectionAvailable) {
        updatedRoles[sId] = 'reflection';
        reflectionAvailable = false;
      } else {
        updatedRoles[sId] = 'volunteer';
      }
    });

    return updatedRoles;
  };

  const didTeamLeadersChange = (oldRoles, newRoles, oldAttending, newAttending) => {
    const getTeamLeaders = (roles, attending) => {
      return Object.entries(roles)
        .filter(([sId, role]) => attending.includes(sId) && role.startsWith('team_'))
        .map(([sId, role]) => `${sId}:${role}`)
        .sort()
        .join(',');
    };
    return getTeamLeaders(oldRoles, oldAttending) !== getTeamLeaders(newRoles, newAttending);
  };

  const handleAutoSaveRosterData = async (newAttending, newRoles) => {
    if (!currentEventCode || !eventConfig) return;
    try {
      const updatedConfig = {
        ...eventConfig,
        activeServants: newAttending,
        servantAssignments: newRoles,
        updatedAt: new Date().toISOString()
      };
      
      const leadersChanged = didTeamLeadersChange(
        eventConfig.servantAssignments || {},
        newRoles,
        eventConfig.activeServants || [],
        newAttending
      );
      
      if (leadersChanged && eventConfig.eventType === 'service') {
        // If team leaders changed, we must regenerate the schedule
        await generateAndSaveServiceSchedule(currentEventCode, updatedConfig, newAttending, globalServants);
      } else {
        // Otherwise, we just save the config
        await updateEventConfig(currentEventCode, updatedConfig);
      }
      
      // Update local state config so it matches
      setEventConfig(updatedConfig);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  const handleWizardAutoAssign = () => {
    const teamNamesObj = { red: newTeamRed, white: newTeamWhite, black: newTeamBlack, blue: newTeamBlue };
    const updated = performMagicAutoAssign(wizardAttending, wizardRoles, teamNamesObj);
    setWizardRoles(updated);
  };

  const handleLiveAutoAssign = async () => {
    const teamNamesObj = { red: editTeamRed, white: editTeamWhite, black: editTeamBlack, blue: editTeamBlue };
    const updated = performMagicAutoAssign(editAttending, editRoles, teamNamesObj);
    setEditRoles(updated);
    await handleAutoSaveRosterData(editAttending, updated);
  };

  const handleQuickAddServant = async (e) => {
    if (e) e.preventDefault();
    const nameTrimmed = quickServantName.trim();
    const passcodeTrimmed = quickServantPasscode.trim() || '1234';
    if (!nameTrimmed) {
      alert("Please enter a name for the new servant.");
      return;
    }
    setQuickServantLoading(true);
    try {
      const id = nameTrimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!id) {
        alert("Invalid name. Please use alphanumeric characters.");
        return;
      }
      
      const newServant = {
        id,
        name: nameTrimmed,
        passcode: passcodeTrimmed.toUpperCase(),
        defaultRole: 'volunteer',
        createdAt: new Date().toISOString()
      };
      
      await addServant(newServant);
      
      // Auto-mark as attending
      if (showCreateEvent) {
        setWizardAttending(prev => [...prev, id]);
        setWizardRoles(prev => ({ ...prev, [id]: 'volunteer' }));
      } else {
        const newAttending = [...editAttending, id];
        const newRoles = { ...editRoles, [id]: 'volunteer' };
        setEditAttending(newAttending);
        setEditRoles(newRoles);
        await handleAutoSaveRosterData(newAttending, newRoles);
      }
      
      setQuickServantName('');
      setQuickServantPasscode('');
      alert(`Successfully added ${nameTrimmed} to the servants directory!`);
    } catch (err) {
      alert("Failed to add servant: " + err.message);
    } finally {
      setQuickServantLoading(false);
    }
  };

  // Undo last score change
  const triggerUndoSnapshot = (prev) => {
    lastScoreSnapshot.current = prev;
    setShowUndoScore(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setShowUndoScore(false), 8000);
  };
  const handleUndoScore = async () => {
    if (!lastScoreSnapshot.current || !currentEventCode) return;
    try {
      await updateCampState(currentEventCode, lastScoreSnapshot.current);
      lastScoreSnapshot.current = null;
      setShowUndoScore(false);
    } catch (e) { console.error('Undo failed:', e); }
  };

  // Rotation timer controls
  const handleTimerStart = async () => {
    await setTimerState(currentEventCode, { durationMin: timerDurationMin, startedAt: new Date().toISOString(), isPaused: false, pausedAt: null, totalPausedMs: 0 });
    setShowRotateNow(false);
  };
  const handleTimerPause = async () => {
    if (!rotationTimer?.startedAt) return;
    await setTimerState(currentEventCode, { isPaused: true, pausedAt: new Date().toISOString() });
  };
  const handleTimerResume = async () => {
    if (!rotationTimer?.pausedAt) return;
    const extra = Date.now() - new Date(rotationTimer.pausedAt);
    await setTimerState(currentEventCode, { isPaused: false, pausedAt: null, totalPausedMs: (rotationTimer.totalPausedMs || 0) + extra });
  };
  const handleTimerReset = async () => {
    await setTimerState(currentEventCode, { startedAt: null, isPaused: false, pausedAt: null, totalPausedMs: 0 });
    setRotationSecondsLeft(null); setShowRotateNow(false);
  };

  // WhatsApp deep link
  const getWhatsAppLink = (servant, roleLabel) => {
    const eName = eventConfig?.eventName || 'the next service';
    const eDate = eventConfig?.eventDate || '';
    const msg = encodeURIComponent('Hey ' + servant.name + '! You are assigned to ' + roleLabel + ' for ' + eName + (eDate ? ' on ' + eDate : '') + '. Join at ' + window.location.origin + ' code: ' + currentEventCode);
    return 'https://wa.me/?text=' + msg;
  };

  // Feedback submit
  const handleSubmitFeedback = async () => {
    if (!feedbackRating) return;
    try {
      setFeedbackError('');
      await submitFeedback(currentEventCode, { rating: feedbackRating, comment: feedbackText });
      setFeedbackSubmitted(true);
      setTimeout(() => { setShowFeedbackModal(false); setFeedbackSubmitted(false); setFeedbackRating(0); setFeedbackText(''); }, 2000);
    } catch (e) { setFeedbackError('Failed to submit feedback'); }
  };

  // Debrief save
  const handleSaveDebrief = async () => {
    try {
      setDebriefError('');
      await saveDebrief(currentEventCode, { ...debriefData, eventName: eventConfig?.eventName, eventDate: eventConfig?.eventDate });
      setDebriefSaved(true); setTimeout(() => setDebriefSaved(false), 3000);
    } catch (e) { setDebriefError('Failed to save debrief'); }
  };

  // Auto-save games to global library
  const autoSaveGamesToLibrary = async (stationsObj, eCode, eName) => {
    if (!stationsObj) return;
    const types = [['station_1','station'],['station_2','station'],['station_3','station'],['station_4','station'],['big_game','big_game'],['reflection','reflection']];
    for (const [key, type] of types) {
      const s = stationsObj[key];
      if (!s?.name?.trim()) continue;
      const gId = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (gId) upsertGame(gId, { name: s.name, type, location: s.location || '', howToPlay: s.howToPlay || '', lesson: s.lesson || '', eventCode: eCode, eventName: eName }).catch(() => {});
    }
  };

  // Create New Event Handler
  const handleCreateEvent = async (e) => {
    if (e) e.preventDefault();
    const code = newEventCode.trim().toLowerCase().replace(/\s+/g, '_');
    if (!code) { setCreateEventError('Event code is required.'); return; }
    if (!newEventName.trim()) { setCreateEventError('Event name is required.'); return; }
    if (!newEventPassCoord.trim()) { setCreateEventError('Coordinator passcode is required.'); return; }
    
    setCreateEventLoading(true);
    setCreateEventError('');
    
    try {
      let finalEventType = newEventType;
      let finalDaysCount = parseInt(newDaysCount, 10) || (newEventType === 'service' ? 1 : 2);
      
      if (newEventType === 'service' && finalDaysCount > 1) {
        alert("⛪ Service Mode is only supported for 1-day events. Forcing 🏕️ Summer Camp Mode instead.");
        finalEventType = 'camp';
      }

      if (finalEventType === 'service') {
        const configData = {
          eventName: newEventName.trim(),
          description: newServiceBrief,
          eventDate: newEventDate || new Date().toISOString().split('T')[0],
          eventType: 'service',
          daysCount: finalDaysCount,
          kidCount: parseInt(newKidCount, 10) || 100,
          primaryColor: '#a78bfa',
          logoUrl: '/Final VBT Re-Branding 2026-02 (3).png',
          passcodeCoordinator: newEventPassCoord.trim().toUpperCase(),
          passcodeGameLeader: newEventPassGame.trim().toUpperCase() || 'GAMEREF',
          passcodeTeamLeader: newEventPassTeam.trim().toUpperCase() || 'LEADER',
          activeServants: wizardAttending,
          servantAssignments: wizardRoles,
          teamNames: {
            red: newTeamRed.trim() || 'Red',
            white: newTeamWhite.trim() || 'White',
            black: newTeamBlack.trim() || 'Black',
            blue: newTeamBlue.trim() || 'Blue'
          },
          stations: {
            station_1: { name: newStations.station_1.name, location: newStations.station_1.location, howToPlay: newStations.station_1.howToPlay, lesson: newStations.station_1.lesson },
            station_2: { name: newStations.station_2.name, location: newStations.station_2.location, howToPlay: newStations.station_2.howToPlay, lesson: newStations.station_2.lesson },
            station_3: { name: newStations.station_3.name, location: newStations.station_3.location, howToPlay: newStations.station_3.howToPlay, lesson: newStations.station_3.lesson },
            station_4: { name: newStations.station_4.name, location: newStations.station_4.location, howToPlay: newStations.station_4.howToPlay, lesson: newStations.station_4.lesson }
          },
          bigGameName: newStations.big_game.name,
          bigGameLocation: newStations.big_game.location,
          bigGameHowToPlay: newStations.big_game.howToPlay,
          bigGameLesson: newStations.big_game.lesson,
          reflectionName: newStations.reflection.name,
          reflectionLocation: newStations.reflection.location,
          reflectionHowToPlay: newStations.reflection.howToPlay,
          reflectionLesson: newStations.reflection.lesson
        };
        
        // Write event configuration and live scores structure
        await createEvent(code, configData);
        
        // Run scheduling engine
        await generateAndSaveServiceSchedule(code, configData, wizardAttending, globalServants);
        autoSaveGamesToLibrary(configData.stations, code, configData.eventName).catch(() => {});
      } else {
        // Camp Mode (Legacy)
        await createEvent(code, {
          eventName: newEventName.trim(),
          description: 'Camp Outreach',
          eventDate: newEventDate || new Date().toISOString().split('T')[0],
          eventType: 'camp',
          daysCount: finalDaysCount,
          side1Name: newEventSide1 || 'Team A',
          side2Name: newEventSide2 || 'Team B',
          primaryColor: '#1441a1',
          logoUrl: '/Final VBT Re-Branding 2026-02 (3).png',
          passcodeCoordinator: newEventPassCoord.trim().toUpperCase(),
          passcodeGameLeader: newEventPassGame.trim().toUpperCase() || 'GAMEREF',
          passcodeTeamLeader: newEventPassTeam.trim().toUpperCase() || 'LEADER'
        });
      }
      
      // Auto-join the newly created event
      setCurrentEventCode(code);
      localStorage.setItem('vbt_current_event', code);
      setShowCreateEvent(false);
      
      // Reset form states
      setNewEventCode(''); setNewEventName(''); setNewEventDate('');
      setNewEventSide1('Team A'); setNewEventSide2('Team B');
      setNewEventPassCoord(''); setNewEventPassGame(''); setNewEventPassTeam('');
    } catch (err) {
      setCreateEventError('Failed to create event: ' + err.message);
    } finally {
      setCreateEventLoading(false);
    }
  };

  // Save event config changes from Controls tab
  const handleSaveEventConfig = async () => {
    if (!editEventConfig || !currentEventCode) return;
    setSavingEventConfig(true);
    try {
      await updateEventConfig(currentEventCode, editEventConfig);
      setEventConfig({ ...defaultEventConfig, ...editEventConfig });
    } catch (err) {
      alert('Failed to save event config: ' + err.message);
    } finally {
      setSavingEventConfig(false);
    }
  };

  const seedJuly6Service = async () => {
    let targetEventCode = currentEventCode;

    try {
      if (!targetEventCode) {
        // Try to find the event in the registry
        const { doc, getDoc } = await import('firebase/firestore');
        const regRef = doc(db, 'vbt_event_registry', 'events');
        const regSnap = await getDoc(regRef);
        if (regSnap.exists()) {
          const list = regSnap.data().list || [];
          const ardEvent = list.find(e => e.name.toLowerCase().includes('ard'));
          if (ardEvent) {
            targetEventCode = ardEvent.code;
          }
        }
      }

      if (!targetEventCode) {
        alert("Could not find an event named 'ard el golf' or similar in the registry. Please open the event first.");
        return;
      }
      const newNames = [
        "Andrew", "Sherry", "Amberto", "Youstina", "Youssef", "Tony", "Seif", "Rougy", "Tony tafaya", "Sandra", "Kirollos", "Martina",
        "Dani", "Emily", "Maria", "Micho", "Nathalie", "Kiro", "Jessica", "John", "Cinderella", "Patrick", "Joice", "Karim", "Bassem", "Sara",
        "Michael Mitry", "System Admin", "Amy", "Michel Ghobrial"
      ];
      
      const servantAssignments = {};
      const activeServants = [];

      // Team 1 & 2 -> Red
      ['andrew', 'sherry'].forEach(id => servantAssignments[id] = 'team_red_1');
      ['amberto', 'youstina'].forEach(id => servantAssignments[id] = 'team_red_2');
      // Team 3 & 4 -> White
      ['youssef', 'tony'].forEach(id => servantAssignments[id] = 'team_white_1');
      ['seif', 'rougy'].forEach(id => servantAssignments[id] = 'team_white_2');
      // Team 5 & 6 -> Black
      ['tony_tafaya', 'sandra'].forEach(id => servantAssignments[id] = 'team_black_1');
      ['kirollos', 'martina'].forEach(id => servantAssignments[id] = 'team_black_2');

      ['dani', 'emily'].forEach(id => servantAssignments[id] = 'station_1');
      ['maria', 'micho'].forEach(id => servantAssignments[id] = 'station_2');
      ['nathalie', 'kiro'].forEach(id => servantAssignments[id] = 'station_3');
      ['karim', 'john', 'cinderella', 'patrick'].forEach(id => servantAssignments[id] = 'station_4');
      ['joice', 'jessica'].forEach(id => servantAssignments[id] = 'station_5');
      ['bassem', 'sara'].forEach(id => servantAssignments[id] = 'station_6');
      
      servantAssignments['michael_mitry'] = 'coordinator';
      servantAssignments['system_admin'] = 'coordinator';
      servantAssignments['amy'] = 'coordinator';
      servantAssignments['michel_ghobrial'] = 'service_day_leader';

      for (let name of newNames) {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const role = servantAssignments[id] || 'volunteer';
        await setDoc(doc(db, 'vbt_servants', id), { 
            id, 
            name, 
            passcode: '1234',
            role
        }, { merge: true });
        activeServants.push(id);
      }

      const evConfigUpdates = {
          eventType: 'service',
          roundDurationMinutes: 10,
          breakMinutes: 5,
          startTime: '20:00',
          passcodeServiceLeader: 'VBTADMIN',
          description: 'Date: Monday 6th July | Time: 8:00pm-9:30pm | Meet up: 6 at our church | Location: Ard el Golf | Children: 120 boys and girls (Grade 9-10) | Theme: Team Building and Trust | Notes: 6 Games / no big game / no opposing teams / each game groups play as one team | Wear our VBT Shirts',
          daysCount: 1,
          kidCount: 120,
          activeServants,
          servantAssignments,
          teamNames: {
              red: 'Teams 1 & 2',
              white: 'Teams 3 & 4',
              black: 'Teams 5 & 6',
              blue: 'Unused'
          },
          stations: {
              station_1: { name: 'Blind Builder', location: '', howToPlay: 'One player is blindfolded and given cups to build a pyramid by verbal instructions from teammates. Team with highest number of stacks wins.', lesson: '' },
              station_2: { name: 'Skee Ball', location: '', howToPlay: 'Each team member gets a try at throwing the ball and dropping it in the holes. Team with highest accumulated score wins.', lesson: '' },
              station_3: { name: 'Minefield', location: '', howToPlay: 'One player is blindfolded and crosses obstacles guided by team. At the end, places a cone in XO game. Most XO wins receives tokens.', lesson: '' },
              station_4: { name: 'Helium Stick & Human Chairs', location: '', howToPlay: 'Each team of 10 splits into 3 groups: (1) 4 boys or 4 girls → Human Chairs: stand in a circle, sit on each other\'s laps, remove chairs. (2) Group of 3 → Helium Stick: lower a broomstick together using only two fingers each. (3) Group of 3 → Helium Stick (second round). Game leaders rotate between Helium Stick and Human Chairs for each team.', lesson: '' },
              station_5: { name: 'Whiffle Ball', location: '', howToPlay: 'Each team member gets one try to throw a colored ball in corresponding hole. Team with most goals wins.', lesson: '' },
              station_6: { name: 'Blind Shape', location: '', howToPlay: 'Each team is given a rope and blindfolded, told to create a shape. Highest amount of shapes wins.', lesson: '' }
          }
      };

      await setDoc(doc(db, 'vbt_events', targetEventCode, 'config', 'main'), evConfigUpdates, { merge: true });
      
      // Generate 6x6 Schedule Matchups
      const generatedMatchups = [];
      const teams = ['team_red_1', 'team_red_2', 'team_white_1', 'team_white_2', 'team_black_1', 'team_black_2'];
      const games = [
        'Blind Builder', 'Skee Ball', 'Minefield', 'Helium Stick & Human Chairs', 'Whiffle Ball', 'Blind Shape'
      ];
      const times = ['8:00 PM', '8:15 PM', '8:30 PM', '8:45 PM', '9:00 PM', '9:15 PM'];

      for (let block = 1; block <= 6; block++) {
        for (let station = 1; station <= 6; station++) {
          let teamIdx = (station - 1 - (block - 1)) % 6;
          if (teamIdx < 0) teamIdx += 6;
          
          generatedMatchups.push({
            id: `b${block}_s${station}_${Date.now()}`,
            block: block,
            day: 1,
            round: 1,
            time: times[block - 1],
            location: `Station ${station}`,
            game: games[station - 1],
            teamA: teams[teamIdx],
            teamB: ''
          });
        }
      }
      
      // Build teams map so scoring can aggregate by color side
      const teamsMap = {
        'team_red_1':   { code: 'team_red_1',   name: 'Red 1',   leaders: 'Andrew, Sherry',    side: 'Red',   kidCount: 20 },
        'team_red_2':   { code: 'team_red_2',   name: 'Red 2',   leaders: 'Amberto, Youstina', side: 'Red',   kidCount: 20 },
        'team_white_1': { code: 'team_white_1', name: 'White 1', leaders: 'Youssef, Tony',     side: 'White', kidCount: 20 },
        'team_white_2': { code: 'team_white_2', name: 'White 2', leaders: 'Seif, Rougy',       side: 'White', kidCount: 20 },
        'team_black_1': { code: 'team_black_1', name: 'Black 1', leaders: 'Tony Tafaya, Sandra',side: 'Black', kidCount: 20 },
        'team_black_2': { code: 'team_black_2', name: 'Black 2', leaders: 'Kirollos, Martina', side: 'Black', kidCount: 20 }
      };

      // Points per game station
      const gamePointsMap = {
        'Blind Builder': 15,
        'Skee Ball': 15,
        'Minefield': 15,
        'Helium Stick & Human Chairs': 15,
        'Whiffle Ball': 15,
        'Blind Shape': 15
      };

      await updateScheduleData(targetEventCode, { 
        matchups: generatedMatchups, 
        teams: teamsMap,
        gamePoints: gamePointsMap
      });
      
      alert(`July 6th data merged into ${targetEventCode} successfully! Refresh the page to see changes.`);
    } catch(err) {
      console.error(err);
      alert('Error: ' + err.message);
    }
  };


  const handleToggleEventMode = async () => {
    if (!currentEventCode || !eventConfig) return;
    
    const choice = window.prompt("Choose Event Mode:\n1 - Normal Mode\n2 - Service Mode\n3 - Camp Mode\nEnter 1, 2, or 3:");
    if (!choice) return;
    
    let newMode = '';
    if (choice === '1') newMode = 'normal';
    else if (choice === '2') newMode = 'service';
    else if (choice === '3') newMode = 'camp';
    else {
      alert("Invalid choice. Please enter 1, 2, or 3.");
      return;
    }
    
    if (newMode === eventConfig.eventType) {
      alert(`Event is already in ${newMode === 'service' ? 'Service Mode' : newMode === 'normal' ? 'Normal Mode' : 'Camp Mode'}!`);
      return;
    }
    
    if (newMode === 'service' && eventConfig.daysCount > 1) {
      alert("Service Mode is only supported for 1-day events. Please set Day Count to 1 first.");
      return;
    }
    
    const modeLabel = newMode === 'service' ? 'Service Mode' : newMode === 'normal' ? 'Normal Mode' : 'Camp Mode';
    const confirmMsg = `Are you sure you want to switch this event to ${modeLabel}? This will change the scoring and matchup structure.`;
    if (!window.confirm(confirmMsg)) return;

    setSavingEventConfig(true);
    try {
      const updates = { eventType: newMode };
      
      if (newMode === 'service') {
        if (!eventConfig.stations) {
          updates.stations = {
            station_1: { name: 'Commitment', location: 'Football Field', howToPlay: '', lesson: '' },
            station_2: { name: 'Knock & Unlock', location: 'Terrace', howToPlay: '', lesson: '' },
            station_3: { name: 'Trust', location: 'Court', howToPlay: '', lesson: '' },
            station_4: { name: 'Communication', location: 'Pool', howToPlay: '', lesson: '' }
          };
          updates.bigGameName = 'Loyalty (Big Game)';
          updates.bigGameLocation = 'Football Field';
          updates.reflectionName = 'Reflection';
          updates.reflectionLocation = 'Main Hall';
        }
      }
      
      await updateEventConfig(currentEventCode, updates);
      
      setEventConfig(prev => ({
        ...prev,
        ...updates
      }));
      setEditEventConfig(prev => ({
        ...prev,
        ...updates
      }));
      
      setCurrentTab('schedule');
      alert(`Event successfully switched to ${modeLabel}!`);
    } catch (err) {
      alert('Failed to switch event mode: ' + err.message);
    } finally {
      setSavingEventConfig(false);
    }
  };

  const handleUpdateMatchupTime = async (m, trackingUpdate) => {
    if (!currentEventCode || !campData?.matchups) return;
    
    const updatedMatchups = campData.matchups.map(item => {
      if (item.day === m.day && item.block === m.block && item.round === m.round && item.game === m.game) {
        return {
          ...item,
          ...trackingUpdate
        };
      }
      return item;
    });
    
    try {
      await updateScheduleData(currentEventCode, { matchups: updatedMatchups });
    } catch (err) {
      alert("Failed to update matchup tracking: " + err.message);
    }
  };

  const handleStartMatchupTimer = async (m) => {
    const startTime = new Date().toISOString();
    await handleUpdateMatchupTime(m, {
      actualStart: startTime,
      actualEnd: null,
      delayAddedMinutes: null,
      delayAddedSeconds: null,
      delayCause: null
    });
    
    const startMsg = `⏱️ ${m.game} has started at ${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`;
    await addAnnouncement(currentEventCode, startMsg, currentUser?.name || 'System', 'system');
  };

  const handleStopMatchupTimer = async (m) => {
    if (!m.actualStart) return;
    const stopTime = new Date().toISOString();
    const startTimeMs = new Date(m.actualStart).getTime();
    const stopTimeMs = new Date(stopTime).getTime();
    const actualDurationSecs = Math.round((stopTimeMs - startTimeMs) / 1000);
    const expectedDurationSecs = 30 * 60; // 30 mins
    const delaySecs = actualDurationSecs - expectedDurationSecs;
    const delayMins = Math.round(delaySecs / 60);
    
    // Update local and firestore matchup
    const trackingUpdate = {
      actualEnd: stopTime,
      delayAddedMinutes: delayMins,
      delayAddedSeconds: delaySecs,
      delayCause: `${m.game} (${m.teamA || m.shakes} vs ${m.teamB || m.fries})`
    };
    
    await handleUpdateMatchupTime(m, trackingUpdate);
    
    // Allocate the delay shift globally
    const currentShift = campState.timeShiftMinutes || 0;
    const newShift = Math.max(0, currentShift + delayMins);
    
    if (newShift !== currentShift) {
      await handleUpdateCampState({ timeShiftMinutes: newShift });
      await syncToGoogleSheet({ timeShiftMinutes: newShift });
    }
    
    // Post delay notification/announcement
    const actualMins = Math.floor(actualDurationSecs / 60);
    const actualSecs = actualDurationSecs % 60;
    const sign = delayMins >= 0 ? '+' : '';
    
    let alertMsg = "";
    if (delayMins > 0) {
      alertMsg = `🚨 Delay Alert: ${m.game} took ${actualMins}m ${actualSecs}s (${sign}${delayMins}m over scheduled 30m). All subsequent rounds delayed by +${delayMins}m.`;
    } else if (delayMins < 0) {
      alertMsg = `⚡ Early Finish: ${m.game} took ${actualMins}m ${actualSecs}s (finished ${Math.abs(delayMins)}m early). Subsequent rounds shifted forward by -${Math.abs(delayMins)}m.`;
    } else {
      alertMsg = `✅ ${m.game} completed on schedule (took ${actualMins}m ${actualSecs}s).`;
    }
    
    await addAnnouncement(currentEventCode, alertMsg, currentUser?.name || 'System', 'system');
    await triggerRemotePushNotification("Schedule Update", alertMsg);
  };

  const handleResetMatchupTimer = async (m) => {
    const prevAdded = m.delayAddedMinutes || 0;
    
    await handleUpdateMatchupTime(m, {
      actualStart: null,
      actualEnd: null,
      delayAddedMinutes: null,
      delayAddedSeconds: null,
      delayCause: null
    });
    
    // Revert the global delay shift
    const currentShift = campState.timeShiftMinutes || 0;
    const newShift = Math.max(0, currentShift - prevAdded);
    if (newShift !== currentShift) {
      await handleUpdateCampState({ timeShiftMinutes: newShift });
      await syncToGoogleSheet({ timeShiftMinutes: newShift });
      
      const resetMsg = `🔄 Match timer for ${m.game} was reset. Overall schedule delay adjusted back by -${prevAdded}m.`;
      await addAnnouncement(currentEventCode, resetMsg, currentUser?.name || 'System', 'system');
    }
  };

  const handleUpdateMatchupScore = async (m, teamSide, delta) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'referee')) {
      alert("Permission denied. Only Coordinators and Game Leaders can edit scores.");
      return;
    }

    const currentTeamAScore = m.teamAScore || m.shakesScore || 0;
    const currentTeamBScore = m.teamBScore || m.friesScore || 0;
    
    let newTeamAScore = currentTeamAScore;
    let newTeamBScore = currentTeamBScore;
    
    if (teamSide === 'teamA' || teamSide === 'Shakes') {
      newTeamAScore = Math.max(0, currentTeamAScore + delta);
    } else if (teamSide === 'teamB' || teamSide === 'Fries') {
      newTeamBScore = Math.max(0, currentTeamBScore + delta);
    }
    
    let computedWinner = 'NA';
    if (newTeamAScore > 0 || newTeamBScore > 0) {
      if (newTeamAScore > newTeamBScore) computedWinner = 'teamA';
      else if (newTeamBScore > newTeamAScore) computedWinner = 'teamB';
      else computedWinner = 'TIE';
    }
    
    // Update matchup scores in Firestore
    await handleUpdateMatchupTime(m, {
      teamAScore: newTeamAScore,
      teamBScore: newTeamBScore,
      shakesScore: newTeamAScore,
      friesScore: newTeamBScore
    });
    
    // Automatically toggle block winner in Firestore
    const key = `${m.block}_${m.round}_${m.game}`;
    const prevWinner = (campState.blockScores || {})[key] || 'NA';
    if (prevWinner !== computedWinner) {
      const newBlockScores = { ...(campState.blockScores || {}), [key]: computedWinner };
      await handleUpdateCampState({ blockScores: newBlockScores });
      await syncToGoogleSheet({ blockScores: newBlockScores });
      
      if (currentUser) {
        const teamNameA = m.teamA || m.shakes || 'Team A';
        const teamNameB = m.teamB || m.fries || 'Team B';
        const msg = `updated ${m.game} (Block ${m.block}, Rd ${m.round}) score: ${teamNameA} ${newTeamAScore} - ${newTeamBScore} ${teamNameB}`;
        await addAnnouncement(currentEventCode, msg, currentUser.name, 'score');
      }
    }
  };

  const handleSaveAndRegenerateSchedule = async () => {
    if (!currentEventCode || !editEventConfig) return;
    setSavingEventConfig(true);
    try {
      let finalDaysCount = parseInt(editDaysCount, 10) || 1;
      let finalEventType = editEventConfig.eventType;
      if (finalEventType === 'service' && finalDaysCount > 1) {
        alert("⛪ Service Mode is only supported for 1-day events. Switching event to 🏕️ Summer Camp Mode.");
        finalEventType = 'camp';
      }

      const updatedConfig = {
        ...editEventConfig,
        eventType: finalEventType,
        kidCount: parseInt(editKidCount, 10) || 100,
        daysCount: finalDaysCount,
        activeServants: editAttending,
        servantAssignments: editRoles,
        teamNames: {
          red: editTeamRed.trim() || 'Red',
          white: editTeamWhite.trim() || 'White',
          black: editTeamBlack.trim() || 'Black',
          blue: editTeamBlue.trim() || 'Blue'
        },
        stations: editStations,
        bigGameName: editBigGameName,
        bigGameLocation: editBigGameLocation,
        bigGameHowToPlay: editBigGameHowToPlay,
        bigGameLesson: editBigGameLesson,
        reflectionName: editReflectionName,
        reflectionLocation: editReflectionLocation,
        defaultMatchupSortMode: editDefaultMatchupSortMode
      };
      
      if (finalEventType === 'service') {
        await generateAndSaveServiceSchedule(currentEventCode, updatedConfig, editAttending, globalServants);
      } else {
        await updateEventConfig(currentEventCode, updatedConfig);
      }
      
      if (!isOfflineMode) {
        await addAnnouncement(currentEventCode, "updated the servant roster and regenerated the schedule", currentUser.name, 'system');
      }
      
      alert("✨ Roster and schedule recalculated & updated successfully!");
    } catch (err) {
      alert("Failed to regenerate schedule: " + err.message);
    } finally {
      setSavingEventConfig(false);
    }
  };

  // Score Calculator Logic (Excel formula compliance)
  // Score Calculator Logic (Excel formula compliance)
  const scoreCalculations = useMemo(() => {
    const { blockScores = {}, teamDeductions = {}, tokens = {} } = campState;

    if (eventConfig.eventType === 'normal') {
      const teamScores = {};
      const teamWins = {};
      const teamDeductionsList = {};
      const teamTokens = {};

      Object.keys(campData?.teams || {}).forEach(teamCode => {
        teamScores[teamCode] = 0;
        teamWins[teamCode] = 0;
        teamDeductionsList[teamCode] = teamDeductions[teamCode] || 0;
        teamTokens[teamCode] = tokens[teamCode] || 0;
      });

      if (campData && campData.matchups) {
        campData.matchups.forEach(m => {
          const key = `${m.block}_${m.round}_${m.game}`;
          const winner = blockScores[key] || 'NA';
          const points = campData.gamePoints?.[m.game] || 0;

          const teamA = m.teamA || m.shakes;
          const teamB = m.teamB || m.fries;
          if (winner === 'Shakes' && teamA && teamA !== "All Teams") {
            teamScores[teamA] += points;
            teamWins[teamA] += 1;
          } else if (winner === 'Fries' && teamB && teamB !== "Referees") {
            teamScores[teamB] += points;
            teamWins[teamB] += 1;
          }
        });
      }

      const finalScores = {};
      Object.keys(campData?.teams || {}).forEach(teamCode => {
        const team = campData?.teams?.[teamCode];
        const sideTokens = tokens[team?.side?.toLowerCase()] || 0;
        const tok = teamTokens[teamCode] || sideTokens;
        finalScores[teamCode] = teamScores[teamCode] + (tok * 2) - teamDeductionsList[teamCode];
      });

      const sortedTeams = Object.keys(campData?.teams || {}).sort((a, b) => finalScores[b] - finalScores[a]);

      return {
        isNormal: true,
        sortedTeams,
        wins: teamWins,
        deductions: teamDeductionsList,
        tokensCount: teamTokens,
        finalScores,
        winner: sortedTeams[0] || 'TIE',
        shakesFinal: finalScores[sortedTeams[0]] || 0,
        friesFinal: finalScores[sortedTeams[1]] || 0,
        shakesBlocksTotal: teamScores[sortedTeams[0]] || 0,
        friesBlocksTotal: teamScores[sortedTeams[1]] || 0,
        shakesTokenPoints: 0,
        friesTokenPoints: 0
      };
    }

    if (eventConfig.eventType === 'service') {
      const colors = ['Red', 'White', 'Black', 'Blue'];
      const wins = { Red: 0, White: 0, Black: 0, Blue: 0 };
      const deductions = { Red: 0, White: 0, Black: 0, Blue: 0 };
      const tokensCount = { Red: tokens.red || 0, White: tokens.white || 0, Black: tokens.black || 0, Blue: tokens.blue || 0 };
      
      if (campData && campData.matchups) {
        campData.matchups.forEach(m => {
          const key = `${m.block}_${m.round}_${m.game}`;
          const winner = blockScores[key] || 'NA';
          const points = campData.gamePoints?.[m.game] || 0;
          
          const teamA = m.teamA || m.shakes;
          const teamB = m.teamB || m.fries;
          if (teamA === "All Teams") {
            if (winner === 'Shakes' || winner === 'teamA') {
              colors.forEach(c => { wins[c] += points; });
            }
          } else {
            if (winner === 'Shakes' || winner === 'teamA') {
              const team = campData.teams?.[teamA];
              if (team && colors.includes(team.side)) {
                wins[team.side] += points;
              }
            } else if (winner === 'Fries' || winner === 'teamB') {
              const team = campData.teams?.[teamB];
              if (team && colors.includes(team.side)) {
                wins[team.side] += points;
              }
            }
          }
        });
      }

      Object.entries(teamDeductions || {}).forEach(([teamCode, val]) => {
        const team = campData?.teams?.[teamCode];
        if (team && colors.includes(team.side)) {
          deductions[team.side] += val;
        }
      });

      const finalScores = {};
      colors.forEach(c => {
        finalScores[c] = wins[c] + (tokensCount[c] * 2) - deductions[c];
      });

      let leadColor = 'TIE';
      let maxVal = -999;
      colors.forEach(c => {
        if (finalScores[c] > maxVal) {
          maxVal = finalScores[c];
          leadColor = c;
        } else if (finalScores[c] === maxVal) {
          leadColor = 'TIE';
        }
      });

      const getBlockPointsService = (blockIdx) => {
        const blockWins = { Red: 0, White: 0, Black: 0, Blue: 0 };
        if (campData && campData.matchups) {
          campData.matchups.forEach(m => {
            if (m.block !== blockIdx) return;
            const key = `${m.block}_${m.round}_${m.game}`;
            const winner = blockScores[key] || 'NA';
            const points = campData.gamePoints?.[m.game] || 0;
            
            const teamA = m.teamA || m.shakes;
            const teamB = m.teamB || m.fries;
            if (teamA === "All Teams") {
              if (winner === 'Shakes' || winner === 'teamA') {
                colors.forEach(c => { blockWins[c] += points; });
              }
            } else {
              if (winner === 'Shakes' || winner === 'teamA') {
                const team = campData.teams?.[teamA];
                if (team && colors.includes(team.side)) {
                  blockWins[team.side] += points;
                }
              } else if (winner === 'Fries' || winner === 'teamB') {
                const team = campData.teams?.[teamB];
                if (team && colors.includes(team.side)) {
                  blockWins[team.side] += points;
                }
              }
            }
          });
        }
        return blockWins;
      };

      const b1 = getBlockPointsService(1);
      const b2 = getBlockPointsService(2);
      const b3 = getBlockPointsService(3);
      const b4 = getBlockPointsService(4);
      const b5 = getBlockPointsService(5);
      const b6 = getBlockPointsService(6);

      return {
        isService: true,
        colors,
        wins,
        deductions,
        tokensCount,
        finalScores,
        leadColor,
        b1, b2, b3, b4, b5, b6,
        // Legacy fallbacks to avoid crashes
        shakesFinal: finalScores['Red'] || 0,
        friesFinal: finalScores['White'] || 0,
        shakesDeductions: deductions['Red'] || 0,
        friesDeductions: deductions['White'] || 0,
        shakesBlocksTotal: wins['Red'] || 0,
        friesBlocksTotal: wins['White'] || 0,
        shakesTokenPoints: (tokensCount['Red'] || 0) * 2,
        friesTokenPoints: (tokensCount['White'] || 0) * 2,
        winner: leadColor
      };
    }

    // Legacy mode calculations
    const getBlockPoints = (blockIdx) => {
      let shakes = 0;
      let fries = 0;

      if (campData && campData.matchups) {
        campData.matchups.forEach(m => {
          if (m.block !== blockIdx) return;
          const key = `${m.block}_${m.round}_${m.game}`;
          const winner = blockScores[key] || 'NA';
          const points = campData.gamePoints?.[m.game] || 0;

          if (winner === 'Shakes') {
            shakes += points;
          } else if (winner === 'Fries') {
            fries += points;
          }
        });
      }

      return { shakes, fries };
    };

    const b1 = getBlockPoints(1);
    const b2 = getBlockPoints(2);
    const b3 = getBlockPoints(3);
    const b4 = getBlockPoints(4);

    let shakesDeductions = 0;
    let friesDeductions = 0;
    Object.entries(teamDeductions || {}).forEach(([teamCode, val]) => {
      const team = campData?.teams?.[teamCode];
      if (team) {
        if (team.side === 'Shakes') {
          shakesDeductions += val;
        } else {
          friesDeductions += val;
        }
      }
    });

    const shakesTokens = tokens.shakes || 0;
    const friesTokens = tokens.fries || 0;
    const shakesTokenPoints = shakesTokens * 2;
    const friesTokenPoints = friesTokens * 2;

    const shakesBlocksTotal = b1.shakes + b2.shakes + b3.shakes + b4.shakes;
    const friesBlocksTotal = b1.fries + b2.fries + b3.fries + b4.fries;

    const shakesFinal = shakesBlocksTotal - shakesDeductions + shakesTokenPoints;
    const friesFinal = friesBlocksTotal - friesDeductions + friesTokenPoints;

    let winner = 'TIE';
    if (shakesFinal > friesFinal) winner = 'SIDE1';
    else if (friesFinal > shakesFinal) winner = 'SIDE2';

    return {
      isService: false,
      b1, b2, b3, b4,
      shakesBlocksTotal, friesBlocksTotal,
      shakesDeductions, friesDeductions,
      shakesTokenPoints, friesTokenPoints,
      shakesFinal, friesFinal,
      winner
    };
  }, [campState, campData, eventConfig]);

  // Schedule Timer Actions (Play/Pause, Adjust shift, Reset)
  const handleToggleTimer = async () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'referee')) {
      alert("Permission denied. Only Coordinators and Game Leaders can play/pause schedule time.");
      return;
    }

    const isCurrentlyPaused = !!campState.isTimerPaused;
    const pausedAtStr = campState.timerPausedAt;
    const currentShift = campState.timeShiftMinutes || 0;

    let newIsPaused = !isCurrentlyPaused;
    let newPausedAt = null;
    let newShift = currentShift;

    if (newIsPaused) {
      // Transitioning from RUNNING to PAUSED: record the pause timestamp
      newPausedAt = new Date().toISOString();
    } else {
      // Transitioning from PAUSED to RUNNING: calculate elapsed time during pause and add to shift
      if (pausedAtStr) {
        const pausedTime = new Date(pausedAtStr).getTime();
        const elapsedMs = Math.max(0, Date.now() - pausedTime);
        const elapsedMins = Math.floor(elapsedMs / (60 * 1000));
        newShift = currentShift + elapsedMins;
      }
      newPausedAt = null;
    }

    await handleUpdateCampState({
      isTimerPaused: newIsPaused,
      timerPausedAt: newPausedAt,
      timeShiftMinutes: newShift
    });

    const actionText = newIsPaused ? 'PAUSED ⏸️' : 'RESUMED ▶️';
    const msg = `${actionText} the schedule timer (Current Delay: +${newShift}m)`;
    if (!isOfflineMode) {
      await addAnnouncement(currentEventCode, msg, currentUser.name, 'system');
    }
  };

  const handleAdjustTimeShift = async (amount) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'referee')) {
      alert("Permission denied. Only Coordinators and Game Leaders can adjust schedule delays.");
      return;
    }

    const currentShift = campState.timeShiftMinutes || 0;
    const newShift = Math.max(0, currentShift + amount);
    
    await handleUpdateCampState({
      timeShiftMinutes: newShift
    });

    const msg = `adjusted schedule delay by ${amount > 0 ? '+' : ''}${amount}m (Total Delay: +${newShift}m)`;
    if (!isOfflineMode) {
      await addAnnouncement(currentEventCode, msg, currentUser.name, 'system');
    }
  };

  const handleResetTimeShift = async () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'referee')) {
      alert("Permission denied. Only Coordinators and Game Leaders can reset schedule delay.");
      return;
    }
    if (window.confirm("Are you sure you want to reset the schedule delay to 0 minutes?")) {
      await handleUpdateCampState({
        timeShiftMinutes: 0,
        isTimerPaused: false,
        timerPausedAt: null
      });
      if (!isOfflineMode) {
        await addAnnouncement(currentEventCode, "reset schedule delay to 0m (On Schedule)", currentUser.name, 'system');
      }
    }
  };

  // Handle toggling matchup winner
  const handleToggleWinner = async (block, round, game, newWinner) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'referee')) {
      alert("Permission denied. Only Coordinators and Game Leaders can edit scores.");
      return;
    }

    const key = `${block}_${round}_${game}`;
    const prevWinner = (campState.blockScores || {})[key] || 'NA';
    
    if (prevWinner === newWinner) return;

    const newBlockScores = { ...(campState.blockScores || {}), [key]: newWinner };
    await handleUpdateCampState({ blockScores: newBlockScores });

    // Write back to Google Sheets Web App
    await syncToGoogleSheet({ blockScores: newBlockScores });

    if (currentUser) {
      const msg = `updated ${game} (Block ${block}, Rd ${round}) winner to ${newWinner.toUpperCase()}`;
      await addAnnouncement(currentEventCode, msg, currentUser.name, 'score');
    }
  };

  // Adjust Point Deduction
  const handleAdjustDeduction = async (teamCode, amount) => {
    if (!currentUser || (currentUser.role !== 'admin' && (currentUser.role !== 'leader' || currentUser.teamCode !== teamCode))) {
      alert("Permission denied. You can only adjust deductions for your own team.");
      return;
    }

    const currentVal = (campState.teamDeductions || {})[teamCode] || 0;
    if (amount > 0 && currentVal >= 10) {
      alert("Maximum of 10 point deductions allowed per team.");
      return;
    }
    const newVal = Math.min(10, Math.max(0, currentVal + amount));
    if (currentVal === newVal) return;

    const newDeductions = { ...(campState.teamDeductions || {}), [teamCode]: newVal };
    await handleUpdateCampState({ teamDeductions: newDeductions });

    // Write back to Google Sheets Web App
    await syncToGoogleSheet({ teamDeductions: newDeductions });

    if (currentUser) {
      const action = amount > 0 ? 'added' : 'removed';
      const pointsStr = Math.abs(amount) === 1 ? 'point' : 'points';
      const msg = `${action} ${Math.abs(amount)} deduction ${pointsStr} to ${teamCode} (Total: ${newVal})`;
      await addAnnouncement(currentEventCode, msg, currentUser.name, 'deduction');
    }
  };

  // Dumb Dashboard point deductions submit handler
  const handleDumbSubmitDeduction = async (teamCode, points, reason) => {
    if (!currentUser || (
      currentUser.role !== 'admin' &&
      currentUser.role !== 'service_leader' &&
      (currentUser.role !== 'leader' || currentUser.teamCode !== teamCode)
    )) {
      alert("Permission denied. You do not have permission to adjust deductions for this team.");
      return;
    }

    const ptsNum = Number(points) || 0;
    const currentVal = (campState.teamDeductions || {})[teamCode] || 0;
    const newVal = Math.min(25, Math.max(0, currentVal + ptsNum));

    const newDeductions = { ...(campState.teamDeductions || {}), [teamCode]: newVal };
    await handleUpdateCampState({ teamDeductions: newDeductions });
    await syncToGoogleSheet({ teamDeductions: newDeductions });

    if (currentUser) {
      const msg = `deducted ${ptsNum} points from ${teamCode} for ${reason} (Total: ${newVal})`;
      await addAnnouncement(currentEventCode, msg, currentUser.name, 'deduction');
    }
  };

  // Dumb Dashboard score submit handler
  const handleDumbSubmitScore = async (matchupId, scores) => {
    const parts = matchupId.split('_');
    if (parts.length < 3) return;
    const block = parts[0];
    const round = parts[1];
    const game = parts.slice(2).join('_');

    const winner = scores.scoreA > scores.scoreB ? 'Shakes' : scores.scoreB > scores.scoreA ? 'Fries' : 'Tie';
    await handleToggleWinner(block, round, game, winner);
  };

  // Adjust Tokens
  const handleAdjustTokens = async (side, amount) => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert("Permission denied. Only Coordinators can award tokens.");
      return;
    }

    const currentTokens = (campState.tokens || {})[side] || 0;
    const newTokens = Math.max(0, currentTokens + amount);
    if (currentTokens === newTokens) return;

    const newTokensState = { ...(campState.tokens || {}), [side]: newTokens };
    await handleUpdateCampState({ tokens: newTokensState });

    // Write back to Google Sheets Web App
    await syncToGoogleSheet({ tokens: newTokensState });

    if (currentUser) {
      let sideText = side;
      if (eventConfig.eventType === 'service') {
        sideText = eventConfig.teamNames?.[side.toLowerCase()] || (side.charAt(0).toUpperCase() + side.slice(1));
      } else {
        sideText = side === 'shakes' ? side1Name : side2Name;
      }
      const action = amount > 0 ? 'added' : 'removed';
      const tokenStr = Math.abs(amount) === 1 ? 'token' : 'tokens';
      const msg = `${action} ${Math.abs(amount)} ${tokenStr} to ${sideText} (Total: ${newTokens})`;
      await addAnnouncement(currentEventCode, msg, currentUser.name, 'score');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert("Please select an image file.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        setUploadImage(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if ((!announcementText.trim() && !uploadImage) || !currentUser) return;
    
    await addAnnouncement(
      currentEventCode,
      announcementText.trim(),
      currentUser.name,
      'announcement',
      uploadImage,
      currentUser.role
    );
    
    // Trigger remote push notification to all leaders/coordinators
    await triggerRemotePushNotification(
      `${eventConfig.eventName}: ${currentUser.name}`,
      announcementText.trim() || "📷 Shared a new photo in the live feed."
    );
    
    setAnnouncementText('');
    setUploadImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleReaction = async (feedId, emojiType) => {
    if (!currentUser) return;
    
    const feedItem = announcements.find(a => a.id === feedId);
    if (!feedItem) return;
    
    const currentReactions = feedItem.reactions || { thumbsup: [], congrats: [], fire: [] };
    const userList = currentReactions[emojiType] || [];
    
    const userName = currentUser.name;
    let newUsers = [];
    if (userList.includes(userName)) {
      newUsers = userList.filter(u => u !== userName);
    } else {
      newUsers = [...userList, userName];
    }
    
    const updatedReactions = {
      ...currentReactions,
      [emojiType]: newUsers
    };
    
    // Optimistic local update
    const updatedAnnouncements = announcements.map(a => {
      if (a.id === feedId) {
        return { ...a, reactions: updatedReactions };
      }
      return a;
    });
    setAnnouncements(updatedAnnouncements);
    
    if (!isOfflineMode) {
      try {
        await updateAnnouncementReactions(currentEventCode, feedId, updatedReactions);
      } catch (err) {
        console.error("Failed to update reactions in firestore:", err);
      }
    }
  };



  const filteredMatchups = useMemo(() => {
    let list = campData.matchups.filter(m => {
      // Day filter
      if (daysCount > 1) {
        const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
        if (scheduleDayFilter !== String(mDay)) return false;
      }

      // Block filter
      if (scheduleBlockFilter !== 'All' && m.block !== parseInt(scheduleBlockFilter)) {
        return false;
      }
      if (scheduleTeamFilter) {
        const teamA = m.teamA || m.shakes;
        const teamB = m.teamB || m.fries;
        if (teamA !== scheduleTeamFilter && teamB !== scheduleTeamFilter) {
          return false;
        }
      }
      return true;
    });

    if (scheduleSortMode === 'game') {
      // Sort by game/station name first, then round, then day
      list = [...list].sort((a, b) => {
        const gameA = a.game || '';
        const gameB = b.game || '';
        if (gameA !== gameB) {
          return gameA.localeCompare(gameB);
        }
        if (a.day !== b.day) {
          return (a.day || 1) - (b.day || 1);
        }
        if (a.block !== b.block) {
          return (a.block || 1) - (b.block || 1);
        }
        return (a.round || 1) - (b.round || 1);
      });
    } else {
      // Standard chronological sorting: Day, Block, Round, Game
      list = [...list].sort((a, b) => {
        if (a.day !== b.day) {
          return (a.day || 1) - (b.day || 1);
        }
        if (a.block !== b.block) {
          return (a.block || 1) - (b.block || 1);
        }
        if (a.round !== b.round) {
          return (a.round || 1) - (b.round || 1);
        }
        const gameA = a.game || '';
        const gameB = b.game || '';
        return gameA.localeCompare(gameB);
      });
    }
    return list;
  }, [scheduleTeamFilter, scheduleBlockFilter, scheduleDayFilter, campData.matchups, eventConfig.eventType, daysCount, scheduleSortMode]);

  const myTeamInfo = useMemo(() => {
    if (!currentUser) return null;
    const isService = eventConfig.eventType === 'service';
    let rawSchedule = [];
    if (isService) {
      rawSchedule = (campData.matchups || [])
        .filter(m => (m.teamA || m.shakes) === currentUser.teamCode || (m.teamB || m.fries) === currentUser.teamCode)
        .map(m => {
          const teamA = m.teamA || m.shakes;
          const teamB = m.teamB || m.fries;
          return {
            day: m.day || 1,
            block: `Block ${m.block}`,
            round: m.round,
            game: m.game,
            time: m.time,
            location: m.location,
            opponent: teamA === currentUser.teamCode ? teamB : teamA,
            shakes: teamA,
            fries: teamB
          };
        });
    } else {
      rawSchedule = campData.teamSchedules?.[currentUser.teamCode] || [];
    }
    const teamDetails = campData.teams?.[currentUser.teamCode] || {};
    return {
      ...teamDetails,
      schedule: rawSchedule,
      day1Schedule: isService ? rawSchedule.filter(s => (s.day || 1) === 1) : rawSchedule.filter(s => s.block && s.block.toLowerCase().includes('day 1')),
      day2Schedule: isService ? rawSchedule.filter(s => (s.day || 1) === 2) : rawSchedule.filter(s => s.block && s.block.toLowerCase().includes('day 2')),
      deductions: (campState.teamDeductions || {})[currentUser.teamCode] || 0
    };
  }, [currentUser, campState, campData, eventConfig]);

  const currentActiveSlot = useMemo(() => {
    if (!myTeamInfo || !myTeamInfo.schedule) return null;
    return myTeamInfo.schedule.find(slot => {
      const sBlockNum = parseInt(slot.block?.replace('Block ', ''), 10) || 1;
      const sDay = slot.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(sBlockNum) ? 1 : 2) : 1);
      return slot.block && isTimeSlotActive(slot.time, slot.block, sDay);
    });
  }, [myTeamInfo, campState, timeTick, eventConfig.eventType]);

  // Find matches scheduled at the selected map location
  const mapLocationMatches = useMemo(() => {
    if (!selectedMapLocation) return [];
    return campData.matchups.filter(m => m.location === selectedMapLocation.name);
  }, [selectedMapLocation]);

  const toggleFaq = (idx) => {
    setExpandedFaqs(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ─── EVENT SELECTION SCREEN ──────────────────────────────────────────────
  const getPreloadMessage = (progress) => {
    if (progress < 25) return "Lacing up shoes...";
    if (progress < 50) return "Warming up the crowd...";
    if (progress < 75) return "Preparing the courts...";
    if (progress < 90) return "Drawing up the playbook...";
    return "Game ON! Launching...";
  };

  // ─── EVENT SELECTION SCREEN ──────────────────────────────────────────────
  // Preloader View
  if (isPreloading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at center, #0d1633 0%, #050814 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        transition: 'opacity 0.4s ease-out',
        opacity: preloadProgress === 100 ? 0 : 1,
        pointerEvents: 'none'
      }}>
        {/* Glow Orbs */}
        <div className="glow-orb glow-orb-1" style={{ opacity: 0.18 }} />
        <div className="glow-orb glow-orb-2" style={{ opacity: 0.18 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', zIndex: 10 }}>
          <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            <div className="stadium-ripple" />
            <div className="stadium-ripple" />
            <div className="stadium-ripple" />
            <img
              src="/Final VBT Re-Branding 2026-02 (3).png"
              alt="VBT Logo"
              style={{
                width: '100px',
                height: 'auto',
                animation: 'pulse-glow 1.8s infinite',
                filter: 'drop-shadow(0 0 25px rgba(41,182,246,0.4))',
                zIndex: 5
              }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              color: '#ffffff', 
              fontWeight: '900', 
              fontFamily: 'var(--font-title)', 
              letterSpacing: '0.12em', 
              margin: 0, 
              textShadow: '0 0 15px rgba(255,255,255,0.15)',
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              VBT SERVICE
            </h1>
            <p style={{ color: 'var(--vbt-sky)', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Church Sports Outreach
            </p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
            <div style={{ 
              width: '240px', 
              height: '6px', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '20px', 
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
            }} className="loading-shimmer">
              <div style={{ width: `${preloadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #1441a1 0%, var(--vbt-sky) 50%, #a78bfa 100%)', boxShadow: '0 0 8px var(--vbt-sky)', transition: 'width 0.05s ease-out' }} />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '240px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>
                {getPreloadMessage(preloadProgress)}
                <span className="text-cursor" />
              </span>
              <span style={{ color: 'var(--vbt-sky)', fontWeight: '700' }}>
                {preloadProgress}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── EVENT SELECTION / HOMEPAGE SCREEN ─────────────────────────────────────────────
  if (!currentEventCode) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'radial-gradient(circle at center, #0c1530 0%, #05070f 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', overflow: 'hidden'
      }}>
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />

        {/* Safe area spacer */}
        <div style={{ height: 'env(safe-area-inset-top, 0px)', width: '100%', flexShrink: 0 }} />

        {/* Header */}
        <header style={{ width: '100%', maxWidth: '480px', padding: '10px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/Final VBT Re-Branding 2026-02 (3).png" alt="VBT Logo"
              style={{ width: '36px', height: 'auto', filter: 'drop-shadow(0 0 8px rgba(41,182,246,0.3))' }} />
            <div>
              <span style={{ fontSize: '1rem', fontWeight: '800', fontFamily: 'var(--font-title)', color: '#ffffff', letterSpacing: '0.05em', display: 'block', lineHeight: 1 }}>VBT SERVICE</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--vbt-sky)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Church Sports Outreach</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(41,182,246,0.08)', border: '1px solid rgba(41,182,246,0.18)', padding: '4px 10px', borderRadius: '20px' }}>
            <span className="live-dot" style={{ width: '5px', height: '5px' }} />
            <span style={{ fontSize: '0.62rem', fontWeight: '700', color: 'var(--vbt-sky)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live</span>
          </div>
        </header>

        {/* Scrollable body */}
        <div style={{ flex: 1, width: '100%', maxWidth: '480px', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', padding: '8px 16px 32px 16px',
          display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {!showCreateEvent ? (
            <>
              {/* Hero */}
              <section style={{ textAlign: 'center', padding: '12px 0 4px 0' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#ffffff',
                  fontFamily: 'var(--font-title)', lineHeight: '1.1', marginBottom: '10px', letterSpacing: '-0.02em' }}>
                  Games That{' '}
                  <span style={{ background: 'linear-gradient(135deg, var(--vbt-sky) 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Inspire</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 auto', maxWidth: '320px' }}>
                  Dynamic sports &amp; Bible reflections for kids &mdash; coordinated in real-time.
                </p>
              </section>

              {/* ── QUICK JOIN (active events from registry) ── */}
              {(() => {
                const activeEvents = eventRegistry.filter(e => e.active !== false && !e.expired && e.code !== 'june26');
                if (activeEvents.length === 0) return null;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeEvents.map(ev => {
                      const isToday = ev.date && (() => {
                        try {
                          const d = new Date(ev.date);
                          const now = new Date();
                          return d.toDateString() === now.toDateString();
                        } catch { return false; }
                      })();
                      return (
                        <div key={ev.code} style={{
                          background: 'linear-gradient(135deg, rgba(20,65,161,0.45) 0%, rgba(41,182,246,0.18) 100%)',
                          border: `1px solid ${isToday ? 'rgba(74,222,128,0.5)' : 'rgba(41,182,246,0.35)'}`,
                          borderRadius: '20px', padding: '20px',
                          boxShadow: isToday ? '0 0 24px rgba(74,222,128,0.15), 0 8px 32px rgba(20,65,161,0.25)' : '0 8px 32px rgba(20,65,161,0.2)',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          {/* Glow accent */}
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                            background: isToday ? 'linear-gradient(90deg, #4ade80, #60a5fa)' : 'linear-gradient(90deg, #1441a1, #60a5fa)' }} />

                          {/* Live badge */}
                          {isToday && (
                            <div style={{ position: 'absolute', top: '14px', right: '16px',
                              display: 'flex', alignItems: 'center', gap: '5px',
                              background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)',
                              borderRadius: '20px', padding: '3px 10px' }}>
                              <span className="live-dot" style={{ width: '5px', height: '5px', background: '#4ade80' }} />
                              <span style={{ fontSize: '0.6rem', fontWeight: '800', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today</span>
                            </div>
                          )}

                          <div style={{ marginBottom: '14px', paddingRight: isToday ? '60px' : '0' }}>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: '700',
                              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                              {ev.eventType === 'camp' ? '⛺ Camp' : '⚡ Service'} · {ev.code.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.01em' }}>
                              {ev.name || ev.code}
                            </div>
                            {ev.date && (
                              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                                📅 {new Date(ev.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleQuickJoin(ev.code)}
                            disabled={eventJoinLoading !== false}
                            style={{
                              width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                              background: isToday
                                ? 'linear-gradient(135deg, #166534 0%, #4ade80 100%)'
                                : 'linear-gradient(135deg, #1441a1 0%, #60a5fa 100%)',
                              color: '#ffffff', fontWeight: '800', fontSize: '1.05rem',
                              cursor: eventJoinLoading !== false ? 'not-allowed' : 'pointer',
                              boxShadow: isToday ? '0 4px 20px rgba(74,222,128,0.35)' : '0 4px 20px rgba(20,65,161,0.4)',
                              letterSpacing: '0.02em', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', gap: '8px',
                              transition: 'opacity 0.2s, transform 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '0.92'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
                          >
                            {eventJoinLoading === ev.code ? (
                              <span>Joining…</span>
                            ) : (
                              <>
                                <span style={{ fontSize: '1.1rem' }}>▶</span>
                                <span>Join Now</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── MANUAL CODE ENTRY (collapsible) ── */}
              {(() => {
                const hasActive = eventRegistry.some(e => e.active !== false && !e.expired);
                const open = hasActive ? showManualJoin : true;
                return (
                  <div>
                    {hasActive && (
                      <button
                        onClick={() => setShowManualJoin(o => !o)}
                        style={{
                          width: '100%', padding: '11px 16px', borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.09)',
                          background: 'rgba(255,255,255,0.03)',
                          color: 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: '0.82rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', gap: '8px',
                        }}
                      >
                        <span>🔑 Enter a code manually</span>
                        <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', fontSize: '0.7rem' }}>▼</span>
                      </button>
                    )}
                    {open && (
                      <div style={{
                        marginTop: hasActive ? '10px' : '0',
                        background: 'linear-gradient(135deg, rgba(20,65,161,0.2) 0%, rgba(41,182,246,0.07) 100%)',
                        border: '1px solid rgba(41,182,246,0.18)', borderRadius: '16px', padding: '18px 16px',
                      }}>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                          Enter the event code your coordinator shared with you.
                        </p>
                        <form id="vbt-join-form" onSubmit={handleJoinEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input type="text" value={eventJoinInput} onChange={(e) => setEventJoinInput(e.target.value)}
                            placeholder="e.g. july6" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                            style={{ width: '100%', padding: '13px 16px', borderRadius: '12px',
                              background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(41,182,246,0.2)',
                              color: '#ffffff', fontSize: '1rem', outline: 'none',
                              fontFamily: 'monospace', letterSpacing: '0.08em', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--vbt-sky)'; e.target.style.boxShadow = '0 0 12px rgba(41,182,246,0.25)'; }}
                            onBlur={(e)  => { e.target.style.borderColor = 'rgba(41,182,246,0.2)'; e.target.style.boxShadow = 'none'; }}
                          />
                          {eventJoinError && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px' }}>
                              <p style={{ color: '#f87171', fontSize: '0.82rem', margin: 0 }}>&#9888; {eventJoinError}</p>
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '4px 0 0 0' }}>Ask your coordinator for the correct code.</p>
                            </div>
                          )}
                          <button type="submit" disabled={eventJoinLoading !== false}
                            style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                              background: eventJoinLoading === 'manual' ? 'rgba(41,182,246,0.4)' : 'var(--gradient-vbt)',
                              color: '#ffffff', fontWeight: '800', fontSize: '0.95rem',
                              cursor: eventJoinLoading !== false ? 'not-allowed' : 'pointer',
                              boxShadow: '0 4px 20px rgba(20,65,161,0.4)', letterSpacing: '0.03em' }}>
                            {eventJoinLoading === 'manual' ? 'Joining...' : 'Enter Service'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quick stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {[
                  { icon: '&#128101;', value: '100+', label: 'Kids' },
                  { icon: '&#127918;', value: '6', label: 'Stations' },
                  { icon: '&#9889;', value: 'Live', label: 'Sync' }
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-light)', borderRadius: '14px',
                    padding: '12px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: s.icon }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--vbt-sky)', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Coordinator actions - only visible to admins */}
              {currentUser && currentUser.role === 'admin' && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Coordinator Actions</p>
                <button onClick={seedJuly6Service}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--vbt-sky)',
                    background: 'var(--vbt-sky)', color: '#000', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', marginBottom: '4px' }}>
                  🚀 SETUP JULY 6TH SERVICE (AI)
                </button>
                <button onClick={() => setShowCreateEvent(true)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-light)',
                    background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                  + Create New Service Day
                </button>
                <button onClick={() => { setShowServiceRequestModal(true); setRequestSuccess(false); setServiceRequestStep(1);
                    setServiceRequestForm({ serviceLocation: '', serviceDate: '', serviceStartTime: '', serviceEndTime: '',
                      serviceTopic: '', targetGender: 'Mix', targetAgeGrade: '', participantsCount: '',
                      alreadySplitTeams: 'no', teamsCount: '', needSpecificServantsCount: 'no',
                      servantsCount: '', servantsAvailableHelping: 'yes',
                      contactName: '', contactNumber: '', churchName: '' }); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px',
                    border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.06)', color: '#c4b5fd',
                    fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  &#9962; Request VBT Service
                </button>
              </div>
              )}

              {/* Bottom safe area spacer */}
              <div style={{ height: 'env(safe-area-inset-bottom, 16px)', flexShrink: 0 }} />
            </>
          ) : (
            /* Create New Event Form */
            <div className="glass-ticket animate-fade" style={{ padding: '28px', width: '100%', maxWidth: '750px' }}>
              <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (creationStep > 1) {
                        setCreationStep(creationStep - 1);
                      } else {
                        setShowCreateEvent(false);
                      }
                    }} 
                    style={{ 
                      background: 'rgba(255,255,255,0.04)', 
                      border: '1px solid rgba(255,255,255,0.08)', 
                      borderRadius: '8px',
                      color: 'var(--text-secondary)', 
                      cursor: 'pointer', 
                      padding: '6px 12px', 
                      fontSize: '0.78rem',
                      fontWeight: '700'
                    }}
                  >
                    ← Back
                  </button>
                  <h3 style={{ color: '#ffffff', fontSize: '1.25rem', margin: 0, fontWeight: '800' }}>
                    Create New Event {newEventType === 'service' && `(Step ${creationStep} of 3)`}
                  </h3>
                </div>
                
                {createEventError && (
                  <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 14px', borderRadius: '10px', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ⚠️ {createEventError}
                  </div>
                )}

                {/* Step Headers */}
                {newEventType === 'service' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '6px' }}>
                    {['1. Details', '2. Setup Games', '3. Roster & Roles'].map((stepTitle, idx) => {
                      const stepNum = idx + 1;
                      const isActive = creationStep === stepNum;
                      return (
                        <div 
                          key={stepTitle} 
                          style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: '700', 
                            color: isActive ? '#c4b5fd' : 'var(--text-muted)',
                            borderBottom: isActive ? '2px solid #a78bfa' : 'none',
                            paddingBottom: '4px',
                            flex: 1,
                            textAlign: 'center'
                          }}
                        >
                          {stepTitle}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step 1: Details & Team Names */}
                {creationStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Event Code</label>
                        <input
                          type="text"
                          value={newEventCode}
                          onChange={(e) => setNewEventCode(e.target.value)}
                          placeholder="e.g. summer_2026"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Event Name</label>
                        <input
                          type="text"
                          value={newEventName}
                          onChange={(e) => setNewEventName(e.target.value)}
                          placeholder="e.g. VBT Summer Camp"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Event Date</label>
                        <input
                          type="text"
                          value={newEventDate}
                          onChange={(e) => setNewEventDate(e.target.value)}
                          placeholder="e.g. July 12, 2026"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Event Type</label>
                        <select
                          value={newEventType}
                          onChange={(e) => {
                            setNewEventType(e.target.value);
                            setNewDaysCount(e.target.value === 'camp' ? 2 : 1);
                          }}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="service">Service Mode (Dynamic 4 Teams)</option>
                          <option value="camp" disabled style={{ color: 'var(--text-muted)' }}>Camp Mode (Legacy 2 Teams) — EXPIRED</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Days of Event</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newDaysCount}
                          onChange={(e) => setNewDaysCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Coordinator Passcode</label>
                        <input
                          type="text"
                          value={newEventPassCoord}
                          onChange={(e) => setNewEventPassCoord(e.target.value)}
                          placeholder="e.g. VBTADMIN"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Game Leader Passcode</label>
                        <input
                          type="text"
                          value={newEventPassGame}
                          onChange={(e) => setNewEventPassGame(e.target.value)}
                          placeholder="e.g. GAMEREF"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Team Leader Passcode</label>
                        <input
                          type="text"
                          value={newEventPassTeam}
                          onChange={(e) => setNewEventPassTeam(e.target.value)}
                          placeholder="e.g. LEADER"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    {newEventType === 'service' ? (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                        <h4 style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎨 Custom Team Labels</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ef4444', marginBottom: '8px', fontWeight: '700' }}>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                              Red Team Label
                            </label>
                            <input
                              type="text"
                              value={newTeamRed}
                              onChange={(e) => setNewTeamRed(e.target.value)}
                              placeholder="Red"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ffffff', marginBottom: '8px', fontWeight: '700' }}>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffffff', border: '1px solid #ccc' }}></span>
                              White Team Label
                            </label>
                            <input
                              type="text"
                              value={newTeamWhite}
                              onChange={(e) => setNewTeamWhite(e.target.value)}
                              placeholder="White"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', fontWeight: '700' }}>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1e293b', border: '1px solid #94a3b8' }}></span>
                              Black Team Label
                            </label>
                            <input
                              type="text"
                              value={newTeamBlack}
                              onChange={(e) => setNewTeamBlack(e.target.value)}
                              placeholder="Black"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#38bdf8', marginBottom: '8px', fontWeight: '700' }}>
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#38bdf8' }}></span>
                              Blue Team Label
                            </label>
                            <input
                              type="text"
                              value={newTeamBlue}
                              onChange={(e) => setNewTeamBlue(e.target.value)}
                              placeholder="Blue"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--color-shakes)', marginBottom: '4px', fontWeight: '700' }}>Side 1 Name</label>
                          <input
                            type="text"
                            value={newEventSide1}
                            onChange={(e) => setNewEventSide1(e.target.value)}
                            placeholder="Shakes"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--color-fries)', marginBottom: '4px', fontWeight: '700' }}>Side 2 Name</label>
                          <input
                            type="text"
                            value={newEventSide2}
                            onChange={(e) => setNewEventSide2(e.target.value)}
                            placeholder="Fries"
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                          />
                        </div>
                      </div>
                    )}

                    {newEventType === 'service' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!newEventCode.trim()) { setCreateEventError('Event code is required.'); return; }
                          if (!newEventName.trim()) { setCreateEventError('Event name is required.'); return; }
                          if (!newEventPassCoord.trim()) { setCreateEventError('Coordinator passcode is required.'); return; }
                          setCreateEventError('');
                          setCreationStep(2);
                        }}
                        className="btn-glow"
                        style={{
                          width: '100%', padding: '14px', borderRadius: '12px',
                          background: 'var(--gradient-vbt)', border: 'none', color: '#ffffff',
                          fontFamily: 'var(--font-title)', fontWeight: '800', fontSize: '0.95rem',
                          cursor: 'pointer', marginTop: '10px'
                        }}
                      >
                        Next: Setup Games ➔
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={createEventLoading}
                        className="btn-glow"
                        style={{
                          width: '100%', padding: '14px', borderRadius: '12px',
                          background: 'var(--gradient-vbt)', border: 'none', color: '#ffffff',
                          fontFamily: 'var(--font-title)', fontWeight: '800', fontSize: '0.95rem',
                          cursor: createEventLoading ? 'not-allowed' : 'pointer', opacity: createEventLoading ? 0.7 : 1,
                          marginTop: '10px', boxShadow: '0 4px 15px rgba(20,65,161,0.3)'
                        }}
                      >
                        {createEventLoading ? 'Creating...' : '🚀 Create & Join Event'}
                      </button>
                    )}
                  </div>
                )}

                {/* Step 2: Games & Outreach Brief Setup */}
                {creationStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Expected Kids Count</label>
                        <input
                          type="number"
                          value={newKidCount}
                          onChange={(e) => setNewKidCount(parseInt(e.target.value, 10) || '')}
                          placeholder="e.g. 100"
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Outreach Theme Brief</label>
                      <textarea
                        value={newServiceBrief}
                        onChange={(e) => setNewServiceBrief(e.target.value)}
                        placeholder="Brief description of the service target and theme..."
                        rows={3}
                        style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>

                    {/* Rotational Stations Setup */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <h4 style={{ color: '#c4b5fd', fontSize: '0.9rem', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏁 Rotational Stations (4 Stations)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {['station_1', 'station_2', 'station_3', 'station_4'].map((stKey, idx) => {
                          const st = newStations[stKey];
                          return (
                            <div key={stKey} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                              <h5 style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px' }}>Station {idx + 1}</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '10px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Game Name</label>
                                  <input
                                    type="text"
                                    value={st.name}
                                    onChange={(e) => handleNewStationChange(stKey, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location</label>
                                  <input
                                    type="text"
                                    value={st.location}
                                    onChange={(e) => handleNewStationChange(stKey, 'location', e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }}
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>How to Play</label>
                                  <textarea
                                    value={st.howToPlay}
                                    onChange={(e) => handleNewStationChange(stKey, 'howToPlay', e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.78rem', resize: 'vertical' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Lesson Learned</label>
                                  <textarea
                                    value={st.lesson}
                                    onChange={(e) => handleNewStationChange(stKey, 'lesson', e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.78rem', resize: 'vertical' }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Big Game & Reflection Setup */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                      <h4 style={{ color: '#c4b5fd', fontSize: '0.9rem', fontWeight: '800', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏆 Big Game & Reflection</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {['big_game', 'reflection'].map((stKey) => {
                          const st = newStations[stKey];
                          return (
                            <div key={stKey} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                              <h5 style={{ color: '#ffffff', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'capitalize' }}>{stKey.replace('_', ' ')}</h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '10px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Name</label>
                                  <input
                                    type="text"
                                    value={st.name}
                                    onChange={(e) => handleNewStationChange(stKey, 'name', e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Location</label>
                                  <input
                                    type="text"
                                    value={st.location}
                                    onChange={(e) => handleNewStationChange(stKey, 'location', e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }}
                                  />
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>How to Play</label>
                                  <textarea
                                    value={st.howToPlay}
                                    onChange={(e) => handleNewStationChange(stKey, 'howToPlay', e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.78rem', resize: 'vertical' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Lesson Learned</label>
                                  <textarea
                                    value={st.lesson}
                                    onChange={(e) => handleNewStationChange(stKey, 'lesson', e.target.value)}
                                    rows={2}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.78rem', resize: 'vertical' }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setCreationStep(1)}
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreationStep(3)}
                        className="btn-glow"
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--gradient-vbt)', border: 'none', color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        Next: Roster & Roles ➔
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Roster & Roles */}
                {creationStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div>
                        <h4 style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '800', margin: 0 }}>👥 Servant Roster & Attendance</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Check who is attending and assign their roles.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleWizardAutoAssign}
                        className="btn-glow"
                        style={{
                          padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.3)',
                          background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ✨ Magic Auto-Assign
                      </button>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                      {globalServants.sort((a,b) => a.name.localeCompare(b.name)).map(s => {
                        const isAttending = wizardAttending.includes(s.id);
                        return (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: isAttending ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.01)', border: '1px solid ' + (isAttending ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.03)') }}>
                            <input
                              type="checkbox"
                              checked={isAttending}
                              onChange={() => {
                                const updated = wizardAttending.includes(s.id)
                                  ? wizardAttending.filter(id => id !== s.id)
                                  : [...wizardAttending, s.id];
                                setWizardAttending(updated);
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', color: '#ffffff', flex: 1, fontWeight: isAttending ? '700' : 'normal' }}>{s.name}</span>
                            
                            {isAttending && (
                              <select
                                value={wizardRoles[s.id] || 'volunteer'}
                                onChange={(e) => setWizardRoles(prev => ({ ...prev, [s.id]: e.target.value }))}
                                style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.78rem', cursor: 'pointer', outline: 'none', maxWidth: '160px' }}
                              >
                                <option value="volunteer">Volunteer/Ref</option>
                                <option value="coordinator">Coordinator</option>
                                <option value="service_leader">Service Day Leader</option>
                                <option value="station_1">{(newStations.station_1.name || 'Station 1') + ' Lead'}</option>
                                <option value="station_2">{(newStations.station_2.name || 'Station 2') + ' Lead'}</option>
                                <option value="station_3">{(newStations.station_3.name || 'Station 3') + ' Lead'}</option>
                                <option value="station_4">{(newStations.station_4.name || 'Station 4') + ' Lead'}</option>
                                <option value="big_game_1">Big Game Lead 1</option>
                                <option value="big_game_2">Big Game Lead 2</option>
                                <option value="reflection">Reflection Lead</option>
                                <option value="team_red_1">{(newTeamRed || 'Red') + ' 1 Leader'}</option>
                                <option value="team_red_2">{(newTeamRed || 'Red') + ' 2 Leader'}</option>
                                <option value="team_white_1">{(newTeamWhite || 'White') + ' 1 Leader'}</option>
                                <option value="team_white_2">{(newTeamWhite || 'White') + ' 2 Leader'}</option>
                                <option value="team_black_1">{(newTeamBlack || 'Black') + ' 1 Leader'}</option>
                                <option value="team_black_2">{(newTeamBlack || 'Black') + ' 2 Leader'}</option>
                                <option value="team_blue_1">{(newTeamBlue || 'Blue') + ' 1 Leader'}</option>
                                <option value="team_blue_2">{(newTeamBlue || 'Blue') + ' 2 Leader'}</option>
                                <option value="media">Media Coverage</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Add Servant form */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#a78bfa' }}>➕ Add New Servant to Directory</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={quickServantName}
                          onChange={(e) => setQuickServantName(e.target.value)}
                          placeholder="Full Name (e.g. Mary Mitry)"
                          style={{ flex: 2, padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }}
                        />
                        <input
                          type="text"
                          value={quickServantPasscode}
                          onChange={(e) => setQuickServantPasscode(e.target.value)}
                          placeholder="Passcode (default: 1234)"
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }}
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddServant}
                          disabled={quickServantLoading}
                          className="btn-glow"
                          style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', background: 'var(--gradient-vbt)', color: '#ffffff', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          {quickServantLoading ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setCreationStep(2)}
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={createEventLoading}
                        className="btn-glow"
                        style={{
                          flex: 1, padding: '12px', borderRadius: '10px',
                          background: 'var(--gradient-vbt)', border: 'none', color: '#ffffff',
                          fontFamily: 'var(--font-title)', fontWeight: '800', fontSize: '0.9rem',
                          cursor: createEventLoading ? 'not-allowed' : 'pointer', opacity: createEventLoading ? 0.7 : 1,
                          boxShadow: '0 4px 15px rgba(124,58,237,0.3)'
                        }}
                      >
                        {createEventLoading ? 'Creating...' : '🚀 Create & Join Event'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {showServiceRequestModal && (
          <div
            className="more-drawer-overlay"
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5, 7, 20, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 1500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              className="glass-panel"
              style={{
                width: '100%',
                maxWidth: '560px',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '28px',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                borderRadius: '24px',
                background: 'rgba(15, 23, 42, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowServiceRequestModal(false)}
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(255,255,255,0.05)', border: 'none',
                  color: '#94a3b8', width: '32px', height: '32px',
                  borderRadius: '50%', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>

              {requestSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2rem', color: '#4ade80', marginBottom: '8px'
                  }}>
                    ✓
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: '800', margin: 0, fontFamily: 'var(--font-title)' }}>
                    Request Submitted!
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0, maxWidth: '420px' }}>
                    Please Fill in all the details About your Service and after reviewing our availability a contact person from our team will Contact you Shortly. Looking Forward to serving with you.
                  </p>
                  <button
                    onClick={() => setShowServiceRequestModal(false)}
                    className="btn-glow"
                    style={{
                      marginTop: '16px', padding: '12px 32px', borderRadius: '12px', border: 'none',
                      background: 'var(--gradient-vbt)', color: '#ffffff', fontWeight: '800',
                      fontSize: '0.9rem', cursor: 'pointer'
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Header */}
                  <div>
                    <h2 style={{ fontSize: '1.3rem', color: '#ffffff', fontWeight: '800', margin: 0, fontFamily: 'var(--font-title)' }}>
                      ⛪ VBT Service Request
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                      Submit your service details to the VBT Camp Outreach Team.
                    </p>
                  </div>

                  {/* Progress Steps */}
                  <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', gap: '8px', padding: '4px 0' }}>
                    {[1, 2, 3, 4].map(s => (
                      <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                          height: '4px', borderRadius: '2px',
                          background: s <= serviceRequestStep ? 'var(--gradient-vbt)' : 'rgba(255,255,255,0.08)'
                        }} />
                        <span style={{
                          fontSize: '0.65rem', fontWeight: '700',
                          color: s === serviceRequestStep ? '#c4b5fd' : 'var(--text-muted)',
                          textAlign: 'center'
                        }}>
                          Step {s}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Form Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
                    {/* STEP 1: Church & Contact */}
                    {serviceRequestStep === 1 && (
                      <>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            SERVICE NAME & CHURCH
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. St. Mark Youth Service"
                            value={serviceRequestForm.churchName}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, churchName: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                            }}
                          />
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            CONTACT PERSON NAME
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Michael Mitry"
                            value={serviceRequestForm.contactName}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, contactName: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                            }}
                          />
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            CONTACT PERSON NUMBER
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g. +20 123 456 7890"
                            value={serviceRequestForm.contactNumber}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, contactNumber: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* STEP 2: Timing & Location */}
                    {serviceRequestStep === 2 && (
                      <>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            SERVICE LOCATION
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Church Playground / Sports Field"
                            value={serviceRequestForm.serviceLocation}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, serviceLocation: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                            }}
                          />
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            SERVICE DATE
                          </label>
                          <input
                            type="date"
                            value={serviceRequestForm.serviceDate}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, serviceDate: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                              colorScheme: 'dark'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                              START TIME
                            </label>
                            <input
                              type="time"
                              value={serviceRequestForm.serviceStartTime}
                              onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, serviceStartTime: e.target.value })}
                              style={{
                                padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                                colorScheme: 'dark'
                              }}
                            />
                          </div>

                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                              END TIME
                            </label>
                            <input
                              type="time"
                              value={serviceRequestForm.serviceEndTime}
                              onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, serviceEndTime: e.target.value })}
                              style={{
                                padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                                colorScheme: 'dark'
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* STEP 3: Target Group & Topic */}
                    {serviceRequestStep === 3 && (
                      <>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            TOPIC OR THEME (MAIN MESSAGE)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Describe the main spiritual message or spiritual target of the service..."
                            value={serviceRequestForm.serviceTopic}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, serviceTopic: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                              resize: 'vertical', fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                              GENDER GRP
                            </label>
                            <select
                              value={serviceRequestForm.targetGender}
                              onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, targetGender: e.target.value })}
                              style={{
                                padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="Mix">Mix</option>
                              <option value="Girls">Girls</option>
                              <option value="Boys">Boys</option>
                            </select>
                          </div>

                          <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                              AGE OR GRADE
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Grades 3-6 / Age 8-12"
                              value={serviceRequestForm.targetAgeGrade}
                              onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, targetAgeGrade: e.target.value })}
                              style={{
                                padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                                border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            ESTIMATED NUMBER OF PARTICIPANTS
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 50 kids"
                            value={serviceRequestForm.participantsCount}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, participantsCount: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* STEP 4: Teams & Servants */}
                    {serviceRequestStep === 4 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                              ALREADY SPLIT IN TEAMS?
                            </label>
                            <select
                              value={serviceRequestForm.alreadySplitTeams}
                              onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, alreadySplitTeams: e.target.value })}
                              style={{
                                padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </div>

                          {serviceRequestForm.alreadySplitTeams === 'yes' && (
                            <div className="form-group" style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                HOW MANY TEAMS?
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 4 teams"
                                value={serviceRequestForm.teamsCount}
                                onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, teamsCount: e.target.value })}
                                style={{
                                  padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                              NEED SPECIFIC NUMBER OF SERVANTS?
                            </label>
                            <select
                              value={serviceRequestForm.needSpecificServantsCount}
                              onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, needSpecificServantsCount: e.target.value })}
                              style={{
                                padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </select>
                          </div>

                          {serviceRequestForm.needSpecificServantsCount === 'yes' && (
                            <div className="form-group" style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                SPECIFY NUMBER OF SERVANTS
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. 10 servants"
                                value={serviceRequestForm.servantsCount}
                                onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, servantsCount: e.target.value })}
                                style={{
                                  padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                            WILL YOUR SERVANTS BE AVAILABLE TO HELP OUR TEAM?
                          </label>
                          <select
                            value={serviceRequestForm.servantsAvailableHelping}
                            onChange={(e) => setServiceRequestForm({ ...serviceRequestForm, servantsAvailableHelping: e.target.value })}
                            style={{
                              padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.88rem', outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '16px' }}>
                    {serviceRequestStep > 1 ? (
                      <button
                        onClick={() => setServiceRequestStep(s => s - 1)}
                        style={{
                          padding: '10px 20px', borderRadius: '10px',
                          border: '1px solid var(--border-light)', background: 'transparent',
                          color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer'
                        }}
                      >
                        Back
                      </button>
                    ) : (
                      <div />
                    )}

                    {serviceRequestStep < 4 ? (
                      <button
                        onClick={() => {
                          // Basic validation
                          if (serviceRequestStep === 1) {
                            if (!serviceRequestForm.churchName || !serviceRequestForm.contactName || !serviceRequestForm.contactNumber) {
                              alert("Please fill in all contact details.");
                              return;
                            }
                          } else if (serviceRequestStep === 2) {
                            if (!serviceRequestForm.serviceLocation || !serviceRequestForm.serviceDate || !serviceRequestForm.serviceStartTime || !serviceRequestForm.serviceEndTime) {
                              alert("Please fill in location and schedule details.");
                              return;
                            }
                          }
                          setServiceRequestStep(s => s + 1);
                        }}
                        className="btn-glow"
                        style={{
                          padding: '10px 24px', borderRadius: '10px', border: 'none',
                          background: 'var(--gradient-vbt)', color: '#ffffff', fontWeight: '800',
                          fontSize: '0.85rem', cursor: 'pointer'
                        }}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setRequestSubmitting(true);
                          try {
                            await submitServiceRequest(serviceRequestForm);
                            setRequestSuccess(true);
                            // Play sound if possible
                            try {
                              playChime('announcement');
                            } catch (e) {}
                          } catch (err) {
                            alert("Failed to submit request. Please try again.");
                          } finally {
                            setRequestSubmitting(false);
                          }
                        }}
                        disabled={requestSubmitting}
                        className="btn-glow"
                        style={{
                          padding: '10px 24px', borderRadius: '10px', border: 'none',
                          background: 'rgba(34,197,94,0.85)', color: '#ffffff', fontWeight: '800',
                          fontSize: '0.85rem', cursor: requestSubmitting ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {requestSubmitting ? 'Submitting...' : 'Submit Request'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <RoleLogin 
        eventConfig={eventConfig} 
        globalServants={globalServants} 
        onLogin={handleLogin}
        onLogout={handleLeaveEvent}
        currentUser={currentUser}
        loginError={loginError}
        setLoginError={setLoginError}
      />
    );
  }

  // Central mode-aware label map
  // All user-visible naming derives from eventConfig.eventType so it stays
  // consistent across tabs, headings, and the More drawer.
  const eventType = eventConfig?.eventType || 'camp';
  const eventLabels = {
    // Prefix used in compound names: 'Camp ', 'Service ', or ''
    prefix: eventType === 'camp' ? 'Camp ' : eventType === 'service' ? 'Service ' : '',
    // Nav / tab bar labels
    scores:    eventType === 'camp' ? 'Camp Scores'    : eventType === 'service' ? 'Service Scores'    : 'Scores',
    schedule:  eventType === 'camp' ? 'Schedule'       : eventType === 'service' ? 'Schedule'          : 'Schedule',
    feed:      eventType === 'camp' ? 'Camp Feed'      : eventType === 'service' ? 'Service Feed'      : 'Feed',
    // Short tab label (fits on nav bar)
    scoresShort:   eventType === 'camp' ? 'Scores'  : eventType === 'service' ? 'Scores'  : 'Scores',
    scheduleShort: 'Schedule',
    feedShort:     eventType === 'camp' ? 'Feed'    : eventType === 'service' ? 'Feed'    : 'Feed',
    // Section headings (used inside tab content)
    scoreboardHeading: eventType === 'camp' ? 'Camp Scoreboard'    : eventType === 'service' ? 'Service Scoreboard'    : 'Scoreboard',
    feedHeading:       eventType === 'camp' ? 'Live Camp Feed'     : eventType === 'service' ? 'Live Service Feed'     : 'Live Feed',
    // Misc
    rateBtn:   eventType === 'service' ? "Rate Today's Service" : eventType === 'camp' ? "Rate Today's Camp" : 'Share Feedback',
  };

  const totalBothSides = scoreCalculations.shakesFinal + scoreCalculations.friesFinal;
  const shakesPercentage = totalBothSides > 0 ? (scoreCalculations.shakesFinal / totalBothSides) * 100 : 50;
  const friesPercentage = totalBothSides > 0 ? (scoreCalculations.friesFinal / totalBothSides) * 100 : 50;

  const activeUiMode = (currentUser?.id && globalServants.find(s => s.id === currentUser.id)?.uiMode) || currentUser?.uiMode || 'detailed';

  if (currentUser && (currentUser.uiMode === 'dumb' || activeUiMode === 'dumb')) {
    return (
      <DumbDashboard
        currentUser={currentUser}
        activeEventCode={currentEventCode}
        eventConfig={eventConfig}
        campData={{ ...campData, campState }}
        activeScheduleItem={currentActiveSlot}
        standings={scoreCalculations}
        onLogout={handleLogout}
        onSubmitDeduction={handleDumbSubmitDeduction}
        onSubmitScore={handleDumbSubmitScore}
        onPostAnnouncement={async (text) => {
          if (text.trim()) {
            await addAnnouncement(currentEventCode, text, currentUser.name, 'announcement', null, currentUser.role);
            await triggerRemotePushNotification(`${eventConfig.eventName}: ${currentUser.name}`, text);
          }
        }}
        announcements={announcements}
        urgentAlert={urgentAlert}
        activePingAlert={activePingAlert}
        onToggleUiMode={handleToggleUiMode}

        // Feed Tab Props
        announcementText={announcementText}
        uploadImage={uploadImage}
        fileInputRef={fileInputRef}
        eventLabels={eventLabels}
        firebaseConnected={firebaseConnected}
        setShowFeedbackModal={setShowFeedbackModal}
        setAnnouncementText={setAnnouncementText}
        setUploadImage={setUploadImage}

        // Scoreboard Tab Props
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
    );
  }


  const getActiveTabs = () => {
    if (!currentUser) return [];
    const role = currentUser.role || 'volunteer';
    const isAdmin = role === 'admin' || role === 'coordinator';
    const isLeader = role === 'leader';
    const isReferee = role === 'referee';
    const unread = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;

    if (eventConfig?.eventType === 'service') {
      if (isReferee) return [
        { id: 'service', label: 'My Games', icon: BookOpen },
        { id: 'scoreboard', label: 'Scores', icon: Trophy },
        { id: 'info', label: 'Map', icon: MapIcon },
        { id: 'walkie', label: 'Radio', icon: Radio },
        { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },
      ];
      if (!isAdmin && !isLeader) return [
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'service', label: 'My Games', icon: BookOpen },
        { id: 'info', label: 'Map', icon: MapIcon },
        { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },
      ];
      // Admin/Leader: Exactly 5 tabs. Scores and Map are accessed via the More drawer.
      return [
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'service', label: 'My Games', icon: BookOpen },
        { id: 'walkie', label: 'Radio', icon: Radio },
        { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },
        { id: 'more', label: 'More', icon: MoreHorizontal },
      ];
    }

    // Normal / Camp Mode
    if (isReferee) return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'info', label: 'Map', icon: MapIcon },
      { id: 'walkie', label: 'Radio', icon: Radio },
    ];
    if (!isAdmin && !isLeader) return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'info', label: 'Map', icon: MapIcon },
      { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },
    ];
    // Admin/Leader: Exactly 5 tabs. Map is accessed via the More drawer.
    return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'walkie', label: 'Radio', icon: Radio },
      { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },
      { id: 'more', label: 'More', icon: MoreHorizontal },
    ];
  };

  const isReferee = currentUser && currentUser.role === 'referee';
  const getRefereeAssignedGame = () => {
    if (!currentUser || currentUser.role !== 'referee') return null;
    const roleCode = currentUser.roleCode || eventConfig.servantAssignments?.[currentUser.id];
    if (roleCode) {
      if (roleCode.startsWith('station_')) {
        return eventConfig.stations?.[roleCode]?.name || null;
      } else if (roleCode.startsWith('big_game_')) {
        return eventConfig.bigGameName || 'Loyalty (Big Game)';
      } else if (roleCode === 'reflection') {
        return eventConfig.reflectionName || 'Reflection';
      }
    }
    return currentUser.assignedGame || currentUser.game || null;
  };

  return (
    <>
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Visual Ping Overlay (legacy) */}
      {activePingAlert.show && (
        <div style={{
          position: 'fixed',
          top: 'calc(20px + env(safe-area-inset-top, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '500px',
          zIndex: 1000,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(13, 20, 38, 0.95) 100%)',
          border: '2px solid rgba(251, 191, 36, 0.8)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 20px rgba(239, 68, 68, 0.4)',
          animation: 'pulse-glow 1.5s infinite',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ fontSize: '2rem' }}>🔔</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', color: '#fbbf24', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
              ROUND SYNC ALERT
            </h4>
            <p style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, lineHeight: '1.4' }}>
              {activePingAlert.text}
            </p>
          </div>
        </div>
      )}
      {/* New Alert Banner System */}
      <div style={{ transform: urgentAlert.show ? 'translateY(0)' : 'translateY(-100%)', transition: 'transform 0.3s ease', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <AlertBanner
          alert={urgentAlert}
          onDismiss={() => setUrgentAlert({ show: false, text: '', type: 'urgent', timestamp: '' })}
          isAdmin={canCreateAlert(currentUser)}
          onCreateAlert={async (text) => {
            setUrgentAlert({ show: true, text, type: 'urgent', timestamp: new Date().toISOString() });
            await addAnnouncement(currentEventCode, `🚨 URGENT: ${text}`, currentUser?.name || 'Admin', 'ping');
            await triggerRemotePushNotification("🚨 URGENT ALERT", text);
          }}
        />
      </div>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: '#0d1426',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <div className="header-container" style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div className="header-branding" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={eventConfig.logoUrl || '/Final VBT Re-Branding 2026-02 (3).png'} alt="Logo" style={{ height: '32px', width: 'auto' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.1, margin: 0 }}>{eventConfig.eventName || 'VBT CAMP'}</h2>
                <HeaderCountdownBadge
                  getEventTimeRange={getEventTimeRange}
                  getEventCurrentDay={getEventCurrentDay}
                  parseTimeToMs={parseTimeToMs}
                  getEffectiveTimeShift={getEffectiveTimeShift}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className={`live-dot`} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Live Syncing</span>
                </div>
                
                
              </div>
            </div>
          </div>
          
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

              {/* User Avatar */}
              <button
                onClick={() => setShowMoreDrawer(true)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--vbt-sky) 0%, var(--vbt-blue) 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(41, 182, 246, 0.3)',
                  transition: 'transform 0.2s'
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </button>

            

            
            {/* Notification Permission Request */}
            {('Notification' in window) && (
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    const uid  = currentUser?.id || currentUser?.uid || currentUser?.name || 'user';
                    const name = currentUser?.name || 'Unknown';
                    const role = currentUser?.role || 'viewer';
                    try {
                      await subscribeToWebPush(uid, name, role);
                      await setupPushNotifications(currentUser, WEBPUSH_VAPID_KEY);
                      alert("Notifications active & registered! You will receive all camp chimes and sync alerts.");
                    } catch (err) {
                      alert("Registered but subscription warning: " + err.message);
                    }
                  } else {
                    alert("Permission denied. To enable notifications, go to your iPhone Settings -> Safari -> Page Settings.");
                  }
                }}
                style={{
                  background: Notification.permission === 'granted' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                  border: Notification.permission === 'granted' ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                  color: Notification.permission === 'granted' ? '#22c55e' : '#fbbf24',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                title={Notification.permission === 'granted' ? "Notifications Active (Click to Force Resubscribe)" : "Enable Alerts"}
                aria-label="Notifications"
              >
                <Bell size={16} style={Notification.permission === 'granted' ? {} : { animation: 'pulse-glow 1.5s infinite' }} />
              </button>
            )}
            
          </div>
        </div>
      </header>

      {/* Content tabs */}
      <main className="content-area animate-fade">
        <React.Suspense fallback={<div className="skeleton" style={{ height: '80vh', margin: '16px', borderRadius: '12px' }}></div>}>
        {currentUser?.role === 'leader' && (
          <div className="glass-panel animate-fade" style={{
            padding: '24px',
            marginBottom: '16px',
            border: `2px solid ${getTeamColorHex(currentUser.side)}`,
            borderRadius: '16px',
            background: `linear-gradient(135deg, rgba(13,20,38,0.65), rgba(13,20,38,0.45))`,
            boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 15px ${getTeamColorHex(currentUser.side)}44`,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Soft background glow */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: getTeamColorHex(currentUser.side),
              filter: 'blur(60px)',
              opacity: 0.15,
              zIndex: 0,
              pointerEvents: 'none'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '6px'
              }}>
                Welcome back, Team Leader!
              </span>
              <h1 style={{
                fontSize: '2.25rem',
                fontWeight: '900',
                margin: 0,
                color: '#ffffff',
                fontFamily: 'var(--font-title)',
                textShadow: `0 0 12px ${getTeamColorHex(currentUser.side)}ff, 0 0 4px ${getTeamColorHex(currentUser.side)}aa`,
                letterSpacing: '-0.02em',
                lineHeight: '1.2'
              }}>
                {currentUser.name || 'Team Leader'}
              </h1>
              <span style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: '800',
                background: `${getTeamColorHex(currentUser.side)}22`,
                border: `1px solid ${getTeamColorHex(currentUser.side)}55`,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {(currentUser.teamCode || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>
          </div>
        )}
        
        {/* Tab 1: Scoreboard Accordions */}
        {currentTab === 'scoreboard' && (
          <ScoreboardTab
            eventConfig={eventConfig}
            scoreCalculations={scoreCalculations}
            campData={campData}
            campState={campState}
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
        )}
        {/* Tab 2: My Team Personalized Stats */}
        {currentTab === 'myteam' && myTeamInfo && (
          <MyTeamTab
            currentUser={currentUser}
            myTeamInfo={myTeamInfo}
            scoreCalculations={scoreCalculations}
            getTeamColorHex={getTeamColorHex}
            eventConfig={eventConfig}
            isMobile={isMobile}
          />
        )}
        {/* Tab 3: Full Schedule filterable */}
        {currentTab === 'schedule' && (
          <ScheduleTab
            currentUser={currentUser}
            eventConfig={eventConfig}
            campData={campData}
            campState={campState}
            daysCount={daysCount}
            scheduleFilter={scheduleFilter}
            scheduleBlockFilter={scheduleBlockFilter}
            scheduleTeamFilter={scheduleTeamFilter}
            scheduleDayFilter={scheduleDayFilter}
            scheduleSortMode={scheduleSortMode}
            filteredMatchups={filteredMatchups}
            isReferee={isReferee}
            showFullSchedule={showFullSchedule}
            eventLabels={eventLabels}
            isWhereIsEveryoneCollapsed={isWhereIsEveryoneCollapsed}
            isRosterCollapsed={isRosterCollapsed}
            rosterSearch={rosterSearch}
            refereeSelectedGame={refereeSelectedGame}
            globalServants={globalServants}
            liveLocationStatus={liveLocationStatus}
            currentEventCode={currentEventCode}
            getTeamColorHex={getTeamColorHex}
            getEffectiveTimeShift={getEffectiveTimeShift}
            getShiftedTimeStr={getShiftedTimeStr}
            getEventCurrentDay={getEventCurrentDay}
            parseTimeToMs={parseTimeToMs}
            getEventTimeRange={getEventTimeRange}
            getActiveSlotProgress={getActiveSlotProgress}
            isTimeSlotActive={isTimeSlotActive}
            canControlStopwatch={canControlStopwatch}
            getRefereeAssignedGame={getRefereeAssignedGame}
            handleToggleTimer={handleToggleTimer}
            handleAdjustTimeShift={handleAdjustTimeShift}
            handleResetTimeShift={handleResetTimeShift}
            handleStartMatchupTimer={handleStartMatchupTimer}
            handleStopMatchupTimer={handleStopMatchupTimer}
            handleResetMatchupTimer={handleResetMatchupTimer}
            handleUpdateMatchupScore={handleUpdateMatchupScore}
            handleToggleWinner={handleToggleWinner}
            addAnnouncement={addAnnouncement}
            triggerRemotePushNotification={triggerRemotePushNotification}
            setIsWhereIsEveryoneCollapsed={setIsWhereIsEveryoneCollapsed}
            setIsRosterCollapsed={setIsRosterCollapsed}
            setRosterSearch={setRosterSearch}
            setRefereeSelectedGame={setRefereeSelectedGame}
            setShowFullSchedule={setShowFullSchedule}
            setScheduleFilter={setScheduleFilter}
            setScheduleBlockFilter={setScheduleBlockFilter}
            setScheduleTeamFilter={setScheduleTeamFilter}
            setScheduleDayFilter={setScheduleDayFilter}
            setScheduleSortMode={setScheduleSortMode}
            setCurrentUser={setCurrentUser}
          />
        )}
        {/* Tab 4: Live Timeline / Notifications */}
        {currentTab === 'timeline' && (
          <TimelineFeedTab
            announcements={announcements}
            announcementText={announcementText}
            uploadImage={uploadImage}
            fileInputRef={fileInputRef}
            currentUser={currentUser}
            currentEventCode={currentEventCode}
            eventLabels={eventLabels}
            firebaseConnected={firebaseConnected}
            setShowFeedbackModal={setShowFeedbackModal}
            setAnnouncementText={setAnnouncementText}
            setUploadImage={setUploadImage}
            handlePostAnnouncement={handlePostAnnouncement}
            handleImageChange={handleImageChange}
            handleToggleReaction={handleToggleReaction}
            addAnnouncement={addAnnouncement}
            updateAnnouncementReactions={updateAnnouncementReactions}
          />
        )}
        {/* Tab 5: Stats & Deductions */}
        {currentTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="toggle-group" style={{ marginBottom: '4px' }}>
              <button 
                type="button"
                className={`toggle-btn ${statsSubTab === 'charts' ? 'active' : ''}`}
                onClick={() => setStatsSubTab('charts')}
              >
                <BarChart3 size={14} /> Analytics Charts
              </button>
              {currentUser.role !== 'referee' && (
                <button 
                  type="button"
                  className={`toggle-btn ${statsSubTab === 'deductions' ? 'active' : ''}`}
                  onClick={() => setStatsSubTab('deductions')}
                >
                  <TrendingDown size={14} /> Point Deductions
                </button>
              )}
            </div>

            {statsSubTab === 'charts' && (() => {
              const b1 = scoreCalculations.b1;
              const b2 = scoreCalculations.b2;
              const b3 = scoreCalculations.b3;
              const b4 = scoreCalculations.b4;
              const trendData = eventConfig.eventType === 'service' ? [
                { name: 'Start', Red: 0, White: 0, Black: 0, Blue: 0 },
                { name: 'Block 1', Red: b1?.Red || 0, White: b1?.White || 0, Black: b1?.Black || 0, Blue: b1?.Blue || 0 },
                { name: 'Block 2', Red: (b1?.Red || 0) + (b2?.Red || 0), White: (b1?.White || 0) + (b2?.White || 0), Black: (b1?.Black || 0) + (b2?.Black || 0), Blue: (b1?.Blue || 0) + (b2?.Blue || 0) },
                { name: 'Block 3', Red: (b1?.Red || 0) + (b2?.Red || 0) + (b3?.Red || 0), White: (b1?.White || 0) + (b2?.White || 0) + (b3?.White || 0), Black: (b1?.Black || 0) + (b2?.Black || 0) + (b3?.Black || 0), Blue: (b1?.Blue || 0) + (b2?.Blue || 0) + (b3?.Blue || 0) },
                { name: 'Block 4', Red: scoreCalculations.wins?.Red || 0, White: scoreCalculations.wins?.White || 0, Black: scoreCalculations.wins?.Black || 0, Blue: scoreCalculations.wins?.Blue || 0 }
              ] : [
                { name: 'Start', shakes: 0, fries: 0 },
                { name: 'Block 1', shakes: b1?.shakes || 0, fries: b1?.fries || 0 },
                { name: 'Block 2', shakes: (b1?.shakes || 0) + (b2?.shakes || 0), fries: (b1?.fries || 0) + (b2?.fries || 0) },
                { name: 'Block 3', shakes: (b1?.shakes || 0) + (b2?.shakes || 0) + (b3?.shakes || 0), fries: (b1?.fries || 0) + (b2?.fries || 0) + (b3?.fries || 0) },
                { name: 'Block 4', shakes: scoreCalculations.shakesBlocksTotal || 0, fries: scoreCalculations.friesBlocksTotal || 0 }
              ];

              const width = 320;
              const height = 180;
              const paddingLeft = 35;
              const paddingRight = 15;
              const paddingTop = 20;
              const paddingBottom = 25;
              
              const chartWidth = width - paddingLeft - paddingRight;
              const chartHeight = height - paddingTop - paddingBottom;
              
              const maxScore = eventConfig.eventType === 'service'
                ? Math.max(100, ...Object.values(scoreCalculations.wins || {}))
                : Math.max(100, scoreCalculations.shakesBlocksTotal || 0, scoreCalculations.friesBlocksTotal || 0);
              const scaleY = (val) => height - paddingBottom - (val * chartHeight / maxScore);
              const scaleX = (idx) => paddingLeft + (idx * chartWidth / 4);
              
              const shakesPoints = eventConfig.eventType === 'service' ? '' : trendData.map((d, i) => `${scaleX(i)},${scaleY(d.shakes)}`).join(' ');
              const friesPoints = eventConfig.eventType === 'service' ? '' : trendData.map((d, i) => `${scaleX(i)},${scaleY(d.fries)}`).join(' ');

              const teamsWithDeductions = Object.entries(campState.teamDeductions || {})
                .map(([code, val]) => ({
                  code,
                  val,
                  side: campData?.teams?.[code]?.side || 'Shakes'
                }))
                .filter(t => t.val > 0)
                .sort((a, b) => b.val - a.val);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '12px', textAlign: 'center' }}>Cumulative Score Progression</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                        {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                          const val = Math.round(maxScore * ratio);
                          const y = scaleY(val);
                          return (
                            <g key={idx}>
                              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                              <text x={paddingLeft - 8} y={y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end">{val}</text>
                            </g>
                          );
                        })}
                        {trendData.map((d, i) => (
                          <text key={i} x={scaleX(i)} y={height - 6} fill="var(--text-muted)" fontSize="9" textAnchor="middle">{d.name}</text>
                        ))}
                        {trendData.map((d, i) => {
                          if (eventConfig.eventType === 'service') {
                            const colors = ['Red', 'White', 'Black', 'Blue'];
                            return (
                              <g key={i}>
                                {colors.map((colorName, cIdx) => {
                                  const val = d[colorName] || 0;
                                  const colorHex = getTeamColorHex(colorName);
                                  const barHeight = Math.max(0, height - paddingBottom - scaleY(val));
                                  const barX = scaleX(i) - 13 + cIdx * 7;
                                  return val > 0 ? (
                                    <rect
                                      key={colorName}
                                      x={barX}
                                      y={scaleY(val)}
                                      width="5"
                                      height={barHeight}
                                      fill={colorHex}
                                      rx="1"
                                    />
                                  ) : null;
                                })}
                              </g>
                            );
                          } else {
                            const shakesHeight = Math.max(0, height - paddingBottom - scaleY(d.shakes));
                            const friesHeight = Math.max(0, height - paddingBottom - scaleY(d.fries));
                            return (
                              <g key={i}>
                                {/* Shakes Bar */}
                                {d.shakes > 0 && (
                                  <rect 
                                    x={scaleX(i) - 13} 
                                    y={scaleY(d.shakes)} 
                                    width="10" 
                                    height={shakesHeight} 
                                    fill="var(--color-shakes)" 
                                    rx="2" 
                                  />
                                )}
                                {/* Fries Bar */}
                                {d.fries > 0 && (
                                  <rect 
                                    x={scaleX(i) + 3} 
                                    y={scaleY(d.fries)} 
                                    width="10" 
                                    height={friesHeight} 
                                    fill="var(--color-fries)" 
                                    rx="2" 
                                  />
                                )}
                              </g>
                            );
                          }
                        })}
                      </svg>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {eventConfig.eventType !== 'normal' ? (
                        ['Red', 'White', 'Black', 'Blue'].map(colorName => {
                          const customName = eventConfig.teamNames?.[colorName.toLowerCase()] || colorName;
                          const colorHex = getTeamColorHex(colorName);
                          return (
                            <div key={colorName} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: colorHex }}>
                              <span style={{ width: '12px', height: '3px', background: colorHex, display: 'inline-block' }} /> {customName}
                            </div>
                          );
                        })
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-shakes)' }}>
                            <span style={{ width: '12px', height: '3px', background: 'var(--color-shakes)', display: 'inline-block' }} /> {side1Name} Side
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-fries)' }}>
                            <span style={{ width: '12px', height: '3px', background: 'var(--color-fries)', display: 'inline-block' }} /> {side2Name} Side
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '12px', textAlign: 'center' }}>Deductions Leaderboard (Points Lost)</h3>
                    {teamsWithDeductions.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '16px' }}>
                        🎉 Amazing! No team point deductions logged yet.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {teamsWithDeductions.map(team => {
                          const maxDeductVal = Math.max(...teamsWithDeductions.map(t => t.val));
                          const barWidthPercent = (team.val / maxDeductVal) * 80;
                          return (
                            <div key={team.code} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                              <span style={{ width: '45px', fontWeight: '700', color: '#ffffff' }}>{team.code}</span>
                              <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '4px', height: '14px', marginRight: '8px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${barWidthPercent}%`,
                                  height: '100%',
                                  background: eventConfig.eventType === 'service' ? getTeamColorHex(team.side) : (team.side === 'Shakes' ? 'var(--gradient-shakes)' : 'var(--gradient-fries)'),
                                  borderRadius: '4px',
                                  transition: 'width 0.5s ease'
                                }} />
                              </div>
                              <span style={{ fontWeight: '800', color: '#ef4444', width: '25px', textAlign: 'right' }}>-{team.val}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Enhanced Analytics Charts Component */}
            {statsSubTab === 'charts' && (
              <StandingsAnalytics
                campState={campState}
                campData={campData}
                eventConfig={eventConfig}
              />
            )}

            {statsSubTab === 'deductions' && currentUser.role !== 'referee' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Team Point Deductions</h2>

                {currentUser && (
                  <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                      <span style={{ fontSize: '1rem' }}>📝</span>
                      <span>
                        {currentUser.role === 'admin' 
                          ? "<strong>Coordinator View:</strong> You can adjust point deductions for any team using the + and - buttons (up to a maximum of 10 points per team)."
                          : "<strong>Team Leader View:</strong> You can adjust point deductions for your own team only. Other teams' deduction buttons are locked."
                        }
                      </span>
                    </p>
                  </div>
                )}

                {eventConfig.eventType !== 'normal' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {['Red', 'White', 'Black', 'Blue'].map(colorName => {
                      const colorHex = getTeamColorHex(colorName);
                      const customColorName = eventConfig.teamNames?.[colorName.toLowerCase()] || colorName;
                      const colorDeductions = scoreCalculations.deductions[colorName] || 0;
                      const colorTeams = Object.keys(campData?.teams || {}).filter(code => campData?.teams?.[code]?.side === colorName);
                      
                      return (
                        <div key={colorName} className="glass-panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.25)', borderLeft: `4px solid ${colorHex}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <h3 style={{ fontSize: '0.85rem', color: colorHex, textTransform: 'uppercase', fontWeight: '700', textAlign: 'center', borderBottom: `1px solid ${colorHex}33`, paddingBottom: '6px' }}>
                            {customColorName} (-{colorDeductions})
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {colorTeams.length === 0 ? (
                              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0' }}>No active teams</p>
                            ) : (
                              colorTeams.map(code => {
                                const team = campData?.teams?.[code] || {};
                                const dVal = (campState.teamDeductions || {})[code] || 0;
                                const canEdit = currentUser.role === 'admin' || (currentUser.role === 'leader' && currentUser.teamCode === code);
                                return (
                                  <div key={code} style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}>
                                    <div style={{ minWidth: 0, flex: 1, marginRight: '4px' }}>
                                      <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{code}</p>
                                      <p style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{team.leaders?.split('/')[0] || ''}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: dVal > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                        -{dVal}
                                      </span>
                                      {canEdit && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <button 
                                            onClick={() => handleAdjustDeduction(code, 1)} 
                                            disabled={dVal >= 10}
                                            style={{ 
                                              padding: '2px', 
                                              border: 'none', 
                                              background: dVal >= 10 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.05)', 
                                              color: dVal >= 10 ? 'rgba(255,255,255,0.15)' : '#ffffff', 
                                              borderRadius: '3px', 
                                              cursor: dVal >= 10 ? 'not-allowed' : 'pointer' 
                                            }}
                                          >
                                            <Plus size={10} />
                                          </button>
                                          <button 
                                            onClick={() => handleAdjustDeduction(code, -1)} 
                                            disabled={dVal <= 0}
                                            style={{ 
                                              padding: '2px', 
                                              border: 'none', 
                                              background: dVal <= 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.05)', 
                                              color: dVal <= 0 ? 'rgba(255,255,255,0.15)' : '#ffffff', 
                                              borderRadius: '3px', 
                                              cursor: dVal <= 0 ? 'not-allowed' : 'pointer' 
                                            }}
                                          >
                                            <Minus size={10} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Shakes side */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h3 style={{ fontSize: '0.85rem', color: 'var(--color-shakes)', textTransform: 'uppercase', fontWeight: '700', textAlign: 'center', borderBottom: '1px solid rgba(0, 176, 255, 0.2)', paddingBottom: '6px' }}>
                        {side1Name} (-{scoreCalculations.shakesDeductions})
                      </h3>
                      {Object.keys(campData?.teams || {}).filter(code => campData?.teams?.[code]?.side === 'Shakes').map(code => {
                        const team = campData?.teams?.[code] || {};
                        const dVal = (campState.teamDeductions || {})[code] || 0;
                        const canEdit = currentUser.role === 'admin' || (currentUser.role === 'leader' && currentUser.teamCode === code);
                        return (
                          <div key={code} className="glass-panel glass-card-shakes" style={{ padding: '10px', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{code}</p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{team.leaders ? team.leaders.split('/')[0] : ''}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: dVal > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                  -{dVal}
                                </span>
                                {canEdit && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button 
                                      onClick={() => handleAdjustDeduction(code, 1)} 
                                      disabled={dVal >= 10}
                                      style={{ 
                                        padding: '2px', 
                                        border: 'none', 
                                        background: dVal >= 10 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.05)', 
                                        color: dVal >= 10 ? 'rgba(255,255,255,0.15)' : '#ffffff', 
                                        borderRadius: '3px', 
                                        cursor: dVal >= 10 ? 'not-allowed' : 'pointer' 
                                      }}
                                    >
                                      <Plus size={10} />
                                    </button>
                                    <button 
                                      onClick={() => handleAdjustDeduction(code, -1)} 
                                      disabled={dVal <= 0}
                                      style={{ 
                                        padding: '2px', 
                                        border: 'none', 
                                        background: dVal <= 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.05)', 
                                        color: dVal <= 0 ? 'rgba(255,255,255,0.15)' : '#ffffff', 
                                        borderRadius: '3px', 
                                        cursor: dVal <= 0 ? 'not-allowed' : 'pointer' 
                                      }}
                                    >
                                      <Minus size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
   
                    {/* Fries side */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <h3 style={{ fontSize: '0.85rem', color: 'var(--color-fries)', textTransform: 'uppercase', fontWeight: '700', textAlign: 'center', borderBottom: '1px solid rgba(255, 145, 0, 0.2)', paddingBottom: '6px' }}>
                        {side2Name} (-{scoreCalculations.friesDeductions})
                      </h3>
                      {Object.keys(campData?.teams || {}).filter(code => campData?.teams?.[code]?.side === 'Fries').map(code => {
                        const team = campData?.teams?.[code] || {};
                        const dVal = (campState.teamDeductions || {})[code] || 0;
                        const canEdit = currentUser.role === 'admin' || (currentUser.role === 'leader' && currentUser.teamCode === code);
                        return (
                          <div key={code} className="glass-panel glass-card-fries" style={{ padding: '10px', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{code}</p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{team.leaders ? team.leaders.split('/')[0] : ''}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: dVal > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                  -{dVal}
                                </span>
                                {canEdit && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <button 
                                      onClick={() => handleAdjustDeduction(code, 1)} 
                                      disabled={dVal >= 10}
                                      style={{ 
                                        padding: '2px', 
                                        border: 'none', 
                                        background: dVal >= 10 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.05)', 
                                        color: dVal >= 10 ? 'rgba(255,255,255,0.15)' : '#ffffff', 
                                        borderRadius: '3px', 
                                        cursor: dVal >= 10 ? 'not-allowed' : 'pointer' 
                                      }}
                                    >
                                      <Plus size={10} />
                                    </button>
                                    <button 
                                      onClick={() => handleAdjustDeduction(code, -1)} 
                                      disabled={dVal <= 0}
                                      style={{ 
                                        padding: '2px', 
                                        border: 'none', 
                                        background: dVal <= 0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.05)', 
                                        color: dVal <= 0 ? 'rgba(255,255,255,0.15)' : '#ffffff', 
                                        borderRadius: '3px', 
                                        cursor: dVal <= 0 ? 'not-allowed' : 'pointer' 
                                      }}
                                    >
                                      <Minus size={10} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Interactive Info Panel (Map, FAQs, General Timeline) */}
        {currentTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Sub-tab selection */}
            <div className="toggle-group" style={{ marginBottom: '4px' }}>
              <button 
                className={`toggle-btn ${infoSubTab === 'map' ? 'active' : ''}`}
                onClick={() => setInfoSubTab('map')}
              >
                <MapIcon size={14} /> Map Key
              </button>
              <button 
                className={`toggle-btn ${infoSubTab === 'gps' ? 'active' : ''}`}
                onClick={() => setInfoSubTab('gps')}
              >
                <Navigation size={14} /> GPS Map
              </button>
              <button 
                className={`toggle-btn ${infoSubTab === 'faq' ? 'active' : ''}`}
                onClick={() => setInfoSubTab('faq')}
              >
                <HelpCircle size={14} /> FAQ and rules
              </button>
            </div>

            {/* Sub-tab Content: Map */}
            {infoSubTab === 'map' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Interactive SVG Map Component */}
                <InteractiveMap
                  liveLocationStatus={liveLocationStatus}
                  campData={campData}
                  campState={campState}
                  eventConfig={eventConfig}
                  getTeamColorHex={getTeamColorHex}
                  isServiceMode={eventConfig.eventType === 'service'}
                  mapConfig={mapConfig}
                  eventCode={currentEventCode}
                  currentUser={currentUser}
                />

                {/* Location Key Interactive List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#ffffff', paddingLeft: '4px' }}>Tap a Location to See Schedule</h3>
                  
                  {(eventConfig.locationKey || locationKey).map((loc, idx) => {
                    const isSelected = selectedMapLocation?.id === loc.id;
                    
                    return (
                      <div key={idx} className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div 
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(41, 182, 246, 0.08)' : 'rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderLeft: isSelected ? '4px solid var(--vbt-sky)' : 'none'
                          }}
                          onClick={() => setSelectedMapLocation(isSelected ? null : loc)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={16} style={{ color: isSelected ? 'var(--vbt-sky)' : 'var(--text-muted)' }} />
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>{loc.label}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {isSelected ? 'Collapse' : 'Tap to expand'}
                          </span>
                        </div>

                        {isSelected && (
                          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid var(--border-light)' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '600' }}>
                              Games hosted here: {loc.games.join(', ')}
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {mapLocationMatches.length === 0 ? (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No specific team matchups scheduled at this location.</p>
                              ) : (
                                mapLocationMatches.map((m, mIdx) => {
                                  const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
                                  const isActive = isTimeSlotActive(m.time, `Block ${m.block}`, mDay);
                                  return (
                                    <div 
                                      key={mIdx} 
                                      style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem',
                                        padding: '6px 8px',
                                        background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: '4px',
                                        border: isActive ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                                      }}
                                    >
                                      <span>{getEffectiveTimeShift() > 0 ? getShiftedTimeStr(m.time, getEffectiveTimeShift()) : m.time} (Block {m.block}){getEffectiveTimeShift() > 0 ? ` (+${getEffectiveTimeShift()}m)` : ''}</span>
                                      <span style={{ fontWeight: '700', color: '#ffffff' }}>{m.game}: {m.teamA || m.shakes} vs {m.teamB || m.fries}</span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

             {infoSubTab === 'gps' && (
               <GPSMap
                 eventCode={currentEventCode}
                 currentUser={currentUser}
                 campData={campData}
                 eventConfig={eventConfig}
                 getTeamColorHex={getTeamColorHex}
                 currentTime={Math.floor(Date.now() / 30000) * 30000}
                 liveLocationStatus={liveLocationStatus}
               />
             )}



            {/* Sub-tab Content: FAQs collapsible list */}
            {infoSubTab === 'faq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {faqsList.map((faq, idx) => {
                  const isOpen = !!expandedFaqs[idx];
                  return (
                    <div key={idx} className="glass-panel" style={{ overflow: 'hidden' }}>
                      <div 
                        style={{
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: isOpen ? 'rgba(255,255,255,0.02)' : 'transparent'
                        }}
                        onClick={() => toggleFaq(idx)}
                      >
                        <h4 style={{ fontSize: '0.875rem', color: '#ffffff', paddingRight: '12px' }}>{faq.q}</h4>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                      
                      {isOpen && (
                        <div style={{ 
                          padding: '16px', 
                          background: 'rgba(0,0,0,0.2)', 
                          borderTop: '1px solid var(--border-light)',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-line',
                          lineHeight: '1.6'
                        }}>
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentTab === 'walkie' && (
          <WalkieTalkie
            eventCode={currentEventCode}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'logistics' && (
          <LogisticsPanel
            eventCode={currentEventCode}
            currentUser={currentUser}
            eventConfig={eventConfig}
            campData={campData}
          />
        )}

        {currentTab === 'station_logistics' && (
          <LogisticsTab
            eventCode={currentEventCode}
            currentUser={currentUser}
          />
        )}

        {/* Tab 7: Settings */}
        {currentTab === 'settings' && currentUser && currentUser.role === 'admin' && (
          <SettingsTab
            currentUser={currentUser}
            isDarkMode={isDarkMode}
            settingsSubTab={settingsSubTab}
            eventConfig={eventConfig}
            serviceRequests={serviceRequests}
            savingEventConfig={savingEventConfig}
            currentEventCode={currentEventCode}
            campState={campState}
            campData={campData}
            editKidCount={editKidCount}
            editDaysCount={editDaysCount}
            editTeamRed={editTeamRed}
            editTeamWhite={editTeamWhite}
            editTeamBlack={editTeamBlack}
            editTeamBlue={editTeamBlue}
            editStations={editStations}
            editBigGameName={editBigGameName}
            editBigGameLocation={editBigGameLocation}
            editReflectionName={editReflectionName}
            editReflectionLocation={editReflectionLocation}
            editDefaultMatchupSortMode={editDefaultMatchupSortMode}
            editEventConfig={editEventConfig}
            globalServants={globalServants}
            editAttending={editAttending}
            editRoles={editRoles}
            quickServantName={quickServantName}
            quickServantPasscode={quickServantPasscode}
            quickServantLoading={quickServantLoading}
            isSyncing={isSyncing}
            syncStatus={syncStatus}
            syncError={syncError}
            appsScriptWebappUrl={appsScriptWebappUrl}
            isOfflineMode={isOfflineMode}
            side1Name={side1Name}
            side2Name={side2Name}
            rosterEditMode={rosterEditMode}
            editRoster={editRoster}
            savingRoster={savingRoster}
            settingsRequestFilter={settingsRequestFilter}
            settingsRequestSearch={settingsRequestSearch}
            expandedRequests={expandedRequests}
            isMobile={isMobile}
            announcements={announcements}
            auditLogFilter={auditLogFilter}
            expandedBlocks={expandedBlocks}
            expandedGames={expandedGames}
            uniqueGames={uniqueGames}
            showOnboardingTip={showOnboardingTip}
            setShowServantDirectoryModal={setShowServantDirectoryModal}
            setShowGamesLibraryModal={setShowGamesLibraryModal}
            setShowQRModal={setShowQRModal}
            setShowBackupModal={setShowBackupModal}
            setShowDebriefModal={setShowDebriefModal}
            handleTimerStart={handleTimerStart}
            setIsDarkMode={setIsDarkMode}
            setSettingsSubTab={setSettingsSubTab}
            updateEventConfig={updateEventConfig}
            setEventConfig={setEventConfig}
            setEditEventConfig={setEditEventConfig}
            handleUpdateCampState={handleUpdateCampState}
            updateScheduleMatchupTimes={updateScheduleMatchupTimes}
            handleAutoSaveRosterData={handleAutoSaveRosterData}
            setEditAttending={setEditAttending}
            setEditRoles={setEditRoles}
            setQuickServantName={setQuickServantName}
            setQuickServantPasscode={setQuickServantPasscode}
            handleQuickAddServant={handleQuickAddServant}
            handleSyncGoogleSheet={handleSyncGoogleSheet}
            setAppsScriptWebappUrl={setAppsScriptWebappUrl}
            setIsOfflineMode={setIsOfflineMode}
            handleAdjustTokens={handleAdjustTokens}
            handleOpenRosterEdit={handleOpenRosterEdit}
            handleRosterEntryChange={handleRosterEntryChange}
            handleRemoveRosterEntry={handleRemoveRosterEntry}
            handleAddRosterEntry={handleAddRosterEntry}
            handleSaveRoster={handleSaveRoster}
            setRosterEditMode={setRosterEditMode}
            handleSaveEventConfig={handleSaveEventConfig}
            handleLeaveEvent={handleLeaveEvent}
            setAuditLogFilter={setAuditLogFilter}
            setSettingsRequestFilter={setSettingsRequestFilter}
            setSettingsRequestSearch={setSettingsRequestSearch}
            setExpandedRequests={setExpandedRequests}
            setNewEventName={setNewEventName}
            setNewEventCode={setNewEventCode}
            setNewEventDate={setNewEventDate}
            setNewEventType={setNewEventType}
            setNewKidCount={setNewKidCount}
            setNewServiceBrief={setNewServiceBrief}
            setShowCreateEvent={setShowCreateEvent}
            setCreationStep={setCreationStep}
            setCurrentEventCode={setCurrentEventCode}
            playChime={playChime}
            handleSaveAndRegenerateSchedule={handleSaveAndRegenerateSchedule}
            updateServant={updateServant}
            handleLiveAutoAssign={handleLiveAutoAssign}
            getTeamColorHex={getTeamColorHex}
          />
        )}
        {/* Tab: Service */}
        {currentTab === 'service' && (
          <ServiceTab
            currentUser={currentUser}
            serviceData={serviceData}
            serviceEditMode={serviceEditMode}
            savingService={savingService}
            editServiceBrief={editServiceBrief}
            editGroups={editGroups}
            editGames={editGames}
            totalKids={totalKids}
            expandedServiceGame={expandedServiceGame}
            currentActiveSlot={currentActiveSlot}
            firebaseConnected={firebaseConnected}
            setEditServiceBrief={setEditServiceBrief}
            setEditGroups={setEditGroups}
            setEditGames={setEditGames}
            setServiceEditMode={setServiceEditMode}
            handleSaveServiceData={handleSaveServiceData}
            handleGroupChange={handleGroupChange}
            handleRemoveGroup={handleRemoveGroup}
            handleAddGroup={handleAddGroup}
            setExpandedServiceGame={setExpandedServiceGame}
            handleGameChange={handleGameChange}
            handleRemoveGame={handleRemoveGame}
            handleAddGame={handleAddGame}
          />
        )}
        </React.Suspense>
      </main>
    </div>
      {/* First-run onboarding tooltip */}
      {showOnboardingTip && currentUser && (() => {
        const role = currentUser.role;
        const isService = eventConfig?.eventType === 'service';
        let tipTab = 'schedule';
        let tipMsg = '';
        if (role === 'referee') {
          tipTab = isService ? 'service' : 'schedule';
          tipMsg = isService ? 'Your station & game assignments are here' : 'Your station & game assignments are here';
        } else if (role === 'leader') {
          tipTab = 'schedule';
          tipMsg = isService ? 'Your team schedule & assignments are here' : 'Your team score is tracked here';
        } else {
          tipTab = 'timeline';
          tipMsg = 'Announcements from coordinators appear here';
        }

        const tabs = getActiveTabs();
        const tipIdx = tabs.findIndex(t => t.id === tipTab);
        const totalTabs = tabs.length;
        const leftPct = tipIdx >= 0 ? (tipIdx + 0.5) / totalTabs * 100 : 50;

        return (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, pointerEvents: 'none' }}>
            <div style={{
              position: 'absolute',
              bottom: '72px',
              left: `clamp(8px, calc(${leftPct}% - 90px), calc(100vw - 196px))`,
              width: '180px',
              background: 'rgba(20, 65, 161, 0.97)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(41, 182, 246, 0.5)',
              borderRadius: '12px',
              padding: '10px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              pointerEvents: 'auto'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#ffffff', margin: '0 0 6px 0', fontWeight: '700', lineHeight: 1.3 }}>
                👆 {tipMsg}
              </p>
              <button
                onClick={() => {
                  setShowOnboardingTip(false);
                  try { localStorage.setItem('vbt_onboarded', 'true'); } catch(_) {}
                }}
                style={{
                  background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '6px',
                  color: '#ffffff', fontSize: '0.7rem', padding: '4px 10px',
                  cursor: 'pointer', fontWeight: '700'
                }}
              >
                Got it ✓
              </button>
              <div style={{
                position: 'absolute', bottom: '-8px', left: '20px',
                width: 0, height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid rgba(20, 65, 161, 0.97)'
              }} />
            </div>
          </div>
        );
      })()}

      {/* Navigation bar */}
      <nav className="mobile-nav-bar">
        {getActiveTabs().map((t) => {
          const Icon = t.icon;
          const mainTabIds = getActiveTabs().filter(tab => tab.id !== 'more').map(tab => tab.id);
          const isMoreActive = t.id === 'more' && !mainTabIds.includes(currentTab);
          const isActive = currentTab === t.id || isMoreActive;
          return (
            <button 
              key={t.id}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (t.id === 'more') {
                  setShowMoreDrawer(true);
                } else {
                  setCurrentTab(t.id);
                  if (t.id === 'timeline') {
                    const now = new Date().toISOString();
                    setLastSeenFeedTimestamp(now);
                    try { localStorage.setItem('vbt_last_seen_feed', now); } catch(_) {}
                  }
                  if (showOnboardingTip) {
                    setShowOnboardingTip(false);
                    try { localStorage.setItem('vbt_onboarded', 'true'); } catch(_) {}
                  }
                }
              }}
              aria-label={t.label}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} style={{ marginBottom: '2px' }} />
                {t.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-6px',
                    minWidth: '16px', height: '16px', padding: '0 4px',
                    background: '#ef4444', borderRadius: '8px',
                    fontSize: '0.6rem', fontWeight: '800', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
                  }}>
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
              </div>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* More Drawer Slide-up Sheet */}
      {showMoreDrawer && (
        <div
          className="more-drawer-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowMoreDrawer(false)}
        >
          <div
            className="more-drawer-content"
            style={{
              width: '100%',
              maxWidth: '500px',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '24px 24px 0 0',
              padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px)) 20px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle bar */}
            <div style={{ width: '36px', height: '4px', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '2px', margin: '0 auto 8px auto' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '1rem', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#ffffff' }}>More Options</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Logged in as {currentUser.name}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Quick Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {/* Event Mode Badge/Toggle Switch */}
                {(() => {
                  const isService = eventConfig.eventType === 'service';
                  const isNormal = eventConfig.eventType === 'normal';
                  const isAdmin = currentUser?.role === 'admin';
                  
                  return (
                    <button
                      onClick={isAdmin ? handleToggleEventMode : undefined}
                      disabled={!isAdmin}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: isService ? 'rgba(167, 139, 250, 0.1)' : isNormal ? 'rgba(41, 182, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid',
                        borderColor: isService ? 'rgba(167, 139, 250, 0.2)' : isNormal ? 'rgba(41, 182, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: isService ? '#c4b5fd' : isNormal ? '#29b6f6' : '#4ade80',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        padding: '12px',
                        borderRadius: '12px',
                        cursor: isAdmin ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={isAdmin ? (e) => e.currentTarget.style.background = isService ? 'rgba(167, 139, 250, 0.2)' : isNormal ? 'rgba(41, 182, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)' : undefined}
                      onMouseOut={isAdmin ? (e) => e.currentTarget.style.background = isService ? 'rgba(167, 139, 250, 0.1)' : isNormal ? 'rgba(41, 182, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)' : undefined}
                    >
                      {isAdmin && <Settings size={16} opacity={0.7} />}
                      <span>{isService ? 'Service Mode' : isNormal ? 'Normal Mode' : 'Camp Mode'}</span>
                    </button>
                  );
                })()}

                {/* Simple Mode Toggle */}
                <button
                  onClick={handleToggleUiMode}
                  style={{
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    color: '#fbbf24',
                    cursor: 'pointer',
                    padding: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)'}
                >
                  <span style={{ fontSize: '1.1rem' }}>✨</span>
                  <span>Simple UI</span>
                </button>

                {/* Dark mode toggle */}
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    padding: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  <span style={{ fontSize: '1.1rem' }}>{isDarkMode ? '☀️' : '🌙'}</span>
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>
              {/* Leader specific: My Team */}
              {currentUser.role === 'leader' && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('myteam');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Users size={18} color="var(--vbt-sky)" /> My Team Standings
                </button>
              )}

              {/* Admin specific: Controls */}
              {currentUser.role === 'admin' && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('settings');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Settings size={18} color="var(--vbt-sky)" /> Coordinator Controls
                </button>
              )}

              {/* Admin specific: Station Logistics */}
              {currentUser.role === 'admin' && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('station_logistics');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Package size={18} color="var(--vbt-sky)" /> Station Logistics
                </button>
              )}

              {/* Admin specific: Stats & Deductions */}
              {currentUser.role === 'admin' && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('stats');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <BarChart3 size={18} color="var(--vbt-sky)" /> Stats & Point Deductions
                </button>
              )}

              {/* Admin, Leader, Referee: Logistics */}
              {['admin', 'leader', 'referee'].includes(currentUser.role) && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('logistics');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Package size={18} color="var(--vbt-sky)" /> Materials & Logistics
                </button>
              )}

               {eventConfig.eventType !== 'service' && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('walkie');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Radio size={18} color="var(--vbt-sky)" /> Walkie-Talkie Channels
                </button>
              )}

              {/* Service Mode specific: Camp Scoreboard (Only for admin, leader, referee, since other roles have it on the bottom tab bar) */}
              {eventConfig.eventType === 'service' && ['admin', 'leader', 'referee'].includes(currentUser.role) && (
                <button
                  className="more-drawer-item"
                  onClick={() => {
                    setCurrentTab('scoreboard');
                    setShowMoreDrawer(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <Trophy size={18} color="var(--vbt-sky)" /> Camp Scoreboard
                </button>
              )}

              {/* Camp Map & GPS (Accessible to everyone, since in Service Mode it is replaced by Service on the bottom tab bar, and in other modes it helps as a drawer fallback) */}
              <button
                className="more-drawer-item"
                onClick={() => {
                  setCurrentTab('info');
                  setInfoSubTab('map');
                  setShowMoreDrawer(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <MapIcon size={18} color="var(--vbt-sky)" /> Camp Map & GPS
              </button>

              {/* FAQs & Rules (Everyone) */}
              <button
                className="more-drawer-item"
                onClick={() => {
                  setCurrentTab('info');
                  setInfoSubTab('faq');
                  setShowMoreDrawer(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <HelpCircle size={18} color="var(--vbt-sky)" /> FAQ and rules
              </button>

              <hr style={{ border: 'none', height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

              {/* Log Out (Everyone) */}
              <button
                className="more-drawer-item logout-btn"
                onClick={() => {
                  handleLogout();
                  setShowMoreDrawer(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  color: '#f87171',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <LogOut size={18} color="#f87171" /> Log Out
              </button>
            </div>
          </div>
        </div>

      )}

      {/* ═══ ROTATE NOW OVERLAY ══════════════════════════════ */}
      {showRotateNow && (
        <div onClick={() => setShowRotateNow(false)} style={{
          position:'fixed',inset:0,zIndex:9999,display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',
          background:'rgba(5,7,20,0.97)',backdropFilter:'blur(20px)',cursor:'pointer',
        }}>
          <div style={{fontSize:'5rem',marginBottom:'16px',animation:'pulse 1s infinite'}}>&#128260;</div>
          <h1 style={{fontSize:'2.8rem',fontWeight:'900',color:'#fff',letterSpacing:'-0.03em',margin:'0 0 8px'}}>ROTATE NOW</h1>
          <p style={{color:'rgba(255,255,255,0.5)',fontSize:'1rem',marginBottom:'24px'}}>Tap anywhere to dismiss</p>
          {(currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (
            <button onClick={(e)=>{e.stopPropagation();handleTimerStart();setShowRotateNow(false);}} style={{
              padding:'14px 32px',borderRadius:'16px',border:'none',
              background:'linear-gradient(135deg,#1441a1,#60a5fa)',
              color:'#fff',fontWeight:'800',fontSize:'1.1rem',cursor:'pointer',
            }}>Start Next Round</button>
          )}
        </div>
      )}

      {/* ═══ UNDO SCORE FAB ═══════════════════════════════════ */}
      {showUndoScore && (
        <button onClick={handleUndoScore} style={{
          position:'fixed',bottom:`calc(80px + env(safe-area-inset-bottom))`,right:'16px',
          zIndex:8888,padding:'10px 18px',borderRadius:'24px',
          border:'1px solid rgba(251,191,36,0.4)',
          background:'rgba(251,191,36,0.15)',backdropFilter:'blur(12px)',
          color:'#fbbf24',fontWeight:'700',fontSize:'0.85rem',cursor:'pointer',
          display:'flex',alignItems:'center',gap:'6px',
          boxShadow:'0 4px 20px rgba(251,191,36,0.25)',
        }}>
          &#8617; Undo Score
        </button>
      )}

      {/* ═══ GAME RULES QUICK-REF OVERLAY ═══════════════════ */}
      {showRulesOverlay && (() => {
        const roleCode = eventConfig?.servantAssignments?.[currentUser?.id];
        const station = roleCode && eventConfig?.stations?.[roleCode];
        return station ? (
          <div style={{position:'fixed',inset:0,zIndex:8500,display:'flex',alignItems:'flex-end',background:'rgba(5,7,20,0.75)',backdropFilter:'blur(8px)'}} onClick={()=>setShowRulesOverlay(false)}>
            <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'75vh',overflowY:'auto',background:'#0d1426',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px 24px 0 0',padding:'24px',paddingBottom:`calc(24px + env(safe-area-inset-bottom))`}}>
              <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'rgba(255,255,255,0.2)',margin:'0 auto 20px'}} />
              <h2 style={{fontSize:'1.3rem',fontWeight:'800',color:'#fff',marginBottom:'4px'}}>{station.name}</h2>
              {station.location && <p style={{fontSize:'0.8rem',color:'#60a5fa',marginBottom:'16px'}}>{station.location}</p>}
              {station.howToPlay && (<div style={{marginBottom:'16px'}}><p style={{fontSize:'0.75rem',fontWeight:'700',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>How to Play</p><p style={{fontSize:'0.9rem',color:'#fff',lineHeight:1.65,whiteSpace:'pre-wrap'}}>{station.howToPlay}</p></div>)}
              {station.lesson && (<div><p style={{fontSize:'0.75rem',fontWeight:'700',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>Lesson</p><p style={{fontSize:'0.9rem',color:'#4ade80',lineHeight:1.65}}>{station.lesson}</p></div>)}
              <button onClick={()=>setShowRulesOverlay(false)} style={{marginTop:'24px',width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#1441a1,#60a5fa)',color:'#fff',fontWeight:'700',cursor:'pointer'}}>Got it</button>
            </div>
          </div>
        ) : null;
      })()}

      {/* ═══ FEEDBACK MODAL ════════════════════════════════════ */}
      {showFeedbackModal && (
        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',alignItems:'flex-end',background:'rgba(5,7,20,0.75)',backdropFilter:'blur(8px)'}} onClick={()=>setShowFeedbackModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#0d1426',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px 24px 0 0',padding:'24px',paddingBottom:`calc(24px + env(safe-area-inset-bottom))`}}>
            <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'rgba(255,255,255,0.2)',margin:'0 auto 16px'}} />
            <h2 style={{fontSize:'1.1rem',fontWeight:'800',color:'#fff',textAlign:'center',marginBottom:'20px'}}>Rate Today&apos;s Service</h2>
            {feedbackSubmitted ? (
              <div style={{textAlign:'center',padding:'24px 0',fontSize:'2rem',color:'#4ade80'}}>Thanks! &#128591;</div>
            ) : (<>
              {feedbackError && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',padding:'10px',borderRadius:'8px',marginBottom:'16px',fontSize:'0.85rem',textAlign:'center'}}>{feedbackError}</div>}
              <div style={{display: 'flex', alignItems: 'center',justifyContent:'center',gap:'12px',marginBottom:'20px'}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setFeedbackRating(n)} style={{fontSize:'2rem',background:'none',border:'none',cursor:'pointer',opacity:feedbackRating>=n?1:0.25,transform:feedbackRating>=n?'scale(1.25)':'scale(1)',transition:'all 0.15s'}}>&#11088;</button>
                ))}
              </div>
              <textarea value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder='Any suggestions? (optional)' rows={3} style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'12px',padding:'12px',color:'#fff',fontSize:'0.9rem',resize:'none',boxSizing:'border-box',marginBottom:'12px'}} />
              <button onClick={handleSubmitFeedback} disabled={!feedbackRating} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:feedbackRating?'linear-gradient(135deg,#1441a1,#60a5fa)':'rgba(255,255,255,0.08)',color:'#fff',fontWeight:'700',cursor:feedbackRating?'pointer':'not-allowed',opacity:feedbackRating?1:0.5}}>Submit Feedback</button>
            </>)}
          </div>
        </div>
      )}

      {/* ═══ POST-SERVICE DEBRIEF MODAL ═══════════════════════ */}
      {showDebriefModal && (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (
        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',alignItems:'flex-end',background:'rgba(5,7,20,0.8)',backdropFilter:'blur(10px)'}} onClick={()=>setShowDebriefModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxHeight:'90vh',overflowY:'auto',background:'#0d1426',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px 24px 0 0',padding:'24px',paddingBottom:`calc(24px + env(safe-area-inset-bottom))`}}>
            <div style={{width:'40px',height:'4px',borderRadius:'2px',background:'rgba(255,255,255,0.2)',margin:'0 auto 20px'}} />
            <h2 style={{fontSize:'1.2rem',fontWeight:'800',color:'#fff',marginBottom:'20px'}}>Post-Service Debrief</h2>
            {debriefError && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',padding:'10px',borderRadius:'8px',marginBottom:'16px',fontSize:'0.85rem',textAlign:'center'}}>{debriefError}</div>}
            {[['kidsCount','Kids who showed up','e.g. 118','number'],['highlights','Highlights','Best moments...','textarea'],['challenges','Challenges','Any issues...','textarea'],['notes','Notes for next time','Lessons learned...','textarea']].map(([key,label,ph,type])=>(
              <div key={key} style={{marginBottom:'16px'}}>
                <label style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',display:'block',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:'700'}}>{label}</label>
                {type==='textarea'?<textarea value={debriefData[key]||''} onChange={e=>setDebriefData(p=>({...p,[key]:e.target.value}))} placeholder={ph} rows={3} style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'10px',padding:'10px',color:'#fff',fontSize:'0.9rem',resize:'none',boxSizing:'border-box'}}/>:<input type={type} value={debriefData[key]||''} onChange={e=>setDebriefData(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'10px',padding:'10px',color:'#fff',fontSize:'0.9rem',boxSizing:'border-box'}}/>}
              </div>
            ))}
            <button onClick={handleSaveDebrief} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:debriefSaved?'rgba(74,222,128,0.15)':'linear-gradient(135deg,#1441a1,#60a5fa)',color:debriefSaved?'#4ade80':'#fff',fontWeight:'700',cursor:'pointer',transition:'all 0.3s'}}>{debriefSaved?'Saved! &#10003;':'Save Debrief'}</button>
          </div>
        </div>
      )}

      {/* ═══ QR CODE CHECK-IN MODAL ════════════════════════════ */}
      {showQRModal && (
        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(5,7,20,0.9)',backdropFilter:'blur(14px)',padding:'24px'}} onClick={()=>setShowQRModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#0d1426',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'24px',padding:'32px',width:'100%',maxWidth:'320px',textAlign:'center'}}>
            <h2 style={{fontSize:'1.1rem',fontWeight:'800',color:'#fff',marginBottom:'6px'}}>Self Check-in QR</h2>
            <p style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.4)',marginBottom:'24px'}}>{eventConfig?.eventName || 'Event'}</p>
            <div style={{background:'#fff',borderRadius:'16px',padding:'16px',display:'inline-block',marginBottom:'16px'}}>
              <QRCodeSVG value={window.location.origin + '/?event=' + currentEventCode + '&checkin=1'} size={190} level='M' />
            </div>
            <p style={{fontSize:'0.9rem',color:'rgba(255,255,255,0.4)',fontFamily:'monospace',letterSpacing:'0.15em',marginBottom:'16px'}}>{currentEventCode}</p>
            <button onClick={()=>setShowQRModal(false)} style={{width:'100%',padding:'12px',borderRadius:'12px',border:'none',background:'rgba(255,255,255,0.08)',color:'#fff',fontWeight:'600',cursor:'pointer'}}>Close</button>
          </div>
        </div>
      )}

      {/* ═══ QUICK JOIN FORM MODAL ════════════════════════════ */}
      {showQuickJoinForm && (
        <div style={{position:'fixed',inset:0,zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(5,7,20,0.95)',backdropFilter:'blur(14px)',padding:'24px'}}>
          <div style={{background:'#0d1426',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'24px',padding:'32px',width:'100%',maxWidth:'400px'}}>
            <h2 style={{fontSize:'1.5rem',fontWeight:'800',color:'#fff',marginBottom:'8px'}}>Join Service</h2>
            <p style={{fontSize:'0.9rem',color:'rgba(255,255,255,0.4)',marginBottom:'24px'}}>Please enter your details to join {quickJoinData.code}.</p>
            
            <div style={{display:'flex', flexDirection:'column', gap:'12px', marginBottom:'24px'}}>
              <input 
                type="text" 
                placeholder="First Name" 
                value={quickJoinData.firstName} 
                onChange={(e) => setQuickJoinData({...quickJoinData, firstName: e.target.value})} 
                style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'14px',color:'#fff',fontSize:'1rem',boxSizing:'border-box'}} 
              />
              <input 
                type="text" 
                placeholder="Last Name" 
                value={quickJoinData.lastName} 
                onChange={(e) => setQuickJoinData({...quickJoinData, lastName: e.target.value})} 
                style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'14px',color:'#fff',fontSize:'1rem',boxSizing:'border-box'}} 
              />
              <input 
                type="tel" 
                placeholder="Phone Number" 
                value={quickJoinData.phone} 
                onChange={(e) => setQuickJoinData({...quickJoinData, phone: e.target.value})} 
                style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'14px',color:'#fff',fontSize:'1rem',boxSizing:'border-box'}} 
              />
            </div>
            <button 
              onClick={handleQuickJoinSubmit} 
              style={{width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#1441a1,#60a5fa)',color:'#fff',fontWeight:'700',fontSize:'1.05rem',cursor:'pointer'}}
            >
              Join Now
            </button>
          </div>
        </div>
      )}


      {/* ═══ SERVANTS DIRECTORY MODAL ════════════════════════ */}
      {showServantDirectoryModal && (
        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',flexDirection:'column',background:'#080b18'}}>
          <div style={{padding:'16px',paddingTop:`calc(16px + env(safe-area-inset-top))`,display:'flex',alignItems:'center',gap:'12px',borderBottom:'1px solid rgba(255,255,255,0.08)',background:'rgba(13,20,38,0.95)',backdropFilter:'blur(12px)'}}>
            <button onClick={()=>setShowServantDirectoryModal(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',fontSize:'1.4rem',cursor:'pointer',lineHeight:1,padding:'4px 8px'}}>&#8592;</button>
            <h2 style={{fontSize:'1rem',fontWeight:'800',color:'#fff',margin:0}}>Servants Directory</h2>
            <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.06)',padding:'2px 8px',borderRadius:'8px'}}>{globalServants.length}</span>
          </div>
          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <input value={servantDirectorySearch} onChange={e=>setServantDirectorySearch(e.target.value)} placeholder='Search servants...' style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px 14px',color:'#fff',fontSize:'0.9rem',boxSizing:'border-box',outline:'none'}} />
          </div>
          {globalServants.length > 0 && (
            <div style={{padding:'12px 16px 8px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <p style={{fontSize:'0.7rem',color:'#f59e0b',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'10px'}}>Top Servants</p>
              <div style={{display: 'flex', alignItems: 'center',gap:'8px',overflowX:'auto',paddingBottom:'4px'}}>
                {[...globalServants].sort((a,b)=>(b.servicesAttended?.length||0)-(a.servicesAttended?.length||0)).slice(0,5).map((s,i)=>(
                  <div key={s.id} style={{minWidth:'76px',textAlign:'center',background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'10px 6px',flexShrink:0}}>
                    <div style={{fontSize:'1.1rem',marginBottom:'4px'}}>{['&#127945;','&#129352;','&#129353;','&#127885;','&#127885;'][i]}</div>
                    <div style={{fontSize:'0.7rem',fontWeight:'700',color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'68px'}}>{s.name?.split(' ')[0]||'?'}</div>
                    <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.35)'}}>{s.servicesAttended?.length||0}x</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{flex:1,overflowY:'auto',padding:'8px 16px',paddingBottom:`calc(16px + env(safe-area-inset-bottom))`}}>
            {globalServants.filter(s=>!servantDirectorySearch||s.name?.toLowerCase().includes(servantDirectorySearch.toLowerCase())).sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(s=>(
              <div key={s.id} style={{background:'rgba(255,255,255,0.04)',borderRadius:'14px',padding:'14px',marginBottom:'8px',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px',cursor:'pointer'}} onClick={()=>setExpandedServant(expandedServant===s.id?null:s.id)}>
                  <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#1441a1,#60a5fa)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'800',color:'#fff',fontSize:'1rem',flexShrink:0}}>{s.name?.[0]?.toUpperCase()||'?'}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:'700',color:'#fff',fontSize:'0.9rem'}}>{s.name}</div>
                    <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.35)'}}>{s.servicesAttended?.length||0} services &nbsp;&#183;&nbsp; {s.defaultRole||'volunteer'}</div>
                  </div>
                  <a href={getWhatsAppLink(s,'your assigned role')} target='_blank' rel='noopener noreferrer' onClick={e=>e.stopPropagation()} style={{fontSize:'1.4rem',textDecoration:'none',flexShrink:0}} title='Message on WhatsApp'>&#128172;</a>
                </div>
                {expandedServant===s.id && (
                  <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',marginBottom:'4px'}}>Passcode: <span style={{color:'#fff',fontFamily:'monospace'}}>{s.passcode||'—'}</span></div>
                    <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',marginBottom:'10px'}}>Last seen: <span style={{color:'#fff'}}>{s.lastSeen?new Date(s.lastSeen).toLocaleDateString():'Never'}</span></div>
                    {(s.servicesAttended||[]).length > 0 && (
                      <div>{(s.servicesAttended||[]).slice(-5).reverse().map((e,i)=>(
                        <div key={i} style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)',marginBottom:'2px'}}>&#183; {e.code} &mdash; {new Date(e.date).toLocaleDateString()}</div>
                      ))}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {globalServants.length===0 && <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.3)'}}>No servants yet. They appear here when they log in.</div>}
          </div>
        </div>
      )}

      {/* ═══ GAMES LIBRARY MODAL ═══════════════════════════════ */}
      {showGamesLibraryModal && (
        <div style={{position:'fixed',inset:0,zIndex:8000,display:'flex',flexDirection:'column',background:'#080b18'}}>
          <div style={{padding:'16px',paddingTop:`calc(16px + env(safe-area-inset-top))`,display:'flex',alignItems:'center',gap:'12px',borderBottom:'1px solid rgba(255,255,255,0.08)',background:'rgba(13,20,38,0.95)',backdropFilter:'blur(12px)'}}>
            <button onClick={()=>setShowGamesLibraryModal(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',fontSize:'1.4rem',cursor:'pointer',lineHeight:1,padding:'4px 8px'}}>&#8592;</button>
            <h2 style={{fontSize:'1rem',fontWeight:'800',color:'#fff',margin:0}}>Games Library</h2>
            <span style={{marginLeft:'auto',fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',background:'rgba(255,255,255,0.06)',padding:'2px 8px',borderRadius:'8px'}}>{gamesLibrary.length}</span>
          </div>
          <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',flexDirection:'column',gap:'10px'}}>
            <input value={gamesLibrarySearch} onChange={e=>setGamesLibrarySearch(e.target.value)} placeholder='Search games...' style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px 14px',color:'#fff',fontSize:'0.9rem',boxSizing:'border-box',outline:'none'}} />
            <div style={{display: 'flex', alignItems: 'center',gap:'6px'}}>
              {['all','station','big_game','reflection'].map(f=>(
                <button key={f} onClick={()=>setGamesLibraryFilter(f)} style={{padding:'6px 12px',borderRadius:'20px',border:'none',background:gamesLibraryFilter===f?'linear-gradient(135deg,#1441a1,#60a5fa)':'rgba(255,255,255,0.07)',color:'#fff',fontWeight:'600',fontSize:'0.75rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{f==='all'?'All':f==='big_game'?'Big Game':f.charAt(0).toUpperCase()+f.slice(1)}</button>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'8px 16px',paddingBottom:`calc(16px + env(safe-area-inset-bottom))`}}>
            {gamesLibrary.filter(g=>(gamesLibraryFilter==='all'||g.type===gamesLibraryFilter)&&(!gamesLibrarySearch||g.name?.toLowerCase().includes(gamesLibrarySearch.toLowerCase()))).map(g=>(
              <div key={g.id} style={{background:'rgba(255,255,255,0.04)',borderRadius:'14px',padding:'14px',marginBottom:'8px',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer'}} onClick={()=>setExpandedGame(expandedGame===g.id?null:g.id)}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                      <span style={{fontWeight:'800',color:'#fff',fontSize:'0.95rem'}}>{g.name}</span>
                      <span style={{fontSize:'0.65rem',padding:'2px 8px',borderRadius:'10px',background:g.type==='big_game'?'rgba(245,158,11,0.2)':g.type==='reflection'?'rgba(139,92,246,0.2)':'rgba(59,130,246,0.2)',color:g.type==='big_game'?'#f59e0b':g.type==='reflection'?'#a78bfa':'#60a5fa',fontWeight:'700'}}>{g.type==='big_game'?'Big Game':g.type?.charAt(0).toUpperCase()+(g.type?.slice(1)||'')}</span>
                    </div>
                    {g.location && <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.35)',marginBottom:'4px'}}>{g.location}</div>}
                    <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.25)'}}>Used {g.timesUsed||1}x &nbsp;&#183;&nbsp; Last: {g.lastUsedEvent||'—'}</div>
                  </div>
                  <span style={{color:'rgba(255,255,255,0.25)',fontSize:'0.75rem',flexShrink:0,marginTop:'2px'}} onClick={()=>setExpandedGame(expandedGame===g.id?null:g.id)}>{expandedGame===g.id?'&#9650;':'&#9660;'}</span>
                </div>
                {expandedGame===g.id && (
                  <div style={{marginTop:'12px',paddingTop:'12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    {g.howToPlay && <><p style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.35)',fontWeight:'700',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.06em'}}>How to Play</p><p style={{fontSize:'0.85rem',color:'#fff',lineHeight:1.65,marginBottom:'12px',whiteSpace:'pre-wrap'}}>{g.howToPlay}</p></>}
                    {g.lesson && <><p style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.35)',fontWeight:'700',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Lesson</p><p style={{fontSize:'0.85rem',color:'#4ade80',lineHeight:1.65}}>{g.lesson}</p></>}
                  </div>
                )}
              </div>
            ))}
            {gamesLibrary.length===0&&<div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.3)'}}>No games saved yet. Create an event to start building the library.</div>}
          </div>
        </div>
      )}

      {/* ═══ OFFLINE STATUS BADGE ══════════════════════════════ */}
      {!isOnline && (
        <div style={{
          position:'fixed',top:`calc(env(safe-area-inset-top) + 8px)`,
          left:'50%',transform:'translateX(-50%)',zIndex:9000,
          background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.4)',
          color:'#f87171',borderRadius:'20px',padding:'4px 14px',
          fontSize:'0.75rem',fontWeight:'700',backdropFilter:'blur(8px)',
          display:'flex',alignItems:'center',gap:'6px',
        }}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#f87171',display:'inline-block'}} />
          Offline{offlineQueueLen > 0 ? ` — ${offlineQueueLen} queued` : ''}
        </div>
      )}

      {/* ═══ PWA INSTALL PROMPT ════════════════════════════════ */}
      {showInstallPrompt && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5,9,20,0.95)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px', padding: '32px 24px', width: '100%', maxWidth: '400px',
            textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            {(() => {
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
              return (
                <>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📲</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>Install VBT App</h2>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: '24px' }}>
                    For the best experience during the event, please install this web app on your home screen. It gives you full-screen access and better offline support!
                  </p>
                  
                  {isIOS && (
                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', marginBottom: '20px', textAlign: 'left', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)' }}>
                      <strong>To install on iOS:</strong><br/>
                      1. Tap the Share button <svg style={{display:'inline',verticalAlign:'middle',margin:'0 4px'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> in the bottom bar.<br/>
                      2. Scroll down and tap <strong>"Add to Home Screen"</strong> <svg style={{display:'inline',verticalAlign:'middle',margin:'0 4px'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {!isIOS && (
                      <button
                        onClick={async () => {
                          if (deferredPrompt) {
                            deferredPrompt.prompt();
                            const { outcome } = await deferredPrompt.userChoice;
                            if (outcome === 'accepted') {
                              console.log('User accepted the install prompt');
                            }
                            setDeferredPrompt(null);
                          }
                          setShowInstallPrompt(false);
                          setShowOnboarding(true);
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                          color: '#fff', border: 'none', padding: '14px', borderRadius: '12px',
                          fontSize: '1rem', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        Install App Now
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowInstallPrompt(false);
                        setShowOnboarding(true);
                      }}
                      style={{
                        background: isIOS ? 'linear-gradient(135deg, #3b82f6, #60a5fa)' : 'transparent',
                        color: isIOS ? '#fff' : 'rgba(255,255,255,0.5)',
                        border: 'none', padding: '14px', borderRadius: '12px',
                        fontSize: isIOS ? '1rem' : '0.9rem', cursor: 'pointer',
                        fontWeight: '700'
                      }}
                    >
                      {isIOS ? 'Got it, Continue' : 'Maybe Later'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══ ONBOARDING TOUR ═══════════════════════════════════ */}
      {showOnboarding && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(5,9,20,0.85)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)', 
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '350px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            {(() => {
              const steps = [
                { emoji: '👋', title: 'Welcome to VBT!', text: "Let's take a quick tour! This app is designed to make our day go incredibly smoothly and make managing kids a breeze." },
                { emoji: '📰', title: 'Timeline & Feed', text: 'Check the timeline for live announcements, schedules, and instant updates so everyone stays on the same page.' },
                { emoji: '🏆', title: 'Live Scoreboard', text: 'Keep track of scores and motivate the kids by showing them the live Scoreboard.' },
                { emoji: '👥', title: 'Your Service & Roles', text: 'Tap the Service tab to instantly see your exact role, team assignments, and game instructions.' }
              ];
              const step = steps[onboardingStep];
              return (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>{step.emoji}</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', marginBottom: '10px' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: '24px', minHeight: '60px' }}>
                    {step.text}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {steps.map((_, i) => (
                        <div key={i} style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: i === onboardingStep ? '#38bdf8' : 'rgba(255,255,255,0.2)'
                        }} />
                      ))}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={() => setShowOnboarding(false)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => {
                          if (onboardingStep < steps.length - 1) {
                            setOnboardingStep(prev => prev + 1);
                          } else {
                            setShowOnboarding(false);
                          }
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                          padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        {onboardingStep < steps.length - 1 ? 'Next' : 'Finish'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══ ROTATION TIMER WIDGET (Coordinator only, floats in header) ════ */}
      {rotationTimer?.startedAt && (currentUser?.role === 'admin' || currentUser?.role === 'coordinator') && (
        <RotationTimerDisplay 
          rotationTimer={rotationTimer} 
          setShowRotateNow={setShowRotateNow} 
          handleTimerPause={handleTimerPause} 
          handleTimerResume={handleTimerResume} 
          handleTimerReset={handleTimerReset} 
        />
      )}

      {/* ═══ GAME RULES FAB ═══════════════════════════════════ */}
      {currentTab === 'service' && (() => {
        const roleCode = eventConfig?.servantAssignments?.[currentUser?.id];
        return roleCode && eventConfig?.stations?.[roleCode] ? (
          <button onClick={() => setShowRulesOverlay(true)} title='Game Rules' style={{
            position:'fixed',bottom:`calc(72px + env(safe-area-inset-bottom))`,
            left:'16px',zIndex:600,width:'44px',height:'44px',borderRadius:'50%',
            border:'1px solid rgba(255,255,255,0.15)',
            background:'rgba(13,20,38,0.9)',backdropFilter:'blur(8px)',
            color:'rgba(255,255,255,0.7)',fontSize:'1.3rem',cursor:'pointer',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 4px 16px rgba(0,0,0,0.4)',
          }}>?</button>
        ) : null;
      })()}
      {/* ═══ OFFLINE STATUS BADGE ══════════════════════════════ */}
      {!isOnline && (
        <div style={{
          position:'fixed',top:`calc(env(safe-area-inset-top) + 8px)`,
          left:'50%',transform:'translateX(-50%)',zIndex:9000,
          background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.4)',
          color:'#f87171',borderRadius:'20px',padding:'4px 14px',
          fontSize:'0.75rem',fontWeight:'700',backdropFilter:'blur(8px)',
          display:'flex',alignItems:'center',gap:'6px',
        }}>
          <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#f87171',display:'inline-block'}} />
          Offline{offlineQueueLen > 0 ? ` — ${offlineQueueLen} queued` : ''}
        </div>
      )}
    </>
  );
}
