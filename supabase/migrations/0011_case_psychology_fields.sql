-- Vaka derinliği için 3 yeni alan: içgörü seviyesi, baskın savunma, söylem kaydı.
-- Bu alanlar AI danışan promptuna beslenir ve "iyi anlatıcı" varsayılanını kırar.

ALTER TABLE cases
  ADD COLUMN insight_level text CHECK (insight_level IN ('low','moderate','high')),
  ADD COLUMN defense_style text,
  ADD COLUMN register text;

COMMENT ON COLUMN cases.insight_level IS
  'Danışanın kendi durumuna ne kadar içgörüsü var. low: bağlantı kuramaz, moderate: kısmen, high: terapötik dile çevirebilir.';
COMMENT ON COLUMN cases.defense_style IS
  'Baskın psikolojik savunma — somatizasyon, dışlaştırma, inkar, entelektüalizasyon, bölme, projeksiyon, fatalizm vb.';
COMMENT ON COLUMN cases.register IS
  'Söylem kaydı — taşra, eğitimli, dini-fatalist, jargonlu, klişeli, argo, vb.';
