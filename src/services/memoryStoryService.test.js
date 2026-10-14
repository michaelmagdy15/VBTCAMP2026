import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_COMMUNITY_ID,
  MEMORY_CATEGORIES,
  CATEGORY_LABELS,
  PRIVILEGED_PASTORAL_ROLES,
  memoriesCollectionPath,
  memoryDocPath,
  impactStatsDocPath,
  memberDocPath,
  isPrivilegedPastoralRole,
  getTimestampMs,
  getWeekNumber,
  getDayOfYear,
  createMemoryStory,
  getApprovedMemories,
  getThisWeekInHistory,
  updateConsentStatus,
  getMemberPersonalHistory,
  getCommunityImpactStats,
  updateCommunityImpactStats,
  deleteMemoryStory,
  subscribeToApprovedMemories,
  seedDefaultMemories,
} from './memoryStoryService';

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

describe('MemoryStoryService Test Suite', () => {
  beforeEach(() => {
    mockDocs.clear();
    mockSnapshotListener = null;
    vi.clearAllMocks();
  });

  describe('1. Constants, Path Helpers & Utilities', () => {
    it('defines standard memory categories', () => {
      expect(MEMORY_CATEGORIES.CAMP_SEASONS).toBe('camp_seasons');
      expect(MEMORY_CATEGORIES.TOURNAMENTS).toBe('tournaments');
      expect(MEMORY_CATEGORIES.PHOTO_HIGHLIGHTS).toBe('photo_highlights');
      expect(MEMORY_CATEGORIES.TESTIMONIES).toBe('testimonies');
      expect(MEMORY_CATEGORIES.TEAM_MILESTONES).toBe('team_milestones');
      expect(MEMORY_CATEGORIES.SERVANT_ANNIVERSARIES).toBe('servant_anniversaries');
      expect(MEMORY_CATEGORIES.COMMUNITY_IMPACT).toBe('community_impact');
    });

    it('provides human-readable labels for all categories', () => {
      Object.values(MEMORY_CATEGORIES).forEach((cat) => {
        expect(CATEGORY_LABELS[cat]).toBeDefined();
        expect(typeof CATEGORY_LABELS[cat]).toBe('string');
      });
    });

    it('generates correct Firestore document and collection paths', () => {
      expect(memoriesCollectionPath('vbt_main')).toBe('vbt_communities/vbt_main/memories');
      expect(memoryDocPath('vbt_main', 'mem_123')).toBe('vbt_communities/vbt_main/memories/mem_123');
      expect(impactStatsDocPath('vbt_main')).toBe('vbt_communities/vbt_main/stats/community_impact');
      expect(memberDocPath('vbt_main', 'usr_456')).toBe('vbt_communities/vbt_main/members/usr_456');
    });

    it('falls back to DEFAULT_COMMUNITY_ID when omitted', () => {
      expect(memoriesCollectionPath()).toBe('vbt_communities/vbt_main/memories');
      expect(memoryDocPath(undefined, 'mem_test')).toBe('vbt_communities/vbt_main/memories/mem_test');
    });

    it('identifies privileged pastoral and leadership roles accurately', () => {
      expect(isPrivilegedPastoralRole('admin')).toBe(true);
      expect(isPrivilegedPastoralRole('pastoral_care_leader')).toBe(true);
      expect(isPrivilegedPastoralRole('coordinator')).toBe(true);
      expect(isPrivilegedPastoralRole('service_leader')).toBe(true);
      expect(isPrivilegedPastoralRole('service_day_leader')).toBe(true);
      expect(isPrivilegedPastoralRole('pastoral_care')).toBe(true);

      // Non-privileged
      expect(isPrivilegedPastoralRole('member')).toBe(false);
      expect(isPrivilegedPastoralRole('volunteer')).toBe(false);
      expect(isPrivilegedPastoralRole('camper')).toBe(false);
      expect(isPrivilegedPastoralRole(null)).toBe(false);
    });

    it('normalizes various timestamp formats correctly', () => {
      expect(getTimestampMs(1700000000000)).toBe(1700000000000);
      expect(getTimestampMs({ toMillis: () => 1700000000000 })).toBe(1700000000000);
      expect(getTimestampMs({ seconds: 1700000000, nanoseconds: 500000000 })).toBe(1700000000500);
      expect(getTimestampMs(new Date('2026-10-07T12:00:00Z'))).toBe(new Date('2026-10-07T12:00:00Z').getTime());
      expect(getTimestampMs('2026-10-07T12:00:00Z')).toBe(new Date('2026-10-07T12:00:00Z').getTime());
      expect(getTimestampMs(null)).toBe(0);
      expect(getTimestampMs('invalid-date')).toBe(0);
    });

    it('computes ISO week numbers and day-of-year correctly', () => {
      const date1 = new Date('2026-01-01T00:00:00Z');
      expect(getWeekNumber(date1)).toBeGreaterThanOrEqual(1);
      expect(getDayOfYear(date1)).toBe(1);

      const date2 = new Date('2026-10-07T00:00:00Z');
      expect(getWeekNumber(date2)).toBe(41);
      expect(getDayOfYear(date2)).toBe(280);

      // Fault tolerance on bad dates
      expect(getWeekNumber('invalid')).toBe(1);
      expect(getDayOfYear('invalid')).toBe(1);
    });
  });

  describe('2. createMemoryStory & Consent Enforcement', () => {
    it('throws error when title is missing or empty', async () => {
      await expect(createMemoryStory('vbt_main', { title: '   ' })).rejects.toThrow(
        'Title is required to create a memory story'
      );
      await expect(createMemoryStory('vbt_main', null)).rejects.toThrow(
        'storyData must be an object'
      );
    });

    it('creates memory story with explicit consent granted', async () => {
      const author = { id: 'usr_mina', displayName: 'Mina Boulos', role: 'servant' };
      const storyData = {
        title: 'Camp 2025 Opening Ceremony',
        description: 'Inspiring praise night and opening prayer.',
        category: MEMORY_CATEGORIES.CAMP_SEASONS,
        consentGiven: true,
        consentBy: 'usr_mina',
        consentDate: '2025-07-01T10:00:00Z',
        imageUrl: 'https://images.example.com/camp.jpg',
        tags: ['worship', 'camp'],
      };

      const result = await createMemoryStory('vbt_main', storyData, author);

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Camp 2025 Opening Ceremony');
      expect(result.consentGiven).toBe(true);
      expect(result.consentBy).toBe('usr_mina');
      expect(result.status).toBe('approved');
      expect(result.isApproved).toBe(true);
      expect(result.authorName).toBe('Mina Boulos');

      const savedDoc = mockDocs.get(`vbt_communities/vbt_main/memories/${result.id}`);
      expect(savedDoc).toBeDefined();
      expect(savedDoc.consentGiven).toBe(true);
    });

    it('enforces privacy protections: unconsented story is set to pending_consent and not approved', async () => {
      const storyData = {
        title: 'Youth Photo Without Explicit Permission',
        description: 'Action shot from the basketball game.',
        category: MEMORY_CATEGORIES.PHOTO_HIGHLIGHTS,
        consentGiven: false,
        status: 'approved', // attempts to publish without consent
        imageUrl: 'https://images.example.com/unconsented.jpg',
      };

      const result = await createMemoryStory('vbt_main', storyData);

      expect(result.consentGiven).toBe(false);
      // Status must be overridden to pending_consent and isApproved false
      expect(result.status).toBe('pending_consent');
      expect(result.isApproved).toBe(false);

      const approved = await getApprovedMemories('vbt_main');
      expect(approved.some((m) => m.id === result.id)).toBe(false);
    });

    it('generates custom or automated IDs and extracts mediaUrls', async () => {
      const storyData = {
        id: 'custom_mem_999',
        title: 'Tournament Champions 2024',
        category: MEMORY_CATEGORIES.TOURNAMENTS,
        consentGiven: true,
        mediaUrls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
      };

      const result = await createMemoryStory('vbt_main', storyData);
      expect(result.id).toBe('custom_mem_999');
      expect(result.imageUrl).toBe('https://example.com/1.jpg');
      expect(result.mediaUrls.length).toBe(2);
    });
  });

  describe('3. getApprovedMemories & Filtering', () => {
    beforeEach(async () => {
      // Seed a variety of memories for query and filter tests
      await createMemoryStory('vbt_main', {
        id: 'mem_1',
        title: 'Camp 2024 Closing Worship',
        description: 'Amazing spiritual revival.',
        category: MEMORY_CATEGORIES.CAMP_SEASONS,
        year: 2024,
        season: 'Summer 2024',
        eventDate: '2024-07-20T18:00:00Z',
        tags: ['worship', 'camp'],
        featured: true,
        consentGiven: true,
        impactMetrics: { youthAttended: 150 },
      });

      await createMemoryStory('vbt_main', {
        id: 'mem_2',
        title: 'Volleyball Cup 2025: St. George Champions',
        description: 'Titans won gold.',
        category: MEMORY_CATEGORIES.TOURNAMENTS,
        year: 2025,
        season: 'Spring 2025',
        eventDate: '2025-04-15T15:00:00Z',
        championTeam: 'St. George Titans',
        tags: ['volleyball', 'cup'],
        featured: true,
        consentGiven: true,
        impactMetrics: { gamesPlayed: 24 },
      });

      await createMemoryStory('vbt_main', {
        id: 'mem_3',
        title: 'Basketball Finals 2026',
        description: 'Senior division final.',
        category: MEMORY_CATEGORIES.TOURNAMENTS,
        year: 2026,
        season: 'Spring 2026',
        eventDate: '2026-05-10T14:00:00Z',
        tags: ['basketball'],
        featured: false,
        consentGiven: true,
      });

      await createMemoryStory('vbt_main', {
        id: 'mem_unconsented',
        title: 'Secret Photo Highlight',
        category: MEMORY_CATEGORIES.PHOTO_HIGHLIGHTS,
        year: 2025,
        eventDate: '2025-06-01T12:00:00Z',
        consentGiven: false, // NOT consented
        status: 'approved',
      });

      await createMemoryStory('vbt_main', {
        id: 'mem_draft',
        title: 'Draft Camp Notes',
        category: MEMORY_CATEGORIES.CAMP_SEASONS,
        consentGiven: true,
        status: 'draft', // Not approved
      });
    });

    it('returns only approved memories with explicit consent', async () => {
      const memories = await getApprovedMemories('vbt_main');
      expect(memories.length).toBe(3);
      expect(memories.some((m) => m.id === 'mem_unconsented')).toBe(false);
      expect(memories.some((m) => m.id === 'mem_draft')).toBe(false);
    });

    it('filters by category', async () => {
      const tournaments = await getApprovedMemories('vbt_main', {
        category: MEMORY_CATEGORIES.TOURNAMENTS,
      });
      expect(tournaments.length).toBe(2);
      tournaments.forEach((m) => expect(m.category).toBe(MEMORY_CATEGORIES.TOURNAMENTS));

      const multiCat = await getApprovedMemories('vbt_main', {
        category: [MEMORY_CATEGORIES.CAMP_SEASONS, MEMORY_CATEGORIES.TOURNAMENTS],
      });
      expect(multiCat.length).toBe(3);
    });

    it('filters by year and season', async () => {
      const year2024 = await getApprovedMemories('vbt_main', { year: 2024 });
      expect(year2024.length).toBe(1);
      expect(year2024[0].id).toBe('mem_1');

      const summer = await getApprovedMemories('vbt_main', { season: 'Summer' });
      expect(summer.length).toBe(1);
      expect(summer[0].season).toBe('Summer 2024');
    });

    it('filters by tags and featured flag', async () => {
      const worshipMemories = await getApprovedMemories('vbt_main', { tag: 'worship' });
      expect(worshipMemories.length).toBe(1);
      expect(worshipMemories[0].id).toBe('mem_1');

      const featuredMemories = await getApprovedMemories('vbt_main', { featured: true });
      expect(featuredMemories.length).toBe(2);
      featuredMemories.forEach((m) => expect(m.featured).toBe(true));
    });

    it('searches by keyword across title, description, and champion team', async () => {
      const searchTitans = await getApprovedMemories('vbt_main', { search: 'Titans' });
      expect(searchTitans.length).toBe(1);
      expect(searchTitans[0].championTeam).toBe('St. George Titans');

      const searchWorship = await getApprovedMemories('vbt_main', { search: 'revival' });
      expect(searchWorship.length).toBe(1);
      expect(searchWorship[0].id).toBe('mem_1');
    });

    it('sorts by newest, oldest, and most_impactful', async () => {
      const newest = await getApprovedMemories('vbt_main', { sort: 'newest' });
      expect(newest[0].year).toBe(2026);

      const oldest = await getApprovedMemories('vbt_main', { sort: 'oldest' });
      expect(oldest[0].year).toBe(2024);

      const impactful = await getApprovedMemories('vbt_main', { sort: 'most_impactful' });
      expect(impactful[0].id).toBe('mem_1'); // 150 youthAttended + featured
    });
  });

  describe('4. Dynamic Throwback: getThisWeekInHistory', () => {
    it('accurately identifies throwbacks from previous years during the same calendar week', async () => {
      // Target date: October 7, 2026 (Day of year 280, Week 41)
      const targetDate = new Date('2026-10-07T12:00:00Z');

      // Exact 1-year throwback: Oct 7, 2025
      await createMemoryStory('vbt_main', {
        id: 'mem_1yr_ago',
        title: 'Fall 2025 Fellowship Kickoff',
        category: MEMORY_CATEGORIES.CAMP_SEASONS,
        eventDate: '2025-10-07T10:00:00Z',
        consentGiven: true,
      });

      // 2-year throwback: Oct 5, 2024 (2 days apart, same week 41)
      await createMemoryStory('vbt_main', {
        id: 'mem_2yr_ago',
        title: 'Fall 2024 Volleyball Rally',
        category: MEMORY_CATEGORIES.TOURNAMENTS,
        eventDate: '2024-10-05T14:00:00Z',
        consentGiven: true,
      });

      // Current year event (Oct 7, 2026) -> should NOT be considered a historical throwback
      await createMemoryStory('vbt_main', {
        id: 'mem_this_year',
        title: 'Today Gathering',
        category: MEMORY_CATEGORIES.CAMP_SEASONS,
        eventDate: '2026-10-07T08:00:00Z',
        consentGiven: true,
      });

      // Different month (June 2025) -> should NOT be considered "this week"
      await createMemoryStory('vbt_main', {
        id: 'mem_june_2025',
        title: 'Summer 2025 Kickoff',
        category: MEMORY_CATEGORIES.CAMP_SEASONS,
        eventDate: '2025-06-15T10:00:00Z',
        consentGiven: true,
      });

      const throwbacks = await getThisWeekInHistory('vbt_main', targetDate);

      expect(throwbacks.length).toBe(2);
      expect(throwbacks[0].id).toBe('mem_1yr_ago');
      expect(throwbacks[0].yearsAgo).toBe(1);
      expect(throwbacks[0].throwbackHeadline).toBe('1 Year Ago This Week (2025)');
      expect(throwbacks[0].anniversaryBadge).toBe('1st Anniversary');

      expect(throwbacks[1].id).toBe('mem_2yr_ago');
      expect(throwbacks[1].yearsAgo).toBe(2);
      expect(throwbacks[1].throwbackHeadline).toBe('2 Years Ago This Week (2024)');
      expect(throwbacks[1].anniversaryBadge).toBe('2nd Anniversary');
    });

    it('handles anniversary milestones up to 5-year jubilees', async () => {
      const targetDate = new Date('2026-10-07T12:00:00Z');

      await createMemoryStory('vbt_main', {
        id: 'mem_5yr_ago',
        title: 'Camp Inaugural Season 2021',
        category: MEMORY_CATEGORIES.CAMP_SEASONS,
        eventDate: '2021-10-07T10:00:00Z',
        consentGiven: true,
      });

      const throwbacks = await getThisWeekInHistory('vbt_main', targetDate);
      expect(throwbacks.length).toBe(1);
      expect(throwbacks[0].anniversaryBadge).toBe('5-Year Jubilee');
    });

    it('throws error when invalid target date is supplied', async () => {
      await expect(getThisWeekInHistory('vbt_main', 'invalid-date-string')).rejects.toThrow(
        'Invalid targetDate provided'
      );
    });
  });

  describe('5. updateConsentStatus & Consent Revocation', () => {
    it('revokes consent and removes story from public memory wall', async () => {
      const story = await createMemoryStory('vbt_main', {
        title: 'Camper Milestone Story',
        description: 'Testimonial from a camper.',
        category: MEMORY_CATEGORIES.TESTIMONIES,
        consentGiven: true,
        consentBy: 'parent_mary',
      });

      // Initially approved
      let approved = await getApprovedMemories('vbt_main');
      expect(approved.some((m) => m.id === story.id)).toBe(true);

      // Parent revokes consent
      const updated = await updateConsentStatus('vbt_main', story.id, {
        consentGiven: false,
        consentBy: 'parent_mary',
        consentNotes: 'Requested removal from public website',
      });

      expect(updated.consentGiven).toBe(false);
      expect(updated.status).toBe('consent_revoked');
      expect(updated.isApproved).toBe(false);

      // Verify immediate disappearance from approved memories
      approved = await getApprovedMemories('vbt_main');
      expect(approved.some((m) => m.id === story.id)).toBe(false);
    });

    it('re-grants consent and restores story to approved wall', async () => {
      const story = await createMemoryStory('vbt_main', {
        title: 'Pending Photo Highlight',
        category: MEMORY_CATEGORIES.PHOTO_HIGHLIGHTS,
        consentGiven: false,
      });

      expect(story.isApproved).toBe(false);

      const updated = await updateConsentStatus('vbt_main', story.id, {
        consentGiven: true,
        consentBy: 'servant_leader',
        consentNotes: 'Signed parental consent form received',
      });

      expect(updated.consentGiven).toBe(true);
      expect(updated.isApproved).toBe(true);
      expect(updated.status).toBe('approved');

      const approved = await getApprovedMemories('vbt_main');
      expect(approved.some((m) => m.id === story.id)).toBe(true);
    });

    it('throws error when memoryId does not exist', async () => {
      await expect(
        updateConsentStatus('vbt_main', 'non_existent_id', { consentGiven: true })
      ).rejects.toThrow('does not exist');

      await expect(updateConsentStatus('vbt_main', null)).rejects.toThrow(
        'memoryId is required'
      );
    });
  });

  describe('6. getMemberPersonalHistory & Privacy Protections', () => {
    beforeEach(() => {
      // Seed member doc in Firestore
      mockDocs.set('vbt_communities/vbt_main/members/usr_david', {
        id: 'usr_david',
        displayName: 'David Shenouda',
        serviceStartDate: '2024-09-01T00:00:00Z',
        totalAttendances: 52,
        totalServingCount: 22,
        shareStatsConsent: false, // Default strict privacy
      });
    });

    it('allows a member to view their own private personal history', async () => {
      const requestingUser = { id: 'usr_david', role: 'member' };
      const history = await getMemberPersonalHistory('vbt_main', 'usr_david', requestingUser);

      expect(history.authorized).toBe(true);
      expect(history.memberId).toBe('usr_david');
      expect(history.displayName).toBe('David Shenouda');
      expect(history.attendanceCount).toBe(52);
      expect(history.servingCount).toBe(22);
      expect(history.yearsOfService).toBeGreaterThanOrEqual(2);
      expect(history.servantAnniversary.years).toBeGreaterThanOrEqual(2);
      expect(history.milestones.length).toBeGreaterThan(0);
      expect(history.privacyNotice).toContain('Sensitive personal attendance');
    });

    it('allows privileged pastoral leaders to view personal history for care oversight', async () => {
      const pastoralUser = { id: 'usr_pastor', role: 'pastoral_care_leader' };
      const history = await getMemberPersonalHistory('vbt_main', 'usr_david', pastoralUser);

      expect(history.authorized).toBe(true);
      expect(history.attendanceCount).toBe(52);

      const adminUser = { id: 'usr_admin', role: 'admin', isAdmin: true };
      const adminHistory = await getMemberPersonalHistory('vbt_main', 'usr_david', adminUser);
      expect(adminHistory.authorized).toBe(true);
    });

    it('strictly blocks unauthorized members from viewing sensitive counts without consent', async () => {
      const unauthorizedStranger = { id: 'usr_stranger', role: 'member' };

      await expect(
        getMemberPersonalHistory('vbt_main', 'usr_david', unauthorizedStranger)
      ).rejects.toThrow('Access Denied: Personal attendance and serving history are private');
    });

    it('allows view if member explicitly granted broadcast consent', async () => {
      // Update member doc to grant broadcast consent
      mockDocs.set('vbt_communities/vbt_main/members/usr_david', {
        id: 'usr_david',
        displayName: 'David Shenouda',
        serviceStartDate: '2024-09-01T00:00:00Z',
        totalAttendances: 52,
        totalServingCount: 22,
        shareStatsConsent: true, // Explicit broadcast consent granted
      });

      const anyUser = { id: 'usr_stranger', role: 'member' };
      const history = await getMemberPersonalHistory('vbt_main', 'usr_david', anyUser);
      expect(history.authorized).toBe(true);
      expect(history.attendanceCount).toBe(52);
    });

    it('throws error when memberId is omitted', async () => {
      await expect(getMemberPersonalHistory('vbt_main', null)).rejects.toThrow(
        'memberId is required'
      );
    });
  });

  describe('7. Community Impact Statistics', () => {
    it('returns default baseline stats when document does not exist', async () => {
      const stats = await getCommunityImpactStats('vbt_main');
      expect(stats.mealsShared).toBe(1420);
      expect(stats.youthCoached).toBe(385);
      expect(stats.prayersLifted).toBe(960);
      expect(stats.hoursVolunteered).toBe(2450);
    });

    it('updates and persists impact statistics with merge', async () => {
      await updateCommunityImpactStats('vbt_main', {
        mealsShared: 1500,
        youthCoached: 400,
      });

      const stats = await getCommunityImpactStats('vbt_main');
      expect(stats.mealsShared).toBe(1500);
      expect(stats.youthCoached).toBe(400);
      expect(stats.prayersLifted).toBe(960); // Preserved
    });
  });

  describe('8. deleteMemoryStory Permissions', () => {
    it('allows author to delete their own memory story', async () => {
      const memory = await createMemoryStory('vbt_main', {
        title: 'Story to delete',
        consentGiven: true,
      }, { id: 'author_123', role: 'member' });

      const deleted = await deleteMemoryStory('vbt_main', memory.id, { id: 'author_123' });
      expect(deleted).toBe(true);
      expect(mockDocs.get(`vbt_communities/vbt_main/memories/${memory.id}`)).toBeUndefined();
    });

    it('allows admin or pastoral leader to delete any memory story', async () => {
      const memory = await createMemoryStory('vbt_main', {
        title: 'Story to moderate',
        consentGiven: true,
      }, { id: 'author_123' });

      const deleted = await deleteMemoryStory('vbt_main', memory.id, { role: 'admin' });
      expect(deleted).toBe(true);
    });

    it('blocks unauthorized users from deleting other users stories', async () => {
      const memory = await createMemoryStory('vbt_main', {
        title: 'Protected Story',
        consentGiven: true,
      }, { id: 'author_123' });

      await expect(
        deleteMemoryStory('vbt_main', memory.id, { id: 'other_user', role: 'member' })
      ).rejects.toThrow('Access Denied: Only the author or a leader can delete a memory story.');
    });
  });

  describe('9. subscribeToApprovedMemories', () => {
    it('subscribes and receives filtered, sorted memory stream', async () => {
      let received = null;
      const unsubscribe = subscribeToApprovedMemories('vbt_main', (mems) => {
        received = mems;
      });

      expect(typeof unsubscribe).toBe('function');
      expect(received).toEqual([]);
      unsubscribe();
    });
  });

  describe('10. seedDefaultMemories', () => {
    it('populates inspirational camp seasons, championship records, and impact stats', async () => {
      const seeded = await seedDefaultMemories('vbt_main');
      expect(seeded.length).toBeGreaterThanOrEqual(6);

      const approved = await getApprovedMemories('vbt_main');
      expect(approved.length).toBe(seeded.length);

      const impact = await getCommunityImpactStats('vbt_main');
      expect(impact.mealsShared).toBe(1420);
      expect(impact.youthCoached).toBe(385);
    });
  });
});
