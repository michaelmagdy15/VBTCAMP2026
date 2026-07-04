import React from 'react';
import { Settings, Plus, Minus } from 'lucide-react';

export default function ServiceTab({
  currentUser,
  serviceData,
  serviceEditMode,
  savingService,
  editServiceBrief,
  editGroups,
  editGames,
  totalKids,
  expandedServiceGame,
  currentActiveSlot,
  firebaseConnected,
  setEditServiceBrief,
  setEditGroups,
  setEditGames,
  setServiceEditMode,
  handleSaveServiceData,
  handleGroupChange,
  handleRemoveGroup,
  handleAddGroup,
  setExpandedServiceGame,
  handleGameChange,
  handleRemoveGame,
  handleAddGame
}) {
  return (
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
          !firebaseConnected && serviceData.groups.length === 0 ? (
            <div style={{display:'flex', flexDirection:'column', gap:'12px', padding:'4px 0'}}>
              {[1,2,3].map(i => (
                <div key={i} className="skeleton" style={{height:'72px', borderRadius:'12px'}} />
              ))}
            </div>
          ) : serviceData.groups.length > 0 ? (
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
                const isLiveStation = currentActiveSlot && game.name &&
                  (currentActiveSlot.name || '').toLowerCase().includes((game.name || '').toLowerCase());
                return (
                  <div key={idx} style={{
                    borderRadius: '12px',
                    border: isLiveStation ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border-light)',
                    overflow: 'hidden',
                    background: isLiveStation ? 'rgba(34,197,94,0.05)' : isOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <span style={{
                          width: '26px', height: '26px', borderRadius: '8px',
                          background: `linear-gradient(135deg, hsl(${(idx * 60 + 200) % 360}, 70%, 50%), hsl(${(idx * 60 + 240) % 360}, 60%, 40%))`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: '800', flexShrink: 0
                        }}>{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
                              {game.name || `Game ${idx + 1}`}
                            </span>
                            {isLiveStation && (
                              <span style={{
                                fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase',
                                letterSpacing: '0.06em', color: '#22c55e',
                                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)',
                                borderRadius: '4px', padding: '1px 5px'
                              }}>LIVE</span>
                            )}
                          </div>
                          {game.location && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              📌 {game.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0 }}>▾</span>
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
                <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', justifyContent: 'space-between' }}>
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
  );
}
