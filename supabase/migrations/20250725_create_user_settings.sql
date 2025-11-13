-- =====================================================================
-- Create user_settings table for persisting user preferences
-- =====================================================================
-- Purpose: Fix settings not persisting across sessions
-- Features: Dark mode, backup reminders, backup frequency, etc.
-- =====================================================================

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Appearance preferences
  dark_mode boolean DEFAULT false,

  -- Notification preferences
  backup_reminders boolean DEFAULT true,
  backup_frequency text DEFAULT 'weekly' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),

  -- Future extensibility
  preferences jsonb DEFAULT '{}'::jsonb,

  -- Audit fields
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure one settings record per user
  UNIQUE(user_id)
);

-- Add updated_at trigger
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own settings
CREATE POLICY "Users can view their own settings"
  ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add helpful comments
COMMENT ON TABLE user_settings IS 'User preferences and settings that persist across sessions';
COMMENT ON COLUMN user_settings.dark_mode IS 'Enable dark mode theme';
COMMENT ON COLUMN user_settings.backup_reminders IS 'Show backup reminder notifications';
COMMENT ON COLUMN user_settings.backup_frequency IS 'Frequency of backup reminders: daily, weekly, or monthly';
COMMENT ON COLUMN user_settings.preferences IS 'JSON storage for additional preferences (future extensibility)';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'user_settings table created successfully';
    RAISE NOTICE 'RLS policies enabled for user-specific access';
END $$;
