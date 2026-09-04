import React from "react";
import { StageProductionProposal } from "../types";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Users, 
  CheckCircle2, 
  ShoppingBag, 
  Hammer, 
  Layers, 
  Edit3, 
  Sparkles, 
  Truck 
} from "lucide-react";

interface StageProductionGuidelinesCardProps {
  proposal: StageProductionProposal;
  isGestor?: boolean;
  onEditGestorParams?: () => void;
  compact?: boolean;
}

export const StageProductionGuidelinesCard: React.FC<StageProductionGuidelinesCardProps> = ({
  proposal,
  isGestor = false,
  onEditGestorParams,
  compact = false
}) => {
  const formatBRL = (val?: number) => {
    return (val || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "A definir";
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
            <Sparkles size={14} />
            Parâmetros & Diretrizes Oficiais da Gestão
          </div>
          <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            Turma: <span className="text-purple-300">{proposal.className || "Não informada"}</span>
          </h3>
          {proposal.createdByGestorName && (
            <p className="text-xs text-slate-400 mt-0.5">
              Criado pela gestão por: <span className="text-slate-300 font-medium">{proposal.createdByGestorName}</span>
            </p>
          )}
        </div>

        {isGestor && onEditGestorParams && (
          <button
            type="button"
            onClick={onEditGestorParams}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md self-start sm:self-auto"
          >
            <Edit3 size={14} />
            Editar Parâmetros da Gestão
          </button>
        )}
      </div>

      {/* Orçamentos Grid */}
      <div className="my-5 relative z-10">
        <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <DollarSign size={14} className="text-emerald-400" />
          Orçamento Autorizado da Montagem
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
              <ShoppingBag size={14} className="text-blue-400" />
              Compras, Confecções e Aquisições
            </div>
            <div className="text-lg font-black text-blue-300">
              {formatBRL(proposal.budgetPurchasesAcquisitions)}
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-1">
              <Hammer size={14} className="text-amber-400" />
              Mão-de-Obra
            </div>
            <div className="text-lg font-black text-amber-300">
              {formatBRL(proposal.budgetLabor)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/60 to-slate-800 border border-emerald-500/30 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold mb-1">
              <Layers size={14} className="text-emerald-400" />
              Orçamento Total da Montagem
            </div>
            <div className="text-xl font-black text-emerald-400">
              {formatBRL(proposal.budgetTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Cronograma e Prazos */}
      <div className="pt-2 relative z-10">
        <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Calendar size={14} className="text-purple-400" />
          Cronograma de Prazos e Entregas
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {/* Prazo de Submissão do formulário */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock size={13} className="text-amber-400" />
              Prazo de Submissão (Professor):
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {formatDate(proposal.submissionDeadline)}
            </div>
          </div>

          {/* Devolutiva Pedagógica e Artística */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Calendar size={13} className="text-purple-400" />
              Devolutiva da Avaliação (Coord.):
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {formatDate(proposal.pedagogicalArtisticFeedbackDate)}
            </div>
          </div>

          {/* Prazo de Retificação */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock size={13} className="text-rose-400" />
              Prazo de Retificação (se pendente):
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {formatDate(proposal.rectificationDeadline)}
            </div>
          </div>

          {/* Aprovação Final */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={13} className="text-emerald-400" />
              Aprovação Final do Formulário:
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {formatDate(proposal.finalApprovalDate)}
            </div>
          </div>

          {/* Reunião de Planejamento */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Users size={13} className="text-sky-400" />
              Reunião de Planejamento da Montagem:
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {formatDate(proposal.planningMeetingDate)}
            </div>
          </div>

          {/* Período de Execução de Compras */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <ShoppingBag size={13} className="text-indigo-400" />
              Período de Execução de Compras:
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {proposal.executionPeriod || "Não informado"}
            </div>
          </div>

          {/* Entrega Parcial */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Truck size={13} className="text-teal-400" />
              Entrega Parcial (Cenografia/Objetos):
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {formatDate(proposal.partialDeliveryDate)}
            </div>
          </div>

          {/* Entrega Final */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={13} className="text-emerald-400" />
              Entrega Final de Todos os Itens:
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {formatDate(proposal.finalDeliveryDate)}
            </div>
          </div>

          {/* Datas de Apresentação */}
          <div className="bg-purple-950/40 border border-purple-500/40 rounded-xl p-3 sm:col-span-2 lg:col-span-1">
            <div className="text-purple-300 font-bold flex items-center gap-1.5 mb-1">
              <Calendar size={13} className="text-purple-400" />
              Datas de Apresentação:
            </div>
            <div className="font-black text-white text-sm">
              {proposal.presentationDates || formatDate(proposal.presentationDate) || "A definir"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
