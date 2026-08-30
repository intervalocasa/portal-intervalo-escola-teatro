/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Megaphone, Calendar, Users, ArrowLeft, Send, Clock, Trash2, Edit2, Search, Check, Filter } from "lucide-react";
import { Logo, BackButton, Avatar } from "../components/CommonComponents";
import { FormEvent, useState, useMemo } from "react";
import { THEME } from "../theme";
import { getUserDisplayName } from "../lib/userUtils";

interface CreateAnnouncementViewProps {
  handleAnnouncementSubmit: (announcement: any) => Promise<void>;
  setView: (view: string) => void;
  announcements: any[];
  handleDeleteAnnouncement: (id: string) => Promise<void>;
  handleClearAllAnnouncements: () => Promise<void>;
  users: any[];
}

export const CreateAnnouncementView = ({
  handleAnnouncementSubmit,
  setView,
  announcements,
  handleDeleteAnnouncement,
  handleClearAllAnnouncements,
  users
}: CreateAnnouncementViewProps) => {
  const INITIAL_STATE = {
    title: "",
    content: "",
    target: "Todos" as "Todos" | "Alunos" | "Professores",
    scheduledFor: "",
    targetSpecificUsers: false,
    targetUserIds: [] as string[],
  };

  const [formData, setFormData] = useState(INITIAL_STATE);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        const displayName = getUserDisplayName(u).toLowerCase();
        const matchesSearch = displayName.includes(searchTerm.toLowerCase());
        const isTeacher = u.role === "Professor" || u.role === "Diretor Pedagógico e Professor" || u.role === "Diretor Pedagógico";
        const matchesRole = formData.target === "Todos" || (formData.target === "Alunos" ? u.role === "Aluno" : isTeacher);
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'pt-BR'));
  }, [users, searchTerm, formData.target]);

  const toggleUserSelection = (userId: string) => {
    setFormData(prev => {
      const isSelected = prev.targetUserIds.includes(userId);
      if (isSelected) {
        return { ...prev, targetUserIds: prev.targetUserIds.filter(id => id !== userId) };
      } else {
        return { ...prev, targetUserIds: [...prev.targetUserIds, userId] };
      }
    });
  };

  const handleEditClick = (aviso: any) => {
    const formattedDate = aviso.scheduledFor 
      ? new Date(aviso.scheduledFor.seconds * 1000).toISOString().slice(0, 16)
      : "";
      
    setFormData({
      title: aviso.title,
      content: aviso.content,
      target: aviso.target,
      scheduledFor: formattedDate,
      targetSpecificUsers: aviso.targetSpecificUsers || false,
      targetUserIds: aviso.targetUserIds || [],
    });
    setEditingId(aviso.id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (formData.targetSpecificUsers && formData.targetUserIds.length === 0) {
      alert("Selecione pelo menos um usuário.");
      return;
    }
    setIsLoading(true);
    try {
      await handleAnnouncementSubmit({ ...formData, id: editingId });
      setFormData(INITIAL_STATE);
      setEditingId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData(INITIAL_STATE);
    setEditingId(null);
  };

  return (
    <motion.div
      key="create-announcement-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      <div className="absolute top-4 left-4 z-20">
        <BackButton 
          onClick={() => setView("dashboard")} 
          className="!text-white pointer-events-auto" 
        />
      </div>
      
      <div className="bg-gradient-to-br from-pro-teal to-teal-900 p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
         <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
         <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">
           Painel de Avisos
         </h1>
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Comunicação e Engajamento</p>
      </div>

      <div className="p-8 md:p-16 space-y-12 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Form Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">
              {editingId ? "Editar Aviso" : "Criar Novo Aviso"}
            </h4>
            {editingId && (
              <button 
                onClick={cancelEdit}
                className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:brightness-90 transition-all"
              >
                Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={onSubmit} className="bg-slate-50/50 p-6 md:p-10 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Título do Aviso</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Reunião Geral de Professores"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Conteúdo</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escreva aqui a mensagem que os usuários verão..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Destinatários</label>
                  <select
                    value={formData.target}
                    onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                  >
                    <option value="Todos">Todos os Usuários</option>
                    <option value="Alunos">Apenas Alunos</option>
                    <option value="Professores">Apenas Professores</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Agendar para (Opcional)</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
                  />
                </div>
              </div>

              {/* Target Specific Users Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, targetSpecificUsers: !prev.targetSpecificUsers }))}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all w-full md:w-auto ${
                    formData.targetSpecificUsers 
                    ? "bg-pro-teal/10 border-pro-teal text-pro-teal" 
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    formData.targetSpecificUsers ? "bg-pro-teal border-pro-teal text-white" : "bg-white border-slate-300"
                  }`}>
                    {formData.targetSpecificUsers && <Check size={14} />}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">Enviar para usuários específicos</span>
                </button>
              </div>

              {/* User Selection Area */}
              <AnimatePresence>
                {formData.targetSpecificUsers && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-2"
                  >
                    <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-xl">
                      <Search size={18} className="text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Pesquisar usuários..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-slate-700"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                      {filteredUsers.length === 0 ? (
                        <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum usuário encontrado</p>
                        </div>
                      ) : (
                        filteredUsers.map(user => (
                          <div 
                            key={user.id}
                            onClick={() => toggleUserSelection(user.id)}
                            className={`p-3 rounded-2xl flex items-center gap-3 border cursor-pointer transition-all ${
                              formData.targetUserIds.includes(user.id)
                              ? "bg-pro-teal border-pro-teal text-white shadow-lg shadow-teal-900/10"
                              : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                            }`}
                          >
                            <Avatar src={user.photo} alt={getUserDisplayName(user)} className="w-8 h-8 rounded-lg !text-[10px]" />
                            <div className="flex-1 min-w-0">
                               <p className="text-[10px] font-black uppercase truncate">{getUserDisplayName(user)}</p>
                               <p className={`text-[8px] font-bold uppercase opacity-60`}>{user.role}</p>
                            </div>
                            {formData.targetUserIds.includes(user.id) && <Check size={16} />}
                          </div>
                        ))
                      )}
                    </div>
                    
                    {formData.targetUserIds.length > 0 && (
                      <div className="flex items-center justify-between px-2">
                        <p className="text-[9px] font-black text-pro-teal uppercase tracking-widest">
                          {formData.targetUserIds.length} selecionado(s)
                        </p>
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, targetUserIds: [] }))}
                          className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-500"
                        >
                          Limpar tudo
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-5 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-[0.98] ${
                editingId ? "bg-amber-500 shadow-amber-900/20" : "bg-pro-teal shadow-teal-900/20"
              } hover:brightness-110`}
            >
              {editingId ? <Edit2 size={20} /> : <Send size={20} />}
              {isLoading ? "Enviando..." : editingId ? "Salvar Alterações" : (formData.scheduledFor ? "Agendar Aviso" : "Publicar Agora")}
            </button>
          </form>
        </section>

        {/* List Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">Avisos Recentes</h4>
            {announcements.length > 0 && (
              <button 
                onClick={handleClearAllAnnouncements}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-red-100"
              >
                <Trash2 size={14} />
                Limpar Mural
              </button>
            )}
          </div>

          <div className="max-h-[600px] overflow-y-auto announcements-scroll pr-2 -mr-2 bg-slate-50/20 rounded-[32px] p-2">
            <div className="grid gap-4">
              {announcements.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[28px] border-2 border-dashed border-slate-200">
                  <Megaphone size={40} className="mx-auto text-slate-300 mb-4 opacity-50" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Nenhum aviso cadastrado ainda</p>
                </div>
              ) : (
                announcements.map((aviso) => {
                  const isUnread = aviso.lido === false;
                  return (
                    <div 
                      key={aviso.id} 
                      className={`bg-white p-5 rounded-[28px] border shadow-sm transition-all group relative ${
                        isUnread ? "bg-amber-50/50 border-amber-200 ring-1 ring-amber-200/50" : "border-slate-100"
                      }`}
                    >
                      {isUnread && (
                        <div className="absolute top-4 right-20 w-2 h-2 bg-[#ff7c00] rounded-full animate-pulse" title="Não visualizado" />
                      )}
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                              aviso.target === "Todos" ? "bg-blue-50 text-blue-500" :
                              aviso.target === "Alunos" ? "bg-pro-teal/10 text-pro-teal" :
                              "bg-purple-50 text-purple-500"
                            }`}>
                              {aviso.target}
                            </span>
                            {aviso.scheduledFor && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} />
                                Agendado
                              </span>
                            )}
                            {aviso.targetSpecificUsers && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                <Users size={10} />
                                {aviso.targetUserIds?.length || 0} Específicos
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-slate-800 uppercase leading-tight truncate">{aviso.title}</h3>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium line-clamp-1">{aviso.content}</p>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                          <button 
                            onClick={() => handleEditClick(aviso)}
                            className="flex-1 md:flex-none p-2.5 bg-amber-50 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all active:scale-90 flex items-center justify-center gap-2"
                            title="Editar Aviso"
                          >
                            <Edit2 size={16} />
                            <span className="md:hidden text-[9px] font-black uppercase">Editar</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteAnnouncement(aviso.id)}
                            className="flex-1 md:flex-none p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90 flex items-center justify-center gap-2"
                            title="Excluir Aviso"
                          >
                            <Trash2 size={16} />
                            <span className="md:hidden text-[9px] font-black uppercase">Excluir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
};
