import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { safeApiFetch } from '../api';
import { isFirebaseConfigured, signInWithGoogle } from '../firebase';
import { getSupabase } from '../supabase';

interface LoginViewProps {
  onLoginSuccess: (email: string, userProfile?: any, userProject?: any, token?: string) => void;
  onNavigate?: (screen: ScreenType) => void;
  initialMode?: AuthMode;
  initialRecoveryToken?: string | null;
}

export type AuthMode =
  | 'choice'
  | 'email-password'
  | 'email-otp'
  | 'register'
  | 'forgot-email'
  | 'forgot-code'
  | 'forgot-reset';

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  initialMode = 'choice',
  initialRecoveryToken = null
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(initialRecoveryToken);

  // Email OTP login states
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP cooldown timer effect
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const interval = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Listen for Google OAuth popup success and error messages
  useEffect(() => {
    let authHandled = false;

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.token) {
        if (authHandled) return;
        authHandled = true;
        localStorage.setItem('token', event.data.token);
        setIsGoogleLoading(false);
        onLoginSuccess(
          event.data.email || '',
          event.data.profile,
          event.data.project,
          event.data.token
        );
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsGoogleLoading(false);
        setError(event.data.error || 'Google authentication failed.');
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'token' && event.newValue) {
        if (authHandled) return;
        authHandled = true;
        setIsGoogleLoading(false);
        onLoginSuccess('', undefined, undefined, event.newValue);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [onLoginSuccess]);

  // Load remembered email and check for password reset links or OAuth errors in URL on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('projevo_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('resetToken') || params.get('token');
      const urlEmail = params.get('email');
      const urlCode = params.get('code');
      const urlError = params.get('error_description') || params.get('error');

      // Check hash fragment for Supabase recovery link or OAuth parameters
      let hashError: string | null = null;
      let hashToken: string | null = null;
      let hashType: string | null = null;
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        hashError = hashParams.get('error_description') || hashParams.get('error');
        hashToken = hashParams.get('access_token');
        hashType = hashParams.get('type');
      }

      if (urlError || hashError) {
        setError(decodeURIComponent(urlError || hashError || 'Authentication failed. Please try again.'));
      }

      if (urlEmail) {
        setEmail(urlEmail);
      }

      // Supabase recovery link detection (#access_token=...&type=recovery or ?token=...&type=recovery)
      if ((hashType === 'recovery' && hashToken) || (urlToken && (urlEmail || hashType === 'recovery'))) {
        const activeToken = hashToken || urlToken;
        setResetToken(activeToken);
        setMode('forgot-reset');
      } else if (urlCode && urlEmail) {
        setVerificationCode(urlCode);
        setMode('forgot-code');
      } else if (initialRecoveryToken) {
        setResetToken(initialRecoveryToken);
        setMode('forgot-reset');
      }
    } catch (e) {
      // Ignore URL parsing errors
    }
  }, [initialRecoveryToken]);

  const handleResendConfirmation = async () => {
    if (!email.trim() || isResending) return;
    setIsResending(true);
    try {
      const data = await safeApiFetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'signup' })
      });
      setSuccessMessage(data.message || 'Confirmation email resent! Please check your inbox.');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading || isGoogleLoading) return;
    setIsGoogleLoading(true);
    setError(null);
    setSuccessMessage(null);

    // If Firebase is configured, attempt Firebase popup sign-in
    if (isFirebaseConfigured()) {
      try {
        const user = await signInWithGoogle();
        if (user?.email) {
          const data = await safeApiFetch('/api/auth/firebase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            })
          });

          onLoginSuccess(data.email, data.profile, data.project, data.token);
          return;
        }
      } catch (err: any) {
        if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          setIsGoogleLoading(false);
          return;
        }
        console.warn('Firebase sign-in failed, trying Supabase OAuth:', err);
      }
    }

    try {
      const currentOrigin = typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' ? 'https://projevo-ai.vercel.app' : 'http://localhost:3000');
      const redirectUri = `${currentOrigin}/login`;
      let oauthUrl: string | null = null;

      // 1. Initiate via client Supabase so PKCE code verifier is written into browser localStorage
      const sb = getSupabase();
      if (sb) {
        try {
          const { data: sbData, error: sbError } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUri,
              skipBrowserRedirect: true,
              queryParams: {
                prompt: 'select_account',
                access_type: 'offline'
              }
            }
          });
          if (!sbError && sbData?.url) {
            oauthUrl = sbData.url;
          }
        } catch (sbErr) {
          console.warn('Client Supabase OAuth init failed, falling back to server API:', sbErr);
        }
      }

      // 2. Fallback to server endpoint if client Supabase did not return URL
      if (!oauthUrl) {
        const data = await safeApiFetch(`/api/auth/google/url?redirectTo=${encodeURIComponent(redirectUri)}`);
        oauthUrl = data?.url || null;
      }

      if (oauthUrl) {
        const width = 500;
        const height = 650;
        const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
        const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

        const popup = window.open(
          oauthUrl,
          'google_account_selection',
          `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // If popup is blocked by the browser, fallback smoothly to full page redirect
          window.location.href = oauthUrl;
          return;
        }

        popup.focus();
        const checkClosed = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(checkClosed);
            setIsGoogleLoading(false);
          }
        }, 800);
      } else {
        throw new Error('Google sign-in is not currently available.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google sign-in. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (newMode !== 'email-password' && newMode !== 'email-otp') {
      setSuccessMessage(null);
    }
    if (newMode === 'choice' || newMode === 'email-password' || newMode === 'register' || newMode === 'forgot-email') {
      setPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setLoginOtpCode('');
      setLoginOtpSent(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'Weak', score: 0, color: '#7C2E1D' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Za-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) score += 1;

    if (score <= 2) return { label: 'Weak', score: 1, color: '#7C2E1D' };
    if (score === 3) return { label: 'Medium', score: 2, color: '#D6A84F' };
    return { label: 'Strong', score: 3, color: '#005144' };
  };

  const pwdStrength = getPasswordStrength(password);

  // --- 1. EMAIL + PASSWORD LOGIN HANDLER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await safeApiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe
        })
      });

      if (rememberMe) {
        localStorage.setItem('projevo_remembered_email', email.trim());
      } else {
        localStorage.removeItem('projevo_remembered_email');
      }

      onLoginSuccess(data.email, data.profile, data.project, data.token);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. EMAIL OTP LOGIN: SEND CODE ---
  const handleSendLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address to receive a sign-in code.');
      return;
    }
    if (otpCooldown > 0 || isSendingLoginOtp) return;

    setIsSendingLoginOtp(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await safeApiFetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      setLoginOtpSent(true);
      setOtpCooldown(60);
      setSuccessMessage(data.message || 'A 6-digit verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send login code. Please try again.');
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  // --- 3. EMAIL OTP LOGIN: VERIFY CODE ---
  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtpCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (isVerifyingLoginOtp) return;

    setIsVerifyingLoginOtp(true);
    setError(null);

    try {
      const data = await safeApiFetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: loginOtpCode.trim(),
          rememberMe
        })
      });

      if (rememberMe) {
        localStorage.setItem('projevo_remembered_email', email.trim());
      } else {
        localStorage.removeItem('projevo_remembered_email');
      }

      onLoginSuccess(data.email, data.token, data.profile, data.project);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingLoginOtp(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await safeApiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          confirmPassword
        })
      });

      if (data.needsEmailConfirmation) {
        setSuccessMessage('Account created! Please check your inbox and confirm your email before signing in.');
        setMode('email-password');
        return;
      }

      if (data.token) {
        onLoginSuccess(data.email, data.token, data.profile, data.project);
      } else {
        setSuccessMessage('Account created successfully! Please sign in.');
        setMode('email-password');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 5. FORGOT PASSWORD STEP 1: REQUEST RECOVERY CODE ---
  const handleRequestRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await safeApiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      setSuccessMessage(data.message || 'If an account is associated with that email, instructions have been sent.');
      setMode('forgot-code');
    } catch (err: any) {
      setError(err.message || 'Failed to process forgot password request.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 6. FORGOT PASSWORD STEP 2: VERIFY RECOVERY CODE ---
  const handleVerifyRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit recovery code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await safeApiFetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim()
        })
      });

      setResetToken(data.resetToken);
      setSuccessMessage(null);
      setMode('forgot-reset');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired recovery code.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 7. FORGOT PASSWORD STEP 3: RESET PASSWORD ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await safeApiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: verificationCode.trim(),
          resetToken,
          newPassword: password,
          confirmNewPassword: confirmPassword
        })
      });

      setSuccessMessage(data.message || 'Password reset successfully! Please sign in with your new password.');
      setPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setResetToken(null);
      setMode('email-password');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#FAF9F4] text-[#1B1C19] min-h-screen flex flex-col md:flex-row font-['Manrope'] overflow-x-hidden">
      {/* LEFT COLUMN: Form Section */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex flex-col justify-center px-6 sm:px-12 md:px-16 py-12 relative z-10 bg-[#FAF9F4]">
        <div className="w-full max-w-md mx-auto">
          {/* Projevo AI Branding */}
          <div className="mb-8 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#005144] flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[24px] filled">bolt</span>
            </div>
            <div>
              <h1 className="font-['Manrope'] text-[24px] font-extrabold text-[#005144] tracking-tight leading-none">
                Projevo AI
              </h1>
              <p className="text-[11px] font-bold font-['Inter'] text-[#53615D] tracking-wider uppercase mt-0.5">
                Engineering Project Mentor
              </p>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-[26px] md:text-[30px] font-bold font-['Manrope'] text-[#1B1C19] tracking-tight">
              {mode === 'choice' && 'Sign In'}
              {mode === 'email-password' && 'Sign in with Email'}
              {mode === 'email-otp' && 'Email Verification Code'}
              {mode === 'register' && 'Create an account'}
              {mode === 'forgot-email' && 'Forgot password?'}
              {mode === 'forgot-code' && 'Enter recovery code'}
              {mode === 'forgot-reset' && 'Set new password'}
            </h2>
            <p className="text-[14px] text-[#3F4945] font-normal leading-relaxed mt-1">
              {mode === 'choice' && "Choose how you'd like to authenticate to access your workspace."}
              {mode === 'email-password' && 'Enter your registered email and password to sign in.'}
              {mode === 'email-otp' && 'Sign in securely using a one-time code sent directly to your email.'}
              {mode === 'register' && 'Register to diagnose code, analyze ideas, and practice technical interviews.'}
              {mode === 'forgot-email' && 'Enter your registered email address to receive password recovery instructions.'}
              {mode === 'forgot-code' && `We sent a 6-digit recovery code to ${email || 'your email'}. Code expires in 10 minutes.`}
              {mode === 'forgot-reset' && 'Create a new, strong password with at least 8 characters.'}
            </p>
          </div>

          {/* Success Notification Banner */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-[#D6E6E0] text-[#005144] text-[13.5px] font-bold rounded-xl border border-[#89D5C1] flex items-center gap-2.5 shadow-xs">
              <span className="material-symbols-outlined text-[20px] text-[#005144]">check_circle</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Notification Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-[#FFDAD3] text-[#7C2E1D] text-[13.5px] font-semibold rounded-xl border border-[#FFB4A4] flex flex-col gap-1.5 shadow-xs">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#7C2E1D] shrink-0 mt-0.5">error</span>
                <span className="leading-snug">{error}</span>
              </div>
              {error.toLowerCase().includes('not confirmed') && email.trim() && (
                <div className="pl-7 pt-1">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="text-[12.5px] font-bold text-[#005144] hover:underline cursor-pointer bg-white/70 px-2.5 py-1 rounded-lg border border-[#005144]/20 transition-all inline-flex items-center gap-1"
                  >
                    {isResending ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 1: AUTHENTICATION CHOICES (Google vs Email)        */}
          {/* ========================================================= */}
          {mode === 'choice' && (
            <div className="space-y-4">
              {/* Option A: Continue with Google */}
              <div>
                <button
                  type="button"
                  id="google-signin-btn"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full flex justify-center items-center gap-3 py-3.5 px-4 rounded-xl border border-[#BEC9C4] bg-white hover:bg-[#F5F4EF] hover:border-[#005144]/40 text-[#1B1C19] text-[15px] font-bold font-['Inter'] shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {isGoogleLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#BEC9C4]/60"></div>
                </div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
                  <span className="bg-[#FAF9F4] px-3 text-[#6F7975]">or</span>
                </div>
              </div>

              {/* Option B: Continue with Email */}
              <div>
                <button
                  type="button"
                  id="email-signin-btn"
                  onClick={() => switchMode('email-password')}
                  className="w-full flex justify-center items-center gap-2.5 py-3.5 px-4 rounded-xl border border-[#005144] bg-[#005144] hover:bg-[#176B5B] text-white text-[15px] font-bold font-['Inter'] shadow-xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                  <span>Continue with Email</span>
                </button>
              </div>

              <div className="pt-6 text-center border-t border-[#BEC9C4]/30 mt-6">
                <p className="text-[13px] text-[#3F4945]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-bold font-['Inter'] text-[#005144] hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: EMAIL OPTIONS (Email+Password OR Email OTP)     */}
          {/* ========================================================= */}
          {(mode === 'email-password' || mode === 'email-otp') && (
            <div>
              {/* Back to choices button */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => switchMode('choice')}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#005144] hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>All sign in options</span>
                </button>
              </div>

              {/* Segmented Control / Tabs */}
              <div className="grid grid-cols-2 p-1 bg-[#EBEAE5] rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => switchMode('email-password')}
                  className={`py-2 px-3 text-[13px] font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'email-password'
                      ? 'bg-white text-[#005144] shadow-xs'
                      : 'text-[#6F7975] hover:text-[#1B1C19]'
                  }`}
                >
                  Email + Password
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('email-otp')}
                  className={`py-2 px-3 text-[13px] font-bold rounded-lg transition-all cursor-pointer ${
                    mode === 'email-otp'
                      ? 'bg-white text-[#005144] shadow-xs'
                      : 'text-[#6F7975] hover:text-[#1B1C19]'
                  }`}
                >
                  Email Verification Code
                </button>
              </div>

              {/* Tab 1: Email + Password Form */}
              {mode === 'email-password' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="login-email">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                        <span className="material-symbols-outlined text-[19px]">mail</span>
                      </div>
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        className="block w-full pl-10 pr-3 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945]" htmlFor="login-password">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot-email')}
                        className="text-[12.5px] font-semibold font-['Inter'] text-[#005144] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                        <span className="material-symbols-outlined text-[19px]">lock</span>
                      </div>
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="block w-full pl-10 pr-10 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6F7975] hover:text-[#1B1C19] cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-[19px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Option */}
                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="login-remember-me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 text-[#005144] border-[#BEC9C4] rounded focus:ring-[#005144] accent-[#005144] cursor-pointer"
                      />
                      <span className="text-[13px] font-medium text-[#3F4945]">Remember me</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-xs text-[14.5px] font-bold font-['Inter'] text-white bg-[#005144] hover:bg-[#176B5B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005144] transition-all cursor-pointer disabled:opacity-70"
                    >
                      {isLoading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <span>Sign In</span>
                      )}
                    </button>
                  </div>

                  <div className="pt-3 text-center">
                    <p className="text-[13px] text-[#3F4945]">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('register')}
                        className="font-bold font-['Inter'] text-[#005144] hover:underline cursor-pointer"
                      >
                        Create an account
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Tab 2: Email OTP Form */}
              {mode === 'email-otp' && (
                <div>
                  {!loginOtpSent ? (
                    <form onSubmit={handleSendLoginOtp} className="space-y-4">
                      <div>
                        <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="otp-email">
                          Your email address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                            <span className="material-symbols-outlined text-[19px]">mail</span>
                          </div>
                          <input
                            id="otp-email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@university.edu"
                            className="block w-full pl-10 pr-3 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                          />
                        </div>
                        <p className="text-[12px] text-[#6F7975] mt-1.5">
                          We will send a 6-digit one-time sign-in code to this address. No password required.
                        </p>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSendingLoginOtp || !email.trim()}
                          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-xs text-[14.5px] font-bold font-['Inter'] text-white bg-[#005144] hover:bg-[#176B5B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005144] transition-all cursor-pointer disabled:opacity-70"
                        >
                          {isSendingLoginOtp ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                              <span>Sending code...</span>
                            </>
                          ) : (
                            <span>Send Sign-in Code</span>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                      <div className="p-3 bg-[#D6E6E0]/60 rounded-xl border border-[#89D5C1]/60 flex items-center justify-between text-[13px]">
                        <span className="text-[#005144] font-medium truncate">
                          Code sent to: <strong>{email}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setLoginOtpSent(false)}
                          className="text-[#005144] font-bold underline text-[12px] shrink-0 ml-2 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      <div>
                        <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="login-otp-code">
                          6-Digit Verification Code
                        </label>
                        <div className="relative">
                          <input
                            id="login-otp-code"
                            name="loginOtpCode"
                            type="text"
                            maxLength={6}
                            required
                            value={loginOtpCode}
                            onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            className="block w-full py-3 text-center tracking-[8px] text-[22px] font-mono font-bold border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#005144] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all placeholder-[#BEC9C4]"
                          />
                        </div>
                        <div className="flex justify-between items-center mt-2 text-[12px] text-[#6F7975]">
                          <span>Code expires in 10 minutes</span>
                          <button
                            type="button"
                            onClick={() => handleSendLoginOtp()}
                            disabled={otpCooldown > 0 || isSendingLoginOtp}
                            className="text-[#005144] font-bold hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
                          >
                            {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend code'}
                          </button>
                        </div>
                        <div className="mt-2.5 p-2.5 bg-[#F5F4EF] rounded-lg border border-[#BEC9C4]/50 text-[12px] text-[#53615D] flex items-start gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#005144] shrink-0 mt-0.5">info</span>
                          <span className="leading-snug">
                            Delivery may take a moment. If the code does not appear in your inbox, please check your <strong>Spam or Junk</strong> folder.
                          </span>
                        </div>
                      </div>

                      {/* Remember Me Option */}
                      <div className="flex items-center justify-between py-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-[#005144] border-[#BEC9C4] rounded focus:ring-[#005144] accent-[#005144] cursor-pointer"
                          />
                          <span className="text-[13px] font-medium text-[#3F4945]">Remember me</span>
                        </label>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isVerifyingLoginOtp || loginOtpCode.length !== 6}
                          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-xs text-[14.5px] font-bold font-['Inter'] text-white bg-[#005144] hover:bg-[#176B5B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005144] transition-all cursor-pointer disabled:opacity-70"
                        >
                          {isVerifyingLoginOtp ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                              <span>Verifying code...</span>
                            </>
                          ) : (
                            <span>Verify & Sign In</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: REGISTRATION FORM                               */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="reg-name">
                  Full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                    <span className="material-symbols-outlined text-[19px]">person</span>
                  </div>
                  <input
                    id="reg-name"
                    name="fullName"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="block w-full pl-10 pr-3 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="reg-email">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                    <span className="material-symbols-outlined text-[19px]">mail</span>
                  </div>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="block w-full pl-10 pr-3 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="reg-password">
                  Create password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                    <span className="material-symbols-outlined text-[19px]">lock</span>
                  </div>
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="block w-full pl-10 pr-10 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6F7975] hover:text-[#1B1C19] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px] font-semibold">
                      <span className="text-[#6F7975]">Password Strength:</span>
                      <span style={{ color: pwdStrength.color }}>{pwdStrength.label}</span>
                    </div>
                    <div className="w-full bg-[#BEC9C4]/40 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: pwdStrength.score === 1 ? '33%' : pwdStrength.score === 2 ? '66%' : '100%',
                          backgroundColor: pwdStrength.color
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="reg-confirm-password">
                  Confirm password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                    <span className="material-symbols-outlined text-[19px]">lock_reset</span>
                  </div>
                  <input
                    id="reg-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="block w-full pl-10 pr-10 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6F7975] hover:text-[#1B1C19] cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-[11.5px] font-semibold mt-1 flex items-center gap-1 ${password === confirmPassword ? 'text-[#005144]' : 'text-[#7C2E1D]'}`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {password === confirmPassword ? 'check_circle' : 'cancel'}
                    </span>
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-xs text-[14.5px] font-bold font-['Inter'] text-white bg-[#005144] hover:bg-[#176B5B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005144] transition-all cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#BEC9C4]/60"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#FAF9F5] px-2 text-[#6F7975] font-semibold">Or continue with</span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-[#BEC9C4] rounded-xl bg-white hover:bg-neutral-50 shadow-xs text-[14px] font-bold font-['Inter'] text-[#1B1C19] transition-all cursor-pointer disabled:opacity-70"
                >
                  {isGoogleLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Sign up with Google</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-3 text-center">
                <p className="text-[13px] text-[#3F4945]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('choice')}
                    className="font-bold font-['Inter'] text-[#005144] hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* SCREEN 4: FORGOT PASSWORD - STEP 1 (EMAIL ENTRY)          */}
          {/* ========================================================= */}
          {mode === 'forgot-email' && (
            <form onSubmit={handleRequestRecoveryCode} className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="forgot-email">
                  Registered email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                    <span className="material-symbols-outlined text-[19px]">mail</span>
                  </div>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="block w-full pl-10 pr-3 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                  />
                </div>
                <p className="text-[12px] text-[#6F7975] mt-1.5">
                  A 6-digit recovery code will be dispatched to your email address.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-xs text-[14.5px] font-bold font-['Inter'] text-white bg-[#005144] hover:bg-[#176B5B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005144] transition-all cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Sending instructions...</span>
                    </>
                  ) : (
                    <span>Send Recovery Code</span>
                  )}
                </button>
              </div>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('choice')}
                  className="text-[13px] font-bold font-['Inter'] text-[#005144] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* SCREEN 5: FORGOT PASSWORD - STEP 2 (CODE ENTRY)           */}
          {/* ========================================================= */}
          {mode === 'forgot-code' && (
            <form onSubmit={handleVerifyRecoveryCode} className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="verify-code">
                  6-Digit Recovery Code
                </label>
                <div className="relative">
                  <input
                    id="verify-code"
                    name="code"
                    type="text"
                    maxLength={6}
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="block w-full py-3 text-center tracking-[8px] text-[22px] font-mono font-bold border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#005144] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all placeholder-[#BEC9C4]"
                  />
                </div>
                <div className="flex justify-between items-center mt-2 text-[12px] text-[#6F7975]">
                  <span>Expires in 10 minutes</span>
                  <button
                    type="button"
                    onClick={handleRequestRecoveryCode}
                    className="text-[#005144] font-bold hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-xs text-[14.5px] font-bold font-['Inter'] text-white bg-[#005144] hover:bg-[#176B5B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005144] transition-all cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <span>Verify Code</span>
                  )}
                </button>
              </div>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('choice')}
                  className="text-[13px] font-bold font-['Inter'] text-[#005144] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* SCREEN 6: FORGOT PASSWORD - STEP 3 (NEW PASSWORD ENTRY)   */}
          {/* ========================================================= */}
          {mode === 'forgot-reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="reset-new-password">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                    <span className="material-symbols-outlined text-[19px]">lock</span>
                  </div>
                  <input
                    id="reset-new-password"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="block w-full pl-10 pr-10 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6F7975] hover:text-[#1B1C19] cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px] font-semibold">
                      <span className="text-[#6F7975]">Password Strength:</span>
                      <span style={{ color: pwdStrength.color }}>{pwdStrength.label}</span>
                    </div>
                    <div className="w-full bg-[#BEC9C4]/40 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: pwdStrength.score === 1 ? '33%' : pwdStrength.score === 2 ? '66%' : '100%',
                          backgroundColor: pwdStrength.color
                        }}
                      ></div>
                    </div>
                    <p className={`text-[11px] font-medium flex items-center gap-1 ${password.length >= 8 ? 'text-[#005144]' : 'text-[#7C2E1D]'}`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {password.length >= 8 ? 'check_circle' : 'cancel'}
                      </span>
                      At least 8 characters ({password.length}/8)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5" htmlFor="reset-confirm-password">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975]">
                    <span className="material-symbols-outlined text-[19px]">lock_reset</span>
                  </div>
                  <input
                    id="reset-confirm-password"
                    name="confirmNewPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="block w-full pl-10 pr-10 py-3 border border-[#BEC9C4] rounded-xl bg-[#F5F4EF] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] focus:border-[#005144] transition-all text-[14.5px] placeholder-[#6F7975]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6F7975] hover:text-[#1B1C19] cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-[11.5px] font-semibold mt-1 flex items-center gap-1 ${password === confirmPassword ? 'text-[#005144]' : 'text-[#7C2E1D]'}`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {password === confirmPassword ? 'check_circle' : 'cancel'}
                    </span>
                    {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-xs text-[14.5px] font-bold font-['Inter'] text-white bg-[#005144] hover:bg-[#176B5B] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005144] transition-all cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Saving new password...</span>
                    </>
                  ) : (
                    <span>Save New Password</span>
                  )}
                </button>
              </div>

              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('choice')}
                  className="text-[13px] font-bold font-['Inter'] text-[#005144] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Visual Journey Section */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 bg-[#005144] relative overflow-hidden flex-col items-center justify-center p-10 lg:p-20 shadow-[inset_20px_0_40px_rgba(0,0,0,0.2)]">
        {/* Glow Background Elements */}
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D6E6E0] via-[#005144] to-[#002D26]"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#53615D] rounded-full mix-blend-screen filter blur-[120px] opacity-35"></div>

        {/* Journey Graphic Container */}
        <div className="relative z-10 w-full max-w-lg">
          <div className="text-center mb-12">
            <h3 className="text-[28px] font-bold font-['Manrope'] text-white mb-2 tracking-tight">
              The Projevo Journey
            </h3>
            <p className="text-[14px] text-[#A5F1DD]">
              From concept to successful presentation, guided by AI.
            </p>
          </div>

          {/* Timeline Steps */}
          <div className="relative flex flex-col gap-6">
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#89D5C1] via-[#D6A84F] to-[#FFB4A4] opacity-50 z-0"></div>

            {/* Step 1: Student */}
            <div className="relative z-10 flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/20 group-hover:scale-105 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <span className="material-symbols-outlined text-[28px]">school</span>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl p-4 flex-1 backdrop-blur-md group-hover:bg-white/15 transition-colors">
                <h4 className="text-[14px] font-bold font-['Inter'] text-white mb-0.5">
                  1. The Student
                </h4>
                <p className="text-[13px] text-[#A5F1DD]">
                  Start with an idea or a knowledge gap.
                </p>
              </div>
            </div>

            {/* Step 2: AI Guidance */}
            <div className="relative z-10 flex items-center gap-5 group">
              <div className="w-14 h-14 rounded-full bg-[#9B4532] border border-[#7C2E1D] flex items-center justify-center text-white shadow-[0_0_30px_rgba(155,69,50,0.5)] group-hover:scale-105 transition-all duration-300">
                <span className="material-symbols-outlined text-[28px] filled">auto_awesome</span>
              </div>
              <div className="bg-[#9B4532]/25 border border-[#9B4532]/40 rounded-xl p-4 flex-1 backdrop-blur-md group-hover:bg-[#9B4532]/35 transition-colors">
                <h4 className="text-[14px] font-bold font-['Inter'] text-[#FFDAD3] mb-0.5">
                  2. AI Guidance
                </h4>
                <p className="text-[13px] text-[#A5F1DD]">
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
                <p className="text-[13px] text-[#A5F1DD]">
                  Execute with confidence using diagnostic and security reviews.
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
                <p className="text-[13px] text-[#A5F1DD]">
                  Prepare for viva defense and technical interviews with AI question pools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
