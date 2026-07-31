/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserCircle, ChevronDown, ArrowLeft, AlertTriangle, Trash2, CheckCircle, X, Loader2 } from "lucide-react";
import { User, UserRole } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";
import { getUserDisplayName, getUserSecondaryName } from "../lib/userUtils";
import { db } from "../lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";

interface UsersListViewProps {
  users: User[];
  filter: "Todos" | UserRole;
  setFilter: (filter: "Todos" | UserRole) => void;
  filteredUsers: User[];
  setSelectedUserId: (id: string | null) => void;
  setView: (view: string) => void;
  showNotification: (message: string, title?: string, type?: "success" | "warning" | "error") => void;
}

export const UsersListView = ({
  users,
  filter,
  setFilter,
  filteredUsers,
  setSelectedUserId,
  setView,
  showNotification
}: UsersListViewProps) => {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // Group duplicate users by lowercase email
  const getDuplicateGroups = () => {
    const groups: Record<string, User[]> = {};
    users.forEach((user) => {
      if (!user.email) return;
      const emailKey = user.email.trim().toLowerCase();
      if (!groups[emailKey]) {
        groups[emailKey] = [];
      }
      groups[emailKey].push(user);
    });

    const duplicateEntries: { email: string; users: User[]; keep: User; remove: User[] }[] = [];

    Object.entries(groups).forEach(([email, groupUsers]) => {
      if (groupUsers.length > 1) {
        // Choose the best one to keep
        const sorted = [...groupUsers].sort((a, b) => {
          // 1. Password changed priority
          const aPwd = (a as any).passwordChanged ? 1 : 0;
          const bPwd = (b as any).passwordChanged ? 1 : 0;
          if (aPwd !== bPwd) return bPwd - aPwd;

          // 2. Auth UID format priority (typically length 28)
          const aUid = (a.id || "").length === 28 ? 1 : 0;
          const bUid = (b.id || "").length === 28 ? 1 : 0;
          if (aUid !== bUid) return bUid - aUid;

          // 3. Keep the one with artisticName or more filled fields
          const aScore = (a.artisticName ? 2 : 0) + (a.photo ? 1 : 0) + (a.phone || (a as any).telefone ? 1 : 0);
          const bScore = (b.artisticName ? 2 : 0) + (b.photo ? 1 : 0) + (b.phone || (b as any).telefone ? 1 : 0);
          if (aScore !== bScore) return bScore - aScore;

          // 4. Default comparison
          return (a.id || "").localeCompare(b.id || "");
        });

        const keep = sorted[0];
        const remove = sorted.slice(1);

        duplicateEntries.push({
          email,
          users: groupUsers,
          keep,
          remove,
        });
      }
    });

    return duplicateEntries;
  };

  const duplicateGroups = getDuplicateGroups();

  const handleCleanupDuplicates = async () => {
    setIsCleaning(true);
    let count = 0;
    try {
      for (const group of duplicateGroups) {
        for (const userToRemove of group.remove) {
          await deleteDoc(doc(db, "usuarios", userToRemove.id));
          count++;
        }
      }
      showNotification(`Sucesso! ${count} usuário(s) duplicado(s) removido(s) com sucesso.`, "Limpar Base", "success");
      setShowDuplicateModal(false);
    } catch (err: any) {
      showNotification("Erro ao excluir duplicados: " + err.message, "Erro", "error");
    } finally {
      setIsCleaning(false);
    }
  };

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
        <div className="flex flex-wrap items-center justify-center gap-3 pb-6 border-b border-slate-100">
          {["Todos", "Aluno", "Professor", "Gestor", "Diretor Pedagógico"].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                filter === type 
                ? "bg-pro-teal text-white shadow-xl shadow-teal-900/20 scale-105" 
                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Duplicates Notice Banner */}
        {duplicateGroups.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-[24px] p-6 flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <div className="flex gap-4 items-start min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Usuários Duplicados Detectados</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed mt-0.5">
                  Detectamos {duplicateGroups.length} e-mail(s) com múltiplos registros na base de dados.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDuplicateModal(true)}
              className="w-full md:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shrink-0"
            >
              Ver e Corrigir
            </button>
          </motion.div>
        )}

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
                        <span className="font-black text-slate-700 uppercase tracking-tight leading-none mb-1">{getUserDisplayName(u)}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{getUserSecondaryName(u) ? `Nome social: ${getUserSecondaryName(u)}${u.pronouns ? ` • (${u.pronouns})` : ''}` : (u.pronouns ? `(${u.pronouns})` : "...")}</span>
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

      {/* Duplicate Cleanup Modal */}
      <AnimatePresence>
        {showDuplicateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isCleaning) setShowDuplicateModal(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-white flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Resolver Duplicados</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de higienização de base de dados</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDuplicateModal(false)}
                  disabled={isCleaning}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs text-amber-800 font-bold leading-normal">
                    Este assistente identifica múltiplos registros de usuários criados com o mesmo e-mail e preserva apenas a conta mais recente/ativa com credenciais salvas. Os outros registros duplicados antigos serão excluídos permanentemente.
                  </p>
                </div>

                <div className="space-y-4">
                  {duplicateGroups.map((group, idx) => (
                    <div key={idx} className="border border-slate-100 bg-slate-50/50 rounded-[32px] p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-sm font-black text-slate-800 tracking-tight">{group.email}</span>
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {group.users.length} registros
                        </span>
                      </div>

                      <div className="space-y-3">
                        {/* Record to KEEP */}
                        <div className="flex items-center justify-between p-3.5 bg-green-50/55 border border-green-100 rounded-2xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-white overflow-hidden shadow-sm shrink-0">
                              <Avatar src={group.keep.photo} fallbackSize={16} className="w-full h-full rounded-none" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 truncate">{group.keep.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 truncate">ID: {group.keep.id}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                            MANTER (Ativa)
                          </span>
                        </div>

                        {/* Records to REMOVE */}
                        {group.remove.map((remUser) => (
                          <div key={remUser.id} className="flex items-center justify-between p-3.5 bg-red-50/55 border border-red-100 rounded-2xl">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-white overflow-hidden shadow-sm shrink-0">
                                <Avatar src={remUser.photo} fallbackSize={16} className="w-full h-full rounded-none" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{remUser.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 truncate">ID: {remUser.id}</p>
                              </div>
                            </div>
                            <span className="text-[8px] font-black text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                              EXCLUIR (Duplicado)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                <button
                  onClick={() => setShowDuplicateModal(false)}
                  disabled={isCleaning}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 hover:bg-slate-100/50 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCleanupDuplicates}
                  disabled={isCleaning}
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-red-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCleaning ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Higienizando...
                    </>
                  ) : (
                    "Corrigir Duplicados Agora"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
