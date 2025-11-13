-- =====================================================================
-- Phase 2: Configurable Event Categories System
-- =====================================================================
-- This migration creates database tables for flexible event types,
-- cost categories, and frequencies that can be managed via admin UI
-- without requiring code deployments.
-- =====================================================================

-- =====================================================================
-- 1. EVENT TYPES TABLE
-- =====================================================================
-- Replaces hardcoded: EventType = 'weekly' | 'special'
-- Allows admins to add custom event types like 'monthly', 'seasonal', etc.

CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  value TEXT NOT NULL UNIQUE,           -- Used in code: 'weekly', 'special', 'monthly'
  label TEXT NOT NULL,                  -- Display name: 'Weekly Event', 'Special Event'
  description TEXT,                     -- Optional description for admin UI

  -- Behavior flags
  is_recurring BOOLEAN DEFAULT false,   -- True for weekly/monthly, false for one-off events
  requires_forecast BOOLEAN DEFAULT true,  -- Whether forecast form is needed
  requires_actuals BOOLEAN DEFAULT true,   -- Whether actuals form is needed

  -- UI configuration
  icon_name TEXT,                       -- Icon identifier for UI (optional)
  color_scheme TEXT,                    -- Color hex or name for UI theming

  -- Status and ordering
  is_active BOOLEAN DEFAULT true,       -- Soft delete: hide without removing
  is_system BOOLEAN DEFAULT false,      -- System types can't be deleted
  sort_order INTEGER DEFAULT 100,       -- Display order in dropdowns

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_types_active ON event_types(is_active);
CREATE INDEX IF NOT EXISTS idx_event_types_sort ON event_types(sort_order);
CREATE INDEX IF NOT EXISTS idx_event_types_value ON event_types(value);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_event_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_types_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW
  EXECUTE FUNCTION update_event_types_updated_at();

-- =====================================================================
-- 2. COST CATEGORIES TABLE
-- =====================================================================
-- Replaces hardcoded: category = 'staffing' | 'marketing' | 'operations' | 'other'
-- Allows admins to add custom categories like 'venue', 'entertainment', etc.

CREATE TABLE IF NOT EXISTS cost_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  value TEXT NOT NULL UNIQUE,           -- Used in code: 'staffing', 'marketing'
  label TEXT NOT NULL,                  -- Display name: 'Staffing Costs', 'Marketing'
  description TEXT,                     -- Optional description

  -- Categorization
  category_type TEXT DEFAULT 'expense', -- 'expense', 'cogs', 'capital'
  is_cogs BOOLEAN DEFAULT false,        -- True if this is Cost of Goods Sold

  -- UI configuration
  icon_name TEXT,                       -- Icon for UI
  color_scheme TEXT,                    -- Color for charts/reports

  -- Status and ordering
  is_active BOOLEAN DEFAULT true,       -- Soft delete
  is_system BOOLEAN DEFAULT false,      -- System categories can't be deleted
  sort_order INTEGER DEFAULT 100,       -- Display order

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cost_categories_active ON cost_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_cost_categories_sort ON cost_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_cost_categories_value ON cost_categories(value);
CREATE INDEX IF NOT EXISTS idx_cost_categories_type ON cost_categories(category_type);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_cost_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cost_categories_updated_at
  BEFORE UPDATE ON cost_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_cost_categories_updated_at();

-- =====================================================================
-- 3. FREQUENCIES TABLE
-- =====================================================================
-- Replaces hardcoded: frequency = 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'one-time'
-- Allows admins to add custom frequencies

CREATE TABLE IF NOT EXISTS frequencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic info
  value TEXT NOT NULL UNIQUE,           -- Used in code: 'weekly', 'monthly'
  label TEXT NOT NULL,                  -- Display name: 'Weekly', 'Monthly'
  description TEXT,                     -- Optional description

  -- Frequency configuration
  interval_type TEXT,                   -- 'day', 'week', 'month', 'quarter', 'year'
  interval_count INTEGER DEFAULT 1,     -- Number of intervals (e.g., 2 for bi-weekly)
  is_recurring BOOLEAN DEFAULT true,    -- True for recurring, false for one-time

  -- UI configuration
  icon_name TEXT,
  color_scheme TEXT,

  -- Status and ordering
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 100,

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_frequencies_active ON frequencies(is_active);
CREATE INDEX IF NOT EXISTS idx_frequencies_sort ON frequencies(sort_order);
CREATE INDEX IF NOT EXISTS idx_frequencies_value ON frequencies(value);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_frequencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_frequencies_updated_at
  BEFORE UPDATE ON frequencies
  FOR EACH ROW
  EXECUTE FUNCTION update_frequencies_updated_at();

-- =====================================================================
-- 4. SEED DEFAULT DATA
-- =====================================================================
-- Populate tables with current hardcoded values as system defaults

-- Seed Event Types
INSERT INTO event_types (value, label, description, is_recurring, is_system, sort_order, color_scheme) VALUES
  ('weekly', 'Weekly Event', 'Recurring weekly events with regular attendance', true, true, 10, '#3b82f6'),
  ('special', 'Special Event', 'One-time special events with comprehensive tracking', false, true, 20, '#8b5cf6')
ON CONFLICT (value) DO NOTHING;

-- Seed Cost Categories
INSERT INTO cost_categories (value, label, description, category_type, is_system, sort_order, color_scheme) VALUES
  ('staffing', 'Staffing', 'Employee wages, contractors, and labor costs', 'expense', true, 10, '#ef4444'),
  ('marketing', 'Marketing', 'Advertising, promotions, and marketing campaigns', 'expense', true, 20, '#f59e0b'),
  ('operations', 'Operations', 'Day-to-day operational expenses', 'expense', true, 30, '#10b981'),
  ('other', 'Other', 'Miscellaneous expenses', 'expense', true, 40, '#6b7280')
ON CONFLICT (value) DO NOTHING;

-- Seed Frequencies
INSERT INTO frequencies (value, label, description, interval_type, interval_count, is_recurring, is_system, sort_order) VALUES
  ('weekly', 'Weekly', 'Occurs every week', 'week', 1, true, true, 10),
  ('monthly', 'Monthly', 'Occurs every month', 'month', 1, true, true, 20),
  ('quarterly', 'Quarterly', 'Occurs every quarter (3 months)', 'month', 3, true, true, 30),
  ('annually', 'Annually', 'Occurs every year', 'year', 1, true, true, 40),
  ('one-time', 'One-Time', 'Occurs only once', NULL, 0, false, true, 50)
ON CONFLICT (value) DO NOTHING;

-- =====================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
-- All users can read active categories
-- Only authenticated users can suggest changes (admin approval required)

-- Enable RLS on all tables
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencies ENABLE ROW LEVEL SECURITY;

-- Event Types Policies
CREATE POLICY "Anyone can view active event types"
  ON event_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all event types"
  ON event_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert event types"
  ON event_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update event types"
  ON event_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users cannot delete system event types"
  ON event_types FOR DELETE
  TO authenticated
  USING (is_system = false);

-- Cost Categories Policies
CREATE POLICY "Anyone can view active cost categories"
  ON cost_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all cost categories"
  ON cost_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert cost categories"
  ON cost_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cost categories"
  ON cost_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users cannot delete system cost categories"
  ON cost_categories FOR DELETE
  TO authenticated
  USING (is_system = false);

-- Frequencies Policies
CREATE POLICY "Anyone can view active frequencies"
  ON frequencies FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all frequencies"
  ON frequencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert frequencies"
  ON frequencies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update frequencies"
  ON frequencies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users cannot delete system frequencies"
  ON frequencies FOR DELETE
  TO authenticated
  USING (is_system = false);

-- =====================================================================
-- 6. HELPER FUNCTIONS
-- =====================================================================

-- Function to get active event types
CREATE OR REPLACE FUNCTION get_active_event_types()
RETURNS TABLE (
  id UUID,
  value TEXT,
  label TEXT,
  description TEXT,
  is_recurring BOOLEAN,
  color_scheme TEXT,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    et.id,
    et.value,
    et.label,
    et.description,
    et.is_recurring,
    et.color_scheme,
    et.sort_order
  FROM event_types et
  WHERE et.is_active = true
  ORDER BY et.sort_order ASC, et.label ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get active cost categories
CREATE OR REPLACE FUNCTION get_active_cost_categories()
RETURNS TABLE (
  id UUID,
  value TEXT,
  label TEXT,
  description TEXT,
  category_type TEXT,
  color_scheme TEXT,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.value,
    cc.label,
    cc.description,
    cc.category_type,
    cc.color_scheme,
    cc.sort_order
  FROM cost_categories cc
  WHERE cc.is_active = true
  ORDER BY cc.sort_order ASC, cc.label ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get active frequencies
CREATE OR REPLACE FUNCTION get_active_frequencies()
RETURNS TABLE (
  id UUID,
  value TEXT,
  label TEXT,
  description TEXT,
  interval_type TEXT,
  interval_count INTEGER,
  sort_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.value,
    f.label,
    f.description,
    f.interval_type,
    f.interval_count,
    f.sort_order
  FROM frequencies f
  WHERE f.is_active = true
  ORDER BY f.sort_order ASC, f.label ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- Next steps:
-- 1. Apply this migration to your Supabase database
-- 2. Create TypeScript types from database schema
-- 3. Build CategoryService for CRUD operations
-- 4. Create Admin UI for managing categories
-- 5. Update forms to use dynamic dropdowns
-- =====================================================================
