/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
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

export type UserRole = "Aluno" | "Professor" | "Gestor" | "Diretor Pedagógico" | "Diretor Pedagógico e Professor";

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
