import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MapPin, 
  Clock, 
  MoreHorizontal, 
  Trash2, 
  Edit3, 
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SchoolEvent, User } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

interface AgendaEventosProps {
  currentUser: User | null;
  isGestor: boolean;
}

type EventForm = Omit<SchoolEvent, 'id' | 'criadoPor' | 'lastUpdate' | 'data'> & {
  data: string;
};

export const AgendaEventos: React.FC<AgendaEventosProps> = ({ currentUser, isGestor }) => {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<SchoolEvent | null>(null);
  
  const [formData, setFormData] = useState<EventForm>({
    titulo: '',
    tipo: 'Ensaio',
    data: new Date().toISOString().split('T')[0],
    inicio: '18:00',
    fim: '21:00',
    local: '',
    descricao: '',
    obrigatorio: true
  });

  useEffect(() => {
    const q = query(collection(db, "eventos-escola"), orderBy("data", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SchoolEvent[];
      setEvents(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "eventos-escola");
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const eventData = {
        ...formData,
        data: Timestamp.fromDate(new Date(formData.data + 'T12:00:00')),
        criadoPor: currentUser.id,
        lastUpdate: serverTimestamp()
      };

      if (editingEvent) {
        await updateDoc(doc(db, "eventos-escola", editingEvent.id), eventData);
      } else {
        await addDoc(collection(db, "eventos-escola"), eventData);
      }

      setShowModal(false);
      setEditingEvent(null);
      setFormData({
        titulo: '',
        tipo: 'Ensaio',
        data: new Date().toISOString().split('T')[0],
        inicio: '18:00',
        fim: '21:00',
        local: '',
        descricao: '',
        obrigatorio: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "eventos-escola");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este evento?")) return;
    try {
      await deleteDoc(doc(db, "eventos-escola", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `eventos-escola/${id}`);
    }
  };

  const openEdit = (event: SchoolEvent) => {
    setEditingEvent(event);
    setFormData({
      titulo: event.titulo,
      tipo: event.tipo,
      data: event.data?.toDate ? event.data.toDate().toISOString().split('T')[0] : '',
      inicio: event.inicio,
      fim: event.fim,
      local: event.local,
      descricao: event.descricao || '',
      obrigatorio: event.obrigatorio ?? true
    });
    setShowModal(true);
  };

  const getEventBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'Ensaio': return 'bg-pro-orange text-white';
      case 'Peça': return 'bg-pro-yellow text-slate-800';
      case 'Workshop': return 'bg-pro-teal text-white';
      case 'Aula Aberta': return 'bg-slate-800 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-pro-teal/10 text-pro-teal rounded-xl flex items-center justify-center">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Agenda da Escola</h2>
            <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest">Ensaios, Peças e Workshops</p>
          </div>
        </div>
        
        {isGestor && (
          <button
            onClick={() => {
              setEditingEvent(null);
              setFormData({
                titulo: '',
                tipo: 'Ensaio',
                data: new Date().toISOString().split('T')[0],
                inicio: '18:00',
                fim: '21:00',
                local: '',
                descricao: ''
              });
              setShowModal(true);
            }}
            className="px-6 py-3 bg-pro-teal text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-pro-teal/20 transition-all hover:bg-slate-800"
          >
            <Plus size={16} /> Novo Evento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-pro-teal border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Agenda...</p>
          </div>
        ) : events.length > 0 ? (
          events.map(event => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setViewingEvent(event)}
              className="bg-white rounded-[32px] border-2 border-slate-100 p-6 hover:border-pro-teal/30 hover:shadow-xl transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-2 h-full ${getEventBadgeColor(event.tipo).split(' ')[0]}`} />
              
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${getEventBadgeColor(event.tipo)}`}>
                    {event.tipo}
                  </span>
                  {event.obrigatorio && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded text-[7px] font-black uppercase tracking-tighter border border-red-100">
                      Obrigatório
                    </span>
                  )}
                  {isGestor && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEdit(event); }}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-pro-teal rounded-xl"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase leading-tight line-clamp-2">{event.titulo}</h3>
                  <div className="flex items-center gap-2 text-pro-teal mt-1">
                    <CalendarIcon size={14} />
                    <span className="text-xs font-bold">
                      {event.data?.toDate ? event.data.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : 'Data não definida'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase">{event.inicio} - {event.fim}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin size={14} />
                    <span className="text-[10px] font-black uppercase line-clamp-1">{event.local}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-slate-50 rounded-[40px] text-center space-y-4 border-2 border-dashed border-slate-200">
            <CalendarIcon size={40} className="mx-auto text-slate-300" />
            <div>
              <p className="text-lg font-black text-slate-400 uppercase tracking-tight">Nenhum evento programado</p>
              <p className="text-xs font-bold text-slate-400">Fique de olho! Novas datas aparecem aqui.</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pro-teal/5 to-transparent">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    {editingEvent ? 'Editar Evento' : 'Novo Evento'}
                  </h2>
                  <p className="text-[10px] font-black text-pro-teal uppercase tracking-widest">Programação da Intervalo</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Título do Evento</label>
                    <input
                      required
                      type="text"
                      value={formData.titulo}
                      onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal transition-all"
                      placeholder="Ex: Ensaio Geral - Romeu e Julieta"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tipo</label>
                      <select
                        value={formData.tipo}
                        onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal transition-all"
                      >
                        <option value="Ensaio">Ensaio</option>
                        <option value="Peça">Peça</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Aula Aberta">Aula Aberta</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Data</label>
                      <input
                        required
                        type="date"
                        value={formData.data}
                        onChange={e => setFormData({ ...formData, data: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Horário Início</label>
                      <input
                        required
                        type="time"
                        value={formData.inicio}
                        onChange={e => setFormData({ ...formData, inicio: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Horário Fim</label>
                      <input
                        required
                        type="time"
                        value={formData.fim}
                        onChange={e => setFormData({ ...formData, fim: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Local / Sala</label>
                    <input
                      required
                      type="text"
                      value={formData.local}
                      onChange={e => setFormData({ ...formData, local: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal transition-all"
                      placeholder="Ex: Sala 01 - Principal"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                    <input
                      type="checkbox"
                      id="obrigatorio"
                      checked={formData.obrigatorio}
                      onChange={e => setFormData({ ...formData, obrigatorio: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-pro-teal focus:ring-pro-teal"
                    />
                    <label htmlFor="obrigatorio" className="text-sm font-bold text-slate-700 select-none">
                      Evento Obrigatório (Presença Obrigatória)
                    </label>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Descrição (Opcional)</label>
                    <textarea
                      value={formData.descricao}
                      onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-pro-teal transition-all h-32 resize-none"
                      placeholder="Detalhes sobre o que levar ou preparos necessários..."
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-pro-teal text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-pro-teal/20 hover:bg-slate-800 transition-all"
                  >
                    {editingEvent ? 'Salvar Alterações' : 'Cadastrar Evento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal (Student/General View) */}
      <AnimatePresence>
        {viewingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[48px] shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
              <button 
                onClick={() => setViewingEvent(null)}
                className="absolute top-6 right-6 p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all z-10"
              >
                <X size={24} />
              </button>

              <div className={`h-3 bg-gradient-to-r ${getEventBadgeColor(viewingEvent.tipo).includes('pro-orange') ? 'from-pro-orange to-orange-400' : viewingEvent.tipo === 'Peça' ? 'from-pro-yellow to-yellow-400' : 'from-pro-teal to-teal-400'}`} />

              <div className="p-12 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${getEventBadgeColor(viewingEvent.tipo)}`}>
                      {viewingEvent.tipo}
                    </span>
                    {viewingEvent.obrigatorio && (
                      <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-red-200 shadow-sm">
                        <AlertCircle size={12} /> Obrigatório
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-tight">
                    {viewingEvent.titulo}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-pro-teal group-hover:bg-pro-teal group-hover:text-white transition-all shadow-sm">
                      <CalendarIcon size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</p>
                      <p className="text-lg font-black text-slate-700 capitalize">
                        {viewingEvent.data?.toDate ? viewingEvent.data.toDate().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : '---'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-pro-teal group-hover:bg-pro-teal group-hover:text-white transition-all shadow-sm">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário</p>
                      <p className="text-lg font-black text-slate-700">{viewingEvent.inicio} às {viewingEvent.fim}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-pro-teal group-hover:bg-pro-teal group-hover:text-white transition-all shadow-sm">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local</p>
                      <p className="text-lg font-black text-slate-700 capitalize">{viewingEvent.local}</p>
                    </div>
                  </div>
                </div>

                {viewingEvent.descricao && (
                  <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-100 relative">
                    <div className="absolute -top-3 left-8 bg-white px-4 py-1 rounded-full border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                      "{viewingEvent.descricao}"
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setViewingEvent(null)}
                  className="w-full bg-slate-800 text-white py-6 rounded-[32px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                >
                  Confirmar Ciência
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
