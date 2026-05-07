/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { UserCircle, Camera, CheckCircle2, ArrowLeft } from "lucide-react";
import { User, UserRole } from "../types";
import { Logo, Avatar, BackButton } from "../components/CommonComponents";

interface RegisterEditUserViewProps {
  view: "register" | "edit_self" | "edit_user";
  formData: any;
  setFormData: (data: any) => void;
  photoPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  classes: any[];
  selectedUserClasses: string[];
  setSelectedUserClasses: (classes: string[]) => void;
  handleRegisterSubmit: (e: React.FormEvent) => void;
  setView: (view: string) => void;
  isGestor: boolean;
  regType: UserRole;
  setRegType: (role: UserRole) => void;
  role: UserRole | null;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  users: User[];
  currentUser: any;
  selectedUserId: string | null;
  setShowPasswordModal?: (show: boolean) => void;
}

export const RegisterEditUserView = ({
  view,
  formData,
  setFormData,
  photoPreview,
  fileInputRef,
  handlePhotoChange,
  classes,
  selectedUserClasses,
  setSelectedUserClasses,
  handleRegisterSubmit,
  setView,
  isGestor,
  regType,
  setRegType,
  role,
  handleInputChange,
  users,
  currentUser,
  selectedUserId,
  setShowPasswordModal
}: RegisterEditUserViewProps) => {
  return (
    <motion.div
      key="register-screen"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      {/* Back Button Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton 
          onClick={() => setView(view === "edit_user" ? "user_details" : "dashboard")} 
          className="!text-white pointer-events-auto" 
        />
      </div>

      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
         <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
         <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">
           {view === "register" ? "Novo Cadastro" : (view === "edit_user" ? "Editar Usuário" : "Atualizar Cadastro")}
         </h1>
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">
           {view === "register" ? "Gestão de Alunos e Colaboradores" : (view === "edit_user" ? "Modificando perfil de usuário" : "Mantenha seus dados sempre em dia")}
         </p>
      </div>

      <form onSubmit={handleRegisterSubmit} className="p-8 md:p-16 space-y-8 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Profile Creation Decor */}
        <div className="flex flex-col items-center gap-6 pb-6 border-b border-slate-50">
           <div className="relative group">
              <div className="w-32 h-32 md:w-44 md:h-44 bg-slate-50 rounded-[40px] border-4 border-white shadow-2xl flex items-center justify-center text-slate-200 overflow-hidden relative transition-all group-hover:scale-105 group-hover:rotate-2">
                 <Avatar src={photoPreview || ""} fallbackSize={80} className="w-full h-full rounded-none" />
                 <label className="absolute inset-0 bg-pro-teal/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-sm">
                   <div className="flex flex-col items-center gap-2 text-white">
                      <Camera size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Alterar</span>
                   </div>
                   <input 
                     type="file" 
                     accept="image/*" 
                     className="hidden" 
                     ref={fileInputRef}
                     onChange={handlePhotoChange} 
                   />
                 </label>
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-pro-teal border border-slate-50">
                 <Camera size={20} />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div className="space-y-4 col-span-full">
            <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">Identidade no Portal</h4>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: João da Silva"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Artístico</label>
            <input
              type="text"
              name="artisticName"
              value={formData.artisticName}
              onChange={handleInputChange}
              placeholder="Ex: Jota Silva"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF (Apenas Números)</label>
            <input
              type="text"
              name="cpf"
              required
              disabled={view !== "register" && role !== "Gestor"}
              value={formData.cpf}
              onChange={handleInputChange}
              placeholder="000.000.000-00"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Usuário</label>
            <div className="flex gap-2">
              {["Aluno", "Professor", "Gestor"].map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={(view === "edit_self" || view === "edit_user") && role !== "Gestor"}
                  onClick={() => setRegType(t as UserRole)}
                  className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    regType === t 
                    ? "bg-pro-teal text-white shadow-lg shadow-teal-900/20" 
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  } disabled:opacity-50`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Social and Contact Info */}
          <div className="space-y-4 col-span-full pt-4">
            <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">Contato & Localização</h4>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              placeholder="seu@email.com"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
            />
          </div>

          <div className="space-y-1 col-span-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
            <input
              type="text"
              name="address"
              value={formData.address || ""}
              onChange={handleInputChange}
              placeholder="Rua, Número, Bairro, Cidade - Estado"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
            />
          </div>

          {/* Financial Info */}
          {regType === "Professor" && (
            <>
              <div className="space-y-4 col-span-full pt-4">
                <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">Informações Financeiras</h4>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ (Opcional)</label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj || ""}
                  onChange={handleInputChange}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave PIX</label>
                <input
                  type="text"
                  name="pixKey"
                  value={formData.pixKey || ""}
                  onChange={handleInputChange}
                  placeholder="E-mail, CPF, Celular ou Aleatória"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banco</label>
                <input
                  type="text"
                  name="bank"
                  value={formData.bank || ""}
                  onChange={handleInputChange}
                  placeholder="Ex: Banco do Brasil"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Agência</label>
                <input
                  type="text"
                  name="bankAgency"
                  value={formData.bankAgency || ""}
                  onChange={handleInputChange}
                  placeholder="0000-0"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conta Corrente / POUPANÇA</label>
                <input
                  type="text"
                  name="bankAccount"
                  value={formData.bankAccount || ""}
                  onChange={handleInputChange}
                  placeholder="000000-0"
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal focus:bg-white"
                />
              </div>
            </>
          )}

          {view === "edit_self" && setShowPasswordModal && (
            <div className="col-span-full pt-4">
               <button 
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-pro-teal transition-all flex items-center justify-center gap-2"
               >
                 Alterar Senha do Portal
               </button>
            </div>
          )}

          {isGestor && (
            <div className="col-span-full py-6 mt-4 border-t border-slate-100">
               <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] mb-4">Vincular Turmas</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {classes.map(c => {
                    const isSelected = selectedUserClasses.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUserClasses(selectedUserClasses.filter(id => id !== c.id));
                          } else {
                            setSelectedUserClasses([...selectedUserClasses, c.id]);
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all text-left flex justify-between items-center ${
                          isSelected 
                          ? "bg-pro-teal/5 border-pro-teal text-pro-teal shadow-inner" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-pro-teal/30"
                        }`}
                      >
                         <div className="overflow-hidden">
                            <p className="text-[10px] font-black uppercase tracking-tight truncate">{c.code}</p>
                            <p className="text-[8px] font-bold opacity-60 truncate">{c.type}</p>
                         </div>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-pro-teal border-pro-teal text-white' : 'border-slate-200'}`}>
                            {isSelected && <CheckCircle2 size={10} />}
                         </div>
                      </button>
                    );
                  })}
               </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-10 border-t border-slate-50">
          <button
            type="button"
            onClick={() => setView(view === "edit_user" ? "user_details" : "dashboard")}
            className="flex-1 py-5 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
          >
            Voltar
          </button>
          <button
            type="submit"
            className="flex-[2] py-5 bg-pro-teal text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-teal-900/20 hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {view === "register" ? "Confirmar Cadastro" : "Salvar Alterações"}
            <CheckCircle2 size={18} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
