/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, FormEvent } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Trash2, 
  Clock, 
  Sparkles, 
  Target, 
  CheckSquare, 
  Square, 
  Search, 
  Save, 
  Calendar, 
  Presentation, 
  FileText, 
  Layers, 
  AlertCircle,
  HelpCircle,
  Copy,
  ArrowRight,
  CheckCircle2,
  X
} from "lucide-react";
import { Class, User, Skill, LessonPlan } from "../types";
import { createSkill } from "../services/lessonPlanService";

export interface LessonPlanFormValues {
  classId: string;
  date: string;
  generalObjective: string;
  skills: string[];
  activities: {
    objective: string;
    description: string;
    duration: number;
  }[];
  observations?: string;
}

interface LessonPlanFormProps {
  teacherClasses: Class[];
  skillsList: Skill[];
  onRefreshSkills: () => Promise<void>;
  onSubmitPlan: (data: LessonPlanFormValues, planId?: string) => Promise<void>;
  initialData?: LessonPlan | null;
  selectedClassId?: string | null;
  selectedDate?: string | null;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const LessonPlanForm = ({
  teacherClasses,
  skillsList,
  onRefreshSkills,
  onSubmitPlan,
  initialData,
  selectedClassId: initialSelectedClassId,
  selectedDate: initialSelectedDate,
  onCancel,
  isSubmitting = false
}: LessonPlanFormProps) => {
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [isAddingNewSkill, setIsAddingNewSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDefinition, setNewSkillDefinition] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Interpretação");
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);
  const [skillCreateError, setSkillCreateError] = useState("");

  // Default values
  const defaultDateStr = initialSelectedDate || (initialData?.date ? 
    (typeof initialData.date === "string" ? initialData.date : new Date(initialData.date?.toDate?.() || initialData.date).toISOString().split("T")[0])
    : new Date().toISOString().split("T")[0]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<LessonPlanFormValues>({
    defaultValues: {
      classId: initialData?.classId || initialSelectedClassId || (teacherClasses[0]?.id || ""),
      date: defaultDateStr,
      generalObjective: initialData?.generalObjective || "",
      skills: initialData?.skills || [],
      activities: initialData?.activities && initialData.activities.length > 0 
        ? initialData.activities.map(a => ({
            objective: a.objective || "",
            description: a.description || "",
            duration: Number(a.duration) || 30
          }))
        : [
            {
              objective: "Aquecimento e Prontidão Cênica",
              description: "Jogos de escuta, conexão em grupo e ativação psicofísica.",
              duration: 20
            },
            {
              objective: "Desenvolvimento do Conteúdo / Exercício Central",
              description: "Trabalho prático focado nas habilidades da aula.",
              duration: 50
            },
            {
              objective: "Roda de Compartilhamento e Fechamento",
              description: "Avaliação do processo e apontamentos do professor.",
              duration: 20
            }
          ],
      observations: initialData?.observations || ""
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities"
  });

  const watchedActivities = watch("activities") || [];
  const watchedSkills = watch("skills") || [];
  const watchedClassId = watch("classId");
  const watchedDate = watch("date");

  // Sync if initialData or selectedClassId changes
  useEffect(() => {
    if (initialData) {
      const dateVal = typeof initialData.date === "string" 
        ? initialData.date 
        : new Date(initialData.date?.toDate?.() || initialData.date).toISOString().split("T")[0];
      
      reset({
        classId: initialData.classId,
        date: dateVal,
        generalObjective: initialData.generalObjective,
        skills: initialData.skills || [],
        activities: (initialData.activities || []).map(a => ({
          objective: a.objective || "",
          description: a.description || "",
          duration: Number(a.duration) || 30
        })),
        observations: initialData.observations || ""
      });
    } else if (initialSelectedClassId) {
      setValue("classId", initialSelectedClassId);
    }
  }, [initialData, initialSelectedClassId, reset, setValue]);

  // Current selected class object
  const currentClass = useMemo(() => {
    return teacherClasses.find(c => c.id === watchedClassId);
  }, [teacherClasses, watchedClassId]);

  // Calculate total duration in minutes
  const totalDuration = useMemo(() => {
    return watchedActivities.reduce((sum, item) => sum + (Number(item?.duration) || 0), 0);
  }, [watchedActivities]);

  const formattedTotalDuration = useMemo(() => {
    const hours = Math.floor(totalDuration / 60);
    const mins = totalDuration % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  }, [totalDuration]);

  // Formatted date preview with day of week
  const datePreview = useMemo(() => {
    if (!watchedDate) return "";
    try {
      const [y, m, d] = watchedDate.split("-").map(Number);
      if (!y || !m || !d) return "";
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch {
      return "";
    }
  }, [watchedDate]);

  // Categories of skills
  const categories = useMemo(() => {
    const set = new Set<string>();
    skillsList.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return ["TODAS", ...Array.from(set).sort()];
  }, [skillsList]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    return skillsList.filter(s => {
      if (s.active === false) return false;
      const matchesSearch = !skillSearch || 
        s.name.toLowerCase().includes(skillSearch.toLowerCase()) || 
        (s.definition && s.definition.toLowerCase().includes(skillSearch.toLowerCase()));
      const matchesCat = selectedCategory === "TODAS" || s.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [skillsList, skillSearch, selectedCategory]);

  const handleToggleSkill = (skillIdOrName: string) => {
    const current = watchedSkills || [];
    if (current.includes(skillIdOrName)) {
      setValue("skills", current.filter(id => id !== skillIdOrName), { shouldValidate: true });
    } else {
      setValue("skills", [...current, skillIdOrName], { shouldValidate: true });
    }
  };

  const handleSelectAllSkills = () => {
    const visibleIds = filteredSkills.map(s => s.id);
    const combined = Array.from(new Set([...(watchedSkills || []), ...visibleIds]));
    setValue("skills", combined, { shouldValidate: true });
  };

  const handleClearSelectedSkills = () => {
    setValue("skills", [], { shouldValidate: true });
  };

  const handleCreateNewSkillSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) {
      setSkillCreateError("O nome da habilidade é obrigatório.");
      return;
    }
    setSkillCreateError("");
    setIsCreatingSkill(true);
    try {
      const created = await createSkill({
        name: newSkillName.trim(),
        definition: newSkillDefinition.trim(),
        category: newSkillCategory.trim() || "Geral"
      });
      await onRefreshSkills();
      // Auto-select the newly created skill
      setValue("skills", [...(watchedSkills || []), created.id], { shouldValidate: true });
      setNewSkillName("");
      setNewSkillDefinition("");
      setIsAddingNewSkill(false);
    } catch (err: any) {
      setSkillCreateError("Erro ao salvar nova habilidade: " + (err.message || "Erro desconhecido"));
    } finally {
      setIsCreatingSkill(false);
    }
  };

  const onFormSubmit = (data: LessonPlanFormValues) => {
    onSubmitPlan(data, initialData?.id);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* 1. SELEÇÃO DE TURMA & DATA */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-pro-teal flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Turma e Data da Aula</h3>
              <p className="text-xs text-slate-400 font-bold">Defina a turma vinculada e o dia da aula planejada</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Turma */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Presentation size={14} className="text-pro-teal" /> Turma *
            </label>
            <select
              {...register("classId", { required: "Selecione uma turma para a aula" })}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 transition-all focus:ring-2 focus:ring-pro-teal focus:border-pro-teal outline-none"
            >
              {teacherClasses.length === 0 && (
                <option value="">Nenhuma turma vinculada encontrada</option>
              )}
              {teacherClasses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.type} ({c.weekday} • {c.time})
                </option>
              ))}
            </select>
            {errors.classId && (
              <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                <AlertCircle size={12} /> {errors.classId.message}
              </p>
            )}
            {currentClass && (
              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs font-bold text-teal-900 flex items-center justify-between">
                <span>Dia oficial: <strong>{currentClass.weekday}</strong> às <strong>{currentClass.time}</strong></span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-teal-200/60 rounded-full">
                  {currentClass.studentIds?.length || 0} alunos matriculados
                </span>
              </div>
            )}
          </div>

          {/* Data da Aula */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar size={14} className="text-pro-orange" /> Data da Aula *
            </label>
            <input
              type="date"
              {...register("date", { required: "A data da aula é obrigatória" })}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 transition-all focus:ring-2 focus:ring-pro-teal focus:border-pro-teal outline-none"
            />
            {errors.date && (
              <p className="text-xs text-red-500 font-bold flex items-center gap-1">
                <AlertCircle size={12} /> {errors.date.message}
              </p>
            )}
            {datePreview && (
              <p className="text-xs font-bold text-slate-500 capitalize bg-slate-50 p-2 rounded-xl border border-slate-100">
                📅 {datePreview}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. OBJETIVO GERAL DA AULA */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-pro-orange flex items-center justify-center font-bold">
            2
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Objetivo Geral da Aula</h3>
            <p className="text-xs text-slate-400 font-bold">O que se espera que o grupo e os alunos desenvolvam neste encontro</p>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={4}
            {...register("generalObjective", { 
              required: "O objetivo geral da aula é obrigatório",
              minLength: { value: 10, message: "Descreva o objetivo com pelo menos 10 caracteres" }
            })}
            placeholder="Ex: Trabalhar a prontidão cênica e o foco individual na cena dialogada, estimulando a escuta ativa do parceiro e a apropriação do espaço cênico através de exercícios de improvisação..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 leading-relaxed transition-all focus:ring-2 focus:ring-pro-teal focus:border-pro-teal outline-none resize-y"
          />
          {errors.generalObjective && (
            <p className="text-xs text-red-500 font-bold flex items-center gap-1">
              <AlertCircle size={12} /> {errors.generalObjective.message}
            </p>
          )}
        </div>
      </div>

      {/* 3. HABILIDADES TRABALHADAS (MULTI-SELECT) */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Habilidades Trabalhadas</h3>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {watchedSkills.length} selecionada(s)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold">Habilidades sincronizadas com os Diários de Classe e Avaliações</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingNewSkill(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Nova Habilidade
            </button>
            <button
              type="button"
              onClick={handleSelectAllSkills}
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all"
            >
              Marcar Visíveis
            </button>
            {watchedSkills.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelectedSkills}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-bold transition-all"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Modal / Card para criar nova habilidade */}
        <AnimatePresence>
          {isAddingNewSkill && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-purple-900 flex items-center gap-1.5">
                    <Sparkles size={14} /> Cadastrar Nova Habilidade no Sistema
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewSkill(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Nome da Habilidade *</label>
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="Ex: Projeção vocal sob movimento, Tempo cênico..."
                      className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Categoria</label>
                    <input
                      type="text"
                      value={newSkillCategory}
                      onChange={(e) => setNewSkillCategory(e.target.value)}
                      placeholder="Ex: Interpretação, Corpo, Voz..."
                      className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600">Definição / Descrição Pedagógica (Opcional)</label>
                    <input
                      type="text"
                      value={newSkillDefinition}
                      onChange={(e) => setNewSkillDefinition(e.target.value)}
                      placeholder="Breve descrição do que este critério avalia..."
                      className="w-full px-3.5 py-2.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                {skillCreateError && (
                  <p className="text-xs text-red-600 font-bold">{skillCreateError}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewSkill(false)}
                    className="px-4 py-2 bg-white text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isCreatingSkill || !newSkillName.trim()}
                    onClick={handleCreateNewSkillSubmit}
                    className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-purple-700 transition-all disabled:opacity-50"
                  >
                    {isCreatingSkill ? "Salvando..." : "Salvar Habilidade"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtro e Busca de Habilidades */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Buscar habilidades por nome ou descrição..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
              />
              {skillSearch && (
                <button
                  type="button"
                  onClick={() => setSkillSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Categorias Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-purple-700 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Habilidades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
            {filteredSkills.map(skill => {
              const isSelected = (watchedSkills || []).includes(skill.id);
              return (
                <button
                  type="button"
                  key={skill.id}
                  onClick={() => handleToggleSkill(skill.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 group relative ${
                    isSelected
                      ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20 shadow-sm"
                      : "bg-slate-50/50 hover:bg-slate-100/80 border-slate-200 text-slate-700"
                  }`}
                >
                  <div className={`mt-0.5 shrink-0 ${isSelected ? "text-purple-700" : "text-slate-400 group-hover:text-slate-600"}`}>
                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-black leading-tight ${isSelected ? "text-purple-950" : "text-slate-800"}`}>
                        {skill.name}
                      </span>
                    </div>
                    {skill.category && (
                      <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                        {skill.category}
                      </span>
                    )}
                    {skill.definition && (
                      <p className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-1 leading-snug">
                        {skill.definition}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredSkills.length === 0 && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400">Nenhuma habilidade encontrada com o filtro atual.</p>
              <button
                type="button"
                onClick={() => { setSkillSearch(""); setSelectedCategory("TODAS"); }}
                className="mt-2 text-xs font-bold text-purple-600 hover:underline"
              >
                Limpar filtros de busca
              </button>
            </div>
          )}

          {watchedSkills.length === 0 && (
            <p className="text-xs text-amber-600 font-bold flex items-center gap-1.5 pt-1">
              <AlertCircle size={14} /> Selecione ao menos 1 habilidade trabalhada nesta aula.
            </p>
          )}
        </div>
      </div>

      {/* 4. FORMULÁRIO DINÂMICO DE ATIVIDADES (FIELD ARRAY) */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Atividades da Aula</h3>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Clock size={12} /> Duração Total: {formattedTotalDuration}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold">Blocos de atividades práticas, jogos, exercícios e dinâmicas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => append({ objective: "", description: "", duration: 20 })}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-900/10 active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} /> Adicionar Atividade
          </button>
        </div>

        {/* Lista de Atividades Dinâmicas */}
        <div className="space-y-4">
          {fields.map((field, index) => {
            const currentDuration = watch(`activities.${index}.duration`) || 0;
            return (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 md:p-6 bg-slate-50/80 border border-slate-200 rounded-3xl space-y-4 relative group hover:border-slate-300 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                      {index + 1}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Atividade {index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Badge de duração da atividade */}
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <Clock size={12} /> {currentDuration} min
                    </span>

                    {/* Botão Remover */}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Remover esta atividade"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Objetivo da Atividade */}
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Objetivo da Atividade *
                    </label>
                    <input
                      type="text"
                      {...register(`activities.${index}.objective`, { 
                        required: "Informe o objetivo desta atividade" 
                      })}
                      placeholder="Ex: Aquecimento vocal com foco na ressonância e projeção em roda..."
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    {errors.activities?.[index]?.objective && (
                      <p className="text-[11px] text-red-500 font-bold">
                        {errors.activities[index]?.objective?.message}
                      </p>
                    )}
                  </div>

                  {/* Duração em minutos */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Duração (min) *</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={300}
                        {...register(`activities.${index}.duration`, { 
                          required: "Duração obrigatória",
                          valueAsNumber: true,
                          min: { value: 1, message: "Mínimo 1 minuto" }
                        })}
                        placeholder="30"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-800 transition-all focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">
                        min
                      </span>
                    </div>

                    {/* Presets rápidos */}
                    <div className="flex gap-1 pt-1">
                      {[15, 30, 45, 60].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setValue(`activities.${index}.duration`, mins, { shouldValidate: true })}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            currentDuration === mins
                              ? "bg-emerald-600 text-white font-black"
                              : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Descrição detalhada da atividade */}
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Descrição e Dinâmica da Atividade *
                    </label>
                    <textarea
                      rows={3}
                      {...register(`activities.${index}.description`, { 
                        required: "Descreva a atividade a ser executada" 
                      })}
                      placeholder="Descreva passo a passo como o exercício será conduzido, regras da dinâmica e materiais necessários..."
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 leading-relaxed transition-all focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                    />
                    {errors.activities?.[index]?.description && (
                      <p className="text-[11px] text-red-500 font-bold">
                        {errors.activities[index]?.description?.message}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Botão Adicionar outra atividade */}
        <button
          type="button"
          onClick={() => append({ objective: "", description: "", duration: 20 })}
          className="w-full py-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-emerald-700 rounded-3xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Adicionar Outra Atividade
        </button>
      </div>

      {/* 5. OBSERVAÇÕES PEDAGÓGICAS / MATERIAIS EXTRAS */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            5
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Observações e Materiais (Opcional)</h3>
            <p className="text-xs text-slate-400 font-bold">Necessidade de figurinos, objetos de cena, som, textos impressos, etc.</p>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={2}
            {...register("observations")}
            placeholder="Ex: Trazer cópias da cena 3 do texto; Utilizar caixas cênicas e iluminação com meia-luz..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 leading-relaxed transition-all focus:ring-2 focus:ring-pro-teal outline-none resize-y"
          />
        </div>
      </div>

      {/* SUBMISSION BAR */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[32px] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <h4 className="text-base font-black tracking-tight uppercase">
              {initialData ? "Atualizar Plano de Aula" : "Finalizar e Salvar Plano"}
            </h4>
          </div>
          <p className="text-xs text-slate-400 font-bold">
            {watchedActivities.length} atividade(s) • {formattedTotalDuration} de duração • {watchedSkills.length} habilidade(s)
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting || watchedSkills.length === 0}
            className="flex-1 sm:flex-none px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {isSubmitting ? "Salvando..." : "Salvar Plano de Aula"}
          </button>
        </div>
      </div>
    </form>
  );
};
