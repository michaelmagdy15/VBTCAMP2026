# patch_phase3.py  — App.jsx core state + logic patches
# Adds: new imports, new state vars, real-time servants, servant upsert on login,
#       undo score, rotation timer subscribe, auto-save games, role-filtered tabs,
#       dark-mode state, offline queue listener, SW message handler

import re

with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# ─── 1. ADD NEW IMPORTS after existing firebase imports ───────────────────────
old_imports = "import {\n  getServants,"
new_imports = """import {
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
  cancelScheduledNotification,"""

if old_imports in src:
    src = src.replace(old_imports, new_imports, 1)
    print("✓ Added new firebase imports")
else:
    print("✗ Could not find import block")

# ─── 2. ADD QRCode import after lucide-react import ──────────────────────────
qr_import = "import { QRCodeSVG } from 'qrcode.react';\nimport { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';\nimport { Bar, Line } from 'react-chartjs-2';\nChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);\n"

# Find lucide-react import end
lucide_marker = "} from 'lucide-react';"
if lucide_marker in src and 'QRCodeSVG' not in src:
    src = src.replace(lucide_marker, lucide_marker + '\n' + qr_import, 1)
    print("✓ Added QRCode + Chart.js imports")
else:
    print("✗ QR import already present or lucide marker not found")

# ─── 3. ADD NEW STATE VARIABLES after existing useState declarations ──────────
# Find a reliable anchor — the timeTick state
time_tick_state = "  const [timeTick, setTimeTick] = useState(0);"
new_state_block = """  const [timeTick, setTimeTick] = useState(0);

  // ── New feature state ─────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('vbt-theme') !== 'light');
  const [gamesLibrary, setGamesLibrary] = useState([]);
  const [rotationTimer, setRotationTimer] = useState(null);  // Firestore timer doc
  const [rotationSecondsLeft, setRotationSecondsLeft] = useState(null);
  const [showRotateNow, setShowRotateNow] = useState(false);
  const [offlineQueueLen, setOfflineQueueLen] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRulesOverlay, setShowRulesOverlay] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showDebriefModal, setShowDebriefModal] = useState(false);
  const [debriefData, setDebriefData] = useState({ kidsCount: '', highlights: '', challenges: '', notes: '' });
  const [debriefSaved, setDebriefSaved] = useState(false);
  const [showNotifScheduler, setShowNotifScheduler] = useState(false);
  const [scheduledNotifs, setScheduledNotifs] = useState([]);
  const [notifScheduleForm, setNotifScheduleForm] = useState({ title: '', body: '', sendAt: '' });
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
  const [pickGameTarget, setPickGameTarget] = useState(null); // station key to fill from library"""

if time_tick_state in src:
    src = src.replace(time_tick_state, new_state_block, 1)
    print("✓ Added new state variables")
else:
    print("✗ Could not find timeTick state anchor")

# ─── 4. SWITCH SERVANTS TO REAL-TIME SUBSCRIPTION ────────────────────────────
old_servants_effect = """  // Fetch global servants directory once on mount
  useEffect(() => {
    let active = true;
    const fetchServantsData = async () => {
      try {
        const data = await getServants();
        if (active) {
          setGlobalServants(data);
        }
      } catch (err) {
        console.error(\"Error loading servants directory:\", err);
      }
    };
    fetchServantsData();
    return () => {
      active = false;
    };
  }, []);"""

new_servants_effect = """  // Real-time servants directory subscription
  useEffect(() => {
    const unsub = subscribeToServants((data) => {
      setGlobalServants(data);
    });
    return unsub;
  }, []);"""

if old_servants_effect in src:
    src = src.replace(old_servants_effect, new_servants_effect, 1)
    print("✓ Switched servants to real-time subscription")
else:
    print("✗ Could not find servants fetch effect")

# ─── 5. ADD NEW EFFECTS block (games, timer, online status, SW messages) ─────
# Anchor: Preloader timer (reliable marker)
preloader_anchor = "  // Preloader timer\n  useEffect(() => {"
new_effects = """  // Subscribe to games library
  useEffect(() => {
    const unsub = subscribeToGames(setGamesLibrary);
    return unsub;
  }, []);

  // Dark mode: apply data-theme to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('vbt-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Online/offline detection + offline queue length
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // SW message handler for sync events
    const handleSWMessage = (e) => {
      if (e.data?.type === 'SYNC_DONE') setOfflineQueueLen(0);
      if (e.data?.type === 'SYNC_START') setOfflineQueueLen(e.data.count || 0);
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // Rotation timer subscription
  useEffect(() => {
    if (!currentEventCode) return;
    const unsub = subscribeToTimer(currentEventCode, (timerDoc) => {
      setRotationTimer(timerDoc);
    });
    return unsub;
  }, [currentEventCode]);

  // Rotation timer countdown tick
  useEffect(() => {
    if (!rotationTimer) { setRotationSecondsLeft(null); return; }
    const tick = () => {
      const { durationMin, startedAt, isPaused, pausedAt, totalPausedMs = 0 } = rotationTimer;
      if (!startedAt) { setRotationSecondsLeft(null); return; }
      if (isPaused && pausedAt) {
        const elapsed = (new Date(pausedAt) - new Date(startedAt) - totalPausedMs) / 1000;
        const sLeft = Math.max(0, durationMin * 60 - elapsed);
        setRotationSecondsLeft(Math.round(sLeft));
        return;
      }
      const elapsed = (Date.now() - new Date(startedAt) - totalPausedMs) / 1000;
      const sLeft = Math.max(0, durationMin * 60 - elapsed);
      setRotationSecondsLeft(Math.round(sLeft));
      if (sLeft <= 0) setShowRotateNow(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rotationTimer]);

  // Load debrief when modal opens
  useEffect(() => {
    if (showDebriefModal && currentEventCode) {
      getDebrief(currentEventCode).then(data => {
        if (data) setDebriefData(prev => ({ ...prev, ...data }));
      });
    }
  }, [showDebriefModal, currentEventCode]);

  // Preloader timer
  useEffect(() => {"""

if preloader_anchor in src:
    src = src.replace(preloader_anchor, new_effects, 1)
    print("✓ Added new effect hooks")
else:
    print("✗ Could not find preloader anchor")

# ─── 6. AUTO-UPSERT SERVANT ON LOGIN ─────────────────────────────────────────
# Find the login success handler - look for setCurrentUser call in login
login_anchor = "      setCurrentUser(servantObj);"
upsert_addition = """      setCurrentUser(servantObj);
      // Auto-upsert servant in global directory with attendance tracking
      upsertServantOnLogin(servant.id, servant.name, currentEventCode).catch(() => {});"""

if login_anchor in src and 'upsertServantOnLogin' not in src:
    src = src.replace(login_anchor, upsert_addition, 1)
    print("✓ Added servant upsert on login")
elif 'upsertServantOnLogin' in src:
    print("~ Servant upsert already present")
else:
    print("✗ Could not find login setCurrentUser anchor")

# ─── 7. UNDO SCORE — wrap score update calls ─────────────────────────────────
# Add helper functions before handleCreateEvent
create_event_anchor = "  // Create New Event Handler\n  const handleCreateEvent = async (e) => {"
undo_score_funcs = """  // ── Undo last score change ──────────────────────────────────────
  const triggerUndoSnapshot = (prevState) => {
    lastScoreSnapshot.current = prevState;
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
    } catch (err) {
      console.error('Undo failed:', err);
    }
  };

  // ── Rotation Timer controls ──────────────────────────────────────
  const handleTimerStart = async () => {
    const now = new Date().toISOString();
    await setTimerState(currentEventCode, {
      durationMin: timerDurationMin,
      startedAt: now,
      isPaused: false,
      pausedAt: null,
      totalPausedMs: 0,
    });
    setShowRotateNow(false);
  };

  const handleTimerPause = async () => {
    if (!rotationTimer?.startedAt) return;
    await setTimerState(currentEventCode, {
      isPaused: true,
      pausedAt: new Date().toISOString(),
    });
  };

  const handleTimerResume = async () => {
    if (!rotationTimer?.pausedAt) return;
    const extraPause = Date.now() - new Date(rotationTimer.pausedAt);
    await setTimerState(currentEventCode, {
      isPaused: false,
      pausedAt: null,
      totalPausedMs: (rotationTimer.totalPausedMs || 0) + extraPause,
    });
  };

  const handleTimerReset = async () => {
    await setTimerState(currentEventCode, {
      startedAt: null, isPaused: false, pausedAt: null, totalPausedMs: 0,
    });
    setRotationSecondsLeft(null);
    setShowRotateNow(false);
  };

  // ── WhatsApp deep link helper ────────────────────────────────────
  const getWhatsAppLink = (servant, roleLabel) => {
    const eventName = eventConfig?.eventName || 'the next service';
    const eventDate = eventConfig?.eventDate || '';
    const msg = encodeURIComponent(
      `Hey ${servant.name}! You're assigned to ${roleLabel} for ${eventName}${eventDate ? ' on ' + eventDate : ''}. Join the app at ${window.location.origin} with code: ${currentEventCode} 🏅`
    );
    return `https://wa.me/?text=${msg}`;
  };

  // ── Feedback submit ──────────────────────────────────────────────
  const handleSubmitFeedback = async () => {
    if (!feedbackRating) return;
    try {
      await submitFeedback(currentEventCode, {
        rating: feedbackRating,
        comment: feedbackText,
      });
      setFeedbackSubmitted(true);
      setTimeout(() => { setShowFeedbackModal(false); setFeedbackSubmitted(false); setFeedbackRating(0); setFeedbackText(''); }, 2000);
    } catch (err) {
      alert('Failed to submit feedback');
    }
  };

  // ── Debrief save ─────────────────────────────────────────────────
  const handleSaveDebrief = async () => {
    try {
      await saveDebrief(currentEventCode, {
        ...debriefData,
        eventName: eventConfig?.eventName,
        eventDate: eventConfig?.eventDate,
      });
      setDebriefSaved(true);
      setTimeout(() => setDebriefSaved(false), 3000);
    } catch (err) {
      alert('Failed to save debrief');
    }
  };

  // ── Auto-save games to library when event is created/edited ─────
  const autoSaveGamesToLibrary = async (stationsObj, eCode, eName) => {
    if (!stationsObj) return;
    const stationEntries = [
      { key: 'station_1', type: 'station' },
      { key: 'station_2', type: 'station' },
      { key: 'station_3', type: 'station' },
      { key: 'station_4', type: 'station' },
      { key: 'big_game',  type: 'big_game' },
      { key: 'reflection', type: 'reflection' },
    ];
    for (const { key, type } of stationEntries) {
      const s = stationsObj[key];
      if (!s?.name?.trim()) continue;
      const gameId = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      if (!gameId) continue;
      await upsertGame(gameId, {
        name: s.name.trim(),
        type,
        location: s.location || '',
        howToPlay: s.howToPlay || '',
        lesson: s.lesson || '',
        eventCode: eCode,
        eventName: eName,
      }).catch(e => console.warn('upsertGame warning:', e));
    }
  };

  // Create New Event Handler
  const handleCreateEvent = async (e) => {"""

if create_event_anchor in src:
    src = src.replace(create_event_anchor, undo_score_funcs, 1)
    print("✓ Added undo score, timer controls, WhatsApp, feedback, debrief, auto-save games functions")
else:
    print("✗ Could not find handleCreateEvent anchor")

# ─── 8. CALL autoSaveGamesToLibrary after event creation ─────────────────────
# Find the line that calls generateAndSaveServiceSchedule in handleCreateEvent
event_save_anchor = "        await generateAndSaveServiceSchedule(code, configData, wizardAttending, globalServants);"
event_save_with_games = """        await generateAndSaveServiceSchedule(code, configData, wizardAttending, globalServants);
        // Auto-save all station games to global library
        autoSaveGamesToLibrary(configData.stations, code, configData.eventName).catch(() => {});"""

if event_save_anchor in src:
    src = src.replace(event_save_anchor, event_save_with_games, 1)
    print("✓ Added auto-save games on event create")
else:
    print("~ Could not find service schedule call in handleCreateEvent (may already be patched)")

# ─── 9. ROLE-FILTERED TABS ────────────────────────────────────────────────────
old_get_active_tabs = """  const getActiveTabs = () => {
    if (!currentUser) return [];
    
    if (eventConfig?.eventType === 'service') {
      const unreadCount = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;
      return [
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'service', label: 'My Games', icon: BookOpen },
        { id: 'walkie', label: 'Radio', icon: Radio },
        { id: 'scoreboard', label: 'Scores', icon: Trophy },
        { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },
        { id: 'more', label: 'More', icon: MoreHorizontal }
      ];
    }
    
    const unreadCount = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;
    return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'info', label: 'Map', icon: MapIcon },
      { id: 'walkie', label: 'Radio', icon: Radio },
      { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },
      { id: 'more', label: 'More', icon: MoreHorizontal }
    ];
  };"""

new_get_active_tabs = """  const getActiveTabs = () => {
    if (!currentUser) return [];
    const role = currentUser.role || 'volunteer';
    const isAdmin = role === 'admin' || role === 'coordinator';
    const isLeader = role === 'leader';
    const isReferee = role === 'referee';
    const unreadCount = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;

    if (eventConfig?.eventType === 'service') {
      if (isReferee) return [
        { id: 'service', label: 'My Games', icon: BookOpen },
        { id: 'scoreboard', label: 'Scores', icon: Trophy },
        { id: 'walkie', label: 'Radio', icon: Radio },
        { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },
      ];
      if (!isAdmin && !isLeader) return [
        // volunteer — minimal view
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'service', label: 'My Games', icon: BookOpen },
        { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },
      ];
      return [
        { id: 'schedule', label: 'Schedule', icon: Calendar },
        { id: 'service', label: 'My Games', icon: BookOpen },
        { id: 'walkie', label: 'Radio', icon: Radio },
        { id: 'scoreboard', label: 'Scores', icon: Trophy },
        { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },
        { id: 'more', label: 'More', icon: MoreHorizontal },
      ];
    }

    // Camp / normal mode
    if (isReferee) return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'walkie', label: 'Radio', icon: Radio },
    ];
    if (!isAdmin && !isLeader) return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },
    ];
    return [
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'scoreboard', label: 'Scores', icon: Trophy },
      { id: 'info', label: 'Map', icon: MapIcon },
      { id: 'walkie', label: 'Radio', icon: Radio },
      { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },
      { id: 'more', label: 'More', icon: MoreHorizontal },
    ];
  };"""

if old_get_active_tabs in src:
    src = src.replace(old_get_active_tabs, new_get_active_tabs, 1)
    print("✓ Role-filtered tabs applied")
else:
    print("✗ Could not find getActiveTabs function")

# Save result
with open('src/App.jsx', 'wb') as f:
    f.write(src.encode('utf-8'))

print("\n=== Phase 3 patch complete ===")
