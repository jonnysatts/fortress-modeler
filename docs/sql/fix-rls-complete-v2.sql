-- Complete RLS Fix for Fortress Modeler
-- Fixed version that handles missing columns

-- ============================================
-- 1. FIX PROJECT_SHARES TABLE STRUCTURE FIRST
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
-- 2. DISABLE RLS TEMPORARILY TO RESET
-- ============================================
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE actual_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- ============================================
-- Drop all policies on projects
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON projects;', ' ')
        FROM pg_policies 
        WHERE tablename = 'projects'
    );
END $$;

-- Drop all policies on financial_models
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON financial_models;', ' ')
        FROM pg_policies 
        WHERE tablename = 'financial_models'
    );
END $$;

-- Drop all policies on actual_performance
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON actual_performance;', ' ')
        FROM pg_policies 
        WHERE tablename = 'actual_performance'
    );
END $$;

-- ============================================
-- 4. CREATE SIMPLE, WORKING POLICIES
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
-- 5. RE-ENABLE RLS
-- ============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. FIX THE SHARED PROJECTS FUNCTION
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
-- 7. GRANT NECESSARY PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

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

-- ============================================
-- 9. VERIFY THE FIX
-- ============================================
-- Check if we can query projects
SELECT COUNT(*) as project_count FROM projects WHERE deleted_at IS NULL;

-- Check if we can query financial_models
SELECT COUNT(*) as model_count FROM financial_models WHERE deleted_at IS NULL;

-- Test the debug function
SELECT * FROM debug_current_user();
