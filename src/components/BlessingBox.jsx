import React, { useState, useMemo } from 'react';
import { Sparkles, Send, CheckCircle2 } from 'lucide-react';
import { addAnnouncement } from '../firebase';
import confetti from 'canvas-confetti';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

const BLESSING_TAGS = [
  { tag: '🤝 Sportsmanship', label: 'Sportsmanship' },
  { tag: '😇 Kindness', label: 'Kindness' },
  { tag: '💪 Teamwork', label: 'Teamwork' },
  { tag: '🙌 Service', label: 'Service' },
  { tag: '🌟 Integrity', label: 'Integrity' }
];

export default function BlessingBox({ currentUser, activeEventCode, campData }) {
  const [selectedTag, setSelectedTag] = useState(BLESSING_TAGS[0].tag);
  const [recipientType, setRecipientType] = useState('team'); // 'team' | 'servant' | 'camper'
  const [selectedTeam, setSelectedTeam] = useState('');
  const [freeTextRecipient, setFreeTextRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Extract all team codes
  const teamCodes = useMemo(() => {
    if (!campData?.teams) return [];
    if (Array.isArray(campData.teams)) {
      return campData.teams.map(t => typeof t === 'object' ? (t.code || t.name || t.teamCode) : t).filter(Boolean);
    }
    if (typeof campData.teams === 'object') {
      return Object.keys(campData.teams);
    }
    return [];
  }, [campData]);

  // Set default team
  useMemo(() => {
    if (teamCodes.length > 0 && !selectedTeam) {
      setSelectedTeam(teamCodes[0]);
    }
  }, [teamCodes, selectedTeam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    let recipient = '';
    if (recipientType === 'team') {
      recipient = selectedTeam || 'VBT Team';
    } else {
      recipient = freeTextRecipient.trim() || 'VBT Member';
    }

    const textMessage = `🌟 [BLESSING: ${selectedTag}] ${recipient} was praised: "${description.trim()}"`;
    setIsSubmitting(true);

    try {
      await addAnnouncement(
        activeEventCode,
        textMessage,
        currentUser?.name || 'VBT Leader',
        'blessing',
        null,
        currentUser?.role || 'leader'
      );
      
      triggerHaptic('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#ffffff', '#34d399']
      });

      setSuccess(true);
      setDescription('');
      setFreeTextRecipient('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to post blessing:', err);
      alert('Failed to send blessing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={S.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Sparkles size={20} style={{ color: '#fbbf24' }} />
        <h3 style={S.title}>Praise & Blessings Box</h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Blessing Tag Selector */}
        <div style={S.field}>
          <label style={S.label}>SELECT VALUE TYPE</label>
          <div style={S.tagGrid}>
            {BLESSING_TAGS.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={() => setSelectedTag(item.tag)}
                style={S.tagBtn(selectedTag === item.tag)}
              >
                {item.tag}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient Type Toggle */}
        <div style={S.field}>
          <label style={S.label}>RECIPIENT TYPE</label>
          <div style={S.toggleRow}>
            <button
              type="button"
              onClick={() => setRecipientType('team')}
              style={S.toggleBtn(recipientType === 'team')}
            >
              🏢 Team
            </button>
            <button
              type="button"
              onClick={() => setRecipientType('servant')}
              style={S.toggleBtn(recipientType === 'servant')}
            >
              🧑‍✈️ Servant
            </button>
            <button
              type="button"
              onClick={() => setRecipientType('camper')}
              style={S.toggleBtn(recipientType === 'camper')}
            >
              🏃 Camper
            </button>
          </div>
        </div>

        {/* Recipient Input */}
        <div style={S.field}>
          <label style={S.label}>RECIPIENT NAME</label>
          {recipientType === 'team' ? (
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={S.select}
            >
              {teamCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={freeTextRecipient}
              onChange={(e) => setFreeTextRecipient(e.target.value)}
              placeholder={recipientType === 'servant' ? 'e.g. Mina Magdy' : 'e.g. Mark Watson'}
              style={S.input}
              required
            />
          )}
        </div>

        {/* Praise Details Textarea */}
        <div style={S.field}>
          <label style={S.label}>WHAT AWESOME DEED DID THEY DO?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe their sportsmanship, kindness, helper spirit, etc..."
            rows={3}
            style={S.textarea}
            required
          />
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSubmitting || !description.trim() || (recipientType !== 'team' && !freeTextRecipient.trim())}
          style={S.submitBtn(description.trim().length > 0)}
        >
          <Send size={16} />
          <span>{isSubmitting ? 'Sending...' : 'Send Blessing Shout-out'}</span>
        </button>

        {success && (
          <div style={S.successText}>
            <CheckCircle2 size={16} />
            <span>Blessing posted to live feed!</span>
          </div>
        )}
      </form>
    </div>
  );
}

const S = {
  container: {
    background: 'rgba(13, 20, 38, 0.45)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(251, 191, 36, 0.25)',
    borderRadius: '16px',
    padding: '20px',
    boxSizing: 'border-box'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: '0.02em'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '10px',
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase'
  },
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  tagBtn: (selected) => ({
    background: selected ? 'rgba(251, 191, 36, 0.18)' : 'rgba(255, 255, 255, 0.04)',
    border: selected ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
    color: selected ? '#fbbf24' : 'rgba(255,255,255,0.7)',
    borderRadius: '20px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  }),
  toggleRow: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '4px',
    borderRadius: '10px',
    gap: '4px'
  },
  toggleBtn: (selected) => ({
    flex: 1,
    background: selected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    border: 'none',
    color: selected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none'
  }),
  select: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
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
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'none'
  },
  submitBtn: (enabled) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    background: enabled ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : 'rgba(255, 255, 255, 0.04)',
    border: 'none',
    color: enabled ? '#070a13' : 'rgba(255, 255, 255, 0.2)',
    fontSize: '14px',
    fontWeight: '700',
    cursor: enabled ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    outline: 'none',
    boxShadow: enabled ? '0 4px 12px rgba(251, 191, 36, 0.2)' : 'none'
  }),
  successText: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    color: '#34d399',
    fontSize: '13px',
    fontWeight: '600',
    marginTop: '6px',
    animation: 'pulse 1.5s infinite'
  }
};
