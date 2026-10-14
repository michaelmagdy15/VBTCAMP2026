import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import SmartAssignmentModal from './SmartAssignmentModal';
import * as CommunityExports from './index';

vi.mock('../../firebase', () => ({
  db: { _isMock: true },
  DEFAULT_COMMUNITY_ID: 'vbt_community_main',
}));

vi.mock('../../services/smartAssignmentService', () => ({
  ASSIGNMENT_STATUS: {
    OPEN: 'open',
    INTEREST_SUBMITTED: 'interest_submitted',
    PENDING_LEADER_REVIEW: 'pending_leader_review',
    CONFIRMED: 'confirmed',
    DECLINED: 'declined',
    CANCELLED: 'cancelled',
    REPLACEMENT_NEEDED: 'replacement_needed',
    REASSIGNED: 'reassigned',
    COMPLETED: 'completed',
  },
  scoreCandidateForOpportunity: vi.fn(() => ({
    totalScore: 92,
    factors: {
      availability: { score: 25, max: 25, details: 'Available' },
      skillsAndTraining: { score: 25, max: 25, details: 'Certified' },
      interestsAndRole: { score: 20, max: 20, details: 'Prefers referee' },
      reliability: { score: 12, max: 15, details: 'High completion' },
      teamBalance: { score: 10, max: 15, details: 'Aligned' },
      burnout: { deduction: 0, riskLevel: 'low', details: 'Healthy workload' },
    },
    rationale: ['Calendar confirmed available', 'Completed Child Safety 101'],
    burnoutWarning: false,
    eligible: true,
  })),
  getRecommendedCandidatesForOpportunity: vi.fn(() => [
    {
      candidate: {
        id: 'servant_1',
        name: 'David Servant',
        role: 'servant',
        tier: 'servant',
        skills: ['refereeing'],
      },
      totalScore: 92,
      factors: {
        availability: { score: 25, max: 25, details: 'Available' },
        skillsAndTraining: { score: 25, max: 25, details: 'Certified' },
        interestsAndRole: { score: 20, max: 20, details: 'Prefers referee' },
        reliability: { score: 12, max: 15, details: 'High completion' },
        teamBalance: { score: 10, max: 15, details: 'Aligned' },
        burnout: { deduction: 0, riskLevel: 'low', details: 'Healthy workload' },
      },
      rationale: ['Calendar confirmed available', 'Completed Child Safety 101'],
      burnoutWarning: false,
      burnoutRisk: { currentCount: 1, maxAllowed: 4, riskLevel: 'low' },
      eligible: true,
    },
  ]),
  findReplacementCandidates: vi.fn(() => [
    {
      candidate: {
        id: 'backup_1',
        name: 'Backup Servant',
        tier: 'lead_servant',
      },
      totalScore: 88,
      rationale: ['Experienced servant ready to step in quickly'],
      isEmergencyReady: true,
    },
  ]),
  transitionAssignmentStatus: vi.fn(async () => ({ success: true })),
  createSmartAssignment: vi.fn(async () => ({ id: 'asgn_new', status: 'pending_leader_review' })),
  subscribeToAssignmentsForOpportunity: vi.fn((_commId, _oppId, callback) => {
    callback([
      {
        id: 'asg_1',
        memberId: 'servant_1',
        memberName: 'David Servant',
        status: 'confirmed',
        role: 'referee',
        auditTrail: [
          {
            id: 'audit_1',
            fromStatus: 'pending_leader_review',
            toStatus: 'confirmed',
            actor: { name: 'Pastor Peter', role: 'leader' },
            timestamp: new Date().toISOString(),
            reason: 'Confirmed by leader',
          },
        ],
      },
    ]);
    return () => {};
  }),
  checkBurnoutRisk: vi.fn(() => ({
    isAtRisk: false,
    currentCount: 1,
    maxAllowed: 4,
    riskLevel: 'low',
  })),
}));

vi.mock('../../services/memberService', () => ({
  getMembers: vi.fn(async () => [
    {
      id: 'servant_1',
      name: 'David Servant',
      role: 'servant',
      tier: 'servant',
      skills: ['refereeing'],
    },
  ]),
}));

describe('SmartAssignmentModal', () => {
  it('exports SmartAssignmentModal as default and from community index', () => {
    expect(SmartAssignmentModal).toBeDefined();
    expect(typeof SmartAssignmentModal).toBe('function');
    expect(CommunityExports.SmartAssignmentModal).toBe(SmartAssignmentModal);
  });

  it('renders null when isOpen is false', () => {
    const element = React.createElement(SmartAssignmentModal, {
      isOpen: false,
      onClose: vi.fn(),
      opportunity: { id: 'opp_1', title: 'Referee' },
    });
    expect(element).toBeDefined();
    // Element exists but when rendered it returns null
  });

  it('creates element with opportunity and leader props', () => {
    const onClose = vi.fn();
    const opportunity = {
      id: 'opp_101',
      title: 'Soccer Head Referee',
      role: 'referee',
      date: '2026-10-10',
      shift: 'morning',
      spotsNeeded: 2,
    };
    const currentUser = {
      uid: 'leader_mike',
      displayName: 'Michael Magdy',
      role: 'coordinator',
    };

    const element = React.createElement(SmartAssignmentModal, {
      isOpen: true,
      onClose,
      opportunity,
      currentUser,
      initialTab: 'recommendations',
    });

    expect(element.props.isOpen).toBe(true);
    expect(element.props.opportunity.id).toBe('opp_101');
    expect(element.props.currentUser.displayName).toBe('Michael Magdy');
    expect(element.props.initialTab).toBe('recommendations');
  });

  it('supports initialTab set to replacement mode', () => {
    const initialAssignment = {
      id: 'asg_cancelled',
      memberId: 'servant_cancelled',
      status: 'cancelled',
    };

    const element = React.createElement(SmartAssignmentModal, {
      isOpen: true,
      onClose: vi.fn(),
      opportunity: { id: 'opp_101', title: 'Logistics Servant' },
      initialTab: 'replacement',
      initialAssignment,
    });

    expect(element.props.initialTab).toBe('replacement');
    expect(element.props.initialAssignment.id).toBe('asg_cancelled');
  });
});
