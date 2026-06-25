// ─── VBT Announcement Chimes & Sound Effects ─────────────────────────
// Web Audio API-based sound effects for major app events
// No external audio files needed - generates tones programmatically
// ──────────────────────────────────────────────────────────────────────

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ── Tone primitives ────────────────────────────────────────────────────

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail if audio context isn't available
  }
}

function playSequence(notes, baseDelay = 0) {
  notes.forEach(([freq, dur, delay, type, vol]) => {
    setTimeout(() => playTone(freq, dur, type || 'sine', vol || 0.15), (delay + baseDelay) * 1000);
  });
}

// ── Chime Sounds ───────────────────────────────────────────────────────

/** Gentle ascending chime — new announcement posted */
export function chimeAnnouncement() {
  playSequence([
    [523, 0.15, 0],        // C5
    [659, 0.15, 0.1],      // E5
    [784, 0.25, 0.2],      // G5
  ]);
}

/** Victory fanfare — score update / game win */
export function chimeScoreUpdate() {
  playSequence([
    [523, 0.12, 0, 'triangle', 0.2],     // C5
    [659, 0.12, 0.08, 'triangle', 0.2],   // E5
    [784, 0.12, 0.16, 'triangle', 0.2],   // G5
    [1047, 0.4, 0.24, 'triangle', 0.25],  // C6
  ]);
}

/** Urgent alert — ping or emergency */
export function chimeUrgent() {
  playSequence([
    [880, 0.15, 0, 'square', 0.12],
    [880, 0.15, 0.25, 'square', 0.12],
    [880, 0.15, 0.5, 'square', 0.12],
    [1100, 0.3, 0.75, 'square', 0.15],
  ]);
}

/** Schedule change — descending then ascending */
export function chimeScheduleChange() {
  playSequence([
    [784, 0.12, 0],         // G5
    [659, 0.12, 0.1],       // E5
    [523, 0.15, 0.2],       // C5
    [659, 0.12, 0.4],       // E5
    [784, 0.3, 0.5],        // G5
  ]);
}

/** New round starting — attention getter */
export function chimeRoundStart() {
  playSequence([
    [440, 0.08, 0, 'triangle', 0.18],      // A4
    [550, 0.08, 0.1, 'triangle', 0.18],     // C#5
    [660, 0.08, 0.2, 'triangle', 0.18],     // E5
    [880, 0.5, 0.3, 'triangle', 0.22],      // A5
  ]);
}

/** Walkie-talkie static beep — before voice message plays */
export function chimeWalkieTalkieBeep() {
  playSequence([
    [1200, 0.06, 0, 'square', 0.08],
    [1400, 0.08, 0.08, 'square', 0.1],
  ]);
}

/** Subtle notification — new feed item, minor update */
export function chimeNotification() {
  playSequence([
    [660, 0.12, 0, 'sine', 0.1],
    [880, 0.2, 0.12, 'sine', 0.12],
  ]);
}

/** Success — action completed */
export function chimeSuccess() {
  playSequence([
    [523, 0.1, 0, 'sine', 0.12],
    [659, 0.1, 0.1, 'sine', 0.12],
    [784, 0.1, 0.2, 'sine', 0.15],
    [1047, 0.35, 0.3, 'sine', 0.18],
  ]);
}

/** Error/warning — something went wrong */
export function chimeError() {
  playSequence([
    [300, 0.2, 0, 'sawtooth', 0.08],
    [250, 0.3, 0.25, 'sawtooth', 0.1],
  ]);
}

/** Timer/countdown beep */
export function chimeCountdown() {
  playTone(800, 0.08, 'square', 0.1);
}

// ── Smart Chime Dispatcher ─────────────────────────────────────────────

let chimesEnabled = true;
let lastChimeTime = 0;
const CHIME_COOLDOWN_MS = 1500; // Prevent chime spam

export function setChimesEnabled(enabled) {
  chimesEnabled = enabled;
}

export function isChimesEnabled() {
  return chimesEnabled;
}

/**
 * Play appropriate chime based on event type.
 * Respects cooldown to prevent spam.
 * @param {'announcement'|'score'|'urgent'|'schedule'|'round_start'|'walkie'|'notification'|'success'|'error'} eventType
 */
export function playChime(eventType) {
  if (!chimesEnabled) return;
  
  const now = Date.now();
  if (now - lastChimeTime < CHIME_COOLDOWN_MS) return;
  lastChimeTime = now;

  switch (eventType) {
    case 'announcement': chimeAnnouncement(); break;
    case 'score': chimeScoreUpdate(); break;
    case 'urgent': chimeUrgent(); break;
    case 'schedule': chimeScheduleChange(); break;
    case 'round_start': chimeRoundStart(); break;
    case 'walkie': chimeWalkieTalkieBeep(); break;
    case 'notification': chimeNotification(); break;
    case 'success': chimeSuccess(); break;
    case 'error': chimeError(); break;
    default: chimeNotification(); break;
  }
}
