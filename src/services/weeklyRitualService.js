/**
 * VBT Sports Camp Community Platform - Weekly Community Ritual Service
 *
 * Implements the 6 recurring weekly ritual stages for the VBT community rhythm:
 * 1. Early Week (Mon - Wed): Upcoming service and servant meeting preview, vision casting
 * 2. Midweek (Wed - Thu): Choose a serving opportunity, sign-up prompt
 * 3. Before Event (Thu - Fri am): Confirm assignment, station prep notes, check arrival time
 * 4. Meeting Day (Fri evening / Tue evening): Scan attendance QR, serve joyfully, celebrate
 * 5. After Event (Sat - Sun): Read recap, see photos, express gratitude, care follow-up
 * 6. Next Cycle (Sun night): Receive next suggested step, reflection verse
 */

import {
  WEEKLY_RITUAL_PHASE,
  VBT_ROLES,
  isLeaderRole,
} from '../contracts/communityContracts';

export { WEEKLY_RITUAL_PHASE };

/**
 * Stage order sequence from 1 to 6
 */
export const RITUAL_PHASES_SEQUENCE = [
  WEEKLY_RITUAL_PHASE.EARLY_WEEK,
  WEEKLY_RITUAL_PHASE.MIDWEEK,
  WEEKLY_RITUAL_PHASE.BEFORE_EVENT,
  WEEKLY_RITUAL_PHASE.MEETING_DAY,
  WEEKLY_RITUAL_PHASE.AFTER_EVENT,
  WEEKLY_RITUAL_PHASE.NEXT_CYCLE,
];

/**
 * Rich domain metadata for each of the 6 weekly ritual stages
 */
export const RITUAL_STAGE_METADATA = {
  [WEEKLY_RITUAL_PHASE.EARLY_WEEK]: {
    stageNumber: 1,
    id: WEEKLY_RITUAL_PHASE.EARLY_WEEK,
    name: 'Early Week',
    days: 'Mon - Wed',
    summary: 'Upcoming service and servant meeting preview, vision casting',
    headline: 'Cast the Vision & Prepare the Week',
    iconName: 'Compass',
    accentColor: '#6366F1', // Indigo
    badgeBg: 'bg-indigo-500/15',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-400',
    targetTab: 'services',
    defaultCtaLabel: 'Preview Upcoming Services',
    verse: {
      ref: 'Proverbs 16:3',
      text: 'Commit your work to the Lord, and your plans will be established.',
      arabic: 'فَوِّضْ إِلَى الرَّبِّ أَعْمَالَكَ فَتُثَبَّتَ أَفْكَارُكَ.',
    },
  },
  [WEEKLY_RITUAL_PHASE.MIDWEEK]: {
    stageNumber: 2,
    id: WEEKLY_RITUAL_PHASE.MIDWEEK,
    name: 'Midweek',
    days: 'Wed - Thu',
    summary: 'Choose a serving opportunity, sign-up prompt',
    headline: 'Step Into Service & Lock Your Station',
    iconName: 'HeartHandshake',
    accentColor: '#38BDF8', // Sky
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-400',
    targetTab: 'serve',
    defaultCtaLabel: 'Choose Serving Station',
    verse: {
      ref: '1 Peter 4:10',
      text: 'Each of you should use whatever gift you have received to serve others, as faithful stewards of God’s grace.',
      arabic: 'لِيَكُنْ كُلُّ وَاحِدٍ بِحَسَبِ مَا أَخَذَ مَوْهِبَةً، يَخْدِمُ بِهَا بَعْضُكُمْ بَعْضًا، كَوُكَلاَءَ صَالِحِينَ عَلَى نِعْمَةِ اللهِ الْمُتَنَوِّعَةِ.',
    },
  },
  [WEEKLY_RITUAL_PHASE.BEFORE_EVENT]: {
    stageNumber: 3,
    id: WEEKLY_RITUAL_PHASE.BEFORE_EVENT,
    name: 'Before Event',
    days: 'Thu - Fri am',
    summary: 'Confirm assignment, station prep notes, check arrival time',
    headline: 'Final Readiness & Station Briefings',
    iconName: 'ClipboardCheck',
    accentColor: '#F59E0B', // Amber
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-400',
    targetTab: 'assignments',
    defaultCtaLabel: 'Check Station Notes & Call Time',
    verse: {
      ref: '1 Corinthians 14:40',
      text: 'Let all things be done decently and in order.',
      arabic: 'وَلْيَكُنْ كُلُّ شَيْءٍ بِلِيَاقَةٍ وَبِحَسَبِ تَرْتِيبٍ.',
    },
  },
  [WEEKLY_RITUAL_PHASE.MEETING_DAY]: {
    stageNumber: 4,
    id: WEEKLY_RITUAL_PHASE.MEETING_DAY,
    name: 'Meeting Day',
    days: 'Fri evening / Tue evening',
    summary: 'Scan attendance QR, serve joyfully, celebrate',
    headline: 'Gather, Serve & Rejoice Together',
    iconName: 'QrCode',
    accentColor: '#10B981', // Emerald
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    targetTab: 'qr',
    defaultCtaLabel: 'Scan Attendance QR',
    verse: {
      ref: 'Psalm 100:2',
      text: 'Serve the Lord with gladness; come before His presence with singing.',
      arabic: 'اعْبُدُوا الرَّبَّ بِفَرَحٍ. ادْخُلُوا إِلَى حَضْرَتِهِ بِتَرَنُّمٍ.',
    },
  },
  [WEEKLY_RITUAL_PHASE.AFTER_EVENT]: {
    stageNumber: 5,
    id: WEEKLY_RITUAL_PHASE.AFTER_EVENT,
    name: 'After Event',
    days: 'Sat - Sun',
    summary: 'Read recap, see photos, express gratitude, care follow-up',
    headline: 'Celebrate God’s Work & Care for One Another',
    iconName: 'Sparkles',
    accentColor: '#EC4899', // Pink
    badgeBg: 'bg-pink-500/15',
    badgeBorder: 'border-pink-500/30',
    badgeText: 'text-pink-400',
    targetTab: 'recap',
    defaultCtaLabel: 'View Gathering Photos & Recap',
    verse: {
      ref: 'Philippians 1:3-4',
      text: 'I thank my God every time I remember you. In all my prayers for all of you, I always pray with joy.',
      arabic: 'أَشْكُرُ إِلهِي عِنْدَ كُلِّ ذِكْرِي إِيَّاكُمْ دَائِمًا فِي كُلِّ أَدْعِيَتِي، مُقَدِّمًا الطِّلْبَةَ لأَجْلِ جَمِيعِكُمْ بِفَرَحٍ.',
    },
  },
  [WEEKLY_RITUAL_PHASE.NEXT_CYCLE]: {
    stageNumber: 6,
    id: WEEKLY_RITUAL_PHASE.NEXT_CYCLE,
    name: 'Next Cycle',
    days: 'Sun night',
    summary: 'Receive next suggested step, reflection verse',
    headline: 'Reflect & Step Into the New Week',
    iconName: 'RotateCw',
    accentColor: '#8B5CF6', // Purple
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-400',
    targetTab: 'growth',
    defaultCtaLabel: 'View Next Suggested Step',
    verse: {
      ref: 'Lamentations 3:22-23',
      text: 'Because of the Lord’s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
      arabic: 'إِنَّهُ مِنْ إِحْسَانَاتِ الرَّبِّ أَنَّنَا لَمْ نَفْنَ، لأَنَّ مَرَاحِمَهُ لاَ تَزُولُ. هِيَ جَدِيدَةٌ فِي كُلِّ صَبَاحٍ. كَثِيرَةٌ أَمَانَتُكَ.',
    },
  },
};

/**
 * Safely parse any date input (Date instance, string, number timestamp)
 * @param {Date|string|number} input
 * @returns {Date}
 */
export function parseDateInput(input) {
  if (!input) return new Date();
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date() : new Date(input.getTime());
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof input === 'string') {
    // If format is date-only YYYY-MM-DD, set to 12:00 local to prevent UTC boundary shift
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

/**
 * Determine the current weekly ritual phase from a date.
 *
 * Weekly schedule mapping:
 * - Mon all day -> EARLY_WEEK
 * - Tue before 17:00 -> EARLY_WEEK
 * - Tue 17:00+ -> MEETING_DAY (Tuesday evening servant gathering)
 * - Wed before 12:00 -> EARLY_WEEK
 * - Wed 12:00+ -> MIDWEEK
 * - Thu before 17:00 -> MIDWEEK
 * - Thu 17:00+ -> BEFORE_EVENT
 * - Fri before 17:00 -> BEFORE_EVENT (Fri am / early afternoon prep)
 * - Fri 17:00+ -> MEETING_DAY (Friday evening sports gathering & service)
 * - Sat all day -> AFTER_EVENT
 * - Sun before 19:00 -> AFTER_EVENT
 * - Sun 19:00+ -> NEXT_CYCLE
 *
 * @param {Date|string|number} [currentDate]
 * @param {Object} [options]
 * @param {string} [options.forcePhase] - Force a specific phase (for previews/testing)
 * @param {number} [options.tueMeetingStartHour=17]
 * @param {number} [options.wedMidweekStartHour=12]
 * @param {number} [options.thuBeforeEventStartHour=17]
 * @param {number} [options.friMeetingStartHour=17]
 * @param {number} [options.sunNightStartHour=19]
 * @returns {string} One of WEEKLY_RITUAL_PHASE values
 */
export function getCurrentRitualPhase(currentDate, options = {}) {
  if (options.forcePhase && RITUAL_STAGE_METADATA[options.forcePhase]) {
    return options.forcePhase;
  }

  const date = parseDateInput(currentDate);
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const hour = date.getHours();

  const tueMeetingHour = options.tueMeetingStartHour ?? 17;
  const wedMidweekHour = options.wedMidweekStartHour ?? 12;
  const thuBeforeEventHour = options.thuBeforeEventStartHour ?? 17;
  const friMeetingHour = options.friMeetingStartHour ?? 17;
  const sunNightHour = options.sunNightStartHour ?? 19;

  switch (day) {
    case 1: // Monday
      return WEEKLY_RITUAL_PHASE.EARLY_WEEK;

    case 2: // Tuesday
      if (hour >= tueMeetingHour) {
        return WEEKLY_RITUAL_PHASE.MEETING_DAY;
      }
      return WEEKLY_RITUAL_PHASE.EARLY_WEEK;

    case 3: // Wednesday
      if (hour >= wedMidweekHour) {
        return WEEKLY_RITUAL_PHASE.MIDWEEK;
      }
      return WEEKLY_RITUAL_PHASE.EARLY_WEEK;

    case 4: // Thursday
      if (hour >= thuBeforeEventHour) {
        return WEEKLY_RITUAL_PHASE.BEFORE_EVENT;
      }
      return WEEKLY_RITUAL_PHASE.MIDWEEK;

    case 5: // Friday
      if (hour >= friMeetingHour) {
        return WEEKLY_RITUAL_PHASE.MEETING_DAY;
      }
      return WEEKLY_RITUAL_PHASE.BEFORE_EVENT;

    case 6: // Saturday
      return WEEKLY_RITUAL_PHASE.AFTER_EVENT;

    case 0: // Sunday
      if (hour >= sunNightHour) {
        return WEEKLY_RITUAL_PHASE.NEXT_CYCLE;
      }
      return WEEKLY_RITUAL_PHASE.AFTER_EVENT;

    default:
      return WEEKLY_RITUAL_PHASE.EARLY_WEEK;
  }
}

/**
 * Returns role-specific guidance and weekly next steps tailored for the given phase,
 * user role, and user status.
 *
 * @param {string} phase - One of WEEKLY_RITUAL_PHASE values
 * @param {string} [userRole='member'] - One of VBT_ROLES values
 * @param {string} [userStatus='normal'] - Assignment status, persona status, or 'confirmed'/'pending'
 * @returns {Object} Rich guidance object
 */
export function getRitualPhaseGuidance(phase, userRole = VBT_ROLES.MEMBER, userStatus = 'normal') {
  const targetPhase = RITUAL_STAGE_METADATA[phase] ? phase : WEEKLY_RITUAL_PHASE.EARLY_WEEK;
  const meta = RITUAL_STAGE_METADATA[targetPhase];
  const isLeader = isLeaderRole(userRole);
  const isServant = [
    VBT_ROLES.ACTIVE_SERVANT,
    VBT_ROLES.SERVANT,
    VBT_ROLES.TRAINED_SERVANT,
    VBT_ROLES.VOLUNTEER,
  ].includes(userRole);

  const statusNormalized = (userStatus || '').toLowerCase();
  const isConfirmed = ['confirmed', 'assigned', 'active'].includes(statusNormalized);
  const isPending = ['pending', 'interest_submitted', 'unassigned'].includes(statusNormalized);

  let guidanceText = '';
  let nextStep = '';
  let callToAction = {
    label: meta.defaultCtaLabel,
    targetTab: meta.targetTab,
    actionType: 'navigate',
  };
  let checklist = [];

  switch (targetPhase) {
    case WEEKLY_RITUAL_PHASE.EARLY_WEEK:
      if (isLeader) {
        guidanceText =
          'Review upcoming service agendas, confirm lead servants, and cast the week’s spiritual & sports vision.';
        nextStep = 'Finalize station roster and review servant meeting schedule.';
        callToAction = {
          label: 'Review Service Agenda',
          targetTab: 'services',
          actionType: 'navigate',
        };
        checklist = [
          'Review Tuesday servant gathering agenda',
          'Verify Friday court and station assignments',
          'Send spiritual encouragement to team circle',
        ];
      } else if (isServant) {
        guidanceText =
          'Preview this week’s gathering vision, check the Tuesday servant gathering time, and pray for your station.';
        nextStep = 'Check servant meeting details and set your weekly availability.';
        callToAction = {
          label: 'Preview Gathering Schedule',
          targetTab: 'services',
          actionType: 'navigate',
        };
        checklist = [
          'Check Tuesday servant huddle timing (7:30 PM)',
          'Preview Friday theme & sports curriculum',
          'Pray for the youths and fellow teammates',
        ];
      } else {
        guidanceText =
          'A new week of fellowship and sports begins! Explore upcoming gathering themes and invite a friend.';
        nextStep = 'View Friday’s gathering schedule and sports tournament lineup.';
        callToAction = {
          label: 'Explore Gathering Theme',
          targetTab: 'services',
          actionType: 'navigate',
        };
        checklist = [
          'Preview Friday sports and worship schedule',
          'Invite a friend or teammate to attend',
          'Check the weekly scripture verse',
        ];
      }
      break;

    case WEEKLY_RITUAL_PHASE.MIDWEEK:
      if (isLeader) {
        guidanceText =
          'Monitor station sign-ups and servant fill rates across court stations, hospitality, and media.';
        nextStep = 'Reach out to unassigned volunteers to ensure full station coverage.';
        callToAction = {
          label: 'Manage Serving Roster',
          targetTab: 'serve',
          actionType: 'navigate',
        };
        checklist = [
          'Audit open station vacancies',
          'Approve pending servant interest submissions',
          'Assign backup leaders for key sports stations',
        ];
      } else if (isServant) {
        if (isConfirmed) {
          guidanceText =
            'Your serving station is locked in! Review station guidelines and connect with your team leader.';
          nextStep = 'Review station briefing notes and coordinate with teammates.';
          callToAction = {
            label: 'View Your Assignment',
            targetTab: 'assignments',
            actionType: 'navigate',
          };
          checklist = [
            'Verify assigned station and arrival time',
            'Connect with your station co-servants',
            'Read station safety and equipment reminders',
          ];
        } else {
          guidanceText =
            'Serving stations are open for this Friday! Pick where you want to serve before slots lock on Thursday.';
          nextStep = 'Choose your preferred sports court, hospitality, or media duty.';
          callToAction = {
            label: 'Choose Serving Opportunity',
            targetTab: 'serve',
            actionType: 'navigate',
          };
          checklist = [
            'Browse open serving opportunities',
            'Select your station and submit interest',
            'Confirm availability for Friday evening',
          ];
        }
      } else {
        guidanceText =
          'Discover the joy of serving in community! Explore welcoming first-time volunteer roles for this Friday.';
        nextStep = 'Find your place to serve in sports stations or guest welcome.';
        callToAction = {
          label: 'Find Your Serving Spot',
          targetTab: 'serve',
          actionType: 'navigate',
        };
        checklist = [
          'Explore volunteer positions for new members',
          'RSVP for Friday’s gathering',
          'Learn about VBT servant pathways',
        ];
      }
      break;

    case WEEKLY_RITUAL_PHASE.BEFORE_EVENT:
      if (isLeader) {
        guidanceText =
          'Final readiness check: verify equipment, review safety protocols, and prepare for the 5:15 PM pre-service briefing.';
        nextStep = 'Review station checklists and confirm lead servant check-in.';
        callToAction = {
          label: 'Check Station Prep Notes',
          targetTab: 'services',
          actionType: 'navigate',
        };
        checklist = [
          'Verify first-aid and sports equipment kits',
          'Review QR scanner stations at entrance',
          'Hold 5:15 PM pre-event prayer huddle',
        ];
      } else if (isServant) {
        if (isConfirmed) {
          guidanceText =
            'Your station assignment is confirmed! Read station prep notes and plan to arrive by 5:30 PM for team prayer.';
          nextStep = 'Review station prep notes & confirm your 5:30 PM call time.';
          callToAction = {
            label: 'Review Station Prep Notes',
            targetTab: 'assignments',
            actionType: 'confirm',
          };
          checklist = [
            'Confirm 5:30 PM arrival call time',
            'Read station prep and rules guidelines',
            'Wear your VBT servant jersey/badge',
          ];
        } else if (isPending) {
          guidanceText =
            'Your assignment is pending confirmation. Check in with your team leader or assist at the welcome hub.';
          nextStep = 'Contact your station lead to confirm your check-in slot.';
          callToAction = {
            label: 'Check Assignment Status',
            targetTab: 'assignments',
            actionType: 'navigate',
          };
          checklist = [
            'Check status of pending assignment',
            'Arrive by 5:30 PM for walk-in station placement',
            'Confirm emergency contact info',
          ];
        } else {
          guidanceText =
            'Last-minute stations are open! Jump in as a backup servant or assist at registration.';
          nextStep = 'Review emergency open slots or confirm attendance.';
          callToAction = {
            label: 'View Open Backup Slots',
            targetTab: 'serve',
            actionType: 'navigate',
          };
          checklist = [
            'Check open replacement needs',
            'Confirm attendance with team coordinator',
          ];
        }
      } else {
        guidanceText =
          'Friday gathering is tomorrow! Confirm your RSVP, pack athletic shoes, and arrive by 6:00 PM for court games.';
        nextStep = 'Confirm RSVP and check directions & parking guidelines.';
        callToAction = {
          label: 'View Arrival Details',
          targetTab: 'services',
          actionType: 'navigate',
        };
        checklist = [
          'Confirm gathering RSVP',
          'Check arrival time (doors open 6:00 PM)',
          'Bring appropriate sports court attire',
        ];
      }
      break;

    case WEEKLY_RITUAL_PHASE.MEETING_DAY:
      if (isLeader) {
        guidanceText =
          'Gathering is live! Welcome families, coordinate station leaders, and oversee smooth sports rotations.';
        nextStep = 'Open QR scanner, monitor live check-ins, and support station leads.';
        callToAction = {
          label: 'Open Attendance Scanner',
          targetTab: 'qr',
          actionType: 'qr_scan',
        };
        checklist = [
          'Open leader QR scanner for attendance',
          'Supervise court safety and station rotations',
          'Facilitate evening servant wrap-up and debrief',
        ];
      } else if (isServant) {
        guidanceText =
          'Welcome to the gathering! Scan your servant check-in QR, report to your station, and serve joyfully.';
        nextStep = 'Scan your arrival QR code at the servant desk and take your post.';
        callToAction = {
          label: 'Scan Attendance QR',
          targetTab: 'qr',
          actionType: 'qr_scan',
        };
        checklist = [
          'Scan your servant attendance QR code',
          'Check in with your station team leader',
          'Serve with joy, patience, and encouraging words',
        ];
      } else {
        guidanceText =
          'Welcome to VBT! Scan your arrival QR at the door, meet new friends, and enjoy tonight’s sports and worship.';
        nextStep = 'Scan your check-in QR and join tonight’s opening rally.';
        callToAction = {
          label: 'Scan Check-In QR',
          targetTab: 'qr',
          actionType: 'qr_scan',
        };
        checklist = [
          'Scan attendance QR at the entrance table',
          'Grab your tournament team band',
          'Join opening worship and fellowship',
        ];
      }
      break;

    case WEEKLY_RITUAL_PHASE.AFTER_EVENT:
      if (isLeader) {
        guidanceText =
          'Review gathering attendance stats, celebrate servant faithfulness, and follow up on pastoral care notes.';
        nextStep = 'Review attendance breakdown and send team thank-you messages.';
        callToAction = {
          label: 'Review Attendance & Care',
          targetTab: 'recap',
          actionType: 'navigate',
        };
        checklist = [
          'Review final attendance counts and headcounts',
          'Send thank-you shoutouts to station leaders',
          'Log pastoral care follow-ups for absent youths',
        ];
      } else if (isServant) {
        guidanceText =
          'Thank you for your faithful service! Browse gathering highlights, submit station feedback, and encourage teammates.';
        nextStep = 'View event photos, celebrate wins, and log station notes.';
        callToAction = {
          label: 'View Photos & Recap',
          targetTab: 'recap',
          actionType: 'navigate',
        };
        checklist = [
          'Browse photo album and tournament results',
          'Share an encouraging word on the prayer wall',
          'Submit quick station feedback or supply needs',
        ];
      } else {
        guidanceText =
          'What a wonderful gathering! Relive the moments with photo highlights and read the spiritual message recap.';
        nextStep = 'Browse photo gallery and submit praise or prayer requests.';
        callToAction = {
          label: 'View Photo Gallery',
          targetTab: 'recap',
          actionType: 'navigate',
        };
        checklist = [
          'View tournament photos and highlight clips',
          'Read the spiritual devotional recap',
          'Share a testimony or prayer on the community wall',
        ];
      }
      break;

    case WEEKLY_RITUAL_PHASE.NEXT_CYCLE:
      if (isLeader) {
        guidanceText =
          'As the week closes, reflect on God’s grace, review community growth metrics, and prepare next week’s targets.';
        nextStep = 'Cast vision for next week and plan servant leadership huddle.';
        callToAction = {
          label: 'Preview Next Cycle',
          targetTab: 'services',
          actionType: 'navigate',
        };
        checklist = [
          'Review community weekly health metrics',
          'Set next week’s sports theme and lesson',
          'Pray for the upcoming week’s servant leads',
        ];
      } else if (isServant) {
        guidanceText =
          'Rest in the Lord tonight. Review your servant growth milestones and meditate on this week’s reflection verse.';
        nextStep = 'View your servant progression and receive your next step.';
        callToAction = {
          label: 'View Next Suggested Step',
          targetTab: 'growth',
          actionType: 'navigate',
        };
        checklist = [
          'Review your serving streak and badges',
          'Read the Sunday night reflection verse',
          'Set your serving intentions for the upcoming cycle',
        ];
      } else {
        guidanceText =
          'Rest and recharge tonight. Receive this week’s spiritual reflection verse and prepare for another great week of sports.';
        nextStep = 'Meditate on the reflection verse and plan your week ahead.';
        callToAction = {
          label: 'Read Reflection Verse',
          targetTab: 'devotional',
          actionType: 'reflect',
        };
        checklist = [
          'Read tonight’s reflection scripture',
          'Set a personal spiritual goal for the week',
          'Get ready for next Friday’s sports fellowship',
        ];
      }
      break;

    default:
      break;
  }

  return {
    phase: targetPhase,
    title: meta.name,
    stageNumber: meta.stageNumber,
    stageRange: meta.days,
    summary: meta.summary,
    headline: meta.headline,
    guidanceText,
    nextStep,
    callToAction,
    checklist,
    reflectionVerse: meta.verse,
    roleContext: {
      userRole,
      userStatus,
      isLeader,
      isServant,
      isConfirmed,
    },
    accentColor: meta.accentColor,
    badgeBg: meta.badgeBg,
    badgeBorder: meta.badgeBorder,
    badgeText: meta.badgeText,
    iconName: meta.iconName,
  };
}

/**
 * Format the entire 6-stage ritual timeline relative to a given date.
 * Returns both structured stage objects and high-level progress indicators.
 *
 * @param {Date|string|number} [currentDate]
 * @returns {Object}
 */
export function formatRitualTimeline(currentDate) {
  const currentPhase = getCurrentRitualPhase(currentDate);
  const currentStageMeta = RITUAL_STAGE_METADATA[currentPhase] || RITUAL_STAGE_METADATA[WEEKLY_RITUAL_PHASE.EARLY_WEEK];
  const currentStageNumber = currentStageMeta.stageNumber; // 1 to 6
  const currentStageIndex = currentStageNumber - 1; // 0 to 5

  const stages = RITUAL_PHASES_SEQUENCE.map((phaseKey, idx) => {
    const meta = RITUAL_STAGE_METADATA[phaseKey];
    const stageNum = meta.stageNumber;
    const isCurrent = phaseKey === currentPhase;
    const isPast = stageNum < currentStageNumber;
    const isUpcoming = stageNum > currentStageNumber;

    let status = 'upcoming';
    if (isCurrent) status = 'active';
    else if (isPast) status = 'completed';

    return {
      id: phaseKey,
      number: stageNum,
      name: meta.name,
      days: meta.days,
      summary: meta.summary,
      headline: meta.headline,
      iconName: meta.iconName,
      accentColor: meta.accentColor,
      badgeBg: meta.badgeBg,
      badgeBorder: meta.badgeBorder,
      badgeText: meta.badgeText,
      targetTab: meta.targetTab,
      defaultCtaLabel: meta.defaultCtaLabel,
      isCurrent,
      isPast,
      isUpcoming,
      status,
    };
  });

  const completionPercentage = Math.round((currentStageNumber / 6) * 100);
  const formattedSummary = `Stage ${currentStageNumber} of 6: ${currentStageMeta.name} (${currentStageMeta.days})`;

  return {
    currentPhase,
    currentStageNumber,
    currentStageIndex,
    currentStage: stages[currentStageIndex],
    completionPercentage,
    formattedSummary,
    stages,
  };
}

/**
 * Weekly Notification Schedules and Rate-Limiting Configuration
 * Designed to prevent notification spam across the 6 recurring phases.
 */
export const NOTIFICATION_SCHEDULE_RULES = {
  [WEEKLY_RITUAL_PHASE.EARLY_WEEK]: {
    phase: WEEKLY_RITUAL_PHASE.EARLY_WEEK,
    title: 'VBT Weekly Vision & Gathering Preview',
    body: 'A new week begins! Check out this week’s sports theme and Tuesday servant gathering.',
    targetDay: 'Monday',
    preferredHour: 10,
    preferredMinute: 0,
    cooldownHours: 24,
    maxNotificationsPerPhase: 1,
    priority: 'normal',
    channelId: 'vbt_weekly_ritual',
    category: 'early_week_preview',
    targetTab: 'services',
  },
  [WEEKLY_RITUAL_PHASE.MIDWEEK]: {
    phase: WEEKLY_RITUAL_PHASE.MIDWEEK,
    title: 'VBT Serving Stations Open!',
    body: 'Pick your serving station for this Friday before positions lock on Thursday night.',
    targetDay: 'Wednesday',
    preferredHour: 13,
    preferredMinute: 0,
    cooldownHours: 18,
    maxNotificationsPerPhase: 1,
    priority: 'high',
    channelId: 'vbt_weekly_ritual',
    category: 'serving_signup',
    targetTab: 'serve',
  },
  [WEEKLY_RITUAL_PHASE.BEFORE_EVENT]: {
    phase: WEEKLY_RITUAL_PHASE.BEFORE_EVENT,
    title: 'VBT Readiness Check: Station Notes & Call Time',
    body: 'Gathering tomorrow! Servants arrive by 5:30 PM. Review your station prep notes.',
    targetDay: 'Thursday',
    preferredHour: 18,
    preferredMinute: 30,
    cooldownHours: 14,
    maxNotificationsPerPhase: 1,
    priority: 'high',
    channelId: 'vbt_weekly_ritual',
    category: 'station_prep',
    targetTab: 'assignments',
  },
  [WEEKLY_RITUAL_PHASE.MEETING_DAY]: {
    phase: WEEKLY_RITUAL_PHASE.MEETING_DAY,
    title: 'VBT Gathering Tonight — Scan In!',
    body: 'Doors are open! Have your check-in QR ready and serve with gladness tonight.',
    targetDay: 'Friday',
    preferredHour: 17,
    preferredMinute: 15,
    cooldownHours: 6,
    maxNotificationsPerPhase: 2, // Allows 1 call-time reminder and 1 live scan reminder
    priority: 'high',
    channelId: 'vbt_weekly_ritual',
    category: 'meeting_day_live',
    targetTab: 'qr',
  },
  [WEEKLY_RITUAL_PHASE.AFTER_EVENT]: {
    phase: WEEKLY_RITUAL_PHASE.AFTER_EVENT,
    title: 'VBT Gathering Highlights & Photo Drop',
    body: 'Photos and recap from Friday’s games are live! See tournament moments and praise God.',
    targetDay: 'Saturday',
    preferredHour: 11,
    preferredMinute: 0,
    cooldownHours: 20,
    maxNotificationsPerPhase: 1,
    priority: 'normal',
    channelId: 'vbt_weekly_ritual',
    category: 'event_recap',
    targetTab: 'recap',
  },
  [WEEKLY_RITUAL_PHASE.NEXT_CYCLE]: {
    phase: WEEKLY_RITUAL_PHASE.NEXT_CYCLE,
    title: 'VBT Sunday Night Reflection & Next Step',
    body: 'Receive your weekly spiritual reflection verse and discover your next step for the coming week.',
    targetDay: 'Sunday',
    preferredHour: 20,
    preferredMinute: 0,
    cooldownHours: 12,
    maxNotificationsPerPhase: 1,
    priority: 'normal',
    channelId: 'vbt_weekly_ritual',
    category: 'next_cycle_step',
    targetTab: 'growth',
  },
};

/**
 * Retrieve rate-limited notification schedule configuration for a given phase
 *
 * @param {string} phase - One of WEEKLY_RITUAL_PHASE values
 * @returns {Object}
 */
export function getNotificationSchedule(phase) {
  const targetPhase = NOTIFICATION_SCHEDULE_RULES[phase]
    ? phase
    : WEEKLY_RITUAL_PHASE.EARLY_WEEK;

  const rule = NOTIFICATION_SCHEDULE_RULES[targetPhase];
  const meta = RITUAL_STAGE_METADATA[targetPhase];

  return {
    ...rule,
    stageName: meta.name,
    days: meta.days,
    quietHours: {
      startHour: 22, // 10 PM
      endHour: 8,    // 8 AM
    },
    rateLimiting: {
      cooldownHours: rule.cooldownHours,
      maxPerPhase: rule.maxNotificationsPerPhase,
      preventDuplicateInPhase: true,
    },
    generateRateLimitKey: (year, weekNumber) =>
      `vbt_ritual_notif_${year}_w${weekNumber}_${targetPhase}`,
  };
}

/**
 * Evaluates whether a notification can be sent right now, enforcing:
 * 1. Cooldown hours between notifications
 * 2. Quiet hours (no notifications between 10 PM and 8 AM)
 * 3. Max notification caps per phase
 *
 * @param {string} phase
 * @param {number|null} [lastSentTimestamp=null] - Epoch ms when this notification was last sent
 * @param {Object} [options]
 * @param {Date} [options.now]
 * @param {boolean} [options.ignoreQuietHours=false]
 * @param {boolean} [options.requireActivePhase=false]
 * @returns {{ allowed: boolean, reason?: string, nextAllowedTime?: Date, schedule: Object }}
 */
export function canSendPhaseNotification(phase, lastSentTimestamp = null, options = {}) {
  const schedule = getNotificationSchedule(phase);
  const now = options.now ? parseDateInput(options.now) : new Date();
  const nowMs = now.getTime();
  const hour = now.getHours();

  // 1. Quiet Hours check (22:00 to 08:00)
  if (!options.ignoreQuietHours) {
    if (hour >= schedule.quietHours.startHour || hour < schedule.quietHours.endHour) {
      return {
        allowed: false,
        reason: 'QUIET_HOURS',
        schedule,
      };
    }
  }

  // 2. Active Phase requirement check (optional)
  if (options.requireActivePhase) {
    const currentPhase = getCurrentRitualPhase(now);
    if (currentPhase !== phase) {
      return {
        allowed: false,
        reason: 'PHASE_INACTIVE',
        schedule,
      };
    }
  }

  // 3. Cooldown check
  if (lastSentTimestamp && typeof lastSentTimestamp === 'number') {
    const cooldownMs = schedule.cooldownHours * 60 * 60 * 1000;
    const elapsedMs = nowMs - lastSentTimestamp;

    if (elapsedMs < cooldownMs) {
      const nextAllowedTime = new Date(lastSentTimestamp + cooldownMs);
      return {
        allowed: false,
        reason: 'COOLDOWN_ACTIVE',
        nextAllowedTime,
        schedule,
      };
    }
  }

  return {
    allowed: true,
    schedule,
  };
}

/**
 * Get reflection verse for a given phase
 * @param {string} phase
 * @returns {Object}
 */
export function getPhaseReflectionVerse(phase) {
  const meta = RITUAL_STAGE_METADATA[phase] || RITUAL_STAGE_METADATA[WEEKLY_RITUAL_PHASE.EARLY_WEEK];
  return meta.verse;
}

/**
 * Convenience helper to check if today/now is considered a meeting day/gathering window
 * @param {Date|string|number} [date]
 * @returns {boolean}
 */
export function isMeetingDay(date) {
  const phase = getCurrentRitualPhase(date);
  return phase === WEEKLY_RITUAL_PHASE.MEETING_DAY;
}

/**
 * Get metadata for a specific ritual phase
 * @param {string} phase
 * @returns {Object}
 */
export function getRitualPhaseMeta(phase) {
  return RITUAL_STAGE_METADATA[phase] || RITUAL_STAGE_METADATA[WEEKLY_RITUAL_PHASE.EARLY_WEEK];
}

/**
 * Returns all 6 ritual phases in sequence order
 * @returns {Array<Object>}
 */
export function getAllRitualPhases() {
  return RITUAL_PHASES_SEQUENCE.map((phase) => RITUAL_STAGE_METADATA[phase]);
}

/**
 * Helper to get the next phase in the weekly cycle
 * @param {string} phase
 * @returns {string}
 */
export function getNextPhase(phase) {
  const idx = RITUAL_PHASES_SEQUENCE.indexOf(phase);
  if (idx === -1) return RITUAL_PHASES_SEQUENCE[0];
  return RITUAL_PHASES_SEQUENCE[(idx + 1) % RITUAL_PHASES_SEQUENCE.length];
}

/**
 * Helper to get the previous phase in the weekly cycle
 * @param {string} phase
 * @returns {string}
 */
export function getPreviousPhase(phase) {
  const idx = RITUAL_PHASES_SEQUENCE.indexOf(phase);
  if (idx === -1) return RITUAL_PHASES_SEQUENCE[0];
  return RITUAL_PHASES_SEQUENCE[(idx - 1 + RITUAL_PHASES_SEQUENCE.length) % RITUAL_PHASES_SEQUENCE.length];
}
