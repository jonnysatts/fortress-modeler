#!/bin/bash

echo "🔍 Checking RLS Status on Your Supabase Database"
echo "================================================"
echo ""
echo "Since direct CLI access is having issues, here's what you need to do:"
echo ""
echo "1. Go to your Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/editor"
echo ""
echo "2. Run this query to check RLS status:"
echo ""
cat << 'SQL'
-- Check RLS status on all tables
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as "RLS Status",
  CASE 
    WHEN rowsecurity = false THEN 'SECURITY RISK!'
    ELSE 'Protected'
  END as "Security"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(policyname) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- List all existing policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as "Policy Condition"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
SQL

echo ""
echo "3. Based on what you find:"
echo "   - If RLS is DISABLED (❌) on tables, your data is UNSECURED"
echo "   - If RLS is ENABLED (✅) but no policies exist, NO ONE can access data"
echo "   - You need both RLS enabled AND proper policies"
echo ""
echo "4. To quickly enable RLS on all tables:"
echo ""
cat << 'SQL'
-- Enable RLS on all public tables
DO $$ 
DECLARE 
  r RECORD;
BEGIN 
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
  LOOP 
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    RAISE NOTICE 'Enabled RLS on table: %', r.tablename;
  END LOOP;
END $$;

-- Create basic "users can access their own data" policies
-- (You'll need to customize these based on your table structure)
SQL

echo ""
echo "5. Your new credentials to update in the app:"
echo "   - Database Password: Y3Q!akFJJ9B2yJa"
echo "   - Publishable Key: sb_publishable_eDwuQxq1a0EciAfbDQtskQ_AEbsF5mC"
echo "   - Remember: Publishable key ONLY works with RLS enabled!"
