import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import { VISIBILITY_SCOPES, VBT_ROLES } from '../contracts/communityContracts';

export { DEFAULT_COMMUNITY_ID, VISIBILITY_SCOPES, VBT_ROLES };

// ─────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────

export const POST_TYPES = {
  GENERAL: 'general',
  ANNOUNCEMENT: 'announcement',
  THANK_SERVANT: 'thank_servant',
  MILESTONE: 'milestone',
  PRAYER: 'prayer',
  TESTIMONY: 'testimony',
  CHALLENGE: 'challenge',
  PHOTO_MEMORY: 'photo_memory',
  HIGHLIGHT: 'highlight',
};

export const REACTION_TYPES = {
  HEART: 'heart',
  AMEN: 'amen',
  CLAP: 'clap',
  PRAY: 'pray',
  FIRE: 'fire',
};

export const REACTION_EMOJIS = {
  [REACTION_TYPES.HEART]: '❤️',
  [REACTION_TYPES.AMEN]: '✝️',
  [REACTION_TYPES.CLAP]: '👏',
  [REACTION_TYPES.PRAY]: '🙏',
  [REACTION_TYPES.FIRE]: '🔥',
};

export const MODERATION_ACTIONS = {
  HIDE: 'hide',
  RESTORE: 'restore',
  ARCHIVE: 'archive',
  REPORT: 'report',
  RESOLVE_REPORT: 'resolve_report',
  ADD_NOTE: 'add_note',
};

export const POST_STATUS = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  ARCHIVED: 'archived',
};

export const FEED_FILTER_SCOPES = {
  ALL: 'all',
  MY_TEAM: 'team',
  SERVANTS: 'servants',
  ANNOUNCEMENTS: 'announcements',
  CHALLENGES: 'challenges',
  CELEBRATIONS: 'celebrations',
  HIGHLIGHTS: 'highlights',
};

// ─────────────────────────────────────────────
// Weekly Scripture Catalog
// ─────────────────────────────────────────────

export const WEEKLY_VERSES = [
  {
    id: 'col_3_23',
    reference: 'Colossians 3:23',
    verse: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
    theme: 'Serving with Heart on and off the Court',
    reflection: 'Every pass, cheer, station setup, and piece of encouragement is a direct act of worship. Bring your best energy for Christ this week.',
    sportsChallenge: '15-minute fundamentals drill: dedicate each clean repetition and assist to God.',
    memorizationText: 'Colossians 3:23 — Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
  },
  {
    id: '1cor_9_24_25',
    reference: '1 Corinthians 9:24-25',
    verse: 'Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.',
    theme: 'The Heavenly Prize & Disciplined Endurance',
    reflection: 'Worldly athletes train with intense discipline for a trophy that fades. We run our spiritual race with total focus for an eternal crown.',
    sportsChallenge: 'Conditioning challenge: sprint each line without giving in to fatigue, cheering on your teammate.',
    memorizationText: '1 Corinthians 9:24 — Run in such a way as to get the prize.',
  },
  {
    id: 'heb_12_1_2',
    reference: 'Hebrews 12:1-2',
    verse: 'Let us run with perseverance the race marked out for us, fixing our eyes on Jesus, the pioneer and perfecter of faith.',
    theme: 'Unshakable Perseverance',
    reflection: 'When legs feel heavy and momentum falters, true strength comes from fixing our eyes on Jesus, who walked the path ahead of us.',
    sportsChallenge: '30-second plank intervals between memorization lines with your servant huddle.',
    memorizationText: 'Hebrews 12:1-2 — Let us run with perseverance the race marked out for us, fixing our eyes on Jesus.',
  },
  {
    id: 'phil_4_13',
    reference: 'Philippians 4:13',
    verse: 'I can do all this through him who gives me strength.',
    theme: 'Strength When Depleted',
    reflection: 'Real sportsmanship is proven when energy drops in the final minutes. Christ supplies supernatural patience, poise, and vigor.',
    sportsChallenge: 'Pick up 3 teammates verbally during practice when their energy starts to dip.',
    memorizationText: 'Philippians 4:13 — I can do all this through him who gives me strength.',
  },
  {
    id: 'prov_27_17',
    reference: 'Proverbs 27:17',
    verse: 'As iron sharpens iron, so one person sharpens another.',
    theme: 'Iron Sharpens Iron: Team Fellowship',
    reflection: 'We do not compete to tear down our peers; we push each other with passion so both sides emerge stronger, wiser, and more faithful.',
    sportsChallenge: 'Pair with another servant for 1-on-1 drill feedback followed by a 2-minute prayer for each other.',
    memorizationText: 'Proverbs 27:17 — As iron sharpens iron, so one person sharpens another.',
  },
  {
    id: '1pet_4_10',
    reference: '1 Peter 4:10',
    verse: 'Each of you should use whatever gift you have received to serve others, as faithful stewards of God’s grace in its various forms.',
    theme: 'Stewardship of Athletic & Servant Gifts',
    reflection: 'Agility, quick thinking, strategic vision, encouraging words — every gift was given to serve the camp and radiate God’s grace.',
    sportsChallenge: 'Step up to help with water, cones, or bench cleanup before sitting down.',
    memorizationText: '1 Peter 4:10 — Each of you should use whatever gift you have received to serve others.',
  },
  {
    id: 'gal_6_9',
    reference: 'Galatians 6:9',
    verse: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.',
    theme: 'Relentless Faithfulness in Weekly Service',
    reflection: 'Faithfulness in small unseen tasks — greeting newcomers, carrying equipment, praying for campers — yields eternal fruit.',
    sportsChallenge: 'Send an encouraging "Thank a Servant" note to someone who quietly serves behind the scenes.',
    memorizationText: 'Galatians 6:9 — Let us not become weary in doing good, for at the proper time we will reap a harvest.',
  },
  {
    id: '2tim_4_7',
    reference: '2 Timothy 4:7',
    verse: 'I have fought the good fight, I have finished the race, I have kept the faith.',
    theme: 'Finishing Strong With Integrity',
    reflection: 'Start with humility, compete with honor, love unconditionally, and cross every finish line with nothing held back for Christ.',
    sportsChallenge: 'Give 100% effort in your drills and practice from the opening whistle to the final huddle.',
    memorizationText: '2 Timothy 4:7 — I have fought the good fight, I have finished the race, I have kept the faith.',
  },
];

// ─────────────────────────────────────────────
// Path Helpers
// ─────────────────────────────────────────────

export function cultureFeedCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/team_culture_feed`;
}

export function culturePostDocPath(communityId = DEFAULT_COMMUNITY_ID, postId) {
  let commId = communityId;
  let pId = postId;
  if (pId === undefined && commId) {
    pId = commId;
    commId = DEFAULT_COMMUNITY_ID;
  }
  return `vbt_communities/${commId || DEFAULT_COMMUNITY_ID}/team_culture_feed/${pId}`;
}

export function cultureAuditCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/team_culture_audit`;
}

export function verseSettingsDocPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/community_settings/verse_of_the_week`;
}

// ─────────────────────────────────────────────
// Permission & Role Checkers
// ─────────────────────────────────────────────

export const LEADERSHIP_ROLES = [
  'admin',
  'coordinator',
  'team_leader',
  'service_leader',
  'service_day_leader',
  'game_leader',
  'leader',
  'pastoral_care_leader',
  'pastoral_care',
  'sports_head',
];

export const PASTORAL_ROLES = [
  'admin',
  'coordinator',
  'pastoral_care_leader',
  'pastoral_care',
];

/**
 * Returns true if user has a leadership or moderation role
 * @param {Object|string} userOrRole
 * @returns {boolean}
 */
export function isUserLeader(userOrRole) {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'object' ? userOrRole.role : userOrRole;
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.some((r) => isUserLeader(r));
  }
  const normalized = String(role).toLowerCase().trim();
  return LEADERSHIP_ROLES.includes(normalized);
}

/**
 * Returns true if user has confidential pastoral privileges
 * @param {Object|string} userOrRole
 * @returns {boolean}
 */
export function isUserPastoral(userOrRole) {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'object' ? userOrRole.role : userOrRole;
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.some((r) => isUserPastoral(r));
  }
  const normalized = String(role).toLowerCase().trim();
  return PASTORAL_ROLES.includes(normalized);
}

/**
 * Helper to determine if currentUser is the author of the post
 * @param {Object} currentUser
 * @param {Object} post
 * @returns {boolean}
 */
export function isPostAuthor(currentUser, post) {
  if (!currentUser || !post) return false;
  const currentUserId = currentUser.id || currentUser.uid || currentUser.memberId;
  const authorId = post.author?.id || post.authorId || post.userId;
  return Boolean(currentUserId && authorId && String(currentUserId) === String(authorId));
}

/**
 * Evaluates whether currentUser is permitted to view a given post based on strict visibility scopes
 * @param {Object} post
 * @param {Object} currentUser
 * @returns {boolean}
 */
export function canUserViewPost(post, currentUser) {
  if (!post) return false;

  const isAuthor = isPostAuthor(currentUser, post);
  const isLeader = isUserLeader(currentUser);
  const isPastoral = isUserPastoral(currentUser);

  // 1. Moderation state checks
  const isHidden = post.status === POST_STATUS.HIDDEN || post.moderation?.hidden === true;
  if (isHidden) {
    // Hidden posts can ONLY be inspected by leaders/moderators or the author
    return isLeader || isAuthor;
  }

  // 2. Strict Visibility Scopes Check
  const scope = post.visibility || VISIBILITY_SCOPES.COMMUNITY;

  switch (scope) {
    case VISIBILITY_SCOPES.COMMUNITY:
      return true;

    case VISIBILITY_SCOPES.TEAM: {
      if (isAuthor || isLeader) return true;
      if (!currentUser) return false;
      const userTeam = currentUser.teamId || currentUser.team;
      const postTeam = post.teamId;
      if (userTeam && postTeam && String(userTeam) === String(postTeam)) return true;
      if (Array.isArray(currentUser.assignedTeams) && postTeam && currentUser.assignedTeams.includes(postTeam)) {
        return true;
      }
      return false;
    }

    case VISIBILITY_SCOPES.GROUP: {
      if (isAuthor || isLeader) return true;
      if (!currentUser) return false;
      const userGroup = currentUser.groupId || currentUser.servantGroup || currentUser.group;
      const postGroup = post.groupId;
      if (userGroup && postGroup && String(userGroup) === String(postGroup)) return true;
      if (Array.isArray(currentUser.assignedGroups) && postGroup && currentUser.assignedGroups.includes(postGroup)) {
        return true;
      }
      return false;
    }

    case VISIBILITY_SCOPES.LEADER_ONLY:
      return isAuthor || isLeader;

    case VISIBILITY_SCOPES.PASTORAL_PRIVATE:
      // CRITICAL: STRICT CONFIDENTIALITY GATEWAY
      // Never visible to general community, volunteers, or even team leaders who are not pastoral staff!
      return isAuthor || isPastoral;

    case VISIBILITY_SCOPES.PRIVATE: {
      if (isAuthor || isLeader) return true;
      if (!currentUser) return false;
      const currentUserId = currentUser.id || currentUser.uid || currentUser.memberId;
      if (post.targetMemberId && String(post.targetMemberId) === String(currentUserId)) {
        return true;
      }
      return false;
    }

    default:
      // Unknown scope: fallback to false for safety
      return false;
  }
}

// ─────────────────────────────────────────────
// CRITICAL Safeguards: Leakage Prevention
// ─────────────────────────────────────────────

/**
 * Sanitizes an individual post for public or AI context.
 * CRITICAL: Completely removes or nullifies any pastoral_private or private content!
 * @param {Object} post
 * @returns {Object|null}
 */
export function sanitizePostForAIOrPublic(post) {
  if (!post) return null;

  // STRICT GUARANTEE: Never leak pastoral_private or private posts
  if (
    post.visibility === VISIBILITY_SCOPES.PASTORAL_PRIVATE ||
    post.visibility === VISIBILITY_SCOPES.PRIVATE ||
    post.status === POST_STATUS.HIDDEN ||
    post.moderation?.hidden
  ) {
    return null;
  }

  const safe = { ...post };
  // Strip internal moderation reports and audit notes
  if (safe.moderation) {
    safe.moderation = {
      hidden: false,
      archived: Boolean(safe.moderation.archived),
      isFlagged: false,
    };
  }
  return safe;
}

/**
 * Sanitizes feed for export, ensuring non-pastoral users never receive pastoral_private posts.
 * Strips confidential moderator notes and reports unless the requesting user is a leader.
 * @param {Array<Object>} feed
 * @param {Object} currentUser
 * @returns {Array<Object>}
 */
export function sanitizeFeedForExport(feed, currentUser) {
  if (!Array.isArray(feed)) return [];

  const isPastoral = isUserPastoral(currentUser);
  const isLeader = isUserLeader(currentUser);
  const currentUserId = currentUser?.id || currentUser?.uid || currentUser?.memberId;

  return feed
    .filter((post) => {
      if (!post) return false;

      // Never expose pastoral_private to non-pastoral export
      if (post.visibility === VISIBILITY_SCOPES.PASTORAL_PRIVATE) {
        if (!isPastoral && (!currentUserId || post.author?.id !== currentUserId)) {
          return false;
        }
      }

      // Never expose private to unrelated members
      if (post.visibility === VISIBILITY_SCOPES.PRIVATE) {
        const isAuth = isPostAuthor(currentUser, post);
        const isTarget = post.targetMemberId && String(post.targetMemberId) === String(currentUserId);
        if (!isAuth && !isTarget && !isLeader) {
          return false;
        }
      }

      return true;
    })
    .map((post) => {
      const copy = { ...post };
      if (!isLeader && copy.moderation) {
        const safeMod = { ...copy.moderation };
        delete safeMod.reports;
        delete safeMod.moderatorNotes;
        delete safeMod.auditTrail;
        copy.moderation = safeMod;
      }
      return copy;
    });
}

/**
 * Sanitizes feed strictly for AI prompt injection / context.
 * CRITICAL: Strips ALL pastoral_private and ALL private posts without exception,
 * regardless of the user requesting the AI context!
 * @param {Array<Object>} feed
 * @returns {Array<Object>}
 */
export function sanitizeFeedForAI(feed) {
  if (!Array.isArray(feed)) return [];

  return feed
    .filter((post) => {
      if (!post) return false;
      if (post.visibility === VISIBILITY_SCOPES.PASTORAL_PRIVATE) return false;
      if (post.visibility === VISIBILITY_SCOPES.PRIVATE) return false;
      if (post.status === POST_STATUS.HIDDEN || post.moderation?.hidden) return false;
      return true;
    })
    .map((post) => sanitizePostForAIOrPublic(post))
    .filter(Boolean);
}

// ─────────────────────────────────────────────
// Service Core Functions
// ─────────────────────────────────────────────

/**
 * Normalizes communityId and data parameters for flexible invocation
 */
function normalizeArgs(communityId, data) {
  if (typeof communityId === 'object' && communityId !== null && data === undefined) {
    return {
      effectiveCommunityId: DEFAULT_COMMUNITY_ID,
      effectiveData: communityId,
    };
  }
  return {
    effectiveCommunityId: communityId || DEFAULT_COMMUNITY_ID,
    effectiveData: data || {},
  };
}

/**
 * Create a new community post
 * @param {string|Object} communityId
 * @param {Object} [postData]
 * @param {Object} [authorUser]
 * @returns {Promise<Object>}
 */
export async function createCommunityPost(communityId, postData, authorUser) {
  const { effectiveCommunityId, effectiveData } = normalizeArgs(communityId, postData);
  const author = authorUser || effectiveData.author || {};

  const postId =
    effectiveData.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const nowIso = new Date().toISOString();

  // Validate visibility
  const visibility = effectiveData.visibility || VISIBILITY_SCOPES.COMMUNITY;
  const validScopes = Object.values(VISIBILITY_SCOPES);
  const sanitizedVisibility = validScopes.includes(visibility)
    ? visibility
    : VISIBILITY_SCOPES.COMMUNITY;

  const authorId = author.id || author.uid || author.memberId || 'unknown_author';
  const authorName = author.name || author.displayName || 'Community Member';
  const authorRole = author.role || VBT_ROLES.MEMBER;
  const authorAvatar = author.avatar || author.photoURL || '';

  const initialReactions = {
    [REACTION_TYPES.HEART]: [],
    [REACTION_TYPES.AMEN]: [],
    [REACTION_TYPES.CLAP]: [],
    [REACTION_TYPES.PRAY]: [],
    [REACTION_TYPES.FIRE]: [],
  };

  const initialReactionCounts = {
    [REACTION_TYPES.HEART]: 0,
    [REACTION_TYPES.AMEN]: 0,
    [REACTION_TYPES.CLAP]: 0,
    [REACTION_TYPES.PRAY]: 0,
    [REACTION_TYPES.FIRE]: 0,
  };

  const newPost = {
    id: postId,
    communityId: effectiveCommunityId,
    type: effectiveData.type || POST_TYPES.GENERAL,
    title: effectiveData.title || '',
    content: effectiveData.content || '',
    author: {
      id: authorId,
      name: authorName,
      role: authorRole,
      avatar: authorAvatar,
      teamId: author.teamId || effectiveData.teamId || null,
      teamName: author.teamName || effectiveData.teamName || null,
      isAnonymous: Boolean(effectiveData.isAnonymous),
    },
    visibility: sanitizedVisibility,
    teamId: effectiveData.teamId || null,
    teamName: effectiveData.teamName || null,
    groupId: effectiveData.groupId || null,
    groupName: effectiveData.groupName || null,
    targetMemberId: effectiveData.targetMemberId || null,
    targetMemberName: effectiveData.targetMemberName || null,
    targetMemberRole: effectiveData.targetMemberRole || null,
    badge: effectiveData.badge || null,
    media: Array.isArray(effectiveData.media) ? effectiveData.media : [],
    challenge: effectiveData.challenge || null,
    milestone: effectiveData.milestone || null,
    verse: effectiveData.verse || null,
    reactions: effectiveData.reactions || initialReactions,
    reactionCounts: effectiveData.reactionCounts || initialReactionCounts,
    status: effectiveData.status || POST_STATUS.ACTIVE,
    pinned: Boolean(effectiveData.pinned),
    moderation: {
      hidden: false,
      archived: false,
      isFlagged: false,
      reportCount: 0,
      reports: [],
      moderatorNotes: [],
      auditTrail: [
        {
          action: 'post_created',
          performedBy: authorName,
          role: authorRole,
          timestamp: nowIso,
        },
      ],
      ...(effectiveData.moderation || {}),
    },
    createdAt: effectiveData.createdAt || nowIso,
    updatedAt: nowIso,
  };

  const docRef = doc(db, culturePostDocPath(effectiveCommunityId, postId));
  await setDoc(docRef, newPost);

  return newPost;
}

/**
 * Retrieve filtered feed strictly adhering to currentUser's role, team, and group memberships
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} [currentUser=null]
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export async function getFilteredFeed(
  communityId = DEFAULT_COMMUNITY_ID,
  currentUser = null,
  options = {}
) {
  const effectiveCommunityId = communityId || DEFAULT_COMMUNITY_ID;
  const colRef = collection(db, cultureFeedCollectionPath(effectiveCommunityId));
  const snapshot = await getDocs(colRef);

  const posts = [];
  snapshot.forEach((d) => {
    const data = d.data();
    if (data) {
      posts.push({ id: d.id, ...data });
    }
  });

  const {
    scope = FEED_FILTER_SCOPES.ALL,
    teamId,
    groupId,
    type,
    limit,
    includeArchived = false,
    includeHidden = false,
  } = options;

  const isLeader = isUserLeader(currentUser);
  const isPastoral = isUserPastoral(currentUser);

  const filtered = posts.filter((post) => {
    // 1. Security & Visibility Gate
    if (!canUserViewPost(post, currentUser)) {
      return false;
    }

    // 2. Hidden filter
    const isHidden = post.status === POST_STATUS.HIDDEN || post.moderation?.hidden;
    if (isHidden && !includeHidden) {
      // Even if user could view hidden post (as leader), skip unless includeHidden is true
      if (!isPostAuthor(currentUser, post)) {
        return false;
      }
    }

    // 3. Archived filter
    const isArchived = post.status === POST_STATUS.ARCHIVED || post.moderation?.archived;
    if (isArchived && !includeArchived) {
      return false;
    }

    // 4. Specific type filter
    if (type && post.type !== type) {
      return false;
    }

    // 5. Explicit team filter
    if (teamId && post.teamId !== teamId) {
      return false;
    }

    // 6. Explicit group filter
    if (groupId && post.groupId !== groupId) {
      return false;
    }

    // 7. Scope category tabs
    if (scope === FEED_FILTER_SCOPES.MY_TEAM) {
      const userTeam = currentUser?.teamId || currentUser?.team;
      const matchesTeam =
        post.visibility === VISIBILITY_SCOPES.TEAM ||
        (userTeam && post.teamId === userTeam) ||
        (Array.isArray(currentUser?.assignedTeams) && currentUser.assignedTeams.includes(post.teamId));
      if (!matchesTeam) return false;
    } else if (scope === FEED_FILTER_SCOPES.SERVANTS) {
      if (post.type !== POST_TYPES.THANK_SERVANT && post.visibility !== VISIBILITY_SCOPES.GROUP) {
        return false;
      }
    } else if (scope === FEED_FILTER_SCOPES.ANNOUNCEMENTS) {
      if (post.type !== POST_TYPES.ANNOUNCEMENT) {
        return false;
      }
    } else if (scope === FEED_FILTER_SCOPES.CHALLENGES) {
      if (post.type !== POST_TYPES.CHALLENGE) {
        return false;
      }
    } else if (scope === FEED_FILTER_SCOPES.CELEBRATIONS) {
      if (post.type !== POST_TYPES.MILESTONE) {
        return false;
      }
    } else if (scope === FEED_FILTER_SCOPES.HIGHLIGHTS) {
      if (post.type !== POST_TYPES.HIGHLIGHT) {
        return false;
      }
    }

    // CRITICAL: Redundant safety verification against pastoral_private leakage
    if (post.visibility === VISIBILITY_SCOPES.PASTORAL_PRIVATE) {
      const isAuth = isPostAuthor(currentUser, post);
      if (!isPastoral && !isAuth) {
        return false;
      }
    }

    return true;
  });

  // Sort: Pinned first, then newest createdAt descending
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  if (typeof limit === 'number' && limit > 0) {
    return filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Add or toggle a reaction on a community post
 * @param {string} communityId
 * @param {string} postId
 * @param {string} memberId
 * @param {string} reactionType
 * @returns {Promise<Object>}
 */
export async function addPostReaction(communityId, postId, memberId, reactionType) {
  let effectiveCommunityId = communityId;
  let effectivePostId = postId;
  let effectiveMemberId = memberId;
  let effectiveReactionType = reactionType;

  // Handle call signatures where communityId is omitted: addPostReaction(postId, memberId, reactionType)
  if (
    arguments.length === 3 &&
    Object.values(REACTION_TYPES).includes(memberId) &&
    typeof communityId === 'string'
  ) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectivePostId = communityId;
    effectiveMemberId = postId;
    effectiveReactionType = memberId;
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectivePostId) {
    throw new Error('Post ID is required to add reaction');
  }
  if (!effectiveMemberId) {
    throw new Error('Member ID is required to add reaction');
  }

  const validReaction = Object.values(REACTION_TYPES).includes(effectiveReactionType)
    ? effectiveReactionType
    : REACTION_TYPES.HEART;

  const docRef = doc(db, culturePostDocPath(effectiveCommunityId, effectivePostId));
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Post not found: ${effectivePostId}`);
  }

  const post = docSnap.data();
  const reactions = {
    [REACTION_TYPES.HEART]: [],
    [REACTION_TYPES.AMEN]: [],
    [REACTION_TYPES.CLAP]: [],
    [REACTION_TYPES.PRAY]: [],
    [REACTION_TYPES.FIRE]: [],
    ...(post.reactions || {}),
  };

  const currentList = Array.isArray(reactions[validReaction]) ? reactions[validReaction] : [];
  let userReacted = false;

  if (currentList.includes(effectiveMemberId)) {
    // Toggle off: remove reaction
    reactions[validReaction] = currentList.filter((id) => id !== effectiveMemberId);
    userReacted = false;
  } else {
    // Toggle on: add reaction
    reactions[validReaction] = [...currentList, effectiveMemberId];
    userReacted = true;
  }

  // Recalculate reaction counts
  const reactionCounts = {};
  for (const [key, arr] of Object.entries(reactions)) {
    reactionCounts[key] = Array.isArray(arr) ? arr.length : 0;
  }

  const nowIso = new Date().toISOString();
  await updateDoc(docRef, {
    reactions,
    reactionCounts,
    updatedAt: nowIso,
  });

  return {
    success: true,
    postId: effectivePostId,
    reactionType: validReaction,
    userReacted,
    reactions,
    reactionCounts,
  };
}

/**
 * Send an encouragement note ("Thank a Servant")
 * @param {string} communityId
 * @param {Object} senderMember
 * @param {string} recipientMemberId
 * @param {string} message
 * @param {string} [visibility=VISIBILITY_SCOPES.COMMUNITY]
 * @param {Object} [options={}]
 * @returns {Promise<Object>}
 */
export async function sendThankServantNote(
  communityId,
  senderMember,
  recipientMemberId,
  message,
  visibility = VISIBILITY_SCOPES.COMMUNITY,
  options = {}
) {
  let effectiveCommunityId = communityId;
  let effectiveSender = senderMember;
  let effectiveRecipientId = recipientMemberId;
  let effectiveMessage = message;
  let effectiveVisibility = visibility;
  let effectiveOptions = options;

  // Handle omitted communityId
  if (
    typeof communityId === 'object' &&
    typeof senderMember === 'string' &&
    typeof recipientMemberId === 'string'
  ) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectiveSender = communityId;
    effectiveRecipientId = senderMember;
    effectiveMessage = recipientMemberId;
    effectiveVisibility = message || VISIBILITY_SCOPES.COMMUNITY;
    effectiveOptions = visibility || {};
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectiveSender) {
    throw new Error('Sender member is required to send thank you note');
  }
  if (!effectiveRecipientId) {
    throw new Error('Recipient member ID is required to send thank you note');
  }
  if (!effectiveMessage || !effectiveMessage.trim()) {
    throw new Error('Message content is required to send thank you note');
  }

  const recipientName = effectiveOptions.recipientName || 'Servant';

  const postData = {
    type: POST_TYPES.THANK_SERVANT,
    title: effectiveOptions.title || `Thank You, ${recipientName}!`,
    content: effectiveMessage.trim(),
    visibility: effectiveVisibility || VISIBILITY_SCOPES.COMMUNITY,
    targetMemberId: effectiveRecipientId,
    targetMemberName: recipientName,
    targetMemberRole: effectiveOptions.recipientRole || VBT_ROLES.ACTIVE_SERVANT,
    badge: '🙏❤️',
    teamId: effectiveOptions.teamId || effectiveSender.teamId || null,
    teamName: effectiveOptions.teamName || effectiveSender.teamName || null,
    groupId: effectiveOptions.groupId || effectiveSender.groupId || null,
  };

  return createCommunityPost(effectiveCommunityId, postData, effectiveSender);
}

/**
 * Moderate a post (hide, restore, archive, report, resolve_report, add_note)
 * @param {string} communityId
 * @param {string} postId
 * @param {string} action
 * @param {Object} moderatorUser
 * @param {string} [reason='']
 * @returns {Promise<Object>}
 */
export async function moderatePost(communityId, postId, action, moderatorUser, reason = '') {
  let effectiveCommunityId = communityId;
  let effectivePostId = postId;
  let effectiveAction = action;
  let effectiveModerator = moderatorUser;
  let effectiveReason = reason;

  if (
    typeof communityId === 'string' &&
    Object.values(MODERATION_ACTIONS).includes(postId)
  ) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
    effectivePostId = communityId;
    effectiveAction = postId;
    effectiveModerator = action;
    effectiveReason = moderatorUser || '';
  } else if (!effectiveCommunityId) {
    effectiveCommunityId = DEFAULT_COMMUNITY_ID;
  }

  if (!effectivePostId) {
    throw new Error('Post ID is required for moderation');
  }
  if (!effectiveAction) {
    throw new Error('Action is required for moderation');
  }

  // Authorization validation
  const isLeader = isUserLeader(effectiveModerator);
  if (effectiveAction !== MODERATION_ACTIONS.REPORT && !isLeader) {
    throw new Error(`Unauthorized: only leaders and moderators can perform action "${effectiveAction}"`);
  }

  const docRef = doc(db, culturePostDocPath(effectiveCommunityId, effectivePostId));
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Post not found: ${effectivePostId}`);
  }

  const post = docSnap.data();
  const moderation = {
    hidden: false,
    archived: false,
    isFlagged: false,
    reportCount: 0,
    reports: [],
    moderatorNotes: [],
    auditTrail: [],
    ...(post.moderation || {}),
  };

  let newStatus = post.status || POST_STATUS.ACTIVE;
  const nowIso = new Date().toISOString();
  const actorName = effectiveModerator?.name || effectiveModerator?.displayName || 'Moderator';
  const actorRole = effectiveModerator?.role || 'leader';

  switch (effectiveAction) {
    case MODERATION_ACTIONS.HIDE:
      moderation.hidden = true;
      newStatus = POST_STATUS.HIDDEN;
      break;

    case MODERATION_ACTIONS.RESTORE:
      moderation.hidden = false;
      newStatus = POST_STATUS.ACTIVE;
      break;

    case MODERATION_ACTIONS.ARCHIVE:
      moderation.archived = true;
      newStatus = POST_STATUS.ARCHIVED;
      break;

    case MODERATION_ACTIONS.REPORT:
      moderation.isFlagged = true;
      moderation.reportCount = (moderation.reportCount || 0) + 1;
      moderation.reports = [
        ...(moderation.reports || []),
        {
          reporterId: effectiveModerator?.id || effectiveModerator?.uid || 'anon_reporter',
          reporterName: actorName,
          reason: effectiveReason || 'Reported for review',
          timestamp: nowIso,
        },
      ];
      break;

    case MODERATION_ACTIONS.RESOLVE_REPORT:
      moderation.isFlagged = false;
      break;

    case MODERATION_ACTIONS.ADD_NOTE:
      moderation.moderatorNotes = [
        ...(moderation.moderatorNotes || []),
        {
          moderatorId: effectiveModerator?.id || effectiveModerator?.uid,
          moderatorName: actorName,
          note: effectiveReason,
          timestamp: nowIso,
        },
      ];
      break;

    default:
      throw new Error(`Invalid moderation action: ${effectiveAction}`);
  }

  // Audit trail entry
  const auditEntry = {
    action: `post_${effectiveAction}`,
    performedBy: actorName,
    role: actorRole,
    reason: effectiveReason || '',
    timestamp: nowIso,
  };
  moderation.auditTrail = [...(moderation.auditTrail || []), auditEntry];

  await updateDoc(docRef, {
    moderation,
    status: newStatus,
    updatedAt: nowIso,
  });

  return {
    ...post,
    moderation,
    status: newStatus,
    updatedAt: nowIso,
  };
}

/**
 * Get verse or reflection of the week
 * Computes deterministic rotation based on week number, with optional Firestore override
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Object>}
 */
export async function getVerseOfTheWeek(communityId = DEFAULT_COMMUNITY_ID) {
  const effectiveCommunityId = communityId || DEFAULT_COMMUNITY_ID;

  // Try fetching custom active verse from Firestore
  try {
    const docRef = doc(db, verseSettingsDocPath(effectiveCommunityId));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.active !== false && data.verse) {
        return {
          ...data,
          isCustom: true,
          communityId: effectiveCommunityId,
        };
      }
    }
  } catch (err) {
    // Non-blocking fallback to catalog
  }

  // Compute catalog rotation by week of year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  const index = Math.abs(weekNumber) % WEEKLY_VERSES.length;
  const baseVerse = WEEKLY_VERSES[index];

  return {
    ...baseVerse,
    weekNumber,
    communityId: effectiveCommunityId,
    generatedAt: now.toISOString(),
  };
}

/**
 * Sets a custom verse of the week (Leader privilege)
 * @param {string} communityId
 * @param {Object} verseData
 * @param {Object} authorUser
 * @returns {Promise<Object>}
 */
export async function setVerseOfTheWeek(communityId, verseData, authorUser) {
  const { effectiveCommunityId, effectiveData } = normalizeArgs(communityId, verseData);

  if (!isUserLeader(authorUser)) {
    throw new Error('Unauthorized: only leaders can set the Verse of the Week');
  }

  const docRef = doc(db, verseSettingsDocPath(effectiveCommunityId));
  const record = {
    ...effectiveData,
    active: true,
    setBy: authorUser?.name || authorUser?.id,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, record, { merge: true });
  return record;
}

/**
 * Report a post
 * @param {string} communityId
 * @param {string} postId
 * @param {Object} reporterUser
 * @param {string} reason
 * @returns {Promise<Object>}
 */
export async function reportPost(communityId, postId, reporterUser, reason) {
  return moderatePost(communityId, postId, MODERATION_ACTIONS.REPORT, reporterUser, reason);
}

/**
 * Subscribe to the real-time filtered feed
 * @param {string} communityId
 * @param {Object} currentUser
 * @param {Function} onNext
 * @param {Object} [options={}]
 * @returns {Function} Unsubscribe function
 */
export function subscribeToFilteredFeed(communityId, currentUser, onNext, options = {}) {
  const effectiveCommunityId = communityId || DEFAULT_COMMUNITY_ID;
  const colRef = collection(db, cultureFeedCollectionPath(effectiveCommunityId));

  return onSnapshot(colRef, (snapshot) => {
    const rawPosts = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data) {
        rawPosts.push({ id: d.id, ...data });
      }
    });

    const isLeader = isUserLeader(currentUser);
    const isPastoral = isUserPastoral(currentUser);
    const {
      scope = FEED_FILTER_SCOPES.ALL,
      teamId,
      groupId,
      type,
      limit,
      includeArchived = false,
      includeHidden = false,
    } = options;

    const filtered = rawPosts.filter((post) => {
      if (!canUserViewPost(post, currentUser)) return false;

      const isHidden = post.status === POST_STATUS.HIDDEN || post.moderation?.hidden;
      if (isHidden && !includeHidden && !isPostAuthor(currentUser, post)) {
        return false;
      }

      const isArchived = post.status === POST_STATUS.ARCHIVED || post.moderation?.archived;
      if (isArchived && !includeArchived) {
        return false;
      }

      if (type && post.type !== type) return false;
      if (teamId && post.teamId !== teamId) return false;
      if (groupId && post.groupId !== groupId) return false;

      if (scope === FEED_FILTER_SCOPES.MY_TEAM) {
        const userTeam = currentUser?.teamId || currentUser?.team;
        const matchesTeam =
          post.visibility === VISIBILITY_SCOPES.TEAM ||
          (userTeam && post.teamId === userTeam) ||
          (Array.isArray(currentUser?.assignedTeams) && currentUser.assignedTeams.includes(post.teamId));
        if (!matchesTeam) return false;
      } else if (scope === FEED_FILTER_SCOPES.SERVANTS) {
        if (post.type !== POST_TYPES.THANK_SERVANT && post.visibility !== VISIBILITY_SCOPES.GROUP) {
          return false;
        }
      } else if (scope === FEED_FILTER_SCOPES.ANNOUNCEMENTS) {
        if (post.type !== POST_TYPES.ANNOUNCEMENT) return false;
      } else if (scope === FEED_FILTER_SCOPES.CHALLENGES) {
        if (post.type !== POST_TYPES.CHALLENGE) return false;
      } else if (scope === FEED_FILTER_SCOPES.CELEBRATIONS) {
        if (post.type !== POST_TYPES.MILESTONE) return false;
      }

      // CRITICAL: Redundant safety verification against pastoral_private leakage
      if (post.visibility === VISIBILITY_SCOPES.PASTORAL_PRIVATE) {
        if (!isPastoral && !isPostAuthor(currentUser, post)) {
          return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const finalResult = typeof limit === 'number' && limit > 0 ? filtered.slice(0, limit) : filtered;
    onNext(finalResult);
  });
}

/**
 * Retrieve team-specific culture feed
 * @param {string} communityId
 * @param {string} teamId
 * @param {Object} currentUser
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export async function getTeamFeed(communityId, teamId, currentUser, options = {}) {
  return getFilteredFeed(communityId, currentUser, {
    ...options,
    scope: FEED_FILTER_SCOPES.MY_TEAM,
    teamId,
  });
}

/**
 * Retrieve servant group-specific culture feed
 * @param {string} communityId
 * @param {string} groupId
 * @param {Object} currentUser
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export async function getGroupFeed(communityId, groupId, currentUser, options = {}) {
  return getFilteredFeed(communityId, currentUser, {
    ...options,
    groupId,
  });
}

/**
 * Create a team challenge (e.g. sports drill or scripture memorization)
 * @param {string} communityId
 * @param {Object} challengeData
 * @param {Object} authorUser
 * @returns {Promise<Object>}
 */
export async function createTeamChallenge(communityId, challengeData, authorUser) {
  const { effectiveCommunityId, effectiveData } = normalizeArgs(communityId, challengeData);

  const postData = {
    type: POST_TYPES.CHALLENGE,
    title: effectiveData.title || 'Weekly Sports & Scripture Challenge',
    content: effectiveData.description || effectiveData.content || '',
    visibility: effectiveData.visibility || VISIBILITY_SCOPES.COMMUNITY,
    teamId: effectiveData.teamId || null,
    badge: '🏆🔥',
    challenge: {
      category: effectiveData.category || 'drill', // 'drill' | 'scripture' | 'fitness'
      targetGoal: effectiveData.targetGoal || 'Complete daily drill',
      deadline: effectiveData.deadline || null,
      rewardPoints: effectiveData.rewardPoints || 50,
      participants: [],
      completions: [],
    },
  };

  return createCommunityPost(effectiveCommunityId, postData, authorUser);
}

/**
 * Join or participate in a challenge
 * @param {string} communityId
 * @param {string} postId
 * @param {Object} memberUser
 * @returns {Promise<Object>}
 */
export async function joinChallenge(communityId, postId, memberUser) {
  const effectiveCommunityId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, culturePostDocPath(effectiveCommunityId, postId));
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Challenge post not found: ${postId}`);
  }

  const post = docSnap.data();
  if (post.type !== POST_TYPES.CHALLENGE || !post.challenge) {
    throw new Error('Target post is not a challenge');
  }

  const memberId = memberUser?.id || memberUser?.uid;
  const participants = Array.isArray(post.challenge.participants)
    ? [...post.challenge.participants]
    : [];

  if (!participants.includes(memberId)) {
    participants.push(memberId);
  }

  const challenge = {
    ...post.challenge,
    participants,
  };

  await updateDoc(docRef, {
    challenge,
    updatedAt: new Date().toISOString(),
  });

  return { ...post, challenge };
}

/**
 * Celebrate a milestone (e.g. birthday, anniversary, service milestone)
 * @param {string} communityId
 * @param {Object} celebrationData
 * @param {Object} authorUser
 * @returns {Promise<Object>}
 */
export async function celebrateMilestone(communityId, celebrationData, authorUser) {
  const { effectiveCommunityId, effectiveData } = normalizeArgs(communityId, celebrationData);

  const postData = {
    type: POST_TYPES.MILESTONE,
    title: effectiveData.title || `Celebrating ${effectiveData.targetMemberName || 'a Teammate'}!`,
    content: effectiveData.message || effectiveData.content || '',
    visibility: effectiveData.visibility || VISIBILITY_SCOPES.COMMUNITY,
    targetMemberId: effectiveData.targetMemberId || null,
    targetMemberName: effectiveData.targetMemberName || 'Teammate',
    badge: effectiveData.badge || '🎂🎉',
    milestone: {
      category: effectiveData.category || 'birthday', // 'birthday' | 'anniversary' | 'serving_streak' | 'mvp'
      achievement: effectiveData.achievement || 'Happy Birthday!',
      streakCount: effectiveData.streakCount || null,
    },
  };

  return createCommunityPost(effectiveCommunityId, postData, authorUser);
}

/**
 * Permanently delete a post (Author or Leader privilege)
 * @param {string} communityId
 * @param {string} postId
 * @param {Object} currentUser
 * @returns {Promise<boolean>}
 */
export async function deletePost(communityId, postId, currentUser) {
  const effectiveCommunityId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, culturePostDocPath(effectiveCommunityId, postId));
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return true; // Already gone
  }

  const post = docSnap.data();
  const isAuthor = isPostAuthor(currentUser, post);
  const isLeader = isUserLeader(currentUser);

  if (!isAuthor && !isLeader) {
    throw new Error('Unauthorized: only author or leaders can delete this post');
  }

  await deleteDoc(docRef);
  return true;
}
