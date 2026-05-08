import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, X, Calendar } from 'lucide-react';
import { UserBadge } from '../types';
import { BADGES } from '../constants/badges';

interface MyConquestsProps {
  userBadges: UserBadge[];
}

export const MyConquests: React.FC<MyConquestsProps> = ({ userBadges }) => {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  // Logic for Monthly Reset on Day 05
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // If before day 05, the "current cycle" started on day 05 of the previous month
  const cycleStartDate = new Date(currentYear, currentMonth, 5);
  if (currentDay < 5) {
    cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
  }

  const monthName = cycleStartDate.toLocaleString('pt-BR', { month: 'long' });

  // Grouping
  const uniqueBadgeIds = ['critico-de-arte', 'embaixador-da-arte'];
  const monthlyBadgeIds = ['presenca-vip', 'rato-de-coxia', 'curinga-cenico', 'escuta-ativa'];

  const getBadgeCount = (badgeId: string) => {
    return userBadges.filter(ub => ub.badgeId === badgeId).length;
  };

  const getLatestBadgeForId = (badgeId: string, filterByCycle = false) => {
    let badges = userBadges.filter(ub => ub.badgeId === badgeId);
    if (filterByCycle) {
      badges = badges.filter(ub => {
        const receivedDate = ub.dateReceived?.toDate ? ub.dateReceived.toDate() : new Date();
        return receivedDate >= cycleStartDate;
      });
    }
    // Return latest
    return badges.sort((a, b) => {
      const dateA = a.dateReceived?.toDate ? a.dateReceived.toDate() : new Date();
      const dateB = b.dateReceived?.toDate ? b.dateReceived.toDate() : new Date();
      return dateB.getTime() - dateA.getTime();
    })[0] || null;
  };

  const renderBadge = (badgeDef: any, section: 'unique' | 'monthly') => {
    const isUnique = uniqueBadgeIds.includes(badgeDef.badgeId);
    const count = getBadgeCount(badgeDef.badgeId);
    const latestInCycle = getLatestBadgeForId(badgeDef.badgeId, section === 'monthly');
    const hasLatest = !!latestInCycle;
    
    return (
      <button
        key={badgeDef.badgeId}
        onClick={() => latestInCycle && setSelectedBadge(latestInCycle)}
        title={`${badgeDef.name}: ${badgeDef.description}`}
        className={`
          p-5 rounded-[32px] border-2 transition-all flex flex-col items-center text-center gap-3 group relative
          ${hasLatest 
            ? 'bg-white border-slate-100 hover:border-amber-400 hover:shadow-xl hover:-translate-y-1' 
            : 'bg-slate-50/50 border-transparent grayscale opacity-40 cursor-not-allowed'}
        `}
      >
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center transition-all
          ${hasLatest ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600' : 'bg-slate-200 text-slate-400'}
        `}>
          {badgeDef.icon}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-tight leading-none group-hover:text-amber-600 transition-colors">
            {badgeDef.name}
          </p>
        </div>
        
        {count > 1 && !isUnique && (
          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-black px-2 py-1 rounded-full border-2 border-white shadow-sm">
            {count}
          </div>
        )}

        {hasLatest && isUnique && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center border-4 border-white">
            <Award size={10} fill="currentColor" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-12">
      {/* Monthly Achievements Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pro-teal/10 text-pro-teal rounded-xl flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Conquistas de {monthName}</h2>
              <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest">Reinicia todo dia 05</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BADGES.filter(b => monthlyBadgeIds.includes(b.badgeId)).map(b => renderBadge(b, 'monthly'))}
        </div>
      </div>

      {/* Unique Achievements Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Award size={20} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Minhas Conquistas</h2>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sua jornada artística em selos</p>
            </div>
          </div>
          <div className="bg-slate-100 px-4 py-2 rounded-2xl">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              {new Set(userBadges.map(ub => ub.badgeId)).size} / {BADGES.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {BADGES.filter(b => uniqueBadgeIds.includes(b.badgeId)).map(b => renderBadge(b, 'unique'))}
        </div>
      </div>

      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
              <button 
                onClick={() => setSelectedBadge(null)}
                className="absolute top-6 right-6 p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all z-10"
              >
                <X size={24} />
              </button>

              <div className="bg-gradient-to-b from-amber-50 to-transparent p-12 text-center space-y-6">
                <div className="inline-flex w-32 h-32 bg-white rounded-[40px] items-center justify-center text-amber-600 shadow-2xl shadow-amber-200/50 relative mx-auto">
                  {BADGES.find(b => b.badgeId === selectedBadge.badgeId)?.icon}
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center border-8 border-white shadow-lg">
                    <Award size={20} fill="currentColor" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                    {selectedBadge.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">
                    <Calendar size={12} />
                    Conquistado em {selectedBadge.dateReceived?.toDate ? selectedBadge.dateReceived.toDate().toLocaleDateString('pt-BR') : 'Recentemente'}
                  </div>
                </div>
              </div>

              <div className="p-12 pt-0 text-center space-y-8">
                <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reconhecimento</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 italic leading-relaxed">
                    "{selectedBadge.message}"
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full bg-slate-800 text-white py-6 rounded-[32px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                >
                  Continuar Evoluindo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
