import React, { useState } from 'react';
import { UserProfile, ScreenType, UserSkill } from '../types';

interface ProfileSettingsViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onNavigate: (screen: ScreenType) => void;
  onLogout?: () => void;
}

const MONIKA_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ";

const POPULAR_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Node.js',
  'Express.js', 'FastAPI', 'Flask', 'Django', 'Java', 'Spring Boot', 'C++',
  'Go', 'Rust', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'Google Cloud', 'Git & GitHub', 'CI/CD', 'Linux', 'Machine Learning',
  'Deep Learning', 'PyTorch', 'TensorFlow', 'Pandas', 'Computer Vision',
  'Natural Language Processing', 'System Design', 'REST APIs', 'GraphQL',
  'Cybersecurity', 'Agile / Scrum'
];

const AVAILABLE_TRACKS = [
  'Artificial Intelligence & Machine Learning',
  'Full-Stack Web Development',
  'Cloud Computing & DevOps',
  'Cybersecurity & Network Defense',
  'Data Science & Analytics',
  'Mobile Application Development',
  'Internet of Things & Embedded Systems',
  'Robotics & Automation',
  'Blockchain & Web3'
];

function levelToPercentage(level: string): number {
  switch (level) {
    case 'Strong': return 90;
    case 'Medium': return 60;
    case 'Low': return 30;
    case 'Beginner': return 20;
    default: return 50;
  }
}

function percentageToLevel(percentage: number): string {
  if (percentage >= 80) return 'Strong';
  if (percentage >= 50) return 'Medium';
  if (percentage >= 20) return 'Low';
  return 'Beginner';
}

function normalizeGitHubUrl(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanUsername = trimmed.replace(/^@/, '');
  return `https://github.com/${cleanUsername}`;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onNavigate,
  onLogout,
}) => {
  const [name, setName] = useState(profile.name || '');
  const [role, setRole] = useState(profile.role || '');
  const [email, setEmail] = useState(profile.email || '');
  const [college, setCollege] = useState(profile.college || profile.university || '');
  const [course, setCourse] = useState(profile.course || '');
  const [yearOfStudy, setYearOfStudy] = useState(profile.yearOfStudy || profile.graduationYear || '4th Year');
  const [github, setGithub] = useState(profile.github || '');
  const [githubError, setGithubError] = useState<string | null>(null);

  // User Skills state
  const [skills, setSkills] = useState<UserSkill[]>(profile.skills || []);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.selectedInterests || []);
  const [interestedRoles, setInterestedRoles] = useState<string[]>(profile.interestedRoles || []);
  const [learningPreferences, setLearningPreferences] = useState(profile.learningPreferences || 'Hands-on project building with real code and automated tests');
  const [onboardingGoals, setOnboardingGoals] = useState(profile.onboardingGoals || 'Prepare for technical interviews and build production-grade portfolio projects');

  // Sync internal state when profile prop updates
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setRole(profile.role || '');
      setEmail(profile.email || '');
      setCollege(profile.college || profile.university || '');
      setCourse(profile.course || '');
      setYearOfStudy(profile.yearOfStudy || profile.graduationYear || '');
      setGithub(profile.github || '');
      setSkills(profile.skills || []);
      setSelectedInterests(profile.selectedInterests || []);
      setInterestedRoles(profile.interestedRoles || []);
      if (profile.learningPreferences) setLearningPreferences(profile.learningPreferences);
      if (profile.onboardingGoals) setOnboardingGoals(profile.onboardingGoals);
    }
  }, [profile]);

  // Skill Inventory search & filter
  const [skillSearch, setSkillSearch] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [otherSkillName, setOtherSkillName] = useState('');
  const [otherSkillStatus, setOtherSkillStatus] = useState<'have' | 'learning'>('have');
  const [otherSkillLevel, setOtherSkillLevel] = useState<string>('Medium');
  const [otherSkillError, setOtherSkillError] = useState<string | null>(null);

  // Quick-add standard skill status
  const [skillStatusMode, setSkillStatusMode] = useState<'have' | 'learning'>('have');

  // Async Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Avatar states
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const validateGithub = (val: string): boolean => {
    if (!val.trim()) {
      setGithubError(null);
      return true;
    }
    const clean = val.trim();
    const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_-]+\/?$/;
    const githubUserRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

    if (clean.startsWith('http')) {
      if (!githubUrlRegex.test(clean)) {
        setGithubError('Please enter a valid GitHub profile URL (e.g. https://github.com/username).');
        return false;
      }
    } else {
      const username = clean.replace(/^@/, '');
      if (!githubUserRegex.test(username)) {
        setGithubError('Please enter a valid GitHub username (alphanumeric and single hyphens).');
        return false;
      }
    }
    setGithubError(null);
    return true;
  };

  const handleToggleStandardSkill = (skillName: string) => {
    const existingIndex = skills.findIndex(s => s.name.toLowerCase() === skillName.toLowerCase());
    if (existingIndex >= 0) {
      // Remove
      setSkills(skills.filter((_, idx) => idx !== existingIndex));
    } else {
      // Add with selected status
      const newSkill: UserSkill = {
        name: skillName,
        level: skillStatusMode === 'have' ? 70 : 30,
        status: skillStatusMode
      };
      setSkills([...skills, newSkill]);
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = otherSkillName.trim();
    if (!trimmed) {
      setOtherSkillError('Please enter a skill name.');
      return;
    }
    if (skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setOtherSkillError(`Skill "${trimmed}" is already in your inventory.`);
      return;
    }

    setOtherSkillError(null);
    const newSkill: UserSkill = {
      name: trimmed,
      level: levelToPercentage(otherSkillLevel),
      status: otherSkillStatus
    };
    setSkills([...skills, newSkill]);
    setOtherSkillName('');
    setIsOtherSelected(false);
  };

  const handleRemoveSkill = (skillName: string) => {
    setSkills(skills.filter(s => s.name.toLowerCase() !== skillName.toLowerCase()));
  };

  const handleUpdateSkillLevel = (skillName: string, level: number) => {
    setSkills(skills.map(s => (s.name.toLowerCase() === skillName.toLowerCase() ? { ...s, level } : s)));
  };

  const handleToggleSkillStatus = (skillName: string) => {
    setSkills(skills.map(s => {
      if (s.name.toLowerCase() === skillName.toLowerCase()) {
        const nextStatus: 'have' | 'learning' = s.status === 'learning' ? 'have' : 'learning';
        return { ...s, status: nextStatus, level: nextStatus === 'have' ? 70 : 30 };
      }
      return s;
    }));
  };

  const handleToggleTrack = (track: string) => {
    if (selectedInterests.includes(track)) {
      setSelectedInterests(selectedInterests.filter(t => t !== track));
    } else {
      setSelectedInterests([...selectedInterests, track]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateGithub(github)) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const normalizedGithub = normalizeGitHubUrl(github);

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          name,
          role,
          email,
          college,
          university: college,
          course,
          yearOfStudy,
          graduationYear: yearOfStudy,
          github: normalizedGithub,
          skills,
          selectedInterests,
          interestedRoles,
          learningPreferences,
          onboardingGoals,
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save changes. Please try again.');
      }

      const responseData = await res.json();
      onUpdateProfile(responseData.profile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while saving your profile.');
    } finally {
      setIsSaving(false);
    }
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
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
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
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile/avatar/reset', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
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

  const filteredPopularSkills = POPULAR_SKILLS.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const skillsHave = skills.filter(s => s.status !== 'learning');
  const skillsLearning = skills.filter(s => s.status === 'learning');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            Profile & Settings
          </h1>
          <p className="text-[15px] text-[#3F4945] font-['Manrope'] mt-1">
            Manage your engineering profile, verified skills inventory, and interested technical tracks.
          </p>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="self-start md:self-auto px-4 py-2 bg-[#FAF9F4] border border-[#FFB4A4] text-[#C62828] hover:bg-[#FFEBEE] rounded-xl text-[13px] font-bold font-['Inter'] transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Profile Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#005144] p-0.5 mb-4 shadow-sm relative group">
            <img
              src={avatarPreview || profile.avatar || MONIKA_AVATAR}
              alt={profile.name || 'User avatar'}
              className="w-full h-full object-cover rounded-full"
            />
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
              {profile.avatar && profile.avatar !== MONIKA_AVATAR && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="px-3 py-1.5 bg-[#FFDAD6] hover:bg-[#FFC4BE] border border-[#FFB4A4]/40 rounded-lg text-[11px] font-bold font-['Inter'] text-[#7C2E1D] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  Reset
                </button>
              )}
            </div>
            {avatarError && (
              <span className="text-[11px] font-semibold text-[#D95F59] mt-1">{avatarError}</span>
            )}
          </div>

          <h2 className="text-[22px] font-bold font-['Manrope'] text-[#005144]">{name || 'Your Name'}</h2>
          <p className="text-[14px] text-[#3F4945] font-medium">{role || 'Engineering Student'}</p>
          <span className="mt-2 px-3 py-1 bg-[#D6E6E0] text-[#005144] text-[11px] font-bold font-['Inter'] rounded-full">
            {profile.membership || 'Projevo AI Member'}
          </span>

          <div className="w-full mt-6 pt-6 border-t border-[#BEC9C4]/30 text-left space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">College</span>
              <span className="font-bold text-[#1B1C19]">{college || profile.university || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">Course</span>
              <span className="font-bold text-[#1B1C19]">{course || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">Year of Study</span>
              <span className="font-bold text-[#1B1C19]">{yearOfStudy || profile.graduationYear || 'Not specified'}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6F7975]">GitHub Account</span>
              {github ? (
                <a
                  href={normalizeGitHubUrl(github)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#176B5B] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  {github.replace(/^https?:\/\/github\.com\//, '@')}
                </a>
              ) : (
                <span className="text-[#707974] italic">Not connected</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Settings Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Account Information */}
            <div>
              <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144] mb-4">
                Personal & Academic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Monika"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    Academic Status / Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Engineering Student"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    College / University
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. MIT / Stanford University"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    Course / Major
                  </label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="e.g. B.Tech Computer Science"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    Year of Study
                  </label>
                  <input
                    type="text"
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    placeholder="e.g. 3rd Year / Spring 2027"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  GitHub Profile URL
                </label>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => {
                    setGithub(e.target.value);
                    if (githubError) validateGithub(e.target.value);
                  }}
                  onBlur={(e) => validateGithub(e.target.value)}
                  placeholder="e.g. username or https://github.com/username"
                  className={`w-full h-11 bg-[#FAF9F4] border ${
                    githubError ? 'border-[#C62828]' : 'border-[#BEC9C4]'
                  } rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none`}
                />
                {githubError && (
                  <p className="text-[12px] text-[#C62828] mt-1 font-['Inter']">{githubError}</p>
                )}
              </div>
            </div>

            {/* Target Career Roles & Learning Preferences */}
            <div className="pt-6 border-t border-[#BEC9C4]/30">
              <h4 className="text-[16px] font-bold font-['Manrope'] text-[#005144] mb-1">
                Career Goals & Learning Preferences
              </h4>
              <p className="text-[13px] text-[#53615D] font-['Inter'] mb-4">
                Define your target positions and preferred study methodology.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    Target Career Roles
                  </label>
                  <input
                    type="text"
                    value={interestedRoles.join(', ')}
                    onChange={(e) => setInterestedRoles(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="e.g. Full-Stack Engineer, Machine Learning Engineer"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                  <span className="text-[11px] text-[#53615D] mt-1 block">Comma separated list of target engineering roles</span>
                </div>

                <div>
                  <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                    Learning Preferences & Onboarding Objective
                  </label>
                  <input
                    type="text"
                    value={learningPreferences}
                    onChange={(e) => setLearningPreferences(e.target.value)}
                    placeholder="e.g. Hands-on coding, interview prep, architecture"
                    className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                  <span className="text-[11px] text-[#53615D] mt-1 block">How you best absorb and retain concepts</span>
                </div>
              </div>
            </div>

            {/* Interested Tracks */}
            <div className="pt-6 border-t border-[#BEC9C4]/30">
              <h4 className="text-[16px] font-bold font-['Manrope'] text-[#005144] mb-1">
                Interested Technical Tracks
              </h4>
              <p className="text-[13px] text-[#53615D] font-['Inter'] mb-3">
                Select tracks to guide project discovery and recommendation algorithms.
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TRACKS.map((track) => {
                  const isSelected = selectedInterests.includes(track);
                  return (
                    <button
                      key={track}
                      type="button"
                      onClick={() => handleToggleTrack(track)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold font-['Inter'] transition-colors flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#005144] text-[#FAF9F4]'
                          : 'bg-[#FAF9F4] border border-[#BEC9C4] text-[#3F4945] hover:bg-[#D6E6E0]'
                      }`}
                    >
                      {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                      {track}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Skill Inventory Section */}
            <div className="pt-6 border-t border-[#BEC9C4]/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-[18px] font-bold font-['Manrope'] text-[#005144]">
                    Skill Inventory
                  </h4>
                  <p className="text-[13px] text-[#53615D] font-['Inter']">
                    Search and select skills you already have, or skills you want to learn.
                  </p>
                </div>

                {/* Add Mode Selector */}
                <div className="flex items-center gap-1 bg-[#FAF9F4] p-1 rounded-xl border border-[#BEC9C4]/60 self-start">
                  <button
                    type="button"
                    onClick={() => setSkillStatusMode('have')}
                    className={`px-3 py-1 rounded-lg text-[12px] font-bold font-['Inter'] transition-colors ${
                      skillStatusMode === 'have'
                        ? 'bg-[#005144] text-[#FAF9F4]'
                        : 'text-[#3F4945] hover:text-[#005144]'
                    }`}
                  >
                    Skills I Have
                  </button>
                  <button
                    type="button"
                    onClick={() => setSkillStatusMode('learning')}
                    className={`px-3 py-1 rounded-lg text-[12px] font-bold font-['Inter'] transition-colors ${
                      skillStatusMode === 'learning'
                        ? 'bg-[#176B5B] text-[#FAF9F4]'
                        : 'text-[#3F4945] hover:text-[#005144]'
                    }`}
                  >
                    Want to Learn
                  </button>
                </div>
              </div>

              {/* Search Bar & Custom Skill Toggle */}
              <div className="flex flex-col sm:flex-row gap-3 my-4">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#707974] text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Search standard technical skills..."
                    className="w-full h-10 pl-10 pr-4 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsOtherSelected(!isOtherSelected)}
                  className={`px-4 py-2 rounded-xl text-[13px] font-bold font-['Inter'] border flex items-center justify-center gap-1.5 transition-colors ${
                    isOtherSelected
                      ? 'bg-[#005144] text-[#FAF9F4] border-[#005144]'
                      : 'bg-[#FAF9F4] border-[#BEC9C4] text-[#005144] hover:bg-[#D6E6E0]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Other (Custom Skill)
                </button>
              </div>

              {/* Custom Skill Input Form when 'Other' selected */}
              {isOtherSelected && (
                <div className="p-4 bg-[#FAF9F4] rounded-xl border border-[#005144]/40 mb-4 space-y-3">
                  <div className="font-bold text-[13px] font-['Inter'] text-[#005144]">
                    Add Custom Skill
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        value={otherSkillName}
                        onChange={(e) => {
                          setOtherSkillName(e.target.value);
                          if (otherSkillError) setOtherSkillError(null);
                        }}
                        placeholder="Custom skill name..."
                        className="w-full h-10 bg-white border border-[#BEC9C4] rounded-lg px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005144]"
                      />
                    </div>

                    <div>
                      <select
                        value={otherSkillStatus}
                        onChange={(e) => setOtherSkillStatus(e.target.value as any)}
                        className="w-full h-10 bg-white border border-[#BEC9C4] rounded-lg px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005144]"
                      >
                        <option value="have">I already have this skill</option>
                        <option value="learning">I want to learn this skill</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={otherSkillLevel}
                        onChange={(e) => setOtherSkillLevel(e.target.value)}
                        className="w-full h-10 bg-white border border-[#BEC9C4] rounded-lg px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#005144]"
                      >
                        <option value="Strong">Proficiency: Strong</option>
                        <option value="Medium">Proficiency: Medium</option>
                        <option value="Low">Proficiency: Beginner / Low</option>
                      </select>
                    </div>
                  </div>

                  {otherSkillError && (
                    <p className="text-[12px] text-[#C62828] font-['Inter']">{otherSkillError}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOtherSelected(false)}
                      className="px-3 py-1.5 text-[12px] font-bold text-[#53615D] hover:underline"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomSkill}
                      className="px-4 py-1.5 bg-[#005144] text-[#FAF9F4] text-[12px] font-bold rounded-lg hover:bg-[#176B5B] transition-colors"
                    >
                      Add Custom Skill
                    </button>
                  </div>
                </div>
              )}

              {/* Popular Skills Pills */}
              <div className="mb-6">
                <div className="text-[12px] font-bold uppercase tracking-wider text-[#707974] mb-2 font-['Inter']">
                  Standard Skills Inventory (Click to add/remove as "{skillStatusMode === 'have' ? 'Skills I Have' : 'Want to Learn'}"):
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {filteredPopularSkills.map((skillName) => {
                    const isSelected = skills.some(s => s.name.toLowerCase() === skillName.toLowerCase());
                    const matchedSkill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
                    return (
                      <button
                        key={skillName}
                        type="button"
                        onClick={() => handleToggleStandardSkill(skillName)}
                        className={`px-3 py-1 rounded-lg text-[12px] font-medium font-['Inter'] transition-colors flex items-center gap-1 ${
                          isSelected
                            ? matchedSkill?.status === 'learning'
                              ? 'bg-[#FFF9C4] text-[#F57F17] border border-[#FFF59D] font-bold'
                              : 'bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7] font-bold'
                            : 'bg-[#FAF9F4] border border-[#BEC9C4]/50 text-[#3F4945] hover:bg-[#D6E6E0]'
                        }`}
                      >
                        {isSelected && (
                          <span className="material-symbols-outlined text-[14px]">
                            {matchedSkill?.status === 'learning' ? 'school' : 'check'}
                          </span>
                        )}
                        <span>{skillName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Skills Section */}
              <div className="space-y-4">
                <h5 className="text-[14px] font-bold font-['Manrope'] text-[#005144]">
                  Confirmed Skills in Your Profile ({skills.length})
                </h5>

                {skills.length === 0 ? (
                  <div className="p-6 bg-[#FAF9F4] rounded-xl border border-dashed border-[#BEC9C4] text-center">
                    <p className="text-[14px] text-[#3F4945] font-['Inter']">
                      No skills selected yet. Select technical skills above or add custom ones to receive genuine personalized recommendations and accurate skill gap analysis.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Skills I Have */}
                    <div className="space-y-2">
                      <div className="text-[12px] font-bold uppercase tracking-wider text-[#1B5E20] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Skills I Have ({skillsHave.length})
                      </div>
                      {skillsHave.length === 0 ? (
                        <p className="text-[12px] text-[#707974] italic">None selected</p>
                      ) : (
                        skillsHave.map(skill => (
                          <div
                            key={skill.name}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-[#FAF9F4] border border-[#A5D6A7] rounded-xl text-[13px] gap-2"
                          >
                            <div>
                              <span className="font-bold text-[#005144]">{skill.name}</span>
                              <span className="ml-2 text-[11px] text-[#53615D]">{skill.level}% proficiency</span>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <select
                                value={skill.level >= 80 ? '90' : skill.level >= 50 ? '60' : '30'}
                                onChange={(e) => handleUpdateSkillLevel(skill.name, parseInt(e.target.value, 10))}
                                className="text-[11px] bg-white border border-[#BEC9C4] rounded px-2 py-0.5 text-[#005144] font-semibold focus:outline-none focus:ring-1 focus:ring-[#005144]"
                                title="Change proficiency level"
                              >
                                <option value="90">Advanced (90%)</option>
                                <option value="60">Intermediate (60%)</option>
                                <option value="30">Beginner (30%)</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleToggleSkillStatus(skill.name)}
                                className="text-[11px] text-[#176B5B] hover:underline whitespace-nowrap"
                                title="Switch to 'Want to Learn'"
                              >
                                Move to Learning
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill.name)}
                                className="w-6 h-6 rounded-md text-[#C62828] hover:bg-[#FFEBEE] flex items-center justify-center font-bold text-[15px]"
                                title="Remove skill"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Skills I Want to Learn */}
                    <div className="space-y-2">
                      <div className="text-[12px] font-bold uppercase tracking-wider text-[#F57F17] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">school</span>
                        Skills I Want to Learn ({skillsLearning.length})
                      </div>
                      {skillsLearning.length === 0 ? (
                        <p className="text-[12px] text-[#707974] italic">None selected</p>
                      ) : (
                        skillsLearning.map(skill => (
                          <div
                            key={skill.name}
                            className="flex items-center justify-between p-2.5 bg-[#FAF9F4] border border-[#FFF59D] rounded-xl text-[13px]"
                          >
                            <div>
                              <span className="font-bold text-[#005144]">{skill.name}</span>
                              <span className="ml-2 text-[11px] text-[#F57F17] font-semibold">Learning Target</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleSkillStatus(skill.name)}
                                className="text-[11px] text-[#1B5E20] hover:underline"
                                title="Mark as 'Already Have'"
                              >
                                Mark as Mastered
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill.name)}
                                className="w-6 h-6 rounded-md text-[#C62828] hover:bg-[#FFEBEE] flex items-center justify-center"
                                title="Remove skill"
                              >
                                &times;
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error and Success Banners */}
            {saveError && (
              <div className="p-4 bg-[#FFEBEE] border border-[#EF9A9A] text-[#C62828] rounded-xl text-[13px] font-['Inter'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-4 bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] rounded-xl text-[13px] font-['Inter'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>All profile changes, skills inventory, and settings saved successfully!</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-4 flex items-center justify-end border-t border-[#BEC9C4]/30">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[14px] font-bold font-['Inter'] shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSaving && (
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                )}
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
