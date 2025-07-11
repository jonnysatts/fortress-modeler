-- Add support for Special Events

-- Additions to existing projects Table
ALTER TABLE projects
ADD COLUMN event_type TEXT CHECK (event_type IN ('weekly', 'special')) DEFAULT 'weekly',
ADD COLUMN event_date DATE,
ADD COLUMN event_end_date DATE; -- optional for multiday events

-- Special Event Forecasting Table
CREATE TABLE special_event_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    forecast_fnb_revenue NUMERIC,
    forecast_fnb_cogs_pct NUMERIC,
    forecast_merch_revenue NUMERIC,
    forecast_merch_cogs_pct NUMERIC,
    forecast_sponsorship_income NUMERIC,
    forecast_ticket_sales NUMERIC,
    forecast_other_income NUMERIC,
    forecast_total_costs NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Special Event Actuals Table
CREATE TABLE special_event_actuals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    actual_fnb_revenue NUMERIC,
    actual_fnb_cogs NUMERIC,
    actual_merch_revenue NUMERIC,
    actual_merch_cogs NUMERIC,
    actual_sponsorship_income NUMERIC,
    actual_ticket_sales NUMERIC,
    actual_other_income NUMERIC,
    actual_total_costs NUMERIC,
    attendance INTEGER,
    notes TEXT,
    success_rating INTEGER CHECK (success_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Milestones (Optional for Prep Tracking)
CREATE TABLE special_event_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    milestone_label TEXT,
    target_date DATE,
    completed BOOLEAN DEFAULT false,
    assignee TEXT,
    notes TEXT
);

-- Apply Row Level Security (RLS) policies
ALTER TABLE special_event_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_milestones ENABLE ROW LEVEL SECURITY;

-- Policies for special_event_forecasts
CREATE POLICY special_event_forecasts_policy ON special_event_forecasts
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE
            user_id = auth.uid() OR
            is_public = true OR
            id IN (SELECT project_id FROM project_shares WHERE shared_with_id = auth.uid() AND status = 'accepted')
        )
    );

-- Policies for special_event_actuals
CREATE POLICY special_event_actuals_policy ON special_event_actuals
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE
            user_id = auth.uid() OR
            is_public = true OR
            id IN (SELECT project_id FROM project_shares WHERE shared_with_id = auth.uid() AND status = 'accepted')
        )
    );

-- Policies for special_event_milestones
CREATE POLICY special_event_milestones_policy ON special_event_milestones
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE
            user_id = auth.uid() OR
            is_public = true OR
            id IN (SELECT project_id FROM project_shares WHERE shared_with_id = auth.uid() AND status = 'accepted')
        )
    );

-- Apply updated_at triggers to new tables
DROP TRIGGER IF EXISTS update_special_event_forecasts_updated_at ON special_event_forecasts;
CREATE TRIGGER update_special_event_forecasts_updated_at BEFORE UPDATE ON special_event_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_special_event_actuals_updated_at ON special_event_actuals;
CREATE TRIGGER update_special_event_actuals_updated_at BEFORE UPDATE ON special_event_actuals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_special_event_milestones_updated_at ON special_event_milestones;
CREATE TRIGGER update_special_event_milestones_updated_at BEFORE UPDATE ON special_event_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add to supabase_realtime publication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.special_event_forecasts;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table "special_event_forecasts" is already in the publication, skipping.';
END;
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.special_event_actuals;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table "special_event_actuals" is already in the publication, skipping.';
END;
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.special_event_milestones;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table "special_event_milestones" is already in the publication, skipping.';
END;
$$;
