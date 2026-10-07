import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  APPLICATION_STATUS,
  applicationDocPath,
  applicationsCollectionPath,
  applyForOpportunity,
  updateApplicationStatus,
  confirmAssignment,
  requestReplacement,
  getOpportunityApplications,
  getApplicationById,
  subscribeToOpportunityApplications,
  calculateApplicationStats,
} from './servingAssignmentService';

const mockDocs = new Map();

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
      data: () => data,
    };
  }),
  getDocs: vi.fn(async (colRef) => {
    const results = [];
    for (const [p, val] of mockDocs.entries()) {
      if (p.startsWith(colRef.path + '/')) {
        results.push({
          id: p.split('/').pop(),
          data: () => val,
        });
      }
    }
    return {
      forEach: (fn) => results.forEach(fn),
      size: results.length,
    };
  }),
  setDoc: vi.fn(async (docRef, data, options = {}) => {
    const existing = options.merge ? mockDocs.get(docRef.path) || {} : {};
    mockDocs.set(docRef.path, { ...existing, ...data });
    return true;
  }),
  onSnapshot: vi.fn((queryOrRef, onNext, onError) => {
    if (queryOrRef._triggerError) {
      if (onError) onError(new Error('Simulated snapshot error'));
      return () => {};
    }
    const results = [];
    for (const [p, val] of mockDocs.entries()) {
      if (p.startsWith(queryOrRef.path + '/')) {
        results.push({
          id: p.split('/').pop(),
          data: () => val,
        });
      }
    }
    onNext({
      forEach: (fn) => results.forEach(fn),
      size: results.length,
    });
    return () => {};
  }),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
}));

describe('ServingAssignmentService', () => {
  beforeEach(() => {
    mockDocs.clear();
    vi.clearAllMocks();
  });

  describe('Path helpers & Constants', () => {
    it('constructs correct applications collection and document paths with default communityId', () => {
      expect(applicationsCollectionPath(undefined, 'opp_soccer_coach')).toBe(
        'vbt_communities/vbt_main/serving_opportunities/opp_soccer_coach/applications'
      );
      expect(applicationDocPath(undefined, 'opp_soccer_coach', 'vol_user_1')).toBe(
        'vbt_communities/vbt_main/serving_opportunities/opp_soccer_coach/applications/vol_user_1'
      );
    });

    it('constructs correct applications paths with custom communityId', () => {
      expect(applicationsCollectionPath('vbt_cairo', 'opp_media_lead')).toBe(
        'vbt_communities/vbt_cairo/serving_opportunities/opp_media_lead/applications'
      );
      expect(applicationDocPath('vbt_cairo', 'opp_media_lead', 'app_99')).toBe(
        'vbt_communities/vbt_cairo/serving_opportunities/opp_media_lead/applications/app_99'
      );
    });

    it('exposes all standard application statuses', () => {
      expect(APPLICATION_STATUS.PENDING).toBe('pending');
      expect(APPLICATION_STATUS.APPROVED).toBe('approved');
      expect(APPLICATION_STATUS.DECLINED).toBe('declined');
      expect(APPLICATION_STATUS.CONFIRMED).toBe('confirmed');
      expect(APPLICATION_STATUS.REPLACEMENT_REQUESTED).toBe('replacement_requested');
    });
  });

  describe('applyForOpportunity', () => {
    it('throws error when opportunityId or member is missing', async () => {
      await expect(
        applyForOpportunity({ opportunityId: '', member: { id: 'usr_1' } })
      ).rejects.toThrow('opportunityId is required');

      await expect(
        applyForOpportunity({ opportunityId: 'opp_1', member: null })
      ).rejects.toThrow('member information is required');

      await expect(
        applyForOpportunity({ opportunityId: 'opp_1', member: {} })
      ).rejects.toThrow('member id is required');
    });

    it('creates a new application with member ID as document ID and default pending status', async () => {
      const result = await applyForOpportunity({
        communityId: 'vbt_main',
        opportunityId: 'opp_referee',
        member: {
          id: 'usr_mark',
          name: 'Mark Anton',
          role: 'servant',
          team: 'Yellow Hawks',
        },
        notes: 'Experienced FIFA certified referee',
        serviceId: 'svc_tourney_2026',
      });

      expect(result.id).toBe('usr_mark');
      expect(result.opportunityId).toBe('opp_referee');
      expect(result.serviceId).toBe('svc_tourney_2026');
      expect(result.memberId).toBe('usr_mark');
      expect(result.memberName).toBe('Mark Anton');
      expect(result.memberRole).toBe('servant');
      expect(result.team).toBe('Yellow Hawks');
      expect(result.status).toBe(APPLICATION_STATUS.PENDING);
      expect(result.resolvedAt).toBeNull();
      expect(result.resolvedBy).toBeNull();
      expect(result.notes).toBe('Experienced FIFA certified referee');

      // Verify saved in Firestore
      const path = applicationDocPath('vbt_main', 'opp_referee', 'usr_mark');
      const stored = mockDocs.get(path);
      expect(stored).toBeDefined();
      expect(stored.memberName).toBe('Mark Anton');
    });

    it('supports custom applicationId and handles alternative member properties', async () => {
      const result = await applyForOpportunity({
        opportunityId: 'opp_first_aid',
        member: {
          uid: 'usr_nurse_1',
          displayName: 'Nurse Mary',
          memberRole: 'medical_staff',
          teamId: 'Red Lions',
          notes: 'Available Friday afternoon',
        },
        applicationId: 'custom_app_123',
      });

      expect(result.id).toBe('custom_app_123');
      expect(result.memberId).toBe('usr_nurse_1');
      expect(result.memberName).toBe('Nurse Mary');
      expect(result.memberRole).toBe('medical_staff');
      expect(result.team).toBe('Red Lions');
      expect(result.notes).toBe('Available Friday afternoon');

      const path = applicationDocPath('vbt_main', 'opp_first_aid', 'custom_app_123');
      expect(mockDocs.get(path)).toBeDefined();
    });
  });

  describe('updateApplicationStatus', () => {
    it('throws error when required parameters are missing', async () => {
      await expect(
        updateApplicationStatus('vbt_main', '', 'app_1', 'approved')
      ).rejects.toThrow('opportunityId and applicationId are required');

      await expect(
        updateApplicationStatus('vbt_main', 'opp_1', '', 'approved')
      ).rejects.toThrow('opportunityId and applicationId are required');

      await expect(
        updateApplicationStatus('vbt_main', 'opp_1', 'app_1', '')
      ).rejects.toThrow('newStatus is required');
    });

    it('approves an application and records resolving leader info', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_tech',
        member: { id: 'usr_tech_1', name: 'John Doe' },
      });

      const updated = await updateApplicationStatus(
        'vbt_main',
        'opp_tech',
        'usr_tech_1',
        APPLICATION_STATUS.APPROVED,
        'Pastor David'
      );

      expect(updated.status).toBe(APPLICATION_STATUS.APPROVED);
      expect(updated.resolvedBy).toBe('Pastor David');
      expect(updated.resolvedAt).toBeDefined();

      const path = applicationDocPath('vbt_main', 'opp_tech', 'usr_tech_1');
      const stored = mockDocs.get(path);
      expect(stored.status).toBe(APPLICATION_STATUS.APPROVED);
      expect(stored.resolvedBy).toBe('Pastor David');
    });

    it('declines an application and records resolving leader', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_tech',
        member: { id: 'usr_tech_2', name: 'Samir K.' },
      });

      const updated = await updateApplicationStatus(
        'vbt_main',
        'opp_tech',
        'usr_tech_2',
        APPLICATION_STATUS.DECLINED,
        'Leader Mina'
      );

      expect(updated.status).toBe(APPLICATION_STATUS.DECLINED);
      expect(updated.resolvedBy).toBe('Leader Mina');
    });

    it('resets application to pending and clears resolved fields', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_tech',
        member: { id: 'usr_tech_3', name: 'George N.' },
      });

      await updateApplicationStatus(
        'vbt_main',
        'opp_tech',
        'usr_tech_3',
        APPLICATION_STATUS.APPROVED,
        'Leader Mina'
      );

      const reset = await updateApplicationStatus(
        'vbt_main',
        'opp_tech',
        'usr_tech_3',
        APPLICATION_STATUS.PENDING
      );

      expect(reset.status).toBe(APPLICATION_STATUS.PENDING);
      expect(reset.resolvedAt).toBeNull();
      expect(reset.resolvedBy).toBeNull();

      const stored = mockDocs.get(applicationDocPath('vbt_main', 'opp_tech', 'usr_tech_3'));
      expect(stored.resolvedAt).toBeNull();
      expect(stored.resolvedBy).toBeNull();
    });
  });

  describe('confirmAssignment', () => {
    it('throws error when opportunityId or applicationId is missing', async () => {
      await expect(confirmAssignment('vbt_main', null, 'app_1')).rejects.toThrow(
        'opportunityId and applicationId are required'
      );
      await expect(confirmAssignment('vbt_main', 'opp_1', null)).rejects.toThrow(
        'opportunityId and applicationId are required'
      );
    });

    it('updates status to confirmed and records confirmation timestamp', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_water',
        member: { id: 'usr_water_1', name: 'Peter S.' },
      });

      const result = await confirmAssignment('vbt_main', 'opp_water', 'usr_water_1');

      expect(result.id).toBe('usr_water_1');
      expect(result.status).toBe(APPLICATION_STATUS.CONFIRMED);
      expect(result.confirmedAt).toBeDefined();

      const stored = mockDocs.get(applicationDocPath('vbt_main', 'opp_water', 'usr_water_1'));
      expect(stored.status).toBe(APPLICATION_STATUS.CONFIRMED);
    });
  });

  describe('requestReplacement', () => {
    it('throws error when opportunityId or applicationId is missing', async () => {
      await expect(requestReplacement('vbt_main', null, 'app_1', 'Sick')).rejects.toThrow(
        'opportunityId and applicationId are required'
      );
      await expect(requestReplacement('vbt_main', 'opp_1', null, 'Sick')).rejects.toThrow(
        'opportunityId and applicationId are required'
      );
    });

    it('marks application as replacement_requested and records the reason', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_security',
        member: { id: 'usr_sec_1', name: 'Fadi M.' },
      });

      const result = await requestReplacement(
        'vbt_main',
        'opp_security',
        'usr_sec_1',
        'Family emergency came up'
      );

      expect(result.id).toBe('usr_sec_1');
      expect(result.status).toBe(APPLICATION_STATUS.REPLACEMENT_REQUESTED);
      expect(result.replacementReason).toBe('Family emergency came up');
      expect(result.replacementRequestedAt).toBeDefined();

      const stored = mockDocs.get(applicationDocPath('vbt_main', 'opp_security', 'usr_sec_1'));
      expect(stored.status).toBe(APPLICATION_STATUS.REPLACEMENT_REQUESTED);
      expect(stored.replacementReason).toBe('Family emergency came up');
    });
  });

  describe('getOpportunityApplications and getApplicationById', () => {
    it('returns empty array when opportunityId is empty or null', async () => {
      expect(await getOpportunityApplications('vbt_main', '')).toEqual([]);
      expect(await getOpportunityApplications('vbt_main', null)).toEqual([]);
    });

    it('fetches all applications for a given opportunity', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_catering',
        member: { id: 'usr_c1', name: 'Chef Mario' },
      });
      await applyForOpportunity({
        opportunityId: 'opp_catering',
        member: { id: 'usr_c2', name: 'Assistant Luigi' },
      });
      // Another opportunity shouldn't bleed in
      await applyForOpportunity({
        opportunityId: 'opp_other',
        member: { id: 'usr_c3', name: 'Other Servant' },
      });

      const apps = await getOpportunityApplications('vbt_main', 'opp_catering');
      expect(apps.length).toBe(2);
      expect(apps.map((a) => a.id)).toContain('usr_c1');
      expect(apps.map((a) => a.id)).toContain('usr_c2');
    });

    it('retrieves single application by ID', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_audio',
        member: { id: 'usr_sound', name: 'Sound Tech' },
        notes: 'Audio mixing board expert',
      });

      const app = await getApplicationById('vbt_main', 'opp_audio', 'usr_sound');
      expect(app).not.toBeNull();
      expect(app.id).toBe('usr_sound');
      expect(app.memberName).toBe('Sound Tech');
      expect(app.notes).toBe('Audio mixing board expert');
    });

    it('returns null for nonexistent application', async () => {
      const app = await getApplicationById('vbt_main', 'opp_audio', 'non_existent_id');
      expect(app).toBeNull();
    });

    it('returns null when parameters are missing', async () => {
      expect(await getApplicationById('vbt_main', '', 'app_1')).toBeNull();
      expect(await getApplicationById('vbt_main', 'opp_1', '')).toBeNull();
    });
  });

  describe('subscribeToOpportunityApplications', () => {
    it('calls callback with live applications and provides unsubscribe', async () => {
      await applyForOpportunity({
        opportunityId: 'opp_live',
        member: { id: 'usr_live_1', name: 'Live Volunteer' },
      });

      const callback = vi.fn();
      const unsubscribe = subscribeToOpportunityApplications('vbt_main', 'opp_live', callback);

      expect(typeof unsubscribe).toBe('function');
      expect(callback).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'usr_live_1', memberName: 'Live Volunteer' }),
        ])
      );
    });

    it('handles empty opportunityId by calling callback with empty array', () => {
      const callback = vi.fn();
      const unsub = subscribeToOpportunityApplications('vbt_main', '', callback);
      expect(callback).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });

    it('handles snapshot error gracefully by passing empty array', () => {
      const callback = vi.fn();
      // create a mock trigger error
      const mockRef = { path: 'error_path', _triggerError: true };
      import('firebase/firestore').then(({ collection }) => {
        vi.mocked(collection).mockReturnValueOnce(mockRef);
        subscribeToOpportunityApplications('vbt_main', 'opp_err', callback);
        expect(callback).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('calculateApplicationStats', () => {
    it('aggregates statistics across application statuses, roles, and teams', () => {
      const apps = [
        { status: APPLICATION_STATUS.PENDING, memberRole: 'servant', team: 'Lions' },
        { status: APPLICATION_STATUS.APPROVED, memberRole: 'servant', team: 'Lions' },
        { status: APPLICATION_STATUS.CONFIRMED, memberRole: 'leader', team: 'Eagles' },
        { status: APPLICATION_STATUS.DECLINED, memberRole: 'servant', team: 'Tigers' },
        { status: APPLICATION_STATUS.REPLACEMENT_REQUESTED, memberRole: 'servant', team: 'Eagles' },
      ];

      const stats = calculateApplicationStats(apps);

      expect(stats.total).toBe(5);
      expect(stats.pending).toBe(1);
      expect(stats.approved).toBe(1);
      expect(stats.confirmed).toBe(1);
      expect(stats.declined).toBe(1);
      expect(stats.replacement_requested).toBe(1);

      expect(stats.byTeam.Lions).toBe(2);
      expect(stats.byTeam.Eagles).toBe(2);
      expect(stats.byTeam.Tigers).toBe(1);

      expect(stats.byRole.servant).toBe(4);
      expect(stats.byRole.leader).toBe(1);
    });

    it('handles empty applications list gracefully', () => {
      const stats = calculateApplicationStats([]);
      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.approved).toBe(0);
      expect(stats.confirmed).toBe(0);
      expect(stats.declined).toBe(0);
      expect(stats.replacement_requested).toBe(0);
      expect(stats.byTeam).toEqual({});
      expect(stats.byRole).toEqual({});
    });
  });
});
