import React, { useState } from 'react';
import { ScreenType, ProjectData, InterviewQuestion, AnswerEvaluation } from '../types';

interface InterviewPrepViewProps {
  currentProject?: ProjectData | null;
  onNavigate: (screen: ScreenType) => void;
}

export const InterviewPrepView: React.FC<InterviewPrepViewProps> = ({
  currentProject,
  onNavigate,
}) => {
  // 7 input fields
  const [projectTitle, setProjectTitle] = useState(currentProject?.title || '');
  const [projectDescription, setProjectDescription] = useState(
    currentProject?.problemStatement || currentProject?.tagline || ''
  );
  const [roleContribution, setRoleContribution] = useState(
    'Led backend API design, pipeline integration, error handling, and unit test coverage.'
  );
  const [jobDescription, setJobDescription] = useState(
    'Software Engineer responsible for distributed backend services, clean architecture, and reliable API delivery.'
  );
  const [roleApplyingFor, setRoleApplyingFor] = useState('Full Stack / Backend Software Engineer');
  const [proposedSolution, setProposedSolution] = useState(
    currentProject?.proposedSolution || 'End-to-end service with modular controllers, structured validation, and automated error logging.'
  );
  const [techStackUsed, setTechStackUsed] = useState(
    currentProject?.techStack?.join(', ') || 'Python, TypeScript, FastAPI, PostgreSQL, Docker'
  );

  // Difficulty level: Easy | Medium | Hard
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [companyPreference, setCompanyPreference] = useState<string>('Google');

  // Questions and guide state
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loadingStepText, setLoadingStepText] = useState('Generating interview questions…');
  const [guideError, setGuideError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number>(0);

  // User practice state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, AnswerEvaluation>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Live timer and status messages during active question generation
  React.useEffect(() => {
    if (!isGeneratingGuide) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed < 3) {
        setLoadingStepText('Analyzing project architecture & technology stack...');
      } else if (elapsed < 7) {
        setLoadingStepText('Synthesizing customized technical defense questions...');
      } else if (elapsed < 11) {
        setLoadingStepText('Formulating evaluation criteria & model responses...');
      } else {
        setLoadingStepText('Assembling difficulty-adjusted interview guide...');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isGeneratingGuide]);

  const handlePrefillFromProject = () => {
    if (!currentProject || isGeneratingGuide) return;
    setProjectTitle(currentProject.title || '');
    setProjectDescription(currentProject.problemStatement || currentProject.tagline || '');
    if (currentProject.proposedSolution) {
      setProposedSolution(currentProject.proposedSolution);
    }
    if (currentProject.techStack && currentProject.techStack.length > 0) {
      setTechStackUsed(currentProject.techStack.join(', '));
    }
  };

  const handleGenerateGuide = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGeneratingGuide) return;
    if (!projectTitle.trim() || !projectDescription.trim() || !roleApplyingFor.trim()) {
      setGuideError('Please fill in Project Title, Project Description, and Role Applying For.');
      return;
    }

    setIsGeneratingGuide(true);
    setGuideError(null);
    setQuestions([]);
    setSelectedQuestionIndex(0);
    setLoadingStepText('Analyzing project architecture & technology stack...');

    const abortController = new AbortController();
    const clientTimeoutId = setTimeout(() => abortController.abort(), 25000);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/interview-prep/guide', {
        method: 'POST',
        headers,
        credentials: 'include',
        signal: abortController.signal,
        body: JSON.stringify({
          projectTitle,
          projectDescription,
          roleContribution,
          jobDescription,
          roleApplyingFor,
          companyPreference,
          proposedSolution,
          techStackUsed,
          difficulty
        })
      });

      clearTimeout(clientTimeoutId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate interview guide. Please try again.');
      }

      const data = await res.json();
      if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setSelectedQuestionIndex(0);
      } else {
        throw new Error('No interview questions returned.');
      }
    } catch (err: any) {
      clearTimeout(clientTimeoutId);
      if (err.name === 'AbortError') {
        setGuideError('Generation timed out. Please click "Retry Generation" to try again.');
      } else {
        setGuideError(err.message || 'Error generating interview guide.');
      }
    } finally {
      clearTimeout(clientTimeoutId);
      setIsGeneratingGuide(false);
    }
  };

  const handleEvaluateAnswer = async (questionId: string) => {
    const userAnswer = answers[questionId];
    if (!userAnswer || !userAnswer.trim()) {
      setEvalError('Please type your response before requesting an evaluation.');
      return;
    }

    const currentQ = questions.find(q => q.id === questionId);
    if (!currentQ) return;

    setIsEvaluating(true);
    setEvalError(null);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/interview-prep/evaluate', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          question: currentQ.question,
          category: currentQ.category,
          difficulty,
          userAnswer,
          projectContext: {
            projectTitle,
            projectDescription,
            roleContribution,
            proposedSolution,
            techStackUsed,
            roleApplyingFor
          }
        })
      });

      if (!res.ok) {
        throw new Error('Evaluation service temporarily unavailable.');
      }

      const evalData: AnswerEvaluation = await res.json();
      setEvaluations(prev => ({ ...prev, [questionId]: evalData }));
    } catch (err: any) {
      setEvalError(err.message || 'Failed to evaluate answer.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const activeQuestion = questions[selectedQuestionIndex];
  const activeAnswer = activeQuestion ? (answers[activeQuestion.id] || '') : '';
  const activeEvaluation = activeQuestion ? evaluations[activeQuestion.id] : null;

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
              <span className="material-symbols-outlined text-[36px] text-[#005144]">school</span>
              <span>Interview Preparation &amp; Evaluation</span>
            </h1>
            <p className="text-[15px] text-[#3F4945] font-['Manrope'] mt-1">
              Personalized technical defense, behavioral alignment, and rubrics scored out of 10 based on your real engineering work.
            </p>
          </div>

          {currentProject && (
            <button
              type="button"
              disabled={isGeneratingGuide}
              onClick={handlePrefillFromProject}
              className="px-4 py-2 bg-[#FAF9F4] border border-[#005144] text-[#005144] hover:bg-[#D6E6E0] rounded-xl text-[13px] font-bold font-['Inter'] transition-colors flex items-center gap-1.5 self-start md:self-auto disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">input</span>
              Prefill from "{currentProject.title}"
            </button>
          )}
        </div>
      </div>

      {/* Input Parameters Form */}
      <div className="bg-[#FFFFFF] p-6 md:p-8 rounded-2xl border border-[#BEC9C4]/40 bento-shadow">
        <h2 className="text-[20px] font-bold font-['Manrope'] text-[#005144] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#005144]">tune</span>
          <span>Target Project &amp; Role Parameters</span>
        </h2>

        <form onSubmit={handleGenerateGuide} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                Project Title *
              </label>
              <input
                type="text"
                disabled={isGeneratingGuide}
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. AI Healthcare Assistant"
                className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                Role Applying For *
              </label>
              <input
                type="text"
                disabled={isGeneratingGuide}
                value={roleApplyingFor}
                onChange={(e) => setRoleApplyingFor(e.target.value)}
                placeholder="e.g. Backend Software Engineer, ML Engineer"
                className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                Technology Stack Used *
              </label>
              <input
                type="text"
                disabled={isGeneratingGuide}
                value={techStackUsed}
                onChange={(e) => setTechStackUsed(e.target.value)}
                placeholder="e.g. Python, FastAPI, PyTorch, Docker, PostgreSQL"
                className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                Interview Difficulty Level *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Easy', 'Medium', 'Hard'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    disabled={isGeneratingGuide}
                    onClick={() => setDifficulty(lvl)}
                    className={`h-11 rounded-xl text-[13px] font-bold font-['Inter'] transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
                      difficulty === lvl
                        ? 'bg-[#005144] text-[#FAF9F4] border-[#005144]'
                        : 'bg-[#FAF9F4] border-[#BEC9C4] text-[#3F4945] hover:bg-[#D6E6E0]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                Project Description &amp; Problem Statement *
              </label>
              <textarea
                rows={3}
                disabled={isGeneratingGuide}
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Describe the clinical or engineering problem, objectives, and domain context..."
                className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-3 text-[13px] font-['Inter'] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                Proposed Solution &amp; Architecture
              </label>
              <textarea
                rows={3}
                disabled={isGeneratingGuide}
                value={proposedSolution}
                onChange={(e) => setProposedSolution(e.target.value)}
                placeholder="High-level architecture, main modules, data flow, APIs..."
                className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-3 text-[13px] font-['Inter'] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                My Role &amp; Personal Contribution *
              </label>
              <textarea
                rows={2}
                disabled={isGeneratingGuide}
                value={roleContribution}
                onChange={(e) => setRoleContribution(e.target.value)}
                placeholder="What exactly did you write, debug, design, or optimize?"
                className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-3 text-[13px] font-['Inter'] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                Company Preference / Benchmark (e.g. Google, Microsoft, Meta)
              </label>
              <input
                type="text"
                disabled={isGeneratingGuide}
                value={companyPreference}
                onChange={(e) => setCompanyPreference(e.target.value)}
                placeholder="e.g. Google, Microsoft, Stripe, Early-stage AI Startup"
                className="w-full h-11 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[13px] font-['Inter'] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
              Full Job Description / Target Expectations
            </label>
            <textarea
              rows={2}
              disabled={isGeneratingGuide}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Key requirements from job posting (e.g. concurrency, REST APIs, CI/CD, system design)..."
              className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-3 text-[13px] font-['Inter'] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {guideError && (
            <div className="p-4 bg-[#FFEBEE] border border-[#EF9A9A] text-[#C62828] rounded-xl text-[13px] font-['Inter'] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#C62828] shrink-0">error</span>
                <span>{guideError}</span>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateGuide()}
                className="px-3.5 py-1.5 bg-[#C62828] text-white hover:bg-[#B71C1C] rounded-lg text-[12px] font-bold font-['Inter'] transition-colors self-start sm:self-auto shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Retry Generation</span>
              </button>
            </div>
          )}

          {/* Immediate loading state card */}
          {isGeneratingGuide && (
            <div className="p-5 bg-[#E0F2F1]/80 border border-[#005144]/30 rounded-2xl animate-pulse">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#005144] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[22px] animate-spin">sync</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold font-['Manrope'] text-[#005144]">
                      Generating interview questions…
                    </h3>
                    <p className="text-[13px] text-[#3F4945] font-['Inter'] mt-0.5">
                      {loadingStepText}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start md:self-auto px-3 py-1.5 bg-[#FFFFFF] rounded-xl border border-[#005144]/20 text-[13px] font-bold font-mono text-[#005144]">
                  <span className="material-symbols-outlined text-[16px]">timer</span>
                  <span>{elapsedSeconds}s</span>
                </div>
              </div>
              <div className="w-full bg-[#D6E6E0] h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-[#005144] h-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(95, Math.max(12, elapsedSeconds * 8))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <span className="text-[12px] text-[#707974] font-['Inter']">
              {difficulty === 'Easy' && 'Easy: Fundamentals, terminology, overview, introductory tech questions.'}
              {difficulty === 'Medium' && 'Medium: Architecture, trade-offs, debugging, practical problem-solving.'}
              {difficulty === 'Hard' && 'Hard: System scalability, edge cases, security, deep project defense.'}
            </span>

            <button
              type="submit"
              disabled={isGeneratingGuide}
              className="px-6 py-2.5 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[14px] font-bold font-['Inter'] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${isGeneratingGuide ? 'animate-spin' : ''}`}>
                {isGeneratingGuide ? 'sync' : 'auto_stories'}
              </span>
              <span>{isGeneratingGuide ? `Generating interview questions… (${elapsedSeconds}s)` : `Generate ${difficulty} Guide`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Questions & Practice Panel */}
      {questions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Question Selector Sidebar */}
          <div className="lg:col-span-4 bg-[#FFFFFF] p-4 rounded-2xl border border-[#BEC9C4]/40 bento-shadow space-y-2 max-h-[640px] overflow-y-auto">
            <div className="text-[13px] font-bold text-[#005144] uppercase tracking-wider mb-2 font-['Inter'] px-2">
              Generated Questions ({questions.length})
            </div>
            {questions.map((q, idx) => {
              const isSelected = selectedQuestionIndex === idx;
              const hasAnswer = Boolean(answers[q.id]?.trim());
              const evalResult = evaluations[q.id];

              return (
                <div
                  key={q.id}
                  onClick={() => { setSelectedQuestionIndex(idx); setEvalError(null); }}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#E0F2F1] border-[#005144]'
                      : 'bg-[#FAF9F4] border-[#BEC9C4]/40 hover:bg-[#D6E6E0]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                    <span className="text-[#176B5B] uppercase tracking-wider">{q.category}</span>
                    {evalResult && (
                      <span className="px-2 py-0.5 rounded-full bg-[#005144] text-[#FAF9F4] text-[10px]">
                        {evalResult.score}/10
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-bold font-['Manrope'] text-[#1B1C19] line-clamp-2">
                    {idx + 1}. {q.question}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#707974]">
                    <span>{hasAnswer ? 'Answer drafted' : 'Unanswered'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Question & Practice Interface */}
          <div className="lg:col-span-8 space-y-6">
            {activeQuestion && (
              <div className="bg-[#FFFFFF] p-6 md:p-8 rounded-2xl border border-[#BEC9C4]/40 bento-shadow space-y-6">
                {/* Question Header */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#E8F5E9] text-[#1B5E20] border border-[#A5D6A7]">
                        {activeQuestion.category}
                      </span>
                      {activeQuestion.isSourced ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E0F2F1] text-[#005144] border border-[#80CBC4] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          Sourced: {activeQuestion.sourceCompany}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF9F4] text-[#53615D] border border-[#BEC9C4]">
                          Practice Question
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] font-bold text-[#707974] font-['Inter']">
                      Level: {activeQuestion.difficulty || difficulty}
                    </span>
                  </div>

                  <h3 className="text-[20px] md:text-[22px] font-bold text-[#005144] font-['Manrope'] leading-snug">
                    {activeQuestion.question}
                  </h3>

                  {activeQuestion.whyAsked && (
                    <div className="mt-3 p-3 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/30 text-[13px] text-[#3F4945] font-['Inter']">
                      <strong className="text-[#005144]">Why an interviewer asks this:</strong> {activeQuestion.whyAsked}
                    </div>
                  )}

                  {activeQuestion.keyPoints && activeQuestion.keyPoints.length > 0 && (
                    <div className="mt-3 text-[13px] font-['Inter']">
                      <span className="font-bold text-[#005144]">Key points to cover:</span>
                      <ul className="list-disc list-inside text-[#53615D] mt-1 space-y-0.5">
                        {activeQuestion.keyPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Answer Draft Input */}
                <div>
                  <label className="block text-[14px] font-bold font-['Manrope'] text-[#005144] mb-2">
                    Your Practice Response:
                  </label>
                  <textarea
                    rows={6}
                    value={activeAnswer}
                    onChange={(e) => setAnswers({ ...answers, [activeQuestion.id]: e.target.value })}
                    placeholder="Type how you would explain this to an interviewer. Include technical choices, trade-offs, and your direct role..."
                    className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-4 text-[14px] font-['Inter'] text-[#1B1C19] focus:ring-2 focus:ring-[#005144] focus:outline-none"
                  />

                  {evalError && (
                    <div className="mt-2 p-3 bg-[#FFEBEE] border border-[#EF9A9A] text-[#C62828] rounded-xl text-[13px]">
                      {evalError}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[12px] text-[#707974] font-['Inter']">
                      {activeAnswer.split(/\s+/).filter(Boolean).length} words
                    </span>

                    <button
                      type="button"
                      disabled={isEvaluating || !activeAnswer.trim()}
                      onClick={() => handleEvaluateAnswer(activeQuestion.id)}
                      className="px-6 py-2.5 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[13px] font-bold font-['Inter'] transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${isEvaluating ? 'animate-spin' : ''}`}>
                        {isEvaluating ? 'sync' : 'fact_check'}
                      </span>
                      <span>{isEvaluating ? 'Scoring Answer...' : 'Evaluate Answer'}</span>
                    </button>
                  </div>
                </div>

                {/* Real Evaluation Feedback Card */}
                {activeEvaluation && (
                  <div className="pt-6 border-t border-[#BEC9C4]/30 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FAF9F4] rounded-2xl border border-[#BEC9C4]/40">
                      <div>
                        <div className="text-[12px] font-bold uppercase tracking-wider text-[#707974] font-['Inter']">
                          Evaluated Score
                        </div>
                        <div className="text-[32px] font-extrabold text-[#005144] font-['Manrope'] leading-none mt-1">
                          {activeEvaluation.score} <span className="text-[18px] font-normal text-[#707974]">/ 10</span>
                        </div>
                      </div>

                      <div className="text-right sm:max-w-md">
                        <span className="px-3 py-1 bg-[#D6E6E0] text-[#005144] rounded-full text-[12px] font-bold font-['Inter']">
                          Rubric Evaluation
                        </span>
                        <p className="text-[13px] text-[#3F4945] font-['Inter'] mt-1 text-left sm:text-right">
                          {activeEvaluation.explanation}
                        </p>
                      </div>
                    </div>

                    {/* Strengths & Improvements Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#E8F5E9]/50 rounded-xl border border-[#A5D6A7]">
                        <div className="font-bold text-[#1B5E20] text-[13px] mb-2 flex items-center gap-1.5 font-['Inter']">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Strengths
                        </div>
                        <ul className="list-disc list-inside text-[13px] text-[#2E7D32] space-y-1 font-['Inter']">
                          {activeEvaluation.strengths.map((str, i) => (
                            <li key={i}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-[#FFEBEE]/50 rounded-xl border border-[#EF9A9A]">
                        <div className="font-bold text-[#C62828] text-[13px] mb-2 flex items-center gap-1.5 font-['Inter']">
                          <span className="material-symbols-outlined text-[16px]">error</span>
                          Points to Improve
                        </div>
                        <ul className="list-disc list-inside text-[13px] text-[#B71C1C] space-y-1 font-['Inter']">
                          {activeEvaluation.missingPoints.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Improved Sample Answer */}
                    {activeEvaluation.improvedAnswer && (
                      <div className="p-4 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/40">
                        <div className="font-bold text-[#005144] text-[13px] mb-1 flex items-center gap-1.5 font-['Inter']">
                          <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                          Exemplar Model Answer:
                        </div>
                        <p className="text-[13px] text-[#3F4945] font-['Inter'] leading-relaxed">
                          {activeEvaluation.improvedAnswer}
                        </p>
                      </div>
                    )}

                    <div className="text-[11px] text-[#707974] italic font-['Inter'] text-center pt-2">
                      Notice: AI-generated evaluations are practice feedback for learning and do not guarantee interview outcomes.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
