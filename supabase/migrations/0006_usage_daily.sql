-- usage_daily: kullanım/limit takibi
CREATE TABLE usage_daily (
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day           date NOT NULL DEFAULT CURRENT_DATE,
  session_count int NOT NULL DEFAULT 0,
  token_count   int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own usage"
  ON usage_daily FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
