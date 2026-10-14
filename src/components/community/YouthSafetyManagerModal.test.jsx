import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import YouthSafetyManagerModal from './YouthSafetyManagerModal';

vi.mock('../../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('../../services/youthSafetyService', async () => {
  const actual = await vi.importActual('../../services/youthSafetyService');
  return {
    ...actual,
    getYouthSafetyRecord: vi.fn(async () => ({
      id: 'youth_test_1',
      communityId: 'vbt_main',
      guardians: [
        {
          guardianId: 'g_parent1',
          name: 'Sarah Mother',
          relationship: 'Mother',
          phoneNumber: '0100123456',
          isPrimary: true,
          verified: true,
        },
      ],
      consents: {
        medicalEmergencyConsent: { granted: true, signedBy: 'Sarah Mother', signedAt: '2026-10-01' },
        sportsLiabilityWaiver: { granted: true, signedBy: 'Sarah Mother', signedAt: '2026-10-01' },
        photoReleaseConsent: { granted: false, signedBy: '', signedAt: null },
      },
      authorizedPickups: [
        {
          id: 'pickup_1',
          name: 'Uncle David',
          relationship: 'Uncle',
          phone: '0123456789',
          verifiedPin: '4829',
          idVerified: true,
        },
      ],
      emergencyContacts: [
        { id: 'em_1', name: 'Dr. Lucas', relationship: 'Family Physician', primaryPhone: '0100000000' },
      ],
      medicalInfo: {
        allergies: ['Peanuts (Severe - EpiPen)'],
        chronicConditions: ['Asthma'],
        dietaryRestrictions: ['Nut-free table'],
        emergencyDoctorPhone: '01099887766',
        notes: 'Carries EpiPen in red backpack',
      },
    })),
    subscribeToYouthSafetyRecord: vi.fn(() => () => {}),
    subscribeToYouthAuditLogs: vi.fn(() => () => {}),
    getRestrictedMedicalInfo: vi.fn(async () => ({
      allergies: ['Peanuts (Severe - EpiPen)'],
      chronicConditions: ['Asthma'],
      dietaryRestrictions: ['Nut-free table'],
      emergencyDoctorPhone: '01099887766',
      notes: 'Carries EpiPen in red backpack',
    })),
  };
});

describe('YouthSafetyManagerModal', () => {
  const mockYouthMember = {
    id: 'youth_test_1',
    displayName: 'Mark Shenouda',
    age: 14,
    isMinor: true,
    role: 'youth',
    team: 'St. George Eagles',
  };

  const mockCoordinatorUser = {
    id: 'user_coord_1',
    displayName: 'Mina Coordinator',
    role: 'coordinator',
  };

  it('renders null when isOpen is false', () => {
    const html = renderToString(
      <YouthSafetyManagerModal
        isOpen={false}
        onClose={() => {}}
        youthMember={mockYouthMember}
        currentUser={mockCoordinatorUser}
      />
    );
    expect(html).toBe('');
  });

  it('renders modal header, minor badge, and navigation tabs when isOpen is true', () => {
    const html = renderToString(
      <YouthSafetyManagerModal
        isOpen={true}
        onClose={() => {}}
        youthMember={mockYouthMember}
        currentUser={mockCoordinatorUser}
      />
    );

    expect(html).toContain('Youth Safety &amp; Child Protection Officer');
    expect(html).toContain('Protected Minor');
    expect(html).toContain('Mark Shenouda');
    expect(html).toContain('Guardians &amp; Pickups');
    expect(html).toContain('Consent Forms');
    expect(html).toContain('Restricted Medical');
    expect(html).toContain('Supervision &amp; Safe Chat');
    expect(html).toContain('Safety Audit Trail');
  });

  it('displays child protection disclaimer in the modal footer', () => {
    const html = renderToString(
      <YouthSafetyManagerModal
        isOpen={true}
        onClose={() => {}}
        youthMember={mockYouthMember}
        currentUser={mockCoordinatorUser}
      />
    );

    expect(html).toContain('VBT Child Protection Standard');
  });
});
