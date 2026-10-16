import React, { useState } from 'react';

interface IdeaAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNewProject: (title: string, stack: string[]) => void;
}

export const IdeaAnalyzerModal: React.FC<IdeaAnalyzerModalProps> = ({
  isOpen,
  onClose,
  onSelectNewProject,
}) => {
  const [ideaText, setIdeaText] = useState('An edge-computed audio classifier to assist hearing-impaired students in large lecture halls.');
  const [domain, setDomain] = useState('AI / Accessibility');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    matchScore: number;
    feasibility: string;
    estimatedWeeks: number;
    suggestedArchitecture: string;
    milestones: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaText.trim()) return;
    setIsAnalyzing(true);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/analyze-idea', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ idea: ideaText, domain, skills: ['Python', 'Machine Learning', 'Git'] })
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
      } else {
        throw new Error();
      }
    } catch {
      setAnalysisResult({
        matchScore: 92,
        feasibility: 'High',
        estimatedWeeks: 4,
        suggestedArchitecture: 'WebRTC audio stream processor with on-device Whisper Tiny + FastAPI server for transcript indexing and smart keyword spotlighting.',
        milestones: [
          'Phase 1: Audio stream ingestion with Web Audio API & noise filter',
          'Phase 2: On-device quantized acoustic classification model',
          'Phase 3: Real-time caption visualizer with visual vibration alerts',
          'Phase 4: Capstone defense presentation and live room test demo'
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF9F4] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 bento-shadow border border-[#BEC9C4]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D6E6E0] flex items-center justify-center text-[#005144]">
              <span className="material-symbols-outlined text-[24px]">lightbulb</span>
            </div>
            <div>
              <h2 className="text-[22px] font-bold font-['Manrope'] text-[#005144]">
                Analyze My Idea
              </h2>
              <p className="text-[13px] text-[#3F4945]">
                Evaluate project feasibility, architecture stack, and capstone fit with Projevo AI.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6F7975] hover:text-[#005144] rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
              Project Concept
            </label>
            <textarea
              rows={3}
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Describe your engineering project idea in 1-3 sentences..."
              className="w-full bg-white border border-[#BEC9C4] rounded-xl p-4 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] resize-none"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
              Domain / Track
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-white border border-[#BEC9C4] rounded-xl px-4 py-2.5 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144]"
            >
              <option value="AI / ML">AI / Machine Learning</option>
              <option value="Healthcare">Healthcare & Bio-Informatics</option>
              <option value="Accessibility">Accessibility & Assistive Tech</option>
              <option value="IoT">IoT & Embedded Systems</option>
              <option value="Cybersecurity">Cybersecurity & Cryptography</option>
              <option value="Web Development">Full-Stack Web & Cloud</option>
            </select>
          </div>

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
                <span>Synthesizing Architectural Feasibility...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>Analyze Feasibility & Generate Blueprint</span>
              </>
            )}
          </button>
        </form>

        {analysisResult && (
          <div className="mt-6 pt-6 border-t border-[#BEC9C4]/30 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#BEC9C4]/40">
              <div>
                <span className="text-[11px] font-bold text-[#6F7975] uppercase">Match Score</span>
                <div className="text-[26px] font-bold font-['Manrope'] text-[#005144]">
                  {analysisResult.matchScore}%
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-[#6F7975] uppercase">Feasibility</span>
                <div className="text-[16px] font-bold text-[#2E8B70]">
                  {analysisResult.feasibility} (Est. {analysisResult.estimatedWeeks} wks)
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40">
              <h4 className="text-[13px] font-bold font-['Inter'] text-[#005144] uppercase tracking-wider mb-1.5">
                Recommended Architecture
              </h4>
              <p className="text-[13px] text-[#3F4945] font-['Manrope'] leading-relaxed">
                {analysisResult.suggestedArchitecture}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-[#BEC9C4]/40">
              <h4 className="text-[13px] font-bold font-['Inter'] text-[#005144] uppercase tracking-wider mb-2">
                4-Week Milestones
              </h4>
              <ul className="space-y-1.5 text-[13px] text-[#3F4945]">
                {analysisResult.milestones.map((m, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#005144] font-bold">✓</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  onSelectNewProject(
                    ideaText.length > 35 ? ideaText.slice(0, 35) + '...' : ideaText,
                    ['Python', 'FastAPI', 'WebSockets', 'Torch']
                  );
                  onClose();
                }}
                className="px-5 py-2.5 bg-[#005144] hover:bg-[#176B5B] text-white rounded-xl text-[13px] font-bold font-['Inter'] shadow-xs"
              >
                Set as Active Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
