import { Briefcase, Package, Megaphone, DollarSign, Settings, Users } from 'lucide-react';
import type { JobFunction } from '@/app/App';

interface JobFunctionStepProps {
  selectedFunction: JobFunction | null;
  onSelect: (jobFunction: JobFunction) => void;
}

const jobFunctions: { value: JobFunction; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'commercial', label: 'Commercial', icon: Briefcase },
  { value: 'supply-chain', label: 'Supply Chain', icon: Package },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'finance', label: 'Finance', icon: DollarSign },
  { value: 'operations', label: 'Operations', icon: Settings },
  { value: 'hr', label: 'Human Resources', icon: Users },
];

export function JobFunctionStep({ selectedFunction, onSelect }: JobFunctionStepProps) {
  return (
    <div>
      <h2 className="text-3xl text-gray-800 mb-3">What's your job function?</h2>
      <p className="text-gray-600 mb-8">This helps us tailor recommendations to your role.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobFunctions.map((func) => {
          const Icon = func.icon;
          const isSelected = selectedFunction === func.value;

          return (
            <button
              key={func.value}
              onClick={() => onSelect(func.value)}
              className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-[#F40009] bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSelected ? 'bg-[#F40009] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-lg ${isSelected ? 'text-[#F40009]' : 'text-gray-700'}`}>
                {func.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}