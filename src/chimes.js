// ─── VBT Chimes & Sound Effects — powered by Howler.js ───────────────
// github.com/goldfire/howler.js  (MIT licence, 23k ⭐)
//
// Why Howler instead of raw Web Audio / HTML5 Audio:
//   • Automatically unlocks AudioContext on first user gesture (iOS fix)
//   • Handles every browser fallback internally
//   • Sprites let us ship one file; individual files also work fine
//   • Zero manual AudioContext management needed
//
// Sound assets: public/sounds/*.mp3  (CC0 / CC-BY 3.0 — akx/Notifications)
// ──────────────────────────────────────────────────────────────────────
import { Howl, Howler } from 'howler';

// ── Global volume / mute ───────────────────────────────────────────────
let chimesEnabled = true;
export function setChimesEnabled(enabled) {
  chimesEnabled = enabled;
  Howler.mute(!enabled);
}
export function isChimesEnabled() { return chimesEnabled; }

// ── Pre-load all sounds ────────────────────────────────────────────────
// Howler pre-loads on construction and keeps the decoded buffer cached.
// On iOS it automatically plays a silent sprite on the first user gesture
// so subsequent .play() calls work from any context (Firestore callbacks etc.)

const SOUNDS_DIR = '/sounds';

function makeHowl(file, volume = 0.7) {
  return new Howl({
    src: [`${SOUNDS_DIR}/${file}.mp3`],
    volume,
    preload: true,
    html5: false,          // use Web Audio (decoded buffer) — works without gesture after unlock
    onloaderror: (_, err) => console.warn(`[Chimes] Failed to load ${file}:`, err),
  });
}

const sounds = {
  announcement : makeHowl('announcement', 0.7),
  score        : makeHowl('score',        0.65),
  urgent       : makeHowl('urgent',       0.9),
  schedule     : makeHowl('schedule',     0.65),
  round_start  : makeHowl('round_start',  0.8),
  walkie       : makeHowl('walkie',       0.6),
  notification : makeHowl('notification', 0.55),
  success      : makeHowl('success',      0.65),
  error        : makeHowl('error',        0.55),
  countdown    : makeHowl('countdown',    0.7),
};

// ── iOS / PWA unlock ───────────────────────────────────────────────────
// Howler handles its own unlock internally, but we also expose this so
// App.jsx can call it from its existing unlock handler.
export function unlockAudioContext() {
  // Howler.ctx is the shared AudioContext — resume it if suspended
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    Howler.ctx.resume().catch(() => {});
  }
}

// Legacy export — some parts of App.jsx import this
export function getSharedAudioContext() {
  return Howler.ctx || null;
}

// ── Cooldown ───────────────────────────────────────────────────────────
let lastChimeTime = 0;
const COOLDOWN_MS = 800;

// ── Oscillator fallback ────────────────────────────────────────────────
// Used only if the Howl fails to load (e.g. offline with no cache).
function oscillatorFallback(eventType) {
  try {
    const ctx = Howler.ctx;
    if (!ctx) return;
    const patterns = {
      announcement : [[523,.15,0],[659,.15,.1],[784,.25,.2]],
      score        : [[523,.12,0],[659,.12,.1],[784,.12,.2],[1047,.4,.3]],
      urgent       : [[880,.12,0],[880,.12,.2],[880,.12,.4],[1100,.3,.6]],
      schedule     : [[784,.12,0],[659,.12,.1],[523,.15,.2],[659,.12,.4],[784,.3,.5]],
      round_start  : [[440,.08,0],[550,.08,.1],[660,.08,.2],[880,.5,.3]],
      walkie       : [[1200,.06,0],[1400,.08,.08]],
      notification : [[660,.12,0],[880,.2,.12]],
      success      : [[523,.1,0],[659,.1,.1],[784,.1,.2],[1047,.35,.3]],
      error        : [[300,.2,0],[250,.3,.25]],
      countdown    : [[800,.08,0]],
    };
    const notes = patterns[eventType] || patterns.notification;
    notes.forEach(([freq, dur, delay]) => {
      setTimeout(() => {
        try {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + dur);
        } catch (_) {}
      }, delay * 1000);
    });
  } catch (_) {}
}

// ── Core dispatcher ────────────────────────────────────────────────────
function playSmartChime(eventType, isUrgent = false) {
  if (!chimesEnabled) return;

  if (!isUrgent) {
    const now = Date.now();
    if (now - lastChimeTime < COOLDOWN_MS) return;
    lastChimeTime = now;
  }

  const howl = sounds[eventType];
  if (howl && howl.state() !== 'unloaded') {
    howl.play();
  } else {
    oscillatorFallback(eventType);
  }
}

// ── Public API (same interface as before — no changes needed in App.jsx) ─
export function chimeAnnouncement()     { playSmartChime('announcement'); }
export function chimeScoreUpdate()      { playSmartChime('score'); }
export function chimeUrgent()           { playSmartChime('urgent', true); }
export function chimeScheduleChange()   { playSmartChime('schedule'); }
export function chimeRoundStart()       { playSmartChime('round_start'); }
export function chimeWalkieTalkieBeep() { playSmartChime('walkie'); }
export function chimeNotification()     { playSmartChime('notification'); }
export function chimeSuccess()          { playSmartChime('success'); }
export function chimeError()            { playSmartChime('error'); }
export function chimeCountdown()        { playSmartChime('countdown'); }

export function playChime(eventType) {
  switch (eventType) {
    case 'announcement' : return chimeAnnouncement();
    case 'score'        : return chimeScoreUpdate();
    case 'urgent'       : return chimeUrgent();
    case 'schedule'     : return chimeScheduleChange();
    case 'round_start'  : return chimeRoundStart();
    case 'walkie'       : return chimeWalkieTalkieBeep();
    case 'notification' : return chimeNotification();
    case 'success'      : return chimeSuccess();
    case 'error'        : return chimeError();
    case 'countdown'    : return chimeCountdown();
    default             : return chimeNotification();
  }
}
