-- Fix for Fortress Modeler Database Issues
-- This script addresses all the missing functions and schema issues

-- 1. First, let's check if deleted_at column exists, if not add it
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create the missing get_user_projects function
CREATE OR REPLACE FUNCTION public.get_user_projects()
RETURNS SETOF projects
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM projects 
  WHERE user_id = auth.uid() 
  AND deleted_at IS NULL
  ORDER BY updated_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_projects() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_projects() TO anon;

-- 3. Create the missing get_shared_projects function
CREATE OR REPLACE FUNCTION public.get_shared_projects()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  product_type TEXT,
  target_audience TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  timeline JSONB,
  avatar_image TEXT,
  is_public BOOLEAN,
  owner_email TEXT,
  share_count INTEGER,
  event_type TEXT,
  event_date DATE,
  event_end_date DATE,
  permission TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.*,
    CASE 
      WHEN ps.permission = 'edit' THEN 'edit'
      WHEN ps.permission = 'view' THEN 'view'
      ELSE 'view'
    END as permission
  FROM projects p
  INNER JOIN project_shares ps ON p.id = ps.project_id
  WHERE ps.user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND p.deleted_at IS NULL
  ORDER BY p.updated_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_shared_projects() TO authenticated;

-- 4. Fix RLS policies for projects table to avoid the "cannot set parameter role" error
-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view public projects" ON projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON projects;

-- Create new, simpler policies
CREATE POLICY "Users can view their own projects" 
ON projects FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can view public projects" 
ON projects FOR SELECT 
TO authenticated, anon
USING (is_public = true AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own projects" 
ON projects FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own projects" 
ON projects FOR UPDATE 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects" 
ON projects FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- 5. Ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 6. Add index for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);

COMMENT ON FUNCTION public.get_user_projects() IS 'Returns all non-deleted projects for the authenticated user';
COMMENT ON FUNCTION public.get_shared_projects() IS 'Returns all projects shared with the authenticated user';
