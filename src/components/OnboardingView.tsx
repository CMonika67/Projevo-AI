import React, { useState } from 'react';
import { ScreenType, UserProfile } from '../types';

interface OnboardingViewProps {
  profile: UserProfile;
  onUpdateInterests: (interests: string[]) => void;
  onComplete: () => void;
  onNavigate: (screen: ScreenType) => void;
}

interface OptionItem {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  profile,
  onUpdateInterests,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Interested Roles (No default pre-selection)
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    profile.interestedRoles || []
  );

  // Step 2: Interested Fields (No default pre-selection unless previously selected)
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    profile.selectedInterests || []
  );

  // Step 3: Primary Milestone
  const [selectedMilestone, setSelectedMilestone] = useState<string>(
    profile.primaryMilestone || ''
  );

  const roleOptions: OptionItem[] = [
    { id: 'fullstack', name: 'Full-Stack Software Engineer', icon: 'code', description: 'Web applications, APIs, databases, UI/UX' },
    { id: 'aiml', name: 'AI / Machine Learning Engineer', icon: 'psychology', description: 'Model training, fine-tuning, pipelines, LLMs' },
    { id: 'data', name: 'Data Scientist / Analyst', icon: 'analytics', description: 'Data pipelines, analytics, statistical inference' },
    { id: 'devops', name: 'Cloud & DevOps Engineer', icon: 'cloud', description: 'Infrastructure as Code, CI/CD, Kubernetes' },
    { id: 'security', name: 'Cybersecurity Engineer', icon: 'security', description: 'Penetration testing, network security, auth' },
    { id: 'mobile', name: 'Mobile App Developer', icon: 'smartphone', description: 'iOS, Android, React Native, cross-platform' },
    { id: 'backend', name: 'Backend Systems Engineer', icon: 'terminal', description: 'Distributed systems, high concurrency, microservices' },
    { id: 'embedded', name: 'Embedded & IoT Engineer', icon: 'memory', description: 'Microcontrollers, firmware, edge sensor processing' },
  ];

  const interestOptions: OptionItem[] = [
    { id: 'ai-ml', name: 'AI / ML', icon: 'psychology' },
    { id: 'data-science', name: 'Data Science', icon: 'data_exploration' },
    { id: 'web-dev', name: 'Web Development', icon: 'language' },
    { id: 'cybersecurity', name: 'Cybersecurity', icon: 'security' },
    { id: 'cloud', name: 'Cloud', icon: 'cloud' },
    { id: 'iot', name: 'IoT', icon: 'router' },
    { id: 'healthcare', name: 'Healthcare', icon: 'medical_services' },
    { id: 'finance', name: 'Finance', icon: 'payments' },
    { id: 'mobile-dev', name: 'Mobile Development', icon: 'smartphone' },
  ];

  const milestoneOptions = [
    {
      id: 'capstone',
      title: 'Capstone & Portfolio',
      description: 'Build a production-grade engineering project ready for recruiters & technical demos.',
      icon: 'rocket_launch'
    },
    {
      id: 'coursework',
      title: 'Coursework & Skill Competency',
      description: 'Debug class projects, bridge engineering skill gaps, and master core architectures.',
      icon: 'school'
    },
    {
      id: 'interview',
      title: 'Job Interview Defense',
      description: 'Practice mock technical project defense and explain system decisions with confidence.',
      icon: 'work'
    }
  ];

  const toggleRole = (name: string) => {
    if (selectedRoles.includes(name)) {
      setSelectedRoles(selectedRoles.filter(r => r !== name));
    } else {
      setSelectedRoles([...selectedRoles, name]);
    }
  };

  const toggleTopic = (name: string) => {
    if (selectedTopics.includes(name)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== name));
    } else {
      setSelectedTopics([...selectedTopics, name]);
    }
  };

  const persistOnboardingProfile = async (roles: string[], fields: string[], milestone: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/profile', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          interestedRoles: roles,
          selectedInterests: fields,
          primaryMilestone: milestone
        })
      });
    } catch (e) {
      console.error('Failed to save onboarding preferences:', e);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      persistOnboardingProfile(selectedRoles, selectedTopics, selectedMilestone);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      onUpdateInterests(selectedTopics);
      persistOnboardingProfile(selectedRoles, selectedTopics, selectedMilestone);
      setCurrentStep(3);
    } else {
      persistOnboardingProfile(selectedRoles, selectedTopics, selectedMilestone);
      onComplete();
    }
  };

  return (
    <div className="bg-[#FAF9F4] text-[#1B1C19] min-h-[85vh] flex flex-col items-center justify-center p-4 md:p-12 max-w-4xl mx-auto animate-fadeIn">
      {/* Header & Progress Indicator */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[12px] font-bold font-['Inter'] text-[#6F7975] uppercase tracking-wider">
            Step {currentStep} of 3
          </span>
          <div className="flex gap-2">
            <div
              className={`h-2 w-9 rounded-full transition-colors ${
                currentStep >= 1 ? 'bg-[#005144]' : 'bg-[#E9E8E3]'
              }`}
            ></div>
            <div
              className={`h-2 w-9 rounded-full transition-colors ${
                currentStep >= 2 ? 'bg-[#005144]' : 'bg-[#E9E8E3]'
              }`}
            ></div>
            <div
              className={`h-2 w-9 rounded-full transition-colors ${
                currentStep === 3 ? 'bg-[#005144]' : 'bg-[#E9E8E3]'
              }`}
            ></div>
          </div>
        </div>

        {currentStep === 1 ? (
          <>
            <h1 className="text-[28px] md:text-[36px] font-extrabold font-['Manrope'] text-[#005144] tracking-tight">
              What engineering roles are you targeting?
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#3F4945] font-['Manrope'] mt-2">
              Select one or more target career pathways to tailor your project roadmap.
            </p>
          </>
        ) : currentStep === 2 ? (
          <>
            <h1 className="text-[28px] md:text-[36px] font-extrabold font-['Manrope'] text-[#005144] tracking-tight">
              What are you interested in?
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#3F4945] font-['Manrope'] mt-2">
              Select technical fields and domains to personalize project discovery.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[28px] md:text-[36px] font-extrabold font-['Manrope'] text-[#005144] tracking-tight">
              What is your primary milestone?
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#3F4945] font-['Manrope'] mt-2">
              Tell Projevo AI how to calibrate your project recommendations &amp; interview defense.
            </p>
          </>
        )}
      </div>

      {/* Step 1: Interested Roles */}
      {currentStep === 1 && (
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {roleOptions.map((role) => {
            const isSelected = selectedRoles.includes(role.name);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => toggleRole(role.name)}
                className={`flex flex-col items-start p-5 rounded-2xl transition-all duration-200 text-left w-full h-40 justify-between group cursor-pointer ${
                  isSelected
                    ? 'bg-[#D6E6E0] border-2 border-[#005144] shadow-sm scale-[1.02]'
                    : 'bg-[#FFFFFF] border border-[#BEC9C4]/60 hover:border-[#6F7975] hover:shadow-md'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[30px] transition-colors ${
                    isSelected ? 'text-[#005144]' : 'text-[#6F7975] group-hover:text-[#005144]'
                  }`}
                >
                  {role.icon}
                </span>
                <div>
                  <span
                    className={`text-[15px] font-bold font-['Manrope'] block leading-tight ${
                      isSelected ? 'text-[#005144]' : 'text-[#1B1C19]'
                    }`}
                  >
                    {role.name}
                  </span>
                  <span className="text-[11px] text-[#53615D] mt-1 line-clamp-2 font-['Inter']">
                    {role.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2: Interested Fields */}
      {currentStep === 2 && (
        <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {interestOptions.map((topic) => {
            const isSelected = selectedTopics.includes(topic.name);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.name)}
                className={`flex flex-col items-start p-6 rounded-2xl transition-all duration-200 text-left w-full h-34 justify-between group cursor-pointer ${
                  isSelected
                    ? 'bg-[#D6E6E0] border-2 border-[#53615D] shadow-sm scale-[1.02]'
                    : 'bg-[#FFFFFF] border border-[#BEC9C4]/60 hover:border-[#6F7975] hover:shadow-md'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[30px] transition-colors ${
                    isSelected ? 'text-[#005144]' : 'text-[#6F7975] group-hover:text-[#005144]'
                  }`}
                >
                  {topic.icon}
                </span>
                <span
                  className={`text-[17px] font-bold font-['Manrope'] ${
                    isSelected ? 'text-[#101E1B]' : 'text-[#1B1C19]'
                  }`}
                >
                  {topic.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 3: Primary Milestone */}
      {currentStep === 3 && (
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {milestoneOptions.map((m) => {
            const isSelected = selectedMilestone === m.title;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMilestone(m.title)}
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[#005144] shadow-md ring-2 ring-[#005144]/10'
                    : 'bg-[#FFFFFF] border-[#BEC9C4]/60 hover:border-[#005144]'
                }`}
              >
                <span className={`material-symbols-outlined text-[32px] mb-3 ${
                  isSelected ? 'text-[#005144]' : 'text-[#53615D]'
                }`}>
                  {m.icon}
                </span>
                <h3 className={`text-[18px] font-bold font-['Manrope'] mb-1 ${
                  isSelected ? 'text-[#005144]' : 'text-[#1B1C19]'
                }`}>
                  {m.title}
                </h3>
                <p className="text-[13px] text-[#3F4945] font-['Inter']">
                  {m.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Navigation */}
      <div className="w-full flex justify-between items-center mt-auto border-t border-[#BEC9C4]/40 pt-8">
        <button
          onClick={() => {
            if (currentStep === 3) setCurrentStep(2);
            else if (currentStep === 2) setCurrentStep(1);
            else onComplete();
          }}
          className="text-[14px] font-bold font-['Inter'] text-[#3F4945] hover:text-[#005144] transition-colors px-4 py-2 cursor-pointer"
        >
          {currentStep > 1 ? 'Back' : 'Skip for now'}
        </button>

        <button
          onClick={handleNext}
          className="bg-[#005144] hover:bg-[#166A5A] text-white px-8 py-3 rounded-full text-[14px] font-bold font-['Inter'] transition-colors shadow-sm cursor-pointer"
        >
          {currentStep < 3 ? 'Next' : 'Enter Workspace'}
        </button>
      </div>
    </div>
  );
};
