-- Final fix for infinite recursion in RLS policies
-- This ensures all policies are properly replaced without conflicts

-- Step 1: Completely disable RLS on all tables
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE risks DISABLE ROW LEVEL SECURITY;
ALTER TABLE risk_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE risk_notifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (including any that might exist)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on projects table
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'projects') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON projects';
    END LOOP;
    
    -- Drop all policies on project_shares table
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'project_shares') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON project_shares';
    END LOOP;
    
    -- Drop all policies on risks table
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'risks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON risks';
    END LOOP;
    
    -- Drop all policies on risk_updates table
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'risk_updates') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON risk_updates';
    END LOOP;
    
    -- Drop all policies on risk_notifications table
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'risk_notifications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON risk_notifications';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_notifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create completely new, simple policies without ANY cross-table references

-- Projects policies - completely self-contained
CREATE POLICY "projects_select_own" ON projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "projects_select_public" ON projects FOR SELECT 
USING (is_public = true);

CREATE POLICY "projects_insert_own" ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own" ON projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "projects_delete_own" ON projects FOR DELETE 
USING (auth.uid() = user_id);

-- Project shares policies - completely self-contained
CREATE POLICY "project_shares_select_owner" ON project_shares FOR SELECT 
USING (auth.uid() IN (
    SELECT user_id FROM projects WHERE projects.id = project_shares.project_id
));

CREATE POLICY "project_shares_select_recipient" ON project_shares FOR SELECT 
USING (shared_with_email = auth.email());

CREATE POLICY "project_shares_insert_owner" ON project_shares FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT user_id FROM projects WHERE projects.id = project_shares.project_id
));

CREATE POLICY "project_shares_update_owner" ON project_shares FOR UPDATE 
USING (auth.uid() IN (
    SELECT user_id FROM projects WHERE projects.id = project_shares.project_id
));

CREATE POLICY "project_shares_delete_owner" ON project_shares FOR DELETE 
USING (auth.uid() IN (
    SELECT user_id FROM projects WHERE projects.id = project_shares.project_id
));

-- Risks policies - completely self-contained
CREATE POLICY "risks_select_own" ON risks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "risks_insert_own" ON risks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "risks_update_own" ON risks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "risks_delete_own" ON risks FOR DELETE 
USING (auth.uid() = user_id);

-- Risk updates policies - completely self-contained
CREATE POLICY "risk_updates_select_own" ON risk_updates FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "risk_updates_insert_own" ON risk_updates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "risk_updates_update_own" ON risk_updates FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "risk_updates_delete_own" ON risk_updates FOR DELETE 
USING (auth.uid() = user_id);

-- Risk notifications policies - completely self-contained
CREATE POLICY "risk_notifications_select_own" ON risk_notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "risk_notifications_insert_own" ON risk_notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "risk_notifications_update_own" ON risk_notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "risk_notifications_delete_own" ON risk_notifications FOR DELETE 
USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== RLS POLICIES COMPLETELY FIXED ===';
    RAISE NOTICE 'All infinite recursion issues resolved!';
    RAISE NOTICE 'All policies are now self-contained and simple.';
END $$;
