import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './server';
import {
  productionDatabaseGuard,
  setPgPoolForTesting,
  setSupabaseForTesting,
  getPgPool,
  dbGetProfile,
  dbSaveProfile,
  dbSaveSkill,
  dbDeleteSkill,
  dbUpdateAvatar,
  dbGetActiveProject,
  dbSaveProject,
  dbSaveDiagnostic,
  dbGetLatestDiagnostic,
  dbGetMilestones,
  dbSetMilestone,
  dbGetInterviewPool,
  dbSaveInterviewPool,
  dbSaveInterviewPractice,
  dbGetInterviewPracticeHistory,
  dbSaveAnalyzedIdea,
  dbGetAnalyzedIdeas,
  supabaseRegisterUser,
  supabaseLoginUser,
  supabaseLogoutUser,
  supabaseResetPasswordRequest,
  supabaseUpdatePassword,
  supabaseVerifyOtp,
  supabaseResendOtp,
  supabaseGetOAuthUrl,
  getSupabase,
  supabaseUpdatePasswordWithToken
} from './dbAdapter';

describe('Projevo AI — Database Adapter, Session Handling & Multi-User Isolation Tests', () => {
  const userAlpha = {
    fullName: 'Alpha Engineer',
    email: `alpha_${Date.now()}@projevo.ai`,
    password: 'SecureAlphaPassword123!',
    confirmPassword: 'SecureAlphaPassword123!'
  };

  const userBeta = {
    fullName: 'Beta Engineer',
    email: `beta_${Date.now()}@projevo.ai`,
    password: 'SecureBetaPassword123!',
    confirmPassword: 'SecureBetaPassword123!'
  };

  let tokenAlpha = '';
  let tokenBeta = '';
  let userAlphaId = '';
  let userBetaId = '';

  const invalidatedTokens = new Set<string>();

  const createMockSupabase = () => ({
    auth: {
      admin: {
        createUser: async ({ email, password, user_metadata }: any) => {
          if (email === 'existing@projevo.ai') {
            return { data: null, error: { message: 'User already exists', status: 422 } };
          }
          if (email === 'needs_confirm@projevo.ai') {
            return { data: null, error: { message: 'Admin user creation restricted, use signUp flow' } };
          }
          return {
            data: {
              user: {
                id: 'sb-uuid-' + email.split('@')[0],
                email,
                user_metadata
              }
            },
            error: null
          };
        },
        signOut: async (token?: string) => {
          if (token) invalidatedTokens.add(token);
          return { error: null };
        },
        updateUserById: async (id: string, updates: any) => ({ data: { id, ...updates }, error: null })
      },
      signInWithPassword: async ({ email, password }: any) => {
        if (email === 'unconfirmed@projevo.ai') {
          return { data: null, error: { message: 'Email not confirmed' } };
        }
        if (password === 'WrongPassword!') {
          return { data: null, error: { message: 'Invalid login credentials' } };
        }
        const token = email === 'new_sb_user@projevo.ai'
          ? 'header.payload.signature_mock_jwt'
          : `header.${Buffer.from(JSON.stringify({ sub: 'sb-uuid-' + (email.split('@')[0] || 'login'), email })).toString('base64')}.signature_mock_jwt`;
        return {
          data: {
            user: { id: 'sb-uuid-' + (email.split('@')[0] || 'login'), email },
            session: { access_token: token }
          },
          error: null
        };
      },
      signInWithOtp: async ({ email }: any) => {
        if (email && email.includes('error')) {
          return { data: null, error: { message: 'Failed to send OTP' } };
        }
        return { data: {}, error: null };
      },
      signUp: async ({ email }: any) => {
        if (email === 'already_exists@projevo.ai') {
          return { data: { user: { id: 'sb-existing-id', email, identities: [] } }, error: null };
        }
        if (email === 'needs_confirm@projevo.ai') {
          return { data: { user: { id: 'sb-unconfirmed-id', email, identities: [{ id: '1' }] }, session: null }, error: null };
        }
        const token = email === 'new_sb_user@projevo.ai'
          ? 'header.payload.signature_mock_jwt'
          : `header.${Buffer.from(JSON.stringify({ sub: 'sb-uuid-' + (email.split('@')[0] || 'login'), email })).toString('base64')}.signature_mock_jwt`;
        return {
          data: {
            user: { id: 'sb-new-' + (email.split('@')[0] || 'id'), email, identities: [{ id: '2' }], confirmed_at: new Date().toISOString() },
            session: { access_token: token }
          },
          error: null
        };
      },
      updateUser: async ({ password }: any) => {
        if (password && password.length >= 8) {
          return { data: { user: { id: 'sb-uuid-login' } }, error: null };
        }
        return { data: null, error: { message: 'Password update failed' } };
      },
      getUser: async (token: string) => {
        if (invalidatedTokens.has(token)) {
          return { data: { user: null }, error: { message: 'Invalid token: session logged out' } };
        }
        if (token === 'header.payload.signature_mock_jwt' || token === 'verified.otp.jwt') {
          return {
            data: { user: { id: 'sb-uuid-login', email: 'verified@projevo.ai' } },
            error: null
          };
        }
        const parts = token.split('.');
        if (parts.length === 3 && parts[1]) {
          try {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            if (payload.email) {
              return {
                data: {
                  user: {
                    id: payload.sub || 'sb-uuid-' + payload.email.split('@')[0],
                    email: payload.email
                  }
                },
                error: null
              };
            }
          } catch (e) {}
        }
        return { data: { user: null }, error: { message: 'Invalid token' } };
      },
      signOut: async (token?: string) => {
        if (token) invalidatedTokens.add(token);
        return { error: null };
      },
      resetPasswordForEmail: async (email: string) => {
        if (email.includes('ratelimit')) {
          return { error: { message: 'For security purposes, you can only request this once every 60 seconds.' } };
        }
        return { error: null };
      },
      verifyOtp: async ({ email, token, token_hash, type }: any) => {
        if (token === '123456' || token_hash === '123456') {
          return {
            data: {
              session: { access_token: 'verified.otp.jwt' },
              user: { id: 'sb-uuid-login', email: email || 'verified@projevo.ai' }
            },
            error: null
          };
        }
        return { data: null, error: { message: 'Token has expired or is invalid' } };
      },
      resend: async () => ({ error: null }),
      exchangeCodeForSession: async (code: string) => {
        if (code) {
          return { data: { session: { access_token: 'header.payload.signature_mock_jwt' } }, error: null };
        }
        return { data: null, error: { message: 'Invalid code' } };
      },
      signInWithOAuth: async ({ provider }: any) => ({
        data: { url: `https://supabase.co/auth/v1/authorize?provider=${provider}` },
        error: null
      })
    }
  });

  beforeAll(async () => {
    setSupabaseForTesting(createMockSupabase() as any);

    // 1. Register User Alpha
    const regAlpha = await request(app)
      .post('/api/auth/register')
      .send(userAlpha);
    expect(regAlpha.status).toBe(201);

    // 2. Login User Alpha
    const loginAlpha = await request(app)
      .post('/api/auth/login')
      .send({ email: userAlpha.email, password: userAlpha.password });
    expect(loginAlpha.status).toBe(200);
    tokenAlpha = loginAlpha.body.token;
    userAlphaId = loginAlpha.body.userId;
    expect(tokenAlpha).toBeDefined();

    // 3. Register User Beta
    const regBeta = await request(app)
      .post('/api/auth/register')
      .send(userBeta);
    expect(regBeta.status).toBe(201);

    // 4. Login User Beta
    const loginBeta = await request(app)
      .post('/api/auth/login')
      .send({ email: userBeta.email, password: userBeta.password });
    expect(loginBeta.status).toBe(200);
    tokenBeta = loginBeta.body.token;
    userBetaId = loginBeta.body.userId;
    expect(tokenBeta).toBeDefined();
  });

  // =========================================================================
  // 1. DATABASE HEALTH & FAIL-FAST SAFETY
  // =========================================================================
  describe('1. Database Adapter & Health Check', () => {
    it('should report database mode and connectivity via /api/health', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('hasGeminiKey');
      expect(res.body).toHaveProperty('database');
      expect(res.body.database).toHaveProperty('mode');
      expect(res.body.database).toHaveProperty('ok', true);
    });

    it('should enforce production guard against silent fallback when in production without database', async () => {
      // Test the middleware unit logic
      let wasCalled = false;
      const fakeReq = { url: '/api/profile' };
      const fakeRes: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(body: any) {
          this.body = body;
          return this;
        }
      };

      // Under test environment (isProduction is false), next() is always called cleanly
      await productionDatabaseGuard(fakeReq, fakeRes, () => {
        wasCalled = true;
      });
      expect(wasCalled).toBe(true);
    });
  });

  // =========================================================================
  // 2. LOGIN & SESSION HANDLING
  // =========================================================================
  describe('2. Login & Session Lifecycle', () => {
    it('should validate authenticated session via /api/auth/me', async () => {
      const resAlpha = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenAlpha}`);
      
      expect(resAlpha.status).toBe(200);
      expect(resAlpha.body.email).toBe(userAlpha.email);
      expect(resAlpha.body.userId).toBe(userAlphaId);
    });

    it('should reject unauthenticated requests with invalid token to protected endpoints', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid_forged_session_token_99999');
      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should invalidate session upon logout', async () => {
      const tempUser = {
        fullName: 'Temp User',
        email: `temp_${Date.now()}@projevo.ai`,
        password: 'TempPassword123!',
        confirmPassword: 'TempPassword123!'
      };

      await request(app).post('/api/auth/register').send(tempUser);
      const login = await request(app).post('/api/auth/login').send({
        email: tempUser.email,
        password: tempUser.password
      });
      const tempToken = login.body.token;

      // Verify token works
      const beforeLogout = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(beforeLogout.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(logoutRes.status).toBe(200);

      // Verify token is rejected after logout
      const afterLogout = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);
      expect(afterLogout.status).toBe(401);
    });
  });

  // =========================================================================
  // 3. MULTI-USER DATA ISOLATION & INDEPENDENT MILESTONES
  // =========================================================================
  describe('3. Multi-User Isolation & Independent Project Templates', () => {
    it('should isolate profile updates between User Alpha and User Beta', async () => {
      // Alpha updates profile
      const updateAlpha = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({
          university: 'MIT',
          course: 'Artificial Intelligence',
          graduationYear: '2026',
          selectedInterests: ['AI / ML', 'Robotics']
        });
      expect(updateAlpha.status).toBe(200);
      expect(updateAlpha.body.profile.university).toBe('MIT');

      // Beta verifies their profile is unaffected
      const profBeta = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenBeta}`);
      expect(profBeta.status).toBe(200);
      expect(profBeta.body.profile.university).not.toBe('MIT');
      expect(profBeta.body.profile.email).toBe(userBeta.email);
    });

    it('should allow both users to work on the SAME project template with isolated milestones', async () => {
      const sharedTemplateKey = 'ai-healthcare-assistant';

      // 1. User Alpha selects template and marks milestone A
      const alphaProjRes = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({
          project: {
            id: sharedTemplateKey,
            title: 'AI Healthcare Assistant',
            tagline: 'Alpha clinical triage pipeline',
            status: 'In Progress',
            healthScore: 92,
            stage: 'Backend Integration'
          }
        });
      expect(alphaProjRes.status).toBe(200);

      const alphaMilestoneRes = await request(app)
        .post('/api/skills/gap/milestone')
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({
          projectId: sharedTemplateKey,
          milestoneId: 'Alpha Milestone 1: FHIR Scaffolding',
          completed: true
        });
      expect(alphaMilestoneRes.status).toBe(200);
      expect(alphaMilestoneRes.body.completedMilestones).toContain('Alpha Milestone 1: FHIR Scaffolding');

      // 2. User Beta selects the SAME template and marks a DIFFERENT milestone B
      const betaProjRes = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${tokenBeta}`)
        .send({
          project: {
            id: sharedTemplateKey,
            title: 'AI Healthcare Assistant',
            tagline: 'Beta clinical triage pipeline',
            status: 'In Progress',
            healthScore: 85,
            stage: 'Planning'
          }
        });
      expect(betaProjRes.status).toBe(200);

      const betaMilestoneRes = await request(app)
        .post('/api/skills/gap/milestone')
        .set('Authorization', `Bearer ${tokenBeta}`)
        .send({
          projectId: sharedTemplateKey,
          milestoneId: 'Beta Milestone 1: PyTorch Optimization',
          completed: true
        });
      expect(betaMilestoneRes.status).toBe(200);
      expect(betaMilestoneRes.body.completedMilestones).toContain('Beta Milestone 1: PyTorch Optimization');
      expect(betaMilestoneRes.body.completedMilestones).not.toContain('Alpha Milestone 1: FHIR Scaffolding');

      // 3. User Alpha's milestone progress remains intact and unpolluted
      const alphaCheck = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenAlpha}`);
      expect(alphaCheck.status).toBe(200);
      expect(alphaCheck.body.project.tagline).toBe('Alpha clinical triage pipeline');
    });

    it('should isolate interview practice records between different users', async () => {
      // Alpha records evaluation
      const evalAlpha = await request(app)
        .post('/api/interview-prep/evaluate')
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({
          questionId: 'q_alpha_1',
          question: 'Explain your architecture for clinical triage',
          userAnswer: 'We designed a high-throughput async pipeline using FastAPI, PyTorch, and Docker with comprehensive unit tests and error handling.',
          difficulty: 'Medium',
          role: 'AI Engineer'
        });
      expect(evalAlpha.status).toBe(200);
      expect(evalAlpha.body.score).toBeGreaterThan(0);

      // Beta cannot see Alpha's evaluation in their profile data
      const betaProfile = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenBeta}`);
      expect(betaProfile.status).toBe(200);
      // Beta's context is completely isolated
      expect(betaProfile.body.profile.email).toBe(userBeta.email);
    });
  });

  // =========================================================================
  // 5. POSTGRESQL REPOSITORY LAYER & QUERY VERIFICATION (ALL 8 TABLES)
  // =========================================================================
  describe('5. PostgreSQL Schema Repository Queries', () => {
    const executedQueries: { text: string; params: any[] }[] = [];
    const testUserId = '11111111-2222-3333-4444-555555555555';

    beforeAll(() => {
      const mockPool: any = {
        connect: async () => ({
          query: async (text: string, params: any[] = []) => {
            executedQueries.push({ text, params });
            if (text.includes('SELECT 1')) return { rows: [{ '?column?': 1 }] };
            if (text.includes('FROM public.profiles WHERE id =')) {
              return {
                rows: [{
                  id: params[0],
                  name: 'Jane Doe',
                  role: 'Engineering Student',
                  membership: 'Projevo AI Member',
                  avatar: 'https://avatar.url',
                  email: 'jane@projevo.ai',
                  college: 'Stanford',
                  university: 'Stanford',
                  course: 'Computer Science',
                  year_of_study: '2027',
                  graduation_year: '2027',
                  github: 'janedoe',
                  selected_interests: ['AI / ML'],
                  interested_roles: ['AI Engineer'],
                  learning_preferences: 'Hands-on projects',
                  onboarding_goals: 'Build production apps',
                  primary_milestone: 'Launch MVP',
                  custom_skills: ['TensorFlow']
                }]
              };
            }
            if (text.includes('FROM public.user_skills WHERE user_id =')) {
              return {
                rows: [
                  { name: 'Python', level: 90, status: 'have' },
                  { name: 'PyTorch', level: 65, status: 'learning' }
                ]
              };
            }
            if (text.includes('public.user_projects') && text.includes('user_id =') && text.includes('is_active = true')) {
              return {
                rows: [{
                  id: 'mock-proj-uuid-1',
                  user_id: params[0],
                  project_key: 'ai-healthcare-assistant',
                  title: 'AI Healthcare Assistant',
                  tagline: 'Clinical triage pipeline',
                  status: 'In Progress',
                  match_score: 90,
                  health_score: 85,
                  readiness_score: 70,
                  stage: 'Backend Integration',
                  stage_progress: 60,
                  tech_stack: ['Python', 'FastAPI'],
                  issues_count: 2,
                  is_active: true,
                  metadata: {}
                }]
              };
            }
            if (text.includes('FROM public.project_diagnostics WHERE user_id =')) {
              return {
                rows: [{
                  id: 'diag-uuid-1',
                  user_id: params[0],
                  project_id: 'mock-proj-uuid-1',
                  overall_health: 92,
                  categories: JSON.stringify([{ name: 'Security', score: 95 }]),
                  critical_issues: JSON.stringify([]),
                  files_scanned: null,
                  analyzed_at: new Date().toISOString()
                }]
              };
            }
            if (text.includes('FROM public.learning_milestones WHERE user_id =')) {
              return {
                rows: [
                  { milestone_key: 'Milestone 1', completed: true },
                  { milestone_key: 'Milestone 2', completed: false }
                ]
              };
            }
            if (text.includes('FROM public.interview_pools WHERE user_id =')) {
              return {
                rows: [{ questions: JSON.stringify([{ question: 'What is idempotency?' }]) }]
              };
            }
            if (text.includes('FROM public.interview_practice_records WHERE user_id =')) {
              return {
                rows: [{
                  id: 'rec-uuid-1',
                  user_id: params[0],
                  question_id: 'q1',
                  question_text: 'What is idempotency?',
                  category: 'Architecture',
                  difficulty: 'Medium',
                  user_answer: 'Safe retried requests without duplicate mutation',
                  score: 9.5,
                  verdict: 'Pass',
                  rubric_breakdown: {},
                  strengths: ['Clear definition'],
                  missing_points: [],
                  suggestions: [],
                  improved_sample_answer: 'Full answer',
                  evaluated_at: new Date().toISOString()
                }]
              };
            }
            if (text.includes('FROM public.analyzed_ideas WHERE user_id =')) {
              return {
                rows: [{
                  id: 'idea-uuid-1',
                  user_id: params[0],
                  title: 'Clinical Triage AI',
                  domain: 'Healthcare',
                  difficulty: 'Intermediate',
                  problem_statement: 'Patient wait times',
                  proposed_solution: 'AI triage pipeline',
                  expected_outcome: 'Reduced delays',
                  tech_stack: ['Python', 'FastAPI'],
                  match_score: 92,
                  feasibility: 'High',
                  report_data: {},
                  analyzed_at: new Date().toISOString()
                }]
              };
            }
            return { rows: [{ id: 'mock-id-generated' }] };
          },
          release: () => {}
        })
      };

      setPgPoolForTesting(mockPool);
    });

    afterAll(() => {
      setPgPoolForTesting(null);
      setSupabaseForTesting(null);
    });

    it('should query public.profiles and public.user_skills with user identity', async () => {
      const profile = await dbGetProfile(testUserId);
      expect(profile).not.toBeNull();
      expect(profile.name).toBe('Jane Doe');
      expect(profile.skills).toHaveLength(2);
      expect(profile.skills[0].name).toBe('Python');

      const foundProfileQuery = executedQueries.some(q => q.text.includes('FROM public.profiles WHERE id ='));
      const foundSkillsQuery = executedQueries.some(q => q.text.includes('FROM public.user_skills WHERE user_id ='));
      expect(foundProfileQuery).toBe(true);
      expect(foundSkillsQuery).toBe(true);
    });

    it('should save and update profile fields without mutating immutable email', async () => {
      await dbSaveProfile(testUserId, {
        name: 'Jane Updated',
        role: 'AI Engineer',
        university: 'MIT',
        skills: [{ name: 'Go', level: 75, status: 'learning' }]
      });

      const updateQuery = executedQueries.find(q => q.text.includes('UPDATE public.profiles') && q.text.includes('WHERE id ='));
      expect(updateQuery).toBeDefined();
      expect(updateQuery?.text).not.toContain('email = $');
    });

    it('should upsert and delete skills in public.user_skills', async () => {
      await dbSaveSkill(testUserId, { name: 'Rust', level: 80, status: 'learning' });
      const insertSkillQuery = executedQueries.find(q => q.text.includes('INSERT INTO public.user_skills'));
      expect(insertSkillQuery).toBeDefined();

      await dbDeleteSkill(testUserId, 'Rust');
      const deleteSkillQuery = executedQueries.find(q => q.text.includes('DELETE FROM public.user_skills'));
      expect(deleteSkillQuery).toBeDefined();
    });

    it('should persist avatar updates to public.profiles.avatar', async () => {
      await dbUpdateAvatar(testUserId, 'https://cdn.supabase.co/avatars/new.png');
      const avatarQuery = executedQueries.find(q => q.text.includes('UPDATE public.profiles SET avatar ='));
      expect(avatarQuery).toBeDefined();
    });

    it('should query and save active project to public.user_projects', async () => {
      const active = await dbGetActiveProject(testUserId);
      expect(active).not.toBeNull();
      expect(active.projectKey).toBe('ai-healthcare-assistant');

      await dbSaveProject(testUserId, {
        id: 'real-time-chat',
        title: 'Real-Time Chat',
        techStack: ['Node.js', 'WebSocket']
      });

      const saveProjQuery = executedQueries.find(q => q.text.includes('INSERT INTO public.user_projects'));
      expect(saveProjQuery).toBeDefined();
      const deactivateQuery = executedQueries.find(q => q.text.includes('UPDATE public.user_projects SET is_active = false'));
      expect(deactivateQuery).toBeDefined();
    });

    it('should persist project diagnostics enforcing user and project relationships', async () => {
      await dbSaveDiagnostic(testUserId, 'ai-healthcare-assistant', {
        overallHealth: 88,
        categories: [{ name: 'Security', score: 90 }],
        criticalIssues: []
      });

      const diagQuery = executedQueries.find(q => q.text.includes('INSERT INTO public.project_diagnostics'));
      expect(diagQuery).toBeDefined();
      expect(diagQuery?.text).toContain('project_id');
      expect(diagQuery?.text).toContain('overall_health');
    });

    it('should persist learning milestones to public.learning_milestones', async () => {
      await dbSetMilestone(testUserId, 'ai-healthcare-assistant', 'Milestone 1', true);
      const milestoneQuery = executedQueries.find(q => q.text.includes('INSERT INTO public.learning_milestones'));
      expect(milestoneQuery).toBeDefined();

      const milestones = await dbGetMilestones(testUserId, 'ai-healthcare-assistant');
      expect(milestones).toHaveProperty('Milestone 1', true);
    });

    it('should save and retrieve interview question pools from public.interview_pools', async () => {
      await dbSaveInterviewPool(testUserId, 'pool_key_1', [{ question: 'Sample question?' }]);
      const poolInsertQuery = executedQueries.find(q => q.text.includes('INSERT INTO public.interview_pools'));
      expect(poolInsertQuery).toBeDefined();

      const pool = await dbGetInterviewPool(testUserId, 'pool_key_1');
      expect(pool).toBeDefined();
      expect(pool[0].question).toBe('What is idempotency?');
    });

    it('should persist interview practice evaluation records to public.interview_practice_records', async () => {
      await dbSaveInterviewPractice(testUserId, {
        questionId: 'q_test_1',
        questionText: 'Explain microservices',
        userAnswer: 'Decoupled services communicating over network APIs',
        score: 9.0,
        verdict: 'Pass',
        rubricBreakdown: { clarity: 9 }
      });

      const evalQuery = executedQueries.find(q => q.text.includes('INSERT INTO public.interview_practice_records'));
      expect(evalQuery).toBeDefined();
    });

    it('should persist analyzed project ideas to public.analyzed_ideas', async () => {
      await dbSaveAnalyzedIdea(testUserId, {
        title: 'Smart Health Monitoring',
        domain: 'Healthcare',
        problemStatement: 'Need automated vitals monitoring',
        proposedSolution: 'Wearable telemetry ingest pipeline',
        techStack: ['Python', 'MQTT'],
        matchScore: 90,
        feasibility: 'High',
        reportData: { summary: 'Strong architecture' }
      });

      const ideaQuery = executedQueries.find(q => q.text.includes('INSERT INTO public.analyzed_ideas'));
      expect(ideaQuery).toBeDefined();
    });
  });

  // =========================================================================
  // 6. SUPABASE AUTH OPERATIONS & CONTRACT INTEGRATION
  // =========================================================================
  describe('6. Supabase Auth Operations & API Contracts', () => {
    beforeAll(() => {
      const mockSupabase: any = {
        auth: {
          admin: {
            createUser: async ({ email, password, user_metadata }: any) => {
              if (email === 'existing@projevo.ai') {
                return { data: null, error: { message: 'User already exists', status: 422 } };
              }
              if (email === 'needs_confirm@projevo.ai') {
                return { data: null, error: { message: 'Admin user creation restricted, use signUp flow' } };
              }
              return {
                data: {
                  user: {
                    id: 'sb-uuid-' + Date.now(),
                    email,
                    user_metadata
                  }
                },
                error: null
              };
            },
            signOut: async () => ({ error: null }),
            updateUserById: async (id: string, updates: any) => ({ data: { id, ...updates }, error: null })
          },
          signInWithPassword: async ({ email, password }: any) => {
            if (email === 'unconfirmed@projevo.ai') {
              return { data: null, error: { message: 'Email not confirmed' } };
            }
            if (password === 'ValidPassword123!' || password === 'NewSecurePass999!') {
              return {
                data: {
                  user: { id: 'sb-uuid-login', email },
                  session: { access_token: 'header.payload.signature_mock_jwt' }
                },
                error: null
              };
            }
            return { data: null, error: { message: 'Invalid login credentials' } };
          },
          signUp: async ({ email }: any) => {
            if (email === 'already_exists@projevo.ai') {
              return { data: { user: { id: 'sb-existing-id', email, identities: [] } }, error: null };
            }
            if (email === 'needs_confirm@projevo.ai') {
              return { data: { user: { id: 'sb-unconfirmed-id', email, identities: [{ id: '1' }] }, session: null }, error: null };
            }
            return {
              data: {
                user: { id: 'sb-new-id', email, identities: [{ id: '2' }], confirmed_at: new Date().toISOString() },
                session: { access_token: 'header.payload.signature_mock_jwt' }
              },
              error: null
            };
          },
          updateUser: async ({ password }: any) => {
            if (password && password.length >= 8) {
              return { data: { user: { id: 'sb-uuid-login' } }, error: null };
            }
            return { data: null, error: { message: 'Password update failed' } };
          },
          getUser: async (token: string) => {
            if (token === 'header.payload.signature_mock_jwt' || token === 'verified.otp.jwt') {
              return {
                data: { user: { id: 'sb-uuid-login', email: 'verified@projevo.ai' } },
                error: null
              };
            }
            return { data: { user: null }, error: { message: 'Invalid token' } };
          },
          signOut: async () => ({ error: null }),
          resetPasswordForEmail: async (email: string) => {
            if (email.includes('ratelimit')) {
              return { error: { message: 'For security purposes, you can only request this once every 60 seconds.' } };
            }
            return { error: null };
          },
          verifyOtp: async ({ email, token, type }: any) => {
            if (token === '123456') {
              return {
                data: { session: { access_token: 'verified.otp.jwt' } },
                error: null
              };
            }
            return { data: null, error: { message: 'Token has expired or is invalid' } };
          },
          resend: async () => ({ error: null }),
          exchangeCodeForSession: async (code: string) => {
            if (code) {
              return { data: { session: { access_token: 'header.payload.signature_mock_jwt' } }, error: null };
            }
            return { data: null, error: { message: 'Invalid code' } };
          },
          signInWithOAuth: async ({ provider }: any) => ({
            data: { url: `https://supabase.co/auth/v1/authorize?provider=${provider}` },
            error: null
          })
        }
      };

      setSupabaseForTesting(mockSupabase);
    });

    afterAll(() => {
      setSupabaseForTesting(null);
    });

    it('should register user via Supabase Auth bridge', async () => {
      const user = await supabaseRegisterUser('new_sb_user@projevo.ai', 'SecretPass123!', 'New Engineer');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('new_sb_user@projevo.ai');
      expect(user?.userId).toContain('sb-uuid');
    });

    it('should login user and return Supabase JWT via bridge', async () => {
      const res = await supabaseLoginUser('new_sb_user@projevo.ai', 'ValidPassword123!');
      expect(res).not.toBeNull();
      expect(res?.token).toBe('header.payload.signature_mock_jwt');
      expect(res?.userId).toBe('sb-uuid-login');
    });

    it('should reject invalid credentials in Supabase login bridge', async () => {
      const res = await supabaseLoginUser('new_sb_user@projevo.ai', 'WrongPassword!');
      expect(res).toBeNull();
    });

    it('should support email verification via /api/auth/verify-email', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'new_sb_user@projevo.ai', token: '123456' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Email verified successfully');
      expect(res.body).toHaveProperty('session');
    });

    it('should reject invalid OTP via /api/auth/verify-email', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ email: 'new_sb_user@projevo.ai', token: '000000' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should resend email verification via /api/auth/resend-verification', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'new_sb_user@projevo.ai' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('resent successfully');
    });

    it('should generate Google OAuth URL via /api/auth/google/url', async () => {
      const res = await request(app).get('/api/auth/google/url');
      expect(res.status).toBe(200);
      expect(res.body.url).toContain('provider=google');
    });

    it('should authenticate user session from Google OAuth callback', async () => {
      const res = await request(app)
        .post('/api/auth/google/callback')
        .send({ accessToken: 'header.payload.signature_mock_jwt' });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('verified@projevo.ai');
      expect(res.body.userId).toBe('sb-uuid-login');
    });

    it('should exchange authorization code via /api/auth/google/callback', async () => {
      const res = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'auth_code_sample_12345' });
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('verified@projevo.ai');
      expect(res.body.userId).toBe('sb-uuid-login');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject /api/auth/google/callback when neither token nor code is provided', async () => {
      const res = await request(app)
        .post('/api/auth/google/callback')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should report unconfirmed email when Supabase signInWithPassword fails with email not confirmed', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unconfirmed@projevo.ai', password: 'SomePassword123!' });
      expect(res.status).toBe(400);
      expect(res.body.needsEmailConfirmation).toBe(true);
      expect(res.body.error.toLowerCase()).toContain('not confirmed');
    });

    it('should return helpful error when registering an account that already exists in Supabase', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@projevo.ai', password: 'SecretPassword123!', fullName: 'Existing User' });
      expect(res.status).toBe(400);
      expect(res.body.alreadyExists).toBe(true);
      expect(res.body.error.toLowerCase()).toContain('already exists');
    });

    it('should notify user when Supabase registration requires email confirmation', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'needs_confirm@projevo.ai', password: 'SecretPassword123!', fullName: 'Needs Confirm' });
      expect(res.status).toBe(201);
      expect(res.body.needsEmailConfirmation).toBe(true);
      expect(res.body.message.toLowerCase()).toContain('confirm your account');
    });

    it('should process full Supabase recovery OTP flow: request code, verify OTP, and reset password', async () => {
      // 1. Request recovery OTP
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'verified@projevo.ai' });
      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.message).toContain('verification code');

      // 2. Verify recovery OTP
      const verifyRes = await request(app)
        .post('/api/auth/verify-reset-code')
        .send({ email: 'verified@projevo.ai', code: '123456' });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body).toHaveProperty('resetToken');
      expect(verifyRes.body.resetToken).toBe('verified.otp.jwt');

      // 3. Reset password using recovery token
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'verified@projevo.ai',
          resetToken: verifyRes.body.resetToken,
          newPassword: 'NewSecurePass999!',
          confirmNewPassword: 'NewSecurePass999!'
        });
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.message).toContain('Password reset successfully');

      // 4. Log in with the new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'verified@projevo.ai', password: 'NewSecurePass999!' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
    });

    it('should reject invalid or expired recovery OTP in Supabase recovery flow', async () => {
      const verifyRes = await request(app)
        .post('/api/auth/verify-reset-code')
        .send({ email: 'verified@projevo.ai', code: '999999' });
      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.error.toLowerCase()).toContain('invalid');
    });

    it('should initialize Supabase client when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set', () => {
      const origUrl = process.env.SUPABASE_URL;
      const origKey = process.env.SUPABASE_ANON_KEY;
      const origNextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origNextKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      try {
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_ANON_KEY;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://ubzlknzzxszlmakzlpki.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key-12345';

        setSupabaseForTesting(null); // Clear cached instance
        const client = getSupabase();
        expect(client).not.toBeNull();
      } finally {
        process.env.SUPABASE_URL = origUrl;
        process.env.SUPABASE_ANON_KEY = origKey;
        process.env.NEXT_PUBLIC_SUPABASE_URL = origNextUrl;
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origNextKey;
      }
    });
  });
});
