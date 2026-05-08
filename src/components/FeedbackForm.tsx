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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Default to first class if available
  useState(() => {
    if (studentClasses.length > 0) {
      setSelectedClassId(studentClasses[0].id);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedClassId || rating === 0) return;

    setIsSubmitting(true);
    try {
      const selectedClass = studentClasses.find(c => c.id === selectedClassId);
      
      await addDoc(collection(db, "feedbacks-aulas"), {
        studentId: currentUser.id,
        studentName: currentUser.name,
        classId: selectedClassId,
        className: selectedClass?.name || 'Turma não identificada',
        date: serverTimestamp(),
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
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "feedbacks-aulas");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden relative"
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
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <Calendar size={12} /> Selecione sua Turma
                  </label>
                  <select
                    required
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 text-sm font-black text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all appearance-none"
                  >
                    {studentClasses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    {studentClasses.length === 0 && <option value="">Nenhuma turma encontrada</option>}
                  </select>
                </div>

                <div className="space-y-6 text-center">
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
                          size={36} 
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

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                    <MessageSquare size={12} /> Conte mais sobre sua experiência
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] p-6 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal focus:bg-white transition-all min-h-[120px] resize-none"
                    placeholder="O que você mais gostou na aula de hoje?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || !selectedClassId}
                  className="w-full bg-pro-teal text-white py-6 rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-pro-teal/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={20} />
                      Enviar Percepção
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
