import React, { useState } from 'react';
import { UserProfile, ScreenType } from '../types';
import { UserAvatar } from './UserAvatar';

interface ProfileSettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (screen: ScreenType) => void;
}

const MONIKA_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ";

function levelToPercentage(level: string): number {
  switch (level) {
    case 'Strong': return 90;
    case 'Medium': return 60;
    case 'Low': return 30;
    case 'No Knowledge': return 0;
    default: return 0;
  }
}

function percentageToLevel(percentage: number): string {
  if (percentage >= 80) return 'Strong';
  if (percentage >= 50) return 'Medium';
  if (percentage >= 20) return 'Low';
  return 'No Knowledge';
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onNavigate,
}) => {
  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [email, setEmail] = useState(profile.email);
  const [university, setUniversity] = useState(profile.university || 'Stanford University');
  const [graduationYear, setGraduationYear] = useState(profile.graduationYear || 'Spring 2027');
  const [githubUsername, setGithubUsername] = useState(profile.githubUsername || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Avatar states
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Skills states
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('Strong');
  const [editingSkillIndex, setEditingSkillIndex] = useState<number | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({ name, role, email, university, graduationYear, githubUsername });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Please upload a valid image file (PNG, JPG, or JPEG).');
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      setAvatarError('Image file size must be less than 2MB.');
      return;
    }

    setAvatarError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateProfile({ avatar: data.avatarUrl });
      } else {
        const err = await res.json();
        setAvatarError(err.error || 'Failed to upload image.');
      }
    } catch (err) {
      console.error(err);
      setAvatarError('Failed to upload image.');
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const res = await fetch('/api/profile/avatar/reset', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarPreview(null);
        onUpdateProfile({ avatar: data.avatarUrl });
        setAvatarError(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;

    const skillLevelNum = levelToPercentage(newSkillLevel);

    try {
      const res = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newSkillName.trim(), level: skillLevelNum })
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateProfile({ skills: data.profile.skills });
        setNewSkillName('');
        setNewSkillLevel('Strong');
        setEditingSkillIndex(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSkill = (index: number) => {
    const skill = profile.skills[index];
    setNewSkillName(skill.name);
    setNewSkillLevel(percentageToLevel(skill.level));
    setEditingSkillIndex(index);
  };

  const handleDeleteSkill = async (index: number) => {
    const skill = profile.skills[index];
    try {
      const res = await fetch(`/api/profile/skills/${encodeURIComponent(skill.name)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        onUpdateProfile({ skills: data.profile.skills });
        if (editingSkillIndex === index) {
          setNewSkillName('');
          setEditingSkillIndex(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
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
          <div className="w-24 h-24 rounded-full border-2 border-[#005144] p-0.5 mb-4 shadow-sm relative group overflow-hidden">
            <UserAvatar
              src={avatarPreview || profile.avatar}
              name={name || profile.name}
              className="w-full h-full"
              fontSize="text-[36px] font-extrabold"
            />
            {/* Overlay for uploading image on hover */}
            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-full flex flex-col items-center justify-center text-white text-[11px] font-bold cursor-pointer transition-opacity">
              <span className="material-symbols-outlined text-[20px] mb-0.5">photo_camera</span>
              <span>Change</span>
              <input
                type="file"
                onChange={handleAvatarChange}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg"
              />
            </label>
          </div>

          {/* Upload and Reset Avatar Actions */}
          <div className="flex flex-col items-center gap-2 w-full mb-3">
            <div className="flex gap-2">
              <label className="px-3 py-1.5 bg-[#FAF9F4] hover:bg-[#D6E6E0] border border-[#BEC9C4]/50 rounded-lg text-[11px] font-bold font-['Inter'] text-[#005144] cursor-pointer transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">upload</span>
                Upload Image
                <input
                  type="file"
                  onChange={handleAvatarChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                />
              </label>
              {(profile.avatar || avatarPreview) && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-3 py-1.5 bg-[#FFDAD6] hover:bg-[#FFC4BE] border border-[#FFB4A4]/40 rounded-lg text-[11px] font-bold font-['Inter'] text-[#7C2E1D] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Remove
                </button>
              )}
            </div>
            {avatarError && (
              <span className="text-[11px] font-semibold text-[#D95F59] mt-1">{avatarError}</span>
            )}
          </div>

          <h2 className="text-[22px] font-bold font-['Manrope'] text-[#005144]">{profile.name}</h2>
          <p className="text-[14px] text-[#3F4945] font-medium">{profile.role}</p>
          <span className="mt-2 px-3 py-1 bg-[#D6E6E0] text-[#005144] text-[11px] font-bold font-['Inter'] rounded-full">
            {profile.membership}
          </span>

          <div className="w-full mt-6 pt-6 border-t border-[#BEC9C4]/30 text-left space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">University</span>
              <span className="font-bold text-[#1B1C19]">{profile.university || 'Stanford University'}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">Graduation</span>
              <span className="font-bold text-[#1B1C19]">{profile.graduationYear || 'Spring 2027'}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">Verified GitHub</span>
              {githubUsername ? (
                <a
                  href={`https://github.com/${githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#2E8B70] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  @{githubUsername}
                </a>
              ) : (
                <span className="text-[#6F7975] text-[12px] italic">Not connected</span>
              )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  University
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  Graduation Year
                </label>
                <select
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                >
                  <option value="Spring 2025">Spring 2025</option>
                  <option value="Fall 2025">Fall 2025</option>
                  <option value="Spring 2026">Spring 2026</option>
                  <option value="Fall 2026">Fall 2026</option>
                  <option value="Spring 2027">Spring 2027</option>
                  <option value="Fall 2027">Fall 2027</option>
                  <option value="Spring 2028">Spring 2028</option>
                  <option value="Fall 2028">Fall 2028</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  GitHub Profile Handle
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6F7975] text-[14px] font-bold">
                    @
                  </div>
                  <input
                    type="text"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    placeholder="e.g. your-github-username"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl pl-8 pr-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none placeholder-[#6F7975]"
                  />
                </div>
              </div>
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
                  className="px-3 py-1.5 bg-[#FAF9F4] hover:bg-[#D6E6E0] text-[#176B5B] font-bold text-[12px] font-['Inter'] rounded-full border border-dashed border-[#176B5B] cursor-pointer"
                >
                  + Edit Topics
                </button>
              </div>
            </div>

            {/* Skills Management Section */}
            <div className="mt-8 pt-8 border-t border-[#BEC9C4]/30">
              <h4 className="text-[16px] font-bold font-['Manrope'] text-[#005144] mb-4">
                Skill Inventory
              </h4>

              {/* Add Skill form */}
              <div className="bg-[#FAF9F4] p-4 rounded-xl border border-[#BEC9C4]/40 mb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                      Skill Name
                    </label>
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="e.g. Python, SQL, React"
                      list="popular-skills"
                      className="w-full h-10 bg-white border border-[#BEC9C4] rounded-xl px-4 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                    />
                    <datalist id="popular-skills">
                      <option value="Python" />
                      <option value="Machine Learning" />
                      <option value="SQL" />
                      <option value="Git" />
                      <option value="React" />
                      <option value="FastAPI" />
                      <option value="PyTorch" />
                      <option value="Docker" />
                      <option value="TypeScript" />
                      <option value="Node.js" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                      Skill Level
                    </label>
                    <select
                      value={newSkillLevel}
                      onChange={(e) => setNewSkillLevel(e.target.value)}
                      className="w-full h-10 bg-white border border-[#BEC9C4] rounded-xl px-4 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                    >
                      <option value="Strong">Strong</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                      <option value="No Knowledge">No Knowledge</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-[#005144] hover:bg-[#166A5A] text-white rounded-lg text-[12px] font-bold font-['Inter'] transition-colors cursor-pointer"
                  >
                    {editingSkillIndex !== null ? 'Update Skill' : 'Add Skill'}
                  </button>
                </div>
              </div>

              {/* Skills List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {profile.skills.map((skill, index) => {
                  const levelStr = percentageToLevel(skill.level);
                  return (
                    <div
                      key={skill.name}
                      className="flex items-center justify-between p-3.5 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/30 hover:border-[#BEC9C4] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#1B1C19] text-[13px]">{skill.name}</span>
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold font-['Inter'] rounded-full ${
                          levelStr === 'Strong' ? 'bg-[#D6E6E0] text-[#005144]' :
                          levelStr === 'Medium' ? 'bg-[#FFECBD] text-[#7C5A00]' :
                          levelStr === 'Low' ? 'bg-[#FFDAD6] text-[#7C2E1D]' :
                          'bg-[#EFEEE9] text-[#6F7975]'
                        }`}>
                          {levelStr}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditSkill(index)}
                          className="w-8 h-8 rounded-lg bg-white border border-[#BEC9C4]/40 text-[#53615D] hover:text-[#005144] flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Skill"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSkill(index)}
                          className="w-8 h-8 rounded-lg bg-white border border-[#BEC9C4]/40 text-[#53615D] hover:text-[#D95F59] flex items-center justify-center transition-colors cursor-pointer"
                          title="Remove Skill"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {profile.skills.length === 0 && (
                  <p className="text-[12px] text-[#6F7975] text-center py-4">No skills registered in inventory yet.</p>
                )}
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

