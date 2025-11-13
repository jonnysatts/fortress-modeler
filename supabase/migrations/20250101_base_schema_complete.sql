-- Base Schema Migration: Complete Database Structure
-- This migration creates all required tables, indexes, and relationships for the Fortress Financial Modeler

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    picture TEXT,
    company_domain TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    product_type TEXT NOT NULL,
    target_audience TEXT,
    data JSONB DEFAULT '{}',
    timeline JSONB DEFAULT '{}',
    avatar_image TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    owner_email TEXT,
    share_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    event_type TEXT,
    event_date DATE,
    event_end_date DATE
);

-- Create special_event_forecasts table
CREATE TABLE IF NOT EXISTS public.special_event_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    forecast_fnb_revenue DECIMAL(15,2),
    forecast_fnb_cogs_pct DECIMAL(5,2),
    forecast_merch_revenue DECIMAL(15,2),
    forecast_merch_cogs_pct DECIMAL(5,2),
    forecast_sponsorship_income DECIMAL(15,2),
    forecast_ticket_sales DECIMAL(15,2),
    forecast_other_income DECIMAL(15,2),
    forecast_total_costs DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create special_event_actuals table
CREATE TABLE IF NOT EXISTS public.special_event_actuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    actual_fnb_revenue DECIMAL(15,2),
    actual_fnb_cogs DECIMAL(15,2),
    actual_merch_revenue DECIMAL(15,2),
    actual_merch_cogs DECIMAL(15,2),
    actual_sponsorship_income DECIMAL(15,2),
    actual_ticket_sales DECIMAL(15,2),
    actual_other_income DECIMAL(15,2),
    actual_total_costs DECIMAL(15,2),
    attendance INTEGER,
    notes TEXT,
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create special_event_milestones table
CREATE TABLE IF NOT EXISTS public.special_event_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    milestone_label TEXT,
    target_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    assignee TEXT,
    notes TEXT
);

-- Create financial_models table
CREATE TABLE IF NOT EXISTS public.financial_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    assumptions JSONB DEFAULT '{}',
    results_cache JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    is_primary BOOLEAN DEFAULT FALSE
);

-- Create actual_performance table
CREATE TABLE IF NOT EXISTS public.actual_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    metrics JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create actuals_period_entries table
CREATE TABLE IF NOT EXISTS public.actuals_period_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period INTEGER NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create risks table
CREATE TABLE IF NOT EXISTS public.risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    likelihood TEXT NOT NULL,
    impact TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    mitigation TEXT,
    notes TEXT,
    owner_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scenarios table
CREATE TABLE IF NOT EXISTS public.scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.financial_models(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    assumptions JSONB DEFAULT '{}',
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_shares table
CREATE TABLE IF NOT EXISTS public.project_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    shared_with_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    permission TEXT DEFAULT 'view',
    last_accessed TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active'
);

-- Create presence table
CREATE TABLE IF NOT EXISTS public.presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    model_id UUID REFERENCES public.financial_models(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'online',
    current_page TEXT,
    cursor_position JSONB,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON public.projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at);

CREATE INDEX IF NOT EXISTS idx_financial_models_project_id ON public.financial_models(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_user_id ON public.financial_models(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_is_primary ON public.financial_models(is_primary);

CREATE INDEX IF NOT EXISTS idx_actual_performance_project_id ON public.actual_performance(project_id);
CREATE INDEX IF NOT EXISTS idx_actual_performance_date ON public.actual_performance(date);

CREATE INDEX IF NOT EXISTS idx_actuals_period_entries_project_id ON public.actuals_period_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_actuals_period_entries_period ON public.actuals_period_entries(period);

CREATE INDEX IF NOT EXISTS idx_risks_project_id ON public.risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON public.risks(status);

CREATE INDEX IF NOT EXISTS idx_scenarios_project_id ON public.scenarios(project_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_model_id ON public.scenarios(model_id);

CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON public.project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_with_email ON public.project_shares(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_project_shares_is_active ON public.project_shares(is_active);

CREATE INDEX IF NOT EXISTS idx_presence_user_id ON public.presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_project_id ON public.presence(project_id);

-- Create unique constraints
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_project_period' 
                   AND table_name = 'actuals_period_entries') THEN
        ALTER TABLE public.actuals_period_entries ADD CONSTRAINT unique_project_period UNIQUE (project_id, period);
    END IF;
END $$;

-- Create partial unique index for primary models (only one primary model per project)
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_model_per_project 
ON public.financial_models (project_id) 
WHERE is_primary = TRUE;

-- Create views
CREATE OR REPLACE VIEW public.project_summaries AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.product_type,
    p.is_public,
    p.created_at,
    p.updated_at,
    COALESCE(fm.model_count, 0) as model_count,
    COALESCE(ap.performance_entries_count, 0) as performance_entries_count,
    COALESCE(r.risk_count, 0) as risk_count,
    p.share_count
FROM public.projects p
LEFT JOIN (
    SELECT project_id, COUNT(*) as model_count
    FROM public.financial_models
    WHERE deleted_at IS NULL
    GROUP BY project_id
) fm ON p.id = fm.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as performance_entries_count
    FROM public.actual_performance
    GROUP BY project_id
) ap ON p.id = ap.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as risk_count
    FROM public.risks
    GROUP BY project_id
) r ON p.id = r.project_id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.model_performance AS
SELECT 
    fm.id,
    fm.name,
    fm.project_id,
    fm.assumptions,
    fm.results_cache,
    fm.created_at,
    fm.updated_at,
    COALESCE(s.scenario_count, 0) as scenario_count
FROM public.financial_models fm
LEFT JOIN (
    SELECT model_id, COUNT(*) as scenario_count
    FROM public.scenarios
    GROUP BY model_id
) s ON fm.id = s.model_id
WHERE fm.deleted_at IS NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_financial_models_updated_at BEFORE UPDATE ON public.financial_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_actual_performance_updated_at BEFORE UPDATE ON public.actual_performance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_actuals_period_entries_updated_at BEFORE UPDATE ON public.actuals_period_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create migrate_user_data function
CREATE OR REPLACE FUNCTION public.migrate_user_data(
    user_email TEXT,
    user_name TEXT DEFAULT NULL,
    user_picture TEXT DEFAULT NULL,
    user_company_domain TEXT DEFAULT NULL,
    user_preferences JSONB DEFAULT '{}'
)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
    result_msg TEXT;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RETURN 'User not found with email: ' || user_email;
    END IF;
    
    -- Insert or update profile
    INSERT INTO public.profiles (id, email, name, picture, company_domain, preferences)
    VALUES (user_id, user_email, user_name, user_picture, user_company_domain, user_preferences)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        picture = EXCLUDED.picture,
        company_domain = EXCLUDED.company_domain,
        preferences = EXCLUDED.preferences,
        updated_at = NOW();
    
    result_msg := 'User profile migrated successfully for: ' || user_email;
    RETURN result_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_event_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_event_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_event_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actuals_period_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (these will be updated by the RLS fix migration)
-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects policies (basic - will be enhanced by RLS migration)
CREATE POLICY "Users can view their own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=== BASE SCHEMA MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'All tables, indexes, views, and functions have been created.';
    RAISE NOTICE 'Basic RLS policies are in place.';
    RAISE NOTICE 'Ready for RLS enhancement migration.';
END $$;
