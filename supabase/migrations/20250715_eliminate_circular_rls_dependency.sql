-- Migration: 20250714_eliminate_circular_rls_dependency.sql
-- DEFINITIVE FIX for RLS circular dependency causing infinite recursion
-- This completely eliminates the circular dependency between projects and project_shares

-- Step 1: Drop ALL existing RLS policies that might be causing circular dependencies
DROP POLICY IF EXISTS "Direct owner access to projects" ON public.projects;
DROP POLICY IF EXISTS "Direct public project access" ON public.projects;
DROP POLICY IF EXISTS "Direct shared project access" ON public.projects;
DROP POLICY IF EXISTS "Direct project shares for owners" ON public.project_shares;
DROP POLICY IF EXISTS "Direct project shares for recipients" ON public.project_shares;

-- Drop any other policies that might exist
DROP POLICY IF EXISTS projects_select_policy ON public.projects;
DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
DROP POLICY IF EXISTS projects_update_policy ON public.projects;
DROP POLICY IF EXISTS projects_delete_policy ON public.projects;
DROP POLICY IF EXISTS project_shares_select_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_insert_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_update_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_delete_policy ON public.project_shares;

-- Step 2: Create SIMPLE, NON-CIRCULAR RLS policies

-- PROJECTS table - NO references to project_shares table
CREATE POLICY "projects_owner_access" ON public.projects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "projects_public_read" ON public.projects
    FOR SELECT USING (is_public = true);

-- PROJECT_SHARES table - NO references to projects table
-- We'll handle project ownership through the application layer, not RLS
CREATE POLICY "project_shares_owner_access" ON public.project_shares
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "project_shares_recipient_read" ON public.project_shares
    FOR SELECT USING (
        shared_with_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Step 3: Create a VIEW that handles shared project access
-- This view will be used by the application to get projects the user can access
-- It doesn't use RLS, so it won't cause circular dependencies
CREATE OR REPLACE VIEW public.user_accessible_projects AS
SELECT DISTINCT p.*
FROM public.projects p
WHERE 
    -- User owns the project
    p.user_id = auth.uid()
    OR
    -- Project is public
    p.is_public = true
    OR
    -- User has been shared the project
    EXISTS (
        SELECT 1 FROM public.project_shares ps
        WHERE ps.project_id = p.id
        AND ps.shared_with_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Grant access to the view
GRANT SELECT ON public.user_accessible_projects TO authenticated;

-- Step 4: Create a function for the application to use instead of direct project access
-- This function will check all access patterns without causing RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_projects()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    description TEXT,
    product_type TEXT,
    target_audience TEXT,
    data JSONB,
    timeline JSONB,
    avatar_image TEXT,
    is_public BOOLEAN,
    owner_email TEXT,
    share_count INTEGER,
    version INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    event_type TEXT,
    event_date DATE,
    event_end_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.description,
        p.product_type,
        p.target_audience,
        p.data,
        p.timeline,
        p.avatar_image,
        p.is_public,
        p.owner_email,
        p.share_count,
        p.version,
        p.created_at,
        p.updated_at,
        p.deleted_at,
        p.event_type,
        p.event_date,
        p.event_end_date
    FROM public.projects p
    WHERE 
        p.deleted_at IS NULL
        AND (
            -- User owns the project
            p.user_id = auth.uid()
            OR
            -- Project is public
            p.is_public = true
            OR
            -- User has been shared the project
            EXISTS (
                SELECT 1 FROM public.project_shares ps
                WHERE ps.project_id = p.id
                AND ps.shared_with_email = (
                    SELECT email FROM auth.users WHERE id = auth.uid()
                )
            )
        )
    ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_projects() TO authenticated;

-- Step 5: Ensure RLS is enabled on necessary tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

-- Step 6: Add comment explaining the solution
COMMENT ON FUNCTION public.get_user_projects() IS 
'This function provides access to all projects a user can see without causing RLS circular dependencies. Use this instead of direct SELECT on projects table.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== CIRCULAR RLS DEPENDENCY ELIMINATED ===';
    RAISE NOTICE 'Projects table: Only owner and public access policies';
    RAISE NOTICE 'Project_shares table: Only direct user access policies';
    RAISE NOTICE 'Created get_user_projects() function for safe project access';
    RAISE NOTICE 'Created user_accessible_projects view for convenience';
    RAISE NOTICE 'NO MORE CIRCULAR DEPENDENCIES!';
END $$;
