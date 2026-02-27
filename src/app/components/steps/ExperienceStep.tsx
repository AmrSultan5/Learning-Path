import { Sprout, TrendingUp, Award } from 'lucide-react';
import type { ExperienceLevel } from '@/app/App';

interface ExperienceStepProps {
  selectedLevel: ExperienceLevel | null;
  onSelect: (level: ExperienceLevel) => void;
}

const experienceLevels: { value: ExperienceLevel; label: string; description: string; icon: React.ComponentType<any> }[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'New to Data, Analytics & AI',
    icon: Sprout,
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Some experience with data tools and concepts',
    icon: TrendingUp,
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Strong technical skills and experience',
    icon: Award,
  },
];

export function ExperienceStep({ selectedLevel, onSelect }: ExperienceStepProps) {
  return (
    <div>
      <h2 className="text-3xl text-gray-800 mb-3">What's your experience level?</h2>
      <p className="text-gray-600 mb-8">Help us understand your current proficiency with Data, Analytics & AI.</p>

      <div className="space-y-4">
        {experienceLevels.map((level) => {
          const Icon = level.icon;
          const isSelected = selectedLevel === level.value;

          return (
            <button
              key={level.value}
              onClick={() => onSelect(level.value)}
              className={`w-full flex items-start gap-5 p-6 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-[#F40009] bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-[#F40009] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className={`text-xl mb-1 ${isSelected ? 'text-[#F40009]' : 'text-gray-800'}`}>
                  {level.label}
                </h3>
                <p className="text-gray-600">{level.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}