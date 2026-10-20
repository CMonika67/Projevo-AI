import React, { useState } from 'react';
import { ScreenType, HealthCategory, CriticalIssue, ProjectData } from '../types';

interface ProjectDoctorViewProps {
  currentProject?: ProjectData | null;
  onNavigate: (screen: ScreenType) => void;
  onDiagnosticComplete: (data: {
    overallHealth: number;
    categories: HealthCategory[];
    criticalIssues: CriticalIssue[];
  }) => void;
}

export const ProjectDoctorView: React.FC<ProjectDoctorViewProps> = ({
  currentProject,
  onNavigate,
  onDiagnosticComplete,
}) => {
  const [techStack, setTechStack] = useState(
    currentProject?.techStack?.join(', ') || ''
  );
  const [description, setDescription] = useState(
    currentProject?.tagline || ''
  );
  
  // Track raw File object or preset selected file
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size?: number; content: string } | null>(null);

  const [inferredInfo, setInferredInfo] = useState<{
    title?: string;
    description?: string;
    techStack?: string[];
    confidence?: 'high' | 'medium' | 'low';
    architecture?: string;
  } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Analysis checklist state
  const [analysisSteps, setAnalysisSteps] = useState<{ label: string; status: 'pending' | 'active' | 'done' }[]>([
    { label: 'Uploading project artifacts...', status: 'pending' },
    { label: 'Validating file integrity & size', status: 'pending' },
    { label: 'Inferring architecture & dependencies', status: 'pending' },
    { label: 'Checking code quality & maintainability', status: 'pending' },
    { label: 'Auditing security & authentication', status: 'pending' },
    { label: 'Checking accessibility & performance', status: 'pending' },
    { label: 'Preparing grounded diagnostic report', status: 'pending' }
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate extension
      const allowedExts = /\.(py|js|jsx|ts|tsx|java|cpp|c|h|cs|go|rs|php|rb|json|toml|xml|yaml|yml|md|txt|zip)$/i;
      if (!allowedExts.test(file.name)) {
        setUploadError(
          'Unsupported file format. Supported: source code (.py, .js, .jsx, .ts, .tsx, .java, .cpp, .c, .go, .rs), dependency manifests (.json, .toml, .xml, .yaml), docs (.md, .txt), or ZIP archives.'
        );
        setRawFile(null);
        setSelectedFile(null);
        return;
      }

      // Validate file size (10MB max limit)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setUploadError(`File size (${sizeMb}MB) exceeds the maximum allowed limit of 10MB.`);
        setRawFile(null);
        setSelectedFile(null);
        return;
      }

      setUploadError(null);
      setRawFile(file);
      setSelectedFile({
        name: file.name,
        size: file.size,
        content: '[Binary / Source Code Archive Payload]'
      });

      // Quick local inference based on file name & extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      let detectedTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      detectedTitle = detectedTitle.charAt(0).toUpperCase() + detectedTitle.slice(1);

      let detectedStack = 'Custom Application';
      if (ext === 'zip') {
        detectedStack = 'Multi-file Project Archive';
      } else if (ext === 'py') {
        detectedStack = 'Python';
      } else if (ext === 'ts' || ext === 'tsx') {
        detectedStack = 'TypeScript, React';
      } else if (ext === 'js' || ext === 'jsx') {
        detectedStack = 'JavaScript, Node.js';
      } else if (ext === 'json') {
        detectedStack = 'JSON Manifest / Config';
      }

      setInferredInfo({
        title: detectedTitle,
        description: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        techStack: [detectedStack],
        confidence: ext === 'zip' ? 'medium' : 'low',
        architecture: 'Project source artifacts'
      });
      setTechStack(detectedStack);
    }
  };

  const handleRemoveFile = () => {
    setRawFile(null);
    setSelectedFile(null);
    setInferredInfo(null);
    setUploadError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !rawFile) {
      setUploadError('Please select or upload at least one code file or ZIP archive.');
      return;
    }

    setIsAnalyzing(true);
    setUploadError(null);

    setAnalysisSteps([
      { label: 'Uploading project artifacts...', status: 'active' },
      { label: 'Validating file integrity & size', status: 'pending' },
      { label: 'Inferring architecture & dependencies', status: 'pending' },
      { label: 'Checking code quality & maintainability', status: 'pending' },
      { label: 'Auditing security & authentication', status: 'pending' },
      { label: 'Checking accessibility & performance', status: 'pending' },
      { label: 'Preparing grounded diagnostic report', status: 'pending' }
    ]);

    const timers: number[] = [];
    const triggerStep = (idx: number, delay: number) => {
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

    triggerStep(1, 500);
    triggerStep(2, 1000);
    triggerStep(3, 1600);
    triggerStep(4, 2200);
    triggerStep(5, 2800);
    triggerStep(6, 3400);

    try {
      const formData = new FormData();
      if (rawFile) {
        formData.append('file', rawFile);
      } else if (selectedFile) {
        const blob = new Blob([selectedFile.content], { type: 'text/plain' });
        formData.append('file', blob, selectedFile.name);
      }

      formData.append('stack', techStack);
      formData.append('description', description);

      const res = await fetch('/api/diagnose', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
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
        }, 3800);
        timers.push(finalTimer);
      } else {
        const err = await res.json().catch(() => ({}));
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

        <h1 className="text-[28px] md:text-[40px] font-bold font-['Manrope'] text-[#005144] flex items-center gap-3">
          <span className="material-symbols-outlined text-[36px] md:text-[44px] text-[#005144]">
            medical_services
          </span>
          <span>Project Doctor</span>
        </h1>
        <p className="text-[16px] text-[#3F4945] font-['Manrope'] mt-1">
          Upload and diagnose your codebase for architecture, security vulnerabilities, code smells, and performance.
        </p>
      </div>

      {/* Upload Guidance Banner */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#BEC9C4]/40 p-6 bento-shadow space-y-3">
        <div className="flex items-center gap-2 text-[15px] font-bold font-['Manrope'] text-[#005144]">
          <span className="material-symbols-outlined text-[#176B5B] text-[20px]">help_center</span>
          <span>What to Upload &amp; Guidance</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] font-['Inter'] text-[#3F4945]">
          <div className="space-y-1">
            <span className="font-bold text-[#005144]">Useful Inputs:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[#53615D]">
              <li>Source code files: <code>.py</code>, <code>.js</code>, <code>.jsx</code>, <code>.ts</code>, <code>.tsx</code>, <code>.java</code>, <code>.cpp</code>, <code>.go</code>, <code>.rs</code></li>
              <li>Dependency manifests: <code>package.json</code>, <code>requirements.txt</code>, <code>pyproject.toml</code>, <code>pom.xml</code></li>
              <li>Project documentation: <code>README.md</code>, architecture notes</li>
              <li>ZIP archive: Full repository or source tree (extracted securely up to 10MB)</li>
            </ul>
          </div>
          <div className="space-y-1 bg-[#FFF9C4]/30 p-3 rounded-xl border border-[#FFF59D]">
            <span className="font-bold text-[#C62828] flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">security</span>
              Security &amp; Privacy Notice:
            </span>
            <p className="text-[#53615D] text-[12px] leading-relaxed">
              Do <strong>NOT</strong> upload sensitive secrets, production database credentials, API keys (<code>.env</code>), private SSH keys, or certificates. The diagnostic engine inspects static code quality and security patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Upload Area */}
        <div className="lg:col-span-2 bg-[#FFFFFF] rounded-2xl bento-shadow border border-[#BEC9C4]/40 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[20px] font-bold font-['Manrope'] text-[#005144]">
                Upload Artifacts
              </h2>
              <span className="text-[12px] font-bold text-[#707974] font-['Inter'] bg-[#FAF9F4] px-2.5 py-1 rounded-md border border-[#BEC9C4]/50">
                Max Supported: 10 MB
              </span>
            </div>

            {/* Selected File Card */}
            {selectedFile && (
              <div className="mb-4 p-4 bg-[#E8F5E9] border border-[#A5D6A7] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#1B5E20] text-[24px]">description</span>
                  <div>
                    <div className="font-bold text-[#005144] text-[14px] font-['Manrope']">{selectedFile.name}</div>
                    <div className="text-[12px] text-[#53615D] font-['Inter']">
                      {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Preset sample code file'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleRemoveFile}
                  className="px-2.5 py-1 text-[12px] font-bold text-[#C62828] hover:bg-[#FFEBEE] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Drop Zone */}
            <label className="border-2 border-dashed border-[#BEC9C4] rounded-xl flex flex-col items-center justify-center p-8 md:p-12 bg-[#F5F4EF] hover:bg-[#EFEEE9] transition-all group cursor-pointer relative min-h-[200px]">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.go,.rs,.json,.toml,.xml,.yaml,.yml,.md,.txt,.zip"
                disabled={isAnalyzing}
              />
              <div className="w-14 h-14 bg-[#176B5B] text-white rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
              </div>
              <p className="text-[18px] font-bold font-['Manrope'] text-[#005144] mb-1 text-center">
                Drag &amp; Drop or Browse Files
              </p>
              <p className="text-[13px] text-[#53615D] text-center max-w-sm font-['Inter']">
                Source code (.py, .js, .ts, etc.), manifests, or full ZIP archives up to 10MB.
              </p>
              <div className="mt-4 px-5 py-2 bg-[#005144] text-white rounded-lg text-[13px] font-bold font-['Inter'] shadow-xs group-hover:bg-[#166A5A] transition-colors">
                Select Project File
              </div>
            </label>

            {uploadError && (
              <div className="mt-4 p-3.5 bg-[#FFEBEE] text-[#C62828] border border-[#EF9A9A] rounded-xl text-[13px] font-semibold font-['Inter'] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{uploadError}</span>
              </div>
            )}

            {/* Upload Guidance Banner */}
            <div className="mt-4 p-3 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/30 flex items-center justify-between text-[12px] font-['Inter'] text-[#53615D]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#005144]">check_circle</span>
                <span>Select a single source code file (.py, .js, .ts, etc.), dependency manifest, or full project .zip archive.</span>
              </span>
            </div>
          </div>
        </div>

        {/* Context & Inferred Info Panel */}
        <div className="lg:col-span-1 bg-[#FFFFFF] rounded-2xl bento-shadow border border-[#BEC9C4]/40 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-[18px] font-bold font-['Manrope'] text-[#005144] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005144]">auto_awesome</span>
              <span>Project Auto-Inference</span>
            </h3>

            {inferredInfo ? (
              <div className="p-4 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/40 mb-4 space-y-2 text-[13px] font-['Inter']">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#005144]">Inferred Project:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F5E9] text-[#1B5E20]">
                    {inferredInfo.confidence} confidence
                  </span>
                </div>
                <div className="font-semibold text-[#1B1C19]">{inferredInfo.title}</div>
                {inferredInfo.techStack && (
                  <div className="text-[12px] text-[#53615D]">
                    Detected Stack: {inferredInfo.techStack.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-[#53615D] font-['Inter'] mb-4">
                Upload your files above. Project title, description, and stack will be automatically inferred.
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                  Technology Stack (Editable)
                </label>
                <input
                  type="text"
                  disabled={isAnalyzing}
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="e.g. Python, FastAPI, React"
                  className="w-full h-10 bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl px-3 text-[13px] font-['Inter'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] disabled:opacity-75"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold font-['Inter'] text-[#3F4945] mb-1">
                  Project Description (Editable)
                </label>
                <textarea
                  rows={3}
                  disabled={isAnalyzing}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Inferred or custom project description..."
                  className="w-full bg-[#FAF9F4] border border-[#BEC9C4] rounded-xl p-3 text-[13px] font-['Inter'] text-[#1B1C19] focus:outline-none focus:ring-2 focus:ring-[#005144] resize-none disabled:opacity-75"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            {/* Analysis Progress Checklist */}
            {isAnalyzing && (
              <div className="mb-4 p-4 bg-[#FAF9F4] rounded-xl border border-[#BEC9C4]/40 space-y-2 animate-fadeIn">
                <h4 className="text-[11px] font-bold text-[#005144] uppercase tracking-wider mb-2 font-['Inter']">
                  Diagnostic Progress Checklist:
                </h4>
                {analysisSteps.map((step) => (
                  <div key={step.label} className="flex items-center gap-2 text-[12px] font-['Inter']">
                    {step.status === 'done' && (
                      <span className="material-symbols-outlined text-[16px] text-[#1B5E20]">check_circle</span>
                    )}
                    {step.status === 'active' && (
                      <span className="material-symbols-outlined text-[16px] text-[#005144] animate-spin">sync</span>
                    )}
                    {step.status === 'pending' && (
                      <span className="material-symbols-outlined text-[16px] text-[#BEC9C4]">radio_button_unchecked</span>
                    )}
                    <span className={step.status === 'done' ? 'text-[#1B5E20] font-semibold' : step.status === 'active' ? 'text-[#005144] font-bold' : 'text-[#707974]'}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!selectedFile && !rawFile)}
              className="w-full py-3 bg-[#005144] hover:bg-[#166A5A] text-white rounded-xl text-[14px] font-bold font-['Inter'] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[20px] ${isAnalyzing ? 'animate-spin' : ''}`}>
                {isAnalyzing ? 'sync' : 'medical_services'}
              </span>
              <span>{isAnalyzing ? 'Analyzing Project...' : 'Run Full Diagnostic'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
