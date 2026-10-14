import {
  PartyPopper,
  Cake,
  Trophy,
  Award,
} from 'lucide-react';

/**
 * Default fallback scripture for the week
 * Featuring 1 Corinthians 9:24 with Arabic translation and athlete mindset
 */
export const DEFAULT_SCRIPTURE = {
  id: 'verse-week-1',
  reference: '1 Corinthians 9:24',
  referenceAr: '١ كورنثوس ٩: ٢٤',
  textEn: 'Do you not know that in a race all the runners run, but only one receives the prize? So run that you may obtain it.',
  textAr: 'أَلَسْتُمْ تَعْلَمُونَ أَنَّ الَّذِينَ يَرْكُضُونَ فِي الْمَيْدَانِ جَمِيعُهُمْ يَرْكُضُونَ، وَلكِنَّ وَاحِدًا يَأْخُذُ الْجَعَالَةَ؟ هكَذَا ارْكُضُوا لِكَيْ تَنَالُوا.',
  tag: '#RunToWin',
  theme: 'Sportsmanship & Perseverance',
  reflection: 'Every drill, sprint, and encouraging word is an opportunity to honor God and build up your team with humility.',
};

/**
 * Default recent announcements published by coordinators
 */
export const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'Friday Sports Night & Court Worship Under the Lights',
    summary: 'Join us this Friday at 6:30 PM for tournament bracket warmups, basketball, volleyball, and outdoor worship fellowship. Bring your team jersey!',
    date: 'This Friday • 6:30 PM',
    category: 'Gathering',
    publishedBy: 'Coordinators Team',
    pinned: true,
  },
  {
    id: 'ann-2',
    title: 'Camp Jersey & Hydration Station Distribution',
    summary: 'Official 2026 season jerseys and sports bottles are available at the welcome desk before Friday drills begin.',
    date: 'Thursday • 5:00 PM',
    category: 'Equipment',
    publishedBy: 'Logistics Crew',
    pinned: false,
  },
];

/**
 * Default new members welcomed this week
 */
export const DEFAULT_NEW_MEMBERS = [
  {
    id: 'nm-1',
    firstName: 'Mark',
    initials: 'MT',
    badge: 'New Teammate 🏀',
    joinedText: 'Joined 2 days ago',
  },
  {
    id: 'nm-2',
    firstName: 'Sarah',
    initials: 'SL',
    badge: 'Welcomed with Joy ✨',
    joinedText: 'Joined yesterday',
  },
  {
    id: 'nm-3',
    firstName: 'Daniel',
    initials: 'DK',
    badge: 'First Season 🎉',
    joinedText: 'Joined this week',
  },
  {
    id: 'nm-4',
    firstName: 'Chloe',
    initials: 'CA',
    badge: 'Welcome Sister 🕊️',
    joinedText: 'Joined this week',
  },
];

/**
 * Default upcoming birthdays & celebrations
 */
export const DEFAULT_CELEBRATIONS = [
  {
    id: 'cel-1',
    firstName: 'Fadi',
    type: 'birthday',
    date: 'Tomorrow, Oct 8',
    icon: 'birthday',
    label: '16th Birthday 🎂',
    note: 'Blessings on your new year!',
  },
  {
    id: 'cel-2',
    firstName: 'Marina',
    type: 'anniversary',
    date: 'Friday, Oct 10',
    icon: 'trophy',
    label: '2nd Camp Anniversary 🏆',
    note: 'Faithful volleyball teammate!',
  },
  {
    id: 'cel-3',
    firstName: 'Youssef',
    type: 'birthday',
    date: 'Sunday, Oct 12',
    icon: 'party',
    label: 'Birthday Blessings 🎈',
    note: 'Wishing you joy and grace!',
  },
];

/**
 * Default safe moderated prayers & praises
 */
export const DEFAULT_PRAYERS = [
  {
    id: 'pr-1',
    authorFirstName: 'David',
    isAnonymous: false,
    content: 'Praying for swift ankle recovery after Friday basketball scrimmage so I can return to the court safely with peace.',
    amenCount: 18,
    tag: 'Healing & Strength',
    isModerated: true,
  },
  {
    id: 'pr-2',
    authorFirstName: 'Community Prayer',
    isAnonymous: true,
    content: 'Thankful for answered prayers during midterm exam week and asking for traveling peace for all youth heading to camp.',
    amenCount: 24,
    tag: 'Praise & Thanksgiving',
    isModerated: true,
  },
];

/**
 * Sanitizes prayer content by removing telephone numbers and emails to protect privacy
 * @param {string} text
 * @returns {string}
 */
export function sanitizePrayerContent(text) {
  if (!text || typeof text !== 'string') return '';
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

  return text
    .replace(emailRegex, '[contact hidden]')
    .replace(phoneRegex, '[phone hidden]')
    .trim();
}

/**
 * Extracts strictly first name or friendly display token for safety & warmth
 * @param {string} fullName
 * @param {boolean} [isAnonymous=false]
 * @returns {string}
 */
export function getFirstNameOnly(fullName, isAnonymous = false) {
  if (isAnonymous) return 'Community Member';
  if (!fullName || typeof fullName !== 'string') return 'Fellow Teammate';
  const clean = fullName.trim();
  if (!clean) return 'Fellow Teammate';
  const parts = clean.split(/\s+/);
  return parts[0] || 'Fellow Teammate';
}

/**
 * Generates 1-2 initials from a name string or object
 * @param {string|object} nameInput
 * @returns {string}
 */
export function getMemberInitials(nameInput) {
  if (!nameInput) return 'V';
  if (typeof nameInput === 'object') {
    const fn = (nameInput.firstName || '').trim();
    const ln = (nameInput.lastName || '').trim();
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
    if (fn) return fn.slice(0, 2).toUpperCase();
    if (nameInput.name) return getMemberInitials(nameInput.name);
    return 'V';
  }
  const clean = String(nameInput).trim();
  if (!clean) return 'V';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Maps category names to subtle warm badge styling
 * @param {string} category
 * @returns {{ bg: string, text: string, border: string }}
 */
export function getCategoryBadgeStyle(category = '') {
  const norm = String(category).toLowerCase();
  if (norm.includes('sport') || norm.includes('tournament') || norm.includes('game') || norm.includes('practice')) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' };
  }
  if (norm.includes('gather') || norm.includes('night') || norm.includes('fellowship')) {
    return { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' };
  }
  if (norm.includes('ministry') || norm.includes('servant') || norm.includes('leadership')) {
    return { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' };
  }
  if (norm.includes('equip') || norm.includes('gear') || norm.includes('logistics')) {
    return { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' };
  }
  if (norm.includes('important') || norm.includes('urgent') || norm.includes('safety')) {
    return { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' };
  }
  return { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' };
}

/**
 * Maps celebration type or string to icon
 * @param {string} iconKey
 * @returns {React.Component}
 */
export function getCelebrationIcon(iconKey = '') {
  const norm = String(iconKey).toLowerCase();
  if (norm.includes('birth') || norm.includes('cake')) return Cake;
  if (norm.includes('trophy') || norm.includes('milestone')) return Trophy;
  if (norm.includes('award')) return Award;
  return PartyPopper;
}
