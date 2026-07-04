import React from 'react';
import { Camera, Send } from 'lucide-react';
import FeedMessage from './FeedMessage';
import PhotoFeed from './PhotoFeed';

export default function TimelineFeedTab({
  announcements,
  announcementText,
  uploadImage,
  fileInputRef,
  currentUser,
  currentEventCode,
  eventLabels,
  firebaseConnected,
  setShowFeedbackModal,
  setAnnouncementText,
  setUploadImage,
  handlePostAnnouncement,
  handleImageChange,
  handleToggleReaction,
  addAnnouncement,
  updateAnnouncementReactions
}) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Feedback button */}
        <button onClick={() => setShowFeedbackModal(true)} style={{
          padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(74,222,128,0.3)',
          background: 'rgba(74,222,128,0.08)', color: '#4ade80', fontWeight: '600', fontSize: '0.85rem',
          cursor: 'pointer', alignSelf: 'flex-start',
        }}>{eventLabels.rateBtn}</button>
        <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>{eventLabels.feedHeading}</h2>
        
        <form onSubmit={handlePostAnnouncement} className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text"
              placeholder="Post announcement or upload photo..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-light)',
                color: '#ffffff',
                outline: 'none',
                fontSize: '0.875rem'
              }}
            />
            
            <input 
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-light)',
                color: uploadImage ? 'var(--vbt-sky)' : '#ffffff',
                padding: '10px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Camera size={16} />
            </button>

            <button 
              type="submit"
              style={{
                background: 'var(--gradient-vbt)',
                border: 'none',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Send size={16} />
            </button>
          </div>

          {uploadImage && (
            <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--vbt-sky)' }}>
              <img src={uploadImage} alt="Upload Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                type="button"
                onClick={() => setUploadImage(null)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
          )}
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {announcements.length === 0 && !firebaseConnected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '12px' }} />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📢</div>
              <div className="empty-state-title">No announcements yet</div>
              <div className="empty-state-desc">Feed items and announcements will appear here once they are posted.</div>
            </div>
          ) : (
            announcements.map((feed) => (
              <FeedMessage
                key={feed.id}
                message={{
                  id: feed.id,
                  text: feed.text,
                  sender: feed.sender,
                  senderRole: feed.senderRole || 'viewer',
                  type: feed.type,
                  timestamp: feed.timestamp,
                  imageUrl: feed.image || feed.imageUrl,
                  reactions: {
                    '👍': feed.reactions?.thumbsup || [],
                    '🎉': feed.reactions?.congrats || [],
                    '🔥': feed.reactions?.fire || []
                  }
                }}
                currentUser={currentUser?.name}
                onReact={(id, emoji) => {
                  const emojiToKey = {
                    '👍': 'thumbsup',
                    '🎉': 'congrats',
                    '🔥': 'fire'
                  };
                  handleToggleReaction(id, emojiToKey[emoji]);
                }}
              />
            ))
          )}
        </div>
      </div>

      <PhotoFeed
        announcements={announcements}
        currentUser={currentUser}
        eventCode={currentEventCode}
        onAddAnnouncement={(text, sender, type, imageUrl) => addAnnouncement(currentEventCode, text, sender, type, imageUrl, currentUser?.role)}
        onUpdateReactions={(announcementId, reactions) => updateAnnouncementReactions(currentEventCode, announcementId, reactions)}
      />
    </>
  );
}
