
import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  TrendingUp, 
  Target, 
  Users,
  Drama
} from 'lucide-react';
import { Logo, BackButton } from './CommonComponents';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  ADULT_COURSE_CRITERIA, 
  PROFESSIONAL_COURSE_CRITERIA, 
  GRADE_LEGEND 
} from '../constants';

interface EvolutionChartsViewProps {
  analyticsClassId: string;
  evaluations: any[];
  diaries: any[];
  currentUser: any;
  users: any[];
  classes: any[];
  setView: (view: string) => void;
  setAnalyticsClassId: (id: string) => void;
}

export const EvolutionChartsView: React.FC<EvolutionChartsViewProps> = ({
  analyticsClassId,
  evaluations,
  diaries,
  currentUser,
  users,
  classes,
  setView,
  setAnalyticsClassId
}) => {
  const mappedUser = users.find(u => u.id === currentUser?.uid) || users.find(u => u.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const eligibleIds = [currentUser?.uid, mappedUser?.id, mappedUser?.migratedFrom].filter(Boolean) as string[];

  const currentClass = classes.find(c => c.id === analyticsClassId);
  const isAdultOr60 = currentClass?.type?.includes("Adulto") || currentClass?.type?.includes("60+");

  const studentClassesWithData = React.useMemo(() => {
    const ids = new Set([
      ...evaluations.filter(e => eligibleIds.includes(e.studentId)).map(e => e.classId),
      ...diaries.filter(d => eligibleIds.includes(d.studentId)).map(d => d.classId)
    ]);
    return classes.filter(c => ids.has(c.id));
  }, [evaluations, diaries, eligibleIds, classes]);

  const criteria = currentClass?.type?.includes("Profissional") || currentClass?.type?.includes("Montagem")
    ? PROFESSIONAL_COURSE_CRITERIA
    : ADULT_COURSE_CRITERIA;

  const chartData = React.useMemo(() => {
    const studentEvals = evaluations
      .filter(e => eligibleIds.includes(e.studentId) && e.classId === analyticsClassId)
      .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
      
    const studentDiaries = diaries
      .filter(d => eligibleIds.includes(d.studentId) && d.classId === analyticsClassId && d.status === "concluido")
      .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

    const combinedMap = new Map();
    
    studentEvals.forEach(e => {
        const key = `${e.month}/${e.year}`;
        const selfAvg = (Object.values(e.notes) as any[]).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0) / Object.values(e.notes).length;
        
        const dataPoint: any = { 
            name: key, 
            self: Number(selfAvg.toFixed(1)), 
            month: e.month, 
            year: e.year,
            selfNotes: e.notes
        };
        
        combinedMap.set(key, dataPoint);
    });

    studentDiaries.forEach(d => {
        const key = `${d.month}/${d.year}`;
        if (!combinedMap.has(key)) {
            combinedMap.set(key, { name: key, month: d.month, year: d.year });
        }
        const point = combinedMap.get(key);
        point.prof = Number(d.averageGrade.toFixed(1));
        point.profGrades = d.grades;
    });

    // Calculate final combined evolution
    const results = Array.from(combinedMap.values()).map(point => {
        const weightSelf = currentClass?.type?.includes("Profissional") ? 2 : 3;
        const weightProf = currentClass?.type?.includes("Profissional") ? 2 : 1;
        
        let final = null;
        if (point.self !== undefined && point.prof !== undefined) {
            final = Number(((point.self * weightSelf + point.prof * weightProf) / 4).toFixed(1));
        } else if (point.prof !== undefined) {
            final = point.prof;
        } else if (point.self !== undefined) {
            final = point.self;
        }

        const criteriaAverages: any = {};
        criteria.forEach(c => {
            const s = point.selfNotes?.[c.id];
            const p = point.profGrades?.[c.id];
            if (s !== undefined && p !== undefined) {
                criteriaAverages[c.id] = Number(((s * weightSelf + p * weightProf) / 4).toFixed(1));
            } else if (p !== undefined) {
                criteriaAverages[c.id] = p;
            } else if (s !== undefined) {
                criteriaAverages[c.id] = s;
            }
        });

        return { ...point, final, ...criteriaAverages };
    });

    return results.sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  }, [evaluations, diaries, currentUser, analyticsClassId, currentClass, criteria]);

  const formatYAxis = (val: number) => {
    if (!isAdultOr60) return val.toString();
    if (val === 0) return "Partida";
    if (val <= 3) return "Novos passos";
    if (val <= 6) return "Movimento";
    if (val <= 9) return "Evolução";
    return "Seguro";
  };

  const getLabelForValue = (val: number) => {
    if (val === 0) return GRADE_LEGEND[0].studentLabel;
    if (val <= 3) return GRADE_LEGEND[1].studentLabel;
    if (val <= 6) return GRADE_LEGEND[2].studentLabel;
    if (val <= 9) return GRADE_LEGEND[3].studentLabel;
    return GRADE_LEGEND[4].studentLabel;
  };

  return (
    <motion.div
      key="evolution-charts-screen"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full md:max-w-none md:min-h-screen md:rounded-none max-w-4xl bg-white rounded-[24px] shadow-theater overflow-hidden border border-white flex flex-col"
    >
      <div className="bg-gradient-to-br from-[#016a86] to-[#014e63] p-10 text-center relative overflow-hidden flex flex-col items-center gap-2 md:py-12">
        <div className="absolute top-4 left-4 z-20">
          <BackButton 
            onClick={() => setView("evolution")} 
            className="!text-white pointer-events-auto" 
          />
        </div>
        <Logo className="h-10 md:h-16 w-auto mb-1 brightness-0 invert" />
        <h1 className="text-white text-xl md:text-3xl font-black uppercase tracking-tight">Análise de Performance</h1>
        <p className="text-teal-50/70 text-xs md:text-sm mt-1 uppercase tracking-widest leading-none font-bold">Acompanhe seu gráfico de evolução</p>
      </div>

      <div className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar bg-slate-100/50">
        <div className="max-w-5xl mx-auto w-full space-y-12">
           
           {/* Class Selector */}
           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-pro-teal/10 rounded-2xl flex items-center justify-center text-pro-teal">
                    <Drama size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Mudar Turma</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Selecione para ver outros dados</p>
                 </div>
              </div>
              <div className="w-full md:w-64">
                <select
                  value={analyticsClassId}
                  onChange={(e) => setAnalyticsClassId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:outline-none focus:border-pro-teal transition-all"
                >
                  {studentClassesWithData.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.type}</option>
                  ))}
                </select>
              </div>
           </div>

           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4 flex flex-col min-h-[180px]">
                 <div className="w-12 h-12 bg-pro-teal/10 rounded-2xl flex items-center justify-center text-pro-teal shrink-0">
                    <TrendingUp size={24} />
                 </div>
                 <div className="flex-1 flex flex-col justify-center overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Média Geral</p>
                    <p className={`font-black text-slate-800 uppercase tracking-tight leading-tight break-words line-clamp-3 ${isAdultOr60 ? 'text-lg md:text-xl' : 'text-3xl'}`}>
                        {chartData.length > 0 
                          ? (() => {
                              const avg = chartData.reduce((acc, cur:any) => acc + (cur.final || 0), 0) / chartData.length;
                              return isAdultOr60 ? getLabelForValue(avg) : avg.toFixed(1);
                            })()
                          : "---"}
                    </p>
                 </div>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4 flex flex-col min-h-[180px]">
                 <div className="w-12 h-12 bg-pro-orange/10 rounded-2xl flex items-center justify-center text-pro-orange shrink-0">
                    <Target size={24} />
                 </div>
                 <div className="flex-1 flex flex-col justify-center overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Último Desempenho</p>
                    <p className={`font-black text-slate-800 uppercase tracking-tight leading-tight break-words line-clamp-3 ${isAdultOr60 ? 'text-lg md:text-xl' : 'text-3xl'}`}>
                        {chartData.length > 0 
                          ? (() => {
                              const val = chartData[chartData.length - 1].final;
                              return isAdultOr60 ? getLabelForValue(val) : val.toFixed(1);
                            })()
                          : "---"}
                    </p>
                 </div>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4 flex flex-col min-h-[180px]">
                 <div className="w-12 h-12 bg-pro-teal/10 rounded-2xl flex items-center justify-center text-pro-teal shrink-0">
                    <Users size={24} />
                 </div>
                 <div className="flex-1 flex flex-col justify-center overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Turma</p>
                    <p className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight leading-tight break-words line-clamp-2">{currentClass?.type || "..."}</p>
                 </div>
              </div>
           </div>

           {/* General Performance Chart */}
           <div className="bg-white p-6 md:p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
              <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gráfico Geral de Evolução</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Sua jornada consolidada mês a mês</p>
              </div>

              <div className="h-[400px] w-full">
                 <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: isAdultOr60 ? 40 : 10, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorFinal" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#016a86" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#016a86" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                          dy={15}
                       />
                       <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                          domain={[0, 10]}
                          tickFormatter={formatYAxis}
                          width={isAdultOr60 ? 80 : 40}
                       />
                       <RechartsTooltip 
                          formatter={(value: number) => [isAdultOr60 ? getLabelForValue(value) : value, 'Desempenho']}
                          contentStyle={{ 
                             borderRadius: '20px', 
                             border: 'none', 
                             boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                             fontSize: '10px',
                             fontWeight: 900,
                             textTransform: 'uppercase'
                          }} 
                       />
                       <Area 
                          type="monotone" 
                          dataKey="final" 
                          stroke="#016a86" 
                          strokeWidth={4}
                          fillOpacity={1} 
                          fill="url(#colorFinal)" 
                       />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Criteria Specific Charts */}
           <div className="space-y-8">
              <div className="text-center md:text-left">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Evolução por Competência</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Análise detalhada de cada critério</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {criteria.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                     <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-50 pb-2">{c.label}</h4>
                     <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                           <LineChart data={chartData} margin={{ top: 5, right: 20, left: isAdultOr60 ? 20 : -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                              <XAxis 
                                 dataKey="name" 
                                 hide={true}
                              />
                              <YAxis 
                                 domain={[0, 10]} 
                                 tickFormatter={formatYAxis}
                                 tick={{ fontSize: 7, fontWeight: 900, fill: '#cbd5e1' }}
                                 width={isAdultOr60 ? 60 : 30}
                                 axisLine={false}
                                 tickLine={false}
                              />
                              <RechartsTooltip 
                                 formatter={(value: number) => [isAdultOr60 ? getLabelForValue(value) : value, c.label]}
                                 contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase'
                                 }} 
                              />
                              <Line 
                                 type="monotone" 
                                 dataKey={c.id} 
                                 stroke="#016a86" 
                                 strokeWidth={3} 
                                 dot={{ r: 4, fill: '#016a86', strokeWidth: 0 }}
                                 activeDot={{ r: 6, strokeWidth: 0 }}
                              />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};
