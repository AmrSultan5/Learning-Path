import { RotateCcw, CheckCircle2, BookOpen, Clock, Target, Lightbulb, MessageCircle } from 'lucide-react';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import cocaColaHBCLogo from '@/assets/59218e6eca964424a8f051f5c7fe905235198f2c.png';
import type { UserProfile, JobFunction, ExperienceLevel, InterestArea } from '@/app/App';
import { useState, useEffect, useMemo } from 'react';
import { PathChatModal } from '@/app/components/PathChatModal';
import { useSound } from '@/utils/sounds';

interface ResultsScreenProps {
  profile: UserProfile;
  username: string;
  learningPathId: number;
  aiSummary: AISummary;
  onRestart: () => void;
}

interface AISummary {
  selected_paths: {
    learning_path: string;
    link?: string;
    modules: {
      module_name: string;
      submodules: {
        name: string;
        duration: number;
      }[];
    }[];
  }[];
  total_minutes: number;
  estimated_weeks: number;
  weekly_load_hours: number;
}

export function ResultsScreen({ profile, username, learningPathId, aiSummary, onRestart }: ResultsScreenProps) {

  console.log("AI SUMMARY RECEIVED:", aiSummary);
  
  const [selectedPath, setSelectedPath] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { playClick } = useSound();
  const selectedPaths = aiSummary?.selected_paths ?? [];
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const API_BASE = import.meta.env.VITE_API_URL;

  const overallProgress = useMemo(() => {
    let total = 0;
    let done = 0;

    selectedPaths.forEach((path, pIndex) => {
      path.modules.forEach((module, mIndex) => {
        module.submodules.forEach((_, sIndex) => {
          total++;
          const key = `${pIndex}-${mIndex}-${sIndex}`;
          if (completed[key]) done++;
        });
      });
    });

    return total === 0 ? 0 : (done / total) * 100;
  }, [selectedPaths, completed]);

  // TOTAL TIME FROM AI
const totalMinutes = aiSummary?.total_minutes ?? 0;

// CALCULATE REMAINING TIME
const remainingMinutes = useMemo(() => {
  let deducted = 0;

  selectedPaths.forEach((path, pIndex) => {
    path.modules.forEach((module, mIndex) => {
      module.submodules.forEach((sub, sIndex) => {
        const key = `${pIndex}-${mIndex}-${sIndex}`;
        if (completed[key]) {
          deducted += sub.duration;
        }
      });
    });
  });

  return Math.max(totalMinutes - deducted, 0);
}, [selectedPaths, completed, totalMinutes]);

const completedMinutes = totalMinutes - remainingMinutes;

  useEffect(() => {
  async function loadProgress() {
    try {
      const res = await fetch(
        `${API_BASE}/progress?username=${encodeURIComponent(username)}&learning_path_id=${learningPathId}`
      );
      const data = await res.json();

      if (data.progress_json) {
        setCompleted(data.progress_json);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load progress", error);
    } finally {
      setIsLoaded(true);
    }
  }
  if (username && learningPathId) {
    loadProgress();
  }
}, [username, learningPathId]);

useEffect(() => {
  if (!isLoaded || !username || !learningPathId) return;

  const timeout = setTimeout(async () => {
    try {
      await fetch(`${API_BASE}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: username,
          learning_path_id: learningPathId,
          progress_json: completed,
          overall_progress: Math.round(overallProgress)
        })
      });
    } catch (error) {
      console.error("Failed to save progress", error);
    }
  }, 800); // waits 800ms after last change

  return () => clearTimeout(timeout);
}, [completed, username, learningPathId, overallProgress]);

  const openModal = (path: any) => {
    playClick();
    setSelectedPath(path);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPath(null);
    setIsModalOpen(false);
  };

  const toggleSubmodule = (
    pathIndex: number,
    moduleIndex: number,
    subIndex: number
  ) => {
    const key = `${pathIndex}-${moduleIndex}-${subIndex}`;
    setCompleted(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const calculateModuleProgress = (
  pathIndex: number,
  moduleIndex: number,
  submodulesLength: number
) => {
  let completedCount = 0;

  for (let i = 0; i < submodulesLength; i++) {
    const key = `${pathIndex}-${moduleIndex}-${i}`;
    if (completed[key]) completedCount++;
  }

  return (completedCount / submodulesLength) * 100;
};

const calculatePathProgress = (pathIndex: number) => {
  let total = 0;
  let done = 0;

  selectedPaths[pathIndex]?.modules.forEach((module, mIndex) => {
    module.submodules.forEach((_, sIndex) => {
      total++;
      const key = `${pathIndex}-${mIndex}-${sIndex}`;
      if (completed[key]) done++;
    });
  });

  return total === 0 ? 0 : (done / total) * 100;
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-[#F40009] text-white rounded-3xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <img src={hellenLogo} alt="MAILA" className="h-12" />
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-10 h-10" />
                  <h1 className="text-3xl md:text-4xl">Your Learning Path</h1>
                </div>
              </div>
            </div>
            <img src={cocaColaHBCLogo} alt="Coca-Cola HBC" className="h-10" />
          </div>
          <p className="text-white/90 text-lg">
            Based on your profile, we've created a personalized learning journey for you.
          </p>
        </div>

        {/* Profile Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl text-gray-800 mb-4">Your Profile</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Job Function</p>
              <p className="text-gray-800">{formatJobFunction(profile.jobFunction)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Experience</p>
              <p className="text-gray-800 capitalize">{profile.experienceLevel}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Interest Areas</p>
              <p className="text-gray-800">{profile.interests.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Time Available</p>
              <p className="text-gray-800">{profile.timeCommitment} hours</p>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Overall Progress
            </h2>
            <span className="text-sm text-[#F40009] font-semibold">
              {Math.round(overallProgress)}%
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F40009] to-[#DC0012] transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-sm text-gray-600">
            <span>Total: {formatMinutes(totalMinutes)}</span>
            <span>Completed: {formatMinutes(completedMinutes)}</span>
            <span className="text-[#F40009] font-semibold">
              Remaining: {formatMinutes(remainingMinutes)}
            </span>
          </div>
            {overallProgress === 100 && (
              <div className="mt-4 text-center text-[#F40009] font-bold text-lg">
                🎉 Congratulations! You completed your full learning journey!
              </div>
            )}
        </div>

        {/* Recommended Paths */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-6 h-6 text-[#F40009]" />
            <h2 className="text-2xl text-gray-800">Recommended Learning Paths</h2>
          </div>
          <p className="text-gray-600 mb-6">
            We recommend the following paths in this order to maximize your learning journey.
          </p>

          {selectedPaths.length > 0 && (
            <div className="space-y-4">
              {selectedPaths.map((path, index) => {
                const pathProgress = calculatePathProgress(index);
                // TOTAL MINUTES FOR THIS PATH
                let pathTotalMinutes = 0;
                let pathDeductedMinutes = 0;

                path.modules.forEach((module, mIndex) => {
                  module.submodules.forEach((sub, sIndex) => {
                    pathTotalMinutes += sub.duration;

                    const key = `${index}-${mIndex}-${sIndex}`;
                    if (completed[key]) {
                      pathDeductedMinutes += sub.duration;
                    }
                  });
                });

                const pathRemainingMinutes = pathTotalMinutes - pathDeductedMinutes;
                const pathCompletedMinutes = pathDeductedMinutes;

                // Calculate weekly hours dynamically
                const weeklyHours = profile.timeCommitment || 1; // fallback safety
                const pathEstimatedWeeks = Math.ceil(
                  (pathRemainingMinutes / 60) / weeklyHours
                );

                return (

                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-[#F40009] to-[#DC0012] text-white p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
                        {index + 1}
                      </div>

                      <div className="flex-1">
                        <h3 className="text-2xl mb-2">
                          {path.learning_path}
                        </h3>

                        <p className="text-white/90 mb-3">
                          AI selected this learning journey based on your {profile.jobFunction} role and {profile.experienceLevel} experience.
                        </p>

                        <div className="flex flex-col text-sm mt-2 gap-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            {pathEstimatedWeeks} weeks · {weeklyHours} hrs/week
                          </span>
                        </div>

                        <div className="text-xs text-white/90">
                          Total: {formatMinutes(pathTotalMinutes)} · 
                          Completed: {formatMinutes(pathCompletedMinutes)} · 
                          Remaining: {formatMinutes(pathRemainingMinutes)}
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="p-6 space-y-6">
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Path Progress</span>
                        <span className="text-[#F40009] font-semibold">
                          {Math.round(pathProgress)}%
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#F40009] to-[#DC0012] transition-all duration-700 ease-out"
                          style={{ width: `${pathProgress}%` }}
                        />
                      </div>
                    </div>
                    {path.modules.map((module, moduleIndex) => {
                      const moduleProgress = calculateModuleProgress(
                        index,
                        moduleIndex,
                        module.submodules.length
                      );

                      return (
                        <div key={moduleIndex}>

                          {/* Module Title */}
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-lg font-semibold text-gray-800">
                              {module.module_name}
                            </h4>

                            {/* Mark Module Complete Button */}
                            <button
                              onClick={() => {
                                module.submodules.forEach((_, subIndex) => {
                                  const key = `${index}-${moduleIndex}-${subIndex}`;
                                  setCompleted(prev => ({
                                    ...prev,
                                    [key]: true
                                  }));
                                });
                              }}
                              className="text-xs text-[#F40009] hover:underline"
                            >
                              Mark Complete
                            </button>
                          </div>

                          {/* Module Progress */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">Module Progress</span>
                              <span className="text-[#F40009] font-semibold">
                                {Math.round(moduleProgress)}%
                              </span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#F40009] to-[#DC0012] transition-all duration-700 ease-out"
                                style={{ width: `${moduleProgress}%` }}
                              />
                            </div>
                          </div>

                          {/* Submodules */}
                          <div className="space-y-2">
                            {module.submodules.map((sub, subIndex) => (
                              <div
                                key={subIndex}
                                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg hover:bg-red-50 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={completed[`${index}-${moduleIndex}-${subIndex}`] || false}
                                    onChange={() =>
                                      toggleSubmodule(index, moduleIndex, subIndex)
                                    }
                                    className="w-5 h-5 accent-[#F40009] cursor-pointer"
                                  />

                                  <a
                                    href={path.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-gray-700 hover:text-[#F40009]"
                                  >
                                    {sub.name}
                                  </a>
                                </div>

                                <span className="text-xs text-gray-500">
                                  {sub.duration} min
                                </span>
                              </div>
                            ))}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => { playClick(); onRestart(); }}
            className="px-8 py-3 rounded-full border-2 border-[#F40009] text-[#F40009] hover:bg-red-50 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Create Another Learning Path
          </button>
          <button onClick={playClick} className="px-8 py-3 rounded-full bg-[#F40009] text-white hover:bg-[#DC0012] transition-all shadow-md">
            Save This Learning Journey
          </button>
        </div>
      </div>

      {/* Path Chat Modal */}
      {selectedPath && (
        <PathChatModal
          isOpen={isModalOpen}
          onClose={closeModal}
          learningPath={selectedPath}
        />
      )}
    </div>
  );
}

function formatMinutes(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

function formatJobFunction(jobFunction: JobFunction | null): string {
  if (!jobFunction) return '';
  
  const labels: Record<JobFunction, string> = {
    'commercial': 'Commercial',
    'supply-chain': 'Supply Chain',
    'marketing': 'Marketing',
    'finance': 'Finance',
    'operations': 'Operations',
    'hr': 'Human Resources',
    'other': 'Other'
  };
  
  return labels[jobFunction];
}