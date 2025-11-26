import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, CareerOption, RoadmapPhase, NewsItem, RoadmapItem, DailyChallenge, Simulation, TriviaQuestion } from '../types';
import { Roadmap } from './Roadmap';
import { fetchTechNews, generateRoadmap, calculateRemainingDays, generateDailyChallenge, generateSimulation, getChatResponse, generatePhaseSummary, generateTriviaQuestion } from '../services/gemini';
import { saveRoadmap, saveUser, getRoadmap, getCareerData, saveCareerData, setCurrentUser } from '../services/store';
import { Home, Map, Briefcase, User, LogOut, TrendingUp, PlusCircle, ChevronDown, ChevronUp, Clock, Trophy, AlertCircle, Target, BookOpen, Trash2, RotateCcw, PartyPopper, ArrowRight, Zap, Calendar, ExternalLink, X, Search, Sparkles, Pencil, CheckCircle2, RefreshCw, Palette, Moon, Sun, Flame, BrainCircuit, Gamepad2, MessageCircle, Send, Bot, Unplug, Book } from 'lucide-react';

/* --- THEME CONSTANTS --- */
const THEME_COLORS: Record<string, { [key: string]: string }> = {
  indigo: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5' },
  emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669' },
  violet: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
  rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' },
  amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
  blue: { 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb' },
};

/* --- UI COMPONENTS --- */

const FloatingDock = ({ activeTab, setActiveTab }: any) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 glass-card px-2 py-2 rounded-full flex gap-1 shadow-2xl border border-white/20 animate-fade-in">
      {[ { id: 'home', icon: Home }, { id: 'roadmap', icon: Map }, { id: 'career', icon: Briefcase }, { id: 'profile', icon: User } ].map((item) => (
          <button 
             key={item.id} 
             onClick={() => setActiveTab(item.id)} 
             className={`p-3.5 rounded-full transition-all duration-300 relative group ${activeTab === item.id ? 'bg-[var(--primary-600)] text-white shadow-lg -translate-y-2 scale-110' : 'text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-main)]'}`}
             style={activeTab === item.id ? { boxShadow: '0 10px 15px -3px var(--primary-500-50)' } : {}}
          >
              <item.icon className="h-5 w-5" />
              {activeTab === item.id && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-black/80 px-2 py-0.5 rounded text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">{item.id}</span>}
          </button>
      ))}
  </div>
);

const GlassWidget = ({ children, className = '', onClick }: any) => (
    <div onClick={onClick} className={`glass-card p-6 rounded-[2rem] border border-[var(--border-color)] shadow-xl hover:bg-[var(--bg-card-hover)] transition-all duration-300 ${className}`}>{children}</div>
);

const CelebrationModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
    <div className="glass-card border-emerald-500/50 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden">
        <div className="mx-auto w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce"><PartyPopper className="h-10 w-10 text-emerald-400" /></div>
        <h2 className="text-3xl font-bold text-[var(--text-main)] mb-2">Phase Complete!</h2>
        <p className="text-[var(--text-muted)] mb-8">You're crushing it.</p>
        <button onClick={onClose} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/40">Continue Journey</button>
    </div>
  </div>
);

const PhaseCompletionModal = ({ onClose, onFinishQuicker, onIncreaseChallenge, summary, isLoadingSummary }: any) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
        <div className="glass-card rounded-[2.5rem] p-8 max-w-md w-full max-h-[85vh] overflow-y-auto border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div><h2 className="text-2xl font-bold text-[var(--text-main)]">Milestone Reached</h2></div>
            <div className="bg-[var(--bg-main)]/50 rounded-2xl p-5 mb-8 border border-[var(--border-color)]"><h3 className="text-xs font-bold uppercase tracking-wider text-[var(--primary-400)] mb-2">AI Summary</h3>{isLoadingSummary ? <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm"><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</div> : <p className="text-[var(--text-main)] text-sm leading-relaxed">{summary}</p>}</div>
            <div className="space-y-3">
                 <button onClick={onClose} className="w-full p-5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] hover:border-[var(--primary-500)] transition-all text-left group">
                    <div className="font-bold text-[var(--text-main)] group-hover:text-[var(--primary-400)]">Keep Current Pace</div><div className="text-xs text-[var(--text-muted)]">Steady and consistent.</div>
                </button>
                <button onClick={onFinishQuicker} className="w-full p-5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] hover:border-[var(--primary-500)] transition-all text-left group">
                    <div className="font-bold text-[var(--text-main)] group-hover:text-[var(--primary-400)]">Finish Quicker</div><div className="text-xs text-[var(--text-muted)]">Recalculate deadline.</div>
                </button>
                <button onClick={onIncreaseChallenge} className="w-full p-5 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-color)] hover:border-purple-500 transition-all text-left group">
                    <div className="font-bold text-[var(--text-main)] group-hover:text-purple-400">Increase Challenge</div><div className="text-xs text-[var(--text-muted)]">Add advanced topics.</div>
                </button>
            </div>
        </div>
    </div>
);

const SimulationModal = ({ simulation, onClose, onComplete }: any) => {
    const [result, setResult] = useState<any>(null);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass-card rounded-[2.5rem] p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto border-[var(--border-color)]">
                <div className="flex justify-between items-start mb-8">
                    <div><div className="flex items-center gap-2 mb-2"><span className="px-3 py-1 rounded-full bg-[var(--primary-500-20)] text-[var(--primary-400)] text-xs font-bold uppercase tracking-wider border border-[var(--primary-500-20)]">Simulation</span><span className="text-[var(--text-muted)] text-sm">{simulation.role}</span></div><h2 className="text-3xl font-bold text-[var(--text-main)]">{simulation.title}</h2></div>
                    {!result && <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-[var(--text-muted)]"><X className="h-6 w-6"/></button>}
                </div>
                <div className="bg-[var(--bg-main)]/50 p-8 rounded-3xl border border-[var(--border-color)] mb-8 text-lg text-[var(--text-main)] leading-relaxed shadow-inner">{simulation.scenario}</div>
                {!result ? (
                    <div className="space-y-4">{simulation.options.map((opt:any, i:number) => <button key={i} onClick={() => setResult(opt)} className="w-full text-left p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)]/30 hover:bg-[var(--primary-600)] hover:border-[var(--primary-500)] hover:text-white transition-all group duration-300"><div className="font-medium text-[var(--text-main)] group-hover:text-white text-lg">{opt.text}</div></button>)}</div>
                ) : (
                    <div className="p-8 bg-[var(--primary-500-20)] rounded-3xl border border-[var(--primary-500-50)] animate-fade-in text-center">
                        <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Simulation Complete</h3>
                        <p className="text-[var(--text-main)] mb-8 text-lg">{result.outcome}</p>
                        <button onClick={() => onComplete(result.score)} className="px-8 py-4 bg-[var(--primary-600)] hover:bg-[var(--primary-500)] text-white font-bold rounded-2xl transition-colors shadow-lg">Collect {result.score} XP</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatBot = ({ context, onClose }: any) => {
    const [messages, setMessages] = useState<any[]>([{ role: 'bot', text: `Hi! I'm your AI Assistant.` }]);
    const [input, setInput] = useState(''); const [loading, setLoading] = useState(false); const endRef = useRef<any>(null);
    useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
    const send = async () => { if(!input.trim()) return; const t = input; setInput(''); setMessages(p=>[...p,{role:'user',text:t}]); setLoading(true); try { const r = await getChatResponse(t, context); setMessages(p=>[...p,{role:'bot',text:r}]); } catch { setMessages(p=>[...p,{role:'bot',text:"Error connecting."}]); } setLoading(false); };
    return (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 glass-card rounded-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in h-[500px] border border-[var(--border-color)]">
            <div className="bg-[var(--bg-main)]/50 p-4 flex justify-between items-center border-b border-[var(--border-color)]"><span className="font-bold text-[var(--text-main)] flex items-center gap-2"><Bot className="h-5 w-5 text-[var(--primary-400)]"/> Assistant</span><button onClick={onClose}><X className="h-5 w-5 text-[var(--text-muted)]"/></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/10">{messages.map((m,i)=><div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role==='user'?'bg-[var(--primary-600)] text-white':'bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--text-main)]'}`}>{m.text}</div></div>)}{loading && <div className="text-[var(--text-muted)] text-xs p-4">Typing...</div>}<div ref={endRef}/></div>
            <div className="p-3 border-t border-[var(--border-color)] flex gap-2"><input className="flex-1 bg-[var(--bg-main)]/50 rounded-xl px-4 py-2 text-sm text-[var(--text-main)] outline-none focus:bg-[var(--bg-main)]" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Type message..." /><button onClick={send} className="p-2 bg-[var(--primary-600)] rounded-xl text-white"><Send className="h-4 w-4"/></button></div>
        </div>
    );
};

interface RoadmapLoaderProps {
  primaryColor?: string;
}

export const RoadmapLoader: React.FC<RoadmapLoaderProps> = ({ primaryColor }) => {
  const theme = primaryColor ? (THEME_COLORS[primaryColor] || THEME_COLORS.indigo) : null;
  
  const style = theme ? {
      '--primary-400': theme[400],
      '--primary-500': theme[500],
      '--primary-600': theme[600],
      '--primary-500-20': `${theme[500]}33`,
      '--primary-500-50': `${theme[500]}80`,
  } as React.CSSProperties : undefined;

  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-8 animate-fade-in h-full" style={style}>
        <div className="relative w-32 h-32"><div className="absolute inset-0 border-4 border-[var(--primary-500-20)] rounded-full"></div><div className="absolute inset-0 border-4 border-[var(--primary-500)] border-t-transparent rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center"><div className="w-4 h-4 bg-[var(--primary-400)] rounded-full animate-pulse shadow-[0_0_20px_currentColor]"></div></div></div>
        <h3 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Generating Path...</h3>
    </div>
  );
};

/* --- MAIN DASHBOARD --- */

interface DashboardProps { user: UserProfile; career: CareerOption; roadmap: RoadmapPhase[] | null; onLogout: () => void; setRoadmap: any; setUser: any; setCareer: any; onAddCareer: any; }

export const Dashboard: React.FC<DashboardProps> = ({ user, career, roadmap, onLogout, setRoadmap, setUser, setCareer, onAddCareer }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'roadmap' | 'career' | 'profile'>('home');
  const [news, setNews] = useState<NewsItem[]>([]); const [isNewsLoading, setIsNewsLoading] = useState(false); const [expandedNewsIndex, setExpandedNewsIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0); const [showCelebration, setShowCelebration] = useState(false); const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showAdaptationModal, setShowAdaptationModal] = useState<any>(null); const [isAdapting, setIsAdapting] = useState(false);
  const [showPhaseCompletionModal, setShowPhaseCompletionModal] = useState(false); const [phaseSummary, setPhaseSummary] = useState<string | undefined>(undefined); const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [showDateEdit, setShowDateEdit] = useState(false); const [pendingTargetDate, setPendingTargetDate] = useState('');
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null); const [dailyFeedback, setDailyFeedback] = useState<any>(null); const [isDailyChallengeLoading, setIsDailyChallengeLoading] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false); const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null); const [isSimLoading, setIsSimLoading] = useState(false);
  const [triviaQuestion, setTriviaQuestion] = useState<TriviaQuestion | null>(null); const [triviaFeedback, setTriviaFeedback] = useState<any>(null); const [isTriviaLoading, setIsTriviaLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const themeColor = user.theme?.primaryColor || 'indigo';
  const colors = THEME_COLORS[themeColor] || THEME_COLORS.indigo;

  const currentCareerDetails = user.activeCareers.find(c => c.careerId === career.id);

  useEffect(() => {
    if (roadmap) {
      let t = 0, c = 0; roadmap.forEach(p => p.items.forEach(i => { t++; if(i.status === 'completed') c++; }));
      const p = t === 0 ? 0 : Math.round((c / t) * 100);
      if (p === 100 && progress !== 100 && progress !== 0) setShowCelebration(true);
      setProgress(p);
    } else setProgress(0);
  }, [roadmap]);

  const loadNews = useCallback(async () => { if (!career?.title) return; setIsNewsLoading(true); setNews([]); setExpandedNewsIndex(null); try { const n = await fetchTechNews(career.title); setNews(n); } catch (e) {} finally { setIsNewsLoading(false); } }, [career.id]);
  useEffect(() => { loadNews(); }, [loadNews]);

  useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      const careerLast = currentCareerDetails?.lastDailyChallenge;
      if (dailyFeedback) return;
      if (careerLast !== today && !dailyChallenge && !isDailyChallengeLoading && career) {
          setIsDailyChallengeLoading(true); setDailyFeedback(null); generateDailyChallenge(career.title, currentCareerDetails?.experienceLevel || 'beginner').then(setDailyChallenge).finally(() => setIsDailyChallengeLoading(false));
      } else if (careerLast === today) setDailyChallenge(null);
  }, [currentCareerDetails, dailyFeedback]); 

  const loadTrivia = async () => { setIsTriviaLoading(true); setTriviaQuestion(null); setTriviaFeedback(null); try { const q = await generateTriviaQuestion(career.title); setTriviaQuestion(q); } catch(e){} finally { setIsTriviaLoading(false); } };
  useEffect(() => { if (!triviaQuestion && !isTriviaLoading && career) loadTrivia(); }, [career]);

  const submitTrivia = (idx: number) => { if (!triviaQuestion) return; setTriviaFeedback({ isCorrect: idx === triviaQuestion.correctIndex, correctIndex: triviaQuestion.correctIndex }); };
  const handleSubscribe = (plan: 'monthly' | 'yearly') => { const u = { ...user, subscriptionStatus: plan }; setUser(u); saveUser(u); };
  const handleResetAll = () => { if (window.confirm("Reset all progress?")) { user.activeCareers.forEach(c => { const r = getRoadmap(user.id, c.careerId); if(r) saveRoadmap(user.id, c.careerId, r.map(p=>({...p, completionSummary: undefined, items: p.items.map(i=>({...i, status: 'pending', completedAt: undefined} as RoadmapItem))}))); }); handleResetRoadmap(); } };
  const handleThemeChange = (key: any, value: any) => { const u = { ...user, theme: { ...user.theme, [key]: value } }; setUser(u); saveUser(u); };
  const handleResetRoadmap = () => { if (!roadmap) return; const r = roadmap.map(p => ({ ...p, completionSummary: undefined, items: p.items.map(i => ({ ...i, status: 'pending', completedAt: undefined } as RoadmapItem))})); setRoadmap(r); saveRoadmap(user.id, career.id, r); };
  const handleResetPhase = (idx: number) => { if (!roadmap) return; const r = roadmap.map((p, i) => i === idx ? { ...p, completionSummary: undefined, items: p.items.map(item => ({ ...item, status: 'pending', completedAt: undefined } as RoadmapItem))} : p); setRoadmap(r); saveRoadmap(user.id, career.id, r); };
  const handleSwitchCareer = (cid: string) => { setIsRoadmapLoading(true); setRoadmap(null); setNews([]); setTimeout(() => { const c = getCareerData(user.id, cid); const r = getRoadmap(user.id, cid); if (c) { setCareer(c); setRoadmap(r || []); const u = { ...user, currentCareerId: cid }; setUser(u); saveUser(u); } setIsRoadmapLoading(false); setActiveTab('home'); }, 800); };
  const handleDeleteCareer = (cid: string) => { const ac = user.activeCareers.filter(c => c.careerId !== cid); let nextC = user.currentCareerId; let nextO = null; let nextR = null; if (cid === user.currentCareerId) { if (ac.length > 0) { nextC = ac[0].careerId; nextO = getCareerData(user.id, nextC); nextR = getRoadmap(user.id, nextC); } else nextC = undefined; } else { nextC = user.currentCareerId; nextO = career; nextR = roadmap; } const u = { ...user, activeCareers: ac, currentCareerId: nextC }; localStorage.removeItem(`pathfinder_career_data_${user.id}_${cid}`); localStorage.removeItem(`pathfinder_roadmap_${user.id}_${cid}`); setUser(u); saveUser(u); if (ac.length === 0) { setCareer(null); setRoadmap(null); onAddCareer(); } else if (cid === user.currentCareerId) { setCareer(nextO); setRoadmap(nextR || []); } };
  
  const submitDaily = (idx: number) => {
      if (!dailyChallenge || !currentCareerDetails) return;
      const isCorrect = idx === dailyChallenge.correctAnswer;
      const today = new Date().toISOString().split('T')[0];
      const firstGlobal = user.lastDailyChallenge !== today;
      let nxp = user.xp || 0, nstr = user.streak || 0;
      if (firstGlobal) { nxp = isCorrect ? nxp + 10 : nxp; nstr = isCorrect ? nstr + 1 : nstr; }
      const ac = user.activeCareers.map(c => c.careerId === career.id ? { ...c, lastDailyChallenge: today } : c);
      const u = { ...user, xp: nxp, streak: nstr, lastDailyChallenge: today, activeCareers: ac };
      setUser(u); saveUser(u);
      setDailyFeedback({ isCorrect, text: dailyChallenge.explanation + (!firstGlobal ? " (XP already collected)" : "") });
  };
  const startSim = async () => { setIsSimLoading(true); try { const s = await generateSimulation(career.title); setActiveSimulation(s); setShowSimulationModal(true); } catch(e){} finally { setIsSimLoading(false); } };
  const finishSim = (score: number) => { setShowSimulationModal(false); const nxp = (user.xp||0) + score; const u = {...user, xp: nxp}; setUser(u); saveUser(u); alert(`+${score} XP Earned!`); };
  const handleProgress = async (iid: string) => { 
      if (!roadmap) return; const now = Date.now(); 
      let pIdx = -1; roadmap.forEach((p, i) => { if (p.items.find(it => it.id === iid)) pIdx = i; });
      const wasDone = pIdx !== -1 && roadmap[pIdx].items.every(i => i.status === 'completed');
      const nr = roadmap.map(p => ({ ...p, items: p.items.map(i => i.id === iid ? { ...i, status: i.status === 'completed' ? 'pending' : 'completed', completedAt: i.status === 'completed' ? undefined : now } as RoadmapItem : i) }));
      setRoadmap(nr); saveRoadmap(user.id, career.id, nr);
      if (pIdx !== -1) { 
          const isNowDone = nr[pIdx].items.every(i => i.status === 'completed'); const allDone = nr.every(p => p.items.every(i => i.status === 'completed'));
          if (isNowDone && !wasDone && !allDone) { setShowPhaseCompletionModal(true); setIsSummaryLoading(true); try { const s = await generatePhaseSummary(nr[pIdx].phaseName, nr[pIdx].items); setPhaseSummary(s); const unr = nr.map((p, i) => i === pIdx ? { ...p, completionSummary: s } : p); setRoadmap(unr); saveRoadmap(user.id, career.id, unr); } catch(e){} finally { setIsSummaryLoading(false); } }
      }
  };
  const handleAdaptation = async (type: any, date?: string) => { if(!currentCareerDetails || !roadmap) return; setIsAdapting(true); try { const completed = roadmap.filter(p => p.items.every(i => i.status === 'completed')); const lastIdx = completed.length; const { educationYear, targetCompletionDate, experienceLevel, focusAreas } = currentCareerDetails; let tDate = date || targetCompletionDate; if (tDate !== targetCompletionDate) { const ac = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: tDate } : c); const u = { ...user, activeCareers: ac }; setUser(u); saveUser(u); } const newPhases = await generateRoadmap(career.title, educationYear, tDate, experienceLevel, focusAreas, { type, progressStr: `Completed ${completed.length} phases.`, startingPhaseNumber: lastIdx + 1 }); const final = [...completed, ...newPhases]; setRoadmap(final); saveRoadmap(user.id, career.id, final); setShowAdaptationModal(null); setShowPhaseCompletionModal(false); } catch(e){} finally { setIsAdapting(false); } };
  const handleFinishQuicker = () => { if(!currentCareerDetails || !roadmap) return; const days = calculateRemainingDays(roadmap); const t = new Date(); t.setHours(12,0,0,0); t.setDate(t.getDate() + Math.max(0, days - 1)); const ds = t.toISOString().split('T')[0]; const ac = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: ds } : c); const u = { ...user, activeCareers: ac }; setUser(u); saveUser(u); setShowPhaseCompletionModal(false); };
  
  const daysRemaining = (() => { if(roadmap && roadmap.length > 0 && roadmap.every(p => p.items.every(i => i.status === 'completed'))) return 0; if(!currentCareerDetails?.targetCompletionDate) return 0; const t = new Date(currentCareerDetails.targetCompletionDate); t.setHours(12,0,0,0); const now = new Date(); now.setHours(12,0,0,0); const d = Math.round((t.getTime()-now.getTime())/(1000*60*60*24)); return d >= 0 ? d + 1 : 0; })();
  const pacing = (() => { if(!currentCareerDetails) return {status:'on-track',days:0,message:''} as const; const s = currentCareerDetails.addedAt, e = new Date(currentCareerDetails.targetCompletionDate).getTime(), tot = e-s, el = Date.now()-s; if(tot<=0) return {status:'critical',days:0,message:'Ended'} as const; const er = el/tot, ar = progress/100; if(ar>=er+0.05) return {status:'ahead',days:0,message:'Ahead'} as const; else if(ar<er-0.1) return {status:'behind',days:Math.ceil(((er-ar)*tot)/(1000*60*60*24)),message:'Behind'} as const; return {status:'on-track',days:0,message:'On Track'} as const; })();

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return (
          <div className="space-y-6 pb-24 max-w-5xl mx-auto">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                 <div><h1 className="text-4xl font-bold text-[var(--text-main)] mb-1">Dashboard</h1><p className="text-[var(--text-muted)]">Welcome back, {user.username}.</p></div>
                 <div className="glass-card px-4 py-2 rounded-full flex items-center gap-4">
                     <div className={`flex items-center gap-2 ${user.streak % 100 === 0 && user.streak > 0 ? 'animate-bounce text-orange-400' : 'text-[var(--text-muted)]'}`}><Flame className="h-4 w-4" /><span className="font-bold">{user.streak}</span></div>
                     <div className="w-px h-4 bg-[var(--border-color)]"></div>
                     <div className={`flex items-center gap-2 ${user.xp % 1000 === 0 && user.xp > 0 ? 'animate-pulse text-yellow-400' : 'text-[var(--text-muted)]'}`}><Zap className="h-4 w-4" /><span className="font-bold">{user.xp} XP</span></div>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Daily Quest */}
                 <GlassWidget className="lg:col-span-2 relative overflow-hidden group">
                     <div className={`absolute top-0 right-0 p-20 bg-[var(--primary-500-20)] rounded-full blur-3xl group-hover:bg-[var(--primary-500-50)] transition-colors`}></div>
                     {dailyChallenge ? (
                         !dailyFeedback ? (
                             <>
                                <div className="flex items-center gap-3 mb-4"><div className={`p-2 bg-[var(--primary-500)] rounded-xl text-white shadow-lg shadow-[var(--primary-500-50)]`}><BrainCircuit className="h-5 w-5"/></div><h3 className="text-lg font-bold text-[var(--text-main)]">Daily Quest</h3></div>
                                <h4 className="text-xl font-bold text-[var(--text-main)] mb-6 leading-relaxed">{dailyChallenge.question}</h4>
                                <div className="grid md:grid-cols-2 gap-3 relative z-10">{dailyChallenge.options.map((o,i)=><button key={i} onClick={()=>submitDaily(i)} className="text-left p-4 rounded-xl bg-[var(--bg-main)]/50 border border-[var(--border-color)] hover:bg-[var(--primary-600)] hover:border-[var(--primary-500)] hover:text-white transition-all text-sm font-medium text-[var(--text-main)]">{o}</button>)}</div>
                             </>
                         ) : (
                             <div className={`p-6 rounded-2xl border flex flex-col items-center text-center ${dailyFeedback.isCorrect ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                 {dailyFeedback.isCorrect ? <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2"/> : <X className="h-12 w-12 text-red-400 mb-2"/>}
                                 <h3 className={`text-xl font-bold mb-2 ${dailyFeedback.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>{dailyFeedback.isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                                 <p className="text-[var(--text-main)] mb-4">{dailyFeedback.text}</p>
                                 <button onClick={()=>{setDailyFeedback(null); setDailyChallenge(null)}} className="px-6 py-2 bg-slate-800 rounded-xl text-white font-bold">Done</button>
                             </div>
                         )
                     ) : <div className="h-full flex flex-col items-center justify-center text-center py-10"><CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4"/><h3 className="text-xl font-bold text-[var(--text-main)]">All Caught Up</h3><p className="text-[var(--text-muted)]">Come back tomorrow for more XP.</p></div>}
                 </GlassWidget>

                 {/* Stats */}
                 <div className="grid grid-rows-2 gap-6">
                     <GlassWidget className="flex items-center justify-between group">
                         <div><div className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">Days Left</div><div className="text-4xl font-bold text-[var(--text-main)]">{daysRemaining}</div></div>
                         <div className={`p-4 bg-[var(--primary-500-20)] rounded-2xl text-[var(--primary-400)] group-hover:scale-110 transition-transform`}><Clock className="h-6 w-6"/></div>
                     </GlassWidget>
                     <GlassWidget className="flex items-center justify-between group">
                         <div><div className="text-sm text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">Pacing</div><div className={`text-2xl font-bold ${pacing.status==='behind'?'text-red-400':pacing.status==='ahead'?'text-emerald-400':'text-[var(--text-main)]'}`}>{pacing.message}</div></div>
                         <div className={`p-4 rounded-2xl ${pacing.status==='behind'?'bg-red-500/20 text-red-400':pacing.status==='ahead'?'bg-emerald-500/20 text-emerald-400':'bg-blue-500/20 text-blue-400'} group-hover:scale-110 transition-transform`}><TrendingUp className="h-6 w-6"/></div>
                     </GlassWidget>
                 </div>
                 
                 {/* Sim Arena */}
                 <GlassWidget className="lg:col-span-1 flex flex-col justify-between group cursor-pointer hover:border-[var(--primary-500-50)]" onClick={startSim}>
                     <div><div className="flex items-center gap-2 mb-4"><div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Gamepad2 className="h-5 w-5"/></div><h3 className="font-bold text-[var(--text-main)]">Sim Arena</h3></div><p className="text-[var(--text-muted)] text-sm mb-4">Roleplay real-world scenarios.</p></div>
                     <button className="w-full py-3 bg-[var(--bg-main)]/30 border border-[var(--border-color)] rounded-xl text-[var(--text-main)] font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors flex items-center justify-center gap-2">{isSimLoading ? <RefreshCw className="h-4 w-4 animate-spin"/> : "Enter Simulation"}</button>
                 </GlassWidget>

                 {/* Practice */}
                 <GlassWidget className="lg:col-span-2">
                     <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><BookOpen className="h-5 w-5"/></div><h3 className="font-bold text-[var(--text-main)]">Trivia Practice</h3></div><button onClick={loadTrivia} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><RefreshCw className={`h-4 w-4 ${isTriviaLoading?'animate-spin':''}`}/></button></div>
                     {triviaQuestion && (
                         <div className="space-y-4">
                             <p className="text-[var(--text-main)] font-medium">{triviaQuestion.question}</p>
                             <div className="grid grid-cols-2 gap-3">
                                 {triviaQuestion.options.map((o,i)=><button key={i} onClick={()=>submitTrivia(i)} disabled={!!triviaFeedback} className={`p-3 rounded-xl text-sm border text-left transition-all ${triviaFeedback ? (i===triviaQuestion.correctIndex ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : (triviaFeedback.correctIndex!==i && triviaFeedback.isCorrect===false && i===triviaFeedback.correctIndex ? 'opacity-50' : 'bg-[var(--bg-main)]/30 border-[var(--border-color)] text-[var(--text-muted)]')) : 'bg-[var(--bg-main)]/30 border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)]'}`}>{o}</button>)}
                             </div>
                             {triviaFeedback && <div className="flex justify-between items-center"><span className={triviaFeedback.isCorrect?'text-emerald-400 font-bold':'text-red-400 font-bold'}>{triviaFeedback.isCorrect?'Spot on!':'Missed it.'}</span><button onClick={loadTrivia} className="px-4 py-1.5 bg-blue-600 rounded-lg text-xs font-bold text-white">Next</button></div>}
                         </div>
                     )}
                 </GlassWidget>
             </div>

             {/* News */}
             <div className="mt-8">
                 <div className="flex items-center justify-between mb-4 px-2"><h2 className="text-xl font-bold text-[var(--text-main)]">Industry Intel</h2><button onClick={loadNews} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><RefreshCw className={`h-4 w-4 ${isNewsLoading?'animate-spin':''}`}/></button></div>
                 <div className="grid md:grid-cols-2 gap-4">
                     {news.map((n,i)=><a key={i} href={n.url} target="_blank" rel="noreferrer" className="glass-card p-5 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--primary-500-20)] transition-all group flex flex-col justify-between min-h-[140px]"><div className="mb-4"><div className="flex items-center gap-2 mb-2"><span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-main)]/50 px-2 py-0.5 rounded text-[var(--text-muted)]">{n.source}</span><span className="text-[10px] text-[var(--text-muted)]">{n.date}</span></div><h4 className="font-bold text-[var(--text-main)] group-hover:text-[var(--primary-400)] line-clamp-2">{n.title}</h4></div><div className="text-[var(--primary-400)] text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Read Article <ArrowRight className="h-3 w-3"/></div></a>)}
                 </div>
             </div>
          </div>
      );
      case 'roadmap': return isRoadmapLoading ? <RoadmapLoader /> : <Roadmap roadmap={roadmap} user={user} onSubscribe={handleSubscribe} onUpdateProgress={handleProgress} onReset={handleResetRoadmap} onResetPhase={handleResetPhase} onSwitchCareer={handleSwitchCareer} onEditTargetDate={() => { setPendingTargetDate(currentCareerDetails?.targetCompletionDate || ''); setShowDateEdit(true); }} pacing={pacing} isLoading={isRoadmapLoading} daysRemaining={daysRemaining} searchQuery={globalSearchQuery} />;
      case 'career': return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            <div className="flex justify-between items-center mb-6"><div><h2 className="text-3xl font-bold text-[var(--text-main)]">Career Paths</h2><p className="text-[var(--text-muted)]">Manage your active journeys.</p></div><button onClick={() => onAddCareer()} className={`px-6 py-3 bg-[var(--primary-600)] rounded-xl text-white font-bold hover:scale-105 transition-transform shadow-lg shadow-[var(--primary-500-50)] flex items-center gap-2`}><PlusCircle className="h-5 w-5"/> Add Path</button></div>
            <div className="grid gap-6">
                {user.activeCareers.map(c => (
                    <div key={c.careerId} className={`glass-card p-6 rounded-[2rem] border relative overflow-hidden group ${c.careerId === career.id ? `border-[var(--primary-500-50)]` : 'border-[var(--border-color)]'}`}>
                        {c.careerId === career.id && <div className={`absolute top-0 right-0 px-4 py-1.5 bg-[var(--primary-600)] rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider text-white`}>Active</div>}
                        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-4">{c.title}</h3>
                        <div className="flex flex-wrap gap-4 mb-6">
                            <div className="bg-[var(--bg-main)]/50 px-4 py-2 rounded-xl border border-[var(--border-color)]"><div className="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Target</div><div className="text-[var(--text-main)] font-medium">{c.targetCompletionDate}</div></div>
                            <div className="bg-[var(--bg-main)]/50 px-4 py-2 rounded-xl border border-[var(--border-color)]"><div className="text-xs text-[var(--text-muted)] uppercase font-bold mb-1">Level</div><div className="text-[var(--text-main)] font-medium capitalize">{c.experienceLevel}</div></div>
                        </div>
                        <div className="flex gap-3">
                            {c.careerId !== career.id && <button onClick={() => handleSwitchCareer(c.careerId)} className="px-4 py-2 bg-[var(--bg-main)]/50 hover:bg-[var(--bg-card-hover)] rounded-xl text-sm font-bold text-[var(--text-main)]">Switch to this</button>}
                            <button onClick={() => handleDeleteCareer(c.careerId)} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold flex items-center gap-2"><Trash2 className="h-4 w-4"/> Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
      case 'profile': return (
          <div className="max-w-2xl mx-auto space-y-8 pb-24">
             <div className="text-center"><div className={`w-24 h-24 mx-auto bg-gradient-to-br from-[var(--primary-500)] to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-[0_0_40px_var(--primary-500-20)]`}>{user.username.charAt(0)}</div><h2 className="text-3xl font-bold text-[var(--text-main)]">{user.username}</h2><div className="inline-block px-3 py-1 bg-[var(--bg-main)]/50 rounded-full text-xs font-bold text-[var(--text-muted)] mt-2 uppercase tracking-wider">{user.subscriptionStatus} Member</div></div>
             <GlassWidget><h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-6">Appearance</h3><div className="flex justify-between items-center mb-6"><span className="text-[var(--text-main)] font-medium">Accent Color</span><div className="flex gap-2">{Object.keys(THEME_COLORS).map(c => <button key={c} onClick={()=>handleThemeChange('primaryColor',c)} className={`w-8 h-8 rounded-full border-2 transition-transform ${themeColor===c?'border-[var(--text-main)] scale-110':'border-transparent'}`} style={{backgroundColor: THEME_COLORS[c][500]}}/>)}</div></div><div className="flex justify-between items-center"><span className="text-[var(--text-main)] font-medium">Theme</span><div className="flex bg-black/40 p-1 rounded-lg"><button onClick={()=>handleThemeChange('mode','light')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${user.theme.mode==='light'?'bg-white text-black':'text-slate-400'}`}>Light</button><button onClick={()=>handleThemeChange('mode','dark')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${user.theme.mode!=='light'?'bg-slate-700 text-white':'text-slate-400'}`}>Dark</button></div></div></GlassWidget>
             <GlassWidget><h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-6">Danger Zone</h3><button onClick={handleResetAll} className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold text-left mb-3 flex items-center gap-3"><RotateCcw className="h-5 w-5"/> Reset All Progress</button><button onClick={onLogout} className="w-full p-4 bg-[var(--bg-main)]/50 hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] rounded-xl font-bold text-left flex items-center gap-3"><LogOut className="h-5 w-5"/> Log Out</button></GlassWidget>
          </div>
      );
    }
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${user.theme?.mode === 'light' ? 'light-theme' : ''}`}>
      {/* Dynamic Theme Styles */}
      <style>{`
        :root {
          --primary-400: ${colors[400]};
          --primary-500: ${colors[500]};
          --primary-600: ${colors[600]};
          --primary-500-20: ${colors[500]}33;
          --primary-500-50: ${colors[500]}80;
        }
      `}</style>

      {/* Floating Header */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl glass-card rounded-full p-2 flex items-center justify-between shadow-2xl border border-[var(--border-color)]">
          <div className="flex-1 relative mx-2">
              <input type="text" placeholder="Search..." className="w-full bg-transparent text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] outline-none pl-8" value={globalSearchQuery} onChange={e=>setGlobalSearchQuery(e.target.value)} />
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
              {globalSearchQuery && <button onClick={()=>setGlobalSearchQuery('')} className="absolute right-0 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-[var(--text-muted)]"/></button>}
          </div>
          <div className="flex items-center gap-2 pr-2">
               <div className="w-px h-6 bg-[var(--border-color)]"></div>
               <div className={`p-2 rounded-full ${user.streak > 0 ? 'bg-orange-500/20 text-orange-400' : 'text-[var(--text-muted)]'}`}><Flame className="h-4 w-4"/></div>
               <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary-500)] to-purple-500 flex items-center justify-center text-white text-xs font-bold">{user.username.charAt(0)}</div>
          </div>
      </div>

      {showCelebration && <CelebrationModal onClose={()=>setShowCelebration(false)}/>}
      {showPhaseCompletionModal && <PhaseCompletionModal onClose={()=>setShowPhaseCompletionModal(false)} onFinishQuicker={handleFinishQuicker} onIncreaseChallenge={()=>handleAdaptation('increase_difficulty_same_time')} summary={phaseSummary} isLoadingSummary={isSummaryLoading}/>}
      {showSimulationModal && activeSimulation && <SimulationModal simulation={activeSimulation} onClose={()=>setShowSimulationModal(false)} onComplete={finishSim}/>}
      {showDateEdit && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"><div className="glass-card p-8 rounded-[2rem] max-w-sm w-full border-[var(--border-color)]"><h3 className="text-xl font-bold text-[var(--text-main)] mb-4">Update Target</h3><input type="date" className="w-full p-4 rounded-xl bg-[var(--bg-main)]/50 border border-[var(--border-color)] text-[var(--text-main)] mb-6 color-scheme-dark" value={pendingTargetDate} onChange={e => setPendingTargetDate(e.target.value)} /><div className="flex gap-3"><button onClick={()=>setShowDateEdit(false)} className="flex-1 py-3 bg-[var(--bg-main)]/50 rounded-xl font-bold text-[var(--text-muted)]">Cancel</button><button onClick={()=>{setShowDateEdit(false); handleAdaptation(null, pendingTargetDate)}} className={`flex-1 py-3 bg-[var(--primary-600)] rounded-xl font-bold text-white`}>Update</button></div></div></div>}
      
      <div className="pt-28 px-4 md:px-8 pb-32 max-w-7xl mx-auto">{renderContent()}</div>
      
      <FloatingDock activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="fixed bottom-24 right-6 z-40">{!isChatOpen ? <button onClick={()=>setIsChatOpen(true)} className={`w-14 h-14 rounded-full bg-[var(--primary-600)] text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform`}><MessageCircle className="h-6 w-6"/></button> : <ChatBot context={career.title} onClose={()=>setIsChatOpen(false)}/>}</div>
      
      <style>{`
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); filter: blur(10px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      `}</style>
    </div>
  );
};
