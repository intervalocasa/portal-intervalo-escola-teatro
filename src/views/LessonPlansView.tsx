/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  Presentation, 
  Trash2, 
  Edit3, 
  Copy, 
  Download, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  UserCircle,
  BookOpen,
  ArrowRight,
  X,
  AlertCircle
} from "lucide-react";
import { User, Class, Skill, LessonPlan, UserRole } from "../types";
import { Logo, BackButton, Avatar } from "../components/CommonComponents";
import { getUserDisplayName } from "../lib/userUtils";
import { LessonPlanForm, LessonPlanFormValues } from "../components/LessonPlanForm";
import { 
  fetchSkills, 
  fetchLessonPlans, 
  saveLessonPlan, 
  deleteLessonPlan, 
  getTeacherLinkedClasses,
  DEFAULT_SKILLS
} from "../services/lessonPlanService";
import { PROFESSIONAL_COURSE_CRITERIA } from "../constants";
import { generateLessonPlanPDF } from "../lib/pdfExporter";

interface LessonPlansViewProps {
  currentUser: any;
  users: User[];
  classes: Class[];
  setView: (view: string) => void;
  userRole?: UserRole | null;
}

export const LessonPlansView = ({
  currentUser,
  users,
  classes,
  setView,
  userRole
}: LessonPlansViewProps) => {
  const isGestor = userRole === "Gestor" || 
    userRole === "Diretor Pedagógico" ||
    userRole === "Diretor Pedagógico e Professor" ||
    userRole === "Auxiliar Administrativo" ||
    currentUser?.role === "Gestor" || 
    currentUser?.role === "Diretor Pedagógico" ||
    currentUser?.email === "intervalocasa@gmail.com";

  // State
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // History filters
  const [filterClassId, setFilterClassId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const teacher = users.find(u => u.id === currentUser?.uid || u.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  // Classes linked to logged-in teacher
  const teacherClasses = useMemo(() => {
    return getTeacherLinkedClasses(currentUser, users, classes, isGestor);
  }, [currentUser, users, classes, isGestor]);

  // Load skills and lesson plans
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [skills, plans] = await Promise.all([
        fetchSkills(),
        fetchLessonPlans({
          teacherId: currentUser?.uid || currentUser?.id,
          isGestor
        })
      ]);
      setSkillsList(skills);
      setLessonPlans(plans);
    } catch (err) {
      console.error("Erro ao carregar dados dos planos de aula:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.uid, isGestor]);

  // Set default selected class on load
  useEffect(() => {
    if (teacherClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(teacherClasses[0].id);
    }
  }, [teacherClasses, selectedClassId]);

  const resolveSkill = (skillId: string) => {
    const found: any = skillsList.find(s => s.id === skillId || s.name === skillId)
      || DEFAULT_SKILLS.find(d => d.id === skillId || d.name === skillId)
      || PROFESSIONAL_COURSE_CRITERIA.find(p => p.id === skillId || p.label === skillId);
    return {
      id: skillId,
      name: found?.name || found?.label || skillId,
      definition: found?.definition || "",
      category: found?.category || "Pedagógico"
    };
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRefreshSkills = async () => {
    const updated = await fetchSkills();
    setSkillsList(updated);
  };

  // Submit new or updated lesson plan
  const handleSubmitPlan = async (formData: LessonPlanFormValues, planId?: string) => {
    setIsSubmitting(true);
    try {
      const targetClass = classes.find(c => c.id === formData.classId);
      const teacherName = getUserDisplayName(teacher) || currentUser?.displayName || currentUser?.name || "Professor";

      await saveLessonPlan(
        {
          teacherId: currentUser?.uid || currentUser?.id || "teacher",
          teacherName,
          classId: formData.classId,
          className: targetClass ? `${targetClass.code} - ${targetClass.type}` : "Turma",
          classType: targetClass?.type || "",
          date: formData.date,
          generalObjective: formData.generalObjective,
          skills: formData.skills,
          activities: formData.activities,
          observations: formData.observations
        },
        planId
      );

      showToast(planId ? "Plano de aula atualizado com sucesso!" : "Plano de aula salvo com sucesso!");
      setEditingPlan(null);
      await loadData();
      setActiveTab("history");
    } catch (err: any) {
      console.error("Erro ao salvar plano de aula:", err);
      showToast("Erro ao salvar plano de aula: " + (err.message || "Tente novamente"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete plan
  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este plano de aula?")) return;
    try {
      await deleteLessonPlan(planId);
      showToast("Plano de aula excluído.");
      setLessonPlans(prev => prev.filter(p => p.id !== planId));
      if (viewingPlan?.id === planId) setViewingPlan(null);
    } catch (err: any) {
      showToast("Erro ao excluir plano: " + err.message, "error");
    }
  };

  // Duplicate plan
  const handleDuplicatePlan = (plan: LessonPlan) => {
    setEditingPlan({
      ...plan,
      id: undefined, // remove id to trigger create
      date: new Date().toISOString().split("T")[0]
    });
    setSelectedClassId(plan.classId);
    setActiveTab("form");
    showToast("Cópia do plano carregada! Ajuste a data ou a turma e salve.");
  };

  // Edit plan
  const handleEditPlan = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setSelectedClassId(plan.classId);
    setActiveTab("form");
  };

  // Filtered History
  const filteredPlans = useMemo(() => {
    return lessonPlans.filter(p => {
      const matchClass = filterClassId === "ALL" || p.classId === filterClassId;
      const query = searchQuery.toLowerCase().trim();
      const matchQuery = !query || 
        p.className?.toLowerCase().includes(query) ||
        p.generalObjective?.toLowerCase().includes(query) ||
        p.teacherName?.toLowerCase().includes(query) ||
        (p.activities || []).some(a => a.objective?.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query));
      return matchClass && matchQuery;
    });
  }, [lessonPlans, filterClassId, searchQuery]);

  return (
    <motion.div
      key="lesson-plans-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-5xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton onClick={() => setView("dashboard")} className="!text-white pointer-events-auto" />
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-8 md:p-14 text-center relative overflow-hidden flex flex-col items-center gap-2">
        <Logo className="h-10 md:h-14 w-auto mb-1 brightness-0 invert" />
        <h1 className="text-white text-2xl md:text-4xl font-black tracking-tight uppercase">
          Planos de Aula
        </h1>
        <p className="text-teal-100/80 text-xs md:text-sm font-bold max-w-xl">
          Planejamento pedagógico, objetivos, habilidades e dinâmicas estruturadas
        </p>

        <div className="flex items-center gap-3 mt-4">
          <div className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-wider text-white border border-white/10 backdrop-blur-md flex items-center gap-2">
            <UserCircle size={14} className="text-pro-yellow" />
            {getUserDisplayName(teacher) || currentUser?.email || "Professor"}
          </div>
          {isGestor && (
            <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-full">
              Visão Geral (Gestão)
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 p-1.5 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
          <button
            onClick={() => {
              setEditingPlan(null);
              setActiveTab("form");
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "form"
                ? "bg-white text-pro-teal shadow-lg"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <Plus size={16} /> {editingPlan ? "Editar Plano" : "Novo Plano de Aula"}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-white text-pro-teal shadow-lg"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <BookOpen size={16} /> Planos Salvos ({lessonPlans.length})
          </button>
        </div>
      </div>

      {/* Main Body Content */}
      <div className="p-6 md:p-12 flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-2xl shadow-lg border flex items-center gap-3 text-sm font-bold ${
                  toastMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : "bg-red-50 text-red-900 border-red-200"
                }`}
              >
                {toastMessage.type === "success" ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertCircle size={20} className="text-red-600" />}
                <span>{toastMessage.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB 1: FORMULÁRIO DE PLANO DE AULA */}
          {activeTab === "form" && (
            <div>
              {/* Informative Banner */}
              <div className="mb-6 p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pro-teal text-white rounded-xl">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-pro-teal">
                      {editingPlan ? "Modo de Edição de Plano" : "Novo Planejamento de Aula"}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      As habilidades selecionadas sincronizam diretamente com os critérios pedagógicos dos Diários de Classe.
                    </p>
                  </div>
                </div>

                {editingPlan && (
                  <button
                    onClick={() => setEditingPlan(null)}
                    className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold border border-slate-200"
                  >
                    Criar Novo em vez de Editar
                  </button>
                )}
              </div>

              {/* Form Component */}
              <LessonPlanForm
                teacherClasses={teacherClasses}
                skillsList={skillsList}
                onRefreshSkills={handleRefreshSkills}
                onSubmitPlan={handleSubmitPlan}
                initialData={editingPlan}
                selectedClassId={selectedClassId}
                selectedDate={selectedDate}
                onCancel={() => {
                  setEditingPlan(null);
                  setActiveTab("history");
                }}
                isSubmitting={isSubmitting}
              />
            </div>
          )}

          {/* TAB 2: HISTÓRICO DE PLANOS SALVOS */}
          {activeTab === "history" && (
            <div className="space-y-6">
              {/* Filter and Search Bar */}
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por objetivo, turma, atividade ou professor..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-pro-teal"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={filterClassId}
                    onChange={(e) => setFilterClassId(e.target.value)}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-pro-teal"
                  >
                    <option value="ALL">Todas as turmas ({lessonPlans.length})</option>
                    {teacherClasses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.type}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      setEditingPlan(null);
                      setActiveTab("form");
                    }}
                    className="px-5 py-3 bg-pro-teal hover:bg-pro-teal/90 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-md shadow-teal-900/10"
                  >
                    <Plus size={16} /> Novo
                  </button>
                </div>
              </div>

              {/* Cards List */}
              {isLoading ? (
                <div className="p-16 text-center">
                  <div className="w-10 h-10 border-4 border-pro-teal border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Carregando planos de aula...</p>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
                    <BookOpen size={32} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-700">Nenhum plano de aula encontrado</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      {searchQuery || filterClassId !== "ALL" 
                        ? "Tente ajustar os filtros ou termo de busca." 
                        : "Comece criando o seu primeiro plano de aula pedagógico."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPlan(null);
                      setActiveTab("form");
                    }}
                    className="px-6 py-3 bg-pro-teal text-white rounded-2xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-teal-900/10"
                  >
                    <Plus size={16} /> Criar Primeiro Plano
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredPlans.map(plan => {
                    const dateFormatted = typeof plan.date === "string" 
                      ? plan.date.split("-").reverse().join("/") 
                      : (plan.date?.toDate ? plan.date.toDate().toLocaleDateString("pt-BR") : new Date(plan.date || 0).toLocaleDateString("pt-BR"));

                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 md:p-7 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-md transition-all space-y-4 group"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-xl bg-teal-50 text-pro-teal text-xs font-black uppercase tracking-wider">
                                {plan.className || "Turma"}
                              </span>
                              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                <Calendar size={13} className="text-pro-orange" /> {dateFormatted}
                              </span>
                            </div>
                            {plan.teacherName && isGestor && (
                              <p className="text-xs text-slate-500 font-bold">
                                Prof. {plan.teacherName}
                              </p>
                            )}
                          </div>

                          {/* Quick Actions Bar */}
                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              onClick={() => setViewingPlan(plan)}
                              className="p-2.5 bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-pro-teal rounded-xl transition-all"
                              title="Visualizar detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => generateLessonPlanPDF(plan, skillsList)}
                              className="p-2.5 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-xl transition-all"
                              title="Exportar PDF"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={() => handleDuplicatePlan(plan)}
                              className="p-2.5 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded-xl transition-all"
                              title="Duplicar como modelo"
                            >
                              <Copy size={16} />
                            </button>
                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all"
                              title="Editar plano"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => plan.id && handleDeletePlan(plan.id)}
                              className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Objetivo Geral */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Objetivo Geral</span>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed line-clamp-2">
                            {plan.generalObjective}
                          </p>
                        </div>

                        {/* Habilidades & Atividades Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-50">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                            Habilidades:
                          </span>
                          {(plan.skills || []).map(skillId => {
                            const meta = resolveSkill(skillId);
                            return (
                              <span
                                key={skillId}
                                className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-100"
                              >
                                {meta.name}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Layers size={14} className="text-slate-400" />
                            {plan.activities?.length || 0} atividade(s) planejada(s)
                          </span>
                          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                            <Clock size={14} />
                            {plan.totalDuration || (plan.activities || []).reduce((sum, a) => sum + (Number(a.duration) || 0), 0)} min total
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO COMPLETA DO PLANO */}
      <AnimatePresence>
        {viewingPlan && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Plano de Aula Pedagógico
                  </span>
                  <h3 className="text-xl font-black tracking-tight">{viewingPlan.className}</h3>
                  <p className="text-xs text-slate-400 font-bold">
                    📅 {typeof viewingPlan.date === "string" ? viewingPlan.date.split("-").reverse().join("/") : new Date(viewingPlan.date?.toDate?.() || viewingPlan.date).toLocaleDateString("pt-BR")} • Prof. {viewingPlan.teacherName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateLessonPlanPDF(viewingPlan, skillsList)}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <Download size={14} /> PDF
                  </button>
                  <button
                    onClick={() => setViewingPlan(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                {/* 1. Objetivo Geral */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    1. Objetivo Geral da Aula
                  </span>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {viewingPlan.generalObjective}
                  </p>
                </div>

                {/* 2. Habilidades */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    2. Habilidades & Competências ({viewingPlan.skills?.length || 0})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(viewingPlan.skills || []).map(skillId => {
                      const meta = resolveSkill(skillId);
                      return (
                        <div key={skillId} className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
                          <p className="text-xs font-black text-purple-950">{meta.name}</p>
                          {meta.definition && (
                            <p className="text-[11px] text-purple-800/80 font-medium mt-0.5">{meta.definition}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Atividades */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      3. Sequência de Atividades ({viewingPlan.activities?.length || 0})
                    </span>
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Duração Total: {viewingPlan.totalDuration || 0} min
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(viewingPlan.activities || []).map((act, idx) => (
                      <div key={idx} className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                            <span className="w-5 h-5 bg-slate-900 text-white rounded-lg text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            {act.objective}
                          </span>
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Clock size={12} /> {act.duration} min
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {act.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Observações */}
                {viewingPlan.observations && (
                  <div className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      4. Observações / Materiais Necessários
                    </span>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      {viewingPlan.observations}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    handleEditPlan(viewingPlan);
                    setViewingPlan(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Edit3 size={14} /> Editar Este Plano
                </button>
                <button
                  onClick={() => setViewingPlan(null)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
