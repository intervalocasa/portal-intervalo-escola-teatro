/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Megaphone, X, ChevronRight, Bell } from "lucide-react";
import { useState } from "react";

interface AnnouncementPanelProps {
  announcements: any[];
}

export const AnnouncementPanel = ({ announcements }: AnnouncementPanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
          <Bell size={16} fill="currentColor" />
        </div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Painel de Avisos</h3>
      </div>
      
      <div className="grid gap-3">
        {announcements.map((aviso, idx) => (
          <motion.div
            key={aviso.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${
              expandedId === aviso.id ? "ring-2 ring-pro-teal/20" : ""
            }`}
          >
            <div 
              onClick={() => setExpandedId(expandedId === aviso.id ? null : aviso.id)}
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-3 rounded-2xl ${
                  aviso.target === "Todos" ? "bg-blue-50 text-blue-500" :
                  aviso.target === "Alunos" ? "bg-pro-teal/10 text-pro-teal" :
                  "bg-purple-50 text-purple-500"
                }`}>
                  <Megaphone size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{aviso.target}</span>
                     {aviso.targetSpecificUsers && (
                       <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded">Direcionado</span>
                     )}
                  </div>
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight line-clamp-1">{aviso.title}</h4>
                </div>
              </div>
              
              <div className={`p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-pro-teal group-hover:text-white transition-all ${
                expandedId === aviso.id ? "rotate-90 bg-pro-teal text-white" : ""
              }`}>
                <ChevronRight size={18} />
              </div>
            </div>

            <AnimatePresence>
              {expandedId === aviso.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-6 pt-0">
                    <div className="h-px bg-slate-50 mb-4" />
                    <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {aviso.content}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
