import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export { DEFAULT_COMMUNITY_ID };

/**
 * Servant progression tiers with level, badge, and milestone thresholds.
 */
export const SERVANT_TIERS = {
  VOLUNTEER: {
    key: 'VOLUNTEER',
    id: 'volunteer',
    level: 1,
    title: 'Volunteer',
    name: 'Volunteer',
    badgeIcon: '🌱',
    minCompletedModules: 0,
    description: 'Level 1: Community volunteer beginning service and learning camp basics',
  },
  SERVANT: {
    key: 'SERVANT',
    id: 'servant',
    level: 2,
    title: 'Servant',
    name: 'Servant',
    badgeIcon: '⭐',
    minCompletedModules: 2,
    description: 'Level 2: Active servant serving consistently in sports, meetings, and team duties',
  },
  LEAD_SERVANT: {
    key: 'LEAD_SERVANT',
    id: 'lead_servant',
    level: 3,
    title: 'Lead Servant',
    name: 'Lead Servant',
    badgeIcon: '🏆',
    minCompletedModules: 5,
    description: 'Level 3: Experienced servant mentoring others, leading games, and guiding youth',
  },
  COORDINATOR: {
    key: 'COORDINATOR',
    id: 'coordinator',
    level: 4,
    title: 'Coordinator',
    name: 'Coordinator',
    badgeIcon: '👑',
    minCompletedModules: 8,
    description: 'Level 4: Ministry coordinator overseeing domains, safety, and leadership pathways',
  },
};

// Enable string/number coercive ergonomics on tier objects
Object.values(SERVANT_TIERS).forEach((tier) => {
  tier.toString = () => tier.id;
  tier.valueOf = () => tier.level;
});

/**
 * Standard training module categories
 */
export const MODULE_CATEGORIES = {
  CHILD_SAFETY: 'child_safety',
  REFEREE_RULES: 'referee_rules',
  SPIRITUAL_LEADERSHIP: 'spiritual_leadership',
  LOGISTICS_FIRSTAID: 'logistics_firstaid',
};

/**
 * Metadata for module categories
 */
export const MODULE_CATEGORY_META = {
  [MODULE_CATEGORIES.CHILD_SAFETY]: {
    label: 'Child Safety & Protection',
    icon: '🛡️',
    description: 'Safeguarding children, boundaries, and emergency protocols in sports ministry',
  },
  [MODULE_CATEGORIES.REFEREE_RULES]: {
    label: 'Referee & Game Rules',
    icon: '⚖️',
    description: 'Mastery of game rules, sportsmanship arbitration, and fair play',
  },
  [MODULE_CATEGORIES.SPIRITUAL_LEADERSHIP]: {
    label: 'Spiritual Leadership & Mentorship',
    icon: '🕊️',
    description: 'Leading prayers, character building, team devotions, and Christ-like servant heart',
  },
  [MODULE_CATEGORIES.LOGISTICS_FIRSTAID]: {
    label: 'Logistics & First Aid',
    icon: '🩹',
    description: 'Camp logistics, equipment safety, hydration schedules, and basic first aid',
  },
};

/**
 * Foundational default modules for VBT Community
 */
export const DEFAULT_TRAINING_MODULES = [
  {
    id: 'vbt_child_safety_101',
    title: 'Child Safety & Youth Protection Protocols',
    category: MODULE_CATEGORIES.CHILD_SAFETY,
    durationMinutes: 25,
    description: 'Mandatory safeguarding guidelines, two-leader rule, and emergency response for working with youth at VBT Sports Camp.',
    badgeIcon: '🛡️',
    requiredTier: SERVANT_TIERS.VOLUNTEER.id,
    order: 1,
    lessons: [
      {
        id: 'cs_1',
        title: 'The Two-Leader Rule & Safe Boundaries',
        content: 'Always maintain two verified adult leaders in any youth breakout, vehicle, or locker area. Never be alone with a camper behind closed doors.',
        quiz: {
          question: 'What is the minimum number of leaders required in youth areas?',
          options: ['1 leader', '2 leaders', '3 leaders'],
          answer: 1,
        },
      },
      {
        id: 'cs_2',
        title: 'Emergency Protocols & Incident Reporting',
        content: 'Immediate steps for injuries, dehydration, or emotional crises. Document every incident with camp coordinators within two hours.',
        quiz: {
          question: 'How quickly must an incident report be filed with camp coordinators?',
          options: ['Within 24 hours', 'Same day / within 2 hours', 'End of week'],
          answer: 1,
        },
      },
    ],
  },
  {
    id: 'vbt_referee_rules_101',
    title: 'Sports Camp Rules & Christian Refereeing',
    category: MODULE_CATEGORIES.REFEREE_RULES,
    durationMinutes: 30,
    description: 'Referee whistling standards, foul arbitration, fair play, and handling intense match moments with grace and patience.',
    badgeIcon: '⚖️',
    requiredTier: SERVANT_TIERS.SERVANT.id,
    order: 2,
    lessons: [
      {
        id: 'rr_1',
        title: 'Game Mechanics & Fair Play Enforcement',
        content: 'Standard whistle cadence, clear hand signals, and de-escalating disputes on the court.',
        quiz: {
          question: 'What is the primary role of a VBT referee?',
          options: ['To penalize mistakes', 'To ensure safe, fair, and Christ-like sportsmanship', 'To rush the schedule'],
          answer: 1,
        },
      },
    ],
  },
  {
    id: 'vbt_spiritual_leadership_101',
    title: 'Spiritual Mentorship & Team Devotions',
    category: MODULE_CATEGORIES.SPIRITUAL_LEADERSHIP,
    durationMinutes: 40,
    description: 'Equipping servants to lead engaging team huddles, pre-game prayers, Scripture devotions, and Christ-centered encouragement.',
    badgeIcon: '🕊️',
    requiredTier: SERVANT_TIERS.LEAD_SERVANT.id,
    order: 3,
    lessons: [
      {
        id: 'sl_1',
        title: 'Leading Effective Pre-Game Devotions',
        content: 'Structuring a 5-minute team huddle connecting Scripture with perseverance and teamwork.',
        quiz: {
          question: 'How long should a pre-game team huddle devotion typically last?',
          options: ['5-7 minutes', '30 minutes', '1 hour'],
          answer: 0,
        },
      },
    ],
  },
  {
    id: 'vbt_logistics_firstaid_101',
    title: 'Camp Logistics, Hydration & First Aid Basics',
    category: MODULE_CATEGORIES.LOGISTICS_FIRSTAID,
    durationMinutes: 35,
    description: 'Managing equipment safety, sports field logistics, hydration schedules in Cairo heat, and first-responder first aid.',
    badgeIcon: '🩹',
    requiredTier: SERVANT_TIERS.SERVANT.id,
    order: 4,
    lessons: [
      {
        id: 'fa_1',
        title: 'Cairo Heat Safety & Mandatory Hydration',
        content: 'Hydration rounds between matches and identifying early signs of heat exhaustion.',
        quiz: {
          question: 'When should hydration breaks occur during warm weather sports?',
          options: ['Only when campers complain', 'Every 15-20 minutes in warm weather', 'Only at lunch'],
          answer: 1,
        },
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Path Helpers
// ─────────────────────────────────────────────

export function trainingModulesCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/training_modules`;
}

export function trainingModuleDocPath(communityId = DEFAULT_COMMUNITY_ID, moduleId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/training_modules/${moduleId}`;
}

export function memberProgressCollectionPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/members/${memberId}/training_progress`;
}

export function memberProgressDocPath(communityId = DEFAULT_COMMUNITY_ID, memberId, moduleId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/members/${memberId}/training_progress/${moduleId}`;
}

export function memberCertificationsCollectionPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/members/${memberId}/certifications`;
}

export function memberCertificationDocPath(communityId = DEFAULT_COMMUNITY_ID, memberId, certId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/members/${memberId}/certifications/${certId}`;
}

// ─────────────────────────────────────────────
// Servant Level Calculation
// ─────────────────────────────────────────────

/**
 * Calculates servant progression level and tier based on completed modules count.
 * Level 1: VOLUNTEER (0 - 1 modules)
 * Level 2: SERVANT (2 - 4 modules)
 * Level 3: LEAD_SERVANT (5 - 7 modules)
 * Level 4: COORDINATOR (8+ modules)
 *
 * @param {number|string} completedModulesCount
 * @returns {Object} Tier and level summary with numeric coercive capability
 */
export function calculateServantLevel(completedModulesCount = 0) {
  const count = Math.max(0, parseInt(completedModulesCount, 10) || 0);

  let currentTier = SERVANT_TIERS.VOLUNTEER;
  let nextTier = SERVANT_TIERS.SERVANT;
  let modulesToNextTier = Math.max(0, 2 - count);

  if (count >= 8) {
    currentTier = SERVANT_TIERS.COORDINATOR;
    nextTier = null;
    modulesToNextTier = 0;
  } else if (count >= 5) {
    currentTier = SERVANT_TIERS.LEAD_SERVANT;
    nextTier = SERVANT_TIERS.COORDINATOR;
    modulesToNextTier = Math.max(0, 8 - count);
  } else if (count >= 2) {
    currentTier = SERVANT_TIERS.SERVANT;
    nextTier = SERVANT_TIERS.LEAD_SERVANT;
    modulesToNextTier = Math.max(0, 5 - count);
  }

  return {
    level: currentTier.level,
    tier: currentTier.id,
    tierKey: currentTier.key,
    title: currentTier.title,
    badgeIcon: currentTier.badgeIcon,
    description: currentTier.description,
    completedModulesCount: count,
    minCompletedModules: currentTier.minCompletedModules,
    nextTier: nextTier ? nextTier.id : null,
    nextTierTitle: nextTier ? nextTier.title : null,
    modulesToNextTier,
    isMaxLevel: currentTier.level === 4,
    valueOf() {
      return this.level;
    },
    toString() {
      return `Level ${this.level} (${this.title})`;
    },
  };
}

// ─────────────────────────────────────────────
// Training Modules Operations
// ─────────────────────────────────────────────

/**
 * Retrieve all training modules for a community.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array<Object>>}
 */
export async function getTrainingModules(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  try {
    const colRef = collection(db, trainingModulesCollectionPath(commId));
    const snapshot = await getDocs(colRef);
    const modules = [];
    snapshot.forEach((d) => {
      modules.push({ id: d.id, ...d.data() });
    });
    return modules.sort(
      (a, b) =>
        (a.order ?? 999) - (b.order ?? 999) ||
        (a.title || '').localeCompare(b.title || '')
    );
  } catch (error) {
    console.error(`[TrainingGrowthService] Error getting training modules for ${commId}:`, error);
    return [];
  }
}

/**
 * Subscribe to real-time updates of training modules for a community.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToTrainingModules(communityId = DEFAULT_COMMUNITY_ID, callback) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const colRef = collection(db, trainingModulesCollectionPath(commId));

  return onSnapshot(
    colRef,
    (snapshot) => {
      const modules = [];
      snapshot.forEach((d) => {
        modules.push({ id: d.id, ...d.data() });
      });
      modules.sort(
        (a, b) =>
          (a.order ?? 999) - (b.order ?? 999) ||
          (a.title || '').localeCompare(b.title || '')
      );
      callback(modules);
    },
    (error) => {
      console.error(`[TrainingGrowthService] Error subscribing to training modules for ${commId}:`, error);
      callback([]);
    }
  );
}

/**
 * Create or update a training module.
 *
 * @param {string|Object} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {Object} [moduleData={}]
 * @returns {Promise<Object>} Created module record
 */
export async function createTrainingModule(communityId = DEFAULT_COMMUNITY_ID, moduleData = {}) {
  let commId = communityId;
  let data = moduleData;

  // Resiliently support passing options object as first argument
  if (typeof communityId === 'object' && communityId !== null) {
    commId = communityId.communityId || DEFAULT_COMMUNITY_ID;
    data = communityId;
  }
  commId = commId || DEFAULT_COMMUNITY_ID;

  if (!data || !data.title) {
    throw new Error('title is required to create a training module');
  }

  const rawId =
    data.id ||
    String(data.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const moduleId = rawId || `mod_${Date.now()}`;

  const docRef = doc(db, trainingModuleDocPath(commId, moduleId));

  const validCategories = Object.values(MODULE_CATEGORIES);
  const category = validCategories.includes(data.category)
    ? data.category
    : MODULE_CATEGORIES.CHILD_SAFETY;

  const newModule = {
    id: moduleId,
    communityId: commId,
    title: String(data.title).trim(),
    category,
    durationMinutes: Number(data.durationMinutes) || 30,
    description: data.description || '',
    lessons: Array.isArray(data.lessons) ? data.lessons : [],
    badgeIcon: data.badgeIcon || '🏅',
    requiredTier: data.requiredTier || SERVANT_TIERS.VOLUNTEER.id,
    order: Number(data.order) || 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, newModule, { merge: true });
  return newModule;
}

/**
 * Fetch a single training module by ID.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} moduleId
 * @returns {Promise<Object|null>}
 */
export async function getTrainingModuleById(communityId = DEFAULT_COMMUNITY_ID, moduleId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!moduleId) return null;

  try {
    const docRef = doc(db, trainingModuleDocPath(commId, moduleId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[TrainingGrowthService] Error getting module ${moduleId} for ${commId}:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────
// Member Training Progress Operations
// ─────────────────────────────────────────────

/**
 * Retrieve a member's training progress records across all modules.
 *
 * @param {string|Object} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} [memberId]
 * @returns {Promise<Array<Object>>}
 */
export async function getMemberTrainingProgress(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  let commId = communityId;
  let memId = memberId;

  if (typeof communityId === 'object' && communityId !== null) {
    commId = communityId.communityId || DEFAULT_COMMUNITY_ID;
    memId = communityId.memberId;
  }
  commId = commId || DEFAULT_COMMUNITY_ID;

  if (!memId) return [];

  try {
    const colRef = collection(db, memberProgressCollectionPath(commId, memId));
    const snapshot = await getDocs(colRef);
    const progressList = [];
    snapshot.forEach((d) => {
      progressList.push({ id: d.id, moduleId: d.id, ...d.data() });
    });
    return progressList;
  } catch (error) {
    console.error(`[TrainingGrowthService] Error getting progress for member ${memId} in ${commId}:`, error);
    return [];
  }
}

/**
 * Record or update completion of a module for a member.
 *
 * @param {string|Object} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} [memberId]
 * @param {string} [moduleId]
 * @param {number} [quizScore=100]
 * @param {string|null} [certifiedBy=null]
 * @returns {Promise<Object>}
 */
export async function recordModuleCompletion(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  moduleId,
  quizScore = 100,
  certifiedBy = null
) {
  let commId = communityId;
  let memId = memberId;
  let modId = moduleId;
  let score = quizScore;
  let certBy = certifiedBy;

  if (typeof communityId === 'object' && communityId !== null) {
    commId = communityId.communityId || DEFAULT_COMMUNITY_ID;
    memId = communityId.memberId;
    modId = communityId.moduleId;
    score = communityId.quizScore ?? 100;
    certBy = communityId.certifiedBy ?? null;
  }
  commId = commId || DEFAULT_COMMUNITY_ID;

  if (!memId) {
    throw new Error('memberId is required to record module completion');
  }
  if (!modId) {
    throw new Error('moduleId is required to record module completion');
  }

  const numericScore = typeof score === 'number' ? score : (Number(score) || 0);
  const docRef = doc(db, memberProgressDocPath(commId, memId, modId));

  const progressRecord = {
    memberId: memId,
    moduleId: modId,
    completed: true,
    completedAt: serverTimestamp(),
    quizScore: numericScore,
    certifiedBy: certBy || null,
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, progressRecord, { merge: true });
  return { id: modId, ...progressRecord };
}

// ─────────────────────────────────────────────
// Member Certifications Operations
// ─────────────────────────────────────────────

/**
 * Retrieve all awarded certifications for a member.
 *
 * @param {string|Object} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} [memberId]
 * @returns {Promise<Array<Object>>}
 */
export async function getMemberCertifications(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  let commId = communityId;
  let memId = memberId;

  if (typeof communityId === 'object' && communityId !== null) {
    commId = communityId.communityId || DEFAULT_COMMUNITY_ID;
    memId = communityId.memberId;
  }
  commId = commId || DEFAULT_COMMUNITY_ID;

  if (!memId) return [];

  try {
    const colRef = collection(db, memberCertificationsCollectionPath(commId, memId));
    const snapshot = await getDocs(colRef);
    const certList = [];
    snapshot.forEach((d) => {
      certList.push({ id: d.id, ...d.data() });
    });

    if (certList.length > 0) {
      return certList;
    }

    // Fallback: Check member profile document if stored directly as an array
    try {
      const memberDocRef = doc(db, `vbt_communities/${commId}/members/${memId}`);
      const memberSnap = await getDoc(memberDocRef);
      if (memberSnap.exists() && Array.isArray(memberSnap.data().certifications)) {
        return memberSnap.data().certifications.map((c, idx) =>
          typeof c === 'string'
            ? { id: `cert_${idx}`, name: c, certificationName: c }
            : { id: c.id || `cert_${idx}`, ...c }
        );
      }
    } catch {
      // Ignore fallback errors
    }

    return [];
  } catch (error) {
    console.error(`[TrainingGrowthService] Error getting certifications for member ${memId} in ${commId}:`, error);
    return [];
  }
}

/**
 * Award a certification to a member.
 *
 * @param {string|Object} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} [memberId]
 * @param {string} [certificationName]
 * @param {string} [awardedBy='admin']
 * @returns {Promise<Object>}
 */
export async function awardCertification(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  certificationName,
  awardedBy = 'admin'
) {
  let commId = communityId;
  let memId = memberId;
  let certName = certificationName;
  let awBy = awardedBy;

  if (typeof communityId === 'object' && communityId !== null) {
    commId = communityId.communityId || DEFAULT_COMMUNITY_ID;
    memId = communityId.memberId;
    certName = communityId.certificationName || communityId.name;
    awBy = communityId.awardedBy || 'admin';
  }
  commId = commId || DEFAULT_COMMUNITY_ID;

  if (!memId) {
    throw new Error('memberId is required to award certification');
  }
  if (!certName) {
    throw new Error('certificationName is required to award certification');
  }

  const certId =
    String(certName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/^_+|_+$/g, '') || `cert_${Date.now()}`;

  const docRef = doc(db, memberCertificationDocPath(commId, memId, certId));

  const certRecord = {
    id: certId,
    memberId: memId,
    certificationName: String(certName).trim(),
    name: String(certName).trim(),
    awardedBy: awBy || 'admin',
    awardedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: 'active',
  };

  await setDoc(docRef, certRecord, { merge: true });
  return certRecord;
}

// ─────────────────────────────────────────────
// Member Growth Summary & Seeding Helpers
// ─────────────────────────────────────────────

/**
 * Retrieve a combined growth summary for a member: completed modules,
 * certifications, current servant tier, and next milestone.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId
 * @returns {Promise<Object>}
 */
export async function getMemberGrowthSummary(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  if (!memberId) {
    return {
      memberId: null,
      completedModulesCount: 0,
      servantLevel: calculateServantLevel(0),
      completedModules: [],
      inProgressModules: [],
      certifications: [],
    };
  }

  const [progressList, certifications] = await Promise.all([
    getMemberTrainingProgress(commId, memberId),
    getMemberCertifications(commId, memberId),
  ]);

  const completedModules = progressList.filter((p) => p.completed === true);
  const inProgressModules = progressList.filter((p) => !p.completed);
  const completedModulesCount = completedModules.length;
  const servantLevel = calculateServantLevel(completedModulesCount);

  return {
    memberId,
    completedModulesCount,
    servantLevel,
    completedModules,
    inProgressModules,
    certifications,
  };
}

/**
 * Seed default training modules into a community if they do not yet exist.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array<Object>>}
 */
export async function seedDefaultTrainingModules(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const seeded = [];
  for (const mod of DEFAULT_TRAINING_MODULES) {
    const created = await createTrainingModule(commId, mod);
    seeded.push(created);
  }
  return seeded;
}
