import { useState } from 'react';
import { MasterLandingPage } from '@/app/components/MasterLandingPage';
import { WelcomeScreen } from '@/app/components/WelcomeScreen';
import { LoginPage } from '@/app/components/LoginPage';
import { LearningPathsDashboard, SavedLearningPath } from '@/app/components/LearningPathsDashboard';
import { HybridChatInterface } from '@/app/components/HybridChatInterface';
import { ResultsScreen } from '@/app/components/ResultsScreen';
import { GeneratingPathScreen } from '@/app/components/GeneratingPathScreen';

export type JobFunction = 'commercial' | 'supply-chain' | 'marketing' | 'finance' | 'operations' | 'hr' | 'other';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type InterestArea = 'visualization' | 'statistics' | 'ml-ai' | 'data-engineering' | 'business-intelligence';
import { useEffect } from 'react';

export interface UserProfile {
  jobFunction: JobFunction | null;
  experienceLevel: ExperienceLevel | null;
  interests: InterestArea[];
  goals: string[];
  responses: string[];
  timeCommitment: number; // hours over 3 months
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState< 'master' | 'welcome' | 'login' | 'dashboard' | 'chat' | 'generating' | 'results'>('login');
  const [userEmail, setUserEmail] = useState<string>('');
  const [savedPaths, setSavedPaths] = useState<SavedLearningPath[]>([]);
  const [currentPathId, setCurrentPathId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'learning-path' | 'ai-adventure' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    jobFunction: null,
    experienceLevel: null,
    interests: [],
    goals: [],
    responses: [],
    timeCommitment: 0
  });
  const [aiSummary, setAiSummary] = useState<any | null>(null);
  const [learningPathId, setLearningPathId] = useState<number | null>(null);

  const handleSelectLearningPath = () => {
    setSelectedMode('learning-path');
    setCurrentScreen('dashboard');
  };

  const handleSelectAIAdventure = () => {
    alert('AI Adventure is coming soon! Redirecting you to Learning Path.');

    setSelectedMode('learning-path');
    setCurrentScreen('dashboard');
  };

  const handleStart = () => {
    setCurrentScreen('login');
  };

  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
  const handleUnload = () => {
    const sessionId = localStorage.getItem("session_id");

    if (sessionId) {
      navigator.sendBeacon(
        `${API_BASE}/session/end`,
        JSON.stringify({ session_id: Number(sessionId) })
      );
    }
  };

  window.addEventListener("beforeunload", handleUnload);

  return () => {
    window.removeEventListener("beforeunload", handleUnload);
  };
}, [API_BASE]);

useEffect(() => {
  if (!userEmail) return;

  const sessionId = localStorage.getItem("session_id");
  if (!sessionId) return;

  const enterTime = new Date();

  return () => {
    const exitTime = new Date();
    const durationSeconds = Math.floor(
      (exitTime.getTime() - enterTime.getTime()) / 1000
    );

    const screenIdentifier =
      currentScreen === "results" && learningPathId
        ? `results:${learningPathId}`
        : currentScreen;

    fetch(`${API_BASE}/activity/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: userEmail,
        session_id: Number(sessionId),
        screen_name: screenIdentifier,
        enter_time: enterTime.toISOString(),
        exit_time: exitTime.toISOString(),
        duration_seconds: durationSeconds
      })
    }).catch(err =>
      console.error("Activity log failed:", err)
    );
  };

}, [currentScreen, learningPathId]);

  const handleLogin = async (email: string) => {
  setUserEmail(email);

  try {
    // 🔹 1️⃣ START SESSION FIRST
    const sessionRes = await fetch(`${API_BASE}/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email })
    });

    if (!sessionRes.ok) {
      throw new Error("Failed to start session");
    }

    const sessionData = await sessionRes.json();

    // Store session info
    localStorage.setItem("username", email);
    localStorage.setItem("session_id", sessionData.session_id);

    // 🔹 2️⃣ Then fetch learning paths (your existing logic)
    const res = await fetch(
      `${API_BASE}/learning-paths/${email}`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch learning paths");
    }

    const backendPaths = await res.json();

    const mappedPaths: SavedLearningPath[] = backendPaths.map((path: any) => ({
      id: path.id.toString(),
      name: path.name,
      createdAt: new Date(path.created_at),
      profile: {
        jobFunction: path.job_function,
        experienceLevel: path.experience,
        interests: [],
        goals: [],
        responses: [],
        timeCommitment: path.time_available
          ? parseInt(path.time_available)
          : 0
      },
      recommendedPath: path.recommended_path
    }));

    setSavedPaths(mappedPaths);
    setCurrentScreen('master');

  } catch (err) {
    console.error("Login failed:", err);
    setSavedPaths([]);
    setCurrentScreen('master');
  }
};

  const handleLogout = async () => {
    const sessionId = localStorage.getItem("session_id");

    if (sessionId) {
      await fetch(`${API_BASE}/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: Number(sessionId)
        })
      });
    }

    localStorage.removeItem("session_id");
    localStorage.removeItem("username");

    setUserEmail('');
    setSavedPaths([]);
    setCurrentPathId(null);
    setSelectedMode(null);
    setUserProfile({
      jobFunction: null,
      experienceLevel: null,
      interests: [],
      goals: [],
      responses: [],
      timeCommitment: 0
    });

    setCurrentScreen('login');
  };

  const handleCreateNew = () => {
    setCurrentPathId(null);
    setUserProfile({
      jobFunction: null,
      experienceLevel: null,
      interests: [],
      goals: [],
      responses: [],
      timeCommitment: 0
    });
    setCurrentScreen('chat');
  };

  const handleSelectPath = async (path: SavedLearningPath) => {
    try {
      const res = await fetch(
        `${API_BASE}/learning-path/${path.id}`
      );

      if (!res.ok) {
        throw new Error("Failed to load learning path");
      }

      const fullData = await res.json();

      console.log("LOADED SAVED PATH:", fullData);

      setLearningPathId(fullData.id);

      setUserProfile({
        jobFunction: fullData.job_function,
        experienceLevel: fullData.experience,
        interests: fullData.interests
          ? fullData.interests.split(",")
          : [],
        goals: [],
        responses: [],
        timeCommitment: fullData.time_available
          ? parseInt(fullData.time_available)
          : 0
      });

      setAiSummary(fullData.ai_summary);

      setCurrentScreen('results');

    } catch (err) {
      console.error("Failed to load saved path:", err);
    }
  };

  const handleComplete = async (
    profile: UserProfile,
    pathId: number
  ) => {
    try {
      setUserProfile(profile);
      setLearningPathId(pathId);
      setCurrentScreen('generating');

      // 1️⃣ Complete path
      const completeRes = await fetch(
        `${API_BASE}/learning-path/${pathId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_function: profile.jobFunction,
            experience: profile.experienceLevel,
            interests: profile.interests,
            goals: profile.goals
          })
        }
      );

      if (!completeRes.ok) {
        throw new Error("Completion failed");
      }

      // 2️⃣ Fetch full generated path
      const fullRes = await fetch(
        `${API_BASE}/learning-path/${pathId}`
      );

      const fullData = await fullRes.json();

      console.log("FULL BACKEND RESPONSE:", fullData);

      const backendHours = fullData.time_available
        ? parseInt(fullData.time_available)
        : profile.timeCommitment;

      setUserProfile({
        ...profile,
        timeCommitment: backendHours
      });

      setAiSummary(fullData.ai_summary);

      // ✅ 3️⃣ REFRESH USER'S LEARNING PATHS HERE
      const res = await fetch(
        `${API_BASE}/learning-paths/${userEmail}`
      );

      const backendPaths = await res.json();

      const mappedPaths: SavedLearningPath[] = backendPaths.map((path: any) => ({
        id: path.id.toString(),
        name: path.name,
        createdAt: new Date(path.created_at),
        profile: {
          jobFunction: path.job_function,
          experienceLevel: path.experience,
          interests: path.interests
            ? path.interests.split(",")
            : [],
          goals: [],
          responses: [],
          timeCommitment: path.time_available
            ? parseInt(path.time_available)
            : 0
        },
        recommendedPath: path.recommended_path
      }));

      setSavedPaths(mappedPaths);

      // 4️⃣ Go to results
      setCurrentScreen('results');

    } catch (err) {
      console.error("Generation failed:", err);
      setCurrentScreen('dashboard');
    }
  };

  const handleRestart = () => {
    setCurrentScreen('dashboard');
  };

  // Generate a descriptive name for the learning path
  const generatePathName = (profile: UserProfile): string => {
    const level = profile.experienceLevel || 'beginner';
    const jobFunc = profile.jobFunction || 'general';
    const interest = profile.interests[0] || 'data-analytics';
    
    const jobLabels: Record<string, string> = {
      'commercial': 'Commercial',
      'supply-chain': 'Supply Chain',
      'marketing': 'Marketing',
      'finance': 'Finance',
      'operations': 'Operations',
      'hr': 'HR',
      'other': 'Professional'
    };

    const interestLabels: Record<string, string> = {
      'visualization': 'Data Visualization',
      'statistics': 'Statistics',
      'ml-ai': 'ML & AI',
      'data-engineering': 'Data Engineering',
      'business-intelligence': 'Business Intelligence'
    };

    return `${jobLabels[jobFunc]} - ${interestLabels[interest]} (${level})`;
  };

  // Determine recommended path based on profile
  const determineRecommendedPath = (profile: UserProfile): string => {
    if (profile.experienceLevel === 'beginner') {
      return 'Data Fundamentals';
    }
    
    if (profile.interests.includes('ml-ai')) {
      return profile.experienceLevel === 'advanced' ? 'Generative AI' : 'Machine Learning';
    }
    
    if (profile.interests.includes('visualization')) {
      return 'Data Visualization';
    }
    
    if (profile.interests.includes('statistics')) {
      return 'Data Science Basics';
    }
    
    return 'Data Projects';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentScreen === 'master' && <MasterLandingPage onSelectLearningPath={handleSelectLearningPath} onSelectAIAdventure={handleSelectAIAdventure} />}
      {currentScreen === 'welcome' && <WelcomeScreen onStart={handleStart} />}
      {currentScreen === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentScreen === 'dashboard' && (
        <LearningPathsDashboard
          userEmail={userEmail}
          savedPaths={savedPaths}
          onSelectPath={handleSelectPath}
          onCreateNew={handleCreateNew}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === 'chat' && <HybridChatInterface username={userEmail} onComplete={handleComplete} />}
      {currentScreen === 'generating' && <GeneratingPathScreen />}
      {currentScreen === 'results' && aiSummary && learningPathId && (
        <ResultsScreen
          profile={userProfile}
          username={userEmail}
          learningPathId={learningPathId}
          aiSummary={aiSummary}
          onRestart={handleRestart}
          onGoToDashboard={() => setCurrentScreen('dashboard')}
        />
      )}
    </div>
  );
}