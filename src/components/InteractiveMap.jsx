import React, { useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { updateMapConfig } from '../mapEngine';
import './InteractiveMap.css';

/*
 * InteractiveMap
 * Renders a top-down camp layout (either a custom satellite screenshot or an SVG fallback)
 * with dynamic location nodes matching the configuration set by the day leader.
 * Active matches pulse with a glow; tapping a node shows a tooltip
 * with game details (name, teams, time).
 *
 * Props:
 *   liveLocationStatus - array of { id, name, label, games, activeMatchup }
 *   campData, campState, eventConfig, currentTime - camp context
 *   getTeamColorHex(teamName) - returns a hex color for a team
 *   isServiceMode - boolean
 *   mapConfig - Firestore map config document
 *   eventCode - active event code string
 *   currentUser - logged-in user object
 */

const DEFAULT_COORDS = {
  '1': { x: 100, y: 90 },
  '2': { x: 300, y: 90 },
  '3': { x: 500, y: 90 },
  '4': { x: 100, y: 300 },
  '5': { x: 300, y: 300 },
  'MH': { x: 500, y: 300 },
};

const getPositionByIndex = (idx) => {
  const positions = [
    { x: 100, y: 90 },
    { x: 300, y: 90 },
    { x: 500, y: 90 },
    { x: 100, y: 300 },
    { x: 300, y: 300 },
    { x: 500, y: 300 },
  ];
  if (idx < positions.length) {
    return positions[idx];
  }
  const col = idx % 3;
  const row = Math.floor(idx / 3);
  return {
    x: 100 + col * 200,
    y: 90 + row * 210,
  };
};

const NODE_RX = 52; // horizontal radius
const NODE_RY = 34; // vertical radius

export default function InteractiveMap({
  liveLocationStatus = [],
  campData,
  campState,
  eventConfig,
  getTeamColorHex,
  isServiceMode,
  mapConfig,
  eventCode,
  currentUser,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const isAdmin = currentUser?.role === 'admin';

  // Build dynamic positions map from liveLocationStatus
  const positionsMap = {};
  liveLocationStatus.forEach((loc, idx) => {
    const baseCoords = DEFAULT_COORDS[loc.id] || getPositionByIndex(idx);
    positionsMap[loc.id] = {
      x: baseCoords.x,
      y: baseCoords.y,
      label: loc.label || loc.name,
      name: loc.name,
    };
  });

  const rowCount = Math.max(2, Math.ceil(liveLocationStatus.length / 3));
  const viewBoxHeight = rowCount * 200;

  // Quick lookup for location data
  const locationMap = {};
  liveLocationStatus.forEach((loc) => {
    locationMap[loc.id] = loc;
  });

  const hasAnyActive = liveLocationStatus.some((loc) => loc.activeMatchup);

  const handleNodeClick = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  // Close tooltip when clicking outside nodes
  const handleSvgClick = (e) => {
    if (e.target.tagName === 'svg' || e.target.classList?.contains('map-bg')) {
      setSelectedId(null);
    }
  };

  // Compute tooltip position in percentage relative to the SVG wrapper
  const getTooltipStyle = (pos) => {
    const xPercent = (pos.x / 600) * 100;
    const yPercent = ((pos.y + NODE_RY + 14) / viewBoxHeight) * 100;
    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
      transform: 'translateX(-50%)',
    };
  };

  const handleResetLayout = async () => {
    if (window.confirm('Are you sure you want to reset to the default SVG map layout?')) {
      try {
        await updateMapConfig(eventCode, { customMapUrl: null });
        alert('Reset to default map layout successfully!');
      } catch (err) {
        console.error('Failed to reset map layout:', err);
        alert('Error resetting map layout: ' + err.message);
      }
    }
  };

  return (
    <div className="interactive-map-container">
      {/* Header */}
      <div className="interactive-map-header">
        <MapPin size={20} className="map-header-icon" />
        <h3>Camp Map</h3>
      </div>

      {/* Fallback: no active matches */}
      {!hasAnyActive && liveLocationStatus.length > 0 && (
        <div className="map-no-matches">No active matches right now</div>
      )}

      {/* SVG Map or Screenshot */}
      <div className="interactive-map-svg-wrap">
        {mapConfig?.customMapUrl ? (
          <div className="custom-map-screenshot-container" style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(41, 182, 246, 0.15)', background: 'rgba(7, 10, 19, 0.45)' }}>
            <img 
              src={mapConfig.customMapUrl} 
              alt="Custom Map Key Layout" 
              style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }} 
            />
            {isAdmin && (
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                <button 
                  onClick={handleResetLayout} 
                  className="reset-layout-btn"
                  style={{
                    background: 'rgba(10, 16, 32, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(10, 16, 32, 0.85)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  }}
                >
                  <RefreshCw size={12} /> Reset Layout
                </button>
              </div>
            )}
          </div>
        ) : (
          <svg
            viewBox={`0 0 600 ${viewBoxHeight}`}
            xmlns="http://www.w3.org/2000/svg"
            onClick={handleSvgClick}
            role="img"
            aria-label="Camp location map"
          >
            {/* Background */}
            <rect
              className="map-bg"
              x="0" y="0" width="600" height={viewBoxHeight}
              rx="12"
              fill="rgba(7, 10, 19, 0.45)"
            />

            {/* Grid lines for visual flair */}
            {[150, 300, 450].map((gx) => (
              <line
                key={`vl-${gx}`}
                x1={gx} y1="30" x2={gx} y2={viewBoxHeight - 30}
                stroke="rgba(41, 182, 246, 0.06)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}
            {Array.from({ length: rowCount - 1 }, (_, i) => 195 + i * 210).map((gy) => (
              <line
                key={`hl-${gy}`}
                x1="30" y1={gy} x2="570" y2={gy}
                stroke="rgba(41, 182, 246, 0.06)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}

            {/* Location Nodes */}
            {liveLocationStatus.map((loc, idx) => {
              const pos = positionsMap[loc.id];
              if (!pos) return null;
              const isActive = loc.activeMatchup != null;
              const isSelected = selectedId === loc.id;

              return (
                <g
                  key={loc.id || idx}
                  className={`map-node ${isActive ? 'map-node-active' : 'map-node-inactive'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(loc.id);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${pos.label}${isActive ? ' – active match' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNodeClick(loc.id);
                    }
                  }}
                >
                  {/* Outer glow ring for active */}
                  {isActive && (
                    <ellipse
                      cx={pos.x} cy={pos.y}
                      rx={NODE_RX + 6} ry={NODE_RY + 6}
                      fill="none"
                      stroke="rgba(41, 182, 246, 0.18)"
                      strokeWidth="2"
                    />
                  )}

                  {/* Node shape */}
                  <rect
                    x={pos.x - NODE_RX} y={pos.y - NODE_RY}
                    width={NODE_RX * 2} height={NODE_RY * 2}
                    rx="14"
                    fill={isActive ? 'rgba(20, 65, 161, 0.55)' : 'rgba(13, 20, 38, 0.65)'}
                    stroke={
                      isSelected
                        ? 'rgba(41, 182, 246, 0.8)'
                        : isActive
                          ? 'rgba(41, 182, 246, 0.4)'
                          : 'rgba(41, 182, 246, 0.12)'
                    }
                    strokeWidth={isSelected ? 2 : 1.2}
                  />

                  {/* Location label */}
                  <text
                    x={pos.x} y={pos.y - 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isActive ? '#f8fafc' : '#94a3b8'}
                    fontSize="12"
                    fontFamily="'Outfit', sans-serif"
                    fontWeight="600"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {pos.name}
                  </text>

                  {/* Status dot / sub-label */}
                  {isActive && (
                    <circle
                      cx={pos.x} cy={pos.y + 16}
                      r="3.5"
                      fill="#29b6f6"
                    />
                  )}
                  {!isActive && (
                    <text
                      x={pos.x} y={pos.y + 16}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="'Plus Jakarta Sans', sans-serif"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      idle
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Tooltip overlay (positioned absolutely over SVG) - only when default SVG map is rendered */}
        {!mapConfig?.customMapUrl && selectedId && positionsMap[selectedId] && (
          <div className="map-tooltip-overlay">
            <div
              className="map-tooltip"
              style={getTooltipStyle(positionsMap[selectedId])}
            >
              <div className="map-tooltip-arrow" />
              <p className="map-tooltip-location">
                {positionsMap[selectedId].label}
              </p>

              {locationMap[selectedId]?.activeMatchup ? (
                <>
                  <p className="map-tooltip-game">
                    🎮 {locationMap[selectedId].activeMatchup.game}
                  </p>
                  <div className="map-tooltip-matchup">
                    <span
                      className="team-dot"
                      style={{
                        background: getTeamColorHex
                          ? getTeamColorHex(locationMap[selectedId].activeMatchup.teamA)
                          : '#f97316',
                      }}
                    />
                    <span>{locationMap[selectedId].activeMatchup.teamA}</span>
                    <span style={{ color: '#64748b', margin: '0 2px' }}>vs</span>
                    <span
                      className="team-dot"
                      style={{
                        background: getTeamColorHex
                          ? getTeamColorHex(locationMap[selectedId].activeMatchup.teamB)
                          : '#8b5cf6',
                      }}
                    />
                    <span>{locationMap[selectedId].activeMatchup.teamB}</span>
                  </div>
                  <p className="map-tooltip-time">
                    ⏰ {locationMap[selectedId].activeMatchup.time}
                  </p>
                </>
              ) : (
                <p className="map-tooltip-game" style={{ color: '#64748b' }}>
                  No active match at this location
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint text when nothing is selected */}
      {!selectedId && hasAnyActive && !mapConfig?.customMapUrl && (
        <div className="map-hint-text">Tap a location to see live match</div>
      )}
    </div>
  );
}
