import React, { useState } from 'react';
import { CareerOption } from '../types';
import { analyzeInterests, searchCareers } from '../services/gemini';
import { Sparkles, CheckCircle, BookOpen, Clock, Target, ChevronRight, ArrowLeft, BarChart3, GraduationCap, Search, RefreshCw } from 'lucide-react';

interface OnboardingProps {
  onComplete: (career: CareerOption, eduYear: string, targetDate: string, expLevel: 'beginner' | 'intermediate' | 'advanced', focusAreas: string) => void;
  isNewUser?: boolean;
  mode?: 'analysis' | 'search'; // New prop to force mode if entered via "Add Career"
}

const QUESTIONS = [
  "What specific topics or hobbies do you lose track of time doing?",
  "In a group project, do you prefer leading, researching, building, or presenting?",
  "What is a global problem (climate, health, tech, social) you'd love to help solve?",
  "Describe your ideal daily work vibe (e.g., quiet coding, busy hospital, creative studio).",
  "How important is rapid financial growth versus work-life balance for you?"
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isNewUser = true, mode = 'analysis' }) => {
  const [step, setStep] = useState<'questions' | 'analysis' | 'selection' | 'experience' | 'details'>(mode === 'search' ? 'selection' : 'questions');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  
  const [careers, setCareers] = useState<CareerOption[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [eduYear, setEduYear] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [expLevel, setExpLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [focusAreas, setFocusAreas] = useState('');

  const handleAnswer = () => {
    if (!currentInput.trim()) return;
    const newAnswers = [...answers, currentInput];
    setAnswers(newAnswers);
    setCurrentInput('');

    if (currentQIndex < QUESTIONS.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      setStep('analysis');
      performAnalysis(newAnswers);
    }
  };

  const performAnalysis = async (finalAnswers: string[]) => {
    setIsAnalyzing(true);
    try {
      const results = await analyzeInterests(finalAnswers);
      setCareers(results);
      setStep('selection');
    } catch (e) {
      console.error(e);
      setCareers([
         { id: '1', title: 'Software Engineer', description: 'Build scalable systems.', fitScore: 95, reason: 'High logic scores.'},
         { id: '2', title: 'Data Scientist', description: 'Analyze complex data.', fitScore: 88, reason: 'Love for patterns.'},
         { id: '3', title: 'Product Manager', description: 'Lead product vision.', fitScore: 82, reason: 'Leadership traits.'},
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
         // Simple trick: just re-analyze with a slight randomization context or just recall API
         // Ideally, we pass a "exclude" list, but for now, just re-calling offers variety usually.
         const results = await analyzeInterests(answers);
         setCareers(prev => [...prev, ...results].slice(0, 6)); // Keep up to 6
     } catch(e) {
         console.error(e);
     } finally {
         setIsSearching(false);
     }
  };

  const handleCareerSelect = (career: CareerOption) => {
      setSelectedCareer(career);
      setStep('experience');
  };

  const handleFinalSubmit = () => {
    if (selectedCareer && eduYear && targetDate) {
      onComplete(selectedCareer, eduYear, targetDate, expLevel, focusAreas);
    }
  };

  if (step === 'questions') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
        <div className="w-full max-w-2xl">
          <div className="mb-8 flex items-center gap-2 text-indigo-400 font-medium">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-sm font-bold">
              {currentQIndex + 1}
            </span>
            <span className="text-slate-500">/ {QUESTIONS.length}</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 animate-fade-in leading-relaxed">
            {QUESTIONS[currentQIndex]}
          </h2>
          
          <div className="relative">
            <textarea
                className="w-full p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner text-lg text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-40 placeholder-slate-600 backdrop-blur-sm transition-all"
                placeholder="Type your answer here..."
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (currentInput.trim()) handleAnswer();
                    }
                }}
            />
            <div className="absolute bottom-4 right-4 text-xs text-slate-600">Press Enter ↵</div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleAnswer}
              disabled={!currentInput.trim()}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
            >
              {currentQIndex === QUESTIONS.length - 1 ? 'Analyze Profile' : 'Next Step'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analysis') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-950">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-24 w-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-8 border border-indigo-500/30">
            <Sparkles className="h-12 w-12 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Synthesizing Career Paths...</h2>
          <p className="text-slate-400 max-w-md mx-auto">Our AI is analyzing your personality, interests, and current market trends to find your perfect match.</p>
        </div>
      </div>
    );
  }

  if (step === 'selection') {
    return (
      <div className="min-h-screen p-6 md:p-12 bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-2">Select Your Path</h2>
                    <p className="text-slate-400 text-lg">Choose a recommendation or search for your own.</p>
                </div>
                
                {/* Search Bar */}
                <div className="w-full md:w-auto relative">
                    <input 
                        type="text" 
                        placeholder="Search any career (e.g. 'Chef', 'Robotics')" 
                        className="w-full md:w-80 pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                    {searchQuery && (
                        <button 
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-2 bottom-2 px-3 bg-slate-800 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                        >
                            {isSearching ? '...' : 'Go'}
                        </button>
                    )}
                </div>
            </div>
            
            {isSearching ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <>
                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                    {careers.map(career => (
                        <div 
                        key={career.id}
                        onClick={() => handleCareerSelect(career)}
                        className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl shadow-2xl hover:shadow-indigo-900/20 hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-slate-800 hover:border-indigo-500 group relative overflow-hidden flex flex-col"
                        >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            {career.fitScore}% Match
                            </div>
                            <CheckCircle className="h-6 w-6 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-3 relative z-10 group-hover:text-indigo-300 transition-colors">{career.title}</h3>
                        <p className="text-slate-400 mb-6 text-sm leading-relaxed relative z-10 flex-grow">{career.description}</p>
                        
                        <div className="mt-auto relative z-10">
                            <div className="text-xs text-slate-500 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                                <span className="font-semibold text-slate-300 block mb-1">Why this fits:</span> {career.reason}
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                    
                    {careers.length > 0 && mode === 'analysis' && (
                        <div className="text-center">
                            <button 
                                onClick={handleSuggestMore}
                                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
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

  if (step === 'experience') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
         <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 animate-fade-in">
            <button 
              onClick={() => setStep('selection')}
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-sm mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Selection
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-2">Customize Learning Path</h2>
            <p className="text-slate-400 text-sm mb-8">Tell us about your current knowledge so we can adapt the curriculum.</p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">What is your experience level in {selectedCareer?.title}?</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                            <button
                                key={level}
                                onClick={() => setExpLevel(level)}
                                className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all ${expLevel === level ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {expLevel !== 'beginner' && (
                     <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Upskill Goals (Optional)
                        </label>
                        <textarea 
                            placeholder="e.g., I know basic React but want to learn Next.js, Performance Optimization, and Advanced Patterns."
                            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all h-32 resize-none text-sm placeholder-slate-600"
                            value={focusAreas}
                            onChange={e => setFocusAreas(e.target.value)}
                        />
                     </div>
                )}

                <button 
                    onClick={() => setStep('details')}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    Continue to Timeline <ChevronRight className="h-4 w-4" />
                </button>
            </div>
         </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 animate-fade-in">
          <button 
              onClick={() => setStep('experience')}
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-sm mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Experience
            </button>

          <h2 className="text-2xl font-bold text-white mb-2">Finalize {selectedCareer?.title} Roadmap</h2>
          <p className="text-slate-400 text-sm mb-8">The AI will strictly adapt the schedule to fit your timeline for this specific career path.</p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-400" /> Current Status / Job Title
              </label>
              <input 
                type="text" 
                placeholder="e.g., 3rd Year CS Student, Working Professional"
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                value={eduYear}
                onChange={e => setEduYear(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" /> Target Completion Date
              </label>
              <input 
                type="date" 
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none color-scheme-dark"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-2">
                 We will generate a roadmap that starts today and ends on this date.
              </p>
            </div>

            <button 
              onClick={handleFinalSubmit}
              disabled={!eduYear || !targetDate}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 mt-4"
            >
              <Target className="h-5 w-5" />
              Generate Optimized Roadmap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};