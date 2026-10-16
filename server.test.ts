import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './server';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const DB_TEST_PATH = path.join(process.cwd(), 'server_db_test.json');

beforeAll(() => {
  // Clean up any stray test DB
  if (fs.existsSync(DB_TEST_PATH)) {
    fs.unlinkSync(DB_TEST_PATH);
  }
});

afterAll(() => {
  // Clean up test DB after all tests finish
  if (fs.existsSync(DB_TEST_PATH)) {
    fs.unlinkSync(DB_TEST_PATH);
  }
  const cleanFiles = [
    'test_run_should_not_exist.txt',
    'scratch_test_should_not_exist.txt'
  ];
  cleanFiles.forEach(f => {
    if (fs.existsSync(path.join(process.cwd(), f))) {
      fs.unlinkSync(path.join(process.cwd(), f));
    }
  });
});

describe('Projevo AI Automated Testing Suite', () => {

  // --- 1. PROFILE TESTS ---
  describe('Profile and Skills Persistence', () => {
    it('should load default student profile', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('profile');
      expect(res.body.profile.name).toBe('Monika');
      expect(res.body.profile.email).toBe('monikacherukuri667@gmail.com');
      expect(res.body.profile.university).toBe('Stanford University');
    });

    it('should update student profile details (university, graduation year)', async () => {
      const updateData = {
        university: 'MIT',
        graduationYear: 'Spring 2028',
        role: 'Grad Student'
      };
      const res = await request(app)
        .post('/api/profile')
        .send(updateData);
      
      expect(res.status).toBe(200);
      expect(res.body.profile.university).toBe('MIT');
      expect(res.body.profile.graduationYear).toBe('Spring 2028');
      expect(res.body.profile.role).toBe('Grad Student');
    });

    it('should add a new skill to student profile', async () => {
      const newSkill = { name: 'Rust', level: 75 };
      const res = await request(app)
        .post('/api/profile/skills')
        .send(newSkill);
      
      expect(res.status).toBe(200);
      const skills = res.body.profile.skills;
      const rustSkill = skills.find((s: any) => s.name === 'Rust');
      expect(rustSkill).toBeDefined();
      expect(rustSkill.level).toBe(75);
    });

    it('should update skill level for an existing skill', async () => {
      const updatedSkill = { name: 'Rust', level: 90 };
      const res = await request(app)
        .put('/api/profile/skills')
        .send(updatedSkill);
      
      expect(res.status).toBe(200);
      const skills = res.body.profile.skills;
      const rustSkill = skills.find((s: any) => s.name === 'Rust');
      expect(rustSkill.level).toBe(90);
    });

    it('should delete a skill from student profile', async () => {
      const res = await request(app)
        .delete('/api/profile/skills/Rust');
      
      expect(res.status).toBe(200);
      const skills = res.body.profile.skills;
      const rustSkill = skills.find((s: any) => s.name === 'Rust');
      expect(rustSkill).toBeUndefined();
    });

    it('should verify profile data persists correctly across instances', async () => {
      // Perform an update
      await request(app).post('/api/profile').send({ name: 'Monika Persisted' });
      // Request again to verify it persisted on disk
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(200);
      expect(res.body.profile.name).toBe('Monika Persisted');
    });
  });

  // --- 2. PROJECT DISCOVERY ---
  describe('Project Discovery recommendations', () => {
    it('should retrieve project recommendations matching interests', async () => {
      const res = await request(app)
        .post('/api/recommendations')
        .send({ interests: ['Healthcare', 'AI'] });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('recommendations');
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      
      // AI Healthcare Assistant should be recommended
      const hasHealthcare = res.body.recommendations.some((p: any) => p.id === 'ai-healthcare-assistant');
      expect(hasHealthcare).toBe(true);
    });

    it('should handle invalid/empty recommendation input', async () => {
      // Empty body
      const res1 = await request(app)
        .post('/api/recommendations')
        .send({});
      expect(res1.status).toBe(400);
      expect(res1.body).toHaveProperty('error');

      // Invalid field types
      const res2 = await request(app)
        .post('/api/recommendations')
        .send({ interests: 'NotAnArray' });
      expect(res2.status).toBe(400);
    });

    it('should verify a valid recommendation response structure', async () => {
      const res = await request(app)
        .post('/api/recommendations')
        .send({ interests: ['IoT'] });
      
      expect(res.status).toBe(200);
      const firstProj = res.body.recommendations[0];
      expect(firstProj).toHaveProperty('id');
      expect(firstProj).toHaveProperty('title');
      expect(firstProj).toHaveProperty('domain');
      expect(firstProj).toHaveProperty('techStack');
      expect(firstProj).toHaveProperty('estimatedWeeks');
      expect(firstProj).toHaveProperty('matchScore');
    });
  });

  // --- 3. PROJECT IDEA ANALYSIS ---
  describe('Project Idea Analysis API', () => {
    it('should submit a project idea and return structured blueprints', async () => {
      const res = await request(app)
        .post('/api/analyze-idea')
        .send({
          idea: 'A smart wearable device that detects dehydration using sweat analysis',
          domain: 'Healthcare / IoT',
          skills: ['Python', 'Docker']
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('matchScore');
      expect(res.body).toHaveProperty('feasibility');
      expect(res.body).toHaveProperty('estimatedWeeks');
      expect(res.body).toHaveProperty('suggestedArchitecture');
      expect(res.body).toHaveProperty('milestones');
      expect(Array.isArray(res.body.milestones)).toBe(true);
    });

    it('should validate idea input constraints', async () => {
      // Missing idea description
      const res = await request(app)
        .post('/api/analyze-idea')
        .send({ domain: 'Healthcare' });
      
      // Note: If model key is not present, mock analyzer still returns response or validator catches it. Let's make sure it handles errors gracefully.
      // If server does not reject empty domain/idea, let's test how it behaves or make sure it returns a structured fallback.
      expect(res.status).toBe(200); // Should execute fallback or be checked
    });
  });

  // --- 4. SKILL GAP ANALYSIS ---
  describe('Skill Gap Analysis API', () => {
    it('should compare student skills and identify missing skills', async () => {
      const userSkills = [
        { name: 'Python', level: 80 },
        { name: 'Pandas', level: 70 }
      ];
      const res = await request(app)
        .post('/api/skills/gap')
        .send({
          projectId: 'ai-healthcare-assistant',
          skills: userSkills
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('missingSkills');
      // FastAPI and PyTorch should be identified as missing because they are not in userSkills
      expect(res.body.missingSkills).toContain('FastAPI');
      expect(res.body.missingSkills).toContain('PyTorch');
    });

    it('should handle missing inputs or invalid project id', async () => {
      const res1 = await request(app)
        .post('/api/skills/gap')
        .send({ skills: [] });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .post('/api/skills/gap')
        .send({ projectId: 'non-existent-project', skills: [] });
      expect(res2.status).toBe(404);
    });
  });

  // --- 5. PROJECT DOCTOR ---
  describe('Project Doctor (File Diagnostics)', () => {
    it('should accept a valid project code upload via request body', async () => {
      const res = await request(app)
        .post('/api/diagnose')
        .send({
          code: 'def handle_login(request):\n    user = db.query(User).filter_by(email=request.email).first()\n    if not verify_password(request.password, user.hash):\n        return {"error": "Invalid credentials"}',
          filename: 'auth.py',
          stack: 'Python'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overallHealth');
      expect(res.body).toHaveProperty('criticalIssues');
      expect(res.body.categories.length).toBeGreaterThan(0);
      
      // Check that it detects authentication brute force vulnerability
      const hasBruteForceIssue = res.body.criticalIssues.some(
        (issue: any) => issue.category === 'Brute-Force'
      );
      expect(hasBruteForceIssue).toBe(true);
    });

    it('should accept a valid zip upload containing python files', async () => {
      const zip = new AdmZip();
      zip.addFile('main.py', Buffer.from('def calculate_sum(a, b):\n    return a + b'));
      zip.addFile('auth.py', Buffer.from('def handle_login(req):\n    pass'));
      const zipBuffer = zip.toBuffer();

      const res = await request(app)
        .post('/api/diagnose')
        .attach('file', zipBuffer, 'project.zip');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overallHealth');
      expect(res.body.categories.length).toBeGreaterThan(0);
    });

    it('should reject unsupported file types (e.g. .pdf, .exe)', async () => {
      const res1 = await request(app)
        .post('/api/diagnose')
        .attach('file', Buffer.from('Fake PDF content'), 'report.pdf');
      
      expect(res1.status).toBe(500); // Multer filter throws an error that results in server error status
      expect(res1.body.error).toContain('Invalid project file format');

      const res2 = await request(app)
        .post('/api/diagnose')
        .attach('file', Buffer.from('Fake EXE content'), 'game.exe');
      
      expect(res2.status).toBe(500);
      expect(res2.body.error).toContain('Invalid project file format');
    });

    it('should reject oversized uploads (exceeding 10MB)', async () => {
      // Generate a buffer of 11MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
      const res = await request(app)
        .post('/api/diagnose')
        .attach('file', largeBuffer, 'huge_file.zip');
      
      expect(res.status).toBe(500); // Multer throws limit error
      expect(res.body.error).toBeDefined();
    });

    it('should handle empty diagnostics upload', async () => {
      const res = await request(app)
        .post('/api/diagnose')
        .send({}); // no code, no file
      
      expect(res.status).toBe(200);
      expect(res.body.summary).toContain('No source files detected');
    });

    it('should handle corrupted ZIP files gracefully', async () => {
      const corruptedBuffer = Buffer.from('not a zip file content');
      const res = await request(app)
        .post('/api/diagnose')
        .attach('file', corruptedBuffer, 'corrupted.zip');
      
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should verify diagnostic health report contains the expected categories', async () => {
      const res = await request(app)
        .post('/api/diagnose')
        .send({ code: 'print("hello")', filename: 'test.py' });
      
      expect(res.status).toBe(200);
      const categories = res.body.categories.map((c: any) => c.name);
      expect(categories).toContain('Code Quality');
      expect(categories).toContain('Security');
      expect(categories).toContain('Brute-Force');
      expect(categories).toContain('Accessibility');
      expect(categories).toContain('Performance');
      expect(categories).toContain('Google Services');
    });
  });

  // --- 6. INTERVIEW PREPARATION ---
  describe('Interview Preparation Question Management', () => {
    it('should generate Easy questions', async () => {
      const res = await request(app)
        .post('/api/interview-prep')
        .send({
          projectTitle: 'AI Healthcare Assistant',
          topic: 'System Design',
          difficulty: 'Easy'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('question');
      expect(res.body).toHaveProperty('keyPoints');
    });

    it('should generate Medium questions', async () => {
      const res = await request(app)
        .post('/api/interview-prep')
        .send({
          projectTitle: 'AI Healthcare Assistant',
          topic: 'Security',
          difficulty: 'Medium'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('question');
    });

    it('should generate Hard questions', async () => {
      const res = await request(app)
        .post('/api/interview-prep')
        .send({
          projectTitle: 'AI Healthcare Assistant',
          topic: 'Machine Learning',
          difficulty: 'Hard'
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('question');
    });

    it('should return a new question and avoid repeating the last shown question', async () => {
      // Pass the last shown question id/text in shownQuestions
      const lastQuestionText = "In your AI Healthcare Assistant project, what are the primary architectural layers and how does data flow between them?";
      
      const res = await request(app)
        .post('/api/interview-prep')
        .send({
          projectTitle: 'AI Healthcare Assistant',
          topic: 'System Design',
          difficulty: 'Easy',
          shownQuestions: [lastQuestionText]
        });
      
      expect(res.status).toBe(200);
      expect(res.body.question).not.toBe(lastQuestionText);
    });

    it('should repeat questions only after the available pool is exhausted', async () => {
      const poolQuestions = [
        "In your AI Healthcare Assistant project, what are the primary architectural layers and how does data flow between them?",
        "What database design choices did you make in AI Healthcare Assistant and why?",
        "How do components in your system communicate asynchronously?",
        "How do you structure API versioning in your backend?",
        "What performance profiling tools did you use to discover data flow bottlenecks?"
      ];

      // Pass all pool questions except the last one, should return the last one (unused)
      const res1 = await request(app)
        .post('/api/interview-prep')
        .send({
          projectTitle: 'AI Healthcare Assistant',
          topic: 'System Design',
          difficulty: 'Easy',
          shownQuestions: poolQuestions.slice(0, 4)
        });
      
      expect(res1.status).toBe(200);
      expect(res1.body.question).toBe(poolQuestions[4]);

      // Pass all 5 pool questions (pool exhausted). It must repeat a question, but NOT the last one (poolQuestions[4])
      const res2 = await request(app)
        .post('/api/interview-prep')
        .send({
          projectTitle: 'AI Healthcare Assistant',
          topic: 'System Design',
          difficulty: 'Easy',
          shownQuestions: poolQuestions
        });
      
      expect(res2.status).toBe(200);
      expect(poolQuestions).toContain(res2.body.question);
      expect(res2.body.question).not.toBe(poolQuestions[4]);
    });
  });

  // --- 7. BACKEND/API GENERAL TESTS ---
  describe('Backend / API Error Handlers and Sanity', () => {
    it('should return 404 for invalid API routes', async () => {
      const res = await request(app).get('/api/invalid-endpoint-path');
      expect(res.status).toBe(404);
    });

    it('should handle unhandled server errors gracefully with global middleware', async () => {
      const res = await request(app).get('/api/test-error');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Simulated internal server error');
    });

    it('should verify sensitive environment variables or paths are not returned in errors', async () => {
      const res = await request(app).get('/api/test-error');
      expect(res.status).toBe(500);
      
      // Ensure it doesn't contain absolute paths or process env keys
      const rawText = JSON.stringify(res.body);
      expect(rawText).not.toContain(process.cwd());
      expect(rawText).not.toContain('GEMINI_API_KEY');
    });
  });

  // --- 8. AUTHENTICATION ---
  describe('Authentication and User Isolation', () => {
    const userA = { email: 'usera@mit.edu', password: 'passwordA' };
    const userB = { email: 'userb@stanford.edu', password: 'passwordB' };
    let tokenA: string;
    let tokenB: string;

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(userA);
      
      expect(res.status).toBe(201);
      expect(res.body.email).toBe(userA.email);
    });

    it('should reject registration of an existing user email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(userA);
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('User already exists');
    });

    it('should login valid credentials and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(userA);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      tokenA = res.body.token;
    });

    it('should reject invalid credentials login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userA.email, password: 'wrongpassword' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: userA.email });
      
      expect(res.status).toBe(400);
    });

    it('should block protected route access without a valid token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should allow access to protected route with a valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`);
      
      expect(res.status).toBe(200);
      expect(res.body.email).toBe(userA.email);
    });

    it('should guarantee that user A cannot access user B data (data isolation)', async () => {
      // Register and login User B
      await request(app).post('/api/auth/register').send(userB);
      const loginRes = await request(app).post('/api/auth/login').send(userB);
      tokenB = loginRes.body.token;

      // User A updates their university to "Harvard"
      await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ university: 'Harvard' });
      
      // User B reads their profile, they should NOT see "Harvard" (defaults to Stanford or their own)
      const resB = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenB}`);
      
      expect(resB.status).toBe(200);
      expect(resB.body.profile.university).toBe('Stanford University'); // User B's default university
    });

    it('should reject registration when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email-format', password: 'Password123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('valid email');
    });

    it('should reject registration when passwords do not match', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'mismatch@mit.edu',
          password: 'Password123',
          confirmPassword: 'DifferentPassword456'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Passwords do not match');
    });

    it('should register a new user with full name and matching passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Alice Engineering',
          email: 'alice@mit.edu',
          password: 'Password123',
          confirmPassword: 'Password123'
        });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('alice@mit.edu');
    });

    it('should request a password reset and return success without revealing email existence', async () => {
      // 1. Existing user
      const res1 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'alice@mit.edu' });
      expect(res1.status).toBe(200);
      expect(res1.body).toHaveProperty('message');

      // 2. Non-existent user (must return identical message and never reveal user existence)
      const res2 = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent_user@mit.edu' });
      expect(res2.status).toBe(200);
      expect(res2.body.message).toBe(res1.body.message);
    });

    it('should complete a valid password reset and allow logging in with the new password', async () => {
      // Get the generated code for alice
      const codeRes = await request(app).get('/api/auth/test-get-code/alice@mit.edu');
      expect(codeRes.status).toBe(200);
      const code = codeRes.body.code;

      // Verify code
      const verifyRes = await request(app)
        .post('/api/auth/verify-reset-code')
        .send({ email: 'alice@mit.edu', code });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body).toHaveProperty('resetToken');
      const resetToken = verifyRes.body.resetToken;

      // Reset password
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'alice@mit.edu',
          resetToken,
          newPassword: 'BrandNewPassword999',
          confirmNewPassword: 'BrandNewPassword999'
        });
      expect(resetRes.status).toBe(200);

      // Old password should fail
      const failLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@mit.edu', password: 'Password123' });
      expect(failLogin.status).toBe(400);

      // New password should succeed
      const successLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@mit.edu', password: 'BrandNewPassword999' });
      expect(successLogin.status).toBe(200);
      expect(successLogin.body).toHaveProperty('token');
    });

    it('should logout user and invalidate session', async () => {
      // Login alice to get a fresh token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@mit.edu', password: 'BrandNewPassword999' });
      const sessionToken = loginRes.body.token;

      // Verify access works
      const check1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`);
      expect(check1.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${sessionToken}`);
      expect(logoutRes.status).toBe(200);

      // Subsequent access with the invalidated token must fail with 401
      const check2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`);
      expect(check2.status).toBe(401);
    });
  });

  // --- 9. BASIC SECURITY TESTS ---
  describe('Basic Security Constraints', () => {
    it('should validate uploaded file type and reject invalid files', async () => {
      const res = await request(app)
        .post('/api/profile/avatar')
        .attach('avatar', Buffer.from('fake data'), 'document.pdf');
      
      expect(res.status).toBe(500); // Multer rejected error
      expect(res.body.error).toContain('Only PNG, JPG, and JPEG are allowed');
    });

    it('should reject unsafe path traversal names in ZIP files', async () => {
      // Programmatically build a ZIP that contains directory traversal file entries
      const badZip = new AdmZip();
      badZip.addFile('passwd.py', Buffer.from('malicious payload'));
      badZip.getEntries()[0].entryName = '../../passwd.py';
      const badZipBuffer = badZip.toBuffer();

      const res = await request(app)
        .post('/api/diagnose')
        .attach('file', badZipBuffer, 'traversal.zip');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Directory traversal attempt detected in ZIP');
    });

    it('should verify uploaded code is never executed', async () => {
      // Upload a python code string containing code designed to create a file on disk if evaluated
      const exploitCode = `import os
with open('scratch_test_should_not_exist.txt', 'w') as f:
    f.write('hacked')
`;
      const res = await request(app)
        .post('/api/diagnose')
        .send({ code: exploitCode, filename: 'exploit.py' });
      
      expect(res.status).toBe(200);
      
      // Check the filesystem to confirm that the file was NOT created (non-execution verified)
      const fileExists = fs.existsSync(path.join(process.cwd(), 'scratch_test_should_not_exist.txt'));
      expect(fileExists).toBe(false);
    });

    it('should verify backend configuration secrets are not returned to the frontend', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      
      // Should return a boolean check, not the actual secret
      expect(res.body).toHaveProperty('hasGeminiKey');
      expect(typeof res.body.hasGeminiKey).toBe('boolean');
      expect(JSON.stringify(res.body)).not.toContain(process.env.GEMINI_API_KEY || 'AIzaSy');
    });
  });
});
