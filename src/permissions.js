/**
 * permissions.js
 * Pure-function role-based permissions module for VBT Sports Camp.
 * All functions are side-effect-free and testable.
 */

// ─── Role Enum ───────────────────────────────────────────────
export const ROLES = {
  VOLUNTEER: 'volunteer',
  GAME_LEADER: 'game_leader',
  TEAM_LEADER: 'team_leader',
  SERVICE_LEADER: 'service_leader',
  SERVICE_DAY_LEADER: 'service_day_leader',
  COORDINATOR: 'coordinator',
};

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Returns the permission level string for a user object.
 * Defaults to 'viewer' when no role is present.
 */
export function getPermissionLevel(user) {
  return user?.role || ROLES.VOLUNTEER;
}

// ─── Scoreboard ──────────────────────────────────────────────

/**
 * Everyone can view the scoreboard.
 */
export function canViewScoreboard(/* user */) {
  return true;
}

// ─── Score Editing ───────────────────────────────────────────

/**
 * Determines whether a user may edit scores for a given matchup.
 *
 * - Admin / Service Leader: always allowed
 * - Referee: only if matchup.game is in user.assignedGames
 * - Leader / Viewer: never
 */
export function canEditScore(user, matchup /*, eventConfig */) {
  const role = getPermissionLevel(user);

  if (role === ROLES.COORDINATOR || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER) return true;

  if (role === ROLES.GAME_LEADER) {
    const assignedGames = user?.assignedGames || [];
    return assignedGames.includes(matchup?.game);
  }

  return false;
}

// ─── Deductions ──────────────────────────────────────────────

/**
 * Determines whether a user may edit deductions for a team.
 *
 * - Admin / Service Leader: always allowed
 * - Leader: only if teamCode is in user.assignedTeams
 * - Referee / Viewer: never
 */
export function canEditDeductions(user, teamCode /*, eventConfig */) {
  const role = getPermissionLevel(user);

  if (role === ROLES.COORDINATOR || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER) return true;

  if (role === ROLES.TEAM_LEADER) {
    const assignedTeams = user?.assignedTeams || [];
    return assignedTeams.includes(teamCode);
  }

  return false;
}

// ─── Tokens ──────────────────────────────────────────────────

/**
 * Only admins may edit tokens.
 */
export function canEditTokens(user) {
  return getPermissionLevel(user) === ROLES.COORDINATOR;
}

// ─── Announcements ───────────────────────────────────────────

/**
 * Admins, Leaders, and Service Leaders may post announcements.
 */
export function canPostAnnouncement(user) {
  const role = getPermissionLevel(user);
  return role === ROLES.COORDINATOR || role === ROLES.TEAM_LEADER || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER;
}

// ─── Config ──────────────────────────────────────────────────

/**
 * Only admins may edit configuration.
 */
export function canEditConfig(user) {
  return getPermissionLevel(user) === ROLES.COORDINATOR;
}

// ─── Ping ────────────────────────────────────────────────────

/**
 * Admins and Service Leaders may send pings.
 */
export function canSendPing(user) {
  const role = getPermissionLevel(user);
  return role === ROLES.COORDINATOR || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER;
}

// ─── Alerts ──────────────────────────────────────────────────

/**
 * Admins and Service Leaders may create alerts.
 */
export function canCreateAlert(user) {
  const role = getPermissionLevel(user);
  return role === ROLES.COORDINATOR || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER;
}

// ─── Editable Scopes ─────────────────────────────────────────

/**
 * Returns the list of team codes the user is allowed to edit.
 *
 * - Admin / Service Leader: all team codes from campData
 * - Leader: only user.assignedTeams
 * - Others: empty array
 */
export function getEditableTeams(user, campData) {
  const role = getPermissionLevel(user);

  if (role === ROLES.COORDINATOR || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER) {
    // Return all team codes found in campData
    if (Array.isArray(campData?.teams)) {
      return campData.teams.map((t) => t.code || t.teamCode).filter(Boolean);
    }
    if (campData?.teams && typeof campData.teams === 'object') {
      return Object.keys(campData.teams);
    }
    return [];
  }

  if (role === ROLES.TEAM_LEADER) {
    return user?.assignedTeams || [];
  }

  return [];
}

/**
 * Returns the list of games the user is allowed to edit.
 *
 * - Admin / Service Leader: all games from campData
 * - Referee: only user.assignedGames
 * - Others:  empty array
 */
export function getEditableGames(user, campData) {
  const role = getPermissionLevel(user);

  if (role === ROLES.COORDINATOR || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER) {
    if (Array.isArray(campData?.games)) {
      return campData.games.map((g) => g.name || g.game).filter(Boolean);
    }
    if (campData?.games && typeof campData.games === 'object') {
      return Object.keys(campData.games);
    }
    return [];
  }

  if (role === ROLES.GAME_LEADER) {
    return user?.assignedGames || [];
  }

  return [];
}

// ─── Stopwatch Controls ─────────────────────────────────────────

/**
 * Determines whether a user may control the matchup stopwatch.
 *
 * - Admin / Service Leader / Service Day Leader / Referee: always allowed
 * - Others: never
 */
export function canControlStopwatch(user) {
  const role = getPermissionLevel(user);
  return role === ROLES.COORDINATOR || role === ROLES.SERVICE_LEADER || role === ROLES.SERVICE_DAY_LEADER || role === ROLES.GAME_LEADER;
}
