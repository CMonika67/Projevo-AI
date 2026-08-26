import React, { useState } from 'react';
import { ScreenType } from '../types';

interface InterviewPrepViewProps {
  projectTitle: string;
  onNavigate: (screen: ScreenType) => void;
}

export const InterviewPrepView: React.FC<InterviewPrepViewProps> = ({
  projectTitle,
  onNavigate,
}) => {
  const [selectedTopic, setSelectedTopic] = useState('System Design & Data Architecture');
  const [currentQuestion, setCurrentQuestion] = useState(
    `In your ${projectTitle} project, how did you handle data privacy and ensure that patient identifying information was scrubbed prior to model inference?`
  );
  const [followUp, setFollowUp] = useState(
    'What would happen if your backend received a high concurrency spike during clinical shift changes?'
  );
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<{
    score: number;
    verdict: string;
    strengths: string[];
    improvements: string[];
    sampleStrongAnswer: string;
  } | null>(null);

  const handleGenerateQuestion = async (topic: string) => {
    setSelectedTopic(topic);
    setEvaluation(null);
    setStudentAnswer('');

    try {
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectTitle, topic })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentQuestion(data.question);
        setFollowUp(data.followUp || '');
      }
    } catch {
      setCurrentQuestion(
        `Can you explain the trade-offs you considered between using a lightweight regex NER parser vs. a Transformer-based model in ${projectTitle}?`
      );
    }
  };

  const handleEvaluate = () => {
    if (!studentAnswer.trim()) return;
    setIsEvaluating(true);

    setTimeout(() => {
      setIsEvaluating(false);
      setEvaluation({
        score: 88,
        verdict: 'Strong Technical Demonstration',
        strengths: [
          'Directly addressed data normalization and tokenizer isolation before inference.',
          'Articulated the latency budget constraints in clinical environments.',
          'Demonstrated clear understanding of exception handlers during pipeline failures.'
        ],
        improvements: [
          'Mention automated HIPAA audit logs or pseudonymization tokens for cold-storage archival.',
          'Quantify concurrency metrics (e.g. 500 req/sec at p99 < 120ms).'
        ],
        sampleStrongAnswer:
          'In this architecture, we implemented an isolated in-memory redaction middleware. Prior to passing clinical notes to the embedding pipeline, a regex + spaCy clinical filter substitutes PHI tokens with synthetic UUID hashes. The raw payload never touches the external inference queue, guaranteeing zero patient data leakage.'
      });
    }, 1200);
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
        <h1 className="text-[28px] md:text-[38px] font-bold font-['Manrope'] text-[#005144] flex items-center gap-3">
          <span className="material-symbols-outlined text-[36px] text-[#005144]">school</span>
          <span>Interview Prep & Defense</span>
        </h1>
        <p className="text-[16px] text-[#3F4945] font-['Manrope'] mt-1">
          Practice explaining architectural decisions and answering rigorous technical questions about your project.
        </p>
      </div>

      {/* Topics Selector */}
      <div className="flex flex-wrap gap-2">
        {[
          'System Design & Data Architecture',
          'Security & Vulnerability Mitigation',
          'Machine Learning Pipeline & Trade-offs',
          'Scalability & Concurrency'
        ].map((topic) => (
          <button
            key={topic}
            onClick={() => handleGenerateQuestion(topic)}
            className={`px-4 py-2 rounded-xl text-[13px] font-bold font-['Inter'] transition-all cursor-pointer ${
              selectedTopic === topic
                ? 'bg-[#005144] text-white shadow-xs'
                : 'bg-white text-[#3F4945] hover:bg-[#D6E6E0] border border-[#BEC9C4]/40'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Main Question & Answer Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Question Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-[#D6E6E0] text-[#005144] text-[12px] font-bold font-['Inter'] rounded-full">
                {selectedTopic}
              </span>
              <span className="text-[12px] text-[#6F7975] font-semibold">Senior Staff Interviewer</span>
            </div>

            <div className="p-5 bg-[#FAF9F4] rounded-xl border-l-4 border-[#005144] mb-6">
              <p className="text-[17px] font-bold font-['Manrope'] text-[#1B1C19] leading-relaxed">
                "{currentQuestion}"
              </p>
            </div>

            {followUp && (
              <div className="p-4 bg-[#FFDAD3]/30 rounded-xl border border-[#FFB4A4]/40 text-[13px] text-[#7C2E1D]">
                <span className="font-bold">Follow-Up Pressure:</span> {followUp}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-[#BEC9C4]/30 flex justify-between items-center text-[12px] text-[#6F7975]">
            <span>Project: {projectTitle}</span>
            <button
              onClick={() => handleGenerateQuestion(selectedTopic)}
              className="text-[#005144] font-bold hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              New Question
            </button>
          </div>
        </div>

        {/* Right: Answer Box & AI Rubric Evaluator */}
        <div className="bg-white rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 flex flex-col justify-between">
          <div>
            <h3 className="text-[18px] font-bold font-['Manrope'] text-[#005144] mb-3">
              Your Technical Response
            </h3>
            <textarea
              rows={6}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Explain your approach, architectural trade-offs, and how you validated the outcome..."
              className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-4 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] resize-none leading-relaxed"
            />
            <div className="mt-2 flex justify-between text-[11px] text-[#6F7975]">
              <span>Tip: Structure with Situation → Decision → Trade-off → Metric</span>
              <span>{studentAnswer.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleEvaluate}
              disabled={isEvaluating || !studentAnswer.trim()}
              className="w-full py-3.5 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[14px] font-bold font-['Inter'] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">
                    progress_activity
                  </span>
                  <span>Evaluating Response with Projevo AI...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  <span>Evaluate Response & Get Rubric</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Evaluation Report */}
      {evaluation && (
        <div className="bg-white rounded-2xl p-6 md:p-8 bento-shadow border border-[#2E8B70]/40 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#BEC9C4]/30">
            <div>
              <span className="px-3 py-1 bg-[#D6E6E0] text-[#005144] text-[12px] font-bold font-['Inter'] rounded-full">
                AI Interview Rubric
              </span>
              <h2 className="text-[22px] font-bold font-['Manrope'] text-[#005144] mt-1.5">
                {evaluation.verdict}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[12px] font-bold text-[#6F7975] uppercase">Readiness Score</span>
                <div className="text-[32px] font-extrabold font-['Manrope'] text-[#2E8B70] leading-none">
                  {evaluation.score}%
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Strengths */}
            <div className="p-5 bg-[#D6E6E0]/40 rounded-xl border border-[#2E8B70]/30">
              <h4 className="text-[14px] font-bold font-['Inter'] text-[#005144] flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#2E8B70] text-[18px]">check_circle</span>
                <span>Key Strengths Identified</span>
              </h4>
              <ul className="space-y-2 text-[13px] text-[#3F4945]">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#2E8B70] font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas of Improvement */}
            <div className="p-5 bg-[#FFDAD6]/30 rounded-xl border border-[#D95F59]/30">
              <h4 className="text-[14px] font-bold font-['Inter'] text-[#7C2E1D] flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#D95F59] text-[18px]">tips_and_updates</span>
                <span>Level-Up Recommendations</span>
              </h4>
              <ul className="space-y-2 text-[13px] text-[#3F4945]">
                {evaluation.improvements.map((imp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#D95F59] font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Model Ideal Response */}
          <div className="p-5 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/40">
            <h4 className="text-[13px] font-bold font-['Inter'] text-[#176B5B] uppercase tracking-wider mb-2">
              Exemplary Presentation Pitch:
            </h4>
            <p className="text-[14px] font-['Manrope'] text-[#1B1C19] leading-relaxed italic">
              "{evaluation.sampleStrongAnswer}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
