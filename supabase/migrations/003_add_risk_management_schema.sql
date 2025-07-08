-- Migration: 003_add_risk_management_schema.sql
-- Description: Add comprehensive risk management tables for Phase B implementation
-- Date: 2025-01-08

-- Create risk categories enum
CREATE TYPE risk_category AS ENUM (
  'market_customer',
  'financial_unit_economics', 
  'execution_delivery',
  'strategic_scaling',
  'operational',
  'regulatory_compliance'
);

-- Create risk severity enum
CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create risk status enum  
CREATE TYPE risk_status AS ENUM ('identified', 'monitoring', 'mitigating', 'closed');

-- Create trend direction enum
CREATE TYPE trend_direction AS ENUM ('improving', 'stable', 'worsening');

-- Create threshold type enum
CREATE TYPE threshold_type AS ENUM ('above', 'below', 'outside_range');

-- Create indicator status enum
CREATE TYPE indicator_status AS ENUM ('normal', 'warning', 'critical');

-- Create action status enum
CREATE TYPE action_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

-- Create action priority enum  
CREATE TYPE action_priority AS ENUM ('low', 'medium', 'high');

-- Main project risks table
CREATE TABLE project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Basic identification
  category risk_category NOT NULL,
  subcategory TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Risk assessment (1-5 scale)
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 1 AND risk_score <= 25),
  severity risk_severity NOT NULL,
  
  -- Status & tracking
  status risk_status NOT NULL DEFAULT 'identified',
  identified_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_resolution_date TIMESTAMPTZ,
  actual_resolution_date TIMESTAMPTZ,
  
  -- Mitigation
  mitigation_plan TEXT,
  assigned_to TEXT,
  
  -- Automatic indicators
  last_auto_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- History & audit
  last_reviewed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  external_references TEXT[] DEFAULT '{}',
  
  -- Row Level Security
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Mitigation actions table
CREATE TABLE mitigation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_risk_id UUID NOT NULL REFERENCES project_risks(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status action_status NOT NULL DEFAULT 'planned',
  assigned_to TEXT,
  due_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  priority action_priority NOT NULL DEFAULT 'medium',
  estimated_effort TEXT,
  actual_effort TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Row Level Security
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Risk history entries table
CREATE TABLE risk_history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_risk_id UUID NOT NULL REFERENCES project_risks(id) ON DELETE CASCADE,
  
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5),
  impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 1 AND risk_score <= 25),
  severity risk_severity NOT NULL,
  notes TEXT,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  automatic_update BOOLEAN NOT NULL DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Row Level Security
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Automatic indicators table
CREATE TABLE automatic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_risk_id UUID NOT NULL REFERENCES project_risks(id) ON DELETE CASCADE,
  
  metric TEXT NOT NULL,
  current_value DECIMAL NOT NULL,
  threshold_value DECIMAL NOT NULL,
  threshold_type threshold_type NOT NULL,
  status indicator_status NOT NULL DEFAULT 'normal',
  trend trend_direction NOT NULL DEFAULT 'stable',
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_source TEXT NOT NULL,
  description TEXT,
  alert_level risk_severity,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Row Level Security
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_project_risks_project_id ON project_risks(project_id);
CREATE INDEX idx_project_risks_category ON project_risks(category);
CREATE INDEX idx_project_risks_severity ON project_risks(severity);
CREATE INDEX idx_project_risks_status ON project_risks(status);
CREATE INDEX idx_project_risks_user_id ON project_risks(user_id);
CREATE INDEX idx_project_risks_risk_score ON project_risks(risk_score DESC);

CREATE INDEX idx_mitigation_actions_project_risk_id ON mitigation_actions(project_risk_id);
CREATE INDEX idx_mitigation_actions_status ON mitigation_actions(status);
CREATE INDEX idx_mitigation_actions_due_date ON mitigation_actions(due_date);
CREATE INDEX idx_mitigation_actions_user_id ON mitigation_actions(user_id);

CREATE INDEX idx_risk_history_project_risk_id ON risk_history_entries(project_risk_id);
CREATE INDEX idx_risk_history_date ON risk_history_entries(date DESC);
CREATE INDEX idx_risk_history_user_id ON risk_history_entries(user_id);

CREATE INDEX idx_automatic_indicators_project_risk_id ON automatic_indicators(project_risk_id);
CREATE INDEX idx_automatic_indicators_metric ON automatic_indicators(metric);
CREATE INDEX idx_automatic_indicators_status ON automatic_indicators(status);
CREATE INDEX idx_automatic_indicators_last_calculated ON automatic_indicators(last_calculated DESC);
CREATE INDEX idx_automatic_indicators_user_id ON automatic_indicators(user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_project_risks_updated_at 
  BEFORE UPDATE ON project_risks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mitigation_actions_updated_at 
  BEFORE UPDATE ON mitigation_actions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automatic_indicators_updated_at 
  BEFORE UPDATE ON automatic_indicators 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate risk score
CREATE OR REPLACE FUNCTION calculate_risk_score(prob INTEGER, imp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN prob * imp;
END;
$$ LANGUAGE plpgsql;

-- Function to determine severity from risk score
CREATE OR REPLACE FUNCTION determine_severity(score INTEGER)
RETURNS risk_severity AS $$
BEGIN
  CASE 
    WHEN score >= 20 THEN RETURN 'critical'::risk_severity;
    WHEN score >= 12 THEN RETURN 'high'::risk_severity;
    WHEN score >= 6 THEN RETURN 'medium'::risk_severity;
    ELSE RETURN 'low'::risk_severity;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate risk score and severity
CREATE OR REPLACE FUNCTION update_risk_score_and_severity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.risk_score = calculate_risk_score(NEW.probability, NEW.impact);
  NEW.severity = determine_severity(NEW.risk_score);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_score_trigger
  BEFORE INSERT OR UPDATE OF probability, impact ON project_risks
  FOR EACH ROW EXECUTE FUNCTION update_risk_score_and_severity();

-- Trigger to automatically create risk history entry on risk changes
CREATE OR REPLACE FUNCTION create_risk_history_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create history entry if risk assessment values changed
  IF (NEW.probability != OLD.probability OR 
      NEW.impact != OLD.impact OR 
      NEW.risk_score != OLD.risk_score OR 
      NEW.severity != OLD.severity) THEN
    
    INSERT INTO risk_history_entries (
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
  AFTER UPDATE ON project_risks
  FOR EACH ROW EXECUTE FUNCTION create_risk_history_entry();

-- Enable Row Level Security
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mitigation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE automatic_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_risks
CREATE POLICY "Users can view their own project risks" 
  ON project_risks FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own project risks" 
  ON project_risks FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own project risks" 
  ON project_risks FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own project risks" 
  ON project_risks FOR DELETE 
  USING (user_id = auth.uid());

-- RLS Policies for mitigation_actions
CREATE POLICY "Users can view their own mitigation actions" 
  ON mitigation_actions FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own mitigation actions" 
  ON mitigation_actions FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own mitigation actions" 
  ON mitigation_actions FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own mitigation actions" 
  ON mitigation_actions FOR DELETE 
  USING (user_id = auth.uid());

-- RLS Policies for risk_history_entries
CREATE POLICY "Users can view their own risk history" 
  ON risk_history_entries FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own risk history" 
  ON risk_history_entries FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for automatic_indicators
CREATE POLICY "Users can view their own automatic indicators" 
  ON automatic_indicators FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own automatic indicators" 
  ON automatic_indicators FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own automatic indicators" 
  ON automatic_indicators FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own automatic indicators" 
  ON automatic_indicators FOR DELETE 
  USING (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT ALL ON project_risks TO authenticated;
GRANT ALL ON mitigation_actions TO authenticated;
GRANT ALL ON risk_history_entries TO authenticated;
GRANT ALL ON automatic_indicators TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;