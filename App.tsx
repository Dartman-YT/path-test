import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Dashboard, RoadmapLoader } from './components/Dashboard';
import { UserProfile, CareerOption, RoadmapPhase } from './types';
import { getCurrentUserId, getUsers, getCareerData, getRoadmap, saveUser, saveCareerData, saveRoadmap, setCurrentUser } from './services/store';
import { generateRoadmap } from './services/gemini';
import { Sparkles, Search, X, ShieldCheck, Unplug } from 'lucide-react';

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center p-4 overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#020617] to-[#020617]"></div>
    <div className="relative z-10 animate-fade-in flex flex-col items-center">
      <div className="w-24 h-24 mb-8 relative">
          <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl animate-pulse"></div>
          <div className="relative w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
             <ShieldCheck className="h-10 w-10 text-white" />
          </div>
      </div>
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4 tracking-tight">PathFinder AI</h1>
      <p className="text-indigo-400/80 text-xs font-bold tracking-[0.3em] uppercase">Concept by Hameed Afsar K M</p>
    </div>
  </div>
);

const StreakBrokenModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-card border-red-500/30 rounded-[2.5rem] p-8 max-w-sm w-full text-center relative overflow-hidden">
          <div className="mx-auto w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border-4 border-red-500/20 animate-shake">
              <Unplug className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Streak Broken!</h2>
          <p className="text-slate-400 mb-8">It happens to the best of us. Start fresh today.</p>
          <button onClick={onClose} className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-500 transition-colors shadow-lg">
              Restart Streak
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
        if (!existingUser.theme) existingUser.theme = { mode: 'dark', primaryColor: 'indigo' };
        if (existingUser.streak > 0 && existingUser.lastDailyChallenge) {
            const lastDate = new Date(existingUser.lastDailyChallenge);
            lastDate.setHours(0,0,0,0);
            const today = new Date();
            today.setHours(0,0,0,0);
            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 1) { existingUser.streak = 0; saveUser(existingUser); setShowStreakBroken(true); }
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
    if (!loggedInUser.theme) loggedInUser.theme = { mode: 'dark', primaryColor: 'indigo' };
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
        setRoadmap(generatedRoadmap); saveRoadmap(user.id, selectedCareer.id, generatedRoadmap);
    } catch (e) { console.error("Roadmap generation failed", e); }
  };

  const handleLogout = () => { setCurrentUser(null); setUser(null); setCareer(null); setRoadmap(null); };

  const handleAddCareerRequest = (mode?: 'analysis' | 'search') => { setIsAddingCareer(true); setAddCareerMode(mode || null); setCareer(null); };
  const cancelAddCareer = () => { setIsAddingCareer(false); setAddCareerMode(null); if (user && user.activeCareers.length > 0) { const prevId = user.currentCareerId || user.activeCareers[0].careerId; loadCareerContext(user.id, prevId); } }

  if (showSplash) return <SplashScreen />;
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#020617] text-indigo-500"><RoadmapLoader primaryColor="indigo" /></div>;
  if (showStreakBroken) return <StreakBrokenModal onClose={() => setShowStreakBroken(false)} />;
  if (!user) return <Auth onLogin={handleLogin} />;

  if (isAddingCareer && !addCareerMode && user.onboardingComplete) {
      return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="glass-card rounded-[2.5rem] p-8 max-w-lg w-full relative">
                  <button onClick={cancelAddCareer} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                  <h2 className="text-2xl font-bold text-white mb-8 text-center">New Trajectory</h2>
                  <div className="grid gap-4">
                      <button onClick={() => setAddCareerMode('analysis')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-indigo-600 hover:border-indigo-500 transition-all group text-left">
                          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white"><Sparkles className="h-6 w-6" /></div>
                          <div><div className="font-bold text-white text-lg">AI Discovery</div><div className="text-slate-400 text-sm group-hover:text-indigo-200">Analyze my personality.</div></div>
                      </button>
                      <button onClick={() => setAddCareerMode('search')} className="flex items-center gap-4 p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-emerald-600 hover:border-emerald-500 transition-all group text-left">
                          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white"><Search className="h-6 w-6" /></div>
                          <div><div className="font-bold text-white text-lg">Manual Search</div><div className="text-slate-400 text-sm group-hover:text-emerald-200">I know what I want.</div></div>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const showOnboarding = !user.onboardingComplete || (isAddingCareer && addCareerMode);
  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} isNewUser={!user.onboardingComplete} mode={addCareerMode || 'analysis'} userTheme={user.theme} />;
  
  if (!career && user.activeCareers.length > 0) { loadCareerContext(user.id, user.activeCareers[0].careerId); return <div className="min-h-screen flex items-center justify-center bg-[#020617] text-indigo-500"><RoadmapLoader primaryColor={user.theme?.primaryColor || 'indigo'} /></div>; }
  if (!career) return <Onboarding onComplete={handleOnboardingComplete} isNewUser={false} userTheme={user.theme} />;

  return <Dashboard user={user} career={career} roadmap={roadmap} onLogout={handleLogout} setRoadmap={setRoadmap} setUser={setUser} setCareer={setCareer} onAddCareer={handleAddCareerRequest} />;
};

export default App;
