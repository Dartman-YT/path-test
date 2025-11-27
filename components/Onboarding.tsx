import React, { useState } from 'react';
import { CareerOption, UserProfile, SkillAssessment } from '../types';
import { analyzeInterests, searchCareers, generateSkillAssessment } from '../services/gemini';
import { Sparkles, CheckCircle, BookOpen, Clock, Target, ChevronRight, ArrowLeft, Search, RefreshCw, Plus, BrainCircuit } from 'lucide-react';

interface OnboardingProps {
  onComplete: (career: CareerOption, eduYear: string, targetDate: string, expLevel: 'beginner' | 'intermediate' | 'advanced', focusAreas: string) => void;
  isNewUser?: boolean;
  mode?: 'analysis' | 'search';
  userTheme?: UserProfile['theme']; // Pass theme for consistent styling
}

// Define structure for MCQs
interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'text';
  options?: string[];
  allowOther?: boolean;
  context: 'general' | 'upskill' | 'both';
}

const GENERAL_QUESTIONS: Question[] = [
  {
    id: 'goal',
    text: "What is your primary objective today?",
    type: 'mcq',
    options: ["Discover a new career path", "Upskill in my current field", "Switch from a different field"],
    context: 'general',
    allowOther: false
  },
  {
    id: 'interests',
    text: "What topics do you find yourself naturally drawn to?",
    type: 'mcq',
    options: ["Technology & Coding", "Art & Design", "Business & Finance", "Science & Research"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'work_style',
    text: "How do you prefer to solve problems?",
    type: 'mcq',
    options: ["Building things (Engineering)", "Analyzing data (Logic)", "Leading teams (Management)", "Creating visuals (Creative)"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'environment',
    text: "Pick your ideal work environment.",
    type: 'mcq',
    options: ["Remote / Home Office", "Fast-paced Startup", "Structured Corporate", "Creative Studio"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'impact',
    text: "What kind of impact do you want to make?",
    type: 'mcq',
    options: ["Solving complex technical problems", "Improving people's daily lives", "Creating beautiful experiences", "Driving financial growth"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'subjects',
    text: "Which activities do you enjoy most in your free time?",
    type: 'mcq',
    options: ["Gaming or Tinkering with tech", "Reading or Writing", "Socializing or Networking", "Drawing or Crafting"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'pace',
    text: "What is your preferred work pace?",
    type: 'mcq',
    options: ["Steady and Predictable", "Fast and deadline-driven", "Flexible and self-directed", "Collaborative and iterative"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'team_dynamic',
    text: "How do you prefer to work with others?",
    type: 'mcq',
    options: ["Independent contributor", "Small, tight-knit team", "Large, structured team", "Leading and mentoring"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'tools',
    text: "What tools do you prefer working with?",
    type: 'mcq',
    options: ["Code editors & Terminals", "Spreadsheets & Data", "Design Software (Adobe/Figma)", "People & Communication"],
    allowOther: true,
    context: 'general'
  },
  {
    id: 'success',
    text: "What does success look like to you in 5 years?",
    type: 'mcq',
    options: ["Being a Subject Matter Expert", "Running my own business", "Leading a large organization", "Having perfect work-life balance"],
    allowOther: true,
    context: 'general'
  }
];

const UPSKILL_QUESTIONS: Question[] = [
  {
     id: 'current_role',
     text: "What is your current role or field?",
     type: 'text',
     context: 'upskill'
  },
  {
    id: 'focus_gap',
    text: "What is the biggest gap in your current skillset?",
    type: 'mcq',
    options: ["Modern Frameworks/Tools", "System Design & Architecture", "Leadership & Soft Skills", "Backend/Database Engineering", "AI/ML Integration"],
    allowOther: true,
    context: 'upskill'
  },
  {
    id: 'learning_style',
    text: "How do you learn best?",
    type: 'mcq',
    options: ["Hands-on Projects", "Deep Theory / Reading", "Video Tutorials", "Interactive Coding"],
    allowOther: false,
    context: 'upskill'
  },
  {
    id: 'time_commitment',
    text: "How much time can you dedicate daily?",
    type: 'mcq',
    options: ["Less than 1 hour", "1-2 hours", "3-5 hours", "Full time"],
    allowOther: false,
    context: 'upskill'
  }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isNewUser = true, mode = 'analysis', userTheme }) => {
  const [step, setStep] = useState<'questions' | 'analysis' | 'selection' | 'assessment' | 'experience' | 'details'>(mode === 'search' ? 'selection' : 'questions');
  
  // Question Logic
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(GENERAL_QUESTIONS);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherInput, setOtherInput] = useState(''); // For "Other" text field

  // Analysis/Search State
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Assessment State
  const [assessment, setAssessment] = useState<SkillAssessment | null>(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState<number[]>([]);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);

  // Final Details State
  const [eduYear, setEduYear] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [expLevel, setExpLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [focusAreas, setFocusAreas] = useState('');

  // Theme Helpers
  const primaryColor = userTheme?.primaryColor || 'indigo';
  const getBtnClass = (active: boolean) => active 
    ? `bg-${primaryColor}-600 text-white border-${primaryColor}-600` 
    : `bg-theme-card text-theme-muted border-theme hover:border-${primaryColor}-500 hover:text-theme-main`;

  const handleMCQSelect = (option: string) => {
    const currentQ = activeQuestions[currentQIndex];
    
    // Save answer
    const newAnswers = { ...answers, [currentQ.text]: option };
    setAnswers(newAnswers);
    setOtherInput('');

    // Logic: If first question (Goal) is "Upskill", switch question set
    if (currentQ.id === 'goal' && option.includes("Upskill")) {
        setActiveQuestions([activeQuestions[0], ...UPSKILL_QUESTIONS]);
    } else if (currentQ.id === 'goal' && !option.includes("Upskill")) {
        // Ensure we stick to General questions if they went back and changed it
        setActiveQuestions(GENERAL_QUESTIONS);
    }

    // Move next
    if (currentQIndex < activeQuestions.length - 1) {
      setTimeout(() => setCurrentQIndex(prev => prev + 1), 250); // Slight delay for visual feedback
    } else {
      performAnalysis(newAnswers);
    }
  };

  const handleTextSubmit = () => {
    if (!otherInput.trim()) return;
    const currentQ = activeQuestions[currentQIndex];
    const newAnswers = { ...answers, [currentQ.text]: otherInput };
    setAnswers(newAnswers);
    setOtherInput('');

    if (currentQIndex < activeQuestions.length - 1) {
       setCurrentQIndex(prev => prev + 1);
    } else {
       performAnalysis(newAnswers);
    }
  };

  const performAnalysis = async (finalAnswers: Record<string, string>) => {
    setStep('analysis');
    setIsAnalyzing(true);
    try {
      // Convert object to array of strings for the existing API service
      const answerArray = Object.entries(finalAnswers).map(([q, a]) => `${q}: ${a}`);
      const results = await analyzeInterests(answerArray);
      setCareers(results);
      setStep('selection');
    } catch (e) {
      console.error(e);
      // Fallback
      setCareers([
         { id: '1', title: 'Full Stack Developer', description: 'Build end-to-end web applications.', fitScore: 90, reason: 'Matched interest in coding.'},
         { id: '2', title: 'Data Analyst', description: 'Derive insights from data.', fitScore: 85, reason: 'Matched interest in logic.'},
      ]);
      setStep('selection');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try {
          const results = await searchCareers(searchQuery);
          setCareers(results);
      } catch(e) {
          console.error(e);
      } finally {
          setIsSearching(false);
      }
  };

  const handleSuggestMore = async () => {
     setIsSearching(true);
     try {
         const answerArray = Object.entries(answers).map(([q, a]) => `${q}: ${a}`);
         const results = await analyzeInterests(answerArray);
         setCareers(prev => [...prev, ...results].slice(0, 9));
     } catch(e) {
         console.error(e);
     } finally {
         setIsSearching(false);
     }
  };

  const startAssessment = async (career: CareerOption) => {
      setSelectedCareer(career);
      setStep('assessment');
      setIsAssessmentLoading(true);
      try {
          const quiz = await generateSkillAssessment(career.title);
          setAssessment(quiz);
          setAssessmentAnswers(new Array(quiz.questions.length).fill(-1));
      } catch (e) {
          // Skip to experience if AI fails
          setStep('experience');
      } finally {
          setIsAssessmentLoading(false);
      }
  };

  const submitAssessment = () => {
      if (!assessment) return;
      let score = 0;
      assessment.questions.forEach((q, i) => {
          if (assessmentAnswers[i] === q.correctIndex) score++;
      });
      
      // Auto-set level
      if (score === assessment.questions.length) setExpLevel('advanced');
      else if (score > 0) setExpLevel('intermediate');
      else setExpLevel('beginner');
      
      setStep('experience');
  };

  const handleFinalSubmit = () => {
    if (selectedCareer && eduYear && targetDate) {
      // If answers indicated upskilling, append that context to focusAreas
      const upskillContext = answers['What is the biggest gap in your current skillset?'] 
        ? `Focus heavily on ${answers['What is the biggest gap in your current skillset?']}. Learning Style: ${answers['How do you learn best?']}. ` 
        : '';
        
      onComplete(selectedCareer, eduYear, targetDate, expLevel, upskillContext + focusAreas);
    }
  };

  // --- RENDERERS ---

  if (step === 'questions') {
    const q = activeQuestions[currentQIndex];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-theme-main transition-colors">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="mb-8 flex items-center gap-2 font-medium">
            <span className={`flex items-center justify-center w-8 h-8 rounded-full border text-sm font-bold bg-${primaryColor}-500/10 border-${primaryColor}-500/30 text-${primaryColor}-500`}>
              {currentQIndex + 1}
            </span>
            <span className="text-theme-muted">/ {activeQuestions.length}</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-theme-main mb-8 leading-relaxed">
            {q.text}
          </h2>
          
          <div className="space-y-3">
             {q.type === 'mcq' && q.options?.map((opt) => (
                 <button
                    key={opt}
                    onClick={() => handleMCQSelect(opt)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group flex items-center justify-between ${getBtnClass(false)}`}
                 >
                    <span className="font-medium">{opt}</span>
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </button>
             ))}

             {(q.type === 'text' || q.allowOther) && (
                 <div className="relative mt-4">
                     <input 
                        type="text" 
                        placeholder={q.type === 'text' ? "Type your answer..." : "Other (please specify)..."}
                        className="w-full p-4 rounded-xl bg-theme-card border border-theme text-theme-main focus:border-indigo-500 outline-none transition-all placeholder-slate-500"
                        value={otherInput}
                        onChange={e => setOtherInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                        autoFocus={q.type === 'text'}
                     />
                     {otherInput && (
                         <button 
                            onClick={handleTextSubmit}
                            className={`absolute right-2 top-2 bottom-2 px-4 rounded-lg text-sm font-bold bg-${primaryColor}-600 text-white`}
                         >
                            Next
                         </button>
                     )}
                 </div>
             )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analysis') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-theme-main">
        <div className="animate-pulse flex flex-col items-center">
          <div className={`h-24 w-24 bg-${primaryColor}-500/20 rounded-full flex items-center justify-center mb-8 border border-${primaryColor}-500/30`}>
            <Sparkles className={`h-12 w-12 text-${primaryColor}-400`} />
          </div>
          <h2 className="text-3xl font-bold text-theme-main mb-2">Analyzing Profile...</h2>
          <p className="text-theme-muted max-w-md mx-auto">Identifying the optimal paths based on your specific goals.</p>
        </div>
      </div>
    );
  }

  if (step === 'selection') {
    return (
      <div className="min-h-screen p-6 md:p-12 bg-theme-main text-theme-main">
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">Recommended Paths</h2>
                    <p className="text-theme-muted text-lg">Select a path to generate your roadmap.</p>
                </div>
                
                <div className="w-full md:w-auto relative">
                    <input 
                        type="text" 
                        placeholder="Search specific career..." 
                        className="w-full md:w-80 pl-10 pr-4 py-3 bg-theme-card border border-theme rounded-xl focus:border-indigo-500 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-theme-muted" />
                    {searchQuery && (
                         <button 
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-2 bottom-2 px-3 bg-slate-800 text-white rounded-lg text-xs font-bold"
                        >
                            Go
                        </button>
                    )}
                </div>
            </div>
            
            {isSearching ? (
                <div className="h-64 flex items-center justify-center">
                    <div className={`animate-spin h-8 w-8 border-4 border-${primaryColor}-500 border-t-transparent rounded-full`}></div>
                </div>
            ) : (
                <>
                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {careers.map(career => (
                        <div 
                        key={career.id}
                        onClick={() => startAssessment(career)}
                        className={`bg-theme-card p-8 rounded-3xl shadow-lg hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-theme hover:border-${primaryColor}-500 group relative overflow-hidden flex flex-col`}
                        >
                        <div className={`flex justify-between items-start mb-6 relative z-10`}>
                            <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {career.fitScore}% Match
                            </div>
                            <CheckCircle className={`h-6 w-6 text-theme-muted group-hover:text-${primaryColor}-400 transition-colors`} />
                        </div>
                        
                        <h3 className={`text-2xl font-bold text-theme-main mb-3 relative z-10 group-hover:text-${primaryColor}-400 transition-colors`}>{career.title}</h3>
                        <p className="text-theme-muted mb-6 text-sm leading-relaxed relative z-10 flex-grow">{career.description}</p>
                        
                        <div className="mt-auto relative z-10">
                            <div className="text-xs text-theme-muted bg-theme-main p-4 rounded-xl border border-theme">
                                <span className="font-semibold block mb-1">Why this fits:</span> {career.reason}
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                    
                    {careers.length > 0 && mode === 'analysis' && (
                        <div className="text-center">
                            <button 
                                onClick={handleSuggestMore}
                                className="inline-flex items-center gap-2 text-theme-muted hover:text-theme-main transition-colors text-sm font-medium"
                            >
                                <RefreshCw className="h-4 w-4" /> Suggest More Options
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    );
  }

  if (step === 'assessment') {
     return (
         <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-theme-main">
             <div className="w-full max-w-2xl bg-theme-card border border-theme rounded-3xl shadow-2xl p-8 animate-fade-in">
                 {isAssessmentLoading ? (
                     <div className="text-center py-12">
                         <div className={`animate-spin h-10 w-10 border-4 border-${primaryColor}-500 border-t-transparent rounded-full mx-auto mb-4`}></div>
                         <h2 className="text-xl font-bold text-theme-main">Analyzing Skill Level...</h2>
                         <p className="text-theme-muted">Generating technical questions for {selectedCareer?.title}</p>
                     </div>
                 ) : (
                     <>
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-3 bg-${primaryColor}-500/20 rounded-xl text-${primaryColor}-400`}><BrainCircuit className="h-6 w-6" /></div>
                            <div>
                                <h2 className="text-2xl font-bold text-theme-main">Skill Assessment</h2>
                                <p className="text-theme-muted text-sm">Let's gauge your current proficiency.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {assessment?.questions.map((q, idx) => (
                                <div key={idx} className="space-y-3">
                                    <p className="font-medium text-lg text-theme-main">{idx + 1}. {q.text}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options.map((opt, optIdx) => (
                                            <button
                                                key={optIdx}
                                                onClick={() => {
                                                    const newAns = [...assessmentAnswers];
                                                    newAns[idx] = optIdx;
                                                    setAssessmentAnswers(newAns);
                                                }}
                                                className={`p-3 rounded-lg text-sm font-medium text-left border transition-all ${assessmentAnswers[idx] === optIdx ? `bg-${primaryColor}-600 border-${primaryColor}-600 text-white` : 'bg-theme-main border-theme text-theme-muted hover:bg-slate-800'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button 
                                onClick={submitAssessment}
                                disabled={assessmentAnswers.includes(-1)}
                                className={`px-8 py-3 bg-${primaryColor}-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-${primaryColor}-500 transition-colors`}
                            >
                                Submit & Continue
                            </button>
                        </div>
                     </>
                 )}
             </div>
         </div>
     );
  }

  if (step === 'experience') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-theme-main">
         <div className="w-full max-w-lg bg-theme-card border border-theme rounded-3xl shadow-2xl p-8 animate-fade-in">
            <button 
              onClick={() => setStep('selection')}
              className="flex items-center gap-2 text-theme-muted hover:text-theme-main transition-all text-sm mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Selection
            </button>
            
            <h2 className="text-2xl font-bold text-theme-main mb-2">Experience Level</h2>
            <p className="text-theme-muted text-sm mb-8">We've pre-selected a level based on your assessment, but feel free to adjust.</p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-theme-muted mb-3">Your level in {selectedCareer?.title}?</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                            <button
                                key={level}
                                onClick={() => setExpLevel(level)}
                                className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${expLevel === level ? `bg-${primaryColor}-600 border-${primaryColor}-600 text-white` : 'bg-theme-main border-theme text-theme-muted hover:bg-slate-800'}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {expLevel !== 'beginner' && (
                     <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-theme-muted mb-2">
                            Specific Focus Areas (Optional)
                        </label>
                        <textarea 
                            placeholder="e.g. I want to focus on Scalability and Cloud Architecture."
                            className="w-full p-4 rounded-xl bg-theme-main border border-theme text-theme-main focus:border-indigo-500 outline-none transition-all h-32 resize-none text-sm placeholder-slate-500"
                            value={focusAreas}
                            onChange={e => setFocusAreas(e.target.value)}
                        />
                     </div>
                )}

                <button 
                    onClick={() => setStep('details')}
                    className="w-full py-4 bg-theme-main hover:bg-slate-800 text-theme-main font-bold rounded-xl border border-theme transition-all flex items-center justify-center gap-2"
                >
                    Continue <ChevronRight className="h-4 w-4" />
                </button>
            </div>
         </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-theme-main">
        <div className="w-full max-w-lg bg-theme-card border border-theme rounded-3xl shadow-2xl p-8 animate-fade-in">
          <button 
              onClick={() => setStep('experience')}
              className="flex items-center gap-2 text-theme-muted hover:text-theme-main transition-all text-sm mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

          <h2 className="text-2xl font-bold text-theme-main mb-2">Final Details</h2>
          <p className="text-theme-muted text-sm mb-8">Set your timeline.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2 flex items-center gap-2">
                <BookOpen className={`h-4 w-4 text-${primaryColor}-400`} /> Current Status
              </label>
              <input 
                type="text" 
                placeholder="e.g., Student, Working Professional"
                className="w-full p-4 rounded-xl bg-theme-main border border-theme text-theme-main focus:border-indigo-500 outline-none transition-all"
                value={eduYear}
                onChange={e => setEduYear(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-muted mb-2 flex items-center gap-2">
                <Clock className={`h-4 w-4 text-${primaryColor}-400`} /> Target Date
              </label>
              <input 
                type="date" 
                className="w-full p-4 rounded-xl bg-theme-main border border-theme text-theme-main focus:border-indigo-500 outline-none color-scheme-dark"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
            </div>

            <button 
              onClick={handleFinalSubmit}
              disabled={!eduYear || !targetDate}
              className={`w-full py-4 bg-${primaryColor}-600 hover:bg-${primaryColor}-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg mt-4`}
            >
              <Target className="h-5 w-5" />
              Generate Roadmap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
