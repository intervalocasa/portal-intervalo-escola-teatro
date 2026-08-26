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
import { StageProductionProposal, StageProductionStatus, StageStatusHistoryEntry } from "../types";

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
    id: "em_analise_pedagogica",
    stepNumber: 1,
    label: "Proposta em análise pedagógica",
    shortLabel: "1. Análise Pedagógica",
    description: "Avaliação da proposta pedagógica, alinhamento didático e dimensionamento de elenco.",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    ringColor: "ring-amber-400 text-amber-600 bg-amber-50",
    iconName: "GraduationCap"
  },
  {
    id: "analise_pedagogica_concluida",
    stepNumber: 2,
    label: "Análise Pedagógica concluída",
    shortLabel: "2. Pedagógica Concluída",
    description: "Alinhamento pedagógico e perfil de elenco validados pela coordenação de ensino.",
    badgeColor: "bg-teal-100 text-teal-900 border-teal-300",
    ringColor: "ring-teal-400 text-teal-600 bg-teal-50",
    iconName: "CheckCircle"
  },
  {
    id: "em_analise_artistica",
    stepNumber: 3,
    label: "Proposta em Análise Artística",
    shortLabel: "3. Análise Artística",
    description: "Curadoria artística, dramaturgia, conceito cênico e viabilidade poética da montagem.",
    badgeColor: "bg-purple-100 text-purple-900 border-purple-300",
    ringColor: "ring-purple-400 text-purple-600 bg-purple-50",
    iconName: "Palette"
  },
  {
    id: "analise_artistica_concluida",
    stepNumber: 4,
    label: "Análise Artística Concluída",
    shortLabel: "4. Artística Concluída",
    description: "Conceito cênico, estética e dramaturgia aprovados pela direção artística.",
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
    ringColor: "ring-indigo-400 text-indigo-600 bg-indigo-50",
    iconName: "Sparkles"
  },
  {
    id: "em_analise_executiva",
    stepNumber: 5,
    label: "Em análise Executiva",
    shortLabel: "5. Análise Executiva",
    description: "Viabilidade orçamentária, análise dos projetos técnicos em PDF, pauta e cronograma.",
    badgeColor: "bg-blue-100 text-blue-900 border-blue-300",
    ringColor: "ring-blue-400 text-blue-600 bg-blue-50",
    iconName: "Briefcase"
  },
  {
    id: "projeto_em_execucao",
    stepNumber: 6,
    label: "Projeto em Execução",
    shortLabel: "6. Em Execução",
    description: "Espetáculo aprovado em todas as instâncias! Em fase ativa de ensaios e montagem.",
    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    ringColor: "ring-emerald-400 text-emerald-600 bg-emerald-50",
    iconName: "Theater"
  }
];

export const getStageStepIndex = (status?: StageProductionStatus): number => {
  if (!status) return 0;
  if (status === "pendente") return 0;
  if (status === "em_analise") return 2;
  if (status === "aprovada") return 5;
  const idx = STAGE_EVOLUTION_STEPS.findIndex(s => s.id === status);
  return idx >= 0 ? idx : 0;
};

export const getStageStepInfo = (status?: StageProductionStatus): StageEvolutionStep => {
  const normalizedStatus = 
    status === "pendente" ? "em_analise_pedagogica" :
    status === "em_analise" ? "em_analise_artistica" :
    status === "aprovada" ? "projeto_em_execucao" :
    status || "em_analise_pedagogica";

  const found = STAGE_EVOLUTION_STEPS.find(s => s.id === normalizedStatus);
  return found || STAGE_EVOLUTION_STEPS[0];
};

export const getStageLabel = (status?: StageProductionStatus): string => {
  if (status === "ajustes_solicitados") return "Ajustes Solicitados";
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
