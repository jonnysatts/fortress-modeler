-- Migration: 20250712_fix_rls_recursion_comprehensive.sql
-- A complete and final fix for the RLS infinite recursion issue.
-- This migration replaces all previous attempts with a clean, non-recursive RLS structure.

-- Step 1: Drop all previous, problematic RLS policies and helper functions.
DROP FUNCTION IF EXISTS has_project_access(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS has_project_access(UUID, UUID);
DROP FUNCTION IF EXISTS is_project_owner(UUID);
DROP FUNCTION IF EXISTS is_project_shared_with_user(UUID);

DROP POLICY IF EXISTS projects_select_policy ON public.projects;
DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
DROP POLICY IF EXISTS projects_update_policy ON public.projects;
DROP POLICY IF EXISTS projects_delete_policy ON public.projects;
DROP POLICY IF EXISTS "Allow full access to project owners" ON public.projects;
DROP POLICY IF EXISTS "Allow read access to shared users" ON public.projects;
DROP POLICY IF EXISTS "Allow read access to public projects" ON public.projects;

DROP POLICY IF EXISTS project_shares_select_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_insert_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_update_policy ON public.project_shares;
DROP POLICY IF EXISTS project_shares_delete_policy ON public.project_shares;
DROP POLICY IF EXISTS "Allow access to project owners and recipients" ON public.project_shares;


-- Step 2: Create simple, non-recursive helper functions with SECURITY DEFINER.
-- These functions safely bypass RLS to perform checks, preventing recursion.

-- Function to check if the current user is the owner of a project.
-- Using SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION is_project_owner(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER means this runs with the privileges of the function owner
  -- This bypasses RLS automatically without needing to set roles
  RETURN EXISTS (SELECT 1 FROM public.projects WHERE id = p_id AND user_id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if a project is shared with the current user via their email.
-- Using SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION is_project_shared_with_user(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT := (SELECT email FROM auth.users WHERE id = auth.uid());
BEGIN
  -- SECURITY DEFINER means this runs with the privileges of the function owner
  -- This bypasses RLS automatically without needing to set roles
  RETURN EXISTS (
    SELECT 1 FROM public.project_shares
    WHERE project_id = p_id AND shared_with_email = user_email
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_project_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_project_shared_with_user(UUID) TO authenticated;


-- Step 3: Re-create all policies using only the non-recursive helper functions.

-- PROJECTS Table Policies
CREATE POLICY "Allow full access to project owners" ON public.projects
    FOR ALL USING (is_project_owner(id));

CREATE POLICY "Allow read access to shared users" ON public.projects
    FOR SELECT USING (is_project_shared_with_user(id));

CREATE POLICY "Allow read access to public projects" ON public.projects
    FOR SELECT USING (is_public = true);

-- PROJECT_SHARES Table Policies
CREATE POLICY "Allow access to project owners and recipients" ON public.project_shares
    FOR ALL USING (
        is_project_owner(project_id) OR
        shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '=== COMPREHENSIVE RLS RECURSION FIX APPLIED SUCCESSFULLY ===';
END $$;
