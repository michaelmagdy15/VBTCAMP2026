import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import './StandingsAnalytics.css';

/* ────────────────────────────────────────────────────────
   StandingsAnalytics – premium analytics dashboard
   Pure Canvas API charts · zero external chart deps
   ──────────────────────────────────────────────────────── */

const TABS = [
  { key: 'curve', label: 'Score Curve' },
  { key: 'deductions', label: 'Deductions' },
  { key: 'tokens', label: 'Tokens' },
];

/* Camp-mode side colors */
/* Side/team colors */
const SERVICE_COLORS = { red: '#ef4444', white: '#ffffff', black: '#94a3b8', blue: '#29b6f6' };

const TOKEN_POINTS_EACH = 2;

/* ── helpers ─────────────────────────────────────────── */

function isService(eventConfig) {
  return eventConfig?.eventType !== 'normal';
}

/** Return ordered round keys found in blockScores.
 *  Key format: blockIdx_roundIdx_gameName  */
function deriveRoundKeys(blockScores) {
  if (!blockScores) return [];
  const set = new Set();
  Object.keys(blockScores).forEach((k) => {
    const parts = k.split('_');
    if (parts.length >= 2) set.add(`${parts[0]}_${parts[1]}`);
  });
  return Array.from(set).sort((a, b) => {
    const [ab, ar] = a.split('_').map(Number);
    const [bb, br] = b.split('_').map(Number);
    return ab !== bb ? ab - bb : ar - br;
  });
}

/** Build cumulative score series per side from blockScores + gamePoints.
 *  Returns { labels: string[], series: { [side]: number[] } } */
function buildScoreSeries(campState, campData, eventConfig) {
  const { blockScores = {} } = campState || {};
  const { gamePoints = {} } = campData || {};

  const roundKeys = deriveRoundKeys(blockScores);
  if (roundKeys.length === 0) return null;

  /* Sides array */
  const sides = ['red', 'white', 'black', 'blue'];

  /* Build per-round increments for each side */
  const increments = roundKeys.map(() => {
    const obj = {};
    sides.forEach((s) => (obj[s] = 0));
    return obj;
  });

  Object.entries(blockScores).forEach(([key, winner]) => {
    if (!winner || winner === 'NA') return;
    const parts = key.split('_');
    const roundKey = `${parts[0]}_${parts[1]}`;
    const gameName = parts.slice(2).join('_');
    const pts = gamePoints[gameName] || 1;
    const rIdx = roundKeys.indexOf(roundKey);
    if (rIdx === -1) return;

    if (winner === 'TIE') {
      sides.forEach((s) => (increments[rIdx][s] += pts * 0.5));
    } else {
      const winSide = winner.toLowerCase();
      if (increments[rIdx][winSide] !== undefined) {
        increments[rIdx][winSide] += pts;
      }
    }
  });

  /* Accumulate */
  const series = {};
  sides.forEach((s) => {
    series[s] = [];
    let cum = 0;
    increments.forEach((inc) => {
      cum += inc[s];
      series[s].push(cum);
    });
  });

  /* Human-friendly labels */
  const labels = roundKeys.map((_, i) => {
    if (i === roundKeys.length - 1 && roundKeys.length > 1) return 'Big Game';
    return `R${i + 1}`;
  });

  return { labels, series, sides };
}

/* ── ScoreCurveCanvas ────────────────────────────────── */

function ScoreCurveCanvas({ campState, campData, eventConfig }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const data = useMemo(
    () => buildScoreSeries(campState, campData, eventConfig),
    [campState, campData, eventConfig],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !data) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrap.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    /* Padding */
    const pad = { top: 24, right: 20, bottom: 36, left: 44 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    /* Data extents */
    const { labels, series, sides } = data;
    const allVals = sides.flatMap((s) => series[s]);
    let maxY = Math.max(...allVals, 1);
    maxY = Math.ceil(maxY / 5) * 5 || 5;
    const n = labels.length;

    /* Clear */
    ctx.clearRect(0, 0, W, H);

    /* Grid lines */
    const gridSteps = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSteps; i++) {
      const y = pad.top + ch - (i / gridSteps) * ch;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cw, y);
      ctx.stroke();
    }

    /* Y-axis labels */
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= gridSteps; i++) {
      const val = Math.round((i / gridSteps) * maxY);
      const y = pad.top + ch - (i / gridSteps) * ch;
      ctx.fillText(val, pad.left - 8, y);
    }

    /* X-axis labels */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    labels.forEach((lbl, i) => {
      const x = n === 1 ? pad.left + cw / 2 : pad.left + (i / (n - 1)) * cw;
      ctx.fillText(lbl, x, pad.top + ch + 10);
    });

    /* Coordinate mappers */
    const xOf = (i) => (n === 1 ? pad.left + cw / 2 : pad.left + (i / (n - 1)) * cw);
    const yOf = (v) => pad.top + ch - (v / maxY) * ch;

    /* Color map */
    const colorMap = SERVICE_COLORS;

    /* Draw each series */
    sides.forEach((side) => {
      const pts = series[side];
      const color = colorMap[side] || '#888';

      /* Gradient fill */
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
      grad.addColorStop(0, color + '33');
      grad.addColorStop(1, color + '00');

      /* Fill area */
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(0));
      if (pts.length === 1) {
        ctx.lineTo(xOf(0), yOf(pts[0]));
        ctx.lineTo(xOf(0), yOf(0));
      } else {
        /* Smooth curve via cardinal spline approximation */
        for (let i = 0; i < pts.length; i++) {
          if (i === 0) {
            ctx.lineTo(xOf(i), yOf(pts[i]));
          } else {
            const cpx = (xOf(i - 1) + xOf(i)) / 2;
            ctx.bezierCurveTo(cpx, yOf(pts[i - 1]), cpx, yOf(pts[i]), xOf(i), yOf(pts[i]));
          }
        }
        ctx.lineTo(xOf(pts.length - 1), yOf(0));
      }
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      /* Stroke line */
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) {
          ctx.moveTo(xOf(i), yOf(pts[i]));
        } else {
          const cpx = (xOf(i - 1) + xOf(i)) / 2;
          ctx.bezierCurveTo(cpx, yOf(pts[i - 1]), cpx, yOf(pts[i]), xOf(i), yOf(pts[i]));
        }
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.stroke();

      /* Dots */
      pts.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 2, 0, Math.PI * 2);
        ctx.fillStyle = '#070a13';
        ctx.fill();
      });
    });

    /* Legend */
    const legendY = 10;
    let legendX = pad.left;
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const sideLabels = { red: 'Red', white: 'White', black: 'Black', blue: 'Blue' };
    sides.forEach((side) => {
      const c = colorMap[side] || '#888';
      ctx.fillStyle = c;
      ctx.fillRect(legendX, legendY, 10, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(sideLabels[side] || side, legendX + 14, legendY);
      legendX += ctx.measureText(sideLabels[side] || side).width + 30;
    });
  }, [data, eventConfig]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => {
      draw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [draw]);

  if (!data) {
    return (
      <div className="analytics-empty">
        <BarChart3 size={28} />
        <span>No scored rounds yet</span>
      </div>
    );
  }

  return (
    <div className="analytics-canvas-wrap">
      <div className="analytics-chart-aspect" ref={wrapRef}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

/* ── DeductionLeaderboard ────────────────────────────── */

function DeductionLeaderboard({ campState, campData, eventConfig }) {
  const { teamDeductions = {} } = campState || {};
  const sorted = useMemo(() => {
    const teams = campData?.teams || {};
    const service = isService(eventConfig);
    return Object.entries(teamDeductions)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([code, val]) => {
        const team = teams[code];
        let color = '#94a3b8';
        if (team) {
          const sideKey = (team.side || '').toLowerCase();
          color = SERVICE_COLORS[sideKey] || '#94a3b8';
        }
        return { code, value: val, color, name: team?.name || code };
      });
  }, [teamDeductions, campData?.teams]);

  if (sorted.length === 0) {
    return (
      <div className="analytics-canvas-wrap">
        <div className="analytics-empty">
          <BarChart3 size={28} />
          <span>No deductions recorded</span>
        </div>
      </div>
    );
  }

  const maxVal = sorted[0]?.value || 1;

  return (
    <div className="analytics-canvas-wrap">
      {sorted.map((row) => (
        <div className="analytics-bar-row" key={row.code}>
          <span className="analytics-bar-label">{row.code}</span>
          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{
                width: `${Math.max((row.value / maxVal) * 100, 4)}%`,
                background: `linear-gradient(90deg, ${row.color}cc, ${row.color}66)`,
              }}
            />
          </div>
          <span className="analytics-bar-value" style={{ color: row.color }}>
            −{row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── TokenContributionGrid ───────────────────────────── */

function TokenContributionGrid({ campState, eventConfig }) {
  const cards = useMemo(() => {
    const tokens = campState?.tokens || {};
    return Object.entries(SERVICE_COLORS).map(([key, color]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      count: tokens[key] || 0,
      color,
      textColor: key === 'black' ? '#f8fafc' : key === 'white' ? '#0f172a' : '#f8fafc',
    }));
  }, [campState?.tokens]);

  const anyTokens = cards.some((c) => c.count > 0);

  if (!anyTokens) {
    return (
      <div className="analytics-canvas-wrap">
        <div className="analytics-empty">
          <BarChart3 size={28} />
          <span>No tokens awarded yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-token-grid">
      {cards.map((card) => {
        /* Parse r,g,b from hex for rgba background */
        const r = parseInt(card.color.slice(1, 3), 16);
        const g = parseInt(card.color.slice(3, 5), 16);
        const b = parseInt(card.color.slice(5, 7), 16);
        return (
          <div
            className="analytics-token-card"
            key={card.key}
            style={{
              background: `rgba(${r}, ${g}, ${b}, 0.14)`,
              borderColor: `rgba(${r}, ${g}, ${b}, 0.25)`,
            }}
          >
            <span className="analytics-token-card-label" style={{ color: card.color }}>
              {card.label}
            </span>
            <span className="analytics-token-count" style={{ color: card.textColor }}>
              {card.count}
            </span>
            <span className="analytics-token-points" style={{ color: card.color }}>
              +{card.count * TOKEN_POINTS_EACH} pts
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */

export default function StandingsAnalytics({ campState, campData, eventConfig }) {
  const [tab, setTab] = useState('curve');

  return (
    <div className="analytics-container">
      {/* Toggle */}
      <div className="analytics-toggle-group">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`analytics-toggle-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Section title */}
      <h3 className="analytics-section-title">
        <BarChart3 size={16} />
        {tab === 'curve' && 'Score Accumulation'}
        {tab === 'deductions' && 'Deduction Leaderboard'}
        {tab === 'tokens' && 'Token Contributions'}
      </h3>

      {/* Panels */}
      {tab === 'curve' && (
        <ScoreCurveCanvas
          campState={campState}
          campData={campData}
          eventConfig={eventConfig}
        />
      )}
      {tab === 'deductions' && (
        <DeductionLeaderboard
          campState={campState}
          campData={campData}
          eventConfig={eventConfig}
        />
      )}
      {tab === 'tokens' && (
        <TokenContributionGrid campState={campState} eventConfig={eventConfig} />
      )}
    </div>
  );
}
