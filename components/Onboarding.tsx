import React, { useState } from 'react';
import { CareerOption, UserProfile, SkillAssessment } from '../types';
import { analyzeInterests, searchCareers, generateSkillAssessment } from '../services/gemini';
import { Sparkles, CheckCircle, BookOpen, Clock, Target, ChevronRight, ArrowLeft, Search, RefreshCw, BrainCircuit, ArrowRight as ArrowIcon, Compass } from 'lucide-react';

interface OnboardingProps {
  onComplete: (career: CareerOption, eduYear: string, targetDate: string, expLevel: 'beginner' | 'intermediate' | 'advanced', focusAreas: string) => void;
  isNewUser?: boolean;
  mode?: 'analysis' | 'search';
  userTheme?: UserProfile['theme'];
}

interface Question {
  id: string; text: string; type: 'mcq' | 'text'; options?: string[]; allowOther?: boolean; context: 'general' | 'upskill' | 'both';
}

const GENERAL_QUESTIONS: Question[] = [
  { id: 'goal', text: "What is your primary objective today?", type: 'mcq', options: ["Discover a new career path", "Upskill in my current field", "Switch from a different field"], context: 'general', allowOther: false },
  { id: 'interests', text: "What topics naturally draw your attention?", type: 'mcq', options: ["Technology & Coding", "Art & Design", "Business & Finance", "Science & Research"], allowOther: true, context: 'general' },
  { id: 'work_style', text: "How do you prefer to solve problems?", type: 'mcq', options: ["Building things (Engineering)", "Analyzing data (Logic)", "Leading teams (Management)", "Creating visuals (Creative)"], allowOther: true, context: 'general' },
  { id: 'environment', text: "Pick your ideal work environment.", type: 'mcq', options: ["Remote / Home Office", "Fast-paced Startup", "Structured Corporate", "Creative Studio"], allowOther: true, context: 'general' },
  { id: 'impact', text: "What kind of impact matters most?", type: 'mcq', options: ["Solving complex technical problems", "Improving people's daily lives", "Creating beautiful experiences", "Driving financial growth"], allowOther: true, context: 'general' },
  { id: 'subjects', text: "Which activity describes your free time?", type: 'mcq', options: ["Gaming or Tinkering", "Reading or Writing", "Socializing", "Drawing or Crafting"], allowOther: true, context: 'general' },
  { id: 'pace', text: "Preferred work pace?", type: 'mcq', options: ["Steady and Predictable", "Fast and deadline-driven", "Flexible", "Collaborative"], allowOther: true, context: 'general' },
  { id: 'team_dynamic', text: "Team preference?", type: 'mcq', options: ["Independent contributor", "Small squad", "Large structured team", "Leading others"], allowOther: true, context: 'general' },
  { id: 'tools', text: "Preferred tools?", type: 'mcq', options: ["Code & Terminal", "Spreadsheets & Data", "Design Software", "Communication Tools"], allowOther: true, context: 'general' },
  { id: 'success', text: "Success in 5 years looks like...", type: 'mcq', options: ["Subject Matter Expert", "Business Owner", "Corporate Leader", "Work-life Balance"], allowOther: true, context: 'general' }
];

const UPSKILL_QUESTIONS: Question[] = [
  { id: 'current_role', text: "What is your current role or field?", type: 'text', context: 'upskill' },
  { id: 'focus_gap', text: "Biggest gap in your skillset?", type: 'mcq', options: ["Modern Frameworks", "System Architecture", "Leadership", "Backend Engineering", "AI/ML"], allowOther: true, context: 'upskill' },
  { id: 'learning_style', text: "How do you learn best?", type: 'mcq', options: ["Hands-on Projects", "Deep Theory", "Video Tutorials", "Interactive Coding"], allowOther: false, context: 'upskill' },
  { id: 'time_commitment', text: "Daily time commitment?", type: 'mcq', options: ["< 1 hour", "1-2 hours", "3-5 hours", "Full time"], allowOther: false, context: 'upskill' }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isNewUser = true, mode = 'analysis', userTheme }) => {
  const [step, setStep] = useState<'questions' | 'analysis' | 'selection' | 'assessment' | 'experience' | 'details'>(mode === 'search' ? 'selection' : 'questions');
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(GENERAL_QUESTIONS);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherInput, setOtherInput] = useState('');
  
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [assessment, setAssessment] = useState<SkillAssessment | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<number[]>([]);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);

  const [eduYear, setEduYear] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [expLevel, setExpLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [focusAreas, setFocusAreas] = useState('');

  // --- Handlers ---
  const handleMCQSelect = (option: string) => {
    const currentQ = activeQuestions[currentQIndex];
    const newAnswers = { ...answers, [currentQ.text]: option };
    setAnswers(newAnswers); setOtherInput('');

    if (currentQ.id === 'goal') {
        if (option.includes("Upskill")) setActiveQuestions([activeQuestions[0], ...UPSKILL_QUESTIONS]);
        else setActiveQuestions(GENERAL_QUESTIONS);
    }

    if (currentQIndex < activeQuestions.length - 1) setTimeout(() => setCurrentQIndex(prev => prev + 1), 300);
    else performAnalysis(newAnswers);
  };

  const handleTextSubmit = () => {
    if (!otherInput.trim()) return;
    const currentQ = activeQuestions[currentQIndex];
    const newAnswers = { ...answers, [currentQ.text]: otherInput };
    setAnswers(newAnswers); setOtherInput('');
    if (currentQIndex < activeQuestions.length - 1) setCurrentQIndex(prev => prev + 1);
    else performAnalysis(newAnswers);
  };

  const performAnalysis = async (finalAnswers: Record<string, string>) => {
    setStep('analysis'); setIsAnalyzing(true);
    try {
      const answerArray = Object.entries(finalAnswers).map(([q, a]) => `${q}: ${a}`);
      const results = await analyzeInterests(answerArray);
      setCareers(results); setStep('selection');
    } catch (e) {
      setCareers([ { id: '1', title: 'Full Stack Developer', description: 'Build end-to-end web applications.', fitScore: 90, reason: 'Matched interest in coding.'} ]);
      setStep('selection');
    } finally { setIsAnalyzing(false); }
  };

  const handleSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try { const results = await searchCareers(searchQuery); setCareers(results); } catch(e) {} finally { setIsSearching(false); }
  };

  const handleSuggestMore = async () => {
     setIsSearching(true);
     try {
         const answerArray = Object.entries(answers).map(([q, a]) => `${q}: ${a}`);
         const results = await analyzeInterests(answerArray);
         setCareers(prev => [...prev, ...results].slice(0, 9));
     } catch(e) {} finally { setIsSearching(false); }
  };

  const startAssessment = async (career: CareerOption) => {
      setSelectedCareer(career); setStep('assessment'); setIsAssessmentLoading(true);
      try { const quiz = await generateSkillAssessment(career.title); setAssessment(quiz); setAssessmentAnswers(new Array(quiz.questions.length).fill(-1)); } 
      catch (e) { setStep('experience'); } finally { setIsAssessmentLoading(false); }
  };

  const submitAssessment = () => {
      if (!assessment) return;
      let score = 0; assessment.questions.forEach((q, i) => { if (assessmentAnswers[i] === q.correctIndex) score++; });
      if (score === assessment.questions.length) setExpLevel('advanced');
      else if (score > 0) setExpLevel('intermediate');
      else setExpLevel('beginner');
      setStep('experience');
  };

  const handleFinalSubmit = () => {
    if (selectedCareer && eduYear && targetDate) {
      const upskillContext = answers['What is the biggest gap in your current skillset?'] ? `Focus heavily on ${answers['What is the biggest gap in your current skillset?']}. ` : '';
      onComplete(selectedCareer, eduYear, targetDate, expLevel, upskillContext + focusAreas);
    }
  };

  // --- UI COMPONENTS ---
  
  if (step === 'questions') {
    const q = activeQuestions[currentQIndex];
    const progress = ((currentQIndex) / activeQuestions.length) * 100;
    return (
      <div className="min-h-screen flex flex-col p-6 max-w-4xl mx-auto">
        <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden"><div className="h-full bg-[var(--primary-500)] transition-all duration-500" style={{ width: `${progress}%` }}></div></div>
        
        <div className="flex-1 flex flex-col justify-center animate-fade-in">
          <span className="text-[var(--primary-400)] font-bold uppercase tracking-wider text-sm mb-4">Question {currentQIndex + 1} of {activeQuestions.length}</span>
          <h2 className="text-3xl md:text-5xl font-bold text-[var(--text-main)] mb-10 leading-tight">{q.text}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {q.type === 'mcq' && q.options?.map((opt) => (
                 <button key={opt} onClick={() => handleMCQSelect(opt)} className="glass-card hover:bg-[var(--bg-card-hover)] p-6 rounded-2xl text-left transition-all hover:scale-[1.02] border-l-4 border-transparent hover:border-l-[var(--primary-500)] group">
                    <span className="text-lg font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)]">{opt}</span>
                 </button>
             ))}
             {(q.type === 'text' || q.allowOther) && (
                 <div className="relative md:col-span-2">
                     <input type="text" placeholder={q.type === 'text' ? "Your answer..." : "Other..."} className="w-full p-6 rounded-2xl glass-card text-[var(--text-main)] focus:border-[var(--primary-500-50)] outline-none text-lg placeholder-[var(--text-muted)]" value={otherInput} onChange={e => setOtherInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()} autoFocus={q.type === 'text'}/>
                     {otherInput && <button onClick={handleTextSubmit} className="absolute right-4 top-4 bottom-4 px-6 rounded-xl bg-[var(--primary-600)] text-white font-bold">Next</button>}
                 </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analysis' || isAnalyzing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="relative">
           <div className="w-32 h-32 bg-[var(--primary-500-20)] rounded-full blur-2xl absolute inset-0 animate-pulse"></div>
           <Sparkles className="h-24 w-24 text-[var(--primary-400)] relative z-10 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <h2 className="text-3xl font-bold text-[var(--text-main)] mt-8 mb-2">Architecting Your Path...</h2>
        <p className="text-[var(--text-muted)]">Analyzing your profile against millions of data points.</p>
      </div>
    );
  }

  if (step === 'selection') {
    return (
      <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div><h2 className="text-4xl font-bold text-[var(--text-main)] mb-2">Your Matches</h2><p className="text-[var(--text-muted)]">Select a path to construct your roadmap.</p></div>
            <div className="relative w-full md:w-96">
                <input type="text" placeholder="Search specific path..." className="w-full pl-12 pr-4 py-4 glass-card rounded-2xl text-[var(--text-main)] outline-none focus:border-[var(--primary-500-50)]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}/>
                <Search className="absolute left-4 top-4.5 h-5 w-5 text-[var(--text-muted)]" />
                {searchQuery && <button onClick={handleSearch} disabled={isSearching} className="absolute right-3 top-3 px-3 py-1.5 bg-slate-800 rounded-lg text-xs font-bold text-white">Go</button>}
            </div>
        </header>

        {isSearching ? <div className="h-64 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-[var(--primary-500)] border-t-transparent rounded-full"></div></div> : (
            <>
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                {careers.map(career => (
                    <div key={career.id} onClick={() => startAssessment(career)} className="glass-card p-8 rounded-[2rem] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all duration-300 group hover:-translate-y-2 relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-3 bg-[var(--primary-500-20)] rounded-bl-2xl text-[var(--primary-400)] font-bold text-sm tracking-wide">{career.fitScore}% FIT</div>
                         <div className="w-12 h-12 rounded-xl bg-[var(--primary-500-20)] flex items-center justify-center text-[var(--primary-400)] mb-6 group-hover:scale-110 transition-transform"><Compass className="h-6 w-6"/></div>
                         <h3 className="text-2xl font-bold text-[var(--text-main)] mb-3">{career.title}</h3>
                         <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-6 h-10 line-clamp-2">{career.description}</p>
                         <div className="p-4 bg-[var(--bg-main)]/50 rounded-xl border border-[var(--border-color)]"><span className="text-xs text-[var(--text-muted)] uppercase font-bold block mb-1">Why?</span><span className="text-[var(--text-main)] text-sm">{career.reason}</span></div>
                    </div>
                ))}
                </div>
                {careers.length > 0 && mode === 'analysis' && <div className="text-center"><button onClick={handleSuggestMore} className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-2 mx-auto"><RefreshCw className="h-4 w-4"/> Generate more options</button></div>}
            </>
        )}
      </div>
    );
  }

  if (step === 'assessment') {
     return (
         <div className="min-h-screen flex items-center justify-center p-6">
             <div className="glass-card w-full max-w-2xl p-8 rounded-3xl animate-fade-in relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary-500)] via-purple-500 to-pink-500"></div>
                 {isAssessmentLoading ? <div className="text-center py-20"><div className="animate-spin h-10 w-10 border-4 border-[var(--primary-500)] border-t-transparent rounded-full mx-auto mb-4"></div><h2 className="text-xl font-bold text-[var(--text-main)]">Generating Quiz...</h2></div> : (
                     <>
                        <div className="mb-8"><h2 className="text-2xl font-bold text-[var(--text-main)] mb-1">Skill Check</h2><p className="text-[var(--text-muted)]">Let's calibrate your starting point.</p></div>
                        <div className="space-y-8">
                            {assessment?.questions.map((q, idx) => (
                                <div key={idx} className="space-y-3">
                                    <p className="text-lg font-medium text-[var(--text-main)]">{idx + 1}. {q.text}</p>
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {q.options.map((opt, optIdx) => (
                                            <button key={optIdx} onClick={() => { const newAns = [...assessmentAnswers]; newAns[idx] = optIdx; setAssessmentAnswers(newAns); }} className={`p-4 rounded-xl text-sm font-medium text-left border transition-all ${assessmentAnswers[idx] === optIdx ? 'bg-[var(--primary-600)] border-[var(--primary-500)] text-white shadow-lg' : 'bg-[var(--bg-main)]/50 border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'}`}>{opt}</button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex justify-end"><button onClick={submitAssessment} disabled={assessmentAnswers.includes(-1)} className="px-8 py-3 bg-[var(--primary-600)] text-white font-bold rounded-xl disabled:opacity-50 hover:bg-[var(--primary-500)] transition-colors shadow-lg shadow-[var(--primary-500-20)]">Calculate Level</button></div>
                     </>
                 )}
             </div>
         </div>
     );
  }

  if (step === 'experience' || step === 'details') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
         <div className="glass-card w-full max-w-lg p-8 rounded-3xl animate-fade-in">
            <button onClick={() => setStep(step === 'experience' ? 'selection' : 'experience')} className="text-[var(--text-muted)] hover:text-[var(--text-main)] mb-6 flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4"/> Back</button>
            <h2 className="text-3xl font-bold text-[var(--text-main)] mb-2">{step === 'experience' ? 'Level Set' : 'Timeline'}</h2>
            <p className="text-[var(--text-muted)] mb-8">{step === 'experience' ? 'Confirm your proficiency.' : 'When is your deadline?'}</p>

            <div className="space-y-6">
                {step === 'experience' ? (
                    <>
                        <div className="grid grid-cols-3 gap-3">
                            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                                <button key={level} onClick={() => setExpLevel(level)} className={`p-4 rounded-xl border text-sm font-bold capitalize transition-all ${expLevel === level ? 'bg-[var(--primary-600)] border-[var(--primary-500)] text-white' : 'bg-[var(--bg-main)]/50 border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-card-hover)]'}`}>{level}</button>
                            ))}
                        </div>
                        {expLevel !== 'beginner' && (
                            <div><label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">Focus Areas</label><textarea placeholder="Specific topics..." className="w-full p-4 rounded-xl glass-card text-[var(--text-main)] outline-none h-32 resize-none" value={focusAreas} onChange={e => setFocusAreas(e.target.value)}/></div>
                        )}
                        <button onClick={() => setStep('details')} className="w-full py-4 bg-[var(--text-main)] text-[var(--bg-main)] font-bold rounded-xl hover:opacity-90 transition-colors mt-4">Continue</button>
                    </>
                ) : (
                    <>
                        <div><label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">Current Status</label><input type="text" placeholder="e.g. Student" className="w-full p-4 rounded-xl glass-card text-[var(--text-main)] outline-none" value={eduYear} onChange={e => setEduYear(e.target.value)}/></div>
                        <div><label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">Target Date</label><input type="date" className="w-full p-4 rounded-xl glass-card text-[var(--text-main)] outline-none color-scheme-dark" value={targetDate} onChange={e => setTargetDate(e.target.value)}/></div>
                        <button onClick={handleFinalSubmit} disabled={!eduYear || !targetDate} className="w-full py-4 bg-gradient-to-r from-[var(--primary-600)] to-purple-600 text-white font-bold rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">Generate Path <ArrowIcon className="h-4 w-4"/></button>
                    </>
                )}
            </div>
         </div>
      </div>
    );
  }
  return null;
};
