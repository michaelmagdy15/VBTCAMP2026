import React, { useState } from 'react';
import { Shield, Phone, User, LogOut, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// ─── Theme Tokens (glassmorphism) ─────────────────────────────
const T = {
  vbtSky: '#29b6f6',
  vbtBlue: '#3b82f6',
  vbtPurple: '#a855f7',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  glassBg: 'rgba(15, 23, 42, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #29b6f6 100%)',
  fontTitle: "'Outfit', sans-serif",
  fontBody: "'Plus Jakarta Sans', sans-serif",
};

// ─── Inline Styles ───────────────────────────────────────────
const S = {
  wrapper: {
    width: '100%',
    maxWidth: 420,
    margin: '40px auto',
    padding: '32px 24px',
    borderRadius: 24,
    background: T.glassBg,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${T.glassBorder}`,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    fontFamily: T.fontBody,
    boxSizing: 'border-box',
  },
  title: {
    fontSize: 26,
    fontWeight: 900,
    color: '#fff',
    fontFamily: T.fontTitle,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: '-0.02em',
    textShadow: '0 0 15px rgba(59, 130, 246, 0.25)',
  },
  subtitle: {
    fontSize: 13,
    color: T.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.5,
  },
  formGroup: {
    marginBottom: 18,
    position: 'relative',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: T.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    color: T.textSecondary,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    borderRadius: 12,
    border: `1.5px solid ${T.glassBorder}`,
    background: 'rgba(10, 15, 30, 0.7)',
    color: '#f8fafc',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    fontFamily: T.fontBody,
  },
  submitBtn: {
    width: '100%',
    padding: '14px 0',
    borderRadius: 12,
    border: 'none',
    background: T.accentGradient,
    color: '#fff',
    fontSize: 15,
    fontWeight: 800,
    fontFamily: T.fontTitle,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'all 0.2s ease',
    marginTop: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  error: {
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  /* Logged-in View */
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '24px 20px',
    borderRadius: 20,
    background: 'rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(16px)',
    border: `1px solid ${T.glassBorder}`,
  },
  badgeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: 800,
    color: '#f8fafc',
    fontFamily: T.fontTitle,
  },
  badgeRole: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#0f172a',
    background: T.vbtSky,
    borderRadius: 6,
    padding: '4px 10px',
    marginRight: 8,
    width: 'fit-content',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid rgba(248, 113, 113, 0.3)',
    background: 'rgba(248, 113, 113, 0.1)',
    color: '#f87171',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .2s',
  },
};

export default function RoleLogin({
  eventConfig,
  onLogin,
  onLogout,
  currentUser,
  loginError,
  setLoginError,
}) {
  const [firstName, setFirstName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (setLoginError) setLoginError('');

    const cleanFirstName = firstName.trim();
    const cleanPhone = phoneNumber.replace(/[^a-zA-Z0-9+]/g, '').trim(); // Normalized phone (raw digits, letters, +)

    if (!cleanFirstName) {
      if (setLoginError) setLoginError('Please enter your first name.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 5) {
      if (setLoginError) setLoginError('Please enter a valid phone number.');
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch servant by phone number (Primary Key / doc ID)
      const docRef = doc(db, 'vbt_servants', cleanPhone);
      const snap = await getDoc(docRef);
      const now = new Date().toISOString();

      let userObj = null;

      if (snap.exists()) {
        // Returning User
        const existing = snap.data();
        const attended = existing.servicesAttended || [];
        const eventCode = eventConfig?.eventCode || 'global';
        if (eventCode && !attended.find(e => e.code === eventCode && e.date?.startsWith(now.slice(0, 10)))) {
          attended.push({ code: eventCode, date: now });
        }

        userObj = {
          ...existing,
          firstName: cleanFirstName || existing.firstName || existing.name || '',
          name: cleanFirstName || existing.name || '',
          lastSeen: now,
          servicesAttended: attended,
        };
        await setDoc(docRef, userObj, { merge: true });
      } else {
        // Auto-Registration / "New Lead"
        userObj = {
          id: cleanPhone,
          firstName: cleanFirstName,
          lastName: '',
          name: cleanFirstName,
          phoneNumber: cleanPhone,
          role: 'unregistered', // Registered as "Fresh Lead" or "Unregistered"
          lastSeen: now,
          servicesAttended: eventConfig?.eventCode ? [{ code: eventConfig.eventCode, date: now }] : [],
          createdAt: now,
          assignedGames: [],
          assignedTeams: [],
          uiMode: 'dumb' // strictly minimal Live Mode by default
        };
        await setDoc(docRef, userObj);
      }

      // Log the user in
      onLogin(userObj);
    } catch (err) {
      console.error('[Login] Error:', err);
      if (setLoginError) setLoginError('Failed to login. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Logged-in View ─────────────────────────────────────────
  if (currentUser) {
    const roleLabels = {
      admin: 'Sports Head',
      coordinator: 'Sports Head',
      sports_head: 'Sports Head',
      logistics_head: 'Logistics Head',
      game_leader: 'Game Leader',
      referee: 'Game Leader',
      team_leader: 'Team Leader',
      leader: 'Team Leader',
      volunteer: 'Volunteer',
      unregistered: 'Fresh Lead'
    };

    const displayRole = roleLabels[currentUser.role] || 'Volunteer';

    return (
      <div style={S.wrapper}>
        <div style={S.badge}>
          <div style={S.badgeInfo}>
            <span style={S.badgeName}>Hello, {currentUser.firstName || currentUser.name || 'Guest'}</span>
            <div style={{ marginTop: 4 }}>
              <span style={S.badgeRole}>{displayRole}</span>
            </div>
          </div>
          <button
            style={S.logoutBtn}
            onClick={onLogout}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.1)')}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    );
  }

  // ── Render Login Form ──────────────────────────────────────
  return (
    <div style={S.wrapper}>
      <div style={S.title}>VBT SPORTS PORTAL</div>
      <div style={S.subtitle}>
        Sign in or register instantly using only your first name and phone number.
        <br />
        <span style={{ fontSize: '11px', color: '#ff9100' }}>Arabic / English bilingual support.</span>
      </div>

      {loginError && <div style={S.error}>{loginError}</div>}

      <form onSubmit={handleSubmit}>
        <div style={S.formGroup}>
          <label style={S.label}>First Name / الاسم الأول</label>
          <div style={S.inputWrapper}>
            <User size={18} style={S.inputIcon} />
            <input
              style={S.input}
              type="text"
              placeholder="e.g. Michael / ميخائيل"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>Phone Number / رقم الموبايل</label>
          <div style={S.inputWrapper}>
            <Phone size={18} style={S.inputIcon} />
            <input
              style={S.input}
              type="tel"
              placeholder="e.g. +201234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              Verifying Portal Access...
            </>
          ) : (
            'Enter / دخول'
          )}
        </button>
      </form>

      {/* Basic keyframe spinner logic */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
