import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import CommunityHealthDashboard from './CommunityHealthDashboard';
import {
  NORTH_STAR_METRIC_NAME,
  NORTH_STAR_METRIC_DESCRIPTION,
  createMockCommunityHealthData,
} from '../../services/communityHealthService';

describe('CommunityHealthDashboard Component', () => {
  const coordinatorUser = {
    uid: 'coord_paul',
    displayName: 'Paul Coordinator',
    role: 'coordinator',
  };

  const adminUser = {
    uid: 'admin_mary',
    displayName: 'Mary Administrator',
    role: 'admin',
  };

  const regularMemberUser = {
    uid: 'mem_steve',
    displayName: 'Steve Member',
    role: 'member',
  };

  const sampleMockData = createMockCommunityHealthData();

  describe('Authorization & Access Restriction', () => {
    it('renders unauthorized notice when user is a regular member', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={regularMemberUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Coordinator &amp; Pastoral Care View Only');
      expect(html).toContain('reserved exclusively for designated coordinators');
      expect(html).toContain('Pastoral Care Confidentiality Guarantee');
      // Should NOT render North-Star dashboard
      expect(html).not.toContain(NORTH_STAR_METRIC_NAME);
    });

    it('renders unauthorized notice when user is null or undefined', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={null}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Coordinator &amp; Pastoral Care View Only');
    });

    it('renders return to home button if onNavigate is passed', () => {
      const onNavigate = vi.fn();
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={regularMemberUser}
          onNavigate={onNavigate}
        />
      );

      expect(html).toContain('Return to Community Home');
    });
  });

  describe('Authorized Dashboard Rendering (Coordinator / Admin)', () => {
    it('renders dashboard with coordinator credentials', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={coordinatorUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Community Health &amp; Care Signals');
      expect(html).toContain('Coordinator Confidential');
      expect(html).toContain('Care &amp; Planning Tool');
    });

    it('renders dashboard with admin credentials', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={adminUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Community Health &amp; Care Signals');
    });
  });

  describe('North-Star KPI Card', () => {
    it('displays the North-Star metric name, definition, and count', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={coordinatorUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain(NORTH_STAR_METRIC_NAME);
      expect(html).toContain(
        'Weekly active community members who participate, serve, or meaningfully connect.'
      );
      expect(html).toContain('Active Members');
    });

    it('displays the 3 pillars: Participating, Serving, and Connecting', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={coordinatorUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Participating');
      expect(html).toContain('Serving');
      expect(html).toContain('Connecting');
      expect(html).toContain('members</strong> engaged across 2+ pillars');
    });
  });

  describe('Care Signal Alert Badges', () => {
    it('renders all quick care signal alert badges', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={coordinatorUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('May Need Follow-Up');
      expect(html).toContain('Rest Suggested');
      expect(html).toContain('Connection / Prayer');
      expect(html).toContain('First-Time Servants');
      expect(html).toContain('Open Station Roles');
      expect(html).toContain('Unconfirmed Slots');
    });
  });

  describe('Volunteer Well-Being & Burnout Monitor', () => {
    it('renders volunteer well-being insights and recommendations', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={coordinatorUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Servant Rhythms &amp; Well-Being');
      expect(html).toContain('Burnout Prevention');
    });
  });

  describe('Open Roles Thermometer', () => {
    it('renders volunteer capacity and open roles progress thermometer', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={coordinatorUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Volunteer Capacity &amp; Station Roster');
      expect(html).toContain('spots covered');
    });
  });

  describe('Exportable Care Action Checklist & Ethics', () => {
    it('renders care plan copy button and ethical care principles footnote', () => {
      const html = renderToString(
        <CommunityHealthDashboard
          currentUser={coordinatorUser}
          initialData={sampleMockData}
        />
      );

      expect(html).toContain('Copy Care Plan');
      expect(html).toContain('Care Principles Safeguard');
      expect(html).toContain('NEVER public scores or gamified rankings');
      expect(html).toContain('Confidential pastoral notes are strictly isolated');
    });
  });
});
