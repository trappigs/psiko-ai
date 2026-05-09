-- reports: süpervizör raporu (oturum başına bir kez)
CREATE TABLE reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  summary        text NOT NULL,
  strengths      jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements   jsonb NOT NULL DEFAULT '[]'::jsonb,
  missed_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_steps     text NOT NULL,
  generated_at   timestamptz NOT NULL DEFAULT now(),
  model_version  text NOT NULL
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see reports for own sessions"
  ON reports FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));
