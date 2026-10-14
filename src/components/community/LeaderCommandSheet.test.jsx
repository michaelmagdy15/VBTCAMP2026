import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import LeaderCommandSheet, { buildServantBriefingText } from './LeaderCommandSheet';

describe('LeaderCommandSheet & Briefing Builder Suite', () => {
  const mockActivity = {
    id: 'july6',
    eventCode: 'july6',
    title: 'VBT Service — Ard el Golf',
    date: '2026-07-06',
    time: '8:00 PM',
    location: { name: 'Ard el Golf Church' },
  };

  const mockScripture = {
    reference: 'Colossians 3:23',
    textEn: 'Whatever you do, work heartily, as for the Lord and not for men.',
    textAr: 'وَكُلُّ مَا فَعَلْتُمْ، فَاعْمَلُوا مِنَ الْقَلْبِ، كَمَا لِلرَّبِّ لَيْسَ لِلنَّاسِ.',
  };

  const mockUser = {
    id: 'michael_mitry',
    name: 'Michael Mitry',
    role: 'coordinator',
  };

  it('returns null when isOpen is false', () => {
    const html = renderToString(<LeaderCommandSheet isOpen={false} />);
    expect(html).toBe('');
  });

  it('renders the Live On-Court tab by default with scannable Door QR and room code', () => {
    const html = renderToString(
      <LeaderCommandSheet
        isOpen={true}
        initialTab="live"
        currentUser={mockUser}
        activeActivity={mockActivity}
        scripture={mockScripture}
      />
    );

    expect(html).toContain('Servant &amp; Leader Command Hub');
    expect(html).toContain('Door Check-In &amp; Auto-Assign QR');
    expect(html).toContain('VBT Service — Ard el Golf');
    expect(html).toContain('Code: july6');
    expect(html).toContain('Enter Live Scoreboard &amp; Radio');
    expect(html).toContain('print-door-qr-poster-btn');
    expect(html).toContain('Print Door Poster');
  });

  it('renders the Prep & Plan tab when initialTab="prep"', () => {
    const html = renderToString(
      <LeaderCommandSheet
        isOpen={true}
        initialTab="prep"
        currentUser={mockUser}
        activeActivity={mockActivity}
        onCreateNewEvent={vi.fn()}
      />
    );

    expect(html).toContain('Launch or Clone Next Friday');
    expect(html).toContain('Tuesday Meeting Mode');
    expect(html).toContain('Smart Station Assigner');
    expect(html).toContain('AI Game &amp; Lesson Helper');
    expect(html).toContain('My Servant Passport');
  });

  it('renders the Share & Care tab with 3-Day WhatsApp Launch Campaign templates when initialTab="care"', () => {
    const html = renderToString(
      <LeaderCommandSheet
        isOpen={true}
        initialTab="care"
        currentUser={mockUser}
        activeActivity={mockActivity}
        scripture={mockScripture}
      />
    );

    expect(html).toContain('1-Tap Servant Group Briefing &amp; Launch Kit');
    expect(html).toContain('campaign-tpl-tuesday');
    expect(html).toContain('campaign-tpl-thursday');
    expect(html).toContain('campaign-tpl-friday');
    expect(html).toContain('Send to WhatsApp Group');
    expect(html).toContain('Copy Briefing Text');
    expect(html).toContain('Pastoral Care &amp; Absent Follow-Up');
    expect(html).toContain('Colossians 3:23');
  });

  it('builds a complete bilingual servant briefing text with event code and check-in URL', () => {
    const text = buildServantBriefingText({
      communityName: 'Value Blessings Team',
      activeActivity: mockActivity,
      scripture: mockScripture,
      currentUser: mockUser,
      eventCode: 'july6',
      templateType: 'friday_briefing',
    });

    expect(text).toContain('Value Blessings Team — Servant Briefing');
    expect(text).toContain('VBT Service — Ard el Golf');
    expect(text).toContain('Ard el Golf Church');
    expect(text).toContain('july6');
    expect(text).toContain('Michael Mitry (COORDINATOR)');
    expect(text).toContain('Colossians 3:23');
    expect(text).toContain('event=july6&checkin=1');
  });

  it('builds Tuesday Station Call and Thursday 24h Roll Call campaign templates with deep links', () => {
    const tuesdayText = buildServantBriefingText({
      communityName: 'Value Blessings Team',
      activeActivity: mockActivity,
      scripture: mockScripture,
      currentUser: mockUser,
      eventCode: 'july6',
      templateType: 'tuesday_serve',
    });

    expect(tuesdayText).toContain('Tuesday Planning & Station Sign-Up');
    expect(tuesdayText).toContain('?serve=1');

    const thursdayText = buildServantBriefingText({
      communityName: 'Value Blessings Team',
      activeActivity: mockActivity,
      scripture: mockScripture,
      currentUser: mockUser,
      eventCode: 'july6',
      templateType: 'thursday_rsvp',
    });

    expect(thursdayText).toContain('24-Hour Friday Roll Call');
    expect(thursdayText).toContain('?rsvp=friday');
  });
});


