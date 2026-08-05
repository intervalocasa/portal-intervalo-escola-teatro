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
  CheckCircle
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
import { ExperimentalClassBooking, Course, Class } from "../types";
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

  const [bookings, setBookings] = useState<ExperimentalClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "PAGAMENTO_PENDENTE" | "AGENDAMENTO_CONFIRMADO">("TODOS");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ExperimentalClassBooking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<ExperimentalClassBooking | null>(null);
  const [receiptViewingBooking, setReceiptViewingBooking] = useState<ExperimentalClassBooking | null>(null);
  const [uploadingBookingId, setUploadingBookingId] = useState<string | null>(null);

  // Manual Confirmation Modal State
  const [manualConfirmBooking, setManualConfirmBooking] = useState<ExperimentalClassBooking | null>(null);
  const [manualConfirmReasonInput, setManualConfirmReasonInput] = useState("");

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
  const [notes, setNotes] = useState("");
  const [manualConfirmationReason, setManualConfirmationReason] = useState("");

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
    setNotes("");
    setManualConfirmationReason("");
    setRescheduleReason("");
    setEditingBooking(null);
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
    setNotes(booking.notes || "");
    setManualConfirmationReason(booking.manualConfirmationReason || "");
    setRescheduleReason("");
    setIsCreateModalOpen(false);
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
      const creatorName = loggedUser?.name || currentUser?.displayName || currentUser?.email?.split("@")[0] || "Usuário do Sistema";
      let creatorRole = "Gestor / Auxiliar";
      if (loggedUser?.role) {
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
        createdByUid: currentUser?.uid || loggedUser?.id || null,
        createdByName: creatorName,
        createdByRole: creatorRole,
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

  // Filtered List
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch = 
        (b.studentName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.course || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.classGroup || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = 
        statusFilter === "TODOS" || b.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  const totalCount = bookings.length;
  const confirmedCount = bookings.filter(b => b.status === "AGENDAMENTO_CONFIRMADO").length;
  const pendingCount = bookings.filter(b => b.status === "PAGAMENTO_PENDENTE").length;

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
              Agendamentos de aulas de experiência para novos alunos
            </p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-pro-teal hover:bg-teal-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} />
          Novo Agendamento
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de Agendamentos</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <Calendar size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pagamento Pendente</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Agendamentos Confirmados</p>
            <p className="text-2xl font-black text-teal-700 mt-1">{confirmedCount}</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por aluno, curso ou turma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-pro-teal"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(["TODOS", "PAGAMENTO_PENDENTE", "AGENDAMENTO_CONFIRMADO"] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === f
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f === "TODOS" ? "Todos" : f === "PAGAMENTO_PENDENTE" ? "Pendentes" : "Confirmados"}
            </button>
          ))}
        </div>
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
            {searchTerm || statusFilter !== "TODOS" 
              ? "Tente ajustar seus filtros de busca." 
              : "Clique em 'Novo Agendamento' para registrar uma aula experimental."}
          </p>
          {!searchTerm && statusFilter === "TODOS" && (
            <button
              onClick={openCreateModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-pro-teal text-white rounded-xl font-bold text-xs uppercase"
            >
              <Plus size={14} /> Cadastrar Agendamento
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
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-center">Comprovante / Confirmação</th>
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
                      {b.createdByName && (
                        <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 w-fit">
                          <User size={10} className="text-slate-400 shrink-0" />
                          <span>
                            Agendado por <strong className="text-slate-700 font-bold">{b.createdByName}</strong>
                            {b.createdByRole ? ` (${b.createdByRole})` : ""}
                            {formatCreationTimestamp(b.createdAt) && ` em ${formatCreationTimestamp(b.createdAt)}`}
                          </span>
                        </div>
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
                        <GraduationCap size={14} className="text-pro-teal" />
                        {b.course}
                      </div>
                    </td>

                    {/* Turma e Horário */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <Presentation size={14} className="text-pro-orange" />
                        <span>{b.classGroup}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {b.classTime}
                      </div>
                    </td>

                    {/* Data e Dia da Semana */}
                    <td className="py-4 px-6">
                      <div className="font-black text-slate-800">{formatDateBR(b.date)}</div>
                      <div className="text-[11px] font-semibold text-teal-600">{b.dayOfWeek}</div>
                    </td>

                    {/* Status Badge */}
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
                          <Clock size={12} /> Pagamento Pendente
                        </span>
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
                              Enviar Comprovante
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
                              <CheckCircle size={12} className="text-teal-600" /> Confirmar Manualmente
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Confirmado {b.manualConfirmationReason ? "manualmente" : "com comprovante"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-pro-teal rounded-xl transition-all"
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
                  <div>
                    {b.status === "AGENDAMENTO_CONFIRMADO" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-50 text-teal-700 border border-teal-200">
                        Confirmado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl text-slate-600 font-bold">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Turma & Horário</span>
                    {b.classGroup} - {b.classTime}
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-black">Data & Dia</span>
                    {formatDateBR(b.date)} ({b.dayOfWeek})
                  </div>
                </div>

                {b.createdByName && (
                  <div className="text-[10px] font-medium text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-1">
                    <User size={12} className="text-slate-400 shrink-0" />
                    <span>
                      Agendado por <strong className="text-slate-700 font-bold">{b.createdByName}</strong>
                      {b.createdByRole ? ` (${b.createdByRole})` : ""}
                      {formatCreationTimestamp(b.createdAt) && ` em ${formatCreationTimestamp(b.createdAt)}`}
                    </span>
                  </div>
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
                        <CheckCircle size={12} /> Confirmar Manualmente
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-2 bg-slate-100 text-pro-teal rounded-lg font-bold"
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
    </motion.div>
  );
};
