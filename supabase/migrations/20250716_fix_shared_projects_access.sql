-- Migration: 20250716_fix_shared_projects_access.sql
-- Fix the shared projects access by creating a dedicated function with SECURITY DEFINER
-- This eliminates the RLS permission issues when accessing shared projects

-- Create a function to get shared projects without RLS issues
CREATE OR REPLACE FUNCTION public.get_shared_projects()
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
    event_end_date DATE,
    permission TEXT
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
        p.event_end_date,
        ps.permission
    FROM public.projects p
    INNER JOIN public.project_shares ps ON ps.project_id = p.id
    WHERE 
        p.deleted_at IS NULL
        AND ps.shared_with_email = (
            SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
        )
        AND p.user_id != auth.uid()  -- Don't include own projects in shared list
    ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_shared_projects() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_shared_projects() IS 
'This function returns projects that have been explicitly shared with the current user via project_shares table. Uses SECURITY DEFINER to bypass RLS restrictions.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== SHARED PROJECTS ACCESS FIXED ===';
    RAISE NOTICE 'Created get_shared_projects() function with SECURITY DEFINER';
    RAISE NOTICE 'Function bypasses RLS to safely access shared projects';
    RAISE NOTICE 'Includes permission level from project_shares table';
END $$;
