import React from 'react';
import { Plus, Minus, MapPin, Clock, Users } from 'lucide-react';

export default function MyTeamTab({
  myTeamInfo,
  currentUser,
  eventConfig,
  campData,
  daysCount,
  currentActiveSlot,
  isMobile,
  getTeamColorHex,
  handleAdjustDeduction,
  getEffectiveTimeShift,
  getShiftedTimeStr,
  isTimeSlotActive
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(20, 65, 161, 0.1) 0%, rgba(13, 20, 38, 0.4) 100%)' }}>
        <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              background: `${getTeamColorHex(currentUser?.side)}22`,
              border: `1px solid ${getTeamColorHex(currentUser?.side)}55`,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {(eventConfig?.teamNames?.[currentUser?.side?.toLowerCase()] || currentUser?.side || '').toUpperCase()}
            </span>
            <h2 style={{ fontSize: '1.75rem', color: '#ffffff', marginTop: '6px' }}>Team {currentUser?.teamCode}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Leaders: {myTeamInfo?.leaders}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Grade: {myTeamInfo?.grade}</p>
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
            onClick={() => handleAdjustDeduction && handleAdjustDeduction(currentUser?.teamCode, 1)}
            disabled={myTeamInfo?.deductions >= 10}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: myTeamInfo?.deductions >= 10 ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(239, 68, 68, 0.3)',
              background: myTeamInfo?.deductions >= 10 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(239, 68, 68, 0.08)',
              color: myTeamInfo?.deductions >= 10 ? 'rgba(255, 255, 255, 0.25)' : '#ef4444',
              fontFamily: 'var(--font-title)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: myTeamInfo?.deductions >= 10 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Plus size={14} /> Add Deduction
          </button>
          <button 
            onClick={() => handleAdjustDeduction && handleAdjustDeduction(currentUser?.teamCode, -1)}
            disabled={myTeamInfo?.deductions <= 0}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: 'rgba(255,255,255,0.05)',
              color: myTeamInfo?.deductions <= 0 ? 'rgba(255, 255, 255, 0.25)' : '#ffffff',
              fontFamily: 'var(--font-title)',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: myTeamInfo?.deductions <= 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              opacity: myTeamInfo?.deductions <= 0 ? 0.5 : 1
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
                <span style={{ display: 'inline-block', borderRadius: '9999px', background: '#ef4444', color: '#ffffff', border: 'none', fontSize: '0.65rem', padding: '2px 8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                    <div className="empty-state">
                      <div className="empty-state-icon">📅</div>
                      <div className="empty-state-title">No activities scheduled</div>
                      <div className="empty-state-desc">No Day {d} activities have been scheduled yet.</div>
                    </div>
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
                            boxShadow: isActive ? 'var(--shadow-glow-side1)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: isActive ? 'var(--vbt-sky)' : 'var(--text-secondary)' }}>
                                {getEffectiveTimeShift() > 0 ? `${getShiftedTimeStr(slot.time, getEffectiveTimeShift())} (+${getEffectiveTimeShift()}m)` : slot.time}
                              </span>
                              {isActive && (
                                <span style={{ display: 'inline-block', borderRadius: '9999px', animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none', padding: '2px 8px', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.05em' }}>
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
        
        <div style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', display: 'grid', gap: '12px' }}>
          {['Red', 'White', 'Black', 'Blue'].map(colorName => {
            const colorHex = getTeamColorHex(colorName);
            const customName = eventConfig?.teamNames?.[colorName.toLowerCase()] || colorName;
            const colorTeams = Object.entries(campData?.teams || {})
              .filter(([_, t]) => t?.side === colorName);

            return (
              <div key={colorName} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '0.75rem', color: colorHex, fontWeight: '700', textTransform: 'uppercase', borderBottom: `1px solid ${colorHex}33`, paddingBottom: '4px' }}>
                  {customName}
                </h4>
                {colorTeams.length === 0 ? (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No teams</p>
                ) : (
                  colorTeams.map(([code, t]) => (
                    <div key={code} style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', borderLeft: `3px solid ${colorHex}` }}>
                      <p style={{ fontWeight: '700', color: '#ffffff', margin: 0 }}>{code} (Grade {t?.grade})</p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', margin: '4px 0 0 0' }}>{t?.leaders}</p>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
