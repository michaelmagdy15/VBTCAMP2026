import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import CommunityPulse, { CommunityPulse as NamedCommunityPulse } from './CommunityPulse';
import {
  DEFAULT_SCRIPTURE,
  DEFAULT_ANNOUNCEMENTS,
  DEFAULT_NEW_MEMBERS,
  DEFAULT_CELEBRATIONS,
  DEFAULT_PRAYERS,
  sanitizePrayerContent,
  getFirstNameOnly,
  getMemberInitials,
  getCategoryBadgeStyle,
  getCelebrationIcon,
} from './communityPulseUtils';

describe('CommunityPulse Component & Logic Suite', () => {
  // ────────────────────────────────────────────────────────────
  // 1. PURE HELPER & DOMAIN LOGIC TESTS
  // ────────────────────────────────────────────────────────────
  describe('Helper: sanitizePrayerContent', () => {
    it('strips phone numbers from prayer content', () => {
      const raw = 'Please pray for David at +1 555-123-4567 before his surgery.';
      const cleaned = sanitizePrayerContent(raw);
      expect(cleaned).not.toContain('555-123-4567');
      expect(cleaned).toContain('[phone hidden]');
    });

    it('strips email addresses from prayer content', () => {
      const raw = 'Reach out to servant.mark@vbtcamp.org if you need transport.';
      const cleaned = sanitizePrayerContent(raw);
      expect(cleaned).not.toContain('servant.mark@vbtcamp.org');
      expect(cleaned).toContain('[contact hidden]');
    });

    it('retains inspirational prayer text intact', () => {
      const pure = 'Praying for team unity, peace, and perseverance in tournament finals.';
      expect(sanitizePrayerContent(pure)).toBe(pure);
    });

    it('handles null, undefined, and non-string inputs safely', () => {
      expect(sanitizePrayerContent(null)).toBe('');
      expect(sanitizePrayerContent(undefined)).toBe('');
      expect(sanitizePrayerContent(12345)).toBe('');
    });
  });

  describe('Helper: getFirstNameOnly', () => {
    it('extracts first name token from full name', () => {
      expect(getFirstNameOnly('Mark Tawadros')).toBe('Mark');
      expect(getFirstNameOnly('Sarah Luka')).toBe('Sarah');
    });

    it('returns "Community Member" when isAnonymous is true', () => {
      expect(getFirstNameOnly('Daniel Shenouda', true)).toBe('Community Member');
      expect(getFirstNameOnly('', true)).toBe('Community Member');
    });

    it('handles single token names', () => {
      expect(getFirstNameOnly('Youssef')).toBe('Youssef');
    });

    it('falls back to "Fellow Teammate" when name is empty or invalid', () => {
      expect(getFirstNameOnly('')).toBe('Fellow Teammate');
      expect(getFirstNameOnly(null)).toBe('Fellow Teammate');
      expect(getFirstNameOnly(undefined)).toBe('Fellow Teammate');
    });
  });

  describe('Helper: getMemberInitials', () => {
    it('extracts two initials from string with two words', () => {
      expect(getMemberInitials('Mark Tawadros')).toBe('MT');
      expect(getMemberInitials('Sarah Luka')).toBe('SL');
    });

    it('extracts two characters from single word string', () => {
      expect(getMemberInitials('Chloe')).toBe('CH');
    });

    it('extracts initials from object with firstName and lastName', () => {
      expect(getMemberInitials({ firstName: 'Fadi', lastName: 'Gendy' })).toBe('FG');
    });

    it('falls back to "V" for missing or invalid inputs', () => {
      expect(getMemberInitials('')).toBe('V');
      expect(getMemberInitials(null)).toBe('V');
    });
  });

  describe('Helper: getCategoryBadgeStyle', () => {
    it('returns emerald style for gathering/fellowship categories', () => {
      const style = getCategoryBadgeStyle('Gathering');
      expect(style.bg).toContain('emerald');
      expect(style.text).toContain('emerald');
    });

    it('returns amber style for sports/tournament categories', () => {
      const style = getCategoryBadgeStyle('Sports Night');
      expect(style.bg).toContain('amber');
      expect(style.text).toContain('amber');
    });

    it('returns purple style for ministry/leadership categories', () => {
      const style = getCategoryBadgeStyle('Servant Ministry');
      expect(style.bg).toContain('purple');
      expect(style.text).toContain('purple');
    });

    it('returns cyan style for equipment/logistics categories', () => {
      const style = getCategoryBadgeStyle('Equipment');
      expect(style.bg).toContain('cyan');
      expect(style.text).toContain('cyan');
    });

    it('returns rose style for urgent/important categories', () => {
      const style = getCategoryBadgeStyle('Important');
      expect(style.bg).toContain('rose');
      expect(style.text).toContain('rose');
    });
  });

  describe('Helper: getCelebrationIcon', () => {
    it('resolves birthday icon', () => {
      const icon = getCelebrationIcon('birthday');
      expect(icon).toBeDefined();
    });

    it('resolves milestone trophy icon', () => {
      const icon = getCelebrationIcon('milestone');
      expect(icon).toBeDefined();
    });

    it('resolves default party icon for other events', () => {
      const icon = getCelebrationIcon('general');
      expect(icon).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────
  // 2. COMPONENT RENDERING & DEFAULT FALLBACKS
  describe('CommunityPulse: Default Fallback Rendering', () => {
    it('exports named CommunityPulse matching default export and well-formed default datasets', () => {
      expect(NamedCommunityPulse).toBe(CommunityPulse);
      expect(DEFAULT_SCRIPTURE.reference).toBe('1 Corinthians 9:24');
      expect(DEFAULT_SCRIPTURE.tag).toBe('#RunToWin');
      expect(Array.isArray(DEFAULT_ANNOUNCEMENTS)).toBe(true);
      expect(DEFAULT_ANNOUNCEMENTS.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(DEFAULT_NEW_MEMBERS)).toBe(true);
      expect(DEFAULT_NEW_MEMBERS.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(DEFAULT_CELEBRATIONS)).toBe(true);
      expect(DEFAULT_CELEBRATIONS.length).toBeGreaterThanOrEqual(3);
      expect(Array.isArray(DEFAULT_PRAYERS)).toBe(true);
      expect(DEFAULT_PRAYERS.length).toBeGreaterThanOrEqual(2);
    });

    it('renders community pulse section successfully with defaults', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('Community Pulse');
      expect(html).toContain('نبض المجتمع');
      expect(html).toContain('Spiritual encouragement');
    });

    it('renders default scripture card with 1 Corinthians 9:24 and #RunToWin', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('Verse of the Week');
      expect(html).toContain('1 Corinthians 9:24');
      expect(html).toContain('#RunToWin');
      expect(html).toContain('Do you not know that in a race');
      expect(html).toContain('أَلَسْتُمْ تَعْلَمُونَ');
    });

    it('renders default announcements with coordinator attribution', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('Community Announcements');
      expect(html).toContain('Friday Sports Night &amp; Court Worship Under the Lights');
      expect(html).toContain('Published by coordinators &amp; servants');
      expect(html).toContain('Coordinators Team');
    });

    it('renders default welcomed new members with initials and badges', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('Welcomed This Week');
      expect(html).toContain('Mark');
      expect(html).toContain('MT');
      expect(html).toContain('New Teammate 🏀');
      expect(html).toContain('Sarah');
      expect(html).toContain('SL');
    });

    it('renders default celebrations with birthdays and dates', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('Birthdays &amp; Celebrations');
      expect(html).toContain('Fadi');
      expect(html).toContain('Tomorrow, Oct 8');
      expect(html).toContain('16th Birthday 🎂');
      expect(html).toContain('Marina');
      expect(html).toContain('2nd Camp Anniversary 🏆');
    });

    it('renders default moderated prayers with Safe & Moderated badge and Amen counter', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('Prayer &amp; Testimony Preview');
      expect(html).toContain('Safe &amp; Moderated');
      expect(html).toContain('David');
      expect(html).toContain('Praying for swift ankle recovery');
      expect(html).toContain('Amen');
      expect(html).toContain('(18)');
    });

    it('does not display offline indicator by default', () => {
      const html = renderToString(<CommunityPulse isOffline={false} />);
      expect(html).not.toContain('data-testid="offline-indicator"');
    });
  });

  // ────────────────────────────────────────────────────────────
  // 3. CUSTOM PROPS INJECTION
  // ────────────────────────────────────────────────────────────
  describe('CommunityPulse: Custom Props Handling', () => {
    it('renders custom scripture with Arabic and English verses and tags', () => {
      const customScripture = {
        reference: 'Colossians 3:23',
        referenceAr: 'كولوسي ٣: ٢٣',
        textEn: 'Whatever you do, work heartily, as for the Lord and not for men.',
        textAr: 'وكل ما فعلتم فاعملوا من القلب، كما للرب ليس للناس.',
        tag: '#WholeheartedService',
        theme: 'Wholehearted Devotion',
        reflection: 'Serve with your whole heart on every drill.',
      };

      const html = renderToString(<CommunityPulse scripture={customScripture} />);
      expect(html).toContain('Colossians 3:23');
      expect(html).toContain('#WholeheartedService');
      expect(html).toContain('Whatever you do, work heartily');
      expect(html).toContain('وكل ما فعلتم فاعملوا من القلب');
    });

    it('renders custom announcements with custom categories', () => {
      const customAnnouncements = [
        {
          id: 'custom-1',
          title: 'Emergency Storm Schedule Update',
          summary: 'All court matches moved into Main Gymnasium.',
          date: 'Tonight • 7:00 PM',
          category: 'Important',
          publishedBy: 'Director Michael',
        },
      ];

      const html = renderToString(<CommunityPulse announcements={customAnnouncements} />);
      expect(html).toContain('Emergency Storm Schedule Update');
      expect(html).toContain('Director Michael');
      expect(html).toContain('Important');
      expect(html).not.toContain('Camp Jersey &amp; Hydration Station');
    });

    it('renders custom new members', () => {
      const customMembers = [
        {
          id: 'cm-1',
          firstName: 'Kirollos',
          initials: 'KR',
          badge: 'Goalkeeper ⚽',
          joinedText: 'Joined today',
        },
      ];

      const html = renderToString(<CommunityPulse newMembers={customMembers} />);
      expect(html).toContain('Kirollos');
      expect(html).toContain('KR');
      expect(html).toContain('Goalkeeper ⚽');
      expect(html).toContain('1 New');
    });

    it('renders custom celebrations', () => {
      const customCelebrations = [
        {
          id: 'cc-1',
          firstName: 'Bishoy',
          type: 'birthday',
          date: 'Next Tuesday',
          label: '18th Milestone 🎂',
          note: 'Senior year celebration',
        },
      ];

      const html = renderToString(<CommunityPulse celebrations={customCelebrations} />);
      expect(html).toContain('Bishoy');
      expect(html).toContain('Next Tuesday');
      expect(html).toContain('18th Milestone 🎂');
    });

    it('renders custom prayers and masks private contact details', () => {
      const customPrayers = [
        {
          id: 'cp-1',
          authorFirstName: 'Peter',
          isAnonymous: false,
          content: 'Pray for my exam. Call me at 555-432-1098 or email me at peter@example.com for study group.',
          amenCount: 7,
          tag: 'Studies & Wisdom',
          isModerated: true,
        },
      ];

      const html = renderToString(<CommunityPulse prayers={customPrayers} />);
      expect(html).toContain('Peter');
      expect(html).toContain('Studies &amp; Wisdom');
      expect(html).toContain('[phone hidden]');
      expect(html).toContain('[contact hidden]');
      expect(html).not.toContain('555-432-1098');
      expect(html).not.toContain('peter@example.com');
      expect(html).toContain('(7)');
    });

    it('renders anonymous prayer safely without author name', () => {
      const customPrayers = [
        {
          id: 'cp-anon',
          authorFirstName: 'Secret Member',
          isAnonymous: true,
          content: 'Confidential praise for physical recovery.',
          amenCount: 30,
          isModerated: true,
        },
      ];

      const html = renderToString(<CommunityPulse prayers={customPrayers} />);
      expect(html).toContain('Community Member');
      expect(html).toContain('Anonymous');
      expect(html).not.toContain('Secret Member');
    });

    it('applies custom className to section container', () => {
      const html = renderToString(<CommunityPulse className="vbt-custom-pulse-class" />);
      expect(html).toContain('vbt-custom-pulse-class');
    });
  });

  // ────────────────────────────────────────────────────────────
  // 4. EMPTY STATES
  // ────────────────────────────────────────────────────────────
  describe('CommunityPulse: Empty States Handling', () => {
    it('renders empty state when announcements array is empty', () => {
      const html = renderToString(
        <CommunityPulse
          announcements={[]}
          onOpenAnnouncements={vi.fn()}
        />
      );
      expect(html).toContain('data-testid="announcements-empty-state"');
      expect(html).toContain('All caught up!');
      expect(html).toContain('View Announcement Archive');
    });

    it('renders empty state when newMembers array is empty', () => {
      const html = renderToString(<CommunityPulse newMembers={[]} />);
      expect(html).toContain('data-testid="new-members-empty-state"');
      expect(html).toContain('Our family is always open!');
      expect(html).toContain('0 New');
    });

    it('renders empty state when celebrations array is empty', () => {
      const html = renderToString(<CommunityPulse celebrations={[]} />);
      expect(html).toContain('data-testid="celebrations-empty-state"');
      expect(html).toContain('No birthdays scheduled this week');
    });

    it('renders empty state when prayers array is empty', () => {
      const html = renderToString(
        <CommunityPulse
          prayers={[]}
          onOpenPrayerWall={vi.fn()}
        />
      );
      expect(html).toContain('data-testid="prayers-empty-state"');
      expect(html).toContain('No prayer requests posted yet');
      expect(html).toContain('Share Prayer on Wall');
    });

    it('handles null scripture gracefully without crashing', () => {
      const html = renderToString(<CommunityPulse scripture={null} />);
      expect(html).toContain('Community Pulse');
      expect(html).not.toContain('data-testid="verse-of-week-card"');
    });
  });

  // ────────────────────────────────────────────────────────────
  // 5. OFFLINE & OUTDOOR CONTRAST FEATURES
  // ────────────────────────────────────────────────────────────
  describe('CommunityPulse: Offline & Outdoor View Support', () => {
    it('renders offline indicator when isOffline is true', () => {
      const html = renderToString(<CommunityPulse isOffline={true} />);
      expect(html).toContain('data-testid="offline-indicator"');
      expect(html).toContain('Offline Mode');
    });

    it('renders outdoor contrast toggle button', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('data-testid="outdoor-contrast-toggle"');
      expect(html).toContain('Outdoor View');
    });

    it('renders copy scripture button and language switchers', () => {
      const html = renderToString(<CommunityPulse />);
      expect(html).toContain('data-testid="copy-scripture-btn"');
      expect(html).toContain('data-testid="language-toggle-group"');
      expect(html).toContain('data-testid="lang-toggle-both"');
      expect(html).toContain('data-testid="lang-toggle-en"');
      expect(html).toContain('data-testid="lang-toggle-ar"');
    });

    it('renders CTAs when onOpenAnnouncements and onOpenPrayerWall handlers provided', () => {
      const onAnnouncements = vi.fn();
      const onPrayerWall = vi.fn();

      const html = renderToString(
        <CommunityPulse
          onOpenAnnouncements={onAnnouncements}
          onOpenPrayerWall={onPrayerWall}
        />
      );

      expect(html).toContain('data-testid="view-all-announcements-btn"');
      expect(html).toContain('data-testid="open-prayer-wall-btn"');
    });
  });
});
