-- Enhanced Special Events Support with Comprehensive Fields
-- This migration adds all the fields needed for the sophisticated special events UI

-- First, ensure we have the base tables (they should exist from previous migrations)

-- Add comprehensive forecast fields to special_event_forecasts table
ALTER TABLE IF EXISTS special_event_forecasts
ADD COLUMN IF NOT EXISTS forecast_ticket_sales NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_fnb_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_fnb_cogs_pct NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_merch_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_merch_cogs_pct NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_sponsorship_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_other_income NUMERIC DEFAULT 0,

-- Cost breakdown fields
ADD COLUMN IF NOT EXISTS forecast_staffing_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_venue_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_vendor_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_marketing_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_production_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS forecast_other_costs NUMERIC DEFAULT 0,

-- Marketing fields
ADD COLUMN IF NOT EXISTS marketing_email_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_social_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_influencer_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_paid_ads_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_content_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_strategy TEXT,

-- Event details
ADD COLUMN IF NOT EXISTS estimated_attendance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ticket_price NUMERIC DEFAULT 0,

-- Notes
ADD COLUMN IF NOT EXISTS revenue_notes TEXT,
ADD COLUMN IF NOT EXISTS cost_notes TEXT,
ADD COLUMN IF NOT EXISTS marketing_notes TEXT,
ADD COLUMN IF NOT EXISTS general_notes TEXT;

-- Add comprehensive actuals fields to special_event_actuals table
ALTER TABLE IF EXISTS special_event_actuals
ADD COLUMN IF NOT EXISTS actual_ticket_sales NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_fnb_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_fnb_cogs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_merch_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_merch_cogs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_sponsorship_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_other_income NUMERIC DEFAULT 0,

-- Actual cost breakdown
ADD COLUMN IF NOT EXISTS actual_staffing_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_venue_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_vendor_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_marketing_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_production_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_other_costs NUMERIC DEFAULT 0,

-- Marketing performance
ADD COLUMN IF NOT EXISTS marketing_email_performance TEXT,
ADD COLUMN IF NOT EXISTS marketing_social_performance TEXT,
ADD COLUMN IF NOT EXISTS marketing_influencer_performance TEXT,
ADD COLUMN IF NOT EXISTS marketing_paid_ads_performance TEXT,
ADD COLUMN IF NOT EXISTS marketing_content_performance TEXT,
ADD COLUMN IF NOT EXISTS marketing_roi_notes TEXT,

-- Event metrics
ADD COLUMN IF NOT EXISTS actual_attendance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_breakdown TEXT,
ADD COLUMN IF NOT EXISTS average_ticket_price NUMERIC DEFAULT 0,

-- Success indicators
ADD COLUMN IF NOT EXISTS success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 10),
ADD COLUMN IF NOT EXISTS event_success_indicators TEXT,
ADD COLUMN IF NOT EXISTS challenges_faced TEXT,
ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
ADD COLUMN IF NOT EXISTS recommendations_future TEXT,

-- Post-event analysis
ADD COLUMN IF NOT EXISTS customer_feedback_summary TEXT,
ADD COLUMN IF NOT EXISTS team_feedback TEXT,
ADD COLUMN IF NOT EXISTS vendor_feedback TEXT,

-- Additional metrics
ADD COLUMN IF NOT EXISTS social_media_engagement TEXT,
ADD COLUMN IF NOT EXISTS press_coverage TEXT,
ADD COLUMN IF NOT EXISTS brand_impact_assessment TEXT,

-- Variance notes
ADD COLUMN IF NOT EXISTS revenue_variance_notes TEXT,
ADD COLUMN IF NOT EXISTS cost_variance_notes TEXT,
ADD COLUMN IF NOT EXISTS general_notes TEXT;

-- Create index for better performance on project lookups
CREATE INDEX IF NOT EXISTS idx_special_event_forecasts_project_id ON special_event_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_special_event_actuals_project_id ON special_event_actuals(project_id);

-- Add constraint to ensure only one actuals entry per special event project
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE special_event_actuals 
        ADD CONSTRAINT unique_special_event_actuals_per_project 
        UNIQUE (project_id);
    EXCEPTION 
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Update RLS policies to ensure proper access
-- Users can only access forecasts/actuals for projects they own or are shared with

-- Special Event Forecasts RLS
DROP POLICY IF EXISTS "Users can view special event forecasts for accessible projects" ON special_event_forecasts;
CREATE POLICY "Users can view special event forecasts for accessible projects" ON special_event_forecasts
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE user_id = auth.uid() 
    OR id IN (
      SELECT project_id FROM project_shares 
      WHERE shared_with_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert special event forecasts for owned projects" ON special_event_forecasts;
CREATE POLICY "Users can insert special event forecasts for owned projects" ON special_event_forecasts
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update special event forecasts for owned projects" ON special_event_forecasts;
CREATE POLICY "Users can update special event forecasts for owned projects" ON special_event_forecasts
FOR UPDATE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete special event forecasts for owned projects" ON special_event_forecasts;
CREATE POLICY "Users can delete special event forecasts for owned projects" ON special_event_forecasts
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Special Event Actuals RLS
DROP POLICY IF EXISTS "Users can view special event actuals for accessible projects" ON special_event_actuals;
CREATE POLICY "Users can view special event actuals for accessible projects" ON special_event_actuals
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE user_id = auth.uid() 
    OR id IN (
      SELECT project_id FROM project_shares 
      WHERE shared_with_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can insert special event actuals for owned projects" ON special_event_actuals;
CREATE POLICY "Users can insert special event actuals for owned projects" ON special_event_actuals
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update special event actuals for owned projects" ON special_event_actuals;
CREATE POLICY "Users can update special event actuals for owned projects" ON special_event_actuals
FOR UPDATE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete special event actuals for owned projects" ON special_event_actuals;
CREATE POLICY "Users can delete special event actuals for owned projects" ON special_event_actuals
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Enable RLS on both tables
ALTER TABLE special_event_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_actuals ENABLE ROW LEVEL SECURITY;

-- Create helper function to calculate special event ROI
CREATE OR REPLACE FUNCTION calculate_special_event_roi(
  p_project_id UUID
) RETURNS TABLE (
  forecast_revenue NUMERIC,
  forecast_costs NUMERIC,
  forecast_profit NUMERIC,
  actual_revenue NUMERIC,
  actual_costs NUMERIC,
  actual_profit NUMERIC,
  revenue_variance NUMERIC,
  cost_variance NUMERIC,
  profit_variance NUMERIC,
  roi_percent NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(f.forecast_ticket_sales, 0) + COALESCE(f.forecast_fnb_revenue, 0) + 
    COALESCE(f.forecast_merch_revenue, 0) + COALESCE(f.forecast_sponsorship_income, 0) + 
    COALESCE(f.forecast_other_income, 0) AS forecast_revenue,
    
    COALESCE(f.forecast_staffing_costs, 0) + COALESCE(f.forecast_venue_costs, 0) + 
    COALESCE(f.forecast_vendor_costs, 0) + COALESCE(f.forecast_marketing_costs, 0) + 
    COALESCE(f.forecast_production_costs, 0) + COALESCE(f.forecast_other_costs, 0) AS forecast_costs,
    
    (COALESCE(f.forecast_ticket_sales, 0) + COALESCE(f.forecast_fnb_revenue, 0) + 
     COALESCE(f.forecast_merch_revenue, 0) + COALESCE(f.forecast_sponsorship_income, 0) + 
     COALESCE(f.forecast_other_income, 0)) - 
    (COALESCE(f.forecast_staffing_costs, 0) + COALESCE(f.forecast_venue_costs, 0) + 
     COALESCE(f.forecast_vendor_costs, 0) + COALESCE(f.forecast_marketing_costs, 0) + 
     COALESCE(f.forecast_production_costs, 0) + COALESCE(f.forecast_other_costs, 0)) AS forecast_profit,
    
    COALESCE(a.actual_ticket_sales, 0) + COALESCE(a.actual_fnb_revenue, 0) + 
    COALESCE(a.actual_merch_revenue, 0) + COALESCE(a.actual_sponsorship_income, 0) + 
    COALESCE(a.actual_other_income, 0) AS actual_revenue,
    
    COALESCE(a.actual_staffing_costs, 0) + COALESCE(a.actual_venue_costs, 0) + 
    COALESCE(a.actual_vendor_costs, 0) + COALESCE(a.actual_marketing_costs, 0) + 
    COALESCE(a.actual_production_costs, 0) + COALESCE(a.actual_other_costs, 0) AS actual_costs,
    
    (COALESCE(a.actual_ticket_sales, 0) + COALESCE(a.actual_fnb_revenue, 0) + 
     COALESCE(a.actual_merch_revenue, 0) + COALESCE(a.actual_sponsorship_income, 0) + 
     COALESCE(a.actual_other_income, 0)) - 
    (COALESCE(a.actual_staffing_costs, 0) + COALESCE(a.actual_venue_costs, 0) + 
     COALESCE(a.actual_vendor_costs, 0) + COALESCE(a.actual_marketing_costs, 0) + 
     COALESCE(a.actual_production_costs, 0) + COALESCE(a.actual_other_costs, 0)) AS actual_profit,
    
    -- Revenue variance (actual - forecast)
    (COALESCE(a.actual_ticket_sales, 0) + COALESCE(a.actual_fnb_revenue, 0) + 
     COALESCE(a.actual_merch_revenue, 0) + COALESCE(a.actual_sponsorship_income, 0) + 
     COALESCE(a.actual_other_income, 0)) - 
    (COALESCE(f.forecast_ticket_sales, 0) + COALESCE(f.forecast_fnb_revenue, 0) + 
     COALESCE(f.forecast_merch_revenue, 0) + COALESCE(f.forecast_sponsorship_income, 0) + 
     COALESCE(f.forecast_other_income, 0)) AS revenue_variance,
    
    -- Cost variance (actual - forecast)  
    (COALESCE(a.actual_staffing_costs, 0) + COALESCE(a.actual_venue_costs, 0) + 
     COALESCE(a.actual_vendor_costs, 0) + COALESCE(a.actual_marketing_costs, 0) + 
     COALESCE(a.actual_production_costs, 0) + COALESCE(a.actual_other_costs, 0)) - 
    (COALESCE(f.forecast_staffing_costs, 0) + COALESCE(f.forecast_venue_costs, 0) + 
     COALESCE(f.forecast_vendor_costs, 0) + COALESCE(f.forecast_marketing_costs, 0) + 
     COALESCE(f.forecast_production_costs, 0) + COALESCE(f.forecast_other_costs, 0)) AS cost_variance,
    
    -- Profit variance
    ((COALESCE(a.actual_ticket_sales, 0) + COALESCE(a.actual_fnb_revenue, 0) + 
      COALESCE(a.actual_merch_revenue, 0) + COALESCE(a.actual_sponsorship_income, 0) + 
      COALESCE(a.actual_other_income, 0)) - 
     (COALESCE(a.actual_staffing_costs, 0) + COALESCE(a.actual_venue_costs, 0) + 
      COALESCE(a.actual_vendor_costs, 0) + COALESCE(a.actual_marketing_costs, 0) + 
      COALESCE(a.actual_production_costs, 0) + COALESCE(a.actual_other_costs, 0))) - 
    ((COALESCE(f.forecast_ticket_sales, 0) + COALESCE(f.forecast_fnb_revenue, 0) + 
      COALESCE(f.forecast_merch_revenue, 0) + COALESCE(f.forecast_sponsorship_income, 0) + 
      COALESCE(f.forecast_other_income, 0)) - 
     (COALESCE(f.forecast_staffing_costs, 0) + COALESCE(f.forecast_venue_costs, 0) + 
      COALESCE(f.forecast_vendor_costs, 0) + COALESCE(f.forecast_marketing_costs, 0) + 
      COALESCE(f.forecast_production_costs, 0) + COALESCE(f.forecast_other_costs, 0))) AS profit_variance,
    
    -- ROI percentage based on actual vs investment
    CASE WHEN (COALESCE(a.actual_staffing_costs, 0) + COALESCE(a.actual_venue_costs, 0) + 
               COALESCE(a.actual_vendor_costs, 0) + COALESCE(a.actual_marketing_costs, 0) + 
               COALESCE(a.actual_production_costs, 0) + COALESCE(a.actual_other_costs, 0)) > 0
         THEN ((COALESCE(a.actual_ticket_sales, 0) + COALESCE(a.actual_fnb_revenue, 0) + 
                COALESCE(a.actual_merch_revenue, 0) + COALESCE(a.actual_sponsorship_income, 0) + 
                COALESCE(a.actual_other_income, 0)) / 
               (COALESCE(a.actual_staffing_costs, 0) + COALESCE(a.actual_venue_costs, 0) + 
                COALESCE(a.actual_vendor_costs, 0) + COALESCE(a.actual_marketing_costs, 0) + 
                COALESCE(a.actual_production_costs, 0) + COALESCE(a.actual_other_costs, 0))) * 100
         ELSE 0
    END AS roi_percent
    
  FROM special_event_forecasts f
  FULL OUTER JOIN special_event_actuals a ON f.project_id = a.project_id
  WHERE COALESCE(f.project_id, a.project_id) = p_project_id;
END;
$$;

-- Grant permissions on the function
GRANT EXECUTE ON FUNCTION calculate_special_event_roi(UUID) TO authenticated;
