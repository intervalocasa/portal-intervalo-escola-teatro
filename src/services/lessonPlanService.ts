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

// Seed skills representing the exact 20 pedagogical criteria from Diário de Classe
export const DEFAULT_SKILLS: Array<{ 
  id: string; 
  name: string; 
  definition: string; 
  category: string;
  courseScope: "adult" | "professional" | "all";
}> = [
  // 10 Habilidades Básicas (Curso Livre Adultos / Adulto Amador e Prática Profissional)
  { id: "presence", name: "Presença cênica", definition: "Capacidade de sustentar atenção, disponibilidade e impacto em cena.", category: "Interpretação", courseScope: "all" },
  { id: "body", name: "Consciência corporal", definition: "Uso do corpo como instrumento expressivo, disponível e organizado em cena.", category: "Corpo & Movimento", courseScope: "all" },
  { id: "vocal", name: "Expressividade vocal", definition: "Projeção, articulação, intenção e uso expressivo da voz.", category: "Voz & Fala", courseScope: "all" },
  { id: "listening", name: "Escuta e prontidão cênica", definition: "Capacidade de reagir ao parceiro, ao jogo e aos estímulos da cena com atenção viva.", category: "Jogo & Escuta", courseScope: "all" },
  { id: "impro", name: "Improvisação e criatividade cênica", definition: "Capacidade de propor, imaginar e sustentar ações em situações abertas de criação.", category: "Criação & Improviso", courseScope: "all" },
  { id: "character", name: "Construção de personagem", definition: "Capacidade de compor identidade, intenção, comportamento e lógica de personagem.", category: "Interpretação", courseScope: "all" },
  { id: "partner", name: "Relação com o parceiro e trabalho em grupo", definition: "Capacidade de atuar em relação, respeitar o coletivo e construir cena em conjunto.", category: "Trabalho Coletivo", courseScope: "all" },
  { id: "text", name: "Apropriação de texto e memorização cênica", definition: "Capacidade de memorizar, compreender e sustentar texto com intenção e organicidade.", category: "Texto & Dramaturgia", courseScope: "all" },
  { id: "space", name: "Organização espacial e composição de cena", definition: "Uso do espaço, marcações, deslocamentos e leitura da cena como composição.", category: "Espaço & Composição", courseScope: "all" },
  { id: "autonomy", name: "Autonomia e compromisso com o processo", definition: "Responsabilidade do aluno com o trabalho, prontidão para aula/ensaio e capacidade de avançar no processo com iniciativa.", category: "Processo & Autonomia", courseScope: "all" },

  // 10 Habilidades Adicionais Específicas da Prática Profissional de Montagem
  { id: "discipline", name: "Disciplina de ensaio", definition: "Capacidade de manter foco, constância, organização e conduta adequada durante os ensaios.", category: "Montagem & Ensaio", courseScope: "professional" },
  { id: "punctuality", name: "Pontualidade e preparação para o trabalho", definition: "Capacidade de chegar no horário e apresentar-se preparado para o ensaio, com prontidão física, mental e material.", category: "Postura Profissional", courseScope: "professional" },
  { id: "continuity", name: "Continuidade processual entre ensaios", definition: "Capacidade de retomar, sustentar e desenvolver o trabalho de um encontro para o outro, sem romper o fluxo do processo.", category: "Montagem & Ensaio", courseScope: "professional" },
  { id: "direction", name: "Resposta à direção", definition: "Capacidade de escutar, compreender e incorporar orientações de direção de forma prática e consistente na cena.", category: "Direção & Escuta", courseScope: "professional" },
  { id: "precision", name: "Precisão de marcação cênica", definition: "Capacidade de memorizar e executar com segurança entradas, saídas, posições, deslocamentos e ações marcadas em cena.", category: "Espaço & Composição", courseScope: "professional" },
  { id: "repetition", name: "Sustentação de cena em repetição", definition: "Capacidade de repetir uma cena mantendo sua lógica, qualidade, intenção e considerência ao longo dos ensaios.", category: "Interpretação", courseScope: "professional" },
  { id: "dramaturgy", name: "Compreensão dramatúrgica da obra", definition: "Capacidade de compreender a estrutura da obra, as relações entre personagens, os conflitos e a função da cena no conjunto.", category: "Texto & Dramaturgia", courseScope: "professional" },
  { id: "materials", name: "Responsabilidade com figurino, objeto e material de cena", definition: "Capacidade de cuidar, organizar e utilizar com responsabilidade os elementos materiais necessários ao processo de montagem.", category: "Montagem & Produção", courseScope: "professional" },
  { id: "collective", name: "Capacidade de composição em cena coletiva", definition: "Capacidade de integrar-se ao conjunto, contribuindo para a unidade visual, espacial e expressiva das cenas coletivas.", category: "Trabalho Coletivo", courseScope: "professional" },
  { id: "professionalism", name: "Postura profissional diante da montagem", definition: "Capacidade de assumir o processo de montagem com responsabilidade, maturidade, compromisso e compreensão do trabalho coletivo.", category: "Postura Profissional", courseScope: "professional" }
];

/**
 * Verifica se a turma é do curso Prática Profissional de Montagem
 */
export function isProfessionalClass(classType?: string, className?: string): boolean {
  if (!classType && !className) return false;
  const str = `${classType || ""} ${className || ""}`.toLowerCase();
  return str.includes("profissional") || str.includes("montagem");
}

/**
 * Retorna exatamente as habilidades e critérios de avaliação do Diário
 * de acordo com o tipo de curso da turma:
 * - Se for Adulto Amador / Curso Livre Adulto: 10 critérios
 * - Se for Prática Profissional de Montagem: 20 critérios
 */
export function getSkillsForClass(
  classTypeOrObject?: string | Class | null,
  allSkills: Skill[] = []
): {
  skills: Skill[];
  isProfessional: boolean;
  totalOfficialCount: number;
  courseLabel: string;
  officialCriteriaIds: string[];
} {
  let typeStr = "";
  if (typeof classTypeOrObject === "string") {
    typeStr = classTypeOrObject;
  } else if (classTypeOrObject) {
    typeStr = `${classTypeOrObject.type || ""} ${classTypeOrObject.code || ""}`;
  }

  const isProf = isProfessionalClass(typeStr);
  const targetOfficialCriteria = isProf ? PROFESSIONAL_COURSE_CRITERIA : ADULT_COURSE_CRITERIA;
  const targetOfficialIds = new Set(targetOfficialCriteria.map(c => c.id));

  // Matriz de habilidades oficiais sincronizadas com o Diário
  const officialSkills: Skill[] = targetOfficialCriteria.map(c => {
    const customMatch = allSkills.find(s => s.id === c.id || s.name === c.label);
    const defaultMeta = DEFAULT_SKILLS.find(d => d.id === c.id);
    return {
      id: c.id,
      name: c.label,
      definition: customMatch?.definition || c.definition || defaultMeta?.definition || "",
      category: customMatch?.category || defaultMeta?.category || (isProf && !ADULT_COURSE_CRITERIA.some(a => a.id === c.id) ? "Montagem & Ensaio" : "Interpretação"),
      courseScope: isProf ? (ADULT_COURSE_CRITERIA.some(a => a.id === c.id) ? "all" : "professional") : "adult",
      active: true
    };
  });

  // Habilidades adicionais personalizadas cadastradas no banco
  const additionalCustomSkills = allSkills.filter(s => {
    if (targetOfficialIds.has(s.id)) return false;
    if (s.active === false) return false;
    if (s.courseScope === "professional" && !isProf) return false;
    return true;
  });

  return {
    skills: [...officialSkills, ...additionalCustomSkills],
    isProfessional: isProf,
    totalOfficialCount: targetOfficialCriteria.length,
    courseLabel: isProf ? "Prática Profissional de Montagem" : "Curso Livre Adulto (Adulto Amador)",
    officialCriteriaIds: targetOfficialCriteria.map(c => c.id)
  };
}

/**
 * Converte string de dias da semana de uma turma para array de números (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
 */
export function parseClassWeekdays(weekdayStr?: string): number[] {
  if (!weekdayStr) return [];
  const normalized = weekdayStr
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos

  const days: number[] = [];
  if (normalized.includes("dom") || normalized.includes("0")) days.push(0);
  if (normalized.includes("seg") || normalized.includes("2")) days.push(1);
  if (normalized.includes("ter") || normalized.includes("3")) days.push(2);
  if (normalized.includes("qua") || normalized.includes("4")) days.push(3);
  if (normalized.includes("qui") || normalized.includes("5")) days.push(4);
  if (normalized.includes("sex") || normalized.includes("6")) days.push(5);
  if (normalized.includes("sab") || normalized.includes("7")) days.push(6);
  return Array.from(new Set(days));
}

/**
 * Extrai a hora e minuto de início da aula a partir do campo time da turma (ex: "19:00", "19h", "19:30 - 21:30")
 */
export function parseClassStartTime(timeStr?: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 19, minute: 0 };
  
  // Trata formato "19:30" ou "19h30" ou "19h" ou "19:00 - 21:00"
  const match = timeStr.match(/(\d{1,2})[:hH](\d{2})?/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    return { hour: isNaN(hour) ? 19 : hour, minute: isNaN(minute) ? 0 : minute };
  }

  const singleNumMatch = timeStr.match(/(\d{1,2})/);
  if (singleNumMatch) {
    const hour = parseInt(singleNumMatch[1], 10);
    return { hour: isNaN(hour) ? 19 : hour, minute: 0 };
  }

  return { hour: 19, minute: 0 };
}

/**
 * Calcula o horário de início da aula e o prazo limite para envio (exatamente 5 minutos antes do início)
 */
export function getClassScheduleAndDeadline(dateStr: string, timeStr?: string, now: Date = new Date()) {
  if (!dateStr) {
    return {
      classStart: new Date(),
      deadline: new Date(),
      hour: 19,
      minute: 0,
      isExpired: false,
      minutesRemaining: 0,
      formattedStart: "19:00",
      formattedDeadline: "18:55",
      formattedClassDate: ""
    };
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const { hour, minute } = parseClassStartTime(timeStr);
  const classStart = new Date(y, m - 1, d, hour, minute, 0, 0);
  
  // Prazo limite: 5 minutos antes do início da aula
  const deadline = new Date(classStart.getTime() - 5 * 60 * 1000);
  
  const isExpired = now.getTime() > deadline.getTime();
  const minutesRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (60 * 1000)));

  const pad = (n: number) => String(n).padStart(2, "0");
  const formattedStart = `${pad(hour)}:${pad(minute)}`;
  const formattedDeadline = `${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`;
  
  const formattedClassDate = classStart.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  return {
    classStart,
    deadline,
    hour,
    minute,
    isExpired,
    minutesRemaining,
    formattedStart,
    formattedDeadline,
    formattedClassDate
  };
}

/**
 * Valida se uma data corresponde aos dias de aula da turma
 */
export function isDateValidForClassWeekday(dateStr: string, weekdayStr?: string): boolean {
  if (!dateStr || !weekdayStr) return true;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return true;
  const dt = new Date(y, m - 1, d);
  const allowedDays = parseClassWeekdays(weekdayStr);
  if (allowedDays.length === 0) return true;
  return allowedDays.includes(dt.getDay());
}

export interface ClassDateOption {
  value: string;
  label: string;
  weekdayName: string;
  formattedDate: string;
  isToday: boolean;
  isExpired: boolean;
  deadline: Date;
  classStart: Date;
  formattedDeadline: string;
  formattedStart: string;
}

/**
 * Gera lista de datas válidas de aula para a turma (próximas 16 semanas + aula de hoje/recente se aplicável)
 */
export function getAvailableClassDates(targetClass?: Class | null, now: Date = new Date()): ClassDateOption[] {
  if (!targetClass) return [];

  const targetDays = parseClassWeekdays(targetClass.weekday);
  const options: ClassDateOption[] = [];
  const seenDates = new Set<string>();

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Se a turma não tiver dias específicos cadastrados, permite gerar próximas datas normais
  const daysToCheck = targetDays.length > 0 ? targetDays : [1]; // padrão segunda-feira se vazio

  // Olhar de hoje até 120 dias no futuro (cerca de 17 semanas)
  for (let i = 0; i <= 120; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (daysToCheck.includes(d.getDay())) {
      const dateKey = formatDateKey(d);
      if (seenDates.has(dateKey)) continue;
      seenDates.add(dateKey);

      const schedule = getClassScheduleAndDeadline(dateKey, targetClass.time, now);
      const isToday = i === 0;
      const weekdayName = d.toLocaleDateString("pt-BR", { weekday: "long" });
      const capitalizedWeekday = weekdayName.charAt(0).toUpperCase() + weekdayName.slice(1);
      const formattedDate = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

      let labelPrefix = "";
      if (isToday) {
        labelPrefix = `Hoje (${formattedDate}) - ${capitalizedWeekday}`;
      } else if (i === 1) {
        labelPrefix = `Amanhã (${formattedDate}) - ${capitalizedWeekday}`;
      } else {
        labelPrefix = `${formattedDate} - ${capitalizedWeekday}`;
      }

      const timeSuffix = targetClass.time ? ` • ${targetClass.time}` : "";
      const statusSuffix = schedule.isExpired ? " ⚠️ (Prazo encerrado)" : "";

      options.push({
        value: dateKey,
        label: `${labelPrefix}${timeSuffix}${statusSuffix}`,
        weekdayName: capitalizedWeekday,
        formattedDate,
        isToday,
        isExpired: schedule.isExpired,
        deadline: schedule.deadline,
        classStart: schedule.classStart,
        formattedDeadline: schedule.formattedDeadline,
        formattedStart: schedule.formattedStart
      });
    }
  }

  return options;
}

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
