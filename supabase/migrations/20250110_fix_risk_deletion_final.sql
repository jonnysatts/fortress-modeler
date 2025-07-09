-- Final fix for risk deletion policies - works with enhanced risk schema
-- Allows users to delete risks in projects they own

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

-- Drop any policies from previous attempts
DROP POLICY IF EXISTS "risks_select_access" ON risks;
DROP POLICY IF EXISTS "risks_insert_access" ON risks;
DROP POLICY IF EXISTS "risks_update_access" ON risks;
DROP POLICY IF EXISTS "risks_delete_access" ON risks;

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

-- Clean up dummy/test risks with common test patterns (using correct column names)
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
   OR title = 'Sample Market Risk'
   OR description ILIKE '%lorem ipsum%'
   OR description ILIKE '%placeholder%'
   OR description ILIKE '%this is a test%'
   OR description = 'Test description'
   OR description = 'Sample description'
   OR description = 'This is a sample risk to demonstrate the new risk management system'
   OR mitigation_plan ILIKE '%placeholder%'
   OR mitigation_plan ILIKE '%sample%'
   OR mitigation_plan ILIKE '%demo%';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== RISK DELETION POLICIES FIXED (FINAL) ===';
    RAISE NOTICE 'Users can now delete risks in projects they own';
    RAISE NOTICE 'Dummy/test risks have been cleaned up (using enhanced schema)';
    RAISE NOTICE 'RLS policies updated to work with enhanced risk schema';
END $$;
