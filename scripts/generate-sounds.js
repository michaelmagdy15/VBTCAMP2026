/**
 * VBT Sports Camp – Sound File Generator
 * Generates WAV files for each chime event in public/sounds/
 * Run: node scripts/generate-sounds.js
 *
 * No external npm dependencies needed — uses only Node.js built-ins.
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sounds');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Wave Helpers ──────────────────────────────────────────────────────────────

function buildWavBuffer(samples) {
  const numSamples = samples.length;
  const dataBytes = numSamples * 2; // 16-bit PCM = 2 bytes/sample
  const buffer = Buffer.alloc(44 + dataBytes);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // chunk size
  buffer.writeUInt16LE(1, 20);           // PCM format
  buffer.writeUInt16LE(1, 22);           // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // sample rate
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);           // block align
  buffer.writeUInt16LE(16, 34);          // bits per sample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

function sineWave(freq, startSample, durationSamples) {
  const out = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    out[i] = Math.sin(2 * Math.PI * freq * (startSample + i) / SAMPLE_RATE);
  }
  return out;
}

function triangleWave(freq, startSample, durationSamples) {
  const out = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    const t = ((startSample + i) / SAMPLE_RATE * freq) % 1;
    out[i] = t < 0.5 ? 4 * t - 1 : 3 - 4 * t;
  }
  return out;
}

function squareWave(freq, startSample, durationSamples) {
  const out = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    const t = ((startSample + i) / SAMPLE_RATE * freq) % 1;
    out[i] = t < 0.5 ? 1 : -1;
  }
  return out;
}

function sawtoothWave(freq, startSample, durationSamples) {
  const out = new Float32Array(durationSamples);
  for (let i = 0; i < durationSamples; i++) {
    const t = ((startSample + i) / SAMPLE_RATE * freq) % 1;
    out[i] = 2 * t - 1;
  }
  return out;
}

function getWaveFunction(type) {
  switch (type) {
    case 'triangle': return triangleWave;
    case 'square': return squareWave;
    case 'sawtooth': return sawtoothWave;
    default: return sineWave;
  }
}

/**
 * Apply an exponential decay envelope to a sample block.
 * @param {Float32Array} samples
 * @param {number} volume  – peak volume (0-1)
 */
function applyEnvelope(samples, volume) {
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    // Attack: first 5% of duration
    const attackEnd = Math.floor(n * 0.05);
    const attackGain = i < attackEnd ? i / attackEnd : 1;
    // Exponential decay: e^(-5 * progress)
    const progress = i / n;
    const decayGain = Math.exp(-5 * progress);
    samples[i] *= volume * attackGain * decayGain;
  }
  return samples;
}

/**
 * Render a sequence of notes into a Float32Array.
 * @param {Array<[freq, dur, delay, type?, vol?]>} notes
 * @returns {Float32Array}
 */
function renderSequence(notes) {
  // Calculate total length
  let totalSecs = 0;
  for (const [, dur, delay] of notes) {
    totalSecs = Math.max(totalSecs, delay + dur + 0.1);
  }

  const totalSamples = Math.ceil(totalSecs * SAMPLE_RATE);
  const out = new Float32Array(totalSamples);

  for (const [freq, dur, delay, type = 'sine', vol = 0.15] of notes) {
    const startSample = Math.floor(delay * SAMPLE_RATE);
    const numSamples = Math.floor(dur * SAMPLE_RATE);
    const waveFn = getWaveFunction(type);
    const wave = waveFn(freq, 0, numSamples);
    applyEnvelope(wave, vol);

    for (let i = 0; i < numSamples; i++) {
      if (startSample + i < totalSamples) {
        out[startSample + i] += wave[i];
      }
    }
  }

  return out;
}

function saveSound(name, notes) {
  const samples = renderSequence(notes);
  const wav = buildWavBuffer(samples);
  // Save as .mp3 extension so the chimes.js lookup works immediately,
  // even though the container format is WAV (browsers are fine with this)
  const filePath = path.join(OUTPUT_DIR, `${name}.mp3`);
  fs.writeFileSync(filePath, wav);
  console.log(`✅  Written: ${filePath}`);
}

// ── Sound Definitions (mirrors chimes.js fallback sequences) ─────────────────

const SOUNDS = {
  announcement: [
    [523, 0.4, 0,    'sine',     0.18],  // C5
    [659, 0.4, 0.18, 'sine',     0.18],  // E5
    [784, 0.6, 0.36, 'sine',     0.20],  // G5
  ],

  score: [
    [523,  0.3, 0,    'triangle', 0.22],  // C5
    [659,  0.3, 0.14, 'triangle', 0.22],  // E5
    [784,  0.3, 0.28, 'triangle', 0.22],  // G5
    [1047, 0.7, 0.42, 'triangle', 0.26],  // C6
  ],

  urgent: [
    [880,  0.2,  0,    'square', 0.13],
    [880,  0.2,  0.28, 'square', 0.13],
    [880,  0.2,  0.56, 'square', 0.13],
    [1100, 0.45, 0.84, 'square', 0.16],
  ],

  schedule: [
    [784, 0.3, 0,    'sine', 0.16],  // G5
    [659, 0.3, 0.18, 'sine', 0.16],  // E5
    [523, 0.35,0.36, 'sine', 0.18],  // C5
    [659, 0.3, 0.60, 'sine', 0.16],  // E5
    [784, 0.5, 0.78, 'sine', 0.18],  // G5
  ],

  round_start: [
    [440, 0.22, 0,    'triangle', 0.20],  // A4
    [550, 0.22, 0.18, 'triangle', 0.20],  // C#5
    [660, 0.22, 0.36, 'triangle', 0.20],  // E5
    [880, 0.70, 0.54, 'triangle', 0.24],  // A5
  ],

  walkie: [
    [1200, 0.14, 0,    'square', 0.10],
    [1400, 0.18, 0.16, 'square', 0.12],
  ],

  notification: [
    [660, 0.25, 0,    'sine', 0.13],
    [880, 0.40, 0.22, 'sine', 0.15],
  ],

  success: [
    [523,  0.22, 0,    'sine', 0.14],
    [659,  0.22, 0.18, 'sine', 0.14],
    [784,  0.22, 0.36, 'sine', 0.16],
    [1047, 0.55, 0.54, 'sine', 0.20],
  ],

  error: [
    [300, 0.35, 0,    'sawtooth', 0.10],
    [250, 0.45, 0.40, 'sawtooth', 0.12],
  ],

  countdown: [
    [800, 0.15, 0, 'square', 0.12],
  ],
};

// ── Generate ──────────────────────────────────────────────────────────────────

console.log('\n🎵  VBT Sports Camp – Generating sound files...\n');
for (const [name, notes] of Object.entries(SOUNDS)) {
  saveSound(name, notes);
}
console.log('\n✨  All sounds generated in public/sounds/\n');
