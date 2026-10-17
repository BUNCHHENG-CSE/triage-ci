-- TriageCI Production PostgreSQL Initialization Script
-- Executed on container creation to enable performance extensions and schema tuning

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Optimize text search configuration
COMMENT ON EXTENSION pg_trgm IS 'Enables fast trigram similarity indexing for CI/CD failure log search';

-- Pre-configure grant permissions
GRANT ALL PRIVILEGES ON DATABASE triageci TO triageci;
