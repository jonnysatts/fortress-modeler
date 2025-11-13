-- Migration: 20250715_fix_get_user_projects_ambiguity.sql
-- Fix the ambiguous column reference in get_user_projects function

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_user_projects();

-- Recreate the function with proper column references to avoid ambiguity
CREATE OR REPLACE FUNCTION public.get_user_projects()
RETURNS TABLE (
    project_id UUID,
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
        p.id AS project_id,
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

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== FIXED GET_USER_PROJECTS FUNCTION ===';
    RAISE NOTICE 'Changed return column from id to project_id to avoid ambiguity';
    RAISE NOTICE 'Function should now work without column reference errors';
END $$;
