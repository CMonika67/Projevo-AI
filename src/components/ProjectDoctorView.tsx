import React, { useState } from 'react';
import { ScreenType, HealthCategory, CriticalIssue } from '../types';

interface ProjectDoctorViewProps {
  onNavigate: (screen: ScreenType) => void;
  onDiagnosticComplete: (data: {
    overallHealth: number;
    categories: HealthCategory[];
    criticalIssues: CriticalIssue[];
  }) => void;
}

export const ProjectDoctorView: React.FC<ProjectDoctorViewProps> = ({
  onNavigate,
  onDiagnosticComplete,
}) => {
  const [techStack, setTechStack] = useState('Python, FastAPI, PyTorch, Pandas');
  const [description, setDescription] = useState(
    'AI Healthcare Assistant: Clinical triage and symptom entity extraction pipeline with role-based dashboard.'
  );
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>({
    name: 'data_processor.py',
    content: 'import pandas as pd\nimport numpy as np\n\ndef clean_dataset(filepath):\n    try:\n        raw_data = pd.read_csv(filepath)\n        cleaned_subset = raw_data.dropna()\n    except FileNotFoundError:\n        print("File missing!")\n    return cleaned_subset.groupby("id").sum()'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setSelectedFile({ name: file.name, content: text });
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisStep('Scanning AST and static security vulnerabilities...');

    try {
      setTimeout(() => setAnalysisStep('Checking concurrency and brute-force defenses...'), 800);
      setTimeout(() => setAnalysisStep('Synthesizing technical health scoring...'), 1600);

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: selectedFile?.content || '',
          stack: techStack,
          description,
          filename: selectedFile?.name || 'main.py'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTimeout(() => {
          setIsAnalyzing(false);
          onDiagnosticComplete({
            overallHealth: data.overallHealth || 81,
            categories: data.categories,
            criticalIssues: data.criticalIssues || []
          });
          onNavigate('health-report');
        }, 2200);
      } else {
        throw new Error('Fallback to default data');
      }
    } catch {
      setTimeout(() => {
        setIsAnalyzing(false);
        onNavigate('health-report');
      }, 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header (Matching Image 9) */}
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

        <h1 className="text-[28px] md:text-[40px] font-bold font-['Manrope'] text-[#005144] flex items-center gap-3">
          <span className="material-symbols-outlined text-[36px] md:text-[44px] text-[#005144]">
            medical_services
          </span>
          <span>Project Doctor</span>
        </h1>
        <p className="text-[16px] text-[#3F4945] font-['Manrope'] mt-1">
          Diagnose your project's technical health.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload Area */}
        <div className="lg:col-span-2 bg-[#FFFFFF] rounded-2xl bento-shadow border border-[#BEC9C4]/40 p-6 md:p-8 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[22px] font-bold font-['Manrope'] text-[#005144]">
              Upload Artifacts
            </h2>
            {selectedFile && (
              <span className="px-3 py-1 bg-[#D6E6E0] text-[#005144] text-[12px] font-bold font-['Inter'] rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                {selectedFile.name}
              </span>
            )}
          </div>

          <label className="flex-1 border-2 border-dashed border-[#BEC9C4] rounded-xl flex flex-col items-center justify-center p-8 md:p-12 bg-[#F5F4EF] hover:bg-[#EFEEE9] transition-all group cursor-pointer relative">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".py,.js,.ts,.tsx,.json,.zip,.txt"
            />
            <div className="w-16 h-16 bg-[#176B5B] text-white rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            </div>
            <p className="text-[20px] font-bold font-['Manrope'] text-[#005144] mb-1.5 text-center">
              Drag &amp; Drop or Browse
            </p>
            <p className="text-[13px] text-[#3F4945] text-center max-w-sm">
              Supported files: Python scripts (.py), ZIP archives, or Project manifests.
            </p>
            <div className="mt-6 px-6 py-2.5 bg-[#005144] text-white rounded-lg text-[13px] font-bold font-['Inter'] shadow-sm group-hover:bg-[#166A5A] transition-colors">
              Select Files
            </div>
          </label>

          {/* Preset Sample Code Quick Selector */}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-[#BEC9C4]/30">
            <span className="text-[12px] font-bold text-[#6F7975]">Sample Code:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedFile({
                  name: 'data_processor.py',
                  content: 'import pandas as pd\nimport numpy as np\n\ndef clean_dataset(filepath):\n    try:\n        raw_data = pd.read_csv(filepath)\n        cleaned_subset = raw_data.dropna()\n    except FileNotFoundError:\n        print("File missing!")\n    return cleaned_subset.groupby("id").sum()'
                });
                setTechStack('Python, Pandas, NumPy');
              }}
              className="px-3 py-1 bg-[#F5F4EF] hover:bg-[#D6E6E0] rounded-md text-[12px] text-[#005144] font-medium border border-[#BEC9C4]/40"
            >
              data_processor.py
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedFile({
                  name: 'auth_service.py',
                  content: 'def handle_login(request):\n    user = db.query(User).filter_by(email=request.email).first()\n    if not verify_password(request.password, user.hash):\n        return {"error": "Invalid credentials"}'
                });
                setTechStack('Python, FastAPI, SQLAlchemy');
              }}
              className="px-3 py-1 bg-[#F5F4EF] hover:bg-[#D6E6E0] rounded-md text-[12px] text-[#005144] font-medium border border-[#BEC9C4]/40"
            >
              auth_service.py
            </button>
          </div>
        </div>

        {/* Context & Analysis Panel */}
        <div className="lg:col-span-1 bg-[#FFFFFF] rounded-2xl bento-shadow border border-[#BEC9C4]/40 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-[20px] font-bold font-['Manrope'] text-[#005144] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005144]">tune</span>
              <span>Project Context</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  Technology Stack
                </label>
                <input
                  type="text"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="e.g. React, Node.js, Python"
                  className="w-full h-12 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  Project Description (Optional)
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what the project is supposed to do..."
                  className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-4 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-[#005144] hover:bg-[#166A5A] text-white h-13 rounded-xl text-[14px] font-bold font-['Inter'] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isAnalyzing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                  <span>Running Diagnostic...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  <span>Analyze Project</span>
                </>
              )}
            </button>

            {isAnalyzing && (
              <p className="text-[12px] text-center text-[#176B5B] font-medium mt-2 animate-pulse">
                {analysisStep}
              </p>
            )}

            <p className="text-[12px] text-center text-[#6F7975] mt-3">
              Powered by Projevo AI Diagnostic Engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
