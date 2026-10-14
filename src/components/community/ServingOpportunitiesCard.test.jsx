import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import ServingOpportunitiesCard, {
  ServeInterestModal,
} from './ServingOpportunitiesCard';
import {
  MEMBER_SERVING_STATES,
  resolveMemberServingState,
  getRoleDisplayInfo,
  formatServingDateTime,
  formatSpotsRemaining,
  getOpportunityBadges,
  formatMemberAvailabilitySummary,
} from './servingOpportunitiesUtils';
import * as CommunityExports from './index';

describe('ServingOpportunitiesCard Suite', () => {
  const sampleOpportunities = [
    {
      id: 'opp-1',
      title: 'Station Leader - Sports & Agility Station',
      roleNeeded: 'Station Leader',
      activityName: 'Friday Service & Youth Sports',
      serviceDate: '2026-10-16',
      startTime: '18:30',
      location: 'Main Church Gymnasium',
      spotsNeeded: 4,
      spotsFilled: 2,
      spotsRemaining: 2,
      requirements: ['Energetic youth passion', 'Orientation required'],
      requiredBadges: ['Youth-Safety-Level-1'],
      currentMemberState: 'not_applied',
    },
    {
      id: 'opp-2',
      title: 'Court Referee & Match Official',
      roleNeeded: 'Court Referee',
      activityName: 'Friday Service & Youth Sports',
      serviceDate: '2026-10-16',
      startTime: '18:30',
      location: { name: 'Main Gymnasium Court 1', address: 'Upper Sports Complex' },
      spotsNeeded: 3,
      spotsFilled: 2,
      spotsRemaining: 1,
      requirements: ['Rulebook mastery', 'CPR certified'],
      currentMemberState: 'pending',
    },
    {
      id: 'opp-3',
      title: 'Media & Audio/Visual Coordinator',
      roleNeeded: 'Media & Audio',
      activityName: 'Friday Service & Youth Sports',
      serviceDate: '2026-10-16',
      startTime: '18:30',
      location: 'Audio Booth & Projection Desk',
      spotsNeeded: 2,
      spotsFilled: 2,
      spotsRemaining: 0,
      requirements: ['Sound mixer operation'],
      currentMemberState: 'confirmed',
    },
    {
      id: 'opp-4',
      title: 'First Aid & Health Servant',
      roleNeeded: 'First Aid & Care',
      activityName: 'Friday Service & Youth Sports',
      serviceDate: '2026-10-16',
      startTime: '18:30',
      location: 'Medical Station',
      spotsNeeded: 2,
      spotsFilled: 1,
      spotsRemaining: 1,
      currentMemberState: 'replacement_needed',
    },
  ];

  const sampleUser = {
    uid: 'user-789',
    displayName: 'Mina Farid',
    email: 'mina@vbt.org',
  };

  const sampleAvailability = {
    availableDays: ['friday', 'saturday'],
    shifts: ['evening'],
    preferredFrequency: 'weekly',
    maxServingPerMonth: 4,
  };

  describe('Module Exports', () => {
    it('exports ServingOpportunitiesCard as default and named export', () => {
      expect(ServingOpportunitiesCard).toBeDefined();
      expect(typeof ServingOpportunitiesCard).toBe('function');
      expect(CommunityExports.ServingOpportunitiesCard).toBe(ServingOpportunitiesCard);
    });

    it('exports helper constants and functions in community index', () => {
      expect(CommunityExports.MEMBER_SERVING_STATES).toBeDefined();
      expect(CommunityExports.resolveMemberServingState).toBeDefined();
      expect(CommunityExports.getRoleDisplayInfo).toBeDefined();
      expect(CommunityExports.formatServingDateTime).toBeDefined();
      expect(CommunityExports.formatSpotsRemaining).toBeDefined();
    });
  });

  describe('Helper: resolveMemberServingState', () => {
    it('returns NOT_APPLIED for null or undefined opportunity', () => {
      expect(resolveMemberServingState(null, sampleUser)).toBe(MEMBER_SERVING_STATES.NOT_APPLIED);
    });

    it('resolves direct memberState / currentMemberState strings', () => {
      expect(resolveMemberServingState({ currentMemberState: 'pending' })).toBe(MEMBER_SERVING_STATES.PENDING);
      expect(resolveMemberServingState({ memberState: 'confirmed' })).toBe(MEMBER_SERVING_STATES.CONFIRMED);
      expect(resolveMemberServingState({ memberStatus: 'approved' })).toBe(MEMBER_SERVING_STATES.CONFIRMED);
      expect(resolveMemberServingState({ applicationStatus: 'declined' })).toBe(MEMBER_SERVING_STATES.DECLINED);
      expect(resolveMemberServingState({ userState: 'replacement_needed' })).toBe(MEMBER_SERVING_STATES.REPLACEMENT_NEEDED);
      expect(resolveMemberServingState({ userState: 'replacement_requested' })).toBe(MEMBER_SERVING_STATES.REPLACEMENT_NEEDED);
      expect(resolveMemberServingState({ userState: 'not_applied' })).toBe(MEMBER_SERVING_STATES.NOT_APPLIED);
    });

    it('resolves member state from applications array matching currentUser ID', () => {
      const oppWithApps = {
        applications: [
          { memberId: 'user-other', status: 'approved' },
          { memberId: 'user-789', status: 'pending' },
        ],
      };
      expect(resolveMemberServingState(oppWithApps, sampleUser)).toBe(MEMBER_SERVING_STATES.PENDING);

      const oppWithApproved = {
        applications: [
          { userId: 'user-789', status: 'approved' },
        ],
      };
      expect(resolveMemberServingState(oppWithApproved, sampleUser)).toBe(MEMBER_SERVING_STATES.CONFIRMED);

      const oppWithReplacement = {
        applications: [
          { member: { id: 'user-789' }, status: 'replacement_requested' },
        ],
      };
      expect(resolveMemberServingState(oppWithReplacement, sampleUser)).toBe(MEMBER_SERVING_STATES.REPLACEMENT_NEEDED);
    });

    it('falls back to NOT_APPLIED if user is not in applications list', () => {
      const opp = { applications: [{ memberId: 'stranger-id', status: 'confirmed' }] };
      expect(resolveMemberServingState(opp, sampleUser)).toBe(MEMBER_SERVING_STATES.NOT_APPLIED);
    });
  });

  describe('Helper: getRoleDisplayInfo', () => {
    it('categorizes referee role', () => {
      const info = getRoleDisplayInfo({ roleNeeded: 'Court Referee & Match Official' });
      expect(info.roleTitle).toBe('Court Referee & Match Official');
      expect(info.category).toBe('Athletics & Officiating');
      expect(info.icon).toBeDefined();
    });

    it('categorizes station leader role', () => {
      const info = getRoleDisplayInfo({ roleNeeded: 'Station Leader' });
      expect(info.roleTitle).toBe('Station Leader');
      expect(info.category).toBe('Youth Leadership');
    });

    it('categorizes media & audio role', () => {
      const info = getRoleDisplayInfo({ roleNeeded: 'Media & Audio Specialist' });
      expect(info.roleTitle).toBe('Media & Audio Specialist');
      expect(info.category).toBe('Audio / Visual Production');
    });

    it('categorizes first aid role', () => {
      const info = getRoleDisplayInfo({ role: 'First Aid & Care Nurse' });
      expect(info.roleTitle).toBe('First Aid & Care Nurse');
      expect(info.category).toBe('Health & Participant Care');
    });

    it('categorizes praise role', () => {
      const info = getRoleDisplayInfo({ role: 'Praise & Worship Guitarist' });
      expect(info.roleTitle).toBe('Praise & Worship Guitarist');
      expect(info.category).toBe('Spiritual Ministry');
    });

    it('provides fallback role display info', () => {
      const info = getRoleDisplayInfo({ role: 'General Camp Helper' });
      expect(info.roleTitle).toBe('General Camp Helper');
      expect(info.category).toBe('Community Service');
    });
  });

  describe('Helper: formatServingDateTime', () => {
    it('returns default fallback when opportunity is absent', () => {
      expect(formatServingDateTime(null)).toBe('Date & Time TBA');
    });

    it('preserves existing dateTime string if provided', () => {
      expect(formatServingDateTime({ dateTime: 'Friday · 6:30 PM' })).toBe('Friday · 6:30 PM');
    });

    it('formats ISO date and military time into DayOfWeek and AM/PM', () => {
      const opp = { serviceDate: '2026-10-16', startTime: '18:30' };
      const formatted = formatServingDateTime(opp);
      expect(formatted).toContain('Friday');
      expect(formatted).toContain('6:30 PM');
    });

    it('formats morning time correctly', () => {
      const opp = { serviceDate: '2026-10-17', startTime: '09:00' };
      const formatted = formatServingDateTime(opp);
      expect(formatted).toContain('Saturday');
      expect(formatted).toContain('9:00 AM');
    });
  });

  describe('Helper: formatSpotsRemaining', () => {
    it('handles direct spotsRemaining value', () => {
      const result = formatSpotsRemaining({ spotsRemaining: 2 });
      expect(result.count).toBe(2);
      expect(result.label).toBe('2 spots left');
      expect(result.isFull).toBe(false);
      expect(result.isUrgent).toBe(false);
    });

    it('marks 1 spot as urgent', () => {
      const result = formatSpotsRemaining({ spotsRemaining: 1 });
      expect(result.count).toBe(1);
      expect(result.label).toBe('1 spot left');
      expect(result.isUrgent).toBe(true);
    });

    it('calculates remaining from spotsNeeded and spotsFilled', () => {
      const result = formatSpotsRemaining({ spotsNeeded: 5, spotsFilled: 2 });
      expect(result.count).toBe(3);
      expect(result.label).toBe('3 spots left');
    });

    it('flags full opportunities when spots is zero', () => {
      const result = formatSpotsRemaining({ spotsNeeded: 4, spotsFilled: 4 });
      expect(result.count).toBe(0);
      expect(result.label).toBe('All spots filled');
      expect(result.isFull).toBe(true);
    });
  });

  describe('Helper: getOpportunityBadges', () => {
    it('extracts and deduplicates badges from various properties', () => {
      const opp = {
        requirements: ['Orientation required', 'CPR certified'],
        requiredBadges: ['Youth-Safety', 'CPR certified'],
        requiredTraining: 'Safeguarding Video',
      };
      const badges = getOpportunityBadges(opp);
      expect(badges).toContain('Orientation required');
      expect(badges).toContain('CPR certified');
      expect(badges).toContain('Youth-Safety');
      expect(badges).toContain('Safeguarding Video');
      expect(badges.filter((b) => b === 'CPR certified').length).toBe(1);
    });

    it('handles empty or missing badge arrays', () => {
      expect(getOpportunityBadges({})).toEqual([]);
      expect(getOpportunityBadges(null)).toEqual([]);
    });
  });

  describe('Helper: formatMemberAvailabilitySummary', () => {
    it('formats days and preferred frequency', () => {
      const summary = formatMemberAvailabilitySummary({
        availableDays: ['friday', 'saturday'],
        preferredFrequency: 'weekly',
      });
      expect(summary).toBe('Friday, Saturday · Weekly');
    });

    it('formats max serving per month if frequency omitted', () => {
      const summary = formatMemberAvailabilitySummary({
        availableDays: ['sunday'],
        maxServingPerMonth: 2,
      });
      expect(summary).toBe('Sunday · Max 2/mo');
    });

    it('returns null if no availability is provided', () => {
      expect(formatMemberAvailabilitySummary(null)).toBeNull();
    });
  });

  describe('ServingOpportunitiesCard Rendering', () => {
    it('renders the card with 2 or 3 open opportunities', () => {
      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={sampleOpportunities}
          memberAvailability={sampleAvailability}
          currentUser={sampleUser}
        />
      );

      // Section title & badges
      expect(html).toContain('Serve with VBT');
      expect(html).toContain('Step into ministry');
      expect(html).toContain('3 Open'); // default maxItems = 3

      // Roles rendered
      expect(html).toContain('Station Leader');
      expect(html).toContain('Court Referee');
      expect(html).toContain('Media &amp; Audio');

      // Does not render 4th opportunity due to maxItems = 3
      expect(html).not.toContain('Medical Station');

      // Activity and Location
      expect(html).toContain('Friday Service &amp; Youth Sports');
      expect(html).toContain('Main Church Gymnasium');

      // Spots remaining
      expect(html).toContain('2 spots left');
      expect(html).toContain('1 spot left');
      expect(html).toContain('All spots filled');

      // Badges
      expect(html).toContain('Orientation required');
      expect(html).toContain('CPR certified');

      // Member states
      expect(html).toContain('I can serve');
      expect(html).toContain('Pending Review');
      expect(html).toContain('Confirmed Servant');
      expect(html).toContain("You&#x27;re Scheduled");

      // Quick actions
      expect(html).toContain('Update My Availability');
      expect(html).toContain('View all serving opportunities');
    });

    it('displays member availability summary pill when provided', () => {
      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={sampleOpportunities}
          memberAvailability={sampleAvailability}
        />
      );
      expect(html).toContain('Your current availability:');
      expect(html).toContain('Friday, Saturday · Weekly');
    });

    it('renders empty state with the exact required copy when no opportunities exist', () => {
      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={[]}
          memberAvailability={sampleAvailability}
        />
      );

      // Exact required empty state text
      expect(html).toContain('All serving spots are filled this week. Thank you!');
      expect(html).toContain('Every station is covered by faithful servants.');
      expect(html).toContain('Update My Availability');
      expect(html).toContain('View all serving opportunities');
    });

    it('renders loading skeleton when isLoading is true', () => {
      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={sampleOpportunities}
          isLoading={true}
        />
      );

      expect(html).toContain('role="status"');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('Loading serving opportunities...');
      expect(html).toContain('animate-pulse');
      // Should not show opportunity titles while loading
      expect(html).not.toContain('Station Leader');
    });

    it('renders offline banner when isOffline is true', () => {
      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={sampleOpportunities}
          isOffline={true}
        />
      );

      expect(html).toContain('Working offline — showing cached serving opportunities.');
    });

    it('renders offline notice on empty state as well', () => {
      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={[]}
          isOffline={true}
        />
      );

      expect(html).toContain('Working offline — showing cached schedule.');
      expect(html).toContain('All serving spots are filled this week. Thank you!');
    });

    it('respects custom maxItems prop (e.g. 2)', () => {
      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={sampleOpportunities}
          maxItems={2}
        />
      );

      expect(html).toContain('2 Open');
      expect(html).toContain('Station Leader');
      expect(html).toContain('Court Referee');
      expect(html).not.toContain('Media &amp; Audio');
    });

    it('renders replacement_needed state with Cover Spot CTA', () => {
      const replacementOpp = [
        {
          id: 'opp-sub',
          roleNeeded: 'Court Referee',
          activityName: 'Youth Basketball League',
          dateTime: 'Saturday · 10:00 AM',
          location: 'Court A',
          spotsRemaining: 1,
          currentMemberState: 'replacement_needed',
        },
      ];

      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={replacementOpp}
        />
      );

      expect(html).toContain('Replacement Needed');
      expect(html).toContain('Cover Spot');
    });

    it('renders declined state with Re-apply button', () => {
      const declinedOpp = [
        {
          id: 'opp-dec',
          roleNeeded: 'Media & Audio',
          activityName: 'Friday Youth Gathering',
          dateTime: 'Friday · 6:30 PM',
          location: 'Audio Booth',
          spotsRemaining: 1,
          currentMemberState: 'declined',
        },
      ];

      const html = renderToString(
        <ServingOpportunitiesCard
          opportunities={declinedOpp}
        />
      );

      expect(html).toContain('Declined');
      expect(html).toContain('Re-apply');
    });
  });

  describe('ServeInterestModal Sub-component', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToString(
        <ServeInterestModal
          opportunity={sampleOpportunities[0]}
          currentUser={sampleUser}
          isOpen={false}
        />
      );
      expect(html).toBe('');
    });

    it('renders full accessible modal when open', () => {
      const html = renderToString(
        <ServeInterestModal
          opportunity={sampleOpportunities[0]}
          currentUser={sampleUser}
          isOpen={true}
        />
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('I Can Serve: Station Leader');
      expect(html).toContain('Friday Service &amp; Youth Sports');
      expect(html).toContain('Main Church Gymnasium');
      expect(html).toContain('Applying as:');
      expect(html).toContain('Mina Farid');
      expect(html).toContain('serve-interest-notes');
      expect(html).toContain('Confirm &amp; Express Interest');
      expect(html).toContain('Cancel');
    });

    it('renders guest/servant placeholder when currentUser is not provided', () => {
      const html = renderToString(
        <ServeInterestModal
          opportunity={sampleOpportunities[0]}
          currentUser={null}
          isOpen={true}
        />
      );

      expect(html).toContain('Applying as:');
      expect(html).toContain('Servant');
    });
  });

  describe('Callback & Action Contract Verification', () => {
    it('handles onSetAvailability callback firing when invoked', () => {
      const onSetAvailability = vi.fn();
      const onOpenServePage = vi.fn();
      const onExpressInterest = vi.fn();

      const element = React.createElement(ServingOpportunitiesCard, {
        opportunities: sampleOpportunities,
        onSetAvailability,
        onOpenServePage,
        onExpressInterest,
      });

      expect(element.props.onSetAvailability).toBe(onSetAvailability);
      expect(element.props.onOpenServePage).toBe(onOpenServePage);
      expect(element.props.onExpressInterest).toBe(onExpressInterest);

      // Invoke callbacks directly
      element.props.onSetAvailability();
      expect(onSetAvailability).toHaveBeenCalledTimes(1);

      element.props.onOpenServePage();
      expect(onOpenServePage).toHaveBeenCalledTimes(1);
    });

    it('submits interest with opportunity and note via onSubmit callback', async () => {
      const onSubmit = vi.fn().mockResolvedValue(true);
      const targetOpp = sampleOpportunities[0];
      const customNote = 'I have my whistle and first-aid kit ready.';

      // Simulate form submission callback directly
      await onSubmit(targetOpp, customNote);

      expect(onSubmit).toHaveBeenCalledWith(targetOpp, customNote);
    });
  });
});
