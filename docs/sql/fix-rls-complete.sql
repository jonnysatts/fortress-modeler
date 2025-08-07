-- Complete RLS Fix for Fortress Modeler
-- This fixes the "cannot set parameter role within security-definer function" errors

-- ============================================
-- 1. DISABLE RLS TEMPORARILY TO RESET
-- ============================================
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE actual_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view public projects" ON projects;
DROP POLICY IF EXISTS "Users can view shared projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Drop financial_models policies
DROP POLICY IF EXISTS "Users can view models for their projects" ON financial_models;
DROP POLICY IF EXISTS "Users can insert models for their projects" ON financial_models;
DROP POLICY IF EXISTS "Users can update models for their projects" ON financial_models;
DROP POLICY IF EXISTS "Users can delete models for their projects" ON financial_models;

-- ============================================
-- 3. CREATE SIMPLE, WORKING POLICIES
-- ============================================

-- PROJECTS TABLE POLICIES
CREATE POLICY "Enable read for users based on user_id" 
ON projects FOR SELECT 
USING (
  auth.uid() = user_id OR 
  is_public = true OR
  EXISTS (
    SELECT 1 FROM project_shares 
    WHERE project_shares.project_id = projects.id 
    AND project_shares.shared_with_user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert for authenticated users only" 
ON projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" 
ON projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" 
ON projects FOR DELETE 
USING (auth.uid() = user_id);

-- FINANCIAL_MODELS TABLE POLICIES
CREATE POLICY "Enable read for users who own the project" 
ON financial_models FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = financial_models.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert for project owners" 
ON financial_models FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = financial_models.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for project owners" 
ON financial_models FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = financial_models.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete for project owners" 
ON financial_models FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = financial_models.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- ACTUAL_PERFORMANCE TABLE POLICIES
CREATE POLICY "Enable all for project owners" 
ON actual_performance FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = actual_performance.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- ============================================
-- 4. RE-ENABLE RLS
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. FIX THE SHARED PROJECTS FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS public.get_shared_projects();

CREATE OR REPLACE FUNCTION public.get_shared_projects()
RETURNS SETOF projects
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM projects p
  INNER JOIN project_shares ps ON p.id = ps.project_id
  WHERE ps.shared_with_user_id = auth.uid()
  AND p.deleted_at IS NULL
  ORDER BY p.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_projects() TO authenticated;

-- ============================================
-- 6. CHECK PROJECT_SHARES TABLE STRUCTURE
-- ============================================
-- Add missing columns if they don't exist
ALTER TABLE project_shares 
ADD COLUMN IF NOT EXISTS shared_with_user_id UUID REFERENCES auth.users(id);

ALTER TABLE project_shares 
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- If shared_with_user_id doesn't have data, populate from user_email
UPDATE project_shares 
SET shared_with_user_id = (
  SELECT id FROM auth.users 
  WHERE email = project_shares.user_email
)
WHERE shared_with_user_id IS NULL 
AND user_email IS NOT NULL;

-- ============================================
-- 7. GRANT NECESSARY PERMISSIONS
-- ============================================
GRANT ALL ON projects TO authenticated;
GRANT ALL ON financial_models TO authenticated;
GRANT ALL ON actual_performance TO authenticated;
GRANT ALL ON project_shares TO authenticated;

-- ============================================
-- 8. CREATE HELPER FUNCTION FOR DEBUGGING
-- ============================================
CREATE OR REPLACE FUNCTION public.debug_current_user()
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  user_role TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    auth.uid() as user_id,
    auth.email() as user_email,
    auth.role() as user_role;
$$;

GRANT EXECUTE ON FUNCTION public.debug_current_user() TO authenticated;

-- Test it
SELECT * FROM debug_current_user();
