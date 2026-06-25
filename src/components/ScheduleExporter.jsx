import React, { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, Loader } from 'lucide-react';

const ScheduleExporter = ({ scheduleData, eventConfig, campData, getTeamColorHex }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const renderRef = useRef(null);

  const handleExport = useCallback(async () => {
    if (!renderRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(renderRef.current, {
        backgroundColor: '#0a1020',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }

        const file = new File([blob], 'schedule.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: eventConfig?.eventName || 'VBT Schedule',
              text: 'Check out the schedule!',
            });
          } catch (err) {
            if (err.name !== 'AbortError') {
              downloadBlob(blob);
            }
          }
        } else {
          downloadBlob(blob);
        }

        setIsGenerating(false);
      }, 'image/png');
    } catch (err) {
      console.error('Export failed:', err);
      setIsGenerating(false);
    }
  }, [eventConfig]);

  const downloadBlob = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const matchups = campData?.matchups || [];

  return (
    <>
      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isGenerating}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: isGenerating
            ? 'rgba(0,112,243,0.3)'
            : 'linear-gradient(135deg, #0070f3 0%, #29b6f6 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '15px',
          fontWeight: 600,
          cursor: isGenerating ? 'not-allowed' : 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: isGenerating
            ? 'none'
            : '0 4px 20px rgba(0,112,243,0.35)',
          opacity: isGenerating ? 0.7 : 1,
        }}
      >
        {isGenerating ? (
          <>
            <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Generating…
          </>
        ) : (
          <>
            📤 Share Schedule
          </>
        )}
      </button>

      {/* Spin keyframes injected once */}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Hidden Render Target */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          pointerEvents: 'none',
        }}
      >
        <div
          ref={renderRef}
          style={{
            width: '1080px',
            minHeight: '1920px',
            background: '#0a1020',
            padding: '60px 48px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: '48px',
              paddingBottom: '40px',
              borderBottom: '1px solid rgba(41,182,246,0.2)',
            }}
          >
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '4px',
                textTransform: 'uppercase',
                color: '#29b6f6',
                marginBottom: '16px',
              }}
            >
              VBT SPORTS CAMP
            </div>
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '48px',
                fontWeight: 800,
                lineHeight: 1.15,
                background: 'linear-gradient(135deg, #ffffff 0%, #29b6f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '16px',
              }}
            >
              {eventConfig?.eventName || 'Event Schedule'}
            </div>
            {eventConfig?.eventDate && (
              <div
                style={{
                  fontSize: '20px',
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: 500,
                }}
              >
                {formatDate(eventConfig.eventDate)}
              </div>
            )}
            {eventConfig?.eventType && (
              <div
                style={{
                  display: 'inline-block',
                  marginTop: '16px',
                  padding: '6px 18px',
                  background: 'rgba(0,112,243,0.2)',
                  border: '1px solid rgba(0,112,243,0.3)',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#29b6f6',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {eventConfig.eventType}
              </div>
            )}
          </div>

          {/* ── Side Names ── */}
          {eventConfig?.side1Name && eventConfig?.side2Name && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '24px',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#0070f3',
                }}
              >
                {eventConfig.side1Name}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.3)',
                  fontWeight: 700,
                }}
              >
                VS
              </div>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#29b6f6',
                }}
              >
                {eventConfig.side2Name}
              </div>
            </div>
          )}

          {/* ── Matchup Rounds ── */}
          <div style={{ flex: 1 }}>
            {matchups.map((matchup, idx) => {
              const shakeTeams = matchup.shakes
                ? matchup.shakes.split(' vs ')
                : [];
              const friesTeams = matchup.fries
                ? matchup.fries.split(' vs ')
                : [];

              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(13,20,38,0.55)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(41,182,246,0.15)',
                    borderRadius: '16px',
                    padding: '28px 32px',
                    marginBottom: '20px',
                  }}
                >
                  {/* Round Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      Round {idx + 1}
                      {matchup.game && (
                        <span
                          style={{
                            marginLeft: '12px',
                            fontSize: '16px',
                            fontWeight: 500,
                            color: 'rgba(255,255,255,0.5)',
                          }}
                        >
                          — {matchup.game}
                        </span>
                      )}
                    </div>
                    {matchup.time && (
                      <div
                        style={{
                          padding: '4px 14px',
                          background: 'rgba(0,112,243,0.15)',
                          border: '1px solid rgba(0,112,243,0.25)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#29b6f6',
                        }}
                      >
                        {matchup.time}
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  {matchup.location && (
                    <div
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.4)',
                        marginBottom: '18px',
                        fontWeight: 500,
                      }}
                    >
                      📍 {matchup.location}
                    </div>
                  )}

                  {/* Team Matchups */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {shakeTeams.length === 2 && (
                      <TeamMatchupRow
                        label="Shakes"
                        team1={shakeTeams[0]?.trim()}
                        team2={shakeTeams[1]?.trim()}
                        getTeamColorHex={getTeamColorHex}
                      />
                    )}
                    {friesTeams.length === 2 && (
                      <TeamMatchupRow
                        label="Fries"
                        team1={friesTeams[0]?.trim()}
                        team2={friesTeams[1]?.trim()}
                        getTeamColorHex={getTeamColorHex}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: '40px',
              marginTop: '20px',
              borderTop: '1px solid rgba(41,182,246,0.15)',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.35)',
                fontWeight: 500,
                letterSpacing: '1px',
              }}
            >
              Generated by VBT Sports Camp App
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

/* ── Sub-component: team matchup row ── */
const TeamMatchupRow = ({ label, team1, team2, getTeamColorHex }) => {
  const color1 = getTeamColorHex?.(team1) || '#0070f3';
  const color2 = getTeamColorHex?.(team2) || '#29b6f6';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '10px 16px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'rgba(255,255,255,0.35)',
          minWidth: '56px',
        }}
      >
        {label}
      </div>

      {/* Team 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: color1,
            boxShadow: `0 0 8px ${color1}66`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '17px',
            fontWeight: 600,
            color: '#ffffff',
          }}
        >
          {team1}
        </span>
      </div>

      {/* VS */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.25)',
          flexShrink: 0,
        }}
      >
        VS
      </div>

      {/* Team 2 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '17px',
            fontWeight: 600,
            color: '#ffffff',
          }}
        >
          {team2}
        </span>
        <div
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: color2,
            boxShadow: `0 0 8px ${color2}66`,
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
};

export default ScheduleExporter;
