import { RotateCcw, CheckCircle2, BookOpen, Clock, Target, Lightbulb, MessageCircle } from 'lucide-react';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import cocaColaHBCLogo from '@/assets/59218e6eca964424a8f051f5c7fe905235198f2c.png';
import type { UserProfile, JobFunction, ExperienceLevel, InterestArea } from '@/app/App';
import { useState } from 'react';
import { PathChatModal } from '@/app/components/PathChatModal';
import { useSound } from '@/utils/sounds';

interface ResultsScreenProps {
  profile: UserProfile;
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

export function ResultsScreen({ profile, learningPathId, aiSummary, onRestart }: ResultsScreenProps) {

  console.log("AI SUMMARY RECEIVED:", aiSummary);
  
  const [selectedPath, setSelectedPath] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { playClick } = useSound();
  const selectedPaths = aiSummary?.selected_paths ?? [];


  const openModal = (path: any) => {
    playClick();
    setSelectedPath(path);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPath(null);
    setIsModalOpen(false);
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
              {selectedPaths.map((path, index) => (
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

                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          {aiSummary.estimated_weeks} weeks · {aiSummary.weekly_load_hours} hrs/week
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="p-6 space-y-6">
                    {path.modules.map((module, moduleIndex) => (
                      <div key={moduleIndex}>
                        <h4 className="text-lg font-semibold text-gray-800 mb-3">
                          {module.module_name}
                        </h4>

                        <div className="space-y-2">
                          {module.submodules.map((sub, subIndex) => (
                            <a
                              key={subIndex}
                              href={path.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex justify-between bg-gray-50 p-3 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
                            >
                              <span className="text-sm text-gray-700 hover:text-[#F40009]">
                                {sub.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {sub.duration} min
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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