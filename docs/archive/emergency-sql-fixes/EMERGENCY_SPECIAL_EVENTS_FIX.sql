-- =========================================
-- EMERGENCY SPECIAL EVENTS FIX
-- =========================================
-- This script temporarily disables RLS to allow testing of Special Events functionality
-- Once working, we can re-enable RLS with proper policies

BEGIN;

-- =========================================
-- 1. DROP ALL BROKEN POLICIES
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
DROP POLICY IF EXISTS "select_special_event_forecasts" ON special_event_forecasts;
DROP POLICY IF EXISTS "insert_special_event_forecasts" ON special_event_forecasts;
DROP POLICY IF EXISTS "update_special_event_forecasts" ON special_event_forecasts;
DROP POLICY IF EXISTS "delete_special_event_forecasts" ON special_event_forecasts;

-- Drop all policies on special_event_actuals
DROP POLICY IF EXISTS "Users can delete special event actuals for owned projects" ON special_event_actuals;
DROP POLICY IF EXISTS "Users can insert special event actuals for owned projects" ON special_event_actuals;
DROP POLICY IF EXISTS "Users can update special event actuals for owned projects" ON special_event_actuals;
DROP POLICY IF EXISTS "Users can view special event actuals for accessible projects" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_delete_policy" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_insert_policy" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_select_policy" ON special_event_actuals;
DROP POLICY IF EXISTS "special_event_actuals_update_policy" ON special_event_actuals;
DROP POLICY IF EXISTS "select_special_event_actuals" ON special_event_actuals;
DROP POLICY IF EXISTS "insert_special_event_actuals" ON special_event_actuals;
DROP POLICY IF EXISTS "update_special_event_actuals" ON special_event_actuals;
DROP POLICY IF EXISTS "delete_special_event_actuals" ON special_event_actuals;

-- =========================================
-- 2. DISABLE RLS TEMPORARILY
-- =========================================

ALTER TABLE special_event_forecasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_actuals DISABLE ROW LEVEL SECURITY;

-- =========================================
-- 3. VERIFICATION
-- =========================================

-- Check that RLS is disabled
DO $$
DECLARE
    forecast_rls_enabled BOOLEAN;
    actuals_rls_enabled BOOLEAN;
    forecast_policy_count INTEGER;
    actuals_policy_count INTEGER;
BEGIN
    -- Check RLS status
    SELECT relrowsecurity INTO forecast_rls_enabled 
    FROM pg_class 
    WHERE relname = 'special_event_forecasts';
    
    SELECT relrowsecurity INTO actuals_rls_enabled 
    FROM pg_class 
    WHERE relname = 'special_event_actuals';
    
    -- Check policy count
    SELECT COUNT(*) INTO forecast_policy_count 
    FROM pg_policies 
    WHERE tablename = 'special_event_forecasts';
    
    SELECT COUNT(*) INTO actuals_policy_count 
    FROM pg_policies 
    WHERE tablename = 'special_event_actuals';
    
    RAISE NOTICE 'special_event_forecasts RLS enabled: %', forecast_rls_enabled;
    RAISE NOTICE 'special_event_actuals RLS enabled: %', actuals_rls_enabled;
    RAISE NOTICE 'special_event_forecasts policies: %', forecast_policy_count;
    RAISE NOTICE 'special_event_actuals policies: %', actuals_policy_count;
    
    IF forecast_rls_enabled OR actuals_rls_enabled THEN
        RAISE EXCEPTION 'RLS should be disabled but is still enabled';
    END IF;
    
    IF forecast_policy_count > 0 OR actuals_policy_count > 0 THEN
        RAISE EXCEPTION 'Policies should be removed but % and % remain', forecast_policy_count, actuals_policy_count;
    END IF;
    
    RAISE NOTICE 'SUCCESS: RLS disabled and all policies removed!';
    RAISE NOTICE 'Special Events should now work for testing!';
END $$;

COMMIT;

-- =========================================
-- POST-EXECUTION TEST COMMANDS
-- =========================================
-- Run these manually after executing the script above to test:

-- 1. Test basic access (should work without errors):
-- SELECT COUNT(*) FROM special_event_forecasts;
-- SELECT COUNT(*) FROM special_event_actuals;

-- 2. Test table structure:
-- \d special_event_forecasts
-- \d special_event_actuals
