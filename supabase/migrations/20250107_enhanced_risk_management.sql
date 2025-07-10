-- Enhanced Risk Management System Migration
-- This migration updates the existing risks table and adds comprehensive risk management capabilities.
-- Made idempotent to be re-runnable.
-- MERGED from 20250107_fix_all_rls_policies.sql to resolve timestamp conflict.

--------------------------------------------------------------------------------
-- 1. Drop all objects created by this script in reverse order
--------------------------------------------------------------------------------

DROP VIEW IF EXISTS risk_analytics;
DROP TRIGGER IF EXISTS log_risk_changes_trigger ON public.risks;
DROP TRIGGER IF EXISTS update_risk_score_trigger ON public.risks;
DROP TRIGGER IF EXISTS update_risks_updated_at ON public.risks;
DROP FUNCTION IF EXISTS check_approaching_targets();
DROP FUNCTION IF EXISTS log_risk_changes();
DROP FUNCTION IF EXISTS create_risk_notification(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS update_risk_score();
DROP FUNCTION IF EXISTS calculate_risk_score(INTEGER, INTEGER);

DROP TABLE IF EXISTS risk_notifications CASCADE;
DROP TABLE IF EXISTS risk_updates CASCADE;
DROP TABLE IF EXISTS risks CASCADE;


--------------------------------------------------------------------------------
-- 2. Create Tables
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS risks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('customer', 'revenue', 'timeline', 'resources', 'market')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('identified', 'assessing', 'mitigating', 'monitoring', 'closed')) DEFAULT 'identified',
    potential_impact TEXT,
    mitigation_plan TEXT,
    owner TEXT,
    target_date DATE,
    risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 25),
    probability INTEGER CHECK (probability >= 1 AND probability <= 5),
    impact INTEGER CHECK (impact >= 1 AND impact <= 5),
    source TEXT NOT NULL CHECK (source IN ('manual', 'automatic')) DEFAULT 'manual',
    automatic_trigger_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    risk_id UUID REFERENCES risks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    risk_id UUID REFERENCES risks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('new_risk', 'status_change', 'target_approaching', 'score_increase', 'automatic_detection')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);


--------------------------------------------------------------------------------
-- 3. Create Indexes
--------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS risks_project_id_idx ON risks(project_id);
CREATE INDEX IF NOT EXISTS risks_user_id_idx ON risks(user_id);
CREATE INDEX IF NOT EXISTS risks_category_idx ON risks(category);
CREATE INDEX IF NOT EXISTS risks_priority_idx ON risks(priority);
CREATE INDEX IF NOT EXISTS risks_status_idx ON risks(status);
CREATE INDEX IF NOT EXISTS risks_source_idx ON risks(source);
CREATE INDEX IF NOT EXISTS risks_target_date_idx ON risks(target_date);
CREATE INDEX IF NOT EXISTS risks_created_at_idx ON risks(created_at);

CREATE INDEX IF NOT EXISTS risk_updates_risk_id_idx ON risk_updates(risk_id);
CREATE INDEX IF NOT EXISTS risk_updates_user_id_idx ON risk_updates(user_id);
CREATE INDEX IF NOT EXISTS risk_updates_created_at_idx ON risk_updates(created_at);

CREATE INDEX IF NOT EXISTS risk_notifications_user_id_idx ON risk_notifications(user_id);
CREATE INDEX IF NOT EXISTS risk_notifications_project_id_idx ON risk_notifications(project_id);
CREATE INDEX IF NOT EXISTS risk_notifications_is_read_idx ON risk_notifications(is_read);
CREATE INDEX IF NOT EXISTS risk_notifications_type_idx ON risk_notifications(type);
CREATE INDEX IF NOT EXISTS risk_notifications_severity_idx ON risk_notifications(severity);
CREATE INDEX IF NOT EXISTS risk_notifications_created_at_idx ON risk_notifications(created_at);


--------------------------------------------------------------------------------
-- 4. Functions and Triggers
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_risks_updated_at
    BEFORE UPDATE ON risks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION calculate_risk_score(prob INTEGER, imp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN prob * imp;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_risk_notification(
    p_risk_id UUID,
    p_user_id UUID,
    p_project_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_severity TEXT DEFAULT 'medium',
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO risk_notifications (risk_id, user_id, project_id, type, title, message, severity, data)
    VALUES (p_risk_id, p_user_id, p_project_id, p_type, p_title, p_message, p_severity, p_data)
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_risk_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.probability IS NOT NULL AND NEW.impact IS NOT NULL THEN
        NEW.risk_score = calculate_risk_score(NEW.probability, NEW.impact);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_score_trigger
    BEFORE INSERT OR UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION update_risk_score();

CREATE OR REPLACE FUNCTION log_risk_changes()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    notification_title TEXT;
    notification_message TEXT;
    notification_severity TEXT := 'medium';
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log title changes
        IF OLD.title IS DISTINCT FROM NEW.title THEN
            changed_fields := array_append(changed_fields, 'title');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'title', OLD.title, NEW.title);
        END IF;

        -- Log status changes and create notification
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            changed_fields := array_append(changed_fields, 'status');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'status', OLD.status, NEW.status);

            notification_title := 'Risk Status Updated';
            notification_message := format('Risk "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status);
            notification_severity := CASE WHEN NEW.status = 'closed' THEN 'low' ELSE 'medium' END;

            PERFORM create_risk_notification(
                NEW.id, NEW.user_id, NEW.project_id,
                'status_change', notification_title, notification_message, notification_severity
            );
        END IF;

        -- Log priority changes
        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            changed_fields := array_append(changed_fields, 'priority');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'priority', OLD.priority, NEW.priority);
        END IF;

        -- Log risk score changes and create notification for significant increases
        IF COALESCE(OLD.risk_score, 0) != COALESCE(NEW.risk_score, 0) THEN
            changed_fields := array_append(changed_fields, 'risk_score');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'risk_score', OLD.risk_score::TEXT, NEW.risk_score::TEXT);

            IF NEW.risk_score > COALESCE(OLD.risk_score, 0) AND NEW.risk_score >= 15 THEN
                notification_title := 'High Risk Score Detected';
                notification_message := format('Risk "%s" score increased to %s', NEW.title, NEW.risk_score);
                notification_severity := 'high';

                PERFORM create_risk_notification(
                    NEW.id, NEW.user_id, NEW.project_id,
                    'score_increase', notification_title, notification_message, notification_severity
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_risk_changes_trigger
    AFTER INSERT OR UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION log_risk_changes();

CREATE OR REPLACE FUNCTION check_approaching_targets()
RETURNS INTEGER AS $$
DECLARE
    risk_record RECORD;
    notification_count INTEGER := 0;
    days_until_target INTEGER;
BEGIN
    FOR risk_record IN
        SELECT r.*, p.name as project_name
        FROM risks r
        JOIN projects p ON r.project_id = p.id
        WHERE r.target_date IS NOT NULL
          AND r.status NOT IN ('closed')
          AND r.target_date > CURRENT_DATE
          AND r.target_date <= CURRENT_DATE + INTERVAL '7 days'
    LOOP
        days_until_target := (risk_record.target_date - CURRENT_DATE);

        -- Avoid sending duplicate notifications within a day
        IF NOT EXISTS (
            SELECT 1 FROM risk_notifications
            WHERE risk_id = risk_record.id
              AND type = 'target_approaching'
              AND created_at > CURRENT_DATE - INTERVAL '1 day'
        ) THEN
            PERFORM create_risk_notification(
                risk_record.id,
                risk_record.user_id,
                risk_record.project_id,
                'target_approaching',
                'Risk Target Date Approaching',
                format('Risk "%s" target date is in %s days', risk_record.title, days_until_target),
                CASE
                    WHEN days_until_target <= 2 THEN 'high'
                    WHEN days_until_target <= 5 THEN 'medium'
                    ELSE 'low'
                END
            );
            notification_count := notification_count + 1;
        END IF;
    END LOOP;

    RETURN notification_count;
END;
$$ LANGUAGE plpgsql;


--------------------------------------------------------------------------------
-- 5. Create View
--------------------------------------------------------------------------------

CREATE OR REPLACE VIEW risk_analytics AS
SELECT
    r.project_id,
    COUNT(*) AS total_risks,
    COUNT(CASE WHEN r.priority = 'critical' THEN 1 END) AS critical_risks,
    COUNT(CASE WHEN r.priority = 'high' THEN 1 END) AS high_risks,
    COUNT(CASE WHEN r.priority = 'medium' THEN 1 END) AS medium_risks,
    COUNT(CASE WHEN r.priority = 'low' THEN 1 END) AS low_risks,
    COUNT(CASE WHEN r.status = 'identified' THEN 1 END) AS identified_risks,
    COUNT(CASE WHEN r.status = 'assessing' THEN 1 END) AS assessing_risks,
    COUNT(CASE WHEN r.status = 'mitigating' THEN 1 END) AS mitigating_risks,
    COUNT(CASE WHEN r.status = 'monitoring' THEN 1 END) AS monitoring_risks,
    COUNT(CASE WHEN r.status = 'closed' THEN 1 END) AS closed_risks,
    COUNT(CASE WHEN r.category = 'customer' THEN 1 END) AS customer_risks,
    COUNT(CASE WHEN r.category = 'revenue' THEN 1 END) AS revenue_risks,
    COUNT(CASE WHEN r.category = 'timeline' THEN 1 END) AS timeline_risks,
    COUNT(CASE WHEN r.category = 'resources' THEN 1 END) AS resources_risks,
    COUNT(CASE WHEN r.category = 'market' THEN 1 END) AS market_risks,
    COUNT(CASE WHEN r.source = 'automatic' THEN 1 END) AS automatic_risks,
    COUNT(CASE WHEN r.source = 'manual' THEN 1 END) AS manual_risks,
    AVG(r.risk_score) AS avg_risk_score,
    MAX(r.risk_score) AS max_risk_score,
    COUNT(CASE WHEN r.target_date IS NOT NULL AND r.target_date < CURRENT_DATE AND r.status != 'closed' THEN 1 END) AS overdue_risks
FROM risks r
GROUP BY r.project_id;


--------------------------------------------------------------------------------
-- 6. RLS Policies (from fix_all_rls_policies)
--------------------------------------------------------------------------------

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
CREATE POLICY "Users can manage own projects" ON projects FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view public projects" ON projects;
CREATE POLICY "Anyone can view public projects" ON projects FOR SELECT
USING (is_public = true);

DROP POLICY IF EXISTS "Users can manage project shares for their projects" ON project_shares;
CREATE POLICY "Users can manage project shares for their projects" ON project_shares FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM projects WHERE projects.id = project_shares.project_id
));

DROP POLICY IF EXISTS "Users can view shares where they are shared with" ON project_shares;
CREATE POLICY "Users can view shares where they are shared with" ON project_shares FOR SELECT
USING (shared_with_email = auth.email());

DROP POLICY IF EXISTS "Users can manage own risks" ON risks;
CREATE POLICY "Users can manage own risks" ON risks FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own risk updates" ON risk_updates;
CREATE POLICY "Users can manage own risk updates" ON risk_updates FOR ALL
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own risk notifications" ON risk_notifications;
CREATE POLICY "Users can manage own risk notifications" ON risk_notifications FOR ALL
USING (auth.uid() = user_id);


--------------------------------------------------------------------------------
-- 7. Enable Realtime
--------------------------------------------------------------------------------

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.risks;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table "risks" is already in the publication, skipping.';
END;
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_notifications;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Table "risk_notifications" is already in the publication, skipping.';
END;
$$;


--------------------------------------------------------------------------------
-- Completion message
--------------------------------------------------------------------------------

DO $$
BEGIN
    RAISE NOTICE 'Enhanced Risk Management System migration completed successfully!';
END $$;