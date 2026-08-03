/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  GraduationCap,
  Presentation, 
  Plus, 
  UserCircle, 
  Calendar, 
  LogOut,
  Sparkles
} from "lucide-react";
import { Logo, Avatar } from "../components/CommonComponents";
import { AnnouncementPanel } from "../components/AnnouncementPanel";

interface AuxiliarDashboardProps {
  currentUser: any;
  users: any[];
  handleLogout: () => void;
  setView: (view: any) => void;
  handleResetUserForm: () => void;
  filteredAnnouncements: any[];
  onAwardBadge?: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
}

export const AuxiliarDashboard = ({
  currentUser,
  users,
  handleLogout,
  setView,
  handleResetUserForm,
  filteredAnnouncements,
  onAwardBadge
}: AuxiliarDashboardProps) => {
  const user = users.find(u => u.id === currentUser?.uid);

  return (
    <motion.div
      key="dashboard-auxiliar"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
    >
      {/* Sidebar Header */}
      <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-8 text-center relative overflow-hidden flex flex-col items-center justify-center gap-2 md:w-[350px] md:p-12 shrink-0 md:min-h-screen">
        <Logo className="h-16 md:h-32 w-auto mb-4" />
        <h1 className="text-white text-xl md:text-3xl font-black tracking-tighter">Intervalo Escola de Teatro</h1>
        <p className="text-teal-50/70 text-[10px] md:text-xs mt-1 uppercase tracking-[0.4em] font-black leading-none">Ambiente Administrativo</p>
        
        <div className="mt-auto flex flex-col items-center gap-4 pt-10">
           <div className="w-16 h-16 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 mb-2 shadow-xl flex items-center justify-center">
              <Avatar src={user?.photo} fallbackSize={40} />
           </div>
           <span className="text-white font-bold text-sm tracking-tight">{user?.name || "Auxiliar Administrativo"}</span>
           <span className="px-3 py-1 bg-white/10 text-teal-100 text-[10px] font-black uppercase tracking-widest rounded-full border border-white/20">Auxiliar Administrativo</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-8 md:p-16 flex-1 md:overflow-y-auto bg-slate-50/30 flex flex-col">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          <div className="mb-0 hidden md:block border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Painel de Controle</h2>
            <p className="text-slate-400 font-bold mt-2">Acesso rápido às rotinas de cursos, turmas, cadastros e agenda.</p>
          </div>

          <AnnouncementPanel 
            announcements={filteredAnnouncements} 
            currentUser={user || null} 
            onAwardBadge={onAwardBadge}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Cursos */}
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

            {/* 2. Turmas */}
            <motion.button
              onClick={() => setView("classes_list")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-pro-orange rounded-2xl flex items-center gap-5 text-white shadow-xl shadow-orange-900/10 transition-all text-left group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Presentation size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Turmas</div>
                <div className="text-xs opacity-70 mt-1">Lista de turmas e matrículas</div>
              </div>
            </motion.button>

            {/* 3. Novo Cadastro */}
            <motion.button
              onClick={() => {
                handleResetUserForm();
                setView("register");
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-pro-yellow rounded-2xl flex items-center gap-5 text-pro-teal shadow-xl shadow-yellow-900/10 transition-all text-left group"
            >
              <div className="bg-pro-teal p-3 rounded-xl text-white group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Novo Cadastro</div>
                <div className="text-xs opacity-70 mt-1">Cadastrar novo aluno ou perfil</div>
              </div>
            </motion.button>

            {/* 4. Visualizar Usuários */}
            <motion.button
              onClick={() => setView("users_list")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-pro-teal rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-teal-900/10 transition-all text-left group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <UserCircle size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Visualizar Usuários</div>
                <div className="text-xs opacity-70 mt-1">Lista completa da base de dados</div>
              </div>
            </motion.button>

            {/* 5. Painel de Avisos */}
            <motion.button
              onClick={() => setView("create_announcement")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-pro-teal rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-teal-900/10 transition-all text-left group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Painel de Avisos</div>
                <div className="text-xs opacity-70 mt-1">Comunicação e avisos da escola</div>
              </div>
            </motion.button>

            {/* 6. Agenda da Escola */}
            <motion.button
              onClick={() => setView("school_agenda")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-slate-800 rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-slate-900/10 transition-all text-left group"
            >
              <div className="bg-white/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none">Agenda da Escola</div>
                <div className="text-xs opacity-70 mt-1">Ensaios, apresentações e eventos</div>
              </div>
            </motion.button>

            {/* 7. Sair do Sistema */}
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-white rounded-2xl flex items-center gap-5 text-red-600 shadow-lg shadow-red-900/5 transition-all text-left group border border-slate-100 col-span-1 md:col-span-2"
            >
              <div className="bg-red-500 p-3 rounded-xl text-white group-hover:scale-110 transition-transform shadow-lg shadow-red-500/20">
                <LogOut size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Sair do Sistema</div>
                <div className="text-xs text-slate-400 mt-1 font-bold">Encerrar sessão com segurança</div>
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
