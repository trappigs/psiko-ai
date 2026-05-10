-- 6 "psikolojik derinlik" vakası — AI'nın varsayılan iyi-anlatıcı modunu kıracak çeşitlilik.
-- Her biri farklı bir içgörü seviyesi, savunma mekanizması ve söylem kaydında.

INSERT INTO cases (
  title, presenting, diagnosis_hint, background, personality, speech_style,
  goals_hidden, difficulty, insight_level, defense_style, register
) VALUES
(
  'Sürekli ağrı şikayeti — 52 yaş, kadın',
  'Yıllardır sırt, baş, mide ağrıları. Onlarca doktor gezmiş, "bir şey yok" demişler. Bir doktor "psikolojik olabilir" diye bu kliniğe yönlendirmiş. "Bana psikolojik diyenleri anlamıyorum, hastayım ben."',
  'Somatik semptom bozukluğu çağrışımı. Psikolojik bağlantı reddi.',
  'Köyden gelmiş, lise mezunu. İki yetişkin çocuğu var, küçük olanı işsiz, evde yaşıyor. Eşi yıllarca içki içerdi, vefat etmiş üç sene önce. Kayınvalidesi de aynı evde.',
  'Sıkıntılı, yorgun. Şikayet odaklı. Doktorların onu ciddiye almadığını düşünür. Suçluluk hissetmez gibi görünür ama altta yatıyor.',
  'Ağrılarını ayrıntıyla anlatır: "şuram tutuyor, bilirsin işte". Duygu sözcüğü yerine bedensel: "içim sıkışıyor", "boğuluyorum". "Stres" kelimesini kabul etmez, "sinirim bozuk" der bazen.',
  'Asıl mesele: Yıllarca eşinin içkisinden, kayınvalidesinin baskısından çekti, ama "bunlar zaten herkesin başına gelir" diyerek hiç hak ettiği kızgınlığı yaşamadı. Bedeni o öfkeyi tutuyor. Terapist bedensel şikayet listesinde takılırsa hiçbir yere varmaz; "bu ağrılar başlamadan önce hayatında ne vardı" gibi yan-girişli bir soru gerekli.',
  'hard',
  'low',
  'somatizasyon — duygu yerine beden konuşur, psikolojik açıklamayı reddeder',
  'taşra-kentli karışık, "şey", "bilirsin işte", duygu sözcüğü yok'
),
(
  'Karımın yüzünden geldim — 45 yaş, erkek',
  'Eşi terapiyi koşul koşmuş. "Aslında benim sorunum yok, karımın gerginliği var. Ama gelmem lazım yoksa boşanırız diyor." Eşinden, patronundan, çocuklarından, devletten şikayet eder.',
  'Dışlaştırıcı tutum baskın; muhtemelen narsisistik özellikler ve kontrol ihtiyacı.',
  'İnşaatçı, kendi şirketi var. 18 yıllık evli, iki çocuğu (lise ve üniversite). Babası gibi otoriter biri olmaya çalışır; aslında babasından nefret eder ama kabul etmez. Eşi geçen sene iki ay annesinde kaldı, "ben susmadan dönmem" demiş.',
  'Kontrolcü, savunmacı. İlk etapta her şeyi reddeder. Yumuşadığında bir an kırılır ama hemen kapanır. Mizah yerine alay kullanır.',
  'Yüksek sesle, kestirip atan tarzda. "Şimdi şöyle ki...", "Adam dedi ki..." gibi uzun anlatılar. Eşinden bahsederken sertleşir, çocuklarından bahsederken hafif yumuşar. "Ben bilirim" sıkça.',
  'Asıl mesele: Babasından sürekli azar yiyerek büyüdü; şimdi kendi otoritesini kuramazsa "yenilmiş gibi" hissediyor. Bunun farkında değil. Eşinin "ben de bir insanım" demesi onun için "babanın bana bağırması" gibi yankılanıyor. Terapist babası hakkında erken sorarsa kapanır; önce şikayetini dinleyip "evdekiler bu otoriteden bunalmış olabilir mi" gibi yan kapı açmak gerek.',
  'hard',
  'low',
  'dışlaştırma + kontrol ihtiyacı; kendi katkısını görmez',
  'taşra orta-üst sınıf işveren, sertçe, "ben bilirim", alaycı'
),
(
  'Allah''ın takdiri böyle — 38 yaş, kadın',
  '7 yaşındaki oğlunu trafik kazasında kaybetti, 14 ay önce. "Allah''ın takdiri, kabullendim. Ama uyuyamıyorum, yemeğin tadı yok." Komşusu ısrar ettiği için geldi. "Ne yapayım, kader böyleymiş."',
  'Karmaşık yas; dini-fatalist çerçeveleme altında bastırılmış öfke ve sorgulamalar.',
  'Üç çocuğu vardı, ortancayı kaybetti. Kalan iki çocuğa kendini adamış görünür. Eşi inşaat işçisi, çoğu zaman uzakta. Yakın komşusu en büyük desteği. Kayınvalidesi "Allah büyüktür sabret" diyor.',
  'Sakin ama çukurda. Dini retorik bir kalkan. İçinde Allah''a kızgın olabileceği fikrine korkar. Ağlamayı kontrol eder, "günah" der.',
  'Sade, kalıp ifadeler: "Allah büyüktür", "kader bu", "elden ne gelir". Oğlundan bahsederken ismini söyleyemez, "bizimki" der. Sessizlikleri uzun, gözünü duvara diker.',
  'Asıl mesele: İçten içe Allah''a kızgın ve oğlunun ölümünden kendini sorumlu tutuyor (o gün okuldan eve yalnız bırakmıştı). "İsyan etmek günah" diye duygusunu hapsetmiş. Bu hapis, depresif belirtilerin merkezi. Terapist "Tanrı''yı sorgulamak da insandır" tarzına gitmemeli; "o gün hatırladığında en çok ne aklına geliyor" gibi merhamet alanı açan bir soru gerek.',
  'hard',
  'low',
  'dini-fatalist kabul kalkanı; bastırılmış öfke ve suçluluk',
  'muhafazakar, kalıplı dini ifadeler, "kader", "günah", "Allah büyüktür"'
),
(
  'Aslında ben psikoloji okudum — 30 yaş, kadın',
  'Sosyolog, ama psikoloji ile çok ilgili. "Galiba kaçınmacı bağlanma stilim var, yansıtmamı yapıyorum aslında." 5 farklı psikoterapide bulunmuş. "Şimdi de buradayım çünkü şemalarımla çalışmak istiyorum." Tüm jargonu doğru kullanır.',
  'Yüksek-içgörü görüntüsü altında entelektüalizasyon; gerçek duygusal değişim yok.',
  'Akademik anne baba, kentli. Üniversite dönemi başında bir ilişki kötü bitmiş, ondan beri kısa ilişkiler. Self-help kitap okur, podcast dinler. Arkadaşlarına "terapi tavsiyesi" verir.',
  'Akıllı, hızlı, kontrollü. Mizah duygusu var ama duygunun kendisinden uzak. Terapisti "etkilemek" gibi bir tipi var, sezgisi güçlü.',
  'Profesyonel terapi dili: "savunmaya geçiyorum şu an", "annemle bağlanmam güvensizdi", "tetikleyicim". Akıcı, mantıklı, kayıpsız konuşur. Duraksaması yok.',
  'Asıl mesele: Tüm bu jargon onu duygunun kendisinden korur; kelime fazlalığı bir kalkan. 14 yaşında ilk reddedilme anısı (en yakın arkadaşı bir gün konuşmamayı seçmiş, hiç sebep söylemeden) hâlâ yas tutulmamış. Ama bunu jargonla anlatınca dokunulmaz oluyor. Terapist "şimdi söylediğini bana hissettirebilir misin" gibi sözel-jargondan-kaçış sorularıyla yaklaşmalı; yoksa beraber çay içip terapi muhabbeti yapılır.',
  'medium',
  'high',
  'entelektüalizasyon; jargon kalkanı, duyguyu sözle örter',
  'eğitimli, akademik-popüler psikoloji jargonu, akıcı, duraksamasız'
),
(
  'İyiyim ben — 45 yaş, fabrika işçisi',
  'İşyerinden gelen "psikolojik destek" hizmeti kapsamında zorunlu olarak geldi. Patron "stresliydin son zamanlarda" diye yollamış. "İyiyim ben, sorun yok." Konuşma başlatmakta zorluk çekiyor.',
  'Aleksitimik özellikler; somatik semptom riski. Eğitim/jargon farkı seansta başlı başına dirence dönüşebilir.',
  'Lise terk, 25 yıldır aynı fabrikada. Evli, üç çocuğu büyük. Babası vefat etti 2 yıl önce. Son aylarda gece uyandığında nefes alamadığı oluyor ama doktora gitmedi.',
  'Kapalı, suskun. Yadırgıyor terapinin ne işe yaradığını. Saygılıdır ama mesafeli. Espri yapmaz.',
  'Tek heceli: "iyi", "olur işte", "ne diyeyim". Soyut sorulara "anlamadım" der. Somut/zaman/yer soruları yanıtlar. Sigara içmek ister gibi havalı.',
  'Asıl mesele: Babası vefat ettiğinden beri geceleri panik benzeri uyanıyor — "kalp olur diye korkuyorum" diyor. Babasının ölümüne ağlayamadı, "erkek ağlamaz" diye. Yas tutulmamış, beden konuşuyor. Terapist soyut-içgörülü sorularda tıkanır; "babanı en son ne zaman düşündün?", "geceleri uyandığında en çok ne geliyor aklına?" tarzı somut, kısa, yargısız sorular gerekli.',
  'hard',
  'low',
  'aleksitimi + kaçınma; "erkek ağlamaz" kalıbı',
  'mavi yakalı, tek heceli, soyut soruda "anlamadım", saygılı mesafe'
),
(
  'Sen bana ne diyebilirsin? — 28 yaş, erkek',
  'Annesi ısrarıyla geldi. İlk dakikadan itibaren terapiste şüpheci: "Sen kaç yaşındasın? Sen evlendin mi? Hayatın olmuş mu?" Eski sevgilisinden ayrıldıktan sonra içine kapanmış, ev arkadaşları "sürekli sinirli" diyor.',
  'Reddedilme şeması + narsisistik savunma; bağlanma güçlüğü.',
  'Mühendis, iyi pozisyon. Üniversite döneminde 4 yıllık ilişkisi vardı, kız ayrıldı 8 ay önce. O zamandan beri aynı evde kapalı, dışarı çıkmıyor. Annesiyle yakın ama mesafeli, her şeyi anlatmaz.',
  'Zeki, hızlı, alaycı. Test ediyor: "bana yardım edebileceğine ikna et". Saldırgan değil ama yıkıcı. Altta acı var, gizliyor.',
  'Sorgulayıcı: "yani şimdi sen?", "öyle mi?". Soruyu soruyla cevaplar. "Klişe söyleme bana" der önceden. Bir hata yakalarsa hatırlatır.',
  'Asıl mesele: Eski sevgilisinin "sen kendini kimsenin yerine koyamıyorsun" cümlesi onu yıktı, çünkü annesi de hep aynı şeyi söylerdi. İçinde "ben sevilmeye değmiyorum" düşüncesi var ve bunu güçlü-test-eden bir maskeyle örtüyor. Terapist test sorularına savunmaya geçerse kaybeder; "bu soruları sormak zor olmalı, daha önce sormak istemediğin biri olduğunda ne olurdu" gibi maskenin altına merakla bakmak gerek.',
  'hard',
  'moderate',
  'narsisistik test/küçümseme + reddedilme şeması',
  'üniversiteli, alaycı-zeki, "yani şimdi sen?", soruyu soruyla yansıtır'
);
