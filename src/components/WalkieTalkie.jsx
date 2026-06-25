// ─── WalkieTalkie.jsx ──────────────────────────────────────────────────
// Walkie-talkie style voice messaging panel for VBT Sports Camp
// ────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  Radio,
  Users,
  Shield,
  Globe,
} from 'lucide-react';
import {
  VoiceRecorder,
  uploadVoiceMessage,
  subscribeToVoiceMessages,
  CHANNELS,
  getChannelLabel,
  getChannelColor,
} from '../voip';
import { playChime } from '../chimes';

// ── Design tokens (inline) ─────────────────────────────────────────────
const T = {
  bgDark: '#0a1020',
  bgSurface: 'rgba(13,20,38,0.55)',
  borderGlow: 'rgba(41,182,246,0.15)',
  borderLight: 'rgba(255,255,255,0.06)',
  vbtBlue: '#0070f3',
  vbtSky: '#29b6f6',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
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

// ── Channel metadata ───────────────────────────────────────────────────
const CHANNEL_META = [
  { key: CHANNELS.COORDINATORS, icon: Shield, color: '#a855f7' },
  { key: CHANNELS.TEAM_LEADERS, icon: Users, color: '#29b6f6' },
  { key: CHANNELS.GAME_LEADERS, icon: Radio, color: '#f59e0b' },
  { key: CHANNELS.GLOBAL, icon: Globe, color: '#22c55e' },
];

/** Which channels each role can access. */
function getAllowedChannels(role) {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return [CHANNELS.COORDINATORS, CHANNELS.TEAM_LEADERS, CHANNELS.GAME_LEADERS, CHANNELS.GLOBAL];
    case 'team leader':
      return [CHANNELS.TEAM_LEADERS, CHANNELS.GLOBAL];
    case 'referee':
    case 'game leader':
      return [CHANNELS.GAME_LEADERS, CHANNELS.GLOBAL];
    default:
      return [CHANNELS.GLOBAL];
  }
}

// ── Utility ────────────────────────────────────────────────────────────
function fmtTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function relativeTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function avatarInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Keyframe injection (runs once) ─────────────────────────────────────
const STYLE_ID = '__walkie-talkie-keyframes';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes wt-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
      50%     { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
    }
    @keyframes wt-wave {
      0%   { transform: scaleY(0.4); }
      50%  { transform: scaleY(1);   }
      100% { transform: scaleY(0.4); }
    }
    @keyframes wt-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// ── Sub-components ─────────────────────────────────────────────────────

/** Individual voice-message bubble */
function MessageBubble({ msg, channelColor }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play();
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setProgress(0); };
    const onTime = () => {
      if (a.duration) setProgress((a.currentTime / a.duration) * 100);
    };
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    a.addEventListener('timeupdate', onTime);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('timeupdate', onTime);
    };
  }, []);

  const roleBadgeColor =
    (msg.senderRole || '').toLowerCase() === 'admin'
      ? '#a855f7'
      : (msg.senderRole || '').toLowerCase() === 'team leader'
      ? '#29b6f6'
      : (msg.senderRole || '').toLowerCase() === 'referee' ||
        (msg.senderRole || '').toLowerCase() === 'game leader'
      ? '#f59e0b'
      : '#22c55e';

  return (
    <div
      style={{
        ...T.glass,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: channelColor || T.vbtBlue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: T.fontTitle,
          fontWeight: 700,
          fontSize: 14,
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {avatarInitials(msg.sender)}
      </div>

      {/* Info + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: T.fontTitle,
              fontWeight: 600,
              fontSize: 14,
              color: T.textPrimary,
            }}
          >
            {msg.sender}
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: T.fontBody,
              fontWeight: 600,
              color: '#fff',
              background: roleBadgeColor,
              borderRadius: 6,
              padding: '2px 7px',
              textTransform: 'capitalize',
            }}
          >
            {msg.senderRole}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: T.fontBody,
              color: T.textSecondary,
              marginLeft: 'auto',
            }}
          >
            {relativeTime(msg.timestamp)}
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 2,
              background: channelColor || T.vbtSky,
              transition: 'width 0.15s linear',
            }}
          />
        </div>

        <span
          style={{
            fontSize: 11,
            fontFamily: T.fontBody,
            color: T.textSecondary,
            marginTop: 2,
            display: 'inline-block',
          }}
        >
          {msg.duration ? fmtTime(msg.duration) : '0:00'}
        </span>
      </div>

      {/* Play / Pause */}
      <button
        onClick={toggle}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: channelColor || T.vbtBlue,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'transform 0.15s',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
      </button>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={msg.audioUrl} preload="metadata" />
    </div>
  );
}

/** Waveform animation shown while recording */
function Waveform() {
  const bars = 20;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: '100%',
            borderRadius: 2,
            background: '#ef4444',
            animation: `wt-wave 0.8s ease-in-out ${(i * 0.06).toFixed(2)}s infinite`,
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
}

/** Spinner shown during upload */
function Spinner({ size = 22, color = '#fff' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `3px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'wt-spin 0.7s linear infinite',
      }}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────

export default function WalkieTalkie({ eventCode, currentUser }) {
  // currentUser shape: { name, role, uid? }
  const allowed = getAllowedChannels(currentUser?.role);
  const [activeChannel, setActiveChannel] = useState(allowed[0] || CHANNELS.GLOBAL);
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);

  const recorderRef = useRef(new VoiceRecorder());
  const feedRef = useRef(null);
  const timerRef = useRef(null);
  const lastPlayedIdRef = useRef(null);
  const initialLoadRef = useRef(true);

  // Inject keyframes once
  useEffect(() => ensureKeyframes(), []);

  // Real-time subscription
  useEffect(() => {
    if (!eventCode) return;
    initialLoadRef.current = true;
    const unsub = subscribeToVoiceMessages(eventCode, activeChannel, (msgs) => {
      setMessages(msgs);
    });
    return unsub;
  }, [eventCode, activeChannel]);

  // Real-time autoplay for incoming messages
  useEffect(() => {
    if (messages.length === 0) return;
    const newestMsg = messages[0]; // descending order, newest is at index 0
    
    if (initialLoadRef.current) {
      lastPlayedIdRef.current = newestMsg.id;
      initialLoadRef.current = false;
      return;
    }

    if (newestMsg.id !== lastPlayedIdRef.current) {
      lastPlayedIdRef.current = newestMsg.id;
      
      // Auto-play if enabled and message is from someone else
      if (autoplayEnabled && newestMsg.sender !== currentUser?.name && newestMsg.audioUrl) {
        // Play the walkie talkie beep first
        playChime('walkie');
        
        // Wait 350ms for beep, then play voice message
        setTimeout(() => {
          const audio = new Audio(newestMsg.audioUrl);
          audio.play().catch((err) => {
            console.warn('Autoplay blocked by browser. User interaction required.', err);
          });
        }, 350);
      }
    }
  }, [messages, autoplayEnabled, currentUser]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Recording timer
  useEffect(() => {
    if (recording) {
      setRecordTimer(0);
      timerRef.current = setInterval(() => setRecordTimer((t) => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    try {
      await recorderRef.current.startRecording();
      setRecording(true);
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!recorderRef.current.isRecording()) return;
    try {
      setRecording(false);
      setUploading(true);
      const { blob, duration } = await recorderRef.current.stopRecording();
      await uploadVoiceMessage(
        blob,
        eventCode,
        activeChannel,
        currentUser?.name || 'Unknown',
        currentUser?.role || 'viewer',
      );
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  }, [eventCode, activeChannel, currentUser]);

  const handleCancelRecording = useCallback(() => {
    recorderRef.current.cancel();
    setRecording(false);
  }, []);

  // Toggle mode (tap to start / tap to stop)
  const handlePTTClick = useCallback(() => {
    if (recording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  }, [recording, handleStartRecording, handleStopRecording]);

  const channelColor = getChannelColor(activeChannel);

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        ...T.glass,
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '85vh',
        overflow: 'hidden',
        fontFamily: T.fontBody,
        color: T.textPrimary,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${T.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Radio size={20} style={{ color: channelColor }} />
          <span
            style={{
              fontFamily: T.fontTitle,
              fontWeight: 700,
              fontSize: 18,
              background: T.gradientVbt,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Walkie-Talkie
          </span>
        </div>

        {/* Live Autoplay Toggle */}
        <button
          onClick={() => setAutoplayEnabled((prev) => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid ${autoplayEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
            background: autoplayEnabled ? 'rgba(34,197,94,0.1)' : 'transparent',
            color: autoplayEnabled ? '#22c55e' : T.textSecondary,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: autoplayEnabled ? '#22c55e' : '#ef4444',
              display: 'inline-block',
            }}
          />
          {autoplayEnabled ? 'Live On' : 'Live Muted'}
        </button>
      </div>

      {/* ── Channel Selector ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '14px 20px',
          overflowX: 'auto',
          borderBottom: `1px solid ${T.borderLight}`,
        }}
      >
        {CHANNEL_META.filter((ch) => allowed.includes(ch.key)).map(({ key, icon: Icon, color }) => {
          const isActive = key === activeChannel;
          return (
            <button
              key={key}
              onClick={() => setActiveChannel(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                border: isActive ? `2px solid ${color}` : `1px solid ${T.borderLight}`,
                background: isActive ? `${color}22` : 'transparent',
                color: isActive ? color : T.textSecondary,
                fontFamily: T.fontBody,
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: isActive ? `0 0 14px ${color}33` : 'none',
              }}
            >
              <Icon size={14} />
              {getChannelLabel(key)}
            </button>
          );
        })}
      </div>

      {/* ── Messages Feed ─────────────────────────────────────────── */}
      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: T.textSecondary,
              fontSize: 14,
            }}
          >
            <MicOff size={32} style={{ opacity: 0.3 }} />
            <span>No messages yet on this channel</span>
          </div>
        )}

        {/* Render oldest first (array is desc from Firestore) */}
        {[...messages].reverse().map((msg) => (
          <MessageBubble key={msg.id} msg={msg} channelColor={channelColor} />
        ))}
      </div>

      {/* ── Recording indicator / waveform ────────────────────────── */}
      {recording && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: '10px 20px',
            borderTop: `1px solid ${T.borderLight}`,
            background: 'rgba(239,68,68,0.06)',
          }}
        >
          <Waveform />
          <span
            style={{
              fontFamily: T.fontTitle,
              fontWeight: 700,
              fontSize: 16,
              color: '#ef4444',
              minWidth: 42,
              textAlign: 'center',
            }}
          >
            {fmtTime(recordTimer)}
          </span>
          <button
            onClick={handleCancelRecording}
            style={{
              fontSize: 11,
              fontFamily: T.fontBody,
              fontWeight: 600,
              color: T.textSecondary,
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 8,
              padding: '4px 12px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Push-to-Talk Button ────────────────────────────────────── */}
      <div
        style={{
          padding: '16px 20px 20px',
          borderTop: `1px solid ${T.borderLight}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          onClick={handlePTTClick}
          disabled={uploading}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.93)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            border: recording ? '3px solid #ef4444' : `3px solid ${channelColor}`,
            background: recording
              ? 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)'
              : T.gradientVbt,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            transition: 'transform 0.15s, box-shadow 0.3s, border-color 0.3s',
            animation: recording ? 'wt-pulse 1.4s ease-in-out infinite' : 'none',
            boxShadow: recording
              ? '0 0 24px rgba(239,68,68,0.4)'
              : `0 0 20px ${channelColor}33`,
            opacity: uploading ? 0.6 : 1,
          }}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {uploading ? (
            <Spinner size={24} />
          ) : recording ? (
            <MicOff size={28} />
          ) : (
            <Mic size={28} />
          )}
        </button>

        <span
          style={{
            fontSize: 11,
            fontFamily: T.fontBody,
            color: T.textSecondary,
          }}
        >
          {uploading
            ? 'Sending…'
            : recording
            ? 'Tap to send • or Cancel'
            : 'Tap to record'}
        </span>
      </div>

      {/* ── Status Bar ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 20px',
          borderTop: `1px solid ${T.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 11,
          fontFamily: T.fontBody,
          color: T.textSecondary,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: channelColor,
            display: 'inline-block',
            boxShadow: `0 0 6px ${channelColor}`,
          }}
        />
        <span>
          Channel: <strong style={{ color: channelColor }}>{getChannelLabel(activeChannel)}</strong>
        </span>
        <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span>
        <span>{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
