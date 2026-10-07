import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, DEFAULT_COMMUNITY_ID } from '../firebase';

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  LATE: 'late',
  EXCUSED: 'excused',
  ABSENT: 'absent',
};

export const CHECKIN_METHOD = {
  QR_SCAN: 'qr_scan',
  MANUAL_LEADER: 'manual_leader',
  SELF_KIOSK: 'self_kiosk',
};

/**
 * Path helper for attendance collection of a service
 */
export function attendanceCollectionPath(communityId, serviceId) {
  return `vbt_communities/${communityId}/services/${serviceId}/attendance`;
}

/**
 * Path helper for a specific attendance record
 */
export function attendanceDocPath(communityId, serviceId, memberId) {
  return `vbt_communities/${communityId}/services/${serviceId}/attendance/${memberId}`;
}

/**
 * Record attendance for a member (idempotent: uses memberId as document ID)
 * @param {Object} params
 * @param {string} params.communityId
 * @param {string} params.serviceId
 * @param {Object} [params.serviceInfo] - { title, date, type }
 * @param {Object} params.member - { id, displayName, role, team, avatar }
 * @param {string} [params.status='present'] - 'present' | 'late' | 'excused'
 * @param {string} [params.checkInMethod='qr_scan'] - 'qr_scan' | 'manual_leader' | 'self_kiosk'
 * @param {string} [params.markedBy='self'] - uid or displayName of person recording
 * @param {string} [params.notes='']
 * @returns {Promise<Object>}
 */
export async function recordAttendance({
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  serviceInfo = {},
  member,
  status = ATTENDANCE_STATUS.PRESENT,
  checkInMethod = CHECKIN_METHOD.QR_SCAN,
  markedBy = 'self',
  notes = '',
}) {
  if (!serviceId) throw new Error('serviceId is required to record attendance');
  if (!member || !member.id) throw new Error('member with valid id is required to record attendance');

  const docRef = doc(db, attendanceDocPath(communityId, serviceId, member.id));
  const record = {
    memberId: member.id,
    displayName: member.displayName || member.name || 'Anonymous Member',
    memberRole: member.role || 'member',
    team: member.team || null,
    avatar: member.avatar || null,
    status,
    checkInMethod,
    markedBy,
    notes: notes || '',
    serviceId,
    serviceTitle: serviceInfo.title || '',
    serviceDate: serviceInfo.date || new Date().toISOString().slice(0, 10),
    checkedInAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, record, { merge: true });
  return { id: member.id, ...record };
}

/**
 * Update the status of an existing attendance record
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} memberId
 * @param {string} newStatus - ATTENDANCE_STATUS value
 * @param {string} [updatedBy='leader']
 * @returns {Promise<void>}
 */
export async function updateAttendanceStatus(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  memberId,
  newStatus,
  updatedBy = 'leader'
) {
  if (!serviceId || !memberId) return;
  const docRef = doc(db, attendanceDocPath(communityId, serviceId, memberId));
  await updateDoc(docRef, {
    status: newStatus,
    markedBy: updatedBy,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get all attendance records for a specific service
 * @param {string} communityId
 * @param {string} serviceId
 * @returns {Promise<Array>}
 */
export async function getServiceAttendance(communityId = DEFAULT_COMMUNITY_ID, serviceId) {
  if (!serviceId) return [];
  try {
    const colRef = collection(db, attendanceCollectionPath(communityId, serviceId));
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() });
    });
    return list;
  } catch (err) {
    console.error(`[AttendanceService] Failed to get attendance for service ${serviceId}:`, err);
    return [];
  }
}

/**
 * Real-time subscription to service attendance
 * @param {string} communityId
 * @param {string} serviceId
 * @param {Function} callback
 * @returns {Function} Unsubscribe function
 */
export function subscribeToServiceAttendance(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  callback
) {
  if (!serviceId) {
    callback([]);
    return () => {};
  }

  const colRef = collection(db, attendanceCollectionPath(communityId, serviceId));
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      // Sort by checkedInAt descending if available
      list.sort((a, b) => {
        const timeA = a.checkedInAt?.seconds || 0;
        const timeB = b.checkedInAt?.seconds || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (err) => {
      console.error(`[AttendanceService] Subscription error for ${serviceId}:`, err);
      callback([]);
    }
  );
}

/**
 * Check if a member is already checked in for a service
 * @param {string} communityId
 * @param {string} serviceId
 * @param {string} memberId
 * @returns {Promise<Object|null>}
 */
export async function getMemberServiceStatus(
  communityId = DEFAULT_COMMUNITY_ID,
  serviceId,
  memberId
) {
  if (!serviceId || !memberId) return null;
  try {
    const docRef = doc(db, attendanceDocPath(communityId, serviceId, memberId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error(`[AttendanceService] Error checking member status:`, err);
    return null;
  }
}

/**
 * Calculate summary metrics from attendance list
 * @param {Array} attendanceList
 * @returns {Object}
 */
export function calculateAttendanceStats(attendanceList = []) {
  const stats = {
    total: attendanceList.length,
    present: 0,
    late: 0,
    excused: 0,
    byRole: {},
    byTeam: {},
  };

  for (const record of attendanceList) {
    const status = record.status || ATTENDANCE_STATUS.PRESENT;
    if (status === ATTENDANCE_STATUS.PRESENT) stats.present++;
    else if (status === ATTENDANCE_STATUS.LATE) stats.late++;
    else if (status === ATTENDANCE_STATUS.EXCUSED) stats.excused++;

    // Role breakdown
    const role = record.memberRole || 'member';
    stats.byRole[role] = (stats.byRole[role] || 0) + 1;

    // Team breakdown
    if (record.team) {
      stats.byTeam[record.team] = (stats.byTeam[record.team] || 0) + 1;
    }
  }

  return stats;
}
