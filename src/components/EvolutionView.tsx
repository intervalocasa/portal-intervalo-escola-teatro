
import { 
  Drama, 
  BarChart3, 
  ChevronRight, 
  TrendingUp, 
  CheckCircle2, 
  HelpCircle, 
  AlertCircle,
  X,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { Logo, BackButton } from './CommonComponents';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';
import { 
  ADULT_COURSE_CRITERIA, 
  PROFESSIONAL_COURSE_CRITERIA, 
  GRADE_LEGEND,
  SCALES
} from '../constants';

interface EvolutionViewProps {
  evaluations: any[];
  diaries: any[];
  currentUser: any;
  users: any[];
  classes: any[];
  expandedPeriods: Set<string>;
  setExpandedPeriods: React.Dispatch<React.SetStateAction<Set<string>>>;
  setAnalyticsClassId: (id: string) => void;
  setView: (view: string) => void;
}

export const EvolutionView: React.FC<EvolutionViewProps> = ({
  evaluations,
  diaries,
  currentUser,
  users,
  classes,
  expandedPeriods,
  setExpandedPeriods,
  setAnalyticsClassId,
  setView
}) => {
  const [helpLevelModal, setHelpLevelModal] = React.useState<{ title: string; detail: string; motivation: string } | null>(null);
  const [meetingModal, setMeetingModal] = React.useState<{ classId: string; className: string } | null>(null);
  const [isScheduling, setIsScheduling] = React.useState(false);
  const [scheduleSuccess, setScheduleSuccess] = React.useState(false);

  const studentEvals = evaluations.filter(e => e.studentId === currentUser?.uid);
  
  // Robust diary filtering: first try by studentId, then heal by name if needed
  const studentDiariesById = diaries.filter(d => d.studentId === currentUser?.uid);
  const otherOrphanedDiaries = diaries.filter(d => 
    d.studentId !== currentUser?.uid && 
    d.studentName === currentUser?.name &&
    // Only consider it orphaned if the studentId in the diary doesn't exist in our users list anymore
    !users.some(u => u.id === d.studentId)
  );

  const studentDiaries = [...studentDiariesById, ...otherOrphanedDiaries];
  
  const handleScheduleRequest = async () => {
    if (!meetingModal || !currentUser) return;
    setIsScheduling(true);
    try {
      await addDoc(collection(db, "pedagogical-requests"), {
        studentId: currentUser.uid,
        studentName: currentUser.displayName || currentUser.name || "Aluno",
        classId: meetingModal.classId,
        className: meetingModal.className,
        status: "pendente",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setScheduleSuccess(true);
      setTimeout(() => {
        setScheduleSuccess(false);
        setMeetingModal(null);
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "pedagogical-requests");
    } finally {
      setIsScheduling(false);
    }
  };

  const periods = new Map<string, any>();
  
  studentEvals.forEach(e => {
    const key = `${e.month}-${e.year}-${e.classId}`;
    if (!periods.has(key)) periods.set(key, { month: e.month, year: e.year, classId: e.classId, classType: e.classType });
    periods.get(key).selfAssessment = e;
  });
  
  studentDiaries.forEach(d => {
    const key = `${d.month}-${d.year}-${d.classId}`;
    if (!periods.has(key)) periods.set(key, { month: d.month, year: d.year, classId: d.classId, classType: d.classType, className: d.className, teacherName: d.teacherName });
    periods.get(key).professorDiary = d;
  });
  
  const sortedPeriods = Array.from(periods.values()).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  const studentClasses = Array.from(new Set(sortedPeriods.map(p => p.classId)));

  return (
    <motion.div
      key="evolution-screen"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      {/* Back Button Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
      </div>
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
        <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
        <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">Painel de Evolução</h1>
        <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Acompanhamento Mensal de Progresso</p>
      </div>
      
      <div className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar bg-slate-50">
        <div className="max-w-7xl mx-auto w-full space-y-8">
          {sortedPeriods.length === 0 ? (
            <div className="py-20 text-center space-y-6 bg-white rounded-[40px] border border-slate-100 shadow-sm">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Drama size={48} />
              </div>
              <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ainda não há dados de evolução</h3>
                  <p className="text-sm text-slate-400 font-bold max-w-xs mx-auto">Realize sua autoavaliação mensal para começar a acompanhar seu progresso.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {studentClasses.map(classId => (
                  <button
                    key={classId}
                    onClick={() => {
                      setAnalyticsClassId(classId);
                      setView("evolution_charts");
                    }}
                    className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pro-teal/10 rounded-2xl flex items-center justify-center text-pro-teal">
                        <BarChart3 size={24} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest">Acompanhamento</p>
                        <h4 className="text-sm font-black text-slate-800 uppercase">
                          Seu desempenho geral ao longo do tempo
                        </h4>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-pro-teal transition-colors" />
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {sortedPeriods.map(period => {
                  const key = `${period.month}-${period.year}-${period.classId}`;
                  const isProfessional = period.classType?.toLowerCase().includes("prof") || period.classType?.toLowerCase().includes("montagem");
                  const weightSelf = isProfessional ? 2 : 3;
                  const weightProf = isProfessional ? 2 : 1;
                  
                  const selfCompleted = period.selfAssessment && period.selfAssessment.notes;
                  const profCompleted = period.professorDiary && period.professorDiary.status === "concluido";
                  
                  const selfAvg = selfCompleted 
                    ? (Object.values(period.selfAssessment.notes) as any[]).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) / Object.values(period.selfAssessment.notes).length
                    : null;
                  
                  const profAvg = profCompleted ? period.professorDiary.averageGrade : null;
                  
                  let finalGrade = null;
                  let statusText = "Aguardando dados";
                  let statusColor = "text-slate-400 bg-slate-50";

                  if (selfCompleted && profCompleted) {
                    finalGrade = (selfAvg! * weightSelf + profAvg! * weightProf) / 4;
                    statusText = "Concluída";
                    statusColor = "text-green-600 bg-green-50 border-green-100";
                  } else if (selfCompleted) {
                    statusText = "Aguardando professor";
                    statusColor = "text-pro-teal bg-pro-teal/5 border-pro-teal/10";
                  } else if (profCompleted) {
                    statusText = "Aguardando você";
                    statusColor = "text-pro-orange bg-pro-orange/5 border-pro-orange/10";
                  }

                  const isExpanded = expandedPeriods.has(key);

                  return (
                    <div key={key} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden transition-all hover:bg-slate-50/50 cursor-pointer" onClick={() => {
                      if (!finalGrade) return;
                      setExpandedPeriods(prev => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      });
                    }}>
                      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex flex-col items-center justify-center text-pro-teal border border-slate-100 shadow-inner group-hover:bg-pro-teal group-hover:text-white transition-colors">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40">{period.year}</span>
                            <span className="text-xl font-black leading-none">{new Date(0, period.month - 1).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <Drama size={14} className="text-pro-teal" />
                              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none break-all line-clamp-2">
                                {classes.find(c => c.id === period.classId)?.code || "Turma Especial"}
                              </h3>
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{period.classType}</p>
                            <div className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColor}`}>
                              {statusText}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-center md:pl-8 md:border-l border-slate-100">
                            <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest mb-1">Status de Evolução</p>
                            <div className="flex items-center gap-3">
                              {finalGrade ? (
                                <div className="flex flex-col items-end max-w-[200px]">
                                  <div className={`font-black text-slate-900 uppercase tracking-tight text-right leading-tight ${isProfessional ? 'text-2xl' : 'text-sm md:text-base'}`}>
                                    {(() => {
                                      if (isProfessional) {
                                        return (
                                          <div className="flex items-center gap-2" onClick={(e) => {
                                            e.stopPropagation();
                                            setMeetingModal({ 
                                              classId: period.classId, 
                                              className: classes.find(c => c.id === period.classId)?.code || "Turma"
                                            });
                                          }}>
                                            <div className="bg-slate-100 p-2 rounded-xl text-slate-400 hover:text-pro-teal transition-all">
                                              <Drama size={32} />
                                            </div>
                                          </div>
                                        );
                                      }
                                      const val = finalGrade;
                                      const item = val === 0 ? GRADE_LEGEND[0] : 
                                                   val <= 3 ? GRADE_LEGEND[1] : 
                                                   val <= 6 ? GRADE_LEGEND[2] : 
                                                   val <= 9 ? GRADE_LEGEND[3] : 
                                                   GRADE_LEGEND[4];
                                      return item.studentLabel;
                                    })()}
                                  </div>
                                  {!isProfessional && (
                                    <p className="text-[8px] font-black text-pro-teal uppercase opacity-50">Média Calculada</p>
                                  )}
                                  {isProfessional && (
                                    <p className="text-[8px] font-black text-slate-400 uppercase">Ver Notas</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-4xl font-black text-slate-100">—</p>
                              )}
                              
                              {finalGrade && !isProfessional && (
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-pro-teal text-white' : 'bg-slate-50 text-slate-400'}`}>
                                  <TrendingUp size={20} className={isExpanded ? "rotate-180 transition-transform" : ""} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && finalGrade && (
                        <div className="border-t border-slate-50 bg-slate-50/30 p-6 md:p-8 animate-in slide-in-from-top-4 duration-300">
                          {!isProfessional ? (
                            <>
                              <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-pro-teal/10 flex items-center justify-center text-pro-teal shrink-0">
                                    <CheckCircle2 size={18} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase mb-1">Seu Feedback do Mês</p>
                                    <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                                      {(() => {
                                        const val = finalGrade;
                                        const item = val === 0 ? GRADE_LEGEND[0] : 
                                                     val <= 3 ? GRADE_LEGEND[1] : 
                                                     val <= 6 ? GRADE_LEGEND[2] : 
                                                     val <= 9 ? GRADE_LEGEND[3] : 
                                                     GRADE_LEGEND[4];
                                        return (item as any).motivation;
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {ADULT_COURSE_CRITERIA.map(c => {
                                  const selfNote = Number(period.selfAssessment?.notes?.[c.id] || 0);
                                  const profNote = Number(period.professorDiary?.grades?.[c.id] || 0);
                                  const compAvg = (selfNote * weightSelf + profNote * weightProf) / 4;
                                  
                                  const legendItem = compAvg === 0 ? GRADE_LEGEND[0] : 
                                                   compAvg <= 3 ? GRADE_LEGEND[1] : 
                                                   compAvg <= 6 ? GRADE_LEGEND[2] : 
                                                   compAvg <= 9 ? GRADE_LEGEND[3] : 
                                                   GRADE_LEGEND[4];

                                  return (
                                    <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                                      <div>
                                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{c.label}</h4>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Competência</p>
                                      </div>
                                      <div className="flex items-end justify-between border-t border-slate-50 pt-2">
                                        <div className="w-full">
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                            <p className="text-[10px] font-black text-pro-teal uppercase tracking-tight leading-none">
                                              {legendItem.studentLabel}
                                            </p>
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setHelpLevelModal({
                                                  title: legendItem.studentLabel,
                                                  detail: legendItem.detail,
                                                  motivation: (legendItem as any).motivation
                                                });
                                              }}
                                              className="text-pro-teal/60 hover:text-pro-teal transition-all p-1.5 hover:bg-pro-teal/10 rounded-full flex items-center justify-center"
                                              title="Saber mais sobre este nível"
                                            >
                                              <HelpCircle size={16} fill="currentColor" fillOpacity={0.1} />
                                            </button>
                                          </div>
                                          <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden flex gap-0.5">
                                             {GRADE_LEGEND.map((l, idx) => {
                                               const currentIdx = GRADE_LEGEND.findIndex(item => item.label === legendItem.label);
                                               return (
                                                 <div 
                                                   key={idx} 
                                                   className={`flex-1 h-full rounded-full ${idx <= currentIdx ? 'bg-pro-teal' : 'bg-slate-200 opacity-30'}`}
                                                 />
                                               );
                                             })}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {period.professorDiary?.criteriaObs?.[c.id] && (
                                        <div className="mt-2 p-3 bg-teal-50/50 rounded-xl border border-teal-100/50">
                                          <p className="text-[7px] font-black text-pro-teal uppercase mb-1 flex items-center gap-1">
                                            <CheckCircle2 size={8} /> Feedback do Professor
                                          </p>
                                          <p className="text-[9px] font-medium text-slate-600 leading-relaxed italic">
                                            "{period.professorDiary.criteriaObs[c.id]}"
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Final Pedagogical Report */}
                              {period.professorDiary?.generalPedagogicalObs && (
                                <div className="mt-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-[#016a86]/10 flex items-center justify-center text-[#016a86]">
                                      <Drama size={20} />
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-black text-[#016a86] uppercase tracking-widest">Parecer Pedagógico Final</p>
                                      <h4 className="text-xs font-black text-slate-800 uppercase">Considerações do Professor</h4>
                                    </div>
                                  </div>
                                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                                      {period.professorDiary.generalPedagogicalObs}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {PROFESSIONAL_COURSE_CRITERIA.map(c => {
                                const selfNote = Number(period.selfAssessment?.notes?.[c.id] || 0);
                                const profNote = Number(period.professorDiary?.grades?.[c.id] || 0);
                                const compAvg = (selfNote * weightSelf + profNote * weightProf) / 4;
                                
                                const selfLabel = SCALES.find(s => Number(selfNote) === Number(s.value))?.label || 
                                                   SCALES.slice().reverse().find(s => Number(selfNote) >= Number(s.value))?.label || 
                                                   "Sem avaliação";

                                return (
                                  <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                      <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{c.label}</h4>
                                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Competência</p>
                                    </div>
                                    <div className="flex items-end justify-between border-t border-slate-50 pt-2 gap-2">
                                      <div className="text-left flex-1 min-w-0">
                                        <p className="text-[7px] font-black text-pro-teal uppercase opacity-60 truncate">Nota dada por mim</p>
                                        <p className="text-[10px] font-black text-pro-teal leading-none line-clamp-2">{selfLabel}</p>
                                      </div>

                                      {period.professorDiary?.status === "concluido" ? (
                                        <div className="text-center flex-1 border-x border-slate-50 px-2 min-w-0">
                                          <p className="text-[7px] font-black text-slate-400 uppercase truncate">Média Final</p>
                                          <p className="text-lg font-black text-slate-800 leading-none">{compAvg.toFixed(1)}</p>
                                        </div>
                                      ) : (
                                        <div className="text-center flex-1 border-x border-slate-50 px-2">
                                          <p className="text-[7px] font-black text-slate-400 uppercase">Processo</p>
                                          <p className="text-lg font-black text-slate-200 leading-none">—</p>
                                        </div>
                                      )}

                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMeetingModal({ 
                                            classId: period.classId, 
                                            className: classes.find(c => c.id === period.classId)?.code || period.className || "Turma"
                                          });
                                        }}
                                        className="flex-1 flex flex-col items-end group/mask"
                                      >
                                        <p className="text-[7px] font-black text-slate-400 uppercase group-hover/mask:text-pro-teal transition-colors text-right">Professor</p>
                                        <div className="bg-slate-50 p-1 rounded-lg text-slate-200 group-hover/mask:bg-pro-teal group-hover/mask:text-white transition-all">
                                          <Drama size={16} />
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {!finalGrade && (
                        <div className="px-8 pb-8">
                          <div className="p-4 bg-slate-50/50 rounded-2xl flex items-center gap-3 border border-dashed border-slate-200">
                             <AlertCircle size={14} className="text-pro-orange" />
                             <p className="text-[11px] font-bold text-slate-500 italic">
                               {statusText === "Aguardando você" 
                                 ? "Realize sua autoavaliação para calcular a média final."
                                 : "Aguardando avaliação final do professor."}
                             </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 bg-white flex justify-center">
        <button 
          onClick={() => setView("dashboard")} 
          className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-600 transition-colors"
        >
          Voltar ao Portal do Aluno
        </button>
      </div>

      <AnimatePresence>
        {meetingModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            onClick={() => !isScheduling && setMeetingModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[48px] w-full max-w-sm overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-slate-800 p-10 text-center relative">
                <div className="w-20 h-20 bg-white/10 rounded-[32px] flex items-center justify-center mx-auto mb-4 text-white">
                  <Drama size={40} />
                </div>
                <h3 className="text-white text-2xl font-black uppercase tracking-tight">Avaliação Pedagógica</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">{meetingModal.className}</p>
                <button 
                  onClick={() => setMeetingModal(null)}
                  className="absolute top-6 right-6 text-white/50 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-10 space-y-6">
                {scheduleSuccess ? (
                  <div className="text-center space-y-4 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-black text-slate-800 uppercase tracking-tight">Solicitado!</p>
                      <p className="text-xs font-bold text-slate-400">Em breve o gestor entrará em contato.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <p className="text-slate-600 font-medium leading-relaxed text-center">
                        Para saber as notas e feedbacks detalhados dados pelo professor na turma de <strong>{meetingModal.className}</strong>, você deve agendar um horário para uma devolutiva pedagógica.
                      </p>
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                        <AlertCircle className="text-amber-500 shrink-0" size={18} />
                        <p className="text-[10px] font-bold text-amber-600 leading-relaxed">
                          O agendamento é obrigatório para garantir um acompanhamento individualizado da sua evolução artística.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={handleScheduleRequest}
                      disabled={isScheduling}
                      className="w-full py-5 bg-pro-teal text-white rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-pro-teal/20 hover:scale-105 transition-all flex items-center justify-center gap-3"
                    >
                      {isScheduling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Calendar size={18} /> Agendar Agora</>}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {helpLevelModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            onClick={() => setHelpLevelModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-pro-teal p-10 text-center relative">
                <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center mx-auto mb-4 text-white">
                  <HelpCircle size={40} />
                </div>
                <h3 className="text-white text-2xl font-black uppercase tracking-tight">{helpLevelModal.title}</h3>
                <button 
                  onClick={() => setHelpLevelModal(null)}
                  className="absolute top-6 right-6 text-white/50 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest">O que significa?</p>
                  <p className="text-slate-600 font-medium leading-relaxed">{helpLevelModal.detail}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest">Incentivo</p>
                  <p className="text-slate-500 text-sm italic">"{helpLevelModal.motivation}"</p>
                </div>
                <button 
                  onClick={() => setHelpLevelModal(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-black/10"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
