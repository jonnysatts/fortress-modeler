-- Comprehensive fix for all infinite recursion issues in RLS policies
-- This migration fixes circular dependencies in projects, project_shares, and risk tables

-- Disable RLS temporarily to avoid issues during policy updates
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE risks DISABLE ROW LEVEL SECURITY;
ALTER TABLE risk_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE risk_notifications DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can view public projects" ON projects;
DROP POLICY IF EXISTS "Users can view accessible projects" ON projects;
DROP POLICY IF EXISTS "Users can manage own projects" ON projects;

DROP POLICY IF EXISTS "Users can view own project shares" ON project_shares;
DROP POLICY IF EXISTS "Users can create project shares" ON project_shares;
DROP POLICY IF EXISTS "Users can update own project shares" ON project_shares;
DROP POLICY IF EXISTS "Users can delete own project shares" ON project_shares;
DROP POLICY IF EXISTS "Users can view project shares" ON project_shares;
DROP POLICY IF EXISTS "Users can manage own project shares" ON project_shares;

DROP POLICY IF EXISTS "Users can view risks of accessible projects" ON risks;
DROP POLICY IF EXISTS "Users can insert risks to own projects" ON risks;
DROP POLICY IF EXISTS "Users can update own risks" ON risks;
DROP POLICY IF EXISTS "Users can delete own risks" ON risks;
DROP POLICY IF EXISTS "Users can manage own risks" ON risks;

DROP POLICY IF EXISTS "Users can view updates of accessible risks" ON risk_updates;
DROP POLICY IF EXISTS "Users can insert updates to accessible risks" ON risk_updates;
DROP POLICY IF EXISTS "Users can manage own risk updates" ON risk_updates;

DROP POLICY IF EXISTS "Users can view own notifications" ON risk_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON risk_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON risk_notifications;
DROP POLICY IF EXISTS "Users can manage own risk notifications" ON risk_notifications;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_notifications ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for projects
CREATE POLICY "Users can manage own projects" ON projects FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public projects" ON projects FOR SELECT 
USING (is_public = true);

-- Create simple, non-recursive policies for project_shares
CREATE POLICY "Users can manage project shares for their projects" ON project_shares FOR ALL 
USING (auth.uid() IN (
    SELECT user_id FROM projects WHERE projects.id = project_shares.project_id
));

CREATE POLICY "Users can view shares where they are shared with" ON project_shares FOR SELECT 
USING (shared_with_email = auth.email());

-- Create simple, non-recursive policies for risks
CREATE POLICY "Users can manage own risks" ON risks FOR ALL 
USING (auth.uid() = user_id);

-- Create simple, non-recursive policies for risk_updates
CREATE POLICY "Users can manage own risk updates" ON risk_updates FOR ALL 
USING (auth.uid() = user_id);

-- Create simple, non-recursive policies for risk_notifications
CREATE POLICY "Users can manage own risk notifications" ON risk_notifications FOR ALL 
USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All RLS policies fixed successfully - infinite recursion completely resolved!';
    RAISE NOTICE 'All tables now have simple, non-recursive policies.';
END $$;
