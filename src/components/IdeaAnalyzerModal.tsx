import React, { useState } from 'react';
import { ProjectData } from '../types';

interface IdeaAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewProject: (project: Partial<ProjectData> | string, stack?: string[]) => void;
}

export const IdeaAnalyzerModal: React.FC<IdeaAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onSelectNewProject,
}) => {
  const [ideaText, setIdeaText] = useState('An edge-computed audio classifier to assist hearing-impaired students in large lecture halls.');
  const [domain, setDomain] = useState('AI / ML');
  const [targetUsers, setTargetUsers] = useState('Hearing-impaired college students and accessibility coordinators');
  const [preferredTech, setPreferredTech] = useState('Python, Web Audio API, FastAPI');
  const [objective, setObjective] = useState('Capstone & Portfolio');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loadingStepText, setLoadingStepText] = useState('Analyzing your project idea…');
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // Rotate helpful progress steps and track elapsed seconds during active analysis
  React.useEffect(() => {
    if (!isAnalyzing) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed < 3) {
        setLoadingStepText('Synthesizing problem statement & target personas...');
      } else if (elapsed < 7) {
        setLoadingStepText('Evaluating technical feasibility & architectural patterns...');
      } else if (elapsed < 11) {
        setLoadingStepText('Generating technology recommendations & risk mitigations...');
      } else {
        setLoadingStepText('Finalizing engineering blueprint & milestone roadmap...');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  if (!isOpen) return null;

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ideaText.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);
    setSavedSuccess(false);
    setLoadingStepText('Synthesizing problem statement & target personas...');

    const abortController = new AbortController();
    const clientTimeoutId = setTimeout(() => abortController.abort(), 25000);

    try {
      const res = await fetch('/api/analyze-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortController.signal,
        body: JSON.stringify({
          idea: ideaText,
          domain,
          targetUsers,
          preferredTech,
          objective
        })
      });

      clearTimeout(clientTimeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to analyze idea');
      }

      const data = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      clearTimeout(clientTimeoutId);
      if (err.name === 'AbortError') {
        setError('Analysis took too long to complete. Please try submitting again.');
      } else {
        setError(err.message || 'Error communicating with idea analysis service.');
      }
    } finally {
      clearTimeout(clientTimeoutId);
      setIsAnalyzing(false);
    }
  };

  const handleSaveReport = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleStartProject = () => {
    if (!analysisResult) return;
    onSelectNewProject({
      id: 'proj_' + Date.now(),
      title: analysisResult.title || 'Custom Engineering Project',
      tagline: analysisResult.tagline || ideaText.slice(0, 100),
      domain: analysisResult.domain || domain,
      techStack: analysisResult.techStack || ['Python', 'FastAPI'],
      problemStatement: analysisResult.problemStatement,
      proposedSolution: analysisResult.proposedSolution,
      expectedOutcome: (analysisResult.expectedDeliverables || []).join('; '),
      feasibility: analysisResult.feasibility,
      status: 'In Progress',
      matchScore: analysisResult.matchScore || 88,
      healthScore: 85,
      stage: 'Requirements & Architecture',
      stageProgress: 20,
      issuesCount: 0
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F4] rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 bento-shadow border border-[#BEC9C4]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D6E6E0] flex items-center justify-center text-[#005144]">
              <span className="material-symbols-outlined text-[24px]">lightbulb</span>
            </div>
            <div>
              <h2 className="text-[22px] font-bold font-['Manrope'] text-[#005144]">
                Analyze Project Idea
              </h2>
              <p className="text-[13px] text-[#3F4945] font-['Inter']">
                Comprehensive architectural feasibility evaluation, technology stack recommendations, and roadmap synthesis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6F7975] hover:text-[#005144] rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
              Project Concept / Problem Statement *
            </label>
            <textarea
              rows={3}
              value={ideaText}
              disabled={isAnalyzing}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Describe your engineering idea, problem to solve, and core features..."
              className="w-full bg-white border border-[#BEC9C4] rounded-xl p-3 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] resize-none disabled:bg-[#F2F4F3] disabled:text-[#707974]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                Target Domain
              </label>
              <select
                value={domain}
                disabled={isAnalyzing}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-white border border-[#BEC9C4] rounded-xl px-3 py-2.5 text-[13px] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] disabled:bg-[#F2F4F3] disabled:text-[#707974]"
              >
                <option value="AI / ML">AI / Machine Learning</option>
                <option value="Healthcare">Healthcare & Bio-Informatics</option>
                <option value="Accessibility">Accessibility & Assistive Tech</option>
                <option value="IoT">IoT & Embedded Systems</option>
                <option value="Cybersecurity">Cybersecurity & Cryptography</option>
                <option value="Web Development">Full-Stack Web & Cloud</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                Target Users / Personas
              </label>
              <input
                type="text"
                value={targetUsers}
                disabled={isAnalyzing}
                onChange={(e) => setTargetUsers(e.target.value)}
                placeholder="e.g. University students, clinical staff..."
                className="w-full bg-white border border-[#BEC9C4] rounded-xl px-3 py-2 text-[13px] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] disabled:bg-[#F2F4F3] disabled:text-[#707974]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                Preferred Technologies (Optional)
              </label>
              <input
                type="text"
                value={preferredTech}
                disabled={isAnalyzing}
                onChange={(e) => setPreferredTech(e.target.value)}
                placeholder="e.g. Python, React, PostgreSQL..."
                className="w-full bg-white border border-[#BEC9C4] rounded-xl px-3 py-2 text-[13px] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] disabled:bg-[#F2F4F3] disabled:text-[#707974]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                Project Objective
              </label>
              <select
                value={objective}
                disabled={isAnalyzing}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full bg-white border border-[#BEC9C4] rounded-xl px-3 py-2.5 text-[13px] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] disabled:bg-[#F2F4F3] disabled:text-[#707974]"
              >
                <option value="Capstone & Portfolio">Senior Capstone & Portfolio</option>
                <option value="Interview Preparation">Interview Prep System Design</option>
                <option value="Hackathon">Fast Hackathon Prototype</option>
                <option value="Learning New Stack">Learning New Technology</option>
              </select>
            </div>
          </div>

          {/* Immediate Loading Indicator with Live Step & Elapsed Seconds */}
          {isAnalyzing && (
            <div className="p-4 bg-[#EBF3F0] border border-[#005144]/25 rounded-xl flex items-center gap-3.5 animate-fadeIn">
              <span className="material-symbols-outlined text-[#005144] animate-spin text-[26px]">
                progress_activity
              </span>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <h4 className="text-[13px] font-bold text-[#005144] font-['Manrope']">
                    Analyzing your project idea…
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-[#005144] bg-white px-2 py-0.5 rounded-md border border-[#BEC9C4]/40">
                    {elapsedSeconds}s
                  </span>
                </div>
                <p className="text-[12px] text-[#3F4945] font-['Inter'] mt-0.5">
                  {loadingStepText}
                </p>
              </div>
            </div>
          )}

          {/* Meaningful Error Display with Retry Action */}
          {error && (
            <div className="p-3 bg-[#FFEBEE] border border-[#FFCDD2] rounded-xl flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C62828] text-[20px]">error</span>
                <span className="text-[12px] text-[#C62828] font-['Inter'] font-medium">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing}
                className="px-3 py-1 bg-[#C62828] hover:bg-[#B71C1C] text-white text-[12px] font-bold rounded-lg cursor-pointer transition-colors shrink-0"
              >
                Retry Analysis
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isAnalyzing || !ideaText.trim()}
            className="w-full py-3 bg-[#005144] hover:bg-[#176B5B] text-white font-bold rounded-xl text-[13px] font-['Inter'] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {isAnalyzing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
                <span>Analyzing Project Idea & Architecture ({elapsedSeconds}s)...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>Analyze Feasibility & Generate Engineering Blueprint</span>
              </>
            )}
          </button>
        </form>

        {analysisResult && (
          <div className="mt-8 pt-6 border-t border-[#BEC9C4]/40 space-y-5 animate-fadeIn">
            {/* Header info */}
            <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 bg-[#D6E6E0] text-[#005144] text-[11px] font-bold rounded-md font-['Inter'] uppercase">
                  {analysisResult.domain}
                </span>
                <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144] mt-1">
                  {analysisResult.title}
                </h3>
                <p className="text-[13px] text-[#53615D] font-['Inter']">{analysisResult.tagline}</p>
              </div>
              <div className="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className="text-center sm:text-right">
                  <span className="text-[11px] font-bold text-[#6F7975] uppercase block">Feasibility</span>
                  <span className="text-[16px] font-bold text-[#1B5E20]">{analysisResult.feasibility}</span>
                </div>
                <div className="text-center sm:text-right">
                  <span className="text-[11px] font-bold text-[#6F7975] uppercase block">Timeline</span>
                  <span className="text-[16px] font-bold text-[#005144]">{analysisResult.estimatedWeeks} Wks</span>
                </div>
              </div>
            </div>

            {/* Problem Statement & Proposed Solution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40 space-y-1.5">
                <h4 className="text-[12px] font-bold font-['Inter'] text-[#005144] uppercase tracking-wider">
                  Problem Statement & Target Users
                </h4>
                <p className="text-[13px] text-[#3F4945] font-['Inter'] leading-relaxed">
                  {analysisResult.problemStatement}
                </p>
                <div className="text-[11px] text-[#53615D] pt-1 border-t border-[#BEC9C4]/20">
                  <strong>Target Users:</strong> {analysisResult.targetUsers}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40 space-y-1.5">
                <h4 className="text-[12px] font-bold font-['Inter'] text-[#005144] uppercase tracking-wider">
                  Proposed Solution & Features
                </h4>
                <p className="text-[13px] text-[#3F4945] font-['Inter'] leading-relaxed">
                  {analysisResult.proposedSolution}
                </p>
                <ul className="list-disc list-inside text-[12px] text-[#53615D] space-y-0.5 pt-1">
                  {(analysisResult.keyFeatures || []).slice(0, 3).map((feat: string, i: number) => (
                    <li key={i}>{feat}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommended Technologies with Justifications */}
            <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40">
              <h4 className="text-[12px] font-bold font-['Inter'] text-[#005144] uppercase tracking-wider mb-2">
                Recommended Technology Stack & Justification
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                {(analysisResult.recommendedTechnologies || []).map((t: any, i: number) => (
                  <div key={i} className="p-2.5 bg-[#FAF9F4] rounded-lg border border-[#BEC9C4]/30">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-[#005144]">{t.tech}</strong>
                      <span className="text-[10px] uppercase font-bold text-[#707974]">{t.role}</span>
                    </div>
                    <p className="text-[#53615D] text-[11px]">{t.justification}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Architecture & Milestones */}
            <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40 space-y-3">
              <h4 className="text-[12px] font-bold font-['Inter'] text-[#005144] uppercase tracking-wider">
                Architecture & 4-Stage Implementation Milestones
              </h4>
              <p className="text-[13px] text-[#3F4945] font-['Inter']">
                {analysisResult.suggestedArchitecture}
              </p>
              <div className="space-y-2 pt-2 border-t border-[#BEC9C4]/20">
                {(analysisResult.roadmap || []).map((m: any, i: number) => (
                  <div key={i} className="flex items-start gap-2.5 text-[12px]">
                    <span className="w-5 h-5 rounded-full bg-[#E0F2F1] text-[#005144] font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {i + 1}
                    </span>
                    <div>
                      <strong className="text-[#005144]">{m.phase}: {m.title}</strong>
                      <span className="text-[#707974] ml-2">({m.duration})</span>
                      <p className="text-[#53615D] text-[11px] mt-0.5">
                        Deliverables: {(m.deliverables || []).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security, Testing & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
              <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40">
                <h5 className="font-bold uppercase text-[#005144] mb-1.5 font-['Inter']">Testing & Security Considerations</h5>
                <p className="text-[#3F4945] mb-2">{analysisResult.testingStrategy}</p>
                <div className="text-[11px] text-[#53615D] pt-1 border-t border-[#BEC9C4]/20">
                  <strong>Security:</strong> {analysisResult.securityAndPrivacy}
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40">
                <h5 className="font-bold uppercase text-[#C62828] mb-1.5 font-['Inter']">Technical Risks & Mitigation</h5>
                <div className="space-y-1.5">
                  {(analysisResult.risksAndMitigations || []).slice(0, 2).map((r: any, i: number) => (
                    <div key={i} className="text-[11px]">
                      <strong className="text-[#C62828]">{r.risk}:</strong>
                      <span className="text-[#53615D] ml-1">{r.mitigation}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {savedSuccess && (
              <div className="p-3 bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] rounded-xl text-[12px] font-bold font-['Inter'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Idea evaluation report saved securely to your profile!</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-[#BEC9C4]/30">
              <span className="text-[11px] text-[#707974] italic">
                Note: This analyzed idea will only appear on your dashboard if you explicitly start it.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveReport}
                  className="px-4 py-2 bg-[#FAF9F4] hover:bg-[#D6E6E0] border border-[#BEC9C4] text-[#005144] rounded-xl text-[12px] font-bold font-['Inter'] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">bookmark</span>
                  Save Report
                </button>
                <button
                  type="button"
                  onClick={handleStartProject}
                  className="px-5 py-2 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[12px] font-bold font-['Inter'] shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  Start Project from This Idea
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
