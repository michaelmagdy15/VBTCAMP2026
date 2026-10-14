import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import TeamCultureFeed from './TeamCultureFeed';
import * as CommunityExports from './index';
import {
  FEED_FILTER_SCOPES,
  VISIBILITY_SCOPES,
  POST_TYPES,
  REACTION_TYPES,
} from '../../services/teamCultureService';

vi.mock('../../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ type: 'collection' })),
  doc: vi.fn(() => ({ type: 'doc' })),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  getDocs: vi.fn(async () => ({ forEach: () => {}, size: 0 })),
  setDoc: vi.fn(async () => true),
  updateDoc: vi.fn(async () => true),
  deleteDoc: vi.fn(async () => true),
  onSnapshot: vi.fn(() => () => {}),
  serverTimestamp: vi.fn(() => 'MOCK_TS'),
}));

describe('TeamCultureFeed Component', () => {
  describe('Exports and Component Signatures', () => {
    it('exports TeamCultureFeed as default and named export', () => {
      expect(TeamCultureFeed).toBeDefined();
      expect(typeof TeamCultureFeed).toBe('function');
      expect(CommunityExports.TeamCultureFeed).toBe(TeamCultureFeed);
    });

    it('creates a React element with default props', () => {
      const element = React.createElement(TeamCultureFeed, {});
      expect(element).toBeDefined();
      expect(element.type).toBe(TeamCultureFeed);
    });

    it('creates a React element with leader user profile', () => {
      const leaderUser = {
        id: 'usr_leader',
        name: 'Sarah Coordinator',
        role: 'coordinator',
        teamId: 'team_lions',
      };
      const element = React.createElement(TeamCultureFeed, {
        communityId: 'vbt_main',
        currentUser: leaderUser,
        teamId: 'team_lions',
      });

      expect(element.props.currentUser.role).toBe('coordinator');
      expect(element.props.communityId).toBe('vbt_main');
      expect(element.props.teamId).toBe('team_lions');
    });

    it('creates a React element for regular member', () => {
      const memberUser = {
        id: 'usr_member',
        name: 'John Camper',
        role: 'member',
        teamId: 'team_eagles',
      };
      const element = React.createElement(TeamCultureFeed, {
        communityId: 'vbt_main',
        currentUser: memberUser,
        teamId: 'team_eagles',
      });

      expect(element.props.currentUser.role).toBe('member');
    });
  });

  describe('Contract Alignment', () => {
    it('aligns with core visibility scopes', () => {
      expect(VISIBILITY_SCOPES.COMMUNITY).toBe('community');
      expect(VISIBILITY_SCOPES.TEAM).toBe('team');
      expect(VISIBILITY_SCOPES.GROUP).toBe('group');
      expect(VISIBILITY_SCOPES.LEADER_ONLY).toBe('leader_only');
      expect(VISIBILITY_SCOPES.PASTORAL_PRIVATE).toBe('pastoral_private');
      expect(VISIBILITY_SCOPES.PRIVATE).toBe('private');
    });

    it('aligns with feed filter scopes and reaction types', () => {
      expect(FEED_FILTER_SCOPES.ALL).toBe('all');
      expect(FEED_FILTER_SCOPES.MY_TEAM).toBe('team');
      expect(FEED_FILTER_SCOPES.SERVANTS).toBe('servants');
      expect(FEED_FILTER_SCOPES.ANNOUNCEMENTS).toBe('announcements');
      expect(FEED_FILTER_SCOPES.CHALLENGES).toBe('challenges');
      expect(FEED_FILTER_SCOPES.CELEBRATIONS).toBe('celebrations');

      expect(REACTION_TYPES.HEART).toBe('heart');
      expect(REACTION_TYPES.AMEN).toBe('amen');
      expect(REACTION_TYPES.CLAP).toBe('clap');
      expect(REACTION_TYPES.PRAY).toBe('pray');
      expect(REACTION_TYPES.FIRE).toBe('fire');
    });
  });
});
