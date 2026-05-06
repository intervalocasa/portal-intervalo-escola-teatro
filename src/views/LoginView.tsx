/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { LogIn, UserPlus, Lock, AlertCircle, AlertTriangle } from "lucide-react";
import { FormEvent } from "react";
import { Logo } from "../components/CommonComponents";

interface LoginViewProps {
  login: string;
  setLogin: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  error: string;
  gestorError: string | null;
  loading: boolean;
  handleLogin: (e: FormEvent) => void;
  handleGoogleLogin: () => void;
  setView: (view: any) => void;
}

export const LoginView = ({
  login, setLogin,
  password, setPassword,
  error, gestorError, loading,
  handleLogin, handleGoogleLogin,
  setView
}: LoginViewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-[480px] bg-white rounded-[40px] shadow-theater overflow-hidden border-4 border-white flex flex-col"
    >
      <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full bg-pro-orange blur-3xl"></div>
        </div>
        <Logo className="h-28 w-auto mb-6 mx-auto relative z-10" />
        <h1 className="text-white text-3xl font-black tracking-tight leading-none">Intervalo</h1>
        <p className="text-teal-50/70 text-xs mt-2 uppercase tracking-[0.4em] font-black leading-none">Portal do Aluno e Professor</p>
      </div>

      <div className="p-12 space-y-8 flex-1">
        {gestorError && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-start gap-3"
          >
            <AlertTriangle className="text-orange-500 shrink-0" size={18} />
            <p className="text-[11px] font-bold text-orange-700 leading-tight">
              {gestorError}
            </p>
          </motion.div>
        )}

        <div className="space-y-4">
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-md active:scale-95 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Entrar como Gestor
          </button>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 h-[1px] bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ou Aluno/Professor</span>
            <div className="flex-1 h-[1px] bg-slate-100"></div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <input
                type="email"
                placeholder="seu@email.com"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-teal focus:outline-none font-bold text-sm transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                <LogIn size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-pro-teal focus:outline-none font-bold text-sm transition-all"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Lock size={18} />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 font-bold ml-1">* Primeiro acesso? Use seu CPF (só números) como senha.</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"
            >
              <AlertCircle size={16} />
              <p className="text-[10px] font-black uppercase leading-tight">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-pro-teal text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#014e63] transition-all shadow-xl shadow-teal-900/10 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-50">
          <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Novo por aqui?</p>
          <button 
            onClick={() => setView("register")}
            className="w-full py-4 bg-slate-50 text-slate-500 rounded-2x border border-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <UserPlus size={16} />
            Solicitar Acesso
          </button>
        </div>
      </div>
    </motion.div>
  );
};
