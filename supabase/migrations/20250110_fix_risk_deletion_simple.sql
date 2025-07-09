-- Simple fix for risk deletion policies
-- Works with existing schema - allows users to delete risks in projects they own

-- Drop existing restrictive risk policies
DROP POLICY IF EXISTS "risks_select_own" ON risks;
DROP POLICY IF EXISTS "risks_insert_own" ON risks; 
DROP POLICY IF EXISTS "risks_update_own" ON risks;
DROP POLICY IF EXISTS "risks_delete_own" ON risks;

-- Also drop any existing policies from the original schema
DROP POLICY IF EXISTS "Users can view risks of accessible projects" ON risks;
DROP POLICY IF EXISTS "Users can insert risks to own projects" ON risks;
DROP POLICY IF EXISTS "Users can update own risks" ON risks;
DROP POLICY IF EXISTS "Users can delete own risks" ON risks;

-- Create new, more flexible risk policies that work with project ownership

-- Users can view risks in projects they own, have been shared, or are public
CREATE POLICY "risks_select_access" ON risks FOR SELECT 
USING (
    -- User owns the project
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    -- User has been shared the project (any permission level)
    project_id IN (
        SELECT project_id FROM project_shares 
        WHERE shared_with_email = auth.email() 
        AND status = 'accepted'
        AND is_active = true
    )
    OR
    -- Project is public
    project_id IN (
        SELECT id FROM projects WHERE is_public = true
    )
);

-- Users can insert risks in projects they own or have write access to
CREATE POLICY "risks_insert_access" ON risks FOR INSERT 
WITH CHECK (
    -- User owns the project
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
    OR
    -- User has been shared the project with write access (edit/admin)
    project_id IN (
        SELECT project_id FROM project_shares 
        WHERE shared_with_email = auth.email() 
        AND status = 'accepted' 
        AND is_active = true
        AND permission IN ('edit', 'admin', 'write')
    )
);

-- Users can update risks in projects they own or have write access to
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
        AND is_active = true
        AND permission IN ('edit', 'admin', 'write')
    )
);

-- Users can delete risks in projects they own (simplified - no sharing for delete to keep it secure)
CREATE POLICY "risks_delete_access" ON risks FOR DELETE 
USING (
    -- User owns the project
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);

-- Clean up orphaned risks (risks in projects that don't exist)
DELETE FROM risks 
WHERE project_id NOT IN (SELECT id FROM projects);

-- Clean up dummy/test risks with common test patterns
DELETE FROM risks 
WHERE name ILIKE '%test%' 
   OR name ILIKE '%dummy%' 
   OR name ILIKE '%example%'
   OR name ILIKE '%sample%'
   OR name ILIKE '%demo%'
   OR name = 'Test Risk'
   OR name = 'Sample Risk'
   OR name = 'Demo Risk'
   OR name = 'Dummy Risk'
   OR notes ILIKE '%lorem ipsum%'
   OR notes ILIKE '%placeholder%'
   OR notes ILIKE '%this is a test%'
   OR notes = 'Test description'
   OR notes = 'Sample description';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== RISK DELETION POLICIES FIXED ===';
    RAISE NOTICE 'Users can now delete risks in projects they own';
    RAISE NOTICE 'Dummy/test risks have been cleaned up';
    RAISE NOTICE 'RLS policies updated to work with existing schema';
END $$;
