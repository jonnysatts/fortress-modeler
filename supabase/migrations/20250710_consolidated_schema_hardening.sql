-- Migration: 20250710_consolidated_schema_hardening.sql
-- Merged from all 20250710 files to resolve timestamp conflict.
-- This migration performs several schema hardening tasks.

-- 1. Remove legacy 'data' column from projects table
ALTER TABLE public.projects
DROP COLUMN IF EXISTS data;

-- 2. Add unique constraints to prevent duplicate names
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'projects_user_id_name_key'
    ) THEN
        ALTER TABLE public.projects
        ADD CONSTRAINT projects_user_id_name_key UNIQUE (user_id, name);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'financial_models_project_id_name_key'
    ) THEN
        ALTER TABLE public.financial_models
        ADD CONSTRAINT financial_models_project_id_name_key UNIQUE (project_id, name);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'risks_project_id_title_key'
    ) THEN
        ALTER TABLE public.risks
        ADD CONSTRAINT risks_project_id_title_key UNIQUE (project_id, title);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'scenarios_model_id_name_key'
    ) THEN
        ALTER TABLE public.scenarios
        ADD CONSTRAINT scenarios_model_id_name_key UNIQUE (model_id, name);
    END IF;
END;
$$;

-- 3. Add RLS Helper Functions (only is_project_owner remains, others inlined)
CREATE OR REPLACE FUNCTION is_project_owner(p_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Refactor RLS policies to use helper functions or inlined logic
-- PROJECTS
DROP POLICY IF EXISTS projects_select_policy ON public.projects;
CREATE POLICY projects_select_policy ON public.projects
    FOR SELECT USING (
        user_id = auth.uid() OR -- Owner
        is_public = true OR -- Public projects
        EXISTS ( -- Shared projects
            SELECT 1 FROM public.project_shares
            WHERE project_id = projects.id -- Reference the current project's ID
              AND shared_with_id = auth.uid()
              AND status = 'accepted'
        )
    );

DROP POLICY IF EXISTS projects_insert_policy ON public.projects;
CREATE POLICY projects_insert_policy ON public.projects
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS projects_update_policy ON public.projects;
CREATE POLICY projects_update_policy ON public.projects
    FOR UPDATE USING (
        user_id = auth.uid() OR -- Owner
        EXISTS ( -- Edit permission
            SELECT 1 FROM public.project_shares
            WHERE project_id = projects.id -- Reference the current project's ID
              AND shared_with_id = auth.uid()
              AND permission IN ('edit', 'admin')
              AND status = 'accepted'
        )
    );

DROP POLICY IF EXISTS projects_delete_policy ON public.projects;
CREATE POLICY projects_delete_policy ON public.projects
    FOR DELETE USING (is_project_owner(id));

-- FINANCIAL MODELS
DROP POLICY IF EXISTS financial_models_select_policy ON public.financial_models;
CREATE POLICY financial_models_select_policy ON public.financial_models
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            is_public = true OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND status = 'accepted'
            )
        )
    );

DROP POLICY IF EXISTS financial_models_insert_policy ON public.financial_models;
CREATE POLICY financial_models_insert_policy ON public.financial_models
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    );

DROP POLICY IF EXISTS financial_models_update_policy ON public.financial_models;
CREATE POLICY financial_models_update_policy ON public.financial_models
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    );

DROP POLICY IF EXISTS financial_models_delete_policy ON public.financial_models;
CREATE POLICY financial_models_delete_policy ON public.financial_models
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    );

-- OTHER PROJECT-LINKED TABLES (using inlined logic)
DROP POLICY IF EXISTS actual_performance_policy ON public.actual_performance;
CREATE POLICY actual_performance_policy ON public.actual_performance
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    );

DROP POLICY IF EXISTS actuals_period_policy ON public.actuals_period_entries;
CREATE POLICY actuals_period_policy ON public.actuals_period_entries
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    );

DROP POLICY IF EXISTS risks_policy ON public.risks;
CREATE POLICY risks_policy ON public.risks
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    );

DROP POLICY IF EXISTS scenarios_policy ON public.scenarios;
CREATE POLICY scenarios_policy ON public.scenarios
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    )
    WITH CHECK (
        user_id = auth.uid() AND
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND permission IN ('edit', 'admin')
                  AND status = 'accepted'
            )
        )
    );

-- PRESENCE
DROP POLICY IF EXISTS presence_policy ON public.presence;
CREATE POLICY presence_policy ON public.presence
    FOR ALL USING (
        project_id IN (
            SELECT id FROM public.projects WHERE
            user_id = auth.uid() OR
            is_public = true OR
            EXISTS (
                SELECT 1 FROM public.project_shares
                WHERE project_id = projects.id
                  AND shared_with_id = auth.uid()
                  AND status = 'accepted'
            )
        )
    )
    WITH CHECK (user_id = auth.uid());

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '=== CONSOLIDATED SCHEMA HARDENING APPLIED ===';
END $$;
