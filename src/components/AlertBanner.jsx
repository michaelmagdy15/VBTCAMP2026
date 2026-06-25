import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, X, Info, Clock, Bell, Send } from 'lucide-react';

const ALERT_DURATIONS = {
  urgent: 10000,
  info: 6000,
  transition: 6000,
};

const ALERT_STYLES = {
  urgent: {
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    borderColor: '#f87171',
    Icon: AlertTriangle,
  },
  info: {
    background: 'linear-gradient(135deg, #1441a1, #29b6f6)',
    borderColor: '#29b6f6',
    Icon: Info,
  },
  transition: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    borderColor: '#fbbf24',
    Icon: Clock,
  },
};

export default function AlertBanner({ alert, onDismiss, isAdmin, onCreateAlert }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAlertText, setNewAlertText] = useState('');
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    clearInterval(progressRef.current);
    clearTimeout(timerRef.current);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      setProgress(100);
      if (onDismiss) onDismiss();
    }, 350);
  }, [onDismiss]);

  useEffect(() => {
    if (alert && alert.show) {
      setVisible(true);
      setExiting(false);
      setProgress(100);

      const type = alert.type || 'info';
      const duration = ALERT_DURATIONS[type] || 6000;
      startTimeRef.current = Date.now();

      progressRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
        if (remaining <= 0) {
          clearInterval(progressRef.current);
        }
      }, 50);

      timerRef.current = setTimeout(() => {
        dismiss();
      }, duration);

      return () => {
        clearInterval(progressRef.current);
        clearTimeout(timerRef.current);
      };
    } else {
      setVisible(false);
    }
  }, [alert, dismiss]);

  const handleCreateAlert = () => {
    if (newAlertText.trim() && onCreateAlert) {
      onCreateAlert(newAlertText.trim());
      setNewAlertText('');
      setShowCreateForm(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreateAlert();
    if (e.key === 'Escape') setShowCreateForm(false);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const type = alert?.type || 'info';
  const config = ALERT_STYLES[type] || ALERT_STYLES.info;
  const IconComponent = config.Icon;

  /* ---------- Styles ---------- */

  const wrapperStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    transform: exiting ? 'translateY(-110%)' : 'translateY(0)',
    opacity: exiting ? 0 : 1,
    transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
    animation: !exiting ? 'alertSlideDown 0.4s cubic-bezier(0.16,1,0.3,1)' : undefined,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const bannerStyle = {
    background: config.background,
    color: '#ffffff',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative',
    boxShadow: '0 4px 24px rgba(0,0,0,0.45)',
    borderBottom: type === 'urgent' ? '2px solid' : '1px solid',
    borderColor: config.borderColor,
    animation: type === 'urgent' ? 'urgentPulse 2s ease-in-out infinite' : undefined,
    overflow: 'hidden',
  };

  const iconWrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.18)',
    flexShrink: 0,
  };

  const textContainerStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  };

  const mainTextStyle = {
    fontSize: '0.95rem',
    fontWeight: 600,
    lineHeight: 1.35,
    letterSpacing: '0.01em',
    wordBreak: 'break-word',
  };

  const timestampStyle = {
    fontSize: '0.72rem',
    opacity: 0.75,
    fontWeight: 500,
  };

  const dismissBtnStyle = {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    flexShrink: 0,
    transition: 'background 0.2s',
  };

  const progressBarStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    width: `${progress}%`,
    background: 'rgba(255,255,255,0.45)',
    transition: 'width 0.05s linear',
    borderRadius: '0 2px 0 0',
  };

  const createBtnStyle = {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 6,
    padding: '5px 10px',
    color: '#fff',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    whiteSpace: 'nowrap',
    transition: 'background 0.2s',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const adminFormStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 201,
    background: 'linear-gradient(135deg, #0d1426, #1441a1)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    animation: 'alertSlideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const inputStyle = {
    flex: 1,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#f8fafc',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  };

  const sendBtnStyle = {
    background: '#ef4444',
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    transition: 'background 0.2s',
  };

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes alertSlideDown {
          from { transform: translateY(-110%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes urgentPulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(239,68,68,0.35); }
          50%      { box-shadow: 0 4px 32px rgba(239,68,68,0.65), inset 0 0 12px rgba(255,255,255,0.06); }
        }
      `}</style>

      {/* Admin create-alert form */}
      {isAdmin && showCreateForm && (
        <div style={adminFormStyle}>
          <Bell size={18} color="#f8fafc" />
          <input
            style={inputStyle}
            placeholder="Type urgent alert message…"
            value={newAlertText}
            onChange={(e) => setNewAlertText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            style={sendBtnStyle}
            onClick={handleCreateAlert}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
          >
            <Send size={14} /> Send
          </button>
          <button
            style={{ ...dismissBtnStyle, background: 'rgba(255,255,255,0.1)' }}
            onClick={() => setShowCreateForm(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Admin "Create Alert" floating button (shown when banner is NOT visible) */}
      {isAdmin && !visible && !showCreateForm && (
        <button
          style={{
            position: 'fixed',
            bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
            right: 16,
            zIndex: 199,
            ...createBtnStyle,
            background: 'rgba(220, 38, 38, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            boxShadow: '0 4px 16px rgba(220, 38, 38, 0.4)',
            padding: '10px 16px',
            fontSize: '0.85rem',
            borderRadius: '20px',
          }}
          onClick={() => setShowCreateForm(true)}
        >
          <AlertTriangle size={15} /> Create Alert
        </button>
      )}

      {/* Alert Banner */}
      {visible && (
        <div style={wrapperStyle}>
          <div style={bannerStyle}>
            <div style={iconWrapperStyle}>
              <IconComponent size={20} />
            </div>

            <div style={textContainerStyle}>
              <span style={mainTextStyle}>{alert?.text}</span>
              {alert?.timestamp && (
                <span style={timestampStyle}>{formatTimestamp(alert.timestamp)}</span>
              )}
            </div>

            {/* Admin inline create (shown inside banner) */}
            {isAdmin && (
              <button
                style={createBtnStyle}
                onClick={() => setShowCreateForm(true)}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              >
                <Bell size={12} /> New Alert
              </button>
            )}

            <button
              style={dismissBtnStyle}
              onClick={dismiss}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              aria-label="Dismiss alert"
            >
              <X size={16} />
            </button>

            {/* Progress bar */}
            <div style={progressBarStyle} />
          </div>
        </div>
      )}
    </>
  );
}
