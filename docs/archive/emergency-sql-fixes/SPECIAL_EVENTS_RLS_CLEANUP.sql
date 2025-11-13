-- =========================================
-- SPECIAL EVENTS RLS POLICIES CLEANUP
-- =========================================
-- This script removes duplicate RLS policies and creates clean, single policies
-- for special_event_forecasts and special_event_actuals tables

BEGIN;

-- =========================================
-- 1. DROP ALL EXISTING POLICIES
-- =========================================

-- Drop all policies on special_event_forecasts
DROP POLICY IF EXISTS "Users can delete special event forecasts for owned projects" ON special_event_forecasts;
DROP POLICY IF EXISTS "Users can insert special event forecasts for owned projects" ON special_event_forecasts;
DROP POLICY IF EXISTS "Users can update special event forecasts for owned projects" ON special_event_forecasts;
DROP POLICY IF EXISTS "Users can view special event forecasts for accessible projects" ON special_event_forecasts;
DROP POLICY IF EXISTS "special_event_forecasts_delete_policy" ON special_event_forecasts;
DROP POLICY IF EXISTS "special_event_forecasts_insert_policy" ON special_event_forecasts;
DROP POLICY IF EXISTS "special_event_forecasts_select_policy" ON special_event_forecasts;
DROP POLICY IF EXISTS "special_event_forecasts_update_policy" ON special_event_forecasts;

-- Drop all policies on special_event_actuals
DROP POLICY IF EXISTS "Users can delete special event actuals for owned projects" ON special_event_actuals;
DROP POLICY IF EXISTS "Users can insert special event actuals for owned projects" ON special_event_actuals;
DROP POLICY IF EXISTS "Users can update special event actuals for owned projects" ON special_event_actuals;
DROP POLICY IF EXISTS "Users can view special event actuals for accessible projects" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_delete_policy" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_insert_policy" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_select_policy" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_update_policy" ON special_event_actuals;

-- =========================================
-- 2. CREATE CLEAN RLS POLICIES
-- =========================================

-- **SPECIAL_EVENT_FORECASTS POLICIES**

-- SELECT: Users can view forecasts for projects they own or have shared access to
CREATE POLICY "select_special_event_forecasts" ON special_event_forecasts
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE (
                projects.user_id = auth.uid()
                OR projects.id IN (
                    SELECT project_shares.project_id
                    FROM project_shares
                    WHERE project_shares.shared_with_id = auth.uid()
                )
            )
        )
    );

-- INSERT: Users can create forecasts for projects they own
CREATE POLICY "insert_special_event_forecasts" ON special_event_forecasts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    );

-- UPDATE: Users can update forecasts for projects they own
CREATE POLICY "update_special_event_forecasts" ON special_event_forecasts
    FOR UPDATE
    TO authenticated
    USING (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    );

-- DELETE: Users can delete forecasts for projects they own
CREATE POLICY "delete_special_event_forecasts" ON special_event_forecasts
    FOR DELETE
    TO authenticated
    USING (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    );

-- **SPECIAL_EVENT_ACTUALS POLICIES**

-- SELECT: Users can view actuals for projects they own or have shared access to
CREATE POLICY "select_special_event_actuals" ON special_event_actuals
    FOR SELECT
    TO authenticated
    USING (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE (
                projects.user_id = auth.uid()
                OR projects.id IN (
                    SELECT project_shares.project_id
                    FROM project_shares
                    WHERE project_shares.shared_with_id = auth.uid()
                )
            )
        )
    );

-- INSERT: Users can create actuals for projects they own
CREATE POLICY "insert_special_event_actuals" ON special_event_actuals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    );

-- UPDATE: Users can update actuals for projects they own
CREATE POLICY "update_special_event_actuals" ON special_event_actuals
    FOR UPDATE
    TO authenticated
    USING (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    );

-- DELETE: Users can delete actuals for projects they own
CREATE POLICY "delete_special_event_actuals" ON special_event_actuals
    FOR DELETE
    TO authenticated
    USING (
        project_id IN (
            SELECT projects.id
            FROM projects
            WHERE projects.user_id = auth.uid()
        )
    );

-- =========================================
-- 3. ENABLE RLS (if not already enabled)
-- =========================================

ALTER TABLE special_event_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_actuals ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 4. VERIFICATION QUERIES
-- =========================================

-- Check that we now have exactly 4 policies per table (8 total)
DO $$
DECLARE
    forecast_policy_count INTEGER;
    actuals_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO forecast_policy_count 
    FROM pg_policies 
    WHERE tablename = 'special_event_forecasts';
    
    SELECT COUNT(*) INTO actuals_policy_count 
    FROM pg_policies 
    WHERE tablename = 'special_event_actuals';
    
    RAISE NOTICE 'special_event_forecasts policies: %', forecast_policy_count;
    RAISE NOTICE 'special_event_actuals policies: %', actuals_policy_count;
    RAISE NOTICE 'Total special events policies: %', forecast_policy_count + actuals_policy_count;
    
    IF forecast_policy_count != 4 OR actuals_policy_count != 4 THEN
        RAISE EXCEPTION 'Expected 4 policies per table, got % and %', forecast_policy_count, actuals_policy_count;
    END IF;
    
    RAISE NOTICE 'SUCCESS: RLS policies cleaned up successfully!';
END $$;

COMMIT;

-- =========================================
-- POST-EXECUTION VERIFICATION COMMANDS
-- =========================================
-- Run these manually after executing the script above:

-- 1. Verify policy count:
-- SELECT tablename, COUNT(*) as policy_count 
-- FROM pg_policies 
-- WHERE tablename IN ('special_event_forecasts', 'special_event_actuals') 
-- GROUP BY tablename;

-- 2. List all remaining policies:
-- SELECT tablename, policyname, cmd 
-- FROM pg_policies 
-- WHERE tablename IN ('special_event_forecasts', 'special_event_actuals') 
-- ORDER BY tablename, cmd;

-- 3. Test basic operations (replace PROJECT_ID with actual project ID):
-- SELECT COUNT(*) FROM special_event_forecasts WHERE project_id = 'PROJECT_ID';
-- SELECT COUNT(*) FROM special_event_actuals WHERE project_id = 'PROJECT_ID';
