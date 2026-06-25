// ─── VBT Voice Messaging Utility ───────────────────────────────────────
// MediaRecorder API + Firebase Storage + Firestore real-time channels
// ────────────────────────────────────────────────────────────────────────

import { getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
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
    /** @type {MediaRecorder | null} */
    this._mediaRecorder = null;
    /** @type {MediaStream | null} */
    this._stream = null;
    /** @type {Blob[]} */
    this._chunks = [];
    /** @type {boolean} */
    this._recording = false;
    /** @type {number} */
    this._startTime = 0;
  }

  /**
   * Request microphone access and begin recording.
   * Resolves once recording has actually started.
   */
  async startRecording() {
    if (this._recording) return;

    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._chunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''; // fallback to browser default

    this._mediaRecorder = new MediaRecorder(this._stream, mimeType ? { mimeType } : undefined);

    this._mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this._chunks.push(e.data);
      }
    };

    this._mediaRecorder.start(250); // collect data every 250 ms
    this._recording = true;
    this._startTime = Date.now();
  }

  /**
   * Stop recording and return the audio Blob.
   * @returns {Promise<{blob: Blob, duration: number}>}
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this._mediaRecorder || !this._recording) {
        return reject(new Error('Not currently recording'));
      }

      this._mediaRecorder.onstop = () => {
        const duration = Math.round((Date.now() - this._startTime) / 1000); // seconds
        const recordedMimeType = this._mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this._chunks, { type: recordedMimeType });
        this._cleanup();
        resolve({ blob, duration });
      };

      this._mediaRecorder.stop();
    });
  }

  /**
   * Whether the recorder is currently capturing audio.
   * @returns {boolean}
   */
  isRecording() {
    return this._recording;
  }

  /**
   * Abort the current recording without returning any data.
   */
  cancel() {
    if (this._mediaRecorder && this._recording) {
      this._mediaRecorder.stop();
    }
    this._cleanup();
  }

  /** Release all resources. */
  _cleanup() {
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
    }
    this._mediaRecorder = null;
    this._stream = null;
    this._chunks = [];
    this._recording = false;
    this._startTime = 0;
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
export async function uploadVoiceMessage(blob, eventCode, channel, sender, senderRole) {
  // 1. Upload to Storage
  const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('aac') ? 'aac' : 'webm';
  const filename = `${Date.now()}_${sender}.${extension}`;
  const storageRef = ref(storage, `vbt_events/${eventCode}/voice/${filename}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type });
  const audioUrl = await getDownloadURL(storageRef);

  // 2. Estimate duration from blob size (rough: webm ≈ 6 kB/s at default quality)
  const duration = Math.round(blob.size / 6000) || 1;

  // 3. Create Firestore doc
  const colRef = collection(db, 'vbt_events', eventCode, 'voice_messages');
  const docRef = await addDoc(colRef, {
    audioUrl,
    sender,
    senderRole,
    channel,
    timestamp: serverTimestamp(),
    duration,
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
