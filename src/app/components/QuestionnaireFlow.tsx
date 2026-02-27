import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { JobFunctionStep } from '@/app/components/steps/JobFunctionStep';
import { ExperienceStep } from '@/app/components/steps/ExperienceStep';
import { InterestsStep } from '@/app/components/steps/InterestsStep';
import { GoalsStep } from '@/app/components/steps/GoalsStep';
import type { UserProfile, JobFunction, ExperienceLevel, InterestArea } from '@/app/App';

interface QuestionnaireFlowProps {
  onComplete: (profile: UserProfile) => void;
}

const TOTAL_STEPS = 4;

export function QuestionnaireFlow({ onComplete }: QuestionnaireFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    jobFunction: null,
    experienceLevel: null,
    interests: [],
    goals: [],
    responses: [],
    timeCommitment: 0 
  });

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateJobFunction = (jobFunction: JobFunction) => {
    setProfile(prev => ({ ...prev, jobFunction }));
  };

  const updateExperience = (experienceLevel: ExperienceLevel) => {
    setProfile(prev => ({ ...prev, experienceLevel }));
  };

  const updateInterests = (interests: InterestArea[]) => {
    setProfile(prev => ({ ...prev, interests }));
  };

  const updateGoals = (goals: string[]) => {
    setProfile(prev => ({ ...prev, goals }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return profile.jobFunction !== null;
      case 2:
        return profile.experienceLevel !== null;
      case 3:
        return profile.interests.length > 0;
      case 4:
        return profile.goals.length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Step {currentStep} of {TOTAL_STEPS}</span>
            <span className="text-sm text-gray-600">{Math.round((currentStep / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#F40009] h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          {currentStep === 1 && (
            <JobFunctionStep
              selectedFunction={profile.jobFunction}
              onSelect={updateJobFunction}
            />
          )}
          {currentStep === 2 && (
            <ExperienceStep
              selectedLevel={profile.experienceLevel}
              onSelect={updateExperience}
            />
          )}
          {currentStep === 3 && (
            <InterestsStep
              selectedInterests={profile.interests}
              onSelect={updateInterests}
            />
          )}
          {currentStep === 4 && (
            <GoalsStep
              selectedGoals={profile.goals}
              onSelect={updateGoals}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-gray-600 hover:bg-white hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-[#F40009] text-white hover:bg-[#DC0012] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#F40009] shadow-md"
          >
            {currentStep === TOTAL_STEPS ? 'See Results' : 'Next'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
