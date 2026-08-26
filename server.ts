import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// Diagnostic Engine API
app.post('/api/diagnose', async (req, res) => {
  try {
    const { code, stack, description, filename } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      // Return structured fallback diagnostic if key is absent
      return res.json({
        overallHealth: 81,
        statusText: 'Healthy with improvements needed',
        summary: 'Your project architecture is solid. We\'ve detected a few critical areas requiring immediate attention to ensure long-term stability and security.',
        categories: [
          { name: 'Code Quality', score: 86, status: 'good', icon: 'code', note: 'Clean modular structure with clear separation of concerns.' },
          { name: 'Security', score: 72, status: 'needs-attention', icon: 'security', note: 'Missing rate-limiting on authentication routes & unhashed token cache.' },
          { name: 'Brute-Force', score: 60, status: 'critical', icon: 'shield_off', note: 'No exponential backoff on login attempts detected.' },
          { name: 'Accessibility', score: 78, status: 'needs-attention', icon: 'accessibility_new', note: 'Missing ARIA labels on dynamic chart elements and touch targets.' },
          { name: 'Performance', score: 88, status: 'good', icon: 'speed', note: 'Efficient algorithmic time complexity and minimal re-renders.' },
          { name: 'Google Services', score: 80, status: 'good', icon: 'cloud_done', note: 'Proper lazy initialization for SDK clients.' }
        ],
        criticalIssues: [
          { id: '1', title: 'Brute-Force Vulnerability on Auth Route', severity: 'Critical', line: 42, recommendation: 'Implement Redis token-bucket rate limiting to cap failed requests to 5/min.' },
          { id: '2', title: 'Unhandled Exception in Data Ingestion', severity: 'High', line: 19, recommendation: 'Ensure cleaned_subset is initialized in outer scope before try/except.' },
          { id: '3', title: 'Unsanitized SQL/Query Parameter', severity: 'Medium', line: 88, recommendation: 'Use parameterized queries rather than f-strings for database lookups.' }
        ]
      });
    }

    const prompt = `You are Projevo AI's Senior Engineering Project Doctor. Analyze this student project code / context and provide a structured technical health diagnostic.
Project Stack: ${stack || 'Python / ML'}
Description: ${description || 'Student AI project'}
File: ${filename || 'main.py'}

Code Snippet:
\`\`\`
${code || '# No code provided'}
\`\`\`

Return a JSON response strictly matching this structure:
{
  "overallHealth": number (0-100),
  "statusText": "Healthy with improvements needed" | "Optimal Health" | "Critical Attention Needed",
  "summary": "2 sentences summarizing architectural standing",
  "categories": [
    { "name": "Code Quality", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "code", "note": "brief observation" },
    { "name": "Security", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "security", "note": "brief observation" },
    { "name": "Brute-Force", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "shield_off", "note": "brief observation" },
    { "name": "Accessibility", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "accessibility_new", "note": "brief observation" },
    { "name": "Performance", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "speed", "note": "brief observation" },
    { "name": "Google Services", "score": number, "status": "good"|"needs-attention"|"critical", "icon": "cloud_done", "note": "brief observation" }
  ],
  "criticalIssues": [
    { "id": "1", "title": "short title", "severity": "Critical"|"High"|"Medium", "line": number, "recommendation": "actionable fix" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return res.json(parsed);
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    return res.json(JSON.parse(response.text?.trim() || '{}'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mock Interview Prep API
app.post('/api/interview-prep', async (req, res) => {
  try {
    const { projectTitle, topic } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        question: `In your ${projectTitle || 'AI Healthcare Assistant'} project, how did you handle data privacy and ensure that patient identifying information was scrubbed prior to model inference?`,
        followUp: 'What would happen if your backend received a high concurrency spike during clinical shift changes?',
        keyTopics: ['HIPAA / Privacy Scrubber', 'Batch Processing vs Stream', 'Latency Budget']
      });
    }

    const prompt = `Generate a realistic engineering job interview question asked to Monika about her portfolio project "${projectTitle || 'AI Healthcare Assistant'}". Topic focus: ${topic || 'System Design & Machine Learning'}.
Return JSON:
{
  "question": "technical question",
  "followUp": "follow up question",
  "keyTopics": ["topic1", "topic2", "topic3"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    return res.json(JSON.parse(response.text?.trim() || '{}'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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

startServer();
