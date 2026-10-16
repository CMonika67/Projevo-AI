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
  
  // Track raw File object or preset selected file
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>({
    name: 'data_processor.py',
    content: 'import pandas as pd\nimport numpy as np\n\ndef clean_dataset(filepath):\n    try:\n        raw_data = pd.read_csv(filepath)\n        cleaned_subset = raw_data.dropna()\n    except FileNotFoundError:\n        print("File missing!")\n    return cleaned_subset.groupby("id").sum()'
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Analysis checklist state
  const [analysisSteps, setAnalysisSteps] = useState<{ label: string; status: 'pending' | 'active' | 'done' }[]>([
    { label: 'Uploading project...', status: 'pending' },
    { label: 'File received', status: 'pending' },
    { label: 'Project structure analyzed', status: 'pending' },
    { label: 'Checking code quality', status: 'pending' },
    { label: 'Checking security', status: 'pending' },
    { label: 'Checking accessibility', status: 'pending' },
    { label: 'Checking performance', status: 'pending' },
    { label: 'Preparing report', status: 'pending' }
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate extension
      const allowedExts = /\.(py|js|ts|tsx|json|zip|txt)$/i;
      if (!allowedExts.test(file.name)) {
        setUploadError('Invalid file type. Please upload a ZIP archive or a supported source file (.py, .js, .ts, .tsx, .json, .txt).');
        setRawFile(null);
        setSelectedFile(null);
        return;
      }

      // Validate file size (10MB max limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('File size exceeds the 10MB limit.');
        setRawFile(null);
        setSelectedFile(null);
        return;
      }

      setUploadError(null);
      setRawFile(file);
      setSelectedFile({ name: file.name, content: '[Binary Data / Source Code Archive]' });

      // If ZIP file, auto-set suggestions
      if (file.name.toLowerCase().endsWith('.zip')) {
        setTechStack('ZIP Archive Project');
      } else if (file.name.toLowerCase().endsWith('.py')) {
        setTechStack('Python Script');
      } else if (file.name.toLowerCase().endsWith('.js') || file.name.toLowerCase().endsWith('.ts')) {
        setTechStack('JavaScript / TypeScript File');
      }
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setUploadError(null);

    // Initialize progress step sequence
    setAnalysisSteps([
      { label: 'Uploading project...', status: 'active' },
      { label: 'File received', status: 'pending' },
      { label: 'Project structure analyzed', status: 'pending' },
      { label: 'Checking code quality', status: 'pending' },
      { label: 'Checking security', status: 'pending' },
      { label: 'Checking accessibility', status: 'pending' },
      { label: 'Checking performance', status: 'pending' },
      { label: 'Preparing report', status: 'pending' }
    ]);

    // Timed step updates for beautiful user feedback
    const timers: number[] = [];
    const triggerStepTransition = (idx: number, delay: number) => {
      const t = window.setTimeout(() => {
        setAnalysisSteps((prev) =>
          prev.map((step, i) =>
            i === idx - 1 ? { ...step, status: 'done' } :
            i === idx ? { ...step, status: 'active' } : step
          )
        );
      }, delay);
      timers.push(t);
    };

    triggerStepTransition(1, 500);   // File received
    triggerStepTransition(2, 1000);  // Structure analyzed
    triggerStepTransition(3, 1600);  // Checking quality
    triggerStepTransition(4, 2200);  // Checking security
    triggerStepTransition(5, 2800);  // Checking accessibility
    triggerStepTransition(6, 3300);  // Checking performance
    triggerStepTransition(7, 3800);  // Preparing report

    try {
      const formData = new FormData();
      if (rawFile) {
        formData.append('file', rawFile);
      } else if (selectedFile) {
        const blob = new Blob([selectedFile.content], { type: 'text/plain' });
        formData.append('file', blob, selectedFile.name);
      } else {
        throw new Error('No files or preset code available.');
      }

      formData.append('stack', techStack);
      formData.append('description', description);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Wait for visual steps transition to complete
        const finalTimer = window.setTimeout(() => {
          setAnalysisSteps((prev) => prev.map((step) => ({ ...step, status: 'done' })));
          
          window.setTimeout(() => {
            setIsAnalyzing(false);
            onDiagnosticComplete({
              overallHealth: data.overallHealth,
              categories: data.categories,
              criticalIssues: data.criticalIssues || [],
            });
            onNavigate('health-report');
          }, 400);
        }, 4100);
        timers.push(finalTimer);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Server diagnostic run failed.');
      }
    } catch (err: any) {
      timers.forEach((t) => clearTimeout(t));
      setUploadError(err.message || 'Diagnostic run encountered an error.');
      setIsAnalyzing(false);
    }
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

          <label className="flex-1 border-2 border-dashed border-[#BEC9C4] rounded-xl flex flex-col items-center justify-center p-8 md:p-12 bg-[#F5F4EF] hover:bg-[#EFEEE9] transition-all group cursor-pointer relative min-h-[220px]">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              accept=".py,.js,.ts,.tsx,.json,.zip,.txt"
              disabled={isAnalyzing}
            />
            <div className="w-16 h-16 bg-[#176B5B] text-white rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-xs">
              <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
            </div>
            <p className="text-[20px] font-bold font-['Manrope'] text-[#005144] mb-1.5 text-center">
              Drag &amp; Drop or Browse
            </p>
            <p className="text-[13px] text-[#3F4945] text-center max-w-sm">
              Supported files: ZIP archives (.zip), Python scripts (.py), JS/TS files, or manifest JSONs.
            </p>
            <div className="mt-6 px-6 py-2.5 bg-[#005144] text-white rounded-lg text-[13px] font-bold font-['Inter'] shadow-sm group-hover:bg-[#166A5A] transition-colors">
              Select Files
            </div>
          </label>

          {uploadError && (
            <div className="mt-4 p-3.5 bg-[#FFDAD6] text-[#7C2E1D] border border-[#FFB4A4]/40 rounded-xl text-[13px] font-semibold">
              {uploadError}
            </div>
          )}

          {/* Preset Sample Code Quick Selector */}
          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-[#BEC9C4]/30">
            <span className="text-[12px] font-bold text-[#6F7975]">Sample Code:</span>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => {
                setRawFile(null);
                setSelectedFile({
                  name: 'data_processor.py',
                  content: 'import pandas as pd\nimport numpy as np\n\ndef clean_dataset(filepath):\n    try:\n        raw_data = pd.read_csv(filepath)\n        cleaned_subset = raw_data.dropna()\n    except FileNotFoundError:\n        print("File missing!")\n    return cleaned_subset.groupby("id").sum()'
                });
                setTechStack('Python, Pandas, NumPy');
                setUploadError(null);
              }}
              className="px-3 py-1 bg-[#F5F4EF] hover:bg-[#D6E6E0] rounded-md text-[12px] text-[#005144] font-medium border border-[#BEC9C4]/40 cursor-pointer disabled:opacity-50"
            >
              data_processor.py
            </button>
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={() => {
                setRawFile(null);
                setSelectedFile({
                  name: 'auth_service.py',
                  content: 'def handle_login(request):\n    user = db.query(User).filter_by(email=request.email).first()\n    if not verify_password(request.password, user.hash):\n        return {"error": "Invalid credentials"}'
                });
                setTechStack('Python, FastAPI, SQLAlchemy');
                setUploadError(null);
              }}
              className="px-3 py-1 bg-[#F5F4EF] hover:bg-[#D6E6E0] rounded-md text-[12px] text-[#005144] font-medium border border-[#BEC9C4]/40 cursor-pointer disabled:opacity-50"
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
                  disabled={isAnalyzing}
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="e.g. React, Node.js, Python"
                  className="w-full h-12 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-4 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] transition-all disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1.5">
                  Project Description (Optional)
                </label>
                <textarea
                  rows={3}
                  disabled={isAnalyzing}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe what the project is supposed to do..."
                  className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-4 text-[14px] font-['Manrope'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] transition-all resize-none disabled:opacity-75"
                />
              </div>
            </div>
          </div>

          <div className="mt-8">
            {/* Analysis progress checklist */}
            {isAnalyzing && (
              <div className="mb-4 p-4 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/40 space-y-2 animate-fadeIn">
                <h4 className="text-[12px] font-bold text-[#005144] uppercase tracking-wider mb-2">
                  Diagnostic Progress Checklist:
                </h4>
                <div className="space-y-1.5">
                  {analysisSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[12px]">
                      {step.status === 'done' && (
                        <span className="material-symbols-outlined text-[#2E8B70] text-[15px] filled">check_circle</span>
                      )}
                      {step.status === 'active' && (
                        <span className="material-symbols-outlined text-[#D6A84F] text-[15px] animate-spin">progress_activity</span>
                      )}
                      {step.status === 'pending' && (
                        <span className="material-symbols-outlined text-[#6F7975] text-[15px]">circle</span>
                      )}
                      <span className={`${
                        step.status === 'done' ? 'text-[#3F4945] font-medium' :
                        step.status === 'active' ? 'text-[#005144] font-bold' :
                        'text-[#6F7975]'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            <p className="text-[12px] text-center text-[#6F7975] mt-3">
              Powered by Projevo AI Diagnostic Engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
