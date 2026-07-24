/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ADULT_COURSE_CRITERIA, PROFESSIONAL_COURSE_CRITERIA, GRADE_LEGEND, SCALES } from "../constants";
import { Diary, Evaluation, UserBadge } from "../types";

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

  // Logo representation / Brand text in header
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INTERVALO CASA DE ARTES", margin, 12);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 245, 250);
  doc.text("ESCOLA DE ATORES | DIÁRIO DE AVALIAÇÃO PEDAGÓGICA", margin, 19);

  // Month / Year Badge in Header Right
  const monthLabel = `${MONTH_NAMES[(data.month - 1) % 12] || ""} ${data.year}`.toUpperCase();
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
  const displayName = data.artisticName 
    ? `${data.studentName} (${data.artisticName})`
    : data.studentName;
  doc.text(displayName, col1X + 22, infoY);

  infoY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("TURMA:", col1X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(`${data.className}${data.classType ? ` - ${data.classType}` : ""}`, col1X + 22, infoY);

  infoY += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(mutedSlate[0], mutedSlate[1], mutedSlate[2]);
  doc.text("PROFESSOR:", col1X, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text(data.teacherName || "Não informado", col1X + 22, infoY);

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

    const obsStr = data.criteriaObs?.[c.id] || "-";

    return [
      `${c.label}\n${c.definition}`,
      profGradeStr,
      selfGradeStr,
      indicatorStr,
      obsStr
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
      // Header on subsequent pages
      if (dataArg.pageNumber > 1) {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 12, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(`INTERVALO CASA DE ARTES | ${data.studentName} - ${data.className} (${monthLabel})`, margin, 8);
      }
    }
  });

  // Get final Y position after table
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check if we need a new page for open answers & general observations
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 20;
  }

  // 4. Student Open Self-Assessment (if available)
  if (data.studentEval?.openAnswers && Object.keys(data.studentEval.openAnswers).length > 0) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 6, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("AUTOAVALIAÇÃO DO ALUNO (RESPOSTAS ABERTAS)", margin + 3, currentY + 4.5);
    currentY += 9;

    const openAnswers = data.studentEval.openAnswers;
    const questions = [
      { key: "strengths", label: "Pontos Fortes do Mês" },
      { key: "challenges", label: "Maiores Desafios" },
      { key: "nextSteps", label: "Objetivos para o Próximo Mês" },
      { key: "commitment", label: "Análise de Compromisso" }
    ];

    questions.forEach(q => {
      const answer = openAnswers[q.key];
      if (answer && answer.trim()) {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(orangeColor[0], orangeColor[1], orangeColor[2]);
        doc.text(`• ${q.label}:`, margin + 2, currentY);
        currentY += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);

        const splitText = doc.splitTextToSize(answer, pageWidth - (margin * 2) - 6);
        doc.text(splitText, margin + 4, currentY);
        currentY += (splitText.length * 3.8) + 4;
      }
    });

    currentY += 3;
  }

  // 5. General Pedagogical Feedback
  if (data.generalPedagogicalObs && data.generalPedagogicalObs.trim()) {
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

    const splitPedag = doc.splitTextToSize(data.generalPedagogicalObs, pageWidth - (margin * 2) - 6);
    doc.text(splitPedag, margin + 3, currentY);
    currentY += (splitPedag.length * 4) + 8;
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
    currentY += 9;

    data.userBadges.forEach(b => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(yellowColor[0] * 0.8, yellowColor[1] * 0.8, 0);
      doc.text(`[CONQUISTA] ${b.name}`, margin + 3, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      const badgeText = `${b.description}${b.message ? ` - "${b.message}"` : ""}`;
      const splitBadge = doc.splitTextToSize(badgeText, pageWidth - (margin * 2) - 10);
      doc.text(splitBadge, margin + 5, currentY + 3.8);

      currentY += (splitBadge.length * 3.5) + 6;
    });

    currentY += 3;
  }

  // 7. Signature Line & Footer
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = pageHeight - 35;
  } else if (currentY < pageHeight - 35) {
    currentY = pageHeight - 35;
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

  // Page numbering on all pages
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

    doc.text(
      `Intervalo Casa de Artes • Emitido em ${dateFormatted} • Documento oficial do aluno`,
      margin,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  // File name generation
  const cleanStudentName = data.studentName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const cleanMonth = MONTH_NAMES[(data.month - 1) % 12].toLowerCase();
  const fileName = `diario_${cleanStudentName}_${cleanMonth}_${data.year}.pdf`;

  doc.save(fileName);
}
