-- Migration: 20250110_consolidated_risk_policy_fix.sql
-- Merged from all 20250110 files to resolve timestamp conflict.
-- This migration fixes risk management policies for sharing and deletion, and cleans up test data.

-- Step 1: Drop all potentially conflicting RLS policies on the risks table
DROP POLICY IF EXISTS "risks_select_own" ON risks;
DROP POLICY IF EXISTS "risks_insert_own" ON risks; 
DROP POLICY IF EXISTS "risks_update_own" ON risks;
DROP POLICY IF EXISTS "risks_delete_own" ON risks;
DROP POLICY IF EXISTS "Users can view risks of accessible projects" ON risks;
DROP POLICY IF EXISTS "Users can insert risks to own projects" ON risks;
DROP POLICY IF EXISTS "Users can update own risks" ON risks;
DROP POLICY IF EXISTS "Users can delete own risks" ON risks;
DROP POLICY IF EXISTS "risks_select_access" ON risks;
DROP POLICY IF EXISTS "risks_insert_access" ON risks;
DROP POLICY IF EXISTS "risks_update_access" ON risks;
DROP POLICY IF EXISTS "risks_delete_access" ON risks;

-- Step 2: Create new, comprehensive RLS policies for the risks table

-- Users can view risks in projects they own, have been shared with, or are public
CREATE POLICY "risks_select_access" ON risks FOR SELECT 
USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()) OR
    project_id IN (SELECT project_id FROM project_shares WHERE shared_with_email = auth.email() AND status = 'accepted') OR
    project_id IN (SELECT id FROM projects WHERE is_public = true)
);

-- Users can insert risks in projects they own or have write access to
CREATE POLICY "risks_insert_access" ON risks FOR INSERT 
WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()) OR
    project_id IN (SELECT project_id FROM project_shares WHERE shared_with_email = auth.email() AND status = 'accepted' AND permission IN ('edit', 'admin', 'write'))
);

-- Users can update risks in projects they own or have write access to
CREATE POLICY "risks_update_access" ON risks FOR UPDATE 
USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()) OR
    project_id IN (SELECT project_id FROM project_shares WHERE shared_with_email = auth.email() AND status = 'accepted' AND permission IN ('edit', 'admin', 'write'))
);

-- Users can delete risks in projects they own or have admin access to
CREATE POLICY "risks_delete_access" ON risks FOR DELETE 
USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()) OR
    project_id IN (SELECT project_id FROM project_shares WHERE shared_with_email = auth.email() AND status = 'accepted' AND permission = 'admin')
);

-- Step 3: Clean up data
-- Clean up orphaned risks (risks in projects that don't exist)
DELETE FROM risks 
WHERE project_id NOT IN (SELECT id FROM projects);

-- Clean up dummy/test risks with common test patterns
DELETE FROM risks 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%dummy%' 
   OR title ILIKE '%example%'
   OR title ILIKE '%sample%'
   OR title ILIKE '%demo%'
   OR title = 'Test Risk'
   OR title = 'Sample Risk'
   OR title = 'Demo Risk'
   OR title = 'Dummy Risk'
   OR description ILIKE '%lorem ipsum%'
   OR description ILIKE '%placeholder%'
   OR description ILIKE '%this is a test%'
   OR description = 'Test description'
   OR description = 'Sample description';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== CONSOLIDATED RISK POLICIES APPLIED ===';
END $$;
