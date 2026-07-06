import React from 'react';
import { Settings, Plus, Minus, Calendar, Clock3, AlertCircle } from 'lucide-react';
import ScheduleBuilder from './ScheduleBuilder';
import DynamicConfigurator from './DynamicConfigurator';

export default function SettingsTab({
  currentUser,
  isDarkMode,
  settingsSubTab,
  eventConfig,
  serviceRequests,
  savingEventConfig,
  currentEventCode,
  campState,
  campData,
  editKidCount,
  editDaysCount,
  editTeamRed,
  editTeamWhite,
  editTeamBlack,
  editTeamBlue,
  editStations,
  editBigGameName,
  editBigGameLocation,
  editReflectionName,
  editReflectionLocation,
  editDefaultMatchupSortMode,
  editEventConfig,
  globalServants,
  editAttending,
  editRoles,
  quickServantName,
  quickServantPasscode,
  quickServantLoading,

  isOfflineMode,
  side1Name,
  side2Name,
  rosterEditMode,
  editRoster,
  savingRoster,
  settingsRequestFilter,
  settingsRequestSearch,
  expandedRequests,
  isMobile,
  announcements,
  auditLogFilter,
  expandedBlocks,
  expandedGames,
  uniqueGames,
  showOnboardingTip,
  setShowServantDirectoryModal,
  setShowGamesLibraryModal,
  setShowQRModal,
  setShowBackupModal,
  setShowDebriefModal,
  handleTimerStart,
  setIsDarkMode,
  setSettingsSubTab,
  updateEventConfig,
  setEventConfig,
  setEditEventConfig,
  handleUpdateCampState,
  updateScheduleMatchupTimes,
  handleAutoSaveRosterData,
  setEditAttending,
  setEditRoles,
  setQuickServantName,
  setQuickServantPasscode,
  handleQuickAddServant,

  setIsOfflineMode,
  handleAdjustTokens,
  handleOpenRosterEdit,
  handleRosterEntryChange,
  handleRemoveRosterEntry,
  handleAddRosterEntry,
  handleSaveRoster,
  setRosterEditMode,
  handleSaveEventConfig,
  handleLeaveEvent,
  setAuditLogFilter,
  setSettingsRequestFilter,
  setSettingsRequestSearch,
  setExpandedRequests,
  setNewEventName,
  setNewEventCode,
  setNewEventDate,
  setNewEventType,
  setNewKidCount,
  setNewServiceBrief,
  setShowCreateEvent,
  setCreationStep,
  setCurrentEventCode,
  playChime,
  handleSaveAndRegenerateSchedule,
  updateServant,
  handleLiveAutoAssign,
  getTeamColorHex,
  seedJuly6Service
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '4px' }}>
        {[
          ['&#128101; Servants', 'Roster & Dir', () => setShowServantDirectoryModal(true), '#60a5fa'],
          ['&#127918; Games', 'Library', () => setShowGamesLibraryModal(true), '#a78bfa'],
          ['&#128247; QR Check-in', 'Self check-in', () => setShowQRModal(true), '#4ade80'],
          ['&#128190; Backup', 'Offline sync', () => setShowBackupModal(true), '#10b981'],
          ['&#128203; Debrief', 'Post-service', () => setShowDebriefModal(true), '#fbbf24'],
          ['&#9200; Timer', 'Rotation clock', () => handleTimerStart(), '#f97316'],
          [isDarkMode ? '&#9728; Light' : '&#9790; Dark', isDarkMode ? 'Switch to light' : 'Switch to dark', () => setIsDarkMode(!isDarkMode), '#94a3b8'],
        ].map(([title, sub, action, color]) => (
          <button key={title} onClick={action} style={{ padding: '14px 10px', borderRadius: '14px', border: `1px solid ${color}33`, background: `${color}0f`, color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color }} dangerouslySetInnerHTML={{ __html: title }} />
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{sub}</div>
          </button>
        ))}
      </div>
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
          {eventConfig.eventType === 'service' ? '⚙️ Service Setup' : eventConfig.eventType === 'camp' ? '⚙️ Camp Setup' : '⚙️ Setup'}
        </button>
        <button 
          className={`toggle-btn ${settingsSubTab === 'builder' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          onClick={() => setSettingsSubTab('builder')}
        >
          📅 Schedule Builder
        </button>
        <button 
          className={`toggle-btn ${settingsSubTab === 'logs' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          onClick={() => setSettingsSubTab('logs')}
        >
          📜 Audit Logs
        </button>
        <button 
          className={`toggle-btn ${settingsSubTab === 'requests' ? 'active' : ''}`}
          style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          onClick={() => setSettingsSubTab('requests')}
        >
          ⛪ Service Requests {serviceRequests.filter(r => r.status === 'pending').length > 0 && `(${serviceRequests.filter(r => r.status === 'pending').length})`}
        </button>
      </div>

      {settingsSubTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ── Event Settings Group ── */}
          <div className="settings-section">
            <div className="settings-section-header"><h4>⚙️ Event Settings</h4></div>

            {/* Event Mode Switcher Card */}
            <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.03)' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: '800', marginBottom: '8px' }}>🛡️ Active Event Mode</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Current mode: <strong>{eventConfig.eventType === 'service' ? '⛪ Church Service Mode' : eventConfig.eventType === 'normal' ? '🏀 Normal Mode' : '🏕️ Summer Camp Mode'}</strong>
                </p>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (eventConfig.eventType === 'normal') return;
                      if (window.confirm("Switch to Normal Mode?")) {
                        await updateEventConfig(currentEventCode, { eventType: 'normal' });
                        setEventConfig(prev => ({ ...prev, eventType: 'normal' }));
                        setEditEventConfig(prev => ({ ...prev, eventType: 'normal' }));
                        alert("Switched to Normal Mode!");
                      }
                    }}
                    disabled={savingEventConfig}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: eventConfig.eventType === 'normal' ? 'var(--gradient-vbt)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-light)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    🏀 Normal
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      if (eventConfig.eventType === 'service') return;
                      if (eventConfig.daysCount > 1) {
                        alert("Service Mode is only supported for 1-day events. Set Day Count to 1 first.");
                        return;
                      }
                      if (window.confirm("Switch to Service Mode?")) {
                        const updates = { eventType: 'service' };
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
                        await updateEventConfig(currentEventCode, updates);
                        setEventConfig(prev => ({ ...prev, ...updates }));
                        setEditEventConfig(prev => ({ ...prev, ...updates }));
                        alert("Switched to Service Mode!");
                      }
                    }}
                    disabled={savingEventConfig}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: eventConfig.eventType === 'service' ? 'var(--gradient-vbt)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-light)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    ⛪ Service
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      if (eventConfig.eventType === 'camp') return;
                      if (window.confirm("Switch to Camp Mode?")) {
                        await updateEventConfig(currentEventCode, { eventType: 'camp' });
                        setEventConfig(prev => ({ ...prev, eventType: 'camp' }));
                        setEditEventConfig(prev => ({ ...prev, eventType: 'camp' }));
                        alert("Switched to Camp Mode!");
                      }
                    }}
                    disabled={savingEventConfig}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: eventConfig.eventType === 'camp' ? 'var(--gradient-vbt)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-light)',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    🏕️ Camp
                  </button>
                </div>
              </div>
            </div>

            {eventConfig.eventType === 'service' && (
              <div className="glass-panel" style={{ padding: '16px', marginTop: '12px', border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.03)' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', color: '#a78bfa', fontWeight: '800', marginBottom: '8px' }}>🔄 Game Engine Type</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Current engine: <strong>{eventConfig.gameEngineType || 'Team vs Team'}</strong>
                  </p>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (eventConfig.gameEngineType === 'Team vs Team' || !eventConfig.gameEngineType) return;
                        if (window.confirm("Switch to Team vs Team engine?")) {
                          await updateEventConfig(currentEventCode, { gameEngineType: 'Team vs Team' });
                          setEventConfig(prev => ({ ...prev, gameEngineType: 'Team vs Team' }));
                          setEditEventConfig(prev => ({ ...prev, gameEngineType: 'Team vs Team' }));
                          alert("Switched to Team vs Team engine!");
                        }
                      }}
                      disabled={savingEventConfig}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: (eventConfig.gameEngineType === 'Team vs Team' || !eventConfig.gameEngineType) ? 'var(--gradient-vbt)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-light)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      🤜🤛 Team vs Team
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        if (eventConfig.gameEngineType === 'Shuffle') return;
                        if (window.confirm("Switch to Shuffle engine (Solo Rotations)?")) {
                          const updates = { 
                            gameEngineType: 'Shuffle',
                            stations: {
                              ...eventConfig.stations,
                              station_5: eventConfig.stations?.station_5 || { name: 'Whiffle Ball', location: 'Station 5', howToPlay: '', lesson: '' },
                              station_6: eventConfig.stations?.station_6 || { name: 'Blind Shape', location: 'Station 6', howToPlay: '', lesson: '' }
                            }
                          };
                          await updateEventConfig(currentEventCode, updates);
                          setEventConfig(prev => ({ ...prev, ...updates }));
                          setEditEventConfig(prev => ({ ...prev, ...updates }));
                          alert("Switched to Shuffle engine!");
                        }
                      }}
                      disabled={savingEventConfig}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: eventConfig.gameEngineType === 'Shuffle' ? 'var(--gradient-vbt)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-light)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      🔄 Shuffle Mode
                    </button>
                  </div>
                </div>
              </div>
            )}

            {eventConfig.eventType === 'service' && seedJuly6Service && (
              <div className="glass-panel" style={{ padding: '16px', marginTop: '12px', border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.03)' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#4ade80', fontWeight: '800', marginBottom: '8px' }}>🚀 VBT Service Quick Setup</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Seed today's real roles, game details, and timings into this event automatically.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm("This will overwrite the current roles and schedule with today's official July 6th Ard el Golf details. Proceed?")) {
                      await seedJuly6Service();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#4ade80',
                    color: '#000',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  🚀 Setup July 6th Service Data (AI)
                </button>
              </div>
            )}

            <DynamicConfigurator
              eventConfig={eventConfig}
              campState={campState}
              onSaveConfig={async (updates) => {
                try {
                  const { timeShiftMinutes, ...configUpdates } = updates;
                  await updateEventConfig(currentEventCode, configUpdates);
                  
                  if (timeShiftMinutes !== undefined && timeShiftMinutes !== campState.timeShiftMinutes) {
                    await handleUpdateCampState({ timeShiftMinutes: Number(timeShiftMinutes) || 0 });
                  }
                  
                  if (eventConfig.eventType === 'service') {
                    await updateScheduleMatchupTimes(
                      currentEventCode, 
                      configUpdates.startTime || '15:00', 
                      Number(configUpdates.roundDurationMinutes) || 20, 
                      Number(configUpdates.breakMinutes) || 5
                    );
                  }
                  alert("✨ Configuration and schedule times updated successfully!");
                } catch (err) {
                  alert("Failed to save configuration: " + err.message);
                }
              }}
              campData={campData}
            />
          </div>

          {/* ── System Maintenance Group ── */}
          <div className="settings-section">
            <div className="settings-section-header"><h4>🧹 System Maintenance</h4></div>

            {/* 🧹 Force Cache Clear Card */}
            <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.03)' }}>
              <h3 style={{ fontSize: '0.9rem', color: '#f87171', fontWeight: '800', marginBottom: '4px' }}>🧹 System Maintenance & Cache Clear</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                If you made code changes or updates and want to force everyone currently logged in on their phones to reload, clear their cache, and receive the latest updates, click below.
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to force a cache clear and reload for all active signed-in clients?")) {
                    try {
                      const nextVer = (eventConfig.clearCacheVersion || 0) + 1;
                      await updateEventConfig(currentEventCode, { clearCacheVersion: nextVer });
                      alert("Cache clear command successfully sent! All active signed-in clients will automatically clear their cache and reload shortly.");
                    } catch (err) {
                      alert("Error sending cache clear command: " + err.message);
                    }
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                🧹 Force Cache Clear & Reload All Clients
              </button>
            </div>
          </div>

          {/* ── Team & Schedule Settings Group ── */}
          <div className="settings-section">
            <div className="settings-section-header"><h4>👥 Team &amp; Schedule Settings</h4></div>

            {eventConfig.eventType !== 'normal' ? (
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

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                      <h4 style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎨 Rename Teams</h4>
                      <div className="config-grid-teams" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ef4444', marginBottom: '8px', fontWeight: '700' }}>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                            Red Team
                          </label>
                          <input type="text" value={editTeamRed} onChange={(e) => setEditTeamRed(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ffffff', marginBottom: '8px', fontWeight: '700' }}>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffffff', border: '1px solid #ccc' }}></span>
                            White Team
                          </label>
                          <input type="text" value={editTeamWhite} onChange={(e) => setEditTeamWhite(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', fontWeight: '700' }}>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1e293b', border: '1px solid #94a3b8' }}></span>
                            Black Team
                          </label>
                          <input type="text" value={editTeamBlack} onChange={(e) => setEditTeamBlack(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }} />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#38bdf8', marginBottom: '8px', fontWeight: '700' }}>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#38bdf8' }}></span>
                            Blue Team
                          </label>
                          <input type="text" value={editTeamBlue} onChange={(e) => setEditTeamBlue(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }} />
                        </div>
                      </div>
                    </div>

                    {/* Rename Stations & Games Panel */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: '700', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏁 Rename Games & Locations</h4>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>Change station names, locations, Big Game, and Reflection details.</p>
                      
                      {(() => {
                        const stationKeys = eventConfig.gameEngineType === 'Shuffle'
                          ? ['station_1', 'station_2', 'station_3', 'station_4', 'station_5', 'station_6']
                          : ['station_1', 'station_2', 'station_3', 'station_4'];
                        return stationKeys.map((stKey, idx) => {
                          const st = editStations[stKey] || { name: '', location: '' };
                        return (
                          <div key={stKey} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', color: '#c4b5fd', marginBottom: '4px', fontWeight: '700' }}>Station {idx + 1} Name</label>
                              <input 
                                type="text" 
                                value={st.name || ''} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditStations(prev => ({
                                    ...prev,
                                    [stKey]: { ...prev[stKey], name: val }
                                  }));
                                }} 
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }} 
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.65rem', color: '#c4b5fd', marginBottom: '4px', fontWeight: '700' }}>Station {idx + 1} Location</label>
                              <input 
                                type="text" 
                                value={st.location || ''} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditStations(prev => ({
                                    ...prev,
                                    [stKey]: { ...prev[stKey], location: val }
                                  }));
                                }} 
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }} 
                              />
                            </div>
                          </div>
                        );
                      });
                      })()}

                      {/* Big Game Renaming */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#f59e0b', marginBottom: '4px', fontWeight: '700' }}>Big Game Name</label>
                          <input 
                            type="text" 
                            value={editBigGameName || ''} 
                            onChange={(e) => setEditBigGameName(e.target.value)} 
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#f59e0b', marginBottom: '4px', fontWeight: '700' }}>Big Game Location</label>
                          <input 
                            type="text" 
                            value={editBigGameLocation || ''} 
                            onChange={(e) => setEditBigGameLocation(e.target.value)} 
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }} 
                          />
                        </div>
                      </div>

                      {/* Reflection Renaming */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#10b981', marginBottom: '4px', fontWeight: '700' }}>Reflection Name</label>
                          <input 
                            type="text" 
                            value={editReflectionName || ''} 
                            onChange={(e) => setEditReflectionName(e.target.value)} 
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }} 
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.65rem', color: '#10b981', marginBottom: '4px', fontWeight: '700' }}>Reflection Location</label>
                          <input 
                            type="text" 
                            value={editReflectionLocation || ''} 
                            onChange={(e) => setEditReflectionLocation(e.target.value)} 
                            style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.8rem', outline: 'none' }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Default Sort Mode and Randomize Schedule Pairings Settings */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ color: '#ffffff', fontSize: '0.82rem', fontWeight: '700', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔀 Matchup & Pairing Settings</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '700' }}>Default Matchup Display Order</label>
                          <select 
                            value={editDefaultMatchupSortMode}
                            onChange={(e) => setEditDefaultMatchupSortMode(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#ffffff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="block">Chronological Block Order (Block/Round)</option>
                            <option value="game">Grouped Game Order (Game/Station)</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                          <input
                            type="checkbox"
                            id="randomizeMatchups"
                            checked={!!(editEventConfig && editEventConfig.randomizeMatchups)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setEditEventConfig(prev => ({ ...prev, randomizeMatchups: checked }));
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <label htmlFor="randomizeMatchups" style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}>
                            🔀 Randomize Matchup Pairings (Rotational Rounds)
                          </label>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem' }}>👥</div>
                      <h4 style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: '700', margin: 0 }}>Roster & Dir</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        Roster check-ins, servant roles, and UI mode options have been moved to the fullscreen Servants tab for a wider and taller screen interface, resolving nested scroll bugs.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowServantDirectoryModal(true)}
                        className="btn-glow"
                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--gradient-vbt)', color: '#ffffff', fontFamily: 'var(--font-title)', fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        👥 Open Servants & Roster Manager
                      </button>
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
            ) : null}

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
          </div>

          {/* ── Tokens Group ── */}
          <div className="settings-section">
            <div className="settings-section-header"><h4>🎫 Camp Tokens</h4></div>

            {(currentUser.role === 'admin' || currentUser.role === 'leader' || currentUser.role === 'referee') && (
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: '8px' }}>Camp Tokens (+2 pts each)</h3>
                
                {eventConfig.eventType !== 'normal' ? (
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
          </div>

          {/* ── Danger Zone Group ── */}
          <div className="settings-section">
            <div className="settings-section-header"><h4>🚨 Danger Zone</h4></div>

            {currentUser.role === 'admin' && (
              <div className="glass-panel danger-card" style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
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
          </div>
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

      {settingsSubTab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '16px', border: '1px solid rgba(41, 182, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '1rem', color: '#38bdf8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                📜 Chronological Audit Logs
              </h3>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['All', 'score', 'deduction', 'system'].map((typeOption) => (
                  <button
                    key={typeOption}
                    type="button"
                    onClick={() => setAuditLogFilter(typeOption)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: auditLogFilter === typeOption ? 'var(--vbt-blue)' : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid ' + (auditLogFilter === typeOption ? 'var(--vbt-sky)' : 'rgba(255, 255, 255, 0.1)'),
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {typeOption}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {(() => {
                const filteredLogs = announcements.filter(log => {
                  if (auditLogFilter === 'All') {
                    return ['score', 'deduction', 'system'].includes(log.type);
                  }
                  return log.type === auditLogFilter;
                }).sort((a, b) => {
                  const timeA = a.timestamp ? (a.timestamp.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime()) : 0;
                  const timeB = b.timestamp ? (b.timestamp.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime()) : 0;
                  return timeB - timeA; // newest first
                });

                if (filteredLogs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No logs found matching filter: {auditLogFilter}
                    </div>
                  );
                }

                return filteredLogs.map((log) => {
                  const logTime = log.timestamp ? (log.timestamp.seconds ? new Date(log.timestamp.seconds * 1000) : new Date(log.timestamp)) : new Date();
                  const timeStr = logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + logTime.toLocaleDateString();
                  
                  let badgeColor = '#94a3b8';
                  if (log.type === 'score') badgeColor = '#22c55e';
                  if (log.type === 'deduction') badgeColor = '#ef4444';
                  if (log.type === 'system') badgeColor = '#38bdf8';

                  return (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: `${badgeColor}22`,
                          border: `1px solid ${badgeColor}44`,
                          color: badgeColor,
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}>
                          {log.type}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {timeStr}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', lineHeight: '1.4' }}>
                        {log.text}
                      </p>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        By: <strong>{log.sender}</strong> ({log.senderRole || 'unknown'})
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {settingsSubTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'rgba(167, 139, 250, 0.1)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            borderRadius: '12px',
            padding: '14px',
            color: '#e2e8f0',
            fontSize: '0.85rem',
            lineHeight: '1.5'
          }}>
            <h3 style={{ color: '#c4b5fd', fontWeight: '800', margin: '0 0 6px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⛪ Service Requests Manager
            </h3>
            <p style={{ margin: 0 }}>
              View and manage service outreach requests submitted by churches. You can approve or reject requests, and instantly generate/pre-fill a new event from any request!
            </p>
          </div>

          {/* Filter and Search controls */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status filter toggle */}
            <div className="toggle-group" style={{ 
              display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)'
            }}>
              {['All', 'pending', 'approved', 'rejected'].map(filterVal => (
                <button
                  key={filterVal}
                  className={`toggle-btn ${settingsRequestFilter === filterVal ? 'active' : ''}`}
                  onClick={() => setSettingsRequestFilter(filterVal)}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: 'none', cursor: 'pointer', textTransform: 'capitalize' }}
                >
                  {filterVal}
                </button>
              ))}
            </div>

            {/* Search input */}
            <input
              type="text"
              placeholder="Search by Church or Contact..."
              value={settingsRequestSearch}
              onChange={(e) => setSettingsRequestSearch(e.target.value)}
              style={{
                flex: 1, minWidth: '180px', padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)',
                color: '#ffffff', fontSize: '0.8rem', outline: 'none'
              }}
            />
          </div>

          {/* Requests list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const filtered = serviceRequests.filter(req => {
                // Filter by status
                if (settingsRequestFilter !== 'All' && req.status !== settingsRequestFilter) return false;
                // Filter by search
                if (settingsRequestSearch.trim()) {
                  const searchLower = settingsRequestSearch.toLowerCase();
                  const matchChurch = (req.churchName || '').toLowerCase().includes(searchLower);
                  const matchContact = (req.contactName || '').toLowerCase().includes(searchLower);
                  return matchChurch || matchContact;
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border-light)' }}>
                    <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '8px' }}>📭</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No service requests found.</span>
                  </div>
                );
              }

              return filtered.map(req => {
                const isExpanded = !!expandedRequests[req.id];
                const statusColors = {
                  pending: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', label: 'Pending' },
                  approved: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', text: '#4ade80', label: 'Approved' },
                  rejected: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171', label: 'Rejected' }
                };
                const statusStyle = statusColors[req.status] || statusColors.pending;

                return (
                  <div
                    key={req.id}
                    className="glass-panel"
                    style={{
                      padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                      transition: 'all 0.2s', border: isExpanded ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid var(--border-light)',
                      position: 'relative'
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <h4 style={{ fontSize: '0.95rem', color: '#ffffff', margin: 0, fontWeight: '800' }}>
                          {req.churchName || 'Unnamed Request'}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          👤 {req.contactName || 'No contact'} | 📞 {req.contactNumber || 'No phone'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700',
                          background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.text
                        }}>
                          {statusStyle.label}
                        </span>
                        <button
                          onClick={() => setExpandedRequests(prev => ({ ...prev, [req.id]: !isExpanded }))}
                          style={{
                            background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer',
                            fontSize: '0.9rem', display: 'flex', alignItems: 'center', padding: '4px'
                          }}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Preview Details */}
                    {!isExpanded && (
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>📅 Date: <strong>{req.serviceDate || 'Not set'}</strong></span>
                        <span>⛪ Location: <strong>{req.serviceLocation || 'Not set'}</strong></span>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '12px',
                        padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                        fontSize: '0.8rem', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.03)'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                          <div>📅 <strong>Date & Time:</strong> {req.serviceDate || 'Pending'} ({req.serviceStartTime || '?'}-{req.serviceEndTime || '?'})</div>
                          <div>📍 <strong>Location:</strong> {req.serviceLocation || 'Pending'}</div>
                          <div>👥 <strong>Gender Grp:</strong> {req.targetGender || 'Mix'}</div>
                          <div>🎂 <strong>Age/Grade:</strong> {req.targetAgeGrade || 'Not specified'}</div>
                          <div>🔢 <strong>Est. Kids:</strong> {req.participantsCount || 'Not specified'}</div>
                          <div>🛡️ <strong>Teams Split:</strong> {req.alreadySplitTeams === 'yes' ? `Yes (${req.teamsCount || '?'} teams)` : 'No'}</div>
                          <div>👨‍🏫 <strong>Servants Need:</strong> {req.needSpecificServantsCount === 'yes' ? `Yes (${req.servantsCount || '?'} servants)` : 'No'}</div>
                          <div>🤝 <strong>Servants Helping VBT:</strong> {req.servantsAvailableHelping || 'yes'}</div>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                          📖 <strong>Topic or Theme:</strong>
                          <p style={{ margin: '4px 0 0 0', lineHeight: '1.5', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                            {req.serviceTopic || 'None specified.'}
                          </p>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                          Submitted: {req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this service request?")) {
                            deleteServiceRequest(req.id);
                          }
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'transparent', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer'
                        }}
                      >
                        🗑️ Delete
                      </button>

                      {req.status !== 'rejected' && (
                        <button
                          onClick={() => updateServiceRequestStatus(req.id, 'rejected')}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >
                          ✕ Reject
                        </button>
                      )}

                      {req.status !== 'approved' && (
                        <button
                          onClick={() => updateServiceRequestStatus(req.id, 'approved')}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: 'none',
                            background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '0.75rem', cursor: 'pointer'
                          }}
                        >
                          ✓ Approve
                        </button>
                      )}

                      <button
                        onClick={() => {
                          // Approve if not already approved
                          if (req.status !== 'approved') {
                            updateServiceRequestStatus(req.id, 'approved');
                          }
                          // Pre-fill create event wizard
                          setNewEventName(req.churchName || '');
                          const suggestedCode = (req.churchName || '')
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '_')
                            .substring(0, 15) + '_' + Math.floor(Math.random() * 1000);
                          setNewEventCode(suggestedCode);
                          setNewEventDate(req.serviceDate || '');
                          setNewEventType('service');
                          
                          const countInt = parseInt(req.participantsCount) || 100;
                          setNewKidCount(countInt);

                          setNewServiceBrief(`Location: ${req.serviceLocation || ''}\nTime: ${req.serviceStartTime || ''} - ${req.serviceEndTime || ''}\nTopic: ${req.serviceTopic || ''}\nTarget Group: ${req.targetGender || ''} | ${req.targetAgeGrade || ''} | ${req.participantsCount || ''} kids\nContact: ${req.contactName || ''} (${req.contactNumber || ''})`);
                          
                          setShowCreateEvent(true);
                          setCreationStep(1); // Step 1 of the wizard
                          
                          // Close more drawer and deselect event code to trigger landing page
                          setShowMoreDrawer(false);
                          setCurrentEventCode(null);
                          localStorage.removeItem('vbt_current_event');
                        }}
                        className="btn-glow"
                        style={{
                          padding: '6px 14px', borderRadius: '8px', border: 'none',
                          background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', color: '#ffffff',
                          fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
                        }}
                      >
                        ⚡ Create Event
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
