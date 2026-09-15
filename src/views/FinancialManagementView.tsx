/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wallet, 
  Users, 
  CreditCard, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Building2, 
  Clock, 
  AlertCircle,
  Check,
  RefreshCw,
  UserCheck,
  UserX,
  Award,
  Edit3,
  PlusCircle,
  Trash2
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { User, Class, Course } from "../types";
import { BackButton, Avatar, Logo } from "../components/CommonComponents";
import { collection, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

interface FinancialManagementViewProps {
  users: User[];
  classes: Class[];
  courses?: Course[];
  currentUser: any;
  setView: (view: any) => void;
}

const DEFAULT_COURSES: Course[] = [
  { id: "curso_livre_adultos", name: "Curso Livre Adultos", monthlyFee: 250 },
  { id: "curso_livre_60", name: "Curso Livre 60+", monthlyFee: 250 },
  { id: "pratica_profissional_montagem", name: "Prática Profissional de Montagem", monthlyFee: 320 },
];

export function isStudentUserInactive(student: User | any): boolean {
  if (!student) return true;
  if (student.inactive === true || student.isInactive === true || student.active === false || student.desmatriculado === true) {
    return true;
  }
  const status = String(student.status || "").trim().toLowerCase();
  if (status === "inativo" || status === "desmatriculado" || status === "trancado" || status === "cancelado") {
    return true;
  }
  const enrollmentStatus = String(student.enrollmentStatus || "").trim().toLowerCase();
  if (enrollmentStatus === "inativo" || enrollmentStatus === "desmatriculado" || enrollmentStatus === "trancado" || enrollmentStatus === "cancelado") {
    return true;
  }
  if (student.migratedTo) {
    return true; // legacy migrated marker document
  }
  return false;
}

export function getActiveClassesForStudent(student: User | any, classes: Class[]): Class[] {
  if (!student || isStudentUserInactive(student)) return [];
  
  const studentId = student.id;
  const migratedFrom = student.migratedFrom;

  return classes.filter(c => {
    if (c.isActive === false || !c.studentIds) return false;
    const isEnrolled = c.studentIds.includes(studentId) || Boolean(migratedFrom && c.studentIds.includes(migratedFrom));
    if (!isEnrolled) return false;
    
    const status = c.studentEnrollmentStatuses?.[studentId] || (migratedFrom ? c.studentEnrollmentStatuses?.[migratedFrom] : undefined);
    if (status) {
      const sLower = String(status).trim().toLowerCase();
      if (sLower === "inativo" || sLower === "trancado" || sLower === "desmatriculado" || sLower === "cancelado" || sLower === "removido") {
        return false;
      }
    }
    return true;
  });
}

export function calculateStudentMonthlyFee(
  studentId: string,
  migratedFrom: string | undefined,
  classes: Class[],
  courses?: Course[],
  studentUser?: User
): { totalAmount: number; isAllExempt: boolean; activeClassesCount: number; isCustomFee: boolean } {
  if (studentUser && isStudentUserInactive(studentUser)) {
    return { totalAmount: 0, isAllExempt: false, activeClassesCount: 0, isCustomFee: false };
  }

  const activeStudentClasses = getActiveClassesForStudent(
    studentUser || ({ id: studentId, migratedFrom, role: "Aluno" } as User),
    classes
  );

  if (activeStudentClasses.length === 0) {
    return { totalAmount: 0, isAllExempt: false, activeClassesCount: 0, isCustomFee: false };
  }

  let isAllExempt = true;
  activeStudentClasses.forEach(c => {
    const pType = c.studentPaymentTypes?.[studentId] || (migratedFrom ? c.studentPaymentTypes?.[migratedFrom] : undefined) || "Pagante";
    if (pType !== "Isento") {
      isAllExempt = false;
    }
  });

  if (isAllExempt) {
    return { totalAmount: 0, isAllExempt: true, activeClassesCount: activeStudentClasses.length, isCustomFee: false };
  }

  // Se o aluno possui um valor de mensalidade fixado/personalizado no perfil
  if (
    studentUser?.customMonthlyFee !== undefined &&
    studentUser.customMonthlyFee !== null &&
    !isNaN(Number(studentUser.customMonthlyFee)) &&
    Number(studentUser.customMonthlyFee) >= 0
  ) {
    return {
      totalAmount: Number(studentUser.customMonthlyFee),
      isAllExempt: false,
      activeClassesCount: activeStudentClasses.length,
      isCustomFee: true
    };
  }

  let totalAmount = 0;
  const courseList = (courses && courses.length > 0) ? courses : DEFAULT_COURSES;

  activeStudentClasses.forEach(c => {
    const pType = c.studentPaymentTypes?.[studentId] || (migratedFrom ? c.studentPaymentTypes?.[migratedFrom] : undefined) || "Pagante";
    if (pType !== "Isento") {
      const matchedCourse = courseList.find(crs =>
        crs.name.trim().toLowerCase() === c.type.trim().toLowerCase() ||
        crs.id === c.type
      );

      let fee = 250;
      if (matchedCourse && matchedCourse.monthlyFee !== undefined && matchedCourse.monthlyFee !== null && !isNaN(Number(matchedCourse.monthlyFee))) {
        fee = Number(matchedCourse.monthlyFee);
      } else if (c.type.toLowerCase().includes("montagem") || c.type.toLowerCase().includes("profissional")) {
        fee = 320;
      } else if (c.type.toLowerCase().includes("60+") || c.type.toLowerCase().includes("adulto")) {
        fee = 250;
      }
      totalAmount += fee;
    }
  });

  return { totalAmount, isAllExempt, activeClassesCount: activeStudentClasses.length, isCustomFee: false };
}

export interface EnrollmentRecord {
  id: string; // unique key: studentId_classId
  studentId: string;
  studentName: string;
  studentSocialName?: string;
  studentCpf: string;
  studentEmail: string;
  studentPhone?: string;
  studentPhoto?: string;
  isStudentInactive: boolean;
  
  classId: string;
  classCode: string;
  classType: string;
  classWeekday: string;
  classTime: string;
  isClassActive: boolean;
  
  enrollmentDate: string; // YYYY-MM-DD
  paymentType: "Pagante" | "Isento";
  isEnrollmentActive: boolean;
  statusLabel: "Ativa" | "Desmatriculado";
}

export interface PaymentRecord {
  id: string; // studentId_year_month
  studentId: string;
  studentName: string;
  studentSocialName?: string;
  studentCpf: string;
  className: string;
  month: number;
  year: number;
  amount: number; // e.g. 250
  dueDate: string; // YYYY-MM-DD
  status: "Pago" | "Pendente" | "Atrasado" | "Isento";
  paymentMethod?: "PIX" | "Cartão" | "Boleto" | "Dinheiro" | "Transferência";
  paidAt?: string;
  notes?: string;
  isExempt?: boolean;
  hasStudentCustomFee?: boolean;
  studentCustomMonthlyFee?: number;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  dueDate: string; // YYYY-MM-DD
  status: "Pago" | "Pendente" | "Atrasado";
  paymentMethod?: "PIX" | "Cartão" | "Boleto" | "Dinheiro" | "Transferência";
  paidAt?: string;
  notes?: string;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const FinancialManagementView = ({
  users,
  classes,
  courses,
  currentUser,
  setView
}: FinancialManagementViewProps) => {
  const [activeTab, setActiveTab] = useState<"inicio" | "matriculas" | "pagamentos" | "despesas">("inicio");
  
  // Matrículas States
  const [statusFilter, setStatusFilter] = useState<"Todas" | "Ativas" | "Desmatriculados">("Todas");
  const [paymentConditionFilter, setPaymentConditionFilter] = useState<"Todos" | "Pagante" | "Isento">("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("Todas");

  // Pagamentos States
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"Todos" | "Pago" | "Pendente" | "Atrasado" | "Isento">("Todos");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [dbPayments, setDbPayments] = useState<Record<string, any>>({});
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [editingAmountId, setEditingAmountId] = useState<string | null>(null);
  const [tempAmountValue, setTempAmountValue] = useState<string>("");
  const [fixAmountForFuture, setFixAmountForFuture] = useState<boolean>(true);

  // Despesas States
  const [dbExpenses, setDbExpenses] = useState<Record<string, ExpenseRecord>>({});
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<"Todos" | "Pago" | "Pendente" | "Atrasado">("Todos");
  const [expenseMonth, setExpenseMonth] = useState<number>(new Date().getMonth());
  const [expenseYear, setExpenseYear] = useState<number>(new Date().getFullYear());
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [expenseFormData, setExpenseFormData] = useState<Partial<ExpenseRecord>>({});

  // Subscribe to payments in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pagamentos"), (snapshot) => {
      const dataMap: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        dataMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      setDbPayments(dataMap);
    }, (error) => {
      console.warn("Firestore pagamentos read error or offline:", error);
    });
    return () => unsub();
  }, []);

  // Subscribe to expenses in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "despesas"), (snapshot) => {
      const dataMap: Record<string, ExpenseRecord> = {};
      snapshot.docs.forEach(docSnap => {
        dataMap[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as ExpenseRecord;
      });
      setDbExpenses(dataMap);
    }, (error) => {
      console.warn("Firestore despesas read error or offline:", error);
    });
    return () => unsub();
  }, []);

  // Compute Enrollment Records
  const allEnrollmentRecords = useMemo<EnrollmentRecord[]>(() => {
    const records: EnrollmentRecord[] = [];

    // Map student IDs
    const studentUsers = users.filter(u => u.role === "Aluno");

    classes.forEach(c => {
      if (!c.studentIds) return;

      c.studentIds.forEach(sId => {
        const student = studentUsers.find(u => u.id === sId) || users.find(u => u.id === sId);
        if (!student) return;

        const isStudentInactive = isStudentUserInactive(student);
        const isClassActive = c.isActive !== false;
        const studentClassStatus = c.studentEnrollmentStatuses?.[sId] ||
                                    (student.id && c.studentEnrollmentStatuses?.[student.id]) ||
                                    (student.migratedFrom && c.studentEnrollmentStatuses?.[student.migratedFrom]);

        const isStudentClassInactive = Boolean(
          studentClassStatus && 
          ["inativo", "trancado", "desmatriculado", "cancelado", "removido"].includes(String(studentClassStatus).trim().toLowerCase())
        );
        const isEnrollmentActive = !isStudentInactive && isClassActive && !isStudentClassInactive;

        const dateStr = c.enrollmentDates?.[sId] || 
                        (student.createdAt?.toDate ? student.createdAt.toDate().toISOString().split('T')[0] : "") || 
                        "Data N/D";

        const paymentType = c.studentPaymentTypes?.[sId] || "Pagante";

        records.push({
          id: `${sId}_${c.id}`,
          studentId: sId,
          studentName: student.name,
          studentSocialName: student.socialName,
          studentCpf: student.cpf || "Não informado",
          studentEmail: student.email || "",
          studentPhone: student.phone || "Não informado",
          studentPhoto: student.photo,
          isStudentInactive,
          classId: c.id,
          classCode: c.code || "S/C",
          classType: c.type || "Teatro",
          classWeekday: c.weekday || "",
          classTime: c.time || "",
          isClassActive,
          enrollmentDate: dateStr,
          paymentType,
          isEnrollmentActive,
          statusLabel: isEnrollmentActive ? "Ativa" : "Desmatriculado"
        });
      });
    });

    // Also include desmatriculado students who may not have a current class assignment
    const enrolledStudentIds = new Set(records.map(r => r.studentId));
    studentUsers.forEach(student => {
      if (isStudentUserInactive(student) && !enrolledStudentIds.has(student.id)) {
        records.push({
          id: `desmat_${student.id}`,
          studentId: student.id,
          studentName: student.name,
          studentSocialName: student.socialName,
          studentCpf: student.cpf || "Não informado",
          studentEmail: student.email || "",
          studentPhone: student.phone || "Não informado",
          studentPhoto: student.photo,
          isStudentInactive: true,
          classId: "sem_turma",
          classCode: "Sem Turma",
          classType: "Desmatriculado",
          classWeekday: "",
          classTime: "",
          isClassActive: false,
          enrollmentDate: (student.createdAt?.toDate ? student.createdAt.toDate().toISOString().split('T')[0] : "") || "Data N/D",
          paymentType: "Pagante",
          isEnrollmentActive: false,
          statusLabel: "Desmatriculado"
        });
      }
    });

    return records.sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
  }, [users, classes]);

  // Filtered Enrollments
  const filteredEnrollments = useMemo(() => {
    return allEnrollmentRecords.filter(rec => {
      // Status filter
      if (statusFilter === "Ativas" && !rec.isEnrollmentActive) return false;
      if (statusFilter === "Desmatriculados" && rec.isEnrollmentActive) return false;

      // Condition filter (Pagante / Isento)
      if (paymentConditionFilter === "Pagante" && rec.paymentType !== "Pagante") return false;
      if (paymentConditionFilter === "Isento" && rec.paymentType !== "Isento") return false;

      // Class filter
      if (selectedClassFilter !== "Todas" && rec.classId !== selectedClassFilter) return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = rec.studentName.toLowerCase().includes(term);
        const matchSocial = rec.studentSocialName?.toLowerCase().includes(term);
        const matchCpf = rec.studentCpf.toLowerCase().includes(term);
        const matchClass = rec.classType.toLowerCase().includes(term) || rec.classCode.toLowerCase().includes(term);
        if (!matchName && !matchSocial && !matchCpf && !matchClass) return false;
      }

      return true;
    });
  }, [allEnrollmentRecords, statusFilter, paymentConditionFilter, selectedClassFilter, searchTerm]);

  // Metrics for Matrículas
  const totalMatriculas = allEnrollmentRecords.length;
  const matriculasAtivas = allEnrollmentRecords.filter(r => r.isEnrollmentActive).length;
  const matriculasPagantes = allEnrollmentRecords.filter(r => r.paymentType === "Pagante" && r.isEnrollmentActive).length;
  const matriculasIsentas = allEnrollmentRecords.filter(r => r.paymentType === "Isento" && r.isEnrollmentActive).length;
  const matriculasDesmatriculadas = allEnrollmentRecords.filter(r => !r.isEnrollmentActive).length;
  const taxaAtividade = totalMatriculas > 0 ? Math.round((matriculasAtivas / totalMatriculas) * 100) : 0;

  // Payments computation
  const paymentRecords = useMemo<PaymentRecord[]>(() => {
    const studentUsers = users.filter(u => {
      if (u.role !== "Aluno") return false;
      if (isStudentUserInactive(u)) return false;
      return true;
    });

    const records: PaymentRecord[] = [];

    studentUsers.forEach(student => {
      const activeStudentClasses = getActiveClassesForStudent(student, classes);

      // Se o aluno não está matriculado em nenhuma turma ativa, NÃO exibir na lista de pagamentos
      if (activeStudentClasses.length === 0) {
        return;
      }

      const docId = `${student.id}_${selectedYear}_${selectedMonth + 1}`;
      const saved = dbPayments[docId] || (student.migratedFrom ? dbPayments[`${student.migratedFrom}_${selectedYear}_${selectedMonth + 1}`] : undefined);

      const { totalAmount: calculatedAmount, isAllExempt, isCustomFee } = calculateStudentMonthlyFee(
        student.id,
        student.migratedFrom,
        classes,
        courses,
        student
      );

      const hasStudentCustomFee = isCustomFee || (student.customMonthlyFee !== undefined && student.customMonthlyFee !== null && !isNaN(Number(student.customMonthlyFee)));

      const classNameStr = activeStudentClasses.map(c => `${c.type} (${c.code})`).join(", ");

      const defaultDueDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-10`;

      let finalAmount = calculatedAmount;
      if (isAllExempt) {
        finalAmount = 0;
      } else if (saved && saved.amount !== undefined && saved.amount !== null && !hasStudentCustomFee) {
        finalAmount = Number(saved.amount);
      }

      if (saved) {
        records.push({
          id: docId,
          studentId: student.id,
          studentName: student.name,
          studentSocialName: student.socialName,
          studentCpf: student.cpf || "Não informado",
          className: classNameStr,
          month: selectedMonth,
          year: selectedYear,
          amount: finalAmount,
          dueDate: saved.dueDate || defaultDueDate,
          status: saved.status || (isAllExempt ? "Isento" : "Pendente"),
          paymentMethod: saved.paymentMethod,
          paidAt: saved.paidAt,
          notes: saved.notes,
          isExempt: isAllExempt,
          hasStudentCustomFee,
          studentCustomMonthlyFee: hasStudentCustomFee ? Number(student.customMonthlyFee) : undefined
        });
      } else {
        records.push({
          id: docId,
          studentId: student.id,
          studentName: student.name,
          studentSocialName: student.socialName,
          studentCpf: student.cpf || "Não informado",
          className: classNameStr,
          month: selectedMonth,
          year: selectedYear,
          amount: finalAmount,
          dueDate: defaultDueDate,
          status: isAllExempt ? "Isento" : "Pendente",
          isExempt: isAllExempt,
          hasStudentCustomFee,
          studentCustomMonthlyFee: hasStudentCustomFee ? Number(student.customMonthlyFee) : undefined
        });
      }
    });

    return records.sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
  }, [users, classes, courses, dbPayments, selectedMonth, selectedYear]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return paymentRecords.filter(p => {
      if (paymentStatusFilter !== "Todos" && p.status !== paymentStatusFilter) return false;

      if (paymentSearch.trim()) {
        const term = paymentSearch.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(term);
        const matchSocial = p.studentSocialName ? p.studentSocialName.toLowerCase().includes(term) : false;
        const matchCpf = p.studentCpf.toLowerCase().includes(term);
        const matchClass = p.className.toLowerCase().includes(term);
        if (!matchName && !matchSocial && !matchCpf && !matchClass) return false;
      }

      return true;
    });
  }, [paymentRecords, paymentStatusFilter, paymentSearch]);

  // Payment Metrics
  const totalPrevisto = paymentRecords.reduce((acc, p) => acc + p.amount, 0);
  const totalRecebido = paymentRecords.filter(p => p.status === "Pago").reduce((acc, p) => acc + p.amount, 0);
  const totalPendente = paymentRecords.filter(p => p.status !== "Pago").reduce((acc, p) => acc + p.amount, 0);
  const adimplencia = totalPrevisto > 0 ? Math.round((totalRecebido / totalPrevisto) * 100) : 0;

  // Toggle Payment Status
  const handleTogglePaymentStatus = async (record: PaymentRecord, newStatus: "Pago" | "Pendente" | "Atrasado") => {
    try {
      setIsUpdatingPayment(record.id);
      const payRef = doc(db, "pagamentos", record.id);
      await setDoc(payRef, {
        studentId: record.studentId,
        studentName: record.studentName,
        month: record.month,
        year: record.year,
        amount: record.amount,
        dueDate: record.dueDate,
        status: newStatus,
        paymentMethod: newStatus === "Pago" ? (record.paymentMethod || "PIX") : null,
        paidAt: newStatus === "Pago" ? new Date().toISOString() : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Erro ao atualizar pagamento:", err);
      alert("Erro ao salvar status de pagamento.");
    } finally {
      setIsUpdatingPayment(null);
    }
  };

  // Recalculate & Reset Payment Values for selected month/year
  const handleResetPaymentValues = async () => {
    if (!window.confirm(`Deseja recalcular e sincronizar todos os valores de mensalidades de ${MONTHS_PT[selectedMonth]} de ${selectedYear} com base nos cursos vinculados às turmas e mensalidades fixadas dos alunos?`)) {
      return;
    }
    setIsResetting(true);
    try {
      const studentUsers = users.filter(u => {
        if (u.role !== "Aluno") return false;
        if (isStudentUserInactive(u)) return false;
        const activeStudentClasses = getActiveClassesForStudent(u, classes);
        return activeStudentClasses.length > 0;
      });
      const promises = studentUsers.map(async (student) => {
        const docId = `${student.id}_${selectedYear}_${selectedMonth + 1}`;
        const { totalAmount, isAllExempt } = calculateStudentMonthlyFee(
          student.id,
          student.migratedFrom,
          classes,
          courses,
          student
        );

        const payRef = doc(db, "pagamentos", docId);
        const currentSaved = dbPayments[docId] || (student.migratedFrom ? dbPayments[`${student.migratedFrom}_${selectedYear}_${selectedMonth + 1}`] : {}) || {};
        const newStatus = isAllExempt ? "Isento" : (currentSaved.status === "Pago" ? "Pago" : "Pendente");

        await setDoc(payRef, {
          studentId: student.id,
          studentName: student.name,
          month: selectedMonth,
          year: selectedYear,
          amount: totalAmount,
          status: newStatus,
          dueDate: currentSaved.dueDate || `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-10`,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });

      await Promise.all(promises);
      alert(`Valores de mensalidades para ${MONTHS_PT[selectedMonth]} de ${selectedYear} recalculados e sincronizados com sucesso!`);
    } catch (err) {
      console.error("Erro ao resetar pagamentos:", err);
      alert("Ocorreu um erro ao recalcular os valores das mensalidades.");
    } finally {
      setIsResetting(false);
    }
  };

  // Save manual custom amount edit for a payment record
  const handleSaveCustomAmount = async (record: PaymentRecord, newAmount: number, fixForFuture: boolean) => {
    try {
      setIsUpdatingPayment(record.id);
      const validAmount = isNaN(newAmount) || newAmount < 0 ? 0 : newAmount;

      // 1. Atualiza no registro de pagamento do mês corrente no Firestore
      const payRef = doc(db, "pagamentos", record.id);
      await setDoc(payRef, {
        studentId: record.studentId,
        studentName: record.studentName,
        month: record.month,
        year: record.year,
        amount: validAmount,
        dueDate: record.dueDate,
        status: record.status,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // 2. Se fixForFuture estiver marcado, fixa como nova mensalidade no perfil do aluno
      if (fixForFuture) {
        const userRef = doc(db, "users", record.studentId);
        await updateDoc(userRef, {
          customMonthlyFee: validAmount,
          updatedAt: serverTimestamp()
        });
      }

      setEditingAmountId(null);
    } catch (err) {
      console.error("Erro ao salvar valor customizado:", err);
      alert("Erro ao salvar novo valor de mensalidade.");
    } finally {
      setIsUpdatingPayment(null);
    }
  };

  // Computed Expenses for current filter
  const filteredExpenses = useMemo(() => {
    let list = (Object.values(dbExpenses) as ExpenseRecord[]).filter(exp => 
      exp.month === expenseMonth && exp.year === expenseYear
    );

    if (expenseStatusFilter !== "Todos") {
      list = list.filter(exp => exp.status === expenseStatusFilter);
    }

    if (expenseSearch.trim()) {
      const q = expenseSearch.toLowerCase();
      list = list.filter(exp => 
        exp.description.toLowerCase().includes(q) || 
        exp.category.toLowerCase().includes(q)
      );
    }

    // Sort by due date asc
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [dbExpenses, expenseMonth, expenseYear, expenseStatusFilter, expenseSearch]);

  const totalDespesas = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredExpenses]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expId = editingExpense ? editingExpense.id : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const expRef = doc(db, "despesas", expId);
      
      const payload: any = {
        id: expId,
        description: expenseFormData.description || "Despesa",
        category: expenseFormData.category || "Outros",
        amount: Number(expenseFormData.amount) || 0,
        month: expenseMonth,
        year: expenseYear,
        dueDate: expenseFormData.dueDate || new Date().toISOString().split('T')[0],
        status: expenseFormData.status || "Pendente",
        paymentMethod: expenseFormData.paymentMethod || null,
        notes: expenseFormData.notes || null,
        paidAt: expenseFormData.status === "Pago" ? (expenseFormData.paidAt || new Date().toISOString().split('T')[0]) : null
      };

      // Firestore rejects undefined values unless explicitly configured to ignore them
      // We remove them or replace them with null
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([_, v]) => v !== undefined && v !== null)
      );

      await setDoc(expRef, {
        ...cleanPayload,
        updatedAt: serverTimestamp()
      });
      
      setShowExpenseModal(false);
      setEditingExpense(null);
      setExpenseFormData({});
    } catch (err: any) {
      console.error("Erro ao salvar despesa:", err);
      alert("Erro ao salvar despesa: " + (err.message || err.toString()));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir esta despesa?")) return;
    try {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "despesas", id));
    } catch (err: any) {
      console.error("Erro ao excluir despesa:", err);
      alert("Erro ao excluir despesa: " + (err.message || err.toString()));
    }
  };

  const handleEditExpense = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setExpenseFormData(expense);
    setShowExpenseModal(true);
  };

  // Restore standard course fee calculation for a student
  const handleRestoreCourseStandardFee = async (record: PaymentRecord) => {
    const studentDisplayName = record.studentSocialName && record.studentSocialName.trim().length > 0
      ? `${record.studentName} (Nome Social: ${record.studentSocialName})`
      : record.studentName;
    if (!window.confirm(`Deseja remover o valor fixado de ${studentDisplayName} e restaurar o cálculo padrão do curso?`)) {
      return;
    }
    try {
      setIsUpdatingPayment(record.id);
      const userRef = doc(db, "users", record.studentId);
      await updateDoc(userRef, {
        customMonthlyFee: null,
        updatedAt: serverTimestamp()
      });

      const studentObj = users.find(u => u.id === record.studentId);
      const { totalAmount } = calculateStudentMonthlyFee(
        record.studentId,
        studentObj?.migratedFrom,
        classes,
        courses,
        studentObj ? { ...studentObj, customMonthlyFee: undefined } : undefined
      );

      const payRef = doc(db, "pagamentos", record.id);
      await setDoc(payRef, {
        amount: totalAmount,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setEditingAmountId(null);
    } catch (err) {
      console.error("Erro ao restaurar valor padrão:", err);
      alert("Erro ao restaurar valor padrão do curso.");
    } finally {
      setIsUpdatingPayment(null);
    }
  };

  // Generate PDF function for Enrollments
  const handleGenerateEnrollmentPDF = () => {
    try {
      const docPDF = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = docPDF.internal.pageSize.getWidth();
      const pageHeight = docPDF.internal.pageSize.getHeight();

      // Brand Color Variables
      const primaryTeal = [1, 106, 134]; // #016a86
      const darkSlate = [15, 23, 42]; // #0f172a
      const lightSlate = [248, 250, 252]; // #f8fafc

      // Header Banner
      docPDF.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.rect(0, 0, pageWidth, 32, "F");

      // Header Title
      docPDF.setTextColor(255, 255, 255);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(16);
      docPDF.text("INTERVALO ESCOLA DE TEATRO", 14, 15);

      docPDF.setFont("helvetica", "normal");
      docPDF.setFontSize(9);
      docPDF.text("DEPARTAMENTO DE GESTÃO FINANCEIRA E PEDAGÓGICA", 14, 22);
      
      const now = new Date();
      const dateFormatted = now.toLocaleDateString("pt-BR") + " às " + now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
      docPDF.setFontSize(8);
      docPDF.text(`Emissão: ${dateFormatted}`, pageWidth - 14, 22, { align: "right" });

      // Document Subheader
      docPDF.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(13);
      docPDF.text("RELATÓRIO OFICIAL DE MATRÍCULAS", 14, 42);

      // Info Box / Metrics
      docPDF.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      docPDF.roundedRect(14, 46, pageWidth - 28, 20, 2, 2, "F");

      docPDF.setFontSize(8);
      docPDF.setFont("helvetica", "bold");
      docPDF.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.text("RESUMO DE REGISTROS", 18, 52);

      docPDF.setFont("helvetica", "normal");
      docPDF.setTextColor(71, 85, 105);
      docPDF.text(`Filtro de Status: ${statusFilter.toUpperCase()}`, 18, 58);
      docPDF.text(`Total Exibido: ${filteredEnrollments.length}`, 80, 58);
      docPDF.text(`Matrículas Ativas: ${matriculasAtivas}`, 130, 58);
      docPDF.text(`Desmatriculados: ${matriculasDesmatriculadas}`, 175, 58, { align: "right" });

      // Table Data Preparation
      const tableRows = filteredEnrollments.map((item, index) => {
        let dateFormatted = item.enrollmentDate;
        if (dateFormatted && dateFormatted.includes("-")) {
          const parts = dateFormatted.split("-");
          if (parts.length === 3) {
            dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        const classLabel = `${item.classType} (${item.classCode})${item.classWeekday ? ' - ' + item.classWeekday : ''}`;

        const studentDisplayName = item.studentSocialName && item.studentSocialName.trim().length > 0
          ? `${item.studentName} (Nome Social: ${item.studentSocialName})`
          : item.studentName;

        return [
          String(index + 1),
          studentDisplayName,
          item.studentCpf,
          classLabel,
          dateFormatted,
          item.statusLabel.toUpperCase()
        ];
      });

      // Render AutoTable
      autoTable(docPDF, {
        startY: 72,
        head: [["#", "Nome do Aluno", "CPF", "Turma", "Data Matrícula", "Status"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [1, 106, 134],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left"
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 55 },
          2: { cellWidth: 32 },
          3: { cellWidth: 48 },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 15, halign: "center", fontStyle: "bold" }
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            if (data.cell.raw === "ATIVA") {
              data.cell.styles.textColor = [16, 122, 87]; // Emerald green
            } else {
              data.cell.styles.textColor = [225, 29, 72]; // Rose red
            }
          }
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = (docPDF as any).internal.getNumberOfPages();
          const currentPage = data.pageNumber;

          docPDF.setDrawColor(226, 232, 240);
          docPDF.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

          docPDF.setFontSize(7);
          docPDF.setFont("helvetica", "bold");
          docPDF.setTextColor(148, 163, 184);
          docPDF.text("INTERVALO ESCOLA DE TEATRO • MÓDULO FINANCEIRO", 14, pageHeight - 9);

          docPDF.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, pageHeight - 9, { align: "right" });
        },
        margin: { top: 35, bottom: 20, left: 14, right: 14 }
      });

      // Save PDF
      docPDF.save(`Lista_Matriculas_Intervalo_${statusFilter.toLowerCase()}_${now.toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar arquivo PDF das matrículas.");
    }
  };

  // Generate PDF for Payments
  const handleGeneratePaymentPDF = () => {
    try {
      const docPDF = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = docPDF.internal.pageSize.getWidth();
      const pageHeight = docPDF.internal.pageSize.getHeight();

      const primaryTeal = [1, 106, 134];
      const darkSlate = [15, 23, 42];

      // Header Banner
      docPDF.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.rect(0, 0, pageWidth, 32, "F");

      docPDF.setTextColor(255, 255, 255);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(16);
      docPDF.text("INTERVALO ESCOLA DE TEATRO", 14, 15);

      docPDF.setFont("helvetica", "normal");
      docPDF.setFontSize(9);
      docPDF.text(`RELATÓRIO FINANCEIRO DE PAGAMENTOS - ${MONTHS_PT[selectedMonth].toUpperCase()} / ${selectedYear}`, 14, 22);

      const now = new Date();
      docPDF.setFontSize(8);
      docPDF.text(`Emissão: ${now.toLocaleDateString("pt-BR")}`, pageWidth - 14, 22, { align: "right" });

      // Summary
      docPDF.setFillColor(248, 250, 252);
      docPDF.roundedRect(14, 40, pageWidth - 28, 20, 2, 2, "F");

      docPDF.setFontSize(8);
      docPDF.setFont("helvetica", "bold");
      docPDF.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.text("BALANÇO FINANCEIRO DO MÊS", 18, 46);

      docPDF.setFont("helvetica", "normal");
      docPDF.setTextColor(71, 85, 105);
      docPDF.text(`Previsto Total: R$ ${totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 18, 52);
      docPDF.text(`Recebido: R$ ${totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 80, 52);
      docPDF.text(`Pendente: R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 135, 52);
      docPDF.text(`Adimplência: ${adimplencia}%`, 175, 52, { align: "right" });

      const tableRows = filteredPayments.map((item, index) => {
        const studentDisplayName = item.studentSocialName && item.studentSocialName.trim().length > 0
          ? `${item.studentName} (Nome Social: ${item.studentSocialName})`
          : item.studentName;

        return [
          String(index + 1),
          studentDisplayName,
          item.studentCpf,
          item.className,
          `R$ ${item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          item.dueDate ? item.dueDate.split("-").reverse().join("/") : "-",
          item.status.toUpperCase()
        ];
      });

      autoTable(docPDF, {
        startY: 65,
        head: [["#", "Nome do Aluno", "CPF", "Turmas", "Valor", "Vencimento", "Status"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [1, 106, 134],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 42 },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 20, halign: "center" },
          6: { cellWidth: 18, halign: "center", fontStyle: "bold" }
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 6) {
            if (data.cell.raw === "PAGO") {
              data.cell.styles.textColor = [16, 122, 87];
            } else if (data.cell.raw === "ATRASADO") {
              data.cell.styles.textColor = [225, 29, 72];
            } else {
              data.cell.styles.textColor = [217, 119, 6];
            }
          }
        },
        didDrawPage: (data) => {
          const pageCount = (docPDF as any).internal.getNumberOfPages();
          docPDF.setDrawColor(226, 232, 240);
          docPDF.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

          docPDF.setFontSize(7);
          docPDF.setFont("helvetica", "bold");
          docPDF.setTextColor(148, 163, 184);
          docPDF.text("INTERVALO ESCOLA DE TEATRO • DEPARTAMENTO FINANCEIRO", 14, pageHeight - 9);

          docPDF.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - 14, pageHeight - 9, { align: "right" });
        },
        margin: { top: 35, bottom: 20, left: 14, right: 14 }
      });

      docPDF.save(`Relatorio_Pagamentos_${MONTHS_PT[selectedMonth]}_${selectedYear}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF de pagamentos:", err);
      alert("Erro ao gerar PDF do relatório financeiro.");
    }
  };

  return (
    <motion.div
      key="financial-management-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
    >
      {/* Sidebar / Left Column */}
      <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-8 text-center relative overflow-hidden flex flex-col items-center justify-between gap-6 md:w-[320px] md:p-10 shrink-0 md:min-h-screen">
        <div className="flex flex-col items-center w-full">
          <div className="self-start mb-4">
            <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
          </div>

          <Logo className="h-16 md:h-24 w-auto mb-3" />
          <h1 className="text-white text-xl md:text-2xl font-black tracking-tighter">Módulo Financeiro</h1>
          <p className="text-teal-50/70 text-[10px] md:text-xs uppercase tracking-[0.3em] font-black leading-tight mt-1">
            Intervalo Escola de Teatro
          </p>
        </div>

        {/* Tab Selection Controls in Sidebar */}
        <div className="w-full space-y-3 bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("matriculas")}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-3 transition-all ${
              activeTab === "matriculas"
                ? "bg-white text-[#016a86] shadow-lg shadow-black/10 font-black scale-[1.02]"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users size={18} />
            Gestão de Matrículas
          </button>

          <button
            onClick={() => setActiveTab("pagamentos")}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-3 transition-all ${
              activeTab === "pagamentos"
                ? "bg-white text-[#016a86] shadow-lg shadow-black/10 font-black scale-[1.02]"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <CreditCard size={18} />
            Gestão de Receita
          </button>

          <button
            onClick={() => setActiveTab("despesas")}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-3 transition-all ${
              activeTab === "despesas"
                ? "bg-white text-[#016a86] shadow-lg shadow-black/10 font-black scale-[1.02]"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <TrendingUp size={18} className="transform rotate-180" />
            Gestão de Despesas
          </button>
        </div>

        <div className="text-[10px] text-teal-100/60 font-bold uppercase tracking-widest pt-4 border-t border-white/10 w-full">
          Painel Administrativo
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-12 flex-1 md:overflow-y-auto bg-slate-50/50 flex flex-col min-h-screen">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          
          {activeTab === "inicio" && (
            <div className="flex-1 flex flex-col items-center justify-center h-full animate-fadeIn">
              <div className="text-center mb-10 max-w-lg">
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-pro-teal/10 text-pro-teal rounded-[24px] flex items-center justify-center">
                    <Wallet size={40} />
                  </div>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-4">
                  Gestão Estratégica e Financeira
                </h2>
                <p className="text-sm md:text-base text-slate-500 font-medium">
                  Bem-vindo ao módulo financeiro. Escolha uma das opções abaixo para acessar e gerenciar matrículas ou pagamentos e mensalidades.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-5xl">
                <button
                  onClick={() => setActiveTab("matriculas")}
                  className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-pro-teal/30 transition-all group flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Users size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Gestão de Matrículas</h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Acompanhe e exporte relatórios de todos os alunos matriculados nas turmas da escola.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("pagamentos")}
                  className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-pro-teal/30 transition-all group flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <CreditCard size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Gestão de Receita</h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Controle o fluxo de recebimentos, mensalidades e status financeiro dos alunos.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab("despesas")}
                  className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-rose-500/30 transition-all group flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <TrendingUp size={32} className="transform rotate-180" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">Gestão de Despesas</h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Registre e acompanhe os gastos, pagamentos a fornecedores e despesas da escola.
                  </p>
                </button>
              </div>
            </div>
          )}

          {activeTab !== "inicio" && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-pro-teal uppercase tracking-wider mb-1">
                <Wallet size={16} />
                <span>Gestão Estratégica & Financeira</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                {activeTab === "matriculas" ? "Gestão de Matrículas" : 
                 activeTab === "pagamentos" ? "Gestão de Receita" : "Gestão de Despesas"}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                {activeTab === "matriculas" 
                  ? "Acompanhe e exporte relatórios de todos os alunos matriculados nas turmas da escola."
                  : activeTab === "pagamentos"
                  ? "Controle o fluxo de recebimentos, mensalidades e status financeiro dos alunos."
                  : "Registre e acompanhe os gastos e pagamentos a fornecedores da escola."}
              </p>
            </div>

            {/* Export PDF Action Button */}
            <div className="shrink-0">
              {activeTab === "matriculas" ? (
                <button
                  onClick={handleGenerateEnrollmentPDF}
                  className="w-full md:w-auto px-6 py-3.5 bg-[#016a86] hover:bg-[#005167] text-white font-bold text-xs md:text-sm rounded-2xl shadow-lg shadow-[#016a86]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download size={18} />
                  <span>Baixar Lista em PDF</span>
                </button>
              ) : activeTab === "pagamentos" ? (
                <button
                  onClick={handleGeneratePaymentPDF}
                  className="w-full md:w-auto px-6 py-3.5 bg-[#016a86] hover:bg-[#005167] text-white font-bold text-xs md:text-sm rounded-2xl shadow-lg shadow-[#016a86]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileText size={18} />
                  <span>Baixar Relatório PDF</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="w-full md:w-auto px-6 py-3.5 bg-[#016a86] hover:bg-[#005167] text-white font-bold text-xs md:text-sm rounded-2xl shadow-lg shadow-[#016a86]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlusCircle size={18} />
                  <span>Nova Despesa</span>
                </button>
              )}
            </div>
          </div>
          )}

          {/* TAB 1: GESTÃO DE MATRÍCULAS */}
          {activeTab === "matriculas" && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-wider">Total</span>
                    <Users size={16} className="text-[#016a86]" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-slate-800">{totalMatriculas}</div>
                    <div className="text-[9px] font-bold text-slate-400 mt-0.5">Matrículas</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-[9px] font-black uppercase tracking-wider">Ativas</span>
                    <UserCheck size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-emerald-600">{matriculasAtivas}</div>
                    <div className="text-[9px] font-bold text-emerald-600/70 mt-0.5">Alunos ativos</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-pro-teal">
                    <span className="text-[9px] font-black uppercase tracking-wider">Pagantes</span>
                    <DollarSign size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-pro-teal">{matriculasPagantes}</div>
                    <div className="text-[9px] font-bold text-pro-teal/70 mt-0.5">Alunos pagantes</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-600">
                    <span className="text-[9px] font-black uppercase tracking-wider">Isentos</span>
                    <Award size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-amber-600">{matriculasIsentas}</div>
                    <div className="text-[9px] font-bold text-amber-600/70 mt-0.5">Bolsistas / isentos</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-rose-500">
                    <span className="text-[9px] font-black uppercase tracking-wider">Desmatriculados</span>
                    <UserX size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-rose-500">{matriculasDesmatriculadas}</div>
                    <div className="text-[9px] font-bold text-rose-400 mt-0.5">Inativos</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-sky-600">
                    <span className="text-[9px] font-black uppercase tracking-wider">Taxa Ativa</span>
                    <TrendingUp size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-sky-600">{taxaAtividade}%</div>
                    <div className="text-[9px] font-bold text-sky-500/70 mt-0.5">Retenção</div>
                  </div>
                </div>
              </div>

              {/* Filters & Search Controls */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  
                  {/* Status Filter Buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full lg:w-auto">
                    {(["Todas", "Ativas", "Desmatriculados"] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`flex-1 lg:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all ${
                          statusFilter === st
                            ? "bg-white text-[#016a86] shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {st === "Todas" ? "Todas" : st === "Ativas" ? "Matrículas Ativas" : "Desmatriculados"}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nome, CPF ou turma..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#016a86]/20 focus:border-[#016a86]"
                    />
                  </div>
                </div>

                {/* Condition and Class Filters Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Condição:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      {(["Todos", "Pagante", "Isento"] as const).map(cond => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => setPaymentConditionFilter(cond)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                            paymentConditionFilter === cond
                              ? "bg-white text-[#016a86] shadow-xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {cond === "Todos" ? "Todos" : cond === "Pagante" ? (
                            <>
                              <DollarSign size={12} /> Pagantes
                            </>
                          ) : (
                            <>
                              <Award size={12} /> Isentos
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Class Select Filter */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Turma:</span>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 text-xs focus:outline-none focus:border-[#016a86]"
                    >
                      <option value="Todas">Todas as Turmas ({classes.length})</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.type} ({c.code}) - {c.weekday}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Enrolled Students List */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-sm md:text-base flex items-center gap-2">
                    <span>Lista de Alunos Matriculados</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#016a86]/10 text-[#016a86] text-xs font-extrabold">
                      {filteredEnrollments.length}
                    </span>
                  </h3>

                  <div className="text-xs text-slate-400 font-bold">
                    Exibindo {filteredEnrollments.length} de {allEnrollmentRecords.length} matrículas
                  </div>
                </div>

                {filteredEnrollments.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Users size={36} className="mx-auto text-slate-300" />
                    <p className="text-slate-500 font-bold text-sm">Nenhuma matrícula encontrada com os filtros selecionados.</p>
                    <p className="text-slate-400 text-xs">Tente alterar o termo de busca ou o status selecionado.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredEnrollments.map((record) => (
                      <div 
                        key={record.id}
                        className="p-4 md:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Student Info */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <Avatar src={record.studentPhoto} fallbackSize={28} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-extrabold text-slate-800 text-sm md:text-base">
                                {record.studentName}
                              </h4>
                              {record.studentSocialName && record.studentSocialName.trim().length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 text-[#016a86] border border-teal-200/80 px-2 py-0.5 rounded-md font-bold">
                                  <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Nome Social:</span>
                                  <span>{record.studentSocialName}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                              <span>CPF: <strong className="text-slate-700">{record.studentCpf}</strong></span>
                              {record.studentEmail && <span>Email: <span className="text-slate-600">{record.studentEmail}</span></span>}
                              {record.studentPhone && <span>Tel: <span className="text-slate-600">{record.studentPhone}</span></span>}
                            </div>
                          </div>
                        </div>

                        {/* Class and Enrollment Date Info */}
                        <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-between md:justify-end">
                          <div className="text-left md:text-right">
                            <div className="text-xs font-black text-slate-800">
                              {record.classType} <span className="text-[#016a86]">({record.classCode})</span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                              {record.classWeekday} {record.classTime ? `• ${record.classTime}` : ""}
                            </div>
                          </div>

                          <div className="text-center md:text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Matrícula</div>
                            <div className="text-xs font-bold text-slate-700 mt-0.5">
                              {record.enrollmentDate ? record.enrollmentDate.split('-').reverse().join('/') : "N/D"}
                            </div>
                          </div>

                          {/* Payment Condition Badge & Toggle */}
                          <div className="shrink-0 text-center">
                            <button
                              type="button"
                              onClick={async () => {
                                const newType = record.paymentType === "Isento" ? "Pagante" : "Isento";
                                try {
                                  await updateDoc(doc(db, "classes", record.classId), {
                                    [`studentPaymentTypes.${record.studentId}`]: newType
                                  });
                                } catch (err) {
                                  alert("Erro ao alterar condição de pagamento.");
                                }
                              }}
                              title="Clique para alternar entre Pagante e Isento"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                                record.paymentType === "Isento"
                                  ? "bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200"
                                  : "bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100"
                              }`}
                            >
                              <DollarSign size={12} />
                              {record.paymentType}
                            </button>
                          </div>

                          {/* Status Badge & Toggle */}
                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const newStatus = record.isEnrollmentActive ? "Desmatriculado" : "Ativo";
                                  if (record.classId && record.classId !== "sem_turma") {
                                    const classRef = doc(db, "classes", record.classId);
                                    await updateDoc(classRef, {
                                      [`studentEnrollmentStatuses.${record.studentId}`]: newStatus
                                    });
                                  }
                                  const userRef = doc(db, "usuarios", record.studentId);
                                  if (record.isEnrollmentActive) {
                                    await updateDoc(userRef, {
                                      desmatriculado: true,
                                      inactive: true,
                                      status: "desmatriculado",
                                      enrollmentStatus: "Desmatriculado"
                                    });
                                  } else {
                                    await updateDoc(userRef, {
                                      desmatriculado: false,
                                      inactive: false,
                                      status: "ativo",
                                      enrollmentStatus: "Ativo"
                                    });
                                  }
                                } catch (err) {
                                  console.error("Erro ao alterar status da matrícula:", err);
                                  alert("Erro ao alterar status da matrícula.");
                                }
                              }}
                              title="Clique para alternar o status da matrícula (Ativa / Desmatriculado)"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
                                record.isEnrollmentActive
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100"
                              }`}
                            >
                              {record.isEnrollmentActive ? (
                                <>
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                  Ativa
                                </>
                              ) : (
                                <>
                                  <UserX size={14} className="text-rose-500" />
                                  Desmatriculado
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DE PAGAMENTOS */}
          {activeTab === "pagamentos" && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Payment Month / Year Selector */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-[#016a86]" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Competência Financeira</h3>
                    <p className="text-xs text-slate-400">Selecione o mês e ano de referência das mensalidades</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-[#016a86]"
                  >
                    {MONTHS_PT.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-[#016a86]"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleResetPaymentValues}
                    disabled={isResetting}
                    className="px-4 py-2.5 bg-[#016a86]/10 hover:bg-[#016a86] text-[#016a86] hover:text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-xs"
                    title="Recalcular e sincronizar os valores das mensalidades com base nos valores dos cursos cadastrados"
                  >
                    <RefreshCw size={14} className={isResetting ? "animate-spin" : ""} />
                    <span>{isResetting ? "Recalculando..." : "Resetar / Recalcular Valores"}</span>
                  </button>
                </div>
              </div>

              {/* Payment Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Previsto Total</span>
                    <DollarSign size={18} className="text-slate-600" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-slate-800">
                      R$ {totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">Mensalidades do mês</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Recebido</span>
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-emerald-600">
                      R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600/70 mt-0.5">Pagamentos confirmados</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">A Receber / Pendente</span>
                    <Clock size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-amber-600">
                      R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-amber-500 mt-0.5">Aguardando pagamento</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-sky-600">
                    <span className="text-[10px] font-black uppercase tracking-wider">Taxa de Adimplência</span>
                    <TrendingUp size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-sky-600">{adimplencia}%</div>
                    <div className="text-[10px] font-bold text-sky-500/70 mt-0.5">Índice do mês corrente</div>
                  </div>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full lg:w-auto">
                  {(["Todos", "Pago", "Pendente", "Atrasado", "Isento"] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setPaymentStatusFilter(st)}
                      className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${
                        paymentStatusFilter === st
                          ? "bg-white text-[#016a86] shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Buscar por aluno ou CPF..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#016a86]/20 focus:border-[#016a86]"
                  />
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-sm md:text-base flex items-center gap-2">
                    <span>Lista de Pagamentos ({MONTHS_PT[selectedMonth]} / {selectedYear})</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#016a86]/10 text-[#016a86] text-xs font-extrabold">
                      {filteredPayments.length}
                    </span>
                  </h3>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <CreditCard size={36} className="mx-auto text-slate-300" />
                    <p className="text-slate-500 font-bold text-sm">Nenhum registro financeiro encontrado.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredPayments.map((item) => (
                      <div 
                        key={item.id}
                        className="p-4 md:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-slate-800 text-sm md:text-base">{item.studentName}</h4>
                            {item.studentSocialName && item.studentSocialName.trim().length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-teal-50 text-[#016a86] border border-teal-200/80 px-2 py-0.5 rounded-md font-bold">
                                <span className="text-slate-400 text-[9px] font-black uppercase tracking-wider">Nome Social:</span>
                                <span>{item.studentSocialName}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                            <span>CPF: <strong className="text-slate-700">{item.studentCpf}</strong></span>
                            <span>Turma: <span className="text-[#016a86] font-bold">{item.className}</span></span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-between md:justify-end">
                          <div className="text-left md:text-right">
                            {editingAmountId === item.id ? (
                              <div className="flex flex-col items-start md:items-end gap-2.5 bg-slate-50 p-3 rounded-2xl border-2 border-[#016a86]/40 shadow-md">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-600 font-extrabold">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={tempAmountValue}
                                    onChange={(e) => setTempAmountValue(e.target.value)}
                                    className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-black text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#016a86]"
                                    autoFocus
                                    placeholder="0,00"
                                  />
                                  <button
                                    onClick={() => handleSaveCustomAmount(item, Number(tempAmountValue), fixAmountForFuture)}
                                    disabled={isUpdatingPayment === item.id}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    title="Salvar valor"
                                  >
                                    <Check size={14} />
                                    <span>Salvar</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingAmountId(null)}
                                    className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl transition-colors cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </div>

                                <div className="bg-white/80 p-2 rounded-xl border border-slate-200 w-full text-left md:text-right space-y-1">
                                  <label className="flex items-center gap-2 text-xs text-slate-800 font-bold cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={fixAmountForFuture}
                                      onChange={(e) => setFixAmountForFuture(e.target.checked)}
                                      className="w-4 h-4 text-[#016a86] rounded border-slate-300 focus:ring-[#016a86] cursor-pointer"
                                    />
                                    <span>Fixar valor dali por diante (próximos meses)</span>
                                  </label>
                                  <p className="text-[10px] text-slate-500 font-medium pl-6">
                                    {fixAmountForFuture 
                                      ? "✓ O novo valor será automaticamente carregado nos próximos meses na gestão financeira." 
                                      : "Apenas aplicará a este mês específico."}
                                  </p>
                                </div>

                                {item.hasStudentCustomFee && (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreCourseStandardFee(item)}
                                    disabled={isUpdatingPayment === item.id}
                                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline transition-colors cursor-pointer self-start md:self-end"
                                  >
                                    Restaurar valor padrão do curso
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-black text-slate-800 flex items-center justify-start md:justify-end gap-1.5">
                                  <span>R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                  <button
                                    onClick={() => {
                                      setEditingAmountId(item.id);
                                      setTempAmountValue(String(item.amount));
                                      setFixAmountForFuture(true);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-[#016a86] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Editar ou fixar novo valor de mensalidade"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                </div>
                                {item.hasStudentCustomFee && (
                                  <div className="flex justify-start md:justify-end">
                                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-md mt-0.5" title="Valor customizado fixado para os próximos meses">
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                                      Valor fixado (R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                                    </span>
                                  </div>
                                )}
                                <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                                  Vencimento: {item.dueDate ? item.dueDate.split("-").reverse().join("/") : "10/" + String(selectedMonth + 1).padStart(2, '0')}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Action Button to toggle payment status */}
                          <div className="flex items-center gap-2">
                            {item.status === "Isento" ? (
                              <span className="px-3.5 py-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-black text-xs flex items-center gap-1.5">
                                <Award size={14} />
                                Isento
                              </span>
                            ) : item.status === "Pago" ? (
                              <button
                                onClick={() => handleTogglePaymentStatus(item, "Pendente")}
                                disabled={isUpdatingPayment === item.id}
                                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-600 border border-emerald-200 hover:border-rose-200 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all group cursor-pointer"
                                title="Clique para marcar como pendente"
                              >
                                <Check size={14} className="group-hover:hidden" />
                                <RefreshCw size={14} className="hidden group-hover:block animate-spin" />
                                <span className="group-hover:hidden">Pago</span>
                                <span className="hidden group-hover:inline">Desfazer</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePaymentStatus(item, "Pago")}
                                disabled={isUpdatingPayment === item.id}
                                className="px-3.5 py-1.5 bg-[#016a86] hover:bg-[#004e63] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                              >
                                <Check size={14} />
                                <span>Marcar Pago</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GESTÃO DE DESPESAS */}
          {activeTab === "despesas" && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[9px] font-black uppercase tracking-wider">Total do Mês</span>
                    <TrendingUp size={16} className="text-[#016a86] transform rotate-180" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-slate-800">
                      R$ {totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 mt-0.5">Em {MONTHS_PT[expenseMonth]}</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-[9px] font-black uppercase tracking-wider">Pagas</span>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-emerald-600">
                      {filteredExpenses.filter(e => e.status === "Pago").length}
                    </div>
                    <div className="text-[9px] font-bold text-emerald-600/70 mt-0.5">Despesas pagas</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-500">
                    <span className="text-[9px] font-black uppercase tracking-wider">Pendentes</span>
                    <Clock size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-amber-500">
                      {filteredExpenses.filter(e => e.status === "Pendente").length}
                    </div>
                    <div className="text-[9px] font-bold text-amber-500/70 mt-0.5">Aguardando pagamento</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-rose-500">
                    <span className="text-[9px] font-black uppercase tracking-wider">Atrasadas</span>
                    <AlertCircle size={16} />
                  </div>
                  <div className="mt-2">
                    <div className="text-xl md:text-2xl font-black text-rose-500">
                      {filteredExpenses.filter(e => e.status === "Atrasado").length}
                    </div>
                    <div className="text-[9px] font-bold text-rose-500/70 mt-0.5">Pagamento em atraso</div>
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <select
                        value={expenseMonth}
                        onChange={(e) => setExpenseMonth(Number(e.target.value))}
                        className="bg-transparent text-sm font-bold text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none appearance-none cursor-pointer"
                      >
                        {MONTHS_PT.map((m, idx) => (
                          <option key={m} value={idx}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={expenseYear}
                        onChange={(e) => setExpenseYear(Number(e.target.value))}
                        className="bg-transparent text-sm font-bold text-slate-700 py-1.5 px-3 rounded-lg focus:outline-none appearance-none cursor-pointer border-l border-slate-300 ml-1"
                      >
                        {[2024, 2025, 2026, 2027].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
                      {["Todos", "Pago", "Pendente", "Atrasado"].map(status => (
                        <button
                          key={status}
                          onClick={() => setExpenseStatusFilter(status as any)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                            expenseStatusFilter === status
                              ? "bg-white text-[#016a86] shadow-sm"
                              : "text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar por descrição ou categoria..."
                      value={expenseSearch}
                      onChange={e => setExpenseSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#016a86]/20 focus:border-[#016a86] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Expenses List */}
              <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <FileText size={16} className="text-pro-teal" />
                    <span>Lista de Despesas ({MONTHS_PT[expenseMonth]} / {expenseYear})</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                    {filteredExpenses.length} registros
                  </span>
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center bg-slate-50/30">
                    <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
                      <TrendingUp size={32} className="transform rotate-180" />
                    </div>
                    <h3 className="text-base font-black text-slate-800 mb-1">Nenhuma despesa encontrada</h3>
                    <p className="text-slate-400 text-xs">Não existem registros de despesas para os filtros aplicados neste mês.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[600px] p-2">
                    {filteredExpenses.map((expense) => (
                      <div key={expense.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                            expense.status === "Pago" ? "bg-emerald-100 text-emerald-600" :
                            expense.status === "Atrasado" ? "bg-rose-100 text-rose-600" :
                            "bg-amber-100 text-amber-600"
                          }`}>
                            {expense.status === "Pago" ? <CheckCircle2 size={20} /> :
                             expense.status === "Atrasado" ? <AlertCircle size={20} /> : <Clock size={20} />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-slate-800 truncate">{expense.description}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {expense.category}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                Venc: {expense.dueDate.split("-").reverse().join("/")}
                              </span>
                            </div>
                            {expense.notes && (
                              <p className="text-[10px] text-slate-400 mt-1 truncate">{expense.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 ml-14 md:ml-0">
                          <div className="text-left md:text-right">
                            <div className="text-sm font-black text-slate-800">
                              R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <div className={`text-[10px] font-bold mt-0.5 ${
                              expense.status === "Pago" ? "text-emerald-600" :
                              expense.status === "Atrasado" ? "text-rose-500" : "text-amber-500"
                            }`}>
                              {expense.status.toUpperCase()}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="p-2 text-slate-400 hover:text-[#016a86] hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                              title="Editar despesa"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              title="Excluir despesa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Nova/Editar Despesa */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center">
                    <TrendingUp size={20} className="transform rotate-180" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      {editingExpense ? "Editar Despesa" : "Nova Despesa"}
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      {MONTHS_PT[expenseMonth]} / {expenseYear}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="p-2 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors border border-slate-200 shadow-sm cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Descrição</label>
                  <input
                    type="text"
                    required
                    value={expenseFormData.description || ""}
                    onChange={e => setExpenseFormData({...expenseFormData, description: e.target.value})}
                    placeholder="Ex: Aluguel, Conta de Luz..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Categoria</label>
                    <input
                      type="text"
                      required
                      value={expenseFormData.category || ""}
                      onChange={e => setExpenseFormData({...expenseFormData, category: e.target.value})}
                      placeholder="Ex: Operacional"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Valor (R$)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={expenseFormData.amount !== undefined ? expenseFormData.amount : ""}
                      onChange={e => setExpenseFormData({...expenseFormData, amount: Number(e.target.value)})}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Vencimento</label>
                    <input
                      type="date"
                      required
                      value={expenseFormData.dueDate || ""}
                      onChange={e => setExpenseFormData({...expenseFormData, dueDate: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={expenseFormData.status || "Pendente"}
                      onChange={e => setExpenseFormData({...expenseFormData, status: e.target.value as any})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal transition-all cursor-pointer appearance-none"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                      <option value="Atrasado">Atrasado</option>
                    </select>
                  </div>
                </div>

                {expenseFormData.status === "Pago" && (
                  <div className="grid grid-cols-2 gap-4 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Data do Pgto</label>
                      <input
                        type="date"
                        value={expenseFormData.paidAt || ""}
                        onChange={e => setExpenseFormData({...expenseFormData, paidAt: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Forma de Pgto</label>
                      <select
                        value={expenseFormData.paymentMethod || ""}
                        onChange={e => setExpenseFormData({...expenseFormData, paymentMethod: e.target.value as any})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal transition-all cursor-pointer appearance-none"
                      >
                        <option value="">Selecione...</option>
                        <option value="PIX">PIX</option>
                        <option value="Cartão">Cartão</option>
                        <option value="Boleto">Boleto</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Dinheiro">Dinheiro</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Observações</label>
                  <textarea
                    rows={2}
                    value={expenseFormData.notes || ""}
                    onChange={e => setExpenseFormData({...expenseFormData, notes: e.target.value})}
                    placeholder="Notas ou observações..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pro-teal transition-all resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#016a86] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#004e63] shadow-md shadow-[#016a86]/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Check size={16} />
                    Salvar Despesa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
