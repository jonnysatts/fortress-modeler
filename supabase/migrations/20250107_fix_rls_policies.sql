-- Fix RLS policies to avoid infinite recursion
-- This migration fixes the circular dependency issues in the risk management RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view risks of accessible projects" ON risks;
DROP POLICY IF EXISTS "Users can insert risks to own projects" ON risks;
DROP POLICY IF EXISTS "Users can update own risks" ON risks;
DROP POLICY IF EXISTS "Users can delete own risks" ON risks;

DROP POLICY IF EXISTS "Users can view updates of accessible risks" ON risk_updates;
DROP POLICY IF EXISTS "Users can insert updates to accessible risks" ON risk_updates;

DROP POLICY IF EXISTS "Users can view own notifications" ON risk_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON risk_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON risk_notifications;

-- Create simple, non-recursive RLS policies for risks
CREATE POLICY "Users can manage own risks" ON risks FOR ALL USING (auth.uid() = user_id);

-- Create simple, non-recursive RLS policies for risk_updates
CREATE POLICY "Users can manage own risk updates" ON risk_updates FOR ALL USING (auth.uid() = user_id);

-- Create simple, non-recursive RLS policies for risk_notifications
CREATE POLICY "Users can manage own risk notifications" ON risk_notifications FOR ALL USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'RLS policies fixed successfully - infinite recursion resolved!';
END $$;
