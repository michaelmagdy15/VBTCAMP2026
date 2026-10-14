import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import CommunityMemoryWall, {
  formatMemoryDate,
  CATEGORY_STYLES,
} from './CommunityMemoryWall';
import { MEMORY_CATEGORIES } from '../../services/memoryStoryService';

// Mock the service functions called by CommunityMemoryWall
vi.mock('../../services/memoryStoryService', async () => {
  const actual = await vi.importActual('../../services/memoryStoryService');
  return {
    ...actual,
    getApprovedMemories: vi.fn(async () => [
      {
        id: 'mem_sample_1',
        title: 'Camp 2024 Fellowship Night',
        description: 'Over 200 youths gathered for prayer and fellowship.',
        category: actual.MEMORY_CATEGORIES.CAMP_SEASONS,
        year: 2024,
        season: 'Summer 2024',
        eventDate: '2024-07-15T18:00:00Z',
        imageUrl: 'https://example.com/camp.jpg',
        tags: ['camp', 'fellowship'],
        consentGiven: true,
        authorName: 'Mina Boulos',
      },
      {
        id: 'mem_sample_2',
        title: 'Volleyball Championship 2025',
        description: 'St. George Titans win the tournament.',
        category: actual.MEMORY_CATEGORIES.TOURNAMENTS,
        year: 2025,
        season: 'Spring 2025',
        eventDate: '2025-04-20T16:00:00Z',
        championTeam: 'St. George Titans',
        consentGiven: true,
        authorName: 'Coach Mark',
      },
    ]),
    getThisWeekInHistory: vi.fn(async () => [
      {
        id: 'tb_1',
        title: '1 Year Ago: Cup Final Thriller',
        description: 'Exciting championship volleyball finals.',
        category: actual.MEMORY_CATEGORIES.TOURNAMENTS,
        eventDate: '2025-10-07T14:00:00Z',
        yearsAgo: 1,
        anniversaryBadge: '1st Anniversary',
        throwbackHeadline: '1 Year Ago This Week (2025)',
        championTeam: 'St. George Titans',
        consentGiven: true,
      },
    ]),
    getCommunityImpactStats: vi.fn(async () => ({
      mealsShared: 1420,
      youthCoached: 385,
      prayersLifted: 960,
      campsOrganized: 8,
      hoursVolunteered: 2450,
    })),
    getMemberPersonalHistory: vi.fn(async (_commId, memberId) => ({
      authorized: true,
      memberId,
      displayName: 'David Shenouda',
      attendanceCount: 42,
      servingCount: 18,
      yearsOfService: 2,
      servantAnniversary: {
        years: 2,
        title: '2 Years of Faithful Service',
        nextMilestone: '3 Year Milestone',
      },
      milestones: [
        {
          id: 'ms_1',
          title: '2 Years of Faithful Service',
          description: 'Faithfully served in VBT Sports Camp.',
        },
      ],
      privacyNotice: 'Sensitive personal attendance and serving counts are kept strictly confidential.',
    })),
  };
});

describe('CommunityMemoryWall Component Suite', () => {
  describe('Helper: formatMemoryDate', () => {
    it('formats valid ISO date strings to human-readable format', () => {
      const formatted = formatMemoryDate('2025-10-07T12:00:00Z');
      expect(formatted).toContain('2025');
      expect(formatted).toContain('Oct');
    });

    it('returns empty string on empty input', () => {
      expect(formatMemoryDate('')).toBe('');
      expect(formatMemoryDate(null)).toBe('');
    });
  });

  describe('Category Visual Styles', () => {
    it('defines styles for all supported memory categories', () => {
      Object.values(MEMORY_CATEGORIES).forEach((cat) => {
        const style = CATEGORY_STYLES[cat];
        expect(style).toBeDefined();
        expect(style.label).toBeDefined();
        expect(style.color).toBeDefined();
        expect(style.icon).toBeDefined();
      });
    });
  });

  describe('Component Rendering', () => {
    it('renders header, title, and primary action buttons', () => {
      const html = renderToString(
        <CommunityMemoryWall
          communityId="vbt_main"
          currentUser={{ id: 'usr_david', displayName: 'David Shenouda', role: 'servant' }}
        />
      );

      expect(html).toContain('Community Story Wall');
      expect(html).toContain('VBT Memory &amp; Fellowship Archive');
      expect(html).toContain('Submit Memory / Photo');
      expect(html).toContain('My Faithful Journey');
    });

    it('renders search input and category filter buttons', () => {
      const html = renderToString(
        <CommunityMemoryWall communityId="vbt_main" />
      );

      expect(html).toContain('Search memories, champions, servants, or tags...');
      expect(html).toContain('All Archive');
      expect(html).toContain('Camp Seasons');
      expect(html).toContain('Tournaments &amp; Champions');
      expect(html).toContain('Photo Highlights');
      expect(html).toContain('Testimonies &amp; Grace');
      expect(html).toContain('Servant Anniversaries');
    });

    it('renders initial loading state gracefully', () => {
      const html = renderToString(
        <CommunityMemoryWall communityId="vbt_main" />
      );

      expect(html).toContain('Opening fellowship archives...');
    });
  });
});
