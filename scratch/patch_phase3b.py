# patch_phase3b.py — corrected with exact CRLF line endings

with open('src/App.jsx', 'rb') as f:
    src = f.read().decode('utf-8')

# ─── 1. FIX FIREBASE IMPORTS ─────────────────────────────────────────────────
old_imports = "  getServants,\r\n  updateServant,\r\n  addServant,\r\n  deleteServant,"
new_imports = (
    "  getServants,\r\n"
    "  subscribeToServants,\r\n"
    "  upsertServantOnLogin,\r\n"
    "  subscribeToGames,\r\n"
    "  upsertGame,\r\n"
    "  deleteGame,\r\n"
    "  subscribeToTimer,\r\n"
    "  setTimerState,\r\n"
    "  saveDebrief,\r\n"
    "  getDebrief,\r\n"
    "  submitFeedback,\r\n"
    "  getFeedback,\r\n"
    "  scheduleNotification,\r\n"
    "  subscribeToScheduledNotifications,\r\n"
    "  cancelScheduledNotification,\r\n"
    "  updateServant,\r\n"
    "  addServant,\r\n"
    "  deleteServant,"
)
if old_imports in src and 'subscribeToServants' not in src:
    src = src.replace(old_imports, new_imports, 1)
    print("✓ Fixed firebase imports")
elif 'subscribeToServants' in src:
    print("~ imports already patched")
else:
    print("✗ import anchor not found")

# ─── 2. SWITCH SERVANTS TO REAL-TIME ─────────────────────────────────────────
old_effect = (
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
    "        console.error(\"Error loading servants directory:\", err);\r\n"
    "      }\r\n"
    "    };\r\n"
    "    fetchServantsData();\r\n"
    "    return () => {\r\n"
    "      active = false;\r\n"
    "    };\r\n"
    "  }, []);"
)
new_effect = (
    "  // Real-time servants directory subscription\r\n"
    "  useEffect(() => {\r\n"
    "    const unsub = subscribeToServants((data) => {\r\n"
    "      setGlobalServants(data);\r\n"
    "    });\r\n"
    "    return unsub;\r\n"
    "  }, []);"
)
if old_effect in src:
    src = src.replace(old_effect, new_effect, 1)
    print("✓ Switched servants to real-time")
elif 'subscribeToServants((data)' in src:
    print("~ servants real-time already patched")
else:
    print("✗ servants fetch effect not found")

# ─── 3. ADD NEW EFFECTS before Preloader timer ───────────────────────────────
preloader_anchor = "  // Preloader timer\r\n  useEffect(() => {"
new_effects_block = (
    "  // Subscribe to games library\r\n"
    "  useEffect(() => {\r\n"
    "    const unsub = subscribeToGames(setGamesLibrary);\r\n"
    "    return unsub;\r\n"
    "  }, []);\r\n"
    "\r\n"
    "  // Dark mode: apply data-theme attribute\r\n"
    "  useEffect(() => {\r\n"
    "    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');\r\n"
    "    localStorage.setItem('vbt-theme', isDarkMode ? 'dark' : 'light');\r\n"
    "  }, [isDarkMode]);\r\n"
    "\r\n"
    "  // Online/offline detection + SW message handler\r\n"
    "  useEffect(() => {\r\n"
    "    const handleOnline = () => setIsOnline(true);\r\n"
    "    const handleOffline = () => setIsOnline(false);\r\n"
    "    window.addEventListener('online', handleOnline);\r\n"
    "    window.addEventListener('offline', handleOffline);\r\n"
    "    const handleSWMessage = (e) => {\r\n"
    "      if (e.data?.type === 'SYNC_DONE') setOfflineQueueLen(0);\r\n"
    "      if (e.data?.type === 'SYNC_START') setOfflineQueueLen(e.data.count || 0);\r\n"
    "    };\r\n"
    "    navigator.serviceWorker?.addEventListener('message', handleSWMessage);\r\n"
    "    return () => {\r\n"
    "      window.removeEventListener('online', handleOnline);\r\n"
    "      window.removeEventListener('offline', handleOffline);\r\n"
    "      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);\r\n"
    "    };\r\n"
    "  }, []);\r\n"
    "\r\n"
    "  // Rotation timer subscription\r\n"
    "  useEffect(() => {\r\n"
    "    if (!currentEventCode) return;\r\n"
    "    const unsub = subscribeToTimer(currentEventCode, (timerDoc) => {\r\n"
    "      setRotationTimer(timerDoc);\r\n"
    "    });\r\n"
    "    return unsub;\r\n"
    "  }, [currentEventCode]);\r\n"
    "\r\n"
    "  // Rotation timer countdown tick\r\n"
    "  useEffect(() => {\r\n"
    "    if (!rotationTimer) { setRotationSecondsLeft(null); return; }\r\n"
    "    const tick = () => {\r\n"
    "      const { durationMin, startedAt, isPaused, pausedAt, totalPausedMs = 0 } = rotationTimer;\r\n"
    "      if (!startedAt) { setRotationSecondsLeft(null); return; }\r\n"
    "      if (isPaused && pausedAt) {\r\n"
    "        const elapsed = (new Date(pausedAt) - new Date(startedAt) - totalPausedMs) / 1000;\r\n"
    "        setRotationSecondsLeft(Math.round(Math.max(0, durationMin * 60 - elapsed)));\r\n"
    "        return;\r\n"
    "      }\r\n"
    "      const elapsed = (Date.now() - new Date(startedAt) - totalPausedMs) / 1000;\r\n"
    "      const sLeft = Math.max(0, durationMin * 60 - elapsed);\r\n"
    "      setRotationSecondsLeft(Math.round(sLeft));\r\n"
    "      if (sLeft <= 0) setShowRotateNow(true);\r\n"
    "    };\r\n"
    "    tick();\r\n"
    "    const interval = setInterval(tick, 1000);\r\n"
    "    return () => clearInterval(interval);\r\n"
    "  }, [rotationTimer]);\r\n"
    "\r\n"
    "  // Load debrief when modal opens\r\n"
    "  useEffect(() => {\r\n"
    "    if (showDebriefModal && currentEventCode) {\r\n"
    "      getDebrief(currentEventCode).then(data => {\r\n"
    "        if (data) setDebriefData(prev => ({ ...prev, ...data }));\r\n"
    "      });\r\n"
    "    }\r\n"
    "  }, [showDebriefModal, currentEventCode]);\r\n"
    "\r\n"
    "  // Preloader timer\r\n"
    "  useEffect(() => {"
)
if preloader_anchor in src and 'subscribeToGames(setGamesLibrary)' not in src:
    src = src.replace(preloader_anchor, new_effects_block, 1)
    print("✓ Added new effects")
elif 'subscribeToGames(setGamesLibrary)' in src:
    print("~ effects already patched")
else:
    print("✗ preloader anchor not found")

# ─── 4. AUTO-UPSERT ON LOGIN — find login success ────────────────────────────
# Look for where setCurrentUser is called in the login handler
import re
# setCurrentUser might be called with different variable names - search flexibly
login_match = re.search(r'(setCurrentUser\(\w+\);)\s*(\r?\n\s*)(setShowLogin|setCurrentTab|localStorage\.setItem.*currentUser)', src)
if login_match and 'upsertServantOnLogin' not in src:
    old_login = login_match.group(0)
    new_login = (
        login_match.group(1) + login_match.group(2) +
        "      // Track attendance in global servant directory\r\n"
        "      upsertServantOnLogin(\r\n"
        "        currentUser?.id || '',\r\n"
        "        currentUser?.name || '',\r\n"
        "        currentEventCode\r\n"
        "      ).catch(() => {});\r\n" +
        login_match.group(2) +
        login_match.group(3)
    )
    # Try a simpler approach - find setCurrentUser followed by state saves
    idx = src.find("      setCurrentUser(servantObj);\r\n")
    if idx == -1:
        idx = src.find("      setCurrentUser(")
    print(f"setCurrentUser idx: {idx}")
elif 'upsertServantOnLogin' in src:
    print("~ servant upsert already patched")
else:
    # Find by searching for pattern
    idx = src.find("setCurrentUser(")
    print(f"setCurrentUser found at {idx}")
    print(repr(src[idx:idx+100]))

# Find the actual login handler to add upsert
if 'upsertServantOnLogin' not in src:
    # Search for where login happens and currentUser is set
    login_idx = src.find("setCurrentUser(servantObj)")
    if login_idx != -1:
        old_snip = src[login_idx:login_idx+30]
        new_snip = (
            "setCurrentUser(servantObj);\r\n"
            "      // Track attendance\r\n"
            "      upsertServantOnLogin(servantObj.id, servantObj.name, currentEventCode).catch(() => {});"
        )
        src = src.replace("setCurrentUser(servantObj);", new_snip, 1)
        print("✓ Added servant upsert on login (servantObj)")
    else:
        # Try other patterns
        patterns = ["setCurrentUser(matched)", "setCurrentUser(newUser)", "setCurrentUser(user)"]
        for p in patterns:
            if p in src:
                src = src.replace(p, p + "\r\n      upsertServantOnLogin(matched?.id||'', matched?.name||'', currentEventCode).catch(()=>{});", 1)
                print(f"✓ Added servant upsert with pattern: {p}")
                break
        else:
            print("✗ Could not find login setCurrentUser call")

# ─── 5. HANDLER FUNCTIONS (undo, timer, whatsapp, feedback, debrief, games) ──
create_anchor = "  // Create New Event Handler\r\n  const handleCreateEvent = async (e) => {"
new_handlers = (
    "  // ── Undo last score change ──────────────────────────────────────\r\n"
    "  const triggerUndoSnapshot = (prevState) => {\r\n"
    "    lastScoreSnapshot.current = prevState;\r\n"
    "    setShowUndoScore(true);\r\n"
    "    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);\r\n"
    "    undoTimerRef.current = setTimeout(() => setShowUndoScore(false), 8000);\r\n"
    "  };\r\n"
    "\r\n"
    "  const handleUndoScore = async () => {\r\n"
    "    if (!lastScoreSnapshot.current || !currentEventCode) return;\r\n"
    "    try {\r\n"
    "      await updateCampState(currentEventCode, lastScoreSnapshot.current);\r\n"
    "      lastScoreSnapshot.current = null;\r\n"
    "      setShowUndoScore(false);\r\n"
    "    } catch (err) { console.error('Undo failed:', err); }\r\n"
    "  };\r\n"
    "\r\n"
    "  // ── Rotation Timer controls ──────────────────────────────────────\r\n"
    "  const handleTimerStart = async () => {\r\n"
    "    await setTimerState(currentEventCode, {\r\n"
    "      durationMin: timerDurationMin,\r\n"
    "      startedAt: new Date().toISOString(),\r\n"
    "      isPaused: false, pausedAt: null, totalPausedMs: 0,\r\n"
    "    });\r\n"
    "    setShowRotateNow(false);\r\n"
    "  };\r\n"
    "\r\n"
    "  const handleTimerPause = async () => {\r\n"
    "    if (!rotationTimer?.startedAt) return;\r\n"
    "    await setTimerState(currentEventCode, { isPaused: true, pausedAt: new Date().toISOString() });\r\n"
    "  };\r\n"
    "\r\n"
    "  const handleTimerResume = async () => {\r\n"
    "    if (!rotationTimer?.pausedAt) return;\r\n"
    "    const extra = Date.now() - new Date(rotationTimer.pausedAt);\r\n"
    "    await setTimerState(currentEventCode, {\r\n"
    "      isPaused: false, pausedAt: null,\r\n"
    "      totalPausedMs: (rotationTimer.totalPausedMs || 0) + extra,\r\n"
    "    });\r\n"
    "  };\r\n"
    "\r\n"
    "  const handleTimerReset = async () => {\r\n"
    "    await setTimerState(currentEventCode, { startedAt: null, isPaused: false, pausedAt: null, totalPausedMs: 0 });\r\n"
    "    setRotationSecondsLeft(null);\r\n"
    "    setShowRotateNow(false);\r\n"
    "  };\r\n"
    "\r\n"
    "  // ── WhatsApp deep link ───────────────────────────────────────────\r\n"
    "  const getWhatsAppLink = (servant, roleLabel) => {\r\n"
    "    const eName = eventConfig?.eventName || 'the next service';\r\n"
    "    const eDate = eventConfig?.eventDate || '';\r\n"
    "    const msg = encodeURIComponent(`Hey ${servant.name}! You're assigned to ${roleLabel} for ${eName}${eDate ? ' on ' + eDate : ''}. Join at ${window.location.origin} with code: ${currentEventCode} \ud83c\udfc5`);\r\n"
    "    return `https://wa.me/?text=${msg}`;\r\n"
    "  };\r\n"
    "\r\n"
    "  // ── Feedback submit ──────────────────────────────────────────────\r\n"
    "  const handleSubmitFeedback = async () => {\r\n"
    "    if (!feedbackRating) return;\r\n"
    "    try {\r\n"
    "      await submitFeedback(currentEventCode, { rating: feedbackRating, comment: feedbackText });\r\n"
    "      setFeedbackSubmitted(true);\r\n"
    "      setTimeout(() => { setShowFeedbackModal(false); setFeedbackSubmitted(false); setFeedbackRating(0); setFeedbackText(''); }, 2000);\r\n"
    "    } catch (err) { alert('Failed to submit'); }\r\n"
    "  };\r\n"
    "\r\n"
    "  // ── Debrief save ─────────────────────────────────────────────────\r\n"
    "  const handleSaveDebrief = async () => {\r\n"
    "    try {\r\n"
    "      await saveDebrief(currentEventCode, { ...debriefData, eventName: eventConfig?.eventName, eventDate: eventConfig?.eventDate });\r\n"
    "      setDebriefSaved(true);\r\n"
    "      setTimeout(() => setDebriefSaved(false), 3000);\r\n"
    "    } catch (err) { alert('Failed to save'); }\r\n"
    "  };\r\n"
    "\r\n"
    "  // ── Auto-save games to library ───────────────────────────────────\r\n"
    "  const autoSaveGamesToLibrary = async (stationsObj, eCode, eName) => {\r\n"
    "    if (!stationsObj) return;\r\n"
    "    const entries = [\r\n"
    "      ['station_1','station'],['station_2','station'],['station_3','station'],['station_4','station'],\r\n"
    "      ['big_game','big_game'],['reflection','reflection'],\r\n"
    "    ];\r\n"
    "    for (const [key, type] of entries) {\r\n"
    "      const s = stationsObj[key];\r\n"
    "      if (!s?.name?.trim()) continue;\r\n"
    "      const gId = s.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');\r\n"
    "      if (gId) await upsertGame(gId, { name:s.name, type, location:s.location||'', howToPlay:s.howToPlay||'', lesson:s.lesson||'', eventCode:eCode, eventName:eName }).catch(()=>{});\r\n"
    "    }\r\n"
    "  };\r\n"
    "\r\n"
    "  // Create New Event Handler\r\n"
    "  const handleCreateEvent = async (e) => {"
)
if create_anchor in src and 'handleTimerStart' not in src:
    src = src.replace(create_anchor, new_handlers, 1)
    print("✓ Added all handler functions")
elif 'handleTimerStart' in src:
    print("~ handlers already patched")
else:
    print("✗ handleCreateEvent anchor not found")

# ─── 6. CALL autoSaveGamesToLibrary in handleCreateEvent ─────────────────────
games_save_anchor = "        await generateAndSaveServiceSchedule(code, configData, wizardAttending, globalServants);\r\n"
games_save_new = (
    "        await generateAndSaveServiceSchedule(code, configData, wizardAttending, globalServants);\r\n"
    "        autoSaveGamesToLibrary(configData.stations, code, configData.eventName).catch(()=>{});\r\n"
)
if games_save_anchor in src and 'autoSaveGamesToLibrary(configData.stations' not in src:
    src = src.replace(games_save_anchor, games_save_new, 1)
    print("✓ Added auto-save games on event create")
elif 'autoSaveGamesToLibrary(configData.stations' in src:
    print("~ games auto-save already patched")
else:
    print("✗ generateAndSaveServiceSchedule anchor not found in create handler")

# ─── 7. ROLE-FILTERED TABS ────────────────────────────────────────────────────
old_tabs = (
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
)
new_tabs = (
    "  const getActiveTabs = () => {\r\n"
    "    if (!currentUser) return [];\r\n"
    "    const role = currentUser.role || 'volunteer';\r\n"
    "    const isAdmin = role === 'admin' || role === 'coordinator';\r\n"
    "    const isLeader = role === 'leader';\r\n"
    "    const isReferee = role === 'referee';\r\n"
    "    const unread = announcements.filter(a => !lastSeenFeedTimestamp || new Date(a.timestamp || a.createdAt || 0) > new Date(lastSeenFeedTimestamp)).length;\r\n"
    "\r\n"
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
    "\r\n"
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
if old_tabs in src and 'isReferee' not in src:
    src = src.replace(old_tabs, new_tabs, 1)
    print("✓ Role-filtered tabs applied")
elif 'isReferee' in src:
    print("~ tabs already patched")
else:
    print("✗ getActiveTabs not found with exact match")

with open('src/App.jsx', 'wb') as f:
    f.write(src.encode('utf-8'))

print("\n=== Phase 3b patch complete ===")
