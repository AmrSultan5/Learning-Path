import hellenLogo from '@/assets/hellen-logo-transparent-background.png';
import cocaColaHBCLogo from '@/assets/cch-logo-transparent-background.png';
import { Gamepad2, Route } from 'lucide-react';

interface MasterLandingPageProps {
  onSelectLearningPath: () => void;
  onSelectAIAdventure: () => void;
}

export function MasterLandingPage({ onSelectLearningPath, onSelectAIAdventure }: MasterLandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-8 mb-8">
            <img src={cocaColaHBCLogo} alt="Coca-Cola HBC" className="h-28" />
            <div className="w-px h-20 bg-gray-300"></div>
            <img src={hellenLogo} alt="Hellen+ for AI Academy" className="h-28" />
          </div>
          <p className="text-2xl text-gray-800 font-bold">Choose your way to start AI learning</p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* AI Adventure */}
          <button
            onClick={onSelectAIAdventure}
            className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-[#F40009] group text-left"
          >
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F40009] to-[#DC0012] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Gamepad2 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl text-gray-800 mb-2 group-hover:text-[#F40009] transition-colors">
                  AI Adventure
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  This isn't a lecture—it's a game. Jump into a 30-minute interactive mission and discover your AI advantage.
                </p>
              </div>
            </div>
          </button>

          {/* Learning Path Guide */}
          <button
            onClick={onSelectLearningPath}
            className="w-full bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-[#F40009] group text-left"
          >
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F40009] to-[#DC0012] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Route className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl text-gray-800 mb-2 group-hover:text-[#F40009] transition-colors">
                  Learning Path Guide
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ready to dive deeper? Share your goals and background, and our AI Agent will craft a custom learning path just for you.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Powered by Hellen+
          </p>
        </div>
      </div>
    </div>
  );
}