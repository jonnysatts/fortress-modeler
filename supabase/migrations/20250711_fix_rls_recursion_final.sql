-- Migration: 20250711_fix_rls_recursion_final.sql
-- Fixes infinite recursion in RLS policies by using a SECURITY DEFINER function.

-- Drop existing RLS policies that cause recursion
DROP POLICY IF EXISTS projects_select_policy ON public.projects;
DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
DROP POLICY IF EXISTS projects_update_policy ON public.projects;
DROP POLICY IF EXISTS projects_delete_policy ON public.projects;
DROP POLICY IF EXISTS financial_models_select_policy ON public.financial_models;
DROP POLICY IF EXISTS financial_models_insert_policy ON public.financial_models;
DROP POLICY IF EXISTS financial_models_update_policy ON public.financial_models;
DROP POLICY IF EXISTS financial_models_delete_policy ON public.financial_models;
DROP POLICY IF EXISTS actual_performance_policy ON public.actual_performance;
DROP POLICY IF EXISTS actuals_period_policy ON public.actuals_period_entries;
DROP POLICY IF EXISTS risks_policy ON public.risks;
DROP POLICY IF EXISTS scenarios_policy ON public.scenarios;
DROP POLICY IF EXISTS presence_policy ON public.presence;

-- Drop the old helper functions if they still exist (from previous migrations)
DROP FUNCTION IF EXISTS can_view_project(UUID);
DROP FUNCTION IF EXISTS can_edit_project(UUID);

-- Create a SECURITY DEFINER function to check project access
-- This function runs with the privileges of its owner (supabase_admin) and bypasses RLS within its body.
CREATE OR REPLACE FUNCTION has_project_access(p_id UUID, u_id UUID, required_permission TEXT DEFAULT 'view')
RETURNS BOOLEAN AS $$
DECLARE
  can_access BOOLEAN;
BEGIN
  -- Temporarily disable RLS for this function's internal queries to prevent recursion
  SET LOCAL row_level_security.enabled = false;

  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND (
      is_public = true OR
      user_id = u_id OR
      EXISTS (
        SELECT 1 FROM public.project_shares
        WHERE project_id = p_id
          AND shared_with_id = u_id
          AND status = 'accepted'
          AND (
            required_permission = 'view' OR
            (required_permission = 'edit' AND permission IN ('edit', 'admin'))
          )
      )
    )
  ) INTO can_access;

  RETURN can_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION has_project_access(UUID, UUID, TEXT) TO authenticated;

-- Re-apply RLS policies using the new SECURITY DEFINER function
-- PROJECTS
CREATE POLICY projects_select_policy ON public.projects
    FOR SELECT USING (has_project_access(id, auth.uid(), 'view'));

CREATE POLICY projects_insert_policy ON public.projects
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY projects_update_policy ON public.projects
    FOR UPDATE USING (has_project_access(id, auth.uid(), 'edit'));

CREATE POLICY projects_delete_policy ON public.projects
    FOR DELETE USING (is_project_owner(id)); -- is_project_owner is simple and doesn't cause recursion

-- FINANCIAL MODELS
CREATE POLICY financial_models_select_policy ON public.financial_models
    FOR SELECT USING (has_project_access(project_id, auth.uid(), 'view'));

CREATE POLICY financial_models_insert_policy ON public.financial_models
    FOR INSERT WITH CHECK (has_project_access(project_id, auth.uid(), 'edit') AND user_id = auth.uid());

CREATE POLICY financial_models_update_policy ON public.financial_models
    FOR UPDATE USING (has_project_access(project_id, auth.uid(), 'edit'));

CREATE POLICY financial_models_delete_policy ON public.financial_models
    FOR DELETE USING (has_project_access(project_id, auth.uid(), 'edit'));

-- OTHER PROJECT-LINKED TABLES
CREATE POLICY actual_performance_policy ON public.actual_performance
    FOR ALL USING (has_project_access(project_id, auth.uid(), 'edit'))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY actuals_period_policy ON public.actuals_period_entries
    FOR ALL USING (has_project_access(project_id, auth.uid(), 'edit'))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY risks_policy ON public.risks
    FOR ALL USING (has_project_access(project_id, auth.uid(), 'edit'))
    WITH CHECK (user_id = auth.uid());

CREATE POLICY scenarios_policy ON public.scenarios
    FOR ALL USING (has_project_access(project_id, auth.uid(), 'edit'))
    WITH CHECK (user_id = auth.uid());

-- PRESENCE
CREATE POLICY presence_policy ON public.presence
    FOR ALL USING (has_project_access(project_id, auth.uid(), 'view'))
    WITH CHECK (user_id = auth.uid());

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '=== RLS RECURSION FIX APPLIED ===';
END $$;
