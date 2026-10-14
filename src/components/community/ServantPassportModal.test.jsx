import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import ServantPassportModal from './ServantPassportModal';
import { PASSPORT_TIERS } from '../../services/servantPassportService';

vi.mock('../../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('../../utils/haptics', () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('ServantPassportModal Component', () => {
  const mockMemberId = 'servant_mark_101';
  const mockCurrentUser = {
    id: mockMemberId,
    displayName: 'Mark Shenouda',
    role: 'servant',
  };

  const samplePassport = {
    id: mockMemberId,
    displayName: 'Mark Shenouda',
    currentTier: 'trained_servant',
    tierLevel: 3,
    tierTitle: 'Trained servant',
    activitiesServed: 5,
    rolesPerformed: ['Referee', 'Logistics', 'Prayer Station'],
    trainingsCompleted: [
      {
        id: 'safety_101',
        title: 'Child Safety & Youth Protection',
        category: 'Child Safety',
        badgeIcon: '🛡️',
        completedAt: '2026-06-15T10:00:00Z',
      },
    ],
    seasonsServing: ['Summer 2025', 'Summer 2026'],
    endorsedSkills: [
      { skill: 'Fair Play Whistling', endorsementsCount: 3, endorsedBy: 'Leader Peter' },
    ],
    encouragements: [
      {
        id: 'enc_1',
        authorName: 'Coach Mina',
        authorRole: 'Team Leader',
        note: 'Thank you for your tireless dedication at the prayer station today!',
        isPrivate: false,
        scriptureVerse: 'Matthew 5:16',
        createdAt: '2026-07-01T12:00:00Z',
      },
      {
        id: 'enc_2',
        authorName: 'Fr. Daoud',
        authorRole: 'Pastoral Care',
        note: 'Personal pastoral prayer for your ministry journey.',
        isPrivate: true,
        createdAt: '2026-07-02T12:00:00Z',
      },
    ],
    leadershipMilestones: [
      {
        id: 'ms_1',
        title: 'Commissioned as Trained Servant',
        achievedAt: '2026-06-20T10:00:00Z',
        badgeIcon: '📜',
        description: 'Completed mandatory safeguarding guidelines',
      },
    ],
    nextGrowthStep: {
      targetTier: 'active_servant',
      targetTierTitle: 'Active servant',
      targetTierBadge: '⭐',
      blessingTitle: 'Next Blessing Step: Stepping into Active Service',
      growthArea: 'Faithful Consistency & Court Stewardship',
      encouragingMessage:
        'With your knowledge and equipped heart, God is inviting you into steady faithfulness across sports rotations.',
      actionSteps: [
        'Serve consistently in 4+ matches or tournament stations',
        'Receive skill endorsements from fellow servants',
      ],
      progressPercentage: 75,
      isEligibleForPromotion: false,
      criteriaStatus: [
        { id: 'act', label: 'Activities Served (5/4)', satisfied: true },
        { id: 'trn', label: 'Trainings (1/3)', satisfied: false },
      ],
    },
  };

  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <ServantPassportModal
        isOpen={false}
        onClose={vi.fn()}
        memberId={mockMemberId}
        currentUser={mockCurrentUser}
      />
    );
    expect(html).toBe('');
  });

  it('renders access denied state when user does not have permission to view', () => {
    const unauthorizedUser = { id: 'stranger_99', role: 'member' };
    const html = renderToString(
      <ServantPassportModal
        isOpen={true}
        onClose={vi.fn()}
        memberId={mockMemberId}
        currentUser={unauthorizedUser}
        initialPassport={samplePassport}
      />
    );

    expect(html).toContain('Private Servant Passport');
    expect(html).toContain('strictly accessible to the servant themselves');
    expect(html).not.toContain('Mark Shenouda');
  });

  it('renders full passport overview when authorized user views', () => {
    const html = renderToString(
      <ServantPassportModal
        isOpen={true}
        onClose={vi.fn()}
        memberId={mockMemberId}
        currentUser={mockCurrentUser}
        initialPassport={samplePassport}
      />
    );

    // Displays member name & title
    expect(html).toContain('Mark Shenouda');
    expect(html).toContain('Trained servant');
    expect(html).toContain('Passport ID:');
    expect(html).toContain('VBT-');

    // Displays metric counters
    expect(html).toContain('Activities Served');
    expect(html).toContain('Trainings &amp; Safety');
    expect(html).toContain('Endorsed Gifts');
    expect(html).toContain('Blessings Received');

    // Displays roles performed
    expect(html).toContain('Referee');
    expect(html).toContain('Logistics');
    expect(html).toContain('Prayer Station');

    // Displays latest milestone banner
    expect(html).toContain('Latest Milestone');
    expect(html).toContain('Commissioned as Trained Servant');

    // Displays Next Blessing Step Card with warm language
    expect(html).toContain('Next Blessing Step: Stepping into Active Service');
    expect(html).toContain('Growth Area:');
    expect(html).toContain('Faithful Consistency');
    expect(html).toContain('With your knowledge and equipped heart');
    expect(html).toContain('Serve consistently in 4+ matches');
  });

  it('renders leader action tab for authorized ministry leaders', () => {
    const leaderUser = { id: 'leader_1', role: 'coordinator', displayName: 'Leader Peter' };
    const html = renderToString(
      <ServantPassportModal
        isOpen={true}
        onClose={vi.fn()}
        memberId={mockMemberId}
        currentUser={leaderUser}
        initialPassport={samplePassport}
      />
    );

    expect(html).toContain('Leader Actions');
  });

  it('renders tab buttons for 7-Tier Pathway, Stamps, and Blessings', () => {
    const html = renderToString(
      <ServantPassportModal
        isOpen={true}
        onClose={vi.fn()}
        memberId={mockMemberId}
        currentUser={mockCurrentUser}
        initialPassport={samplePassport}
      />
    );

    expect(html).toContain('Passport Overview');
    expect(html).toContain('7-Tier Pathway');
    expect(html).toContain('Stamps &amp; Badges');
    expect(html).toContain('Blessings &amp; Words');
  });

  it('renders max tier mentor passport with crown of stewardship', () => {
    const mentorPassport = {
      ...samplePassport,
      currentTier: 'mentor',
      tierLevel: 7,
      tierTitle: 'Mentor',
      nextGrowthStep: {
        isMaxTier: true,
        targetTier: 'mentor',
        targetTierTitle: 'Mentor',
        blessingTitle: 'Crown of Faithful Stewardship',
        growthArea: 'Spiritual Mentorship & Generational Blessing',
        encouragingMessage: 'Beloved mentor, your fruitful seasons in VBT are an enduring testimony.',
        actionSteps: ['Mentor upcoming team leaders'],
        progressPercentage: 100,
        isEligibleForPromotion: false,
      },
    };

    const html = renderToString(
      <ServantPassportModal
        isOpen={true}
        onClose={vi.fn()}
        memberId={mockMemberId}
        currentUser={mockCurrentUser}
        initialPassport={mentorPassport}
      />
    );

    expect(html).toContain('Mentor');
    expect(html).toContain('Crown of Faithful Stewardship');
    expect(html).toContain('Beloved mentor');
    expect(html).not.toContain('Request Elevation to');
  });
});
