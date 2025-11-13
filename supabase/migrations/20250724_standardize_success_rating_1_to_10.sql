-- =====================================================================
-- Standardize success_rating constraint to 1-10 scale
-- =====================================================================
-- Decision: Use 1-10 for more granular event success feedback
-- Resolves conflict between base schema (1-10) and 20250711 (1-5)
-- =====================================================================

-- Drop existing constraint (if exists)
ALTER TABLE special_event_actuals
DROP CONSTRAINT IF EXISTS special_event_actuals_success_rating_check;

-- Add standardized 1-10 constraint
ALTER TABLE special_event_actuals
ADD CONSTRAINT special_event_actuals_success_rating_check
CHECK (success_rating >= 1 AND success_rating <= 10);

-- Add documentation
COMMENT ON COLUMN special_event_actuals.success_rating IS
'Event success rating on 1-10 scale where:
1-3 = Poor (significant issues, below expectations)
4-6 = Satisfactory (met basic expectations)
7-8 = Good (exceeded expectations in some areas)
9-10 = Excellent (exceptional success, highly profitable)
Standardized to 1-10 scale in Jan 2025.';

-- Update any existing ratings > 5 (unlikely but safe)
-- If they were entered as 1-5 thinking max was 5, scale up
UPDATE special_event_actuals
SET success_rating = success_rating * 2
WHERE success_rating <= 5 AND success_rating IS NOT NULL;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'success_rating standardized to 1-10 scale';
    RAISE NOTICE 'Any existing 1-5 ratings have been scaled to 1-10';
END $$;
