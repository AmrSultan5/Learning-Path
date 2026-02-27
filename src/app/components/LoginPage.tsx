import { useState, useRef, useEffect } from 'react';
import { useSound } from '@/utils/sounds';
import hellenLogo from '@/assets/a1c07c8833c1385f9acba9acb24b2ea7df9be827.png';
import cocaColaHBCLogo from '@/assets/59218e6eca964424a8f051f5c7fe905235198f2c.png';
import { ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { playClick, playTyping } = useSound();

  // Auto focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!username.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      setError('Please enter a valid email prefix');
      return;
    }

    setError('');
    setIsSubmitting(true);

    // Premium delay for smoother UX
    setTimeout(() => {
      const fullEmail = `${username.toLowerCase()}@cchellenic.com`;
      onLogin(fullEmail);
      setIsSubmitting(false);
    }, 600);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    playTyping();
    setUsername(e.target.value);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 flex items-center justify-center p-6 relative overflow-hidden">

      {/* Ambient Glow */}
      <div className="absolute w-[500px] h-[500px] bg-[#F40009]/10 rounded-full blur-3xl -top-40 -right-40"></div>
      <div className="absolute w-[400px] h-[400px] bg-black/5 rounded-full blur-3xl bottom-0 left-0"></div>

      <div className="w-full max-w-md relative z-10">

        {/* Logos */}
        <div className="flex items-center justify-center gap-6 mb-10">
          <img src={cocaColaHBCLogo} alt="Coca-Cola HBC" className="h-16" />
          <div className="w-px h-10 bg-gray-300"></div>
          <img src={hellenLogo} alt="Hellen+ for AI Academy" className="h-16" />
        </div>

        {/* Glass Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-8">

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-600">
              Sign in with your corporate email
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* Email Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CCHellenic Email
              </label>

              <div className="flex items-center gap-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={handleInputChange}
                  placeholder="firstname.lastname"
                  className="flex-1 px-4 py-3 border border-r-0 border-gray-300 rounded-l-lg focus:ring-2 focus:ring-[#F40009] focus:border-transparent outline-none bg-white"
                />
                <div className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                  @cchellenic.com
                </div>
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>

            {/* Premium Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#F40009] to-[#DC0012] 
              text-white py-3 rounded-lg font-semibold shadow-lg
              hover:shadow-xl hover:-translate-y-[1px]
              active:translate-y-0
              transition-all duration-200
              cursor-pointer
              disabled:opacity-70 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 transition-transform duration-200" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Powered by Hellen+
            </p>
          </div>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Coca-Cola HBC × Hellen+ AI Academy
        </p>

      </div>
    </div>
  );
}