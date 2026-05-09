/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, UserCircle, Edit, Users, Calendar, Info, UserPlus, X, Search, Plus, LayoutGrid, MessageSquare } from "lucide-react";
import { Class, User, UserRole } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";
import { MuralTurma } from "../components/MuralTurma";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";

interface ClassDetailsViewProps {
  selectedClassId: string | null;
  classes: Class[];
  users: User[];
  role: UserRole | null;
  currentUser: any;
  setSelectedUserId: (id: string | null) => void;
  setView: (view: string) => void;
  setClassData: (data: any) => void;
  showNotification: (message: string, title?: string, type?: "success" | "warning" | "error") => void;
  handleAwardBadge?: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string) => Promise<void>;
}

export const ClassDetailsView = ({
  selectedClassId,
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
  const [enrollmentProcess, setEnrollmentProcess] = useState<{ studentId: string; date: string } | null>(null);

  const targetClass = classes.find(c => c.id === selectedClassId);
  const classTeachers = useMemo(() => {
    return users.filter(u => targetClass?.teacherIds?.includes(u.id));
  }, [users, targetClass?.teacherIds]);
  const enrichedUser = users.find(u => u.id === currentUser?.uid) || null;
  const classStudents = useMemo(() => {
    return users
      .filter(u => targetClass?.studentIds?.includes(u.id))
      .sort((a, b) => (a.artisticName || a.name || "").localeCompare(b.artisticName || b.name || "", 'pt-BR'));
  }, [users, targetClass?.studentIds]);

  const availableStudents = useMemo(() => {
    if (!targetClass) return [];
    return users
      .filter(u => 
        u.role === "Aluno" && 
        !targetClass.studentIds?.includes(u.id) &&
        (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.artisticName?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => (a.artisticName || a.name || "").localeCompare(b.artisticName || b.name || "", 'pt-BR'));
  }, [users, targetClass, searchQuery]);

  if (!targetClass) return null;

  const handleEnroll = async () => {
    if (!selectedClassId || !enrollmentProcess) return;
    const { studentId, date } = enrollmentProcess;
    
    if (!date) {
      showNotification("Por favor, selecione a data de matrícula.", "Aviso", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const classRef = doc(db, "classes", selectedClassId);
      await updateDoc(classRef, {
        studentIds: arrayUnion(studentId),
        [`enrollmentDates.${studentId}`]: date
      });
      setSearchQuery("");
      setEnrollmentProcess(null);
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
                    {role === "Gestor" && (
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classStudents.length > 0 ? (
                      classStudents.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => {
                            if (role !== "Aluno") {
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
                            <p className="text-sm font-black text-slate-700 uppercase tracking-tight leading-none mb-1">{s.artisticName || s.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.artisticName ? s.name : "..."}</p>
                          </div>
                          {targetClass.enrollmentDates?.[s.id] && (
                            <div className="absolute top-2 right-4 flex items-center gap-1.5 text-slate-300">
                              <Calendar size={10} />
                              <span className="text-[8px] font-black uppercase tracking-widest">
                                {new Date(targetClass.enrollmentDates[s.id] + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
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
                          <h5 className="font-black text-slate-800 uppercase tracking-tight text-sm">{teacher.name}</h5>
                          <p className="text-[9px] font-black text-pro-teal uppercase tracking-widest mt-1 bg-pro-teal/5 px-3 py-1 rounded-full">{teacher.artisticName || "Professor"}</p>
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
                    <span className="text-sm font-black text-slate-700">{targetClass.studentIds?.length || 0} de 20</span>
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
                                <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{student.artisticName || student.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{student.artisticName ? student.name : "..."}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setEnrollmentProcess({ studentId: student.id, date: new Date().toISOString().split('T')[0] })}
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
    </motion.div>
  );
};
