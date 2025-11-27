import React, { useState } from 'react';
import { UserProfile } from '../types';
import { getUsers, saveUser, setCurrentUser } from '../services/store';
import { Lock, User as UserIcon, Key, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot'>('login');
  const [formData, setFormData] = useState({ id: '', password: '', securityKey: '', username: '' });
  const [error, setError] = useState('');

  const handleSignup = () => {
    const users = getUsers();
    if (users[formData.id]) {
      setError('User ID already exists');
      return;
    }
    if (!formData.id || !formData.password || !formData.securityKey) {
      setError('All fields are required');
      return;
    }

    const newUser: UserProfile & { password?: string } = {
      id: formData.id,
      username: formData.username || formData.id,
      password: formData.password,
      securityKey: formData.securityKey,
      subscriptionStatus: 'free',
      onboardingComplete: false,
      activeCareers: [],
      xp: 0,
      streak: 0,
      theme: {
        mode: 'dark',
        primaryColor: 'indigo'
      }
    };
    
    saveUser(newUser);
    setCurrentUser(newUser.id);
    onLogin(newUser);
  };

  const handleLogin = () => {
    const users = getUsers();
    const user = users[formData.id];
    
    if (user && user.password === formData.password) {
      setCurrentUser(user.id);
      onLogin(user);
    } else {
      setError('Invalid credentials');
    }
  };

  const handleReset = () => {
     const users = getUsers();
     const user = users[formData.id];
     if (user && user.securityKey === formData.securityKey) {
         alert(`Your password is: ${user.password}`);
         setView('login');
     } else {
         setError('Invalid ID or Security Key');
     }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
               <ShieldCheck className="text-white h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">PathFinder AI</h1>
            <p className="text-slate-400 mt-2 text-sm">
              {view === 'login' && 'Welcome back, professional.'}
              {view === 'signup' && 'Architect your future.'}
              {view === 'forgot' && 'Secure account recovery.'}
            </p>
          </div>

          <div className="space-y-4">
            {error && <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg text-center">{error}</div>}
            
            <div className="relative group">
              <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="text" 
                placeholder="User ID / Email" 
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
              />
            </div>

            {view === 'signup' && (
              <div className="relative group">
                <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Display Name" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            )}

            {view !== 'forgot' && (
                <div className="relative group">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
                </div>
            )}

            {(view === 'signup' || view === 'forgot') && (
              <div className="relative group">
                <Key className="absolute left-3 top-3.5 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Security Key (Remember this!)" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.securityKey}
                  onChange={e => setFormData({...formData, securityKey: e.target.value})}
                />
              </div>
            )}

            <button 
              onClick={view === 'login' ? handleLogin : view === 'signup' ? handleSignup : handleReset}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Recover Account'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 text-center space-y-2">
            {view === 'login' && (
              <>
                <p className="text-sm text-slate-400">
                  New here? <button onClick={() => {setError(''); setView('signup');}} className="text-indigo-400 font-medium hover:underline">Create an account</button>
                </p>
                <button onClick={() => {setError(''); setView('forgot');}} className="text-xs text-slate-500 hover:text-slate-300">Forgot Password?</button>
              </>
            )}
            {(view === 'signup' || view === 'forgot') && (
              <p className="text-sm text-slate-400">
                Already have an account? <button onClick={() => {setError(''); setView('login');}} className="text-indigo-400 font-medium hover:underline">Log in</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
