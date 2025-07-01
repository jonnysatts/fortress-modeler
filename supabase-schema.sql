-- Fortress Modeler Cloud - Supabase Database Schema
-- This script sets up all required tables, indexes, RLS policies, and functions
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS presence CASCADE;
DROP TABLE IF EXISTS project_shares CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS actuals_period_entries CASCADE;
DROP TABLE IF EXISTS actual_performance CASCADE;
DROP TABLE IF EXISTS financial_models CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ==================================================
-- PROFILES TABLE (User management)
-- ==================================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    company_domain TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- PROJECTS TABLE (Main project entities)
-- ==================================================
CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT NOT NULL,
    target_audience TEXT,
    data JSONB DEFAULT '{}',
    timeline JSONB DEFAULT '{}',
    avatar_image TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    owner_email TEXT,
    share_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================================================
-- FINANCIAL MODELS TABLE (Project financial models)
-- ==================================================
CREATE TABLE financial_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    assumptions JSONB DEFAULT '{}',
    results_cache JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================================================
-- ACTUALS PERIOD ENTRIES TABLE (Actual performance data)
-- ==================================================
CREATE TABLE actuals_period_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    period TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, period)
);

-- ==================================================
-- ACTUAL PERFORMANCE TABLE (Performance tracking)
-- ==================================================
CREATE TABLE actual_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- RISKS TABLE (Risk management)
-- ==================================================
CREATE TABLE risks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    likelihood TEXT NOT NULL,
    impact TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    mitigation TEXT,
    notes TEXT,
    owner_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- SCENARIOS TABLE (Model scenarios)
-- ==================================================
CREATE TABLE scenarios (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    model_id UUID REFERENCES financial_models(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    assumptions JSONB NOT NULL DEFAULT '{}',
    results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- PROJECT SHARES TABLE (Project sharing & collaboration)
-- ==================================================
CREATE TABLE project_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    shared_with_email TEXT NOT NULL,
    shared_with_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    permission TEXT DEFAULT 'read',
    last_accessed TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending'
);

-- ==================================================
-- PRESENCE TABLE (Real-time collaboration)
-- ==================================================
CREATE TABLE presence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    model_id UUID REFERENCES financial_models(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'online',
    current_page TEXT,
    cursor_position JSONB,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================================================
-- INDEXES FOR PERFORMANCE
-- ==================================================

-- Projects indexes
CREATE INDEX projects_user_id_idx ON projects(user_id);
CREATE INDEX projects_created_at_idx ON projects(created_at);
CREATE INDEX projects_deleted_at_idx ON projects(deleted_at);
CREATE INDEX projects_is_public_idx ON projects(is_public);

-- Financial models indexes
CREATE INDEX financial_models_project_id_idx ON financial_models(project_id);
CREATE INDEX financial_models_user_id_idx ON financial_models(user_id);
CREATE INDEX financial_models_deleted_at_idx ON financial_models(deleted_at);

-- Actuals indexes
CREATE INDEX actuals_period_entries_project_id_idx ON actuals_period_entries(project_id);
CREATE INDEX actuals_period_entries_user_id_idx ON actuals_period_entries(user_id);
CREATE INDEX actuals_period_entries_period_idx ON actuals_period_entries(period);

-- Performance indexes
CREATE INDEX actual_performance_project_id_idx ON actual_performance(project_id);
CREATE INDEX actual_performance_date_idx ON actual_performance(date);

-- Sharing indexes
CREATE INDEX project_shares_project_id_idx ON project_shares(project_id);
CREATE INDEX project_shares_shared_with_email_idx ON project_shares(shared_with_email);

-- Presence indexes
CREATE INDEX presence_user_id_idx ON presence(user_id);
CREATE INDEX presence_project_id_idx ON presence(project_id);
CREATE INDEX presence_last_seen_idx ON presence(last_seen);

-- ==================================================
-- UPDATED_AT TRIGGERS
-- ==================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_models_updated_at BEFORE UPDATE ON financial_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_actuals_period_entries_updated_at BEFORE UPDATE ON actuals_period_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_actual_performance_updated_at BEFORE UPDATE ON actual_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE actuals_period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Profiles policies (users can only see/edit their own profile)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies (users can see their own projects + shared projects)
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- Financial models policies (access through project ownership)
CREATE POLICY "Users can view models of accessible projects" ON financial_models FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = financial_models.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
);
CREATE POLICY "Users can insert models to own projects" ON financial_models FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = financial_models.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own models" ON financial_models FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own models" ON financial_models FOR DELETE USING (auth.uid() = user_id);

-- Actuals policies (access through project ownership)
CREATE POLICY "Users can view actuals of accessible projects" ON actuals_period_entries FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = actuals_period_entries.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
);
CREATE POLICY "Users can insert actuals to own projects" ON actuals_period_entries FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = actuals_period_entries.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own actuals" ON actuals_period_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own actuals" ON actuals_period_entries FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can view performance of accessible projects" ON actual_performance FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = actual_performance.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
);
CREATE POLICY "Users can insert performance to own projects" ON actual_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own performance" ON actual_performance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own performance" ON actual_performance FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view risks of accessible projects" ON risks FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = risks.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
);
CREATE POLICY "Users can insert risks to own projects" ON risks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own risks" ON risks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own risks" ON risks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view scenarios of accessible projects" ON scenarios FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scenarios.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
);
CREATE POLICY "Users can insert scenarios to own projects" ON scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenarios" ON scenarios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenarios" ON scenarios FOR DELETE USING (auth.uid() = user_id);

-- Project sharing policies
CREATE POLICY "Users can view shares of own projects" ON project_shares FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create shares for own projects" ON project_shares FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update shares of own projects" ON project_shares FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete shares of own projects" ON project_shares FOR DELETE USING (auth.uid() = owner_id);

-- Presence policies
CREATE POLICY "Users can view all presence" ON presence FOR SELECT USING (true);
CREATE POLICY "Users can insert own presence" ON presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own presence" ON presence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own presence" ON presence FOR DELETE USING (auth.uid() = user_id);

-- ==================================================
-- VIEWS FOR ANALYTICS
-- ==================================================

-- Project summaries view
CREATE VIEW project_summaries AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.product_type,
    p.is_public,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT fm.id) as model_count,
    COUNT(DISTINCT ap.id) as performance_entries_count,
    COUNT(DISTINCT r.id) as risk_count,
    p.share_count
FROM projects p
LEFT JOIN financial_models fm ON p.id = fm.project_id AND fm.deleted_at IS NULL
LEFT JOIN actual_performance ap ON p.id = ap.project_id
LEFT JOIN risks r ON p.id = r.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.description, p.product_type, p.is_public, p.created_at, p.updated_at, p.share_count;

-- Model performance view
CREATE VIEW model_performance AS
SELECT 
    fm.id,
    fm.name,
    fm.project_id,
    fm.assumptions,
    fm.results_cache,
    fm.created_at,
    fm.updated_at,
    COUNT(s.id) as scenario_count
FROM financial_models fm
LEFT JOIN scenarios s ON fm.id = s.model_id
WHERE fm.deleted_at IS NULL
GROUP BY fm.id, fm.name, fm.project_id, fm.assumptions, fm.results_cache, fm.created_at, fm.updated_at;

-- ==================================================
-- UTILITY FUNCTIONS
-- ==================================================

-- Function to handle user migration/setup
CREATE OR REPLACE FUNCTION migrate_user_data(
    user_email TEXT,
    user_name TEXT DEFAULT NULL,
    user_picture TEXT DEFAULT NULL,
    user_company_domain TEXT DEFAULT NULL,
    user_preferences JSONB DEFAULT '{}'
)
RETURNS TEXT AS $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get the current user ID
    user_uuid := auth.uid();
    
    IF user_uuid IS NULL THEN
        RETURN 'Error: User not authenticated';
    END IF;
    
    -- Insert or update user profile
    INSERT INTO profiles (id, email, name, picture, company_domain, preferences)
    VALUES (user_uuid, user_email, user_name, user_picture, user_company_domain, user_preferences)
    ON CONFLICT (id) 
    DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        picture = COALESCE(EXCLUDED.picture, profiles.picture),
        company_domain = COALESCE(EXCLUDED.company_domain, profiles.company_domain),
        preferences = EXCLUDED.preferences,
        updated_at = NOW();
    
    RETURN 'User profile created/updated successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- REALTIME SUBSCRIPTIONS
-- ==================================================

-- Enable realtime for tables that need live updates
ALTER publication supabase_realtime ADD TABLE projects;
ALTER publication supabase_realtime ADD TABLE financial_models;
ALTER publication supabase_realtime ADD TABLE actuals_period_entries;
ALTER publication supabase_realtime ADD TABLE presence;

-- ==================================================
-- INITIAL DATA / SEED (Optional)
-- ==================================================

-- You can add any initial data here if needed
-- INSERT INTO ... 

-- ==================================================
-- COMPLETION MESSAGE
-- ==================================================
DO $$
BEGIN
    RAISE NOTICE 'Fortress Modeler Cloud database schema setup completed successfully!';
    RAISE NOTICE 'Tables created: profiles, projects, financial_models, actuals_period_entries, actual_performance, risks, scenarios, project_shares, presence';
    RAISE NOTICE 'RLS policies enabled for data security';
    RAISE NOTICE 'Indexes created for performance';
    RAISE NOTICE 'Realtime subscriptions enabled for live collaboration';
END $$;