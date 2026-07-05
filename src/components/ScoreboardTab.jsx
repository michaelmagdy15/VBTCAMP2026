import React from 'react';
import { Trophy, MapPin, Clock } from 'lucide-react';

export default function ScoreboardTab({
  eventConfig,
  scoreCalculations,
  campData,
  campState,
  currentUser,
  scoreViewMode,
  expandedBlocks,
  expandedGames,
  uniqueGames,
  side1Name,
  side2Name,
  shakesPercentage,
  friesPercentage,
  getTeamColorHex,
  setScoreViewMode,
  setExpandedBlocks,
  setExpandedGames,
  handleToggleWinner,
  getEffectiveTimeShift,
  getShiftedTimeStr,
  isTimeSlotActive
}) {
  const effectiveViewMode = eventConfig.eventType === 'service' ? 'game' : scoreViewMode;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Standings section rendered inside Scores page only */}
      <div style={{ width: '100%', marginBottom: '8px' }}>
        {eventConfig.eventType !== 'normal' && eventConfig.gameEngineType !== 'Shuffle' ? (
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
        ) : (eventConfig.eventType === 'normal' || eventConfig.gameEngineType === 'Shuffle') ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Leaderboard ({eventConfig.gameEngineType === 'Shuffle' ? 'Shuffle Mode Rotations' : 'Normal Mode'})
              </span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scoreCalculations.sortedTeams.map((teamCode, idx) => {
                const team = campData?.teams?.[teamCode];
                const score = scoreCalculations.finalScores[teamCode] || 0;
                const winsPts = scoreCalculations.wins[teamCode] || 0;
                const ded = scoreCalculations.deductions[teamCode] || 0;
                const tok = scoreCalculations.tokensCount[teamCode] || 0;
                
                return (
                  <div key={teamCode} className="glass-panel" style={{ 
                    padding: '10px 14px', 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: idx === 0 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(13, 20, 38, 0.45)',
                    borderColor: idx === 0 ? '#fbbf24' : 'var(--border-light)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '800', color: idx === 0 ? '#fbbf24' : 'var(--text-secondary)', width: '20px' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                          {teamCode} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({team?.side || 'Service'})</span>
                        </h4>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Games: <strong>{winsPts}</strong> • {eventConfig.gameEngineType === 'Shuffle' && <>Tokens: <strong>{tok}</strong> ({(tok * 2)} pts) • </>}Deductions: <strong style={{ color: ded > 0 ? '#ef4444' : 'var(--text-secondary)' }}>-{ded}</strong>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: idx === 0 ? '#fbbf24' : '#ffffff', fontFamily: 'monospace' }}>
                      {score} pts
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
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  background: (scoreCalculations.winner === 'SIDE1' || scoreCalculations.winner === 'SHAKES' || scoreCalculations.winner === 'Red') ? 'rgba(0, 176, 255, 0.15)' : 'rgba(255, 145, 0, 0.15)',
                  border: (scoreCalculations.winner === 'SIDE1' || scoreCalculations.winner === 'SHAKES' || scoreCalculations.winner === 'Red') ? '1px solid rgba(0, 176, 255, 0.3)' : '1px solid rgba(255, 145, 0, 0.3)',
                  color: (scoreCalculations.winner === 'SIDE1' || scoreCalculations.winner === 'SHAKES' || scoreCalculations.winner === 'Red') ? 'var(--color-side1)' : 'var(--color-side2)'
                }}>
                  {((scoreCalculations.winner === 'SIDE1' || scoreCalculations.winner === 'SHAKES' || scoreCalculations.winner === 'Red') ? side1Name : side2Name).toUpperCase()} LEADING
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-side1)', textTransform: 'uppercase' }}>{side1Name}</p>
                <p style={{ lineHeight: '1', margin: 0 }}>
                  <span className="score-digit" style={(scoreCalculations.winner === 'SIDE1' || scoreCalculations.winner === 'SHAKES' || scoreCalculations.winner === 'Red') ? { textShadow: '0 0 20px rgba(96,165,250,0.5)' } : {}}>{scoreCalculations.shakesFinal}</span>
                </p>
              </div>
              <div style={{ textAlign: 'center', paddingBottom: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>VS</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-side2)', textTransform: 'uppercase' }}>{side2Name}</p>
                <p style={{ lineHeight: '1', margin: 0 }}>
                  <span className="score-digit" style={(scoreCalculations.winner === 'SIDE2' || scoreCalculations.winner === 'FRIES' || scoreCalculations.winner === 'White') ? { textShadow: '0 0 20px rgba(96,165,250,0.5)' } : {}}>{scoreCalculations.friesFinal}</span>
                </p>
              </div>
            </div>

            <div className="tug-of-war-container" style={{ height: '28px' }}>
              <div className="tug-of-war-bar-side1" style={{ width: `${shakesPercentage}%` }} />
              <div className="tug-of-war-bar-side2" style={{ width: `${friesPercentage}%` }} />
              <div className="tug-of-war-center" />
            </div>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '4px' }}>Game Score Entry</h2>
      
      {eventConfig.eventType !== 'normal' ? (
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
              <span><strong>{currentUser.role === 'admin' ? 'Coordinator' : 'Game Leader'} View:</strong> Tap the winner options below to submit scores in real-time. Any changes immediately update all devices.</span>
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
      {eventConfig.eventType !== 'service' && (
        <div className="toggle-group" style={{ marginBottom: '4px' }}>
          <button 
            type="button"
            className={`toggle-btn ${effectiveViewMode === 'block' ? 'active' : ''}`}
            onClick={() => setScoreViewMode('block')}
          >
            By Block
          </button>
          <button 
            type="button"
            className={`toggle-btn ${effectiveViewMode === 'game' ? 'active' : ''}`}
            onClick={() => setScoreViewMode('game')}
          >
            By Game
          </button>
        </div>
      )}

      {effectiveViewMode === 'block' && [1, 2, 3, 4].map((blockNum) => {
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
                  {eventConfig.eventType !== 'normal' && eventConfig.gameEngineType !== 'Shuffle' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                  ) : eventConfig.gameEngineType === 'Shuffle' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {(scoreCalculations.sortedTeams || []).map((tCode, i) => {
                        return (
                          <span key={tCode}>
                            {i > 0 && ' | '}
                            {tCode}: <span style={{ color: '#ffffff', fontWeight: '700' }}>{bScores?.[tCode] || 0}</span>
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <>
                      Score: {side1Name} <span style={{ color: 'var(--color-side1)', fontWeight: '700' }}>{bScores?.shakes || 0}</span> - {side2Name} <span style={{ color: 'var(--color-side2)', fontWeight: '700' }}>{bScores?.fries || 0}</span>
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
                          const pts = campData?.gamePoints?.[m.game] || 1;
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
                                      <span style={{ borderRadius: '9999px', animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none', padding: '2px 6px', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.05em' }}>
                                        LIVE
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800' }}>
                                  {winner === 'NA' ? (
                                    <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                                  ) : winner === 'teamA' || winner === 'Shakes' ? (
                                    <span style={{ color: getTeamColorHex(m.teamA || m.shakes) }}>
                                      {m.teamA || m.shakes} Win
                                    </span>
                                  ) : winner === 'teamB' || winner === 'Fries' ? (
                                    <span style={{ color: getTeamColorHex(m.teamB || m.fries) }}>
                                      {m.teamB || m.fries} Win
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--color-tie)' }}>Tie</span>
                                  )}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                                <>
                                  <span style={{ color: getTeamColorHex(m.teamA || m.shakes), fontWeight: '600' }}>{m.teamA || m.shakes}</span>
                                  <span style={{ color: 'var(--text-muted)' }}>vs</span>
                                  <span style={{ color: getTeamColorHex(m.teamB || m.fries), fontWeight: '600' }}>{m.teamB || m.fries}</span>
                                </>
                              </div>
                              
                              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') && (
                                <div className="winner-selector">
                                  <button 
                                    className={`winner-option ${winner === 'teamA' || winner === 'Shakes' ? 'active' : ''}`}
                                    style={{
                                      background: winner === 'teamA' || winner === 'Shakes' ? getTeamColorHex(m.teamA || m.shakes) : 'transparent',
                                      color: winner === 'teamA' || winner === 'Shakes' ? '#ffffff' : getTeamColorHex(m.teamA || m.shakes),
                                      border: `1px solid ${getTeamColorHex(m.teamA || m.shakes)}`,
                                      borderRadius: '4px',
                                      padding: '4px 8px'
                                    }}
                                    onClick={() => handleToggleWinner(m.block, m.round, m.game, 'teamA')}
                                  >
                                    {m.teamA || m.shakes}
                                  </button>
                                  <button 
                                    className={`winner-option ${winner === 'TIE' ? 'active' : ''}`}
                                    style={{
                                      borderRadius: '4px',
                                      padding: '4px 8px'
                                    }}
                                    onClick={() => handleToggleWinner(m.block, m.round, m.game, 'TIE')}
                                  >
                                    Tie
                                  </button>
                                  <button 
                                    className={`winner-option ${winner === 'teamB' || winner === 'Fries' ? 'active' : ''}`}
                                    style={{
                                      background: winner === 'teamB' || winner === 'Fries' ? getTeamColorHex(m.teamB || m.fries) : 'transparent',
                                      color: winner === 'teamB' || winner === 'Fries' ? '#ffffff' : getTeamColorHex(m.teamB || m.fries),
                                      border: `1px solid ${getTeamColorHex(m.teamB || m.fries)}`,
                                      borderRadius: '4px',
                                      padding: '4px 8px'
                                    }}
                                    onClick={() => handleToggleWinner(m.block, m.round, m.game, 'teamB')}
                                  >
                                    {m.teamB || m.fries}
                                  </button>
                                  <button 
                                    className={`winner-option`}
                                    style={{ color: winner === 'NA' ? '#ffffff' : 'var(--text-muted)', borderRadius: '4px', padding: '4px 8px' }}
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

      {effectiveViewMode === 'game' && uniqueGames.map((gameName) => {
        const isOpen = expandedGames[gameName];
        const gameMatches = campData.matchups.filter(m => m.game === gameName);
        const pts = campData?.gamePoints?.[gameName] || 0;
        
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
                            {eventConfig.eventType === 'service' ? `Round ${m.round}` : `Block ${m.block} • Round ${m.round}`}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: isActive ? 'var(--vbt-sky)' : 'var(--text-muted)', marginLeft: '8px', fontWeight: isActive ? '700' : 'normal' }}>
                            {getEffectiveTimeShift() > 0 ? `${getShiftedTimeStr(m.time, getEffectiveTimeShift())} (+${getEffectiveTimeShift()}m)` : m.time}
                          </span>
                          {isActive && (
                            <span style={{ animation: 'pulse-glow 1.5s infinite', background: '#ef4444', color: '#ffffff', border: 'none', padding: '2px 6px', fontSize: '0.6rem', borderRadius: '4px', fontWeight: '800', letterSpacing: '0.05em', marginLeft: '6px' }}>
                              LIVE
                            </span>
                          )}
                        </div>
                        <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '800' }}>
                          {winner === 'NA' ? (
                            <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                          ) : winner === 'teamA' || winner === 'Shakes' ? (
                            <span style={{ color: getTeamColorHex(m.teamA || m.shakes) }}>
                              {m.teamA || m.shakes} Win
                            </span>
                          ) : winner === 'teamB' || winner === 'Fries' ? (
                            <span style={{ color: getTeamColorHex(m.teamB || m.fries) }}>
                              {m.teamB || m.fries} Win
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-tie)' }}>Tie</span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justify: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                        <>
                          <span style={{ color: getTeamColorHex(m.teamA || m.shakes), fontWeight: '600' }}>{m.teamA || m.shakes}</span>
                          <span style={{ color: 'var(--text-muted)' }}>vs</span>
                          <span style={{ color: getTeamColorHex(m.teamB || m.fries), fontWeight: '600' }}>{m.teamB || m.fries}</span>
                        </>
                      </div>
                      
                      {currentUser && (currentUser.role === 'admin' || currentUser.role === 'referee') && (
                        <div className="winner-selector">
                          <button 
                            className={`winner-option ${winner === 'teamA' || winner === 'Shakes' ? 'active-shakes' : ''}`}
                            style={{
                              background: winner === 'teamA' || winner === 'Shakes' ? getTeamColorHex(m.teamA || m.shakes) : 'transparent',
                              color: winner === 'teamA' || winner === 'Shakes' ? '#ffffff' : getTeamColorHex(m.teamA || m.shakes),
                              border: `1px solid ${getTeamColorHex(m.teamA || m.shakes)}`,
                              borderRadius: '4px',
                              padding: '4px 8px'
                            }}
                            onClick={() => handleToggleWinner(m.block, m.round, m.game, 'teamA')}
                          >
                            {m.teamA || m.shakes}
                          </button>
                          <button 
                            className={`winner-option ${winner === 'TIE' ? 'active-tie' : ''}`}
                            style={{
                              borderRadius: '4px',
                              padding: '4px 8px'
                            }}
                            onClick={() => handleToggleWinner(m.block, m.round, m.game, 'TIE')}
                          >
                            Tie
                          </button>
                          <button 
                            className={`winner-option ${winner === 'teamB' || winner === 'Fries' ? 'active-fries' : ''}`}
                            style={{
                              background: winner === 'teamB' || winner === 'Fries' ? getTeamColorHex(m.teamB || m.fries) : 'transparent',
                              color: winner === 'teamB' || winner === 'Fries' ? '#ffffff' : getTeamColorHex(m.teamB || m.fries),
                              border: `1px solid ${getTeamColorHex(m.teamB || m.fries)}`,
                              borderRadius: '4px',
                              padding: '4px 8px'
                            }}
                            onClick={() => handleToggleWinner(m.block, m.round, m.game, 'teamB')}
                          >
                            {m.teamB || m.fries}
                          </button>
                          <button 
                            className={`winner-option`}
                            style={{ color: winner === 'NA' ? '#ffffff' : 'var(--text-muted)', borderRadius: '4px', padding: '4px 8px' }}
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
  );
}
