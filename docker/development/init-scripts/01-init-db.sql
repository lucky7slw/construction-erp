-- Initialize development database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create development schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS construction;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS reporting;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA auth TO erp_user;
GRANT ALL PRIVILEGES ON SCHEMA construction TO erp_user;
GRANT ALL PRIVILEGES ON SCHEMA financial TO erp_user;
GRANT ALL PRIVILEGES ON SCHEMA inventory TO erp_user;
GRANT ALL PRIVILEGES ON SCHEMA reporting TO erp_user;

-- Create basic audit fields function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert development seed data message
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'Development database initialized successfully';
END $$;