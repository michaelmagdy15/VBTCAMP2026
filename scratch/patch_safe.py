# patch_safe.py — All Phase 3 patches with safe byte writing (no emoji in patches)

with open('src/App.jsx', 'rb') as f:
    raw = f.read()

src = raw.decode('utf-8')
print(f"Loaded: {len(src)} chars")

patches_applied = 0

def patch(label, old, new):
    global src, patches_applied
    if old in src:
        if new in src and old not in new:
            print(f"~ {label}: already patched")
            return
        src = src.replace(old, new, 1)
        patches_applied += 1
        print(f"[OK] {label}")
    else:
        print(f"[!!] {label}: anchor not found")

# ── 1. New firebase imports ───────────────────────────────────────────────────
patch(
    "Firebase imports",
    "  getServants,\r\n  updateServant,\r\n  addServant,\r\n  deleteServant,",
    "  getServants,\r\n  subscribeToServants,\r\n  upsertServantOnLogin,\r\n  subscribeToGames,\r\n  upsertGame,\r\n  deleteGame,\r\n  subscribeToTimer,\r\n  setTimerState,\r\n  saveDebrief,\r\n  getDebrief,\r\n  submitFeedback,\r\n  getFeedback,\r\n  scheduleNotification,\r\n  subscribeToScheduledNotifications,\r\n  cancelScheduledNotification,\r\n  updateServant,\r\n  addServant,\r\n  deleteServant,"
)

# ── 2. Real-time servants ─────────────────────────────────────────────────────
patch(
    "Real-time servants",
    (
        "  // Fetch global servants directory once on mount\r\n"
        "  useEffect(() => {\r\n"
        "    let active = true;\r\n"
        "    const fetchServantsData = async () => {\r\n"
        "      try {\r\n"
        "        const data = await getServants();\r\n"
        "        if (active) {\r\n"
        "          setGlobalServants(data);\r\n"
        "        }\r\n"
        "      } catch (err) {\r\n"
        '        console.error("Error loading servants directory:", err);\r\n'
        "      }\r\n"
        "    };\r\n"
        "    fetchServantsData();\r\n"
        "    return () => {\r\n"
        "      active = false;\r\n"
        "    };\r\n"
        "  }, []);"
    ),
    (
        "  // Real-time servants directory\r\n"
        "  useEffect(() => {\r\n"
        "    const unsub = subscribeToServants(setGlobalServants);\r\n"
        "    return unsub;\r\n"
        "  }, []);"
    )
)

# ── 3. New state variables — after timeTick ───────────────────────────────────
patch(
    "New state vars",
    "  const [timeTick, setTimeTick] = useState(0);",
    (
        "  const [timeTick, setTimeTick] = useState(0);\r\n"
        "\r\n"
        "  // ── Feature state ─────────────────────────────────────────────────\r\n"
        "  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('vbt-theme') !== 'light');\r\n"
        "  const [gamesLibrary, setGamesLibrary] = useState([]);\r\n"
        "  const [rotationTimer, setRotationTimer] = useState(null);\r\n"
        "  const [rotationSecondsLeft, setRotationSecondsLeft] = useState(null);\r\n"
        "  const [showRotateNow, setShowRotateNow] = useState(false);\r\n"
        "  const [isOnline, setIsOnline] = useState(navigator.onLine);\r\n"
        "  const [offlineQueueLen, setOfflineQueueLen] = useState(0);\r\n"
        "  const [showQRModal, setShowQRModal] = useState(false);\r\n"
        "  const [showRulesOverlay, setShowRulesOverlay] = useState(false);\r\n"
        "  const [showFeedbackModal, setShowFeedbackModal] = useState(false);\r\n"
        "  const [feedbackRating, setFeedbackRating] = useState(0);\r\n"
        "  const [feedbackText, setFeedbackText] = useState('');\r\n"
        "  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);\r\n"
        "  const [showDebriefModal, setShowDebriefModal] = useState(false);\r\n"
        "  const [debriefData, setDebriefData] = useState({ kidsCount: '', highlights: '', challenges: '', notes: '' });\r\n"
        "  const [debriefSaved, setDebriefSaved] = useState(false);\r\n"
        "  const [showServantDirectoryModal, setShowServantDirectoryModal] = useState(false);\r\n"
        "  const [showGamesLibraryModal, setShowGamesLibraryModal] = useState(false);\r\n"
        "  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);\r\n"
        "  const [servantDirectorySearch, setServantDirectorySearch] = useState('');\r\n"
        "  const [gamesLibrarySearch, setGamesLibrarySearch] = useState('');\r\n"
        "  const [gamesLibraryFilter, setGamesLibraryFilter] = useState('all');\r\n"
        "  const [expandedServant, setExpandedServant] = useState(null);\r\n"
        "  const [expandedGame, setExpandedGame] = useState(null);\r\n"
        "  const [timerDurationMin, setTimerDurationMin] = useState(15);\r\n"
        "  const lastScoreSnapshot = React.useRef(null);\r\n"
        "  const [showUndoScore, setShowUndoScore] = useState(false);\r\n"
        "  const undoTimerRef = React.useRef(null);\r\n"
        "  const [pickGameTarget, setPickGameTarget] = useState(null);\r\n"
        "  const [showNotifScheduler, setShowNotifScheduler] = useState(false);\r\n"
        "  const [notifScheduleForm, setNotifScheduleForm] = useState({ title: '', body: '', sendAt: '' });"
    )
)

# ── 4. New effects before Preloader ──────────────────────────────────────────
patch(
    "New effects",
    "  // Preloader timer\r\n  useEffect(() => {",
    (
        "  // Games library subscription\r\n"
        "  useEffect(() => {\r\n"
        "    const unsub = subscribeToGames(setGamesLibrary);\r\n"
        "    return unsub;\r\n"
        "  }, []);\r\n"
        "\r\n"
        "  // Dark mode\r\n"
        "  useEffect(() => {\r\n"
        "    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');\r\n"
        "    localStorage.setItem('vbt-theme', isDarkMode ? 'dark' : 'light');\r\n"
        "  }, [isDarkMode]);\r\n"
        "\r\n"
        "  // Online/offline + SW message handler\r\n"
        "  useEffect(() => {\r\n"
        "    const onOnline = () => setIsOnline(true);\r\n"
        "    const onOffline = () => setIsOnline(false);\r\n"
        "    window.addEventListener('online', onOnline);\r\n"
        "    window.addEventListener('offline', onOffline);\r\n"
        "    const onSWMsg = (e) => {\r\n"
        "      if (e.data?.type === 'SYNC_DONE') setOfflineQueueLen(0);\r\n"
        "      if (e.data?.type === 'SYNC_START') setOfflineQueueLen(e.data.count || 0);\r\n"
        "    };\r\n"
        "    navigator.serviceWorker?.addEventListener('message', onSWMsg);\r\n"
        "    return () => {\r\n"
        "      window.removeEventListener('online', onOnline);\r\n"
        "      window.removeEventListener('offline', onOffline);\r\n"
        "      navigator.serviceWorker?.removeEventListener('message', onSWMsg);\r\n"
        "    };\r\n"
        "  }, []);\r\n"
        "\r\n"
        "  // Rotation timer Firestore subscription\r\n"
        "  useEffect(() => {\r\n"
        "    if (!currentEventCode) return;\r\n"
        "    const unsub = subscribeToTimer(currentEventCode, setRotationTimer);\r\n"
        "    return unsub;\r\n"
        "  }, [currentEventCode]);\r\n"
        "\r\n"
        "  // Rotation timer countdown tick\r\n"
        "  useEffect(() => {\r\n"
        "    if (!rotationTimer) { setRotationSecondsLeft(null); return; }\r\n"
        "    const tick = () => {\r\n"
        "      const { durationMin = 15, startedAt, isPaused, pausedAt, totalPausedMs = 0 } = rotationTimer;\r\n"
        "      if (!startedAt) { setRotationSecondsLeft(null); return; }\r\n"
        "      const pauseOffset = isPaused && pausedAt\r\n"
        "        ? (new Date(pausedAt) - new Date(startedAt) - totalPausedMs) / 1000\r\n"
        "        : (Date.now() - new Date(startedAt) - totalPausedMs) / 1000;\r\n"
        "      const sLeft = Math.max(0, durationMin * 60 - (isPaused ? (new Date(pausedAt) - new Date(startedAt) - totalPausedMs) / 1000 : (Date.now() - new Date(startedAt) - totalPausedMs) / 1000));\r\n"
        "      setRotationSecondsLeft(Math.round(sLeft));\r\n"
        "      if (sLeft <= 0 && !isPaused) setShowRotateNow(true);\r\n"
        "    };\r\n"
        "    tick();\r\n"
        "    const iv = setInterval(tick, 1000);\r\n"
        "    return () => clearInterval(iv);\r\n"
        "  }, [rotationTimer]);\r\n"
        "\r\n"
        "  // Load debrief when modal opens\r\n"
        "  useEffect(() => {\r\n"
        "    if (showDebriefModal && currentEventCode) {\r\n"
        "      getDebrief(currentEventCode).then(d => { if (d) setDebriefData(p => ({ ...p, ...d })); });\r\n"
        "    }\r\n"
        "  }, [showDebriefModal, currentEventCode]);\r\n"
        "\r\n"
        "  // Preloader timer\r\n"
        "  useEffect(() => {"
    )
)

# ── 5. Handler functions before handleCreateEvent ─────────────────────────────
patch(
    "Handler functions",
    "  // Create New Event Handler\r\n  const handleCreateEvent = async (e) => {",
    (
        "  // Undo last score change\r\n"
        "  const triggerUndoSnapshot = (prev) => {\r\n"
        "    lastScoreSnapshot.current = prev;\r\n"
        "    setShowUndoScore(true);\r\n"
        "    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);\r\n"
        "    undoTimerRef.current = setTimeout(() => setShowUndoScore(false), 8000);\r\n"
        "  };\r\n"
        "  const handleUndoScore = async () => {\r\n"
        "    if (!lastScoreSnapshot.current || !currentEventCode) return;\r\n"
        "    try {\r\n"
        "      await updateCampState(currentEventCode, lastScoreSnapshot.current);\r\n"
        "      lastScoreSnapshot.current = null;\r\n"
        "      setShowUndoScore(false);\r\n"
        "    } catch (e) { console.error('Undo failed:', e); }\r\n"
        "  };\r\n"
        "\r\n"
        "  // Rotation timer controls\r\n"
        "  const handleTimerStart = async () => {\r\n"
        "    await setTimerState(currentEventCode, { durationMin: timerDurationMin, startedAt: new Date().toISOString(), isPaused: false, pausedAt: null, totalPausedMs: 0 });\r\n"
        "    setShowRotateNow(false);\r\n"
        "  };\r\n"
        "  const handleTimerPause = async () => {\r\n"
        "    if (!rotationTimer?.startedAt) return;\r\n"
        "    await setTimerState(currentEventCode, { isPaused: true, pausedAt: new Date().toISOString() });\r\n"
        "  };\r\n"
        "  const handleTimerResume = async () => {\r\n"
        "    if (!rotationTimer?.pausedAt) return;\r\n"
        "    const extra = Date.now() - new Date(rotationTimer.pausedAt);\r\n"
        "    await setTimerState(currentEventCode, { isPaused: false, pausedAt: null, totalPausedMs: (rotationTimer.totalPausedMs || 0) + extra });\r\n"
        "  };\r\n"
        "  const handleTimerReset = async () => {\r\n"
        "    await setTimerState(currentEventCode, { startedAt: null, isPaused: false, pausedAt: null, totalPausedMs: 0 });\r\n"
        "    setRotationSecondsLeft(null); setShowRotateNow(false);\r\n"
        "  };\r\n"
        "\r\n"
        "  // WhatsApp deep link\r\n"
        "  const getWhatsAppLink = (servant, roleLabel) => {\r\n"
        "    const eName = eventConfig?.eventName || 'the next service';\r\n"
        "    const eDate = eventConfig?.eventDate || '';\r\n"
        "    const msg = encodeURIComponent('Hey ' + servant.name + '! You are assigned to ' + roleLabel + ' for ' + eName + (eDate ? ' on ' + eDate : '') + '. Join at ' + window.location.origin + ' code: ' + currentEventCode);\r\n"
        "    return 'https://wa.me/?text=' + msg;\r\n"
        "  };\r\n"
        "\r\n"
        "  // Feedback submit\r\n"
        "  const handleSubmitFeedback = async () => {\r\n"
        "    if (!feedbackRating) return;\r\n"
        "    try {\r\n"
        "      await submitFeedback(currentEventCode, { rating: feedbackRating, comment: feedbackText });\r\n"
        "      setFeedbackSubmitted(true);\r\n"
        "      setTimeout(() => { setShowFeedbackModal(false); setFeedbackSubmitted(false); setFeedbackRating(0); setFeedbackText(''); }, 2000);\r\n"
        "    } catch (e) { alert('Failed to submit feedback'); }\r\n"
        "  };\r\n"
        "\r\n"
        "  // Debrief save\r\n"
        "  const handleSaveDebrief = async () => {\r\n"
        "    try {\r\n"
        "      await saveDebrief(currentEventCode, { ...debriefData, eventName: eventConfig?.eventName, eventDate: eventConfig?.eventDate });\r\n"
        "      setDebriefSaved(true); setTimeout(() => setDebriefSaved(false), 3000);\r\n"
        "    } catch (e) { alert('Failed to save debrief'); }\r\n"
        "  };\r\n"
        "\r\n"
        "  // Auto-save games to global library\r\n"
        "  const autoSaveGamesToLibrary = async (stationsObj, eCode, eName) => {\r\n"
        "    if (!stationsObj) return;\r\n"
        "    const types = [['station_1','station'],['station_2','station'],['station_3','station'],['station_4','station'],['big_game','big_game'],['reflection','reflection']];\r\n"
        "    for (const [key, type] of types) {\r\n"
        "      const s = stationsObj[key];\r\n"
        "      if (!s?.name?.trim()) continue;\r\n"
        "      const gId = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');\r\n"
        "      if (gId) upsertGame(gId, { name: s.name, type, location: s.location || '', howToPlay: s.howToPlay || '', lesson: s.lesson || '', eventCode: eCode, eventName: eName }).catch(() => {});\r\n"
        "    }\r\n"
        "  };\r\n"
        "\r\n"
        "  // Create New Event Handler\r\n"
        "  const handleCreateEvent = async (e) => {"
    )
)

# ── 6. Call autoSaveGamesToLibrary in handleCreateEvent ───────────────────────
patch(
    "Auto-save games on create",
    "        await generateAndSaveServiceSchedule(code, configData, wizardAttending, globalServants);\r\n",
    (
        "        await generateAndSaveServiceSchedule(code, configData, wizardAttending, globalServants);\r\n"
        "        autoSaveGamesToLibrary(configData.stations, code, configData.eventName).catch(() => {});\r\n"
    )
)

# ── 7. Role-filtered tabs ─────────────────────────────────────────────────────
patch(
    "Role-filtered tabs",
    (
        "  const getActiveTabs = () => {\r\n"
        "    if (!currentUser) return [];\r\n"
        "    \r\n"
        "    if (eventConfig?.eventType === 'service') {\r\n"
        "      const unreadCount = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;\r\n"
        "      return [\r\n"
        "        { id: 'schedule', label: 'Schedule', icon: Calendar },\r\n"
        "        { id: 'service', label: 'My Games', icon: BookOpen },\r\n"
        "        { id: 'walkie', label: 'Radio', icon: Radio },\r\n"
        "        { id: 'scoreboard', label: 'Scores', icon: Trophy },\r\n"
        "        { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },\r\n"
        "        { id: 'more', label: 'More', icon: MoreHorizontal }\r\n"
        "      ];\r\n"
        "    }\r\n"
        "    \r\n"
        "    const unreadCount = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;\r\n"
        "    return [\r\n"
        "      { id: 'schedule', label: 'Schedule', icon: Calendar },\r\n"
        "      { id: 'scoreboard', label: 'Scores', icon: Trophy },\r\n"
        "      { id: 'info', label: 'Map', icon: MapIcon },\r\n"
        "      { id: 'walkie', label: 'Radio', icon: Radio },\r\n"
        "      { id: 'timeline', label: 'Feed', icon: Bell, badge: unreadCount },\r\n"
        "      { id: 'more', label: 'More', icon: MoreHorizontal }\r\n"
        "    ];\r\n"
        "  };"
    ),
    (
        "  const getActiveTabs = () => {\r\n"
        "    if (!currentUser) return [];\r\n"
        "    const role = currentUser.role || 'volunteer';\r\n"
        "    const isAdmin = role === 'admin' || role === 'coordinator';\r\n"
        "    const isLeader = role === 'leader';\r\n"
        "    const isReferee = role === 'referee';\r\n"
        "    const unread = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;\r\n"
        "    if (eventConfig?.eventType === 'service') {\r\n"
        "      if (isReferee) return [\r\n"
        "        { id: 'service', label: 'My Games', icon: BookOpen },\r\n"
        "        { id: 'scoreboard', label: 'Scores', icon: Trophy },\r\n"
        "        { id: 'walkie', label: 'Radio', icon: Radio },\r\n"
        "        { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },\r\n"
        "      ];\r\n"
        "      if (!isAdmin && !isLeader) return [\r\n"
        "        { id: 'schedule', label: 'Schedule', icon: Calendar },\r\n"
        "        { id: 'service', label: 'My Games', icon: BookOpen },\r\n"
        "        { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },\r\n"
        "      ];\r\n"
        "      return [\r\n"
        "        { id: 'schedule', label: 'Schedule', icon: Calendar },\r\n"
        "        { id: 'service', label: 'My Games', icon: BookOpen },\r\n"
        "        { id: 'walkie', label: 'Radio', icon: Radio },\r\n"
        "        { id: 'scoreboard', label: 'Scores', icon: Trophy },\r\n"
        "        { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },\r\n"
        "        { id: 'more', label: 'More', icon: MoreHorizontal },\r\n"
        "      ];\r\n"
        "    }\r\n"
        "    if (isReferee) return [\r\n"
        "      { id: 'schedule', label: 'Schedule', icon: Calendar },\r\n"
        "      { id: 'scoreboard', label: 'Scores', icon: Trophy },\r\n"
        "      { id: 'walkie', label: 'Radio', icon: Radio },\r\n"
        "    ];\r\n"
        "    if (!isAdmin && !isLeader) return [\r\n"
        "      { id: 'schedule', label: 'Schedule', icon: Calendar },\r\n"
        "      { id: 'scoreboard', label: 'Scores', icon: Trophy },\r\n"
        "      { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },\r\n"
        "    ];\r\n"
        "    return [\r\n"
        "      { id: 'schedule', label: 'Schedule', icon: Calendar },\r\n"
        "      { id: 'scoreboard', label: 'Scores', icon: Trophy },\r\n"
        "      { id: 'info', label: 'Map', icon: MapIcon },\r\n"
        "      { id: 'walkie', label: 'Radio', icon: Radio },\r\n"
        "      { id: 'timeline', label: 'Feed', icon: Bell, badge: unread },\r\n"
        "      { id: 'more', label: 'More', icon: MoreHorizontal },\r\n"
        "    ];\r\n"
        "  };"
    )
)

# ── Save ──────────────────────────────────────────────────────────────────────
out = src.encode('utf-8')
with open('src/App.jsx', 'wb') as f:
    f.write(out)
print(f"\nDone: {patches_applied} patches applied, {len(out)} bytes saved")
