import React, { useState, useEffect } from 'react';
import { RoadmapPhase, UserProfile, RoadmapItem } from '../types';
import { Subscription } from './Subscription';
import { CheckCircle2, Circle, ExternalLink, RefreshCw, Briefcase, Award, Code, Zap, Clock, ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle, RotateCcw, Target, Pencil, Check, Filter, ArrowRight } from 'lucide-react';

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
  searchQuery?: string;
}

type FilterType = 'all' | 'skill' | 'project' | 'internship' | 'certificate';

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
  daysRemaining,
  searchQuery = ''
}) => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [nextTask, setNextTask] = useState<{item: RoadmapItem, phaseIndex: number} | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [itemToConfirm, setItemToConfirm] = useState<RoadmapItem | null>(null);
  const [resetIntent, setResetIntent] = useState<{type: 'all' | 'phase', index: number} | null>(null);
  const [showCareerMenu, setShowCareerMenu] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  
  // Filter State
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const primaryColor = user.theme?.primaryColor || 'indigo';

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
        
        if (!searchQuery && animatingId === null) {
            setExpandedPhase(activePhaseIndex);
        }
    }
  }, [roadmap, isLoading, searchQuery]);

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

  const handleTaskClick = (item: RoadmapItem) => {
      if (item.status === 'pending') {
          setItemToConfirm(item);
      } else {
          // Allow unmarking without confirmation for ease of use
          onUpdateProgress(item.id);
      }
  };

  const confirmCompletion = () => {
      if (itemToConfirm) {
          const id = itemToConfirm.id;
          
          // 1. Close modal
          setItemToConfirm(null);
          
          // 2. Start Animation
          setAnimatingId(id);
          
          // 3. Wait for animation, then update data
          setTimeout(() => {
              onUpdateProgress(id);
              setAnimatingId(null);
          }, 800);
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Code className="h-4 w-4 text-cyan-400" />;
      case 'internship': return <Briefcase className="h-4 w-4 text-purple-400" />;
      case 'certificate': return <Award className="h-4 w-4 text-orange-400" />;
      default: return <Zap className={`h-4 w-4 text-${primaryColor}-400`} />;
    }
  };

  const filterItems = (items: RoadmapItem[]) => {
      return items.filter(item => {
          const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
          const matchesSearch = searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesFilter && matchesSearch;
      });
  };

  if (isLoading || !roadmap) return (
      <div className="p-6 space-y-6 min-h-[60vh]">
           <div className="h-32 bg-theme-card rounded-3xl animate-pulse"></div>
           <div className="space-y-4">
               {[1,2,3].map(i => (
                   <div key={i} className="h-20 bg-theme-card rounded-2xl animate-pulse"></div>
               ))}
           </div>
           <div className="flex items-center justify-center text-theme-muted gap-2 mt-8">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Loading path...</span>
           </div>
      </div>
  );

  const isPaid = user.subscriptionStatus !== 'free';
  const currentCareer = getActiveCareer();

  return (
    <div className="relative min-h-[80vh] pb-10">
      {!isPaid && <Subscription onSubscribe={onSubscribe} />}
      
      {/* Confirmation Modal */}
      {itemToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`bg-theme-card border border-${primaryColor}-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-${primaryColor}-500 to-purple-500`}></div>
                <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 bg-${primaryColor}-500/20 rounded-xl text-${primaryColor}-400 shrink-0`}>
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-theme-main">Complete Task?</h3>
                        <p className="text-theme-muted text-sm mt-1">"{itemToConfirm.title}"</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setItemToConfirm(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm hover:bg-slate-700 transition-colors">Cancel</button>
                    <button onClick={confirmCompletion} className={`flex-1 py-3 bg-${primaryColor}-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-${primaryColor}-500 transition-colors shadow-lg shadow-${primaryColor}-500/20`}>
                        Confirm <CheckCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Reset Modal */}
      {resetIntent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-red-500/20 rounded-xl text-red-400 shrink-0"><AlertTriangle className="h-6 w-6" /></div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Reset Progress?</h3>
                        <p className="text-slate-400 text-sm mt-1">Cannot be undone.</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setResetIntent(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm hover:bg-slate-700 transition-colors">Cancel</button>
                    <button onClick={confirmReset} className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-500 transition-colors">Reset <RotateCcw className="h-4 w-4" /></button>
                </div>
            </div>
        </div>
      )}

      <div className={`p-4 md:p-6 space-y-6 ${!isPaid ? 'blur-sm select-none h-[80vh] overflow-hidden' : ''}`}>
        
        {/* Header & Controls */}
        <div className="flex flex-col gap-6 bg-theme-card p-6 rounded-3xl border border-theme">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2 relative z-20">
                        {user.activeCareers.length > 1 ? (
                            <div className="relative">
                                <button onClick={() => setShowCareerMenu(!showCareerMenu)} className="flex items-center gap-2 text-2xl font-bold text-theme-main hover:opacity-80 transition-opacity">
                                    {currentCareer?.title || "Career Roadmap"} <ChevronDown className="h-5 w-5 text-theme-muted" />
                                </button>
                                {showCareerMenu && (
                                    <div className="absolute left-0 top-full mt-2 w-64 bg-theme-card border border-theme rounded-xl shadow-2xl z-50 animate-fade-in p-2 space-y-1">
                                            {user.activeCareers.map(c => (
                                                <button 
                                                    key={c.careerId}
                                                    onClick={() => { onSwitchCareer(c.careerId); setShowCareerMenu(false); }}
                                                    className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${c.careerId === user.currentCareerId ? `bg-${primaryColor}-600 text-white` : 'text-theme-muted hover:bg-slate-800'}`}
                                                >
                                                    <span className="truncate font-medium">{c.title}</span>
                                                    {c.careerId === user.currentCareerId && <Check className="h-4 w-4" />}
                                                </button>
                                            ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <h2 className="text-2xl font-bold text-theme-main">{currentCareer?.title}</h2>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-theme-muted">
                        <div className="flex items-center gap-2 px-3 py-1 bg-theme-main rounded-lg border border-theme">
                             <Clock className="h-3 w-3" /> {daysRemaining} Days Left
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-theme-main rounded-lg border border-theme cursor-pointer hover:border-indigo-500" onClick={onEditTargetDate}>
                             <Target className="h-3 w-3" /> {getActiveCareerDate()} <Pencil className="h-3 w-3 ml-1" />
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                     <button onClick={handleResetRequest} className="p-2 text-theme-muted hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors" title="Reset All">
                        <RotateCcw className="h-5 w-5" />
                    </button>
                </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-theme">
                 {(['all', 'skill', 'project', 'internship', 'certificate'] as const).map(f => (
                     <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${activeFilter === f ? `bg-${primaryColor}-500 text-white border-${primaryColor}-500` : 'bg-theme-main text-theme-muted border-theme hover:border-slate-500'}`}
                     >
                        {f}
                     </button>
                 ))}
            </div>
        </div>

        {/* Pacing Alert */}
        {pacing.status !== 'on-track' && !isCompleted && !searchQuery && (
             <div className={`p-4 rounded-2xl border flex items-center gap-4 ${pacing.status === 'behind' ? 'bg-amber-900/10 border-amber-500/30 text-amber-200' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'}`}>
                 {pacing.status === 'behind' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                 <div><div className="font-bold">{pacing.message}</div></div>
             </div>
        )}

        {/* Current Focus Card */}
        {nextTask && !searchQuery && activeFilter === 'all' && (
            <div className={`bg-gradient-to-r from-${primaryColor}-900/40 to-theme-card p-6 rounded-3xl border border-${primaryColor}-500/30 shadow-lg relative overflow-hidden group`}>
                <div className={`absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700`}>
                     <Target className={`h-48 w-48 text-${primaryColor}-400`} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                        <Star className="h-4 w-4 fill-indigo-400" />
                        <span className="text-xs font-bold uppercase tracking-wider">Current Focus</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-theme-main mb-2">{nextTask.item.title}</h3>
                    <p className="text-theme-muted text-sm mb-6 max-w-2xl leading-relaxed">{nextTask.item.description}</p>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => handleTaskClick(nextTask.item)} className={`bg-${primaryColor}-600 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-${primaryColor}-500 transition-all shadow-lg shadow-${primaryColor}-500/20`}>
                            <CheckCircle2 className="h-5 w-5" /> Mark as Done
                        </button>
                        {nextTask.item.link && (
                            <a href={nextTask.item.link} target="_blank" rel="noreferrer" className="px-5 py-3 rounded-xl border border-theme text-theme-main hover:bg-slate-800 text-sm font-medium flex items-center gap-2 transition-colors">
                                Resource <ExternalLink className="h-4 w-4" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Phases & Items */}
        <div className="space-y-6">
            {roadmap.map((phase, pIndex) => {
                const visibleItems = filterItems(phase.items);
                if (visibleItems.length === 0) return null; // Hide phase if filtered out

                const isExpanded = expandedPhase === pIndex || searchQuery !== ''; // Always expand on search
                const completedCount = phase.items.filter(i => i.status === 'completed').length;
                const totalCount = phase.items.length;
                const isPhaseDone = completedCount === totalCount;
                const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return (
                    <div key={pIndex} className={`bg-theme-card border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? `border-${primaryColor}-500/30 shadow-lg` : 'border-theme hover:border-slate-700'}`}>
                        {/* Phase Header */}
                        <div 
                            onClick={() => togglePhase(pIndex)}
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-theme-main/30 transition-colors"
                        >
                             <div className="flex-1 flex items-center gap-4">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-bold shrink-0 transition-colors ${isPhaseDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {isPhaseDone ? <CheckCircle2 className="h-5 w-5" /> : pIndex + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className={`font-bold text-base md:text-lg text-theme-main`}>{phase.phaseName}</h3>
                                        {isPhaseDone && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-500/20">Completed</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 max-w-xs">
                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div className={`h-full bg-${isPhaseDone ? 'emerald' : primaryColor}-500 transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                                        </div>
                                        <span className="text-xs text-theme-muted font-medium w-8 text-right">{percent}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pl-4">
                                {completedCount > 0 && !isPhaseDone && (
                                    <button onClick={(e) => handleResetPhaseRequest(e, pIndex)} className="p-2 text-theme-muted hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors" title="Reset Phase">
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                )}
                                {isExpanded ? <ChevronUp className="h-5 w-5 text-theme-muted" /> : <ChevronDown className="h-5 w-5 text-theme-muted" />}
                            </div>
                        </div>

                        {/* Phase Items List */}
                        {isExpanded && (
                            <div className="border-t border-theme bg-theme-main/30 p-2 md:p-4 space-y-2 animate-fade-in">
                                {visibleItems.map((item) => {
                                    const isAnimating = animatingId === item.id;
                                    const isDone = item.status === 'completed';
                                    
                                    return (
                                    <div key={item.id} className={`group flex flex-col md:flex-row gap-4 p-4 rounded-xl border transition-all duration-700 ${
                                        isAnimating 
                                            ? `scale-[1.02] bg-emerald-900/20 border-emerald-500 shadow-lg shadow-emerald-500/20 z-10` 
                                            : isDone 
                                                ? 'bg-theme-main/50 border-theme opacity-75' 
                                                : 'bg-theme-card border-theme hover:border-indigo-500/30 hover:shadow-sm'
                                    }`}>
                                        
                                        {/* Icon & Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                <div className={`p-1.5 rounded-lg bg-theme-main border border-theme`}>{getTypeIcon(item.type)}</div>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded text-theme-muted bg-theme-main border border-theme`}>{item.type}</span>
                                                <span className="text-[10px] font-mono text-theme-muted flex items-center gap-1"><Clock className="h-3 w-3" /> {item.duration}</span>
                                            </div>
                                            <h4 className={`font-semibold text-base text-theme-main mb-1 ${isDone && !isAnimating ? 'line-through text-theme-muted' : ''}`}>{item.title}</h4>
                                            <p className="text-sm text-theme-muted leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">{item.description}</p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 md:self-center self-end mt-2 md:mt-0 shrink-0">
                                            {item.link && (
                                                <a href={item.link} target="_blank" rel="noreferrer" className="p-2.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/30 transition-all" title="View Resource">
                                                    <ExternalLink className="h-5 w-5" />
                                                </a>
                                            )}
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleTaskClick(item); }}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 min-w-[140px] justify-center ${
                                                    isDone || isAnimating
                                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20' 
                                                        : `bg-theme-main text-theme-muted border-theme hover:border-${primaryColor}-500 hover:text-${primaryColor}-400 shadow-sm hover:shadow`
                                                }`}
                                            >
                                                {isDone || isAnimating ? (
                                                    <>Completed <CheckCircle2 className={`h-4 w-4 ${isAnimating ? 'animate-bounce' : ''}`} /></>
                                                ) : (
                                                    <>Mark Complete <ArrowRight className="h-3 w-3" /></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )})}
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
