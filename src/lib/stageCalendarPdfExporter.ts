/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from "jspdf";
import autoTable, { RowInput } from "jspdf-autotable";
import { StageProductionProposal, Class, User } from "../types";
import { STAGE_EVOLUTION_STEPS, normalizeStageStatus } from "../services/stageProductionService";

export interface StageCalendarExportOptions {
  proposals: StageProductionProposal[];
  classes?: Class[];
  users?: User[];
  schoolName?: string;
}

/**
 * Sanitiza textos para compatibilidade estrita com a codificação Latin-1 do jsPDF
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

/**
 * Formata data no formato brasileiro DD/MM/AAAA
 */
export function formatCalendarDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return "A definir";
  const trimmed = dateStr.trim();
  // Se for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${d}/${m}/${y}`;
  }
  return sanitizeText(trimmed);
}

/**
 * Retorna o rótulo legível da etapa/status atual
 */
function getStageLabel(status?: string): string {
  if (!status) return "1. Preenchimento";
  const normalized = normalizeStageStatus(status as any);
  const found = STAGE_EVOLUTION_STEPS.find(s => s.id === normalized);
  return found ? found.shortLabel : "1. Preenchimento";
}

/**
 * Gera e realiza o download do PDF com o calendário completo de todo o processo das montagens
 * separado por turmas, destacando em negrito os dias de:
 * 1. Submissão do formulário pelo professor
 * 2. Entrega parcial de objetos
 * 3. Entrega final de objetos
 * 4. Apresentação
 */
export function generateStageCalendarPDF({
  proposals = [],
  classes = [],
  schoolName = "INTERVALO ESCOLA DE TEATRO"
}: StageCalendarExportOptions): void {
  // Criar documento jsPDF em orientação Paisagem (Landscape) para visualização ampla do cronograma
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 12;

  // Paleta de cores oficial da escola e montagens
  const primaryColorHex = "#4C1D95"; // Roxo profundo
  const accentYellowHex = "#FCD34D"; // Amarelo Destaque
  const darkTextHex = "#0F172A"; // Slate 900
  const mutedTextHex = "#64748B"; // Slate 500
  const highlightPurpleBgHex = "#F3E8FF"; // Roxo suave
  const highlightYellowBgHex = "#FEF3C7"; // Amarelo suave

  let currentY = margin;

  // 1. Barra superior decorativa
  doc.setFillColor(76, 29, 149);
  doc.rect(0, 0, pageWidth, 5, "F");
  doc.setFillColor(252, 211, 77);
  doc.rect(0, 5, pageWidth, 1.5, "F");

  currentY = 14;

  // 2. Cabeçalho Institucional
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(76, 29, 149);
  doc.text(sanitizeText(schoolName), margin, currentY);

  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizeText(`Emissão: ${dateStr} às ${timeStr}`), pageWidth - margin, currentY, { align: "right" });

  currentY += 6;

  // 3. Título Principal do Documento
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizeText("CALENDÁRIO GERAL DO PROCESSO DE MONTAGENS E APRESENTAÇÕES"), margin, currentY);

  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    sanitizeText("Cronograma integrado com todas as etapas do processo de produção, prazos e entregas separados por turmas."),
    margin,
    currentY
  );

  currentY += 5;

  // 4. Caixa de Legenda Explicativa com Destaque para os Marcos Obrigatórios
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 9, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(76, 29, 149);
  doc.text(sanitizeText("LEGENDA E MARCOS CRÍTICOS:"), margin + 3, currentY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizeText("As datas destacadas em "),
    margin + 48,
    currentY + 5.5
  );

  doc.setFont("helvetica", "bold");
  doc.setTextColor(88, 28, 135);
  doc.text(
    sanitizeText("NEGRITO"),
    margin + 77,
    currentY + 5.5
  );

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(
    sanitizeText(" indicam as 4 entregas essenciais: Submissão pelo Professor, Entrega Parcial de Objetos, Entrega Final de Objetos e Apresentação Oficial."),
    margin + 90,
    currentY + 5.5
  );

  currentY += 12;

  // Organizar propostas por nome de turma ou código
  const sortedProposals = [...proposals].sort((a, b) => {
    const classA = a.className || classes.find(c => c.id === a.classId)?.code || "";
    const classB = b.className || classes.find(c => c.id === b.classId)?.code || "";
    return classA.localeCompare(classB);
  });

  // =========================================================================
  // PARTE 1: TABELA GERAL CONSOLIDADA (MATRIZ DO CALENDÁRIO SEPARADA POR TURMAS)
  // =========================================================================

  const tableHead: RowInput[] = [
    [
      { content: sanitizeText("TURMA / OBRA / PROFESSOR"), styles: { halign: "left" } },
      { content: sanitizeText("1. SUBMISSÃO\n(PROFESSOR) *"), styles: { halign: "center", fillColor: "#581C87" } },
      { content: sanitizeText("2. DEVOLUTIVA\nAVALIAÇÃO"), styles: { halign: "center" } },
      { content: sanitizeText("3. PRAZO DE\nRETIFICAÇÃO"), styles: { halign: "center" } },
      { content: sanitizeText("4. APROVAÇÃO\nFINAL"), styles: { halign: "center" } },
      { content: sanitizeText("5. REUNIÃO\nPLANEJAMENTO"), styles: { halign: "center" } },
      { content: sanitizeText("6. EXECUÇÃO\nDE COMPRAS"), styles: { halign: "center" } },
      { content: sanitizeText("7. ENTREGA\nPARCIAL *"), styles: { halign: "center", fillColor: "#581C87" } },
      { content: sanitizeText("8. ENTREGA\nFINAL *"), styles: { halign: "center", fillColor: "#581C87" } },
      { content: sanitizeText("9. APRESENTAÇÃO\nOFICIAL *"), styles: { halign: "center", fillColor: "#B45309" } },
      { content: sanitizeText("STATUS\nATUAL"), styles: { halign: "center" } }
    ]
  ];

  const tableBody: RowInput[] = sortedProposals.map((p) => {
    // Identificar turma
    const matchedClass = classes.find(c => c.id === p.classId);
    const classLabel = p.className || (matchedClass ? `${matchedClass.code || ""} ${matchedClass.type || "Turma"}` : "Turma não vinculada");
    const playTitle = p.title ? `Peça: "${p.title}"` : "Obra a definir";
    const teacher = p.proponentName ? `Prof: ${p.proponentName}` : "";

    const turmaCellText = `${classLabel}\n${playTitle}${teacher ? `\n${teacher}` : ""}`;

    // 4 Marcos em destaque:
    // 1. Submissão do formulário pelo professor
    const submissionDateFormatted = formatCalendarDate(p.submissionDeadline);

    // 2. Entrega parcial de objetos
    const partialDeliveryFormatted = formatCalendarDate(p.partialDeliveryDate);

    // 3. Entrega final de objetos
    const finalDeliveryFormatted = formatCalendarDate(p.finalDeliveryDate);

    // 4. Apresentação oficial
    const presentationFormatted = p.presentationDates 
      ? sanitizeText(p.presentationDates)
      : formatCalendarDate(p.presentationDate);

    // Demais etapas do processo:
    const devolutivaFormatted = formatCalendarDate(p.pedagogicalArtisticFeedbackDate);
    const retificacaoFormatted = formatCalendarDate(p.rectificationDeadline);
    const aprovacaoFormatted = formatCalendarDate(p.finalApprovalDate);
    const reuniaoFormatted = formatCalendarDate(p.planningMeetingDate);
    const comprasFormatted = p.executionPeriod ? sanitizeText(p.executionPeriod) : "A definir";
    const statusLabel = getStageLabel(p.status);

    return [
      {
        content: sanitizeText(turmaCellText),
        styles: { fontStyle: "bold", fontSize: 7, textColor: darkTextHex }
      },
      // 1. SUBMISSÃO (DESTAQUE EM NEGRITO)
      {
        content: submissionDateFormatted,
        styles: { 
          fontStyle: "bold", 
          halign: "center", 
          fontSize: 7.5,
          textColor: "#581C87", // Roxo escuro
          fillColor: highlightPurpleBgHex
        }
      },
      // 2. Devolutiva
      {
        content: devolutivaFormatted,
        styles: { halign: "center", fontSize: 7, textColor: darkTextHex }
      },
      // 3. Retificação
      {
        content: retificacaoFormatted,
        styles: { halign: "center", fontSize: 7, textColor: darkTextHex }
      },
      // 4. Aprovação Final
      {
        content: aprovacaoFormatted,
        styles: { halign: "center", fontSize: 7, textColor: darkTextHex }
      },
      // 5. Reunião Planejamento
      {
        content: reuniaoFormatted,
        styles: { halign: "center", fontSize: 7, textColor: darkTextHex }
      },
      // 6. Execução Compras
      {
        content: comprasFormatted,
        styles: { halign: "center", fontSize: 6.5, textColor: darkTextHex }
      },
      // 7. ENTREGA PARCIAL (DESTAQUE EM NEGRITO)
      {
        content: partialDeliveryFormatted,
        styles: { 
          fontStyle: "bold", 
          halign: "center", 
          fontSize: 7.5,
          textColor: "#581C87",
          fillColor: highlightPurpleBgHex
        }
      },
      // 8. ENTREGA FINAL (DESTAQUE EM NEGRITO)
      {
        content: finalDeliveryFormatted,
        styles: { 
          fontStyle: "bold", 
          halign: "center", 
          fontSize: 7.5,
          textColor: "#581C87",
          fillColor: highlightPurpleBgHex
        }
      },
      // 9. APRESENTAÇÃO OFICIAL (DESTAQUE EM NEGRITO)
      {
        content: presentationFormatted,
        styles: { 
          fontStyle: "bold", 
          halign: "center", 
          fontSize: 7.5,
          textColor: "#92400E", // Amber 800
          fillColor: highlightYellowBgHex
        }
      },
      // Status Atual
      {
        content: sanitizeText(statusLabel),
        styles: { halign: "center", fontSize: 6.5, textColor: mutedTextHex, fontStyle: "bold" }
      }
    ];
  });

  // Se não houver propostas
  if (sortedProposals.length === 0) {
    tableBody.push([
      {
        content: sanitizeText("Nenhuma montagem cadastrada até o momento."),
        styles: { fontStyle: "italic", fontSize: 8, textColor: mutedTextHex }
      },
      ...Array(10).fill({ content: "-", styles: { halign: "center", fontSize: 8 } })
    ]);
  }

  // Renderizar a Tabela Principal (Visão Geral por Turma)
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 15 },
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: primaryColorHex,
      textColor: "#FFFFFF",
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      cellPadding: 2.5
    },
    styles: {
      overflow: "linebreak",
      cellPadding: 2,
      textColor: darkTextHex,
      lineColor: "#E2E8F0",
      lineWidth: 0.15
    },
    columnStyles: {
      0: { cellWidth: 42 }, // Turma / Obra / Professor
      1: { cellWidth: 23, fontStyle: "bold" }, // Submissão (Bold)
      2: { cellWidth: 20 }, // Devolutiva
      3: { cellWidth: 20 }, // Retificação
      4: { cellWidth: 20 }, // Aprovação Final
      5: { cellWidth: 21 }, // Reunião
      6: { cellWidth: 25 }, // Compras
      7: { cellWidth: 23, fontStyle: "bold" }, // Entrega Parcial (Bold)
      8: { cellWidth: 23, fontStyle: "bold" }, // Entrega Final (Bold)
      9: { cellWidth: 34, fontStyle: "bold" }, // Apresentação (Bold)
      10: { cellWidth: 22 } // Status
    },
    alternateRowStyles: {
      fillColor: "#FAFAFC"
    }
  });

  // =========================================================================
  // PARTE 2: TABELAS DETALHADAS SEPARADAS POR TURMA (CRONOGRAMA INDIVIDUALIZADO)
  // =========================================================================

  // Adiciona uma nova página dedicada ao detalhamento cronológico de cada turma
  if (sortedProposals.length > 0) {
    doc.addPage("a4", "landscape");

    let detailY = 15;

    // Cabeçalho da página 2
    doc.setFillColor(76, 29, 149);
    doc.rect(0, 0, pageWidth, 5, "F");
    doc.setFillColor(252, 211, 77);
    doc.rect(0, 5, pageWidth, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizeText("DETALHAMENTO DO CALENDÁRIO SEPARADO POR TURMAS"), margin, detailY);

    detailY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      sanitizeText("Cronograma passo a passo de todas as etapas e marcos de cada turma, com destaque em negrito para os 4 marcos obrigatórios."),
      margin,
      detailY
    );

    detailY += 8;

    // Para cada turma/proposta, desenhar uma tabela separada e bem demarcada
    sortedProposals.forEach((proposal, pIndex) => {
      const matchedClass = classes.find(c => c.id === proposal.classId);
      const classLabel = proposal.className || (matchedClass ? `${matchedClass.code || ""} ${matchedClass.type || "Turma"}` : `Turma #${pIndex + 1}`);
      const playTitle = proposal.title ? `"${proposal.title}"` : "Obra a definir";
      const teacher = proposal.proponentName ? `Professor: ${proposal.proponentName}` : "";
      const currentStage = getStageLabel(proposal.status);

      // Verificar se cabe na página atual ou se precisa de nova página
      if (detailY > pageHeight - 65) {
        doc.addPage("a4", "landscape");
        detailY = 16;
        doc.setFillColor(76, 29, 149);
        doc.rect(0, 0, pageWidth, 4, "F");
      }

      // Banner da Turma
      doc.setFillColor(243, 232, 255); // Roxo bem suave
      doc.setDrawColor(192, 132, 252);
      doc.roundedRect(margin, detailY, pageWidth - margin * 2, 8, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(88, 28, 135);
      doc.text(
        sanitizeText(`TURMA: ${classLabel.toUpperCase()}  •  PEÇA: ${playTitle.toUpperCase()}${teacher ? `  •  ${teacher.toUpperCase()}` : ""}`),
        margin + 4,
        detailY + 5.5
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(107, 33, 168);
      doc.text(
        sanitizeText(`Status Atual: ${currentStage}`),
        pageWidth - margin - 4,
        detailY + 5.5,
        { align: "right" }
      );

      detailY += 10;

      // Montar linhas com todas as etapas do processo da turma
      // Destacando em negrito os 4 marcos:
      // 1. Submissão do formulário pelo professor
      // 7. Entrega parcial de objetos
      // 8. Entrega final de objetos
      // 9. Apresentação
      const classRows: RowInput[] = [
        [
          { content: sanitizeText("1. Submissão do Formulário pelo Professor (MARCO CRÍTICO)"), styles: { fontStyle: "bold", textColor: "#581C87" } },
          { content: formatCalendarDate(proposal.submissionDeadline), styles: { fontStyle: "bold", textColor: "#581C87", fillColor: highlightPurpleBgHex } },
          { content: sanitizeText("Professor Responsável"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Prazo para inserção de dados da obra, sinopse, proposta pedagógica e necessidades."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("2. Devolutiva da Avaliação Pedagógica e Artística"), styles: { fontStyle: "normal" } },
          { content: formatCalendarDate(proposal.pedagogicalArtisticFeedbackDate), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Direção Pedagógica & Artística"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Emissão do parecer e aprovação/ajustes do formulário submetido."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("3. Prazo de Envio de Retificação pelo Professor"), styles: { fontStyle: "normal" } },
          { content: formatCalendarDate(proposal.rectificationDeadline), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Professor Responsável"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Ajustes das pendências apontadas pela avaliação (se houver retificações)."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("4. Aprovação Final do Formulário de Apresentação"), styles: { fontStyle: "normal" } },
          { content: formatCalendarDate(proposal.finalApprovalDate), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Gestão & Direção"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Validação definitiva da proposta e liberação para a fase de planejamento."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("5. Reunião de Planejamento da Montagem"), styles: { fontStyle: "normal" } },
          { content: formatCalendarDate(proposal.planningMeetingDate), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Gestão, Direção e Produção"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Reunião de alinhamento com a equipe de arte, técnica e cronograma de produção."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("6. Período de Execução de Compras e Confecções"), styles: { fontStyle: "normal" } },
          { content: proposal.executionPeriod ? sanitizeText(proposal.executionPeriod) : "A definir", styles: { fontStyle: "normal" } },
          { content: sanitizeText("Gestão Administrativa"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Aquisição de materiais, cenários, figurinos e adereços autorizados no orçamento."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("7. Entrega Parcial de Objetos e Cenografia (MARCO CRÍTICO)"), styles: { fontStyle: "bold", textColor: "#581C87" } },
          { content: formatCalendarDate(proposal.partialDeliveryDate), styles: { fontStyle: "bold", textColor: "#581C87", fillColor: highlightPurpleBgHex } },
          { content: sanitizeText("Gestão e Produção"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Disponibilização de adereços de cena e elementos para ensaios da turma."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("8. Entrega Final de Todos os Itens para Apresentação (MARCO CRÍTICO)"), styles: { fontStyle: "bold", textColor: "#581C87" } },
          { content: formatCalendarDate(proposal.finalDeliveryDate), styles: { fontStyle: "bold", textColor: "#581C87", fillColor: highlightPurpleBgHex } },
          { content: sanitizeText("Gestão e Produção"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Entrega total de todos os figurinos, iluminação, som, vídeo e cenografia completa."), styles: { fontSize: 6.5 } }
        ],
        [
          { content: sanitizeText("9. Apresentação Oficial da Montagem (MARCO CRÍTICO)"), styles: { fontStyle: "bold", textColor: "#92400E" } },
          { 
            content: proposal.presentationDates ? sanitizeText(proposal.presentationDates) : formatCalendarDate(proposal.presentationDate), 
            styles: { fontStyle: "bold", textColor: "#92400E", fillColor: highlightYellowBgHex } 
          },
          { content: sanitizeText("Elenco, Direção e Produção"), styles: { fontStyle: "normal" } },
          { content: sanitizeText("Temporada de apresentações oficiais da turma no teatro."), styles: { fontSize: 6.5 } }
        ]
      ];

      autoTable(doc, {
        startY: detailY,
        margin: { left: margin, right: margin, bottom: 15 },
        head: [
          [
            { content: sanitizeText("ETAPA / EVENTO DO PROCESSO"), styles: { halign: "left" } },
            { content: sanitizeText("DATA / PRAZO"), styles: { halign: "center" } },
            { content: sanitizeText("RESPONSÁVEL"), styles: { halign: "left" } },
            { content: sanitizeText("DESCRIÇÃO / OBJETIVO"), styles: { halign: "left" } }
          ]
        ],
        body: classRows,
        theme: "grid",
        headStyles: {
          fillColor: "#6D28D9",
          textColor: "#FFFFFF",
          fontStyle: "bold",
          fontSize: 7,
          cellPadding: 2
        },
        styles: {
          overflow: "linebreak",
          cellPadding: 2,
          fontSize: 7,
          textColor: darkTextHex,
          lineColor: "#E2E8F0",
          lineWidth: 0.15
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 42, halign: "center" },
          2: { cellWidth: 42 },
          3: { cellWidth: "auto" }
        },
        didDrawPage: (dataArg) => {
          // Salvar a posição final para a próxima turma
          detailY = dataArg.cursor ? dataArg.cursor.y + 8 : detailY + 45;
        }
      });

      // Atualizar detailY após o autoTable
      const lastTable = (doc as any).lastAutoTable;
      if (lastTable && lastTable.finalY) {
        detailY = lastTable.finalY + 8;
      }
    });
  }

  // =========================================================================
  // RODAPÉ E NUMERAÇÃO DE PÁGINAS EM TODAS AS FOLHAS
  // =========================================================================
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    // Linha divisória sutil no rodapé
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.text(
      sanitizeText(`${schoolName} • Calendário de Montagens e Apresentações`),
      margin,
      pageHeight - 5
    );

    doc.text(
      sanitizeText(`Página ${i} de ${totalPages}`),
      pageWidth - margin,
      pageHeight - 5,
      { align: "right" }
    );
  }

  // Nome do arquivo gerado
  const fileDate = now.toISOString().split("T")[0];
  doc.save(`calendario_montagens_turmas_${fileDate}.pdf`);
}
