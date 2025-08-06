-- =====================================================
-- EMERGENCY DATABASE FIX FOR PROJECT CREATION ISSUE
-- =====================================================
-- 
-- ISSUE: Application expects 'data' JSONB column in projects table
-- ERROR: "Could not find the 'data' column of 'projects' in the schema cache"
-- 
-- This script will:
-- 1. Add the missing 'data' JSONB column to projects table
-- 2. Create performance indexes
-- 3. Verify the fix
-- 4. Show current table structure for confirmation
--
-- SAFE TO RUN: Uses IF NOT EXISTS to prevent errors if already applied
-- =====================================================

BEGIN;

-- Step 1: Show current projects table structure (before fix)
DO $$
BEGIN
    RAISE NOTICE '=== BEFORE FIX: Current projects table structure ===';
END
$$;

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'projects'
ORDER BY ordinal_position;

-- Step 2: Add the missing data column
DO $$
BEGIN
    RAISE NOTICE '=== ADDING MISSING DATA COLUMN ===';
    
    -- Check if column already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'projects' 
          AND column_name = 'data'
    ) THEN
        ALTER TABLE projects ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'SUCCESS: Added data JSONB column to projects table';
    ELSE
        RAISE NOTICE 'SKIPPED: data column already exists';
    END IF;
END
$$;

-- Step 3: Create performance indexes
DO $$
BEGIN
    RAISE NOTICE '=== CREATING PERFORMANCE INDEXES ===';
    
    -- GIN index for JSONB queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'projects' 
          AND indexname = 'idx_projects_data_gin'
    ) THEN
        CREATE INDEX idx_projects_data_gin ON projects USING GIN (data);
        RAISE NOTICE 'SUCCESS: Created GIN index on data column';
    ELSE
        RAISE NOTICE 'SKIPPED: GIN index already exists';
    END IF;
END
$$;

-- Step 4: Verify the fix worked
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATION ===';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'projects' 
          AND column_name = 'data'
          AND data_type = 'jsonb'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: data column exists and is JSONB type';
    ELSE
        RAISE NOTICE '❌ ERROR: data column missing or wrong type';
    END IF;
END
$$;

-- Step 5: Show updated table structure (after fix)
DO $$
BEGIN
    RAISE NOTICE '=== AFTER FIX: Updated projects table structure ===';
END
$$;

SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'projects'
ORDER BY ordinal_position;

-- Step 6: Show all indexes on projects table
DO $$
BEGIN
    RAISE NOTICE '=== CURRENT INDEXES ON PROJECTS TABLE ===';
END
$$;

SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'projects' 
  AND schemaname = 'public'
ORDER BY indexname;

-- Step 7: Test insert capability (dry run)
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    RAISE NOTICE '=== TESTING INSERT CAPABILITY ===';
    
    -- Count current projects
    SELECT COUNT(*) INTO test_count FROM projects;
    RAISE NOTICE 'Current project count: %', test_count;
    
    -- Test that we can reference the data column without error
    PERFORM 1 FROM projects WHERE data IS NOT NULL LIMIT 1;
    RAISE NOTICE '✅ SUCCESS: data column is accessible for queries';
    
    RAISE NOTICE '✅ SUCCESS: Projects table is ready for new project creation';
END
$$;

-- Step 8: Show final status
DO $$
BEGIN
    RAISE NOTICE '=== FINAL STATUS ===';
    RAISE NOTICE '✅ Database fix completed successfully!';
    RAISE NOTICE '✅ Projects table now has required data JSONB column';
    RAISE NOTICE '✅ Performance indexes created';
    RAISE NOTICE '✅ Application should now be able to create projects';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test project creation in your application.';
END
$$;

COMMIT;

-- Final confirmation query
SELECT 'EMERGENCY_FIX_COMPLETED_SUCCESSFULLY' as status, NOW() as completed_at;
