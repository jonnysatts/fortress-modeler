-- Fortress Modeler Database Schema
-- Phase 2: Core tables for user management and sync

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    company_domain VARCHAR(255),
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    local_id INTEGER, -- Maps to IndexedDB ID for sync
    name VARCHAR(255) NOT NULL,
    description TEXT,
    product_type VARCHAR(255),
    target_audience TEXT,
    data JSONB DEFAULT '{}'::jsonb, -- Full project data
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL -- Soft deletes for sync
);

-- Financial models table
CREATE TABLE IF NOT EXISTS financial_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    local_id INTEGER, -- Maps to IndexedDB ID for sync
    name VARCHAR(255) NOT NULL,
    assumptions JSONB DEFAULT '{}'::jsonb,
    results_cache JSONB DEFAULT '{}'::jsonb, -- Cached calculations
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Sync status tracking
CREATE TABLE IF NOT EXISTS sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_sync TIMESTAMPTZ,
    sync_token VARCHAR(255),
    pending_changes JSONB DEFAULT '[]'::jsonb,
    sync_in_progress BOOLEAN DEFAULT false,
    last_error TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync events log (for conflict resolution)
CREATE TABLE IF NOT EXISTS sync_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'project', 'model', etc.
    entity_id UUID NOT NULL,
    local_entity_id INTEGER, -- For mapping to IndexedDB
    action VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    data_before JSONB,
    data_after JSONB,
    timestamp_local TIMESTAMPTZ,
    timestamp_server TIMESTAMPTZ DEFAULT NOW(),
    sync_batch_id UUID,
    resolved BOOLEAN DEFAULT false
);

-- Project sharing (for Phase 5, but create table now)
CREATE TABLE IF NOT EXISTS project_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_email VARCHAR(255) NOT NULL,
    permission VARCHAR(50) NOT NULL CHECK (permission IN ('view', 'edit')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NULL,
    UNIQUE(project_id, shared_with_email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_local_id ON projects(local_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_project_id ON financial_models(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_user_id ON financial_models(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_models_local_id ON financial_models(local_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_user_id ON sync_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_entity ON sync_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_timestamp ON sync_events(timestamp_server);
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_email ON project_shares(shared_with_email);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_financial_models_updated_at ON financial_models;
CREATE TRIGGER update_financial_models_updated_at BEFORE UPDATE ON financial_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_status_updated_at ON sync_status;
CREATE TRIGGER update_sync_status_updated_at BEFORE UPDATE ON sync_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (for future multi-tenancy)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;

-- Policies (basic user isolation)
DROP POLICY IF EXISTS projects_user_isolation ON projects;
CREATE POLICY projects_user_isolation ON projects
    FOR ALL TO public USING (user_id = current_setting('app.current_user_id', true)::uuid);

DROP POLICY IF EXISTS financial_models_user_isolation ON financial_models;
CREATE POLICY financial_models_user_isolation ON financial_models
    FOR ALL TO public USING (user_id = current_setting('app.current_user_id', true)::uuid);

DROP POLICY IF EXISTS sync_events_user_isolation ON sync_events;
CREATE POLICY sync_events_user_isolation ON sync_events
    FOR ALL TO public USING (user_id = current_setting('app.current_user_id', true)::uuid);

-- Insert initial admin user (for testing)
INSERT INTO users (google_id, email, name, company_domain) 
VALUES ('test-admin-001', 'admin@fortress.test', 'Test Admin', 'fortress.test')
ON CONFLICT (google_id) DO NOTHING;