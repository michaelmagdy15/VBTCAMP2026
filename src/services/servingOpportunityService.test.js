import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OPPORTUNITY_ROLES,
  OPPORTUNITY_STATUS,
  opportunityDocPath,
  opportunitiesCollectionPath,
  getRemainingSpots,
  isOpportunityOpen,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunityById,
  getOpportunities,
  subscribeToOpportunities,
} from './servingOpportunityService';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, path) => ({ path })),
    doc: vi.fn((_db, path, id) => ({ path: id ? `${path}/${id}` : path })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn((col, ...constraints) => ({ path: col.path, constraints })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    orderBy: vi.fn((field, dir) => ({ field, dir })),
    limit: vi.fn((num) => ({ limit: num })),
    onSnapshot: vi.fn(() => vi.fn()),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

describe('servingOpportunityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Path helpers & Constants', () => {
    it('constructs correct path for opportunity document', () => {
      expect(opportunityDocPath('vbt_main', 'opp_123')).toBe(
        'vbt_communities/vbt_main/serving_opportunities/opp_123'
      );
      expect(opportunityDocPath(undefined, 'opp_456')).toBe(
        'vbt_communities/vbt_main/serving_opportunities/opp_456'
      );
    });

    it('constructs correct path for opportunities collection', () => {
      expect(opportunitiesCollectionPath('vbt_main')).toBe(
        'vbt_communities/vbt_main/serving_opportunities'
      );
      expect(opportunitiesCollectionPath()).toBe(
        'vbt_communities/vbt_main/serving_opportunities'
      );
    });

    it('exposes standard opportunity roles', () => {
      expect(OPPORTUNITY_ROLES.REFEREE).toBe('referee');
      expect(OPPORTUNITY_ROLES.PRAISE).toBe('praise');
      expect(OPPORTUNITY_ROLES.LOGISTICS).toBe('logistics');
      expect(OPPORTUNITY_ROLES.FIRST_AID).toBe('first_aid');
      expect(OPPORTUNITY_ROLES.MEDIA).toBe('media');
      expect(OPPORTUNITY_ROLES.SETUP).toBe('setup');
      expect(OPPORTUNITY_ROLES.GENERAL).toBe('general');
    });

    it('exposes standard opportunity status constants', () => {
      expect(OPPORTUNITY_STATUS.OPEN).toBe('open');
      expect(OPPORTUNITY_STATUS.FILLED).toBe('filled');
      expect(OPPORTUNITY_STATUS.CANCELLED).toBe('cancelled');
    });
  });

  describe('Helper utilities', () => {
    it('getRemainingSpots returns correct remaining slots', () => {
      expect(getRemainingSpots({ spotsNeeded: 5, spotsFilled: 2 })).toBe(3);
      expect(getRemainingSpots({ spotsNeeded: 3, spotsFilled: 3 })).toBe(0);
      expect(getRemainingSpots({ spotsNeeded: 2, spotsFilled: 4 })).toBe(0);
      expect(getRemainingSpots(null)).toBe(0);
    });

    it('isOpportunityOpen checks status and availability', () => {
      expect(isOpportunityOpen({ status: 'open', spotsNeeded: 4, spotsFilled: 1 })).toBe(true);
      expect(isOpportunityOpen({ status: 'filled', spotsNeeded: 4, spotsFilled: 4 })).toBe(false);
      expect(isOpportunityOpen({ status: 'cancelled', spotsNeeded: 4, spotsFilled: 0 })).toBe(false);
      expect(isOpportunityOpen({ status: 'open', spotsNeeded: 2, spotsFilled: 2 })).toBe(false);
      expect(isOpportunityOpen(null)).toBe(false);
    });
  });

  describe('createOpportunity', () => {
    it('creates an opportunity with default values and saves to Firestore', async () => {
      const opp = await createOpportunity('vbt_main', {
        id: 'opp_custom_1',
        title: 'Friday Night Referee',
        serviceId: 'svc_001',
        serviceTitle: 'Weekly Sports Night',
        serviceDate: '2026-10-10',
        role: OPPORTUNITY_ROLES.REFEREE,
        description: 'Referee for volleyball tournament',
        spotsNeeded: 3,
        requirements: ['Whistle', 'Rule knowledge'],
      });

      expect(opp.id).toBe('opp_custom_1');
      expect(opp.communityId).toBe('vbt_main');
      expect(opp.title).toBe('Friday Night Referee');
      expect(opp.serviceId).toBe('svc_001');
      expect(opp.role).toBe('referee');
      expect(opp.spotsNeeded).toBe(3);
      expect(opp.spotsFilled).toBe(0);
      expect(opp.status).toBe(OPPORTUNITY_STATUS.OPEN);
      expect(opp.requirements).toEqual(['Whistle', 'Rule knowledge']);
      expect(opp.createdAt).toBe('MOCK_TIMESTAMP');
      expect(opp.updatedAt).toBe('MOCK_TIMESTAMP');

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'vbt_communities/vbt_main/serving_opportunities/opp_custom_1',
        }),
        expect.objectContaining({
          title: 'Friday Night Referee',
          role: 'referee',
          spotsNeeded: 3,
        })
      );
    });

    it('generates an ID if not provided and sets status to filled if spots are filled', async () => {
      const opp = await createOpportunity('vbt_main', {
        title: 'Photographer',
        role: OPPORTUNITY_ROLES.MEDIA,
        spotsNeeded: 1,
        spotsFilled: 1,
      });

      expect(opp.id).toMatch(/^opp_/);
      expect(opp.status).toBe(OPPORTUNITY_STATUS.FILLED);
      expect(opp.spotsFilled).toBe(1);
    });

    it('supports calling with single object argument omitting communityId', async () => {
      const opp = await createOpportunity({
        title: 'Setup Crew',
        role: OPPORTUNITY_ROLES.SETUP,
        spotsNeeded: '4',
      });

      expect(opp.communityId).toBe('vbt_main');
      expect(opp.title).toBe('Setup Crew');
      expect(opp.spotsNeeded).toBe(4);
      expect(opp.spotsFilled).toBe(0);
      expect(opp.requirements).toEqual([]);
    });
  });

  describe('updateOpportunity', () => {
    it('updates opportunity document with serverTimestamp', async () => {
      const updates = {
        title: 'Updated Referee',
        spotsFilled: 2,
        status: OPPORTUNITY_STATUS.OPEN,
      };

      const result = await updateOpportunity('vbt_main', 'opp_123', updates);

      expect(result.id).toBe('opp_123');
      expect(result.title).toBe('Updated Referee');
      expect(result.updatedAt).toBe('MOCK_TIMESTAMP');

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'vbt_communities/vbt_main/serving_opportunities/opp_123',
        }),
        expect.objectContaining({
          title: 'Updated Referee',
          spotsFilled: 2,
          updatedAt: 'MOCK_TIMESTAMP',
        }),
        { merge: true }
      );
    });

    it('supports calling without explicit communityId: updateOpportunity(id, updates)', async () => {
      const result = await updateOpportunity('opp_999', { status: OPPORTUNITY_STATUS.FILLED });
      expect(result.id).toBe('opp_999');
      expect(result.status).toBe(OPPORTUNITY_STATUS.FILLED);
    });

    it('throws error when opportunityId is missing', async () => {
      await expect(updateOpportunity('vbt_main', '', { title: 'New' })).rejects.toThrow(
        'opportunityId is required'
      );
    });
  });

  describe('deleteOpportunity', () => {
    it('deletes opportunity document', async () => {
      const res = await deleteOpportunity('vbt_main', 'opp_123');
      expect(res).toBe(true);
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'vbt_communities/vbt_main/serving_opportunities/opp_123',
        })
      );
    });

    it('supports calling with single argument omitting communityId', async () => {
      const res = await deleteOpportunity('opp_123');
      expect(res).toBe(true);
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'vbt_communities/vbt_main/serving_opportunities/opp_123',
        })
      );
    });

    it('throws error when opportunityId is missing', async () => {
      await expect(deleteOpportunity('vbt_main', '')).rejects.toThrow(
        'opportunityId is required'
      );
    });
  });

  describe('getOpportunityById', () => {
    it('returns opportunity object when document exists', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'opp_abc',
        data: () => ({
          title: 'First Aid Volunteer',
          role: 'first_aid',
          spotsNeeded: 2,
        }),
      });

      const opp = await getOpportunityById('vbt_main', 'opp_abc');
      expect(opp).not.toBeNull();
      expect(opp.id).toBe('opp_abc');
      expect(opp.title).toBe('First Aid Volunteer');
      expect(opp.role).toBe('first_aid');
    });

    it('supports calling with single argument getOpportunityById(id)', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'opp_abc',
        data: () => ({ title: 'Logistics Lead' }),
      });

      const opp = await getOpportunityById('opp_abc');
      expect(opp.id).toBe('opp_abc');
      expect(opp.title).toBe('Logistics Lead');
    });

    it('returns null when document does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const opp = await getOpportunityById('vbt_main', 'opp_missing');
      expect(opp).toBeNull();
    });

    it('returns null for empty or null opportunityId', async () => {
      expect(await getOpportunityById('vbt_main', '')).toBeNull();
      expect(await getOpportunityById(null)).toBeNull();
    });

    it('returns null on Firestore getDoc rejection', async () => {
      getDoc.mockRejectedValueOnce(new Error('Network error'));
      const opp = await getOpportunityById('vbt_main', 'opp_error');
      expect(opp).toBeNull();
    });
  });

  describe('getOpportunities', () => {
    it('retrieves opportunities with empty filter', async () => {
      const mockDocs = [
        { id: 'opp_1', data: () => ({ title: 'Opp 1', role: 'referee' }) },
        { id: 'opp_2', data: () => ({ title: 'Opp 2', role: 'media' }) },
      ];
      getDocs.mockResolvedValueOnce({
        forEach: (fn) => mockDocs.forEach(fn),
      });

      const results = await getOpportunities('vbt_main');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('opp_1');
      expect(results[1].id).toBe('opp_2');
    });

    it('applies filters for status, role, serviceId, and limit', async () => {
      const mockDocs = [
        { id: 'opp_1', data: () => ({ title: 'Opp 1', status: 'open', role: 'referee' }) },
      ];
      getDocs.mockResolvedValueOnce({
        forEach: (fn) => mockDocs.forEach(fn),
      });

      const results = await getOpportunities('vbt_main', {
        status: 'open',
        role: 'referee',
        serviceId: 'svc_123',
        serviceDate: '2026-10-15',
        limit: 5,
        orderByField: 'serviceDate',
      });

      expect(where).toHaveBeenCalledWith('status', '==', 'open');
      expect(where).toHaveBeenCalledWith('role', '==', 'referee');
      expect(where).toHaveBeenCalledWith('serviceId', '==', 'svc_123');
      expect(where).toHaveBeenCalledWith('serviceDate', '==', '2026-10-15');
      expect(limit).toHaveBeenCalledWith(5);
      expect(orderBy).toHaveBeenCalledWith('serviceDate', 'asc');
      expect(results).toHaveLength(1);
    });

    it('supports calling with filter object as first argument', async () => {
      getDocs.mockResolvedValueOnce({
        forEach: (fn) => [{ id: 'opp_3', data: () => ({ title: 'Praise Leader' }) }].forEach(fn),
      });

      const results = await getOpportunities({ role: 'praise' });
      expect(where).toHaveBeenCalledWith('role', '==', 'praise');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('opp_3');
    });

    it('returns empty array on Firestore error', async () => {
      getDocs.mockRejectedValueOnce(new Error('Permission denied'));
      const results = await getOpportunities('vbt_main');
      expect(results).toEqual([]);
    });
  });

  describe('subscribeToOpportunities', () => {
    it('subscribes with onSnapshot and delivers results to callback', () => {
      const callback = vi.fn();
      let snapshotHandler;

      onSnapshot.mockImplementationOnce((_query, onNext) => {
        snapshotHandler = onNext;
        return vi.fn(); // unsubscribe
      });

      const unsub = subscribeToOpportunities('vbt_main', callback);
      expect(typeof unsub).toBe('function');
      expect(onSnapshot).toHaveBeenCalled();

      // Trigger the snapshot callback
      const mockSnap = {
        forEach: (fn) => {
          fn({ id: 'opp_10', data: () => ({ title: 'Media Director' }) });
        },
      };
      snapshotHandler(mockSnap);

      expect(callback).toHaveBeenCalledWith([
        { id: 'opp_10', title: 'Media Director' },
      ]);
    });

    it('handles snapshot error by sending empty array to callback', () => {
      const callback = vi.fn();
      let errorHandler;

      onSnapshot.mockImplementationOnce((_query, _onNext, onError) => {
        errorHandler = onError;
        return vi.fn();
      });

      subscribeToOpportunities('vbt_main', callback);
      errorHandler(new Error('Subscription failure'));

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('supports calling with signature (callback) omitting communityId', () => {
      const callback = vi.fn();
      subscribeToOpportunities(callback);
      expect(onSnapshot).toHaveBeenCalled();
    });

    it('supports calling with signature (communityId, filterOptions, callback)', () => {
      const callback = vi.fn();
      subscribeToOpportunities('vbt_main', { status: 'open', role: 'referee' }, callback);
      expect(where).toHaveBeenCalledWith('status', '==', 'open');
      expect(where).toHaveBeenCalledWith('role', '==', 'referee');
      expect(onSnapshot).toHaveBeenCalled();
    });

    it('returns noop function if callback is not provided', () => {
      const unsub = subscribeToOpportunities('vbt_main', null);
      expect(typeof unsub).toBe('function');
    });
  });
});
