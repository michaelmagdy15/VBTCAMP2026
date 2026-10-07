import { useState } from 'react';
import {
  User,
  X,
  Check,
  Lock,
  Loader2,
  Sparkles,
  AlertCircle,
  Bell,
  Globe
} from 'lucide-react';
import { maskPhoneNumber } from '../services/memberService';

const AVAILABLE_SPORTS = [
  'Football',
  'Basketball',
  'Volleyball',
  'Padel',
  'Table Tennis',
  'Fitness & Conditioning',
  'Chess & Mind Sports',
  'Athletics / Running',
];

function MemberProfileModalContent({
  onClose,
  publicProfile,
  privateProfile,
  onSavePublic,
  onSavePrivate,
  isAdmin = false,
}) {
  const [activeTab, setActiveTab] = useState('public'); // 'public' | 'private'
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State - Public (initialized from props)
  const [firstName, setFirstName] = useState(() => publicProfile?.firstName || '');
  const [lastName, setLastName] = useState(() => publicProfile?.lastName || '');
  const [bio, setBio] = useState(() => publicProfile?.bio || '');
  const [sportsInterests, setSportsInterests] = useState(() => publicProfile?.sportsInterests || []);
  const [preferredLanguage, setPreferredLanguage] = useState(() => publicProfile?.preferredLanguage || 'ar');
  const [role, setRole] = useState(() => publicProfile?.role || 'member');

  // Form State - Private (initialized from props)
  const [email, setEmail] = useState(() => privateProfile?.email || '');
  const [birthDate, setBirthDate] = useState(() => privateProfile?.birthDate || '');
  const [emergencyName, setEmergencyName] = useState(() => privateProfile?.emergencyContact?.name || '');
  const [emergencyRelation, setEmergencyRelation] = useState(() => privateProfile?.emergencyContact?.relation || '');
  const [emergencyPhone, setEmergencyPhone] = useState(() => privateProfile?.emergencyContact?.phone || '');
  const [medicalNotes, setMedicalNotes] = useState(() => privateProfile?.medicalNotes || '');
  const [pastoralNotes, setPastoralNotes] = useState(() => privateProfile?.pastoralNotes || '');
  const [notificationPreferences, setNotificationPreferences] = useState(() => ({
    pushAnnouncements: Boolean(privateProfile?.notificationPreferences?.pushAnnouncements ?? true),
    pushReminders: Boolean(privateProfile?.notificationPreferences?.pushReminders ?? true),
    servingAlerts: Boolean(privateProfile?.notificationPreferences?.servingAlerts ?? true),
  }));

  const toggleSport = (sport) => {
    setSportsInterests((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const toggleNotification = (key) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (activeTab === 'public') {
        const publicUpdates = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          bio: bio.trim(),
          sportsInterests,
          preferredLanguage,
          ...(isAdmin ? { role } : {}),
        };
        await onSavePublic(publicUpdates);
      } else {
        const privateUpdates = {
          email: email.trim(),
          birthDate,
          emergencyContact: {
            name: emergencyName.trim(),
            relation: emergencyRelation.trim(),
            phone: emergencyPhone.trim(),
          },
          medicalNotes: medicalNotes.trim(),
          notificationPreferences,
          ...(isAdmin ? { pastoralNotes: pastoralNotes.trim() } : {}),
        };
        await onSavePrivate(privateUpdates);
      }
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.7) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              <User size={24} color="#fff" />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: '-0.02em',
                }}
              >
                {publicProfile?.displayName || 'Member Profile'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  {publicProfile?.role || 'Member'}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {publicProfile?.phoneNumberMasked || maskPhoneNumber(privateProfile?.rawPhoneNumber)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '12px 24px 0',
            gap: 12,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('public')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              color: activeTab === 'public' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'public' ? '2px solid #38bdf8' : '2px solid transparent',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={16} /> Community Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('private')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              color: activeTab === 'private' ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === 'private' ? '2px solid #38bdf8' : '2px solid transparent',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <Lock size={16} /> Private & Health Info
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div
            style={{
              margin: '12px 24px 0',
              padding: '10px 14px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 12,
              color: '#4ade80',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Check size={16} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div
            style={{
              margin: '12px 24px 0',
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#f87171',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Form Body */}
        <form
          onSubmit={handleSave}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {activeTab === 'public' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  About / Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short note about yourself, your serving background, or favorite sports..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                  Sports Interests
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {AVAILABLE_SPORTS.map((sport) => {
                    const isSelected = sportsInterests.includes(sport);
                    return (
                      <button
                        type="button"
                        key={sport}
                        onClick={() => toggleSport(sport)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                          color: isSelected ? '#38bdf8' : '#94a3b8',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {sport}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  <Globe size={14} /> Preferred Language
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 13,
                  }}
                >
                  <option value="ar">العربية (Arabic)</option>
                  <option value="en">English</option>
                </select>
              </div>

              {isAdmin && (
                <div style={{ marginTop: 8, padding: 12, backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: 12, border: '1px solid rgba(234, 179, 8, 0.25)' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#facc15', marginBottom: 6 }}>
                    Community Role (Admin Control)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    <option value="member">Member</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="servant">Servant</option>
                    <option value="team_leader">Team Leader</option>
                    <option value="game_leader">Game Leader / Referee</option>
                    <option value="service_leader">Service Day Leader</option>
                    <option value="coordinator">Sports Head / Coordinator</option>
                    <option value="admin">Community Admin</option>
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  fontSize: 12,
                  color: '#94a3b8',
                  lineHeight: 1.5,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Lock size={16} color="#38bdf8" style={{ marginTop: 2, flexShrink: 0 }} />
                <span>
                  This section is strictly confidential. Only you and authorized pastoral leadership can access these records.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  Emergency Contact
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Relationship (e.g. Parent, Spouse)"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Emergency Phone Number"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                  Medical & Dietary Notes
                </label>
                <textarea
                  rows={2}
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="Allergies, chronic conditions, injuries, or dietary requirements..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    fontSize: 13,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>
                  <Bell size={14} /> Notification Preferences
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.pushAnnouncements}
                      onChange={() => toggleNotification('pushAnnouncements')}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    Push Announcements
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.pushReminders}
                      onChange={() => toggleNotification('pushReminders')}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    Event & Schedule Reminders
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.servingAlerts}
                      onChange={() => toggleNotification('servingAlerts')}
                      style={{ accentColor: '#38bdf8' }}
                    />
                    Serving Opportunity Alerts
                  </label>
                </div>
              </div>

              {isAdmin && (
                <div style={{ marginTop: 8, padding: 12, backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 12, border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#c084fc', marginBottom: 6 }}>
                    Pastoral Care Notes (Confidential Admin / Shepherd Log)
                  </label>
                  <textarea
                    rows={3}
                    value={pastoralNotes}
                    onChange={(e) => setPastoralNotes(e.target.value)}
                    placeholder="Private pastoral follow-ups, prayer burdens, or leadership milestones..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontSize: 13,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Submit Action */}
          <div style={{ marginTop: 8, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 22px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MemberProfileModal(props) {
  if (!props.isOpen) return null;
  return <MemberProfileModalContent key={props.publicProfile?.id || 'new'} {...props} />;
}
