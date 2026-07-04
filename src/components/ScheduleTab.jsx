import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, MapPin, Clock, Clock3 } from 'lucide-react';
import ScheduleExporter from './ScheduleExporter';

// Localized Stopwatch & Timer Components to Optimize Render Performance
function MatchupStopwatch({ actualStart, actualEnd }) {
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
  return <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> Scheduled: 30m</span>;
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
      gap: '4px'
    }}>
      <Clock size={12} /> {elapsedMins}:{formattedSecs}
    </span>
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
    return mDay === currentDay;
  });

  return (
    <div className="glass-panel" style={{ padding: '16px', background: 'linear-gradient(180deg, rgba(20, 65, 161, 0.08) 0%, rgba(13, 20, 38, 0.3) 100%)' }}>
      <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline / Schedule Progress</h4>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{Math.round(currentProgress)}% completed</span>
      </div>
      
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px', position: 'relative' }}>
        <div style={{ width: `${currentProgress}%`, height: '100%', background: 'var(--gradient-vbt)', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }} />
      </div>

      {activeSlot ? (
        <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '0.62rem', color: 'var(--vbt-sky)', fontWeight: '700', textTransform: 'uppercase' }}>Active block now</p>
            <p style={{ fontSize: '1rem', fontWeight: '800', color: '#ffffff', margin: '2px 0 4px 0' }}>{activeSlot.game}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{activeSlot.location}</span>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {getEffectiveTimeShift() > 0 ? getShiftedTimeStr(activeSlot.time, getEffectiveTimeShift()) : activeSlot.time}
                </span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ borderRadius: '9999px', background: '#ef4444', color: '#ffffff', border: 'none', fontSize: '0.65rem', padding: '2px 8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block', animation: 'pulse-glow 1.5s infinite' }}>LIVE</span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No active schedule slot running at this moment.</p>
      )}
    </div>
  );
}

export default function ScheduleTab({
  currentUser,
  eventConfig,
  campData,
  campState,
  daysCount,
  scheduleFilter,
  scheduleBlockFilter,
  scheduleTeamFilter,
  scheduleDayFilter,
  scheduleSortMode,
  filteredMatchups,
  isReferee,
  showFullSchedule,
  eventLabels,
  isWhereIsEveryoneCollapsed,
  isRosterCollapsed,
  rosterSearch,
  refereeSelectedGame,
  globalServants,
  liveLocationStatus,
  currentEventCode,
  getTeamColorHex,
  getEffectiveTimeShift,
  getShiftedTimeStr,
  getEventCurrentDay,
  parseTimeToMs,
  getEventTimeRange,
  getActiveSlotProgress,
  isTimeSlotActive,
  canControlStopwatch,
  getRefereeAssignedGame,
  handleToggleTimer,
  handleAdjustTimeShift,
  handleResetTimeShift,
  handleStartMatchupTimer,
  handleStopMatchupTimer,
  handleResetMatchupTimer,
  handleUpdateMatchupScore,
  handleToggleWinner,
  addAnnouncement,
  triggerRemotePushNotification,
  setIsWhereIsEveryoneCollapsed,
  setIsRosterCollapsed,
  setRosterSearch,
  setRefereeSelectedGame,
  setShowFullSchedule,
  setScheduleFilter,
  setScheduleBlockFilter,
  setScheduleTeamFilter,
  setScheduleDayFilter,
  setScheduleSortMode,
  isMobile
}) {
  const currentActiveSlot = liveLocationStatus.find(l => l.activeMatchup)?.activeMatchup;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── MY ASSIGNMENT HERO CARD (referee / leader roles) ── */}
      {currentUser && (currentUser.role === 'referee' || currentUser.role === 'leader') && (() => {
        const roleCode = currentUser.roleCode || eventConfig.servantAssignments?.[currentUser.id];
        let assignmentTitle = '';
        let assignmentDetail = '';
        let assignmentIcon = '📍';

        if (currentUser.role === 'referee') {
          if (roleCode) {
            if (roleCode.startsWith('station_')) {
              const stationNum = roleCode.replace('station_', '');
              const station = eventConfig.stations?.[roleCode];
              assignmentTitle = station?.name || `Station ${stationNum}`;
              assignmentDetail = station?.location ? `📌 ${station.location}` : `Station ${stationNum}`;
              assignmentIcon = '🎯';
            } else if (roleCode.startsWith('big_game_')) {
              assignmentTitle = eventConfig.bigGameName || 'Big Game';
              assignmentDetail = '📌 Main Area';
              assignmentIcon = '🏆';
            } else if (roleCode === 'reflection') {
              assignmentTitle = eventConfig.reflectionName || 'Reflection';
              assignmentDetail = '📌 Reflection Area';
              assignmentIcon = '🙏';
            } else {
              assignmentTitle = 'Assigned by coordinator';
              assignmentDetail = 'Check with your coordinator for your station';
              assignmentIcon = '🎯';
            }
          } else if (currentUser.assignedGames?.length > 0) {
            assignmentTitle = currentUser.assignedGames.join(', ');
            assignmentDetail = 'Your assigned game(s) — find them in the schedule below';
            assignmentIcon = '🎯';
          } else {
            assignmentTitle = 'Check your assignment below';
            assignmentDetail = 'Find your game station in the schedule below';
            assignmentIcon = '🎯';
          }
        } else if (currentUser.role === 'leader') {
          const teams = currentUser.assignedTeams || [];
          if (teams.length > 0) {
            assignmentTitle = teams.map(t => {
              const name = eventConfig.teamNames?.[t.toLowerCase()] || t;
              return name.charAt(0).toUpperCase() + name.slice(1);
            }).join(' & ');
            assignmentDetail = 'Your team(s) to lead today';
            assignmentIcon = '👥';
          } else {
            assignmentTitle = 'Team Leader';
            assignmentDetail = 'Your team assignment will appear here';
            assignmentIcon = '👥';
          }
        }

        return (
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 65, 161, 0.25) 0%, rgba(41, 182, 246, 0.1) 100%)',
            border: '1px solid rgba(41, 182, 246, 0.35)',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(41, 182, 246, 0.12)'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
              background: 'rgba(41, 182, 246, 0.15)',
              border: '1px solid rgba(41, 182, 246, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              {assignmentIcon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#29b6f6', margin: '0 0 3px 0' }}>
                Your Assignment Today
              </p>
              <p style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', margin: '0 0 3px 0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {assignmentTitle}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                {assignmentDetail}
              </p>
            </div>
          </div>
        );
      })()}

      {isReferee && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button
            type="button"
            onClick={() => setShowFullSchedule(!showFullSchedule)}
            className="glass-btn"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(41, 182, 246, 0.3)',
              background: showFullSchedule ? 'rgba(41, 182, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            {showFullSchedule ? '👁️ Hide Full Schedule' : '👁️ Show Full Schedule'}
          </button>
        </div>
      )}

      {(!isReferee || showFullSchedule) && (
        <>
          <ScheduleExporter
            scheduleData={campData}
            campData={campData}
            eventConfig={eventConfig}
            getTeamColorHex={getTeamColorHex}
          />

          <ScheduleTimelineTrackerCard
            campData={campData}
            eventConfig={eventConfig}
            getEffectiveTimeShift={getEffectiveTimeShift}
            getShiftedTimeStr={getShiftedTimeStr}
            getEventCurrentDay={getEventCurrentDay}
            parseTimeToMs={parseTimeToMs}
            getEventTimeRange={getEventTimeRange}
            getActiveSlotProgress={getActiveSlotProgress}
            activeSlot={currentActiveSlot}
            getTeamColorHex={getTeamColorHex}
          />
          {eventConfig.eventType !== 'normal' ? (
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
              display: 'flex', alignItems: 'center',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Matchups & Locations</h2>
            </div>
            <div className="filter-chips">
              {['All', 'Today', 'Tomorrow', 'This Week'].map(f => (
                <button
                  key={f}
                  className={`filter-chip${scheduleFilter === f ? ' active' : ''}`}
                  onClick={() => setScheduleFilter(f)}
                >{f}</button>
              ))}
            </div>
            <div className="schedule-filter-dropdowns" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              
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

              <select 
                value={scheduleSortMode}
                onChange={(e) => setScheduleSortMode(e.target.value)}
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
                <option value="block">Sort: {eventConfig.eventType === 'service' ? 'Shift Order' : 'Block Order'}</option>
                <option value="game">Sort: Game Order</option>
              </select>
            </div>
          </div>

          {/* Schedule Controls (Coordinators & Game Leaders) / Status Banner (Others) */}
          {currentUser && (
            currentUser.role === 'admin' ||
            (eventConfig.eventType === 'service' ? currentUser.role === 'service_day_leader' : currentUser.role === 'referee')
          ) ? (
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
                    <input 
                      type="number"
                      id="customDelayInput"
                      placeholder="Min"
                      style={{
                        width: '45px',
                        padding: '6px 4px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-light)',
                        background: 'rgba(0,0,0,0.4)',
                        color: '#ffffff',
                        fontSize: '0.72rem',
                        outline: 'none',
                        textAlign: 'center',
                        height: '28px',
                        boxSizing: 'border-box'
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val !== 0) {
                            await handleAdjustTimeShift(val);
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                    <button 
                      onClick={async () => {
                        const input = document.getElementById('customDelayInput');
                        const val = parseInt(input?.value, 10);
                        if (!isNaN(val) && val !== 0) {
                          await handleAdjustTimeShift(val);
                          if (input) input.value = '';
                        }
                      }}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-light)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        height: '28px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Apply custom delay shift"
                    >
                      Shift
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
                    <span><strong>On Schedule:</strong> {eventConfig?.eventType === 'camp' ? 'Camp' : 'Service'} is running exactly on time!</span>
                  )}
                </span>
              </div>
              {campState.isTimerPaused && (
                <span style={{ display: 'inline-block', borderRadius: '9999px', background: '#ef4444', color: '#ffffff', border: 'none', fontSize: '0.65rem', padding: '2px 8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PAUSED
                </span>
              )}
            </div>
          )}

          {/* Where is everyone at (Live Location Tracker) */}
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.15)' }}>
            <div 
              onClick={() => setIsWhereIsEveryoneCollapsed(!isWhereIsEveryoneCollapsed)}
              style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isWhereIsEveryoneCollapsed ? '0' : '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: 'var(--vbt-sky)' }} />
                <h3 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '700' }}>Where is everyone at? (Live Tracker)</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="live-dot" style={{ animation: 'pulse-glow 1.5s infinite' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Live Locations</span>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {isWhereIsEveryoneCollapsed ? '▲ Expand' : '▼ Collapse'}
                </span>
              </div>
            </div>
            
            {!isWhereIsEveryoneCollapsed && (
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
                              {eventConfig.eventType === 'service' ? `Rd ${active.round}` : `Block ${active.block} • Rd ${active.round}`}
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
                          <span style={{ color: getTeamColorHex(active.teamA || active.shakes) }}>{active.teamA || active.shakes}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 4px', fontWeight: 'normal' }}>vs</span>
                          <span style={{ color: getTeamColorHex(active.teamB || active.fries) }}>{active.teamB || active.fries}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* 📋 Game Leader Control Panel */}
      {currentUser && (currentUser.role === 'referee' || currentUser.role === 'admin') && (
        <div className="glass-panel animate-fade-in" style={{ 
          padding: '16px', 
          background: 'linear-gradient(135deg, rgba(20, 65, 161, 0.15) 0%, rgba(13, 20, 38, 0.7) 100%)', 
          border: '1px solid rgba(41, 182, 246, 0.4)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(41, 182, 246, 0.15)', width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(41, 182, 246, 0.3)' }}>
                <span style={{ fontSize: '1.2rem' }}>📋</span>
              </div>
              <h3 style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1.2' }}>
                Game Leader<br/>
                <span style={{ color: 'var(--vbt-sky)', fontSize: '0.75rem', fontWeight: '700' }}>Control Panel</span>
              </h3>
            </div>
            <div style={{ background: 'rgba(41, 182, 246, 0.15)', color: '#29b6f6', border: '1px solid rgba(41, 182, 246, 0.4)', fontSize: '0.65rem', padding: '4px 10px', fontWeight: '800', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
               <span style={{width: '6px', height: '6px', background: '#29b6f6', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 8px #29b6f6'}}></span>
               ACTIVE
            </div>
          </div>

          {/* Game Selection Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
              Assigned Game / Station
            </label>
            <select
              value={refereeSelectedGame}
              onChange={(e) => {
                const selectedVal = e.target.value;
                const assignedGame = getRefereeAssignedGame();
                if (selectedVal && assignedGame && selectedVal !== assignedGame) {
                  const proceed = window.confirm(
                    `Warning: Your officially assigned station/game is "${assignedGame}". Are you sure you want to manage "${selectedVal}" instead?`
                  );
                  if (!proceed) return;
                }
                setRefereeSelectedGame(selectedVal);
                localStorage.setItem('vbt_ref_selected_game', selectedVal);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid rgba(41, 182, 246, 0.3)',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              <option value="">-- Select Game --</option>
              {(() => {
                const gameNames = Array.from(new Set(campData.matchups.map(m => m.game).filter(Boolean))).sort();
                return gameNames.map(gName => (
                  <option key={gName} value={gName}>{gName}</option>
                ));
              })()}
            </select>
          </div>

          {/* Matchups list for the selected game */}
          {refereeSelectedGame ? (
            (() => {
              const refMatchups = campData.matchups.filter(m => {
                if (m.game !== refereeSelectedGame) return false;
                if (daysCount > 1) {
                  const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
                  if (scheduleDayFilter !== String(mDay)) return false;
                }
                return true;
              }).sort((a, b) => {
                if (a.block !== b.block) return (a.block || 1) - (b.block || 1);
                return (a.round || 1) - (b.round || 1);
              });

              if (refMatchups.length === 0) {
                return (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    No matchups scheduled for this game on Day {scheduleDayFilter}.
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {refMatchups.map((m, idx) => {
                    const mDay = m.day || (eventConfig.eventType === 'camp' ? ([1, 2, 3].includes(m.block) ? 1 : 2) : 1);
                    const isMatchActive = isTimeSlotActive(m.time, `Block ${m.block}`, mDay);
                    const matchupKey = `${m.block}_${m.round}_${m.game}`;
                    const winner = (campState.blockScores || {})[matchupKey] || 'NA';

                    // Format shift
                    const effectiveShift = getEffectiveTimeShift();
                    const shiftMs = effectiveShift * 60 * 1000;
                    const baseStartMs = parseTimeToMs(m.time);
                    let timeString = m.time;
                    if (baseStartMs > 0 && effectiveShift !== 0) {
                      const date = new Date(baseStartMs + shiftMs);
                      timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          padding: '12px', 
                          background: isMatchActive ? 'rgba(20, 65, 161, 0.2)' : 'rgba(0, 0, 0, 0.25)', 
                          border: '1px solid',
                          borderColor: isMatchActive ? 'var(--vbt-sky)' : 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        {/* Header info */}
                        <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ffffff' }}>
                              {eventConfig.eventType === 'service' ? `Round ${m.round}` : `Round ${m.round} (Block ${m.block})`}
                            </span>
                            {isMatchActive && (
                              <span style={{ 
                                background: 'rgba(74, 222, 128, 0.2)', 
                                color: '#4ade80', 
                                fontSize: '0.6rem', 
                                padding: '1px 5px', 
                                borderRadius: '4px',
                                fontWeight: '800',
                                letterSpacing: '0.05em',
                                border: '1px solid rgba(74, 222, 128, 0.3)'
                              }}>
                                LIVE
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--vbt-sky)', fontWeight: '800', fontFamily: 'monospace' }}>
                            🕒 {timeString}
                          </span>
                        </div>

                        {/* Simple point adjuster logic */}
                        <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                          {/* teamA side */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                            <span style={{ fontSize: '0.7rem', color: getTeamColorHex(m.teamA || m.shakes), fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' }}>
                              {m.teamA || m.shakes}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                onClick={() => handleUpdateMatchupScore(m, 'teamA', -1)}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  color: '#ffffff', fontWeight: '800', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', minWidth: '20px', textAlign: 'center', fontFamily: 'monospace' }}>
                                {m.teamAScore || m.shakesScore || 0}
                              </span>
                              <button
                                onClick={() => handleUpdateMatchupScore(m, 'teamA', 1)}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  color: '#ffffff', fontWeight: '800', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Divider */}
                          <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,0.08)', margin: '0 8px' }} />

                          {/* teamB side */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                            <span style={{ fontSize: '0.7rem', color: getTeamColorHex(m.teamB || m.fries), fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' }}>
                              {m.teamB || m.fries}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <button
                                onClick={() => handleUpdateMatchupScore(m, 'teamB', -1)}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  color: '#ffffff', fontWeight: '800', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', minWidth: '20px', textAlign: 'center', fontFamily: 'monospace' }}>
                                {m.teamBScore || m.friesScore || 0}
                              </span>
                              <button
                                onClick={() => handleUpdateMatchupScore(m, 'teamB', 1)}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%',
                                  color: '#ffffff', fontWeight: '800', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Winner Indicator / Live Timer controls */}
                        <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          {/* Winner badge */}
                          <div>
                            {winner !== 'NA' ? (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontWeight: '800', 
                                color: (winner === 'teamA' || winner === 'Shakes') ? getTeamColorHex(m.teamA || m.shakes) : (winner === 'teamB' || winner === 'Fries') ? getTeamColorHex(m.teamB || m.fries) : 'var(--color-tie)', 
                                textTransform: 'uppercase' 
                              }}>
                                🏆 Winner: {winner === 'TIE' ? 'Tie Match' : (winner === 'teamA' || winner === 'Shakes') ? (m.teamA || m.shakes) : (winner === 'teamB' || winner === 'Fries') ? (m.teamB || m.fries) : winner}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Waiting for scores...
                              </span>
                            )}
                          </div>

                          {/* Timer / Duration tracker */}
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                            <MatchupStopwatch actualStart={m.actualStart} actualEnd={m.actualEnd} />
                          </div>
                        </div>

                        {/* Stopwatch Actions */}
                        {canControlStopwatch(currentUser) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '4px' }}>
                            {!m.actualStart && (
                              <button
                                onClick={() => handleStartMatchupTimer(m)}
                                style={{
                                  flex: 1, padding: '6px', borderRadius: '6px',
                                  color: '#4ade80', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                }}
                              >
                                ▶️ Start Match
                              </button>
                            )}

                            {m.actualStart && !m.actualEnd && (
                              <button
                                onClick={() => handleStopMatchupTimer(m)}
                                style={{
                                  flex: 1, padding: '6px', borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#f87171', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                }}
                              >
                                ⏹️ Stop Match
                              </button>
                            )}

                            {m.actualStart && m.actualEnd && (
                              <button
                                onClick={() => handleResetMatchupTimer(m)}
                                style={{
                                  flex: 1, padding: '6px', borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#ffffff', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                                }}
                              >
                                🔄 Reset Timer
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              Select a game above to manage matchups and scores.
            </div>
          )}
        </div>
      )}

      {(!isReferee || showFullSchedule) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredMatchups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <div className="empty-state-title">No matchups found</div>
              <div className="empty-state-desc">No matchups fit the current filters. Try adjusting your filters or check back later.</div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: isActive ? 'var(--vbt-sky)' : 'var(--text-muted)', fontWeight: '700' }}>
                        {eventConfig.eventType === 'service' ? `RD ${m.round}` : `BLOCK ${m.block} • RD ${m.round}`}
                      </span>
                      {isActive && (
                        <span style={{ display: 'inline-block', borderRadius: '9999px', animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none', padding: '2px 8px', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.05em' }}>
                          LIVE
                        </span>
                      )}
                      {m.actualStart && (
                        <span style={{ fontSize: '0.62rem', color: '#29b6f6', background: 'rgba(41, 182, 246, 0.15)', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', fontFamily: 'monospace' }}>
                          ⏱️ START: {new Date(m.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      )}
                      {m.actualStart && !m.actualEnd && (
                        <span style={{ 
                          fontSize: '0.62rem', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', 
                          padding: '1px 6px', borderRadius: '4px', fontWeight: '700', animation: 'pulse-glow 1.5s infinite',
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          <Clock size={12} /> {Math.floor(Math.max(0, (Date.now() - new Date(m.actualStart).getTime()) / 1000) / 60)}m
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
                      
                      {m.actualStart && m.actualEnd && (() => {
                        const durationSecs = Math.round((new Date(m.actualEnd).getTime() - new Date(m.actualStart).getTime()) / 1000);
                        const splitSecs = durationSecs - 1800;
                        const absSplitSecs = Math.abs(splitSecs);
                        const splitMins = Math.floor(absSplitSecs / 60);
                        const splitSecsRemainder = absSplitSecs % 60;
                        const splitFormatted = `${splitSecs >= 0 ? '+' : '-'}${splitMins}m ${splitSecsRemainder}s`;
                        
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                              Duration: {Math.floor(durationSecs / 60)}m {durationSecs % 60}s
                            </span>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: '800',
                              fontFamily: 'monospace',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: splitSecs > 0 ? 'rgba(239, 68, 68, 0.15)' : splitSecs < 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                              border: splitSecs > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : splitSecs < 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
                              color: splitSecs > 0 ? '#f87171' : splitSecs < 0 ? '#4ade80' : 'var(--text-muted)'
                            }} title="Split time relative to scheduled 30 minutes">
                              🏎️ SPLIT: {splitFormatted}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                        <span style={{ color: 'var(--color-shakes)', fontWeight: '700' }}>{m.teamA || m.shakes}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>vs</span>
                        <span style={{ color: 'var(--color-fries)', fontWeight: '700' }}>{m.teamB || m.fries}</span>
                      </div>
                      {((m.teamAScore !== undefined && m.teamAScore !== null) || (m.teamBScore !== undefined && m.teamBScore !== null) || (m.shakesScore !== undefined && m.shakesScore !== null) || (m.friesScore !== undefined && m.friesScore !== null)) && (
                        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#ffffff', marginTop: '4px', textAlign: 'center', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                          {m.teamAScore !== undefined ? m.teamAScore : m.shakesScore || 0} - {m.teamBScore !== undefined ? m.teamBScore : m.friesScore || 0}
                        </div>
                      )}
                      {winner !== 'NA' && (
                        <p style={{ fontSize: '0.6rem', color: (winner === 'Shakes' || winner === 'teamA') ? 'var(--color-shakes)' : (winner === 'Fries' || winner === 'teamB') ? 'var(--color-fries)' : 'var(--color-tie)', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px' }}>
                          {(winner === 'teamA' || winner === 'Shakes') ? (m.teamA || m.shakes) : (winner === 'teamB' || winner === 'Fries') ? (m.teamB || m.fries) : winner} won
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Individual Matchup Stopwatch Action Panel */}
                  {canControlStopwatch(currentUser) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-light)' }}>
                      {!m.actualStart && (
                        <button
                          onClick={() => handleStartMatchupTimer(m)}
                          style={{
                            flex: 1, padding: '6px 12px', borderRadius: '6px', border: 'none',
                            background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                          }}
                        >
                          ▶️ Start Match
                        </button>
                      )}
                      
                      {m.actualStart && !m.actualEnd && (
                        <button
                          onClick={() => handleStopMatchupTimer(m)}
                          style={{
                            flex: 1, padding: '6px 12px', borderRadius: '6px', border: 'none',
                            background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                          }}
                        >
                          ⏹️ Stop Match
                        </button>
                      )}
                      
                      {m.actualStart && m.actualEnd && (
                        <button
                          onClick={() => handleResetMatchupTimer(m)}
                          style={{
                            padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', fontSize: '0.65rem', fontWeight: '700', cursor: 'pointer'
                          }}
                        >
                          🔄 Reset Timer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Roster & Assignments Section */}
      <div className="glass-panel animate-fade-in" style={{ padding: '16px', background: 'rgba(0,0,0,0.15)', marginTop: '8px' }}>
        <div 
          onClick={() => setIsRosterCollapsed(!isRosterCollapsed)}
          style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isRosterCollapsed ? '0' : '12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} style={{ color: 'var(--vbt-sky)' }} />
            <h3 style={{ fontSize: '0.95rem', color: '#ffffff', fontWeight: '700', margin: 0 }}>👥 Servant Roster & Assignments</h3>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {isRosterCollapsed ? '▲ Expand' : '▼ Collapse'}
          </span>
        </div>

        {!isRosterCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search servants, roles, or stations..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--border-light)',
                color: '#ffffff',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {(() => {
                const activeServants = eventConfig.activeServants || [];
                const rosterList = globalServants
                  .filter(s => activeServants.includes(s.id))
                  .map(s => {
                    const roleCode = eventConfig.servantAssignments?.[s.id] || 'volunteer';
                    let roleName = 'Volunteer / Ref';
                    let locationName = 'General';
                    let teamName = 'None';
                    let colorHex = '#94a3b8';
                    
                    if (roleCode === 'coordinator') {
                      roleName = 'Coordinator';
                      locationName = 'Main Hall / Control';
                      colorHex = '#a855f7';
                    } else if (roleCode === 'service_leader') {
                      roleName = 'Service Day Leader';
                      locationName = 'Main Hall';
                      colorHex = '#ec4899';
                    } else if (roleCode.startsWith('station_')) {
                      const station = eventConfig.stations?.[roleCode];
                      roleName = `${station?.name || roleCode.replace('station_', 'Station ')} Lead`;
                      locationName = station?.location || 'Assigned Station';
                      colorHex = '#f59e0b';
                    } else if (roleCode.startsWith('big_game_')) {
                      roleName = `Big Game Lead (${eventConfig.bigGameName || 'Loyalty'})`;
                      locationName = 'Main Hall';
                      colorHex = '#eab308';
                    } else if (roleCode === 'reflection') {
                      roleName = `Reflection Lead (${eventConfig.reflectionName || 'Reflection'})`;
                      locationName = 'Classrooms';
                      colorHex = '#14b8a6';
                    } else if (roleCode === 'media') {
                      roleName = 'Media Team';
                      locationName = 'Roaming';
                      colorHex = '#3b82f6';
                    } else if (roleCode.startsWith('team_')) {
                      const parts = roleCode.split('_');
                      const color = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
                      const num = parts[2] || '1';
                      const customName = eventConfig.teamNames?.[parts[1]] || color;
                      roleName = `Team Leader (${customName} ${num})`;
                      teamName = `${customName} ${num}`;
                      locationName = 'With Sub-team (Schedule)';
                      colorHex = getTeamColorHex(color);
                    }
                    
                    return { servant: s, roleCode, roleName, locationName, teamName, colorHex };
                  });

                const filteredRoster = rosterList.filter(item => {
                  const searchLower = rosterSearch.toLowerCase();
                  return (
                    item.servant.name.toLowerCase().includes(searchLower) ||
                    item.roleName.toLowerCase().includes(searchLower) ||
                    item.locationName.toLowerCase().includes(searchLower) ||
                    item.teamName.toLowerCase().includes(searchLower)
                  );
                });

                if (filteredRoster.length === 0) {
                  return (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No assignments found matching "{rosterSearch}"
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                    {filteredRoster.map(item => (
                      <div 
                        key={item.servant.id} 
                        style={{ 
                          padding: '10px', 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          borderLeft: `4px solid ${item.colorHex}`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#ffffff' }}>
                            {item.servant.name}
                          </span>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: '800', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: `${item.colorHex}22`,
                            color: item.colorHex,
                            border: `1px solid ${item.colorHex}44`
                          }}>
                            {item.roleName}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          <span>📍 {item.locationName}</span>
                          {item.teamName !== 'None' && (
                            <span style={{ fontWeight: '700', color: getTeamColorHex(item.teamName.split(' ')[0]) }}>
                              👥 {item.teamName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
