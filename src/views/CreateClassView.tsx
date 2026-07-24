/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Plus, X, UserCircle, Calendar, GraduationCap, ChevronDown, Check, ArrowLeft } from "lucide-react";
import { User, ClassData } from "../types";
import { Logo, BackButton } from "../components/CommonComponents";
import { getUserDisplayName } from "../lib/userUtils";
import { FormEvent, useState, useRef, useEffect } from "react";

interface CreateClassViewProps {
  classData: ClassData;
  setClassData: (data: any) => void;
  users: User[];
  handleClassSubmit: (e: FormEvent) => void;
  setView: (view: string) => void;
  setShowInactivationPopup: (show: boolean) => void;
  isEditing?: boolean;
  handleDeleteClass?: () => Promise<void>;
}

export const CreateClassView = ({
  classData,
  setClassData,
  users,
  handleClassSubmit,
  setView,
  setShowInactivationPopup,
  isEditing,
  handleDeleteClass
}: CreateClassViewProps) => {
  const teachers = users
    .filter(u => u.role === "Professor")
    .sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b), 'pt-BR'));
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  const WEEKDAYS = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo"
  ];

  const selectedDays = classData.weekday ? classData.weekday.split(", ") : [];
  const selectedTeacherIds = classData.teacherIds || [];

  const toggleDay = (day: string) => {
    let newDays;
    if (selectedDays.includes(day)) {
      newDays = selectedDays.filter(d => d !== day);
    } else {
      // Keep sort order
      newDays = [...selectedDays, day].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
    }
    setClassData((prev: any) => ({ ...prev, weekday: newDays.join(", ") }));
  };

  const toggleTeacher = (teacherId: string) => {
    let newIds;
    if (selectedTeacherIds.includes(teacherId)) {
      newIds = selectedTeacherIds.filter(id => id !== teacherId);
    } else {
      newIds = [...selectedTeacherIds, teacherId];
    }
    setClassData((prev: any) => ({ ...prev, teacherIds: newIds }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDayDropdownOpen(false);
      }
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(event.target as Node)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <motion.div
      key="create-class-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-2xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col relative"
    >
      {/* Back Button Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton 
          onClick={() => setView(isEditing ? "class_details" : "dashboard")} 
          className="!text-white pointer-events-auto" 
        />
      </div>
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-16">
         <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
         <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">
           {isEditing ? "Editar Turma" : "Nova Turma"}
         </h1>
         <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Planejamento e Organização Escolar</p>
      </div>

      <form onSubmit={handleClassSubmit} className="p-8 md:p-16 space-y-8 flex-1 overflow-y-auto max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 col-span-full">
            <h4 className="text-[10px] font-black text-pro-teal uppercase tracking-[0.2em] border-l-4 border-pro-teal pl-3">Informações da Turma</h4>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Código da Turma</label>
            <input
              type="text"
              required
              value={classData.code}
              onChange={(e) => setClassData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Ex: TEATRO-A-2024"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Tipo de Turma</label>
            <select
              value={classData.type}
              onChange={(e) => setClassData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
            >
              <option value="Curso Livre Adultos">Curso Livre Adultos</option>
              <option value="Curso Livre 60+">Curso Livre 60+</option>
              <option value="Prática Profissional de Montagem">Prática Profissional de Montagem</option>
            </select>
          </div>

          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Dias da Semana</label>
            <div 
              onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all cursor-pointer flex items-center justify-between hover:border-pro-teal shadow-sm"
            >
              <span className={`truncate ${selectedDays.length === 0 ? "text-slate-400 text-sm" : "text-slate-800 font-medium text-sm"}`}>
                {selectedDays.length === 0 ? "Selecione os dias" : selectedDays.join(", ")}
              </span>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDayDropdownOpen ? "rotate-180" : ""}`} />
            </div>

            {isDayDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-2 space-y-1">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                        selectedDays.includes(day) 
                        ? "bg-pro-teal/10 text-pro-teal font-bold" 
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {day}
                      {selectedDays.includes(day) && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Horário</label>
            <input
              type="text"
              value={classData.time || ""}
              onChange={(e) => setClassData(prev => ({ ...prev, time: e.target.value }))}
              placeholder="Ex: 19:00 às 21:30"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal shadow-sm"
            />
          </div>

          <div className="space-y-1 relative" ref={teacherDropdownRef}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Professor(es) Responsável(is)</label>
            <div 
              onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all cursor-pointer flex items-center justify-between hover:border-pro-teal shadow-sm"
            >
              <span className={`truncate ${selectedTeacherIds.length === 0 ? "text-slate-400 text-sm" : "text-slate-800 font-medium text-sm"}`}>
                {selectedTeacherIds.length === 0 
                  ? "Selecione o(s) professor(es)" 
                  : selectedTeacherIds.map(id => { const t = teachers.find(x => x.id === id); return t ? getUserDisplayName(t) : ""; }).filter(Boolean).join(", ")}
              </span>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${isTeacherDropdownOpen ? "rotate-180" : ""}`} />
            </div>

            {isTeacherDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-y-auto max-h-60 animate-in fade-in zoom-in duration-200">
                <div className="p-2 space-y-1">
                  {teachers.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTeacher(t.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                        selectedTeacherIds.includes(t.id) 
                        ? "bg-pro-teal/10 text-pro-teal font-bold" 
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {getUserDisplayName(t)}
                      {selectedTeacherIds.includes(t.id) && <Check size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Data de Início da Turma</label>
            <input
              type="date"
              value={classData.startDate || ""}
              onChange={(e) => setClassData(prev => {
                const date = e.target.value;
                const year = date ? date.split("-")[0] : "";
                return { ...prev, startDate: date, year: year };
              })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 transition-all focus:outline-none focus:border-pro-teal"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Status da Turma</label>
            <div 
              onClick={() => {
                if (classData.isActive) {
                   setShowInactivationPopup(true);
                } else {
                   setClassData((prev: any) => ({ ...prev, isActive: true, inactivationReason: "" }));
                }
              }}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                classData.isActive 
                ? "bg-green-50 border-green-200 text-green-700" 
                : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{classData.isActive ? "Ativa" : "Inativa"}</span>
              <div className={`w-8 h-4 rounded-full p-1 transition-colors ${classData.isActive ? 'bg-green-600' : 'bg-red-600'}`}>
                <div className={`w-2 h-2 bg-white rounded-full transition-transform ${classData.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-6 border-t border-slate-100 flex-col md:flex-row">
          <button
            type="button"
            onClick={() => setView(isEditing ? "class_details" : "dashboard")}
            className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
          >
            Cancelar
          </button>
          {isEditing && handleDeleteClass && (
            <button
               type="button"
               onClick={handleDeleteClass}
               className="flex-1 py-4 bg-white text-red-500 border border-red-100 font-bold rounded-xl hover:bg-red-50 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
            >
               Excluir Turma
            </button>
          )}
          <button
            type="submit"
            className="flex-[2] py-4 bg-pro-teal text-white font-bold rounded-xl shadow-lg shadow-teal-900/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest text-[10px]"
          >
            {isEditing ? "Salvar Alterações" : "Criar Turma"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};
