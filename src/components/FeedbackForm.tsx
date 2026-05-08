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
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Default to first class if available
  useState(() => {
    if (studentClasses.length > 0) {
      setSelectedClassId(studentClasses[0].id);
    }
  });

  const weekdayMap: Record<string, number> = {
    'Domingo': 0,
    'Segunda-feira': 1,
    'Terça-feira': 2,
    'Quarta-feira': 3,
    'Quinta-feira': 4,
    'Sexta-feira': 5,
    'Sábado': 6
  };

  const selectedClass = studentClasses.find(c => c.id === selectedClassId);
  
  // Calculate available days for the selected month and class
  const getAvailableDays = () => {
    if (!selectedClass) return [];
    
    const days = [];
    const targetDay = weekdayMap[selectedClass.weekday];
    if (targetDay === undefined) return [];

    const date = new Date(selectedYear, selectedMonth - 1, 1);
    const now = new Date();
    
    while (date.getMonth() === selectedMonth - 1) {
      if (date.getDay() === targetDay) {
        // Don't allow future dates
        if (date <= now) {
          days.push(new Date(date));
        }
      }
      date.setDate(date.getDate() + 1);
    }
    return days.sort((a, b) => b.getTime() - a.getTime()); // Most recent first
  };

  const availableDays = getAvailableDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedClassId || rating === 0 || !selectedDate) return;

    setIsSubmitting(true);
    try {
      const feedbackDate = new Date(selectedDate);
      // Set to midday to avoid timezone issues shifting the day
      feedbackDate.setHours(12, 0, 0, 0);

      await addDoc(collection(db, "feedbacks-aulas"), {
        studentId: currentUser.id,
        studentName: currentUser.name,
        classId: selectedClassId,
        className: selectedClass?.code || 'Turma não identificada',
        date: Timestamp.fromDate(feedbackDate),
        rating,
        comment,
        timestamp: serverTimestamp()
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        onSuccess();
        // Reset form
        setRating(0);
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

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden relative overflow-y-auto max-h-[90vh]"
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

              <form onSubmit={handleSubmit} className="p-10 space-y-6">
                {/* Row 1: Turma and Year */}
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
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all appearance-none"
                    >
                      <option value="">Selecione</option>
                      {studentClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.code}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                       Ano
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setSelectedYear(val);
                        setSelectedDate('');
                        
                        const now = new Date();
                        if (val === now.getFullYear() && selectedMonth > now.getMonth() + 1) {
                          setSelectedMonth(now.getMonth() + 1);
                        }
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all appearance-none"
                    >
                      {[2024, 2025, 2026, 2027, 2028].filter(y => y <= new Date().getFullYear()).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Month and Day */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                       Mês
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(Number(e.target.value));
                        setSelectedDate('');
                      }}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all appearance-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1)
                        .filter(m => {
                          const now = new Date();
                          const curYear = now.getFullYear();
                          const curMonth = now.getMonth() + 1;
                          if (selectedYear < curYear) return true;
                          if (selectedYear === curYear) return m <= curMonth;
                          return false;
                        })
                        .map(m => (
                          <option key={m} value={m}>
                            {new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                          </option>
                        ))
                      }
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
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all appearance-none disabled:opacity-50"
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

                <div className="space-y-4 text-center bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                    Sua Satisfação
                  </label>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-all transform hover:scale-125"
                      >
                        <Star 
                          size={32} 
                          fill={star <= (hoverRating || rating) ? "#ffbc00" : "none"} 
                          className={star <= (hoverRating || rating) ? "text-pro-yellow" : "text-slate-200"}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="h-4">
                    <p className="text-[9px] font-black uppercase text-pro-teal tracking-widest italic">
                      {rating === 1 && "Poderia ser melhor"}
                      {rating === 2 && "Regular"}
                      {rating === 3 && "Boa!"}
                      {rating === 4 && "Muito boa!"}
                      {rating === 5 && "Incrível! 🎭"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <MessageSquare size={12} /> Comentário
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] p-5 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all min-h-[100px] resize-none"
                    placeholder="O que você mais gostou na aula?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || !selectedClassId || !selectedDate}
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
