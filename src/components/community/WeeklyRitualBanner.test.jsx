import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import WeeklyRitualBanner from './WeeklyRitualBanner';
import { WEEKLY_RITUAL_PHASE } from '../../services/weeklyRitualService';
import { VBT_ROLES } from '../../contracts/communityContracts';

describe('WeeklyRitualBanner Component', () => {
  it('renders without crashing with default props', () => {
    const html = renderToString(<WeeklyRitualBanner />);
    expect(html).toContain('Stage');
    expect(html).toContain('of 6');
    expect(html).toContain('Next Step');
  });

  it('renders Early Week phase correctly on a Monday', () => {
    // 2026-10-05 10:00 AM is a Monday
    const monday = new Date(2026, 9, 5, 10, 0);
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={monday}
        userRole={VBT_ROLES.MEMBER}
      />
    );

    expect(html).toContain('Stage 1 of 6');
    expect(html).toContain('Early Week');
    expect(html).toContain('Mon - Wed');
    expect(html).toContain('A new week of fellowship and sports begins');
    expect(html).toContain('Explore Gathering Theme');
  });

  it('renders Midweek phase correctly on Wednesday afternoon for servant', () => {
    // 2026-10-07 14:00 is a Wednesday
    const wednesday = new Date(2026, 9, 7, 14, 0);
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={wednesday}
        userRole={VBT_ROLES.ACTIVE_SERVANT}
        userStatus="unassigned"
      />
    );

    expect(html).toContain('Stage 2 of 6');
    expect(html).toContain('Midweek');
    expect(html).toContain('Wed - Thu');
    expect(html).toContain('Serving stations are open');
    expect(html).toContain('Choose Serving Opportunity');
  });

  it('renders Before Event phase on Friday morning for confirmed servant', () => {
    // 2026-10-09 09:00 is a Friday morning
    const fridayMorning = new Date(2026, 9, 9, 9, 0);
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={fridayMorning}
        userRole={VBT_ROLES.ACTIVE_SERVANT}
        userStatus="confirmed"
      />
    );

    expect(html).toContain('Stage 3 of 6');
    expect(html).toContain('Before Event');
    expect(html).toContain('Thu - Fri am');
    expect(html).toContain('arrive by 5:30 PM');
    expect(html).toContain('Review Station Prep Notes');
  });

  it('renders Meeting Day phase on Friday evening with QR call-to-action', () => {
    // 2026-10-09 19:00 is Friday evening
    const fridayEvening = new Date(2026, 9, 9, 19, 0);
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={fridayEvening}
        userRole={VBT_ROLES.ACTIVE_SERVANT}
      />
    );

    expect(html).toContain('Stage 4 of 6');
    expect(html).toContain('Meeting Day');
    expect(html).toContain('Scan your servant check-in QR');
    expect(html).toContain('Scan Attendance QR');
  });

  it('renders Meeting Day phase on Tuesday evening for mid-week servant meeting', () => {
    // 2026-10-06 18:30 is Tuesday evening
    const tuesdayEvening = new Date(2026, 9, 6, 18, 30);
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={tuesdayEvening}
        userRole={VBT_ROLES.COORDINATOR}
      />
    );

    expect(html).toContain('Stage 4 of 6');
    expect(html).toContain('Meeting Day');
    expect(html).toContain('Open Attendance Scanner');
  });

  it('renders After Event phase on Saturday with recap call-to-action', () => {
    // 2026-10-10 12:00 is Saturday
    const saturday = new Date(2026, 9, 10, 12, 0);
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={saturday}
        userRole={VBT_ROLES.MEMBER}
      />
    );

    expect(html).toContain('Stage 5 of 6');
    expect(html).toContain('After Event');
    expect(html).toContain('Sat - Sun');
    expect(html).toContain('View Photo Gallery');
  });

  it('renders Next Cycle phase on Sunday night with next step recommendation', () => {
    // 2026-10-11 20:30 is Sunday night
    const sundayNight = new Date(2026, 9, 11, 20, 30);
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={sundayNight}
        userRole={VBT_ROLES.TRAINED_SERVANT}
      />
    );

    expect(html).toContain('Stage 6 of 6');
    expect(html).toContain('Next Cycle');
    expect(html).toContain('Sun night');
    expect(html).toContain('View Next Suggested Step');
  });

  it('extracts role from currentUserProfile when present', () => {
    const monday = new Date(2026, 9, 5, 10, 0);
    const profile = { role: VBT_ROLES.COORDINATOR, firstName: 'Mark' };
    const html = renderToString(
      <WeeklyRitualBanner
        currentDate={monday}
        currentUserProfile={profile}
      />
    );

    expect(html).toContain('Coordinator');
    expect(html).toContain('Review Service Agenda');
  });

  it('displays the 6-stage mini progress indicator dots', () => {
    const monday = new Date(2026, 9, 5, 10, 0);
    const html = renderToString(<WeeklyRitualBanner currentDate={monday} />);

    // Check title attribute for formatted summary
    expect(html).toContain('Stage 1 of 6: Early Week (Mon - Wed)');
  });
});
