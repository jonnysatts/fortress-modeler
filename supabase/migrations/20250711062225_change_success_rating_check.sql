-- Migration: 20250711062225_change_success_rating_check.sql
-- Update success_rating constraint to limit values between 1 and 5

ALTER TABLE public.special_event_actuals
  DROP CONSTRAINT IF EXISTS special_event_actuals_success_rating_check;

ALTER TABLE public.special_event_actuals
  ADD CONSTRAINT special_event_actuals_success_rating_check
  CHECK (success_rating IS NULL OR (success_rating >= 1 AND success_rating <= 5));
