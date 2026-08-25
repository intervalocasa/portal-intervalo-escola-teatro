import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, AlertTriangle, X, Mail, Phone, Lock, CalendarOff, ShieldAlert } from "lucide-react";

interface DeadlineExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "professor_diary" | "student_self_assessment";
  referencePeriod: string; // Ex: "Agosto/2026"
  formattedDeadline: string; // Ex: "05/09/2026"
  studentName?: string;
  className?: string;
}

export const DeadlineExpiredModal: React.FC<DeadlineExpiredModalProps> = ({
  isOpen,
  onClose,
  type,
  referencePeriod,
  formattedDeadline,
  studentName,
  className
}) => {
  if (!isOpen) return null;

  const isProfessor = type === "professor_diary";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 p-6 text-white text-center relative overflow-hidden">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
              <CalendarOff size={28} className="text-white" />
            </div>
            
            <span className="inline-block px-3 py-1 bg-white/15 rounded-full text-[10px] font-black uppercase tracking-widest text-rose-100 mb-2 border border-white/20">
              {isProfessor ? "Prazo Institucional de Diários" : "Prazo de Autoanálise"}
            </span>

            <h3 className="text-xl font-black uppercase tracking-tight">
              {isProfessor ? "Prazo de Lançamento Expirado" : "Prazo de Envio Expirado"}
            </h3>
            
            <p className="text-rose-100 text-xs font-bold mt-1">
              {isProfessor 
                ? "Não é mais possível lançar ou editar este diário no sistema"
                : "Não é mais possível enviar ou editar sua autoavaliação"}
            </p>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Explicação pedagógica */}
            <div className="text-xs text-slate-600 leading-relaxed space-y-2">
              <p className="font-medium">
                {isProfessor ? (
                  <>
                    Os diários de notas e frequência mensais devem ser lançados impreterivelmente até o <strong>dia 05 do mês seguinte</strong>.
                  </>
                ) : (
                  <>
                    As autoavaliações mensais devem ser entregues impreterivelmente até o <strong>dia 05 do mês seguinte</strong>.
                  </>
                )}
              </p>
              <p className="font-medium text-slate-500">
                Como a data limite foi ultrapassada, o formulário para este período foi bloqueado pelo sistema.
              </p>
            </div>

            {/* Caixa de detalhes */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
              {className && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Turma</span>
                  <span className="font-black text-slate-800">{className}</span>
                </div>
              )}
              {studentName && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Aluno(a)</span>
                  <span className="font-black text-slate-800">{studentName}</span>
                </div>
              )}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Mês de Referência</span>
                <span className="font-black text-slate-800">{referencePeriod}</span>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-rose-600 font-bold uppercase tracking-wider text-[10px]">Prazo Limite Encerrou Em</span>
                <span className="font-black text-rose-600">{formattedDeadline} às 23:59</span>
              </div>
            </div>

            {/* Aviso de contato com a direção */}
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-black uppercase tracking-wide">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                Entre em contato com a Direção
              </div>
              <p className="text-[11px] text-amber-800 leading-normal font-medium">
                {isProfessor
                  ? "Para solicitar liberação excepcional ou regularização do lançamento deste diário, entre em contato diretamente com a coordenação/direção pedagógica."
                  : "Caso você tenha perdido o prazo e precise regularizar sua autoavaliação, entre em contato diretamente com a direção da escola para orientações."}
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row gap-2 text-xs">
                <a
                  href="mailto:contato@intervalocasa.com?subject=Solicitação%20de%20Prazo%20Excepcional"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-amber-200 text-slate-700 font-bold text-[11px] hover:bg-amber-100 transition-colors"
                >
                  <Mail size={13} className="text-amber-700" />
                  contato@intervalocasa.com
                </a>
              </div>
            </div>

            {/* Botão de Fechar */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl uppercase tracking-wider transition-all shadow-lg active:scale-98"
              >
                Entendido
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
