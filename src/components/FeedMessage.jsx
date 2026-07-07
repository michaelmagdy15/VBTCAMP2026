import React, { useState } from 'react';
import { MessageCircle, AlertTriangle } from 'lucide-react';

/* ── Helper: relative time ─────────────────────────────────── */
function getRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/* ── Helper: role colour ───────────────────────────────────── */
function getRoleColor(role, sender) {
  if (sender && sender.toLowerCase() === 'system') return '#38bdf8';
  if (!role) return '#94a3b8';
  const norm = role.toLowerCase();
  const map = {
    admin: '#a78bfa',
    leader: '#29b6f6',
    referee: '#22c55e',
    'game leader': '#f97316',
    viewer: '#94a3b8',
  };
  return map[norm] || '#94a3b8';
}

/* ── Helper: role label ────────────────────────────────────── */
function getRoleLabel(role, sender) {
  if (sender && sender.toLowerCase() === 'system') return 'System';
  if (!role) return 'Viewer';
  const norm = role.toLowerCase();
  const labels = {
    admin: 'Admin',
    leader: 'Leader',
    referee: 'Referee',
    'game leader': 'Game Leader',
    viewer: 'Viewer',
  };
  return labels[norm] || role;
}

/* ── Emoji set used in the reaction row ────────────────────── */
const REACTION_EMOJIS = ['👍', '🎉', '🔥'];

/* ── Component ─────────────────────────────────────────────── */
function FeedMessage({ message, currentUser, onReact }) {
  const {
    id,
    text,
    sender,
    senderRole,
    type,
    timestamp,
    imageUrl,
    reactions = {},
  } = message || {};

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const roleColor = getRoleColor(senderRole, sender);
  const avatarLetter = sender ? sender.charAt(0).toUpperCase() : '?';

  /* ── Ping (urgent) wrapper colours ───────────────────────── */
  const isPing = type === 'ping';
  const isScoreUpdate = type === 'score_update';
  const isBlessing = type === 'blessing';

  const cardBorder = isPing
    ? '1px solid rgba(239,68,68,0.45)'
    : isScoreUpdate
    ? '1px solid rgba(41,182,246,0.3)'
    : isBlessing
    ? '2px solid rgba(251,191,36,0.5)'
    : '1px solid rgba(41,182,246,0.15)';

  const cardBg = isPing
    ? 'rgba(239,68,68,0.08)'
    : isBlessing
    ? 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(13,20,38,0.65) 100%)'
    : 'rgba(13,20,38,0.55)';

  /* ── Handlers ────────────────────────────────────────────── */
  const handleReact = (emoji) => {
    if (onReact) onReact(id, emoji);
  };

  const hasReacted = (emoji) => {
    const list = reactions[emoji];
    if (!list) return false;
    if (Array.isArray(list)) return list.includes(currentUser);
    return false;
  };

  const reactionCount = (emoji) => {
    const list = reactions[emoji];
    if (!list) return 0;
    if (Array.isArray(list)) return list.length;
    if (typeof list === 'number') return list;
    return 0;
  };

  /* ════════════════════════  RENDER  ════════════════════════ */
  return (
    <>
      <div
        style={{
          background: cardBg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: cardBorder,
          borderRadius: 16,
          padding: '16px 18px',
          marginBottom: 14,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#ffffff',
          position: 'relative',
          transition: 'box-shadow 0.25s ease, transform 0.2s ease',
        }}
      >
        {/* ── Sender identity row ──────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: '#fff',
              flexShrink: 0,
              boxShadow: `0 0 10px ${roleColor}44`,
            }}
          >
            {avatarLetter}
          </div>

          {/* Name */}
          <span
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: '#ffffff',
              lineHeight: 1.2,
            }}
          >
            {sender}
          </span>

          {/* Role badge pill */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              color: '#fff',
              background: `${roleColor}33`,
              border: `1px solid ${roleColor}55`,
              letterSpacing: 0.3,
              lineHeight: 1.6,
              whiteSpace: 'nowrap',
            }}
          >
            {getRoleLabel(senderRole, sender)}
          </span>

          {/* Timestamp */}
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            {getRelativeTime(timestamp)}
          </span>
        </div>

        {/* ── Message content ──────────────────────────────── */}
        <div style={{ marginBottom: reactions && Object.keys(reactions).length ? 10 : 0 }}>
          {/* Ping indicator */}
          {isPing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}
            >
              <AlertTriangle size={14} color="#ef4444" strokeWidth={2.5} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Urgent
              </span>
            </div>
          )}

          {/* Score update badge */}
          {isScoreUpdate && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                marginBottom: 8,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                color: '#29b6f6',
                background: 'rgba(41,182,246,0.12)',
                border: '1px solid rgba(41,182,246,0.25)',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              <MessageCircle size={13} color="#29b6f6" strokeWidth={2.5} />
              Score Update
            </div>
          )}

          {/* Blessing praise badge */}
          {isBlessing && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                marginBottom: 8,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                color: '#fbbf24',
                background: 'rgba(251,191,36,0.12)',
                border: '1px solid rgba(251,191,36,0.25)',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
              }}
            >
              <span>🌟 Value Blessing</span>
            </div>
          )}

          {/* Text */}
          {text && (
            <p
              style={{
                margin: 0,
                fontSize: 16,
                lineHeight: 1.55,
                color: isPing ? '#fca5a5' : 'rgba(255,255,255,0.88)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                wordBreak: 'break-word',
              }}
            >
              {text}
            </p>
          )}

          {/* Image */}
          {imageUrl && (
            <img
              loading="lazy" // ⚡ Bolt Optimization: Defer loading of off-screen feed images to save initial network bandwidth and improve page load time.
              src={imageUrl}
              alt="attachment"
              onClick={() => setLightboxOpen(true)}
              style={{
                marginTop: 10,
                maxWidth: '100%',
                maxHeight: 260,
                borderRadius: 12,
                objectFit: 'cover',
                cursor: 'pointer',
                border: '1px solid rgba(41,182,246,0.12)',
                transition: 'opacity 0.2s ease',
              }}
            />
          )}
        </div>

        {/* ── Reaction row ─────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 4,
          }}
        >
          {REACTION_EMOJIS.map((emoji) => {
            const active = hasReacted(emoji);
            const count = reactionCount(emoji);
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 14,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: active
                    ? '1px solid rgba(41,182,246,0.6)'
                    : '1px solid rgba(255,255,255,0.12)',
                  background: active
                    ? 'rgba(41,182,246,0.22)'
                    : 'rgba(255,255,255,0.06)',
                  color: active ? '#29b6f6' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                  outline: 'none',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
                {count > 0 && (
                  <span style={{ fontSize: 13, marginLeft: 2 }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Lightbox overlay ───────────────────────────────── */}
      {lightboxOpen && imageUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <img
            src={imageUrl}
            alt="full view"
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              borderRadius: 14,
              objectFit: 'contain',
              boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}
    </>
  );
}

const MemoizedFeedMessage = React.memo(FeedMessage, (prevProps, nextProps) => {
  const prevMsg = prevProps.message || {};
  const nextMsg = nextProps.message || {};
  
  // Only re-render if the message content, image, timestamp, user, or reactions have changed.
  // This bypasses parent-level callback recreation (onReact) to prevent 50+ list items re-rendering.
  return (
    prevMsg.id === nextMsg.id &&
    prevMsg.text === nextMsg.text &&
    prevMsg.imageUrl === nextMsg.imageUrl &&
    prevMsg.timestamp === nextMsg.timestamp &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    JSON.stringify(prevMsg.reactions) === JSON.stringify(nextMsg.reactions)
  );
});

export default MemoizedFeedMessage;
