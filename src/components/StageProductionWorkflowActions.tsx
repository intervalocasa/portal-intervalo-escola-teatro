import React, { useState } from "react";
import {
  StageProductionProposal,
  TechnicalDocumentAttachment
} from "../types";
import {
  advanceToRectificationOrPlanning,
  submitArtDirectionProjects,
  uploadPurchasesSpreadsheet,
  finalizePurchasesProcess,
  finalizePartialDeliveryProcess,
  finalizeTotalDeliveryProcess,
  finalizePresentationProcess,
  getStageStepIndex
} from "../services/stageProductionService";
import {
  Palette,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  ShoppingBag,
  Truck,
  PackageCheck,
  Theater,
  Award,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Calendar
} from "lucide-react";

interface StageProductionWorkflowActionsProps {
  proposal: StageProductionProposal;
  currentUser: any;
  isGestor: boolean;
  isProfessor: boolean;
  onRefresh?: () => void;
  showNotification?: (msg: string, title?: string, type?: "success" | "error" | "info" | "warning") => void;
  onRequestEditForRectification?: () => void;
}

export const StageProductionWorkflowActions: React.FC<StageProductionWorkflowActionsProps> = ({
  proposal,
  currentUser,
  isGestor,
  isProfessor,
  onRefresh,
  showNotification,
  onRequestEditForRectification
}) => {
  const currentStatus = proposal.status || "formulario_em_preenchimento";
  const stepIdx = getStageStepIndex(currentStatus);

  // States for Stage 5: Direção de Arte
  const [artProposalText, setArtProposalText] = useState(proposal.artDirectionProposalText || "");
  const [artPdfs, setArtPdfs] = useState<TechnicalDocumentAttachment[]>(proposal.artDirectionProjectsPdfs || []);
  const [isSubmittingArt, setIsSubmittingArt] = useState(false);

  // States for Stage 6: Planilha de Compras
  const [purchasesSpreadsheet, setPurchasesSpreadsheet] = useState<TechnicalDocumentAttachment | null>(
    proposal.purchasesSpreadsheetAttachment || null
  );
  const [purchasesNotes, setPurchasesNotes] = useState(proposal.purchasesSpreadsheetNotes || "");
  const [isSavingSpreadsheet, setIsSavingSpreadsheet] = useState(false);
  const [isFinalizingPurchases, setIsFinalizingPurchases] = useState(false);

  // States for Stage 7: Entrega Parcial
  const [partialNotes, setPartialNotes] = useState("");
  const [isFinalizingPartial, setIsFinalizingPartial] = useState(false);

  // States for Stage 8: Entrega Final
  const [finalDeliveryNotes, setFinalDeliveryNotes] = useState("");
  const [isFinalizingFinalDelivery, setIsFinalizingFinalDelivery] = useState(false);

  // States for Stage 9: Apresentação
  const [presentationNotes, setPresentationNotes] = useState("");
  const [isFinalizingPresentation, setIsFinalizingPresentation] = useState(false);

  // General loading states
  const [isAdvancingStatus, setIsAdvancingStatus] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handlePdfUpload = (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showNotification?.("Apenas arquivos no formato PDF são aceitos.", "Formato Inválido", "error");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showNotification?.("O arquivo deve ter no máximo 20 MB.", "Arquivo muito grande", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newAttachment: TechnicalDocumentAttachment = {
        name: file.name,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString()
      };
      setArtPdfs(prev => [...prev, newAttachment]);
      showNotification?.(`PDF '${file.name}' adicionado à lista de projetos.`, "Anexo Adicionado", "info");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveArtPdf = (index: number) => {
    setArtPdfs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSpreadsheetUpload = (file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      showNotification?.("O arquivo deve ter no máximo 25 MB.", "Arquivo muito grande", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const newAttachment: TechnicalDocumentAttachment = {
        name: file.name,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString()
      };
      setPurchasesSpreadsheet(newAttachment);

      if (proposal.id) {
        try {
          setIsSavingSpreadsheet(true);
          await uploadPurchasesSpreadsheet(
            proposal.id,
            newAttachment,
            purchasesNotes,
            {
              uid: currentUser?.uid || "",
              name: currentUser?.displayName || currentUser?.name || "Gestor"
            }
          );
          showNotification?.("Planilha de compras anexada e salva com sucesso!", "Salvo", "success");
          onRefresh?.();
        } catch (err) {
          console.error(err);
          showNotification?.("Erro ao salvar planilha de compras.", "Erro", "error");
        } finally {
          setIsSavingSpreadsheet(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Trigger from Stage 3 to Stage 4 or 5
  const handleAdvanceToRectification = async () => {
    if (!proposal.id) return;
    try {
      setIsAdvancingStatus(true);
      await advanceToRectificationOrPlanning(
        proposal.id,
        "em_retificacao",
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Usuário"
        }
      );
      showNotification?.("Formulário avançado para o Status 4: Em retificação.", "Status Atualizado", "success");
      onRefresh?.();
      if (isProfessor && onRequestEditForRectification) {
        onRequestEditForRectification();
      }
    } catch (err) {
      console.error(err);
      showNotification?.("Falha ao atualizar status.", "Erro", "error");
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  const handleAdvanceToPlanning = async () => {
    if (!proposal.id) return;
    try {
      setIsAdvancingStatus(true);
      await advanceToRectificationOrPlanning(
        proposal.id,
        "em_planejamento",
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Usuário"
        }
      );
      showNotification?.("Proposta aprovada! Avançado para o Status 5: Em planejamento.", "Status Atualizado", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Falha ao atualizar status.", "Erro", "error");
    } finally {
      setIsAdvancingStatus(false);
    }
  };

  // Submit Stage 5 -> Stage 6
  const handleSubmitArtDirection = async () => {
    if (!proposal.id) return;
    if (!artProposalText.trim()) {
      showNotification?.("Por favor, preencha a explicação da proposta pela direção de arte.", "Campo Obrigatório", "warning");
      return;
    }
    if (artPdfs.length === 0) {
      showNotification?.("Anexe ao menos um projeto técnico em PDF (cenografia, figurino, etc.).", "Anexo Necessário", "warning");
      return;
    }

    try {
      setIsSubmittingArt(true);
      await submitArtDirectionProjects(
        proposal.id,
        {
          proposalText: artProposalText,
          projectsPdfs: artPdfs
        },
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Direção de Arte"
        }
      );
      showNotification?.("Proposta da Direção de Arte submetida com sucesso! Status avançou para 6) Em processo de compras.", "Sucesso", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Erro ao submeter proposta da direção de arte.", "Erro", "error");
    } finally {
      setIsSubmittingArt(false);
    }
  };

  // Gestor Actions: Step 6 -> 7
  const handleFinalizePurchases = async () => {
    if (!proposal.id) return;
    if (!purchasesSpreadsheet && !proposal.purchasesSpreadsheetAttachment) {
      showNotification?.("Recomenda-se anexar a planilha de compras antes de finalizar o processo de compras.", "Aviso", "warning");
    }

    try {
      setIsFinalizingPurchases(true);
      await finalizePurchasesProcess(
        proposal.id,
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Gestor"
        }
      );
      showNotification?.("Processo de compras finalizado com sucesso! Status avançou para 7) Em processo de entrega parcial.", "Sucesso", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Erro ao finalizar processo de compras.", "Erro", "error");
    } finally {
      setIsFinalizingPurchases(false);
    }
  };

  // Gestor Actions: Step 7 -> 8
  const handleFinalizePartialDelivery = async () => {
    if (!proposal.id) return;
    try {
      setIsFinalizingPartial(true);
      await finalizePartialDeliveryProcess(
        proposal.id,
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Gestor"
        },
        partialNotes
      );
      showNotification?.("Processo de entrega parcial concluído! Status avançou para 8) Em processo de entrega final.", "Sucesso", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Erro ao concluir entrega parcial.", "Erro", "error");
    } finally {
      setIsFinalizingPartial(false);
    }
  };

  // Gestor Actions: Step 8 -> 9
  const handleFinalizeTotalDelivery = async () => {
    if (!proposal.id) return;
    try {
      setIsFinalizingFinalDelivery(true);
      await finalizeTotalDeliveryProcess(
        proposal.id,
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Gestor"
        },
        finalDeliveryNotes
      );
      showNotification?.("Processo de entrega total concluído! Status avançou para 9) Em apresentação.", "Sucesso", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Erro ao concluir entrega total.", "Erro", "error");
    } finally {
      setIsFinalizingFinalDelivery(false);
    }
  };

  // Gestor Actions: Step 9 -> 10
  const handleFinalizePresentation = async () => {
    if (!proposal.id) return;
    try {
      setIsFinalizingPresentation(true);
      await finalizePresentationProcess(
        proposal.id,
        {
          uid: currentUser?.uid || "",
          name: currentUser?.displayName || currentUser?.name || "Gestor"
        },
        presentationNotes
      );
      showNotification?.("Apresentação concluída com sucesso! Status finalizado em 10) Apresentação concluída.", "Sucesso", "success");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      showNotification?.("Erro ao finalizar apresentação.", "Erro", "error");
    } finally {
      setIsFinalizingPresentation(false);
    }
  };

  const isStep3 = currentStatus === "resultado_analise_disponivel";
  const needsRectification =
    proposal.pedagogicalFeedback?.status === "PRECISA DE RETIFICAÇÕES" ||
    proposal.artisticFeedback?.status === "PRECISA DE RETIFICAÇÕES";
  const isApproved =
    proposal.pedagogicalFeedback?.status === "APROVADO" &&
    proposal.artisticFeedback?.status === "APROVADO";

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* GATILHO STATUS 3 -> 4 OU 5: Resultado de análise disponível   */}
      {/* ------------------------------------------------------------- */}
      {isStep3 && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3.5 mb-4">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shrink-0">
              <CheckCircle size={24} />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md">
                Status 3: Resultado de análise disponível
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Parecer das Direções Pedagógica e Artística Disponível
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">
                As direções pedagógica e artística finalizaram a avaliação do formulário. Confira o resultado e acione a próxima etapa:
              </p>
            </div>
          </div>

          {needsRectification ? (
            <div className="bg-white border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">
                    Resultado: Precisa de Retificações
                  </h4>
                  <p className="text-xs text-rose-700">
                    Ao acionar este gatilho, o formulário entrará no status &quot;4) Em retificação&quot; para que o professor realize as correções.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAdvanceToRectification}
                disabled={isAdvancingStatus}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 disabled:opacity-50"
              >
                <ArrowRight size={15} />
                {isAdvancingStatus ? "Avançando..." : "Avançar para: 4) Em retificação"}
              </button>
            </div>
          ) : isApproved ? (
            <div className="bg-white border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">
                    Resultado: Aprovado pelas Direções
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Ao acionar este gatilho, o formulário entrará no status &quot;5) Em planejamento&quot; para atuação da Direção de Arte.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAdvanceToPlanning}
                disabled={isAdvancingStatus}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 disabled:opacity-50"
              >
                <ArrowRight size={15} />
                {isAdvancingStatus ? "Avançando..." : "Avançar para: 5) Em planejamento"}
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
              Aguardando parecer final das direções pedagógica e artística.
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS 4: Em retificação                                      */}
      {/* ------------------------------------------------------------- */}
      {currentStatus === "em_retificacao" && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-600 text-white rounded-xl shadow-sm shrink-0">
              <AlertCircle size={22} />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                Status 4: Em retificação
              </span>
              <h4 className="font-bold text-rose-950 text-sm mt-0.5">
                Formulário em processo de retificação pelo Professor
              </h4>
              <p className="text-xs text-rose-700">
                Prazo de retificação estipulado pela gestão: <span className="font-bold">{proposal.rectificationDeadline || "Conforme cronograma"}</span>.
              </p>
            </div>
          </div>
          {isProfessor && onRequestEditForRectification && (
            <button
              type="button"
              onClick={onRequestEditForRectification}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
            >
              Editar e Enviar Retificação
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS 5: Em planejamento (Área da Direção de Arte)           */}
      {/* ------------------------------------------------------------- */}
      {(currentStatus === "em_planejamento" || stepIdx >= 4) && (
        <div className={`rounded-2xl border ${currentStatus === "em_planejamento" ? "border-purple-300 bg-purple-50/50 shadow-sm" : "border-slate-200 bg-white"} p-6`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm">
                <Palette size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                    Etapa 5: Em Planejamento
                  </span>
                  {stepIdx > 4 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle size={12} /> Submetido pela Direção de Arte
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Proposta Conceitual e Projetos da Direção de Arte
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Anexação dos projetos técnicos em PDF (cenografia, figurino, iluminação) e detalhamento da proposta pela direção de arte.
                </p>
              </div>
            </div>
          </div>

          {/* Form when in Status 5 */}
          {currentStatus === "em_planejamento" ? (
            <div className="space-y-4 mt-4 bg-white p-5 rounded-xl border border-purple-200">
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-1.5">
                  Explicação da Proposta pela Direção de Arte <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={artProposalText}
                  onChange={(e) => setArtProposalText(e.target.value)}
                  rows={4}
                  placeholder="Explique detalhadamente a concepção cênica, soluções de cenografia, estética dos figurinos, iluminação, paleta de cores e planejamento artístico..."
                  className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                    Anexar PDFs de Projetos (Cenografia, Figurino, etc.) <span className="text-rose-500">*</span>
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-xs rounded-lg transition-all">
                    <Upload size={14} />
                    Selecionar PDF
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {artPdfs.length === 0 ? (
                  <div className="p-6 border-2 border-dashed border-purple-200 rounded-xl text-center bg-purple-50/30">
                    <FileText size={28} className="mx-auto text-purple-400 mb-2" />
                    <p className="text-xs font-bold text-slate-600">Nenhum PDF de projeto anexado ainda.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Clique em &quot;Selecionar PDF&quot; para anexar projetos de cenografia, figurino ou maquiagem.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {artPdfs.map((pdf, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <FileText size={18} className="text-purple-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-800 truncate">{pdf.name}</p>
                            <p className="text-[10px] text-slate-500">{formatFileSize(pdf.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={pdf.dataUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Visualizar PDF"
                          >
                            <ExternalLink size={16} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveArtPdf(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover anexo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmitArtDirection}
                  disabled={isSubmittingArt}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Palette size={16} />
                  {isSubmittingArt ? "Submetendo..." : "Submeter Projetos da Direção de Arte (Avançar para Compras)"}
                </button>
              </div>
            </div>
          ) : (
            // Read-only consultation view for Stage 5 when step > 5
            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              {proposal.artDirectionProposalText && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Proposta Conceitual da Direção de Arte:</span>
                  <p className="text-slate-600 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                    {proposal.artDirectionProposalText}
                  </p>
                </div>
              )}

              {proposal.artDirectionProjectsPdfs && proposal.artDirectionProjectsPdfs.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1.5">PDFs dos Projetos Técnicos:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {proposal.artDirectionProjectsPdfs.map((pdf, idx) => (
                      <a
                        key={idx}
                        href={pdf.dataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 hover:border-purple-300 rounded-lg transition-all group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={16} className="text-purple-600 shrink-0" />
                          <span className="truncate text-slate-700 font-medium">{pdf.name}</span>
                        </div>
                        <ExternalLink size={14} className="text-slate-400 group-hover:text-purple-600 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS 6: Em processo de compras (Planilha de Compras)         */}
      {/* ------------------------------------------------------------- */}
      {(currentStatus === "em_processo_de_compras" || stepIdx >= 5) && (
        <div className={`rounded-2xl border ${currentStatus === "em_processo_de_compras" ? "border-blue-300 bg-blue-50/50 shadow-sm" : "border-slate-200 bg-white"} p-6`}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
                <ShoppingBag size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Etapa 6: Processo de Compras
                  </span>
                  {stepIdx > 5 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle size={12} /> Compras Finalizadas
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Planilha de Compras e Aquisições
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Orçamento e planilha de compras. O gestor conclui esta etapa informando que as compras foram finalizadas.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-blue-200 space-y-4">
            {/* Budget summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Verba Compras/Aquisições:</span>
                <span className="font-bold text-slate-800 text-sm">
                  R$ {(proposal.budgetPurchasesAcquisitions || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Mão de Obra:</span>
                <span className="font-bold text-slate-800 text-sm">
                  R$ {(proposal.budgetLabor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Orçamento Total:</span>
                <span className="font-black text-blue-700 text-sm">
                  R$ {(proposal.budgetTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Planilha de Compras Upload / View */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                  Planilha de Compras Anexada
                </label>
                {(isGestor || currentStatus === "em_processo_de_compras") && (
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-xs rounded-lg transition-all">
                    <Upload size={14} />
                    {purchasesSpreadsheet ? "Substituir Planilha" : "Anexar Planilha de Compras"}
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSpreadsheetUpload(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {purchasesSpreadsheet ? (
                <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={24} className="text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-950">{purchasesSpreadsheet.name}</p>
                      <p className="text-[10px] text-blue-600">
                        {formatFileSize(purchasesSpreadsheet.size)} • Anexado em {new Date(purchasesSpreadsheet.uploadedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <a
                    href={purchasesSpreadsheet.dataUrl}
                    download={purchasesSpreadsheet.name}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-lg shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Baixar / Abrir
                  </a>
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50 text-xs text-slate-500">
                  Nenhuma planilha de compras anexada ainda.
                </div>
              )}
            </div>

            {/* Button for Gestor to finalize purchases */}
            {currentStatus === "em_processo_de_compras" && isGestor && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Após comprar todos os itens ou liberar aquisições:
                </span>
                <button
                  type="button"
                  onClick={handleFinalizePurchases}
                  disabled={isFinalizingPurchases}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {isFinalizingPurchases ? "Processando..." : "Processo de Compras Finalizado (Avançar para Entrega Parcial)"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS 7: Em processo de entrega parcial                      */}
      {/* ------------------------------------------------------------- */}
      {(currentStatus === "em_processo_de_entrega_parcial" || stepIdx >= 6) && (
        <div className={`rounded-2xl border ${currentStatus === "em_processo_de_entrega_parcial" ? "border-cyan-300 bg-cyan-50/50 shadow-sm" : "border-slate-200 bg-white"} p-6`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-600 text-white rounded-xl shadow-sm">
                <Truck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-700 bg-cyan-100 px-2 py-0.5 rounded">
                    Etapa 7: Entrega Parcial
                  </span>
                  {stepIdx > 6 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle size={12} /> Entrega Parcial Concluída
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Processo de Entrega Parcial
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Recebimento de adereços de cena, cenografia de ensaio e peças prioritárias para a turma.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-cyan-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={15} className="text-cyan-600" />
              <span>Prazo previsto para Entrega Parcial:</span>
              <span className="font-bold text-slate-800">{proposal.partialDeliveryDate || "Não estipulado"}</span>
            </div>

            {currentStatus === "em_processo_de_entrega_parcial" && isGestor && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <input
                  type="text"
                  value={partialNotes}
                  onChange={(e) => setPartialNotes(e.target.value)}
                  placeholder="Observações da entrega parcial (opcional)..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleFinalizePartialDelivery}
                    disabled={isFinalizingPartial}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    {isFinalizingPartial ? "Concluindo..." : "Concluir Processo de Entrega Parcial (Avançar para Entrega Final)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS 8: Em processo de entrega final                        */}
      {/* ------------------------------------------------------------- */}
      {(currentStatus === "em_processo_de_entrega_final" || stepIdx >= 7) && (
        <div className={`rounded-2xl border ${currentStatus === "em_processo_de_entrega_final" ? "border-teal-300 bg-teal-50/50 shadow-sm" : "border-slate-200 bg-white"} p-6`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-sm">
                <PackageCheck size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                    Etapa 8: Entrega Final
                  </span>
                  {stepIdx > 7 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle size={12} /> Entrega Final Concluída
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Processo de Entrega Final
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Conclusão e entrega de 100% dos figurinos, elementos cenográficos, mapa de iluminação e adereços.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-teal-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={15} className="text-teal-600" />
              <span>Prazo previsto para Entrega Final:</span>
              <span className="font-bold text-slate-800">{proposal.finalDeliveryDate || "Não estipulado"}</span>
            </div>

            {currentStatus === "em_processo_de_entrega_final" && isGestor && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <input
                  type="text"
                  value={finalDeliveryNotes}
                  onChange={(e) => setFinalDeliveryNotes(e.target.value)}
                  placeholder="Observações da entrega final (opcional)..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleFinalizeTotalDelivery}
                    disabled={isFinalizingFinalDelivery}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    {isFinalizingFinalDelivery ? "Concluindo..." : "Concluir Processo de Entrega Total (Avançar para Apresentação)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS 9: Em apresentação                                     */}
      {/* ------------------------------------------------------------- */}
      {(currentStatus === "em_apresentacao" || stepIdx >= 8) && (
        <div className={`rounded-2xl border ${currentStatus === "em_apresentacao" ? "border-amber-300 bg-amber-50/50 shadow-sm" : "border-slate-200 bg-white"} p-6`}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-sm">
                <Theater size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Etapa 9: Em Apresentação
                  </span>
                  {stepIdx > 8 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle size={12} /> Temporada Finalizada
                    </span>
                  )}
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Temporada de Apresentações
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  A montagem está em cartaz com apresentações programadas para o público.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-200 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={15} className="text-amber-600" />
              <span>Datas das Apresentações:</span>
              <span className="font-bold text-slate-800">{proposal.presentationDates || proposal.presentationDate || "A definir"}</span>
            </div>

            {currentStatus === "em_apresentacao" && isGestor && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <input
                  type="text"
                  value={presentationNotes}
                  onChange={(e) => setPresentationNotes(e.target.value)}
                  placeholder="Notas finais da apresentação / temporada (opcional)..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleFinalizePresentation}
                    disabled={isFinalizingPresentation}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all uppercase tracking-wider disabled:opacity-50"
                  >
                    <Award size={16} />
                    {isFinalizingPresentation ? "Finalizando..." : "Apresentação Concluída"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATUS 10: Apresentação concluída                              */}
      {/* ------------------------------------------------------------- */}
      {currentStatus === "apresentacao_concluida" && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-lg flex items-center gap-4">
          <div className="p-3.5 bg-white/20 rounded-2xl shrink-0">
            <Award size={36} className="text-emerald-100" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-emerald-100">
              Status 10: Apresentação Concluída
            </span>
            <h3 className="text-lg font-black mt-1">
              Ciclo de Apresentação e Montagem Finalizado com Sucesso!
            </h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Todas as 10 etapas foram concluídas satisfatoriamente. O espetáculo cumpriu a temporada programada com êxito.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
