/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { UserCircle, Eye, ArrowLeft } from "lucide-react";
import { User, Class, Evaluation } from "../types";
import { DetailItem, Avatar, BackButton } from "../components/CommonComponents";

interface UserDetailsViewProps {
  selectedUserId: string | null;
  users: User[];
  classes: Class[];
  evaluations: Evaluation[];
  setViewingEvaluation: (evalObj: Evaluation | null) => void;
  setView: (view: string) => void;
  setFormData: any;
  setPhotoPreview: any;
  setSelectedUserClasses: any;
  handleDeleteUser: () => Promise<void>;
  setSelectedClassId: (id: string | null) => void;
  onResetPassword: (email: string) => void;
  onUpdateEnrollmentDate: (classId: string, studentId: string, newDate: string) => Promise<void>;
  isGestor: boolean;
  setSelectedEnrollmentDates: (dates: Record<string, string>) => void;
}

export const UserDetailsView = ({
  selectedUserId,
  users,
  classes,
  evaluations,
  setViewingEvaluation,
  setView,
  setFormData,
  setPhotoPreview,
  setSelectedUserClasses,
  handleDeleteUser,
  setSelectedClassId,
  onResetPassword,
  onUpdateEnrollmentDate,
  isGestor,
  setSelectedEnrollmentDates
}: UserDetailsViewProps) => {
  const user = users.find(u => u.id === selectedUserId);

  if (!user) return null;

  return (
    <motion.div
      key="user-details-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      {/* Back Button Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton onClick={() => setView("users_list")} className="!text-white pointer-events-auto" />
      </div>

      {/* Header Details */}
      <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-4 md:py-20">
         <div className="relative">
           <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-8 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center shadow-2xl">
              <Avatar src={user.photo} alt="Profile" fallbackSize={80} className="w-full h-full rounded-none" />
           </div>
         </div>
         <div>
           <h1 className="text-white text-3xl md:text-5xl font-black">{user.name}</h1>
           <p className="text-pro-yellow text-xs md:text-sm mt-3 uppercase tracking-[0.4em] font-black bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10 inline-block">
             {user.role}
           </p>
         </div>
      </div>

      <div className="p-10 md:p-20 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
        {/* Action Bar */}
        <div className="max-w-7xl mx-auto w-full flex justify-end gap-3 mb-4">
           <button 
             onClick={() => {
               setFormData({
                 id: user.id,
                 name: user.name,
                 artisticName: user.artisticName || "",
                 birthDate: user.birthDate || "",
                 email: user.email,
                 role: user.role,
                 cpf: user.cpf,
                 phone: user.phone || "",
                 address: user.address || "",
                 bank: user.bank || "",
                 bankAgency: user.bankAgency || "",
                 bankAccount: user.bankAccount || "",
                 pixKey: user.pixKey || "",
                 cnpj: user.cnpj || "",
                 password: ""
               });
               setPhotoPreview(user.photo || "");
               const linkedClasses = user.role === "Professor" 
                 ? classes.filter(c => c.teacherId === user.id)
                 : classes.filter(c => c.studentIds?.includes(user.id));
               setSelectedUserClasses(linkedClasses.map(c => c.id));
               
               const dates: Record<string, string> = {};
               if (user.role === "Aluno") {
                 linkedClasses.forEach(cl => {
                   if (cl.enrollmentDates?.[user.id]) {
                     dates[cl.id] = cl.enrollmentDates[user.id];
                   }
                 });
               }
               setSelectedEnrollmentDates(dates);
               
               setView("edit_user");
             }}
             className="p-3 bg-white text-pro-teal rounded-xl border border-slate-200 hover:border-pro-teal transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
           >
             Editar Usuário
           </button>
           <button 
             onClick={() => onResetPassword(user.email)}
             className="p-3 bg-white text-amber-600 rounded-xl border border-slate-200 hover:border-amber-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
           >
             Resetar Senha
           </button>
           <button 
             onClick={handleDeleteUser}
             className="p-3 bg-white text-red-500 rounded-xl border border-slate-200 hover:border-red-500 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
           >
             Excluir
           </button>
        </div>

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {/* Personal Info */}
          <div className="col-span-full mb-2">
            <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">Dados Pessoais</h4>
          </div>
          
          <DetailItem label="Nome Artístico" value={user.artisticName} />
          <DetailItem label="Data de Nascimento" value={user.birthDate ? new Date(user.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : ""} />
          <DetailItem label="CPF (Login)" value={user.cpf} />
          <DetailItem label="E-mail" value={user.email} />
          <DetailItem label="Telefone" value={user.phone} />
          <DetailItem label="Endereço" value={user.address} fullWidth />

          {/* Financial Info */}
          {user.role === "Professor" && (
            <>
              <div className="col-span-full mb-2 mt-4">
                <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">Dados Financeiros</h4>
              </div>

              <DetailItem label="CNPJ" value={user.cnpj} />
              <DetailItem label="Chave PIX" value={user.pixKey} />
              <DetailItem label="Banco" value={user.bank} />
              <DetailItem label="Agência" value={user.bankAgency} />
              <DetailItem label="Conta" value={user.bankAccount} />
            </>
          )}

          {(user.role === "Aluno" || user.role === "Professor") && (
            <div className="col-span-full mt-4">
              <h4 className="text-[10px] font-black text-[#016a86] uppercase tracking-[0.2em] border-l-4 border-[#016a86] pl-3 mb-4">
                {user.role === "Professor" ? "Turmas Ministradas" : "Turmas Matriculadas"}
              </h4>
                {(() => {
                  const linkedClasses = user.role === "Professor" 
                    ? classes.filter(c => c.teacherId === user.id)
                    : classes.filter(c => c.studentIds?.includes(user.id));

                  return linkedClasses.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                      {linkedClasses.map(c => (
                        <div 
                          key={c.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col gap-3 shadow-sm hover:border-pro-teal transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest">{c.code}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">{c.type}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setSelectedClassId(c.id);
                                setView("class_details");
                              }}
                              className="p-2 text-slate-400 hover:text-pro-teal hover:bg-slate-50 rounded-lg transition-all"
                            >
                              <Eye size={16} />
                            </button>
                          </div>

                          {user.role === "Aluno" && (
                            <div className="pt-2 border-t border-slate-50 flex flex-col gap-1">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Data de Matrícula</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-700">
                                  {c.enrollmentDates?.[user.id] 
                                    ? new Date(c.enrollmentDates[user.id] + 'T00:00:00').toLocaleDateString('pt-BR')
                                    : "Não informada"}
                                </span>
                                {isGestor && (
                                  <button
                                    onClick={() => {
                                      const newDate = prompt("Nova data de matrícula (AAAA-MM-DD):", c.enrollmentDates?.[user.id] || "");
                                      if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                                        onUpdateEnrollmentDate(c.id, user.id, newDate);
                                      } else if (newDate) {
                                        alert("Formato inválido. Use AAAA-MM-DD.");
                                      }
                                    }}
                                    className="p-1.5 text-pro-teal hover:bg-pro-teal/5 rounded-md transition-all"
                                    title="Editar Data"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-bold italic">Nenhuma turma vinculada</p>
                  );
                })()}
            </div>
          )}

          {user.role === "Aluno" && (
            <div className="col-span-full mt-4">
              <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3 mb-4">Histórico de Autoavaliações</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {evaluations.filter(e => e.studentId === selectedUserId).length > 0 ? (
                  evaluations
                    .filter(e => e.studentId === selectedUserId)
                    .sort((a, b) => {
                       const dateA = a.createdAt?.seconds || 0;
                       const dateB = b.createdAt?.seconds || 0;
                       return dateB - dateA;
                    })
                    .map(e => (
                      <div key={e.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group shadow-sm transition-all hover:border-pro-teal">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400 group-hover:text-pro-teal transition-colors">
                            <span className="text-[8px] font-bold">{e.year}</span>
                            <span className="text-sm font-black">{String(e.month).padStart(2, '0')}</span>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-black text-slate-700 uppercase truncate">{classes.find(c => c.id === e.classId)?.code || "Turma"}</p>
                            <p className="text-[10px] text-slate-400 font-bold">Média: {(Object.values(e.notes as { [key: string]: number }).reduce((a, b) => a + Number(b), 0) / Object.values(e.notes).length).toFixed(1)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setViewingEvaluation(e);
                            setView("self_assessment");
                          }}
                          className="p-2 text-slate-400 hover:text-pro-teal transition-all bg-slate-50 rounded-lg group-hover:bg-pro-teal group-hover:text-white"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full py-6 text-center bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma autoavaliação enviada</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="max-w-7xl mx-auto w-full pt-10 flex gap-4">
           <button 
            onClick={() => setView("users_list")} 
            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-[10px] font-black"
          >
            Voltar à Lista
          </button>
        </div>
      </div>
    </motion.div>
  );
};
