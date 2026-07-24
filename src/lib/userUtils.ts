/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from "../types";

/**
 * Returns the official public display name for a user.
 * Guaranteed by Brazilian law for trans individuals: if socialName is provided,
 * it MUST be used as the official display name across all public views, class rosters,
 * teacher dashboards, diários, and reports.
 */
export function getUserDisplayName(user: Partial<User> | null | undefined): string {
  if (!user) return "";
  if (user.socialName && user.socialName.trim().length > 0) {
    return user.socialName.trim();
  }
  if (user.artisticName && user.artisticName.trim().length > 0) {
    return user.artisticName.trim();
  }
  return user.name?.trim() || "";
}

/**
 * Returns the user's pronouns if set, e.g., "ele/dele", "ela/dela", "elu/delu".
 */
export function getUserPronouns(user: Partial<User> | null | undefined): string | undefined {
  if (user?.pronouns && user.pronouns.trim().length > 0) {
    return user.pronouns.trim();
  }
  return undefined;
}

/**
 * Returns the public display string with pronouns if available, e.g.:
 * "Alex Silva (elu/delu)"
 */
export function getUserDisplayNameWithPronouns(user: Partial<User> | null | undefined): string {
  const name = getUserDisplayName(user);
  if (!name) return "";
  const pronouns = getUserPronouns(user);
  return pronouns ? `${name} (${pronouns})` : name;
}

/**
 * Returns the civil/registration name ONLY if the viewer is a Gestor or the user themselves.
 * For all other users (teachers, students, public), if a socialName is set,
 * the civil name is strictly hidden and never displayed anywhere in the system.
 */
export function getUserCivilNameIfAllowed(
  user: Partial<User> | null | undefined,
  viewerIsGestorOrSelf: boolean
): string | undefined {
  if (!user) return undefined;
  if (viewerIsGestorOrSelf) {
    return user.name;
  }
  // For non-gestors: if socialName exists, civil name is forbidden
  if (user.socialName && user.socialName.trim().length > 0) {
    return undefined;
  }
  return user.artisticName ? undefined : user.name;
}
