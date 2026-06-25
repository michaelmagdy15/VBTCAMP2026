// ─── VBT Announcement Chimes & Sound Effects ─────────────────────────
// Primary sounds: WAV files decoded into AudioBuffers via AudioContext.
//   Source: github.com/akx/Notifications (CC0 / CC-BY 3.0)
//   Files: public/sounds/*.mp3
//
// Why AudioBuffers instead of new Audio():
//   iOS PWA mode blocks HTML5 Audio.play() from non-gesture contexts
//   (e.g. Firestore callbacks). AudioContext.decodeAudioData + BufferSource
//   plays reliably once the context is unlocked by a single user tap.
//
// Fallback: Web Audio oscillators (if files fail to load).
// ──────────────────────────────────────────────────────────────────────

let audioCtx = null;
let hasInteracted = false;

// AudioBuffer cache — populated on first user interaction
const audioBuffers = {};
const SOUNDS_DIR = '/sounds';
const SOUND_TYPES = [
  'announcement',
  'score',
  'urgent',
  'schedule',
  'round_start',
  'walkie',
  'notification',
  'success',
  'error',
  'countdown',
];

// ── AudioContext management ────────────────────────────────────────────

function createCtx() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('[Chimes] AudioContext creation failed:', e);
  }
  return audioCtx;
}

/**
 * Eagerly unlock the AudioContext AND pre-decode all sound files.
 * Call this from any user-gesture handler (click / touchstart / keydown).
 */
export async function unlockAudioContext() {
  hasInteracted = true;
  const ctx = createCtx();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try { await ctx.resume(); } catch (_) {}
  }

  // Pre-decode every sound file into an AudioBuffer so they can be played
  // from non-gesture contexts (Firestore callbacks, timers, etc.)
  await Promise.all(
    SOUND_TYPES.map(async (type) => {
      if (audioBuffers[type]) return; // already decoded
      try {
        const res = await fetch(`${SOUNDS_DIR}/${type}.mp3`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        audioBuffers[type] = await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        // File missing or decode failed — oscillator fallback will be used
        console.warn(`[Chimes] Could not load sound "${type}":`, e.message);
      }
    })
  );
}

// Attach unlock to first user interaction
if (typeof window !== 'undefined') {
  const onFirstInteraction = () => {
    unlockAudioContext();
    window.removeEventListener('click',      onFirstInteraction);
    window.removeEventListener('touchstart', onFirstInteraction, { passive: true });
    window.removeEventListener('keydown',    onFirstInteraction);
  };
  window.addEventListener('click',      onFirstInteraction);
  window.addEventListener('touchstart', onFirstInteraction, { passive: true });
  window.addEventListener('keydown',    onFirstInteraction);
}

export function getSharedAudioContext() {
  if (!hasInteracted) return null;
  return createCtx();
}

// ── AudioBuffer playback ────────────────────────────────────────────────

function playBuffer(buffer, volume = 0.7) {
  if (!audioCtx || !buffer) return false;
  try {
    const source = audioCtx.createBufferSource();
    const gain   = audioCtx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start(audioCtx.currentTime);
    return true;
  } catch (e) {
    return false;
  }
}

// ── Oscillator fallback ─────────────────────────────────────────────────

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function playSequence(notes) {
  notes.forEach(([freq, dur, delay, type, vol]) => {
    setTimeout(() => playTone(freq, dur, type || 'sine', vol || 0.15), delay * 1000);
  });
}

// ── Fallback melodies ───────────────────────────────────────────────────

const FALLBACKS = {
  announcement: () => playSequence([[523,.15,0],[659,.15,.1],[784,.25,.2]]),
  score:        () => playSequence([[523,.12,0,'triangle',.2],[659,.12,.08,'triangle',.2],[784,.12,.16,'triangle',.2],[1047,.4,.24,'triangle',.25]]),
  urgent:       () => playSequence([[880,.15,0,'square',.12],[880,.15,.25,'square',.12],[880,.15,.5,'square',.12],[1100,.3,.75,'square',.15]]),
  schedule:     () => playSequence([[784,.12,0],[659,.12,.1],[523,.15,.2],[659,.12,.4],[784,.3,.5]]),
  round_start:  () => playSequence([[440,.08,0,'triangle',.18],[550,.08,.1,'triangle',.18],[660,.08,.2,'triangle',.18],[880,.5,.3,'triangle',.22]]),
  walkie:       () => playSequence([[1200,.06,0,'square',.08],[1400,.08,.08,'square',.1]]),
  notification: () => playSequence([[660,.12,0,'sine',.1],[880,.2,.12,'sine',.12]]),
  success:      () => playSequence([[523,.1,0,'sine',.12],[659,.1,.1,'sine',.12],[784,.1,.2,'sine',.15],[1047,.35,.3,'sine',.18]]),
  error:        () => playSequence([[300,.2,0,'sawtooth',.08],[250,.3,.25,'sawtooth',.1]]),
  countdown:    () => playTone(800, .08, 'square', .1),
};

// ── Smart dispatcher ────────────────────────────────────────────────────

let chimesEnabled = true;
let lastChimeTime = 0;
const COOLDOWN_MS = 800;

export function setChimesEnabled(enabled) { chimesEnabled = enabled; }
export function isChimesEnabled()          { return chimesEnabled; }

function playSmartChime(eventType) {
  if (!chimesEnabled) return;

  // Urgent bypasses cooldown
  if (eventType !== 'urgent') {
    const now = Date.now();
    if (now - lastChimeTime < COOLDOWN_MS) return;
    lastChimeTime = now;
  }

  // Resume context if suspended (handles iOS PWA background/foreground)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  // Try AudioBuffer first (works in non-gesture contexts on iOS)
  const buffer = audioBuffers[eventType];
  if (playBuffer(buffer)) return;

  // Fallback to oscillator
  const fallback = FALLBACKS[eventType] || FALLBACKS.notification;
  fallback();
}

// ── Public chime API ────────────────────────────────────────────────────

export function chimeAnnouncement()    { playSmartChime('announcement'); }
export function chimeScoreUpdate()     { playSmartChime('score'); }
export function chimeUrgent()          { playSmartChime('urgent'); }
export function chimeScheduleChange()  { playSmartChime('schedule'); }
export function chimeRoundStart()      { playSmartChime('round_start'); }
export function chimeWalkieTalkieBeep(){ playSmartChime('walkie'); }
export function chimeNotification()    { playSmartChime('notification'); }
export function chimeSuccess()         { playSmartChime('success'); }
export function chimeError()           { playSmartChime('error'); }
export function chimeCountdown()       { playSmartChime('countdown'); }

export function playChime(eventType) {
  switch (eventType) {
    case 'announcement':  return chimeAnnouncement();
    case 'score':         return chimeScoreUpdate();
    case 'urgent':        return chimeUrgent();
    case 'schedule':      return chimeScheduleChange();
    case 'round_start':   return chimeRoundStart();
    case 'walkie':        return chimeWalkieTalkieBeep();
    case 'notification':  return chimeNotification();
    case 'success':       return chimeSuccess();
    case 'error':         return chimeError();
    case 'countdown':     return chimeCountdown();
    default:              return chimeNotification();
  }
}
