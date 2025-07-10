-- Complete Database Setup: Ensure all tables exist with proper schema and simple RLS
-- This migration will create missing tables and apply non-recursive RLS policies

-- Drop any problematic existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Disable RLS temporarily while we set up
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS risks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS project_shares DISABLE ROW LEVEL SECURITY;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create projects table with proper schema
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    product_type TEXT DEFAULT 'product',
    target_audience TEXT DEFAULT '',
    timeline JSONB DEFAULT '{}',
    resources JSONB DEFAULT '{}',
    goals JSONB DEFAULT '{}',
    assumptions JSONB DEFAULT '{}',
    revenue_model JSONB DEFAULT '{}',
    market_size JSONB DEFAULT '{}',
    competitive_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create financial_models table if it doesn't exist
CREATE TABLE IF NOT EXISTS financial_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    model_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create risks table if it doesn't exist
CREATE TABLE IF NOT EXISTS risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'operational',
    probability INTEGER DEFAULT 3,
    impact INTEGER DEFAULT 3,
    mitigation_strategy TEXT DEFAULT '',
    status TEXT DEFAULT 'identified',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    shared_with_id UUID REFERENCES auth.users(id) NOT NULL,
    permission_level TEXT DEFAULT 'view',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, shared_with_id)
);

-- Create other supporting tables if they don't exist
CREATE TABLE IF NOT EXISTS scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES financial_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scenario_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actual_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    actual_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actuals_period_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    entry_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    activity_data JSONB DEFAULT '{}'
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE actuals_period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive RLS policies

-- Profiles: Users can only access their own profile
CREATE POLICY profiles_policy ON profiles
    FOR ALL USING (auth.uid() = id);

-- Projects: Simple owner-based access
CREATE POLICY projects_policy ON projects
    FOR ALL USING (
        auth.uid() = user_id OR 
        is_public = true
    );

-- Financial models: Simple owner-based access
CREATE POLICY financial_models_policy ON financial_models
    FOR ALL USING (auth.uid() = user_id);

-- Risks: Simple owner-based access  
CREATE POLICY risks_policy ON risks
    FOR ALL USING (auth.uid() = user_id);

-- Project shares: Simple access for owners and shared users
CREATE POLICY project_shares_policy ON project_shares
    FOR ALL USING (
        auth.uid() = owner_id OR 
        auth.uid() = shared_with_id
    );

-- Other tables: Simple policies
CREATE POLICY scenarios_policy ON scenarios
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM financial_models fm 
            WHERE fm.id = scenarios.model_id 
            AND fm.user_id = auth.uid()
        )
    );

CREATE POLICY actual_performance_policy ON actual_performance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = actual_performance.project_id 
            AND (p.user_id = auth.uid() OR p.is_public = true)
        )
    );

CREATE POLICY actuals_period_policy ON actuals_period_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = actuals_period_entries.project_id 
            AND (p.user_id = auth.uid() OR p.is_public = true)
        )
    );

CREATE POLICY presence_policy ON presence
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM projects p 
            WHERE p.id = presence.project_id 
            AND (p.user_id = auth.uid() OR p.is_public = true)
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_project_id ON financial_models(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_user_id ON financial_models(user_id);
CREATE INDEX IF NOT EXISTS idx_risks_project_id ON risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_user_id ON risks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_with_id ON project_shares(shared_with_id);

-- Log completion
SELECT 'Complete database setup completed successfully' as result;
