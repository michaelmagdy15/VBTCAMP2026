import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, MapPin, ShieldAlert, CheckCircle } from 'lucide-react';
import { addAnnouncement } from '../firebase';
import { triggerHaptic } from '../utils/haptics';

const STATIONS = [
  'Soccer Field',
  'Basketball Court',
  'Volleyball Court',
  'Tug of War Area',
  'Obstacle Course',
  'Main Hall / Cafeteria',
  'First Aid Tent',
  'Restrooms Area',
  'Camp Entrance'
];

export default function EmergencySOS({ currentUser, activeEventCode, triggerRemotePushNotification }) {
  const [selectedStation, setSelectedStation] = useState(STATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [useCustomLoc, setUseCustomLoc] = useState(false);
  const [issueType, setIssueType] = useState('Medical'); // 'Medical' | 'Physical Altercation' | 'Missing Camper' | 'General SOS'
  const [holdProgress, setHoldProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const handleStartHold = () => {
    if (success) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();
    setHoldProgress(0);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / 2000) * 100); // 2 seconds hold
      setHoldProgress(pct);

      if (elapsed >= 2000) {
        clearInterval(timerRef.current);
        triggerSOS();
      }
    }, 40);
  };

  const handleEndHold = () => {
    setIsHolding(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!success) {
      setHoldProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const triggerSOS = async () => {
    setSuccess(true);
    setHoldProgress(100);
    triggerHaptic('heavy');

    const location = useCustomLoc ? customLocation.trim() || 'Unspecified location' : selectedStation;
    const alertMsg = `🚨 CRITICAL SOS: [${issueType}] reported by ${currentUser?.name || 'VBT Servant'} at ${location}`;

    try {
      // 1. Post to live announcements with type 'ping' (triggers chime + vibrator + popup alert on all client apps)
      await addAnnouncement(
        activeEventCode,
        alertMsg,
        currentUser?.name || 'VBT Servant',
        'ping',
        null,
        currentUser?.role || 'referee'
      );

      // 2. Trigger push notification to all coordinators
      if (triggerRemotePushNotification) {
        await triggerRemotePushNotification(`🚨 EMERGENCY SOS`, alertMsg);
      }
    } catch (err) {
      console.error('Failed to trigger SOS:', err);
    }

    // Reset after 5 seconds
    setTimeout(() => {
      setSuccess(false);
      setHoldProgress(0);
      setIsHolding(false);
    }, 5000);
  };

  return (
    <div style={S.container}>
      <style>{`
        @keyframes pulseRed {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes holdPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.96); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <ShieldAlert size={22} style={{ color: '#ef4444' }} />
        <h3 style={S.title}>VBT Coordinator SOS</h3>
      </div>

      <p style={S.desc}>
        Need immediate coordinator presence or medical help? Choose details and <strong>PRESS AND HOLD</strong> the red alert button.
      </p>

      {/* Details Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {/* Issue Type */}
        <div style={S.field}>
          <label style={S.label}>EMERGENCY TYPE</label>
          <div style={S.typeRow}>
            {['Medical', 'Behavioral', 'Missing Camper', 'Other'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setIssueType(type)}
                style={S.typeBtn(issueType === type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Location Selector */}
        <div style={S.field}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={S.label}>LOCATION / STATION</label>
            <button
              type="button"
              onClick={() => setUseCustomLoc(!useCustomLoc)}
              style={S.customToggle}
            >
              {useCustomLoc ? 'Use Presets' : 'Custom Input'}
            </button>
          </div>

          {useCustomLoc ? (
            <input
              type="text"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="e.g. Soccer field, near bathrooms"
              style={S.input}
            />
          ) : (
            <div style={{ position: 'relative' }}>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                style={S.select}
              >
                {STATIONS.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Visual SOS Trigger Area */}
      <div style={S.triggerArea}>
        {!success ? (
          <div style={S.buttonContainer}>
            {/* Pulsing ring outer */}
            <div style={S.pulsingRing(isHolding)} />

            {/* Circular Progress Ring */}
            <svg style={S.progressRingSvg}>
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="#ef4444"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="327"
                strokeDashoffset={327 - (327 * holdProgress) / 100}
                style={{ transition: 'stroke-dashoffset 40ms linear' }}
              />
            </svg>

            {/* Center Press-and-Hold Button */}
            <button
              type="button"
              onMouseDown={handleStartHold}
              onMouseUp={handleEndHold}
              onMouseLeave={handleEndHold}
              onTouchStart={(e) => { e.preventDefault(); handleStartHold(); }}
              onTouchEnd={handleEndHold}
              style={S.sosBtn(isHolding)}
            >
              <AlertTriangle size={32} />
              <span style={{ fontSize: '11px', fontWeight: '800', marginTop: '4px' }}>
                {isHolding ? 'HOLDING...' : 'HOLD SOS'}
              </span>
            </button>
          </div>
        ) : (
          <div style={S.successBox}>
            <CheckCircle size={40} style={{ color: '#ef4444' }} />
            <h4 style={{ margin: '8px 0 2px 0', fontSize: '15px', color: '#ffffff' }}>SOS DISPATCHED!</h4>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Coordinators are pining your location.</p>
          </div>
        )}

        {!success && (
          <span style={S.progressLabel}>
            {isHolding ? `${Math.round(holdProgress)}% (Keep Holding)` : 'Press and hold for 2 seconds'}
          </span>
        )}
      </div>
    </div>
  );
}

const S = {
  container: {
    background: 'rgba(239, 68, 68, 0.04)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: "'Outfit', sans-serif"
  },
  desc: {
    margin: '0 0 14px 0',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 1.45
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '9px',
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  customToggle: {
    background: 'none',
    border: 'none',
    color: '#29b6f6',
    fontSize: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none'
  },
  typeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  typeBtn: (selected) => ({
    flex: 1,
    minWidth: '70px',
    background: selected ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.04)',
    border: selected ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
    color: selected ? '#fca5a5' : 'rgba(255,255,255,0.7)',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s ease'
  }),
  select: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  triggerArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 0'
  },
  buttonContainer: {
    position: 'relative',
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressRingSvg: {
    position: 'absolute',
    width: '120px',
    height: '120px',
    transform: 'rotate(-90deg)',
    pointerEvents: 'none'
  },
  pulsingRing: (active) => ({
    position: 'absolute',
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'transparent',
    border: '2px solid #ef4444',
    animation: active ? 'none' : 'pulseRed 2s infinite',
    pointerEvents: 'none'
  }),
  sosBtn: (holding) => ({
    position: 'absolute',
    width: '96px',
    height: '96px',
    borderRadius: '50%',
    background: holding ? '#b91c1c' : '#ef4444',
    border: 'none',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    outline: 'none',
    boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
    animation: holding ? 'holdPulse 0.4s infinite' : 'none',
    transition: 'transform 0.1s ease, background-color 0.2s ease'
  }),
  progressLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    marginTop: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid #ef4444',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '240px',
    textAlign: 'center',
    boxSizing: 'border-box'
  }
};
