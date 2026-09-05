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
 * Handles boolean flags, status strings, numbers, and migrated marker documents.
 */
export function isStudentInactive(user: Partial<User> | null | undefined): boolean {
  if (!user) return true;
  const anyUser = user as any;

  // Boolean or truthy inactive flags
  if (
    anyUser.inactive === true ||
    anyUser.inactive === "true" ||
    anyUser.inactive === 1 ||
    anyUser.inactive === "1" ||
    anyUser.isInactive === true ||
    anyUser.isInactive === "true" ||
    anyUser.isInactive === 1 ||
    anyUser.isInactive === "1" ||
    anyUser.desmatriculado === true ||
    anyUser.desmatriculado === "true" ||
    anyUser.desmatriculado === 1 ||
    anyUser.trancado === true ||
    anyUser.trancado === "true" ||
    anyUser.bloqueado === true ||
    anyUser.bloqueado === "true" ||
    anyUser.deleted === true ||
    anyUser.isDeleted === true
  ) {
    return true;
  }

  // Explicit false active flags
  if (
    anyUser.active === false ||
    anyUser.active === "false" ||
    anyUser.active === 0 ||
    anyUser.active === "0" ||
    anyUser.ativo === false ||
    anyUser.ativo === "false" ||
    anyUser.ativo === 0 ||
    anyUser.ativo === "0" ||
    anyUser.isActive === false ||
    anyUser.isActive === "false" ||
    anyUser.isActive === 0 ||
    anyUser.isAtivo === false ||
    anyUser.isAtivo === "false"
  ) {
    return true;
  }

  // String status checks
  const statusStrings = [
    anyUser.status,
    anyUser.enrollmentStatus,
    anyUser.statusMatricula,
    anyUser.situacaoMatricula,
    anyUser.situacao,
    anyUser.situation,
    anyUser.estado,
    anyUser.studentStatus
  ].filter(Boolean).map(s => String(s).trim().toLowerCase());

  for (const s of statusStrings) {
    if (
      s === "inativo" ||
      s === "inativa" ||
      s === "desmatriculado" ||
      s === "desmatriculada" ||
      s === "trancado" ||
      s === "trancada" ||
      s === "cancelado" ||
      s === "cancelada" ||
      s === "removido" ||
      s === "removida" ||
      s === "desistente" ||
      s === "afastado" ||
      s === "afastada" ||
      s === "abandonou" ||
      s.includes("inativ") ||
      s.includes("tranc") ||
      s.includes("desmatric") ||
      s.includes("cancel") ||
      s.includes("desist") ||
      s.includes("remov") ||
      s.includes("afastad")
    ) {
      return true;
    }
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
  if (!user) return true;
  if (isStudentInactive(user)) return true;
  if (!classObj) return false;

  const statuses = classObj.studentEnrollmentStatuses;
  if (statuses && typeof statuses === "object") {
    // Collect all candidate keys for matching
    const candidateKeys = [
      user.id,
      user.migratedFrom,
      user.migratedTo,
      user.email,
      user.cpf ? user.cpf.replace(/\D/g, "") : ""
    ].filter(Boolean).map(k => String(k).trim().toLowerCase());

    for (const [rawKey, rawVal] of Object.entries(statuses)) {
      if (rawVal === undefined || rawVal === null) continue;
      const cleanKey = String(rawKey).trim().toLowerCase();
      const cleanCpfKey = String(rawKey).replace(/\D/g, "");

      const keyMatches = 
        candidateKeys.includes(cleanKey) ||
        (cleanCpfKey.length >= 9 && candidateKeys.includes(cleanCpfKey));

      if (keyMatches) {
        if (typeof rawVal === "boolean") {
          return !rawVal; // false means inactive
        }
        const sLower = String(rawVal).trim().toLowerCase();
        if (
          sLower === "inativo" ||
          sLower === "inativa" ||
          sLower === "trancado" ||
          sLower === "trancada" ||
          sLower === "desmatriculado" ||
          sLower === "desmatriculada" ||
          sLower === "cancelado" ||
          sLower === "cancelada" ||
          sLower === "removido" ||
          sLower === "removida" ||
          sLower === "desistente" ||
          sLower.includes("inativ") ||
          sLower.includes("tranc") ||
          sLower.includes("cancel") ||
          sLower.includes("desmatric") ||
          sLower.includes("remov") ||
          sLower.includes("desist")
        ) {
          return true;
        }
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

  // Verify role: if a role is provided, it must be Aluno
  if (user.role) {
    const rLower = String(user.role).trim().toLowerCase();
    if (rLower !== "aluno" && rLower !== "student") {
      return false;
    }
  }

  // Must not be inactive globally or in the specific class
  if (isStudentInactive(user)) return false;
  if (isStudentInactiveInClass(user, classObj)) return false;

  const studentIds = (classObj.studentIds || []).map(id => String(id).trim().toLowerCase());
  const candidateIds = [
    user.id,
    user.migratedFrom,
    user.migratedTo,
    user.email,
    user.cpf ? user.cpf.replace(/\D/g, "") : ""
  ].filter(Boolean).map(id => String(id).trim().toLowerCase());

  const isEnrolled = candidateIds.some(cid => studentIds.includes(cid));
  return isEnrolled;
}

/**
 * Checks if a student is desmatriculado (formerly inativo).
 * Mirrors isStudentInactive to ensure all inactive and desmatriculado students
 * are uniformly treated as desmatriculados across the application.
 */
export const isStudentDesmatriculado = isStudentInactive;

/**
 * Returns the human-readable enrollment status label for a student.
 * Excludes "Inativo" tag entirely, mapping all inactive states to "Desmatriculado".
 */
export function getStudentStatusLabel(user: Partial<User> | null | undefined): "Matriculado" | "Desmatriculado" {
  return isStudentInactive(user) ? "Desmatriculado" : "Matriculado";
}

