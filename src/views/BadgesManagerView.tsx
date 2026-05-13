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
  Users,
  User as UserIcon,
  Trash2
} from "lucide-react";
import { collectionGroup, query, where, getDocs, orderBy, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserBadge, Class, User } from "../types";
import { Avatar } from "../components/CommonComponents";
import { BADGES } from "../constants/badges";

interface BadgesManagerViewProps {
  onBack: () => void;
  classes: Class[];
  users: User[];
  onRemoveBadge: (studentId: string, badgeId: string) => Promise<void>;
}

export const BadgesManagerView: React.FC<BadgesManagerViewProps> = ({ onBack, classes, users, onRemoveBadge }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [awardedBadges, setAwardedBadges] = useState<(UserBadge & { userId: string, awardedByName?: string })[]>([]);
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
          ...(doc.data() as any)
        } as (UserBadge & { userId: string });
      });
      
      setAwardedBadges(fetched);
    } catch (error: any) {
      console.error("Error fetching awarded badges:", error);
      
      // Robust Fallback: Fetch all badges and filter client-side
      try {
        const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
        const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        
        const fallbackQ = query(collectionGroup(db, "userBadges"));
        const snapshot = await getDocs(fallbackQ);
        const fetched = snapshot.docs.map(doc => {
          const pathSegments = doc.ref.path.split('/');
          return { id: doc.id, userId: pathSegments[1], ...(doc.data() as any) } as (UserBadge & { userId: string });
        });
        
        const filtered = fetched.filter(b => {
          const date = b.dateReceived?.toDate ? b.dateReceived.toDate() : null;
          if (!date) return false;
          
          const isInMonth = date >= startOfMonth && date <= endOfMonth;
          const matchesClass = selectedClassId === "all" || b.classId === selectedClassId;
          
          return isInMonth && matchesClass;
        });
        
        filtered.sort((a, b) => {
          const dateA = a.dateReceived?.toMillis ? a.dateReceived.toMillis() : 0;
          const dateB = b.dateReceived?.toMillis ? b.dateReceived.toMillis() : 0;
          return dateB - dateA;
        });
          
        setAwardedBadges(filtered);
      } catch (fallbackError) {
        console.error("Fallback fetching failed:", fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (studentId: string, badgeId: string) => {
    if (!window.confirm("Deseja realmente remover este selo?")) return;
    
    try {
      await onRemoveBadge(studentId, badgeId);
      // Update local state
      setAwardedBadges(prev => prev.filter(b => b.id !== badgeId));
    } catch (err) {
      console.error("Erro ao remover selo:", err);
    }
  };

  const getBadgeIcon = (id: string) => {
    const badge = BADGES.find(b => b.badgeId === id);
    return badge ? badge.icon : "🏆";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full bg-slate-50 min-h-screen pb-20"
    >
      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gerenciador de Selos</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle de Conquistas</p>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Filters */}
        <section className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-pro-teal" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtros</h2>
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
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-pro-teal/20"
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
                  className="w-full h-12 bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-pro-teal/20"
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
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando...</p>
            </div>
          ) : awardedBadges.length === 0 ? (
            <div className="bg-white p-16 rounded-[40px] text-center border-2 border-dashed border-slate-100">
              <Award size={40} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-slate-800 font-black uppercase text-sm">Nenhum selo encontrado</h3>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="flex items-center justify-between px-4 mb-2">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{awardedBadges.length} registros</span>
                </div>
              </div>
              
              {awardedBadges.map((item, idx) => {
                const student = users.find(u => u.id === item.userId);
                const classItem = classes.find(c => c.id === item.classId);
                const awardedBy = users.find(u => u.id === (item as any).awardedById) || { name: (item as any).awardedByName || "Sistema" };
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden hover:border-pro-teal/20 transition-all p-3 sm:p-4"
                  >
                    <div className="flex flex-col lg:flex-row items-center gap-4">
                      {/* Aluno Column */}
                      <div className="flex items-center gap-3 w-full lg:w-1/4 shrink-0 min-w-0">
                        <Avatar src={student?.photo} className="w-10 h-10 rounded-full" fallbackSize={16} />
                        <div className="min-w-0">
                          <h4 className="text-slate-800 font-black uppercase text-[11px] leading-tight truncate">{student?.name || "Aluno(a)"}</h4>
                          <p className="text-[9px] font-bold text-pro-teal uppercase tracking-tight truncate mt-0.5">{classItem?.type || "Turma Geral"}</p>
                        </div>
                      </div>

                      {/* Selo Column */}
                      <div className="flex-1 flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 min-w-0 w-full lg:w-auto">
                        <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center text-xl shrink-0">
                          {getBadgeIcon(item.badgeId)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-[10px] font-black text-slate-700 uppercase leading-none">{item.name}</h5>
                          <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                            <Calendar size={10} />
                            <span className="text-[8px] font-bold uppercase tracking-tight">
                              {item.dateReceived?.toDate ? new Date(item.dateReceived.toDate()).toLocaleDateString('pt-BR') : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Atribuído por Column */}
                      <div className="flex items-center gap-3 w-full lg:w-1/4 shrink-0 px-2">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-400 shrink-0">
                          <UserIcon size={14} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] font-black text-slate-300 uppercase block tracking-widest">Atribuído por</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase truncate block">{(awardedBy as any).name}</span>
                        </div>
                      </div>
                      
                      {/* Action Column */}
                      <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                        <div className="hidden xl:flex flex-col items-end gap-0.5 mr-2 shrink-0">
                          <span className="text-[7px] font-black text-slate-300 uppercase">ID</span>
                          <code className="text-[8px] font-mono text-slate-400">{item.badgeId}</code>
                        </div>
                        <button 
                          onClick={() => handleRemove(item.userId, item.id)}
                          className="flex-1 lg:flex-none p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          <span className="lg:hidden text-[9px] font-black uppercase">Remover Selo</span>
                        </button>
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
