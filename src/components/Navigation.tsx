import React, { useState } from 'react';
import { ScreenType, UserProfile } from '../types';
import { UserAvatar } from './UserAvatar';

export interface NavigationProps {
  currentScreen: ScreenType;
  onNavigate?: (screen: ScreenType) => void;
  onSelectScreen?: (screen: ScreenType) => void;
  profile: UserProfile;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  onOpenDoctor?: () => void;
  onOpenIdeaAnalyzer?: () => void;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentScreen,
  onNavigate,
  onSelectScreen,
  profile,
  mobileMenuOpen: controlledMobileMenuOpen,
  setMobileMenuOpen: controlledSetMobileMenuOpen,
  onLogout,
}) => {
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const isMenuOpen = controlledMobileMenuOpen !== undefined ? controlledMobileMenuOpen : internalMenuOpen;
  const toggleMenu = controlledSetMobileMenuOpen || setInternalMenuOpen;

  const handleSelect = (screen: ScreenType) => {
    if (typeof onNavigate === 'function') {
      try {
        onNavigate(screen);
      } catch (err) {
        console.error('Navigation error:', err);
      }
    }
    if (typeof onSelectScreen === 'function') {
      try {
        onSelectScreen(screen);
      } catch (err) {
        console.error('onSelectScreen error:', err);
      }
    }
    if (typeof toggleMenu === 'function') {
      try {
        toggleMenu(false);
      } catch (err) {
        console.error('toggleMenu error:', err);
      }
    }
  };

  const navItems = [
    { id: 'dashboard' as ScreenType, label: 'Dashboard', icon: 'dashboard' },
    { id: 'discovery' as ScreenType, label: 'Project Discovery', icon: 'explore' },
    { id: 'doctor' as ScreenType, label: 'Project Doctor', icon: 'medical_services' },
    { id: 'health-report' as ScreenType, label: 'Health Report', icon: 'monitor_heart' },
    { id: 'skill-gap' as ScreenType, label: 'Skill Gap Analysis', icon: 'insights' },
    { id: 'interview-prep' as ScreenType, label: 'Interview Prep', icon: 'school' },
    { id: 'onboarding' as ScreenType, label: 'Onboarding (Topics)', icon: 'auto_awesome' },
    { id: 'profile' as ScreenType, label: 'Profile & Settings', icon: 'person' },
  ];

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="md:hidden sticky top-0 w-full z-40 flex justify-between items-center px-4 h-16 bg-[#FAF9F4] border-b border-[#BEC9C4]/40">
        <button
          onClick={() => toggleMenu(!isMenuOpen)}
          className="flex items-center justify-center p-2 text-[#005144] hover:bg-[#F5F4EF] transition-colors rounded-full"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div
          onClick={() => handleSelect('dashboard')}
          className="text-[22px] font-bold text-[#005144] tracking-tight cursor-pointer font-['Manrope']"
        >
          Projevo AI
        </div>

        <div
          onClick={() => handleSelect('profile')}
          className="w-9 h-9 rounded-full overflow-hidden border border-[#BEC9C4] cursor-pointer shrink-0"
        >
          <UserAvatar
            name={profile.name}
            src={profile.avatar}
            className="w-full h-full"
          />
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-50 backdrop-blur-xs flex"
          onClick={() => toggleMenu(false)}
        >
          <div
            className="w-72 bg-[#FAF9F4] h-full p-4 flex flex-col shadow-2xl border-r border-[#BEC9C4]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-3 mb-4 border-b border-[#BEC9C4]/30">
              <UserAvatar
                src={profile.avatar}
                name={profile.name}
                className="w-11 h-11 border border-[#BEC9C4]"
              />
              <div>
                <h3 className="text-[17px] font-bold text-[#005144]">{profile.name}</h3>
                <p className="text-[12px] text-[#3F4945]">{profile.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {navItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={`${item.id}-${item.label}`}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left text-[14px] font-semibold transition-all ${
                      isActive
                        ? 'bg-[#D6E6E0] text-[#101E1B] font-bold'
                        : 'text-[#3F4945] hover:bg-[#EFEEE9]'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isActive ? 'filled text-[#005144]' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="pt-4 mt-4 border-t border-[#BEC9C4]/30">
                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    else handleSelect('login');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left text-[13px] text-[#7C2E1D] hover:bg-[#FFDAD3]/50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Navigation Drawer (Fixed left sidebar) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 flex-col p-4 h-full w-64 rounded-r-2xl shadow-sm bg-[#FAF9F4] border-r border-[#BEC9C4]/60">
        {/* Brand / Logo */}
        <div
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5 px-3 py-2 mb-4 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#005144] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[20px] filled">bolt</span>
          </div>
          <span className="font-['Manrope'] font-bold text-[20px] text-[#005144] tracking-tight">Projevo AI</span>
        </div>

        {/* User Card */}
        <div
          onClick={() => handleSelect('profile')}
          className="flex items-center gap-3 mb-5 p-2.5 rounded-xl hover:bg-[#F5F4EF] cursor-pointer transition-colors bg-white/60 border border-[#BEC9C4]/30"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#BEC9C4] shrink-0">
            <UserAvatar
              name={profile.name}
              src={profile.avatar}
              className="w-full h-full"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-bold font-['Manrope'] text-[#005144] truncate">
              {profile.name}
            </span>
            <span className="text-[11px] font-semibold text-[#3F4945] truncate">
              {profile.role}
            </span>
            <span className="text-[10px] font-medium text-[#6F7975] mt-0.5">
              {profile.membership}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto space-y-1 pr-1">
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <button
                key={`${item.id}-${item.label}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[13px] tracking-wide transition-all ${
                  isActive
                    ? 'bg-[#D6E6E0] text-[#101E1B] font-bold shadow-xs'
                    : 'text-[#3F4945] hover:bg-[#EFEEE9] font-medium'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? 'filled text-[#005144]' : 'text-[#6F7975]'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-['Inter']">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info & quick sign out */}
        <div className="pt-3 border-t border-[#BEC9C4]/40 flex items-center justify-between text-[11px] text-[#6F7975] px-2">
          <button
            onClick={() => {
              if (onLogout) onLogout();
              else handleSelect('login');
            }}
            className="hover:text-[#7C2E1D] font-bold text-[#7C2E1D] flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
          <span className="text-[10px] font-mono text-[#6F7975]">v2.4 Pro</span>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-16 px-2 bg-[#FAF9F4] border-t border-[#BEC9C4]/60 shadow-md">
        <button
          onClick={() => handleSelect('dashboard')}
          className={`flex flex-col items-center justify-center transition-all ${
            currentScreen === 'dashboard'
              ? 'text-[#005144] font-bold'
              : 'text-[#3F4945] hover:text-[#005144]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          <span className="text-[10px] font-['Inter']">Home</span>
        </button>

        <button
          onClick={() => handleSelect('discovery')}
          className={`flex flex-col items-center justify-center transition-all ${
            currentScreen === 'discovery'
              ? 'text-[#005144] font-bold'
              : 'text-[#3F4945] hover:text-[#005144]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">explore</span>
          <span className="text-[10px] font-['Inter']">Discover</span>
        </button>

        <button
          onClick={() => handleSelect('doctor')}
          className={`flex flex-col items-center justify-center transition-all ${
            currentScreen === 'doctor' || currentScreen === 'health-report'
              ? 'text-[#005144] font-bold'
              : 'text-[#3F4945] hover:text-[#005144]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">medical_services</span>
          <span className="text-[10px] font-['Inter']">Doctor</span>
        </button>

        <button
          onClick={() => handleSelect('adaptive-support')}
          className={`flex flex-col items-center justify-center transition-all ${
            currentScreen === 'adaptive-support'
              ? 'text-[#005144] font-bold'
              : 'text-[#3F4945] hover:text-[#005144]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">support_agent</span>
          <span className="text-[10px] font-['Inter']">Support</span>
        </button>

        <button
          onClick={() => handleSelect('profile')}
          className={`flex flex-col items-center justify-center transition-all ${
            currentScreen === 'profile'
              ? 'text-[#005144] font-bold'
              : 'text-[#3F4945] hover:text-[#005144]'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">person</span>
          <span className="text-[10px] font-['Inter']">Profile</span>
        </button>
      </nav>
    </>
  );
};

export default Navigation;
