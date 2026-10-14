import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_COMMUNITY_ID,
  VISIBILITY_SCOPES,
  VBT_ROLES,
  POST_TYPES,
  REACTION_TYPES,
  MODERATION_ACTIONS,
  POST_STATUS,
  FEED_FILTER_SCOPES,
  WEEKLY_VERSES,
  cultureFeedCollectionPath,
  culturePostDocPath,
  cultureAuditCollectionPath,
  verseSettingsDocPath,
  isUserLeader,
  isUserPastoral,
  isPostAuthor,
  canUserViewPost,
  sanitizePostForAIOrPublic,
  sanitizeFeedForExport,
  sanitizeFeedForAI,
  createCommunityPost,
  getFilteredFeed,
  addPostReaction,
  sendThankServantNote,
  moderatePost,
  getVerseOfTheWeek,
  setVerseOfTheWeek,
  reportPost,
  subscribeToFilteredFeed,
  getTeamFeed,
  getGroupFeed,
  createTeamChallenge,
  joinChallenge,
  celebrateMilestone,
  deletePost,
} from './teamCultureService';

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
  onSnapshot: vi.fn((colRef, onNext) => {
    mockSnapshotListener = { colRef, onNext };
    const results = [];
    for (const [p, val] of mockDocs.entries()) {
      if (p.startsWith(colRef.path + '/')) {
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
    return () => {
      mockSnapshotListener = null;
    };
  }),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
}));

describe('teamCultureService', () => {
  beforeEach(() => {
    mockDocs.clear();
    mockSnapshotListener = null;
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // 1. Path Helpers & Constants
  // ─────────────────────────────────────────────
  describe('Path Helpers & Constants', () => {
    it('generates correct Firestore collection and doc paths', () => {
      expect(cultureFeedCollectionPath('comm_123')).toBe('vbt_communities/comm_123/team_culture_feed');
      expect(cultureFeedCollectionPath()).toBe('vbt_communities/vbt_main/team_culture_feed');

      expect(culturePostDocPath('comm_123', 'post_abc')).toBe(
        'vbt_communities/comm_123/team_culture_feed/post_abc'
      );
      expect(culturePostDocPath('post_abc')).toBe('vbt_communities/vbt_main/team_culture_feed/post_abc');

      expect(cultureAuditCollectionPath('comm_123')).toBe('vbt_communities/comm_123/team_culture_audit');
      expect(verseSettingsDocPath('comm_123')).toBe(
        'vbt_communities/comm_123/community_settings/verse_of_the_week'
      );
    });

    it('exports all expected visibility scopes and roles', () => {
      expect(VISIBILITY_SCOPES.COMMUNITY).toBe('community');
      expect(VISIBILITY_SCOPES.TEAM).toBe('team');
      expect(VISIBILITY_SCOPES.GROUP).toBe('group');
      expect(VISIBILITY_SCOPES.LEADER_ONLY).toBe('leader_only');
      expect(VISIBILITY_SCOPES.PASTORAL_PRIVATE).toBe('pastoral_private');
      expect(VISIBILITY_SCOPES.PRIVATE).toBe('private');
    });
  });

  // ─────────────────────────────────────────────
  // 2. Role Checks & Author Verification
  // ─────────────────────────────────────────────
  describe('Role & Author Checkers', () => {
    it('identifies leader roles accurately', () => {
      expect(isUserLeader({ role: 'admin' })).toBe(true);
      expect(isUserLeader({ role: 'coordinator' })).toBe(true);
      expect(isUserLeader({ role: 'team_leader' })).toBe(true);
      expect(isUserLeader({ role: 'service_leader' })).toBe(true);
      expect(isUserLeader({ role: 'game_leader' })).toBe(true);
      expect(isUserLeader({ role: 'volunteer' })).toBe(false);
      expect(isUserLeader({ role: 'member' })).toBe(false);
      expect(isUserLeader(null)).toBe(false);
    });

    it('identifies pastoral roles strictly', () => {
      expect(isUserPastoral({ role: 'admin' })).toBe(true);
      expect(isUserPastoral({ role: 'pastoral_care_leader' })).toBe(true);
      expect(isUserPastoral({ role: 'coordinator' })).toBe(true);
      // Regular team leaders and volunteers are NOT pastoral
      expect(isUserPastoral({ role: 'team_leader' })).toBe(false);
      expect(isUserPastoral({ role: 'game_leader' })).toBe(false);
      expect(isUserPastoral({ role: 'volunteer' })).toBe(false);
    });

    it('identifies post author accurately', () => {
      const post = { author: { id: 'usr_john' } };
      expect(isPostAuthor({ id: 'usr_john' }, post)).toBe(true);
      expect(isPostAuthor({ uid: 'usr_john' }, post)).toBe(true);
      expect(isPostAuthor({ id: 'usr_sarah' }, post)).toBe(false);
      expect(isPostAuthor(null, post)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // 3. Strict Visibility Scopes & canUserViewPost
  // ─────────────────────────────────────────────
  describe('Visibility Scopes Enforcement (canUserViewPost)', () => {
    const authorUser = { id: 'usr_author', name: 'Author User', role: 'member' };
    const teammateUser = { id: 'usr_teammate', teamId: 'team_lions', role: 'member' };
    const otherTeamUser = { id: 'usr_other', teamId: 'team_eagles', role: 'member' };
    const groupMember = { id: 'usr_grp', groupId: 'grp_circle1', role: 'member' };
    const teamLeader = { id: 'usr_lead', teamId: 'team_eagles', role: 'team_leader' };
    const volunteer = { id: 'usr_vol', teamId: 'team_lions', role: 'volunteer' };
    const pastoralLeader = { id: 'usr_pastor', role: 'pastoral_care_leader' };
    const adminUser = { id: 'usr_admin', role: 'admin' };

    it('allows anyone to view community-scoped active posts', () => {
      const post = { visibility: VISIBILITY_SCOPES.COMMUNITY, status: 'active' };
      expect(canUserViewPost(post, null)).toBe(true);
      expect(canUserViewPost(post, volunteer)).toBe(true);
      expect(canUserViewPost(post, teammateUser)).toBe(true);
    });

    it('enforces team visibility scope strictly', () => {
      const teamPost = {
        visibility: VISIBILITY_SCOPES.TEAM,
        teamId: 'team_lions',
        author: { id: 'usr_author' },
        status: 'active',
      };

      // Same team member: allowed
      expect(canUserViewPost(teamPost, teammateUser)).toBe(true);
      // Different team member: rejected
      expect(canUserViewPost(teamPost, otherTeamUser)).toBe(false);
      // Author (even if team differs): allowed
      expect(canUserViewPost(teamPost, authorUser)).toBe(true);
      // Leaders: allowed
      expect(canUserViewPost(teamPost, teamLeader)).toBe(true);
      expect(canUserViewPost(teamPost, adminUser)).toBe(true);
      // Unauthenticated: rejected
      expect(canUserViewPost(teamPost, null)).toBe(false);
    });

    it('enforces group visibility scope strictly', () => {
      const groupPost = {
        visibility: VISIBILITY_SCOPES.GROUP,
        groupId: 'grp_circle1',
        author: { id: 'usr_author' },
        status: 'active',
      };

      expect(canUserViewPost(groupPost, groupMember)).toBe(true);
      expect(canUserViewPost(groupPost, otherTeamUser)).toBe(false);
      expect(canUserViewPost(groupPost, authorUser)).toBe(true);
      expect(canUserViewPost(groupPost, teamLeader)).toBe(true);
    });

    it('enforces leader_only visibility scope', () => {
      const leaderPost = {
        visibility: VISIBILITY_SCOPES.LEADER_ONLY,
        author: { id: 'usr_author' },
        status: 'active',
      };

      expect(canUserViewPost(leaderPost, teamLeader)).toBe(true);
      expect(canUserViewPost(leaderPost, adminUser)).toBe(true);
      expect(canUserViewPost(leaderPost, volunteer)).toBe(false);
      expect(canUserViewPost(leaderPost, teammateUser)).toBe(false);
      expect(canUserViewPost(leaderPost, authorUser)).toBe(true);
    });

    it('CRITICAL: Enforces pastoral_private confidentiality strictly', () => {
      const pastoralPost = {
        visibility: VISIBILITY_SCOPES.PASTORAL_PRIVATE,
        author: { id: 'usr_author' },
        status: 'active',
      };

      // Pastoral leaders & admins: allowed
      expect(canUserViewPost(pastoralPost, pastoralLeader)).toBe(true);
      expect(canUserViewPost(pastoralPost, adminUser)).toBe(true);

      // Author themselves: allowed
      expect(canUserViewPost(pastoralPost, authorUser)).toBe(true);

      // Regular team leader: STRICTLY REJECTED!
      expect(canUserViewPost(pastoralPost, teamLeader)).toBe(false);

      // Volunteer & general community: STRICTLY REJECTED!
      expect(canUserViewPost(pastoralPost, volunteer)).toBe(false);
      expect(canUserViewPost(pastoralPost, teammateUser)).toBe(false);
      expect(canUserViewPost(pastoralPost, null)).toBe(false);
    });

    it('enforces private scope strictly to author, target, and admins', () => {
      const privatePost = {
        visibility: VISIBILITY_SCOPES.PRIVATE,
        author: { id: 'usr_author' },
        targetMemberId: 'usr_recipient',
        status: 'active',
      };

      expect(canUserViewPost(privatePost, authorUser)).toBe(true);
      expect(canUserViewPost(privatePost, { id: 'usr_recipient' })).toBe(true);
      expect(canUserViewPost(privatePost, adminUser)).toBe(true);
      expect(canUserViewPost(privatePost, teammateUser)).toBe(false);
    });

    it('hides hidden posts from normal users, visible only to leaders and author', () => {
      const hiddenPost = {
        visibility: VISIBILITY_SCOPES.COMMUNITY,
        author: { id: 'usr_author' },
        status: 'hidden',
        moderation: { hidden: true },
      };

      expect(canUserViewPost(hiddenPost, volunteer)).toBe(false);
      expect(canUserViewPost(hiddenPost, teamLeader)).toBe(true);
      expect(canUserViewPost(hiddenPost, authorUser)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // 4. Critical Safeguards: Leakage Prevention
  // ─────────────────────────────────────────────
  describe('Safety & Sanitization Safeguards', () => {
    it('sanitizePostForAIOrPublic returns null for pastoral_private and hidden posts', () => {
      const pastoralPost = {
        id: 'p1',
        visibility: VISIBILITY_SCOPES.PASTORAL_PRIVATE,
        content: 'Confidential pastoral conversation',
      };
      const hiddenPost = {
        id: 'p2',
        visibility: VISIBILITY_SCOPES.COMMUNITY,
        status: 'hidden',
        content: 'Flagged offensive remark',
      };
      const normalPost = {
        id: 'p3',
        visibility: VISIBILITY_SCOPES.COMMUNITY,
        content: 'Great volleyball game today!',
        moderation: { reports: ['Offensive'], hidden: false },
      };

      expect(sanitizePostForAIOrPublic(pastoralPost)).toBeNull();
      expect(sanitizePostForAIOrPublic(hiddenPost)).toBeNull();

      const sanitized = sanitizePostForAIOrPublic(normalPost);
      expect(sanitized).not.toBeNull();
      expect(sanitized.content).toBe('Great volleyball game today!');
      expect(sanitized.moderation.reports).toBeUndefined(); // internal reports stripped
    });

    it('sanitizeFeedForAI completely strips ALL pastoral_private and private posts', () => {
      const feed = [
        { id: '1', visibility: VISIBILITY_SCOPES.COMMUNITY, content: 'Public win' },
        { id: '2', visibility: VISIBILITY_SCOPES.PASTORAL_PRIVATE, content: 'Pastoral secret' },
        { id: '3', visibility: VISIBILITY_SCOPES.PRIVATE, content: 'Private note' },
        { id: '4', visibility: VISIBILITY_SCOPES.TEAM, content: 'Team tactics' },
      ];

      const aiFeed = sanitizeFeedForAI(feed);
      expect(aiFeed).toHaveLength(2);
      expect(aiFeed.find((p) => p.id === '2')).toBeUndefined();
      expect(aiFeed.find((p) => p.id === '3')).toBeUndefined();
      expect(aiFeed.map((p) => p.id)).toEqual(['1', '4']);
    });

    it('sanitizeFeedForExport prevents pastoral_private from being exported by non-pastoral users', () => {
      const feed = [
        { id: '1', visibility: VISIBILITY_SCOPES.COMMUNITY },
        { id: '2', visibility: VISIBILITY_SCOPES.PASTORAL_PRIVATE },
      ];

      const volunteer = { id: 'v1', role: 'volunteer' };
      const pastor = { id: 'p1', role: 'pastoral_care_leader' };

      const volunteerExport = sanitizeFeedForExport(feed, volunteer);
      expect(volunteerExport).toHaveLength(1);
      expect(volunteerExport[0].id).toBe('1');

      const pastorExport = sanitizeFeedForExport(feed, pastor);
      expect(pastorExport).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────
  // 5. Post Creation & Filtering
  // ─────────────────────────────────────────────
  describe('createCommunityPost & getFilteredFeed', () => {
    it('creates a community post with default reactions and audit trail', async () => {
      const author = { id: 'usr_mark', name: 'Mark Servant', role: 'servant', teamId: 'team_lions' };
      const postData = {
        title: 'Camp Kickoff Rally',
        content: 'Excited to see everyone on Friday at 6:30 PM!',
        visibility: VISIBILITY_SCOPES.COMMUNITY,
        type: POST_TYPES.ANNOUNCEMENT,
      };

      const created = await createCommunityPost('vbt_main', postData, author);

      expect(created.id).toBeDefined();
      expect(created.communityId).toBe('vbt_main');
      expect(created.title).toBe('Camp Kickoff Rally');
      expect(created.author.name).toBe('Mark Servant');
      expect(created.reactions[REACTION_TYPES.HEART]).toEqual([]);
      expect(created.reactionCounts[REACTION_TYPES.HEART]).toBe(0);
      expect(created.moderation.auditTrail).toHaveLength(1);
      expect(created.moderation.auditTrail[0].action).toBe('post_created');
    });

    it('filters feed by user membership and hides non-accessible posts', async () => {
      const authorLions = { id: 'usr_lion', role: 'member', teamId: 'team_lions' };
      const authorEagles = { id: 'usr_eagle', role: 'member', teamId: 'team_eagles' };
      const authorPastor = { id: 'usr_pastor', role: 'pastoral_care_leader' };

      // 1. Community post
      await createCommunityPost('vbt_main', {
        id: 'post_comm',
        content: 'Community post',
        visibility: VISIBILITY_SCOPES.COMMUNITY,
      }, authorLions);

      // 2. Lions team post
      await createCommunityPost('vbt_main', {
        id: 'post_lions',
        content: 'Lions secret drill',
        visibility: VISIBILITY_SCOPES.TEAM,
        teamId: 'team_lions',
      }, authorLions);

      // 3. Eagles team post
      await createCommunityPost('vbt_main', {
        id: 'post_eagles',
        content: 'Eagles secret drill',
        visibility: VISIBILITY_SCOPES.TEAM,
        teamId: 'team_eagles',
      }, authorEagles);

      // 4. Pastoral private post
      await createCommunityPost('vbt_main', {
        id: 'post_pastoral',
        content: 'Pastoral family support note',
        visibility: VISIBILITY_SCOPES.PASTORAL_PRIVATE,
      }, authorPastor);

      // Test: Lion member sees community and lions, but NOT eagles and NOT pastoral
      const lionMember = { id: 'usr_sam', teamId: 'team_lions', role: 'member' };
      const lionFeed = await getFilteredFeed('vbt_main', lionMember);
      const lionIds = lionFeed.map((p) => p.id);

      expect(lionIds).toContain('post_comm');
      expect(lionIds).toContain('post_lions');
      expect(lionIds).not.toContain('post_eagles');
      expect(lionIds).not.toContain('post_pastoral');

      // Test: Pastor sees pastoral post
      const pastorFeed = await getFilteredFeed('vbt_main', authorPastor);
      expect(pastorFeed.map((p) => p.id)).toContain('post_pastoral');
    });

    it('filters by category tabs (announcements, servants, challenges)', async () => {
      const author = { id: 'usr_leader', role: 'team_leader', teamId: 'team_lions' };

      await createCommunityPost('vbt_main', {
        id: 'post_ann',
        type: POST_TYPES.ANNOUNCEMENT,
        content: 'Friday dinner menu',
      }, author);

      await createCommunityPost('vbt_main', {
        id: 'post_thank',
        type: POST_TYPES.THANK_SERVANT,
        content: 'Thank you coach David',
      }, author);

      await createCommunityPost('vbt_main', {
        id: 'post_chal',
        type: POST_TYPES.CHALLENGE,
        content: '50 free throw challenge',
      }, author);

      // Announcements tab
      const announcements = await getFilteredFeed('vbt_main', author, {
        scope: FEED_FILTER_SCOPES.ANNOUNCEMENTS,
      });
      expect(announcements).toHaveLength(1);
      expect(announcements[0].id).toBe('post_ann');

      // Servants tab
      const servants = await getFilteredFeed('vbt_main', author, {
        scope: FEED_FILTER_SCOPES.SERVANTS,
      });
      expect(servants).toHaveLength(1);
      expect(servants[0].id).toBe('post_thank');

      // Challenges tab
      const challenges = await getFilteredFeed('vbt_main', author, {
        scope: FEED_FILTER_SCOPES.CHALLENGES,
      });
      expect(challenges).toHaveLength(1);
      expect(challenges[0].id).toBe('post_chal');
    });

    it('orders pinned posts first', async () => {
      const author = { id: 'usr_admin', role: 'admin' };
      await createCommunityPost('vbt_main', {
        id: 'post_old_pinned',
        pinned: true,
        createdAt: '2026-10-01T10:00:00Z',
      }, author);

      await createCommunityPost('vbt_main', {
        id: 'post_new_unpinned',
        pinned: false,
        createdAt: '2026-10-07T10:00:00Z',
      }, author);

      const feed = await getFilteredFeed('vbt_main', author);
      expect(feed[0].id).toBe('post_old_pinned');
      expect(feed[1].id).toBe('post_new_unpinned');
    });
  });

  // ─────────────────────────────────────────────
  // 6. Reactions Handling
  // ─────────────────────────────────────────────
  describe('addPostReaction', () => {
    it('toggles reactions on and off with accurate count recalculations', async () => {
      const author = { id: 'usr_auth', role: 'member' };
      const post = await createCommunityPost('vbt_main', {
        id: 'post_react',
        content: 'Great practice today!',
      }, author);

      // 1. Add reaction 'amen'
      const res1 = await addPostReaction('vbt_main', post.id, 'usr_sarah', REACTION_TYPES.AMEN);
      expect(res1.userReacted).toBe(true);
      expect(res1.reactions[REACTION_TYPES.AMEN]).toContain('usr_sarah');
      expect(res1.reactionCounts[REACTION_TYPES.AMEN]).toBe(1);

      // 2. Sarah reacts with 'amen' again -> toggle off
      const res2 = await addPostReaction('vbt_main', post.id, 'usr_sarah', REACTION_TYPES.AMEN);
      expect(res2.userReacted).toBe(false);
      expect(res2.reactions[REACTION_TYPES.AMEN]).not.toContain('usr_sarah');
      expect(res2.reactionCounts[REACTION_TYPES.AMEN]).toBe(0);

      // 3. Multiple users react with heart
      await addPostReaction('vbt_main', post.id, 'usr_1', REACTION_TYPES.HEART);
      const res3 = await addPostReaction('vbt_main', post.id, 'usr_2', REACTION_TYPES.HEART);
      expect(res3.reactionCounts[REACTION_TYPES.HEART]).toBe(2);
    });

    it('throws error if post does not exist', async () => {
      await expect(
        addPostReaction('vbt_main', 'nonexistent_post', 'usr_sarah', REACTION_TYPES.HEART)
      ).rejects.toThrow('Post not found');
    });
  });

  // ─────────────────────────────────────────────
  // 7. Thank a Servant Encouragement Messages
  // ─────────────────────────────────────────────
  describe('sendThankServantNote', () => {
    it('creates an encouragement post with target recipient details', async () => {
      const sender = { id: 'usr_camper', name: 'Mina Camper', role: 'member', teamId: 'team_lions' };
      const note = await sendThankServantNote(
        'vbt_main',
        sender,
        'usr_coach_david',
        'Thank you Coach David for taking time to teach me free throws!',
        VISIBILITY_SCOPES.COMMUNITY,
        {
          recipientName: 'Coach David',
          recipientRole: 'active_servant',
        }
      );

      expect(note.type).toBe(POST_TYPES.THANK_SERVANT);
      expect(note.author.name).toBe('Mina Camper');
      expect(note.targetMemberId).toBe('usr_coach_david');
      expect(note.targetMemberName).toBe('Coach David');
      expect(note.content).toContain('Coach David for taking time');
      expect(note.badge).toBe('🙏❤️');
    });
  });

  // ─────────────────────────────────────────────
  // 8. Moderation & Audit Trail
  // ─────────────────────────────────────────────
  describe('moderatePost & reportPost', () => {
    let testPostId;
    const author = { id: 'usr_author', role: 'member', name: 'Author User' };
    const leader = { id: 'usr_lead', role: 'team_leader', name: 'Leader Sarah' };
    const regularUser = { id: 'usr_reg', role: 'member', name: 'Regular Bob' };

    beforeEach(async () => {
      const post = await createCommunityPost('vbt_main', {
        id: 'post_mod_test',
        content: 'Original post content',
      }, author);
      testPostId = post.id;
    });

    it('allows regular members to report a post and updates flag counter', async () => {
      const res = await reportPost('vbt_main', testPostId, regularUser, 'Inappropriate language');

      expect(res.moderation.isFlagged).toBe(true);
      expect(res.moderation.reportCount).toBe(1);
      expect(res.moderation.reports[0].reporterName).toBe('Regular Bob');
      expect(res.moderation.reports[0].reason).toBe('Inappropriate language');
      expect(res.moderation.auditTrail).toHaveLength(2); // create + report
    });

    it('allows leaders to hide, restore, and archive posts', async () => {
      // 1. Hide
      const hidden = await moderatePost(
        'vbt_main',
        testPostId,
        MODERATION_ACTIONS.HIDE,
        leader,
        'Violates sportsmanship rules'
      );
      expect(hidden.moderation.hidden).toBe(true);
      expect(hidden.status).toBe(POST_STATUS.HIDDEN);
      expect(hidden.moderation.auditTrail.slice(-1)[0].action).toBe('post_hide');

      // 2. Restore
      const restored = await moderatePost(
        'vbt_main',
        testPostId,
        MODERATION_ACTIONS.RESTORE,
        leader,
        'Issue resolved with user'
      );
      expect(restored.moderation.hidden).toBe(false);
      expect(restored.status).toBe(POST_STATUS.ACTIVE);

      // 3. Archive
      const archived = await moderatePost(
        'vbt_main',
        testPostId,
        MODERATION_ACTIONS.ARCHIVE,
        leader,
        'End of season cleanup'
      );
      expect(archived.moderation.archived).toBe(true);
      expect(archived.status).toBe(POST_STATUS.ARCHIVED);
    });

    it('rejects moderation actions from unauthorized regular members', async () => {
      await expect(
        moderatePost('vbt_main', testPostId, MODERATION_ACTIONS.HIDE, regularUser, 'Try to hide')
      ).rejects.toThrow('Unauthorized: only leaders and moderators can perform action "hide"');
    });

    it('allows leaders to add internal moderation notes', async () => {
      const noteRes = await moderatePost(
        'vbt_main',
        testPostId,
        MODERATION_ACTIONS.ADD_NOTE,
        leader,
        'Followed up with member in person on Tuesday'
      );

      expect(noteRes.moderation.moderatorNotes).toHaveLength(1);
      expect(noteRes.moderation.moderatorNotes[0].note).toBe(
        'Followed up with member in person on Tuesday'
      );
    });
  });

  // ─────────────────────────────────────────────
  // 9. Scripture & Verse of the Week
  // ─────────────────────────────────────────────
  describe('getVerseOfTheWeek & setVerseOfTheWeek', () => {
    it('returns a rotating scripture reflection with practical sports challenge', async () => {
      const verse = await getVerseOfTheWeek('vbt_main');

      expect(verse.reference).toBeDefined();
      expect(verse.verse).toBeDefined();
      expect(verse.reflection).toBeDefined();
      expect(verse.sportsChallenge).toBeDefined();
      expect(verse.weekNumber).toBeGreaterThan(0);
    });

    it('allows leader to set a custom verse of the week', async () => {
      const leader = { id: 'usr_lead', role: 'coordinator', name: 'Coordinator John' };
      const customData = {
        reference: 'Romans 12:11',
        verse: 'Never be lacking in zeal, but keep your spiritual fervor, serving the Lord.',
        theme: 'Passion on the Court',
        reflection: 'Play with fiery spirit and holy heart.',
        sportsChallenge: 'Hustle for every rebound and loose ball with joy.',
      };

      await setVerseOfTheWeek('vbt_main', customData, leader);

      const activeVerse = await getVerseOfTheWeek('vbt_main');
      expect(activeVerse.reference).toBe('Romans 12:11');
      expect(activeVerse.isCustom).toBe(true);
    });

    it('rejects setting custom verse by non-leaders', async () => {
      const member = { id: 'usr_mem', role: 'member' };
      await expect(
        setVerseOfTheWeek('vbt_main', { reference: 'Gen 1:1' }, member)
      ).rejects.toThrow('Unauthorized');
    });
  });

  // ─────────────────────────────────────────────
  // 10. Team Challenges & Milestone Celebrations
  // ─────────────────────────────────────────────
  describe('Team Challenges & Celebrations', () => {
    it('creates team challenge and allows members to join', async () => {
      const coach = { id: 'usr_coach', role: 'game_leader', name: 'Coach Alex' };
      const challengePost = await createTeamChallenge(
        'vbt_main',
        {
          title: '3-Point & Scripture Memorization Drill',
          description: 'Sink 20 shots and recite Philippians 4:13 with a buddy.',
          category: 'drill',
          rewardPoints: 100,
        },
        coach
      );

      expect(challengePost.type).toBe(POST_TYPES.CHALLENGE);
      expect(challengePost.challenge.category).toBe('drill');

      // Member joins challenge
      const joined = await joinChallenge('vbt_main', challengePost.id, { id: 'usr_player1' });
      expect(joined.challenge.participants).toContain('usr_player1');
    });

    it('celebrates birthdays and servant milestones', async () => {
      const leader = { id: 'usr_lead', role: 'team_leader', name: 'Leader Mark' };
      const celebration = await celebrateMilestone(
        'vbt_main',
        {
          title: 'Happy 18th Birthday Thomas!',
          targetMemberName: 'Thomas George',
          targetMemberId: 'usr_thomas',
          category: 'birthday',
          message: 'May God bless your upcoming year and your service at VBT!',
        },
        leader
      );

      expect(celebration.type).toBe(POST_TYPES.MILESTONE);
      expect(celebration.targetMemberName).toBe('Thomas George');
      expect(celebration.badge).toBe('🎂🎉');
    });
  });

  // ─────────────────────────────────────────────
  // 11. Real-time Subscription & Feed Retrieval
  // ─────────────────────────────────────────────
  describe('subscribeToFilteredFeed & Feeds by Group/Team', () => {
    it('subscribes and receives filtered updates', async () => {
      const author = { id: 'usr_lead', role: 'team_leader', teamId: 'team_lions' };
      await createCommunityPost('vbt_main', {
        id: 'post_sub_1',
        content: 'Sub test 1',
        visibility: VISIBILITY_SCOPES.COMMUNITY,
      }, author);

      let received = [];
      const unsubscribe = subscribeToFilteredFeed('vbt_main', author, (feed) => {
        received = feed;
      });

      expect(received).toHaveLength(1);
      expect(received[0].id).toBe('post_sub_1');

      unsubscribe();
    });

    it('retrieves team feed and group feed through helper endpoints', async () => {
      const author = { id: 'usr_lead', role: 'team_leader', teamId: 'team_lions' };
      await createCommunityPost('vbt_main', {
        id: 'post_team_lions',
        teamId: 'team_lions',
        visibility: VISIBILITY_SCOPES.TEAM,
        content: 'Lions Team meeting on Thursday',
      }, author);

      const teamPosts = await getTeamFeed('vbt_main', 'team_lions', author);
      expect(teamPosts.some((p) => p.id === 'post_team_lions')).toBe(true);
    });

    it('allows author or leader to delete a post', async () => {
      const author = { id: 'usr_author', role: 'member' };
      const post = await createCommunityPost('vbt_main', {
        id: 'post_to_delete',
        content: 'To be removed',
      }, author);

      const success = await deletePost('vbt_main', post.id, author);
      expect(success).toBe(true);

      const feed = await getFilteredFeed('vbt_main', author);
      expect(feed.find((p) => p.id === 'post_to_delete')).toBeUndefined();
    });
  });
});
