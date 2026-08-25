/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  classId: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  forces?: string[];
  timestamp: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target: "Todos" | "Alunos" | "Professores";
  targetSpecificUsers?: boolean;
  targetUserIds?: string[];
  likes?: string[];
  forces?: string[];
  lido?: boolean;
  createdBy: string;
  createdAt: any;
}

export type UserRole = "Aluno" | "Professor" | "Gestor" | "Diretor Pedagógico" | "Diretor Pedagógico e Professor" | "Auxiliar Administrativo";

export interface Badge {
  id: string;
  badgeId: string;
  name: string;
  icon: string;
  description: string;
  category?: string;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  name: string;
  icon: string;
  description: string;
  dateReceived: any;
  message: string;
  classId?: string;
}

export interface SchoolEvent {
  id: string;
  titulo: string;
  tipo: "Ensaio" | "Peça" | "Workshop" | "Aula Aberta";
  data: any;
  inicio: string;
  fim: string;
  local: string;
  descricao: string;
  obrigatorio: boolean;
  criadoPor: string;
  lastUpdate: any;
}

export interface ClassFeedback {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  date: any;
  rating: number;
  npsRating?: number;
  expressionScore?: number;
  qualityScore?: number;
  challengeScore?: number;
  comment: string;
  timestamp: any;
}

export interface PedagogicalMeetingRequest {
  id: string;
  studentId: string;
  studentName: string;
  teacherId?: string;
  classId: string;
  className: string;
  status: "pendente" | "em_atendimento" | "concluido";
  createdAt: any;
  updatedAt: any;
}

export interface User {
  id: string;
  name: string;
  socialName?: string;
  pronouns?: string;
  artisticName?: string;
  birthDate?: string;
  email: string;
  role: UserRole;
  cpf: string;
  phone?: string;
  address?: string;
  bank?: string;
  bankAgency?: string;
  bankAccount?: string;
  pixKey?: string;
  cnpj?: string;
  photo?: string;
  createdAt: any;
  updatedAt: any;
  migratedFrom?: string;
  migratedTo?: string;
  inactive?: boolean;
}

export interface Class {
  id: string;
  type: string;
  code: string;
  weekday: string;
  time: string;
  startDate: string;
  isActive: boolean;
  inactivationReason?: string;
  teacherIds: string[];
  studentIds: string[];
  enrollmentDates?: Record<string, string>;
  studentPaymentTypes?: Record<string, "Pagante" | "Isento">;
  studentEnrollmentStatuses?: Record<string, "Ativo" | "Trancado" | "Inativo">;
  year: string;
}

export interface Evaluation {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  classId: string;
  classType?: string;
  month: number;
  year: number;
  notes: Record<string, number>;
  openAnswers: Record<string, string>;
  pedagogicalAnalysis?: {
    status_turma: {
      clima_emocional: string;
      nivel_engajamento: "alto" | "medio" | "baixo";
    };
    pilares_individuais: {
      acolhimento: "baixo" | "medio" | "alto";
      presenca: "baixo" | "medio" | "alto";
      desafio: "baixo" | "medio" | "alto";
      clareza: "baixo" | "medio" | "alto";
      coletividade: "baixo" | "medio" | "alto";
    };
    analise_qualitativa: string;
    alerta_coordenacao: boolean;
  } | null;
  createdAt: any;
  updatedAt?: any;
}

export interface Diary {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  classType: string;
  teacherId: string;
  teacherName: string;
  month: number;
  year: number;
  presences: number;
  absences: number;
  frequencyObs?: string;
  weeklyAttendance?: Record<string, any>;
  grades: Record<string, number>;
  criteriaObs?: Record<string, string>;
  generalPedagogicalObs?: string;
  averageGrade: number;
  status: "rascunho" | "concluido";
  createdAt: any;
  updatedAt: any;
}

export interface EvolutionRecord {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  notes: string;
  createdAt: any;
}

export interface ClassData {
  id?: string;
  code: string;
  type: string;
  teacherIds: string[];
  studentIds: string[];
  isActive: boolean;
  inactivationReason: string;
  year: string;
  weekday: string;
  time: string;
  startDate: string;
}

export interface CourseSyllabusFile {
  name: string;
  url: string; // base64 or download URL
  type?: string;
  size?: number;
  uploadedAt?: string;
}

export interface Course {
  id: string;
  name: string; // "Curso Livre Adultos", "Curso Livre 60+", "Prática Profissional de Montagem", etc.
  description?: string;
  ageGroup?: string; // "Acima de 60 anos", "18 a 59 anos", "Livre", etc.
  monthlyFee?: number; // Valor da mensalidade
  durationType?: "continua" | "meses"; // Contínua ou quantidade de meses
  durationMonths?: number; // Se durationType === "meses"
  syllabusFile?: CourseSyllabusFile | null; // Ementa pedagógica em PDF/doc
  linkedClassIds?: string[]; // IDs das turmas vinculadas a este curso
  createdAt?: any;
  updatedAt?: any;
}

export interface RescheduleRecord {
  previousDate: string;
  newDate: string;
  previousTime?: string;
  newTime?: string;
  reason: string;
  updatedAt: any;
}

export type ExperimentalTriageStatus = 
  | "MATRICULADO" 
  | "AGUARDANDO_RESPOSTA" 
  | "NAO_MATRICULOU" 
  | "NAO_COMPARECEU";

export interface ExperimentalClassBooking {
  id: string;
  studentName: string;
  course: string;
  classGroup: string;
  classTime: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  status: "PAGAMENTO_PENDENTE" | "AGENDAMENTO_CONFIRMADO";
  paymentReceiptUrl: string | null;
  rescheduleCount: number;
  rescheduleHistory: RescheduleRecord[];
  createdAt: any;
  updatedAt: any;
  studentEmail?: string;
  studentPhone?: string;
  notes?: string;
  manualConfirmationReason?: string | null;
  createdByUid?: string;
  createdByName?: string;
  createdByRole?: string;
  // Triage pós-conclusão de agendamento
  triageStatus?: ExperimentalTriageStatus | null;
  attended?: boolean | null;
  triageNotes?: string | null;
  triageReason?: string | null;
  triagedAt?: any;
  triagedByUid?: string;
  triagedByName?: string;
  triagedByRole?: string;
}

export interface LessonPlanActivity {
  objective: string;
  description: string;
  duration: number; // in minutes
}

export interface Skill {
  id: string;
  name: string;
  definition?: string;
  category?: string;
  courseScope?: "adult" | "professional" | "all";
  active?: boolean;
  createdAt?: any;
}

export interface LessonPlan {
  id?: string;
  teacherId: string;
  teacherName?: string;
  classId: string;
  className?: string;
  classType?: string;
  date: any; // Timestamp or ISO/YYYY-MM-DD
  generalObjective: string;
  skills: string[]; // array of skill IDs or skill names
  activities: LessonPlanActivity[];
  totalDuration?: number; // calculated sum of activities duration
  observations?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type ClassAttendanceStatus = "presente" | "falta" | "justificada";

export interface ClassDailyDiary {
  id?: string;
  classId: string;
  className?: string;
  classCode?: string;
  classType?: string;
  date: string; // YYYY-MM-DD
  teacherId: string;
  teacherName?: string;
  authorRole?: string;
  attendances: Record<string, ClassAttendanceStatus>; // studentId -> status
  studentObservations?: Record<string, string>; // studentId -> individual note
  classComment: string; // Relato da aula / observações confidenciais do professor (NÃO visível para alunos)
  isInternalPedagogicalOnly?: boolean; // Sempre true para proteção adicional
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  justifiedCount: number;
  createdAt?: any;
  updatedAt?: any;
}

export type StageProductionRole = "Professor" | "Diretor" | "Professor/Diretor" | "Outro";
export type StageProductionGenre = "Drama" | "Comédia" | "Musical" | "Dança" | "Mostra de Artes Visuais" | "Outro";
export type PriorityLevel = "Desejável" | "Indispensável";

export interface PrioritizedField {
  content: string;
  priority: PriorityLevel;
  indispensableReason?: string;
}

export interface StageProductionProposal {
  id?: string;
  // Seção 1: Dados do Proponente
  proponentName: string;
  proponentRole: StageProductionRole;
  proponentEmail: string;
  proponentPhone: string;
  proponentUserId?: string;

  // Seção 2: Identificação da Obra
  title: string;
  genre: StageProductionGenre;
  synopsis: PrioritizedField;

  // Seção 3: Proposta Pedagógica e Elenco
  pedagogicalProposal: PrioritizedField;
  castProfile: PrioritizedField;

  // Seção 4: Necessidades de Produção
  scenographyProps: PrioritizedField;
  techNeeds: PrioritizedField;
  otherNeeds: PrioritizedField;

  // Seção 5: Termo de Aceite
  termsAccepted: boolean;
  termsAcceptedAt?: any;

  // Metadados
  status?: "pendente" | "em_analise" | "aprovada" | "ajustes_solicitados" | "rejeitada";
  feedback?: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  reviewedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}


