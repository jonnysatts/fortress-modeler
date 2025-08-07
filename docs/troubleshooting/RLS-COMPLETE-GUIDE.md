# 🔒 RLS Status Check & Fix Guide

## Quick Check in Supabase Dashboard

### Step 1: Check Current RLS Status

Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/editor

Run this SQL query:
```sql
-- SEE WHICH TABLES EXIST AND THEIR RLS STATUS
SELECT 
  tablename as "Table Name",
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED'
    ELSE '🚨 RLS DISABLED - DATA EXPOSED!'
  END as "Security Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Step 2: Check What Tables You Have

```sql
-- LIST ALL YOUR TABLES WITH ROW COUNTS
SELECT 
  schemaname,
  tablename,
  n_live_tup as "Row Count"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Step 3: If RLS is DISABLED (likely case)

Your app is currently INSECURE. Anyone can read/write all data. 

To fix:
```sql
-- ENABLE RLS ON ALL TABLES AT ONCE
DO $$ 
DECLARE 
  r RECORD;
BEGIN 
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
  LOOP 
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    RAISE NOTICE 'Enabled RLS on: %', r.tablename;
  END LOOP;
END $$;
```

### Step 4: Create Basic Policies

After enabling RLS, you need policies or NO ONE can access data:

```sql
-- BASIC POLICY: Users can manage their own data
-- Adjust table/column names as needed

-- For a 'projects' table (example)
CREATE POLICY "Users can manage own projects" 
ON public.projects 
FOR ALL 
USING (auth.uid() = user_id);

-- For related tables (example)
CREATE POLICY "Users can access project data" 
ON public.financial_models 
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM public.projects 
    WHERE user_id = auth.uid()
  )
);
```

## Current Credential Status

### What You Have:
- ✅ Database Password: `Y3Q!akFJJ9B2yJa`
- ✅ Publishable Key: `sb_publishable_eDwuQxq1a0EciAfbDQtskQ_AEbsF5mC`
- ⚠️ Need: New anon key from Supabase dashboard

### Update Your App:

1. **Get your NEW anon key**:
   - Go to: https://supabase.com/dashboard/project/issmshemlkrucmxcvibs/settings/api
   - Copy the "anon (public)" key

2. **Update these files**:

**.env:**
```env
VITE_SUPABASE_URL=https://issmshemlkrucmxcvibs.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_NEW_ANON_KEY_HERE
```

**src/config/app.config.ts:**
```typescript
supabase: {
  url: 'https://issmshemlkrucmxcvibs.supabase.co',
  anonKey: 'YOUR_NEW_ANON_KEY_HERE'
}
```

**netlify.toml:**
```toml
[build.environment]
  VITE_SUPABASE_URL = "https://issmshemlkrucmxcvibs.supabase.co"
  VITE_SUPABASE_ANON_KEY = "YOUR_NEW_ANON_KEY_HERE"
```

## Decision Tree:

### If RLS is DISABLED:
1. Use regular anon key (NOT publishable key)
2. Get OAuth working first
3. Enable RLS later with proper policies

### If RLS is ENABLED:
1. Check if policies exist
2. If no policies: Create them or disable RLS temporarily
3. Can use publishable key if policies are correct

## Test Your Setup:

```bash
# After updating credentials
cd /Applications/fortress-modeler-cloud
npm run dev

# Try to:
# 1. Sign in with Google OAuth
# 2. Create a project
# 3. Save data
# 4. Reload and verify data persists
```

## Most Likely Issue:

Based on the audit finding that "all financial data is accessible without verification", you probably have:
- ❌ RLS disabled on all tables
- ❌ No authentication checks
- ❌ Data fully exposed

This is why the app "works" but is insecure. Fix by:
1. Using regular anon key (not publishable)
2. Getting OAuth working
3. Then enabling RLS with proper policies
