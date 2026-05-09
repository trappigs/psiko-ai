-- cases: vaka iskeleti, admin migration ile yüklenir
CREATE TABLE cases (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  presenting     text NOT NULL,
  diagnosis_hint text,
  background     text NOT NULL,
  personality    text NOT NULL,
  speech_style   text NOT NULL,
  goals_hidden   text NOT NULL,
  difficulty     text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "any authenticated user can read active cases"
  ON cases FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE INDEX idx_cases_active ON cases(is_active) WHERE is_active = true;
