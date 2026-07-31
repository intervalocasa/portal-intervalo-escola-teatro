
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
  Calendar,
  User as UserIcon,
  Download
} from 'lucide-react';
import { Logo, BackButton } from './CommonComponents';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { motion, AnimatePresence } from 'motion/react';
import { getUserDisplayName, getUserSecondaryName } from '../lib/userUtils';
import React from 'react';
import { generateDiaryPDF } from '../lib/pdfExporter';
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

  const [teacherCommentModal, setTeacherCommentModal] = React.useState<{ text: string; teacherName: string; teacherPhoto?: string } | null>(null);

  const mappedUser = users.find(u => u.id === currentUser?.uid) || users.find(u => u.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const isStaff = currentUser?.role === "Gestor" || currentUser?.role === "Diretor Pedagógico" || currentUser?.role === "Professor" || mappedUser?.role === "Gestor" || mappedUser?.role === "Diretor Pedagógico" || mappedUser?.role === "Professor";

  const allStudents = React.useMemo(() => {
    return users
      .filter(u => u.role === "Aluno")
      .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'pt-BR'));
  }, [users]);

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");

  const activeUser = React.useMemo(() => {
    if (isStaff && selectedStudentId) {
      const found = users.find(u => u.id === selectedStudentId);
      if (found) return found;
    }
    if (isStaff && allStudents.length > 0) {
      return allStudents[0];
    }
    return mappedUser;
  }, [isStaff, selectedStudentId, users, allStudents, mappedUser]);

  const eligibleIds = React.useMemo(() => {
    if (!activeUser) return [currentUser?.uid].filter(Boolean) as string[];
    return [activeUser.id, activeUser.migratedFrom, activeUser.migratedTo].filter(Boolean) as string[];
  }, [activeUser, currentUser?.uid]);

  const studentEvals = evaluations.filter(e => eligibleIds.includes(e.studentId));
  
  // Robust diary filtering: first try by studentId, then heal by name if needed
  const studentDiariesById = diaries.filter(d => eligibleIds.includes(d.studentId));
  const otherOrphanedDiaries = diaries.filter(d => 
    !eligibleIds.includes(d.studentId) && 
    activeUser && (d.studentName === activeUser.name || d.studentName === activeUser.socialName || d.studentName === activeUser.artisticName) &&
    !users.some(u => u.id === d.studentId)
  );

  const studentDiaries = [...studentDiariesById, ...otherOrphanedDiaries];
  
  const handleScheduleRequest = async () => {
    if (!meetingModal || !currentUser) return;
    setIsScheduling(true);
    try {
      await addDoc(collection(db, "pedagogical-requests"), {
        studentId: currentUser.uid,
        studentName: getUserDisplayName(mappedUser) || currentUser.displayName || "Aluno",
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
                  <p className="text-sm text-slate-400 font-bold max-w-xs mx-auto">Realize sua autoanálise mensal para começar a acompanhar seu progresso.</p>
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
                      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative">
                        <div className="flex items-center gap-4 md:gap-6">
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
                              
                              {period.professorDiary && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const studentName = getUserDisplayName(activeUser) || getUserDisplayName(mappedUser) || "Aluno";
                                    const targetClassObj = classes.find(c => c.id === period.classId);
                                    generateDiaryPDF({
                                      studentName: studentName,
                                      artisticName: getUserSecondaryName(activeUser) || getUserSecondaryName(mappedUser),
                                      className: targetClassObj?.code || "Turma",
                                      classType: period.classType,
                                      teacherName: period.professorDiary.teacherName || "Professor Responsável",
                                      month: period.month,
                                      year: period.year,
                                      presences: period.professorDiary.presences || 0,
                                      absences: period.professorDiary.absences || 0,
                                      frequencyObs: period.professorDiary.frequencyObs,
                                      grades: period.professorDiary.grades || {},
                                      criteriaObs: period.professorDiary.criteriaObs || {},
                                      generalPedagogicalObs: period.professorDiary.generalPedagogicalObs || "",
                                      averageGrade: period.professorDiary.averageGrade,
                                      studentEval: period.selfEval,
                                      status: period.professorDiary.status
                                    });
                                  }}
                                  className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider"
                                  title="Baixar Diário em PDF"
                                >
                                  <Download size={16} />
                                  <span className="hidden sm:inline">PDF</span>
                                </button>
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
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                    <div key={c.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4" onClick={(e) => e.stopPropagation()}>
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
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const teacher = users.find(u => u.id === period.professorDiary.teacherId);
                                            setTeacherCommentModal({
                                              text: period.professorDiary.criteriaObs[c.id],
                                              teacherName: period.professorDiary.teacherName || teacher?.artisticName || teacher?.name || "Professor(a)",
                                              teacherPhoto: teacher?.photo
                                            });
                                          }}
                                          className="mt-3 w-full p-2.5 bg-white hover:bg-pro-teal/5 border border-slate-100 rounded-xl flex items-center justify-center gap-2 group/comment transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                                        >
                                          {users.find(u => u.id === period.professorDiary.teacherId)?.photo ? (
                                            <img 
                                              src={users.find(u => u.id === period.professorDiary.teacherId)?.photo} 
                                              alt="Professor" 
                                              className="w-6 h-6 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-100"
                                            />
                                          ) : (
                                            <div className="w-6 h-6 rounded-full bg-pro-teal/10 flex items-center justify-center text-pro-teal shadow-sm">
                                              <UserIcon size={12} />
                                            </div>
                                          )}
                                          <span className="text-[9px] font-black text-slate-600 group-hover/comment:text-pro-teal uppercase tracking-widest transition-colors">
                                            Comentário do Professor
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
                                  <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                      <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{c.label}</h4>
                                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Competência</p>
                                    </div>
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between border-t border-slate-50 pt-2 gap-3 sm:gap-2">
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
  
                                        <div className="flex flex-row sm:flex-col gap-2 justify-end sm:justify-center">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMeetingModal({ 
                                                classId: period.classId, 
                                                className: classes.find(c => c.id === period.classId)?.code || period.className || "Turma"
                                              });
                                            }}
                                            className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 group/mask"
                                          >
                                            <p className="text-[7px] font-black text-slate-400 uppercase group-hover/mask:text-pro-teal transition-colors text-right hidden sm:block">Professor</p>
                                            <div className="bg-slate-50 p-1 rounded-lg text-slate-200 group-hover/mask:bg-pro-teal group-hover/mask:text-white transition-all">
                                              <Drama size={16} />
                                            </div>
                                            <p className="text-[7px] font-black text-slate-400 uppercase sm:hidden">Notas</p>
                                          </button>
                                        </div>
                                      </div>
                                    
                                    {period.professorDiary?.criteriaObs?.[c.id] && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const teacher = users.find(u => u.id === period.professorDiary.teacherId);
                                          setTeacherCommentModal({
                                            text: period.professorDiary.criteriaObs[c.id],
                                            teacherName: period.professorDiary.teacherName || teacher?.artisticName || teacher?.name || "Professor(a)",
                                            teacherPhoto: teacher?.photo
                                          });
                                        }}
                                        className="mt-3 w-full p-2 bg-slate-50 hover:bg-pro-teal/5 border border-slate-100 rounded-xl flex items-center justify-center gap-2 group/comment transition-all active:scale-[0.98]"
                                      >
                                        {users.find(u => u.id === period.professorDiary.teacherId)?.photo ? (
                                          <img 
                                            src={users.find(u => u.id === period.professorDiary.teacherId)?.photo} 
                                            alt="Professor" 
                                            className="w-4 h-4 rounded-full object-cover border border-slate-200"
                                          />
                                        ) : (
                                          <div className="w-4 h-4 rounded-full bg-pro-teal/10 flex items-center justify-center text-pro-teal">
                                            <UserIcon size={9} />
                                          </div>
                                        )}
                                        <span className="text-[8px] font-black text-slate-500 group-hover/comment:text-pro-teal uppercase tracking-widest transition-colors">
                                          Comentário
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            )}

                            {/* Weekly Attendance Comments */}
                            {period.professorDiary?.weeklyAttendance && Object.values(period.professorDiary.weeklyAttendance).some((v: any) => v.comment?.trim()) && (
                              <div className="mt-8 space-y-4">
                                <div className="flex items-center gap-3 border-l-4 border-pro-teal pl-4">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Comentários de Frequência</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 md:px-0">
                                  {Object.entries(period.professorDiary.weeklyAttendance)
                                    .filter(([_, v]: any) => v.comment?.trim())
                                    .map(([weekKey, data]: any) => (
                                      <div key={weekKey} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4">
                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-pro-teal/10 flex flex-col items-center justify-center text-pro-teal font-black">
                                          <span className="text-[8px] opacity-40 uppercase leading-none mb-1">Sem</span>
                                          <span className="text-xs leading-none">{weekKey.replace('week', '')}</span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs font-medium text-slate-600 italic">"{data.comment}"</p>
                                          <div className="mt-2 flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${data.status === 'presente' ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                              {data.status === 'presente' ? 'Presente' : 'Falta'}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Final Pedagogical Report - Moved outside conditional to apply to both types */}
                            {period.professorDiary?.generalPedagogicalObs && (
                              <div className="mt-8 flex justify-center w-full px-6 md:px-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const teacherId = period.professorDiary?.teacherId;
                                    const teacher = users.find(u => u.id === teacherId);
                                    setTeacherCommentModal({
                                      text: period.professorDiary.generalPedagogicalObs,
                                      teacherName: period.professorDiary.teacherName || teacher?.artisticName || teacher?.name || "Professor(a)",
                                      teacherPhoto: teacher?.photo
                                    });
                                  }}
                                  className="w-full md:w-auto px-6 md:px-10 py-5 bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex items-center justify-center gap-4 group/general active:scale-[0.98]"
                                >
                                  <div className="w-10 h-10 shrink-0 rounded-2xl bg-pro-teal/10 flex items-center justify-center text-pro-teal group-hover/general:bg-pro-teal group-hover/general:text-white transition-all ring-1 ring-pro-teal/20 overflow-hidden">
                                    {users.find(u => u.id === period.professorDiary.teacherId)?.photo ? (
                                      <img 
                                        src={users.find(u => u.id === period.professorDiary.teacherId)?.photo} 
                                        alt="Professor" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Drama size={22} />
                                    )}
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[9px] font-black text-pro-teal uppercase tracking-widest leading-none mb-1.5 opacity-60">Parecer Pedagógico Final</p>
                                    <h4 className="text-xs font-black text-slate-800 uppercase group-hover/general:text-pro-teal transition-colors tracking-tight">Comentário do Professor</h4>
                                  </div>
                                </button>
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
                                 ? "Realize sua autoanálise para calcular a média final."
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
        {teacherCommentModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-6"
            onClick={() => setTeacherCommentModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden">
                <div className="relative z-10">
                  <div className="w-24 h-24 rounded-[32px] bg-white p-1 shadow-2xl mx-auto mb-4">
                    {teacherCommentModal.teacherPhoto ? (
                      <img 
                        src={teacherCommentModal.teacherPhoto} 
                        alt={teacherCommentModal.teacherName} 
                        className="w-full h-full rounded-[28px] object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[28px] bg-slate-50 flex items-center justify-center text-pro-teal">
                        <UserIcon size={40} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-white text-2xl font-black uppercase tracking-tight">Comentário do Professor</h3>
                  <p className="text-teal-100/70 text-[10px] font-black uppercase tracking-widest mt-2">{teacherCommentModal.teacherName}</p>
                </div>
                
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-10 blur-2xl">
                   <Drama size={200} className="text-white" />
                </div>
                
                <button 
                  onClick={() => setTeacherCommentModal(null)}
                  className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-10 space-y-8">
                <div className="relative">
                  <div className="absolute -left-4 -top-4 text-pro-teal/10">
                    <Drama size={80} />
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed italic text-lg relative z-10 whitespace-pre-wrap">
                    "{teacherCommentModal.text}"
                  </p>
                </div>

                <button 
                  onClick={() => setTeacherCommentModal(null)}
                  className="w-full py-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all"
                >
                  Entendi, obrigado!
                </button>
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                 <Logo className="h-6 opacity-30 grayscale" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
