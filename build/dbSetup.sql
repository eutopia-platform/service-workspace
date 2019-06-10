CREATE SCHEMA IF NOT EXISTS schema_workspace;

DROP TABLE IF EXISTS schema_workspace.workspace;
CREATE TABLE schema_workspace.workspace(
  id        uuid          PRIMARY KEY,
  name      varchar       UNIQUE NOT NULL,
  members   uuid[]        NOT NULL,
  invited   uuid[]        NOT NULL,
  created   timestamptz
);

DROP USER IF EXISTS service_work;
CREATE USER service_work WITH PASSWORD xxxxx;

GRANT CREATE, USAGE ON SCHEMA schema_workspace TO service_work;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA schema_workspace TO service_work;
ALTER DEFAULT PRIVILEGES IN SCHEMA schema_workspace GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO eutopia;
