-- ENABLE RLS ON ALL TABLES FOR FORTRESS MODELER
-- Run this in your Supabase SQL Editor

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Enable RLS on common tables (adjust table names as needed)
-- These are typical tables for your app based on the features described

-- Projects/Models table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policy for projects (users can only see their own)
CREATE POLICY "Users can view own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id);

-- Financial models table
ALTER TABLE public.financial_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own financial models" ON public.financial_models
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = financial_models.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Risks table
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage risks in their projects" ON public.risks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = risks.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Special events table
ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their special events" ON public.special_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = special_events.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Performance metrics table
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their performance metrics" ON public.performance_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = performance_metrics.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- User profiles table (if exists)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Sharing/collaboration table (if exists)
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see projects shared with them" ON public.project_shares
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = shared_with_user_id
    );

-- After enabling RLS, verify it's working
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
