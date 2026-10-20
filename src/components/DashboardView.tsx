import React from 'react';
import { ProjectData, UserProfile, ScreenType } from '../types';

interface DashboardViewProps {
  profile: UserProfile;
  project: ProjectData | null;
  onNavigate: (screen: ScreenType) => void;
  onOpenIdeaAnalyzer: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  project,
  onNavigate,
  onOpenIdeaAnalyzer,
}) => {
  const hasProject = Boolean(project && project.title);

  // Compute Skill Alignment dynamically from project techStack and profile skills
  const userSkillMap = new Map<string, number>();
  (profile.skills || []).forEach(s => {
    if (s && s.name) {
      userSkillMap.set(s.name.toLowerCase().trim(), typeof s.level === 'number' ? s.level : 50);
    }
  });

  const projectSkills = project?.techStack || [];

  // 1. Aligned: declared and proficiency meets requirement (>= 70%)
  const alignedSkills = projectSkills.filter(skillName => {
    const lvl = userSkillMap.get(skillName.toLowerCase().trim());
    return lvl !== undefined && lvl >= 70;
  });

  // 2. Needs Improvement: declared, but proficiency is lower than required (< 70% and > 0)
  const needsImprovementSkills = projectSkills.filter(skillName => {
    const lvl = userSkillMap.get(skillName.toLowerCase().trim());
    return lvl !== undefined && lvl > 0 && lvl < 70;
  });

  // 3. Missing from Inventory: user has not declared the skill
  const missingSkills = projectSkills.filter(skillName => {
    return !userSkillMap.has(skillName.toLowerCase().trim());
  });

  // 4. Unverified: skill declared but level is 0 or unverified
  const unverifiedSkills = projectSkills.filter(skillName => {
    const lvl = userSkillMap.get(skillName.toLowerCase().trim());
    return lvl === 0;
  });

  // Derive learning priorities from gaps
  const prioritySkills = [...needsImprovementSkills, ...missingSkills].slice(0, 3);

  // Health analysis status
  const hasDoctorAnalysis = Boolean(project?.healthReport && project.healthReport.categories && project.healthReport.categories.length > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Section */}
      <section className="space-y-1.5">
        <h1 className="text-[26px] md:text-[44px] font-extrabold font-['Manrope'] text-[#005144] tracking-tight leading-tight">
          {hasProject ? `Welcome back, ${profile.name || 'Engineer'}` : `Ready to explore, ${profile.name || 'Engineer'}?`}
        </h1>
        <p className="text-[16px] md:text-[18px] font-['Manrope'] text-[#3F4945] font-normal">
          {hasProject
            ? "Track your active project status, skill alignment, health audit, and next learning priorities."
            : "Welcome to Projevo AI. Select or discover an engineering project to activate your dashboard."}
        </p>
      </section>

      {!hasProject ? (
        /* Empty Dashboard State */
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] rounded-2xl p-8 md:p-12 bento-shadow border border-[#BEC9C4]/40 text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-[#E0F2F1] text-[#005144] flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-[42px]">engineering</span>
            </div>
            <h2 className="text-[24px] md:text-[28px] font-bold font-['Manrope'] text-[#005144] mb-3">
              No Active Project Selected
            </h2>
            <p className="text-[15px] md:text-[16px] text-[#3F4945] font-['Inter'] max-w-xl mx-auto mb-8 leading-relaxed">
              Your personalized skill alignment, codebase diagnostics, and prioritized learning milestones will appear here as soon as you choose or start a project.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <div
                onClick={() => onNavigate('discovery')}
                className="p-5 rounded-2xl bg-[#FAF9F4] border border-[#BEC9C4]/60 hover:border-[#005144] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#D6E6E0] text-[#005144] flex items-center justify-center mb-3 group-hover:bg-[#005144] group-hover:text-[#FAF9F4] transition-colors">
                    <span className="material-symbols-outlined text-[22px]">explore</span>
                  </div>
                  <h3 className="font-bold font-['Manrope'] text-[16px] text-[#005144] mb-1">
                    Project Discovery
                  </h3>
                  <p className="text-[13px] text-[#53615D] font-['Inter']">
                    Browse curated engineering projects across 17 domains and 3 difficulty tiers.
                  </p>
                </div>
                <span className="mt-4 text-[13px] font-bold text-[#176B5B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore catalog &rarr;
                </span>
              </div>

              <div
                onClick={onOpenIdeaAnalyzer}
                className="p-5 rounded-2xl bg-[#FAF9F4] border border-[#BEC9C4]/60 hover:border-[#005144] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#D6E6E0] text-[#005144] flex items-center justify-center mb-3 group-hover:bg-[#005144] group-hover:text-[#FAF9F4] transition-colors">
                    <span className="material-symbols-outlined text-[22px]">lightbulb</span>
                  </div>
                  <h3 className="font-bold font-['Manrope'] text-[16px] text-[#005144] mb-1">
                    Analyze My Idea
                  </h3>
                  <p className="text-[13px] text-[#53615D] font-['Inter']">
                    Pitch your own custom concept and get a structured engineering blueprint.
                  </p>
                </div>
                <span className="mt-4 text-[13px] font-bold text-[#176B5B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Validate idea &rarr;
                </span>
              </div>

              <div
                onClick={() => onNavigate('doctor')}
                className="p-5 rounded-2xl bg-[#FAF9F4] border border-[#BEC9C4]/60 hover:border-[#005144] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#D6E6E0] text-[#005144] flex items-center justify-center mb-3 group-hover:bg-[#005144] group-hover:text-[#FAF9F4] transition-colors">
                    <span className="material-symbols-outlined text-[22px]">medical_services</span>
                  </div>
                  <h3 className="font-bold font-['Manrope'] text-[16px] text-[#005144] mb-1">
                    Project Doctor
                  </h3>
                  <p className="text-[13px] text-[#53615D] font-['Inter']">
                    Upload an existing codebase or ZIP archive for line-by-line verification.
                  </p>
                </div>
                <span className="mt-4 text-[13px] font-bold text-[#176B5B] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Upload code &rarr;
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Populated Dashboard with 4 Explicit Sections */
        <div className="space-y-8">
          {/* Section A: Current Project */}
          <section className="bg-[#FFFFFF] rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-[#D6E6E0] text-[#005144] text-[11px] font-bold font-['Inter'] rounded-full uppercase tracking-wider">
                    {project.domain || 'Engineering Project'}
                  </span>
                  {project.difficulty && (
                    <span className="px-2.5 py-0.5 bg-[#FAF9F4] border border-[#BEC9C4] text-[#3F4945] text-[11px] font-bold font-['Inter'] rounded-md">
                      {project.difficulty}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7] text-[11px] font-bold font-['Inter'] rounded-md">
                    {project.status || 'In Progress'}
                  </span>
                </div>
                <h2 className="text-[24px] md:text-[28px] font-bold font-['Manrope'] text-[#005144]">
                  {project.title}
                </h2>
                <p className="text-[14px] md:text-[15px] text-[#3F4945] font-['Inter'] mt-1 max-w-3xl leading-relaxed">
                  {project.description || project.tagline || 'Active student engineering project.'}
                </p>
              </div>

              <button
                onClick={() => onNavigate('discovery')}
                className="self-start px-3.5 py-1.5 bg-[#FAF9F4] hover:bg-[#D6E6E0] border border-[#BEC9C4] text-[#005144] text-[12px] font-bold font-['Inter'] rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                Change Project
              </button>
            </div>

            {/* Technologies */}
            <div className="mb-6">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#707974] font-['Inter'] block mb-2">
                Project Tech Stack & Tools:
              </span>
              <div className="flex flex-wrap gap-2">
                {projectSkills.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 bg-[#FAF9F4] border border-[#BEC9C4]/60 rounded-lg text-[12px] font-semibold font-['Inter'] text-[#1B1C19]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress & Current Stage */}
            <div className="p-4 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/40">
              <div className="flex justify-between items-center text-[13px] font-semibold font-['Inter'] text-[#3F4945] mb-2">
                <span>Current Stage: <strong className="text-[#005144]">{project.stage || 'Architecture & Scaffolding'}</strong></span>
                <span>{project.stageProgress || 25}% genuine progress</span>
              </div>
              <div className="w-full h-3 bg-[#EFEEE9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#005144] to-[#176B5B] rounded-full transition-all duration-700"
                  style={{ width: `${project.stageProgress || 25}%` }}
                ></div>
              </div>
            </div>
          </section>

          {/* Grid Layout: Section B & Section C */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section B: Project Skill Alignment */}
            <section className="bg-[#FFFFFF] rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#005144] text-[24px]">verified</span>
                    <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144]">
                      Project Skill Alignment
                    </h3>
                  </div>
                  <button
                    onClick={() => onNavigate('skill-gap')}
                    className="text-[12px] font-bold font-['Inter'] text-[#176B5B] hover:underline"
                  >
                    Full Analysis &rarr;
                  </button>
                </div>
                <p className="text-[13px] text-[#53615D] font-['Inter'] mb-5">
                  Comparison between the skills required by <strong>{project.title}</strong> and your verified inventory.
                </p>

                {/* 4 Skill Categories */}
                <div className="space-y-3">
                  {/* 1. Aligned */}
                  <div className="p-3 bg-[#E8F5E9]/50 border border-[#A5D6A7] rounded-xl">
                    <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-[#1B5E20] mb-1.5 font-['Inter']">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Skills You Already Have ({alignedSkills.length})
                      </span>
                      <span className="text-[11px] font-semibold lowercase">meets required proficiency</span>
                    </div>
                    {alignedSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {alignedSkills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 bg-white text-[#1B5E20] border border-[#A5D6A7] rounded-md text-[12px] font-semibold">
                            {s} ({userSkillMap.get(s.toLowerCase().trim()) || 70}%)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#707974] italic">None of the project's required technologies have reached strong proficiency yet.</p>
                    )}
                  </div>

                  {/* 2. Needs Improvement */}
                  <div className="p-3 bg-[#FFFDE7]/60 border border-[#FFF59D] rounded-xl">
                    <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-[#F57F17] mb-1.5 font-['Inter']">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">trending_up</span>
                        Needs Proficiency Improvement ({needsImprovementSkills.length})
                      </span>
                      <span className="text-[11px] font-semibold lowercase">reported level lower than required</span>
                    </div>
                    {needsImprovementSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {needsImprovementSkills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 bg-white text-[#F57F17] border border-[#FFE082] rounded-md text-[12px] font-semibold">
                            {s} ({userSkillMap.get(s.toLowerCase().trim()) || 30}% &rarr; 80%)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#707974] italic">No partially proficient skills need progression for this stack.</p>
                    )}
                  </div>

                  {/* 3. Missing from Inventory */}
                  <div className="p-3 bg-[#FFEBEE]/50 border border-[#FFCDD2] rounded-xl">
                    <div className="flex items-center justify-between text-[12px] font-bold uppercase tracking-wider text-[#C62828] mb-1.5 font-['Inter']">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">help_outline</span>
                        Missing from Inventory ({missingSkills.length})
                      </span>
                      <span className="text-[11px] font-semibold lowercase">not declared in profile</span>
                    </div>
                    {missingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {missingSkills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 bg-white text-[#C62828] border border-[#FFCDD2] rounded-md text-[12px] font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#707974] italic">All required project technologies are declared in your profile.</p>
                    )}
                  </div>

                  {/* 4. Unverified */}
                  {unverifiedSkills.length > 0 && (
                    <div className="p-3 bg-[#F5F5F5] border border-[#E0E0E0] rounded-xl">
                      <div className="text-[12px] font-bold uppercase tracking-wider text-[#616161] mb-1 font-['Inter'] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">pending</span>
                        Unverified Proficiency ({unverifiedSkills.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {unverifiedSkills.map(s => (
                          <span key={s} className="px-2.5 py-0.5 bg-white text-[#616161] border border-[#E0E0E0] rounded-md text-[12px] font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#BEC9C4]/30 flex justify-end">
                <button
                  onClick={() => onNavigate('skill-gap')}
                  className="px-4 py-2 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[12px] font-bold font-['Inter'] transition-colors flex items-center gap-1.5"
                >
                  <span>Open Detailed Skill Gap Analysis</span>
                  <span className="material-symbols-outlined text-[16px]">insights</span>
                </button>
              </div>
            </section>

            {/* Section C: Project Health */}
            <section className="bg-[#FFFFFF] rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#005144] text-[24px]">medical_services</span>
                    <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144]">
                      Project Health
                    </h3>
                  </div>
                  {hasDoctorAnalysis && (
                    <button
                      onClick={() => onNavigate('health-report')}
                      className="text-[12px] font-bold font-['Inter'] text-[#176B5B] hover:underline"
                    >
                      View Report &rarr;
                    </button>
                  )}
                </div>

                {!hasDoctorAnalysis ? (
                  /* Explicit Pending State */
                  <div className="p-6 bg-[#FAF9F4] rounded-xl border border-dashed border-[#BEC9C4] text-center my-auto">
                    <div className="w-12 h-12 rounded-full bg-[#E0F2F1] text-[#005144] flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-[26px]">hourglass_empty</span>
                    </div>
                    <h4 className="font-bold font-['Manrope'] text-[16px] text-[#005144] mb-1">
                      Codebase Analysis Pending
                    </h4>
                    <p className="text-[13px] text-[#53615D] font-['Inter'] max-w-md mx-auto mb-5 leading-relaxed">
                      Project Doctor has not inspected your codebase yet. Upload your source files or project ZIP archive to perform verifiable AST, security vulnerability, and code quality audits.
                    </p>
                    <button
                      onClick={() => onNavigate('doctor')}
                      className="px-4 py-2 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[13px] font-bold font-['Inter'] transition-colors inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">upload_file</span>
                      Run Project Doctor
                    </button>
                  </div>
                ) : (
                  /* Confirmed Health Audit Results */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/40">
                      <div>
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#707974] font-['Inter'] block">
                          Verified Health Score
                        </span>
                        <span className="text-[32px] font-bold font-['Manrope'] text-[#005144]">
                          {project.healthReport?.overallHealth || project.healthScore || 80}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#707974] font-['Inter'] block">
                          Confirmed Issues
                        </span>
                        <span className="text-[20px] font-bold font-['Manrope'] text-[#C62828]">
                          {project.healthReport?.criticalIssues?.length || project.issuesCount || 0} defects detected
                        </span>
                      </div>
                    </div>

                    {/* Breakdown categories */}
                    {project.healthReport?.categories && (
                      <div className="grid grid-cols-2 gap-2">
                        {project.healthReport.categories.slice(0, 4).map((cat: any) => (
                          <div key={cat.name} className="p-2.5 bg-[#FAF9F4] rounded-lg border border-[#BEC9C4]/40 flex items-center justify-between text-[12px]">
                            <span className="font-semibold text-[#1B1C19]">{cat.name}</span>
                            <span className={`font-bold ${cat.score >= 80 ? 'text-[#1B5E20]' : cat.score >= 60 ? 'text-[#F57F17]' : 'text-[#C62828]'}`}>
                              {cat.score}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {project.healthReport?.criticalIssues && project.healthReport.criticalIssues.length > 0 && (
                      <div className="p-3 bg-[#FFEBEE]/60 border border-[#FFCDD2] rounded-xl text-[12px]">
                        <strong className="text-[#C62828] block mb-1">Top Critical Recommendation:</strong>
                        <p className="text-[#3F4945] font-['Inter']">
                          {project.healthReport.criticalIssues[0].recommendation || project.healthReport.criticalIssues[0].title}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {hasDoctorAnalysis && (
                <div className="mt-5 pt-4 border-t border-[#BEC9C4]/30 flex justify-end">
                  <button
                    onClick={() => onNavigate('health-report')}
                    className="px-4 py-2 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[12px] font-bold font-['Inter'] transition-colors flex items-center gap-1.5"
                  >
                    <span>View Full Health Report & Patches</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Section D: Learning Priorities */}
          <section className="bg-[#FFFFFF] rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#005144] text-[24px]">flag</span>
                  <span>Learning Priorities</span>
                </h3>
                <p className="text-[13px] text-[#53615D] font-['Inter'] mt-0.5">
                  Top skills to improve first for <strong>{project.title}</strong>, with practical milestones.
                </p>
              </div>

              <button
                onClick={() => onNavigate('skill-gap')}
                className="text-[12px] font-bold font-['Inter'] text-[#176B5B] hover:underline whitespace-nowrap self-start sm:self-auto"
              >
                View Complete Roadmap &rarr;
              </button>
            </div>

            {prioritySkills.length === 0 ? (
              <div className="p-6 bg-[#FAF9F4] rounded-xl border border-dashed border-[#BEC9C4] text-center">
                <p className="text-[14px] text-[#1B5E20] font-bold font-['Inter']">
                  Congratulations! You meet all required proficiencies for this project stack.
                </p>
                <p className="text-[12px] text-[#53615D] mt-1 font-['Inter']">
                  You can now focus on architecture refinements, automated test coverage, or prepare for technical interviews.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {prioritySkills.map((skill, index) => {
                  const isMissing = missingSkills.includes(skill);
                  return (
                    <div
                      key={skill}
                      className="p-4 bg-[#FAF9F4] border border-[#BEC9C4]/50 rounded-xl flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 bg-[#005144] text-[#FAF9F4] text-[11px] font-bold font-['Inter'] rounded">
                            Priority #{index + 1}
                          </span>
                          <span className={`text-[11px] font-bold uppercase ${isMissing ? 'text-[#C62828]' : 'text-[#F57F17]'}`}>
                            {isMissing ? 'Missing' : 'Enhance'}
                          </span>
                        </div>
                        <h4 className="text-[16px] font-bold font-['Manrope'] text-[#005144]">
                          {skill}
                        </h4>
                        <p className="text-[12px] text-[#3F4945] font-['Inter'] mt-1.5 leading-relaxed">
                          <strong>Why it matters:</strong> Core framework/dependency required to implement {project.title} safely.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#BEC9C4]/30 space-y-1.5 text-[12px]">
                        <div>
                          <span className="font-bold text-[#1B1C19] block">Recommended Step:</span>
                          <span className="text-[#53615D]">Build a modular prototype handling edge cases with unit tests.</span>
                        </div>
                        <div>
                          <span className="font-bold text-[#1B1C19] block">Milestone:</span>
                          <span className="text-[#176B5B] font-medium">Verify end-to-end integration test pass.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
