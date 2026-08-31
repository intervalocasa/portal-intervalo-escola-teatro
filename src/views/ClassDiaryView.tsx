/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
  Lock,
  Search,
  Filter,
  Check,
  ChevronRight,
  BookOpen,
  Eye,
  FileText,
  Clock,
  UserCheck,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  CalendarDays,
  ListFilter,
  Trash2,
  Printer,
  X,
  RotateCcw,
  UserCircle,
  GraduationCap,
  AlertTriangle
} from "lucide-react";
import { Class, User, UserRole, ClassDailyDiary, ClassAttendanceStatus } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";
import {
  fetchClassDailyDiaries,
  fetchClassDailyDiaryByClassAndDate,
  saveClassDailyDiary,
  deleteClassDailyDiary
} from "../services/classDiaryService";
import {
  getClassDiaryDeadlineInfo,
  ClassDiaryDeadlineInfo
} from "../lib/deadlineUtils";
import { isDirectorOrGestor } from "../lib/userUtils";

interface ClassDiaryViewProps {
  currentUser: any;
  users: User[];
  classes: Class[];
  setView: (view: string) => void;
  userRole?: UserRole | null;
}

export const ClassDiaryView: React.FC<ClassDiaryViewProps> = ({
  currentUser,
  users,
  classes,
  setView,
  userRole
}) => {
  // Mode: "entry" (Lançamento) vs "history" (Histórico de Aulas)
  const [activeTab, setActiveTab] = useState<"entry" | "history">("entry");

  // Step 1 Selection States
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  // Step 2 Form States
  const [attendances, setAttendances] = useState<Record<string, ClassAttendanceStatus>>({});
  const [studentObservations, setStudentObservations] = useState<Record<string, string>>({});
  const [classComment, setClassComment] = useState<string>("");
  const [currentDiaryId, setCurrentDiaryId] = useState<string | null>(null);

  // Status & Notification
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 24h Deadline Modal State
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState<boolean>(false);
  const [deadlineModalData, setDeadlineModalData] = useState<ClassDiaryDeadlineInfo | null>(null);

  // History / Logs State
  const [historyDiaries, setHistoryDiaries] = useState<ClassDailyDiary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilterTeacherId, setHistoryFilterTeacherId] = useState<string>("all");
  const [historyFilterClassId, setHistoryFilterClassId] = useState<string>("all");
  const [historyFilterDate, setHistoryFilterDate] = useState<string>("");
  const [historyFilterMonth, setHistoryFilterMonth] = useState<string>("all");
  const [historySearchQuery, setHistorySearchQuery] = useState<string>("");
  const [viewingDetailDiary, setViewingDetailDiary] = useState<ClassDailyDiary | null>(null);

  // Identify logged user & role
  const loggedUserId = currentUser?.uid || currentUser?.id || "";
  const effectiveRole = userRole || currentUser?.role || "";
  const isGestorOrDirector = isDirectorOrGestor(effectiveRole);
  const isProfessorOnly = !isGestorOrDirector;

  // Resolve current teacher profile and aliases for accurate matching
  const currentTeacherUser = useMemo(() => {
    return users.find(u =>
      u.id === currentUser?.uid ||
      u.id === currentUser?.id ||
      u.uid === currentUser?.uid ||
      (u.email && currentUser?.email && u.email.toLowerCase() === currentUser.email.toLowerCase())
    ) || currentUser;
  }, [users, currentUser]);

  const teacherIdsList = useMemo(() => {
    return [
      loggedUserId,
      currentUser?.uid,
      currentUser?.id,
      currentTeacherUser?.id,
      currentTeacherUser?.uid
    ].filter(Boolean) as string[];
  }, [loggedUserId, currentUser, currentTeacherUser]);

  const teacherNamesList = useMemo(() => {
    const names = [
      currentTeacherUser?.name?.trim().toLowerCase(),
      currentTeacherUser?.artisticName?.trim().toLowerCase(),
      currentUser?.displayName?.trim().toLowerCase(),
      currentUser?.name?.trim().toLowerCase(),
      currentUser?.artisticName?.trim().toLowerCase()
    ].filter(Boolean) as string[];
    return Array.from(new Set(names));
  }, [currentTeacherUser, currentUser]);

  // List of teachers for filtering (Gestores / Diretores)
  const teacherUsers = useMemo(() => {
    const directTeachers = users.filter(u =>
      u.role === "Professor" ||
      u.role === "Diretor Pedagógico e Professor" ||
      u.role === "Diretor Pedagógico"
    );

    // Also collect any teacher names/ids present in history diaries
    const historyTeacherIds = new Set(historyDiaries.map(d => d.teacherId).filter(Boolean));
    const extraUsers = users.filter(u => historyTeacherIds.has(u.id) && !directTeachers.some(t => t.id === u.id));

    return [...directTeachers, ...extraUsers].sort((a, b) =>
      (a.name || a.artisticName || "").localeCompare(b.name || b.artisticName || "", "pt-BR")
    );
  }, [users, historyDiaries]);

  // Filter classes: Professors see their linked classes; Gestores/Directores see all active classes
  const availableClasses = useMemo(() => {
    if (isGestorOrDirector) {
      return classes.filter(c => c.isActive !== false);
    }
    return classes.filter(c => {
      if (c.isActive === false) return false;
      const tIds = c.teacherIds || [];
      return tIds.some(tid => teacherIdsList.includes(tid));
    });
  }, [classes, isGestorOrDirector, teacherIdsList]);

  // Selected Class Object
  const selectedClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    const studentIds = selectedClass.studentIds || [];
    return users.filter(u => {
      // Direct ID or migrated ID
      const matchesId = studentIds.includes(u.id);
      const matchesMigrated = (u.migratedFrom && studentIds.includes(u.migratedFrom)) || (u.migratedTo && studentIds.includes(u.migratedTo));
      return (matchesId || matchesMigrated) && u.role === "Aluno" && !u.inactive;
    }).sort((a, b) => (a.name || a.artisticName || "").localeCompare(b.name || b.artisticName || "", "pt-BR"));
  }, [selectedClass, users]);

  // Real-time Deadline Info for current selection
  const currentDeadlineInfo = useMemo(() => {
    if (!selectedClass || !selectedDate) return null;
    return getClassDiaryDeadlineInfo(selectedDate, selectedClass.time);
  }, [selectedClass, selectedDate]);

  // When class and date are confirmed, load any existing record
  const handleConfirmSelection = async (overrideClassId?: string, overrideDate?: string) => {
    const classIdToUse = overrideClassId || selectedClassId;
    const dateToUse = overrideDate || selectedDate;

    if (!classIdToUse) {
      setErrorMessage("Por favor, selecione uma turma.");
      return;
    }
    if (!dateToUse) {
      setErrorMessage("Por favor, selecione a data da aula.");
      return;
    }

    const classObj = classes.find(c => c.id === classIdToUse);
    const deadlineInfo = getClassDiaryDeadlineInfo(dateToUse, classObj?.time);

    // REGRA DE 24H: Professor só pode lançar diário até 24h após o término da aula
    if (isProfessorOnly && deadlineInfo.isExpired) {
      setDeadlineModalData(deadlineInfo);
      setIsDeadlineModalOpen(true);
      setErrorMessage("Não é possível fazer o lançamento da frequência pois perdeu o prazo de 24 horas.");
      return;
    }

    setErrorMessage(null);
    setSaveSuccessMessage(null);
    setIsSaving(true);

    try {
      const existing = await fetchClassDailyDiaryByClassAndDate(classIdToUse, dateToUse);
      if (existing) {
        setAttendances(existing.attendances || {});
        setStudentObservations(existing.studentObservations || {});
        setClassComment(existing.classComment || "");
        setCurrentDiaryId(existing.id || `${classIdToUse}_${dateToUse}`);
      } else {
        // Initialize all students as 'presente' by default or empty
        const initialAttendances: Record<string, ClassAttendanceStatus> = {};
        const targetStudents = (classObj?.studentIds || []).map(sId => 
          users.find(u => u.id === sId || u.migratedFrom === sId || u.migratedTo === sId)
        ).filter(Boolean);

        targetStudents.forEach(st => {
          if (st) initialAttendances[st.id] = "presente";
        });
        setAttendances(initialAttendances);
        setStudentObservations({});
        setClassComment("");
        setCurrentDiaryId(`${classIdToUse}_${dateToUse}`);
      }
      setIsConfirmed(true);
    } catch (err: any) {
      console.error("Error loading class diary:", err);
      setErrorMessage("Erro ao carregar dados da aula. Você pode preencher normalmente.");
      setIsConfirmed(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick attendance actions
  const handleMarkAll = (status: ClassAttendanceStatus) => {
    const updated: Record<string, ClassAttendanceStatus> = {};
    classStudents.forEach(st => {
      updated[st.id] = status;
    });
    setAttendances(updated);
  };

  const handleStudentAttendanceChange = (studentId: string, status: ClassAttendanceStatus) => {
    setAttendances(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleStudentObsChange = (studentId: string, text: string) => {
    setStudentObservations(prev => ({
      ...prev,
      [studentId]: text
    }));
  };

  // Save class daily diary
  const handleSaveDiary = async () => {
    if (!selectedClass) {
      setErrorMessage("Turma não selecionada.");
      return;
    }

    if (!selectedDate) {
      setErrorMessage("Data da aula não informada.");
      return;
    }

    // REGRA DE 24H: Validação estrita antes da gravação
    const deadlineInfo = getClassDiaryDeadlineInfo(selectedDate, selectedClass.time);
    if (isProfessorOnly && deadlineInfo.isExpired) {
      setDeadlineModalData(deadlineInfo);
      setIsDeadlineModalOpen(true);
      setErrorMessage("Não é possível fazer o lançamento da frequência pois perdeu o prazo de 24 horas.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    const teacherUser = users.find(u => u.id === loggedUserId);
    const teacherName = teacherUser?.name || teacherUser?.artisticName || currentUser?.displayName || "Professor";

    try {
      await saveClassDailyDiary({
        id: currentDiaryId || `${selectedClass.id}_${selectedDate}`,
        classId: selectedClass.id,
        className: selectedClass.code || selectedClass.type || "Turma",
        classCode: selectedClass.code || "",
        classType: selectedClass.type || "",
        date: selectedDate,
        teacherId: loggedUserId,
        teacherName: teacherName,
        authorRole: userRole || "Professor",
        attendances,
        studentObservations,
        classComment,
        totalStudents: classStudents.length,
        presentCount: 0,
        absentCount: 0,
        justifiedCount: 0
      });

      setSaveSuccessMessage("Diário de aula e chamada salvos com sucesso!");
      // Reload history if tab is opened
      loadHistory();
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Erro ao salvar diário de aula:", err);
      setErrorMessage("Ocorreu um erro ao salvar o diário de aula.");
    } finally {
      setIsSaving(false);
    }
  };

  // Load History
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchClassDailyDiaries();
      setHistoryDiaries(data);
    } catch (e) {
      console.error("Error loading history diaries:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyDiaries.filter(d => {
      // 0. Permission check: If user is only a professor, they MUST ONLY see their own launched diaries
      if (!isGestorOrDirector) {
        const dTeacherId = d.teacherId || "";
        const dTeacherName = (d.teacherName || "").trim().toLowerCase();
        const dAuthorId = (d as any).authorId || (d as any).createdBy || "";
        
        const matchesId = Boolean(dTeacherId && teacherIdsList.includes(dTeacherId));
        const matchesAuthorId = Boolean(dAuthorId && teacherIdsList.includes(dAuthorId));
        const matchesName = Boolean(dTeacherName && teacherNamesList.some(name => name && (dTeacherName === name || dTeacherName.includes(name) || name.includes(dTeacherName))));

        if (!matchesId && !matchesAuthorId && !matchesName) {
          return false;
        }
      }

      // 1. Filter by Class
      if (historyFilterClassId !== "all" && d.classId !== historyFilterClassId) {
        return false;
      }

      // 2. Filter by Teacher (only active for Gestores / Diretores)
      if (isGestorOrDirector && historyFilterTeacherId !== "all") {
        const teacherObj = users.find(u => u.id === historyFilterTeacherId);
        const matchId = d.teacherId === historyFilterTeacherId;
        const matchName = teacherObj && (
          (d.teacherName || "").toLowerCase() === (teacherObj.name || "").toLowerCase() ||
          (d.teacherName || "").toLowerCase() === (teacherObj.artisticName || "").toLowerCase()
        );
        if (!matchId && !matchName) {
          return false;
        }
      }

      // 3. Filter by Exact Date (YYYY-MM-DD)
      if (historyFilterDate && d.date !== historyFilterDate) {
        return false;
      }

      // 4. Filter by Month
      if (historyFilterMonth !== "all") {
        const entryMonth = d.date ? d.date.split("-")[1] : "";
        if (entryMonth !== historyFilterMonth) {
          return false;
        }
      }

      // 5. Search text query
      if (historySearchQuery.trim()) {
        const query = historySearchQuery.toLowerCase().trim();
        const matchesComment = (d.classComment || "").toLowerCase().includes(query);
        const matchesClass = (d.className || d.classCode || "").toLowerCase().includes(query);
        const matchesTeacher = (d.teacherName || "").toLowerCase().includes(query);
        const matchesDate = (d.date || "").includes(query);
        
        // Search inside student observations or student names
        const matchesObservations = Object.values(d.studentObservations || {}).some(obs =>
          typeof obs === "string" && obs.toLowerCase().includes(query)
        );

        return matchesComment || matchesClass || matchesTeacher || matchesDate || matchesObservations;
      }

      return true;
    });
  }, [
    historyDiaries,
    isGestorOrDirector,
    teacherIdsList,
    teacherNamesList,
    historyFilterClassId,
    historyFilterTeacherId,
    historyFilterDate,
    historyFilterMonth,
    historySearchQuery,
    users
  ]);

  // Aggregate stats for filtered history
  const historyStats = useMemo(() => {
    let totalClasses = filteredHistory.length;
    let totalP = 0;
    let totalF = 0;
    let totalJ = 0;

    filteredHistory.forEach(d => {
      totalP += d.presentCount || 0;
      totalF += d.absentCount || 0;
      totalJ += d.justifiedCount || 0;
    });

    return { totalClasses, totalP, totalF, totalJ };
  }, [filteredHistory]);

  const hasActiveFilters =
    historyFilterClassId !== "all" ||
    historyFilterTeacherId !== "all" ||
    historyFilterDate !== "" ||
    historyFilterMonth !== "all" ||
    historySearchQuery.trim() !== "";

  const handleResetFilters = () => {
    setHistoryFilterClassId("all");
    setHistoryFilterTeacherId("all");
    setHistoryFilterDate("");
    setHistoryFilterMonth("all");
    setHistorySearchQuery("");
  };

  // Formatted date string
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    try {
      const [year, month, day] = selectedDate.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Attendance stats for current session
  const currentStats = useMemo(() => {
    let p = 0;
    let f = 0;
    let j = 0;
    classStudents.forEach(st => {
      const stStatus = attendances[st.id];
      if (stStatus === "presente") p++;
      else if (stStatus === "falta") f++;
      else if (stStatus === "justificada") j++;
    });
    return { p, f, j, total: classStudents.length };
  }, [classStudents, attendances]);

  return (
    <motion.div
      key="class-diary-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-6xl bg-slate-50 rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto shadow-md" />
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#016a86] via-[#015870] to-[#014254] p-8 md:p-12 text-center relative overflow-hidden flex flex-col items-center gap-3">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <Logo className="h-10 md:h-14 w-auto mb-1 brightness-0 invert" />
        
        <div className="flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
          <BookOpen size={16} className="text-pro-yellow" />
          <span className="text-white text-xs font-black uppercase tracking-widest">
            Frequência & Relato Pedagógico
          </span>
        </div>

        <h1 className="text-white text-2xl md:text-4xl font-black uppercase tracking-tight">
          Diário de Aula
        </h1>
        <p className="text-teal-50/80 text-xs md:text-sm max-w-2xl font-medium">
          Lançamento direto da presença de alunos e registro confidencial do desenvolvimento da aula.
        </p>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 bg-black/20 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("entry")}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "entry"
                ? "bg-pro-yellow text-slate-900 shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Calendar size={14} /> Lançar Diário de Aula
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-pro-yellow text-slate-900 shadow-md"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Clock size={14} /> Histórico & Relatos
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full space-y-8">
          {/* Notification Messages */}
          <AnimatePresence>
            {saveSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-emerald-50 border-2 border-emerald-500/30 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-md"
              >
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span className="font-bold text-sm">{saveSuccessMessage}</span>
              </motion.div>
            )}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-rose-50 border-2 border-rose-500/30 text-rose-800 rounded-2xl flex items-center gap-3 shadow-md"
              >
                <AlertCircle size={20} className="text-rose-600 shrink-0" />
                <span className="font-bold text-sm">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: Lançamento de Presença e Relato */}
          {activeTab === "entry" && (
            <div className="space-y-8">
              {/* STEP 1: Seleção de Turma e Data */}
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pro-teal/10 flex items-center justify-center text-pro-teal font-black">
                      1
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        Seleção da Turma e Data
                      </h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Escolha a turma e o dia da aula para iniciar a chamada
                      </p>
                    </div>
                  </div>

                  {isConfirmed && (
                    <button
                      onClick={() => setIsConfirmed(false)}
                      className="text-xs text-pro-teal font-black uppercase tracking-wider hover:underline flex items-center gap-1"
                    >
                      <ArrowLeft size={14} /> Trocar Turma ou Data
                    </button>
                  )}
                </div>

                {!isConfirmed ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                    {/* Turma */}
                    <div className="md:col-span-6 space-y-2">
                      <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                        <Users size={14} className="text-pro-teal" /> Selecione a Turma
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm font-bold focus:bg-white focus:border-pro-teal focus:ring-4 focus:ring-pro-teal/10 transition-all outline-none"
                      >
                        <option value="">-- Escolha uma turma --</option>
                        {availableClasses.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.code} - {cls.type} ({cls.weekday} {cls.time})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Data */}
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Calendar size={14} className="text-pro-teal" /> Data da Aula
                        </span>
                        {isProfessorOnly && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            Prazo: 24h pós-aula
                          </span>
                        )}
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className={`w-full px-4 py-3.5 bg-slate-50 border rounded-2xl text-slate-800 text-sm font-bold focus:bg-white transition-all outline-none ${
                          isProfessorOnly && currentDeadlineInfo?.isExpired
                            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                            : "border-slate-200 focus:border-pro-teal focus:ring-4 focus:ring-pro-teal/10"
                        }`}
                      />

                      {/* Badge dinâmico de status do prazo */}
                      {selectedDate && currentDeadlineInfo && (
                        <div className="pt-0.5">
                          {isProfessorOnly ? (
                            currentDeadlineInfo.isExpired ? (
                              <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                                <Clock size={13} className="text-rose-600 shrink-0" />
                                <span>Prazo de 24h encerrado ({currentDeadlineInfo.formattedTimeRemaining})</span>
                              </div>
                            ) : (
                              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                <span>Dentro do prazo: {currentDeadlineInfo.formattedTimeRemaining} (até {currentDeadlineInfo.formattedDeadline})</span>
                              </div>
                            )
                          ) : (
                            <div className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                              <Clock size={12} className="text-pro-teal shrink-0" />
                              <span>Prazo professor: {currentDeadlineInfo.formattedDeadline} • Acesso Gestão Liberado</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão Confirmar */}
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmSelection()}
                        disabled={isSaving || !selectedClassId || !selectedDate}
                        className="w-full py-3.5 bg-pro-teal hover:bg-pro-teal/90 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-teal-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <span className="animate-pulse">Carregando...</span>
                        ) : (
                          <>
                            <Check size={16} /> Confirmar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Resumo Selecionado */
                  <div className="bg-pro-teal/5 p-5 rounded-2xl border border-pro-teal/20 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-pro-teal text-white text-[10px] font-black uppercase tracking-widest rounded-md">
                          {selectedClass?.type || "Turma"}
                        </span>
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                          {selectedClass?.code}
                        </h3>
                        {currentDeadlineInfo && (
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                            currentDeadlineInfo.isExpired ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {currentDeadlineInfo.isExpired ? "Prazo 24h Expirado" : "Dentro do Prazo"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-500 capitalize">
                        📅 {formattedSelectedDate} • ⏰ {selectedClass?.weekday} {selectedClass?.time}
                      </p>
                    </div>

                    {/* Stats pill */}
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-black">
                        {currentStats.p} Presente(s)
                      </div>
                      <div className="px-3 py-1.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-black">
                        {currentStats.f} Falta(s)
                      </div>
                      {currentStats.j > 0 && (
                        <div className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-xl text-xs font-black">
                          {currentStats.j} Justificada(s)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: Chamada & Relato da Aula (Aberto após confirmação) */}
              {isConfirmed && (
                <div className="space-y-8">
                  {/* Seção da Chamada de Alunos */}
                  <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200/80 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-pro-teal/10 flex items-center justify-center text-pro-teal font-black">
                          2
                        </div>
                        <div>
                          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <UserCheck size={20} className="text-pro-teal" /> Lançamento de Presença
                          </h2>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Marque o status de cada aluno da turma
                          </p>
                        </div>
                      </div>

                      {/* Botões Rápidos */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMarkAll("presente")}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 size={14} /> Todos Presentes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAll("falta")}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                        >
                          <XCircle size={14} /> Marcar Todos Falta
                        </button>
                      </div>
                    </div>

                    {/* Lista de Alunos */}
                    {classStudents.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 space-y-2">
                        <Users size={32} className="mx-auto text-slate-300" />
                        <p className="text-xs font-bold uppercase tracking-wider">
                          Nenhum aluno ativo matriculado nesta turma.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {classStudents.map((student, idx) => {
                          const currentStatus = attendances[student.id] || "presente";
                          const studentObs = studentObservations[student.id] || "";

                          return (
                            <div
                              key={student.id}
                              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-slate-50/50 px-2 rounded-2xl transition-all"
                            >
                              {/* Aluno Info */}
                              <div className="flex items-center gap-3 min-w-[240px]">
                                <span className="text-xs font-black text-slate-300 w-5 text-right">
                                  {idx + 1}.
                                </span>
                                <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                  <Avatar
                                    src={student.photo}
                                    fallbackSize={24}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-slate-800 leading-tight">
                                    {student.name || student.artisticName}
                                  </h4>
                                  {student.artisticName && student.artisticName !== student.name && (
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                      Nome Artístico: {student.artisticName}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Botões de Presença (P, F, J) */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStudentAttendanceChange(student.id, "presente")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    currentStatus === "presente"
                                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105"
                                      : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                                  }`}
                                >
                                  <Check size={14} /> P (Presente)
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStudentAttendanceChange(student.id, "falta")}
                                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    currentStatus === "falta"
                                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105"
                                      : "bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                                  }`}
                                >
                                  <XCircle size={14} /> F (Falta)
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStudentAttendanceChange(student.id, "justificada")}
                                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                    currentStatus === "justificada"
                                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-105"
                                      : "bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                                  }`}
                                >
                                  <AlertCircle size={14} /> J (Justificada)
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Seção: Relato e Comentário da Aula (ESTRITAMENTE CONFIDENCIAL) */}
                  <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200/80 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 font-black">
                        3
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                          <FileText size={20} className="text-amber-600" /> Relato da Aula
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                          Registro pedagógico de dinâmicas e observações sobre o encontro
                        </p>
                      </div>
                    </div>

                    {/* Banner de Segurança & Confidencialidade Obrigatório */}
                    <div className="p-4 bg-amber-50 border-2 border-amber-300/60 rounded-2xl flex items-start gap-3.5">
                      <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
                        <Lock size={16} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                          Observação Confidencial • Equipe Pedagógica
                        </h4>
                        <p className="text-xs font-medium text-amber-800 leading-relaxed">
                          Este comentário é de <strong>uso interno exclusivo</strong> dos professores,
                          direção pedagógica e gestores da Casa de Teatro. <strong>Este conteúdo NÃO é exibido para os alunos em nenhuma tela ou relatório.</strong>
                        </p>
                      </div>
                    </div>

                    {/* Caixa de Texto do Relato */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Como foi a aula de hoje? (Dinâmicas, engajamento, ocorrências, exercícios)</span>
                        <span className="text-[10px] text-slate-400 font-bold">{classComment.length} caracteres</span>
                      </label>
                      <textarea
                        rows={6}
                        value={classComment}
                        onChange={e => setClassComment(e.target.value)}
                        placeholder="Escreva aqui detalhadamente o relato da aula: jogos teatrais aplicados, resposta e escuta da turma, desafios encontrados, cenas trabalhadas, recomendações pedagógicas para a próxima aula..."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm leading-relaxed font-medium focus:bg-white focus:border-pro-teal focus:ring-4 focus:ring-pro-teal/10 transition-all outline-none resize-y"
                      />
                    </div>

                    {/* Botão de Salvar Diário de Aula */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-slate-500 font-bold">
                        Total de alunos na chamada: <strong className="text-slate-800">{classStudents.length}</strong> ({currentStats.p} presentes, {currentStats.f} faltas)
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveDiary}
                        disabled={isSaving}
                        className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-[#016a86] to-[#014e63] hover:brightness-110 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-teal-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <span className="animate-pulse">Gravando diário...</span>
                        ) : (
                          <>
                            <Save size={18} className="text-pro-yellow" /> Salvar Diário de Aula
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Histórico e Consultas de Aulas */}
          {activeTab === "history" && (
            <div className="space-y-6">
              {/* Filtros Avançados do Histórico */}
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-pro-teal/10 rounded-2xl text-pro-teal">
                      <ListFilter size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                        Filtros de Consulta
                        {hasActiveFilters && (
                          <span className="px-2.5 py-0.5 bg-amber-500 text-slate-900 text-[10px] font-black rounded-full uppercase tracking-wider">
                            Filtros Ativos
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold">
                        {isGestorOrDirector
                          ? "Filtre os lançamentos de presença e relatos de aula por professor, turma, data ou termo de busca"
                          : `Exibindo apenas os diários e relatos pedagógicos lançados por você (${currentTeacherUser?.artisticName || currentTeacherUser?.name || currentUser?.displayName || "Professor"}).`}
                      </p>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <RotateCcw size={14} /> Limpar Todos os Filtros
                    </button>
                  )}
                </div>

                {/* Grade de Filtros */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 ${isGestorOrDirector ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4`}>
                  {/* 1. Filtro por Professor (Visível apenas para Gestão / Direção Pedagógica) */}
                  {isGestorOrDirector && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap size={14} className="text-pro-teal" /> Professor(a)
                      </label>
                      <select
                        value={historyFilterTeacherId}
                        onChange={e => setHistoryFilterTeacherId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-pro-teal outline-none transition-all"
                      >
                        <option value="all">Todos os Professores</option>
                        {teacherUsers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name || teacher.artisticName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 2. Filtro por Turma */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-pro-teal" /> Turma
                    </label>
                    <select
                      value={historyFilterClassId}
                      onChange={e => setHistoryFilterClassId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-pro-teal outline-none transition-all"
                    >
                      <option value="all">{isGestorOrDirector ? "Todas as Turmas" : "Todas as Minhas Turmas"}</option>
                      {availableClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.code} - {cls.type} ({cls.weekday})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Filtro por Data Exata */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-pro-teal" /> Data Exata
                      </span>
                      {historyFilterDate && (
                        <button
                          type="button"
                          onClick={() => setHistoryFilterDate("")}
                          className="text-[10px] text-rose-500 font-bold hover:underline"
                        >
                          Limpar Data
                        </button>
                      )}
                    </label>
                    <input
                      type="date"
                      value={historyFilterDate}
                      onChange={e => setHistoryFilterDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-pro-teal outline-none transition-all"
                    />
                  </div>

                  {/* 4. Filtro por Mês */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-pro-teal" /> Mês da Aula
                    </label>
                    <select
                      value={historyFilterMonth}
                      onChange={e => setHistoryFilterMonth(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-pro-teal outline-none transition-all"
                    >
                      <option value="all">Todos os Meses</option>
                      <option value="01">Janeiro</option>
                      <option value="02">Fevereiro</option>
                      <option value="03">Março</option>
                      <option value="04">Abril</option>
                      <option value="05">Maio</option>
                      <option value="06">Junho</option>
                      <option value="07">Julho</option>
                      <option value="08">Agosto</option>
                      <option value="09">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>
                </div>

                {/* Busca textual livre */}
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={e => setHistorySearchQuery(e.target.value)}
                    placeholder="Buscar por palavras do relato (ex: 'improvisação', 'jogos'), aluno ou observação..."
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-pro-teal focus:ring-4 focus:ring-pro-teal/10 transition-all"
                  />
                  {historySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Painel de Resumo das Aulas Filtradas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Aulas Registradas
                    </span>
                    <span className="text-xl font-black text-slate-800 mt-0.5 block">
                      {historyStats.totalClasses}
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                      Total de Presenças
                    </span>
                    <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                      {historyStats.totalP}
                    </span>
                  </div>

                  <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">
                      Total de Faltas
                    </span>
                    <span className="text-xl font-black text-rose-700 mt-0.5 block">
                      {historyStats.totalF}
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-100">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block">
                      Justificadas
                    </span>
                    <span className="text-xl font-black text-amber-700 mt-0.5 block">
                      {historyStats.totalJ}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Registros do Histórico */}
              {loadingHistory ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
                  <div className="w-8 h-8 border-4 border-pro-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Carregando histórico de diários...
                  </p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 space-y-4">
                  <CalendarDays size={44} className="mx-auto text-slate-300" />
                  <div className="space-y-1">
                    <p className="text-base font-black text-slate-700 uppercase tracking-tight">
                      Nenhum diário de aula encontrado
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      Tente alterar os filtros selecionados ou cadastre um novo diário de aula.
                    </p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredHistory.map(entry => {
                    const [y, m, d] = (entry.date || "").split("-");
                    const dateFormatted = y && m && d ? `${d}/${m}/${y}` : entry.date;

                    return (
                      <div
                        key={entry.id || `${entry.classId}_${entry.date}`}
                        className="bg-white p-6 rounded-[28px] border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="px-2.5 py-0.5 bg-pro-teal/10 text-pro-teal text-[10px] font-black uppercase tracking-wider rounded-md">
                                {entry.classType || "Turma"}
                              </span>
                              <h4 className="text-base font-black text-slate-800 uppercase tracking-tight mt-1">
                                {entry.className || entry.classCode}
                              </h4>
                            </div>
                            <div className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-black rounded-xl shrink-0 flex items-center gap-1.5 border border-slate-200">
                              <Calendar size={13} className="text-pro-teal" /> {dateFormatted}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <GraduationCap size={14} className="text-pro-teal shrink-0" />
                            <span>
                              Professor(a): <strong className="text-slate-800">{entry.teacherName || "Não informado"}</strong>
                            </span>
                          </div>

                          {/* Estatísticas de Frequência */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-200 flex items-center gap-1">
                              <Check size={12} /> {entry.presentCount || 0} Presentes
                            </span>
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg border border-rose-200 flex items-center gap-1">
                              <XCircle size={12} /> {entry.absentCount || 0} Faltas
                            </span>
                            {(entry.justifiedCount || 0) > 0 && (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg border border-amber-200 flex items-center gap-1">
                                <AlertCircle size={12} /> {entry.justifiedCount} Justificadas
                              </span>
                            )}
                          </div>

                          {/* Prévia do Relato Confidencial */}
                          {entry.classComment ? (
                            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-black text-amber-900 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                  <Lock size={12} /> Relato Pedagógico (Confidencial):
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 font-medium line-clamp-3 leading-relaxed">
                                {entry.classComment}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs italic text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              Sem relato pedagógico registrado para esta aula.
                            </p>
                          )}
                        </div>

                        {/* Botões de Ação */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingDetailDiary(entry)}
                              className="px-3.5 py-2 bg-pro-teal/10 hover:bg-pro-teal hover:text-white text-pro-teal text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <Eye size={14} /> Ver Detalhes
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const clsObj = classes.find(c => c.id === entry.classId);
                                const dlInfo = getClassDiaryDeadlineInfo(entry.date, clsObj?.time || entry.classTime);
                                if (isProfessorOnly && dlInfo.isExpired) {
                                  setDeadlineModalData(dlInfo);
                                  setIsDeadlineModalOpen(true);
                                  return;
                                }
                                setSelectedClassId(entry.classId);
                                setSelectedDate(entry.date);
                                handleConfirmSelection(entry.classId, entry.date);
                                setActiveTab("entry");
                              }}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <BookOpen size={14} /> Editar
                            </button>
                          </div>

                          {isGestorOrDirector && entry.id && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm("Deseja realmente excluir este registro de diário de aula?")) {
                                  await deleteClassDailyDiary(entry.id!);
                                  loadHistory();
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Excluir Diário"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes Completos do Diário de Aula */}
      <AnimatePresence>
        {viewingDetailDiary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
            >
              {/* Header do Modal */}
              <div className="bg-gradient-to-r from-[#016a86] to-[#014e63] p-6 text-white flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-pro-yellow text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-md">
                      {viewingDetailDiary.classType || "Turma"}
                    </span>
                    <span className="text-teal-100 text-xs font-bold">
                      {viewingDetailDiary.date}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight mt-1">
                    {viewingDetailDiary.className || viewingDetailDiary.classCode}
                  </h3>
                  <p className="text-xs text-teal-100/90 font-medium flex items-center gap-2 mt-1">
                    <GraduationCap size={14} className="text-pro-yellow" /> Professor(a):{" "}
                    <strong>{viewingDetailDiary.teacherName || "Não informado"}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingDetailDiary(null)}
                  className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Corpo do Modal */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
                {/* Resumo de Frequência */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
                      Presentes
                    </span>
                    <span className="text-2xl font-black text-emerald-800">
                      {viewingDetailDiary.presentCount || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">
                      Faltas
                    </span>
                    <span className="text-2xl font-black text-rose-800">
                      {viewingDetailDiary.absentCount || 0}
                    </span>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                      Justificadas
                    </span>
                    <span className="text-2xl font-black text-amber-800">
                      {viewingDetailDiary.justifiedCount || 0}
                    </span>
                  </div>
                </div>

                {/* Relato Pedagógico Completo */}
                <div className="bg-amber-50/80 border-2 border-amber-300/80 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-950 uppercase tracking-wider">
                    <Lock size={15} className="text-amber-700" /> Relato da Aula (Confidencial • Equipe Pedagógica)
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                    {viewingDetailDiary.classComment || "Nenhum relato foi cadastrado para esta aula."}
                  </p>
                </div>

                {/* Lista de Chamada dos Alunos */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck size={16} className="text-pro-teal" /> Chamada dos Alunos ({Object.keys(viewingDetailDiary.attendances || {}).length} registrados)
                  </h4>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {Object.entries(viewingDetailDiary.attendances || {}).map(([studentId, status], idx) => {
                      const student = users.find(u => u.id === studentId || u.migratedFrom === studentId || u.migratedTo === studentId);
                      const studentObs = viewingDetailDiary.studentObservations?.[studentId] || "";

                      return (
                        <div key={studentId} className="p-3.5 bg-white flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                            <div className="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                              <Avatar src={student?.photo} fallbackSize={18} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">
                                {student?.name || student?.artisticName || "Aluno"}
                              </p>
                              {studentObs && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5">
                                  Obs: {studentObs}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {status === "presente" ? (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                Presente
                              </span>
                            ) : status === "falta" ? (
                              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                Falta
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                Justificada
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Printer size={14} /> Imprimir / Salvar PDF
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const diaryToEdit = viewingDetailDiary;
                      const clsObj = classes.find(c => c.id === diaryToEdit.classId);
                      const dlInfo = getClassDiaryDeadlineInfo(diaryToEdit.date, clsObj?.time || diaryToEdit.classTime);
                      if (isProfessorOnly && dlInfo.isExpired) {
                        setDeadlineModalData(dlInfo);
                        setIsDeadlineModalOpen(true);
                        return;
                      }
                      setViewingDetailDiary(null);
                      setSelectedClassId(diaryToEdit.classId);
                      setSelectedDate(diaryToEdit.date);
                      handleConfirmSelection(diaryToEdit.classId, diaryToEdit.date);
                      setActiveTab("entry");
                    }}
                    className="px-4 py-2.5 bg-pro-teal text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <BookOpen size={14} /> Editar Lançamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingDetailDiary(null)}
                    className="px-4 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE AVISO: PRAZO DE LANÇAMENTO EXPIRADO (REGRA DE 24H) */}
      <AnimatePresence>
        {isDeadlineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl border border-rose-100 overflow-hidden flex flex-col"
            >
              {/* Header com ícone de alerta */}
              <div className="p-6 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
                    <Clock size={26} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight uppercase">
                      Prazo de Lançamento Expirado
                    </h3>
                    <p className="text-xs text-rose-100 font-bold">
                      Diário de Aula • Regra de 24 Horas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeadlineModalOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Corpo do Modal */}
              <div className="p-6 md:p-8 space-y-6">
                {/* Mensagem Principal */}
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5">
                  <AlertTriangle size={22} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-rose-900">
                      Não é possível fazer o lançamento da frequência
                    </h4>
                    <p className="text-xs text-rose-700 leading-relaxed font-medium">
                      O envio da chamada e do relato de aula deve ser realizado em até <strong>24 horas após a realização da aula</strong>. O prazo limite para esta aula foi ultrapassado.
                    </p>
                  </div>
                </div>

                {/* Detalhes do Prazo */}
                {deadlineModalData && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500">Término da Aula:</span>
                      <span className="font-black text-slate-800">
                        {deadlineModalData.formattedClassEnd}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                      <span className="font-bold text-slate-500">Prazo Limite Encerrou em:</span>
                      <span className="font-black text-rose-600">
                        {deadlineModalData.formattedDeadline}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1">
                      <span className="font-bold text-slate-500">Status Atual:</span>
                      <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-black rounded-lg text-[11px]">
                        {deadlineModalData.formattedTimeRemaining}
                      </span>
                    </div>
                  </div>
                )}

                {/* Orientação Pedagógica */}
                <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  💡 Caso necessite registrar a frequência de uma aula passada por motivo justificado, favor entrar em contato com o <strong>Gestor</strong> ou o <strong>Diretor Pedagógico</strong> da instituição para solicitar a liberação excepcional.
                </p>
              </div>

              {/* Ação */}
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsDeadlineModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-rose-900/10 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
