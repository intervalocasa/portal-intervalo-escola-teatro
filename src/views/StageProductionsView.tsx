/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from "react";
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
  Filter, 
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  Award
} from "lucide-react";
import { 
  StageProductionProposal, 
  StageProductionRole, 
  StageProductionGenre, 
  PriorityLevel, 
  PrioritizedField, 
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

const INITIAL_PRIORITIZED_FIELD: PrioritizedField = {
  content: "",
  priority: "Desejável",
  indispensableReason: ""
};

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
    synopsis: { ...INITIAL_PRIORITIZED_FIELD },
    pedagogicalProposal: { ...INITIAL_PRIORITIZED_FIELD },
    castProfile: { ...INITIAL_PRIORITIZED_FIELD },
    scenographyProps: { ...INITIAL_PRIORITIZED_FIELD },
    techNeeds: { ...INITIAL_PRIORITIZED_FIELD },
    otherNeeds: { ...INITIAL_PRIORITIZED_FIELD },
    termsAccepted: false,
    status: "pendente"
  });

  // Check Permissions: Only Gestor, Diretor Pedagógico, or Professor can access
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

  const handlePrioritizedChange = (
    field: keyof Pick<StageProductionProposal, "synopsis" | "pedagogicalProposal" | "castProfile" | "scenographyProps" | "techNeeds" | "otherNeeds">,
    key: "content" | "priority" | "indispensableReason",
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: value
      }
    }));

    // Clear related error
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (key === "indispensableReason" && errors[`${field}Reason`]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[`${field}Reason`];
        return next;
      });
    }
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
      synopsis: { ...INITIAL_PRIORITIZED_FIELD },
      pedagogicalProposal: { ...INITIAL_PRIORITIZED_FIELD },
      castProfile: { ...INITIAL_PRIORITIZED_FIELD },
      scenographyProps: { ...INITIAL_PRIORITIZED_FIELD },
      techNeeds: { ...INITIAL_PRIORITIZED_FIELD },
      otherNeeds: { ...INITIAL_PRIORITIZED_FIELD },
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
      // Scroll to first error
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
              Submissão e curadoria de propostas de peças, espetáculos e mostras artísticas da Intervalo Escola de Teatro.
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
                    Preencha com atenção todos os campos. Campos marcados com (*) possuem seletor de prioridade (Desejável ou Indispensável).
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

                  {/* Sinopse da Obra + Priorizador */}
                  <PrioritizedTextarea
                    label="Sinopse da Obra *"
                    placeholder="Descreva a premissa dramática, narrativa ou poética do espetáculo/mostra..."
                    value={formData.synopsis.content}
                    priority={formData.synopsis.priority}
                    reason={formData.synopsis.indispensableReason || ""}
                    errorContent={errors.synopsis}
                    errorReason={errors.synopsisReason}
                    onContentChange={(val) => handlePrioritizedChange("synopsis", "content", val)}
                    onPriorityChange={(val) => handlePrioritizedChange("synopsis", "priority", val)}
                    onReasonChange={(val) => handlePrioritizedChange("synopsis", "indispensableReason", val)}
                  />
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

                  {/* Proposta Didática */}
                  <PrioritizedTextarea
                    label="Proposta Didática / Pedagógica *"
                    placeholder="Como esta montagem se conecta com o plano de ensino, desenvolvimento dos alunos, habilidades teatrais trabalhadas e objetivos de aprendizagem..."
                    value={formData.pedagogicalProposal.content}
                    priority={formData.pedagogicalProposal.priority}
                    reason={formData.pedagogicalProposal.indispensableReason || ""}
                    errorContent={errors.pedagogicalProposal}
                    errorReason={errors.pedagogicalProposalReason}
                    onContentChange={(val) => handlePrioritizedChange("pedagogicalProposal", "content", val)}
                    onPriorityChange={(val) => handlePrioritizedChange("pedagogicalProposal", "priority", val)}
                    onReasonChange={(val) => handlePrioritizedChange("pedagogicalProposal", "indispensableReason", val)}
                  />

                  {/* Elenco Previsto */}
                  <PrioritizedTextarea
                    label="Elenco Previsto (Quantidade, Faixa Etária e Perfil) *"
                    placeholder="Especifique o número previsto de atores/atrizes, perfil dos personagens, distribuição por turma/nível e dinâmica de ensaios..."
                    value={formData.castProfile.content}
                    priority={formData.castProfile.priority}
                    reason={formData.castProfile.indispensableReason || ""}
                    errorContent={errors.castProfile}
                    errorReason={errors.castProfileReason}
                    onContentChange={(val) => handlePrioritizedChange("castProfile", "content", val)}
                    onPriorityChange={(val) => handlePrioritizedChange("castProfile", "priority", val)}
                    onReasonChange={(val) => handlePrioritizedChange("castProfile", "indispensableReason", val)}
                  />
                </div>

                {/* SEÇÃO 4: NECESSIDADES DE PRODUÇÃO */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                      4
                    </div>
                    <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                      Necessidades de Produção
                    </h3>
                  </div>

                  {/* Cenografia e Adereços */}
                  <PrioritizedTextarea
                    label="Proposta de Cenografia e Adereços *"
                    placeholder="Descreva o conceito espacial, elementos de palco, mobiliário necessário, objetos de cena e adereços..."
                    value={formData.scenographyProps.content}
                    priority={formData.scenographyProps.priority}
                    reason={formData.scenographyProps.indispensableReason || ""}
                    errorContent={errors.scenographyProps}
                    errorReason={errors.scenographyPropsReason}
                    onContentChange={(val) => handlePrioritizedChange("scenographyProps", "content", val)}
                    onPriorityChange={(val) => handlePrioritizedChange("scenographyProps", "priority", val)}
                    onReasonChange={(val) => handlePrioritizedChange("scenographyProps", "indispensableReason", val)}
                  />

                  {/* Necessidades Técnicas de Iluminação, Som e Vídeo */}
                  <PrioritizedTextarea
                    label="Necessidades Técnicas de Iluminação, Som e Vídeo *"
                    placeholder="Descreva o mapa de luz desejado, efeitos sonoros/música ao vivo/trilha gravada, microfonação, projeção de vídeo..."
                    value={formData.techNeeds.content}
                    priority={formData.techNeeds.priority}
                    reason={formData.techNeeds.indispensableReason || ""}
                    errorContent={errors.techNeeds}
                    errorReason={errors.techNeedsReason}
                    onContentChange={(val) => handlePrioritizedChange("techNeeds", "content", val)}
                    onPriorityChange={(val) => handlePrioritizedChange("techNeeds", "priority", val)}
                    onReasonChange={(val) => handlePrioritizedChange("techNeeds", "indispensableReason", val)}
                  />

                  {/* Outras Necessidades (Figurino, Maquiagem, Logística) */}
                  <PrioritizedTextarea
                    label="Outras Necessidades (Figurino, Maquiagem, Logística) *"
                    placeholder="Concepção visual dos figurinos, visagismo/maquiagem, transporte, cronograma de ensaios gerais e montagem..."
                    value={formData.otherNeeds.content}
                    priority={formData.otherNeeds.priority}
                    reason={formData.otherNeeds.indispensableReason || ""}
                    errorContent={errors.otherNeeds}
                    errorReason={errors.otherNeedsReason}
                    onContentChange={(val) => handlePrioritizedChange("otherNeeds", "content", val)}
                    onPriorityChange={(val) => handlePrioritizedChange("otherNeeds", "priority", val)}
                    onReasonChange={(val) => handlePrioritizedChange("otherNeeds", "indispensableReason", val)}
                  />
                </div>

                {/* SEÇÃO 5: TERMO DE ACEITE */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-pro-teal/10 text-pro-teal flex items-center justify-center font-black text-sm">
                      5
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
                        Confirmo a veracidade das informações para a Ficha de Inscrição da Montagem e estou ciente de que as necessidades assinaladas como "Indispensáveis" serão analisadas pedagogicamente e tecnicamente pela coordenação. *
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
                          {proposal.synopsis?.content}
                        </p>

                        {/* Indispensables Counter Badge */}
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          {getIndispensableCount(proposal) > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200/60">
                              <AlertCircle size={12} />
                              {getIndispensableCount(proposal)} item(ns) indispensável(is) assinalado(s)
                            </span>
                          ) : (
                            <span className="text-slate-400">Todos os itens marcados como desejáveis</span>
                          )}
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

      {/* MODAL: SUCESSO DO ENVIO COM ATALHO PARA A FICHA */}
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
                  A Ficha de Inscrição da Montagem para o espetáculo <strong>"{lastCreatedProposal.title}"</strong> foi gerada e registrada no sistema da escola.
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
                    className="p-3 bg-slate-100 hover:bg-pro-teal hover:text-white text-slate-700 rounded-2xl transition-all"
                    title="Imprimir Ficha"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedProposalForFicha(null)}
                    className="p-3 bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-700 rounded-2xl transition-all"
                    title="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Status da Curadoria</span>
                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    {selectedProposalForFicha.status || "Pendente"}
                  </span>
                </div>

                {isGestor && (
                  <div className="flex flex-wrap items-center gap-2 print:hidden">
                    <span className="text-xs font-bold text-slate-500">Alterar Status:</span>
                    <button
                      onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, "aprovada")}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1"
                    >
                      <Check size={12} /> Aprovar
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, "em_analise")}
                      className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1"
                    >
                      <Clock size={12} /> Em Análise
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, "ajustes_solicitados")}
                      className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-purple-700 transition-all flex items-center gap-1"
                    >
                      Ajustes
                    </button>
                  </div>
                )}
              </div>

              {/* Seção 1: Proponente */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-pro-teal border-b border-slate-100 pb-1">
                  1. Dados do Proponente
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Nome</span>
                    <span className="font-bold text-slate-800">{selectedProposalForFicha.proponentName}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Função</span>
                    <span className="font-bold text-slate-800">{selectedProposalForFicha.proponentRole}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">E-mail</span>
                    <span className="font-bold text-slate-800">{selectedProposalForFicha.proponentEmail}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">WhatsApp</span>
                    <span className="font-bold text-slate-800">{selectedProposalForFicha.proponentPhone}</span>
                  </div>
                </div>
              </div>

              {/* Seção 2: Identificação da Obra */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-pro-teal border-b border-slate-100 pb-1">
                  2. Identificação da Obra
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-3">
                  <div className="md:col-span-2 bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Título do Espetáculo</span>
                    <span className="font-black text-slate-900 text-sm">{selectedProposalForFicha.title}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <span className="text-slate-400 block font-bold text-[10px] uppercase">Gênero</span>
                    <span className="font-bold text-slate-800">{selectedProposalForFicha.genre}</span>
                  </div>
                </div>

                <FichaFieldBlock
                  title="Sinopse da Obra"
                  field={selectedProposalForFicha.synopsis}
                />
              </div>

              {/* Seção 3: Proposta Pedagógica e Elenco */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-pro-teal border-b border-slate-100 pb-1">
                  3. Proposta Pedagógica e Elenco
                </h4>
                <FichaFieldBlock
                  title="Proposta Didática / Pedagógica"
                  field={selectedProposalForFicha.pedagogicalProposal}
                />
                <FichaFieldBlock
                  title="Elenco Previsto (Quantidade, Faixa Etária e Perfil)"
                  field={selectedProposalForFicha.castProfile}
                />
              </div>

              {/* Seção 4: Necessidades de Produção */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-pro-teal border-b border-slate-100 pb-1">
                  4. Necessidades de Produção
                </h4>
                <FichaFieldBlock
                  title="Proposta de Cenografia e Adereços"
                  field={selectedProposalForFicha.scenographyProps}
                />
                <FichaFieldBlock
                  title="Necessidades Técnicas (Iluminação, Som e Vídeo)"
                  field={selectedProposalForFicha.techNeeds}
                />
                <FichaFieldBlock
                  title="Outras Necessidades (Figurino, Maquiagem, Logística)"
                  field={selectedProposalForFicha.otherNeeds}
                />
              </div>

              {/* Seção 5: Termo de Aceite */}
              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-700 shrink-0" />
                <p className="text-xs text-emerald-900 font-bold">
                  Termo de Confirmação e Veracidade Aceito pelo proponente em {selectedProposalForFicha.createdAt?.toDate ? selectedProposalForFicha.createdAt.toDate().toLocaleString("pt-BR") : "data de registro"}.
                </p>
              </div>

              {/* Modal footer / Print info */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Intervalo Escola de Teatro — Sistema de Gestão e Montagens</span>
                <span className="font-mono">Documento Autenticado Digitalmente</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper: Prioritized Textarea component
interface PrioritizedTextareaProps {
  label: string;
  placeholder: string;
  value: string;
  priority: PriorityLevel;
  reason: string;
  errorContent?: string;
  errorReason?: string;
  onContentChange: (value: string) => void;
  onPriorityChange: (value: PriorityLevel) => void;
  onReasonChange: (value: string) => void;
}

const PrioritizedTextarea: React.FC<PrioritizedTextareaProps> = ({
  label,
  placeholder,
  value,
  priority,
  reason,
  errorContent,
  errorReason,
  onContentChange,
  onPriorityChange,
  onReasonChange
}) => {
  return (
    <div className="space-y-2 bg-slate-50/50 p-4 md:p-5 rounded-2xl border border-slate-200/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
          {label}
        </label>

        {/* Priority Selector Pills */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start sm:self-auto">
          <span className="text-[10px] font-black uppercase text-slate-400 px-1.5">
            Prioridade:
          </span>
          <button
            type="button"
            onClick={() => onPriorityChange("Desejável")}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              priority === "Desejável"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            Desejável
          </button>
          <button
            type="button"
            onClick={() => onPriorityChange("Indispensável")}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
              priority === "Indispensável"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-amber-50"
            }`}
          >
            <AlertCircle size={10} />
            Indispensável
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-4 bg-white border rounded-2xl text-xs md:text-sm font-semibold outline-none transition-all resize-y ${
          errorContent ? "border-red-400 bg-red-50/20" : "border-slate-200 focus:border-pro-teal"
        }`}
      />
      {errorContent && <p className="text-xs text-red-500 font-bold">{errorContent}</p>}

      {/* Dynamic Required Reason Field if Indispensável is chosen */}
      <AnimatePresence>
        {priority === "Indispensável" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2"
          >
            <div className="bg-amber-50/70 border-2 border-amber-200 p-4 rounded-2xl space-y-2">
              <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-600" />
                Motivo da Indispensabilidade * (Obrigatório para itens indispensáveis)
              </label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Explique detalhadamente por que este item é indispensável para a realização do espetáculo/mostra..."
                className={`w-full p-3 bg-white border rounded-xl text-xs font-semibold outline-none transition-all ${
                  errorReason ? "border-red-400 bg-red-50/30" : "border-amber-200 focus:border-amber-500"
                }`}
              />
              {errorReason && <p className="text-xs text-red-600 font-bold">{errorReason}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Helper: Block in Printable Ficha
const FichaFieldBlock: React.FC<{ title: string; field: PrioritizedField }> = ({ title, field }) => {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
          {title}
        </h5>
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
          field.priority === "Indispensável" 
            ? "bg-amber-500 text-white font-bold" 
            : "bg-slate-200 text-slate-700"
        }`}>
          Prioridade: {field.priority}
        </span>
      </div>

      <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
        {field.content || "Não preenchido"}
      </p>

      {field.priority === "Indispensável" && field.indispensableReason && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
            <AlertCircle size={10} /> Motivo da Indispensabilidade:
          </span>
          <p className="text-xs text-amber-950 font-bold leading-relaxed">
            {field.indispensableReason}
          </p>
        </div>
      )}
    </div>
  );
};

// Helper: count indispensable items
const getIndispensableCount = (p: StageProductionProposal): number => {
  let count = 0;
  if (p.synopsis?.priority === "Indispensável") count++;
  if (p.pedagogicalProposal?.priority === "Indispensável") count++;
  if (p.castProfile?.priority === "Indispensável") count++;
  if (p.scenographyProps?.priority === "Indispensável") count++;
  if (p.techNeeds?.priority === "Indispensável") count++;
  if (p.otherNeeds?.priority === "Indispensável") count++;
  return count;
};
