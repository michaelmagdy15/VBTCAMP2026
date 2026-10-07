import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  maskPhoneNumber,
  searchMembers,
  COMMUNITY_ROLES,
  ALLOWED_SELF_EDIT_PUBLIC_FIELDS,
  ALLOWED_SELF_EDIT_PRIVATE_FIELDS,
  memberDocPath,
  memberPrivateDocPath,
  updateMemberPublicProfile,
  updateMemberPrivateProfile,
  createOrGetMemberProfile,
  getMemberPublicProfile,
  getMemberPrivateProfile,
} from './memberService';

// Mock firebase/firestore
vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, ...paths) => {
      // Handle doc(db, 'collection', 'id') or doc(db, 'path')
      const path = paths.join('/');
      return { path };
    }),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    collection: vi.fn((_db, path) => ({ path })),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

// Mock ../firebase
vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

import { getDoc, setDoc } from 'firebase/firestore';

describe('MemberService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('maskPhoneNumber', () => {
    it('returns empty string for null, undefined, or non-string', () => {
      expect(maskPhoneNumber(null)).toBe('');
      expect(maskPhoneNumber(undefined)).toBe('');
      expect(maskPhoneNumber(1234567890)).toBe('');
      expect(maskPhoneNumber('')).toBe('');
    });

    it('returns *** for strings shorter than 7 chars', () => {
      expect(maskPhoneNumber('12345')).toBe('***');
      expect(maskPhoneNumber('  123  ')).toBe('***');
    });

    it('correctly masks standard phone numbers', () => {
      expect(maskPhoneNumber('01000680580')).toBe('0100 *** *580');
      expect(maskPhoneNumber('+201000680580')).toBe('+201 *** *580');
    });
  });

  describe('searchMembers', () => {
    const sampleMembers = [
      {
        id: 'm1',
        firstName: 'Michael',
        lastName: 'Mitry',
        displayName: 'Michael Mitry',
        role: 'admin',
        sportsInterests: ['Football', 'Padel'],
      },
      {
        id: 'm2',
        firstName: 'Fady',
        lastName: 'Nabil',
        displayName: 'Fady Nabil',
        role: 'team_leader',
        sportsInterests: ['Basketball'],
      },
      {
        id: 'm3',
        firstName: 'Mina',
        lastName: 'Saad',
        displayName: 'Mina Saad',
        role: 'member',
        sportsInterests: ['Volleyball', 'Football'],
      },
    ];

    it('returns original list if search query is empty or whitespace', () => {
      expect(searchMembers(sampleMembers, '')).toEqual(sampleMembers);
      expect(searchMembers(sampleMembers, '   ')).toEqual(sampleMembers);
      expect(searchMembers(sampleMembers, null)).toEqual(sampleMembers);
    });

    it('filters by firstName or lastName case-insensitively', () => {
      const res = searchMembers(sampleMembers, 'michael');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('m1');

      const res2 = searchMembers(sampleMembers, 'SAAD');
      expect(res2).toHaveLength(1);
      expect(res2[0].id).toBe('m3');
    });

    it('filters by role', () => {
      const res = searchMembers(sampleMembers, 'leader');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('m2');
    });

    it('filters by sports interests', () => {
      const res = searchMembers(sampleMembers, 'football');
      expect(res).toHaveLength(2);
      expect(res.map((m) => m.id)).toEqual(['m1', 'm3']);
    });

    it('returns empty array when nothing matches', () => {
      const res = searchMembers(sampleMembers, 'swimming');
      expect(res).toEqual([]);
    });
  });

  describe('Path helpers & Constants', () => {
    it('constructs correct public and private document paths', () => {
      expect(memberDocPath('vbt_main', 'usr_123')).toBe('vbt_communities/vbt_main/members/usr_123');
      expect(memberPrivateDocPath('vbt_main', 'usr_123')).toBe('vbt_communities/vbt_main/members/usr_123/private/profile');
    });

    it('includes expected roles and fields in constants', () => {
      expect(COMMUNITY_ROLES.ADMIN).toBe('admin');
      expect(COMMUNITY_ROLES.MEMBER).toBe('member');
      expect(ALLOWED_SELF_EDIT_PUBLIC_FIELDS).toContain('bio');
      expect(ALLOWED_SELF_EDIT_PUBLIC_FIELDS).not.toContain('role');
      expect(ALLOWED_SELF_EDIT_PRIVATE_FIELDS).toContain('medicalNotes');
      expect(ALLOWED_SELF_EDIT_PRIVATE_FIELDS).not.toContain('pastoralNotes');
    });
  });

  describe('updateMemberPublicProfile', () => {
    it('disallows non-admin from updating role or status', async () => {
      const updates = {
        role: 'admin',
        status: 'suspended',
        bio: 'Hello world',
        sportsInterests: ['Football'],
      };

      const applied = await updateMemberPublicProfile('vbt_main', 'usr_1', updates, false);

      expect(applied.bio).toBe('Hello world');
      expect(applied.sportsInterests).toEqual(['Football']);
      expect(applied.role).toBeUndefined();
      expect(applied.status).toBeUndefined();
      expect(setDoc).toHaveBeenCalled();
    });

    it('allows admin to update role and status', async () => {
      const updates = {
        role: 'team_leader',
        status: 'active',
      };

      const applied = await updateMemberPublicProfile('vbt_main', 'usr_1', updates, true);

      expect(applied.role).toBe('team_leader');
      expect(applied.status).toBe('active');
    });

    it('recomputes displayName when firstName or lastName changes', async () => {
      getDoc.mockImplementation(async (ref) => {
        if (ref.path === 'vbt_communities/vbt_main/members/usr_1') {
          return {
            exists: () => true,
            data: () => ({ firstName: 'Old', lastName: 'Name', displayName: 'Old Name' }),
          };
        }
        return { exists: () => false };
      });

      const applied = await updateMemberPublicProfile(
        'vbt_main',
        'usr_1',
        { firstName: 'New' },
        false
      );

      expect(applied.firstName).toBe('New');
      expect(applied.displayName).toBe('New Name');
    });
  });

  describe('updateMemberPrivateProfile', () => {
    it('prevents non-admin from editing pastoralNotes', async () => {
      const updates = {
        medicalNotes: 'Asthma inhaler required',
        pastoralNotes: 'Confidential pastoral conversation',
      };

      const applied = await updateMemberPrivateProfile('vbt_main', 'usr_1', updates, false);

      expect(applied.medicalNotes).toBe('Asthma inhaler required');
      expect(applied.pastoralNotes).toBeUndefined();
    });

    it('allows admin to edit pastoralNotes', async () => {
      const updates = {
        pastoralNotes: 'Pastoral follow up scheduled',
      };

      const applied = await updateMemberPrivateProfile('vbt_main', 'usr_1', updates, true);

      expect(applied.pastoralNotes).toBe('Pastoral follow up scheduled');
    });
  });

  describe('createOrGetMemberProfile', () => {
    it('returns existing public and private profiles if public exists', async () => {
      getDoc.mockImplementation(async (ref) => {
        if (ref.path === 'vbt_communities/vbt_main/members/usr_existing') {
          return {
            exists: () => true,
            data: () => ({
              id: 'usr_existing',
              firstName: 'Existing',
              displayName: 'Existing User',
              role: 'volunteer',
            }),
          };
        }
        if (ref.path === 'vbt_communities/vbt_main/members/usr_existing/private/profile') {
          return {
            exists: () => true,
            data: () => ({
              memberId: 'usr_existing',
              rawPhoneNumber: '01000680580',
            }),
          };
        }
        return { exists: () => false };
      });

      const result = await createOrGetMemberProfile('vbt_main', {
        memberId: 'usr_existing',
        phoneNumber: '01000680580',
        firstName: 'Existing',
      });

      expect(result.publicProfile.displayName).toBe('Existing User');
      expect(result.privateProfile.rawPhoneNumber).toBe('01000680580');
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ lastSeenAt: expect.any(String) }),
        { merge: true }
      );
    });

    it('bridges legacy servant profile when creating new profile', async () => {
      getDoc.mockImplementation(async (ref) => {
        if (ref.path === 'vbt_servants/01000680580') {
          return {
            exists: () => true,
            data: () => ({
              name: 'Michael Mitry',
              role: 'admin',
              phone: '01000680580',
            }),
          };
        }
        return { exists: () => false };
      });

      const result = await createOrGetMemberProfile('vbt_main', {
        memberId: 'new_uid_123',
        phoneNumber: '01000680580',
        firstName: 'Michael',
      });

      expect(result.publicProfile.role).toBe('admin');
      expect(result.publicProfile.phoneNumberMasked).toBe('0100 *** *580');
      expect(result.privateProfile.rawPhoneNumber).toBe('01000680580');
      expect(setDoc).toHaveBeenCalledTimes(3);
    });
  });

  describe('getMemberPublicProfile and getMemberPrivateProfile', () => {
    it('returns null if memberId is falsy', async () => {
      expect(await getMemberPublicProfile('vbt_main', null)).toBeNull();
      expect(await getMemberPrivateProfile('vbt_main', '')).toBeNull();
    });

    it('returns null on Firestore rejection', async () => {
      getDoc.mockRejectedValueOnce(new Error('Permission denied'));
      const res = await getMemberPublicProfile('vbt_main', 'usr_x');
      expect(res).toBeNull();
    });
  });
});
