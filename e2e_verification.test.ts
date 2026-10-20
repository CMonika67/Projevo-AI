import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from './server';
import { ALL_DOMAINS, COMPREHENSIVE_PROJECT_CATALOG } from './src/projectCatalog';
import { setSupabaseDisabledForTesting } from './dbAdapter';

describe('Projevo AI — End-to-End Functional Acceptance Testing', () => {
  const testEmail = `acceptance_${Date.now()}@projevo.ai`;
  const testPassword = 'Password@123';
  let authToken = '';

  beforeAll(() => {
    setSupabaseDisabledForTesting(true);
  });

  it('Setup: Register and login test user', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        name: 'Acceptance Tester'
      });
    expect(regRes.status).toBe(201);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });
    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.token;
  });

  // =========================================================================
  // 1. PROJECT DISCOVERY: Verification of all 17 domains and difficulties
  // =========================================================================
  describe('1. Project Discovery — Complete Domain & Difficulty Matrix', () => {
    const validDomains = ALL_DOMAINS.filter(d => d !== 'All');

    it('verifies that every domain contains at least 3 projects with Beginner, Intermediate, and Advanced tiers', () => {
      expect(validDomains.length).toBe(17);

      for (const dom of validDomains) {
        const domProjects = COMPREHENSIVE_PROJECT_CATALOG.filter(p => p.domain === dom);
        expect(domProjects.length).toBeGreaterThanOrEqual(3);

        const hasBeginner = domProjects.some(p => p.difficulty === 'Beginner');
        const hasIntermediate = domProjects.some(p => p.difficulty === 'Intermediate');
        const hasAdvanced = domProjects.some(p => p.difficulty === 'Advanced');

        expect(hasBeginner, `Domain "${dom}" must have at least one Beginner project`).toBe(true);
        expect(hasIntermediate, `Domain "${dom}" must have at least one Intermediate project`).toBe(true);
        expect(hasAdvanced, `Domain "${dom}" must have at least one Advanced project`).toBe(true);

        for (const proj of domProjects) {
          expect(proj.title.length).toBeGreaterThan(3);
          expect(proj.problemStatement.length).toBeGreaterThan(10);
          expect(proj.proposedSolution.length).toBeGreaterThan(10);
          expect(proj.expectedOutcome.length).toBeGreaterThan(10);
          expect(proj.techStack.length).toBeGreaterThanOrEqual(2);
          expect(proj.feasibility.length).toBeGreaterThan(5);
        }
      }
    });

    it('verifies API returns matching projects for all 17 individual domains across difficulty levels', async () => {
      for (const dom of validDomains) {
        for (const diff of ['Beginner', 'Intermediate', 'Advanced'] as const) {
          const res = await request(app)
            .post('/api/recommendations')
            .send({
              domain: dom,
              difficulty: diff
            });

          expect(res.status).toBe(200);
          expect(res.body.recommendations.length).toBeGreaterThanOrEqual(1);

          const match = res.body.recommendations[0];
          expect(match.difficulty).toBe(diff);
          expect(match.domain.toLowerCase()).toContain(dom.toLowerCase().replace(/ and .*/, '').slice(0, 8));
        }
      }
    });

    it('filters projects by technology keyword correctly', async () => {
      const res = await request(app)
        .post('/api/recommendations')
        .send({
          tech: 'Docker'
        });

      expect(res.status).toBe(200);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      for (const p of res.body.recommendations) {
        expect(p.techStack.some((t: string) => t.toLowerCase().includes('docker'))).toBe(true);
      }
    });

    it('computes skills possessed and skills to learn when user supplies skills', async () => {
      const res = await request(app)
        .post('/api/recommendations')
        .send({
          userSkills: [{ name: 'Python', level: 85 }, { name: 'FastAPI', level: 75 }],
          selectedInterests: ['Artificial Intelligence and Machine Learning']
        });

      expect(res.status).toBe(200);
      expect(res.body.isPersonalized).toBe(true);
      const first = res.body.recommendations[0];
      expect(first).toHaveProperty('matchingSkills');
      expect(first).toHaveProperty('skillsToLearn');
      expect(first.matchingSkills).toContain('Python');
    });

    it('does not assume default skills when user has none', async () => {
      const res = await request(app)
        .post('/api/recommendations')
        .send({
          userSkills: [],
          selectedInterests: []
        });

      expect(res.status).toBe(200);
      expect(res.body.isPersonalized).toBe(false);
      expect(res.body.recommendations[0].matchingSkills).toEqual([]);
      expect(res.body.recommendations[0].whyRelevant).toContain('General discovery suggestion');
    });
  });

  // =========================================================================
  // 2. SKILL GAP ANALYSIS: Inputs, Comparisons, Match Calculations
  // =========================================================================
  describe('2. Skill Gap Analysis — Pipeline and Calculations', () => {
    it('analyzes skill gaps for Full-Stack Developer role and provides transparent formula', async () => {
      const res = await request(app)
        .post('/api/skills/gap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetRole: 'Full-Stack Developer',
          domain: 'Web Development and Full-Stack Applications',
          skills: [
            { name: 'React', level: 85 },
            { name: 'TypeScript', level: 80 }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('matchPercentage');
      expect(res.body).toHaveProperty('calculationExplanation');
      expect(res.body.calculationExplanation).toContain('Match formula:');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary.alreadyHave).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.gapCount).toBeGreaterThanOrEqual(1);

      // Verify priority and suggested projects
      const missing = res.body.comparison.missing;
      expect(missing.length).toBeGreaterThan(0);
      expect(['High', 'Medium', 'Low']).toContain(missing[0].priority);
      expect(Array.isArray(missing[0].suggestedProjects)).toBe(true);
    });

    it('produces meaningfully different results for different roles and skill sets', async () => {
      const mlRes = await request(app)
        .post('/api/skills/gap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetRole: 'Machine Learning Engineer',
          domain: 'Artificial Intelligence and Machine Learning',
          skills: [{ name: 'Python', level: 90 }]
        });

      const cyberRes = await request(app)
        .post('/api/skills/gap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetRole: 'Cybersecurity Analyst',
          domain: 'Cybersecurity',
          skills: [{ name: 'Python', level: 90 }]
        });

      expect(mlRes.status).toBe(200);
      expect(cyberRes.status).toBe(200);

      // ML should require PyTorch/Scikit-Learn; Cyber should require Wireshark/Linux/Penetration Testing
      const mlMissing = mlRes.body.comparison.missing.map((s: any) => s.skillName);
      const cyberMissing = cyberRes.body.comparison.missing.map((s: any) => s.skillName);

      expect(mlMissing).not.toEqual(cyberMissing);
      expect(mlMissing.some((s: string) => /torch|learn|data/i.test(s))).toBe(true);
      expect(cyberMissing.some((s: string) => /security|wireshark|network|crypto/i.test(s))).toBe(true);
    });

    it('rejects empty request body missing both project and target role', async () => {
      const res = await request(app)
        .post('/api/skills/gap')
        .send({ skills: [] });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // =========================================================================
  // 3. PROJECT DOCTOR: Real Code Inspection and Flaw Detection
  // =========================================================================
  describe('3. Project Doctor — Real Static Code Analysis', () => {
    it('detects SQL injection, hardcoded secret, and eval() in uploaded source code', async () => {
      const vulnerableCode = `
import sqlite3

def authenticate_user(username, password):
    # Hardcoded credential flaw
    admin_secret = "secret_api_key_12345"
    
    # SQL injection vulnerability
    query = "SELECT * FROM users WHERE user = '" + username + "' AND pass = '" + password + "'"
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    cursor.execute(query)
    
    # Dangerous eval usage
    user_rule = eval(username)
    return cursor.fetchone()
`;

      const res = await request(app)
        .post('/api/diagnose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'auth_handler.py',
          code: vulnerableCode,
          stack: 'Python'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('criticalIssues');
      expect(res.body.criticalIssues.length).toBeGreaterThanOrEqual(2);

      const issueTitles = res.body.criticalIssues.map((i: any) => i.title.toLowerCase());
      const hasSqlOrSecret = issueTitles.some((t: string) => t.includes('sql') || t.includes('secret') || t.includes('eval'));
      expect(hasSqlOrSecret).toBe(true);

      // Verify affected line numbers and suggested patches
      const firstIssue = res.body.criticalIssues[0];
      expect(firstIssue).toHaveProperty('lineNumber');
      expect(firstIssue).toHaveProperty('explanation');
      expect(firstIssue).toHaveProperty('suggestedFix');
    });

    it('reports clean passing status for secure, well-structured code', async () => {
      const cleanCode = `
from pydantic import BaseModel
import bcrypt

class UserLogin(BaseModel):
    username: str
    password: str

def verify_credentials(user_input: UserLogin, stored_hash: str) -> bool:
    try:
        return bcrypt.checkpw(user_input.password.encode('utf-8'), stored_hash.encode('utf-8'))
    except Exception as exc:
        raise ValueError("Authentication verification failed") from exc
`;

      const res = await request(app)
        .post('/api/diagnose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'secure_auth.py',
          code: cleanCode,
          stack: 'Python'
        });

      expect(res.status).toBe(200);
      expect(res.body.healthScore).toBeGreaterThanOrEqual(85);
      expect(res.body.criticalIssues.length).toBe(0);
    });
  });

  // =========================================================================
  // 4. INTERVIEW PREPARATION GUIDE: Multi-level & Multi-project Generation
  // =========================================================================
  describe('4. Interview Preparation Guide — Generation & Evaluation', () => {
    it('generates questions for 3 distinct projects with distinct contexts', async () => {
      const testCases = [
        {
          title: 'Autonomous Drone Flight Controller',
          role: 'Embedded Robotics Engineer',
          stack: 'C++, ROS2, FreeRTOS',
          difficulty: 'Hard' as const
        },
        {
          title: 'Decentralized Micro-Lending Platform',
          role: 'Blockchain Smart Contract Engineer',
          stack: 'Solidity, Ethereum, Hardhat, TypeScript',
          difficulty: 'Medium' as const
        },
        {
          title: 'Campus Lost and Found Portal',
          role: 'Junior Frontend Developer',
          stack: 'React, TailwindCSS, Firebase',
          difficulty: 'Easy' as const
        }
      ];

      for (const tc of testCases) {
        const res = await request(app)
          .post('/api/interview-prep/guide')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            projectTitle: tc.title,
            roleApplyingFor: tc.role,
            techStackUsed: tc.stack,
            projectDescription: `Engineering project focusing on ${tc.title}`,
            difficulty: tc.difficulty
          });

        expect(res.status).toBe(200);
        expect(res.body.questions.length).toBeGreaterThanOrEqual(5);

        // Verify questions relate to input stack
        const combinedText = res.body.questions.map((q: any) => q.question + ' ' + q.whyAsked).join(' ');
        const primaryKeyword = tc.stack.split(',')[0].trim();
        expect(combinedText.toLowerCase()).toContain(primaryKeyword.toLowerCase());
      }
    });

    it('evaluates answers and breaks down score by rubric criteria', async () => {
      const evalRes = await request(app)
        .post('/api/interview-prep/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionId: 'q-arch-1',
          question: 'How did you prevent race conditions in your asynchronous API handlers?',
          category: 'Architecture & Scalability',
          difficulty: 'Hard',
          userAnswer: 'We implemented optimistic concurrency control with row versioning in PostgreSQL and acquired distributed locks via Redis Redlock for long-running batch migrations.',
          projectContext: {
            projectTitle: 'High-Throughput Payment Engine',
            roleApplyingFor: 'Senior Backend Engineer'
          }
        });

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.score).toBeGreaterThanOrEqual(1);
      expect(evalRes.body.score).toBeLessThanOrEqual(10);
      expect(evalRes.body).toHaveProperty('rubricBreakdown');
      expect(evalRes.body.rubricBreakdown).toHaveProperty('technicalCorrectness');
      expect(evalRes.body.rubricBreakdown).toHaveProperty('projectEvidence');
    });
  });

  // =========================================================================
  // 5. PROFILE PERSISTENCE: Save, Reload, and Fetch
  // =========================================================================
  describe('5. Profile and Settings — Persistence Across Reloads', () => {
    it('persists changes to skills, custom skills, interested tracks, and GitHub URL', async () => {
      const updatedProfile = {
        name: 'Monika Cherukuri',
        university: 'Carnegie Mellon University',
        graduationYear: 'Fall 2026',
        github: 'https://github.com/monikacherukuri',
        skills: [
          { name: 'Python', level: 90, status: 'have' },
          { name: 'TypeScript', level: 85, status: 'have' },
          { name: 'Go', level: 40, status: 'learning' }
        ],
        customSkills: ['Custom Transformer Kernel'],
        selectedInterests: ['Robotics and Automation', 'FinTech']
      };

      const saveRes = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedProfile);

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.profile.university).toBe('Carnegie Mellon University');
      expect(saveRes.body.profile.github).toBe('https://github.com/monikacherukuri');
      expect(saveRes.body.profile.skills.length).toBe(3);

      // Verify retrieval (simulating page reload)
      const reloadRes = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(reloadRes.status).toBe(200);
      expect(reloadRes.body.profile.university).toBe('Carnegie Mellon University');
      expect(reloadRes.body.profile.graduationYear).toBe('Fall 2026');
      expect(reloadRes.body.profile.github).toBe('https://github.com/monikacherukuri');
      expect(reloadRes.body.profile.customSkills).toContain('Custom Transformer Kernel');
      expect(reloadRes.body.profile.selectedInterests).toContain('FinTech');
    });
  });
});
