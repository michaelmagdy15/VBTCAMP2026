/**
 * servantPassportService.js
 * Comprehensive service for VBT Servant Passports and 7-Tier Growth Pathways.
 *
 * Core Principles:
 * - 7-Tier Progression Pathway:
 *   Interested -> Volunteer -> Trained servant -> Active servant -> Team leader -> Coordinator -> Mentor
 * - Private servant passport for each community member.
 * - Access boundaries: Self and authorized leaders within their scope can view.
 * - Tier promotions require explicit leader approval (not auto-promoted).
 * - Private feedback is never exposed publicly.
 * - Warm, uplifting, biblically encouraging language ("growth area", "next blessing step", "fruitful season").
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export { DEFAULT_COMMUNITY_ID };

// ─────────────────────────────────────────────────────────────
// 7-Tier Progression Pathway Definition
// ─────────────────────────────────────────────────────────────
export const PASSPORT_TIERS = {
  INTERESTED: {
    key: 'INTERESTED',
    id: 'interested',
    level: 1,
    title: 'Interested',
    label: 'Interested',
    badgeIcon: '🌱',
    blessingTitle: 'Seed of Desire',
    tagline: 'Opening the heart to camp service',
    description: 'Exploring how God may call you to serve in the community and youth sports ministry.',
    requirementsSummary: 'Express interest and register community profile',
    minActivitiesServed: 0,
    minTrainingsCompleted: 0,
    minSeasonsServed: 0,
    minEndorsedSkills: 0,
  },
  VOLUNTEER: {
    key: 'VOLUNTEER',
    id: 'volunteer',
    level: 2,
    title: 'Volunteer',
    label: 'Volunteer',
    badgeIcon: '🤝',
    blessingTitle: 'Welcoming Hands',
    tagline: 'Joyful hospitality and table support',
    description: 'Stepping forward to assist in registration, hydration, equipment distribution, and warm welcoming.',
    requirementsSummary: 'Serve in at least 1 camp activity & complete orientation',
    minActivitiesServed: 1,
    minTrainingsCompleted: 0,
    minSeasonsServed: 1,
    minEndorsedSkills: 0,
  },
  TRAINED_SERVANT: {
    key: 'TRAINED_SERVANT',
    id: 'trained_servant',
    level: 3,
    title: 'Trained servant',
    label: 'Trained Servant',
    badgeIcon: '📜',
    blessingTitle: 'Equipped Vessel',
    tagline: 'Grounded in youth safety and game wisdom',
    description: 'Equipped with child safety guidelines, two-leader rule, and foundational ministry standards.',
    requirementsSummary: 'Complete Child Safety + 1 core training module & serve in 2+ activities',
    minActivitiesServed: 2,
    minTrainingsCompleted: 2,
    minSeasonsServed: 1,
    minEndorsedSkills: 1,
  },
  ACTIVE_SERVANT: {
    key: 'ACTIVE_SERVANT',
    id: 'active_servant',
    level: 4,
    title: 'Active servant',
    label: 'Active Servant',
    badgeIcon: '⭐',
    blessingTitle: 'Faithful Steward',
    tagline: 'Dependable service across courts and stations',
    description: 'Consistently serving in refereeing, logistics, prayer stations, and court-side encouragement.',
    requirementsSummary: 'Serve in 4+ activities across a season with 2 endorsed skills',
    minActivitiesServed: 4,
    minTrainingsCompleted: 3,
    minSeasonsServed: 1,
    minEndorsedSkills: 2,
  },
  TEAM_LEADER: {
    key: 'TEAM_LEADER',
    id: 'team_leader',
    level: 5,
    title: 'Team leader',
    label: 'Team Leader',
    badgeIcon: '🛡️',
    blessingTitle: 'Shepherd & Captain',
    tagline: 'Guiding servants, huddles, and match integrity',
    description: 'Shepherding a team of youth and newer servants, leading pre-game devotions, and defusing disputes.',
    requirementsSummary: 'Serve in 8+ activities, 2+ seasons, 5 completed trainings, approved by coordinator',
    minActivitiesServed: 8,
    minTrainingsCompleted: 5,
    minSeasonsServed: 2,
    minEndorsedSkills: 3,
  },
  COORDINATOR: {
    key: 'COORDINATOR',
    id: 'coordinator',
    level: 6,
    title: 'Coordinator',
    label: 'Coordinator',
    badgeIcon: '👑',
    blessingTitle: 'Pillar of Ministry',
    tagline: 'Camp-wide logistical and spiritual stewardship',
    description: 'Overseeing camp operations, tournament flow, safeguarding oversight, and developing servant pathways.',
    requirementsSummary: 'Coordinate multiple tournaments, 15+ activities, 3+ seasons, approved by leadership',
    minActivitiesServed: 15,
    minTrainingsCompleted: 7,
    minSeasonsServed: 3,
    minEndorsedSkills: 4,
  },
  MENTOR: {
    key: 'MENTOR',
    id: 'mentor',
    level: 7,
    title: 'Mentor',
    label: 'Mentor',
    badgeIcon: '🕊️',
    blessingTitle: 'Spiritual Guide & Father/Mother in Faith',
    tagline: 'Nurturing generations of servant leaders',
    description: 'Investing in upcoming coordinators, imparting spiritual discernment, and covering camp leaders with prayer.',
    requirementsSummary: '25+ activities, 4+ fruitful seasons, spiritual wisdom, community leader affirmation',
    minActivitiesServed: 25,
    minTrainingsCompleted: 8,
    minSeasonsServed: 4,
    minEndorsedSkills: 5,
  },
};

/**
 * Ordered list of tier identifiers from level 1 to 7
 */
export const PASSPORT_TIER_ORDER = [
  'interested',
  'volunteer',
  'trained_servant',
  'active_servant',
  'team_leader',
  'coordinator',
  'mentor',
];

/**
 * Standard servant roles recognized in the VBT camp ecosystem
 */
export const STANDARD_SERVANT_ROLES = [
  'Referee',
  'Logistics',
  'Prayer Station',
  'Sound & AV',
  'Welcoming & Hospitality',
  'First Aid',
  'Media & Photography',
  'Team Shepherd',
  'Tournament Desk',
];

// ─────────────────────────────────────────────────────────────
// Path Helpers
// ─────────────────────────────────────────────────────────────
export function passportDocPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/servant_passports/${memberId}`;
}

export function passportEncouragementsCollectionPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/servant_passports/${memberId}/encouragements`;
}

export function passportPromotionRequestsCollectionPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/servant_passports/${memberId}/promotion_requests`;
}

// ─────────────────────────────────────────────────────────────
// Tier Utility Helpers
// ─────────────────────────────────────────────────────────────
export function normalizeTierId(tierId) {
  if (!tierId) return 'interested';
  const clean = String(tierId).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (clean === 'trained' || clean === 'trainedservant') return 'trained_servant';
  if (clean === 'active' || clean === 'activeservant') return 'active_servant';
  if (clean === 'teamleader' || clean === 'leader') return 'team_leader';
  return clean;
}

export function getTierById(tierId) {
  const normalized = normalizeTierId(tierId);
  const found = Object.values(PASSPORT_TIERS).find((t) => t.id === normalized);
  return found || PASSPORT_TIERS.INTERESTED;
}

export function getTierByLevel(level) {
  const lvl = parseInt(level, 10) || 1;
  const found = Object.values(PASSPORT_TIERS).find((t) => t.level === lvl);
  return found || (lvl >= 7 ? PASSPORT_TIERS.MENTOR : PASSPORT_TIERS.INTERESTED);
}

export function getNextTier(currentTierId) {
  const current = getTierById(currentTierId);
  const nextLvl = current.level + 1;
  if (nextLvl > 7) return null;
  return getTierByLevel(nextLvl);
}

export function getPreviousTier(currentTierId) {
  const current = getTierById(currentTierId);
  const prevLvl = current.level - 1;
  if (prevLvl < 1) return null;
  return getTierByLevel(prevLvl);
}

// ─────────────────────────────────────────────────────────────
// Access Controls & Boundary Enforcement
// ─────────────────────────────────────────────────────────────

/**
 * Checks whether requestingUser is permitted to view the private servant passport of memberId.
 * Rules:
 * - Members can view their own private passport.
 * - Leaders can view servant passports only within their authorized scope.
 * - Public/anonymous users CANNOT view private servant passports.
 */
export function canAccessPassport(requestingUser, memberId, memberData = null) {
  if (!requestingUser || !memberId) return false;

  const reqId = requestingUser.id || requestingUser.memberId || requestingUser.uid;
  if (reqId && String(reqId) === String(memberId)) {
    return true; // Self view
  }

  const rawRole = requestingUser.role || requestingUser.permissionLevel;
  if (!rawRole) return false;

  const role = String(rawRole).toLowerCase();

  // Community-wide leadership roles
  const superRoles = [
    'admin',
    'coordinator',
    'pastoral_care_leader',
    'service_leader',
    'service_day_leader',
  ];
  if (superRoles.includes(role) || requestingUser.isAdmin === true) {
    return true;
  }

  // Scoped leadership roles (Team Leader, Game Leader, Court Captain)
  const scopedRoles = ['team_leader', 'leader', 'game_leader'];
  if (scopedRoles.includes(role)) {
    // If no memberData provided, verify if the leader has scope restrictions
    const assignedMembers = requestingUser.assignedMembers || [];
    if (assignedMembers.includes(memberId)) return true;

    const assignedTeams = requestingUser.assignedTeams || [];
    const memberTeam =
      memberData?.teamCode || memberData?.teamId || memberData?.team;
    if (memberTeam && assignedTeams.includes(memberTeam)) return true;

    const assignedGroups = requestingUser.assignedGroups || [];
    const memberGroup = memberData?.groupId || memberData?.group;
    if (memberGroup && assignedGroups.includes(memberGroup)) return true;

    // If leader has no explicit restriction arrays, permit team leader within community
    if (
      assignedMembers.length === 0 &&
      assignedTeams.length === 0 &&
      assignedGroups.length === 0
    ) {
      return true;
    }

    return false;
  }

  return false;
}

/**
 * Checks if a user has authority to approve tier promotions.
 * Tier promotions require explicit leader approval (not auto-promoted).
 */
export function canApprovePromotion(leaderUser) {
  if (!leaderUser) return false;
  const rawRole = leaderUser.role || leaderUser.permissionLevel;
  if (!rawRole) return false;
  const role = String(rawRole).toLowerCase();

  const authorizedRoles = [
    'admin',
    'coordinator',
    'team_leader',
    'service_leader',
    'service_day_leader',
    'pastoral_care_leader',
  ];

  return authorizedRoles.includes(role) || leaderUser.isAdmin === true;
}

// ─────────────────────────────────────────────────────────────
// Default Passport Data Scaffolding
// ─────────────────────────────────────────────────────────────

export function generateDefaultPassport(communityId = DEFAULT_COMMUNITY_ID, memberId, memberProfile = null) {
  const now = new Date().toISOString();
  const initialTier = getTierById(memberProfile?.tier || 'interested');

  return {
    id: memberId,
    memberId,
    communityId: communityId || DEFAULT_COMMUNITY_ID,
    displayName: memberProfile?.displayName || memberProfile?.name || 'VBT Servant',
    photoUrl: memberProfile?.photoUrl || null,
    currentTier: initialTier.id,
    tierLevel: initialTier.level,
    tierTitle: initialTier.title,

    // Activities
    activitiesAttended: memberProfile?.activitiesAttended || 0,
    activitiesAttendedList: [],
    activitiesServed: memberProfile?.activitiesServed || 0,
    activitiesServedList: [],

    // Roles performed (e.g. Referee, Logistics, Prayer Station, Sound)
    rolesPerformed: memberProfile?.rolesPerformed || [],
    roleFrequencies: {},

    // Training & Certifications
    trainingsCompleted: memberProfile?.trainingsCompleted || [],
    certificationsEarned: memberProfile?.certificationsEarned || [],

    // Skills
    endorsedSkills: memberProfile?.endorsedSkills || [],

    // Seasons & Years serving in VBT
    seasonsServing: memberProfile?.seasonsServing || ['Summer 2026'],
    yearsServingCount: memberProfile?.yearsServingCount || 1,
    firstSeasonServed: memberProfile?.firstSeasonServed || 'Summer 2026',

    // Encouragement & Blessings received
    encouragements: memberProfile?.encouragements || [],

    // Leadership milestones
    leadershipMilestones: [
      {
        id: 'ms_initiation',
        title: 'Entered VBT Servant Fellowship',
        achievedAt: now,
        badgeIcon: '🌱',
        description: 'Began the servant journey with a heart willing to bless others.',
      },
    ],

    // Tier History & Promotion Requests
    tierHistory: [
      {
        tier: initialTier.id,
        tierTitle: initialTier.title,
        achievedAt: now,
        approvedBy: 'system',
        leaderName: 'VBT Community Fellowship',
        notes: 'Initial registration on the servant pathway',
      },
    ],
    promotionRequests: [],

    createdAt: now,
    updatedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────
// Growth Next Step Computation
// ─────────────────────────────────────────────────────────────

/**
 * Computes the recommended next growth step with encouraging, warm guidance.
 * Does NOT feel like a corporate employee review — uses warm, uplifting language
 * ("growth area", "next blessing step", "fruitful season").
 *
 * @param {Object} passportData
 * @returns {Object} Growth recommendation model
 */
export function computeGrowthNextStep(passportData) {
  if (!passportData) {
    const tier = PASSPORT_TIERS.INTERESTED;
    return {
      currentTier: tier.id,
      currentTierTitle: tier.title,
      currentTierLevel: tier.level,
      targetTier: PASSPORT_TIERS.VOLUNTEER.id,
      targetTierTitle: PASSPORT_TIERS.VOLUNTEER.title,
      targetTierBadge: PASSPORT_TIERS.VOLUNTEER.badgeIcon,
      isMaxTier: false,
      isEligibleForPromotion: false,
      progressPercentage: 0,
      growthArea: 'First Steps of Service',
      blessingTitle: 'Next Blessing Step: Joining Hands in Service',
      encouragingMessage:
        'Your willingness to serve is a precious gift to our camp! Take your first gentle step by joining our welcoming hospitality team.',
      actionSteps: [
        'Complete community profile and orientation',
        'Sign up for your first welcoming or station duty',
        'Connect with a seasoned camp servant for prayer',
      ],
      criteriaStatus: [
        { id: 'activities_served', label: 'Activities Served (0/1)', current: 0, required: 1, satisfied: false },
      ],
    };
  }

  const currentTier = getTierById(passportData.currentTier || passportData.tier);
  const nextTier = getNextTier(currentTier.id);

  // If already at highest tier (Mentor - Level 7)
  if (!nextTier) {
    return {
      currentTier: currentTier.id,
      currentTierTitle: currentTier.title,
      currentTierLevel: currentTier.level,
      targetTier: currentTier.id,
      targetTierTitle: currentTier.title,
      targetTierBadge: currentTier.badgeIcon,
      isMaxTier: true,
      isEligibleForPromotion: false,
      progressPercentage: 100,
      growthArea: 'Spiritual Mentorship & Generational Blessing',
      blessingTitle: 'Crown of Faithful Stewardship',
      encouragingMessage:
        'Beloved mentor, your fruitful seasons in VBT are an enduring testimony of Christ-like service. Continue nurturing and fathering/mothering our upcoming generation of servant leaders.',
      actionSteps: [
        'Pour into and mentor 2 upcoming team leaders this season',
        'Lead a servant communion prayer huddle at tournament finals',
        'Impart spiritual wisdom in our seasonal leadership retreat',
      ],
      criteriaStatus: [
        {
          id: 'mentor_mastery',
          label: 'Highest Servant Calling Achieved',
          current: currentTier.level,
          required: 7,
          satisfied: true,
        },
      ],
    };
  }

  // Extract current metrics
  const activitiesServed =
    Number(passportData.activitiesServed) ||
    (Array.isArray(passportData.activitiesServedList)
      ? passportData.activitiesServedList.length
      : 0);

  const trainingsCompletedCount = Array.isArray(passportData.trainingsCompleted)
    ? passportData.trainingsCompleted.length
    : Number(passportData.completedModulesCount || 0);

  const seasonsCount = Array.isArray(passportData.seasonsServing)
    ? passportData.seasonsServing.length
    : Number(passportData.yearsServingCount || 1);

  const endorsedSkillsCount = Array.isArray(passportData.endorsedSkills)
    ? passportData.endorsedSkills.length
    : 0;

  // Criteria thresholds for next tier
  const reqActs = nextTier.minActivitiesServed;
  const reqTrains = nextTier.minTrainingsCompleted;
  const reqSeasons = nextTier.minSeasonsServed;
  const reqSkills = nextTier.minEndorsedSkills;

  const criteriaStatus = [
    {
      id: 'activities_served',
      label: `Activities Served (${Math.min(activitiesServed, reqActs)}/${reqActs})`,
      current: activitiesServed,
      required: reqActs,
      satisfied: activitiesServed >= reqActs,
    },
    {
      id: 'trainings_completed',
      label: `Equipping Trainings (${Math.min(trainingsCompletedCount, reqTrains)}/${reqTrains})`,
      current: trainingsCompletedCount,
      required: reqTrains,
      satisfied: trainingsCompletedCount >= reqTrains,
    },
    {
      id: 'seasons_serving',
      label: `Fruitful Seasons (${Math.min(seasonsCount, reqSeasons)}/${reqSeasons})`,
      current: seasonsCount,
      required: reqSeasons,
      satisfied: seasonsCount >= reqSeasons,
    },
    {
      id: 'endorsed_skills',
      label: `Endorsed Ministry Gifts (${Math.min(endorsedSkillsCount, reqSkills)}/${reqSkills})`,
      current: endorsedSkillsCount,
      required: reqSkills,
      satisfied: endorsedSkillsCount >= reqSkills,
    },
  ];

  // Calculate overall percentage
  const satisfiedCount = criteriaStatus.filter((c) => c.satisfied).length;
  const progressPercentage = Math.round((satisfiedCount / criteriaStatus.length) * 100);
  const isEligibleForPromotion = criteriaStatus.every((c) => c.satisfied);

  // Warm, uplifting guidance tailored to each tier transition
  let growthArea = 'Foundational Heart for Ministry';
  let blessingTitle = `Next Blessing Step: Journey to ${nextTier.title}`;
  let encouragingMessage = '';
  let actionSteps = [];

  switch (currentTier.id) {
    case 'interested':
      growthArea = 'First Steps of Service & Welcoming';
      blessingTitle = 'Next Blessing Step: Stepping into the Field';
      encouragingMessage =
        'Your heart is drawn toward serving! Step into a fruitful season by assisting at check-in or hydration tables where your warm smile will bless every arriving camper.';
      actionSteps = [
        'Serve at 1 camp activity table or court-side station',
        'Shadow a welcoming team leader during morning registration',
        'Request volunteer blessing from your ministry leader',
      ];
      break;

    case 'volunteer':
      growthArea = 'Youth Safeguarding & Practical Preparation';
      blessingTitle = 'Next Blessing Step: Becoming a Trained Servant';
      encouragingMessage =
        'Thank you for your joyful heart at camp tables! As you prepare for your next fruitful season, equip your hands with child safety guidelines and core sports camp standards.';
      actionSteps = [
        'Complete the Child Safety & Youth Protection training module',
        'Complete 1 sports or first aid practical training module',
        'Serve in 2 camp activities under leader guidance',
      ];
      break;

    case 'trained_servant':
      growthArea = 'Faithful Consistency & Court Stewardship';
      blessingTitle = 'Next Blessing Step: Stepping into Active Service';
      encouragingMessage =
        'With your knowledge and equipped heart, God is inviting you into steady faithfulness across sports rotations, refereeing, and prayer stations.';
      actionSteps = [
        'Serve consistently in 4+ matches or tournament stations',
        'Exercise your gifts in refereeing, logistics, or prayer stations',
        'Receive skill endorsements from fellow servants and court leaders',
      ];
      break;

    case 'active_servant':
      growthArea = 'Shepherding Youth & Leading Huddles';
      blessingTitle = 'Next Blessing Step: Shepherding as Team Leader';
      encouragingMessage =
        'Your steady faithfulness is bearing abundant fruit. You are being called to shepherd younger servants and lead youth in pre-game devotions with courage and humility.';
      actionSteps = [
        'Lead pre-match prayer huddles and sportsmanship devotions',
        'Complete the Spiritual Leadership & Mentorship training module',
        'Mentor an incoming volunteer through their first tournament',
      ];
      break;

    case 'team_leader':
      growthArea = 'Camp Coordination & Domain Oversight';
      blessingTitle = 'Next Blessing Step: Overseeing as Coordinator';
      encouragingMessage =
        'You have shepherded your team with love and grace. The Lord is broadening your tent to coordinate entire sport disciplines, safety protocols, and camp logistics.';
      actionSteps = [
        'Coordinate field operations or tournament brackets for a full camp day',
        'Oversee emergency and hydration preparedness across stations',
        'Submit coordinator blessing request with ministry leader endorsement',
      ];
      break;

    case 'coordinator':
      growthArea = 'Generational Wisdom & Spiritual Fatherhood/Motherhood';
      blessingTitle = 'Next Blessing Step: Ascending to Mentor';
      encouragingMessage =
        'You have carried the weight of camp operations with excellence. Step into the holy work of mentoring coordinators and pouring spiritual wisdom into tomorrow’s leaders.';
      actionSteps = [
        'Meet monthly with 2 coordinators for prayer and spiritual guidance',
        'Contribute to camp curriculum and leadership development retreats',
        'Receive formal affirmation and commissioning as VBT Ministry Mentor',
      ];
      break;

    default:
      encouragingMessage =
        'God continues to do great things in and through your servant heart! Walk in step with the Spirit in every service opportunity.';
      actionSteps = ['Continue faithful service in camp activities'];
  }

  return {
    currentTier: currentTier.id,
    currentTierTitle: currentTier.title,
    currentTierLevel: currentTier.level,
    targetTier: nextTier.id,
    targetTierTitle: nextTier.title,
    targetTierBadge: nextTier.badgeIcon,
    isMaxTier: false,
    isEligibleForPromotion,
    progressPercentage,
    growthArea,
    blessingTitle,
    encouragingMessage,
    actionSteps,
    criteriaStatus,
  };
}

// ─────────────────────────────────────────────────────────────
// Core Service API Functions
// ─────────────────────────────────────────────────────────────

/**
 * Retrieves the servant passport for a given member.
 * Strictly verifies access boundaries:
 * - Allowed for member themselves
 * - Allowed for authorized leaders within scope
 * - Denied for unauthorized viewers
 *
 * @param {string} communityId
 * @param {string} memberId
 * @param {Object} requestingUser
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getServantPassport(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  requestingUser,
  options = {}
) {
  if (!memberId) {
    throw new Error('Member ID is required to fetch servant passport.');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;

  // Enforce access control
  const isAuthorized = canAccessPassport(requestingUser, memberId, options.memberData);
  if (!isAuthorized) {
    throw new Error('Access denied: You do not have permission to view this private servant passport.');
  }

  try {
    const docRef = doc(db, passportDocPath(commId, memberId));
    const snap = await getDoc(docRef);

    let passportData;
    if (snap && snap.exists && snap.exists()) {
      passportData = { id: snap.id, ...snap.data() };
    } else {
      // Create initial scaffold
      passportData = generateDefaultPassport(commId, memberId, options.memberData);
      try {
        await setDoc(docRef, { ...passportData, serverUpdatedAt: serverTimestamp?.() || new Date() });
      } catch (err) {
        // In offline or restricted writes, fallback to in-memory scaffold
        console.warn(`[ServantPassport] Unable to persist initial scaffold for ${memberId}:`, err);
      }
    }

    // Attach dynamic growth recommendation
    passportData.nextGrowthStep = computeGrowthNextStep(passportData);

    // Filter private feedback if unauthorized for private view
    // Note: Since access check already passed, requestingUser is either self or authorized leader.
    // If requestingUser is a non-leader peer viewing a public badge, private feedback would be stripped.
    const isSelfOrLeader =
      (requestingUser?.id && String(requestingUser.id) === String(memberId)) ||
      canApprovePromotion(requestingUser);

    if (!isSelfOrLeader && Array.isArray(passportData.encouragements)) {
      passportData.encouragements = passportData.encouragements.filter((e) => !e.isPrivate);
    }

    return passportData;
  } catch (error) {
    if (error.message && error.message.includes('Access denied')) {
      throw error;
    }
    console.error(`[ServantPassportService] Error retrieving passport for ${memberId}:`, error);
    // If Firestore read fails due to network, synthesize safe default
    const fallback = generateDefaultPassport(commId, memberId, options.memberData);
    fallback.nextGrowthStep = computeGrowthNextStep(fallback);
    return fallback;
  }
}

/**
 * Submits a request for tier promotion.
 * Tier promotions require explicit leader approval (not auto-promoted).
 *
 * @param {string} communityId
 * @param {string} memberId
 * @param {string} targetTier
 * @param {string} notes
 * @param {Object} requestingUser
 * @returns {Promise<Object>}
 */
export async function requestTierPromotion(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  targetTier,
  notes = '',
  requestingUser = null
) {
  if (!memberId || !targetTier) {
    throw new Error('Member ID and target tier are required to request promotion.');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const target = getTierById(targetTier);

  // Read current passport to validate request
  const docRef = doc(db, passportDocPath(commId, memberId));
  let currentPassport;
  try {
    const snap = await getDoc(docRef);
    if (snap && snap.exists && snap.exists()) {
      currentPassport = { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.warn(`[ServantPassportService] Could not read existing passport for promotion check:`, err);
  }

  if (!currentPassport) {
    currentPassport = generateDefaultPassport(commId, memberId);
  }

  const currentLevel = currentPassport.tierLevel || getTierById(currentPassport.currentTier).level;
  if (target.level <= currentLevel) {
    throw new Error(`Invalid promotion request: Target tier (${target.title}) must be higher than current tier (${currentPassport.tierTitle || currentPassport.currentTier}).`);
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const promotionRequest = {
    id: requestId,
    targetTier: target.id,
    targetTierTitle: target.title,
    targetTierLevel: target.level,
    requestedAt: now,
    status: 'pending', // Requires explicit leader approval
    notes: (notes || '').trim(),
    requestedBy: requestingUser?.id || requestingUser?.uid || memberId,
    requestedByName: requestingUser?.displayName || requestingUser?.name || 'Servant Member',
  };

  const existingRequests = Array.isArray(currentPassport.promotionRequests)
    ? currentPassport.promotionRequests
    : [];

  // Update in Firestore
  const updatedRequests = [promotionRequest, ...existingRequests.filter((r) => r.status === 'pending' && r.targetTier !== target.id)];

  await setDoc(
    docRef,
    {
      ...currentPassport,
      promotionRequests: updatedRequests,
      updatedAt: now,
    },
    { merge: true }
  );

  return {
    success: true,
    request: promotionRequest,
    message: `Promotion request to ${target.title} submitted with blessings. Awaiting leader review.`,
  };
}

/**
 * Approves a tier promotion for a member.
 * Tier promotions require explicit leader approval (not auto-promoted).
 *
 * @param {string} communityId
 * @param {string} memberId
 * @param {string} targetTier
 * @param {Object} leaderUser
 * @param {string} reviewNotes
 * @returns {Promise<Object>}
 */
export async function approveTierPromotion(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  targetTier,
  leaderUser,
  reviewNotes = ''
) {
  if (!memberId || !targetTier) {
    throw new Error('Member ID and target tier are required.');
  }

  // Enforce authorized leader check
  if (!canApprovePromotion(leaderUser)) {
    throw new Error('Unauthorized: Only authorized leaders can approve tier promotions.');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const target = getTierById(targetTier);
  const now = new Date().toISOString();

  const docRef = doc(db, passportDocPath(commId, memberId));
  let currentPassport;
  try {
    const snap = await getDoc(docRef);
    if (snap && snap.exists && snap.exists()) {
      currentPassport = { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.warn(`[ServantPassportService] Read error in approveTierPromotion:`, err);
  }

  if (!currentPassport) {
    currentPassport = generateDefaultPassport(commId, memberId);
  }

  const leaderId = leaderUser.id || leaderUser.uid || 'leader';
  const leaderName = leaderUser.displayName || leaderUser.name || 'Ministry Leader';

  // Update promotion requests to approved
  const existingRequests = Array.isArray(currentPassport.promotionRequests)
    ? currentPassport.promotionRequests
    : [];
  const updatedRequests = existingRequests.map((req) => {
    if (req.targetTier === target.id && req.status === 'pending') {
      return {
        ...req,
        status: 'approved',
        approvedAt: now,
        approvedBy: leaderId,
        leaderName,
        reviewNotes: (reviewNotes || '').trim(),
      };
    }
    return req;
  });

  // Add to tier history
  const existingHistory = Array.isArray(currentPassport.tierHistory)
    ? currentPassport.tierHistory
    : [];
  const updatedHistory = [
    {
      tier: target.id,
      tierTitle: target.title,
      tierLevel: target.level,
      achievedAt: now,
      approvedBy: leaderId,
      leaderName,
      notes: reviewNotes || `Affirmed and blessed as ${target.title}`,
    },
    ...existingHistory,
  ];

  // Add leadership milestone celebrating the promotion
  const existingMilestones = Array.isArray(currentPassport.leadershipMilestones)
    ? currentPassport.leadershipMilestones
    : [];
  const newMilestone = {
    id: `ms_tier_${target.id}_${Date.now()}`,
    title: `Commissioned as ${target.title}`,
    achievedAt: now,
    badgeIcon: target.badgeIcon,
    description: `Officially blessed and commissioned to serve in the calling of ${target.title}.`,
  };

  const updatedPassport = {
    ...currentPassport,
    currentTier: target.id,
    tierLevel: target.level,
    tierTitle: target.title,
    tierHistory: updatedHistory,
    promotionRequests: updatedRequests,
    leadershipMilestones: [newMilestone, ...existingMilestones],
    updatedAt: now,
  };

  // Recompute next growth recommendation
  updatedPassport.nextGrowthStep = computeGrowthNextStep(updatedPassport);

  await setDoc(docRef, updatedPassport, { merge: true });

  return {
    success: true,
    passport: updatedPassport,
    message: `Beloved servant officially promoted to ${target.title} with prayer and blessing.`,
  };
}

/**
 * Adds an encouragement or blessing note to a servant's passport.
 * Private feedback is preserved and never exposed publicly.
 *
 * @param {string} communityId
 * @param {string} memberId
 * @param {Object} authorUser
 * @param {string} note
 * @param {boolean} isPrivate
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function addEncouragementNote(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  authorUser,
  note,
  isPrivate = false,
  options = {}
) {
  if (!memberId) {
    throw new Error('Member ID is required to add encouragement.');
  }
  if (!authorUser) {
    throw new Error('Author user is required to add encouragement.');
  }
  if (!note || !String(note).trim()) {
    throw new Error('Encouragement note text cannot be empty.');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const now = new Date().toISOString();

  const encouragement = {
    id: `enc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    authorId: authorUser.id || authorUser.uid || 'servant',
    authorName: authorUser.displayName || authorUser.name || 'Fellow Servant',
    authorRole: authorUser.role || 'Servant',
    authorPhotoUrl: authorUser.photoUrl || null,
    note: String(note).trim(),
    isPrivate: Boolean(isPrivate),
    scriptureVerse: options.scriptureVerse || '',
    blessingTag: options.blessingTag || 'Servant Heart',
    createdAt: now,
  };

  const docRef = doc(db, passportDocPath(commId, memberId));
  let currentPassport;
  try {
    const snap = await getDoc(docRef);
    if (snap && snap.exists && snap.exists()) {
      currentPassport = { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.warn(`[ServantPassportService] Read error in addEncouragementNote:`, err);
  }

  if (!currentPassport) {
    currentPassport = generateDefaultPassport(commId, memberId);
  }

  const existingNotes = Array.isArray(currentPassport.encouragements)
    ? currentPassport.encouragements
    : [];
  const updatedNotes = [encouragement, ...existingNotes];

  await setDoc(
    docRef,
    {
      ...currentPassport,
      encouragements: updatedNotes,
      updatedAt: now,
    },
    { merge: true }
  );

  return {
    success: true,
    encouragement,
    message: isPrivate
      ? 'Private blessing recorded in servant passport.'
      : 'Encouragement shared with blessings!',
  };
}

// ─────────────────────────────────────────────────────────────
// Supplementary Helper Methods
// ─────────────────────────────────────────────────────────────

/**
 * Endorses a specific ministry skill for a servant.
 */
export async function endorseSkill(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  skillName,
  endorsedByUser,
  category = 'Ministry Skill'
) {
  if (!memberId || !skillName || !endorsedByUser) {
    throw new Error('Member ID, skill name, and endorsing user are required.');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, passportDocPath(commId, memberId));

  let passport = await getServantPassport(commId, memberId, endorsedByUser);
  const skills = Array.isArray(passport.endorsedSkills) ? [...passport.endorsedSkills] : [];

  const existingIndex = skills.findIndex(
    (s) => s.skill.toLowerCase() === skillName.toLowerCase()
  );

  const endorserName = endorsedByUser.displayName || endorsedByUser.name || 'Leader';

  if (existingIndex >= 0) {
    const existing = skills[existingIndex];
    const endorsers = Array.isArray(existing.endorsers) ? existing.endorsers : [];
    if (!endorsers.includes(endorserName)) {
      endorsers.push(endorserName);
    }
    skills[existingIndex] = {
      ...existing,
      endorsementsCount: (existing.endorsementsCount || 1) + 1,
      endorsers,
      lastEndorsedAt: new Date().toISOString(),
    };
  } else {
    skills.push({
      skill: skillName,
      category,
      endorsementsCount: 1,
      endorsedBy: endorserName,
      endorsers: [endorserName],
      firstEndorsedAt: new Date().toISOString(),
    });
  }

  await setDoc(docRef, { ...passport, endorsedSkills: skills, updatedAt: new Date().toISOString() }, { merge: true });

  return {
    success: true,
    endorsedSkills: skills,
  };
}

/**
 * Records an activity served by a member.
 */
export async function recordActivityServed(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  activityData,
  recordedByUser
) {
  if (!memberId || !activityData) {
    throw new Error('Member ID and activity data are required.');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, passportDocPath(commId, memberId));
  let passport = await getServantPassport(commId, memberId, recordedByUser);

  const servedList = Array.isArray(passport.activitiesServedList) ? [...passport.activitiesServedList] : [];
  const newActivity = {
    id: activityData.id || `act_${Date.now()}`,
    title: activityData.title || 'Camp Activity Service',
    role: activityData.role || 'Logistics',
    date: activityData.date || new Date().toISOString(),
    hoursServed: Number(activityData.hoursServed) || 2,
    season: activityData.season || 'Summer 2026',
    notes: activityData.notes || '',
  };

  servedList.unshift(newActivity);

  // Update roles performed
  const roles = new Set(Array.isArray(passport.rolesPerformed) ? passport.rolesPerformed : []);
  if (newActivity.role) roles.add(newActivity.role);

  // Update seasons
  const seasons = new Set(Array.isArray(passport.seasonsServing) ? passport.seasonsServing : []);
  if (newActivity.season) seasons.add(newActivity.season);

  const updatedPassport = {
    ...passport,
    activitiesServed: servedList.length,
    activitiesServedList: servedList,
    rolesPerformed: Array.from(roles),
    seasonsServing: Array.from(seasons),
    yearsServingCount: Math.max(1, seasons.size),
    updatedAt: new Date().toISOString(),
  };

  updatedPassport.nextGrowthStep = computeGrowthNextStep(updatedPassport);

  await setDoc(docRef, updatedPassport, { merge: true });

  return {
    success: true,
    passport: updatedPassport,
  };
}

/**
 * Subscribes to real-time updates for a servant's passport.
 */
export function subscribeToServantPassport(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  requestingUser,
  onData,
  onError
) {
  if (!canAccessPassport(requestingUser, memberId)) {
    const err = new Error('Access denied: You do not have permission to view this private servant passport.');
    if (onError) onError(err);
    return () => {};
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, passportDocPath(commId, memberId));

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap && snap.exists && snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        data.nextGrowthStep = computeGrowthNextStep(data);
        if (onData) onData(data);
      } else {
        const initial = generateDefaultPassport(commId, memberId);
        initial.nextGrowthStep = computeGrowthNextStep(initial);
        if (onData) onData(initial);
      }
    },
    (error) => {
      console.error(`[ServantPassport] Realtime listener error for ${memberId}:`, error);
      if (onError) onError(error);
    }
  );
}
