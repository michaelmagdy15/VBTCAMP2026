/**
 * permissions.js
 * Pure-function role-based permissions module for VBT Sports Camp.
 * All functions are side-effect-free and testable.
 */

// ─── Role Enum ───────────────────────────────────────────────
export const ROLES = {
  VIEWER: 'viewer',
  REFEREE: 'referee',
  LEADER: 'leader',
  ADMIN: 'admin',
};

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Returns the permission level string for a user object.
 * Defaults to 'viewer' when no role is present.
 */
export function getPermissionLevel(user) {
  return user?.role || ROLES.VIEWER;
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
 * - Admin:   always allowed
 * - Referee: only if matchup.game is in user.assignedGames
 * - Leader / Viewer: never
 */
export function canEditScore(user, matchup /*, eventConfig */) {
  const role = getPermissionLevel(user);

  if (role === ROLES.ADMIN) return true;

  if (role === ROLES.REFEREE) {
    const assignedGames = user?.assignedGames || [];
    return assignedGames.includes(matchup?.game);
  }

  return false;
}

// ─── Deductions ──────────────────────────────────────────────

/**
 * Determines whether a user may edit deductions for a team.
 *
 * - Admin:  always allowed
 * - Leader: only if teamCode is in user.assignedTeams
 * - Referee / Viewer: never
 */
export function canEditDeductions(user, teamCode /*, eventConfig */) {
  const role = getPermissionLevel(user);

  if (role === ROLES.ADMIN) return true;

  if (role === ROLES.LEADER) {
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
  return getPermissionLevel(user) === ROLES.ADMIN;
}

// ─── Announcements ───────────────────────────────────────────

/**
 * Admins and Leaders may post announcements.
 */
export function canPostAnnouncement(user) {
  const role = getPermissionLevel(user);
  return role === ROLES.ADMIN || role === ROLES.LEADER;
}

// ─── Config ──────────────────────────────────────────────────

/**
 * Only admins may edit configuration.
 */
export function canEditConfig(user) {
  return getPermissionLevel(user) === ROLES.ADMIN;
}

// ─── Ping ────────────────────────────────────────────────────

/**
 * Only admins may send pings.
 */
export function canSendPing(user) {
  return getPermissionLevel(user) === ROLES.ADMIN;
}

// ─── Alerts ──────────────────────────────────────────────────

/**
 * Only admins may create alerts.
 */
export function canCreateAlert(user) {
  return getPermissionLevel(user) === ROLES.ADMIN;
}

// ─── Editable Scopes ─────────────────────────────────────────

/**
 * Returns the list of team codes the user is allowed to edit.
 *
 * - Admin:  all team codes from campData
 * - Leader: only user.assignedTeams
 * - Others: empty array
 */
export function getEditableTeams(user, campData) {
  const role = getPermissionLevel(user);

  if (role === ROLES.ADMIN) {
    // Return all team codes found in campData
    if (Array.isArray(campData?.teams)) {
      return campData.teams.map((t) => t.code || t.teamCode).filter(Boolean);
    }
    if (campData?.teams && typeof campData.teams === 'object') {
      return Object.keys(campData.teams);
    }
    return [];
  }

  if (role === ROLES.LEADER) {
    return user?.assignedTeams || [];
  }

  return [];
}

/**
 * Returns the list of games the user is allowed to edit.
 *
 * - Admin:   all games from campData
 * - Referee: only user.assignedGames
 * - Others:  empty array
 */
export function getEditableGames(user, campData) {
  const role = getPermissionLevel(user);

  if (role === ROLES.ADMIN) {
    if (Array.isArray(campData?.games)) {
      return campData.games.map((g) => g.name || g.game).filter(Boolean);
    }
    if (campData?.games && typeof campData.games === 'object') {
      return Object.keys(campData.games);
    }
    return [];
  }

  if (role === ROLES.REFEREE) {
    return user?.assignedGames || [];
  }

  return [];
}
