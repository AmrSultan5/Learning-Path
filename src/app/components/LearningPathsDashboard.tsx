import { useState, useEffect } from 'react';
import { Plus, BookOpen, Calendar, TrendingUp, LogOut } from 'lucide-react';
import { useSound } from '@/utils/sounds';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import type { UserProfile } from '@/app/App';

export interface SavedLearningPath {
  id: string;
  name: string;
  createdAt: Date;
  profile: UserProfile;
  recommendedPath?: string;
}

interface LearningPathsDashboardProps {
  userEmail: string;
  savedPaths: SavedLearningPath[];
  onSelectPath: (path: SavedLearningPath) => void;
  onCreateNew: () => void;
  onLogout: () => void;
}

export function LearningPathsDashboard({
  userEmail,
  savedPaths,
  onSelectPath,
  onCreateNew,
  onLogout
}: LearningPathsDashboardProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const { playClick, playTyping } = useSound();

  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const API_BASE = import.meta.env.VITE_API_URL;

  useEffect(() => {
  async function loadProgressForPaths() {
    const results = await Promise.all(
      savedPaths.map(async (path) => {
        try {
          const res = await fetch(
            `${API_BASE}/progress?username=${encodeURIComponent(userEmail)}&learning_path_id=${path.id}`
          );

          const data = await res.json();
          const percent = data.overall_progress ?? 0;

        return { id: path.id, percent };
        } catch {
          return { id: path.id, percent: 0 };
        }
      })
    );

    const newProgressMap: Record<string, number> = {};
    results.forEach(r => {
      newProgressMap[r.id] = r.percent;
    });

    setProgressMap(newProgressMap);
  }

  if (savedPaths.length > 0) {
    loadProgressForPaths();
  }

}, [savedPaths, userEmail]);

  const handleCreateNew = () => {
    playClick();
    onCreateNew();
  };

  const handleSelectPath = (path: SavedLearningPath) => {
    playClick();
    onSelectPath(path);
  };

  const handleLogout = () => {
    playClick();
    onLogout();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPathIcon = (profile: UserProfile) => {
    if (profile.interests.includes('visualization')) return '📊';
    if (profile.interests.includes('ml-ai')) return '🤖';
    if (profile.interests.includes('statistics')) return '📈';
    if (profile.interests.includes('data-engineering')) return '⚙️';
    return '📚';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-[#F40009] rounded-xl">
                <span className="text-2xl font-bold text-white">H+</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Hellen+ for AI Academy
                </h1>
                <p className="text-sm text-gray-600">{userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[#F40009] hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600">
            Continue your Data, Analytics & AI learning journey or start a new path
          </p>
        </div>

        {/* Learning Paths Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Path Card */}
          <button
            onClick={handleCreateNew}
            onMouseEnter={() => {
              playTyping();
              setHoveredCard('new');
            }}
            onMouseLeave={() => setHoveredCard(null)}
            className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:border-[#F40009] hover:bg-red-50 transition-all duration-200 min-h-[220px] flex flex-col items-center justify-center gap-4 group"
          >
            <div className="w-16 h-16 bg-gray-100 group-hover:bg-[#F40009] rounded-2xl flex items-center justify-center transition-colors">
              <Plus className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-1">
                Create New Learning Path
              </h3>
              <p className="text-sm text-gray-600">
                Start a personalized learning journey with Hellen+
              </p>
            </div>
          </button>

          {/* Saved Learning Paths */}
          {savedPaths.map((path) => (
            <button
              key={path.id}
              onClick={() => handleSelectPath(path)}
              onMouseEnter={() => {
                playTyping();
                setHoveredCard(path.id);
              }}
              onMouseLeave={() => setHoveredCard(null)}
              className={`bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-[#F40009] hover:shadow-lg transition-all duration-200 min-h-[220px] flex flex-col text-left ${
                hoveredCard === path.id ? 'scale-105' : ''
              }`}
            >
              {/* Path Icon */}
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{getPathIcon(path.profile)}</div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  progressMap[path.id] === 100
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  {progressMap[path.id] === undefined
                    ? "Loading..."
                    : progressMap[path.id] === 100
                      ? "Completed"
                      : `${Math.round(progressMap[path.id])}%`}
                </div>
              </div>

              {/* Path Details */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {path.name}
                </h3>
                
                {path.recommendedPath && (
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-[#F40009]" />
                    <span className="text-sm text-gray-700">
                      {path.recommendedPath}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Created {formatDate(path.createdAt)}</span>
                </div>

                {/* Profile Summary */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {path.profile.experienceLevel && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium capitalize">
                      {path.profile.experienceLevel}
                    </span>
                  )}
                  {path.profile.jobFunction && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium capitalize">
                      {path.profile.jobFunction.replace('-', ' ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#F40009] to-[#DC0012] transition-all duration-500"
                    style={{ width: `${progressMap[path.id] ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Continue Button */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-[#F40009] font-medium text-sm">
                  Continue Learning →
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {savedPaths.length === 0 && (
          <div className="mt-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No learning paths yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first personalized learning path to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}