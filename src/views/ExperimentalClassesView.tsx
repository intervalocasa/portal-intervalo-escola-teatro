/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  FileText, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  User, 
  GraduationCap, 
  Presentation, 
  Phone, 
  Mail, 
  Eye, 
  History,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  UserX,
  HelpCircle,
  XCircle,
  ClipboardCheck,
  RotateCcw,
  Check,
  MessageSquare,
  ArrowRight,
  Filter,
  Users,
  DollarSign,
  Wallet,
  TrendingUp,
  Coins,
  Award,
  FileSpreadsheet,
  Info,
  CalendarCheck,
  CalendarClock
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ExperimentalClassBooking, ExperimentalTriageStatus, ExperimentalAttendanceConfirmation, Course, Class } from "../types";
import { BackButton } from "../components/CommonComponents";

interface ExperimentalClassesViewProps {
  setView: (view: any) => void;
  courses?: Course[];
  classes?: Class[];
  users?: any[];
  currentUser?: any;
  showNotification?: (message: string, title?: string, type?: "success" | "error") => void;
}

export function getDayOfWeekInPortuguese(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split('-');
  if (parts.length !== 3) return "";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return "";
  const dateObj = new Date(year, month - 1, day);
  const days = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
  ];
  return days[dateObj.getDay()] || "";
}

export function formatDateBR(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatCreationTimestamp(createdAt: any): string | null {
  if (!createdAt) return null;
  let dateObj: Date | null = null;
  if (typeof createdAt.toDate === "function") {
    dateObj = createdAt.toDate();
  } else if (createdAt.seconds) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt === "string" || typeof createdAt === "number") {
    dateObj = new Date(createdAt);
  } else if (createdAt instanceof Date) {
    dateObj = createdAt;
  }

  if (!dateObj || isNaN(dateObj.getTime())) return null;

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

export const ExperimentalClassesView: React.FC<ExperimentalClassesViewProps> = ({
  setView,
  courses = [],
  classes = [],
  users = [],
  currentUser,
  showNotification
}) => {
  const loggedUser = useMemo(() => {
    if (!currentUser) return null;
    const found = users?.find(
      (u) => u.id === currentUser.uid || u.uid === currentUser.uid || u.email === currentUser.email
    );
    return found || {
      name: currentUser.displayName || currentUser.email?.split("@")[0] || "Usuário do Sistema",
      role: "Gestor / Auxiliar",
      uid: currentUser.uid
    };
  }, [currentUser, users]);

  const availableCreators = useMemo(() => {
    return (users || [])
      .filter((u) => {
        if (!u || u.inactive) return false;
        // Colaboradores: Professor, Diretor Pedagógico, Gestor, Auxiliar Administrativo (não Alunos)
        if (u.role === "Aluno") return false;
        return true;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users]);

  const [bookings, setBookings] = useState<ExperimentalClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "PAGAMENTO_PENDENTE" | "AGENDAMENTO_CONFIRMADO">("TODOS");
  const [classFilter, setClassFilter] = useState<string>("TODOS");
  const [creatorFilter, setCreatorFilter] = useState<string>("TODOS"); // "TODOS" | "MEUS" | id/name
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  
  // Specific Tabs Filter
  const [tabFilter, setTabFilter] = useState<
    "TODOS" | "AGENDADOS" | "MATRICULADO" | "AGUARDANDO_RESPOSTA" | "NAO_MATRICULOU" | "NAO_COMPARECEU"
  >("TODOS");

  // Attendance Pre-Confirmation Filter
  const [attendanceFilter, setAttendanceFilter] = useState<
    "TODOS" | "CONFIRMOU_VESPERA" | "CONFIRMOU_NO_DIA" | "REAGENDOU" | "PENDENTE"
  >("TODOS");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ExperimentalClassBooking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<ExperimentalClassBooking | null>(null);
  const [receiptViewingBooking, setReceiptViewingBooking] = useState<ExperimentalClassBooking | null>(null);
  const [uploadingBookingId, setUploadingBookingId] = useState<string | null>(null);

  // Quick Modal for Attendance Confirmation
  const [attendanceModalBooking, setAttendanceModalBooking] = useState<ExperimentalClassBooking | null>(null);

  // Quick Modal for Adjusting Creator ("Quem fez o agendamento")
  const [adjustCreatorBooking, setAdjustCreatorBooking] = useState<ExperimentalClassBooking | null>(null);
  const [adjustCreatorUid, setAdjustCreatorUid] = useState<string>("");
  const [adjustCreatorName, setAdjustCreatorName] = useState<string>("");
  const [adjustCreatorRole, setAdjustCreatorRole] = useState<string>("");

  // Manual Confirmation Modal State
  const [manualConfirmBooking, setManualConfirmBooking] = useState<ExperimentalClassBooking | null>(null);
  const [manualConfirmReasonInput, setManualConfirmReasonInput] = useState("");

  // Post-Booking Triage Modal State
  const [triageBooking, setTriageBooking] = useState<ExperimentalClassBooking | null>(null);
  const [triageAttended, setTriageAttended] = useState<boolean | null>(null);
  const [triageOutcome, setTriageOutcome] = useState<"MATRICULADO" | "AGUARDANDO_RESPOSTA" | "NAO_MATRICULOU" | null>(null);
  const [triageNotesInput, setTriageNotesInput] = useState("");

  // Form State
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [course, setCourse] = useState("");
  const [classGroup, setClassGroup] = useState("");
  const [classTime, setClassTime] = useState("");
  const [date, setDate] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [status, setStatus] = useState<"PAGAMENTO_PENDENTE" | "AGENDAMENTO_CONFIRMADO">("PAGAMENTO_PENDENTE");
  const [attendanceConfirmation, setAttendanceConfirmation] = useState<ExperimentalAttendanceConfirmation | null>(null);
  const [notes, setNotes] = useState("");
  const [manualConfirmationReason, setManualConfirmationReason] = useState("");

  // Booking Creator State in Form
  const [bookingCreatedByUid, setBookingCreatedByUid] = useState<string>("");
  const [bookingCreatedByName, setBookingCreatedByName] = useState<string>("");
  const [bookingCreatedByRole, setBookingCreatedByRole] = useState<string>("");

  // Reschedule state
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subscribe to experimental_classes
  useEffect(() => {
    const q = query(collection(db, "experimental_classes"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ExperimentalClassBooking[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExperimentalClassBooking));
      setBookings(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading experimental classes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update dayOfWeek whenever date changes in form
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setDayOfWeek(getDayOfWeekInPortuguese(newDate));
  };

  const resetForm = () => {
    setStudentName("");
    setStudentEmail("");
    setStudentPhone("");
    setCourse(courses.length > 0 ? courses[0].name : "");
    setClassGroup(classes.length > 0 ? classes[0].code : "");
    setClassTime("14:00");
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
    setDayOfWeek(getDayOfWeekInPortuguese(today));
    setStatus("PAGAMENTO_PENDENTE");
    setAttendanceConfirmation(null);
    setNotes("");
    setManualConfirmationReason("");
    setRescheduleReason("");
    setEditingBooking(null);

    // Find matching collaborator from team or fallback to logged user
    const defaultStaff = availableCreators.find(u => u.id === currentUser?.uid || u.id === loggedUser?.id) || availableCreators[0];
    if (defaultStaff) {
      setBookingCreatedByUid(defaultStaff.id);
      setBookingCreatedByName(defaultStaff.name);
      setBookingCreatedByRole(defaultStaff.role || "Gestor");
    } else {
      const defaultName = loggedUser?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Usuário do Sistema";
      let defaultRole = "Gestor";
      if (loggedUser?.role) {
        if (loggedUser.role === "GESTOR" || loggedUser.role === "gestor") defaultRole = "Gestor";
        else if (loggedUser.role === "AUXILIAR" || loggedUser.role === "auxiliar") defaultRole = "Auxiliar Administrativo";
        else defaultRole = loggedUser.role;
      }
      setBookingCreatedByUid(currentUser?.uid || loggedUser?.id || "");
      setBookingCreatedByName(defaultName);
      setBookingCreatedByRole(defaultRole);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (booking: ExperimentalClassBooking) => {
    setEditingBooking(booking);
    setStudentName(booking.studentName || "");
    setStudentEmail(booking.studentEmail || "");
    setStudentPhone(booking.studentPhone || "");
    setCourse(booking.course || "");
    setClassGroup(booking.classGroup || "");
    setClassTime(booking.classTime || "");
    setDate(booking.date || "");
    setDayOfWeek(booking.dayOfWeek || getDayOfWeekInPortuguese(booking.date || ""));
    setStatus(booking.status || "PAGAMENTO_PENDENTE");
    setAttendanceConfirmation(booking.attendanceConfirmation || null);
    setNotes(booking.notes || "");
    setManualConfirmationReason(booking.manualConfirmationReason || "");
    setRescheduleReason("");
    
    // Match creator with available registered collaborators
    const matchedCreator = availableCreators.find(
      u => (booking.createdByUid && u.id === booking.createdByUid) || 
           (booking.createdByName && u.name.trim().toLowerCase() === booking.createdByName.trim().toLowerCase())
    );

    if (matchedCreator) {
      setBookingCreatedByUid(matchedCreator.id);
      setBookingCreatedByName(matchedCreator.name);
      setBookingCreatedByRole(matchedCreator.role || "Colaborador");
    } else {
      setBookingCreatedByUid(booking.createdByUid || "");
      setBookingCreatedByName(booking.createdByName || "");
      setBookingCreatedByRole(booking.createdByRole || "");
    }

    setIsCreateModalOpen(false);
  };

  // Open Quick Modal to adjust creator
  const openAdjustCreatorModal = (booking: ExperimentalClassBooking) => {
    setAdjustCreatorBooking(booking);

    // Match creator with available registered collaborators
    const matchedCreator = availableCreators.find(
      u => (booking.createdByUid && u.id === booking.createdByUid) || 
           (booking.createdByName && u.name.trim().toLowerCase() === booking.createdByName.trim().toLowerCase())
    );

    if (matchedCreator) {
      setAdjustCreatorUid(matchedCreator.id);
      setAdjustCreatorName(matchedCreator.name);
      setAdjustCreatorRole(matchedCreator.role || "Colaborador");
    } else if (availableCreators.length > 0) {
      const defaultStaff = availableCreators.find(u => u.id === currentUser?.uid || u.id === loggedUser?.id) || availableCreators[0];
      setAdjustCreatorUid(defaultStaff.id);
      setAdjustCreatorName(defaultStaff.name);
      setAdjustCreatorRole(defaultStaff.role || "Colaborador");
    } else {
      setAdjustCreatorUid(booking.createdByUid || "");
      setAdjustCreatorName(booking.createdByName || "");
      setAdjustCreatorRole(booking.createdByRole || "");
    }
  };

  // Save adjusted creator directly
  const handleSaveAdjustCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustCreatorBooking) return;

    const selectedUser = availableCreators.find(u => u.id === adjustCreatorUid);
    if (!selectedUser && !adjustCreatorName.trim()) {
      showNotification?.("Selecione um colaborador cadastrado no sistema.", "Campo Obrigatório", "error");
      return;
    }

    const finalUid = selectedUser ? selectedUser.id : (adjustCreatorUid || null);
    const finalName = selectedUser ? selectedUser.name : adjustCreatorName.trim();
    const finalRole = selectedUser ? (selectedUser.role || "Colaborador") : (adjustCreatorRole.trim() || null);

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "experimental_classes", adjustCreatorBooking.id), {
        createdByUid: finalUid,
        createdByName: finalName,
        createdByRole: finalRole,
        updatedAt: serverTimestamp()
      });

      showNotification?.("Responsável pelo agendamento atualizado com sucesso!", "Sucesso", "success");
      setAdjustCreatorBooking(null);
    } catch (err) {
      console.error("Error updating booking creator:", err);
      showNotification?.("Erro ao atualizar responsável pelo agendamento.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Attendance Confirmation Status (Véspera, No Dia, Reagendou, Limpar)
  const handleSaveAttendanceConfirmation = async (
    bookingId: string,
    confirmationStatus: ExperimentalAttendanceConfirmation | null
  ) => {
    setIsSubmitting(true);
    try {
      const updaterName = loggedUser?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Usuário do Sistema";
      
      await updateDoc(doc(db, "experimental_classes", bookingId), {
        attendanceConfirmation: confirmationStatus,
        attendanceConfirmationUpdatedAt: serverTimestamp(),
        attendanceConfirmationUpdatedByName: updaterName,
        updatedAt: serverTimestamp()
      });

      const labelMap: Record<string, string> = {
        CONFIRMOU_VESPERA: "Confirmou na véspera que vai estar presente no dia seguinte",
        CONFIRMOU_NO_DIA: "Confirmou presença no dia da aula",
        REAGENDOU: "Reagendamento registrado"
      };

      if (confirmationStatus) {
        showNotification?.(labelMap[confirmationStatus] || "Confirmação salva com sucesso!", "Confirmação Registrada", "success");
      } else {
        showNotification?.("Confirmação de presença redefinida com sucesso.", "Sucesso", "success");
      }
      setAttendanceModalBooking(null);
    } catch (err) {
      console.error("Error updating attendance confirmation:", err);
      showNotification?.("Erro ao atualizar confirmação de presença.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Triage Modal
  const openTriageModal = (booking: ExperimentalClassBooking) => {
    setTriageBooking(booking);
    if (booking.triageStatus === "NAO_COMPARECEU" || booking.attended === false) {
      setTriageAttended(false);
      setTriageOutcome(null);
    } else if (booking.triageStatus) {
      setTriageAttended(true);
      setTriageOutcome(
        booking.triageStatus === "MATRICULADO"
          ? "MATRICULADO"
          : booking.triageStatus === "AGUARDANDO_RESPOSTA"
          ? "AGUARDANDO_RESPOSTA"
          : "NAO_MATRICULOU"
      );
    } else {
      setTriageAttended(null);
      setTriageOutcome(null);
    }
    setTriageNotesInput(booking.triageNotes || "");
  };

  // Submit Post-Booking Triage
  const handleSaveTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triageBooking) return;

    if (triageAttended === null) {
      showNotification?.("Selecione se o aluno compareceu ou não à aula experimental.", "Campo Obrigatório", "error");
      return;
    }

    if (triageAttended === true && !triageOutcome) {
      showNotification?.("Selecione o desfecho da matrícula para o aluno que compareceu.", "Campo Obrigatório", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const finalStatus: ExperimentalTriageStatus = triageAttended ? triageOutcome! : "NAO_COMPARECEU";
      const triagerName = loggedUser?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Usuário do Sistema";
      let triagerRole = "Gestor / Auxiliar";
      if (loggedUser?.role) {
        if (loggedUser.role === "GESTOR" || loggedUser.role === "gestor") triagerRole = "Gestor";
        else if (loggedUser.role === "AUXILIAR" || loggedUser.role === "auxiliar") triagerRole = "Auxiliar Administrativo";
        else triagerRole = loggedUser.role;
      }

      await updateDoc(doc(db, "experimental_classes", triageBooking.id), {
        attended: triageAttended,
        triageStatus: finalStatus,
        triageNotes: triageNotesInput.trim() || null,
        triagedAt: serverTimestamp(),
        triagedByUid: currentUser?.uid || loggedUser?.id || null,
        triagedByName: triagerName,
        triagedByRole: triagerRole,
        updatedAt: serverTimestamp()
      });

      const messageMap: Record<ExperimentalTriageStatus, string> = {
        MATRICULADO: "Triagem concluída: Aluno matriculado com sucesso!",
        AGUARDANDO_RESPOSTA: "Triagem registrada: Aguardando resposta do aluno.",
        NAO_MATRICULOU: "Triagem registrada: Aluno decidiu não se matricular.",
        NAO_COMPARECEU: "Triagem registrada: Falta/Não comparecimento registrado."
      };

      showNotification?.(messageMap[finalStatus] || "Triagem salva com sucesso!", "Sucesso", "success");
      setTriageBooking(null);
    } catch (err) {
      console.error("Error saving triage:", err);
      showNotification?.("Erro ao salvar triagem.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear / Reset Triage back to Pending
  const handleClearTriage = async (bookingId: string) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "experimental_classes", bookingId), {
        attended: null,
        triageStatus: null,
        triageNotes: null,
        triagedAt: null,
        triagedByUid: null,
        triagedByName: null,
        triagedByRole: null,
        updatedAt: serverTimestamp()
      });
      showNotification?.("Triagem redefinida com sucesso. O agendamento voltou para 'A Realizar'.", "Sucesso", "success");
      setTriageBooking(null);
    } catch (err) {
      console.error("Error clearing triage:", err);
      showNotification?.("Erro ao redefinir triagem.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit New Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      showNotification?.("Informe o nome do aluno.", "Campo Obrigatório", "error");
      return;
    }
    if (!course.trim()) {
      showNotification?.("Selecione ou informe um curso.", "Campo Obrigatório", "error");
      return;
    }
    if (!date) {
      showNotification?.("Informe a data da aula.", "Campo Obrigatório", "error");
      return;
    }

    if (status === "AGENDAMENTO_CONFIRMADO" && !manualConfirmationReason.trim()) {
      showNotification?.("Para confirmar o agendamento sem comprovante, é necessário preencher a justificativa por extenso.", "Campo Obrigatório", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const computedDayOfWeek = dayOfWeek || getDayOfWeekInPortuguese(date);
      const creatorName = bookingCreatedByName.trim() || loggedUser?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Usuário do Sistema";
      let creatorRole = bookingCreatedByRole.trim() || "Gestor / Auxiliar";
      if (!bookingCreatedByRole.trim() && loggedUser?.role) {
        if (loggedUser.role === "GESTOR" || loggedUser.role === "gestor") creatorRole = "Gestor";
        else if (loggedUser.role === "AUXILIAR" || loggedUser.role === "auxiliar") creatorRole = "Auxiliar Administrativo";
        else creatorRole = loggedUser.role;
      }

      const newDoc = {
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim() || null,
        studentPhone: studentPhone.trim() || null,
        course: course.trim(),
        classGroup: classGroup.trim() || "Turma A",
        classTime: classTime.trim() || "14:00",
        date: date,
        dayOfWeek: computedDayOfWeek,
        status: status,
        paymentReceiptUrl: null,
        manualConfirmationReason: status === "AGENDAMENTO_CONFIRMADO" ? manualConfirmationReason.trim() : null,
        rescheduleCount: 0,
        rescheduleHistory: [],
        notes: notes.trim() || null,
        createdByUid: bookingCreatedByUid || currentUser?.uid || loggedUser?.id || null,
        createdByName: creatorName,
        createdByRole: creatorRole,
        // Confirmação Prévia de Presença
        attendanceConfirmation: attendanceConfirmation || null,
        attendanceConfirmationUpdatedAt: attendanceConfirmation ? serverTimestamp() : null,
        attendanceConfirmationUpdatedByName: attendanceConfirmation ? creatorName : null,
        // Initial triage is null (scheduled)
        triageStatus: null,
        attended: null,
        triageNotes: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "experimental_classes"), newDoc);
      showNotification?.("Aula experimental agendada com sucesso!", "Sucesso", "success");
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error creating booking:", err);
      showNotification?.("Erro ao criar agendamento.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit / Reschedule
  const handleEditBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    if (!studentName.trim()) {
      showNotification?.("Informe o nome do aluno.", "Campo Obrigatório", "error");
      return;
    }

    const isDateOrTimeChanged = date !== editingBooking.date || classTime !== editingBooking.classTime;

    // Check reschedule limit if date/time changed
    if (isDateOrTimeChanged) {
      if ((editingBooking.rescheduleCount || 0) >= 2) {
        showNotification?.("Limite de reagendamentos atingido para este aluno.", "Aviso", "error");
        return;
      }
      if (!rescheduleReason.trim()) {
        showNotification?.("A 'Justificativa do Reagendamento' é obrigatória quando se altera data ou horário.", "Campo Obrigatório", "error");
        return;
      }
    }

    if (status === "AGENDAMENTO_CONFIRMADO" && !editingBooking.paymentReceiptUrl && !manualConfirmationReason.trim()) {
      showNotification?.("Para confirmar o agendamento sem comprovante, informe a justificativa por extenso.", "Campo Obrigatório", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const computedDayOfWeek = getDayOfWeekInPortuguese(date);
      let updatedRescheduleCount = editingBooking.rescheduleCount || 0;
      let updatedRescheduleHistory = [...(editingBooking.rescheduleHistory || [])];

      if (isDateOrTimeChanged) {
        updatedRescheduleCount += 1;
        updatedRescheduleHistory.push({
          previousDate: editingBooking.date,
          newDate: date,
          previousTime: editingBooking.classTime,
          newTime: classTime,
          reason: rescheduleReason.trim(),
          updatedAt: new Date().toISOString()
        });
      }

      const updateData: any = {
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim() || null,
        studentPhone: studentPhone.trim() || null,
        course: course.trim(),
        classGroup: classGroup.trim(),
        classTime: classTime.trim(),
        date: date,
        dayOfWeek: computedDayOfWeek,
        status: status,
        manualConfirmationReason: status === "AGENDAMENTO_CONFIRMADO" ? (manualConfirmationReason.trim() || editingBooking.manualConfirmationReason || null) : null,
        rescheduleCount: updatedRescheduleCount,
        rescheduleHistory: updatedRescheduleHistory,
        notes: notes.trim() || null,
        createdByUid: bookingCreatedByUid || null,
        createdByName: bookingCreatedByName.trim() || null,
        createdByRole: bookingCreatedByRole.trim() || null,
        attendanceConfirmation: attendanceConfirmation || null,
        attendanceConfirmationUpdatedAt: attendanceConfirmation !== editingBooking.attendanceConfirmation ? serverTimestamp() : (editingBooking.attendanceConfirmationUpdatedAt || null),
        attendanceConfirmationUpdatedByName: attendanceConfirmation !== editingBooking.attendanceConfirmation ? (loggedUser?.name || currentUser?.displayName || "Usuário") : (editingBooking.attendanceConfirmationUpdatedByName || null),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "experimental_classes", editingBooking.id), updateData);
      showNotification?.("Agendamento atualizado com sucesso!", "Sucesso", "success");
      setEditingBooking(null);
      resetForm();
    } catch (err) {
      console.error("Error updating booking:", err);
      showNotification?.("Erro ao atualizar agendamento.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Direct Manual Confirmation Modal
  const handleConfirmManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualConfirmBooking) return;

    if (!manualConfirmReasonInput.trim()) {
      showNotification?.("Por favor, insira a justificativa por extenso.", "Campo Obrigatório", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "experimental_classes", manualConfirmBooking.id), {
        status: "AGENDAMENTO_CONFIRMADO",
        manualConfirmationReason: manualConfirmReasonInput.trim(),
        updatedAt: serverTimestamp()
      });
      showNotification?.("Agendamento confirmado manualmente com sucesso!", "Sucesso", "success");
      setManualConfirmBooking(null);
      setManualConfirmReasonInput("");
    } catch (err) {
      console.error("Error confirming booking manually:", err);
      showNotification?.("Erro ao confirmar agendamento.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload Payment Receipt
  const handleFileUpload = async (booking: ExperimentalClassBooking, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showNotification?.("O arquivo deve ter no máximo 5MB.", "Arquivo muito grande", "error");
      return;
    }

    setUploadingBookingId(booking.id);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Url = reader.result as string;
        await updateDoc(doc(db, "experimental_classes", booking.id), {
          paymentReceiptUrl: base64Url,
          status: "AGENDAMENTO_CONFIRMADO",
          updatedAt: serverTimestamp()
        });
        showNotification?.("Comprovante enviado e agendamento confirmado com sucesso!", "Sucesso", "success");
      } catch (err) {
        console.error("Error uploading receipt:", err);
        showNotification?.("Erro ao salvar comprovante.", "Erro", "error");
      } finally {
        setUploadingBookingId(null);
      }
    };
    reader.onerror = () => {
      setUploadingBookingId(null);
      showNotification?.("Erro ao ler o arquivo.", "Erro", "error");
    };
    reader.readAsDataURL(file);
  };

  // Delete Booking
  const handleDeleteBooking = async () => {
    if (!deletingBooking) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "experimental_classes", deletingBooking.id));
      showNotification?.("Agendamento excluído com sucesso.", "Sucesso", "success");
      setDeletingBooking(null);
    } catch (err) {
      console.error("Error deleting booking:", err);
      showNotification?.("Erro ao excluir agendamento.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Attendance and Revenue Helpers (R$ 25 per attended student)
  const isBookingAttended = (b: ExperimentalClassBooking): boolean => {
    if (b.attended === true) return true;
    if (b.triageStatus && b.triageStatus !== "NAO_COMPARECEU" && b.attended !== false) return true;
    return false;
  };

  const isBookingAbsent = (b: ExperimentalClassBooking): boolean => {
    if (b.triageStatus === "NAO_COMPARECEU" || b.attended === false) return true;
    return false;
  };

  const isBookingPending = (b: ExperimentalClassBooking): boolean => {
    return !b.triageStatus && b.attended === undefined;
  };

  const isBookingCreatedByUser = (
    b: ExperimentalClassBooking,
    uid?: string,
    name?: string,
    email?: string
  ): boolean => {
    if (uid && b.createdByUid && b.createdByUid === uid) return true;
    if (name && b.createdByName && b.createdByName.trim().toLowerCase() === name.trim().toLowerCase()) return true;
    if (email && b.createdByName && b.createdByName.toLowerCase() === email.split("@")[0].toLowerCase()) return true;
    return false;
  };

  // Tab counts
  const totalCount = bookings.length;
  const agendadosCount = bookings.filter(b => !b.triageStatus).length;
  const matriculadosCount = bookings.filter(b => b.triageStatus === "MATRICULADO").length;
  const aguardandoCount = bookings.filter(b => b.triageStatus === "AGUARDANDO_RESPOSTA").length;
  const naoMatriculadosCount = bookings.filter(b => b.triageStatus === "NAO_MATRICULOU").length;
  const naoCompareceuCount = bookings.filter(b => b.triageStatus === "NAO_COMPARECEU" || b.attended === false).length;

  const confirmedCount = bookings.filter(b => b.status === "AGENDAMENTO_CONFIRMADO").length;
  const pendingCount = bookings.filter(b => b.status === "PAGAMENTO_PENDENTE").length;

  // Logged-in User Metrics & Revenue
  const myBookings = useMemo(() => {
    return bookings.filter(b => 
      isBookingCreatedByUser(b, currentUser?.uid || loggedUser?.id, loggedUser?.name, currentUser?.email)
    );
  }, [bookings, currentUser, loggedUser]);

  const myTotalCount = myBookings.length;
  const myAttendedBookings = useMemo(() => myBookings.filter(isBookingAttended), [myBookings]);
  const myAttendedCount = myAttendedBookings.length;
  const myAbsentCount = useMemo(() => myBookings.filter(isBookingAbsent).length, [myBookings]);
  const myPendingCount = useMemo(() => myBookings.filter(isBookingPending).length, [myBookings]);

  // Revenue for user: exactly R$ 25 per ATTENDED student only!
  const myGeneratedRevenue = myAttendedCount * 25;
  const myProjectedRevenue = myPendingCount * 25;

  // Total school metrics
  const totalAttendedCount = useMemo(() => bookings.filter(isBookingAttended).length, [bookings]);
  const totalAbsentCount = useMemo(() => bookings.filter(isBookingAbsent).length, [bookings]);
  const totalPendingAttendanceCount = useMemo(() => bookings.filter(isBookingPending).length, [bookings]);
  const totalGeneratedRevenue = totalAttendedCount * 25;

  // Breakdown per Creator/User
  const creatorRevenueStats = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      role: string;
      total: number;
      attended: number;
      absent: number;
      pending: number;
      revenue: number;
      projected: number;
      isCurrentUser: boolean;
    }>();

    bookings.forEach(b => {
      const isMe = isBookingCreatedByUser(b, currentUser?.uid || loggedUser?.id, loggedUser?.name, currentUser?.email);
      const name = b.createdByName?.trim() || "Não Informado / Sistema";
      const id = b.createdByUid || name.toLowerCase();
      const role = b.createdByRole || (isMe ? loggedUser?.role || "Usuário" : "");

      if (!map.has(id)) {
        map.set(id, {
          id,
          name,
          role,
          total: 0,
          attended: 0,
          absent: 0,
          pending: 0,
          revenue: 0,
          projected: 0,
          isCurrentUser: isMe,
        });
      }

      const item = map.get(id)!;
      item.total += 1;
      if (isBookingAttended(b)) {
        item.attended += 1;
        item.revenue += 25;
      } else if (isBookingAbsent(b)) {
        item.absent += 1;
      } else {
        item.pending += 1;
        item.projected += 25;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.attended - a.attended;
    });
  }, [bookings, currentUser, loggedUser]);

  // List of distinct creators in bookings for the filter dropdown
  const distinctBookingCreators = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; isMe: boolean }>();
    bookings.forEach(b => {
      const isMe = isBookingCreatedByUser(b, currentUser?.uid || loggedUser?.id, loggedUser?.name, currentUser?.email);
      const name = b.createdByName?.trim() || "Não Informado / Sistema";
      const id = b.createdByUid || name;
      if (!map.has(id)) {
        map.set(id, { id, name, count: 0, isMe });
      }
      map.get(id)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings, currentUser, loggedUser]);

  // Available Turmas (Class Groups) for Filter Dropdown
  const availableClassGroups = useMemo(() => {
    const map = new Map<string, { code: string; label: string; count: number }>();
    
    // First, add all registered classes
    classes?.forEach(c => {
      if (c?.code) {
        const label = c.weekday && c.time ? `${c.code} (${c.weekday} ${c.time})` : c.code;
        map.set(c.code, { code: c.code, label, count: 0 });
      }
    });

    // Also include any classGroup appearing in bookings and count occurrences
    bookings.forEach(b => {
      if (b.classGroup) {
        const existing = map.get(b.classGroup);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(b.classGroup, { code: b.classGroup, label: b.classGroup, count: 1 });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [classes, bookings]);

  // Filtered List
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch = 
        (b.studentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.course || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.classGroup || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.triageNotes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.studentPhone || "").includes(searchTerm) ||
        (b.studentEmail || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = 
        statusFilter === "TODOS" || b.status === statusFilter;

      const matchClass = 
        classFilter === "TODOS" || b.classGroup === classFilter;

      let matchTab = true;
      if (tabFilter === "AGENDADOS") {
        matchTab = !b.triageStatus;
      } else if (tabFilter === "MATRICULADO") {
        matchTab = b.triageStatus === "MATRICULADO";
      } else if (tabFilter === "AGUARDANDO_RESPOSTA") {
        matchTab = b.triageStatus === "AGUARDANDO_RESPOSTA";
      } else if (tabFilter === "NAO_MATRICULOU") {
        matchTab = b.triageStatus === "NAO_MATRICULOU";
      } else if (tabFilter === "NAO_COMPARECEU") {
        matchTab = b.triageStatus === "NAO_COMPARECEU" || b.attended === false;
      }

      let matchCreator = true;
      if (creatorFilter === "MEUS") {
        matchCreator = isBookingCreatedByUser(b, currentUser?.uid || loggedUser?.id, loggedUser?.name, currentUser?.email);
      } else if (creatorFilter !== "TODOS") {
        matchCreator = (b.createdByUid && b.createdByUid === creatorFilter) ||
                       (b.createdByName && b.createdByName.trim().toLowerCase() === creatorFilter.trim().toLowerCase());
      }

      let matchAttendance = true;
      if (attendanceFilter === "CONFIRMOU_VESPERA") {
        matchAttendance = b.attendanceConfirmation === "CONFIRMOU_VESPERA";
      } else if (attendanceFilter === "CONFIRMOU_NO_DIA") {
        matchAttendance = b.attendanceConfirmation === "CONFIRMOU_NO_DIA";
      } else if (attendanceFilter === "REAGENDOU") {
        matchAttendance = b.attendanceConfirmation === "REAGENDOU";
      } else if (attendanceFilter === "PENDENTE") {
        matchAttendance = !b.attendanceConfirmation;
      }

      return matchSearch && matchStatus && matchClass && matchTab && matchCreator && matchAttendance;
    });
  }, [bookings, searchTerm, statusFilter, classFilter, tabFilter, creatorFilter, attendanceFilter, currentUser, loggedUser]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-10 space-y-8"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <BackButton onClick={() => setView("dashboard")} />
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-pro-teal h-6 w-6" />
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Aulas Experimentais</h1>
            </div>
            <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
              Agendamentos, controle de presença, acompanhamento de matrículas e receita gerada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRevenueModalOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300/80 rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <DollarSign size={16} className="text-emerald-700" />
            Extrato de Receita (R$ 25)
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-pro-teal hover:bg-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* PAINEL DE RECEITA GERADA (AULAS EXPERIMENTAIS) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-slate-950/20 border border-slate-700/50 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Main User Revenue Block */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                <Coins size={13} className="text-emerald-400" />
                Receita de Aulas Experimentais
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300">
                <Info size={12} className="text-teal-400" />
                R$ 25,00 por aluno que compareceu
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">
                Sua Receita Gerada ({loggedUser?.name || "Você"})
              </span>
              <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  R$ {myGeneratedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {myAttendedCount} {myAttendedCount === 1 ? "aluno compareceu" : "alunos compareceram"} (R$ 25 cada)
                </span>
              </div>
            </div>

            {/* Breakdown Submetrics */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs text-slate-300 font-semibold pt-1">
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
                <Calendar size={13} className="text-teal-300" />
                <span>{myTotalCount} agendados por você</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl">
                <CheckCircle size={13} className="text-emerald-400" />
                <span>{myAttendedCount} presenças (R$ {myGeneratedRevenue},00)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl" title="Aguardando realização da aula e triagem de presença">
                <Clock size={13} className="text-amber-300" />
                <span>{myPendingCount} a realizar (R$ {myProjectedRevenue},00 previstos)</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl" title="Alunos que faltaram não geram receita (R$ 0,00)">
                <UserX size={13} className="text-rose-400" />
                <span>{myAbsentCount} faltas (R$ 0,00)</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Total School Overview */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="text-left sm:text-right lg:text-right">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Total Geral da Escola
              </span>
              <div className="text-xl font-black text-white mt-0.5">
                R$ {totalGeneratedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] font-medium text-slate-300">
                {totalAttendedCount} presenças confirmadas no total
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCreatorFilter(creatorFilter === "MEUS" ? "TODOS" : "MEUS")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  creatorFilter === "MEUS"
                    ? "bg-amber-400 text-slate-900 shadow-md shadow-amber-400/20"
                    : "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                }`}
              >
                <Sparkles size={13} />
                {creatorFilter === "MEUS" ? "Vendo Minhas Aulas" : "Ver Minhas Aulas"}
              </button>

              <button
                type="button"
                onClick={() => setIsRevenueModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pro-teal hover:bg-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-900/40 cursor-pointer"
              >
                <FileSpreadsheet size={14} />
                Demonstrativo por Agendador
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total */}
        <div 
          onClick={() => setTabFilter("TODOS")}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            tabFilter === "TODOS" ? "border-slate-800 ring-2 ring-slate-800/10 shadow-sm" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total</span>
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
              <Calendar size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">{totalCount}</p>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Todos registros</span>
        </div>

        {/* Minha Receita */}
        <div 
          onClick={() => setCreatorFilter(creatorFilter === "MEUS" ? "TODOS" : "MEUS")}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            creatorFilter === "MEUS" ? "border-emerald-600 ring-2 ring-emerald-600/20 shadow-sm bg-emerald-50/20" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Minha Receita</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            R$ {myGeneratedRevenue}
          </p>
          <span className="text-[10px] text-emerald-700/80 font-bold block mt-0.5">
            {myAttendedCount} {myAttendedCount === 1 ? "presença" : "presenças"}
          </span>
        </div>

        {/* A Realizar / Agendados */}
        <div 
          onClick={() => setTabFilter("AGENDADOS")}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            tabFilter === "AGENDADOS" ? "border-amber-500 ring-2 ring-amber-500/10 shadow-sm" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">A Realizar</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{agendadosCount}</p>
          <span className="text-[10px] text-amber-600/80 font-medium block mt-0.5">Sem triagem</span>
        </div>

        {/* Matriculados */}
        <div 
          onClick={() => setTabFilter("MATRICULADO")}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            tabFilter === "MATRICULADO" ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Matriculados</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{matriculadosCount}</p>
          <span className="text-[10px] text-emerald-600/80 font-bold block mt-0.5">
            {totalCount > 0 ? `${Math.round((matriculadosCount / totalCount) * 100)}% de conversão` : "0%"}
          </span>
        </div>

        {/* Aguardando Resposta */}
        <div 
          onClick={() => setTabFilter("AGUARDANDO_RESPOSTA")}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            tabFilter === "AGUARDANDO_RESPOSTA" ? "border-blue-500 ring-2 ring-blue-500/10 shadow-sm" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Em Decisão</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <HelpCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">{aguardandoCount}</p>
          <span className="text-[10px] text-blue-600/80 font-medium block mt-0.5">Aguardando resp.</span>
        </div>

        {/* Não Matriculados */}
        <div 
          onClick={() => setTabFilter("NAO_MATRICULOU")}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            tabFilter === "NAO_MATRICULOU" ? "border-slate-500 ring-2 ring-slate-500/10 shadow-sm" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Não Matr.</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <XCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-700 mt-2">{naoMatriculadosCount}</p>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Optou não matricular</span>
        </div>

        {/* Não Compareceu */}
        <div 
          onClick={() => setTabFilter("NAO_COMPARECEU")}
          className={`cursor-pointer bg-white p-4 rounded-2xl border transition-all hover:shadow-md ${
            tabFilter === "NAO_COMPARECEU" ? "border-rose-500 ring-2 ring-rose-500/10 shadow-sm" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Faltas</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <UserX size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-2">{naoCompareceuCount}</p>
          <span className="text-[10px] text-rose-600/80 font-medium block mt-0.5">Não compareceu</span>
        </div>
      </div>

      {/* SPECIFIC TABS NAV BAR */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {/* Aba Todos */}
          <button
            onClick={() => setTabFilter("TODOS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              tabFilter === "TODOS"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar size={14} />
            <span>Todos</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              tabFilter === "TODOS" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {totalCount}
            </span>
          </button>

          {/* Aba A Realizar / Agendados */}
          <button
            onClick={() => setTabFilter("AGENDADOS")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              tabFilter === "AGENDADOS"
                ? "bg-amber-500 text-white shadow-xs shadow-amber-500/20"
                : "text-slate-600 hover:bg-amber-50/70 hover:text-amber-700"
            }`}
          >
            <Clock size={14} />
            <span>A Realizar</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              tabFilter === "AGENDADOS" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
            }`}>
              {agendadosCount}
            </span>
          </button>

          {/* Aba Matriculados */}
          <button
            onClick={() => setTabFilter("MATRICULADO")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              tabFilter === "MATRICULADO"
                ? "bg-emerald-600 text-white shadow-xs shadow-emerald-600/20"
                : "text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-700"
            }`}
          >
            <UserCheck size={14} />
            <span>Matriculados</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              tabFilter === "MATRICULADO" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
            }`}>
              {matriculadosCount}
            </span>
          </button>

          {/* Aba Aguardando Resposta */}
          <button
            onClick={() => setTabFilter("AGUARDANDO_RESPOSTA")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              tabFilter === "AGUARDANDO_RESPOSTA"
                ? "bg-blue-600 text-white shadow-xs shadow-blue-600/20"
                : "text-slate-600 hover:bg-blue-50/70 hover:text-blue-700"
            }`}
          >
            <HelpCircle size={14} />
            <span>Aguardando Resposta</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              tabFilter === "AGUARDANDO_RESPOSTA" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
            }`}>
              {aguardandoCount}
            </span>
          </button>

          {/* Aba Não Matriculados */}
          <button
            onClick={() => setTabFilter("NAO_MATRICULOU")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              tabFilter === "NAO_MATRICULOU"
                ? "bg-slate-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            <XCircle size={14} />
            <span>Não Matriculados</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              tabFilter === "NAO_MATRICULOU" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {naoMatriculadosCount}
            </span>
          </button>

          {/* Aba Não Compareceu */}
          <button
            onClick={() => setTabFilter("NAO_COMPARECEU")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              tabFilter === "NAO_COMPARECEU"
                ? "bg-rose-600 text-white shadow-xs shadow-rose-600/20"
                : "text-slate-600 hover:bg-rose-50/70 hover:text-rose-700"
            }`}
          >
            <UserX size={14} />
            <span>Não Compareceu</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              tabFilter === "NAO_COMPARECEU" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
            }`}>
              {naoCompareceuCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por aluno, curso, turma ou agendador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-pro-teal"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Agendador / Responsável Filter Dropdown */}
          <div className="flex items-center gap-2 min-w-[200px]">
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none flex items-center gap-1">
                <User size={14} />
              </div>
              <select
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none transition-all cursor-pointer border focus:outline-none focus:border-pro-teal ${
                  creatorFilter !== "TODOS"
                    ? "bg-amber-50 border-amber-300 text-amber-950 font-black shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <option value="TODOS">Todos os Agendadores ({bookings.length})</option>
                <option value="MEUS">⭐ Meus Agendamentos ({myTotalCount})</option>
                {distinctBookingCreators
                  .filter(c => !c.isMe)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.count})
                    </option>
                  ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter size={12} />
              </div>
            </div>
            {creatorFilter !== "TODOS" && (
              <button
                type="button"
                onClick={() => setCreatorFilter("TODOS")}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
                title="Limpar filtro de agendador"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Turma (Class) Filter Dropdown */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pro-teal pointer-events-none flex items-center gap-1">
                <Users size={14} />
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none transition-all cursor-pointer border focus:outline-none focus:border-pro-teal ${
                  classFilter !== "TODOS"
                    ? "bg-teal-50 border-teal-300 text-teal-900 font-black shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <option value="TODOS">Todas as Turmas ({bookings.length})</option>
                {availableClassGroups.map((cg) => (
                  <option key={cg.code} value={cg.code}>
                    {cg.label} {cg.count > 0 ? `(${cg.count})` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter size={12} />
              </div>
            </div>
            {classFilter !== "TODOS" && (
              <button
                type="button"
                onClick={() => setClassFilter("TODOS")}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
                title="Limpar filtro de turma"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Attendance Confirmation Filter Dropdown */}
          <div className="flex items-center gap-2 min-w-[190px]">
            <div className="relative w-full">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 pointer-events-none flex items-center gap-1">
                <CalendarCheck size={14} />
              </div>
              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value as any)}
                className={`w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-bold appearance-none transition-all cursor-pointer border focus:outline-none focus:border-indigo-500 ${
                  attendanceFilter !== "TODOS"
                    ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-black shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <option value="TODOS">Confirmação Prévia (Todas)</option>
                <option value="CONFIRMOU_VESPERA">🕒 Confirmou na Véspera</option>
                <option value="CONFIRMOU_NO_DIA">✅ Confirmou no Dia</option>
                <option value="REAGENDOU">🔄 Reagendou</option>
                <option value="PENDENTE">⏳ Sem Confirmação / Pendente</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter size={12} />
              </div>
            </div>
            {attendanceFilter !== "TODOS" && (
              <button
                type="button"
                onClick={() => setAttendanceFilter("TODOS")}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
                title="Limpar filtro de confirmação"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Payment Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider whitespace-nowrap mr-1">
              Pgto:
            </span>
            {(["TODOS", "PAGAMENTO_PENDENTE", "AGENDAMENTO_CONFIRMADO"] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === f
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "TODOS" ? "Todos" : f === "PAGAMENTO_PENDENTE" ? "Pendentes" : "Confirmados"}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Summary Chips */}
        {(searchTerm || classFilter !== "TODOS" || attendanceFilter !== "TODOS" || statusFilter !== "TODOS" || tabFilter !== "TODOS" || creatorFilter !== "TODOS") && (
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Filtros Ativos ({filteredBookings.length} encontrados):
              </span>
              {creatorFilter !== "TODOS" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-950 rounded-lg text-[11px] font-bold border border-amber-200">
                  <User size={12} className="text-amber-800" /> Agendador: {creatorFilter === "MEUS" ? "Meus Agendamentos" : (distinctBookingCreators.find(c => c.id === creatorFilter)?.name || creatorFilter)}
                  <button type="button" onClick={() => setCreatorFilter("TODOS")} className="hover:text-amber-950 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              {classFilter !== "TODOS" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg text-[11px] font-bold border border-teal-200">
                  <Users size={12} /> Turma: {classFilter}
                  <button type="button" onClick={() => setClassFilter("TODOS")} className="hover:text-teal-950 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              {attendanceFilter !== "TODOS" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-900 rounded-lg text-[11px] font-bold border border-indigo-200">
                  <CalendarCheck size={12} className="text-indigo-700" /> Confirmação: {
                    attendanceFilter === "CONFIRMOU_VESPERA" ? "Confirmou na Véspera" :
                    attendanceFilter === "CONFIRMOU_NO_DIA" ? "Confirmou no Dia" :
                    attendanceFilter === "REAGENDOU" ? "Reagendou" : "Pendente"
                  }
                  <button type="button" onClick={() => setAttendanceFilter("TODOS")} className="hover:text-indigo-950 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter !== "TODOS" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold">
                  Pgto: {statusFilter === "PAGAMENTO_PENDENTE" ? "Pendentes" : "Confirmados"}
                  <button type="button" onClick={() => setStatusFilter("TODOS")} className="hover:text-slate-950 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              {tabFilter !== "TODOS" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold border border-amber-200">
                  Aba: {
                    tabFilter === "AGENDADOS" ? "A Realizar" :
                    tabFilter === "MATRICULADO" ? "Matriculados" :
                    tabFilter === "AGUARDANDO_RESPOSTA" ? "Em Decisão" :
                    tabFilter === "NAO_MATRICULOU" ? "Não Matriculou" : "Não Compareceu"
                  }
                  <button type="button" onClick={() => setTabFilter("TODOS")} className="hover:text-amber-950 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200">
                  Busca: "{searchTerm}"
                  <button type="button" onClick={() => setSearchTerm("")} className="hover:text-slate-950 ml-0.5">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setClassFilter("TODOS");
                setAttendanceFilter("TODOS");
                setStatusFilter("TODOS");
                setTabFilter("TODOS");
                setCreatorFilter("TODOS");
              }}
              className="text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-700 hover:underline shrink-0 ml-auto cursor-pointer"
            >
              Limpar Todos os Filtros
            </button>
          </div>
        )}
      </div>

      {/* Main Table / List */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-100">
          <div className="w-8 h-8 border-4 border-pro-teal border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-400">Carregando aulas experimentais...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-2xl border border-slate-100 space-y-3">
          <Calendar className="mx-auto text-slate-300 h-12 w-12" />
          <p className="text-base font-black text-slate-700">Nenhum agendamento encontrado</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "TODOS" || classFilter !== "TODOS" || tabFilter !== "TODOS"
              ? "Nenhum agendamento corresponde aos filtros selecionados." 
              : "Clique em 'Novo Agendamento' para registrar uma aula experimental."}
          </p>
          {(searchTerm || statusFilter !== "TODOS" || classFilter !== "TODOS" || tabFilter !== "TODOS") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setClassFilter("TODOS");
                setStatusFilter("TODOS");
                setTabFilter("TODOS");
              }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-all"
            >
              Limpar Filtros e Ver Todos
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-4 px-6">Aluno</th>
                  <th className="py-4 px-6">Curso</th>
                  <th className="py-4 px-6">Turma & Horário</th>
                  <th className="py-4 px-6">Data & Dia</th>
                  <th className="py-4 px-6">Confirmação Prévia</th>
                  <th className="py-4 px-6">Pagamento</th>
                  <th className="py-4 px-6">Triagem Pós-Aula</th>
                  <th className="py-4 px-6 text-center">Receita (R$ 25)</th>
                  <th className="py-4 px-6 text-center">Comprovante</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Aluno */}
                    <td className="py-4 px-6">
                      <div className="font-black text-slate-800 text-sm">{b.studentName}</div>
                      {(b.studentPhone || b.studentEmail) && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mt-0.5">
                          {b.studentPhone && <span className="flex items-center gap-1"><Phone size={10} />{b.studentPhone}</span>}
                          {b.studentEmail && <span className="flex items-center gap-1"><Mail size={10} />{b.studentEmail}</span>}
                        </div>
                      )}
                      {b.createdByName ? (
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-1 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80 w-fit transition-colors">
                          <User size={11} className="text-[#016a86] shrink-0" />
                          <span>
                            Agendado por <strong className="text-slate-700 font-bold">{b.createdByName}</strong>
                            {b.createdByRole ? ` (${b.createdByRole})` : ""}
                            {formatCreationTimestamp(b.createdAt) && ` em ${formatCreationTimestamp(b.createdAt)}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => openAdjustCreatorModal(b)}
                            className="p-0.5 text-slate-400 hover:text-[#016a86] hover:bg-white rounded transition-colors cursor-pointer ml-0.5"
                            title="Ajustar manualmente quem fez o agendamento"
                          >
                            <Pencil size={10} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAdjustCreatorModal(b)}
                          className="text-[10px] text-[#016a86] hover:text-teal-800 font-bold flex items-center gap-1 mt-1 bg-teal-50/70 hover:bg-teal-100/70 px-2 py-0.5 rounded-md border border-dashed border-teal-300 w-fit transition-colors cursor-pointer"
                          title="Definir quem agendou esta aula experimental"
                        >
                          <User size={10} className="text-[#016a86]" />
                          <span>+ Definir quem agendou</span>
                        </button>
                      )}
                      {(b.rescheduleCount || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <History size={10} /> {b.rescheduleCount} reagendamento(s)
                        </span>
                      )}
                    </td>

                    {/* Curso */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700">
                        <GraduationCap size={14} className="text-pro-teal shrink-0" />
                        {b.course}
                      </div>
                    </td>

                    {/* Turma e Horário */}
                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => setClassFilter(b.classGroup === classFilter ? "TODOS" : b.classGroup)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold text-left transition-all ${
                          classFilter === b.classGroup
                            ? "bg-teal-100 text-teal-900 ring-1 ring-teal-400"
                            : "hover:bg-slate-100 text-slate-800"
                        }`}
                        title={classFilter === b.classGroup ? "Filtro ativo (clique para limpar)" : `Filtrar por turma: ${b.classGroup}`}
                      >
                        <Presentation size={14} className="text-pro-orange shrink-0" />
                        <span>{b.classGroup}</span>
                      </button>
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5 px-2">
                        <Clock size={10} /> {b.classTime}
                      </div>
                    </td>

                    {/* Data e Dia da Semana */}
                    <td className="py-4 px-6">
                      <div className="font-black text-slate-800">{formatDateBR(b.date)}</div>
                      <div className="text-[11px] font-semibold text-teal-600">{b.dayOfWeek}</div>
                    </td>

                    {/* Confirmação Prévia */}
                    <td className="py-4 px-6">
                      {b.attendanceConfirmation === "CONFIRMOU_VESPERA" ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setAttendanceModalBooking(b)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs cursor-pointer text-left"
                            title="Clique para alterar confirmação"
                          >
                            <CalendarCheck size={12} className="text-indigo-600 shrink-0" />
                            <span>Confirmou na véspera</span>
                          </button>
                          {b.attendanceConfirmationUpdatedByName && (
                            <span className="block text-[9px] text-slate-400 font-medium truncate max-w-[150px]">
                              por {b.attendanceConfirmationUpdatedByName}
                            </span>
                          )}
                        </div>
                      ) : b.attendanceConfirmation === "CONFIRMOU_NO_DIA" ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setAttendanceModalBooking(b)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer text-left"
                            title="Clique para alterar confirmação"
                          >
                            <CheckCircle size={12} className="text-emerald-600 shrink-0" />
                            <span>Confirmou no dia</span>
                          </button>
                          {b.attendanceConfirmationUpdatedByName && (
                            <span className="block text-[9px] text-slate-400 font-medium truncate max-w-[150px]">
                              por {b.attendanceConfirmationUpdatedByName}
                            </span>
                          )}
                        </div>
                      ) : b.attendanceConfirmation === "REAGENDOU" ? (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setAttendanceModalBooking(b)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer text-left"
                            title="Clique para alterar confirmação"
                          >
                            <History size={12} className="text-amber-600 shrink-0" />
                            <span>Reagendou</span>
                          </button>
                          {b.attendanceConfirmationUpdatedByName && (
                            <span className="block text-[9px] text-slate-400 font-medium truncate max-w-[150px]">
                              por {b.attendanceConfirmationUpdatedByName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAttendanceModalBooking(b)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50/70 rounded-lg border border-dashed border-slate-300 hover:border-indigo-300 transition-colors cursor-pointer"
                          title="Inserir identificador de confirmação prévia"
                        >
                          <CalendarCheck size={11} className="text-slate-400" />
                          <span>+ Confirmar</span>
                        </button>
                      )}
                    </td>

                    {/* Status de Pagamento */}
                    <td className="py-4 px-6">
                      {b.status === "AGENDAMENTO_CONFIRMADO" ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                            <CheckCircle2 size={12} /> Confirmado
                          </span>
                          {b.manualConfirmationReason && (
                            <p className="text-[10px] text-slate-500 font-medium italic max-w-xs truncate" title={b.manualConfirmationReason}>
                              Justificativa: "{b.manualConfirmationReason}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} /> Pendente
                        </span>
                      )}
                    </td>

                    {/* Triagem Pós-Aula */}
                    <td className="py-4 px-6">
                      {b.triageStatus === "MATRICULADO" ? (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                            <UserCheck size={13} className="text-emerald-600" /> Compareceu e Matriculou
                          </span>
                          {b.triageNotes && (
                            <p className="text-[10px] text-slate-600 italic line-clamp-1 max-w-[200px]" title={b.triageNotes}>
                              "{b.triageNotes}"
                            </p>
                          )}
                          <button
                            onClick={() => openTriageModal(b)}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline block"
                          >
                            Alterar Triagem
                          </button>
                        </div>
                      ) : b.triageStatus === "AGUARDANDO_RESPOSTA" ? (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-300 shadow-xs">
                            <HelpCircle size={13} className="text-blue-600" /> Compareceu (Aguardando)
                          </span>
                          {b.triageNotes && (
                            <p className="text-[10px] text-slate-600 italic line-clamp-1 max-w-[200px]" title={b.triageNotes}>
                              "{b.triageNotes}"
                            </p>
                          )}
                          <button
                            onClick={() => openTriageModal(b)}
                            className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline block"
                          >
                            Definir Resposta / Matrícula
                          </button>
                        </div>
                      ) : b.triageStatus === "NAO_MATRICULOU" ? (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                            <XCircle size={13} className="text-slate-500" /> Decidiu Não Matricular
                          </span>
                          {b.triageNotes && (
                            <p className="text-[10px] text-slate-500 italic line-clamp-1 max-w-[200px]" title={b.triageNotes}>
                              "{b.triageNotes}"
                            </p>
                          )}
                          <button
                            onClick={() => openTriageModal(b)}
                            className="text-[10px] font-bold text-slate-600 hover:text-slate-800 underline block"
                          >
                            Editar Triagem
                          </button>
                        </div>
                      ) : b.triageStatus === "NAO_COMPARECEU" || b.attended === false ? (
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300">
                            <UserX size={13} className="text-rose-600" /> Não Compareceu (Falta)
                          </span>
                          {b.triageNotes && (
                            <p className="text-[10px] text-slate-500 italic line-clamp-1 max-w-[200px]" title={b.triageNotes}>
                              "{b.triageNotes}"
                            </p>
                          )}
                          <button
                            onClick={() => openTriageModal(b)}
                            className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline block"
                          >
                            Editar Triagem
                          </button>
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={() => openTriageModal(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-pro-teal/10 hover:bg-pro-teal hover:text-white text-pro-teal rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-pro-teal/20"
                            title="Fazer triagem pós-aula: verificar comparecimento e matrícula"
                          >
                            <ClipboardCheck size={13} />
                            Fazer Triagem
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Receita do Agendamento (R$ 25) */}
                    <td className="py-4 px-6 text-center">
                      {isBookingAttended(b) ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                            <DollarSign size={13} className="text-emerald-600" />
                            R$ 25,00
                          </span>
                          <span className="text-[9px] text-emerald-700 font-black block mt-0.5">
                            Presença confirmada
                          </span>
                        </div>
                      ) : isBookingAbsent(b) ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            R$ 0,00
                          </span>
                          <span className="text-[9px] text-rose-500 font-medium block mt-0.5">
                            Falta (sem receita)
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock size={11} className="text-slate-400" />
                            R$ 25,00
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                            Previsto (pendente)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Comprovante / Confirmação Manual */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {b.paymentReceiptUrl ? (
                          <button
                            onClick={() => setReceiptViewingBooking(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase transition-all"
                            title="Visualizar Comprovante"
                          >
                            <FileText size={12} className="text-pro-teal" /> Ver Anexo
                          </button>
                        ) : b.status === "PAGAMENTO_PENDENTE" ? (
                          <div className="flex items-center gap-1.5">
                            <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase transition-all border border-amber-200">
                              {uploadingBookingId === b.id ? (
                                <span className="animate-spin w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full"></span>
                              ) : (
                                <Upload size={12} />
                              )}
                              Comprovante
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => handleFileUpload(b, e)}
                                className="hidden"
                              />
                            </label>

                            <button
                              onClick={() => {
                                setManualConfirmBooking(b);
                                setManualConfirmReasonInput("");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-[10px] font-black uppercase transition-all border border-teal-200"
                              title="Confirmar manualmente com justificativa por extenso"
                            >
                              <CheckCircle size={12} className="text-teal-600" /> Manual
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Confirmado
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Triage Shortcut button */}
                        <button
                          onClick={() => openTriageModal(b)}
                          className="p-2 bg-slate-50 hover:bg-teal-50 text-pro-teal rounded-xl transition-all"
                          title="Triagem Pós-Aula / Matrícula"
                        >
                          <ClipboardCheck size={14} />
                        </button>

                        {/* File Upload Shortcut */}
                        <label
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all cursor-pointer"
                          title="Enviar / Alterar Comprovante"
                        >
                          <Upload size={14} />
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileUpload(b, e)}
                            className="hidden"
                          />
                        </label>

                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(b)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all"
                          title="Editar / Reagendar"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeletingBooking(b)}
                          className="p-2 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-xl transition-all"
                          title="Excluir Agendamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredBookings.map((b) => (
              <div key={b.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-slate-800 text-base">{b.studentName}</p>
                    <p className="text-xs font-bold text-pro-teal flex items-center gap-1 mt-0.5">
                      <GraduationCap size={12} /> {b.course}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {b.status === "AGENDAMENTO_CONFIRMADO" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-50 text-teal-700 border border-teal-200">
                        Confirmado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        Pgto Pendente
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl text-slate-600 font-bold">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black mb-0.5">Turma & Horário</span>
                    <button
                      type="button"
                      onClick={() => setClassFilter(b.classGroup === classFilter ? "TODOS" : b.classGroup)}
                      className={`text-xs font-bold text-left transition-all ${
                        classFilter === b.classGroup ? "text-pro-teal underline" : "text-slate-700 hover:text-pro-teal"
                      }`}
                      title={classFilter === b.classGroup ? "Filtro ativo (clique para limpar)" : `Filtrar por turma: ${b.classGroup}`}
                    >
                      {b.classGroup}
                    </button>
                    <span className="text-slate-400 font-normal ml-1">({b.classTime})</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black mb-0.5">Data & Dia</span>
                    {formatDateBR(b.date)} ({b.dayOfWeek})
                  </div>
                </div>

                {/* CONFIRMAÇÃO PRÉVIA NO MOBILE */}
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-1">
                      <CalendarCheck size={12} className="text-indigo-600" /> Confirmação Prévia
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttendanceModalBooking(b)}
                      className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil size={11} /> {b.attendanceConfirmation ? "Alterar" : "Definir"}
                    </button>
                  </div>

                  <div>
                    {b.attendanceConfirmation === "CONFIRMOU_VESPERA" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-900 border border-indigo-200">
                        <CalendarCheck size={12} className="text-indigo-700" /> Confirmou na Véspera
                      </span>
                    ) : b.attendanceConfirmation === "CONFIRMOU_NO_DIA" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 border border-emerald-200">
                        <CheckCircle size={12} className="text-emerald-700" /> Confirmou no Dia
                      </span>
                    ) : b.attendanceConfirmation === "REAGENDOU" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-200">
                        <History size={12} className="text-amber-700" /> Reagendou
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">
                        Pendente de confirmação prévia
                      </span>
                    )}
                    {b.attendanceConfirmationUpdatedByName && (
                      <p className="text-[10px] text-indigo-600/80 font-medium mt-1">
                        Atualizado por {b.attendanceConfirmationUpdatedByName}
                      </p>
                    )}
                  </div>
                </div>

                {/* RECEITA STATUS NO MOBILE */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100 text-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                    <DollarSign size={12} className="text-emerald-600" />
                    Receita do Agendamento:
                  </span>
                  {isBookingAttended(b) ? (
                    <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] shadow-2xs">
                      + R$ 25,00 (Compareceu)
                    </span>
                  ) : isBookingAbsent(b) ? (
                    <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 text-[11px]">
                      R$ 0,00 (Falta)
                    </span>
                  ) : (
                    <span className="font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                      R$ 25,00 previstos
                    </span>
                  )}
                </div>

                {/* TRIAGE STATUS ON MOBILE */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Triagem Pós-Aula</span>
                    <button
                      onClick={() => openTriageModal(b)}
                      className="text-[10px] font-black text-pro-teal flex items-center gap-1"
                    >
                      <ClipboardCheck size={12} /> {b.triageStatus ? "Alterar" : "Fazer Triagem"}
                    </button>
                  </div>

                  <div>
                    {b.triageStatus === "MATRICULADO" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                        <UserCheck size={12} /> Compareceu e Matriculou
                      </span>
                    ) : b.triageStatus === "AGUARDANDO_RESPOSTA" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                        <HelpCircle size={12} /> Compareceu (Aguardando Resposta)
                      </span>
                    ) : b.triageStatus === "NAO_MATRICULOU" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-700">
                        <XCircle size={12} /> Decidiu Não se Matricular
                      </span>
                    ) : b.triageStatus === "NAO_COMPARECEU" || b.attended === false ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800">
                        <UserX size={12} /> Não Compareceu (Falta)
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium italic">
                        Agendamento a realizar (triagem pendente)
                      </span>
                    )}
                  </div>

                  {b.triageNotes && (
                    <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">
                      "{b.triageNotes}"
                    </p>
                  )}
                </div>

                {b.createdByName ? (
                  <div className="text-[10px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 p-2 rounded-lg border border-slate-200/80 flex items-center justify-between gap-1 transition-colors">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={12} className="text-[#016a86] shrink-0" />
                      <span className="truncate">
                        Agendado por <strong className="text-slate-700 font-bold">{b.createdByName}</strong>
                        {b.createdByRole ? ` (${b.createdByRole})` : ""}
                        {formatCreationTimestamp(b.createdAt) && ` em ${formatCreationTimestamp(b.createdAt)}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAdjustCreatorModal(b)}
                      className="p-1 text-slate-400 hover:text-[#016a86] hover:bg-white rounded transition-colors cursor-pointer shrink-0"
                      title="Ajustar manualmente quem fez o agendamento"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAdjustCreatorModal(b)}
                    className="w-full text-[10px] text-[#016a86] hover:text-teal-800 font-bold flex items-center justify-center gap-1.5 p-2 bg-teal-50/70 hover:bg-teal-100/70 rounded-lg border border-dashed border-teal-300 transition-colors cursor-pointer"
                    title="Definir quem agendou esta aula experimental"
                  >
                    <User size={12} className="text-[#016a86]" />
                    <span>+ Definir quem fez o agendamento</span>
                  </button>
                )}

                {b.manualConfirmationReason && (
                  <div className="text-[10px] font-medium text-slate-600 bg-teal-50/60 p-2 rounded-lg border border-teal-100 italic">
                    <span className="font-black not-italic text-teal-800">Justificativa manual:</span> "{b.manualConfirmationReason}"
                  </div>
                )}

                {(b.rescheduleCount || 0) > 0 && (
                  <div className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1">
                    <History size={12} /> {b.rescheduleCount} reagendamento(s) realizado(s)
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                  {b.paymentReceiptUrl ? (
                    <button
                      onClick={() => setReceiptViewingBooking(b)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <FileText size={12} /> Ver Comprovante
                    </button>
                  ) : b.status === "PAGAMENTO_PENDENTE" ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <label className="cursor-pointer px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 border border-amber-200">
                        <Upload size={12} /> Comprovante
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileUpload(b, e)}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={() => {
                          setManualConfirmBooking(b);
                          setManualConfirmReasonInput("");
                        }}
                        className="px-2.5 py-1.5 bg-teal-50 text-teal-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 border border-teal-200"
                      >
                        <CheckCircle size={12} /> Manual
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => openTriageModal(b)}
                      className="p-2 bg-teal-50 text-pro-teal rounded-lg font-bold"
                      title="Triagem"
                    >
                      <ClipboardCheck size={14} />
                    </button>
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-2 bg-slate-100 text-slate-700 rounded-lg font-bold"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingBooking(b)}
                      className="p-2 bg-rose-50 text-rose-600 rounded-lg font-bold"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ATTENDANCE PRE-CONFIRMATION MODAL */}
      <AnimatePresence>
        {attendanceModalBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative space-y-5"
            >
              <button
                onClick={() => setAttendanceModalBooking(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Confirmação Prévia de Presença</h3>
                  <p className="text-xs font-bold text-slate-500">
                    Aluno(a): <strong className="text-slate-800">{attendanceModalBooking.studentName}</strong> • {attendanceModalBooking.course}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Data da Aula: {formatDateBR(attendanceModalBooking.date)} ({attendanceModalBooking.dayOfWeek}) às {attendanceModalBooking.classTime}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Selecione abaixo o status de confirmação prévia deste aluno para a aula experimental agendada:
              </p>

              <div className="space-y-2.5">
                {/* Opção 1: Confirmou na Véspera */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveAttendanceConfirmation(attendanceModalBooking.id, "CONFIRMOU_VESPERA")}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                    attendanceModalBooking.attendanceConfirmation === "CONFIRMOU_VESPERA"
                      ? "bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-400/20 text-indigo-950"
                      : "bg-slate-50/70 hover:bg-indigo-50/40 border-slate-200 text-slate-700 hover:border-indigo-300"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    attendanceModalBooking.attendanceConfirmation === "CONFIRMOU_VESPERA"
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-100 text-indigo-700"
                  }`}>
                    <CalendarCheck size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                        Confirmou na Véspera
                      </h4>
                      {attendanceModalBooking.attendanceConfirmation === "CONFIRMOU_VESPERA" && (
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                          Atual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-normal">
                      O aluno confirmou no dia anterior que estará presente na aula no dia seguinte.
                    </p>
                  </div>
                </button>

                {/* Opção 2: Confirmou Presença no Dia */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveAttendanceConfirmation(attendanceModalBooking.id, "CONFIRMOU_NO_DIA")}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                    attendanceModalBooking.attendanceConfirmation === "CONFIRMOU_NO_DIA"
                      ? "bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/20 text-emerald-950"
                      : "bg-slate-50/70 hover:bg-emerald-50/40 border-slate-200 text-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    attendanceModalBooking.attendanceConfirmation === "CONFIRMOU_NO_DIA"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    <CheckCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                        Confirmou Presença no Dia
                      </h4>
                      {attendanceModalBooking.attendanceConfirmation === "CONFIRMOU_NO_DIA" && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Atual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-normal">
                      O aluno confirmou que comparecerá no próprio dia da aula experimental.
                    </p>
                  </div>
                </button>

                {/* Opção 3: Reagendou */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveAttendanceConfirmation(attendanceModalBooking.id, "REAGENDOU")}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                    attendanceModalBooking.attendanceConfirmation === "REAGENDOU"
                      ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/20 text-amber-950"
                      : "bg-slate-50/70 hover:bg-amber-50/40 border-slate-200 text-slate-700 hover:border-amber-300"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    attendanceModalBooking.attendanceConfirmation === "REAGENDOU"
                      ? "bg-amber-600 text-white"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    <History size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                        Reagendou
                      </h4>
                      {attendanceModalBooking.attendanceConfirmation === "REAGENDOU" && (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          Atual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 leading-normal">
                      O aluno solicitou remarcação / reagendamento para outra data ou horário.
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {attendanceModalBooking.attendanceConfirmation ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveAttendanceConfirmation(attendanceModalBooking.id, null)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Limpar Confirmação (Deixar Pendente)
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 italic">Nenhum status definido</span>
                )}

                <button
                  type="button"
                  onClick={() => setAttendanceModalBooking(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANUAL CONFIRMATION MODAL */}
      <AnimatePresence>
        {manualConfirmBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative space-y-4"
            >
              <button
                onClick={() => {
                  setManualConfirmBooking(null);
                  setManualConfirmReasonInput("");
                }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-pro-teal rounded-2xl">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Confirmação Manual do Agendamento</h3>
                  <p className="text-xs font-bold text-slate-400">
                    Aluno(a): {manualConfirmBooking.studentName} ({manualConfirmBooking.course})
                  </p>
                </div>
              </div>

              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl text-xs text-slate-600 space-y-1">
                <p className="font-bold text-teal-900">Confirmação sem comprovante de pagamento</p>
                <p>
                  Para confirmar a aula experimental sem a necessidade de upload de comprovante, insira uma justificativa detalhada por extenso abaixo.
                </p>
              </div>

              <form onSubmit={handleConfirmManualSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                    Justificativa por Extenso *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Ex: Pagamento realizado em dinheiro presencialmente na secretaria com autorização da gestão..."
                    value={manualConfirmReasonInput}
                    onChange={(e) => setManualConfirmReasonInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualConfirmBooking(null);
                      setManualConfirmReasonInput("");
                    }}
                    className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-pro-teal hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Confirmar Agendamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE & EDIT MODAL */}
      <AnimatePresence>
        {(isCreateModalOpen || editingBooking) && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 relative my-8"
            >
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingBooking(null);
                  resetForm();
                }}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-teal-50 text-pro-teal rounded-2xl">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {editingBooking ? "Editar / Reagendar Aula Experimental" : "Novo Agendamento Experimental"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    {editingBooking ? "Atualize as informações ou registre um reagendamento" : "Preencha os dados do novo aluno interessado"}
                  </p>
                </div>
              </div>

              {/* WARNING IF RESCHEDULE LIMIT REACHED */}
              {editingBooking && (editingBooking.rescheduleCount || 0) >= 2 && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
                  <AlertTriangle className="shrink-0 text-rose-600 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Limite de reagendamentos atingido</p>
                    <p className="text-xs font-medium mt-0.5">
                      Limite de reagendamentos atingido para este aluno. A alteração de data e horário está bloqueada.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={editingBooking ? handleEditBooking : handleCreateBooking} className="space-y-4">
                {/* Nome do Aluno */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Nome do Aluno *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  />
                </div>

                {/* Telefone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={studentPhone}
                      onChange={(e) => setStudentPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      placeholder="aluno@email.com"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                    />
                  </div>
                </div>

                {/* Curso & Turma */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Curso *
                    </label>
                    {courses.length > 0 ? (
                      <select
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Ex: Curso Livre Adultos"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Turma
                    </label>
                    {classes.length > 0 ? (
                      <select
                        value={classGroup}
                        onChange={(e) => setClassGroup(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                      >
                        {classes.map(c => (
                          <option key={c.id} value={c.code}>{c.code} ({c.weekday} {c.time})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Ex: Turma A"
                        value={classGroup}
                        onChange={(e) => setClassGroup(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                      />
                    )}
                  </div>
                </div>

                {/* Data, Horário e Dia da Semana */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Data *
                    </label>
                    <input
                      type="date"
                      required
                      disabled={!!(editingBooking && (editingBooking.rescheduleCount || 0) >= 2)}
                      value={date}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Horário *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!(editingBooking && (editingBooking.rescheduleCount || 0) >= 2)}
                      placeholder="14:00"
                      value={classTime}
                      onChange={(e) => setClassTime(e.target.value)}
                      className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Dia da Semana
                    </label>
                    <input
                      type="text"
                      disabled
                      value={dayOfWeek}
                      className="w-full px-3 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-teal-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* JUSTIFICATIVA DO REAGENDAMENTO (MANDATORY WHEN RESCHEDULING) */}
                {editingBooking && (date !== editingBooking.date || classTime !== editingBooking.classTime) && (editingBooking.rescheduleCount || 0) < 2 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-800 block">
                      Justificativa do Reagendamento *
                    </label>
                    <p className="text-[11px] text-amber-700">
                      Você alterou a data ou horário. Informe o motivo do reagendamento.
                    </p>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ex: Pedido do aluno por motivo de trabalho..."
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </motion.div>
                )}

                {/* Status */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Status do Agendamento
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  >
                    <option value="PAGAMENTO_PENDENTE">Pagamento Pendente</option>
                    <option value="AGENDAMENTO_CONFIRMADO">Agendamento Confirmado</option>
                  </select>
                </div>

                {/* Justificativa de Confirmação Manual se Status for Confirmado sem Comprovante */}
                {status === "AGENDAMENTO_CONFIRMADO" && !editingBooking?.paymentReceiptUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase tracking-widest text-teal-900 block">
                      Justificativa da Confirmação Manual *
                    </label>
                    <p className="text-[11px] text-teal-700">
                      Como o agendamento está sendo confirmado sem o upload de comprovante, insira a justificativa por extenso.
                    </p>
                    <textarea
                      required
                      rows={2}
                      placeholder="Ex: Pagamento efetuado em dinheiro presencialmente na recepção..."
                      value={manualConfirmationReason}
                      onChange={(e) => setManualConfirmationReason(e.target.value)}
                      className="w-full p-3 bg-white border border-teal-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </motion.div>
                )}

                {/* Responsável pelo Agendamento */}
                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#016a86] flex items-center gap-1.5">
                      <User size={13} /> Responsável pelo Agendamento *
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">Colaborador cadastrado</span>
                  </div>

                  <div>
                    <select
                      required
                      value={
                        availableCreators.some(u => u.id === bookingCreatedByUid || (u.name && u.name.toLowerCase() === bookingCreatedByName.toLowerCase()))
                          ? (availableCreators.find(u => u.id === bookingCreatedByUid || u.name.toLowerCase() === bookingCreatedByName.toLowerCase())?.id || "")
                          : ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        const selected = availableCreators.find(u => u.id === val);
                        if (selected) {
                          setBookingCreatedByUid(selected.id);
                          setBookingCreatedByName(selected.name);
                          setBookingCreatedByRole(selected.role || "Gestor");
                        } else {
                          setBookingCreatedByUid("");
                          setBookingCreatedByName("");
                          setBookingCreatedByRole("");
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#016a86] cursor-pointer"
                    >
                      <option value="">-- Selecione o colaborador responsável --</option>
                      {availableCreators.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.role || "Colaborador"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const selected = availableCreators.find(u => u.id === bookingCreatedByUid) ||
                      (bookingCreatedByName ? availableCreators.find(u => u.name.toLowerCase() === bookingCreatedByName.toLowerCase()) : null);

                    if (selected) {
                      return (
                        <div className="p-2.5 bg-white border border-[#016a86]/20 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-[#016a86] text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {selected.name?.charAt(0).toUpperCase() || "C"}
                            </div>
                            <span className="font-bold text-slate-800 truncate">{selected.name}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-[#016a86] rounded-md text-[10px] font-bold shrink-0">
                            {selected.role || "Colaborador"}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Confirmação Prévia de Presença */}
                <div className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-900 flex items-center gap-1.5">
                      <CalendarCheck size={13} className="text-indigo-700" /> Confirmação Prévia de Presença
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600">Opcional</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Indique se o aluno já realizou alguma confirmação de comparecimento antes da aula:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceConfirmation(attendanceConfirmation === "CONFIRMOU_VESPERA" ? null : "CONFIRMOU_VESPERA")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        attendanceConfirmation === "CONFIRMOU_VESPERA"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                      }`}
                    >
                      <CalendarCheck size={14} className={attendanceConfirmation === "CONFIRMOU_VESPERA" ? "text-white" : "text-indigo-600"} />
                      <span>Confirmou na véspera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendanceConfirmation(attendanceConfirmation === "CONFIRMOU_NO_DIA" ? null : "CONFIRMOU_NO_DIA")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        attendanceConfirmation === "CONFIRMOU_NO_DIA"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                      }`}
                    >
                      <CheckCircle size={14} className={attendanceConfirmation === "CONFIRMOU_NO_DIA" ? "text-white" : "text-emerald-600"} />
                      <span>Confirmou no dia</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendanceConfirmation(attendanceConfirmation === "REAGENDOU" ? null : "REAGENDOU")}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        attendanceConfirmation === "REAGENDOU"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
                      }`}
                    >
                      <History size={14} className={attendanceConfirmation === "REAGENDOU" ? "text-white" : "text-amber-600"} />
                      <span>Reagendou</span>
                    </button>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Observações Internas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Informações adicionais..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  />
                </div>

                {/* Reschedule History (If editing) */}
                {editingBooking && editingBooking.rescheduleHistory && editingBooking.rescheduleHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                      <History size={12} /> Histórico de Reagendamentos ({editingBooking.rescheduleCount}/2)
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {editingBooking.rescheduleHistory.map((h, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-xl text-[11px] space-y-1 border border-slate-100">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>De: {formatDateBR(h.previousDate)} ({h.previousTime})</span>
                            <span>Para: {formatDateBR(h.newDate)} ({h.newTime})</span>
                          </div>
                          <p className="text-slate-500 italic">"{h.reason}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingBooking(null);
                      resetForm();
                    }}
                    className="px-5 py-3 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase transition-all"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-pro-teal hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    {editingBooking ? "Salvar Alterações" : "Confirmar Agendamento"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT VIEW MODAL */}
      <AnimatePresence>
        {receiptViewingBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative border border-slate-100 space-y-4"
            >
              <button
                onClick={() => setReceiptViewingBooking(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-pro-teal rounded-2xl">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Comprovante de Pagamento</h3>
                  <p className="text-xs font-bold text-slate-400">
                    Aluno(a): {receiptViewingBooking.studentName}
                  </p>
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 max-h-[60vh] flex items-center justify-center p-2">
                {receiptViewingBooking.paymentReceiptUrl?.startsWith("data:application/pdf") ? (
                  <iframe
                    src={receiptViewingBooking.paymentReceiptUrl}
                    className="w-full h-[50vh] rounded-xl"
                    title="PDF Comprovante"
                  />
                ) : (
                  <img
                    src={receiptViewingBooking.paymentReceiptUrl || ""}
                    alt="Comprovante"
                    className="max-h-[50vh] w-auto object-contain rounded-xl shadow-xs"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <a
                  href={receiptViewingBooking.paymentReceiptUrl || "#"}
                  download={`comprovante_${receiptViewingBooking.studentName.replace(/\s+/g, "_")}`}
                  className="px-5 py-2.5 bg-pro-teal text-white rounded-xl font-bold text-xs uppercase shadow-md flex items-center gap-2"
                >
                  <Upload size={14} className="rotate-180" /> Baixar
                </a>
                <button
                  onClick={() => setReceiptViewingBooking(null)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>

              <h3 className="text-xl font-black text-slate-800">Confirmar Exclusão</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                Tem certeza que deseja excluir o agendamento de aula experimental do aluno{" "}
                <span className="text-slate-900 font-black">"{deletingBooking.studentName}"</span>?
                Esta ação não poderá ser desfeita.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setDeletingBooking(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteBooking}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* TRIAGE POST-CLASS MODAL */}
      <AnimatePresence>
        {triageBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 relative space-y-6 my-8"
            >
              <button
                onClick={() => setTriageBooking(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-pro-teal rounded-2xl">
                  <ClipboardCheck size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Triagem Pós-Aula Experimental</h3>
                  <p className="text-xs font-bold text-slate-400">
                    Aluno: <strong className="text-slate-700">{triageBooking.studentName}</strong> • {triageBooking.course} ({triageBooking.classGroup})
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-600">
                  <span>Data da Aula: {formatDateBR(triageBooking.date)} ({triageBooking.dayOfWeek})</span>
                  <span>Horário: {triageBooking.classTime}</span>
                </div>
                {triageBooking.studentPhone && (
                  <p className="text-slate-500">Contato: {triageBooking.studentPhone}</p>
                )}
              </div>

              <form onSubmit={handleSaveTriage} className="space-y-6">
                {/* 1. Presença do Aluno */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                    1. O aluno compareceu à aula experimental? *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTriageAttended(true)}
                      className={`p-4 rounded-2xl border-2 font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                        triageAttended === true
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <UserCheck size={18} className={triageAttended === true ? "text-emerald-600" : "text-slate-400"} />
                      <span>Sim, Compareceu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTriageAttended(false)}
                      className={`p-4 rounded-2xl border-2 font-black text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                        triageAttended === false
                          ? "border-rose-600 bg-rose-50 text-rose-800 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <UserX size={18} className={triageAttended === false ? "text-rose-600" : "text-slate-400"} />
                      <span>Não Compareceu (Falta)</span>
                    </button>
                  </div>
                </div>

                {/* 2. Decisão de Matrícula (Se compareceu) */}
                {triageAttended === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2 pt-2 border-t border-slate-100"
                  >
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                      2. Qual foi a decisão sobre a matrícula? *
                    </label>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setTriageOutcome("MATRICULADO")}
                        className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                          triageOutcome === "MATRICULADO"
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl mt-0.5 ${triageOutcome === "MATRICULADO" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <UserCheck size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase">Se Matriculou</div>
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                            O aluno decidiu fechar a matrícula e entrar no curso regular.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTriageOutcome("AGUARDANDO_RESPOSTA")}
                        className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                          triageOutcome === "AGUARDANDO_RESPOSTA"
                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl mt-0.5 ${triageOutcome === "AGUARDANDO_RESPOSTA" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <HelpCircle size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase">Compareceu mas ainda não respondeu</div>
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                            O aluno assistiu à aula e está avaliando / aguardando retorno ou contato futuro.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTriageOutcome("NAO_MATRICULOU")}
                        className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-start gap-3 transition-all ${
                          triageOutcome === "NAO_MATRICULOU"
                            ? "border-slate-600 bg-slate-100 text-slate-900 shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <div className={`p-1.5 rounded-xl mt-0.5 ${triageOutcome === "NAO_MATRICULOU" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                          <XCircle size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase">Decidiu NÃO se matricular</div>
                          <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                            O aluno compareceu mas informou que não deseja realizar a matrícula no momento.
                          </div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 3. Observações da Triagem */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                    Observações / Feedback da Triagem (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Aluno elogiou a didática do professor, pediu para retornar contato na sexta-feira ou informou que o horário atual não atende..."
                    value={triageNotesInput}
                    onChange={(e) => setTriageNotesInput(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  {triageBooking.triageStatus ? (
                    <button
                      type="button"
                      onClick={() => handleClearTriage(triageBooking.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-black uppercase tracking-wider underline w-full sm:w-auto text-left"
                    >
                      Redefinir / Desfazer Triagem
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setTriageBooking(null)}
                      className="px-5 py-3 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase transition-all"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-pro-teal hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      Salvar Triagem
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ADJUST CREATOR MODAL */}
        {adjustCreatorBooking && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative space-y-5"
            >
              <button
                type="button"
                onClick={() => setAdjustCreatorBooking(null)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-[#016a86] rounded-2xl">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Ajustar Quem Fez o Agendamento</h3>
                  <p className="text-xs font-bold text-slate-400">
                    Aluno(a): <strong className="text-slate-700">{adjustCreatorBooking.studentName}</strong> • {formatDateBR(adjustCreatorBooking.date)} ({adjustCreatorBooking.classTime})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveAdjustCreator} className="space-y-5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-2 flex items-center justify-between">
                    <span>Colaborador Responsável *</span>
                    <span className="text-[10px] text-slate-400 font-semibold lowercase">professores, gestores e auxiliares</span>
                  </label>
                  <select
                    required
                    value={
                      availableCreators.some(u => u.id === adjustCreatorUid || (u.name && u.name.toLowerCase() === adjustCreatorName.toLowerCase()))
                        ? (availableCreators.find(u => u.id === adjustCreatorUid || u.name.toLowerCase() === adjustCreatorName.toLowerCase())?.id || "")
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdjustCreatorUid(val);
                      const selected = availableCreators.find(u => u.id === val);
                      if (selected) {
                        setAdjustCreatorName(selected.name);
                        setAdjustCreatorRole(selected.role || "Colaborador");
                      } else {
                        setAdjustCreatorName("");
                        setAdjustCreatorRole("");
                      }
                    }}
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-[#016a86] focus:bg-white rounded-2xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">-- Selecione o colaborador responsável --</option>
                    {availableCreators.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.role || "Colaborador"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Card de pré-visualização do colaborador selecionado */}
                {(() => {
                  const selectedUser = availableCreators.find(u => u.id === adjustCreatorUid) || 
                    (adjustCreatorName ? availableCreators.find(u => u.name.toLowerCase() === adjustCreatorName.toLowerCase()) : null);

                  if (selectedUser) {
                    return (
                      <div className="p-4 bg-teal-50/70 border border-[#016a86]/20 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#016a86] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {selectedUser.name?.charAt(0).toUpperCase() || "C"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-800 truncate">{selectedUser.name}</p>
                            <p className="text-xs font-semibold text-slate-500 truncate">{selectedUser.email || "Sem e-mail cadastrado"}</p>
                          </div>
                        </div>
                        <span className="shrink-0 px-2.5 py-1 bg-white border border-[#016a86]/30 text-[#016a86] rounded-xl text-[10px] font-black uppercase tracking-wider shadow-2xs">
                          {selectedUser.role || "Colaborador"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-amber-800 text-xs font-bold">
                      <AlertCircle size={16} className="shrink-0 text-amber-600" />
                      <span>Selecione um dos colaboradores cadastrados na lista acima para vincular ao agendamento.</span>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAdjustCreatorBooking(null)}
                    className="px-5 py-2.5 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-pro-teal hover:bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Salvar Alteração
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* REVENUE BREAKDOWN MODAL (Extrato de Receita por Agendador) */}
        {isRevenueModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 relative space-y-6 max-h-[90vh] flex flex-col"
            >
              <button
                type="button"
                onClick={() => setIsRevenueModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-2xl">
                  <Coins size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Extrato de Receita de Aulas Experimentais</h3>
                  <p className="text-xs font-bold text-slate-400">
                    Regra: <strong className="text-emerald-700">R$ 25,00</strong> por agendamento com presença confirmada na aula
                  </p>
                </div>
              </div>

              {/* Summary Cards inside modal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <DollarSign size={13} />
                      Minha Receita Gerada
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full">
                      Você ({loggedUser?.name || "Usuário"})
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-950">
                    R$ {myGeneratedRevenue.toFixed(2).replace(".", ",")}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-800 font-bold mt-2 pt-2 border-t border-emerald-200/60">
                    <span>{myAttendedCount} presenças confirmadas</span>
                    {myPendingCount > 0 && (
                      <span className="text-slate-500 font-medium">
                        + R$ {myProjectedRevenue.toFixed(2).replace(".", ",")} a realizar
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <Coins size={13} />
                      Receita Total da Escola
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                      Geral
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    R$ {totalGeneratedRevenue.toFixed(2).replace(".", ",")}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold mt-2 pt-2 border-t border-slate-200">
                    <span>{totalAttendedCount} presenças na escola</span>
                    <span className="text-slate-400 font-medium">{bookings.length} agendamentos totais</span>
                  </div>
                </div>
              </div>

              {/* Table / List of Creators */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Detalhamento por Agendador ({creatorRevenueStats.length})</span>
                  <span>R$ 25 / presença</span>
                </div>

                {creatorRevenueStats.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Nenhum agendamento registrado até o momento.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {creatorRevenueStats.map((stat, idx) => (
                      <div
                        key={stat.id || idx}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          stat.isMe
                            ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200"
                            : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${stat.isMe ? "bg-emerald-100 text-emerald-800 font-black" : "bg-white text-slate-600 border border-slate-200"}`}>
                            <User size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 text-sm">{stat.name}</span>
                              {stat.isMe && (
                                <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-600 text-white rounded-full uppercase tracking-wider">
                                  Você
                                </span>
                              )}
                              {stat.role && (
                                <span className="text-[10px] text-slate-400 font-medium">({stat.role})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium mt-0.5">
                              <span>Total: <strong>{stat.totalBookings}</strong> agendamento(s)</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">Compareceram: <strong>{stat.attendedBookings}</strong></span>
                              {stat.absentBookings > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-rose-600">Faltas: {stat.absentBookings}</span>
                                </>
                              )}
                              {stat.pendingBookings > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-400">A realizar: {stat.pendingBookings}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 shrink-0">
                          <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block sm:inline mr-1">Receita:</span>
                            <span className="text-base font-black text-emerald-800">
                              R$ {stat.earnedRevenue.toFixed(2).replace(".", ",")}
                            </span>
                          </div>
                          {stat.pendingRevenue > 0 && (
                            <span className="text-[10px] font-bold text-slate-400">
                              + R$ {stat.pendingRevenue.toFixed(2).replace(".", ",")} a confirmar
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
                <p className="text-[11px] text-slate-400 font-medium">
                  A receita é creditada automaticamente assim que a triagem confirma a presença do aluno.
                </p>
                <button
                  type="button"
                  onClick={() => setIsRevenueModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Fechar Extrato
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
