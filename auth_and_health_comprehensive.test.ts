import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from './server';
import { setSupabaseForTesting, setSupabaseDisabledForTesting } from './dbAdapter';

describe('Projevo AI — Comprehensive Authentication & Real Project Health Verification', () => {
  const invalidatedTokens = new Set<string>();

  const createMockSupabase = () => ({
    auth: {
      admin: {
        createUser: async ({ email, password, user_metadata }: any) => {
          if (email === 'already_registered@projevo.ai') {
            return { data: null, error: { message: 'User already exists', status: 422 } };
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
        if (email === 'unconfirmed_user@projevo.ai') {
          return { data: null, error: { message: 'Email not confirmed' } };
        }
        if (password === 'WrongPassword!') {
          return { data: null, error: { message: 'Invalid login credentials' } };
        }
        const token = `header.${Buffer.from(JSON.stringify({ sub: 'sb-uuid-' + (email.split('@')[0] || 'login'), email })).toString('base64')}.signature_mock_jwt`;
        return {
          data: {
            user: { id: 'sb-uuid-' + (email.split('@')[0] || 'login'), email },
            session: { access_token: token }
          },
          error: null
        };
      },
      signInWithOtp: async ({ email }: any) => {
        if (email && email.includes('fail_otp')) {
          return { data: null, error: { message: 'Rate limit exceeded: too many OTP requests' } };
        }
        return { data: {}, error: null };
      },
      signUp: async ({ email }: any) => {
        if (email === 'already_registered@projevo.ai') {
          return { data: { user: { id: 'sb-existing-id', email, identities: [] } }, error: null };
        }
        const token = `header.${Buffer.from(JSON.stringify({ sub: 'sb-uuid-' + (email.split('@')[0] || 'login'), email })).toString('base64')}.signature_mock_jwt`;
        return {
          data: {
            user: { id: 'sb-new-' + (email.split('@')[0] || 'id'), email, identities: [{ id: '1' }], confirmed_at: new Date().toISOString() },
            session: { access_token: token }
          },
          error: null
        };
      },
      updateUser: async ({ password }: any) => {
        if (password && password.length >= 8) {
          return { data: { user: { id: 'sb-uuid-login' } }, error: null };
        }
        return { data: null, error: { message: 'Password should be at least 8 characters' } };
      },
      getUser: async (token: string) => {
        if (invalidatedTokens.has(token)) {
          return { data: { user: null }, error: { message: 'Session invalidated / logged out' } };
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
        if (token === '123456' || token_hash === 'valid_token_hash_123') {
          const verifiedEmail = email || 'verified@projevo.ai';
          const jwt = `header.${Buffer.from(JSON.stringify({ sub: 'sb-uuid-login', email: verifiedEmail })).toString('base64')}.signature_mock_jwt`;
          return {
            data: {
              session: { access_token: jwt },
              user: { id: 'sb-uuid-login', email: verifiedEmail }
            },
            error: null
          };
        }
        return { data: null, error: { message: 'Token has expired or is invalid' } };
      },
      resend: async () => ({ error: null }),
      exchangeCodeForSession: async (code: string) => {
        if (code && code !== 'invalid_code') {
          const email = 'magiclink_user@projevo.ai';
          const token = `header.${Buffer.from(JSON.stringify({ sub: 'sb-uuid-magiclink', email })).toString('base64')}.signature_mock_jwt`;
          return { data: { session: { access_token: token } }, error: null };
        }
        return { data: null, error: { message: 'Invalid authorization code or state' } };
      },
      signInWithOAuth: async ({ provider }: any) => ({
        data: { url: `https://ubzlknzzxszlmakzlpki.supabase.co/auth/v1/authorize?provider=${provider}&redirect_to=http://localhost:3000` },
        error: null
      })
    }
  });

  beforeAll(() => {
    setSupabaseForTesting(createMockSupabase() as any);
  });

  // =========================================================================
  // 1. AUTHENTICATION REQUIREMENTS
  // =========================================================================
  describe('1. Authentication Flow & Edge Cases', () => {
    const validUser = {
      name: 'Security Test Engineer',
      email: `valid_test_${Date.now()}@projevo.ai`,
      password: 'StrongPassword123!'
    };

    it('should successfully create an account via Supabase Auth bridge', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userId');
      expect(res.body.email).toBe(validUser.email.toLowerCase());
    });

    it('should prevent duplicate registration and report existing account clearly', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Engineer',
          email: 'already_registered@projevo.ai',
          password: 'Password123!'
        });
      expect(res.status).toBe(400);
      expect(res.body.alreadyExists).toBe(true);
      expect(res.body.error).toContain('already exists');
    });

    it('should successfully authenticate with valid email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe(validUser.email.toLowerCase());
    });

    it('should reject invalid password with genuine error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword!'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid login credentials');
    });

    it('should distinguish unconfirmed email and return explicit unconfirmed error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unconfirmed_user@projevo.ai',
          password: 'SomePassword123!'
        });
      expect(res.status).toBe(400);
      expect(res.body.needsEmailConfirmation).toBe(true);
      expect(res.body.error).toContain('Email not confirmed');
    });

    it('should generate Google OAuth redirect URL explicitly when user chooses Google', async () => {
      const res = await request(app).get('/api/auth/google/url');
      expect(res.status).toBe(200);
      expect(res.body.url).toContain('provider=google');
      expect(res.body.url).toContain('supabase.co/auth/v1/authorize');
    });

    it('should reject invalid Google OAuth callback code with 400', async () => {
      const res = await request(app)
        .post('/api/auth/google/callback')
        .send({ code: 'invalid_code' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid authorization code');
    });

    it('should reject Google OAuth callback when neither code nor token provided', async () => {
      const res = await request(app)
        .post('/api/auth/google/callback')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('authorization code');
    });

    it('should send email OTP login code upon user request', async () => {
      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({ email: 'otp_login_user@projevo.ai' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verification code has been sent');
    });

    it('should reject invalid or expired email OTP login code', async () => {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ email: 'otp_login_user@projevo.ai', token: '000000' });
      expect(res.status).toBe(400);
      expect(res.body.error.toLowerCase()).toContain('invalid');
    });

    it('should verify valid email OTP login code and establish session', async () => {
      const res = await request(app)
        .post('/api/auth/otp/verify')
        .send({ email: 'otp_login_user@projevo.ai', token: '123456' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe('otp_login_user@projevo.ai');
    });

    it('should handle SMTP or provider delivery errors gracefully without false success', async () => {
      const res = await request(app)
        .post('/api/auth/otp/send')
        .send({ email: 'fail_otp@projevo.ai' });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should support email magic link sign-in callback exchange via /api/auth/callback', async () => {
      const res = await request(app)
        .post('/api/auth/callback')
        .send({ code: 'magic_link_code_123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('email');
    });

    it('should verify magic link token_hash via /api/auth/verify-token-hash', async () => {
      const res = await request(app)
        .post('/api/auth/verify-token-hash')
        .send({ token_hash: 'valid_token_hash_123', type: 'email' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('email');
    });

    it('should reject invalid magic link token_hash via /api/auth/verify-token-hash', async () => {
      const res = await request(app)
        .post('/api/auth/verify-token-hash')
        .send({ token_hash: 'invalid_hash_000', type: 'email' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid');
    });

    it('should process password reset request for email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: validUser.email });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verification code has been sent');
    });

    it('should verify recovery OTP code for password reset', async () => {
      const res = await request(app)
        .post('/api/auth/verify-reset-code')
        .send({ email: validUser.email, code: '123456' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sessionToken');
    });

    it('should reject invalid recovery OTP code for password reset', async () => {
      const res = await request(app)
        .post('/api/auth/verify-reset-code')
        .send({ email: validUser.email, code: '999999' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('invalid');
    });

    it('should reject password update if new password is too weak', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: validUser.email,
          newPassword: 'short',
          recoveryToken: 'header.payload.signature_mock_jwt'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 8 characters');
    });

    it('should update password with valid recovery session token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: validUser.email,
          newPassword: 'BrandNewSecurePass123!',
          recoveryToken: 'header.payload.signature_mock_jwt'
        });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset successfully');
    });

    it('should support resend verification email', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'unconfirmed_user@projevo.ai' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('resent successfully');
    });

    it('should reject resend request with missing email without false success', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email is required');
    });
  });

  // =========================================================================
  // 2. REAL & FILE-SPECIFIC PROJECT HEALTH REPORT
  // =========================================================================
  describe('2. Project Health Engine — File-Specific Analysis & Scoring Rules', () => {
    it('should analyze a clean Python file (sudoku.py) with genuine high score and honest N/A categories', async () => {
      const sudokuCode = `
def is_valid(board, row, col, num):
    for x in range(9):
        if board[row][x] == num:
            return False
    for x in range(9):
        if board[x][col] == num:
            return False
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[i + start_row][j + start_col] == num:
                return False
    return True

def solve_sudoku(board, row=0, col=0):
    if row == 8 and col == 9:
        return True
    if col == 9:
        row += 1
        col = 0
    if board[row][col] > 0:
        return solve_sudoku(board, row, col + 1)
    for num in range(1, 10):
        if is_valid(board, row, col, num):
            board[row][col] = num
            if solve_sudoku(board, row, col + 1):
                return True
        board[row][col] = 0
    return False
`;
      const res = await request(app)
        .post('/api/diagnose')
        .send({
          filename: 'sudoku.py',
          code: sudokuCode,
          stack: 'Python'
        });

      expect(res.status).toBe(200);
      expect(res.body.healthScore).toBeGreaterThanOrEqual(85);
      expect(res.body.criticalIssues.length).toBe(0);

      // Verify N/A categories with honest reasons
      const bf = res.body.categories.find((c: any) => c.name === 'Brute-Force');
      expect(bf).toBeDefined();
      expect(bf.analysisStatus).toBe('na');
      expect(bf.reason).toContain('No authentication');

      const a11y = res.body.categories.find((c: any) => c.name === 'Accessibility');
      expect(a11y).toBeDefined();
      expect(a11y.analysisStatus).toBe('na');
      expect(a11y.reason).toContain('Standalone script');

      const gs = res.body.categories.find((c: any) => c.name === 'Google Services');
      expect(gs).toBeDefined();
      expect(gs.analysisStatus).toBe('na');
      expect(gs.reason).toContain('does not integrate Google Cloud');

      // Applicable categories must be scored
      const cq = res.body.categories.find((c: any) => c.name === 'Code Quality');
      expect(cq.analysisStatus).toBe('scored');
      expect(cq.score).toBeGreaterThanOrEqual(90);

      const sec = res.body.categories.find((c: any) => c.name === 'Security');
      expect(sec.analysisStatus).toBe('scored');
      expect(sec.score).toBeGreaterThanOrEqual(90);

      // Denominator excludes N/A categories
      expect(res.body.naCategoriesCount).toBe(3);
      expect(res.body.applicableCategoriesCount).toBe(3);
    });

    it('should detect code quality problems like silenced exceptions and wildcard imports', async () => {
      const problematicCode = `
from math import *

def compute_data():
    try:
        val = sqrt(100)
    except:
        pass
    return val
`;
      const res = await request(app)
        .post('/api/diagnose')
        .send({
          filename: 'calculator.py',
          code: problematicCode,
          stack: 'Python'
        });

      expect(res.status).toBe(200);
      const issues = res.body.criticalIssues;
      expect(issues.some((i: any) => i.title.includes('Silenced Exception'))).toBe(true);
      expect(issues.some((i: any) => i.title.includes('Wildcard Import'))).toBe(true);

      const cq = res.body.categories.find((c: any) => c.name === 'Code Quality');
      expect(cq.score).toBeLessThan(90);
    });

    it('should detect demonstrable security issues (eval, hardcoded AWS key) and cap score at 65', async () => {
      const vulnerableCode = `
import os

AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE12"

def execute_user_query(user_expr):
    result = eval(user_expr)
    return result
`;
      const res = await request(app)
        .post('/api/diagnose')
        .send({
          filename: 'vulnerable.py',
          code: vulnerableCode,
          stack: 'Python'
        });

      expect(res.status).toBe(200);
      const issues = res.body.criticalIssues;
      expect(issues.some((i: any) => i.severity === 'Critical' && i.title.includes('eval'))).toBe(true);
      expect(issues.some((i: any) => i.severity === 'High' && i.title.includes('Credential'))).toBe(true);

      // Critical finding caps overall score at 65
      expect(res.body.healthScore).toBeLessThanOrEqual(65);
      expect(res.body.statusText).toContain('Critical Attention Needed');
    });

    it('should handle empty file with insufficient_evidence status and withheld score', async () => {
      const res = await request(app)
        .post('/api/diagnose')
        .send({
          filename: 'empty.py',
          code: '   \n   \n   ',
          stack: 'Python'
        });

      expect(res.status).toBe(200);
      expect(res.body.healthScore).toBeNull();
      expect(res.body.statusText).toContain('Insufficient Evidence — Empty File');
      expect(res.body.categories.every((c: any) => c.analysisStatus === 'insufficient_evidence')).toBe(true);
    });

    it('should handle unsupported file types with not_analyzed status', async () => {
      const res = await request(app)
        .post('/api/diagnose')
        .send({
          filename: 'archive.tar',
          code: 'binary data here',
          stack: 'Unknown'
        });

      expect(res.status).toBe(200);
      expect(res.body.healthScore).toBeNull();
      expect(res.body.statusText).toContain('Unsupported File Format');
      expect(res.body.categories.every((c: any) => c.analysisStatus === 'not_analyzed')).toBe(true);
    });

    it('should ensure analyzing a different file does not reuse stale cached results', async () => {
      const fileA = await request(app)
        .post('/api/diagnose')
        .send({
          filename: 'file_a.py',
          code: 'def add(a, b):\n    return a + b',
          stack: 'Python'
        });

      const fileB = await request(app)
        .post('/api/diagnose')
        .send({
          filename: 'file_b.py',
          code: 'import os\ndef run_danger(cmd):\n    eval(cmd)',
          stack: 'Python'
        });

      expect(fileA.body.criticalIssues.length).toBe(0);
      expect(fileB.body.criticalIssues.length).toBeGreaterThan(0);
      expect(fileA.body.healthScore).not.toBe(fileB.body.healthScore);
      expect(fileA.body.summary).toContain('file_a.py');
      expect(fileB.body.summary).toContain('file_b.py');
    });
  });
});
