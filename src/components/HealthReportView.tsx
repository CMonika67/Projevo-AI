import React, { useState } from 'react';
import { HealthCategory, CriticalIssue, ScreenType } from '../types';

interface HealthReportViewProps {
  categories: HealthCategory[];
  criticalIssues: CriticalIssue[];
  overallScore?: number;
  onNavigate: (screen: ScreenType) => void;
  onOpenAdaptiveSupport: () => void;
}

export const HealthReportView: React.FC<HealthReportViewProps> = ({
  categories,
  criticalIssues,
  overallScore = 81,
  onNavigate,
  onOpenAdaptiveSupport,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<CriticalIssue | null>(null);
  const [showIssuesModal, setShowIssuesModal] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]);

  // Gauge calculation: 2 * PI * 42 ~= 263.89
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const handleApplyFix = (issueId: string) => {
    setAppliedFixes((prev) => [...prev, issueId]);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
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
        <h1 className="text-[26px] md:text-[36px] font-bold font-['Manrope'] text-[#005144]">
          Project Health Report
        </h1>
        <p className="text-[15px] md:text-[16px] text-[#3F4945] font-['Manrope'] mt-1">
          Comprehensive analysis of your project's technical standing.
        </p>
      </div>

      {/* Hero Metric Card (Matching Image 5) */}
      <section className="bg-[#FFFFFF] rounded-2xl p-6 md:p-10 bento-shadow border border-[#E3E3DE] flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Gauge Visualization */}
        <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              className="text-[#EFEEE9]"
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
            />
            {/* Progress Track */}
            <circle
              className="text-[#176B5B] transition-all duration-1000 ease-out"
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="11"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          {/* Center Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[44px] font-extrabold font-['Manrope'] text-[#005144] leading-none">
              {overallScore}
            </span>
            <span className="text-[13px] font-bold font-['Inter'] text-[#6F7975] mt-1">
              / 100
            </span>
          </div>
        </div>

        {/* Status & Action Description */}
        <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
          <div className="inline-flex items-center gap-2 bg-[#D6E6E0] px-3.5 py-1.5 rounded-full mb-3">
            <span className="material-symbols-outlined text-[16px] text-[#26332F]">check_circle</span>
            <span className="text-[12px] font-bold font-['Inter'] text-[#26332F]">
              Healthy with improvements needed
            </span>
          </div>

          <h2 className="text-[24px] font-bold font-['Manrope'] text-[#005144] mb-2">
            Overall Project Health
          </h2>

          <p className="text-[15px] text-[#3F4945] font-['Manrope'] max-w-xl mb-6 leading-relaxed">
            Your project architecture is solid. We've detected a few critical areas requiring immediate
            attention to ensure long-term stability, performance, and security.
          </p>

          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <button
              onClick={() => setShowIssuesModal(true)}
              className="bg-[#176B5B] hover:bg-[#005144] text-white transition-all rounded-lg px-6 py-3 text-[13px] font-bold font-['Inter'] flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>View Critical Issues ({criticalIssues.length})</span>
            </button>

            <button
              onClick={onOpenAdaptiveSupport}
              className="bg-[#D6E6E0] hover:bg-[#BACAC4] text-[#005144] transition-all rounded-lg px-5 py-3 text-[13px] font-bold font-['Inter'] flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
              <span>Open Code Assistant</span>
            </button>
          </div>
        </div>
      </section>

      {/* Category Cards Grid (Bento matching Image 5) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const isCritical = cat.status === 'critical';
          const isNeedsAttention = cat.status === 'needs-attention';

          return (
            <div
              key={cat.name}
              onClick={() => {
                const match = criticalIssues.find((i) => i.category.toLowerCase().includes(cat.name.toLowerCase()));
                if (match) {
                  setSelectedIssue(match);
                } else {
                  setShowIssuesModal(true);
                }
              }}
              className={`rounded-2xl p-6 md:p-8 bento-shadow border transition-all duration-200 flex flex-col cursor-pointer group hover:-translate-y-1 ${
                isCritical
                  ? 'bg-gradient-to-br from-[#FFFFFF] to-[#FFDAD6]/40 border-[#D95F59]/40 hover:border-[#D95F59]'
                  : 'bg-[#FFFFFF] border-[#E3E3DE] hover:border-[#BEC9C4]'
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                    isCritical
                      ? 'bg-[#FFDAD6] text-[#D95F59]'
                      : 'bg-[#F5F4EF] text-[#176B5B] group-hover:bg-[#D6E6E0]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">{cat.icon}</span>
                </div>
                <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144]">
                  {cat.name}
                </h3>
              </div>

              <div className="mt-auto">
                <div
                  className={`text-[44px] font-bold font-['Manrope'] mb-1 ${
                    isCritical ? 'text-[#D95F59]' : 'text-[#005144]'
                  }`}
                >
                  {cat.score}
                </div>

                <div className="flex items-center gap-2 text-[12px] font-bold font-['Inter']">
                  {isCritical ? (
                    <span className="inline-flex items-center gap-1.5 text-[#D95F59]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D95F59] animate-pulse"></span>
                      Critical
                    </span>
                  ) : isNeedsAttention ? (
                    <span className="inline-flex items-center gap-1.5 text-[#D6A84F]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D6A84F]"></span>
                      Needs Attention
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#2E8B70]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2E8B70]"></span>
                      Good
                    </span>
                  )}
                </div>

                {cat.note && (
                  <p className="text-[12px] text-[#6F7975] mt-2 line-clamp-1">{cat.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Critical Issues Modal / Drawer */}
      {(showIssuesModal || selectedIssue) && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => {
            setShowIssuesModal(false);
            setSelectedIssue(null);
          }}
        >
          <div
            className="bg-[#FAF9F4] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 bento-shadow border border-[#BEC9C4]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFDAD6] flex items-center justify-center text-[#D95F59]">
                  <span className="material-symbols-outlined text-[22px]">warning</span>
                </div>
                <div>
                  <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144]">
                    Detected Critical Issues
                  </h3>
                  <p className="text-[13px] text-[#3F4945]">
                    Prioritized remediation guide for your project code
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowIssuesModal(false);
                  setSelectedIssue(null);
                }}
                className="p-1.5 text-[#6F7975] hover:text-[#005144] rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {criticalIssues.map((issue) => {
                const isFixed = appliedFixes.includes(issue.id);
                return (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isFixed
                        ? 'bg-[#D6E6E0]/40 border-[#2E8B70]'
                        : issue.severity === 'Critical'
                        ? 'bg-[#FFDAD6]/30 border-[#D95F59]/40'
                        : 'bg-[#FFFFFF] border-[#BEC9C4]/40'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold font-['Inter'] px-2 py-0.5 rounded-full ${
                            issue.severity === 'Critical'
                              ? 'bg-[#D95F59] text-white'
                              : 'bg-[#D6A84F] text-[#1B1C19]'
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-[12px] font-bold text-[#6F7975]">Line {issue.line}</span>
                      </div>

                      {isFixed ? (
                        <span className="text-[12px] font-bold text-[#2E8B70] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Patched
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyFix(issue.id)}
                          className="px-3 py-1 bg-[#176B5B] hover:bg-[#005144] text-white rounded-md text-[11px] font-bold font-['Inter'] transition-colors"
                        >
                          Auto-Fix with AI
                        </button>
                      )}
                    </div>

                    <h4 className="text-[15px] font-bold font-['Manrope'] text-[#1B1C19] mb-1">
                      {issue.title}
                    </h4>
                    <p className="text-[13px] text-[#3F4945] mb-3 leading-relaxed">
                      {issue.recommendation}
                    </p>

                    {issue.codeSnippet && (
                      <div className="bg-[#176B5B]/10 rounded-lg p-3 text-[12px] font-mono text-[#005144] overflow-x-auto">
                        <pre>{issue.codeSnippet}</pre>
                      </div>
                    )}

                    {isFixed && issue.suggestedPatch && (
                      <div className="mt-3 p-3 bg-[#2E8B70]/10 border-l-4 border-[#2E8B70] rounded-r-lg">
                        <p className="text-[11px] font-bold text-[#2E8B70] mb-1">Applied AI Patch:</p>
                        <pre className="text-[12px] font-mono text-[#005144]">{issue.suggestedPatch}</pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#BEC9C4]/30">
              <button
                onClick={() => {
                  setShowIssuesModal(false);
                  onOpenAdaptiveSupport();
                }}
                className="px-5 py-2.5 bg-[#005144] hover:bg-[#176B5B] text-white font-bold rounded-lg text-[13px] font-['Inter'] flex items-center gap-2"
              >
                <span>Jump into Code Sandbox</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
