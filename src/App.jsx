import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  BookOpen
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
  subscribeToEventRegistry,
  subscribeToServiceData,
  updateServiceData,
  registerDevicePushToken
} from './firebase';
import { setupPushNotifications } from './push_service';
import initialStaticCampData from './data/camp_data.json';

// Firebase Web Push VAPID key (Generate in Firebase Console -> Project Settings -> Cloud Messaging -> Web Push Certificates)
// Replace this placeholder with your actual key to connect browser push notifications.
const WEBPUSH_VAPID_KEY = "BBWNlIKCRTY40ybSED7bBc5AUlRT7IHvZ0EajhdPVnxDcuSnZ7_3I50nXF79S6QG8cRcqr3UCIVBcC-v4Yvc3RU"; 

// Default state when Firestore is empty
const defaultCampState = {
  blockScores: {}, // key: "blockIndex_roundIndex_gameName" -> "Shakes" | "Fries" | "TIE" | "NA"
  teamDeductions: {}, // key: teamCode -> number
  tokens: { shakes: 0, fries: 0 },
  timeShiftMinutes: 0,
  isTimerPaused: false,
  timerPausedAt: null,
  appsScriptWebappUrl: ''
};

// Default event config for VBT 2026 Camp (backward compatibility)
const VBT_2026_EVENT_CODE = 'vbt_2026_camp';
const defaultEventConfig = {
  eventName: 'VBT Sports Camp',
  description: 'Live scoring, schedule & team management',
  eventDate: '',
  side1Name: 'Shakes',
  side2Name: 'Fries',
  primaryColor: '#1441a1',
  logoUrl: '/Final VBT Re-Branding 2026-02 (3).png',
  passcodeCoordinator: 'VBTADMIN',
  passcodeGameLeader: 'VBTREF',
  passcodeTeamLeader: 'VBT2026'
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
    a: "Camp leaders can penalize sub-teams (e.g., F5.2, S6.1) for lateness, poor sportsmanship, or missing team gear. Each deduction point subtracts 1 point from that team's overall side score (Fries or Shakes total score)."
  },
  {
    q: "How do tokens work?",
    a: "Tokens can be awarded to either side throughout the day. Each token is worth +2 points and is added directly to the side's Final Total."
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

// Web Audio API Synthesizer for Bell Chime
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playBellChime() {
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Synthesize a crystal-clear "ding-dong" bell sound by layering frequencies
    const fundamental = 880; // A5
    const frequencies = [fundamental, fundamental * 1.2, fundamental * 1.5, fundamental * 2.0];
    const gains = [0.4, 0.2, 0.15, 0.1];
    
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.4, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    masterGain.connect(audioCtx.destination);
    
    frequencies.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      oscGain.gain.setValueAtTime(gains[i], now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + (1.8 - i * 0.2));
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 2.0);
    });
  } catch (err) {
    console.error("Audio Synthesis error:", err);
  }
}

function playLoudDoubleChime() {
  try {
    playBellChime();
    setTimeout(() => {
      // Second bell ring with higher frequency and louder volume
      try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const fundamental = 1046.50; // C6
        const frequencies = [fundamental, fundamental * 1.2, fundamental * 1.5, fundamental * 2.0];
        const gains = [0.5, 0.25, 0.2, 0.1];
        
        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0.5, now);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        masterGain.connect(audioCtx.destination);
        
        frequencies.forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const oscGain = audioCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          
          oscGain.gain.setValueAtTime(gains[i], now);
          oscGain.gain.exponentialRampToValueAtTime(0.001, now + (1.8 - i * 0.2));
          
          osc.connect(oscGain);
          oscGain.connect(masterGain);
          
          osc.start(now);
          osc.stop(now + 2.0);
        });
      } catch (err) {
        console.error("Second chime error:", err);
      }
    }, 400);
  } catch (err) {
    console.error("Audio Synthesis error:", err);
  }
}

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
    const res = await fetch('https://sync-vbt-sheet-75ez7bhuzq-ew.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'send_push',
        title,
        body,
        url: targetUrl
      })
    });
    if (!res.ok) {
      console.error("Failed to send remote push notification:", res.status);
    }
  } catch (err) {
    console.error("Error triggering remote push:", err);
  }
};

export default function App() {
  // ─── EVENT SELECTION STATE ────────────────────────────────────────────────
  const [currentEventCode, setCurrentEventCode] = useState(() => {
    return localStorage.getItem('vbt_current_event') || '';
  });
  const [eventConfig, setEventConfig] = useState(defaultEventConfig);
  const [eventJoinInput, setEventJoinInput] = useState('');
  const [eventJoinError, setEventJoinError] = useState('');
  const [eventJoinLoading, setEventJoinLoading] = useState(false);
  const [eventRegistry, setEventRegistry] = useState([]);

  // New event creation state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventCode, setNewEventCode] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventSide1, setNewEventSide1] = useState('Team A');
  const [newEventSide2, setNewEventSide2] = useState('Team B');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPassCoord, setNewEventPassCoord] = useState('');
  const [newEventPassGame, setNewEventPassGame] = useState('');
  const [newEventPassTeam, setNewEventPassTeam] = useState('');
  const [createEventError, setCreateEventError] = useState('');
  const [createEventLoading, setCreateEventLoading] = useState(false);

  // Event setup edit state (for existing event)
  const [editEventConfig, setEditEventConfig] = useState(null);
  const [savingEventConfig, setSavingEventConfig] = useState(false);

  // ─── DYNAMIC SIDE NAME HELPERS ────────────────────────────────────────────
  const side1Name = eventConfig.side1Name || 'Shakes';
  const side2Name = eventConfig.side2Name || 'Fries';

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

  useEffect(() => {
    if (currentEventCode) {
      localStorage.setItem(`vbt_apps_url_${currentEventCode}`, appsScriptWebappUrl);
    }
  }, [appsScriptWebappUrl, currentEventCode]);

  // UI state
  const [currentTab, setCurrentTab] = useState('scoreboard');
  const [infoSubTab, setInfoSubTab] = useState('map');
  const [expandedBlocks, setExpandedBlocks] = useState({ 1: true, 2: false, 3: false, 4: false });
  const [selectedMapLocation, setSelectedMapLocation] = useState(null);
  const [expandedFaqs, setExpandedFaqs] = useState({});
  const [scheduleTeamFilter, setScheduleTeamFilter] = useState('');
  const [scheduleBlockFilter, setScheduleBlockFilter] = useState('All');
  const [scheduleDayFilter, setScheduleDayFilter] = useState('1');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uploadImage, setUploadImage] = useState(null);

  // ─── SERVICE MODE STATE ───────────────────────────────────────────────
  // Live service data from Firestore (brief + groups + games)
  const [serviceData, setServiceData] = useState({ serviceBrief: '', groups: [], games: [] });
  // Edit drafts (only used by Coordinator)
  const [editServiceBrief, setEditServiceBrief] = useState('');
  const [editGroups, setEditGroups] = useState([]);
  const [editGames, setEditGames] = useState([]);
  const [serviceEditMode, setServiceEditMode] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [expandedServiceGame, setExpandedServiceGame] = useState({});

  // ─── LEADER ROSTER STATE (coordinator setup dashboard) ────────────────
  // editRoster: [{id, name, groupLabel}] — typed in by coordinator, saved to eventConfig.leaderRoster
  const [editRoster, setEditRoster] = useState([]);
  const [rosterEditMode, setRosterEditMode] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);

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
        if (val === 'shakes') normalizedBlockScores[key] = 'Shakes';
        else if (val === 'fries') normalizedBlockScores[key] = 'Fries';
        else if (val === 'tie') normalizedBlockScores[key] = 'Tie';
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
  const [statsSubTab, setStatsSubTab] = useState('charts');
  const [scoreViewMode, setScoreViewMode] = useState('block'); // 'block' | 'game'
  const [expandedGames, setExpandedGames] = useState({});
  const fileInputRef = useRef(null);

  const getEffectiveTimeShift = () => {
    const { timeShiftMinutes = 0, isTimerPaused = false, timerPausedAt = null } = campState;
    if (isTimerPaused && timerPausedAt) {
      const pausedTime = new Date(timerPausedAt).getTime();
      const now = currentTime.getTime();
      const elapsedMs = Math.max(0, now - pausedTime);
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

  const isTimeSlotActive = (timeStr, blockName) => {
    try {
      let timePart = timeStr.trim();
      const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return false;
      
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const isPM = match[3].toUpperCase() === 'PM';
      
      const eventTime = new Date();
      eventTime.setHours(isPM ? (hours === 12 ? 12 : hours + 12) : (hours === 12 ? 0 : hours));
      eventTime.setMinutes(minutes);
      eventTime.setSeconds(0);

      const shift = getEffectiveTimeShift();
      const shiftedEventTime = new Date(eventTime.getTime() + shift * 60 * 1000);

      const durationMs = 30 * 60 * 1000;
      const diff = currentTime.getTime() - shiftedEventTime.getTime();

      return diff >= 0 && diff < durationMs;
    } catch (e) {
      return false;
    }
  };

  const liveLocationStatus = useMemo(() => {
    const activeMatchups = campData.matchups.filter(m => isTimeSlotActive(m.time, `Block ${m.block}`));
    
    return locationKey.map(loc => {
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
  }, [campData, campState, currentTime]);

  // Watch for new announcements to play chimes and trigger notifications
  useEffect(() => {
    if (announcements.length > 0) {
      const latest = announcements[0]; // ordered desc
      if (latest && latest.timestamp) {
        const itemTime = new Date(latest.timestamp).getTime();
        // If the announcement is new (post-load time) and length grew
        if (itemTime > loadTime.current + 2000 && announcements.length > prevAnnouncementsLength.current) {
          if (latest.type === 'ping') {
            playLoudDoubleChime();
            setActivePingAlert({ show: true, text: latest.text });
            setTimeout(() => {
              setActivePingAlert({ show: false, text: '' });
            }, 6000);
          } else {
            playBellChime();
          }
          showLocalNotification(`VBT Alert: ${latest.sender}`, latest.text);
        }
      }
      prevAnnouncementsLength.current = announcements.length;
    }
  }, [announcements]);

  // Time tracker for Live indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Smart auto-detection of current day on load
  useEffect(() => {
    if (campData && campData.matchups) {
      const hasActiveBlock4 = campData.matchups.some(m => m.block === 4 && isTimeSlotActive(m.time, `Block ${m.block}`));
      if (hasActiveBlock4) {
        setScheduleDayFilter('2');
      }
    }
  }, [campData]);

  // Set up push notifications (Web PWA or Native Capacitor iOS) on user login
  useEffect(() => {
    if (currentUser) {
      setupPushNotifications(currentUser, WEBPUSH_VAPID_KEY);
    }
  }, [currentUser]);

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

  // Synchronize Block filter when Day changes
  useEffect(() => {
    if (scheduleDayFilter === '1' && scheduleBlockFilter === '4') {
      setScheduleBlockFilter('All');
    } else if (scheduleDayFilter === '2' && scheduleBlockFilter !== 'All' && scheduleBlockFilter !== '4') {
      setScheduleBlockFilter('All');
    }
  }, [scheduleDayFilter]);

  // Subscribe to event registry (always, to allow joining events)
  useEffect(() => {
    const unsub = subscribeToEventRegistry((list) => setEventRegistry(list));
    return () => unsub();
  }, []);

  // Subscribe to event config when an event is selected
  useEffect(() => {
    if (!currentEventCode) return;
    const unsub = subscribeToEventConfig(currentEventCode, (cfg) => {
      if (cfg) {
        setEventConfig({ ...defaultEventConfig, ...cfg });
        setEditEventConfig({ ...defaultEventConfig, ...cfg });
      }
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
  const handleRemoveGroup = (idx) => setEditGroups(prev => prev.filter((_, i) => i !== idx));
  const handleGroupChange = (idx, field, val) => setEditGroups(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));
  const totalKids = editGroups.reduce((sum, g) => sum + (parseInt(g.kidCount) || 0), 0);

  // Game helpers
  const handleAddGame = () => setEditGames(prev => [...prev, { name: '', howToPlay: '', lesson: '' }]);
  const handleRemoveGame = (idx) => setEditGames(prev => prev.filter((_, i) => i !== idx));
  const handleGameChange = (idx, field, val) => setEditGames(prev => prev.map((g, i) => i === idx ? { ...g, [field]: val } : g));

  // ─── LEADER ROSTER helpers ────────────────────────────────────────────
  const handleOpenRosterEdit = () => {
    setEditRoster((eventConfig?.leaderRoster || []).map(e => ({ ...e })));
    setRosterEditMode(true);
  };
  const handleAddRosterEntry = () => setEditRoster(prev => [...prev, { id: `l_${Date.now()}`, name: '', groupLabel: '' }]);
  const handleRemoveRosterEntry = (idx) => setEditRoster(prev => prev.filter((_, i) => i !== idx));
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
        setCampData(data);
        localStorage.setItem(`vbt_schedule_${currentEventCode}`, JSON.stringify(data));
      }
    });

    // Subscribe to announcements
    const unsubscribeAnnouncements = subscribeToAnnouncements(currentEventCode, (list) => {
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
  const handleLogin = (e) => {
    e.preventDefault();
    const normalizedPassword = loginPassword.trim().toUpperCase();
    const coordPass = (eventConfig.passcodeCoordinator || 'VBTADMIN').toUpperCase();
    const gamePass = (eventConfig.passcodeGameLeader || 'VBTREF').toUpperCase();
    const teamPass = (eventConfig.passcodeTeamLeader || 'VBT2026').toUpperCase();

    if (loginRole === 'leader') {
      if (!loginName) {
        setLoginError('Please select your name.');
        return;
      }
      if (normalizedPassword !== teamPass) {
        setLoginError(`Incorrect passcode for Team Leader.`);
        return;
      }

      const leaderObj = leadersList.find(l => l.code === loginName);
      const user = {
        role: 'leader',
        name: leaderObj.fullName.split('/')[0].trim(),
        teamCode: leaderObj.code,
        side: leaderObj.side,
        grade: leaderObj.grade
      };
      setCurrentUser(user);
      localStorage.setItem(`vbt_user_${currentEventCode}`, JSON.stringify(user));
      setLoginError('');
      setLoginPassword('');
      setCurrentTab('myteam');
      if (!isOfflineMode) {
        addAnnouncement(currentEventCode, `${user.name} logged in as team leader of ${user.teamCode}`, 'System', 'system');
      }
    } else if (loginRole === 'admin') {
      if (normalizedPassword !== coordPass) {
        setLoginError('Incorrect passcode for Coordinator.');
        return;
      }
      const user = {
        role: 'admin',
        name: 'Coordinator',
        teamCode: 'ADMIN',
        side: 'System',
        grade: 'All'
      };
      setCurrentUser(user);
      localStorage.setItem(`vbt_user_${currentEventCode}`, JSON.stringify(user));
      setLoginError('');
      setLoginPassword('');
      setCurrentTab('scoreboard');
      if (!isOfflineMode) {
        addAnnouncement(currentEventCode, `Coordinator signed in`, 'System', 'system');
      }
    } else if (loginRole === 'referee') {
      if (normalizedPassword !== gamePass) {
        setLoginError('Incorrect passcode for Game Leader.');
        return;
      }
      const user = {
        role: 'referee',
        name: 'Game Leader',
        teamCode: 'REF',
        side: 'System',
        grade: 'All'
      };
      setCurrentUser(user);
      localStorage.setItem(`vbt_user_${currentEventCode}`, JSON.stringify(user));
      setLoginError('');
      setLoginPassword('');
      setCurrentTab('scoreboard');
      if (!isOfflineMode) {
        addAnnouncement(currentEventCode, `Game Leader signed in`, 'System', 'system');
      }
    }
  };

  const handleLogout = () => {
    if (currentUser && !isOfflineMode) {
      addAnnouncement(currentEventCode, `${currentUser.name} signed out`, 'System', 'system');
    }
    setCurrentUser(null);
    if (currentEventCode) localStorage.removeItem(`vbt_user_${currentEventCode}`);
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
    setEventJoinLoading(true);
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

  // Create New Event Handler
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const code = newEventCode.trim().toLowerCase().replace(/\s+/g, '_');
    if (!code) { setCreateEventError('Event code is required.'); return; }
    if (!newEventName.trim()) { setCreateEventError('Event name is required.'); return; }
    if (!newEventPassCoord.trim()) { setCreateEventError('Coordinator passcode is required.'); return; }
    setCreateEventLoading(true);
    setCreateEventError('');
    try {
      await createEvent(code, {
        eventName: newEventName.trim(),
        description: '',
        eventDate: newEventDate,
        side1Name: newEventSide1 || 'Team A',
        side2Name: newEventSide2 || 'Team B',
        primaryColor: '#1441a1',
        logoUrl: '/Final VBT Re-Branding 2026-02 (3).png',
        passcodeCoordinator: newEventPassCoord.trim().toUpperCase(),
        passcodeGameLeader: newEventPassGame.trim().toUpperCase() || 'GAMEREF',
        passcodeTeamLeader: newEventPassTeam.trim().toUpperCase() || 'LEADER'
      });
      // Auto-join the new event
      setCurrentEventCode(code);
      localStorage.setItem('vbt_current_event', code);
      setShowCreateEvent(false);
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

  // Score Calculator Logic (Excel formula compliance)
  const scoreCalculations = useMemo(() => {
    const { blockScores = {}, teamDeductions = {}, tokens = { shakes: 0, fries: 0 } } = campState;

    const getBlockPoints = (blockIdx) => {
      let shakes = 0;
      let fries = 0;

      campData.matchups.forEach(m => {
        if (m.block !== blockIdx) return;
        const key = `${m.block}_${m.round}_${m.game}`;
        const winner = blockScores[key] || 'NA';
        const points = campData.gamePoints[m.game] || 0;

        if (winner === 'Shakes') {
          shakes += points;
        } else if (winner === 'Fries') {
          fries += points;
        }
      });

      return { shakes, fries };
    };

    const b1 = getBlockPoints(1);
    const b2 = getBlockPoints(2);
    const b3 = getBlockPoints(3);
    const b4 = getBlockPoints(4);

    let shakesDeductions = 0;
    let friesDeductions = 0;
    Object.entries(teamDeductions).forEach(([teamCode, val]) => {
      const team = campData.teams[teamCode];
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
    if (shakesFinal > friesFinal) winner = 'SHAKES';
    else if (friesFinal > shakesFinal) winner = 'FRIES';

    return {
      b1, b2, b3, b4,
      shakesBlocksTotal, friesBlocksTotal,
      shakesDeductions, friesDeductions,
      shakesTokenPoints, friesTokenPoints,
      shakesFinal, friesFinal,
      winner
    };
  }, [campState]);

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
      const sideText = side === 'shakes' ? side1Name : side2Name;
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
      uploadImage
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
    return campData.matchups.filter(m => {
      // Day filter
      if (scheduleDayFilter === '1' && ![1, 2, 3].includes(m.block)) return false;
      if (scheduleDayFilter === '2' && m.block !== 4) return false;

      // Block filter
      if (scheduleBlockFilter !== 'All' && m.block !== parseInt(scheduleBlockFilter)) {
        return false;
      }
      if (scheduleTeamFilter) {
        if (m.shakes !== scheduleTeamFilter && m.fries !== scheduleTeamFilter) {
          return false;
        }
      }
      return true;
    });
  }, [scheduleTeamFilter, scheduleBlockFilter, scheduleDayFilter]);

  const myTeamInfo = useMemo(() => {
    if (!currentUser) return null;
    const rawSchedule = campData.teamSchedules[currentUser.teamCode] || [];
    return {
      ...campData.teams[currentUser.teamCode],
      schedule: rawSchedule,
      day1Schedule: rawSchedule.filter(s => s.block && s.block.toLowerCase().includes('day 1')),
      day2Schedule: rawSchedule.filter(s => s.block && s.block.toLowerCase().includes('day 2')),
      deductions: (campState.teamDeductions || {})[currentUser.teamCode] || 0
    };
  }, [currentUser, campState, campData]);

  const currentActiveSlot = useMemo(() => {
    if (!myTeamInfo || !myTeamInfo.schedule) return null;
    return myTeamInfo.schedule.find(slot => slot.block && isTimeSlotActive(slot.time, slot.block));
  }, [myTeamInfo, campState, currentTime]);

  // Find matches scheduled at the selected map location
  const mapLocationMatches = useMemo(() => {
    if (!selectedMapLocation) return [];
    return campData.matchups.filter(m => m.location === selectedMapLocation.name);
  }, [selectedMapLocation]);

  const toggleFaq = (idx) => {
    setExpandedFaqs(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // ─── EVENT SELECTION SCREEN ──────────────────────────────────────────────
  if (!currentEventCode) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'radial-gradient(circle at center, #0d1633 0%, #070a13 100%)'
      }}>
        <div className="glass-panel animate-fade" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
          {/* Logo & Title */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img
              src="/Final VBT Re-Branding 2026-02 (3).png"
              alt="VBT Logo"
              style={{ width: '130px', height: 'auto', marginBottom: '14px' }}
            />
            <h1 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '4px', fontFamily: 'var(--font-title)' }}>VBT Sports Platform</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Enter your event code to get started</p>
          </div>

          {/* Join Event Form */}
          {!showCreateEvent ? (
            <form onSubmit={handleJoinEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {eventJoinError && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 12px', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={14} /><span>{eventJoinError}</span>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>Event Code</label>
                <input
                  type="text"
                  value={eventJoinInput}
                  onChange={(e) => setEventJoinInput(e.target.value)}
                  placeholder="e.g. vbt_2026_camp"
                  autoCapitalize="none"
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                    color: '#ffffff', fontSize: '0.95rem', outline: 'none', fontFamily: 'monospace'
                  }}
                />
              </div>

              {/* Quick-join from registry */}
              {eventRegistry.filter(ev => ev.active).length > 0 && (
                <div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or tap to join:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {eventRegistry.filter(ev => ev.active).map(ev => (
                      <button
                        key={ev.code}
                        type="button"
                        onClick={() => { setEventJoinInput(ev.code); }}
                        style={{
                          padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)',
                          background: 'rgba(255,255,255,0.04)', color: '#ffffff', cursor: 'pointer',
                          textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '2px'
                        }}
                      >
                        <span style={{ fontWeight: '700' }}>{ev.name}</span>
                        {ev.date && <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{ev.date}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={eventJoinLoading}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px',
                  background: 'var(--gradient-vbt)', border: 'none', color: '#ffffff',
                  fontFamily: 'var(--font-title)', fontWeight: '600', fontSize: '1rem',
                  cursor: eventJoinLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(20,65,161,0.4)', marginTop: '4px',
                  opacity: eventJoinLoading ? 0.7 : 1
                }}
              >
                {eventJoinLoading ? 'Joining...' : 'Join Event →'}
              </button>

              <button
                type="button"
                onClick={() => setShowCreateEvent(true)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)',
                  background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                + Create a New Event
              </button>
            </form>
          ) : (
            /* Create New Event Form */
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <button type="button" onClick={() => setShowCreateEvent(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>← Back</button>
                <h3 style={{ color: '#ffffff', fontSize: '1rem', margin: 0 }}>Create New Event</h3>
              </div>
              {createEventError && (
                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '10px 12px', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem' }}>
                  {createEventError}
                </div>
              )}
              {[['Event Code', newEventCode, setNewEventCode, 'e.g. summer_2026', 'monospace'],
                ['Event Name', newEventName, setNewEventName, 'e.g. VBT Summer Camp', ''],
                ['Event Date', newEventDate, setNewEventDate, 'e.g. July 12, 2026', ''],
                ['Side 1 Name', newEventSide1, setNewEventSide1, 'e.g. Shakes, Red, Lions...', ''],
                ['Side 2 Name', newEventSide2, setNewEventSide2, 'e.g. Fries, Blue, Tigers...', ''],
                ['Coordinator Passcode', newEventPassCoord, setNewEventPassCoord, 'e.g. CAMP2026ADMIN', ''],
                ['Game Leader Passcode', newEventPassGame, setNewEventPassGame, 'e.g. GAMEREF2026', ''],
                ['Team Leader Passcode', newEventPassTeam, setNewEventPassTeam, 'e.g. LEADER2026', '']
              ].map(([label, val, setter, ph, ff]) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={ph}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                      color: '#ffffff', fontSize: '0.875rem', outline: 'none',
                      fontFamily: ff || 'inherit'
                    }}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={createEventLoading}
                style={{
                  width: '100%', padding: '13px', borderRadius: '10px',
                  background: 'var(--gradient-vbt)', border: 'none', color: '#ffffff',
                  fontFamily: 'var(--font-title)', fontWeight: '700', fontSize: '0.9rem',
                  cursor: createEventLoading ? 'not-allowed' : 'pointer', opacity: createEventLoading ? 0.7 : 1,
                  marginTop: '4px'
                }}
              >
                {createEventLoading ? 'Creating...' : '🚀 Create & Join Event'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'radial-gradient(circle at center, #0d1633 0%, #070a13 100%)'
      }}>
        <div className="glass-panel animate-fade" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img 
              src={eventConfig.logoUrl || '/Final VBT Re-Branding 2026-02 (3).png'}
              alt="Event Logo" 
              style={{ width: '120px', height: 'auto', marginBottom: '16px' }} 
            />
            <h1 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '4px', fontFamily: 'var(--font-title)' }}>{eventConfig.eventName || 'VBT SPORTS CAMP'}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{eventConfig.description || 'Leader Portal & Live Scoring'}</p>
            <button
              type="button"
              onClick={handleLeaveEvent}
              style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Change event
            </button>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>Select Role</label>
              <div className="toggle-group" style={{ marginBottom: '4px' }}>
                <button 
                  type="button"
                  className={`toggle-btn ${loginRole === 'leader' ? 'active' : ''}`}
                  onClick={() => { setLoginRole('leader'); setLoginError(''); }}
                >
                  Team Leader
                </button>
                <button 
                  type="button"
                  className={`toggle-btn ${loginRole === 'referee' ? 'active' : ''}`}
                  onClick={() => { setLoginRole('referee'); setLoginError(''); }}
                >
                  Game Leader
                </button>
                <button 
                  type="button"
                  className={`toggle-btn ${loginRole === 'admin' ? 'active' : ''}`}
                  onClick={() => { setLoginRole('admin'); setLoginError(''); }}
                >
                  Coordinator
                </button>
              </div>
            </div>

            {loginRole === 'leader' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>Select Team Leader Name</label>
                {leadersList.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#f59e0b', padding: '10px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    ⚠️ No leaders set up yet. Ask your coordinator to add names in the Controls tab.
                  </p>
                ) : (
                  <select
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    style={{
                      width: '100%', padding: '12px', borderRadius: '10px',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                      color: '#ffffff', fontSize: '0.95rem', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Choose Name --</option>
                    {leadersList.sort((a,b) => a.fullName.localeCompare(b.fullName)).map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.fullName}{l.groupLabel ? ` (${l.groupLabel})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>Camp Passcode</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter passcode"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 12px',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-light)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
                <Lock size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button 
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'var(--gradient-vbt)',
                border: 'none',
                color: '#ffffff',
                fontFamily: 'var(--font-title)',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(20, 65, 161, 0.4)',
                marginTop: '10px'
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalBothSides = scoreCalculations.shakesFinal + scoreCalculations.friesFinal;
  const shakesPercentage = totalBothSides > 0 ? (scoreCalculations.shakesFinal / totalBothSides) * 100 : 50;
  const friesPercentage = totalBothSides > 0 ? (scoreCalculations.friesFinal / totalBothSides) * 100 : 50;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Visual Ping Overlay */}
      {activePingAlert.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
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
      {/* Header */}
      <header className="glass-panel" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderRadius: '0 0 16px 16px',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        background: 'rgba(13, 20, 38, 0.8)'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={eventConfig.logoUrl || '/Final VBT Re-Branding 2026-02 (3).png'} alt="Logo" style={{ height: '32px', width: 'auto' }} />
            <div>
              <h2 style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.1 }}>{eventConfig.eventName || 'VBT CAMP'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className={`live-dot`} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Live Syncing</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Notification Permission Request */}
            {('Notification' in window) && Notification.permission !== 'granted' && (
              <button
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    await setupPushNotifications(currentUser, WEBPUSH_VAPID_KEY);
                    alert("Notifications enabled! You will now receive camp chimes and sync alerts in your Notification Center.");
                  } else {
                    alert("Permission denied. To enable notifications, go to your iPhone Settings -> Safari -> Page Settings.");
                  }
                }}
                style={{
                  background: 'rgba(251, 191, 36, 0.15)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  color: '#fbbf24',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Bell size={12} style={{ animation: 'pulse-glow 1.5s infinite' }} /> Enable Alerts
              </button>
            )}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: '600' }}>{currentUser.name}</p>
              <p style={{ fontSize: '0.65rem', color: currentUser.side === 'Shakes' ? 'var(--color-shakes)' : 'var(--color-fries)', fontWeight: '700' }}>
                {currentUser.side.toUpperCase()} ({currentUser.teamCode})
              </p>
            </div>
            <button 
              onClick={handleLogout} 
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main standings */}
      <section style={{ maxWidth: '600px', width: '100%', margin: '16px auto 0 auto', padding: '0 16px' }}>
        <div className="glass-panel animate-fade" style={{ padding: '16px', background: 'linear-gradient(180deg, rgba(20, 30, 58, 0.5) 0%, rgba(13, 20, 38, 0.7) 100%)' }}>
          <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current standings</span>
            </div>
            {scoreCalculations.winner !== 'TIE' && (
              <span className={`badge ${scoreCalculations.winner === 'SHAKES' ? 'badge-shakes' : 'badge-fries'}`}>
                {scoreCalculations.winner} leading
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-shakes)', textTransform: 'uppercase' }}>{side1Name}</p>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-title)', lineHeight: '1' }}>
                {scoreCalculations.shakesFinal}
              </p>
            </div>
            <div style={{ textAlign: 'center', paddingBottom: '4px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>VS</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-fries)', textTransform: 'uppercase' }}>{side2Name}</p>
              <p style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-title)', lineHeight: '1' }}>
                {scoreCalculations.friesFinal}
              </p>
            </div>
          </div>

          <div className="tug-of-war-container">
            <div className="tug-of-war-bar-shakes" style={{ width: `${shakesPercentage}%` }} />
            <div className="tug-of-war-bar-fries" style={{ width: `${friesPercentage}%` }} />
            <div className="tug-of-war-center" />
          </div>
        </div>
      </section>

      {/* Content tabs */}
      <main className="content-area animate-fade">
        
        {/* Tab 1: Scoreboard Accordions */}
        {currentTab === 'scoreboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '4px' }}>Game Score Entry</h2>
            
            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') ? (
              <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(41, 182, 246, 0.06)', border: '1px solid rgba(41, 182, 246, 0.2)', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.78rem', color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                  <span style={{ fontSize: '1rem' }}>📝</span>
                  <span><strong>{currentUser.role === 'admin' ? 'Coordinator' : 'Game Leader'} View:</strong> Tap the winner options (Shakes, Tie, Fries) below to submit scores in real-time. Any changes immediately update all devices.</span>
                </p>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                  <span style={{ fontSize: '1rem' }}>👀</span>
                  <span><strong>Team Leader View:</strong> Live scoreboard. Winner selection buttons are locked for security. If you see a discrepancy, contact a Coordinator.</span>
                </p>
              </div>
            )}
            
            {/* View Mode Switcher */}
            <div className="toggle-group" style={{ marginBottom: '4px' }}>
              <button 
                type="button"
                className={`toggle-btn ${scoreViewMode === 'block' ? 'active' : ''}`}
                onClick={() => setScoreViewMode('block')}
              >
                By Block
              </button>
              <button 
                type="button"
                className={`toggle-btn ${scoreViewMode === 'game' ? 'active' : ''}`}
                onClick={() => setScoreViewMode('game')}
              >
                By Game
              </button>
            </div>

            {scoreViewMode === 'block' && [1, 2, 3, 4].map((blockNum) => {
              const isOpen = expandedBlocks[blockNum];
              const blockTitle = 
                blockNum === 1 ? 'Block 1 - Temporary Fill' :
                blockNum === 2 ? 'Block 2 - Busy vs Blessed' :
                blockNum === 3 ? 'Block 3 - The Mask we Wear' :
                'Block 4 - Crowd Trap (Day 2)';
                
              const bScores = scoreCalculations[`b${blockNum}`];
              
              return (
                <div key={blockNum} className="glass-panel" style={{ overflow: 'hidden' }}>
                  <div 
                    className="block-header" 
                    onClick={() => setExpandedBlocks({ ...expandedBlocks, [blockNum]: !isOpen })}
                  >
                    <div>
                      <h3 style={{ fontSize: '0.95rem', color: '#ffffff' }}>{blockTitle}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Score: Shakes <span style={{ color: 'var(--color-shakes)', fontWeight: '700' }}>{bScores.shakes}</span> - Fries <span style={{ color: 'var(--color-fries)', fontWeight: '700' }}>{bScores.fries}</span>
                      </p>
                    </div>
                    <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>▼</span>
                  </div>
                  
                  {isOpen && (
                    <div className="block-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.1)' }}>
                      {Array.from(new Set(campData.matchups.filter(m => m.block === blockNum && m.game.toUpperCase() !== 'SPLIT').map(m => m.round))).map(roundNum => {
                        const roundMatches = campData.matchups.filter(m => m.block === blockNum && m.round === roundNum && m.game.toUpperCase() !== 'SPLIT');
                        
                        return (
                          <div key={roundNum} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '12px' }}>
                            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                              Round {roundNum}
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {roundMatches.map((m, idx) => {
                                const key = `${m.block}_${m.round}_${m.game}`;
                                const winner = (campState.blockScores || {})[key] || 'NA';
                                const pts = campData.gamePoints[m.game];
                                const isActive = isTimeSlotActive(m.time, `Block ${m.block}`);
                                
                                return (
                                  <div key={idx} className="glass-panel" style={{ padding: '10px', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                      <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>{m.game}</span>
                                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({pts} pts)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={10} style={{ color: 'var(--text-muted)' }} />
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.location}</span>
                                          </div>
                                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>•</span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={10} style={{ color: isActive ? 'var(--vbt-sky)' : 'var(--text-muted)' }} />
                                            <span style={{ fontSize: '0.7rem', color: isActive ? 'var(--vbt-sky)' : 'var(--text-secondary)', fontWeight: isActive ? '700' : 'normal' }}>
                                              {getEffectiveTimeShift() > 0 ? `${getShiftedTimeStr(m.time, getEffectiveTimeShift())} (+${getEffectiveTimeShift()}m)` : m.time}
                                            </span>
                                          </div>
                                          {isActive && (
                                            <span className="badge badge-shakes" style={{ animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none', padding: '1px 4px', fontSize: '0.6rem' }}>
                                              LIVE
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800' }}>
                                        {winner === 'NA' ? (
                                          <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                                        ) : winner === 'Shakes' ? (
                                          <span style={{ color: 'var(--color-shakes)' }}>Shakes Win</span>
                                        ) : winner === 'Fries' ? (
                                          <span style={{ color: 'var(--color-fries)' }}>Fries Win</span>
                                        ) : (
                                          <span style={{ color: 'var(--color-tie)' }}>Tie</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                                      <span style={{ color: 'var(--color-shakes)', fontWeight: '600' }}>{m.shakes} (Shakes)</span>
                                      <span style={{ color: 'var(--text-muted)' }}>vs</span>
                                      <span style={{ color: 'var(--color-fries)', fontWeight: '600' }}>{m.fries} (Fries)</span>
                                    </div>
                                    
                                    {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') && (
                                      <div className="winner-selector">
                                        <button 
                                          className={`winner-option ${winner === 'Shakes' ? 'active-shakes' : ''}`}
                                          onClick={() => handleToggleWinner(m.block, m.round, m.game, 'Shakes')}
                                        >
                                          Shakes
                                        </button>
                                        <button 
                                          className={`winner-option ${winner === 'TIE' ? 'active-tie' : ''}`}
                                          onClick={() => handleToggleWinner(m.block, m.round, m.game, 'TIE')}
                                        >
                                          Tie
                                        </button>
                                        <button 
                                          className={`winner-option ${winner === 'Fries' ? 'active-fries' : ''}`}
                                          onClick={() => handleToggleWinner(m.block, m.round, m.game, 'Fries')}
                                        >
                                          Fries
                                        </button>
                                        <button 
                                          className={`winner-option`}
                                          style={{ color: winner === 'NA' ? '#ffffff' : 'var(--text-muted)' }}
                                          onClick={() => handleToggleWinner(m.block, m.round, m.game, 'NA')}
                                        >
                                          Reset
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {scoreViewMode === 'game' && uniqueGames.map((gameName) => {
              const isOpen = expandedGames[gameName];
              const gameMatches = campData.matchups.filter(m => m.game === gameName);
              const pts = campData.gamePoints[gameName] || 0;
              
              const completedCount = gameMatches.filter(m => {
                const key = `${m.block}_${m.round}_${m.game}`;
                return campState.blockScores?.[key] && campState.blockScores[key] !== 'NA';
              }).length;
              
              return (
                <div key={gameName} className="glass-panel" style={{ overflow: 'hidden' }}>
                  <div 
                    className="block-header" 
                    onClick={() => setExpandedGames({ ...expandedGames, [gameName]: !isOpen })}
                    style={{ background: 'linear-gradient(90deg, rgba(20, 65, 161, 0.08) 0%, rgba(13, 20, 38, 0.15) 100%)' }}
                  >
                    <div>
                      <h3 style={{ fontSize: '0.95rem', color: '#ffffff' }}>{gameName} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({pts} pts)</span></h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Logged: <span style={{ color: 'var(--vbt-sky)', fontWeight: '700' }}>{completedCount}</span> / {gameMatches.length} matches
                      </p>
                    </div>
                    <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>▼</span>
                  </div>
                  
                  {isOpen && (
                    <div className="block-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.1)', padding: '12px' }}>
                      {gameMatches.map((m, idx) => {
                        const key = `${m.block}_${m.round}_${m.game}`;
                        const winner = (campState.blockScores || {})[key] || 'NA';
                        const isActive = isTimeSlotActive(m.time, `Block ${m.block}`);
                        
                        return (
                          <div key={idx} className="glass-panel" style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--vbt-sky)' }}>
                                  Block {m.block} • Round {m.round}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: isActive ? 'var(--vbt-sky)' : 'var(--text-muted)', marginLeft: '8px', fontWeight: isActive ? '700' : 'normal' }}>
                                  {getEffectiveTimeShift() > 0 ? `${getShiftedTimeStr(m.time, getEffectiveTimeShift())} (+${getEffectiveTimeShift()}m)` : m.time}
                                </span>
                                {isActive && (
                                  <span className="badge badge-shakes" style={{ animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none', padding: '1px 4px', fontSize: '0.6rem', marginLeft: '6px' }}>
                                    LIVE
                                  </span>
                                )}
                              </div>
                              <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800' }}>
                                {winner === 'NA' ? (
                                  <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                                ) : winner === 'Shakes' ? (
                                  <span style={{ color: 'var(--color-shakes)' }}>Shakes Win</span>
                                ) : winner === 'Fries' ? (
                                  <span style={{ color: 'var(--color-fries)' }}>Fries Win</span>
                                ) : (
                                  <span style={{ color: 'var(--color-tie)' }}>Tie</span>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                              <span style={{ color: 'var(--color-shakes)', fontWeight: '600' }}>{m.shakes} (Shakes)</span>
                              <span style={{ color: 'var(--text-muted)' }}>vs</span>
                              <span style={{ color: 'var(--color-fries)', fontWeight: '600' }}>{m.fries} (Fries)</span>
                            </div>
                            
                            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') && (
                              <div className="winner-selector">
                                <button 
                                  className={`winner-option ${winner === 'Shakes' ? 'active-shakes' : ''}`}
                                  onClick={() => handleToggleWinner(m.block, m.round, m.game, 'Shakes')}
                                >
                                  Shakes
                                </button>
                                <button 
                                  className={`winner-option ${winner === 'TIE' ? 'active-tie' : ''}`}
                                  onClick={() => handleToggleWinner(m.block, m.round, m.game, 'TIE')}
                                >
                                  Tie
                                </button>
                                <button 
                                  className={`winner-option ${winner === 'Fries' ? 'active-fries' : ''}`}
                                  onClick={() => handleToggleWinner(m.block, m.round, m.game, 'Fries')}
                                >
                                  Fries
                                </button>
                                <button 
                                  className={`winner-option`}
                                  style={{ color: winner === 'NA' ? '#ffffff' : 'var(--text-muted)' }}
                                  onClick={() => handleToggleWinner(m.block, m.round, m.game, 'NA')}
                                >
                                  Reset
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: My Team Personalized Stats */}
        {currentTab === 'myteam' && myTeamInfo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(20, 65, 161, 0.1) 0%, rgba(13, 20, 38, 0.4) 100%)' }}>
              <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className={`badge ${currentUser.side === 'Shakes' ? 'badge-shakes' : 'badge-fries'}`}>{currentUser.side} Side</span>
                  <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '6px' }}>Team {currentUser.teamCode}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Leaders: {myTeamInfo.leaders}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Grade: {myTeamInfo.grade}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>My Deductions</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: '800', color: myTeamInfo.deductions > 0 ? '#ef4444' : '#22c55e', lineHeight: 1 }}>
                    -{myTeamInfo.deductions}
                  </p>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>pts deducted</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <button 
                  onClick={() => handleAdjustDeduction(currentUser.teamCode, 1)}
                  disabled={myTeamInfo.deductions >= 10}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: myTeamInfo.deductions >= 10 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(239, 68, 68, 0.3)',
                    background: myTeamInfo.deductions >= 10 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(239, 68, 68, 0.08)',
                    color: myTeamInfo.deductions >= 10 ? 'rgba(255, 255, 255, 0.25)' : '#ef4444',
                    fontFamily: 'var(--font-title)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: myTeamInfo.deductions >= 10 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={14} /> Add Deduction
                </button>
                <button 
                  onClick={() => handleAdjustDeduction(currentUser.teamCode, -1)}
                  disabled={myTeamInfo.deductions <= 0}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    background: 'rgba(255,255,255,0.05)',
                    color: myTeamInfo.deductions <= 0 ? 'rgba(255, 255, 255, 0.25)' : '#ffffff',
                    fontFamily: 'var(--font-title)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: myTeamInfo.deductions <= 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: myTeamInfo.deductions <= 0 ? 0.5 : 1
                  }}
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>

            {/* WHERE YOU SHOULD BE NOW! Banner */}
            <div className="glass-panel" style={{
              padding: '16px',
              background: currentActiveSlot 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(13, 20, 38, 0.6) 100%)' 
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(13, 20, 38, 0.6) 100%)',
              border: '1px solid',
              borderColor: currentActiveSlot ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-light)',
              borderRadius: '12px',
              boxShadow: currentActiveSlot ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none'
            }}>
              <p style={{
                fontSize: '0.75rem',
                color: currentActiveSlot ? '#ef4444' : 'var(--text-secondary)',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span className={currentActiveSlot ? "live-dot" : ""} style={{ background: currentActiveSlot ? "#ef4444" : "transparent" }} />
                WHERE YOU SHOULD BE NOW!
              </p>
              {currentActiveSlot ? (
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: '800', marginBottom: '4px' }}>
                    {currentActiveSlot.game}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} style={{ color: 'var(--vbt-sky)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff' }}>
                        {currentActiveSlot.location}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {getEffectiveTimeShift() > 0 ? getShiftedTimeStr(currentActiveSlot.time, getEffectiveTimeShift()) : currentActiveSlot.time}
                      </span>
                    </div>
                    {getEffectiveTimeShift() > 0 && (
                      <span className="badge badge-shakes" style={{ background: '#ef4444', color: '#ffffff', border: 'none', fontSize: '0.65rem', padding: '2px 6px' }}>
                        +{getEffectiveTimeShift()}m delay
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '700', margin: 0 }}>
                  No active game matches. Break / Free Play
                </p>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Clock size={16} style={{ color: 'var(--vbt-sky)' }} />
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff' }}>Team Timeline & Schedule</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Day 1 Section */}
                <div>
                  <h4 style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--vbt-sky)', 
                    fontWeight: '700', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    borderBottom: '1px solid rgba(41, 182, 246, 0.2)',
                    paddingBottom: '4px'
                  }}>
                    Day 1 (Blocks 1-3)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myTeamInfo.day1Schedule.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>No Day 1 activities scheduled.</p>
                    ) : (
                      myTeamInfo.day1Schedule.map((slot, idx) => {
                        const isActive = isTimeSlotActive(slot.time, slot.block);
                        return (
                          <div 
                            key={`day1-${idx}`} 
                            className="glass-panel"
                            style={{ 
                              padding: '12px', 
                              background: isActive ? 'rgba(41, 182, 246, 0.08)' : 'rgba(0,0,0,0.15)',
                              borderColor: isActive ? 'var(--vbt-sky)' : 'var(--border-light)',
                              boxShadow: isActive ? 'var(--shadow-glow-shakes)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isActive ? 'var(--vbt-sky)' : 'var(--text-secondary)' }}>
                                  {getEffectiveTimeShift() > 0 ? `${getShiftedTimeStr(slot.time, getEffectiveTimeShift())} (+${getEffectiveTimeShift()}m)` : slot.time}
                                </span>
                                {isActive && (
                                  <span className="badge badge-shakes" style={{ animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none' }}>
                                    LIVE NOW
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{slot.block.split(' - ')[0]}</span>
                            </div>
                            
                            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>{slot.game}</p>
                                {slot.gameExtra && (
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Split: {slot.gameExtra}</p>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '6px' }}>
                                <MapPin size={12} style={{ color: 'var(--vbt-sky)' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ffffff' }}>{slot.location}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Day 2 Section */}
                <div>
                  <h4 style={{ 
                    fontSize: '0.75rem', 
                    color: '#f43f5e', 
                    fontWeight: '700', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                    borderBottom: '1px solid rgba(244, 63, 94, 0.2)',
                    paddingBottom: '4px'
                  }}>
                    Day 2 (Block 4)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myTeamInfo.day2Schedule.length === 0 ? (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>No Day 2 activities scheduled.</p>
                    ) : (
                      myTeamInfo.day2Schedule.map((slot, idx) => {
                        const isActive = isTimeSlotActive(slot.time, slot.block);
                        return (
                          <div 
                            key={`day2-${idx}`} 
                            className="glass-panel"
                            style={{ 
                              padding: '12px', 
                              background: isActive ? 'rgba(41, 182, 246, 0.08)' : 'rgba(0,0,0,0.15)',
                              borderColor: isActive ? 'var(--vbt-sky)' : 'var(--border-light)',
                              boxShadow: isActive ? 'var(--shadow-glow-shakes)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isActive ? 'var(--vbt-sky)' : 'var(--text-secondary)' }}>
                                  {getEffectiveTimeShift() > 0 ? `${getShiftedTimeStr(slot.time, getEffectiveTimeShift())} (+${getEffectiveTimeShift()}m)` : slot.time}
                                </span>
                                {isActive && (
                                  <span className="badge badge-shakes" style={{ animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none' }}>
                                    LIVE NOW
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{slot.block.split(' - ')[0]}</span>
                            </div>
                            
                            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>{slot.game}</p>
                                {slot.gameExtra && (
                                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Split: {slot.gameExtra}</p>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '6px' }}>
                                <MapPin size={12} style={{ color: 'var(--vbt-sky)' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#ffffff' }}>{slot.location}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Camp Sub-Teams Directory */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Users size={16} style={{ color: 'var(--vbt-sky)' }} />
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff' }}>Camp Teams Directory</h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Shakes Side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.75rem', color: 'var(--color-shakes)', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid rgba(0, 176, 255, 0.2)', paddingBottom: '4px' }}>
                    Shakes Side
                  </h4>
                  {Object.entries(campData.teams)
                    .filter(([_, t]) => t.side === 'Shakes')
                    .map(([code, t]) => (
                      <div key={code} style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                        <p style={{ fontWeight: '700', color: '#ffffff' }}>{code} (Grade {t.grade})</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{t.leaders}</p>
                      </div>
                    ))
                  }
                </div>

                {/* Fries Side */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h4 style={{ fontSize: '0.75rem', color: 'var(--color-fries)', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid rgba(255, 145, 0, 0.2)', paddingBottom: '4px' }}>
                    Fries Side
                  </h4>
                  {Object.entries(campData.teams)
                    .filter(([_, t]) => t.side === 'Fries')
                    .map(([code, t]) => (
                      <div key={code} style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem' }}>
                        <p style={{ fontWeight: '700', color: '#ffffff' }}>{code} (Grade {t.grade})</p>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{t.leaders}</p>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Full Schedule filterable */}
        {currentTab === 'schedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                <span style={{ fontSize: '1rem' }}>📅</span>
                <span><strong>Live Schedule:</strong> View today's blocks, locations, and matchups. Any updates to the schedule Google Sheet will automatically sync and show up here. Active matches are marked <strong>LIVE</strong>.</span>
              </p>
            </div>

            {/* Day Selector Segmented Control */}
            <div className="toggle-group" style={{ 
              display: 'flex',
              width: '100%',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '10px',
              padding: '2px',
              border: '1px solid var(--border-light)'
            }}>
              <button 
                type="button"
                className={`toggle-btn ${scheduleDayFilter === '1' ? 'active' : ''}`}
                onClick={() => setScheduleDayFilter('1')}
                style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  fontSize: '0.8rem', 
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  background: scheduleDayFilter === '1' ? 'var(--gradient-vbt)' : 'transparent',
                  color: '#ffffff'
                }}
              >
                Day 1 (Blocks 1-3)
              </button>
              <button 
                type="button"
                className={`toggle-btn ${scheduleDayFilter === '2' ? 'active' : ''}`}
                onClick={() => setScheduleDayFilter('2')}
                style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  fontSize: '0.8rem', 
                  fontWeight: '700',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  background: scheduleDayFilter === '2' ? 'var(--gradient-vbt)' : 'transparent',
                  color: '#ffffff'
                }}
              >
                Day 2 (Block 4)
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Matchups & Locations</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {scheduleDayFilter === '1' ? (
                  <select 
                    value={scheduleBlockFilter}
                    onChange={(e) => setScheduleBlockFilter(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-light)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      outline: 'none',
                      fontWeight: '600'
                    }}
                  >
                    <option value="All">All Blocks</option>
                    <option value="1">Block 1</option>
                    <option value="2">Block 2</option>
                    <option value="3">Block 3</option>
                  </select>
                ) : (
                  <div style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--vbt-sky)',
                    fontSize: '0.75rem',
                    fontWeight: '700'
                  }}>
                    Block 4
                  </div>
                )}
                
                <select 
                  value={scheduleTeamFilter}
                  onChange={(e) => setScheduleTeamFilter(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                >
                  <option value="">All Teams</option>
                  {Object.keys(campData.teams).map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule Controls (Coordinators & Game Leaders) / Status Banner (Others) */}
            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') ? (
              <div className="glass-panel" style={{ 
                padding: '12px', 
                background: 'linear-gradient(135deg, rgba(20, 65, 161, 0.12) 0%, rgba(13, 20, 38, 0.5) 100%)', 
                border: '1px solid rgba(41, 182, 246, 0.3)',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock3 size={16} style={{ color: 'var(--vbt-sky)' }} />
                    <span style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ⚡ Timer Controls
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                    <span className={campState.isTimerPaused ? "" : "live-dot"} style={{ background: campState.isTimerPaused ? "#94a3b8" : "#22c55e", width: '6px', height: '6px' }} />
                    <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: '700', color: '#ffffff' }}>
                      {campState.isTimerPaused ? 'PAUSED' : 'RUNNING'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>Current Shift</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: getEffectiveTimeShift() > 0 ? '#ef4444' : '#22c55e', fontFamily: 'var(--font-title)' }}>
                      {getEffectiveTimeShift() > 0 ? `+${getEffectiveTimeShift()} min` : 'On Schedule'}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      onClick={handleToggleTimer}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        background: campState.isTimerPaused ? 'var(--gradient-vbt)' : 'rgba(239, 68, 68, 0.2)',
                        border: campState.isTimerPaused ? 'none' : '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {campState.isTimerPaused ? '▶️ Resume' : '⏸️ Pause'}
                    </button>

                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button 
                        onClick={() => handleAdjustTimeShift(-5)}
                        disabled={(campState.timeShiftMinutes || 0) <= 0}
                        style={{
                          padding: '8px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-light)',
                          background: 'rgba(255,255,255,0.05)',
                          color: (campState.timeShiftMinutes || 0) <= 0 ? 'var(--text-muted)' : '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          cursor: (campState.timeShiftMinutes || 0) <= 0 ? 'not-allowed' : 'pointer'
                        }}
                        title="Reduce delay by 5m"
                      >
                        -5m
                      </button>
                      <button 
                        onClick={() => handleAdjustTimeShift(5)}
                        style={{
                          padding: '8px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-light)',
                          background: 'rgba(255,255,255,0.05)',
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                        title="Increase delay by 5m"
                      >
                        +5m
                      </button>
                    </div>

                    <button 
                      onClick={handleResetTimeShift}
                      disabled={getEffectiveTimeShift() === 0}
                      style={{
                        padding: '8px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: getEffectiveTimeShift() === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                        color: getEffectiveTimeShift() === 0 ? 'var(--text-muted)' : '#ffffff',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        cursor: getEffectiveTimeShift() === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Broadcast Sync Pings (Centralized Bell) */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>🚨 Broadcast Round Sync:</span>
                  <button 
                    onClick={async () => {
                      if (window.confirm("Broadcast ROUND START ping to all devices?")) {
                        const msg = "🚨 ROUND STARTING NOW! Please move to your next location immediately.";
                        await addAnnouncement(msg, currentUser.name, 'ping');
                        await triggerRemotePushNotification("VBT Round Sync Alert", msg);
                      }
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      color: '#4ade80',
                      fontWeight: '700',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🔔 Round Start
                  </button>
                  <button 
                    onClick={async () => {
                      if (window.confirm("Broadcast ROUND END ping to all devices?")) {
                        const msg = "🚨 ROUND ENDING! Wrap up your games and report scores.";
                        await addAnnouncement(msg, currentUser.name, 'ping');
                        await triggerRemotePushNotification("VBT Round Sync Alert", msg);
                      }
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      fontWeight: '700',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🔕 Round End
                  </button>
                </div>
                
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                  * Pausing time automatically accumulates a live delay. Resuming solidifies the delay. Matchup times shift automatically.
                </p>
              </div>
            ) : (
              // Read-only delay warning banner for Team Leaders
              <div className="glass-panel" style={{ 
                padding: '12px 16px', 
                background: getEffectiveTimeShift() > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)', 
                border: '1px solid',
                borderColor: getEffectiveTimeShift() > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(34, 197, 94, 0.25)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock3 size={16} style={{ color: getEffectiveTimeShift() > 0 ? '#f87171' : '#4ade80' }} />
                  <span style={{ fontSize: '0.78rem', color: '#ffffff' }}>
                    {getEffectiveTimeShift() > 0 ? (
                      <span><strong>Schedule Delay:</strong> Matchup times shifted by <strong>+{getEffectiveTimeShift()} mins</strong>.</span>
                    ) : (
                      <span><strong>On Schedule:</strong> Camp is running exactly on time!</span>
                    )}
                  </span>
                </div>
                {campState.isTimerPaused && (
                  <span className="badge badge-shakes" style={{ background: '#ef4444', color: '#ffffff', border: 'none', fontSize: '0.65rem', padding: '1px 6px' }}>
                    PAUSED
                  </span>
                )}
              </div>
            )}

            {/* Where is everyone at (Live Location Tracker) */}
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} style={{ color: 'var(--vbt-sky)' }} />
                  <h3 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '700' }}>Where is everyone at? (Live Tracker)</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="live-dot" style={{ animation: 'pulse-glow 1.5s infinite' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Live Locations</span>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {liveLocationStatus.map((loc) => {
                  const active = loc.activeMatchup;
                  return (
                    <div 
                      key={loc.id} 
                      style={{ 
                        background: active ? 'rgba(41, 182, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: '1px solid',
                        borderColor: active ? 'rgba(41, 182, 246, 0.25)' : 'var(--border-light)',
                        padding: '10px',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '100px',
                        gap: '6px',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '2px', marginBottom: '4px' }}>
                          {loc.name}
                        </span>
                        {active ? (
                          <>
                            <p style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {active.game}
                            </p>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                              Block {active.block} • Rd {active.round}
                            </span>
                          </>
                        ) : (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0 0' }}>
                            Empty / Free Play
                          </p>
                        )}
                      </div>
                      
                      {active && (
                        <div style={{ 
                          background: 'rgba(0,0,0,0.25)', 
                          padding: '4px', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem', 
                          fontWeight: '700',
                          textAlign: 'center',
                          color: '#ffffff',
                          border: '1px solid rgba(255,255,255,0.03)'
                        }}>
                          <span style={{ color: 'var(--color-shakes)' }}>{active.shakes}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px', fontWeight: 'normal' }}>vs</span>
                          <span style={{ color: 'var(--color-fries)' }}>{active.fries}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredMatchups.length === 0 ? (
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No matchups fit the current filters.
                </div>
              ) : (
                filteredMatchups.map((m, idx) => {
                  const isActive = isTimeSlotActive(m.time, `Block ${m.block}`);
                  const key = `${m.block}_${m.round}_${m.game}`;
                  const winner = (campState.blockScores || {})[key] || 'NA';
                  
                  return (
                    <div 
                      key={idx}
                      className="glass-panel"
                      style={{ 
                        padding: '12px',
                        background: isActive ? 'rgba(20, 65, 161, 0.08)' : 'var(--bg-surface)',
                        borderColor: isActive ? 'var(--vbt-sky)' : 'var(--border-light)'
                      }}
                    >
                      <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: isActive ? 'var(--vbt-sky)' : 'var(--text-muted)', fontWeight: '700' }}>
                            BLOCK {m.block} • RD {m.round}
                          </span>
                          {isActive && (
                            <span className="badge badge-shakes" style={{ animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none' }}>
                              LIVE
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: '700' }}>
                          {getEffectiveTimeShift() > 0 ? (
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span>{getShiftedTimeStr(m.time, getEffectiveTimeShift())}</span>
                              <span style={{ fontSize: '0.6rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 4px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                +{getEffectiveTimeShift()}m delay
                              </span>
                            </span>
                          ) : (
                            m.time
                          )}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>{m.game}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <MapPin size={10} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.location}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                            <span style={{ color: 'var(--color-shakes)', fontWeight: '700' }}>{m.shakes}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>vs</span>
                            <span style={{ color: 'var(--color-fries)', fontWeight: '700' }}>{m.fries}</span>
                          </div>
                          {winner !== 'NA' && (
                            <p style={{ fontSize: '0.6rem', color: winner === 'Shakes' ? 'var(--color-shakes)' : winner === 'Fries' ? 'var(--color-fries)' : 'var(--color-tie)', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px' }}>
                              {winner} won
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Live Timeline / Notifications */}
        {currentTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Live Camp Feed</h2>
            
            <form onSubmit={handlePostAnnouncement} className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="text"
                  placeholder="Post announcement or upload photo..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-light)',
                    color: '#ffffff',
                    outline: 'none',
                    fontSize: '0.875rem'
                  }}
                />
                
                <input 
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-light)',
                    color: uploadImage ? 'var(--vbt-sky)' : '#ffffff',
                    padding: '10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Camera size={16} />
                </button>

                <button 
                  type="submit"
                  style={{
                    background: 'var(--gradient-vbt)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Send size={16} />
                </button>
              </div>

              {uploadImage && (
                <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--vbt-sky)' }}>
                  <img src={uploadImage} alt="Upload Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button"
                    onClick={() => setUploadImage(null)}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {announcements.length === 0 ? (
                <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No feed items yet. Edits and announcements will show up here.
                </div>
              ) : (
                announcements.map((feed) => {
                  const time = new Date(feed.timestamp);
                  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  let iconColor = 'var(--text-muted)';
                  let bgColor = 'var(--bg-surface)';
                  if (feed.type === 'score') {
                    iconColor = '#fbbf24';
                    bgColor = 'rgba(251, 191, 36, 0.04)';
                  } else if (feed.type === 'deduction') {
                    iconColor = '#ef4444';
                    bgColor = 'rgba(239, 68, 68, 0.04)';
                  } else if (feed.type === 'system') {
                    iconColor = 'var(--vbt-sky)';
                    bgColor = 'rgba(41, 182, 246, 0.04)';
                  }
                  
                  return (
                    <div 
                      key={feed.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '12px', 
                        background: bgColor,
                        borderLeft: feed.type === 'score' ? '3px solid #fbbf24' : feed.type === 'deduction' ? '3px solid #ef4444' : feed.type === 'system' ? '3px solid var(--vbt-sky)' : '1px solid var(--border-light)'
                      }}
                    >
                      <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {feed.sender}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                          {timeStr}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{feed.text}</p>
                      
                      {feed.image && (
                        <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', maxWidth: '300px', border: '1px solid var(--border-light)' }}>
                          <img src={feed.image} alt="Feed Attachment" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        </div>
                      )}

                      {/* Reactions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px' }}>
                        {[
                          { type: 'thumbsup', emoji: '👍' },
                          { type: 'congrats', emoji: '🎉' },
                          { type: 'fire', emoji: '🔥' }
                        ].map(react => {
                          const list = feed.reactions?.[react.type] || [];
                          const hasReacted = list.includes(currentUser.name);
                          return (
                            <button
                              key={react.type}
                              onClick={() => handleToggleReaction(feed.id, react.type)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: hasReacted ? 'rgba(41, 182, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                                border: '1px solid',
                                borderColor: hasReacted ? 'var(--vbt-sky)' : 'var(--border-light)',
                                padding: '4px 8px',
                                borderRadius: '20px',
                                color: hasReacted ? 'var(--vbt-sky)' : 'var(--text-secondary)',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={list.join(', ') || 'No reactions'}
                            >
                              {react.emoji} {list.length}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
              const trendData = [
                { name: 'Start', shakes: 0, fries: 0 },
                { name: 'Block 1', shakes: b1.shakes, fries: b1.fries },
                { name: 'Block 2', shakes: b1.shakes + b2.shakes, fries: b1.fries + b2.fries },
                { name: 'Block 3', shakes: b1.shakes + b2.shakes + b3.shakes, fries: b1.fries + b2.fries + b3.fries },
                { name: 'Block 4', shakes: scoreCalculations.shakesBlocksTotal, fries: scoreCalculations.friesBlocksTotal }
              ];

              const width = 320;
              const height = 180;
              const paddingLeft = 35;
              const paddingRight = 15;
              const paddingTop = 20;
              const paddingBottom = 25;
              
              const chartWidth = width - paddingLeft - paddingRight;
              const chartHeight = height - paddingTop - paddingBottom;
              
              const maxScore = Math.max(100, scoreCalculations.shakesBlocksTotal, scoreCalculations.friesBlocksTotal);
              const scaleY = (val) => height - paddingBottom - (val * chartHeight / maxScore);
              const scaleX = (idx) => paddingLeft + (idx * chartWidth / 4);
              
              const shakesPoints = trendData.map((d, i) => `${scaleX(i)},${scaleY(d.shakes)}`).join(' ');
              const friesPoints = trendData.map((d, i) => `${scaleX(i)},${scaleY(d.fries)}`).join(' ');

              const teamsWithDeductions = Object.entries(campState.teamDeductions || {})
                .map(([code, val]) => ({
                  code,
                  val,
                  side: campData.teams[code]?.side || 'Shakes'
                }))
                .filter(t => t.val > 0)
                .sort((a, b) => b.val - a.val);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '12px', textAlign: 'center' }}>Cumulative Score Progression</h3>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
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
                        })}
                      </svg>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-shakes)' }}>
                        <span style={{ width: '12px', height: '3px', background: 'var(--color-shakes)', display: 'inline-block' }} /> Shakes Side
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-fries)' }}>
                        <span style={{ width: '12px', height: '3px', background: 'var(--color-fries)', display: 'inline-block' }} /> Fries Side
                      </div>
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
                                  background: team.side === 'Shakes' ? 'var(--gradient-shakes)' : 'var(--gradient-fries)',
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* Shakes side */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ fontSize: '0.85rem', color: 'var(--color-shakes)', textTransform: 'uppercase', fontWeight: '700', textAlign: 'center', borderBottom: '1px solid rgba(0, 176, 255, 0.2)', paddingBottom: '6px' }}>
                      Shakes (-{scoreCalculations.shakesDeductions})
                    </h3>
                    {Object.keys(campData.teams).filter(code => campData.teams[code].side === 'Shakes').map(code => {
                      const team = campData.teams[code];
                      const dVal = (campState.teamDeductions || {})[code] || 0;
                      const canEdit = currentUser.role === 'admin' || (currentUser.role === 'leader' && currentUser.teamCode === code);
                      return (
                        <div key={code} className="glass-panel glass-card-shakes" style={{ padding: '10px', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{code}</p>
                              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{team.leaders.split('/')[0]}</p>
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
                      Fries (-{scoreCalculations.friesDeductions})
                    </h3>
                    {Object.keys(campData.teams).filter(code => campData.teams[code].side === 'Fries').map(code => {
                      const team = campData.teams[code];
                      const dVal = (campState.teamDeductions || {})[code] || 0;
                      const canEdit = currentUser.role === 'admin' || (currentUser.role === 'leader' && currentUser.teamCode === code);
                      return (
                        <div key={code} className="glass-panel glass-card-fries" style={{ padding: '10px', background: 'rgba(0,0,0,0.2)' }}>
                          <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{code}</p>
                              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>{team.leaders.split('/')[0]}</p>
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
                className={`toggle-btn ${infoSubTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setInfoSubTab('timeline')}
              >
                <Clock3 size={14} /> Timeline
              </button>
              <button 
                className={`toggle-btn ${infoSubTab === 'faq' ? 'active' : ''}`}
                onClick={() => setInfoSubTab('faq')}
              >
                <HelpCircle size={14} /> FAQs
              </button>
            </div>

            {/* Sub-tab Content: Map */}
            {infoSubTab === 'map' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '12px' }}>Camp Map & Layout</h3>
                  
                  {/* Interactive Map display */}
                  <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '10px', background: '#ffffff', padding: '4px' }}>
                    <img 
                      src="/image1.png" 
                      alt="Camp Map Layout" 
                      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }} 
                    />
                  </div>
                </div>

                {/* Location Key Interactive List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#ffffff', paddingLeft: '4px' }}>Tap a Location to See Schedule</h3>
                  
                  {locationKey.map((loc, idx) => {
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
                                  const isActive = isTimeSlotActive(m.time, `Block ${m.block}`);
                                  return (
                                    <div 
                                      key={mIdx} 
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.75rem',
                                        padding: '6px 8px',
                                        background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: '4px',
                                        border: isActive ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                                      }}
                                    >
                                      <span>{getEffectiveTimeShift() > 0 ? getShiftedTimeStr(m.time, getEffectiveTimeShift()) : m.time} (Block {m.block}){getEffectiveTimeShift() > 0 ? ` (+${getEffectiveTimeShift()}m)` : ''}</span>
                                      <span style={{ fontWeight: '700', color: '#ffffff' }}>{m.game}: {m.shakes} vs {m.fries}</span>
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

            {/* Sub-tab Content: Day Timeline Schedule Image */}
            {infoSubTab === 'timeline' && (
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '0.95rem', color: '#ffffff' }}>Full Day Program Timeline</h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Pinch or scroll to zoom</span>
                </div>
                <div style={{ 
                  overflow: 'auto', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-light)',
                  maxHeight: '450px',
                  background: '#070a13'
                }}>
                  <img 
                    src="/image2.jpg" 
                    alt="Camp Timeline Overview" 
                    style={{ width: '100%', minWidth: '400px', height: 'auto', display: 'block' }} 
                  />
                </div>
              </div>
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

        {/* Tab 7: Settings */}
        {currentTab === 'settings' && currentUser && currentUser.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Control Panel</h2>

            {/* Google Sheets Sync panel */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '6px' }}>Google Sheets Live Sync</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Manage schedule synchronization from your camp spreadsheet. The app polls in the background, or you can force an instant sync below.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Direct Google Sheet link button */}
                <a 
                  href="https://docs.google.com/spreadsheets/d/106n37V38hEdy9Mto0kXS4aipAQDNi5uNh7kR9IWrbME/edit?gid=32520354#gid=32520354"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-light)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-title)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    textAlign: 'center',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                >
                  <Calendar size={16} />
                  Open Google Sheet
                </a>

                {/* Sync Trigger button */}
                <button 
                  onClick={handleSyncGoogleSheet}
                  disabled={isSyncing}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--gradient-vbt)',
                    border: 'none',
                    color: '#ffffff',
                    fontFamily: 'var(--font-title)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: isSyncing ? 'not-allowed' : 'pointer',
                    opacity: isSyncing ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(41, 182, 246, 0.2)'
                  }}
                >
                  {isSyncing ? (
                    <>
                      <div className="spinner" style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Clock3 size={16} />
                      Sync Google Sheet Now
                    </>
                  )}
                </button>

                {/* Sync status messages */}
                {syncStatus && (
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: syncError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    border: syncError ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)',
                    color: syncError ? '#f87171' : '#4ade80',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertCircle size={14} />
                    <span>{syncStatus}</span>
                  </div>
                )}

                {/* Step-by-step Apps Script guide */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div>
                    <h4 style={{ fontSize: '0.78rem', color: '#ffffff', marginBottom: '6px', fontWeight: '700' }}>⚡ Setup Two-Way Auto-Sync</h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                      To make updates sync bidirectionally (Spreadsheet ➔ App and App ➔ Spreadsheet), copy this unified code and paste it inside the sheet's <strong>Extensions → Apps Script</strong> editor:
                    </p>
                    <pre style={{
                      background: 'rgba(0,0,0,0.4)',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.65rem',
                      color: 'var(--vbt-sky)',
                      overflowX: 'auto',
                      maxHeight: '180px',
                      fontFamily: 'monospace',
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}>
{`function onEdit(e) {
  UrlFetchApp.fetch('https://sync-vbt-sheet-75ez7bhuzq-ew.a.run.app', {
    method: 'post'
  });
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === "update_scores") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var calcSheet = ss.getSheetByName("Score Calculator");
      
      // Update Block Scores
      if (postData.blockScores) {
        for (var key in postData.blockScores) {
          var parts = key.split("_");
          if (parts.length >= 3) {
            var block = parts[0];
            var round = parts[1];
            var gameName = parts.slice(2).join("_");
            var winner = postData.blockScores[key];
            if (winner) {
              var wLower = winner.toLowerCase();
              if (wLower === "shakes") winner = "Shakes";
              else if (wLower === "fries") winner = "Fries";
              else if (wLower === "tie") winner = "Tie";
              else winner = "NA";
            }
            
            var cell = getScoreCell(block, round, gameName);
            if (cell) {
              calcSheet.getRange(cell.row, cell.col).setValue(winner);
            }
          }
        }
      }
      
      // Update Tokens
      if (postData.tokens) {
        calcSheet.getRange(48, 8).setValue(postData.tokens.shakes || 0);
        calcSheet.getRange(48, 9).setValue(postData.tokens.fries || 0);
      }
      
      // Update Point Deductions
      if (postData.teamDeductions) {
        var clearCells = ["F4", "F5", "F6", "F7", "F8", "F12", "F13", "F14", "F15", "F16", "F20", "F21", "F25", "F26", "F27", "F28"];
        for (var team in postData.teamDeductions) {
          var tSheet = ss.getSheetByName(team);
          if (tSheet) {
            for (var i = 0; i < clearCells.length; i++) {
              tSheet.getRange(clearCells[i]).setValue(0);
            }
            tSheet.getRange("F4").setValue(postData.teamDeductions[team] || 0);
          }
        }
      }
      
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getScoreCell(block, round, gameName) {
  var b = parseInt(block);
  var r = parseInt(round);
  
  if (b === 1) {
    var row = 4 + r;
    var colMap = { "Big Mac": 3, "Cone Memory": 4, "Scale": 5, "Chubby Bunny": 6 };
    return { row: row, col: colMap[gameName] };
  } else if (b === 2) {
    var row = 15 + r;
    var colMap = { "Cheesy Strings": 3, "Lift": 4, "Bible Whispers": 5, "Puzzle": 6 };
    return { row: row, col: colMap[gameName] };
  } else if (b === 3) {
    var row = 26 + r;
    var colMap = { "Big Bucket 1": 4, "Big Bucket 2": 5 };
    return { row: row, col: colMap[gameName] };
  } else if (b === 4) {
    var row = 33 + r;
    var colMap = { 
      "Nadala+ 1": 2, "Balloon Darts 1": 3, "Golden Snitch 1": 4,
      "Nadala+ 2": 5, "Balloon Darts 2": 6, "Golden Snitch 2": 7 
    };
    return { row: row, col: colMap[gameName] };
  }
  return null;
}`}
                    </pre>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                    <label style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                      🔗 Apps Script Web App URL
                    </label>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                      Deploy the Apps Script project as a **Web App** (Execute as: "Me", Who has access: "Anyone"), then paste the generated URL here to enable app-to-sheets write-back:
                    </p>
                    <input 
                      type="text"
                      value={appsScriptWebappUrl}
                      onChange={(e) => setAppsScriptWebappUrl(e.target.value)}
                      onBlur={(e) => handleUpdateCampState({ appsScriptWebappUrl: e.target.value })}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '6px' }}>Database Synchronization</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Firebase sync updates scores instantly across all leaders' phones. Disabling it runs in Offline Mode (stored on this device only).
              </p>
              
              <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Real-time Firebase Sync</span>
                <button 
                  onClick={() => setIsOfflineMode(!isOfflineMode)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    background: isOfflineMode ? 'rgba(255,255,255,0.1)' : 'var(--gradient-vbt)',
                    color: '#ffffff'
                  }}
                >
                  {isOfflineMode ? 'OFFLINE' : 'ONLINE SYNC'}
                </button>
              </div>
            </div>

            {(currentUser.role === 'admin' || currentUser.role === 'leader' || currentUser.role === 'referee') && (
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '8px' }}>Camp Tokens (+2 pts each)</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--color-shakes)', fontWeight: '600', fontSize: '0.85rem' }}>Shakes Tokens</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => handleAdjustTokens('shakes', -1)} style={{ padding: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}><Minus size={12} /></button>
                      )}
                      <span style={{ fontSize: '1rem', fontWeight: '800', width: '20px', textAlign: 'center' }}>{campState.tokens?.shakes || 0}</span>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => handleAdjustTokens('shakes', 1)} style={{ padding: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}><Plus size={12} /></button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ color: 'var(--color-fries)', fontWeight: '600', fontSize: '0.85rem' }}>Fries Tokens</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => handleAdjustTokens('fries', -1)} style={{ padding: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}><Minus size={12} /></button>
                      )}
                      <span style={{ fontSize: '1rem', fontWeight: '800', width: '20px', textAlign: 'center' }}>{campState.tokens?.fries || 0}</span>
                      {currentUser.role === 'admin' && (
                        <button onClick={() => handleAdjustTokens('fries', 1)} style={{ padding: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}><Plus size={12} /></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentUser.role === 'admin' && (
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#ef4444', marginBottom: '6px' }}>Reset Scoreboard</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  WARNING: This will clear all entered wins, point deductions, and tokens. This cannot be undone.
                </p>
                <button 
                  onClick={async () => {
                    if (currentUser.role !== 'admin') {
                      alert("Permission denied. Only Coordinators can reset the database.");
                      return;
                    }
                    if (window.confirm("Are you sure you want to reset ALL scoreboard entries?")) {
                      await handleUpdateCampState(defaultCampState);
                      if (!isOfflineMode) {
                        await addAnnouncement(currentEventCode, "reset the scoreboard to default", currentUser.name, 'system');
                      }
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#ef4444',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontFamily: 'var(--font-title)',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Reset Database
                </button>
              </div>
            )}

            {/* ── LEADER ROSTER CARD ──────────────────────────────────────────── */}
            {currentUser.role === 'admin' && (
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: '#a78bfa', marginBottom: '2px' }}>👥 Leader Roster</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Names that appear in the login dropdown — update before each service.</p>
                  </div>
                  {!rosterEditMode && (
                    <button
                      onClick={handleOpenRosterEdit}
                      style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: 'rgba(167,139,250,0.2)', color: '#a78bfa', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>

                {/* VIEW MODE — compact list */}
                {!rosterEditMode && (
                  (eventConfig?.leaderRoster || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(eventConfig.leaderRoster).map((entry, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `hsl(${(idx * 53) % 360}, 55%, 40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800', color: '#fff', flexShrink: 0 }}>{idx + 1}</div>
                          <span style={{ fontSize: '0.85rem', color: '#ffffff', flex: 1 }}>{entry.name}</span>
                          {entry.groupLabel && <span style={{ fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(167,139,250,0.15)', padding: '2px 8px', borderRadius: '10px' }}>{entry.groupLabel}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No leaders added yet. Tap Edit to add names for this service.</p>
                  )
                )}

                {/* EDIT MODE */}
                {rosterEditMode && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {editRoster.map((entry, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `hsl(${(idx * 53) % 360}, 55%, 40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '800', color: '#fff', flexShrink: 0 }}>{idx + 1}</div>
                        <input
                          type="text"
                          value={entry.name}
                          onChange={e => handleRosterEntryChange(idx, 'name', e.target.value)}
                          placeholder="Full name (e.g. Shady Shahir / Mary F.)"
                          style={{ flex: 2, padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.82rem', outline: 'none' }}
                        />
                        <input
                          type="text"
                          value={entry.groupLabel}
                          onChange={e => handleRosterEntryChange(idx, 'groupLabel', e.target.value)}
                          placeholder="Group (e.g. F5.2)"
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#a78bfa', fontSize: '0.82rem', outline: 'none', textAlign: 'center' }}
                        />
                        <button onClick={() => handleRemoveRosterEntry(idx)} style={{ padding: '7px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
                          <Minus size={11} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                      <button onClick={handleAddRosterEntry} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px dashed rgba(167,139,250,0.4)', background: 'transparent', color: '#a78bfa', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                        <Plus size={12} /> Add Leader
                      </button>
                      <button onClick={handleSaveRoster} disabled={savingRoster} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(34,197,94,0.2)', color: '#4ade80', fontSize: '0.8rem', fontWeight: '700', cursor: savingRoster ? 'not-allowed' : 'pointer', opacity: savingRoster ? 0.7 : 1 }}>
                        {savingRoster ? 'Saving...' : '💾 Save Roster'}
                      </button>
                      <button onClick={() => setRosterEditMode(false)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── EVENT SETUP CARD ────────────────────────────────────────── */}

            {currentUser.role === 'admin' && editEventConfig && (
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(41,182,246,0.2)', background: 'rgba(41,182,246,0.03)' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#29b6f6', marginBottom: '4px' }}>⚙️ Event Setup</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>Customize this event's branding, team names, and access passcodes.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[['Event Name', 'eventName', 'e.g. VBT Summer Camp 2027'],
                    ['Description', 'description', 'e.g. Live scoring & team management'],
                    ['Event Date', 'eventDate', 'e.g. June 20, 2027'],
                    ['Side 1 Name (left team)', 'side1Name', 'e.g. Shakes, Red, Lions'],
                    ['Side 2 Name (right team)', 'side2Name', 'e.g. Fries, Blue, Tigers'],
                    ['Coordinator Passcode', 'passcodeCoordinator', 'Admin passcode'],
                    ['Game Leader Passcode', 'passcodeGameLeader', 'Referee passcode'],
                    ['Team Leader Passcode', 'passcodeTeamLeader', 'Leader passcode']
                  ].map(([label, field, ph]) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</label>
                      <input
                        type="text"
                        value={editEventConfig[field] || ''}
                        onChange={(e) => setEditEventConfig(prev => ({ ...prev, [field]: e.target.value }))}
                        placeholder={ph}
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                          color: '#ffffff', fontSize: '0.85rem', outline: 'none'
                        }}
                      />
                    </div>
                  ))}

                  <button
                    onClick={handleSaveEventConfig}
                    disabled={savingEventConfig}
                    style={{
                      padding: '11px', background: 'var(--gradient-vbt)', border: 'none',
                      borderRadius: '8px', color: '#ffffff', fontFamily: 'var(--font-title)',
                      fontWeight: '700', fontSize: '0.85rem', cursor: savingEventConfig ? 'not-allowed' : 'pointer',
                      opacity: savingEventConfig ? 0.7 : 1, width: '100%'
                    }}
                  >
                    {savingEventConfig ? 'Saving...' : '💾 Save Event Config'}
                  </button>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Current Event Code (share this with your staff):</p>
                    <code style={{ display: 'block', background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', color: '#29b6f6', fontSize: '0.85rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {currentEventCode}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={handleLeaveEvent}
                    style={{
                      padding: '10px', background: 'transparent', border: '1px solid var(--border-light)',
                      borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', width: '100%'
                    }}
                  >
                    🔀 Switch to a Different Event
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Service */}
        {currentTab === 'service' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── COORDINATOR EDIT BAR ─────────────────────────────── */}
            {currentUser && currentUser.role === 'admin' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    setEditServiceBrief(serviceData.serviceBrief);
                    setEditGroups([...serviceData.groups]);
                    setEditGames(serviceData.games.map(g => ({ ...g })));
                    setServiceEditMode(true);
                  }}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                    background: serviceEditMode ? 'rgba(255,255,255,0.08)' : 'var(--gradient-vbt)',
                    color: '#ffffff', fontFamily: 'var(--font-title)', fontWeight: '700',
                    fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Settings size={14} /> {serviceEditMode ? 'Editing...' : 'Edit Service Info'}
                </button>
                {serviceEditMode && (
                  <>
                    <button
                      onClick={handleSaveServiceData}
                      disabled={savingService}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                        background: 'rgba(34,197,94,0.25)', color: '#4ade80',
                        fontFamily: 'var(--font-title)', fontWeight: '700', fontSize: '0.8rem',
                        cursor: savingService ? 'not-allowed' : 'pointer', opacity: savingService ? 0.7 : 1
                      }}
                    >
                      {savingService ? 'Saving...' : '💾 Save'}
                    </button>
                    <button
                      onClick={() => setServiceEditMode(false)}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-light)',
                        background: 'transparent', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── SECTION 1: SERVICE BRIEF ─────────────────────────── */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '4px', height: '20px', background: 'var(--gradient-vbt)', borderRadius: '2px' }} />
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0 }}>📋 Service Brief</h3>
              </div>

              {serviceEditMode ? (
                <textarea
                  value={editServiceBrief}
                  onChange={(e) => setEditServiceBrief(e.target.value)}
                  placeholder="Describe the service: what it's about, the theme, what to expect..."
                  rows={5}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                    color: '#ffffff', fontSize: '0.875rem', outline: 'none',
                    fontFamily: 'inherit', lineHeight: '1.6', resize: 'vertical'
                  }}
                />
              ) : serviceData.serviceBrief ? (
                <p style={{
                  fontSize: '0.875rem', color: 'var(--text-secondary)',
                  lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0
                }}>
                  {serviceData.serviceBrief}
                </p>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {currentUser?.role === 'admin' ? 'Tap "Edit Service Info" above to add a service brief.' : 'No service brief posted yet.'}
                </p>
              )}
            </div>

            {/* ── SECTION 2: GROUPS / KIDS SPLIT ───────────────────── */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '20px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: '2px' }} />
                  <h3 style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0 }}>👥 Groups</h3>
                </div>
                {/* Total kids badge */}
                {(serviceEditMode ? totalKids : serviceData.groups.reduce((s, g) => s + (parseInt(g.kidCount) || 0), 0)) > 0 && (
                  <span style={{
                    background: 'rgba(41,182,246,0.15)', border: '1px solid rgba(41,182,246,0.3)',
                    color: '#29b6f6', fontSize: '0.75rem', fontWeight: '700',
                    padding: '3px 10px', borderRadius: '20px'
                  }}>
                    {serviceEditMode ? totalKids : serviceData.groups.reduce((s, g) => s + (parseInt(g.kidCount) || 0), 0)} kids total
                  </span>
                )}
              </div>

              {/* VIEW MODE */}
              {!serviceEditMode && (
                serviceData.groups.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {serviceData.groups.map((group, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                        padding: '12px 14px', border: '1px solid var(--border-light)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            background: `hsl(${(idx * 47) % 360}, 60%, 40%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: '800', color: '#fff', flexShrink: 0
                          }}>
                            {idx + 1}
                          </div>
                          <div>
                            <p style={{ fontSize: '0.875rem', color: '#ffffff', fontWeight: '600', margin: 0 }}>
                              {group.leaderName || `Group ${idx + 1}`}
                            </p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '1px 0 0' }}>Leader</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-title)', margin: 0, lineHeight: 1 }}>
                            {group.kidCount || '—'}
                          </p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: '1px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>kids</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {currentUser?.role === 'admin' ? 'Tap "Edit Service Info" to assign groups.' : 'No groups assigned yet.'}
                  </p>
                )
              )}

              {/* EDIT MODE */}
              {serviceEditMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {editGroups.map((group, idx) => (
                    <div key={idx} style={{
                      display: 'flex', gap: '8px', alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px'
                    }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: `hsl(${(idx * 47) % 360}, 60%, 40%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: '800', color: '#fff', flexShrink: 0
                      }}>{idx + 1}</div>
                      <input
                        type="text"
                        value={group.leaderName}
                        onChange={(e) => handleGroupChange(idx, 'leaderName', e.target.value)}
                        placeholder="Leader name"
                        style={{
                          flex: 1, padding: '8px 10px', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                          color: '#ffffff', fontSize: '0.85rem', outline: 'none'
                        }}
                      />
                      <input
                        type="number"
                        value={group.kidCount}
                        onChange={(e) => handleGroupChange(idx, 'kidCount', e.target.value)}
                        placeholder="# kids"
                        min="0"
                        style={{
                          width: '70px', padding: '8px 10px', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                          color: '#ffffff', fontSize: '0.85rem', outline: 'none', textAlign: 'center'
                        }}
                      />
                      <button
                        onClick={() => handleRemoveGroup(idx)}
                        style={{
                          padding: '8px', borderRadius: '6px', border: 'none',
                          background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', flexShrink: 0
                        }}
                      >
                        <Minus size={12} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                    <button
                      onClick={handleAddGroup}
                      style={{
                        padding: '8px 14px', borderRadius: '8px', border: '1px dashed rgba(41,182,246,0.4)',
                        background: 'transparent', color: '#29b6f6', fontSize: '0.8rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Plus size={12} /> Add Group
                    </button>
                    {editGroups.length > 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                        {totalKids} kids total
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 3: GAMES + BIBLE STUDY ───────────────────── */}
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '20px', background: 'linear-gradient(135deg, #a78bfa, #ec4899)', borderRadius: '2px' }} />
                  <h3 style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0 }}>🎮 Games & Bible Study</h3>
                </div>
                {!serviceEditMode && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tap a game to expand</span>
                )}
              </div>

              {/* VIEW MODE — accordion */}
              {!serviceEditMode && (
                serviceData.games.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {serviceData.games.map((game, idx) => {
                      const isOpen = !!expandedServiceGame[idx];
                      return (
                        <div key={idx} style={{
                          borderRadius: '12px', border: '1px solid var(--border-light)',
                          overflow: 'hidden', background: isOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
                        }}>
                          {/* Accordion header */}
                          <button
                            onClick={() => setExpandedServiceGame(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            style={{
                              width: '100%', padding: '13px 14px', background: 'none', border: 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              cursor: 'pointer', color: '#ffffff'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                width: '26px', height: '26px', borderRadius: '8px',
                                background: `linear-gradient(135deg, hsl(${(idx * 60 + 200) % 360}, 70%, 50%), hsl(${(idx * 60 + 240) % 360}, 60%, 40%))`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.7rem', fontWeight: '800', flexShrink: 0
                              }}>{idx + 1}</span>
                              <span style={{ fontSize: '0.9rem', fontWeight: '700', textAlign: 'left' }}>
                                {game.name || `Game ${idx + 1}`}
                              </span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                          </button>

                          {/* Accordion body */}
                          {isOpen && (
                            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {game.howToPlay && (
                                <div>
                                  <p style={{
                                    fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em',
                                    color: '#29b6f6', fontWeight: '700', marginBottom: '6px'
                                  }}>🎯 How to Play</p>
                                  <p style={{
                                    fontSize: '0.85rem', color: 'var(--text-secondary)',
                                    lineHeight: '1.65', whiteSpace: 'pre-wrap', margin: 0
                                  }}>{game.howToPlay}</p>
                                </div>
                              )}
                              {game.lesson && (
                                <div style={{
                                  background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
                                  borderRadius: '10px', padding: '12px'
                                }}>
                                  <p style={{
                                    fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em',
                                    color: '#a78bfa', fontWeight: '700', marginBottom: '6px'
                                  }}>📖 Lesson Learned</p>
                                  <p style={{
                                    fontSize: '0.875rem', color: '#c4b5fd',
                                    lineHeight: '1.65', whiteSpace: 'pre-wrap', margin: 0
                                  }}>{game.lesson}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {currentUser?.role === 'admin' ? 'Tap "Edit Service Info" to add games and Bible lessons.' : 'No games posted yet.'}
                  </p>
                )
              )}

              {/* EDIT MODE */}
              {serviceEditMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {editGames.map((game, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                      border: '1px solid var(--border-light)', padding: '14px',
                      display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em',
                          color: '#a78bfa', fontWeight: '700'
                        }}>Game {idx + 1}</span>
                        <button
                          onClick={() => handleRemoveGame(idx)}
                          style={{
                            padding: '5px 8px', borderRadius: '6px', border: 'none',
                            background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem'
                          }}
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        value={game.name}
                        onChange={(e) => handleGameChange(idx, 'name', e.target.value)}
                        placeholder="Game name (e.g. Cone Memory)"
                        style={{
                          width: '100%', padding: '9px 12px', borderRadius: '8px',
                          background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                          color: '#ffffff', fontSize: '0.875rem', outline: 'none', fontWeight: '700'
                        }}
                      />

                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#29b6f6', fontWeight: '700', marginBottom: '5px' }}>🎯 How to Play</label>
                        <textarea
                          value={game.howToPlay}
                          onChange={(e) => handleGameChange(idx, 'howToPlay', e.target.value)}
                          placeholder="Explain how the game works..."
                          rows={3}
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                            color: '#ffffff', fontSize: '0.85rem', outline: 'none',
                            fontFamily: 'inherit', lineHeight: '1.5', resize: 'vertical'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#a78bfa', fontWeight: '700', marginBottom: '5px' }}>📖 Lesson Learned (Bible Study)</label>
                        <textarea
                          value={game.lesson}
                          onChange={(e) => handleGameChange(idx, 'lesson', e.target.value)}
                          placeholder="What spiritual/moral lesson does this game teach?"
                          rows={3}
                          style={{
                            width: '100%', padding: '9px 12px', borderRadius: '8px',
                            background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)',
                            color: '#ffffff', fontSize: '0.85rem', outline: 'none',
                            fontFamily: 'inherit', lineHeight: '1.5', resize: 'vertical'
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleAddGame}
                    style={{
                      padding: '10px', borderRadius: '10px',
                      border: '1px dashed rgba(167,139,250,0.4)',
                      background: 'transparent', color: '#a78bfa',
                      fontSize: '0.85rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <Plus size={13} /> Add a Game
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Navigation bar */}
      <nav className="mobile-nav-bar">
        <button 
          className={`mobile-nav-item ${currentTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setCurrentTab('schedule')}
        >
          <Calendar size={20} />
          <span>Schedule</span>
        </button>
        <button 
          className={`mobile-nav-item ${currentTab === 'myteam' ? 'active' : ''}`}
          onClick={() => setCurrentTab('myteam')}
        >
          <Users size={20} />
          <span>My Team</span>
        </button>
        <button 
          className={`mobile-nav-item ${currentTab === 'scoreboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('scoreboard')}
        >
          <Trophy size={20} />
          <span>Scores</span>
        </button>
        <button 
          className={`mobile-nav-item ${currentTab === 'info' ? 'active' : ''}`}
          onClick={() => setCurrentTab('info')}
        >
          <MapIcon size={20} />
          <span>Map</span>
        </button>
        <button 
          className={`mobile-nav-item ${currentTab === 'stats' ? 'active' : ''}`}
          onClick={() => setCurrentTab('stats')}
        >
          <BarChart3 size={20} />
          <span>Stats</span>
        </button>
        {currentUser && currentUser.role === 'admin' && (
          <button 
            className={`mobile-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
          >
            <Settings size={20} />
            <span>Controls</span>
          </button>
        )}
        <button 
          className={`mobile-nav-item ${currentTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setCurrentTab('timeline')}
        >
          <div style={{ position: 'relative' }}>
            <Bell size={20} />
            {announcements.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }} />
            )}
          </div>
          <span>Feed</span>
        </button>
        <button
          className={`mobile-nav-item ${currentTab === 'service' ? 'active' : ''}`}
          onClick={() => setCurrentTab('service')}
        >
          <BookOpen size={20} />
          <span>Service</span>
        </button>
      </nav>
    </div>
  );
}
