import { Loader2, Sparkles } from 'lucide-react';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import cocaColaHBCLogo from '@/assets/59218e6eca964424a8f051f5c7fe905235198f2c.png';

export function GeneratingPathScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-[#F40009] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={hellenLogo} alt="MAILA" className="h-7" />
            <div>
              <h2 className="text-lg">Learning Assistant</h2>
              <p className="text-xs text-white/80">
                Preparing your personalized journey
              </p>
            </div>
          </div>
          <img src={cocaColaHBCLogo} alt="Coca-Cola HBC" className="h-7" />
        </div>

        {/* Content */}
        <div className="py-16 px-8 text-center">

          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center relative">
              <Loader2 className="w-10 h-10 text-[#F40009] animate-spin" />
            </div>
          </div>

          <h1 className="text-2xl text-gray-800 mb-4">
            Hellen+ is crafting your learning path...
          </h1>

          <p className="text-gray-600 max-w-lg mx-auto mb-6">
            We’re analyzing your profile, goals, interests, and experience
            to generate the most impactful learning journey tailored specifically for you.
          </p>

          <div className="flex justify-center items-center gap-2 text-[#F40009]">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">
              Optimizing modules, duration & learning sequence
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}