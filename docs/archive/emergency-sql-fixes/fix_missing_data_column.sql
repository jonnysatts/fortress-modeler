-- Emergency fix for missing data column in projects table
-- This is blocking project creation

-- Add the missing data column that the application expects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_data_gin ON projects USING GIN (data);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'data';

-- Show confirmation
SELECT 'SUCCESS: Added missing data column to projects table' as result;
