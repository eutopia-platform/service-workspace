CREATE SCHEMA IF NOT EXISTS sc_work;

DROP TABLE IF EXISTS sc_work.workspace;
CREATE TABLE sc_work.workspace();

DROP USER IF EXISTS service_work;
CREATE USER service_work WITH PASSWORD xxxxx;

GRANT USAGE ON SCHEMA sc_work TO service_work;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sc_wor TO service_work;
