/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Wallet, 
  Users, 
  CreditCard, 
  Download, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Building2, 
  Clock, 
  AlertCircle,
  Check,
  RefreshCw,
  UserCheck,
  UserX,
  Award
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { User, Class } from "../types";
import { BackButton, Avatar, Logo } from "../components/CommonComponents";
import { collection, onSnapshot, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

interface FinancialManagementViewProps {
  users: User[];
  classes: Class[];
  currentUser: any;
  setView: (view: any) => void;
}

export interface EnrollmentRecord {
  id: string; // unique key: studentId_classId
  studentId: string;
  studentName: string;
  studentSocialName?: string;
  studentCpf: string;
  studentEmail: string;
  studentPhone?: string;
  studentPhoto?: string;
  isStudentInactive: boolean;
  
  classId: string;
  classCode: string;
  classType: string;
  classWeekday: string;
  classTime: string;
  isClassActive: boolean;
  
  enrollmentDate: string; // YYYY-MM-DD
  paymentType: "Pagante" | "Isento";
  isEnrollmentActive: boolean;
  statusLabel: "Ativa" | "Inativa";
}

export interface PaymentRecord {
  id: string; // studentId_year_month
  studentId: string;
  studentName: string;
  studentCpf: string;
  className: string;
  month: number;
  year: number;
  amount: number; // e.g. 250
  dueDate: string; // YYYY-MM-DD
  status: "Pago" | "Pendente" | "Atrasado" | "Isento";
  paymentMethod?: "PIX" | "Cartão" | "Boleto" | "Dinheiro" | "Transferência";
  paidAt?: string;
  notes?: string;
  isExempt?: boolean;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const FinancialManagementView = ({
  users,
  classes,
  currentUser,
  setView
}: FinancialManagementViewProps) => {
  const [activeTab, setActiveTab] = useState<"matriculas" | "pagamentos">("matriculas");
  
  // Matrículas States
  const [statusFilter, setStatusFilter] = useState<"Todas" | "Ativas" | "Inativas">("Todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("Todas");

  // Pagamentos States
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"Todos" | "Pago" | "Pendente" | "Atrasado" | "Isento">("Todos");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [dbPayments, setDbPayments] = useState<Record<string, any>>({});
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<string | null>(null);

  // Subscribe to payments in Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pagamentos"), (snapshot) => {
      const dataMap: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        dataMap[doc.id] = { id: doc.id, ...doc.data() };
      });
      setDbPayments(dataMap);
    }, (error) => {
      console.warn("Firestore pagamentos read error or offline:", error);
    });
    return () => unsub();
  }, []);

  // Compute Enrollment Records
  const allEnrollmentRecords = useMemo<EnrollmentRecord[]>(() => {
    const records: EnrollmentRecord[] = [];

    // Map student IDs
    const studentUsers = users.filter(u => u.role === "Aluno");

    classes.forEach(c => {
      if (!c.studentIds) return;

      c.studentIds.forEach(sId => {
        const student = studentUsers.find(u => u.id === sId) || users.find(u => u.id === sId);
        if (!student) return;

        const isStudentInactive = Boolean(student.inactive);
        const isClassActive = Boolean(c.isActive);
        const isEnrollmentActive = !isStudentInactive && isClassActive;

        const dateStr = c.enrollmentDates?.[sId] || 
                        (student.createdAt?.toDate ? student.createdAt.toDate().toISOString().split('T')[0] : "") || 
                        "Data N/D";

        const paymentType = c.studentPaymentTypes?.[sId] || "Pagante";

        records.push({
          id: `${sId}_${c.id}`,
          studentId: sId,
          studentName: student.name,
          studentSocialName: student.socialName,
          studentCpf: student.cpf || "Não informado",
          studentEmail: student.email || "",
          studentPhone: student.phone || "Não informado",
          studentPhoto: student.photo,
          isStudentInactive,
          classId: c.id,
          classCode: c.code || "S/C",
          classType: c.type || "Teatro",
          classWeekday: c.weekday || "",
          classTime: c.time || "",
          isClassActive,
          enrollmentDate: dateStr,
          paymentType,
          isEnrollmentActive,
          statusLabel: isEnrollmentActive ? "Ativa" : "Inativa"
        });
      });
    });

    return records.sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
  }, [users, classes]);

  // Filtered Enrollments
  const filteredEnrollments = useMemo(() => {
    return allEnrollmentRecords.filter(rec => {
      // Status filter
      if (statusFilter === "Ativas" && !rec.isEnrollmentActive) return false;
      if (statusFilter === "Inativas" && rec.isEnrollmentActive) return false;

      // Class filter
      if (selectedClassFilter !== "Todas" && rec.classId !== selectedClassFilter) return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = rec.studentName.toLowerCase().includes(term);
        const matchSocial = rec.studentSocialName?.toLowerCase().includes(term);
        const matchCpf = rec.studentCpf.toLowerCase().includes(term);
        const matchClass = rec.classType.toLowerCase().includes(term) || rec.classCode.toLowerCase().includes(term);
        if (!matchName && !matchSocial && !matchCpf && !matchClass) return false;
      }

      return true;
    });
  }, [allEnrollmentRecords, statusFilter, selectedClassFilter, searchTerm]);

  // Metrics for Matrículas
  const totalMatriculas = allEnrollmentRecords.length;
  const matriculasAtivas = allEnrollmentRecords.filter(r => r.isEnrollmentActive).length;
  const matriculasInativas = allEnrollmentRecords.filter(r => !r.isEnrollmentActive).length;
  const taxaAtividade = totalMatriculas > 0 ? Math.round((matriculasAtivas / totalMatriculas) * 100) : 0;

  // Payments computation
  const paymentRecords = useMemo<PaymentRecord[]>(() => {
    const studentUsers = users.filter(u => u.role === "Aluno" && !u.inactive);

    return studentUsers.map(student => {
      const docId = `${student.id}_${selectedYear}_${selectedMonth + 1}`;
      const saved = dbPayments[docId];

      const studentClasses = classes.filter(c => c.studentIds?.includes(student.id) && c.isActive);
      const classNameStr = studentClasses.map(c => `${c.type} (${c.code})`).join(", ") || "Sem turma";

      const isAllExempt = studentClasses.length > 0 && studentClasses.every(c => c.studentPaymentTypes?.[student.id] === "Isento");

      const defaultDueDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-10`;

      if (saved) {
        return {
          id: docId,
          studentId: student.id,
          studentName: student.name,
          studentCpf: student.cpf || "Não informado",
          className: classNameStr,
          month: selectedMonth,
          year: selectedYear,
          amount: isAllExempt ? 0 : (saved.amount ?? 250),
          dueDate: saved.dueDate || defaultDueDate,
          status: saved.status || (isAllExempt ? "Isento" : "Pendente"),
          paymentMethod: saved.paymentMethod,
          paidAt: saved.paidAt,
          notes: saved.notes,
          isExempt: isAllExempt
        };
      }

      return {
        id: docId,
        studentId: student.id,
        studentName: student.name,
        studentCpf: student.cpf || "Não informado",
        className: classNameStr,
        month: selectedMonth,
        year: selectedYear,
        amount: isAllExempt ? 0 : 250,
        dueDate: defaultDueDate,
        status: isAllExempt ? "Isento" : "Pendente",
        isExempt: isAllExempt
      };
    }).sort((a, b) => a.studentName.localeCompare(b.studentName, "pt-BR"));
  }, [users, classes, dbPayments, selectedMonth, selectedYear]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return paymentRecords.filter(p => {
      if (paymentStatusFilter !== "Todos" && p.status !== paymentStatusFilter) return false;

      if (paymentSearch.trim()) {
        const term = paymentSearch.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(term);
        const matchCpf = p.studentCpf.toLowerCase().includes(term);
        const matchClass = p.className.toLowerCase().includes(term);
        if (!matchName && !matchCpf && !matchClass) return false;
      }

      return true;
    });
  }, [paymentRecords, paymentStatusFilter, paymentSearch]);

  // Payment Metrics
  const totalPrevisto = paymentRecords.reduce((acc, p) => acc + p.amount, 0);
  const totalRecebido = paymentRecords.filter(p => p.status === "Pago").reduce((acc, p) => acc + p.amount, 0);
  const totalPendente = paymentRecords.filter(p => p.status !== "Pago").reduce((acc, p) => acc + p.amount, 0);
  const adimplencia = totalPrevisto > 0 ? Math.round((totalRecebido / totalPrevisto) * 100) : 0;

  // Toggle Payment Status
  const handleTogglePaymentStatus = async (record: PaymentRecord, newStatus: "Pago" | "Pendente" | "Atrasado") => {
    try {
      setIsUpdatingPayment(record.id);
      const payRef = doc(db, "pagamentos", record.id);
      await setDoc(payRef, {
        studentId: record.studentId,
        studentName: record.studentName,
        month: record.month,
        year: record.year,
        amount: record.amount,
        dueDate: record.dueDate,
        status: newStatus,
        paymentMethod: newStatus === "Pago" ? (record.paymentMethod || "PIX") : null,
        paidAt: newStatus === "Pago" ? new Date().toISOString() : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Erro ao atualizar pagamento:", err);
      alert("Erro ao salvar status de pagamento.");
    } finally {
      setIsUpdatingPayment(null);
    }
  };

  // Generate PDF function for Enrollments
  const handleGenerateEnrollmentPDF = () => {
    try {
      const docPDF = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = docPDF.internal.pageSize.getWidth();
      const pageHeight = docPDF.internal.pageSize.getHeight();

      // Brand Color Variables
      const primaryTeal = [1, 106, 134]; // #016a86
      const darkSlate = [15, 23, 42]; // #0f172a
      const lightSlate = [248, 250, 252]; // #f8fafc

      // Header Banner
      docPDF.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.rect(0, 0, pageWidth, 32, "F");

      // Header Title
      docPDF.setTextColor(255, 255, 255);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(16);
      docPDF.text("INTERVALO ESCOLA DE TEATRO", 14, 15);

      docPDF.setFont("helvetica", "normal");
      docPDF.setFontSize(9);
      docPDF.text("DEPARTAMENTO DE GESTÃO FINANCEIRA E PEDAGÓGICA", 14, 22);
      
      const now = new Date();
      const dateFormatted = now.toLocaleDateString("pt-BR") + " às " + now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
      docPDF.setFontSize(8);
      docPDF.text(`Emissão: ${dateFormatted}`, pageWidth - 14, 22, { align: "right" });

      // Document Subheader
      docPDF.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(13);
      docPDF.text("RELATÓRIO OFICIAL DE MATRÍCULAS", 14, 42);

      // Info Box / Metrics
      docPDF.setFillColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      docPDF.roundedRect(14, 46, pageWidth - 28, 20, 2, 2, "F");

      docPDF.setFontSize(8);
      docPDF.setFont("helvetica", "bold");
      docPDF.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.text("RESUMO DE REGISTROS", 18, 52);

      docPDF.setFont("helvetica", "normal");
      docPDF.setTextColor(71, 85, 105);
      docPDF.text(`Filtro de Status: ${statusFilter.toUpperCase()}`, 18, 58);
      docPDF.text(`Total Exibido: ${filteredEnrollments.length}`, 80, 58);
      docPDF.text(`Matrículas Ativas: ${matriculasAtivas}`, 130, 58);
      docPDF.text(`Matrículas Inativas: ${matriculasInativas}`, 175, 58, { align: "right" });

      // Table Data Preparation
      const tableRows = filteredEnrollments.map((item, index) => {
        let dateFormatted = item.enrollmentDate;
        if (dateFormatted && dateFormatted.includes("-")) {
          const parts = dateFormatted.split("-");
          if (parts.length === 3) {
            dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
          }
        }

        const classLabel = `${item.classType} (${item.classCode})${item.classWeekday ? ' - ' + item.classWeekday : ''}`;

        return [
          String(index + 1),
          item.studentName,
          item.studentCpf,
          classLabel,
          dateFormatted,
          item.statusLabel.toUpperCase()
        ];
      });

      // Render AutoTable
      autoTable(docPDF, {
        startY: 72,
        head: [["#", "Nome do Aluno", "CPF", "Turma", "Data Matrícula", "Status"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [1, 106, 134],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left"
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 55 },
          2: { cellWidth: 32 },
          3: { cellWidth: 48 },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 15, halign: "center", fontStyle: "bold" }
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 5) {
            if (data.cell.raw === "ATIVA") {
              data.cell.styles.textColor = [16, 122, 87]; // Emerald green
            } else {
              data.cell.styles.textColor = [225, 29, 72]; // Rose red
            }
          }
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = (docPDF as any).internal.getNumberOfPages();
          const currentPage = data.pageNumber;

          docPDF.setDrawColor(226, 232, 240);
          docPDF.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

          docPDF.setFontSize(7);
          docPDF.setFont("helvetica", "bold");
          docPDF.setTextColor(148, 163, 184);
          docPDF.text("INTERVALO ESCOLA DE TEATRO • MÓDULO FINANCEIRO", 14, pageHeight - 9);

          docPDF.text(`Página ${currentPage} de ${pageCount}`, pageWidth - 14, pageHeight - 9, { align: "right" });
        },
        margin: { top: 35, bottom: 20, left: 14, right: 14 }
      });

      // Save PDF
      docPDF.save(`Lista_Matriculas_Intervalo_${statusFilter.toLowerCase()}_${now.toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Erro ao gerar arquivo PDF das matrículas.");
    }
  };

  // Generate PDF for Payments
  const handleGeneratePaymentPDF = () => {
    try {
      const docPDF = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = docPDF.internal.pageSize.getWidth();
      const pageHeight = docPDF.internal.pageSize.getHeight();

      const primaryTeal = [1, 106, 134];
      const darkSlate = [15, 23, 42];

      // Header Banner
      docPDF.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.rect(0, 0, pageWidth, 32, "F");

      docPDF.setTextColor(255, 255, 255);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(16);
      docPDF.text("INTERVALO ESCOLA DE TEATRO", 14, 15);

      docPDF.setFont("helvetica", "normal");
      docPDF.setFontSize(9);
      docPDF.text(`RELATÓRIO FINANCEIRO DE PAGAMENTOS - ${MONTHS_PT[selectedMonth].toUpperCase()} / ${selectedYear}`, 14, 22);

      const now = new Date();
      docPDF.setFontSize(8);
      docPDF.text(`Emissão: ${now.toLocaleDateString("pt-BR")}`, pageWidth - 14, 22, { align: "right" });

      // Summary
      docPDF.setFillColor(248, 250, 252);
      docPDF.roundedRect(14, 40, pageWidth - 28, 20, 2, 2, "F");

      docPDF.setFontSize(8);
      docPDF.setFont("helvetica", "bold");
      docPDF.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      docPDF.text("BALANÇO FINANCEIRO DO MÊS", 18, 46);

      docPDF.setFont("helvetica", "normal");
      docPDF.setTextColor(71, 85, 105);
      docPDF.text(`Previsto Total: R$ ${totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 18, 52);
      docPDF.text(`Recebido: R$ ${totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 80, 52);
      docPDF.text(`Pendente: R$ ${totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 135, 52);
      docPDF.text(`Adimplência: ${adimplencia}%`, 175, 52, { align: "right" });

      const tableRows = filteredPayments.map((item, index) => [
        String(index + 1),
        item.studentName,
        item.studentCpf,
        item.className,
        `R$ ${item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        item.dueDate ? item.dueDate.split("-").reverse().join("/") : "-",
        item.status.toUpperCase()
      ]);

      autoTable(docPDF, {
        startY: 65,
        head: [["#", "Nome do Aluno", "CPF", "Turmas", "Valor", "Vencimento", "Status"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [1, 106, 134],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 42 },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 20, halign: "center" },
          6: { cellWidth: 18, halign: "center", fontStyle: "bold" }
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 6) {
            if (data.cell.raw === "PAGO") {
              data.cell.styles.textColor = [16, 122, 87];
            } else if (data.cell.raw === "ATRASADO") {
              data.cell.styles.textColor = [225, 29, 72];
            } else {
              data.cell.styles.textColor = [217, 119, 6];
            }
          }
        },
        didDrawPage: (data) => {
          const pageCount = (docPDF as any).internal.getNumberOfPages();
          docPDF.setDrawColor(226, 232, 240);
          docPDF.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

          docPDF.setFontSize(7);
          docPDF.setFont("helvetica", "bold");
          docPDF.setTextColor(148, 163, 184);
          docPDF.text("INTERVALO ESCOLA DE TEATRO • DEPARTAMENTO FINANCEIRO", 14, pageHeight - 9);

          docPDF.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth - 14, pageHeight - 9, { align: "right" });
        },
        margin: { top: 35, bottom: 20, left: 14, right: 14 }
      });

      docPDF.save(`Relatorio_Pagamentos_${MONTHS_PT[selectedMonth]}_${selectedYear}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF de pagamentos:", err);
      alert("Erro ao gerar PDF do relatório financeiro.");
    }
  };

  return (
    <motion.div
      key="financial-management-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
    >
      {/* Sidebar / Left Column */}
      <div className="bg-gradient-to-br from-[#016a86] to-[#004e63] p-8 text-center relative overflow-hidden flex flex-col items-center justify-between gap-6 md:w-[320px] md:p-10 shrink-0 md:min-h-screen">
        <div className="flex flex-col items-center w-full">
          <div className="self-start mb-4">
            <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
          </div>

          <Logo className="h-16 md:h-24 w-auto mb-3" />
          <h1 className="text-white text-xl md:text-2xl font-black tracking-tighter">Módulo Financeiro</h1>
          <p className="text-teal-50/70 text-[10px] md:text-xs uppercase tracking-[0.3em] font-black leading-tight mt-1">
            Intervalo Escola de Teatro
          </p>
        </div>

        {/* Tab Selection Controls in Sidebar */}
        <div className="w-full space-y-3 bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("matriculas")}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-3 transition-all ${
              activeTab === "matriculas"
                ? "bg-white text-[#016a86] shadow-lg shadow-black/10 font-black scale-[1.02]"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Users size={18} />
            Gestão de Matrículas
          </button>

          <button
            onClick={() => setActiveTab("pagamentos")}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-3 transition-all ${
              activeTab === "pagamentos"
                ? "bg-white text-[#016a86] shadow-lg shadow-black/10 font-black scale-[1.02]"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <CreditCard size={18} />
            Gestão de Pagamentos
          </button>
        </div>

        <div className="text-[10px] text-teal-100/60 font-bold uppercase tracking-widest pt-4 border-t border-white/10 w-full">
          Painel Administrativo
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-12 flex-1 md:overflow-y-auto bg-slate-50/50 flex flex-col min-h-screen">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-pro-teal uppercase tracking-wider mb-1">
                <Wallet size={16} />
                <span>Gestão Estratégica & Financeira</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                {activeTab === "matriculas" ? "Gestão de Matrículas" : "Gestão de Pagamentos & Mensalidades"}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                {activeTab === "matriculas" 
                  ? "Acompanhe e exporte relatórios de todos os alunos matriculados nas turmas da escola."
                  : "Controle o fluxo de recebimentos, mensalidades e status financeiro dos alunos."}
              </p>
            </div>

            {/* Export PDF Action Button */}
            <div className="shrink-0">
              {activeTab === "matriculas" ? (
                <button
                  onClick={handleGenerateEnrollmentPDF}
                  className="w-full md:w-auto px-6 py-3.5 bg-[#016a86] hover:bg-[#005167] text-white font-bold text-xs md:text-sm rounded-2xl shadow-lg shadow-[#016a86]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Download size={18} />
                  <span>Baixar Lista em PDF</span>
                </button>
              ) : (
                <button
                  onClick={handleGeneratePaymentPDF}
                  className="w-full md:w-auto px-6 py-3.5 bg-[#016a86] hover:bg-[#005167] text-white font-bold text-xs md:text-sm rounded-2xl shadow-lg shadow-[#016a86]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileText size={18} />
                  <span>Baixar Relatório PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: GESTÃO DE MATRÍCULAS */}
          {activeTab === "matriculas" && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Registros</span>
                    <Users size={18} className="text-[#016a86]" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-black text-slate-800">{totalMatriculas}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">Matrículas cadastradas</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-[10px] font-black uppercase tracking-wider">Matrículas Ativas</span>
                    <UserCheck size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-black text-emerald-600">{matriculasAtivas}</div>
                    <div className="text-[10px] font-bold text-emerald-600/70 mt-0.5">Alunos ativos em turma</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-rose-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">Inativas</span>
                    <UserX size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-black text-rose-500">{matriculasInativas}</div>
                    <div className="text-[10px] font-bold text-rose-400 mt-0.5">Trancadas ou encerradas</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-sky-600">
                    <span className="text-[10px] font-black uppercase tracking-wider">Taxa Ativa</span>
                    <TrendingUp size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-black text-sky-600">{taxaAtividade}%</div>
                    <div className="text-[10px] font-bold text-sky-500/70 mt-0.5">Retenção de alunos</div>
                  </div>
                </div>
              </div>

              {/* Filters & Search Controls */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                  
                  {/* Status Filter Buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full lg:w-auto">
                    {(["Todas", "Ativas", "Inativas"] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`flex-1 lg:flex-none px-5 py-2 rounded-lg text-xs font-black transition-all ${
                          statusFilter === st
                            ? "bg-white text-[#016a86] shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {st === "Todas" ? "Todas" : st === "Ativas" ? "Matrículas Ativas" : "Matrículas Inativas"}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nome, CPF ou turma..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#016a86]/20 focus:border-[#016a86]"
                    />
                  </div>
                </div>

                {/* Class Select Filter */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">Filtrar por Turma:</span>
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-700 text-xs focus:outline-none focus:border-[#016a86]"
                  >
                    <option value="Todas">Todas as Turmas ({classes.length})</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.type} ({c.code}) - {c.weekday}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Enrolled Students List */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-sm md:text-base flex items-center gap-2">
                    <span>Lista de Alunos Matriculados</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#016a86]/10 text-[#016a86] text-xs font-extrabold">
                      {filteredEnrollments.length}
                    </span>
                  </h3>

                  <div className="text-xs text-slate-400 font-bold">
                    Exibindo {filteredEnrollments.length} de {allEnrollmentRecords.length} matrículas
                  </div>
                </div>

                {filteredEnrollments.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <Users size={36} className="mx-auto text-slate-300" />
                    <p className="text-slate-500 font-bold text-sm">Nenhuma matrícula encontrada com os filtros selecionados.</p>
                    <p className="text-slate-400 text-xs">Tente alterar o termo de busca ou o status selecionado.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredEnrollments.map((record) => (
                      <div 
                        key={record.id}
                        className="p-4 md:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Student Info */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <Avatar src={record.studentPhoto} fallbackSize={28} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-slate-800 text-sm md:text-base truncate">
                                {record.studentName}
                              </h4>
                              {record.studentSocialName && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">
                                  ({record.studentSocialName})
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                              <span>CPF: <strong className="text-slate-700">{record.studentCpf}</strong></span>
                              {record.studentEmail && <span>Email: <span className="text-slate-600">{record.studentEmail}</span></span>}
                              {record.studentPhone && <span>Tel: <span className="text-slate-600">{record.studentPhone}</span></span>}
                            </div>
                          </div>
                        </div>

                        {/* Class and Enrollment Date Info */}
                        <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-between md:justify-end">
                          <div className="text-left md:text-right">
                            <div className="text-xs font-black text-slate-800">
                              {record.classType} <span className="text-[#016a86]">({record.classCode})</span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                              {record.classWeekday} {record.classTime ? `• ${record.classTime}` : ""}
                            </div>
                          </div>

                          <div className="text-center md:text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Matrícula</div>
                            <div className="text-xs font-bold text-slate-700 mt-0.5">
                              {record.enrollmentDate ? record.enrollmentDate.split('-').reverse().join('/') : "N/D"}
                            </div>
                          </div>

                          {/* Payment Condition Badge & Toggle */}
                          <div className="shrink-0 text-center">
                            <button
                              type="button"
                              onClick={async () => {
                                const newType = record.paymentType === "Isento" ? "Pagante" : "Isento";
                                try {
                                  await updateDoc(doc(db, "classes", record.classId), {
                                    [`studentPaymentTypes.${record.studentId}`]: newType
                                  });
                                } catch (err) {
                                  alert("Erro ao alterar condição de pagamento.");
                                }
                              }}
                              title="Clique para alternar entre Pagante e Isento"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                                record.paymentType === "Isento"
                                  ? "bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200"
                                  : "bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100"
                              }`}
                            >
                              <DollarSign size={12} />
                              {record.paymentType}
                            </button>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            {record.isEnrollmentActive ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-xs">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-black text-xs">
                                <XCircle size={14} className="text-rose-500" />
                                Inativa
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DE PAGAMENTOS */}
          {activeTab === "pagamentos" && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Payment Month / Year Selector */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-[#016a86]" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">Competência Financeira</h3>
                    <p className="text-xs text-slate-400">Selecione o mês e ano de referência das mensalidades</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-[#016a86]"
                  >
                    {MONTHS_PT.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 focus:outline-none focus:border-[#016a86]"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-black uppercase tracking-wider">Previsto Total</span>
                    <DollarSign size={18} className="text-slate-600" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-slate-800">
                      R$ {totalPrevisto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">Mensalidades do mês</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-emerald-600">
                    <span className="text-[10px] font-black uppercase tracking-wider">Total Recebido</span>
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-emerald-600">
                      R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-600/70 mt-0.5">Pagamentos confirmados</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-amber-500">
                    <span className="text-[10px] font-black uppercase tracking-wider">A Receber / Pendente</span>
                    <Clock size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-amber-600">
                      R$ {totalPendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] font-bold text-amber-500 mt-0.5">Aguardando pagamento</div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-sky-600">
                    <span className="text-[10px] font-black uppercase tracking-wider">Taxa de Adimplência</span>
                    <TrendingUp size={18} />
                  </div>
                  <div className="mt-3">
                    <div className="text-xl md:text-2xl font-black text-sky-600">{adimplencia}%</div>
                    <div className="text-[10px] font-bold text-sky-500/70 mt-0.5">Índice do mês corrente</div>
                  </div>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full lg:w-auto">
                  {(["Todos", "Pago", "Pendente", "Atrasado", "Isento"] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setPaymentStatusFilter(st)}
                      className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${
                        paymentStatusFilter === st
                          ? "bg-white text-[#016a86] shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="relative w-full lg:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Buscar por aluno ou CPF..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#016a86]/20 focus:border-[#016a86]"
                  />
                </div>
              </div>

              {/* Payments Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-black text-slate-800 text-sm md:text-base flex items-center gap-2">
                    <span>Lista de Pagamentos ({MONTHS_PT[selectedMonth]} / {selectedYear})</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#016a86]/10 text-[#016a86] text-xs font-extrabold">
                      {filteredPayments.length}
                    </span>
                  </h3>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <CreditCard size={36} className="mx-auto text-slate-300" />
                    <p className="text-slate-500 font-bold text-sm">Nenhum registro financeiro encontrado.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredPayments.map((item) => (
                      <div 
                        key={item.id}
                        className="p-4 md:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-800 text-sm md:text-base">{item.studentName}</h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium mt-1">
                            <span>CPF: <strong className="text-slate-700">{item.studentCpf}</strong></span>
                            <span>Turma: <span className="text-[#016a86] font-bold">{item.className}</span></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 justify-between md:justify-end">
                          <div className="text-left md:text-right">
                            <div className="text-xs font-black text-slate-800">
                              R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                              Vencimento: {item.dueDate ? item.dueDate.split("-").reverse().join("/") : "10/" + String(selectedMonth + 1).padStart(2, '0')}
                            </div>
                          </div>

                          {/* Quick Action Button to toggle payment status */}
                          <div className="flex items-center gap-2">
                            {item.status === "Isento" ? (
                              <span className="px-3.5 py-1.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-black text-xs flex items-center gap-1.5">
                                <Award size={14} />
                                Isento
                              </span>
                            ) : item.status === "Pago" ? (
                              <button
                                onClick={() => handleTogglePaymentStatus(item, "Pendente")}
                                disabled={isUpdatingPayment === item.id}
                                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-rose-50 text-emerald-700 hover:text-rose-600 border border-emerald-200 hover:border-rose-200 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all group cursor-pointer"
                                title="Clique para marcar como pendente"
                              >
                                <Check size={14} className="group-hover:hidden" />
                                <RefreshCw size={14} className="hidden group-hover:block animate-spin" />
                                <span className="group-hover:hidden">Pago</span>
                                <span className="hidden group-hover:inline">Desfazer</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTogglePaymentStatus(item, "Pago")}
                                disabled={isUpdatingPayment === item.id}
                                className="px-3.5 py-1.5 bg-[#016a86] hover:bg-[#004e63] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] cursor-pointer"
                              >
                                <Check size={14} />
                                <span>Marcar Pago</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
};
