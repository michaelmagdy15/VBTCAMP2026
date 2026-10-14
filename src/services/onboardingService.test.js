import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ONBOARDING_SPORTS,
  ONBOARDING_AGE_GROUPS,
  SERVING_STYLES,
  SERVING_STYLE_OPTIONS,
  SERVING_FREQUENCIES,
  SERVING_FREQUENCY_OPTIONS,
  SKILLS_EXPERIENCE,
  SKILLS_EXPERIENCE_OPTIONS,
  WORK_STYLE_PREFERENCES,
  WORK_STYLE_OPTIONS,
  DEFAULT_FALLBACK_TEAMS,
  DEFAULT_FALLBACK_OPPORTUNITIES,
  DEFAULT_FALLBACK_TRAININGS,
  DEFAULT_FALLBACK_COORDINATORS,
  onboardingResponsesCollectionPath,
  onboardingResponseDocPath,
  roleRequestsCollectionPath,
  roleRequestDocPath,
  computeOnboardingRecommendations,
  saveOnboardingResponses,
  getOnboardingResponses,
  subscribeToOnboardingResponses,
  requestRoleOrAssignmentApproval,
  reviewRoleRequest,
  getPendingRoleRequests,
} from './onboardingService';
import {
  VBT_ROLES,
  ASSIGNMENT_STATUS,
  AUDIT_ACTIONS,
} from '../contracts/communityContracts';

// Mock Firebase module
vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

// Mock Firestore functions
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
    query: vi.fn((...args) => ({ type: 'query', args })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    orderBy: vi.fn((field, dir) => ({ field, dir })),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

import { getDoc, getDocs, setDoc, onSnapshot } from 'firebase/firestore';

describe('OnboardingService - Requirement 2 Find Your Place', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────
  // 1. Constants, Options, and Path Helpers
  // ────────────────────────────────────────────────────────────
  describe('Constants, Enums & Path Helpers', () => {
    it('defines all 7 required sports in ONBOARDING_SPORTS', () => {
      expect(ONBOARDING_SPORTS).toContain('Football');
      expect(ONBOARDING_SPORTS).toContain('Basketball');
      expect(ONBOARDING_SPORTS).toContain('Volleyball');
      expect(ONBOARDING_SPORTS).toContain('Running');
      expect(ONBOARDING_SPORTS).toContain('Table Tennis');
      expect(ONBOARDING_SPORTS).toContain('Fitness/Calisthenics');
      expect(ONBOARDING_SPORTS).toContain('Chess/Board Games');
      expect(ONBOARDING_SPORTS.length).toBe(7);
    });

    it('defines all 5 required age groups in ONBOARDING_AGE_GROUPS', () => {
      expect(ONBOARDING_AGE_GROUPS).toContain('Kids 6-9');
      expect(ONBOARDING_AGE_GROUPS).toContain('Pre-teens 10-12');
      expect(ONBOARDING_AGE_GROUPS).toContain('Teens 13-17');
      expect(ONBOARDING_AGE_GROUPS).toContain('Young Adults');
      expect(ONBOARDING_AGE_GROUPS).toContain('All Ages');
      expect(ONBOARDING_AGE_GROUPS.length).toBe(5);
    });

    it('defines serving styles: leading, helping, media, logistics, prayer, teaching, sports_stations', () => {
      expect(SERVING_STYLES.LEADING).toBe('leading');
      expect(SERVING_STYLES.HELPING).toBe('helping');
      expect(SERVING_STYLES.MEDIA).toBe('media');
      expect(SERVING_STYLES.LOGISTICS).toBe('logistics');
      expect(SERVING_STYLES.PRAYER).toBe('prayer');
      expect(SERVING_STYLES.TEACHING).toBe('teaching');
      expect(SERVING_STYLES.SPORTS_STATIONS).toBe('sports_stations');
      expect(SERVING_STYLE_OPTIONS.length).toBe(7);
    });

    it('defines serving frequencies: weekly, biweekly, monthly, special events only', () => {
      expect(SERVING_FREQUENCIES.WEEKLY).toBe('weekly');
      expect(SERVING_FREQUENCIES.BIWEEKLY).toBe('biweekly');
      expect(SERVING_FREQUENCIES.MONTHLY).toBe('monthly');
      expect(SERVING_FREQUENCIES.SPECIAL_EVENTS_ONLY).toBe('special_events_only');
      expect(SERVING_FREQUENCY_OPTIONS.length).toBe(4);
    });

    it('defines all 7 skills/experiences in SKILLS_EXPERIENCE', () => {
      expect(SKILLS_EXPERIENCE.SPORTS_COACHING).toBe('sports_coaching');
      expect(SKILLS_EXPERIENCE.FIRST_AID).toBe('first_aid');
      expect(SKILLS_EXPERIENCE.AUDIO_VIDEO).toBe('audio_video');
      expect(SKILLS_EXPERIENCE.PHOTOGRAPHY).toBe('photography');
      expect(SKILLS_EXPERIENCE.TEACHING).toBe('teaching');
      expect(SKILLS_EXPERIENCE.ORGANIZING).toBe('organizing');
      expect(SKILLS_EXPERIENCE.WELCOMING).toBe('welcoming');
      expect(SKILLS_EXPERIENCE_OPTIONS.length).toBe(7);
    });

    it('defines work style preferences: front_facing, behind_the_scenes, balanced', () => {
      expect(WORK_STYLE_PREFERENCES.FRONT_FACING).toBe('front_facing');
      expect(WORK_STYLE_PREFERENCES.BEHIND_THE_SCENES).toBe('behind_the_scenes');
      expect(WORK_STYLE_PREFERENCES.BALANCED).toBe('balanced');
      expect(WORK_STYLE_OPTIONS.length).toBe(3);
    });

    it('builds canonical Firestore paths for onboarding responses and role requests', () => {
      expect(onboardingResponsesCollectionPath('vbt_cairo')).toBe(
        'vbt_communities/vbt_cairo/onboarding_responses'
      );
      expect(onboardingResponseDocPath('vbt_cairo', 'usr_123')).toBe(
        'vbt_communities/vbt_cairo/onboarding_responses/usr_123'
      );
      expect(roleRequestsCollectionPath('vbt_cairo')).toBe(
        'vbt_communities/vbt_cairo/role_requests'
      );
      expect(roleRequestDocPath('vbt_cairo', 'req_999')).toBe(
        'vbt_communities/vbt_cairo/role_requests/req_999'
      );
    });
  });

  // ────────────────────────────────────────────────────────────
  // 2. Recommendation Engine: Explainability & Logic
  // ────────────────────────────────────────────────────────────
  describe('computeOnboardingRecommendations (Explainable Intelligence)', () => {
    it('handles completely empty or skipped responses with encouraging defaults and explainable rationale', () => {
      const recs = computeOnboardingRecommendations({});

      expect(recs).toBeDefined();
      expect(recs.recommendedTeam).toBeDefined();
      expect(recs.recommendedOpportunity).toBeDefined();
      expect(recs.recommendedTraining).toBeDefined();
      expect(recs.coordinatorContact).toBeDefined();

      // Crucial: All recommendations must have explicit explainable reasoning
      expect(typeof recs.recommendedTeam.reasoning).toBe('string');
      expect(recs.recommendedTeam.reasoning.length).toBeGreaterThan(15);

      expect(typeof recs.recommendedOpportunity.reasoning).toBe('string');
      expect(recs.recommendedOpportunity.reasoning.length).toBeGreaterThan(15);

      expect(typeof recs.recommendedTraining.reasoning).toBe('string');
      expect(recs.recommendedTraining.reasoning.length).toBeGreaterThan(15);

      expect(typeof recs.coordinatorContact.reasoning).toBe('string');
      expect(recs.coordinatorContact.reasoning.length).toBeGreaterThan(15);

      expect(recs.fitSummary.archetype).toBe('Community Explorer');
    });

    it('recommends Football station team, referee opportunity, and referee rules training for Football enthusiast with sports coaching', () => {
      const responses = {
        sports: ['Football'],
        ageGroups: ['Teens 13-17'],
        servingStyle: SERVING_STYLES.SPORTS_STATIONS,
        frequency: SERVING_FREQUENCIES.WEEKLY,
        skills: [SKILLS_EXPERIENCE.SPORTS_COACHING],
        workStylePreference: WORK_STYLE_PREFERENCES.FRONT_FACING,
      };

      const recs = computeOnboardingRecommendations(responses);

      expect(recs.recommendedTeam.name).toContain('Football');
      expect(recs.recommendedTeam.reasoning).toMatch(/passion for Football/i);
      expect(recs.recommendedTeam.reasoning).toMatch(/sports stations/i);

      expect(recs.recommendedOpportunity.role).toBe('referee');
      expect(recs.recommendedOpportunity.reasoning).toMatch(/Football/i);

      expect(recs.recommendedTraining.category).toBe('referee_rules');
      expect(recs.recommendedTraining.reasoning).toMatch(/Christian refereeing/i);

      expect(recs.coordinatorContact.role).toMatch(/Sports Director/i);
      expect(recs.fitSummary.archetype).toBe('Court Sports & Referee Servant');
    });

    it('prioritizes Child Safety training when member chooses Kids 6-9 age group', () => {
      const responses = {
        sports: ['Running'],
        ageGroups: ['Kids 6-9'],
        servingStyle: SERVING_STYLES.HELPING,
        skills: [SKILLS_EXPERIENCE.TEACHING],
      };

      const recs = computeOnboardingRecommendations(responses);

      expect(recs.recommendedTeam.ageGroup).toBe('Kids 6-9');
      expect(recs.recommendedTraining.id).toBe('vbt_child_safety_101');
      expect(recs.recommendedTraining.category).toBe('child_safety');
      expect(recs.recommendedTraining.reasoning).toMatch(/safeguarding/i);
      expect(recs.coordinatorContact.name).toContain('Mary George');
      expect(recs.fitSummary.archetype).toContain('Youth');
    });

    it('recommends Media team, action photography, and creative lead for audio/video & photography skills', () => {
      const responses = {
        sports: ['Chess/Board Games'],
        servingStyle: SERVING_STYLES.MEDIA,
        skills: [SKILLS_EXPERIENCE.AUDIO_VIDEO, SKILLS_EXPERIENCE.PHOTOGRAPHY],
        workStylePreference: WORK_STYLE_PREFERENCES.BEHIND_THE_SCENES,
      };

      const recs = computeOnboardingRecommendations(responses);

      expect(recs.recommendedTeam.category).toBe('media');
      expect(recs.recommendedTeam.reasoning).toMatch(/media & audio\/video/i);
      expect(recs.recommendedTeam.reasoning).toMatch(/behind-the-scenes/i);

      expect(recs.recommendedOpportunity.role).toBe('media');
      expect(recs.recommendedOpportunity.title).toMatch(/Photographer/i);

      expect(recs.recommendedTraining.category).toBe('media');
      expect(recs.coordinatorContact.name).toBe('Fadi Mourad');
      expect(recs.coordinatorContact.role).toMatch(/Media & Creative/i);
      expect(recs.fitSummary.archetype).toContain('Storyteller');
    });

    it('recommends Logistics team, hydration station, and operations safety for first aid background', () => {
      const responses = {
        sports: ['Fitness/Calisthenics'],
        servingStyle: SERVING_STYLES.LOGISTICS,
        skills: [SKILLS_EXPERIENCE.FIRST_AID, SKILLS_EXPERIENCE.ORGANIZING],
        workStylePreference: WORK_STYLE_PREFERENCES.BEHIND_THE_SCENES,
      };

      const recs = computeOnboardingRecommendations(responses);

      expect(recs.recommendedTeam.category).toBe('logistics');
      expect(recs.recommendedTeam.reasoning).toMatch(/first aid & safety/i);

      expect(recs.recommendedOpportunity.role).toBe('first_aid');
      expect(recs.recommendedOpportunity.title).toMatch(/Hydration & Safety/i);

      expect(recs.recommendedTraining.category).toBe('logistics_firstaid');
      expect(recs.coordinatorContact.name).toBe('David Shenouda');
      expect(recs.fitSummary.archetype).toContain('Field Guardian');
    });

    it('recommends Servant Circle and spiritual foundations for prayer serving style', () => {
      const responses = {
        servingStyle: SERVING_STYLES.PRAYER,
        skills: [SKILLS_EXPERIENCE.TEACHING],
        workStylePreference: WORK_STYLE_PREFERENCES.BALANCED,
      };

      const recs = computeOnboardingRecommendations(responses);

      expect(recs.recommendedTeam.category).toBe('servant_circle');
      expect(recs.recommendedOpportunity.role).toBe('praise');
      expect(recs.recommendedTraining.category).toBe('spiritual_leadership');
      expect(recs.coordinatorContact.name).toBe('Peter Kamel');
      expect(recs.fitSummary.archetype).toContain('Pastoral');
    });

    it('works with custom teams, opportunities, and trainings passed as arguments', () => {
      const customTeams = [
        {
          id: 'custom_pingpong',
          name: 'Table Tennis Champions Crew',
          sport: 'Table Tennis',
          category: 'sports_station',
          ageGroup: 'Teens 13-17',
          servingStyle: 'sports_stations',
          leader: { name: 'Captain Peter', role: 'Ping Pong Master', contact: 'Table 4' },
        },
      ];
      const customOpps = [
        {
          id: 'opp_table_tennis_scorer',
          title: 'Table Tennis Scorekeeper',
          role: 'stations',
          sport: 'Table Tennis',
          spotsNeeded: 2,
          spotsFilled: 0,
        },
      ];
      const customTrainings = [
        {
          id: 'mod_table_tennis_rules',
          title: 'ITTF Rules for Camp Tourneys',
          category: 'referee_rules',
          durationMinutes: 10,
        },
      ];

      const responses = {
        sports: ['Table Tennis'],
        servingStyle: SERVING_STYLES.SPORTS_STATIONS,
      };

      const recs = computeOnboardingRecommendations(
        responses,
        customTeams,
        customOpps,
        customTrainings
      );

      expect(recs.recommendedTeam.id).toBe('custom_pingpong');
      expect(recs.recommendedTeam.name).toBe('Table Tennis Champions Crew');
      expect(recs.recommendedOpportunity.id).toBe('opp_table_tennis_scorer');
      expect(recs.recommendedTraining.id).toBe('mod_table_tennis_rules');
    });
  });

  // ────────────────────────────────────────────────────────────
  // 3. Persistence: Non-Automatic Assignment & Editability
  // ────────────────────────────────────────────────────────────
  describe('Persistence & Non-Automatic Sensitive Role Protection', () => {
    it('throws an error if memberId is omitted when saving responses', async () => {
      await expect(saveOnboardingResponses('vbt_main', '')).rejects.toThrow(
        /memberId is required/i
      );
    });

    it('saves onboarding responses in onboarding_responses collection without mutating sensitive roles', async () => {
      setDoc.mockResolvedValueOnce(true);
      setDoc.mockResolvedValueOnce(true); // for sportsInterests mirror

      const responses = {
        sports: ['Basketball', 'Volleyball'],
        ageGroups: ['Teens 13-17'],
        servingStyle: SERVING_STYLES.SPORTS_STATIONS,
        frequency: SERVING_FREQUENCIES.BIWEEKLY,
        skills: [SKILLS_EXPERIENCE.SPORTS_COACHING],
        workStylePreference: WORK_STYLE_PREFERENCES.FRONT_FACING,
      };

      const result = await saveOnboardingResponses('vbt_main', 'usr_mina', responses);

      expect(setDoc).toHaveBeenCalledTimes(2);

      // Verify the onboarding responses doc call
      const firstCallArgs = setDoc.mock.calls[0];
      expect(firstCallArgs[0].path).toBe('vbt_communities/vbt_main/onboarding_responses/usr_mina');
      expect(firstCallArgs[1].memberId).toBe('usr_mina');
      expect(firstCallArgs[1].responses.sports).toEqual(['Basketball', 'Volleyball']);
      expect(firstCallArgs[1].recommendations).toBeDefined();

      // Verify CRITICAL RULE: Member profile receives sportsInterests mirror, NOT a role change!
      const memberDocCallArgs = setDoc.mock.calls[1];
      expect(memberDocCallArgs[0].path).toBe('vbt_communities/vbt_main/members/usr_mina');
      expect(memberDocCallArgs[1].sportsInterests).toEqual(['Basketball', 'Volleyball']);
      expect(memberDocCallArgs[1].role).toBeUndefined(); // Role MUST NOT be set or altered!

      expect(result.id).toBe('usr_mina');
    });

    it('retrieves saved responses using getOnboardingResponses', async () => {
      const mockData = {
        memberId: 'usr_sarah',
        responses: {
          sports: ['Volleyball'],
          servingStyle: 'helping',
        },
        recommendations: {
          recommendedTeam: { name: 'Camp Welcoming & Check-In Squad' },
        },
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'usr_sarah',
        data: () => mockData,
      });

      const responses = await getOnboardingResponses('vbt_main', 'usr_sarah');
      expect(responses).toBeDefined();
      expect(responses.id).toBe('usr_sarah');
      expect(responses.responses.sports).toEqual(['Volleyball']);
    });

    it('returns null if member responses do not exist or memberId is empty', async () => {
      expect(await getOnboardingResponses('vbt_main', null)).toBeNull();

      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });
      expect(await getOnboardingResponses('vbt_main', 'non_existent')).toBeNull();
    });

    it('subscribes to onboarding responses in real-time', () => {
      const mockUnsub = vi.fn();
      onSnapshot.mockReturnValueOnce(mockUnsub);

      const callback = vi.fn();
      const unsub = subscribeToOnboardingResponses('vbt_main', 'usr_david', callback);

      expect(onSnapshot).toHaveBeenCalledTimes(1);
      expect(unsub).toBe(mockUnsub);
    });
  });

  // ────────────────────────────────────────────────────────────
  // 4. Role & Assignment Approvals (Leader Governance)
  // ────────────────────────────────────────────────────────────
  describe('requestRoleOrAssignmentApproval & Leader Governance', () => {
    it('throws error if memberId is missing', async () => {
      await expect(
        requestRoleOrAssignmentApproval('vbt_main', '', { requestedRole: 'volunteer' })
      ).rejects.toThrow(/memberId is required/i);
    });

    it('submits a request strictly with PENDING_LEADER_REVIEW status and creates audit log', async () => {
      setDoc.mockResolvedValue(true);

      const requestData = {
        requestedRole: VBT_ROLES.VOLUNTEER,
        targetType: 'team',
        targetId: 'team_football_station',
        targetTitle: 'Football Station Crew',
        memberName: 'Youssef Nader',
        notes: 'Excited to serve with high school campers during football tournaments.',
      };

      const result = await requestRoleOrAssignmentApproval('vbt_main', 'usr_youssef', requestData);

      expect(result.status).toBe(ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW);
      expect(result.requestedRole).toBe(VBT_ROLES.VOLUNTEER);
      expect(result.targetId).toBe('team_football_station');

      // Verify setDoc was called for role_requests
      const requestDocCall = setDoc.mock.calls[0];
      expect(requestDocCall[0].path).toMatch(/vbt_communities\/vbt_main\/role_requests\/req_/);
      expect(requestDocCall[1].status).toBe(ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW);

      // Verify audit log creation
      const auditCall = setDoc.mock.calls[1];
      expect(auditCall[0].path).toMatch(/vbt_communities\/vbt_main\/audit_logs\/audit_/);
      expect(auditCall[1].action).toBe(AUDIT_ACTIONS.ASSIGNMENT_CREATED);
      expect(auditCall[1].details.status).toBe(ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW);
    });

    it('allows a leader to approve a request, transitioning status to CONFIRMED with audit log', async () => {
      setDoc.mockResolvedValue(true);

      const reviewData = {
        approved: true,
        reviewerId: 'ldr_mina',
        reviewerName: 'Captain Mina Farag',
        reviewNotes: 'Welcome aboard! Station orientation on Saturday 8:30 AM.',
      };

      const result = await reviewRoleRequest('vbt_main', 'req_12345', reviewData);

      expect(result.status).toBe(ASSIGNMENT_STATUS.CONFIRMED);
      expect(result.reviewedBy).toBe('Captain Mina Farag');
      expect(result.reviewNotes).toContain('Welcome aboard');

      // Verify audit log for approval
      const auditCall = setDoc.mock.calls[1];
      expect(auditCall[1].action).toBe(AUDIT_ACTIONS.ROLE_APPROVED);
      expect(auditCall[1].actorRole).toBe('coordinator');
    });

    it('allows a leader to decline a request, transitioning status to DECLINED with audit log', async () => {
      setDoc.mockResolvedValue(true);

      const reviewData = {
        approved: false,
        reviewerId: 'ldr_mina',
        reviewerName: 'Captain Mina Farag',
        reviewNotes: 'This station is currently full; please consider table tennis.',
      };

      const result = await reviewRoleRequest('vbt_main', 'req_12345', reviewData);

      expect(result.status).toBe(ASSIGNMENT_STATUS.DECLINED);
      expect(result.reviewedBy).toBe('Captain Mina Farag');

      const auditCall = setDoc.mock.calls[1];
      expect(auditCall[1].action).toBe(AUDIT_ACTIONS.ASSIGNMENT_DECLINED);
    });

    it('fetches pending role requests for leaders', async () => {
      const mockDocs = [
        {
          id: 'req_1',
          data: () => ({
            status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
            memberName: 'Member A',
          }),
        },
        {
          id: 'req_2',
          data: () => ({
            status: ASSIGNMENT_STATUS.CONFIRMED,
            memberName: 'Member B',
          }),
        },
        {
          id: 'req_3',
          data: () => ({
            status: ASSIGNMENT_STATUS.PENDING_LEADER_REVIEW,
            memberName: 'Member C',
          }),
        },
      ];

      getDocs.mockResolvedValueOnce(mockDocs);
      const pending = await getPendingRoleRequests('vbt_main');
      expect(pending.length).toBe(2);
      expect(pending.map((p) => p.id)).toEqual(['req_1', 'req_3']);
    });

    it('throws error if requestId is missing in reviewRoleRequest', async () => {
      await expect(reviewRoleRequest('vbt_main', '', { approved: true })).rejects.toThrow(
        /requestId is required/i
      );
    });

    it('returns empty array when getPendingRoleRequests catches Firestore error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Network failure'));
      const pending = await getPendingRoleRequests('vbt_main');
      expect(pending).toEqual([]);
    });

    it('supports editing onboarding answers later without changing member role', async () => {
      setDoc.mockResolvedValue(true);

      const updatedResponses = {
        sports: ['Running', 'Volleyball'],
        servingStyle: SERVING_STYLES.HELPING,
        hasPreviousSave: true,
      };

      const result = await saveOnboardingResponses('vbt_main', 'usr_existing', updatedResponses);
      expect(result.id).toBe('usr_existing');
      expect(result.responses.sports).toEqual(['Running', 'Volleyball']);
      expect(result.responses.servingStyle).toBe(SERVING_STYLES.HELPING);

      // Verify createdAt was not modified when hasPreviousSave is true
      expect(result.createdAt).toBeUndefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('handles snapshot error callback gracefully in subscribeToOnboardingResponses', () => {
      const errorListener = vi.fn((docRef, onNext, onError) => {
        onError(new Error('Permission denied'));
        return vi.fn();
      });
      onSnapshot.mockImplementationOnce(errorListener);

      const callback = vi.fn();
      subscribeToOnboardingResponses('vbt_main', 'usr_denied', callback);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('handles snapshot non-existence in subscribeToOnboardingResponses', () => {
      const emptyListener = vi.fn((docRef, onNext) => {
        onNext({ exists: () => false });
        return vi.fn();
      });
      onSnapshot.mockImplementationOnce(emptyListener);

      const callback = vi.fn();
      subscribeToOnboardingResponses('vbt_main', 'usr_empty', callback);

      expect(callback).toHaveBeenCalledWith(null);
    });
  });
});
