import React, { useState } from 'react';
import {
  Bell,
  WifiOff,
  Radio,
  ChevronDown,
  LogIn,
  User as UserIcon,
  Shield,
  Award,
  Sparkles,
  Heart,
  Users
} from 'lucide-react';

// Role Badge and Styling Configurations
const ROLE_BADGE_CONFIG = {
  admin: {
    label: 'Admin',
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.16)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: Shield,
  },
  coordinator: {
    label: 'Coordinator',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.16)',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: Award,
  },
  service_leader: {
    label: 'Service Lead',
    color: '#c084fc',
    bg: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.35)',
    icon: Award,
  },
  team_leader: {
    label: 'Team Lead',
    color: '#60a5fa',
    bg: 'rgba(59, 130, 246, 0.16)',
    border: 'rgba(59, 130, 246, 0.35)',
    icon: Users,
  },
  leader: {
    label: 'Leader',
    color: '#60a5fa',
    bg: 'rgba(59, 130, 246, 0.16)',
    border: 'rgba(59, 130, 246, 0.35)',
    icon: Users,
  },
  sports_head: {
    label: 'Sports Head',
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.16)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: Shield,
  },
  game_leader: {
    label: 'Game Lead',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.16)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: Award,
  },
  referee: {
    label: 'Referee',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.16)',
    border: 'rgba(16, 185, 129, 0.35)',
    icon: Award,
  },
  servant: {
    label: 'Servant',
    color: '#22d3ee',
    bg: 'rgba(6, 182, 212, 0.16)',
    border: 'rgba(6, 182, 212, 0.35)',
    icon: Sparkles,
  },
  volunteer: {
    label: 'Volunteer',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.16)',
    border: 'rgba(148, 163, 184, 0.35)',
    icon: Heart,
  },
  member: {
    label: 'Member',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    border: 'rgba(56, 189, 248, 0.35)',
    icon: Users,
  },
};

/**
 * CommunityHeader Component
 *
 * Responsive top navigation header for the VBT Community Homepage.
 *
 * Props:
 * @param {object} currentUser - Signed-in user object or null/undefined
 * @param {string} communityName - Display name of the active community/branch (default "Value Blessings Team")
 * @param {boolean} isOffline - Network/sync status (true = offline/syncing)
 * @param {number} unreadCount - Number of unread notifications
 * @param {function} onOpenNotifications - Callback when notification bell is clicked
 * @param {function} onOpenProfile - Callback when user profile pill is clicked
 * @param {function} onOpenAuth - Callback when sign-in button is clicked (for guests)
 * @param {function} onSelectCommunity - Optional callback when community branch name is clicked
 */
export default function CommunityHeader({
  currentUser = null,
  communityName = 'Value Blessings Team',
  isOffline = false,
  unreadCount = 0,
  onOpenNotifications,
  onOpenProfile,
  onOpenAuth,
  onSelectCommunity,
}) {
  const [logoLoadError, setLogoLoadError] = useState(false);

  // Extract user details
  const userName = currentUser?.displayName || currentUser?.name || currentUser?.fullName || '';
  const userInitials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : currentUser?.email
    ? currentUser.email.charAt(0).toUpperCase()
    : 'U';

  const userRoleKey = (currentUser?.role || 'member').toLowerCase();
  const roleConfig = ROLE_BADGE_CONFIG[userRoleKey] || ROLE_BADGE_CONFIG.member;
  const RoleIcon = roleConfig.icon;

  const formattedUnread = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <>
      <style>{`
        .vbt-community-header-root {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(13, 20, 38, 0.88);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          border-bottom: 1px solid var(--border-light, rgba(255, 255, 255, 0.08));
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
          padding-top: max(10px, env(safe-area-inset-top, 10px));
          padding-bottom: 10px;
          padding-left: max(16px, env(safe-area-inset-left, 16px));
          padding-right: max(16px, env(safe-area-inset-right, 16px));
          transition: background 0.25s ease, border-color 0.25s ease;
        }

        .vbt-header-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .vbt-header-brand-group {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex-shrink: 1;
        }

        .vbt-header-logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .vbt-header-logo {
          height: 36px;
          width: auto;
          max-width: 48px;
          object-fit: contain;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35));
          border-radius: 6px;
        }

        .vbt-header-logo-fallback {
          height: 36px;
          width: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--vbt-blue, #3B82F6) 0%, var(--vbt-sky, #60A5FA) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 0.9rem;
          font-family: var(--font-title, 'Outfit', sans-serif);
          box-shadow: 0 2px 10px rgba(59, 130, 246, 0.35);
        }

        .vbt-header-titles {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .vbt-header-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .vbt-community-name-btn {
          background: transparent;
          border: none;
          padding: 0;
          margin: 0;
          text-align: left;
          color: #ffffff;
          font-family: var(--font-title, 'Outfit', sans-serif);
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.2;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: color 0.18s ease, opacity 0.18s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vbt-community-name-btn:hover {
          color: var(--vbt-sky, #60A5FA);
        }

        .vbt-community-name-btn:active {
          opacity: 0.8;
        }

        .vbt-community-name-static {
          color: #ffffff;
          font-family: var(--font-title, 'Outfit', sans-serif);
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vbt-header-tagline {
          font-family: var(--font-body, 'Inter', sans-serif);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: var(--text-secondary, rgba(235, 235, 245, 0.65));
          text-transform: uppercase;
          line-height: 1.2;
          margin-top: 2px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .vbt-header-tagline-dot {
          color: var(--vbt-sky, #60A5FA);
          font-weight: 900;
        }

        /* Status Badge */
        .vbt-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: var(--radius-pill, 9999px);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          transition: all 0.2s ease;
          user-select: none;
          flex-shrink: 0;
        }

        .vbt-status-pill.offline {
          background: rgba(245, 158, 11, 0.14);
          border: 1px solid rgba(245, 158, 11, 0.32);
          color: #fbbf24;
        }

        .vbt-status-pill.online {
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(96, 165, 250, 0.28);
          color: #93c5fd;
        }

        .vbt-status-dot-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          position: relative;
        }

        .vbt-status-pill.offline .vbt-status-dot-pulse {
          background-color: #f59e0b;
          box-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
        }

        .vbt-status-pill.online .vbt-status-dot-pulse {
          background-color: #10b981;
          box-shadow: 0 0 6px #10b981;
        }

        .vbt-status-pill.online .vbt-status-dot-pulse::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: #10b981;
          opacity: 0.4;
          animation: vbtPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes vbtPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.6); opacity: 0; }
        }

        /* Right Actions */
        .vbt-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .vbt-header-action-btn {
          min-height: 44px;
          min-width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light, rgba(255, 255, 255, 0.08));
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          transition: background 0.18s ease, transform 0.15s ease, border-color 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .vbt-header-action-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .vbt-header-action-btn:active {
          transform: scale(0.95);
        }

        .vbt-unread-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.7);
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #0d1426;
          animation: vbtBadgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes vbtBadgePop {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }

        /* Profile Button (Signed In) */
        .vbt-header-profile-btn {
          min-height: 44px;
          height: 44px;
          padding: 4px 12px 4px 5px;
          border-radius: var(--radius-pill, 9999px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-light, rgba(255, 255, 255, 0.1));
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .vbt-header-profile-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(96, 165, 250, 0.3);
          box-shadow: 0 2px 12px rgba(59, 130, 246, 0.15);
        }

        .vbt-header-profile-btn:active {
          transform: scale(0.96);
        }

        .vbt-avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--vbt-sky, #60A5FA) 0%, var(--vbt-blue, #3B82F6) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.82rem;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
          overflow: hidden;
          flex-shrink: 0;
        }

        .vbt-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .vbt-header-user-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .vbt-header-user-name {
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.1;
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vbt-header-role-pill {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 6px;
          border-radius: 9999px;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          line-height: 1.2;
        }

        /* Guest Auth Button */
        .vbt-header-auth-btn {
          min-height: 44px;
          height: 44px;
          padding: 0 16px;
          border-radius: var(--radius-pill, 9999px);
          background: linear-gradient(135deg, var(--vbt-blue, #3B82F6) 0%, #2563EB 100%);
          border: none;
          color: #ffffff;
          font-size: 0.84rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
          transition: transform 0.15s ease, box-shadow 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .vbt-header-auth-btn:hover {
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.55);
        }

        .vbt-header-auth-btn:active {
          transform: scale(0.96);
        }

        /* Responsive Breakpoints */
        @media (max-width: 640px) {
          .vbt-header-tagline {
            display: none;
          }
          .vbt-header-user-meta {
            display: none;
          }
          .vbt-header-profile-btn {
            padding: 4px;
            border-radius: 50%;
            min-width: 44px;
            width: 44px;
            justify-content: center;
          }
          .vbt-community-name-btn,
          .vbt-community-name-static {
            font-size: 0.92rem;
            max-width: 130px;
          }
          .vbt-header-logo {
            height: 30px;
          }
          .vbt-status-pill span:not(.vbt-status-dot-pulse) {
            display: none;
          }
          .vbt-status-pill {
            padding: 6px;
          }
        }
      `}</style>

      <header className="vbt-community-header-root" role="banner">
        <div className="vbt-header-inner">
          {/* Left Brand & Community Branch */}
          <div className="vbt-header-brand-group">
            <div className="vbt-header-logo-wrap">
              {!logoLoadError ? (
                <img
                  src="/Final VBT Re-Branding 2026-02 (3).png"
                  alt="VBT Logo"
                  className="vbt-header-logo"
                  onError={() => setLogoLoadError(true)}
                />
              ) : (
                <div className="vbt-header-logo-fallback" title="VBT Community">
                  VBT
                </div>
              )}
            </div>

            <div className="vbt-header-titles">
              <div className="vbt-header-title-row">
                {typeof onSelectCommunity === 'function' ? (
                  <button
                    type="button"
                    onClick={onSelectCommunity}
                    className="vbt-community-name-btn"
                    title="Switch or view community branch"
                    aria-label={`Community branch: ${communityName}. Click to select.`}
                  >
                    <span>{communityName}</span>
                    <ChevronDown size={14} style={{ opacity: 0.7 }} />
                  </button>
                ) : (
                  <span className="vbt-community-name-static">{communityName}</span>
                )}

                {/* Connection Status Badge */}
                <div
                  className={`vbt-status-pill ${isOffline ? 'offline' : 'online'}`}
                  title={
                    isOffline
                      ? 'Offline Mode: Syncing paused. Local changes are saved.'
                      : 'Live: Real-time connection active.'
                  }
                  aria-label={isOffline ? 'Offline' : 'Online Live'}
                >
                  <span className="vbt-status-dot-pulse" aria-hidden="true" />
                  <span>{isOffline ? 'Offline' : 'Live'}</span>
                </div>
              </div>

              {/* Tagline */}
              <div className="vbt-header-tagline">
                <span>Faith</span>
                <span className="vbt-header-tagline-dot">·</span>
                <span>Sport</span>
                <span className="vbt-header-tagline-dot">·</span>
                <span>Service</span>
              </div>
            </div>
          </div>

          {/* Right Actions: Notifications & Profile / Sign In */}
          <div className="vbt-header-actions">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="vbt-header-action-btn"
              title={`Notifications (${unreadCount || 0} unread)`}
              aria-label={`Notifications, ${unreadCount || 0} unread`}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="vbt-unread-badge" aria-hidden="true">
                  {formattedUnread}
                </span>
              )}
            </button>

            {/* Profile or Guest Sign-In */}
            {currentUser ? (
              <button
                type="button"
                onClick={onOpenProfile}
                className="vbt-header-profile-btn"
                title={`Profile: ${userName || 'My Account'} (${roleConfig.label})`}
                aria-label={`Open profile for ${userName || 'user'}, role ${roleConfig.label}`}
              >
                <div className="vbt-avatar-circle">
                  {currentUser.photoURL || currentUser.avatar ? (
                    <img
                      src={currentUser.photoURL || currentUser.avatar}
                      alt={userName || 'User'}
                      className="vbt-avatar-img"
                    />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                </div>

                <div className="vbt-header-user-meta">
                  <span className="vbt-header-user-name">
                    {userName || 'Servant'}
                  </span>
                  <span
                    className="vbt-header-role-pill"
                    style={{
                      color: roleConfig.color,
                      backgroundColor: roleConfig.bg,
                      border: `1px solid ${roleConfig.border}`,
                    }}
                  >
                    <RoleIcon size={10} style={{ display: 'inline-block' }} />
                    <span>{roleConfig.label}</span>
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="vbt-header-auth-btn"
                title="Sign in or join VBT"
                aria-label="Sign in or join VBT"
              >
                <LogIn size={15} />
                <span>Join VBT</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
