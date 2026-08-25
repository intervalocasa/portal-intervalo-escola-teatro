/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ADULT_COURSE_CRITERIA, PROFESSIONAL_COURSE_CRITERIA, GRADE_LEGEND } from "../constants";
import { Evaluation, UserBadge } from "../types";

export interface PDFExportData {
  studentName: string;
  artisticName?: string;
  className: string;
  classType?: string;
  teacherName: string;
  month: number;
  year: number;
  presences: number;
  absences: number;
  frequencyObs?: string;
  grades: Record<string, number | string>;
  criteriaObs?: Record<string, string>;
  generalPedagogicalObs?: string;
  averageGrade?: number;
  studentEval?: Evaluation | null;
  userBadges?: UserBadge[];
  status?: string;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Sanitizes strings for jsPDF Helvetica / WinAnsiEncoding.
 * Replaces smart quotes, em-dashes, non-breaking spaces, and eliminates unprintable unicode bytes.
 */
function sanitizeText(str: string | undefined | null): string {
  if (!str) return "";
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

export function generateDiaryPDF(data: PDFExportData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // Primary palette
  const primaryColor = [1, 106, 134]; // #016a86
  const orangeColor = [255, 124, 0]; // #ff7c00
  const yellowColor = [255, 188, 0]; // #ffbc00
  const darkSlate = [30, 41, 59];
  const mutedSlate = [100, 116, 139];
  const lightBg = [248, 250, 252];

  // 1. Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 26, "F");

  // Accent Line
  doc.setFillColor(orangeColor[0], orangeColor[1], orangeColor[2]);
  doc.rect(0, 26, pageWidth, 2, "F");

  // --- SCHOOL LOGO BADGE (Header Left) ---
  // White badge container
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 3.5, 19, 19, 2.5, 2.5, "F");

  // Logo geometric vector blocks (Intervalo Casa de Artes)
  // Upper blocks:
  doc.setFillColor(1, 106, 134); // Teal
  doc.rect(21.2, 6.2, 4.0, 4.0, "F");

  doc.setFillColor(255, 188, 0); // Yellow
  doc.rect(21.5, 6.5, 2.7, 2.7, "F");

  doc.setFillColor(251, 211, 182); // Peach
  doc.rect(20.2, 6.5, 1.0, 2.5, "F");

  // Lower blocks:
  doc.setFillColor(1, 106, 134); // Teal
  doc.rect(20.3, 11.2, 4.2, 7.5, "F");

  doc.setFillColor(255, 124, 0); // Orange
  doc.rect(21.2, 10.7, 3.0, 9.0, "F");

  doc.setFillColor(251, 211, 182); // Peach
  doc.rect(24.5, 10.7, 0.8, 9.0, "F");

  doc.setFillColor(255, 124, 0); // Orange dot accent
  doc.rect(23.5, 17.7, 1.0, 1.0, "F");

  // Brand Header Text next to Logo Badge
  const headerTextX = margin + 22;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("INTERVALO CASA DE ARTES", headerTextX, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(230, 245, 250);
  doc.text("ESCOLA DE ATORES | DIÁRIO DE AVALIAÇÃO PEDAGÓGICA", headerTextX, 18);

  // Month / Year Badge in Header Right
  const monthName = MONTH_NAMES[(data.month - 1) % 12] || "";
  const monthLabel = sanitizeText(`${monthName} ${data.year}`).toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(monthLabel, pageWidth - margin, 15, { align: "right" });

  currentY = 35;

  // 2. Info Cards Block (Student, Class, Teacher, Frequency)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 34, 3, 3, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 34, 3, 3, "S");

  // Info Column 1
  const col1X = margin + 5;
  let infoY = currentY + 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("ALUNO(A):", col1X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const rawDisplayName = data.artisticName 
    ? `${data.studentName} (${data.artisticName})`
    : data.studentName;
  doc.text(sanitizeText(rawDisplayName), col1X + 22, infoY);

  infoY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("TURMA:", col1X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const classStr = `${data.className}${data.classType ? ` - ${data.classType}` : ""}`;
  doc.text(sanitizeText(classStr), col1X + 22, infoY);

  infoY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("PROFESSOR:", col1X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(sanitizeText(data.teacherName || "Não informado"), col1X + 22, infoY);

  // Info Column 2 (Frequency & Average)
  const col2X = pageWidth - margin - 65;
  infoY = currentY + 7;

  const totalClasses = (data.presences || 0) + (data.absences || 0);
  const freqPct = totalClasses > 0 ? Math.round(((data.presences || 0) / totalClasses) * 100) : 100;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("FREQUÊNCIA:", col2X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${freqPct}% (${data.presences || 0} P / ${data.absences || 0} F)`, col2X + 25, infoY);

  infoY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("MÉDIA GERAL:", col2X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
  const avgStr = data.averageGrade !== undefined ? Number(data.averageGrade).toFixed(1) : "N/A";
  doc.text(avgStr, col2X + 25, infoY);

  infoY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("STATUS DIÁRIO:", col2X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  if (data.status === "concluido") {
    doc.setTextColor(16, 185, 129); // Green
    doc.text("CONCLUÍDO", col2X + 25, infoY);
  } else {
    doc.setTextColor(245, 158, 11); // Amber
    doc.text("EM RASCUNHO", col2X + 25, infoY);
  }

  currentY += 39;

  // Determine criteria set
  const isProfessional = data.classType?.includes("Profissional") || data.classType?.includes("Montagem");
  const criteriaList = isProfessional ? PROFESSIONAL_COURSE_CRITERIA : ADULT_COURSE_CRITERIA;

  // 3. Criteria Table
  const tableRows = criteriaList.map(c => {
    const profGradeVal = data.grades?.[c.id];
    const profGradeStr = profGradeVal !== undefined && profGradeVal !== "" ? `${profGradeVal}` : "-";

    const selfGradeVal = data.studentEval?.notes?.[c.id];
    const selfGradeStr = selfGradeVal !== undefined ? `${selfGradeVal}` : "-";

    // Consolidated indicator level
    let indicatorStr = "-";
    if (profGradeVal !== undefined && profGradeVal !== "" && selfGradeVal !== undefined) {
      const selfVal = Number(selfGradeVal);
      const profVal = Number(profGradeVal);
      const weightSelf = isProfessional ? 2 : 3;
      const weightProf = isProfessional ? 2 : 1;
      const compAvg = (selfVal * weightSelf + profVal * weightProf) / 4;

      if (isProfessional) {
        indicatorStr = `${compAvg.toFixed(1)} / 10`;
      } else {
        const legendItem = compAvg === 0 ? GRADE_LEGEND[0] : 
                         compAvg <= 3 ? GRADE_LEGEND[1] : 
                         compAvg <= 6 ? GRADE_LEGEND[2] : 
                         compAvg <= 9 ? GRADE_LEGEND[3] : 
                         GRADE_LEGEND[4];
        indicatorStr = `${legendItem.label} (${compAvg.toFixed(1)})`;
      }
    } else if (profGradeVal !== undefined && profGradeVal !== "") {
      indicatorStr = `Prof: ${profGradeVal}`;
    }

    const rawObs = data.criteriaObs?.[c.id] || "-";

    return [
      sanitizeText(`${c.label}\n${c.definition}`),
      sanitizeText(profGradeStr),
      sanitizeText(selfGradeStr),
      sanitizeText(indicatorStr),
      sanitizeText(rawObs)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 20 },
    head: [["CRITÉRIO E DEFINIÇÃO", "NOTA PROF.", "AUTOAVAL.", "INDICADOR CONSOLIDADO", "OBSERVAÇÕES DO PROFESSOR"]],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [1, 106, 134],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 55, fontSize: 7, fontStyle: "bold" },
      1: { cellWidth: 18, halign: "center", fontSize: 8, fontStyle: "bold" },
      2: { cellWidth: 18, halign: "center", fontSize: 8, fontStyle: "bold" },
      3: { cellWidth: 32, halign: "center", fontSize: 7, fontStyle: "bold" },
      4: { cellWidth: "auto", fontSize: 7 }
    },
    styles: {
      overflow: "linebreak",
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (dataArg) => {
      if (dataArg.pageNumber > 1) {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 12, "F");

        // Mini logo badge on subsequent pages
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, 2, 8, 8, 1, 1, "F");
        doc.setFillColor(1, 106, 134);
        doc.rect(margin + 2.5, 3.2, 2, 2, "F");
        doc.setFillColor(255, 124, 0);
        doc.rect(margin + 2.5, 5.5, 1.5, 3.5, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        const subHead = sanitizeText(`INTERVALO CASA DE ARTES | ${data.studentName} - ${data.className} (${monthLabel})`);
        doc.text(subHead, margin + 11, 8);
      }
    }
  });

  // Get final Y position after table
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Helper for printing wrapped lines with safe pagination
  const printWrappedText = (
    text: string,
    x: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
    bottomMargin: number = 30,
    headerTitle?: string
  ): number => {
    const safeText = sanitizeText(text);
    if (!safeText) return startY;

    const lines: string[] = doc.splitTextToSize(safeText, maxWidth);
    let y = startY;

    for (let i = 0; i < lines.length; i++) {
      if (y > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
        if (headerTitle) {
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(margin, y, pageWidth - (margin * 2), 6, 1, 1, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.text(sanitizeText(`${headerTitle} (continuação)`), margin + 3, y + 4.2);
          y += 10;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
        }
      }
      doc.text(lines[i], x, y);
      y += lineHeight;
    }

    return y;
  };

  // 4. Student Open Self-Assessment (if available)
  if (data.studentEval?.openAnswers && Object.keys(data.studentEval.openAnswers).length > 0) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("AUTOAVALIAÇÃO DO ALUNO (RESPOSTAS ABERTAS)", margin + 3, currentY + 4.5);
    currentY += 10;

    const openAnswers = data.studentEval.openAnswers;
    const questions = [
      { key: "strengths", label: "Pontos Fortes do Mês" },
      { key: "challenges", label: "Maiores Desafios" },
      { key: "nextSteps", label: "Objetivos para o Próximo Mês" },
      { key: "commitment", label: "Análise de Compromisso" }
    ];

    questions.forEach(q => {
      const rawAnswer = openAnswers[q.key];
      const answer = sanitizeText(rawAnswer);
      if (answer) {
        if (currentY > pageHeight - 35) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
        doc.text(sanitizeText(`• ${q.label}:`), margin + 2, currentY);
        currentY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

        currentY = printWrappedText(
          answer,
          margin + 4,
          currentY,
          pageWidth - (margin * 2) - 8,
          3.8,
          30,
          "AUTOAVALIAÇÃO DO ALUNO"
        ) + 4;
      }
    });

    currentY += 2;
  }

  // 5. General Pedagogical Feedback
  const safePedagogicalObs = sanitizeText(data.generalPedagogicalObs);
  if (safePedagogicalObs) {
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("PARECER PEDAGÓGICO GERAL DO PROFESSOR", margin + 3, currentY + 4.5);
    currentY += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

    currentY = printWrappedText(
      safePedagogicalObs,
      margin + 3,
      currentY,
      pageWidth - (margin * 2) - 6,
      4.2,
      35,
      "PARECER PEDAGÓGICO GERAL"
    ) + 8;
  }

  // 6. Awarded Badges (if any)
  if (data.userBadges && data.userBadges.length > 0) {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("CONQUISTAS E RECONHECIMENTOS (BADGES)", margin + 3, currentY + 4.5);
    currentY += 10;

    data.userBadges.forEach(b => {
      const bName = sanitizeText(b.name);
      const bDesc = sanitizeText(b.description);
      const bMsg = sanitizeText(b.message);

      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(yellowColor[0] * 0.8, yellowColor[1] * 0.8, 0);
      doc.text(sanitizeText(`[CONQUISTA] ${bName}`), margin + 3, currentY);
      currentY += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

      const badgeText = `${bDesc}${bMsg ? ` - "${bMsg}"` : ""}`;
      currentY = printWrappedText(
        badgeText,
        margin + 5,
        currentY,
        pageWidth - (margin * 2) - 10,
        3.6,
        30
      ) + 5;
    });

    currentY += 2;
  }

  // 7. Signature Line & Footer
  const signatureHeightNeeded = 32;
  if (currentY > pageHeight - signatureHeightNeeded - 12) {
    doc.addPage();
    currentY = pageHeight - signatureHeightNeeded - 12;
  } else {
    currentY = Math.max(currentY + 6, pageHeight - signatureHeightNeeded - 12);
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin + 20, currentY + 10, margin + 80, currentY + 10);
  doc.line(pageWidth - margin - 80, currentY + 10, pageWidth - margin - 20, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("Assinatura do Professor", margin + 50, currentY + 14, { align: "center" });
  doc.text("Coordenação Pedagógica", pageWidth - margin - 50, currentY + 14, { align: "center" });

  // Page numbering and footer string on all pages
  const totalPages = doc.getNumberOfPages();
  const dateFormatted = new Date().toLocaleDateString("pt-BR");

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    // Bottom border line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    const footerText = sanitizeText(`Intervalo Casa de Artes • Emitido em ${dateFormatted} • Documento oficial do aluno`);
    doc.text(footerText, margin, pageHeight - 6);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  // File name generation
  const cleanStudentName = sanitizeText(data.studentName).toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanMonth = sanitizeText(MONTH_NAMES[(data.month - 1) % 12]).toLowerCase();
  const fileName = `diario_${cleanStudentName}_${cleanMonth}_${data.year}.pdf`;

  doc.save(fileName);
}

export function generateLessonPlanPDF(plan: any, skillsList: any[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const brandTeal = [1, 106, 134];
  const darkSlate = [15, 23, 42];
  const mutedSlate = [100, 116, 139];

  // Header Box
  doc.setFillColor(brandTeal[0], brandTeal[1], brandTeal[2]);
  doc.rect(margin, 12, contentWidth, 24, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("PLANO DE AULA PEDAGÓGICO", margin + 8, 22);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(230, 245, 250);
  doc.text("INTERVALO ESCOLA DE TEATRO • PLANEJAMENTO DE ENSINO", margin + 8, 29);

  let currentY = 42;

  // Metadata Grid
  const dateStr = typeof plan.date === "string" 
    ? plan.date 
    : (plan.date?.toDate ? plan.date.toDate().toLocaleDateString("pt-BR") : new Date(plan.date || 0).toLocaleDateString("pt-BR"));

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Informações da Aula", "Detalhes"]],
    body: [
      ["Turma / Curso", sanitizeText(plan.className || "Turma")],
      ["Professor(a) Responsável", sanitizeText(plan.teacherName || "Professor")],
      ["Data da Aula", sanitizeText(dateStr)],
      ["Duração Total Prevista", `${plan.totalDuration || 0} minutos`]
    ],
    theme: "grid",
    headStyles: {
      fillColor: [1, 106, 134],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, fillColor: [248, 250, 252] },
      1: { cellWidth: "auto" }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Objetivo Geral
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(brandTeal[0], brandTeal[1], brandTeal[2]);
  doc.text("1. Objetivo Geral da Aula", margin, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  const splitObjective = doc.splitTextToSize(sanitizeText(plan.generalObjective), contentWidth - 4);
  
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, splitObjective.length * 4.5 + 6, 2, 2, "FD");
  doc.text(splitObjective, margin + 4, currentY + 5);

  currentY += splitObjective.length * 4.5 + 12;

  // Habilidades Trabalhadas
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(brandTeal[0], brandTeal[1], brandTeal[2]);
  doc.text("2. Habilidades e Competências Trabalhadas", margin, currentY);
  currentY += 4;

  const matchedSkills = (plan.skills || []).map((skillId: string) => {
    const found: any = skillsList.find(s => s.id === skillId || s.name === skillId)
      || PROFESSIONAL_COURSE_CRITERIA.find(p => p.id === skillId || p.label === skillId);
    return [
      found ? sanitizeText(found.name || found.label || skillId) : sanitizeText(skillId),
      found ? sanitizeText(found.category || "Pedagógico") : "Pedagógico",
      found?.definition ? sanitizeText(found.definition) : "-"
    ];
  });

  if (matchedSkills.length > 0) {
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Habilidade", "Categoria", "Descrição Pedagógica"]],
      body: matchedSkills,
      theme: "striped",
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [15, 23, 42]
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: "auto" }
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Atividades Práticas da Aula
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(brandTeal[0], brandTeal[1], brandTeal[2]);
  doc.text("3. Sequência de Atividades e Dinâmicas", margin, currentY);
  currentY += 4;

  const activitiesData = (plan.activities || []).map((act: any, idx: number) => [
    `${idx + 1}`,
    sanitizeText(act.objective),
    sanitizeText(act.description),
    `${act.duration || 0} min`
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["#", "Objetivo da Atividade", "Descrição e Condução", "Duração"]],
    body: activitiesData,
    theme: "grid",
    headStyles: {
      fillColor: [1, 106, 134],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 10, halign: "center" },
      1: { fontStyle: "bold", cellWidth: 48 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 20, halign: "center", fontStyle: "bold" }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Observações (se houver)
  if (plan.observations) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(brandTeal[0], brandTeal[1], brandTeal[2]);
    doc.text("4. Observações / Materiais Necessários", margin, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    const splitObs = doc.splitTextToSize(sanitizeText(plan.observations), contentWidth - 4);
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, splitObs.length * 4.5 + 6, 2, 2, "FD");
    doc.text(splitObs, margin + 4, currentY + 5);
  }

  // Footer & Page numbering
  const totalPages = doc.getNumberOfPages();
  const dateFormatted = new Date().toLocaleDateString("pt-BR");

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    const footerText = sanitizeText(`Intervalo Casa de Artes • Plano de Aula • Gerado em ${dateFormatted}`);
    doc.text(footerText, margin, pageHeight - 6);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  const cleanClassName = sanitizeText(plan.className || "turma").toLowerCase().replace(/[^a-z0-9]/g, "_");
  const fileName = `plano_aula_${cleanClassName}_${dateStr.replace(/[^0-9]/g, "")}.pdf`;
  doc.save(fileName);
}

