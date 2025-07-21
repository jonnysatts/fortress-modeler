-- Add updated_at triggers for special events tables (safe version)

-- Create triggers for special_event_forecasts (only if they don't exist)
DROP TRIGGER IF EXISTS update_special_event_forecasts_updated_at ON special_event_forecasts;
CREATE TRIGGER update_special_event_forecasts_updated_at
    BEFORE UPDATE ON special_event_forecasts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for special_event_actuals (only if they don't exist)  
DROP TRIGGER IF EXISTS update_special_event_actuals_updated_at ON special_event_actuals;
CREATE TRIGGER update_special_event_actuals_updated_at
    BEFORE UPDATE ON special_event_actuals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();