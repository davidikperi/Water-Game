CREATE TABLE IF NOT EXISTS watergame_players (
  id text PRIMARY KEY,
  profile jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS watergame_admins (
  code_hash text PRIMARY KEY,
  password_hash text NOT NULL,
  salt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
