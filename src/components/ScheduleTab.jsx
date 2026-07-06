import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, MapPin, Clock, Clock3 } from 'lucide-react';
import ScheduleExporter from './ScheduleExporter';

const FALLBACK_SERVANT_ASSIGNMENTS = {
  // Team Leaders
  'andrew': 'team_red_1',
  'andrew essam': 'team_red_1',
  'sherry': 'team_blue_1',
  'sherry wael': 'team_blue_1',
  'amberto': 'team_red_2',
  'youstina': 'team_blue_2',
  'youssef': 'team_red_3',
  'youssef wael': 'team_red_3',
  'tony': 'team_blue_3',
  'seif': 'team_red_4',
  'seif samer': 'team_red_4',
  'rougy': 'team_blue_4',
  'rougy adel': 'team_blue_4',
  'tony tafaya': 'team_red_5',
  'sandra': 'team_blue_5',
  'sandra wael': 'team_blue_5',
  'kirollos': 'team_red_6',
  'kirollos remon': 'team_red_6',
  'martina': 'team_blue_6',
  'martina rizk': 'team_blue_6',
  
  // Game Leaders / Referees
  'michel remon': 'station_1',
  'micho': 'station_1',
  'emily boshra': 'station_1',
  'emily': 'station_1',
  'macarious': 'station_2',
  'passant': 'station_2',
  'dani': 'reflection',
  'nathalie hazem': 'station_3',
  'nathalie': 'station_3',
  'kiro wagdy': 'station_3',
  'kiro': 'station_3',
  'karim hany': 'station_4',
  'karim': 'station_4',
  'john kamel': 'station_4',
  'john': 'station_4',
  'cinderella': 'station_4',
  'patrick sameh': 'station_4',
  'patrick': 'station_4',
  'andrew nader': 'station_5',
  'jessica nossier': 'station_5',
  'jessica': 'station_5',
  'joice': 'station_5',
  'bassem khella': 'station_6',
  'bassem': 'station_6',
  'sara zaki': 'station_6',
  'sara': 'station_6',
  
  // Other roles
  'michael mitry': 'media',
  'amy ramy': 'equipment',
  'amy': 'equipment',
  'daniel el masry': 'reflection'
};

// Localized Stopwatch & Timer Components to Optimize Render Performance
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

// ── Live Service Countdown Banner ──
function ServiceCountdown({ eventConfig }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Parse service date from description or use today
  const startHour = parseInt((eventConfig.startTime || '20:00').split(':')[0]);
  const startMin = parseInt((eventConfig.startTime || '20:00').split(':')[1] || '0');
  const totalMinutes = (eventConfig.roundDurationMinutes || 10) * 6 + (eventConfig.breakMinutes || 5) * 5;
  
  // Try to extract date from description
  let serviceDate = null;
  const descMatch = (eventConfig.description || '').match(/(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i);
  if (descMatch) {
    const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const day = parseInt(descMatch[1]);
    const month = monthNames.indexOf(descMatch[2].toLowerCase());
    if (month !== -1) {
      serviceDate = new Date(new Date().getFullYear(), month, day, startHour, startMin, 0);
    }
  }
  if (!serviceDate) {
    // Fallback: use today's date
    const today = new Date();
    serviceDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin, 0);
  }

  const startMs = serviceDate.getTime();
  const endMs = startMs + totalMinutes * 60 * 1000;
  const diff = startMs - now;
  const diffEnd = endMs - now;

  const formatCountdown = (ms) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    if (days > 0) return { days, hours, minutes, seconds, label: `${days}d ${hours}h ${minutes}m ${seconds}s` };
    if (hours > 0) return { days: 0, hours, minutes, seconds, label: `${hours}h ${minutes}m ${seconds}s` };
    return { days: 0, hours: 0, minutes, seconds, label: `${minutes}m ${seconds}s` };
  };

  // Service already ended
  if (diffEnd <= 0) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.1))',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '16px', padding: '16px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4ade80' }}>✅ Service Completed!</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Great work everyone! God bless 🙏</div>
      </div>
    );
  }

  // Service is LIVE
  if (diff <= 0 && diffEnd > 0) {
    const cd = formatCountdown(diffEnd);
    const progress = ((now - startMs) / (endMs - startMs)) * 100;
    const currentShift = Math.min(6, Math.floor((now - startMs) / ((eventConfig.roundDurationMinutes || 10) + (eventConfig.breakMinutes || 5)) / 60000) + 1);
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(249, 115, 22, 0.08))',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '16px', padding: '16px', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${progress}%`, background: 'rgba(239, 68, 68, 0.06)',
          transition: 'width 1s linear'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'pulse-glow 1s infinite' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔴 LIVE — Shift {currentShift}/6</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>{Math.round(progress)}% done</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            {[
              { val: cd.hours, lbl: 'HR' },
              { val: cd.minutes, lbl: 'MIN' },
              { val: cd.seconds, lbl: 'SEC' }
            ].map(t => (
              <div key={t.lbl} style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '8px 14px',
                textAlign: 'center', minWidth: '52px', border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', fontFamily: 'monospace', lineHeight: 1 }}>
                  {String(t.val).padStart(2, '0')}
                </div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' }}>{t.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#fca5a5', textAlign: 'center', fontWeight: '600' }}>⏱️ Service ends in {cd.label}</div>
          {/* Progress bar */}
          <div style={{ marginTop: '10px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: '4px', transition: 'width 1s linear' }} />
          </div>
        </div>
      </div>
    );
  }

  // Countdown to start
  const cd = formatCountdown(diff);
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '16px', padding: '16px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        ⏳ Service starts in
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
        {[
          ...(cd.days > 0 ? [{ val: cd.days, lbl: 'DAY' }] : []),
          { val: cd.hours, lbl: 'HR' },
          { val: cd.minutes, lbl: 'MIN' },
          { val: cd.seconds, lbl: 'SEC' }
        ].map(t => (
          <div key={t.lbl} style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '8px 14px',
            textAlign: 'center', minWidth: '52px', border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', fontFamily: 'monospace', lineHeight: 1 }}>
              {String(t.val).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.1em', marginTop: '2px' }}>{t.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#c4b5fd', fontWeight: '600' }}>
        📅 {serviceDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {serviceDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
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
  isMobile,
  setCurrentUser
}) {
  const currentActiveSlot = liveLocationStatus.find(l => l.activeMatchup)?.activeMatchup;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Live Countdown Banner for Service Events ── */}
      {eventConfig.eventType === 'service' && (
        <ServiceCountdown eventConfig={eventConfig} />
      )}

      {/* ── MY ASSIGNMENT HERO CARD (referee / leader roles) ── */}
      {currentUser && (currentUser.role === 'referee' || currentUser.role === 'leader') && (() => {
        const sId = currentUser.id || currentUser.name?.toLowerCase().replace(/[^a-z0-9]/g, '_');
        let roleCode = currentUser.roleCode || eventConfig.servantAssignments?.[sId];
        if (!roleCode && currentUser.name) {
          const normName = currentUser.name.toLowerCase().trim();
          roleCode = FALLBACK_SERVANT_ASSIGNMENTS[normName];
        }
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
              const teamInfo = campData?.teams?.[t];
              const name = teamInfo?.name || eventConfig.teamNames?.[t.toLowerCase()] || t;
              const cleanName = name.replace(/^team_/i, '').replace(/_/g, ' ');
              return cleanName.replace(/\b\w/g, c => c.toUpperCase());
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
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(41, 182, 246, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
            {/* Switch Assignment */}
            {setCurrentUser && (() => {
              const isLeaderRole = currentUser.role === 'leader';
              const isRefRole = currentUser.role === 'referee';
              const options = isLeaderRole
                ? Object.keys(campData?.teams || {}).filter(c => c !== currentUser.teamCode)
                : Object.keys(eventConfig.stations || {}).filter(c => c !== roleCode);
              if (options.length === 0) return null;
              return (
                <div style={{ borderTop: '1px solid rgba(41, 182, 246, 0.15)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <select
                      id="switch-assignment-select"
                      defaultValue=""
                      style={{
                        flex: '1 1 200px', minWidth: '200px', padding: '7px 10px', borderRadius: '8px',
                        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(41, 182, 246, 0.25)',
                        color: '#ffffff', fontSize: '0.75rem', fontWeight: '600', outline: 'none'
                      }}
                    >
                      <option value="" disabled>🔄 Switch to...</option>
                      {options.map(code => {
                        const label = isLeaderRole
                          ? (code || '').replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase())
                          : (eventConfig.stations?.[code]?.name || code.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                        return <option key={code} value={code}>{label}</option>;
                      })}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById('switch-assignment-select');
                        const newCode = sel?.value;
                        if (!newCode) { alert('Please select a new assignment first.'); return; }
                        const label = isLeaderRole
                          ? newCode.replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase())
                          : (eventConfig.stations?.[newCode]?.name || newCode);
                        if (!window.confirm(
                          `⚠️ Switch Assignment\n\nYou are about to switch from "${assignmentTitle}" to "${label}".\n\nThis will change your schedule view and scoring responsibilities.\n\nAre you sure?`
                        )) return;
                        // Build updated user
                        const updatedUser = { ...currentUser };
                        if (isLeaderRole) {
                          updatedUser.teamCode = newCode;
                          updatedUser.assignedTeams = [newCode];
                          setScheduleTeamFilter(newCode);
                        } else if (isRefRole) {
                          updatedUser.roleCode = newCode;
                        }
                        setCurrentUser(updatedUser);
                        try {
                          const evCode = localStorage.getItem('vbt_current_event');
                          if (evCode) localStorage.setItem(`vbt_user_${evCode}`, JSON.stringify(updatedUser));
                        } catch(_) {}
                        sel.value = '';
                      }}
                      style={{
                        flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.4)',
                        background: 'rgba(249, 115, 22, 0.12)', color: '#fb923c',
                        fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer',
                        whiteSpace: 'nowrap', transition: 'all 0.2s'
                      }}
                    >
                      🔄 Switch
                    </button>
                  </div>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', margin: '6px 0 0 0', fontStyle: 'italic' }}>
                    ⚠️ Only switch if coordinated with your service day leader
                  </p>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {(isReferee || (currentUser && currentUser.role === 'leader' && currentUser.teamCode)) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '4px' }}>
          <button
            type="button"
            onClick={() => {
              if (!showFullSchedule) {
                // Require confirmation to view other teams
                if (!window.confirm('Are you sure you want to view other teams\' schedules?')) return;
              }
              const next = !showFullSchedule;
              setShowFullSchedule(next);
              if (!next && currentUser.role === 'leader') {
                // Reset filter back to own team when hiding
                setScheduleTeamFilter(currentUser.teamCode);
              } else if (!next && isReferee) {
                setScheduleTeamFilter('');
              } else if (next) {
                // Clear filter to show all teams
                setScheduleTeamFilter('');
              }
            }}
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
            {showFullSchedule ? '🔒 Show My Schedule Only' : '👁️ Check Other Teams'}
          </button>
        </div>
      )}

      {((!isReferee && !(currentUser && currentUser.role === 'leader' && currentUser.teamCode && eventConfig?.eventType !== 'service')) || showFullSchedule) && (
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
                {eventConfig.eventType === 'service'
                  ? <>Find your group (e.g., <strong>Red 1</strong> or <strong>White 2</strong>) in the matchups below. For each Round, it shows which station you serve at, where it is located, and what time it starts.</>
                  : <>Find your team name (e.g., <strong>Falcons 1</strong> or <strong>Eagles 2</strong>) in the matchups below. For each Round, it shows which station game you play, where it is located, and what time it starts.</>
                }
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
            {eventConfig.eventType === 'camp' && daysCount > 1 && (
              <div className="filter-chips">
                {['All', 'Today', 'Tomorrow', 'This Week'].map(f => (
                  <button
                    key={f}
                    className={`filter-chip${scheduleFilter === f ? ' active' : ''}`}
                    onClick={() => setScheduleFilter(f)}
                  >{f}</button>
                ))}
              </div>
            )}
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
                {Object.keys(campData?.teams || {}).map(code => (
                  <option key={code} value={code}>{(code || '').replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase())}</option>
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
                              {eventConfig.eventType === 'service' ? `Shift ${m.block}` : `Round ${m.round} (Block ${m.block})`}
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
                        {/* Scoring Section - Simple Winner Selection (Win/Lose) */}
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          gap: '10px',
                          background: 'rgba(255, 255, 255, 0.04)', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          border: '1px solid rgba(255,255,255,0.06)' 
                        }}>
                          {/* Display current scores */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: getTeamColorHex(m.teamA || m.shakes) }}>
                              {(m.teamA || m.shakes || '').replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase()) || 'Team A'}
                              <span style={{ marginLeft: '8px', fontSize: '0.95rem', color: '#ffffff', fontFamily: 'monospace' }}>
                                ({m.teamAScore || m.shakesScore || 0} pts)
                              </span>
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700' }}>VS</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: getTeamColorHex(m.teamB || m.fries) }}>
                              <span style={{ marginRight: '8px', fontSize: '0.95rem', color: '#ffffff', fontFamily: 'monospace' }}>
                                ({m.teamBScore || m.friesScore || 0} pts)
                              </span>
                              {(m.teamB || m.fries || '').replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase()) || 'Team B'}
                            </span>
                          </div>

                          {/* Quick selection buttons */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleToggleWinner(m.block, m.round, m.game, 'teamA')}
                              style={{
                                flex: 1,
                                padding: '10px 6px',
                                borderRadius: '8px',
                                background: winner === 'teamA' || winner === 'Shakes' 
                                  ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
                                  : 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid',
                                borderColor: winner === 'teamA' || winner === 'Shakes' ? '#ef4444' : 'rgba(239, 68, 68, 0.25)',
                                color: winner === 'teamA' || winner === 'Shakes' ? '#ffffff' : '#f87171',
                                fontWeight: '800',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: winner === 'teamA' || winner === 'Shakes' ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none'
                              }}
                            >
                              🔴 Red Wins
                            </button>

                            <button
                              onClick={() => handleToggleWinner(m.block, m.round, m.game, 'teamB')}
                              style={{
                                flex: 1,
                                padding: '10px 6px',
                                borderRadius: '8px',
                                background: winner === 'teamB' || winner === 'Fries' 
                                  ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                                  : 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid',
                                borderColor: winner === 'teamB' || winner === 'Fries' ? '#3b82f6' : 'rgba(59, 130, 246, 0.25)',
                                color: winner === 'teamB' || winner === 'Fries' ? '#ffffff' : '#60a5fa',
                                fontWeight: '800',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: winner === 'teamB' || winner === 'Fries' ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
                              }}
                            >
                              🔵 Blue Wins
                            </button>

                            <button
                              onClick={() => handleToggleWinner(m.block, m.round, m.game, 'TIE')}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: winner === 'TIE' || winner === 'Tie'
                                  ? 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)' 
                                  : 'rgba(156, 163, 175, 0.08)',
                                border: '1px solid',
                                borderColor: winner === 'TIE' || winner === 'Tie' ? '#9ca3af' : 'rgba(156, 163, 175, 0.25)',
                                color: winner === 'TIE' || winner === 'Tie' ? '#ffffff' : '#d1d5db',
                                fontWeight: '800',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: winner === 'TIE' || winner === 'Tie' ? '0 0 10px rgba(156, 163, 175, 0.3)' : 'none'
                              }}
                            >
                              🤝 Tie
                            </button>
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
                            <MatchupStopwatch actualStart={m.actualStart} actualEnd={m.actualEnd} scheduledMinutes={eventConfig.roundDurationMinutes || 30} />
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

      {((!isReferee && !(currentUser && currentUser.role === 'leader' && currentUser.teamCode && eventConfig?.eventType !== 'service')) || showFullSchedule) && (
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
                      {(m.teamB || m.fries) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                          <span style={{ color: getTeamColorHex(m.teamA || m.shakes), fontWeight: '700' }}>{(m.teamA || m.shakes || '').replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase())}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>vs</span>
                          <span style={{ color: getTeamColorHex(m.teamB || m.fries), fontWeight: '700' }}>{(m.teamB || m.fries || '').replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase())}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                          <span style={{ color: getTeamColorHex(m.teamA || m.shakes), fontWeight: '700' }}>{(m.teamA || m.shakes || '').replace(/_/g, ' ').replace(/\bteam\b/gi, '').trim().replace(/\b\w/g, c => c.toUpperCase())}</span>
                        </div>
                      )}
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
                    let roleCode = eventConfig.servantAssignments?.[s.id] || 'volunteer';
                    if (roleCode === 'volunteer' && s.name) {
                      const normName = s.name.toLowerCase().trim();
                      if (FALLBACK_SERVANT_ASSIGNMENTS[normName]) {
                        roleCode = FALLBACK_SERVANT_ASSIGNMENTS[normName];
                      }
                    }
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
