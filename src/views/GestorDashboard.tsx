/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { 
  Plus, 
  Users, 
  Presentation, 
  UserCircle, 
  BookOpen, 
  LogOut, 
  Trash2,
  Calendar,
  Star,
  Award,
  Database,
  Wallet,
  GraduationCap,
  Sparkles,
  Layers,
  UserCheck,
  Clapperboard,
  FolderArchive
} from "lucide-react";
import { Logo, Avatar } from "../components/CommonComponents";
import { AnnouncementPanel } from "../components/AnnouncementPanel";
import { THEME } from "../theme";

interface GestorDashboardProps {
  currentUser: any;
  users: any[];
  handleLogout: () => void;
  setView: (view: any) => void;
  handleResetUserForm: () => void;
  handleResetClassForm?: () => void;
  filteredAnnouncements: any[];
  onAwardBadge?: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
  onHealDatabase?: () => Promise<void>;
}

export const GestorDashboard = ({
  currentUser,
  users,
  handleLogout,
  setView,
  handleResetUserForm,
  handleResetClassForm,
  filteredAnnouncements,
  onAwardBadge,
  onHealDatabase
}: GestorDashboardProps) => {
  const [isHealing, setIsHealing] = useState(false);
  const user = users.find(u => u.id === currentUser?.uid);
  
  return (
    <motion.div
      key="dashboard-gestor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
    >
      <div className={`bg-gradient-to-br from-[#016a86] to-[#004e63] p-8 text-center relative overflow-hidden flex flex-col items-center justify-center gap-2 md:w-[350px] md:p-12 shrink-0 md:min-h-screen`}>
        <Logo className="h-16 md:h-32 w-auto mb-4" />
        <h1 className="text-white text-xl md:text-3xl font-black tracking-tighter">Intervalo Escola de Teatro</h1>
        <p className="text-teal-50/70 text-[10px] md:text-xs mt-1 uppercase tracking-[0.4em] font-black leading-none">Ambiente de Gestão Estratégica</p>
        
        <div className="mt-auto flex flex-col items-center gap-4 pt-10">
           <div className="w-16 h-16 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 mb-2 shadow-xl flex items-center justify-center">
              <Avatar src={users.find(u => u.id === currentUser?.uid)?.photo} fallbackSize={40} />
           </div>
           <span className="text-white font-bold text-sm tracking-tight">{users.find(u => u.id === currentUser?.uid)?.name || "Gestor(a)"}</span>
        </div>
      </div>

      <div className="p-8 md:p-16 flex-1 md:overflow-y-auto bg-slate-50/30 flex flex-col">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          <div className="mb-0 hidden md:block border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Painel de Controle</h2>
            <p className="text-slate-400 font-bold mt-2">Selecione uma área para gerenciar a escola de forma estratégica.</p>
          </div>

          <AnnouncementPanel 
            announcements={filteredAnnouncements} 
            currentUser={user || null} 
            onAwardBadge={onAwardBadge}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Montagens e Apresentações */}
            <motion.button
              onClick={() => setView("stage_productions")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-purple-950/15 transition-all text-left group md:col-span-2 border border-purple-400/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-36 h-36 bg-pro-yellow/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:scale-110 transition-transform" />
              <div className="bg-white/20 p-3.5 rounded-xl group-hover:scale-110 transition-transform text-white shadow-md relative z-10">
                <Clapperboard size={26} />
              </div>
              <div className="relative z-10 flex-1">
                <div className="font-black text-lg leading-none uppercase tracking-tight text-white flex items-center gap-2">
                  Montagens e Apresentações
                  <span className="px-2 py-0.5 bg-pro-yellow text-slate-900 text-[9px] font-black rounded-md">Novo</span>
                </div>
                <div className="text-xs text-purple-100/90 mt-1 font-medium">Submissão, curadoria e ficha de inscrição de espetáculos e mostras</div>
              </div>
            </motion.button>

            {/* Cursos (Tipos de Turma) */}
            <motion.button
              onClick={() => setView("courses")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-teal-900/10 transition-all text-left group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <GraduationCap size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Cursos</div>
                <div className="text-xs text-teal-100/80 mt-1">Tipos de turma, valores e ementas</div>
              </div>
            </motion.button>

            {/* Aula Experimental */}
            <motion.button
              onClick={() => setView("experimental_classes")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-amber-900/10 transition-all text-left group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Aula Experimental</div>
                <div className="text-xs text-amber-100/80 mt-1">Agendamentos e comprovantes</div>
              </div>
            </motion.button>

            {/* Gestão Financeira */}
            <motion.button
              onClick={() => setView("financial_management")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-gradient-to-r from-[#016a86] to-[#004e63] rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-teal-900/10 transition-all text-left group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Wallet size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Financeiro</div>
                <div className="text-xs text-teal-100/80 mt-1">Gestão de matrículas e pagamentos</div>
              </div>
            </motion.button>

            {/* Gerenciar Turmas */}
            <motion.button
              onClick={() => setView("classes_list")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-pro-orange rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-orange-900/10 transition-all text-left group`}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Presentation size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Turmas</div>
                <div className="text-xs opacity-70 mt-1">Lista, alunos e horários</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => {
                if (handleResetClassForm) handleResetClassForm();
                setView("create_class");
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-white rounded-2xl flex items-center gap-5 text-pro-teal shadow-lg shadow-teal-900/5 transition-all text-left border-2 border-pro-teal/5 group`}
            >
              <div className="bg-pro-teal p-3 rounded-xl text-white group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Nova Turma</div>
                <div className="text-xs text-pro-teal/50 mt-1">Cadastrar nova turma</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => {
                handleResetUserForm();
                setView("register");
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-pro-yellow rounded-2xl flex items-center gap-5 text-pro-teal shadow-xl shadow-yellow-900/10 transition-all text-left group`}
            >
              <div className="bg-pro-teal p-3 rounded-xl text-white group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Novo Cadastro</div>
                <div className="text-xs opacity-70 mt-1">Adicionar aluno, professor ou gestor</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setView("create_announcement")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-pro-teal rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-teal-900/10 transition-all text-left group`}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Painel de Avisos</div>
                <div className="text-xs opacity-70 mt-1">Gerenciar comunicações</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setView("users_list")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-pro-teal rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-teal-900/10 transition-all text-left group`}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <UserCircle size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Visualizar Usuários</div>
                <div className="text-xs opacity-70 mt-1">Lista completa e detalhada</div>
              </div>
            </motion.button>

            {/* Diário de Aula (Chamadas e Presença) */}
            <motion.button
              onClick={() => setView("class_diary")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-gradient-to-r from-[#016a86] to-[#014e63] rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-teal-900/15 transition-all text-left border-2 border-pro-yellow/30 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-pro-yellow/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:scale-110 transition-transform" />
              <div className="bg-pro-yellow p-3 rounded-xl text-slate-900 shadow-md group-hover:scale-110 transition-transform relative z-10">
                <UserCheck size={24} />
              </div>
              <div className="relative z-10">
                <div className="font-black text-lg leading-none uppercase tracking-tight text-white flex items-center gap-2">
                  Diário de Aula
                  <span className="px-2 py-0.5 bg-pro-yellow text-slate-900 text-[9px] font-black rounded-md">Novo</span>
                </div>
                <div className="text-xs text-teal-100/80 mt-1 font-bold">Lançar presença e relato da aula</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setView("manage_diaries")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-pro-teal rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-teal-900/10 transition-all text-left group`}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Diário de Notas</div>
                <div className="text-xs opacity-70 mt-1">Acompanhamento Pedagógico</div>
              </div>
            </motion.button>

            {/* Planos de Aula */}
            <motion.button
              onClick={() => setView("lesson_plans")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-emerald-900/10 transition-all text-left group`}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Layers size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Planos de Aula</div>
                <div className="text-xs text-emerald-100/80 mt-1">Planejamento e Habilidades</div>
              </div>
            </motion.button>

            {/* Documentos Formativos */}
            <motion.button
              onClick={() => setView("formative_documents")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-gradient-to-r from-teal-700 to-cyan-800 rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-teal-950/15 transition-all text-left group border border-teal-400/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:scale-110 transition-transform" />
              <div className="bg-white/20 p-3.5 rounded-xl group-hover:scale-110 transition-transform text-white shadow-md relative z-10">
                <FolderArchive size={24} />
              </div>
              <div className="relative z-10">
                <div className="font-black text-lg leading-none uppercase tracking-tight text-white flex items-center gap-2">
                  Documentos Formativos
                  <span className="px-2 py-0.5 bg-cyan-300 text-slate-900 text-[9px] font-black rounded-md">PDFs</span>
                </div>
                <div className="text-xs text-cyan-100/90 mt-1 font-bold">Acervo de materiais pedagógicos e diretrizes</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setView("school_agenda")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-slate-800 rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-slate-900/10 transition-all text-left group`}
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Agenda da Escola</div>
                <div className="text-xs opacity-70 mt-1">Ensaios, Peças e Workshops</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setView("lesson_ratings")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-white border-2 border-amber-100 rounded-2xl flex items-center gap-5 text-amber-600 shadow-xl shadow-amber-900/5 transition-all text-left group`}
            >
              <div className="bg-amber-100 p-3 rounded-xl group-hover:scale-110 transition-transform text-amber-600">
                <Star size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Avaliações de Aulas</div>
                <div className="text-xs opacity-70 mt-1">Ver feedbacks dos alunos</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setView("badges_manager")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full p-6 bg-white border-2 border-pro-teal/10 rounded-2xl flex items-center gap-5 text-pro-teal shadow-xl shadow-teal-900/5 transition-all text-left group`}
            >
              <div className="bg-pro-teal p-3 rounded-xl group-hover:scale-110 transition-transform text-white">
                <Award size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Gerenciador de Selos</div>
                <div className="text-xs opacity-70 mt-1">Conquistas dos alunos</div>
              </div>
            </motion.button>

            {onHealDatabase && (
              <motion.button
                onClick={async () => {
                  if (window.confirm("Deseja fazer a limpeza de usuários duplicados e sincronização na base de dados do Firebase agora?")) {
                    try {
                      setIsHealing(true);
                      await onHealDatabase();
                      alert("Limpeza e sincronização da base de dados concluídas com sucesso!");
                    } catch (err) {
                      alert("Erro ao executar a limpeza da base de dados.");
                    } finally {
                      setIsHealing(false);
                    }
                  }
                }}
                disabled={isHealing}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-6 bg-white border-2 border-slate-100 rounded-2xl flex items-center gap-5 text-slate-700 shadow-xl shadow-slate-900/5 transition-all text-left group"
              >
                <div className="bg-slate-800 p-3 rounded-xl text-white group-hover:scale-110 transition-transform">
                  <Database size={24} className={isHealing ? "animate-spin" : ""} />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none">Limpar Duplicados & Banco</div>
                  <div className="text-xs text-slate-400 mt-1 font-bold">Garante a consistência de dados e exclui duplicados</div>
                </div>
              </motion.button>
            )}

            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-white rounded-2xl flex items-center gap-5 text-red-600 shadow-lg shadow-red-900/5 transition-all text-left group border border-slate-100"
            >
              <div className="bg-red-500 p-3 rounded-xl text-white group-hover:scale-110 transition-transform shadow-lg shadow-red-500/20">
                <LogOut size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Sair do Sistema</div>
                <div className="text-xs text-slate-400 mt-1 font-bold">Encerrar sessão de segurança</div>
              </div>
            </motion.button>
          </div>

          <div className="mt-auto pt-10">
            <div className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1 uppercase tracking-widest font-black">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> 
                SISTEMA ONLINE
              </span>
              <div className="flex items-center gap-4">
                <motion.button 
                  onClick={handleLogout} 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-6 py-3 bg-red-400/10 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-red-500/20"
                >
                  <LogOut size={16} />
                  SAIR DO SISTEMA
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
