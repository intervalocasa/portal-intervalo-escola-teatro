/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { UserCircle, Presentation, ArrowLeft, Drama, Download, Clock, Lock, AlertTriangle } from "lucide-react";
import { User, Class, Diary, Evaluation } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";
import { generateDiaryPDF } from "../lib/pdfExporter";
import { getUserDisplayName, getUserSecondaryName } from "../lib/userUtils";
import { getMonthlyDeadline } from "../lib/deadlineUtils";
import { DeadlineExpiredModal } from "../components/DeadlineExpiredModal";

interface ProfessorDiaryViewProps {
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
  diaryFilterMonth: number;
  setDiaryFilterMonth: (m: number) => void;
  diaryFilterYear: number;
  setDiaryFilterYear: (y: number) => void;
  classes: Class[];
  users: User[];
  diaries: Diary[];
  evaluations?: Evaluation[];
  currentUser: User | null;
  setSelectedDiaryStudentId: (id: string) => void;
  setDiaryFormData: (data: any) => void;
  setView: (view: string) => void;
}

export const ProfessorDiaryView = ({
  selectedClassId,
  setSelectedClassId,
  diaryFilterMonth,
  setDiaryFilterMonth,
  diaryFilterYear,
  setDiaryFilterYear,
  classes,
  users,
  diaries,
  evaluations = [],
  currentUser,
  setSelectedDiaryStudentId,
  setDiaryFormData,
  setView
}: ProfessorDiaryViewProps) => {
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [expiredModalStudent, setExpiredModalStudent] = useState<string | undefined>(undefined);

  const teacherClasses = classes.filter(c => c.teacherIds?.includes(currentUser?.id || ""));
  const targetClass = classes.find(c => c.id === selectedClassId);

  const deadlineInfo = useMemo(() => {
    return getMonthlyDeadline(diaryFilterMonth, diaryFilterYear);
  }, [diaryFilterMonth, diaryFilterYear]);

  const classStudents = useMemo(() => {
    if (!targetClass?.studentIds) return [];
    return users
      .filter(u => targetClass.studentIds.includes(u.id))
      .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'pt-BR'));
  }, [targetClass?.studentIds, users]);

  return (
    <>
      <motion.div
        key="professor-diary-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-4xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
      >
        {/* Back Button Overlay */}
        <div className="absolute top-4 left-4 z-20">
          <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
        </div>

        <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
           <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
           <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">Diário de Notas</h1>
           <p className="text-teal-50/80 text-xs font-bold uppercase tracking-widest">Avaliações e Critérios Pedagógicos</p>
           <div className="flex items-center gap-3 mt-2">
             <div className="px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white/90 border border-white/10 backdrop-blur-md flex items-center gap-2">
                <UserCircle size={12} className="text-pro-yellow" />
                {getUserDisplayName(currentUser)}
             </div>
           </div>
        </div>

        <div className="p-8 md:p-16 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
          <div className="max-w-7xl mx-auto w-full space-y-8">
            {/* Shortcut to Diário de Aula */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-amber-400/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Lançar Chamada e Presença de Aula</p>
                  <p className="text-[10px] font-bold text-slate-500">O registro de frequência e relato de aula agora possui uma página própria.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setView("class_diary")}
                className="px-4 py-2 bg-pro-teal hover:bg-pro-teal/90 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0"
              >
                Abrir Diário de Aula
              </button>
            </div>

            {/* Filters & Deadline Info */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turma</label>
                  <select
                    value={selectedClassId || ""}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                  >
                    <option value="">Selecione uma turma</option>
                    {teacherClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mês</label>
                  <select
                    value={diaryFilterMonth}
                    onChange={(e) => setDiaryFilterMonth(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ano</label>
                  <select
                    value={diaryFilterYear}
                    onChange={(e) => setDiaryFilterYear(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                  >
                    {[2023, 2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Banner de status do prazo */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Clock size={16} className={deadlineInfo.isExpired ? "text-rose-600" : "text-pro-teal"} />
                  <span className="font-bold text-slate-600">
                    Prazo institucional para diários de <strong>{deadlineInfo.formattedReference}</strong>:
                  </span>
                </div>
                {deadlineInfo.isExpired ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 font-black uppercase tracking-wider text-[10px] rounded-xl border border-rose-200">
                    <Lock size={12} /> Prazo encerrou em {deadlineInfo.formattedDeadline} às 23:59
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 font-black uppercase tracking-wider text-[10px] rounded-xl border border-emerald-200">
                    Até {deadlineInfo.formattedDeadline} às 23:59 ({deadlineInfo.daysRemaining} dias restantes)
                  </div>
                )}
              </div>
            </div>

            {/* Students List */}
            {selectedClassId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lista de Alunos matriculados</h3>
                   <span className="text-[10px] font-black text-pro-teal uppercase tracking-widest bg-pro-teal/5 px-3 py-1 rounded-full">
                     {targetClass?.studentIds?.length || 0} ALUNOS
                   </span>
                </div>
                
                <div className="grid gap-3">
                  {classStudents.map((student: User) => {
                    const sid = student.id;
                    const diary = diaries.find(d => 
                      d.studentId === sid && 
                      d.classId === selectedClassId && 
                      d.month === diaryFilterMonth && 
                      d.year === diaryFilterYear
                    );
                    
                    return (
                      <div 
                        key={sid}
                        onClick={() => {
                          if (deadlineInfo.isExpired) {
                            setExpiredModalStudent(getUserDisplayName(student));
                            setShowExpiredModal(true);
                            return;
                          }

                          setSelectedDiaryStudentId(sid);
                          if (diary) {
                            setDiaryFormData({
                              presences: diary.presences || 0,
                              absences: diary.absences || 0,
                              frequencyObs: diary.frequencyObs || "",
                              weeklyAttendance: diary.weeklyAttendance || {},
                              grades: diary.grades || {},
                              criteriaObs: diary.criteriaObs || {},
                              generalPedagogicalObs: diary.generalPedagogicalObs || ""
                            });
                          } else {
                            setDiaryFormData({
                              presences: 0,
                              absences: 0,
                              frequencyObs: "",
                              weeklyAttendance: {},
                              grades: {},
                              criteriaObs: {},
                              generalPedagogicalObs: ""
                            });
                          }
                          setView("student_diary_form");
                        }}
                        className={`bg-white p-5 rounded-[28px] border shadow-sm transition-all group flex flex-col md:flex-row md:items-center gap-6 cursor-pointer ${
                          deadlineInfo.isExpired 
                            ? "border-slate-100 hover:border-rose-300 hover:bg-rose-50/10" 
                            : "border-slate-100 hover:shadow-md hover:border-pro-teal/30"
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 overflow-hidden">
                            <Avatar src={student?.photo} fallbackSize={24} className="w-full h-full rounded-none" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{getUserDisplayName(student) || "Aluno Desconhecido"}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{getUserSecondaryName(student) ? `Nome social: ${getUserSecondaryName(student)}${student?.pronouns ? ` • Pronomes: ${student.pronouns}` : ''}` : (student?.pronouns ? `Pronomes: ${student.pronouns}` : "...")}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-8 md:gap-12">
                           <div className="text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                              {diary?.status === "concluido" ? (
                                <span className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100">Concluído</span>
                              ) : diary?.status === "rascunho" ? (
                                <span className="px-3 py-1 bg-pro-yellow/10 text-pro-orange text-[9px] font-black uppercase tracking-widest rounded-full border border-pro-yellow/20">Rascunho</span>
                              ) : (
                                <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-slate-100">Não Iniciado</span>
                              )}
                           </div>

                           <div className="text-center flex gap-6">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pres.</p>
                                <p className="text-sm font-black text-slate-700">{diary?.presences || 0}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Faltas</p>
                                <p className="text-sm font-black text-slate-700">{diary?.absences || 0}</p>
                              </div>
                           </div>

                           <div className="text-center border-l border-slate-100 pl-8 flex items-center gap-4">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Média</p>
                                <p className={`text-lg font-black ${diary?.status === 'concluido' ? 'text-pro-teal' : 'text-slate-300'}`}>
                                  {diary?.averageGrade ? diary.averageGrade.toFixed(1) : "—"}
                                </p>
                              </div>
                              {diary && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const stEval = evaluations.find(ev => ev.studentId === student.id && ev.classId === selectedClassId && ev.month === diaryFilterMonth && ev.year === diaryFilterYear);
                                    generateDiaryPDF({
                                      studentName: getUserDisplayName(student),
                                      artisticName: student?.artisticName,
                                      className: targetClass?.code || "Turma",
                                      classType: targetClass?.type,
                                      teacherName: getUserDisplayName(currentUser) || "Professor",
                                      month: diaryFilterMonth,
                                      year: diaryFilterYear,
                                      presences: diary.presences || 0,
                                      absences: diary.absences || 0,
                                      frequencyObs: diary.frequencyObs,
                                      grades: diary.grades || {},
                                      criteriaObs: diary.criteriaObs || {},
                                      generalPedagogicalObs: diary.generalPedagogicalObs || "",
                                      averageGrade: diary.averageGrade,
                                      studentEval: stEval,
                                      status: diary.status
                                    });
                                  }}
                                  className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                                  title="Baixar PDF do Diário"
                                >
                                  <Download size={16} />
                                </button>
                              )}
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-6 bg-white rounded-[40px] border border-slate-100 shadow-sm">
                <div className="w-24 h-24 bg-pro-teal/5 rounded-full flex items-center justify-center mx-auto text-pro-teal/30">
                  <Presentation size={48} />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Selecione uma turma para iniciar</h3>
                   <p className="text-sm text-slate-500 font-bold max-w-sm mx-auto">Após selecionar a turma, você verá a lista de alunos para registro de frequência e avaliação mensal.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-center">
          <button 
            onClick={() => setView("dashboard")} 
            className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-600 transition-colors"
          >
            Voltar ao Menu Principal
          </button>
        </div>
      </motion.div>

      {/* MODAL DE PRAZO DE DIÁRIO EXPIRADO */}
      <DeadlineExpiredModal
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
        type="professor_diary"
        referencePeriod={deadlineInfo.formattedReference}
        formattedDeadline={deadlineInfo.formattedDeadline}
        studentName={expiredModalStudent}
        className={targetClass ? `${targetClass.code} - ${targetClass.type}` : undefined}
      />
    </>
  );
};
