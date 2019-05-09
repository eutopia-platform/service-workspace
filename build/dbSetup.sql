CREATE SCHEMA IF NOT EXISTS sc_work;

DROP TABLE IF EXISTS sc_work.workspace;
CREATE TABLE sc_work.workspace(
  uid       char(20)      PRIMARY KEY,
  name      varchar(70)   UNIQUE NOT NULL
);

DROP USER IF EXISTS service_work;
CREATE USER service_work WITH PASSWORD xxxxx;

GRANT CREATE, USAGE ON SCHEMA sc_work TO service_work;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sc_work TO service_work;
