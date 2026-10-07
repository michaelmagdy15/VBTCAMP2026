import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GROUP_TYPES,
  DEFAULT_COMMUNITY_ID,
  teamsCollectionPath,
  teamDocPath,
  groupsCollectionPath,
  groupDocPath,
  createTeam,
  getTeams,
  subscribeToTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  createGroup,
  getGroups,
  subscribeToGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
} from './teamGroupService';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, path) => ({ path })),
    doc: vi.fn((_db, path, id) => ({ path: id ? `${path}/${id}` : path })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    arrayUnion: vi.fn((val) => ({ _method: 'arrayUnion', val })),
    arrayRemove: vi.fn((val) => ({ _method: 'arrayRemove', val })),
  };
});

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

describe('TeamGroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Path helpers & Constants', () => {
    it('constructs correct teams paths', () => {
      expect(teamsCollectionPath('custom_comm')).toBe('vbt_communities/custom_comm/teams');
      expect(teamsCollectionPath()).toBe('vbt_communities/vbt_main/teams');
      expect(teamDocPath('custom_comm', 'team_alpha')).toBe('vbt_communities/custom_comm/teams/team_alpha');
      expect(teamDocPath('team_alpha')).toBe('vbt_communities/vbt_main/teams/team_alpha');
    });

    it('constructs correct groups paths', () => {
      expect(groupsCollectionPath('custom_comm')).toBe('vbt_communities/custom_comm/groups');
      expect(groupsCollectionPath()).toBe('vbt_communities/vbt_main/groups');
      expect(groupDocPath('custom_comm', 'grp_fellowship')).toBe('vbt_communities/custom_comm/groups/grp_fellowship');
      expect(groupDocPath('grp_fellowship')).toBe('vbt_communities/vbt_main/groups/grp_fellowship');
    });

    it('exposes standard group types and default community id', () => {
      expect(DEFAULT_COMMUNITY_ID).toBe('vbt_main');
      expect(GROUP_TYPES.SERVANT_CIRCLE).toBe('servant_circle');
      expect(GROUP_TYPES.BIBLE_STUDY).toBe('bible_study');
      expect(GROUP_TYPES.YOUTH_FELLOWSHIP).toBe('youth_fellowship');
      expect(GROUP_TYPES.OUTREACH_SQUAD).toBe('outreach_squad');
    });
  });

  describe('Teams Management', () => {
    describe('createTeam', () => {
      it('creates team with complete schema and persists to firestore', async () => {
        const teamData = {
          id: 'team_red_lions',
          name: 'Red Lions',
          color: '#EF4444',
          emblem: '🦁',
          leaderUid: 'usr_leader_1',
          leaderName: 'Mark Mitry',
          memberCount: 12,
          wins: 5,
          losses: 1,
          motto: 'Strength in Unity',
        };

        const result = await createTeam('vbt_main', teamData);

        expect(result.id).toBe('team_red_lions');
        expect(result.name).toBe('Red Lions');
        expect(result.color).toBe('#EF4444');
        expect(result.emblem).toBe('🦁');
        expect(result.leaderUid).toBe('usr_leader_1');
        expect(result.leaderName).toBe('Mark Mitry');
        expect(result.memberCount).toBe(12);
        expect(result.wins).toBe(5);
        expect(result.losses).toBe(1);
        expect(result.motto).toBe('Strength in Unity');
        expect(result.createdAt).toBe('MOCK_TIMESTAMP');
        expect(result.updatedAt).toBe('MOCK_TIMESTAMP');

        expect(setDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/teams/team_red_lions' }),
          expect.objectContaining({
            id: 'team_red_lions',
            name: 'Red Lions',
            wins: 5,
          }),
          { merge: true }
        );
      });

      it('generates team id and sets defaults when partial data is provided', async () => {
        const result = await createTeam({
          name: 'Blue Eagles',
        });

        expect(result.id).toMatch(/^team_/);
        expect(result.name).toBe('Blue Eagles');
        expect(result.color).toBe('#3B82F6');
        expect(result.emblem).toBe('🛡️');
        expect(result.leaderUid).toBeNull();
        expect(result.leaderName).toBe('');
        expect(result.memberCount).toBe(0);
        expect(result.wins).toBe(0);
        expect(result.losses).toBe(0);
        expect(result.motto).toBe('');
        expect(setDoc).toHaveBeenCalled();
      });
    });

    describe('getTeams', () => {
      it('fetches and returns array of team documents', async () => {
        const mockTeams = [
          { id: 'team_1', data: () => ({ name: 'Team One', memberCount: 10 }) },
          { id: 'team_2', data: () => ({ name: 'Team Two', memberCount: 15 }) },
        ];
        getDocs.mockResolvedValueOnce({
          forEach: (fn) => mockTeams.forEach(fn),
        });

        const list = await getTeams('vbt_main');
        expect(list).toHaveLength(2);
        expect(list[0]).toEqual({ id: 'team_1', name: 'Team One', memberCount: 10 });
        expect(list[1]).toEqual({ id: 'team_2', name: 'Team Two', memberCount: 15 });
      });

      it('returns empty array on firestore error', async () => {
        getDocs.mockRejectedValueOnce(new Error('Firestore error'));
        const list = await getTeams('vbt_main');
        expect(list).toEqual([]);
      });
    });

    describe('subscribeToTeams', () => {
      it('attaches onSnapshot listener and invokes callback with team list', () => {
        let snapshotCallback;
        onSnapshot.mockImplementation((_ref, cb) => {
          snapshotCallback = cb;
          return vi.fn();
        });

        const callback = vi.fn();
        const unsub = subscribeToTeams('vbt_main', callback);

        expect(typeof unsub).toBe('function');
        expect(snapshotCallback).toBeDefined();

        const mockSnap = {
          forEach: (fn) => {
            fn({ id: 't_alpha', data: () => ({ name: 'Alpha' }) });
          },
        };
        snapshotCallback(mockSnap);

        expect(callback).toHaveBeenCalledWith([{ id: 't_alpha', name: 'Alpha' }]);
      });

      it('supports single-argument call with callback function', () => {
        let snapshotCallback;
        onSnapshot.mockImplementation((_ref, cb) => {
          snapshotCallback = cb;
          return vi.fn();
        });

        const callback = vi.fn();
        subscribeToTeams(callback);

        expect(snapshotCallback).toBeDefined();
      });
    });

    describe('getTeamById, updateTeam, deleteTeam', () => {
      it('getTeamById returns team when found', async () => {
        getDoc.mockResolvedValueOnce({
          exists: () => true,
          id: 'team_1',
          data: () => ({ name: 'Team One' }),
        });

        const team = await getTeamById('vbt_main', 'team_1');
        expect(team).toEqual({ id: 'team_1', name: 'Team One' });
      });

      it('getTeamById returns null when not found', async () => {
        getDoc.mockResolvedValueOnce({ exists: () => false });
        const team = await getTeamById('vbt_main', 'nonexistent');
        expect(team).toBeNull();
      });

      it('getTeamById returns null when teamId is empty', async () => {
        expect(await getTeamById('vbt_main', '')).toBeNull();
      });

      it('updateTeam updates team fields with timestamp', async () => {
        const updated = await updateTeam('vbt_main', 'team_1', { wins: 6 });
        expect(updated.wins).toBe(6);
        expect(updated.updatedAt).toBe('MOCK_TIMESTAMP');
        expect(updateDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/teams/team_1' }),
          expect.objectContaining({ wins: 6, updatedAt: 'MOCK_TIMESTAMP' })
        );
      });

      it('updateTeam throws if teamId is missing', async () => {
        await expect(updateTeam('vbt_main', '', { wins: 1 })).rejects.toThrow('teamId is required');
      });

      it('deleteTeam deletes team document', async () => {
        const res = await deleteTeam('vbt_main', 'team_1');
        expect(res).toBe(true);
        expect(deleteDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/teams/team_1' })
        );
      });

      it('deleteTeam throws if teamId is missing', async () => {
        await expect(deleteTeam('vbt_main', '')).rejects.toThrow('teamId is required');
      });
    });
  });

  describe('Small Groups Management', () => {
    describe('createGroup', () => {
      it('creates small group with complete schema and persists to firestore', async () => {
        const groupData = {
          id: 'grp_servant_circle_1',
          name: 'Sports Ministry Servants',
          type: GROUP_TYPES.SERVANT_CIRCLE,
          leaderUid: 'usr_servant_lead',
          leaderName: 'Fady Michael',
          meetingDay: 'Thursday',
          meetingTime: '19:30',
          memberIds: ['usr_1', 'usr_2'],
          maxMembers: 20,
        };

        const result = await createGroup('vbt_main', groupData);

        expect(result.id).toBe('grp_servant_circle_1');
        expect(result.name).toBe('Sports Ministry Servants');
        expect(result.type).toBe('servant_circle');
        expect(result.leaderUid).toBe('usr_servant_lead');
        expect(result.leaderName).toBe('Fady Michael');
        expect(result.meetingDay).toBe('Thursday');
        expect(result.meetingTime).toBe('19:30');
        expect(result.memberIds).toEqual(['usr_1', 'usr_2']);
        expect(result.maxMembers).toBe(20);
        expect(result.createdAt).toBe('MOCK_TIMESTAMP');
        expect(result.updatedAt).toBe('MOCK_TIMESTAMP');

        expect(setDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/groups/grp_servant_circle_1' }),
          expect.objectContaining({
            id: 'grp_servant_circle_1',
            type: 'servant_circle',
            maxMembers: 20,
          }),
          { merge: true }
        );
      });

      it('generates group id and applies defaults when partial data is passed', async () => {
        const result = await createGroup({
          name: 'Youth Bible Study',
        });

        expect(result.id).toMatch(/^grp_/);
        expect(result.name).toBe('Youth Bible Study');
        expect(result.type).toBe(GROUP_TYPES.BIBLE_STUDY);
        expect(result.leaderUid).toBeNull();
        expect(result.leaderName).toBe('');
        expect(result.meetingDay).toBe('Friday');
        expect(result.meetingTime).toBe('18:00');
        expect(result.memberIds).toEqual([]);
        expect(result.maxMembers).toBe(15);
        expect(setDoc).toHaveBeenCalled();
      });
    });

    describe('getGroups', () => {
      it('fetches and returns array of group documents', async () => {
        const mockGroups = [
          { id: 'grp_1', data: () => ({ name: 'Group 1', type: 'bible_study' }) },
          { id: 'grp_2', data: () => ({ name: 'Group 2', type: 'outreach_squad' }) },
        ];
        getDocs.mockResolvedValueOnce({
          forEach: (fn) => mockGroups.forEach(fn),
        });

        const list = await getGroups('vbt_main');
        expect(list).toHaveLength(2);
        expect(list[0]).toEqual({ id: 'grp_1', name: 'Group 1', type: 'bible_study' });
        expect(list[1]).toEqual({ id: 'grp_2', name: 'Group 2', type: 'outreach_squad' });
      });

      it('returns empty array on firestore error', async () => {
        getDocs.mockRejectedValueOnce(new Error('Network error'));
        const list = await getGroups('vbt_main');
        expect(list).toEqual([]);
      });
    });

    describe('subscribeToGroups', () => {
      it('attaches onSnapshot listener and invokes callback with groups list', () => {
        let snapshotCallback;
        onSnapshot.mockImplementation((_ref, cb) => {
          snapshotCallback = cb;
          return vi.fn();
        });

        const callback = vi.fn();
        const unsub = subscribeToGroups('vbt_main', callback);

        expect(typeof unsub).toBe('function');
        expect(snapshotCallback).toBeDefined();

        const mockSnap = {
          forEach: (fn) => {
            fn({ id: 'grp_1', data: () => ({ name: 'Circle One' }) });
          },
        };
        snapshotCallback(mockSnap);

        expect(callback).toHaveBeenCalledWith([{ id: 'grp_1', name: 'Circle One' }]);
      });
    });

    describe('getGroupById, updateGroup, deleteGroup', () => {
      it('getGroupById returns group when found', async () => {
        getDoc.mockResolvedValueOnce({
          exists: () => true,
          id: 'grp_1',
          data: () => ({ name: 'Group One' }),
        });

        const group = await getGroupById('vbt_main', 'grp_1');
        expect(group).toEqual({ id: 'grp_1', name: 'Group One' });
      });

      it('getGroupById returns null when not found', async () => {
        getDoc.mockResolvedValueOnce({ exists: () => false });
        const group = await getGroupById('vbt_main', 'nonexistent');
        expect(group).toBeNull();
      });

      it('updateGroup updates group fields with timestamp', async () => {
        const updated = await updateGroup('vbt_main', 'grp_1', { meetingTime: '20:00' });
        expect(updated.meetingTime).toBe('20:00');
        expect(updated.updatedAt).toBe('MOCK_TIMESTAMP');
        expect(updateDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/groups/grp_1' }),
          expect.objectContaining({ meetingTime: '20:00', updatedAt: 'MOCK_TIMESTAMP' })
        );
      });

      it('deleteGroup deletes group document', async () => {
        const res = await deleteGroup('vbt_main', 'grp_1');
        expect(res).toBe(true);
        expect(deleteDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/groups/grp_1' })
        );
      });
    });

    describe('joinGroup & leaveGroup', () => {
      it('successfully joins group and adds member via arrayUnion', async () => {
        getDoc.mockResolvedValueOnce({
          exists: () => true,
          id: 'grp_fellowship',
          data: () => ({
            name: 'Youth Fellowship',
            memberIds: ['usr_1', 'usr_2'],
            maxMembers: 10,
          }),
        });

        const res = await joinGroup('vbt_main', 'grp_fellowship', 'usr_3');

        expect(res.success).toBe(true);
        expect(res.alreadyMember).toBe(false);
        expect(res.groupId).toBe('grp_fellowship');
        expect(res.memberId).toBe('usr_3');
        expect(res.memberIds).toEqual(['usr_1', 'usr_2', 'usr_3']);

        expect(arrayUnion).toHaveBeenCalledWith('usr_3');
        expect(updateDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/groups/grp_fellowship' }),
          expect.objectContaining({
            memberIds: expect.objectContaining({ _method: 'arrayUnion', val: 'usr_3' }),
            updatedAt: 'MOCK_TIMESTAMP',
          })
        );
      });

      it('returns alreadyMember: true without updateDoc write if member is already in group', async () => {
        getDoc.mockResolvedValueOnce({
          exists: () => true,
          id: 'grp_fellowship',
          data: () => ({
            name: 'Youth Fellowship',
            memberIds: ['usr_1', 'usr_2'],
            maxMembers: 10,
          }),
        });

        const res = await joinGroup('vbt_main', 'grp_fellowship', 'usr_2');

        expect(res.success).toBe(true);
        expect(res.alreadyMember).toBe(true);
        expect(updateDoc).not.toHaveBeenCalled();
      });

      it('throws error when group is at maximum capacity', async () => {
        getDoc.mockResolvedValueOnce({
          exists: () => true,
          id: 'grp_full',
          data: () => ({
            name: 'Full Group',
            memberIds: ['usr_1', 'usr_2'],
            maxMembers: 2,
          }),
        });

        await expect(joinGroup('vbt_main', 'grp_full', 'usr_3')).rejects.toThrow(
          'Group grp_full has reached maximum capacity of 2 members'
        );
        expect(updateDoc).not.toHaveBeenCalled();
      });

      it('throws error when group does not exist', async () => {
        getDoc.mockResolvedValueOnce({
          exists: () => false,
        });

        await expect(joinGroup('vbt_main', 'grp_nonexistent', 'usr_1')).rejects.toThrow(
          'Group grp_nonexistent not found'
        );
      });

      it('throws error if groupId or memberId is missing for joinGroup', async () => {
        await expect(joinGroup('vbt_main', '', 'usr_1')).rejects.toThrow('groupId is required');
        await expect(joinGroup('vbt_main', 'grp_1', '')).rejects.toThrow('memberId is required');
      });

      it('successfully leaves group and removes member via arrayRemove', async () => {
        const res = await leaveGroup('vbt_main', 'grp_fellowship', 'usr_3');

        expect(res.success).toBe(true);
        expect(res.groupId).toBe('grp_fellowship');
        expect(res.memberId).toBe('usr_3');

        expect(arrayRemove).toHaveBeenCalledWith('usr_3');
        expect(updateDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/groups/grp_fellowship' }),
          expect.objectContaining({
            memberIds: expect.objectContaining({ _method: 'arrayRemove', val: 'usr_3' }),
            updatedAt: 'MOCK_TIMESTAMP',
          })
        );
      });

      it('throws error if groupId or memberId is missing for leaveGroup', async () => {
        await expect(leaveGroup('vbt_main', '', 'usr_1')).rejects.toThrow('groupId is required');
        await expect(leaveGroup('vbt_main', 'grp_1', '')).rejects.toThrow('memberId is required');
      });

      it('supports calling joinGroup and leaveGroup with 2 arguments (omitting communityId)', async () => {
        getDoc.mockResolvedValueOnce({
          exists: () => true,
          id: 'grp_fellowship',
          data: () => ({
            name: 'Youth Fellowship',
            memberIds: [],
            maxMembers: 10,
          }),
        });

        const joinRes = await joinGroup('grp_fellowship', 'usr_99');
        expect(joinRes.success).toBe(true);
        expect(updateDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'vbt_communities/vbt_main/groups/grp_fellowship' }),
          expect.anything()
        );

        const leaveRes = await leaveGroup('grp_fellowship', 'usr_99');
        expect(leaveRes.success).toBe(true);
      });
    });
  });
});
