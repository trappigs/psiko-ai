-- sessions: bir öğrenci-vaka oturumu
CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_id       uuid NOT NULL REFERENCES cases(id),
  status        text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  message_count int NOT NULL DEFAULT 0
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own sessions"
  ON sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sessions_user_status ON sessions(user_id, status);
