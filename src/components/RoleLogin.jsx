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

// ─── Constants ───────────────────────────────────────────────

const ROLE_META = [
  {
    key: ROLES.VIEWER,
    label: 'Viewer',
    icon: Eye,
    desc: 'Watch scores live — no login required',
    color: '#94a3b8',
    needsPasscode: false,
  },
  {
    key: ROLES.REFEREE,
    label: 'Referee',
    icon: Crosshair,
    desc: 'Enter scores for your assigned games',
    color: '#22d3ee',
    needsPasscode: true,
  },
  {
    key: ROLES.LEADER,
    label: 'Team Leader',
    icon: Users,
    desc: 'Manage deductions & announcements for your team',
    color: '#a78bfa',
    needsPasscode: true,
  },
  {
    key: ROLES.ADMIN,
    label: 'Admin',
    icon: Shield,
    desc: 'Full control over config, scores & alerts',
    color: '#f59e0b',
    needsPasscode: true,
  },
];

// ─── Inline Styles (dark glassmorphism) ──────────────────────

const S = {
  wrapper: {
    width: '100%',
    maxWidth: 520,
    margin: '0 auto',
    fontFamily: "'Inter', system-ui, sans-serif",
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
    fontFamily: "'Outfit', sans-serif",
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
    gap: 12,
    padding: '24px 16px',
    borderRadius: 20,
    cursor: 'pointer',
    textAlign: 'center',
    background: selected
      ? `rgba(${hexToRgb(color)}, 0.15)`
      : 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: `2px solid ${selected ? color : 'transparent'}`,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: selected ? 'scale(1.02)' : 'scale(1)',
    touchAction: 'manipulation',
  }),
  cardLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: '#f8fafc',
    fontFamily: "'Outfit', sans-serif",
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.4,
  },

  /* ── Form fields ── */
  formGroup: {
    marginBottom: 20,
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
    padding: '16px',
    borderRadius: 14,
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
    padding: '16px',
    borderRadius: 14,
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
    padding: '18px 0',
    borderRadius: 14,
    border: 'none',
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    cursor: 'pointer',
    letterSpacing: '0.02em',
    transition: 'transform .1s, opacity .2s',
    marginTop: 10,
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
function extractAssignedTeams(servant) {
  if (!servant?.role) return [];
  const role = servant.role.toLowerCase();
  if (role.startsWith('team_')) {
    return [role.replace('team_', '')];
  }
  return [];
}

/**
 * Given a servant and eventConfig, extract assigned game names.
 * Looks at eventConfig.servantAssignments or the servant's own metadata.
 */
function extractAssignedGames(servant, eventConfig) {
  // If eventConfig has explicit servant → game assignments
  if (eventConfig?.servantAssignments) {
    const entry = eventConfig.servantAssignments[servant?.name];
    if (Array.isArray(entry?.games)) return entry.games;
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
  const [showAdmin, setShowAdmin] = useState(false);

  // Servants filtered by role prefix
  const refereeServants = useMemo(
    () => filterServants(globalServants, ['referee', 'station_', 'big_game_', 'reflection', 'media']),
    [globalServants],
  );
  const leaderServants = useMemo(
    () => filterServants(globalServants, 'team_'),
    [globalServants],
  );

  // ── Logged-in view ─────────────────────────────────────────
  if (currentUser) {
    const meta = ROLE_META.find((r) => r.key === currentUser.role) || ROLE_META[0];
    const assignments = [];
    if (currentUser.assignedTeams?.length) {
      assignments.push(`Teams: ${currentUser.assignedTeams.join(', ')}`);
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

    // Viewer — instant login, no passcode
    if (selectedRole === ROLES.VIEWER) {
      onLogin({
        name: 'Guest Viewer',
        role: ROLES.VIEWER,
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
    const user = {
      name: name.trim(),
      role: selectedRole,
      passcode,
      assignedGames: [],
      assignedTeams: [],
    };

    // Populate assignments
    if (selectedRole === ROLES.REFEREE) {
      const servant = refereeServants.find((s) => s.name === name.trim());
      user.assignedGames = extractAssignedGames(servant, eventConfig);
    }

    if (selectedRole === ROLES.LEADER) {
      const servant = leaderServants.find((s) => s.name === name.trim());
      user.assignedTeams = extractAssignedTeams(servant);
    }

    onLogin(user);
  };

  // ── Active role meta ───────────────────────────────────────
  const activeMeta = ROLE_META.find((r) => r.key === selectedRole);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={S.wrapper}>
      {/* Shake animation keyframe (injected once) */}
      <style>{`
        @keyframes rl-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>

      {/* ── Role selector cards ── */}
      <div style={S.grid}>
        {ROLE_META.filter(rm => rm.key !== 'admin' || showAdmin).map((rm) => {
          const Icon = rm.icon;
          const selected = selectedRole === rm.key;
          return (
            <div
              key={rm.key}
              style={S.card(selected, rm.color)}
              onClick={() => handleSelectRole(rm.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectRole(rm.key)}
            >
              <Icon size={26} color={selected ? rm.color : '#64748b'} />
              <span style={S.cardLabel}>{rm.label}</span>
              <span style={S.cardDesc}>{rm.desc}</span>
            </div>
          );
        })}
      </div>
      {/* Coordinator login reveal — visible secondary button */}
      {!showAdmin && (
        <button
          type="button"
          onClick={() => setShowAdmin(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '11px 16px',
            marginTop: 4,
            marginBottom: 4,
            borderRadius: 12,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            background: 'rgba(148, 163, 184, 0.05)',
            color: '#64748b',
            fontSize: '0.82rem',
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minHeight: 44,
          }}
        >
          <Shield size={14} />
          Coordinator / Admin login
        </button>
      )}

      {/* ── Login form (only when a role needing auth is selected) ── */}
      {selectedRole && (
        <form onSubmit={handleSubmit}>
          {/* Error banner */}
          {loginError && <div style={S.error}>{loginError}</div>}

          {/* Viewer — just a button */}
          {selectedRole === ROLES.VIEWER && (
            <button type="submit" style={S.submitBtn(activeMeta.color)}>
              Enter as Viewer
            </button>
          )}

          {/* Referee name dropdown */}
          {selectedRole === ROLES.REFEREE && (
            <>
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
                Log in as Referee
              </button>
            </>
          )}

          {/* Leader name dropdown */}
          {selectedRole === ROLES.LEADER && (
            <>
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

              <div style={S.formGroup}>
                <label style={S.label}>Passcode</label>
                <div style={S.passwordWrap}>
                  <input
                    style={S.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter team leader passcode"
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
                Log in as Team Leader
              </button>
            </>
          )}

          {/* Admin free-text name */}
          {selectedRole === ROLES.ADMIN && (
            <>
              <div style={S.formGroup}>
                <label style={S.label}>Your Name</label>
                <input
                  style={S.input}
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
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
                Log in as Admin
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
