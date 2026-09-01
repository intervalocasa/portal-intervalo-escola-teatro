/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  UserCircle, 
  Edit, 
  Users, 
  Calendar, 
  Info, 
  UserPlus, 
  X, 
  Search, 
  Plus, 
  LayoutGrid, 
  MessageSquare, 
  Pencil, 
  DollarSign, 
  Award, 
  Lock, 
  UserCheck, 
  UserX,
  CalendarCheck,
  Sparkles,
  Clock,
  Phone,
  Mail,
  History,
  CheckCircle
} from "lucide-react";
import { Class, User, UserRole, ExperimentalClassBooking } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";
import { MuralTurma } from "../components/MuralTurma";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, deleteField, getDoc, collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { getUserDisplayName, getUserSecondaryName } from "../lib/userUtils";

interface ClassDetailsViewProps {
  selectedClassId: string | null;
  setSelectedClassId?: (id: string | null) => void;
  classes: Class[];
  users: User[];
  role: UserRole | null;
  currentUser: any;
  setSelectedUserId: (id: string | null) => void;
  setView: (view: string) => void;
  setClassData: (data: any) => void;
  showNotification: (message: string, title?: string, type?: "success" | "warning" | "error") => void;
  handleAwardBadge?: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
}

export const ClassDetailsView = ({
  selectedClassId,
  setSelectedClassId,
  classes,
  users,
  role,
  currentUser,
  setSelectedUserId,
  setView,
  setClassData,
  showNotification,
  handleAwardBadge
}: ClassDetailsViewProps) => {
  const [activeTab, setActiveTab] = useState<"elenco" | "mural">("elenco");
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollmentProcess, setEnrollmentProcess] = useState<{ studentId: string; date: string; paymentType: "Pagante" | "Isento" } | null>(null);
  
  // States for manager enrollment deletion/management
  const [selectedStudentForManagement, setSelectedStudentForManagement] = useState<User | null>(null);
  const [isExcluding, setIsExcluding] = useState(false);
  const [showConfirmExclude, setShowConfirmExclude] = useState(false);

  // Experimental classes state
  const [experimentalBookings, setExperimentalBookings] = useState<ExperimentalClassBooking[]>([]);

  useEffect(() => {
    const q = query(collection(db, "experimental_classes"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ExperimentalClassBooking[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ExperimentalClassBooking);
      });
      setExperimentalBookings(list);
    }, (err) => {
      console.error("Error fetching experimental_classes in ClassDetailsView:", err);
    });

    return () => unsubscribe();
  }, []);

  const targetClass = classes.find(c => c.id === selectedClassId);
  const isGestorRole = role === "Gestor" || role === "Diretor Pedagógico" || role === "Diretor Pedagógico e Professor" || role === "Auxiliar Administrativo";
  const isGestorOnly = role === "Gestor" || currentUser?.role === "Gestor";
  const isStudent = role === "Aluno" || currentUser?.role === "Aluno";

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const classExperimentalBookings = useMemo(() => {
    if (!targetClass) return [];
    const targetCode = targetClass.code?.trim().toLowerCase();
    const targetId = targetClass.id?.trim().toLowerCase();
    const targetType = targetClass.type?.trim().toLowerCase();

    // Get current local date in YYYY-MM-DD format
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return experimentalBookings.filter(b => {
      if (!b.classGroup && !b.course) return false;

      // Filter out bookings with dates that have already passed
      if (b.date && b.date < todayStr) {
        return false;
      }

      const bookingGroup = (b.classGroup || "").trim().toLowerCase();

      // Direct matches
      if (targetCode && bookingGroup === targetCode) return true;
      if (targetId && bookingGroup === targetId) return true;
      if (targetType && bookingGroup === targetType) return true;

      // Partial inclusion matches
      if (targetCode && bookingGroup && (bookingGroup.includes(targetCode) || targetCode.includes(bookingGroup))) {
        return true;
      }

      return false;
    }).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [experimentalBookings, targetClass]);

  const classTeachers = useMemo(() => {
    return users.filter(u => targetClass?.teacherIds?.includes(u.id));
  }, [users, targetClass?.teacherIds]);
  const enrichedUser = users.find(u => u.id === currentUser?.uid) || users.find(u => u.email?.toLowerCase() === currentUser?.email?.toLowerCase()) || null;
  const classStudents = useMemo(() => {
    return users
      .filter(u => {
        if (!targetClass?.studentIds) return false;

        const isInClass = targetClass.studentIds.includes(u.id) ||
          (u.migratedFrom && targetClass.studentIds.includes(u.migratedFrom)) ||
          targetClass.studentIds.some(sid => {
            const matchingDoc = users.find(uDoc => uDoc.id === sid);
            return matchingDoc && matchingDoc.email?.toLowerCase() === u.email?.toLowerCase();
          });

        if (!isInClass) return false;

        // Check if student's enrollment status in this class is inactive or if user account is inactive
        const status = targetClass.studentEnrollmentStatuses?.[u.id] ||
                       (u.migratedFrom && targetClass.studentEnrollmentStatuses?.[u.migratedFrom]);

        if (status === "Inativo" || u.inactive) {
          return false;
        }

        return true;
      })
      .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'pt-BR'));
  }, [users, targetClass?.studentIds, targetClass?.studentEnrollmentStatuses]);

  const availableStudents = useMemo(() => {
    if (!targetClass) return [];
    return users
      .filter(u => 
        u.role === "Aluno" && 
        !targetClass.studentIds?.includes(u.id) &&
        (getUserDisplayName(u).toLowerCase().includes(searchQuery.toLowerCase()) || 
         getUserSecondaryName(u)?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'pt-BR'));
  }, [users, targetClass, searchQuery]);

  if (!targetClass) return null;

  const handleEnroll = async () => {
    if (!selectedClassId || !enrollmentProcess) return;
    const { studentId, date, paymentType } = enrollmentProcess;
    
    if (!date) {
      showNotification("Por favor, selecione a data de matrícula.", "Aviso", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const classRef = doc(db, "classes", selectedClassId);
      await updateDoc(classRef, {
        studentIds: arrayUnion(studentId),
        [`enrollmentDates.${studentId}`]: date,
        [`studentPaymentTypes.${studentId}`]: paymentType || "Pagante"
      });
      setSearchQuery("");
      setEnrollmentProcess(null);
      showNotification("Aluno matriculado com sucesso!", "Sucesso", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `classes/${selectedClassId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeEnrollModal = () => {
    setIsEnrollModalOpen(false);
    setSearchQuery("");
    setEnrollmentProcess(null);
  };

  const handleExcludeEnrollment = async (studentId: string) => {
    if (!selectedClassId) return;
    setIsExcluding(true);
    try {
      const studentUser = users.find(u => u.id === studentId);
      const studentEmail = studentUser?.email?.trim().toLowerCase();

      const allStudentIdsToRemove = new Set<string>();
      allStudentIdsToRemove.add(studentId);
      if (studentUser?.migratedFrom) {
        allStudentIdsToRemove.add(studentUser.migratedFrom);
      }
      if (studentEmail) {
        users.forEach(u => {
          if (u.email?.trim().toLowerCase() === studentEmail) {
            allStudentIdsToRemove.add(u.id);
            if (u.migratedFrom) allStudentIdsToRemove.add(u.migratedFrom);
          }
        });
      }

      const classRef = doc(db, "classes", selectedClassId);
      const classSnap = await getDoc(classRef);
      if (classSnap.exists()) {
        const cData = classSnap.data();
        const currentStudentIds: string[] = cData.studentIds || [];
        const currentEnrollmentDates: Record<string, string> = { ...(cData.enrollmentDates || {}) };

        const newStudentIds = currentStudentIds.filter(id => !allStudentIdsToRemove.has(id));
        allStudentIdsToRemove.forEach(id => {
          delete currentEnrollmentDates[id];
        });

        await updateDoc(classRef, {
          studentIds: newStudentIds,
          enrollmentDates: currentEnrollmentDates
        });
      }

      showNotification("Matrícula excluída com sucesso!", "Sucesso", "success");
      setSelectedStudentForManagement(null);
      setShowConfirmExclude(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `classes/${selectedClassId}`);
    } finally {
      setIsExcluding(false);
    }
  };

  return (
    <motion.div
      key="class-details-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-6xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-20">
         <div className="absolute top-6 left-6 md:top-10 md:left-10 z-20">
           <BackButton 
            onClick={() => setView(role === "Aluno" ? "dashboard" : "classes_list")}
            className="!text-white pointer-events-auto"
           />
         </div>
         <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
         <h1 className="text-white text-xl md:text-5xl font-black uppercase tracking-tight">{targetClass.code}</h1>
         <div className="flex items-center gap-3 mt-2">
           <span className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/10 backdrop-blur-md">
             {targetClass.type}
           </span>
           <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 backdrop-blur-md ${targetClass.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
             {targetClass.isActive ? 'Ativa' : 'Inativa'}
           </span>
         </div>
      </div>
      <div className="flex-1 p-8 md:p-16 overflow-y-auto custom-scrollbar bg-slate-50">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* Layout: Sidebar on right for stats/teacher, main content on left */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            <div className="lg:col-span-2 space-y-10">
              
              {/* Tab Switcher */}
              <div className="flex p-1.5 bg-white rounded-[24px] border border-slate-100 shadow-sm w-fit">
                <button
                  onClick={() => setActiveTab("elenco")}
                  className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === "elenco" ? 'bg-pro-teal text-white shadow-lg shadow-teal-900/10' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid size={16} />
                  Elenco
                </button>
                <button
                  onClick={() => setActiveTab("mural")}
                  className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === "mural" ? 'bg-pro-teal text-white shadow-lg shadow-teal-900/10' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <MessageSquare size={16} />
                  Mural da Turma
                </button>
              </div>

              {activeTab === "elenco" ? (
                /* Elenco View */
                <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pro-teal/5 rounded-2xl flex items-center justify-center text-pro-teal"><Users size={24} /></div>
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Estudantes do Elenco</h2>
                    </div>
                    {isGestorRole && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setIsEnrollModalOpen(true)}
                          className="p-4 bg-pro-yellow text-pro-teal rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-yellow-900/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          <UserPlus size={16} /> Matricular Aluno
                        </button>
                        <button 
                          onClick={() => {
                            if (targetClass) {
                              if (setSelectedClassId) {
                                setSelectedClassId(targetClass.id);
                              }
                              setClassData({
                                id: targetClass.id,
                                code: targetClass.code,
                                type: targetClass.type,
                                teacherIds: targetClass.teacherIds || [],
                                studentIds: targetClass.studentIds || [],
                                isActive: targetClass.isActive,
                                inactivationReason: targetClass.inactivationReason || "",
                                year: targetClass.year,
                                weekday: targetClass.weekday || "",
                                time: targetClass.time || "",
                                startDate: targetClass.startDate || ""
                              });
                              setView("edit_class");
                            }
                          }}
                          className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          <Edit size={16} /> Editar Turma
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SEÇÃO DE AULAS EXPERIMENTAIS AGENDADAS (Visível para todos exceto Aluno) */}
                  {!isStudent && classExperimentalBookings.length > 0 && (
                    <div className="p-6 md:p-7 bg-gradient-to-br from-indigo-50/90 via-sky-50/40 to-white rounded-3xl border-2 border-indigo-100 shadow-xs space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xs">
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                                Aulas Experimentais Agendadas
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                                {classExperimentalBookings.length} {classExperimentalBookings.length === 1 ? "Agendamento" : "Agendamentos"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              Alunos(as) com aula experimental agendada para esta turma
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
                        {classExperimentalBookings.map((exp) => (
                          <div
                            key={exp.id}
                            className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                          >
                            {/* Cabeçalho do Card: Nome Completo e Status de Confirmação */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100/80 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                  {exp.studentName?.charAt(0)?.toUpperCase() || "A"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight break-words leading-snug">
                                    {exp.studentName}
                                  </h4>
                                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                    {exp.course || targetClass.type} {exp.classTime ? `• ${exp.classTime}` : ""}
                                  </p>
                                </div>
                              </div>

                              {/* Status de Confirmação Prévia de Presença */}
                              <div className="shrink-0 self-start">
                                {exp.attendanceConfirmation === "CONFIRMOU_VESPERA" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
                                    <CalendarCheck size={12} className="text-indigo-700 shrink-0" />
                                    <span>Confirmou na véspera</span>
                                  </span>
                                ) : exp.attendanceConfirmation === "CONFIRMOU_NO_DIA" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">
                                    <CheckCircle size={12} className="text-emerald-700 shrink-0" />
                                    <span>Confirmou no dia</span>
                                  </span>
                                ) : exp.attendanceConfirmation === "REAGENDOU" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
                                    <History size={12} className="text-amber-700 shrink-0" />
                                    <span>Reagendou</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                                    <Clock size={11} className="text-slate-400 shrink-0" />
                                    <span>Confirmação pendente</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Data da Aula & Reagendamento */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <Calendar size={13} className="text-indigo-600 shrink-0" />
                                <span className="font-bold">
                                  Data da Aula: <strong className="text-indigo-950 font-black">{formatDateBR(exp.date)}</strong>
                                </span>
                                {exp.dayOfWeek && (
                                  <span className="text-[11px] text-indigo-700 font-semibold">
                                    ({exp.dayOfWeek})
                                  </span>
                                )}
                              </div>

                              {/* Alerta / Tag se reagendado */}
                              {((exp.rescheduleCount && exp.rescheduleCount > 0) || exp.attendanceConfirmation === "REAGENDOU") && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <History size={11} />
                                  Data atualizada após reagendamento
                                </span>
                              )}
                            </div>

                            {/* Detalhes de contato ou observação se houver */}
                            {(exp.studentPhone || exp.studentEmail || exp.notes) && (
                              <div className="text-[11px] text-slate-500 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {exp.studentPhone && (
                                    <span className="flex items-center gap-1">
                                      <Phone size={11} className="text-slate-400" /> {exp.studentPhone}
                                    </span>
                                  )}
                                  {exp.studentEmail && (
                                    <span className="flex items-center gap-1">
                                      <Mail size={11} className="text-slate-400" /> {exp.studentEmail}
                                    </span>
                                  )}
                                </div>
                                {exp.notes && (
                                  <p className="text-[10px] text-slate-500 italic truncate">
                                    Obs: {exp.notes}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classStudents.length > 0 ? (
                      classStudents.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            if (isGestorRole) {
                              setSelectedStudentForManagement(s);
                            } else if (role === "Professor") {
                              setSelectedUserId(s.id);
                              setView("user_details");
                            }
                          }}
                          className={`p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-4 group transition-all text-left w-full relative ${role !== "Aluno" ? "cursor-pointer hover:bg-white hover:border-pro-teal" : "cursor-default"}`}
                        >
                          <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden flex items-center justify-center text-slate-300 shadow-sm">
                            <Avatar src={s.photo} fallbackSize={24} className="w-full h-full rounded-none" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-black text-slate-700 uppercase tracking-tight leading-none">{getUserDisplayName(s)}</p>
                              {targetClass.studentEnrollmentStatuses?.[s.id] === "Trancado" && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                  Trancado(a)
                                </span>
                              )}
                              {targetClass.studentEnrollmentStatuses?.[s.id] === "Inativo" && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                                  Inativo(a)
                                </span>
                              )}
                              {isGestorOnly && (
                                targetClass.studentPaymentTypes?.[s.id] === "Isento" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                    Isento
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                                    Pagante
                                  </span>
                                )
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getUserSecondaryName(s) || s.pronouns || "..."}</p>
                          </div>
                          {targetClass.enrollmentDates?.[s.id] && (
                            <div className="absolute top-2 right-4 flex items-center gap-1.5 text-slate-300">
                              <Calendar size={10} />
                              <span className="text-[8px] font-black uppercase tracking-widest">
                                {new Date(targetClass.enrollmentDates[s.id] + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                          {isGestorRole && (
                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-pro-teal group-hover:text-white flex items-center justify-center text-slate-400 transition-colors shrink-0">
                              <Pencil size={14} />
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                        <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhum aluno matriculado nesta turma.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mural View */
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <MuralTurma 
                    classId={targetClass.id} 
                    currentUser={enrichedUser} 
                    handleAwardBadge={handleAwardBadge}
                  />
                </div>
              )}

              {!targetClass.isActive && targetClass.inactivationReason && (
                <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 space-y-4">
                  <div className="flex items-center gap-3 text-red-600">
                    <Info size={20} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Motivo da Inativação</h4>
                  </div>
                  <p className="text-sm text-red-700/70 font-semibold leading-relaxed">"{targetClass.inactivationReason}"</p>
                </div>
              )}
            </div>

            <div className="space-y-10">
              {/* Teacher Info */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-widest border-b border-slate-50 pb-4">Professor(es) Responsável(eis)</h4>
                {classTeachers.length > 0 ? (
                  <div className="space-y-4">
                    {classTeachers.map(teacher => (
                      <div key={teacher.id} className="flex flex-col items-center text-center gap-4 p-4 rounded-3xl bg-slate-50/50 border border-slate-100">
                        <div className="w-20 h-20 rounded-[28px] bg-white overflow-hidden flex items-center justify-center text-slate-200 border-4 border-white shadow-lg">
                          <Avatar src={teacher.photo} fallbackSize={40} className="w-full h-full rounded-none" />
                        </div>
                        <div>
                          <h5 className="font-black text-slate-800 uppercase tracking-tight text-sm">{getUserDisplayName(teacher)}</h5>
                          <p className="text-[9px] font-black text-pro-teal uppercase tracking-widest mt-1 bg-pro-teal/5 px-3 py-1 rounded-full">{getUserSecondaryName(teacher) || teacher.pronouns || "Professor"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-bold italic text-center py-4">Nenhum professor vinculado</p>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50 pb-4">Resumo da Turma</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3 text-slate-400"><Users size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Capacidade</span></div>
                    <span className="text-sm font-black text-slate-700">{classStudents.length} de 20</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3 text-slate-400"><Calendar size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Data de Início</span></div>
                    <span className="text-sm font-black text-slate-700">
                      {targetClass.startDate ? new Date(targetClass.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : targetClass.year}
                    </span>
                  </div>
                  {targetClass.weekday && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3 text-slate-400"><Calendar size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Dias</span></div>
                      <span className="text-sm font-black text-slate-700">{targetClass.weekday}</span>
                    </div>
                  )}
                  {targetClass.time && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-3 text-slate-400"><Calendar size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Horário</span></div>
                      <span className="text-sm font-black text-slate-700">{targetClass.time}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      <AnimatePresence>
        {isEnrollModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeEnrollModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-yellow/10 rounded-2xl flex items-center justify-center text-pro-orange">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Matricular Aluno</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pesquise e adicione novos alunos</p>
                  </div>
                </div>
                <button 
                  onClick={closeEnrollModal}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {!enrollmentProcess ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text"
                        placeholder="Buscar aluno por nome..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-pro-teal focus:bg-white transition-all"
                      />
                    </div>

                    <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                      {availableStudents.length > 0 ? (
                        availableStudents.map(student => (
                          <div 
                            key={student.id}
                            className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-pro-teal transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shadow-sm">
                                <Avatar src={student.photo} fallbackSize={20} className="w-full h-full rounded-none" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{getUserDisplayName(student)}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getUserSecondaryName(student) || student.pronouns || "..."}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setEnrollmentProcess({ studentId: student.id, date: new Date().toISOString().split('T')[0], paymentType: "Pagante" })}
                              disabled={isSubmitting}
                              className="p-3 bg-pro-teal text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-teal-900/10 disabled:opacity-50 disabled:scale-100"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ))
                      ) : searchQuery ? (
                        <div className="py-12 text-center">
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">Nenhum aluno encontrado</p>
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">Inicie uma busca...</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                      <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden shadow-md">
                        <Avatar src={users.find(u => u.id === enrollmentProcess.studentId)?.photo} fallbackSize={32} className="w-full h-full rounded-none" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest mb-1">Matriculando aluno:</p>
                        <p className="text-lg font-black text-slate-800 uppercase tracking-tight">
                          {(() => {
                            const student = users.find(u => u.id === enrollmentProcess.studentId);
                            return student?.artisticName || student?.name;
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Data de Matrícula</label>
                       <input 
                        type="date"
                        value={enrollmentProcess.date}
                        onChange={(e) => setEnrollmentProcess(prev => prev ? ({ ...prev, date: e.target.value }) : null)}
                        className="w-full px-8 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black text-slate-800 focus:outline-none focus:border-pro-teal focus:bg-white transition-all"
                       />
                    </div>

                    {isGestorOnly && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Condição do Aluno</label>
                         <div className="grid grid-cols-2 gap-3">
                           <button
                             type="button"
                             onClick={() => setEnrollmentProcess(prev => prev ? ({ ...prev, paymentType: "Pagante" }) : null)}
                             className={`py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition-all ${
                               enrollmentProcess.paymentType === "Pagante"
                                 ? "bg-pro-teal text-white border-pro-teal shadow-md"
                                 : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                             }`}
                           >
                             <DollarSign size={16} /> Pagante
                           </button>
                           <button
                             type="button"
                             onClick={() => setEnrollmentProcess(prev => prev ? ({ ...prev, paymentType: "Isento" }) : null)}
                             className={`py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition-all ${
                               enrollmentProcess.paymentType === "Isento"
                                 ? "bg-amber-500 text-white border-amber-500 shadow-md"
                                 : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                             }`}
                           >
                             <Award size={16} /> Isento
                           </button>
                         </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => setEnrollmentProcess(null)}
                        className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                      >
                        Voltar
                      </button>
                      <button 
                        onClick={handleEnroll}
                        disabled={isSubmitting}
                        className="flex-[2] py-4 bg-pro-teal text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:brightness-110 shadow-lg shadow-teal-900/20 transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? "Processando..." : "Confirmar Matrícula"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage Enrollment Modal */}
      <AnimatePresence>
        {selectedStudentForManagement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isExcluding) {
                  setSelectedStudentForManagement(null);
                  setShowConfirmExclude(false);
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-teal/10 rounded-2xl flex items-center justify-center text-pro-teal">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gerenciar Matrícula</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de gerenciamento de matrícula</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedStudentForManagement(null);
                    setShowConfirmExclude(false);
                  }}
                  disabled={isExcluding}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                  <div className="w-16 h-16 rounded-2xl bg-white overflow-hidden shadow-md shrink-0">
                    <Avatar src={selectedStudentForManagement.photo} fallbackSize={32} className="w-full h-full rounded-none" />
                  </div>
                  <div className="min-w-0">
                    {(() => {
                      const currentStatus = targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] || "Ativo";
                      let statusLabel = "Status: Matriculado(a)";
                      let statusColor = "text-pro-teal";
                      if (currentStatus === "Trancado") {
                        statusLabel = "Status: Trancado(a)";
                        statusColor = "text-amber-600";
                      } else if (currentStatus === "Inativo") {
                        statusLabel = "Status: Inativo(a)";
                        statusColor = "text-rose-600";
                      }
                      return (
                        <p className={`text-[10px] font-black ${statusColor} uppercase tracking-widest mb-1`}>
                          {statusLabel}
                        </p>
                      );
                    })()}
                    <p className="text-lg font-black text-slate-800 uppercase tracking-tight truncate">
                      {selectedStudentForManagement.artisticName || selectedStudentForManagement.name}
                    </p>
                    <p className="text-xs text-slate-400 font-bold truncate">
                      {selectedStudentForManagement.email}
                    </p>
                  </div>
                </div>

                {targetClass.enrollmentDates?.[selectedStudentForManagement.id] && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Calendar size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Data de Matrícula</span>
                    </div>
                    <span className="text-xs font-black text-slate-700 bg-white border border-slate-100 px-3 py-1 rounded-xl">
                      {new Date(targetClass.enrollmentDates[selectedStudentForManagement.id] + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                {isGestorOnly && (
                  <>
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Matrícula na Turma</span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                          targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] === "Trancado"
                            ? "bg-amber-100 text-amber-800"
                            : targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] === "Inativo"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-teal-50 text-teal-700"
                        }`}>
                          {targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] || "Ativo"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedClassId || !selectedStudentForManagement) return;
                            try {
                              await updateDoc(doc(db, "classes", selectedClassId), {
                                [`studentEnrollmentStatuses.${selectedStudentForManagement.id}`]: "Ativo"
                              });
                              showNotification("Matrícula ativada com sucesso!", "Sucesso", "success");
                            } catch (err) {
                              showNotification("Erro ao atualizar status da matrícula.", "Erro", "error");
                            }
                          }}
                          className={`py-2.5 px-2 rounded-xl font-extrabold text-[10px] uppercase flex items-center justify-center gap-1.5 border transition-all ${
                            (!targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] || targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] === "Ativo")
                              ? "bg-pro-teal text-white border-pro-teal shadow-md"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <UserCheck size={13} /> Ativo
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedClassId || !selectedStudentForManagement) return;
                            try {
                              await updateDoc(doc(db, "classes", selectedClassId), {
                                [`studentEnrollmentStatuses.${selectedStudentForManagement.id}`]: "Trancado"
                              });
                              showNotification("Matrícula trancada com sucesso!", "Sucesso", "success");
                            } catch (err) {
                              showNotification("Erro ao atualizar status da matrícula.", "Erro", "error");
                            }
                          }}
                          className={`py-2.5 px-2 rounded-xl font-extrabold text-[10px] uppercase flex items-center justify-center gap-1.5 border transition-all ${
                            targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] === "Trancado"
                              ? "bg-amber-500 text-white border-amber-500 shadow-md"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <Lock size={13} /> Trancar
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedClassId || !selectedStudentForManagement) return;
                            try {
                              await updateDoc(doc(db, "classes", selectedClassId), {
                                [`studentEnrollmentStatuses.${selectedStudentForManagement.id}`]: "Inativo"
                              });
                              showNotification("Matrícula inativada com sucesso!", "Sucesso", "success");
                            } catch (err) {
                              showNotification("Erro ao atualizar status da matrícula.", "Erro", "error");
                            }
                          }}
                          className={`py-2.5 px-2 rounded-xl font-extrabold text-[10px] uppercase flex items-center justify-center gap-1.5 border transition-all ${
                            targetClass.studentEnrollmentStatuses?.[selectedStudentForManagement.id] === "Inativo"
                              ? "bg-rose-600 text-white border-rose-600 shadow-md"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <UserX size={13} /> Inativar
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condição Financeira na Turma</span>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${
                        targetClass.studentPaymentTypes?.[selectedStudentForManagement.id] === "Isento"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-teal-50 text-teal-700"
                      }`}>
                        {targetClass.studentPaymentTypes?.[selectedStudentForManagement.id] || "Pagante"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedClassId || !selectedStudentForManagement) return;
                          try {
                            await updateDoc(doc(db, "classes", selectedClassId), {
                              [`studentPaymentTypes.${selectedStudentForManagement.id}`]: "Pagante"
                            });
                            showNotification("Aluno alterado para Pagante nesta turma!", "Sucesso", "success");
                          } catch (err) {
                            showNotification("Erro ao atualizar condição de pagamento.", "Erro", "error");
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all ${
                          (targetClass.studentPaymentTypes?.[selectedStudentForManagement.id] || "Pagante") === "Pagante"
                            ? "bg-pro-teal text-white border-pro-teal shadow-md"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <DollarSign size={14} /> Definição: Pagante
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedClassId || !selectedStudentForManagement) return;
                          try {
                            await updateDoc(doc(db, "classes", selectedClassId), {
                              [`studentPaymentTypes.${selectedStudentForManagement.id}`]: "Isento"
                            });
                            showNotification("Aluno alterado para Isento nesta turma!", "Sucesso", "success");
                          } catch (err) {
                            showNotification("Erro ao atualizar condição de pagamento.", "Erro", "error");
                          }
                        }}
                        className={`py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-all ${
                          targetClass.studentPaymentTypes?.[selectedStudentForManagement.id] === "Isento"
                            ? "bg-amber-500 text-white border-amber-500 shadow-md"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Award size={14} /> Definição: Isento
                      </button>
                    </div>
                  </div>
                </>
              )}

                {showConfirmExclude ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-red-50 border border-red-100 rounded-[24px] space-y-4"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-black text-red-800 uppercase">Tem certeza absoluta?</p>
                      <p className="text-xs text-red-700 font-semibold leading-normal">
                        Ao confirmar, o aluno será removido da listagem da turma e suas notas, frequências ou conquistas associadas a essa turma poderão ficar inacessíveis. Esta ação é imediata.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setShowConfirmExclude(false)}
                        disabled={isExcluding}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => handleExcludeEnrollment(selectedStudentForManagement.id)}
                        disabled={isExcluding}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-red-700 transition-all shadow-lg shadow-red-900/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isExcluding ? "Excluindo..." : "Confirmar Exclusão"}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        setSelectedUserId(selectedStudentForManagement.id);
                        setView("user_details");
                        setSelectedStudentForManagement(null);
                      }}
                      className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                    >
                      Visualizar Perfil Completo
                    </button>
                    
                    <button 
                      onClick={() => setShowConfirmExclude(true)}
                      className="w-full py-4 bg-red-50 hover:bg-red-100/70 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 animate-in fade-in zoom-in-95"
                    >
                      Excluir Matrícula
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
