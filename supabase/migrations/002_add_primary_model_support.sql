-- Migration: Add primary model support
-- Purpose: Add is_primary column to financial_models table for primary model selection

-- Add is_primary column to financial_models table
ALTER TABLE financial_models 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Create a partial unique index to ensure only one primary model per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_models_unique_primary 
ON financial_models (project_id) 
WHERE is_primary = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN financial_models.is_primary IS 'Indicates if this model is the primary model used for dashboard projections';

-- Set the first model as primary for existing projects that don't have a primary model
-- This ensures backwards compatibility
UPDATE financial_models 
SET is_primary = TRUE 
WHERE id IN (
    SELECT DISTINCT ON (project_id) id 
    FROM financial_models 
    WHERE project_id NOT IN (
        SELECT project_id 
        FROM financial_models 
        WHERE is_primary = TRUE
    )
    ORDER BY project_id, created_at ASC
);