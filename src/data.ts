import { UserProfile, ProjectData, HealthCategory, CriticalIssue, StruggleMetrics } from './types';

// Exact avatar image from user's provided HTML
export const MONIKA_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ";

export const initialProfile: UserProfile = {
  name: "Monika",
  role: "Engineering Student",
  membership: "Projevo AI Member",
  avatar: MONIKA_AVATAR,
  email: "monikacherukuri667@gmail.com",
  skills: [
    { name: "Python", level: 80 },
    { name: "Machine Learning", level: 60 },
    { name: "SQL", level: 45 },
    { name: "Git", level: 90 },
  ],
  selectedInterests: ["AI / ML", "Healthcare"],
};

export const currentProject: ProjectData = {
  id: "ai-healthcare-assistant",
  title: "AI Healthcare Assistant",
  tagline: "Clinical triage and symptom entity extraction pipeline",
  status: "In Progress",
  matchScore: 88,
  healthScore: 81,
  readinessScore: 55,
  stage: "Backend Integration",
  stageProgress: 65,
  techStack: ["Python", "FastAPI", "PyTorch", "Pandas", "Docker"],
  issuesCount: 3,
};

export const defaultHealthCategories: HealthCategory[] = [
  { name: "Code Quality", score: 86, status: "good", icon: "code", note: "Clean functions and clear separation of concerns" },
  { name: "Security", score: 72, status: "needs-attention", icon: "security", note: "Missing rate-limiting on sensitive auth endpoint" },
  { name: "Brute-Force", score: 60, status: "critical", icon: "gpp_bad", note: "No exponential backoff on auth failure loop" },
  { name: "Accessibility", score: 78, status: "needs-attention", icon: "accessibility_new", note: "Color contrast and aria tags need review" },
  { name: "Performance", score: 88, status: "good", icon: "speed", note: "Optimized tensor vectorization and indexing" },
  { name: "Google Services", score: 80, status: "good", icon: "cloud_done", note: "Valid cloud credentials and lazy init" },
];

export const emptyProfile: UserProfile = {
  name: "New Student",
  role: "Engineering Student",
  membership: "Projevo AI Member",
  avatar: MONIKA_AVATAR,
  email: "",
  college: "",
  university: "",
  course: "",
  yearOfStudy: "",
  graduationYear: "",
  skills: [],
  selectedInterests: [],
  interestedRoles: [],
  learningPreferences: "",
  onboardingGoals: "",
  github: "",
  customSkills: []
};

export const defaultCriticalIssues: CriticalIssue[] = [
  {
    id: "ISSUE-101",
    title: "Brute-Force Vulnerability on Authentication Route",
    severity: "Critical",
    category: "Brute-Force",
    line: 42,
    recommendation: "Introduce IP rate limiting (max 5 failed attempts per 15-minute window) using an in-memory bucket or Redis.",
    codeSnippet: `def handle_login(request):\n    user = db.query(User).filter_by(email=request.email).first()\n    # VULNERABILITY: No lockout or delay on invalid password\n    if not verify_password(request.password, user.hash):\n        return {"error": "Invalid credentials"}`,
    suggestedPatch: `def handle_login(request):\n    if check_rate_limit(request.client_ip) > 5:\n        raise HTTPException(429, "Too many login attempts. Retry in 15m.")\n    user = db.query(User).filter_by(email=request.email).first()`
  },
  {
    id: "ISSUE-102",
    title: "Uninitialized Variable in Data Ingestion Exception Handler",
    severity: "High",
    category: "Code Quality",
    line: 19,
    recommendation: "Define 'cleaned_subset' prior to the try-catch block or return an explicit empty DataFrame in case of FileNotFoundError.",
    codeSnippet: `try:\n    raw_data = pd.read_csv(filepath)\n    cleaned_subset = raw_data.dropna()\nexcept FileNotFoundError:\n    print("File missing!")\nreturn cleaned_subset.groupby('id').sum()`,
    suggestedPatch: `cleaned_subset = pd.DataFrame()\ntry:\n    raw_data = pd.read_csv(filepath)\n    if not raw_data.empty:\n        cleaned_subset = raw_data.dropna()\nexcept FileNotFoundError:\n    return pd.DataFrame()\nreturn cleaned_subset.groupby('id').sum()`
  },
  {
    id: "ISSUE-103",
    title: "Missing Input Type Validation on Patient Payload",
    severity: "Medium",
    category: "Security",
    line: 88,
    recommendation: "Use Pydantic schema validation to sanitize nested clinical observation payloads.",
    codeSnippet: `def ingest_patient_record(payload: dict):\n    record_id = payload['id']\n    save_to_db(record_id, payload['symptoms'])`,
    suggestedPatch: `class PatientRecordSchema(BaseModel):\n    id: UUID\n    symptoms: List[str]\n\ndef ingest_patient_record(payload: PatientRecordSchema):\n    save_to_db(payload.id, payload.symptoms)`
  }
];

export const defaultStruggleMetrics: StruggleMetrics = {
  errorsCount: 4,
  failedRuns: 5,
  repeatedEdits: 7,
  timeStuckMin: 8,
  struggleScore: 82,
  status: "High Struggle Detected"
};

export const sampleCodeSnippet = `import pandas as pd
import numpy as np

def clean_dataset(filepath):
    # Initialize an empty dataframe to hold valid entries
    # Note: Need to make sure this is available globally later
    
    try:
        raw_data = pd.read_csv(filepath)
        if raw_data.empty:
            return None
            
        # Complex filtering logic here...
        cleaned_subset = raw_data.dropna()
        
    except FileNotFoundError:
        print("File missing!")
        
    # ERROR TRACE POINTS HERE (Line 19)
    return cleaned_subset.groupby('id').sum()

if __name__ == '__main__':
    results = clean_dataset('data.csv')
    print(results)`;
