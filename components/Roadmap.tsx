import React, { useState, useEffect } from 'react';
import { RoadmapPhase, UserProfile, RoadmapItem } from '../types';
import { Subscription } from './Subscription';
import { CheckCircle2, Circle, ExternalLink, RefreshCw, Briefcase, Award, Code, Zap, Clock, ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle, RotateCcw, Target, Pencil, Check, Filter, ArrowRight } from 'lucide-react';

interface PacingStatus { status: 'ahead' | 'behind' | 'on-track' | 'critical'; days: number; message: string; }
interface RoadmapProps {
  roadmap: RoadmapPhase[] | null; user: UserProfile; onSubscribe: (plan: 'monthly' | 'yearly') => void; onUpdateProgress: (itemId: string) => void;
  onReset: () => void; onResetPhase: (phaseIndex: number) => void; onSwitchCareer: (careerId: string) => void; onEditTargetDate: () => void;
  pacing: PacingStatus; isLoading?: boolean; daysRemaining: number; searchQuery?: string;
}
type FilterType = 'all' | 'skill' | 'project' | 'internship' | 'certificate';

export const Roadmap: React.FC<RoadmapProps> = ({ roadmap, user, onSubscribe, onUpdateProgress, onReset, onResetPhase, onSwitchCareer, onEditTargetDate, pacing, isLoading, daysRemaining, searchQuery = '' }) => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [itemToConfirm, setItemToConfirm] = useState<RoadmapItem | null>(null);
  const [resetIntent, setResetIntent] = useState<{type: 'all' | 'phase', index: number} | null>(null);
  const [showCareerMenu, setShowCareerMenu] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const isPaid = user.subscriptionStatus !== 'free';

  useEffect(() => {
    if (roadmap && !isLoading && !searchQuery) {
        let activeIdx = 0;
        for (let i = 0; i < roadmap.length; i++) {
            if (roadmap[i].items.some(it => it.status === 'pending')) { activeIdx = i; break; }
        }
        setExpandedPhase(activeIdx);
    }
  }, [roadmap, isLoading, searchQuery]);

  const confirmCompletion = () => {
      if (itemToConfirm) {
          const id = itemToConfirm.id; setItemToConfirm(null); setAnimatingId(id);
          setTimeout(() => { onUpdateProgress(id); setAnimatingId(null); }, 800);
      }
  };

  const confirmReset = () => {
      if (!resetIntent) return;
      resetIntent.type === 'all' ? onReset() : onResetPhase(resetIntent.index);
      setResetIntent(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Code className="h-4 w-4 text-cyan-400" />;
      case 'internship': return <Briefcase className="h-4 w-4 text-purple-400" />;
      case 'certificate': return <Award className="h-4 w-4 text-orange-400" />;
      default: return <Zap className="h-4 w-4 text-[var(--primary-400)]" />;
    }
  };

  const filterItems = (items: RoadmapItem[]) => items.filter(item => (activeFilter === 'all' || item.type === activeFilter) && (searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase())));

  if (isLoading || !roadmap) return <div className="p-8 space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 glass-card rounded-2xl animate-pulse"></div>)}</div>;

  return (
    <div className="relative min-h-[80vh] pb-20">
      {!isPaid && <Subscription onSubscribe={onSubscribe} />}
      
      {/* Modals */}
      {itemToConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass-card p-6 rounded-3xl max-w-sm w-full relative border-[var(--border-color)]">
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Complete Task?</h3>
                <p className="text-[var(--text-muted)] text-sm mb-6">{itemToConfirm.title}</p>
                <div className="flex gap-3"><button onClick={() => setItemToConfirm(null)} className="flex-1 py-3 bg-[var(--bg-main)]/50 rounded-xl text-[var(--text-muted)] font-bold hover:bg-[var(--bg-card-hover)]">Cancel</button><button onClick={confirmCompletion} className="flex-1 py-3 bg-[var(--primary-600)] rounded-xl text-white font-bold hover:bg-[var(--primary-500)]">Confirm</button></div>
            </div>
        </div>
      )}
      {resetIntent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="glass-card p-6 rounded-3xl max-w-sm w-full border-red-500/30">
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Reset Progress?</h3>
                <p className="text-[var(--text-muted)] text-sm mb-6">This cannot be undone.</p>
                <div className="flex gap-3"><button onClick={() => setResetIntent(null)} className="flex-1 py-3 bg-[var(--bg-main)]/50 rounded-xl text-[var(--text-muted)] font-bold">Cancel</button><button onClick={confirmReset} className="flex-1 py-3 bg-red-600 rounded-xl text-white font-bold">Reset</button></div>
            </div>
        </div>
      )}

      {/* Header */}
      <div className={`glass-card p-6 rounded-[2rem] mb-8 sticky top-24 z-30 backdrop-blur-xl border border-[var(--border-color)] ${!isPaid ? 'blur-sm pointer-events-none' : ''}`}>
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div className="relative">
                 <button onClick={() => setShowCareerMenu(!showCareerMenu)} className="flex items-center gap-2 text-2xl font-bold text-[var(--text-main)] hover:opacity-80">
                     {user.activeCareers.find(c => c.careerId === user.currentCareerId)?.title} <ChevronDown className="h-5 w-5 text-[var(--text-muted)]" />
                 </button>
                 {showCareerMenu && <div className="absolute top-full left-0 mt-2 w-64 glass-card rounded-2xl p-2 z-50 animate-fade-in shadow-2xl border-[var(--border-color)]">{user.activeCareers.map(c => <button key={c.careerId} onClick={() => {onSwitchCareer(c.careerId); setShowCareerMenu(false)}} className={`w-full text-left p-3 rounded-xl text-sm font-medium ${c.careerId === user.currentCareerId ? 'bg-[var(--primary-600)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-main)]'}`}>{c.title}</button>)}</div>}
             </div>
             <div className="flex gap-2">
                 {(['all', 'skill', 'project', 'internship', 'certificate'] as const).map(f => (
                     <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${activeFilter === f ? 'bg-[var(--primary-500-20)] border-[var(--primary-500)] text-[var(--primary-400)]' : 'bg-transparent border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'}`}>{f}</button>
                 ))}
                 <button onClick={() => setResetIntent({type:'all', index: -1})} className="p-2 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"><RotateCcw className="h-4 w-4"/></button>
             </div>
         </div>
      </div>

      {/* Timeline View */}
      <div className={`pl-4 md:pl-8 space-y-8 ${!isPaid ? 'blur-sm select-none pointer-events-none h-[60vh] overflow-hidden' : ''}`}>
          {roadmap.map((phase, pIndex) => {
              const visibleItems = filterItems(phase.items);
              if (visibleItems.length === 0) return null;
              const completedCount = phase.items.filter(i => i.status === 'completed').length;
              const isPhaseDone = completedCount === phase.items.length;
              const isActive = expandedPhase === pIndex || searchQuery !== '';

              return (
                  <div key={pIndex} className="relative group">
                      {/* Metro Line */}
                      <div className={`absolute left-[19px] top-12 bottom-0 w-0.5 ${isPhaseDone ? 'bg-emerald-500/50' : `bg-gradient-to-b from-[var(--primary-500-50)] to-transparent`} group-last:hidden`}></div>
                      
                      <div onClick={() => setExpandedPhase(isActive ? null : pIndex)} className="flex items-center gap-6 cursor-pointer mb-6">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${isPhaseDone ? 'bg-emerald-500 text-white border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : isActive ? 'bg-[var(--primary-600)] text-white border-[var(--primary-400)] shadow-[0_0_15px_var(--primary-500-50)]' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                               {isPhaseDone ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{pIndex + 1}</span>}
                           </div>
                           <div className="flex-1 glass-card p-4 rounded-2xl flex justify-between items-center group-hover:bg-[var(--bg-card-hover)] transition-colors border-[var(--border-color)]">
                               <div>
                                   <h3 className="text-lg font-bold text-[var(--text-main)]">{phase.phaseName}</h3>
                                   <div className="h-1 w-24 bg-[var(--bg-main)]/50 rounded-full mt-2 overflow-hidden"><div className={`h-full ${isPhaseDone ? 'bg-emerald-500' : 'bg-[var(--primary-500)]'}`} style={{width: `${(completedCount/phase.items.length)*100}%`}}></div></div>
                               </div>
                               <div className="flex gap-2">
                                   {completedCount > 0 && !isPhaseDone && <button onClick={(e) => {e.stopPropagation(); setResetIntent({type:'phase', index: pIndex})}} className="p-2 text-[var(--text-muted)] hover:text-red-400"><RotateCcw className="h-4 w-4"/></button>}
                                   {isActive ? <ChevronUp className="h-5 w-5 text-[var(--text-muted)]"/> : <ChevronDown className="h-5 w-5 text-[var(--text-muted)]"/>}
                               </div>
                           </div>
                      </div>

                      {isActive && (
                          <div className="pl-16 space-y-4 animate-fade-in pb-8">
                              {visibleItems.map((item) => {
                                  const isDone = item.status === 'completed';
                                  const isAnim = animatingId === item.id;
                                  return (
                                      <div key={item.id} className={`glass-card p-5 rounded-2xl border transition-all duration-500 flex flex-col md:flex-row gap-4 items-start md:items-center relative overflow-hidden ${isAnim ? 'scale-[1.02] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : isDone ? 'opacity-60 border-emerald-500/20' : 'hover:bg-[var(--bg-card-hover)] border-[var(--border-color)]'}`}>
                                          <div className={`p-2 rounded-lg ${isDone ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--bg-main)]/50 text-[var(--text-muted)]'}`}>{getTypeIcon(item.type)}</div>
                                          <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-main)]/50 px-2 py-0.5 rounded">{item.duration}</span></div>
                                              <h4 className={`font-semibold text-[var(--text-main)] ${isDone && !isAnim ? 'line-through text-[var(--text-muted)]' : ''}`}>{item.title}</h4>
                                          </div>
                                          <div className="flex items-center gap-3">
                                               {item.link && <a href={item.link} target="_blank" className="p-2 rounded-lg bg-[var(--bg-main)]/50 text-[var(--primary-400)] hover:bg-[var(--bg-card-hover)]"><ExternalLink className="h-4 w-4"/></a>}
                                               <button onClick={(e) => {e.stopPropagation(); if(!isDone) setItemToConfirm(item)}} className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${isDone || isAnim ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--bg-main)]/50 text-[var(--text-muted)] hover:bg-[var(--primary-600)] hover:text-white'}`}>
                                                   {isDone || isAnim ? <>Completed <CheckCircle2 className="h-3 w-3"/></> : "Mark Done"}
                                               </button>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      )}
                  </div>
              )
          })}
      </div>
    </div>
  );
};
