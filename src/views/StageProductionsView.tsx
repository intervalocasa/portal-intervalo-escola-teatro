/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Clapperboard, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Layers, 
  User, 
  Phone, 
  Mail, 
  Theater, 
  Palette, 
  Lightbulb, 
  Shirt, 
  Printer, 
  Trash2, 
  Plus, 
  Search, 
  ChevronDown,
  ChevronUp,
  Upload,
  FileCheck,
  Download,
  ExternalLink,
  Info,
  Boxes,
  Volume2,
  Brush,
  Clock,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { 
  StageProductionProposal, 
  StageProductionRole, 
  StageProductionGenre, 
  PriorityLevel, 
  ProductionNeedItem,
  TechnicalDocumentAttachment,
  UserRole 
} from "../types";
import { 
  validateStageProductionProposal, 
  createStageProductionProposal, 
  updateStageProductionStatus, 
  deleteStageProductionProposal,
  STAGE_PRODUCTIONS_COLLECTION 
} from "../services/stageProductionService";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { BackButton, Logo } from "../components/CommonComponents";

interface StageProductionsViewProps {
  currentUser: any;
  users: any[];
  userRole?: UserRole | string;
  setView: (view: any) => void;
  showNotification?: (message: string, title?: string, type?: "success" | "error" | "warning") => void;
}

const GENRE_OPTIONS: StageProductionGenre[] = [
  "Drama",
  "Comédia",
  "Musical",
  "Dança",
  "Mostra de Artes Visuais",
  "Outro"
];

const ROLE_OPTIONS: StageProductionRole[] = [
  "Professor",
  "Diretor",
  "Professor/Diretor",
  "Outro"
];

const createEmptyItem = (): ProductionNeedItem => ({
  id: Math.random().toString(36).substring(2, 9),
  item: "",
  priority: "Desejável",
  indispensableReason: ""
});

export const StageProductionsView: React.FC<StageProductionsViewProps> = ({
  currentUser,
  users,
  userRole,
  setView,
  showNotification
}) => {
  const [activeTab, setActiveTab] = useState<"form" | "list">("form");
  const [proposals, setProposals] = useState<StageProductionProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProposalForFicha, setSelectedProposalForFicha] = useState<StageProductionProposal | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedProposal, setLastCreatedProposal] = useState<StageProductionProposal | null>(null);

  // Profile data
  const userProfile = users.find(u => u.id === currentUser?.uid || u.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  // Form State
  const [formData, setFormData] = useState<Omit<StageProductionProposal, "id" | "createdAt" | "updatedAt">>({
    proponentName: userProfile?.name || userProfile?.artisticName || "",
    proponentRole: (userProfile?.role === "Professor" ? "Professor" : "Professor/Diretor") as StageProductionRole,
    proponentEmail: userProfile?.email || currentUser?.email || "",
    proponentPhone: userProfile?.phone || "",
    proponentUserId: currentUser?.uid || "",
    title: "",
    genre: "Drama",
    synopsis: "",
    pedagogicalProposal: "",
    castProfile: "",
    scenographyItems: [createEmptyItem()],
    scenographyNotes: "",
    techItems: [createEmptyItem()],
    techNotes: "",
    otherNeedsItems: [createEmptyItem()],
    otherNeedsNotes: "",
    scenographyPdf: null,
    costumePdf: null,
    lightingPdf: null,
    termsAccepted: false,
    status: "pendente"
  });

  // Check Permissions: Gestor, Diretor Pedagógico, or Professor
  const isGestor = 
    userRole === "Gestor" || 
    userRole === "Diretor Pedagógico" || 
    userRole === "Diretor Pedagógico e Professor" || 
    userRole === "Auxiliar Administrativo";

  const isProfessor = 
    userRole === "Professor" || 
    userRole === "Diretor Pedagógico e Professor";

  const hasAccess = isGestor || isProfessor;

  // Real-time Firestore sync
  useEffect(() => {
    if (!hasAccess) return;

    const q = query(collection(db, STAGE_PRODUCTIONS_COLLECTION), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: StageProductionProposal[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      setProposals(items);
      setLoadingProposals(false);
    }, (error) => {
      console.error("Error loading stage productions:", error);
      setLoadingProposals(false);
    });

    return () => unsubscribe();
  }, [hasAccess]);

  // Pre-fill user data when available
  useEffect(() => {
    if (userProfile && !formData.proponentName) {
      setFormData(prev => ({
        ...prev,
        proponentName: userProfile.name || userProfile.artisticName || prev.proponentName,
        proponentEmail: userProfile.email || prev.proponentEmail,
        proponentPhone: userProfile.phone || prev.proponentPhone,
        proponentUserId: userProfile.id || prev.proponentUserId
      }));
    }
  }, [userProfile]);

  // Handlers for item lists
  const handleAddItem = (field: "scenographyItems" | "techItems" | "otherNeedsItems") => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], createEmptyItem()]
    }));
  };

  const handleRemoveItem = (field: "scenographyItems" | "techItems" | "otherNeedsItems", index: number) => {
    setFormData(prev => {
      const current = [...prev[field]];
      if (current.length <= 1) {
        return {
          ...prev,
          [field]: [createEmptyItem()]
        };
      }
      current.splice(index, 1);
      return {
        ...prev,
        [field]: current
      };
    });
  };

  const handleUpdateItem = (
    field: "scenographyItems" | "techItems" | "otherNeedsItems",
    index: number,
    key: keyof ProductionNeedItem,
    value: any
  ) => {
    setFormData(prev => {
      const current = [...prev[field]];
      current[index] = {
        ...current[index],
        [key]: value
      };
      if (key === "priority" && value === "Desejável") {
        current[index].indispensableReason = "";
      }
      return {
        ...prev,
        [field]: current
      };
    });

    // Clear item errors
    const errorKeyItem = `${field.replace("Items", "Item")}_${index}`;
    const errorKeyReason = `${field.replace("Items", "Reason")}_${index}`;
    if (errors[errorKeyItem] || errors[errorKeyReason] || errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errorKeyItem];
        delete next[errorKeyReason];
        delete next[field];
        return next;
      });
    }
  };

  // PDF File Upload Handler
  const handleFileUpload = (
    docType: "scenographyPdf" | "costumePdf" | "lightingPdf",
    file: File
  ) => {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      if (showNotification) {
        showNotification("Apenas arquivos no formato PDF são aceitos.", "Formato Inválido", "error");
      }
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      if (showNotification) {
        showNotification("O arquivo deve ter no máximo 15 MB.", "Arquivo muito grande", "error");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const attachment: TechnicalDocumentAttachment = {
        name: file.name,
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString()
      };

      setFormData(prev => ({
        ...prev,
        [docType]: attachment
      }));

      // Clear error for this docType
      if (errors[docType]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[docType];
          return next;
        });
      }

      if (showNotification) {
        showNotification(`Arquivo "${file.name}" carregado com sucesso.`, "PDF Anexado", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = (docType: "scenographyPdf" | "costumePdf" | "lightingPdf") => {
    setFormData(prev => ({
      ...prev,
      [docType]: null
    }));
  };

  const resetForm = () => {
    setFormData({
      proponentName: userProfile?.name || userProfile?.artisticName || "",
      proponentRole: (userProfile?.role === "Professor" ? "Professor" : "Professor/Diretor") as StageProductionRole,
      proponentEmail: userProfile?.email || currentUser?.email || "",
      proponentPhone: userProfile?.phone || "",
      proponentUserId: currentUser?.uid || "",
      title: "",
      genre: "Drama",
      synopsis: "",
      pedagogicalProposal: "",
      castProfile: "",
      scenographyItems: [createEmptyItem()],
      scenographyNotes: "",
      techItems: [createEmptyItem()],
      techNotes: "",
      otherNeedsItems: [createEmptyItem()],
      otherNeedsNotes: "",
      scenographyPdf: null,
      costumePdf: null,
      lightingPdf: null,
      termsAccepted: false,
      status: "pendente"
    });
    setErrors({});
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = validateStageProductionProposal(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      if (showNotification) {
        showNotification(firstError, "Atenção no Preenchimento", "warning");
      }
      window.scrollTo({ top: 200, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    try {
      const proposalPayload = {
        ...formData,
        proponentUserId: currentUser?.uid || userProfile?.id || "",
        status: "pendente" as const
      };

      const newId = await createStageProductionProposal(proposalPayload);
      
      const createdObj: StageProductionProposal = {
        id: newId,
        ...proposalPayload,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setLastCreatedProposal(createdObj);
      setShowSuccessModal(true);

      if (showNotification) {
        showNotification("Proposta submetida com sucesso! A Ficha de Inscrição da Montagem foi gerada.", "Sucesso!", "success");
      }

      resetForm();
    } catch (err: any) {
      console.error("Error submitting stage production:", err);
      if (showNotification) {
        showNotification("Erro ao submeter proposta. Tente novamente.", "Erro", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (proposalId: string, newStatus: StageProductionProposal["status"]) => {
    try {
      const feedback = feedbackInput[proposalId] || "";
      await updateStageProductionStatus(
        proposalId,
        newStatus,
        feedback,
        currentUser?.uid,
        userProfile?.name || "Gestão"
      );
      if (showNotification) {
        showNotification(`Status da proposta alterado para "${newStatus}".`, "Status Atualizado", "success");
      }
      if (selectedProposalForFicha?.id === proposalId) {
        setSelectedProposalForFicha(prev => prev ? { ...prev, status: newStatus, feedback } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      if (showNotification) {
        showNotification("Erro ao atualizar status.", "Erro", "error");
      }
    }
  };

  const handleDelete = async (proposalId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta proposta de montagem?")) return;
    try {
      await deleteStageProductionProposal(proposalId);
      if (showNotification) {
        showNotification("Proposta excluída com sucesso.", "Excluído", "success");
      }
      if (selectedProposalForFicha?.id === proposalId) {
        setSelectedProposalForFicha(null);
      }
    } catch (err) {
      console.error("Error deleting proposal:", err);
      if (showNotification) {
        showNotification("Erro ao excluir proposta.", "Erro", "error");
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const countTotalIndispensables = (proposal: StageProductionProposal) => {
    let count = 0;
    proposal.scenographyItems?.forEach(i => { if (i.priority === "Indispensável") count++; });
    proposal.techItems?.forEach(i => { if (i.priority === "Indispensável") count++; });
    proposal.otherNeedsItems?.forEach(i => { if (i.priority === "Indispensável") count++; });
    return count;
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Área Restrita</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              A área de <strong>Montagens e Apresentações</strong> é de acesso exclusivo para Gestores e Professores da Escola Intervalo.
            </p>
          </div>
          <button 
            onClick={() => setView("dashboard")}
            className="w-full py-4 bg-pro-teal text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#014e63] transition-all flex items-center justify-center gap-2"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>
    );
  }

  // Filtered proposals
  const filteredProposals = proposals.filter(p => {
    const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
    const matchesSearch = 
      (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.proponentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.genre || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 pb-24">
      {/* Header institucional */}
      <div className="bg-gradient-to-r from-[#016a86] to-[#004e63] text-white py-10 px-6 md:px-12 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <BackButton onClick={() => setView("dashboard")} className="!text-white/80 hover:!text-white" />
              <span className="px-3 py-1 bg-pro-yellow text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm">
                Área Artística & Pedagógica
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3">
              <Clapperboard className="text-pro-yellow" size={32} />
              Montagens e Apresentações
            </h1>
            <p className="text-teal-100/80 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              Submissão detalhada de necessidades de produção item a item, upload obrigatório de projetos técnicos em PDF e emissão da Ficha de Inscrição.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === "form" 
                  ? "bg-white text-pro-teal shadow-md" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Plus size={16} />
              Nova Proposta
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === "list" 
                  ? "bg-white text-pro-teal shadow-md" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <FileText size={16} />
              Propostas ({proposals.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
        {activeTab === "form" ? (
          /* FORMULÁRIO COMPLETO */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-8"
          >
            <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200/80 space-y-8">
              <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Sparkles className="text-pro-teal" size={24} />
                    Ficha de Inscrição de Montagem e Espetáculo
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-1">
                    Cadastre a obra, insira os itens de produção com sua prioridade individual e anexe os projetos técnicos em PDF.
                  </p>
                </div>
                <div className="bg-teal-50 border border-teal-200/60 px-4 py-2 rounded-2xl text-[11px] font-bold text-pro-teal">
                  Autor: <strong>{formData.proponentName || "Professor/Diretor"}</strong>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                {/* SEÇÃO 1: DADOS DO PROPONENTE */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                      1
                    </div>
                    <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                      Dados do Proponente
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nome Completo */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={13} className="text-pro-teal" />
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.proponentName}
                        onChange={(e) => {
                          setFormData(p => ({ ...p, proponentName: e.target.value }));
                          if (errors.proponentName) setErrors(p => { const n = { ...p }; delete n.proponentName; return n; });
                        }}
                        placeholder="Nome completo do proponente"
                        className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm font-semibold outline-none transition-all ${
                          errors.proponentName ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                        }`}
                      />
                      {errors.proponentName && <p className="text-xs text-red-500 font-bold">{errors.proponentName}</p>}
                    </div>

                    {/* Cargo / Função na Montagem */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={13} className="text-pro-teal" />
                        Cargo / Função na Montagem *
                      </label>
                      <select
                        value={formData.proponentRole}
                        onChange={(e) => setFormData(p => ({ ...p, proponentRole: e.target.value as StageProductionRole }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-pro-teal focus:bg-white transition-all"
                      >
                        {ROLE_OPTIONS.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    {/* E-mail Institucional */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Mail size={13} className="text-pro-teal" />
                        E-mail Institucional *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.proponentEmail}
                        onChange={(e) => {
                          setFormData(p => ({ ...p, proponentEmail: e.target.value }));
                          if (errors.proponentEmail) setErrors(p => { const n = { ...p }; delete n.proponentEmail; return n; });
                        }}
                        placeholder="exemplo@intervalocasa.com"
                        className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm font-semibold outline-none transition-all ${
                          errors.proponentEmail ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                        }`}
                      />
                      {errors.proponentEmail && <p className="text-xs text-red-500 font-bold">{errors.proponentEmail}</p>}
                    </div>

                    {/* Telefone / WhatsApp */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone size={13} className="text-pro-teal" />
                        Telefone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.proponentPhone}
                        onChange={(e) => {
                          setFormData(p => ({ ...p, proponentPhone: e.target.value }));
                          if (errors.proponentPhone) setErrors(p => { const n = { ...p }; delete n.proponentPhone; return n; });
                        }}
                        placeholder="(11) 99999-9999"
                        className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm font-semibold outline-none transition-all ${
                          errors.proponentPhone ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                        }`}
                      />
                      {errors.proponentPhone && <p className="text-xs text-red-500 font-bold">{errors.proponentPhone}</p>}
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 2: IDENTIFICAÇÃO DA OBRA */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                      2
                    </div>
                    <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                      Identificação da Obra
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Título do Espetáculo/Mostra */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Theater size={13} className="text-pro-teal" />
                        Título do Espetáculo / Mostra *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => {
                          setFormData(p => ({ ...p, title: e.target.value }));
                          if (errors.title) setErrors(p => { const n = { ...p }; delete n.title; return n; });
                        }}
                        placeholder="Ex: Sonho de uma Noite de Verão, Mostra de Cenas Contemporâneas..."
                        className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm font-semibold outline-none transition-all ${
                          errors.title ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                        }`}
                      />
                      {errors.title && <p className="text-xs text-red-500 font-bold">{errors.title}</p>}
                    </div>

                    {/* Gênero */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Palette size={13} className="text-pro-teal" />
                        Gênero *
                      </label>
                      <select
                        value={formData.genre}
                        onChange={(e) => setFormData(p => ({ ...p, genre: e.target.value as StageProductionGenre }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-pro-teal focus:bg-white transition-all"
                      >
                        {GENRE_OPTIONS.map(genre => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sinopse da Obra (sem prioridade, apenas campo descritivo normal) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={13} className="text-pro-teal" />
                      Sinopse da Obra *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.synopsis}
                      onChange={(e) => {
                        setFormData(p => ({ ...p, synopsis: e.target.value }));
                        if (errors.synopsis) setErrors(p => { const n = { ...p }; delete n.synopsis; return n; });
                      }}
                      placeholder="Descreva a premissa dramática, narrativa ou poética do espetáculo/mostra..."
                      className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none transition-all resize-y ${
                        errors.synopsis ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                      }`}
                    />
                    {errors.synopsis && <p className="text-xs text-red-500 font-bold">{errors.synopsis}</p>}
                  </div>
                </div>

                {/* SEÇÃO 3: PROPOSTA PEDAGÓGICA E ELENCO */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                      3
                    </div>
                    <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                      Proposta Pedagógica e Elenco
                    </h3>
                  </div>

                  {/* Proposta Didática (sem prioridade) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-pro-teal" />
                      Proposta Didática / Pedagógica *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.pedagogicalProposal}
                      onChange={(e) => {
                        setFormData(p => ({ ...p, pedagogicalProposal: e.target.value }));
                        if (errors.pedagogicalProposal) setErrors(p => { const n = { ...p }; delete n.pedagogicalProposal; return n; });
                      }}
                      placeholder="Como esta montagem se conecta com o desenvolvimento dos alunos, habilidades teatrais trabalhadas e objetivos de aprendizagem..."
                      className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none transition-all resize-y ${
                        errors.pedagogicalProposal ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                      }`}
                    />
                    {errors.pedagogicalProposal && <p className="text-xs text-red-500 font-bold">{errors.pedagogicalProposal}</p>}
                  </div>

                  {/* Elenco Previsto (sem prioridade) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={13} className="text-pro-teal" />
                      Elenco Previsto (Quantidade, Faixa Etária e Perfil) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.castProfile}
                      onChange={(e) => {
                        setFormData(p => ({ ...p, castProfile: e.target.value }));
                        if (errors.castProfile) setErrors(p => { const n = { ...p }; delete n.castProfile; return n; });
                      }}
                      placeholder="Especifique o número previsto de atores/atrizes, perfil dos personagens, distribuição por turma/nível e dinâmica de ensaios..."
                      className={`w-full p-4 bg-slate-50 border rounded-2xl text-sm font-medium outline-none transition-all resize-y ${
                        errors.castProfile ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                      }`}
                    />
                    {errors.castProfile && <p className="text-xs text-red-500 font-bold">{errors.castProfile}</p>}
                  </div>
                </div>

                {/* SEÇÃO 4: NECESSIDADES DE PRODUÇÃO (ITENS UM POR UM COM SELETOR DESEJÁVEL/INDISPENSÁVEL) */}
                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                        4
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                          Necessidades de Produção
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Adicione os itens de necessidade individualmente em cada subseção e marque a prioridade de cada um.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs font-medium leading-relaxed">
                      <strong>Atenção à Classificação de Prioridade:</strong> Itens marcados como <strong>"Indispensável"</strong> exigem obrigatoriamente a justificativa do porquê a montagem não pode ser realizada sem o recurso. Itens como <strong>"Desejável"</strong> serão atendidos mediante disponibilidade orçamentária e técnica.
                    </div>
                  </div>

                  {/* Subseção A: Cenografia e Adereços */}
                  <ItemizedSection
                    title="Cenografia e Adereços"
                    icon={<Boxes size={18} className="text-pro-teal" />}
                    items={formData.scenographyItems}
                    notes={formData.scenographyNotes || ""}
                    fieldKey="scenographyItems"
                    notesKey="scenographyNotes"
                    itemPlaceholder="Ex: Mesa de madeira rústica, 4 cadeiras de época, tapete vermelho, adereço espada..."
                    errors={errors}
                    onAddItem={() => handleAddItem("scenographyItems")}
                    onRemoveItem={(idx) => handleRemoveItem("scenographyItems", idx)}
                    onUpdateItem={(idx, key, val) => handleUpdateItem("scenographyItems", idx, key, val)}
                    onUpdateNotes={(val) => setFormData(p => ({ ...p, scenographyNotes: val }))}
                  />

                  {/* Subseção B: Iluminação, Som e Vídeo */}
                  <ItemizedSection
                    title="Iluminação, Som e Vídeo (Necessidades Técnicas)"
                    icon={<Lightbulb size={18} className="text-pro-teal" />}
                    items={formData.techItems}
                    notes={formData.techNotes || ""}
                    fieldKey="techItems"
                    notesKey="techNotes"
                    itemPlaceholder="Ex: 2 microfones headset, projetor HDMI, foco de luz azul suave, efeito máquina de fumaça..."
                    errors={errors}
                    onAddItem={() => handleAddItem("techItems")}
                    onRemoveItem={(idx) => handleRemoveItem("techItems", idx)}
                    onUpdateItem={(idx, key, val) => handleUpdateItem("techItems", idx, key, val)}
                    onUpdateNotes={(val) => setFormData(p => ({ ...p, techNotes: val }))}
                  />

                  {/* Subseção C: Outras Necessidades (Figurino, Maquiagem, Logística) */}
                  <ItemizedSection
                    title="Outras Necessidades (Figurino, Maquiagem e Logística)"
                    icon={<Shirt size={18} className="text-pro-teal" />}
                    items={formData.otherNeedsItems}
                    notes={formData.otherNeedsNotes || ""}
                    fieldKey="otherNeedsItems"
                    notesKey="otherNeedsNotes"
                    itemPlaceholder="Ex: 5 capas medievais, tinta facial artística para 8 alunos, transporte de praticáveis..."
                    errors={errors}
                    onAddItem={() => handleAddItem("otherNeedsItems")}
                    onRemoveItem={(idx) => handleRemoveItem("otherNeedsItems", idx)}
                    onUpdateItem={(idx, key, val) => handleUpdateItem("otherNeedsItems", idx, key, val)}
                    onUpdateNotes={(val) => setFormData(p => ({ ...p, otherNeedsNotes: val }))}
                  />
                </div>

                {/* SEÇÃO 5: ENVIO OBRIGATÓRIO DOS PROJETOS TÉCNICOS (PDFs) */}
                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                      5
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                        Projetos Técnicos Obrigatórios (Arquivos PDF)
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        O envio dos 3 arquivos PDF abaixo é obrigatório para validação da Ficha de Inscrição da Montagem.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* PDF 1: Projeto de Cenografia */}
                    <PdfUploadCard
                      title="Projeto de Cenografia"
                      description="Planta baixa, croqui dos elementos cenográficos e mapa de palco."
                      docType="scenographyPdf"
                      attachment={formData.scenographyPdf}
                      error={errors.scenographyPdf}
                      onUpload={(file) => handleFileUpload("scenographyPdf", file)}
                      onRemove={() => handleRemovePdf("scenographyPdf")}
                      formatFileSize={formatFileSize}
                    />

                    {/* PDF 2: Projeto de Figurino */}
                    <PdfUploadCard
                      title="Projeto de Figurino"
                      description="Pranchas de figurino, cartela de cores, visagismo e maquiagem."
                      docType="costumePdf"
                      attachment={formData.costumePdf}
                      error={errors.costumePdf}
                      onUpload={(file) => handleFileUpload("costumePdf", file)}
                      onRemove={() => handleRemovePdf("costumePdf")}
                      formatFileSize={formatFileSize}
                    />

                    {/* PDF 3: Projeto de Iluminação */}
                    <PdfUploadCard
                      title="Projeto de Iluminação"
                      description="Mapa de luz, afinação dos refletores, canais e roteiro de cenas de luz."
                      docType="lightingPdf"
                      attachment={formData.lightingPdf}
                      error={errors.lightingPdf}
                      onUpload={(file) => handleFileUpload("lightingPdf", file)}
                      onRemove={() => handleRemovePdf("lightingPdf")}
                      formatFileSize={formatFileSize}
                    />
                  </div>
                </div>

                {/* SEÇÃO 6: TERMO DE ACEITE */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                      6
                    </div>
                    <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                      Termo de Aceite e Compromisso
                    </h3>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/70 p-6 rounded-2xl space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                      <input
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={(e) => {
                          setFormData(p => ({ ...p, termsAccepted: e.target.checked }));
                          if (errors.termsAccepted) {
                            setErrors(p => { const n = { ...p }; delete n.termsAccepted; return n; });
                          }
                        }}
                        className="mt-1 w-5 h-5 rounded-lg text-pro-teal focus:ring-pro-teal border-slate-300 transition-all cursor-pointer accent-[#016a86]"
                      />
                      <span className="text-xs md:text-sm font-bold text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">
                        Confirmo a veracidade das informações da Ficha de Inscrição da Montagem, o envio dos projetos técnicos em PDF e estou ciente de que as necessidades assinaladas como "Indispensáveis" serão analisadas detalhadamente pela coordenação técnica e pedagógica. *
                      </span>
                    </label>
                    {errors.termsAccepted && (
                      <p className="text-xs text-red-500 font-bold pl-8">{errors.termsAccepted}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider hover:bg-slate-100 transition-all"
                  >
                    Limpar Formulário
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#016a86] to-[#004e63] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 shadow-xl shadow-teal-900/10 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando Proposta...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="text-pro-yellow" />
                        Submeter Ficha de Montagem
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          /* LISTA DE PROPOSTAS SUBMETIDAS */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-6"
          >
            {/* Filter Bar */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por título, proponente ou gênero..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-pro-teal focus:bg-white"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {[
                  { id: "todos", label: "Todas" },
                  { id: "pendente", label: "Pendentes" },
                  { id: "em_analise", label: "Em Análise" },
                  { id: "aprovada", label: "Aprovadas" },
                  { id: "ajustes_solicitados", label: "Ajustes" },
                  { id: "rejeitada", label: "Rejeitadas" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                      statusFilter === tab.id
                        ? "bg-pro-teal text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Content */}
            {loadingProposals ? (
              <div className="bg-white p-16 rounded-3xl text-center space-y-3">
                <div className="w-8 h-8 border-4 border-pro-teal/20 border-t-pro-teal rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Carregando propostas de montagem...</p>
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl text-center space-y-4 border border-dashed border-slate-200">
                <Clapperboard size={48} className="text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-700">Nenhuma proposta encontrada</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== "todos" 
                    ? "Tente ajustar seus filtros de busca para encontrar as propostas."
                    : "Seja o primeiro a submeter uma proposta de espetáculo para a escola!"}
                </p>
                <button
                  onClick={() => setActiveTab("form")}
                  className="px-6 py-3 bg-pro-teal text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#014e63] transition-all"
                >
                  Criar Nova Proposta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProposals.map((proposal) => {
                  const statusColors: Record<string, string> = {
                    pendente: "bg-amber-100 text-amber-800 border-amber-200",
                    em_analise: "bg-blue-100 text-blue-800 border-blue-200",
                    aprovada: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    ajustes_solicitados: "bg-purple-100 text-purple-800 border-purple-200",
                    rejeitada: "bg-rose-100 text-rose-800 border-rose-200"
                  };

                  const statusLabels: Record<string, string> = {
                    pendente: "Pendente de Análise",
                    em_analise: "Em Curadoria",
                    aprovada: "Aprovada para Montagem",
                    ajustes_solicitados: "Ajustes Solicitados",
                    rejeitada: "Não Aprovada"
                  };

                  const indispCount = countTotalIndispensables(proposal);

                  return (
                    <div 
                      key={proposal.id}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-pro-teal/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                    >
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${statusColors[proposal.status || "pendente"]}`}>
                            {statusLabels[proposal.status || "pendente"]}
                          </span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg">
                            {proposal.genre}
                          </span>
                          <span className="text-slate-400 text-xs font-medium">
                            {proposal.createdAt?.toDate ? proposal.createdAt.toDate().toLocaleDateString("pt-BR") : "Data recente"}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                            {proposal.title}
                          </h3>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">
                            Proponente: <span className="text-slate-800">{proposal.proponentName}</span> ({proposal.proponentRole}) • {proposal.proponentEmail}
                          </p>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {proposal.synopsis}
                        </p>

                        {/* Badges Info */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                          {indispCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/60">
                              <AlertCircle size={12} />
                              {indispCount} item(ns) indispensável(is)
                            </span>
                          ) : (
                            <span className="text-slate-400">Todos os itens desejáveis</span>
                          )}

                          {/* PDF Status */}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
                            <FileCheck size={12} />
                            3 Projetos em PDF Anexados
                          </span>
                        </div>
                      </div>

                      {/* Action buttons on card */}
                      <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedProposalForFicha(proposal)}
                          className="px-5 py-3 bg-pro-teal text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#014e63] transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <FileText size={15} />
                          Ver Ficha Completa
                        </button>

                        <button
                          onClick={() => {
                            setSelectedProposalForFicha(proposal);
                            setTimeout(() => window.print(), 300);
                          }}
                          className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                          <Printer size={15} />
                          Imprimir Ficha
                        </button>

                        {isGestor && (
                          <button
                            onClick={() => handleDelete(proposal.id!)}
                            className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* MODAL: SUCESSO DO ENVIO */}
      <AnimatePresence>
        {showSuccessModal && lastCreatedProposal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl border border-white"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={44} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  Proposta Inscrita com Sucesso!
                </h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                  A Ficha de Inscrição da Montagem para o espetáculo <strong>"{lastCreatedProposal.title}"</strong> foi gerada com todos os projetos anexados.
                </p>
              </div>

              <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl text-left space-y-1">
                <p className="text-[11px] font-bold text-pro-teal uppercase tracking-wider">Protocolo de Submissão</p>
                <p className="text-xs font-mono font-bold text-slate-700 break-all">{lastCreatedProposal.id}</p>
                <p className="text-[11px] text-slate-500">Status atual: <span className="font-bold text-amber-700">Pendente de Avaliação</span></p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSelectedProposalForFicha(lastCreatedProposal);
                  }}
                  className="w-full py-4 bg-pro-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#014e63] shadow-lg shadow-teal-900/10 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Visualizar e Imprimir Ficha de Inscrição
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setActiveTab("list");
                  }}
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Ir para Lista de Propostas
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: FICHA DE INSCRIÇÃO DA MONTAGEM (DOCUMENTO COMPLETO E IMPRIMÍVEL) */}
      <AnimatePresence>
        {selectedProposalForFicha && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-10 shadow-2xl border border-white space-y-8 print:max-h-none print:shadow-none print:border-none print:p-0"
            >
              {/* Header da Ficha */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
                <div className="flex items-center gap-4">
                  <Logo className="h-16 w-auto" />
                  <div>
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900">
                      Ficha de Inscrição da Montagem
                    </h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Intervalo Escola de Teatro • Curadoria & Produção
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      Protocolo: {selectedProposalForFicha.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="p-3 bg-slate-100 hover:bg-pro-teal hover:text-white text-slate-700 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                    title="Imprimir Ficha Oficial"
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Imprimir Ficha</span>
                  </button>
                  <button
                    onClick={() => setSelectedProposalForFicha(null)}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 print:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Status da Proposta:</span>
                  <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-pro-teal text-white">
                    {selectedProposalForFicha.status || "Pendente"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  Submetido em: {selectedProposalForFicha.createdAt?.toDate ? selectedProposalForFicha.createdAt.toDate().toLocaleString("pt-BR") : "Data de submissão"}
                </div>
              </div>

              {/* Bloco 1: Proponente e Identificação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50/50">
                  <h4 className="text-xs font-black uppercase tracking-wider text-pro-teal flex items-center gap-2 border-b border-slate-200 pb-2">
                    <User size={14} /> Dados do Proponente
                  </h4>
                  <div className="text-xs space-y-1.5 font-medium text-slate-700">
                    <p><strong>Nome:</strong> {selectedProposalForFicha.proponentName}</p>
                    <p><strong>Função / Cargo:</strong> {selectedProposalForFicha.proponentRole}</p>
                    <p><strong>E-mail:</strong> {selectedProposalForFicha.proponentEmail}</p>
                    <p><strong>Telefone / WhatsApp:</strong> {selectedProposalForFicha.proponentPhone}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50/50">
                  <h4 className="text-xs font-black uppercase tracking-wider text-pro-teal flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Theater size={14} /> Identificação da Obra
                  </h4>
                  <div className="text-xs space-y-1.5 font-medium text-slate-700">
                    <p><strong>Título:</strong> {selectedProposalForFicha.title}</p>
                    <p><strong>Gênero:</strong> {selectedProposalForFicha.genre}</p>
                    <p className="pt-1 text-slate-600 italic">"{selectedProposalForFicha.synopsis}"</p>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Proposta Pedagógica e Elenco */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Sparkles size={14} className="text-pro-teal" />
                  Proposta Pedagógica e Elenco
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Proposta Didática / Pedagógica</span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedProposalForFicha.pedagogicalProposal}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Elenco Previsto (Quantidade & Perfil)</span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedProposalForFicha.castProfile}</p>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Necessidades de Produção (Itemizadas) */}
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <Boxes size={14} className="text-pro-teal" />
                  Necessidades de Produção Detalhadas
                </h4>

                {/* Tabela de Cenografia e Adereços */}
                <DisplayItemsTable
                  title="Cenografia e Adereços"
                  items={selectedProposalForFicha.scenographyItems}
                  notes={selectedProposalForFicha.scenographyNotes}
                />

                {/* Tabela de Iluminação, Som e Vídeo */}
                <DisplayItemsTable
                  title="Iluminação, Som e Vídeo (Necessidades Técnicas)"
                  items={selectedProposalForFicha.techItems}
                  notes={selectedProposalForFicha.techNotes}
                />

                {/* Tabela de Outras Necessidades */}
                <DisplayItemsTable
                  title="Outras Necessidades (Figurino, Maquiagem e Logística)"
                  items={selectedProposalForFicha.otherNeedsItems}
                  notes={selectedProposalForFicha.otherNeedsNotes}
                />
              </div>

              {/* Bloco 4: Projetos Técnicos Anexados (PDFs) */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <FileCheck size={14} className="text-pro-teal" />
                  Projetos Técnicos Anexados (Arquivos PDF)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DisplayPdfCard
                    title="Projeto de Cenografia"
                    attachment={selectedProposalForFicha.scenographyPdf}
                    formatFileSize={formatFileSize}
                  />
                  <DisplayPdfCard
                    title="Projeto de Figurino"
                    attachment={selectedProposalForFicha.costumePdf}
                    formatFileSize={formatFileSize}
                  />
                  <DisplayPdfCard
                    title="Projeto de Iluminação"
                    attachment={selectedProposalForFicha.lightingPdf}
                    formatFileSize={formatFileSize}
                  />
                </div>
              </div>

              {/* Bloco 5: Parecer / Feedback da Curadoria (Se houver) */}
              {selectedProposalForFicha.feedback && (
                <div className="p-5 bg-purple-50 border border-purple-200 rounded-2xl space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <MessageSquare size={14} />
                    Parecer da Coordenação / Curadoria:
                  </span>
                  <p className="text-xs text-purple-950 font-medium whitespace-pre-wrap">
                    {selectedProposalForFicha.feedback}
                  </p>
                  {selectedProposalForFicha.reviewedByName && (
                    <p className="text-[10px] text-purple-700 font-bold">
                      Avaliador: {selectedProposalForFicha.reviewedByName}
                    </p>
                  )}
                </div>
              )}

              {/* Área de Gestão de Status (Apenas Gestor) */}
              {isGestor && (
                <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 space-y-4 print:hidden">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-pro-teal" />
                    Painel de Avaliação da Gestão
                  </h4>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-600 uppercase">Parecer / Feedback para o Proponente:</label>
                    <textarea
                      rows={2}
                      defaultValue={selectedProposalForFicha.feedback || ""}
                      onChange={(e) => setFeedbackInput(p => ({ ...p, [selectedProposalForFicha.id!]: e.target.value }))}
                      placeholder="Insira as observações da curadoria ou justificativas de ajustes..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-pro-teal font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, "aprovada")}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Check size={14} /> Aprovar Montagem
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, "em_analise")}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Clock size={14} /> Em Curadoria
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, "ajustes_solicitados")}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <AlertCircle size={14} /> Solicitar Ajustes
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, "rejeitada")}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <X size={14} /> Não Aprovar
                    </button>
                  </div>
                </div>
              )}

              {/* Footer da Ficha */}
              <div className="pt-6 border-t-2 border-slate-900 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <p>Intervalo Escola de Teatro • Todos os direitos reservados</p>
                <p className="font-mono">Ficha de Inscrição Oficial</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* COMPONENTE: SEÇÃO DE ITENS COM ADIÇÃO E PRIORIZAÇÃO INDIVIDUAL */
interface ItemizedSectionProps {
  title: string;
  icon: React.ReactNode;
  items: ProductionNeedItem[];
  notes: string;
  fieldKey: "scenographyItems" | "techItems" | "otherNeedsItems";
  notesKey: "scenographyNotes" | "techNotes" | "otherNeedsNotes";
  itemPlaceholder: string;
  errors: Record<string, string>;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, key: keyof ProductionNeedItem, value: any) => void;
  onUpdateNotes: (value: string) => void;
}

const ItemizedSection: React.FC<ItemizedSectionProps> = ({
  title,
  icon,
  items,
  notes,
  fieldKey,
  itemPlaceholder,
  errors,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onUpdateNotes
}) => {
  const prefix = fieldKey.replace("Items", "");

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-sm font-black text-slate-800 tracking-tight">{title}</h4>
        </div>
        <button
          type="button"
          onClick={onAddItem}
          className="px-3.5 py-1.5 bg-pro-teal text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#014e63] transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Plus size={14} /> Adicionar Item
        </button>
      </div>

      {errors[fieldKey] && (
        <p className="text-xs text-red-500 font-bold">{errors[fieldKey]}</p>
      )}

      {/* Lista de Itens */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const itemErrorKey = `${prefix}Item_${index}`;
          const reasonErrorKey = `${prefix}Reason_${index}`;
          const isIndispensable = item.priority === "Indispensável";

          return (
            <div 
              key={item.id || index}
              className={`p-4 rounded-2xl border transition-all ${
                isIndispensable 
                  ? "bg-amber-50/50 border-amber-300 shadow-sm" 
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black shrink-0">
                  {index + 1}
                </span>

                {/* Descrição do Item */}
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => onUpdateItem(index, "item", e.target.value)}
                    placeholder={itemPlaceholder}
                    className={`w-full p-3 bg-slate-50 border rounded-xl text-xs font-semibold outline-none transition-all ${
                      errors[itemErrorKey] ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal focus:bg-white"
                    }`}
                  />
                  {errors[itemErrorKey] && (
                    <p className="text-[11px] text-red-500 font-bold mt-1">{errors[itemErrorKey]}</p>
                  )}
                </div>

                {/* Seletor Desejável / Indispensável */}
                <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => onUpdateItem(index, "priority", "Desejável")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                      item.priority === "Desejável"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Desejável
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateItem(index, "priority", "Indispensável")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                      item.priority === "Indispensável"
                        ? "bg-amber-500 text-white shadow-sm font-black"
                        : "text-slate-500 hover:text-amber-700"
                    }`}
                  >
                    Indispensável
                  </button>
                </div>

                {/* Botão Remover */}
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                  title="Remover Item"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Campo de Justificativa se Indispensável */}
              <AnimatePresence>
                {isIndispensable && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-amber-200/80 space-y-1"
                  >
                    <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-amber-600" />
                      Motivo da Indispensabilidade para este item *
                    </label>
                    <input
                      type="text"
                      value={item.indispensableReason || ""}
                      onChange={(e) => onUpdateItem(index, "indispensableReason", e.target.value)}
                      placeholder="Explique detalhadamente por que este item é indispensável para a montagem..."
                      className={`w-full p-3 bg-white border rounded-xl text-xs font-semibold outline-none transition-all ${
                        errors[reasonErrorKey] ? "border-red-400 bg-red-50/20" : "border-amber-200 focus:border-amber-500"
                      }`}
                    />
                    {errors[reasonErrorKey] && (
                      <p className="text-[11px] text-red-500 font-bold">{errors[reasonErrorKey]}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Observações adicionais da subseção */}
      <div className="space-y-1.5 pt-2">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Observações adicionais / Conceito geral ({title}) (opcional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder="Comentários adicionais sobre esta área..."
          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-pro-teal transition-all"
        />
      </div>
    </div>
  );
};

/* COMPONENTE: CARD DE UPLOAD DE PDF COM DRAG-AND-DROP E CLIQUE */
interface PdfUploadCardProps {
  title: string;
  description: string;
  docType: "scenographyPdf" | "costumePdf" | "lightingPdf";
  attachment: TechnicalDocumentAttachment | null | undefined;
  error?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
  formatFileSize: (bytes: number) => string;
}

const PdfUploadCard: React.FC<PdfUploadCardProps> = ({
  title,
  description,
  attachment,
  error,
  onUpload,
  onRemove,
  formatFileSize
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
      error 
        ? "border-red-400 bg-red-50/20" 
        : attachment 
          ? "border-emerald-300 bg-emerald-50/30 shadow-sm" 
          : "border-slate-200 bg-slate-50/60 hover:border-pro-teal/40"
    }`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <FileText size={15} className="text-pro-teal" />
            {title} *
          </h4>
          {attachment ? (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase">
              Anexado
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg uppercase">
              Obrigatório
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
      </div>

      <div className="mt-4">
        {attachment ? (
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <FileCheck size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-800 truncate" title={attachment.name}>
                  {attachment.name}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {formatFileSize(attachment.size)} • PDF
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <a
                href={attachment.dataUrl}
                download={attachment.name}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold text-center transition-all flex items-center justify-center gap-1"
              >
                <Download size={13} /> Baixar
              </a>
              <button
                type="button"
                onClick={onRemove}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                title="Remover arquivo"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging 
                ? "border-pro-teal bg-teal-50/50 scale-[1.02]" 
                : "border-slate-300 hover:border-pro-teal hover:bg-white bg-slate-50/80"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload size={24} className="text-slate-400 mx-auto mb-2 group-hover:text-pro-teal" />
            <p className="text-xs font-bold text-slate-700">
              Arraste o PDF aqui ou <span className="text-pro-teal underline">clique para selecionar</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Formato .PDF (máx. 15MB)</p>
          </div>
        )}
        {error && <p className="text-xs text-red-500 font-bold mt-2">{error}</p>}
      </div>
    </div>
  );
};

/* COMPONENTE: TABELA PARA EXIBIÇÃO DE ITENS NA FICHA DE INSCRIÇÃO */
const DisplayItemsTable: React.FC<{
  title: string;
  items?: ProductionNeedItem[];
  notes?: string;
}> = ({ title, items, notes }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <div className="bg-slate-100 px-4 py-2.5 font-black text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200">
        {title}
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item, i) => (
          <div key={i} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5 flex-1">
              <p className="font-bold text-slate-800">
                <span className="text-slate-400 mr-2">#{i + 1}</span>
                {item.item}
              </p>
              {item.priority === "Indispensável" && item.indispensableReason && (
                <p className="text-[11px] text-amber-800 font-medium pl-5 bg-amber-50/60 p-1.5 rounded-lg border border-amber-100">
                  <strong>Justificativa:</strong> {item.indispensableReason}
                </p>
              )}
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-center shrink-0 ${
              item.priority === "Indispensável"
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}>
              {item.priority}
            </span>
          </div>
        ))}
      </div>
      {notes && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600">
          <strong>Observações:</strong> {notes}
        </div>
      )}
    </div>
  );
};

/* COMPONENTE: CARD PARA EXIBIÇÃO DE PDF NA FICHA DE INSCRIÇÃO */
const DisplayPdfCard: React.FC<{
  title: string;
  attachment?: TechnicalDocumentAttachment | null;
  formatFileSize: (bytes: number) => string;
}> = ({ title, attachment, formatFileSize }) => {
  if (!attachment) {
    return (
      <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center space-y-1">
        <p className="text-xs font-bold text-slate-500">{title}</p>
        <p className="text-[10px] text-rose-500 font-black uppercase">Não Anexado</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-slate-800">{title}</p>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded uppercase">PDF</span>
      </div>
      <p className="text-xs font-semibold text-slate-600 truncate" title={attachment.name}>
        {attachment.name}
      </p>
      <p className="text-[10px] text-slate-400 font-bold">{formatFileSize(attachment.size)}</p>
      <div className="pt-2 print:hidden">
        <a
          href={attachment.dataUrl}
          download={attachment.name}
          target="_blank"
          rel="noreferrer"
          className="w-full py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider text-center transition-all flex items-center justify-center gap-1.5 shadow-sm hover:bg-emerald-700"
        >
          <Download size={13} /> Baixar Projeto
        </a>
      </div>
    </div>
  );
};
