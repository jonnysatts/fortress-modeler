-- Add updated_at columns to special event tables and set up triggers

-- Add updated_at to special_event_forecasts
ALTER TABLE special_event_forecasts 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at to special_event_actuals
ALTER TABLE special_event_actuals 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for special_event_forecasts
CREATE TRIGGER update_special_event_forecasts_updated_at 
    BEFORE UPDATE ON special_event_forecasts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for special_event_actuals
CREATE TRIGGER update_special_event_actuals_updated_at 
    BEFORE UPDATE ON special_event_actuals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to set updated_at = created_at for consistency
UPDATE special_event_forecasts SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE special_event_actuals SET updated_at = created_at WHERE updated_at IS NULL;
