import React, { useState, useEffect } from "react";
import { StageProductionProposal, Class } from "../types";
import { 
  createGestorStageProductionForm, 
  updateGestorStageProductionForm 
} from "../services/stageProductionService";
import { getUserDisplayName } from "../lib/userUtils";
import { 
  X, 
  Sparkles, 
  Calendar, 
  DollarSign, 
  Clock, 
  Users, 
  CheckCircle, 
  Save, 
  Building,
  Info
} from "lucide-react";

interface GestorStageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
  users: any[];
  currentUser: any;
  existingProposal?: StageProductionProposal | null;
  onSuccess: (proposalId: string) => void;
  showNotification?: (message: string, title?: string, type?: "success" | "error" | "warning") => void;
}

export const GestorStageFormModal: React.FC<GestorStageFormModalProps> = ({
  isOpen,
  onClose,
  classes,
  users,
  currentUser,
  existingProposal,
  onSuccess,
  showNotification
}) => {
  const isEditing = Boolean(existingProposal?.id);

  // 14 Fields state
  const [classId, setClassId] = useState("");
  const [className, setClassName] = useState("");
  const [presentationDate, setPresentationDate] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [budgetPurchasesAcquisitions, setBudgetPurchasesAcquisitions] = useState<number | string>(0);
  const [budgetLabor, setBudgetLabor] = useState<number | string>(0);
  const [budgetTotal, setBudgetTotal] = useState<number | string>(0);
  const [pedagogicalArtisticFeedbackDate, setPedagogicalArtisticFeedbackDate] = useState("");
  const [rectificationDeadline, setRectificationDeadline] = useState("");
  const [finalApprovalDate, setFinalApprovalDate] = useState("");
  const [planningMeetingDate, setPlanningMeetingDate] = useState("");
  const [executionPeriod, setExecutionPeriod] = useState("");
  const [partialDeliveryDate, setPartialDeliveryDate] = useState("");
  const [finalDeliveryDate, setFinalDeliveryDate] = useState("");
  const [presentationDates, setPresentationDates] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate fields if editing
  useEffect(() => {
    if (existingProposal) {
      setClassId(existingProposal.classId || "");
      setClassName(existingProposal.className || "");
      setPresentationDate(existingProposal.presentationDate || "");
      setSubmissionDeadline(existingProposal.submissionDeadline || "");
      setBudgetPurchasesAcquisitions(existingProposal.budgetPurchasesAcquisitions ?? 0);
      setBudgetLabor(existingProposal.budgetLabor ?? 0);
      setBudgetTotal(existingProposal.budgetTotal ?? 0);
      setPedagogicalArtisticFeedbackDate(existingProposal.pedagogicalArtisticFeedbackDate || "");
      setRectificationDeadline(existingProposal.rectificationDeadline || "");
      setFinalApprovalDate(existingProposal.finalApprovalDate || "");
      setPlanningMeetingDate(existingProposal.planningMeetingDate || "");
      setExecutionPeriod(existingProposal.executionPeriod || "");
      setPartialDeliveryDate(existingProposal.partialDeliveryDate || "");
      setFinalDeliveryDate(existingProposal.finalDeliveryDate || "");
      setPresentationDates(existingProposal.presentationDates || "");
    } else {
      // Default reset
      setClassId("");
      setClassName("");
      setPresentationDate("");
      setSubmissionDeadline("");
      setBudgetPurchasesAcquisitions(0);
      setBudgetLabor(0);
      setBudgetTotal(0);
      setPedagogicalArtisticFeedbackDate("");
      setRectificationDeadline("");
      setFinalApprovalDate("");
      setPlanningMeetingDate("");
      setExecutionPeriod("");
      setPartialDeliveryDate("");
      setFinalDeliveryDate("");
      setPresentationDates("");
    }
    setErrors({});
  }, [existingProposal, isOpen]);

  // Auto-calculate budgetTotal when purchases or labor change, unless overridden
  const handlePurchasesChange = (val: number) => {
    setBudgetPurchasesAcquisitions(val);
    const labor = Number(budgetLabor) || 0;
    setBudgetTotal(val + labor);
  };

  const handleLaborChange = (val: number) => {
    setBudgetLabor(val);
    const purchases = Number(budgetPurchasesAcquisitions) || 0;
    setBudgetTotal(purchases + val);
  };

  // When class changes, resolve formatted className
  const handleClassSelect = (selectedId: string) => {
    setClassId(selectedId);
    const foundClass = classes.find(c => c.id === selectedId);
    if (foundClass) {
      const formatted = `${foundClass.code ? `${foundClass.code} - ` : ""}${foundClass.type || "Turma"}${
        foundClass.weekday ? ` (${foundClass.weekday} ${foundClass.time || ""})` : ""
      }`;
      setClassName(formatted);
    } else {
      setClassName("");
    }
  };

  // Find linked teachers for the selected class to display
  const selectedClass = classes.find(c => c.id === classId);
  const linkedTeacherNames = React.useMemo(() => {
    if (!selectedClass) return [];

    // Collect valid non-empty IDs from teacherIds or teacherId
    const rawIds: string[] = Array.isArray(selectedClass.teacherIds)
      ? selectedClass.teacherIds
      : (typeof (selectedClass as any).teacherId === "string" ? [(selectedClass as any).teacherId] : []);

    const validClassTeacherIds = new Set(
      rawIds
        .filter((id): id is string => Boolean(id && typeof id === "string" && id.trim().length > 0))
        .map(id => id.trim().toLowerCase())
    );

    const classTeacherEmail = ((selectedClass as any).teacherEmail || "").trim().toLowerCase();

    // Match users who are professors or directors linked to this class
    const matchedTeachers = users.filter(user => {
      if (!user) return false;
      // CRITICAL: Students can NEVER be considered teachers of a class
      if (user.role === "Aluno") return false;

      const userEmail = (user.email || "").trim().toLowerCase();
      const userIdentifiers = [
        user.id,
        user.uid,
        user.migratedFrom,
        user.migratedTo
      ]
        .filter((id): id is string => Boolean(id && typeof id === "string" && id.trim().length > 0))
        .map(id => id.trim().toLowerCase());

      const matchesId = userIdentifiers.some(uid => validClassTeacherIds.has(uid));
      const matchesEmail = Boolean(classTeacherEmail && userEmail && userEmail === classTeacherEmail);

      return matchesId || matchesEmail;
    });

    if (matchedTeachers.length > 0) {
      return matchedTeachers.map(t => getUserDisplayName(t) || t.name || "Professor");
    }

    return [];
  }, [selectedClass, users]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!classId) newErrors.classId = "Selecione a turma desta apresentação.";
    if (!presentationDate) newErrors.presentationDate = "Informe a data da apresentação.";
    if (!submissionDeadline) newErrors.submissionDeadline = "Informe o prazo de submissão do professor.";
    if (!pedagogicalArtisticFeedbackDate) newErrors.pedagogicalArtisticFeedbackDate = "Informe a data de devolutiva da avaliação.";
    if (!rectificationDeadline) newErrors.rectificationDeadline = "Informe o prazo de envio de retificação.";
    if (!finalApprovalDate) newErrors.finalApprovalDate = "Informe a data de aprovação final.";
    if (!planningMeetingDate) newErrors.planningMeetingDate = "Informe a data da reunião de planejamento.";
    if (!executionPeriod.trim()) newErrors.executionPeriod = "Informe o período de execução das compras.";
    if (!partialDeliveryDate) newErrors.partialDeliveryDate = "Informe a data de entrega parcial.";
    if (!finalDeliveryDate) newErrors.finalDeliveryDate = "Informe a data de entrega final.";
    if (!presentationDates.trim()) newErrors.presentationDates = "Informe as datas/horários da apresentação.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showNotification?.("Por favor, preencha todos os campos obrigatórios do cronograma e orçamento.", "Campos Obrigatórios", "warning");
      return;
    }

    try {
      setIsSubmitting(true);
      const gestorProfile = users.find(u => u.id === currentUser?.uid || u.email?.toLowerCase() === currentUser?.email?.toLowerCase());
      const gestorName = gestorProfile?.name || currentUser?.displayName || "Gestor";

      if (isEditing && existingProposal?.id) {
        await updateGestorStageProductionForm(
          existingProposal.id,
          {
            classId,
            className,
            presentationDate,
            submissionDeadline,
            budgetPurchasesAcquisitions: Number(budgetPurchasesAcquisitions) || 0,
            budgetLabor: Number(budgetLabor) || 0,
            budgetTotal: Number(budgetTotal) || 0,
            pedagogicalArtisticFeedbackDate,
            rectificationDeadline,
            finalApprovalDate,
            planningMeetingDate,
            executionPeriod,
            partialDeliveryDate,
            finalDeliveryDate,
            presentationDates
          },
          {
            uid: currentUser?.uid || "",
            name: gestorName
          }
        );
        showNotification?.("Parâmetros do formulário atualizados com sucesso!", "Sucesso", "success");
        onSuccess(existingProposal.id);
      } else {
        const newId = await createGestorStageProductionForm({
          classId,
          className,
          presentationDate,
          submissionDeadline,
          budgetPurchasesAcquisitions: Number(budgetPurchasesAcquisitions) || 0,
          budgetLabor: Number(budgetLabor) || 0,
          budgetTotal: Number(budgetTotal) || 0,
          pedagogicalArtisticFeedbackDate,
          rectificationDeadline,
          finalApprovalDate,
          planningMeetingDate,
          executionPeriod,
          partialDeliveryDate,
          finalDeliveryDate,
          presentationDates,
          createdByGestorId: currentUser?.uid || "",
          createdByGestorName: gestorName
        });
        showNotification?.(
          "Formulário criado com sucesso! O acesso já está liberado para o(s) professor(es) da turma.", 
          "Formulário Criado", 
          "success"
        );
        onSuccess(newId);
      }
      onClose();
    } catch (err) {
      console.error(err);
      showNotification?.("Ocorreu um erro ao salvar o formulário de apresentação.", "Erro", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Área Exclusiva da Gestão
              </div>
              <h3 className="text-2xl font-black">
                {isEditing ? "Editar Diretrizes da Apresentação" : "Criar Formulário de Apresentação e Montagem"}
              </h3>
              <p className="text-xs text-purple-200/90 mt-1">
                Ao criar este formulário, o professor vinculado à turma receberá a pauta para preencher a sinopse, elenco e necessidades técnicas.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Turma Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
              <Building size={14} className="text-purple-600" />
              Turma da Apresentação *
            </label>
            <select
              value={classId}
              onChange={(e) => handleClassSelect(e.target.value)}
              className={`w-full p-3 bg-white border ${
                errors.classId ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-300"
              } rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
            >
              <option value="">Selecione uma turma...</option>
              {classes.map((cls) => {
                const title = `${cls.code ? `${cls.code} - ` : ""}${cls.type || "Turma"}${
                  cls.weekday ? ` (${cls.weekday} ${cls.time || ""})` : ""
                }`;
                return (
                  <option key={cls.id} value={cls.id}>
                    {title} {!cls.isActive ? " (Inativa)" : ""}
                  </option>
                );
              })}
            </select>
            {errors.classId && <p className="text-rose-500 text-xs mt-1 font-bold">{errors.classId}</p>}

            {/* Linked Teacher Notice */}
            {selectedClass && (
              linkedTeacherNames.length > 0 ? (
                <div className="mt-3 p-3.5 bg-purple-50 border border-purple-200/80 rounded-xl flex items-start gap-2.5 text-xs text-purple-900">
                  <Users size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      Professor(es) Vinculado(s) à Turma:{" "}
                      <span className="font-black text-purple-950">{linkedTeacherNames.join(", ")}</span>
                    </div>
                    <span className="block text-[11px] text-purple-700 font-medium mt-0.5">
                      Este formulário ficará visível na área de montagens destes professores para preenchimento.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950">
                      Nenhum professor diretamente atribuído a esta turma no cadastro.
                    </div>
                    <span className="block text-[11px] text-amber-800 font-medium mt-0.5">
                      Para que o professor possa visualizar e preencher este formulário, vincule-o à turma em Gestão de Turmas.
                    </span>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Section 2: Orçamentos */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-1.5">
              <DollarSign size={15} className="text-emerald-600" />
              Orçamento Autorizado para a Montagem
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Compras / Confecções */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Compras, Confecções e Aquisições (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetPurchasesAcquisitions}
                  onChange={(e) => handlePurchasesChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              {/* Mão-de-Obra */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mão-de-Obra (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetLabor}
                  onChange={(e) => handleLaborChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              {/* Total */}
              <div>
                <label className="block text-xs font-black text-emerald-800 mb-1">
                  Orçamento Total da Apresentação (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetTotal}
                  onChange={(e) => setBudgetTotal(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Soma automática de compras + mão-de-obra (editável se necessário).
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Cronograma e Prazos Oficiais */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-1.5">
              <Calendar size={15} className="text-purple-600" />
              Cronograma Oficial e Datas Limite
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Data da apresentação */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data da Apresentação *
                </label>
                <input
                  type="date"
                  value={presentationDate}
                  onChange={(e) => setPresentationDate(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.presentationDate ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.presentationDate && <p className="text-rose-500 text-[10px] mt-0.5">{errors.presentationDate}</p>}
              </div>

              {/* Prazo de submissão do formulário pelo professor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prazo de Submissão (Professor) *
                </label>
                <input
                  type="date"
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.submissionDeadline ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.submissionDeadline && <p className="text-rose-500 text-[10px] mt-0.5">{errors.submissionDeadline}</p>}
              </div>

              {/* Data de devolutiva da avaliação pedagógica e artística */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data de Devolutiva da Avaliação *
                </label>
                <input
                  type="date"
                  value={pedagogicalArtisticFeedbackDate}
                  onChange={(e) => setPedagogicalArtisticFeedbackDate(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.pedagogicalArtisticFeedbackDate ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.pedagogicalArtisticFeedbackDate && (
                  <p className="text-rose-500 text-[10px] mt-0.5">{errors.pedagogicalArtisticFeedbackDate}</p>
                )}
              </div>

              {/* Data de envio de retificação */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prazo de Retificação pelo Professor *
                </label>
                <input
                  type="date"
                  value={rectificationDeadline}
                  onChange={(e) => setRectificationDeadline(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.rectificationDeadline ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.rectificationDeadline && <p className="text-rose-500 text-[10px] mt-0.5">{errors.rectificationDeadline}</p>}
              </div>

              {/* Data de aprovação final */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data de Aprovação Final *
                </label>
                <input
                  type="date"
                  value={finalApprovalDate}
                  onChange={(e) => setFinalApprovalDate(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.finalApprovalDate ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.finalApprovalDate && <p className="text-rose-500 text-[10px] mt-0.5">{errors.finalApprovalDate}</p>}
              </div>

              {/* Data da reunião de planejamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reunião de Planejamento *
                </label>
                <input
                  type="date"
                  value={planningMeetingDate}
                  onChange={(e) => setPlanningMeetingDate(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.planningMeetingDate ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.planningMeetingDate && <p className="text-rose-500 text-[10px] mt-0.5">{errors.planningMeetingDate}</p>}
              </div>

              {/* Entrega parcial de objetos de cena / cenografia */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Entrega Parcial (Objetos/Cenografia) *
                </label>
                <input
                  type="date"
                  value={partialDeliveryDate}
                  onChange={(e) => setPartialDeliveryDate(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.partialDeliveryDate ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.partialDeliveryDate && <p className="text-rose-500 text-[10px] mt-0.5">{errors.partialDeliveryDate}</p>}
              </div>

              {/* Entrega final de todos os itens */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Entrega Final de Todos os Itens *
                </label>
                <input
                  type="date"
                  value={finalDeliveryDate}
                  onChange={(e) => setFinalDeliveryDate(e.target.value)}
                  className={`w-full p-2.5 bg-white border ${
                    errors.finalDeliveryDate ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.finalDeliveryDate && <p className="text-rose-500 text-[10px] mt-0.5">{errors.finalDeliveryDate}</p>}
              </div>

              {/* Período de execução de compras */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Período de Execução de Compras *
                </label>
                <input
                  type="text"
                  value={executionPeriod}
                  onChange={(e) => setExecutionPeriod(e.target.value)}
                  placeholder="Ex: 01/10/2026 a 31/10/2026"
                  className={`w-full p-2.5 bg-white border ${
                    errors.executionPeriod ? "border-rose-500" : "border-slate-300"
                  } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
                />
                {errors.executionPeriod && <p className="text-rose-500 text-[10px] mt-0.5">{errors.executionPeriod}</p>}
              </div>
            </div>

            {/* Datas de apresentação detalhadas */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Datas e Horários de Apresentação (Detalhado) *
              </label>
              <input
                type="text"
                value={presentationDates}
                onChange={(e) => setPresentationDates(e.target.value)}
                placeholder="Ex: 20/11/2026 às 20h e 21/11/2026 às 19h no Teatro da Escola"
                className={`w-full p-3 bg-white border ${
                  errors.presentationDates ? "border-rose-500" : "border-slate-300"
                } rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none`}
              />
              {errors.presentationDates && <p className="text-rose-500 text-[10px] mt-0.5">{errors.presentationDates}</p>}
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Save size={16} />
              {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar e Liberar para o Professor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
