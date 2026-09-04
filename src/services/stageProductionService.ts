/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  arrayUnion
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  StageProductionProposal, 
  StageProductionStatus, 
  StageStatusHistoryEntry,
  EvaluationStatus,
  StageProductionDevolutiva,
  TechnicalDocumentAttachment,
  ProductionNeedItem
} from "../types";

export const STAGE_PRODUCTIONS_COLLECTION = "montagens_apresentacoes";

export interface StageEvolutionStep {
  id: StageProductionStatus;
  stepNumber: number;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
  ringColor: string;
  iconName: string;
}

export const STAGE_EVOLUTION_STEPS: StageEvolutionStep[] = [
  {
    id: "formulario_em_preenchimento",
    stepNumber: 1,
    label: "1) Formulário em preenchimento",
    shortLabel: "1. Preenchimento",
    description: "Gatilho: Gestor criou o formulário. Aguardando o professor responsável preencher as informações da obra, elenco e necessidades.",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    ringColor: "ring-slate-400 text-slate-600 bg-slate-50",
    iconName: "FileEdit"
  },
  {
    id: "formulario_em_analise",
    stepNumber: 2,
    label: "2) Formulário em análise",
    shortLabel: "2. Em Análise",
    description: "Gatilho: Professor enviou o formulário preenchido. Em avaliação pelas direções pedagógica e artística.",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    ringColor: "ring-amber-400 text-amber-600 bg-amber-50",
    iconName: "GraduationCap"
  },
  {
    id: "resultado_analise_disponivel",
    stepNumber: 3,
    label: "3) Resultado de análise disponível",
    shortLabel: "3. Parecer Disponível",
    description: "Gatilho: Direções pedagógica e artística disponibilizaram o parecer sobre o formulário da apresentação.",
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
    ringColor: "ring-indigo-400 text-indigo-600 bg-indigo-50",
    iconName: "ClipboardCheck"
  },
  {
    id: "em_retificacao",
    stepNumber: 4,
    label: "4) Em retificação",
    shortLabel: "4. Em Retificação",
    description: "Gatilho: Parecer indicou 'Precisa de retificações'. Professor realiza as correções solicitadas e reenvia.",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
    ringColor: "ring-rose-400 text-rose-600 bg-rose-50",
    iconName: "AlertCircle"
  },
  {
    id: "em_planejamento",
    stepNumber: 5,
    label: "5) Em planejamento do processo",
    shortLabel: "5. Planejamento",
    description: "Gatilho: Parecer 'Aprovado'. O professor preenche as necessidades de Iluminação, Som e Vídeo, e o diretor de arte anexa os Projetos Técnicos Obrigatórios (PDFs) e a concepção artística.",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    ringColor: "ring-purple-400 text-purple-600 bg-purple-50",
    iconName: "Palette"
  },
  {
    id: "em_processo_de_compras",
    stepNumber: 6,
    label: "6) Em processo de compras",
    shortLabel: "6. Processo de Compras",
    description: "Gatilho: Direção de arte submeteu projetos. Planilha de compras anexada e processo de compras em execução pelo gestor.",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    ringColor: "ring-blue-400 text-blue-600 bg-blue-50",
    iconName: "ShoppingBag"
  },
  {
    id: "em_processo_de_entrega_parcial",
    stepNumber: 7,
    label: "7) Em processo de entrega parcial",
    shortLabel: "7. Entrega Parcial",
    description: "Gatilho: Gestor finalizou o processo de compras. Entrega de objetos de cena e cenografia parcial para ensaios.",
    badgeColor: "bg-cyan-100 text-cyan-900 border-cyan-300",
    ringColor: "ring-cyan-400 text-cyan-600 bg-cyan-50",
    iconName: "Truck"
  },
  {
    id: "em_processo_de_entrega_final",
    stepNumber: 8,
    label: "8) Em processo de entrega final",
    shortLabel: "8. Entrega Final",
    description: "Gatilho: Gestor concluiu a entrega parcial. Entrega total de todos os itens, adereços e figurinos da montagem.",
    badgeColor: "bg-teal-100 text-teal-900 border-teal-300",
    ringColor: "ring-teal-400 text-teal-600 bg-teal-50",
    iconName: "PackageCheck"
  },
  {
    id: "em_apresentacao",
    stepNumber: 9,
    label: "9) Em apresentação",
    shortLabel: "9. Em Apresentação",
    description: "Gatilho: Gestor concluiu a entrega total. Turma em temporada de apresentações oficiais.",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    ringColor: "ring-amber-500 text-amber-700 bg-amber-50",
    iconName: "Theater"
  },
  {
    id: "apresentacao_concluida",
    stepNumber: 10,
    label: "10) Apresentação concluída",
    shortLabel: "10. Concluída",
    description: "Gatilho: Gestor clicou em 'Apresentação Concluída'. Ciclo de montagem finalizado com êxito!",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    ringColor: "ring-emerald-500 text-emerald-700 bg-emerald-50",
    iconName: "Award"
  }
];

export const normalizeStageStatus = (status?: StageProductionStatus): StageProductionStatus => {
  if (!status) return "formulario_em_preenchimento";
  if (status === "aguardando_preenchimento" || status === "pendente") return "formulario_em_preenchimento";
  if (status === "em_analise_pedagogica" || status === "em_analise_artistica" || status === "em_analise") return "formulario_em_analise";
  if (status === "analise_pedagogica_concluida" || status === "analise_artistica_concluida") return "resultado_analise_disponivel";
  if (status === "precisa_retificacoes" || status === "ajustes_solicitados") return "em_retificacao";
  if (status === "aprovada" || status === "aprovado") return "em_planejamento";
  if (status === "em_analise_executiva") return "em_processo_de_compras";
  if (status === "projeto_em_execucao") return "em_apresentacao";
  return status;
};

export const getStageStepIndex = (status?: StageProductionStatus): number => {
  if (!status) return 0;
  const normalized = normalizeStageStatus(status);
  const idx = STAGE_EVOLUTION_STEPS.findIndex(s => s.id === normalized);
  return idx >= 0 ? idx : 0;
};

export const getStageStepInfo = (status?: StageProductionStatus): StageEvolutionStep => {
  const normalizedStatus = normalizeStageStatus(status);
  const found = STAGE_EVOLUTION_STEPS.find(s => s.id === normalizedStatus);
  return found || STAGE_EVOLUTION_STEPS[0];
};

export const getStageLabel = (status?: StageProductionStatus): string => {
  return getStageStepInfo(status).label;
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateStageProductionProposal = (proposal: Partial<StageProductionProposal>): ValidationResult => {
  const errors: Record<string, string> = {};

  // Seção 1: Proponente
  if (!proposal.proponentName || !proposal.proponentName.trim()) {
    errors.proponentName = "Nome completo do proponente é obrigatório.";
  }
  if (!proposal.proponentRole) {
    errors.proponentRole = "Selecione o cargo/função na montagem.";
  }
  if (!proposal.proponentEmail || !proposal.proponentEmail.trim()) {
    errors.proponentEmail = "E-mail institucional é obrigatório.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proposal.proponentEmail.trim())) {
    errors.proponentEmail = "Informe um e-mail válido.";
  }
  if (!proposal.proponentPhone || !proposal.proponentPhone.trim()) {
    errors.proponentPhone = "Telefone / WhatsApp é obrigatório.";
  }

  // Seção 2: Identificação da Obra
  if (!proposal.title || !proposal.title.trim()) {
    errors.title = "Título do espetáculo/mostra é obrigatório.";
  }
  if (!proposal.genre) {
    errors.genre = "Gênero da obra é obrigatório.";
  }
  if (!proposal.synopsis || !proposal.synopsis.trim()) {
    errors.synopsis = "Sinopse da obra é obrigatória.";
  }

  // Seção 3: Proposta Pedagógica e Elenco
  if (!proposal.pedagogicalProposal || !proposal.pedagogicalProposal.trim()) {
    errors.pedagogicalProposal = "Proposta didática/pedagógica é obrigatória.";
  }
  if (!proposal.castProfile || !proposal.castProfile.trim()) {
    errors.castProfile = "Previsão de elenco (quantidade, faixa etária e perfil) é obrigatória.";
  }

  // Seção 4: Necessidades de Produção (Itens por subseção)
  // Cenografia e Adereços
  if (!proposal.scenographyItems || proposal.scenographyItems.length === 0) {
    errors.scenographyItems = "Adicione ao menos um item de necessidade para Cenografia e Adereços.";
  } else {
    proposal.scenographyItems.forEach((item, idx) => {
      if (!item.item || !item.item.trim()) {
        errors[`scenographyItem_${idx}`] = `Informe a descrição do item #${idx + 1} de Cenografia.`;
      }
      if (item.priority === "Indispensável" && (!item.indispensableReason || !item.indispensableReason.trim())) {
        errors[`scenographyReason_${idx}`] = `Justifique a indispensabilidade do item "${item.item || `#${idx + 1}`}".`;
      }
    });
  }

  // Nota: O item "Iluminação, Som e Vídeo (Necessidades Técnicas)" e o item "Projetos Técnicos Obrigatórios (Arquivos PDF)"
  // deverão ser preenchidos apenas na fase de execução de "5) Em planejamento do processo".
  // O item de iluminação, som e vídeo pelo professor e o item projetos técnicos obrigatórios pelo diretor de arte.

  // Outras Necessidades (Figurino, Maquiagem, Logística)
  if (!proposal.otherNeedsItems || proposal.otherNeedsItems.length === 0) {
    errors.otherNeedsItems = "Adicione ao menos um item de necessidade para Figurino, Maquiagem e Logística.";
  } else {
    proposal.otherNeedsItems.forEach((item, idx) => {
      if (!item.item || !item.item.trim()) {
        errors[`otherNeedsItem_${idx}`] = `Informe a descrição do item #${idx + 1} de Figurino/Maquiagem/Logística.`;
      }
      if (item.priority === "Indispensável" && (!item.indispensableReason || !item.indispensableReason.trim())) {
        errors[`otherNeedsReason_${idx}`] = `Justifique a indispensabilidade do item "${item.item || `#${idx + 1}`}".`;
      }
    });
  }

  // Termo de Aceite
  if (!proposal.termsAccepted) {
    errors.termsAccepted = "Você deve aceitar a confirmação de veracidade da Ficha de Inscrição.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const createGestorStageProductionForm = async (
  payload: {
    classId: string;
    className: string;
    presentationDate: string;
    submissionDeadline: string;
    budgetPurchasesAcquisitions: number;
    budgetLabor: number;
    budgetTotal: number;
    pedagogicalArtisticFeedbackDate: string;
    rectificationDeadline: string;
    finalApprovalDate: string;
    planningMeetingDate: string;
    executionPeriod: string;
    partialDeliveryDate: string;
    finalDeliveryDate: string;
    presentationDates: string;
    createdByGestorId: string;
    createdByGestorName: string;
  }
): Promise<string> => {
  // Gatilho: Gestor criou o formulário -> Status: 1) Formulário em preenchimento
  const initialStatus: StageProductionStatus = "formulario_em_preenchimento";
  const initialHistory: StageStatusHistoryEntry[] = [
    {
      status: initialStatus,
      statusLabel: "1) Formulário em preenchimento",
      updatedAt: new Date().toISOString(),
      updatedByUid: payload.createdByGestorId,
      updatedByName: payload.createdByGestorName,
      notes: `Gatilho: Gestor criou o formulário para a turma ${payload.className}. Status 1: Formulário em preenchimento pelo professor.`
    }
  ];

  const docRef = await addDoc(collection(db, STAGE_PRODUCTIONS_COLLECTION), {
    ...payload,
    // Professor fields initially blank
    title: "",
    genre: "Drama",
    synopsis: "",
    pedagogicalProposal: "",
    castProfile: "",
    scenographyItems: [],
    scenographyNotes: "",
    techItems: [],
    techNotes: "",
    otherNeedsItems: [],
    otherNeedsNotes: "",
    scenographyPdf: null,
    costumePdf: null,
    lightingPdf: null,
    termsAccepted: false,
    status: initialStatus,
    currentStepIndex: 0,
    statusHistory: initialHistory,
    pedagogicalFeedback: { status: "PENDENTE", comment: "" },
    artisticFeedback: { status: "PENDENTE", comment: "" },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return docRef.id;
};

export const updateGestorStageProductionForm = async (
  id: string,
  payload: Partial<StageProductionProposal>,
  updatedBy: { uid: string; name: string }
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, id);
  await updateDoc(docRef, {
    ...payload,
    updatedAt: serverTimestamp()
  });
};

export const submitProfessorStageProduction = async (
  id: string,
  proposalData: Partial<StageProductionProposal>,
  user: { uid: string; name: string }
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, id);
  const isRectification = proposalData.status === "em_retificacao" || proposalData.status === "precisa_retificacoes";
  // Gatilho: Professor enviou o formulário preenchido -> Status: 2) Formulário em análise
  const nextStatus: StageProductionStatus = "formulario_em_analise";

  const historyEntry: StageStatusHistoryEntry = {
    status: nextStatus,
    statusLabel: isRectification ? "Retificação Enviada (2. Em Análise)" : "2) Formulário em análise",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: isRectification
      ? "Gatilho: Professor reenviou o formulário retificado. Documento em análise pelas direções pedagógica e artística."
      : "Gatilho: Professor enviou o formulário preenchido. Status 2: Formulário em análise pelas direções."
  };

  await updateDoc(docRef, {
    ...proposalData,
    proponentUserId: user.uid,
    status: nextStatus,
    currentStepIndex: getStageStepIndex(nextStatus),
    statusHistory: arrayUnion(historyEntry),
    // Reset feedbacks to PENDENTE for new evaluation pass
    pedagogicalFeedback: {
      status: "PENDENTE",
      comment: proposalData.pedagogicalFeedback?.comment ? `(Avaliação anterior: ${proposalData.pedagogicalFeedback.status})` : ""
    },
    artisticFeedback: {
      status: "PENDENTE",
      comment: proposalData.artisticFeedback?.comment ? `(Avaliação anterior: ${proposalData.artisticFeedback.status})` : ""
    },
    updatedAt: serverTimestamp()
  });
};

export const savePedagogicalDevolutiva = async (
  proposalId: string,
  status: EvaluationStatus,
  comment: string,
  user: { uid: string; name: string },
  currentArtisticStatus?: EvaluationStatus
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const devolutiva: StageProductionDevolutiva = {
    status,
    comment: comment || "",
    evaluatedByUid: user.uid,
    evaluatedByName: user.name,
    evaluatedAt: new Date().toISOString()
  };

  // Gatilho: Direções pedagógica e artística disponibilizaram o parecer sobre o formulário:
  // Status: 3) Resultado de análise disponível
  const bothEvaluated = (status === "APROVADO" || status === "PRECISA DE RETIFICAÇÕES") &&
    (currentArtisticStatus === "APROVADO" || currentArtisticStatus === "PRECISA DE RETIFICAÇÕES");

  let newOverallStatus: StageProductionStatus = bothEvaluated ? "resultado_analise_disponivel" : "formulario_em_analise";

  const historyEntry: StageStatusHistoryEntry = {
    status: newOverallStatus,
    statusLabel: bothEvaluated ? "3) Resultado de análise disponível" : `Devolutiva Pedagógica: ${status}`,
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: bothEvaluated 
      ? `Direções pedagógica e artística emitiram parecer. Parecer Pedagógico: ${status}. Status 3: Resultado de análise disponível.`
      : `Devolutiva pedagógica registrada (${status}). Aguardando parecer da direção artística.`
  };

  await updateDoc(docRef, {
    pedagogicalFeedback: devolutiva,
    status: newOverallStatus,
    currentStepIndex: getStageStepIndex(newOverallStatus),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

export const saveArtisticDevolutiva = async (
  proposalId: string,
  status: EvaluationStatus,
  comment: string,
  user: { uid: string; name: string },
  currentPedagogicalStatus?: EvaluationStatus
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const devolutiva: StageProductionDevolutiva = {
    status,
    comment: comment || "",
    evaluatedByUid: user.uid,
    evaluatedByName: user.name,
    evaluatedAt: new Date().toISOString()
  };

  // Gatilho: Direções pedagógica e artística disponibilizaram o parecer sobre o formulário:
  // Status: 3) Resultado de análise disponível
  const bothEvaluated = (status === "APROVADO" || status === "PRECISA DE RETIFICAÇÕES") &&
    (currentPedagogicalStatus === "APROVADO" || currentPedagogicalStatus === "PRECISA DE RETIFICAÇÕES");

  let newOverallStatus: StageProductionStatus = bothEvaluated ? "resultado_analise_disponivel" : "formulario_em_analise";

  const historyEntry: StageStatusHistoryEntry = {
    status: newOverallStatus,
    statusLabel: bothEvaluated ? "3) Resultado de análise disponível" : `Devolutiva Artística: ${status}`,
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: bothEvaluated 
      ? `Direções pedagógica e artística emitiram parecer. Parecer Artístico: ${status}. Status 3: Resultado de análise disponível.`
      : `Devolutiva artística registrada (${status}). Aguardando parecer da direção pedagógica.`
  };

  await updateDoc(docRef, {
    artisticFeedback: devolutiva,
    status: newOverallStatus,
    currentStepIndex: getStageStepIndex(newOverallStatus),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

// Transição do Status 3 (Resultado disponível) para 4 (Em retificação) ou 5 (Em planejamento)
export const advanceToRectificationOrPlanning = async (
  proposalId: string,
  targetStatus: "em_retificacao" | "em_planejamento",
  user: { uid: string; name: string },
  notes?: string
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const statusLabel = targetStatus === "em_retificacao" ? "4) Em retificação" : "5) Em planejamento";
  const defaultNotes = targetStatus === "em_retificacao"
    ? "Resultado da análise indicou 'Precisa de retificações'. Status passou para 4) Em retificação."
    : "Resultado da análise foi 'Aprovado'! Status avançou para 5) Em planejamento.";

  const historyEntry: StageStatusHistoryEntry = {
    status: targetStatus,
    statusLabel,
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: notes || defaultNotes
  };

  await updateDoc(docRef, {
    status: targetStatus,
    currentStepIndex: getStageStepIndex(targetStatus),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

// Salvar Necessidades Técnicas de Iluminação, Som e Vídeo pelo Professor na Etapa 5 (Em planejamento do processo)
export const saveStageProductionTechPlanning = async (
  proposalId: string,
  techItems: ProductionNeedItem[],
  techNotes: string,
  user: { uid: string; name: string }
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const historyEntry: StageStatusHistoryEntry = {
    status: "em_planejamento",
    statusLabel: "Necessidades Técnicas Salvas (Professor)",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: `Professor preencheu/atualizou as necessidades de Iluminação, Som e Vídeo (${techItems.length} itens na Etapa 5: Em planejamento do processo).`
  };

  await updateDoc(docRef, {
    techItems,
    techNotes: techNotes || "",
    techSubmittedAt: new Date().toISOString(),
    techSubmittedByUid: user.uid,
    techSubmittedByName: user.name,
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

// Submissão/Salvamento de Projetos Técnicos pela Direção de Arte (Etapa 5)
export const submitArtDirectionProjects = async (
  proposalId: string,
  data: {
    proposalText: string;
    scenographyPdf?: TechnicalDocumentAttachment | null;
    costumePdf?: TechnicalDocumentAttachment | null;
    lightingPdf?: TechnicalDocumentAttachment | null;
    projectsPdfs?: TechnicalDocumentAttachment[];
  },
  user: { uid: string; name: string },
  advanceToCompras: boolean = true
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const nextStatus: StageProductionStatus = advanceToCompras ? "em_processo_de_compras" : "em_planejamento";

  const historyEntry: StageStatusHistoryEntry = {
    status: nextStatus,
    statusLabel: advanceToCompras ? "6) Em processo de compras" : "Projetos Técnicos Salvos (Direção de Arte)",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: advanceToCompras
      ? `Gatilho: Direção de arte submeteu a proposta conceitual e projetos técnicos obrigatórios em PDF. Status avançou para 6) Em processo de compras.`
      : `Direção de arte salvou os projetos técnicos em PDF e proposta conceitual na Etapa 5 (Em planejamento do processo).`
  };

  const payload: any = {
    artDirectionProposalText: data.proposalText || "",
    artDirectionProjectsPdfs: data.projectsPdfs || [],
    artDirectionSubmittedAt: new Date().toISOString(),
    artDirectionSubmittedByUid: user.uid,
    artDirectionSubmittedByName: user.name,
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  };

  if (data.scenographyPdf !== undefined) payload.scenographyPdf = data.scenographyPdf;
  if (data.costumePdf !== undefined) payload.costumePdf = data.costumePdf;
  if (data.lightingPdf !== undefined) payload.lightingPdf = data.lightingPdf;

  if (advanceToCompras) {
    payload.status = nextStatus;
    payload.currentStepIndex = getStageStepIndex(nextStatus);
  }

  await updateDoc(docRef, payload);
};

// Salvar / Anexar Planilha de Compras (Status 6)
export const uploadPurchasesSpreadsheet = async (
  proposalId: string,
  spreadsheet: TechnicalDocumentAttachment,
  notes?: string,
  user?: { uid: string; name: string }
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const historyEntry: StageStatusHistoryEntry = {
    status: "em_processo_de_compras",
    statusLabel: "Planilha de Compras Anexada",
    updatedAt: new Date().toISOString(),
    updatedByUid: user?.uid || "",
    updatedByName: user?.name || "Gestão",
    notes: `Planilha de compras '${spreadsheet.name}' anexada com sucesso.`
  };

  await updateDoc(docRef, {
    purchasesSpreadsheetAttachment: spreadsheet,
    purchasesSpreadsheetNotes: notes || "",
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

// Finalizar Processo de Compras pelo Gestor (Status 6 -> Status 7)
export const finalizePurchasesProcess = async (
  proposalId: string,
  user: { uid: string; name: string },
  notes?: string
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const nextStatus: StageProductionStatus = "em_processo_de_entrega_parcial";

  const historyEntry: StageStatusHistoryEntry = {
    status: nextStatus,
    statusLabel: "7) Em processo de entrega parcial",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: notes || "Gatilho: Gestor informou que o processo de compras foi finalizado. Status avançou para 7) Em processo de entrega parcial."
  };

  await updateDoc(docRef, {
    status: nextStatus,
    purchasesCompletedAt: new Date().toISOString(),
    purchasesCompletedByUid: user.uid,
    purchasesCompletedByName: user.name,
    currentStepIndex: getStageStepIndex(nextStatus),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

// Concluir Processo de Entrega Parcial pelo Gestor (Status 7 -> Status 8)
export const finalizePartialDeliveryProcess = async (
  proposalId: string,
  user: { uid: string; name: string },
  notes?: string
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const nextStatus: StageProductionStatus = "em_processo_de_entrega_final";

  const historyEntry: StageStatusHistoryEntry = {
    status: nextStatus,
    statusLabel: "8) Em processo de entrega final",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: notes || "Gatilho: Gestor concluiu o processo de entrega parcial. Status avançou para 8) Em processo de entrega final."
  };

  await updateDoc(docRef, {
    status: nextStatus,
    partialDeliveryCompletedAt: new Date().toISOString(),
    partialDeliveryCompletedByUid: user.uid,
    partialDeliveryCompletedByName: user.name,
    partialDeliveryNotes: notes || "",
    currentStepIndex: getStageStepIndex(nextStatus),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

// Concluir Processo de Entrega Total pelo Gestor (Status 8 -> Status 9)
export const finalizeTotalDeliveryProcess = async (
  proposalId: string,
  user: { uid: string; name: string },
  notes?: string
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const nextStatus: StageProductionStatus = "em_apresentacao";

  const historyEntry: StageStatusHistoryEntry = {
    status: nextStatus,
    statusLabel: "9) Em apresentação",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: notes || "Gatilho: Gestor concluiu o processo de entrega total. Status avançou para 9) Em apresentação."
  };

  await updateDoc(docRef, {
    status: nextStatus,
    finalDeliveryCompletedAt: new Date().toISOString(),
    finalDeliveryCompletedByUid: user.uid,
    finalDeliveryCompletedByName: user.name,
    finalDeliveryNotes: notes || "",
    currentStepIndex: getStageStepIndex(nextStatus),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

// Concluir Apresentação pelo Gestor (Status 9 -> Status 10)
export const finalizePresentationProcess = async (
  proposalId: string,
  user: { uid: string; name: string },
  notes?: string
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, proposalId);
  const nextStatus: StageProductionStatus = "apresentacao_concluida";

  const historyEntry: StageStatusHistoryEntry = {
    status: nextStatus,
    statusLabel: "10) Apresentação concluída",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: notes || "Gatilho: Gestor clicou no botão 'Apresentação concluída'. Documento finalizado no Status 10: Apresentação concluída."
  };

  await updateDoc(docRef, {
    status: nextStatus,
    presentationCompletedAt: new Date().toISOString(),
    presentationCompletedByUid: user.uid,
    presentationCompletedByName: user.name,
    presentationCompletedNotes: notes || "",
    currentStepIndex: getStageStepIndex(nextStatus),
    statusHistory: arrayUnion(historyEntry),
    updatedAt: serverTimestamp()
  });
};

export const createStageProductionProposal = async (
  proposal: Omit<StageProductionProposal, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  const initialStatus = proposal.status || "em_analise_pedagogica";
  const initialHistory: StageStatusHistoryEntry[] = [
    {
      status: initialStatus,
      statusLabel: getStageLabel(initialStatus),
      updatedAt: new Date().toISOString(),
      updatedByUid: proposal.proponentUserId || "",
      updatedByName: proposal.proponentName || "Proponente",
      notes: "Proposta submetida e enviada para Análise Pedagógica."
    }
  ];

  const docRef = await addDoc(collection(db, STAGE_PRODUCTIONS_COLLECTION), {
    ...proposal,
    status: initialStatus,
    currentStepIndex: getStageStepIndex(initialStatus),
    statusHistory: initialHistory,
    termsAcceptedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateStageProductionStatus = async (
  id: string,
  status: StageProductionProposal["status"],
  feedback?: string,
  reviewerUid?: string,
  reviewerName?: string
) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, id);
  const newHistoryEntry: StageStatusHistoryEntry = {
    status: status || "em_analise_pedagogica",
    statusLabel: getStageLabel(status),
    updatedAt: new Date().toISOString(),
    updatedByUid: reviewerUid || "",
    updatedByName: reviewerName || "Gestão",
    notes: feedback || ""
  };

  await updateDoc(docRef, {
    status,
    currentStepIndex: getStageStepIndex(status),
    feedback: feedback || "",
    reviewedByUid: reviewerUid || "",
    reviewedByName: reviewerName || "",
    reviewedAt: serverTimestamp(),
    statusHistory: arrayUnion(newHistoryEntry),
    updatedAt: serverTimestamp()
  });
};

export const deleteStageProductionProposal = async (id: string) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};
