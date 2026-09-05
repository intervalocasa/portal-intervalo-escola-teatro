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
  X,
  AlertCircle,
  Users,
  RotateCcw,
  FileText
} from "lucide-react";
import { User, Class, Skill, LessonPlan, UserRole } from "../types";
import { Logo, BackButton } from "../components/CommonComponents";
import { getUserDisplayName } from "../lib/userUtils";
import { LessonPlanForm, LessonPlanFormValues } from "../components/LessonPlanForm";
import { 
  fetchSkills, 
  fetchLessonPlans, 
  saveLessonPlan, 
  deleteLessonPlan, 
  getTeacherLinkedClasses,
  getAvailableClassDates,
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

const MONTHS_LIST = [
  { value: "ALL", label: "Todos os Meses" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" }
];

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

  // State - Default to history tab for gestor/diretor pedagogico so they immediately see submitted plans
  const [activeTab, setActiveTab] = useState<"form" | "history">(isGestor ? "history" : "form");
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // History filters requested: Professor, Mês, Turma, Search
  const [filterTeacherId, setFilterTeacherId] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");
  const [filterYear, setFilterYear] = useState<string>("ALL");
  const [filterClassId, setFilterClassId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const currentTeacherUser = users.find(u => u.id === currentUser?.uid || u.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  // Classes linked to logged-in teacher or all classes if gestor
  const teacherClasses = useMemo(() => {
    return getTeacherLinkedClasses(currentUser, users, classes, isGestor);
  }, [currentUser, users, classes, isGestor]);

  const allowedClassIds = useMemo(() => {
    return new Set(teacherClasses.map(c => c.id));
  }, [teacherClasses]);

  // Base list of visible plans: gestors see all, professors see only their linked classes or plans they authored
  const userVisiblePlans = useMemo(() => {
    if (isGestor) return lessonPlans;
    const currentUserId = currentUser?.uid || currentUser?.id;
    const currentTeacherId = currentTeacherUser?.id;
    const currentTeacherName = currentTeacherUser?.name?.trim().toLowerCase();
    const currentArtisticName = currentTeacherUser?.artisticName?.trim().toLowerCase();

    return lessonPlans.filter(p => {
      // 1. Plan belongs to a class linked to this teacher
      if (p.classId && allowedClassIds.has(p.classId)) return true;

      // 2. Plan was authored by this teacher
      if (p.teacherId && (p.teacherId === currentUserId || p.teacherId === currentTeacherId)) return true;

      // 3. Plan teacherName matches
      if (p.teacherName) {
        const pName = p.teacherName.trim().toLowerCase();
        if (currentTeacherName && pName === currentTeacherName) return true;
        if (currentArtisticName && pName === currentArtisticName) return true;
      }

      return false;
    });
  }, [lessonPlans, isGestor, allowedClassIds, currentUser?.uid, currentUser?.id, currentTeacherUser]);

  // Teachers list for filter (for gestors: all teachers; for professors: only teachers linked to their classes / themselves)
  const teachersList = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    if (isGestor) {
      // 1. Registered teachers in users list
      users.forEach(u => {
        if (u.role === "Professor" || u.role === "Diretor Pedagógico e Professor" || (u as any).isTeacher) {
          const dName = getUserDisplayName(u) || u.name || u.email || "Professor";
          if (!seen.has(u.id)) {
            seen.add(u.id);
            list.push({ id: u.id, name: dName });
          }
        }
      });

      // 2. Teachers found in existing lesson plans
      userVisiblePlans.forEach(p => {
        if (p.teacherId && !seen.has(p.teacherId)) {
          seen.add(p.teacherId);
          list.push({ id: p.teacherId, name: p.teacherName || "Professor" });
        } else if (!p.teacherId && p.teacherName && !seen.has(p.teacherName)) {
          seen.add(p.teacherName);
          list.push({ id: p.teacherName, name: p.teacherName });
        }
      });
    } else {
      // For professors: show their own name first
      if (currentTeacherUser) {
        const myName = getUserDisplayName(currentTeacherUser) || currentTeacherUser.name || "Meu Usuário";
        seen.add(currentTeacherUser.id);
        list.push({ id: currentTeacherUser.id, name: `${myName} (Você)` });
      } else if (currentUser) {
        const myName = currentUser.displayName || currentUser.email || "Meu Usuário";
        const myId = currentUser.uid || currentUser.id;
        seen.add(myId);
        list.push({ id: myId, name: `${myName} (Você)` });
      }

      // Teachers of their linked classes
      teacherClasses.forEach(c => {
        (c.teacherIds || []).forEach(tid => {
          if (!seen.has(tid)) {
            seen.add(tid);
            const u = users.find(user => user.id === tid);
            if (u) {
              list.push({ id: u.id, name: getUserDisplayName(u) || u.name || "Professor" });
            }
          }
        });
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [users, userVisiblePlans, isGestor, currentTeacherUser, currentUser, teacherClasses]);

  // Years list for filter
  const yearsList = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const yearsSet = new Set<string>([String(currentYr), String(currentYr - 1), String(currentYr + 1)]);
    
    userVisiblePlans.forEach(p => {
      if (typeof p.date === "string") {
        const y = p.date.split("-")[0];
        if (y && y.length === 4) yearsSet.add(y);
      } else if (p.date?.toDate) {
        yearsSet.add(String(p.date.toDate().getFullYear()));
      }
    });

    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [userVisiblePlans]);

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
      if (!isGestor && !allowedClassIds.has(formData.classId)) {
        showToast("Você só pode criar planos de aula para turmas vinculadas ao seu usuário.", "error");
        setIsSubmitting(false);
        return;
      }

      const targetClass = classes.find(c => c.id === formData.classId);
      const teacherName = getUserDisplayName(currentTeacherUser) || currentUser?.displayName || currentUser?.name || "Professor";

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
    const targetClass = classes.find(c => c.id === plan.classId);
    const availableDates = getAvailableClassDates(targetClass);
    const nextValidDate = availableDates.find(d => !d.isExpired)?.value || availableDates[0]?.value || new Date().toISOString().split("T")[0];

    setEditingPlan({
      ...plan,
      id: undefined, // remove id to trigger create
      date: nextValidDate
    });
    setSelectedClassId(plan.classId);
    setActiveTab("form");
    showToast("Cópia do plano carregada! Ajuste as atividades ou a data e salve.");
  };

  // Edit plan
  const handleEditPlan = (plan: LessonPlan) => {
    setEditingPlan(plan);
    setSelectedClassId(plan.classId);
    setActiveTab("form");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilterTeacherId("ALL");
    setFilterMonth("ALL");
    setFilterYear("ALL");
    setFilterClassId("ALL");
    setSearchQuery("");
  };

  const hasActiveFilters = filterTeacherId !== "ALL" || filterMonth !== "ALL" || filterYear !== "ALL" || filterClassId !== "ALL" || searchQuery.trim().length > 0;

  // Filtered History
  const filteredPlans = useMemo(() => {
    return userVisiblePlans.filter(p => {
      // 1. Filter by Teacher
      const matchTeacher = filterTeacherId === "ALL" || 
        p.teacherId === filterTeacherId || 
        p.teacherName === filterTeacherId ||
        (users.find(u => u.id === filterTeacherId)?.name === p.teacherName);

      // 2. Filter by Class
      const matchClass = filterClassId === "ALL" || p.classId === filterClassId;

      // 3. Filter by Month & Year
      let planYear: number | null = null;
      let planMonth: number | null = null; // 1-12
      if (typeof p.date === "string") {
        const parts = p.date.split("-").map(Number);
        if (parts.length >= 2) {
          planYear = parts[0];
          planMonth = parts[1];
        }
      } else if (p.date?.toDate) {
        const d = p.date.toDate();
        planYear = d.getFullYear();
        planMonth = d.getMonth() + 1;
      } else if (p.date) {
        const d = new Date(p.date);
        if (!isNaN(d.getTime())) {
          planYear = d.getFullYear();
          planMonth = d.getMonth() + 1;
        }
      }

      const matchMonth = filterMonth === "ALL" || (planMonth !== null && String(planMonth) === filterMonth);
      const matchYear = filterYear === "ALL" || (planYear !== null && String(planYear) === filterYear);

      // 4. Search query
      const query = searchQuery.toLowerCase().trim();
      const currentClassCode = (classes.find(c => c.id === p.classId)?.code || p.className || "").toLowerCase();
      const currentClassType = (classes.find(c => c.id === p.classId)?.type || p.classType || "").toLowerCase();
      const matchQuery = !query || 
        currentClassCode.includes(query) ||
        currentClassType.includes(query) ||
        p.generalObjective?.toLowerCase().includes(query) ||
        p.teacherName?.toLowerCase().includes(query) ||
        p.observations?.toLowerCase().includes(query) ||
        (p.activities || []).some(a => a.objective?.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query));

      return matchTeacher && matchClass && matchMonth && matchYear && matchQuery;
    });
  }, [userVisiblePlans, filterTeacherId, filterClassId, filterMonth, filterYear, searchQuery, users, classes]);

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
          Planejamento pedagógico, consulta por professor, mês e turma, e exportação em PDF
        </p>

        <div className="flex items-center gap-3 mt-4">
          <div className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-black uppercase tracking-wider text-white border border-white/10 backdrop-blur-md flex items-center gap-2">
            <UserCircle size={14} className="text-pro-yellow" />
            {getUserDisplayName(currentTeacherUser) || currentUser?.email || "Gestão"}
          </div>
          {isGestor ? (
            <span className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-full shadow-md shadow-amber-950/20">
              Acesso Gestor / Direção Pedagógica
            </span>
          ) : (
            <span className="px-3 py-1 bg-emerald-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-full shadow-md shadow-emerald-950/20">
              Portal do Professor • {teacherClasses.length} {teacherClasses.length === 1 ? "turma vinculada" : "turmas vinculadas"}
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 p-1.5 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "history"
                ? "bg-white text-pro-teal shadow-lg"
                : "text-white/80 hover:text-white hover:bg-white/10"
            }`}
          >
            <BookOpen size={16} /> Planos Submetidos ({userVisiblePlans.length})
          </button>
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

          {/* TAB 1: HISTÓRICO E FILTROS DE PLANOS SUBMETIDOS */}
          {activeTab === "history" && (
            <div className="space-y-6">
              
              {/* FILTROS AVANÇADOS: PROFESSOR, MÊS, ANO E TURMA */}
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-teal-50 text-pro-teal rounded-2xl">
                      <Filter size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight">
                        Filtros de Consulta dos Planos de Aula
                      </h3>
                      <p className="text-xs text-slate-500 font-bold">
                        Filtre por professor, mês/ano e turma para consultar ou exportar
                      </p>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="self-start sm:self-center px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Limpar Filtros
                    </button>
                  )}
                </div>

                {/* Grid dos 3 Filtros Principais: Professor, Mês/Ano e Turma */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* 1. Filtro por Professor */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users size={14} className="text-pro-teal" /> Professor
                    </label>
                    <select
                      value={filterTeacherId}
                      onChange={(e) => setFilterTeacherId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-pro-teal transition-all"
                    >
                      <option value="ALL">Todos os Professores</option>
                      {teachersList.map(t => (
                        <option key={t.id} value={t.id}>
                          Prof. {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Filtro por Mês */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar size={14} className="text-pro-orange" /> Mês
                    </label>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-pro-teal transition-all"
                    >
                      {MONTHS_LIST.map(m => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Filtro por Ano */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400" /> Ano
                    </label>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-pro-teal transition-all"
                    >
                      <option value="ALL">Todos os Anos</option>
                      {yearsList.map(yr => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 4. Filtro por Turma */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Layers size={14} className="text-purple-600" /> Turma
                    </label>
                    <select
                      value={filterClassId}
                      onChange={(e) => setFilterClassId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-pro-teal transition-all"
                    >
                      <option value="ALL">
                        {isGestor ? `Todas as Turmas (${classes.length})` : `Minhas Turmas Vinculadas (${teacherClasses.length})`}
                      </option>
                      {(isGestor ? classes : teacherClasses).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Barra de Busca Textual e Botão de Novo Plano */}
                <div className="flex flex-col sm:flex-row gap-3 items-center pt-2">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por objetivo, atividade, observação, turma ou professor..."
                      className="w-full pl-11 pr-9 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-pro-teal transition-all"
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

                  <button
                    onClick={() => {
                      setEditingPlan(null);
                      setActiveTab("form");
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-pro-teal hover:bg-pro-teal/90 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-teal-900/10 transition-all"
                  >
                    <Plus size={16} /> Novo Plano
                  </button>
                </div>

                {/* Resumo dos resultados */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-2 border-t border-slate-50">
                  <span>
                    Exibindo <strong className="text-pro-teal">{filteredPlans.length}</strong> plano(s) de aula encontrado(s)
                  </span>
                  {hasActiveFilters && (
                    <span className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Filtros ativos
                    </span>
                  )}
                </div>
              </div>

              {/* LISTA DE CARDS DE PLANOS DE AULA */}
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
                    <p className="text-xs text-slate-400 font-bold mt-1 max-w-md mx-auto">
                      {hasActiveFilters 
                        ? "Nenhum plano corresponde aos filtros selecionados (professor, mês, turma ou busca). Tente ajustar ou limpar os filtros." 
                        : "Nenhum plano de aula foi submetido ainda no sistema."}
                    </p>
                  </div>
                  {hasActiveFilters ? (
                    <button
                      onClick={handleResetFilters}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2"
                    >
                      <RotateCcw size={16} /> Limpar Todos os Filtros
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPlan(null);
                        setActiveTab("form");
                      }}
                      className="px-6 py-3 bg-pro-teal text-white rounded-2xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-2 shadow-lg shadow-teal-900/10"
                    >
                      <Plus size={16} /> Criar Primeiro Plano
                    </button>
                  )}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-xl bg-teal-50 text-pro-teal text-xs font-black uppercase tracking-wider">
                                {classes.find(c => c.id === plan.classId)?.code || plan.className || "Turma"}
                              </span>
                              <span className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-xl flex items-center gap-1.5 border border-slate-200/60">
                                <Calendar size={13} className="text-pro-orange" /> {dateFormatted}
                              </span>
                            </div>
                            {plan.teacherName && (
                              <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5 mt-1">
                                <UserCircle size={14} className="text-slate-400" />
                                <span>Professor(a): <strong className="text-slate-800">{plan.teacherName}</strong></span>
                              </p>
                            )}
                          </div>

                          {/* Quick Actions Bar: Acessar, Baixar, Duplicar, Editar, Excluir */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Botão Acessar / Visualizar */}
                            <button
                              onClick={() => setViewingPlan(plan)}
                              className="px-3.5 py-2 bg-teal-50 hover:bg-pro-teal text-pro-teal hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                              title="Acessar e visualizar detalhes pedagógicos"
                            >
                              <Eye size={15} />
                              <span>Acessar</span>
                            </button>

                            {/* Botão Baixar PDF */}
                            <button
                              onClick={() => generateLessonPlanPDF(plan, skillsList)}
                              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                              title="Baixar Plano de Aula em PDF"
                            >
                              <Download size={15} />
                              <span>Baixar PDF</span>
                            </button>

                            {/* Duplicar */}
                            <button
                              onClick={() => handleDuplicatePlan(plan)}
                              className="p-2 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded-xl transition-all"
                              title="Duplicar como modelo"
                            >
                              <Copy size={16} />
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all"
                              title="Editar plano"
                            >
                              <Edit3 size={16} />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => plan.id && handleDeletePlan(plan.id)}
                              className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Objetivo Geral */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Objetivo Geral da Aula</span>
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

          {/* TAB 2: FORMULÁRIO DE PLANO DE AULA */}
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
        </div>
      </div>

      {/* MODAL DE ACESSO E VISUALIZAÇÃO COMPLETA DO PLANO DE AULA */}
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
                    Plano de Aula Pedagógico • Detalhes
                  </span>
                  <h3 className="text-xl font-black tracking-tight">{classes.find(c => c.id === viewingPlan.classId)?.code || viewingPlan.className}</h3>
                  <p className="text-xs text-slate-300 font-bold">
                    📅 {typeof viewingPlan.date === "string" ? viewingPlan.date.split("-").reverse().join("/") : new Date(viewingPlan.date?.toDate?.() || viewingPlan.date).toLocaleDateString("pt-BR")} • Prof. {viewingPlan.teacherName || "Professor"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateLessonPlanPDF({
                      ...viewingPlan,
                      className: classes.find(c => c.id === viewingPlan.classId)?.code || viewingPlan.className,
                      classType: classes.find(c => c.id === viewingPlan.classId)?.type || viewingPlan.classType
                    }, skillsList)}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-950/20"
                  >
                    <Download size={15} /> Baixar PDF
                  </button>
                  <button
                    onClick={() => setViewingPlan(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                {/* Informações Gerais */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Turma</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{classes.find(c => c.id === viewingPlan.classId)?.code || viewingPlan.className || "Turma"}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Professor(a)</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{viewingPlan.teacherName || "Não especificado"}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data da Aula</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                      {typeof viewingPlan.date === "string" ? viewingPlan.date.split("-").reverse().join("/") : new Date(viewingPlan.date?.toDate?.() || viewingPlan.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* 1. Objetivo Geral */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-pro-teal flex items-center gap-1.5">
                    <FileText size={14} /> 1. Objetivo Geral da Aula
                  </span>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {viewingPlan.generalObjective}
                  </p>
                </div>

                {/* 2. Habilidades */}
                <div className="p-5 bg-white rounded-2xl border border-slate-200/80 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                    <Sparkles size={14} /> 2. Habilidades & Competências ({viewingPlan.skills?.length || 0})
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
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers size={14} /> 3. Sequência de Atividades ({viewingPlan.activities?.length || 0})
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
                    <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {viewingPlan.observations}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleEditPlan(viewingPlan);
                      setViewingPlan(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Edit3 size={14} /> Editar Plano
                  </button>
                  <button
                    onClick={() => {
                      handleDuplicatePlan(viewingPlan);
                      setViewingPlan(null);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <Copy size={14} /> Duplicar Modelo
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => generateLessonPlanPDF(viewingPlan, skillsList)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/10"
                  >
                    <Download size={14} /> Baixar PDF
                  </button>
                  <button
                    onClick={() => setViewingPlan(null)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
