-- Enhanced Special Event COGS Standardization Migration
-- Adding the missing fields to match Weekly Events sophistication

-- Add COGS standardization fields to forecasts
ALTER TABLE public.special_event_forecasts 
ADD COLUMN IF NOT EXISTS use_automatic_fnb_cogs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS use_automatic_merch_cogs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS calculated_fnb_cogs NUMERIC,
ADD COLUMN IF NOT EXISTS calculated_merch_cogs NUMERIC;

-- Add COGS tracking and enhanced metrics fields to actuals  
ALTER TABLE public.special_event_actuals 
ADD COLUMN IF NOT EXISTS use_forecast_fnb_cogs_pct BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS use_forecast_merch_cogs_pct BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS calculated_fnb_cogs NUMERIC,
ADD COLUMN IF NOT EXISTS calculated_merch_cogs NUMERIC,
ADD COLUMN IF NOT EXISTS revenue_per_attendee NUMERIC,
ADD COLUMN IF NOT EXISTS cost_per_attendee NUMERIC,
ADD COLUMN IF NOT EXISTS marketing_roi NUMERIC;