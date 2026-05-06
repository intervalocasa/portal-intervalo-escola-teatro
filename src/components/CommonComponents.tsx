/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { UserCircle } from "lucide-react";
import React, { useState } from "react";
import { THEME } from "../theme";

export const Logo = ({ className = "h-24 w-auto" }: { className?: string }) => (
  <svg 
    viewBox="0 0 400 300" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="155" y="50" width="80" height="80" fill="#016a86" />
    <rect x="160" y="55" width="55" height="55" fill="#ffbc00" />
    <rect x="135" y="55" width="20" height="50" fill="#fbd3b6" opacity="0.8" />
    
    <rect x="138" y="150" width="85" height="150" fill="#016a86" />
    <rect x="155" y="140" width="60" height="180" fill="#ff7c00" />
    <rect x="220" y="140" width="15" height="180" fill="#fbd3b6" opacity="0.8" />
    <rect x="200" y="280" width="20" height="20" fill="#ff7c00" opacity="0.5" />
  </svg>
);

export const LoadingScreen = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[500] bg-white flex flex-col items-center justify-center p-12"
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: [0.8, 1.05, 1],
        opacity: 1
      }}
      transition={{ 
        duration: 2,
        ease: "easeInOut",
        times: [0, 0.6, 1]
      }}
      className="flex flex-col items-center gap-8"
    >
      <div className="relative">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`absolute inset-0 bg-${THEME.colors.primary}/20 blur-3xl rounded-full`}
        />
        <Logo className="h-32 w-auto relative z-10" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ duration: 2, ease: "easeInOut" }}
          className="h-[2px] bg-slate-100 rounded-full overflow-hidden"
        >
          <motion.div 
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className={`w-full h-full bg-${THEME.colors.primary}`}
          />
        </motion.div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-[0.3em]">
          Preparando seu ambiente
        </p>
      </div>
    </motion.div>
  </motion.div>
);

export const DetailItem = ({ label, value, fullWidth = false }: { label: string, value: any, fullWidth?: boolean }) => (
  <div className={`space-y-1 ${fullWidth ? 'col-span-full' : ''}`}>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
    <p className="text-sm font-bold text-slate-800">{value || "Não informado"}</p>
  </div>
);

export const Avatar = ({ 
  src, 
  alt = "User Avatar", 
  className = "w-full h-full rounded-full",
  fallbackSize
}: { 
  src?: string, 
  alt?: string, 
  className?: string,
  fallbackSize?: number
}) => {
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 ${className}`}>
      {!src || error ? (
        <UserCircle 
          size={fallbackSize || "60%"} 
          className="text-slate-300" 
        />
      ) : (
        <img 
          src={src} 
          alt={alt} 
          onError={() => setError(true)}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
};
