/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  Filter, 
  MessageSquare, 
  Star, 
  Calendar, 
  Search,
  ChevronDown
} from "lucide-react";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ClassFeedback, Class, User } from "../types";
import { Avatar } from "../components/CommonComponents";

interface LessonRatingsViewProps {
  onBack: () => void;
  classes: Class[];
  users: User[];
}

export const LessonRatingsView: React.FC<LessonRatingsViewProps> = ({ onBack, classes, users }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [feedbacks, setFeedbacks] = useState<ClassFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = [2024, 2025, 2026];

  useEffect(() => {
    fetchFeedbacks();
  }, [selectedMonth, selectedYear, selectedClassId]);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

      let q;
      if (selectedClassId === "all") {
        q = query(
          collection(db, "feedbacks-aulas"),
          where("timestamp", ">=", Timestamp.fromDate(startOfMonth)),
          where("timestamp", "<=", Timestamp.fromDate(endOfMonth)),
          orderBy("timestamp", "desc")
        );
      } else {
        q = query(
          collection(db, "feedbacks-aulas"),
          where("classId", "==", selectedClassId),
          where("timestamp", ">=", Timestamp.fromDate(startOfMonth)),
          where("timestamp", "<=", Timestamp.fromDate(endOfMonth)),
          orderBy("timestamp", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const fetchedFeedbacks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as ClassFeedback[];
      
      setFeedbacks(fetchedFeedbacks);
    } catch (error: any) {
      console.error("Error fetching feedbacks:", error);
      
      // Fallback: Fetch broadly and filter in memory if index is missing
      try {
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        
        // Simpler query that usually doesn't need composite index
        const fallbackQ = query(collection(db, "feedbacks-aulas"));
        const snapshot = await getDocs(fallbackQ);
        
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as any)
        })) as ClassFeedback[];
        
        const filtered = fetched.filter(f => {
          const date = f.timestamp?.toDate ? f.timestamp.toDate() : null;
          if (!date) return false;
          
          const isInMonth = date >= startOfMonth && date <= endOfMonth;
          const matchesClass = selectedClassId === "all" || f.classId === selectedClassId;
          
          return isInMonth && matchesClass;
        });
        
        filtered.sort((a, b) => {
          const dateA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const dateB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return dateB - dateA;
        });
        
        setFeedbacks(filtered);
      } catch (fallbackError) {
        console.error("Fallback fetching failed:", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-500 bg-green-50";
    if (rating >= 3.5) return "text-blue-500 bg-blue-50";
    if (rating >= 2.5) return "text-amber-500 bg-amber-50";
    return "text-red-500 bg-red-50";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-slate-50 min-h-screen"
    >
      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Avaliações de Aulas</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feedback dos Alunos</p>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Filters */}
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-pro-teal" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtros de Busca</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turma</label>
              <div className="relative">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-pro-teal/20 transition-all pointer-events-auto"
                >
                  <option value="all">Todas as Turmas</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.type} - {c.weekday} {c.time}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mês</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-pro-teal/20 transition-all"
                >
                  {months.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ano</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-pro-teal/20 transition-all"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-pro-teal/20 border-t-pro-teal rounded-full animate-spin" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando avaliações...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white p-16 rounded-[40px] text-center border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 font-black italic text-4xl">?</div>
              <h3 className="text-slate-800 font-black uppercase tracking-tight text-lg">Nenhuma avaliação</h3>
              <p className="text-slate-400 font-medium text-sm mt-2 max-w-xs mx-auto">Não encontramos feedbacks para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {feedbacks.map((item, idx) => {
                const student = users.find(u => u.id === item.studentId);
                const classItem = classes.find(c => c.id === item.classId);
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group"
                  >
                    <div className="p-6 flex flex-col md:flex-row gap-6">
                      <div className="flex items-center gap-4 shrink-0">
                        <Avatar src={student?.photo} className="w-14 h-14 rounded-full" fallbackSize={24} />
                        <div>
                          <h4 className="text-slate-800 font-black uppercase text-sm leading-tight">{student?.name || item.studentName}</h4>
                          <p className="text-[10px] font-bold text-pro-teal uppercase tracking-widest mt-0.5">{classItem?.type || "Turma não encontrada"}</p>
                          <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                            <Calendar size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                              {item.timestamp?.toDate ? new Date(item.timestamp.toDate()).toLocaleDateString('pt-BR') : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="space-y-1">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Média (1-5)</p>
                             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-tight w-fit ${getRatingColor(item.rating)}`}>
                                <Star size={12} fill="currentColor" />
                                {item.rating.toFixed(1)}
                             </div>
                          </div>

                          {item.npsRating !== undefined && (
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NPS (0-10)</p>
                               <div className="text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-xl w-fit">
                                 {item.npsRating}
                               </div>
                            </div>
                          )}

                          {item.expressionScore && (
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Espaço/Escuta</p>
                               <div className="text-xs font-black text-slate-600 bg-slate-50 px-3 py-1 rounded-xl w-fit">
                                 {item.expressionScore}/5
                               </div>
                            </div>
                          )}

                          {item.qualityScore && (
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Clareza/Qualidade</p>
                               <div className="text-xs font-black text-slate-600 bg-slate-50 px-3 py-1 rounded-xl w-fit">
                                 {item.qualityScore}/5
                               </div>
                            </div>
                          )}
                        </div>

                        {item.challengeScore && (
                          <div className="mb-4">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-1">Desafio/Evolução</p>
                             <div className="text-xs font-black text-slate-600 bg-slate-50 px-3 py-1 rounded-xl w-fit">
                               {item.challengeScore}/5
                             </div>
                          </div>
                        )}

                        {item.comment ? (
                          <div className="bg-slate-50 p-4 rounded-2xl relative border border-slate-100">
                            <MessageSquare size={14} className="absolute -top-1.5 -left-1.5 text-pro-teal/20" />
                            <p className="text-sm text-slate-600 font-medium italic leading-relaxed">
                              "{item.comment}"
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-300 font-bold uppercase tracking-widest italic mt-2">Sem comentário adicional</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
};
