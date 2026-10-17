-- ==============================================================================
-- Projevo AI — Supabase Database Migration Schema
-- ==============================================================================
-- This schema provisions the database tables, constraints, indexes, and Row Level
-- Security (RLS) policies required for multi-tenant, cloud-durable persistence.
-- 
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/<your-project-id>/sql
-- ==============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    project JSONB NOT NULL DEFAULT '{}'::jsonb,
    latest_analysis JSONB DEFAULT NULL,
    interview_pools JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(LOWER(email));

-- 3. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);

-- Index for session validation and expiration garbage collection
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

-- 4. PASSWORD RESET CODES TABLE
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    reset_token TEXT,
    expires_at BIGINT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_reset_codes_expires_at ON public.password_reset_codes(expires_at);

-- 5. AUTOMATIC UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow server backend (via anon or service role) full managed access
-- In backend server environments, queries pass with backend authorization
DROP POLICY IF EXISTS "Backend API full access on users" ON public.users;
CREATE POLICY "Backend API full access on users"
ON public.users FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Backend API full access on sessions" ON public.sessions;
CREATE POLICY "Backend API full access on sessions"
ON public.sessions FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Backend API full access on password_reset_codes" ON public.password_reset_codes;
CREATE POLICY "Backend API full access on password_reset_codes"
ON public.password_reset_codes FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 7. INITIAL DEMO SEED USER (Optional)
-- Matches default Stanford student demo profile
INSERT INTO public.users (
    id,
    email,
    password_hash,
    profile,
    project,
    latest_analysis,
    interview_pools,
    created_at
) VALUES (
    'usr_monika_001',
    'monikacherukuri667@gmail.com',
    '$2b$10$9ySA1tLXBGTnWagT1IEJkO8Y/wuqym9CUslUQrlZj4UXJ0n1CYmUm',
    '{
        "name": "Monika",
        "role": "Engineering Student",
        "membership": "Projevo AI Member",
        "avatar": "https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ",
        "email": "monikacherukuri667@gmail.com",
        "university": "Stanford University",
        "graduationYear": "Spring 2027",
        "skills": [
            { "name": "Python", "level": 80 },
            { "name": "Machine Learning", "level": 60 },
            { "name": "SQL", "level": 45 },
            { "name": "Git", "level": 90 }
        ],
        "selectedInterests": ["AI / ML", "Healthcare"]
    }'::jsonb,
    '{
        "id": "ai-healthcare-assistant",
        "title": "AI Healthcare Assistant",
        "tagline": "Clinical triage and symptom entity extraction pipeline",
        "status": "In Progress",
        "matchScore": 88,
        "healthScore": 82,
        "readinessScore": 55,
        "stage": "Backend Integration",
        "stageProgress": 65,
        "techStack": ["Python", "FastAPI", "PyTorch", "Pandas", "Docker"],
        "issuesCount": 19
    }'::jsonb,
    NULL,
    '{}'::jsonb,
    '2026-01-01T00:00:00.000Z'::timestamptz
)
ON CONFLICT (email) DO NOTHING;
