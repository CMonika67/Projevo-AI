-- ==============================================================================
-- Projevo AI — Production PostgreSQL Schema & Supabase Auth Migration
-- ==============================================================================
-- Target: Supabase PostgreSQL (Public Schema)
-- Security & Data Isolation Architecture:
--   1. 100% User Isolation via auth.users(id) & RLS policies on all 8 tables
--   2. Strict Composite Foreign Key enforcing Same-User Ownership for Diagnostics:
--      (user_id, project_id) REFERENCES public.user_projects(user_id, id)
--   3. Authenticated Email Immutability Guard:
--      Allows legitimate email updates originating from Supabase Auth (auth.users),
--      while raising an exception if direct unauthorized profile email modifications occur.
--   4. Dual Lifecycle Table Categorization:
--      - Interactive State Tables (milestones, pools, skills, projects): Full CRUD/Upsert
--      - Evaluation & Diagnostic Logs (diagnostics, practice records, ideas):
--        Append-only for updates (UPDATE prohibited to preserve scoring/audit fidelity),
--        while user-initiated DELETE is permitted for privacy / GDPR compliance.
--   5. Folder-Isolated Storage RLS for Avatars Bucket:
--      Enforces path pattern avatars/<user_id>/<file>
--   6. Re-runnable & Migration Drift Safe:
--      Guarantees constraint dependency ordering (user_projects composite key before
--      diagnostics foreign key) and scopes constraint checks via conrelid.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PUBLIC PROFILES TABLE (Linked 1-to-1 with Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'Engineering Student',
    membership VARCHAR(100) DEFAULT 'Projevo AI Member',
    avatar TEXT,
    college VARCHAR(255),
    university VARCHAR(255),
    course VARCHAR(255),
    year_of_study VARCHAR(50),
    graduation_year VARCHAR(50),
    github VARCHAR(255),
    selected_interests TEXT[] DEFAULT '{}',
    interested_roles TEXT[] DEFAULT '{}',
    learning_preferences TEXT,
    onboarding_goals TEXT,
    primary_milestone TEXT,
    custom_skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. USER SKILLS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0 AND level <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'have' CHECK (status IN ('have', 'learning')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. USER PROJECTS (Active Workspace & Project Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_key VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    tagline TEXT,
    status VARCHAR(50) DEFAULT 'In Progress',
    match_score INTEGER DEFAULT 0,
    health_score INTEGER DEFAULT 100,
    readiness_score INTEGER DEFAULT 0,
    stage VARCHAR(100) DEFAULT 'Planning & Initial Scaffolding',
    stage_progress INTEGER DEFAULT 0,
    tech_stack TEXT[] DEFAULT '{}',
    issues_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. PROJECT DIAGNOSTICS (Linked to user_projects via composite foreign key)
-- ==============================================================================
-- Note: Foreign key constraint is applied in Section 10 after verifying the
-- unique constraint on (user_id, id) of public.user_projects to ensure safe ordering.
CREATE TABLE IF NOT EXISTS public.project_diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    overall_health INTEGER NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    critical_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    files_scanned JSONB,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. LEARNING MILESTONES (Interactive Project & Role Milestones)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.learning_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_key VARCHAR(100) NOT NULL,
    milestone_key VARCHAR(255) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT true,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. INTERVIEW QUESTION POOLS (Generated Interview Question Cache)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.interview_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pool_key VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. INTERVIEW PRACTICE RECORDS (Append-Only Evaluation Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.interview_practice_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    category VARCHAR(100),
    difficulty VARCHAR(20),
    user_answer TEXT NOT NULL,
    score NUMERIC(4,2) NOT NULL CHECK (score >= 0 AND score <= 10),
    verdict VARCHAR(50) NOT NULL,
    rubric_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    strengths TEXT[] DEFAULT '{}',
    missing_points TEXT[] DEFAULT '{}',
    suggestions TEXT[] DEFAULT '{}',
    improved_sample_answer TEXT,
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. ANALYZED IDEAS (Append-Only Feasibility Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.analyzed_ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50),
    problem_statement TEXT NOT NULL,
    proposed_solution TEXT NOT NULL,
    expected_outcome TEXT NOT NULL,
    tech_stack TEXT[] DEFAULT '{}',
    match_score INTEGER,
    feasibility VARCHAR(50),
    report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. RE-RUN SAFETY, SCHEMA-DRIFT REPAIR & SCOPED CONSTRAINTS
-- ==============================================================================
-- Safely repairs pre-existing tables from earlier migration drafts:
-- 1. Backfills profiles.email strictly from auth.users (matches on id). Verifies no
--    unmatched users or duplicates exist before enforcing NOT NULL / UNIQUE.
-- 2. Avoids collision-prone empty string defaults on unique key participants.
-- 3. Validates duplicate keys, orphaned project diagnostics, and check constraints,
--    halting with diagnostic queries rather than performing destructive conversions.
DO $$ 
DECLARE
    v_missing_emails INT := 0;
    v_dup_profile_emails INT := 0;
    v_null_skills INT := 0;
    v_dup_skills INT := 0;
    v_dup_projects INT := 0;
    v_orphaned_diagnostics INT := 0;
    v_null_milestones INT := 0;
    v_dup_milestones INT := 0;
    v_null_pools INT := 0;
    v_dup_pools INT := 0;
    v_invalid_levels INT := 0;
    v_invalid_statuses INT := 0;
    v_invalid_scores INT := 0;
BEGIN
    -- 10.1 Profiles columns drift repair & safe email backfill from auth.users
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Engineering Student';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Engineering Student';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership VARCHAR(100) DEFAULT 'Projevo AI Member';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college VARCHAR(255);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university VARCHAR(255);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS course VARCHAR(255);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year_of_study VARCHAR(50);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS graduation_year VARCHAR(50);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github VARCHAR(255);
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS selected_interests TEXT[] DEFAULT '{}';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interested_roles TEXT[] DEFAULT '{}';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS learning_preferences TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_goals TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_milestone TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_skills TEXT[] DEFAULT '{}';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Backfill email from authentic auth.users source (never invent emails)
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

    -- Verify no profiles are missing email after matching with auth.users
    SELECT COUNT(*) INTO v_missing_emails
    FROM public.profiles
    WHERE email IS NULL OR email = '';

    IF v_missing_emails > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % profile(s) have missing email and no matching record in auth.users. Manual remediation: check for orphaned profiles with: SELECT p.id FROM public.profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE u.id IS NULL;', v_missing_emails;
    END IF;

    -- Verify no duplicate emails exist in profiles before applying UNIQUE constraint
    SELECT COUNT(*) INTO v_dup_profile_emails
    FROM (
        SELECT email FROM public.profiles
        WHERE email IS NOT NULL AND email <> ''
        GROUP BY email HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_profile_emails > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % duplicate email(s) found in public.profiles. Manual remediation: inspect with: SELECT email, COUNT(*) FROM public.profiles GROUP BY email HAVING COUNT(*) > 1; and deduplicate before enforcing UNIQUE constraint.', v_dup_profile_emails;
    END IF;

    -- Safe to enforce NOT NULL and UNIQUE on profiles.email
    ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.profiles'::regclass
          AND (conname = 'uq_profiles_email' OR conname = 'profiles_email_key')
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT uq_profiles_email UNIQUE (email);
    END IF;

    -- 10.2 User skills columns drift repair
    ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS name VARCHAR(100);
    ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'have';
    ALTER TABLE public.user_skills ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    -- Do not use empty string default for unique key column (name); check for unassigned rows
    SELECT COUNT(*) INTO v_null_skills
    FROM public.user_skills
    WHERE name IS NULL OR name = '';

    IF v_null_skills > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % row(s) in public.user_skills have missing skill name. Skill names cannot be guessed without causing unique collisions. Manual remediation: SELECT * FROM public.user_skills WHERE name IS NULL OR name = '''';', v_null_skills;
    END IF;

    ALTER TABLE public.user_skills ALTER COLUMN name SET NOT NULL;

    -- Check for duplicate (user_id, name)
    SELECT COUNT(*) INTO v_dup_skills
    FROM (
        SELECT user_id, name FROM public.user_skills
        GROUP BY user_id, name HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_skills > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % duplicate (user_id, name) pair(s) found in public.user_skills. Manual remediation: inspect with: SELECT user_id, name, COUNT(*) FROM public.user_skills GROUP BY user_id, name HAVING COUNT(*) > 1; and deduplicate before applying uq_user_skill.', v_dup_skills;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_skills'::regclass
          AND conname = 'uq_user_skill'
    ) THEN
        ALTER TABLE public.user_skills ADD CONSTRAINT uq_user_skill UNIQUE (user_id, name);
    END IF;

    -- Scoped CHECK constraints on user_skills
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_skills'::regclass
          AND conname = 'chk_user_skills_level'
    ) THEN
        SELECT COUNT(*) INTO v_invalid_levels
        FROM public.user_skills
        WHERE level < 0 OR level > 100;

        IF v_invalid_levels > 0 THEN
            RAISE EXCEPTION 'Schema drift error: % row(s) in public.user_skills have level outside 0-100 range. Manual remediation: SELECT * FROM public.user_skills WHERE level < 0 OR level > 100;', v_invalid_levels;
        END IF;

        ALTER TABLE public.user_skills ADD CONSTRAINT chk_user_skills_level CHECK (level >= 0 AND level <= 100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_skills'::regclass
          AND conname = 'chk_user_skills_status'
    ) THEN
        SELECT COUNT(*) INTO v_invalid_statuses
        FROM public.user_skills
        WHERE status NOT IN ('have', 'learning');

        IF v_invalid_statuses > 0 THEN
            RAISE EXCEPTION 'Schema drift error: % row(s) in public.user_skills have invalid status (not ''have'' or ''learning''). Manual remediation: SELECT * FROM public.user_skills WHERE status NOT IN (''have'', ''learning'');', v_invalid_statuses;
        END IF;

        ALTER TABLE public.user_skills ADD CONSTRAINT chk_user_skills_status CHECK (status IN ('have', 'learning'));
    END IF;

    -- 10.3 User projects columns drift repair
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS project_key VARCHAR(100);
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS tagline TEXT;
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'In Progress';
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0;
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100;
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS readiness_score INTEGER DEFAULT 0;
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS stage VARCHAR(100) DEFAULT 'Planning & Initial Scaffolding';
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS stage_progress INTEGER DEFAULT 0;
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS issues_count INTEGER DEFAULT 0;
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- Safe collision-free backfill for project_key: uses metadata if present, else row id::text (globally unique)
    UPDATE public.user_projects
    SET project_key = COALESCE(NULLIF(metadata->>'id', ''), NULLIF(metadata->>'projectKey', ''), id::text)
    WHERE project_key IS NULL OR project_key = '';

    UPDATE public.user_projects
    SET title = COALESCE(NULLIF(metadata->>'title', ''), 'Untitled Project')
    WHERE title IS NULL OR title = '';

    ALTER TABLE public.user_projects ALTER COLUMN project_key SET NOT NULL;
    ALTER TABLE public.user_projects ALTER COLUMN title SET NOT NULL;

    -- Check for duplicate (user_id, project_key)
    SELECT COUNT(*) INTO v_dup_projects
    FROM (
        SELECT user_id, project_key FROM public.user_projects
        GROUP BY user_id, project_key HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_projects > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % duplicate (user_id, project_key) pair(s) found in public.user_projects. Manual remediation: inspect with: SELECT user_id, project_key, COUNT(*) FROM public.user_projects GROUP BY user_id, project_key HAVING COUNT(*) > 1; and deduplicate before applying uq_user_project_key.', v_dup_projects;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_projects'::regclass
          AND conname = 'uq_user_project_key'
    ) THEN
        ALTER TABLE public.user_projects ADD CONSTRAINT uq_user_project_key UNIQUE (user_id, project_key);
    END IF;

    -- STEP 1: Ensure composite UNIQUE constraint on user_projects (user_id, id) exists
    -- BEFORE project_diagnostics foreign key references it.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.user_projects'::regclass
          AND conname = 'uq_user_project_id_user'
    ) THEN
        ALTER TABLE public.user_projects ADD CONSTRAINT uq_user_project_id_user UNIQUE (user_id, id);
    END IF;

    -- 10.4 Project diagnostics columns drift repair & orphaned check
    ALTER TABLE public.project_diagnostics ADD COLUMN IF NOT EXISTS overall_health INTEGER;
    ALTER TABLE public.project_diagnostics ADD COLUMN IF NOT EXISTS categories JSONB;
    ALTER TABLE public.project_diagnostics ADD COLUMN IF NOT EXISTS critical_issues JSONB;
    ALTER TABLE public.project_diagnostics ADD COLUMN IF NOT EXISTS files_scanned JSONB;
    ALTER TABLE public.project_diagnostics ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ DEFAULT NOW();

    UPDATE public.project_diagnostics SET overall_health = 100 WHERE overall_health IS NULL;
    UPDATE public.project_diagnostics SET categories = '[]'::jsonb WHERE categories IS NULL;
    UPDATE public.project_diagnostics SET critical_issues = '[]'::jsonb WHERE critical_issues IS NULL;

    ALTER TABLE public.project_diagnostics ALTER COLUMN overall_health SET NOT NULL;
    ALTER TABLE public.project_diagnostics ALTER COLUMN categories SET NOT NULL;
    ALTER TABLE public.project_diagnostics ALTER COLUMN critical_issues SET NOT NULL;

    -- STEP 2: Check for orphaned project diagnostics before adding FK
    SELECT COUNT(*) INTO v_orphaned_diagnostics
    FROM public.project_diagnostics d
    LEFT JOIN public.user_projects p ON d.user_id = p.user_id AND d.project_id = p.id
    WHERE p.id IS NULL;

    IF v_orphaned_diagnostics > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % orphaned row(s) found in public.project_diagnostics where (user_id, project_id) does not exist in public.user_projects. Manual remediation: inspect with: SELECT d.* FROM public.project_diagnostics d LEFT JOIN public.user_projects p ON d.user_id = p.user_id AND d.project_id = p.id WHERE p.id IS NULL; and re-parent or clean up orphaned diagnostics before applying fk_diagnostics_owner_project.', v_orphaned_diagnostics;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.project_diagnostics'::regclass
          AND conname = 'fk_diagnostics_owner_project'
    ) THEN
        ALTER TABLE public.project_diagnostics
            ADD CONSTRAINT fk_diagnostics_owner_project
            FOREIGN KEY (user_id, project_id)
            REFERENCES public.user_projects(user_id, id)
            ON DELETE CASCADE;
    END IF;

    -- 10.5 Learning milestones columns drift repair
    ALTER TABLE public.learning_milestones ADD COLUMN IF NOT EXISTS project_key VARCHAR(100);
    ALTER TABLE public.learning_milestones ADD COLUMN IF NOT EXISTS milestone_key VARCHAR(255);
    ALTER TABLE public.learning_milestones ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE public.learning_milestones ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NOW();

    -- Do not use empty string default for unique key columns (project_key, milestone_key)
    SELECT COUNT(*) INTO v_null_milestones
    FROM public.learning_milestones
    WHERE project_key IS NULL OR milestone_key IS NULL OR project_key = '' OR milestone_key = '';

    IF v_null_milestones > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % row(s) in public.learning_milestones have missing project_key or milestone_key. Cannot deduce milestone identity safely. Manual remediation: SELECT * FROM public.learning_milestones WHERE project_key IS NULL OR milestone_key IS NULL OR project_key = '''' OR milestone_key = '''';', v_null_milestones;
    END IF;

    ALTER TABLE public.learning_milestones ALTER COLUMN project_key SET NOT NULL;
    ALTER TABLE public.learning_milestones ALTER COLUMN milestone_key SET NOT NULL;

    SELECT COUNT(*) INTO v_dup_milestones
    FROM (
        SELECT user_id, project_key, milestone_key FROM public.learning_milestones
        GROUP BY user_id, project_key, milestone_key HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_milestones > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % duplicate (user_id, project_key, milestone_key) tuple(s) in public.learning_milestones. Manual remediation: SELECT user_id, project_key, milestone_key, COUNT(*) FROM public.learning_milestones GROUP BY user_id, project_key, milestone_key HAVING COUNT(*) > 1;', v_dup_milestones;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.learning_milestones'::regclass
          AND conname = 'uq_user_milestone'
    ) THEN
        ALTER TABLE public.learning_milestones ADD CONSTRAINT uq_user_milestone UNIQUE (user_id, project_key, milestone_key);
    END IF;

    -- 10.6 Interview pools columns drift repair
    ALTER TABLE public.interview_pools ADD COLUMN IF NOT EXISTS pool_key VARCHAR(255);
    ALTER TABLE public.interview_pools ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE public.interview_pools ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    -- Do not use empty string default for unique key column (pool_key)
    SELECT COUNT(*) INTO v_null_pools
    FROM public.interview_pools
    WHERE pool_key IS NULL OR pool_key = '';

    IF v_null_pools > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % row(s) in public.interview_pools have missing pool_key. Manual remediation: SELECT * FROM public.interview_pools WHERE pool_key IS NULL OR pool_key = '''';', v_null_pools;
    END IF;

    ALTER TABLE public.interview_pools ALTER COLUMN pool_key SET NOT NULL;

    SELECT COUNT(*) INTO v_dup_pools
    FROM (
        SELECT user_id, pool_key FROM public.interview_pools
        GROUP BY user_id, pool_key HAVING COUNT(*) > 1
    ) dups;

    IF v_dup_pools > 0 THEN
        RAISE EXCEPTION 'Schema drift error: % duplicate (user_id, pool_key) pair(s) in public.interview_pools. Manual remediation: SELECT user_id, pool_key, COUNT(*) FROM public.interview_pools GROUP BY user_id, pool_key HAVING COUNT(*) > 1;', v_dup_pools;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.interview_pools'::regclass
          AND conname = 'uq_user_interview_pool'
    ) THEN
        ALTER TABLE public.interview_pools ADD CONSTRAINT uq_user_interview_pool UNIQUE (user_id, pool_key);
    END IF;

    -- 10.7 Interview practice records columns drift repair
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS question_id VARCHAR(100);
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS question_text TEXT;
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20);
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS user_answer TEXT;
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS score NUMERIC(4,2);
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS verdict VARCHAR(50);
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS rubric_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS strengths TEXT[] DEFAULT '{}';
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS missing_points TEXT[] DEFAULT '{}';
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS suggestions TEXT[] DEFAULT '{}';
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS improved_sample_answer TEXT;
    ALTER TABLE public.interview_practice_records ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ DEFAULT NOW();

    -- Safe non-colliding backfill for practice logs
    UPDATE public.interview_practice_records SET question_id = id::text WHERE question_id IS NULL OR question_id = '';
    UPDATE public.interview_practice_records SET question_text = 'Historical Interview Question' WHERE question_text IS NULL OR question_text = '';
    UPDATE public.interview_practice_records SET user_answer = 'Historical Answer' WHERE user_answer IS NULL OR user_answer = '';
    UPDATE public.interview_practice_records SET score = 0.0 WHERE score IS NULL;
    UPDATE public.interview_practice_records SET verdict = 'Completed' WHERE verdict IS NULL OR verdict = '';

    ALTER TABLE public.interview_practice_records ALTER COLUMN question_id SET NOT NULL;
    ALTER TABLE public.interview_practice_records ALTER COLUMN question_text SET NOT NULL;
    ALTER TABLE public.interview_practice_records ALTER COLUMN user_answer SET NOT NULL;
    ALTER TABLE public.interview_practice_records ALTER COLUMN score SET NOT NULL;
    ALTER TABLE public.interview_practice_records ALTER COLUMN verdict SET NOT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.interview_practice_records'::regclass
          AND conname = 'chk_practice_score'
    ) THEN
        SELECT COUNT(*) INTO v_invalid_scores
        FROM public.interview_practice_records
        WHERE score < 0 OR score > 10;

        IF v_invalid_scores > 0 THEN
            RAISE EXCEPTION 'Schema drift error: % row(s) in public.interview_practice_records have score outside 0-10 range. Manual remediation: SELECT * FROM public.interview_practice_records WHERE score < 0 OR score > 10;', v_invalid_scores;
        END IF;

        ALTER TABLE public.interview_practice_records ADD CONSTRAINT chk_practice_score CHECK (score >= 0 AND score <= 10);
    END IF;

    -- 10.8 Analyzed ideas columns drift repair
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS domain VARCHAR(100);
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS problem_statement TEXT;
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS proposed_solution TEXT;
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS expected_outcome TEXT;
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}';
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS match_score INTEGER;
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS feasibility VARCHAR(50);
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS report_data JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE public.analyzed_ideas ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ DEFAULT NOW();

    UPDATE public.analyzed_ideas SET title = 'Historical Idea' WHERE title IS NULL OR title = '';
    UPDATE public.analyzed_ideas SET domain = 'General' WHERE domain IS NULL OR domain = '';
    UPDATE public.analyzed_ideas SET problem_statement = 'Historical problem statement' WHERE problem_statement IS NULL OR problem_statement = '';
    UPDATE public.analyzed_ideas SET proposed_solution = 'Historical proposed solution' WHERE proposed_solution IS NULL OR proposed_solution = '';
    UPDATE public.analyzed_ideas SET expected_outcome = 'Historical expected outcome' WHERE expected_outcome IS NULL OR expected_outcome = '';

    ALTER TABLE public.analyzed_ideas ALTER COLUMN title SET NOT NULL;
    ALTER TABLE public.analyzed_ideas ALTER COLUMN domain SET NOT NULL;
    ALTER TABLE public.analyzed_ideas ALTER COLUMN problem_statement SET NOT NULL;
    ALTER TABLE public.analyzed_ideas ALTER COLUMN proposed_solution SET NOT NULL;
    ALTER TABLE public.analyzed_ideas ALTER COLUMN expected_outcome SET NOT NULL;
END $$;

-- ==============================================================================
-- 11. INDEXES FOR QUERY OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_active ON public.user_projects(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_diagnostics_user_project ON public.project_diagnostics(user_id, project_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_user_project ON public.learning_milestones(user_id, project_key);
CREATE INDEX IF NOT EXISTS idx_interview_pools_user_key ON public.interview_pools(user_id, pool_key);
CREATE INDEX IF NOT EXISTS idx_interview_practice_user ON public.interview_practice_records(user_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_ideas_user ON public.analyzed_ideas(user_id, analyzed_at DESC);

-- ==============================================================================
-- 12. PROFILE EMAIL IMMUTABILITY GUARD (Authenticated Source of Truth)
-- ==============================================================================
-- Allows legitimate email changes originating from Supabase Auth (auth.users),
-- but blocks direct, unauthorized email modifications on public.profiles.
CREATE OR REPLACE FUNCTION public.check_profile_email_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_auth_email VARCHAR(255);
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        -- Verify that the updated email matches the authenticated user record in auth.users
        SELECT email INTO v_auth_email
        FROM auth.users
        WHERE id = NEW.id;

        IF v_auth_email IS NULL OR NEW.email IS DISTINCT FROM v_auth_email THEN
            RAISE EXCEPTION 'Direct modification of profiles.email is prohibited; email updates must originate from Supabase Auth (auth.users)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_email ON public.profiles;
CREATE TRIGGER trg_protect_profile_email
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_profile_email_immutable();

-- ==============================================================================
-- 13. SUPABASE AUTH TRIGGERS (Automated Provisioning & Email Synchronization)
-- ==============================================================================

-- 13.1 Signup Profile Provisioning Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        membership,
        avatar
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
            'Engineering Student'
        ),
        'Engineering Student',
        'Projevo AI Member',
        COALESCE(
            NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
            NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), ''),
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB9pv-nFwxur8rUnH6ZakJgcjkCNV5OmhDBMXMcdJZHr_uUsblghved72UHuLcjhRWCnnNtfKNZMJAQBYVbNk15QL_0lQTYEZHhdp1VpbSUD6Ur3w6XIf6GYDy0YZsl3q2_0E1v79jDrGTRcv9-t2m_KC5LvmCHLjhtkXegKu8bggsDqsDQ8fXXSuMyk8HblrXa_5vF1zcKE8-aYGkFYBP7i1Tjc9iRhmPNYboeYHywYhH0LO5lXzoJ'
        )
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13.2 Auth Email Synchronization Trigger
-- When a user confirms or updates their email in Supabase Auth,
-- synchronize the verified email to public.profiles.
CREATE OR REPLACE FUNCTION public.handle_user_email_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        UPDATE public.profiles
        SET email = NEW.email,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_email_updated();

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_practice_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyzed_ideas ENABLE ROW LEVEL SECURITY;

-- 14.1 Profiles Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
    CREATE POLICY "profiles_select_own" ON public.profiles
        FOR SELECT USING (auth.uid() = id);

    DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
    CREATE POLICY "profiles_insert_own" ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    CREATE POLICY "profiles_update_own" ON public.profiles
        FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
END $$;

-- 14.2 User Skills Policies (Full CRUD)
DO $$ BEGIN
    DROP POLICY IF EXISTS "skills_select_own" ON public.user_skills;
    CREATE POLICY "skills_select_own" ON public.user_skills
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "skills_insert_own" ON public.user_skills;
    CREATE POLICY "skills_insert_own" ON public.user_skills
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "skills_update_own" ON public.user_skills;
    CREATE POLICY "skills_update_own" ON public.user_skills
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "skills_delete_own" ON public.user_skills;
    CREATE POLICY "skills_delete_own" ON public.user_skills
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- 14.3 User Projects Policies (Full CRUD)
DO $$ BEGIN
    DROP POLICY IF EXISTS "projects_select_own" ON public.user_projects;
    CREATE POLICY "projects_select_own" ON public.user_projects
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "projects_insert_own" ON public.user_projects;
    CREATE POLICY "projects_insert_own" ON public.user_projects
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "projects_update_own" ON public.user_projects;
    CREATE POLICY "projects_update_own" ON public.user_projects
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "projects_delete_own" ON public.user_projects;
    CREATE POLICY "projects_delete_own" ON public.user_projects
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- 14.4 Interactive State Tables with Upsert Support (Full CRUD)
-- Milestones and question pools require UPDATE policies to support PostgreSQL
-- ON CONFLICT DO UPDATE upsert workflows in the application.
DO $$ BEGIN
    -- Milestones
    DROP POLICY IF EXISTS "milestones_select_own" ON public.learning_milestones;
    CREATE POLICY "milestones_select_own" ON public.learning_milestones
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "milestones_insert_own" ON public.learning_milestones;
    CREATE POLICY "milestones_insert_own" ON public.learning_milestones
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "milestones_update_own" ON public.learning_milestones;
    CREATE POLICY "milestones_update_own" ON public.learning_milestones
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "milestones_delete_own" ON public.learning_milestones;
    CREATE POLICY "milestones_delete_own" ON public.learning_milestones
        FOR DELETE USING (auth.uid() = user_id);

    -- Interview Pools
    DROP POLICY IF EXISTS "pools_select_own" ON public.interview_pools;
    CREATE POLICY "pools_select_own" ON public.interview_pools
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "pools_insert_own" ON public.interview_pools;
    CREATE POLICY "pools_insert_own" ON public.interview_pools
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    -- UPDATE policy is required because dbSaveInterviewPool performs ON CONFLICT DO UPDATE
    DROP POLICY IF EXISTS "pools_update_own" ON public.interview_pools;
    CREATE POLICY "pools_update_own" ON public.interview_pools
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "pools_delete_own" ON public.interview_pools;
    CREATE POLICY "pools_delete_own" ON public.interview_pools
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- 14.5 Evaluation & Diagnostic Logs (Append-Only for Updates; User-Deletable for Privacy/GDPR)
-- These tables record evaluation snapshots. In-place UPDATE policies are omitted
-- so that evaluation scores, diagnostics, and rubric feedback cannot be tampered with.
-- However, DELETE policies are explicitly permitted for the authenticated owner
-- (auth.uid() = user_id) to honor privacy standards (GDPR "Right to be Forgotten")
-- and user-initiated history cleanup.
DO $$ BEGIN
    -- Diagnostics
    DROP POLICY IF EXISTS "diagnostics_select_own" ON public.project_diagnostics;
    CREATE POLICY "diagnostics_select_own" ON public.project_diagnostics
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "diagnostics_insert_own" ON public.project_diagnostics;
    CREATE POLICY "diagnostics_insert_own" ON public.project_diagnostics
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "diagnostics_delete_own" ON public.project_diagnostics;
    CREATE POLICY "diagnostics_delete_own" ON public.project_diagnostics
        FOR DELETE USING (auth.uid() = user_id);

    -- Interview Practice Records
    DROP POLICY IF EXISTS "practice_select_own" ON public.interview_practice_records;
    CREATE POLICY "practice_select_own" ON public.interview_practice_records
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "practice_insert_own" ON public.interview_practice_records;
    CREATE POLICY "practice_insert_own" ON public.interview_practice_records
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "practice_delete_own" ON public.interview_practice_records;
    CREATE POLICY "practice_delete_own" ON public.interview_practice_records
        FOR DELETE USING (auth.uid() = user_id);

    -- Analyzed Ideas
    DROP POLICY IF EXISTS "ideas_select_own" ON public.analyzed_ideas;
    CREATE POLICY "ideas_select_own" ON public.analyzed_ideas
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "ideas_insert_own" ON public.analyzed_ideas;
    CREATE POLICY "ideas_insert_own" ON public.analyzed_ideas
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "ideas_delete_own" ON public.analyzed_ideas;
    CREATE POLICY "ideas_delete_own" ON public.analyzed_ideas
        FOR DELETE USING (auth.uid() = user_id);
END $$;

-- ==============================================================================
-- 15. STORAGE BUCKET & POLICIES (Avatars)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
    DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
    CREATE POLICY "avatars_public_select" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "avatars_user_insert" ON storage.objects;
    CREATE POLICY "avatars_user_insert" ON storage.objects
        FOR INSERT
        WITH CHECK (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );

    DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
    CREATE POLICY "avatars_user_update" ON storage.objects
        FOR UPDATE
        USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );

    DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;
    CREATE POLICY "avatars_user_delete" ON storage.objects
        FOR DELETE
        USING (
            bucket_id = 'avatars'
            AND auth.uid()::text = (storage.foldername(name))[1]
        );
END $$;
