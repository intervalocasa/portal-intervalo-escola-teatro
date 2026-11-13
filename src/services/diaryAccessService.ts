/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Class, DiaryAccessOverrideEntry } from "../types";
import {
  getMonthlyDiaryKey,
  resolveMonthlyDiaryAccess,
  resolveClassDailyDiaryAccess
} from "../lib/deadlineUtils";

interface ActorInfo {
  uid?: string;
  name?: string;
}

/**
 * Alterna (Reabre ou Tranca) a possibilidade de lançamento de notas/registros
 * para um Diário de Turma específico (turma + mês/ano), preservando as regras de prazo padrão.
 * Retorna o novo estado efetivo: true = trancado para professores, false = liberado.
 */
export async function toggleMonthlyDiaryAccess(
  classObj: Class,
  month: number,
  year: number,
  actor?: ActorInfo
): Promise<{ lockedForProfessor: boolean; action: "reopened" | "locked"; deadlineInfo: ReturnType<typeof resolveMonthlyDiaryAccess>["deadlineInfo"] }> {
  const currentAccess = resolveMonthlyDiaryAccess(classObj, month, year);
  const key = getMonthlyDiaryKey(month, year);
  const fieldPath = `diaryAccessOverrides.${key}`;
  const classRef = doc(db, "classes", classObj.id);

  if (currentAccess.isLockedForProfessor) {
    // Ação: REABRIR
    if (!currentAccess.deadlineInfo.isExpired) {
      // Ainda está dentro do prazo normal e estava trancado manualmente -> remove o trancamento manual
      await updateDoc(classRef, {
        [fieldPath]: deleteField()
      });
    } else {
      // O prazo normal já expirou -> libera manualmente
      const entry: DiaryAccessOverrideEntry = {
        status: "unlocked",
        updatedAt: new Date().toISOString(),
        updatedByUid: actor?.uid || "",
        updatedByName: actor?.name || ""
      };
      await updateDoc(classRef, {
        [fieldPath]: entry
      });
    }
    return { lockedForProfessor: false, action: "reopened", deadlineInfo: currentAccess.deadlineInfo };
  } else {
    // Ação: TRANCAR
    if (currentAccess.deadlineInfo.isExpired) {
      // Já passou do prazo e estava reaberto manualmente -> volta ao bloqueio padrão de prazo expirado
      await updateDoc(classRef, {
        [fieldPath]: deleteField()
      });
    } else {
      // Ainda está dentro do prazo normal -> tranca manualmente
      const entry: DiaryAccessOverrideEntry = {
        status: "locked",
        updatedAt: new Date().toISOString(),
        updatedByUid: actor?.uid || "",
        updatedByName: actor?.name || ""
      };
      await updateDoc(classRef, {
        [fieldPath]: entry
      });
    }
    return { lockedForProfessor: true, action: "locked", deadlineInfo: currentAccess.deadlineInfo };
  }
}

/**
 * Alterna (Reabre ou Tranca) a possibilidade de lançamento de chamada e relato
 * para um Diário de Aula específico (turma + data YYYY-MM-DD), preservando a regra padrão de 24h.
 * Retorna o novo estado efetivo: true = trancado para professores, false = liberado.
 */
export async function toggleDailyDiaryAccess(
  classObj: Class,
  dateStr: string,
  actor?: ActorInfo
): Promise<{ lockedForProfessor: boolean; action: "reopened" | "locked"; deadlineInfo: ReturnType<typeof resolveClassDailyDiaryAccess>["deadlineInfo"] }> {
  if (!dateStr) {
    throw new Error("Data da aula não informada.");
  }

  const currentAccess = resolveClassDailyDiaryAccess(classObj, dateStr);
  const fieldPath = `dailyDiaryAccessOverrides.${dateStr}`;
  const classRef = doc(db, "classes", classObj.id);

  if (currentAccess.isLockedForProfessor) {
    // Ação: REABRIR
    if (!currentAccess.deadlineInfo.isExpired) {
      // Ainda está dentro das 24h e estava trancado manualmente -> remove o trancamento manual
      await updateDoc(classRef, {
        [fieldPath]: deleteField()
      });
    } else {
      // Prazo de 24h já expirou -> libera manualmente
      const entry: DiaryAccessOverrideEntry = {
        status: "unlocked",
        updatedAt: new Date().toISOString(),
        updatedByUid: actor?.uid || "",
        updatedByName: actor?.name || ""
      };
      await updateDoc(classRef, {
        [fieldPath]: entry
      });
    }
    return { lockedForProfessor: false, action: "reopened", deadlineInfo: currentAccess.deadlineInfo };
  } else {
    // Ação: TRANCAR
    if (currentAccess.deadlineInfo.isExpired) {
      // Prazo de 24h já expirou e estava reaberto manualmente -> volta a trancar
      await updateDoc(classRef, {
        [fieldPath]: deleteField()
      });
    } else {
      // Ainda está dentro das 24h -> tranca manualmente
      const entry: DiaryAccessOverrideEntry = {
        status: "locked",
        updatedAt: new Date().toISOString(),
        updatedByUid: actor?.uid || "",
        updatedByName: actor?.name || ""
      };
      await updateDoc(classRef, {
        [fieldPath]: entry
      });
    }
    return { lockedForProfessor: true, action: "locked", deadlineInfo: currentAccess.deadlineInfo };
  }
}
