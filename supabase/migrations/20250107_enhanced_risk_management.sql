-- Enhanced Risk Management System Migration
-- This migration updates the existing risks table and adds comprehensive risk management capabilities

-- First, let's backup and drop the existing risks table to recreate it with our enhanced schema
DROP TABLE IF EXISTS risks CASCADE;

-- Create the new comprehensive risks table
CREATE TABLE risks (
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

-- Create risk_updates table for tracking changes
CREATE TABLE risk_updates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    risk_id UUID REFERENCES risks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create risk_notifications table for alert system
CREATE TABLE risk_notifications (
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

-- Create indexes for performance
CREATE INDEX risks_project_id_idx ON risks(project_id);
CREATE INDEX risks_user_id_idx ON risks(user_id);
CREATE INDEX risks_category_idx ON risks(category);
CREATE INDEX risks_priority_idx ON risks(priority);
CREATE INDEX risks_status_idx ON risks(status);
CREATE INDEX risks_source_idx ON risks(source);
CREATE INDEX risks_target_date_idx ON risks(target_date);
CREATE INDEX risks_created_at_idx ON risks(created_at);

CREATE INDEX risk_updates_risk_id_idx ON risk_updates(risk_id);
CREATE INDEX risk_updates_user_id_idx ON risk_updates(user_id);
CREATE INDEX risk_updates_created_at_idx ON risk_updates(created_at);

CREATE INDEX risk_notifications_user_id_idx ON risk_notifications(user_id);
CREATE INDEX risk_notifications_project_id_idx ON risk_notifications(project_id);
CREATE INDEX risk_notifications_is_read_idx ON risk_notifications(is_read);
CREATE INDEX risk_notifications_type_idx ON risk_notifications(type);
CREATE INDEX risk_notifications_severity_idx ON risk_notifications(severity);
CREATE INDEX risk_notifications_created_at_idx ON risk_notifications(created_at);

-- Add updated_at trigger for risks table
CREATE TRIGGER update_risks_updated_at 
    BEFORE UPDATE ON risks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for risks (updated to match project access patterns)
CREATE POLICY "Users can view risks of accessible projects" ON risks FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = risks.project_id AND (projects.user_id = auth.uid() OR projects.is_public = true))
);
CREATE POLICY "Users can insert risks to own projects" ON risks FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM projects WHERE projects.id = risks.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "Users can update own risks" ON risks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own risks" ON risks FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for risk_updates
CREATE POLICY "Users can view updates of accessible risks" ON risk_updates FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM risks WHERE risks.id = risk_updates.risk_id AND risks.user_id = auth.uid())
);
CREATE POLICY "Users can insert updates to accessible risks" ON risk_updates FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM risks WHERE risks.id = risk_updates.risk_id AND risks.user_id = auth.uid())
);

-- RLS policies for risk_notifications
CREATE POLICY "Users can view own notifications" ON risk_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON risk_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON risk_notifications FOR DELETE USING (auth.uid() = user_id);

-- Function to calculate risk score from probability and impact
CREATE OR REPLACE FUNCTION calculate_risk_score(prob INTEGER, imp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN prob * imp;
END;
$$ LANGUAGE plpgsql;

-- Function to create risk notification
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

-- Function to auto-update risk score when probability or impact changes
CREATE OR REPLACE FUNCTION update_risk_score()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.probability IS NOT NULL AND NEW.impact IS NOT NULL THEN
        NEW.risk_score = calculate_risk_score(NEW.probability, NEW.impact);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update risk score
CREATE TRIGGER update_risk_score_trigger
    BEFORE INSERT OR UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION update_risk_score();

-- Function to log risk changes and create notifications
CREATE OR REPLACE FUNCTION log_risk_changes()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[] := ARRAY[]::TEXT[];
    field_name TEXT;
    old_val TEXT;
    new_val TEXT;
    notification_title TEXT;
    notification_message TEXT;
    notification_severity TEXT := 'medium';
BEGIN
    -- Only process updates, not inserts
    IF TG_OP = 'UPDATE' THEN
        -- Check each field for changes
        IF OLD.title != NEW.title THEN
            changed_fields := array_append(changed_fields, 'title');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'title', OLD.title, NEW.title);
        END IF;
        
        IF OLD.status != NEW.status THEN
            changed_fields := array_append(changed_fields, 'status');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'status', OLD.status, NEW.status);
            
            -- Create notification for status change
            notification_title := 'Risk Status Updated';
            notification_message := format('Risk "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status);
            
            -- Set severity based on new status
            IF NEW.status = 'closed' THEN
                notification_severity := 'low';
            ELSIF NEW.status = 'mitigating' THEN
                notification_severity := 'medium';
            ELSE
                notification_severity := 'medium';
            END IF;
            
            PERFORM create_risk_notification(
                NEW.id, NEW.user_id, NEW.project_id, 
                'status_change', notification_title, notification_message, notification_severity
            );
        END IF;
        
        IF OLD.priority != NEW.priority THEN
            changed_fields := array_append(changed_fields, 'priority');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'priority', OLD.priority, NEW.priority);
        END IF;
        
        IF COALESCE(OLD.risk_score, 0) != COALESCE(NEW.risk_score, 0) THEN
            changed_fields := array_append(changed_fields, 'risk_score');
            INSERT INTO risk_updates (risk_id, user_id, field_changed, old_value, new_value)
            VALUES (NEW.id, NEW.user_id, 'risk_score', OLD.risk_score::TEXT, NEW.risk_score::TEXT);
            
            -- Create notification for significant score increases
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

-- Trigger to log changes and create notifications
CREATE TRIGGER log_risk_changes_trigger
    AFTER INSERT OR UPDATE ON risks
    FOR EACH ROW
    EXECUTE FUNCTION log_risk_changes();

-- Function to check for approaching target dates (to be called by a scheduler)
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
        
        -- Check if we haven't already sent a notification for this risk recently
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

-- Create a view for risk analytics
CREATE VIEW risk_analytics AS
SELECT 
    r.project_id,
    COUNT(*) as total_risks,
    COUNT(CASE WHEN r.priority = 'critical' THEN 1 END) as critical_risks,
    COUNT(CASE WHEN r.priority = 'high' THEN 1 END) as high_risks,
    COUNT(CASE WHEN r.priority = 'medium' THEN 1 END) as medium_risks,
    COUNT(CASE WHEN r.priority = 'low' THEN 1 END) as low_risks,
    COUNT(CASE WHEN r.status = 'identified' THEN 1 END) as identified_risks,
    COUNT(CASE WHEN r.status = 'assessing' THEN 1 END) as assessing_risks,
    COUNT(CASE WHEN r.status = 'mitigating' THEN 1 END) as mitigating_risks,
    COUNT(CASE WHEN r.status = 'monitoring' THEN 1 END) as monitoring_risks,
    COUNT(CASE WHEN r.status = 'closed' THEN 1 END) as closed_risks,
    COUNT(CASE WHEN r.category = 'customer' THEN 1 END) as customer_risks,
    COUNT(CASE WHEN r.category = 'revenue' THEN 1 END) as revenue_risks,
    COUNT(CASE WHEN r.category = 'timeline' THEN 1 END) as timeline_risks,
    COUNT(CASE WHEN r.category = 'resources' THEN 1 END) as resources_risks,
    COUNT(CASE WHEN r.category = 'market' THEN 1 END) as market_risks,
    COUNT(CASE WHEN r.source = 'automatic' THEN 1 END) as automatic_risks,
    COUNT(CASE WHEN r.source = 'manual' THEN 1 END) as manual_risks,
    AVG(r.risk_score) as avg_risk_score,
    MAX(r.risk_score) as max_risk_score,
    COUNT(CASE WHEN r.target_date IS NOT NULL AND r.target_date < CURRENT_DATE AND r.status != 'closed' THEN 1 END) as overdue_risks
FROM risks r
GROUP BY r.project_id;

-- Enable realtime for risk tables
ALTER publication supabase_realtime ADD TABLE risks;
ALTER publication supabase_realtime ADD TABLE risk_notifications;

-- Create initial risk categories data
INSERT INTO risks (project_id, user_id, title, description, category, priority, status, potential_impact, mitigation_plan, owner, source)
SELECT 
    p.id as project_id,
    p.user_id,
    'Sample Market Risk',
    'This is a sample risk to demonstrate the new risk management system',
    'market',
    'medium',
    'identified',
    'Could impact customer acquisition',
    'Monitor market trends and adjust strategy accordingly',
    'Product Manager',
    'manual'
FROM projects p
LIMIT 0; -- This just creates the structure without inserting data

-- Completion message
DO $$
BEGIN
    RAISE NOTICE 'Enhanced Risk Management System migration completed successfully!';
    RAISE NOTICE 'New features added:';
    RAISE NOTICE '- Comprehensive risk categorization (customer, revenue, timeline, resources, market)';
    RAISE NOTICE '- Risk scoring system with probability × impact calculation';
    RAISE NOTICE '- Automated change tracking and audit trail';
    RAISE NOTICE '- Basic notification system for risk alerts';
    RAISE NOTICE '- Analytics view for risk reporting';
    RAISE NOTICE '- Automatic and manual risk source tracking';
END $$;
