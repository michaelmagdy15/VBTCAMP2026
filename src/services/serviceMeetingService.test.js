import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SERVICE_TYPES,
  SERVICE_STATUS,
  serviceDocPath,
  servicesCollectionPath,
  formatTimeRange,
  getNextDayOfWeekDate,
  createService,
  getServiceById,
  updateService,
  deleteService,
} from './serviceMeetingService';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, path) => ({ path })),
    doc: vi.fn((_db, path, id) => ({ path: id ? `${path}/${id}` : path })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn((col) => col),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

import { getDoc, setDoc, deleteDoc } from 'firebase/firestore';

describe('ServiceMeetingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatTimeRange', () => {
    it('formats 24h start and end times into 12h AM/PM strings', () => {
      expect(formatTimeRange('18:00', '21:30')).toBe('6:00 PM - 9:30 PM');
      expect(formatTimeRange('09:00', '11:15')).toBe('9:00 AM - 11:15 AM');
      expect(formatTimeRange('12:00', '13:00')).toBe('12:00 PM - 1:00 PM');
    });

    it('handles start time only without end time', () => {
      expect(formatTimeRange('18:00')).toBe('6:00 PM');
    });

    it('returns empty string for null or empty start time', () => {
      expect(formatTimeRange(null)).toBe('');
      expect(formatTimeRange('')).toBe('');
    });
  });

  describe('getNextDayOfWeekDate', () => {
    it('computes next target day of week correctly', () => {
      // Reference Wednesday, July 8, 2026
      const wednesday = new Date('2026-07-08T12:00:00Z');
      expect(wednesday.getDay()).toBe(3); // Wednesday = 3

      // Next Friday (day 5) should be July 10, 2026
      const nextFriday = getNextDayOfWeekDate(5, wednesday);
      expect(nextFriday).toBe('2026-07-10');

      // Next Sunday (day 0) should be July 12, 2026
      const nextSunday = getNextDayOfWeekDate(0, wednesday);
      expect(nextSunday).toBe('2026-07-12');

      // If today is Friday (day 5), target Friday returns today
      const friday = new Date('2026-07-10T12:00:00Z');
      const sameFriday = getNextDayOfWeekDate(5, friday);
      expect(sameFriday).toBe('2026-07-10');
    });
  });

  describe('Path helpers & Constants', () => {
    it('constructs correct document and collection paths', () => {
      expect(servicesCollectionPath('vbt_main')).toBe('vbt_communities/vbt_main/services');
      expect(serviceDocPath('vbt_main', 'svc_123')).toBe('vbt_communities/vbt_main/services/svc_123');
    });

    it('exposes standard service types and statuses', () => {
      expect(SERVICE_TYPES.WEEKLY_SERVICE).toBe('weekly_service');
      expect(SERVICE_TYPES.SERVANT_MEETING).toBe('servant_meeting');
      expect(SERVICE_STATUS.SCHEDULED).toBe('scheduled');
      expect(SERVICE_STATUS.COMPLETED).toBe('completed');
    });
  });

  describe('createService', () => {
    it('initializes service document with defaults and saves to Firestore', async () => {
      const created = await createService('vbt_main', {
        id: 'svc_test_1',
        title: 'Friday Fellowship & Sports',
        date: '2026-07-10',
        startTime: '18:00',
        endTime: '21:30',
      });

      expect(created.id).toBe('svc_test_1');
      expect(created.communityId).toBe('vbt_main');
      expect(created.title).toBe('Friday Fellowship & Sports');
      expect(created.serviceType).toBe(SERVICE_TYPES.WEEKLY_SERVICE);
      expect(created.status).toBe(SERVICE_STATUS.SCHEDULED);
      expect(created.qrSessionActive).toBe(false);
      expect(created.attendeesCount).toBe(0);

      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'vbt_communities/vbt_main/services/svc_test_1' }),
        expect.objectContaining({ title: 'Friday Fellowship & Sports' })
      );
    });
  });

  describe('getServiceById', () => {
    it('returns service object when document exists', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'svc_456',
        data: () => ({ title: 'Youth Night', date: '2026-07-17' }),
      });

      const svc = await getServiceById('vbt_main', 'svc_456');
      expect(svc.id).toBe('svc_456');
      expect(svc.title).toBe('Youth Night');
    });

    it('returns null when document does not exist', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });
      const svc = await getServiceById('vbt_main', 'svc_nonexistent');
      expect(svc).toBeNull();
    });

    it('returns null for empty serviceId', async () => {
      expect(await getServiceById('vbt_main', '')).toBeNull();
      expect(await getServiceById('vbt_main', null)).toBeNull();
    });
  });

  describe('updateService', () => {
    it('updates service fields and adds serverTimestamp', async () => {
      const updates = { title: 'Updated Title', status: SERVICE_STATUS.IN_PROGRESS };
      const applied = await updateService('vbt_main', 'svc_456', updates);

      expect(applied.title).toBe('Updated Title');
      expect(applied.status).toBe(SERVICE_STATUS.IN_PROGRESS);
      expect(setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'vbt_communities/vbt_main/services/svc_456' }),
        expect.objectContaining({ title: 'Updated Title', updatedAt: 'MOCK_TIMESTAMP' }),
        { merge: true }
      );
    });

    it('throws error if serviceId is missing', async () => {
      await expect(updateService('vbt_main', '', { title: 'Test' })).rejects.toThrow('serviceId is required');
    });
  });

  describe('deleteService', () => {
    it('deletes service document', async () => {
      const result = await deleteService('vbt_main', 'svc_456');
      expect(result).toBe(true);
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'vbt_communities/vbt_main/services/svc_456' })
      );
    });
  });
});
