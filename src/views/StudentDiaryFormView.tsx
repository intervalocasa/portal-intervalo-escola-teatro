/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ArrowLeft, Save, HelpCircle, CheckCircle2 } from "lucide-react";
import { User, Class } from "../types";
import { Avatar } from "../components/CommonComponents";
import { 
  PROFESSIONAL_COURSE_CRITERIA, 
  ADULT_COURSE_CRITERIA, 
  GRADE_LEGEND 
} from "../constants";

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
  setView: (view: string) => void;
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
  setView
}: StudentDiaryFormViewProps) => {
  const student = users.find(u => u.id === selectedDiaryStudentId);
  const targetClass = classes.find(c => c.id === selectedClassId);
  const isProfessional = targetClass?.type?.includes("Profissional") || targetClass?.type?.includes("Montagem");
  const criteria = isProfessional ? PROFESSIONAL_COURSE_CRITERIA : ADULT_COURSE_CRITERIA;

  return (
    <motion.div
      key="student-diary-form-screen"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-4xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col"
    >
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 md:py-16">
         <div className="space-y-4 text-center md:text-left">
           <button 
             onClick={() => setView("professor_diary")}
             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-100/50 hover:text-white transition-colors"
           >
             <ArrowLeft size={16} /> Voltar à Lista
           </button>
           <div>
             <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{student?.name}</h1>
             <p className="text-pro-yellow text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mt-2 italic bg-white/10 px-4 py-2 rounded-lg border border-white/10 inline-block backdrop-blur-md">
               {targetClass?.code} • {new Date(0, (diaryFilterMonth || 1) - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} {diaryFilterYear}
             </p>
           </div>
         </div>
         <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-white/10 overflow-hidden shadow-2xl bg-white/10 flex items-center justify-center">
            <Avatar src={student?.photo} fallbackSize={48} />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12 space-y-12 pb-32">
        <div className="max-w-4xl mx-auto w-full space-y-12">
          
          {/* Section 1: Frequency */}
          <div className="bg-white p-8 md:p-12 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
             <div className="flex items-center gap-4 border-l-4 border-pro-teal pl-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Frequência e Assiduidade</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Presenças</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={diaryFormData.presences}
                      onChange={(e) => setDiaryFormData({ ...diaryFormData, presences: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black text-slate-800 focus:outline-none focus:border-pro-teal transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Faltas</label>
                    <input 
                      type="number"
                      required
                      min="0"
                      value={diaryFormData.absences}
                      onChange={(e) => setDiaryFormData({ ...diaryFormData, absences: Number(e.target.value) })}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black text-slate-800 focus:outline-none focus:border-red-400 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações de Frequência</label>
                   <textarea
                     placeholder="Atrasos, saídas antecipadas, etc..."
                     value={diaryFormData.frequencyObs}
                     onChange={(e) => setDiaryFormData({ ...diaryFormData, frequencyObs: e.target.value })}
                     className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 min-h-[90px] focus:outline-none focus:border-pro-teal transition-all"
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
                             <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{c.label}</h4>
                          </div>
                          <p className="text-sm text-slate-400 font-bold leading-relaxed">{c.definition}</p>
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

                       <div className="flex flex-col items-center gap-3 bg-slate-50 p-6 rounded-[40px] border border-slate-100 group-hover:bg-white transition-all min-w-[200px]">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota do Professor</label>
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
               onClick={() => handleSubmitDiary("rascunho")}
               className="flex-1 py-5 bg-white text-pro-teal font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl hover:bg-slate-50 active:scale-95 transition-all border border-slate-100"
             >
               Salvar como Rascunho
             </button>
             <button 
               onClick={() => handleSubmitDiary("concluido")}
               className="flex-[2] py-5 bg-pro-teal text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-teal-900/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               <CheckCircle2 size={16} /> Finalizar e Consolidar Notas
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
