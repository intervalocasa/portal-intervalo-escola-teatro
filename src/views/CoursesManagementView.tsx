/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  FileText, 
  Download, 
  X, 
  Check, 
  DollarSign, 
  Clock, 
  Users, 
  BookOpen, 
  Sparkles, 
  Calendar, 
  AlertCircle,
  FileCheck
} from "lucide-react";
import { Course, CourseSyllabusFile } from "../types";
import { BackButton, Logo } from "../components/CommonComponents";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

interface CoursesManagementViewProps {
  courses: Course[];
  setView: (view: any) => void;
  currentUser: any;
}

const AGE_GROUP_SUGGESTIONS = [
  "Acima de 60 anos",
  "Adultos (18 a 59 anos)",
  "Adolescentes (13 a 17 anos)",
  "Infantil (8 a 12 anos)",
  "Infantil (4 a 7 anos)",
  "Livre para todas as idades"
];

export const CoursesManagementView = ({
  courses,
  setView,
  currentUser
}: CoursesManagementViewProps) => {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formId, setFormId] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formAgeGroup, setFormAgeGroup] = useState<string>("");
  const [formMonthlyFee, setFormMonthlyFee] = useState<string>("");
  const [formDurationType, setFormDurationType] = useState<"continua" | "meses">("continua");
  const [formDurationMonths, setFormDurationMonths] = useState<string>("6");
  const [formSyllabusFile, setFormSyllabusFile] = useState<CourseSyllabusFile | null>(null);
  const [fileUploading, setFileUploading] = useState(false);

  // Open modal for new course
  const handleOpenNewCourse = () => {
    setFormId("");
    setFormName("");
    setFormDescription("");
    setFormAgeGroup("Adultos (18 a 59 anos)");
    setFormMonthlyFee("250");
    setFormDurationType("continua");
    setFormDurationMonths("6");
    setFormSyllabusFile(null);
    setSelectedCourse(null);
    setIsModalOpen(true);
  };

  // Open modal to edit existing course
  const handleOpenEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setFormId(course.id);
    setFormName(course.name);
    setFormDescription(course.description || "");
    setFormAgeGroup(course.ageGroup || "Adultos (18 a 59 anos)");
    setFormMonthlyFee(course.monthlyFee ? String(course.monthlyFee) : "");
    setFormDurationType(course.durationType || "continua");
    setFormDurationMonths(course.durationMonths ? String(course.durationMonths) : "6");
    setFormSyllabusFile(course.syllabusFile || null);
    setIsModalOpen(true);
  };

  // File upload handler converting file to base64
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max ~8MB)
    if (file.size > 8 * 1024 * 1024) {
      alert("O arquivo é muito grande. Escolha um arquivo de até 8MB.");
      return;
    }

    setFileUploading(true);
    const reader = new FileReader();

    reader.onload = () => {
      const base64Url = reader.result as string;
      setFormSyllabusFile({
        name: file.name,
        url: base64Url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toLocaleDateString("pt-BR")
      });
      setFileUploading(false);
    };

    reader.onerror = () => {
      alert("Erro ao ler o arquivo selecionado.");
      setFileUploading(false);
    };

    reader.readAsDataURL(file);
  };

  // Remove uploaded file
  const handleRemoveFile = () => {
    setFormSyllabusFile(null);
  };

  // Download syllabus file
  const handleDownloadSyllabus = (syllabus: CourseSyllabusFile) => {
    if (!syllabus.url) return;
    const link = document.createElement("a");
    link.href = syllabus.url;
    link.download = syllabus.name || "ementa_pedagagica.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save course to Firestore
  const handleSaveCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Por favor, informe o nome do curso / tipo de turma.");
      return;
    }

    setIsSaving(true);
    try {
      const courseId = formId || "course_" + Date.now();
      const courseRef = doc(db, "cursos", courseId);

      const feeNumber = formMonthlyFee ? parseFloat(formMonthlyFee.replace(",", ".")) : 0;
      const durationMonthsNum = formDurationType === "meses" ? parseInt(formDurationMonths, 10) || 6 : null;

      const courseData: Course = {
        id: courseId,
        name: formName.trim(),
        description: formDescription.trim(),
        ageGroup: formAgeGroup.trim(),
        monthlyFee: isNaN(feeNumber) ? 0 : feeNumber,
        durationType: formDurationType,
        durationMonths: durationMonthsNum || undefined,
        syllabusFile: formSyllabusFile || null,
        updatedAt: serverTimestamp()
      };

      if (!formId) {
        courseData.createdAt = serverTimestamp();
      }

      await setDoc(courseRef, courseData, { merge: true });
      setIsModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar curso:", err);
      alert("Ocorreu um erro ao salvar as informações do curso.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete course
  const handleDeleteCourse = async (courseId: string) => {
    try {
      await deleteDoc(doc(db, "cursos", courseId));
      setIsDeletingId(null);
      if (selectedCourse?.id === courseId) {
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error("Erro ao excluir curso:", err);
      alert("Erro ao excluir o curso.");
    }
  };

  return (
    <motion.div
      key="courses-management-view"
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
          <h1 className="text-white text-xl md:text-2xl font-black tracking-tighter">Cursos da Escola</h1>
          <p className="text-teal-50/70 text-[10px] md:text-xs uppercase tracking-[0.3em] font-black leading-tight mt-1">
            Tipos de Turma & Ementas
          </p>
        </div>

        <div className="w-full space-y-4 text-left bg-white/10 p-4 rounded-2xl border border-white/15 backdrop-blur-sm text-white/90">
          <div className="flex items-center gap-3 font-bold text-xs">
            <GraduationCap size={20} className="text-amber-300" />
            <span>Catálogo Pedagógico</span>
          </div>
          <p className="text-[11px] text-teal-50/80 leading-relaxed font-medium">
            Gerencie a descrição, faixa etária, valor das mensalidades e ementas pedagógicas das modalidades de ensino.
          </p>
        </div>

        <div className="text-[10px] text-teal-100/60 font-bold uppercase tracking-widest pt-4 border-t border-white/10 w-full">
          Intervalo Escola de Teatro
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-12 flex-1 md:overflow-y-auto bg-slate-50/50 flex flex-col min-h-screen">
        <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-pro-teal uppercase tracking-wider mb-1">
                <BookOpen size={16} />
                <span>Ementas & Modalidades</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                Cursos Disponíveis
              </h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                Cadastre e atualize informações essenciais dos cursos ministrados na Intervalo.
              </p>
            </div>

            {/* Add Course Button */}
            <button
              onClick={handleOpenNewCourse}
              className="px-6 py-3.5 bg-[#016a86] hover:bg-[#005167] text-white font-bold text-xs md:text-sm rounded-2xl shadow-lg shadow-[#016a86]/20 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} />
              <span>Novo Curso</span>
            </button>
          </div>

          {/* Courses Grid */}
          {courses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center space-y-4">
              <GraduationCap size={48} className="mx-auto text-slate-300" />
              <h3 className="text-lg font-black text-slate-700">Nenhum curso cadastrado no momento</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clique no botão "Novo Curso" acima para configurar os tipos de turmas, faixa etária, mensalidade e anexar ementas pedagógicas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="p-3 rounded-2xl bg-[#016a86]/10 text-[#016a86] shrink-0 group-hover:bg-[#016a86] group-hover:text-white transition-colors duration-300">
                        <GraduationCap size={22} />
                      </div>

                      <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-wider">
                        {course.ageGroup || "Faixa Etária N/D"}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight leading-snug group-hover:text-[#016a86] transition-colors">
                        {course.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-3 mt-2 leading-relaxed">
                        {course.description || "Nenhuma descrição informada para este curso."}
                      </p>
                    </div>

                    {/* Metadata List */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
                      {/* Monthly Fee */}
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5 text-[11px]">
                          <DollarSign size={14} className="text-[#016a86]" />
                          Mensalidade:
                        </span>
                        <span className="font-extrabold text-slate-800">
                          {course.monthlyFee ? `R$ ${course.monthlyFee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "A consultar"}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5 text-[11px]">
                          <Clock size={14} className="text-[#016a86]" />
                          Duração:
                        </span>
                        <span className="font-bold text-slate-700">
                          {course.durationType === "meses" 
                            ? `${course.durationMonths || 6} meses` 
                            : "Contínua"}
                        </span>
                      </div>

                      {/* Syllabus status */}
                      <div className="flex items-center justify-between text-slate-600 pt-1">
                        <span className="font-semibold text-slate-400 flex items-center gap-1.5 text-[11px]">
                          <FileText size={14} className="text-[#016a86]" />
                          Ementa Pedagógica:
                        </span>
                        {course.syllabusFile ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <FileCheck size={12} />
                            Anexada
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Pendente</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditCourse(course)}
                      className="flex-1 py-2.5 bg-slate-50 hover:bg-[#016a86] text-slate-700 hover:text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Edit3 size={15} />
                      Editar Curso
                    </button>

                    {course.syllabusFile && (
                      <button
                        onClick={() => handleDownloadSyllabus(course.syllabusFile!)}
                        className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl transition-all border border-emerald-200 hover:border-emerald-600"
                        title="Baixar Ementa Pedagógica"
                      >
                        <Download size={16} />
                      </button>
                    )}

                    <button
                      onClick={() => setIsDeletingId(course.id)}
                      className="p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all border border-rose-200 hover:border-rose-600"
                      title="Excluir curso"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* EDIT / CREATE COURSE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#016a86] to-[#004e63] p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/10 rounded-xl">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg">
                      {selectedCourse ? `Editar: ${selectedCourse.name}` : "Novo Curso / Tipo de Turma"}
                    </h3>
                    <p className="text-xs text-teal-100/80">Configure os detalhes pedagógicos e financeiros</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSaveCourse} className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                
                {/* Nome do Curso */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nome do Curso / Tipo de Turma <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Teatro 60+, Curso Livre Adultos, Prática Profissional de Montagem..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#016a86]"
                  />
                </div>

                {/* Descrição do Curso */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Descrição do Curso
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Apresente os objetivos, técnicas trabalhadas e perfil do público-alvo..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:border-[#016a86] resize-none"
                  />
                </div>

                {/* Faixa Etária e Mensalidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Faixa Etária */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Faixa Etária
                    </label>
                    <input
                      type="text"
                      list="ageGroupSuggestions"
                      value={formAgeGroup}
                      onChange={(e) => setFormAgeGroup(e.target.value)}
                      placeholder="Ex: Acima de 60 anos, 18+..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:outline-none focus:border-[#016a86]"
                    />
                    <datalist id="ageGroupSuggestions">
                      {AGE_GROUP_SUGGESTIONS.map(ag => (
                        <option key={ag} value={ag} />
                      ))}
                    </datalist>
                  </div>

                  {/* Valor da Mensalidade */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Valor da Mensalidade (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formMonthlyFee}
                        onChange={(e) => setFormMonthlyFee(e.target.value)}
                        placeholder="250.00"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-bold focus:outline-none focus:border-[#016a86]"
                      />
                    </div>
                  </div>
                </div>

                {/* Duração */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Duração do Curso
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pt-1">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                      <input
                        type="radio"
                        name="durationType"
                        checked={formDurationType === "continua"}
                        onChange={() => setFormDurationType("continua")}
                        className="accent-[#016a86] w-4 h-4"
                      />
                      <span>Contínua (Ano Todo)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-700">
                      <input
                        type="radio"
                        name="durationType"
                        checked={formDurationType === "meses"}
                        onChange={() => setFormDurationType("meses")}
                        className="accent-[#016a86] w-4 h-4"
                      />
                      <span>Quantidade de Meses Específica</span>
                    </label>
                  </div>

                  {formDurationType === "meses" && (
                    <div className="pt-3 flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500">Duração:</span>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        value={formDurationMonths}
                        onChange={(e) => setFormDurationMonths(e.target.value)}
                        className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-black text-slate-800 text-center focus:outline-none focus:border-[#016a86]"
                      />
                      <span className="text-xs font-bold text-slate-700">meses</span>
                    </div>
                  )}
                </div>

                {/* Upload Ementa Pedagógica */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Ementa Pedagógica (Documento / PDF)
                  </label>

                  {formSyllabusFile ? (
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                          <FileCheck size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-800 truncate">{formSyllabusFile.name}</div>
                          <div className="text-[10px] text-emerald-700 font-medium">Anexado em {formSyllabusFile.uploadedAt || "Recente"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadSyllabus(formSyllabusFile)}
                          className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                          title="Baixar arquivo"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                          title="Remover ementa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 hover:border-[#016a86] bg-slate-50 hover:bg-[#016a86]/5 transition-all p-6 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer group text-center">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="p-3 bg-white group-hover:bg-[#016a86] text-[#016a86] group-hover:text-white rounded-full shadow-sm transition-colors">
                        <Upload size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-700 group-hover:text-[#016a86] block">
                          Clique para fazer upload da ementa
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Arquivos em formato PDF, DOC ou DOCX (Até 8MB)
                        </span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-3 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving || fileUploading}
                    className="px-6 py-3 bg-[#016a86] hover:bg-[#005167] text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#016a86]/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    <Check size={16} />
                    <span>{isSaving ? "Salvando..." : "Salvar Curso"}</span>
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {isDeletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-sm w-full p-6 rounded-3xl shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>

              <div>
                <h3 className="font-black text-slate-800 text-base">Excluir Curso?</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Esta ação removerá o cadastro e ementa do curso. As turmas já existentes no sistema permanecerão salvas.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setIsDeletingId(null)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteCourse(isDeletingId)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
