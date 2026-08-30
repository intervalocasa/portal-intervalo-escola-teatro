/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FolderArchive,
  FileText,
  Plus, 
  Download, 
  Eye, 
  Trash2, 
  Edit3, 
  Search, 
  X, 
  Check, 
  UploadCloud, 
  Sparkles, 
  BookOpen, 
  Calendar, 
  User as UserIcon,
  Filter,
  AlertCircle,
  FileCheck,
  Maximize2,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { FormativeDocument, User, UserRole } from "../types";
import { BackButton, Logo } from "../components/CommonComponents";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../lib/firebase";

interface FormativeDocumentsViewProps {
  currentUser: any;
  users: User[];
  userRole?: UserRole | null;
  setView: (view: any) => void;
  showNotification?: (message: string, title?: string, type?: "success" | "warning" | "error") => void;
}

const CATEGORY_OPTIONS = [
  "Diretrizes Pedagógicas",
  "Formação Docente",
  "Jogos & Dinâmicas Teatrais",
  "Roteiros & Textos Didáticos",
  "Regulamentos & Normas",
  "Material de Apoio",
  "Geral"
];

export const FormativeDocumentsView: React.FC<FormativeDocumentsViewProps> = ({
  currentUser,
  users,
  userRole,
  setView,
  showNotification
}) => {
  const [documents, setDocuments] = useState<FormativeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<FormativeDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<FormativeDocument | null>(null);
  
  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("Diretrizes Pedagógicas");
  const [formDescription, setFormDescription] = useState("");
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    url: string;
    size: number;
    type: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Determine current user profile and permission
  const userProfile = useMemo(() => {
    return users.find(u => u.id === currentUser?.uid || u.email === currentUser?.email);
  }, [users, currentUser]);

  const effectiveRole = userRole || userProfile?.role;
  
  // Only Gestores, Diretor Pedagógico and Diretor Pedagógico e Professor can upload/edit/delete files
  const canManageDocs = useMemo(() => {
    return (
      effectiveRole === "Gestor" ||
      effectiveRole === "Diretor Pedagógico" ||
      effectiveRole === "Diretor Pedagógico e Professor"
    );
  }, [effectiveRole]);

  // Real-time Firestore synchronization
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "formative_documents"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: FormativeDocument[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any)
        }));
        setDocuments(docs);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar documentos formativos:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchSearch =
        searchTerm.trim() === "" ||
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.fileName && doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.uploadedByName && doc.uploadedByName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.category && doc.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === "Todos" || doc.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [documents, searchTerm, selectedCategory]);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "PDF";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date helper
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Data recente";
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    }
    if (typeof timestamp === "string") {
      return new Date(timestamp).toLocaleDateString("pt-BR");
    }
    return "Data recente";
  };

  // Open add document modal
  const handleOpenAddModal = () => {
    if (!canManageDocs) return;
    setEditingDoc(null);
    setFormTitle("");
    setFormCategory("Diretrizes Pedagógicas");
    setFormDescription("");
    setAttachedFile(null);
    setFileError(null);
    setIsFormModalOpen(true);
  };

  // Open edit document modal
  const handleOpenEditModal = (docItem: FormativeDocument) => {
    if (!canManageDocs) return;
    setEditingDoc(docItem);
    setFormTitle(docItem.title || "");
    setFormCategory(docItem.category || "Diretrizes Pedagógicas");
    setFormDescription(docItem.description || "");
    setAttachedFile({
      name: docItem.fileName || "documento.pdf",
      url: docItem.fileUrl || "",
      size: docItem.fileSize || 0,
      type: docItem.fileType || "application/pdf"
    });
    setFileError(null);
    setIsFormModalOpen(true);
  };

  // File upload handler converting PDF to base64
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Validate PDF type
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("Por favor, selecione exclusivamente arquivos no formato PDF (.pdf).");
      return;
    }

    // Size limit: 12MB
    if (file.size > 12 * 1024 * 1024) {
      setFileError("O arquivo PDF é muito grande. O limite máximo permitido é de 12 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      setAttachedFile({
        name: file.name,
        url: base64Url,
        size: file.size,
        type: file.type || "application/pdf"
      });

      // If formTitle is still empty, suggest display title based on the filename without extension
      if (!formTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        setFormTitle(capitalized);
      }
    };

    reader.onerror = () => {
      setFileError("Erro ao processar o arquivo PDF. Tente novamente.");
    };

    reader.readAsDataURL(file);
  };

  // Save / submit document to Firestore
  const handleSaveDocument = async (e: FormEvent) => {
    e.preventDefault();

    if (!canManageDocs) {
      alert("Apenas Gestores e a Direção Pedagógica têm permissão para adicionar ou editar documentos.");
      return;
    }

    if (!formTitle.trim()) {
      setFileError("Por favor, informe o nome do arquivo que será exibido na página de documentos.");
      return;
    }

    if (!attachedFile || !attachedFile.url) {
      setFileError("Por favor, anexe o arquivo PDF do documento formativo.");
      return;
    }

    setIsSaving(true);
    try {
      const authorName = userProfile?.name || currentUser?.displayName || "Direção Pedagógica";
      const authorRole = effectiveRole || "Gestor";

      if (editingDoc) {
        // Update existing document
        const docRef = doc(db, "formative_documents", editingDoc.id);
        await updateDoc(docRef, {
          title: formTitle.trim(),
          category: formCategory,
          description: formDescription.trim(),
          fileName: attachedFile.name,
          fileUrl: attachedFile.url,
          fileSize: attachedFile.size,
          fileType: attachedFile.type || "application/pdf",
          updatedAt: serverTimestamp()
        });

        if (showNotification) {
          showNotification("Documento formativo atualizado com sucesso!", "Sucesso", "success");
        }
      } else {
        // Create new document
        await addDoc(collection(db, "formative_documents"), {
          title: formTitle.trim(),
          fileName: attachedFile.name,
          fileUrl: attachedFile.url,
          fileSize: attachedFile.size,
          fileType: attachedFile.type || "application/pdf",
          category: formCategory,
          description: formDescription.trim(),
          uploadedBy: currentUser?.uid || "gestor",
          uploadedByName: authorName,
          uploadedByRole: authorRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        if (showNotification) {
          showNotification("Documento formativo adicionado com sucesso ao acervo!", "Sucesso", "success");
        }
      }

      setIsFormModalOpen(false);
      setEditingDoc(null);
    } catch (err: any) {
      console.error("Erro ao salvar documento formativo:", err);
      setFileError("Erro ao salvar documento. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (!canManageDocs) return;
    const confirmDelete = window.confirm(
      `Deseja realmente excluir o documento formativo "${docTitle}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmDelete) return;

    setDeletingId(docId);
    try {
      await deleteDoc(doc(db, "formative_documents", docId));
      if (showNotification) {
        showNotification(`Documento "${docTitle}" removido com sucesso.`, "Excluído", "success");
      }
      if (viewingDoc?.id === docId) {
        setIsViewerModalOpen(false);
        setViewingDoc(null);
      }
    } catch (err: any) {
      console.error("Erro ao excluir documento formativo:", err);
      alert("Erro ao excluir documento. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  };

  // Download PDF handler
  const handleDownload = (docItem: FormativeDocument) => {
    if (!docItem.fileUrl) {
      alert("Arquivo indisponível para download.");
      return;
    }

    const link = document.createElement("a");
    link.href = docItem.fileUrl;
    // Sanitized download filename
    const safeTitle = (docItem.title || docItem.fileName || "documento_formativo")
      .trim()
      .replace(/[/\\?%*:|"<>]/g, "-");
    link.download = safeTitle.toLowerCase().endsWith(".pdf") ? safeTitle : `${safeTitle}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (showNotification) {
      showNotification(`Download iniciado: ${docItem.title}`, "Download", "success");
    }
  };

  // Open PDF viewer
  const handleOpenViewer = (docItem: FormativeDocument) => {
    setViewingDoc(docItem);
    setIsViewerModalOpen(true);
  };

  return (
    <motion.div
      key="formative-documents-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-[480px] bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col md:flex-row"
    >
      {/* Sidebar Header */}
      <div className="bg-gradient-to-br from-[#016a86] via-[#01586f] to-[#004254] p-8 text-center relative overflow-hidden flex flex-col items-center justify-between gap-6 md:w-[360px] md:p-12 shrink-0 md:min-h-screen">
        <div className="w-full flex flex-col items-center">
          <div className="w-full flex justify-start mb-6">
            <BackButton onClick={() => setView("dashboard")} className="bg-white/10 hover:bg-white/20 text-white border-white/20" />
          </div>
          <Logo className="h-16 md:h-24 w-auto mb-4" />
          <h1 className="text-white text-xl md:text-2xl font-black tracking-tighter">Documentos Formativos</h1>
          <p className="text-teal-50/80 text-[10px] md:text-xs uppercase tracking-[0.3em] font-black leading-tight mt-1">
            Acervo Pedagógico & Formativo
          </p>
        </div>

        <div className="w-full space-y-4 text-left bg-white/10 p-5 rounded-2xl border border-white/15 backdrop-blur-sm text-white/90">
          <div className="flex items-center gap-3 font-black text-xs uppercase tracking-wider text-amber-300">
            <BookOpen size={18} />
            <span>Biblioteca Pedagógica</span>
          </div>
          <p className="text-xs text-teal-50/90 leading-relaxed font-medium">
            Acesso a diretrizes pedagógicas, ementas, jogos teatrais, textos de estudo e materiais de formação docente da Intervalo Escola de Teatro.
          </p>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-teal-100/90 font-bold">
            <span>Total no Acervo:</span>
            <span className="px-2.5 py-0.5 bg-white/20 rounded-full font-black text-white">{documents.length} PDFs</span>
          </div>
        </div>

        <div className="text-[10px] text-teal-100/60 font-bold uppercase tracking-widest pt-4 border-t border-white/10 w-full flex items-center justify-between">
          <span>Intervalo Escola</span>
          <span className="flex items-center gap-1"><ShieldCheck size={12} /> Acesso Restrito</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-12 flex-1 md:overflow-y-auto bg-slate-50/60 flex flex-col min-h-screen">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-pro-teal uppercase tracking-wider mb-1">
                <FolderArchive size={16} />
                <span>Consulta de Arquivos em PDF</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                Documentos Formativos
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                Consulte e baixe os documentos formativos oficiais. {canManageDocs && "Como gestor/diretor, você pode adicionar e gerenciar novos arquivos."}
              </p>
            </div>

            {/* Add Document Button (Managers and Pedagogical Director only) */}
            {canManageDocs && (
              <button
                onClick={handleOpenAddModal}
                className="px-6 py-3.5 bg-gradient-to-r from-pro-teal to-[#01566d] hover:from-[#01566d] hover:to-[#014052] text-white font-black text-xs md:text-sm rounded-2xl shadow-lg shadow-teal-900/15 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={18} />
                <span>Adicionar Documento</span>
              </button>
            )}
          </div>

          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome do documento, autor ou conteúdo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-pro-teal focus:ring-4 focus:ring-pro-teal/10 transition-all shadow-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1 shrink-0">
                <Filter size={13} />
                <span>Categorias:</span>
              </div>
              <button
                onClick={() => setSelectedCategory("Todos")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === "Todos"
                    ? "bg-pro-teal text-white shadow-md shadow-pro-teal/20"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Todos ({documents.length})
              </button>
              {CATEGORY_OPTIONS.map((cat) => {
                const count = documents.filter(d => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategory === cat
                        ? "bg-pro-teal text-white shadow-md shadow-pro-teal/20"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cat} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-10 h-10 border-4 border-pro-teal/30 border-t-pro-teal rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider">Carregando acervo de documentos...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-teal-50 text-pro-teal rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <FileText size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-black text-slate-800">
                  {searchTerm || selectedCategory !== "Todos"
                    ? "Nenhum documento encontrado"
                    : "Nenhum documento formativo disponível"}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {searchTerm || selectedCategory !== "Todos"
                    ? "Tente ajustar os termos de pesquisa ou remover os filtros de categoria selecionados."
                    : canManageDocs
                    ? "Clique no botão 'Adicionar Documento' acima para anexar o primeiro arquivo PDF formativo e disponibilizá-lo para os professores e equipe."
                    : "Ainda não foram disponibilizados documentos formativos em PDF no momento. Eles aparecerão aqui assim que forem adicionados pela gestão."}
                </p>
              </div>
              {(searchTerm || selectedCategory !== "Todos") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("Todos");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Limpar Filtros
                </button>
              )}
              {canManageDocs && !searchTerm && selectedCategory === "Todos" && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-5 py-2.5 bg-pro-teal hover:bg-[#01566d] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-2"
                >
                  <Plus size={16} /> Adicionar Primeiro PDF
                </button>
              )}
            </div>
          ) : (
            /* Documents Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDocuments.map((docItem) => (
                <motion.div
                  key={docItem.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-pro-teal/40 transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Subtle top decoration */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pro-teal via-cyan-600 to-amber-400 opacity-80" />

                  <div className="space-y-4">
                    {/* Header with Icon & Category */}
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-lg border border-slate-200/60">
                          {docItem.category || "Geral"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {formatFileSize(docItem.fileSize)}
                        </span>
                      </div>
                    </div>

                    {/* Document Title (Selected by gestor) */}
                    <div>
                      <h3 className="font-black text-base md:text-lg text-slate-800 tracking-tight leading-snug line-clamp-2 group-hover:text-pro-teal transition-colors">
                        {docItem.title}
                      </h3>
                      {docItem.description ? (
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed">
                          {docItem.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic mt-2">
                          Arquivo: {docItem.fileName}
                        </p>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        <span>Publicado em: <strong>{formatDate(docItem.createdAt)}</strong></span>
                      </div>
                      {docItem.uploadedByName && (
                        <div className="flex items-center gap-1.5 truncate">
                          <UserIcon size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            Por: <strong className="text-slate-600">{docItem.uploadedByName}</strong>
                            {docItem.uploadedByRole && ` (${docItem.uploadedByRole})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {/* Download Button (Available for all users) */}
                      <button
                        onClick={() => handleDownload(docItem)}
                        className="flex-1 py-2.5 px-3 bg-pro-teal hover:bg-[#01566d] active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-md shadow-pro-teal/15 flex items-center justify-center gap-2 transition-all"
                        title="Baixar arquivo PDF para seu dispositivo"
                      >
                        <Download size={15} />
                        <span>Baixar PDF</span>
                      </button>

                      {/* In-app Preview Button */}
                      <button
                        onClick={() => handleOpenViewer(docItem)}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                        title="Visualizar documento"
                      >
                        <Eye size={16} />
                      </button>
                    </div>

                    {/* Management Actions (Managers & Pedagogical Director only) */}
                    {canManageDocs && (
                      <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
                        <button
                          onClick={() => handleOpenEditModal(docItem)}
                          className="p-2 text-slate-400 hover:text-pro-teal hover:bg-teal-50 rounded-lg transition-all"
                          title="Editar nome ou detalhes do documento"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(docItem.id, docItem.title)}
                          disabled={deletingId === docItem.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir documento"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Adicionar / Editar Documento Formativo (Gestores e Diretor Pedagógico) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] my-auto"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-[#016a86] to-[#004e63] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <FolderArchive size={20} className="text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight">
                      {editingDoc ? "Editar Documento Formativo" : "Adicionar Documento Formativo"}
                    </h3>
                    <p className="text-xs text-teal-100/80 font-medium">
                      Anexe o arquivo em PDF e escolha o nome de exibição oficial.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormModalOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveDocument} className="p-6 md:p-8 overflow-y-auto space-y-5">
                {fileError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs font-medium">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" />
                    <span>{fileError}</span>
                  </div>
                )}

                {/* 1. Nome do arquivo exibido na página */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Nome do Arquivo (Exibição) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Guia Pedagógico de Interpretação Teatral 2026"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-pro-teal focus:outline-none focus:ring-4 focus:ring-pro-teal/10 transition-all"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">
                    Este é o título que todos os professores e usuários verão na listagem de documentos.
                  </p>
                </div>

                {/* 2. Categoria do Documento */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Categoria do Documento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:border-pro-teal focus:outline-none focus:ring-4 focus:ring-pro-teal/10 transition-all"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Upload do Arquivo PDF */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Arquivo PDF <span className="text-red-500">*</span>
                  </label>
                  
                  {attachedFile ? (
                    <div className="p-4 bg-teal-50/70 border-2 border-dashed border-pro-teal/40 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                          <FileText size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-xs text-slate-800 truncate">
                            {attachedFile.name}
                          </div>
                          <div className="text-[10px] text-teal-700 font-bold flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Check size={12} /> PDF Carregado
                            </span>
                            <span>•</span>
                            <span>{formatFileSize(attachedFile.size)}</span>
                          </div>
                        </div>
                      </div>
                      <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shrink-0">
                        Substituir PDF
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-pro-teal bg-slate-50 hover:bg-teal-50/30 rounded-2xl p-6 text-center transition-all group">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="w-12 h-12 bg-white text-slate-400 group-hover:text-pro-teal rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-wide">
                        Clique ou arraste o arquivo PDF aqui
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">
                        Formato suportado: PDF (máx. 12 MB)
                      </p>
                    </label>
                  )}
                </div>

                {/* 4. Descrição Opcional */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Descrição / Instruções (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Breve resumo do conteúdo ou observações pedagógicas de leitura..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-pro-teal focus:outline-none focus:ring-4 focus:ring-pro-teal/10 transition-all resize-none"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !attachedFile}
                    className="px-6 py-2.5 bg-pro-teal hover:bg-[#01566d] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-900/10 transition-all flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{editingDoc ? "Salvar Alterações" : "Adicionar Documento"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: Visualizador do PDF em Tela / Leitor Integrado */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isViewerModalOpen && viewingDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col"
            >
              {/* Viewer Header */}
              <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm md:text-base text-white truncate">
                      {viewingDoc.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {viewingDoc.category} • {formatFileSize(viewingDoc.fileSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(viewingDoc)}
                    className="px-4 py-2 bg-pro-teal hover:bg-[#01566d] text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md"
                  >
                    <Download size={15} />
                    <span className="hidden sm:inline">Baixar PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsViewerModalOpen(false);
                      setViewingDoc(null);
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Viewer Body (iframe/embed) */}
              <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex items-center justify-center">
                {viewingDoc.fileUrl ? (
                  <iframe
                    src={viewingDoc.fileUrl}
                    title={viewingDoc.title}
                    className="w-full h-full rounded-2xl border border-slate-800 bg-white"
                  />
                ) : (
                  <div className="text-center text-slate-400 p-8">
                    <AlertCircle size={32} className="mx-auto mb-2 text-amber-400" />
                    <p className="text-sm font-bold">Não foi possível carregar a pré-visualização do PDF.</p>
                    <button
                      onClick={() => handleDownload(viewingDoc)}
                      className="mt-4 px-4 py-2 bg-pro-teal text-white rounded-xl text-xs font-bold"
                    >
                      Baixar Arquivo Diretamente
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
