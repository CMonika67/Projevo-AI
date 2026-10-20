import React, { useState, useEffect } from 'react';
import { ProjectData, UserProfile, ScreenType } from '../types';
import { ALL_DOMAINS, COMPREHENSIVE_PROJECT_CATALOG, ProjectCatalogItem } from '../projectCatalog';

interface SkillGapAnalysisViewProps {
  project: ProjectData | null;
  profile: UserProfile;
  onNavigate: (screen: ScreenType) => void;
  onUpdateProfile?: (updated: UserProfile) => void;
  onSelectProject?: (projectData: Partial<ProjectData>) => void;
}

const COMMON_ROLES = [
  'Full-Stack Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Machine Learning Engineer',
  'DevOps & Cloud Engineer',
  'Cybersecurity Analyst',
  'Data Engineer',
  'Mobile App Developer',
  'Healthcare Technology Engineer',
  'Embedded Systems Engineer'
];

export const SkillGapAnalysisView: React.FC<SkillGapAnalysisViewProps> = ({
  project,
  profile,
  onNavigate,
  onSelectProject,
}) => {
  const [analysisMode, setAnalysisMode] = useState<'project' | 'role'>(project ? 'project' : 'role');
  const [targetRole, setTargetRole] = useState<string>(
    (profile as any).targetRole || 'Full-Stack Engineer'
  );
  const [customRole, setCustomRole] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>(
    project?.domain || (profile.selectedInterests?.[0] || 'Web Development and Full-Stack Applications')
  );
  const [jobDescription, setJobDescription] = useState<string>('');
  const [showJdInput, setShowJdInput] = useState<boolean>(false);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [completedMilestones, setCompletedMilestones] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'comparison' | 'roadmap'>('comparison');
  const [filterCategory, setFilterCategory] = useState<'all' | 'have' | 'needs-improvement' | 'missing' | 'optional'>('all');

  const fetchGapAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const effectiveRole = targetRole === 'Other' && customRole.trim() ? customRole.trim() : targetRole;

      const res = await fetch('/api/skills/gap', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          project: analysisMode === 'project' ? project : null,
          targetRole: analysisMode === 'project' ? (project?.title || effectiveRole) : effectiveRole,
          domain: selectedDomain,
          jobDescription: jobDescription.trim() || undefined,
          userSkills: profile.skills || []
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate skill gap analysis.');
      }

      const result = await res.json();
      setData(result);

      // Initialize milestone completion state
      const initialCompleted: Record<string, boolean> = {};
      if (result.roadmap && Array.isArray(result.roadmap)) {
        result.roadmap.forEach((step: any, idx: number) => {
          initialCompleted[`${step.skillName}-${idx}`] = Boolean(step.completed);
        });
      }
      setCompletedMilestones(initialCompleted);
    } catch (err: any) {
      setError(err.message || 'Error loading skill gap analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGapAnalysis();
  }, [project?.id, analysisMode, targetRole, selectedDomain, profile.skills]);

  const handleToggleMilestone = async (skillName: string, idx: number, milestoneText: string) => {
    const key = `${skillName}-${idx}`;
    const newStatus = !completedMilestones[key];
    setCompletedMilestones(prev => ({ ...prev, [key]: newStatus }));

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/skills/gap/milestone', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          projectId: project?.id || 'role_benchmark',
          skill: skillName,
          milestoneId: milestoneText,
          completed: newStatus
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        // Revert optimistic update on failure
        setCompletedMilestones(prev => ({ ...prev, [key]: !newStatus }));
        console.error('Failed to sync milestone completion:', errData.error || res.statusText);
      }
    } catch (e) {
      // Revert optimistic update on network failure
      setCompletedMilestones(prev => ({ ...prev, [key]: !newStatus }));
      console.error('Failed to sync milestone completion:', e);
    }
  };

  const handleSelectSuggestedProject = (projectName: string) => {
    const found = COMPREHENSIVE_PROJECT_CATALOG.find(
      p => p.title.toLowerCase().trim() === projectName.toLowerCase().trim()
    );
    if (found && onSelectProject) {
      onSelectProject({
        id: found.id,
        title: found.title,
        tagline: found.description,
        domain: found.domain,
        difficulty: found.difficulty,
        problemStatement: found.problemStatement,
        proposedSolution: found.proposedSolution,
        expectedOutcome: found.expectedOutcome,
        techStack: found.techStack,
        status: 'In Progress',
        matchScore: 88,
        healthScore: 85,
        stage: 'Requirements & Architecture'
      });
      onNavigate('dashboard');
    } else {
      onNavigate('discovery');
    }
  };

  const completedCount = Object.values(completedMilestones).filter(Boolean).length;
  const totalRoadmapSteps = data?.roadmap?.length || 0;
  const actualProgressPct = totalRoadmapSteps > 0 ? Math.round((completedCount / totalRoadmapSteps) * 100) : 0;

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
          <h1 className="text-[28px] md:text-[38px] font-bold font-['Manrope'] text-[#005144] flex items-center gap-3">
            <span className="material-symbols-outlined text-[36px] text-[#005144]">insights</span>
            <span>Skill Gap Analysis</span>
          </h1>
          <p className="text-[15px] text-[#3F4945] font-['Manrope'] mt-1">
            Compare your verified competencies against industry role benchmarks or project requirements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('profile')}
            className="px-4 py-2 border border-[#BEC9C4] rounded-xl text-[13px] font-bold font-['Inter'] text-[#005144] bg-[#FFFFFF] hover:bg-[#F5F4EF] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Edit My Skills
          </button>
          <button
            onClick={fetchGapAnalysis}
            disabled={loading}
            className="px-4 py-2 bg-[#005144] text-[#FAF9F4] rounded-xl text-[13px] font-bold font-['Inter'] hover:bg-[#176B5B] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            Run Analysis
          </button>
        </div>
      </div>

      {/* Analysis Scope Control Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#BEC9C4]/40 p-6 bento-shadow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#BEC9C4]/30">
          <span className="text-[12px] font-bold uppercase tracking-wider text-[#707974] font-['Inter']">
            Analysis Benchmark Scope:
          </span>
          <div className="flex items-center gap-2">
            {project && (
              <button
                onClick={() => setAnalysisMode('project')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold font-['Inter'] transition-colors ${
                  analysisMode === 'project'
                    ? 'bg-[#005144] text-[#FAF9F4]'
                    : 'bg-[#FAF9F4] text-[#3F4945] hover:bg-[#E0F2F1]'
                }`}
              >
                Active Project ({project.title})
              </button>
            )}
            <button
              onClick={() => setAnalysisMode('role')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold font-['Inter'] transition-colors ${
                analysisMode === 'role'
                  ? 'bg-[#005144] text-[#FAF9F4]'
                  : 'bg-[#FAF9F4] text-[#3F4945] hover:bg-[#E0F2F1]'
              }`}
            >
              Target Career Role
            </button>
          </div>
        </div>

        {/* Form controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-5">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[#3F4945] mb-1 font-['Inter']">
              Target Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full h-10 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-3 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
            >
              {COMMON_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
              <option value="Other">Custom Role...</option>
            </select>
            {targetRole === 'Other' && (
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="Enter custom role title..."
                className="mt-2 w-full h-9 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-3 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
              />
            )}
          </div>

          <div className="md:col-span-5">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[#3F4945] mb-1 font-['Inter']">
              Industry Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full h-10 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-3 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
            >
              {ALL_DOMAINS.filter(d => d !== 'All').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => setShowJdInput(!showJdInput)}
              className="w-full h-10 px-3 border border-[#BEC9C4] bg-[#FAF9F4] hover:bg-[#E0F2F1] text-[#005144] rounded-xl text-[12px] font-bold font-['Inter'] flex items-center justify-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              <span>{showJdInput ? 'Hide JD' : 'Add Target JD'}</span>
            </button>
          </div>
        </div>

        {/* Optional Job Description text area */}
        {showJdInput && (
          <div className="pt-2 animate-fadeIn">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-[#3F4945] mb-1 font-['Inter']">
              Target Job Description / Requirements (Optional):
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste specific job posting requirements to extract exact required technologies and frameworks..."
              rows={3}
              className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-3 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#BEC9C4]/40 bento-shadow">
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#3F4945] font-['Inter']">Required Skills</div>
          <div className="text-[32px] font-extrabold text-[#005144] font-['Manrope'] mt-1">
            {data?.summary?.totalRequired ?? '...'}
          </div>
          <div className="text-[12px] text-[#707974] font-['Inter'] mt-0.5">Role & domain benchmark</div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#BEC9C4]/40 bento-shadow">
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#1B5E20] font-['Inter']">Already Possess</div>
          <div className="text-[32px] font-extrabold text-[#1B5E20] font-['Manrope'] mt-1">
            {data?.comparison?.have?.length ?? 0}
          </div>
          <div className="text-[12px] text-[#707974] font-['Inter'] mt-0.5">Matched from your profile</div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#BEC9C4]/40 bento-shadow">
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#C62828] font-['Inter']">Skill Gaps to Bridge</div>
          <div className="text-[32px] font-extrabold text-[#C62828] font-['Manrope'] mt-1">
            {(data?.comparison?.missing?.length || 0) + (data?.comparison?.needsImprovement?.length || 0)}
          </div>
          <div className="text-[12px] text-[#707974] font-['Inter'] mt-0.5">Missing or needs deepening</div>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#BEC9C4]/40 bento-shadow">
          <div className="text-[12px] font-bold uppercase tracking-wider text-[#005144] font-['Inter']">Skill Match Score</div>
          <div className="text-[32px] font-extrabold text-[#005144] font-['Manrope'] mt-1">
            {data?.summary?.matchPercentage ?? 0}%
          </div>
          <div className="text-[12px] text-[#707974] font-['Inter'] mt-0.5">Weighted competency readiness</div>
        </div>
      </div>

      {/* Match Calculation Formula Callout */}
      {data?.summary?.calculationExplanation && (
        <div className="p-4 bg-[#E0F2F1] rounded-2xl border border-[#80CBC4] text-[#004D40] text-[13px] font-['Inter'] flex items-center gap-3">
          <span className="material-symbols-outlined text-[24px] text-[#004D40] shrink-0">calculate</span>
          <div>
            <span className="font-bold">Transparent Match Calculation: </span>
            <span>{data.summary.calculationExplanation}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#BEC9C4]/40 gap-8">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`pb-3 font-['Manrope'] font-bold text-[16px] transition-colors relative ${
            activeTab === 'comparison'
              ? 'text-[#005144] border-b-2 border-[#005144]'
              : 'text-[#707974] hover:text-[#005144]'
          }`}
        >
          Competency & Gap Breakdown
        </button>
        <button
          onClick={() => setActiveTab('roadmap')}
          className={`pb-3 font-['Manrope'] font-bold text-[16px] transition-colors relative flex items-center gap-2 ${
            activeTab === 'roadmap'
              ? 'text-[#005144] border-b-2 border-[#005144]'
              : 'text-[#707974] hover:text-[#005144]'
          }`}
        >
          <span>Sequential Learning Roadmap</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#1B5E20]">
            {completedCount}/{totalRoadmapSteps}
          </span>
        </button>
      </div>

      {loading && (
        <div className="p-16 text-center bg-[#FFFFFF] rounded-2xl border border-[#BEC9C4]/40">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#005144] mb-3"></div>
          <p className="text-[14px] font-bold font-['Inter'] text-[#005144]">Benchmarking skills and generating learning roadmap...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-[#FFEBEE] border border-[#EF9A9A] text-[#C62828] rounded-2xl font-['Inter'] text-[14px]">
          {error}
        </div>
      )}

      {!loading && data && activeTab === 'comparison' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: `All Skills (${(data.comparison?.have?.length || 0) + (data.comparison?.needsImprovement?.length || 0) + (data.comparison?.missing?.length || 0)})` },
              { id: 'have', label: `Possessed (${data.comparison?.have?.length || 0})` },
              { id: 'needs-improvement', label: `Needs Deepening (${data.comparison?.needsImprovement?.length || 0})` },
              { id: 'missing', label: `Missing to Learn (${data.comparison?.missing?.length || 0})` },
              { id: 'optional', label: `Bonus / Advanced (${data.comparison?.optional?.length || 0})` },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setFilterCategory(pill.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold font-['Inter'] transition-colors ${
                  filterCategory === pill.id
                    ? 'bg-[#005144] text-[#FAF9F4]'
                    : 'bg-[#FFFFFF] border border-[#BEC9C4]/60 text-[#3F4945] hover:bg-[#F5F4EF]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Possessed Skills */}
            {(filterCategory === 'all' || filterCategory === 'have') &&
              (data.comparison?.have || []).map((skill: any) => (
                <div key={skill.skillName} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#A5D6A7] bento-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[17px] font-bold font-['Manrope'] text-[#005144]">{skill.skillName}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]">
                        Possessed
                      </span>
                    </div>
                    <p className="text-[13px] text-[#3F4945] font-['Inter'] mb-3">{skill.whyNeeded}</p>
                  </div>
                  <div className="pt-3 border-t border-[#BEC9C4]/20 flex items-center justify-between text-[12px] text-[#707974] font-['Inter']">
                    <span>Proficiency: {skill.currentLevel}%</span>
                    <span className="text-[#1B5E20] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">verified</span> Confirmed in Profile
                    </span>
                  </div>
                </div>
              ))}

            {/* Needs Improvement */}
            {(filterCategory === 'all' || filterCategory === 'needs-improvement') &&
              (data.comparison?.needsImprovement || []).map((skill: any) => (
                <div key={skill.skillName} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#FFF59D] bento-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[17px] font-bold font-['Manrope'] text-[#005144]">{skill.skillName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase font-['Inter'] ${
                          skill.priority === 'High' ? 'bg-[#FFEBEE] text-[#C62828]' : 'bg-[#FFF9C4] text-[#F57F17]'
                        }`}>
                          {skill.priority || 'Medium'} Priority
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF9C4] text-[#F57F17] border border-[#FFF59D]">
                          Needs Deepening
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#3F4945] font-['Inter'] mb-3">{skill.whyNeeded}</p>

                    {skill.suggestedProjects && skill.suggestedProjects.length > 0 && (
                      <div className="p-2.5 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/30 text-[12px] text-[#005144] mb-3">
                        <span className="font-bold flex items-center gap-1 mb-1 text-[#176B5B]">
                          <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
                          Bridge with Project:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skill.suggestedProjects.map((projTitle: string) => (
                            <button
                              key={projTitle}
                              onClick={() => handleSelectSuggestedProject(projTitle)}
                              className="px-2 py-0.5 bg-[#FFFFFF] border border-[#005144]/30 hover:border-[#005144] rounded text-[11px] font-medium text-[#005144] hover:underline"
                            >
                              {projTitle} &rarr;
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-[#BEC9C4]/20 flex items-center justify-between text-[12px] text-[#707974] font-['Inter']">
                    <span>Current: {skill.currentLevel}% (Required: {skill.requiredLevel}%)</span>
                    <button
                      onClick={() => setActiveTab('roadmap')}
                      className="text-[#176B5B] font-bold hover:underline"
                    >
                      View Roadmap &rarr;
                    </button>
                  </div>
                </div>
              ))}

            {/* Missing to Learn */}
            {(filterCategory === 'all' || filterCategory === 'missing') &&
              (data.comparison?.missing || []).map((skill: any) => (
                <div key={skill.skillName} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#EF9A9A] bento-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[17px] font-bold font-['Manrope'] text-[#005144]">{skill.skillName}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#FFEBEE] text-[#C62828] font-['Inter']">
                          {skill.priority || 'High'} Priority
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A]">
                          Missing to Learn
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#3F4945] font-['Inter'] mb-3">{skill.whyNeeded}</p>

                    {skill.suggestedProjects && skill.suggestedProjects.length > 0 && (
                      <div className="p-2.5 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/30 text-[12px] text-[#005144] mb-3">
                        <span className="font-bold flex items-center gap-1 mb-1 text-[#176B5B]">
                          <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
                          Build Practical Competency:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {skill.suggestedProjects.map((projTitle: string) => (
                            <button
                              key={projTitle}
                              onClick={() => handleSelectSuggestedProject(projTitle)}
                              className="px-2 py-0.5 bg-[#FFFFFF] border border-[#005144]/30 hover:border-[#005144] rounded text-[11px] font-medium text-[#005144] hover:underline"
                            >
                              {projTitle} &rarr;
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-[#BEC9C4]/20 flex items-center justify-between text-[12px] text-[#707974] font-['Inter']">
                    <span>Required Mastery: {skill.requiredLevel}%</span>
                    <button
                      onClick={() => setActiveTab('roadmap')}
                      className="text-[#C62828] font-bold hover:underline"
                    >
                      Start Learning &rarr;
                    </button>
                  </div>
                </div>
              ))}

            {/* Optional Skills */}
            {(filterCategory === 'all' || filterCategory === 'optional') &&
              (data.comparison?.optional || []).map((skill: any) => (
                <div key={skill.skillName} className="bg-[#FFFFFF] p-5 rounded-2xl border border-[#BEC9C4]/60 bento-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[17px] font-bold font-['Manrope'] text-[#005144]">{skill.skillName}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F5F4EF] text-[#707974] border border-[#BEC9C4]/50">
                        Optional / Advanced
                      </span>
                    </div>
                    <p className="text-[13px] text-[#3F4945] font-['Inter'] mb-3">{skill.whyNeeded}</p>
                  </div>
                  <div className="pt-3 border-t border-[#BEC9C4]/20 text-[12px] text-[#707974] font-['Inter']">
                    Bonus competency to elevate resume standing
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {!loading && data && activeTab === 'roadmap' && (
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#BEC9C4]/40 p-6 bento-shadow">
            <h3 className="text-[18px] font-bold text-[#005144] font-['Manrope'] mb-1">
              Personalized Competency Roadmap
            </h3>
            <p className="text-[14px] text-[#3F4945] font-['Inter'] mb-6">
              Complete each hands-on practical milestone in sequence to bridge skill gaps for <span className="font-semibold text-[#005144]">{data?.summary?.targetRole || targetRole}</span>.
            </p>

            <div className="space-y-4">
              {(data.roadmap || []).map((step: any, idx: number) => {
                const key = `${step.skillName}-${idx}`;
                const isDone = Boolean(completedMilestones[key]);

                return (
                  <div
                    key={key}
                    className={`p-5 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-[#F9FBF9] border-[#A5D6A7]'
                        : 'bg-[#FFFFFF] border-[#BEC9C4]/50 hover:border-[#176B5B]'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleMilestone(step.skillName, idx, step.milestone)}
                        className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                          isDone
                            ? 'bg-[#1B5E20] text-[#FFFFFF]'
                            : 'border-2 border-[#BEC9C4] hover:border-[#005144] bg-[#FFFFFF]'
                        }`}
                        aria-label={`Mark milestone for ${step.skillName} complete`}
                      >
                        {isDone && <span className="material-symbols-outlined text-[18px]">check</span>}
                      </button>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#E0F2F1] text-[#004D40] text-[12px] font-bold flex items-center justify-center">
                              {step.recommendedSequence || (idx + 1)}
                            </span>
                            <h4 className={`text-[17px] font-bold font-['Manrope'] ${isDone ? 'line-through text-[#707974]' : 'text-[#005144]'}`}>
                              {step.skillName}
                            </h4>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                            step.status === 'have'
                              ? 'bg-[#E8F5E9] text-[#1B5E20]'
                              : step.status === 'needs-improvement'
                              ? 'bg-[#FFF9C4] text-[#F57F17]'
                              : 'bg-[#FFEBEE] text-[#C62828]'
                          }`}>
                            {step.status === 'needs-improvement' ? 'Needs Deepening' : (step.status || 'Missing')}
                          </span>
                        </div>

                        <p className="text-[14px] text-[#3F4945] font-['Inter'] mb-3">
                          <strong className="text-[#005144]">Why needed:</strong> {step.whyNeeded}
                        </p>

                        {step.prerequisites && step.prerequisites.length > 0 && (
                          <div className="text-[12px] text-[#707974] font-['Inter'] mb-2">
                            <span className="font-bold text-[#3F4945]">Prerequisites:</span> {step.prerequisites.join(', ')}
                          </div>
                        )}

                        <div className="bg-[#FAF9F4] rounded-xl p-3 border border-[#BEC9C4]/30 my-3 text-[13px] font-['Inter']">
                          <div className="font-bold text-[#005144] mb-1 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">code</span>
                            Hands-On Practical Exercise:
                          </div>
                          <div className="text-[#3F4945]">{step.practicalExercise}</div>
                        </div>

                        {step.resources && step.resources.length > 0 && (
                          <div className="text-[12px] text-[#3F4945] font-['Inter'] mb-3">
                            <span className="font-bold">Recommended Resources:</span>{' '}
                            {Array.isArray(step.resources) ? step.resources.join(' • ') : step.resources}
                          </div>
                        )}

                        <div className="pt-2 border-t border-[#BEC9C4]/20 flex items-center justify-between text-[12px] font-['Inter']">
                          <span className="text-[#005144] font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">flag</span>
                            Milestone: {step.milestone}
                          </span>
                          <span className={`font-bold ${isDone ? 'text-[#1B5E20]' : 'text-[#707974]'}`}>
                            {isDone ? 'Completed' : 'Pending completion'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
