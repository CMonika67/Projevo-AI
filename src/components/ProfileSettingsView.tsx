import React, { useState } from 'react';
import { UserProfile, ScreenType } from '../types';

interface ProfileSettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onNavigate,
}) => {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [email, setEmail] = useState(profile.email);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name, role, email });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-[12px] font-bold font-['Inter'] text-[#176B5B] hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
        <h1 className="text-[28px] md:text-[38px] font-bold font-['Manrope'] text-[#005144]">
          My Profile & Settings
        </h1>
        <p className="text-[16px] text-[#3F4945] font-['Manrope'] mt-1">
          Manage your engineering student identity, learning goals, and workspace preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Profile Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#005144] p-0.5 mb-4 shadow-sm">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <h2 className="text-[22px] font-bold font-['Manrope'] text-[#005144]">{profile.name}</h2>
          <p className="text-[14px] text-[#3F4945] font-medium">{profile.role}</p>
          <span className="mt-2 px-3 py-1 bg-[#D6E6E0] text-[#005144] text-[11px] font-bold font-['Inter'] rounded-full">
            {profile.membership}
          </span>

          <div className="w-full mt-6 pt-6 border-t border-[#BEC9C4]/30 text-left space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">University</span>
              <span className="font-bold text-[#1B1C19]">Stanford University</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">Graduation</span>
              <span className="font-bold text-[#1B1C19]">Spring 2027</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">Verified GitHub</span>
              <span className="font-bold text-[#2E8B70] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                @monikac-eng
              </span>
            </div>
          </div>
        </div>

        {/* Right Settings Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40">
          <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144] mb-6">
            Account Information
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  Academic Status
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                University Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <h4 className="text-[14px] font-bold font-['Inter'] text-[#005144] mb-3">
                Current Interest Tracks
              </h4>
              <div className="flex flex-wrap gap-2">
                {profile.selectedInterests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1.5 bg-[#D6E6E0] text-[#005144] font-bold text-[12px] font-['Inter'] rounded-full border border-[#53615D]/20 flex items-center gap-1.5"
                  >
                    <span>{interest}</span>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => onNavigate('onboarding')}
                  className="px-3 py-1.5 bg-[#FAF9F4] hover:bg-[#D6E6E0] text-[#176B5B] font-bold text-[12px] font-['Inter'] rounded-full border border-dashed border-[#176B5B]"
                >
                  + Edit Topics
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#BEC9C4]/30">
              {savedSuccess ? (
                <span className="text-[13px] font-bold text-[#2E8B70] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Saved changes successfully
                </span>
              ) : (
                <span></span>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[13px] font-bold font-['Inter'] shadow-xs transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
