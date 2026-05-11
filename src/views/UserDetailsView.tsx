/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { UserCircle, Eye, ArrowLeft, Award, Trash2, X } from "lucide-react";
import { User, Class, Evaluation, UserBadge } from "../types";
import { DetailItem, Avatar, BackButton } from "../components/CommonComponents";
import { BadgeAwardModal } from "../components/BadgeAwardModal";
import { BADGES } from "../constants/badges";
import { useState } from "react";

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
  onAwardBadge: (studentId: string, badgeDef: any, customMessage?: string, forceUniqueKey?: string, classId?: string) => Promise<void>;
  onRemoveBadge: (studentId: string, badgeId: string) => Promise<void>;
  selectedUserBadges: UserBadge[];
  currentUserRole?: string;
  isGestor: boolean;
  setSelectedEnrollmentDates: (dates: Record<string, string>) => void;
  setEditEnrollmentInfo: (info: {classId: string, studentId: string, date: string} | null) => void;
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
  onAwardBadge,
  onRemoveBadge,
  selectedUserBadges,
  currentUserRole,
  isGestor,
  setSelectedEnrollmentDates,
  setEditEnrollmentInfo
}: UserDetailsViewProps) => {
  const user = users.find(u => u.id === selectedUserId);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [managingBadgeId, setManagingBadgeId] = useState<string | null>(null);

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
                 ? classes.filter(c => c.teacherIds?.includes(user.id))
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
                    ? classes.filter(c => c.teacherIds?.includes(user.id))
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
                                      setEditEnrollmentInfo({
                                        classId: c.id,
                                        studentId: user.id,
                                        date: c.enrollmentDates?.[user.id] || ""
                                      });
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-l-4 border-amber-500 pl-3">Conquistas e Badges</h4>
                {(isGestor || currentUserRole === "Professor") && (
                  <button 
                    onClick={() => setIsBadgeModalOpen(true)}
                    className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-amber-200"
                  >
                    <Award size={14} /> Atribuir Reconhecimento
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {(() => {
                  const uniqueBadgeIds = ['critico-de-arte', 'embaixador-da-arte'];
                  
                  // Get unique badges based on badgeId to iterate
                  const distinctEarnedBadgeIds = Array.from(new Set(selectedUserBadges.map(ub => ub.badgeId)));
                  
                  if (distinctEarnedBadgeIds.length === 0) {
                    return <p className="text-[10px] font-bold text-slate-400 italic">Nenhum badge conquistado ainda.</p>;
                  }

                  return distinctEarnedBadgeIds.map(badgeId => {
                    const badgeDef = BADGES.find(b => b.badgeId === badgeId);
                    const count = selectedUserBadges.filter(ub => ub.badgeId === badgeId).length;
                    const latest = selectedUserBadges.filter(ub => ub.badgeId === badgeId).sort((a, b) => (b.dateReceived?.seconds || 0) - (a.dateReceived?.seconds || 0))[0];
                    const isUnique = uniqueBadgeIds.includes(badgeId);

                    return (
                      <div 
                        key={badgeId} 
                        title={`${badgeDef?.name || badgeId}: ${badgeDef?.description || ''}\n\nÚltima mensagem: "${latest.message}"`}
                        className="bg-white p-4 rounded-2xl border border-amber-100 flex flex-col items-center text-center gap-2 shadow-sm relative group cursor-help transition-all hover:border-amber-300"
                      >
                        <div className="text-amber-500">
                           {badgeDef?.icon || <Award size={20} />}
                        </div>
                        <span className="text-[8px] font-black text-slate-700 uppercase leading-none">{badgeDef?.name || badgeId}</span>
                        
                        {!isUnique && count > 1 && (
                          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-sm">
                            {count}
                          </div>
                        )}

                        {isGestor && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManagingBadgeId(badgeId);
                            }}
                            className="absolute -top-2 -left-2 bg-white text-red-500 p-1.5 rounded-full border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                            title="Gerenciar Instâncias"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                        {/* Tooltip Message - Visible on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white p-3 rounded-xl text-[9px] font-medium leading-relaxed opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-30 shadow-xl">
                          <p className="font-black text-amber-400 mb-1 uppercase tracking-tight">{badgeDef?.name || badgeId}</p>
                          "{latest.message}"
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          <BadgeAwardModal 
            isOpen={isBadgeModalOpen}
            onClose={() => setIsBadgeModalOpen(false)}
            onAward={(badge, msg) => user && onAwardBadge(user.id, badge, msg)}
            studentName={user.name}
          />

          {/* Manage Badge Instances Modal */}
          {managingBadgeId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                      {BADGES.find(b => b.badgeId === managingBadgeId)?.icon || <Award size={24} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        {BADGES.find(b => b.badgeId === managingBadgeId)?.name || managingBadgeId}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerenciar Conquistas</p>
                    </div>
                  </div>
                  <button onClick={() => setManagingBadgeId(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                  {selectedUserBadges
                    .filter(ub => ub.badgeId === managingBadgeId)
                    .sort((a, b) => (b.dateReceived?.seconds || 0) - (a.dateReceived?.seconds || 0))
                    .map((ub, idx) => (
                      <div key={ub.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-600 leading-tight">"{ub.message}"</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {ub.dateReceived?.seconds 
                              ? new Date(ub.dateReceived.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : "Automático"}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm("Tem certeza que deseja remover esta conquista?")) {
                              await onRemoveBadge(user.id, ub.id);
                              // If no more badges of this type, close modal
                              const remaining = selectedUserBadges.filter(b => b.badgeId === managingBadgeId && b.id !== ub.id);
                              if (remaining.length === 0) setManagingBadgeId(null);
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                </div>
                
                <div className="p-8 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => setManagingBadgeId(null)}
                    className="w-full py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {user.role === "Aluno" && (
            <div className="col-span-full mt-4">
              <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3 mb-4">Histórico de Autoanálises</h4>
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma autoanálise enviada</p>
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
