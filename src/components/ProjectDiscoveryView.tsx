import React, { useState, useEffect } from 'react';
import { ScreenType, UserProfile, ProjectData } from '../types';
import { COMPREHENSIVE_PROJECT_CATALOG, ALL_DOMAINS, ALL_DIFFICULTIES, ProjectCatalogItem } from '../projectCatalog';

interface ProjectDiscoveryViewProps {
  profile?: UserProfile;
  currentProject?: ProjectData | null;
  onNavigate: (screen: ScreenType) => void;
  onSelectProject: (projectData: Partial<ProjectData>) => void;
}

export const ProjectDiscoveryView: React.FC<ProjectDiscoveryViewProps> = ({
  profile,
  currentProject,
  onNavigate,
  onSelectProject,
}) => {
  const [selectedDomain, setSelectedDomain] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedTech, setSelectedTech] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectCatalogItem[]>(COMPREHENSIVE_PROJECT_CATALOG);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);

  const allTechnologies = React.useMemo(() => {
    const set = new Set<string>();
    COMPREHENSIVE_PROJECT_CATALOG.forEach(p => p.techStack.forEach(t => set.add(t)));
    return ['All', ...Array.from(set).sort()];
  }, []);

  const hasPreferences = Boolean(
    (profile?.skills && profile.skills.length > 0) ||
    (profile?.selectedInterests && profile.selectedInterests.length > 0)
  );

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          userSkills: profile?.skills || [],
          selectedInterests: profile?.selectedInterests || [],
          domain: selectedDomain,
          difficulty: selectedDifficulty,
          tech: selectedTech,
          search: searchQuery
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setProjectsList(data.recommendations);
          setIsPersonalized(Boolean(data.isPersonalized));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to load API recommendations, using local catalog:', e);
    } finally {
      setLoading(false);
    }

    // Local filter fallback with robust normalization
    let filtered = [...COMPREHENSIVE_PROJECT_CATALOG];
    if (selectedDomain !== 'All') {
      const dTarget = selectedDomain.toLowerCase().replace(/&/g, 'and').trim();
      filtered = filtered.filter(p => {
        const pDom = p.domain.toLowerCase().replace(/&/g, 'and').trim();
        return pDom === dTarget || pDom.includes(dTarget) || dTarget.includes(pDom);
      });
    }
    if (selectedDifficulty !== 'All') {
      filtered = filtered.filter(p => p.difficulty.toLowerCase() === selectedDifficulty.toLowerCase());
    }
    if (selectedTech !== 'All') {
      const tTarget = selectedTech.toLowerCase().trim();
      filtered = filtered.filter(p => p.techStack.some(t => t.toLowerCase().includes(tTarget)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.techStack.some(t => t.toLowerCase().includes(q))
      );
    }

    const userSkillNames = new Set(
      (profile?.skills || []).map((s: any) => (typeof s === 'string' ? s : s?.name || '').toLowerCase().trim()).filter(Boolean)
    );

    filtered = filtered.map(p => {
      const matchingSkills = p.techStack.filter(t => userSkillNames.has(t.toLowerCase().trim()));
      const skillsToLearn = p.techStack.filter(t => !userSkillNames.has(t.toLowerCase().trim()));
      return {
        ...p,
        matchingSkills,
        skillsToLearn: skillsToLearn.length > 0 ? skillsToLearn : p.techStack,
        isPersonalized: hasPreferences
      };
    });

    setProjectsList(filtered);
    setIsPersonalized(hasPreferences);
  };

  useEffect(() => {
    fetchRecommendations();
  }, [selectedDomain, selectedDifficulty, selectedTech, searchQuery, profile?.skills, profile?.selectedInterests]);

  const handleChooseProject = (item: ProjectCatalogItem) => {
    const updated: Partial<ProjectData> = {
      id: item.id,
      title: item.title,
      tagline: item.description,
      domain: item.domain,
      difficulty: item.difficulty,
      problemStatement: item.problemStatement,
      proposedSolution: item.proposedSolution,
      expectedOutcome: item.expectedOutcome,
      possibleExtensions: item.possibleExtensions,
      feasibility: item.feasibility,
      whyRelevant: item.whyRelevant,
      techStack: item.techStack,
      status: 'In Progress',
      matchScore: item.matchScore || 88,
      healthScore: 85,
      readinessScore: 45,
      stage: 'Requirements & Architecture',
      stageProgress: 25,
      issuesCount: 0
    };

    onSelectProject(updated);
    onNavigate('dashboard');
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] md:text-[38px] font-bold font-['Manrope'] text-[#005144] flex items-center gap-3">
              <span className="material-symbols-outlined text-[36px] text-[#005144]">explore</span>
              <span>Project Discovery</span>
            </h1>
            <p className="text-[15px] text-[#3F4945] font-['Manrope'] mt-1">
              Explore hands-on engineering capstones, research projects, and production systems across 17+ domains.
            </p>
          </div>

          {/* Personalization Status Pill */}
          <div className="self-start md:self-auto">
            {isPersonalized ? (
              <span className="px-3.5 py-1.5 rounded-full text-[12px] font-bold font-['Inter'] bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Personalized for your profile & skills
              </span>
            ) : (
              <button
                onClick={() => onNavigate('profile')}
                className="px-3.5 py-1.5 rounded-full text-[12px] font-bold font-['Inter'] bg-[#FAF9F4] text-[#707974] border border-[#BEC9C4] hover:border-[#005144] hover:text-[#005144] flex items-center gap-1.5 transition-colors"
                title="Add skills to personalize results"
              >
                <span className="material-symbols-outlined text-[16px]">info</span>
                General Catalog (Add skills for personalized ranking)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] p-6 rounded-2xl border border-[#BEC9C4]/40 bento-shadow space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#707974] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tech, or keywords..."
              className="w-full h-10 pl-10 pr-4 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
            />
          </div>

          {/* Domain Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full h-10 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-3 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
            >
              <option value="All">All Domains ({ALL_DOMAINS.length})</option>
              {ALL_DOMAINS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full h-10 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-3 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
            >
              <option value="All">All Levels</option>
              {ALL_DIFFICULTIES.map(diff => (
                <option key={diff} value={diff}>{diff}</option>
              ))}
            </select>
          </div>

          {/* Tech Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="w-full h-10 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-3 text-[13px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
            >
              <option value="All">All Technologies ({allTechnologies.length - 1})</option>
              {allTechnologies.filter(t => t !== 'All').map(tech => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Domain Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 text-[12px] scrollbar-thin">
          <span className="text-[#707974] font-bold text-[11px] uppercase tracking-wider shrink-0 font-['Inter']">
            Popular:
          </span>
          {['All', 'Artificial Intelligence and Machine Learning', 'Web Development and Full-Stack Applications', 'Cybersecurity', 'Cloud Computing and DevOps', 'Data Science and Big Data Analytics', 'Healthcare Technology'].map(dom => (
            <button
              key={dom}
              onClick={() => setSelectedDomain(dom)}
              className={`px-3 py-1 rounded-full shrink-0 font-bold font-['Inter'] transition-colors ${
                selectedDomain === dom
                  ? 'bg-[#005144] text-[#FAF9F4]'
                  : 'bg-[#FAF9F4] text-[#3F4945] hover:bg-[#D6E6E0] border border-[#BEC9C4]/50'
              }`}
            >
              {dom === 'All' ? 'All Domains' : dom.replace(' and ', ' & ')}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-16 text-center bg-[#FFFFFF] rounded-2xl border border-[#BEC9C4]/40">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#005144] mb-3"></div>
          <p className="text-[14px] font-bold text-[#005144] font-['Inter']">Fetching and ranking engineering projects...</p>
        </div>
      ) : projectsList.length === 0 ? (
        <div className="bg-[#FFFFFF] rounded-2xl p-12 text-center border border-[#BEC9C4]/40">
          <span className="material-symbols-outlined text-[48px] text-[#707974] mb-2">search_off</span>
          <h3 className="text-[18px] font-bold text-[#005144] font-['Manrope'] mb-1">No matching projects found</h3>
          <p className="text-[14px] text-[#53615D] font-['Inter'] mb-4">
            Try adjusting your search query, difficulty level, or domain filter.
          </p>
          <button
            onClick={() => { setSelectedDomain('All'); setSelectedDifficulty('All'); setSearchQuery(''); }}
            className="px-4 py-2 bg-[#005144] text-[#FAF9F4] text-[13px] font-bold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsList.map((item) => {
            const isCurrent = currentProject?.title?.toLowerCase() === item.title.toLowerCase();
            const isExpanded = expandedProjectId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-[#FFFFFF] rounded-2xl border transition-all flex flex-col justify-between overflow-hidden bento-shadow ${
                  isCurrent ? 'border-2 border-[#005144] ring-2 ring-[#005144]/10' : 'border-[#BEC9C4]/40 hover:border-[#005144]'
                }`}
              >
                <div className="p-6">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider font-['Inter'] text-[#176B5B] bg-[#E0F2F1] px-2.5 py-0.5 rounded-md truncate max-w-[180px]">
                      {item.domain}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-['Inter'] ${
                      item.difficulty === 'Beginner' ? 'bg-[#E8F5E9] text-[#1B5E20]' :
                      item.difficulty === 'Intermediate' ? 'bg-[#FFF9C4] text-[#F57F17]' :
                      item.difficulty === 'Advanced' ? 'bg-[#FFE0B2] text-[#E65100]' :
                      'bg-[#FFCDD2] text-[#B71C1C]'
                    }`}>
                      {item.difficulty}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-[19px] font-bold text-[#005144] font-['Manrope'] mb-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-[#3F4945] font-['Inter'] mb-4 line-clamp-3">
                    {item.description}
                  </p>

                  {/* Relevance Explanation */}
                  {item.whyRelevant && (
                    <div className="p-3 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/30 text-[12px] text-[#005144] font-['Inter'] mb-4">
                      <span className="font-bold flex items-center gap-1 mb-0.5 text-[#176B5B]">
                        <span className="material-symbols-outlined text-[15px]">tips_and_updates</span>
                        Relevance Rationale:
                      </span>
                      {item.whyRelevant}
                    </div>
                  )}

                  {/* Tech Stack Pills */}
                  <div className="mb-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#707974] mb-1.5 font-['Inter']">
                      Recommended Stack:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.techStack.map(tech => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 bg-[#FAF9F4] border border-[#BEC9C4]/60 text-[#3F4945] rounded-md text-[11px] font-medium font-['Inter']"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Skills You Have (if user has matched skills) */}
                  {item.matchingSkills && item.matchingSkills.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#1B5E20] mb-1 font-['Inter'] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Skills You Have:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.matchingSkills.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-[#E8F5E9] text-[#1B5E20] rounded-md text-[11px] font-semibold font-['Inter']">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills You'll Learn */}
                  {((item.skillsToLearn && item.skillsToLearn.length > 0) || (item.skillsUserCanLearn && item.skillsUserCanLearn.length > 0)) && (
                    <div className="mb-4">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#005144] mb-1 font-['Inter'] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">school</span>
                        Skills You'll Master:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(item.skillsToLearn || item.skillsUserCanLearn || []).slice(0, 5).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-[#E0F2F1] text-[#005144] rounded-md text-[11px] font-semibold font-['Inter']">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expand Details Toggle */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-[#BEC9C4]/30 space-y-3 text-[12px] font-['Inter'] animate-fadeIn">
                      <div>
                        <span className="font-bold text-[#005144]">Problem Statement:</span>
                        <p className="text-[#3F4945] mt-0.5">{item.problemStatement}</p>
                      </div>

                      {item.objectives && item.objectives.length > 0 && (
                        <div>
                          <span className="font-bold text-[#005144]">Core Objectives:</span>
                          <ul className="list-disc list-inside text-[#3F4945] mt-1 space-y-0.5">
                            {item.objectives.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <span className="font-bold text-[#005144]">Proposed Solution:</span>
                        <p className="text-[#3F4945] mt-0.5">{item.proposedSolution}</p>
                      </div>

                      <div>
                        <span className="font-bold text-[#005144]">Expected Outcome:</span>
                        <p className="text-[#3F4945] mt-0.5">{item.expectedOutcome}</p>
                      </div>

                      {item.implementationGuidance && (
                        <div>
                          <span className="font-bold text-[#005144]">Implementation Guidance:</span>
                          <p className="text-[#3F4945] mt-0.5 bg-[#FAF9F4] p-2.5 rounded-lg border border-[#BEC9C4]/30">{item.implementationGuidance}</p>
                        </div>
                      )}

                      {item.feasibility && (
                        <div>
                          <span className="font-bold text-[#005144]">Feasibility Assessment:</span>
                          <p className="text-[#3F4945] mt-0.5">{item.feasibility}</p>
                        </div>
                      )}

                      {item.possibleExtensions && (
                        <div>
                          <span className="font-bold text-[#005144]">Possible Extensions:</span>
                          <p className="text-[#3F4945] mt-0.5">{item.possibleExtensions}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-[#FAF9F4] border-t border-[#BEC9C4]/30 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedProjectId(isExpanded ? null : item.id)}
                    className="text-[12px] font-bold text-[#176B5B] hover:underline flex items-center gap-1"
                  >
                    <span>{isExpanded ? 'Less Details' : 'Full Architecture'}</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>

                  {isCurrent ? (
                    <span className="px-3 py-1.5 bg-[#D6E6E0] text-[#005144] font-bold text-[12px] rounded-lg flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Active Project
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleChooseProject(item)}
                      className="px-4 py-2 bg-[#005144] hover:bg-[#166A5A] text-white rounded-lg text-[12px] font-bold font-['Inter'] transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>Select Project</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
