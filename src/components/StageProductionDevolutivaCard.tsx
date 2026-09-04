import React, { useState } from "react";
import { 
  StageProductionProposal, 
  EvaluationStatus, 
  StageProductionDevolutiva 
} from "../types";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  GraduationCap, 
  Palette, 
  Send, 
  MessageSquare, 
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { 
  savePedagogicalDevolutiva, 
  saveArtisticDevolutiva 
} from "../services/stageProductionService";

interface StageProductionDevolutivaCardProps {
  proposal: StageProductionProposal;
  currentUser: any;
  userRole?: string;
  isGestor: boolean;
  isDiretorPedagogico: boolean;
  isProfessor: boolean;
  onRefresh?: () => void;
  showNotification?: (message: string, title?: string, type?: "success" | "error" | "warning") => void;
  onRequestEditForRectification?: () => void;
}

export const StageProductionDevolutivaCard: React.FC<StageProductionDevolutivaCardProps> = ({
  proposal,
  currentUser,
  isGestor,
  isDiretorPedagogico,
  isProfessor,
  onRefresh,
  showNotification,
  onRequestEditForRectification
}) => {
  // Pedagogical review local form state
  const [pedagogicalStatus, setPedagogicalStatus] = useState<EvaluationStatus>(
    proposal.pedagogicalFeedback?.status || "PENDENTE"
  );
  const [pedagogicalComment, setPedagogicalComment] = useState<string>(
    proposal.pedagogicalFeedback?.comment || ""
  );
  const [isSavingPedagogical, setIsSavingPedagogical] = useState(false);

  // Artistic review local form state
  const [artisticStatus, setArtisticStatus] = useState<EvaluationStatus>(
    proposal.artisticFeedback?.status || "PENDENTE"
  );
  const [artisticComment, setArtisticComment] = useState<string>(
    proposal.artisticFeedback?.comment || ""
  );
  const [isSavingArtistic, setIsSavingArtistic] = useState(false);

  const handleSavePedagogical = async () => {
    if (pedagogicalStatus === "PENDENTE") {
      showNotification?.("Selecione se a proposta foi APROVADA ou se PRECISA DE RETIFICAÇÕES.", "Atenção", "warning");
      return;
    }
    if (pedagogicalStatus === "PRECISA DE RETIFICAÇÕES" && !pedagogicalComment.trim()) {
      showNotification?.("Informe um comentário com as orientações para o professor retificar a proposta.", "Comentário Obrigatório", "warning");
      return;
    }

    try {
      setIsSavingPedagogical(true);
      await savePedagogicalDevolutiva(
        proposal.id!,
        pedagogicalStatus,
        pedagogicalComment,
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Direção Pedagógica"
        },
        proposal.artisticFeedback?.status
      );
      showNotification?.("Devolutiva pedagógica registrada com sucesso!", "Sucesso", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Falha ao salvar devolutiva pedagógica.", "Erro", "error");
    } finally {
      setIsSavingPedagogical(false);
    }
  };

  const handleSaveArtistic = async () => {
    if (artisticStatus === "PENDENTE") {
      showNotification?.("Selecione se a proposta foi APROVADA ou se PRECISA DE RETIFICAÇÕES.", "Atenção", "warning");
      return;
    }
    if (artisticStatus === "PRECISA DE RETIFICAÇÕES" && !artisticComment.trim()) {
      showNotification?.("Informe um comentário com as orientações artísticas para o professor retificar a proposta.", "Comentário Obrigatório", "warning");
      return;
    }

    try {
      setIsSavingArtistic(true);
      await saveArtisticDevolutiva(
        proposal.id!,
        artisticStatus,
        artisticComment,
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Gestão Artística"
        },
        proposal.pedagogicalFeedback?.status
      );
      showNotification?.("Devolutiva artística registrada com sucesso!", "Sucesso", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Falha ao salvar devolutiva artística.", "Erro", "error");
    } finally {
      setIsSavingArtistic(false);
    }
  };

  const renderStatusBadge = (devolutiva?: StageProductionDevolutiva) => {
    if (!devolutiva || devolutiva.status === "PENDENTE" || !devolutiva.status) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black rounded-full">
          <Clock size={12} className="animate-spin text-amber-600" />
          Aguardando Avaliação
        </span>
      );
    }
    if (devolutiva.status === "APROVADO") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black rounded-full">
          <CheckCircle size={13} className="text-emerald-600" />
          APROVADO
        </span>
      );
    }
    if (devolutiva.status === "PRECISA DE RETIFICAÇÕES") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 border border-rose-300 text-xs font-black rounded-full">
          <AlertTriangle size={13} className="text-rose-600" />
          PRECISA DE RETIFICAÇÕES
        </span>
      );
    }
    return null;
  };

  const isBothApproved = 
    proposal.pedagogicalFeedback?.status === "APROVADO" && 
    proposal.artisticFeedback?.status === "APROVADO";

  const needsRectification = 
    proposal.pedagogicalFeedback?.status === "PRECISA DE RETIFICAÇÕES" || 
    proposal.artisticFeedback?.status === "PRECISA DE RETIFICAÇÕES";

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
      {/* Overall evaluation banner */}
      {isBothApproved && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-4 shadow-md flex items-center gap-4">
          <div className="bg-white/20 p-2.5 rounded-full">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h4 className="font-black text-base uppercase tracking-wide">
              Apresentação Aprovada com Sucesso!
            </h4>
            <p className="text-xs text-emerald-50 font-medium mt-0.5">
              Tanto a avaliação pedagógica quanto a artística foram favoráveis. A montagem segue para execução e ensaios técnicos.
            </p>
          </div>
        </div>
      )}

      {needsRectification && (
        <div className="bg-gradient-to-r from-rose-500 to-amber-600 text-white rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-full shrink-0">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h4 className="font-black text-base uppercase tracking-wide">
                Retificações Solicitadas no Formulário
              </h4>
              <p className="text-xs text-rose-50 font-medium mt-0.5">
                Revise os pareceres pedagógico e/ou artístico abaixo e reenvie a versão corrigida até {proposal.rectificationDeadline || "o prazo estipulado"}.
              </p>
            </div>
          </div>

          {isProfessor && onRequestEditForRectification && (
            <button
              type="button"
              onClick={onRequestEditForRectification}
              className="px-4 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-black rounded-xl text-xs shadow-lg uppercase tracking-wider shrink-0 transition-all"
            >
              Editar e Enviar Retificação
            </button>
          )}
        </div>
      )}

      {/* Grid of evaluations: Pedagogical & Artistic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Avaliação Pedagógica */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 leading-tight">
                    Avaliação Pedagógica
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Direção Pedagógica
                  </span>
                </div>
              </div>
              {renderStatusBadge(proposal.pedagogicalFeedback)}
            </div>

            {/* Existing feedback display */}
            {proposal.pedagogicalFeedback?.evaluatedByName && (
              <div className="text-[11px] text-slate-500 mb-2">
                Avaliador: <strong className="text-slate-700">{proposal.pedagogicalFeedback.evaluatedByName}</strong>
                {proposal.pedagogicalFeedback.evaluatedAt && (
                  <span className="ml-2">
                    ({new Date(proposal.pedagogicalFeedback.evaluatedAt).toLocaleDateString("pt-BR")})
                  </span>
                )}
              </div>
            )}

            {proposal.pedagogicalFeedback?.comment ? (
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap mb-4">
                <div className="font-bold text-slate-500 text-[10px] uppercase mb-1 flex items-center gap-1">
                  <MessageSquare size={12} />
                  Parecer da Direção Pedagógica:
                </div>
                {proposal.pedagogicalFeedback.comment}
              </div>
            ) : (
              !isDiretorPedagogico && (
                <div className="text-xs text-slate-400 italic py-3">
                  Nenhum parecer pedagógico registrado até o momento.
                </div>
              )
            )}
          </div>

          {/* Form to submit Pedagogical Evaluation if user has permission */}
          {isDiretorPedagogico && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-600" />
                Registrar Devolutiva Pedagógica:
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPedagogicalStatus("APROVADO")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    pedagogicalStatus === "APROVADO"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle size={14} />
                  APROVADO
                </button>
                <button
                  type="button"
                  onClick={() => setPedagogicalStatus("PRECISA DE RETIFICAÇÕES")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    pedagogicalStatus === "PRECISA DE RETIFICAÇÕES"
                      ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <AlertTriangle size={14} />
                  PRECISA DE RETIFICAÇÕES
                </button>
              </div>

              <textarea
                value={pedagogicalComment}
                onChange={(e) => setPedagogicalComment(e.target.value)}
                placeholder="Insira aqui os comentários, orientações ou justificativa do parecer pedagógico..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none resize-none mb-3 bg-white"
              />

              <button
                type="button"
                disabled={isSavingPedagogical}
                onClick={handleSavePedagogical}
                className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow disabled:opacity-50"
              >
                <Send size={13} />
                {isSavingPedagogical ? "Salvando..." : "Salvar Devolutiva Pedagógica"}
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Avaliação Artística */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                  <Palette size={18} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 leading-tight">
                    Avaliação Artística
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Gestor / Curadoria Cênica
                  </span>
                </div>
              </div>
              {renderStatusBadge(proposal.artisticFeedback)}
            </div>

            {/* Existing feedback display */}
            {proposal.artisticFeedback?.evaluatedByName && (
              <div className="text-[11px] text-slate-500 mb-2">
                Avaliador: <strong className="text-slate-700">{proposal.artisticFeedback.evaluatedByName}</strong>
                {proposal.artisticFeedback.evaluatedAt && (
                  <span className="ml-2">
                    ({new Date(proposal.artisticFeedback.evaluatedAt).toLocaleDateString("pt-BR")})
                  </span>
                )}
              </div>
            )}

            {proposal.artisticFeedback?.comment ? (
              <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap mb-4">
                <div className="font-bold text-slate-500 text-[10px] uppercase mb-1 flex items-center gap-1">
                  <MessageSquare size={12} />
                  Parecer da Gestão Artística:
                </div>
                {proposal.artisticFeedback.comment}
              </div>
            ) : (
              !isGestor && (
                <div className="text-xs text-slate-400 italic py-3">
                  Nenhum parecer artístico registrado até o momento.
                </div>
              )
            )}
          </div>

          {/* Form to submit Artistic Evaluation if user is Gestor */}
          {isGestor && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1">
                <Sparkles size={13} className="text-purple-600" />
                Registrar Devolutiva Artística:
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setArtisticStatus("APROVADO")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    artisticStatus === "APROVADO"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <CheckCircle size={14} />
                  APROVADO
                </button>
                <button
                  type="button"
                  onClick={() => setArtisticStatus("PRECISA DE RETIFICAÇÕES")}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    artisticStatus === "PRECISA DE RETIFICAÇÕES"
                      ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <AlertTriangle size={14} />
                  PRECISA DE RETIFICAÇÕES
                </button>
              </div>

              <textarea
                value={artisticComment}
                onChange={(e) => setArtisticComment(e.target.value)}
                placeholder="Insira aqui os comentários, orientações ou justificativa do parecer artístico..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none mb-3 bg-white"
              />

              <button
                type="button"
                disabled={isSavingArtistic}
                onClick={handleSaveArtistic}
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow disabled:opacity-50"
              >
                <Send size={13} />
                {isSavingArtistic ? "Salvando..." : "Salvar Devolutiva Artística"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
