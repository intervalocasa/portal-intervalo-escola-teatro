/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { Megaphone, X, ChevronRight, Bell, ThumbsUp, Zap } from "lucide-react";
import { useState, MouseEvent } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { User, Announcement } from "../types";

interface AnnouncementPanelProps {
  announcements: Announcement[];
  currentUser: User | null;
}

export const AnnouncementPanel = ({ announcements, currentUser }: AnnouncementPanelProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        {announcements.map((aviso, idx) => (
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
              className="p-5 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`p-3 rounded-2xl ${
                  aviso.target === "Todos" ? "bg-blue-50 text-blue-500" :
                  aviso.target === "Alunos" ? "bg-pro-teal/10 text-pro-teal" :
                  "bg-purple-50 text-purple-500"
                }`}>
                  <Megaphone size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                     <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{aviso.target}</span>
                     {aviso.targetSpecificUsers && (
                       <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded">Direcionado</span>
                     )}
                  </div>
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight line-clamp-1">{aviso.title}</h4>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pr-2">
                <button
                  onClick={(e) => toggleLike(e, aviso)}
                  className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
                    aviso.likes?.includes(currentUser?.id || "") 
                      ? "bg-pro-teal/10 text-pro-teal" 
                      : "bg-slate-50 text-slate-400 hover:bg-pro-teal/5"
                  }`}
                >
                  <ThumbsUp size={14} className={aviso.likes?.includes(currentUser?.id || "") ? "fill-current" : ""} />
                  <span className="text-[9px] font-black">{aviso.likes?.length || 0}</span>
                </button>
                <button
                  onClick={(e) => toggleForce(e, aviso)}
                  className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
                    aviso.forces?.includes(currentUser?.id || "") 
                      ? "bg-pro-orange/10 text-pro-orange" 
                      : "bg-slate-50 text-slate-400 hover:bg-pro-orange/5"
                  }`}
                >
                  <Zap size={14} className={aviso.forces?.includes(currentUser?.id || "") ? "fill-current" : ""} />
                  <span className="text-[9px] font-black">{aviso.forces?.length || 0}</span>
                </button>
              </div>

              <div className={`p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-pro-teal group-hover:text-white transition-all ${
                expandedId === aviso.id ? "rotate-90 bg-pro-teal text-white" : ""
              }`}>
                <ChevronRight size={18} />
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
        ))}
      </div>
    </div>
  );
};
