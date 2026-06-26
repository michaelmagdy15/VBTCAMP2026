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
  subscribeToEventRegistry,
  subscribeToServiceData,
  updateServiceData,
  registerDevicePushToken,
  subscribeToServants,
  updateServant,
  addServant,
  deleteServant,
  generateAndSaveServiceSchedule,
  subscribeToWebPush,
  NOTIFY_SERVICE_URL
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
import { canEditScore, canEditDeductions, canEditTokens, canPostAnnouncement, canEditConfig, canSendPing, canCreateAlert } from './permissions';
import RoleLogin from './components/RoleLogin';
import PhotoFeed from './components/PhotoFeed';
import DynamicConfigurator from './components/DynamicConfigurator';
import DumbDashboard from './components/DumbDashboard';
import { generateRoundRobin, calculateTimeSlots, validateSchedule } from './matchupEngine';
import { saveAsTemplate, loadTemplates, deleteTemplate, PRESET_TEMPLATES } from './templates';
import { offlineQueue, setupOnlineListener } from './offlineSync';

// VBT Phase 3 Operations & Logistics Components
import LogisticsPanel from './components/LogisticsPanel';
import FeedMessage from './components/FeedMessage';
import ScheduleExporter from './components/ScheduleExporter';
import WalkieTalkie from './components/WalkieTalkie';
import GPSMap from './components/GPSMap';
import ScheduleBuilder from './components/ScheduleBuilder';
import { playChime, unlockAudioContext, getSharedAudioContext } from './chimes';
import { subscribeToMapConfig, updateMapConfig } from './mapEngine';

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

// Bell chime functions — delegate to chimes.js (plays real WAV files with oscillator fallback)
function playBellChime() {
  playChime('announcement'); // → Chord2.wav from akx/Notifications (CC0)
}

function playLoudDoubleChime() {
  playChime('urgent'); // → Alarmed.wav from akx/Notifications (CC0)
}

// Vibration helper — works on Android Chrome; silently ignored on iOS
function vibrate(pattern) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch (_) {}
}

// Vibration patterns
const VIBRATE_URGENT       = [200, 80, 200, 80, 400]; // urgent / ping
const VIBRATE_ANNOUNCEMENT = [150, 60, 150];           // regular announcement
const VIBRATE_NOTIFICATION = [100];                    // subtle feed item

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
  const side1Name = eventConfig.side1Name || 'Shakes';
  const side2Name = eventConfig.side2Name || 'Fries';
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

  useEffect(() => {
    if (currentEventCode) {
      localStorage.setItem(`vbt_apps_url_${currentEventCode}`, appsScriptWebappUrl);
    }
  }, [appsScriptWebappUrl, currentEventCode]);

  // UI state
  const [currentTab, setCurrentTab] = useState('scoreboard');
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [infoSubTab, setInfoSubTab] = useState('map');
  const [settingsSubTab, setSettingsSubTab] = useState('config');

  // Refs for tracking state/data changes to trigger chimes
  const prevCampStateRef = useRef(null);
  const prevScheduleRef = useRef(null);
  const prevAnnouncementsRef = useRef(null);
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
  const [mapConfig, setMapConfig] = useState(null);

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
  const [urgentAlert, setUrgentAlert] = useState({ show: false, text: '', type: 'urgent', timestamp: '' });
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

  const getEventCurrentDay = () => {
    if (eventConfig && eventConfig.activeDayOverride) {
      return parseInt(eventConfig.activeDayOverride, 10) || 1;
    }
    if (!eventConfig || !eventConfig.eventDate) return 1;
    try {
      const start = new Date(eventConfig.eventDate);
      if (isNaN(start.getTime())) return 1;
      const today = new Date(currentTime);
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

  const isTimeSlotActive = (timeStr, blockName, matchupDay) => {
    try {
      let timePart = timeStr.trim();
      const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return false;
      
      if (matchupDay) {
        const currentDay = getEventCurrentDay();
        if (matchupDay !== currentDay) return false;
      }
      
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
  }, [campData, campState, currentTime, eventConfig]);

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

  // Time tracker for Live indicators
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

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

  // Set up offline sync queue flush on reconnect
  useEffect(() => {
    const cleanup = setupOnlineListener(async () => {
      console.log('[Offline Sync] Device back online, flushing queue...');
      await offlineQueue.flushQueue(async (collection, docPath, data) => {
        if (currentEventCode) {
          await updateCampState(currentEventCode, data);
        }
      });
    });
    return cleanup;
  }, [currentEventCode]);

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

  // Subscribe to global servants directory
  useEffect(() => {
    const unsub = subscribeToServants((list) => setGlobalServants(list));
    return () => unsub();
  }, []);

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
      }
    });
    return () => unsub();
  }, [currentEventCode]);

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
      if (eventConfig.eventType === 'service') {
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
  const handleLogin = (e) => {
    e.preventDefault();
    const normalizedPassword = loginPassword.trim().toUpperCase();
    
    // Service Mode Individual Login
    if (eventConfig.eventType === 'service') {
      if (!loginName) {
        setLoginError('Please select your name.');
        return;
      }
      
      const servant = globalServants.find(s => s.id === loginName);
      if (!servant) {
        setLoginError('Servant not found.');
        return;
      }
      
      if (normalizedPassword !== (servant.passcode || '').toUpperCase()) {
        setLoginError('Incorrect passcode.');
        return;
      }
      
      // Resolve role
      const roleCode = eventConfig.servantAssignments?.[servant.id] || 'none';
      let resolvedRole = 'viewer';
      let teamCode = '';
      let side = 'System';
      let grade = 'All';
      let name = servant.name;
      
      if (servant.defaultRole === 'admin') {
        resolvedRole = 'admin';
        teamCode = 'ADMIN';
        name = servant.name || 'Coordinator';
      } else if (servant.defaultRole === 'coordinator' || roleCode === 'coordinator') {
        resolvedRole = 'admin';
        teamCode = 'ADMIN';
        name = servant.name || 'Coordinator';
      } else if (roleCode.startsWith('team_')) {
        resolvedRole = 'leader';
        const parts = roleCode.split('_'); // ["team", "white", "1"]
        const color = parts[1].charAt(0).toUpperCase() + parts[1].slice(1); // "White"
        const idx = parts[2]; // "1"
        teamCode = `${color} ${idx}`; // "White 1"
        side = color;
        grade = '3/4';
      } else if (roleCode.startsWith('station_') || roleCode.startsWith('big_game_') || roleCode === 'reflection' || roleCode === 'volunteer') {
        resolvedRole = 'referee';
        teamCode = 'REF';
        side = 'System';
      } else if (roleCode === 'media') {
        resolvedRole = 'referee';
        teamCode = 'MEDIA';
        side = 'System';
      }
      
      const user = {
        id: servant.id,
        role: resolvedRole,
        name: name,
        teamCode: teamCode,
        side: side,
        grade: grade,
        roleCode: roleCode,
        uiMode: servant.uiMode || (loginUseSimpleLayout ? 'dumb' : 'detailed')
      };
      
      setCurrentUser(user);
      localStorage.setItem(`vbt_user_${currentEventCode}`, JSON.stringify(user));
      setLoginError('');
      setLoginPassword('');
      
      if (resolvedRole === 'admin' || resolvedRole === 'service_leader' || resolvedRole === 'referee') {
        setCurrentTab('scoreboard');
      } else if (resolvedRole === 'leader') {
        setCurrentTab('myteam');
      } else {
        setCurrentTab('scoreboard');
      }
      
      if (!isOfflineMode) {
        addAnnouncement(currentEventCode, `${servant.name} signed in as ${roleCode.toUpperCase().replace('_', ' ')}`, 'System', 'system');
      }
      return;
    }

    // Original Camp Mode Login
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
        grade: leaderObj.grade,
        uiMode: loginUseSimpleLayout ? 'dumb' : 'detailed'
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
        grade: 'All',
        uiMode: loginUseSimpleLayout ? 'dumb' : 'detailed'
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
        grade: 'All',
        uiMode: loginUseSimpleLayout ? 'dumb' : 'detailed'
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
    // Set all to volunteer first except coordinator
    attendingList.forEach(sId => {
      if (updatedRoles[sId] !== 'coordinator') {
        updatedRoles[sId] = 'volunteer';
      }
    });

    const stationRoles = ['station_1', 'station_2', 'station_3', 'station_4'];
    let stationIdx = 0;

    const teamRoles = [
      'team_red_1', 'team_red_2',
      'team_white_1', 'team_white_2',
      'team_black_1', 'team_black_2',
      'team_blue_1', 'team_blue_2'
    ];
    let teamIdx = 0;

    let bigGame1Assigned = false;
    let bigGame2Assigned = false;
    let reflectionAssigned = false;

    attendingList.forEach(sId => {
      if (updatedRoles[sId] === 'coordinator') return;

      if (stationIdx < stationRoles.length) {
        updatedRoles[sId] = stationRoles[stationIdx];
        stationIdx++;
      } else if (teamIdx < teamRoles.length) {
        updatedRoles[sId] = teamRoles[teamIdx];
        teamIdx++;
      } else if (!bigGame1Assigned) {
        updatedRoles[sId] = 'big_game_1';
        bigGame1Assigned = true;
      } else if (!bigGame2Assigned) {
        updatedRoles[sId] = 'big_game_2';
        bigGame2Assigned = true;
      } else if (!reflectionAssigned) {
        updatedRoles[sId] = 'reflection';
        reflectionAssigned = true;
      }
    });

    return updatedRoles;
  };

  const handleWizardAutoAssign = () => {
    const teamNamesObj = { red: newTeamRed, white: newTeamWhite, black: newTeamBlack, blue: newTeamBlue };
    const updated = performMagicAutoAssign(wizardAttending, wizardRoles, teamNamesObj);
    setWizardRoles(updated);
  };

  const handleLiveAutoAssign = () => {
    const teamNamesObj = { red: editTeamRed, white: editTeamWhite, black: editTeamBlack, blue: editTeamBlue };
    const updated = performMagicAutoAssign(editAttending, editRoles, teamNamesObj);
    setEditRoles(updated);
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
        setEditAttending(prev => [...prev, id]);
        setEditRoles(prev => ({ ...prev, [id]: 'volunteer' }));
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
      if (newEventType === 'service') {
        const configData = {
          eventName: newEventName.trim(),
          description: newServiceBrief,
          eventDate: newEventDate || new Date().toISOString().split('T')[0],
          eventType: 'service',
          daysCount: parseInt(newDaysCount, 10) || 1,
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
      } else {
        // Camp Mode (Legacy)
        await createEvent(code, {
          eventName: newEventName.trim(),
          description: 'Camp Outreach',
          eventDate: newEventDate || new Date().toISOString().split('T')[0],
          eventType: 'camp',
          daysCount: parseInt(newDaysCount, 10) || 2,
          side1Name: newEventSide1 || 'Shakes',
          side2Name: newEventSide2 || 'Fries',
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

  const handleSaveAndRegenerateSchedule = async () => {
    if (!currentEventCode || !editEventConfig) return;
    setSavingEventConfig(true);
    try {
      const updatedConfig = {
        ...editEventConfig,
        kidCount: parseInt(editKidCount, 10) || 100,
        daysCount: parseInt(editDaysCount, 10) || 1,
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
        bigGameLesson: editBigGameLesson
      };
      
      await generateAndSaveServiceSchedule(currentEventCode, updatedConfig, editAttending, globalServants);
      
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
          
          if (m.shakes === "All Teams") {
            if (winner === 'Shakes') {
              colors.forEach(c => { wins[c] += points; });
            }
          } else {
            if (winner === 'Shakes') {
              const team = campData.teams?.[m.shakes];
              if (team && colors.includes(team.side)) {
                wins[team.side] += points;
              }
            } else if (winner === 'Fries') {
              const team = campData.teams?.[m.fries];
              if (team && colors.includes(team.side)) {
                wins[team.side] += points;
              }
            }
          }
        });
      }

      Object.entries(teamDeductions).forEach(([teamCode, val]) => {
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
            
            if (m.shakes === "All Teams") {
              if (winner === 'Shakes') {
                colors.forEach(c => { blockWins[c] += points; });
              }
            } else {
              if (winner === 'Shakes') {
                const team = campData.teams?.[m.shakes];
                if (team && colors.includes(team.side)) {
                  blockWins[team.side] += points;
                }
              } else if (winner === 'Fries') {
                const team = campData.teams?.[m.fries];
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

      return {
        isService: true,
        colors,
        wins,
        deductions,
        tokensCount,
        finalScores,
        leadColor,
        b1, b2, b3, b4,
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
    Object.entries(teamDeductions).forEach(([teamCode, val]) => {
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
    if (shakesFinal > friesFinal) winner = 'SHAKES';
    else if (friesFinal > shakesFinal) winner = 'FRIES';

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
    return campData.matchups.filter(m => {
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
        if (m.shakes !== scheduleTeamFilter && m.fries !== scheduleTeamFilter) {
          return false;
        }
      }
      return true;
    });
  }, [scheduleTeamFilter, scheduleBlockFilter, scheduleDayFilter, campData.matchups, eventConfig.eventType, daysCount]);

  const myTeamInfo = useMemo(() => {
    if (!currentUser) return null;
    const isService = eventConfig.eventType === 'service';
    let rawSchedule = [];
    if (isService) {
      rawSchedule = (campData.matchups || [])
        .filter(m => m.shakes === currentUser.teamCode || m.fries === currentUser.teamCode)
        .map(m => ({
          day: m.day || 1,
          block: `Block ${m.block}`,
          round: m.round,
          game: m.game,
          time: m.time,
          location: m.location,
          opponent: m.shakes === currentUser.teamCode ? m.fries : m.shakes,
          shakes: m.shakes,
          fries: m.fries
        }));
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
  }, [myTeamInfo, campState, currentTime, eventConfig.eventType]);

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
    if (progress < 25) return "Connecting to db-vbt...";
    if (progress < 50) return "Fetching active sports events...";
    if (progress < 75) return "Synchronizing servant credentials...";
    if (progress < 90) return "Caching dynamic schedules & matches...";
    return "VBT Service day loaded. Launching...";
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
            <div className="spinner-outer" />
            <div className="spinner-inner" />
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
            
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '240px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
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

  // ─── EVENT SELECTION / HOMEPAGE SCREEN ───────────────────────────────────
  if (!currentEventCode) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at center, #0c1530 0%, #05070f 100%)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Orbs */}
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />

        {/* Top Header */}
        <header style={{
          position: 'sticky',
          top: 'calc(12px + env(safe-area-inset-top, 0px))',
          width: '100%',
          maxWidth: '850px',
          background: 'rgba(13, 20, 38, 0.45)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          zIndex: 50,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/Final VBT Re-Branding 2026-02 (3).png"
              alt="VBT Logo"
              style={{ width: '40px', height: 'auto', filter: 'drop-shadow(0 0 8px rgba(41,182,246,0.3))' }}
            />
            <span style={{ fontSize: '1.2rem', fontWeight: '800', fontFamily: 'var(--font-title)', color: '#ffffff', letterSpacing: '0.05em' }}>
              VBT SERVICE
            </span>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('events-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="btn-glow"
            style={{
              padding: '8px 18px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Launch Portal
          </button>
        </header>

        {/* Hero Section */}
        <section style={{ width: '100%', maxWidth: '850px', textAlign: 'center', marginBottom: '48px', marginTop: '20px', zIndex: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(41,182,246,0.1)', border: '1px solid rgba(41,182,246,0.2)', padding: '5px 12px', borderRadius: '20px', marginBottom: '16px' }}>
            <span className="live-dot" style={{ width: '6px', height: '6px' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--vbt-sky)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Service Platform Active</span>
          </div>
          
          <h1 style={{ fontSize: '2.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-title)', lineHeight: '1.15', marginBottom: '16px', letterSpacing: '-0.03em' }}>
            Church Sports Outreach <br />
            <span style={{ background: 'linear-gradient(135deg, var(--vbt-sky) 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 10px rgba(41,182,246,0.15))' }}>
              Reimagined for Kids
            </span>
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: '1.6', maxWidth: '620px', margin: '0 auto 28px auto', fontFamily: 'var(--font-body)' }}>
            VBT Service provides dynamic sports games and Bible reflections for children of all ages. 
            Coordinate match schedules, manage sub-teams, and submit real-time scores effortlessly.
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                const el = document.getElementById('events-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-glow"
              style={{
                padding: '12px 24px', borderRadius: '12px', border: 'none',
                background: 'var(--gradient-vbt)', color: '#ffffff', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(20,65,161,0.4)'
              }}
            >
              🎯 Explore Services
            </button>
            <button
              onClick={() => setShowCreateEvent(true)}
              className="btn-glow"
              style={{
                padding: '12px 24px', borderRadius: '12px', border: '1px solid var(--border-light)',
                background: 'rgba(255,255,255,0.04)', color: '#ffffff', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer'
              }}
            >
              + Create Service Day
            </button>
          </div>
        </section>

        {/* Stats Bento Grid */}
        <section style={{ width: '100%', maxWidth: '850px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '56px', zIndex: 10 }}>
          <div className="glass-panel hover-lift" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'radial-gradient(circle, rgba(0, 176, 255, 0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
            <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '10px' }}>👥</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--vbt-sky)', margin: 0 }}>100+ Kids</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Grade 3/4 Players</p>
          </div>
          <div className="glass-panel hover-lift" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
            <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '10px' }}>🏆</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c4b5fd', margin: 0 }}>16 Servants</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Assigned Roles & Leaders</p>
          </div>
          <div className="glass-panel hover-lift" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'radial-gradient(circle, rgba(0, 176, 255, 0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
            <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '10px' }}>🎮</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--vbt-sky)', margin: 0 }}>5 Stations</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Water & Rotational Games</p>
          </div>
          <div className="glass-panel hover-lift" style={{ padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'radial-gradient(circle, rgba(167, 139, 250, 0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
            <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '10px' }}>📖</span>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c4b5fd', margin: 0 }}>1 Target</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Bible Insight Reflection</p>
          </div>
        </section>

        {/* Portal Section */}
        <section id="events-section" style={{ width: '100%', maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: '24px', scrollMarginTop: '40px', zIndex: 10 }}>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '1.4rem', color: '#ffffff', margin: 0, fontWeight: '800' }}>Active Services & Camps</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Launch an event below to manage scheduling, rosters, and scoring.</p>
          </div>

          {!showCreateEvent ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {/* Seeded Events cards list */}
              {eventRegistry.map(ev => {
                const isCamp = ev.eventType === 'camp';
                return (
                  <div 
                    key={ev.code} 
                    className="glass-ticket hover-lift" 
                    style={{ 
                      padding: '28px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      minHeight: '210px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Accent glow behind active ticket */}
                    <div style={{ 
                      position: 'absolute', 
                      top: '-20px', 
                      left: '-20px', 
                      width: '120px', 
                      height: '120px', 
                      background: isCamp 
                        ? 'radial-gradient(circle, rgba(0, 176, 255, 0.12) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(167, 139, 250, 0.12) 0%, transparent 70%)',
                      borderRadius: '50%',
                      pointerEvents: 'none'
                    }} />
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: '800', 
                          textTransform: 'uppercase', 
                          padding: '4px 10px', 
                          borderRadius: '20px',
                          background: isCamp ? 'rgba(0,176,255,0.12)' : 'rgba(167,139,250,0.12)',
                          color: isCamp ? 'var(--vbt-sky)' : '#c4b5fd',
                          border: isCamp ? '1px solid rgba(0,176,255,0.2)' : '1px solid rgba(167,139,250,0.2)',
                          display: 'inline-block',
                          letterSpacing: '0.05em'
                        }}>
                          {isCamp ? 'Camp Mode (Legacy)' : 'Service Mode (Dynamic)'}
                        </span>
                        
                        {!isCamp && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                            <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LIVE</span>
                          </div>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.3rem', color: '#ffffff', margin: 0, fontWeight: '800', letterSpacing: '-0.01em' }}>{ev.name}</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📅 {ev.date || 'Pending'}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {isCamp 
                          ? 'Traditional two-team scoring and stationary camp scheduling.'
                          : 'Real-time multi-color scoreboard, automated servant grouping & rotations.'
                        }
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentEventCode(ev.code);
                        localStorage.setItem('vbt_current_event', ev.code);
                      }}
                      className="btn-glow"
                      style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: 'none',
                        background: isCamp ? 'var(--gradient-vbt)' : 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'transform 0.2s ease',
                        boxShadow: isCamp 
                          ? '0 4px 15px rgba(20,65,161,0.3)' 
                          : '0 4px 15px rgba(124,58,237,0.3)'
                      }}
                    >
                      Launch Event ➔
                    </button>
                  </div>
                );
              })}

              {/* Join Code Panel */}
              <div className="glass-ticket hover-lift" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justify: 'space-between', minHeight: '210px' }}>
                <form onSubmit={handleJoinEvent} style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>🔑</span>
                      <h3 style={{ fontSize: '1.1rem', color: '#ffffff', margin: 0, fontWeight: '800' }}>Join Code Manually</h3>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>Access a custom service day code provided by coordinator.</p>
                    <input
                      type="text"
                      value={eventJoinInput}
                      onChange={(e) => setEventJoinInput(e.target.value)}
                      placeholder="e.g. june26"
                      autoCapitalize="none"
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                        color: '#ffffff', fontSize: '0.85rem', outline: 'none', fontFamily: 'monospace',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--vbt-sky)';
                        e.target.style.boxShadow = '0 0 10px rgba(41,182,246,0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--border-light)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {eventJoinError && (
                      <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⚠️ {eventJoinError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={eventJoinLoading}
                    className="btn-glow"
                    style={{
                      width: '100%',
                      padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.06)', color: '#ffffff', fontWeight: '800', fontSize: '0.85rem',
                      cursor: 'pointer', marginTop: '12px'
                    }}
                  >
                    {eventJoinLoading ? 'Joining...' : 'Submit Code'}
                  </button>
                </form>
              </div>
            </div>
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
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '6px' }}>
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
                        <h4 style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎨 Custom Team Labels</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#ef4444', marginBottom: '4px', fontWeight: '700' }}>Red Team Label</label>
                            <input
                              type="text"
                              value={newTeamRed}
                              onChange={(e) => setNewTeamRed(e.target.value)}
                              placeholder="Red"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#ffffff', marginBottom: '4px', fontWeight: '700' }}>White Team Label</label>
                            <input
                              type="text"
                              value={newTeamWhite}
                              onChange={(e) => setNewTeamWhite(e.target.value)}
                              placeholder="White"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', marginBottom: '4px', fontWeight: '700' }}>Black Team Label</label>
                            <input
                              type="text"
                              value={newTeamBlack}
                              onChange={(e) => setNewTeamBlack(e.target.value)}
                              placeholder="Black"
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.68rem', color: '#29b6f6', marginBottom: '4px', fontWeight: '700' }}>Blue Team Label</label>
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

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
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
                      <div style={{ display: 'flex', gap: '8px' }}>
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

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
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
        </section>
      </div>
    );
  }

  if (!currentUser) {
    const isService = eventConfig.eventType === 'service';
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
            <h1 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '4px', fontFamily: 'var(--font-title)' }}>
              {isService ? "VBT Service Portal" : (eventConfig.eventName || 'VBT SPORTS CAMP')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {isService ? (eventConfig.eventName || "Friend Request") : (eventConfig.description || 'Leader Portal & Live Scoring')}
            </p>
            <button
              type="button"
              onClick={handleLeaveEvent}
              style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Back to Homepage
            </button>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isService && (
              <div style={{
                background: 'rgba(41, 182, 246, 0.1)',
                border: '1px solid rgba(41, 182, 246, 0.3)',
                borderRadius: '12px',
                padding: '14px',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                lineHeight: '1.5'
              }}>
                <h3 style={{ color: '#29b6f6', fontWeight: '800', margin: '0 0 6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👴 Sign-In Helper Card
                </h3>
                <ol style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>Click <strong>Choose Name</strong> and choose your name.</li>
                  <li>Click <strong>Passcode</strong> and enter your password.</li>
                  <li>Click the big blue <strong>Sign In</strong> button below.</li>
                </ol>
              </div>
            )}
            
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

            {isService ? (
              // Service mode: Individual servant account login dropdown
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>Select Your Name</label>
                <select
                  value={loginName}
                  onChange={(e) => { setLoginName(e.target.value); setLoginError(''); }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                    color: '#ffffff', fontSize: '0.95rem', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="">-- Choose Name --</option>
                  {globalServants.sort((a,b) => a.name.localeCompare(b.name)).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              // Original Camp mode: Role selector toggle
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
            )}

            {!isService && loginRole === 'leader' && (
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
              <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                {isService ? "Private Passcode" : "Camp Passcode"}
              </label>
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

            {/* Simple Layout Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', marginBottom: '4px' }}>
              <input 
                type="checkbox"
                id="loginUseSimpleLayout"
                checked={loginUseSimpleLayout}
                onChange={(e) => setLoginUseSimpleLayout(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="loginUseSimpleLayout" style={{ fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer', userSelect: 'none' }}>
                Use Simple Layout (Dumb Phone Version)
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
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
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(20, 65, 161, 0.4)'
                }}
              >
                Sign In
              </button>

              <button 
                type="button"
                onClick={() => {
                  const user = {
                    id: 'visitor',
                    role: 'viewer',
                    name: 'Visitor',
                    teamCode: 'VISITOR',
                    side: 'System',
                    grade: 'All',
                    roleCode: 'none'
                  };
                  setCurrentUser(user);
                  localStorage.setItem(`vbt_user_${currentEventCode}`, JSON.stringify(user));
                  setCurrentTab('scoreboard');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
              >
                👀 View as Visitor (No Passcode Needed)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
      />
    );
  }

  const getActiveTabs = () => {
    if (!currentUser) return [];
    
    // For both Service Mode and Camp Mode, we show exactly 5 bottom navigation tabs
    return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'info', label: 'Map', icon: MapIcon },
      { id: 'timeline', label: 'Feed', icon: Bell, badge: announcements.length > 0 },
      { id: 'more', label: 'More', icon: MoreHorizontal }
    ];
  };

  const totalBothSides = scoreCalculations.shakesFinal + scoreCalculations.friesFinal;
  const shakesPercentage = totalBothSides > 0 ? (scoreCalculations.shakesFinal / totalBothSides) * 100 : 50;
  const friesPercentage = totalBothSides > 0 ? (scoreCalculations.friesFinal / totalBothSides) * 100 : 50;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      <AlertBanner
        alert={urgentAlert}
        onDismiss={() => setUrgentAlert({ show: false, text: '', type: 'urgent', timestamp: '' })}
        isAdmin={currentUser?.role === 'admin'}
        onCreateAlert={async (text) => {
          setUrgentAlert({ show: true, text, type: 'urgent', timestamp: new Date().toISOString() });
          await addAnnouncement(currentEventCode, `🚨 URGENT: ${text}`, currentUser?.name || 'Admin', 'ping');
          await triggerRemotePushNotification("🚨 URGENT ALERT", text);
        }}
      />
      {/* Header */}
      <header className="glass-panel" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderRadius: '0 0 16px 16px',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        background: 'rgba(13, 20, 38, 0.8)',
        paddingTop: 'env(safe-area-inset-top, 0px)'
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
              <h2 style={{ fontSize: '0.95rem', color: '#ffffff', lineHeight: 1.1 }}>{eventConfig.eventName || 'VBT CAMP'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className={`live-dot`} />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Live Syncing</span>
              </div>
            </div>
          </div>
          
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              >
                <Bell size={16} style={Notification.permission === 'granted' ? {} : { animation: 'pulse-glow 1.5s infinite' }} />
              </button>
            )}
            <div className="header-user-info" style={{ textAlign: 'right' }}>
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



      {/* Content tabs */}
      <main className="content-area animate-fade">
        
        {/* Tab 1: Scoreboard Accordions */}
        {currentTab === 'scoreboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Standings section rendered inside Scores page only */}
            <div style={{ width: '100%', marginBottom: '8px' }}>
              {eventConfig.eventType === 'service' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trophy size={18} style={{ color: '#fbbf24' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current standings</span>
                  </div>
                  
                  <div className="standings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {scoreCalculations.colors.map(colorName => {
                      const colorHex = getTeamColorHex(colorName);
                      const score = scoreCalculations.finalScores[colorName] || 0;
                      const winsPts = scoreCalculations.wins[colorName] || 0;
                      const tokCount = scoreCalculations.tokensCount[colorName] || 0;
                      const ded = scoreCalculations.deductions[colorName] || 0;
                      const customName = eventConfig.teamNames?.[colorName.toLowerCase()] || colorName;
                      
                      return (
                        <div key={colorName} className="glass-panel hover-lift" style={{ 
                          padding: '14px', 
                          borderLeft: `4px solid ${colorHex}`,
                          background: 'rgba(13, 20, 38, 0.45)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '-15px',
                            right: '-15px',
                            width: '50px',
                            height: '50px',
                            background: `radial-gradient(circle, ${colorHex}15 0%, transparent 70%)`,
                            borderRadius: '50%',
                            pointerEvents: 'none'
                          }} />
                          
                          <h4 style={{ 
                            fontSize: '0.85rem', 
                            fontWeight: '800', 
                            color: '#ffffff', 
                            margin: '0 0 4px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>{customName}</span>
                            {scoreCalculations.leadColor === colorName && (
                              <span style={{ fontSize: '0.7rem', color: '#fbbf24', animation: 'pulse-glow 1.5s infinite' }}>👑 Lead</span>
                            )}
                          </h4>
                          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-title)', lineHeight: '1', marginBottom: '6px' }}>
                            {score}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            <div>🎮 Games: <strong style={{ color: '#ffffff' }}>{winsPts}</strong> pts</div>
                            <div>🪙 Tokens: <strong style={{ color: '#ffffff' }}>{tokCount}</strong> ({(tokCount * 2)} pts)</div>
                            {ded > 0 && <div style={{ color: '#ef4444' }}>⚠️ Deductions: <strong>-{ded}</strong> pts</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '4px' }}>Game Score Entry</h2>
            
            {eventConfig.eventType === 'service' ? (
              currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') ? (
                <div style={{
                  background: 'rgba(41, 182, 246, 0.1)',
                  border: '1px solid rgba(41, 182, 246, 0.3)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  lineHeight: '1.5'
                }}>
                  <h3 style={{ color: '#29b6f6', fontWeight: '800', margin: '0 0 6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👴 Scoring Helper Card
                  </h3>
                  <p style={{ margin: 0 }}>
                    Click <strong>By Block</strong> or <strong>By Game</strong> below. Find the matchup, and click the winning sub-team's button (e.g., <strong>Falcons 1</strong> or <strong>Eagles 1</strong>) to award points. Click <strong>Reset</strong> to undo.
                  </p>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  padding: '14px',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  lineHeight: '1.5'
                }}>
                  <h3 style={{ color: '#94a3b8', fontWeight: '800', margin: '0 0 6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    👴 View-Only Helper Card
                  </h3>
                  <p style={{ margin: 0 }}>
                    This scoreboard shows the points for all teams. Point values update automatically as game rounds finish and Station Leaders submit wins.
                  </p>
                </div>
              )
            ) : (
              currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') ? (
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
              )
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
                blockNum === 1 ? 'Block 1' :
                blockNum === 2 ? 'Block 2' :
                blockNum === 3 ? 'Block 3' :
                'Block 4';
                
              const bScores = scoreCalculations[`b${blockNum}`];
              
              return (
                <div key={blockNum} className="glass-panel" style={{ overflow: 'hidden' }}>
                  <div 
                    className="block-header block-header-responsive" 
                    onClick={() => setExpandedBlocks({ ...expandedBlocks, [blockNum]: !isOpen })}
                  >
                    <div>
                      <h3 style={{ fontSize: '0.95rem', color: '#ffffff' }}>{blockTitle}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {eventConfig.eventType === 'service' ? (
                          <span style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['Red', 'White', 'Black', 'Blue'].map((c, i) => {
                              const customColorName = eventConfig.teamNames?.[c.toLowerCase()] || c;
                              const colorHex = getTeamColorHex(c);
                              return (
                                <span key={c}>
                                  {i > 0 && ' | '}
                                  {customColorName}: <span style={{ color: colorHex, fontWeight: '700' }}>{bScores?.[c] || 0}</span>
                                </span>
                              );
                            })}
                          </span>
                        ) : (
                          <>
                            Score: {side1Name} <span style={{ color: 'var(--color-shakes)', fontWeight: '700' }}>{bScores?.shakes || 0}</span> - {side2Name} <span style={{ color: 'var(--color-fries)', fontWeight: '700' }}>{bScores?.fries || 0}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>▼</span>
                  </div>
                  
                  {isOpen && (
                    <div className="block-content block-content-responsive" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.1)' }}>
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
                                const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
                                const isActive = isTimeSlotActive(m.time, `Block ${m.block}`, mDay);
                                
                                return (
                                  <div key={idx} className="glass-panel matchup-card-wrapper" style={{ padding: '10px', background: 'rgba(255,255,255,0.02)' }}>
                                    <div className="matchup-header-responsive" style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
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
                                          <span style={{ color: eventConfig.eventType === 'service' ? getTeamColorHex(m.shakes) : 'var(--color-shakes)' }}>
                                            {eventConfig.eventType === 'service' ? `${m.shakes} Win` : 'Shakes Win'}
                                          </span>
                                        ) : winner === 'Fries' ? (
                                          <span style={{ color: eventConfig.eventType === 'service' ? getTeamColorHex(m.fries) : 'var(--color-fries)' }}>
                                            {eventConfig.eventType === 'service' ? `${m.fries} Win` : 'Fries Win'}
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--color-tie)' }}>Tie</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                                      {eventConfig.eventType === 'service' ? (
                                        <>
                                          <span style={{ color: getTeamColorHex(m.shakes), fontWeight: '600' }}>{m.shakes}</span>
                                          <span style={{ color: 'var(--text-muted)' }}>vs</span>
                                          <span style={{ color: getTeamColorHex(m.fries), fontWeight: '600' }}>{m.fries}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span style={{ color: 'var(--color-shakes)', fontWeight: '600' }}>{m.shakes} (Shakes)</span>
                                          <span style={{ color: 'var(--text-muted)' }}>vs</span>
                                          <span style={{ color: 'var(--color-fries)', fontWeight: '600' }}>{m.fries} (Fries)</span>
                                        </>
                                      )}
                                    </div>
                                    
                                    {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') && (
                                      <div className="winner-selector">
                                        <button 
                                          className={`winner-option ${winner === 'Shakes' ? 'active-shakes' : ''}`}
                                          onClick={() => handleToggleWinner(m.block, m.round, m.game, 'Shakes')}
                                        >
                                          {eventConfig.eventType === 'service' ? m.shakes : 'Shakes'}
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
                                          {eventConfig.eventType === 'service' ? m.fries : 'Fries'}
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
                    className="block-header block-header-responsive" 
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
                    <div className="block-content block-content-responsive" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.1)', padding: '12px' }}>
                      {gameMatches.map((m, idx) => {
                        const key = `${m.block}_${m.round}_${m.game}`;
                        const winner = (campState.blockScores || {})[key] || 'NA';
                        const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
                        const isActive = isTimeSlotActive(m.time, `Block ${m.block}`, mDay);
                        
                        return (
                          <div key={idx} className="glass-panel matchup-card-wrapper" style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="matchup-header-responsive" style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                                  <span style={{ color: eventConfig.eventType === 'service' ? getTeamColorHex(m.shakes) : 'var(--color-shakes)' }}>
                                    {eventConfig.eventType === 'service' ? `${m.shakes} Win` : 'Shakes Win'}
                                  </span>
                                ) : winner === 'Fries' ? (
                                  <span style={{ color: eventConfig.eventType === 'service' ? getTeamColorHex(m.fries) : 'var(--color-fries)' }}>
                                    {eventConfig.eventType === 'service' ? `${m.fries} Win` : 'Fries Win'}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--color-tie)' }}>Tie</span>
                                )}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                              {eventConfig.eventType === 'service' ? (
                                <>
                                  <span style={{ color: getTeamColorHex(m.shakes), fontWeight: '600' }}>{m.shakes}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>vs</span>
                                  <span style={{ color: getTeamColorHex(m.fries), fontWeight: '600' }}>{m.fries}</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ color: 'var(--color-shakes)', fontWeight: '600' }}>{m.shakes} (Shakes)</span>
                                  <span style={{ color: 'var(--text-muted)' }}>vs</span>
                                  <span style={{ color: 'var(--color-fries)', fontWeight: '600' }}>{m.fries} (Fries)</span>
                                </>
                              )}
                            </div>
                            
                            {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') && (
                              <div className="winner-selector">
                                <button 
                                  className={`winner-option ${winner === 'Shakes' ? 'active-shakes' : ''}`}
                                  onClick={() => handleToggleWinner(m.block, m.round, m.game, 'Shakes')}
                                >
                                  {eventConfig.eventType === 'service' ? m.shakes : 'Shakes'}
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
                                  {eventConfig.eventType === 'service' ? m.fries : 'Fries'}
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => {
                  const daySchedule = myTeamInfo.schedule.filter(s => {
                    const sBlockNum = parseInt(s.block?.replace('Block ', ''), 10) || 1;
                    const sDay = s.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(sBlockNum) ? 1 : 2) : 1);
                    return sDay === d;
                  });

                  const colors = ['var(--vbt-sky)', '#f43f5e', '#a855f7', '#eab308', '#10b981'];
                  const headerColor = colors[(d - 1) % colors.length];

                  return (
                    <div key={`myteam-day-${d}`}>
                      <h4 style={{ 
                        fontSize: '0.75rem', 
                        color: headerColor, 
                        fontWeight: '700', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                        borderBottom: `1px solid ${headerColor}33`,
                        paddingBottom: '4px'
                      }}>
                        Day {d} {eventConfig.eventType === 'camp' ? (d === 1 ? '(Blocks 1-3)' : '(Block 4)') : ''}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {daySchedule.length === 0 ? (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>
                            No Day {d} activities scheduled.
                          </p>
                        ) : (
                          daySchedule.map((slot, idx) => {
                            const sBlockNum = parseInt(slot.block?.replace('Block ', ''), 10) || 1;
                            const sDay = slot.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(sBlockNum) ? 1 : 2) : 1);
                            const isActive = isTimeSlotActive(slot.time, slot.block, sDay);
                            return (
                              <div 
                                key={`day-${d}-${idx}`} 
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
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{slot.block}</span>
                                </div>
                                
                                <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <p style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>{slot.game}</p>
                                    {slot.gameExtra && (
                                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Split: {slot.gameExtra}</p>
                                    )}
                                    {slot.opponent && (
                                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                        Opponent: <span style={{ color: '#ffffff', fontWeight: '600' }}>{slot.opponent}</span>
                                      </p>
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
                  );
                })}
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
            <ScheduleExporter
              scheduleData={campData}
              campData={campData}
              eventConfig={eventConfig}
              getTeamColorHex={getTeamColorHex}
            />
            {eventConfig.eventType === 'service' ? (
              <div style={{
                background: 'rgba(41, 182, 246, 0.1)',
                border: '1px solid rgba(41, 182, 246, 0.3)',
                borderRadius: '12px',
                padding: '14px',
                color: '#e2e8f0',
                fontSize: '0.85rem',
                lineHeight: '1.5'
              }}>
                <h3 style={{ color: '#29b6f6', fontWeight: '800', margin: '0 0 6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  👴 Schedule Helper Card
                </h3>
                <p style={{ margin: 0 }}>
                  Find your team name (e.g., <strong>Falcons 1</strong> or <strong>Eagles 2</strong>) in the matchups below. For each Round, it shows which station game you play, where it is located, and what time it starts.
                </p>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', borderRadius: '12px' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', lineHeight: '1.4' }}>
                  <span style={{ fontSize: '1rem' }}>📅</span>
                  <span><strong>Live Schedule:</strong> View today's blocks, locations, and matchups. Active matches are marked <strong>LIVE</strong>.</span>
                </p>
              </div>
            )}

            {/* Day Selector Segmented Control */}
            {daysCount > 1 && (
              <div className="toggle-group" style={{ 
                display: 'flex',
                width: '100%',
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '10px',
                padding: '2px',
                border: '1px solid var(--border-light)',
                overflowX: 'auto'
              }}>
                {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => (
                  <button 
                    key={d}
                    type="button"
                    className={`toggle-btn ${scheduleDayFilter === String(d) ? 'active' : ''}`}
                    onClick={() => setScheduleDayFilter(String(d))}
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      fontSize: '0.8rem', 
                      fontWeight: '700',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      background: scheduleDayFilter === String(d) ? 'var(--gradient-vbt)' : 'transparent',
                      color: '#ffffff',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Day {d} {eventConfig.eventType === 'camp' ? (d === 1 ? '(Blocks 1-3)' : '(Block 4)') : ''}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Matchups & Locations</h2>
              <div className="schedule-filter-dropdowns" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {eventConfig.eventType === 'service' ? (
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
                    <option value="1">Rotational Stations (Block 1)</option>
                    <option value="2">Big Game (Block 2)</option>
                    <option value="3">Reflection (Block 3)</option>
                  </select>
                ) : scheduleDayFilter === '1' ? (
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
                  
                  <div className="timer-controls-buttons-container" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                      onClick={handleToggleTimer}
                      className="timer-resume-pause-btn"
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

                    <div className="timer-adjust-row" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                </div>

                {/* Broadcast Sync Pings (Centralized Bell) */}
                <div className="broadcast-sync-container" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>🚨 Broadcast Round Sync:</span>
                  <button 
                    onClick={async () => {
                      if (window.confirm("Broadcast ROUND START ping to all devices?")) {
                        const msg = "🚨 ROUND STARTING NOW! Please move to your next location immediately.";
                        await addAnnouncement(currentEventCode, msg, currentUser.name, 'ping');
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
                        await addAnnouncement(currentEventCode, msg, currentUser.name, 'ping');
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
              
              <div className="live-location-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
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
                  const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
                  const isActive = isTimeSlotActive(m.time, `Block ${m.block}`, mDay);
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
                announcements.map((feed) => (
                  <FeedMessage
                    key={feed.id}
                    message={{
                      id: feed.id,
                      text: feed.text,
                      sender: feed.sender,
                      senderRole: feed.senderRole || 'viewer',
                      type: feed.type,
                      timestamp: feed.timestamp,
                      imageUrl: feed.image || feed.imageUrl,
                      reactions: {
                        '👍': feed.reactions?.thumbsup || [],
                        '🎉': feed.reactions?.congrats || [],
                        '🔥': feed.reactions?.fire || []
                      }
                    }}
                    currentUser={currentUser?.name}
                    onReact={(id, emoji) => {
                      const emojiToKey = {
                        '👍': 'thumbsup',
                        '🎉': 'congrats',
                        '🔥': 'fire'
                      };
                      handleToggleReaction(id, emojiToKey[emoji]);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Photo Feed Enhancement for Timeline */}
        {currentTab === 'timeline' && (
          <PhotoFeed
            announcements={announcements}
            currentUser={currentUser}
            eventCode={currentEventCode}
            onAddAnnouncement={(text, sender, type, imageUrl) => addAnnouncement(currentEventCode, text, sender, type, imageUrl, currentUser?.role)}
            onUpdateReactions={(announcementId, reactions) => updateAnnouncementReactions(currentEventCode, announcementId, reactions)}
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
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {eventConfig.eventType === 'service' ? (
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

                {eventConfig.eventType === 'service' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {['Red', 'White', 'Black', 'Blue'].map(colorName => {
                      const colorHex = getTeamColorHex(colorName);
                      const customColorName = eventConfig.teamNames?.[colorName.toLowerCase()] || colorName;
                      const colorDeductions = scoreCalculations.deductions[colorName] || 0;
                      const colorTeams = Object.keys(campData.teams || {}).filter(code => campData.teams[code].side === colorName);
                      
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
                                const team = campData.teams[code];
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
                        {side2Name} (-{scoreCalculations.friesDeductions})
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
                  currentTime={currentTime}
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

             {infoSubTab === 'gps' && (
               <GPSMap
                 eventCode={currentEventCode}
                 currentUser={currentUser}
                 campData={campData}
                 eventConfig={eventConfig}
                 getTeamColorHex={getTeamColorHex}
                 currentTime={currentTime}
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

        {/* Tab 7: Settings */}
        {currentTab === 'settings' && currentUser && currentUser.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Control Panel</h2>

            {/* Sub-tab selection for Settings */}
            <div className="toggle-group" style={{ 
              display: 'flex',
              background: 'rgba(0,0,0,0.2)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--border-light)'
            }}>
              <button 
                className={`toggle-btn ${settingsSubTab === 'config' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                onClick={() => setSettingsSubTab('config')}
              >
                ⚙️ Service Setup
              </button>
              <button 
                className={`toggle-btn ${settingsSubTab === 'builder' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                onClick={() => setSettingsSubTab('builder')}
              >
                📅 Schedule Builder
              </button>
            </div>

            {settingsSubTab === 'config' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Dynamic Configurator - Church Service Adaptability */}
                <DynamicConfigurator
              eventConfig={eventConfig}
              onSaveConfig={async (updates) => {
                await updateEventConfig(currentEventCode, updates);
              }}
              campData={campData}
            />

            {eventConfig.eventType === 'service' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.02)' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#a78bfa', marginBottom: '4px', fontWeight: '800' }}>⚙️ Live Service Configurator</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Recalculate expected kids, custom team labels, and servant attendance checklist in real-time.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="config-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Expected Kids Count</label>
                        <input
                          type="number"
                          value={editKidCount}
                          onChange={(e) => setEditKidCount(parseInt(e.target.value, 10) || '')}
                          placeholder="e.g. 100"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Days of Event</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editDaysCount}
                          onChange={(e) => setEditDaysCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
                      <h4 style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎨 Rename Teams</h4>
                      <div className="config-grid-teams" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#ef4444', marginBottom: '4px', fontWeight: '700' }}>Red Team</label>
                          <input type="text" value={editTeamRed} onChange={(e) => setEditTeamRed(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#ffffff', marginBottom: '4px', fontWeight: '700' }}>White Team</label>
                          <input type="text" value={editTeamWhite} onChange={(e) => setEditTeamWhite(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#94a3b8', marginBottom: '4px', fontWeight: '700' }}>Black Team</label>
                          <input type="text" value={editTeamBlack} onChange={(e) => setEditTeamBlack(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#29b6f6', marginBottom: '4px', fontWeight: '700' }}>Blue Team</label>
                          <input type="text" value={editTeamBlue} onChange={(e) => setEditTeamBlue(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: '700', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>👥 Leader Roster & Attendance</h4>
                        <button
                          type="button"
                          onClick={handleLiveAutoAssign}
                          className="btn-glow"
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.15)', color: '#c4b5fd', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          ✨ Live Auto-Assign
                        </button>
                      </div>
                      
                      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                        {globalServants.sort((a,b) => a.name.localeCompare(b.name)).map(s => {
                          const isAttending = editAttending.includes(s.id);
                          return (
                            <div key={s.id} style={{ 
                              display: 'flex', 
                              flexDirection: 'row', 
                              flexWrap: 'wrap', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              gap: '8px', 
                              padding: '6px', 
                              borderRadius: '6px', 
                              background: isAttending ? 'rgba(167,139,250,0.05)' : 'rgba(255,255,255,0.01)', 
                              border: '1px solid ' + (isAttending ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.02)') 
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '150px' }}>
                                <input
                                  type="checkbox"
                                  checked={isAttending}
                                  onChange={() => {
                                    const updated = editAttending.includes(s.id)
                                      ? editAttending.filter(id => id !== s.id)
                                      : [...editAttending, s.id];
                                    setEditAttending(updated);
                                  }}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: isAttending ? '700' : 'normal' }}>{s.name}</span>
                              </div>
                              
                              {isAttending && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <select
                                    value={editRoles[s.id] || 'volunteer'}
                                    onChange={(e) => setEditRoles(prev => ({ ...prev, [s.id]: e.target.value }))}
                                    style={{ padding: '6px 10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.75rem', cursor: 'pointer', outline: 'none', width: '100%', maxWidth: '160px', minHeight: '32px' }}
                                  >
                                    <option value="volunteer">Volunteer/Ref</option>
                                    <option value="coordinator">Coordinator</option>
                                    <option value="station_1">{(editStations.station_1?.name || 'Station 1') + ' Lead'}</option>
                                    <option value="station_2">{(editStations.station_2?.name || 'Station 2') + ' Lead'}</option>
                                    <option value="station_3">{(editStations.station_3?.name || 'Station 3') + ' Lead'}</option>
                                    <option value="station_4">{(editStations.station_4?.name || 'Station 4') + ' Lead'}</option>
                                    <option value="big_game_1">Big Game Lead 1</option>
                                    <option value="big_game_2">Big Game Lead 2</option>
                                    <option value="reflection">Reflection Lead</option>
                                    <option value="team_red_1">{(editTeamRed || 'Red') + ' 1 Leader'}</option>
                                    <option value="team_red_2">{(editTeamRed || 'Red') + ' 2 Leader'}</option>
                                    <option value="team_white_1">{(editTeamWhite || 'White') + ' 1 Leader'}</option>
                                    <option value="team_white_2">{(editTeamWhite || 'White') + ' 2 Leader'}</option>
                                    <option value="team_black_1">{(editTeamBlack || 'Black') + ' 1 Leader'}</option>
                                    <option value="team_black_2">{(editTeamBlack || 'Black') + ' 2 Leader'}</option>
                                    <option value="team_blue_1">{(editTeamBlue || 'Blue') + ' 1 Leader'}</option>
                                    <option value="team_blue_2">{(editTeamBlue || 'Blue') + ' 2 Leader'}</option>
                                    <option value="media">Media Coverage</option>
                                  </select>
                                  <select
                                    value={s.uiMode || 'detailed'}
                                    onChange={async (e) => {
                                      await updateServant(s.id, { uiMode: e.target.value });
                                    }}
                                    style={{ padding: '6px 10px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.75rem', cursor: 'pointer', outline: 'none', minHeight: '32px' }}
                                  >
                                    <option value="detailed">Detailed UI</option>
                                    <option value="dumb">Simple UI (Dumb)</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Add Servant form inside Controls tab */}
                      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#a78bfa' }}>➕ Add New Servant to Directory</span>
                        <div className="quick-add-row" style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            value={quickServantName}
                            onChange={(e) => setQuickServantName(e.target.value)}
                            placeholder="Name"
                            style={{ flex: 2, padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.75rem', outline: 'none' }}
                          />
                          <input
                            type="text"
                            value={quickServantPasscode}
                            onChange={(e) => setQuickServantPasscode(e.target.value)}
                            placeholder="Pass (1234)"
                            style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.75rem', outline: 'none' }}
                          />
                          <button
                            type="button"
                            onClick={handleQuickAddServant}
                            disabled={quickServantLoading}
                            className="btn-glow"
                            style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: 'var(--gradient-vbt)', color: '#ffffff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            {quickServantLoading ? '...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAndRegenerateSchedule}
                      disabled={savingEventConfig}
                      className="btn-glow"
                      style={{
                        width: '100%', padding: '14px', borderRadius: '10px',
                        background: 'var(--gradient-vbt)', border: 'none', color: '#ffffff',
                        fontFamily: 'var(--font-title)', fontWeight: '800', fontSize: '0.95rem',
                        cursor: savingEventConfig ? 'not-allowed' : 'pointer', opacity: savingEventConfig ? 0.7 : 1,
                        boxShadow: '0 4px 15px rgba(124,58,237,0.3)', marginTop: '8px'
                      }}
                    >
                      {savingEventConfig ? 'Saving & Recalculating...' : '🔄 Save Setup & Regenerate Schedule'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '16px' }}>
                {/* Google Sheets Sync panel */}
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
            )}

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
                
                {eventConfig.eventType === 'service' ? (
                  <div className="config-grid-2col" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    {['red', 'white', 'black', 'blue'].map(colorKey => {
                      const colorNameCapitalized = colorKey.charAt(0).toUpperCase() + colorKey.slice(1);
                      const customName = eventConfig.teamNames?.[colorKey] || colorNameCapitalized;
                      const colorHex = getTeamColorHex(colorNameCapitalized);
                      const tokenCount = campState.tokens?.[colorKey] || 0;
                      return (
                        <div key={colorKey} style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', borderLeft: `3px solid ${colorHex}` }}>
                          <span style={{ color: colorHex, fontWeight: '600', fontSize: '0.85rem' }}>{customName}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {currentUser.role === 'admin' && (
                              <button onClick={() => handleAdjustTokens(colorKey, -1)} style={{ padding: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}><Minus size={12} /></button>
                            )}
                            <span style={{ fontSize: '1rem', fontWeight: '800', width: '20px', textAlign: 'center' }}>{tokenCount}</span>
                            {currentUser.role === 'admin' && (
                              <button onClick={() => handleAdjustTokens(colorKey, 1)} style={{ padding: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: '4px', cursor: 'pointer' }}><Plus size={12} /></button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ color: 'var(--color-shakes)', fontWeight: '600', fontSize: '0.85rem' }}>{side1Name} Tokens</span>
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
                      <span style={{ color: 'var(--color-fries)', fontWeight: '600', fontSize: '0.85rem' }}>{side2Name} Tokens</span>
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
                )}
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
                      <div key={idx} style={{ display: 'flex', gap: isMobile ? '4px' : '6px', alignItems: 'center' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `hsl(${(idx * 53) % 360}, 55%, 40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '800', color: '#fff', flexShrink: 0 }}>{idx + 1}</div>
                        <input
                          type="text"
                          value={entry.name}
                          onChange={e => handleRosterEntryChange(idx, 'name', e.target.value)}
                          placeholder="Full name"
                          style={{ flex: 2, padding: isMobile ? '6px 8px' : '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: isMobile ? '0.74rem' : '0.82rem', outline: 'none' }}
                        />
                        <input
                          type="text"
                          value={entry.groupLabel}
                          onChange={e => handleRosterEntryChange(idx, 'groupLabel', e.target.value)}
                          placeholder="Group"
                          style={{ flex: 1, padding: isMobile ? '6px 8px' : '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#a78bfa', fontSize: isMobile ? '0.74rem' : '0.82rem', outline: 'none', textAlign: 'center' }}
                        />
                        <button onClick={() => handleRemoveRosterEntry(idx)} style={{ padding: isMobile ? '5px' : '7px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
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

            {currentUser.role === 'admin' && editEventConfig && (() => {
              // Ensure teams array exists in editEventConfig
              const DEFAULT_TEAM_PRESETS = [
                { name: 'Red', color: '#ef4444' },
                { name: 'White', color: '#f8fafc' },
                { name: 'Black', color: '#94a3b8' },
                { name: 'Blue', color: '#29b6f6' },
                { name: 'Green', color: '#22c55e' },
                { name: 'Yellow', color: '#facc15' },
                { name: 'Purple', color: '#a78bfa' },
                { name: 'Orange', color: '#f97316' },
              ];
              const COLOR_SWATCHES = ['#ef4444','#f8fafc','#94a3b8','#29b6f6','#22c55e','#facc15','#a78bfa','#f97316','#ec4899','#14b8a6','#6366f1','#84cc16'];
              
              const teams = editEventConfig.teams || (
                eventConfig.eventType === 'service'
                  ? [
                      { name: eventConfig.teamNames?.red || 'Red', color: '#ef4444' },
                      { name: eventConfig.teamNames?.white || 'White', color: '#f8fafc' },
                      { name: eventConfig.teamNames?.black || 'Black', color: '#94a3b8' },
                      { name: eventConfig.teamNames?.blue || 'Blue', color: '#29b6f6' },
                    ]
                  : [
                      { name: editEventConfig.side1Name || eventConfig.side1Name || 'Shakes', color: '#00b0ff' },
                      { name: editEventConfig.side2Name || eventConfig.side2Name || 'Fries', color: '#ff9100' },
                    ]
              );

              const updateTeams = (newTeams) => {
                setEditEventConfig(prev => ({ ...prev, teams: newTeams }));
              };
              const addTeam = () => {
                const nextPreset = DEFAULT_TEAM_PRESETS[teams.length] || { name: `Team ${teams.length + 1}`, color: COLOR_SWATCHES[teams.length % COLOR_SWATCHES.length] };
                updateTeams([...teams, nextPreset]);
              };
              const removeTeam = (idx) => {
                if (teams.length <= 2) return;
                const teamName = teams[idx]?.name || `Team ${idx + 1}`;
                if (!window.confirm(`Are you sure you want to remove "${teamName}"?`)) return;
                updateTeams(teams.filter((_, i) => i !== idx));
              };
              const updateTeam = (idx, key, value) => {
                const updated = teams.map((t, i) => i === idx ? { ...t, [key]: value } : t);
                updateTeams(updated);
              };

              return (
              <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(41,182,246,0.2)', background: 'rgba(41,182,246,0.03)' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#29b6f6', marginBottom: '4px' }}>⚙️ Event Setup</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>Customize this event's branding, team names, and access passcodes.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Standard config fields */}
                  {[['Event Name', 'eventName', 'e.g. VBT Summer Camp 2027'],
                    ['Description', 'description', 'e.g. Live scoring & team management'],
                    ['Event Date', 'eventDate', 'e.g. June 20, 2027'],
                  ].map(([label, field, ph]) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</label>
                      <input
                        type="text"
                        value={editEventConfig[field] || ''}
                        onChange={(e) => setEditEventConfig(prev => ({ ...prev, [field]: e.target.value }))}
                        placeholder={ph}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  ))}

                  {/* ── DYNAMIC TEAMS EDITOR ──────────────────────────── */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#29b6f6', fontWeight: '700' }}>
                        Teams ({teams.length})
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => { if (teams.length > 2) updateTeams(teams.slice(0, -1)); }}
                          disabled={teams.length <= 2}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-light)',
                            background: teams.length <= 2 ? 'rgba(0,0,0,0.2)' : 'rgba(239,68,68,0.15)', color: teams.length <= 2 ? 'var(--text-muted)' : '#ef4444',
                            fontSize: '1rem', fontWeight: '700', cursor: teams.length <= 2 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >−</button>
                        <button
                          type="button"
                          onClick={addTeam}
                          disabled={teams.length >= 8}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--border-light)',
                            background: teams.length >= 8 ? 'rgba(0,0,0,0.2)' : 'rgba(41,182,246,0.15)', color: teams.length >= 8 ? 'var(--text-muted)' : '#29b6f6',
                            fontSize: '1rem', fontWeight: '700', cursor: teams.length >= 8 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >+</button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {teams.map((team, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          flexDirection: isMobile ? 'column' : 'row',
                          alignItems: isMobile ? 'stretch' : 'center',
                          gap: '8px',
                          padding: isMobile ? '10px 12px' : '8px 10px',
                          borderRadius: '10px',
                          background: 'rgba(0,0,0,0.2)',
                          border: `1px solid ${team.color}33`
                        }}>
                          {/* Top Row: Color Picker, Badge, Input, Delete Button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            {/* Color indicator + picker */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <div
                                style={{
                                  width: '32px', height: '32px', borderRadius: '8px',
                                  background: team.color, border: '2px solid rgba(255,255,255,0.2)',
                                  cursor: 'pointer', position: 'relative', overflow: 'hidden'
                                }}
                              >
                                <input
                                  type="color"
                                  value={team.color}
                                  onChange={(e) => updateTeam(idx, 'color', e.target.value)}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                />
                              </div>
                            </div>

                            {/* Team number badge */}
                            <span style={{
                              fontSize: '0.65rem', fontWeight: '800', color: team.color,
                              minWidth: '14px', textAlign: 'center'
                            }}>
                              {idx + 1}
                            </span>

                            {/* Name input */}
                            <input
                              type="text"
                              value={team.name}
                              onChange={(e) => updateTeam(idx, 'name', e.target.value)}
                              placeholder={`Team ${idx + 1}`}
                              style={{
                                flex: 1, padding: '7px 10px', borderRadius: '6px',
                                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                                color: '#ffffff', fontSize: '0.85rem', outline: 'none',
                                fontFamily: 'var(--font-body)'
                              }}
                            />

                            {/* Remove button (Desktop inline) */}
                            {!isMobile && (
                              <button
                                type="button"
                                onClick={() => removeTeam(idx)}
                                disabled={teams.length <= 2}
                                style={{
                                  width: '24px', height: '24px', borderRadius: '6px',
                                  border: 'none', background: teams.length <= 2 ? 'transparent' : 'rgba(239,68,68,0.15)',
                                  color: teams.length <= 2 ? 'var(--text-muted)' : '#ef4444',
                                  fontSize: '0.8rem', cursor: teams.length <= 2 ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}
                              >✕</button>
                            )}
                          </div>

                          {/* Bottom Row / Inline Color Swatches & mobile actions */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            paddingLeft: isMobile ? '40px' : '0px',
                            marginTop: isMobile ? '2px' : '0px'
                          }}>
                            {/* Color swatches */}
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              {isMobile && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginRight: '4px' }}>Color:</span>}
                              {COLOR_SWATCHES.slice(0, isMobile ? 8 : 4).map((c) => (
                                <div
                                  key={c}
                                  onClick={() => updateTeam(idx, 'color', c)}
                                  style={{
                                    width: isMobile ? '18px' : '14px',
                                    height: isMobile ? '18px' : '14px',
                                    borderRadius: '3px',
                                    background: c, cursor: 'pointer',
                                    border: team.color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                                    transition: 'transform 0.15s',
                                  }}
                                />
                              ))}
                            </div>

                            {/* Remove button (Mobile bottom right) */}
                            {isMobile && (
                              <button
                                type="button"
                                onClick={() => removeTeam(idx)}
                                disabled={teams.length <= 2}
                                style={{
                                  padding: '4px 10px', borderRadius: '6px',
                                  border: 'none', background: teams.length <= 2 ? 'transparent' : 'rgba(239,68,68,0.15)',
                                  color: teams.length <= 2 ? 'var(--text-muted)' : '#ef4444',
                                  fontSize: '0.75rem', fontWeight: '700', cursor: teams.length <= 2 ? 'not-allowed' : 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                              >✕ Remove</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Passcode fields */}
                  {[['Coordinator Passcode', 'passcodeCoordinator', 'Admin passcode'],
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
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
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
              );
            })()}
            </div>
            )}

            {settingsSubTab === 'builder' && (
              <ScheduleBuilder
                eventCode={currentEventCode}
                eventConfig={eventConfig}
                campData={campData}
                getTeamColorHex={getTeamColorHex}
                onPublish={(docs) => {
                  playChime('schedule');
                }}
              />
            )}
          </div>
        )}

        {/* Tab: Service */}
        {currentTab === 'service' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{
              background: 'rgba(41, 182, 246, 0.1)',
              border: '1px solid rgba(41, 182, 246, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              color: '#e2e8f0',
              fontSize: '0.85rem',
              lineHeight: '1.5'
            }}>
              <h3 style={{ color: '#29b6f6', fontWeight: '800', margin: '0 0 6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👴 Games & Theme Helper Card
              </h3>
              <p style={{ margin: 0 }}>
                Here you can view the outreach service target brief, team sub-group breakdowns (with kid counts), and the active station games with rules and Bible lessons.
              </p>
            </div>

            {/* ── COORDINATOR EDIT BAR ─────────────────────────────── */}
            {currentUser && currentUser.role === 'admin' && (
              <div className="service-edit-bar" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                    <div key={idx} className="service-group-edit-row" style={{
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
                            className="game-detail-header-btn"
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
      <nav 
        className="mobile-nav-bar" 
        style={{ 
          display: 'flex', 
          width: '100%', 
          justifyContent: getActiveTabs().length > 5 ? 'flex-start' : 'space-around', 
          alignItems: 'center',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingLeft: getActiveTabs().length > 5 ? '12px' : '0px',
          paddingRight: getActiveTabs().length > 5 ? '12px' : '0px',
          gap: getActiveTabs().length > 5 ? '8px' : '0px'
        }}
      >
        {getActiveTabs().map((t) => {
          const Icon = t.icon;
          const isMoreActive = t.id === 'more' && !['schedule', 'scoreboard', 'info', 'timeline'].includes(currentTab);
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
                }
              }}
              style={{
                flex: getActiveTabs().length > 5 ? '0 0 auto' : '1',
                minWidth: getActiveTabs().length > 5 ? '68px' : '60px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.74rem',
                fontWeight: '700',
                padding: '6px 8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: 'transparent',
                border: 'none',
                gap: '2px'
              }}
            >
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} style={{ marginBottom: '2px' }} />
                {t.badge && (
                  <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }} />
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

              {/* Admin, Leader, Referee: Walkie Talkie */}
              {['admin', 'leader', 'referee'].includes(currentUser.role) && (
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
    </div>
  );
}
