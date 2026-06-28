// ─── VBT Voice Messaging Utility ───────────────────────────────────────
// MediaRecorder API + Firebase Storage + Firestore real-time channels
// ────────────────────────────────────────────────────────────────────────

import { getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { db } from './firebase';

// ── Firebase singletons (reuse the app already initialised elsewhere) ──
const app = getApps()[0];
const storage = getStorage(app);

// ── Channel definitions ────────────────────────────────────────────────
export const CHANNELS = {
  COORDINATORS: 'coordinators',
  TEAM_LEADERS: 'team_leaders',
  GAME_LEADERS: 'game_leaders',
  GLOBAL: 'global',
};

/**
 * Return a human-readable label for a channel key.
 * @param {string} channel
 * @returns {string}
 */
export function getChannelLabel(channel) {
  const labels = {
    [CHANNELS.COORDINATORS]: 'Coordinators',
    [CHANNELS.TEAM_LEADERS]: 'Team Leaders',
    [CHANNELS.GAME_LEADERS]: 'Game Leaders',
    [CHANNELS.GLOBAL]: 'Global',
  };
  return labels[channel] || channel;
}

/**
 * Return a brand colour (hex) for each channel.
 * @param {string} channel
 * @returns {string}
 */
export function getChannelColor(channel) {
  const colors = {
    [CHANNELS.COORDINATORS]: '#a855f7', // purple
    [CHANNELS.TEAM_LEADERS]: '#29b6f6', // blue / vbt-sky
    [CHANNELS.GAME_LEADERS]: '#f59e0b', // orange
    [CHANNELS.GLOBAL]: '#22c55e',       // green
  };
  return colors[channel] || '#29b6f6';
}

// ── VoiceRecorder class ────────────────────────────────────────────────

/**
 * Lightweight wrapper around the browser MediaRecorder API.
 *
 * Usage:
 *   const recorder = new VoiceRecorder();
 *   await recorder.startRecording();
 *   const blob = await recorder.stopRecording();
 */
export class VoiceRecorder {
  constructor() {
    this._stream = null;
    this._recording = false;
    this._startTime = 0;
    this._audioContext = null;
    this._scriptProcessor = null;
    this._sourceNode = null;
    this._samples = [];
    this._totalSampleCount = 0;
  }

  /**
   * Request microphone access and begin recording PCM.
   */
  async startRecording() {
    if (this._recording) return;

    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this._audioContext = new AudioContextClass();
    this._samples = [];
    this._totalSampleCount = 0;

    this._sourceNode = this._audioContext.createMediaStreamSource(this._stream);
    
    // 4096 buffer size, 1 input channel, 1 output channel
    this._scriptProcessor = this._audioContext.createScriptProcessor(4096, 1, 1);
    
    this._scriptProcessor.onaudioprocess = (e) => {
      if (!this._recording) return;
      const channelData = e.inputBuffer.getChannelData(0);
      this._samples.push(new Float32Array(channelData));
      this._totalSampleCount += channelData.length;
    };

    this._sourceNode.connect(this._scriptProcessor);
    this._scriptProcessor.connect(this._audioContext.destination);

    this._recording = true;
    this._startTime = Date.now();
  }

  /**
   * Stop recording, downsample to 16kHz, encode as 16-bit WAV, and return.
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this._recording) {
        return reject(new Error('Not currently recording'));
      }

      const duration = Math.max(1, Math.round((Date.now() - this._startTime) / 1000));
      this._recording = false;
      
      // Stop media pipeline
      if (this._scriptProcessor) this._scriptProcessor.disconnect();
      if (this._sourceNode) this._sourceNode.disconnect();
      if (this._stream) {
        this._stream.getTracks().forEach((track) => track.stop());
      }

      const nativeSampleRate = this._audioContext.sampleRate;
      this._audioContext.close().catch(() => {});

      // Flatten PCM buffers
      const flattened = new Float32Array(this._totalSampleCount);
      let offset = 0;
      for (let i = 0; i < this._samples.length; i++) {
        flattened.set(this._samples[i], offset);
        offset += this._samples[i].length;
      }

      // Downsample to 16kHz to optimize bandwidth
      const targetSampleRate = 16000;
      const downsampled = downsampleBuffer(flattened, nativeSampleRate, targetSampleRate);

      // Encode to WAV blob
      const wavBlob = encodeWAV(downsampled, targetSampleRate);

      this._cleanup();
      resolve({ blob: wavBlob, duration });
    });
  }

  isRecording() {
    return this._recording;
  }

  cancel() {
    this._recording = false;
    this._cleanup();
  }

  _cleanup() {
    if (this._scriptProcessor) {
      try {
        this._scriptProcessor.disconnect();
      } catch (err) {
        console.warn('[VoiceRecorder] scriptProcessor disconnect failed:', err);
      }
    }
    if (this._sourceNode) {
      try {
        this._sourceNode.disconnect();
      } catch (err) {
        console.warn('[VoiceRecorder] sourceNode disconnect failed:', err);
      }
    }
    if (this._stream) {
      try {
        this._stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        console.warn('[VoiceRecorder] stream stop failed:', err);
      }
    }
    if (this._audioContext) {
      try {
        this._audioContext.close();
      } catch (err) {
        console.warn('[VoiceRecorder] audioContext close failed:', err);
      }
    }
    this._stream = null;
    this._audioContext = null;
    this._scriptProcessor = null;
    this._sourceNode = null;
    this._samples = [];
    this._totalSampleCount = 0;
    this._recording = false;
    this._startTime = 0;
  }
}

// ── WAV Encoding Helpers ────────────────────────────────────────────────

function downsampleBuffer(buffer, inputSampleRate, outputSampleRate) {
  if (inputSampleRate === outputSampleRate) return buffer;
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// ── Firebase helpers ───────────────────────────────────────────────────

/**
 * Upload a voice Blob to Firebase Storage, then persist a Firestore
 * document with metadata so listeners are notified in real time.
 *
 * @param {Blob}   blob       – audio blob (webm, mp4, etc.)
 * @param {string} eventCode  – e.g. "VBT2026"
 * @param {string} channel    – one of CHANNELS values
 * @param {string} sender     – display name / uid
 * @param {string} senderRole – admin | team leader | referee | viewer
 * @returns {Promise<{audioUrl: string, docId: string}>}
 */
export async function uploadVoiceMessage(blob, eventCode, channel, sender, senderRole, duration) {
  // 1. Upload to Storage
  const extension = blob.type.includes('wav') ? 'wav' : blob.type.includes('mp4') ? 'mp4' : blob.type.includes('aac') ? 'aac' : 'webm';
  const filename = `${Date.now()}_${sender}.${extension}`;
  const storageRef = ref(storage, `vbt_events/${eventCode}/voice/${filename}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type });
  const audioUrl = await getDownloadURL(storageRef);

  // 2. Use exact duration from args, fallback to size guess only if undefined
  const finalDuration = duration !== undefined ? duration : (Math.round(blob.size / 6000) || 1);

  // 3. Create Firestore doc
  const colRef = collection(db, 'vbt_events', eventCode, 'voice_messages');
  const docRef = await addDoc(colRef, {
    audioUrl,
    sender,
    senderRole,
    channel,
    timestamp: serverTimestamp(),
    duration: finalDuration,
  });

  return { audioUrl, docId: docRef.id };
}

/**
 * Subscribe to real-time voice messages for a given event + channel.
 *
 * @param {string}   eventCode
 * @param {string}   channel
 * @param {Function} callback     – receives an array of message objects
 * @param {number}   [messageLimit=50]
 * @returns {Function} unsubscribe function
 */
export function subscribeToVoiceMessages(eventCode, channel, callback, messageLimit = 50) {
  const colRef = collection(db, 'vbt_events', eventCode, 'voice_messages');
  const q = query(
    colRef,
    where('channel', '==', channel),
    orderBy('timestamp', 'desc'),
    limit(messageLimit),
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  });
}

/**
 * Delete all voice messages for a specific event and channel.
 *
 * @param {string} eventCode
 * @param {string} channel
 */
export async function clearVoiceMessages(eventCode, channel) {
  const colRef = collection(db, 'vbt_events', eventCode, 'voice_messages');
  const q = query(colRef, where('channel', '==', channel));
  try {
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(async (document) => {
      const data = document.data();
      // Delete from Firebase Storage if URL exists
      if (data.audioUrl) {
        try {
          const fileRef = ref(storage, data.audioUrl);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn('Could not delete audio file from storage:', storageErr);
        }
      }
      // Delete from Firestore
      return deleteDoc(doc(db, 'vbt_events', eventCode, 'voice_messages', document.id));
    });
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing voice messages:', error);
    throw error;
  }
}

