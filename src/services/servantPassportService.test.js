import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PASSPORT_TIERS,
  PASSPORT_TIER_ORDER,
  STANDARD_SERVANT_ROLES,
  getTierById,
  getTierByLevel,
  getNextTier,
  getPreviousTier,
  canAccessPassport,
  canApprovePromotion,
  generateDefaultPassport,
  computeGrowthNextStep,
  getServantPassport,
  requestTierPromotion,
  approveTierPromotion,
  addEncouragementNote,
  endorseSkill,
  recordActivityServed,
  subscribeToServantPassport,
  passportDocPath,
} from './servantPassportService';

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, path) => ({ type: 'collection', path })),
    doc: vi.fn((_db, path, id) => ({
      type: 'doc',
      path: id ? `${path}/${id}` : path,
    })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

import { getDoc, setDoc, onSnapshot } from 'firebase/firestore';

describe('ServantPassportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // 1. 7-Tier Pathway Definition & Tier Helpers
  // ─────────────────────────────────────────────
  describe('7-Tier Pathway Definition & Helpers', () => {
    it('defines the explicit 7-tier progression pathway in exact order', () => {
      expect(PASSPORT_TIER_ORDER).toEqual([
        'interested',
        'volunteer',
        'trained_servant',
        'active_servant',
        'team_leader',
        'coordinator',
        'mentor',
      ]);
    });

    it('defines rich metadata for each of the 7 tiers', () => {
      expect(PASSPORT_TIERS.INTERESTED.level).toBe(1);
      expect(PASSPORT_TIERS.INTERESTED.title).toBe('Interested');
      expect(PASSPORT_TIERS.INTERESTED.badgeIcon).toBe('🌱');

      expect(PASSPORT_TIERS.VOLUNTEER.level).toBe(2);
      expect(PASSPORT_TIERS.VOLUNTEER.title).toBe('Volunteer');
      expect(PASSPORT_TIERS.VOLUNTEER.badgeIcon).toBe('🤝');

      expect(PASSPORT_TIERS.TRAINED_SERVANT.level).toBe(3);
      expect(PASSPORT_TIERS.TRAINED_SERVANT.title).toBe('Trained servant');
      expect(PASSPORT_TIERS.TRAINED_SERVANT.badgeIcon).toBe('📜');

      expect(PASSPORT_TIERS.ACTIVE_SERVANT.level).toBe(4);
      expect(PASSPORT_TIERS.ACTIVE_SERVANT.title).toBe('Active servant');
      expect(PASSPORT_TIERS.ACTIVE_SERVANT.badgeIcon).toBe('⭐');

      expect(PASSPORT_TIERS.TEAM_LEADER.level).toBe(5);
      expect(PASSPORT_TIERS.TEAM_LEADER.title).toBe('Team leader');
      expect(PASSPORT_TIERS.TEAM_LEADER.badgeIcon).toBe('🛡️');

      expect(PASSPORT_TIERS.COORDINATOR.level).toBe(6);
      expect(PASSPORT_TIERS.COORDINATOR.title).toBe('Coordinator');
      expect(PASSPORT_TIERS.COORDINATOR.badgeIcon).toBe('👑');

      expect(PASSPORT_TIERS.MENTOR.level).toBe(7);
      expect(PASSPORT_TIERS.MENTOR.title).toBe('Mentor');
      expect(PASSPORT_TIERS.MENTOR.badgeIcon).toBe('🕊️');
    });

    it('correctly resolves getTierById with normalization', () => {
      expect(getTierById('interested').level).toBe(1);
      expect(getTierById('volunteer').level).toBe(2);
      expect(getTierById('trained_servant').level).toBe(3);
      expect(getTierById('trained servant').level).toBe(3);
      expect(getTierById('active_servant').level).toBe(4);
      expect(getTierById('team_leader').level).toBe(5);
      expect(getTierById('coordinator').level).toBe(6);
      expect(getTierById('mentor').level).toBe(7);
      expect(getTierById('unknown_tier').level).toBe(1); // Fallback to level 1
    });

    it('resolves getTierByLevel for levels 1 through 7', () => {
      expect(getTierByLevel(1).id).toBe('interested');
      expect(getTierByLevel(2).id).toBe('volunteer');
      expect(getTierByLevel(3).id).toBe('trained_servant');
      expect(getTierByLevel(4).id).toBe('active_servant');
      expect(getTierByLevel(5).id).toBe('team_leader');
      expect(getTierByLevel(6).id).toBe('coordinator');
      expect(getTierByLevel(7).id).toBe('mentor');
      expect(getTierByLevel(99).id).toBe('mentor');
    });

    it('finds next and previous tiers along the progression path', () => {
      expect(getNextTier('interested').id).toBe('volunteer');
      expect(getNextTier('active_servant').id).toBe('team_leader');
      expect(getNextTier('mentor')).toBeNull(); // Max tier

      expect(getPreviousTier('mentor').id).toBe('coordinator');
      expect(getPreviousTier('volunteer').id).toBe('interested');
      expect(getPreviousTier('interested')).toBeNull(); // Lowest tier
    });

    it('lists recognized standard servant roles', () => {
      expect(STANDARD_SERVANT_ROLES).toContain('Referee');
      expect(STANDARD_SERVANT_ROLES).toContain('Logistics');
      expect(STANDARD_SERVANT_ROLES).toContain('Prayer Station');
      expect(STANDARD_SERVANT_ROLES).toContain('Sound & AV');
    });
  });

  // ─────────────────────────────────────────────
  // 2. Access Boundaries & Privacy Controls
  // ─────────────────────────────────────────────
  describe('Access Boundaries & Permissions', () => {
    const memberId = 'servant_mark_123';
    const selfUser = { id: 'servant_mark_123', name: 'Mark', role: 'volunteer' };
    const adminUser = { id: 'admin_1', name: 'Fr. Daoud', role: 'admin' };
    const coordinatorUser = { id: 'coord_1', name: 'Mina Coord', role: 'coordinator' };
    const pastoralLeaderUser = { id: 'pastor_1', name: 'Abouna', role: 'pastoral_care_leader' };
    const strangerVolunteer = { id: 'stranger_9', name: 'Stranger', role: 'volunteer' };
    const strangerMember = { id: 'member_8', name: 'Normal Member', role: 'member' };

    it('allows members to view their own private passport', () => {
      expect(canAccessPassport(selfUser, memberId)).toBe(true);
    });

    it('allows community-wide leaders (admin, coordinator, pastoral lead) to view passports', () => {
      expect(canAccessPassport(adminUser, memberId)).toBe(true);
      expect(canAccessPassport(coordinatorUser, memberId)).toBe(true);
      expect(canAccessPassport(pastoralLeaderUser, memberId)).toBe(true);
    });

    it('denies access to unauthorized peers, other volunteers, or regular members', () => {
      expect(canAccessPassport(strangerVolunteer, memberId)).toBe(false);
      expect(canAccessPassport(strangerMember, memberId)).toBe(false);
      expect(canAccessPassport(null, memberId)).toBe(false);
    });

    it('enforces authorized scope boundaries for team leaders', () => {
      // Leader assigned to Team Red
      const teamLeaderRed = {
        id: 'lead_red',
        role: 'team_leader',
        assignedTeams: ['RED'],
      };

      const memberInRedTeam = { teamCode: 'RED' };
      const memberInBlueTeam = { teamCode: 'BLUE' };

      expect(canAccessPassport(teamLeaderRed, memberId, memberInRedTeam)).toBe(true);
      expect(canAccessPassport(teamLeaderRed, memberId, memberInBlueTeam)).toBe(false);

      // Leader with specific assigned member IDs
      const teamLeaderScoped = {
        id: 'lead_scoped',
        role: 'team_leader',
        assignedMembers: [memberId],
      };
      expect(canAccessPassport(teamLeaderScoped, memberId)).toBe(true);
      expect(canAccessPassport(teamLeaderScoped, 'other_member_555')).toBe(false);
    });

    it('verifies canApprovePromotion strictly allows authorized leaders only', () => {
      expect(canApprovePromotion({ role: 'admin' })).toBe(true);
      expect(canApprovePromotion({ role: 'coordinator' })).toBe(true);
      expect(canApprovePromotion({ role: 'team_leader' })).toBe(true);
      expect(canApprovePromotion({ role: 'service_leader' })).toBe(true);
      expect(canApprovePromotion({ role: 'volunteer' })).toBe(false);
      expect(canApprovePromotion({ role: 'member' })).toBe(false);
      expect(canApprovePromotion(null)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // 3. computeGrowthNextStep Algorithm
  // ─────────────────────────────────────────────
  describe('computeGrowthNextStep()', () => {
    it('uses warm, uplifting language instead of corporate review jargon', () => {
      const passport = {
        currentTier: 'volunteer',
        activitiesServed: 1,
        trainingsCompleted: [],
        seasonsServing: ['Summer 2026'],
      };
      const step = computeGrowthNextStep(passport);

      expect(step.blessingTitle).toContain('Next Blessing Step');
      expect(step.growthArea).toBeDefined();
      expect(step.growthArea).not.toMatch(/KPI|performance review|underperforming/i);
      expect(step.encouragingMessage).toMatch(/fruitful season|joyful heart|equip/i);
      expect(step.targetTier).toBe('trained_servant');
      expect(step.targetTierBadge).toBe('📜');
    });

    it('evaluates criteria and sets isEligibleForPromotion to false when requirements are unmet', () => {
      const passport = {
        currentTier: 'interested',
        activitiesServed: 0,
        trainingsCompleted: [],
        seasonsServing: [],
        endorsedSkills: [],
      };
      const step = computeGrowthNextStep(passport);

      expect(step.targetTier).toBe('volunteer');
      expect(step.isEligibleForPromotion).toBe(false);
      const actCriteria = step.criteriaStatus.find((c) => c.id === 'activities_served');
      expect(actCriteria.satisfied).toBe(false);
      expect(actCriteria.required).toBe(1);
    });

    it('sets isEligibleForPromotion to true when all required criteria are fulfilled', () => {
      const passport = {
        currentTier: 'volunteer',
        activitiesServed: 2, // Needs >= 2
        trainingsCompleted: [{ id: 'safety_101' }, { id: 'referee_101' }], // Needs >= 2
        seasonsServing: ['Summer 2026'], // Needs >= 1
        endorsedSkills: [{ skill: 'Table Welcoming' }], // Needs >= 1
      };
      const step = computeGrowthNextStep(passport);

      expect(step.targetTier).toBe('trained_servant');
      expect(step.isEligibleForPromotion).toBe(true);
      expect(step.progressPercentage).toBe(100);
    });

    it('handles the highest tier (Mentor - Level 7) with wisdom and crown of stewardship', () => {
      const passport = {
        currentTier: 'mentor',
        activitiesServed: 30,
        trainingsCompleted: Array(8).fill({ id: 'mod' }),
        seasonsServing: ['Summer 2023', 'Summer 2024', 'Summer 2025', 'Summer 2026'],
        endorsedSkills: Array(5).fill({ skill: 'Wisdom' }),
      };
      const step = computeGrowthNextStep(passport);

      expect(step.isMaxTier).toBe(true);
      expect(step.progressPercentage).toBe(100);
      expect(step.blessingTitle).toContain('Crown of Faithful Stewardship');
      expect(step.encouragingMessage).toContain('Beloved mentor');
    });

    it('provides safe fallbacks when passed null or undefined', () => {
      const step = computeGrowthNextStep(null);
      expect(step.currentTier).toBe('interested');
      expect(step.targetTier).toBe('volunteer');
      expect(step.isEligibleForPromotion).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  // 4. getServantPassport()
  // ─────────────────────────────────────────────
  describe('getServantPassport()', () => {
    it('throws Access Denied if requestingUser does not have permission', async () => {
      const stranger = { id: 'stranger', role: 'volunteer' };
      await expect(
        getServantPassport('vbt_main', 'target_member', stranger)
      ).rejects.toThrow('Access denied');
    });

    it('returns existing passport when doc exists and enriches with nextGrowthStep', async () => {
      const memberId = 'servant_peter';
      const self = { id: memberId, role: 'servant' };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          displayName: 'Peter Servant',
          currentTier: 'trained_servant',
          activitiesServed: 3,
          seasonsServing: ['Summer 2025', 'Summer 2026'],
          rolesPerformed: ['Referee', 'Logistics'],
          encouragements: [
            { id: 'enc_1', note: 'God bless your refereeing!', isPrivate: false },
            { id: 'enc_2', note: 'Private pastoral blessing', isPrivate: true },
          ],
        }),
      });

      const passport = await getServantPassport('vbt_main', memberId, self);

      expect(passport.displayName).toBe('Peter Servant');
      expect(passport.currentTier).toBe('trained_servant');
      expect(passport.nextGrowthStep).toBeDefined();
      expect(passport.nextGrowthStep.targetTier).toBe('active_servant');
      expect(passport.rolesPerformed).toContain('Referee');
      // Member sees their own private encouragements
      expect(passport.encouragements.length).toBe(2);
    });

    it('generates a new default passport scaffold when no document exists in Firestore', async () => {
      const memberId = 'new_servant_john';
      const self = { id: memberId, role: 'volunteer', displayName: 'John New' };

      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });
      setDoc.mockResolvedValueOnce(true);

      const passport = await getServantPassport('vbt_main', memberId, self, {
        memberData: { displayName: 'John New' },
      });

      expect(passport.id).toBe(memberId);
      expect(passport.currentTier).toBe('interested');
      expect(passport.tierLevel).toBe(1);
      expect(passport.nextGrowthStep.targetTier).toBe('volunteer');
      expect(passport.leadershipMilestones.length).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────
  // 5. Tier Promotion Workflows
  // ─────────────────────────────────────────────
  describe('Promotion Workflows (requestTierPromotion & approveTierPromotion)', () => {
    it('creates a pending promotion request and persists it', async () => {
      const memberId = 'servant_david';
      const memberUser = { id: memberId, displayName: 'David' };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          currentTier: 'volunteer',
          tierLevel: 2,
          promotionRequests: [],
        }),
      });
      setDoc.mockResolvedValueOnce(true);

      const res = await requestTierPromotion(
        'vbt_main',
        memberId,
        'trained_servant',
        'I completed youth safety and helped at 2 activities!',
        memberUser
      );

      expect(res.success).toBe(true);
      expect(res.request.status).toBe('pending');
      expect(res.request.targetTier).toBe('trained_servant');
      expect(res.request.notes).toContain('completed youth safety');

      expect(setDoc).toHaveBeenCalled();
    });

    it('rejects promotion request if target tier is not higher than current tier', async () => {
      const memberId = 'servant_sarah';
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          currentTier: 'active_servant',
          tierLevel: 4,
          tierTitle: 'Active servant',
        }),
      });

      await expect(
        requestTierPromotion('vbt_main', memberId, 'volunteer', 'Step down')
      ).rejects.toThrow('must be higher than current tier');
    });

    it('rejects tier promotion approval if caller is not an authorized leader', async () => {
      const unauthorizedCaller = { id: 'volunteer_guy', role: 'volunteer' };
      await expect(
        approveTierPromotion('vbt_main', 'servant_1', 'trained_servant', unauthorizedCaller)
      ).rejects.toThrow('Unauthorized: Only authorized leaders can approve tier promotions');
    });

    it('approves tier promotion when called by authorized leader, updating tier history and milestones', async () => {
      const memberId = 'servant_mary';
      const coordinator = { id: 'coord_paul', role: 'coordinator', displayName: 'Paul Coordinator' };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          currentTier: 'volunteer',
          tierLevel: 2,
          promotionRequests: [{ targetTier: 'trained_servant', status: 'pending' }],
          tierHistory: [{ tier: 'volunteer', achievedAt: '2026-01-01' }],
          leadershipMilestones: [],
        }),
      });
      setDoc.mockResolvedValueOnce(true);

      const res = await approveTierPromotion(
        'vbt_main',
        memberId,
        'trained_servant',
        coordinator,
        'Faithful servant with strong child safety dedication'
      );

      expect(res.success).toBe(true);
      expect(res.passport.currentTier).toBe('trained_servant');
      expect(res.passport.tierLevel).toBe(3);
      expect(res.passport.tierHistory[0].tier).toBe('trained_servant');
      expect(res.passport.tierHistory[0].leaderName).toBe('Paul Coordinator');
      expect(res.passport.leadershipMilestones[0].title).toBe('Commissioned as Trained servant');
      expect(res.passport.promotionRequests[0].status).toBe('approved');
    });
  });

  // ─────────────────────────────────────────────
  // 6. Encouragement Notes & Privacy
  // ─────────────────────────────────────────────
  describe('Encouragement Notes & Privacy Preservation', () => {
    it('adds an encouragement note with author details and scripture verse', async () => {
      const memberId = 'servant_timothy';
      const author = { id: 'coach_mina', displayName: 'Coach Mina', role: 'team_leader' };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          encouragements: [],
        }),
      });
      setDoc.mockResolvedValueOnce(true);

      const res = await addEncouragementNote(
        'vbt_main',
        memberId,
        author,
        'You were a tremendous blessing at the tournament prayer station!',
        false,
        { scriptureVerse: 'Colossians 3:23', blessingTag: 'Faithful Heart' }
      );

      expect(res.success).toBe(true);
      expect(res.encouragement.note).toContain('tremendous blessing');
      expect(res.encouragement.authorName).toBe('Coach Mina');
      expect(res.encouragement.scriptureVerse).toBe('Colossians 3:23');
      expect(res.encouragement.isPrivate).toBe(false);
    });

    it('correctly marks and saves private encouragement feedback', async () => {
      const memberId = 'servant_timothy';
      const author = { id: 'pastor_1', displayName: 'Fr. Daoud', role: 'pastoral_care_leader' };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          encouragements: [],
        }),
      });
      setDoc.mockResolvedValueOnce(true);

      const res = await addEncouragementNote(
        'vbt_main',
        memberId,
        author,
        'Confidential pastoral encouragement: Proud of your spiritual growth',
        true
      );

      expect(res.success).toBe(true);
      expect(res.encouragement.isPrivate).toBe(true);
      expect(res.message).toContain('Private blessing recorded');
    });

    it('throws error when attempting to add empty encouragement note or missing author', async () => {
      await expect(
        addEncouragementNote('vbt_main', 'm1', null, 'Good job')
      ).rejects.toThrow('Author user is required');

      await expect(
        addEncouragementNote('vbt_main', 'm1', { id: 'u1' }, '   ')
      ).rejects.toThrow('cannot be empty');
    });
  });

  // ─────────────────────────────────────────────
  // 7. Endorsement & Activity Recording Helpers
  // ─────────────────────────────────────────────
  describe('Skill Endorsements & Activity Recording', () => {
    it('endorses a ministry skill and increments count', async () => {
      const memberId = 'servant_luke';
      const leader = { id: 'lead_1', displayName: 'Leader Peter', role: 'coordinator' };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          displayName: 'Luke',
          endorsedSkills: [
            {
              skill: 'Fair Play Refereeing',
              endorsementsCount: 1,
              endorsers: ['Coach Mina'],
            },
          ],
        }),
      });
      setDoc.mockResolvedValueOnce(true);

      const res = await endorseSkill('vbt_main', memberId, 'Fair Play Refereeing', leader);

      expect(res.success).toBe(true);
      const skill = res.endorsedSkills.find((s) => s.skill === 'Fair Play Refereeing');
      expect(skill.endorsementsCount).toBe(2);
      expect(skill.endorsers).toContain('Leader Peter');
    });

    it('records an activity served, updating role and season lists', async () => {
      const memberId = 'servant_luke';
      const self = { id: memberId, role: 'servant' };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: memberId,
        data: () => ({
          displayName: 'Luke',
          activitiesServed: 2,
          activitiesServedList: [],
          rolesPerformed: ['Referee'],
          seasonsServing: ['Summer 2025'],
        }),
      });
      setDoc.mockResolvedValueOnce(true);

      const res = await recordActivityServed(
        'vbt_main',
        memberId,
        {
          title: 'Opening Match Day',
          role: 'Logistics',
          hoursServed: 3,
          season: 'Summer 2026',
        },
        self
      );

      expect(res.success).toBe(true);
      expect(res.passport.activitiesServed).toBe(1);
      expect(res.passport.rolesPerformed).toContain('Logistics');
      expect(res.passport.rolesPerformed).toContain('Referee');
      expect(res.passport.seasonsServing).toContain('Summer 2026');
    });

    it('subscribes to real-time updates and handles permission checks', () => {
      const memberId = 'servant_sub';
      const onData = vi.fn();
      const onError = vi.fn();

      // Unauthorized subscriber
      const unsubscribeFail = subscribeToServantPassport(
        'vbt_main',
        memberId,
        { id: 'stranger', role: 'member' },
        onData,
        onError
      );
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(typeof unsubscribeFail).toBe('function');

      // Authorized subscriber
      onSnapshot.mockImplementationOnce((_ref, successCb) => {
        successCb({
          exists: () => true,
          id: memberId,
          data: () => ({ currentTier: 'volunteer', activitiesServed: 1 }),
        });
        return vi.fn();
      });

      const unsubscribeOk = subscribeToServantPassport(
        'vbt_main',
        memberId,
        { id: memberId, role: 'volunteer' },
        onData,
        onError
      );
      expect(onData).toHaveBeenCalledWith(
        expect.objectContaining({ currentTier: 'volunteer' })
      );
      expect(typeof unsubscribeOk).toBe('function');
    });
  });
});
