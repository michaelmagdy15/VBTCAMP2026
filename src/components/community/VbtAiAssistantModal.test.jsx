import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import VbtAiAssistantModal from './VbtAiAssistantModal';
import { ROLE_TIERS } from '../../services/vbtAiAssistantService';

describe('VbtAiAssistantModal Component Suite', () => {
  const memberUser = {
    id: 'user_m1',
    displayName: 'Mark Shenouda',
    role: 'member',
  };

  const servantUser = {
    id: 'user_s1',
    displayName: 'David Hanna',
    role: 'servant',
  };

  const coordinatorUser = {
    id: 'user_c1',
    displayName: 'Peter Coordinator',
    role: 'coordinator',
  };

  const mockCommunityContext = {
    asOf: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    services: [
      {
        id: 'srv_1',
        title: 'Weekly Community Service & Youth Sports',
        serviceType: 'weekly_service',
        date: '2026-10-10',
        startTime: '18:30',
        location: { name: 'Main Sports Complex' },
      },
    ],
  };

  it('renders null when isOpen is false', () => {
    const html = renderToString(
      <VbtAiAssistantModal
        isOpen={false}
        onClose={() => {}}
        currentUser={memberUser}
        communityContext={mockCommunityContext}
      />
    );
    expect(html).toBe('');
  });

  it('renders modal dialog when isOpen is true with safety and freshness badges', () => {
    const html = renderToString(
      <VbtAiAssistantModal
        isOpen={true}
        onClose={() => {}}
        currentUser={memberUser}
        communityContext={mockCommunityContext}
      />
    );

    expect(html).toContain('VBT AI Assistant');
    expect(html).toContain('Member View');
    expect(html).toContain('Confidential Data Masked');
    expect(html).toContain('Data as of 5 minutes ago');
  });

  it('renders tailored role view badge for servant user', () => {
    const html = renderToString(
      <VbtAiAssistantModal
        isOpen={true}
        onClose={() => {}}
        currentUser={servantUser}
        communityContext={mockCommunityContext}
      />
    );

    expect(html).toContain('Servant View');
    // Servant suggested questions
    expect(html).toContain('What should I prepare for my station?');
    expect(html).toContain('What is my arrival time?');
    expect(html).toContain('Who is on my team?');
  });

  it('renders tailored role view badge and suggested questions for coordinator user', () => {
    const html = renderToString(
      <VbtAiAssistantModal
        isOpen={true}
        onClose={() => {}}
        currentUser={coordinatorUser}
        communityContext={mockCommunityContext}
      />
    );

    expect(html).toContain('Coordinator View');
    expect(html).toContain('Who is available Friday?');
    expect(html).toContain('Which roles are unfilled?');
    expect(html).toContain('Who has not confirmed?');
    expect(html).toContain('Draft a serving schedule recommendation');
  });

  it('renders member quick questions for member user', () => {
    const html = renderToString(
      <VbtAiAssistantModal
        isOpen={true}
        onClose={() => {}}
        currentUser={memberUser}
        communityContext={mockCommunityContext}
      />
    );

    expect(html).toContain('What am I serving in this week?');
    expect(html).toContain('When is the next meeting?');
    expect(html).toContain('Where do I check in?');
  });
});
