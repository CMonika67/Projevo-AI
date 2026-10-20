import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import { app, readDB, writeDB } from './server';
import crypto from 'crypto';
import { setSupabaseDisabledForTesting } from './dbAdapter';

describe('Projevo AI — Complete Feature Improvements Verification', () => {
  const testUserEmail = `test_engineer_${Date.now()}@projevo.ai`;
  const testPassword = 'Password@123';
  let authToken = '';

  beforeAll(() => {
    setSupabaseDisabledForTesting(true);
  });

  beforeEach(() => {
    // DB isolation
  });

  // 1. PROFILE AND SETTINGS: Skills, Interests, GitHub
  describe('Profile & Settings Updates', () => {
    it('new user should start with NO default skills selected and empty dashboard', async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUserEmail,
          password: testPassword,
          name: 'Fresh Engineer'
        });

      expect(regRes.status).toBe(201);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: testPassword
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
      authToken = loginRes.body.token;

      // Check profile
      const profRes = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profRes.status).toBe(200);
      expect(profRes.body.profile.skills).toEqual([]);
      expect(profRes.body.profile.selectedInterests).toEqual([]);
      expect(profRes.body.project).toBeNull();
    });

    it('should save standard skills, custom skills, and GitHub account persistently', async () => {
      const updateRes = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          github: 'https://github.com/projevo-engineer',
          skills: [
            { name: 'Python', level: 80, status: 'have' },
            { name: 'React', level: 70, status: 'have' },
            { name: 'Rust', level: 30, status: 'learning' }
          ],
          customSkills: ['Custom Neural Compiler'],
          selectedInterests: ['Artificial Intelligence & Machine Learning', 'Cybersecurity'],
          interestedRoles: ['AI / Machine Learning Engineer', 'Backend Systems Engineer']
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.profile.github).toBe('https://github.com/projevo-engineer');
      expect(updateRes.body.profile.skills.length).toBe(3);

      // Verify persistence by fetching profile again
      const verifyRes = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.profile.github).toBe('https://github.com/projevo-engineer');
      expect(verifyRes.body.profile.skills.length).toBe(3);
      expect(verifyRes.body.profile.skills[2].name).toBe('Rust');
      expect(verifyRes.body.profile.skills[2].status).toBe('learning');
      expect(verifyRes.body.profile.selectedInterests).toContain('Cybersecurity');
    });

    it('should generate personalized recommendations when user has confirmed skills & interests', async () => {
      const recRes = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userSkills: [{ name: 'Python', level: 80 }],
          selectedInterests: ['Artificial Intelligence & Machine Learning']
        });

      expect(recRes.status).toBe(200);
      expect(recRes.body.isPersonalized).toBe(true);
      expect(Array.isArray(recRes.body.recommendations)).toBe(true);
      expect(recRes.body.recommendations.length).toBeGreaterThan(0);
      expect(recRes.body.recommendations[0]).toHaveProperty('whyRelevant');
    });

    it('should allow general discovery without falsely labeling as personalized when user has no preferences', async () => {
      const recRes = await request(app)
        .post('/api/recommendations')
        .send({
          userSkills: [],
          selectedInterests: []
        });

      expect(recRes.status).toBe(200);
      expect(recRes.body.isPersonalized).toBe(false);
      expect(recRes.body.recommendations[0].whyRelevant).toContain('General discovery suggestion');
    });
  });

  // 2. PROJECT DISCOVERY: Expanded catalog and filters
  describe('Project Discovery Catalog', () => {
    it('should filter by domain and difficulty level', async () => {
      const filterRes = await request(app)
        .post('/api/recommendations')
        .send({
          domain: 'Cybersecurity',
          difficulty: 'Intermediate'
        });

      expect(filterRes.status).toBe(200);
      expect(filterRes.body.recommendations.length).toBeGreaterThan(0);
      for (const proj of filterRes.body.recommendations) {
        expect(proj.domain.toLowerCase()).toContain('cybersecurity');
        expect(proj.difficulty).toBe('Intermediate');
        expect(proj).toHaveProperty('problemStatement');
        expect(proj).toHaveProperty('proposedSolution');
        expect(proj).toHaveProperty('feasibility');
      }
    });

    it('should update active project when user selects a project', async () => {
      const newProj = {
        id: 'zero-knowledge-auth-gateway',
        title: 'Zero-Knowledge Auth Gateway',
        tagline: 'Privacy-preserving credential authentication',
        domain: 'Cybersecurity',
        difficulty: 'Intermediate',
        techStack: ['Rust', 'WebAssembly', 'Node.js', 'Redis'],
        status: 'In Progress',
        matchScore: 92,
        healthScore: 88,
        readinessScore: 60,
        stage: 'Architecture',
        stageProgress: 30,
        issuesCount: 0
      };

      const setProjRes = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ project: newProj });

      expect(setProjRes.status).toBe(200);
      expect(setProjRes.body.project.title).toBe('Zero-Knowledge Auth Gateway');

      // Verify dashboard retrieval
      const getRes = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.body.project.title).toBe('Zero-Knowledge Auth Gateway');
      expect(getRes.body.project.techStack).toContain('Rust');
    });
  });

  // 3. PROJECT DOCTOR: Auto-inference from files
  describe('Project Doctor Inference & Diagnostics', () => {
    it('should automatically infer project title, description, and stack from uploaded package.json', async () => {
      const mockPackageJson = JSON.stringify({
        name: 'medical-triage-microservice',
        description: 'Automated triage service powered by express and redis',
        dependencies: {
          'express': '^4.18.2',
          'redis': '^4.6.7',
          'typescript': '^5.0.0'
        }
      });

      const diagRes = await request(app)
        .post('/api/diagnose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filename: 'package.json',
          code: mockPackageJson
        });

      expect(diagRes.status).toBe(200);
      expect(diagRes.body).toHaveProperty('inferredProject');
      expect(diagRes.body.inferredProject.title).toContain('Medical Triage Microservice');
      expect(diagRes.body.inferredProject.techStack).toContain('Express.js');
      expect(diagRes.body.inferredProject.confidence).toBe('high');
    });
  });

  // 4. SKILL GAP ANALYSIS & PROGRESS
  describe('Skill Gap Analysis API', () => {
    it('should compare project tech stack with user skills and categorize into have, needs-improvement, missing', async () => {
      const gapRes = await request(app)
        .post('/api/skills/gap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'ai-healthcare-assistant',
          skills: [
            { name: 'Python', level: 85, status: 'have' },
            { name: 'FastAPI', level: 40, status: 'have' }
            // PyTorch, Pandas, Docker missing
          ]
        });

      expect(gapRes.status).toBe(200);
      expect(gapRes.body).toHaveProperty('roadmap');
      expect(gapRes.body).toHaveProperty('haveSkills');
      expect(gapRes.body).toHaveProperty('needsImprovementSkills');
      expect(gapRes.body).toHaveProperty('missingSkills');

      const haveNames = gapRes.body.haveSkills.map((s: any) => s.skill);
      expect(haveNames).toContain('Python');

      const needsImpNames = gapRes.body.needsImprovementSkills.map((s: any) => s.skill);
      expect(needsImpNames).toContain('FastAPI');

      const missingNames = gapRes.body.missingSkills;
      expect(missingNames).toContain('PyTorch');
    });

    it('should persist completed learning milestones', async () => {
      const milestoneRes = await request(app)
        .post('/api/skills/gap/milestone')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'ai-healthcare-assistant',
          skill: 'PyTorch',
          completed: true
        });

      expect(milestoneRes.status).toBe(200);
      expect(milestoneRes.body.completedMilestones).toContain('PyTorch');
    });
  });

  // 5. INTERVIEW PREP & ANSWER EVALUATION
  describe('Interview Prep & Rubric Evaluation', () => {
    it('should reject interview guide generation when project title is missing with 400', async () => {
      const res = await request(app)
        .post('/api/interview-prep/guide')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectTitle: '   ',
          difficulty: 'Medium'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/project title is required/i);
    });

    it('should generate interview questions for Easy, Medium, and Hard difficulty levels with full structured schema', async () => {
      for (const diff of ['Easy', 'Medium', 'Hard'] as const) {
        const guideRes = await request(app)
          .post('/api/interview-prep/guide')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            projectTitle: 'AI Healthcare Assistant',
            projectDescription: 'Clinical triage and symptom entity extraction',
            myRole: 'Built data processing and NER pipeline',
            roleApplyingFor: 'Machine Learning Engineer',
            techStack: 'Python, PyTorch, FastAPI',
            difficulty: diff,
            companyPreference: 'Google'
          });

        expect(guideRes.status).toBe(200);
        expect(Array.isArray(guideRes.body.questions)).toBe(true);
        expect(guideRes.body.questions.length).toBeGreaterThan(0);
        
        const q0 = guideRes.body.questions[0];
        expect(q0).toHaveProperty('id');
        expect(q0).toHaveProperty('category');
        expect(q0).toHaveProperty('difficulty');
        expect(q0).toHaveProperty('question');
        expect(q0).toHaveProperty('whyAsked');
        expect(q0).toHaveProperty('keyPoints');
        expect(Array.isArray(q0.keyPoints)).toBe(true);
        expect(q0).toHaveProperty('exampleAnswer');
      }
    });

    it('should return cached interview questions instantly on repeated submission (<100ms)', async () => {
      const payload = {
        projectTitle: 'AI Healthcare Assistant',
        projectDescription: 'Clinical triage and symptom entity extraction',
        myRole: 'Built data processing and NER pipeline',
        roleApplyingFor: 'Machine Learning Engineer',
        techStack: 'Python, PyTorch, FastAPI',
        difficulty: 'Medium',
        companyPreference: 'Google'
      };

      const start = Date.now();
      const res = await request(app)
        .post('/api/interview-prep/guide')
        .set('Authorization', `Bearer ${authToken}`)
        .send(payload);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body._cached).toBe(true);
      expect(duration).toBeLessThan(100);
    });

    it('should deduplicate concurrent in-flight interview guide requests', async () => {
      const freshTitle = `Realtime Financial Fraud Engine ${Date.now()}`;
      const payload = {
        projectTitle: freshTitle,
        projectDescription: 'Streaming anomaly detection for credit card transactions',
        roleContribution: 'Architected Kafka ingestion and low-latency feature extraction',
        roleApplyingFor: 'Senior Backend Engineer',
        techStackUsed: 'Go, Kafka, Redis, ClickHouse',
        difficulty: 'Hard'
      };

      const [res1, res2] = await Promise.all([
        request(app).post('/api/interview-prep/guide').set('Authorization', `Bearer ${authToken}`).send(payload),
        request(app).post('/api/interview-prep/guide').set('Authorization', `Bearer ${authToken}`).send(payload)
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.questions.length).toBeGreaterThanOrEqual(4);
      expect(res2.body.questions.length).toBe(res1.body.questions.length);
      expect(res1.body.questions[0].question).toEqual(res2.body.questions[0].question);
    });

    it('should evaluate user answer against rubric and return score out of 10 with strengths and improvements', async () => {
      const evalRes = await request(app)
        .post('/api/interview-prep/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questionId: 'q-ml-1',
          question: 'How did you handle patient identifying information prior to model training?',
          category: 'Security & Architecture',
          difficulty: 'Medium',
          userAnswer: 'We built a data sanitization layer using regex and spaCy to strip all patient names, dates, and locations before hashing records into UUIDs.',
          projectContext: {
            projectTitle: 'AI Healthcare Assistant',
            projectDescription: 'Clinical triage pipeline',
            roleContribution: 'Developed privacy filter and tokenizer',
            techStackUsed: 'Python, spaCy, PyTorch',
            roleApplyingFor: 'ML Engineer'
          }
        });

      expect(evalRes.status).toBe(200);
      expect(evalRes.body).toHaveProperty('score');
      expect(evalRes.body.score).toBeGreaterThanOrEqual(1);
      expect(evalRes.body.score).toBeLessThanOrEqual(10);
      expect(evalRes.body).toHaveProperty('explanation');
      expect(Array.isArray(evalRes.body.strengths)).toBe(true);
      expect(Array.isArray(evalRes.body.missingPoints)).toBe(true);
      expect(evalRes.body).toHaveProperty('improvedAnswer');
    });
  });

  // 5. PROJECT IDEA ANALYZER PERFORMANCE, CACHING & DEDUPLICATION
  describe('Project Idea Analyzer Performance & Caching', () => {
    const testIdeaPayload = {
      idea: 'An autonomous micro-drone swarm coordinator for disaster search and rescue operations',
      domain: 'IoT',
      targetUsers: 'First responders and search-and-rescue teams',
      preferredTech: 'Rust, ROS2, MQTT, C++',
      objective: 'Capstone & Portfolio',
      experienceLevel: 'Advanced'
    };

    it('should reject empty project idea string with 400', async () => {
      const res = await request(app)
        .post('/api/analyze-idea')
        .send({ idea: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/please enter a project idea/i);
    });

    it('should generate a comprehensive engineering blueprint with all required sections', async () => {
      const res = await request(app)
        .post('/api/analyze-idea')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testIdeaPayload);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('problemStatement');
      expect(res.body).toHaveProperty('proposedSolution');
      expect(res.body).toHaveProperty('feasibility');
      expect(res.body).toHaveProperty('feasibilityRationale');
      expect(res.body).toHaveProperty('recommendedTechnologies');
      expect(Array.isArray(res.body.recommendedTechnologies)).toBe(true);
      expect(res.body).toHaveProperty('suggestedArchitecture');
      expect(res.body).toHaveProperty('roadmap');
      expect(Array.isArray(res.body.roadmap)).toBe(true);
      expect(res.body.roadmap.length).toBeGreaterThanOrEqual(4);
      expect(res.body).toHaveProperty('milestones');
      expect(res.body).toHaveProperty('risksAndMitigations');
      expect(res.body).toHaveProperty('testingStrategy');
      expect(res.body).toHaveProperty('securityAndPrivacy');
      expect(res.body).toHaveProperty('techStack');
      expect(res.body.techStack).toContain('Rust');
    });

    it('should return cached analysis instantly on repeated submission of the same idea', async () => {
      const start = Date.now();
      const res = await request(app)
        .post('/api/analyze-idea')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testIdeaPayload);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body._cached).toBe(true);
      expect(duration).toBeLessThan(100); // Cached lookup executes in <100ms!
    });

    it('should deduplicate concurrent in-flight requests for the same idea', async () => {
      const freshIdea = {
        ...testIdeaPayload,
        idea: `Satellite imagery change detection pipeline ${Date.now()}`
      };

      // Launch 2 parallel requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app).post('/api/analyze-idea').send(freshIdea),
        request(app).post('/api/analyze-idea').send(freshIdea)
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.title).toEqual(res2.body.title);
      expect(res1.body.proposedSolution).toEqual(res2.body.proposedSolution);
    });
  });
});
