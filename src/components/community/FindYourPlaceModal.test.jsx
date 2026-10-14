import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import FindYourPlaceModal from './FindYourPlaceModal';
import {
  ONBOARDING_SPORTS,
  ONBOARDING_AGE_GROUPS,
  SERVING_STYLE_OPTIONS,
  SERVING_FREQUENCY_OPTIONS,
  SKILLS_EXPERIENCE_OPTIONS,
  WORK_STYLE_OPTIONS,
} from '../../services/onboardingService';

// Mock onboardingService and firebase
vi.mock('../../firebase', () => ({
  db: { _mockDb: true },
  DEFAULT_COMMUNITY_ID: 'vbt_main',
}));

vi.mock('../../services/onboardingService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getOnboardingResponses: vi.fn().mockResolvedValue(null),
    saveOnboardingResponses: vi.fn().mockResolvedValue({ id: 'usr_test' }),
    requestRoleOrAssignmentApproval: vi.fn().mockResolvedValue({ id: 'req_1' }),
  };
});

describe('FindYourPlaceModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    currentUser: { uid: 'usr_sarah', displayName: 'Sarah Shenouda' },
    memberProfile: { id: 'usr_sarah', firstName: 'Sarah' },
    communityId: 'vbt_main',
  };

  it('renders null when isOpen is false', () => {
    const html = renderToString(<FindYourPlaceModal {...defaultProps} isOpen={false} />);
    expect(html).toBe('');
  });

  it('renders Step 0 welcome overview when isOpen is true', () => {
    const html = renderToString(<FindYourPlaceModal {...defaultProps} />);
    expect(html).toContain('Find Your Place');
    expect(html).toContain('VBT Guide');
    expect(html).toContain('Where will you make your mark?');
    expect(html).toContain('Start Guided Discovery');
    expect(html).toContain('Skip &amp; View Suggestions');
  });

  it('includes key reassurance cards: 2-Minute Discovery, Safe Exploration, Explainable Fit, Always Editable', () => {
    const html = renderToString(<FindYourPlaceModal {...defaultProps} />);
    expect(html).toContain('2-Minute Discovery');
    expect(html).toContain('Safe Exploration');
    expect(html).toContain('Explainable Fit');
    expect(html).toContain('Always Editable');
  });

  it('provides accessible dialog attributes', () => {
    const html = renderToString(<FindYourPlaceModal {...defaultProps} />);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="find-your-place-title"');
  });
});
