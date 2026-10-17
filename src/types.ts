export type ScreenType =
  | 'dashboard'
  | 'login'
  | 'doctor'
  | 'health-report'
  | 'adaptive-support'
  | 'onboarding'
  | 'discovery'
  | 'interview-prep'
  | 'profile'
  | 'settings'
  | 'enhancement';

export interface UserProfile {
  name: string;
  role: string;
  membership: string;
  avatar: string;
  email: string;
  skills: { name: string; level: number }[];
  selectedInterests: string[];
  university?: string;
  graduationYear?: string;
  githubUsername?: string;
}

export interface ProjectData {
  id: string;
  title: string;
  tagline: string;
  status: string;
  matchScore: number;
  healthScore: number;
  readinessScore: number;
  stage: string;
  stageProgress: number;
  techStack: string[];
  issuesCount: number;
}

export interface HealthCategory {
  name: string;
  score: number;
  status: 'good' | 'needs-attention' | 'critical';
  icon: string;
  note?: string;
}

export interface CriticalIssue {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium';
  category: string;
  line: number;
  recommendation: string;
  codeSnippet?: string;
  suggestedPatch?: string;
}

export interface StruggleMetrics {
  errorsCount: number;
  failedRuns: number;
  repeatedEdits: number;
  timeStuckMin: number;
  struggleScore: number;
  status: string;
}
