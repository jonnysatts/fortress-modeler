-- Create special events tables for forecasts, actuals, and milestones

-- Special Event Forecasts Table
CREATE TABLE IF NOT EXISTS special_event_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    forecast_fnb_revenue NUMERIC,
    forecast_fnb_cogs_pct NUMERIC CHECK (forecast_fnb_cogs_pct >= 0 AND forecast_fnb_cogs_pct <= 100),
    forecast_merch_revenue NUMERIC,
    forecast_merch_cogs_pct NUMERIC CHECK (forecast_merch_cogs_pct >= 0 AND forecast_merch_cogs_pct <= 100),
    forecast_sponsorship_income NUMERIC,
    forecast_ticket_sales NUMERIC,
    forecast_other_income NUMERIC,
    forecast_total_costs NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special Event Actuals Table
CREATE TABLE IF NOT EXISTS special_event_actuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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
    success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special Event Milestones Table
CREATE TABLE IF NOT EXISTS special_event_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_label TEXT,
    target_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    assignee TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_special_event_forecasts_project_id ON special_event_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_special_event_actuals_project_id ON special_event_actuals(project_id);
CREATE INDEX IF NOT EXISTS idx_special_event_milestones_project_id ON special_event_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_special_event_milestones_target_date ON special_event_milestones(target_date);

-- Enable RLS
ALTER TABLE special_event_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_event_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for special_event_forecasts
CREATE POLICY special_event_forecasts_select_policy ON special_event_forecasts
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid() 
            OR is_public = true
        )
    );

CREATE POLICY special_event_forecasts_insert_policy ON special_event_forecasts
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY special_event_forecasts_update_policy ON special_event_forecasts
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY special_event_forecasts_delete_policy ON special_event_forecasts
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for special_event_actuals
CREATE POLICY special_event_actuals_select_policy ON special_event_actuals
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid() 
            OR is_public = true
        )
    );

CREATE POLICY special_event_actuals_insert_policy ON special_event_actuals
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY special_event_actuals_update_policy ON special_event_actuals
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY special_event_actuals_delete_policy ON special_event_actuals
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for special_event_milestones
CREATE POLICY special_event_milestones_select_policy ON special_event_milestones
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid() 
            OR is_public = true
        )
    );

CREATE POLICY special_event_milestones_insert_policy ON special_event_milestones
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY special_event_milestones_update_policy ON special_event_milestones
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY special_event_milestones_delete_policy ON special_event_milestones
    FOR DELETE USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE user_id = auth.uid()
        )
    );

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_special_event_forecasts_updated_at 
    BEFORE UPDATE ON special_event_forecasts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_event_actuals_updated_at 
    BEFORE UPDATE ON special_event_actuals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_event_milestones_updated_at 
    BEFORE UPDATE ON special_event_milestones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
