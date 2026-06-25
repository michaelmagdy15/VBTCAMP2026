// ─── VBT Announcement Chimes & Sound Effects ─────────────────────────
// Primary sounds: real WAV files from github.com/akx/Notifications
//   License: CC Attribution 3.0 / CC0 Public Domain
// Fallback: Web Audio API oscillators (no files needed)
// Files live in public/sounds/ and are loaded at startup.
// ──────────────────────────────────────────────────────────────────────

let audioCtx = null;
let hasInteracted = false;

// Preload audio files
const audioFiles = {};
const SOUNDS_DIR = '/sounds';
const soundTypes = [
  'announcement',
  'score',
  'urgent',
  'schedule',
  'round_start',
  'walkie',
  'notification',
  'success',
  'error',
  'countdown'
];

// Try .wav first (our files are WAV data), fall back to .mp3 name
if (typeof window !== 'undefined') {
  soundTypes.forEach(type => {
    // The files are WAV audio saved as .mp3 — browsers decode by content, not extension
    const audio = new Audio(`${SOUNDS_DIR}/${type}.mp3`);
    audio.preload = 'auto';
    audioFiles[type] = audio;
  });
}

/**
 * Eagerly unlock the audio context on user gesture.
 */
export function unlockAudioContext() {
  hasInteracted = true;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('[Chimes] AudioContext creation failed:', e);
      return;
    }
  }
  if (audioCtx.state === 'suspended') {
    const p = audioCtx.resume();
    if (p) p.catch(() => {});
  }
}

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    unlockAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio, { passive: true });
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio);
}

function getCtx() {
  if (!hasInteracted) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (audioCtx.state === 'suspended') {
    const p = audioCtx.resume();
    if (p) p.catch(() => {});
  }
  return audioCtx;
}

export function getSharedAudioContext() {
  return getCtx();
}

// ── Tone primitives (FALLBACK) ─────────────────────────────────────────

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
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

// ── Fallback Chime Sounds ──────────────────────────────────────────────

function fallbackAnnouncement() {
  playSequence([[523, 0.15, 0], [659, 0.15, 0.1], [784, 0.25, 0.2]]);
}

function fallbackScoreUpdate() {
  playSequence([
    [523, 0.12, 0, 'triangle', 0.2],
    [659, 0.12, 0.08, 'triangle', 0.2],
    [784, 0.12, 0.16, 'triangle', 0.2],
    [1047, 0.4, 0.24, 'triangle', 0.25],
  ]);
}

function fallbackUrgent() {
  playSequence([
    [880, 0.15, 0, 'square', 0.12],
    [880, 0.15, 0.25, 'square', 0.12],
    [880, 0.15, 0.5, 'square', 0.12],
    [1100, 0.3, 0.75, 'square', 0.15],
  ]);
}

function fallbackScheduleChange() {
  playSequence([
    [784, 0.12, 0], [659, 0.12, 0.1], [523, 0.15, 0.2],
    [659, 0.12, 0.4], [784, 0.3, 0.5],
  ]);
}

function fallbackRoundStart() {
  playSequence([
    [440, 0.08, 0, 'triangle', 0.18], [550, 0.08, 0.1, 'triangle', 0.18],
    [660, 0.08, 0.2, 'triangle', 0.18], [880, 0.5, 0.3, 'triangle', 0.22],
  ]);
}

function fallbackWalkieTalkieBeep() {
  playSequence([[1200, 0.06, 0, 'square', 0.08], [1400, 0.08, 0.08, 'square', 0.1]]);
}

function fallbackNotification() {
  playSequence([[660, 0.12, 0, 'sine', 0.1], [880, 0.2, 0.12, 'sine', 0.12]]);
}

function fallbackSuccess() {
  playSequence([
    [523, 0.1, 0, 'sine', 0.12], [659, 0.1, 0.1, 'sine', 0.12],
    [784, 0.1, 0.2, 'sine', 0.15], [1047, 0.35, 0.3, 'sine', 0.18],
  ]);
}

function fallbackError() {
  playSequence([[300, 0.2, 0, 'sawtooth', 0.08], [250, 0.3, 0.25, 'sawtooth', 0.1]]);
}

function fallbackCountdown() {
  playTone(800, 0.08, 'square', 0.1);
}


// ── Smart Chime Dispatcher ─────────────────────────────────────────────

let chimesEnabled = true;
let lastChimeTime = 0;
const CHIME_COOLDOWN_MS = 800;

export function setChimesEnabled(enabled) {
  chimesEnabled = enabled;
}

export function isChimesEnabled() {
  return chimesEnabled;
}

/**
 * Attempts to play the MP3 audio file. If it fails or is not found,
 * it falls back to the Web Audio API oscillator function.
 */
async function playSmartChime(eventType, fallbackFn) {
  if (!chimesEnabled) return;
  
  // Urgent chimes bypass cooldown
  if (eventType !== 'urgent') {
    const now = Date.now();
    if (now - lastChimeTime < CHIME_COOLDOWN_MS) return;
    lastChimeTime = now;
  }

  const audio = audioFiles[eventType];
  let playSuccess = false;

  if (audio) {
    try {
      const clone = audio.cloneNode();
      clone.volume = 0.6; // Base volume for MP3s
      await clone.play();
      playSuccess = true;
    } catch (err) {
      // Audio playback failed (file not found, or browser auto-play blocked)
      playSuccess = false;
    }
  }

  // If the MP3 failed to play, trigger the oscillator fallback
  if (!playSuccess && fallbackFn) {
    fallbackFn();
  }
}

// ── Exported Event Triggers ─────────────────────────────────────────────

export function chimeAnnouncement() { return playSmartChime('announcement', fallbackAnnouncement); }
export function chimeScoreUpdate() { return playSmartChime('score', fallbackScoreUpdate); }
export function chimeUrgent() { return playSmartChime('urgent', fallbackUrgent); }
export function chimeScheduleChange() { return playSmartChime('schedule', fallbackScheduleChange); }
export function chimeRoundStart() { return playSmartChime('round_start', fallbackRoundStart); }
export function chimeWalkieTalkieBeep() { return playSmartChime('walkie', fallbackWalkieTalkieBeep); }
export function chimeNotification() { return playSmartChime('notification', fallbackNotification); }
export function chimeSuccess() { return playSmartChime('success', fallbackSuccess); }
export function chimeError() { return playSmartChime('error', fallbackError); }
export function chimeCountdown() { return playSmartChime('countdown', fallbackCountdown); }

/**
 * Legacy central dispatcher support
 */
export function playChime(eventType) {
  switch (eventType) {
    case 'announcement': return chimeAnnouncement();
    case 'score': return chimeScoreUpdate();
    case 'urgent': return chimeUrgent();
    case 'schedule': return chimeScheduleChange();
    case 'round_start': return chimeRoundStart();
    case 'walkie': return chimeWalkieTalkieBeep();
    case 'notification': return chimeNotification();
    case 'success': return chimeSuccess();
    case 'error': return chimeError();
    case 'countdown': return chimeCountdown();
    default: return chimeNotification();
  }
}

