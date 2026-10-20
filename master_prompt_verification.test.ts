import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from './server';
import { ALL_DOMAINS, COMPREHENSIVE_PROJECT_CATALOG } from './src/projectCatalog';
import { setSupabaseDisabledForTesting } from './dbAdapter';

describe('Projevo AI — Master Prompt Final Acceptance Verification (14 Scenarios)', () => {
  const userAEmail = `master_user_a_${Date.now()}@projevo.ai`;
  const userBEmail = `master_user_b_${Date.now()}@projevo.ai`;
  const password = 'SecurePassword@123';
  let tokenA = '';
  let tokenB = '';

  beforeAll(async () => {
    setSupabaseDisabledForTesting(true);
    // Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: userAEmail, password, name: 'Student Alice' });
    expect(regA.status).toBe(201);

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: userAEmail, password });
    expect(loginA.status).toBe(200);
    tokenA = loginA.body.token;

    // Register User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: userBEmail, password, name: 'Student Bob' });
    expect(regB.status).toBe(201);

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: userBEmail, password });
    expect(loginB.status).toBe(200);
    tokenB = loginB.body.token;
  });

  // 1. New user login and empty dashboard
  it('Scenario 1: New user login and empty dashboard (no default projects or fabricated metrics)', async () => {
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.project).toBeNull();
    expect(meRes.body.profile.skills).toEqual([]);

    const profileRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.project).toBeNull();
    expect(profileRes.body.latestAnalysis).toBeNull();
  });

  // 2. Saving both skill lists across refreshes and new sessions
  it('Scenario 2: Saving both skill lists (Skills I Have with proficiency, Skills I Want to Learn)', async () => {
    const skillsPayload = [
      { name: 'Python', level: 85, status: 'have' },
      { name: 'FastAPI', level: 75, status: 'have' },
      { name: 'PostgreSQL', level: 60, status: 'have' },
      { name: 'Kubernetes', level: 30, status: 'learning' },
      { name: 'Distributed Systems', level: 20, status: 'learning' }
    ];

    const saveRes = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        skills: skillsPayload,
        college: 'MIT',
        course: 'B.Tech Computer Science',
        yearOfStudy: '3rd Year',
        github: 'https://github.com/alice-mit'
      });
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.profile.skills.length).toBe(5);

    // Verify persistence across new request (survives refresh)
    const checkRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.profile.skills.length).toBe(5);
    const pythonSkill = checkRes.body.profile.skills.find((s: any) => s.name === 'Python');
    expect(pythonSkill.level).toBe(85);
    expect(pythonSkill.status).toBe('have');

    const k8sSkill = checkRes.body.profile.skills.find((s: any) => s.name === 'Kubernetes');
    expect(k8sSkill.status).toBe('learning');
  });

  // 3. Editing and removing saved skills
  it('Scenario 3: Editing skill proficiency and removing saved skills with persistence', async () => {
    // Edit proficiency of PostgreSQL from 60 to 90
    const editRes = await request(app)
      .put('/api/profile/skills')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'PostgreSQL', level: 90 });
    expect(editRes.status).toBe(200);
    const pgSkill = editRes.body.profile.skills.find((s: any) => s.name === 'PostgreSQL');
    expect(pgSkill.level).toBe(90);

    // Delete a skill
    const delRes = await request(app)
      .delete('/api/profile/skills/Kubernetes')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.profile.skills.some((s: any) => s.name === 'Kubernetes')).toBe(false);

    // Confirm deletion persists
    const confirmRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(confirmRes.body.profile.skills.some((s: any) => s.name === 'Kubernetes')).toBe(false);
  });

  // 4. Project Discovery for every supported domain and level
  it('Scenario 4: Project Discovery for every supported domain and difficulty level', async () => {
    const validDomains = ALL_DOMAINS.filter(d => d !== 'All');
    expect(validDomains.length).toBe(17);

    for (const domainName of validDomains) {
      const recRes = await request(app)
        .get('/api/recommendations')
        .query({ domain: domainName });
      expect(recRes.status).toBe(200);
      expect(recRes.body.projects.length).toBeGreaterThanOrEqual(3);

      const difficulties = recRes.body.projects.map((p: any) => p.difficulty);
      expect(difficulties).toContain('Beginner');
      expect(difficulties).toContain('Intermediate');
      expect(difficulties).toContain('Advanced');
    }
  });

  // 5. Adding a project and correctly populating the dashboard
  it('Scenario 5: Adding a project and correctly populating the dashboard', async () => {
    const catalogProject = COMPREHENSIVE_PROJECT_CATALOG[0];

    const addRes = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        project: {
          id: catalogProject.id,
          title: catalogProject.title,
          tagline: catalogProject.description,
          domain: catalogProject.domain,
          difficulty: catalogProject.difficulty,
          techStack: catalogProject.techStack,
          status: 'In Progress',
          stage: 'Requirements & Architecture',
          stageProgress: 25,
          matchScore: 88,
          healthScore: 85
        }
      });
    expect(addRes.status).toBe(200);
    expect(addRes.body.project.title).toBe(catalogProject.title);

    // Verify session check reflects selected project
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(meRes.body.project).not.toBeNull();
    expect(meRes.body.project.title).toBe(catalogProject.title);
  });

  // 6. Matching project requirements with the user's saved skills
  it('Scenario 6: Matching project requirements with the user saved skills into 4 tiers', async () => {
    const targetProject = {
      id: 'test-custom-pipeline',
      title: 'Automated Pipeline Service',
      domain: 'Cloud Computing and DevOps',
      techStack: ['Python', 'PostgreSQL', 'Docker', 'Redis']
    };

    const gapRes = await request(app)
      .post('/api/skills/gap')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        project: targetProject,
        userSkills: [
          { name: 'Python', level: 85 }, // Aligned
          { name: 'PostgreSQL', level: 90 }, // Aligned
          { name: 'Docker', level: 40 } // Needs Improvement
          // Redis is missing from inventory
        ]
      });

    expect(gapRes.status).toBe(200);
    expect(gapRes.body.haveSkills.map((s: any) => s.skill)).toContain('Python');
    expect(gapRes.body.haveSkills.map((s: any) => s.skill)).toContain('PostgreSQL');
    expect(gapRes.body.needsImprovementSkills.map((s: any) => s.skill)).toContain('Docker');
    expect(gapRes.body.missingSkills).toContain('Redis');
  });

  // 7. Project Doctor findings against real uploaded files
  it('Scenario 7: Project Doctor findings against real uploaded code with deterministic line evidence', async () => {
    const vulnerableCode = `
import os
import sqlite3

def get_user_profile(user_id):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # SQL INJECTION VULNERABILITY:
    query = "SELECT * FROM users WHERE id = '" + user_id + "'"
    cursor.execute(query)
    # HARDCODED SECRET:
    api_key = "AIzaSyD-secret-token-12345"
    return cursor.fetchall()
`;

    const diagRes = await request(app)
      .post('/api/diagnose')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from(vulnerableCode), 'data_access.py')
      .field('stack', 'Python, SQLite');

    expect(diagRes.status).toBe(200);
    expect(diagRes.body.overallHealth).toBeLessThan(100);
    expect(diagRes.body.criticalIssues.length).toBeGreaterThan(0);

    const sqlIssue = diagRes.body.criticalIssues.find((i: any) =>
      i.title.toLowerCase().includes('sql') || i.recommendation.toLowerCase().includes('sql')
    );
    expect(sqlIssue).toBeDefined();
    expect(sqlIssue.line).toBeGreaterThan(0);
    expect(sqlIssue.codeSnippet).toBeDefined();
    expect(sqlIssue.suggestedPatch).toBeDefined();
  });

  // 8. Health Report generation with evidence and documented scoring
  it('Scenario 8: Health Report generation with categories, scoring rationale, and verified metrics', async () => {
    const cleanCode = `
def add(a: int, b: int) -> int:
    """Safe addition function with type hints."""
    return a + b
`;

    const diagRes = await request(app)
      .post('/api/diagnose')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from(cleanCode), 'math_utils.py');

    expect(diagRes.status).toBe(200);
    expect(diagRes.body.categories).toBeInstanceOf(Array);
    expect(diagRes.body.categories.length).toBeGreaterThanOrEqual(4);
    const categoryNames = diagRes.body.categories.map((c: any) => c.name);
    expect(categoryNames).toContain('Code Quality');
    expect(categoryNames).toContain('Security');
  });

  // 9. Consistency between Project Doctor, Skill Gap Analysis and dashboard
  it('Scenario 9: Consistency between Project Doctor, Skill Gap Analysis, and Dashboard', async () => {
    const sampleProject = COMPREHENSIVE_PROJECT_CATALOG[2]; // Advanced project

    const profileUpdateRes = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        project: {
          id: sampleProject.id,
          title: sampleProject.title,
          domain: sampleProject.domain,
          techStack: sampleProject.techStack,
          status: 'In Progress',
          stage: 'Core Architecture',
          stageProgress: 30,
          healthReport: {
            overallHealth: 88,
            categories: [
              { name: 'Code Quality', score: 90, status: 'good', icon: 'code' },
              { name: 'Security', score: 86, status: 'good', icon: 'security' }
            ],
            criticalIssues: []
          }
        }
      });
    expect(profileUpdateRes.status).toBe(200);
    expect(profileUpdateRes.body.project.techStack).toEqual(sampleProject.techStack);

    // Verify Skill Gap Analysis uses this identical project requirements
    const gapRes = await request(app)
      .post('/api/skills/gap')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        projectId: sampleProject.id
      });
    expect(gapRes.status).toBe(200);
    expect(gapRes.body.projectTitle).toBe(sampleProject.title);
    expect(gapRes.body.requirements).toEqual(sampleProject.techStack);
  });

  // 10. Interview question generation using every required input
  it('Scenario 10: Interview question generation using all required inputs and company preference', async () => {
    const guideRes = await request(app)
      .post('/api/interview-prep/guide')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        projectTitle: 'Zero-Knowledge Auth Gateway',
        projectDescription: 'Privacy-preserving credential authentication service using SRP-6a protocol proofs.',
        techStackUsed: 'Rust, TypeScript, Docker, WebSockets',
        roleContribution: 'Engineered ephemeral key exchange and zero-knowledge proof verification pipeline.',
        roleApplyingFor: 'Senior Security Systems Engineer',
        companyPreference: 'Google',
        jobDescription: 'Design resilient, scalable infrastructure with low latency and zero trust boundaries.',
        difficulty: 'Hard'
      });

    expect(guideRes.status).toBe(200);
    expect(guideRes.body.questions.length).toBeGreaterThanOrEqual(6);
    expect(guideRes.body.targetRole).toBe('Senior Security Systems Engineer');

    // Sourced interview questions must be clearly distinguished
    const hasSourced = guideRes.body.questions.some((q: any) => q.isSourced === true);
    expect(hasSourced).toBe(true);

    // Evaluate practice answer
    const evalRes = await request(app)
      .post('/api/interview-prep/evaluate')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        questionId: guideRes.body.questions[0].id,
        question: guideRes.body.questions[0].question,
        userAnswer: 'We selected SRP-6a because it eliminates plaintext password exposure over the wire. We benchmarked it against OAuth2 and confirmed that computational overhead on the server was less than 15ms per exchange.',
        difficulty: 'Hard',
        projectDetails: {
          title: 'Zero-Knowledge Auth Gateway',
          techStack: 'Rust, TypeScript, Docker'
        }
      });

    expect(evalRes.status).toBe(200);
    expect(evalRes.body.score).toBeGreaterThanOrEqual(0);
    expect(evalRes.body.score).toBeLessThanOrEqual(10);
    expect(evalRes.body.rubricBreakdown).toBeDefined();
  });

  // 11. Onboarding recommendations based on user goals
  it('Scenario 11: Onboarding preferences saved without automatically setting active project', async () => {
    const onboardRes = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        interestedRoles: ['Machine Learning Engineer'],
        selectedInterests: ['AI / ML', 'Healthcare'],
        learningPreferences: 'Hands-on practical code with unit testing',
        onboardingGoals: 'Build capstone portfolio project for technical interview defense'
      });

    expect(onboardRes.status).toBe(200);
    expect(onboardRes.body.profile.interestedRoles).toContain('Machine Learning Engineer');
    expect(onboardRes.body.profile.learningPreferences).toBe('Hands-on practical code with unit testing');
    // Ensure project is STILL null for User B
    expect(onboardRes.body.project).toBeNull();
  });

  // 12. Idea analysis, report saving and explicit project selection
  it('Scenario 12: Idea analysis generates full structured report and explicit project selection', async () => {
    const ideaRes = await request(app)
      .post('/api/analyze-idea')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        idea: 'An edge-computed audio classifier to assist hearing-impaired students in large lecture halls.',
        domain: 'AI / ML',
        targetUsers: 'Hearing impaired university students',
        preferredTech: 'Python, FastAPI, Web Audio API',
        objective: 'Capstone & Portfolio'
      });

    expect(ideaRes.status).toBe(200);
    expect(ideaRes.body.title).toBeDefined();
    expect(ideaRes.body.problemStatement).toBeDefined();
    expect(ideaRes.body.proposedSolution).toBeDefined();
    expect(ideaRes.body.feasibility).toBeDefined();
    expect(ideaRes.body.recommendedTechnologies.length).toBeGreaterThan(0);
    expect(ideaRes.body.roadmap.length).toBeGreaterThanOrEqual(4);
    expect(ideaRes.body.testingStrategy).toBeDefined();
    expect(ideaRes.body.risksAndMitigations.length).toBeGreaterThan(0);

    // Verify User A can explicitly adopt the analyzed idea as active project
    const adoptRes = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        project: {
          id: 'proj_idea_adopted',
          title: ideaRes.body.title,
          tagline: ideaRes.body.tagline,
          domain: ideaRes.body.domain,
          techStack: ideaRes.body.techStack,
          status: 'In Progress'
        }
      });

    expect(adoptRes.status).toBe(200);
    expect(adoptRes.body.project.title).toBe(ideaRes.body.title);
  });

  // 13. Isolation of data between different users
  it('Scenario 13: Strict data isolation between User A and User B', async () => {
    // User A has project 'proj_idea_adopted'
    const profileA = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(profileA.body.project).not.toBeNull();

    // User B must have null project and isolated profile
    const profileB = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(profileB.body.project).toBeNull();
    expect(profileB.body.profile.email).toBe(userBEmail);
    expect(profileB.body.profile.email).not.toBe(userAEmail);

    // User B cannot overwrite User A data
    const tamperRes = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Tampered Hacker Name' });
    expect(tamperRes.status).toBe(200);

    const recheckA = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(recheckA.body.profile.name).toBe('Student Alice');
  });

  // 14. Error handling, responsive UI and production build
  it('Scenario 14: Error handling, bad payloads, and security limits', async () => {
    // Unauthenticated request without token must fail with 401
    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);

    // Invalid/expired token on profile must fail with 401
    const invalidTokenRes = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer invalid_expired_session_token');
    expect(invalidTokenRes.status).toBe(401);

    // Blank idea analysis request
    const badIdeaRes = await request(app)
      .post('/api/analyze-idea')
      .send({ idea: '' });
    expect(badIdeaRes.status).toBe(400);

    // Blank interview prep request
    const badGuideRes = await request(app)
      .post('/api/interview-prep/guide')
      .send({ projectTitle: '' });
    expect(badGuideRes.status).toBe(400);

    // Unsupported file extension is rejected with descriptive error
    const badFileRes = await request(app)
      .post('/api/diagnose')
      .attach('file', Buffer.from('malicious payload'), 'exploit.exe');
    expect([400, 500]).toContain(badFileRes.status);
    expect(badFileRes.body.error).toContain('Invalid project file format');
  });
});
