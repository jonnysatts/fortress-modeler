-- Migration: 20250719_fix_get_shared_projects_ambiguity_join.sql
-- This migration corrects the "column reference 'id' is ambiguous" error
-- in the get_shared_projects function by using a JOIN instead of a subquery.

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
  INNER JOIN auth.users u ON ps.shared_with_email = u.email
  WHERE
      p.deleted_at IS NULL
      AND u.id = auth.uid()
      AND p.user_id != auth.uid()
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
    RAISE NOTICE '=== AMBIGUOUS COLUMN FIX APPLIED (JOIN) ===';
    RAISE NOTICE 'Corrected get_shared_projects() function to resolve "id" ambiguity using a JOIN.';
END $$;
