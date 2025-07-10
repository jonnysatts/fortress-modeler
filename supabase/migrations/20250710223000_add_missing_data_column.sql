-- Add missing data column to projects table
-- The application expects this column to store additional project data as JSONB

-- Add the missing data column that the application expects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_data_gin ON projects USING GIN (data);

-- Log completion
SELECT 'Added missing data column to projects table successfully' as result;
