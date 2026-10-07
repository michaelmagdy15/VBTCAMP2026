import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_COMMUNITY_ID,
  DEFAULT_COMMUNITY_CONFIG,
  getCommunity,
  subscribeToCommunity,
  updateCommunitySettings,
} from './communityService';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, collection, id) => ({ path: `${collection}/${id}` })),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

import { getDoc, setDoc, onSnapshot } from 'firebase/firestore';

describe('CommunityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes DEFAULT_COMMUNITY_ID and valid DEFAULT_COMMUNITY_CONFIG', () => {
    expect(DEFAULT_COMMUNITY_ID).toBe('vbt_main');
    expect(DEFAULT_COMMUNITY_CONFIG.name).toBe('Value Blessings Team');
    expect(DEFAULT_COMMUNITY_CONFIG.settings.features.qrAttendance).toBe(true);
  });

  describe('getCommunity', () => {
    it('returns existing community doc if found', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'vbt_main',
        data: () => ({ name: 'Custom VBT Name', activeEventCode: 'august15' }),
      });

      const comm = await getCommunity('vbt_main');
      expect(comm.id).toBe('vbt_main');
      expect(comm.name).toBe('Custom VBT Name');
      expect(comm.activeEventCode).toBe('august15');
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('initializes default community config if document does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const comm = await getCommunity('vbt_main');
      expect(comm.id).toBe('vbt_main');
      expect(comm.name).toBe('Value Blessings Team');
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'vbt_communities/vbt_main' }),
        expect.objectContaining({ name: 'Value Blessings Team', id: 'vbt_main' }),
        { merge: true }
      );
    });

    it('returns fallback config on unexpected firestore error', async () => {
      getDoc.mockRejectedValueOnce(new Error('Connection failure'));

      const comm = await getCommunity('vbt_main');
      expect(comm.id).toBe('vbt_main');
      expect(comm.name).toBe('Value Blessings Team');
    });
  });

  describe('subscribeToCommunity', () => {
    it('sets up onSnapshot listener and passes data to callback', () => {
      let registeredCallback = null;
      onSnapshot.mockImplementation((_ref, successCb) => {
        registeredCallback = successCb;
        return vi.fn(); // unsubscribe
      });

      const cb = vi.fn();
      const unsub = subscribeToCommunity('vbt_main', cb);

      expect(typeof unsub).toBe('function');
      expect(registeredCallback).not.toBeNull();

      registeredCallback({
        exists: () => true,
        id: 'vbt_main',
        data: () => ({ name: 'Live VBT Updates' }),
      });

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'vbt_main', name: 'Live VBT Updates' })
      );
    });
  });

  describe('updateCommunitySettings', () => {
    it('calls setDoc with updates and serverTimestamp', async () => {
      await updateCommunitySettings('vbt_main', {
        tagline: 'New Tagline',
      });

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'vbt_communities/vbt_main' }),
        expect.objectContaining({ tagline: 'New Tagline', updatedAt: 'MOCK_TIMESTAMP' }),
        { merge: true }
      );
    });
  });
});
