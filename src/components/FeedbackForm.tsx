import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  X, 
  Send, 
  CheckCircle2, 
  Drama,
  Calendar,
  ChevronDown,
  MessageSquare,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import { User, Class } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { getUserDisplayName } from '../lib/userUtils';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  studentClasses: Class[];
  onSuccess: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ 
  isOpen, 
  onClose, 
  currentUser, 
  studentClasses,
  onSuccess
}) => {
  const [npsRating, setNpsRating] = useState<number | null>(null);
  const [expressionScore, setExpressionScore] = useState<number | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [challengeScore, setChallengeScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isManualDate, setIsManualDate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedClass = studentClasses.find(c => c.id === selectedClassId);

  // Helper to format Date to deterministic YYYY-MM-DD
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to capitalize first letter
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Parse class weekdays with support for accents, compound days and abbreviations
  const parseClassWeekdays = (weekdayStr?: string): number[] => {
    if (!weekdayStr) return [];
    const normalized = weekdayStr
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // removes accents

    const days: number[] = [];
    if (normalized.includes("dom")) days.push(0);
    if (normalized.includes("seg") || normalized.includes("2")) days.push(1);
    if (normalized.includes("ter") || normalized.includes("3")) days.push(2);
    if (normalized.includes("qua") || normalized.includes("4")) days.push(3);
    if (normalized.includes("qui") || normalized.includes("5")) days.push(4);
    if (normalized.includes("sex") || normalized.includes("6")) days.push(5);
    if (normalized.includes("sab") || normalized.includes("7")) days.push(6);
    return Array.from(new Set(days));
  };

  // Calculate available class days (last 60 days)
  const availableDays = useMemo(() => {
    if (!selectedClass) return [];

    const targetDays = parseClassWeekdays(selectedClass.weekday);
    const result: Array<{ value: string; label: string; isToday?: boolean }> = [];
    const today = new Date();
    const todayKey = formatDateKey(today);

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);

    const seenKeys = new Set<string>();

    // Check if today matches class day
    if (targetDays.length === 0 || targetDays.includes(today.getDay())) {
      const label = `Hoje • ${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} (${capitalize(today.toLocaleDateString('pt-BR', { weekday: 'short' }))})`;
      result.push({ value: todayKey, label, isToday: true });
      seenKeys.add(todayKey);
    }

    // Go back 60 days to collect class dates
    for (let i = 1; i <= 60; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateKey = formatDateKey(d);

      if (seenKeys.has(dateKey)) continue;

      if (targetDays.length === 0 || targetDays.includes(d.getDay())) {
        const weekdayName = capitalize(d.toLocaleDateString('pt-BR', { weekday: 'long' }));
        const dateFormatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        let label = `${dateFormatted} - ${weekdayName}`;
        if (dateKey === yesterdayKey) {
          label = `Ontem • ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} (${weekdayName})`;
        }

        result.push({ value: dateKey, label });
        seenKeys.add(dateKey);
      }
    }

    // If today wasn't included because of weekday match, always append today & yesterday as easy options at the top
    if (!seenKeys.has(todayKey)) {
      const label = `Hoje • ${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} (${capitalize(today.toLocaleDateString('pt-BR', { weekday: 'short' }))})`;
      result.unshift({ value: todayKey, label, isToday: true });
    }

    return result;
  }, [selectedClass]);

  // Set default class & default date when modal opens or classes list changes
  React.useEffect(() => {
    if (isOpen && studentClasses.length > 0) {
      const currentClassExists = studentClasses.some(c => c.id === selectedClassId);
      const validClassId = currentClassExists ? selectedClassId : studentClasses[0].id;
      
      if (!currentClassExists) {
        setSelectedClassId(validClassId);
      }
    }
  }, [isOpen, studentClasses, selectedClassId]);

  // Auto-set the first available date when class changes if not already set
  React.useEffect(() => {
    if (availableDays.length > 0 && !selectedDate) {
      setSelectedDate(availableDays[0].value);
    }
  }, [availableDays, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !currentUser || 
      !selectedClassId || 
      npsRating === null || 
      expressionScore === null || 
      qualityScore === null || 
      challengeScore === null || 
      !selectedDate
    ) return;

    setIsSubmitting(true);
    try {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const feedbackDate = new Date(year, month - 1, day, 12, 0, 0);

      // Main rating is the average of expression, quality and challenge (1-5 scaled)
      const avgRating = (expressionScore + qualityScore + challengeScore) / 3;

      const authUid = getAuth().currentUser?.uid || currentUser.id;

      await addDoc(collection(db, "feedbacks-aulas"), {
        studentId: authUid,
        studentName: getUserDisplayName(currentUser),
        classId: selectedClassId,
        className: selectedClass?.code || 'Turma não identificada',
        date: Timestamp.fromDate(feedbackDate),
        rating: avgRating,
        npsRating,
        expressionScore,
        qualityScore,
        challengeScore,
        comment,
        timestamp: serverTimestamp()
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        onSuccess();
        // Reset form
        setNpsRating(null);
        setExpressionScore(null);
        setQualityScore(null);
        setChallengeScore(null);
        setComment('');
        setSelectedDate('');
        setIsManualDate(false);
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "feedbacks-aulas");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isFormValid = 
    selectedClassId && 
    selectedDate && 
    npsRating !== null && 
    expressionScore !== null && 
    qualityScore !== null && 
    challengeScore !== null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[40px] md:rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden relative overflow-y-auto max-h-[92vh]"
        >
          {isSuccess ? (
            <div className="p-12 text-center space-y-6">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle2 size={48} />
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Obrigado pelo Feedback!</h3>
                <p className="text-sm font-bold text-slate-400">Sua opinião ajuda a Intervalo a brilhar cada vez mais.</p>
              </div>
            </div>
          ) : (
            <>
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all z-10 hover:bg-slate-100"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-r from-pro-teal/5 to-transparent p-8 md:p-10 border-b border-slate-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-pro-teal text-white rounded-xl flex items-center justify-center shadow-lg shadow-pro-teal/20">
                    <Drama size={20} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">Como foi sua aula?</h2>
                    <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest mt-1">Queremos ouvir você</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8">
                {/* Turma and Date Selection */}
                <div className="bg-slate-50 p-5 md:p-6 rounded-[32px] space-y-4 border border-slate-100/80">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <Calendar size={12} /> Turma
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={selectedClassId}
                          onChange={(e) => {
                            setSelectedClassId(e.target.value);
                            setSelectedDate('');
                          }}
                          className="w-full bg-white border-2 border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 pr-10 text-xs font-black text-slate-700 outline-none focus:border-pro-teal transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Selecione a turma</option>
                          {studentClasses.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.code} {c.type ? `(${c.type})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <CalendarDays size={12} /> Data da Aula
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsManualDate(!isManualDate)}
                          className="text-[9px] font-bold text-pro-teal hover:underline tracking-tight"
                        >
                          {isManualDate ? "Ver lista de dias" : "Outro dia?"}
                        </button>
                      </div>

                      {isManualDate ? (
                        <div className="relative">
                          <input
                            type="date"
                            required
                            max={formatDateKey(new Date())}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-white border-2 border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-pro-teal transition-all cursor-pointer"
                          />
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            required
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            disabled={!selectedClassId}
                            className="w-full bg-white border-2 border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 pr-10 text-xs font-black text-slate-700 outline-none focus:border-pro-teal transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">Selecione o dia da aula</option>
                            {availableDays.map(d => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Question 1: NPS (0-10) */}
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-800 leading-tight">
                    1. O quanto você recomendaria esta aula para um amigo ou colega de teatro?
                  </label>
                  <div className="flex flex-wrap justify-between gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNpsRating(val)}
                        className={`w-9 h-9 md:w-10 md:h-10 rounded-lg text-xs font-black transition-all ${
                          npsRating === val 
                            ? 'bg-pro-teal text-white shadow-lg shadow-pro-teal/20 scale-105' 
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Não recomendaria</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Recomendaria muito</span>
                  </div>
                </div>

                {/* Question 2: expressionScore (1-5) */}
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-800 leading-tight">
                    2. Em que medida você sentiu que teve espaço para se expressar e ser ouvido(a) pelo professor hoje?
                  </label>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setExpressionScore(val)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${
                          expressionScore === val 
                            ? 'bg-pro-teal border-pro-teal text-white shadow-md shadow-pro-teal/10' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Não me senti ouvido</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Senti total abertura</span>
                  </div>
                </div>

                {/* Question 3: qualityScore (1-5) */}
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-800 leading-tight">
                    3. Como você avalia a clareza e a qualidade dos exercícios propostos?
                  </label>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setQualityScore(val)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${
                          qualityScore === val 
                            ? 'bg-pro-teal border-pro-teal text-white shadow-md shadow-pro-teal/10' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Confusos/Pouco produtivos</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Muito claros/Excelente prática</span>
                  </div>
                </div>

                {/* Question 4: challengeScore (1-5) */}
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-800 leading-tight">
                    4. O quanto o conteúdo de hoje desafiou suas habilidades artísticas de forma positiva?
                  </label>
                  <div className="flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setChallengeScore(val)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${
                          challengeScore === val 
                            ? 'bg-pro-teal border-pro-teal text-white shadow-md shadow-pro-teal/10' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between px-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Senti que não evoluí</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Senti um grande progresso</span>
                  </div>
                </div>

                {/* Question 5: Comments */}
                <div className="space-y-3">
                  <label className="text-sm font-black text-slate-800 leading-tight block">
                    5. Espaço Aberto: O que foi o ponto alto da aula ou o que poderíamos melhorar?
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all min-h-[120px] resize-none"
                    placeholder="Sua resposta aqui..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="w-full bg-pro-teal text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-pro-teal/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Enviar Feedback
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

