import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  X, 
  Send, 
  CheckCircle2, 
  Drama,
  Calendar,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Class } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Set default class when modal opens or classes list changes
  React.useEffect(() => {
    if (isOpen && studentClasses.length > 0) {
      if (!selectedClassId || !studentClasses.some(c => c.id === selectedClassId)) {
        setSelectedClassId(studentClasses[0].id);
        setSelectedDate('');
      }
    }
  }, [isOpen, studentClasses, selectedClassId]);

  const weekdayMap: Record<string, number> = {
    'domingo': 0,
    'segunda-feira': 1,
    'terça-feira': 2,
    'quarta-feira': 3,
    'quinta-feira': 4,
    'sexta-feira': 5,
    'sábado': 6,
    'segunda': 1,
    'terça': 2,
    'quarta': 3,
    'quinta': 4,
    'sexta': 5
  };

  const selectedClass = studentClasses.find(c => c.id === selectedClassId);
  
  // Calculate available days for the selected class (looking back 45 days)
  const getAvailableDays = () => {
    if (!selectedClass) return [];
    
    // Split days in case of multiple weekdays (e.g. "Segunda-feira, Quarta-feira")
    const weekdaysTextList = selectedClass.weekday 
      ? selectedClass.weekday.split(',').map(s => s.trim().toLowerCase()) 
      : [];
    
    const targetDays: number[] = [];
    weekdaysTextList.forEach(wText => {
      const dayNum = weekdayMap[wText];
      if (dayNum !== undefined) {
        targetDays.push(dayNum);
      }
    });

    const days: Date[] = [];
    const now = new Date();
    
    // If no weekdays configuration is present, return all last 30 days
    if (targetDays.length === 0) {
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        days.push(d);
      }
      return days;
    }

    // Go back 45 days in history and find matching weekdays
    for (let i = 0; i < 45; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      if (targetDays.includes(d.getDay())) {
        days.push(d);
      }
    }
    return days; // Already ordered from most recent to oldest (since i starts at 0 and increments)
  };

  const availableDays = getAvailableDays();

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
      const feedbackDate = new Date(selectedDate);
      // Set to midday to avoid timezone issues shifting the day
      feedbackDate.setHours(12, 0, 0, 0);

      // Main rating is the average of expression, quality and challenge (1-5 scaled)
      const avgRating = (expressionScore + qualityScore + challengeScore) / 3;

      await addDoc(collection(db, "feedbacks-aulas"), {
        studentId: currentUser.id,
        studentName: currentUser.name,
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
          className="bg-white rounded-[48px] shadow-2xl w-full max-w-2xl overflow-hidden relative overflow-y-auto max-h-[90vh]"
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
                className="absolute top-6 right-6 p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-r from-pro-teal/5 to-transparent p-10 border-b border-slate-50">
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

              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                {/* Turma and Date Selection */}
                <div className="bg-slate-50 p-6 rounded-[32px] space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        <Calendar size={12} /> Turma
                      </label>
                      <select
                        required
                        value={selectedClassId}
                        onChange={(e) => {
                          setSelectedClassId(e.target.value);
                          setSelectedDate('');
                        }}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-pro-teal transition-all appearance-none"
                      >
                        <option value="">Selecione</option>
                        {studentClasses.map(c => (
                          <option key={c.id} value={c.id}>{c.code}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                        Data da Aula
                      </label>
                      <select
                        required
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        disabled={!selectedClassId}
                        className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-pro-teal transition-all appearance-none disabled:opacity-50"
                      >
                        <option value="">Selecione o dia</option>
                        {availableDays.map(d => (
                          <option key={d.toISOString()} value={d.toISOString()}>
                            {d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }).toUpperCase()}
                          </option>
                        ))}
                      </select>
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
                            ? 'bg-pro-teal text-white shadow-lg shadow-pro-teal/20' 
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
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
                            ? 'bg-pro-teal border-pro-teal text-white' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
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
                            ? 'bg-pro-teal border-pro-teal text-white' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
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
                            ? 'bg-pro-teal border-pro-teal text-white' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
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
                  className="w-full bg-pro-teal text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-pro-teal/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
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
