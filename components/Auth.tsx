import React, { useState } from 'react';
import { UserProfile } from '../types';
import { getUsers, saveUser, setCurrentUser } from '../services/store';
import { Lock, User as UserIcon, Key, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

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
      theme: { mode: 'dark', primaryColor: 'indigo' }
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
    <div className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[var(--primary-500-20)] rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>

      <div className="w-full max-w-md glass-card rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 animate-fade-in border-t border-[var(--border-color)]">
        <div className="p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-[var(--primary-500)] to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[var(--primary-500-20)] transform rotate-3 hover:rotate-6 transition-transform duration-500">
               <ShieldCheck className="text-white h-8 w-8" />
            </div>
            <h1 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight mb-2">PathFinder AI</h1>
            <p className="text-[var(--text-muted)] text-sm font-medium tracking-wide uppercase">
              {view === 'login' ? 'Access Terminal' : view === 'signup' ? 'New Architect' : 'Recovery Mode'}
            </p>
          </div>

          <div className="space-y-5">
            {error && (
                <div className="p-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center backdrop-blur-sm animate-fade-in">
                    {error}
                </div>
            )}
            
            <div className="relative group">
              <UserIcon className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary-400)] transition-colors" />
              <input 
                type="text" 
                placeholder="User ID" 
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--bg-main)]/30 border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary-500-50)] focus:bg-[var(--bg-main)]/50 focus:ring-2 focus:ring-[var(--primary-500-20)] outline-none transition-all"
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
              />
            </div>

            {view === 'signup' && (
              <div className="relative group animate-fade-in">
                <Sparkles className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary-400)] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Display Name" 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--bg-main)]/30 border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary-500-50)] focus:bg-[var(--bg-main)]/50 focus:ring-2 focus:ring-[var(--primary-500-20)] outline-none transition-all"
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                />
              </div>
            )}

            {view !== 'forgot' && (
                <div className="relative group animate-fade-in">
                <Lock className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary-400)] transition-colors" />
                <input 
                    type="password" 
                    placeholder="Password" 
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--bg-main)]/30 border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary-500-50)] focus:bg-[var(--bg-main)]/50 focus:ring-2 focus:ring-[var(--primary-500-20)] outline-none transition-all"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
                </div>
            )}

            {(view === 'signup' || view === 'forgot') && (
              <div className="relative group animate-fade-in">
                <Key className="absolute left-4 top-4 h-5 w-5 text-[var(--text-muted)] group-focus-within:text-[var(--primary-400)] transition-colors" />
                <input 
                  type="text" 
                  placeholder="Security Key" 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--bg-main)]/30 border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:border-[var(--primary-500-50)] focus:bg-[var(--bg-main)]/50 focus:ring-2 focus:ring-[var(--primary-500-20)] outline-none transition-all"
                  value={formData.securityKey}
                  onChange={e => setFormData({...formData, securityKey: e.target.value})}
                />
              </div>
            )}

            <button 
              onClick={view === 'login' ? handleLogin : view === 'signup' ? handleSignup : handleReset}
              className="w-full py-4 bg-gradient-to-r from-[var(--primary-600)] to-purple-600 hover:from-[var(--primary-500)] hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-[var(--primary-500-20)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
            >
              {view === 'login' ? 'Initiate Session' : view === 'signup' ? 'Join Network' : 'Recover Access'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-8 text-center space-y-3">
            {view === 'login' && (
              <>
                <p className="text-sm text-[var(--text-muted)]">
                  New Protocol? <button onClick={() => {setError(''); setView('signup');}} className="text-[var(--primary-400)] font-semibold hover:text-[var(--primary-500)] transition-colors">Create ID</button>
                </p>
                <button onClick={() => {setError(''); setView('forgot');}} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Lost Credentials?</button>
              </>
            )}
            {(view === 'signup' || view === 'forgot') && (
              <p className="text-sm text-[var(--text-muted)]">
                Return to <button onClick={() => {setError(''); setView('login');}} className="text-[var(--primary-400)] font-semibold hover:text-[var(--primary-500)] transition-colors">Login</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
