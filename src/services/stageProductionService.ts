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
