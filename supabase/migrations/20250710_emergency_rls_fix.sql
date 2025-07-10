-- Emergency RLS Fix: Remove all recursive policies and create simple ones
-- This migration addresses the "stack depth limit exceeded" error

-- Drop ALL existing RLS policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE actuals_period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mitigation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE automatic_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_notifications ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE, NON-RECURSIVE RLS policies

-- Profiles: Users can only see/edit their own profile
CREATE POLICY profiles_select_own ON profiles
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY profiles_update_own ON profiles
    FOR UPDATE USING (auth.uid() = id);
    
CREATE POLICY profiles_insert_own ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects: Simple user-based access (no joins or subqueries)
CREATE POLICY projects_select ON projects
    FOR SELECT USING (
        user_id = auth.uid() OR 
        is_public = true
    );
    
CREATE POLICY projects_insert ON projects
    FOR INSERT WITH CHECK (user_id = auth.uid());
    
CREATE POLICY projects_update ON projects
    FOR UPDATE USING (user_id = auth.uid());
    
CREATE POLICY projects_delete ON projects
    FOR DELETE USING (user_id = auth.uid());

-- Project shares: Simple policies
CREATE POLICY project_shares_select ON project_shares
    FOR SELECT USING (
        shared_with_id = auth.uid() OR
        owner_id = auth.uid()
    );
    
CREATE POLICY project_shares_insert ON project_shares
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
    );
    
CREATE POLICY project_shares_update ON project_shares
    FOR UPDATE USING (
        owner_id = auth.uid() OR shared_with_id = auth.uid()
    );
    
CREATE POLICY project_shares_delete ON project_shares
    FOR DELETE USING (
        owner_id = auth.uid()
    );

-- Financial models: Simple project-based access
CREATE POLICY financial_models_select ON financial_models
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM projects WHERE projects.id = financial_models.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
    );
    
CREATE POLICY financial_models_insert ON financial_models
    FOR INSERT WITH CHECK (user_id = auth.uid());
    
CREATE POLICY financial_models_update ON financial_models
    FOR UPDATE USING (user_id = auth.uid());
    
CREATE POLICY financial_models_delete ON financial_models
    FOR DELETE USING (user_id = auth.uid());

-- Risks: Simple policies without complex joins
CREATE POLICY risks_select ON risks
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM projects WHERE projects.id = risks.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
    );
    
CREATE POLICY risks_insert ON risks
    FOR INSERT WITH CHECK (user_id = auth.uid());
    
CREATE POLICY risks_update ON risks
    FOR UPDATE USING (user_id = auth.uid());
    
CREATE POLICY risks_delete ON risks
    FOR DELETE USING (user_id = auth.uid());

-- Other tables: Simple user-based policies
CREATE POLICY actual_performance_policy ON actual_performance
    FOR ALL USING (
        EXISTS (SELECT 1 FROM projects WHERE projects.id = actual_performance.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
    );

CREATE POLICY actuals_period_policy ON actuals_period_entries
    FOR ALL USING (
        EXISTS (SELECT 1 FROM projects WHERE projects.id = actuals_period_entries.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
    );

CREATE POLICY scenarios_policy ON scenarios
    FOR ALL USING (
        EXISTS (SELECT 1 FROM financial_models fm JOIN projects p ON fm.project_id = p.id WHERE fm.id = scenarios.model_id AND (p.user_id = auth.uid() OR p.is_public = true))
    );

CREATE POLICY presence_policy ON presence
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM projects WHERE projects.id = presence.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
    );

-- Risk management tables: Simple policies
CREATE POLICY project_risks_policy ON project_risks
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM projects WHERE projects.id = project_risks.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
    );

CREATE POLICY mitigation_actions_policy ON mitigation_actions
    FOR ALL USING (
        user_id = auth.uid()
    );

CREATE POLICY risk_history_policy ON risk_history_entries
    FOR ALL USING (
        user_id = auth.uid()
    );

CREATE POLICY automatic_indicators_policy ON automatic_indicators
    FOR ALL USING (
        user_id = auth.uid()
    );

CREATE POLICY risk_updates_policy ON risk_updates
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM risks WHERE risks.id = risk_updates.risk_id AND risks.user_id = auth.uid())
    );

CREATE POLICY risk_notifications_policy ON risk_notifications
    FOR ALL USING (
        user_id = auth.uid()
    );

-- Log completion
DO $$ 
BEGIN
    RAISE NOTICE 'Emergency RLS fix completed - all recursive policies removed and replaced with simple ones';
END $$;
