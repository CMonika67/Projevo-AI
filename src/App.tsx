/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenType, UserProfile, ProjectData, HealthCategory, CriticalIssue } from './types';
import {
  initialProfile,
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
import { OnboardingView } from './components/OnboardingView';
import { ProjectDoctorView } from './components/ProjectDoctorView';
import { ProjectDiscoveryView } from './components/ProjectDiscoveryView';
import { InterviewPrepView } from './components/InterviewPrepView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { IdeaAnalyzerModal } from './components/IdeaAnalyzerModal';
import { UserAvatar } from './components/UserAvatar';
import { safeApiFetch } from './api';
import { firebaseSignOut } from './firebase';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('login');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(true);

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
    setIsAuthenticated(false);
    setProfile(initialProfile);
    setProject(currentProject);
    setCategories(defaultHealthCategories);
    setCriticalIssues(defaultCriticalIssues);
    setCurrentScreen('login');
  };

  const changeScreen = (screen: ScreenType) => {
    if (screen === 'login') {
      handleLogout();
      return;
    }
    if (!isAuthenticated && screen !== 'onboarding') {
      handleLogout();
      return;
    }
    setCurrentScreen(screen);
  };
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [project, setProject] = useState<ProjectData>(currentProject);
  const [categories, setCategories] = useState<HealthCategory[]>(defaultHealthCategories);
  const [criticalIssues, setCriticalIssues] = useState<CriticalIssue[]>(defaultCriticalIssues);
  const [metrics] = useState(defaultStruggleMetrics);
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // Check session validity on startup/refresh via HttpOnly cookie
  useEffect(() => {
    async function checkSession() {
      try {
        const data = await safeApiFetch('/api/auth/me', {
          credentials: 'include'
        });
        if (data.profile) {
          setProfile(data.profile);
        }
        if (data.project) {
          setProject(data.project);
        }
        
        // Also fetch the full profile analytics info to populate categories & issues
        try {
          const profileData = await safeApiFetch('/api/profile', {
            credentials: 'include'
          });
          if (profileData && profileData.latestAnalysis) {
            setCategories(profileData.latestAnalysis.categories);
            setCriticalIssues(profileData.latestAnalysis.criticalIssues);
          }
        } catch {
          // If profile fetch fails, keep current profile
        }

        setIsAuthenticated(true);
        setCurrentScreen('dashboard');
      } catch (err) {
        setIsAuthenticated(false);
        setCurrentScreen('login');
      } finally {
        setIsValidatingSession(false);
      }
    }
    checkSession();
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

  // If we are currently validating a session on reload, display a premium loading state matching the theme
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

  // Route guard: if unauthenticated, show the Login screen
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(email, userProfile, userProject) => {
          setIsAuthenticated(true);
          if (userProfile) {
            setProfile(userProfile);
          }
          if (userProject) {
            setProject(userProject);
          }
          // Fetch analytics for this user via cookie session
          safeApiFetch('/api/profile').then(pData => {
            if (pData?.latestAnalysis) {
              setCategories(pData.latestAnalysis.categories);
              setCriticalIssues(pData.latestAnalysis.criticalIssues);
            }
          }).catch(() => {});
          setCurrentScreen('dashboard');
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

  const handleSelectNewProject = async (title: string, stack: string[]) => {
    const updatedProject = {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      tagline: `Student project built with ${stack.join(', ')}`,
      status: 'In Progress',
      matchScore: 94,
      healthScore: 92,
      readinessScore: 40,
      stage: 'Planning & Initial Scaffolding',
      stageProgress: 20,
      techStack: stack,
      issuesCount: 0
    };

    setProject(updatedProject);

    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers,
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
    setProject((prev) => ({ 
      ...prev, 
      healthScore: data.overallHealth,
      issuesCount: data.criticalIssues.length
    }));
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
              className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-[#D6E6E0] hover:bg-[#BACAC4] text-[#005144] rounded-full text-[12px] font-bold font-['Inter'] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">lightbulb</span>
              <span>Analyze Idea</span>
            </button>

            {/* Quick Switch to Doctor */}
            <button
              onClick={() => changeScreen('doctor')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F4EF] border border-[#BEC9C4]/50 rounded-lg text-[12px] font-bold font-['Inter'] text-[#005144] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">medical_services</span>
              <span>Project Doctor</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationPopup(!showNotificationPopup)}
                className="w-10 h-10 rounded-full bg-white border border-[#BEC9C4]/40 flex items-center justify-center text-[#53615D] hover:text-[#005144] hover:border-[#005144] transition-colors relative cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#D95F59] rounded-full border-2 border-white"></span>
                )}
              </button>

              {showNotificationPopup && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl p-4 bento-shadow border border-[#BEC9C4]/40 z-50 animate-fadeIn">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[14px] font-bold font-['Manrope'] text-[#005144]">
                      Alerts &amp; Updates
                    </h4>
                    <button
                      onClick={() => {
                        setNotificationCount(0);
                        setShowNotificationPopup(false);
                      }}
                      className="text-[11px] text-[#6F7975] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="space-y-2.5 text-[12px]">
                    <div
                      onClick={() => {
                        changeScreen('health-report');
                        setShowNotificationPopup(false);
                      }}
                      className="p-2.5 bg-[#FFDAD3]/40 rounded-xl cursor-pointer hover:bg-[#FFDAD3]/60 transition-colors"
                    >
                      <p className="font-bold text-[#7C2E1D]">Brute-Force Risk Detected</p>
                      <p className="text-[#3F4945]">Missing rate limiter on login endpoint line 42.</p>
                    </div>
                    <div
                      onClick={() => {
                        changeScreen('adaptive-support');
                        setShowNotificationPopup(false);
                      }}
                      className="p-2.5 bg-[#D6E6E0]/40 rounded-xl cursor-pointer hover:bg-[#D6E6E0]/60 transition-colors"
                    >
                      <p className="font-bold text-[#005144]">Adaptive Hint Ready</p>
                      <p className="text-[#3F4945]">Unblock your data_processor.py NameError.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Click to Profile */}
            <div
              onClick={() => changeScreen('profile')}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-lg hover:bg-white/80 transition-colors"
            >
              <UserAvatar
                src={profile.avatar}
                name={profile.name}
                className="w-9 h-9 border border-[#BEC9C4]"
              />
            </div>

            {/* Sign Out Button in Header */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FFDAD3]/50 text-[#7C2E1D] border border-[#BEC9C4]/40 hover:border-[#FFB4A4] rounded-lg text-[12px] font-bold font-['Inter'] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
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
              overallScore={project.healthScore}
              onNavigate={changeScreen}
              onOpenAdaptiveSupport={() => changeScreen('adaptive-support')}
            />
          )}

          {currentScreen === 'adaptive-support' && (
            <AdaptiveSupportView
              metrics={metrics}
              onNavigate={changeScreen}
            />
          )}

          {currentScreen === 'doctor' && (
            <ProjectDoctorView
              onNavigate={changeScreen}
              onDiagnosticComplete={handleDiagnosticComplete}
            />
          )}

          {currentScreen === 'discovery' && (
            <ProjectDiscoveryView
              onNavigate={changeScreen}
              onSelectProject={handleSelectNewProject}
            />
          )}

          {currentScreen === 'interview-prep' && (
            <InterviewPrepView
              projectTitle={project.title}
              onNavigate={changeScreen}
            />
          )}

          {(currentScreen === 'profile' || currentScreen === 'settings') && (
            <ProfileSettingsView
              profile={profile}
              onUpdateProfile={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
              onNavigate={changeScreen}
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
