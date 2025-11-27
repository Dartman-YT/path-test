
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, CareerOption, RoadmapPhase, NewsItem, RoadmapItem, DailyChallenge, Simulation, TriviaQuestion } from '../types';
import { Roadmap } from './Roadmap';
import { fetchTechNews, generateRoadmap, calculateRemainingDays, generateDailyChallenge, generateSimulation, getChatResponse, generatePhaseSummary, generateTriviaQuestion } from '../services/gemini';
import { saveRoadmap, saveUser, getRoadmap, getCareerData, saveCareerData, setCurrentUser } from '../services/store';
import { Home, Map, Briefcase, User, LogOut, Settings, TrendingUp, PlusCircle, ChevronDown, ChevronUp, Clock, Trophy, AlertCircle, Target, BookOpen, Trash2, RotateCcw, PartyPopper, ArrowRight, Zap, Calendar, ExternalLink, X, Search, Sparkles, Pencil, CheckCircle2, RefreshCw, Palette, Moon, Sun, Flame, BrainCircuit, Gamepad2, MessageCircle, Send, Bot, Unplug, Book } from 'lucide-react';

const CelebrationModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
    <div className="bg-theme-card border border-emerald-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
        <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
            <PartyPopper className="h-10 w-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2>
        <p className="text-slate-400 mb-8">You've completed this roadmap phase. Keep up the momentum!</p>
        <button onClick={onClose} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors">
            Continue Journey
        </button>
    </div>
  </div>
);

const MilestoneModal = ({ type, value, onClose }: { type: 'streak' | 'xp', value: number, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-theme-card border border-yellow-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/40 animate-bounce">
              <Trophy className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">{type === 'streak' ? 'Streak Master!' : 'Legendary XP!'}</h2>
          <p className="text-slate-300 mb-2 text-lg font-medium">You reached {value} {type === 'streak' ? 'days' : 'XP'}!</p>
          <p className="text-slate-500 mb-8 text-sm">An incredible milestone in your career journey.</p>
          <button onClick={onClose} className="w-full py-3 bg-yellow-600 text-white font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-lg">
              Collect Reward
          </button>
      </div>
    </div>
);

const PhaseCompletionModal = ({ onClose, onFinishQuicker, onIncreaseChallenge, summary, isLoadingSummary }: { onClose: () => void, onFinishQuicker: () => void, onIncreaseChallenge: () => void, summary?: string, isLoadingSummary: boolean }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-theme-card border border-theme rounded-3xl p-8 max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">Phase Complete!</h2>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Phase Summary</h3>
                {isLoadingSummary ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing your achievements...
                    </div>
                ) : (
                    <p className="text-slate-300 text-sm leading-relaxed">{summary || "Great work completing this phase!"}</p>
                )}
            </div>

            <p className="text-slate-400 mb-4 text-sm">You are making great progress. Do you want to adjust your pace?</p>
            <div className="space-y-3">
                 <button onClick={onClose} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all text-left">
                    <div className="font-bold text-white">Keep Current Pace</div>
                    <div className="text-xs text-slate-400">Continue as planned.</div>
                </button>
                <button onClick={onFinishQuicker} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all text-left">
                    <div className="font-bold text-white">Finish Quicker</div>
                    <div className="text-xs text-slate-400">Recalculate deadline based on velocity.</div>
                </button>
                <button onClick={onIncreaseChallenge} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-purple-500 transition-all text-left">
                    <div className="font-bold text-white">Increase Challenge</div>
                    <div className="text-xs text-slate-400">Add advanced topics within same timeframe.</div>
                </button>
            </div>
             <button onClick={onClose} className="mt-6 text-slate-500 text-sm hover:text-white w-full text-center">Dismiss</button>
        </div>
    </div>
);

const DateStrategyModal = ({ type, onAdapt, onCancel }: { type: 'extension' | 'shortening' | null, onAdapt: (type: string) => void, onCancel: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-theme-card border border-theme rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">
                {type === 'extension' ? 'Extending Deadline' : 'Shortening Deadline'}
            </h2>
            <p className="text-slate-400 mb-6">How should we adjust the roadmap content?</p>
            
            <div className="space-y-3">
                {type === 'extension' ? (
                    <>
                         <button onClick={() => onAdapt('redistribute')} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all text-left">
                            <div className="font-bold text-white">Relax the Pace</div>
                            <div className="text-xs text-slate-400">Spread existing tasks over more time.</div>
                        </button>
                        <button onClick={() => onAdapt('append_content')} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all text-left">
                            <div className="font-bold text-white">Add More Content</div>
                            <div className="text-xs text-slate-400">Keep pace, but add advanced topics.</div>
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onAdapt('compress_schedule')} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all text-left">
                            <div className="font-bold text-white">Compress Schedule</div>
                            <div className="text-xs text-slate-400">Keep all content, increase daily load.</div>
                        </button>
                         <button onClick={() => onAdapt('simplify_schedule')} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all text-left">
                            <div className="font-bold text-white">Simplify Content</div>
                            <div className="text-xs text-slate-400">Remove non-essential items.</div>
                        </button>
                    </>
                )}
            </div>
            <button onClick={onCancel} className="mt-6 w-full py-3 text-slate-400 hover:text-white font-medium">Cancel</button>
        </div>
    </div>
);

const SimulationModal = ({ simulation, onClose, onComplete }: { simulation: Simulation, onClose: () => void, onComplete: (score: number) => void }) => {
    const [result, setResult] = useState<{outcome: string, score: number} | null>(null);

    const handleOptionSelect = (opt: {outcome: string, score: number}) => {
        setResult({ outcome: opt.outcome, score: opt.score });
    };

    const handleFinish = () => {
        if (result) onComplete(result.score);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-theme-card border border-theme rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">Roleplay</span>
                            <span className="text-theme-muted text-sm">{simulation.role}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-theme-main">{simulation.title}</h2>
                    </div>
                    {!result && <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><X className="h-5 w-5"/></button>}
                </div>
                
                <div className="bg-theme-main p-6 rounded-2xl border border-theme mb-8 text-theme-main leading-relaxed">
                    {simulation.scenario}
                </div>
                
                {!result ? (
                    <div className="space-y-3">
                        {simulation.options.map((opt, i) => (
                            <button 
                                key={i} 
                                onClick={() => handleOptionSelect(opt)}
                                className="w-full text-left p-4 rounded-xl border border-theme bg-theme-card hover:border-indigo-500 hover:bg-indigo-900/10 transition-all group"
                            >
                                <div className="font-medium text-theme-main group-hover:text-indigo-300">{opt.text}</div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700 animate-fade-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500"><Trophy className="h-5 w-5" /></div>
                            <h3 className="text-xl font-bold text-white">Scenario Complete</h3>
                        </div>
                        <p className="text-slate-300 mb-6 leading-relaxed">{result.outcome}</p>
                        <div className="flex items-center justify-between">
                             <div className="text-emerald-400 font-bold">Score: +{result.score} XP</div>
                             <button onClick={handleFinish} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
                                 Collect XP & Finish
                             </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ChatBot = ({ context, onClose }: { context: string, onClose: () => void }) => {
    const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([{ role: 'bot', text: `Hi! I'm your PathFinder AI Assistant. How can I help you with your ${context} journey today?` }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsLoading(true);

        const lowerMsg = userMsg.toLowerCase();
        let botResponse = '';

        if (lowerMsg.includes('bug') || lowerMsg.includes('issue') || lowerMsg.includes('error')) {
            botResponse = "I've logged this issue with our engineering team (Ticket #PF-9281). We'll resolve it as soon as possible. Thank you for reporting!";
        } else if (lowerMsg.includes('support') || lowerMsg.includes('contact') || lowerMsg.includes('customer care')) {
            botResponse = "I'm connecting you to a customer support agent. Please check your email for a ticket confirmation. In the meantime, feel free to ask me anything else!";
        } else {
            try {
                botResponse = await getChatResponse(userMsg, context);
            } catch (e) {
                botResponse = "I'm having trouble connecting right now. Please try again.";
            }
        }

        setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
        setIsLoading(false);
    };

    return (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-theme-card border border-theme rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in max-h-[500px]">
            <div className="bg-indigo-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Bot className="h-5 w-5" />
                    <span className="font-bold">AI Assistant</span>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-theme-main h-[350px]">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-theme-card border border-theme text-theme-main rounded-bl-none'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex justify-start"><div className="bg-theme-card border border-theme p-3 rounded-xl rounded-bl-none"><div className="flex gap-1"><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div></div></div></div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-3 bg-theme-card border-t border-theme flex gap-2">
                <input 
                    type="text" 
                    placeholder="Ask about career or report bugs..."
                    className="flex-1 bg-theme-main border border-theme rounded-xl px-3 py-2 text-sm text-theme-main focus:border-indigo-500 outline-none"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </div>
        </div>
    );
};

export const RoadmapLoader = ({ primaryColor }: { primaryColor: string }) => (
    <div className="flex flex-col items-center justify-center p-12 space-y-8 animate-fade-in">
        <div className="relative w-24 h-24">
            <div className={`absolute inset-0 border-4 border-${primaryColor}-500/20 rounded-full`}></div>
            <div className={`absolute inset-0 border-4 border-${primaryColor}-500 border-t-transparent rounded-full animate-spin`}></div>
            <div className={`absolute inset-0 flex items-center justify-center`}>
                <div className={`w-3 h-3 bg-${primaryColor}-400 rounded-full animate-pulse`}></div>
            </div>
            {/* Orbiting dots */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-${primaryColor}-300 rounded-full animate-ping`}></div>
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-theme-main">Generating Path...</h3>
            <p className="text-sm text-theme-muted">Aligning milestones with your target date.</p>
        </div>
    </div>
);

interface DashboardProps {
  user: UserProfile;
  career: CareerOption;
  roadmap: RoadmapPhase[] | null;
  onLogout: () => void;
  setRoadmap: (r: RoadmapPhase[] | null) => void;
  setUser: (u: UserProfile) => void;
  setCareer: (c: CareerOption | null) => void;
  onAddCareer: (mode?: 'analysis' | 'search') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, career, roadmap, onLogout, setRoadmap, setUser, setCareer, onAddCareer 
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'roadmap' | 'career' | 'profile'>('home');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [expandedNewsIndex, setExpandedNewsIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [showCareerMenu, setShowCareerMenu] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isRoadmapLoading, setIsRoadmapLoading] = useState(false);
  
  // Search State
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Adaptation State
  const [showAdaptationModal, setShowAdaptationModal] = useState<'early' | 'late' | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptationMessage, setAdaptationMessage] = useState('');

  const [showPhaseCompletionModal, setShowPhaseCompletionModal] = useState(false);
  const [justCompletedPhaseIndex, setJustCompletedPhaseIndex] = useState<number | null>(null);
  const [phaseSummary, setPhaseSummary] = useState<string | undefined>(undefined);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [showDateEdit, setShowDateEdit] = useState(false);
  const [pendingTargetDate, setPendingTargetDate] = useState('');
  const [showDateStrategyModal, setShowDateStrategyModal] = useState(false);
  const [dateStrategyType, setDateStrategyType] = useState<'extension' | 'shortening' | null>(null);

  // Gamification State
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [isDailyChallengeLoading, setIsDailyChallengeLoading] = useState(false);
  const [dailyFeedback, setDailyFeedback] = useState<{isCorrect: boolean, text: string} | null>(null);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState<Simulation | null>(null);
  const [isSimLoading, setIsSimLoading] = useState(false);
  
  // Practice Quiz
  const [triviaQuestion, setTriviaQuestion] = useState<TriviaQuestion | null>(null);
  const [triviaFeedback, setTriviaFeedback] = useState<{isCorrect: boolean, correctIndex: number} | null>(null);
  const [isTriviaLoading, setIsTriviaLoading] = useState(false);

  // Rewards & Chat
  const [milestoneEvent, setMilestoneEvent] = useState<{type: 'streak' | 'xp', value: number} | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Theme Helpers
  const primaryColor = user.theme?.primaryColor || 'indigo';
  const isDark = user.theme?.mode !== 'light';

  const currentCareerDetails = user.activeCareers.find(c => c.careerId === career.id);

  useEffect(() => {
    if (roadmap) {
      let total = 0;
      let completed = 0;
      roadmap.forEach(phase => {
        phase.items.forEach(item => {
          total++;
          if (item.status === 'completed') completed++;
        });
      });
      const calculatedProgress = total === 0 ? 0 : Math.round((completed / total) * 100);
      if (calculatedProgress === 100 && progress !== 100 && progress !== 0) setShowCelebration(true);
      setProgress(calculatedProgress);
    } else {
        setProgress(0);
    }
  }, [roadmap]);

  const loadNews = useCallback(async () => {
    if (!career?.title) return;
    setIsNewsLoading(true);
    setNews([]); 
    setExpandedNewsIndex(null);
    try {
      const newsItems = await fetchTechNews(career.title);
      setNews(newsItems);
    } catch (e) {
      console.error("Failed to load news", e);
    } finally {
      setIsNewsLoading(false);
    }
  }, [career.id, career.title]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Load Daily Challenge if needed
  useEffect(() => {
      const today = new Date().toISOString().split('T')[0];
      const careerLastChallenge = currentCareerDetails?.lastDailyChallenge;
      
      // CRITICAL FIX: If we are currently showing feedback, do NOT reset the challenge even if date matches
      // This prevents the card from "collapsing" or disappearing while the user is reading the explanation.
      if (dailyFeedback) return;

      if (careerLastChallenge !== today && !dailyChallenge && !isDailyChallengeLoading && career) {
          setIsDailyChallengeLoading(true);
          setDailyFeedback(null); 
          generateDailyChallenge(career.title, currentCareerDetails?.experienceLevel || 'beginner')
            .then(res => setDailyChallenge(res))
            .finally(() => setIsDailyChallengeLoading(false));
      } else if (careerLastChallenge === today) {
          // Only clear if we are NOT currently interacting with it
          setDailyChallenge(null); 
      }
  }, [currentCareerDetails, career, user.activeCareers, dailyFeedback]); 

  const loadTrivia = async () => {
      setIsTriviaLoading(true);
      setTriviaQuestion(null);
      setTriviaFeedback(null);
      try {
          const q = await generateTriviaQuestion(career.title);
          setTriviaQuestion(q);
      } catch(e) { console.error(e); } finally { setIsTriviaLoading(false); }
  };

  // Load Initial Trivia
  useEffect(() => {
      if (!triviaQuestion && !isTriviaLoading && career) {
          loadTrivia();
      }
  }, [career]);

  const submitTrivia = (idx: number) => {
      if (!triviaQuestion) return;
      setTriviaFeedback({ isCorrect: idx === triviaQuestion.correctIndex, correctIndex: triviaQuestion.correctIndex });
  };

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    const updatedUser = { ...user, subscriptionStatus: plan };
    setUser(updatedUser);
    saveUser(updatedUser);
  };

  const handleThemeChange = (key: 'mode' | 'primaryColor', value: string) => {
     const newTheme = { ...user.theme, [key]: value };
     if (!newTheme.mode) newTheme.mode = 'dark';
     if (!newTheme.primaryColor) newTheme.primaryColor = 'indigo';

     const updatedUser = { ...user, theme: newTheme };
     setUser(updatedUser);
     saveUser(updatedUser);
  };

  const handleProgress = async (itemId: string) => {
    if (!roadmap) return;
    const now = Date.now();
    let phaseIndexToCheck = -1;
    roadmap.forEach((p, idx) => {
        if (p.items.find(i => i.id === itemId)) phaseIndexToCheck = idx;
    });
    
    // Check if phase was already completed before this update
    const wasPhaseCompleted = phaseIndexToCheck !== -1 && roadmap[phaseIndexToCheck].items.every(i => i.status === 'completed');

    const newRoadmap = roadmap.map(phase => ({
      ...phase,
      items: phase.items.map(item => 
        item.id === itemId ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed', completedAt: item.status === 'completed' ? undefined : now } as RoadmapItem : item
      )
    }));
    
    setRoadmap(newRoadmap);
    saveRoadmap(user.id, career.id, newRoadmap);

    if (phaseIndexToCheck !== -1) {
        const isNowCompleted = newRoadmap[phaseIndexToCheck].items.every(i => i.status === 'completed');
        const isAllCompleted = newRoadmap.every(p => p.items.every(i => i.status === 'completed'));
        
        // Trigger if completed just now, wasn't complete before, and it's NOT the final completion (which shows CelebrationModal)
        if (isNowCompleted && !wasPhaseCompleted && !isAllCompleted) {
            setJustCompletedPhaseIndex(phaseIndexToCheck);
            setPhaseSummary(undefined); // Clear previous
            setIsSummaryLoading(true);
            setShowPhaseCompletionModal(true);

            // Fetch AI Summary
            const completedPhase = newRoadmap[phaseIndexToCheck];
            try {
                const summary = await generatePhaseSummary(completedPhase.phaseName, completedPhase.items);
                setPhaseSummary(summary);
                
                // Save summary to roadmap for persistence
                const updatedRoadmapWithSummary = newRoadmap.map((p, idx) => 
                    idx === phaseIndexToCheck ? { ...p, completionSummary: summary } : p
                );
                setRoadmap(updatedRoadmapWithSummary);
                saveRoadmap(user.id, career.id, updatedRoadmapWithSummary);
            } catch (e) {
                console.error("Summary generation failed", e);
                setPhaseSummary("Great job completing this phase!");
            } finally {
                setIsSummaryLoading(false);
            }
        }
    }
  };

  const handleResetPhase = (phaseIndex: number) => {
      if (!roadmap) return;
      const newRoadmap = roadmap.map((phase, idx) => idx === phaseIndex ? { ...phase, completionSummary: undefined, items: phase.items.map(item => ({ ...item, status: 'pending' as const, completedAt: undefined }))} : phase);
      setRoadmap(newRoadmap);
      saveRoadmap(user.id, career.id, newRoadmap);
  };

  const handleResetRoadmap = () => {
      if (!roadmap) return;
      const resetMap = roadmap.map(phase => ({ ...phase, completionSummary: undefined, items: phase.items.map(item => ({ ...item, status: 'pending' as const, completedAt: undefined } as RoadmapItem))}));
      setRoadmap(resetMap);
      saveRoadmap(user.id, career.id, resetMap);
  };

  const handleResetAll = () => {
      if (window.confirm("Are you sure you want to reset all progress for all careers?")) {
          user.activeCareers.forEach(c => {
             const r = getRoadmap(user.id, c.careerId);
             if (r) {
                 const resetR = r.map(p => ({...p, completionSummary: undefined, items: p.items.map(i => ({...i, status: 'pending', completedAt: undefined} as RoadmapItem))}));
                 saveRoadmap(user.id, c.careerId, resetR);
             }
          });
          handleResetRoadmap();
      }
  };

  const handleAdaptation = async (type: any, customTargetDate?: string) => {
      if (!currentCareerDetails || !roadmap) return;
      setIsAdapting(true);
      try {
          const completedPhases = roadmap.filter(p => p.items.every(i => i.status === 'completed'));
          const lastCompletedPhaseIndex = completedPhases.length;
          const { educationYear, targetCompletionDate, experienceLevel, focusAreas } = currentCareerDetails;
          let targetDateToUse = customTargetDate || targetCompletionDate;

          if (targetDateToUse !== targetCompletionDate) {
              const updatedCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: targetDateToUse } : c);
              const u = { ...user, activeCareers: updatedCareers };
              setUser(u);
              saveUser(u);
          }
          const contextStr = `User has completed ${completedPhases.length} phases. Proceed to generate the REMAINING phases starting from Phase ${lastCompletedPhaseIndex + 1}.`;
          const newPhases = await generateRoadmap(career.title, educationYear, targetDateToUse, experienceLevel, focusAreas, { type, progressStr: contextStr, startingPhaseNumber: lastCompletedPhaseIndex + 1 });
          const finalMap = [...completedPhases, ...newPhases];

          setRoadmap(finalMap);
          saveRoadmap(user.id, career.id, finalMap);
          setShowAdaptationModal(null); setShowDateStrategyModal(false); setShowDateEdit(false); setShowPhaseCompletionModal(false);
      } catch (e) { console.error("Adaptation failed", e); } finally { setIsAdapting(false); }
  };
  
  const handleFinishQuicker = () => {
      if (!currentCareerDetails || !roadmap) return;
      const daysNeeded = calculateRemainingDays(roadmap);
      const newTarget = new Date(); newTarget.setHours(12, 0, 0, 0);
      const offset = Math.max(0, daysNeeded - 1);
      newTarget.setDate(newTarget.getDate() + offset);
      const newDateStr = newTarget.toISOString().split('T')[0];

      const updatedCareers = user.activeCareers.map(c => c.careerId === career.id ? { ...c, targetCompletionDate: newDateStr } : c);
      const u = { ...user, activeCareers: updatedCareers };
      setUser(u); saveUser(u); setShowPhaseCompletionModal(false);
  };

  const initiateDateUpdate = () => {
      if (!pendingTargetDate || !currentCareerDetails) return;
      const oldDate = new Date(currentCareerDetails.targetCompletionDate).getTime();
      const newDate = new Date(pendingTargetDate).getTime();
      setShowDateEdit(false); setShowDateStrategyModal(true);
      setDateStrategyType(newDate > oldDate ? 'extension' : 'shortening');
  };

  const handleSwitchCareer = (careerId: string) => {
    setIsRoadmapLoading(true); setShowCareerMenu(false); setRoadmap(null); setNews([]); 
    setTimeout(() => {
        const savedCareer = getCareerData(user.id, careerId);
        const savedRoadmap = getRoadmap(user.id, careerId);
        if (savedCareer) {
          setCareer(savedCareer); setRoadmap(savedRoadmap || []); 
          const updatedUser = { ...user, currentCareerId: careerId }; setUser(updatedUser); saveUser(updatedUser);
        }
        setIsRoadmapLoading(false); setActiveTab('home'); 
    }, 1500); 
  };
  
  const handleDeleteCareer = (careerId: string) => {
      const updatedActiveCareers = user.activeCareers.filter(c => c.careerId !== careerId);
      let nextCareerId = user.currentCareerId; let nextCareerOption = null; let nextRoadmap = null;
      if (careerId === user.currentCareerId) {
          if (updatedActiveCareers.length > 0) {
              nextCareerId = updatedActiveCareers[0].careerId;
              nextCareerOption = getCareerData(user.id, nextCareerId);
              nextRoadmap = getRoadmap(user.id, nextCareerId);
          } else { nextCareerId = undefined; }
      } else { nextCareerId = user.currentCareerId; nextCareerOption = career; nextRoadmap = roadmap; }
      const updatedUser = { ...user, activeCareers: updatedActiveCareers, currentCareerId: nextCareerId };
      localStorage.removeItem(`pathfinder_career_data_${user.id}_${careerId}`);
      localStorage.removeItem(`pathfinder_roadmap_${user.id}_${careerId}`);
      setUser(updatedUser); saveUser(updatedUser);
      if (updatedActiveCareers.length === 0) { setCareer(null); setRoadmap(null); onAddCareer(); } 
      else if (careerId === user.currentCareerId) { setCareer(nextCareerOption); setRoadmap(nextRoadmap || []); }
  };

  const submitDailyChallenge = (optionIndex: number) => {
      if (!dailyChallenge || !currentCareerDetails) return;
      const isCorrect = optionIndex === dailyChallenge.correctAnswer;
      const today = new Date().toISOString().split('T')[0];
      
      const isFirstDailyGlobal = user.lastDailyChallenge !== today;

      let newXp = user.xp || 0;
      let newStreak = user.streak || 0;

      if (isFirstDailyGlobal) {
        newXp = isCorrect ? (user.xp || 0) + 10 : (user.xp || 0);
        newStreak = isCorrect ? (user.streak || 0) + 1 : (user.streak || 0);
      }
      
      const updatedActiveCareers = user.activeCareers.map(c => 
          c.careerId === career.id ? { ...c, lastDailyChallenge: today } : c
      );

      const u = { ...user, xp: newXp, streak: newStreak, lastDailyChallenge: today, activeCareers: updatedActiveCareers };
      setUser(u);
      saveUser(u);
      
      if (isFirstDailyGlobal && isCorrect) {
          if (newStreak > 0 && newStreak % 100 === 0) setMilestoneEvent({ type: 'streak', value: newStreak });
          else if (newXp > 0 && newXp % 1000 === 0) setMilestoneEvent({ type: 'xp', value: newXp });
      }

      let feedbackText = dailyChallenge.explanation;
      if (!isFirstDailyGlobal) {
          feedbackText += " (XP already collected today.)";
      }

      setDailyFeedback({ isCorrect, text: feedbackText });
  };

  const startSimulation = async () => {
      setIsSimLoading(true);
      try {
          const sim = await generateSimulation(career.title);
          setActiveSimulation(sim);
          setShowSimulationModal(true);
      } catch (e) { console.error(e); } finally { setIsSimLoading(false); }
  };

  const finishSimulation = (score: number) => {
      setShowSimulationModal(false);
      const newXp = (user.xp || 0) + score;
      const u = { ...user, xp: newXp };
      setUser(u); saveUser(u);
      if (newXp > 0 && newXp % 1000 === 0) setMilestoneEvent({ type: 'xp', value: newXp });
      alert(`Simulation Complete! You earned ${score} XP.`);
  };

  const getDaysRemaining = () => {
      if (roadmap && roadmap.length > 0 && roadmap.every(phase => phase.items.every(item => item.status === 'completed'))) return 0;
      if (!currentCareerDetails?.targetCompletionDate) return 0;
      const targetDate = new Date(currentCareerDetails.targetCompletionDate); targetDate.setHours(12,0,0,0);
      const today = new Date(); today.setHours(12,0,0,0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays + 1 : 0;
  }
  const daysRemaining = getDaysRemaining();

  const getPacingStatus = () => {
      if (!currentCareerDetails) return { status: 'on-track', days: 0, message: '' } as const;
      const start = currentCareerDetails.addedAt;
      const end = new Date(currentCareerDetails.targetCompletionDate).getTime();
      const totalDuration = end - start;
      const elapsed = Date.now() - start;
      if (totalDuration <= 0) return { status: 'critical', days: 0, message: 'Target date passed' } as const;
      const expectedRatio = elapsed / totalDuration;
      const actualRatio = progress / 100;
      if (actualRatio >= expectedRatio + 0.05) return { status: 'ahead', days: 0, message: 'Ahead of schedule' } as const;
      else if (actualRatio < expectedRatio - 0.1) {
          const lagDays = Math.ceil(((expectedRatio - actualRatio) * totalDuration) / (1000 * 60 * 60 * 24));
          return { status: 'behind', days: lagDays, message: `${lagDays} days behind` } as const;
      }
      return { status: 'on-track', days: 0, message: 'On track' } as const;
  };
  const pacing = getPacingStatus();

  // Filtered News based on Search
  const visibleNews = globalSearchQuery 
    ? news.filter(n => n.title.toLowerCase().includes(globalSearchQuery.toLowerCase()) || n.summary.toLowerCase().includes(globalSearchQuery.toLowerCase()))
    : news;

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-theme-main">Dashboard</h1>
                <p className="text-theme-muted mt-1">Track your journey to becoming a <span className={`text-${primaryColor}-400 font-semibold`}>{career.title}</span>.</p>
              </div>
              <div className="relative z-30 flex items-center gap-4">
                 <div className={`flex items-center gap-2 px-3 py-1.5 bg-theme-card border border-theme rounded-xl ${(user.streak > 0 && user.streak % 100 === 0) ? 'animate-bounce border-orange-500 shadow-orange-500/20 shadow' : ''}`}>
                    <Flame className={`h-4 w-4 ${user.streak >= 100 ? 'text-orange-500 fill-orange-500' : 'text-slate-400'}`} />
                    <span className="font-bold text-theme-main">{user.streak || 0}</span>
                 </div>
                 <div className={`flex items-center gap-2 px-3 py-1.5 bg-theme-card border border-theme rounded-xl ${(user.xp > 0 && user.xp % 1000 === 0) ? 'animate-pulse border-yellow-500 shadow-yellow-500/20 shadow' : ''}`}>
                    <Zap className={`h-4 w-4 ${user.xp >= 1000 ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} />
                    <span className="font-bold text-theme-main">{user.xp || 0} XP</span>
                 </div>
                 <button onClick={() => setShowCareerMenu(!showCareerMenu)} className="flex items-center gap-2 bg-theme-card text-theme-muted px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium min-w-[200px] border border-theme justify-between">
                   <div className="flex items-center gap-2 truncate">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                      <span className="truncate">{career.title}</span>
                   </div>
                   <ChevronDown className="h-4 w-4 shrink-0" />
                 </button>
                 {showCareerMenu && (
                   <div className="absolute top-full right-0 mt-2 w-64 bg-theme-card border border-theme rounded-xl shadow-2xl overflow-hidden z-50">
                     <div className="p-2 space-y-1">
                       {user.activeCareers.map(c => (
                         <button key={c.careerId} onClick={() => handleSwitchCareer(c.careerId)} className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${c.careerId === career.id ? `bg-${primaryColor}-600 text-white` : 'text-theme-muted hover:bg-slate-800'}`}>
                            <span className="truncate">{c.title}</span> {c.careerId === career.id && <Target className="h-3 w-3 shrink-0" />}
                         </button>
                       ))}
                       <button onClick={() => onAddCareer()} className={`w-full text-left px-3 py-2 rounded-lg text-sm text-${primaryColor}-400 hover:bg-slate-800 flex items-center gap-2 font-medium`}>
                          <PlusCircle className="h-4 w-4" /> Add New Path
                       </button>
                     </div>
                   </div>
                 )}
              </div>
            </header>

            {/* Daily Challenge Card */}
            {dailyChallenge && (
                <div className={`bg-gradient-to-r from-${primaryColor}-900/30 to-theme-card border border-${primaryColor}-500/30 rounded-3xl p-6 relative overflow-hidden shadow-lg animate-fade-in min-h-[240px]`}>
                    <div className="flex items-start gap-4 mb-4 relative z-10">
                        <div className={`p-3 bg-${primaryColor}-500 rounded-xl text-white shadow-lg shadow-${primaryColor}-500/40`}><BrainCircuit className="h-6 w-6" /></div>
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-theme-muted mb-1">Daily Quest</div>
                            <h3 className="text-lg font-bold text-theme-main leading-tight">{dailyChallenge.question}</h3>
                        </div>
                    </div>
                    
                    {!dailyFeedback ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                            {dailyChallenge.options.map((opt, i) => (
                                <button key={i} onClick={() => submitDailyChallenge(i)} className="text-left p-3 rounded-xl bg-theme-main/50 border border-theme hover:bg-theme-main hover:border-indigo-500 transition-all text-sm font-medium text-theme-muted hover:text-theme-main">
                                    {opt}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className={`relative z-10 p-4 rounded-xl border ${dailyFeedback.isCorrect ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-red-900/20 border-red-500/50'} animate-fade-in`}>
                            <div className="flex items-center gap-2 mb-2 font-bold">
                                {dailyFeedback.isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <X className="h-5 w-5 text-red-400" />}
                                <span className={dailyFeedback.isCorrect ? 'text-emerald-400' : 'text-red-400'}>
                                    {dailyFeedback.isCorrect ? 'Correct!' : 'Incorrect'}
                                </span>
                            </div>
                            <p className="text-sm text-theme-main mb-4">{dailyFeedback.text}</p>
                            {!dailyFeedback.isCorrect && <p className="text-xs text-theme-muted mb-4">Correct Answer: {dailyChallenge.options[dailyChallenge.correctAnswer]}</p>}
                            <button onClick={() => { setDailyFeedback(null); setDailyChallenge(null); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors">
                                Complete
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Practice Trivia Card */}
            <div className={`bg-theme-card border border-theme rounded-3xl p-6 relative overflow-hidden shadow-lg min-h-[220px] transition-all duration-300`}>
                 <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Book className="h-5 w-5" /></div>
                         <h3 className="text-lg font-bold text-theme-main">Practice Mode</h3>
                     </div>
                 </div>
                 
                 {(isTriviaLoading && !triviaQuestion) ? (
                     <div className="space-y-3">
                         <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse"></div>
                         <div className="h-10 w-full bg-slate-800 rounded-xl animate-pulse"></div>
                     </div>
                 ) : triviaQuestion ? (
                     <div className="space-y-4">
                         <p className="text-sm font-medium text-theme-main">{triviaQuestion.question}</p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                             {triviaQuestion.options.map((opt, i) => (
                                 <button 
                                    key={i} 
                                    onClick={() => submitTrivia(i)}
                                    disabled={!!triviaFeedback}
                                    className={`text-left p-3 rounded-xl border text-sm transition-all ${
                                        triviaFeedback 
                                            ? i === triviaQuestion.correctIndex 
                                                ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400'
                                                : triviaFeedback.correctIndex !== i && triviaFeedback.isCorrect === false && i === triviaFeedback.correctIndex 
                                                    ? 'opacity-50' 
                                                    : 'opacity-50 border-theme'
                                            : 'bg-theme-main/50 border-theme hover:bg-slate-800 hover:border-blue-500'
                                    }`}
                                 >
                                     {opt}
                                 </button>
                             ))}
                         </div>
                         <div className="flex justify-between items-center mt-2 h-8">
                            {triviaFeedback && (
                                <div className={`text-xs font-bold ${triviaFeedback.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {triviaFeedback.isCorrect ? "Spot on!" : "Not quite. Try another!"}
                                </div>
                            )}
                            <div className="flex gap-2 ml-auto">
                                {!triviaFeedback && (
                                     <button onClick={loadTrivia} disabled={isTriviaLoading} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-theme-muted rounded-lg text-xs font-bold transition-colors">
                                        Skip
                                    </button>
                                )}
                                {triviaFeedback && (
                                    <button onClick={loadTrivia} disabled={isTriviaLoading} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                                        Next Question <ArrowRight className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                         </div>
                     </div>
                 ) : null}
            </div>

            {/* Simulation Arena */}
             <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-theme relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h3 className="text-xl font-bold text-theme-main mb-1">Simulation Arena</h3>
                        <p className="text-sm text-theme-muted mb-4">Practice real-world {career.title} scenarios.</p>
                        <button 
                            onClick={startSimulation}
                            disabled={isSimLoading}
                            className={`px-5 py-2 bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors`}
                        >
                            {isSimLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-4 w-4" />}
                            Start Simulation
                        </button>
                    </div>
                    <div className="hidden md:block">
                        <Gamepad2 className={`h-24 w-24 text-${primaryColor}-500/20`} />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-theme-card p-8 rounded-3xl border border-theme relative overflow-hidden shadow-lg min-h-[240px] flex flex-col justify-center">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Trophy className={`h-40 w-40 text-${primaryColor}-500`} /></div>
                  <h3 className="text-theme-muted font-medium mb-6 flex items-center gap-2"><Target className={`h-4 w-4 text-${primaryColor}-400`} /> Goal Completion</h3>
                  <div className="flex items-baseline gap-4 mb-6"><span className="text-6xl font-bold text-theme-main">{progress}%</span></div>
                  <div className="space-y-2 relative z-10">
                     <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div className={`h-full bg-gradient-to-r from-${primaryColor}-600 to-${primaryColor}-400 transition-all duration-1000 ease-out`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
               </div>
               <div className="flex flex-col gap-6 h-full">
                  <div className={`flex-1 p-6 rounded-3xl border flex flex-col justify-center min-h-[110px] ${pacing.status === 'behind' ? 'bg-red-900/10 border-red-500/30' : pacing.status === 'ahead' ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-theme-card border-theme'}`}>
                     <div className="flex items-center gap-3 mb-2">
                        {pacing.status === 'behind' ? <AlertCircle className="h-5 w-5 text-red-400" /> : pacing.status === 'ahead' ? <Trophy className="h-5 w-5 text-emerald-400" /> : <Clock className="h-5 w-5 text-blue-400" />}
                        <span className="text-sm font-bold uppercase tracking-wider text-theme-muted">Pacing</span>
                     </div>
                     <div className={`text-2xl font-bold ${pacing.status === 'behind' ? 'text-red-400' : pacing.status === 'ahead' ? 'text-emerald-400' : 'text-theme-main'}`}>{pacing.message}</div>
                  </div>
                  <div className="flex-1 bg-theme-card p-6 rounded-3xl border border-theme flex items-center justify-between min-h-[110px] relative group">
                     <div className="flex items-center gap-4">
                         <div className={`p-4 bg-${primaryColor}-500/10 rounded-2xl text-${primaryColor}-400 shrink-0`}><Calendar className="h-6 w-6" /></div>
                         <div><div className="text-3xl font-bold text-theme-main">{daysRemaining}</div><div className="text-xs text-theme-muted uppercase tracking-wider font-semibold">Days Left</div></div>
                     </div>
                     <button onClick={() => { setPendingTargetDate(currentCareerDetails?.targetCompletionDate || ''); setShowDateEdit(true); }} className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white transition-all opacity-0 group-hover:opacity-100"><Pencil className="h-4 w-4" /></button>
                  </div>
               </div>
            </div>

            {/* News Section */}
            <div className="bg-theme-card border border-theme rounded-3xl p-6 relative min-h-[300px]">
              <div className="flex items-center gap-3 mb-6">
                 <div className={`p-2 bg-${primaryColor}-500/20 rounded-lg`}><TrendingUp className={`h-5 w-5 text-${primaryColor}-400`} /></div>
                 <h2 className="text-xl font-bold text-theme-main">Industry Intel</h2>
                 <div className="ml-auto flex items-center gap-2">
                     <button onClick={loadNews} disabled={isNewsLoading} className="p-1.5 text-theme-muted hover:text-theme-main hover:bg-slate-800 rounded-lg transition-colors">
                        <RefreshCw className={`h-4 w-4 ${isNewsLoading ? 'animate-spin' : ''}`} />
                     </button>
                     <span className="text-xs text-theme-muted flex items-center gap-1">{isNewsLoading ? <span className="flex items-center gap-1 text-indigo-400">Updating...</span> : <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" /> Live</span>}</span>
                 </div>
              </div>
              
              <div className="space-y-3">
                  {isNewsLoading && news.length === 0 ? [1,2,3].map(i => <div key={i} className="h-14 bg-slate-800/30 rounded-xl animate-pulse"></div>) : (
                      visibleNews.length > 0 ? visibleNews.map((n, i) => (
                          <div key={i} className={`rounded-xl border transition-all duration-300 overflow-hidden ${expandedNewsIndex === i ? `bg-slate-800/40 border-${primaryColor}-500/30 shadow-lg` : 'bg-theme-main border-theme'}`}>
                              <button onClick={() => setExpandedNewsIndex(expandedNewsIndex === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left gap-4">
                                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 overflow-hidden flex-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted bg-theme-card px-2 py-1 rounded border border-theme shrink-0 self-start md:self-auto flex items-center gap-1">{n.source} {n.date && `• ${n.date}`}</span>
                                      <span className={`font-semibold text-sm truncate ${expandedNewsIndex === i ? 'text-theme-main' : 'text-theme-muted'}`}>{n.title}</span>
                                  </div>
                                  {expandedNewsIndex === i ? <ChevronUp className={`h-4 w-4 text-${primaryColor}-400`} /> : <ChevronDown className="h-4 w-4 text-theme-muted" />}
                              </button>
                              {expandedNewsIndex === i && (
                                  <div className="px-4 pb-4 pt-0 animate-fade-in">
                                      <div className="pt-3 border-t border-theme">
                                          <p className="text-sm text-theme-muted leading-relaxed mb-4">{n.summary}</p>
                                          <a href={n.url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 text-xs font-bold bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white px-4 py-2 rounded-lg transition-colors`}>Read Full Story <ExternalLink className="h-3 w-3" /></a>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )) : <div className="text-center text-theme-muted py-8">No matching news found. <button onClick={loadNews} className="text-indigo-400 hover:underline">Retry</button></div>
                  )}
              </div>
            </div>
          </div>
        );
      case 'roadmap':
        if (isRoadmapLoading) return <RoadmapLoader primaryColor={primaryColor} />;
        return <Roadmap roadmap={roadmap} user={user} onSubscribe={handleSubscribe} onUpdateProgress={handleProgress} onReset={handleResetRoadmap} onResetPhase={handleResetPhase} onSwitchCareer={handleSwitchCareer} onEditTargetDate={() => { setPendingTargetDate(currentCareerDetails?.targetCompletionDate || ''); setShowDateEdit(true); }} pacing={pacing} isLoading={isRoadmapLoading} daysRemaining={daysRemaining} searchQuery={globalSearchQuery} />;
      case 'career':
        return (
          <div className="p-6 md:p-8 bg-theme-card rounded-3xl border border-theme min-h-[80vh]">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-theme-main">Career Architecture</h2>
                <button 
                    onClick={() => onAddCareer()} 
                    className={`flex items-center gap-2 px-5 py-2.5 bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white rounded-xl font-bold shadow-lg shadow-${primaryColor}-500/20 transition-all transform hover:scale-105`}
                >
                    <PlusCircle className="h-5 w-5" /> Add New Path
                </button>
            </div>
            
            <div className="space-y-6">
                {user.activeCareers.map((c) => {
                    const isCurrent = c.careerId === career.id;
                    return (
                        <div key={c.careerId} className={`p-6 rounded-2xl border ${isCurrent ? `bg-theme-main border-${primaryColor}-500/50 shadow-lg shadow-${primaryColor}-500/10` : 'bg-theme-card border-theme opacity-80 hover:opacity-100'} transition-all relative overflow-hidden`}>
                             {isCurrent && <div className="absolute top-0 right-0 p-2"><div className={`text-[10px] font-bold bg-${primaryColor}-500 text-white px-3 py-1 rounded-bl-xl uppercase tracking-wider`}>Active Focus</div></div>}
                             
                             <div className="mb-6">
                                <h3 className="text-2xl font-bold text-theme-main mb-3">{c.title}</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-theme-main/30 rounded-xl border border-theme/50">
                                    <div>
                                         <div className="text-xs text-theme-muted uppercase tracking-wider font-bold mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Started</div>
                                         <div className="font-semibold text-theme-main">{new Date(c.addedAt).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                         <div className="text-xs text-theme-muted uppercase tracking-wider font-bold mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Target</div>
                                         <div className="font-semibold text-theme-main">{c.targetCompletionDate}</div>
                                    </div>
                                     {c.experienceLevel && (
                                        <div>
                                             <div className="text-xs text-theme-muted uppercase tracking-wider font-bold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Level</div>
                                             <div className="font-semibold text-theme-main capitalize">{c.experienceLevel}</div>
                                        </div>
                                    )}
                                </div>
                             </div>

                             <div className="flex gap-3">
                                 {!isCurrent && <button onClick={() => handleSwitchCareer(c.careerId)} className={`px-4 py-2.5 bg-${primaryColor}-600/10 text-${primaryColor}-400 hover:bg-${primaryColor}-600 hover:text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2`}><Target className="h-4 w-4" /> Set as Active</button>}
                                 <button onClick={() => { if(window.confirm(`Delete ${c.title}?`)) handleDeleteCareer(c.careerId); }} className="px-4 py-2.5 bg-slate-800 text-slate-400 hover:bg-red-900/20 hover:text-red-400 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Path</button>
                             </div>
                        </div>
                    );
                })}
            </div>
          </div>
        );
      case 'profile':
        return (
           <div className="space-y-6">
             <div className="bg-theme-card p-8 rounded-3xl border border-theme flex items-center gap-6">
                <div className={`h-24 w-24 bg-gradient-to-br from-${primaryColor}-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shrink-0`}>{user.username.charAt(0).toUpperCase()}</div>
                <div><h2 className="text-3xl font-bold text-theme-main">{user.username}</h2><p className="text-theme-muted mb-3">Member since 2024</p><span className={`inline-block text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${user.subscriptionStatus !== 'free' ? 'bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{user.subscriptionStatus} Plan</span></div>
             </div>
             
             {/* THEME SETTINGS */}
             <div className="bg-theme-card p-4 rounded-3xl border border-theme space-y-2">
                 <div className="p-4 border-b border-theme mb-2"><h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider mb-4">Appearance</h3></div>
                 
                 <div className="px-4 py-2 flex items-center justify-between">
                     <span className="text-theme-main font-medium flex items-center gap-2"><Palette className="h-4 w-4" /> Accent Color</span>
                     <div className="flex gap-2">
                        {['indigo', 'emerald', 'violet', 'rose', 'amber', 'blue'].map((color) => (
                            <button 
                                key={color}
                                onClick={() => handleThemeChange('primaryColor', color)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${primaryColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: `var(--color-${color}-500)` }}
                            >
                                <div className={`w-full h-full rounded-full bg-${color}-500`}></div>
                            </button>
                        ))}
                     </div>
                 </div>

                 <div className="px-4 py-4 flex items-center justify-between">
                     <span className="text-theme-main font-medium flex items-center gap-2">{isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} Theme Mode</span>
                     <div className="flex bg-slate-800 rounded-lg p-1">
                         <button onClick={() => handleThemeChange('mode', 'light')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!isDark ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}>Light</button>
                         <button onClick={() => handleThemeChange('mode', 'dark')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${isDark ? 'bg-slate-600 text-white shadow' : 'text-slate-400'}`}>Dark</button>
                     </div>
                 </div>
             </div>

             <div className="bg-theme-card p-4 rounded-3xl border border-theme space-y-2">
                 <div className="p-4 border-b border-theme mb-2"><h3 className="text-sm font-bold text-theme-muted uppercase tracking-wider mb-4">Account</h3></div>
                 <button onClick={handleResetAll} className="w-full flex items-center justify-between p-4 hover:bg-red-900/10 rounded-xl transition-colors text-left group"><div className="flex items-center gap-4"><div className="p-2 bg-slate-800 rounded-lg text-red-400"><RotateCcw className="h-5 w-5" /></div><span className="font-medium text-theme-main group-hover:text-red-300">Reset All Progress</span></div></button>
                 <button onClick={onLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-900/10 rounded-xl transition-colors text-left text-red-400 group"><div className="flex items-center gap-4"><div className="p-2 bg-slate-800 rounded-lg"><LogOut className="h-5 w-5" /></div><span className="font-medium">Log Out</span></div></button>
             </div>
           </div>
        );
    }
  };

  return (
    <div className={`min-h-screen md:pb-0 md:pl-24 bg-theme-main text-theme-main selection:bg-${primaryColor}-500/30 transition-colors duration-300 ${!isDark ? 'light-theme' : ''}`}>
      {/* Search Bar - Global for Dashboard */}
      <div className="fixed top-0 left-0 right-0 md:left-24 z-40 p-4 bg-theme-main/80 backdrop-blur-md border-b border-theme flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md relative">
              <input 
                 type="text" 
                 placeholder="Search roadmap, news, or items..."
                 className="w-full pl-10 pr-4 py-2 bg-theme-card border border-theme rounded-full shadow-sm focus:border-indigo-500 outline-none text-sm transition-all"
                 value={globalSearchQuery}
                 onChange={(e) => setGlobalSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-theme-muted" />
              {globalSearchQuery && <button onClick={() => setGlobalSearchQuery('')} className="absolute right-3 top-2.5 text-theme-muted hover:text-theme-main"><X className="h-4 w-4" /></button>}
          </div>
      </div>

      {showCelebration && <CelebrationModal onClose={() => setShowCelebration(false)} />}
      {milestoneEvent && <MilestoneModal type={milestoneEvent.type} value={milestoneEvent.value} onClose={() => setMilestoneEvent(null)} />}
      {showSimulationModal && activeSimulation && <SimulationModal simulation={activeSimulation} onClose={() => setShowSimulationModal(false)} onComplete={finishSimulation} />}
      {showPhaseCompletionModal && <PhaseCompletionModal onClose={() => setShowPhaseCompletionModal(false)} onFinishQuicker={handleFinishQuicker} onIncreaseChallenge={() => handleAdaptation('increase_difficulty_same_time')} summary={phaseSummary} isLoadingSummary={isSummaryLoading} />}
      {showAdaptationModal && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"><div className="bg-theme-card border border-theme rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl"><h2 className="text-2xl font-bold text-theme-main mb-2">Schedule Adjustment</h2><p className="text-theme-muted mb-6">{adaptationMessage}</p>{isAdapting ? <div className="py-8 flex flex-col items-center gap-4"><div className={`animate-spin h-8 w-8 border-4 border-${primaryColor}-500 border-t-transparent rounded-full`}></div><span className={`text-${primaryColor}-400 font-medium`}>Updating roadmap...</span></div> : <div className="space-y-3"><button onClick={() => handleAdaptation('increase_difficulty_same_time')} className="w-full p-4 bg-slate-800 hover:bg-purple-900/20 border border-slate-700 hover:border-purple-500 rounded-xl transition-all text-left flex items-center justify-between group"><div><div className="font-bold text-white mb-1">Increase Difficulty</div><div className="text-xs text-slate-400">Add more advanced topics.</div></div><ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-purple-400" /></button><button onClick={() => setShowAdaptationModal(null)} className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-left flex items-center justify-center"><span className="font-medium text-slate-300">Dismiss</span></button></div>}</div></div>}
      {showDateStrategyModal && <DateStrategyModal type={dateStrategyType} onAdapt={handleAdaptation} onCancel={() => setShowDateStrategyModal(false)} />}
      {showDateEdit && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"><div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full text-center"><h3 className="text-xl font-bold text-white mb-4">Change Target Date</h3><input type="date" className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white mb-6 color-scheme-dark focus:border-indigo-500 outline-none" value={pendingTargetDate} onChange={e => setPendingTargetDate(e.target.value)} min={new Date().toISOString().split('T')[0]} /><div className="flex gap-3"><button onClick={() => setShowDateEdit(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">Cancel</button><button onClick={initiateDateUpdate} disabled={!pendingTargetDate} className={`flex-1 py-3 bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white font-bold rounded-xl transition-colors`}>Update</button></div></div></div>}
      
      {/* Floating Chat Bot */}
      <div className="fixed bottom-24 right-6 z-50">
        {!isChatOpen && (
            <button 
                onClick={() => setIsChatOpen(true)}
                className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110"
            >
                <MessageCircle className="h-7 w-7" />
            </button>
        )}
        {isChatOpen && <ChatBot context={career.title} onClose={() => setIsChatOpen(false)} />}
      </div>

      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-theme-card border-r border-theme flex-col items-center py-20 z-30">
        <div className="flex flex-col gap-8 w-full">
            {[ { id: 'home', icon: Home, label: 'Home' }, { id: 'roadmap', icon: Map, label: 'Roadmap' }, { id: 'career', icon: Briefcase, label: 'Career' }, { id: 'profile', icon: User, label: 'Profile' } ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`relative flex flex-col items-center gap-2 py-2 transition-all w-full border-r-2 ${activeTab === item.id ? `text-${primaryColor}-400 border-${primaryColor}-500` : 'text-theme-muted border-transparent hover:text-theme-main'}`}>
                    <item.icon className={`h-6 w-6 ${activeTab === item.id ? `drop-shadow-[0_0_8px_rgba(var(--color-${primaryColor}-400),0.5)]` : ''}`} />
                    <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                </button>
            ))}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-theme-card border-t border-theme flex justify-around py-3 px-2 z-50 pb-safe backdrop-blur-xl bg-opacity-90">
         {[ { id: 'home', icon: Home, label: 'Home' }, { id: 'roadmap', icon: Map, label: 'Roadmap' }, { id: 'career', icon: Briefcase, label: 'Career' }, { id: 'profile', icon: User, label: 'Profile' } ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? `text-${primaryColor}-400 bg-${primaryColor}-500/10` : 'text-theme-muted'}`}>
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                </button>
            ))}
      </nav>

      <main className="max-w-7xl mx-auto p-6 pt-24 md:pt-24 min-h-screen flex flex-col pb-24 md:pb-0">
        <div className="flex-1">{renderContent()}</div>
        <footer className="py-4 mt-auto border-t border-theme text-center text-theme-muted"><p className="text-[10px] md:text-xs font-medium tracking-wide">Developed by © Hameed Afsar K M</p></footer>
      </main>
      
      <style>{`
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); filter: blur(10px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
      `}</style>
    </div>
  );
};
