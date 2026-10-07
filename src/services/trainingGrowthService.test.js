import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SERVANT_TIERS,
  MODULE_CATEGORIES,
  MODULE_CATEGORY_META,
  DEFAULT_TRAINING_MODULES,
  trainingModulesCollectionPath,
  trainingModuleDocPath,
  memberProgressCollectionPath,
  memberProgressDocPath,
  memberCertificationsCollectionPath,
  memberCertificationDocPath,
  calculateServantLevel,
  getTrainingModules,
  subscribeToTrainingModules,
  createTrainingModule,
  getTrainingModuleById,
  getMemberTrainingProgress,
  recordModuleCompletion,
  getMemberCertifications,
  awardCertification,
  getMemberGrowthSummary,
  seedDefaultTrainingModules,
} from './trainingGrowthService';

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

import { getDoc, getDocs, setDoc, onSnapshot } from 'firebase/firestore';

describe('TrainingGrowthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────
  // Constants & Path Helpers
  // ─────────────────────────────────────────────
  describe('Constants & Path Helpers', () => {
    it('defines SERVANT_TIERS with 4 levels, keys, and coercive helpers', () => {
      expect(SERVANT_TIERS.VOLUNTEER.level).toBe(1);
      expect(SERVANT_TIERS.VOLUNTEER.key).toBe('VOLUNTEER');
      expect(SERVANT_TIERS.VOLUNTEER.id).toBe('volunteer');
      expect(SERVANT_TIERS.VOLUNTEER.minCompletedModules).toBe(0);

      expect(SERVANT_TIERS.SERVANT.level).toBe(2);
      expect(SERVANT_TIERS.SERVANT.key).toBe('SERVANT');
      expect(SERVANT_TIERS.SERVANT.id).toBe('servant');
      expect(SERVANT_TIERS.SERVANT.minCompletedModules).toBe(2);

      expect(SERVANT_TIERS.LEAD_SERVANT.level).toBe(3);
      expect(SERVANT_TIERS.LEAD_SERVANT.key).toBe('LEAD_SERVANT');
      expect(SERVANT_TIERS.LEAD_SERVANT.id).toBe('lead_servant');
      expect(SERVANT_TIERS.LEAD_SERVANT.minCompletedModules).toBe(5);

      expect(SERVANT_TIERS.COORDINATOR.level).toBe(4);
      expect(SERVANT_TIERS.COORDINATOR.key).toBe('COORDINATOR');
      expect(SERVANT_TIERS.COORDINATOR.id).toBe('coordinator');
      expect(SERVANT_TIERS.COORDINATOR.minCompletedModules).toBe(8);

      // Coercion tests
      expect(String(SERVANT_TIERS.VOLUNTEER)).toBe('volunteer');
      expect(Number(SERVANT_TIERS.SERVANT)).toBe(2);
      expect(SERVANT_TIERS.LEAD_SERVANT == 3).toBe(true);
    });

    it('defines MODULE_CATEGORIES and metadata', () => {
      expect(MODULE_CATEGORIES.CHILD_SAFETY).toBe('child_safety');
      expect(MODULE_CATEGORIES.REFEREE_RULES).toBe('referee_rules');
      expect(MODULE_CATEGORIES.SPIRITUAL_LEADERSHIP).toBe('spiritual_leadership');
      expect(MODULE_CATEGORIES.LOGISTICS_FIRSTAID).toBe('logistics_firstaid');

      expect(MODULE_CATEGORY_META.child_safety.label).toContain('Child Safety');
      expect(MODULE_CATEGORY_META.referee_rules.icon).toBe('⚖️');
    });

    it('generates correct Firestore paths matching specification', () => {
      expect(trainingModulesCollectionPath('vbt_main')).toBe(
        'vbt_communities/vbt_main/training_modules'
      );
      expect(trainingModuleDocPath('vbt_main', 'mod_safety_101')).toBe(
        'vbt_communities/vbt_main/training_modules/mod_safety_101'
      );
      expect(memberProgressCollectionPath('vbt_main', 'usr_john')).toBe(
        'vbt_communities/vbt_main/members/usr_john/training_progress'
      );
      expect(memberProgressDocPath('vbt_main', 'usr_john', 'mod_safety_101')).toBe(
        'vbt_communities/vbt_main/members/usr_john/training_progress/mod_safety_101'
      );
      expect(memberCertificationsCollectionPath('vbt_main', 'usr_john')).toBe(
        'vbt_communities/vbt_main/members/usr_john/certifications'
      );
      expect(memberCertificationDocPath('vbt_main', 'usr_john', 'cert_referee_1')).toBe(
        'vbt_communities/vbt_main/members/usr_john/certifications/cert_referee_1'
      );
    });
  });

  // ─────────────────────────────────────────────
  // calculateServantLevel
  // ─────────────────────────────────────────────
  describe('calculateServantLevel', () => {
    it('returns Level 1 Volunteer for 0 or 1 completed modules', () => {
      const level0 = calculateServantLevel(0);
      expect(level0.level).toBe(1);
      expect(level0.tier).toBe('volunteer');
      expect(level0.tierKey).toBe('VOLUNTEER');
      expect(level0.title).toBe('Volunteer');
      expect(level0.nextTier).toBe('servant');
      expect(level0.modulesToNextTier).toBe(2);
      expect(level0.isMaxLevel).toBe(false);

      const level1 = calculateServantLevel(1);
      expect(level1.level).toBe(1);
      expect(level1.modulesToNextTier).toBe(1);
    });

    it('returns Level 2 Servant for 2 to 4 completed modules', () => {
      const level2 = calculateServantLevel(2);
      expect(level2.level).toBe(2);
      expect(level2.tier).toBe('servant');
      expect(level2.tierKey).toBe('SERVANT');
      expect(level2.title).toBe('Servant');
      expect(level2.nextTier).toBe('lead_servant');
      expect(level2.modulesToNextTier).toBe(3);

      const level4 = calculateServantLevel(4);
      expect(level4.level).toBe(2);
      expect(level4.modulesToNextTier).toBe(1);
    });

    it('returns Level 3 Lead Servant for 5 to 7 completed modules', () => {
      const level5 = calculateServantLevel(5);
      expect(level5.level).toBe(3);
      expect(level5.tier).toBe('lead_servant');
      expect(level5.tierKey).toBe('LEAD_SERVANT');
      expect(level5.title).toBe('Lead Servant');
      expect(level5.nextTier).toBe('coordinator');
      expect(level5.modulesToNextTier).toBe(3);

      const level7 = calculateServantLevel(7);
      expect(level7.level).toBe(3);
      expect(level7.modulesToNextTier).toBe(1);
    });

    it('returns Level 4 Coordinator for 8+ completed modules', () => {
      const level8 = calculateServantLevel(8);
      expect(level8.level).toBe(4);
      expect(level8.tier).toBe('coordinator');
      expect(level8.tierKey).toBe('COORDINATOR');
      expect(level8.title).toBe('Coordinator');
      expect(level8.nextTier).toBeNull();
      expect(level8.modulesToNextTier).toBe(0);
      expect(level8.isMaxLevel).toBe(true);

      const level15 = calculateServantLevel(15);
      expect(level15.level).toBe(4);
      expect(level15.isMaxLevel).toBe(true);
    });

    it('handles negative, invalid, or string inputs safely', () => {
      expect(calculateServantLevel(-3).level).toBe(1);
      expect(calculateServantLevel(null).level).toBe(1);
      expect(calculateServantLevel(undefined).level).toBe(1);
      expect(calculateServantLevel('NaN').level).toBe(1);
      expect(calculateServantLevel('6').level).toBe(3);
    });

    it('supports coercion to number and string formatting', () => {
      const lvl = calculateServantLevel(3);
      expect(Number(lvl)).toBe(2);
      expect(lvl == 2).toBe(true);
      expect(lvl.toString()).toContain('Level 2 (Servant)');
    });
  });

  // ─────────────────────────────────────────────
  // createTrainingModule
  // ─────────────────────────────────────────────
  describe('createTrainingModule', () => {
    it('creates module record and calls setDoc with normalized schema', async () => {
      const moduleData = {
        title: 'Child Safety 101',
        category: MODULE_CATEGORIES.CHILD_SAFETY,
        durationMinutes: 45,
        description: 'Safety protocols for camp leaders',
        lessons: [
          { id: 'les_1', title: 'Two-Leader Rule', content: 'Never be alone...', quiz: {} },
        ],
        badgeIcon: '🛡️',
        requiredTier: 'volunteer',
      };

      const result = await createTrainingModule('vbt_main', moduleData);

      expect(result.id).toBe('child_safety_101');
      expect(result.communityId).toBe('vbt_main');
      expect(result.title).toBe('Child Safety 101');
      expect(result.category).toBe(MODULE_CATEGORIES.CHILD_SAFETY);
      expect(result.durationMinutes).toBe(45);
      expect(result.badgeIcon).toBe('🛡️');
      expect(result.requiredTier).toBe('volunteer');
      expect(result.createdAt).toBe('MOCK_TIMESTAMP');

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'vbt_communities/vbt_main/training_modules/child_safety_101' }),
        expect.objectContaining({
          title: 'Child Safety 101',
          category: 'child_safety',
        }),
        { merge: true }
      );
    });

    it('supports options object syntax as first argument', async () => {
      const result = await createTrainingModule({
        communityId: 'custom_community',
        id: 'referee_master',
        title: 'Referee Masterclass',
        category: MODULE_CATEGORIES.REFEREE_RULES,
      });

      expect(result.id).toBe('referee_master');
      expect(result.communityId).toBe('custom_community');
      expect(result.category).toBe('referee_rules');
    });

    it('throws error if title is missing', async () => {
      await expect(createTrainingModule('vbt_main', { description: 'No title' })).rejects.toThrow(
        'title is required'
      );
    });

    it('falls back to default category if invalid category provided', async () => {
      const result = await createTrainingModule('vbt_main', {
        title: 'Basic First Aid',
        category: 'unrecognized_category',
      });
      expect(result.category).toBe(MODULE_CATEGORIES.CHILD_SAFETY);
    });
  });

  // ─────────────────────────────────────────────
  // getTrainingModules & getTrainingModuleById
  // ─────────────────────────────────────────────
  describe('getTrainingModules & getTrainingModuleById', () => {
    it('returns array of sorted training modules from Firestore', async () => {
      getDocs.mockResolvedValueOnce({
        forEach: (fn) => {
          fn({ id: 'mod_2', data: () => ({ title: 'B Module', order: 2 }) });
          fn({ id: 'mod_1', data: () => ({ title: 'A Module', order: 1 }) });
        },
      });

      const modules = await getTrainingModules('vbt_main');
      expect(modules).toHaveLength(2);
      expect(modules[0].id).toBe('mod_1');
      expect(modules[1].id).toBe('mod_2');
    });

    it('returns empty array on Firestore error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Connection failure'));
      const modules = await getTrainingModules('vbt_main');
      expect(modules).toEqual([]);
    });

    it('fetches single training module by ID', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'mod_safety',
        data: () => ({ title: 'Safety Module', durationMinutes: 20 }),
      });

      const mod = await getTrainingModuleById('vbt_main', 'mod_safety');
      expect(mod).not.toBeNull();
      expect(mod.id).toBe('mod_safety');
      expect(mod.title).toBe('Safety Module');
    });

    it('returns null if single module does not exist or id is null', async () => {
      expect(await getTrainingModuleById('vbt_main', null)).toBeNull();

      getDoc.mockResolvedValueOnce({ exists: () => false });
      expect(await getTrainingModuleById('vbt_main', 'missing_mod')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────
  // subscribeToTrainingModules
  // ─────────────────────────────────────────────
  describe('subscribeToTrainingModules', () => {
    it('registers onSnapshot listener and passes mapped list to callback', () => {
      let registeredCallback = null;
      onSnapshot.mockImplementationOnce((_ref, successCb) => {
        registeredCallback = successCb;
        return vi.fn(); // unsubscribe
      });

      const cb = vi.fn();
      const unsub = subscribeToTrainingModules('vbt_main', cb);

      expect(typeof unsub).toBe('function');
      expect(registeredCallback).not.toBeNull();

      registeredCallback({
        forEach: (fn) => {
          fn({ id: 'm1', data: () => ({ title: 'Devotions', order: 1 }) });
        },
      });

      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'm1', title: 'Devotions' }),
      ]);
    });
  });

  // ─────────────────────────────────────────────
  // getMemberTrainingProgress & recordModuleCompletion
  // ─────────────────────────────────────────────
  describe('Member Training Progress', () => {
    it('retrieves progress records for a member', async () => {
      getDocs.mockResolvedValueOnce({
        forEach: (fn) => {
          fn({
            id: 'mod_cs_1',
            data: () => ({ completed: true, quizScore: 100, certifiedBy: 'lead_mark' }),
          });
        },
      });

      const progress = await getMemberTrainingProgress('vbt_main', 'usr_david');
      expect(progress).toHaveLength(1);
      expect(progress[0].moduleId).toBe('mod_cs_1');
      expect(progress[0].completed).toBe(true);
      expect(progress[0].quizScore).toBe(100);
      expect(progress[0].certifiedBy).toBe('lead_mark');
    });

    it('returns empty array if memberId is omitted or on error', async () => {
      expect(await getMemberTrainingProgress('vbt_main', '')).toEqual([]);

      getDocs.mockRejectedValueOnce(new Error('Network failure'));
      expect(await getMemberTrainingProgress('vbt_main', 'usr_david')).toEqual([]);
    });

    it('records module completion with score and timestamp', async () => {
      const completion = await recordModuleCompletion(
        'vbt_main',
        'usr_david',
        'mod_cs_1',
        95,
        'coordinator_paul'
      );

      expect(completion.id).toBe('mod_cs_1');
      expect(completion.memberId).toBe('usr_david');
      expect(completion.moduleId).toBe('mod_cs_1');
      expect(completion.completed).toBe(true);
      expect(completion.quizScore).toBe(95);
      expect(completion.certifiedBy).toBe('coordinator_paul');
      expect(completion.completedAt).toBe('MOCK_TIMESTAMP');

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'vbt_communities/vbt_main/members/usr_david/training_progress/mod_cs_1',
        }),
        expect.objectContaining({
          completed: true,
          quizScore: 95,
          certifiedBy: 'coordinator_paul',
        }),
        { merge: true }
      );
    });

    it('supports options object syntax for recordModuleCompletion', async () => {
      const completion = await recordModuleCompletion({
        communityId: 'vbt_main',
        memberId: 'usr_david',
        moduleId: 'mod_referee',
        quizScore: 88,
      });

      expect(completion.moduleId).toBe('mod_referee');
      expect(completion.quizScore).toBe(88);
    });

    it('throws error if memberId or moduleId is missing when recording completion', async () => {
      await expect(recordModuleCompletion('vbt_main', '', 'mod_1', 100)).rejects.toThrow(
        'memberId is required'
      );
      await expect(recordModuleCompletion('vbt_main', 'usr_1', '', 100)).rejects.toThrow(
        'moduleId is required'
      );
    });
  });

  // ─────────────────────────────────────────────
  // Certifications: awardCertification & getMemberCertifications
  // ─────────────────────────────────────────────
  describe('Certifications', () => {
    it('awards certification to member and stores in subcollection', async () => {
      const cert = await awardCertification(
        'vbt_main',
        'usr_david',
        'Certified Youth Referee',
        'coordinator_paul'
      );

      expect(cert.id).toBe('certified_youth_referee');
      expect(cert.certificationName).toBe('Certified Youth Referee');
      expect(cert.memberId).toBe('usr_david');
      expect(cert.awardedBy).toBe('coordinator_paul');
      expect(cert.status).toBe('active');
      expect(cert.awardedAt).toBe('MOCK_TIMESTAMP');

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'vbt_communities/vbt_main/members/usr_david/certifications/certified_youth_referee',
        }),
        expect.objectContaining({
          certificationName: 'Certified Youth Referee',
          awardedBy: 'coordinator_paul',
        }),
        { merge: true }
      );
    });

    it('throws error if memberId or certificationName is missing', async () => {
      await expect(awardCertification('vbt_main', '', 'Cert Name')).rejects.toThrow(
        'memberId is required'
      );
      await expect(awardCertification('vbt_main', 'usr_1', '')).rejects.toThrow(
        'certificationName is required'
      );
    });

    it('retrieves member certifications from subcollection', async () => {
      getDocs.mockResolvedValueOnce({
        forEach: (fn) => {
          fn({
            id: 'child_safety_certified',
            data: () => ({
              certificationName: 'Child Safety Certified',
              awardedBy: 'admin',
            }),
          });
        },
      });

      const certs = await getMemberCertifications('vbt_main', 'usr_david');
      expect(certs).toHaveLength(1);
      expect(certs[0].id).toBe('child_safety_certified');
      expect(certs[0].certificationName).toBe('Child Safety Certified');
    });

    it('falls back to member profile certifications array if subcollection is empty', async () => {
      // Subcollection is empty
      getDocs.mockResolvedValueOnce({
        forEach: () => {},
      });
      // Member profile doc has certifications array
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          certifications: ['First Aid Responder', 'Level 1 Coach'],
        }),
      });

      const certs = await getMemberCertifications('vbt_main', 'usr_david');
      expect(certs).toHaveLength(2);
      expect(certs[0].name).toBe('First Aid Responder');
      expect(certs[1].name).toBe('Level 1 Coach');
    });
  });

  // ─────────────────────────────────────────────
  // getMemberGrowthSummary & seedDefaultTrainingModules
  // ─────────────────────────────────────────────
  describe('Growth Summary & Seeding', () => {
    it('returns complete growth summary with calculated level and categorized modules', async () => {
      // Mock progress: 3 completed modules, 1 in progress
      getDocs
        .mockResolvedValueOnce({
          forEach: (fn) => {
            fn({ id: 'm1', data: () => ({ completed: true }) });
            fn({ id: 'm2', data: () => ({ completed: true }) });
            fn({ id: 'm3', data: () => ({ completed: true }) });
            fn({ id: 'm4', data: () => ({ completed: false }) });
          },
        })
        // Mock certifications
        .mockResolvedValueOnce({
          forEach: (fn) => {
            fn({ id: 'cert_1', data: () => ({ certificationName: 'Safety Certified' }) });
          },
        });

      const summary = await getMemberGrowthSummary('vbt_main', 'usr_david');

      expect(summary.memberId).toBe('usr_david');
      expect(summary.completedModulesCount).toBe(3);
      expect(summary.servantLevel.level).toBe(2);
      expect(summary.servantLevel.title).toBe('Servant');
      expect(summary.completedModules).toHaveLength(3);
      expect(summary.inProgressModules).toHaveLength(1);
      expect(summary.certifications).toHaveLength(1);
    });

    it('returns empty summary if memberId is not supplied', async () => {
      const summary = await getMemberGrowthSummary('vbt_main', null);
      expect(summary.memberId).toBeNull();
      expect(summary.completedModulesCount).toBe(0);
      expect(summary.servantLevel.level).toBe(1);
    });

    it('seeds default training modules into community', async () => {
      const seeded = await seedDefaultTrainingModules('vbt_main');
      expect(seeded.length).toBe(DEFAULT_TRAINING_MODULES.length);
      expect(seeded[0].category).toBe(MODULE_CATEGORIES.CHILD_SAFETY);
      expect(setDoc).toHaveBeenCalledTimes(DEFAULT_TRAINING_MODULES.length);
    });
  });
});
