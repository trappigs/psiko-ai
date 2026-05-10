-- Mevcut 15 vakaya makul içgörü/savunma/kayıt değerlerini doldur.
-- Tabloda title hâlâ unique olduğu varsayılmıyor, bu yüzden title-LIKE ile spesifik update.

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'rasyonelleştirme; sorunu akademik baskıya bağlama',
  register = 'eğitimli üniversiteli; "yani", "biraz" duraksamaları'
WHERE title = 'Sınav kaygısı, üniversite 3. sınıf';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'kabullenmiş depresif çekilme + suçluluk içselleştirme',
  register = 'orta yaş, kentli, ev içi; sade ama duygusal'
WHERE title = 'Boşanma sonrası depresyon — 42 yaş, kadın';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'kaçınma + olumsuz değerlendirme korkusunu önceden tahmin',
  register = 'genç profesyonel, teknik konularda akıcı, kişisel konularda tutuk'
WHERE title = 'Sosyal kaygı — 26 yaş, erkek yazılımcı';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'pro/con listeleyerek karar erteleme; entelektüel kaçış',
  register = 'kentli üniversiteli, fazla "bir taraftan-öbür taraftan"'
WHERE title = 'İlişki sorunu — 31 yaş, kadın, 5 yıllık ilişkide';

UPDATE cases SET
  insight_level = 'low',
  defense_style = 'inkar (eşi ölmemiş gibi yaşamaya devam) + suçluluk gizleme',
  register = 'emekli öğretmen, resmi konuşur, "vefat", "ben" yerine "biz"'
WHERE title = 'Yas — 67 yaş, kadın, eşini kaybetti';

UPDATE cases SET
  insight_level = 'low',
  defense_style = 'duygu küntlüğü; bedensel hipervijilans',
  register = 'tek heceli, asker dönüşü gerginliği, güvenmediğine konuşmaz'
WHERE title = 'Travma sonrası belirtiler — 24 yaş, erkek, askerden döndü';

UPDATE cases SET
  insight_level = 'low',
  defense_style = 'inkar + minimize etme; espri ile ciddiyetten kaçma',
  register = 'orta sınıf profesyonel, savunmacı esprili, "bira da içecek bir şey mi?"'
WHERE title = 'Alkol kullanım sorunu — 35 yaş, erkek';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'mükemmeliyetçilik + ritüelistik kontrol',
  register = 'eğitimli, mantıklı, "biliyorum saçma ama..." sık'
WHERE title = 'Obsesif belirtiler — 29 yaş, kadın';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'belirsizleştirme; cinsiyet zamiri kullanmaktan kaçınma',
  register = 'üniversiteli, Anadolu''dan, terapistin tepkisini test ediyor'
WHERE title = 'Kimlik / cinsel yönelim — 21 yaş, üniversite öğrencisi';

UPDATE cases SET
  insight_level = 'low',
  defense_style = 'duygusal küntleştirme + entelektüalizasyon; "objektif olarak"',
  register = 'avukat, hukuki dile yakın, "şuradan bakarsak", monoton'
WHERE title = 'Çocukluk şiddeti tanığı — 38 yaş, erkek';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'önceden felaketleştirme + sesli düşünme',
  register = 'yeni mezun, akıcı, "yani-aslında", mizah var'
WHERE title = 'Yeni iş başlama kaygısı — 24 yaş, mühendis';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'aile-onayı için kendini küçültme; aşırı düşünme',
  register = 'reklamcı, kentli ama aile karşısında "annecim" registerine düşer'
WHERE title = 'Sevgili tanıştırma kaygısı — 27 yaş, kadın';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'ironi/kendiyle dalga ile suçluluk gizleme; erteleme',
  register = 'akademik dil + sokak ironisi karışık, "neyse" geçiştirmesi'
WHERE title = 'Tez ertelemesi — 26 yaş, yüksek lisans öğrencisi';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'duygu içe çekme + memleket idealize',
  register = 'sade, içe dönük, memleketten bahsederken canlanır'
WHERE title = 'Yeni şehre taşınma yalnızlığı — 28 yaş, erkek';

UPDATE cases SET
  insight_level = 'moderate',
  defense_style = 'kaçınma + onay arama',
  register = 'genç üniversiteli, yumuşak, "sanırım", utangaç'
WHERE title = 'Sınıfta katılım korkusu — 19 yaş, üniversite 1. sınıf';
