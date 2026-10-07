import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateRollingToken,
  encodeQRData,
  parseQRData,
  createQRSession,
  rotateSessionToken,
  endQRSession,
  getQRSession,
  verifyAndProcessQRCheckIn,
  QR_SESSION_STATUS,
  qrSessionDocPath,
} from './qrSessionService';

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
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
}));

// Mock attendanceService functions
const mockAttendance = new Map();
vi.mock('./attendanceService', () => ({
  CHECKIN_METHOD: { QR_SCAN: 'qr_scan' },
  ATTENDANCE_STATUS: { PRESENT: 'present' },
  recordAttendance: vi.fn(async ({ communityId, serviceId, member }) => {
    const key = `${communityId}/${serviceId}/${member.id}`;
    const rec = { id: member.id, memberName: member.displayName, checkedIn: true };
    mockAttendance.set(key, rec);
    return rec;
  }),
  getMemberServiceStatus: vi.fn(async (communityId, serviceId, memberId) => {
    const key = `${communityId}/${serviceId}/${memberId}`;
    return mockAttendance.get(key) || null;
  }),
}));

describe('QRSessionService', () => {
  beforeEach(() => {
    mockDocs.clear();
    mockAttendance.clear();
    vi.clearAllMocks();
  });

  describe('generateRollingToken', () => {
    it('generates an uppercase alphanumeric string of specified length', () => {
      const token1 = generateRollingToken(10);
      const token2 = generateRollingToken(8);
      expect(token1).toHaveLength(10);
      expect(token2).toHaveLength(8);
      expect(token1).not.toBe(token2);
      // Valid base32 charset check (no 0, O, 1, I)
      expect(/^[A-HJ-NP-Z2-9]+$/.test(token1)).toBe(true);
    });
  });

  describe('encodeQRData and parseQRData', () => {
    it('encodes and decodes QR payload correctly', () => {
      const payload = {
        communityId: 'vbt_main',
        sessionId: 'qrs_123',
        serviceId: 'svc_abc',
        token: 'TOKEN123',
      };
      const encoded = encodeQRData(payload);
      expect(typeof encoded).toBe('string');

      const parsed = parseQRData(encoded);
      expect(parsed).toEqual({
        version: 1,
        communityId: 'vbt_main',
        sessionId: 'qrs_123',
        serviceId: 'svc_abc',
        token: 'TOKEN123',
      });
    });

    it('returns null for corrupted or non-VBT QR strings', () => {
      expect(parseQRData(null)).toBeNull();
      expect(parseQRData('')).toBeNull();
      expect(parseQRData('not json string')).toBeNull();
      expect(parseQRData('{"foo": "bar"}')).toBeNull();
      expect(parseQRData('{"v": 2, "c": "vbt"}')).toBeNull();
    });
  });

  describe('createQRSession', () => {
    it('throws error if serviceId or hostUid is missing', async () => {
      await expect(
        createQRSession({ serviceId: null, hostUid: 'host_1' })
      ).rejects.toThrow('serviceId is required');

      await expect(
        createQRSession({ serviceId: 'svc_1', hostUid: null })
      ).rejects.toThrow('hostUid is required');
    });

    it('creates active session with rolling token and expiration', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Friday Youth Gathering',
        hostUid: 'usr_leader',
        hostName: 'Coach John',
        durationMinutes: 60,
      });

      expect(session.id).toMatch(/^qrs_svc_1_/);
      expect(session.status).toBe(QR_SESSION_STATUS.ACTIVE);
      expect(session.activeToken).toBeDefined();
      expect(session.previousToken).toBeNull();
      expect(session.expiresAtMs).toBeGreaterThan(Date.now());

      const fetched = await getQRSession('vbt_main', session.id);
      expect(fetched).not.toBeNull();
      expect(fetched.serviceTitle).toBe('Friday Youth Gathering');
    });
  });

  describe('rotateSessionToken and endQRSession', () => {
    it('rotates token and stores previous active token for grace period', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Weekly Service',
        hostUid: 'usr_leader',
      });

      const initialToken = session.activeToken;
      const newToken = await rotateSessionToken('vbt_main', session.id, initialToken);

      expect(newToken).not.toBe(initialToken);

      const path = qrSessionDocPath('vbt_main', session.id);
      const stored = mockDocs.get(path);
      expect(stored.activeToken).toBe(newToken);
      expect(stored.previousToken).toBe(initialToken);
    });

    it('ends active session', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Weekly Service',
        hostUid: 'usr_leader',
      });

      await endQRSession('vbt_main', session.id);

      const path = qrSessionDocPath('vbt_main', session.id);
      expect(mockDocs.get(path).status).toBe(QR_SESSION_STATUS.ENDED);
    });
  });

  describe('verifyAndProcessQRCheckIn', () => {
    const member = { id: 'usr_member_1', displayName: 'Peter A.', role: 'member' };

    it('rejects if member is missing or unauthenticated', async () => {
      const res = await verifyAndProcessQRCheckIn({ rawQRData: 'abc', member: null });
      expect(res.success).toBe(false);
      expect(res.message).toContain('valid member profile');
    });

    it('rejects invalid QR format', async () => {
      const res = await verifyAndProcessQRCheckIn({ rawQRData: 'invalid_code', member });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Invalid QR code');
    });

    it('rejects session from different community', async () => {
      const raw = encodeQRData({
        communityId: 'other_church',
        sessionId: 'qrs_1',
        serviceId: 'svc_1',
        token: 'TOKEN',
      });
      const res = await verifyAndProcessQRCheckIn({
        rawQRData: raw,
        member,
        expectedCommunityId: 'vbt_main',
      });
      expect(res.success).toBe(false);
      expect(res.message).toContain('different VBT community');
    });

    it('rejects expired or ended session', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Weekly Service',
        hostUid: 'usr_leader',
      });

      // End session
      await endQRSession('vbt_main', session.id);

      const raw = encodeQRData({
        communityId: 'vbt_main',
        sessionId: session.id,
        serviceId: 'svc_1',
        token: session.activeToken,
      });

      const res = await verifyAndProcessQRCheckIn({
        rawQRData: raw,
        member,
        expectedCommunityId: 'vbt_main',
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('ended');
    });

    it('rejects invalid or rotated token beyond grace period', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Weekly Service',
        hostUid: 'usr_leader',
      });

      const raw = encodeQRData({
        communityId: 'vbt_main',
        sessionId: session.id,
        serviceId: 'svc_1',
        token: 'EXPIRED_OLD_TOKEN',
      });

      const res = await verifyAndProcessQRCheckIn({
        rawQRData: raw,
        member,
        expectedCommunityId: 'vbt_main',
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('rotated or expired');
    });

    it('succeeds with current active token', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Weekly Service',
        hostUid: 'usr_leader',
      });

      const raw = encodeQRData({
        communityId: 'vbt_main',
        sessionId: session.id,
        serviceId: 'svc_1',
        token: session.activeToken,
      });

      const res = await verifyAndProcessQRCheckIn({
        rawQRData: raw,
        member,
        expectedCommunityId: 'vbt_main',
      });

      expect(res.success).toBe(true);
      expect(res.alreadyCheckedIn).toBe(false);
      expect(res.serviceTitle).toBe('Weekly Service');
      expect(res.attendanceRecord).toBeDefined();
    });

    it('succeeds with previous token within grace window', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Weekly Service',
        hostUid: 'usr_leader',
      });

      const oldToken = session.activeToken;
      // Rotate token
      await rotateSessionToken('vbt_main', session.id, oldToken);

      // Member scans oldToken
      const raw = encodeQRData({
        communityId: 'vbt_main',
        sessionId: session.id,
        serviceId: 'svc_1',
        token: oldToken,
      });

      const res = await verifyAndProcessQRCheckIn({
        rawQRData: raw,
        member,
        expectedCommunityId: 'vbt_main',
      });

      expect(res.success).toBe(true);
    });

    it('detects when member is already checked in', async () => {
      const session = await createQRSession({
        communityId: 'vbt_main',
        serviceId: 'svc_1',
        serviceTitle: 'Weekly Service',
        hostUid: 'usr_leader',
      });

      // Pre-populate attendance
      mockAttendance.set(`vbt_main/svc_1/${member.id}`, { checkedIn: true });

      const raw = encodeQRData({
        communityId: 'vbt_main',
        sessionId: session.id,
        serviceId: 'svc_1',
        token: session.activeToken,
      });

      const res = await verifyAndProcessQRCheckIn({
        rawQRData: raw,
        member,
        expectedCommunityId: 'vbt_main',
      });

      expect(res.success).toBe(true);
      expect(res.alreadyCheckedIn).toBe(true);
      expect(res.message).toContain('already checked in');
    });
  });
});
