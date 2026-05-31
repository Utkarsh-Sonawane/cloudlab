-- CloudLab initial DB setup
-- This runs once on postgres container first boot

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure the cloudlab database exists (it's created by POSTGRES_DB env var)
-- This script can add any initial SQL setup needed

COMMENT ON DATABASE cloudlab IS 'CloudLab DevOps Learning Platform';
