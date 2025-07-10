-- Migration: 003_add_risk_management_schema.sql
-- Description: Add comprehensive risk management tables.
-- This script is designed to be idempotent and re-runnable.

-- 1. Drop existing objects created by this migration in reverse order of dependency.
-- Only drop triggers if the tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_risks') THEN
        DROP TRIGGER IF EXISTS create_risk_history_trigger ON public.project_risks;
        DROP TRIGGER IF EXISTS update_risk_score_trigger ON public.project_risks;
        DROP TRIGGER IF EXISTS update_project_risks_updated_at ON public.project_risks;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automatic_indicators') THEN
        DROP TRIGGER IF EXISTS update_automatic_indicators_updated_at ON public.automatic_indicators;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mitigation_actions') THEN
        DROP TRIGGER IF EXISTS update_mitigation_actions_updated_at ON public.mitigation_actions;
    END IF;
END
$$;

DROP FUNCTION IF EXISTS create_risk_history_entry();
DROP FUNCTION IF EXISTS update_risk_score_and_severity();
DROP FUNCTION IF EXISTS determine_severity(integer);
DROP FUNCTION IF EXISTS calculate_risk_score(integer, integer);

DROP TABLE IF EXISTS public.automatic_indicators CASCADE;
DROP TABLE IF EXISTS public.risk_history_entries CASCADE;
DROP TABLE IF EXISTS public.mitigation_actions CASCADE;
DROP TABLE IF EXISTS public.project_risks CASCADE;

DROP TYPE IF EXISTS public.action_priority;
DROP TYPE IF EXISTS public.action_status;
DROP TYPE IF EXISTS public.indicator_status;
DROP TYPE IF EXISTS public.threshold_type;
DROP TYPE IF EXISTS public.trend_direction;
DROP TYPE IF EXISTS public.risk_status;
DROP TYPE IF EXISTS public.risk_severity;
DROP TYPE IF EXISTS public.risk_category;

-- 2. Create ENUM types
CREATE TYPE public.risk_category AS ENUM (
  'market_customer',
  'financial_unit_economics', 
  'execution_delivery',
  'strategic_scaling',
  'operational',
  'regulatory_compliance'
);

CREATE TYPE public.risk_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.risk_status AS ENUM ('identified', 'monitoring', 'mitigating', 'closed');
CREATE TYPE public.trend_direction AS ENUM ('improving', 'stable', 'worsening');
CREATE TYPE public.threshold_type AS ENUM ('above', 'below', 'outside_range');
CREATE TYPE public.indicator_status AS ENUM ('normal', 'warning', 'critical');
CREATE TYPE public.action_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.action_priority AS ENUM ('low', 'medium', 'high');

-- 3. Create Tables
CREATE TABLE public.project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.risk_category NOT NULL,
  subcategory TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 1 AND risk_score <= 25),
  severity public.risk_severity NOT NULL,
  status public.risk_status NOT NULL DEFAULT 'identified',
  identified_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_resolution_date TIMESTAMPTZ,
  actual_resolution_date TIMESTAMPTZ,
  mitigation_plan TEXT,
  assigned_to TEXT,
  last_auto_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  external_references TEXT[] DEFAULT '{}'
);

CREATE TABLE public.mitigation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_risk_id UUID NOT NULL REFERENCES public.project_risks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.action_status NOT NULL DEFAULT 'planned',
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  priority public.action_priority NOT NULL DEFAULT 'medium',
  estimated_effort TEXT,
  actual_effort TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.risk_history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_risk_id UUID NOT NULL REFERENCES public.project_risks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 1 AND risk_score <= 25),
  severity public.risk_severity NOT NULL,
  notes TEXT,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  automatic_update BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.automatic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_risk_id UUID NOT NULL REFERENCES public.project_risks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  current_value DECIMAL NOT NULL,
  threshold_value DECIMAL NOT NULL,
  threshold_type public.threshold_type NOT NULL,
  status public.indicator_status NOT NULL DEFAULT 'normal',
  trend public.trend_direction NOT NULL DEFAULT 'stable',
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_source TEXT NOT NULL,
  description TEXT,
  alert_level public.risk_severity,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON public.project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_category ON public.project_risks(category);
CREATE INDEX IF NOT EXISTS idx_project_risks_severity ON public.project_risks(severity);
CREATE INDEX IF NOT EXISTS idx_project_risks_status ON public.project_risks(status);
CREATE INDEX IF NOT EXISTS idx_project_risks_user_id ON public.project_risks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_risk_score ON public.project_risks(risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_mitigation_actions_project_risk_id ON public.mitigation_actions(project_risk_id);
CREATE INDEX IF NOT EXISTS idx_mitigation_actions_status ON public.mitigation_actions(status);
CREATE INDEX IF NOT EXISTS idx_mitigation_actions_due_date ON public.mitigation_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_mitigation_actions_user_id ON public.mitigation_actions(user_id);

CREATE INDEX IF NOT EXISTS idx_risk_history_project_risk_id ON public.risk_history_entries(project_risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_history_date ON public.risk_history_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_risk_history_user_id ON public.risk_history_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_automatic_indicators_project_risk_id ON public.automatic_indicators(project_risk_id);
CREATE INDEX IF NOT EXISTS idx_automatic_indicators_metric ON public.automatic_indicators(metric);
CREATE INDEX IF NOT EXISTS idx_automatic_indicators_status ON public.automatic_indicators(status);
CREATE INDEX IF NOT EXISTS idx_automatic_indicators_last_calculated
ON public.automatic_indicators(last_calculated DESC);
CREATE INDEX IF NOT EXISTS idx_automatic_indicators_user_id ON public.automatic_indicators(user_id);

-- 5. Create Functions and Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_risks_updated_at 
  BEFORE UPDATE ON public.project_risks 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mitigation_actions_updated_at 
  BEFORE UPDATE ON public.mitigation_actions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automatic_indicators_updated_at 
  BEFORE UPDATE ON public.automatic_indicators 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.calculate_risk_score(prob INTEGER, imp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN prob * imp;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.determine_severity(score INTEGER)
RETURNS public.risk_severity AS $$
BEGIN
  CASE 
    WHEN score >= 20 THEN RETURN 'critical'::public.risk_severity;
    WHEN score >= 12 THEN RETURN 'high'::public.risk_severity;
    WHEN score >= 6 THEN RETURN 'medium'::public.risk_severity;
    ELSE RETURN 'low'::public.risk_severity;
  END CASE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_risk_score_and_severity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score = public.calculate_risk_score(NEW.probability, NEW.impact);
  NEW.severity = public.determine_severity(NEW.risk_score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_score_trigger
  BEFORE INSERT OR UPDATE OF probability, impact ON public.project_risks
  FOR EACH ROW EXECUTE FUNCTION public.update_risk_score_and_severity();

CREATE OR REPLACE FUNCTION public.create_risk_history_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history entry if risk assessment values changed
  IF (TG_OP = 'UPDATE' AND (NEW.probability != OLD.probability OR 
      NEW.impact != OLD.impact OR 
      NEW.risk_score != OLD.risk_score OR 
      NEW.severity != OLD.severity)) OR TG_OP = 'INSERT' THEN
    
    INSERT INTO public.risk_history_entries (
      project_risk_id, probability, impact, risk_score, severity,
      changed_by, change_reason, automatic_update, user_id
    ) VALUES (
      NEW.id, NEW.probability, NEW.impact, NEW.risk_score, NEW.severity,
      COALESCE(NEW.reviewed_by, 'system'), 
      'Risk assessment updated',
      FALSE, -- Assume manual update unless specified otherwise
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_risk_history_trigger
  AFTER INSERT OR UPDATE ON public.project_risks
  FOR EACH ROW EXECUTE FUNCTION public.create_risk_history_entry();

-- 6. Enable Row Level Security
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mitigation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automatic_indicators ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Users can view their own project risks" 
  ON public.project_risks FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own project risks" 
  ON public.project_risks FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own project risks" 
  ON public.project_risks FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own project risks" 
  ON public.project_risks FOR DELETE 
  USING (user_id = auth.uid());

-- RLS Policies for mitigation_actions
CREATE POLICY "Users can view their own mitigation actions" 
  ON public.mitigation_actions FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own mitigation actions" 
  ON public.mitigation_actions FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mitigation actions" 
  ON public.mitigation_actions FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own mitigation actions" 
  ON public.mitigation_actions FOR DELETE 
  USING (user_id = auth.uid());

-- RLS Policies for risk_history_entries
CREATE POLICY "Users can view their own risk history" 
  ON public.risk_history_entries FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own risk history" 
  ON public.risk_history_entries FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for automatic_indicators
CREATE POLICY "Users can view their own automatic indicators" 
  ON public.automatic_indicators FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own automatic indicators" 
  ON public.automatic_indicators FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own automatic indicators" 
  ON public.automatic_indicators FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own automatic indicators" 
  ON public.automatic_indicators FOR DELETE 
  USING (user_id = auth.uid());

-- 8. Grant permissions to authenticated users
GRANT ALL ON public.project_risks TO authenticated;
GRANT ALL ON public.mitigation_actions TO authenticated;
GRANT ALL ON public.risk_history_entries TO authenticated;
GRANT ALL ON public.automatic_indicators TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
