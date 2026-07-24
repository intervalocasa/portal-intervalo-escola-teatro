/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Download, Search, LayoutGrid, Calendar, ChevronRight, BookOpen, CheckCircle2, Pencil, Trash2, Eye, ArrowLeft, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { User, Class, Diary, Evaluation, PedagogicalMeetingRequest } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";
import { db } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { generateDiaryPDF } from "../lib/pdfExporter";

interface ManageDiariesViewProps {
  diaries: Diary[];
  users: User[];
  classes?: Class[];
  evaluations?: Evaluation[];
  pedagogicalRequests: PedagogicalMeetingRequest[];
  setSelectedClassId: (id: string | null) => void;
  setSelectedDiaryStudentId: (id: string | null) => void;
  setDiaryFilterMonth: (m: number) => void;
  setDiaryFilterYear: (y: number) => void;
  setDiaryFormData: (data: any) => void;
  setView: (view: string) => void;
  handleDeleteDiary: (id: string) => void;
}

export const ManageDiariesView = ({
  diaries,
  users,
  classes = [],
  evaluations = [],
  pedagogicalRequests = [],
  setSelectedClassId,
  setSelectedDiaryStudentId,
  setDiaryFilterMonth,
  setDiaryFilterYear,
  setDiaryFormData,
  setView,
  handleDeleteDiary
}: ManageDiariesViewProps) => {

  const handleUpdateRequestStatus = async (requestId: string, status: 'pendente' | 'em_atendimento' | 'concluido') => {
    try {
      await updateDoc(doc(db, "pedagogical-requests", requestId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating request status:", error);
    }
  };

  return (
    <motion.div
      key="manage-diaries-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-6xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      {/* Back Button Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
      </div>

      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
         <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
         <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">Gestão de Diários</h1>
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Acompanhamento e Auditoria Pedagógica</p>
      </div>

      <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-slate-50">
         <div className="max-w-7xl mx-auto w-full space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-teal/5 rounded-2xl flex items-center justify-center text-pro-teal"><BookOpen size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Diários</p>
                     <p className="text-2xl font-black text-slate-800">{diaries.length}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500"><CheckCircle2 size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Concluídos</p>
                     <p className="text-2xl font-black text-green-600">{diaries.filter(d => d.status === "concluido").length}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-yellow/5 rounded-2xl flex items-center justify-center text-pro-orange"><Pencil size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rascunhos</p>
                     <p className="text-2xl font-black text-pro-orange">{diaries.filter(d => d.status === "rascunho").length}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-orange/5 rounded-2xl flex items-center justify-center text-pro-orange"><LayoutGrid size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média Geral</p>
                     <p className="text-2xl font-black text-slate-800">
                       {(diaries.filter(d => d.averageGrade).reduce((a, b) => a + (b.averageGrade || 0), 0) / (diaries.filter(d => d.averageGrade).length || 1)).toFixed(2)}
                     </p>
                  </div>
               </div>
            </div>

            {/* Pedagogical Meeting Requests Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pro-teal/10 rounded-xl flex items-center justify-center text-pro-teal">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Solicitações de Agendamento Pedagógico</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tracking-widest">Alunos que desejam conversar sobre seu desempenho</p>
                </div>
                {pedagogicalRequests.filter(r => r.status === 'pendente').length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full animate-pulse">
                    {pedagogicalRequests.filter(r => r.status === 'pendente').length} NOVAS
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {pedagogicalRequests
                    .sort((a, b) => {
                      const dateA = a.createdAt?.toDate?.() || new Date(0);
                      const dateB = b.createdAt?.toDate?.() || new Date(0);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .map((request) => (
                      <motion.div
                        key={request.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-5 rounded-3xl border shadow-sm transition-all ${
                          request.status === 'pendente' 
                            ? 'bg-white border-pro-yellow/20 ring-1 ring-pro-yellow/5' 
                            : request.status === 'em_atendimento'
                            ? 'bg-white border-blue-100'
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={users.find(u => u.id === request.studentId)?.photo} 
                              className="w-10 h-10"
                            />
                            <div>
                              <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{request.studentName}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{request.className}</p>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            request.status === 'pendente' 
                              ? 'bg-pro-yellow/10 text-pro-orange border border-pro-yellow/20' 
                              : request.status === 'em_atendimento'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : 'bg-green-50 text-green-600 border border-green-100'
                          }`}>
                            {request.status === 'pendente' ? 'Pendente' : request.status === 'em_atendimento' ? 'Em Aberto' : 'Concluído'}
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <Calendar size={12} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">
                              {request.createdAt?.toDate?.().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) || 'Recentemente'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {request.status === 'pendente' && (
                            <button
                              onClick={() => handleUpdateRequestStatus(request.id!, 'em_atendimento')}
                              className="flex-1 py-2 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                              <Clock size={14} /> Atender
                            </button>
                          )}
                          {request.status === 'em_atendimento' && (
                            <button
                              onClick={() => handleUpdateRequestStatus(request.id!, 'concluido')}
                              className="flex-1 py-2 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                              <CheckCircle size={14} /> Concluir
                            </button>
                          )}
                          {request.status === 'concluido' && (
                            <div className="w-full py-2 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                              <CheckCircle2 size={14} /> Finalizado
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  {pedagogicalRequests.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Nenhuma solicitação pendente</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluno</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma / Tipo</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Referência</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Freq.</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Notas</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Professor</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap px-8">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {diaries.length > 0 ? (
                    diaries
                    .sort((a, b) => (a.studentName || "").localeCompare(b.studentName || "", 'pt-BR'))
                    .map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                               <Avatar 
                                 src={users.find(u => u.id === d.studentId)?.photo} 
                                 className="w-8 h-8"
                               />
                               <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{d.studentName}</span>
                            </div>
                         </td>
                         <td className="px-6 py-5">
                            <div className="space-y-0.5">
                               <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{d.className}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{d.classType?.split(" - ")[1] || d.classType}</p>
                            </div>
                         </td>
                         <td className="px-6 py-5 text-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{String(d.month).padStart(2, '0')}/{d.year}</span>
                          </td>
                         <td className="px-6 py-5 text-center">
                            <div className="flex flex-col items-center">
                               <span className="text-[10px] font-black text-green-500">{d.presences}P</span>
                               <span className="text-[10px] font-black text-red-400">{d.absences}F</span>
                            </div>
                         </td>
                         <td className="px-6 py-5 text-center">
                            <span className={`text-sm font-black ${d.status === 'concluido' ? 'text-pro-teal' : 'text-slate-300'}`}>
                              {d.averageGrade ? d.averageGrade.toFixed(1) : "—"}
                            </span>
                         </td>
                         <td className="px-6 py-5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.teacherName}</span>
                         </td>
                         <td className="px-6 py-5 text-center">
                            {d.status === "concluido" ? (
                              <span className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100">C</span>
                            ) : (
                              <span className="px-3 py-1 bg-pro-yellow/10 text-pro-orange text-[9px] font-black uppercase tracking-widest rounded-full border border-pro-yellow/20">R</span>
                            )}
                         </td>
                         <td className="px-6 py-5 text-right px-8">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const cls = classes.find(c => c.id === d.classId);
                                  const stEval = evaluations.find(ev => ev.studentId === d.studentId && ev.classId === d.classId && ev.month === d.month && ev.year === d.year);
                                  generateDiaryPDF({
                                    studentName: d.studentName || "Aluno",
                                    className: d.className || cls?.code || "Turma",
                                    classType: d.classType || cls?.type,
                                    teacherName: d.teacherName || "Professor Responsável",
                                    month: d.month,
                                    year: d.year,
                                    presences: d.presences || 0,
                                    absences: d.absences || 0,
                                    frequencyObs: d.frequencyObs,
                                    grades: d.grades || {},
                                    criteriaObs: d.criteriaObs || {},
                                    generalPedagogicalObs: d.generalPedagogicalObs || "",
                                    averageGrade: d.averageGrade,
                                    studentEval: stEval,
                                    status: d.status
                                  });
                                }}
                                className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                title="Baixar PDF do Diário"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedClassId(d.classId);
                                  setSelectedDiaryStudentId(d.studentId);
                                  setDiaryFilterMonth(d.month);
                                  setDiaryFilterYear(d.year);
                                  setDiaryFormData({
                                    presences: d.presences || 0,
                                    absences: d.absences || 0,
                                    frequencyObs: d.frequencyObs || "",
                                    grades: d.grades || {},
                                    criteriaObs: d.criteriaObs || {},
                                    generalPedagogicalObs: d.generalPedagogicalObs || ""
                                  });
                                  setView("student_diary_form");
                                }}
                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-pro-teal hover:text-white transition-all shadow-sm"
                                title="Visualizar/Editar"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteDiary(d.id)}
                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">Nenhum diário registrado ainda</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
  );
};
