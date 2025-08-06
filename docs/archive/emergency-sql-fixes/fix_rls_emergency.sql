-- Emergency RLS Fix: Apply directly to fix stack depth issue
-- Drop ALL existing RLS policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

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

-- Risk management tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'project_risks') THEN
        EXECUTE 'CREATE POLICY project_risks_policy ON project_risks FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM projects WHERE projects.id = project_risks.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true)))';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mitigation_actions') THEN
        EXECUTE 'CREATE POLICY mitigation_actions_policy ON mitigation_actions FOR ALL USING (user_id = auth.uid())';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_history_entries') THEN
        EXECUTE 'CREATE POLICY risk_history_policy ON risk_history_entries FOR ALL USING (user_id = auth.uid())';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'automatic_indicators') THEN
        EXECUTE 'CREATE POLICY automatic_indicators_policy ON automatic_indicators FOR ALL USING (user_id = auth.uid())';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_updates') THEN
        EXECUTE 'CREATE POLICY risk_updates_policy ON risk_updates FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM risks WHERE risks.id = risk_updates.risk_id AND risks.user_id = auth.uid()))';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'risk_notifications') THEN
        EXECUTE 'CREATE POLICY risk_notifications_policy ON risk_notifications FOR ALL USING (user_id = auth.uid())';
    END IF;
END $$;

-- Log completion
SELECT 'Emergency RLS fix completed - all recursive policies removed and replaced with simple ones' as result;
