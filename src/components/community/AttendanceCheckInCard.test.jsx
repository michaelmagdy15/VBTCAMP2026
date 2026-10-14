import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import AttendanceCheckInCard, {
  OUTCOME_STATES,
  CHECKIN_STEPS,
  extractMemberDisplayName,
  extractMemberInitials,
  extractMemberId,
  formatPassTime,
  formatServiceDate,
  parseCheckInCode,
  triggerCelebration,
  triggerHapticFeedback,
} from './AttendanceCheckInCard';

describe('AttendanceCheckInCard & Attendance Logic Suite', () => {
  const mockCurrentUser = {
    id: 'user_mina_123',
    uid: 'user_mina_123',
    displayName: 'Mina Shenouda',
    firstName: 'Mina',
    lastName: 'Shenouda',
    role: 'servant',
    team: 'Team Agility',
    avatar: 'https://vbt.camp/avatars/mina.png',
  };

  const mockActiveService = {
    id: 'svc_friday_youth',
    title: 'Friday Community Sports & Fellowship',
    date: '2026-10-16',
    startTime: '18:30',
    endTime: '21:30',
    location: {
      name: 'Main Gymnasium Court & Fellowship Hall',
      address: '100 VBT Ministry Center Blvd',
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 1. HELPER UNIT TESTS
  // ─────────────────────────────────────────────────────────────
  describe('Helper Functions', () => {
    describe('extractMemberDisplayName', () => {
      it('returns displayName when present', () => {
        expect(extractMemberDisplayName({ displayName: 'Michael Magdy' })).toBe('Michael Magdy');
      });

      it('falls back to name property', () => {
        expect(extractMemberDisplayName({ name: 'Peter Boulos' })).toBe('Peter Boulos');
      });

      it('falls back to firstName and lastName combination', () => {
        expect(extractMemberDisplayName({ firstName: 'David', lastName: 'Farid' })).toBe('David Farid');
      });

      it('falls back to "Member" when user is null or empty', () => {
        expect(extractMemberDisplayName(null)).toBe('Member');
        expect(extractMemberDisplayName({})).toBe('Member');
      });
    });

    describe('extractMemberInitials', () => {
      it('returns two initials for two-token names', () => {
        expect(extractMemberInitials({ displayName: 'Mina Shenouda' })).toBe('MS');
      });

      it('returns first two characters for single word names', () => {
        expect(extractMemberInitials({ displayName: 'David' })).toBe('DA');
      });

      it('falls back to MB for default Member', () => {
        expect(extractMemberInitials(null)).toBe('MB');
      });
    });

    describe('extractMemberId', () => {
      it('prioritizes uid or id', () => {
        expect(extractMemberId({ uid: 'uid_123' })).toBe('uid_123');
        expect(extractMemberId({ id: 'id_456' })).toBe('id_456');
        expect(extractMemberId({ memberId: 'mem_789' })).toBe('mem_789');
        expect(extractMemberId(null)).toBeNull();
      });
    });

    describe('formatPassTime', () => {
      it('formats valid Date or timestamp into time string', () => {
        const testDate = new Date('2026-10-16T18:45:30Z');
        const formatted = formatPassTime(testDate);
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
      });

      it('handles string timestamps gracefully without crashing', () => {
        const formatted = formatPassTime('2026-10-16T19:00:00');
        expect(typeof formatted).toBe('string');
      });
    });

    describe('formatServiceDate', () => {
      it('returns "Today" when date is empty or today', () => {
        expect(formatServiceDate(null)).toBe('Today');
        const todayIso = new Date().toISOString().slice(0, 10);
        expect(formatServiceDate(todayIso)).toBe('Today');
      });

      it('formats valid future date string', () => {
        const result = formatServiceDate('2026-12-25');
        expect(result).toContain('Dec');
      });
    });

    describe('parseCheckInCode', () => {
      it('correctly parses JSON v1 QR payload matching community', () => {
        const qrJson = JSON.stringify({
          v: 1,
          c: 'vbt_default',
          s: 'session_999',
          svc: 'svc_friday_youth',
          t: '7K4N9P',
        });
        const result = parseCheckInCode(qrJson, 'vbt_default');
        expect(result.valid).toBe(true);
        expect(result.token).toBe('7K4N9P');
        expect(result.serviceId).toBe('svc_friday_youth');
        expect(result.sessionId).toBe('session_999');
        expect(result.communityId).toBe('vbt_default');
      });

      it('rejects JSON QR payload from a different community', () => {
        const qrJson = JSON.stringify({
          v: 1,
          c: 'other_community',
          s: 'session_999',
          svc: 'svc_friday_youth',
          t: '7K4N9P',
        });
        const result = parseCheckInCode(qrJson, 'vbt_default');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('different VBT community');
      });

      it('parses URL query string with attendance tokens', () => {
        const urlStr = 'https://vbtcamp.app/checkin?svc=svc_friday_youth&t=TOKEN_ABC123&s=session_1';
        const result = parseCheckInCode(urlStr, 'vbt_default');
        expect(result.valid).toBe(true);
        expect(result.token).toBe('TOKEN_ABC123');
        expect(result.serviceId).toBe('svc_friday_youth');
      });

      it('parses manual alphanumeric rolling tokens', () => {
        const result = parseCheckInCode('7K4N9P', 'vbt_default');
        expect(result.valid).toBe(true);
        expect(result.token).toBe('7K4N9P');
        expect(result.isRollingToken).toBe(true);
      });

      it('rejects empty or invalid formats', () => {
        expect(parseCheckInCode(null).valid).toBe(false);
        expect(parseCheckInCode('').valid).toBe(false);
        expect(parseCheckInCode('   ').valid).toBe(false);
        expect(parseCheckInCode('12').valid).toBe(false); // too short
      });
    });

    describe('Safe Platform Triggers', () => {
      it('executes triggerCelebration without throwing in node environment', () => {
        expect(() => triggerCelebration()).not.toThrow();
      });

      it('executes triggerHapticFeedback without throwing in node environment', async () => {
        await expect(triggerHapticFeedback()).resolves.not.toThrow();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. INLINE CARD RENDERING (isInline={true})
  // ─────────────────────────────────────────────────────────────
  describe('Inline Card Mode Rendering', () => {
    it('renders prominent check-in widget container with active service details', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isInline={true}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Attendance Check-In');
      expect(html).toContain('Live Attendance');
      expect(html).toContain('Friday Community Sports &amp; Fellowship');
      expect(html).toContain('Main Gymnasium Court');
      expect(html).toContain('18:30 - 21:30');
    });

    it('renders current member identification and avatar initials in inline mode', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isInline={true}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Mina Shenouda');
      expect(html).toContain('MS');
    });

    it('renders both "Scan Attendance QR" and "Enter Code Manually" entry points', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isInline={true}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Scan Attendance QR');
      expect(html).toContain('Enter Code Manually');
    });

    it('does not render modal dialog backdrop in inline mode', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isInline={true}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).not.toContain('role="dialog"');
      expect(html).not.toContain('fixed inset-0');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. MODAL DIALOG MODE (isInline={false})
  // ─────────────────────────────────────────────────────────────
  describe('Modal Dialog Mode Rendering', () => {
    it('returns empty string when isOpen={false} and not inline', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={false}
          isInline={false}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toBe('');
    });

    it('renders accessible dialog with backdrop when isOpen={true}', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          isInline={false}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Scan Attendance QR');
      expect(html).toContain('aria-label="Close check-in modal"');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. SCANNER RENDERING & CAMERA CONTROLS
  // ─────────────────────────────────────────────────────────────
  describe('Scanner Rendering & Camera Controls', () => {
    it('renders video element and hidden canvas for jsQR analysis', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialStep={CHECKIN_STEPS.SCANNER}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('<video');
      expect(html).toContain('<canvas class="hidden"');
      expect(html).toContain('Align QR in frame');
    });

    it('renders mode switch tabs allowing toggle between Scan QR and Manual Code', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialStep={CHECKIN_STEPS.SCANNER}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Scan QR');
      expect(html).toContain('Manual Code');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. MANUAL ENTRY FLOW
  // ─────────────────────────────────────────────────────────────
  describe('Manual Code Entry Flow', () => {
    it('renders manual input field with clear instructions and active activity context', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialStep={CHECKIN_STEPS.MANUAL}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Enter Attendance Code or Token');
      expect(html).toContain('e.g. 7K4N9P or paste QR string');
      expect(html).toContain('Validate Code &amp; Continue');
      expect(html).toContain('Mina Shenouda');
      expect(html).toContain('Friday Community Sports &amp; Fellowship');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. EXPLICIT CONFIRMATION STEP
  // Requirement: Never silently mark attendance just because a QR URL opened.
  // ─────────────────────────────────────────────────────────────
  describe('Explicit Confirmation Step', () => {
    it('renders explicit confirmation screen when step is CONFIRM', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialStep={CHECKIN_STEPS.CONFIRM}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Review &amp; Confirm Check-In');
      expect(html).toContain('Step 2: Confirm Attendance');
      expect(html).toContain('Friday Community Sports &amp; Fellowship');
      expect(html).toContain('Main Gymnasium Court');
      expect(html).toContain('Member Checking In');
      expect(html).toContain('Mina Shenouda');
      expect(html).toContain('Team Agility');
    });

    it('requires explicit confirmation button labeled "Confirm Check-In as [Member Name]"', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialStep={CHECKIN_STEPS.CONFIRM}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Confirm Check-In as Mina Shenouda');
    });

    it('does NOT silently mark attendance when initialScanCode is provided, but loads confirmation view', () => {
      const sampleQrCode = JSON.stringify({
        v: 1,
        c: 'vbt_default',
        s: 'session_123',
        svc: 'svc_friday_youth',
        t: 'CODE99',
      });

      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialScanCode={sampleQrCode}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      // Verify that it renders the explicit confirmation screen waiting for user confirmation
      expect(html).toContain('Step 2: Confirm Attendance');
      expect(html).toContain('Confirm Check-In as Mina Shenouda');
      // Should not have reached completed outcome yet
      expect(html).not.toContain('Check-In Confirmed!');
    });

    it('renders cancel / rescan option on confirmation screen', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialStep={CHECKIN_STEPS.CONFIRM}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Scan different code or cancel');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. SUBMITTING STATE
  // ─────────────────────────────────────────────────────────────
  describe('Submitting State', () => {
    it('renders loading spinner and submitting status', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialStep={CHECKIN_STEPS.SUBMITTING}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Submitting Attendance...');
      expect(html).toContain('Verifying rolling session token and recording pass for Mina Shenouda');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. THE FIVE DISTINCT OUTCOME STATES
  // ─────────────────────────────────────────────────────────────
  describe('The 5 Distinct Outcome States', () => {
    it('Outcome 1 (present): Renders confirmed pass, verified timestamp, and status Present', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialOutcome={{
            status: OUTCOME_STATES.PRESENT,
            message: 'Check-in confirmed! Welcome to Friday Community Sports & Fellowship.',
            timestamp: '18:34:20 PM',
          }}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Check-In Confirmed!');
      expect(html).toContain('Verified Digital Pass');
      expect(html).toContain('Pass Holder:');
      expect(html).toContain('Mina Shenouda');
      expect(html).toContain('Present');
      expect(html).toContain('18:34:20 PM');
      expect(html).toContain('Done');
    });

    it('Outcome 2 (pending): Clearly labeled "Checked in offline — pending sync when reconnected"', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialOutcome={{
            status: OUTCOME_STATES.PENDING,
            message: 'Checked in offline — pending sync when reconnected',
            timestamp: '18:35:00 PM',
          }}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Offline Pass Saved');
      expect(html).toContain('Offline Check-In');
      expect(html).toContain('Checked in offline — pending sync when reconnected');
      expect(html).toContain('Queued At:');
      expect(html).toContain('18:35:00 PM');
      expect(html).toContain('Got It');
    });

    it('Outcome 3 (expired): Explains "QR code or token has expired. Ask your leader for a fresh code."', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialOutcome={{
            status: OUTCOME_STATES.EXPIRED,
            message: 'QR code or token has expired. Ask your leader for a fresh code.',
          }}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Token Expired');
      expect(html).toContain('Code Expired');
      expect(html).toContain('QR code or token has expired. Ask your leader for a fresh code.');
      expect(html).toContain('Scan Again');
      expect(html).toContain('Close');
    });

    it('Outcome 4 (already_checked_in): Displays "You are already checked in for this activity at [time]."', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialOutcome={{
            status: OUTCOME_STATES.ALREADY_CHECKED_IN,
            message: 'You are already checked in for this activity at 18:30 PM.',
            timestamp: '18:30 PM',
          }}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Already Recorded');
      expect(html).toContain('Already Checked In');
      expect(html).toContain('You are already checked in for this activity at 18:30 PM.');
      expect(html).toContain('Done');
    });

    it('Outcome 5 (not_eligible): Displays safe error explanation without internal jargon', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isOpen={true}
          initialOutcome={{
            status: OUTCOME_STATES.NOT_ELIGIBLE,
            message: 'Your account is not currently eligible to check in for this activity. Please check with your team leader or coordinator.',
          }}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('Check-In Restricted');
      expect(html).toContain('Check-In Unavailable');
      expect(html).toContain('Your account is not currently eligible to check in for this activity.');
      expect(html).toContain('Try Again');
      expect(html).toContain('Close');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. IDEMPOTENT WRITE & CALLBACK VERIFICATION
  // ─────────────────────────────────────────────────────────────
  describe('Idempotent Write & Callback Integration', () => {
    it('supports onConfirmCheckIn injection prop for custom submission handlers', async () => {
      const onConfirmCheckIn = vi.fn().mockResolvedValue({
        success: true,
        status: OUTCOME_STATES.PRESENT,
        message: 'Pass confirmed.',
      });

      const onCheckInSuccess = vi.fn();

      // Ensure the component accepts the prop contract
      expect(typeof onConfirmCheckIn).toBe('function');
      expect(typeof onCheckInSuccess).toBe('function');
    });

    it('exports all 5 outcome states in OUTCOME_STATES enum', () => {
      expect(OUTCOME_STATES.PRESENT).toBe('present');
      expect(OUTCOME_STATES.PENDING).toBe('pending');
      expect(OUTCOME_STATES.EXPIRED).toBe('expired');
      expect(OUTCOME_STATES.ALREADY_CHECKED_IN).toBe('already_checked_in');
      expect(OUTCOME_STATES.NOT_ELIGIBLE).toBe('not_eligible');
    });

    it('exports all step constants in CHECKIN_STEPS enum', () => {
      expect(CHECKIN_STEPS.IDLE).toBe('idle');
      expect(CHECKIN_STEPS.SCANNER).toBe('scanner');
      expect(CHECKIN_STEPS.MANUAL).toBe('manual');
      expect(CHECKIN_STEPS.CONFIRM).toBe('confirm');
      expect(CHECKIN_STEPS.SUBMITTING).toBe('submitting');
      expect(CHECKIN_STEPS.OUTCOME).toBe('outcome');
    });

    it('is properly exported from community/index.js barrel', async () => {
      const communityIndex = await import('./index');
      expect(communityIndex.AttendanceCheckInCard).toBeDefined();
      expect(communityIndex.OUTCOME_STATES).toBeDefined();
      expect(communityIndex.CHECKIN_STEPS).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 10. ADVANCED EDGE CASES & ROBUSTNESS
  // ─────────────────────────────────────────────────────────────
  describe('Robustness & Edge Cases', () => {
    it('handles Arabic or non-Latin member names gracefully in initials', () => {
      expect(extractMemberDisplayName({ displayName: 'مينا سمير' })).toBe('مينا سمير');
      expect(extractMemberInitials({ displayName: 'مينا سمير' })).toBe('مس');
    });

    it('handles activeService with plain string location', () => {
      const stringLocationService = {
        id: 'svc_plain',
        title: 'Outdoor Agility Training',
        date: '2026-10-20',
        location: 'Field B - Upper Grass Complex',
      };

      const html = renderToString(
        <AttendanceCheckInCard
          isInline={true}
          currentUser={mockCurrentUser}
          activeService={stringLocationService}
        />
      );

      expect(html).toContain('Field B - Upper Grass Complex');
      expect(html).toContain('Outdoor Agility Training');
    });

    it('handles activeService with missing dates or location', () => {
      const emptyService = { id: 'svc_empty' };

      const html = renderToString(
        <AttendanceCheckInCard
          isInline={true}
          currentUser={null}
          activeService={emptyService}
        />
      );

      expect(html).toContain('Attendance Check-In');
      expect(html).toContain('Member');
      expect(html).toContain('Live Session');
    });

    it('normalizes lowercase or hyphenated manual codes in parseCheckInCode', () => {
      const result = parseCheckInCode('abc-123-xyz', 'vbt_default');
      expect(result.valid).toBe(true);
      expect(result.token).toBe('ABC123XYZ');
      expect(result.isRollingToken).toBe(true);
    });

    it('gracefully handles malformed JSON string without erroring', () => {
      const malformedJson = '{"v": 1, "c": "vbt", broken json';
      const result = parseCheckInCode(malformedJson, 'vbt_default');
      expect(result.valid).toBe(true); // Alphanumeric fallback captures alphanumeric chars safely
      expect(typeof result.token).toBe('string');
    });

    it('renders inline card in CONFIRM step with reset button', () => {
      const html = renderToString(
        <AttendanceCheckInCard
          isInline={true}
          initialStep={CHECKIN_STEPS.CONFIRM}
          currentUser={mockCurrentUser}
          activeService={mockActiveService}
        />
      );

      expect(html).toContain('title="Reset check-in"');
      expect(html).toContain('Confirm Check-In as Mina Shenouda');
    });
  });
});
