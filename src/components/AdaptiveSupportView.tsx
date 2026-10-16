import React, { useState } from 'react';
import { StruggleMetrics, ScreenType } from '../types';
import { sampleCodeSnippet } from '../data';

interface AdaptiveSupportViewProps {
  metrics: StruggleMetrics;
  onNavigate: (screen: ScreenType) => void;
}

export const AdaptiveSupportView: React.FC<AdaptiveSupportViewProps> = ({
  metrics,
  onNavigate,
}) => {
  const [code, setCode] = useState<string>(sampleCodeSnippet);
  const [hintLevel, setHintLevel] = useState<number>(1);
  const [hintsList, setHintsList] = useState<string[]>([
    "Check whether the variable cleaned_subset is initialized before this function attempts to return it. What happens if the except block executes?",
    "When a FileNotFoundError occurs in the try block, the line 'cleaned_subset = raw_data.dropna()' is skipped entirely. Python then tries to access cleaned_subset on line 19 where it does not yet exist.",
    "Solution Pattern: Initialize `cleaned_subset = pd.DataFrame()` before entering the `try` block, or add `return pd.DataFrame()` inside the `except` handler."
  ]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiAnswers, setAiAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [runOutput, setRunOutput] = useState<{ status: 'error' | 'success'; message: string } | null>({
    status: 'error',
    message: "NameError: name 'cleaned_subset' is not defined on line 19\n  at clean_dataset ('data.csv')\n  in return cleaned_subset.groupby('id').sum()"
  });
  const [isCodePatched, setIsCodePatched] = useState(false);

  const handleNextHint = async () => {
    if (hintLevel < 3) {
      setHintLevel((prev) => prev + 1);
    } else {
      // Re-query AI hint
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/adaptive-hint', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ code, currentError: 'NameError on line 19', hintLevel: 3 })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.hint) {
            setHintsList((prev) => [...prev, data.hint]);
            setHintLevel((prev) => prev + 1);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleApplyFix = () => {
    const fixedCode = `import pandas as pd
import numpy as np

def clean_dataset(filepath):
    # Initialize an empty dataframe to safely prevent uninitialized access
    cleaned_subset = pd.DataFrame()
    
    try:
        raw_data = pd.read_csv(filepath)
        if raw_data.empty:
            return pd.DataFrame()
            
        # Complex filtering logic here...
        cleaned_subset = raw_data.dropna()
        
    except FileNotFoundError:
        print("Warning: File missing! Returning empty aggregated subset.")
        return pd.DataFrame(columns=['id', 'value'])
        
    # Validated reference safely aggregated
    return cleaned_subset.groupby('id').sum()

if __name__ == '__main__':
    results = clean_dataset('data.csv')
    print("Execution Clean:", results)`;

    setCode(fixedCode);
    setIsCodePatched(true);
    setRunOutput({
      status: 'success',
      message: '✓ Code executed successfully with 0 errors.\nReturn Type: pd.DataFrame (Aggregated groupby result)'
    });
  };

  const handleRunCode = () => {
    if (code.includes('cleaned_subset = pd.DataFrame()') || isCodePatched) {
      setRunOutput({
        status: 'success',
        message: '✓ Code executed successfully with 0 errors.\nReturn Type: pd.DataFrame (Aggregated groupby result)'
      });
    } else {
      setRunOutput({
        status: 'error',
        message: "NameError: name 'cleaned_subset' is not defined on line 19\n  at clean_dataset ('data.csv')\n  in return cleaned_subset.groupby('id').sum()"
      });
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    setIsAskingAi(true);
    const q = customQuestion;
    setCustomQuestion('');

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/adaptive-hint', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ code, currentError: q, hintLevel: 2 })
      });
      if (res.ok) {
        const data = await res.json();
        setAiAnswers((prev) => [...prev, { question: q, answer: data.hint }]);
      } else {
        setAiAnswers((prev) => [...prev, {
          question: q,
          answer: "In Python, variables declared inside an inner block (like a try suite) that fails before assignment will remain undefined in subsequent lines."
        }]);
      }
    } catch {
      setAiAnswers((prev) => [...prev, {
        question: q,
        answer: "To handle this gracefully, always ensure your fallback branches (except, else, finally) either return a default object or raise a clear domain exception."
      }]);
    } finally {
      setIsAskingAi(false);
    }
  };

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
          <h1 className="text-[24px] md:text-[34px] font-bold font-['Manrope'] text-[#1B1C19] flex items-center gap-2">
            <span>🧠</span>
            <span>Adaptive Student Support</span>
          </h1>
          <p className="text-[15px] text-[#3F4945] font-['Manrope'] max-w-2xl mt-1">
            Real-time analysis and contextual guidance to unblock your current coding challenge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleApplyFix}
            className="px-4 py-2 bg-[#D6E6E0] hover:bg-[#BACAC4] text-[#005144] rounded-lg text-[13px] font-bold font-['Inter'] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
            <span>Auto-Patch Code</span>
          </button>
          <button
            onClick={handleRunCode}
            className="px-4 py-2 bg-[#005144] hover:bg-[#176B5B] text-white rounded-lg text-[13px] font-bold font-['Inter'] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>Run Code</span>
          </button>
        </div>
      </div>

      {/* Top Row: Stats & Struggle Score Bento (Matching Image 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Panel (2/3 width, 4 metric cards) */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/30 flex flex-col justify-center items-center hover:-translate-y-0.5 transition-all">
            <span className="text-[28px] font-bold font-['Manrope'] text-[#7C2E1D] mb-1">
              {metrics.errorsCount}
            </span>
            <span className="text-[12px] font-bold font-['Inter'] text-[#3F4945] text-center">
              Errors
            </span>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/30 flex flex-col justify-center items-center hover:-translate-y-0.5 transition-all">
            <span className="text-[28px] font-bold font-['Manrope'] text-[#1B1C19] mb-1">
              {metrics.failedRuns}
            </span>
            <span className="text-[12px] font-bold font-['Inter'] text-[#3F4945] text-center">
              Failed Runs
            </span>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/30 flex flex-col justify-center items-center hover:-translate-y-0.5 transition-all">
            <span className="text-[28px] font-bold font-['Manrope'] text-[#1B1C19] mb-1">
              {metrics.repeatedEdits}
            </span>
            <span className="text-[12px] font-bold font-['Inter'] text-[#3F4945] text-center">
              Repeated Edits
            </span>
          </div>

          <div className="bg-[#FFFFFF] rounded-2xl p-6 bento-shadow border border-[#BEC9C4]/30 flex flex-col justify-center items-center hover:-translate-y-0.5 transition-all">
            <span className="text-[28px] font-bold font-['Manrope'] text-[#1B1C19] mb-1">
              {metrics.timeStuckMin} min
            </span>
            <span className="text-[12px] font-bold font-['Inter'] text-[#3F4945] text-center">
              Time Stuck
            </span>
          </div>
        </div>

        {/* Struggle Score Metric (1/3 width, Coral/Amber card) */}
        <div className="bg-[#FFDAD3] rounded-2xl p-6 bento-shadow border border-[#FFB4A4] flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-[#7C2E1D]/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative z-10">
            <h3 className="text-[18px] font-bold font-['Manrope'] text-[#3D0600] mb-1">
              Struggle Score
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D95F59] animate-pulse"></span>
              <p className="text-[13px] font-medium font-['Manrope'] text-[#7C2E1D]">
                {isCodePatched ? 'Challenge Resolved' : metrics.status}
              </p>
            </div>
          </div>

          {/* SVG Score Gauge */}
          <div className="relative w-20 h-20 flex items-center justify-center shrink-0 z-10">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 36 36">
              <path
                className="text-[#3D0600]/20"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <defs>
                <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D6A84F" />
                  <stop offset="100%" stopColor="#D95F59" />
                </linearGradient>
              </defs>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="url(#score-gradient)"
                strokeDasharray={`${isCodePatched ? 10 : metrics.struggleScore}, 100`}
                strokeLinecap="round"
                strokeWidth="3"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[17px] font-bold font-['Manrope'] text-[#3D0600] leading-none">
                {isCodePatched ? 10 : metrics.struggleScore}
              </span>
              <span className="text-[10px] font-semibold font-['Inter'] text-[#7C2E1D] leading-none mt-0.5">
                /100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor & AI Hint Row (Matching Image 7 layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[520px]">
        {/* Left: Code Editor Interface */}
        <div className="bg-[#176B5B] rounded-2xl shadow-md flex flex-col overflow-hidden border border-[#005144]">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#166A5A]/50 bg-[#176B5B]/90 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#89D5C1] text-[18px]">code</span>
              <span className="text-[13px] font-bold font-['JetBrains_Mono'] text-[#A5F1DD]">
                data_processor.py
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#89D5C1]/40"></div>
              <div className="w-3 h-3 rounded-full bg-[#89D5C1]/40"></div>
              <div className="w-3 h-3 rounded-full bg-[#89D5C1]/40"></div>
            </div>
          </div>

          {/* Editable Code Box */}
          <div className="flex-1 p-5 overflow-y-auto bg-[#176B5B] text-[#E3F2ED] font-mono text-[13px] leading-relaxed relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full min-h-[340px] bg-transparent text-[#E3F2ED] font-['JetBrains_Mono'] resize-none focus:outline-none leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Execution Trace Box */}
          {runOutput && (
            <div
              className={`p-3.5 border-t text-[12px] font-mono ${
                runOutput.status === 'error'
                  ? 'bg-[#7C2E1D]/40 text-[#FFDAD3] border-[#FFB4A4]/40'
                  : 'bg-[#2E8B70]/30 text-[#A5F1DD] border-[#2E8B70]/40'
              }`}
            >
              <pre className="whitespace-pre-wrap">{runOutput.message}</pre>
            </div>
          )}
        </div>

        {/* Right: Projevo AI Contextual Analysis Panel */}
        <div className="bg-[#D6E6E0] rounded-2xl p-6 md:p-8 bento-shadow border border-[#BEC9C4]/40 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#005144]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[#005144] text-[26px] filled">
                auto_awesome
              </span>
            </div>
            <div>
              <h2 className="text-[22px] font-bold font-['Manrope'] text-[#101E1B]">
                Projevo AI
              </h2>
              <p className="text-[11px] font-bold font-['Inter'] text-[#005144] tracking-wider uppercase mt-0.5">
                Contextual Analysis
              </p>
            </div>
          </div>

          {/* AI Hint Bubble */}
          <div className="bg-[#FFFFFF] rounded-2xl p-6 border border-[#BEC9C4]/30 relative z-10 mb-4 shadow-xs">
            <p className="text-[16px] font-['Manrope'] text-[#1B1C19] leading-relaxed">
              {isCodePatched
                ? 'Great job! The uninitialized reference has been resolved safely with default fallback handling.'
                : 'I noticed your code failed on line 19 with a '}
              {!isCodePatched && (
                <code className="text-[12px] font-bold font-mono bg-[#FFDAD6] text-[#93000A] px-2 py-0.5 rounded shadow-2xs">
                  NameError
                </code>
              )}
              {!isCodePatched && '.'}
            </p>

            <div className="mt-4 p-4 bg-[#A5F1DD]/30 border-l-4 border-[#005144] rounded-r-xl">
              <p className="text-[14px] font-['Manrope'] text-[#1B1C19] leading-relaxed">
                <span className="font-bold text-[#005144] mr-1.5">
                  Hint (Level {Math.min(hintLevel, hintsList.length)}):
                </span>
                {hintsList[Math.min(hintLevel - 1, hintsList.length - 1)]}
              </p>
            </div>
          </div>

          {/* Dynamic Q&A History */}
          {aiAnswers.length > 0 && (
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1 relative z-10">
              {aiAnswers.map((qa, i) => (
                <div key={i} className="bg-white/80 rounded-xl p-3.5 text-[13px] border border-[#BEC9C4]/30">
                  <p className="font-bold text-[#005144] mb-1">Q: {qa.question}</p>
                  <p className="text-[#3F4945]">{qa.answer}</p>
                </div>
              ))}
            </div>
          )}

          {/* Custom Question Input */}
          <form onSubmit={handleAskQuestion} className="relative z-10 mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ask Projevo AI a specific question about this error..."
                className="flex-1 bg-white border border-[#BEC9C4] rounded-xl px-4 py-2.5 text-[13px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144]"
              />
              <button
                type="submit"
                disabled={isAskingAi || !customQuestion.trim()}
                className="px-4 py-2.5 bg-[#005144] text-white rounded-xl text-[12px] font-bold font-['Inter'] hover:bg-[#176B5B] transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isAskingAi ? 'Thinking...' : 'Ask AI'}
              </button>
            </div>
          </form>

          {/* Action Footer */}
          <div className="mt-auto pt-4 border-t border-[#BEC9C4]/40 flex justify-between items-center relative z-10">
            <span className="text-[12px] text-[#53615D] font-['Inter']">
              Hint step {Math.min(hintLevel, hintsList.length)} of 3
            </span>
            <button
              onClick={handleNextHint}
              className="group bg-[#005144] hover:bg-[#176B5B] text-white px-6 py-3 rounded-full text-[13px] font-bold font-['Inter'] shadow-sm transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform duration-300">
                auto_awesome
              </span>
              <span>Need Another Hint</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
