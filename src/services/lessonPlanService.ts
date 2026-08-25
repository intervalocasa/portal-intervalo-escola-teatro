/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { LessonPlan, Skill, Class, User } from "../types";
import { ADULT_COURSE_CRITERIA, PROFESSIONAL_COURSE_CRITERIA } from "../constants";

// Seed skills if the collection is empty
export const DEFAULT_SKILLS: Array<{ id: string; name: string; definition: string; category: string }> = [
  { id: "presence", name: "Presença cênica", definition: "Capacidade de sustentar atenção, disponibilidade e impacto em cena.", category: "Interpretação" },
  { id: "body", name: "Consciência corporal", definition: "Uso do corpo como instrumento expressivo, disponível e organizado em cena.", category: "Corpo & Movimento" },
  { id: "vocal", name: "Expressividade vocal", definition: "Projeção, articulação, intenção e uso expressivo da voz.", category: "Voz & Fala" },
  { id: "listening", name: "Escuta e prontidão cênica", definition: "Capacidade de reagir ao parceiro, ao jogo e aos estímulos da cena com atenção viva.", category: "Jogo Teatral" },
  { id: "impro", name: "Improvisação e criatividade cênica", definition: "Capacidade de propor, imaginar e sustentar ações em situações abertas de criação.", category: "Criação" },
  { id: "character", name: "Construção de personagem", definition: "Capacidade de compor identidade, intenção, comportamento e lógica de personagem.", category: "Interpretação" },
  { id: "partner", name: "Relação com o parceiro e trabalho em grupo", definition: "Capacidade de atuar em relação, respeitar o coletivo e construir cena em conjunto.", category: "Coletivo" },
  { id: "text", name: "Apropriação de texto e memorização cênica", definition: "Capacidade de memorizar, compreender e sustentar texto com intenção e organicidade.", category: "Dramaturgia" },
  { id: "space", name: "Organização espacial e composição de cena", definition: "Uso do espaço, marcações, deslocamentos e leitura da cena como composição.", category: "Espaço" },
  { id: "autonomy", name: "Autonomia e compromisso com o processo", definition: "Responsabilidade do aluno com o trabalho, prontidão para aula/ensaio e capacidade de avançar no processo com iniciativa.", category: "Pedagógico" },
  { id: "discipline", name: "Disciplina de ensaio", definition: "Capacidade de manter foco, constância, organização e conduta adequada durante os ensaios.", category: "Montagem" },
  { id: "direction", name: "Resposta à direção", definition: "Capacidade de escutar, compreender e incorporar orientações de direção de forma prática.", category: "Direção" },
  { id: "dramaturgy", name: "Compreensão dramatúrgica da obra", definition: "Capacidade de compreender a estrutura da obra, os conflitos e a função da cena.", category: "Dramaturgia" }
];

/**
 * Busca todas as habilidades (skills) da coleção no Firestore.
 * Se a coleção estiver vazia, faz o seed automático com as habilidades pedagógicas padrão.
 */
export async function fetchSkills(): Promise<Skill[]> {
  const collectionPath = "skills";
  try {
    const snap = await getDocs(collection(db, collectionPath));
    if (!snap.empty) {
      return snap.docs.map(d => ({
        id: d.id,
        name: d.data().name || d.data().label || d.id,
        definition: d.data().definition || d.data().description || "",
        category: d.data().category || "Geral",
        active: d.data().active !== false,
        createdAt: d.data().createdAt
      }));
    }

    // Coleção vazia: fazer seed inicial e retornar
    const seededSkills: Skill[] = [];
    for (const item of DEFAULT_SKILLS) {
      const skillRef = doc(db, collectionPath, item.id);
      const skillData: Skill = {
        id: item.id,
        name: item.name,
        definition: item.definition,
        category: item.category,
        active: true,
        createdAt: new Date().toISOString()
      };
      await setDoc(skillRef, skillData);
      seededSkills.push(skillData);
    }
    return seededSkills;
  } catch (error) {
    console.warn("Could not fetch skills from Firestore, using default skill catalog fallback:", error);
    // Fallback to local default skills if offline or permission issue
    return DEFAULT_SKILLS.map(s => ({
      id: s.id,
      name: s.name,
      definition: s.definition,
      category: s.category,
      active: true
    }));
  }
}

/**
 * Cria uma nova habilidade na coleção skills do Firestore
 */
export async function createSkill(skill: { name: string; definition?: string; category?: string }): Promise<Skill> {
  const collectionPath = "skills";
  try {
    const newDocRef = await addDoc(collection(db, collectionPath), {
      name: skill.name.trim(),
      definition: skill.definition?.trim() || "",
      category: skill.category?.trim() || "Geral",
      active: true,
      createdAt: serverTimestamp()
    });
    return {
      id: newDocRef.id,
      name: skill.name.trim(),
      definition: skill.definition?.trim() || "",
      category: skill.category?.trim() || "Geral",
      active: true
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
    throw error;
  }
}

/**
 * Salva ou atualiza um Plano de Aula (Lesson Plan) na coleção `lesson_plans`
 */
export async function saveLessonPlan(
  planData: Omit<LessonPlan, "id" | "createdAt" | "updatedAt">,
  planId?: string
): Promise<string> {
  const collectionPath = "lesson_plans";
  try {
    // Normalizar data
    let dateVal: any = planData.date;
    if (typeof planData.date === "string") {
      // Formato YYYY-MM-DD
      const [y, m, d] = planData.date.split("-").map(Number);
      if (y && m && d) {
        dateVal = Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
      }
    }

    const payload = {
      teacherId: planData.teacherId,
      teacherName: planData.teacherName || "",
      classId: planData.classId,
      className: planData.className || "",
      classType: planData.classType || "",
      date: dateVal,
      dateString: typeof planData.date === "string" ? planData.date : new Date(planData.date?.toDate?.() || planData.date).toISOString().split("T")[0],
      generalObjective: planData.generalObjective.trim(),
      skills: planData.skills || [],
      activities: (planData.activities || []).map(act => ({
        objective: (act.objective || "").trim(),
        description: (act.description || "").trim(),
        duration: Number(act.duration) || 0
      })),
      totalDuration: (planData.activities || []).reduce((acc, curr) => acc + (Number(curr.duration) || 0), 0),
      observations: (planData.observations || "").trim(),
      updatedAt: serverTimestamp()
    };

    if (planId) {
      const planRef = doc(db, collectionPath, planId);
      await updateDoc(planRef, payload);
      return planId;
    } else {
      const newRef = await addDoc(collection(db, collectionPath), {
        ...payload,
        createdAt: serverTimestamp()
      });
      return newRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, planId ? OperationType.UPDATE : OperationType.CREATE, collectionPath);
    throw error;
  }
}

/**
 * Busca os planos de aula de uma turma ou de um professor
 */
export async function fetchLessonPlans(filters?: {
  classId?: string;
  teacherId?: string;
  isGestor?: boolean;
}): Promise<LessonPlan[]> {
  const collectionPath = "lesson_plans";
  try {
    let q = query(collection(db, collectionPath));

    if (filters?.classId) {
      q = query(collection(db, collectionPath), where("classId", "==", filters.classId));
    } else if (filters?.teacherId && !filters.isGestor) {
      q = query(collection(db, collectionPath), where("teacherId", "==", filters.teacherId));
    }

    const snap = await getDocs(q);
    const plans: LessonPlan[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        teacherId: data.teacherId || "",
        teacherName: data.teacherName || "",
        classId: data.classId || "",
        className: data.className || "",
        classType: data.classType || "",
        date: data.date,
        generalObjective: data.generalObjective || "",
        skills: data.skills || [],
        activities: data.activities || [],
        totalDuration: data.totalDuration || (data.activities || []).reduce((acc: number, cur: any) => acc + (Number(cur.duration) || 0), 0),
        observations: data.observations || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });

    // Ordenar localmente por data decrescente
    return plans.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date || 0).getTime();
      const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching lesson plans from Firestore:", error);
    handleFirestoreError(error, OperationType.GET, collectionPath);
    return [];
  }
}

/**
 * Exclui um plano de aula pelo ID
 */
export async function deleteLessonPlan(planId: string): Promise<void> {
  const collectionPath = "lesson_plans";
  try {
    await deleteDoc(doc(db, collectionPath, planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${planId}`);
    throw error;
  }
}

/**
 * Filtra as turmas vinculadas ao professor logado
 */
export function getTeacherLinkedClasses(
  currentUser: any,
  users: User[],
  classes: Class[],
  isGestor: boolean
): Class[] {
  if (isGestor) {
    return classes.filter(c => c.isActive !== false);
  }

  const userId = currentUser?.uid || currentUser?.id;
  const userEmail = currentUser?.email?.toLowerCase()?.trim();
  const matchedUser = users.find(u => u.id === userId || (userEmail && u.email?.toLowerCase()?.trim() === userEmail));
  const validIds = new Set<string>();
  if (userId) validIds.add(userId);
  if (matchedUser?.id) validIds.add(matchedUser.id);
  if (matchedUser?.migratedFrom) validIds.add(matchedUser.migratedFrom);
  if (matchedUser?.migratedTo) validIds.add(matchedUser.migratedTo);

  return classes.filter(c => {
    if (!c.isActive) return false;
    const teacherIds = c.teacherIds || [];
    return teacherIds.some(id => validIds.has(id));
  });
}
