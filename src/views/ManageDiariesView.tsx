/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Search, LayoutGrid, Calendar, ChevronRight, BookOpen, CheckCircle2, Pencil, Trash2, Eye, ArrowLeft, MessageSquare, Clock, CheckCircle, PlusCircle, Filter } from "lucide-react";
import { User, Class, Diary, Evaluation, PedagogicalMeetingRequest } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";
import { db } from "../lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { generateDiaryPDF } from "../lib/pdfExporter";
import { getUserDisplayName, isStudentInactiveInClass } from "../lib/userUtils";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassId, setFilterClassId] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Exclude inactive students from grade diaries
  const activeDiaries = useMemo(() => {
    return diaries.filter(d => {
      const student = users.find(u => u.id === d.studentId || u.migratedFrom === d.studentId || u.migratedTo === d.studentId);
      const classOfDiary = classes.find(c => c.id === d.classId);
      if (student && isStudentInactiveInClass(student, classOfDiary)) {
        return false;
      }
      return true;
    });
  }, [diaries, users, classes]);

  const filteredDiaries = useMemo(() => {
    return activeDiaries.filter(d => {
      const student四周 = users.find(u => u.id === d.studentId || u.migratedFrom === d.studentId || u.migratedTo === d.studentId);
      const studentName = (d.studentName || (student四周 ? getUserDisplayName(student四周) : "") || "").toLowerCase();
      const className = (d.className || "").toLowerCase();
      const teacherName四周 = (d.teacherName || "").toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || studentName.includes(term) || className.includes(term) || teacherName四周.includes(term);
      const matchesClass = filterClassId === "all" || d.classId === filterClassId;
      const matchesMonth = filterMonth === "all" || d.month === Number(filterMonth);
      const matchesYear = filterYear === "all" || d.year === Number(filterYear);
      const matchesStatus = filterStatus === "all" || d.status === filterStatus;

      return matchesSearch && matchesClass && matchesMonth && matchesYear && matchesStatus;
    });
  }, [activeDiaries, users, searchTerm, filterClassId, filterMonth, filterYear, filterStatus]);

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
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Acompanhamento e Lançamento de Notas</p>
         <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
           <button
             type="button"
             onClick={() => setView("professor_diary")}
             className="px-6 py-2.5 bg-pro-yellow text-slate-900 rounded-full text-xs font-black uppercase tracking-wider shadow-lg hover:brightness-105 transition-all flex items-center gap-2"
           >
             <PlusCircle size={16} />
             Lançar Notas no Diário
           </button>
           <button
             type="button"
             onClick={() => setView("class_diary")}
             className="px-6 py-2.5 bg-white/10 text-white rounded-full text-xs font-black uppercase tracking-wider border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
           >
             <Clock size={16} />
             Diários de Aula
           </button>
         </div>
      </div>

      <div className="flex-1 p-6 md:p-12 overflow-y-auto bg-slate-50">
         <div className="max-w-7xl mx-auto w-full space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-teal/5 rounded-2xl flex items-center justify-center text-pro-teal"><BookOpen size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Diários</p>
                     <p className="text-2xl font-black text-slate-800">{activeDiaries.length}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500"><CheckCircle2 size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Concluídos</p>
                     <p className="text-2xl font-black text-green-600">{activeDiaries.filter(d => d.status === "concluido").length}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-yellow/5 rounded-2xl flex items-center justify-center text-pro-orange"><Pencil size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rascunhos</p>
                     <p className="text-2xl font-black text-pro-orange">{activeDiaries.filter(d => d.status === "rascunho").length}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-pro-orange/5 rounded-2xl flex items-center justify-center text-pro-orange"><LayoutGrid size={24} /></div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Média Geral</p>
                     <p className="text-2xl font-black text-slate-800">
                       {(activeDiaries.filter(d => d.averageGrade).reduce((a, b) => a + (b.averageGrade || 0), 0) / (activeDiaries.filter(d => d.averageGrade).length || 1)).toFixed(2)}
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

            {/* Filter and Search Bar */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pro-teal/10 rounded-xl flex items-center justify-center text-pro-teal">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Diários Cadastrados</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Exibindo {filteredDiaries.length} de {activeDiaries.length} diários
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setView("professor_diary")}
                  className="w-full md:w-auto px-5 py-2.5 bg-pro-teal text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-pro-teal/90 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <PlusCircle size={16} />
                  Lançar Notas por Turma
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                <div className="md:col-span-2 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar aluno, turma ou professor..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  />
                </div>

                <div>
                  <select
                    value={filterClassId}
                    onChange={(e) => setFilterClassId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  >
                    <option value="all">Todas as Turmas</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  >
                    <option value="all">Todos os Meses</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-pro-teal"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="concluido">Concluídos</option>
                    <option value="rascunho">Rascunhos</option>
                  </select>
                </div>
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
                  {filteredDiaries.length > 0 ? (
                    filteredDiaries
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
                              <span className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-green-100">Concluído</span>
                            ) : (
                              <span className="px-3 py-1 bg-pro-yellow/10 text-pro-orange text-[9px] font-black uppercase tracking-widest rounded-full border border-pro-yellow/20">Rascunho</span>
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
                                    unworkedCriteria: d.unworkedCriteria || {},
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
                                    weeklyAttendance: d.weeklyAttendance || {},
                                    grades: d.grades || {},
                                    unworkedCriteria: d.unworkedCriteria || {},
                                    criteriaObs: d.criteriaObs || {},
                                    generalPedagogicalObs: d.generalPedagogicalObs || ""
                                  });
                                  setView("student_diary_form");
                                }}
                                className="p-2.5 bg-pro-teal/10 text-pro-teal rounded-xl hover:bg-pro-teal hover:text-white transition-all shadow-sm flex items-center gap-1.5 px-3"
                                title="Lançar / Editar Notas"
                              >
                                <Pencil size={15} />
                                <span className="text-[10px] font-black uppercase">Editar / Lançar</span>
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
                      <td colSpan={8} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                        {diaries.length === 0 ? "Nenhum diário registrado ainda" : "Nenhum diário encontrado para os filtros selecionados"}
                      </td>
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
