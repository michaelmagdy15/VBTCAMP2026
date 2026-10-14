import React from 'react';
import {
  Home,
  Users,
  Heart,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'community', label: 'Community', icon: Users },
  { id: 'serve', label: 'Serve', icon: Heart },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'profile', label: 'Profile', icon: UserIcon },
];

/**
 * BottomNavigation Component
 *
 * Mobile-first tab bar for VBT Community Homepage.
 * Displays on mobile/tablet screens (<1024px) and hides on desktop.
 * Adheres strictly to iOS Capacitor safe area insets and Apple HIG touch guidelines (>=44px).
 *
 * Props:
 * @param {string} currentTab - Active tab ID ('home', 'community', 'serve', 'schedule', 'profile')
 * @param {function} onSelectTab - Callback invoked when a tab is tapped: (tabId) => void
 * @param {object} currentUser - Signed-in user profile, if available
 * @param {number} unreadCount - Global or community unread count badge
 */
export default function BottomNavigation({
  currentTab = 'home',
  onSelectTab,
  currentUser = null,
  unreadCount = 0,
}) {
  const handleTabClick = (tabId) => {
    try {
      triggerHaptic('light');
    } catch {
      // safe fallback on non-supported platforms
    }
    if (typeof onSelectTab === 'function') {
      onSelectTab(tabId);
    }
  };

  const formattedUnread = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <>
      <style>{`
        .vbt-bottom-nav-root {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 1010;
          background: rgba(13, 20, 38, 0.92);
          backdrop-filter: saturate(180%) blur(24px);
          -webkit-backdrop-filter: saturate(180%) blur(24px);
          border-top: 1px solid var(--border-light, rgba(255, 255, 255, 0.08));
          box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.45);
          height: calc(58px + max(12px, env(safe-area-inset-bottom, 16px)));
          padding-bottom: max(12px, env(safe-area-inset-bottom, 16px));
          padding-left: max(8px, env(safe-area-inset-left, 0px));
          padding-right: max(8px, env(safe-area-inset-right, 0px));
          display: flex;
          align-items: center;
          justify-content: space-around;
          user-select: none;
        }

        /* Hide completely on desktop screens (>=1024px) */
        @media (min-width: 1024px) {
          .vbt-bottom-nav-root {
            display: none !important;
          }
        }

        .vbt-bottom-nav-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          height: 100%;
          min-height: 48px;
          min-width: 44px;
          padding: 4px 6px 6px 6px;
          color: var(--text-muted, rgba(235, 235, 245, 0.4));
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.18s ease, transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          gap: 3px;
        }

        .vbt-bottom-nav-item:active {
          transform: scale(0.92);
        }

        .vbt-bottom-nav-item.active {
          color: var(--vbt-sky, #60A5FA);
        }

        /* Active glowing bar at the top of the tab */
        .vbt-bottom-nav-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 22px;
          height: 3px;
          border-radius: 9999px;
          background: linear-gradient(90deg, var(--vbt-blue, #3B82F6) 0%, var(--vbt-sky, #60A5FA) 100%);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.85), 0 0 18px rgba(96, 165, 250, 0.5);
          animation: vbtNavIndicatorSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes vbtNavIndicatorSlide {
          from {
            width: 8px;
            opacity: 0;
          }
          to {
            width: 22px;
            opacity: 1;
          }
        }

        .vbt-nav-icon-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }

        .vbt-bottom-nav-item.active .vbt-nav-icon-container svg {
          filter: drop-shadow(0 0 6px rgba(96, 165, 250, 0.65));
        }

        .vbt-nav-label {
          font-family: var(--font-body, 'Inter', sans-serif);
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          line-height: 1.1;
          transition: font-weight 0.18s ease, color 0.18s ease;
        }

        .vbt-bottom-nav-item.active .vbt-nav-label {
          font-weight: 700;
          color: #ffffff;
        }

        /* Tab badge */
        .vbt-tab-badge {
          position: absolute;
          top: -3px;
          right: -7px;
          min-width: 16px;
          height: 16px;
          padding: 0 3px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
          box-shadow: 0 0 8px rgba(249, 115, 22, 0.6);
          color: #ffffff;
          font-size: 0.6rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #0d1426;
        }

        /* Profile Mini Avatar */
        .vbt-tab-mini-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, var(--vbt-sky, #60A5FA) 0%, var(--vbt-blue, #3B82F6) 100%);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
        }

        .vbt-tab-mini-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      <nav
        className="vbt-bottom-nav-root"
        role="navigation"
        aria-label="Mobile navigation bar"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isCommunityTab = item.id === 'community';
          const isProfileTab = item.id === 'profile';

          const hasUserAvatar =
            isProfileTab &&
            currentUser &&
            (currentUser.photoURL || currentUser.avatar || currentUser.name || currentUser.displayName);

          const userInitial =
            currentUser?.displayName?.charAt(0) ||
            currentUser?.name?.charAt(0) ||
            currentUser?.email?.charAt(0) ||
            'U';

          return (
            <button
              key={item.id}
              type="button"
              className={`vbt-bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && <div className="vbt-bottom-nav-indicator" aria-hidden="true" />}

              <div className="vbt-nav-icon-container">
                {isProfileTab && hasUserAvatar ? (
                  <div
                    className="vbt-tab-mini-avatar"
                    style={{
                      border: isActive
                        ? '1.5px solid var(--vbt-sky, #60A5FA)'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    {currentUser.photoURL || currentUser.avatar ? (
                      <img
                        src={currentUser.photoURL || currentUser.avatar}
                        alt="Profile"
                      />
                    ) : (
                      <span>{userInitial.toUpperCase()}</span>
                    )}
                  </div>
                ) : (
                  <Icon size={20} strokeWidth={isActive ? 2.3 : 1.9} />
                )}

                {/* Show unread badge on Community tab if unreadCount > 0 */}
                {isCommunityTab && unreadCount > 0 && (
                  <span className="vbt-tab-badge" aria-hidden="true">
                    {formattedUnread}
                  </span>
                )}
              </div>

              <span className="vbt-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
