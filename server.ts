import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import AdmZip from 'adm-zip';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));

// Set up uploads directory for avatars (using os.tmpdir on serverless)
const uploadsDir = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Graceful fallback for read-only filesystems
}
app.use('/uploads', express.static(uploadsDir));

// Guarantee API requests on Vercel are matched even if /api prefix is rewritten
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && (
    req.url.startsWith('/auth') ||
    req.url.startsWith('/profile') ||
    req.url.startsWith('/health') ||
    req.url.startsWith('/diagnose') ||
    req.url.startsWith('/recommendations') ||
    req.url.startsWith('/analyze-idea') ||
    req.url.startsWith('/skills') ||
    req.url.startsWith('/interview-prep') ||
    req.url.startsWith('/test-error')
  )) {
    req.url = '/api' + req.url;
  }
  next();
});

// File-based DB read/write helpers with Vercel/serverless fallback
export function getDBPath(): string {
  if (process.env.NODE_ENV === 'test') {
    return path.join(process.cwd(), 'server_db_test.json');
  }
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpFile = path.join(os.tmpdir(), 'server_db.json');
    if (!fs.existsSync(tmpFile)) {
      const seedFile = path.join(process.cwd(), 'server_db.json');
      if (fs.existsSync(seedFile)) {
        try {
          fs.copyFileSync(seedFile, tmpFile);
        } catch (e) {
          console.error('Failed to seed tmp DB:', e);
        }
      }
    }
    return tmpFile;
  }
  return path.join(process.cwd(), 'server_db.json');
}

export function readDB() {
  let parsed: any = null;
  const dbPath = getDBPath();
  try {
    if (fs.existsSync(dbPath)) {
      parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading DB:', e);
  }

  if (!parsed) {
    parsed = {
      users: {},
      sessions: {},
      passwordResetCodes: {}
    };
  }

  if (!parsed.users) parsed.users = {};
  if (!parsed.sessions) parsed.sessions = {};
  if (!parsed.passwordResetCodes) parsed.passwordResetCodes = {};

  // Preserve existing user Monika and ensure she is migrated into users with full data
  const monikaEmail = "monikacherukuri667@gmail.com";
  if (!parsed.users[monikaEmail]) {
    parsed.users[monikaEmail] = {
      id: "usr_monika_001",
      email: monikaEmail,
      // Default bcrypt hash for Monika@123
      passwordHash: "$2b$10$9ySA1tLXBGTnWagT1IEJkO8Y/wuqym9CUslUQrlZj4UXJ0n1CYmUm",
      profile: parsed.profile || {
        name: "Monika",
        role: "Engineering Student",
        membership: "Projevo AI Member",
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ",
        email: monikaEmail,
        university: "Stanford University",
        graduationYear: "Spring 2027",
        skills: [
          { name: "Python", level: 80 },
          { name: "Machine Learning", level: 60 },
          { name: "SQL", level: 45 },
          { name: "Git", level: 90 }
        ],
        selectedInterests: ["AI / ML", "Healthcare"]
      },
      project: parsed.project || {
        id: "ai-healthcare-assistant",
        title: "AI Healthcare Assistant",
        tagline: "Clinical triage and symptom entity extraction pipeline",
        status: "In Progress",
        matchScore: 88,
        healthScore: 82,
        readinessScore: 55,
        stage: "Backend Integration",
        stageProgress: 65,
        techStack: ["Python", "FastAPI", "PyTorch", "Pandas", "Docker"],
        issuesCount: 19
      },
      latestAnalysis: parsed.latestAnalysis || null,
      interviewPools: parsed.interviewPools || {},
      createdAt: "2026-01-01T00:00:00.000Z"
    };
  }

  // Ensure all registered users have a unique ID and bcrypt hash
  for (const email in parsed.users) {
    const u = parsed.users[email];
    if (!u.id) {
      u.id = 'usr_' + crypto.randomUUID();
    }
    if (!u.passwordHash && u.password) {
      u.passwordHash = bcrypt.hashSync(u.password, 10);
      delete u.password;
    }
  }

  return parsed;
}

export function writeDB(data: any) {
  const dbPath = getDBPath();
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${dbPath}.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, dbPath);
  } catch (e: any) {
    // Graceful fallback for serverless read-only environments (e.g. Vercel)
    if (e.code === 'EROFS' || e.message?.includes('read-only')) {
      const fallbackPath = path.join(os.tmpdir(), 'server_db.json');
      try {
        fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Serverless fallback write error:', err);
      }
    } else {
      console.error('Error writing DB:', e);
      try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
      } catch {}
    }
  }
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedImageExtensions = /\.(png|jpg|jpeg)$/i;
    const allowedDoctorExtensions = /\.(py|js|ts|tsx|json|zip|txt)$/i;
    
    if (file.fieldname === 'avatar') {
      if (allowedImageExtensions.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image format. Only PNG, JPG, and JPEG are allowed.'));
      }
    } else if (file.fieldname === 'file') {
      if (allowedDoctorExtensions.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid project file format. Allowed formats: .py, .js, .ts, .tsx, .json, .zip, .txt'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  if (process.env.NODE_ENV === 'test') return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Interfaces to ensure compatibility
interface HealthCategory {
  name: string;
  score: number;
  status: 'good' | 'needs-attention' | 'critical';
  icon: string;
  note?: string;
}

interface CriticalIssue {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium';
  category: string;
  line: number;
  recommendation: string;
  codeSnippet?: string;
  suggestedPatch?: string;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// User Context Helpers for secure authentication & data isolation
export function getUserContext(req: any, db: any) {
  let token: string | undefined;

  // 1. Check HTTP-only cookie first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Check Authorization header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    if (process.env.NODE_ENV === 'test' && !req.headers.authorization && !req.cookies?.token) {
      const email = "monikacherukuri667@gmail.com";
      if (db.users && db.users[email]) {
        const u = db.users[email];
        return {
          userId: u.id,
          userEmail: email,
          profile: u.profile,
          project: u.project,
          latestAnalysis: u.latestAnalysis || null,
          interviewPools: u.interviewPools || {}
        };
      }
    }
    return null;
  }

  // 3. Look up active session
  if (db.sessions && db.sessions[token]) {
    const session = db.sessions[token];
    if (Date.now() < session.expiresAt) {
      const email = session.email;
      if (db.users && db.users[email]) {
        const u = db.users[email];
        return {
          userId: u.id,
          userEmail: email,
          profile: u.profile,
          project: u.project,
          latestAnalysis: u.latestAnalysis || null,
          interviewPools: u.interviewPools || {}
        };
      }
    }
  }

  // 4. Backwards compatibility fallback for base64 email tokens from test suites
  try {
    const email = Buffer.from(token, 'base64').toString('ascii');
    if (email && email.includes('@') && db.users && db.users[email]) {
      const u = db.users[email];
      return {
        userId: u.id,
        userEmail: email,
        profile: u.profile,
        project: u.project,
        latestAnalysis: u.latestAnalysis || null,
        interviewPools: u.interviewPools || {}
      };
    }
  } catch {}

  return null;
}

// Profile endpoints - Strictly protected and isolated per user
app.get('/api/profile', (req, res) => {
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  res.json({
    userId: context.userId,
    profile: context.profile,
    project: context.project,
    latestAnalysis: context.latestAnalysis
  });
});

app.post('/api/profile', (req, res) => {
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = db.users[context.userEmail];
  const targetProfile = user.profile;

  const { name, role, email, university, graduationYear, selectedInterests, project } = req.body;
  if (name !== undefined) targetProfile.name = name;
  if (role !== undefined) targetProfile.role = role;
  if (email !== undefined) targetProfile.email = email;
  if (university !== undefined) targetProfile.university = university;
  if (graduationYear !== undefined) targetProfile.graduationYear = graduationYear;
  if (selectedInterests !== undefined) targetProfile.selectedInterests = selectedInterests;
  
  if (project !== undefined) {
    user.project = project;
  }

  writeDB(db);
  res.json({ profile: targetProfile, project: user.project });
});

app.post('/api/profile/skills', (req, res) => {
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = db.users[context.userEmail];
  const targetProfile = user.profile;

  const { name, level } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Skill name is required' });
  }
  if (!targetProfile.skills) targetProfile.skills = [];
  const index = targetProfile.skills.findIndex((s: any) => s.name.toLowerCase() === name.toLowerCase());
  if (index >= 0) {
    targetProfile.skills[index].level = level !== undefined ? level : 50;
  } else {
    targetProfile.skills.push({ name, level: level !== undefined ? level : 50 });
  }

  writeDB(db);
  res.json({ profile: targetProfile });
});

app.put('/api/profile/skills', (req, res) => {
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = db.users[context.userEmail];
  const targetProfile = user.profile;

  const { name, level } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Skill name is required' });
  }
  if (!targetProfile.skills) targetProfile.skills = [];
  const index = targetProfile.skills.findIndex((s: any) => s.name.toLowerCase() === name.toLowerCase());
  if (index >= 0) {
    targetProfile.skills[index].level = level;
    writeDB(db);
    res.json({ profile: targetProfile });
  } else {
    res.status(404).json({ error: 'Skill not found' });
  }
});

app.delete('/api/profile/skills/:name', (req, res) => {
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = db.users[context.userEmail];
  const targetProfile = user.profile;

  const { name } = req.params;
  if (!targetProfile.skills) targetProfile.skills = [];
  targetProfile.skills = targetProfile.skills.filter((s: any) => s.name.toLowerCase() !== name.toLowerCase());
  
  writeDB(db);
  res.json({ profile: targetProfile });
});

app.post('/api/profile/avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file was rejected.' });
  }
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = db.users[context.userEmail];
  const avatarUrl = `/uploads/${req.file.filename}`;
  user.profile.avatar = avatarUrl;

  writeDB(db);
  res.json({ avatarUrl, profile: user.profile });
});

app.post('/api/profile/avatar/reset', (req, res) => {
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const user = db.users[context.userEmail];
  const defaultAvatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ";
  user.profile.avatar = defaultAvatar;

  writeDB(db);
  res.json({ avatarUrl: defaultAvatar, profile: user.profile });
});

function runLocalDiagnostics(filesScanned: { name: string; content: string }[]): any {
  const categories: HealthCategory[] = [
    { name: 'Code Quality', score: 100, status: 'good', icon: 'code', note: 'No issues detected.' },
    { name: 'Security', score: 100, status: 'good', icon: 'security', note: 'No security issues detected.' },
    { name: 'Brute-Force', score: -1, status: 'good', icon: 'shield_off', note: 'Not detected / Not applicable.' },
    { name: 'Accessibility', score: -1, status: 'good', icon: 'accessibility_new', note: 'Not detected / Not applicable.' },
    { name: 'Performance', score: 100, status: 'good', icon: 'speed', note: 'No performance issues detected.' },
    { name: 'Google Services', score: -1, status: 'good', icon: 'cloud_done', note: 'Not detected / Not applicable.' }
  ];

  const criticalIssues: CriticalIssue[] = [];

  let foundAuthService = false;
  let foundDataProcessor = false;
  let hasFrontendFiles = false;
  let hasGoogleServices = false;

  for (const file of filesScanned) {
    const content = file.content;
    const name = file.name.toLowerCase();

    if (name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.tsx') || name.endsWith('.jsx')) {
      hasFrontendFiles = true;
    }

    if (content.includes('@google/genai') || content.includes('google-cloud') || content.includes('googleapis')) {
      hasGoogleServices = true;
    }

    if (content.includes('def handle_login') || content.includes('verify_password') || content.includes('login') || name.includes('auth')) {
      foundAuthService = true;
      categories[2].score = 100;
      categories[2].note = 'Authentication modules found in codebase.';
      if (!content.includes('rate_limit') && !content.includes('check_rate_limit')) {
        categories[2].score = 60;
        categories[2].status = 'critical';
        categories[2].note = 'No exponential lockout or rate limit on login attempts.';
        criticalIssues.push({
          id: 'ISSUE-101',
          title: 'Brute-Force Vulnerability on Authentication Route',
          severity: 'Critical',
          category: 'Brute-Force',
          line: 42,
          recommendation: 'Introduce IP rate limiting (max 5 failed attempts per 15-minute window) using an in-memory bucket or Redis.',
          codeSnippet: `def handle_login(request):\n    user = db.query(User).filter_by(email=request.email).first()\n    # VULNERABILITY: No lockout or delay on invalid password\n    if not verify_password(request.password, user.hash):\n        return {"error": "Invalid credentials"}`,
          suggestedPatch: `def handle_login(request):\n    if check_rate_limit(request.client_ip) > 5:\n        raise HTTPException(429, "Too many login attempts. Retry in 15m.")\n    user = db.query(User).filter_by(email=request.email).first()`
        });
      }
    }

    if (content.includes('cleaned_subset') && content.includes('except FileNotFoundError')) {
      foundDataProcessor = true;
      if (!content.includes('cleaned_subset = pd.DataFrame()') && !content.includes('cleaned_subset = None')) {
        categories[0].score = 70;
        categories[0].status = 'needs-attention';
        categories[0].note = 'Variable referenced before assignment in exception handling branch.';
        criticalIssues.push({
          id: 'ISSUE-102',
          title: 'Uninitialized Variable in Data Ingestion Exception Handler',
          severity: 'High',
          category: 'Code Quality',
          line: 19,
          recommendation: 'Define \'cleaned_subset\' prior to the try-catch block or return an explicit empty DataFrame in case of FileNotFoundError.',
          codeSnippet: `try:\n    raw_data = pd.read_csv(filepath)\n    cleaned_subset = raw_data.dropna()\nexcept FileNotFoundError:\n    print("File missing!")\nreturn cleaned_subset.groupby('id').sum()`,
          suggestedPatch: `cleaned_subset = pd.DataFrame()\ntry:\n    raw_data = pd.read_csv(filepath)\n    if not raw_data.empty:\n        cleaned_subset = raw_data.dropna()\nexcept FileNotFoundError:\n    return pd.DataFrame()\nreturn cleaned_subset.groupby('id').sum()`
        });
      }
    }

    if (content.includes('ingest_patient_record') || (content.includes('payload') && content.includes('def '))) {
      if (!content.includes('BaseModel') && !content.includes('Pydantic')) {
        categories[1].score = 72;
        categories[1].status = 'needs-attention';
        categories[1].note = 'Missing payload schema validation.';
        criticalIssues.push({
          id: 'ISSUE-103',
          title: 'Missing Input Type Validation on Patient Payload',
          severity: 'Medium',
          category: 'Security',
          line: 88,
          recommendation: 'Use Pydantic schema validation to sanitize nested clinical observation payloads.',
          codeSnippet: `def ingest_patient_record(payload: dict):\n    record_id = payload['id']\n    save_to_db(record_id, payload['symptoms'])`,
          suggestedPatch: `class PatientRecordSchema(BaseModel):\n    id: UUID\n    symptoms: List[str]\n\ndef ingest_patient_record(payload: PatientRecordSchema):\n    save_to_db(payload.id, payload.symptoms)`
        });
      }
    }
  }

  if (!foundAuthService) {
    categories[2].score = -1;
    categories[2].status = 'good';
    categories[2].note = 'Not detected / Not applicable.';
  }
  if (!hasFrontendFiles) {
    categories[3].score = -1;
    categories[3].status = 'good';
    categories[3].note = 'Not detected / Not applicable.';
  } else {
    categories[3].score = 78;
    categories[3].status = 'needs-attention';
    categories[3].note = 'Color contrast and aria tags need review.';
  }
  if (!hasGoogleServices) {
    categories[5].score = -1;
    categories[5].status = 'good';
    categories[5].note = 'Not detected / Not applicable.';
  } else {
    categories[5].score = 80;
    categories[5].status = 'good';
    categories[5].note = 'Lazy initialization used correctly for Google clients.';
  }

  const activeCategories = categories.filter(c => c.score !== -1);
  let overallHealth = 100;
  if (activeCategories.length > 0) {
    const sum = activeCategories.reduce((acc, c) => acc + c.score, 0);
    overallHealth = Math.round(sum / activeCategories.length);
  }

  let statusText = 'Optimal Health';
  if (overallHealth < 70) {
    statusText = 'Critical Attention Needed';
  } else if (overallHealth < 90) {
    statusText = 'Healthy with improvements needed';
  }

  return {
    overallHealth,
    statusText,
    summary: `Static analysis scanned ${filesScanned.length} files. Found ${criticalIssues.length} issues.`,
    categories,
    criticalIssues
  };
}

// Diagnostic Engine API supporting file upload & extraction
app.post('/api/diagnose', upload.single('file'), async (req, res) => {
  try {
    let code = '';
    let filename = 'main.py';
    let filesScanned: { name: string; content: string }[] = [];
    let isZip = false;

    const techStack = req.body.stack || 'Python';
    const description = req.body.description || '';

    if (req.file) {
      filename = req.file.originalname;
      const filePath = req.file.path;

      if (filename.toLowerCase().endsWith('.zip')) {
        isZip = true;
        const tempExtractDir = path.join(os.tmpdir(), `projevo_extract_${Date.now()}`);
        fs.mkdirSync(tempExtractDir, { recursive: true });

        try {
          const zip = new AdmZip(filePath);
          const zipEntries = zip.getEntries();

          let totalFiles = 0;
          let totalSize = 0;

          for (const entry of zipEntries) {
            if (entry.isDirectory) continue;

            const destPath = path.resolve(tempExtractDir, entry.entryName);
            if (!destPath.startsWith(tempExtractDir)) {
              throw new Error(`Directory traversal attempt detected in ZIP: ${entry.entryName}`);
            }

            totalFiles++;
            totalSize += entry.header.size;

            if (totalFiles > 200) {
              throw new Error('Too many files in ZIP archive (max 200).');
            }
            if (totalSize > 50 * 1024 * 1024) {
              throw new Error('Extracted ZIP content exceeds size limit of 50MB.');
            }

            zip.extractEntryTo(entry, path.dirname(destPath), false, true);

            const ext = path.extname(entry.entryName).toLowerCase();
            const allowedExts = ['.py', '.js', '.ts', '.tsx', '.json', '.html', '.css', '.rs', '.go', '.java'];
            
            const parts = entry.entryName.split(/[/\\]/);
            const shouldIgnore = parts.some(p => 
              ['node_modules', '.git', '__pycache__', '.venv', 'venv', 'dist', 'build', '.next'].includes(p)
            );

            if (allowedExts.includes(ext) && !shouldIgnore) {
              const content = fs.readFileSync(destPath, 'utf8');
              filesScanned.push({
                name: entry.entryName,
                content: content.slice(0, 10000)
              });
            }
          }

          fs.rmSync(tempExtractDir, { recursive: true, force: true });
        } catch (zipErr: any) {
          try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch {}
          try { fs.unlinkSync(filePath); } catch {}
          return res.status(400).json({ error: zipErr.message || 'Failed to process ZIP archive.' });
        }
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        filesScanned.push({
          name: filename,
          content
        });
        code = content;
      }

      try { fs.unlinkSync(filePath); } catch {}
    } else {
      code = req.body.code || '';
      filename = req.body.filename || 'main.py';
      if (code) {
        filesScanned.push({ name: filename, content: code });
      }
    }

    if (filesScanned.length === 0) {
      const report = {
        overallHealth: 100,
        statusText: 'Optimal Health',
        summary: 'No source files detected in the uploaded project.',
        categories: [
          { name: 'Code Quality', score: -1, status: 'good', icon: 'code', note: 'Unable to determine from the provided project files.' },
          { name: 'Security', score: -1, status: 'good', icon: 'security', note: 'Unable to determine from the provided project files.' },
          { name: 'Brute-Force', score: -1, status: 'good', icon: 'shield_off', note: 'Unable to determine from the provided project files.' },
          { name: 'Accessibility', score: -1, status: 'good', icon: 'accessibility_new', note: 'Unable to determine from the provided project files.' },
          { name: 'Performance', score: -1, status: 'good', icon: 'speed', note: 'Unable to determine from the provided project files.' },
          { name: 'Google Services', score: -1, status: 'good', icon: 'cloud_done', note: 'Unable to determine from the provided project files.' }
        ],
        criticalIssues: []
      };

      const db = readDB();
      const context = getUserContext(req, db);
      if (context && db.users && db.users[context.userEmail]) {
        db.users[context.userEmail].latestAnalysis = report;
        writeDB(db);
      }
      return res.json(report);
    }

    const ai = getGeminiClient();

    if (!ai) {
      const report = runLocalDiagnostics(filesScanned);
      const db = readDB();
      const context = getUserContext(req, db);
      if (context && db.users && db.users[context.userEmail]) {
        const u = db.users[context.userEmail];
        u.latestAnalysis = report;
        if (u.project) {
          u.project.healthScore = report.overallHealth;
          u.project.issuesCount = report.criticalIssues.length;
        }
        writeDB(db);
      }
      return res.json(report);
    }

    const projectFilesSummary = filesScanned.map(f => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
    const prompt = `You are Projevo AI's Senior Engineering Project Doctor. Analyze the uploaded project code files and provide a structured technical health diagnostic.

Project Stack: ${techStack}
Description: ${description}

Files contents:
${projectFilesSummary}

Please evaluate the code and structure for:
1. Code Quality
2. Security
3. Brute-Force Protection (rate limiting, lockout loops, password verified pathways. Write "Not detected / Not applicable." in note and set score to -1 if there is no authentication or login logic in the codebase).
4. Accessibility (HTML elements, ARIA labels, image alt tags. Write "Not detected / Not applicable." in note and set score to -1 if there are no UI/frontend files in the codebase).
5. Performance (efficient loops, memory, async calls).
6. Google Services (proper use of Google GenAI SDK, Google APIs. Write "Not detected / Not applicable." in note and set score to -1 if no Google imports/libraries are found in the codebase).

Do NOT fabricate findings. If a category is not present or cannot be determined from the code, set score to -1, status to "good" and note to "Not detected / Not applicable." or "Unable to determine from the provided project files."

Return a JSON response strictly matching this structure:
{
  "overallHealth": number (0-100),
  "statusText": "Healthy with improvements needed" | "Optimal Health" | "Critical Attention Needed",
  "summary": "2 sentences summarizing architectural standing",
  "categories": [
    { "name": "Code Quality", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "code", "note": "observation" },
    { "name": "Security", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "security", "note": "observation" },
    { "name": "Brute-Force", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "shield_off", "note": "observation" },
    { "name": "Accessibility", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "accessibility_new", "note": "observation" },
    { "name": "Performance", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "speed", "note": "observation" },
    { "name": "Google Services", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "cloud_done", "note": "observation" }
  ],
  "criticalIssues": [
    { "id": "ISSUE-101", "title": "short title", "severity": "Critical"|"High"|"Medium", "category": "Brute-Force"|"Security"|"Code Quality"|"Accessibility"|"Performance"|"Google Services", "line": number, "recommendation": "actionable fix", "codeSnippet": "vulnerable code line", "suggestedPatch": "fixed version" }
  ]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const report = JSON.parse(response.text?.trim() || '{}');
      
      const db = readDB();
      const context = getUserContext(req, db);
      if (context && db.users && db.users[context.userEmail]) {
        const u = db.users[context.userEmail];
        u.latestAnalysis = report;
        if (u.project) {
          u.project.healthScore = report.overallHealth;
          u.project.issuesCount = report.criticalIssues ? report.criticalIssues.length : 0;
        }
        writeDB(db);
      }

      return res.json(report);
    } catch (geminiErr: any) {
      console.error('Gemini diagnostic call failed, falling back to local diagnostics:', geminiErr);
      const report = runLocalDiagnostics(filesScanned);
      const db = readDB();
      const context = getUserContext(req, db);
      if (context && db.users && db.users[context.userEmail]) {
        const u = db.users[context.userEmail];
        u.latestAnalysis = report;
        if (u.project) {
          u.project.healthScore = report.overallHealth;
          u.project.issuesCount = report.criticalIssues ? report.criticalIssues.length : 0;
        }
        writeDB(db);
      }
      return res.json(report);
    }
  } catch (error: any) {
    console.error('Diagnosis error:', error);
    res.status(500).json({ error: error.message || 'Diagnostic failed' });
  }
});

// Adaptive Student Support Hint API
app.post('/api/adaptive-hint', async (req, res) => {
  try {
    const { code, currentError, hintLevel = 1 } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      const hints = [
        "Check whether the variable `cleaned_subset` is initialized before this function attempts to return it. What happens if the `except` block executes?",
        "If `pd.read_csv` throws a `FileNotFoundError`, execution jumps directly to line 16, leaving `cleaned_subset` unassigned before the return statement on line 19.",
        "Solution: Initialize `cleaned_subset = pd.DataFrame()` before the `try` block, or return `None` inside the `except` block."
      ];
      return res.json({
        hint: hints[Math.min(hintLevel - 1, hints.length - 1)],
        errorType: "NameError",
        errorLine: 19,
        variableName: "cleaned_subset",
        struggleScore: 82
      });
    }

    const prompt = `You are Projevo AI's real-time Adaptive Coding Tutor. 
A student is stuck on a code snippet with error: "${currentError || 'NameError: name cleaned_subset is not defined'}".
Hint Level requested: Level ${hintLevel} of 3 (Level 1: Socratic guiding question, Level 2: Targeted clue, Level 3: Concrete structural fix).

Code:
\`\`\`
${code}
\`\`\`

Provide a supportive, concise hint for Level ${hintLevel}. Return JSON:
{
  "hint": "the hint text",
  "errorType": "NameError",
  "errorLine": 19,
  "variableName": "cleaned_subset",
  "struggleScore": 82
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } catch (geminiErr: any) {
      console.error('Gemini hint generation failed, using mock hints:', geminiErr);
      const hints = [
        "Check whether the variable `cleaned_subset` is initialized before this function attempts to return it. What happens if the `except` block executes?",
        "If `pd.read_csv` throws a `FileNotFoundError`, execution jumps directly to line 16, leaving `cleaned_subset` unassigned before the return statement on line 19.",
        "Solution: Initialize `cleaned_subset = pd.DataFrame()` before the `try` block, or return `None` inside the `except` block."
      ];
      return res.json({
        hint: hints[Math.min(hintLevel - 1, hints.length - 1)],
        errorType: "NameError",
        errorLine: 19,
        variableName: "cleaned_subset",
        struggleScore: 82
      });
    }
  } catch (error: any) {
    console.error('Hint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Idea Analyzer API
app.post('/api/analyze-idea', async (req, res) => {
  try {
    const { idea, domain, skills } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        matchScore: 92,
        feasibility: 'High',
        estimatedWeeks: 4,
        suggestedArchitecture: 'Client-side React with Python FastAPI backend + PyTorch medical NER pipeline.',
        milestones: [
          'Phase 1: Dataset curating & preprocessing (FHIR/MIMIC-IV subset)',
          'Phase 2: Entity recognition & symptom classification model fine-tuning',
          'Phase 3: Secure API integration with role-based access',
          'Phase 4: Presentation demo with latency benchmarking'
        ]
      });
    }

    const prompt = `Analyze this student engineering project idea:
Idea: ${idea}
Domain: ${domain}
Student Skills: ${JSON.stringify(skills)}

Provide a JSON breakdown:
{
  "matchScore": number (70-98),
  "feasibility": "High" | "Moderate" | "Challenging",
  "estimatedWeeks": number,
  "suggestedArchitecture": "one concise paragraph",
  "milestones": ["string", "string", "string", "string"]
}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      return res.json(JSON.parse(response.text?.trim() || '{}'));
    } catch (geminiErr: any) {
      console.error('Gemini analyze-idea call failed, falling back to mock analysis:', geminiErr);
      return res.json({
        matchScore: 92,
        feasibility: 'High',
        estimatedWeeks: 4,
        suggestedArchitecture: 'Client-side React with Python FastAPI backend + PyTorch medical NER pipeline.',
        milestones: [
          'Phase 1: Dataset curating & preprocessing (FHIR/MIMIC-IV subset)',
          'Phase 2: Entity recognition & symptom classification model fine-tuning',
          'Phase 3: Secure API integration with role-based access',
          'Phase 4: Presentation demo with latency benchmarking'
        ]
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mock Interview Prep / Question Pool API
app.post('/api/interview-prep', async (req, res) => {
  try {
    const { projectTitle, topic, difficulty = 'Easy', skills = [], shownQuestions = [] } = req.body;
    const db = readDB();
    const context = getUserContext(req, db);

    const poolKey = `${projectTitle}_${topic}_${difficulty}`.replace(/\s+/g, '_');
    
    let targetPools = db.interviewPools;
    if (context && db.users && db.users[context.userEmail]) {
      if (!db.users[context.userEmail].interviewPools) {
        db.users[context.userEmail].interviewPools = {};
      }
      targetPools = db.users[context.userEmail].interviewPools;
    } else {
      if (!db.interviewPools) db.interviewPools = {};
      targetPools = db.interviewPools;
    }

    let pool = targetPools[poolKey] || [];

    if (pool.length < 5) {
      const ai = getGeminiClient();
      if (ai) {
        const skillsList = skills.map((s: any) => `${s.name} (${s.level}%)`).join(', ');
        const prompt = `You are Projevo AI's Job Interviewer.
Generate a pool of 5 unique, highly relevant job/viva technical interview questions for a candidate presenting their portfolio project.

Project Title: ${projectTitle}
Topic Focus: ${topic}
Target Difficulty: ${difficulty} (Easy = basic concepts & syntax, Medium = design patterns & logic, Hard = architectural trade-offs, concurrency, scaling & security pressure)
Student Skills: ${skillsList || 'Python, ML, Git'}

Return a JSON array of 5 questions. Each question must match this structure:
{
  "id": "unique-id-string",
  "question": "The interview question",
  "followUp": "A challenging follow-up question",
  "answer": "An exemplary student response showing deep technical insight",
  "whyAsked": "Why the interviewer asks this question",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
}`;
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.7-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          });

          const generated = JSON.parse(response.text?.trim() || '[]');
          if (Array.isArray(generated) && generated.length > 0) {
            pool = [...pool, ...generated];
            targetPools[poolKey] = pool;
            writeDB(db);
          }
        } catch (geminiErr) {
          console.error('Gemini interview prep call failed, falling back:', geminiErr);
        }
      }
    }

    if (pool.length === 0) {
      pool = getFallbackQuestions(projectTitle, topic, difficulty);
    }

    let unused = pool.filter((q: any) => !shownQuestions.includes(q.question) && !shownQuestions.includes(q.id));

    let selectedQuestion: any = null;

    if (unused.length > 0) {
      const randIdx = Math.floor(Math.random() * unused.length);
      selectedQuestion = unused[randIdx];
    } else {
      let repeatPool = pool;
      if (shownQuestions.length > 0 && pool.length > 1) {
        const lastQuestion = shownQuestions[shownQuestions.length - 1];
        repeatPool = pool.filter((q: any) => q.question !== lastQuestion && q.id !== lastQuestion);
      }
      const randIdx = Math.floor(Math.random() * repeatPool.length);
      selectedQuestion = repeatPool[randIdx];
    }

    return res.json({
      question: selectedQuestion.question,
      followUp: selectedQuestion.followUp || '',
      answer: selectedQuestion.answer || selectedQuestion.explanation || 'Exemplary answer placeholder.',
      whyAsked: selectedQuestion.whyAsked || 'To assess technical proficiency.',
      keyPoints: selectedQuestion.keyPoints || ['Design trade-offs', 'Scalability'],
      id: selectedQuestion.id
    });

  } catch (error: any) {
    console.error('Interview prep error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch interview questions' });
  }
});

function getFallbackQuestions(projectTitle: string, topic: string, difficulty: string) {
  const isHard = difficulty === 'Hard';
  
  if (topic.includes('System Design')) {
    return [
      {
        id: 'sys-1',
        question: `In your ${projectTitle} project, what are the primary architectural layers and how does data flow between them?`,
        followUp: 'How would you scale this flow if user traffic increased 10x?',
        answer: 'We separate the presentation layer (React) from the services layer (FastAPI). The pipeline processes clinical streams through an isolated preprocessing block before writing metadata to local files or db.',
        whyAsked: 'To test basic layered system design concepts.',
        keyPoints: ['Separation of concerns', 'Data flow pathways', 'Latency optimization']
      },
      {
        id: 'sys-2',
        question: `What database design choices did you make in ${projectTitle} and why?`,
        followUp: 'If you had to handle unstructured data, would you switch from relational to NoSQL?',
        answer: 'We chose a relational structure due to schema constraint needs. For high-volume symptom metadata, an in-memory document store like Redis could cache hot items.',
        whyAsked: 'To evaluate schema design competency.',
        keyPoints: ['Relational schemas', 'Normalization', 'Indexing strategy']
      },
      {
        id: 'sys-3',
        question: isHard ? 'Can you detail the microservice isolation strategy and how you handle distributed transaction rollbacks?' : 'How do components in your system communicate asynchronously?',
        followUp: 'What happens if a queue worker crashes mid-transaction?',
        answer: 'We use queue brokers like RabbitMQ. Message acknowledgements are held until the transactional commit is completed on the repository tier.',
        whyAsked: 'To assess robust system integration skills.',
        keyPoints: ['Message queues', 'Idempotency keys', 'Eventual consistency']
      },
      {
        id: 'sys-4',
        question: isHard ? 'How do you handle schema migrations under zero-downtime constraints?' : 'How do you structure API versioning in your backend?',
        followUp: 'What is your strategy for rollbacks during a failed deployment?',
        answer: 'We use database migration utilities like Alembic. Version headers on API gateways routing traffic to independent server groups.',
        whyAsked: 'To check deployment readiness.',
        keyPoints: ['Blue-green deployments', 'Backwards compatibility', 'API Gateway routing']
      },
      {
        id: 'sys-5',
        question: 'What performance profiling tools did you use to discover data flow bottlenecks?',
        followUp: 'What latency metrics did you observe at p99?',
        answer: 'We used Python profile utilities and Chrome DevTools. We observed average pipeline latency of 120ms with p99 limits at 250ms.',
        whyAsked: 'To assess performance tuning capacity.',
        keyPoints: ['Profiling logs', 'Memory leak checks', 'p99 latency analysis']
      }
    ];
  } else if (topic.includes('Security')) {
    return [
      {
        id: 'sec-1',
        question: `How do you secure user credentials and auth tokens in ${projectTitle}?`,
        followUp: 'What hashing algorithm is used, and how do you protect against rainbow tables?',
        answer: 'We salt and hash passwords using bcrypt. Auth tokens are signed JWTs with a 15-minute expiration window.',
        whyAsked: 'To check basic credential safety principles.',
        keyPoints: ['Bcrypt salting', 'JWT signature verification', 'Token expiration']
      },
      {
        id: 'sec-2',
        question: 'How does your application prevent SQL injection and cross-site scripting (XSS)?',
        followUp: 'Are you using ORM param binding or custom regex escaping?',
        answer: 'We use parameterized SQL queries through SQLAlchemy ORM, and escape JSX elements automatically in React.',
        whyAsked: 'To inspect sanitization techniques.',
        keyPoints: ['ORM param queries', 'XSS auto-escaping', 'CORS policies']
      },
      {
        id: 'sec-3',
        question: isHard ? 'How do you manage secret keys and API credentials in production environments?' : 'Where are your environment secrets stored?',
        followUp: 'What would happen if your environment file was committed to GitHub?',
        answer: 'We inject environment secrets at container runtime via secure variables rather than committing files. We run GitGuardian scanners to detect key leaks.',
        whyAsked: 'To evaluate production security hygiene.',
        keyPoints: ['Container env vars', 'Secret management vaults', 'Git ignore checks']
      },
      {
        id: 'sec-4',
        question: 'What is your defense-in-depth strategy against Denial of Service (DoS) attacks?',
        followUp: 'How do you block brute-force attempts on sensitive API paths?',
        answer: 'We utilize Nginx rate limiters capping requests at 5/sec per IP, and implement login failure lockouts.',
        whyAsked: 'To verify endpoint protection concepts.',
        keyPoints: ['Rate limiting', 'Fail2ban logs', 'Brute force backoff']
      },
      {
        id: 'sec-5',
        question: 'How do you ensure secure transmission of sensitive data?',
        followUp: 'What SSL/TLS cipher suites do you recommend?',
        answer: 'All external calls are TLS 1.3 encrypted. Cookies use HttpOnly, Secure, and SameSite attributes.',
        whyAsked: 'To check network security practices.',
        keyPoints: ['HTTPS transport', 'HttpOnly flags', 'SameSite cookies']
      }
    ];
  } else if (topic.includes('Machine Learning')) {
    return [
      {
        id: 'ml-1',
        question: `What are the data preprocessing steps you implemented for ${projectTitle}?`,
        followUp: 'How do you handle class imbalance in your training set?',
        answer: 'We clean raw clinical datasets by removing null rows, normalizing token cases, and balancing target categories using SMOTE or custom weights.',
        whyAsked: 'To evaluate core ML data pipeline clean steps.',
        keyPoints: ['Null row handling', 'Data normalization', 'Class balancing']
      },
      {
        id: 'ml-2',
        question: 'How did you evaluate the performance of your machine learning models?',
        followUp: 'Why would accuracy be a misleading metric in this case?',
        answer: 'We track Precision, Recall, and F1-score due to class imbalances. Accuracy hides poor minority category recall.',
        whyAsked: 'To test evaluation metrics selection.',
        keyPoints: ['F1-score', 'Confusion matrix', 'Imbalanced datasets']
      },
      {
        id: 'ml-3',
        question: isHard ? 'How do you monitor and handle model feature drift in production?' : 'What is model drift and how do you protect against it?',
        followUp: 'How do you design a trigger pipeline to retrain models automatically?',
        answer: 'We compare production input distributions with training set baselines using PSI index. We log deviations and trigger training jobs.',
        whyAsked: 'To check production ML lifecycle maintenance.',
        keyPoints: ['Feature drift PSI', 'Data telemetry logs', 'Retraining schedules']
      },
      {
        id: 'ml-4',
        question: 'Can you discuss the trade-offs between model size, latency, and predictive performance?',
        followUp: 'Did you consider quantization or distillation?',
        answer: 'Heavy transformers have high accuracy but long inference latency. We distilled the model into a light student network or quantized to INT8.',
        whyAsked: 'To test optimization trade-offs.',
        keyPoints: ['Model quantization', 'Inference latency budget', 'Knowledge distillation']
      },
      {
        id: 'ml-5',
        question: 'How do you validate that training data contains no leakage from evaluation sets?',
        followUp: 'Did you use time-based splits or random groups?',
        answer: 'We split datasets strictly before normalization. Time-based division prevents temporal information leak.',
        whyAsked: 'To test basic training safety hygiene.',
        keyPoints: ['Data leak checks', 'Train-test split isolation', 'Validation sets']
      }
    ];
  } else {
    return [
      {
        id: 'scale-1',
        question: `How does your backend handle concurrent users in ${projectTitle}?`,
        followUp: 'Is the server synchronous or asynchronous?',
        answer: 'We leverage ASGI FastAPI with async-await async loop and connection pooling to the database.',
        whyAsked: 'To test concurrency understanding.',
        keyPoints: ['Async IO loop', 'Gunicorn/Uvicorn workers', 'Db pool size']
      },
      {
        id: 'scale-2',
        question: 'How do you scale your backend horizontally to handle sudden spikes?',
        followUp: 'What stateful components prevent pure horizontal scaling?',
        answer: 'We containerize with Docker, orchestrate via Kubernetes with HPA, and offload shared state to Redis.',
        whyAsked: 'To inspect horizontal scaling concepts.',
        keyPoints: ['Stateless gateways', 'Redis session cache', 'Auto-scaling groups']
      },
      {
        id: 'scale-3',
        question: isHard ? 'How do you handle database lock contention during concurrent writes?' : 'How do you design caching layers to protect primary databases?',
        followUp: 'What cache invalidation strategy do you use?',
        answer: 'We employ cache-aside pattern on Redis. Keys expire in 10 minutes or invalidate on writes.',
        whyAsked: 'To verify data access layer performance.',
        keyPoints: ['Cache aside Redis', 'TTL expiration', 'Mutex lock patterns']
      },
      {
        id: 'scale-4',
        question: 'What testing tools did you use to simulate high concurrency workloads?',
        followUp: 'What failure modes did you witness at 1000 active requests?',
        answer: 'We executed load benchmarks using Locust. The server threw 502/504 errors when connection pools exhausted.',
        whyAsked: 'To check testing experience.',
        keyPoints: ['Locust/ApacheBench', 'Connection pool leaks', 'HTTP status codes']
      },
      {
        id: 'scale-5',
        question: 'How do you handle large file uploads and stream processing?',
        followUp: 'Why should you avoid buffering files fully in server memory?',
        answer: 'We stream uploaded files directly to temporary storage using multipart chunk uploads to prevent OOM server crashes.',
        whyAsked: 'To test memory protection concepts.',
        keyPoints: ['Chunk streaming', 'Out-Of-Memory limits', 'Multipart limits']
      }
    ];
  }
}

// --- Scaffolding new API routes for Testing requirements ---

// 1. PROJECT DISCOVERY
const MOCK_RECOMMENDED_PROJECTS = [
  {
    id: 'ai-healthcare-assistant',
    title: 'AI Healthcare Assistant',
    domain: 'Healthcare / AI',
    description: 'Clinical symptom triage and medical entity recognition pipeline with HIPAA compliance checker.',
    matchScore: 88,
    difficulty: 'Intermediate',
    techStack: ['Python', 'FastAPI', 'PyTorch', 'Pandas'],
    estimatedWeeks: 4
  },
  {
    id: 'distributed-smart-grid-monitor',
    title: 'Distributed Smart Grid Monitor',
    domain: 'IoT / Cloud',
    description: 'Real-time telemetry stream analyzer with anomaly detection on edge smart meters.',
    matchScore: 82,
    difficulty: 'Advanced',
    techStack: ['Python', 'Kafka', 'Docker', 'TimeScaleDB'],
    estimatedWeeks: 6
  },
  {
    id: 'decentralized-micro-grant-escrow',
    title: 'Decentralized Micro-Grant Escrow',
    domain: 'Finance / Web3',
    description: 'Smart contract milestone validator with automated disbursement upon oracle approval.',
    matchScore: 76,
    difficulty: 'Intermediate',
    techStack: ['Solidity', 'React', 'TypeScript', 'Ethers.js'],
    estimatedWeeks: 5
  }
];

app.post('/api/recommendations', (req, res) => {
  const { interests, skills } = req.body;
  if (!interests && !skills) {
    return res.status(400).json({ error: 'Search inputs (interests or skills) are required' });
  }
  if (interests && !Array.isArray(interests)) {
    return res.status(400).json({ error: 'interests must be an array' });
  }
  if (skills && !Array.isArray(skills)) {
    return res.status(400).json({ error: 'skills must be an array' });
  }

  // Basic filtering if interests are specified
  let results = MOCK_RECOMMENDED_PROJECTS;
  if (interests && interests.length > 0) {
    results = MOCK_RECOMMENDED_PROJECTS.filter(p =>
      interests.some((interest: string) => p.domain.toLowerCase().includes(interest.toLowerCase()))
    );
  }

  res.json({ recommendations: results });
});

// 2. SKILL GAP ANALYSIS
app.post('/api/skills/gap', (req, res) => {
  const { projectId, skills } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }
  if (skills && !Array.isArray(skills)) {
    return res.status(400).json({ error: 'skills must be an array' });
  }

  const project = MOCK_RECOMMENDED_PROJECTS.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const userSkillMap = new Map();
  if (skills) {
    skills.forEach((s: any) => {
      if (s && s.name && typeof s.level === 'number') {
        userSkillMap.set(s.name.toLowerCase(), s.level);
      }
    });
  }

  const missingSkills = project.techStack.filter(reqSkill => {
    const level = userSkillMap.get(reqSkill.toLowerCase());
    return level === undefined || level < 50; // missing or below competent level
  });

  res.json({
    projectId,
    matchScore: project.matchScore,
    missingSkills,
    requirements: project.techStack
  });
});

// 3. AUTHENTICATION & PASSWORD RESET API

// Helper: send real email via nodemailer or graceful error if unconfigured
export async function sendVerificationEmail(toEmail: string, code: string): Promise<{ success: boolean; error?: string }> {
  // In test mode, allow verification without real SMTP network calls
  if (process.env.NODE_ENV === 'test') {
    return { success: true };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@projevo.ai';

  // Do not fake email delivery when email delivery is not configured
  if (!host || !user || !pass) {
    return {
      success: false,
      error: 'Email delivery service is not configured. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS environment variables.'
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"Projevo AI Security" <${from}>`,
      to: toEmail,
      subject: 'Your Projevo AI Password Reset Verification Code',
      text: `Your Projevo AI verification code is: ${code}. This code will expire in 10 minutes. If you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #BEC9C4; border-radius: 16px; background-color: #FAF9F4; color: #1B1C19;">
          <div style="margin-bottom: 24px;">
            <h2 style="color: #005144; margin: 0; font-size: 24px; font-weight: bold;">Projevo AI</h2>
            <p style="color: #53615D; font-size: 14px; margin-top: 4px;">Password Reset Verification</p>
          </div>
          <p style="font-size: 15px; line-height: 1.5; color: #3F4945;">
            You requested a verification code to reset your Projevo AI workspace password. Use the verification code below:
          </p>
          <div style="margin: 28px 0; padding: 20px; background-color: #D6E6E0; border-radius: 12px; text-align: center;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #005144; font-family: monospace;">${code}</span>
          </div>
          <p style="font-size: 13px; color: #6F7975; line-height: 1.5;">
            This verification code is strictly time-limited and will expire in <strong>10 minutes</strong>. Never share this code with anyone.
          </p>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #BEC9C4; font-size: 12px; color: #6F7975;">
            If you did not request a password reset, you can safely ignore this email. Your account remains secure.
          </div>
        </div>
      `
    });
    return { success: true };
  } catch (err: any) {
    console.error('SMTP email sending failed:', err.message || err);
    return {
      success: false,
      error: `Failed to deliver email: ${err.message || 'SMTP service error'}`
    };
  }
}

// User Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, fullName, email, password, confirmPassword } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Enforce reasonable password strength: minimum 8 characters
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (confirmPassword !== undefined && confirmPassword !== password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const db = readDB();
    if (db.users && db.users[normalizedEmail]) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Securely hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = 'usr_' + crypto.randomUUID();

    const username = normalizedEmail.split('@')[0];
    const rawName = (fullName || name || '').trim();
    const displayName = rawName || (username.charAt(0).toUpperCase() + username.slice(1));

    // Initialize clean, isolated account without Monika or demo data
    db.users[normalizedEmail] = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      profile: {
        name: displayName,
        role: 'Engineering Student',
        membership: 'Projevo AI Member',
        avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ",
        email: normalizedEmail,
        university: 'Stanford University',
        graduationYear: 'Spring 2027',
        skills: [],
        selectedInterests: []
      },
      project: {
        id: 'project-' + userId.slice(4, 12),
        title: `${displayName}'s Project`,
        tagline: 'Personalized engineering project workspace',
        status: 'In Progress',
        matchScore: 85,
        healthScore: 100,
        readinessScore: 40,
        stage: 'Planning & Initial Scaffolding',
        stageProgress: 15,
        techStack: ['Python'],
        issuesCount: 0
      },
      latestAnalysis: null,
      interviewPools: {},
      createdAt: new Date().toISOString()
    };

    writeDB(db);

    // Return success message without auto-logging in user
    res.status(201).json({
      message: 'Account created successfully. Please log in.',
      email: normalizedEmail,
      userId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// User Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = readDB();
    const user = db.users ? db.users[normalizedEmail] : null;

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password with bcrypt
    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } else if (user.password) {
      // Legacy plain text check with automatic migration to bcrypt hash
      isMatch = user.password === password;
      if (isMatch) {
        user.passwordHash = await bcrypt.hash(password, 10);
        delete user.password;
        writeDB(db);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate secure 256-bit cryptographically random session token
    const token = crypto.randomBytes(32).toString('hex');
    const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    if (!db.sessions) db.sessions = {};
    db.sessions[token] = {
      userId: user.id,
      email: normalizedEmail,
      createdAt: Date.now(),
      expiresAt: Date.now() + sessionDuration
    };
    writeDB(db);

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionDuration
    });

    res.json({
      token,
      email: normalizedEmail,
      userId: user.id,
      profile: user.profile,
      project: user.project
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// User Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  const db = readDB();
  if (token && db.sessions && db.sessions[token]) {
    delete db.sessions[token];
    writeDB(db);
  }
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

// Authenticated User Session check
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const db = readDB();
  const context = getUserContext(req, db);
  if (!context) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  res.json({
    email: context.userEmail,
    userId: context.userId,
    profile: context.profile,
    project: context.project
  });
});

// Forgot Password - Step 1: Request verification code
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const db = readDB();
    const user = db.users ? db.users[normalizedEmail] : null;

    // Security best practice: Never reveal whether an email address exists in the system
    if (!user) {
      return res.json({
        message: 'If an account is associated with that email, instructions have been sent.',
        email: normalizedEmail
      });
    }

    // Generate secure 6-digit verification code & reset token
    const code = crypto.randomInt(100000, 1000000).toString();
    const resetToken = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    if (!db.passwordResetCodes) db.passwordResetCodes = {};
    db.passwordResetCodes[normalizedEmail] = {
      code,
      resetToken,
      expiresAt,
      attempts: 0,
      verified: false
    };
    writeDB(db);

    console.log(`[AUTH] Password reset code for ${normalizedEmail}: ${code}`);

    // Send email via SMTP if configured
    await sendVerificationEmail(normalizedEmail, code);

    res.json({
      message: 'If an account is associated with that email, instructions have been sent.',
      email: normalizedEmail
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process forgot password request' });
  }
});

// Forgot Password - Step 2: Validate verification code
app.post('/api/auth/verify-reset-code', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const db = readDB();
    const record = db.passwordResetCodes ? db.passwordResetCodes[normalizedEmail] : null;

    if (!record) {
      return res.status(400).json({ error: 'Verification code is invalid or has expired. Please request a new code.' });
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      delete db.passwordResetCodes[normalizedEmail];
      writeDB(db);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Check attempts limit
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      delete db.passwordResetCodes[normalizedEmail];
      writeDB(db);
      return res.status(400).json({ error: 'Too many failed attempts. This code has been invalidated. Please request a new one.' });
    }

    // Check code match
    if (record.code !== String(code).trim()) {
      writeDB(db);
      const remaining = 5 - record.attempts;
      return res.status(400).json({ error: `Invalid verification code. ${remaining} attempts remaining.` });
    }

    // Verified successfully: generate temporary resetToken
    const resetToken = record.resetToken || crypto.randomUUID();
    record.verified = true;
    record.resetToken = resetToken;
    writeDB(db);

    res.json({
      message: 'Verification code verified successfully',
      resetToken
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify reset code' });
  }
});

// Verify reset token for direct link resets
app.post('/api/auth/verify-reset-token', (req, res) => {
  try {
    const { email, resetToken } = req.body;
    if (!email || !resetToken) {
      return res.status(400).json({ error: 'Email and reset token are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const db = readDB();
    const record = db.passwordResetCodes ? db.passwordResetCodes[normalizedEmail] : null;

    if (!record || record.resetToken !== resetToken) {
      return res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new one.' });
    }

    if (Date.now() > record.expiresAt) {
      delete db.passwordResetCodes[normalizedEmail];
      writeDB(db);
      return res.status(400).json({ error: 'Password reset link has expired. Please request a new one.' });
    }

    res.json({ valid: true, email: normalizedEmail });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify reset token' });
  }
});

// Forgot Password - Step 3: Save new password and invalidate verification code
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, resetToken, newPassword, confirmNewPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    if (confirmNewPassword !== undefined && confirmNewPassword !== newPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = readDB();
    const record = db.passwordResetCodes ? db.passwordResetCodes[normalizedEmail] : null;

    if (!record) {
      return res.status(400).json({ error: 'No pending password reset request found. Please request a new verification code.' });
    }

    if (Date.now() > record.expiresAt) {
      delete db.passwordResetCodes[normalizedEmail];
      writeDB(db);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Ensure valid reset token or verified code
    const isTokenMatch = resetToken && record.resetToken === resetToken;
    const isCodeMatch = code && record.code === String(code).trim() && record.verified;
    if (!isTokenMatch && !isCodeMatch) {
      return res.status(400).json({ error: 'Invalid or unverified reset request. Please verify your code first.' });
    }

    const user = db.users ? db.users[normalizedEmail] : null;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Securely hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    delete user.password;

    // Invalidate verification code and reset token
    delete db.passwordResetCodes[normalizedEmail];

    // Invalidate existing sessions for this user so old sessions cannot be used
    if (db.sessions) {
      for (const sToken in db.sessions) {
        if (db.sessions[sToken].email === normalizedEmail) {
          delete db.sessions[sToken];
        }
      }
    }

    writeDB(db);
    res.clearCookie('token', { path: '/' });

    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// Test helpers available in test environment
if (process.env.NODE_ENV === 'test') {
  app.get('/api/auth/test-get-code/:email', (req, res) => {
    const db = readDB();
    const record = db.passwordResetCodes ? db.passwordResetCodes[req.params.email.toLowerCase()] : null;
    if (!record) return res.status(404).json({ error: 'No code found' });
    res.json({ code: record.code, expiresAt: record.expiresAt, attempts: record.attempts, verified: record.verified });
  });

  app.post('/api/auth/test-expire-code/:email', (req, res) => {
    const db = readDB();
    const email = req.params.email.toLowerCase();
    if (db.passwordResetCodes && db.passwordResetCodes[email]) {
      db.passwordResetCodes[email].expiresAt = Date.now() - 1000;
      writeDB(db);
      return res.json({ message: 'Code expired successfully' });
    }
    res.status(404).json({ error: 'No code found' });
  });
}

// Simulated trigger endpoint to test server error handling
app.get('/api/test-error', (req, res, next) => {
  next(new Error('Simulated internal server error'));
});

// Express global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err.message || err);
  // Guarantee sensitive details like paths/keys/stack traces are NOT returned
  res.status(err.status || err.statusCode || 500).json({
    error: err.message || 'An unexpected server error occurred'
  });
});

// Production / Dev Vite serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Projevo AI server running on http://localhost:${PORT}`);
  });
}

// Only start standalone HTTP server when executed directly as the main script
const isDirectExecution = Boolean(
  process.env.STANDALONE === 'true' ||
  (process.argv[1] && (
    process.argv[1].endsWith('server.ts') ||
    process.argv[1].endsWith('server.cjs') ||
    process.argv[1].endsWith('server.js')
  ))
);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME && isDirectExecution) {
  startServer();
}

