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
  ChevronRight,
  FileCheck,
  Download,
  ExternalLink,
  Info,
  Boxes,
  Clock,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  ArrowRight,
  History,
  Calendar,
  Building,
  ArrowLeft,
  Edit3
} from "lucide-react";
import { 
  StageProductionProposal, 
  StageProductionRole, 
  StageProductionGenre, 
  ProductionNeedItem,
  TechnicalDocumentAttachment,
  StageProductionStatus,
  UserRole,
  Class 
} from "../types";
import { 
  validateStageProductionProposal, 
  createStageProductionProposal, 
  updateStageProductionStatus, 
  deleteStageProductionProposal,
  submitProfessorStageProduction,
  STAGE_PRODUCTIONS_COLLECTION,
  STAGE_EVOLUTION_STEPS,
  getStageStepIndex,
  getStageStepInfo,
  getStageLabel,
  StageEvolutionStep
} from "../services/stageProductionService";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { BackButton, Logo } from "../components/CommonComponents";
import { StageProductionGuidelinesCard } from "../components/StageProductionGuidelinesCard";
import { StageProductionDevolutivaCard } from "../components/StageProductionDevolutivaCard";
import { StageProductionWorkflowActions } from "../components/StageProductionWorkflowActions";
import { GestorStageFormModal } from "../components/GestorStageFormModal";

interface StageProductionsViewProps {
  currentUser: any;
  users: any[];
  userRole?: UserRole | string;
  classes?: Class[];
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

// Helper to determine if a teacher is linked to a class
const isTeacherLinkedToClass = (u: any, cls: any): boolean => {
  if (!cls || !u) return false;
  // Students can NEVER be considered a teacher of a class
  if (u.role === "Aluno") return false;

  const userIds = [u.id, u.uid, u.migratedFrom, u.migratedTo]
    .filter((id): id is string => Boolean(id && typeof id === "string" && id.trim().length > 0))
    .map(id => id.trim().toLowerCase());

  const teacherIds: string[] = (
    Array.isArray(cls.teacherIds)
      ? cls.teacherIds
      : (typeof cls.teacherId === "string" && cls.teacherId ? [cls.teacherId] : [])
  )
    .filter((id): id is string => Boolean(id && typeof id === "string" && id.trim().length > 0))
    .map(id => id.trim().toLowerCase());

  if (teacherIds.some(tid => userIds.includes(tid))) return true;
  if (u.email && cls.teacherEmail && u.email.trim().toLowerCase() === cls.teacherEmail.trim().toLowerCase()) return true;
  return false;
};

export const StageProductionsView: React.FC<StageProductionsViewProps> = ({
  currentUser,
  users,
  userRole,
  classes = [],
  setView,
  showNotification
}) => {
  const [proposals, setProposals] = useState<StageProductionProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProposalForFicha, setSelectedProposalForFicha] = useState<StageProductionProposal | null>(null);
  const [selectedProposalToFill, setSelectedProposalToFill] = useState<StageProductionProposal | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [classFilter, setClassFilter] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedbackInput, setFeedbackInput] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastCreatedProposal, setLastCreatedProposal] = useState<StageProductionProposal | null>(null);

  // Gestor modal state
  const [isGestorModalOpen, setIsGestorModalOpen] = useState(false);
  const [editingGestorProposal, setEditingGestorProposal] = useState<StageProductionProposal | null>(null);

  // Profile data
  const userProfile = users.find(u => u.id === currentUser?.uid || u.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  // Form State for Professor
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
    status: "em_analise"
  });

  // Base Permissions: Gestor, Diretor Pedagógico, or Professor
  const isGestorUser = 
    userRole === "Gestor" || 
    userRole === "Auxiliar Administrativo" ||
    userProfile?.role === "Gestor" ||
    userProfile?.role === "Auxiliar Administrativo";

  const isDiretorPedagogicoUser = 
    userRole === "Diretor Pedagógico" || 
    userRole === "Diretor Pedagógico e Professor" ||
    userProfile?.role === "Diretor Pedagógico" ||
    userProfile?.role === "Diretor Pedagógico e Professor";

  const isProfessorUser = 
    userRole === "Professor" || 
    userRole === "Diretor Pedagógico e Professor" ||
    userProfile?.role === "Professor" ||
    userProfile?.role === "Diretor Pedagógico e Professor" ||
    Boolean(classes && classes.some(c => isTeacherLinkedToClass(userProfile, c)));

  const hasAccess = isGestorUser || isDiretorPedagogicoUser || isProfessorUser;

  // Dual role detection: allow users who are teachers and directors/managers to toggle perspectives
  const canSwitchPerspective = 
    userRole === "Diretor Pedagógico e Professor" ||
    userProfile?.role === "Diretor Pedagógico e Professor" ||
    ((isGestorUser || isDiretorPedagogicoUser) && isProfessorUser) ||
    isGestorUser || 
    isDiretorPedagogicoUser;

  // Active Perspective: "gestor" | "professor"
  const [activePerspective, setActivePerspective] = useState<"gestor" | "professor">(() => {
    // If user is solely professor (not gestor and not diretor pedagogico), default to "professor"
    if (userRole === "Professor" && !isGestorUser && userRole !== "Diretor Pedagógico") {
      return "professor";
    }
    return "gestor";
  });

  // Dynamic role evaluation based on selected perspective
  const isGestor = activePerspective === "gestor" && (isGestorUser || isDiretorPedagogicoUser);
  const isDiretorPedagogico = activePerspective === "gestor" && isDiretorPedagogicoUser;
  const isProfessor = activePerspective === "professor" || isProfessorUser;
  const isOnlyProfessor = activePerspective === "professor";

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

      // Keep selected proposal updated in real time if open
      if (selectedProposalForFicha?.id) {
        const found = items.find(p => p.id === selectedProposalForFicha.id);
        if (found) {
          setSelectedProposalForFicha(found);
        }
      }
    }, (error) => {
      console.error("Error loading stage productions:", error);
      setLoadingProposals(false);
    });

    return () => unsubscribe();
  }, [hasAccess, selectedProposalForFicha?.id]);

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
      status: "em_analise_pedagogica"
    });
    setErrors({});
  };

  const handleOpenFillForm = (proposal: StageProductionProposal) => {
    setSelectedProposalToFill(proposal);
    setFormData({
      proponentName: proposal.proponentName || userProfile?.name || userProfile?.artisticName || "",
      proponentRole: (proposal.proponentRole || (userProfile?.role === "Professor" ? "Professor" : "Professor/Diretor")) as StageProductionRole,
      proponentEmail: proposal.proponentEmail || userProfile?.email || currentUser?.email || "",
      proponentPhone: proposal.proponentPhone || userProfile?.phone || "",
      proponentUserId: proposal.proponentUserId || currentUser?.uid || "",
      title: proposal.title || "",
      genre: proposal.genre || "Drama",
      synopsis: proposal.synopsis || "",
      pedagogicalProposal: proposal.pedagogicalProposal || "",
      castProfile: proposal.castProfile || "",
      scenographyItems: proposal.scenographyItems && proposal.scenographyItems.length > 0 ? proposal.scenographyItems : [createEmptyItem()],
      scenographyNotes: proposal.scenographyNotes || "",
      techItems: proposal.techItems && proposal.techItems.length > 0 ? proposal.techItems : [createEmptyItem()],
      techNotes: proposal.techNotes || "",
      otherNeedsItems: proposal.otherNeedsItems && proposal.otherNeedsItems.length > 0 ? proposal.otherNeedsItems : [createEmptyItem()],
      otherNeedsNotes: proposal.otherNeedsNotes || "",
      scenographyPdf: proposal.scenographyPdf || null,
      costumePdf: proposal.costumePdf || null,
      lightingPdf: proposal.lightingPdf || null,
      termsAccepted: proposal.termsAccepted ?? false,
      status: proposal.status || "em_analise"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditGestorParams = (proposal: StageProductionProposal) => {
    setEditingGestorProposal(proposal);
    setIsGestorModalOpen(true);
  };

  const handleCreateGestorForm = () => {
    setEditingGestorProposal(null);
    setIsGestorModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!selectedProposalToFill?.id) {
      if (showNotification) {
        showNotification("Nenhum formulário de apresentação selecionado.", "Atenção", "warning");
      }
      return;
    }

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
      const isRectification = selectedProposalToFill.status === "precisa_retificacoes";
      await submitProfessorStageProduction(
        selectedProposalToFill.id,
        {
          ...formData,
          proponentUserId: currentUser?.uid || userProfile?.id || ""
        },
        {
          uid: currentUser?.uid || "",
          name: userProfile?.name || "Professor"
        }
      );
      
      const updatedObj: StageProductionProposal = {
        ...selectedProposalToFill,
        ...formData,
        status: "em_analise",
        updatedAt: new Date()
      };

      setLastCreatedProposal(updatedObj);
      setShowSuccessModal(true);

      if (showNotification) {
        showNotification(
          isRectification
            ? "Retificação enviada com sucesso! A apresentação retornou para avaliação pedagógica e artística."
            : "Formulário de apresentação submetido com sucesso! Em análise pedagógica e artística.",
          "Formulário Enviado",
          "success"
        );
      }

      setSelectedProposalToFill(null);
    } catch (err: any) {
      console.error("Error submitting stage production:", err);
      if (showNotification) {
        showNotification("Erro ao submeter proposta. Tente novamente.", "Erro", "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (proposalId: string, newStatus: StageProductionStatus) => {
    try {
      const feedback = feedbackInput[proposalId] || "";
      await updateStageProductionStatus(
        proposalId,
        newStatus,
        feedback,
        currentUser?.uid,
        userProfile?.name || "Gestão"
      );
      const label = getStageLabel(newStatus);
      if (showNotification) {
        showNotification(`Etapa atualizada para: "${label}".`, "Andamento Atualizado", "success");
      }
      // Clear feedback input for this proposal
      setFeedbackInput(p => {
        const next = { ...p };
        delete next[proposalId];
        return next;
      });
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
      if (selectedProposalToFill?.id === proposalId) {
        setSelectedProposalToFill(null);
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

  // Linked classes for professors
  const professorClasses = React.useMemo(() => {
    if (!classes || classes.length === 0) return [];
    return classes.filter(c => isTeacherLinkedToClass(userProfile, c));
  }, [classes, userProfile]);

  const professorClassIds = React.useMemo(() => {
    return new Set(professorClasses.map(c => c.id));
  }, [professorClasses]);

  // Filtered proposals
  const filteredProposals = React.useMemo(() => {
    let list = proposals;

    // Visibility restriction for professors: only see forms linked to their classes!
    if (isOnlyProfessor) {
      if (professorClasses.length > 0) {
        list = list.filter(p => p.classId && professorClassIds.has(p.classId));
      }
    }

    if (classFilter !== "todas") {
      list = list.filter(p => p.classId === classFilter);
    }

    if (statusFilter !== "todos") {
      list = list.filter(p => p.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const cls = (classes || []).find(c => c.id === p.classId);
        const curClassName = cls?.code || p.className || "";
        return (
          (p.title || "").toLowerCase().includes(q) ||
          curClassName.toLowerCase().includes(q) ||
          (p.proponentName || "").toLowerCase().includes(q) ||
          (p.genre || "").toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [proposals, isOnlyProfessor, professorClasses.length, professorClassIds, classFilter, statusFilter, searchQuery, classes]);

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
              Submissão de espetáculos, acompanhamento das 6 etapas de evolução pedagógica, artística e executiva, e upload de projetos técnicos.
            </p>
          </div>

          {/* Action Buttons & Perspective Switcher */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 self-start md:self-auto">
            {canSwitchPerspective && (
              <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-inner">
                <button
                  type="button"
                  onClick={() => setActivePerspective("gestor")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activePerspective === "gestor"
                      ? "bg-white text-slate-900 shadow-md"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Visualizar tela na visão de Diretor / Gestor"
                >
                  <ShieldCheck size={14} className={activePerspective === "gestor" ? "text-purple-700" : "text-white/70"} />
                  <span>Visão Gestor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePerspective("professor")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    activePerspective === "professor"
                      ? "bg-pro-yellow text-slate-900 shadow-md"
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Visualizar tela na visão de Professor"
                >
                  <GraduationCap size={14} className={activePerspective === "professor" ? "text-slate-900" : "text-white/70"} />
                  <span>Visão Professor</span>
                </button>
              </div>
            )}

            {selectedProposalToFill ? (
              <button
                onClick={() => setSelectedProposalToFill(null)}
                className="px-5 py-2.5 rounded-xl bg-white text-slate-800 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 hover:bg-slate-100 shadow-md"
              >
                <ArrowLeft size={16} />
                Voltar às Apresentações
              </button>
            ) : isGestor ? (
              <button
                onClick={handleCreateGestorForm}
                className="px-5 py-2.5 rounded-xl bg-pro-yellow text-slate-900 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 hover:bg-yellow-400 shadow-md active:scale-95"
              >
                <Plus size={16} />
                Criar Formulário de Apresentação
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
        {selectedProposalToFill ? (
          /* FORMULÁRIO DE PREENCHIMENTO PELO PROFESSOR */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-8"
          >
            {/* Top Navigation & Class Banner & Perspective Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSelectedProposalToFill(null)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs self-start"
              >
                <ArrowLeft size={14} />
                Voltar para Lista de Apresentações
              </button>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                {/* Dual perspective switch on the form screen */}
                {canSwitchPerspective && (
                  <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300/80 text-xs">
                    <button
                      type="button"
                      onClick={() => setActivePerspective("gestor")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                        activePerspective === "gestor"
                          ? "bg-white text-purple-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Alternar para visão de Gestor / Diretor"
                    >
                      <ShieldCheck size={13} />
                      Visão Gestor
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePerspective("professor")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                        activePerspective === "professor"
                          ? "bg-purple-700 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Alternar para visão de Professor"
                    >
                      <GraduationCap size={13} />
                      Visão Professor
                    </button>
                  </div>
                )}

                {isGestor && (
                  <button
                    type="button"
                    onClick={() => handleEditGestorParams(selectedProposalToFill)}
                    className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <Edit3 size={13} />
                    Editar Parâmetros da Gestão
                  </button>
                )}

                <div className="px-3.5 py-1.5 bg-purple-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-black flex items-center gap-2">
                  <Building size={14} className="text-purple-700" />
                  Turma: {(classes || []).find(c => c.id === selectedProposalToFill.classId)?.code || selectedProposalToFill.className || "Turma Vinculada"}
                </div>
              </div>
            </div>

            {/* Diretrizes Oficiais Definidas pela Gestão (14 Parâmetros) */}
            <StageProductionGuidelinesCard proposal={selectedProposalToFill} />

            {/* Banner de Retificação caso haja pendências apontadas */}
            {selectedProposalToFill.status === "precisa_retificacoes" && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                  <AlertCircle size={18} className="text-rose-600" />
                  Pendências de Retificação Apontadas na Avaliação
                </div>
                <p className="text-xs text-rose-700 font-medium">
                  Por favor, atente-se às orientações da avaliação pedagógica e artística e envie as correções necessárias até o prazo estipulado ({selectedProposalToFill.rectificationDeadline || "conforme cronograma"}).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {selectedProposalToFill.pedagogicalDevolutiva && (
                    <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs">
                      <span className="font-black text-slate-800 block mb-1">
                        Avaliação Pedagógica ({selectedProposalToFill.pedagogicalDevolutiva.status}):
                      </span>
                      <span className="font-semibold text-slate-600 italic">
                        "{selectedProposalToFill.pedagogicalDevolutiva.comment || "Sem observações adicionais."}"
                      </span>
                    </div>
                  )}
                  {selectedProposalToFill.artisticDevolutiva && (
                    <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs">
                      <span className="font-black text-slate-800 block mb-1">
                        Avaliação Artística ({selectedProposalToFill.artisticDevolutiva.status}):
                      </span>
                      <span className="font-semibold text-slate-600 italic">
                        "{selectedProposalToFill.artisticDevolutiva.comment || "Sem observações adicionais."}"
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200/80 space-y-8">
              <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Sparkles className="text-purple-600" size={24} />
                    {selectedProposalToFill.status === "precisa_retificacoes" 
                      ? "Retificação do Formulário de Apresentação" 
                      : "Preenchimento do Formulário de Apresentação"}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium mt-1">
                    Insira a sinopse, proposta pedagógica, necessidades de produção com prioridades e projetos técnicos em PDF.
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200/60 px-4 py-2 rounded-2xl text-[11px] font-bold text-purple-900">
                  Professor: <strong>{formData.proponentName || userProfile?.name || "Professor"}</strong>
                </div>
              </div>

              {/* Guia das 6 Etapas */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                  <Clock size={16} className="text-pro-teal" />
                  Ciclo de Avaliação e Execução da Proposta (6 Etapas):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                  {STAGE_EVOLUTION_STEPS.map((step) => (
                    <div 
                      key={step.id} 
                      className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-center flex flex-col items-center justify-center gap-1 shadow-2xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-pro-teal/10 text-pro-teal text-[11px] font-black flex items-center justify-center">
                        {step.stepNumber}
                      </div>
                      <span className="text-[10px] font-black text-slate-700 leading-tight">
                        {step.label}
                      </span>
                    </div>
                  ))}
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

                  {/* Sinopse da Obra */}
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

                  {/* Proposta Didática */}
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

                  {/* Elenco Previsto */}
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

                {/* SEÇÃO 4: NECESSIDADES DE PRODUÇÃO (ITEMIZADAS) */}
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
                          Adicione os itens individualmente em cada subseção e selecione a prioridade (Desejável ou Indispensável).
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

                  {/* Subseção B: Outras Necessidades (Figurino, Maquiagem, Logística) */}
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

                  {/* Informação sobre Iluminação, Som e Vídeo (Preenchimento na Etapa 5 pelo Professor) */}
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                      <Lightbulb size={20} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs md:text-sm font-black uppercase tracking-wider text-amber-950">
                          Iluminação, Som e Vídeo (Necessidades Técnicas)
                        </h4>
                        <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-md">
                          Preenchimento na Etapa 5: Em planejamento do processo
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                        Este item <strong>não</strong> deve ser preenchido nesta ficha inicial de inscrição. O detalhamento das necessidades técnicas específicas de iluminação, sonorização e vídeo será preenchido pelo <strong>Professor</strong> na fase <strong>&ldquo;5) Em planejamento do processo&rdquo;</strong>, após o parecer de aprovação pedagógica e artística.
                      </p>
                    </div>
                  </div>
                </div>

                {/* SEÇÃO 5: PROJETOS TÉCNICOS OBRIGATÓRIOS (ARQUIVOS PDF) */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                      5
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight">
                        Projetos Técnicos Obrigatórios (Arquivos PDF)
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Plantas baixas, croquis de cenografia, pranchas de figurino e mapas de iluminação.
                      </p>
                    </div>
                  </div>

                  <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-5 flex items-start gap-4">
                    <div className="p-2.5 bg-purple-600 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                      <Palette size={20} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xs md:text-sm font-black uppercase tracking-wider text-purple-950">
                          Elaboração e Upload pelo Diretor de Arte
                        </h4>
                        <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2.5 py-0.5 rounded-md">
                          Preenchimento na Etapa 5: Em planejamento do processo
                        </span>
                      </div>
                      <p className="text-xs text-purple-900/90 leading-relaxed font-medium">
                        Os arquivos em PDF dos projetos técnicos obrigatórios (Cenografia, Figurino e Iluminação) e a justificativa conceitual serão confeccionados e anexados pelo <strong>Diretor de Arte</strong> na fase <strong>&ldquo;5) Em planejamento do processo&rdquo;</strong>. Não é necessário anexá-los nesta submissão inicial.
                      </p>
                    </div>
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
                        Confirmo a veracidade das informações da Ficha de Inscrição da Montagem e estou ciente de que a proposta passará pelas 6 etapas de análise pedagógica, artística e executiva da Intervalo Escola de Teatro (com detalhamento técnico de iluminação/som pelo professor e envio dos projetos técnicos em PDF pela Direção de Arte na etapa 5 de Planejamento do Processo). *
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
                    onClick={() => setSelectedProposalToFill(null)}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 shadow-xl shadow-purple-900/10 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando Formulário...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} className="text-pro-yellow" />
                        {selectedProposalToFill?.status === "precisa_retificacoes" 
                          ? "Enviar Retificação do Formulário" 
                          : "Submeter Formulário de Apresentação"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          /* LISTA DE PROPOSTAS SUBMETIDAS COM AS 6 ETAPAS */
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="space-y-6"
          >
            {/* Filter Bar */}
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por turma, obra ou proponente..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>

                {/* Class dropdown */}
                <div className="w-full sm:w-64">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:bg-white"
                  >
                    <option value="todas">Todas as turmas</option>
                    {(isGestor || isDiretorPedagogico ? classes : professorClasses).map(cls => {
                      const title = `${cls.code ? `${cls.code} - ` : ""}${cls.type || "Turma"}${cls.weekday ? ` (${cls.weekday})` : ""}`;
                      return (
                        <option key={cls.id} value={cls.id}>
                          {title}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Status Filter by Stage */}
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setStatusFilter("todos")}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    statusFilter === "todos"
                      ? "bg-purple-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todas ({filteredProposals.length})
                </button>
                {STAGE_EVOLUTION_STEPS.map(step => (
                  <button
                    key={step.id}
                    onClick={() => setStatusFilter(step.id)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                      statusFilter === step.id
                        ? "bg-purple-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {step.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* List Content */}
            {loadingProposals ? (
              <div className="bg-white p-16 rounded-3xl text-center space-y-3">
                <div className="w-8 h-8 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Carregando formulários de apresentações...</p>
              </div>
            ) : filteredProposals.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl text-center space-y-4 border border-dashed border-slate-200">
                <Clapperboard size={48} className="text-slate-300 mx-auto" />
                <h3 className="text-base font-black text-slate-700">Nenhum formulário de apresentação encontrado</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {searchQuery || statusFilter !== "todos" || classFilter !== "todas"
                    ? "Tente ajustar seus filtros de busca para encontrar as propostas."
                    : isOnlyProfessor
                    ? "Nenhum formulário de apresentação criado pela gestão para as suas turmas até o momento. Assim que a gestão definir o cronograma e orçamento da sua turma, o formulário ficará disponível aqui para preenchimento."
                    : "Nenhum formulário criado até o momento. Clique no botão abaixo para criar um formulário para uma turma."}
                </p>
                {isGestor && (
                  <button
                    onClick={handleCreateGestorForm}
                    className="px-6 py-3 bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-purple-800 transition-all inline-flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Criar Formulário de Apresentação
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredProposals.map((proposal) => {
                  const currentStepIdx = getStageStepIndex(proposal.status);
                  const stepInfo = getStageStepInfo(proposal.status);
                  const indispCount = countTotalIndispensables(proposal);

                  return (
                    <div 
                      key={proposal.id}
                      className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200/90 hover:border-purple-300 transition-all space-y-6"
                    >
                      {/* Top Row: Class Name, Status & Actions */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${stepInfo.badgeColor}`}>
                              {stepInfo.label}
                            </span>
                            {((classes || []).find(c => c.id === proposal.classId)?.code || proposal.className) && (
                              <span className="px-2.5 py-1 bg-purple-50 text-purple-900 border border-purple-100 text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5">
                                <Building size={12} className="text-purple-600" />
                                {(classes || []).find(c => c.id === proposal.classId)?.code || proposal.className}
                              </span>
                            )}
                            {proposal.genre && (
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                {proposal.genre}
                              </span>
                            )}
                            {proposal.presentationDate && (
                              <span className="text-slate-600 text-xs font-medium flex items-center gap-1">
                                <Calendar size={13} className="text-purple-600" />
                                Apresentação: <strong>{new Date(proposal.presentationDate + "T12:00:00").toLocaleDateString("pt-BR")}</strong>
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                            {proposal.title || `Montagem da Turma ${(classes || []).find(c => c.id === proposal.classId)?.code || proposal.className || ""}`}
                          </h3>

                          {proposal.title ? (
                            <p className="text-xs font-medium text-slate-600">
                              Proponente: <strong className="text-slate-800">{proposal.proponentName || "Professor"}</strong> ({proposal.proponentRole || "Professor"}) • {proposal.proponentEmail}
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-amber-700 italic">
                              Aguardando preenchimento do título da obra e projetos técnicos pelo professor responsável.
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isProfessor && (
                            <button
                              onClick={() => handleOpenFillForm(proposal)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
                                proposal.status === "precisa_retificacoes"
                                  ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                  : proposal.status === "aguardando_preenchimento"
                                  ? "bg-purple-700 hover:bg-purple-800 text-white"
                                  : "bg-slate-800 hover:bg-slate-900 text-white"
                              }`}
                            >
                              <FileText size={15} />
                              {proposal.status === "precisa_retificacoes"
                                ? "Corrigir e Retificar"
                                : proposal.status === "aguardando_preenchimento"
                                ? "Preencher Formulário"
                                : "Editar Formulário"}
                            </button>
                          )}

                          {isGestor && (
                            <button
                              onClick={() => handleEditGestorParams(proposal)}
                              className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-purple-200"
                              title="Editar Diretrizes e Orçamento da Gestão"
                            >
                              <Sparkles size={14} className="text-purple-600" />
                              <span>Editar Parâmetros</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedProposalForFicha(proposal)}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                          >
                            <FileText size={15} />
                            Ficha Completa
                          </button>

                          <button
                            onClick={() => {
                              setSelectedProposalForFicha(proposal);
                              setTimeout(() => window.print(), 300);
                            }}
                            className="px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                            title="Imprimir"
                          >
                            <Printer size={15} />
                          </button>

                          {isGestor && (
                            <button
                              onClick={() => handleDelete(proposal.id!)}
                              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                              title="Excluir proposta"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Diretrizes Oficiais Definidas pela Gestão (Orçamento e Cronograma - 14 Parâmetros) */}
                      <StageProductionGuidelinesCard 
                        proposal={proposal} 
                        onEditParams={isGestor ? () => handleEditGestorParams(proposal) : undefined}
                      />

                      {/* Devolutivas Pedagógica e Artística (Card Interativo) */}
                      <StageProductionDevolutivaCard
                        proposal={proposal}
                        currentUser={currentUser}
                        userRole={userRole}
                        showNotification={showNotification}
                        onRequestEditForRectification={() => handleOpenFillForm(proposal)}
                      />

                      {/* Ações e Formulários das Etapas 3 a 10 (Direção de Arte, Compras, Entregas, Apresentação) */}
                      <StageProductionWorkflowActions
                        proposal={proposal}
                        currentUser={currentUser}
                        isGestor={isGestor}
                        isProfessor={isProfessor}
                        showNotification={showNotification}
                        onRequestEditForRectification={() => handleOpenFillForm(proposal)}
                      />

                      {/* ANDAMENTO DA SUBMISSÃO (STEPPER COMPACTO NO CARD - 10 ETAPAS) */}
                      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 md:p-5 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-pro-teal" />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Andamento da Montagem:
                            </span>
                            <span className="text-xs font-bold text-pro-teal">
                              Etapa {currentStepIdx + 1} de 10
                            </span>
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-500">
                            {Math.round(((currentStepIdx + 1) / 10) * 100)}% concluído
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-[#016a86] to-[#00b4d8] h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStepIdx + 1) / 10) * 100}%` }}
                          />
                        </div>

                        {/* 10 Steps Grid in Card */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 pt-1">
                          {STAGE_EVOLUTION_STEPS.map((step, idx) => {
                            const isPast = idx < currentStepIdx;
                            const isCurrent = idx === currentStepIdx;

                            return (
                              <div 
                                key={step.id}
                                className={`p-2 rounded-xl border text-left transition-all ${
                                  isCurrent 
                                    ? "bg-white border-pro-teal shadow-md ring-2 ring-pro-teal/20" 
                                    : isPast 
                                    ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-900" 
                                    : "bg-white/60 border-slate-200 text-slate-400"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                    isCurrent ? "bg-pro-teal text-white" : isPast ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                                  }`}>
                                    {isPast ? "✓" : `${step.stepNumber}`}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[8px] font-black uppercase text-pro-teal bg-teal-50 px-1 py-0.5 rounded">
                                      Atual
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[10px] font-bold leading-tight line-clamp-2 ${
                                  isCurrent ? "text-slate-900 font-black" : isPast ? "text-emerald-950 font-bold" : "text-slate-400"
                                }`}>
                                  {step.shortLabel || step.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Brief Info & Summary */}
                      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-600">
                        <div className="flex flex-wrap items-center gap-3">
                          {indispCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200/60 font-bold text-[11px]">
                              <AlertCircle size={13} className="text-amber-600" />
                              {indispCount} item(ns) indispensável(is)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Todos os itens desejáveis</span>
                          )}

                          {(() => {
                            const pdfCount = [proposal.scenographyPdf, proposal.costumePdf, proposal.lightingPdf].filter(Boolean).length;
                            if (pdfCount > 0) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200/60 font-bold text-[11px]">
                                  <FileCheck size={13} className="text-emerald-600" />
                                  {pdfCount} PDF(s) Técnico(s)
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 rounded-lg border border-purple-200/60 font-bold text-[11px]">
                                <Palette size={13} className="text-purple-600" />
                                PDFs Técnicos na Etapa 5
                              </span>
                            );
                          })()}
                        </div>

                        {/* Quick Status Advance for Managers */}
                        {isGestor && currentStepIdx < STAGE_EVOLUTION_STEPS.length - 1 && (
                          <button
                            onClick={() => {
                              const nextStep = STAGE_EVOLUTION_STEPS[currentStepIdx + 1];
                              handleUpdateStatus(proposal.id!, nextStep.id);
                            }}
                            className="px-3.5 py-1.5 bg-slate-900 text-white hover:bg-pro-teal rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                          >
                            <span>Avançar para Etapa {currentStepIdx + 2}</span>
                            <ArrowRight size={13} />
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
                  A Ficha de Inscrição da Montagem para o espetáculo <strong>"{lastCreatedProposal.title}"</strong> foi registrada.
                </p>
              </div>

              <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-pro-teal uppercase tracking-wider">Protocolo de Submissão</p>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-black text-[10px] uppercase">
                    Etapa 2 de 10
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-slate-700 break-all">{lastCreatedProposal.id}</p>
                <p className="text-[11px] text-slate-600">
                  Status atual: <strong>2) Formulário em análise</strong>
                </p>
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
                  Ver Ficha e Acompanhar Etapas
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSelectedProposalToFill(null);
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

      {/* MODAL: FICHA DE INSCRIÇÃO & ANDAMENTO DAS ETAPAS */}
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
                  {canSwitchPerspective && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setActivePerspective("gestor")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                          activePerspective === "gestor"
                            ? "bg-white text-purple-900 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Alternar para visão de Gestor / Diretor"
                      >
                        <ShieldCheck size={12} />
                        Gestor
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePerspective("professor")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                          activePerspective === "professor"
                            ? "bg-purple-700 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                        title="Alternar para visão de Professor"
                      >
                        <GraduationCap size={12} />
                        Professor
                      </button>
                    </div>
                  )}

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

              {/* PAINEL DE ANDAMENTO DAS 10 ETAPAS */}
              <StageEvolutionTracker proposal={selectedProposalForFicha} />

              {/* Diretrizes Oficiais Definidas pela Gestão (14 Parâmetros) */}
              <StageProductionGuidelinesCard proposal={selectedProposalForFicha} />

              {/* Devolutivas Pedagógica e Artística */}
              <StageProductionDevolutivaCard
                proposal={selectedProposalForFicha}
                currentUser={currentUser}
                userRole={userRole}
                showNotification={showNotification}
                onRequestEditForRectification={() => {
                  const toEdit = selectedProposalForFicha;
                  setSelectedProposalForFicha(null);
                  handleOpenFillForm(toEdit);
                }}
              />

              {/* Ações e Formulários das Etapas 3 a 10 (Direção de Arte, Compras, Entregas, Apresentação) */}
              <StageProductionWorkflowActions
                proposal={selectedProposalForFicha}
                currentUser={currentUser}
                isGestor={isGestor}
                isProfessor={isProfessor}
                showNotification={showNotification}
                onRequestEditForRectification={() => {
                  const toEdit = selectedProposalForFicha;
                  setSelectedProposalForFicha(null);
                  handleOpenFillForm(toEdit);
                }}
              />

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

              {/* Histórico das Etapas Registradas */}
              {selectedProposalForFicha.statusHistory && selectedProposalForFicha.statusHistory.length > 0 && (
                <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <History size={14} className="text-pro-teal" />
                    Histórico de Atualização das Etapas
                  </h4>
                  <div className="space-y-2">
                    {selectedProposalForFicha.statusHistory.map((hist, hIdx) => (
                      <div key={hIdx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-800">{hist.statusLabel}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(hist.updatedAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {hist.notes && (
                          <p className="text-slate-600 font-medium italic">"{hist.notes}"</p>
                        )}
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Atualizado por: {hist.updatedByName || "Gestão"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Área de Gestão de Etapas (Apenas Gestor) */}
              {isGestor && (
                <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 space-y-4 print:hidden">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-pro-teal" />
                    Painel de Evolução da Proposta (Gestor / Coordenação)
                  </h4>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-600 uppercase">
                      Parecer / Feedback para a Etapa:
                    </label>
                    <textarea
                      rows={2}
                      defaultValue={selectedProposalForFicha.feedback || ""}
                      onChange={(e) => setFeedbackInput(p => ({ ...p, [selectedProposalForFicha.id!]: e.target.value }))}
                      placeholder="Insira as observações da coordenação ou instruções para a próxima etapa..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-pro-teal font-medium"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] font-black text-slate-600 uppercase">
                      Alterar para a Etapa:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {STAGE_EVOLUTION_STEPS.map((step) => {
                        const isCurrent = selectedProposalForFicha.status === step.id;
                        return (
                          <button
                            key={step.id}
                            onClick={() => handleUpdateStatus(selectedProposalForFicha.id!, step.id)}
                            className={`p-3 rounded-xl text-left font-bold text-xs transition-all flex items-start gap-2 border ${
                              isCurrent
                                ? "bg-pro-teal text-white border-pro-teal shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:border-pro-teal hover:bg-teal-50/50"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                              isCurrent ? "bg-white text-pro-teal" : "bg-slate-100 text-slate-600"
                            }`}>
                              {step.stepNumber}
                            </span>
                            <div className="space-y-0.5">
                              <p className="leading-tight">{step.label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
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

      {/* MODAL DO GESTOR: CRIAR OU EDITAR PARÂMETROS DO FORMULÁRIO */}
      <GestorStageFormModal
        isOpen={isGestorModalOpen}
        onClose={() => {
          setIsGestorModalOpen(false);
          setEditingGestorProposal(null);
        }}
        classes={classes}
        users={users}
        currentUser={currentUser}
        existingProposal={editingGestorProposal}
        onSuccess={() => {
          setIsGestorModalOpen(false);
          setEditingGestorProposal(null);
        }}
        showNotification={showNotification}
      />
    </div>
  );
};

/* COMPONENTE: TRACKER DAS 10 ETAPAS DE EVOLUÇÃO (VISUAL COMPLETO) */
interface StageEvolutionTrackerProps {
  proposal: StageProductionProposal;
}

const StageEvolutionTracker: React.FC<StageEvolutionTrackerProps> = ({ proposal }) => {
  const currentStepIdx = getStageStepIndex(proposal.status);
  const currentStepInfo = getStageStepInfo(proposal.status);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#013543] text-white rounded-3xl p-6 md:p-8 space-y-6 shadow-xl border border-teal-800/40 print:bg-white print:text-slate-900 print:border-slate-300">
      {/* Header do Tracker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 print:border-slate-300">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-pro-yellow text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-lg">
              Fluxo das 10 Etapas da Montagem
            </span>
            <span className="text-xs text-teal-200/80 font-bold">
              Etapa {currentStepIdx + 1} de 10
            </span>
          </div>
          <h3 className="text-lg md:text-xl font-black tracking-tight text-white print:text-slate-900">
            {currentStepInfo.label}
          </h3>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-teal-300 print:text-slate-600 block">
            Progresso Geral
          </span>
          <span className="text-2xl font-black text-white print:text-slate-900">
            {Math.round(((currentStepIdx + 1) / 10) * 100)}%
          </span>
        </div>
      </div>

      {/* Stepper Visual Horizontal */}
      <div className="relative pt-2">
        {/* Connecting Line Background */}
        <div className="hidden lg:block absolute top-[28px] left-[5%] right-[5%] h-1 bg-white/20 rounded-full z-0" />
        {/* Active Line Fill */}
        <div 
          className="hidden lg:block absolute top-[28px] left-[5%] h-1 bg-gradient-to-r from-pro-yellow to-teal-300 rounded-full z-0 transition-all duration-500" 
          style={{ width: `${(currentStepIdx / 9) * 90}%` }}
        />

        {/* 10 Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 relative z-10">
          {STAGE_EVOLUTION_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIdx;
            const isCurrent = index === currentStepIdx;

            return (
              <div 
                key={step.id} 
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                  isCurrent 
                    ? "bg-white text-slate-900 border-white shadow-xl ring-4 ring-pro-yellow/30 scale-[1.02]" 
                    : isCompleted 
                    ? "bg-teal-900/50 border-teal-500/40 text-teal-100" 
                    : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-sm ${
                    isCurrent 
                      ? "bg-pro-teal text-white" 
                      : isCompleted 
                      ? "bg-emerald-500 text-white" 
                      : "bg-white/10 text-white/60"
                  }`}>
                    {isCompleted ? <Check size={16} /> : step.stepNumber}
                  </div>

                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isCurrent 
                      ? "bg-pro-yellow text-slate-900" 
                      : isCompleted 
                      ? "bg-emerald-500/20 text-emerald-300" 
                      : "bg-white/5 text-white/30"
                  }`}>
                    {isCurrent ? "Etapa Atual" : isCompleted ? "Concluída" : "Aguardando"}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className={`text-xs font-black leading-tight ${
                    isCurrent ? "text-slate-900" : isCompleted ? "text-white" : "text-white/60"
                  }`}>
                    {step.label}
                  </p>
                  <p className={`text-[10px] leading-snug line-clamp-3 ${
                    isCurrent ? "text-slate-600" : isCompleted ? "text-teal-200/70" : "text-white/30"
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Detailed Message */}
      <div className="p-4 bg-white/10 rounded-2xl border border-white/15 flex items-start gap-3 print:bg-slate-100 print:text-slate-900">
        <Info size={20} className="text-pro-yellow shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-0.5">
          <p className="font-black text-white print:text-slate-900">
            Fase Atual: {currentStepInfo.label}
          </p>
          <p className="text-teal-100/80 print:text-slate-700">
            {currentStepInfo.description}
          </p>
        </div>
      </div>
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
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                isIndispensable 
                  ? "bg-amber-50/40 border-amber-300" 
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                  #{index + 1}
                </span>

                {/* Descrição do Item */}
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => onUpdateItem(index, "item", e.target.value)}
                    placeholder={itemPlaceholder}
                    className={`w-full p-3 bg-slate-50 border rounded-xl text-xs font-semibold outline-none transition-all ${
                      errors[itemErrorKey] 
                        ? "border-red-400 bg-red-50/20" 
                        : "border-slate-200 focus:border-pro-teal focus:bg-white"
                    }`}
                  />
                  {errors[itemErrorKey] && (
                    <p className="text-[11px] text-red-500 font-bold">{errors[itemErrorKey]}</p>
                  )}
                </div>

                {/* Seletor de Prioridade */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => onUpdateItem(index, "priority", "Desejável")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        item.priority === "Indispensável"
                          ? "bg-amber-500 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Indispensável
                    </button>
                  </div>

                  {/* Botão de Excluir Item */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                    title="Remover Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Justificativa Condicional se Indispensável */}
              {isIndispensable && (
                <div className="pl-0 md:pl-10 space-y-1 pt-1 border-t border-amber-200/60">
                  <label className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-amber-600" />
                    Motivo da Indispensabilidade do Item #{index + 1} *
                  </label>
                  <textarea
                    rows={2}
                    value={item.indispensableReason || ""}
                    onChange={(e) => onUpdateItem(index, "indispensableReason", e.target.value)}
                    placeholder="Justifique detalhadamente por que este recurso é estritamente indispensável para a realização da montagem..."
                    className={`w-full p-3 bg-white border rounded-xl text-xs font-medium outline-none transition-all resize-y ${
                      errors[reasonErrorKey] 
                        ? "border-red-400 bg-red-50/20" 
                        : "border-amber-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    }`}
                  />
                  {errors[reasonErrorKey] && (
                    <p className="text-[11px] text-red-500 font-bold">{errors[reasonErrorKey]}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Observações Gerais Opcionais */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Observações adicionais para esta subseção (Opcional):
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => onUpdateNotes(e.target.value)}
          placeholder="Ex: Dimensões aproximadas do palco necessárias, restrições elétricas, etc."
          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-pro-teal"
        />
      </div>
    </div>
  );
};

/* COMPONENTE: CARD DE UPLOAD DO ARQUIVO PDF OBRIGATÓRIO */
interface PdfUploadCardProps {
  title: string;
  description: string;
  docType: "scenographyPdf" | "costumePdf" | "lightingPdf";
  attachment?: TechnicalDocumentAttachment | null;
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
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

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

  return (
    <div className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
      attachment 
        ? "bg-emerald-50/40 border-emerald-300" 
        : error 
        ? "bg-red-50/30 border-red-300" 
        : "bg-slate-50 border-slate-200"
    }`}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <FileText size={14} className="text-pro-teal" />
            {title} *
          </h4>
          {attachment ? (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-md">
              Anexado
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-md">
              Obrigatório
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          {description}
        </p>
      </div>

      {attachment ? (
        <div className="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs">
              PDF
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate" title={attachment.name}>
                {attachment.name}
              </p>
              <p className="text-[10px] text-slate-400">
                {formatFileSize(attachment.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <a
              href={attachment.dataUrl}
              download={attachment.name}
              className="p-2 text-pro-teal hover:bg-teal-50 rounded-lg transition-all"
              title="Baixar PDF"
            >
              <Download size={15} />
            </a>
            <button
              type="button"
              onClick={onRemove}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
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
          onClick={() => inputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragging 
              ? "border-pro-teal bg-teal-50/50 scale-[1.01]" 
              : "border-slate-300 hover:border-pro-teal hover:bg-white"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUpload(e.target.files[0]);
              }
            }}
          />
          <div className="w-10 h-10 rounded-full bg-pro-teal/10 text-pro-teal flex items-center justify-center">
            <FileText size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-700">
              Clique para selecionar o PDF
            </p>
            <p className="text-[10px] text-slate-400">
              ou arraste e solte o arquivo aqui (Máx. 15MB)
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-500 font-bold">{error}</p>
      )}
    </div>
  );
};

/* COMPONENTE: TABELA PARA EXIBIÇÃO DE ITENS NA FICHA OFICIAL */
interface DisplayItemsTableProps {
  title: string;
  items?: ProductionNeedItem[];
  notes?: string;
}

const DisplayItemsTable: React.FC<DisplayItemsTableProps> = ({ title, items, notes }) => {
  if (!items || items.length === 0) {
    if (title.includes("Iluminação")) {
      return (
        <div className="border border-amber-200/80 rounded-2xl p-4 bg-amber-50/60 text-amber-900 text-xs flex items-center gap-3">
          <Info size={16} className="text-amber-600 shrink-0" />
          <span><strong>Iluminação, Som e Vídeo:</strong> Detalhamento técnico a ser preenchido pelo Professor durante a etapa <strong>5) Em planejamento do processo</strong>.</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">{title}</h5>
        <span className="text-[10px] font-bold text-slate-500">{items.length} item(ns)</span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((item, idx) => (
          <div key={idx} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                <span className="font-semibold text-slate-800">{item.item}</span>
              </div>
              {item.priority === "Indispensável" && item.indispensableReason && (
                <p className="text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 leading-relaxed font-medium">
                  <strong>Justificativa de Indispensabilidade:</strong> {item.indispensableReason}
                </p>
              )}
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 self-start sm:self-auto ${
              item.priority === "Indispensável" 
                ? "bg-amber-100 text-amber-900 border border-amber-200" 
                : "bg-slate-100 text-slate-700"
            }`}>
              {item.priority}
            </span>
          </div>
        ))}
      </div>

      {notes && (
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-600">
          <strong>Observações da Subseção:</strong> {notes}
        </div>
      )}
    </div>
  );
};

/* COMPONENTE: EXIBIÇÃO DE PDF NA FICHA OFICIAL */
interface DisplayPdfCardProps {
  title: string;
  attachment?: TechnicalDocumentAttachment | null;
  formatFileSize: (bytes: number) => string;
}

const DisplayPdfCard: React.FC<DisplayPdfCardProps> = ({ title, attachment, formatFileSize }) => {
  return (
    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2">
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
        {title}
      </span>
      {attachment ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <FileText size={16} className="text-pro-teal shrink-0" />
            <span className="truncate" title={attachment.name}>{attachment.name}</span>
          </div>
          <p className="text-[10px] text-slate-400">Tamanho: {formatFileSize(attachment.size)}</p>
          <div className="pt-1 print:hidden">
            <a
              href={attachment.dataUrl}
              download={attachment.name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pro-teal text-white rounded-lg text-[11px] font-bold hover:bg-[#014e63] transition-all shadow-2xs"
            >
              <Download size={13} /> Baixar PDF
            </a>
          </div>
        </div>
      ) : (
        <p className="text-xs text-purple-700 font-semibold bg-purple-50 p-2 rounded-xl border border-purple-200/60">
          Aguardando elaboração na Etapa 5 (Direção de Arte)
        </p>
      )}
    </div>
  );
};
