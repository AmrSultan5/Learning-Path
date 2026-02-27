import { BarChart3, Calculator, Brain, Database, PieChart } from 'lucide-react';
import type { InterestArea } from '@/app/App';

interface InterestsStepProps {
  selectedInterests: InterestArea[];
  onSelect: (interests: InterestArea[]) => void;
}

const interestAreas: { value: InterestArea; label: string; description: string; icon: React.ComponentType<any> }[] = [
  {
    value: 'visualization',
    label: 'Data Visualization',
    description: 'Creating dashboards and visual reports',
    icon: PieChart,
  },
  {
    value: 'statistics',
    label: 'Statistics & Analysis',
    description: 'Statistical methods and data analysis',
    icon: Calculator,
  },
  {
    value: 'ml-ai',
    label: 'Machine Learning & AI',
    description: 'Predictive models and AI applications',
    icon: Brain,
  },
  {
    value: 'data-engineering',
    label: 'Data Engineering',
    description: 'Building data pipelines and infrastructure',
    icon: Database,
  },
  {
    value: 'business-intelligence',
    label: 'Business Intelligence',
    description: 'Strategic insights and decision support',
    icon: BarChart3,
  },
];

export function InterestsStep({ selectedInterests, onSelect }: InterestsStepProps) {
  const toggleInterest = (interest: InterestArea) => {
    if (selectedInterests.includes(interest)) {
      onSelect(selectedInterests.filter(i => i !== interest));
    } else {
      onSelect([...selectedInterests, interest]);
    }
  };

  return (
    <div>
      <h2 className="text-3xl text-gray-800 mb-3">What interests you most?</h2>
      <p className="text-gray-600 mb-8">Select all areas that you'd like to explore. (Choose at least one)</p>

      <div className="space-y-3">
        {interestAreas.map((area) => {
          const Icon = area.icon;
          const isSelected = selectedInterests.includes(area.value);

          return (
            <button
              key={area.value}
              onClick={() => toggleInterest(area.value)}
              className={`w-full flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-[#F40009] bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-[#F40009] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg mb-1 ${isSelected ? 'text-[#F40009]' : 'text-gray-800'}`}>
                  {area.label}
                </h3>
                <p className="text-sm text-gray-600">{area.description}</p>
              </div>
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-[#F40009] rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
