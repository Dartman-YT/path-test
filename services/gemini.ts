
import { GoogleGenAI, Type } from "@google/genai";
import { CareerOption, RoadmapPhase, NewsItem, RoadmapItem, DailyChallenge, SkillAssessment, Simulation, TriviaQuestion } from '../types';

// Helper to get AI instance safely at runtime
const getAI = () => {
  try {
      // Basic check to prevent immediate crash if key is missing, 
      // though functionality will obviously fail.
      const key = process.env.API_KEY;
      if (!key) throw new Error("API Key missing");
      return new GoogleGenAI({ apiKey: key });
  } catch (e) {
      console.warn("Gemini Client Init Warning:", e);
      // Return a dummy object or handle upstream. 
      // For now, let's allow it to throw inside the specific functions if key is missing.
      return new GoogleGenAI({ apiKey: 'DUMMY_KEY_FOR_BUILD' });
  }
};

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
      return [];
  }
};

export const searchCareers = async (query: string): Promise<CareerOption[]> => {
  const ai = getAI();
  const prompt = `
    User wants to search for a career path related to: "${query}".
    
    Generate 3 distinct career options that match this search query.
    If the query is specific (e.g. "React Developer"), provide variations or levels.
    If generic (e.g. "Tech"), provide diverse options.
    
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
      return [];
  }
};

export const generateSkillAssessment = async (careerTitle: string): Promise<SkillAssessment> => {
    const ai = getAI();
    const prompt = `
      Create a short technical skill assessment for the career: "${careerTitle}".
      Generate exactly 3 multiple-choice questions.
      The questions should range from basic to intermediate difficulty to gauge proficiency.
      
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
        return { questions: [] };
    }
};

export const generateDailyChallenge = async (careerTitle: string, level: string): Promise<DailyChallenge> => {
    const ai = getAI();
    const prompt = `
      Generate a single "Daily Quest" multiple-choice question for a ${level} ${careerTitle}.
      It should be a practical, real-world scenario or a technical concept check.
      
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
        return text ? JSON.parse(text) : null;
    } catch (e) {
        return { 
            question: "Daily Challenge System Maintenance", 
            options: ["Check back later"], 
            correctAnswer: 0, 
            explanation: "System is updating.", 
            difficulty: "easy" 
        } as any;
    }
};

export const generateSimulation = async (careerTitle: string): Promise<Simulation> => {
    const ai = getAI();
    const prompt = `
      Create a mini "Job Simulation" scenario for a ${careerTitle}.
      This should be a role-playing challenge where the user faces a specific problem (e.g., a bug, a client request, a design conflict).
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
                                    score: { type: Type.NUMBER } // 10-50 points
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
        return text ? JSON.parse(text) : null;
    } catch (e) {
        return null;
    }
};

export const generateTriviaQuestion = async (careerTitle: string): Promise<TriviaQuestion> => {
    const ai = getAI();
    const prompt = `
      Generate a single trivia multiple-choice question related to "${careerTitle}".
      It should be fun, interesting, or surprising.
      
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
        return text ? JSON.parse(text) : { 
             question: "Which of these is a key concept in " + careerTitle + "?",
             options: ["Option A", "Option B", "Option C", "Option D"],
             correctIndex: 0
        };
    } catch (e) {
        return { 
            question: "Practice question unavailable.", 
            options: ["Try again", "Later", "Check connection", "Wait"], 
            correctIndex: 0 
        };
    }
};

export const generatePhaseSummary = async (phaseName: string, items: RoadmapItem[]): Promise<string> => {
    const ai = getAI();
    const itemTitles = items.map(i => i.title).join(", ");
    const prompt = `
        The user has just completed the phase "${phaseName}" in their career roadmap.
        Completed items: ${itemTitles}.
        
        Write a brief, motivating summary (2-3 sentences) of what they have achieved.
        Focus on the skills gained. Do not use markdown. Be conversational and encouraging.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "Great job completing this phase! You've mastered key concepts.";
    } catch (e) {
        return "Phase complete! You are making excellent progress.";
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
                    // Default for "hours" or unknown
                    totalDays += 1;
                }
            }
        });
    });
    return totalDays || 1; // Minimum 1 day
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
  // Calculate exact duration matching Dashboard logic (Inclusive Days)
  const start = new Date();
  start.setHours(12, 0, 0, 0);

  // Manual parse to ensure local time noon alignment, prevent timezone shifting
  const parts = targetDate.split('-');
  const end = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDaysRaw = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  // Add 1 to make it inclusive (e.g. Target=Today is 1 day of work)
  const diffDays = diffDaysRaw >= 0 ? diffDaysRaw + 1 : 0;
  
  const durationContext = diffDays <= 0 
    ? "The target date is in the past. Create a crash course for TODAY only." 
    : `The user has EXACTLY ${diffDays} DAYS remaining to complete this.`;

  // Use diffDays for logic, but ensure at least 1 for granularity checks
  const effectiveDays = diffDays <= 0 ? 1 : diffDays;
  const startPhase = adaptationContext?.startingPhaseNumber || 1;

  // Adaptation Instructions
  let adaptationPrompt = "";
  
  switch (adaptationContext?.type) {
      case 'compress_schedule':
          adaptationPrompt = `
          STRATEGY: COMPRESS / INCREASE PACE (Shortened Deadline).
          - The user selected a date SOONER than before (${effectiveDays} days left).
          - They chose to "Redistribute to new date".
          - KEEP all the original topics and curriculum. Do NOT remove content.
          - Simply COMPRESS the schedule to fit the shorter timeframe.
          - This will result in a higher daily workload (Fast Pace).
          `;
          break;
      case 'simplify_schedule':
          adaptationPrompt = `
          STRATEGY: SIMPLIFY / REDUCE CONTENT (Shortened Deadline).
          - The user selected a date SOONER than before (${effectiveDays} days left).
          - They chose to "Reduce Content".
          - REMOVE optional, advanced, or niche topics.
          - Focus ONLY on the absolute essentials to maintain a normal, stress-free pace within the shorter time.
          `;
          break;
      case 'redistribute':
          adaptationPrompt = `
          STRATEGY: REDISTRIBUTE (Same or Extended Deadline).
          - The user wants to spread the remaining items evenly over ${effectiveDays} days.
          - Aim for Stress-Free Learning.
          - Add revision days, practice buffers, and ensure the pace is relaxed.
          - Do NOT add new difficult content unless necessary to fill a massive gap.
          `;
          break;
      case 'append_content':
          adaptationPrompt = `
          STRATEGY: APPEND DIFFICULTY (Extended Deadline).
          - The user has extended the deadline to ${effectiveDays} days.
          - They want to "Add Difficulty/More Content".
          - Keep the core curriculum.
          - Add NEW, ADVANCED, or SPECIALIZED phases at the end to fill the extra time.
          - Suggest "Senior Level" or "Specialist" topics.
          - Mark new items with 'isAIAdaptation': true.
          `;
          break;
      case 'increase_difficulty_same_time':
           adaptationPrompt = `
           STRATEGY: INCREASE DIFFICULTY (Same Deadline).
           - The deadline is unchanged (${effectiveDays} days).
           - The user wants a bigger challenge.
           - Replace basic tasks with advanced/complex versions.
           - The schedule must remain ${effectiveDays} days long, but the CONTENT must be harder/deeper.
           - Mark changed items with 'isAIAdaptation': true.
           `;
           break;
      default:
           // Initial generation or generic
           adaptationPrompt = "Create a balanced roadmap fitting the duration.";
  }

  const context = adaptationContext?.progressStr ? `Current Context: ${adaptationContext.progressStr}` : '';
  
  // Tailor prompt based on experience
  let experienceInstruction = '';
  if (experienceLevel === 'beginner') {
      experienceInstruction = 'User is a complete beginner. Start from absolute basics.';
  } else {
      experienceInstruction = `User is ${experienceLevel} level. SKIP basic introductions. Focus on advanced concepts. ${focusAreas ? `Focus heavily on: ${focusAreas}.` : ''}`;
  }

  const prompt = `
    Create a strict, detailed educational roadmap for a user wanting to become a "${careerTitle}".
    Current Status: ${currentLevel}.
    Target Completion Date: ${targetDate} (${effectiveDays} days from now).
    Experience Level: ${experienceLevel}.
    ${experienceInstruction}
    ${context}
    ${adaptationPrompt}
    
    IMPORTANT TIMELINE RULES (CRITICAL):
    1. **Strict Duration**: The sum of the duration of all items generated MUST roughly equal ${effectiveDays} days. 
    2. **Do NOT** generate 150 days of content if the limit is ${effectiveDays} days. Fit the content to the time.
    3. **Granularity**: The roadmap MUST be broken down into strict "1 day" tasks.
       - **EVERY SINGLE ITEM MUST HAVE A DURATION OF '1 day'**. 
       - Do NOT use "2 days", "1 week", etc. Break larger topics into "Part 1", "Part 2", etc.
       - Example: Instead of "Learn React (3 days)", output: "Learn React Basics (1 day)", "Learn React Hooks (1 day)", "Learn React State (1 day)".
       - This is a DAILY PLANNER.
    4. **Rounding**: ALWAYS use integer numbers for days.
    
    CONTINUATION RULE:
    This might be a continuation of an existing roadmap. Start numbering the phases from Phase ${startPhase}.
    
    OTHER REQUIREMENTS:
    1. **Structure**: Divide into logical phases.
    2. **Links**: Provide generic URLs for 'internship', 'certificate', or 'project'.
    3. **Items**: Mix skills, projects, internships, and certificates.
    4. **Badge**: If adaptation added special items, set 'isAIAdaptation' to true.
    
    Return JSON format.
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
      return text ? JSON.parse(text) : [];
  } catch (e) {
      // Fallback roadmap to prevent app crash
      console.error("Roadmap generation failed", e);
      return [];
  }
};

export const fetchTechNews = async (careerInterest: string): Promise<NewsItem[]> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: `Find 5 distinct, recent (last 30 days) news articles or major announcements specifically related to "${careerInterest}".`,
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
                 const h = urlObj.hostname.replace('www.', '');
                 // Filter internal Google domains and generic garbage
                 if (h.includes('google') || h.includes('vervel') || h.includes('corp') || h.includes('gstatic')) {
                     // Try to get source from title "Title - Source" or just use "Tech News"
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
                summary: "Read the full coverage at the source.", 
                url: c.web.uri,
                source: hostname,
                date: "Recent"
             };
        });

    const uniqueItems = webChunks.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t) => (
            t.url === item.url
        ))
    ).slice(0, 5); 

    if (uniqueItems.length > 0) return uniqueItems;

    return [
         { 
            title: `Latest News: ${careerInterest}`, 
            summary: "Search for the latest updates on Google News.", 
            url: `https://www.google.com/search?q=${encodeURIComponent(careerInterest + " news")}&tbm=nws`, 
            source: "Google News", 
            date: "Today" 
        }
    ];

  } catch (e) {
    console.error("Failed to fetch news", e);
    return [
        { 
            title: `${careerInterest} Updates`, 
            summary: "Explore the latest updates.", 
            url: `https://www.google.com/search?q=${encodeURIComponent(careerInterest + " news")}`, 
            source: "Google Search", 
            date: "Now" 
        }
    ];
  }
};

export const getChatResponse = async (message: string, context: string): Promise<string> => {
    const ai = getAI();
    const prompt = `
        You are 'PathFinder AI Assistant', a helpful and motivating career guide for a user.
        Context: The user is pursuing a career in "${context}".
        
        User Query: "${message}"
        
        Answer their question concisely.
        If they ask about the app features, explain them.
        If they ask for career advice, give professional advice suitable for a "${context}" role.
        Be encouraging. Keep responses under 50 words unless detailed explanation is needed.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "I'm here to help with your career journey.";
    } catch (e) {
        return "I'm having a bit of trouble connecting right now. Please try again in a moment.";
    }
};
