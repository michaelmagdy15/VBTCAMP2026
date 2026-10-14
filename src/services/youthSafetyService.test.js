import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_COMMUNITY_ID,
  AUDIT_EVENT_TYPE,
  SCREENING_STATUS,
  AUTHORIZED_MEDICAL_ROLES,
  AUTHORIZED_COORDINATOR_ROLES,
  SUPERVISION_STANDARDS,
  youthSafetyDocPath,
  youthSafetyAuditDocPath,
  youthSafetyAuditCollectionPath,
  volunteerScreeningDocPath,
  activitySupervisionDocPath,
  isMinorUser,
  isAuthorizedMedicalRole,
  isAuthorizedSafetyCoordinator,
  isGuardianOfYouth,
  calculateSupervisionRatio,
  auditYouthAccess,
  getYouthSafetyRecord,
  registerGuardianRelationship,
  getGuardiansForYouth,
  updateYouthConsent,
  getYouthConsent,
  updateAuthorizedPickups,
  getAuthorizedPickups,
  verifyPickupPin,
  updateEmergencyContacts,
  getEmergencyContacts,
  updateRestrictedMedicalInfo,
  getRestrictedMedicalInfo,
  verifyVolunteerScreening,
  updateVolunteerScreening,
  checkCommunicationSafety,
  assignActivitySupervision,
  getActivitySupervision,
  getYouthAuditLogs,
  subscribeToYouthSafetyRecord,
  subscribeToYouthAuditLogs,
  filterMemberForPublicDirectory,
} from './youthSafetyService';

// In-memory document store for Firestore mock
const mockDocs = new Map();
let mockSnapshotCallback = null;

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
      data: () => (data ? { ...data } : undefined),
    };
  }),
  getDocs: vi.fn(async (colRef) => {
    const results = [];
    for (const [p, val] of mockDocs.entries()) {
      if (p.startsWith(colRef.path + '/')) {
        results.push({
          id: p.split('/').pop(),
          data: () => ({ ...val }),
        });
      }
    }
    return {
      docs: results,
      empty: results.length === 0,
      size: results.length,
      forEach: (fn) => results.forEach(fn),
    };
  }),
  setDoc: vi.fn(async (docRef, data, opts) => {
    const existing = mockDocs.get(docRef.path) || {};
    const merged = opts?.merge ? { ...existing, ...data } : { ...data };
    mockDocs.set(docRef.path, merged);
    return merged;
  }),
  updateDoc: vi.fn(async (docRef, data) => {
    const existing = mockDocs.get(docRef.path) || {};
    const merged = { ...existing, ...data };
    mockDocs.set(docRef.path, merged);
    return merged;
  }),
  onSnapshot: vi.fn((ref, cb) => {
    mockSnapshotCallback = cb;
    if (ref.type === 'doc') {
      const data = mockDocs.get(ref.path);
      cb({
        exists: () => !!data,
        id: ref.path.split('/').pop(),
        data: () => (data ? { ...data } : undefined),
      });
    } else {
      const results = [];
      for (const [p, val] of mockDocs.entries()) {
        if (p.startsWith(ref.path + '/')) {
          results.push({
            id: p.split('/').pop(),
            data: () => ({ ...val }),
          });
        }
      }
      cb({ docs: results });
    }
    return vi.fn(); // unsubscribe mock
  }),
  serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
}));

describe('YouthSafetyService', () => {
  beforeEach(() => {
    mockDocs.clear();
    mockSnapshotCallback = null;
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Constants & Predicates
  // ─────────────────────────────────────────────────────────────
  describe('Constants & Predicates', () => {
    it('defines standard audit event types and screening statuses', () => {
      expect(AUDIT_EVENT_TYPE.YOUTH_RECORD_ACCESSED).toBe('YOUTH_RECORD_ACCESSED');
      expect(AUDIT_EVENT_TYPE.MEDICAL_NOTE_ACCESSED).toBe('MEDICAL_NOTE_ACCESSED');
      expect(AUDIT_EVENT_TYPE.COMMUNICATION_BLOCKED).toBe('COMMUNICATION_BLOCKED');

      expect(SCREENING_STATUS.APPROVED).toBe('approved');
      expect(SCREENING_STATUS.EXPIRED).toBe('expired');
    });

    it('correctly identifies minor users by age, flag, or role', () => {
      expect(isMinorUser({ age: 14 })).toBe(true);
      expect(isMinorUser({ isMinor: true })).toBe(true);
      expect(isMinorUser({ role: 'youth' })).toBe(true);
      expect(isMinorUser({ role: 'child' })).toBe(true);
      expect(isMinorUser({ age: 19, role: 'member' })).toBe(false);
      expect(isMinorUser({ role: 'servant' })).toBe(false);
      expect(isMinorUser(null)).toBe(false);
    });

    it('identifies authorized medical roles vs ordinary servants', () => {
      expect(isAuthorizedMedicalRole({ role: 'medical_lead' })).toBe(true);
      expect(isAuthorizedMedicalRole({ role: 'pastor' })).toBe(true);
      expect(isAuthorizedMedicalRole({ role: 'admin' })).toBe(true);
      expect(isAuthorizedMedicalRole({ role: 'doctor' })).toBe(true);
      expect(isAuthorizedMedicalRole({ isMedicalLead: true })).toBe(true);

      // Ordinary servants must NOT have medical privileges
      expect(isAuthorizedMedicalRole({ role: 'servant' })).toBe(false);
      expect(isAuthorizedMedicalRole({ role: 'volunteer' })).toBe(false);
      expect(isAuthorizedMedicalRole({ role: 'team_leader' })).toBe(false);
      expect(isAuthorizedMedicalRole({ role: 'member' })).toBe(false);
    });

    it('identifies authorized safety coordinators', () => {
      expect(isAuthorizedSafetyCoordinator({ role: 'coordinator' })).toBe(true);
      expect(isAuthorizedSafetyCoordinator({ role: 'admin' })).toBe(true);
      expect(isAuthorizedSafetyCoordinator({ isAdmin: true })).toBe(true);
      expect(isAuthorizedSafetyCoordinator({ role: 'servant' })).toBe(false);
    });

    it('identifies registered guardian for a youth record', () => {
      const youthRecord = {
        guardians: [
          { guardianId: 'g_parent1', phoneNumber: '+1234567890' },
          { guardianId: 'g_parent2', phoneNumber: '+1987654321' },
        ],
      };

      expect(isGuardianOfYouth({ id: 'g_parent1' }, youthRecord)).toBe(true);
      expect(isGuardianOfYouth({ phoneNumber: '+1987654321' }, youthRecord)).toBe(true);
      expect(isGuardianOfYouth({ id: 'unrelated_user' }, youthRecord)).toBe(false);
      expect(isGuardianOfYouth(null, youthRecord)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Chaperone-to-Youth Supervision Ratio
  // ─────────────────────────────────────────────────────────────
  describe('Supervision Ratio Calculations', () => {
    it('calculates 1:8 ratio compliance for standard youth', () => {
      // 1 chaperone for 8 youth => compliant
      const r1 = calculateSupervisionRatio(1, 8, false);
      expect(r1.compliant).toBe(true);
      expect(r1.requiredChaperones).toBe(1);
      expect(r1.deficit).toBe(0);

      // 1 chaperone for 9 youth => fails 1:8 ratio
      const r2 = calculateSupervisionRatio(1, 9, false);
      expect(r2.compliant).toBe(false);
      expect(r2.requiredChaperones).toBe(2);
      expect(r2.deficit).toBe(1);

      // 2 chaperones for 16 youth => compliant
      const r3 = calculateSupervisionRatio(2, 16, false);
      expect(r3.compliant).toBe(true);
    });

    it('calculates 1:5 ratio compliance for young children or high-risk activities', () => {
      // 1 chaperone for 5 young children => compliant
      const r1 = calculateSupervisionRatio(1, 5, true);
      expect(r1.compliant).toBe(true);
      expect(r1.standardRatio).toBe('1:5');

      // 1 chaperone for 6 young children => non-compliant
      const r2 = calculateSupervisionRatio(1, 6, true);
      expect(r2.compliant).toBe(false);
      expect(r2.requiredChaperones).toBe(2);
      expect(r2.deficit).toBe(1);
    });

    it('assigns and retrieves activity supervision in Firestore', async () => {
      const actor = { id: 'admin1', displayName: 'Pastor Mark', role: 'admin' };
      const assignment = await assignActivitySupervision(
        'vbt_main',
        'act_water_sports_1',
        {
          activityName: 'Kayaking & Water Sports',
          chaperones: ['chap1', 'chap2'],
          youthIds: ['y1', 'y2', 'y3', 'y4', 'y5', 'y6', 'y7'],
          isHighRiskOrYounger: true, // 1:5 ratio requires 2 chaperones for 7 youth
        },
        actor
      );

      expect(assignment.compliant).toBe(true);
      expect(assignment.ratio.requiredChaperones).toBe(2);

      const retrieved = await getActivitySupervision('vbt_main', 'act_water_sports_1');
      expect(retrieved).not.toBeNull();
      expect(retrieved.activityName).toBe('Kayaking & Water Sports');
      expect(retrieved.chaperones.length).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Guardian Registration & Consents
  // ─────────────────────────────────────────────────────────────
  describe('Guardian Registration & Consent Management', () => {
    it('registers a guardian relationship and logs audit', async () => {
      const actor = { id: 'coord1', displayName: 'Sarah Coordinator', role: 'coordinator' };
      const res = await registerGuardianRelationship(
        'vbt_main',
        'youth_david',
        {
          guardianId: 'guard_mary',
          name: 'Mary David',
          phoneNumber: '+201001234567',
          relationship: 'Mother',
          isPrimary: true,
        },
        actor
      );

      expect(res.guardians.length).toBe(1);
      expect(res.guardians[0].name).toBe('Mary David');
      expect(res.guardians[0].relationship).toBe('Mother');

      const guardians = await getGuardiansForYouth('vbt_main', 'youth_david', actor);
      expect(guardians.length).toBe(1);

      // Verify audit record created
      const auditCol = `vbt_communities/vbt_main/youth_safety/youth_david/audit_logs`;
      const auditEntries = Array.from(mockDocs.keys()).filter((k) => k.startsWith(auditCol));
      expect(auditEntries.length).toBeGreaterThan(0);
    });

    it('updates youth consents (medical emergency, sports waiver, photo release)', async () => {
      const parent = { id: 'guard_mary', displayName: 'Mary David', role: 'member' };
      const consents = await updateYouthConsent(
        'vbt_main',
        'youth_david',
        {
          medicalEmergencyConsent: { granted: true, notes: 'Signed in-person' },
          sportsLiabilityWaiver: true,
          photoReleaseConsent: false,
        },
        parent
      );

      expect(consents.medicalEmergencyConsent.granted).toBe(true);
      expect(consents.sportsLiabilityWaiver.granted).toBe(true);
      expect(consents.photoReleaseConsent.granted).toBe(false);

      const fetchedConsents = await getYouthConsent('vbt_main', 'youth_david', parent);
      expect(fetchedConsents.medicalEmergencyConsent.granted).toBe(true);
      expect(fetchedConsents.sportsLiabilityWaiver.granted).toBe(true);
      expect(fetchedConsents.photoReleaseConsent.granted).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Authorized Pickups & PIN Verification
  // ─────────────────────────────────────────────────────────────
  describe('Authorized Pickups & Security PIN Checkout', () => {
    beforeEach(async () => {
      const parent = { id: 'guard_mary', displayName: 'Mary David', role: 'member' };
      await registerGuardianRelationship(
        'vbt_main',
        'youth_david',
        { guardianId: 'guard_mary', name: 'Mary David', phoneNumber: '0100111222' },
        parent
      );
      await updateAuthorizedPickups(
        'vbt_main',
        'youth_david',
        [
          {
            id: 'p1',
            name: 'Uncle Peter',
            relationship: 'Uncle',
            phone: '0123456789',
            verifiedPin: '4829',
            idVerified: true,
          },
          {
            id: 'p2',
            name: 'Grandmother Nora',
            relationship: 'Grandmother',
            phone: '0111223344',
            verifiedPin: '1234',
            idVerified: true,
          },
        ],
        parent
      );
    });

    it('allows verified parent or coordinator to view authorized pickups', async () => {
      const parent = { id: 'guard_mary', role: 'member' };
      const pickups = await getAuthorizedPickups('vbt_main', 'youth_david', parent);
      expect(pickups.length).toBe(2);
      expect(pickups[0].name).toBe('Uncle Peter');

      const coordinator = { id: 'c1', role: 'coordinator' };
      const coordPickups = await getAuthorizedPickups('vbt_main', 'youth_david', coordinator);
      expect(coordPickups.length).toBe(2);
    });

    it('blocks unauthorized ordinary servants or random members from viewing pickups', async () => {
      const ordinaryServant = { id: 'servant_joe', role: 'servant' };

      await expect(
        getAuthorizedPickups('vbt_main', 'youth_david', ordinaryServant)
      ).rejects.toThrow('UNAUTHORIZED_PICKUP_ACCESS');
    });

    it('verifies pickup PIN successfully when matching, fails on incorrect PIN', async () => {
      const coordinator = { id: 'c1', displayName: 'Leader Mark', role: 'coordinator' };

      // Correct PIN
      const resPass = await verifyPickupPin('vbt_main', 'youth_david', 'p1', '4829', coordinator);
      expect(resPass.verified).toBe(true);
      expect(resPass.pickupPerson.name).toBe('Uncle Peter');

      // Incorrect PIN
      const resFail = await verifyPickupPin('vbt_main', 'youth_david', 'p1', '0000', coordinator);
      expect(resFail.verified).toBe(false);
      expect(resFail.pickupPerson).toBeNull();

      // Non-existent pickup
      const resNotFound = await verifyPickupPin('vbt_main', 'youth_david', 'unknown_person', '4829', coordinator);
      expect(resNotFound.verified).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Restricted Medical Info & Audit Logging
  // ─────────────────────────────────────────────────────────────
  describe('Strict Medical Privacy & Audit Logging Rules', () => {
    beforeEach(async () => {
      const parent = { id: 'guard_mary', displayName: 'Mary David', role: 'member' };
      await registerGuardianRelationship(
        'vbt_main',
        'youth_david',
        { guardianId: 'guard_mary', name: 'Mary David' },
        parent
      );

      const doctor = { id: 'doc1', displayName: 'Dr. Lucas', role: 'doctor' };
      await updateRestrictedMedicalInfo(
        'vbt_main',
        'youth_david',
        {
          allergies: ['Peanuts (Severe - EpiPen)', 'Penicillin'],
          chronicConditions: ['Asthma'],
          medications: ['Albuterol Inhaler as needed'],
          dietaryRestrictions: ['Nut-free table'],
          emergencyDoctorPhone: '+201099887766',
          notes: 'Carries EpiPen in red backpack pouch at all times.',
        },
        doctor
      );
    });

    it('allows authorized medical lead, pastor, or coordinator to access medical records and logs audit', async () => {
      const medicalLead = { id: 'med1', displayName: 'Nurse Hannah', role: 'medical_lead' };
      const medicalInfo = await getRestrictedMedicalInfo('vbt_main', 'youth_david', medicalLead);

      expect(medicalInfo.allergies).toContain('Peanuts (Severe - EpiPen)');
      expect(medicalInfo.chronicConditions).toContain('Asthma');
      expect(medicalInfo.notes).toContain('EpiPen');

      // Verify audit log has MEDICAL_NOTE_ACCESSED
      const auditLogs = await getYouthAuditLogs('vbt_main', 'youth_david', medicalLead);
      const medicalLog = auditLogs.find((l) => l.accessType === AUDIT_EVENT_TYPE.MEDICAL_NOTE_ACCESSED);
      expect(medicalLog).toBeDefined();
      expect(medicalLog.actorId).toBe('med1');
    });

    it('allows parent/guardian to view their own youth medical records', async () => {
      const parent = { id: 'guard_mary', displayName: 'Mary David', role: 'member' };
      const medicalInfo = await getRestrictedMedicalInfo('vbt_main', 'youth_david', parent);
      expect(medicalInfo.allergies.length).toBe(2);
    });

    it('STRICTLY BLOCKS ordinary servants, volunteers, or unauthorized members and logs access attempt', async () => {
      const ordinaryServant = { id: 'servant_tim', displayName: 'Tim Servant', role: 'servant' };

      await expect(
        getRestrictedMedicalInfo('vbt_main', 'youth_david', ordinaryServant)
      ).rejects.toThrow('UNAUTHORIZED_MEDICAL_ACCESS');

      // Verify unauthorized attempt logged in audit trail
      const coordinator = { id: 'coord1', role: 'coordinator' };
      const auditLogs = await getYouthAuditLogs('vbt_main', 'youth_david', coordinator);
      const attemptLog = auditLogs.find((l) => l.accessType === AUDIT_EVENT_TYPE.UNAUTHORIZED_ACCESS_ATTEMPT);
      expect(attemptLog).toBeDefined();
      expect(attemptLog.actorId).toBe('servant_tim');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Volunteer Screening Status Verification
  // ─────────────────────────────────────────────────────────────
  describe('Volunteer Screening & Youth Safety Certification', () => {
    it('returns not_started if no record exists', async () => {
      const res = await verifyVolunteerScreening('vbt_main', 'vol_new');
      expect(res.isCleared).toBe(false);
      expect(res.status).toBe(SCREENING_STATUS.NOT_STARTED);
    });

    it('returns approved for cleared background check and future certification date', async () => {
      const admin = { id: 'admin1', role: 'admin' };
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await updateVolunteerScreening(
        'vbt_main',
        'vol_john',
        {
          backgroundCheckDate: '2026-01-15',
          backgroundCheckStatus: 'cleared',
          safetyCertificationDate: '2026-02-01',
          safetyCertificationValidThrough: futureDate.toISOString(),
          notes: 'Clear national background check on file.',
        },
        admin
      );

      const res = await verifyVolunteerScreening('vbt_main', 'vol_john');
      expect(res.isCleared).toBe(true);
      expect(res.status).toBe(SCREENING_STATUS.APPROVED);
      expect(res.isExpired).toBe(false);
      expect(res.daysRemaining).toBeGreaterThan(0);
    });

    it('returns expired if youth safety certification date has passed', async () => {
      const admin = { id: 'admin1', role: 'admin' };
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      await updateVolunteerScreening(
        'vbt_main',
        'vol_expired',
        {
          backgroundCheckDate: '2024-01-01',
          backgroundCheckStatus: 'cleared',
          safetyCertificationDate: '2024-01-01',
          safetyCertificationValidThrough: pastDate.toISOString(),
        },
        admin
      );

      const res = await verifyVolunteerScreening('vbt_main', 'vol_expired');
      expect(res.isCleared).toBe(false);
      expect(res.status).toBe(SCREENING_STATUS.EXPIRED);
      expect(res.isExpired).toBe(true);
    });

    it('rejects volunteer screening update if actor is ordinary servant', async () => {
      const servant = { id: 'servant1', role: 'servant' };
      await expect(
        updateVolunteerScreening('vbt_main', 'vol_x', {}, servant)
      ).rejects.toThrow('UNAUTHORIZED_SCREENING_UPDATE');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Child-Safe Communication Rules (Adult-to-Minor Protection)
  // ─────────────────────────────────────────────────────────────
  describe('Child-Safe Communication Protection Rules', () => {
    const adultLeader = { id: 'leader_tony', displayName: 'Coach Tony', age: 29, role: 'servant' };
    const minorYouth = { id: 'youth_sam', displayName: 'Sam Youth', age: 14, role: 'youth', guardianId: 'parent_eva' };
    const parentEva = { id: 'parent_eva', displayName: 'Eva Parent', age: 42, role: 'member' };

    it('BLOCKS unsupervised 1-on-1 direct messages between adults and minors without guardian CC', () => {
      const check = checkCommunicationSafety(adultLeader, minorYouth);
      expect(check.allowed).toBe(false);
      expect(check.blocked).toBe(true);
      expect(check.rule).toBe('NO_UNSUPERVISED_ADULT_MINOR_DM');
      expect(check.requiredAction).toBe('ATTACH_GUARDIAN_CC');
    });

    it('ALLOWS adult-to-minor communication when guardian CC is provided', () => {
      const check = checkCommunicationSafety(adultLeader, minorYouth, {
        ccGuardianId: 'parent_eva',
      });
      expect(check.allowed).toBe(true);
      expect(check.blocked).toBe(false);
      expect(check.ccGuardianId).toBe('parent_eva');
    });

    it('ALLOWS adult-to-minor communication in supervised group channels', () => {
      const check = checkCommunicationSafety(adultLeader, minorYouth, {
        isGroupChannel: true,
      });
      expect(check.allowed).toBe(true);
      expect(check.blocked).toBe(false);
    });

    it('ALLOWS registered parent/guardian to message their own child directly', () => {
      const check = checkCommunicationSafety(parentEva, minorYouth, { isParent: true });
      expect(check.allowed).toBe(true);
      expect(check.blocked).toBe(false);

      // Also checks when guardianId matches sender id
      const checkAuto = checkCommunicationSafety(parentEva, minorYouth);
      expect(checkAuto.allowed).toBe(true);
    });

    it('ALLOWS peer communication between two adults or two minors', () => {
      const adultPeer = { id: 'adult2', age: 30, role: 'member' };
      const minorPeer = { id: 'minor2', age: 15, role: 'youth' };

      expect(checkCommunicationSafety(adultLeader, adultPeer).allowed).toBe(true);
      expect(checkCommunicationSafety(minorYouth, minorPeer).allowed).toBe(true);
    });

    it('BLOCKS unsupervised minor-to-adult 1-on-1 direct DM unless guardian CC is included', () => {
      const check1 = checkCommunicationSafety(minorYouth, adultLeader);
      expect(check1.allowed).toBe(false);
      expect(check1.requiredAction).toBe('ATTACH_GUARDIAN_CC');

      const check2 = checkCommunicationSafety(minorYouth, adultLeader, { ccGuardianId: 'parent_eva' });
      expect(check2.allowed).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Public Directory Privacy Sanitization
  // ─────────────────────────────────────────────────────────────
  describe('Public Directory Sanitization for Minors', () => {
    const minorMember = {
      id: 'minor_lily',
      displayName: 'Lily Adams',
      isMinor: true,
      age: 12,
      role: 'youth',
      phoneNumber: '01009998888',
      email: 'lily@example.com',
      medicalNotes: 'Asthma',
      emergencyContact: 'Mother 01009998888',
      team: 'Eagles',
    };

    it('sanitizes and masks minor data for general community users', () => {
      const ordinaryUser = { id: 'user1', role: 'member' };
      const sanitized = filterMemberForPublicDirectory(minorMember, ordinaryUser);

      expect(sanitized.isMinor).toBe(true);
      expect(sanitized.protected).toBe(true);
      expect(sanitized.displayName).toContain('*** (Youth Camper)');
      // Private fields stripped
      expect(sanitized.phoneNumber).toBeUndefined();
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.medicalNotes).toBeUndefined();
      expect(sanitized.emergencyContact).toBeUndefined();
    });

    it('preserves full directory data when viewed by safety coordinator', () => {
      const coordinator = { id: 'coord1', role: 'coordinator' };
      const full = filterMemberForPublicDirectory(minorMember, coordinator);

      expect(full.phoneNumber).toBe('01009998888');
      expect(full.displayName).toBe('Lily Adams');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. Real-Time Subscriptions
  // ─────────────────────────────────────────────────────────────
  describe('Real-Time Subscriptions', () => {
    it('subscribes to youth safety record and fires callback on update', async () => {
      const callback = vi.fn();
      const unsub = subscribeToYouthSafetyRecord('vbt_main', 'youth_sub_test', callback);

      expect(typeof unsub).toBe('function');
      expect(callback).toHaveBeenCalled();
    });

    it('subscribes to youth safety audit logs', async () => {
      const callback = vi.fn();
      const unsub = subscribeToYouthAuditLogs('vbt_main', 'youth_sub_test', callback);

      expect(typeof unsub).toBe('function');
      expect(callback).toHaveBeenCalled();
    });
  });
});
