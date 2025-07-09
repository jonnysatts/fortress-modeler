-- Clean up dummy/test risks that may be causing issues
-- This migration removes risks that appear to be test data or dummy entries

-- Delete risks with obviously dummy/test titles
DELETE FROM risks 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%dummy%' 
   OR title ILIKE '%example%'
   OR title ILIKE '%sample%'
   OR title ILIKE '%demo%'
   OR title = 'Test Risk'
   OR title = 'Sample Risk'
   OR title = 'Demo Risk'
   OR title = 'Dummy Risk';

-- Delete risks with generic/placeholder descriptions
DELETE FROM risks 
WHERE description ILIKE '%lorem ipsum%'
   OR description ILIKE '%placeholder%'
   OR description ILIKE '%this is a test%'
   OR description ILIKE '%dummy%'
   OR description = 'Test description'
   OR description = 'Sample description';

-- Delete risks that may have been created with invalid/test user IDs
DELETE FROM risks 
WHERE user_id NOT IN (
    SELECT id FROM auth.users
);

-- Delete orphaned risks where project no longer exists
DELETE FROM risks 
WHERE project_id NOT IN (
    SELECT id FROM projects
);

-- Add a comment to track this cleanup
COMMENT ON TABLE risks IS 'Cleaned up dummy/test risks on 2025-01-09';
