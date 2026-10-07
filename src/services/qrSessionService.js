import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';
import { recordAttendance, getMemberServiceStatus, CHECKIN_METHOD, ATTENDANCE_STATUS } from './attendanceService';

export const QR_SESSION_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
};

export const DEFAULT_TOKEN_TTL_SECONDS = 45;

/**
 * Path helper for QR sessions collection
 */
export function qrSessionsCollectionPath(communityId) {
  return `vbt_communities/${communityId}/qr_sessions`;
}

/**
 * Path helper for a specific QR session document
 */
export function qrSessionDocPath(communityId, sessionId) {
  return `vbt_communities/${communityId}/qr_sessions/${sessionId}`;
}

/**
 * Generate a cryptographically unguessable alphanumeric rolling token
 * @param {number} [length=10]
 * @returns {string}
 */
export function generateRollingToken(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32 alphabet without easily confused 0, O, 1, I
  let token = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      token += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
}

/**
 * Encode session data into compact QR string
 * @param {Object} params
 * @param {string} params.communityId
 * @param {string} params.sessionId
 * @param {string} params.serviceId
 * @param {string} params.token
 * @returns {string}
 */
export function encodeQRData({ communityId, sessionId, serviceId, token }) {
  return JSON.stringify({
    v: 1,
    c: communityId,
    s: sessionId,
    svc: serviceId,
    t: token,
  });
}

/**
 * Parse and validate QR string format
 * @param {string} rawString
 * @returns {Object|null}
 */
export function parseQRData(rawString) {
  if (!rawString || typeof rawString !== 'string') return null;
  try {
    const data = JSON.parse(rawString);
    if (data.v === 1 && data.c && data.s && data.svc && data.t) {
      return {
        version: data.v,
        communityId: data.c,
        sessionId: data.s,
        serviceId: data.svc,
        token: data.t,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a new QR attendance session
 * @param {Object} params
 * @param {string} [params.communityId]
 * @param {string} params.serviceId
 * @param {string} params.serviceTitle
 * @param {string} [params.serviceDate]
 * @param {string} params.hostUid
 * @param {string} [params.hostName]
 * @param {number} [params.durationMinutes=180]
 * @param {number} [params.tokenTtlSeconds=DEFAULT_TOKEN_TTL_SECONDS]
 * @returns {Promise<Object>}
 */
export async function createQRSession({
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  serviceTitle,
  serviceDate = new Date().toISOString().slice(0, 10),
  hostUid,
  hostName = 'Leader',
  durationMinutes = 180,
  tokenTtlSeconds = DEFAULT_TOKEN_TTL_SECONDS,
}) {
  if (!serviceId) throw new Error('serviceId is required to create a QR session');
  if (!hostUid) throw new Error('hostUid is required to create a QR session');

  const sessionId = `qrs_${serviceId}_${Date.now()}`;
  const docRef = doc(db, qrSessionDocPath(communityId, sessionId));
  const initialToken = generateRollingToken();

  const expiresAtMs = Date.now() + durationMinutes * 60 * 1000;

  const sessionData = {
    id: sessionId,
    serviceId,
    serviceTitle,
    serviceDate,
    hostUid,
    hostName,
    status: QR_SESSION_STATUS.ACTIVE,
    activeToken: initialToken,
    previousToken: null,
    tokenTtlSeconds,
    expiresAtMs,
    createdAt: serverTimestamp(),
    tokenRotatedAt: serverTimestamp(),
  };

  await setDoc(docRef, sessionData);
  return { ...sessionData };
}

/**
 * Rotate the rolling token for a session (with previous token grace window)
 * @param {string} communityId
 * @param {string} sessionId
 * @param {string} currentActiveToken
 * @returns {Promise<string>} The new token
 */
export async function rotateSessionToken(
  communityId = DEFAULT_COMMUNITY_ID,
  sessionId,
  currentActiveToken
) {
  if (!sessionId) throw new Error('sessionId is required to rotate token');
  const newToken = generateRollingToken();
  const docRef = doc(db, qrSessionDocPath(communityId, sessionId));

  await updateDoc(docRef, {
    previousToken: currentActiveToken || null,
    activeToken: newToken,
    tokenRotatedAt: serverTimestamp(),
  });

  return newToken;
}

/**
 * End an active QR session
 * @param {string} communityId
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function endQRSession(communityId = DEFAULT_COMMUNITY_ID, sessionId) {
  if (!sessionId) return;
  const docRef = doc(db, qrSessionDocPath(communityId, sessionId));
  await updateDoc(docRef, {
    status: QR_SESSION_STATUS.ENDED,
    endedAt: serverTimestamp(),
  });
}

/**
 * Fetch a QR session by ID
 * @param {string} communityId
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
export async function getQRSession(communityId = DEFAULT_COMMUNITY_ID, sessionId) {
  if (!sessionId) return null;
  try {
    const docRef = doc(db, qrSessionDocPath(communityId, sessionId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error(`[QRSession] Failed to get session ${sessionId}:`, err);
    return null;
  }
}

/**
 * Real-time subscription to a QR session
 * @param {string} communityId
 * @param {string} sessionId
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToQRSession(
  communityId = DEFAULT_COMMUNITY_ID,
  sessionId,
  callback
) {
  if (!sessionId) {
    callback(null);
    return () => {};
  }

  const docRef = doc(db, qrSessionDocPath(communityId, sessionId));
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...snap.data() });
    },
    (err) => {
      console.error(`[QRSession] Subscription error:`, err);
      callback(null);
    }
  );
}

/**
 * Verify scanned QR code and process attendance check-in
 * @param {Object} params
 * @param {string} params.rawQRData - String payload scanned from QR code
 * @param {Object} params.member - { id, displayName, role, team, avatar }
 * @param {string} [params.expectedCommunityId]
 * @returns {Promise<Object>} Result { success, alreadyCheckedIn, message, attendanceRecord }
 */
export async function verifyAndProcessQRCheckIn({
  rawQRData,
  member,
  expectedCommunityId = DEFAULT_COMMUNITY_ID,
}) {
  if (!member || !member.id) {
    return {
      success: false,
      message: 'You must be logged in with a valid member profile to check in.',
    };
  }

  const parsed = parseQRData(rawQRData);
  if (!parsed) {
    return {
      success: false,
      message: 'Invalid QR code. Please scan an official VBT Attendance code.',
    };
  }

  if (parsed.communityId !== expectedCommunityId) {
    return {
      success: false,
      message: 'This QR code belongs to a different VBT community.',
    };
  }

  // Fetch session from Firestore
  const session = await getQRSession(parsed.communityId, parsed.sessionId);
  if (!session) {
    return {
      success: false,
      message: 'This attendance session could not be found or has been removed.',
    };
  }

  if (session.status !== QR_SESSION_STATUS.ACTIVE) {
    return {
      success: false,
      message: 'This check-in session has already ended or is paused.',
    };
  }

  // Check expiration timestamp
  if (session.expiresAtMs && Date.now() > session.expiresAtMs) {
    return {
      success: false,
      message: 'This check-in session has expired.',
    };
  }

  // Verify rolling token (matches either current activeToken or previousToken grace period)
  const isTokenMatch =
    parsed.token === session.activeToken ||
    (session.previousToken && parsed.token === session.previousToken);

  if (!isTokenMatch) {
    return {
      success: false,
      message: 'QR code has rotated or expired. Please scan the live code on the screen.',
    };
  }

  // Check if member already checked in
  const existingRecord = await getMemberServiceStatus(
    parsed.communityId,
    session.serviceId,
    member.id
  );

  const alreadyCheckedIn = !!existingRecord;

  // Record/update attendance
  const record = await recordAttendance({
    communityId: parsed.communityId,
    serviceId: session.serviceId,
    serviceInfo: {
      title: session.serviceTitle,
      date: session.serviceDate,
    },
    member,
    status: ATTENDANCE_STATUS.PRESENT,
    checkInMethod: CHECKIN_METHOD.QR_SCAN,
    markedBy: 'self_qr',
  });

  return {
    success: true,
    alreadyCheckedIn,
    serviceTitle: session.serviceTitle,
    serviceDate: session.serviceDate,
    message: alreadyCheckedIn
      ? `Welcome back, ${member.displayName || 'Member'}! You are already checked in.`
      : `Check-in confirmed! Welcome to ${session.serviceTitle}.`,
    attendanceRecord: record,
  };
}
