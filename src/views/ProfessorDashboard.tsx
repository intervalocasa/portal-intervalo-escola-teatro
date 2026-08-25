/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  Pencil, 
  BookOpen, 
  LogOut, 
  UserCircle,
  Calendar,
  Award,
  Layers,
  UserCheck,
  Clapperboard
} from "lucide-react";
import { THEME } from "../theme";
import { Logo, Avatar } from "../components/CommonComponents";
import { AnnouncementPanel } from "../components/AnnouncementPanel";

interface ProfessorDashboardProps {
  currentUser: any;
  users: any[];
  handleLogout: () => void;
  setView: (view: any) => void;
  setFormData: (data: any) => void;
  setPhotoPreview: (photo: string | null) => void;
  setSelectedUserClasses: (classes: string[]) => void;
  classes: any[];
  filteredAnnouncements: any[];
  onAwardBadge?: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
}

export const ProfessorDashboard = ({
  currentUser,
  users,
  handleLogout,
  setView,
  setFormData,
  setPhotoPreview,
  setSelectedUserClasses,
  classes,
  filteredAnnouncements,
  onAwardBadge
}: ProfessorDashboardProps) => {
  const user = users.find(u => u.id === currentUser?.uid) || users.find(u => u.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  
  return (
    <motion.div
      key="dashboard-professor"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
    >
      <div className={`bg-gradient-to-br from-[#016a86] to-[#004e63] p-8 text-center relative overflow-hidden flex flex-col items-center justify-center gap-2 md:w-[350px] md:p-12 shrink-0 md:min-h-screen`}>
        <Logo className="h-16 md:h-32 w-auto mb-4" />
        <h1 className="text-white text-xl md:text-3xl font-bold tracking-tight">Portal do Professor</h1>
        <p className="text-teal-50/70 text-[10px] md:text-sm mt-1 uppercase tracking-[0.2em] font-black leading-none">Gestão de Ensino e Turmas</p>
        
        <div className="mt-auto flex flex-col items-center gap-4 pt-10">
           <div className="w-16 h-16 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 mb-2 shadow-xl flex items-center justify-center">
              <Avatar src={user?.photo} fallbackSize={40} />
           </div>
           <span className="text-white font-bold text-sm tracking-tight">{user?.artisticName || user?.name || "Professor"}</span>
        </div>
      </div>

      <div className="p-8 md:p-16 flex-1 md:overflow-y-auto bg-slate-50/30 flex flex-col">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          <div className="mb-0 hidden md:block border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Bem-vindo(a), {user?.artisticName || "Prof."}</h2>
            <p className="text-slate-400 font-bold mt-2">Pronto para inspirar seus alunos hoje?</p>
          </div>

          <AnnouncementPanel 
            announcements={filteredAnnouncements} 
            currentUser={user} 
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
                <div className="text-xs text-purple-100/90 mt-1 font-medium">Submeter propostas de peças, espetáculos e mostras artísticas</div>
              </div>
            </motion.button>

            {/* Minhas Turmas */}
            <motion.button
              onClick={() => setView("classes_list")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-white rounded-2xl flex items-center gap-5 text-slate-800 shadow-lg shadow-slate-900/5 transition-all text-left border border-slate-100"
            >
              <div className="bg-pro-teal p-3 rounded-xl text-white">
                <Calendar size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Minhas Turmas</div>
                <div className="text-xs text-slate-400 mt-1 font-bold">Acessar Mural e Elenco</div>
              </div>
            </motion.button>

            {/* Diário do Professor */}
            <motion.button
              onClick={() => {
                if (user) {
                  setFormData({
                    name: user.name || "",
                    socialName: user.socialName || "",
                    pronouns: user.pronouns || "",
                    artisticName: user.artisticName || "",
                    birthDate: user.birthDate || "",
                    email: user.email || "",
                    phone: user.phone || "",
                    address: user.address || "",
                    cpf: user.cpf || "",
                    bank: user.bank || "",
                    bankAgency: user.bankAgency || "",
                    bankAccount: user.bankAccount || "",
                    pixKey: user.pixKey || "",
                    cnpj: user.cnpj || ""
                  });
                  setPhotoPreview(user.photo || null);
                  const userClasses = classes.filter(c => c.teacherIds?.includes(user.id)).map(c => c.id);
                  setSelectedUserClasses(userClasses);
                }
                setView("edit_self");
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-pro-yellow rounded-2xl flex items-center gap-5 text-pro-teal shadow-lg shadow-yellow-900/10 transition-all text-left"
            >
              <div className="bg-pro-teal p-3 rounded-xl text-white">
                <Pencil size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Meu Cadastro</div>
                <div className="text-xs opacity-70 mt-1 font-bold">Editar meus dados pessoais</div>
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

            {/* Diário de Notas */}
            <motion.button
              onClick={() => setView("professor_diary")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-pro-teal rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-teal-900/10 transition-all text-left"
            >
              <div className="bg-white/20 p-3 rounded-xl">
                <BookOpen size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Diário de Notas</div>
                <div className="text-xs opacity-70 mt-1 font-bold">Avaliações e critérios pedagógicos</div>
              </div>
            </motion.button>

            {/* Agenda da Escola */}
            <motion.button
              onClick={() => setView("school_agenda")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-slate-800 rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-slate-900/10 transition-all text-left"
            >
              <div className="bg-white/20 p-3 rounded-xl">
                <Calendar size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Agenda da Escola</div>
                <div className="text-xs opacity-70 mt-1 font-bold">Eventos e Ensaios</div>
              </div>
            </motion.button>

            {/* Gerenciador de Selos */}
            <motion.button
              onClick={() => setView("badges_manager")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-6 bg-white border-2 border-pro-teal/10 rounded-2xl flex items-center gap-5 text-pro-teal shadow-xl shadow-teal-900/5 transition-all text-left group"
            >
              <div className="bg-pro-teal p-3 rounded-xl text-white group-hover:scale-110 transition-transform">
                <Award size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Gerenciador de Selos</div>
                <div className="text-xs text-slate-400 mt-1 font-bold">Conquistas dos alunos</div>
              </div>
            </motion.button>

            {/* Sair do Sistema (Professor) */}
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
                <div className="text-xs text-slate-400 mt-1 font-bold">Encerrar portal do professor</div>
              </div>
            </motion.button>
          </div>

          <div className="mt-auto pt-10">
            <div className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1 uppercase tracking-widest font-black">
                <span className="w-2 h-2 rounded-full bg-pro-teal"></span> 
                SISTEMA PROFESSOR
              </span>
              <motion.button 
                onClick={handleLogout} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-6 py-3 bg-red-400/10 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-red-500/20`}
              >
                <LogOut size={16} />
                SAIR DO SISTEMA
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
