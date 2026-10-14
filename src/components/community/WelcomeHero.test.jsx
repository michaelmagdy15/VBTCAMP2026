import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import WelcomeHero, {
  getTimeGreeting,
  getFirstName,
  getInitials,
  normalizeRoleKey,
  resolveContextualCta,
} from './WelcomeHero';

describe('WelcomeHero Component & Logic Suite', () => {
  describe('Helper: getTimeGreeting', () => {
    it('returns "Good morning" before noon', () => {
      const morningDate = new Date('2026-10-07T08:30:00');
      expect(getTimeGreeting(morningDate)).toBe('Good morning');
    });

    it('returns "Good afternoon" between 12:00 and 16:59', () => {
      const afternoonDate = new Date('2026-10-07T14:15:00');
      expect(getTimeGreeting(afternoonDate)).toBe('Good afternoon');
    });

    it('returns "Good evening" at or after 17:00', () => {
      const eveningDate = new Date('2026-10-07T19:45:00');
      expect(getTimeGreeting(eveningDate)).toBe('Good evening');
    });
  });

  describe('Helper: getFirstName', () => {
    it('prioritizes memberProfile.firstName', () => {
      const currentUser = { displayName: 'Michael Magdy' };
      const memberProfile = { firstName: 'Mina', lastName: 'Farid' };
      expect(getFirstName(currentUser, memberProfile)).toBe('Mina');
    });

    it('extracts first token from currentUser.displayName if profile is absent', () => {
      const currentUser = { displayName: 'David Shenouda' };
      expect(getFirstName(currentUser, null)).toBe('David');
    });

    it('extracts first token from currentUser.name', () => {
      const currentUser = { name: 'Peter Youssef' };
      expect(getFirstName(currentUser, null)).toBe('Peter');
    });

    it('falls back gracefully to Servant when no name is provided', () => {
      expect(getFirstName(null, null)).toBe('Servant');
    });
  });

  describe('Helper: getInitials', () => {
    it('combines memberProfile.firstName and lastName initials', () => {
      const profile = { firstName: 'Joseph', lastName: 'Boulos' };
      expect(getInitials(null, profile)).toBe('JB');
    });

    it('derives from multi-word display name', () => {
      const user = { displayName: 'Anthony Rizk' };
      expect(getInitials(user, null)).toBe('AR');
    });

    it('falls back to single initial or default', () => {
      const user = { displayName: 'VBT' };
      expect(getInitials(user, null)).toBe('VB');
      expect(getInitials(null, null)).toBe('V');
    });
  });

  describe('Helper: normalizeRoleKey', () => {
    it('maps admin and director roles to admin', () => {
      expect(normalizeRoleKey('admin')).toBe('admin');
      expect(normalizeRoleKey('camp_director')).toBe('admin');
    });

    it('maps coordinator roles to coordinator', () => {
      expect(normalizeRoleKey('coordinator')).toBe('coordinator');
      expect(normalizeRoleKey('lead_coordinator')).toBe('coordinator');
    });

    it('maps leader roles to team_leader', () => {
      expect(normalizeRoleKey('leader')).toBe('team_leader');
      expect(normalizeRoleKey('team_leader')).toBe('team_leader');
    });

    it('maps servant/volunteer to servant', () => {
      expect(normalizeRoleKey('servant')).toBe('servant');
      expect(normalizeRoleKey('volunteer')).toBe('servant');
      expect(normalizeRoleKey('service_leader')).toBe('servant');
    });

    it('defaults unknown or null to member', () => {
      expect(normalizeRoleKey(null)).toBe('member');
      expect(normalizeRoleKey('participant')).toBe('member');
    });
  });

  describe('Contextual CTA Priority Engine: resolveContextualCta', () => {
    it('Priority 1: Selects check-in when attendance is open for today\'s activity', () => {
      const onCheckIn = vi.fn();
      const activity = {
        id: 'act-1',
        title: 'Friday Sports & Fellowship',
        isAttendanceOpen: true,
      };
      const pendingAssignment = { id: 'asgn-1', role: 'Scorekeeper' };
      const openOpportunitiesCount = 5;

      const cta = resolveContextualCta({
        upcomingActivity: activity,
        pendingAssignment,
        openOpportunitiesCount,
        onCheckIn,
      });

      expect(cta.priority).toBe(1);
      expect(cta.type).toBe('check_in');
      expect(cta.label).toContain('⚡ Check in to Friday Sports & Fellowship');
      cta.onClick();
      expect(onCheckIn).toHaveBeenCalledWith(activity);
    });

    it('Priority 2: Selects confirm serving assignment when pendingAssignment exists and attendance is not open', () => {
      const onConfirmServing = vi.fn();
      const activity = {
        id: 'act-1',
        title: 'Next Week Gathering',
        isAttendanceOpen: false,
      };
      const pendingAssignment = {
        id: 'asgn-7',
        roleTitle: 'Court Referee',
        status: 'pending',
      };
      const openOpportunitiesCount = 3;

      const cta = resolveContextualCta({
        upcomingActivity: activity,
        pendingAssignment,
        openOpportunitiesCount,
        onConfirmServing,
      });

      expect(cta.priority).toBe(2);
      expect(cta.type).toBe('confirm_serving');
      expect(cta.label).toBe('🤝 Confirm your serving assignment');
      cta.onClick();
      expect(onConfirmServing).toHaveBeenCalledWith(pendingAssignment);
    });

    it('Priority 3: Selects see this week service when registration is available and no pending assignment', () => {
      const onExploreWeek = vi.fn();
      const activity = {
        id: 'act-2',
        title: 'Wednesday Youth Prayer & Gym',
        canRegister: true,
      };

      const cta = resolveContextualCta({
        upcomingActivity: activity,
        pendingAssignment: null,
        openOpportunitiesCount: 4,
        onExploreWeek,
      });

      expect(cta.priority).toBe(3);
      expect(cta.type).toBe('see_service');
      expect(cta.label).toBe("📅 See this week's service");
      cta.onClick();
      expect(onExploreWeek).toHaveBeenCalledWith(activity);
    });

    it('Priority 4: Selects open serving opportunities when count > 0 and no activities/assignments', () => {
      const onOpenServe = vi.fn();

      const cta = resolveContextualCta({
        upcomingActivity: null,
        pendingAssignment: null,
        openOpportunitiesCount: 6,
        onOpenServe,
      });

      expect(cta.priority).toBe(4);
      expect(cta.type).toBe('open_serve');
      expect(cta.label).toContain('❤️ Find a way to serve (6 spots open)');
      cta.onClick();
      expect(onOpenServe).toHaveBeenCalled();
    });

    it('Priority 4: Formats singular spot when count is 1', () => {
      const cta = resolveContextualCta({
        upcomingActivity: null,
        pendingAssignment: null,
        openOpportunitiesCount: 1,
      });

      expect(cta.label).toContain('(1 spot open)');
    });

    it('Priority 5 (Default): Fallback to explore community when no other triggers exist', () => {
      const onExploreWeek = vi.fn();

      const cta = resolveContextualCta({
        upcomingActivity: null,
        pendingAssignment: null,
        openOpportunitiesCount: 0,
        onExploreWeek,
      });

      expect(cta.priority).toBe(5);
      expect(cta.type).toBe('explore_community');
      expect(cta.label).toBe('✨ Explore community');
      cta.onClick();
      expect(onExploreWeek).toHaveBeenCalled();
    });
  });

  describe('WelcomeHero Component Rendering (Visitor State)', () => {
    it('renders visitor headline, subtitle, brand pillars, and CTAs when !currentUser', () => {
      const html = renderToString(
        <WelcomeHero
          currentUser={null}
          memberProfile={null}
        />
      );

      // Headline & Subtitle
      expect(html).toContain('Find your place in VBT');
      expect(html).toContain('A church sports community built around faith, friendship, and serving.');

      // Brand Pillars
      expect(html).toContain('Faith');
      expect(html).toContain('Sport');
      expect(html).toContain('Service');
      expect(html).toContain('Community');

      // Primary CTAs
      expect(html).toContain('Join VBT');
      expect(html).toContain('Explore this week');

      // Secondary Quick Action bar
      expect(html).toContain('Scan Attendance QR');
      expect(html).toContain('Join with event code');
    });
  });

  describe('WelcomeHero Component Rendering (Member State)', () => {
    it('renders member greeting, headline, role badge, assigned team, and quick chips when currentUser is present', () => {
      const currentUser = {
        uid: 'usr-123',
        displayName: 'Fady Michael',
      };
      const memberProfile = {
        firstName: 'Fady',
        lastName: 'Michael',
        role: 'team_leader',
        teamName: 'Blue Lions',
      };
      const upcomingActivity = {
        id: 'serv-1',
        title: 'Friday Fellowship Gathering',
        isAttendanceOpen: true,
      };

      const html = renderToString(
        <WelcomeHero
          currentUser={currentUser}
          memberProfile={memberProfile}
          upcomingActivity={upcomingActivity}
          openOpportunitiesCount={2}
        />
      );

      // Welcome back & greeting
      expect(html).toContain('Welcome back to VBT');
      expect(html).toContain('Fady');

      // Member Status Row
      expect(html).toContain('FM'); // initials
      expect(html).toContain('Team Leader');
      expect(html).toContain('Team Blue Lions');

      // Contextual Primary Action Button
      expect(html).toContain('⚡ Check in to Friday Fellowship Gathering');

      // Quick action chips below
      expect(html).toContain('Scan QR');
      expect(html).toContain('Enter Code');
      expect(html).toContain('My Schedule');
    });

    it('renders role badges correctly for Admin, Coordinator, Servant, and Member', () => {
      const adminHtml = renderToString(
        <WelcomeHero
          currentUser={{ uid: 'admin-1' }}
          memberProfile={{ role: 'admin', firstName: 'Mark' }}
        />
      );
      expect(adminHtml).toContain('Admin');

      const coordHtml = renderToString(
        <WelcomeHero
          currentUser={{ uid: 'coord-1' }}
          memberProfile={{ role: 'coordinator', firstName: 'Sarah' }}
        />
      );
      expect(coordHtml).toContain('Coordinator');

      const servantHtml = renderToString(
        <WelcomeHero
          currentUser={{ uid: 'servant-1' }}
          memberProfile={{ role: 'servant', firstName: 'Kyrollos' }}
        />
      );
      expect(servantHtml).toContain('Servant');

      const memberHtml = renderToString(
        <WelcomeHero
          currentUser={{ uid: 'member-1' }}
          memberProfile={{ role: 'member', firstName: 'Daniel' }}
        />
      );
      expect(memberHtml).toContain('Member');
    });

    it('handles image avatar URL rendering with fallback initials', () => {
      const html = renderToString(
        <WelcomeHero
          currentUser={{ uid: 'usr-img' }}
          memberProfile={{
            firstName: 'Marina',
            lastName: 'Naguib',
            photoUrl: 'https://vbt.org/avatar.jpg',
          }}
        />
      );
      expect(html).toContain('src="https://vbt.org/avatar.jpg"');
      expect(html).toContain('Marina');
    });
  });
});
