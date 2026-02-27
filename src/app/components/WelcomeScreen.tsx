import { ArrowRight, BarChart3, Brain, TrendingUp } from 'lucide-react';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import cocaColaHBCLogo from '@/assets/59218e6eca964424a8f051f5c7fe905235198f2c.png';
import { useSound } from '@/utils/sounds';

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const { playClick } = useSound();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F40009] to-[#DC0012] flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8 md:p-12">
          {/* Company Logo */}
          <div className="flex justify-center mb-6">
            <img src={cocaColaHBCLogo} alt="Coca-Cola HBC" className="h-12 md:h-14" />
          </div>
          
          {/* Logo Area */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-white rounded-2xl p-4 shadow-md">
                <img src={hellenLogo} alt="Hellen+ for AI Academy" className="h-24 md:h-32" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl text-gray-800">
              Learning Path Guide
            </h2>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-8">
            <p className="text-gray-700 text-center text-lg leading-relaxed">
              Chat with our learning assistant to discover your personalized journey in Data, Analytics & AI. 
              We'll ask you a few questions to find the perfect path based on your role, experience, and interests.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#F40009] rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-gray-800 mb-1">Personalized</h3>
              <p className="text-sm text-gray-600">Tailored to your interests</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#F40009] rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-gray-800 mb-1">Role-Based</h3>
              <p className="text-sm text-gray-600">Aligned with your function</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#F40009] rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-gray-800 mb-1">Growth-Focused</h3>
              <p className="text-sm text-gray-600">Build your expertise</p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={() => { playClick(); onStart(); }}
              className="bg-[#F40009] hover:bg-[#DC0012] text-white px-10 py-4 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 mx-auto"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500 mt-4">Takes about 2 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
}