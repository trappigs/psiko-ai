-- Süpervizör raporu artık beceri-bazlı sayım da üretiyor.
-- microskills: { skill_key: { count, examples[] }, ratios: { ... } }
ALTER TABLE reports
  ADD COLUMN microskills jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN reports.microskills IS
  'Mikrobeceri ölçümü — açık/kapalı soru, yansıtma, empati, özetleme, tavsiye/yorum sayımı + transkriptten örnekler.';
