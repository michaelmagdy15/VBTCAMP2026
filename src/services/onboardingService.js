/**
 * VBT Community Platform - Find Your Place Onboarding Service
 *
 * Implements guided onboarding questionnaire, explainable recommendation engine,
 * persistent interest tracking, and safe leader-approval workflows for volunteer roles.
 *
 * CRITICAL SAFETY RULES:
 * 1. Questions must be skippable.
 * 2. Recommendations must be explainable (always include rationale/reasoning).
 * 3. Members can edit answers later.
 * 4. NEVER automatically assign a member to a sensitive or authorized role.
 * 5. Official assignments or authorized role changes require leader approval.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import {
  VBT_ROLES,
  ASSIGNMENT_STATUS,
  AUDIT_ACTIONS,
  createAuditRecord,
} from '../contracts/communityContracts';

// ────────────────────────────────────────────────────────────
// Constants & Options
// ────────────────────────────────────────────────────────────

export const ONBOARDING_SPORTS = [
  'Football',
  'Basketball',
  'Volleyball',
  'Running',
  'Table Tennis',
  'Fitness/Calisthenics',
  'Chess/Board Games',
];

export const ONBOARDING_AGE_GROUPS = [
  'Kids 6-9',
  'Pre-teens 10-12',
  'Teens 13-17',
  'Young Adults',
  'All Ages',
];

export const SERVING_STYLES = {
  LEADING: 'leading',
  HELPING: 'helping',
  MEDIA: 'media',
  LOGISTICS: 'logistics',
  PRAYER: 'prayer',
  TEACHING: 'teaching',
  SPORTS_STATIONS: 'sports_stations',
};

export const SERVING_STYLE_OPTIONS = [
  { id: SERVING_STYLES.SPORTS_STATIONS, label: 'Sports Stations', description: 'Refereeing, running athletic drills, and organizing games' },
  { id: SERVING_STYLES.LEADING, label: 'Leading & Mentoring', description: 'Guiding a squad, facilitating discussions, and inspiring campers' },
  { id: SERVING_STYLES.HELPING, label: 'Helping & Assisting', description: 'Hands-on station support, equipment handover, and encouragement' },
  { id: SERVING_STYLES.LOGISTICS, label: 'Logistics & Safety', description: 'Setup, hydration, field safety, first aid, and equipment care' },
  { id: SERVING_STYLES.MEDIA, label: 'Media & Storytelling', description: 'Photography, videography, live updates, and social highlights' },
  { id: SERVING_STYLES.PRAYER, label: 'Prayer & Spiritual Care', description: 'Leading devotional circles, quiet prayer support, and hospitality' },
  { id: SERVING_STYLES.TEACHING, label: 'Teaching & Workshops', description: 'Character lessons, tactical coaching, and Bible breakouts' },
];

export const SERVING_FREQUENCIES = {
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  SPECIAL_EVENTS_ONLY: 'special_events_only',
};

export const SERVING_FREQUENCY_OPTIONS = [
  { id: SERVING_FREQUENCIES.WEEKLY, label: 'Weekly', description: 'Ready to serve every camp session / weekly meeting' },
  { id: SERVING_FREQUENCIES.BIWEEKLY, label: 'Biweekly', description: 'Every other week or twice a month' },
  { id: SERVING_FREQUENCIES.MONTHLY, label: 'Monthly', description: 'Once a month during major tournaments or special days' },
  { id: SERVING_FREQUENCIES.SPECIAL_EVENTS_ONLY, label: 'Special Events Only', description: 'Camp tournaments, holiday festivals, and rallies' },
];

export const SKILLS_EXPERIENCE = {
  SPORTS_COACHING: 'sports_coaching',
  FIRST_AID: 'first_aid',
  AUDIO_VIDEO: 'audio_video',
  PHOTOGRAPHY: 'photography',
  TEACHING: 'teaching',
  ORGANIZING: 'organizing',
  WELCOMING: 'welcoming',
};

export const SKILLS_EXPERIENCE_OPTIONS = [
  { id: SKILLS_EXPERIENCE.SPORTS_COACHING, label: 'Sports Coaching', description: 'Athletic coaching, refereeing, and court training' },
  { id: SKILLS_EXPERIENCE.FIRST_AID, label: 'First Aid & Safety', description: 'CPR, basic first aid, and hydration monitoring' },
  { id: SKILLS_EXPERIENCE.AUDIO_VIDEO, label: 'Audio / Video Tech', description: 'Sound systems, video streaming, and AV setup' },
  { id: SKILLS_EXPERIENCE.PHOTOGRAPHY, label: 'Photography', description: 'Action sports photography and photo editing' },
  { id: SKILLS_EXPERIENCE.TEACHING, label: 'Teaching & Mentoring', description: 'Bible study teaching, tutoring, and youth mentoring' },
  { id: SKILLS_EXPERIENCE.ORGANIZING, label: 'Organizing & Logistics', description: 'Event planning, inventory, and coordination' },
  { id: SKILLS_EXPERIENCE.WELCOMING, label: 'Welcoming & Hospitality', description: 'Greeting families, registration, and attendee hospitality' },
];

export const WORK_STYLE_PREFERENCES = {
  FRONT_FACING: 'front_facing',
  BEHIND_THE_SCENES: 'behind_the_scenes',
  BALANCED: 'balanced',
};

export const WORK_STYLE_OPTIONS = [
  { id: WORK_STYLE_PREFERENCES.FRONT_FACING, label: 'Front-Facing & Interactive', description: 'Energetic direct interaction with campers, parents, and players' },
  { id: WORK_STYLE_PREFERENCES.BEHIND_THE_SCENES, label: 'Behind-the-Scenes & Support', description: 'Quiet operational focus on logistics, media, scoring, or equipment' },
  { id: WORK_STYLE_PREFERENCES.BALANCED, label: 'Balanced Mix / Either', description: 'Flexible and comfortable with both direct interaction and support tasks' },
];

// ────────────────────────────────────────────────────────────
// Default Catalog Fallbacks (used when live DB data is empty)
// ────────────────────────────────────────────────────────────

export const DEFAULT_FALLBACK_TEAMS = [
  {
    id: 'team_football_station',
    name: 'Football Station Crew',
    sport: 'Football',
    category: 'sports_station',
    ageGroup: 'All Ages',
    servingStyle: SERVING_STYLES.SPORTS_STATIONS,
    description: 'Coordinates football court drills, refereeing, and friendly youth tourneys.',
    leader: {
      name: 'Captain Mina Farag',
      role: 'Sports Director & Tournament Coordinator',
      contact: 'WhatsApp / Field A',
      email: 'mina.farag@vbtcamp.org',
    },
  },
  {
    id: 'team_basketball_station',
    name: 'Basketball Station Crew',
    sport: 'Basketball',
    category: 'sports_station',
    ageGroup: 'Teens 13-17',
    servingStyle: SERVING_STYLES.SPORTS_STATIONS,
    description: 'Runs basketball court stations, shooting contests, and court management.',
    leader: {
      name: 'Coach Bishoy Nabil',
      role: 'Basketball Head Coach',
      contact: 'On-Court Station B',
      email: 'bishoy.nabil@vbtcamp.org',
    },
  },
  {
    id: 'team_kids_athletics',
    name: 'Kids & Juniors Athletics Squad',
    sport: 'Running',
    category: 'youth_fellowship',
    ageGroup: 'Kids 6-9',
    servingStyle: SERVING_STYLES.HELPING,
    description: 'Assisting small champions with warmups, fun relay games, and encouragement.',
    leader: {
      name: 'Servant Mary George',
      role: 'Youth Ministry Coordinator',
      contact: 'Welcome Desk & Leader Room',
      email: 'mary.george@vbtcamp.org',
    },
  },
  {
    id: 'team_field_logistics',
    name: 'Logistics, Hydration & Field Safety',
    sport: 'Fitness/Calisthenics',
    category: 'logistics',
    ageGroup: 'All Ages',
    servingStyle: SERVING_STYLES.LOGISTICS,
    description: 'Field setup, equipment management, water stations, and safety support.',
    leader: {
      name: 'David Shenouda',
      role: 'Operations & Safety Coordinator',
      contact: 'Logistics Hub & Field Tent',
      email: 'david.shenouda@vbtcamp.org',
    },
  },
  {
    id: 'team_media_tech',
    name: 'Media & Camp Storytelling Team',
    sport: 'Chess/Board Games',
    category: 'media',
    ageGroup: 'Young Adults',
    servingStyle: SERVING_STYLES.MEDIA,
    description: 'Capturing camp action photos, livestreaming matches, and tournament scoring.',
    leader: {
      name: 'Fadi Mourad',
      role: 'Media & Creative Lead',
      contact: 'Production Booth',
      email: 'fadi.mourad@vbtcamp.org',
    },
  },
  {
    id: 'team_prayer_fellowship',
    name: 'Servant Circle & Prayer Fellowship',
    sport: 'All Sports',
    category: 'servant_circle',
    ageGroup: 'All Ages',
    servingStyle: SERVING_STYLES.PRAYER,
    description: 'Leading devotional circles, servant prayer, and hospitality support.',
    leader: {
      name: 'Peter Kamel',
      role: 'Servant Care Coordinator',
      contact: 'Fellowship Hall & Prayer Room',
      email: 'peter.kamel@vbtcamp.org',
    },
  },
  {
    id: 'team_welcoming_hospitality',
    name: 'Camp Welcoming & Check-In Squad',
    sport: 'Volleyball',
    category: 'hospitality',
    ageGroup: 'All Ages',
    servingStyle: SERVING_STYLES.HELPING,
    description: 'Welcoming families, handing out bibs, and guiding first-time attendees.',
    leader: {
      name: 'Sarah Girgis',
      role: 'Hospitality Lead',
      contact: 'Main Entrance Pavilion',
      email: 'sarah.girgis@vbtcamp.org',
    },
  },
];

export const DEFAULT_FALLBACK_OPPORTUNITIES = [
  {
    id: 'opp_court_station_assistant',
    title: 'Court Referee & Station Assistant',
    role: 'referee',
    sport: 'Football',
    date: 'Next Camp Saturday, 9:00 AM',
    spotsNeeded: 4,
    spotsFilled: 1,
    leaderName: 'Captain Mina Farag',
  },
  {
    id: 'opp_hydration_safety_helper',
    title: 'Hydration & Safety Station Helper',
    role: 'first_aid',
    sport: 'All Sports',
    date: 'Upcoming Friday Meeting, 5:30 PM',
    spotsNeeded: 5,
    spotsFilled: 2,
    leaderName: 'David Shenouda',
  },
  {
    id: 'opp_media_photo_volunteer',
    title: 'Camp Photographer & Action Shots',
    role: 'media',
    sport: 'Basketball',
    date: 'Saturday Tournament, 10:00 AM',
    spotsNeeded: 3,
    spotsFilled: 0,
    leaderName: 'Fadi Mourad',
  },
  {
    id: 'opp_welcoming_greeter',
    title: 'Welcome Desk & Check-In Guide',
    role: 'general',
    sport: 'Volleyball',
    date: 'Saturday Morning, 8:30 AM',
    spotsNeeded: 4,
    spotsFilled: 1,
    leaderName: 'Sarah Girgis',
  },
  {
    id: 'opp_devotional_circle_helper',
    title: 'Youth Circle Prayer & Encourager',
    role: 'praise',
    sport: 'Running',
    date: 'Friday Evening Youth Hour, 6:00 PM',
    spotsNeeded: 3,
    spotsFilled: 1,
    leaderName: 'Peter Kamel',
  },
];

export const DEFAULT_FALLBACK_TRAININGS = [
  {
    id: 'vbt_child_safety_101',
    title: 'Child Safety & Youth Protection Protocols',
    category: 'child_safety',
    durationMinutes: 25,
    badgeIcon: '🛡️',
    description: 'Mandatory safeguarding guidelines, two-leader rule, and youth emergency protocols.',
  },
  {
    id: 'vbt_referee_rules_101',
    title: 'Sports Camp Rules & Christian Refereeing',
    category: 'referee_rules',
    durationMinutes: 20,
    badgeIcon: '⚖️',
    description: 'Mastering court rules, fair play arbitration, and Christian sportsmanship values.',
  },
  {
    id: 'vbt_logistics_safety_101',
    title: 'Logistics, Hydration & Field Safety',
    category: 'logistics_firstaid',
    durationMinutes: 15,
    badgeIcon: '🩹',
    description: 'Field safety, equipment checklists, hydration, and primary first aid response.',
  },
  {
    id: 'vbt_spiritual_foundations_101',
    title: 'Spiritual Leadership & Servant Heart',
    category: 'spiritual_leadership',
    durationMinutes: 30,
    badgeIcon: '🕊️',
    description: 'Leading prayer circles, servant humility, and mentoring youth athletes in Christ.',
  },
  {
    id: 'vbt_media_storytelling_101',
    title: 'Camp Media, Live Stream & Photo Ethics',
    category: 'media',
    durationMinutes: 15,
    badgeIcon: '📸',
    description: 'Capturing high-energy moments while honoring member privacy and camp brand values.',
  },
];

export const DEFAULT_FALLBACK_COORDINATORS = {
  SPORTS: {
    name: 'Captain Mina Farag',
    role: 'Sports Director & Tournament Coordinator',
    email: 'sports@vbtcamp.org',
    contactChannel: 'WhatsApp / On-Court Station',
  },
  YOUTH: {
    name: 'Servant Mary George',
    role: 'Youth Ministry Coordinator',
    email: 'youth@vbtcamp.org',
    contactChannel: 'Welcome Desk & Leader Room',
  },
  LOGISTICS: {
    name: 'David Shenouda',
    role: 'Operations & Safety Coordinator',
    email: 'operations@vbtcamp.org',
    contactChannel: 'Logistics Hub & Field Tent',
  },
  MEDIA: {
    name: 'Fadi Mourad',
    role: 'Media & Creative Lead',
    email: 'media@vbtcamp.org',
    contactChannel: 'Production Booth',
  },
  CARE: {
    name: 'Peter Kamel',
    role: 'Servant Care Coordinator',
    email: 'care@vbtcamp.org',
    contactChannel: 'Fellowship Hall & Prayer Room',
  },
};

// ────────────────────────────────────────────────────────────
// Firestore Document Path Helpers
// ────────────────────────────────────────────────────────────

export function onboardingResponsesCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/onboarding_responses`;
}

export function onboardingResponseDocPath(communityId = DEFAULT_COMMUNITY_ID, memberId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/onboarding_responses/${memberId}`;
}

export function roleRequestsCollectionPath(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/role_requests`;
}

export function roleRequestDocPath(communityId = DEFAULT_COMMUNITY_ID, requestId) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  return `vbt_communities/${commId}/role_requests/${requestId}`;
}

// ────────────────────────────────────────────────────────────
// Explainable Recommendation Engine
// ────────────────────────────────────────────────────────────

/**
 * Computes explainable, personalized recommendations based on member's onboarding answers.
 *
 * Fully supports empty or skipped questions, generating transparent rationale strings for:
 * 1. Recommended team or group
 * 2. First serving opportunity
 * 3. Recommended training module
 * 4. Suitable leader or coordinator contact
 *
 * @param {Object} responses Member's answers
 * @param {Array} [availableTeams=[]] Current active community teams
 * @param {Array} [availableOpportunities=[]] Current active serving opportunities
 * @param {Array} [availableTrainings=[]] Current training modules
 * @returns {Object} Complete explainable recommendations package
 */
export function computeOnboardingRecommendations(
  responses = {},
  availableTeams = [],
  availableOpportunities = [],
  availableTrainings = []
) {
  const sports = Array.isArray(responses?.sports) ? responses.sports : [];
  const ageGroups = Array.isArray(responses?.ageGroups) ? responses.ageGroups : [];
  const servingStyle = responses?.servingStyle || '';
  const frequency = responses?.frequency || '';
  const skills = Array.isArray(responses?.skills) ? responses.skills : [];
  const workStylePreference = responses?.workStylePreference || '';

  const hasAnyAnswers =
    sports.length > 0 ||
    ageGroups.length > 0 ||
    Boolean(servingStyle) ||
    Boolean(frequency) ||
    skills.length > 0 ||
    Boolean(workStylePreference);

  // Teams catalog to search
  const teamsCatalog = (Array.isArray(availableTeams) && availableTeams.length > 0)
    ? availableTeams
    : DEFAULT_FALLBACK_TEAMS;

  // Opportunities catalog to search
  const oppsCatalog = (Array.isArray(availableOpportunities) && availableOpportunities.length > 0)
    ? availableOpportunities
    : DEFAULT_FALLBACK_OPPORTUNITIES;

  // Trainings catalog to search
  const trainingsCatalog = (Array.isArray(availableTrainings) && availableTrainings.length > 0)
    ? availableTrainings
    : DEFAULT_FALLBACK_TRAININGS;

  // 1. Team Recommendation with Explainable Rationale
  let bestTeam = teamsCatalog[0];
  let highestTeamScore = -1;
  let teamRationaleParts = [];

  for (const team of teamsCatalog) {
    let score = 0;
    const reasons = [];

    // Sport alignment
    if (sports.length > 0 && team.sport) {
      const match = sports.find(
        (s) => team.sport.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(team.sport.toLowerCase())
      );
      if (match) {
        score += 35;
        reasons.push(`matches your passion for ${match}`);
      }
    }

    // Serving style alignment
    if (servingStyle) {
      const teamStyle = team.servingStyle || team.category || '';
      if (teamStyle.toLowerCase().includes(servingStyle.toLowerCase())) {
        score += 30;
        reasons.push(`aligns with your preferred ${servingStyle.replace('_', ' ')} serving style`);
      }
    }

    // Age group alignment
    if (ageGroups.length > 0 && team.ageGroup) {
      const matchAge = ageGroups.find(
        (a) => a === 'All Ages' || team.ageGroup === 'All Ages' || team.ageGroup.toLowerCase().includes(a.toLowerCase())
      );
      if (matchAge) {
        score += 20;
        reasons.push(`connects with the ${team.ageGroup} age group you feel comfortable with`);
      }
    }

    // Skills match
    if (skills.length > 0) {
      const hasCoaching = skills.includes(SKILLS_EXPERIENCE.SPORTS_COACHING) && (team.category === 'sports_station' || team.servingStyle === 'sports_stations');
      const hasFirstAid = skills.includes(SKILLS_EXPERIENCE.FIRST_AID) && team.category === 'logistics';
      const hasMedia = (skills.includes(SKILLS_EXPERIENCE.AUDIO_VIDEO) || skills.includes(SKILLS_EXPERIENCE.PHOTOGRAPHY)) && team.category === 'media';
      const hasTeaching = skills.includes(SKILLS_EXPERIENCE.TEACHING) && (team.category === 'youth_fellowship' || team.category === 'bible_study');
      const hasWelcoming = skills.includes(SKILLS_EXPERIENCE.WELCOMING) && team.category === 'hospitality';

      if (hasCoaching || hasFirstAid || hasMedia || hasTeaching || hasWelcoming) {
        score += 25;
        const matchedSkillName = hasCoaching
          ? 'sports coaching'
          : hasFirstAid
          ? 'first aid & safety'
          : hasMedia
          ? 'media & audio/video'
          : hasTeaching
          ? 'teaching & mentoring'
          : 'welcoming & hospitality';
        reasons.push(`makes great use of your experience in ${matchedSkillName}`);
      }
    }

    // Work style preference alignment
    if (workStylePreference) {
      if (workStylePreference === WORK_STYLE_PREFERENCES.BEHIND_THE_SCENES) {
        if (team.category === 'logistics' || team.category === 'media') {
          score += 15;
          reasons.push('supports your behind-the-scenes preference');
        }
      } else if (workStylePreference === WORK_STYLE_PREFERENCES.FRONT_FACING) {
        if (team.category === 'sports_station' || team.category === 'hospitality' || team.category === 'youth_fellowship') {
          score += 15;
          reasons.push('provides the front-facing camper interaction you requested');
        }
      } else if (workStylePreference === WORK_STYLE_PREFERENCES.BALANCED) {
        score += 10;
      }
    }

    if (score > highestTeamScore) {
      highestTeamScore = score;
      bestTeam = team;
      teamRationaleParts = reasons;
    }
  }

  // Construct complete reasoning string for Team
  let teamReasoning = '';
  if (!hasAnyAnswers || teamRationaleParts.length === 0) {
    teamReasoning = `Recommended as an open, welcoming team to help you discover your sweet spot in VBT Sports Camp with supportive peers.`;
  } else {
    teamReasoning = `Recommended because it ${teamRationaleParts.join(', and ')}.`;
  }

  // 2. First Serving Opportunity Recommendation with Explainable Rationale
  let bestOpp = oppsCatalog[0];
  let highestOppScore = -1;
  let oppRationaleParts = [];

  for (const opp of oppsCatalog) {
    let score = 0;
    const reasons = [];

    const spotsAvailable = (typeof opp.spotsNeeded === 'number' && typeof opp.spotsFilled === 'number')
      ? opp.spotsNeeded - opp.spotsFilled
      : 2;

    if (spotsAvailable > 0) {
      score += 10;
    }

    // Role / style matching
    if (servingStyle) {
      if (
        (servingStyle === SERVING_STYLES.SPORTS_STATIONS && (opp.role === 'referee' || opp.role === 'stations')) ||
        (servingStyle === SERVING_STYLES.MEDIA && opp.role === 'media') ||
        (servingStyle === SERVING_STYLES.LOGISTICS && (opp.role === 'first_aid' || opp.role === 'logistics' || opp.role === 'setup')) ||
        (servingStyle === SERVING_STYLES.PRAYER && opp.role === 'praise') ||
        (servingStyle === SERVING_STYLES.HELPING && (opp.role === 'general' || opp.role === 'first_aid'))
      ) {
        score += 35;
        reasons.push(`matches your interest in ${servingStyle.replace('_', ' ')}`);
      }
    }

    // Sport matching
    if (sports.length > 0 && opp.sport) {
      const matchSport = sports.find(
        (s) => opp.sport.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(opp.sport.toLowerCase())
      );
      if (matchSport) {
        score += 25;
        reasons.push(`takes place in your favorite sport (${matchSport})`);
      }
    }

    // Skills match
    if (skills.length > 0) {
      if (skills.includes(SKILLS_EXPERIENCE.FIRST_AID) && opp.role === 'first_aid') {
        score += 25;
        reasons.push('leverages your first aid readiness');
      } else if (skills.includes(SKILLS_EXPERIENCE.PHOTOGRAPHY) && opp.role === 'media') {
        score += 25;
        reasons.push('lets you apply photography skills right away');
      } else if (skills.includes(SKILLS_EXPERIENCE.SPORTS_COACHING) && opp.role === 'referee') {
        score += 25;
        reasons.push('applies your sports coaching & rules experience');
      } else if (skills.includes(SKILLS_EXPERIENCE.WELCOMING) && opp.role === 'general') {
        score += 20;
        reasons.push('fits your welcoming warmth');
      }
    }

    if (score > highestOppScore) {
      highestOppScore = score;
      bestOpp = opp;
      oppRationaleParts = reasons;
    }
  }

  let opportunityReasoning = '';
  if (!hasAnyAnswers || oppRationaleParts.length === 0) {
    opportunityReasoning = `Ideal first-time serving step that requires no prior experience, pairs you with a seasoned servant, and has immediate open spots.`;
  } else {
    opportunityReasoning = `Recommended because it ${oppRationaleParts.join(', and ')}, offering an encouraging first step.`;
  }

  // 3. Recommended Training Module with Explainable Rationale
  let recommendedTraining = trainingsCatalog[0];
  let trainingReasoning = '';

  const wantsKids = ageGroups.some((g) => g.includes('Kids') || g.includes('Pre-teens'));
  const wantsMedia =
    servingStyle === SERVING_STYLES.MEDIA ||
    skills.includes(SKILLS_EXPERIENCE.AUDIO_VIDEO) ||
    skills.includes(SKILLS_EXPERIENCE.PHOTOGRAPHY);
  const wantsSafety =
    servingStyle === SERVING_STYLES.LOGISTICS ||
    skills.includes(SKILLS_EXPERIENCE.FIRST_AID);
  const wantsSpiritual =
    servingStyle === SERVING_STYLES.PRAYER ||
    servingStyle === SERVING_STYLES.LEADING ||
    skills.includes(SKILLS_EXPERIENCE.TEACHING);
  const wantsSports =
    servingStyle === SERVING_STYLES.SPORTS_STATIONS ||
    skills.includes(SKILLS_EXPERIENCE.SPORTS_COACHING) ||
    (sports.length > 0 && !wantsMedia && !wantsSafety && !wantsSpiritual);

  if (wantsKids) {
    recommendedTraining =
      trainingsCatalog.find((t) => t.category === 'child_safety' || t.id.includes('safety')) || trainingsCatalog[0];
    trainingReasoning = `Essential safeguarding certification: Since you indicated interest in serving children or pre-teens, this youth protection course is the required first milestone for safety.`;
  } else if (wantsMedia) {
    recommendedTraining =
      trainingsCatalog.find((t) => t.category === 'media' || t.id.includes('media')) || trainingsCatalog[4] || trainingsCatalog[0];
    trainingReasoning = `Creative standards: Teaches action photography, livestreaming best practices, and respecting camper privacy boundaries.`;
  } else if (wantsSafety) {
    recommendedTraining =
      trainingsCatalog.find((t) => t.category === 'logistics_firstaid' || t.id.includes('logistics')) || trainingsCatalog[2] || trainingsCatalog[0];
    trainingReasoning = `Field protection: Trains you in heat safety, hydration checkpoints, emergency response, and equipment management.`;
  } else if (wantsSports) {
    recommendedTraining =
      trainingsCatalog.find((t) => t.category === 'referee_rules' || t.id.includes('referee')) || trainingsCatalog[1] || trainingsCatalog[0];
    trainingReasoning = `Court readiness: Equips you with Christian refereeing standards, tournament rules, and fair play mediation on the sports courts.`;
  } else if (wantsSpiritual) {
    recommendedTraining =
      trainingsCatalog.find((t) => t.category === 'spiritual_leadership' || t.id.includes('spiritual')) || trainingsCatalog[3] || trainingsCatalog[0];
    trainingReasoning = `Spiritual grounding: Deepens your heart of humble servant leadership and prayerful presence with campers.`;
  } else {
    recommendedTraining = trainingsCatalog[0];
    trainingReasoning = `Foundational orientation: The primary onboarding module recommended for all new servants joining VBT Sports Camp.`;
  }

  // 4. Suitable Leader or Coordinator Contact
  let coordinatorContact = DEFAULT_FALLBACK_COORDINATORS.CARE;
  let coordinatorReasoning = '';

  if (servingStyle === SERVING_STYLES.MEDIA || wantsMedia) {
    coordinatorContact = DEFAULT_FALLBACK_COORDINATORS.MEDIA;
    coordinatorReasoning = `Media & Creative Lead who oversees photography, video gear, and tournament live coverage.`;
  } else if (servingStyle === SERVING_STYLES.LOGISTICS || wantsSafety) {
    coordinatorContact = DEFAULT_FALLBACK_COORDINATORS.LOGISTICS;
    coordinatorReasoning = `Operations & Field Coordinator who manages field logistics, equipment, hydration, and first aid safety.`;
  } else if (wantsKids) {
    coordinatorContact = DEFAULT_FALLBACK_COORDINATORS.YOUTH;
    coordinatorReasoning = `Youth Ministry Coordinator who guides servants caring for young campers and children's stations.`;
  } else if (wantsSports) {
    coordinatorContact = DEFAULT_FALLBACK_COORDINATORS.SPORTS;
    coordinatorReasoning = `Sports Director who coordinates court stations, referee schedules, and athletic tournaments.`;
  } else {
    coordinatorContact = DEFAULT_FALLBACK_COORDINATORS.CARE;
    coordinatorReasoning = `Servant Care Coordinator who personally welcomes new members and helps them find their community home.`;
  }

  // Derive Fit Summary Archetype
  let archetype = 'Community Explorer';
  let topStrengths = ['Open Mind', 'Community Heart', 'Willingness to Serve'];

  if (wantsKids && wantsSports) {
    archetype = 'Youth Athletic Coach & Mentor';
    topStrengths = ['Athletic Energy', 'Youth Encouragement', 'Team Building'];
  } else if (wantsKids) {
    archetype = 'Youth Encourager & Station Mentor';
    topStrengths = ['Youth Mentoring', 'Patience', 'Active Encouragement'];
  } else if (wantsSports) {
    archetype = 'Court Sports & Referee Servant';
    topStrengths = ['Game Knowledge', 'Fair Play', 'Sportsmanship'];
  } else if (wantsSafety) {
    archetype = 'Field Guardian & Operations Anchor';
    topStrengths = ['Attention to Detail', 'Safety Readiness', 'Logistical Reliability'];
  } else if (wantsMedia) {
    archetype = 'Camp Storyteller & Creative Media Specialist';
    topStrengths = ['Visual Creativity', 'Digital Storytelling', 'High Energy'];
  } else if (wantsSpiritual) {
    archetype = 'Servant Fellowship & Pastoral Encourager';
    topStrengths = ['Spiritual Empathy', 'Patience', 'Quiet Service'];
  } else if (skills.includes(SKILLS_EXPERIENCE.WELCOMING)) {
    archetype = 'Hospitality & Warm Welcoming Ambassador';
    topStrengths = ['Warm Hospitality', 'Active Listening', 'Joyful Spirit'];
  }

  return {
    recommendedTeam: {
      id: bestTeam.id || 'team_default',
      name: bestTeam.name || 'VBT Community Team',
      category: bestTeam.category || 'general',
      sport: bestTeam.sport || 'Multi-sport',
      ageGroup: bestTeam.ageGroup || 'All Ages',
      description: bestTeam.description || '',
      reasoning: teamReasoning,
      score: highestTeamScore > 0 ? highestTeamScore : 10,
      leader: bestTeam.leader || {
        name: bestTeam.leaderName || coordinatorContact.name,
        role: bestTeam.leaderRole || coordinatorContact.role,
        contact: bestTeam.leaderPhone || coordinatorContact.contactChannel,
      },
    },
    recommendedOpportunity: {
      id: bestOpp.id || 'opp_default',
      title: bestOpp.title || 'First-Time Serving Station',
      role: bestOpp.role || 'volunteer',
      sport: bestOpp.sport || 'Multi-sport',
      date: bestOpp.date || 'Upcoming Weekend Session',
      spotsRemaining: Math.max(1, (bestOpp.spotsNeeded || 3) - (bestOpp.spotsFilled || 0)),
      reasoning: opportunityReasoning,
      score: highestOppScore > 0 ? highestOppScore : 10,
      leaderName: bestOpp.leaderName || coordinatorContact.name,
    },
    recommendedTraining: {
      id: recommendedTraining.id,
      title: recommendedTraining.title,
      category: recommendedTraining.category,
      durationMinutes: recommendedTraining.durationMinutes || 20,
      badgeIcon: recommendedTraining.badgeIcon || '🛡️',
      description: recommendedTraining.description || '',
      reasoning: trainingReasoning,
    },
    coordinatorContact: {
      name: coordinatorContact.name,
      role: coordinatorContact.role,
      email: coordinatorContact.email,
      contactChannel: coordinatorContact.contactChannel,
      reasoning: coordinatorReasoning,
    },
    fitSummary: {
      archetype,
      topStrengths,
      suggestedPathway: 'Explorer -> Volunteer Servant -> Certified Station Servant',
    },
    explanations: {
      teamReason: teamReasoning,
      opportunityReason: opportunityReasoning,
      trainingReason: trainingReasoning,
      contactReason: coordinatorReasoning,
    },
  };
}

// ────────────────────────────────────────────────────────────
// Firestore Persistence & Member Interest Tracking
// ────────────────────────────────────────────────────────────

/**
 * Saves a member's onboarding questionnaire responses.
 *
 * CRITICAL RULE: Stores interests in a dedicated onboarding responses collection
 * and DOES NOT modify authorized member roles. Members can freely update answers later.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId Unique member identifier
 * @param {Object} responses Member answers and metadata
 * @returns {Promise<Object>} Stored response payload
 */
export async function saveOnboardingResponses(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  responses = {}
) {
  if (!memberId) {
    throw new Error('memberId is required to save onboarding responses');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, onboardingResponseDocPath(commId, memberId));

  // Compute updated recommendations alongside responses
  const recommendations = responses.computedRecommendations || computeOnboardingRecommendations(responses);

  const cleanResponses = {
    sports: Array.isArray(responses.sports) ? responses.sports : [],
    ageGroups: Array.isArray(responses.ageGroups) ? responses.ageGroups : [],
    servingStyle: responses.servingStyle || '',
    frequency: responses.frequency || '',
    skills: Array.isArray(responses.skills) ? responses.skills : [],
    workStylePreference: responses.workStylePreference || '',
    isSkipped: Boolean(responses.isSkipped),
    hasCompletedAll: Boolean(responses.hasCompletedAll),
    notes: responses.notes || '',
  };

  const payload = {
    memberId,
    communityId: commId,
    responses: cleanResponses,
    recommendations,
    updatedAt: serverTimestamp(),
  };

  if (!responses.hasPreviousSave) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(docRef, payload, { merge: true });

  // If member chose sports interests, safely mirror into allowed self-edit profile
  if (cleanResponses.sports.length > 0) {
    try {
      const memberDocRef = doc(db, `vbt_communities/${commId}/members/${memberId}`);
      await setDoc(
        memberDocRef,
        {
          sportsInterests: cleanResponses.sports,
          hasCompletedOnboarding: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      // Non-blocking: member doc might be permission-scoped in tests
      console.warn('[OnboardingService] Mirroring sports to member profile skipped:', err?.message);
    }
  }

  return {
    id: memberId,
    ...payload,
  };
}

/**
 * Retrieves a member's stored onboarding questionnaire responses and recommendations.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId
 * @returns {Promise<Object|null>}
 */
export async function getOnboardingResponses(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId
) {
  if (!memberId) return null;

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  try {
    const docRef = doc(db, onboardingResponseDocPath(commId, memberId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error(`[OnboardingService] Error fetching responses for ${memberId}:`, error);
    return null;
  }
}

/**
 * Subscribes to real-time updates for a member's onboarding responses.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId
 * @param {Function} callback
 * @returns {Function} Unsubscribe callback
 */
export function subscribeToOnboardingResponses(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  callback
) {
  if (!memberId || typeof callback !== 'function') return () => {};

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, onboardingResponseDocPath(commId, memberId));

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    },
    (err) => {
      console.error(`[OnboardingService] Subscription error for ${memberId}:`, err);
      callback(null);
    }
  );
}

// ────────────────────────────────────────────────────────────
// Leader Approval Workflows for Sensitive Roles & Assignments
// ────────────────────────────────────────────────────────────

/**
 * Submits a formal request for a team join, opportunity assignment, or role elevation.
 *
 * CRITICAL RULE: NEVER automatically assigns a sensitive role. Status starts strictly
 * as PENDING_LEADER_REVIEW (`pending_leader_review`). An authorized leader must approve
 * before the assignment or role transition is confirmed.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} memberId
 * @param {Object} requestData
 * @param {string} requestData.requestedRole Target role or position
 * @param {string} [requestData.targetType='team'] 'team' | 'opportunity' | 'role'
 * @param {string} [requestData.targetId] ID of target team or opportunity
 * @param {string} [requestData.targetTitle] Human-readable title
 * @param {string} [requestData.memberName] Submitter name
 * @param {string} [requestData.notes] Member self-statement or motivation
 * @param {Object} [requestData.responsesSummary] Snapshot of onboarding answers
 * @returns {Promise<Object>} Created request document
 */
export async function requestRoleOrAssignmentApproval(
  communityId = DEFAULT_COMMUNITY_ID,
  memberId,
  requestData = {}
) {
  if (!memberId) {
    throw new Error('memberId is required to submit approval request');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const requestId = requestData.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docRef = doc(db, roleRequestDocPath(commId, requestId));

  const requestedRole = requestData.requestedRole || requestData.role || VBT_ROLES.VOLUNTEER;
  const targetType = requestData.targetType || 'team'; // 'team' | 'opportunity' | 'role'

  const requestRecord = {
    id: requestId,
    communityId: commId,
    memberId,
    memberName: requestData.memberName || 'Community Member',
    memberEmail: requestData.memberEmail || '',
    requestedRole,
    targetType,
    targetId: requestData.targetId || null,
    targetTitle: requestData.targetTitle || 'Serving Position',
    notes: requestData.notes || '',
    responsesSummary: requestData.responsesSummary || null,
    // CRITICAL: Always requires leader review; never automatically confirmed
    status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, requestRecord, { merge: true });

  // Create audit trail entry
  try {
    const auditRecord = createAuditRecord({
      action: AUDIT_ACTIONS.ASSIGNMENT_CREATED,
      targetId: requestId,
      targetType: 'role_request',
      performedBy: memberId,
      actorRole: 'member',
      communityId: commId,
      details: {
        requestedRole,
        targetType,
        targetId: requestData.targetId,
        targetTitle: requestData.targetTitle,
        status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
      },
    });

    const auditRef = doc(db, `vbt_communities/${commId}/audit_logs/${auditRecord.id}`);
    await setDoc(auditRef, auditRecord);
  } catch (auditErr) {
    console.warn('[OnboardingService] Audit record logging notice:', auditErr?.message);
  }

  return requestRecord;
}

/**
 * Reviews and updates a pending role or assignment approval request.
 * Can only be executed by a leader or coordinator.
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @param {string} requestId
 * @param {Object} reviewData
 * @param {boolean} reviewData.approved Whether the request is approved
 * @param {string} reviewData.reviewerId ID of leader/coordinator
 * @param {string} reviewData.reviewerName Name of leader
 * @param {string} [reviewData.reviewNotes=''] Leader feedback
 * @returns {Promise<Object>}
 */
export async function reviewRoleRequest(
  communityId = DEFAULT_COMMUNITY_ID,
  requestId,
  reviewData = {}
) {
  if (!requestId) {
    throw new Error('requestId is required to review role request');
  }

  const commId = communityId || DEFAULT_COMMUNITY_ID;
  const docRef = doc(db, roleRequestDocPath(commId, requestId));

  const isApproved = Boolean(reviewData.approved);
  const targetStatus = isApproved ? ASSIGNMENT_STATUS.CONFIRMED : ASSIGNMENT_STATUS.DECLINED;

  const updates = {
    status: targetStatus,
    reviewedBy: reviewData.reviewerName || reviewData.reviewerId || 'Leader',
    reviewerId: reviewData.reviewerId || null,
    reviewedAt: serverTimestamp(),
    reviewNotes: reviewData.reviewNotes || '',
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, updates, { merge: true });

  // Record audit log
  try {
    const auditRecord = createAuditRecord({
      action: isApproved ? AUDIT_ACTIONS.ROLE_APPROVED : AUDIT_ACTIONS.ASSIGNMENT_DECLINED,
      targetId: requestId,
      targetType: 'role_request',
      performedBy: reviewData.reviewerId || 'leader',
      actorRole: 'coordinator',
      communityId: commId,
      details: {
        approved: isApproved,
        status: targetStatus,
        notes: reviewData.reviewNotes,
      },
    });

    const auditRef = doc(db, `vbt_communities/${commId}/audit_logs/${auditRecord.id}`);
    await setDoc(auditRef, auditRecord);
  } catch (auditErr) {
    console.warn('[OnboardingService] Audit log warning on review:', auditErr?.message);
  }

  return { id: requestId, ...updates };
}

/**
 * Fetches all pending role approval requests for a community (for coordinators).
 *
 * @param {string} [communityId=DEFAULT_COMMUNITY_ID]
 * @returns {Promise<Array>}
 */
export async function getPendingRoleRequests(communityId = DEFAULT_COMMUNITY_ID) {
  const commId = communityId || DEFAULT_COMMUNITY_ID;
  try {
    const colRef = collection(db, roleRequestsCollectionPath(commId));
    const snap = await getDocs(colRef);
    const requests = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.status === ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW) {
        requests.push({ id: d.id, ...data });
      }
    });
    return requests;
  } catch (error) {
    console.error('[OnboardingService] Error fetching pending role requests:', error);
    return [];
  }
}
