/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from "../types";

/**
 * Returns the primary display name for a user.
 * Priority:
 * 1. artisticName (if present)
 * 2. socialName (if present)
 * 3. name (civil registration name)
 */
export function getUserDisplayName(user: Partial<User> | null | undefined): string {
  if (!user) return "";
  if (user.artisticName && user.artisticName.trim().length > 0) {
    return user.artisticName.trim();
  }
  if (user.socialName && user.socialName.trim().length > 0) {
    return user.socialName.trim();
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
 * Returns the secondary display name (subtitle under primary display name).
 * Rule:
 * - If user has BOTH artisticName and socialName, artisticName is displayed on top
 *   and socialName is displayed as the secondary name below.
 * - Under NO circumstances should civil name (user.name) be returned as a public secondary name.
 */
export function getUserSecondaryName(user: Partial<User> | null | undefined): string | undefined {
  if (!user) return undefined;
  if (
    user.artisticName &&
    user.artisticName.trim().length > 0 &&
    user.socialName &&
    user.socialName.trim().length > 0
  ) {
    return user.socialName.trim();
  }
  return undefined;
}

/**
 * Returns the civil/registration name ONLY if the viewer is a Gestor or the user themselves.
 * For all other users (teachers, students, public), the civil name is strictly hidden and never displayed.
 */
export function getUserCivilNameIfAllowed(
  user: Partial<User> | null | undefined,
  viewerIsGestorOrSelf: boolean
): string | undefined {
  if (!user) return undefined;
  if (viewerIsGestorOrSelf) {
    return user.name;
  }
  return undefined;
}
