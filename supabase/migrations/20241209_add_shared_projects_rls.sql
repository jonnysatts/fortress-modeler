-- Add RLS policy to allow users to view projects shared with them
CREATE POLICY "Users can view projects shared with them" ON projects
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT project_id 
    FROM project_shares 
    WHERE user_id = auth.uid()
  )
);

-- Ensure the project_shares table has proper RLS policies
DROP POLICY IF EXISTS "Users can view their own shares" ON project_shares;
DROP POLICY IF EXISTS "Users can manage their own shares" ON project_shares;

CREATE POLICY "Users can view shares involving them" ON project_shares
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Project owners can manage shares" ON project_shares
FOR ALL
TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects WHERE owner_id = auth.uid()
  )
);