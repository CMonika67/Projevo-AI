import React, { useState } from 'react';
import { ScreenType, UserProfile } from '../types';

interface OnboardingViewProps {
  profile: UserProfile;
  onUpdateInterests: (interests: string[]) => void;
  onComplete: () => void;
  onNavigate: (screen: ScreenType) => void;
}

interface InterestOption {
  id: string;
  name: string;
  icon: string;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  profile,
  onUpdateInterests,
  onComplete,
  onNavigate,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    profile.selectedInterests && profile.selectedInterests.length > 0
      ? profile.selectedInterests
      : ['AI / ML', 'Healthcare']
  );

  const interestOptions: InterestOption[] = [
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

  const toggleTopic = (name: string) => {
    if (selectedTopics.includes(name)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== name));
    } else {
      setSelectedTopics([...selectedTopics, name]);
    }
  };

  const handleNext = () => {
    onUpdateInterests(selectedTopics);
    if (currentStep === 2) {
      setCurrentStep(3);
    } else {
      onComplete();
    }
  };

  return (
    <div className="bg-[#FAF9F4] text-[#1B1C19] min-h-[85vh] flex flex-col items-center justify-center p-4 md:p-12 max-w-4xl mx-auto animate-fadeIn">
      {/* Header & Progress Indicator (Matching Image 9) */}
      <div className="w-full mb-10">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[12px] font-bold font-['Inter'] text-[#6F7975] uppercase tracking-wider">
            Step {currentStep} of 3
          </span>
          <div className="flex gap-2">
            <div
              className={`h-2 w-9 rounded-full transition-colors ${
                currentStep >= 1 ? 'bg-[#A5F1DD]' : 'bg-[#E9E8E3]'
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

        {currentStep === 2 ? (
          <>
            <h1 className="text-[28px] md:text-[36px] font-extrabold font-['Manrope'] text-[#005144] tracking-tight">
              What are you interested in?
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#3F4945] font-['Manrope'] mt-2">
              Select topics to personalize your experience.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[28px] md:text-[36px] font-extrabold font-['Manrope'] text-[#005144] tracking-tight">
              What is your primary milestone?
            </h1>
            <p className="text-[16px] md:text-[18px] text-[#3F4945] font-['Manrope'] mt-2">
              Tell Projevo AI how to calibrate your project diagnostics & interview prep.
            </p>
          </>
        )}
      </div>

      {/* Step 2: Interactive Grid of Interests */}
      {currentStep === 2 ? (
        <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
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
                    isSelected
                      ? 'text-[#005144] filled'
                      : 'text-[#6F7975] group-hover:text-[#005144]'
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
      ) : (
        /* Step 3: Milestones & Calibration */
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div
            onClick={onComplete}
            className="p-6 bg-white rounded-2xl border-2 border-[#005144] shadow-sm cursor-pointer hover:-translate-y-1 transition-all"
          >
            <span className="material-symbols-outlined text-[32px] text-[#005144] mb-3 filled">
              rocket_launch
            </span>
            <h3 className="text-[18px] font-bold font-['Manrope'] text-[#005144] mb-1">
              Capstone & Portfolio
            </h3>
            <p className="text-[13px] text-[#3F4945]">
              Build a production-grade project ready for recruiters & technical demos.
            </p>
          </div>

          <div
            onClick={onComplete}
            className="p-6 bg-white rounded-2xl border border-[#BEC9C4]/60 shadow-xs cursor-pointer hover:border-[#005144] hover:-translate-y-1 transition-all"
          >
            <span className="material-symbols-outlined text-[32px] text-[#53615D] mb-3">
              school
            </span>
            <h3 className="text-[18px] font-bold font-['Manrope'] text-[#1B1C19] mb-1">
              Coursework & Exams
            </h3>
            <p className="text-[13px] text-[#3F4945]">
              Debug class assignments, conquer skill gaps, and master core algorithms.
            </p>
          </div>

          <div
            onClick={onComplete}
            className="p-6 bg-white rounded-2xl border border-[#BEC9C4]/60 shadow-xs cursor-pointer hover:border-[#005144] hover:-translate-y-1 transition-all"
          >
            <span className="material-symbols-outlined text-[32px] text-[#53615D] mb-3">
              work
            </span>
            <h3 className="text-[18px] font-bold font-['Manrope'] text-[#1B1C19] mb-1">
              Job Interview Prep
            </h3>
            <p className="text-[13px] text-[#3F4945]">
              Practice mock defense questions and explain architecture with confidence.
            </p>
          </div>
        </div>
      )}

      {/* Footer Actions (Matching Image 9) */}
      <div className="w-full flex justify-between items-center mt-auto border-t border-[#BEC9C4]/40 pt-8">
        <button
          onClick={() => {
            if (currentStep === 3) setCurrentStep(2);
            else onComplete();
          }}
          className="text-[14px] font-bold font-['Inter'] text-[#3F4945] hover:text-[#005144] transition-colors px-4 py-2 cursor-pointer"
        >
          {currentStep === 3 ? 'Back' : 'Skip for now'}
        </button>

        <button
          onClick={handleNext}
          className="bg-[#005144] hover:bg-[#166A5A] text-white px-8 py-3 rounded-full text-[14px] font-bold font-['Inter'] transition-colors shadow-sm cursor-pointer"
        >
          {currentStep === 2 ? 'Next' : 'Enter Workspace'}
        </button>
      </div>
    </div>
  );
};
