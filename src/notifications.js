/**
 * VBT Sports Camp – Notification Utilities
 * -----------------------------------------
 * SoundBoard       – Toggle chime / notification sounds on/off (persisted)
 * TransitionAlerter – Detect matchups starting within 5 minutes
 * TTSAnnouncer     – Text-to-Speech via the Web Speech API (persisted)
 */

/* ------------------------------------------------------------------ */
/*  SoundBoard                                                        */
/* ------------------------------------------------------------------ */

class SoundBoard {
  constructor() {
    const stored = localStorage.getItem('vbt_sound_enabled');
    this.enabled = stored !== null ? stored === 'true' : true;
  }

  /**
   * Flip the enabled state and persist.
   * @returns {boolean} The new enabled state.
   */
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('vbt_sound_enabled', String(this.enabled));
    return this.enabled;
  }

  /**
   * @returns {boolean} Whether sounds are currently enabled.
   */
  isEnabled() {
    return this.enabled;
  }
}

/* ------------------------------------------------------------------ */
/*  TransitionAlerter                                                 */
/* ------------------------------------------------------------------ */

class TransitionAlerter {
  /**
   * @param {Array}    matchups     – Array of matchup objects with at least { startTime, location, label/round }
   * @param {Function} getTimeShift – Returns the current simulated-time offset in ms (0 if none)
   */
  constructor(matchups = [], getTimeShift = () => 0) {
    this.matchups = matchups;
    this.getTimeShift = getTimeShift;
  }

  /**
   * Update the matchup list at runtime (e.g. after a schedule refresh).
   * @param {Array} matchups
   */
  setMatchups(matchups) {
    this.matchups = matchups;
  }

  /**
   * Check if any matchup starts within the next 5 minutes.
   *
   * @param  {Date|number} currentTime – The "now" value (already shifted if needed)
   * @returns {{ upcoming: boolean, message: string, matchup: object } | null}
   */
  checkUpcomingTransitions(currentTime) {
    const now = currentTime instanceof Date ? currentTime.getTime() : currentTime;
    const FIVE_MIN = 5 * 60 * 1000;

    for (const matchup of this.matchups) {
      if (!matchup.startTime) continue;

      const start =
        matchup.startTime instanceof Date
          ? matchup.startTime.getTime()
          : new Date(matchup.startTime).getTime();

      const diff = start - now;

      if (diff > 0 && diff <= FIVE_MIN) {
        const minsLeft = Math.ceil(diff / 60000);
        const label = matchup.label || matchup.round || 'Next round';
        const location = matchup.location || 'designated area';

        return {
          upcoming: true,
          message: `${label} starts in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''} – Move to ${location}`,
          matchup,
        };
      }
    }

    return null;
  }

  /**
   * Convenience wrapper that returns just the formatted message string,
   * or an empty string if nothing is upcoming.
   *
   * @param  {Date|number} currentTime
   * @returns {string}
   */
  getActiveTransitionMessage(currentTime) {
    const result = this.checkUpcomingTransitions(currentTime);
    return result ? result.message : '';
  }
}

/* ------------------------------------------------------------------ */
/*  TTSAnnouncer                                                      */
/* ------------------------------------------------------------------ */

class TTSAnnouncer {
  constructor() {
    this._supported =
      typeof window !== 'undefined' && 'speechSynthesis' in window;

    const stored = localStorage.getItem('vbt_tts_enabled');
    this.enabled = stored !== null ? stored === 'true' : true;
  }

  /**
   * @returns {boolean} Whether the Web Speech API is available.
   */
  isSupported() {
    return this._supported;
  }

  /**
   * Toggle TTS on/off and persist.
   * @returns {boolean} New enabled state.
   */
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('vbt_tts_enabled', String(this.enabled));
    if (!this.enabled) this.cancel();
    return this.enabled;
  }

  /**
   * @returns {boolean} Whether TTS is currently enabled.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Speak the given text aloud.
   * @param {string} text
   */
  speak(text) {
    if (!this._supported || !this.enabled || !text) return;

    // Cancel any ongoing speech first
    this.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Cancel any ongoing speech.
   */
  cancel() {
    if (this._supported) {
      window.speechSynthesis.cancel();
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton Exports                                                 */
/* ------------------------------------------------------------------ */

export const soundBoard = new SoundBoard();
export const transitionAlerter = new TransitionAlerter();
export const ttsAnnouncer = new TTSAnnouncer();
