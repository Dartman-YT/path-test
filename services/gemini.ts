
import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, DailyChallenge, SkillAssessment, Simulation, TriviaQuestion } from '../types';

// Helper to get AI instance safely at runtime
const getAI = () => {
  try {
      const key = process.env.API_KEY;
      if (!key) throw new Error("API Key missing");
      return new GoogleGenAI({ apiKey: key });
  } catch (e) {
      console.warn("Gemini Client Init Warning:", e);
      return new GoogleGenAI({ apiKey: 'DUMMY_KEY_FOR_BUILD' });
  }
};

// --- FALLBACK DATA GENERATORS ---

const getFallbackRoadmap = (careerTitle: string): RoadmapPhase[] => [
    {
        phaseName: "Phase 1: Foundations (Offline Mode)",
        items: [
            {
                id: "fallback-1",
                title: `Introduction to ${careerTitle}`,
                description: "We reached our AI usage limit. Start by researching the core fundamentals of this field manually.",
                type: "skill",
                duration: "1 day",
                status: "pending",
                importance: "high",
                isAIAdaptation: false
            },
            {
                id: "fallback-2",
                title: "Set Up Environment",
                description: "Install necessary tools and software required for this career path.",
                type: "project",
                duration: "1 day",
                status: "pending",
                importance: "high",
                isAIAdaptation: false
            },
            {
                id: "fallback-3",
                title: "Community Research",
                description: "Find and join 3 online communities (Reddit, Discord, LinkedIn) related to this field.",
                type: "skill",
                duration: "1 day",
                status: "pending",
                importance: "medium",
                isAIAdaptation: false
            }
        ]
    }
];

const getFallbackDailyChallenge = (): DailyChallenge => ({
    question: "Logic Puzzle: If you have a 3-gallon jug and a 5-gallon jug, how do you measure exactly 4 gallons?",
    options: ["Fill 5, pour into 3, empty 3, pour remaining 2 into 3, fill 5, pour into 3.", "Fill both and pour out half.", "It is impossible.", "Fill 3, pour into 5, fill 3 again."],
    correctAnswer: 0,
    explanation: "Standard water jug riddle logic! (AI Quota limit reached, showing offline puzzle)",
    difficulty: "medium"
});

const getFallbackTrivia = (): TriviaQuestion => ({
    question: "Which number is known as the 'Magic Number' in physics?",
    options: ["137", "42", "3.14", "0"],
    correctIndex: 0
});

const getFallbackSimulation = (careerTitle: string): Simulation => ({
    title: "Crisis Management (Offline)",
    scenario: `You are working as a ${careerTitle} and a critical system/process has failed. The AI service is currently unavailable to generate a specific scenario. How do you proceed?`,
    role: careerTitle,
    options: [
        { text: "Panic and escalate immediately", outcome: "Not ideal. Try to analyze first.", score: 10 },
        { text: "Analyze the logs/situation calmly", outcome: "Correct approach. Assessment is key.", score: 50 },
        { text: "Ignore it until tomorrow", outcome: "Negligence. The issue worsened.", score: 0 }
    ]
});

// --- API FUNCTIONS ---

export const analyzeInterests = async (answers: string[]): Promise<CareerOption[]> => {
  const ai = getAI();
  const prompt = `
    User profile answers:
    ${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}
    
    Based on these answers, suggest exactly 3 distinct career paths suitable for this user.
    Provide a fit score (0-100) and a brief reason why.
  `;

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                fitScore: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              },
              required: ['id', 'title', 'description', 'fitScore', 'reason']
            }
          }
        }
      });
      const text = response.text;
      return text ? JSON.parse(text) : [];
  } catch (e) {
      console.error("Analysis failed", e);
      // Fallback options
      return [
          { id: '1', title: 'Software Engineer', description: 'Build and maintain software systems.', fitScore: 85, reason: 'High demand and versatile.' },
          { id: '2', title: 'Data Analyst', description: 'Interpret data to solve problems.', fitScore: 80, reason: 'Analytical approach.' },
          { id: '3', title: 'Digital Marketer', description: 'Promote products online.', fitScore: 75, reason: 'Creative and strategic.' }
      ];
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  const prompt = `
    User wants to search for a career path related to: "${query}".
    Generate 3 distinct career options that match this search query.
    Fit Score should be based on relevance to the query string "${query}".
  `;

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                fitScore: { type: Type.NUMBER },
                reason: { type: Type.STRING }
              },
              required: ['id', 'title', 'description', 'fitScore', 'reason']
            }
          }
        }
      });
      const text = response.text;
      return text ? JSON.parse(text) : [];
  } catch (e) {
      console.error("Search failed", e);
      return [{ id: 'search-fallback', title: query, description: 'Custom search result.', fitScore: 100, reason: 'Direct match.' }];
  }
};

export const generateSkillAssessment = async (careerTitle: string): Promise<SkillAssessment> => {
    const ai = getAI();
    const prompt = `
      Create a short technical skill assessment for the career: "${careerTitle}".
      Generate exactly 3 multiple-choice questions.
      Output JSON with 'questions' array.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctIndex: { type: Type.NUMBER }
                                },
                                required: ['text', 'options', 'correctIndex']
                            }
                        }
                    }
                }
            }
        });
        const text = response.text;
        return text ? JSON.parse(text) : { questions: [] };
    } catch (e) {
        return { 
            questions: [
                { text: `How would you rate your knowledge of ${careerTitle}?`, options: ["None", "Basic", "Good", "Expert"], correctIndex: 2 },
                { text: "Have you worked on a project in this field?", options: ["No", "Yes, academic", "Yes, professional", "Yes, personal"], correctIndex: 2 },
                { text: "Are you familiar with the industry tools?", options: ["No", "Heard of them", "Yes", "Mastered"], correctIndex: 2 }
            ] 
        };
    }
};

export const generateDailyChallenge = async (careerTitle: string, level: string): Promise<DailyChallenge> => {
    const ai = getAI();
    const prompt = `
      Generate a single "Daily Quest" multiple-choice question for a ${level} ${careerTitle}.
      Output strict JSON.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.NUMBER },
                        explanation: { type: Type.STRING },
                        difficulty: { type: Type.STRING, enum: ['easy', 'medium', 'hard'] }
                    },
                    required: ['question', 'options', 'correctAnswer', 'explanation', 'difficulty']
                }
            }
        });
        const text = response.text;
        return text ? JSON.parse(text) : getFallbackDailyChallenge();
    } catch (e) {
        return getFallbackDailyChallenge();
    }
};

export const generateSimulation = async (careerTitle: string): Promise<Simulation> => {
    const ai = getAI();
    const prompt = `
      Create a mini "Job Simulation" scenario for a ${careerTitle}.
      Provide 3 choices for how they react.
      Output strict JSON.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        scenario: { type: Type.STRING },
                        role: { type: Type.STRING },
                        options: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    outcome: { type: Type.STRING },
                                    score: { type: Type.NUMBER }
                                },
                                required: ['text', 'outcome', 'score']
                            }
                        }
                    },
                    required: ['title', 'scenario', 'role', 'options']
                }
            }
        });
        const text = response.text;
        return text ? JSON.parse(text) : getFallbackSimulation(careerTitle);
    } catch (e) {
        return getFallbackSimulation(careerTitle);
    }
};

export const generateTriviaQuestion = async (careerTitle: string): Promise<TriviaQuestion> => {
    const ai = getAI();
    const prompt = `
      Generate a single trivia multiple-choice question related to "${careerTitle}".
      Output strict JSON with 'question', 'options' (array of 4 strings), and 'correctIndex' (number 0-3).
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.NUMBER }
                    },
                    required: ['question', 'options', 'correctIndex']
                }
            }
        });
        const text = response.text;
        return text ? JSON.parse(text) : getFallbackTrivia();
    } catch (e) {
        return getFallbackTrivia();
    }
};

export const generatePhaseSummary = async (phaseName: string, items: RoadmapItem[]): Promise<string> => {
    const ai = getAI();
    const itemTitles = items.map(i => i.title).join(", ");
    const prompt = `
        The user has just completed the phase "${phaseName}" in their career roadmap.
        Completed items: ${itemTitles}.
        Write a brief, motivating summary (2-3 sentences).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "Phase complete! You are making excellent progress.";
    } catch (e) {
        return "Great job completing this phase! Keep up the momentum.";
    }
};

export const calculateRemainingDays = (phases: RoadmapPhase[]): number => {
    let totalDays = 0;
    phases.forEach(phase => {
        phase.items.forEach(item => {
            if (item.status === 'pending') {
                const duration = item.duration.toLowerCase();
                if (duration.includes('month')) {
                    const val = parseInt(duration) || 1;
                    totalDays += val * 30;
                } else if (duration.includes('week')) {
                    const val = parseInt(duration) || 1;
                    totalDays += val * 7;
                } else if (duration.includes('day')) {
                    const val = parseInt(duration) || 1;
                    totalDays += val;
                } else {
                    totalDays += 1;
                }
            }
        });
    });
    return totalDays || 1;
};

export const generateRoadmap = async (
  careerTitle: string,
  currentLevel: string,
  targetDate: string,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner',
  focusAreas: string = '',
  adaptationContext?: {
      type: 'initial' | 'compress_schedule' | 'simplify_schedule' | 'redistribute' | 'append_content' | 'increase_difficulty_same_time';
      progressStr?: string;
      startingPhaseNumber?: number;
  }
): Promise<RoadmapPhase[]> => {
  const ai = getAI();
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  const parts = targetDate.split('-');
  const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDaysRaw = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const diffDays = diffDaysRaw >= 0 ? diffDaysRaw + 1 : 0;
  
  const effectiveDays = diffDays <= 0 ? 1 : diffDays;
  const startPhase = adaptationContext?.startingPhaseNumber || 1;

  let adaptationPrompt = "";
  switch (adaptationContext?.type) {
      case 'compress_schedule':
          adaptationPrompt = `STRATEGY: COMPRESS. Fit to ${effectiveDays} days. Higher pace.`;
          break;
      case 'simplify_schedule':
          adaptationPrompt = `STRATEGY: SIMPLIFY. Remove optional content. Fit to ${effectiveDays} days.`;
          break;
      case 'redistribute':
          adaptationPrompt = `STRATEGY: REDISTRIBUTE. Spread evenly over ${effectiveDays} days.`;
          break;
      case 'append_content':
          adaptationPrompt = `STRATEGY: APPEND DIFFICULTY. Add advanced topics to fill ${effectiveDays} days.`;
          break;
      case 'increase_difficulty_same_time':
           adaptationPrompt = `STRATEGY: INCREASE DIFFICULTY. Same ${effectiveDays} days, harder content.`;
           break;
      default:
           adaptationPrompt = "Create a balanced roadmap fitting the duration.";
  }

  const context = adaptationContext?.progressStr ? `Current Context: ${adaptationContext.progressStr}` : '';
  const prompt = `
    Create a strict, detailed educational roadmap for a user wanting to become a "${careerTitle}".
    Target Date: ${targetDate} (${effectiveDays} days left).
    Exp Level: ${experienceLevel}.
    ${focusAreas ? `Focus: ${focusAreas}.` : ''}
    ${context}
    ${adaptationPrompt}
    
    RULES:
    1. Total tasks must sum to approx ${effectiveDays} days.
    2. EACH item must be exactly "1 day" duration. Split big topics.
    3. Start from Phase ${startPhase}.
    
    Return JSON format with 'phaseName' and 'items' array.
  `;

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phaseName: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['skill', 'project', 'internship', 'certificate'] },
                      duration: { type: Type.STRING },
                      status: { type: Type.STRING, enum: ['pending'] },
                      link: { type: Type.STRING, nullable: true },
                      importance: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                      isAIAdaptation: { type: Type.BOOLEAN, nullable: true }
                    },
                    required: ['id', 'title', 'description', 'type', 'duration', 'status', 'importance']
                  }
                }
              },
              required: ['phaseName', 'items']
            }
          }
        }
      });
      const text = response.text;
      return text ? JSON.parse(text) : getFallbackRoadmap(careerTitle);
  } catch (e) {
      console.error("Roadmap generation failed", e);
      return getFallbackRoadmap(careerTitle);
  }
};

export const fetchTechNews = async (careerInterest: string): Promise<NewsItem[]> => {
  try {
    const ai = getAI();
    // Using simple search tool
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: `Find 5 recent news articles related to "${careerInterest}".`,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const webChunks = chunks
        .filter((c: any) => c.web?.uri && c.web?.title)
        .map((c: any) => {
             let hostname = "Web Source";
             try {
                 const urlObj = new URL(c.web.uri);
                 let h = urlObj.hostname.replace('www.', '');
                 // Filter internal Google domains
                 if (h.includes('google') || h.includes('vervel') || h.includes('corp') || h.includes('gstatic')) {
                     const titleParts = c.web.title.split('-');
                     if (titleParts.length > 1) {
                        hostname = titleParts[titleParts.length - 1].trim();
                     } else {
                        hostname = "Tech News";
                     }
                 } else {
                     hostname = h;
                 }
             } catch (e) {
                 hostname = "News Update";
             }
             return {
                title: c.web.title,
                summary: "Click to read full story.", 
                url: c.web.uri,
                source: hostname,
                date: "Recent"
             };
        });

    const uniqueItems = webChunks.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t) => t.url === item.url)
    ).slice(0, 5); 

    if (uniqueItems.length > 0) return uniqueItems;
    
    // If no chunks but no error, generic fallback
    throw new Error("No news found");

  } catch (e: any) {
    console.error("Failed to fetch news", e);
    // Determine if it's a quota error or generic
    const isQuota = e.message?.includes('429') || e.status === 429 || e.toString().includes('RESOURCE_EXHAUSTED');
    const title = isQuota ? "News Unavailable (Quota Limit)" : `${careerInterest} Updates`;
    const summary = isQuota ? "Our AI news service is currently overloaded. Please check Google News directly." : "Could not fetch latest headlines.";
    
    return [
        { 
            title: title, 
            summary: summary, 
            url: `https://www.google.com/search?q=${encodeURIComponent(careerInterest + " news")}&tbm=nws`, 
            source: "System", 
            date: "Now" 
        }
    ];
  }
};

export const getChatResponse = async (message: string, context: string): Promise<string> => {
    const ai = getAI();
    const prompt = `
        You are 'PathFinder AI Assistant', a career guide.
        Context: User is pursuing "${context}".
        User Query: "${message}"
        Answer concisely.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "I'm here to help with your career journey.";
    } catch (e) {
        return "I'm having trouble connecting to the AI brain right now (Quota Limit). Please try again later.";
    }
};
