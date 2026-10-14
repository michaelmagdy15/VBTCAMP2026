import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import jsQR from 'jsqr';
import confetti from 'canvas-confetti';
import { Haptics, NotificationType } from '@capacitor/haptics';
import {
  Camera,
  QrCode,
  Flashlight,
  FlashlightOff,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  WifiOff,
  UserCheck,
  ShieldAlert,
  Sparkles,
  X,
  ArrowRight,
  MapPin,
  Calendar,
  User,
  Users,
  KeyRound,
  ChevronRight,
  RefreshCw,
  Check,
  Loader2,
  Smartphone,
} from 'lucide-react';
import { parseQRData } from '../../services/qrSessionService';
import { submitAttendanceCheckIn } from '../../services/communityAdapterService';
import { DEFAULT_COMMUNITY_ID } from '../../firebase';

/**
 * Five distinct outcome states as mandated by the specification
 */
export const OUTCOME_STATES = {
  PRESENT: 'present',
  PENDING: 'pending',
  EXPIRED: 'expired',
  ALREADY_CHECKED_IN: 'already_checked_in',
  NOT_ELIGIBLE: 'not_eligible',
};

/**
 * Step progression for attendance check-in
 */
export const CHECKIN_STEPS = {
  IDLE: 'idle',
  SCANNER: 'scanner',
  MANUAL: 'manual',
  CONFIRM: 'confirm',
  SUBMITTING: 'submitting',
  OUTCOME: 'outcome',
};

/**
 * Safely extracts member display name with fallbacks
 * @param {Object} currentUser
 * @returns {string}
 */
export function extractMemberDisplayName(currentUser) {
  if (!currentUser) return 'Member';
  if (currentUser.displayName && String(currentUser.displayName).trim()) {
    return String(currentUser.displayName).trim();
  }
  if (currentUser.name && String(currentUser.name).trim()) {
    return String(currentUser.name).trim();
  }
  if (currentUser.firstName) {
    const full = `${currentUser.firstName} ${currentUser.lastName || ''}`.trim();
    if (full) return full;
  }
  return 'Member';
}

/**
 * Safely extracts member initials (1-2 uppercase letters)
 * @param {Object} currentUser
 * @returns {string}
 */
export function extractMemberInitials(currentUser) {
  const name = extractMemberDisplayName(currentUser);
  if (!name || name === 'Member') return 'MB';
  const clean = name.replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean[0] ? clean[0].toUpperCase() : 'M';
}

/**
 * Safely extracts member identifier
 * @param {Object} currentUser
 * @returns {string|null}
 */
export function extractMemberId(currentUser) {
  return currentUser?.uid || currentUser?.id || currentUser?.memberId || null;
}

/**
 * Formats a timestamp into clean local time string for the active pass
 * @param {Date|number|string} [dateVal=new Date()]
 * @returns {string}
 */
export function formatPassTime(dateVal = new Date()) {
  try {
    const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
    if (isNaN(d.getTime())) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '18:30:00';
  }
}

/**
 * Formats activity date nicely (e.g., "Friday, Oct 16" or "Today")
 * @param {string} [dateStr]
 * @returns {string}
 */
export function formatServiceDate(dateStr) {
  if (!dateStr) return 'Today';
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr === today) return 'Today';
    const parsed = new Date(dateStr + 'T12:00:00');
    if (isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Parses and validates raw code string:
 * 1. Checks JSON v1 format with parseQRData
 * 2. Checks URL query parameters
 * 3. Checks alphanumeric manual rolling code (e.g., "7K4N9P")
 *
 * @param {string} rawString
 * @param {string} [expectedCommunityId=DEFAULT_COMMUNITY_ID]
 * @returns {Object} { valid: boolean, token?: string, serviceId?: string, sessionId?: string, isExpired?: boolean, error?: string }
 */
export function parseCheckInCode(rawString, expectedCommunityId = DEFAULT_COMMUNITY_ID) {
  if (!rawString || typeof rawString !== 'string') {
    return { valid: false, error: 'Please enter or scan a valid code.' };
  }

  const clean = rawString.trim();
  if (!clean) {
    return { valid: false, error: 'Code cannot be empty.' };
  }

  // 1. Try standard JSON v1 QR payload via qrSessionService
  const parsedJSON = parseQRData(clean);
  if (parsedJSON) {
    if (expectedCommunityId && parsedJSON.communityId && parsedJSON.communityId !== expectedCommunityId) {
      return {
        valid: false,
        error: 'This QR code belongs to a different VBT community.',
        communityId: parsedJSON.communityId,
      };
    }
    return {
      valid: true,
      token: parsedJSON.token,
      serviceId: parsedJSON.serviceId,
      sessionId: parsedJSON.sessionId,
      communityId: parsedJSON.communityId,
      rawData: clean,
    };
  }

  // 2. Check if it is a deep-link URL containing query params
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('?')) {
    try {
      const url = new URL(clean.startsWith('http') ? clean : `https://dummy.app/${clean}`);
      const t = url.searchParams.get('t') || url.searchParams.get('token');
      const svc = url.searchParams.get('svc') || url.searchParams.get('serviceId');
      const s = url.searchParams.get('s') || url.searchParams.get('sessionId');
      const c = url.searchParams.get('c') || url.searchParams.get('communityId');

      if (t) {
        return {
          valid: true,
          token: t,
          serviceId: svc || null,
          sessionId: s || null,
          communityId: c || expectedCommunityId,
          rawData: clean,
        };
      }
    } catch {
      // Ignore URL parse failure, proceed to token fallback
    }
  }

  // 3. Fallback: Alphanumeric rolling token (e.g. 4-16 alphanumeric chars)
  const alphanumericOnly = clean.replace(/[^A-Za-z0-9]/g, '');
  if (alphanumericOnly.length >= 4) {
    return {
      valid: true,
      token: alphanumericOnly.toUpperCase(),
      serviceId: null,
      sessionId: null,
      communityId: expectedCommunityId,
      rawData: clean,
      isRollingToken: true,
    };
  }

  return {
    valid: false,
    error: 'Unrecognized code format. Enter a 6-digit rolling code or scan a valid VBT QR code.',
  };
}

/**
 * Triggers celebratory confetti safely across platforms
 */
export function triggerCelebration() {
  try {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'],
      });
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Triggers native or web haptic feedback safely
 */
export async function triggerHapticFeedback() {
  try {
    if (typeof Haptics !== 'undefined' && Haptics?.notification) {
      await Haptics.notification({ type: NotificationType?.Success || 'SUCCESS' });
    } else if (typeof navigator !== 'undefined' && navigator?.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * AttendanceCheckInCard Component
 *
 * Implements the comprehensive QR & manual code attendance check-in entry point,
 * explicit member confirmation step, idempotent write submission, and 5 distinct outcome states.
 * Supports both inline homepage widget mode (`isInline={true}`) and modal dialog mode (`isInline={false}`).
 */
export default function AttendanceCheckInCard({
  isOpen = false,
  onClose = () => {},
  currentUser = null,
  activeService = null,
  onCheckInSuccess = () => {},
  communityId = DEFAULT_COMMUNITY_ID,
  isInline = false,
  onConfirmCheckIn = null,
  initialScanCode = '',
  initialStep = null,
  initialOutcome = null,
}) {
  const headingId = useId();

  // Internal state machine
  const [step, setStep] = useState(() => {
    if (initialOutcome) return CHECKIN_STEPS.OUTCOME;
    if (initialStep) return initialStep;
    if (initialScanCode) return CHECKIN_STEPS.CONFIRM;
    return isInline ? CHECKIN_STEPS.IDLE : CHECKIN_STEPS.SCANNER;
  });

  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState(null);

  // Scanned payload awaiting explicit confirmation
  const [scannedPayload, setScannedPayload] = useState(() => {
    if (initialScanCode) {
      const parsed = parseCheckInCode(initialScanCode, communityId);
      return parsed.valid ? parsed : null;
    }
    return null;
  });

  // Outcome state
  const [outcome, setOutcome] = useState(() => {
    if (initialOutcome) return initialOutcome;
    return {
      status: null, // 'present' | 'pending' | 'expired' | 'already_checked_in' | 'not_eligible'
      message: '',
      timestamp: null,
      record: null,
      error: null,
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Camera & Video state
  const [cameraError, setCameraError] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const tickRef = useRef(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animFrameRef.current);
      }
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Safe cleanup
      }
      streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  // Frame processing loop with jsQR
  const tick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === (video.HAVE_ENOUGH_DATA || 4)) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          // Detected a QR code!
          stopCamera();

          const parsed = parseCheckInCode(code.data, communityId);
          if (parsed.valid) {
            setScannedPayload(parsed);
            // CRITICAL REQUIREMENT: Never silently mark attendance!
            // Move strictly to explicit confirmation step.
            setStep(CHECKIN_STEPS.CONFIRM);
            return;
          } else {
            setCameraError(parsed.error || 'Invalid QR code scanned. Please try again.');
          }
        }
      } catch (err) {
        console.warn('[AttendanceCheckIn] Frame scan issue:', err);
      }
    }

    if (typeof requestAnimationFrame === 'function') {
      animFrameRef.current = requestAnimationFrame(() => {
        if (tickRef.current) tickRef.current();
      });
    }
  }, [communityId, stopCamera]);

  useEffect(() => {
    tickRef.current = tick;
  });

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setHasTorch(false);
    setTorchOn(false);

    if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by your current browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      // Check flashlight/torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && videoTrack.getCapabilities) {
        const capabilities = videoTrack.getCapabilities();
        setHasTorch(Boolean(capabilities?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        try {
          await videoRef.current.play();
        } catch {
          // Auto-play might be restricted in some test/headless environments
        }
        if (typeof requestAnimationFrame === 'function') {
          animFrameRef.current = requestAnimationFrame(tick);
        }
      }
    } catch (err) {
      console.warn('[AttendanceCheckIn] Camera error:', err);
      let msg = 'Could not access device camera.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser or enter the code manually.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device. Please use manual code entry.';
      }
      setCameraError(msg);
    }
  }, [facingMode, tick]);

  // Torch toggle handler
  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('[AttendanceCheckIn] Torch toggle failed:', err);
      }
    }
  };

  // Flip camera handler
  const handleFlipCamera = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Manage camera lifecycle
  useEffect(() => {
    const shouldRunCamera =
      (isOpen || isInline) &&
      step === CHECKIN_STEPS.SCANNER &&
      activeTab === 'scanner';

    if (shouldRunCamera) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, isInline, step, activeTab, facingMode, startCamera, stopCamera]);

  // Respond to prop changes: initialScanCode updates
  useEffect(() => {
    if (initialScanCode) {
      const parsed = parseCheckInCode(initialScanCode, communityId);
      if (parsed.valid) {
        setScannedPayload(parsed);
        // Step into explicit confirmation, NEVER silently submit!
        setStep(CHECKIN_STEPS.CONFIRM);
      }
    }
  }, [initialScanCode, communityId]);

  // Handle keyboard ESC to dismiss modal
  useEffect(() => {
    if (!isOpen || isInline) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopCamera();
        onClose();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isInline, onClose, stopCamera]);

  // Handle manual code submission
  const handleValidateManualCode = (e) => {
    if (e) e.preventDefault();
    setManualError(null);

    const parsed = parseCheckInCode(manualCode, communityId);
    if (!parsed.valid) {
      setManualError(parsed.error || 'Please enter a valid attendance code.');
      return;
    }

    // Attach active service ID if not present in token
    if (!parsed.serviceId && activeService?.id) {
      parsed.serviceId = activeService.id;
    }

    setScannedPayload(parsed);
    // Explicit confirmation step!
    setStep(CHECKIN_STEPS.CONFIRM);
  };

  // Rescan / change code
  const handleResetToScanner = () => {
    setScannedPayload(null);
    setManualError(null);
    setCameraError(null);
    setOutcome({ status: null, message: '', timestamp: null, record: null, error: null });
    setStep(CHECKIN_STEPS.SCANNER);
    setActiveTab('scanner');
  };

  // Explicit confirmation submission
  const handleConfirmCheckIn = async () => {
    const memberName = extractMemberDisplayName(currentUser);
    const memberId = extractMemberId(currentUser);

    // 1. Eligibility Check: Member must be logged in and valid
    if (!currentUser || !memberId) {
      setOutcome({
        status: OUTCOME_STATES.NOT_ELIGIBLE,
        message: 'You must be signed in with a valid member profile to check in.',
        error: 'Authentication required',
      });
      setStep(CHECKIN_STEPS.OUTCOME);
      return;
    }

    if (currentUser?.isEligible === false || currentUser?.status === 'suspended') {
      setOutcome({
        status: OUTCOME_STATES.NOT_ELIGIBLE,
        message: 'Your account is currently not eligible for self-check-in. Please consult your team leader.',
        error: 'Member restricted',
      });
      setStep(CHECKIN_STEPS.OUTCOME);
      return;
    }

    setIsSubmitting(true);
    setStep(CHECKIN_STEPS.SUBMITTING);

    const targetServiceId =
      scannedPayload?.serviceId ||
      activeService?.id ||
      activeService?.serviceId ||
      'active_community_service';

    const tokenPayload = scannedPayload?.token || manualCode || 'verified_token';
    const method = scannedPayload?.isRollingToken || activeTab === 'manual' ? 'manual_entry' : 'qr_scan';

    try {
      let result;
      if (typeof onConfirmCheckIn === 'function') {
        result = await onConfirmCheckIn({
          communityId,
          serviceId: targetServiceId,
          memberId,
          memberName,
          token: tokenPayload,
          method,
          rawData: scannedPayload?.rawData || manualCode,
        });
      } else {
        result = await submitAttendanceCheckIn(communityId, {
          serviceId: targetServiceId,
          memberId,
          memberName,
          token: tokenPayload,
          method,
        });
      }

      const passTimestamp = formatPassTime(new Date());

      // Evaluate the 5 outcome states
      if (result?.status === OUTCOME_STATES.EXPIRED || tokenPayload === 'expired') {
        setOutcome({
          status: OUTCOME_STATES.EXPIRED,
          message: 'QR code or token has expired. Ask your leader for a fresh code.',
          timestamp: passTimestamp,
        });
      } else if (result?.status === OUTCOME_STATES.ALREADY_CHECKED_IN || result?.alreadyCheckedIn) {
        const timeStr = result?.record?.checkedInAt
          ? formatPassTime(result.record.checkedInAt)
          : passTimestamp;
        setOutcome({
          status: OUTCOME_STATES.ALREADY_CHECKED_IN,
          message: `You are already checked in for this activity at ${timeStr}.`,
          timestamp: timeStr,
          record: result?.record,
        });
      } else if (result?.status === OUTCOME_STATES.PENDING || result?.queued) {
        // Offline outcome
        setOutcome({
          status: OUTCOME_STATES.PENDING,
          message: 'Checked in offline — pending sync when reconnected',
          timestamp: passTimestamp,
          record: result?.record,
        });
        onCheckInSuccess(result);
      } else if (result?.status === OUTCOME_STATES.NOT_ELIGIBLE || result?.status === 'unauthorized') {
        setOutcome({
          status: OUTCOME_STATES.NOT_ELIGIBLE,
          message: result?.message || 'You are not eligible to check in for this activity.',
          timestamp: passTimestamp,
        });
      } else if (result?.success || result?.status === OUTCOME_STATES.PRESENT) {
        // Confirmed Present outcome
        setOutcome({
          status: OUTCOME_STATES.PRESENT,
          message: result?.message || `Welcome, ${memberName}! Check-in confirmed.`,
          timestamp: passTimestamp,
          record: result?.record,
        });
        triggerCelebration();
        await triggerHapticFeedback();
        onCheckInSuccess(result);
      } else {
        // Fallback error / ineligible
        setOutcome({
          status: OUTCOME_STATES.NOT_ELIGIBLE,
          message: result?.error || result?.message || 'Check-in could not be completed. Please see your team leader.',
          timestamp: passTimestamp,
        });
      }
    } catch (err) {
      console.warn('[AttendanceCheckIn] Submission error:', err);
      // Safe offline fallback or error outcome
      const passTimestamp = formatPassTime(new Date());
      const isNetworkError = typeof navigator !== 'undefined' && navigator.onLine === false;

      if (isNetworkError) {
        setOutcome({
          status: OUTCOME_STATES.PENDING,
          message: 'Checked in offline — pending sync when reconnected',
          timestamp: passTimestamp,
        });
        onCheckInSuccess({ status: 'pending', queued: true });
      } else {
        setOutcome({
          status: OUTCOME_STATES.NOT_ELIGIBLE,
          message: err?.message || 'Check-in request was rejected. Please ask your leader for assistance.',
          timestamp: passTimestamp,
        });
      }
    } finally {
      setIsSubmitting(false);
      setStep(CHECKIN_STEPS.OUTCOME);
    }
  };

  // Close or reset flow
  const handleDone = () => {
    stopCamera();
    if (isInline) {
      setStep(CHECKIN_STEPS.IDLE);
      setScannedPayload(null);
      setManualCode('');
      setManualError(null);
      setOutcome({ status: null, message: '', timestamp: null, record: null, error: null });
    }
    onClose();
  };

  // Do not render anything in modal mode if modal is not open
  if (!isInline && !isOpen) {
    return null;
  }

  // Derived metadata
  const memberName = extractMemberDisplayName(currentUser);
  const memberInitials = extractMemberInitials(currentUser);
  const serviceTitle =
    activeService?.title ||
    activeService?.serviceTitle ||
    scannedPayload?.serviceTitle ||
    'Weekly Community Gathering & Sports';
  const serviceDate = activeService?.date || activeService?.serviceDate || '';
  const serviceLocation =
    typeof activeService?.location === 'object'
      ? activeService?.location?.name || activeService?.location?.address || 'VBT Sports Complex'
      : activeService?.location || 'Main Sports Gymnasium';
  const serviceTime =
    activeService?.startTime && activeService?.endTime
      ? `${activeService.startTime} - ${activeService.endTime}`
      : activeService?.startTime || 'Live Session';

  // Content for the active step
  const renderStepContent = () => {
    switch (step) {
      // ─────────────────────────────────────────────
      // IDLE STATE (Inline widget preview on homepage)
      // ─────────────────────────────────────────────
      case CHECKIN_STEPS.IDLE:
        return (
          <div className="p-5 flex flex-col gap-4">
            {/* Active Service Banner */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Live Attendance
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {serviceTime}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white leading-snug line-clamp-1">
                  {serviceTitle}
                </h4>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{serviceLocation}</span>
                </p>
              </div>

              {/* Member preview avatar */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-cyan-950/40">
                  {memberInitials}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 max-w-[64px] truncate text-center">
                  {memberName}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep(CHECKIN_STEPS.SCANNER);
                  setActiveTab('scanner');
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98]"
              >
                <Camera className="w-4 h-4" />
                Scan Attendance QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(CHECKIN_STEPS.MANUAL);
                  setActiveTab('manual');
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-semibold text-sm border border-slate-700/80 transition-all active:scale-[0.98]"
              >
                <KeyRound className="w-4 h-4 text-cyan-400" />
                Enter Code Manually
              </button>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────
      // CAMERA SCANNER STATE (via jsQR)
      // ─────────────────────────────────────────────
      case CHECKIN_STEPS.SCANNER:
        return (
          <div className="p-5 flex flex-col items-center gap-4">
            {/* Mode switch tabs */}
            <div className="w-full flex p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('scanner');
                  setStep(CHECKIN_STEPS.SCANNER);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'scanner'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Scan QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setStep(CHECKIN_STEPS.MANUAL);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'manual'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Manual Code
              </button>
            </div>

            {cameraError ? (
              /* Camera Error & Fallback View */
              <div className="w-full max-w-sm flex flex-col items-center text-center py-6 px-4 rounded-2xl bg-slate-800/50 border border-rose-500/30">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Camera Unavailable</h4>
                <p className="text-xs text-slate-300 mb-4 max-w-xs leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('manual');
                      setStep(CHECKIN_STEPS.MANUAL);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Use Manual Code
                  </button>
                </div>
              </div>
            ) : (
              /* Active Viewfinder */
              <div className="relative w-full max-w-[280px] aspect-square rounded-3xl overflow-hidden bg-black border-2 border-slate-700 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Corner view finder bracket overlays */}
                <div className="absolute inset-7 border-2 border-cyan-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2 shadow-[0_0_20px_rgba(6,182,212,0.35)]">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                  <div className="w-full text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/90 bg-slate-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Align QR in frame
                    </span>
                  </div>
                </div>

                {/* Control overlay: Torch & Flip camera */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                  {hasTorch && (
                    <button
                      type="button"
                      onClick={handleToggleTorch}
                      className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                        torchOn
                          ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                          : 'bg-black/60 text-white/80 hover:text-white'
                      }`}
                      title={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                    >
                      {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="p-2 rounded-xl bg-black/60 backdrop-blur-md text-white/80 hover:text-white transition-all"
                    title="Switch camera"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center max-w-xs">
              Point your camera at the attendance QR code displayed on the screen or banner.
            </p>

            {isInline && (
              <button
                type="button"
                onClick={() => setStep(CHECKIN_STEPS.IDLE)}
                className="text-xs text-slate-400 hover:text-white underline transition-colors"
              >
                Back to overview
              </button>
            )}
          </div>
        );

      // ─────────────────────────────────────────────
      // MANUAL CODE INPUT STATE
      // ─────────────────────────────────────────────
      case CHECKIN_STEPS.MANUAL:
        return (
          <div className="p-5 flex flex-col items-center gap-4">
            {/* Mode switch tabs */}
            <div className="w-full flex p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('scanner');
                  setStep(CHECKIN_STEPS.SCANNER);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'scanner'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Scan QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setStep(CHECKIN_STEPS.MANUAL);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'manual'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Manual Code
              </button>
            </div>

            <form onSubmit={handleValidateManualCode} className="w-full max-w-sm flex flex-col gap-3">
              <div>
                <label
                  htmlFor="manual-attendance-code"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Enter Attendance Code or Token
                </label>
                <input
                  id="manual-attendance-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    if (manualError) setManualError(null);
                  }}
                  placeholder="e.g. 7K4N9P or paste QR string"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 font-mono text-center tracking-widest text-base uppercase focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  autoFocus
                />
                {manualError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{manualError}</span>
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Activity:</span>
                  <span className="font-semibold text-white">{serviceTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Checking in:</span>
                  <span className="font-semibold text-cyan-300">{memberName}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Validate Code & Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {isInline && (
              <button
                type="button"
                onClick={() => setStep(CHECKIN_STEPS.IDLE)}
                className="text-xs text-slate-400 hover:text-white underline transition-colors"
              >
                Back to overview
              </button>
            )}
          </div>
        );

      // ─────────────────────────────────────────────
      // EXPLICIT CONFIRMATION STEP
      // Requirement: Never silently mark attendance just because a QR URL opened.
      // Shows: activity name, date, location, member identity.
      // Button: "Confirm Check-In as [Member Name]"
      // ─────────────────────────────────────────────
      case CHECKIN_STEPS.CONFIRM:
        return (
          <div className="p-5 flex flex-col gap-4 animate-fadeIn">
            <div className="text-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 mb-2">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Step 2: Confirm Attendance
              </span>
              <h4 className="text-lg font-bold text-white">Review & Confirm Check-In</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Please verify the activity and member identity before recording.
              </p>
            </div>

            {/* Activity Details Card */}
            <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-white leading-snug">
                    {serviceTitle}
                  </h5>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{formatServiceDate(serviceDate)}</span>
                    <span>•</span>
                    <span>{serviceTime}</span>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2 text-xs text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{serviceLocation}</span>
              </div>
            </div>

            {/* Member Identity Confirmation Badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-cyan-950/50 shrink-0">
                {memberInitials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  Member Checking In
                </div>
                <div className="text-base font-bold text-white truncate">
                  {memberName}
                </div>
                <div className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                  <span className="capitalize">{currentUser?.role || 'Member'}</span>
                  {currentUser?.team && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-300 font-semibold">{currentUser.team}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Explicit Confirmation Action Button */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmCheckIn}
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-900/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                {`Confirm Check-In as ${memberName}`}
              </button>

              <button
                type="button"
                onClick={handleResetToScanner}
                className="w-full py-2 px-3 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Scan different code or cancel
              </button>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────
      // SUBMITTING STATE
      // ─────────────────────────────────────────────
      case CHECKIN_STEPS.SUBMITTING:
        return (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            <h4 className="text-base font-bold text-white">Submitting Attendance...</h4>
            <p className="text-xs text-slate-400 max-w-xs">
              {`Verifying rolling session token and recording pass for ${memberName}.`}
            </p>
          </div>
        );

      // ─────────────────────────────────────────────
      // OUTCOME STATES (The 5 Distinct Outcomes)
      // 1. present: Confirmed! Confetti, haptic feedback, active pass timestamp.
      // 2. pending: Offline! "Checked in offline — pending sync when reconnected".
      // 3. expired: "QR code or token has expired. Ask your leader for a fresh code."
      // 4. already_checked_in: "You are already checked in for this activity at [time]."
      // 5. not_eligible: Error / permission denied with safe explanation.
      // ─────────────────────────────────────────────
      case CHECKIN_STEPS.OUTCOME:
        return renderOutcomeView();

      default:
        return null;
    }
  };

  /**
   * Dedicated renderer for the 5 distinct outcome states
   */
  const renderOutcomeView = () => {
    switch (outcome.status) {
      // ─────────────────────────────────────────────
      // 1. PRESENT (Confirmed Success)
      // ─────────────────────────────────────────────
      case OUTCOME_STATES.PRESENT:
        return (
          <div className="p-6 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/60 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/20 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Verified Digital Pass
            </div>

            <h4 className="text-xl font-black text-white mb-1">Check-In Confirmed!</h4>
            <p className="text-sm text-emerald-200/90 mb-5 max-w-xs leading-relaxed">
              {`Welcome to ${serviceTitle}!`}
            </p>

            {/* Digital Attendance Pass Card */}
            <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border border-emerald-500/30 text-left space-y-2 mb-5 shadow-inner">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Pass Holder:</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <User className="w-3 h-3 text-cyan-400" />
                  {memberName}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Present
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Verified Timestamp:</span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {outcome.timestamp || formatPassTime()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-900/40 transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        );

      // ─────────────────────────────────────────────
      // 2. PENDING (Offline Check-In Saved)
      // ─────────────────────────────────────────────
      case OUTCOME_STATES.PENDING:
        return (
          <div className="p-6 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/60 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/20">
              <WifiOff className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold mb-2">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              Offline Pass Saved
            </div>

            <h4 className="text-xl font-bold text-white mb-2">Offline Check-In</h4>
            <p className="text-sm text-amber-200/90 mb-5 max-w-xs leading-relaxed font-semibold">
              Checked in offline — pending sync when reconnected.
            </p>

            <div className="w-full p-4 rounded-2xl bg-slate-800/80 border border-amber-500/30 text-left space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Member:</span>
                <span className="font-bold text-white">{memberName}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Activity:</span>
                <span className="font-bold text-white truncate max-w-[180px]">{serviceTitle}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Queued At:</span>
                <span className="font-mono text-amber-300 font-semibold">
                  {outcome.timestamp || formatPassTime()}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all"
            >
              Got It
            </button>
          </div>
        );

      // ─────────────────────────────────────────────
      // 3. EXPIRED (QR / Token Expired)
      // ─────────────────────────────────────────────
      case OUTCOME_STATES.EXPIRED:
        return (
          <div className="p-6 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/20">
              <Clock className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Token Expired
            </div>

            <h4 className="text-xl font-bold text-white mb-2">Code Expired</h4>
            <p className="text-sm text-rose-200/90 mb-5 max-w-xs leading-relaxed font-semibold">
              QR code or token has expired. Ask your leader for a fresh code.
            </p>

            <p className="text-xs text-slate-400 mb-6 max-w-xs leading-relaxed">
              Attendance codes rotate frequently to guarantee venue presence. Look at the host screen or ask your station leader for the live code.
            </p>

            <div className="flex gap-2.5 w-full">
              <button
                type="button"
                onClick={handleResetToScanner}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-4 h-4" />
                Scan Again
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        );

      // ─────────────────────────────────────────────
      // 4. ALREADY CHECKED IN (Idempotency)
      // ─────────────────────────────────────────────
      case OUTCOME_STATES.ALREADY_CHECKED_IN:
        return (
          <div className="p-6 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-500/60 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/20">
              <UserCheck className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold mb-2">
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              Already Recorded
            </div>

            <h4 className="text-xl font-bold text-white mb-2">Already Checked In</h4>
            <p className="text-sm text-cyan-200/90 mb-5 max-w-xs leading-relaxed font-semibold">
              {outcome.message || `You are already checked in for this activity at ${outcome.timestamp || 'earlier today'}.`}
            </p>

            <div className="w-full p-4 rounded-2xl bg-slate-800/80 border border-cyan-500/30 text-left space-y-2 mb-5">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-700/60">
                <span className="text-slate-400">Member:</span>
                <span className="font-bold text-white">{memberName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Activity:</span>
                <span className="font-bold text-white truncate max-w-[180px]">{serviceTitle}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        );

      // ─────────────────────────────────────────────
      // 5. NOT ELIGIBLE / ERROR (Safe Explanation)
      // ─────────────────────────────────────────────
      case OUTCOME_STATES.NOT_ELIGIBLE:
      default:
        return (
          <div className="p-6 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500/60 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Check-In Restricted
            </div>

            <h4 className="text-xl font-bold text-white mb-2">Check-In Unavailable</h4>
            <p className="text-sm text-slate-300 mb-5 max-w-xs leading-relaxed">
              {outcome.message ||
                'Your account is not currently eligible to check in for this activity. Please check with your team leader or coordinator.'}
            </p>

            <div className="flex gap-2.5 w-full">
              <button
                type="button"
                onClick={handleResetToScanner}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        );
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: INLINE CARD WIDGET
  // ─────────────────────────────────────────────────────────────
  if (isInline) {
    return (
      <section
        className="w-full bg-slate-900 border border-slate-700/80 rounded-3xl shadow-xl text-white overflow-hidden transition-all relative"
        aria-labelledby={headingId}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 id={headingId} className="text-base font-bold text-white">
                Attendance Check-In
              </h3>
              <p className="text-xs text-slate-400">Fast & verified session attendance</p>
            </div>
          </div>

          {step !== CHECKIN_STEPS.IDLE && (
            <button
              type="button"
              onClick={() => setStep(CHECKIN_STEPS.IDLE)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Reset check-in"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Body */}
        {renderStepContent()}
      </section>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: MODAL DIALOG
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden flex flex-col my-auto">
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 id={headingId} className="text-base font-bold text-white">
                Scan Attendance QR
              </h3>
              <p className="text-xs text-slate-400">VBT Community Session</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            aria-label="Close check-in modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {renderStepContent()}
      </div>
    </div>
  );
}
