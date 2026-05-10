-- message_feedback: psikolog/değerlendiricinin AI yanıtları için inline geri bildirimi
CREATE TABLE message_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  rating     text NOT NULL CHECK (rating IN ('good', 'bad')),
  tags       text[] NOT NULL DEFAULT '{}',
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own message feedback"
  ON message_feedback FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_msg_feedback_message ON message_feedback(message_id);
CREATE INDEX idx_msg_feedback_user ON message_feedback(user_id);

-- updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION public.touch_message_feedback_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_msg_feedback_updated_at
  BEFORE UPDATE ON message_feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_message_feedback_updated_at();
