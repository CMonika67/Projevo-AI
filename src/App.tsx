/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenType, UserProfile, ProjectData, HealthCategory, CriticalIssue } from './types';
import {
  initialProfile,
  emptyProfile,
  currentProject,
  defaultHealthCategories,
  defaultCriticalIssues,
  defaultStruggleMetrics,
} from './data';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { LoginView } from './components/LoginView';
import { HealthReportView } from './components/HealthReportView';
import { AdaptiveSupportView } from './components/AdaptiveSupportView';
import { SkillGapAnalysisView } from './components/SkillGapAnalysisView';
import { OnboardingView } from './components/OnboardingView';
import { ProjectDoctorView } from './components/ProjectDoctorView';
import { ProjectDiscoveryView } from './components/ProjectDiscoveryView';
import { InterviewPrepView } from './components/InterviewPrepView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { IdeaAnalyzerModal } from './components/IdeaAnalyzerModal';
import { UserAvatar } from './components/UserAvatar';
import { safeApiFetch } from './api';
import { firebaseSignOut } from './firebase';
import { getSupabase } from './supabase';

// Utility helpers to synchronize URL paths with ScreenType
function getScreenFromPath(pathname: string): ScreenType {
  const clean = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  switch (clean) {
    case '':
    case 'dashboard':
      return 'dashboard';
    case 'login':
      return 'login';
    case 'doctor':
      return 'doctor';
    case 'health-report':
      return 'health-report';
    case 'skill-gap':
      return 'skill-gap';
    case 'adaptive-support':
      return 'adaptive-support';
    case 'discovery':
      return 'discovery';
    case 'interview-prep':
      return 'interview-prep';
    case 'profile':
    case 'settings':
      return 'profile';
    case 'onboarding':
      return 'onboarding';
    default:
      return 'dashboard';
  }
}

function getPathForScreen(screen: ScreenType): string {
  switch (screen) {
    case 'dashboard':
      return '/';
    case 'login':
      return '/login';
    default:
      return `/${screen}`;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    return getScreenFromPath(window.location.pathname);
  });

  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [categories, setCategories] = useState<HealthCategory[]>([]);
  const [criticalIssues, setCriticalIssues] = useState<CriticalIssue[]>([]);
  const [metrics] = useState(defaultStruggleMetrics);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await safeApiFetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      await firebaseSignOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    // Sign-out must clear the session and redirect to Login
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setProfile(emptyProfile);
    setProject(null);
    setCategories([]);
    setCriticalIssues([]);
    setCurrentScreen('login');
    if (window.location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
    }
  };

  const changeScreen = (screen: ScreenType) => {
    if (screen === 'login') {
      if (isAuthenticated) {
        // If an authenticated user triggers or navigates to login, redirect to Dashboard (Requirement 5)
        window.history.replaceState(null, '', '/');
        setCurrentScreen('dashboard');
        return;
      }
      handleLogout();
      return;
    }

    // Protected pages guard: Users must not access Dashboard or protected pages without an authenticated session (Requirement 2)
    if (!isAuthenticated || !localStorage.getItem('token')) {
      handleLogout();
      return;
    }

    setCurrentScreen(screen);
    const targetPath = getPathForScreen(screen);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Check session validity on startup/refresh & handle OAuth callbacks
  useEffect(() => {
    let isCancelled = false;

    async function checkSession() {
      // 1. Check for URL redirect errors (e.g. expired or invalid magic links/OAuth)
      let urlErrorDesc: string | null = null;
      if (window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        urlErrorDesc = hashParams.get('error_description') || hashParams.get('error');
      }
      const searchParams = new URLSearchParams(window.location.search);
      if (!urlErrorDesc) {
        urlErrorDesc = searchParams.get('error_description') || searchParams.get('error');
      }

      if (urlErrorDesc) {
        const decodedError = decodeURIComponent(urlErrorDesc);
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: decodedError }, window.location.origin);
            window.close();
            return;
          } catch (e) {
            console.warn('Could not postMessage error to opener:', e);
          }
        }
        window.history.replaceState(null, '', `/login?error=${encodeURIComponent(decodedError)}`);
        setIsAuthenticated(false);
        setIsValidatingSession(false);
        setCurrentScreen('login');
        return;
      }

      // 2. Process Supabase hash fragment (#access_token=...&type=recovery|magiclink|signup)
      if (window.location.hash.includes('access_token=')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hashToken = hashParams.get('access_token');
          const hashType = hashParams.get('type');

          if (hashType === 'recovery' && hashToken) {
            setRecoveryToken(hashToken);
            setIsAuthenticated(false);
            setIsValidatingSession(false);
            setCurrentScreen('login');
            return;
          }

          if (hashToken) {
            localStorage.setItem('token', hashToken);
            try {
              const callbackRes = await safeApiFetch('/api/auth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token: hashToken })
              });
              if (callbackRes?.token) {
                if (window.opener && !window.opener.closed) {
                  try {
                    window.opener.postMessage({
                      type: 'GOOGLE_AUTH_SUCCESS',
                      token: callbackRes.token,
                      profile: callbackRes.profile,
                      project: callbackRes.project,
                      email: callbackRes.email
                    }, window.location.origin);
                    window.close();
                    return;
                  } catch (e) {
                    console.warn('Could not postMessage to opener:', e);
                  }
                }
                if (callbackRes.profile) setProfile(callbackRes.profile);
                if (callbackRes.project) setProject(callbackRes.project);
                setIsAuthenticated(true);
                window.history.replaceState(null, '', '/');
                setCurrentScreen('dashboard');
                setIsValidatingSession(false);
                return;
              }
            } catch (hErr) {
              console.warn('Error syncing hash token with server:', hErr);
            }
            window.history.replaceState(null, '', window.location.pathname);
          }
        } catch (e) {
          console.error('Error parsing OAuth/magic link hash token:', e);
        }
      }

      // 3. Process Password Recovery query parameter (?type=recovery)
      if (searchParams.get('type') === 'recovery') {
        const queryToken = searchParams.get('token') || searchParams.get('access_token');
        if (queryToken) {
          setRecoveryToken(queryToken);
          setIsAuthenticated(false);
          setIsValidatingSession(false);
          setCurrentScreen('login');
          return;
        }
      }

      // 4. Process Supabase Magic Link / Email verification token_hash (?token_hash=...)
      const tokenHash = searchParams.get('token_hash');
      const tokenType = searchParams.get('type') || 'email';
      if (tokenHash) {
        try {
          const data = await safeApiFetch('/api/auth/verify-token-hash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token_hash: tokenHash, type: tokenType })
          });
          if (data?.token) {
            localStorage.setItem('token', data.token);
            if (data.profile) setProfile(data.profile);
            if (data.project) setProject(data.project);
            setIsAuthenticated(true);
            window.history.replaceState(null, '', '/');
            setCurrentScreen('dashboard');
            setIsValidatingSession(false);
            return;
          }
        } catch (e: any) {
          console.error('Error verifying token_hash:', e);
          const errMsg = e.message || 'Verification link has expired or is invalid.';
          window.history.replaceState(null, '', `/login?error=${encodeURIComponent(errMsg)}`);
          setIsAuthenticated(false);
          setIsValidatingSession(false);
          setCurrentScreen('login');
          return;
        }
      }

      // 5. Process Supabase PKCE / OAuth authorization code (?code=...)
      const authCode = searchParams.get('code');
      if (authCode) {
        try {
          let authToken: string | null = null;
          let authEmail: string = '';

          // A. Attempt client-side Supabase exchange using browser's stored PKCE verifier
          const sb = getSupabase();
          if (sb) {
            try {
              const { data: exchangeData, error: exchangeErr } = await sb.auth.exchangeCodeForSession(authCode);
              if (!exchangeErr && exchangeData?.session?.access_token) {
                authToken = exchangeData.session.access_token;
                authEmail = exchangeData.session.user?.email || '';
              }
            } catch (clientExErr) {
              console.warn('Client exchangeCodeForSession failed, falling back to server:', clientExErr);
            }
          }

          // B. Send token (or raw code) to /api/auth/callback to establish backend session and user data
          const data = await safeApiFetch('/api/auth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ code: authCode, token: authToken, email: authEmail })
          });

          if (data?.token) {
            localStorage.setItem('token', data.token);
            if (window.opener && !window.opener.closed) {
              try {
                window.opener.postMessage({
                  type: 'GOOGLE_AUTH_SUCCESS',
                  token: data.token,
                  profile: data.profile,
                  project: data.project,
                  email: data.email
                }, window.location.origin);
                window.close();
                return;
              } catch (e) {
                console.warn('Could not postMessage to opener:', e);
              }
            }
            if (data.profile) setProfile(data.profile);
            if (data.project) setProject(data.project);
            setIsAuthenticated(true);
            window.history.replaceState(null, '', '/');
            setCurrentScreen('dashboard');
            setIsValidatingSession(false);
            return;
          }
        } catch (e: any) {
          console.error('Error exchanging authorization code:', e);
          const errMsg = e.message || 'Sign-in link or authorization code is invalid or expired.';
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: errMsg }, window.location.origin);
              window.close();
              return;
            } catch (postErr) {
              console.warn('Could not postMessage error to opener:', postErr);
            }
          }
          window.history.replaceState(null, '', `/login?error=${encodeURIComponent(errMsg)}`);
          setIsAuthenticated(false);
          setIsValidatingSession(false);
          setCurrentScreen('login');
          return;
        }
      }

      // 2. Validate current token against real Supabase / backend session (/api/auth/me)
      const token = localStorage.getItem('token');
      if (!token) {
        if (!isCancelled) {
          setIsAuthenticated(false);
          setProfile(emptyProfile);
          setProject(null);
          setCurrentScreen('login');
          // When a logged-out user opens the root URL (/), show Login page (Requirement 1)
          if (window.location.pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
          }
          setIsValidatingSession(false);
        }
        return;
      }

      try {
        const data = await safeApiFetch('/api/auth/me', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include'
        });

        if (isCancelled) return;

        if (data.profile) {
          setProfile(data.profile);
        }
        setProject(data.project || null);

        // Fetch full profile analytics info to populate categories & issues
        try {
          const profileData = await safeApiFetch('/api/profile', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include'
          });
          if (profileData && profileData.profile) {
            setProfile(profileData.profile);
          }
          if (profileData && profileData.project !== undefined) {
            setProject(profileData.project || null);
          }
          if (profileData && profileData.latestAnalysis) {
            setCategories(profileData.latestAnalysis.categories || []);
            setCriticalIssues(profileData.latestAnalysis.criticalIssues || []);
          }
        } catch {
          // If profile fetch fails, keep current profile
        }

        setIsAuthenticated(true);

        // If a logged-in user opens the Login page, redirect them to the Dashboard (Requirement 5)
        const targetScreen = getScreenFromPath(window.location.pathname);
        if (targetScreen === 'login') {
          window.history.replaceState(null, '', '/');
          setCurrentScreen('dashboard');
        } else {
          setCurrentScreen(targetScreen);
          const expectedPath = getPathForScreen(targetScreen);
          if (window.location.pathname !== expectedPath) {
            window.history.replaceState(null, '', expectedPath);
          }
        }
      } catch (err) {
        console.error('Session validation failed:', err);
        if (!isCancelled) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setProfile(emptyProfile);
          setProject(null);
          setCurrentScreen('login');
          if (window.location.pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
          }
        }
      } finally {
        if (!isCancelled) {
          setIsValidatingSession(false);
        }
      }
    }

    checkSession();

    // Listen to browser Back/Forward navigation
    const handlePopState = () => {
      const screenFromUrl = getScreenFromPath(window.location.pathname);
      const hasToken = Boolean(localStorage.getItem('token'));
      if (!hasToken) {
        if (window.location.pathname !== '/login') {
          window.history.replaceState(null, '', '/login');
        }
        setCurrentScreen('login');
      } else if (screenFromUrl === 'login') {
        window.history.replaceState(null, '', '/');
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen(screenFromUrl);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      isCancelled = true;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleUpdateProfile = async (updated: Partial<UserProfile>) => {
    try {
      setProfile((prev) => ({ ...prev, ...updated }));
      
      const res = await safeApiFetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res && res.profile) {
        setProfile(res.profile);
        if (res.project) {
          setProject(res.project);
        }
      }
    } catch (err) {
      console.error('Error saving profile changes:', err);
    }
  };

  // If we are currently validating a session on reload, display a premium loading state matching the theme (Requirement 7)
  if (isValidatingSession) {
    return (
      <div className="min-h-screen bg-[#FAF9F4] flex flex-col items-center justify-center font-['Manrope']">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-[#005144]/20 border-t-[#005144] animate-spin"></div>
          <p className="text-[14px] font-bold text-[#005144]">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  // Route guard: if unauthenticated, show the Login screen (Requirements 1 & 2)
  if (!isAuthenticated) {
    return (
      <LoginView
        initialRecoveryToken={recoveryToken}
        onLoginSuccess={(email: string, userProfile?: any, userProject?: any, token?: string) => {
          const effectiveToken = typeof token === 'string' && token.length > 0
            ? token
            : (typeof userProfile === 'string' && userProfile.length > 0
                ? userProfile
                : localStorage.getItem('token') || '');

          const effectiveProfile = typeof userProfile === 'object' && userProfile !== null
            ? userProfile
            : (typeof userProject === 'object' && userProject !== null && userProject.name
                ? userProject
                : emptyProfile);

          const effectiveProject = typeof userProject === 'object' && userProject !== null && !userProject.email && !userProject.name
            ? userProject
            : (typeof userProfile === 'object' && userProfile !== null && !userProfile.email && !userProfile.name
                ? userProfile
                : null);

          if (effectiveToken) {
            localStorage.setItem('token', effectiveToken);
          }
          setIsAuthenticated(true);
          setProfile(effectiveProfile);
          setProject(effectiveProject);
          // Redirect to Dashboard after successful sign in (Requirement 3)
          window.history.replaceState(null, '', '/');
          setCurrentScreen('dashboard');

          // Fetch analytics for this user
          safeApiFetch('/api/profile', {
            headers: effectiveToken ? { 'Authorization': `Bearer ${effectiveToken}` } : {},
            credentials: 'include'
          }).then(pData => {
            if (pData?.profile) {
              setProfile(pData.profile);
            }
            if (pData && pData.project !== undefined) {
              setProject(pData.project);
            }
            if (pData?.latestAnalysis) {
              setCategories(pData.latestAnalysis.categories || []);
              setCriticalIssues(pData.latestAnalysis.criticalIssues || []);
            } else {
              setCategories([]);
              setCriticalIssues([]);
            }
          }).catch(() => {});
        }}
        onNavigate={changeScreen}
      />
    );
  }

  // Render Onboarding flow
  if (currentScreen === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#FAF9F4]">
        <header className="px-6 py-4 border-b border-[#BEC9C4]/30 flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#005144] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px] filled">bolt</span>
            </div>
            <span className="font-['Manrope'] font-bold text-[20px] text-[#005144]">Projevo AI</span>
          </div>
          <button
            onClick={() => changeScreen('dashboard')}
            className="text-[13px] font-bold font-['Inter'] text-[#53615D] hover:text-[#005144]"
          >
            Exit Setup
          </button>
        </header>

        <OnboardingView
          profile={profile}
          onUpdateInterests={(interests) => {
            handleUpdateProfile({ selectedInterests: interests });
          }}
          onComplete={() => changeScreen('dashboard')}
          onNavigate={changeScreen}
        />
      </div>
    );
  }

  const handleSelectNewProject = async (titleOrProject: string | Partial<ProjectData>, stack?: string[]) => {
    let updatedProject: ProjectData;
    if (typeof titleOrProject === 'object') {
      updatedProject = {
        id: titleOrProject.id || ('proj_' + Date.now()),
        title: titleOrProject.title || 'Untitled Project',
        tagline: titleOrProject.tagline || '',
        domain: titleOrProject.domain,
        difficulty: titleOrProject.difficulty,
        problemStatement: titleOrProject.problemStatement,
        proposedSolution: titleOrProject.proposedSolution,
        expectedOutcome: titleOrProject.expectedOutcome,
        possibleExtensions: titleOrProject.possibleExtensions,
        feasibility: titleOrProject.feasibility,
        whyRelevant: titleOrProject.whyRelevant,
        status: titleOrProject.status || 'In Progress',
        matchScore: titleOrProject.matchScore || 88,
        healthScore: titleOrProject.healthScore || 85,
        readinessScore: titleOrProject.readinessScore || 45,
        stage: titleOrProject.stage || 'Requirements & Architecture',
        stageProgress: titleOrProject.stageProgress || 25,
        techStack: titleOrProject.techStack || stack || [],
        issuesCount: titleOrProject.issuesCount || 0
      };
    } else {
      updatedProject = {
        id: 'proj_' + Date.now(),
        title: titleOrProject,
        tagline: `Student project built with ${(stack || []).join(', ')}`,
        status: 'In Progress',
        matchScore: 90,
        healthScore: 85,
        readinessScore: 40,
        stage: 'Planning & Initial Scaffolding',
        stageProgress: 20,
        techStack: stack || [],
        issuesCount: 0
      };
    }

    setProject(updatedProject);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ project: updatedProject })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          setProject(data.project);
        }
      }
    } catch (err) {
      console.error('Error saving new project:', err);
    }
  };

  const handleDiagnosticComplete = (data: {
    overallHealth: number;
    categories: HealthCategory[];
    criticalIssues: CriticalIssue[];
  }) => {
    setCategories(data.categories);
    setCriticalIssues(data.criticalIssues);

    const healthReportObj = {
      overallHealth: data.overallHealth,
      categories: data.categories,
      criticalIssues: data.criticalIssues,
      analyzedAt: new Date().toISOString()
    };

    setProject((prev) => {
      const updated: ProjectData = prev ? {
        ...prev,
        healthScore: data.overallHealth,
        issuesCount: data.criticalIssues.length,
        healthReport: healthReportObj
      } : {
        id: 'proj_' + Date.now(),
        title: 'Diagnosed Project',
        tagline: 'Custom analyzed codebase',
        status: 'In Progress',
        matchScore: 88,
        healthScore: data.overallHealth,
        readinessScore: 60,
        stage: 'Diagnosis & Refactoring',
        stageProgress: 35,
        techStack: ['Python'],
        issuesCount: data.criticalIssues.length,
        healthReport: healthReportObj
      };

      // Persist genuine report to backend
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          credentials: 'include',
          body: JSON.stringify({
            project: updated,
            latestAnalysis: healthReportObj
          })
        }).catch(err => console.error('Error persisting diagnosis:', err));
      }

      return updated;
    });
  };

  return (
    <div className="bg-[#FAF9F4] text-[#1B1C19] min-h-screen flex font-['Manrope'] antialiased selection:bg-[#A5F1DD] selection:text-[#005144]">
      {/* Sidebar Navigation */}
      <Navigation
        currentScreen={currentScreen}
        onNavigate={changeScreen}
        onSelectScreen={changeScreen}
        profile={profile}
        onOpenDoctor={() => changeScreen('doctor')}
        onOpenIdeaAnalyzer={() => setIsIdeaModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 pb-20 md:pb-8">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#FAF9F4]/90 backdrop-blur-md border-b border-[#BEC9C4]/30 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-bold font-['Inter'] text-[#6F7975]">
              <span className="text-[#005144]">{profile.name}'s Workspace</span>
              <span>/</span>
              <span className="text-[#1B1C19] capitalize">
                {currentScreen.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Idea Analyzer Button in Header */}
            <button
              onClick={() => setIsIdeaModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#D6E6E0] hover:bg-[#BACAC4] text-[#005144] rounded-full text-[12px] font-bold font-['Inter'] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">lightbulb</span>
              <span>Analyze Idea</span>
            </button>

            {/* User Avatar Click to Profile */}
            <div
              onClick={() => changeScreen('profile')}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-white/80 transition-colors"
              title="View Profile & Settings"
            >
              <UserAvatar
                src={profile.avatar}
                name={profile.name}
                className="w-9 h-9 border border-[#BEC9C4]"
              />
            </div>
          </div>
        </header>

        {/* Dynamic Screen View Container */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto">
          {currentScreen === 'dashboard' && (
            <DashboardView
              profile={profile}
              project={project}
              onNavigate={changeScreen}
              onOpenIdeaAnalyzer={() => setIsIdeaModalOpen(true)}
            />
          )}

          {currentScreen === 'health-report' && (
            <HealthReportView
              categories={categories}
              criticalIssues={criticalIssues}
              overallScore={project ? project.healthScore : 80}
              onNavigate={changeScreen}
              onOpenAdaptiveSupport={() => changeScreen('skill-gap')}
            />
          )}

          {(currentScreen === 'skill-gap' || currentScreen === 'adaptive-support') && (
            <SkillGapAnalysisView
              project={project}
              profile={profile}
              onNavigate={changeScreen}
              onUpdateProfile={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
              onSelectProject={handleSelectNewProject}
            />
          )}

          {currentScreen === 'doctor' && (
            <ProjectDoctorView
              currentProject={project}
              onNavigate={changeScreen}
              onDiagnosticComplete={handleDiagnosticComplete}
            />
          )}

          {currentScreen === 'discovery' && (
            <ProjectDiscoveryView
              profile={profile}
              currentProject={project}
              onNavigate={changeScreen}
              onSelectProject={handleSelectNewProject}
            />
          )}

          {currentScreen === 'interview-prep' && (
            <InterviewPrepView
              currentProject={project}
              onNavigate={changeScreen}
            />
          )}

          {(currentScreen === 'profile' || currentScreen === 'settings') && (
            <ProfileSettingsView
              profile={profile}
              onUpdateProfile={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
              onNavigate={changeScreen}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Global Idea Analyzer Modal */}
      <IdeaAnalyzerModal
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        onSelectNewProject={handleSelectNewProject}
      />
    </div>
  );
}
