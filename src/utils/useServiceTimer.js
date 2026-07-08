import { useState, useEffect } from 'react';
import { triggerHaptic } from './haptics';
import { playChime } from '../chimes';
import { serverTimeOffsetMs } from '../firebase';

/**
 * useServiceTimer
 * Custom hook to track local service timing against a scheduled event start.
 * Transitions into a static offline fallback mode if disconnected 30 minutes before kickoff.
 * Fires audio and haptic alerts for important schedule milestones (e.g., 1 min remaining).
 *
 * @param {Array} schedule - Array of round objects { round_number, start_time, duration_mins }
 * @param {boolean} isOffline - Boolean indicating network connection status
 */
export function useServiceTimer(schedule, isOffline) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(-1);
  const [timeRemainingSecs, setTimeRemainingSecs] = useState(0);
  const [isStaticFallbackMode, setIsStaticFallbackMode] = useState(false);

  useEffect(() => {
    if (!schedule || schedule.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now() + serverTimeOffsetMs;
      
      // Determine if we need to enter static fallback mode (offline 30 mins before first round)
      const firstRoundStartTime = schedule[0]?.start_time || 0;
      if (isOffline && firstRoundStartTime > 0 && firstRoundStartTime - now <= 30 * 60 * 1000) {
        setIsStaticFallbackMode(true);
      } else if (!isOffline) {
        setIsStaticFallbackMode(false);
      }

      // Calculate active round based on local time
      let activeIndex = -1;
      let remainingSecs = 0;

      for (let i = 0; i < schedule.length; i++) {
        const round = schedule[i];
        const roundStart = round.start_time;
        const roundEnd = round.start_time + (round.duration_mins * 60 * 1000);

        if (now >= roundStart && now < roundEnd) {
          activeIndex = i;
          remainingSecs = Math.floor((roundEnd - now) / 1000);
          break;
        } else if (now < roundStart && i === 0) {
          // Before first round
          remainingSecs = Math.floor((roundStart - now) / 1000);
          break;
        }
      }

      // Handle alerts
      if (activeIndex !== -1 && remainingSecs === 60) {
        // 1 minute remaining alert
        triggerHaptic('warning');
        playChime('countdown');
      }
      
      if (activeIndex !== -1 && remainingSecs === 0) {
        // Round ended alert
        triggerHaptic('success');
        playChime('round_start');
      }

      setCurrentRoundIndex(activeIndex);
      setTimeRemainingSecs(remainingSecs);

    }, 1000);

    return () => clearInterval(interval);
  }, [schedule, isOffline]);

  return { currentRoundIndex, timeRemainingSecs, isStaticFallbackMode };
}
