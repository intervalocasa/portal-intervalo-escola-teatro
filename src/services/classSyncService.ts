import { 
  collection, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  doc 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Class } from "../types";

export interface SyncReport {
  totalChecked: number;
  totalUpdated: number;
  collectionsUpdated: {
    diarios_classe: number;
    autoavaliacoes: number;
    pedagogical_requests: number;
    class_daily_diaries: number;
    lesson_plans: number;
    stage_production_proposals: number;
    feedbacks_aulas: number;
  };
  details: string[];
}

/**
 * Propaga a atualização de código (nome) e tipo de uma turma para todas as coleções dependentes no Firestore.
 */
export async function propagateClassUpdate(
  classId: string, 
  newCode: string, 
  newType?: string
): Promise<{ updatedCount: number }> {
  if (!classId || !newCode) return { updatedCount: 0 };

  const normalizedCode = newCode.trim();
  let updatedCount = 0;

  try {
    const batch = writeBatch(db);
    let pendingOperations = 0;

    // Helper para comitar em lotes de até 400 operações (limite do Firestore é 500)
    const queueUpdate = async (docRef: any, data: any) => {
      batch.update(docRef, data);
      pendingOperations++;
      updatedCount++;
      if (pendingOperations >= 400) {
        await batch.commit();
        pendingOperations = 0;
      }
    };

    // 1. Diários de Aluno (diarios_classe)
    const diariesSnap = await getDocs(query(collection(db, "diarios_classe"), where("classId", "==", classId)));
    for (const d of diariesSnap.docs) {
      const data = d.data();
      const needsCode = data.className !== normalizedCode;
      const needsType = newType && data.classType !== newType;
      if (needsCode || needsType) {
        const updatePayload: any = { className: normalizedCode };
        if (newType) updatePayload.classType = newType;
        await queueUpdate(d.ref, updatePayload);
      }
    }

    // 2. Autoavaliações (autoavaliacoes)
    const evalsSnap = await getDocs(query(collection(db, "autoavaliacoes"), where("classId", "==", classId)));
    for (const d of evalsSnap.docs) {
      const data = d.data();
      const needsCode = data.className !== normalizedCode;
      const needsType = newType && data.classType !== newType;
      if (needsCode || needsType) {
        const updatePayload: any = { className: normalizedCode };
        if (newType) updatePayload.classType = newType;
        await queueUpdate(d.ref, updatePayload);
      }
    }

    // 3. Solicitações Pedagógicas (pedagogical-requests)
    const pedSnap = await getDocs(query(collection(db, "pedagogical-requests"), where("classId", "==", classId)));
    for (const d of pedSnap.docs) {
      const data = d.data();
      if (data.className !== normalizedCode) {
        await queueUpdate(d.ref, { className: normalizedCode });
      }
    }

    // 4. Diários Diários de Aula (class_daily_diaries)
    const dailySnap = await getDocs(query(collection(db, "class_daily_diaries"), where("classId", "==", classId)));
    for (const d of dailySnap.docs) {
      const data = d.data();
      const needsCode = data.className !== normalizedCode || data.classCode !== normalizedCode;
      const needsType = newType && data.classType !== newType;
      if (needsCode || needsType) {
        const updatePayload: any = { className: normalizedCode, classCode: normalizedCode };
        if (newType) updatePayload.classType = newType;
        await queueUpdate(d.ref, updatePayload);
      }
    }

    // 5. Planos de Aula (lesson_plans)
    const plansSnap = await getDocs(query(collection(db, "lesson_plans"), where("classId", "==", classId)));
    for (const d of plansSnap.docs) {
      const data = d.data();
      const needsCode = data.className !== normalizedCode;
      const needsType = newType && data.classType !== newType;
      if (needsCode || needsType) {
        const updatePayload: any = { className: normalizedCode };
        if (newType) updatePayload.classType = newType;
        await queueUpdate(d.ref, updatePayload);
      }
    }

    // 6. Propostas de Montagem Teatral (stage_production_proposals)
    const stageSnap = await getDocs(query(collection(db, "stage_production_proposals"), where("classId", "==", classId)));
    for (const d of stageSnap.docs) {
      const data = d.data();
      if (data.className !== normalizedCode) {
        await queueUpdate(d.ref, { className: normalizedCode });
      }
    }

    // 7. Feedbacks de Aulas (feedbacks-aulas)
    const fbSnap = await getDocs(query(collection(db, "feedbacks-aulas"), where("classId", "==", classId)));
    for (const d of fbSnap.docs) {
      const data = d.data();
      if (data.className !== normalizedCode) {
        await queueUpdate(d.ref, { className: normalizedCode });
      }
    }

    if (pendingOperations > 0) {
      await batch.commit();
    }

    return { updatedCount };
  } catch (error) {
    console.error("Erro ao propagar atualização de turma:", error);
    throw error;
  }
}

/**
 * Varre todo o banco de dados e sincroniza registros denormalizados com os códigos e tipos atuais de cada turma.
 */
export async function syncAllClassNamesAcrossDatabase(classes: Class[]): Promise<SyncReport> {
  const report: SyncReport = {
    totalChecked: 0,
    totalUpdated: 0,
    collectionsUpdated: {
      diarios_classe: 0,
      autoavaliacoes: 0,
      pedagogical_requests: 0,
      class_daily_diaries: 0,
      lesson_plans: 0,
      stage_production_proposals: 0,
      feedbacks_aulas: 0
    },
    details: []
  };

  if (!classes || classes.length === 0) return report;

  const classMap = new Map<string, { code: string; type: string }>();
  for (const c of classes) {
    if (c.id && c.code) {
      classMap.set(c.id, { code: c.code.trim(), type: (c.type || "").trim() });
    }
  }

  let batch = writeBatch(db);
  let batchCount = 0;

  const commitIfFull = async () => {
    if (batchCount >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  };

  try {
    // 1. diarios_classe
    const diariesSnap = await getDocs(collection(db, "diarios_classe"));
    report.totalChecked += diariesSnap.size;
    for (const docSnap of diariesSnap.docs) {
      const data = docSnap.data();
      if (data.classId && classMap.has(data.classId)) {
        const current = classMap.get(data.classId)!;
        const needsCode = data.className !== current.code;
        const needsType = current.type && data.classType !== current.type;
        if (needsCode || needsType) {
          const payload: any = { className: current.code };
          if (current.type) payload.classType = current.type;
          batch.update(docSnap.ref, payload);
          batchCount++;
          report.totalUpdated++;
          report.collectionsUpdated.diarios_classe++;
          await commitIfFull();
        }
      }
    }

    // 2. autoavaliacoes
    const evalsSnap = await getDocs(collection(db, "autoavaliacoes"));
    report.totalChecked += evalsSnap.size;
    for (const docSnap of evalsSnap.docs) {
      const data = docSnap.data();
      if (data.classId && classMap.has(data.classId)) {
        const current = classMap.get(data.classId)!;
        const needsCode = data.className !== current.code;
        const needsType = current.type && data.classType !== current.type;
        if (needsCode || needsType) {
          const payload: any = { className: current.code };
          if (current.type) payload.classType = current.type;
          batch.update(docSnap.ref, payload);
          batchCount++;
          report.totalUpdated++;
          report.collectionsUpdated.autoavaliacoes++;
          await commitIfFull();
        }
      }
    }

    // 3. pedagogical-requests
    const pedSnap = await getDocs(collection(db, "pedagogical-requests"));
    report.totalChecked += pedSnap.size;
    for (const docSnap of pedSnap.docs) {
      const data = docSnap.data();
      if (data.classId && classMap.has(data.classId)) {
        const current = classMap.get(data.classId)!;
        if (data.className !== current.code) {
          batch.update(docSnap.ref, { className: current.code });
          batchCount++;
          report.totalUpdated++;
          report.collectionsUpdated.pedagogical_requests++;
          await commitIfFull();
        }
      }
    }

    // 4. class_daily_diaries
    const dailySnap = await getDocs(collection(db, "class_daily_diaries"));
    report.totalChecked += dailySnap.size;
    for (const docSnap of dailySnap.docs) {
      const data = docSnap.data();
      if (data.classId && classMap.has(data.classId)) {
        const current = classMap.get(data.classId)!;
        const needsCode = data.className !== current.code || data.classCode !== current.code;
        const needsType = current.type && data.classType !== current.type;
        if (needsCode || needsType) {
          const payload: any = { className: current.code, classCode: current.code };
          if (current.type) payload.classType = current.type;
          batch.update(docSnap.ref, payload);
          batchCount++;
          report.totalUpdated++;
          report.collectionsUpdated.class_daily_diaries++;
          await commitIfFull();
        }
      }
    }

    // 5. lesson_plans
    const plansSnap = await getDocs(collection(db, "lesson_plans"));
    report.totalChecked += plansSnap.size;
    for (const docSnap of plansSnap.docs) {
      const data = docSnap.data();
      if (data.classId && classMap.has(data.classId)) {
        const current = classMap.get(data.classId)!;
        const needsCode = data.className !== current.code;
        const needsType = current.type && data.classType !== current.type;
        if (needsCode || needsType) {
          const payload: any = { className: current.code };
          if (current.type) payload.classType = current.type;
          batch.update(docSnap.ref, payload);
          batchCount++;
          report.totalUpdated++;
          report.collectionsUpdated.lesson_plans++;
          await commitIfFull();
        }
      }
    }

    // 6. stage_production_proposals
    const stageSnap = await getDocs(collection(db, "stage_production_proposals"));
    report.totalChecked += stageSnap.size;
    for (const docSnap of stageSnap.docs) {
      const data = docSnap.data();
      if (data.classId && classMap.has(data.classId)) {
        const current = classMap.get(data.classId)!;
        if (data.className !== current.code) {
          batch.update(docSnap.ref, { className: current.code });
          batchCount++;
          report.totalUpdated++;
          report.collectionsUpdated.stage_production_proposals++;
          await commitIfFull();
        }
      }
    }

    // 7. feedbacks-aulas
    const fbSnap = await getDocs(collection(db, "feedbacks-aulas"));
    report.totalChecked += fbSnap.size;
    for (const docSnap of fbSnap.docs) {
      const data = docSnap.data();
      if (data.classId && classMap.has(data.classId)) {
        const current = classMap.get(data.classId)!;
        if (data.className !== current.code) {
          batch.update(docSnap.ref, { className: current.code });
          batchCount++;
          report.totalUpdated++;
          report.collectionsUpdated.feedbacks_aulas++;
          await commitIfFull();
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    report.details.push(`Sincronização finalizada: ${report.totalUpdated} registro(s) atualizado(s) em ${report.totalChecked} documentos verificados.`);
    return report;
  } catch (error) {
    console.error("Erro durante a varredura e sincronização global de turmas:", error);
    throw error;
  }
}
