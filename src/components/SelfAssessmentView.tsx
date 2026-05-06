
import React from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  ChevronDown, 
  Eye, 
  CheckCircle2, 
  LogOut, 
  Drama,
  ArrowLeft 
} from 'lucide-react';
import { Logo, BackButton } from './CommonComponents';
import { 
  ADULT_CRITERIA, 
  ADULT_OPEN_QUESTIONS, 
  PROFESSIONAL_CRITERIA_BASE, 
  PROFESSIONAL_CRITERIA_MONTAGEM, 
  PROFESSIONAL_OPEN_QUESTIONS, 
  SCALES 
} from '../constants';
import { Class, User, Evaluation } from '../types';

interface SelfAssessmentViewProps {
  assessmentMonth: number;
  setAssessmentMonth: (val: number) => void;
  assessmentYear: number;
  setAssessmentYear: (val: number) => void;
  assessmentForm: any;
  setAssessmentForm: React.Dispatch<React.SetStateAction<any>>;
  viewingEvaluation: Evaluation | null;
  setViewingEvaluation: (val: Evaluation | null) => void;
  classes: Class[];
  users: User[];
  evaluations: Evaluation[];
  currentUser: any;
  setView: (val: string) => void;
  handleAssessmentSubmit: (e: React.FormEvent) => void;
}

export const SelfAssessmentView: React.FC<SelfAssessmentViewProps> = ({
  assessmentMonth,
  setAssessmentMonth,
  assessmentYear,
  setAssessmentYear,
  assessmentForm,
  setAssessmentForm,
  viewingEvaluation,
  setViewingEvaluation,
  classes,
  users,
  evaluations,
  currentUser,
  setView,
  handleAssessmentSubmit
}) => {
  return (
    <motion.div
      key="assessment-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
       {/* Back Button Overlay */}
       <div className="absolute top-4 left-4 z-20">
         <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
       </div>
       <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-8 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
         <Logo className="h-10 md:h-16 w-auto mb-1" />
         <h1 className="text-white text-xl md:text-3xl font-bold uppercase tracking-tight">Autoavaliação Mensal</h1>
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Acompanhe seu desempenho</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12">
        <div className="max-w-7xl mx-auto w-full">
          {/* 0. Month/Year Selection (Always Visible if not viewing specifically) */}
          {!viewingEvaluation && (
            <div className="mb-10 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pro-teal/10 rounded-2xl flex items-center justify-center text-pro-teal shadow-inner">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Período de Avaliação</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione o mês de referência</p>
                </div>
              </div>
              
              <div className="flex gap-3 w-full md:w-auto">
                <select
                  value={assessmentMonth}
                  onChange={(e) => setAssessmentMonth(Number(e.target.value))}
                  disabled={!!assessmentForm.classId}
                  className="flex-1 md:w-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:border-pro-teal disabled:opacity-50"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                    </option>
                  ))}
                </select>
                <select
                  value={assessmentYear}
                  onChange={(e) => setAssessmentYear(Number(e.target.value))}
                  disabled={!!assessmentForm.classId}
                  className="w-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:border-pro-teal disabled:opacity-50"
                >
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 1. Class Selection */}
          {!assessmentForm.classId && !viewingEvaluation ? (
            <div className="space-y-6">
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Selecione sua Turma</h2>
                <p className="text-slate-500 font-bold">Para qual destas turmas deseja realizar a autoavaliação de {new Date(0, assessmentMonth - 1).toLocaleString('pt-BR', { month: 'long' })}?</p>
              </div>
              
              <div className="grid gap-4">
                {classes.filter(c => c.studentIds?.includes(currentUser?.uid)).length > 0 ? (
                  classes.filter(c => c.studentIds?.includes(currentUser?.uid)).map(c => {
                    const m = assessmentMonth;
                    const y = assessmentYear;
                    const hasSubmitted = evaluations.find(e => e.studentId === currentUser.uid && e.classId === c.id && e.month === m && e.year === y);
                    
                    return (
                      <motion.button
                        key={c.id}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          if (hasSubmitted) {
                            setViewingEvaluation(hasSubmitted);
                          } else {
                            setAssessmentForm((prev: any) => ({ ...prev, classId: c.id }));
                          }
                        }}
                        className="w-full p-6 bg-white rounded-2xl flex items-center justify-between border-2 border-slate-100 hover:border-pro-teal transition-all group shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-50 rounded-xl text-pro-teal group-hover:bg-pro-teal group-hover:text-white transition-colors">
                            <Calendar size={24} />
                          </div>
                          <div className="text-left">
                            <div className="font-black text-slate-800 uppercase tracking-tight">{c.code}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.type}</div>
                          </div>
                        </div>
                        {hasSubmitted ? (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Eye size={12} /> Ver Enviada
                          </div>
                        ) : (
                          <ChevronDown size={20} className="text-slate-300 -rotate-90" />
                        )}
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4">
                    <p className="text-slate-400 font-bold italic px-8">Nenhuma turma vinculada ao seu cadastro ainda. Aguarde a ativação pela secretaria.</p>
                    <button 
                      onClick={() => setView("dashboard")}
                      className="text-pro-teal font-black uppercase tracking-widest text-[10px] hover:underline"
                    >
                      Voltar ao Painel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : viewingEvaluation ? (
            /* 2. Viewing Mode (Read-Only) */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-green-50 border border-green-100 p-6 rounded-3xl flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-green-800 font-black uppercase tracking-tight">Avaliação enviada com sucesso</p>
                  <p className="text-green-700/70 text-[10px] font-black uppercase tracking-widest">Referente a {new Date(0, viewingEvaluation.month - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / {viewingEvaluation.year}</p>
                </div>
                <button 
                  onClick={() => {
                    setAssessmentForm({
                      classId: viewingEvaluation.classId,
                      notes: viewingEvaluation.notes,
                      openAnswers: viewingEvaluation.openAnswers || {}
                    });
                    setAssessmentMonth(viewingEvaluation.month);
                    setAssessmentYear(viewingEvaluation.year);
                    setViewingEvaluation(null);
                  }}
                  className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-all ml-auto"
                >
                  Editar
                </button>
                <button 
                  onClick={() => setViewingEvaluation(null)}
                  className="ml-auto text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors"
                >
                  <LogOut size={20} className="rotate-180" />
                </button>
              </div>

              <div className="grid gap-6">
                {(viewingEvaluation.classType === "Curso Livre - Montagem Profissional" 
                  ? [...PROFESSIONAL_CRITERIA_BASE, ...PROFESSIONAL_CRITERIA_MONTAGEM] 
                  : ADULT_CRITERIA
                ).map((c, i) => (
                  <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Critério {i + 1}</span>
                        <h3 className="text-slate-800 font-black uppercase tracking-tight">{(c as any).label}</h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed italic">"{(c as any).definition}"</p>
                      </div>
                      
                      <div className="p-4 bg-pro-teal/5 rounded-2xl border-2 border-pro-teal/10 flex items-center gap-4">
                        <div className="w-10 h-10 bg-pro-teal text-white rounded-xl flex items-center justify-center shadow-lg shadow-teal-900/10">
                          <CheckCircle2 size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest mb-1">Minha Percepção:</p>
                          <p className="text-xs font-bold text-slate-700 leading-tight">
                            {SCALES.find(s => Number(viewingEvaluation.notes[c.id]) === Number(s.value))?.label || 
                             SCALES.slice().reverse().find(s => Number(viewingEvaluation.notes[c.id]) >= Number(s.value))?.label || "Sem avaliação"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Open Questions Viewing */}
                {(viewingEvaluation.classType === "Curso Livre - Montagem Profissional" 
                  ? PROFESSIONAL_OPEN_QUESTIONS 
                  : ADULT_OPEN_QUESTIONS
                ).map(q => (
                  viewingEvaluation.openAnswers?.[q.id] && (
                    <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.label}</h4>
                      <p className="text-slate-700 font-medium whitespace-pre-wrap">{viewingEvaluation.openAnswers[q.id]}</p>
                    </div>
                  )
                ))}
              </div>

              <div className="pt-8 flex justify-center">
                <button 
                  onClick={() => {
                    setViewingEvaluation(null);
                    setView("dashboard");
                  }}
                  className="px-10 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors uppercase tracking-widest text-[10px] font-black"
                >
                  Voltar ao Painel
                </button>
              </div>
            </div>
          ) : (
            /* 3. Form Mode (New Submission) */
            <form onSubmit={handleAssessmentSubmit} className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-pro-teal border border-teal-400/20 p-8 rounded-3xl text-white relative overflow-hidden group shadow-xl">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <Drama size={24} className="text-pro-yellow" />
                    <h2 className="text-xl font-black uppercase tracking-tight">Autoavaliação ({new Date(0, assessmentMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / {assessmentYear})</h2>
                  </div>
                  <p className="text-teal-50/70 text-sm font-bold max-w-lg">
                    Turma: {classes.find(c => c.id === assessmentForm.classId)?.code} - {classes.find(c => c.id === assessmentForm.classId)?.type}
                  </p>
                </div>
                <div className="absolute right-[-5%] bottom-[-20%] opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <Logo className="h-40 w-auto" />
                </div>
              </div>

              <div className="space-y-8">
                 {(classes.find(c => c.id === assessmentForm.classId)?.type === "Curso Livre - Montagem Profissional"
                   ? [...PROFESSIONAL_CRITERIA_BASE, ...PROFESSIONAL_CRITERIA_MONTAGEM]
                   : ADULT_CRITERIA
                 ).map((c, i) => (
                   <div key={c.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                     <div className="space-y-2">
                       <div className="flex items-center gap-3">
                         <span className="w-8 h-8 bg-pro-teal/10 text-pro-teal rounded-lg flex items-center justify-center text-xs font-black">{i + 1}</span>
                         <h3 className="text-slate-800 font-black uppercase tracking-tight text-lg">{(c as any).label}</h3>
                       </div>
                       <p className="text-slate-500 text-sm font-bold leading-relaxed ml-11">
                         {(c as any).definition}
                       </p>
                     </div>

                     <div className="pt-4 ml-0 md:ml-11">
                       <div className="grid grid-cols-1 gap-2">
                         {SCALES.map((s) => (
                           <button
                             key={s.value}
                             type="button"
                             onClick={() => setAssessmentForm((prev: any) => ({
                               ...prev,
                               notes: { ...prev.notes, [c.id]: Number(s.value) }
                             }))}
                             className={`w-full p-4 rounded-2xl text-xs font-bold transition-all text-left flex items-center gap-3 border-2 ${
                               Number(assessmentForm.notes[c.id]) === Number(s.value)
                               ? "bg-pro-teal/5 border-pro-teal text-pro-teal shadow-inner"
                               : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                             }`}
                           >
                             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                               Number(assessmentForm.notes[c.id]) === Number(s.value)
                               ? "bg-pro-teal border-pro-teal text-white scale-110"
                               : "bg-white border-slate-200"
                             }`}>
                               {Number(assessmentForm.notes[c.id]) === Number(s.value) && <CheckCircle2 size={12} />}
                             </div>
                             {s.label}
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>
                 ))}

                 {/* Open Questions */}
                 {(classes.find(c => c.id === assessmentForm.classId)?.type === "Curso Livre - Montagem Profissional"
                   ? PROFESSIONAL_OPEN_QUESTIONS
                   : ADULT_OPEN_QUESTIONS
                 ).map(q => (
                   <div key={q.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                     <div className="flex items-center gap-3">
                       <h3 className="text-slate-800 font-black uppercase tracking-tight text-lg">{q.label}</h3>
                     </div>
                     <textarea
                       className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-bold text-slate-700 focus:border-pro-teal outline-none transition-all placeholder:text-slate-300 min-h-[150px]"
                       placeholder={q.placeholder}
                       value={assessmentForm.openAnswers[q.id] || ""}
                       onChange={(e) => setAssessmentForm((prev: any) => ({
                         ...prev,
                         openAnswers: { ...prev.openAnswers, [q.id]: e.target.value }
                       }))}
                     />
                   </div>
                 ))}
              </div>

              <div className="sticky bottom-8 flex gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => setAssessmentForm({ classId: "", notes: {}, openAnswers: {} })}
                  className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest text-[10px] shadow-lg"
                >
                  Cancelar / Trocar Turma
                </button>
                <button
                  type="submit"
                  disabled={
                    Object.keys(assessmentForm.notes).length < (classes.find(c => c.id === assessmentForm.classId)?.type === "Curso Livre - Montagem Profissional" ? 12 : 10)
                  }
                  className="flex-[2] py-5 bg-pro-teal text-white font-black rounded-2xl shadow-xl shadow-teal-900/20 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  Enviar Autoavaliação
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </motion.div>
  );
};
