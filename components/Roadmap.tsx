import React, { useState, useEffect } from 'react';
import { RoadmapPhase, UserProfile, RoadmapItem } from '../types';
import { Subscription } from './Subscription';
import { CheckCircle2, Circle, ExternalLink, RefreshCw, Briefcase, Award, Code, Zap, Clock, ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle, RotateCcw, Sparkles, Target, Pencil, Check } from 'lucide-react';

interface PacingStatus {
    status: 'ahead' | 'behind' | 'on-track' | 'critical';
    days: number;
    message: string;
}

interface RoadmapProps {
  roadmap: RoadmapPhase[] | null;
  user: UserProfile;
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
  onUpdateProgress: (itemId: string) => void;
  onReset: () => void;
  onResetPhase: (phaseIndex: number) => void;
  onSwitchCareer: (careerId: string) => void;
  onEditTargetDate: () => void;
  pacing: PacingStatus;
  isLoading?: boolean;
  daysRemaining: number;
}

export const Roadmap: React.FC<RoadmapProps> = ({ 
  roadmap, 
  user, 
  onSubscribe, 
  onUpdateProgress, 
  onReset, 
  onResetPhase,
  onSwitchCareer,
  onEditTargetDate,
  pacing, 
  isLoading = false, 
  daysRemaining 
}) => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [nextTask, setNextTask] = useState<{item: RoadmapItem, phaseIndex: number} | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [itemToConfirm, setItemToConfirm] = useState<RoadmapItem | null>(null);
  const [resetIntent, setResetIntent] = useState<{type: 'all' | 'phase', index: number} | null>(null);
  const [showCareerMenu, setShowCareerMenu] = useState(false);

  // Find the first phase with pending items to expand by default and set Next Task
  useEffect(() => {
    if (roadmap && !isLoading) {
        let foundNext = false;
        let activePhaseIndex = 0;
        let totalPending = 0;

        for (let i = 0; i < roadmap.length; i++) {
            const phase = roadmap[i];
            const firstPending = phase.items.find(item => item.status === 'pending');
            totalPending += phase.items.filter(i => i.status === 'pending').length;
            
            if (firstPending) {
                if (!foundNext) {
                    setNextTask({ item: firstPending, phaseIndex: i });
                    activePhaseIndex = i;
                    foundNext = true;
                }
            }
        }
        // If all completed
        if (totalPending === 0 && roadmap.length > 0) {
            activePhaseIndex = roadmap.length - 1;
            setNextTask(null);
            setIsCompleted(true);
        } else if (totalPending > 0 && !foundNext) {
             setNextTask(null);
             setIsCompleted(false);
        } else {
            setIsCompleted(false);
        }
        
        // Only auto-expand if state just loaded
        setExpandedPhase(activePhaseIndex);
    }
  }, [roadmap, isLoading]);

  const togglePhase = (index: number) => {
      setExpandedPhase(expandedPhase === index ? null : index);
  };

  const getActiveCareer = () => {
      return user.activeCareers.find(c => c.careerId === user.currentCareerId);
  }

  const getActiveCareerDate = () => {
      const active = getActiveCareer();
      return active ? active.targetCompletionDate : (user.activeCareers[0]?.targetCompletionDate || 'N/A');
  }

  const handleResetRequest = () => {
      setResetIntent({ type: 'all', index: -1 });
  };

  const handleResetPhaseRequest = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setResetIntent({ type: 'phase', index });
  };

  // Safe Progress Update Wrapper
  const handleTaskClick = (item: RoadmapItem) => {
      if (item.status === 'pending') {
          setItemToConfirm(item);
      } else {
          // Unchecking is usually safe to do instantly (undo)
          onUpdateProgress(item.id);
      }
  };

  const confirmCompletion = () => {
      if (itemToConfirm) {
          onUpdateProgress(itemToConfirm.id);
          setItemToConfirm(null);
      }
  };

  const confirmReset = () => {
      if (!resetIntent) return;
      if (resetIntent.type === 'all') {
          onReset();
      } else {
          onResetPhase(resetIntent.index);
      }
      setResetIntent(null);
  };

  if (isLoading || !roadmap) return (
      <div className="p-6 space-y-6 min-h-[60vh]">
           <div className="h-32 bg-slate-900 rounded-3xl animate-pulse"></div>
           <div className="space-y-4">
               {[1,2,3].map(i => (
                   <div key={i} className="h-20 bg-slate-900 rounded-2xl animate-pulse"></div>
               ))}
           </div>
           <div className="flex items-center justify-center text-slate-400 gap-2 mt-8">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading your career path...</span>
           </div>
      </div>
  );

  const isPaid = user.subscriptionStatus !== 'free';
  const currentCareer = getActiveCareer();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Code className="h-4 w-4 text-cyan-400" />;
      case 'internship': return <Briefcase className="h-4 w-4 text-purple-400" />;
      case 'certificate': return <Award className="h-4 w-4 text-orange-400" />;
      default: return <Zap className="h-4 w-4 text-indigo-400" />;
    }
  };

  return (
    <div className="relative min-h-[80vh] pb-10">
      {!isPaid && <Subscription onSubscribe={onSubscribe} />}
      
      {/* Confirmation Modal for Task Completion */}
      {itemToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Complete Task?</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Are you sure you want to mark <span className="text-white font-medium">"{itemToConfirm.title}"</span> as completed?
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button 
                        onClick={() => setItemToConfirm(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmCompletion}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        Confirm <CheckCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {resetIntent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-red-500/20 rounded-xl text-red-400 shrink-0">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Reset Progress?</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            {resetIntent.type === 'all' 
                                ? "This will reset your ENTIRE roadmap progress. This cannot be undone."
                                : "This will reset all tasks in this specific phase. This cannot be undone."
                            }
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button 
                        onClick={() => setResetIntent(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmReset}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl shadow-lg shadow-red-900/20 transition-all text-sm flex items-center justify-center gap-2"
                    >
                        Yes, Reset <RotateCcw className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className={`p-4 md:p-6 space-y-6 ${!isPaid ? 'blur-sm select-none h-[80vh] overflow-hidden' : ''}`}>
        
        {/* Header & Controls */}
        <div className="flex flex-col gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2 relative z-20">
                        {user.activeCareers.length > 1 ? (
                            <div className="relative">
                                <button 
                                    onClick={() => setShowCareerMenu(!showCareerMenu)}
                                    className="flex items-center gap-2 text-2xl font-bold text-white hover:text-indigo-300 transition-colors"
                                >
                                    {currentCareer?.title || "Career Roadmap"}
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                </button>
                                {showCareerMenu && (
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                                        <div className="p-2 space-y-1">
                                            {user.activeCareers.map(c => (
                                                <button 
                                                    key={c.careerId}
                                                    onClick={() => {
                                                        onSwitchCareer(c.careerId);
                                                        setShowCareerMenu(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${c.careerId === user.currentCareerId ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                                                >
                                                    <span className="truncate font-medium">{c.title}</span>
                                                    {c.careerId === user.currentCareerId && <Check className="h-4 w-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <h2 className="text-2xl font-bold text-white">{currentCareer?.title || "Adaptive Roadmap"}</h2>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-400" /> AI Optimized</span>
                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                        <span>{user.activeCareers.length} Active Path{user.activeCareers.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleResetRequest}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-red-900/20 text-slate-400 hover:text-red-400 px-4 py-3 rounded-xl transition-all text-sm font-bold border border-slate-800"
                        title="Reset all progress in this roadmap"
                    >
                        <RotateCcw className="h-4 w-4" /> Reset All
                    </button>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl font-bold text-white">{daysRemaining}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Days Left</div>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between px-4 md:px-6 group relative cursor-pointer hover:border-indigo-500/50 transition-colors" onClick={onEditTargetDate}>
                    <div className="text-left">
                         <div className="text-sm font-bold text-slate-300">Target Date</div>
                         <div className="text-xs text-slate-500">{getActiveCareerDate()}</div>
                    </div>
                    <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-white group-hover:bg-indigo-600 transition-all">
                        <Pencil className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>

        {/* Pacing Alert */}
        {pacing.status !== 'on-track' && !isCompleted && (
             <div className={`p-4 rounded-2xl border flex items-center gap-4 ${pacing.status === 'behind' ? 'bg-amber-900/10 border-amber-500/30 text-amber-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'}`}>
                 {pacing.status === 'behind' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                 <div>
                    <div className="font-bold">{pacing.message}</div>
                    <div className="text-xs opacity-80">
                        {pacing.status === 'behind' ? "Try to complete extra modules today to catch up!" : "Great job! You are learning faster than planned."}
                    </div>
                 </div>
             </div>
        )}

        {/* Current Focus Card */}
        {nextTask && (
            <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 shadow-lg shadow-indigo-900/10 animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 text-indigo-400 mb-1">
                            <Star className="h-4 w-4 fill-indigo-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">Current Focus</span>
                        </div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {nextTask.item.title}
                            <span className="text-sm font-normal text-slate-400 font-mono bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                                {nextTask.item.duration}
                            </span>
                        </h3>
                        {nextTask.item.isAIAdaptation && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                <Sparkles className="h-3 w-3" /> Updated by AI
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-slate-300 text-sm mb-6 max-w-2xl">{nextTask.item.description}</p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button 
                        onClick={() => handleTaskClick(nextTask.item)}
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <CheckCircle2 className="h-5 w-5" />
                        Mark as Completed
                    </button>
                    {nextTask.item.link && (
                         <a 
                            href={nextTask.item.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full sm:w-auto justify-center px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium flex items-center gap-2"
                         >
                            Open Resource <ExternalLink className="h-4 w-4" />
                         </a>
                    )}
                </div>
            </div>
        )}

        {/* LIST VIEW (Accordion) */}
        <div className="space-y-4">
            {roadmap.map((phase, pIndex) => {
                const isExpanded = expandedPhase === pIndex;
                const completedCount = phase.items.filter(i => i.status === 'completed').length;
                const totalCount = phase.items.length;
                const isPhaseDone = completedCount === totalCount;
                const isPhaseStarted = completedCount > 0;

                return (
                    <div key={pIndex} className={`relative bg-slate-900 border transition-all duration-300 rounded-2xl overflow-hidden ${isExpanded ? 'border-indigo-500/50 shadow-xl shadow-indigo-900/10' : 'border-slate-800 hover:border-slate-700'}`}>
                        
                        <div className="flex items-center justify-between p-5">
                             <button 
                                onClick={() => togglePhase(pIndex)}
                                className="flex-1 flex items-center gap-4 text-left focus:outline-none"
                            >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold shrink-0 ${isPhaseDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {isPhaseDone ? <CheckCircle2 className="h-4 w-4" /> : pIndex + 1}
                                </div>
                                <div>
                                    <h3 className={`font-bold text-base md:text-lg ${isPhaseDone ? 'text-emerald-400' : 'text-slate-200'}`}>
                                        {phase.phaseName}
                                    </h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                        <span>{completedCount}/{totalCount} Completed</span>
                                        <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                        <span>Phase {pIndex + 1}</span>
                                    </div>
                                </div>
                            </button>

                            <div className="flex items-center gap-3">
                                {/* Reset Phase Button */}
                                {isPhaseStarted && (
                                    <button 
                                        onClick={(e) => handleResetPhaseRequest(e, pIndex)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Reset this phase"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                )}

                                <div className="hidden md:block h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${isPhaseDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${(completedCount / totalCount) * 100}%` }}
                                    ></div>
                                </div>
                                <button onClick={() => togglePhase(pIndex)}>
                                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                                </button>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-slate-800 bg-slate-950/30 p-4 space-y-2 animate-fade-in">
                                {phase.items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className={`relative flex items-center gap-4 p-3 rounded-xl border transition-all group/item ${item.status === 'completed' ? 'bg-slate-950 border-slate-800/50 opacity-60' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500/30'}`}
                                    >
                                        <button 
                                            onClick={() => handleTaskClick(item)} 
                                            className="shrink-0 focus:outline-none p-1 hover:scale-110 transition-transform"
                                        >
                                            {item.status === 'completed' 
                                                ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> 
                                                : <Circle className="h-6 w-6 text-slate-600 group-hover/item:text-indigo-400 transition-colors" />}
                                        </button>
                                        
                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleTaskClick(item)}>
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                {getTypeIcon(item.type)}
                                                <span className={`font-medium text-sm truncate ${item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                                    {item.title}
                                                </span>
                                                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                    {item.duration}
                                                </span>
                                                {item.isAIAdaptation && (
                                                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30 uppercase tracking-wide">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                                        </div>

                                        <div className="hidden md:flex items-center gap-3 shrink-0">
                                            {item.link && (
                                                <a 
                                                    href={item.link} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                                    title="Open Resource"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};