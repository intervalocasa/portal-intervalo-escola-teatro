/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Filter, 
  Award, 
  Calendar, 
  ChevronDown,
  Users
} from "lucide-react";
import { collectionGroup, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserBadge, Class, User } from "../types";
import { Avatar } from "../components/CommonComponents";

interface BadgesManagerViewProps {
  onBack: () => void;
  classes: Class[];
  users: User[];
}

export const BadgesManagerView: React.FC<BadgesManagerViewProps> = ({ onBack, classes, users }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [awardedBadges, setAwardedBadges] = useState<(UserBadge & { userId: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const years = [2024, 2025, 2026];

  useEffect(() => {
    fetchBadges();
  }, [selectedMonth, selectedYear, selectedClassId]);

  const fetchBadges = async () => {
    setIsLoading(true);
    try {
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

      let q;
      // Note: collectionGroup query might require an index for composite filters.
      if (selectedClassId === "all") {
        q = query(
          collectionGroup(db, "userBadges"),
          where("dateReceived", ">=", Timestamp.fromDate(startOfMonth)),
          where("dateReceived", "<=", Timestamp.fromDate(endOfMonth)),
          orderBy("dateReceived", "desc")
        );
      } else {
        q = query(
          collectionGroup(db, "userBadges"),
          where("classId", "==", selectedClassId),
          where("dateReceived", ">=", Timestamp.fromDate(startOfMonth)),
          where("dateReceived", "<=", Timestamp.fromDate(endOfMonth)),
          orderBy("dateReceived", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => {
        const pathSegments = doc.ref.path.split('/');
        const userId = pathSegments[1];
        return {
          id: doc.id,
          userId,
          ...doc.data()
        } as (UserBadge & { userId: string });
      });
      
      setAwardedBadges(fetched);
    } catch (error: any) {
      console.error("Error fetching awarded badges:", error);
      
      // Check if it's an index error
      const isIndexError = error?.message?.includes("index");

      // Robust Fallback: Fetch all badges and filter client-side
      try {
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        
        // Use the most basic query possible which usually doesn't require complex indices
        const fallbackQ = query(collectionGroup(db, "userBadges"));
        const snapshot = await getDocs(fallbackQ);
        const fetched = snapshot.docs.map(doc => {
          const pathSegments = doc.ref.path.split('/');
          return { id: doc.id, userId: pathSegments[1], ...doc.data() } as (UserBadge & { userId: string });
        });
        
        // Client-side filtering and sorting
        const filtered = fetched.filter(b => {
          const date = b.dateReceived?.toDate ? b.dateReceived.toDate() : null;
          if (!date) return false;
          
          const isInMonth = date >= startOfMonth && date <= endOfMonth;
          const matchesClass = selectedClassId === "all" || b.classId === selectedClassId;
          
          return isInMonth && matchesClass;
        });
        
        // Sort by date desc
        filtered.sort((a, b) => {
          const dateA = a.dateReceived?.toMillis ? a.dateReceived.toMillis() : 0;
          const dateB = b.dateReceived?.toMillis ? b.dateReceived.toMillis() : 0;
          return dateB - dateA;
        });
          
        setAwardedBadges(filtered);
        
        if (isIndexError) {
          console.warn("Used client-side fallback due to missing index. Please create the required index for better performance.");
        }
      } catch (fallbackError) {
        console.error("Fallback fetching failed:", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeIcon = (id: string) => {
    switch(id) {
      case 'presenca-vip': return "✨";
      case 'critico-de-arte': return "🎨";
      case 'embaixador-da-arte': return "🤝";
      case 'perseveranca': return "🔥";
      case 'primeira-conquista': return "🎖️";
      default: return "🏆";
    }
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
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gerenciador de Selos</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Histórico de Conquistas</p>
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
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-pro-teal/20 transition-all font-bold"
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
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-pro-teal/20 transition-all font-bold"
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
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando histórico...</p>
            </div>
          ) : awardedBadges.length === 0 ? (
            <div className="bg-white p-16 rounded-[40px] text-center border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 transition-all group-hover:scale-110">
                <Award size={40} className="opacity-20" />
              </div>
              <h3 className="text-slate-800 font-black uppercase tracking-tight text-lg">Nenhum selo</h3>
              <p className="text-slate-400 font-medium text-sm mt-2 max-w-xs mx-auto">Nenhuma conquista registrada para este período ou turma.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center justify-between px-4 mb-2">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{awardedBadges.length} registros encontrados</span>
                </div>
              </div>
              
              {awardedBadges.map((item, idx) => {
                const student = users.find(u => u.id === item.userId);
                const classItem = classes.find(c => c.id === item.classId);
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all group p-4 sm:p-5"
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                      <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
                        <Avatar src={student?.photo} size={48} fallbackSize={20} />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-slate-800 font-black uppercase text-[11px] leading-tight truncate">{student?.name || "Aluno(a)"}</h4>
                          <p className="text-[10px] font-bold text-pro-teal uppercase tracking-tight truncate mt-0.5">{classItem?.type || "Turma Geral"}</p>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-row items-center gap-4 w-full bg-slate-50/50 p-3 rounded-2xl border border-slate-50">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl shrink-0">
                          {getBadgeIcon(item.badgeId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">{item.name}</h5>
                          <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                            <Calendar size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">
                              {item.dateReceived?.toDate ? new Date(item.dateReceived.toDate()).toLocaleDateString('pt-BR') : ""}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ID do Badge</span>
                        <code className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{item.badgeId}</code>
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
