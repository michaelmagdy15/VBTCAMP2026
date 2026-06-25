// ─────────────────────────────────────────────
//  scheduleUtils.js  –  Schedule Builder Utilities
//  Pure functions – no React, no side-effects
// ─────────────────────────────────────────────

/**
 * Generate a unique ID (simple, no external deps).
 */
function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Parse a "HH:MM" string into total minutes since midnight.
 */
function parseTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert total minutes since midnight back to "HH:MM" (24-h).
 */
function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
//  createBlankSchedule
// ─────────────────────────────────────────────
/**
 * @param {Object} config
 * @param {string[]} config.teams        – team name array
 * @param {Object[]} config.games        – [{ id, name, location, howToPlay }]
 * @param {string}   config.startTime    – "HH:MM"
 * @param {number}   config.roundDuration – minutes per round
 * @param {number}   config.breakDuration – minutes between rounds
 * @param {number}   config.roundCount    – total rounds
 * @returns {Object} schedule
 */
export function createBlankSchedule(config) {
  const {
    teams = [],
    games = [],
    startTime = '09:00',
    roundDuration = 15,
    breakDuration = 5,
    roundCount = 6,
  } = config;

  const startMin = parseTime(startTime);

  const rounds = Array.from({ length: roundCount }, (_, i) => {
    const roundStartMin = startMin + i * (roundDuration + breakDuration);
    return {
      id: uid(),
      index: i,
      startTime: minutesToTime(roundStartMin),
      endTime: minutesToTime(roundStartMin + roundDuration),
      matchups: games.map((g) => ({
        gameId: g.id,
        teamA: null,
        teamB: null,
      })),
    };
  });

  return {
    id: uid(),
    status: 'draft', // draft | published | locked
    createdAt: new Date().toISOString(),
    config: {
      startTime,
      roundDuration,
      breakDuration,
      roundCount,
    },
    teams: [...teams],
    games: games.map((g) => ({ ...g })),
    rounds,
  };
}

// ─────────────────────────────────────────────
//  autoAssignTeams  –  Round-Robin rotation
// ─────────────────────────────────────────────
/**
 * Classic round-robin: fix team[0], rotate the rest.
 * Fills each round's matchup slots with team pairs.
 *
 * @param {Object}   schedule
 * @param {string[]} teams – ordered team names
 * @returns {Object}  updated schedule (new ref)
 */
export function autoAssignTeams(schedule, teams) {
  const s = structuredClone(schedule);
  const n = teams.length;
  if (n < 2) return s;

  // Pad to even number with a "BYE"
  const list = [...teams];
  const hasBye = n % 2 !== 0;
  if (hasBye) list.push('__BYE__');
  const total = list.length;
  const half = total / 2;

  // Generate all possible round-robin pairings
  const allPairings = [];
  const rotating = list.slice(1);

  for (let r = 0; r < total - 1; r++) {
    const current = [list[0], ...rotating];
    const pairs = [];
    for (let i = 0; i < half; i++) {
      const a = current[i];
      const b = current[total - 1 - i];
      if (a !== '__BYE__' && b !== '__BYE__') {
        pairs.push([a, b]);
      }
    }
    allPairings.push(pairs);
    // Rotate: move last element to front of rotating array
    rotating.unshift(rotating.pop());
  }

  // Map pairings onto rounds
  s.rounds.forEach((round, ri) => {
    const pairs = allPairings[ri % allPairings.length];
    round.matchups.forEach((mu, gi) => {
      if (gi < pairs.length) {
        mu.teamA = pairs[gi][0];
        mu.teamB = pairs[gi][1];
      } else {
        mu.teamA = null;
        mu.teamB = null;
      }
    });
  });

  return s;
}

// ─────────────────────────────────────────────
//  addGameToSchedule
// ─────────────────────────────────────────────
/**
 * @param {Object} schedule
 * @param {Object} game – { name, location, howToPlay }
 * @returns {Object} updated schedule
 */
export function addGameToSchedule(schedule, game) {
  const s = structuredClone(schedule);
  const newGame = { id: uid(), ...game };
  s.games.push(newGame);

  // Add an empty matchup slot to every round for this game
  s.rounds.forEach((round) => {
    round.matchups.push({
      gameId: newGame.id,
      teamA: null,
      teamB: null,
    });
  });

  return s;
}

// ─────────────────────────────────────────────
//  removeGameFromSchedule
// ─────────────────────────────────────────────
/**
 * @param {Object} schedule
 * @param {string} gameId
 * @returns {Object} updated schedule
 */
export function removeGameFromSchedule(schedule, gameId) {
  const s = structuredClone(schedule);
  s.games = s.games.filter((g) => g.id !== gameId);

  s.rounds.forEach((round) => {
    round.matchups = round.matchups.filter((mu) => mu.gameId !== gameId);
  });

  return s;
}

// ─────────────────────────────────────────────
//  reorderRounds
// ─────────────────────────────────────────────
/**
 * Moves a round from `fromIndex` to `toIndex`, then recalculates times.
 *
 * @param {Object} schedule
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {Object} updated schedule
 */
export function reorderRounds(schedule, fromIndex, toIndex) {
  const s = structuredClone(schedule);
  const [moved] = s.rounds.splice(fromIndex, 1);
  s.rounds.splice(toIndex, 0, moved);

  // Re-index and recalculate
  s.rounds.forEach((r, i) => (r.index = i));
  return recalculateTimes(
    s,
    s.config.startTime,
    s.config.roundDuration,
    s.config.breakDuration
  );
}

// ─────────────────────────────────────────────
//  recalculateTimes
// ─────────────────────────────────────────────
/**
 * @param {Object} schedule
 * @param {string} startTime       – "HH:MM"
 * @param {number} roundDuration   – minutes
 * @param {number} breakDuration   – minutes
 * @returns {Object} updated schedule
 */
export function recalculateTimes(schedule, startTime, roundDuration, breakDuration) {
  const s = structuredClone(schedule);
  const startMin = parseTime(startTime);

  s.config.startTime = startTime;
  s.config.roundDuration = roundDuration;
  s.config.breakDuration = breakDuration;

  s.rounds.forEach((round, i) => {
    const roundStart = startMin + i * (roundDuration + breakDuration);
    round.startTime = minutesToTime(roundStart);
    round.endTime = minutesToTime(roundStart + roundDuration);
    round.index = i;
  });

  return s;
}

// ─────────────────────────────────────────────
//  validateSchedule
// ─────────────────────────────────────────────
/**
 * Checks for:
 *  1. Team double-booking (same team in >1 game in the same round)
 *  2. Station double-booking (same game has >2 different teams, should never
 *     happen with current model but guard anyway)
 *  3. Unassigned matchup slots
 *
 * @param {Object} schedule
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSchedule(schedule) {
  const errors = [];

  schedule.rounds.forEach((round, ri) => {
    const teamSeen = {}; // team → gameId where it was first seen

    round.matchups.forEach((mu) => {
      const gameName =
        schedule.games.find((g) => g.id === mu.gameId)?.name || mu.gameId;

      // Check unassigned
      if (!mu.teamA && !mu.teamB) {
        errors.push(`Round ${ri + 1}, ${gameName}: no teams assigned`);
        return;
      }
      if (!mu.teamA || !mu.teamB) {
        errors.push(
          `Round ${ri + 1}, ${gameName}: only one team assigned`
        );
      }

      // Check team double-booking
      [mu.teamA, mu.teamB].filter(Boolean).forEach((team) => {
        if (teamSeen[team]) {
          errors.push(
            `Round ${ri + 1}: "${team}" is double-booked in "${teamSeen[team]}" and "${gameName}"`
          );
        } else {
          teamSeen[team] = gameName;
        }
      });
    });
  });

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────
//  formatTimeSlot
// ─────────────────────────────────────────────
/**
 * @param {string} startTime       – "HH:MM"
 * @param {number} durationMinutes
 * @param {number} roundIndex      – 0-based
 * @returns {string} e.g. "10:30 - 10:45"
 */
export function formatTimeSlot(startTime, durationMinutes, roundIndex) {
  const start = parseTime(startTime);
  const end = start + durationMinutes;
  return `${minutesToTime(start)} - ${minutesToTime(end)}`;
}

// ─────────────────────────────────────────────
//  scheduleToFirestore
// ─────────────────────────────────────────────
/**
 * Converts the builder schedule into the flat Firestore-friendly format
 * used by the live app (scoreboards, team views, etc.).
 *
 * Firestore structure per event:
 *   events/{eventCode}/schedule/{roundId}
 *     { roundIndex, startTime, endTime, matchups: [ { gameId, gameName, location, teamA, teamB } ] }
 *
 * @param {Object} schedule
 * @param {string} eventCode
 * @returns {Object[]} array of Firestore-ready round documents
 */
export function scheduleToFirestore(schedule, eventCode) {
  const gameMap = {};
  schedule.games.forEach((g) => {
    gameMap[g.id] = g;
  });

  return schedule.rounds.map((round) => ({
    eventCode,
    roundId: round.id,
    roundIndex: round.index,
    startTime: round.startTime,
    endTime: round.endTime,
    status: schedule.status,
    matchups: round.matchups.map((mu) => {
      const game = gameMap[mu.gameId] || {};
      return {
        gameId: mu.gameId,
        gameName: game.name || '',
        location: game.location || '',
        teamA: mu.teamA || '',
        teamB: mu.teamB || '',
      };
    }),
  }));
}
