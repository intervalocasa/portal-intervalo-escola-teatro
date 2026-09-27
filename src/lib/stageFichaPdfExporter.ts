/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { StageProductionProposal, ProductionNeedItem } from "../types";
import { STAGE_EVOLUTION_STEPS, normalizeStageStatus } from "../services/stageProductionService";

/**
 * Sanitiza textos para compatibilidade com a codificação WinAnsi / Latin-1 do jsPDF
 */
function sanitizeText(str?: string | number | null): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\x00-\xFF]/g, (ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 128 && code <= 255) return ch;
      return "";
    })
    .trim();
}

function formatDateBr(dateStr?: any): string {
  if (!dateStr) return "A definir";
  if (typeof dateStr === "object" && dateStr.toDate) {
    try {
      return dateStr.toDate().toLocaleDateString("pt-BR");
    } catch {
      return "A definir";
    }
  }
  const s = String(dateStr).trim();
  if (!s) return "A definir";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try {
      return new Date(s).toLocaleDateString("pt-BR");
    } catch {
      const [y, m, d] = s.split("T")[0].split("-");
      return `${d}/${m}/${y}`;
    }
  }
  return sanitizeText(s);
}

function formatDateTimeBr(dateStr?: any): string {
  if (!dateStr) return "-";
  if (typeof dateStr === "object" && dateStr.toDate) {
    try {
      const d = dateStr.toDate();
      return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "-";
    }
  }
  const s = String(dateStr).trim();
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
  } catch {
    // ignore
  }
  return sanitizeText(s);
}

function formatBRL(val?: number | null): string {
  const num = Number(val || 0);
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getStageFullLabel(status?: string): string {
  if (!status) return "1) Formulário em preenchimento";
  const normalized = normalizeStageStatus(status as any);
  const found = STAGE_EVOLUTION_STEPS.find(s => s.id === normalized);
  return found ? `${found.stepNumber}) ${found.label}` : "1) Formulário em preenchimento";
}

/**
 * Gera o PDF A4 oficial da Ficha de Inscrição da Montagem sem erros de diagramação,
 * sem supressões de texto e sem repetições.
 */
export function generateStageFichaPDF(proposal: StageProductionProposal): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Cores institucionais
  const primaryTeal: [number, number, number] = [1, 106, 134]; // #016a86
  const deepPurple: [number, number, number] = [76, 29, 149]; // #4c1d95
  const accentOrange: [number, number, number] = [255, 124, 0]; // #ff7c00
  const darkSlate: [number, number, number] = [15, 23, 42]; // #0f172a
  const bodySlate: [number, number, number] = [51, 65, 85]; // #334155
  const mutedSlate: [number, number, number] = [100, 116, 139]; // #64748b
  const lightBg: [number, number, number] = [248, 250, 252]; // #f8fafc

  let currentY = 14;

  // Helper para verificar espaço disponível na página antes de desenhar um bloco
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      drawContinuationHeader();
      currentY = 22;
    }
  };

  // Cabeçalho compacto para páginas seguintes (evita repetição do banner inteiro)
  const drawContinuationHeader = () => {
    doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
    doc.rect(0, 0, pageWidth, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
    const titleShort = sanitizeText(proposal.title || "Proposta de Montagem").substring(0, 65);
    doc.text(`FICHA DE INSCRIÇÃO DA MONTAGEM • ${titleShort}`, margin, 10);
    if (proposal.id) {
      doc.text(`Protocolo: ${sanitizeText(proposal.id)}`, pageWidth - margin, 10, { align: "right" });
    }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 13, pageWidth - margin, 13);
  };

  // Helper para desenhar título de seção numerada
  const drawSectionHeader = (numberStr: string, title: string, color: [number, number, number] = primaryTeal) => {
    ensureSpace(14);
    currentY += 3;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(margin, currentY, contentWidth, 7.5, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizeText(`${numberStr}. ${title.toUpperCase()}`), margin + 3.5, currentY + 5.1);
    currentY += 10.5;
  };

  // Helper para desenhar blocos de texto longos com paginação automática linha a linha (sem supressão!)
  const drawMultilineTextBox = (label: string, textValue?: string | null, emptyFallback = "Não informado.") => {
    const rawText = sanitizeText(textValue) || emptyFallback;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines: string[] = doc.splitTextToSize(rawText, contentWidth - 8);

    ensureSpace(14);

    // Rótulo do bloco
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
    doc.text(sanitizeText(label.toUpperCase()), margin + 1, currentY + 3.5);
    currentY += 5.5;

    // Renderizar linhas respeitando quebras de página para nunca cortar texto longo
    const lineHeight = 4.3;
    let idx = 0;

    while (idx < lines.length) {
      const availableHeight = pageHeight - 18 - currentY;
      const maxLinesInPage = Math.max(1, Math.floor((availableHeight - 5) / lineHeight));
      const chunk = lines.slice(idx, idx + maxLinesInPage);
      const boxHeight = chunk.length * lineHeight + 5;

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);

      let lineY = currentY + 4.2;
      chunk.forEach((l) => {
        doc.text(l, margin + 4, lineY);
        lineY += lineHeight;
      });

      currentY += boxHeight + 3;
      idx += chunk.length;

      if (idx < lines.length) {
        doc.addPage();
        drawContinuationHeader();
        currentY = 22;
      }
    }
  };

  // ============================================================================
  // 1. BANNER DE CABEÇALHO DA PRIMEIRA PÁGINA
  // ============================================================================
  doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFillColor(accentOrange[0], accentOrange[1], accentOrange[2]);
  doc.rect(0, 28, pageWidth, 1.8, "F");

  // Logo badge à esquerda
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 4.5, 19, 19, 2.5, 2.5, "F");
  doc.setFillColor(1, 106, 134);
  doc.rect(margin + 7.2, 7.2, 4.0, 4.0, "F");
  doc.setFillColor(255, 188, 0);
  doc.rect(margin + 7.5, 7.5, 2.7, 2.7, "F");
  doc.setFillColor(251, 211, 182);
  doc.rect(margin + 6.2, 7.5, 1.0, 2.5, "F");
  doc.setFillColor(1, 106, 134);
  doc.rect(margin + 6.3, 12.2, 4.2, 7.5, "F");
  doc.setFillColor(255, 124, 0);
  doc.rect(margin + 7.2, 11.7, 3.0, 9.0, "F");
  doc.setFillColor(251, 211, 182);
  doc.rect(margin + 10.5, 11.7, 0.8, 9.0, "F");

  // Textos do cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.text("FICHA DE INSCRIÇÃO DA MONTAGEM", margin + 23, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("INTERVALO ESCOLA DE TEATRO • CURADORIA E PRODUÇÃO EXECUTIVA", margin + 23, 17.5);

  const now = new Date();
  const emittedStr = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  doc.setFontSize(7.5);
  doc.text(
    sanitizeText(`Protocolo: ${proposal.id || "N/D"}   |   Emissão: ${emittedStr}`),
    margin + 23,
    23
  );

  currentY = 34;

  // ============================================================================
  // FAIXA DE STATUS ATUAL E TURMA
  // ============================================================================
  doc.setFillColor(243, 232, 255); // Roxo claro
  doc.setDrawColor(192, 132, 252);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(deepPurple[0], deepPurple[1], deepPurple[2]);
  doc.text("ETAPA ATUAL:", margin + 4, currentY + 5);
  doc.setFontSize(9);
  doc.text(sanitizeText(getStageFullLabel(proposal.status)), margin + 27, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(
    sanitizeText(`Turma Vinculada: ${proposal.className || "Não informada"}`),
    margin + 4,
    currentY + 9.5
  );

  if (proposal.presentationDates || proposal.presentationDate) {
    doc.text(
      sanitizeText(`Apresentação: ${proposal.presentationDates || formatDateBr(proposal.presentationDate)}`),
      pageWidth - margin - 4,
      currentY + 9.5,
      { align: "right" }
    );
  }

  currentY += 15;

  // ============================================================================
  // SEÇÃO 1: IDENTIFICAÇÃO DA OBRA E DADOS DO PROPONENTE
  // ============================================================================
  drawSectionHeader("1", "Identificação da Obra e Dados do Proponente");

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: bodySlate,
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold", fillColor: [241, 245, 249], textColor: darkSlate },
      1: { cellWidth: 53 },
      2: { cellWidth: 38, fontStyle: "bold", fillColor: [241, 245, 249], textColor: darkSlate },
      3: { cellWidth: 53 }
    },
    body: [
      [
        "Título da Montagem",
        sanitizeText(proposal.title || "Ainda não preenchido"),
        "Gênero / Formato",
        sanitizeText(proposal.genre || "Não informado")
      ],
      [
        "Proponente",
        sanitizeText(proposal.proponentName || "Não informado"),
        "Função / Cargo",
        sanitizeText(proposal.proponentRole || "Professor")
      ],
      [
        "E-mail",
        sanitizeText(proposal.proponentEmail || "Não informado"),
        "Telefone / WhatsApp",
        sanitizeText(proposal.proponentPhone || "Não informado")
      ]
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // Sinopse completa
  drawMultilineTextBox("Sinopse da Obra", proposal.synopsis, "Sinopse ainda não informada pelo professor.");

  // ============================================================================
  // SEÇÃO 2: DIRETRIZES, ORÇAMENTO E CRONOGRAMA OFICIAL DA GESTÃO
  // ============================================================================
  drawSectionHeader("2", "Diretrizes Oficiais, Orçamento e Cronograma da Gestão", deepPurple);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [["Compras, Confecções e Aquisições", "Mão-de-Obra", "Orçamento Total Autorizado"]],
    body: [[
      sanitizeText(formatBRL(proposal.budgetPurchasesAcquisitions)),
      sanitizeText(formatBRL(proposal.budgetLabor)),
      sanitizeText(formatBRL(proposal.budgetTotal))
    ]],
    headStyles: {
      fillColor: [243, 232, 255],
      textColor: deepPurple,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    bodyStyles: {
      fontSize: 9.5,
      fontStyle: "bold",
      halign: "center",
      textColor: darkSlate,
      cellPadding: 3,
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 3;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.3,
      textColor: bodySlate,
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: "bold", fillColor: [248, 250, 252], textColor: darkSlate },
      1: { cellWidth: 43 },
      2: { cellWidth: 48, fontStyle: "bold", fillColor: [248, 250, 252], textColor: darkSlate },
      3: { cellWidth: 43 }
    },
    body: [
      [
        "Prazo de Submissão (Prof.)",
        formatDateBr(proposal.submissionDeadline),
        "Devolutiva da Avaliação",
        formatDateBr(proposal.pedagogicalArtisticFeedbackDate)
      ],
      [
        "Prazo de Retificação",
        formatDateBr(proposal.rectificationDeadline),
        "Aprovação Final da Ficha",
        formatDateBr(proposal.finalApprovalDate)
      ],
      [
        "Reunião de Planejamento",
        formatDateBr(proposal.planningMeetingDate),
        "Execução de Compras",
        sanitizeText(proposal.executionPeriod || "A definir")
      ],
      [
        "Entrega Parcial (Objetos)",
        formatDateBr(proposal.partialDeliveryDate),
        "Entrega Final de Itens",
        formatDateBr(proposal.finalDeliveryDate)
      ],
      [
        "Datas de Apresentação",
        {
          content: sanitizeText(proposal.presentationDates || formatDateBr(proposal.presentationDate)),
          colSpan: 3,
          styles: { fontStyle: "bold", textColor: deepPurple }
        }
      ]
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // ============================================================================
  // SEÇÃO 3: PROPOSTA PEDAGÓGICA E PERFIL DO ELENCO
  // ============================================================================
  drawSectionHeader("3", "Proposta Pedagógica e Perfil do Elenco");

  drawMultilineTextBox(
    "Proposta Didática / Pedagógica",
    proposal.pedagogicalProposal,
    "Proposta pedagógica ainda não preenchida."
  );

  drawMultilineTextBox(
    "Elenco Previsto (Quantidade e Perfil)",
    proposal.castProfile,
    "Perfil do elenco ainda não preenchido."
  );

  // ============================================================================
  // SEÇÃO 4: PARECERES DA AVALIAÇÃO PEDAGÓGICA E ARTÍSTICA
  // ============================================================================
  drawSectionHeader("4", "Pareceres de Avaliação (Devolutiva Pedagógica e Artística)");

  const pedStatus = proposal.pedagogicalFeedback?.status || "PENDENTE";
  const pedStatusLabel = pedStatus === "PENDENTE" ? "Aguardando Avaliação" : pedStatus;
  const pedComment = sanitizeText(proposal.pedagogicalFeedback?.comment) || "Sem observações registradas.";
  const pedReviewer = proposal.pedagogicalFeedback?.evaluatedByName
    ? `${sanitizeText(proposal.pedagogicalFeedback.evaluatedByName)} (${formatDateTimeBr(proposal.pedagogicalFeedback.evaluatedAt)})`
    : "-";

  const artStatus = proposal.artisticFeedback?.status || "PENDENTE";
  const artStatusLabel = artStatus === "PENDENTE" ? "Aguardando Avaliação" : artStatus;
  const artComment = sanitizeText(proposal.artisticFeedback?.comment) || "Sem observações registradas.";
  const artReviewer = proposal.artisticFeedback?.evaluatedByName
    ? `${sanitizeText(proposal.artisticFeedback.evaluatedByName)} (${formatDateTimeBr(proposal.artisticFeedback.evaluatedAt)})`
    : "-";

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [["Instância Avaliadora", "Status do Parecer", "Avaliador / Data", "Comentários e Orientações"]],
    body: [
      ["Direção Pedagógica", sanitizeText(pedStatusLabel), pedReviewer, pedComment],
      ["Direção Artística / Gestão", sanitizeText(artStatusLabel), artReviewer, artComment]
    ],
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8
    },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      textColor: bodySlate,
      lineColor: [203, 213, 225],
      lineWidth: 0.25,
      overflow: "linebreak"
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold", fillColor: [248, 250, 252] },
      1: { cellWidth: 32, fontStyle: "bold", halign: "center" },
      2: { cellWidth: 42 },
      3: { cellWidth: 72 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // ============================================================================
  // SEÇÃO 5: NECESSIDADES DE PRODUÇÃO DETALHADAS
  // ============================================================================
  drawSectionHeader("5", "Necessidades de Produção Detalhadas");

  const renderNeedCategoryTable = (
    categoryTitle: string,
    items?: ProductionNeedItem[],
    notes?: string,
    emptyMessage = "Nenhum item registrado nesta categoria."
  ) => {
    const validItems = (items || []).filter(i => i && i.item && i.item.trim().length > 0);
    ensureSpace(18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(
      sanitizeText(`${categoryTitle} (${validItems.length} item(ns))`),
      margin + 1,
      currentY + 3.5
    );
    currentY += 5.5;

    if (validItems.length === 0) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, contentWidth, 8, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
      doc.text(sanitizeText(emptyMessage), margin + 4, currentY + 5.2);
      currentY += 10.5;
    } else {
      const rows = validItems.map((it, idx) => [
        String(idx + 1),
        sanitizeText(it.item),
        sanitizeText(it.priority || "Desejável"),
        it.priority === "Indispensável"
          ? sanitizeText(it.indispensableReason || "Não informada")
          : "-"
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        theme: "striped",
        head: [["#", "Descrição do Item", "Prioridade", "Justificativa de Indispensabilidade"]],
        body: rows,
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8
        },
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 2.3,
          textColor: bodySlate,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          overflow: "linebreak"
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 74 },
          2: { cellWidth: 28, halign: "center", fontStyle: "bold" },
          3: { cellWidth: 70 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 2;
    }

    if (notes && notes.trim().length > 0) {
      drawMultilineTextBox(`Observações — ${categoryTitle}`, notes);
    } else {
      currentY += 2;
    }
  };

  renderNeedCategoryTable(
    "5.1. Cenografia e Adereços",
    proposal.scenographyItems,
    proposal.scenographyNotes
  );

  renderNeedCategoryTable(
    "5.2. Iluminação, Som e Vídeo (Necessidades Técnicas)",
    proposal.techItems,
    proposal.techNotes,
    "Detalhamento técnico a ser preenchido pelo Professor na Etapa 5 (Em planejamento do processo)."
  );

  renderNeedCategoryTable(
    "5.3. Outras Necessidades (Figurino, Maquiagem e Logística)",
    proposal.otherNeedsItems,
    proposal.otherNeedsNotes
  );

  // ============================================================================
  // SEÇÃO 6: PROJETOS TÉCNICOS ANEXADOS E EXECUÇÃO (ETAPAS 5 A 10)
  // ============================================================================
  drawSectionHeader("6", "Projetos Técnicos Anexados e Acompanhamento de Execução");

  const formatAttachmentStatus = (att?: { name: string; size?: number; uploadedAt?: string } | null) => {
    if (!att || !att.name) return "Aguardando envio na Etapa 5 (Direção de Arte)";
    const sizeStr = att.size ? ` (${formatFileSize(att.size)})` : "";
    const dateStr = att.uploadedAt ? ` - Enviado em ${formatDateTimeBr(att.uploadedAt)}` : "";
    return `Anexado: ${sanitizeText(att.name)}${sizeStr}${dateStr}`;
  };

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [["Documento / Etapa de Execução", "Situação / Arquivo Registrado"]],
    body: [
      ["Projeto de Cenografia (PDF)", formatAttachmentStatus(proposal.scenographyPdf)],
      ["Projeto de Figurino (PDF)", formatAttachmentStatus(proposal.costumePdf)],
      ["Projeto de Iluminação (PDF)", formatAttachmentStatus(proposal.lightingPdf)],
      [
        "Planilha de Compras (Etapa 6)",
        proposal.purchasesSpreadsheetAttachment?.name
          ? `Anexada: ${sanitizeText(proposal.purchasesSpreadsheetAttachment.name)}${proposal.purchasesCompletedAt ? ` (Concluído em ${formatDateTimeBr(proposal.purchasesCompletedAt)})` : ""}`
          : (proposal.purchasesCompletedAt ? `Concluído em ${formatDateTimeBr(proposal.purchasesCompletedAt)}` : "Pendente")
      ],
      [
        "Entrega Parcial (Etapa 7)",
        proposal.partialDeliveryCompletedAt
          ? `Concluída em ${formatDateTimeBr(proposal.partialDeliveryCompletedAt)}${proposal.partialDeliveryNotes ? ` — Obs: ${sanitizeText(proposal.partialDeliveryNotes)}` : ""}`
          : "Pendente"
      ],
      [
        "Entrega Final (Etapa 8)",
        proposal.finalDeliveryCompletedAt
          ? `Concluída em ${formatDateTimeBr(proposal.finalDeliveryCompletedAt)}${proposal.finalDeliveryNotes ? ` — Obs: ${sanitizeText(proposal.finalDeliveryNotes)}` : ""}`
          : "Pendente"
      ],
      [
        "Apresentação (Etapas 9/10)",
        proposal.presentationCompletedAt
          ? `Concluída em ${formatDateTimeBr(proposal.presentationCompletedAt)}${proposal.presentationCompletedNotes ? ` — Obs: ${sanitizeText(proposal.presentationCompletedNotes)}` : ""}`
          : "Pendente"
      ]
    ],
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8
    },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.4,
      textColor: bodySlate,
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: "bold", fillColor: [248, 250, 252], textColor: darkSlate },
      1: { cellWidth: 124 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  if (proposal.artDirectionProposalText && proposal.artDirectionProposalText.trim().length > 0) {
    drawMultilineTextBox("Memorial / Proposta da Direção de Arte", proposal.artDirectionProposalText);
  }

  // ============================================================================
  // SEÇÃO 7: HISTÓRICO DE ATUALIZAÇÃO DAS ETAPAS (SEM DUPLICAÇÕES)
  // ============================================================================
  if (proposal.statusHistory && proposal.statusHistory.length > 0) {
    drawSectionHeader("7", "Histórico de Evolução das Etapas");

    // Deduplicar registros consecutivos idênticos para evitar repetições no relatório
    const cleanHistory = proposal.statusHistory.filter((entry, idx, arr) => {
      if (idx === 0) return true;
      const prev = arr[idx - 1];
      return !(
        prev.status === entry.status &&
        (prev.notes || "").trim() === (entry.notes || "").trim() &&
        (prev.updatedByName || "") === (entry.updatedByName || "")
      );
    });

    const historyRows = cleanHistory.map((h, i) => [
      String(i + 1),
      sanitizeText(h.statusLabel || getStageFullLabel(h.status)),
      formatDateTimeBr(h.updatedAt),
      sanitizeText(h.updatedByName || "Gestão"),
      sanitizeText(h.notes || "-")
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: "striped",
      head: [["#", "Etapa / Status", "Data e Hora", "Responsável", "Observações"]],
      body: historyRows,
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8
      },
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        cellPadding: 2.2,
        textColor: bodySlate,
        overflow: "linebreak"
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 52, fontStyle: "bold" },
        2: { cellWidth: 34, halign: "center" },
        3: { cellWidth: 32 },
        4: { cellWidth: 56 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;
  }

  // ============================================================================
  // TERMO DE COMPROMISSO E ASSINATURAS
  // ============================================================================
  ensureSpace(28);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 22, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text("DECLARAÇÃO DE VERACIDADE E CIÊNCIA DO FLUXO DE PRODUÇÃO:", margin + 4, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(bodySlate[0], bodySlate[1], bodySlate[2]);
  const termsText = proposal.termsAccepted
    ? "Confirmado pelo proponente: As informações registradas nesta Ficha de Inscrição são verdadeiras e estão submetidas às etapas de análise pedagógica, artística e executiva da Intervalo Escola de Teatro."
    : "Ficha aguardando submissão / aceite formal do termo de responsabilidade pelo proponente.";
  const termsLines = doc.splitTextToSize(sanitizeText(termsText), contentWidth - 8);
  doc.text(termsLines, margin + 4, currentY + 10);

  // ============================================================================
  // RODAPÉ COM NUMERAÇÃO DE PÁGINAS EM TODAS AS PÁGINAS
  // ============================================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "INTERVALO ESCOLA DE TEATRO • FICHA OFICIAL DE INSCRIÇÃO E PRODUÇÃO DE MONTAGEM",
      margin,
      pageHeight - 7.5
    );
    doc.text(
      sanitizeText(`Página ${p} de ${totalPages}`),
      pageWidth - margin,
      pageHeight - 7.5,
      { align: "right" }
    );
  }

  const safeTitle = sanitizeText(proposal.title || proposal.className || "Montagem")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 40);

  doc.save(`Ficha_Inscricao_Montagem_${safeTitle}.pdf`);
}
