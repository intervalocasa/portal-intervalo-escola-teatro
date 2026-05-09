/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Megaphone, X, ChevronRight, Bell, Zap, Share2, Drama } from "lucide-react";
import { useState, MouseEvent } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { User, Announcement, Class } from "../types";

interface AnnouncementPanelProps {
  announcements: Announcement[];
  currentUser: User | null;
  studentClasses?: Class[];
}

export const AnnouncementPanel = ({ announcements, currentUser, studentClasses = [] }: AnnouncementPanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState<string | null>(null); // ID of announcement being shared
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const toggleLike = async (e: MouseEvent, aviso: Announcement) => {
    e.stopPropagation();
    if (!currentUser) return;

    const isLiked = aviso.likes?.includes(currentUser.id);
    const avisoRef = doc(db, "avisos", aviso.id);

    try {
      if (isLiked) {
        await updateDoc(avisoRef, {
          likes: arrayRemove(currentUser.id)
        });
      } else {
        await updateDoc(avisoRef, {
          likes: arrayUnion(currentUser.id)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `avisos/${aviso.id}`);
    }
  };

  const toggleForce = async (e: MouseEvent, aviso: Announcement) => {
    e.stopPropagation();
    if (!currentUser) return;

    const isForced = aviso.forces?.includes(currentUser.id);
    const avisoRef = doc(db, "avisos", aviso.id);

    try {
      if (isForced) {
        await updateDoc(avisoRef, {
          forces: arrayRemove(currentUser.id)
        });
      } else {
        await updateDoc(avisoRef, {
          forces: arrayUnion(currentUser.id)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `avisos/${aviso.id}`);
    }
  };

  const handleShareToMural = async (aviso: Announcement, classId: string) => {
    if (!currentUser || !classId) return;
    
    try {
      await addDoc(collection(db, "posts"), {
        authorId: currentUser.id,
        authorName: currentUser.artisticName || currentUser.name,
        classId,
        content: `🎉 CONQUISTEI UMA NOVA BADGE!\n\n${aviso.title}\n\n${aviso.content}`,
        likes: [],
        forces: [],
        timestamp: serverTimestamp()
      });
      setIsSharing(null);
      setSelectedClassId("");
      alert("Publicado no mural da turma com sucesso!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "posts");
    }
  };

  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
          <Bell size={16} fill="currentColor" />
        </div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Painel de Avisos</h3>
      </div>
      
      <div className="grid gap-3">
        {announcements.map((aviso, idx) => {
          const isConquest = aviso.title.includes("CONQUISTA");
          
          return (
            <motion.div
              key={aviso.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${
                expandedId === aviso.id ? "ring-2 ring-pro-teal/20" : ""
              }`}
            >
              <div 
                onClick={() => setExpandedId(expandedId === aviso.id ? null : aviso.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer group gap-4"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shrink-0 ${
                    aviso.target === "Todos" ? "bg-blue-50 text-blue-500" :
                    aviso.target === "Alunos" ? "bg-pro-teal/10 text-pro-teal" :
                    "bg-purple-50 text-purple-500"
                  }`}>
                    <Megaphone size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                       <span className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-widest">{aviso.target}</span>
                       {aviso.targetSpecificUsers && (
                         <span className="text-[7px] sm:text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded">Direcionado</span>
                       )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-tight truncate pr-8 sm:pr-0">{aviso.title}</h4>
                  </div>
                  
                  {/* Chevron for mobile, positioned absolutely or at end of first row */}
                  <div className={`sm:hidden absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 text-slate-400 transition-all ${
                    expandedId === aviso.id ? "rotate-90 bg-pro-teal text-white" : ""
                  }`}>
                    <ChevronRight size={14} />
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {isConquest && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (studentClasses.length === 1) {
                            handleShareToMural(aviso, studentClasses[0].id);
                          } else {
                            setIsSharing(aviso.id);
                          }
                        }}
                        className="p-1.5 sm:p-2 bg-slate-50 text-pro-teal hover:bg-pro-teal hover:text-white rounded-xl transition-all flex items-center gap-1 shadow-sm shrink-0 border border-slate-100"
                        title="Postar no Mural da Turma"
                      >
                        <Share2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">Comp.</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => toggleLike(e, aviso)}
                      className={`p-1.5 sm:p-2 rounded-xl transition-all flex items-center gap-1 shrink-0 border ${
                        aviso.likes?.includes(currentUser?.id || "") 
                          ? "bg-pro-teal/10 text-pro-teal border-pro-teal/20" 
                          : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-pro-teal/5"
                      }`}
                      title="Aplaudir"
                    >
                      <span className="text-[12px] sm:text-[14px]">👏</span>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">{aviso.likes?.length || 0} <span className="hidden xs:inline sm:inline">Aplausos</span></span>
                    </button>
                    <button
                      onClick={(e) => toggleForce(e, aviso)}
                      className={`p-1.5 sm:p-2 rounded-xl transition-all flex items-center gap-1 shrink-0 border ${
                        aviso.forces?.includes(currentUser?.id || "") 
                          ? "bg-pro-orange/10 text-pro-orange border-pro-orange/20" 
                          : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-pro-orange/5"
                      }`}
                      title="Força, ícone!"
                    >
                      <span className="text-[12px] sm:text-[14px]">💪</span>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">{aviso.forces?.length || 0} <span className="hidden xs:inline sm:inline">Força</span></span>
                    </button>
                  </div>

                  <div className={`hidden sm:flex p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-pro-teal group-hover:text-white transition-all ${
                    expandedId === aviso.id ? "rotate-90 bg-pro-teal text-white" : ""
                  }`}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === aviso.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-6 pt-0">
                      <div className="h-px bg-slate-50 mb-4" />
                      <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {aviso.content}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Share Class Selector Modal */}
      <AnimatePresence>
        {isSharing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-pro-teal/10 p-2 rounded-xl text-pro-teal">
                    <Share2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Compartilhar</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Escolha a turma para postar</p>
                  </div>
                </div>
                <button onClick={() => setIsSharing(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-3">
                {studentClasses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      const aviso = announcements.find(a => a.id === isSharing);
                      if (aviso) handleShareToMural(aviso, c.id);
                    }}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:bg-pro-teal hover:border-pro-teal transition-all text-left shadow-sm"
                  >
                    <div className="bg-white p-2.5 rounded-xl text-pro-teal group-hover:bg-white/20 group-hover:text-white transition-all shadow-sm">
                      <Drama size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-700 uppercase tracking-tight group-hover:text-white">{c.code}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white/70">{c.type}</p>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100 mt-2">
                <button
                  onClick={() => setIsSharing(null)}
                  className="w-full py-4 bg-white text-slate-500 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all font-black"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
