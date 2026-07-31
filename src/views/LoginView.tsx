/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { LogIn, Lock, AlertCircle, AlertTriangle, Smartphone } from "lucide-react";
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
  handleForgotPassword: () => void;
  setView: (view: any) => void;
  onShowInstall: () => void;
}

export const LoginView = ({
  login, setLogin,
  password, setPassword,
  error, gestorError, loading,
  handleLogin,
  handleGoogleLogin,
  handleForgotPassword,
  setView,
  onShowInstall
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
            <div className="flex justify-between items-center px-1">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[9px] text-pro-teal font-black uppercase tracking-widest hover:underline"
              >
                Esqueci minha senha
              </button>
              <button 
                type="button"
                onClick={() => setView("first_password_setup")}
                className="text-[9px] text-pro-teal font-black uppercase tracking-widest hover:underline"
              >
                Não possuo senha
              </button>
            </div>
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

        <div className="space-y-4">
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300">
              <span className="bg-white px-2 tracking-[0.2em]">Ou para Gestão / Direção</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </button>
        </div>

        <div className="pt-2 text-center">
          <button
            onClick={onShowInstall}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[9px] font-black text-pro-teal uppercase tracking-[0.2em] hover:bg-pro-teal/5 transition-all group"
          >
            <Smartphone size={14} className="group-hover:scale-110 transition-transform" />
            Instalar App no Celular
          </button>
        </div>
      </div>
    </motion.div>
  );
};
