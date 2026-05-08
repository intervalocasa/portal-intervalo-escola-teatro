import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, Send } from 'lucide-react';
import { BADGES, BadgeDefinition } from '../constants/badges';

interface BadgeAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAward: (badge: BadgeDefinition, customMessage: string) => void;
  studentName: string;
}

export const BadgeAwardModal: React.FC<BadgeAwardModalProps> = ({ 
  isOpen, 
  onClose, 
  onAward, 
  studentName 
}) => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBadge) {
      onAward(selectedBadge, message || selectedBadge.defaultMessage);
      onClose();
      setSelectedBadge(null);
      setMessage('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pro-teal/5 to-transparent">
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Atribuir Reconhecimento</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Para: {studentName}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] px-2">
                Selecione a Conquista
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {BADGES.filter(b => b.badgeId !== 'presenca-vip').map((badge) => (
                  <button
                    key={badge.badgeId}
                    type="button"
                    onClick={() => {
                      setSelectedBadge(badge);
                      setMessage(badge.defaultMessage);
                    }}
                    className={`
                      p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-3 group
                      ${selectedBadge?.badgeId === badge.badgeId 
                        ? 'border-pro-teal bg-pro-teal/5 ring-4 ring-pro-teal/10' 
                        : 'border-slate-100 bg-slate-50 hover:border-pro-teal/30 hover:bg-white'}
                    `}
                  >
                    <div className={`
                      p-4 rounded-2xl transition-all
                      ${selectedBadge?.badgeId === badge.badgeId 
                        ? 'bg-pro-teal text-white' 
                        : 'bg-white text-slate-400 group-hover:text-pro-teal shadow-sm'}
                    `}>
                      {badge.icon}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{badge.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedBadge && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <label className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] px-2">
                  Mensagem Personalizada
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-sm font-bold text-slate-700 focus:border-pro-teal focus:bg-white outline-none transition-all min-h-[120px] resize-none"
                  placeholder="Escreva algo inspirador..."
                />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                  "Esta mensagem aparecerá no mural de conquistas do aluno."
                </p>
              </motion.div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={!selectedBadge}
                className="w-full bg-pro-teal text-white py-6 rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-pro-teal/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
              >
                <Send size={20} />
                Confirmar Atribuição
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
