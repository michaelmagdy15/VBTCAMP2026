/**
 * matchupEngine.js
 * ─────────────────────────────────────────────────────────────
 * Generalized Round-Robin scheduling engine for VBT Sports Camp.
 * Uses the circle method to generate fair matchups across any
 * number of teams and stations.
 * ─────────────────────────────────────────────────────────────
 */

// ── Time Helpers ──────────────────────────────────────────────

/**
 * Parse a 12-hour time string (e.g. '03:15 PM') into total minutes since midnight.
 * @param {string} timeStr - Time in 'hh:mm AM/PM' format
 * @returns {number} Total minutes since midnight
 */
function parseTime(timeStr) {
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) {
    throw new Error(`Invalid time format: "${timeStr}". Expected "hh:mm AM/PM".`);
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];

  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}

/**
 * Format total minutes since midnight into a 12-hour time string.
 * @param {number} totalMinutes - Minutes since midnight
 * @returns {string} Formatted time string (e.g. '03:15 PM')
 */
function formatTime(totalMinutes) {
  let hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';

  if (hours === 0) hours = 12;
  else if (hours > 12) hours -= 12;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

// ── Time Slot Calculation ─────────────────────────────────────

/**
 * Calculate an array of time slot strings for each round.
 *
 * @param {string}  startTime            - Start time for round 1 (e.g. '03:15 PM')
 * @param {number}  roundCount           - Number of rounds to generate
 * @param {number}  roundDurationMinutes - Duration of each round in minutes
 * @param {number}  breakMinutes         - Break duration between rounds in minutes
 * @returns {string[]} Array of formatted time strings, one per round
 */
export function calculateTimeSlots(startTime, roundCount, roundDurationMinutes, breakMinutes) {
  const startMinutes = parseTime(startTime);
  const slots = [];

  for (let i = 0; i < roundCount; i++) {
    const offset = i * (roundDurationMinutes + breakMinutes);
    slots.push(formatTime(startMinutes + offset));
  }

  return slots;
}

// ── Round-Robin Generator (Circle Method) ─────────────────────

/**
 * Generate a full round-robin schedule using the circle method.
 *
 * The circle method works as follows:
 *   1. Fix team[0] in place.
 *   2. Rotate the remaining teams clockwise each round.
 *   3. Pair the first half with the mirrored second half.
 *   4. For odd team counts, a 'BYE' placeholder is inserted
 *      and any team paired with BYE receives a rest round.
 *
 * @param {string[]} teams    - Array of team names (e.g. ['Red 1', 'Red 2', 'White 1', 'White 2'])
 * @param {Object[]} stations - Array of { name: string, location: string }
 * @param {Object}   options  - Optional configuration
 * @param {string}   [options.startTime='03:15 PM']        - Start time for round 1
 * @param {number}   [options.roundDurationMinutes=20]      - Duration per round
 * @param {number}   [options.breakMinutes=0]               - Break between rounds
 * @param {number}   [options.daysCount=1]                  - Number of days to schedule
 *
 * @returns {Object[]} Array of matchup objects:
 *   { day, block, round, game, time, teamA, teamB, location }
 */
export function generateRoundRobin(teams, stations, options = {}) {
  const {
    startTime = '03:15 PM',
    roundDurationMinutes = 20,
    breakMinutes = 0,
    daysCount = 1,
  } = options;

  if (!teams || teams.length < 2) {
    throw new Error('At least 2 teams are required to generate a round-robin schedule.');
  }
  if (!stations || stations.length < 1) {
    throw new Error('At least 1 station is required.');
  }

  // If odd number of teams, add BYE placeholder
  const teamList = [...teams];
  const isOdd = teamList.length % 2 !== 0;
  if (isOdd) {
    teamList.push('BYE');
  }

  const n = teamList.length;
  const totalRounds = n - 1;
  const gamesPerRound = Math.floor(n / 2);

  // Calculate time slots for all rounds
  const timeSlots = calculateTimeSlots(startTime, totalRounds, roundDurationMinutes, breakMinutes);

  const allMatchups = [];

  for (let day = 1; day <= daysCount; day++) {
    // Build the rotating list (exclude index 0 which stays fixed)
    const rotating = teamList.slice(1);

    for (let round = 0; round < totalRounds; round++) {
      // Build current round order: fixed team + rotated list
      const currentOrder = [teamList[0], ...rotating];
      let gameIndex = 0;

      for (let i = 0; i < gamesPerRound; i++) {
        const teamA = currentOrder[i];
        const teamB = currentOrder[n - 1 - i];

        // Assign station via circular rotation to prevent collisions
        const stationIdx = (i + round) % stations.length;
        const station = stations[stationIdx];

        allMatchups.push({
          day,
          block: day,
          round: round + 1,
          game: gameIndex + 1,
          time: timeSlots[round],
          teamA,
          teamB,
          location: station.location || station.name,
          isBye: teamA === 'BYE' || teamB === 'BYE',
        });

        gameIndex++;
      }

      // Rotate: move last element to the front of the rotating array
      rotating.unshift(rotating.pop());
    }
  }

  return allMatchups;
}

// ── Schedule Validation ───────────────────────────────────────

/**
 * Validate a generated schedule for conflicts.
 *
 * Checks:
 *   1. No team plays twice in the same round (within the same day).
 *   2. No station/location is double-booked in the same round (within the same day).
 *
 * @param {Object[]} matchups - Array of matchup objects from generateRoundRobin
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSchedule(matchups) {
  const errors = [];

  // Group matchups by day + round
  const roundGroups = {};
  for (const m of matchups) {
    if (m.isBye) continue; // Skip BYE matchups for validation

    const key = `day${m.day}_round${m.round}`;
    if (!roundGroups[key]) roundGroups[key] = [];
    roundGroups[key].push(m);
  }

  for (const [key, games] of Object.entries(roundGroups)) {
    const teamsInRound = new Set();
    const locationsInRound = new Set();

    for (const game of games) {
      // Check team double-play
      if (teamsInRound.has(game.teamA)) {
        errors.push(`${key}: Team "${game.teamA}" is scheduled to play more than once.`);
      }
      if (teamsInRound.has(game.teamB)) {
        errors.push(`${key}: Team "${game.teamB}" is scheduled to play more than once.`);
      }
      teamsInRound.add(game.teamA);
      teamsInRound.add(game.teamB);

      // Check location double-booking
      if (locationsInRound.has(game.location)) {
        errors.push(`${key}: Location "${game.location}" is double-booked.`);
      }
      locationsInRound.add(game.location);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
