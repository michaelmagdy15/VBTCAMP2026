import { describe, it, expect } from 'vitest';
import {
  getCurrentRitualPhase,
  getRitualPhaseGuidance,
  formatRitualTimeline,
  getNotificationSchedule,
  canSendPhaseNotification,
  getPhaseReflectionVerse,
  isMeetingDay,
  getRitualPhaseMeta,
  getAllRitualPhases,
  getNextPhase,
  getPreviousPhase,
  parseDateInput,
  WEEKLY_RITUAL_PHASE,
  RITUAL_STAGE_METADATA,
  RITUAL_PHASES_SEQUENCE,
} from './weeklyRitualService';
import { VBT_ROLES, WEEKLY_RITUAL_PHASE as CONTRACT_PHASES } from '../contracts/communityContracts';

describe('weeklyRitualService', () => {
  // Verify synchronization with contract constants
  describe('Contracts Alignment', () => {
    it('matches the WEEKLY_RITUAL_PHASE exported by communityContracts.js', () => {
      expect(WEEKLY_RITUAL_PHASE).toEqual(CONTRACT_PHASES);
      expect(WEEKLY_RITUAL_PHASE.EARLY_WEEK).toBe('early_week');
      expect(WEEKLY_RITUAL_PHASE.MIDWEEK).toBe('midweek');
      expect(WEEKLY_RITUAL_PHASE.BEFORE_EVENT).toBe('before_event');
      expect(WEEKLY_RITUAL_PHASE.MEETING_DAY).toBe('meeting_day');
      expect(WEEKLY_RITUAL_PHASE.AFTER_EVENT).toBe('after_event');
      expect(WEEKLY_RITUAL_PHASE.NEXT_CYCLE).toBe('next_cycle');
    });

    it('contains all 6 sequential phases in RITUAL_PHASES_SEQUENCE', () => {
      expect(RITUAL_PHASES_SEQUENCE).toHaveLength(6);
      expect(RITUAL_PHASES_SEQUENCE).toEqual([
        'early_week',
        'midweek',
        'before_event',
        'meeting_day',
        'after_event',
        'next_cycle',
      ]);
    });
  });

  describe('parseDateInput', () => {
    it('handles Date instances', () => {
      const d = new Date(2026, 9, 5, 10, 0);
      const parsed = parseDateInput(d);
      expect(parsed.getTime()).toBe(d.getTime());
    });

    it('handles numeric epoch timestamps', () => {
      const ts = 1760000000000;
      const parsed = parseDateInput(ts);
      expect(parsed.getTime()).toBe(ts);
    });

    it('handles YYYY-MM-DD date-only strings without timezone shift', () => {
      const parsed = parseDateInput('2026-10-05');
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(9); // 0-indexed October
      expect(parsed.getDate()).toBe(5);
      expect(parsed.getHours()).toBe(12); // defaults to midday
    });

    it('handles null or undefined gracefully by returning current date', () => {
      const parsed = parseDateInput(null);
      expect(parsed).toBeInstanceOf(Date);
      expect(isNaN(parsed.getTime())).toBe(false);
    });
  });

  describe('getCurrentRitualPhase - Date-to-Phase Mapping', () => {
    // 2026-10-05 is a Monday
    it('identifies Monday all day as EARLY_WEEK', () => {
      const monMorning = new Date(2026, 9, 5, 8, 30);
      const monEvening = new Date(2026, 9, 5, 21, 0);
      expect(getCurrentRitualPhase(monMorning)).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
      expect(getCurrentRitualPhase(monEvening)).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
    });

    // 2026-10-06 is a Tuesday
    it('identifies Tuesday morning/afternoon as EARLY_WEEK, and Tuesday evening as MEETING_DAY', () => {
      const tueMorning = new Date(2026, 9, 6, 11, 0);
      const tueAfternoon = new Date(2026, 9, 6, 16, 59);
      const tueMeetingTime = new Date(2026, 9, 6, 17, 0);
      const tueLateEvening = new Date(2026, 9, 6, 20, 30);

      expect(getCurrentRitualPhase(tueMorning)).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
      expect(getCurrentRitualPhase(tueAfternoon)).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
      expect(getCurrentRitualPhase(tueMeetingTime)).toBe(WEEKLY_RITUAL_PHASE.MEETING_DAY);
      expect(getCurrentRitualPhase(tueLateEvening)).toBe(WEEKLY_RITUAL_PHASE.MEETING_DAY);
    });

    // 2026-10-07 is a Wednesday
    it('identifies Wednesday morning as EARLY_WEEK, and Wednesday afternoon as MIDWEEK', () => {
      const wedMorning = new Date(2026, 9, 7, 9, 0);
      const wedMidday = new Date(2026, 9, 7, 12, 0);
      const wedEvening = new Date(2026, 9, 7, 18, 0);

      expect(getCurrentRitualPhase(wedMorning)).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
      expect(getCurrentRitualPhase(wedMidday)).toBe(WEEKLY_RITUAL_PHASE.MIDWEEK);
      expect(getCurrentRitualPhase(wedEvening)).toBe(WEEKLY_RITUAL_PHASE.MIDWEEK);
    });

    // 2026-10-08 is a Thursday
    it('identifies Thursday daytime as MIDWEEK, and Thursday evening as BEFORE_EVENT', () => {
      const thuMorning = new Date(2026, 9, 8, 10, 0);
      const thuAfternoon = new Date(2026, 9, 8, 16, 30);
      const thuEvening = new Date(2026, 9, 8, 17, 0);
      const thuNight = new Date(2026, 9, 8, 21, 0);

      expect(getCurrentRitualPhase(thuMorning)).toBe(WEEKLY_RITUAL_PHASE.MIDWEEK);
      expect(getCurrentRitualPhase(thuAfternoon)).toBe(WEEKLY_RITUAL_PHASE.MIDWEEK);
      expect(getCurrentRitualPhase(thuEvening)).toBe(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
      expect(getCurrentRitualPhase(thuNight)).toBe(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
    });

    // 2026-10-09 is a Friday
    it('identifies Friday morning/daytime as BEFORE_EVENT, and Friday evening as MEETING_DAY', () => {
      const friMorning = new Date(2026, 9, 9, 8, 0);
      const friLunch = new Date(2026, 9, 9, 13, 0);
      const friLateAfternoon = new Date(2026, 9, 9, 16, 59);
      const friMeetingTime = new Date(2026, 9, 9, 17, 0);
      const friServicePeak = new Date(2026, 9, 9, 19, 30);

      expect(getCurrentRitualPhase(friMorning)).toBe(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
      expect(getCurrentRitualPhase(friLunch)).toBe(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
      expect(getCurrentRitualPhase(friLateAfternoon)).toBe(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
      expect(getCurrentRitualPhase(friMeetingTime)).toBe(WEEKLY_RITUAL_PHASE.MEETING_DAY);
      expect(getCurrentRitualPhase(friServicePeak)).toBe(WEEKLY_RITUAL_PHASE.MEETING_DAY);
    });

    // 2026-10-10 is a Saturday
    it('identifies Saturday all day as AFTER_EVENT', () => {
      const satMorning = new Date(2026, 9, 10, 10, 0);
      const satNight = new Date(2026, 9, 10, 22, 0);

      expect(getCurrentRitualPhase(satMorning)).toBe(WEEKLY_RITUAL_PHASE.AFTER_EVENT);
      expect(getCurrentRitualPhase(satNight)).toBe(WEEKLY_RITUAL_PHASE.AFTER_EVENT);
    });

    // 2026-10-11 is a Sunday
    it('identifies Sunday daytime as AFTER_EVENT, and Sunday night as NEXT_CYCLE', () => {
      const sunMorning = new Date(2026, 9, 11, 11, 0);
      const sunAfternoon = new Date(2026, 9, 11, 17, 0);
      const sunNight = new Date(2026, 9, 11, 19, 0);
      const sunLateNight = new Date(2026, 9, 11, 22, 30);

      expect(getCurrentRitualPhase(sunMorning)).toBe(WEEKLY_RITUAL_PHASE.AFTER_EVENT);
      expect(getCurrentRitualPhase(sunAfternoon)).toBe(WEEKLY_RITUAL_PHASE.AFTER_EVENT);
      expect(getCurrentRitualPhase(sunNight)).toBe(WEEKLY_RITUAL_PHASE.NEXT_CYCLE);
      expect(getCurrentRitualPhase(sunLateNight)).toBe(WEEKLY_RITUAL_PHASE.NEXT_CYCLE);
    });

    it('supports forcePhase option override', () => {
      const mon = new Date(2026, 9, 5, 9, 0);
      expect(getCurrentRitualPhase(mon, { forcePhase: 'meeting_day' })).toBe('meeting_day');
    });

    it('supports custom hour thresholds via options', () => {
      // Tuesday with custom meeting hour 19:00
      const tue18 = new Date(2026, 9, 6, 18, 0);
      expect(getCurrentRitualPhase(tue18, { tueMeetingStartHour: 19 })).toBe(
        WEEKLY_RITUAL_PHASE.EARLY_WEEK
      );
    });
  });

  describe('isMeetingDay helper', () => {
    it('returns true on Tuesday evening and Friday evening', () => {
      const tueEvening = new Date(2026, 9, 6, 19, 0);
      const friEvening = new Date(2026, 9, 9, 19, 0);
      expect(isMeetingDay(tueEvening)).toBe(true);
      expect(isMeetingDay(friEvening)).toBe(true);
    });

    it('returns false on Monday morning and Saturday afternoon', () => {
      const monMorning = new Date(2026, 9, 5, 9, 0);
      const satAfternoon = new Date(2026, 9, 10, 14, 0);
      expect(isMeetingDay(monMorning)).toBe(false);
      expect(isMeetingDay(satAfternoon)).toBe(false);
    });
  });

  describe('getRitualPhaseGuidance - Role-Specific Guidance', () => {
    it('provides tailored leadership guidance in Early Week', () => {
      const guidance = getRitualPhaseGuidance(WEEKLY_RITUAL_PHASE.EARLY_WEEK, VBT_ROLES.COORDINATOR);
      expect(guidance.stageNumber).toBe(1);
      expect(guidance.stageRange).toBe('Mon - Wed');
      expect(guidance.roleContext.isLeader).toBe(true);
      expect(guidance.guidanceText).toContain('Review upcoming service agendas');
      expect(guidance.callToAction.targetTab).toBe('services');
      expect(guidance.checklist.length).toBeGreaterThanOrEqual(2);
      expect(guidance.reflectionVerse.ref).toBe('Proverbs 16:3');
    });

    it('provides tailored servant guidance in Early Week', () => {
      const guidance = getRitualPhaseGuidance(WEEKLY_RITUAL_PHASE.EARLY_WEEK, VBT_ROLES.ACTIVE_SERVANT);
      expect(guidance.roleContext.isServant).toBe(true);
      expect(guidance.guidanceText).toContain('Preview this week’s gathering vision');
      expect(guidance.nextStep).toContain('Check servant meeting details');
    });

    it('provides member / guest guidance in Early Week', () => {
      const guidance = getRitualPhaseGuidance(WEEKLY_RITUAL_PHASE.EARLY_WEEK, VBT_ROLES.MEMBER);
      expect(guidance.guidanceText).toContain('A new week of fellowship and sports begins');
      expect(guidance.callToAction.label).toBe('Explore Gathering Theme');
    });

    it('handles Midweek serving opportunity guidance for confirmed vs unassigned servants', () => {
      const confirmedServant = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.MIDWEEK,
        VBT_ROLES.SERVANT,
        'confirmed'
      );
      expect(confirmedServant.guidanceText).toContain('Your serving station is locked in');
      expect(confirmedServant.callToAction.targetTab).toBe('assignments');

      const unassignedServant = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.MIDWEEK,
        VBT_ROLES.SERVANT,
        'unassigned'
      );
      expect(unassignedServant.guidanceText).toContain('Serving stations are open');
      expect(unassignedServant.callToAction.targetTab).toBe('serve');
    });

    it('handles Before Event station notes and arrival time for servants', () => {
      const servantBefore = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.BEFORE_EVENT,
        VBT_ROLES.TRAINED_SERVANT,
        'confirmed'
      );
      expect(servantBefore.guidanceText).toContain('arrive by 5:30 PM');
      expect(servantBefore.reflectionVerse.ref).toBe('1 Corinthians 14:40');
      expect(servantBefore.callToAction.actionType).toBe('confirm');
    });

    it('handles Meeting Day QR check-in prompt for all personas', () => {
      const memberMeeting = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.MEETING_DAY,
        VBT_ROLES.MEMBER
      );
      expect(memberMeeting.callToAction.actionType).toBe('qr_scan');
      expect(memberMeeting.callToAction.label).toContain('Scan Check-In QR');

      const servantMeeting = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.MEETING_DAY,
        VBT_ROLES.ACTIVE_SERVANT
      );
      expect(servantMeeting.callToAction.actionType).toBe('qr_scan');
      expect(servantMeeting.guidanceText).toContain('Scan your servant check-in QR');
      expect(servantMeeting.reflectionVerse.ref).toBe('Psalm 100:2');
    });

    it('handles After Event celebration and care follow-up', () => {
      const leaderAfter = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.AFTER_EVENT,
        VBT_ROLES.TEAM_LEADER
      );
      expect(leaderAfter.guidanceText).toContain('pastoral care notes');
      expect(leaderAfter.callToAction.targetTab).toBe('recap');

      const memberAfter = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.AFTER_EVENT,
        VBT_ROLES.MEMBER
      );
      expect(memberAfter.guidanceText).toContain('Relive the moments with photo highlights');
    });

    it('handles Next Cycle reflection verse and next step', () => {
      const nextCycle = getRitualPhaseGuidance(
        WEEKLY_RITUAL_PHASE.NEXT_CYCLE,
        VBT_ROLES.ACTIVE_SERVANT
      );
      expect(nextCycle.stageNumber).toBe(6);
      expect(nextCycle.stageRange).toBe('Sun night');
      expect(nextCycle.reflectionVerse.ref).toBe('Lamentations 3:22-23');
      expect(nextCycle.callToAction.targetTab).toBe('growth');
    });

    it('falls back safely for unknown phase', () => {
      const fallback = getRitualPhaseGuidance('unknown_phase', VBT_ROLES.MEMBER);
      expect(fallback.phase).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
      expect(fallback.stageNumber).toBe(1);
    });
  });

  describe('formatRitualTimeline - Complete 6-Stage Timeline', () => {
    it('formats timeline with accurate status indicators and progress calculation', () => {
      // Wednesday afternoon 15:00 -> Midweek (Stage 2)
      const wedDate = new Date(2026, 9, 7, 15, 0);
      const timeline = formatRitualTimeline(wedDate);

      expect(timeline.currentPhase).toBe(WEEKLY_RITUAL_PHASE.MIDWEEK);
      expect(timeline.currentStageNumber).toBe(2);
      expect(timeline.currentStageIndex).toBe(1);
      expect(timeline.completionPercentage).toBe(33); // 2/6 = 33%
      expect(timeline.formattedSummary).toBe('Stage 2 of 6: Midweek (Wed - Thu)');

      expect(timeline.stages).toHaveLength(6);

      // Stage 1 should be completed
      expect(timeline.stages[0].id).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
      expect(timeline.stages[0].status).toBe('completed');
      expect(timeline.stages[0].isPast).toBe(true);
      expect(timeline.stages[0].isCurrent).toBe(false);

      // Stage 2 should be active
      expect(timeline.stages[1].id).toBe(WEEKLY_RITUAL_PHASE.MIDWEEK);
      expect(timeline.stages[1].status).toBe('active');
      expect(timeline.stages[1].isCurrent).toBe(true);

      // Stage 3 should be upcoming
      expect(timeline.stages[2].id).toBe(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
      expect(timeline.stages[2].status).toBe('upcoming');
      expect(timeline.stages[2].isUpcoming).toBe(true);

      // Stage 6 should be upcoming
      expect(timeline.stages[5].id).toBe(WEEKLY_RITUAL_PHASE.NEXT_CYCLE);
      expect(timeline.stages[5].status).toBe('upcoming');
    });

    it('formats Stage 6 accurately on Sunday night', () => {
      const sunNight = new Date(2026, 9, 11, 20, 0);
      const timeline = formatRitualTimeline(sunNight);

      expect(timeline.currentPhase).toBe(WEEKLY_RITUAL_PHASE.NEXT_CYCLE);
      expect(timeline.currentStageNumber).toBe(6);
      expect(timeline.completionPercentage).toBe(100);
      expect(timeline.stages[5].status).toBe('active');
      expect(timeline.stages[0].status).toBe('completed');
      expect(timeline.stages[4].status).toBe('completed');
    });
  });

  describe('Notification Schedules & Rate Limiting (Spam Prevention)', () => {
    it('provides valid notification schedule config for each phase', () => {
      RITUAL_PHASES_SEQUENCE.forEach((phase) => {
        const schedule = getNotificationSchedule(phase);
        expect(schedule.phase).toBe(phase);
        expect(schedule.title).toBeTruthy();
        expect(schedule.body).toBeTruthy();
        expect(schedule.cooldownHours).toBeGreaterThan(0);
        expect(schedule.maxNotificationsPerPhase).toBeGreaterThanOrEqual(1);
        expect(schedule.quietHours.startHour).toBe(22);
        expect(schedule.quietHours.endHour).toBe(8);

        const key = schedule.generateRateLimitKey(2026, 41);
        expect(key).toBe(`vbt_ritual_notif_2026_w41_${phase}`);
      });
    });

    it('blocks notifications during quiet hours (e.g. 11 PM or 5 AM)', () => {
      const lateNight = new Date(2026, 9, 7, 23, 15); // 11:15 PM
      const result = canSendPhaseNotification(WEEKLY_RITUAL_PHASE.MIDWEEK, null, {
        now: lateNight,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('QUIET_HOURS');

      const earlyMorning = new Date(2026, 9, 7, 5, 30); // 5:30 AM
      const earlyResult = canSendPhaseNotification(WEEKLY_RITUAL_PHASE.MIDWEEK, null, {
        now: earlyMorning,
      });
      expect(earlyResult.allowed).toBe(false);
      expect(earlyResult.reason).toBe('QUIET_HOURS');
    });

    it('bypasses quiet hours when ignoreQuietHours option is true', () => {
      const lateNight = new Date(2026, 9, 7, 23, 15);
      const result = canSendPhaseNotification(WEEKLY_RITUAL_PHASE.MIDWEEK, null, {
        now: lateNight,
        ignoreQuietHours: true,
      });

      expect(result.allowed).toBe(true);
    });

    it('enforces cooldown hours to prevent rapid duplicate notifications', () => {
      const now = new Date(2026, 9, 7, 14, 0); // 2:00 PM Wednesday
      const oneHourAgo = now.getTime() - 1 * 60 * 60 * 1000;

      // Midweek cooldown is 18 hours
      const result = canSendPhaseNotification(WEEKLY_RITUAL_PHASE.MIDWEEK, oneHourAgo, {
        now,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('COOLDOWN_ACTIVE');
      expect(result.nextAllowedTime).toBeInstanceOf(Date);
      expect(result.nextAllowedTime.getTime()).toBeGreaterThan(now.getTime());
    });

    it('allows notification once cooldown period has passed', () => {
      const now = new Date(2026, 9, 7, 14, 0); // 2:00 PM Wednesday
      const twentyHoursAgo = now.getTime() - 20 * 60 * 60 * 1000;

      const result = canSendPhaseNotification(WEEKLY_RITUAL_PHASE.MIDWEEK, twentyHoursAgo, {
        now,
      });

      expect(result.allowed).toBe(true);
    });

    it('enforces requireActivePhase option when set', () => {
      const monday = new Date(2026, 9, 5, 14, 0); // Monday = early_week
      const result = canSendPhaseNotification(WEEKLY_RITUAL_PHASE.MEETING_DAY, null, {
        now: monday,
        requireActivePhase: true,
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('PHASE_INACTIVE');
    });
  });

  describe('Sequence Traversal & Metadata Helpers', () => {
    it('returns all 6 phases in order via getAllRitualPhases', () => {
      const all = getAllRitualPhases();
      expect(all).toHaveLength(6);
      expect(all.map((p) => p.stageNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('cycles forward through phases with getNextPhase', () => {
      expect(getNextPhase(WEEKLY_RITUAL_PHASE.EARLY_WEEK)).toBe(WEEKLY_RITUAL_PHASE.MIDWEEK);
      expect(getNextPhase(WEEKLY_RITUAL_PHASE.MIDWEEK)).toBe(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
      expect(getNextPhase(WEEKLY_RITUAL_PHASE.BEFORE_EVENT)).toBe(WEEKLY_RITUAL_PHASE.MEETING_DAY);
      expect(getNextPhase(WEEKLY_RITUAL_PHASE.MEETING_DAY)).toBe(WEEKLY_RITUAL_PHASE.AFTER_EVENT);
      expect(getNextPhase(WEEKLY_RITUAL_PHASE.AFTER_EVENT)).toBe(WEEKLY_RITUAL_PHASE.NEXT_CYCLE);
      expect(getNextPhase(WEEKLY_RITUAL_PHASE.NEXT_CYCLE)).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
    });

    it('cycles backward through phases with getPreviousPhase', () => {
      expect(getPreviousPhase(WEEKLY_RITUAL_PHASE.EARLY_WEEK)).toBe(WEEKLY_RITUAL_PHASE.NEXT_CYCLE);
      expect(getPreviousPhase(WEEKLY_RITUAL_PHASE.MIDWEEK)).toBe(WEEKLY_RITUAL_PHASE.EARLY_WEEK);
      expect(getPreviousPhase(WEEKLY_RITUAL_PHASE.NEXT_CYCLE)).toBe(WEEKLY_RITUAL_PHASE.AFTER_EVENT);
    });

    it('retrieves phase reflection scripture', () => {
      const verse = getPhaseReflectionVerse(WEEKLY_RITUAL_PHASE.BEFORE_EVENT);
      expect(verse.ref).toBe('1 Corinthians 14:40');
      expect(verse.arabic).toBeTruthy();
    });

    it('retrieves metadata for a given phase', () => {
      const meta = getRitualPhaseMeta(WEEKLY_RITUAL_PHASE.MEETING_DAY);
      expect(meta.name).toBe('Meeting Day');
      expect(meta.days).toBe('Fri evening / Tue evening');
      expect(meta.stageNumber).toBe(4);
    });
  });
});
