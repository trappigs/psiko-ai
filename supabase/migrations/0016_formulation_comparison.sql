-- Süpervizör, öğrencinin formülasyonunu okuyup karşılaştırmalı geri bildirim üretir.
-- {aligned[], student_caught[], supervisor_added[], verdict}
ALTER TABLE reports
  ADD COLUMN formulation_comparison jsonb;

COMMENT ON COLUMN reports.formulation_comparison IS
  'Öğrencinin formülasyonu varsa süpervizörün ürettiği karşılaştırma haritası: ortak görüş, öğrencinin yakaladığı, süpervizörün eklediği, kısa hüküm.';
