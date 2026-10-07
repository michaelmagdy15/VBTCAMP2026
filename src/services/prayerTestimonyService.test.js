import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_COMMUNITY_ID,
  PRAYER_PRIVACY,
  PRAYER_STATUS,
  LEADERSHIP_ROLES,
  PASTORAL_ROLES,
  prayerCollectionPath,
  prayerDocPath,
  testimonyCollectionPath,
  testimonyDocPath,
  isLeaderRole,
  isPastoralRole,
  canViewPrayerRequest,
  getDisplayAuthorName,
  getTimestampMs,
  createPrayerRequest,
  recordPrayerSupport,
  markPrayerAnswered,
  getPrayerRequests,
  subscribeToPrayerRequests,
  getPrayerRequestById,
  deletePrayerRequest,
  createTestimony,
  approveTestimony,
  getApprovedTestimonies,
  subscribeToApprovedTestimonies,
  getAllTestimonies,
  deleteTestimony,
} from './prayerTestimonyService';

// In-memory document store for mocking Firestore
const mockDocs = new Map();
let mockSnapshotListener = null;

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, path) => ({ type: 'collection', path })),
  doc: vi.fn((_db, path, id) => ({
    type: 'doc',
    path: id ? `${path}/${id}` : path,
  })),
  getDoc: vi.fn(async (docRef) => {
    const data = mockDocs.get(docRef.path);
    return {
      exists: () => !!data,
      id: docRef.path.split('/').pop(),
      data: () => (data ? { ...data } : undefined),
    };
  }),
  getDocs: vi.fn(async (colRef) => {
    const results = [];
    for (const [p, val] of mockDocs.entries()) {
      if (p.startsWith(colRef.path + '/')) {
        results.push({
          id: p.split('/').pop(),
          data: () => ({ ...val }),
        });
      }
    }
    return {
      forEach: (fn) => results.forEach(fn),
      size: results.length,
    };
  }),
  setDoc: vi.fn(async (docRef, data, options) => {
    const existing = options?.merge ? (mockDocs.get(docRef.path) || {}) : {};
    mockDocs.set(docRef.path, { ...existing, ...data });
    return true;
  }),
  updateDoc: vi.fn(async (docRef, data) => {
    const existing = mockDocs.get(docRef.path);
    if (!existing) {
      throw new Error(`Document does not exist: ${docRef.path}`);
    }
    mockDocs.set(docRef.path, { ...existing, ...data });
    return true;
  }),
  deleteDoc: vi.fn(async (docRef) => {
    mockDocs.delete(docRef.path);
    return true;
  }),
  onSnapshot: vi.fn((queryOrColRef, onNext, onError) => {
    mockSnapshotListener = { ref: queryOrColRef, onNext, onError };
    // Immediately emit current data from mockDocs
    const results = [];
    for (const [p, val] of mockDocs.entries()) {
      if (p.startsWith(queryOrColRef.path + '/')) {
        results.push({
          id: p.split('/').pop(),
          data: () => ({ ...val }),
        });
      }
    }
    onNext({
      forEach: (fn) => results.forEach(fn),
      size: results.length,
    });
    return vi.fn(() => {
      mockSnapshotListener = null;
    });
  }),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
}));

describe('PrayerTestimonyService', () => {
  beforeEach(() => {
    mockDocs.clear();
    mockSnapshotListener = null;
    vi.clearAllMocks();
  });

  describe('Path helpers & Constants', () => {
    it('defines standard privacy scopes', () => {
      expect(PRAYER_PRIVACY.PUBLIC).toBe('PUBLIC');
      expect(PRAYER_PRIVACY.COMMUNITY).toBe('COMMUNITY');
      expect(PRAYER_PRIVACY.LEADERS_ONLY).toBe('LEADERS_ONLY');
      expect(PRAYER_PRIVACY.PASTORAL_PRIVATE).toBe('PASTORAL_PRIVATE');
    });

    it('defines standard prayer statuses', () => {
      expect(PRAYER_STATUS.ACTIVE).toBe('active');
      expect(PRAYER_STATUS.ANSWERED).toBe('answered');
      expect(PRAYER_STATUS.ARCHIVED).toBe('archived');
    });

    it('generates correct Firestore document and collection paths', () => {
      expect(prayerCollectionPath('vbt_main')).toBe('vbt_communities/vbt_main/prayer_requests');
      expect(prayerDocPath('vbt_main', 'req_123')).toBe('vbt_communities/vbt_main/prayer_requests/req_123');
      expect(testimonyCollectionPath('vbt_main')).toBe('vbt_communities/vbt_main/testimonies');
      expect(testimonyDocPath('vbt_main', 'test_456')).toBe('vbt_communities/vbt_main/testimonies/test_456');
    });

    it('uses DEFAULT_COMMUNITY_ID as fallback in path helpers', () => {
      expect(prayerCollectionPath()).toBe('vbt_communities/vbt_main/prayer_requests');
      expect(prayerDocPath(undefined, 'req_abc')).toBe('vbt_communities/vbt_main/prayer_requests/req_abc');
      expect(testimonyCollectionPath()).toBe('vbt_communities/vbt_main/testimonies');
      expect(testimonyDocPath(undefined, 'test_abc')).toBe('vbt_communities/vbt_main/testimonies/test_abc');
    });
  });

  describe('Role & Privacy helpers', () => {
    it('identifies leadership roles correctly', () => {
      expect(isLeaderRole('admin')).toBe(true);
      expect(isLeaderRole('servant')).toBe(true);
      expect(isLeaderRole('service_leader')).toBe(true);
      expect(isLeaderRole('team_leader')).toBe(true);
      expect(isLeaderRole('pastoral_care_leader')).toBe(true);
      expect(isLeaderRole('coordinator')).toBe(true);
      expect(isLeaderRole('ADMIN')).toBe(true);
      expect(isLeaderRole(['member', 'servant'])).toBe(true);
      expect(isLeaderRole('member')).toBe(false);
      expect(isLeaderRole('visitor')).toBe(false);
      expect(isLeaderRole(null)).toBe(false);
    });

    it('identifies pastoral roles correctly', () => {
      expect(isPastoralRole('admin')).toBe(true);
      expect(isPastoralRole('pastoral_care_leader')).toBe(true);
      expect(isPastoralRole('pastoral_care')).toBe(true);
      expect(isPastoralRole('coordinator')).toBe(true);
      expect(isPastoralRole('service_leader')).toBe(false);
      expect(isPastoralRole('servant')).toBe(false);
      expect(isPastoralRole('member')).toBe(false);
    });

    describe('canViewPrayerRequest', () => {
      const publicPrayer = { id: 'p1', authorId: 'user_1', privacy: PRAYER_PRIVACY.PUBLIC };
      const communityPrayer = { id: 'p2', authorId: 'user_1', privacy: PRAYER_PRIVACY.COMMUNITY };
      const leadersPrayer = { id: 'p3', authorId: 'user_1', privacy: PRAYER_PRIVACY.LEADERS_ONLY };
      const pastoralPrayer = { id: 'p4', authorId: 'user_1', privacy: PRAYER_PRIVACY.PASTORAL_PRIVATE };

      it('allows anyone to view PUBLIC prayers', () => {
        expect(canViewPrayerRequest(publicPrayer, null, null)).toBe(true);
        expect(canViewPrayerRequest(publicPrayer, 'member', 'user_2')).toBe(true);
      });

      it('always allows the author to view their own prayer regardless of privacy', () => {
        expect(canViewPrayerRequest(pastoralPrayer, 'member', 'user_1')).toBe(true);
        expect(canViewPrayerRequest(leadersPrayer, 'member', 'user_1')).toBe(true);
        expect(canViewPrayerRequest(communityPrayer, 'member', 'user_1')).toBe(true);
      });

      it('allows community members to view COMMUNITY prayers but rejects unauthenticated visitors', () => {
        expect(canViewPrayerRequest(communityPrayer, null, null)).toBe(false);
        expect(canViewPrayerRequest(communityPrayer, 'member', 'user_2')).toBe(true);
        expect(canViewPrayerRequest(communityPrayer, null, 'user_2')).toBe(true);
      });

      it('controls access to LEADERS_ONLY prayers', () => {
        expect(canViewPrayerRequest(leadersPrayer, 'member', 'user_2')).toBe(false);
        expect(canViewPrayerRequest(leadersPrayer, 'servant', 'user_3')).toBe(true);
        expect(canViewPrayerRequest(leadersPrayer, 'team_leader', 'user_4')).toBe(true);
        expect(canViewPrayerRequest(leadersPrayer, 'admin', 'user_admin')).toBe(true);
      });

      it('controls access to PASTORAL_PRIVATE prayers strictly to pastoral roles and admins', () => {
        expect(canViewPrayerRequest(pastoralPrayer, 'member', 'user_2')).toBe(false);
        expect(canViewPrayerRequest(pastoralPrayer, 'servant', 'user_3')).toBe(false);
        expect(canViewPrayerRequest(pastoralPrayer, 'team_leader', 'user_4')).toBe(false);
        expect(canViewPrayerRequest(pastoralPrayer, 'pastoral_care_leader', 'user_pastor')).toBe(true);
        expect(canViewPrayerRequest(pastoralPrayer, 'coordinator', 'user_coord')).toBe(true);
        expect(canViewPrayerRequest(pastoralPrayer, 'admin', 'user_admin')).toBe(true);
      });

      it('handles null prayer cleanly', () => {
        expect(canViewPrayerRequest(null, 'admin', 'user_1')).toBe(false);
      });
    });

    describe('getDisplayAuthorName', () => {
      const publicNamedPrayer = {
        authorId: 'u1',
        authorName: 'Bishoy F.',
        authorAnonymous: false,
      };

      const anonPrayer = {
        authorId: 'u1',
        authorName: 'Bishoy F.',
        authorAnonymous: true,
      };

      it('returns real author name if prayer is not anonymous', () => {
        expect(getDisplayAuthorName(publicNamedPrayer, 'member', 'u2')).toBe('Bishoy F.');
      });

      it('masks author name for regular members when anonymous', () => {
        expect(getDisplayAuthorName(anonPrayer, 'member', 'u2')).toBe('Anonymous Member');
      });

      it('shows indicator for the author themselves', () => {
        expect(getDisplayAuthorName(anonPrayer, 'member', 'u1')).toBe('Bishoy F. (You - Posted Anonymously)');
      });

      it('reveals real name with indicator to pastoral care / admin', () => {
        expect(getDisplayAuthorName(anonPrayer, 'pastoral_care_leader', 'u_pastor')).toBe(
          'Bishoy F. (Anonymous to Community)'
        );
        expect(getDisplayAuthorName(anonPrayer, 'admin', 'u_admin')).toBe(
          'Bishoy F. (Anonymous to Community)'
        );
      });
    });

    describe('getTimestampMs', () => {
      it('converts diverse timestamp formats to ms', () => {
        expect(getTimestampMs(1600000000000)).toBe(1600000000000);
        expect(getTimestampMs({ toMillis: () => 1650000000000 })).toBe(1650000000000);
        expect(getTimestampMs({ seconds: 1700000000, nanoseconds: 500000000 })).toBe(1700000000500);
        const d = new Date('2026-10-07T12:00:00Z');
        expect(getTimestampMs(d)).toBe(d.getTime());
        expect(getTimestampMs('2026-10-07T12:00:00Z')).toBe(d.getTime());
        expect(getTimestampMs(null)).toBe(0);
        expect(getTimestampMs('invalid-date')).toBe(0);
      });
    });
  });

  describe('createPrayerRequest', () => {
    it('throws error when title is missing or empty', async () => {
      await expect(createPrayerRequest('vbt_main', { title: '   ' })).rejects.toThrow(
        'Prayer request title is required'
      );
    });

    it('creates a prayer request with defaults and stores in Firestore', async () => {
      const data = {
        title: 'Healing for Uncle George',
        content: 'Please pray for full recovery from surgery.',
        authorId: 'usr_bishoy',
        authorName: 'Bishoy',
      };

      const result = await createPrayerRequest('vbt_main', data);

      expect(result.id).toMatch(/^prayer_/);
      expect(result.communityId).toBe('vbt_main');
      expect(result.title).toBe('Healing for Uncle George');
      expect(result.content).toBe('Please pray for full recovery from surgery.');
      expect(result.authorId).toBe('usr_bishoy');
      expect(result.authorName).toBe('Bishoy');
      expect(result.authorAnonymous).toBe(false);
      expect(result.privacy).toBe(PRAYER_PRIVACY.COMMUNITY);
      expect(result.prayerCount).toBe(0);
      expect(result.prayedByUids).toEqual([]);
      expect(result.status).toBe(PRAYER_STATUS.ACTIVE);
      expect(result.answerNote).toBeNull();

      // Check document stored in mock
      const stored = mockDocs.get(`vbt_communities/vbt_main/prayer_requests/${result.id}`);
      expect(stored).toBeDefined();
      expect(stored.title).toBe('Healing for Uncle George');
    });

    it('supports custom options such as authorAnonymous and privacy', async () => {
      const result = await createPrayerRequest('vbt_main', {
        id: 'prayer_custom_1',
        title: 'Personal Family Guidance',
        content: 'Need guidance regarding career move',
        authorId: 'usr_anon_1',
        authorName: 'Secret Servant',
        authorAnonymous: true,
        privacy: PRAYER_PRIVACY.PASTORAL_PRIVATE,
      });

      expect(result.id).toBe('prayer_custom_1');
      expect(result.authorAnonymous).toBe(true);
      expect(result.privacy).toBe(PRAYER_PRIVACY.PASTORAL_PRIVATE);
    });

    it('supports invocation with single data object', async () => {
      const result = await createPrayerRequest({
        title: 'Safe travels for team',
        authorId: 'usr_coach',
      });

      expect(result.communityId).toBe('vbt_main');
      expect(result.title).toBe('Safe travels for team');
    });
  });

  describe('recordPrayerSupport', () => {
    it('throws when requestId or memberId is missing', async () => {
      await expect(recordPrayerSupport('vbt_main', null, 'usr_1')).rejects.toThrow('requestId is required');
      await expect(recordPrayerSupport('vbt_main', 'req_1', null)).rejects.toThrow('memberId is required');
    });

    it('throws error if prayer request does not exist', async () => {
      await expect(recordPrayerSupport('vbt_main', 'req_missing', 'usr_1')).rejects.toThrow(
        'Prayer request req_missing not found'
      );
    });

    it('increments prayerCount and adds memberId to prayedByUids', async () => {
      // Seed a request
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/req_test', {
        id: 'req_test',
        title: 'Camp Preparation',
        prayerCount: 2,
        prayedByUids: ['usr_1', 'usr_2'],
      });

      const updated = await recordPrayerSupport('vbt_main', 'req_test', 'usr_3');

      expect(updated.prayerCount).toBe(3);
      expect(updated.prayedByUids).toEqual(['usr_1', 'usr_2', 'usr_3']);

      const stored = mockDocs.get('vbt_communities/vbt_main/prayer_requests/req_test');
      expect(stored.prayerCount).toBe(3);
      expect(stored.prayedByUids).toContain('usr_3');
    });

    it('avoids duplicate entries in prayedByUids if member prays again', async () => {
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/req_test', {
        id: 'req_test',
        title: 'Camp Preparation',
        prayerCount: 1,
        prayedByUids: ['usr_1'],
      });

      const updated = await recordPrayerSupport('vbt_main', 'req_test', 'usr_1');

      expect(updated.prayerCount).toBe(2);
      expect(updated.prayedByUids).toEqual(['usr_1']);
    });
  });

  describe('markPrayerAnswered', () => {
    it('throws error when requestId is missing', async () => {
      await expect(markPrayerAnswered('vbt_main', '')).rejects.toThrow('requestId is required');
    });

    it('throws error when prayer request is not found', async () => {
      await expect(markPrayerAnswered('vbt_main', 'req_nonexistent', 'God answered!')).rejects.toThrow(
        'Prayer request req_nonexistent not found'
      );
    });

    it('updates status to answered and attaches testimony note', async () => {
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/req_sick', {
        id: 'req_sick',
        title: 'Surgery success',
        status: PRAYER_STATUS.ACTIVE,
        answerNote: null,
      });

      const result = await markPrayerAnswered(
        'vbt_main',
        'req_sick',
        'The surgery went flawlessly, thank God!'
      );

      expect(result.status).toBe(PRAYER_STATUS.ANSWERED);
      expect(result.answerNote).toBe('The surgery went flawlessly, thank God!');

      const stored = mockDocs.get('vbt_communities/vbt_main/prayer_requests/req_sick');
      expect(stored.status).toBe(PRAYER_STATUS.ANSWERED);
      expect(stored.answerNote).toBe('The surgery went flawlessly, thank God!');
    });
  });

  describe('getPrayerRequests & subscribeToPrayerRequests', () => {
    beforeEach(() => {
      // Seed prayers with different privacy levels
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/p_public', {
        id: 'p_public',
        title: 'Public Blessing',
        authorId: 'u1',
        authorName: 'Mina',
        privacy: PRAYER_PRIVACY.PUBLIC,
        createdAt: '2026-10-01T10:00:00Z',
      });
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/p_comm', {
        id: 'p_comm',
        title: 'Community Exam Prayer',
        authorId: 'u1',
        authorName: 'Mina',
        privacy: PRAYER_PRIVACY.COMMUNITY,
        createdAt: '2026-10-02T10:00:00Z',
      });
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/p_leaders', {
        id: 'p_leaders',
        title: 'Servants Camp Strategy',
        authorId: 'u_lead',
        authorName: 'Servant Mark',
        privacy: PRAYER_PRIVACY.LEADERS_ONLY,
        createdAt: '2026-10-03T10:00:00Z',
      });
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/p_pastoral', {
        id: 'p_pastoral',
        title: 'Confidential Pastoral Support',
        authorId: 'u_struggling',
        authorName: 'Anon Brother',
        authorAnonymous: true,
        privacy: PRAYER_PRIVACY.PASTORAL_PRIVATE,
        createdAt: '2026-10-04T10:00:00Z',
      });
    });

    it('returns only PUBLIC prayers for unauthenticated users', async () => {
      const prayers = await getPrayerRequests('vbt_main', null, null);
      expect(prayers.length).toBe(1);
      expect(prayers[0].id).toBe('p_public');
    });

    it('returns PUBLIC and COMMUNITY prayers for ordinary members', async () => {
      const prayers = await getPrayerRequests('vbt_main', 'member', 'u2');
      expect(prayers.map((p) => p.id)).toEqual(['p_comm', 'p_public']);
    });

    it('allows author to see their own private pastoral prayer alongside public/community', async () => {
      const prayers = await getPrayerRequests('vbt_main', 'member', 'u_struggling');
      const ids = prayers.map((p) => p.id);
      expect(ids).toContain('p_pastoral');
      expect(ids).toContain('p_comm');
      expect(ids).toContain('p_public');
      expect(ids).not.toContain('p_leaders');
    });

    it('returns LEADERS_ONLY prayers for servants and leaders', async () => {
      const prayers = await getPrayerRequests('vbt_main', 'servant', 'u_servant');
      const ids = prayers.map((p) => p.id);
      expect(ids).toContain('p_leaders');
      expect(ids).toContain('p_comm');
      expect(ids).toContain('p_public');
      expect(ids).not.toContain('p_pastoral');
    });

    it('returns all prayers including PASTORAL_PRIVATE for pastoral care and admin', async () => {
      const prayers = await getPrayerRequests('vbt_main', 'admin', 'u_admin');
      expect(prayers.length).toBe(4);
      expect(prayers.map((p) => p.id)).toEqual([
        'p_pastoral',
        'p_leaders',
        'p_comm',
        'p_public',
      ]);
    });

    it('subscribeToPrayerRequests emits visibility-filtered and sorted list to callback', () => {
      const callback = vi.fn();
      const unsub = subscribeToPrayerRequests('vbt_main', 'servant', 'u_servant', callback);

      expect(typeof unsub).toBe('function');
      expect(callback).toHaveBeenCalledTimes(1);

      const emitted = callback.mock.calls[0][0];
      const emittedIds = emitted.map((p) => p.id);
      expect(emittedIds).toContain('p_leaders');
      expect(emittedIds).toContain('p_comm');
      expect(emittedIds).toContain('p_public');
      expect(emittedIds).not.toContain('p_pastoral');
    });
  });

  describe('getPrayerRequestById & deletePrayerRequest', () => {
    it('retrieves prayer by id if user is authorized', async () => {
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/req_test', {
        id: 'req_test',
        title: 'Test',
        authorId: 'usr_1',
        privacy: PRAYER_PRIVACY.COMMUNITY,
      });

      const prayer = await getPrayerRequestById('vbt_main', 'req_test', 'member', 'usr_2');
      expect(prayer).not.toBeNull();
      expect(prayer.id).toBe('req_test');
    });

    it('returns null if prayer does not exist or user is unauthorized', async () => {
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/req_secret', {
        id: 'req_secret',
        title: 'Secret',
        authorId: 'usr_1',
        privacy: PRAYER_PRIVACY.PASTORAL_PRIVATE,
      });

      const unauthorized = await getPrayerRequestById('vbt_main', 'req_secret', 'member', 'usr_2');
      expect(unauthorized).toBeNull();

      const notFound = await getPrayerRequestById('vbt_main', 'req_random', 'admin', 'usr_admin');
      expect(notFound).toBeNull();
    });

    it('deletes prayer request', async () => {
      mockDocs.set('vbt_communities/vbt_main/prayer_requests/req_delete', { id: 'req_delete' });
      const deleted = await deletePrayerRequest('vbt_main', 'req_delete');
      expect(deleted).toBe(true);
      expect(mockDocs.get('vbt_communities/vbt_main/prayer_requests/req_delete')).toBeUndefined();
    });
  });

  describe('Testimony operations', () => {
    describe('createTestimony', () => {
      it('throws error when testimony title is missing', async () => {
        await expect(createTestimony('vbt_main', { title: '  ' })).rejects.toThrow(
          'Testimony title is required'
        );
      });

      it('creates testimony with isApproved: false and approvedBy: null by default', async () => {
        const testimony = await createTestimony('vbt_main', {
          title: 'God restored our youth sports team',
          content: 'We witnessed immense unity and joy this summer.',
          authorId: 'usr_coach',
          authorName: 'Coach Peter',
          relatedActivityId: 'act_summer_2026',
        });

        expect(testimony.id).toMatch(/^testimony_/);
        expect(testimony.communityId).toBe('vbt_main');
        expect(testimony.title).toBe('God restored our youth sports team');
        expect(testimony.content).toBe('We witnessed immense unity and joy this summer.');
        expect(testimony.authorId).toBe('usr_coach');
        expect(testimony.authorName).toBe('Coach Peter');
        expect(testimony.relatedActivityId).toBe('act_summer_2026');
        expect(testimony.isApproved).toBe(false);
        expect(testimony.approvedBy).toBeNull();

        const stored = mockDocs.get(`vbt_communities/vbt_main/testimonies/${testimony.id}`);
        expect(stored).toBeDefined();
        expect(stored.isApproved).toBe(false);
      });
    });

    describe('approveTestimony', () => {
      it('throws error when testimonyId is missing', async () => {
        await expect(approveTestimony('vbt_main', '')).rejects.toThrow('testimonyId is required');
      });

      it('throws error when testimony is not found', async () => {
        await expect(approveTestimony('vbt_main', 'test_404', 'Fr. Dawood')).rejects.toThrow(
          'Testimony test_404 not found'
        );
      });

      it('approves testimony and records leader name', async () => {
        mockDocs.set('vbt_communities/vbt_main/testimonies/test_1', {
          id: 'test_1',
          title: 'Miracle Recovery',
          isApproved: false,
          approvedBy: null,
        });

        const approved = await approveTestimony('vbt_main', 'test_1', 'Servant John');

        expect(approved.isApproved).toBe(true);
        expect(approved.approvedBy).toBe('Servant John');

        const stored = mockDocs.get('vbt_communities/vbt_main/testimonies/test_1');
        expect(stored.isApproved).toBe(true);
        expect(stored.approvedBy).toBe('Servant John');
      });
    });

    describe('getApprovedTestimonies & subscribeToApprovedTestimonies', () => {
      beforeEach(() => {
        mockDocs.set('vbt_communities/vbt_main/testimonies/t_pending', {
          id: 't_pending',
          title: 'Pending Review',
          isApproved: false,
          createdAt: '2026-10-01T10:00:00Z',
        });
        mockDocs.set('vbt_communities/vbt_main/testimonies/t_app1', {
          id: 't_app1',
          title: 'Approved Older',
          isApproved: true,
          createdAt: '2026-10-02T10:00:00Z',
        });
        mockDocs.set('vbt_communities/vbt_main/testimonies/t_app2', {
          id: 't_app2',
          title: 'Approved Newer',
          isApproved: true,
          createdAt: '2026-10-03T10:00:00Z',
        });
      });

      it('returns only approved testimonies sorted newest first', async () => {
        const approved = await getApprovedTestimonies('vbt_main');
        expect(approved.length).toBe(2);
        expect(approved.map((t) => t.id)).toEqual(['t_app2', 't_app1']);
      });

      it('subscribeToApprovedTestimonies filters for isApproved: true', () => {
        const callback = vi.fn();
        const unsub = subscribeToApprovedTestimonies('vbt_main', callback);

        expect(typeof unsub).toBe('function');
        expect(callback).toHaveBeenCalledTimes(1);

        const emitted = callback.mock.calls[0][0];
        expect(emitted.map((t) => t.id)).toEqual(['t_app2', 't_app1']);
      });

      it('getAllTestimonies returns both approved and unapproved for leader moderation', async () => {
        const all = await getAllTestimonies('vbt_main');
        expect(all.length).toBe(3);
        expect(all.map((t) => t.id)).toEqual(['t_app2', 't_app1', 't_pending']);
      });

      it('deletes testimony', async () => {
        const deleted = await deleteTestimony('vbt_main', 't_pending');
        expect(deleted).toBe(true);
        expect(mockDocs.get('vbt_communities/vbt_main/testimonies/t_pending')).toBeUndefined();
      });
    });
  });
});
