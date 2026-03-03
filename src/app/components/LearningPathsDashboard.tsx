import { useState, useEffect } from 'react';
import { Plus, BookOpen, Calendar, TrendingUp, LogOut, Star, MessageSquare, Send, Pencil, Check } from 'lucide-react';
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

interface UserRatingData {
  rating: number;
  comment: string;
}

function InteractiveStarRating({
  currentRating,
  onRate
}: {
  currentRating: number;
  onRate: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= (hoverRating || currentRating);
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRate(starValue);
            }}
            onMouseEnter={() => setHoverRating(starValue)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 transition-transform hover:scale-125"
          >
            <Star
              className={`w-4 h-4 transition-colors ${isFilled
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-300'
                }`}
            />
          </button>
        );
      })}
      {currentRating > 0 && (
        <span className="text-xs font-medium text-gray-600 ml-1">
          {currentRating.toFixed(1)}
        </span>
      )}
    </div>
  );
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
  const [userRatingsMap, setUserRatingsMap] = useState<Record<string, UserRatingData>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showCommentFor, setShowCommentFor] = useState<string | null>(null);
  const [savingRating, setSavingRating] = useState<string | null>(null);
  const [editingNameFor, setEditingNameFor] = useState<string | null>(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [pathNames, setPathNames] = useState<Record<string, string>>({});
  const API_BASE = import.meta.env.VITE_API_URL;

  // Initialize path names from savedPaths
  useEffect(() => {
    const names: Record<string, string> = {};
    savedPaths.forEach(p => { names[p.id] = p.name; });
    setPathNames(names);
  }, [savedPaths]);

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

  // Fetch user-submitted ratings
  useEffect(() => {
    async function loadUserRatings() {
      try {
        const res = await fetch(
          `${API_BASE}/user-ratings/${encodeURIComponent(userEmail)}`
        );
        const data = await res.json();
        setUserRatingsMap(data);

        // Pre-fill comment inputs
        const inputs: Record<string, string> = {};
        for (const [id, ratingData] of Object.entries(data)) {
          inputs[id] = (ratingData as UserRatingData).comment || '';
        }
        setCommentInputs(inputs);
      } catch {
        setUserRatingsMap({});
      }
    }

    if (userEmail) {
      loadUserRatings();
    }
  }, [userEmail, savedPaths]);

  const saveRating = async (pathId: string, rating: number, comment?: string) => {
    setSavingRating(pathId);
    try {
      await fetch(`${API_BASE}/user-rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userEmail,
          learning_path_id: parseInt(pathId),
          rating,
          comment: comment ?? commentInputs[pathId] ?? ''
        })
      });

      setUserRatingsMap(prev => ({
        ...prev,
        [pathId]: {
          rating,
          comment: comment ?? commentInputs[pathId] ?? ''
        }
      }));
    } catch (err) {
      console.error('Failed to save rating:', err);
    }
    setSavingRating(null);
  };

  const handleStarClick = (pathId: string, rating: number) => {
    playClick();
    saveRating(pathId, rating);
  };

  const handleCommentSave = (pathId: string) => {
    playClick();
    const currentRating = userRatingsMap[pathId]?.rating || 0;
    if (currentRating === 0) return;
    saveRating(pathId, currentRating, commentInputs[pathId] || '');
    setShowCommentFor(null);
  };

  const handleStartEdit = (pathId: string) => {
    playClick();
    setEditingNameFor(pathId);
    setEditNameInput(pathNames[pathId] || '');
  };

  const handleSaveRename = async (pathId: string) => {
    if (!editNameInput.trim()) return;
    playClick();
    try {
      await fetch(`${API_BASE}/learning-path/${pathId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editNameInput.trim() })
      });
      setPathNames(prev => ({ ...prev, [pathId]: editNameInput.trim() }));
    } catch (err) {
      console.error('Failed to rename:', err);
    }
    setEditingNameFor(null);
  };

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
            <div
              key={path.id}
              onMouseEnter={() => {
                playTyping();
                setHoveredCard(path.id);
              }}
              onMouseLeave={() => setHoveredCard(null)}
              className={`bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-[#F40009] hover:shadow-lg transition-all duration-200 min-h-[220px] flex flex-col text-left ${hoveredCard === path.id ? 'scale-105' : ''
                }`}
            >
              {/* Clickable Area for Navigation */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleSelectPath(path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectPath(path);
                  }
                }}
                className="flex-1 text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F40009]/40 rounded-xl"
              >
                {/* Path Icon */}
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{getPathIcon(path.profile)}</div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${progressMap[path.id] === 100
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
                  {editingNameFor === path.id ? (
                    <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editNameInput}
                        onChange={(e) => setEditNameInput(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleSaveRename(path.id);
                          if (e.key === 'Escape') setEditingNameFor(null);
                        }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#F40009]/20 focus:border-[#F40009]"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveRename(path.id);
                        }}
                        className="p-1 text-green-600 hover:text-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mb-2 group/name">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {pathNames[path.id] || path.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(path.id);
                        }}
                        className="opacity-0 group-hover/name:opacity-100 p-1 text-gray-400 hover:text-[#F40009] transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}

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
              </div>

              {/* User Rating & Comment Section */}
              <div
                className="mt-4 pt-4 border-t border-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Your Rating
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playClick();
                      setShowCommentFor(
                        showCommentFor === path.id ? null : path.id
                      );
                    }}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#F40009] transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    {userRatingsMap[path.id]?.comment ? 'Edit comment' : 'Add comment'}
                  </button>
                </div>

                <InteractiveStarRating
                  currentRating={userRatingsMap[path.id]?.rating || 0}
                  onRate={(rating) => handleStarClick(path.id, rating)}
                />

                {savingRating === path.id && (
                  <p className="text-xs text-green-600 mt-1">Saving...</p>
                )}

                {/* Existing comment display */}
                {userRatingsMap[path.id]?.comment && showCommentFor !== path.id && (
                  <p className="text-xs text-gray-500 mt-2 italic line-clamp-2">
                    "{userRatingsMap[path.id].comment}"
                  </p>
                )}

                {/* Comment Input */}
                {showCommentFor === path.id && (
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={commentInputs[path.id] || ''}
                      onChange={(e) => {
                        setCommentInputs(prev => ({
                          ...prev,
                          [path.id]: e.target.value
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Share your thoughts about this learning path..."
                      className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#F40009]/20 focus:border-[#F40009] transition-all"
                      rows={3}
                    />
                    <div className="flex justify-end mt-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCommentSave(path.id);
                        }}
                        disabled={!userRatingsMap[path.id]?.rating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F40009] text-white text-xs font-medium rounded-lg hover:bg-[#DC0012] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-3 h-3" />
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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