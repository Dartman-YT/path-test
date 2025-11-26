
export enum UserRole {
  NEW = 'NEW',
  RETURNING = 'RETURNING'
}

export interface ThemePreferences {
  mode: 'dark' | 'light';
  primaryColor: 'indigo' | 'emerald' | 'violet' | 'rose' | 'amber' | 'blue';
}

export interface UserProfile {
  id: string;
  username: string;
  securityKey: string; // For password recovery
  subscriptionStatus: 'free' | 'monthly' | 'yearly';
  onboardingComplete: boolean;
  theme: ThemePreferences;
  xp: number;
  streak: number;
  lastDailyChallenge?: string; // ISO Date of last completed challenge (Global for Streak/XP)
  // Support for multiple careers, each with its own timeline
  activeCareers: {
    careerId: string;
    title: string;
    addedAt: number;
    educationYear: string;
    targetCompletionDate: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    focusAreas?: string; // specific topics for upskilling
    lastAdaptationCheck?: number; // timestamp of last AI check
    lastDailyChallenge?: string; // ISO Date of last completed challenge for THIS career
  }[];
  currentCareerId?: string;
}

export interface CareerOption {
  id: string;
  title: string;
  description: string;
  fitScore: number; // 0-100
  reason: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  type: 'skill' | 'project' | 'internship' | 'certificate';
  duration: string; // e.g., "2 weeks"
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: number; // Timestamp for velocity tracking
  link?: string; // For internships/certs
  importance: 'high' | 'medium' | 'low';
  isAIAdaptation?: boolean; // To badge newly added items
}

export interface RoadmapPhase {
  phaseName: string;
  items: RoadmapItem[];
  completionSummary?: string; // AI generated summary when phase completes
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string;
}

export interface DailyChallenge {
  question: string;
  options: string[];
  correctAnswer: number; // index
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SkillAssessment {
  questions: {
    text: string;
    options: string[];
    correctIndex: number;
  }[];
}

export interface Simulation {
  title: string;
  scenario: string;
  role: string;
  options: {
    text: string;
    outcome: string; // feedback
    score: number; // points awarded
  }[];
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}
