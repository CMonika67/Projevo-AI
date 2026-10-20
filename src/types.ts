export type ScreenType =
  | 'dashboard'
  | 'login'
  | 'doctor'
  | 'health-report'
  | 'skill-gap'
  | 'adaptive-support'
  | 'onboarding'
  | 'discovery'
  | 'interview-prep'
  | 'profile'
  | 'settings'
  | 'enhancement';

export interface UserSkill {
  name: string;
  level: number;
  status?: 'have' | 'learning';
}

export interface UserProfile {
  name: string;
  role: string;
  membership: string;
  avatar: string;
  email: string;
  college?: string;
  university?: string;
  course?: string;
  yearOfStudy?: string;
  graduationYear?: string;
  github?: string;
  skills: UserSkill[];
  selectedInterests: string[];
  interestedRoles?: string[];
  learningPreferences?: string;
  onboardingGoals?: string;
  primaryMilestone?: string;
  customSkills?: string[];
}

export interface ProjectData {
  id: string;
  title: string;
  tagline: string;
  status: string;
  matchScore: number;
  healthScore: number;
  readinessScore?: number;
  stage: string;
  stageProgress: number;
  techStack: string[];
  issuesCount: number;
  description?: string;
  domain?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  problemStatement?: string;
  proposedSolution?: string;
  expectedOutcome?: string;
  possibleExtensions?: string[];
  feasibility?: string;
  whyRelevant?: string;
  healthReport?: {
    overallHealth: number;
    categories: HealthCategory[];
    criticalIssues: CriticalIssue[];
    analyzedAt?: string;
  } | null;
}

export interface HealthCategory {
  name: string;
  score: number;
  status: 'good' | 'needs-attention' | 'critical';
  icon: string;
  note?: string;
  analysisStatus?: 'scored' | 'na' | 'not_analyzed' | 'analysis_failed' | 'insufficient_evidence';
  reason?: string;
  weight?: number;
}

export interface CriticalIssue {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium';
  category: string;
  line: number;
  lineNumber?: number;
  recommendation: string;
  codeSnippet?: string;
  suggestedPatch?: string;
  explanation?: string;
  suggestedFix?: string;
}

export interface StruggleMetrics {
  errorsCount: number;
  failedRuns: number;
  repeatedEdits: number;
  timeStuckMin: number;
  struggleScore: number;
  status: string;
}

export interface SkillGapItem {
  skill: string;
  category: 'have' | 'needs-improvement' | 'missing' | 'optional';
  currentLevel: number;
  requiredLevel: number;
  whyNeeded: string;
  sequence: number;
  prerequisites?: string[];
  resources: { title: string; type: string; url?: string }[];
  practicalExercise: string;
  milestone: string;
  completed?: boolean;
}

export interface SkillGapAnalysisData {
  projectId: string;
  projectTitle: string;
  overallMatchScore: number;
  haveSkills: SkillGapItem[];
  needsImprovementSkills: SkillGapItem[];
  missingSkills: SkillGapItem[];
  optionalSkills: SkillGapItem[];
  roadmap: SkillGapItem[];
}

export interface InterviewQuestion {
  id: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  whyAsked: string;
  keyPoints: string[];
  exampleAnswer: string;
  userAnswer?: string;
  evaluation?: AnswerEvaluation;
  isSourced?: boolean;
  sourceCompany?: string;
}

export interface AnswerEvaluation {
  score: number; // out of 10
  verdict: string;
  explanation: string;
  rubricBreakdown: {
    technicalCorrectness: number;
    relevance: number;
    completeness: number;
    clarityAndStructure: number;
    projectEvidence: number;
    depthForDifficulty: number;
  };
  strengths: string[];
  missingPoints: string[];
  suggestions: string[];
  improvedSampleAnswer: string;
  evaluatedAt: string;
}
