import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import NextActionCard from './NextActionCard';
import {
  PERSONA_STATES,
  computeNextAction,
  getPersonalizedSummary,
} from '../../services/nextActionService';

describe('NextActionCard Component', () => {
  const sampleVisitorAction = computeNextAction({
    personaState: PERSONA_STATES.NEW_VISITOR,
    activities: [{ title: 'Friday Night Basketball', date: '2026-10-16', startTime: '18:00' }],
  });

  const sampleServantAction = computeNextAction({
    personaState: PERSONA_STATES.ACTIVE_SERVANT,
    member: { id: 'serv_1' },
    assignments: [
      {
        id: 'asgn_101',
        roleTitle: 'Court A Referee',
        status: 'confirmed',
        startTime: '18:00',
        arrivalTime: '17:30',
        location: 'Upper Court',
        prepMaterial: 'Referee Rulebook 2026',
      },
    ],
  });

  const sampleLeaderAction = computeNextAction({
    personaState: PERSONA_STATES.LEADER,
    member: { id: 'lead_1', role: 'admin' },
    activities: [{ id: 'act_1', spotsRemaining: 4 }],
    assignments: [{ id: 'asgn_1', status: 'pending' }],
  });

  const sampleOfflineAction = computeNextAction({
    personaState: PERSONA_STATES.OFFLINE_USER,
    member: { id: 'off_1' },
  });

  it('renders null when action is null or undefined', () => {
    const html = renderToString(<NextActionCard action={null} />);
    expect(html).toBe('');
  });

  it('renders action from summary prop if provided', () => {
    const summary = getPersonalizedSummary({ member: null });
    const html = renderToString(<NextActionCard summary={summary} />);
    expect(html).toContain('Take Your First Step');
    expect(html).toContain('Join VBT Community');
  });

  it('renders correctly for NEW_VISITOR action', () => {
    const html = renderToString(<NextActionCard action={sampleVisitorAction} />);
    expect(html).toContain('New Visitor');
    expect(html).toContain('Take Your First Step');
    expect(html).toContain('Join VBT Community');
    expect(html).toContain('Explore Gathering Schedule');
    expect(html).toContain('1 Corinthians 16:14');
  });

  it('renders correctly for ACTIVE_SERVANT with arrival time and location', () => {
    const html = renderToString(<NextActionCard action={sampleServantAction} />);
    expect(html).toContain('Confirmed: Court A Referee');
    expect(html).toContain('Arrive: 17:30');
    expect(html).toContain('Upper Court');
    expect(html).toContain('View Station Prep Material');
    expect(html).toContain('Request Shift Replacement');
    expect(html).toContain('Colossians 3:23');
  });

  it('renders correctly for LEADER with unfilled roles and unconfirmed count', () => {
    const html = renderToString(<NextActionCard action={sampleLeaderAction} />);
    expect(html).toContain('Leadership Alert');
    expect(html).toContain('4 Spots Open');
    expect(html).toContain('1 To Confirm');
    expect(html).toContain('Manage Station Roster');
    expect(html).toContain('1 Peter 5:2');
  });

  it('renders correctly for OFFLINE_USER with offline badge and QR action', () => {
    const html = renderToString(<NextActionCard action={sampleOfflineAction} />);
    expect(html).toContain('Offline Mode');
    expect(html).toContain('Offline Ready');
    expect(html).toContain('Show Offline QR Code');
    expect(html).toContain('View Cached Schedule');
    expect(html).toContain('Psalm 145:18');
  });

  it('includes proper accessible ARIA attributes', () => {
    const html = renderToString(<NextActionCard action={sampleVisitorAction} />);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-label="Join VBT Community: Welcome to VBT Sports Camp! Take Your First Step"');
  });

  it('hides encouragement quote block in compact mode', () => {
    const regularHtml = renderToString(<NextActionCard action={sampleVisitorAction} compact={false} />);
    const compactHtml = renderToString(<NextActionCard action={sampleVisitorAction} compact={true} />);

    expect(regularHtml).toContain('next-action-encouragement');
    expect(compactHtml).not.toContain('next-action-encouragement');
  });
});
