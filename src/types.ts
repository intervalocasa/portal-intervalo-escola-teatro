/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "Aluno" | "Professor" | "Gestor";

export interface User {
  id: string;
  name: string;
  artisticName?: string;
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
  teacherId: string | null;
  studentIds: string[];
  enrollmentDates?: Record<string, string>;
  year: string;
}

export interface Evaluation {
  id: string;
  studentId: string;
  classId: string;
  month: number;
  year: number;
  notes: Record<string, number>;
  openAnswers: Record<string, string>;
  createdAt: any;
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
  teacherId: string | null;
  studentIds: string[];
  isActive: boolean;
  inactivationReason: string;
  year: string;
  weekday: string;
  time: string;
  startDate: string;
}
