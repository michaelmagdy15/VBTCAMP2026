import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Play, Pause, Radio, Users, Shield, Globe, Trash2 } from 'lucide-react';
import {
  VoiceRecorder,
  uploadVoiceMessage,
  subscribeToVoiceMessages,
  clearVoiceMessages,
  CHANNELS,
  getChannelLabel,
  getChannelColor
} from '../voip';
import { playChime } from '../chimes';
import { agoraClient, AGORA_APP_ID } from '../agoraConfig';
import { acquireChannelLock, releaseChannelLock, subscribeToChannelLock } from '../liveAudio';
import { AgoraRTCProvider, useJoin, useLocalMicrophoneTrack, useRemoteUsers, useRemoteAudioTracks, usePublish } from "agora-rtc-react";

// ── Design tokens (inline) ─────────────────────────────────────────────
const T = {
  bgDark: '#0a1020',
  bgSurface: 'rgba(13,20,38,0.55)',
  borderGlow: 'rgba(41,182,246,0.15)',
  borderLight: 'rgba(255,255,255,0.06)',
  vbtBlue: '#0070f3',
  vbtSky: '#29b6f6',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.85)',
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
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Sub-components ─────────────────────────────────────────────────────

/** Individual voice-message bubble (for Replay History) */
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
      const playPromise = a.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.warn('Audio play error:', e));
      }
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
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: channelColor || T.vbtBlue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: T.fontTitle,
          fontWeight: 700,
          fontSize: 16,
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
              fontWeight: 650,
              fontSize: 16,
              color: T.textPrimary,
            }}
          >
            {msg.sender}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: T.fontBody,
              fontWeight: 700,
              color: '#fff',
              background: roleBadgeColor,
              borderRadius: 6,
              padding: '3px 8px',
              textTransform: 'capitalize',
            }}
          >
            {msg.senderRole}
          </span>
          <span
            style={{
              fontSize: 13,
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
            height: 6,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 3,
              background: channelColor || T.vbtSky,
              transition: 'width 0.15s linear',
            }}
          />
        </div>

        <span
          style={{
            fontSize: 13,
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
          width: 44,
          height: 44,
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
        onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
        onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
      </button>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={msg.audioUrl} preload="metadata" playsInline />
    </div>
  );
}

/** Waveform animation shown while talking */
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

// ── Main component Inner ───────────────────────────────────────────────

function WalkieTalkieInner({ eventCode, currentUser }) {
  const allowed = getAllowedChannels(currentUser?.role);
  const [activeChannel, setActiveChannel] = useState(allowed[0] || CHANNELS.GLOBAL);
  
  const [mySessionId] = useState(() => currentUser?.uid || Math.random().toString(36).slice(2));
  const [channelLock, setChannelLock] = useState({ isBusy: false, currentSpeakerUid: null, currentSpeakerName: null });
  const [amISpeaking, setAmISpeaking] = useState(false);

  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const recorderRef = useRef(new VoiceRecorder());
  const feedRef = useRef(null);

  // Agora Integration
  useJoin({
    appid: AGORA_APP_ID,
    channel: `${eventCode}_${activeChannel}`,
    token: null,
  }, !!eventCode && !!activeChannel);

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
  usePublish([localMicrophoneTrack]);

  const remoteUsers = useRemoteUsers();
  const { audioTracks } = useRemoteAudioTracks(remoteUsers);

  // Auto-play incoming audio
  useEffect(() => {
    audioTracks.forEach((track) => track.play());
  }, [audioTracks]);

  // Sync Mute state
  useEffect(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setMuted(!amISpeaking);
    }
  }, [amISpeaking, localMicrophoneTrack]);

  // Subscribe to channel lock
  useEffect(() => {
    if (!eventCode) return;
    return subscribeToChannelLock(`${eventCode}_${activeChannel}`, (data) => {
      setChannelLock(data);
    });
  }, [eventCode, activeChannel]);

  // Subscribe to voice messages for the replay feed
  useEffect(() => {
    if (!eventCode) return;
    return subscribeToVoiceMessages(eventCode, activeChannel, (msgs) => {
      setMessages(msgs);
    });
  }, [eventCode, activeChannel]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Play a beep for listeners when someone starts broadcasting
  useEffect(() => {
    if (channelLock.isBusy && channelLock.currentSpeakerUid !== mySessionId) {
      playChime('walkie');
    }
  }, [channelLock.isBusy, channelLock.currentSpeakerUid, mySessionId]);

  // PTT Handlers
  const handleStartTalk = async () => {
    if (channelLock.isBusy && channelLock.currentSpeakerUid !== mySessionId) {
      // Someone else is talking!
      playChime('error');
      return;
    }
    const success = await acquireChannelLock(`${eventCode}_${activeChannel}`, currentUser?.role || 'viewer', currentUser?.name || 'Unknown', mySessionId);
    if (success) {
      playChime('walkie');
      setAmISpeaking(true);
      
      // Start recording locally for the replay feed
      try {
        await recorderRef.current.startRecording();
      } catch (err) {
        console.error('Microphone access denied for recording', err);
      }
    } else {
      playChime('error');
    }
  };

  const handleStopTalk = async () => {
    if (amISpeaking) {
      setAmISpeaking(false);
      await releaseChannelLock(`${eventCode}_${activeChannel}`, mySessionId);
      
      // Stop recording and upload for replay history
      if (recorderRef.current.isRecording()) {
        try {
          setUploading(true);
          const { blob, duration } = await recorderRef.current.stopRecording();
          await uploadVoiceMessage(
            blob,
            eventCode,
            activeChannel,
            currentUser?.name || 'Unknown',
            currentUser?.role || 'viewer',
            duration
          );
        } catch (err) {
          console.error('Upload failed', err);
        } finally {
          setUploading(false);
        }
      }
    }
  };

  // Global mouse up for safety
  useEffect(() => {
    const onEnd = () => handleStopTalk();
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [amISpeaking, activeChannel, eventCode, mySessionId, currentUser]);

  const channelColor = getChannelColor(activeChannel);
  const isSomeoneElseSpeaking = channelLock.isBusy && channelLock.currentSpeakerUid !== mySessionId;

  return (
    <div
      className="wt-outer-container"
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
        width: '100%',
        boxSizing: 'border-box',
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
            Live Walkie-Talkie
          </span>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                if (window.confirm('Clear all messages in ' + getChannelLabel(activeChannel) + '?')) {
                  clearVoiceMessages(eventCode, activeChannel)
                    .catch((err) => alert('Error clearing messages: ' + err.message));
                }
              }}
              style={{
                marginLeft: 4,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                borderRadius: 8,
              }}
              title="Clear Channel"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#22c55e', fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'wt-pulse 1.4s ease-in-out infinite' }} />
          Live
        </div>
      </div>

      {/* ── Channel Selector ──────────────────────────────────────── */}
      <div
        className="wt-channel-scroller"
        style={{
          display: 'flex',
          gap: 8,
          padding: '14px 20px',
          overflowX: 'auto',
          borderBottom: `1px solid ${T.borderLight}`,
          boxSizing: 'border-box',
          width: '100%',
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
                gap: 8,
                padding: '10px 16px',
                borderRadius: 12,
                border: isActive ? `2px solid ${color}` : `1px solid ${T.borderLight}`,
                background: isActive ? `${color}22` : 'transparent',
                color: isActive ? color : T.textSecondary,
                fontFamily: T.fontBody,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                boxShadow: isActive ? `0 0 14px ${color}33` : 'none',
              }}
            >
              <Icon size={16} />
              {getChannelLabel(key)}
            </button>
          );
        })}
      </div>

      {/* ── Feed Area ─────────────────────────────────── */}
      <div
        ref={feedRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        
        {/* Remote Active Speaker */}
        {channelLock.isBusy && channelLock.currentSpeakerUid !== mySessionId && (
          <div
            style={{
              ...T.glass,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: `1px solid ${channelColor}`,
              background: `${channelColor}22`,
            }}
          >
            <div
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: channelColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.fontTitle, fontWeight: 700, fontSize: 16, color: '#fff',
                boxShadow: `0 0 15px ${channelColor}`,
              }}
            >
              {avatarInitials(channelLock.currentSpeakerName || 'User')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.fontTitle, fontWeight: 650, fontSize: 16, color: T.textPrimary }}>
                {channelLock.currentSpeakerName || 'Unknown User'}
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
                Talking right now...
              </div>
            </div>
            <Waveform />
          </div>
        )}

        {/* Local Active Speaker */}
        {amISpeaking && (
          <div
            style={{
              ...T.glass,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              border: `1px solid #ef4444`,
              background: 'rgba(239, 68, 68, 0.1)',
            }}
          >
            <div
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: channelColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.fontTitle, fontWeight: 700, fontSize: 16, color: '#fff',
                boxShadow: `0 0 15px #ef4444`,
              }}
            >
              {avatarInitials(currentUser?.name || 'Me')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.fontTitle, fontWeight: 650, fontSize: 16, color: T.textPrimary }}>
                {currentUser?.name || 'Me'} (You)
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
                Talking...
              </div>
            </div>
            <Waveform />
          </div>
        )}

        {/* Replay History */}
        {messages.length === 0 && !channelLock.isBusy && !amISpeaking && (
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
              padding: '20px 0'
            }}
          >
            <MicOff size={32} style={{ opacity: 0.3 }} />
            <span>No recent broadcasts on this channel</span>
          </div>
        )}

        {/* Render oldest first */}
        {[...messages].reverse().map((msg) => (
          <MessageBubble key={msg.id} msg={msg} channelColor={channelColor} />
        ))}
      </div>

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
          onMouseDown={handleStartTalk}
          onTouchStart={(e) => { e.preventDefault(); handleStartTalk(); }}
          style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            border: amISpeaking ? '3px solid #ef4444' : `3px solid ${channelColor}`,
            background: amISpeaking
              ? 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)'
              : (isSomeoneElseSpeaking ? '#333' : T.gradientVbt),
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isSomeoneElseSpeaking || uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
            animation: amISpeaking ? 'wt-pulse 1.4s ease-in-out infinite' : 'none',
            boxShadow: amISpeaking
              ? '0 0 24px rgba(239,68,68,0.4)'
              : (isSomeoneElseSpeaking ? 'none' : `0 0 20px ${channelColor}33`),
            opacity: isSomeoneElseSpeaking || uploading ? 0.5 : 1,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          aria-label="Push to talk"
        >
          {uploading ? <Spinner size={24} /> : isSomeoneElseSpeaking ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        <span
          style={{
            fontSize: 14,
            fontFamily: T.fontBody,
            fontWeight: 600,
            color: isSomeoneElseSpeaking ? '#ef4444' : T.textSecondary,
          }}
        >
          {uploading 
            ? 'Saving replay...' 
            : isSomeoneElseSpeaking 
              ? `${channelLock.currentSpeakerName || 'Someone'} is talking...`
              : 'Hold to Talk'}
        </span>
      </div>
    </div>
  );
}

// ── Export Wrapper ─────────────────────────────────────────────────────
export default function WalkieTalkie(props) {
  return (
    <AgoraRTCProvider client={agoraClient}>
      <WalkieTalkieInner {...props} />
    </AgoraRTCProvider>
  );
}
