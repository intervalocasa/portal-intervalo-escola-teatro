/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  where 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { StageProductionProposal } from "../types";

export const STAGE_PRODUCTIONS_COLLECTION = "montagens_apresentacoes";

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
  if (!proposal.synopsis?.content || !proposal.synopsis.content.trim()) {
    errors.synopsis = "Sinopse da obra é obrigatória.";
  }
  if (proposal.synopsis?.priority === "Indispensável" && (!proposal.synopsis.indispensableReason || !proposal.synopsis.indispensableReason.trim())) {
    errors.synopsisReason = "Informe o motivo da indispensabilidade para a sinopse/concepção da obra.";
  }

  // Seção 3: Proposta Pedagógica e Elenco
  if (!proposal.pedagogicalProposal?.content || !proposal.pedagogicalProposal.content.trim()) {
    errors.pedagogicalProposal = "Proposta didática/pedagógica é obrigatória.";
  }
  if (proposal.pedagogicalProposal?.priority === "Indispensável" && (!proposal.pedagogicalProposal.indispensableReason || !proposal.pedagogicalProposal.indispensableReason.trim())) {
    errors.pedagogicalProposalReason = "Informe o motivo da indispensabilidade para a proposta didática.";
  }

  if (!proposal.castProfile?.content || !proposal.castProfile.content.trim()) {
    errors.castProfile = "Previsão de elenco (quantidade, faixa etária e perfil) é obrigatória.";
  }
  if (proposal.castProfile?.priority === "Indispensável" && (!proposal.castProfile.indispensableReason || !proposal.castProfile.indispensableReason.trim())) {
    errors.castProfileReason = "Informe o motivo da indispensabilidade para o elenco previsto.";
  }

  // Seção 4: Necessidades de Produção
  if (!proposal.scenographyProps?.content || !proposal.scenographyProps.content.trim()) {
    errors.scenographyProps = "Proposta de cenografia e adereços é obrigatória.";
  }
  if (proposal.scenographyProps?.priority === "Indispensável" && (!proposal.scenographyProps.indispensableReason || !proposal.scenographyProps.indispensableReason.trim())) {
    errors.scenographyPropsReason = "Informe o motivo da indispensabilidade para cenografia e adereços.";
  }

  if (!proposal.techNeeds?.content || !proposal.techNeeds.content.trim()) {
    errors.techNeeds = "Necessidades técnicas de iluminação, som e vídeo são obrigatórias.";
  }
  if (proposal.techNeeds?.priority === "Indispensável" && (!proposal.techNeeds.indispensableReason || !proposal.techNeeds.indispensableReason.trim())) {
    errors.techNeedsReason = "Informe o motivo da indispensabilidade para as necessidades técnicas.";
  }

  if (!proposal.otherNeeds?.content || !proposal.otherNeeds.content.trim()) {
    errors.otherNeeds = "Outras necessidades (figurino, maquiagem, logística) são obrigatórias.";
  }
  if (proposal.otherNeeds?.priority === "Indispensável" && (!proposal.otherNeeds.indispensableReason || !proposal.otherNeeds.indispensableReason.trim())) {
    errors.otherNeedsReason = "Informe o motivo da indispensabilidade para figurino/maquiagem/logística.";
  }

  // Seção 5: Termo de Aceite
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
  const docRef = await addDoc(collection(db, STAGE_PRODUCTIONS_COLLECTION), {
    ...proposal,
    status: proposal.status || "pendente",
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
  await updateDoc(docRef, {
    status,
    feedback: feedback || "",
    reviewedByUid: reviewerUid || "",
    reviewedByName: reviewerName || "",
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const deleteStageProductionProposal = async (id: string) => {
  const docRef = doc(db, STAGE_PRODUCTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};
