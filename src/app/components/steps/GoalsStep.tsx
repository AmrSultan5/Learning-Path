import { Target, Lightbulb, Users, Rocket } from 'lucide-react';

interface GoalsStepProps {
  selectedGoals: string[];
  onSelect: (goals: string[]) => void;
}

const goalOptions: { value: string; label: string; icon: React.ComponentType<any> }[] = [
  {
    value: 'skill-development',
    label: 'Develop new technical skills',
    icon: Target,
  },
  {
    value: 'decision-making',
    label: 'Make better data-driven decisions',
    icon: Lightbulb,
  },
  {
    value: 'team-collaboration',
    label: 'Collaborate better with data teams',
    icon: Users,
  },
  {
    value: 'career-advancement',
    label: 'Advance my career in analytics',
    icon: Rocket,
  },
];

export function GoalsStep({ selectedGoals, onSelect }: GoalsStepProps) {
  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      onSelect(selectedGoals.filter(g => g !== goal));
    } else {
      onSelect([...selectedGoals, goal]);
    }
  };

  return (
    <div>
      <h2 className="text-3xl text-gray-800 mb-3">What are your learning goals?</h2>
      <p className="text-gray-600 mb-8">Select what you hope to achieve. (Choose at least one)</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goalOptions.map((goal) => {
          const Icon = goal.icon;
          const isSelected = selectedGoals.includes(goal.value);

          return (
            <button
              key={goal.value}
              onClick={() => toggleGoal(goal.value)}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? 'border-[#F40009] bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-[#F40009] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <span className={`text-base ${isSelected ? 'text-[#F40009]' : 'text-gray-700'}`}>
                {goal.label}
              </span>
              {isSelected && (
                <div className="w-6 h-6 bg-[#F40009] rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
