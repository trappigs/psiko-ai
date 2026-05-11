-- RLS politikası genişletildi: ai_generated vakalar sadece kendi sessions'a
-- bağlı kullanıcıya görünür. Curated vakalar tüm auth kullanıcılarına açık.
DROP POLICY IF EXISTS "any authenticated user can read active cases" ON public.cases;

CREATE POLICY "read curated active cases or own ai_generated cases"
  ON public.cases FOR SELECT
  TO authenticated
  USING (
    (is_active = true AND source = 'curated')
    OR EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.case_id = cases.id
        AND sessions.user_id = auth.uid()
    )
  );
