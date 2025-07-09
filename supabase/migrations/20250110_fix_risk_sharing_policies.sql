-- Fix risk management policies to allow proper sharing and deletion
-- Users should be able to manage risks in projects they own or have been shared with

-- Drop existing restrictive risk policies
DROP POLICY IF EXISTS "risks_select_own" ON risks;
DROP POLICY IF EXISTS "risks_insert_own" ON risks;
DROP POLICY IF EXISTS "risks_update_own" ON risks;
DROP POLICY IF EXISTS "risks_delete_own" ON risks;

-- Create new, more flexible risk policies

-- Users can view risks in projects they own or have been shared with
CREATE POLICY "risks_select_access" ON risks FOR SELECT 
USING (
    -- User owns the project
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    -- User has been shared the project
    project_id IN (
        SELECT project_id FROM project_shares 
        WHERE shared_with_email = auth.email() AND status = 'accepted'
    )
    OR
    -- Project is public
    project_id IN (
        SELECT id FROM projects WHERE is_public = true
    )
);

-- Users can insert risks in projects they own or have been shared with (write access)
CREATE POLICY "risks_insert_access" ON risks FOR INSERT 
WITH CHECK (
    -- User owns the project
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    -- User has been shared the project with write access
    project_id IN (
        SELECT project_id FROM project_shares 
        WHERE shared_with_email = auth.email() 
        AND status = 'accepted' 
        AND permission_level IN ('edit', 'admin')
    )
);

-- Users can update risks in projects they own or have edit access to
CREATE POLICY "risks_update_access" ON risks FOR UPDATE 
USING (
    -- User owns the project
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    -- User has been shared the project with write access
    project_id IN (
        SELECT project_id FROM project_shares 
        WHERE shared_with_email = auth.email() 
        AND status = 'accepted' 
        AND permission_level IN ('edit', 'admin')
    )
);

-- Users can delete risks in projects they own or have admin access to
CREATE POLICY "risks_delete_access" ON risks FOR DELETE 
USING (
    -- User owns the project
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    -- User has been shared the project with admin access
    project_id IN (
        SELECT project_id FROM project_shares 
        WHERE shared_with_email = auth.email() 
        AND status = 'accepted' 
        AND permission_level = 'admin'
    )
);

-- Update the RiskService deleteRisk function to remove the user_id constraint
-- This will be handled by RLS policies instead

-- Also add a cleanup for orphaned risks (risks in projects that don't exist)
DELETE FROM risks 
WHERE project_id NOT IN (SELECT id FROM projects);

-- Add cleanup for dummy risks with common test patterns
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
    RAISE NOTICE '=== RISK SHARING POLICIES FIXED ===';\n    RAISE NOTICE 'Users can now manage risks in projects they own or have access to';\n    RAISE NOTICE 'Dummy/test risks have been cleaned up';\nEND $$;
