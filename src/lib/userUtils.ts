/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Class } from "../types";

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

/**
 * Checks if a given role string corresponds to a Director, Pedagogical Director, or Gestor.
 * Robust to accents, casing, and variations.
 */
export function isDirectorOrGestor(role?: string | null): boolean {
  if (!role) return false;
  const norm = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return (
    norm.includes("gestor") || 
    norm.includes("diretor") || 
    norm.includes("diretora") ||
    norm.includes("pedagogic") ||
    norm === "admin"
  );
}

/**
 * Checks if a given role string corresponds to staff (Gestor, Diretor, or Auxiliar Administrativo).
 */
export function isStaffOrAdmin(role?: string | null): boolean {
  if (!role) return false;
  const norm = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return (
    isDirectorOrGestor(role) ||
    norm.includes("auxiliar")
  );
}

/**
 * Checks if a given role string corresponds to a teacher/professor.
 */
export function isProfessorOrTeacher(role?: string | null): boolean {
  if (!role) return false;
  const norm = role.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return (
    norm.includes("professor") ||
    norm.includes("professora") ||
    norm.includes("docente")
  );
}

/**
 * Checks if a user is inactive at the user account level.
 * Handles boolean flags, status strings, and migrated marker documents.
 */
export function isStudentInactive(user: Partial<User> | null | undefined): boolean {
  if (!user) return true;
  const anyUser = user as any;
  if (
    anyUser.inactive === true ||
    anyUser.isInactive === true ||
    anyUser.active === false ||
    anyUser.desmatriculado === true
  ) {
    return true;
  }
  const status = String(anyUser.status || "").trim().toLowerCase();
  if (
    status === "inativo" ||
    status === "desmatriculado" ||
    status === "trancado" ||
    status === "cancelado" ||
    status === "removido"
  ) {
    return true;
  }
  const enrollmentStatus = String(anyUser.enrollmentStatus || "").trim().toLowerCase();
  if (
    enrollmentStatus === "inativo" ||
    enrollmentStatus === "desmatriculado" ||
    enrollmentStatus === "trancado" ||
    enrollmentStatus === "cancelado" ||
    enrollmentStatus === "removido"
  ) {
    return true;
  }
  if (anyUser.migratedTo) {
    return true; // legacy migrated marker document
  }
  return false;
}

/**
 * Checks if a student is inactive in the context of a specific class.
 * Returns true if the student account is inactive OR if their enrollment in the class is inactive/trancado/removido.
 */
export function isStudentInactiveInClass(
  user: Partial<User> | null | undefined,
  classObj?: Partial<Class> | null | undefined
): boolean {
  if (isStudentInactive(user)) return true;
  if (!classObj) return false;

  const statuses = classObj.studentEnrollmentStatuses;
  if (statuses && user) {
    const rawStatus =
      (user.id && statuses[user.id]) ||
      (user.migratedFrom && statuses[user.migratedFrom]) ||
      (user.migratedTo && statuses[user.migratedTo]);

    if (rawStatus) {
      const sLower = String(rawStatus).trim().toLowerCase();
      if (
        sLower === "inativo" ||
        sLower === "trancado" ||
        sLower === "desmatriculado" ||
        sLower === "cancelado" ||
        sLower === "removido" ||
        sLower.includes("inativ") ||
        sLower.includes("trancad")
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns true if a user is an active student in a class.
 * Checks role, account activity, class enrollment status, and enrollment in studentIds.
 */
export function isStudentActiveInClass(
  user: Partial<User> | null | undefined,
  classObj?: Partial<Class> | null | undefined
): boolean {
  if (!user || !classObj) return false;
  if (user.role && user.role !== "Aluno") return false;
  if (isStudentInactiveInClass(user, classObj)) return false;

  const studentIds = classObj.studentIds || [];
  const matchesId = Boolean(user.id && studentIds.includes(user.id));
  const matchesMigrated = Boolean(
    (user.migratedFrom && studentIds.includes(user.migratedFrom)) ||
    (user.migratedTo && studentIds.includes(user.migratedTo))
  );

  return Boolean(matchesId || matchesMigrated);
}

