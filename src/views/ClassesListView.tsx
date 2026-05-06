/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronDown, Presentation, Edit } from "lucide-react";
import { Class, User } from "../types";
import { Logo } from "../components/CommonComponents";

interface ClassesListViewProps {
  classes: Class[];
  users: User[];
  setSelectedClassId: (id: string | null) => void;
  setView: (view: string) => void;
  setClassData: (data: any) => void;
}

export const ClassesListView = ({
  classes,
  users,
  setSelectedClassId,
  setView,
  setClassData
}: ClassesListViewProps) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredClasses = classes.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (users.find(u => u.id === c.teacherId)?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <motion.div
      key="classes-list-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col"
    >
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
         <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
         <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">Turmas & Oficinas</h1>
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Base de Dados Acadêmica</p>
      </div>

      <div className="p-8 md:p-16 space-y-6 flex-1 flex flex-col max-w-7xl mx-auto w-full overflow-y-auto custom-scrollbar bg-slate-50">
        <div className="relative">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por turma, tipo ou professor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[28px] text-sm text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:shadow-lg focus:shadow-teal-900/5 placeholder:text-slate-400 font-bold"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
          <AnimatePresence mode="popLayout">
            {filteredClasses.length > 0 ? (
              <div className="grid gap-3 pt-4">
                {filteredClasses.map((c) => (
                  <motion.button
                    key={c.id}
                    layout
                    onClick={() => {
                      setSelectedClassId(c.id);
                      setView("class_details");
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full p-5 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1 transition-all group text-left flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-pro-teal/5 rounded-[20px] flex items-center justify-center text-pro-teal group-hover:bg-pro-teal group-hover:text-white transition-all transform group-hover:rotate-6">
                        <Presentation size={24} />
                      </div>
                      <div className="space-y-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {c.isActive ? "Ativa" : "Inativa"}
                        </span>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg leading-none">{c.code}</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.type}</p>
                          {(c.weekday || c.time) && (
                            <div className="flex items-center gap-1 text-pro-teal/60">
                              <span className="w-1 h-1 bg-slate-200 rounded-full hidden sm:block"></span>
                              <p className="text-[9px] font-black uppercase tracking-widest">
                                {c.weekday}{c.weekday && c.time ? " • " : ""}{c.time}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-6">
                      <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Professor</p>
                        <p className="text-[11px] font-bold text-slate-500 uppercase">{users.find(u => u.id === c.teacherId)?.name || "..."}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClassId(c.id);
                            setClassData({
                              id: c.id,
                              code: c.code,
                              type: c.type,
                              teacherId: c.teacherId,
                              studentIds: c.studentIds || [],
                              isActive: c.isActive,
                              inactivationReason: c.inactivationReason || "",
                              year: c.year,
                              weekday: c.weekday || "",
                              time: c.time || "",
                              startDate: c.startDate || ""
                            });
                            setView("edit_class");
                          }}
                          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-pro-teal hover:text-white transition-all shadow-sm"
                          title="Editar Turma"
                        >
                          <Edit size={16} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-pro-teal/10 group-hover:text-pro-teal transition-all">
                          <ChevronDown size={20} className="-rotate-90" />
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Search size={32} />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Nenhuma turma correspondente encontrada.</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-center">
          <button 
            onClick={() => setView("dashboard")} 
            className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-600 transition-colors"
          >
            Voltar ao Menu Principal
          </button>
        </div>
      </div>
    </motion.div>
  );
};
