-- messages: tek tek mesajlar (transcript)
CREATE TABLE messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('student','client')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  token_count int
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see messages in own sessions"
  ON messages FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "users insert messages in own sessions"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);

-- message_count'u senkron tut
CREATE OR REPLACE FUNCTION public.update_session_message_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE sessions SET message_count = message_count + 1 WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_messages_count
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.update_session_message_count();
