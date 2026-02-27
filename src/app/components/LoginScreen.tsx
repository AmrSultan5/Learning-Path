import { useState } from 'react';
import { useSound } from '@/utils/sounds';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [emailPrefix, setEmailPrefix] = useState('');
  const [error, setError] = useState('');
  const { playClick, playTyping } = useSound();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    
    if (!emailPrefix.trim()) {
      setError('Please enter your email');
      return;
    }

    // Basic validation for email prefix
    if (!/^[a-zA-Z0-9._-]+$/.test(emailPrefix)) {
      setError('Please enter a valid email prefix');
      return;
    }

    const fullEmail = `${emailPrefix.toLowerCase()}@cchellenic.com`;
    onLogin(fullEmail);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    playTyping();
    setEmailPrefix(e.target.value);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <img src={hellenLogo} alt="Hellen+ for AI Academy" className="h-20" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Learning Path Guide
          </h1>
          <p className="text-gray-600">
            Welcome to your personalized Data, Analytics & AI learning journey
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Sign in to continue
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                CCHellenic Email
              </label>
              <div className="flex items-center gap-0">
                <input
                  id="email"
                  type="text"
                  value={emailPrefix}
                  onChange={handleInputChange}
                  placeholder="firstname.lastname"
                  className="flex-1 px-4 py-3 border border-r-0 border-gray-300 rounded-l-lg focus:ring-2 focus:ring-[#F40009] focus:border-transparent outline-none"
                  autoFocus
                />
                <div className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                  @cchellenic.com
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#F40009] text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Continue
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-500 text-center">
            By signing in, you agree to use Hellen+ for professional learning purposes
          </p>
        </div>
      </div>
    </div>
  );
}