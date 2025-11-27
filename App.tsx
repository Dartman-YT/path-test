
import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Dashboard, RoadmapLoader } from './components/Dashboard';
import { UserProfile, CareerOption, RoadmapPhase } from './types';
import { getCurrentUserId, getUsers, getCareerData, getRoadmap, saveUser, saveCareerData, saveRoadmap, setCurrentUser } from './services/store';
import { generateRoadmap } from './services/gemini';
import { Sparkles, Search, X, ShieldCheck, Unplug } from 'lucide-react';

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="animate-bounce mb-8">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 transform rotate-3">
        <ShieldCheck className="h-12 w-12 text-white" />
      </div>
    </div>
    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight animate-pulse">PathFinder AI</h1>
    <p className="text-indigo-400 text-sm font-semibold tracking-[0.2em] uppercase opacity-80 animate-pulse">A Concept by Hameed Afsar K M</p>
  </div>
);

const StreakBrokenModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
          <div className="mx-auto w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border-4 border-red-500/20">
              <Unplug className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Streak Broken!</h2>
          <p className="text-slate-400 mb-8">You missed a day, and your streak has reset to 0. Don't worry, start a new streak today!</p>
          <button onClick={onClose} className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg">
              Start Fresh
          </button>
      </div>
    </div>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [career, setCareer] = useState<CareerOption | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingCareer, setIsAddingCareer] = useState(false);
  const [addCareerMode, setAddCareerMode] = useState<'analysis' | 'search' | null>(null);
  const [showStreakBroken, setShowStreakBroken] = useState(false);

  useEffect(() => {
    const splashTimer = setTimeout(() => { setShowSplash(false); }, 2500);

    const userId = getCurrentUserId();
    if (userId) {
      const users = getUsers();
      const existingUser = users[userId];
      if (existingUser) {
        // Ensure theme exists for backward compatibility
        if (!existingUser.theme) {
            existingUser.theme = { mode: 'dark', primaryColor: 'indigo' };
        }

        // Check Streak Logic
        if (existingUser.streak > 0 && existingUser.lastDailyChallenge) {
            const lastDate = new Date(existingUser.lastDailyChallenge);
            // Normalize to midnight for simple day comparison
            lastDate.setHours(0,0,0,0);
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 1) {
                // More than 1 day missed (yesterday was missed)
                existingUser.streak = 0;
                saveUser(existingUser);
                setShowStreakBroken(true);
            }
        }

        setUser(existingUser);
        if (existingUser.activeCareers && existingUser.activeCareers.length > 0) {
            const careerIdToLoad = existingUser.currentCareerId || existingUser.activeCareers[0].careerId;
            loadCareerContext(userId, careerIdToLoad);
        }
      }
    }
    setLoading(false);
    return () => clearTimeout(splashTimer);
  }, []);

  const loadCareerContext = (userId: string, careerId: string) => {
      const savedCareer = getCareerData(userId, careerId);
      const savedRoadmap = getRoadmap(userId, careerId);
      if (savedCareer) setCareer(savedCareer);
      if (savedRoadmap) setRoadmap(savedRoadmap);
  };

  const handleLogin = (loggedInUser: UserProfile) => {
    // Ensure theme exists
    if (!loggedInUser.theme) {
        loggedInUser.theme = { mode: 'dark', primaryColor: 'indigo' };
    }
    setUser(loggedInUser);
    if (loggedInUser.activeCareers && loggedInUser.activeCareers.length > 0) {
        const careerIdToLoad = loggedInUser.currentCareerId || loggedInUser.activeCareers[0].careerId;
        loadCareerContext(loggedInUser.id, careerIdToLoad);
    }
  };

  const handleOnboardingComplete = async (selectedCareer: CareerOption, eduYear: string, targetDate: string, expLevel: 'beginner' | 'intermediate' | 'advanced', focusAreas: string) => {
    if (!user) return;
    const newCareerEntry = { careerId: selectedCareer.id, title: selectedCareer.title, addedAt: Date.now(), educationYear: eduYear, targetCompletionDate: targetDate, experienceLevel: expLevel, focusAreas: focusAreas };
    const updatedCareers = user.activeCareers ? [...user.activeCareers, newCareerEntry] : [newCareerEntry];
    const updatedUser = { ...user, onboardingComplete: true, activeCareers: updatedCareers, currentCareerId: selectedCareer.id };
    
    setUser(updatedUser); setCareer(selectedCareer); setIsAddingCareer(false); setAddCareerMode(null);
    saveUser(updatedUser); saveCareerData(user.id, selectedCareer.id, selectedCareer);

    try {
        const generatedRoadmap = await generateRoadmap(selectedCareer.title, eduYear, targetDate, expLevel, focusAreas);
        setRoadmap(generatedRoadmap);
        saveRoadmap(user.id, selectedCareer.id, generatedRoadmap);
    } catch (e) { console.error("Roadmap generation failed", e); }
  };

  const handleLogout = () => { setCurrentUser(null); setUser(null); setCareer(null); setRoadmap(null); };

  const handleAddCareerRequest = (mode?: 'analysis' | 'search') => {
      setIsAddingCareer(true);
      setAddCareerMode(mode || null);
      setCareer(null); 
  };

  const cancelAddCareer = () => {
      setIsAddingCareer(false); setAddCareerMode(null);
      if (user && user.activeCareers.length > 0) {
           const prevId = user.currentCareerId || user.activeCareers[0].careerId;
           loadCareerContext(user.id, prevId);
      }
  }

  if (showSplash) return <SplashScreen />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-500"><RoadmapLoader primaryColor="indigo" /></div>;
  
  if (showStreakBroken) return <StreakBrokenModal onClose={() => setShowStreakBroken(false)} />;

  if (!user) return <Auth onLogin={handleLogin} />;

  if (isAddingCareer && !addCareerMode && user.onboardingComplete) {
      return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full relative shadow-2xl">
                  <button onClick={cancelAddCareer} className="absolute top-4 right-4 p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                  <h2 className="text-2xl font-bold text-white mb-6 text-center">Choose Your Path</h2>
                  <div className="grid gap-4">
                      <button onClick={() => setAddCareerMode('analysis')} className="flex items-center gap-4 p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-indigo-500 hover:bg-indigo-900/10 transition-all group text-left">
                          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Sparkles className="h-6 w-6" /></div>
                          <div><div className="font-bold text-white text-lg">AI Analysis</div><div className="text-slate-400 text-sm">Discover based on interests.</div></div>
                      </button>
                      <button onClick={() => setAddCareerMode('search')} className="flex items-center gap-4 p-6 bg-slate-800/50 border border-slate-700 rounded-2xl hover:border-emerald-500 hover:bg-emerald-900/10 transition-all group text-left">
                          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Search className="h-6 w-6" /></div>
                          <div><div className="font-bold text-white text-lg">Manual Search</div><div className="text-slate-400 text-sm">Find a specific career.</div></div>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const showOnboarding = !user.onboardingComplete || (isAddingCareer && addCareerMode);
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} isNewUser={!user.onboardingComplete} mode={addCareerMode || 'analysis'} userTheme={user.theme} />;
  
  if (!career && user.activeCareers.length > 0) { loadCareerContext(user.id, user.activeCareers[0].careerId); return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-indigo-500"><RoadmapLoader primaryColor={user.theme?.primaryColor || 'indigo'} /></div>; }
  if (!career) return <Onboarding onComplete={handleOnboardingComplete} isNewUser={false} userTheme={user.theme} />;

  return <Dashboard user={user} career={career} roadmap={roadmap} onLogout={handleLogout} setRoadmap={setRoadmap} setUser={setUser} setCareer={setCareer} onAddCareer={handleAddCareerRequest} />;
};

export default App;
