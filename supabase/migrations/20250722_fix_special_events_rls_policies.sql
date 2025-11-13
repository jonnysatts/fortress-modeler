-- Fix RLS policies for special events tables
-- The issue is that existing policies reference 'users' table which doesn't exist
-- They should reference 'profiles' table instead

-- Drop existing problematic policies
DROP POLICY IF EXISTS special_event_forecasts_select_policy ON special_event_forecasts;
DROP POLICY IF EXISTS special_event_forecasts_insert_policy ON special_event_forecasts;
DROP POLICY IF EXISTS special_event_forecasts_update_policy ON special_event_forecasts;
DROP POLICY IF EXISTS special_event_forecasts_delete_policy ON special_event_forecasts;

DROP POLICY IF EXISTS special_event_actuals_select_policy ON special_event_actuals;
DROP POLICY IF EXISTS special_event_actuals_insert_policy ON special_event_actuals;
DROP POLICY IF EXISTS special_event_actuals_update_policy ON special_event_actuals;
DROP POLICY IF EXISTS special_event_actuals_delete_policy ON special_event_actuals;

-- Create correct RLS policies for special_event_forecasts
CREATE POLICY special_event_forecasts_select_policy ON special_event_forecasts
  FOR SELECT TO public
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY special_event_forecasts_insert_policy ON special_event_forecasts
  FOR INSERT TO public
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY special_event_forecasts_update_policy ON special_event_forecasts
  FOR UPDATE TO public
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY special_event_forecasts_delete_policy ON special_event_forecasts
  FOR DELETE TO public
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

-- Create correct RLS policies for special_event_actuals
CREATE POLICY special_event_actuals_select_policy ON special_event_actuals
  FOR SELECT TO public
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY special_event_actuals_insert_policy ON special_event_actuals
  FOR INSERT TO public
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY special_event_actuals_update_policy ON special_event_actuals
  FOR UPDATE TO public
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ))
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY special_event_actuals_delete_policy ON special_event_actuals
  FOR DELETE TO public
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

-- Ensure RLS is enabled on both tables
ALTER TABLE special_event_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_actuals ENABLE ROW LEVEL SECURITY;
