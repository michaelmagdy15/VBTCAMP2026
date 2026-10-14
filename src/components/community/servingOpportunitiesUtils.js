import {
  Award,
  Users,
  Sparkles,
  ShieldCheck,
  HandHeart,
  HeartHandshake,
} from 'lucide-react';

/**
 * Standard Member Serving States
 */
export const MEMBER_SERVING_STATES = {
  NOT_APPLIED: 'not_applied',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DECLINED: 'declined',
  REPLACEMENT_NEEDED: 'replacement_needed',
};

/**
 * Resolves the member's relationship/application state for a serving opportunity
 *
 * @param {Object} opportunity
 * @param {Object} [currentUser]
 * @returns {string} One of MEMBER_SERVING_STATES
 */
export function resolveMemberServingState(opportunity, currentUser) {
  if (!opportunity) return MEMBER_SERVING_STATES.NOT_APPLIED;

  // Direct state/status on the opportunity object
  const directState = (
    opportunity.currentMemberState ||
    opportunity.memberState ||
    opportunity.memberStatus ||
    opportunity.applicationStatus ||
    opportunity.userState ||
    ''
  ).toLowerCase().trim();

  if (directState) {
    if (directState === 'pending' || directState === 'applied') {
      return MEMBER_SERVING_STATES.PENDING;
    }
    if (
      directState === 'confirmed' ||
      directState === 'approved' ||
      directState === 'scheduled' ||
      directState === 'assigned'
    ) {
      return MEMBER_SERVING_STATES.CONFIRMED;
    }
    if (directState === 'declined' || directState === 'rejected') {
      return MEMBER_SERVING_STATES.DECLINED;
    }
    if (
      directState === 'replacement_needed' ||
      directState === 'replacement_requested' ||
      directState === 'sub_needed'
    ) {
      return MEMBER_SERVING_STATES.REPLACEMENT_NEEDED;
    }
    if (directState === 'not_applied' || directState === 'none') {
      return MEMBER_SERVING_STATES.NOT_APPLIED;
    }
  }

  // Look through opportunity applications array if currentUser is provided
  if (currentUser && Array.isArray(opportunity.applications)) {
    const userId = currentUser.uid || currentUser.id || currentUser.memberId;
    if (userId) {
      const match = opportunity.applications.find(
        (app) =>
          app.memberId === userId ||
          app.userId === userId ||
          app.id === userId ||
          app.member?.id === userId
      );

      if (match) {
        const appStatus = (match.status || '').toLowerCase();
        if (appStatus === 'approved' || appStatus === 'confirmed') {
          return MEMBER_SERVING_STATES.CONFIRMED;
        }
        if (appStatus === 'pending') {
          return MEMBER_SERVING_STATES.PENDING;
        }
        if (appStatus === 'declined' || appStatus === 'rejected') {
          return MEMBER_SERVING_STATES.DECLINED;
        }
        if (appStatus === 'replacement_requested' || appStatus === 'replacement_needed') {
          return MEMBER_SERVING_STATES.REPLACEMENT_NEEDED;
        }
      }
    }
  }

  return MEMBER_SERVING_STATES.NOT_APPLIED;
}

/**
 * Extracts and formats the role needed, along with role-specific icon & badge details
 *
 * @param {Object} opportunity
 * @returns {{ roleTitle: string, icon: React.ComponentType, category: string }}
 */
export function getRoleDisplayInfo(opportunity) {
  const rawRole =
    opportunity?.roleNeeded ||
    opportunity?.roleTitle ||
    opportunity?.title ||
    opportunity?.role ||
    'Volunteer Servant';

  const lower = String(rawRole).toLowerCase();

  if (lower.includes('referee') || lower.includes('official')) {
    return {
      roleTitle: rawRole,
      icon: Award,
      category: 'Athletics & Officiating',
    };
  }

  if (lower.includes('station') || lower.includes('leader') || lower.includes('coach')) {
    return {
      roleTitle: rawRole,
      icon: Users,
      category: 'Youth Leadership',
    };
  }

  if (lower.includes('media') || lower.includes('audio') || lower.includes('sound') || lower.includes('av')) {
    return {
      roleTitle: rawRole,
      icon: Sparkles,
      category: 'Audio / Visual Production',
    };
  }

  if (lower.includes('first aid') || lower.includes('medic') || lower.includes('care')) {
    return {
      roleTitle: rawRole,
      icon: ShieldCheck,
      category: 'Health & Participant Care',
    };
  }

  if (lower.includes('praise') || lower.includes('worship') || lower.includes('music')) {
    return {
      roleTitle: rawRole,
      icon: HandHeart,
      category: 'Spiritual Ministry',
    };
  }

  if (lower.includes('logistics') || lower.includes('setup') || lower.includes('hospitality')) {
    return {
      roleTitle: rawRole,
      icon: HeartHandshake,
      category: 'Camp Operations',
    };
  }

  return {
    roleTitle: rawRole,
    icon: HandHeart,
    category: 'Community Service',
  };
}

/**
 * Formats date and time into a friendly string, e.g. "Friday · 6:30 PM"
 *
 * @param {Object} opportunity
 * @returns {string}
 */
export function formatServingDateTime(opportunity) {
  if (!opportunity) return 'Date & Time TBA';

  if (opportunity.dateTime) return String(opportunity.dateTime);
  if (opportunity.formattedDate && opportunity.formattedTime) {
    return `${opportunity.formattedDate} · ${opportunity.formattedTime}`;
  }

  const dateVal = opportunity.serviceDate || opportunity.date;
  const timeVal = opportunity.startTime || opportunity.time || '6:30 PM';

  // Format the time portion
  const formatTime = (t) => {
    if (!t) return '6:30 PM';
    if (t.includes('AM') || t.includes('PM')) return t;
    const parts = t.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };

  const formattedTime = formatTime(timeVal);

  if (!dateVal) return `Upcoming · ${formattedTime}`;

  let d;
  if (typeof dateVal?.toDate === 'function') {
    d = dateVal.toDate();
  } else if (dateVal?.seconds) {
    d = new Date(dateVal.seconds * 1000);
  } else if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, day] = dateVal.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(dateVal);
  }

  if (isNaN(d.getTime())) {
    return `${dateVal} · ${formattedTime}`;
  }

  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday} · ${formattedTime}`;
}

/**
 * Formats the number of spots remaining or spots needed
 *
 * @param {Object} opportunity
 * @returns {{ count: number, label: string, isFull: boolean, isUrgent: boolean }}
 */
export function formatSpotsRemaining(opportunity) {
  if (!opportunity) return { count: 0, label: 'Spots TBA', isFull: false, isUrgent: false };

  let count;
  if (typeof opportunity.spotsRemaining === 'number') {
    count = opportunity.spotsRemaining;
  } else if (typeof opportunity.spotsNeeded === 'number') {
    const filled = typeof opportunity.spotsFilled === 'number' ? opportunity.spotsFilled : 0;
    count = Math.max(0, opportunity.spotsNeeded - filled);
  } else {
    count = 1;
  }

  const isFull = count <= 0;
  const isUrgent = count === 1;

  let label;
  if (isFull) {
    label = 'All spots filled';
  } else if (count === 1) {
    label = '1 spot left';
  } else {
    label = `${count} spots left`;
  }

  return { count, label, isFull, isUrgent };
}

/**
 * Normalizes training requirements and badges into an array of strings
 *
 * @param {Object} opportunity
 * @returns {Array<string>}
 */
export function getOpportunityBadges(opportunity) {
  if (!opportunity) return [];

  const badges = [];

  if (Array.isArray(opportunity.requiredBadges)) {
    badges.push(...opportunity.requiredBadges);
  } else if (typeof opportunity.requiredBadges === 'string') {
    badges.push(opportunity.requiredBadges);
  }

  if (Array.isArray(opportunity.badges)) {
    badges.push(...opportunity.badges);
  }

  if (Array.isArray(opportunity.requirements)) {
    badges.push(...opportunity.requirements);
  } else if (typeof opportunity.requirements === 'string') {
    badges.push(opportunity.requirements);
  }

  if (opportunity.requiredTraining) {
    badges.push(opportunity.requiredTraining);
  }

  // Deduplicate and trim
  return Array.from(new Set(badges.map((b) => String(b).trim()))).filter(Boolean);
}

/**
 * Formats member availability overview for quick display
 *
 * @param {Object} memberAvailability
 * @returns {string|null}
 */
export function formatMemberAvailabilitySummary(memberAvailability) {
  if (!memberAvailability) return null;

  const parts = [];
  if (Array.isArray(memberAvailability.availableDays) && memberAvailability.availableDays.length > 0) {
    const capitalizedDays = memberAvailability.availableDays
      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
      .join(', ');
    parts.push(capitalizedDays);
  }

  if (memberAvailability.preferredFrequency) {
    const freq =
      memberAvailability.preferredFrequency.charAt(0).toUpperCase() +
      memberAvailability.preferredFrequency.slice(1);
    parts.push(freq);
  } else if (memberAvailability.maxServingPerMonth) {
    parts.push(`Max ${memberAvailability.maxServingPerMonth}/mo`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'Availability configured';
}
