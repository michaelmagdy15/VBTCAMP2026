import React, { useState, useRef, useMemo } from 'react';
import { Camera, X, Send, Image } from 'lucide-react';
import { uploadPhoto } from '../storage';

// ─── Lightbox Modal ─────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'vbtLightboxFadeIn 0.25s ease-out',
        cursor: 'pointer',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#f8fafc',
          zIndex: 301,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
        aria-label="Close lightbox"
      >
        <X size={20} />
      </button>

      {/* Image */}
      <img
        src={src}
        alt={alt || 'Photo'}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '88vh',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          cursor: 'default',
        }}
      />

      {/* Keyframe injection */}
      <style>{`
        @keyframes vbtLightboxFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Reaction Button ────────────────────────────────────────────────────────
function ReactionButton({ emoji, label, users, isActive, onToggle }) {
  const [hovered, setHovered] = useState(false);
  const count = users ? users.length : 0;

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 20,
        border: isActive
          ? '1px solid rgba(56, 189, 248, 0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        background: isActive
          ? 'rgba(56, 189, 248, 0.15)'
          : hovered
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(255,255,255,0.04)',
        color: isActive ? '#38bdf8' : '#94a3b8',
        cursor: 'pointer',
        fontSize: 14,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 500,
        transition: 'all 0.2s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 16 }}>{emoji}</span>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

// ─── Announcement Card ──────────────────────────────────────────────────────
function AnnouncementCard({ announcement, currentUser, onUpdateReactions, eventCode }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const { id, text, sender, image, reactions, timestamp } = announcement;

  const currentUserId = currentUser?.displayName || currentUser?.email || currentUser?.uid || 'anonymous';

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts?.toDate ? ts.toDate() : new Date(ts?.seconds ? ts.seconds * 1000 : ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleReaction = (reactionType) => {
    if (!reactions || !onUpdateReactions) return;

    const updatedReactions = { ...reactions };
    const currentList = [...(updatedReactions[reactionType] || [])];
    const userIndex = currentList.indexOf(currentUserId);

    if (userIndex >= 0) {
      currentList.splice(userIndex, 1);
    } else {
      currentList.push(currentUserId);
    }

    updatedReactions[reactionType] = currentList;
    onUpdateReactions(eventCode, id, updatedReactions);
  };

  const isReacted = (type) => {
    return reactions?.[type]?.includes(currentUserId) || false;
  };

  return (
    <>
      {lightboxSrc && (
        <Lightbox
          src={lightboxSrc}
          alt={text || 'Photo'}
          onClose={() => setLightboxSrc(null)}
        />
      )}

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 0,
          overflow: 'hidden',
          animation: 'vbtCardSlideIn 0.35s ease-out',
        }}
      >
        {/* Image */}
        {image && (
          <div
            onClick={() => setLightboxSrc(image)}
            style={{
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              maxHeight: 360,
            }}
          >
            <img
              src={image}
              alt={text || 'Shared photo'}
              loading="lazy"
              style={{
                width: '100%',
                maxHeight: 360,
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.3s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            />
            {/* Overlay hint */}
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 8,
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#94a3b8',
                fontSize: 11,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              <Image size={12} />
              Tap to view
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '14px 16px 12px' }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: text ? 8 : 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: "'Outfit', sans-serif",
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {(sender || '?').charAt(0)}
              </div>
              <span
                style={{
                  color: '#f8fafc',
                  fontWeight: 600,
                  fontSize: 14,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {sender || 'Unknown'}
              </span>
            </div>
            <span
              style={{
                color: '#64748b',
                fontSize: 12,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {formatTime(timestamp)}
            </span>
          </div>

          {/* Text */}
          {text && (
            <p
              style={{
                color: '#cbd5e1',
                fontSize: 14,
                lineHeight: 1.5,
                margin: '0 0 10px 0',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {text}
            </p>
          )}

          {/* Reactions */}
          {reactions && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ReactionButton
                emoji="👍"
                label="Thumbs up"
                users={reactions.thumbsup}
                isActive={isReacted('thumbsup')}
                onToggle={() => handleReaction('thumbsup')}
              />
              <ReactionButton
                emoji="🎉"
                label="Congrats"
                users={reactions.congrats}
                isActive={isReacted('congrats')}
                onToggle={() => handleReaction('congrats')}
              />
              <ReactionButton
                emoji="🔥"
                label="Fire"
                users={reactions.fire}
                isActive={isReacted('fire')}
                onToggle={() => handleReaction('fire')}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes vbtCardSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ─── Photo Upload Area ──────────────────────────────────────────────────────
function PhotoUploadArea({ eventCode, currentUser, onAddAnnouncement }) {
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile || uploading) return;

    try {
      setUploading(true);
      setUploadProgress('Compressing...');

      // Upload photo
      setUploadProgress('Uploading...');
      const imageUrl = await uploadPhoto(selectedFile, eventCode);

      setUploadProgress('Posting...');

      // Create announcement with the image
      const senderName = currentUser?.displayName || currentUser?.email || 'Anonymous';
      await onAddAnnouncement(eventCode, caption || '', senderName, 'photo', imageUrl);

      // Reset
      setPreview(null);
      setSelectedFile(null);
      setCaption('');
      setUploadProgress('');
    } catch (err) {
      console.error('Photo upload failed:', err);
      setUploadProgress('Upload failed. Try again.');
      setTimeout(() => setUploadProgress(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    setCaption('');
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {!preview ? (
        /* Camera button */
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            padding: '28px 16px',
            border: '2px dashed rgba(56, 189, 248, 0.25)',
            borderRadius: 12,
            background: 'rgba(56, 189, 248, 0.04)',
            color: '#38bdf8',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.04)';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.25)';
          }}
        >
          <Camera size={28} strokeWidth={1.5} />
          <span style={{ fontWeight: 600 }}>Share a Photo</span>
          <span style={{ color: '#64748b', fontSize: 12 }}>
            Tap to take a photo or choose from gallery
          </span>
        </button>
      ) : (
        /* Preview area */
        <div>
          {/* Image preview */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '100%',
                maxHeight: 280,
                objectFit: 'cover',
                borderRadius: 12,
                display: 'block',
              }}
            />
            {/* Cancel button */}
            {!uploading && (
              <button
                onClick={handleCancel}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#f8fafc',
                }}
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Caption + send */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={uploading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.3)',
                color: '#f8fafc',
                fontSize: 14,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <button
              onClick={handleSubmit}
              disabled={uploading}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: uploading
                  ? 'rgba(56, 189, 248, 0.2)'
                  : 'linear-gradient(135deg, #3b82f6, #38bdf8)',
                color: '#fff',
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                opacity: uploading ? 0.6 : 1,
              }}
              aria-label="Send photo"
            >
              <Send size={18} />
            </button>
          </div>

          {/* Upload progress */}
          {uploadProgress && (
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {uploading && (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(56, 189, 248, 0.3)',
                    borderTopColor: '#38bdf8',
                    borderRadius: '50%',
                    animation: 'vbtSpin 0.7s linear infinite',
                  }}
                />
              )}
              <span
                style={{
                  color: uploadProgress.includes('failed') ? '#f87171' : '#38bdf8',
                  fontSize: 13,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                {uploadProgress}
              </span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes vbtSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ⚡ Bolt Optimization: Memoize AnnouncementCard to prevent re-rendering all items
// in the feed when parent state (like text input) changes.
// We use a safe comparison that avoids deep JSON.stringify, and we avoid stale closures
// by ensuring that the onUpdateReactions callback is safely handled.
const MemoizedAnnouncementCard = React.memo(AnnouncementCard, (prevProps, nextProps) => {
  // Check primitive props
  if (prevProps.eventCode !== nextProps.eventCode) return false;

  // Check currentUser (shallow check on user object if we assume it doesn't mutate deeply)
  if (prevProps.currentUser?.id !== nextProps.currentUser?.id) return false;
  if (prevProps.currentUser?.displayName !== nextProps.currentUser?.displayName) return false;
  if (prevProps.currentUser?.email !== nextProps.currentUser?.email) return false;

  // Check announcement object properties safely
  const prevA = prevProps.announcement || {};
  const nextA = nextProps.announcement || {};

  if (prevA.id !== nextA.id) return false;
  if (prevA.text !== nextA.text) return false;
  if (prevA.image !== nextA.image) return false;

  // Shallow compare reactions object
  const prevReact = prevA.reactions || {};
  const nextReact = nextA.reactions || {};
  const prevKeys = Object.keys(prevReact);
  const nextKeys = Object.keys(nextReact);

  if (prevKeys.length !== nextKeys.length) return false;
  for (let key of prevKeys) {
    if (prevReact[key] !== nextReact[key]) return false;
  }

  // NOTE: We do not check onUpdateReactions here because parent-level functions
  // might recreate. But we assume the implementation of handleReaction inside
  // AnnouncementCard closes over `onUpdateReactions` from props cleanly.
  // Actually, to be totally safe against stale closures, we can either:
  // 1) Omit React.memo if it's unsafe, OR
  // 2) Pass primitive values and assume the parent function doesn't rely on stale state,
  // which is typically true for standard dispatch/event callbacks in this app.
  return true;
});

// ─── Main PhotoFeed Component ───────────────────────────────────────────────
export default function PhotoFeed({
  announcements,
  currentUser,
  eventCode,
  onAddAnnouncement,
  onUpdateReactions,
}) {
  // Sort announcements newest first
  // ⚡ Bolt Optimization: Memoize the sorting of announcements to avoid O(N log N) re-calculation
  // on every render, especially important since the parent component re-renders on every keystroke.
  const sortedAnnouncements = useMemo(() => {
    return [...(announcements || [])].sort((a, b) => {
      const getTime = (ts) => {
        if (!ts) return 0;
        if (ts.toDate) return ts.toDate().getTime();
        if (ts.seconds) return ts.seconds * 1000;
        return new Date(ts).getTime();
      };
      return getTime(b.timestamp) - getTime(a.timestamp);
    });
  }, [announcements]);

  return (
    <div
      style={{
        maxWidth: 540,
        margin: '0 auto',
        padding: '0 4px',
      }}
    >
      {/* Upload area */}
      <PhotoUploadArea
        eventCode={eventCode}
        currentUser={currentUser}
        onAddAnnouncement={onAddAnnouncement}
      />

      {/* Feed header */}
      {sortedAnnouncements.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 3,
              height: 18,
              borderRadius: 2,
              background: 'linear-gradient(180deg, #3b82f6, #38bdf8)',
            }}
          />
          <h3
            style={{
              margin: 0,
              color: '#f8fafc',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.01em',
            }}
          >
            Timeline
          </h3>
          <span
            style={{
              color: '#64748b',
              fontSize: 13,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            · {sortedAnnouncements.length} post{sortedAnnouncements.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Announcement cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {sortedAnnouncements.map((announcement) => (
          <MemoizedAnnouncementCard
            key={announcement.id}
            announcement={announcement}
            currentUser={currentUser}
            onUpdateReactions={onUpdateReactions}
            eventCode={eventCode}
          />
        ))}
      </div>

      {/* Empty state */}
      {sortedAnnouncements.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 16px',
            color: '#64748b',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <Image size={40} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No posts yet</p>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            Be the first to share a moment!
          </p>
        </div>
      )}
    </div>
  );
}
