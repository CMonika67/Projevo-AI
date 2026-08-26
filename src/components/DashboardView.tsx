import React from 'react';
import { ProjectData, UserProfile, ScreenType } from '../types';

interface DashboardViewProps {
  profile: UserProfile;
  project: ProjectData;
  onNavigate: (screen: ScreenType) => void;
  onOpenIdeaAnalyzer: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  project,
  onNavigate,
  onOpenIdeaAnalyzer,
}) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section */}
      <section className="space-y-1.5">
        <h1 className="text-[26px] md:text-[44px] font-extrabold font-['Manrope'] text-[#005144] tracking-tight leading-tight">
          Ready to explore, {profile.name}?
        </h1>
        <p className="text-[16px] md:text-[18px] font-['Manrope'] text-[#3F4945] font-normal">
          Let's calmly focus on taking the next best step for your journey.
        </p>
      </section>

      {/* Stats Row Bento (4 Grid items) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Project Info */}
        <div
          onClick={() => onNavigate('adaptive-support')}
          className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/40 hover:-translate-y-0.5 hover:bento-shadow-hover transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span className="material-symbols-outlined text-[#53615D] text-[20px]">architecture</span>
            <h3 className="text-[12px] font-bold font-['Inter'] text-[#3F4945] uppercase tracking-wider">
              Current Project
            </h3>
          </div>
          <p className="text-[20px] font-bold font-['Manrope'] text-[#005144] mt-2 group-hover:text-[#176B5B] transition-colors line-clamp-1">
            {project.title}
          </p>
        </div>

        {/* Project Match */}
        <div
          onClick={() => onNavigate('discovery')}
          className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/40 flex flex-col justify-between hover:-translate-y-0.5 hover:bento-shadow-hover transition-all cursor-pointer"
        >
          <h3 className="text-[12px] font-bold font-['Inter'] text-[#3F4945] uppercase tracking-wider mb-2">
            Project Match
          </h3>
          <div className="flex items-end justify-between">
            <span className="text-[32px] font-bold font-['Manrope'] text-[#005144]">
              {project.matchScore}%
            </span>
            <span className="material-symbols-outlined text-[#176B5B] text-[26px] mb-1 font-bold">
              trending_up
            </span>
          </div>
        </div>

        {/* Project Health */}
        <div
          onClick={() => onNavigate('health-report')}
          className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/40 flex flex-col justify-between hover:-translate-y-0.5 hover:bento-shadow-hover transition-all cursor-pointer"
        >
          <h3 className="text-[12px] font-bold font-['Inter'] text-[#3F4945] uppercase tracking-wider mb-2">
            Project Health
          </h3>
          <div className="flex items-end gap-3 justify-between">
            <span className="text-[32px] font-bold font-['Manrope'] text-[#005144]">
              {project.healthScore}%
            </span>
            <div className="w-20 h-2.5 bg-[#D6E6E0] rounded-full mb-2.5 overflow-hidden">
              <div
                className="h-full bg-[#005144] rounded-full transition-all duration-700"
                style={{ width: `${project.healthScore}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Interview Readiness */}
        <div
          onClick={() => onNavigate('interview-prep')}
          className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/40 flex flex-col justify-between hover:-translate-y-0.5 hover:bento-shadow-hover transition-all cursor-pointer"
        >
          <h3 className="text-[12px] font-bold font-['Inter'] text-[#3F4945] uppercase tracking-wider mb-2">
            Interview Readiness
          </h3>
          <div className="flex items-end gap-3 justify-between">
            <span className="text-[32px] font-bold font-['Manrope'] text-[#005144]">
              {project.readinessScore}%
            </span>
            <div className="w-20 h-2.5 bg-[#EFEEE9] rounded-full mb-2.5 overflow-hidden">
              <div
                className="h-full bg-[#6F7975] rounded-full transition-all duration-700"
                style={{ width: `${project.readinessScore}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area Grid (2 Columns: Left Main, Right Alerts & Quick Actions) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Continue Project & Skill Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Project Card */}
          <div className="bg-[#FFFFFF] rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#A5F1DD]/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h2 className="text-[24px] font-bold font-['Manrope'] text-[#005144] mb-1">
                  Continue Your Project
                </h2>
                <p className="text-[16px] font-semibold text-[#53615D]">
                  {project.title}
                </p>
              </div>
              <span className="px-3 py-1 bg-[#D6E6E0] text-[#101E1B] text-[12px] font-semibold font-['Inter'] rounded-full">
                {project.status}
              </span>
            </div>

            <div className="mb-6 relative z-10">
              <div className="flex justify-between text-[13px] font-semibold font-['Inter'] text-[#3F4945] mb-2">
                <span>Current Stage: {project.stage}</span>
                <span>{project.stageProgress}%</span>
              </div>
              <div className="w-full h-3 bg-[#EFEEE9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#005144] to-[#176B5B] rounded-full transition-all duration-1000"
                  style={{ width: `${project.stageProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-end relative z-10">
              <button
                onClick={() => onNavigate('adaptive-support')}
                className="px-6 py-3 bg-[#005144] hover:bg-[#166A5A] text-white rounded-lg text-[13px] font-semibold font-['Inter'] transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
              >
                <span>Continue Project</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Skill Progress */}
          <div className="bg-[#FFFFFF] rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-bold font-['Manrope'] text-[#005144]">
                Skill Progress
              </h2>
              <button
                onClick={() => onNavigate('onboarding')}
                className="text-[12px] font-semibold text-[#176B5B] hover:underline"
              >
                Update Skills
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.skills.map((skill) => (
                <div key={skill.name} className="space-y-2">
                  <div className="flex justify-between text-[13px] font-semibold font-['Inter']">
                    <span className="text-[#1B1C19]">{skill.name}</span>
                    <span className="text-[#3F4945]">{skill.level}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#D6E6E0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#005144] rounded-full transition-all duration-700"
                      style={{ width: `${skill.level}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* Alerts Card */}
          <div className="bg-[#FFDAD3] text-[#3D0600] rounded-2xl p-6 bento-shadow border border-[#FFB4A4]">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-[#7C2E1D] text-[24px]">warning</span>
              <h2 className="text-[20px] font-bold font-['Manrope'] text-[#7C2E1D]">Alerts</h2>
            </div>
            <p className="text-[15px] font-['Manrope'] mb-6 text-[#9B4532] font-medium">
              {project.issuesCount} project issues need attention
            </p>
            <button
              onClick={() => onNavigate('health-report')}
              className="w-full py-2.5 bg-[#FFFFFF] text-[#7C2E1D] font-bold rounded-lg text-[13px] font-['Inter'] border border-[#7C2E1D] hover:bg-[#FFB4A4]/40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>Open Project Doctor</span>
              <span className="material-symbols-outlined text-[18px]">medical_services</span>
            </button>
          </div>

          {/* Quick Actions Bento */}
          <div className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/40">
            <h2 className="text-[20px] font-bold font-['Manrope'] text-[#005144] mb-4">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => onNavigate('discovery')}
                className="flex items-center gap-3 p-3 w-full text-left rounded-xl hover:bg-[#F5F4EF] transition-colors border border-transparent hover:border-[#BEC9C4]/40 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#D6E6E0] flex items-center justify-center text-[#005144] group-hover:bg-[#A5F1DD] transition-colors">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <span className="text-[14px] font-semibold font-['Inter'] text-[#1B1C19] group-hover:text-[#005144] transition-colors">
                  Find a Project
                </span>
              </button>

              <button
                onClick={onOpenIdeaAnalyzer}
                className="flex items-center gap-3 p-3 w-full text-left rounded-xl hover:bg-[#F5F4EF] transition-colors border border-transparent hover:border-[#BEC9C4]/40 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#D6E6E0] flex items-center justify-center text-[#005144] group-hover:bg-[#A5F1DD] transition-colors">
                  <span className="material-symbols-outlined text-[20px]">lightbulb</span>
                </div>
                <span className="text-[14px] font-semibold font-['Inter'] text-[#1B1C19] group-hover:text-[#005144] transition-colors">
                  Analyze My Idea
                </span>
              </button>

              <button
                onClick={() => onNavigate('health-report')}
                className="flex items-center gap-3 p-3 w-full text-left rounded-xl hover:bg-[#F5F4EF] transition-colors border border-transparent hover:border-[#BEC9C4]/40 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#D6E6E0] flex items-center justify-center text-[#005144] group-hover:bg-[#A5F1DD] transition-colors">
                  <span className="material-symbols-outlined text-[20px]">fact_check</span>
                </div>
                <span className="text-[14px] font-semibold font-['Inter'] text-[#1B1C19] group-hover:text-[#005144] transition-colors">
                  Check My Project
                </span>
              </button>

              <button
                onClick={() => onNavigate('doctor')}
                className="flex items-center gap-3 p-3 w-full text-left rounded-xl hover:bg-[#F5F4EF] transition-colors border border-transparent hover:border-[#BEC9C4]/40 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#D6E6E0] flex items-center justify-center text-[#005144] group-hover:bg-[#A5F1DD] transition-colors">
                  <span className="material-symbols-outlined text-[20px]">upgrade</span>
                </div>
                <span className="text-[14px] font-semibold font-['Inter'] text-[#1B1C19] group-hover:text-[#005144] transition-colors">
                  Improve My Project
                </span>
              </button>

              <button
                onClick={() => onNavigate('interview-prep')}
                className="flex items-center gap-3 p-3 w-full text-left rounded-xl hover:bg-[#F5F4EF] transition-colors border border-transparent hover:border-[#BEC9C4]/40 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#D6E6E0] flex items-center justify-center text-[#005144] group-hover:bg-[#A5F1DD] transition-colors">
                  <span className="material-symbols-outlined text-[20px]">school</span>
                </div>
                <span className="text-[14px] font-semibold font-['Inter'] text-[#1B1C19] group-hover:text-[#005144] transition-colors">
                  Get Interview Ready
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
