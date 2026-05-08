/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { 
  Pencil, 
  Drama, 
  LogOut, 
  UserCircle,
  Calendar
} from "lucide-react";
import { THEME } from "../theme";
import { Logo, Avatar } from "../components/CommonComponents";
import { AnnouncementPanel } from "../components/AnnouncementPanel";

interface StudentDashboardProps {
  currentUser: any;
  users: any[];
  handleLogout: () => void;
  setView: (view: any) => void;
  setFormData: (data: any) => void;
  setPhotoPreview: (photo: string | null) => void;
  setSelectedUserClasses: (classes: string[]) => void;
  setAssessmentForm: (form: any) => void;
  classes: any[];
  filteredAnnouncements: any[];
}

export const StudentDashboard = ({
  currentUser,
  users,
  handleLogout,
  setView,
  setFormData,
  setPhotoPreview,
  setSelectedUserClasses,
  setAssessmentForm,
  classes,
  filteredAnnouncements
}: StudentDashboardProps) => {
  const user = users.find(u => u.id === currentUser?.uid);
  
  return (
    <motion.div
      key="dashboard-student"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
    >
      <div className={`bg-gradient-to-br from-[#016a86] to-[#004e63] p-8 text-center relative overflow-hidden flex flex-col items-center justify-center gap-2 md:w-[350px] md:p-12 shrink-0 md:min-h-screen`}>
        <Logo className="h-16 md:h-32 w-auto mb-4" />
        <h1 className="text-white text-xl md:text-3xl font-bold tracking-tight">Portal do Aluno</h1>
        <p className="text-teal-50/70 text-[10px] md:text-sm mt-1 uppercase tracking-[0.2em] font-black leading-none">Sua Jornada Artística</p>
        
        <div className="mt-auto flex flex-col items-center gap-4 pt-10">
           <div className="w-16 h-16 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 mb-2 shadow-xl flex items-center justify-center">
              <Avatar src={user?.photo} fallbackSize={40} />
           </div>
           <span className="text-white font-bold text-sm tracking-tight">{user?.name || "Aluno"}</span>
        </div>
      </div>

      <div className="p-8 md:p-16 flex-1 md:overflow-y-auto bg-slate-50/30 flex flex-col">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          <div className="mb-0 hidden md:block border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Bem-vindo(a)</h2>
            <p className="text-slate-400 font-bold mt-2">O que deseja realizar hoje?</p>
          </div>

          <AnnouncementPanel announcements={filteredAnnouncements} />
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Atualizar Cadastro */}
            <motion.button
              onClick={() => {
                if (user) {
                  setFormData({
                    name: user.name || "",
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
                  const userClasses = classes.filter(c => c.studentIds?.includes(user.id)).map(c => c.id);
                  setSelectedUserClasses(userClasses);
                }
                setView("edit_self");
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full p-6 bg-pro-yellow rounded-2xl flex items-center gap-5 text-pro-teal shadow-lg shadow-yellow-900/10 transition-all text-left border-2 border-white/50"
            >
              <div className="bg-pro-teal p-3 rounded-xl text-white shadow-lg">
                <Pencil size={24} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none uppercase tracking-tight">Atualizar Cadastro</div>
                <div className="text-xs opacity-70 mt-1 font-bold">Mantenha seus dados e fotos em dia</div>
              </div>
            </motion.button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fazer Autoavaliação */}
              <motion.button
                onClick={() => {
                  setAssessmentForm({ classId: "", notes: {}, openAnswers: {} });
                  setView("self_assessment");
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full p-6 bg-pro-teal rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-teal-900/10 transition-all text-left border-2 border-white/50"
              >
                <div className="bg-white/20 p-3 rounded-xl shadow-lg">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none uppercase tracking-tight">Fazer Autoavaliação</div>
                  <div className="text-xs opacity-70 mt-1 font-bold">Avalie seu desempenho e metas</div>
                </div>
              </motion.button>

              {/* Consultar Evolução */}
              <motion.button
                onClick={() => setView("evolution")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full p-6 bg-pro-orange rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-orange-900/10 transition-all text-left border-2 border-white/50"
              >
                <div className="bg-white/20 p-3 rounded-xl shadow-lg">
                  <Drama size={24} />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none uppercase tracking-tight">Minha jornada</div>
                  <div className="text-xs opacity-70 mt-1 font-bold">veja sua jornada</div>
                </div>
              </motion.button>

              {/* Sair do Sistema (Aluno) */}
              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-6 bg-white rounded-2xl flex items-center gap-5 text-red-600 shadow-lg shadow-red-900/5 transition-all text-left group border border-slate-100 md:col-span-2"
              >
                <div className="bg-red-500 p-3 rounded-xl text-white group-hover:scale-110 transition-transform shadow-lg shadow-red-500/20">
                  <LogOut size={24} />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none uppercase tracking-tight">Sair do Portal</div>
                  <div className="text-xs text-slate-400 mt-1 font-bold">Encerrar área segura do aluno</div>
                </div>
              </motion.button>
            </div>
          </div>

          <div className="mt-auto pt-10">
            <div className="max-w-3xl mx-auto w-full pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1 uppercase tracking-widest font-black">
                <span className="w-2 h-2 rounded-full bg-pro-teal"></span> 
                ÁREA SEGURA
              </span>
              <motion.button 
                onClick={handleLogout} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-6 py-3 bg-red-400/10 hover:bg-red-500 text-red-600 hover:text-white rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-red-500/20`}
              >
                <LogOut size={16} />
                SAIR DO PORTAL
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
