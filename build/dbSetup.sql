CREATE SCHEMA IF NOT EXISTS sc_work;

DROP TABLE IF EXISTS sc_work.workspace;
CREATE TABLE sc_work.workspace(
  uid       text          PRIMARY KEY,
  name      varchar(70)   UNIQUE NOT NULL,
  created   timestamptz
);

DROP TABLE IF EXISTS sc_work.invitation;
CREATE TABLE sc_work.invitation(
  link            text          PRIMARY KEY,
  workspace       text          NOT NULL,
  invitee         char(20)      NOT NULL,
  issuer          char(20),
  created         timestamptz
);

DROP USER IF EXISTS service_work;
CREATE USER service_work WITH PASSWORD xxxxx;

GRANT CREATE, USAGE ON SCHEMA sc_work TO service_work;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sc_work TO service_work;
