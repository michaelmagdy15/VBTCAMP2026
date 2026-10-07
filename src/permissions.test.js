import { describe, it, expect } from 'vitest';
import {
  ROLES,
  getPermissionLevel,
  canViewScoreboard,
  canEditScore,
  canEditDeductions,
  canEditTokens,
  canPostAnnouncement,
  canEditConfig,
  canSendPing,
  canCreateAlert,
  canControlStopwatch,
  getEditableTeams,
  getEditableGames
} from './permissions';

describe('Permissions Module (RBAC)', () => {
  describe('getPermissionLevel', () => {
    it('defaults to volunteer if user has no role', () => {
      expect(getPermissionLevel(null)).toBe(ROLES.VOLUNTEER);
      expect(getPermissionLevel({})).toBe(ROLES.VOLUNTEER);
    });

    it('maps legacy roles to standard roles', () => {
      expect(getPermissionLevel({ role: 'admin' })).toBe(ROLES.COORDINATOR);
      expect(getPermissionLevel({ role: 'leader' })).toBe(ROLES.TEAM_LEADER);
      expect(getPermissionLevel({ role: 'referee' })).toBe(ROLES.GAME_LEADER);
      expect(getPermissionLevel({ role: 'service_leader' })).toBe(ROLES.SERVICE_DAY_LEADER);
    });

    it('preserves native roles', () => {
      expect(getPermissionLevel({ role: ROLES.COORDINATOR })).toBe(ROLES.COORDINATOR);
      expect(getPermissionLevel({ role: ROLES.GAME_LEADER })).toBe(ROLES.GAME_LEADER);
    });
  });

  describe('canViewScoreboard', () => {
    it('allows everyone to view scoreboard', () => {
      expect(canViewScoreboard(null)).toBe(true);
      expect(canViewScoreboard({ role: 'volunteer' })).toBe(true);
    });
  });

  describe('canEditScore', () => {
    it('allows coordinator and service day leaders unconditionally', () => {
      const coordinator = { role: 'admin' };
      const serviceLeader = { role: 'service_leader' };
      const matchup = { game: 'Blind Builder' };

      expect(canEditScore(coordinator, matchup)).toBe(true);
      expect(canEditScore(serviceLeader, matchup)).toBe(true);
    });

    it('allows game leader only for their assigned games', () => {
      const referee = { role: 'referee', assignedGames: ['Blind Builder', 'Skee Ball'] };
      expect(canEditScore(referee, { game: 'Blind Builder' })).toBe(true);
      expect(canEditScore(referee, { game: 'Whiffle Ball' })).toBe(false);
    });

    it('forbids team leaders and volunteers from editing scores', () => {
      const teamLeader = { role: 'leader' };
      const volunteer = { role: 'volunteer' };
      expect(canEditScore(teamLeader, { game: 'Blind Builder' })).toBe(false);
      expect(canEditScore(volunteer, { game: 'Blind Builder' })).toBe(false);
    });
  });

  describe('canEditDeductions', () => {
    it('allows coordinator and service day leaders unconditionally', () => {
      expect(canEditDeductions({ role: 'admin' }, 'team_red_1')).toBe(true);
      expect(canEditDeductions({ role: 'service_leader' }, 'team_red_1')).toBe(true);
    });

    it('allows team leaders only for their assigned teams', () => {
      const leader = { role: 'leader', assignedTeams: ['team_red_1', 'team_red_2'] };
      expect(canEditDeductions(leader, 'team_red_1')).toBe(true);
      expect(canEditDeductions(leader, 'team_blue_1')).toBe(false);
    });

    it('forbids referees and volunteers from editing deductions', () => {
      expect(canEditDeductions({ role: 'referee' }, 'team_red_1')).toBe(false);
      expect(canEditDeductions({ role: 'volunteer' }, 'team_red_1')).toBe(false);
    });
  });

  describe('canEditTokens and canEditConfig', () => {
    it('only allows coordinators/admins to edit tokens and config', () => {
      expect(canEditTokens({ role: 'admin' })).toBe(true);
      expect(canEditTokens({ role: 'leader' })).toBe(false);
      expect(canEditConfig({ role: 'admin' })).toBe(true);
      expect(canEditConfig({ role: 'leader' })).toBe(false);
    });
  });

  describe('canPostAnnouncement, canSendPing, canCreateAlert', () => {
    it('allows coordinators, team leaders, service leaders, and media', () => {
      expect(canPostAnnouncement({ role: 'admin' })).toBe(true);
      expect(canPostAnnouncement({ role: 'leader' })).toBe(true);
      expect(canPostAnnouncement({ role: 'service_leader' })).toBe(true);
      expect(canPostAnnouncement({ role: 'media' })).toBe(true);
      expect(canPostAnnouncement({ role: 'volunteer' })).toBe(false);
      expect(canPostAnnouncement({ role: 'referee' })).toBe(false);
    });

    it('does NOT grant permissions based on display name alone', () => {
      const imposter = { name: 'Michael Mitry', role: 'volunteer' };
      expect(canPostAnnouncement(imposter)).toBe(false);
      expect(canSendPing(imposter)).toBe(false);
      expect(canCreateAlert(imposter)).toBe(false);
    });
  });

  describe('canControlStopwatch', () => {
    it('allows coordinators, service leaders, and referees to control stopwatch', () => {
      expect(canControlStopwatch({ role: 'admin' })).toBe(true);
      expect(canControlStopwatch({ role: 'service_leader' })).toBe(true);
      expect(canControlStopwatch({ role: 'referee' })).toBe(true);
      expect(canControlStopwatch({ role: 'volunteer' })).toBe(false);
    });
  });

  describe('getEditableTeams and getEditableGames', () => {
    const campData = {
      teams: [{ code: 'team_red_1' }, { code: 'team_blue_1' }],
      games: [{ name: 'Blind Builder' }, { name: 'Skee Ball' }]
    };

    it('returns all teams/games for coordinators and service leaders', () => {
      const coordinator = { role: 'admin' };
      expect(getEditableTeams(coordinator, campData)).toEqual(['team_red_1', 'team_blue_1']);
      expect(getEditableGames(coordinator, campData)).toEqual(['Blind Builder', 'Skee Ball']);
    });

    it('returns assigned teams for team leader', () => {
      const leader = { role: 'leader', assignedTeams: ['team_red_1'] };
      expect(getEditableTeams(leader, campData)).toEqual(['team_red_1']);
      expect(getEditableGames(leader, campData)).toEqual([]);
    });

    it('returns assigned games for referee', () => {
      const referee = { role: 'referee', assignedGames: ['Skee Ball'] };
      expect(getEditableTeams(referee, campData)).toEqual([]);
      expect(getEditableGames(referee, campData)).toEqual(['Skee Ball']);
    });
  });
});
