/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { UserCircle, ChevronDown, ArrowLeft } from "lucide-react";
import { User, UserRole } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";

interface UsersListViewProps {
  users: User[];
  filter: "Todos" | UserRole;
  setFilter: (filter: "Todos" | UserRole) => void;
  filteredUsers: User[];
  setSelectedUserId: (id: string | null) => void;
  setView: (view: string) => void;
}

export const UsersListView = ({
  users,
  filter,
  setFilter,
  filteredUsers,
  setSelectedUserId,
  setView
}: UsersListViewProps) => {
  return (
    <motion.div
      key="users-list-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col"
    >
      {/* Back Button Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
      </div>

      {/* Header Dashboard */}
      <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-8 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
         <Logo className="h-10 md:h-16 w-auto mb-1" />
         <h1 className="text-white text-xl md:text-3xl font-bold">Base de Dados</h1>
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none">Controle Central de Usuários</p>
      </div>

      <div className="p-8 md:p-16 space-y-6 flex-1 flex flex-col max-w-7xl mx-auto w-full">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-4 pb-6 border-b border-slate-100">
          {["Todos", "Aluno", "Professor", "Gestor"].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              className={`px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                filter === type 
                ? "bg-pro-teal text-white shadow-xl shadow-teal-900/20 scale-105" 
                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar min-h-[400px]">
          <AnimatePresence mode="popLayout">
            {filteredUsers.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <motion.button
                    key={u.id}
                    layout
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setView("user_details");
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full py-4 px-2 flex justify-between items-center hover:bg-slate-50 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-pro-teal group-hover:text-white transition-colors overflow-hidden">
                        <Avatar src={u.photo} fallbackSize={20} className="w-full h-full rounded-none" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700 uppercase tracking-tight leading-none mb-1">{u.artisticName || u.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.artisticName ? u.name : "..."}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{u.role}</span>
                      <ChevronDown size={16} className="text-slate-300 -rotate-90" />
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 font-medium italic">
                Nenhum usuário encontrado nesta categoria.
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Back Action */}
        <div className="pt-6 border-t border-slate-50 flex justify-center">
          <button 
            onClick={() => setView("dashboard")} 
            className="px-10 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors uppercase tracking-widest text-[10px] font-black shadow-lg shadow-black/10"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>
    </motion.div>
  );
};
