/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Save, HelpCircle, CheckCircle2, Download, Clock, Lock, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { User, Class } from "../types";
import { Avatar, BackButton } from "../components/CommonComponents";
import { 
  PROFESSIONAL_COURSE_CRITERIA, 
  ADULT_COURSE_CRITERIA, 
  SENIOR_COURSE_CRITERIA,
  is60PlusClass,
  isProfessionalClassType,
  isCriterionUnworked,
  UNWORKED_CRITERION_LABEL,
  UNWORKED_TEACHER_OPTION,
  GRADE_LEGEND,
  SCALES
} from "../constants";
import { BADGES } from "../constants/badges";
import { Award, Star } from "lucide-react";
import { UserRole } from "../types";
import { generateDiaryPDF } from "../lib/pdfExporter";
import { getUserDisplayName, getUserSecondaryName } from "../lib/userUtils";
import { getMonthlyDeadline } from "../lib/deadlineUtils";
import { DeadlineExpiredModal } from "../components/DeadlineExpiredModal";

interface StudentDiaryFormViewProps {
  selectedClassId: string | null;
  diaryFilterMonth: number;
  diaryFilterYear: number;
  selectedDiaryStudentId: string | null;
  users: User[];
  classes: Class[];
  diaryFormData: any;
  setDiaryFormData: (data: any) => void;
  handleSubmitDiary: (status: "rascunho" | "concluido") => void;
  handleAwardBadge: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
  userRole?: UserRole | null;
  setView: (view: string) => void;
  evaluations?: any[];
}

export const StudentDiaryFormView = ({
  selectedClassId,
  diaryFilterMonth,
  diaryFilterYear,
  selectedDiaryStudentId,
  users,
  classes,
  diaryFormData,
  setDiaryFormData,
  handleSubmitDiary,
  handleAwardBadge,
  userRole,
  setView,
  evaluations = []
}: StudentDiaryFormViewProps) => {
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const student = users.find(u => u.id === selectedDiaryStudentId);
  const targetClass = classes.find(c => c.id === selectedClassId);
  const isSenior60 = is60PlusClass(targetClass?.type, targetClass?.code);
  const isProfessional = !isSenior60 && isProfessionalClassType(targetClass?.type, targetClass?.code);
  const criteria = isSenior60 
    ? SENIOR_COURSE_CRITERIA 
    : isProfessional 
      ? PROFESSIONAL_COURSE_CRITERIA 
      : ADULT_COURSE_CRITERIA;

  const deadlineInfo = useMemo(() => {
    return getMonthlyDeadline(diaryFilterMonth, diaryFilterYear);
  }, [diaryFilterMonth, diaryFilterYear]);

  const handleValidatedSubmit = (status: "rascunho" | "concluido") => {
    if (deadlineInfo.isExpired) {
      setShowExpiredModal(true);
      return;
    }
    handleSubmitDiary(status);
  };

  // Obter todos os emails, IDs e nomes possíveis associados a este aluno para correspondência robusta de autoavaliação
  const { studentEmails, studentNames, eligibleIds } = useMemo(() => {
    const emails = new Set<string>();
    const names = new Set<string>();
    const ids = new Set<string>();

    if (selectedDiaryStudentId) ids.add(selectedDiaryStudentId);
    if (student?.id) ids.add(student.id);
    if (student?.migratedFrom) ids.add(student.migratedFrom);
    if (student?.migratedTo) ids.add(student.migratedTo);

    if (student?.email) emails.add(student.email.toLowerCase().trim());
    if (student?.name) names.add(student.name.toLowerCase().trim().replace(/\s+/g, ' '));
    if (student?.artisticName) names.add(student.artisticName.toLowerCase().trim().replace(/\s+/g, ' '));

    const matchedUser = users.find(u => u.id === selectedDiaryStudentId);
    if (matchedUser) {
      if (matchedUser.email) emails.add(matchedUser.email.toLowerCase().trim());
      if (matchedUser.name) names.add(matchedUser.name.toLowerCase().trim().replace(/\s+/g, ' '));
      if (matchedUser.artisticName) names.add(matchedUser.artisticName.toLowerCase().trim().replace(/\s+/g, ' '));
      if (matchedUser.migratedFrom) ids.add(matchedUser.migratedFrom);
      if (matchedUser.migratedTo) ids.add(matchedUser.migratedTo);
    }

    // Heurística de cura: incluir qualquer outro usuário que tenha o mesmo email ou nome
    users.forEach(u => {
      let emailMatch = false;
      let nameMatch = false;
      
      const uEmail = u.email?.toLowerCase().trim();
      if (uEmail && emails.has(uEmail)) {
        emailMatch = true;
      }
      
      const uName = u.name?.toLowerCase().trim().replace(/\s+/g, ' ');
      if (uName && names.has(uName)) {
        nameMatch = true;
      }

      if (emailMatch || nameMatch) {
        ids.add(u.id);
        if (u.migratedFrom) ids.add(u.migratedFrom);
        if (u.migratedTo) ids.add(u.migratedTo);
        if (uEmail) emails.add(uEmail);
        if (uName) names.add(uName);
      }
    });

    return {
      studentEmails: Array.from(emails),
      studentNames: Array.from(names),
      eligibleIds: Array.from(ids)
    };
  }, [student, selectedDiaryStudentId, users]);

  // Encontra a autoavaliação correspondente do aluno para a turma, mês e ano selecionados
  const studentEval = useMemo(() => {
    return evaluations.find(e => {
      if (e.classId !== selectedClassId || e.month !== diaryFilterMonth || e.year !== diaryFilterYear) {
        return false;
      }
      
      // 1. Correspondência de ID direta ou resolvida do aluno
      if (eligibleIds.includes(e.studentId)) return true;
      
      // 2. Correspondência de email salva diretamente no documento da autoavaliação
      if (e.studentEmail && studentEmails.includes(e.studentEmail.toLowerCase().trim())) return true;
      
      // 3. Correspondência de nome salva diretamente no documento
      if (e.studentName && studentNames.includes(e.studentName.toLowerCase().trim().replace(/\s+/g, ' '))) return true;
      
      // 4. Resolver ID da autoavaliação para um usuário e comparar o email correspondente ou nome correspondente
      const evalUser = users.find(u => u.id === e.studentId);
      if (evalUser?.email && studentEmails.includes(evalUser.email.toLowerCase().trim())) return true;
      if (evalUser?.name && studentNames.includes(evalUser.name.toLowerCase().trim().replace(/\s+/g, ' '))) return true;
      
      return false;
    });
  }, [evaluations, selectedClassId, diaryFilterMonth, diaryFilterYear, eligibleIds, studentEmails, studentNames, users]);

  const allowedBadges = BADGES.filter(b => {
    // Automatic badges
    if (b.badgeId === 'presenca-vip' || b.badgeId === 'critico-de-arte') return false;
    
    // Gestor-only manual badges
    if (userRole !== 'Gestor' && userRole !== 'Diretor Pedagógico' && (b.badgeId === 'embaixador-da-arte' || b.badgeId === 'blogueirinho')) {
      return false;
    }
    return true;
  });

  const teacherName = useMemo(() => {
    if (!targetClass?.teacherIds) return "Professor Responsável";
    const found = users.find(u => targetClass.teacherIds.includes(u.id));
    return found ? getUserDisplayName(found) : "Professor Responsável";
  }, [targetClass, users]);

  const handleDownloadPDF = () => {
    const gradeValues = Object.entries(diaryFormData.grades || {})
      .filter(([cid, val]) => !isCriterionUnworked(val, diaryFormData.unworkedCriteria, cid))
      .map(([_, v]) => Number(v))
      .filter(v => !isNaN(v));
    const avgGrade = gradeValues.length > 0 
      ? gradeValues.reduce((a, b) => a + b, 0) / gradeValues.length 
      : 0;

    generateDiaryPDF({
      studentName: getUserDisplayName(student) || "Aluno",
      artisticName: getUserSecondaryName(student),
      className: targetClass?.code || "Turma",
      classType: targetClass?.type,
      teacherName: teacherName,
      month: diaryFilterMonth || 1,
      year: diaryFilterYear || 2026,
      presences: diaryFormData.presences || 0,
      absences: diaryFormData.absences || 0,
      frequencyObs: diaryFormData.frequencyObs,
      grades: diaryFormData.grades || {},
      unworkedCriteria: diaryFormData.unworkedCriteria || {},
      criteriaObs: diaryFormData.criteriaObs || {},
      generalPedagogicalObs: diaryFormData.generalPedagogicalObs || "",
      averageGrade: avgGrade,
      studentEval: studentEval,
      status: "concluido"
    });
  };

  return (
    <>
      <motion.div
        key="student-diary-form-screen"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-4xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
      >
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 md:py-16">
         <div className="space-y-4 text-center md:text-left">
           <div className="absolute top-4 left-4 z-20">
             <BackButton 
               onClick={() => setView("professor_diary")} 
               className="!text-white pointer-events-auto" 
             />
           </div>
           <div>
             <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{getUserDisplayName(student)}</h1>
              {getUserSecondaryName(student) && (
                <p className="text-white/90 text-sm font-bold uppercase tracking-wider mt-1">
                  Nome social: {getUserSecondaryName(student)}
                </p>
              )}
             {student?.pronouns && (
               <p className="text-white/80 text-xs font-bold uppercase tracking-wider mt-1">
                 Pronomes: {student.pronouns}
               </p>
             )}
             <div className="flex flex-wrap items-center gap-3 mt-2">
               <p className="text-pro-yellow text-[10px] md:text-xs font-black uppercase tracking-[0.3em] italic bg-white/10 px-4 py-2 rounded-lg border border-white/10 inline-block backdrop-blur-md">
                 {targetClass?.code} • {new Date(0, (diaryFilterMonth || 1) - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} {diaryFilterYear}
               </p>
               <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border backdrop-blur-md ${
                 deadlineInfo.isExpired 
                   ? "bg-rose-500/20 text-rose-200 border-rose-400/30" 
                   : "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
               }`}>
                 {deadlineInfo.isExpired ? <Lock size={12} /> : <Clock size={12} />}
                 {deadlineInfo.isExpired 
                   ? `Prazo expirado (${deadlineInfo.formattedDeadline})` 
                   : `Prazo até ${deadlineInfo.formattedDeadline} às 23:59`}
               </div>
               <button
                 type="button"
                 onClick={handleDownloadPDF}
                 className="px-4 py-2 bg-pro-yellow text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 border border-pro-yellow/30"
               >
                 <Download size={14} /> Baixar PDF
               </button>
             </div>
           </div>
         </div>
         <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-white/10 overflow-hidden shadow-2xl bg-white/10 flex items-center justify-center">
            <Avatar src={student?.photo} fallbackSize={48} className="w-full h-full rounded-none" />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12 space-y-12 pb-32">
        <div className="max-w-4xl mx-auto w-full space-y-12">

          {/* Section: Badges (Conquistas) */}
          <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-l-4 border-pro-yellow pl-6">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Atribuir Conquista</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reconheça o esforço e dedicação do aluno neste mês</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {allowedBadges.map((badge) => (
                <button
                  key={badge.badgeId}
                  onClick={() => handleAwardBadge(selectedDiaryStudentId!, badge, undefined, undefined, selectedClassId || undefined)}
                  className="flex flex-col items-center gap-3 p-4 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-pro-yellow/10 hover:border-pro-yellow/30 hover:scale-105 transition-all group"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-pro-yellow shadow-inner group-hover:shadow-pro-yellow/20 transition-all">
                    {badge.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{badge.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Atribuir</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-pro-yellow/5 rounded-2xl border border-dashed border-pro-yellow/20 flex items-center gap-3">
              <Star size={16} className="text-pro-orange" />
              <p className="text-[10px] font-black text-pro-orange uppercase tracking-widest">A conquista de "Presença VIP" é atribuída automaticamente para 100% de presença.</p>
            </div>
          </div>
          
          {/* Section 1: Information banner regarding Diário de Aula */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
             <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pro-teal/10 rounded-xl text-pro-teal">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Presenças e Frequência</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lançadas via Diário de Aula da turma</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView("class_diary")}
                  className="px-4 py-2 bg-pro-teal/10 hover:bg-pro-teal hover:text-white text-pro-teal text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                >
                  Ir para Diário de Aula <ChevronRight size={14} />
                </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total de Presenças (Mês)</label>
                    <input 
                      type="number"
                      min="0"
                      value={diaryFormData.presences}
                      onChange={(e) => setDiaryFormData({ ...diaryFormData, presences: parseInt(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-slate-700 focus:bg-white focus:border-pro-teal outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total de Faltas (Mês)</label>
                    <input 
                      type="number"
                      min="0"
                      value={diaryFormData.absences}
                      onChange={(e) => setDiaryFormData({ ...diaryFormData, absences: parseInt(e.target.value) || 0 })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-slate-700 focus:bg-white focus:border-pro-teal outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações de Assiduidade</label>
                   <input
                     type="text"
                     placeholder="Pontualidade, justificativas ou observações gerais..."
                     value={diaryFormData.frequencyObs || ""}
                     onChange={(e) => setDiaryFormData({ ...diaryFormData, frequencyObs: e.target.value })}
                     className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-pro-teal outline-none transition-all"
                   />
                </div>
             </div>
          </div>

          {/* Section 2: Technical Evaluation */}
          <div className="space-y-6">
             <div className="flex items-center gap-4 border-l-4 border-pro-orange pl-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Avalhação de Critérios Técnicos</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atribua notas de 0 a 10 para cada competência</p>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-6">
                {criteria.map((c, idx) => (
                  <div key={c.id} className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-sm space-y-8 group hover:border-pro-orange transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-8 md:items-start">
                       <div className="max-w-xl space-y-3">
                          <div className="flex items-center gap-4">
                             <span className="text-4xl font-black text-pro-orange opacity-20">#{idx + 1}</span>
                             <div className="relative group/tooltip inline-block">
                               <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight hover:text-pro-teal transition-colors cursor-help flex items-center gap-3">
                                  {c.label}
                                  <HelpCircle size={14} className="text-slate-400 group-hover/tooltip:text-pro-teal transition-colors shrink-0" />
                               </h4>
                               
                               {/* Tooltip content on hover */}
                               <div className="absolute left-0 bottom-full mb-3 hidden group-hover/tooltip:flex flex-col bg-slate-950 text-white p-4 rounded-2xl shadow-xl border border-slate-800 text-xs w-72 md:w-80 space-y-3 pointer-events-none transition-all z-10">
                                 <div>
                                   <div className="font-black uppercase tracking-widest text-[#00ebc7] text-[9px] mb-1">
                                     Autoavaliação do Aluno
                                   </div>
                                   {(() => {
                                     const studentNote = studentEval?.notes?.[c.id];
                                     const scaleObj = SCALES.find(s => Number(s.value) === Number(studentNote));
                                     const studentNoteLabel = scaleObj ? scaleObj.label : "Não respondido";
                                     
                                     return studentNote !== undefined ? (
                                       <div className="space-y-1">
                                         <div className="flex items-center gap-2">
                                           <span className="text-sm font-black text-pro-yellow">{studentNote} / 10</span>
                                           <span className="text-[9px] uppercase font-bold text-slate-400">
                                             ({studentNote === 10 ? "Excelente" : studentNote >= 8 ? "Desenvolvendo" : studentNote >= 5 ? "Em Movimento" : "Inicial"})
                                           </span>
                                         </div>
                                         <p className="text-slate-300 font-medium leading-normal uppercase text-[8px] tracking-wide">
                                           "{studentNoteLabel}"
                                         </p>
                                       </div>
                                     ) : (
                                       <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider leading-relaxed">
                                         Nenhuma autoavaliação enviada.
                                       </p>
                                     );
                                   })()}
                                 </div>

                                 {(() => {
                                   const studentNote = studentEval?.notes?.[c.id];
                                   const currentProfGrade = diaryFormData.grades[c.id];
                                   const isUnworked = isCriterionUnworked(currentProfGrade, diaryFormData.unworkedCriteria, c.id);

                                   if (isUnworked) {
                                     return (
                                       <div className="border-t border-slate-800 pt-2">
                                         <div className="font-black uppercase tracking-widest text-amber-400 text-[9px] mb-1">
                                           Status do Critério
                                         </div>
                                         <p className="text-[10px] text-amber-300 font-bold">
                                           {UNWORKED_CRITERION_LABEL}
                                         </p>
                                       </div>
                                     );
                                   }

                                   if (studentNote !== undefined && currentProfGrade !== undefined && currentProfGrade !== "") {
                                     const selfVal = Number(studentNote);
                                     const profVal = Number(currentProfGrade);
                                     const weightSelf = isProfessional ? 2 : 3;
                                     const weightProf = isProfessional ? 2 : 1;
                                     const compAvg = (selfVal * weightSelf + profVal * weightProf) / 4;
                                     
                                     return (
                                       <div className="border-t border-slate-800 pt-2">
                                         <div className="font-black uppercase tracking-widest text-pro-orange text-[9px] mb-1">
                                           Nível Consolidado Estimado
                                         </div>
                                         <div className="flex items-center gap-2">
                                           <span className="text-sm font-black text-white">
                                             {isProfessional ? compAvg.toFixed(1) : (compAvg === 0 ? GRADE_LEGEND[0] : compAvg <= 3 ? GRADE_LEGEND[1] : compAvg <= 6 ? GRADE_LEGEND[2] : compAvg <= 9 ? GRADE_LEGEND[3] : GRADE_LEGEND[4]).label}
                                           </span>
                                           <span className="text-[9px] text-slate-400">({compAvg.toFixed(1)} / 10)</span>
                                         </div>
                                       </div>
                                     );
                                   }
                                   return null;
                                 })()}
                               </div>
                             </div>
                          </div>
                          <p className="text-sm text-slate-400 font-bold leading-relaxed">{c.definition}</p>
                          
                          {/* Consolidated assessment summary block */}
                          <div className="mt-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Autoavaliação do Aluno</div>
                              {(() => {
                                const studentNote = studentEval?.notes?.[c.id];
                                const currentProfGrade = diaryFormData.grades[c.id];
                                const isUnworked = isCriterionUnworked(currentProfGrade, diaryFormData.unworkedCriteria, c.id);

                                if (isUnworked) {
                                  return (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-400">
                                          {studentNote !== undefined ? `${studentNote} / 10 (Desconsiderada)` : "—"}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-amber-700/80 leading-normal italic font-medium">
                                        Autoavaliação desconsiderada pelo critério não ter sido trabalhado em sala.
                                      </p>
                                    </div>
                                  );
                                }

                                if (studentNote !== undefined) {
                                  const scaleObj = SCALES.find(s => Number(s.value) === Number(studentNote));
                                  return (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-pro-teal">{studentNote} / 10</span>
                                        <span className="text-[9px] font-black uppercase text-slate-500 opacity-80">
                                          ({studentNote === 10 ? "Excelente" : studentNote >= 8 ? "Desenvolvendo" : studentNote >= 5 ? "Em Movimento" : "Inicial"})
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 leading-normal italic">
                                        "{scaleObj?.label || "Respondido"}"
                                      </p>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
                                    Aguardando autoavaliação...
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="w-px h-10 bg-slate-200 hidden sm:block" />

                            <div className="flex-1 space-y-1 sm:pl-4">
                              <div className="text-[9px] font-black uppercase tracking-widest text-[#016a86]">Resultado / Indicador Consolidado</div>
                              {(() => {
                                const studentNote = studentEval?.notes?.[c.id];
                                const currentProfGrade = diaryFormData.grades[c.id];
                                const isUnworked = isCriterionUnworked(currentProfGrade, diaryFormData.unworkedCriteria, c.id);
                                const hasProfGrade = currentProfGrade !== undefined && currentProfGrade !== "" && !isUnworked;
                                const hasStudentNote = studentNote !== undefined;

                                if (isUnworked) {
                                  return (
                                    <div className="space-y-1">
                                      <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-black inline-block">
                                        {UNWORKED_CRITERION_LABEL}
                                      </span>
                                      {hasStudentNote && (
                                        <p className="text-[9px] font-bold text-slate-400 italic">
                                          * Nota da autoavaliação desconsiderada no cálculo global.
                                        </p>
                                      )}
                                    </div>
                                  );
                                }
                                
                                if (isSenior60) {
                                  if (hasStudentNote && hasProfGrade) {
                                    const selfVal = Number(studentNote);
                                    const profVal = Number(currentProfGrade);
                                    const compAvg = (selfVal + profVal) / 2;
                                    const legendItem = compAvg === 0 ? GRADE_LEGEND[0] : 
                                                     compAvg <= 3 ? GRADE_LEGEND[1] : 
                                                     compAvg <= 6 ? GRADE_LEGEND[2] : 
                                                     compAvg <= 9 ? GRADE_LEGEND[3] : 
                                                     GRADE_LEGEND[4];
                                    return (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-black text-[#016a86]">{legendItem.label}</span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                          ({compAvg.toFixed(1)} / 10)
                                        </span>
                                        <span className="px-2 py-0.5 bg-pro-teal/10 text-pro-teal rounded-full text-[8px] font-black uppercase tracking-widest">
                                          Média 60+
                                        </span>
                                      </div>
                                    );
                                  } else if (!hasStudentNote && hasProfGrade) {
                                    const profVal = Number(currentProfGrade);
                                    const legendItem = profVal === 0 ? GRADE_LEGEND[0] : 
                                                     profVal <= 3 ? GRADE_LEGEND[1] : 
                                                     profVal <= 6 ? GRADE_LEGEND[2] : 
                                                     profVal <= 9 ? GRADE_LEGEND[3] : 
                                                     GRADE_LEGEND[4];
                                    return (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-black text-[#016a86]">{legendItem.label}</span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                          ({profVal.toFixed(1)} / 10)
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                                          Apenas Professor
                                        </span>
                                      </div>
                                    );
                                  } else if (hasStudentNote && !hasProfGrade) {
                                    return (
                                      <div className="text-[10px] font-bold text-pro-orange uppercase tracking-tight italic">
                                        Aguardando nota do professor...
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
                                        Aguardando avaliação...
                                      </div>
                                    );
                                  }
                                }

                                if (hasStudentNote && hasProfGrade) {
                                  const selfVal = Number(studentNote);
                                  const profVal = Number(currentProfGrade);
                                  const weightSelf = isProfessional ? 2 : 3;
                                  const weightProf = isProfessional ? 2 : 1;
                                  const compAvg = (selfVal * weightSelf + profVal * weightProf) / 4;
                                  
                                  if (isProfessional) {
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-800">{compAvg.toFixed(1)} / 10</span>
                                        <div className="px-2 py-0.5 bg-[#016a86]/10 text-[#016a86] rounded-full text-[8px] font-black uppercase tracking-widest">
                                          Média Final
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    const legendItem = compAvg === 0 ? GRADE_LEGEND[0] : 
                                                     compAvg <= 3 ? GRADE_LEGEND[1] : 
                                                     compAvg <= 6 ? GRADE_LEGEND[2] : 
                                                     compAvg <= 9 ? GRADE_LEGEND[3] : 
                                                     GRADE_LEGEND[4];
                                    return (
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-[#016a86]">{legendItem.label}</span>
                                        <span className="text-[9px] font-bold text-slate-400">
                                          ({compAvg.toFixed(1)} / 10)
                                        </span>
                                      </div>
                                    );
                                  }
                                }
                                
                                if (!hasStudentNote) {
                                  return (
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">
                                      Indisponível (Sem autoavaliação)
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="text-[10px] font-bold text-pro-orange uppercase tracking-tight italic">
                                    Aguardando nota do professor...
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <textarea 
                             placeholder={`Feedback específico sobre ${c.label}...`}
                             value={diaryFormData.criteriaObs[c.id] || ""}
                             onChange={(e) => setDiaryFormData({
                               ...diaryFormData,
                               criteriaObs: { ...diaryFormData.criteriaObs, [c.id]: e.target.value }
                             })}
                             className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-[28px] text-xs font-bold text-slate-600 focus:outline-none focus:border-pro-orange transition-all mt-6"
                          />
                       </div>

                       <div className="flex flex-col items-center gap-3 bg-slate-50 p-6 rounded-[40px] border border-slate-100 group-hover:bg-white transition-all min-w-[220px] max-w-[240px] w-full">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota do Professor</label>
                          {(() => {
                            const isUnworked = isCriterionUnworked(diaryFormData.grades[c.id], diaryFormData.unworkedCriteria, c.id);
                            
                            if (isUnworked) {
                              return (
                                <div className="w-full py-3 flex flex-col items-center justify-center">
                                  <span className="text-4xl font-black text-amber-500 tracking-wider">N/T</span>
                                  <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest mt-1 bg-amber-100/90 px-3 py-0.5 rounded-full">
                                    Sem nota
                                  </span>
                                  <p className="text-[8px] font-bold text-slate-400 mt-2 text-center leading-tight">
                                    Desconsiderado do cálculo da média global
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <>
                                <input 
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.5"
                                  placeholder="0.0"
                                  value={diaryFormData.grades[c.id] === undefined ? "" : diaryFormData.grades[c.id]}
                                  onChange={(e) => {
                                     const val = e.target.value === "" ? 0 : Math.min(10, Math.max(0, Number(e.target.value)));
                                     setDiaryFormData({
                                       ...diaryFormData,
                                       grades: { ...diaryFormData.grades, [c.id]: val }
                                     });
                                  }}
                                  className="w-full text-center text-5xl font-black text-pro-orange bg-transparent focus:outline-none placeholder:text-slate-200"
                                />
                                <div className="mt-2 text-center px-4">
                                  <p className="text-[9px] font-black text-pro-orange uppercase tracking-tighter italic border-t border-pro-orange/10 pt-2 w-full">
                                    {(() => {
                                      const val = Number(diaryFormData.grades[c.id] || 0);
                                      const legend = val === 0 ? GRADE_LEGEND[0] : 
                                                     val <= 3 ? GRADE_LEGEND[1] : 
                                                     val <= 6 ? GRADE_LEGEND[2] : 
                                                     val <= 9 ? GRADE_LEGEND[3] : 
                                                     GRADE_LEGEND[4];
                                      return (legend as any).desc;
                                    })()}
                                  </p>
                                </div>
                              </>
                            );
                          })()}

                          {/* Toggle unworked button */}
                          <button
                            type="button"
                            onClick={() => {
                              const isUnworked = isCriterionUnworked(diaryFormData.grades[c.id], diaryFormData.unworkedCriteria, c.id);
                              if (isUnworked) {
                                const newGrades = { ...diaryFormData.grades };
                                delete newGrades[c.id];
                                const newUnworked = { ...(diaryFormData.unworkedCriteria || {}) };
                                delete newUnworked[c.id];
                                setDiaryFormData({
                                  ...diaryFormData,
                                  grades: newGrades,
                                  unworkedCriteria: newUnworked
                                });
                              } else {
                                setDiaryFormData({
                                  ...diaryFormData,
                                  grades: { ...diaryFormData.grades, [c.id]: "unworked" },
                                  unworkedCriteria: { ...(diaryFormData.unworkedCriteria || {}), [c.id]: true }
                                });
                              }
                            }}
                            className={`w-full mt-2 p-2.5 rounded-2xl border text-[9px] font-black tracking-tight text-left transition-all flex items-start gap-2 cursor-pointer shadow-sm ${
                              isCriterionUnworked(diaryFormData.grades[c.id], diaryFormData.unworkedCriteria, c.id)
                                ? "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/30" 
                                : "bg-white hover:bg-slate-100/80 text-slate-700 border-slate-200"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 border font-black transition-all ${
                              isCriterionUnworked(diaryFormData.grades[c.id], diaryFormData.unworkedCriteria, c.id)
                                ? "bg-white text-amber-600 border-white" 
                                : "border-slate-300 bg-slate-50 text-transparent"
                            }`}>
                              ✓
                            </span>
                            <span className="leading-snug">
                              {UNWORKED_TEACHER_OPTION}
                            </span>
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Section 3: General Pedagogical Observation */}
          <div className="bg-[#016a86] p-12 rounded-[50px] shadow-2xl shadow-teal-900/20 text-white space-y-8">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-pro-yellow">
                  <Save size={24} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Parecer Pedagógico Geral</h3>
             </div>
             <textarea
               required
               placeholder="Descreva a evolução comportamental, técnica e artística do aluno neste período..."
               value={diaryFormData.generalPedagogicalObs}
               onChange={(e) => setDiaryFormData({ ...diaryFormData, generalPedagogicalObs: e.target.value })}
               className="w-full px-8 py-8 bg-white/10 border border-white/20 rounded-[40px] text-sm md:text-lg font-bold text-white placeholder:text-white/30 min-h-[250px] focus:outline-none focus:border-white/50 backdrop-blur-md transition-all"
             />
          </div>

          {/* Action Area */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 flex flex-col md:flex-row gap-4">
             <button 
               type="button"
               onClick={handleDownloadPDF}
               className="py-5 px-6 bg-amber-400 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-amber-300 active:scale-95 transition-all border border-amber-300 flex items-center justify-center gap-2"
               title="Baixar Diário em PDF"
             >
               <Download size={16} /> PDF
             </button>
             <button 
               onClick={() => handleValidatedSubmit("rascunho")}
               className="flex-1 py-5 bg-white text-pro-teal font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-slate-50 active:scale-95 transition-all border border-slate-100"
             >
               Salvar Rascunho
             </button>
             <button 
               onClick={() => handleValidatedSubmit("concluido")}
               className="flex-[2] py-5 bg-pro-teal text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-teal-900/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               <CheckCircle2 size={16} /> Finalizar e Consolidar
             </button>
          </div>
        </div>
      </div>
    </motion.div>

    {/* MODAL DE PRAZO DE DIÁRIO EXPIRADO */}
    <DeadlineExpiredModal
      isOpen={showExpiredModal}
      onClose={() => setShowExpiredModal(false)}
      type="professor_diary"
      referencePeriod={deadlineInfo.formattedReference}
      formattedDeadline={deadlineInfo.formattedDeadline}
      studentName={getUserDisplayName(student)}
      className={targetClass ? `${targetClass.code} - ${targetClass.type}` : undefined}
    />
  </>
  );
};
