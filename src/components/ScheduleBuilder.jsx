// ─────────────────────────────────────────────
//  ScheduleBuilder.jsx  –  Admin Schedule Builder
// ─────────────────────────────────────────────
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Check,
  AlertTriangle,
  Lock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  createBlankSchedule,
  autoAssignTeams,
  addGameToSchedule,
  removeGameFromSchedule,
  reorderRounds,
  recalculateTimes,
  validateSchedule,
  formatTimeSlot,
  scheduleToFirestore,
} from '../scheduleUtils';

/* ════════════════════════════════════════════
   Design-system tokens (inline)
   ════════════════════════════════════════════ */
const T = {
  bgDark: '#0a1020',
  bgSurface: 'rgba(13,20,38,0.55)',
  borderGlow: 'rgba(41,182,246,0.15)',
  borderLight: 'rgba(255,255,255,0.06)',
  vbtBlue: '#0070f3',
  vbtSky: '#29b6f6',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.35)',
  gradientVbt: 'linear-gradient(135deg, #0070f3 0%, #29b6f6 100%)',
  fontTitle: "'Outfit', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
  glass: {
    background: 'rgba(13,20,38,0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(41,182,246,0.15)',
    borderRadius: '16px',
  },
};

/* ════════════════════════════════════════════
   Shared inline styles
   ════════════════════════════════════════════ */
const S = {
  wrapper: {
    fontFamily: T.fontBody,
    color: T.textPrimary,
    padding: '24px',
    maxWidth: 1200,
    margin: '0 auto',
  },
  heading: {
    fontFamily: T.fontTitle,
    fontSize: 28,
    fontWeight: 700,
    margin: 0,
    background: T.gradientVbt,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  panel: {
    ...T.glass,
    padding: '20px 24px',
    marginBottom: 20,
  },
  panelTitle: {
    fontFamily: T.fontTitle,
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 14,
    color: T.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: T.textSecondary,
    marginBottom: 4,
    display: 'block',
    fontWeight: 500,
  },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: T.textPrimary,
    padding: '8px 12px',
    fontSize: 14,
    fontFamily: T.fontBody,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  btnPrimary: {
    background: T.gradientVbt,
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: T.fontBody,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'opacity 0.2s, transform 0.15s',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: T.textPrimary,
    border: `1px solid ${T.borderGlow}`,
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: T.fontBody,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    transition: 'background 0.2s',
  },
  btnDanger: {
    background: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: T.fontBody,
  },
  btnIcon: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: T.textSecondary,
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.2s, color 0.2s',
  },
  stepper: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  stepperValue: {
    width: 48,
    textAlign: 'center',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: T.textPrimary,
    padding: '8px 4px',
    fontSize: 14,
    fontFamily: T.fontBody,
  },
  row: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 120,
  },
  badge: (bg, color) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 20,
    background: bg,
    color,
  }),
  roundRow: (isDragOver) => ({
    ...T.glass,
    padding: '14px 16px',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    transition: 'box-shadow 0.2s, transform 0.15s',
    boxShadow: isDragOver ? `0 0 0 2px ${T.vbtSky}` : 'none',
    transform: isDragOver ? 'scale(1.005)' : 'none',
    cursor: 'grab',
  }),
  matchupChip: {
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${T.borderLight}`,
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 130,
    flex: '1 1 130px',
  },
  teamDot: (hex) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: hex || T.vbtBlue,
    display: 'inline-block',
    marginRight: 6,
    flexShrink: 0,
  }),
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modal: {
    ...T.glass,
    padding: '28px 32px',
    maxWidth: 560,
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  validOk: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#22c55e',
    marginBottom: 4,
  },
  validErr: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 4,
  },
  gameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    marginBottom: 8,
    border: `1px solid ${T.borderLight}`,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
};

/* ════════════════════════════════════════════
   NumberStepper sub-component
   ════════════════════════════════════════════ */
function NumberStepper({ value, onChange, min = 1, max = 99, label }) {
  return (
    <div style={S.fieldGroup}>
      {label && <span style={S.label}>{label}</span>}
      <div style={S.stepper}>
        <button
          style={S.btnIcon}
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label="Decrease"
        >
          –
        </button>
        <input
          style={S.stepperValue}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
        />
        <button
          style={S.btnIcon}
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label="Increase"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════ */
export default function ScheduleBuilder({
  eventCode,
  eventConfig = {},
  campData = {},
  onPublish,
  getTeamColorHex = () => T.vbtBlue,
}) {
  /* ── derived data ── */
  const teamsList = useMemo(() => {
    if (eventConfig.teams) {
      if (Array.isArray(eventConfig.teams)) {
        return eventConfig.teams.map((t) => (typeof t === 'object' ? t.name : t));
      }
      return Object.keys(eventConfig.teams);
    }
    if (campData.teams) {
      if (Array.isArray(campData.teams)) {
        return campData.teams.map((t) => (typeof t === 'object' ? t.name : t));
      }
      return Object.keys(campData.teams);
    }
    return [];
  }, [eventConfig, campData]);
  const initialGames = useMemo(
    () =>
      (eventConfig.games || campData.games || []).map((g, i) => ({
        id: g.id || `game-${i}`,
        name: g.name || g,
        location: g.location || '',
        howToPlay: g.howToPlay || '',
      })),
    [eventConfig, campData]
  );

  /* ── core state ── */
  const [startTime, setStartTime] = useState('09:00');
  const [roundDuration, setRoundDuration] = useState(15);
  const [breakDuration, setBreakDuration] = useState(5);
  const [roundCount, setRoundCount] = useState(
    Math.max(6, teamsList.length > 1 ? teamsList.length - 1 : 6)
  );

  const [schedule, setSchedule] = useState(() =>
    createBlankSchedule({
      teams: teamsList,
      games: initialGames,
      startTime: '09:00',
      roundDuration: 15,
      breakDuration: 5,
      roundCount: Math.max(6, teamsList.length > 1 ? teamsList.length - 1 : 6),
    })
  );

  /* ── UI state ── */
  const [showAddGame, setShowAddGame] = useState(false);
  const [newGame, setNewGame] = useState({ name: '', location: '', howToPlay: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  /* ── validation (live) ── */
  const validation = useMemo(() => validateSchedule(schedule), [schedule]);

  /* ── timing sync ── */
  const syncTiming = useCallback(
    (st, rd, bd, rc) => {
      setSchedule((prev) => {
        // If round count changed, rebuild
        if (rc !== prev.rounds.length) {
          const rebuilt = createBlankSchedule({
            teams: prev.teams,
            games: prev.games,
            startTime: st,
            roundDuration: rd,
            breakDuration: bd,
            roundCount: rc,
          });
          // Preserve existing matchups where possible
          rebuilt.rounds.forEach((newR, i) => {
            if (prev.rounds[i]) {
              newR.matchups = newR.matchups.map((mu, gi) => {
                const old = prev.rounds[i].matchups[gi];
                return old ? { ...old } : mu;
              });
            }
          });
          rebuilt.status = prev.status;
          return rebuilt;
        }
        return recalculateTimes(prev, st, rd, bd);
      });
    },
    []
  );

  const handleStartTime = (v) => {
    setStartTime(v);
    syncTiming(v, roundDuration, breakDuration, roundCount);
  };
  const handleRoundDuration = (v) => {
    setRoundDuration(v);
    syncTiming(startTime, v, breakDuration, roundCount);
  };
  const handleBreakDuration = (v) => {
    setBreakDuration(v);
    syncTiming(startTime, roundDuration, v, roundCount);
  };
  const handleRoundCount = (v) => {
    setRoundCount(v);
    syncTiming(startTime, roundDuration, breakDuration, v);
  };

  /* ── game CRUD ── */
  const handleAddGame = () => {
    if (!newGame.name.trim()) return;
    setSchedule((prev) => addGameToSchedule(prev, { ...newGame }));
    setNewGame({ name: '', location: '', howToPlay: '' });
    setShowAddGame(false);
  };

  const handleRemoveGame = (gameId) => {
    setSchedule((prev) => removeGameFromSchedule(prev, gameId));
  };

  /* ── auto-assign ── */
  const handleAutoAssign = () => {
    setSchedule((prev) => autoAssignTeams(prev, teamsList));
  };

  /* ── drag & drop reorder ── */
  const handleDragStart = (e, idx) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // For Firefox
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };
  const handleDrop = (e, toIdx) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== toIdx) {
      setSchedule((prev) => reorderRounds(prev, dragIdx, toIdx));
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  /* ── arrow reorder ── */
  const moveRound = (from, dir) => {
    const to = from + dir;
    if (to < 0 || to >= schedule.rounds.length) return;
    setSchedule((prev) => reorderRounds(prev, from, to));
  };

  /* ── publish ── */
  const handlePublish = () => {
    const firestoreDocs = scheduleToFirestore(
      { ...schedule, status: 'published' },
      eventCode
    );
    setSchedule((prev) => ({ ...prev, status: 'published' }));
    setShowConfirm(false);
    if (onPublish) onPublish(firestoreDocs);
  };

  /* ── status badge ── */
  const statusBadge = () => {
    switch (schedule.status) {
      case 'published':
        return (
          <span style={S.badge('rgba(34,197,94,0.15)', '#22c55e')}>
            <Check size={13} /> Published
          </span>
        );
      case 'locked':
        return (
          <span style={S.badge('rgba(59,130,246,0.15)', '#3b82f6')}>
            <Lock size={13} /> Locked
          </span>
        );
      default:
        return (
          <span style={S.badge('rgba(234,179,8,0.15)', '#eab308')}>
            <AlertTriangle size={13} /> Draft
          </span>
        );
    }
  };

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={S.wrapper}>
      {/* ── Top Bar ── */}
      <div style={S.topBar}>
        <h2 style={S.heading}>
          <Calendar size={24} /> Schedule Builder
        </h2>
        {statusBadge()}
      </div>

      {/* ═══════════ 1. Setup Panel ═══════════ */}
      <div style={S.panel}>
        <div style={S.panelTitle}>⚙️ Setup</div>
        <div style={S.row}>
          <div style={S.fieldGroup}>
            <span style={S.label}>Start Time</span>
            <input
              type="time"
              style={{ ...S.input, width: 140 }}
              value={startTime}
              onChange={(e) => handleStartTime(e.target.value)}
            />
          </div>
          <NumberStepper
            label="Round Duration (min)"
            value={roundDuration}
            onChange={handleRoundDuration}
            min={5}
            max={60}
          />
          <NumberStepper
            label="Break Duration (min)"
            value={breakDuration}
            onChange={handleBreakDuration}
            min={0}
            max={30}
          />
          <NumberStepper
            label="Number of Rounds"
            value={roundCount}
            onChange={handleRoundCount}
            min={1}
            max={30}
          />
          <div style={S.fieldGroup}>
            <span style={S.label}>Teams</span>
            <div
              style={{
                ...S.input,
                width: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                color: T.vbtSky,
                cursor: 'default',
              }}
            >
              {teamsList.length}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ 2. Games / Stations Editor ═══════════ */}
      <div style={S.panel}>
        <div style={{ ...S.panelTitle, justifyContent: 'space-between' }}>
          <span>🎮 Games / Stations</span>
          <button
            style={S.btnPrimary}
            onClick={() => setShowAddGame((v) => !v)}
          >
            <Plus size={15} /> Add Game
          </button>
        </div>

        {schedule.games.length === 0 && (
          <p style={{ color: T.textMuted, fontSize: 13, margin: '8px 0' }}>
            No games added yet. Click "Add Game" above.
          </p>
        )}

        {schedule.games.map((game) => (
          <div key={game.id} style={S.gameRow}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{game.name}</div>
              {game.location && (
                <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
                  📍 {game.location}
                </div>
              )}
              {game.howToPlay && (
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                  {game.howToPlay}
                </div>
              )}
            </div>
            <button style={S.btnDanger} onClick={() => handleRemoveGame(game.id)}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        ))}

        {/* Inline add-game form */}
        {showAddGame && (
          <div
            style={{
              ...T.glass,
              padding: '16px 20px',
              marginTop: 12,
            }}
          >
            <div style={{ ...S.row, marginBottom: 12 }}>
              <div style={{ ...S.fieldGroup, flex: 1 }}>
                <span style={S.label}>Game Name *</span>
                <input
                  style={S.input}
                  placeholder="e.g. Dodgeball"
                  value={newGame.name}
                  onChange={(e) =>
                    setNewGame((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div style={{ ...S.fieldGroup, flex: 1 }}>
                <span style={S.label}>Location</span>
                <input
                  style={S.input}
                  placeholder="e.g. Court A"
                  value={newGame.location}
                  onChange={(e) =>
                    setNewGame((p) => ({ ...p, location: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={S.label}>How to Play</span>
              <input
                style={S.input}
                placeholder="Brief rules..."
                value={newGame.howToPlay}
                onChange={(e) =>
                  setNewGame((p) => ({ ...p, howToPlay: e.target.value }))
                }
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={S.btnPrimary} onClick={handleAddGame}>
                <Check size={14} /> Save Game
              </button>
              <button
                style={S.btnSecondary}
                onClick={() => {
                  setShowAddGame(false);
                  setNewGame({ name: '', location: '', howToPlay: '' });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ 3. Schedule Grid / Timeline ═══════════ */}
      <div style={S.panel}>
        <div style={S.panelTitle}>📅 Schedule Timeline</div>

        {schedule.rounds.length === 0 && (
          <p style={{ color: T.textMuted, fontSize: 13 }}>
            Configure setup and add games to see the timeline.
          </p>
        )}

        {schedule.rounds.map((round, ri) => (
          <div
            key={round.id}
            style={S.roundRow(dragOverIdx === ri)}
            draggable
            onDragStart={(e) => handleDragStart(e, ri)}
            onDragOver={(e) => handleDragOver(e, ri)}
            onDrop={(e) => handleDrop(e, ri)}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <div style={{ cursor: 'grab', color: T.textMuted, flexShrink: 0 }}>
              <GripVertical size={18} />
            </div>

            {/* Round label + time */}
            <div style={{ minWidth: 110, flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, fontFamily: T.fontTitle }}>
                Round {ri + 1}
              </div>
              <div style={{ fontSize: 12, color: T.vbtSky, marginTop: 2 }}>
                {formatTimeSlot(round.startTime, roundDuration, ri)}
              </div>
            </div>

            {/* Matchups */}
            <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
              {round.matchups.map((mu, gi) => {
                const game = schedule.games.find((g) => g.id === mu.gameId);
                return (
                  <div key={mu.gameId} style={S.matchupChip}>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.textMuted,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 2,
                      }}
                    >
                      {game?.name || 'Game'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={S.teamDot(getTeamColorHex(mu.teamA))} />
                      <span style={{ fontSize: 13 }}>
                        {mu.teamA || '—'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.textMuted,
                        textAlign: 'center',
                        lineHeight: 1,
                      }}
                    >
                      vs
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={S.teamDot(getTeamColorHex(mu.teamB))} />
                      <span style={{ fontSize: 13 }}>
                        {mu.teamB || '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Arrow buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <button
                style={{
                  ...S.btnIcon,
                  opacity: ri === 0 ? 0.25 : 1,
                  pointerEvents: ri === 0 ? 'none' : 'auto',
                }}
                onClick={() => moveRound(ri, -1)}
                aria-label="Move round up"
              >
                <ArrowUp size={14} />
              </button>
              <button
                style={{
                  ...S.btnIcon,
                  opacity: ri === schedule.rounds.length - 1 ? 0.25 : 1,
                  pointerEvents:
                    ri === schedule.rounds.length - 1 ? 'none' : 'auto',
                }}
                onClick={() => moveRound(ri, 1)}
                aria-label="Move round down"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════ 4. Validation Panel ═══════════ */}
      <div style={S.panel}>
        <div style={S.panelTitle}>
          {validation.valid ? (
            <Check size={16} color="#22c55e" />
          ) : (
            <AlertTriangle size={16} color="#ef4444" />
          )}{' '}
          Validation
        </div>

        {validation.valid ? (
          <div style={S.validOk}>
            <Check size={14} /> No conflicts — schedule is valid
          </div>
        ) : (
          validation.errors.map((err, i) => (
            <div key={i} style={S.validErr}>
              <AlertTriangle size={14} /> {err}
            </div>
          ))
        )}
      </div>

      {/* ═══════════ 5. Action Buttons ═══════════ */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <button style={S.btnSecondary} onClick={handleAutoAssign}>
          <RefreshCw size={15} /> 🔄 Auto-Assign Teams
        </button>
        <button style={S.btnSecondary} onClick={() => setShowPreview(true)}>
          <Eye size={15} /> 📋 Preview Schedule
        </button>
        <button
          style={{
            ...S.btnPrimary,
            opacity: !validation.valid ? 0.5 : 1,
            pointerEvents: !validation.valid ? 'none' : 'auto',
          }}
          onClick={() => setShowConfirm(true)}
        >
          <Lock size={15} /> 🔒 Lock & Publish
        </button>
      </div>

      {/* ═══════════ Preview Modal ═══════════ */}
      {showPreview && (
        <div style={S.overlay} onClick={() => setShowPreview(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                fontFamily: T.fontTitle,
                fontSize: 20,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 16,
                background: T.gradientVbt,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              📋 Schedule Preview
            </h3>

            {schedule.rounds.map((round, ri) => (
              <div
                key={round.id}
                style={{
                  marginBottom: 16,
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 12,
                  border: `1px solid ${T.borderLight}`,
                }}
              >
                <div
                  style={{
                    fontFamily: T.fontTitle,
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 6,
                  }}
                >
                  Round {ri + 1}{' '}
                  <span style={{ color: T.vbtSky, fontWeight: 500, fontSize: 13 }}>
                    {formatTimeSlot(round.startTime, roundDuration, ri)}
                  </span>
                </div>
                {round.matchups.map((mu) => {
                  const game = schedule.games.find((g) => g.id === mu.gameId);
                  return (
                    <div
                      key={mu.gameId}
                      style={{
                        fontSize: 13,
                        color: T.textSecondary,
                        marginLeft: 12,
                        marginBottom: 3,
                      }}
                    >
                      <strong style={{ color: T.textPrimary }}>
                        {game?.name || '?'}
                      </strong>
                      : {mu.teamA || '—'} vs {mu.teamB || '—'}
                      {game?.location ? ` (${game.location})` : ''}
                    </div>
                  );
                })}
              </div>
            ))}

            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button style={S.btnSecondary} onClick={() => setShowPreview(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Confirm Publish Modal ═══════════ */}
      {showConfirm && (
        <div style={S.overlay} onClick={() => setShowConfirm(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                fontFamily: T.fontTitle,
                fontSize: 20,
                fontWeight: 700,
                marginTop: 0,
                marginBottom: 8,
                color: T.textPrimary,
              }}
            >
              🔒 Publish Schedule?
            </h3>
            <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 20 }}>
              This will save the schedule to Firestore and make it visible to all
              participants. This action can be undone from the admin dashboard.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                style={S.btnSecondary}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button style={S.btnPrimary} onClick={handlePublish}>
                <Lock size={14} /> Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
