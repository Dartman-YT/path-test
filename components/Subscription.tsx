import React from 'react';
import { Check, Zap } from 'lucide-react';

interface SubscriptionProps {
  onSubscribe: (plan: 'monthly' | 'yearly') => void;
}

export const Subscription: React.FC<SubscriptionProps> = ({ onSubscribe }) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-4xl glass-card border-[var(--border-color)] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden animate-fade-in">
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-[var(--primary-500-20)] rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 text-center mb-12">
           <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-main)] mb-4 tracking-tight">Unlock Pro Access</h2>
           <p className="text-[var(--text-muted)] text-lg">Accelerate your career with unlimited AI guidance.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <div onClick={() => onSubscribe('monthly')} className="glass-card p-8 rounded-[2rem] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all group relative overflow-hidden">
                <h3 className="text-xl font-bold text-[var(--text-muted)] mb-2">Monthly</h3>
                <div className="text-4xl font-bold text-[var(--text-main)] mb-6">₹799<span className="text-sm text-[var(--text-muted)] ml-1 font-normal">/mo</span></div>
                <ul className="space-y-3 mb-8 text-[var(--text-muted)] text-sm">
                    <li className="flex gap-3"><Check className="h-4 w-4 text-[var(--primary-400)]"/> Dynamic Roadmap</li>
                    <li className="flex gap-3"><Check className="h-4 w-4 text-[var(--primary-400)]"/> Daily Quests</li>
                </ul>
                <button className="w-full py-3 rounded-xl bg-[var(--bg-main)]/50 border border-[var(--border-color)] text-[var(--text-main)] font-bold group-hover:bg-[var(--primary-600)] group-hover:border-[var(--primary-500)] group-hover:text-white transition-colors">Choose Monthly</button>
            </div>

            <div onClick={() => onSubscribe('yearly')} className="glass-card p-8 rounded-[2rem] border-[var(--primary-500-50)] bg-[var(--primary-500-20)] cursor-pointer transition-all group relative overflow-hidden hover:scale-[1.02]">
                <div className="absolute top-0 right-0 bg-[var(--primary-500)] text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Best Value</div>
                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Yearly</h3>
                <div className="text-4xl font-bold text-[var(--text-main)] mb-6">₹7,999<span className="text-sm text-[var(--text-muted)] ml-1 font-normal">/yr</span></div>
                <ul className="space-y-3 mb-8 text-[var(--text-main)]/80 text-sm">
                    <li className="flex gap-3"><Check className="h-4 w-4 text-[var(--primary-400)]"/> All Monthly Perks</li>
                    <li className="flex gap-3"><Check className="h-4 w-4 text-[var(--primary-400)]"/> Priority Support</li>
                    <li className="flex gap-3"><Check className="h-4 w-4 text-[var(--primary-400)]"/> Certificate Badge</li>
                </ul>
                <button className="w-full py-3 rounded-xl bg-[var(--primary-600)] text-white font-bold shadow-lg shadow-[var(--primary-500-20)]">Choose Yearly</button>
            </div>
        </div>
      </div>
    </div>
  );
};
