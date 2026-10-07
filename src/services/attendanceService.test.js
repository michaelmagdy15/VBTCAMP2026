import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  attendanceDocPath,
  attendanceCollectionPath,
  recordAttendance,
  updateAttendanceStatus,
  getServiceAttendance,
  getMemberServiceStatus,
  calculateAttendanceStats,
  ATTENDANCE_STATUS,
  CHECKIN_METHOD,
} from './attendanceService';

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
  setDoc: vi.fn(async (docRef, data) => {
    const existing = mockDocs.get(docRef.path) || {};
    mockDocs.set(docRef.path, { ...existing, ...data });
    return true;
  }),
  updateDoc: vi.fn(async (docRef, data) => {
    const existing = mockDocs.get(docRef.path) || {};
    mockDocs.set(docRef.path, { ...existing, ...data });
    return true;
  }),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  limit: vi.fn((n) => ({ limit: n })),
  onSnapshot: vi.fn((queryOrRef, onNext) => {
    onNext({
      forEach: () => {},
    });
    return () => {};
  }),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
}));

describe('AttendanceService', () => {
  beforeEach(() => {
    mockDocs.clear();
    vi.clearAllMocks();
  });

  describe('Path helpers & Constants', () => {
    it('constructs correct collection and document paths', () => {
      expect(attendanceCollectionPath('vbt_main', 'svc_1')).toBe(
        'vbt_communities/vbt_main/services/svc_1/attendance'
      );
      expect(attendanceDocPath('vbt_main', 'svc_1', 'usr_1')).toBe(
        'vbt_communities/vbt_main/services/svc_1/attendance/usr_1'
      );
    });

    it('exposes standard status and method enums', () => {
      expect(ATTENDANCE_STATUS.PRESENT).toBe('present');
      expect(ATTENDANCE_STATUS.LATE).toBe('late');
      expect(ATTENDANCE_STATUS.EXCUSED).toBe('excused');
      expect(CHECKIN_METHOD.QR_SCAN).toBe('qr_scan');
      expect(CHECKIN_METHOD.MANUAL_LEADER).toBe('manual_leader');
    });
  });

  describe('recordAttendance', () => {
    it('throws error when serviceId or member is missing', async () => {
      await expect(
        recordAttendance({ serviceId: null, member: { id: 'usr_1' } })
      ).rejects.toThrow('serviceId is required');

      await expect(
        recordAttendance({ serviceId: 'svc_1', member: null })
      ).rejects.toThrow('member with valid id is required');
    });

    it('records attendance idempotently with member id as document id', async () => {
      const result = await recordAttendance({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceInfo: { title: 'Friday Service', date: '2026-07-10' },
        member: { id: 'usr_42', displayName: 'David M.', role: 'servant', team: 'Tigers' },
        status: ATTENDANCE_STATUS.PRESENT,
        checkInMethod: CHECKIN_METHOD.QR_SCAN,
        markedBy: 'usr_42',
      });

      expect(result.id).toBe('usr_42');
      expect(result.displayName).toBe('David M.');
      expect(result.status).toBe('present');
      expect(result.checkInMethod).toBe('qr_scan');
      expect(result.serviceTitle).toBe('Friday Service');

      // Verify stored in mock firestore
      const path = attendanceDocPath('vbt_main', 'svc_1', 'usr_42');
      const stored = mockDocs.get(path);
      expect(stored).toBeDefined();
      expect(stored.team).toBe('Tigers');
    });
  });

  describe('updateAttendanceStatus', () => {
    it('updates status and markedBy on existing record', async () => {
      // First record attendance
      await recordAttendance({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        member: { id: 'usr_10', displayName: 'Sarah K.' },
        status: ATTENDANCE_STATUS.PRESENT,
      });

      // Update to late by leader
      await updateAttendanceStatus('vbt_main', 'svc_1', 'usr_10', ATTENDANCE_STATUS.LATE, 'leader_mike');

      const path = attendanceDocPath('vbt_main', 'svc_1', 'usr_10');
      const updated = mockDocs.get(path);
      expect(updated.status).toBe('late');
      expect(updated.markedBy).toBe('leader_mike');
    });
  });

  describe('getServiceAttendance and getMemberServiceStatus', () => {
    it('returns empty array when serviceId is null or empty', async () => {
      const res = await getServiceAttendance('vbt_main', null);
      expect(res).toEqual([]);
    });

    it('fetches all attendance records for a service', async () => {
      await recordAttendance({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        member: { id: 'usr_1', displayName: 'User 1' },
      });
      await recordAttendance({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        member: { id: 'usr_2', displayName: 'User 2' },
      });

      const list = await getServiceAttendance('vbt_main', 'svc_1');
      expect(list.length).toBe(2);
      expect(list.map((r) => r.id)).toContain('usr_1');
      expect(list.map((r) => r.id)).toContain('usr_2');
    });

    it('retrieves single member attendance status', async () => {
      await recordAttendance({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        member: { id: 'usr_99', displayName: 'Member 99' },
        status: ATTENDANCE_STATUS.EXCUSED,
      });

      const status = await getMemberServiceStatus('vbt_main', 'svc_1', 'usr_99');
      expect(status).not.toBeNull();
      expect(status.status).toBe('excused');

      const nonExistent = await getMemberServiceStatus('vbt_main', 'svc_1', 'usr_none');
      expect(nonExistent).toBeNull();
    });
  });

  describe('calculateAttendanceStats', () => {
    it('computes counts, breakdown by role and team', () => {
      const sample = [
        { status: 'present', memberRole: 'servant', team: 'Lions' },
        { status: 'present', memberRole: 'member', team: 'Lions' },
        { status: 'late', memberRole: 'servant', team: 'Eagles' },
        { status: 'excused', memberRole: 'member', team: 'Tigers' },
      ];

      const stats = calculateAttendanceStats(sample);
      expect(stats.total).toBe(4);
      expect(stats.present).toBe(2);
      expect(stats.late).toBe(1);
      expect(stats.excused).toBe(1);
      expect(stats.byRole.servant).toBe(2);
      expect(stats.byRole.member).toBe(2);
      expect(stats.byTeam.Lions).toBe(2);
      expect(stats.byTeam.Eagles).toBe(1);
    });

    it('handles empty list gracefully', () => {
      const stats = calculateAttendanceStats([]);
      expect(stats.total).toBe(0);
      expect(stats.present).toBe(0);
      expect(stats.late).toBe(0);
      expect(stats.excused).toBe(0);
    });
  });
});
