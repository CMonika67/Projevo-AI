import React, { useState } from 'react';
import { ScreenType } from '../types';

interface LoginViewProps {
  onLoginSuccess: (email: string, token: string) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onNavigate }) => {
  const [email, setEmail] = useState('monikacherukuri667@gmail.com');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isRegister) {
        // Register first
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const regData = await regRes.json();
        if (!regRes.ok) {
          throw new Error(regData.error || 'Registration failed');
        }
      }

      // Log in to get token
      const logRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const logData = await logRes.json();
      if (!logRes.ok) {
        throw new Error(logData.error || 'Login failed');
      }

      onLoginSuccess(email, logData.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#F8F7F2] text-[#1B1C19] min-h-screen flex flex-col md:flex-row font-['Manrope'] overflow-x-hidden">
      {/* LEFT COLUMN: Form Section */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-12 relative z-10 bg-[#F8F7F2]">
        <div className="w-full max-w-md mx-auto">
          {/* Branding */}
          <div className="mb-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#176B5B] flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[22px] filled">bolt</span>
            </div>
            <h1 className="font-['Manrope'] text-[24px] font-bold text-[#176B5B] tracking-tight">
              Projevo AI
            </h1>
          </div>

          {/* Header & Message */}
          <div className="mb-8">
            <h2 className="text-[28px] md:text-[32px] font-bold font-['Manrope'] text-[#1B1C19] mb-2 tracking-tight">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-[16px] text-[#3F4945] font-normal leading-relaxed">
              Build smarter. Learn better. Present confidently.
            </p>
          </div>

          {/* Login Form */}
          {error && (
            <div className="mb-4 p-3.5 bg-[#FFDAD3] text-[#7C2E1D] text-[13.5px] font-semibold rounded-xl border border-[#FFB4A4] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-2" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#6F7975] text-[20px]">mail</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="block w-full pl-11 pr-3 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#176B5B] focus:border-[#176B5B] transition-all text-[15px] font-['Manrope'] placeholder-[#6F7975]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[#6F7975] text-[20px]">lock</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-11 pr-3 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#176B5B] focus:border-[#176B5B] transition-all text-[15px] font-['Manrope'] placeholder-[#6F7975]"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#BEC9C4] text-[#176B5B] focus:ring-[#176B5B] bg-[#F5F4EF]"
                />
                <span className="ml-2 text-[13px] font-semibold font-['Inter'] text-[#3F4945]">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset instructions will be sent to your university email.')}
                className="text-[13px] font-semibold font-['Inter'] text-[#176B5B] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-sm text-[14px] font-bold font-['Inter'] text-white bg-[#176B5B] hover:bg-[#005144] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#176B5B] transition-all duration-200 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Opening Workspace...</span>
                  </>
                ) : (
                  <span>{isRegister ? 'Create student account' : 'Login to workspace'}</span>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onLoginSuccess('monikacherukuri667@gmail.com', btoa('monikacherukuri667@gmail.com'))}
              className="flex-1 text-center py-2 px-3 border border-[#BEC9C4] rounded-lg text-[12px] font-semibold font-['Inter'] text-[#3F4945] hover:bg-[#EFEEE9] transition-colors"
            >
              Demo: Enter as Monika
            </button>
            <button
              onClick={() => onNavigate('onboarding')}
              className="flex-1 text-center py-2 px-3 border border-[#BEC9C4] rounded-lg text-[12px] font-semibold font-['Inter'] text-[#176B5B] hover:bg-[#D6E6E0]/40 transition-colors"
            >
              Start Onboarding Flow
            </button>
          </div>

          {/* Create Account Toggle */}
          <div className="mt-8 text-center">
            <p className="text-[13px] text-[#3F4945]">
              {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="font-bold font-['Inter'] text-[#176B5B] hover:underline ml-1"
              >
                {isRegister ? 'Login' : 'Create account'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Visual Journey Section (Matching Image 3) */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 bg-[#176B5B] relative overflow-hidden flex-col items-center justify-center p-10 lg:p-20 shadow-[inset_20px_0_40px_rgba(0,0,0,0.2)]">
        {/* Abstract Glow Background Elements */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D6E6E0] via-[#176B5B] to-[#005144]"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#53615D] rounded-full mix-blend-screen filter blur-[120px] opacity-35"></div>

        {/* Journey Graphic Container */}
        <div className="relative z-10 w-full max-w-lg">
          {/* Journey Header */}
          <div className="text-center mb-12">
            <h3 className="text-[26px] font-bold font-['Manrope'] text-[#FFFFFF] mb-2">
              The Projevo Journey
            </h3>
            <p className="text-[14px] text-[#9CE9D4]">
              From concept to successful presentation, guided by AI.
            </p>
          </div>

          {/* The Timeline / Journey Steps */}
          <div className="relative flex flex-col gap-6">
            {/* Connecting Line */}
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-[#005143] opacity-60 z-0"></div>
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#89D5C1] via-[#D6A84F] to-[#FFB4A4] journey-line-glow z-0"></div>

            {/* Step 1: Student */}
            <div className="relative z-10 flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/20 group-hover:scale-105 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <span className="material-symbols-outlined text-[28px]">school</span>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl p-4 flex-1 backdrop-blur-md group-hover:bg-white/15 transition-colors">
                <h4 className="text-[14px] font-bold font-['Inter'] text-white mb-0.5">
                  1. The Student
                </h4>
                <p className="text-[13px] text-[#9CE9D4]">
                  Start with an idea or a knowledge gap.
                </p>
              </div>
            </div>

            {/* Step 2: AI Guidance (Highlighted with Coral Amber) */}
            <div className="relative z-10 flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-full bg-[#9B4532] border border-[#7C2E1D] flex items-center justify-center text-white shadow-[0_0_30px_rgba(155,69,50,0.5)] group-hover:scale-105 transition-all duration-300">
                <span className="material-symbols-outlined text-[28px] filled">auto_awesome</span>
              </div>
              <div className="bg-[#9B4532]/25 border border-[#9B4532]/40 rounded-xl p-4 flex-1 backdrop-blur-md group-hover:bg-[#9B4532]/35 transition-colors">
                <h4 className="text-[14px] font-bold font-['Inter'] text-[#FFDAD3] mb-0.5">
                  2. AI Guidance
                </h4>
                <p className="text-[13px] text-[#9CE9D4]">
                  Receive personalized structural and technical support.
                </p>
              </div>
            </div>

            {/* Step 3: Better Project */}
            <div className="relative z-10 flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/20 group-hover:scale-105 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <span className="material-symbols-outlined text-[28px]">architecture</span>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl p-4 flex-1 backdrop-blur-md group-hover:bg-white/15 transition-colors">
                <h4 className="text-[14px] font-bold font-['Inter'] text-white mb-0.5">
                  3. Better Project
                </h4>
                <p className="text-[13px] text-[#9CE9D4]">
                  Execute with confidence using high-quality resources.
                </p>
              </div>
            </div>

            {/* Step 4: Successful Presentation */}
            <div className="relative z-10 flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/20 group-hover:scale-105 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <span className="material-symbols-outlined text-[28px]">co_present</span>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl p-4 flex-1 backdrop-blur-md group-hover:bg-white/15 transition-colors">
                <h4 className="text-[14px] font-bold font-['Inter'] text-white mb-0.5">
                  4. Successful Presentation
                </h4>
                <p className="text-[13px] text-[#9CE9D4]">
                  Deliver impactful results and demonstrate deep learning.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
