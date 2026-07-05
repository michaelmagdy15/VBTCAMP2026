import React, { useState, useMemo } from 'react';
import {
  Eye,
  Crosshair,
  Users,
  Shield,
  LogOut,
  Lock,
  Unlock,
} from 'lucide-react';
import { ROLES } from '../permissions';

const FALLBACK_SERVANT_ASSIGNMENTS = {
  // Team Leaders
  'andrew': 'team_red_1',
  'sherry': 'team_red_1',
  'amberto': 'team_red_2',
  'youstina': 'team_red_2',
  'youssef': 'team_white_1',
  'tony': 'team_white_1',
  'seif': 'team_white_2',
  'rougy': 'team_white_2',
  'tony tafaya': 'team_black_1',
  'sandra': 'team_black_1',
  'kirollos': 'team_black_2',
  'martina': 'team_black_2',
  
  // Game Leaders / Referees
  'micho': 'station_1',
  'emily': 'station_1',
  'macarious': 'station_2',
  'dani': 'station_2',
  'nathalie': 'station_3',
  'kiro': 'station_3',
  'karim': 'station_4',
  'john': 'station_4',
  'cinderella': 'station_4',
  'patrick': 'station_4',
  'joice': 'station_5',
  'jessica': 'station_5',
  'bassem': 'station_6',
  'sara': 'station_6',
  
  // Other roles
  'michael mitry': 'media',
  'amy': 'equipment'
};

// ─── Constants ───────────────────────────────────────────────

const ROLE_META = [
  {
    key: ROLES.VOLUNTEER,
    label: 'Volunteer / Viewer',
    icon: Eye,
    desc: 'Watch scores & schedule live — no login required',
    color: '#00b0ff', // Shakes Cyan
    needsPasscode: false,
  },
  {
    key: ROLES.GAME_LEADER,
    label: 'Game Leader / Referee',
    icon: Crosshair,
    desc: 'Enter scores & game results',
    color: '#3b82f6', // VBT Blue
    needsPasscode: true,
  },
  {
    key: ROLES.TEAM_LEADER,
    label: 'Team Leader / Servant',
    icon: Users,
    desc: 'Submit deductions & view schedules',
    color: '#ff9100', // Fries Orange
    needsPasscode: false,
  },
  {
    key: ROLES.SERVICE_LEADER,
    label: 'Service Leader',
    icon: Shield,
    desc: 'Manage service timeline & alerts',
    color: '#a855f7', // Tie Purple
    needsPasscode: true,
  },
];

const COORDINATOR_META = {
  key: ROLES.COORDINATOR,
  label: 'Coordinator',
  icon: Shield,
  desc: 'Full control over config, scores & alerts',
  color: '#f97316', // VBT Warm Orange / CTA
  needsPasscode: true,
};

// ─── Inline Styles (dark glassmorphism) ──────────────────────

const S = {
  wrapper: {
    width: '100%',
    maxWidth: 520,
    margin: '0 auto',
    fontFamily: 'var(--font-body)',
  },

  /* ── Logged-in badge ── */
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px',
    borderRadius: 20,
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
  },
  badgeInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f8fafc',
    fontFamily: 'var(--font-title)',
  },
  badgeRole: (color) => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#0f172a',
    background: color,
    borderRadius: 6,
    padding: '4px 10px',
    marginRight: 8,
  }),
  badgeSub: {
    fontSize: 14,
    color: '#94a3b8',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    borderRadius: 12,
    border: '1px solid rgba(248, 113, 113, 0.3)',
    background: 'rgba(248, 113, 113, 0.1)',
    color: '#f87171',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .2s',
  },

  /* ── Role selector grid ── */
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  card: (selected, color) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '20px 12px',
    borderRadius: 20,
    cursor: 'pointer',
    textAlign: 'center',
    background: selected
      ? `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.15) 0%, rgba(${hexToRgb(color)}, 0.02) 100%)`
      : 'rgba(28, 28, 30, 0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `2px solid ${selected ? color : 'rgba(255, 255, 255, 0.06)'}`,
    boxShadow: selected
      ? `0 12px 28px -4px rgba(${hexToRgb(color)}, 0.2), 0 0 15px rgba(${hexToRgb(color)}, 0.08)`
      : '0 4px 16px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    transform: selected ? 'scale(1.03)' : 'scale(1)',
    touchAction: 'manipulation',
  }),
  cardLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ffffff',
    fontFamily: 'var(--font-title)',
    marginTop: 4,
  },
  cardDesc: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    lineHeight: 1.4,
  },

  /* ── Form fields ── */
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#fff',
    fontFamily: 'var(--font-title)',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 1.4,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid rgba(148, 163, 184, 0.15)',
    background: 'rgba(15, 23, 42, 0.6)',
    color: '#f8fafc',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .2s',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '2px solid rgba(148, 163, 184, 0.15)',
    background: 'rgba(15, 23, 42, 0.85)',
    color: '#f8fafc',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
    appearance: 'none',
    cursor: 'pointer',
  },
  passwordWrap: {
    position: 'relative',
  },
  toggleEye: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
  },
  submitBtn: (color) => ({
    width: '100%',
    padding: '14px 0',
    borderRadius: 12,
    border: 'none',
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: '#fff',
    fontSize: 16,
    fontWeight: 800,
    fontFamily: 'var(--font-title)',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'transform .1s, opacity .2s',
    marginTop: 20,
    marginBottom: 8,
  }),
  error: {
    padding: '14px',
    borderRadius: 12,
    background: 'rgba(248, 113, 113, 0.15)',
    border: '1px solid rgba(248, 113, 113, 0.30)',
    color: '#f87171',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 20,
    animation: 'rl-shake 0.35s ease-in-out',
  },
};

// ─── Utility ─────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ].join(', ');
}

/**
 * Extract servants that match a given prefix from globalServants array.
 * globalServants is expected to be an array of { name, role } objects.
 */
function filterServants(globalServants, rolePrefixes) {
  if (!Array.isArray(globalServants)) return [];
  const prefixes = Array.isArray(rolePrefixes) ? rolePrefixes : [rolePrefixes];
  return globalServants.filter(
    (s) => s?.role && prefixes.some(prefix => s.role.toLowerCase().startsWith(prefix))
  );
}

/**
 * Given a servant object, extract assigned team codes from their role
 * (e.g. role "team_red" → ["red"]).
 */
function extractAssignedTeams(servant, eventConfig) {
  const sId = servant?.id || servant?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_');
  let role = servant?.role || '';
  if (eventConfig?.servantAssignments?.[sId]) {
    role = eventConfig.servantAssignments[sId];
  }
  if ((!role || role === 'volunteer') && servant?.name) {
    const normName = servant.name.toLowerCase().trim();
    if (FALLBACK_SERVANT_ASSIGNMENTS[normName]) {
      role = FALLBACK_SERVANT_ASSIGNMENTS[normName];
    }
  }
  if (role && role.toLowerCase().startsWith('team_')) {
    return [role];
  }
  return [];
}

/**
 * Given a servant and eventConfig, extract assigned game names.
 * Looks at eventConfig.servantAssignments or the servant's own metadata.
 */
function extractAssignedGames(servant, eventConfig) {
  const sId = servant?.id || servant?.name?.toLowerCase().replace(/[^a-z0-9]/g, '_');
  let roleCode = eventConfig?.servantAssignments?.[sId];
  if (!roleCode && servant?.name) {
    const normName = servant.name.toLowerCase().trim();
    roleCode = FALLBACK_SERVANT_ASSIGNMENTS[normName];
  }
  if (roleCode && roleCode.startsWith('station_')) {
    const station = eventConfig?.stations?.[roleCode];
    if (station?.name) return [station.name];
  }
  // Fallback: if the servant object itself carries games
  if (Array.isArray(servant?.assignedGames)) return servant.assignedGames;
  if (Array.isArray(servant?.games)) return servant.games;
  return [];
}

// ─── Component ───────────────────────────────────────────────

export default function RoleLogin({
  eventConfig,
  globalServants,
  onLogin,
  onLogout,
  currentUser,
  loginError,
  setLoginError,
}) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [name, setName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const handleCoordinatorClick = () => {
    setSelectedRole(ROLES.COORDINATOR);
    setName('');
    setPasscode('');
    setShowPass(false);
    if (setLoginError) setLoginError('');
  };

  // Servants filtered by role prefix
  const refereeServants = useMemo(
    () => filterServants(globalServants, ['referee', 'station_', 'big_game_', 'reflection', 'media']),
    [globalServants],
  );
  const leaderServants = useMemo(
    () => filterServants(globalServants, 'team_'),
    [globalServants],
  );
  const serviceLeaderServants = useMemo(
    () => filterServants(globalServants, ['service_leader', 'admin']),
    [globalServants],
  );

  const coordinatorServants = useMemo(() => {
    const coords = filterServants(globalServants, ['coordinator']);
    const defaults = ['Michael Mitry', 'Andrew Rafik', 'Michael Nakhla', 'Yohanna', 'Anthony', 'Rita Ghaly'];
    defaults.forEach(name => {
      if (!coords.find(c => c.name.toLowerCase() === name.toLowerCase())) {
        coords.push({ name, role: 'coordinator' });
      }
    });
    return coords.sort((a,b) => a.name.localeCompare(b.name));
  }, [globalServants]);

  // ── Logged-in view ─────────────────────────────────────────
  if (currentUser) {
    const meta = currentUser.role === ROLES.COORDINATOR 
      ? COORDINATOR_META 
      : ROLE_META.find((r) => r.key === currentUser.role) || ROLE_META[0];
    const assignments = [];
    if (currentUser.assignedTeams?.length) {
      const cleanTeams = currentUser.assignedTeams.map(t => 
        t.replace(/^team_/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      );
      assignments.push(`Teams: ${cleanTeams.join(', ')}`);
    }
    if (currentUser.assignedGames?.length) {
      assignments.push(`Games: ${currentUser.assignedGames.join(', ')}`);
    }

    return (
      <div style={S.wrapper}>
        <div style={S.badge}>
          <meta.icon size={22} color={meta.color} />
          <div style={S.badgeInfo}>
            <span style={S.badgeName}>{currentUser.name || 'Guest'}</span>
            <div>
              <span style={S.badgeRole(meta.color)}>{meta.label}</span>
              {assignments.length > 0 && (
                <span style={S.badgeSub}>{assignments.join(' · ')}</span>
              )}
            </div>
          </div>
          <button
            style={S.logoutBtn}
            onClick={onLogout}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = 'rgba(248,113,113,0.22)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = 'rgba(248,113,113,0.10)')
            }
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </div>
    );
  }

  // ── Handlers ───────────────────────────────────────────────

  const handleSelectRole = (roleKey) => {
    setSelectedRole(roleKey);
    setName('');
    setPasscode('');
    setShowPass(false);
    if (setLoginError) setLoginError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedRole) return;

    // Volunteer — instant login, no passcode
    if (selectedRole === ROLES.VOLUNTEER) {
      onLogin({
        name: 'Volunteer ' + Math.floor(Math.random() * 100),
        role: ROLES.VOLUNTEER,
        passcode: '',
        assignedGames: [],
        assignedTeams: [],
      });
      return;
    }

    // Validate name
    if (!name.trim()) {
      if (setLoginError) setLoginError('Please select or enter your name.');
      return;
    }

    // Build user object
    const matchedServant = (globalServants || []).find(s => s.name && s.name.trim().toLowerCase() === name.trim().toLowerCase());
    const user = {
      id: matchedServant ? matchedServant.id : name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: name.trim(),
      role: selectedRole,
      passcode,
      assignedGames: [],
      assignedTeams: [],
    };

    // 2. Game Leader Login
    if (selectedRole === ROLES.GAME_LEADER) {
      const servant = refereeServants.find((s) => s.name === name.trim());
      user.assignedGames = extractAssignedGames(servant, eventConfig);
    }
    // 3. Team Leader Login
    if (selectedRole === ROLES.TEAM_LEADER) {
      const servant = leaderServants.find((s) => s.name === name.trim());
      user.assignedTeams = extractAssignedTeams(servant, eventConfig);
    }
    // 4. Service Leader Login
    if (selectedRole === ROLES.SERVICE_LEADER) {
      user.role = ROLES.SERVICE_LEADER;
    }

    onLogin(user);
  };

  // ── Active role meta ───────────────────────────────────────
  const activeMeta = selectedRole === ROLES.COORDINATOR 
    ? COORDINATOR_META 
    : ROLE_META.find((r) => r.key === selectedRole);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={S.wrapper}>
      {/* Shake animation & hover/press micro-interactions (pure CSS) */}
      <style>{`
        @keyframes rl-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .role-card-hover {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.3s ease !important;
        }
        .role-card-hover:hover {
          transform: translateY(-4px) scale(1.02) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5) !important;
        }
        .role-card-hover:active {
          transform: scale(0.95) !important;
        }
      `}</style>

      {/* Page Title & Title description */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '900',
          fontFamily: 'var(--font-title)',
          color: '#ffffff',
          marginBottom: '8px',
          textShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
          letterSpacing: '-0.02em'
        }}>
          Access Portal
        </h2>
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          maxWidth: '360px',
          margin: '0 auto 16px auto',
          lineHeight: '1.4'
        }}>
          Identify your role to view real-time scores, manage event schedules, or coordinate the camp.
        </p>
        <button
          type="button"
          onClick={onLogout}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '9999px',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            padding: '6px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          ← Exit to Camp Page
        </button>
      </div>

      {/* ── Role selector cards ── */}
      <div style={S.grid}>
        {ROLE_META.map((rm) => {
          const Icon = rm.icon;
          const selected = selectedRole === rm.key;
          return (
            <div
              key={rm.key}
              className="role-card-hover"
              style={S.card(selected, rm.color)}
              onClick={() => handleSelectRole(rm.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectRole(rm.key)}
            >
              {/* Colored Circular Icon Container */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: selected ? `rgba(${hexToRgb(rm.color)}, 0.2)` : 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '10px',
                transition: 'all 0.3s ease',
                border: `1px solid ${selected ? `rgba(${hexToRgb(rm.color)}, 0.4)` : 'rgba(255, 255, 255, 0.05)'}`
              }}>
                <Icon size={22} color={selected ? rm.color : '#94a3b8'} />
              </div>
              <span style={S.cardLabel}>{rm.label}</span>
              <span style={S.cardDesc}>{rm.desc}</span>
            </div>
          );
        })}
      </div>

      {/* ── Coordinator Access Button (Clean & Integrated) ── */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={handleCoordinatorClick}
          style={{
            background: selectedRole === ROLES.COORDINATOR ? `linear-gradient(135deg, rgba(${hexToRgb(COORDINATOR_META.color)}, 0.15) 0%, rgba(${hexToRgb(COORDINATOR_META.color)}, 0.02) 100%)` : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${selectedRole === ROLES.COORDINATOR ? COORDINATOR_META.color : 'rgba(255, 255, 255, 0.06)'}`,
            borderRadius: '16px',
            color: selectedRole === ROLES.COORDINATOR ? '#ffffff' : 'rgba(148, 163, 184, 0.7)',
            fontSize: '0.8rem',
            fontWeight: '600',
            padding: '12px 24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: selectedRole === ROLES.COORDINATOR ? `0 8px 24px -4px rgba(${hexToRgb(COORDINATOR_META.color)}, 0.2)` : 'none'
          }}
          className="role-card-hover"
        >
          <Shield size={16} color={selectedRole === ROLES.COORDINATOR ? COORDINATOR_META.color : 'rgba(148, 163, 184, 0.7)'} />
          <span>System Coordinator Login</span>
        </button>
      </div>


      {/* ── Login form (only when a role needing auth is selected) ── */}
      {selectedRole && (
        <form onSubmit={handleSubmit}>
          {/* Error banner */}
          {loginError && <div style={S.error}>{loginError}</div>}

          {/* Volunteer — just a button */}
          {selectedRole === ROLES.VOLUNTEER && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <div style={S.title}>Welcome to {eventConfig?.eventType === 'service' ? "Service" : "VBT Camp"}!</div>
              <div style={S.subtitle}>You are signing in as a Volunteer. You will only have view access.</div>
              <button type="submit" style={S.submitBtn(activeMeta.color)}>
                Enter Dashboard
              </button>
            </div>
          )}

          {/* Game Leader name dropdown */}
          {selectedRole === ROLES.GAME_LEADER && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={S.title}>Game Leader Login</div>
              <div style={S.subtitle}>Enter passcode to manage scores for your games</div>
              <div style={S.formGroup}>
                <label style={S.label}>Your Name</label>
                {refereeServants.length > 0 ? (
                  <select
                    style={S.select}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  >
                    <option value="">Select your name…</option>
                    {refereeServants.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={S.input}
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Passcode</label>
                <div style={S.passwordWrap}>
                  <input
                    style={S.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter game leader passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                  <button
                    type="button"
                    style={S.toggleEye}
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPass ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" style={S.submitBtn(activeMeta.color)}>
                Log in as Game Leader
              </button>
            </div>
          )}

          {/* Team Leader name dropdown */}
          {selectedRole === ROLES.TEAM_LEADER && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={S.title}>Team Leader Login</div>
              <div style={S.subtitle}>Select your team and enter passcode to manage deductions</div>
              <div style={S.formGroup}>
                <label style={S.label}>Your Name</label>
                {leaderServants.length > 0 ? (
                  <select
                    style={S.select}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  >
                    <option value="">Select your name…</option>
                    {leaderServants.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={S.input}
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </div>

              <button type="submit" style={S.submitBtn(activeMeta.color)}>
                Log in as Team Leader
              </button>
            </div>
          )}

          {/* Service Leader name dropdown */}
          {selectedRole === ROLES.SERVICE_LEADER && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={S.title}>Service Leader Login</div>
              <div style={S.subtitle}>Select your name and enter passcode to manage timeline and pings</div>
              <div style={S.formGroup}>
                <label style={S.label}>Your Name</label>
                {serviceLeaderServants.length > 0 ? (
                  <select
                    style={S.select}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  >
                    <option value="">Select your name…</option>
                    {serviceLeaderServants.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={S.input}
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Passcode</label>
                <div style={S.passwordWrap}>
                  <input
                    style={S.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter service leader passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                  <button
                    type="button"
                    style={S.toggleEye}
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPass ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" style={S.submitBtn(activeMeta.color)}>
                Log in as Service Leader
              </button>
            </div>
          )}

          {/* Coordinator Name Dropdown Login */}
          {selectedRole === ROLES.COORDINATOR && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={S.title}>Coordinator Login</div>
              <div style={S.subtitle}>Select your name and enter passcode for full control</div>
              <div style={S.formGroup}>
                <label style={S.label}>Your Name</label>
                {coordinatorServants.length > 0 ? (
                  <select
                    style={S.select}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  >
                    <option value="">Select your name…</option>
                    {coordinatorServants.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={S.input}
                    type="text"
                    placeholder="Enter coordinator name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Passcode</label>
                <div style={S.passwordWrap}>
                  <input
                    style={S.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter coordinator passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                  />
                  <button
                    type="button"
                    style={S.toggleEye}
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPass ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" style={S.submitBtn(activeMeta.color)}>
                Log in as Coordinator
              </button>
            </div>
          )}
        </form>
      )}

    </div>
  );
}
