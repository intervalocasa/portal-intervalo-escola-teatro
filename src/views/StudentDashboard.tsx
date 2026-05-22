/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { 
  Pencil, 
  Drama, 
  LogOut, 
  UserCircle,
  Calendar,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { THEME } from "../theme";
import { Logo, Avatar } from "../components/CommonComponents";
import { AnnouncementPanel } from "../components/AnnouncementPanel";
import { MyConquests } from "../components/MyConquests";
import { FeedbackForm } from "../components/FeedbackForm";
import { UserBadge } from "../types";

interface StudentDashboardProps {
  currentUser: any;
  users: any[];
  handleLogout: () => void;
  setView: (view: any) => void;
  setFormData: (data: any) => void;
  setPhotoPreview: (photo: string | null) => void;
  setSelectedUserClasses: (classes: string[]) => void;
  setAssessmentForm: (form: any) => void;
  setSelectedClassId: (id: string | null) => void;
  classes: any[];
  filteredAnnouncements: any[];
  userBadges: UserBadge[];
  onAwardBadge?: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
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
  setSelectedClassId,
  classes,
  filteredAnnouncements,
  userBadges,
  onAwardBadge
}: StudentDashboardProps) => {
  const user = users.find(u => u.id === currentUser?.uid);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Filter classes only for this student
  const studentClasses = classes.filter(c => c.studentIds?.includes(user?.id));
  
  return (
    <motion.div
      key="dashboard-student"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-full bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
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

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
                <Calendar size={16} fill="currentColor" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mural Geral</h3>
            </div>
            <AnnouncementPanel 
              announcements={filteredAnnouncements} 
              currentUser={user} 
              studentClasses={studentClasses} 
              onAwardBadge={onAwardBadge}
            />
          </div>

          <div className="space-y-6">
             <MyConquests userBadges={userBadges} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-pro-teal/10 p-1.5 rounded-lg text-pro-teal">
                <Drama size={16} fill="currentColor" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Minhas Turmas</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.filter(c => c.studentIds?.includes(user?.id)).length > 0 ? (
                classes.filter(c => c.studentIds?.includes(user?.id)).map(c => (
                  <motion.button
                    key={c.id}
                    onClick={() => {
                      setSelectedClassId(c.id);
                      setView("class_details");
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-pro-teal transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pro-teal/5 rounded-2xl flex items-center justify-center text-pro-teal group-hover:bg-pro-teal group-hover:text-white transition-all">
                        <Drama size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight">{c.code}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.type} • {c.year}</p>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-pro-teal group-hover:text-white transition-all">
                      <Pencil size={16} />
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="col-span-full py-12 text-center bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhuma turma encontrada</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Acesso Rápido</h3>
            
            {/* Feedback Button - Featured */}
            <motion.button
              onClick={() => setIsFeedbackOpen(true)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full p-6 md:p-8 bg-gradient-to-br from-[#016a86] to-slate-800 rounded-[28px] md:rounded-[32px] flex items-center justify-between text-white shadow-xl shadow-teal-900/10 transition-all border-b-8 border-black/20 text-left relative overflow-hidden group mb-4"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-all" />
              <div className="flex items-center gap-4 md:gap-6 relative z-10">
                <div className="bg-white/10 p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-lg ring-1 ring-white/20 backdrop-blur-sm shrink-0">
                  <Sparkles size={24} className="md:w-8 md:h-8 text-[#ffbc00] animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="font-black text-lg md:text-2xl uppercase tracking-tighter leading-none break-words">Como foi sua aula?</div>
                  <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-60 mt-1 md:mt-2">Dê sua percepção agora</div>
                </div>
              </div>
              <ChevronRight size={32} className="opacity-30 group-hover:translate-x-2 transition-transform hidden lg:block" />
            </motion.button>

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
              {/* Eventos da Escola */}
              <motion.button
                onClick={() => setView("school_agenda")}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full p-6 bg-slate-800 rounded-2xl flex items-center gap-5 text-white shadow-lg shadow-slate-900/10 transition-all text-left border-2 border-white/50"
              >
                <div className="bg-white/20 p-3 rounded-xl shadow-lg">
                  <Calendar size={24} />
                </div>
                <div>
                  <div className="font-bold text-lg leading-none uppercase tracking-tight">Eventos da Escola</div>
                  <div className="text-xs opacity-70 mt-1 font-bold">Agenda de ensaios e peças</div>
                </div>
              </motion.button>

              {/* Fazer Autoanálise */}
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
                  <div className="font-bold text-lg leading-none uppercase tracking-tight">Fazer Autoanálise</div>
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

      <FeedbackForm 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        currentUser={user}
        studentClasses={studentClasses}
        onSuccess={() => {
          // Success handled in form
        }}
      />
    </motion.div>
  );
};
