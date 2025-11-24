import React, { useEffect, useState } from 'react';
import { UserProfile, CareerOption, RoadmapPhase, NewsItem, RoadmapItem } from '../types';
import { Roadmap } from './Roadmap';
import { fetchTechNews, generateRoadmap, calculateRemainingDays } from '../services/gemini';
import { saveRoadmap, saveUser, getRoadmap, getCareerData, saveCareerData, setCurrentUser } from '../services/store';
import { Home, Map, Briefcase, User, LogOut, Settings, TrendingUp, PlusCircle, ChevronDown, ChevronUp, Clock, Trophy, AlertCircle, Target, BookOpen, Trash2, RotateCcw, PartyPopper, ArrowRight, Zap, Calendar, ExternalLink, X, Search, Sparkles, Pencil, CheckCircle2, RefreshCw } from 'lucide-react';

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
  
  // Adaptation State
  const [showAdaptationModal, setShowAdaptationModal] = useState<'early' | 'late' | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptationMessage, setAdaptationMessage] = useState('');

  // Phase Completion State
  const [showPhaseCompletionModal, setShowPhaseCompletionModal] = useState(false);
  const [justCompletedPhaseIndex, setJustCompletedPhaseIndex] = useState<number | null>(null);

  // Date Edit State
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [pendingTargetDate, setPendingTargetDate] = useState('');
  const [showDateStrategyModal, setShowDateStrategyModal] = useState(false);
  const [dateStrategyType, setDateStrategyType] = useState<'extension' | 'shortening' | null>(null);

  // Get current career details
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
      if (calculatedProgress === 100 && progress !== 100 && progress !== 0) {
          setShowCelebration(true);
      }
      setProgress(calculatedProgress);
    } else {
        setProgress(0);
    }
  }, [roadmap]);

  useEffect(() => {
    const loadNews = async () => {
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
    };
    loadNews();
  }, [career.id, career.title]);

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    const updatedUser = { ...user, subscriptionStatus: plan };
    setUser(updatedUser);
    saveUser(updatedUser);
  };

  const handleProgress = (itemId: string) => {
    if (!roadmap) return;
    const now = Date.now();

    // Determine which phase we are modifying to check for completion status change
    let phaseIndexToCheck = -1;
    roadmap.forEach((p, idx) => {
        if (p.items.find(i => i.id === itemId)) {
            phaseIndexToCheck = idx;
        }
    });

    // Check if this phase WAS already completed
    const wasPhaseCompleted = phaseIndexToCheck !== -1 && roadmap[phaseIndexToCheck].items.every(i => i.status === 'completed');

    const newRoadmap = roadmap.map(phase => ({
      ...phase,
      items: phase.items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status: item.status === 'completed' ? 'pending' : 'completed',
              completedAt: item.status === 'completed' ? undefined : now 
            } as RoadmapItem
          : item
      )
    }));
    
    setRoadmap(newRoadmap);
    saveRoadmap(user.id, career.id, newRoadmap);

    // Check if phase IS NOW completed (and wasn't before)
    if (phaseIndexToCheck !== -1) {
        const isNowCompleted = newRoadmap[phaseIndexToCheck].items.every(i => i.status === 'completed');
        // Ensure we don't show Phase Modal if the ENTIRE roadmap is done (Celebration takes precedence)
        const isAllCompleted = newRoadmap.every(p => p.items.every(i => i.status === 'completed'));

        if (isNowCompleted && !wasPhaseCompleted && !isAllCompleted) {
            setJustCompletedPhaseIndex(phaseIndexToCheck);
            setShowPhaseCompletionModal(true);
        }
    }
  };

  const handleResetPhase = (phaseIndex: number) => {
      if (!roadmap) return;
      // Deep copy and reset specific phase
      const newRoadmap = roadmap.map((phase, idx) => {
          if (idx === phaseIndex) {
              return {
                  ...phase,
                  items: phase.items.map(item => ({
                      ...item,
                      status: 'pending' as const,
                      completedAt: undefined
                  }))
              };
          }
          return phase;
      });
      
      setRoadmap(newRoadmap);
      saveRoadmap(user.id, career.id, newRoadmap);
  };

  const handleResetRoadmap = () => {
      if (!roadmap) return;
      const resetMap = roadmap.map(phase => ({
          ...phase,
          items: phase.items.map(item => ({
              ...item, 
              status: 'pending' as const, 
              completedAt: undefined
          } as RoadmapItem))
      }));
      setRoadmap(resetMap);
      saveRoadmap(user.id, career.id, resetMap);
  };

  const handleResetAll = () => {
      if (window.confirm("Are you sure you want to reset all progress for all careers?")) {
          user.activeCareers.forEach(c => {
             const r = getRoadmap(user.id, c.careerId);
             if (r) {
                 const resetR = r.map(p => ({...p, items: p.items.map(i => ({...i, status: 'pending', completedAt: undefined} as RoadmapItem))}));
                 saveRoadmap(user.id, c.careerId, resetR);
             }
          });
          handleResetRoadmap();
      }
  };

  const handleAdaptation = async (
      type: 'compress_schedule' | 'simplify_schedule' | 'redistribute' | 'append_content' | 'increase_difficulty_same_time',
      customTargetDate?: string
  ) => {
      if (!currentCareerDetails || !roadmap) return;
      setIsAdapting(true);

      try {
          // 1. Preserve completed phases
          const completedPhases = roadmap.filter(p => p.items.every(i => i.status === 'completed'));
          const lastCompletedPhaseIndex = completedPhases.length; // 1-based index for next phase
          
          const { educationYear, targetCompletionDate, experienceLevel, focusAreas } = currentCareerDetails;
          
          let targetDateToUse = customTargetDate || targetCompletionDate;

          // Update User Profile if date changed
          if (targetDateToUse !== targetCompletionDate) {
              const updatedCareers = user.activeCareers.map(c => 
                  c.careerId === career.id ? { ...c, targetCompletionDate: targetDateToUse } : c
              );
              const u = { ...user, activeCareers: updatedCareers };
              setUser(u);
              saveUser(u);
          }

          const contextStr = `User has completed ${completedPhases.length} phases. Proceed to generate the REMAINING phases starting from Phase ${lastCompletedPhaseIndex + 1}.`;

          // Generate ONLY the future
          const newPhases = await generateRoadmap(
              career.title, 
              educationYear, 
              targetDateToUse, 
              experienceLevel,
              focusAreas,
              { type, progressStr: contextStr, startingPhaseNumber: lastCompletedPhaseIndex + 1 }
          );

          // Merge: Completed Phases + New Adapted Phases
          const finalMap = [...completedPhases, ...newPhases];

          setRoadmap(finalMap);
          saveRoadmap(user.id, career.id, finalMap);
          
          // Reset all modals
          setShowAdaptationModal(null);
          setShowDateStrategyModal(false);
          setShowDateEdit(false);
          setShowPhaseCompletionModal(false);

      } catch (e) {
          console.error("Adaptation failed", e);
      } finally {
          setIsAdapting(false);
      }
  };
  
  const handleFinishQuicker = () => {
      if (!currentCareerDetails || !roadmap) return;
      
      const daysNeeded = calculateRemainingDays(roadmap);
      
      const newTarget = new Date();
      newTarget.setHours(12, 0, 0, 0);
      const offset = Math.max(0, daysNeeded - 1);
      newTarget.setDate(newTarget.getDate() + offset);
      
      const year = newTarget.getFullYear();
      const month = String(newTarget.getMonth() + 1).padStart(2, '0');
      const day = String(newTarget.getDate()).padStart(2, '0');
      const newDateStr = `${year}-${month}-${day}`;

      const updatedCareers = user.activeCareers.map(c => 
          c.careerId === career.id ? { ...c, targetCompletionDate: newDateStr } : c
      );
      const u = { ...user, activeCareers: updatedCareers };
      setUser(u);
      saveUser(u);
      
      setShowPhaseCompletionModal(false);
  };

  const initiateDateUpdate = () => {
      if (!pendingTargetDate) return;
      if (!currentCareerDetails) return;
      
      const oldDateParts = currentCareerDetails.targetCompletionDate.split('-');
      const oldDate = new Date(parseInt(oldDateParts[0]), parseInt(oldDateParts[1]) - 1, parseInt(oldDateParts[2])).getTime();
      
      const newDateParts = pendingTargetDate.split('-');
      const newDate = new Date(parseInt(newDateParts[0]), parseInt(newDateParts[1]) - 1, parseInt(newDateParts[2])).getTime();
      
      setShowDateEdit(false);
      setShowDateStrategyModal(true);

      if (newDate > oldDate) {
          setDateStrategyType('extension');
      } else {
          setDateStrategyType('shortening');
      }
  };

  const handleSwitchCareer = (careerId: string) => {
    setIsRoadmapLoading(true);
    setShowCareerMenu(false);
    setRoadmap(null);
    setNews([]); 
    
    setTimeout(() => {
        const savedCareer = getCareerData(user.id, careerId);
        const savedRoadmap = getRoadmap(user.id, careerId);
        if (savedCareer) {
          setCareer(savedCareer);
          setRoadmap(savedRoadmap || []); 
          const updatedUser = { ...user, currentCareerId: careerId };
          setUser(updatedUser);
          saveUser(updatedUser);
        }
        setIsRoadmapLoading(false);
        setActiveTab('home'); 
    }, 50);
  };

  const handleSwitchCareerFromRoadmap = (careerId: string) => {
    setIsRoadmapLoading(true);
    setRoadmap(null);
    setTimeout(() => {
        const savedCareer = getCareerData(user.id, careerId);
        const savedRoadmap = getRoadmap(user.id, careerId);
        if (savedCareer) {
          setCareer(savedCareer);
          setRoadmap(savedRoadmap || []);
          const updatedUser = { ...user, currentCareerId: careerId };
          setUser(updatedUser);
          saveUser(updatedUser);
        }
        setIsRoadmapLoading(false);
    }, 50);
  };

  const handleDeleteCareer = (careerId: string) => {
      const updatedActiveCareers = user.activeCareers.filter(c => c.careerId !== careerId);
      let nextCareerId = user.currentCareerId;
      let nextCareerOption = null;
      let nextRoadmap = null;

      if (careerId === user.currentCareerId) {
          if (updatedActiveCareers.length > 0) {
              nextCareerId = updatedActiveCareers[0].careerId;
              nextCareerOption = getCareerData(user.id, nextCareerId);
              nextRoadmap = getRoadmap(user.id, nextCareerId);
          } else {
              nextCareerId = undefined;
          }
      } else {
          nextCareerId = user.currentCareerId;
          nextCareerOption = career;
          nextRoadmap = roadmap;
      }

      const updatedUser = { ...user, activeCareers: updatedActiveCareers, currentCareerId: nextCareerId };
      
      localStorage.removeItem(`pathfinder_career_data_${user.id}_${careerId}`);
      localStorage.removeItem(`pathfinder_roadmap_${user.id}_${careerId}`);
      
      setUser(updatedUser);
      saveUser(updatedUser);

      if (updatedActiveCareers.length === 0) {
          setCareer(null);
          setRoadmap(null);
          onAddCareer();
      } else if (careerId === user.currentCareerId) {
          setCareer(nextCareerOption);
          setRoadmap(nextRoadmap || []);
      }
  };

  const getDaysRemaining = () => {
      if (roadmap && roadmap.length > 0) {
          const allCompleted = roadmap.every(phase => phase.items.every(item => item.status === 'completed'));
          if (allCompleted) return 0;
      }

      if (!currentCareerDetails?.targetCompletionDate) return 0;
      
      const parts = currentCareerDetails.targetCompletionDate.split('-');
      if (parts.length !== 3) return 0;
      
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);

      const targetDate = new Date(year, month, day, 12, 0, 0); 
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 ? diffDays + 1 : 0;
  }

  const daysRemaining = getDaysRemaining();

  const getPacingStatus = () => {
      if (!currentCareerDetails) return { status: 'on-track', days: 0, message: '' } as const;
      const start = currentCareerDetails.addedAt;
      const end = new Date(currentCareerDetails.targetCompletionDate).getTime();
      const now = Date.now();
      const totalDuration = end - start;
      const elapsed = now - start;

      if (totalDuration <= 0) return { status: 'critical', days: 0, message: 'Target date passed' } as const;
      
      const expectedRatio = elapsed / totalDuration;
      const actualRatio = progress / 100;

      if (actualRatio >= expectedRatio + 0.05) {
          return { status: 'ahead', days: 0, message: 'Ahead of schedule' } as const;
      } else if (actualRatio < expectedRatio - 0.1) {
          const lagRatio = expectedRatio - actualRatio;
          const lagDays = Math.ceil((lagRatio * totalDuration) / (1000 * 60 * 60 * 24));
          return { status: 'behind', days: lagDays, message: `${lagDays} days behind` } as const;
      }
      return { status: 'on-track', days: 0, message: 'On track' } as const;
  };

  const pacing = getPacingStatus();

  // Modal Components
  const CelebrationModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500 rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.3)]">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/40">
                  <PartyPopper className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Career Mastered!</h2>
              <p className="text-slate-300 mb-8">You have completed 100% of the {career.title} roadmap.</p>
              <button onClick={() => setShowCelebration(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all">Continue Journey</button>
          </div>
      </div>
  );
  
  const PhaseCompletionModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl">
              <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Phase Completed!</h2>
              <p className="text-slate-300 mb-8">You've hit a milestone. How would you like to proceed?</p>
              
              {isAdapting ? (
                    <div className="py-8 flex flex-col items-center gap-4">
                         <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                         <span className="text-indigo-400 font-medium">Updating roadmap...</span>
                    </div>
              ) : (
                  <div className="space-y-3 text-left">
                      <button 
                          onClick={() => handleAdaptation('redistribute')}
                          className="w-full p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl transition-all flex items-center justify-between group"
                      >
                          <div>
                              <div className="font-bold text-white mb-1">Stay on Track (Redistribute)</div>
                              <div className="text-xs text-slate-400">Keep the same target date. Spread remaining tasks.</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400" />
                      </button>

                      <button 
                          onClick={() => handleAdaptation('increase_difficulty_same_time')}
                          className="w-full p-4 bg-slate-800 hover:bg-purple-900/20 border border-slate-700 hover:border-purple-500 rounded-xl transition-all flex items-center justify-between group"
                      >
                          <div>
                              <div className="font-bold text-white mb-1">Challenge Me</div>
                              <div className="text-xs text-slate-400">Keep the same target date. Add harder content.</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-purple-400" />
                      </button>
                      
                      <button 
                          onClick={handleFinishQuicker}
                          className="w-full p-4 bg-slate-800 hover:bg-emerald-900/20 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all flex items-center justify-between group"
                      >
                          <div>
                              <div className="font-bold text-white mb-1">Finish Quicker</div>
                              <div className="text-xs text-slate-400">Shorten the timeline to match remaining tasks.</div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />
                      </button>
                  </div>
              )}
              
              {!isAdapting && (
                  <button onClick={() => setShowPhaseCompletionModal(false)} className="mt-6 text-slate-500 text-sm hover:text-white">Dismiss</button>
              )}
          </div>
      </div>
  );

  const DateStrategyModal = () => (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">
                  {dateStrategyType === 'extension' ? "Target Date Extended" : "Timeline Shortened"}
              </h2>
              <p className="text-slate-300 mb-6">
                  {dateStrategyType === 'extension' 
                      ? "You have more time. How should we use it?" 
                      : "You have less time. How should we adapt?"}
              </p>
              
              {isAdapting ? (
                    <div className="py-8 flex flex-col items-center gap-4">
                         <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                         <span className="text-indigo-400 font-medium">Updating roadmap...</span>
                    </div>
              ) : (
                  <div className="space-y-4">
                      {dateStrategyType === 'extension' ? (
                          <>
                              <button 
                                  onClick={() => handleAdaptation('redistribute', pendingTargetDate)}
                                  className="w-full p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl transition-all text-left flex items-center justify-between group"
                              >
                                  <div>
                                      <div className="font-bold text-white mb-1">Redistribute (Relax Pace)</div>
                                      <div className="text-xs text-slate-400">Spread existing tasks.</div>
                                  </div>
                                  <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400" />
                              </button>
                              
                              <button 
                                  onClick={() => handleAdaptation('append_content', pendingTargetDate)}
                                  className="w-full p-4 bg-slate-800 hover:bg-emerald-900/20 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all text-left flex items-center justify-between group"
                              >
                                  <div>
                                      <div className="font-bold text-white mb-1">Append Difficulty</div>
                                      <div className="text-xs text-slate-400">Add advanced content at the end.</div>
                                  </div>
                                  <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />
                              </button>
                          </>
                      ) : (
                          <>
                              <button 
                                  onClick={() => handleAdaptation('compress_schedule', pendingTargetDate)}
                                  className="w-full p-4 bg-slate-800 hover:bg-orange-900/20 border border-slate-700 hover:border-orange-500 rounded-xl transition-all text-left flex items-center justify-between group"
                              >
                                  <div>
                                      <div className="font-bold text-white mb-1">Redistribute (High Pace)</div>
                                      <div className="text-xs text-slate-400">Compress tasks to fit.</div>
                                  </div>
                                  <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-orange-400" />
                              </button>

                              <button 
                                  onClick={() => handleAdaptation('simplify_schedule', pendingTargetDate)}
                                  className="w-full p-4 bg-slate-800 hover:bg-blue-900/20 border border-slate-700 hover:border-blue-500 rounded-xl transition-all text-left flex items-center justify-between group"
                              >
                                  <div>
                                      <div className="font-bold text-white mb-1">Reduce Content</div>
                                      <div className="text-xs text-slate-400">Remove topics to maintain pace.</div>
                                  </div>
                                  <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400" />
                              </button>
                          </>
                      )}
                  </div>
              )}
              
              {!isAdapting && (
                  <button onClick={() => setShowDateStrategyModal(false)} className="mt-6 text-slate-500 text-sm hover:text-white">Cancel</button>
              )}
          </div>
      </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 mt-1">Track your journey to becoming a <span className="text-indigo-400 font-semibold">{career.title}</span>.</p>
              </div>
              <div className="relative z-30">
                 <button 
                   onClick={() => setShowCareerMenu(!showCareerMenu)}
                   className="flex items-center gap-2 bg-slate-800 text-slate-300 px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium w-full md:w-auto justify-between min-w-[200px]"
                 >
                   <div className="flex items-center gap-2 truncate">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0"></div>
                      <span className="truncate">{career.title}</span>
                   </div>
                   <ChevronDown className="h-4 w-4 shrink-0" />
                 </button>
                 
                 {showCareerMenu && (
                   <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                     <div className="p-2 space-y-1">
                       <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch Career Path</div>
                       {user.activeCareers.map(c => (
                         <button 
                            key={c.careerId} 
                            onClick={() => handleSwitchCareer(c.careerId)}
                            className={`w-full text-left px-3 py-3 rounded-lg text-sm flex items-center justify-between ${c.careerId === career.id ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                          >
                            <span className="truncate">{c.title}</span>
                            {c.careerId === career.id && <Target className="h-3 w-3 shrink-0" />}
                         </button>
                       ))}
                       <div className="h-px bg-slate-800 my-2" />
                       <button onClick={() => onAddCareer()} className="w-full text-left px-3 py-2 rounded-lg text-sm text-indigo-400 hover:bg-slate-800 flex items-center gap-2 font-medium">
                          <PlusCircle className="h-4 w-4" /> Add New Path
                       </button>
                     </div>
                   </div>
                 )}
              </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-900/50 p-8 rounded-3xl border border-slate-800 relative overflow-hidden shadow-lg min-h-[240px] flex flex-col justify-center">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Trophy className="h-40 w-40 text-indigo-500" />
                  </div>
                  <h3 className="text-slate-400 font-medium mb-6 flex items-center gap-2"><Target className="h-4 w-4 text-indigo-400" /> Goal Completion</h3>
                  <div className="flex items-baseline gap-4 mb-6">
                    <span className="text-6xl font-bold text-white">{progress}%</span>
                    <span className="text-slate-500 font-medium">completed</span>
                  </div>
                  <div className="space-y-2 relative z-10">
                     <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Start</span>
                        <span>Goal</span>
                     </div>
                     <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div 
                        className="h-full bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                        style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                  </div>
               </div>

               <div className="flex flex-col gap-6 h-full">
                  <div className={`flex-1 p-6 rounded-3xl border flex flex-col justify-center min-h-[110px] ${pacing.status === 'behind' ? 'bg-red-900/10 border-red-500/30' : pacing.status === 'ahead' ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
                     <div className="flex items-center gap-3 mb-2">
                        {pacing.status === 'behind' ? <AlertCircle className="h-5 w-5 text-red-400" /> : pacing.status === 'ahead' ? <Trophy className="h-5 w-5 text-emerald-400" /> : <Clock className="h-5 w-5 text-blue-400" />}
                        <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Pacing Status</span>
                     </div>
                     <div className={`text-2xl font-bold ${pacing.status === 'behind' ? 'text-red-400' : pacing.status === 'ahead' ? 'text-emerald-400' : 'text-white'}`}>
                         {pacing.message}
                     </div>
                  </div>

                  <div className="flex-1 bg-slate-900 p-6 rounded-3xl border border-slate-800 flex items-center justify-between min-h-[110px] relative group">
                     <div className="flex items-center gap-4">
                         <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0">
                           <Calendar className="h-6 w-6" />
                         </div>
                         <div>
                           <div className="text-3xl font-bold text-white">{daysRemaining}</div>
                           <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Days Left</div>
                         </div>
                     </div>
                     <button 
                        onClick={() => {
                            setPendingTargetDate(currentCareerDetails?.targetCompletionDate || '');
                            setShowDateEdit(true);
                        }}
                        className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100"
                        title="Edit Target Date"
                     >
                        <Pencil className="h-4 w-4" />
                     </button>
                  </div>
               </div>
            </div>

            {/* News Section - List View */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative min-h-[300px]">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-indigo-500/20 rounded-lg">
                   <TrendingUp className="h-5 w-5 text-indigo-400" />
                 </div>
                 <h2 className="text-xl font-bold text-white">Industry Intel</h2>
                 <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                    {isNewsLoading ? (
                        <span className="flex items-center gap-1 text-indigo-400">
                            <RefreshCw className="h-3 w-3 animate-spin" /> Updating...
                        </span>
                    ) : (
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500" /> Live Updates</span>
                    )}
                 </span>
              </div>
              
              <div className="space-y-3">
                  {isNewsLoading && news.length === 0 ? (
                      // Skeletons
                      [1,2,3,4].map(i => (
                          <div key={i} className="h-14 bg-slate-800/30 rounded-xl animate-pulse border border-slate-800/50"></div>
                      ))
                  ) : (
                      news.map((n, i) => {
                          return (
                          <div 
                              key={i} 
                              className={`rounded-xl border transition-all duration-300 overflow-hidden ${expandedNewsIndex === i ? 'bg-slate-800/40 border-indigo-500/30 shadow-lg' : 'bg-slate-950/30 border-slate-800 hover:border-slate-700'}`}
                          >
                              <button 
                                  onClick={() => setExpandedNewsIndex(expandedNewsIndex === i ? null : i)}
                                  className="w-full flex items-center justify-between p-4 text-left gap-4"
                              >
                                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 overflow-hidden flex-1">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800 shrink-0 self-start md:self-auto flex items-center gap-1">
                                          {n.source} {n.date && `• ${n.date}`}
                                      </span>
                                      <span className={`font-semibold text-sm truncate ${expandedNewsIndex === i ? 'text-white' : 'text-slate-300'}`}>
                                          {n.title}
                                      </span>
                                  </div>
                                  {expandedNewsIndex === i ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                              </button>
                              
                              {expandedNewsIndex === i && (
                                  <div className="px-4 pb-4 pt-0 animate-fade-in">
                                      <div className="pt-3 border-t border-slate-700/50">
                                          <p className="text-sm text-slate-400 leading-relaxed mb-4">{n.summary}</p>
                                          <a 
                                              href={n.url} 
                                              target="_blank" 
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
                                          >
                                              Read Full Story <ExternalLink className="h-3 w-3" />
                                          </a>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )})
                  )}
              </div>
            </div>
          </div>
        );
      case 'roadmap':
        return <Roadmap 
            roadmap={roadmap} 
            user={user} 
            onSubscribe={handleSubscribe} 
            onUpdateProgress={handleProgress}
            onReset={handleResetRoadmap}
            onResetPhase={handleResetPhase}
            onSwitchCareer={handleSwitchCareerFromRoadmap}
            onEditTargetDate={() => {
                setPendingTargetDate(currentCareerDetails?.targetCompletionDate || '');
                setShowDateEdit(true);
            }}
            pacing={pacing}
            isLoading={isRoadmapLoading}
            daysRemaining={daysRemaining}
        />;
      case 'career':
        return (
          <div className="p-6 md:p-8 bg-slate-900 rounded-3xl border border-slate-800 min-h-[80vh]">
            <h2 className="text-2xl font-bold text-white mb-6">Career Architecture</h2>
            
            <div className="space-y-6">
                {user.activeCareers.map((c) => {
                    const isCurrent = c.careerId === career.id;
                    return (
                        <div key={c.careerId} className={`p-6 rounded-2xl border ${isCurrent ? 'bg-slate-950 border-indigo-500/50 shadow-lg shadow-indigo-900/10' : 'bg-slate-900 border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-700'} transition-all relative overflow-hidden`}>
                             {isCurrent && <div className="absolute top-0 right-0 p-2"><div className="text-[10px] font-bold bg-indigo-500 text-white px-2 py-1 rounded-bl-xl">ACTIVE</div></div>}
                             
                             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{c.title}</h3>
                                    <p className="text-sm text-slate-500">Started {new Date(c.addedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {c.experienceLevel && (
                                        <span className="text-xs font-mono border border-slate-700 px-2 py-1 rounded text-slate-400 capitalize">{c.experienceLevel}</span>
                                    )}
                                    <span className="text-xs font-mono border border-slate-700 px-2 py-1 rounded text-slate-400">Target: {c.targetCompletionDate}</span>
                                </div>
                             </div>

                             <div className="flex gap-3">
                                 {!isCurrent && (
                                     <button 
                                        onClick={() => handleSwitchCareer(c.careerId)}
                                        className="px-4 py-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                     >
                                         <Target className="h-4 w-4" /> Switch to this
                                     </button>
                                 )}
                                 <button 
                                    onClick={() => {
                                        if(window.confirm(`Delete ${c.title}? This cannot be undone.`)) {
                                            handleDeleteCareer(c.careerId);
                                        }
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-slate-400 hover:bg-red-900/20 hover:text-red-400 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                 >
                                     <Trash2 className="h-4 w-4" /> Delete
                                 </button>
                             </div>
                        </div>
                    );
                })}

                <button onClick={() => onAddCareer()} className="w-full flex items-center justify-center gap-2 p-6 border border-dashed border-slate-700 rounded-2xl text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-slate-800 transition-all group">
                  <PlusCircle className="h-6 w-6 group-hover:text-indigo-400 transition-colors" />
                  <span className="font-medium">Explore & Add New Career Path</span>
               </button>
            </div>
          </div>
        );
      case 'profile':
        return (
           <div className="space-y-6">
             <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex items-center gap-6">
                <div className="h-24 w-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-indigo-900/30 shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-white">{user.username}</h2>
                    <p className="text-slate-500 mb-3">Member since 2024</p>
                    <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${user.subscriptionStatus !== 'free' ? 'bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                        {user.subscriptionStatus} Plan
                    </span>
                </div>
             </div>

             <div className="bg-slate-900 p-4 rounded-3xl border border-slate-800 space-y-2">
                 <div className="p-4 border-b border-slate-800 mb-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Account Controls</h3>
                 </div>
                 <button 
                    onClick={handleResetAll}
                    className="w-full flex items-center justify-between p-4 hover:bg-red-900/10 rounded-xl transition-colors text-left group"
                 >
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-red-900/20 transition-colors text-red-400"><RotateCcw className="h-5 w-5" /></div>
                        <span className="font-medium text-slate-300 group-hover:text-red-300">Reset All Progress</span>
                    </div>
                 </button>
                 <button onClick={onLogout} className="w-full flex items-center justify-between p-4 hover:bg-red-900/10 rounded-xl transition-colors text-left text-red-400 group">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-red-900/20 transition-colors"><LogOut className="h-5 w-5" /></div>
                        <span className="font-medium">Log Out</span>
                    </div>
                 </button>
             </div>
           </div>
        );
    }
  };

  return (
    <div className="min-h-screen md:pb-0 md:pl-24 bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {showCelebration && <CelebrationModal />}
      {showPhaseCompletionModal && <PhaseCompletionModal />}
      
      {showAdaptationModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-2">Schedule Adjustment</h2>
                <p className="text-slate-300 mb-6">{adaptationMessage}</p>
                
                {isAdapting ? (
                    <div className="py-8 flex flex-col items-center gap-4">
                         <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                         <span className="text-indigo-400 font-medium">Updating roadmap...</span>
                    </div>
                ) : (
                     <div className="space-y-3">
                        <button 
                            onClick={() => handleAdaptation('increase_difficulty_same_time')}
                            className="w-full p-4 bg-slate-800 hover:bg-purple-900/20 border border-slate-700 hover:border-purple-500 rounded-xl transition-all text-left flex items-center justify-between group"
                        >
                            <div>
                                <div className="font-bold text-white mb-1">Increase Difficulty</div>
                                <div className="text-xs text-slate-400">Add more advanced topics for the remaining days.</div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-purple-400" />
                        </button>
                        
                        <button 
                            onClick={() => setShowAdaptationModal(null)}
                            className="w-full p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all text-left flex items-center justify-center"
                        >
                            <span className="font-medium text-slate-300">Dismiss</span>
                        </button>
                     </div>
                )}
            </div>
          </div>
      )}
      {showDateStrategyModal && <DateStrategyModal />}
      
      {/* Date Edit Modal */}
      {showDateEdit && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full text-center">
                  <h3 className="text-xl font-bold text-white mb-4">Change Target Date</h3>
                  <input 
                    type="date" 
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white mb-6 color-scheme-dark focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    value={pendingTargetDate}
                    onChange={e => setPendingTargetDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <div className="flex gap-3">
                      <button onClick={() => setShowDateEdit(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">Cancel</button>
                      <button 
                        onClick={initiateDateUpdate}
                        disabled={!pendingTargetDate}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
                      >
                          Update
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-24 bg-slate-900 border-r border-slate-800 flex-col items-center py-8 z-50">
        <div className="mb-12 text-indigo-500 bg-slate-950 p-3 rounded-xl border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <Map className="h-8 w-8" />
        </div>
        <div className="flex flex-col gap-8 w-full">
            {[
                { id: 'home', icon: Home, label: 'Home' },
                { id: 'roadmap', icon: Map, label: 'Roadmap' },
                { id: 'career', icon: Briefcase, label: 'Career' },
                { id: 'profile', icon: User, label: 'Profile' },
            ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`relative flex flex-col items-center gap-2 py-2 transition-all w-full border-r-2 ${activeTab === item.id ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                >
                    <item.icon className={`h-6 w-6 ${activeTab === item.id ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]' : ''}`} />
                    <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                </button>
            ))}
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around py-3 px-2 z-50 pb-safe backdrop-blur-xl bg-opacity-90">
         {[
                { id: 'home', icon: Home, label: 'Home' },
                { id: 'roadmap', icon: Map, label: 'Roadmap' },
                { id: 'career', icon: Briefcase, label: 'Career' },
                { id: 'profile', icon: User, label: 'Profile' },
            ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === item.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}
                >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                </button>
            ))}
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-6 pt-8 md:pt-8 min-h-screen flex flex-col pb-24 md:pb-0">
        <div className="flex-1">
            {renderContent()}
        </div>
        
        <footer className="py-4 mt-auto border-t border-slate-800/50 text-center text-slate-500">
            <p className="text-[10px] md:text-xs font-medium tracking-wide">
                Developed by © Hameed Afsar K M
            </p>
        </footer>
      </main>
      
      <style>{`
        .animate-fade-in {
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); filter: blur(10px); }
            to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
    </div>
  );
};
