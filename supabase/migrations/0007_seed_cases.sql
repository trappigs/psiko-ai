-- seed: 1 örnek vaka (proje sahibi 5-10 vakaya genişletecek)
INSERT INTO cases (title, presenting, diagnosis_hint, background, personality, speech_style, goals_hidden, difficulty)
VALUES (
  'Sınav kaygısı, üniversite 3. sınıf',
  'Son 2 aydır uyku problemi, sınavlarda donma, kendine güvensizlik. "Hiçbir şey yapmak istemiyorum."',
  'Yaygın anksiyete bozukluğu / sınav odaklı performans kaygısı çağrışımı.',
  'Bekar, mühendislik 3. sınıf öğrencisi. Babasıyla mesafeli, anne baskısı yüksek. Lisede başarılı, üniversitede zorlanıyor. Eski sevgilisinden 6 ay önce ayrılmış.',
  'İçedönük, savunmacı, suçluluk hisseden. Mizah duygusu var ama bastırılmış. Direnç gösterir önce, ısrar edince açılır.',
  'Kısa cümleler, "şey" diye duraksar, "bilmem ki" der sık. Bazı sorulara "bilmiyorum" diye kapanır. Annesi/babası hakkında konuşurken ses tonu sertleşir.',
  'Asıl mesele: babası tarafından duygusal olarak görülmemiş hissetmek. Sınav kaygısı bunun yüzeyi. Terapist soğuk soyut sorular yerine ailesi/duygusal hayatı hakkında soru sorarsa ortaya çıkar.',
  'medium'
);
