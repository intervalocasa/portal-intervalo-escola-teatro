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
  StageProductionDevolutiva 
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
    id: "aguardando_preenchimento",
    stepNumber: 1,
    label: "Aguardando Preenchimento pelo Professor",
    shortLabel: "1. Preenchimento",
    description: "Formulário de montagem criado pela gestão. Aguardando o professor responsável preencher as informações da obra e elenco.",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
    ringColor: "ring-slate-400 text-slate-600 bg-slate-50",
    iconName: "FileEdit"
  },
  {
    id: "em_analise_pedagogica",
    stepNumber: 2,
    label: "Proposta em Análise Pedagógica",
    shortLabel: "2. Avaliação Pedagógica",
    description: "Avaliação pedagógica realizada pela Direção Pedagógica (alinhamento didático e dimensionamento de elenco).",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    ringColor: "ring-amber-400 text-amber-600 bg-amber-50",
    iconName: "GraduationCap"
  },
  {
    id: "em_analise_artistica",
    stepNumber: 3,
    label: "Proposta em Análise Artística",
    shortLabel: "3. Avaliação Artística",
    description: "Curadoria artística, dramaturgia, conceito cênico e viabilidade poética avaliada pelo Gestor.",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    ringColor: "ring-purple-400 text-purple-600 bg-purple-50",
    iconName: "Palette"
  },
  {
    id: "precisa_retificacoes",
    stepNumber: 4,
    label: "Precisa de Retificações",
    shortLabel: "4. Retificações",
    description: "Parecer emitido solicitando ajustes no formulário ou nos projetos técnicos.",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
    ringColor: "ring-rose-400 text-rose-600 bg-rose-50",
    iconName: "AlertCircle"
  },
  {
    id: "em_analise_executiva",
    stepNumber: 5,
    label: "Em Execução e Aquisições",
    shortLabel: "5. Execução Orçamentária",
    description: "Viabilidade orçamentária, período de compras, confecções e ensaios técnicos.",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    ringColor: "ring-blue-400 text-blue-600 bg-blue-50",
    iconName: "Briefcase"
  },
  {
    id: "projeto_em_execucao",
    stepNumber: 6,
    label: "Aprovado / Apresentação Agendada",
    shortLabel: "6. Aprovado",
    description: "Espetáculo aprovado nas instâncias pedagógica e artística. Pronto para apresentações!",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    ringColor: "ring-emerald-400 text-emerald-600 bg-emerald-50",
    iconName: "Theater"
  }
];

export const getStageStepIndex = (status?: StageProductionStatus): number => {
  if (!status) return 0;
  if (status === "aguardando_preenchimento" || status === "pendente") return 0;
  if (status === "em_analise_pedagogica") return 1;
  if (status === "em_analise_artistica" || status === "em_analise") return 2;
  if (status === "precisa_retificacoes" || status === "ajustes_solicitados") return 3;
  if (status === "em_analise_executiva") return 4;
  if (status === "projeto_em_execucao" || status === "aprovada" || status === "aprovado") return 5;
  const idx = STAGE_EVOLUTION_STEPS.findIndex(s => s.id === status);
  return idx >= 0 ? idx : 0;
};

export const getStageStepInfo = (status?: StageProductionStatus): StageEvolutionStep => {
  const normalizedStatus: StageProductionStatus = 
    status === "pendente" ? "aguardando_preenchimento" :
    status === "ajustes_solicitados" ? "precisa_retificacoes" :
    status === "em_analise" ? "em_analise_pedagogica" :
    status === "aprovada" || status === "aprovado" ? "projeto_em_execucao" :
    status || "aguardando_preenchimento";

  const found = STAGE_EVOLUTION_STEPS.find(s => s.id === normalizedStatus);
  return found || STAGE_EVOLUTION_STEPS[0];
};

export const getStageLabel = (status?: StageProductionStatus): string => {
  if (status === "aguardando_preenchimento") return "Aguardando Preenchimento";
  if (status === "precisa_retificacoes" || status === "ajustes_solicitados") return "Precisa de Retificações";
  if (status === "em_analise") return "Em Análise Pedagógica e Artística";
  if (status === "aprovada" || status === "aprovado") return "Aprovado";
  if (status === "rejeitada") return "Não Aprovada";
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

  // Iluminação, Som e Vídeo
  if (!proposal.techItems || proposal.techItems.length === 0) {
    errors.techItems = "Adicione ao menos um item de necessidade para Iluminação, Som e Vídeo.";
  } else {
    proposal.techItems.forEach((item, idx) => {
      if (!item.item || !item.item.trim()) {
        errors[`techItem_${idx}`] = `Informe a descrição do item #${idx + 1} de Iluminação/Som/Vídeo.`;
      }
      if (item.priority === "Indispensável" && (!item.indispensableReason || !item.indispensableReason.trim())) {
        errors[`techReason_${idx}`] = `Justifique a indispensabilidade do item "${item.item || `#${idx + 1}`}".`;
      }
    });
  }

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

  // Seção 5: Envio Obrigatório dos PDFs Técnicos
  if (!proposal.scenographyPdf || !proposal.scenographyPdf.dataUrl) {
    errors.scenographyPdf = "O envio do arquivo PDF do Projeto de Cenografia é obrigatório.";
  }
  if (!proposal.costumePdf || !proposal.costumePdf.dataUrl) {
    errors.costumePdf = "O envio do arquivo PDF do Projeto de Figurino é obrigatório.";
  }
  if (!proposal.lightingPdf || !proposal.lightingPdf.dataUrl) {
    errors.lightingPdf = "O envio do arquivo PDF do Projeto de Iluminação é obrigatório.";
  }

  // Seção 6: Termo de Aceite
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
  const initialStatus: StageProductionStatus = "aguardando_preenchimento";
  const initialHistory: StageStatusHistoryEntry[] = [
    {
      status: initialStatus,
      statusLabel: "Formulário Criado pela Gestão",
      updatedAt: new Date().toISOString(),
      updatedByUid: payload.createdByGestorId,
      updatedByName: payload.createdByGestorName,
      notes: `Formulário de montagem/apresentação criado para a turma ${payload.className}. Prazo de submissão do professor: ${payload.submissionDeadline}.`
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
  const isRectification = proposalData.status === "precisa_retificacoes";
  const nextStatus: StageProductionStatus = "em_analise";

  const historyEntry: StageStatusHistoryEntry = {
    status: nextStatus,
    statusLabel: isRectification ? "Retificação Enviada pelo Professor" : "Formulário Submetido pelo Professor",
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: isRectification
      ? "Professor reenviou o formulário corrigido após apontamentos da coordenação."
      : "Professor finalizou o preenchimento do formulário da apresentação. Aguardando avaliação pedagógica e artística."
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

  // Determine overall status
  let newOverallStatus: StageProductionStatus = "em_analise";
  if (status === "PRECISA DE RETIFICAÇÕES" || currentArtisticStatus === "PRECISA DE RETIFICAÇÕES") {
    newOverallStatus = "precisa_retificacoes";
  } else if (status === "APROVADO" && currentArtisticStatus === "APROVADO") {
    newOverallStatus = "aprovada";
  }

  const historyEntry: StageStatusHistoryEntry = {
    status: newOverallStatus,
    statusLabel: `Devolutiva Pedagógica: ${status}`,
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: comment ? `[Direção Pedagógica] ${comment}` : `Parecer pedagógico: ${status}`
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

  // Determine overall status
  let newOverallStatus: StageProductionStatus = "em_analise";
  if (status === "PRECISA DE RETIFICAÇÕES" || currentPedagogicalStatus === "PRECISA DE RETIFICAÇÕES") {
    newOverallStatus = "precisa_retificacoes";
  } else if (status === "APROVADO" && currentPedagogicalStatus === "APROVADO") {
    newOverallStatus = "aprovada";
  }

  const historyEntry: StageStatusHistoryEntry = {
    status: newOverallStatus,
    statusLabel: `Devolutiva Artística: ${status}`,
    updatedAt: new Date().toISOString(),
    updatedByUid: user.uid,
    updatedByName: user.name,
    notes: comment ? `[Gestor / Curadoria Artística] ${comment}` : `Parecer artístico: ${status}`
  };

  await updateDoc(docRef, {
    artisticFeedback: devolutiva,
    status: newOverallStatus,
    currentStepIndex: getStageStepIndex(newOverallStatus),
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
