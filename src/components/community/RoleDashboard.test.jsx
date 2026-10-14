import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import RoleDashboard, {
  normalizeUserRole,
  ROLE_DASHBOARD_CONFIG,
} from './RoleDashboard';

describe('RoleDashboard & Operational Permissions Suite', () => {
  // ─────────────────────────────────────────────────────────────
  // 1. STRICT PRIVACY & PERMISSION PRINCIPLE
  // ─────────────────────────────────────────────────────────────
  describe('Strict Privacy & Permission Principle', () => {
    it('returns null when currentUser is null', () => {
      const html = renderToString(<RoleDashboard currentUser={null} />);
      expect(html).toBe('');
    });

    it('returns null when currentUser is undefined', () => {
      const html = renderToString(<RoleDashboard currentUser={undefined} />);
      expect(html).toBe('');
    });

    it('returns null when currentUser role is guest', () => {
      const html = renderToString(
        <RoleDashboard currentUser={{ role: 'guest', displayName: 'Anonymous Visitor' }} />
      );
      expect(html).toBe('');
    });

    it('returns null when currentUser has isGuest set to true', () => {
      const html = renderToString(
        <RoleDashboard currentUser={{ isGuest: true, role: 'member', displayName: 'Guest User' }} />
      );
      expect(html).toBe('');
    });

    it('ensures zero administrative controls, service request queues, or private attendance data leak to guests', () => {
      const html = renderToString(
        <RoleDashboard
          currentUser={null}
          serviceRequests={[{ id: 'req-secret', title: 'Private Pastoral Request' }]}
          eventRegistry={[{ code: 'secret-gathering', name: 'Internal Leadership Briefing' }]}
          memberContext={{ recentAttendance: [{ status: 'present' }] }}
        />
      );
      expect(html).toBe('');
      expect(html).not.toContain('Private Pastoral Request');
      expect(html).not.toContain('Internal Leadership Briefing');
      expect(html).not.toContain('Operations Console');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. ROLE NORMALIZATION LOGIC
  // ─────────────────────────────────────────────────────────────
  describe('normalizeUserRole helper', () => {
    it('normalizes admin aliases to "admin"', () => {
      expect(normalizeUserRole('admin')).toBe('admin');
      expect(normalizeUserRole('director')).toBe('admin');
      expect(normalizeUserRole('super_admin')).toBe('admin');
      expect(normalizeUserRole(' ADMIN ')).toBe('admin');
    });

    it('normalizes coordinator aliases to "coordinator"', () => {
      expect(normalizeUserRole('coordinator')).toBe('coordinator');
      expect(normalizeUserRole('service_leader')).toBe('coordinator');
      expect(normalizeUserRole('pastoral_care_leader')).toBe('coordinator');
      expect(normalizeUserRole('pastoral_care')).toBe('coordinator');
    });

    it('normalizes leader aliases to "leader"', () => {
      expect(normalizeUserRole('team_leader')).toBe('leader');
      expect(normalizeUserRole('leader')).toBe('leader');
      expect(normalizeUserRole('game_leader')).toBe('leader');
    });

    it('normalizes servant aliases to "servant"', () => {
      expect(normalizeUserRole('servant')).toBe('servant');
      expect(normalizeUserRole('active_servant')).toBe('servant');
      expect(normalizeUserRole('trained_servant')).toBe('servant');
    });

    it('normalizes member and default fallbacks to "member"', () => {
      expect(normalizeUserRole('member')).toBe('member');
      expect(normalizeUserRole('volunteer')).toBe('member');
      expect(normalizeUserRole('')).toBe('member');
      expect(normalizeUserRole(null)).toBe('member');
      expect(normalizeUserRole(undefined)).toBe('member');
    });

    it('correctly preserves "guest"', () => {
      expect(normalizeUserRole('guest')).toBe('guest');
      expect(normalizeUserRole(' GUEST ')).toBe('guest');
    });

    it('contains configuration for all standard community roles in ROLE_DASHBOARD_CONFIG', () => {
      const roles = ['admin', 'coordinator', 'leader', 'servant', 'member'];
      roles.forEach((roleKey) => {
        const conf = ROLE_DASHBOARD_CONFIG[roleKey];
        expect(conf).toBeDefined();
        expect(conf.label).toBeTruthy();
        expect(conf.color).toBeTruthy();
        expect(conf.icon).toBeDefined();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. MEMBER VIEW
  // ─────────────────────────────────────────────────────────────
  describe('Member Role Dashboard View', () => {
    const memberUser = {
      uid: 'u-member-1',
      displayName: 'Maria Shenouda',
      role: 'member',
    };

    it('renders member header and role badge', () => {
      const html = renderToString(<RoleDashboard currentUser={memberUser} />);
      expect(html).toContain('Operations Console');
      expect(html).toContain('Community Member');
      expect(html).toContain('Maria Shenouda');
      expect(html).toContain('Member Portal');
    });

    it('renders attendance summary ("Attended 4 of last 5 services")', () => {
      const html = renderToString(<RoleDashboard currentUser={memberUser} />);
      expect(html).toContain('Attendance Summary');
      expect(html).toContain('Attended 4 of last 5 services');
      expect(html).toContain('Faithful Presence');
    });

    it('renders custom attendance summary when provided in memberContext', () => {
      const html = renderToString(
        <RoleDashboard
          currentUser={memberUser}
          memberContext={{
            attendanceSummary: 'Attended 5 of last 5 services',
          }}
        />
      );
      expect(html).toContain('Attended 5 of last 5 services');
    });

    it('renders active serving applications ("Station Leader: Pending review")', () => {
      const html = renderToString(<RoleDashboard currentUser={memberUser} />);
      expect(html).toContain('Active Serving Applications');
      expect(html).toContain('Station Leader: Pending review');
      expect(html).toContain('Pending review');
    });

    it('renders custom active serving applications from memberContext', () => {
      const html = renderToString(
        <RoleDashboard
          currentUser={memberUser}
          memberContext={{
            pendingApplications: [
              {
                id: 'app-99',
                roleTitle: 'Court Referee Assistant',
                status: 'Under Coordinator Review',
                track: 'Youth Athletics',
              },
            ],
          }}
        />
      );
      expect(html).toContain('Court Referee Assistant: Under Coordinator Review');
      expect(html).toContain('Youth Athletics');
    });

    it('renders "Update My Availability" action button', () => {
      const html = renderToString(<RoleDashboard currentUser={memberUser} />);
      expect(html).toContain('Update My Availability');
    });

    it('renders My Registrations section with upcoming gatherings', () => {
      const html = renderToString(<RoleDashboard currentUser={memberUser} />);
      expect(html).toContain('My Registrations');
      expect(html).toContain('Friday Community Sports &amp; Fellowship');
      expect(html).toContain('Sunday Youth Basketball Scrimmage');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. SERVANT VIEW
  // ─────────────────────────────────────────────────────────────
  describe('Servant Role Dashboard View', () => {
    const servantUser = {
      uid: 'u-servant-1',
      displayName: 'Mina Shenouda',
      role: 'servant',
    };

    it('renders servant header and badge', () => {
      const html = renderToString(<RoleDashboard currentUser={servantUser} />);
      expect(html).toContain('Operations Console');
      expect(html).toContain('Servant');
      expect(html).toContain('Mina Shenouda');
      expect(html).toContain('Serving Duty');
    });

    it('renders upcoming assigned serving duties section with role, activity, time, and location', () => {
      const html = renderToString(<RoleDashboard currentUser={servantUser} />);
      expect(html).toContain('Upcoming Assigned Serving Duties');
      expect(html).toContain('Court A Referee');
      expect(html).toContain('Friday Youth Sports Gathering');
      expect(html).toContain('18:00 - 20:30');
      expect(html).toContain('Upper Court &amp; Gymnasium');
    });

    it('renders "Confirm Assignment" button for duties pending confirmation', () => {
      const html = renderToString(<RoleDashboard currentUser={servantUser} />);
      expect(html).toContain('Confirm Assignment');
    });

    it('renders green confirmed badge for duties that are confirmed', () => {
      const html = renderToString(
        <RoleDashboard
          currentUser={servantUser}
          memberContext={{
            assignedDuties: [
              {
                id: 'duty-confirmed-1',
                role: 'First Aid Safety Leader',
                activity: 'Saturday Soccer Tournament',
                time: '09:00 - 13:00',
                location: 'Soccer Turf Field',
                status: 'confirmed',
              },
            ],
          }}
        />
      );
      expect(html).toContain('First Aid Safety Leader');
      expect(html).toContain('Saturday Soccer Tournament');
      expect(html).toContain('Confirmed');
      expect(html).not.toContain('Confirm Assignment');
    });

    it('renders servant briefing link', () => {
      const html = renderToString(<RoleDashboard currentUser={servantUser} />);
      expect(html).toContain('Servant Briefing');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. TEAM LEADER / LEADER VIEW
  // ─────────────────────────────────────────────────────────────
  describe('Team Leader / Leader Role Dashboard View', () => {
    const leaderUser = {
      uid: 'u-leader-1',
      displayName: 'David Farid',
      role: 'team_leader',
      team: 'Team Blue 3',
    };

    it('renders team leader header and badge', () => {
      const html = renderToString(<RoleDashboard currentUser={leaderUser} />);
      expect(html).toContain('Operations Console');
      expect(html).toContain('Team Leader');
      expect(html).toContain('David Farid');
      expect(html).toContain('Team Leadership');
    });

    it('renders assigned team overview (e.g. "Team Blue 3")', () => {
      const html = renderToString(<RoleDashboard currentUser={leaderUser} />);
      expect(html).toContain('Assigned Team Overview');
      expect(html).toContain('Team Blue 3');
      expect(html).toContain('Active Shepherd');
    });

    it('renders team attendance counter (e.g. "8/10 kids present")', () => {
      const html = renderToString(<RoleDashboard currentUser={leaderUser} />);
      expect(html).toContain('Live Attendance');
      expect(html).toContain('8/10 kids present');
    });

    it('renders custom team attendance counter when specified in memberContext', () => {
      const html = renderToString(
        <RoleDashboard
          currentUser={leaderUser}
          memberContext={{
            team: {
              name: 'Team Red Lions',
              presentCount: 9,
              totalCount: 12,
              division: 'Senior High School (Ages 14-17)',
            },
          }}
        />
      );
      expect(html).toContain('Team Red Lions');
      expect(html).toContain('9/12 kids present');
    });

    it('renders roster check-in link', () => {
      const html = renderToString(<RoleDashboard currentUser={leaderUser} />);
      expect(html).toContain('Roster Check-In');
    });

    it('renders missing kids follow-up notes', () => {
      const html = renderToString(<RoleDashboard currentUser={leaderUser} />);
      expect(html).toContain('Missing Kids Follow-Up Notes');
      expect(html).toContain('Mark B.');
      expect(html).toContain('Absent 2 weeks');
      expect(html).toContain('David F.');
      expect(html).toContain('Absent today');
      expect(html).toContain('Save Note');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. COORDINATOR / SERVICE LEADER VIEW
  // ─────────────────────────────────────────────────────────────
  describe('Coordinator / Service Leader Role Dashboard View', () => {
    const coordinatorUser = {
      uid: 'u-coord-1',
      displayName: 'Sarah Bishara',
      role: 'coordinator',
    };

    it('renders coordinator header and badge', () => {
      const html = renderToString(<RoleDashboard currentUser={coordinatorUser} />);
      expect(html).toContain('Operations Console');
      expect(html).toContain('Coordinator');
      expect(html).toContain('Sarah Bishara');
      expect(html).toContain('Service Coordinator');
    });

    it('works identically with service_leader role', () => {
      const serviceLeadUser = {
        uid: 'u-lead-2',
        displayName: 'Peter Ibrahim',
        role: 'service_leader',
      };
      const html = renderToString(<RoleDashboard currentUser={serviceLeadUser} />);
      expect(html).toContain('Coordinator');
      expect(html).toContain('Peter Ibrahim');
      expect(html).toContain('+ Create New Service Day');
    });

    it('renders member onboarding count ("14 members in onboarding")', () => {
      const html = renderToString(<RoleDashboard currentUser={coordinatorUser} />);
      expect(html).toContain('Member Onboarding');
      expect(html).toContain('14 members in onboarding');
    });

    it('renders "+ Create New Service Day" action', () => {
      const html = renderToString(<RoleDashboard currentUser={coordinatorUser} />);
      expect(html).toContain('+ Create New Service Day');
    });

    it('renders incoming outreach service requests review with "Approve Request" button', () => {
      const html = renderToString(<RoleDashboard currentUser={coordinatorUser} />);
      expect(html).toContain('Incoming Outreach Service Requests');
      expect(html).toContain('St. Mary Youth Outreach');
      expect(html).toContain('Approve Request');
    });

    it('renders active services quick-access', () => {
      const html = renderToString(<RoleDashboard currentUser={coordinatorUser} />);
      expect(html).toContain('Active Services Quick-Access');
      expect(html).toContain('Friday Community Sports &amp; Fellowship');
    });

    it('renders custom service requests when passed via props', () => {
      const customRequests = [
        {
          id: 'req-special',
          title: 'Special Summer Olympic Day',
          requesterName: 'Coach Thomas',
          status: 'pending',
          date: '2026-08-01',
          description: 'Requires 10 athletic track leaders.',
        },
      ];
      const html = renderToString(
        <RoleDashboard
          currentUser={coordinatorUser}
          serviceRequests={customRequests}
        />
      );
      expect(html).toContain('Special Summer Olympic Day');
      expect(html).toContain('Coach Thomas');
      expect(html).toContain('Requires 10 athletic track leaders');
      expect(html).toContain('Approve Request');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. ADMIN VIEW
  // ─────────────────────────────────────────────────────────────
  describe('Admin Role Dashboard View', () => {
    const adminUser = {
      uid: 'u-admin-1',
      displayName: 'Father Shenouda',
      role: 'admin',
    };

    it('renders admin header and badge', () => {
      const html = renderToString(<RoleDashboard currentUser={adminUser} />);
      expect(html).toContain('Operations Console');
      expect(html).toContain('Admin / Director');
      expect(html).toContain('Father Shenouda');
      expect(html).toContain('Admin Operations');
    });

    it('renders global community health (active members, active events, pending requests)', () => {
      const html = renderToString(<RoleDashboard currentUser={adminUser} />);
      expect(html).toContain('Global Community Health');
      expect(html).toContain('Active Members');
      expect(html).toContain('148');
      expect(html).toContain('Active Events');
      expect(html).toContain('Pending Requests');
    });

    it('renders "+ Create New Event" and "Setup July 6th Service" action buttons', () => {
      const html = renderToString(<RoleDashboard currentUser={adminUser} />);
      expect(html).toContain('+ Create New Event');
      expect(html).toContain('Setup July 6th Service');
    });

    it('renders audit logs link and system settings link', () => {
      const html = renderToString(<RoleDashboard currentUser={adminUser} />);
      expect(html).toContain('Audit Logs');
      expect(html).toContain('System Settings');
    });

    it('allows perspective view switching for super users', () => {
      const html = renderToString(<RoleDashboard currentUser={adminUser} />);
      expect(html).toContain('View:');
      expect(html).toContain('servant');
      expect(html).toContain('leader');
      expect(html).toContain('coordinator');
      expect(html).toContain('member');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. OFFLINE MODE & ACCESSIBILITY
  // ─────────────────────────────────────────────────────────────
  describe('Offline Mode & Accessibility', () => {
    const memberUser = {
      uid: 'u-member-1',
      displayName: 'Peter Shenouda',
      role: 'member',
    };

    it('renders offline indicator and banner when isOffline is true', () => {
      const html = renderToString(
        <RoleDashboard currentUser={memberUser} isOffline={true} />
      );
      expect(html).toContain('Offline Mode');
      expect(html).toContain('cached local state');
    });

    it('does not render offline banner when isOffline is false', () => {
      const html = renderToString(
        <RoleDashboard currentUser={memberUser} isOffline={false} />
      );
      expect(html).not.toContain('cached local state');
    });

    it('renders accessible container with region role and aria-label', () => {
      const html = renderToString(<RoleDashboard currentUser={memberUser} />);
      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Role-aware operations dashboard"');
    });

    it('renders profile and sign out buttons when callbacks are provided', () => {
      const html = renderToString(
        <RoleDashboard
          currentUser={memberUser}
          onOpenProfile={vi.fn()}
          onLogout={vi.fn()}
        />
      );
      expect(html).toContain('Profile');
      expect(html).toContain('Sign Out');
    });
  });
});
