import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import CommunityHome from './CommunityHome';

describe('CommunityHome Component Suite', () => {
  const mockActivities = [
    {
      id: 'act_friday_1',
      title: 'Friday Community Sports & Fellowship',
      date: '2026-10-16',
      startTime: '18:30',
      endTime: '21:30',
      location: { name: 'Main Gym' },
      isRegistrationOpen: true,
      isAttendanceOpen: true,
      status: 'active',
      isToday: true,
    },
    {
      id: 'act_tuesday_1',
      title: 'Servants Planning Meeting',
      date: '2026-10-13',
      startTime: '19:00',
      endTime: '20:30',
      location: { name: 'Upper Room' },
      isRegistrationOpen: true,
      status: 'scheduled',
    },
  ];

  const mockOpportunities = [
    {
      id: 'opp_1',
      role: 'sports_head',
      roleTitle: 'Sports Court Lead',
      activityName: 'Friday Sports Night',
      date: '2026-10-16',
      time: '18:00 - 21:30',
      spotsRemaining: 2,
      capacity: 3,
      filledCount: 1,
    },
    {
      id: 'opp_2',
      role: 'hydration',
      roleTitle: 'Hydration & Welcome Station',
      activityName: 'Friday Sports Night',
      date: '2026-10-16',
      time: '18:00 - 21:00',
      spotsRemaining: 1,
      capacity: 2,
      filledCount: 1,
    },
  ];

  const mockUser = {
    uid: 'user_123',
    displayName: 'Michael Magdy',
    role: 'coordinator',
    email: 'michael@vbt.app',
  };

  it('renders visitor state without throwing when currentUser is null', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={null}
        activities={mockActivities}
        opportunities={mockOpportunities}
      />
    );

    expect(html).toContain('vbt-community-home-container');
    expect(html).toContain('Weekly Rhythm');
    expect(html).toContain('Serve with VBT');
    expect(html).toContain('Community Pulse');

  });

  it('renders member/coordinator state and Servant Duty Cockpit when currentUser is provided', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        activities={mockActivities}
        opportunities={mockOpportunities}
      />
    );

    expect(html).toContain('Michael');
    expect(html).toContain('servant-duty-cockpit');
    expect(html).toContain('role-dashboard-container');
    expect(html).toContain('Coordinator');
  });

  it('renders live activity banner when active events are in eventRegistry', () => {
    const activeRegistry = [
      {
        code: 'live_camp_1',
        name: 'October Youth Camp 2026',
        active: true,
        expired: false,
      },
    ];

    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        eventRegistry={activeRegistry}
        activities={mockActivities}
      />
    );

    expect(html).toContain('live-activity-banner');
    expect(html).toContain('October Youth Camp 2026');
    expect(html).toContain('Door QR');
    expect(html).toContain('WhatsApp Brief');
    expect(html).toContain('Enter Live Room');
  });

  it('does not render live banner when all events are expired or inactive', () => {
    const inactiveRegistry = [
      {
        code: 'june26',
        name: 'Past June Camp',
        active: false,
        expired: true,
      },
    ];

    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        eventRegistry={inactiveRegistry}
        activities={mockActivities}
      />
    );

    expect(html).not.toContain('live-activity-banner');
  });

  it('renders Quick Community Actions buttons including Servant & Leader Command Hub', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={null}
        activities={mockActivities}
        opportunities={mockOpportunities}
      />
    );

    expect(html).toContain('Quick Community Actions');
    expect(html).toContain('Servant &amp; Leader Command Hub');
    expect(html).toContain('Join with Code');
    expect(html).toContain('Check In / Scan');
    expect(html).toContain('Request Service');
    expect(html).toContain('Find Your Place');
    expect(html).toContain('Servant &amp; Coordinator Sign-In');
  });

  it('renders BottomNavigation with all standard tabs', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        activities={mockActivities}
      />
    );

    expect(html).toContain('vbt-bottom-nav-root');
    expect(html).toContain('Home');
    expect(html).toContain('Community');
    expect(html).toContain('Serve');
    expect(html).toContain('Schedule');
    expect(html).toContain('Profile');
  });

  it('renders community tab content when initialTab is "community"', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        initialTab="community"
        activities={mockActivities}
      />
    );

    expect(html).toContain('Community &amp; Fellowship');
    expect(html).toContain('Back to Home');
  });

  it('renders serve tab content when initialTab is "serve"', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        initialTab="serve"
        opportunities={mockOpportunities}
      />
    );

    expect(html).toContain('Serving Marketplace');
    expect(html).toContain('Take &quot;Find Your Place&quot; Quiz');
    expect(html).toContain('My Servant Passport');
  });

  it('renders schedule tab content when initialTab is "schedule"', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        initialTab="schedule"
        activities={mockActivities}
      />
    );

    expect(html).toContain('Gathering Rhythm &amp; Schedule');
    expect(html).toContain('Friday Community Sports &amp; Fellowship');
  });

  it('renders profile tab content when initialTab is "profile"', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        initialTab="profile"
      />
    );

    expect(html).toContain('Member Profile &amp; Tools');
    expect(html).toContain('Sign Out of Profile');
  });

  it('renders sign-in prompt on profile tab when guest', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={null}
        initialTab="profile"
      />
    );

    expect(html).toContain('Sign In to View Profile');
    expect(html).toContain('Coordinator &amp; Admin Login');
  });

  it('shows offline notice indicators when isOffline is true', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        isOffline={true}
        activities={mockActivities}
        opportunities={mockOpportunities}
      />
    );

    expect(html).toContain('offline');
  });

  it('renders launch new event shortcut when onCreateNewEvent is provided', () => {
    const onCreateNewEvent = vi.fn();
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        onCreateNewEvent={onCreateNewEvent}
      />
    );

    expect(html).toContain('Launch / Clone Service Event');
  });

  it('renders the Native Mobile App Shell, Momentum Scroll Viewport, Segmented Control, and Standalone Install Banner', () => {
    const html = renderToString(
      <CommunityHome
        currentUser={mockUser}
        activities={mockActivities}
        opportunities={mockOpportunities}
      />
    );

    expect(html).toContain('vbt-native-shell');
    expect(html).toContain('native-scroll-viewport');
    expect(html).toContain('native-home-segmented-control');
    expect(html).toContain('segment-tab-week');
    expect(html).toContain('segment-tab-serve');
    expect(html).toContain('segment-tab-pulse');
    expect(html).toContain('segment-tab-tools');
    expect(html).toContain('install-app-banner');
    expect(html).toContain('Get the Fullscreen VBT Mobile App');
  });
});

