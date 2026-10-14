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

export { DEFAULT_COMMUNITY_ID };

/**
 * Audit event types for youth safety actions
 */
export const AUDIT_EVENT_TYPE = {
  YOUTH_RECORD_ACCESSED: 'YOUTH_RECORD_ACCESSED',
  MEDICAL_NOTE_ACCESSED: 'MEDICAL_NOTE_ACCESSED',
  MEDICAL_NOTE_UPDATED: 'MEDICAL_NOTE_UPDATED',
  GUARDIAN_REGISTERED: 'GUARDIAN_REGISTERED',
  CONSENT_UPDATED: 'CONSENT_UPDATED',
  PICKUP_UPDATED: 'PICKUP_UPDATED',
  PICKUP_VERIFIED: 'PICKUP_VERIFIED',
  EMERGENCY_CONTACT_UPDATED: 'EMERGENCY_CONTACT_UPDATED',
  SCREENING_UPDATED: 'SCREENING_UPDATED',
  COMMUNICATION_BLOCKED: 'COMMUNICATION_BLOCKED',
  SUPERVISION_ASSIGNED: 'SUPERVISION_ASSIGNED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
};

/**
 * Volunteer screening statuses
 */
export const SCREENING_STATUS = {
  APPROVED: 'approved',
  PENDING: 'pending',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
  NOT_STARTED: 'not_started',
};

/**
 * Roles authorized to view confidential medical and allergy records.
 * STRICT PRIVACY: Ordinary servants, volunteers, and generic members CANNOT view.
 */
export const AUTHORIZED_MEDICAL_ROLES = [
  'admin',
  'pastor',
  'pastoral_care_leader',
  'medical_lead',
  'doctor',
  'nurse',
  'coordinator',
];

/**
 * Roles authorized for safety coordination & audit administration
 */
export const AUTHORIZED_COORDINATOR_ROLES = [
  'admin',
  'pastor',
  'pastoral_care_leader',
  'coordinator',
  'medical_lead',
  'head_coach',
  'service_leader',
];

/**
 * Standard adult-to-youth supervision ratios
 */
export const SUPERVISION_STANDARDS = {
  STANDARD_YOUTH: {
    label: 'Standard Youth (Ages 11-17)',
    ratio: '1:8',
    maxYouthPerAdult: 8,
  },
  CHILD_OR_HIGH_RISK: {
    label: 'Young Children (< 11) / High Risk Activities (Water/Travel)',
    ratio: '1:5',
    maxYouthPerAdult: 5,
  },
};

/**
 * Firestore document path helpers
 */
export function youthSafetyDocPath(communityId, youthId) {
  return `vbt_communities/${communityId}/youth_safety/${youthId}`;
}

export function youthSafetyAuditCollectionPath(communityId, youthId) {
  return `vbt_communities/${communityId}/youth_safety/${youthId}/audit_logs`;
}

export function youthSafetyAuditDocPath(communityId, youthId, auditId) {
  return `vbt_communities/${communityId}/youth_safety/${youthId}/audit_logs/${auditId}`;
}

export function volunteerScreeningDocPath(communityId, volunteerId) {
  return `vbt_communities/${communityId}/volunteer_screenings/${volunteerId}`;
}

export function activitySupervisionDocPath(communityId, activityId) {
  return `vbt_communities/${communityId}/activity_supervisions/${activityId}`;
}

/**
 * Check if a user is considered a minor (under 18 or marked as youth/child)
 * @param {Object} user
 * @returns {boolean}
 */
export function isMinorUser(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.isMinor === true) return true;
  if (typeof user.age === 'number' && user.age < 18) return true;
  if (typeof user.role === 'string') {
    const normalizedRole = user.role.toLowerCase().trim();
    if (['youth', 'child', 'minor', 'camper_junior', 'camper_teen'].includes(normalizedRole)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user holds an authorized medical role
 * @param {Object} user
 * @returns {boolean}
 */
export function isAuthorizedMedicalRole(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.isMedicalLead === true || user.isPastor === true) return true;
  const role = (user.role || '').toLowerCase().trim();
  return AUTHORIZED_MEDICAL_ROLES.includes(role);
}

/**
 * Check if a user holds coordinator/admin safety oversight
 * @param {Object} user
 * @returns {boolean}
 */
export function isAuthorizedSafetyCoordinator(user) {
  if (!user || typeof user !== 'object') return false;
  if (user.isAdmin === true || user.isCoordinator === true) return true;
  const role = (user.role || '').toLowerCase().trim();
  return AUTHORIZED_COORDINATOR_ROLES.includes(role);
}

/**
 * Check if a user is a registered guardian for the youth
 * @param {Object} user
 * @param {Object} youthRecord
 * @returns {boolean}
 */
export function isGuardianOfYouth(user, youthRecord) {
  if (!user || !youthRecord) return false;
  const userId = user.id || user.uid;
  const userPhone = user.phoneNumber || user.phone;

  const guardians = Array.isArray(youthRecord.guardians) ? youthRecord.guardians : [];
  return guardians.some((g) => {
    if (userId && (g.guardianId === userId || g.id === userId)) return true;
    if (userPhone && g.phoneNumber && g.phoneNumber.trim() === userPhone.trim()) return true;
    return false;
  });
}

/**
 * Calculate chaperone-to-youth supervision ratio compliance
 * @param {number} chaperoneCount - Number of screened adult chaperones
 * @param {number} youthCount - Number of minors attending
 * @param {boolean} [isHighRiskOrYounger=false] - Whether 1:5 ratio applies
 * @returns {Object}
 */
export function calculateSupervisionRatio(chaperoneCount, youthCount, isHighRiskOrYounger = false) {
  const standard = isHighRiskOrYounger
    ? SUPERVISION_STANDARDS.CHILD_OR_HIGH_RISK
    : SUPERVISION_STANDARDS.STANDARD_YOUTH;

  const chaperones = Math.max(0, Number(chaperoneCount) || 0);
  const youth = Math.max(0, Number(youthCount) || 0);
  const maxPerAdult = standard.maxYouthPerAdult;

  const requiredChaperones = youth > 0 ? Math.ceil(youth / maxPerAdult) : 0;
  const compliant = chaperones >= requiredChaperones;
  const actualRatioStr = chaperones > 0 ? `1:${(youth / chaperones).toFixed(1)}` : `0:${youth}`;
  const deficit = Math.max(0, requiredChaperones - chaperones);

  return {
    compliant,
    standardRatio: standard.ratio,
    targetLabel: standard.label,
    maxPerAdult,
    actualRatioStr,
    chaperoneCount: chaperones,
    youthCount: youth,
    requiredChaperones,
    deficit,
  };
}

/**
 * Log an audit trail entry for youth record access or mutation
 * @param {string} communityId
 * @param {string} youthId
 * @param {string} accessType
 * @param {Object} requestingUser
 * @param {Object} [metadata={}]
 * @returns {Promise<Object>}
 */
export async function auditYouthAccess(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  accessType,
  requestingUser,
  metadata = {}
) {
  if (!youthId) throw new Error('youthId is required for youth audit log');

  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const actorId = requestingUser?.id || requestingUser?.uid || 'system';
  const actorName =
    requestingUser?.displayName ||
    requestingUser?.name ||
    requestingUser?.firstName ||
    'Authorized Staff';
  const actorRole = requestingUser?.role || 'unknown';

  const entry = {
    id: auditId,
    communityId,
    youthId,
    accessType,
    actorId,
    actorName,
    actorRole,
    timestamp: new Date().toISOString(),
    metadata: {
      ...metadata,
    },
  };

  try {
    const docRef = doc(db, youthSafetyAuditDocPath(communityId, youthId, auditId));
    await setDoc(docRef, entry);
  } catch (err) {
    console.warn(`[youthSafetyService] Failed to write audit record ${auditId}:`, err);
  }

  return entry;
}

/**
 * Retrieve the full youth safety record from Firestore or return standard template
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} [requestingUser=null]
 * @param {Object} [options={ auditAccess: true }]
 * @returns {Promise<Object>}
 */
export async function getYouthSafetyRecord(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  requestingUser = null,
  options = { auditAccess: true }
) {
  if (!youthId) throw new Error('youthId is required');

  const docRef = doc(db, youthSafetyDocPath(communityId, youthId));
  const snap = await getDoc(docRef);

  let record;
  if (snap && snap.exists()) {
    record = { id: snap.id, ...snap.data() };
  } else {
    record = {
      id: youthId,
      communityId,
      guardians: [],
      consents: {
        medicalEmergencyConsent: { granted: false, signedBy: '', signedAt: null },
        sportsLiabilityWaiver: { granted: false, signedBy: '', signedAt: null },
        photoReleaseConsent: { granted: false, signedBy: '', signedAt: null },
      },
      authorizedPickups: [],
      emergencyContacts: [],
      medicalInfo: {
        allergies: [],
        chronicConditions: [],
        medications: [],
        dietaryRestrictions: [],
        emergencyDoctorPhone: '',
        notes: '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (options.auditAccess && requestingUser) {
    await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.YOUTH_RECORD_ACCESSED, requestingUser, {
      scope: 'general_safety_record',
    });
  }

  return record;
}

/**
 * Register or update a guardian relationship for a youth member
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} guardianData - { guardianId, name, phoneNumber, relationship, isPrimary }
 * @param {Object} actorUser
 * @returns {Promise<Object>}
 */
export async function registerGuardianRelationship(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  guardianData,
  actorUser
) {
  if (!youthId) throw new Error('youthId is required');
  if (!guardianData || (!guardianData.guardianId && !guardianData.name)) {
    throw new Error('Valid guardian name or ID is required');
  }

  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });
  const guardians = Array.isArray(record.guardians) ? [...record.guardians] : [];

  const guardianId =
    guardianData.guardianId ||
    `g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const cleanGuardian = {
    guardianId,
    name: guardianData.name || guardianData.displayName || 'Parent/Guardian',
    phoneNumber: guardianData.phoneNumber || guardianData.phone || '',
    relationship: guardianData.relationship || 'Guardian', // 'Mother', 'Father', 'Legal Guardian', etc.
    isPrimary: Boolean(guardianData.isPrimary),
    verified: guardianData.verified !== undefined ? guardianData.verified : true,
    verifiedBy: actorUser?.id || actorUser?.uid || 'staff',
    registeredAt: new Date().toISOString(),
  };

  const existingIdx = guardians.findIndex(
    (g) => g.guardianId === guardianId || (cleanGuardian.phoneNumber && g.phoneNumber === cleanGuardian.phoneNumber)
  );

  if (existingIdx >= 0) {
    guardians[existingIdx] = { ...guardians[existingIdx], ...cleanGuardian };
  } else {
    guardians.push(cleanGuardian);
  }

  const docRef = doc(db, youthSafetyDocPath(communityId, youthId));
  const updatePayload = {
    communityId,
    youthId,
    guardians,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, updatePayload, { merge: true });

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.GUARDIAN_REGISTERED, actorUser, {
    guardianId: cleanGuardian.guardianId,
    relationship: cleanGuardian.relationship,
  });

  return { youthId, guardians, updatedGuardian: cleanGuardian };
}

/**
 * Retrieve guardian relationships for a youth
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} requestingUser
 * @returns {Promise<Array>}
 */
export async function getGuardiansForYouth(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  requestingUser
) {
  const record = await getYouthSafetyRecord(communityId, youthId, requestingUser, { auditAccess: true });
  return record.guardians || [];
}

/**
 * Update youth consent records (medical consent, liability waiver, photo release)
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} consentData - { medicalEmergencyConsent, sportsLiabilityWaiver, photoReleaseConsent }
 * @param {Object} actorUser
 * @returns {Promise<Object>}
 */
export async function updateYouthConsent(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  consentData,
  actorUser
) {
  if (!youthId) throw new Error('youthId is required');
  if (!consentData || typeof consentData !== 'object') {
    throw new Error('Valid consentData object is required');
  }

  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });
  const currentConsents = record.consents || {};

  const normalizeConsent = (val, prev = {}) => {
    if (typeof val === 'boolean') {
      return {
        granted: val,
        signedBy: val ? (actorUser?.displayName || actorUser?.name || 'Guardian') : '',
        signedAt: val ? new Date().toISOString() : null,
      };
    }
    if (val && typeof val === 'object') {
      return {
        granted: Boolean(val.granted),
        signedBy: val.signedBy || actorUser?.displayName || prev.signedBy || 'Guardian',
        signedAt: val.granted ? (val.signedAt || new Date().toISOString()) : null,
        notes: val.notes || '',
      };
    }
    return prev;
  };

  const updatedConsents = {
    medicalEmergencyConsent: normalizeConsent(
      consentData.medicalEmergencyConsent,
      currentConsents.medicalEmergencyConsent
    ),
    sportsLiabilityWaiver: normalizeConsent(
      consentData.sportsLiabilityWaiver,
      currentConsents.sportsLiabilityWaiver
    ),
    photoReleaseConsent: normalizeConsent(
      consentData.photoReleaseConsent,
      currentConsents.photoReleaseConsent
    ),
  };

  const docRef = doc(db, youthSafetyDocPath(communityId, youthId));
  await setDoc(
    docRef,
    {
      communityId,
      youthId,
      consents: updatedConsents,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.CONSENT_UPDATED, actorUser, {
    medicalConsent: updatedConsents.medicalEmergencyConsent.granted,
    liabilityWaiver: updatedConsents.sportsLiabilityWaiver.granted,
    photoConsent: updatedConsents.photoReleaseConsent.granted,
  });

  return updatedConsents;
}

/**
 * Retrieve consent records for a youth
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} requestingUser
 * @returns {Promise<Object>}
 */
export async function getYouthConsent(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  requestingUser
) {
  const record = await getYouthSafetyRecord(communityId, youthId, requestingUser, { auditAccess: true });
  return record.consents || {};
}

/**
 * Update authorized pickup persons for a youth
 * @param {string} communityId
 * @param {string} youthId
 * @param {Array<Object>} pickups - Array of { name, relationship, phone, verifiedPin, photoIdUrl, idVerified }
 * @param {Object} actorUser
 * @returns {Promise<Array>}
 */
export async function updateAuthorizedPickups(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  pickups,
  actorUser
) {
  if (!youthId) throw new Error('youthId is required');
  if (!Array.isArray(pickups)) throw new Error('pickups must be an array');

  const normalizedPickups = pickups.map((p, idx) => ({
    id: p.id || `pickup_${Date.now()}_${idx}`,
    name: p.name || 'Authorized Pickup',
    relationship: p.relationship || 'Relative',
    phone: p.phone || p.phoneNumber || '',
    verifiedPin: p.verifiedPin ? String(p.verifiedPin).trim() : '',
    photoIdUrl: p.photoIdUrl || '',
    idVerified: Boolean(p.idVerified),
    updatedAt: new Date().toISOString(),
  }));

  const docRef = doc(db, youthSafetyDocPath(communityId, youthId));
  await setDoc(
    docRef,
    {
      communityId,
      youthId,
      authorizedPickups: normalizedPickups,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.PICKUP_UPDATED, actorUser, {
    count: normalizedPickups.length,
  });

  return normalizedPickups;
}

/**
 * Retrieve authorized pickup information for a youth.
 * Checks permissions and audits access.
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} requestingUser
 * @returns {Promise<Array>}
 */
export async function getAuthorizedPickups(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  requestingUser
) {
  if (!youthId) throw new Error('youthId is required');

  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });

  // Privacy Check: Only authorized safety roles or the child's guardian can view pickups
  const isAuthorized =
    isAuthorizedSafetyCoordinator(requestingUser) ||
    isAuthorizedMedicalRole(requestingUser) ||
    isGuardianOfYouth(requestingUser, record);

  if (!isAuthorized) {
    await auditYouthAccess(
      communityId,
      youthId,
      AUDIT_EVENT_TYPE.UNAUTHORIZED_ACCESS_ATTEMPT,
      requestingUser,
      { target: 'authorizedPickups' }
    );
    const error = new Error('UNAUTHORIZED_PICKUP_ACCESS: You do not have permission to view authorized pickup information.');
    error.code = 'UNAUTHORIZED_PICKUP_ACCESS';
    throw error;
  }

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.YOUTH_RECORD_ACCESSED, requestingUser, {
    scope: 'authorized_pickups',
  });

  return record.authorizedPickups || [];
}

/**
 * Verify pickup PIN for secure camper checkout
 * @param {string} communityId
 * @param {string} youthId
 * @param {string} pickupIdentifier - Pickup person's ID, name, or phone
 * @param {string} enteredPin
 * @param {Object} actorUser
 * @returns {Promise<Object>}
 */
export async function verifyPickupPin(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  pickupIdentifier,
  enteredPin,
  actorUser
) {
  if (!youthId || !enteredPin) {
    return { verified: false, reason: 'Missing youthId or PIN' };
  }

  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });
  const pickups = record.authorizedPickups || [];

  const matched = pickups.find(
    (p) =>
      p.id === pickupIdentifier ||
      (p.name && p.name.toLowerCase() === String(pickupIdentifier).toLowerCase().trim()) ||
      (p.phone && p.phone === pickupIdentifier)
  );

  if (!matched) {
    await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.PICKUP_VERIFIED, actorUser, {
      outcome: 'failed',
      reason: 'Pickup person not found in authorized list',
    });
    return { verified: false, reason: 'Pickup person not found in authorized list' };
  }

  const cleanEntered = String(enteredPin).trim();
  const cleanStored = String(matched.verifiedPin || '').trim();

  const isMatch = cleanStored && cleanEntered === cleanStored;

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.PICKUP_VERIFIED, actorUser, {
    outcome: isMatch ? 'success' : 'failed',
    pickupPerson: matched.name,
  });

  return {
    verified: isMatch,
    pickupPerson: isMatch ? matched : null,
    reason: isMatch ? 'PIN verified successfully' : 'Invalid PIN entered',
  };
}

/**
 * Update emergency contacts for a youth
 * @param {string} communityId
 * @param {string} youthId
 * @param {Array<Object>} emergencyContacts - Array of { name, relationship, primaryPhone, secondaryPhone }
 * @param {Object} actorUser
 * @returns {Promise<Array>}
 */
export async function updateEmergencyContacts(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  emergencyContacts,
  actorUser
) {
  if (!youthId) throw new Error('youthId is required');
  if (!Array.isArray(emergencyContacts)) throw new Error('emergencyContacts must be an array');

  const normalized = emergencyContacts.map((c, i) => ({
    id: c.id || `em_${Date.now()}_${i}`,
    name: c.name || 'Emergency Contact',
    relationship: c.relationship || 'Family',
    primaryPhone: c.primaryPhone || c.phone || '',
    secondaryPhone: c.secondaryPhone || '',
  }));

  const docRef = doc(db, youthSafetyDocPath(communityId, youthId));
  await setDoc(
    docRef,
    {
      communityId,
      youthId,
      emergencyContacts: normalized,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.EMERGENCY_CONTACT_UPDATED, actorUser, {
    count: normalized.length,
  });

  return normalized;
}

/**
 * Retrieve emergency contacts for a youth
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} requestingUser
 * @returns {Promise<Array>}
 */
export async function getEmergencyContacts(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  requestingUser
) {
  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });

  const isAuthorized =
    isAuthorizedSafetyCoordinator(requestingUser) ||
    isAuthorizedMedicalRole(requestingUser) ||
    isGuardianOfYouth(requestingUser, record);

  if (!isAuthorized) {
    await auditYouthAccess(
      communityId,
      youthId,
      AUDIT_EVENT_TYPE.UNAUTHORIZED_ACCESS_ATTEMPT,
      requestingUser,
      { target: 'emergencyContacts' }
    );
    const error = new Error('UNAUTHORIZED_EMERGENCY_CONTACT_ACCESS: You do not have permission to view emergency contacts.');
    error.code = 'UNAUTHORIZED_EMERGENCY_CONTACT_ACCESS';
    throw error;
  }

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.YOUTH_RECORD_ACCESSED, requestingUser, {
    scope: 'emergency_contacts',
  });

  return record.emergencyContacts || [];
}

/**
 * Update restricted medical notes and allergy flags
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} medicalData
 * @param {Object} actorUser
 * @returns {Promise<Object>}
 */
export async function updateRestrictedMedicalInfo(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  medicalData,
  actorUser
) {
  if (!youthId) throw new Error('youthId is required');

  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });

  // Must be guardian or medical lead / coordinator
  const isAuthorized =
    isAuthorizedMedicalRole(actorUser) ||
    isAuthorizedSafetyCoordinator(actorUser) ||
    isGuardianOfYouth(actorUser, record);

  if (!isAuthorized) {
    const error = new Error('UNAUTHORIZED_MEDICAL_UPDATE: You are not authorized to update medical information.');
    error.code = 'UNAUTHORIZED_MEDICAL_UPDATE';
    throw error;
  }

  const updatedMedicalInfo = {
    allergies: Array.isArray(medicalData.allergies) ? medicalData.allergies : [],
    chronicConditions: Array.isArray(medicalData.chronicConditions) ? medicalData.chronicConditions : [],
    medications: Array.isArray(medicalData.medications) ? medicalData.medications : [],
    dietaryRestrictions: Array.isArray(medicalData.dietaryRestrictions) ? medicalData.dietaryRestrictions : [],
    emergencyDoctorPhone: medicalData.emergencyDoctorPhone || '',
    notes: medicalData.notes || '',
    updatedAt: new Date().toISOString(),
    updatedBy: actorUser?.displayName || actorUser?.name || 'Authorized Staff',
  };

  const docRef = doc(db, youthSafetyDocPath(communityId, youthId));
  await setDoc(
    docRef,
    {
      communityId,
      youthId,
      medicalInfo: updatedMedicalInfo,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.MEDICAL_NOTE_UPDATED, actorUser, {
    allergiesCount: updatedMedicalInfo.allergies.length,
    hasNotes: Boolean(updatedMedicalInfo.notes),
  });

  return updatedMedicalInfo;
}

/**
 * Retrieve restricted medical notes & allergy flags.
 * STRICT PRIVACY: Checks role, blocks ordinary servants, and logs audit access.
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} requestingUser
 * @returns {Promise<Object>}
 */
export async function getRestrictedMedicalInfo(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  requestingUser
) {
  if (!youthId) throw new Error('youthId is required');

  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });

  // STRICT PRIVACY CHECK:
  // Ordinary servants and unauthorized members CANNOT view.
  // Allowed: medical leads, pastors, coordinators, admins, or verified guardian.
  const isAuthorized =
    isAuthorizedMedicalRole(requestingUser) ||
    isAuthorizedSafetyCoordinator(requestingUser) ||
    isGuardianOfYouth(requestingUser, record);

  if (!isAuthorized) {
    // Log unauthorized attempt in audit log
    await auditYouthAccess(
      communityId,
      youthId,
      AUDIT_EVENT_TYPE.UNAUTHORIZED_ACCESS_ATTEMPT,
      requestingUser,
      { target: 'restrictedMedicalInfo' }
    );

    const error = new Error(
      'UNAUTHORIZED_MEDICAL_ACCESS: Ordinary servants and unauthorized members cannot access restricted medical records.'
    );
    error.code = 'UNAUTHORIZED_MEDICAL_ACCESS';
    throw error;
  }

  // LOG EVERY ACCESS to sensitive youth records in audit log
  await auditYouthAccess(communityId, youthId, AUDIT_EVENT_TYPE.MEDICAL_NOTE_ACCESSED, requestingUser, {
    actorRole: requestingUser?.role,
  });

  return record.medicalInfo || {
    allergies: [],
    chronicConditions: [],
    medications: [],
    dietaryRestrictions: [],
    emergencyDoctorPhone: '',
    notes: '',
  };
}

/**
 * Verify volunteer screening status and youth safety certification
 * @param {string} communityId
 * @param {string} volunteerId
 * @returns {Promise<Object>}
 */
export async function verifyVolunteerScreening(
  communityId = DEFAULT_COMMUNITY_ID,
  volunteerId
) {
  if (!volunteerId) throw new Error('volunteerId is required');

  const docRef = doc(db, volunteerScreeningDocPath(communityId, volunteerId));
  const snap = await getDoc(docRef);

  if (!snap || !snap.exists()) {
    return {
      volunteerId,
      isCleared: false,
      status: SCREENING_STATUS.NOT_STARTED,
      isExpired: false,
      reason: 'No volunteer screening record found on file.',
      screening: null,
    };
  }

  const screening = { id: snap.id, ...snap.data() };
  const now = new Date();

  // Check safety certification expiry
  let isExpired = false;
  let daysRemaining = null;

  if (screening.safetyCertificationValidThrough) {
    const validThroughDate = new Date(screening.safetyCertificationValidThrough);
    const diffMs = validThroughDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs <= 0) {
      isExpired = true;
    }
  }

  const bgStatus = (screening.backgroundCheckStatus || '').toLowerCase();
  const bgCleared = bgStatus === 'cleared' || bgStatus === 'approved';

  let computedStatus = SCREENING_STATUS.PENDING;
  let reason = '';
  let isCleared = false;

  if (isExpired) {
    computedStatus = SCREENING_STATUS.EXPIRED;
    reason = 'Youth safety certification has expired.';
  } else if (bgStatus === 'rejected' || bgStatus === 'failed') {
    computedStatus = SCREENING_STATUS.REJECTED;
    reason = 'Background check was rejected.';
  } else if (bgCleared && screening.safetyCertificationValidThrough && !isExpired) {
    computedStatus = SCREENING_STATUS.APPROVED;
    isCleared = true;
    reason = 'Screening and certification valid and up-to-date.';
  } else if (!bgCleared) {
    computedStatus = SCREENING_STATUS.PENDING;
    reason = 'Background check is pending verification.';
  } else {
    computedStatus = SCREENING_STATUS.PENDING;
    reason = 'Youth safety certification date is missing or pending.';
  }

  return {
    volunteerId,
    isCleared,
    status: computedStatus,
    isExpired,
    daysRemaining,
    reason,
    backgroundCheckDate: screening.backgroundCheckDate || null,
    safetyCertificationValidThrough: screening.safetyCertificationValidThrough || null,
    screening,
  };
}

/**
 * Update volunteer screening record (only authorized coordinators/admins)
 * @param {string} communityId
 * @param {string} volunteerId
 * @param {Object} screeningData - { backgroundCheckDate, backgroundCheckStatus, safetyCertificationDate, safetyCertificationValidThrough, notes }
 * @param {Object} actorUser
 * @returns {Promise<Object>}
 */
export async function updateVolunteerScreening(
  communityId = DEFAULT_COMMUNITY_ID,
  volunteerId,
  screeningData,
  actorUser
) {
  if (!volunteerId) throw new Error('volunteerId is required');

  if (!isAuthorizedSafetyCoordinator(actorUser)) {
    const error = new Error('UNAUTHORIZED_SCREENING_UPDATE: Only coordinators and safety administrators can update screening records.');
    error.code = 'UNAUTHORIZED_SCREENING_UPDATE';
    throw error;
  }

  const docRef = doc(db, volunteerScreeningDocPath(communityId, volunteerId));
  const payload = {
    volunteerId,
    communityId,
    backgroundCheckDate: screeningData.backgroundCheckDate || null,
    backgroundCheckStatus: screeningData.backgroundCheckStatus || 'cleared',
    safetyCertificationDate: screeningData.safetyCertificationDate || null,
    safetyCertificationValidThrough: screeningData.safetyCertificationValidThrough || null,
    notes: screeningData.notes || '',
    updatedBy: actorUser?.displayName || actorUser?.name || 'Safety Officer',
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Child-safe communication rules:
 * Prohibits unsupervised 1-on-1 direct messages between adults and minors.
 * All communications must CC guardian or occur in group channels.
 *
 * @param {Object} senderUser - { id, displayName, age, isMinor, role }
 * @param {Object} recipientUser - { id, displayName, age, isMinor, role, guardianId }
 * @param {Object} [options={}] - { ccGuardianId, isGroupChannel, channelType, isParent }
 * @returns {Object} - { allowed: boolean, blocked: boolean, reason: string, rule?: string, ccGuardianId?: string }
 */
export function checkCommunicationSafety(senderUser, recipientUser, options = {}) {
  if (!senderUser || !recipientUser) {
    return {
      allowed: false,
      blocked: true,
      reason: 'Sender and recipient details are required.',
      rule: 'INVALID_COMMUNICATION_PAYLOAD',
    };
  }

  const senderIsMinor = isMinorUser(senderUser);
  const recipientIsMinor = isMinorUser(recipientUser);

  // If both are adults or both are minors (peer chat), communication is allowed
  if (!senderIsMinor && !recipientIsMinor) {
    return { allowed: true, blocked: false, reason: 'Adult-to-adult communication' };
  }
  if (senderIsMinor && recipientIsMinor) {
    return { allowed: true, blocked: false, reason: 'Peer minor-to-minor communication' };
  }

  // SENDER IS ADULT and RECIPIENT IS MINOR
  if (!senderIsMinor && recipientIsMinor) {
    // Check if sender is verified parent/guardian
    if (
      options.isParent === true ||
      recipientUser.guardianId === senderUser.id ||
      recipientUser.guardianId === senderUser.uid
    ) {
      return {
        allowed: true,
        blocked: false,
        reason: 'Direct communication permitted with registered parent/guardian.',
      };
    }

    // Check if group channel with multi-adult visibility
    if (options.isGroupChannel === true || options.channelType === 'group') {
      return {
        allowed: true,
        blocked: false,
        reason: 'Supervised group channel communication meets child safety guidelines.',
      };
    }

    // Check if guardian is CC'd
    const ccGuardian = options.ccGuardianId || options.guardianCc;
    if (ccGuardian && String(ccGuardian).trim() !== '') {
      return {
        allowed: true,
        blocked: false,
        ccGuardianId: String(ccGuardian).trim(),
        reason: 'Communication permitted with verified guardian CC.',
      };
    }

    // BLOCKED: Unsupervised 1-on-1 direct message
    return {
      allowed: false,
      blocked: true,
      rule: 'NO_UNSUPERVISED_ADULT_MINOR_DM',
      reason:
        'Child-safe protection policy strictly prohibits unsupervised 1-on-1 direct messages between adults and minors. Communications must include a guardian CC or take place in a supervised group channel.',
      requiredAction: 'ATTACH_GUARDIAN_CC',
    };
  }

  // SENDER IS MINOR and RECIPIENT IS ADULT (Minor reaching out to adult servant)
  if (senderIsMinor && !recipientIsMinor) {
    if (
      options.isParent === true ||
      senderUser.guardianId === recipientUser.id ||
      senderUser.guardianId === recipientUser.uid
    ) {
      return { allowed: true, blocked: false, reason: 'Child communicating with parent/guardian' };
    }

    if (options.isGroupChannel === true || options.channelType === 'group') {
      return { allowed: true, blocked: false, reason: 'Supervised group channel' };
    }

    const ccGuardian = options.ccGuardianId || options.guardianCc;
    if (ccGuardian && String(ccGuardian).trim() !== '') {
      return { allowed: true, blocked: false, ccGuardianId: String(ccGuardian).trim() };
    }

    // Unsupervised minor-to-adult 1-on-1 DM: flag requirement to notify guardian
    return {
      allowed: false,
      blocked: true,
      rule: 'NO_UNSUPERVISED_ADULT_MINOR_DM',
      reason:
        'Youth-to-adult direct messaging requires guardian CC to maintain transparency and two-deep adult oversight.',
      requiredAction: 'ATTACH_GUARDIAN_CC',
    };
  }

  return { allowed: true, blocked: false };
}

/**
 * Assign activity supervision and verify chaperone-to-youth ratio
 * @param {string} communityId
 * @param {string} activityId
 * @param {Object} params - { activityName, chaperones, youthIds, isHighRiskOrYounger }
 * @param {Object} actorUser
 * @returns {Promise<Object>}
 */
export async function assignActivitySupervision(
  communityId = DEFAULT_COMMUNITY_ID,
  activityId,
  { activityName = '', chaperones = [], youthIds = [], isHighRiskOrYounger = false },
  actorUser
) {
  if (!activityId) throw new Error('activityId is required');

  const ratio = calculateSupervisionRatio(chaperones.length, youthIds.length, isHighRiskOrYounger);

  const docRef = doc(db, activitySupervisionDocPath(communityId, activityId));
  const payload = {
    activityId,
    communityId,
    activityName,
    chaperones,
    youthIds,
    isHighRiskOrYounger,
    ratio,
    compliant: ratio.compliant,
    assignedBy: actorUser?.displayName || actorUser?.name || 'Coordinator',
    assignedAt: new Date().toISOString(),
  };

  await setDoc(docRef, payload, { merge: true });

  return payload;
}

/**
 * Retrieve activity supervision record
 * @param {string} communityId
 * @param {string} activityId
 * @returns {Promise<Object|null>}
 */
export async function getActivitySupervision(
  communityId = DEFAULT_COMMUNITY_ID,
  activityId
) {
  if (!activityId) return null;
  const docRef = doc(db, activitySupervisionDocPath(communityId, activityId));
  const snap = await getDoc(docRef);
  if (!snap || !snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Retrieve youth safety audit logs
 * @param {string} communityId
 * @param {string} youthId
 * @param {Object} requestingUser
 * @param {number} [maxLimit=50]
 * @returns {Promise<Array>}
 */
export async function getYouthAuditLogs(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  requestingUser,
  maxLimit = 50
) {
  if (!youthId) throw new Error('youthId is required');

  const record = await getYouthSafetyRecord(communityId, youthId, null, { auditAccess: false });
  const isAuthorized =
    isAuthorizedSafetyCoordinator(requestingUser) ||
    isAuthorizedMedicalRole(requestingUser) ||
    isGuardianOfYouth(requestingUser, record);

  if (!isAuthorized) {
    const error = new Error('UNAUTHORIZED_AUDIT_ACCESS: Only coordinators and authorized guardians can view the safety audit trail.');
    error.code = 'UNAUTHORIZED_AUDIT_ACCESS';
    throw error;
  }

  const colRef = collection(db, youthSafetyAuditCollectionPath(communityId, youthId));
  const snap = await getDocs(colRef);

  const logs = [];
  if (snap && snap.docs) {
    snap.docs.forEach((d) => logs.push({ id: d.id, ...d.data() }));
  }

  // Sort descending by timestamp
  logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  return logs.slice(0, maxLimit);
}

/**
 * Real-time subscription to a youth's safety record
 * @param {string} communityId
 * @param {string} youthId
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function subscribeToYouthSafetyRecord(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  callback
) {
  if (!youthId || typeof callback !== 'function') return () => {};
  const docRef = doc(db, youthSafetyDocPath(communityId, youthId));
  return onSnapshot(docRef, (snap) => {
    if (snap && snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  });
}

/**
 * Real-time subscription to youth safety audit logs
 * @param {string} communityId
 * @param {string} youthId
 * @param {Function} callback
 * @param {number} [maxLimit=50]
 * @returns {Function} unsubscribe
 */
export function subscribeToYouthAuditLogs(
  communityId = DEFAULT_COMMUNITY_ID,
  youthId,
  callback,
  maxLimit = 50
) {
  if (!youthId || typeof callback !== 'function') return () => {};
  const colRef = collection(db, youthSafetyAuditCollectionPath(communityId, youthId));
  return onSnapshot(colRef, (snap) => {
    const logs = [];
    if (snap && snap.docs) {
      snap.docs.forEach((d) => logs.push({ id: d.id, ...d.data() }));
    }
    logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    callback(logs.slice(0, maxLimit));
  });
}

/**
 * Sanitizes a member profile for public directory / feeds to strictly protect minors.
 * DO NOT display minor child data in public member directories or feeds.
 *
 * @param {Object} member
 * @param {Object} requestingUser
 * @returns {Object|null} - Sanitized member or null if completely restricted
 */
export function filterMemberForPublicDirectory(member, requestingUser) {
  if (!member) return null;

  if (isMinorUser(member)) {
    const isAuthorized =
      isAuthorizedSafetyCoordinator(requestingUser) ||
      isAuthorizedMedicalRole(requestingUser);

    if (!isAuthorized) {
      // Return protected representation masking contact and identity details
      return {
        id: member.id,
        displayName: member.displayName
          ? `${member.displayName.slice(0, 1)}*** (Youth Camper)`
          : 'Protected Youth',
        isMinor: true,
        protected: true,
        role: 'youth',
        team: member.team || 'Camp Team',
        // Deliberately omit phone, address, email, medicalNotes, emergencyContact
      };
    }
  }

  return member;
}
