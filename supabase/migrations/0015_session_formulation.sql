-- Öğrencinin seans sonu vaka formülasyonu — opsiyonel.
-- Şema: { presenting, hypothesis, patterns, next_session, written_at }
ALTER TABLE sessions
  ADD COLUMN formulation jsonb;

COMMENT ON COLUMN sessions.formulation IS
  'Öğrencinin seans sonunda yazdığı kendi formülasyonu — AI raporu üretilmeden önce. Pedagojik refleks-egzersizi: kendi okumanı yap, sonra süpervizör görüşüyle karşılaştır.';
