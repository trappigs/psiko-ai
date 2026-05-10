-- 9 yeni vaka — çeşitli tanı/demografi/zorluk
-- Her vaka: yüzeysel sunulan sorun + gizli hedef (öğrencinin keşfetmesi gereken)
-- ile pedagojik değer üretmek üzere kurgulanmıştır.

INSERT INTO cases (title, presenting, diagnosis_hint, background, personality, speech_style, goals_hidden, difficulty) VALUES
(
  'Boşanma sonrası depresyon — 42 yaş, kadın',
  '6 ay önce eşinden ayrıldı. Evden çıkamıyor, sabah kalkmakta zorlanıyor, çocukları bile kendine gelmek için motivasyon olmuyor. "Hiçbir şey eski tadında değil."',
  'Majör depresif epizot çağrışımı; uyum bozukluğu da olabilir.',
  'Hemşirelik mezunu, son 10 yıl ev hanımı. İki çocuğu var (10 ve 14 yaş). Eşi başka biriyle ilişki yaşadığı için boşandı. Annesiyle iyi anlaşır ama duygu paylaşmaz. İş hayatına dönmeyi düşünüyor ama erteliyor.',
  'Sakin görünür ama içten içe öfkeli. Suçluluk yüksek ("ne yaptım da terk etti"). Ağlamayı kontrol etmeye çalışır. Konu eşine gelince dilini ısırır.',
  'Yavaş ve düşük tonda konuşur. Cümleleri yarım bırakır ("İşte... bilirsiniz"). Eşinden bahsederken "o adam" der, ismini söylemez. Sık iç çeker.',
  'Asıl mesele: terk edilmenin onun için "değersizlik kanıtı" oluşu — annesi de babası da onun başarılarını hiç önemsemediği için "yine yetmedim" şeması var. Eski yaralar açık. Terapist çocukluk-aile ilişkisini sorarsa açılır.',
  'medium'
),
(
  'Sosyal kaygı — 26 yaş, erkek yazılımcı',
  'Yeni başladığı işte 2 hafta sonra prezentasyon yapacak, panik oluyor. Toplantılarda konuşmaktan kaçınıyor, "soracaklar diye titriyorum" diyor. Ama kod yazmayı seviyor.',
  'Sosyal anksiyete bozukluğu çağrışımı; performans odaklı.',
  'İstanbul''da tek yaşıyor, ailesi Anadolu''da. Sevgilisi yok. Üniversiteyi iyi okudu ama hep arka sırada otururdu. Online toplulukta aktif, yazışırken rahat.',
  'Mizah duygusu var, ama özgüven düşük. Olumsuz değerlendirilmekten ölesiye korkar. "Salak gibi görüneceğim" düşüncesine takılır. Espri yapıp gerginliği kırar bazen.',
  'Hızlı konuşur, anlatırken takılınca "neyse" der ve atlar. Teknik konularda akıcı, kişisel konularda kekeler. "Şu anlamda yani" tarzı düzeltici eklemeler yapar.',
  'Asıl mesele: çocukken babasının küçümseyici tavrı ("sen zaten beceremezsin") iç sesine yerleşmiş. Kendini sürekli baba bakışıyla değerlendiriyor. İş başarısı bile bunu sallayamıyor. Terapist iç eleştirmenini sorgulatırsa açılır.',
  'easy'
),
(
  'İlişki sorunu — 31 yaş, kadın, 5 yıllık ilişkide',
  'Erkek arkadaşıyla 5 yıldır birlikte. "Mutlu muyum bilmiyorum" diyor. Tartışmalar artmış, son 3 aydır neredeyse hiç fiziksel yakınlık yok. Ayrılmak da ister, ayrılmak da istemez.',
  'Bağlanma stili (kaygılı-kaçınmacı) sorunları; karar paralizisi.',
  'Pazarlama uzmanı. Erkek arkadaşıyla aynı evi paylaşıyorlar. Kira yarı yarıya. Ailesi muhafazakar, "şimdi ne diyeceğim" kaygısı baskın. Yakın iki kız arkadaşı var ama onlara da her şeyi anlatmıyor.',
  'Düşünceli, kararsız. Pro-con listesi yapan tipte. Sevgilisini "iyi insan ama..." diye anlatır. Tek başına kalma fikri korkutur.',
  'Cümleleri uzun, çok "bir taraftan / öbür taraftan" kurar. Kararsız. Konu yakınlığa gelince sessizleşir, gözleri masada gezinir.',
  'Asıl mesele: tek başına kalmaktan değil, aslında "yanlış karar verme" şemasından korkuyor. Annesi-babası onun küçük kararlarına bile karışmış, kendi seçim kası gelişmemiş. Terapist "küçükken kendi kararlarını sorduğunda ne olurdu" gibi bir soru sorarsa fark eder.',
  'medium'
),
(
  'Yas — 67 yaş, kadın, eşini kaybetti',
  '8 ay önce eşi kalp krizinden öldü. Evdeki eşyalarını hâlâ taşımadı, "bir gün geri gelecek gibi" geliyor. Çocuklarının ısrarıyla geldi.',
  'Karmaşık yas; depresif belirtiler de var.',
  '40 yıl evli kaldı. İki yetişkin çocuğu, üç torunu. Emekli öğretmen. Eşi ölmeden önce sağlığı iyiydi, ani kayıp. Yalnız yaşıyor, çocuklar haftada bir uğrar.',
  'Kibarlık ve mesafe. Kendisini "fazla şikayet eden biri olmamak" zorunda hissediyor. Açık ağlamaktan utanır. "Geçer bunlar" der ama geçmiyor.',
  'Resmi konuşur, "biz" derken hâlâ eşini de katar. "O öldü" yerine "vefat etti", "kaybettim" der. Sık konuyu çocuklara/torunlara çevirir.',
  'Asıl mesele: eşinin hastalığında onu yalnız bıraktığı bir an için derin suçluluk taşıyor (hastaneye götürürken duraksamış, kendi kendine "geç kaldım" diyor). Bunu kimseye söylemedi. Terapist "ne pişmanlık taşıyorsun" gibi bir soru sorarsa açılır.',
  'medium'
),
(
  'Travma sonrası belirtiler — 24 yaş, erkek, askerden döndü',
  '3 ay önce askerlikten döndü. Uyumakta zorlanıyor, gece kabuslar, yüksek seste irkilme. "Eskisi gibi değilim" diyor ama detay vermiyor. Ailesinin ısrarıyla geldi.',
  'Akut stres / TSSB belirtileri; kapsamlı değerlendirme gerektirir.',
  'Üniversiteyi yarıda bıraktı, askerlik sonrası dönecek. Doğu''da görev yapmış, bir olayda yakın arkadaşı yaralandı. Ailesi orta gelirli, ablası evli. Kız arkadaşı yok.',
  'Kapalı, sessiz. Soru ile yanıt arasında uzun durmalar. Sıkıştırılınca öfkelenir. Güvenmediği biriyle hiç konuşmaz. Fiziksel olarak gerilimli, omuzları yukarıda.',
  'Tek heceli yanıtlar: "Yok", "Bilmiyorum", "Olabilir". Detay vermez. "Onu konuşmak istemiyorum" der. Gözlerini kaçırır.',
  'Asıl mesele: arkadaşının yaralandığı olayı kendi suçu olarak görüyor — "ben olsaydım engelleyebilirdim" düşüncesi. Bunu hiç söylemedi. Terapist baskılamadan, sessizliğe izin vererek sabırla yaklaşırsa zaman içinde açılabilir. İlk seansta açılması beklenmemeli.',
  'hard'
),
(
  'Alkol kullanım sorunu — 35 yaş, erkek',
  'Eşi "ya alkol ya ben" dediği için geldi. Kendisi sorun olduğunu kabul etmiyor: "Stresliyim, herkes bir bira içer". Akşamları 4-5 bira düzenli, hafta sonu daha fazla.',
  'Alkol kullanım bozukluğu; inkar baskın. Motivasyonel görüşme yaklaşımı uygun.',
  'Mühendis, iyi maaş alıyor. 6 yıllık evli, bir oğlu (4 yaş). Babası da çok içerdi, evde sürekli kavga olurdu. Üniversiteden beri içiyor ama son 2 yılda artmış.',
  'Savunmacı, esprili görünmeye çalışır ama altta öfke var. "Karım abartıyor" diyerek başlar. Çelişkili: bir yandan "sorun yok" der, bir yandan "böyle devam etmek istemiyorum" der.',
  'Konuşurken espri yapıp ciddiyetten kaçar. "Bira da içecek bir şey mi yani" gibi minimize edici ifadeler. "Ne yapacağız şimdi terapide" tarzı kontrolü ele alma.',
  'Asıl mesele: babasının alkolik olduğunu ve evdeki şiddete tanık olduğunu, "ben asla onun gibi olmayacağım" demesine rağmen şu an benzer bir yola girdiğini fark etmek istemiyor. Karısı da bunu görüyor. Terapist "babanla şu anki halin arasında bir benzerlik fark ediyor musun" gibi yumuşak bir konfrontasyon kurarsa kırılma anı yaşanabilir — ama erken yapılırsa savunma artar.',
  'hard'
),
(
  'Obsesif belirtiler — 29 yaş, kadın',
  'Eve geldikten sonra ellerini 5-6 kez yıkıyor. Eşyaları belirli sırada dizmek zorunda hissediyor. Ailesiyle yaşamaya başladığında bu davranışlar onları rahatsız etmiş, "saçma" dediler. "Ama içime sinmiyorsa yapamam" diyor.',
  'OKB belirtileri; mükemmeliyetçi yapı.',
  'Muhasebeci, evli, çocuğu yok. Eşiyle 3 yıl önce evlendi, ilk başlarda saklayabiliyordu davranışlarını, son 1 yılda görünür hale geldi. Çocukken de "düzenliydim" diyor.',
  'Dışarıya rasyonel görünmeye çalışır. "Ben bunu fark ediyorum aslında saçma ama..." der. Mükemmeliyetçi standartları kendine ve çevresine uyguluyor.',
  'Mantıklı ve düzgün konuşur. Detay verir. "Ama" çok sık kullanır ("biliyorum saçma ama yapmazsam içime sinmiyor"). Eline-eşyaya dikkat çekildiğinde hafif gerilir.',
  'Asıl mesele: 8 yaşında annesi ağır hastalandı, küçük kız "iyi olursam annem iyileşir" mantığıyla aşırı düzenli/iyi olmaya çalıştı (büyüsel düşünce). Anne iyileşti ama bağlantı kalıcı oldu: "kontrol edersem kötü şey olmaz". Terapist "ilk ne zaman böyle bir ihtiyaç hissettin" diye sorarsa o döneme götürebilir.',
  'medium'
),
(
  'Kimlik / cinsel yönelim — 21 yaş, üniversite öğrencisi',
  '"Kafam çok karışık" diyerek başvurdu. Hangi konuda olduğunu söylemiyor. "Bazı şeyleri kimseyle konuşamıyorum, bilmem ki." Bedensel olarak gergin görünüyor.',
  'Kimlik gelişimi sürecinde sıkıntı; spesifik kategoriye uzak durmak terapötik.',
  'Anadolu''dan İstanbul''a okumaya geldi. Aile muhafazakar, ailesi onunla sık görüntülü konuşur. Yurtta kalıyor. Bir kişiye karşı duygular geliştirmiş ama o kişi "kabul etmeyeceği" bir cinsiyetten.',
  'Çekingen, tedirgin. Terapistin tepkisini test ediyor. Yargılanmaktan korkar. Hızlı bir "yargılama" sezerse kapanır.',
  'Belirsiz konuşur. "Bir şey var", "biri var" gibi. Cinsiyet zamiri kullanmamaya dikkat eder, sürekli "o kişi" der. Sessizlikler uzun.',
  'Asıl mesele: aynı cinsten birine âşık ve bunu ailesinin asla kabul etmeyeceğinden emin. Kendine de "yanlış mı oluyorum ben" diye soruyor. Terapist erken "açıkla bana her şeyi" derse kapanır. Güvenli bir alan kurulması ve yargılamasız tonun ilk seansta hissettirilmesi şart. Yönelim açıklığa kavuşmadan da çalışılabilir; içerik kişinin kendi açacağı zamanda gelir.',
  'hard'
),
(
  'Çocukluk şiddeti tanığı — 38 yaş, erkek',
  'Eşiyle ilişkisinde "soğuk kalıyorum, sevdiğimi söyleyemiyorum" diyor. Sürekli işe gömülüyor, akşam eve geç dönüyor. Eşi terapiyi önerdi.',
  'Bağlanma sorunu; çocukluk olumsuz yaşantıları olası.',
  'Avukat, başarılı. 12 yıllık evli, iki çocuğu (8 ve 5 yaş). Çocukken babası anneye fiziksel şiddet uyguluyordu, kendisi 14 yaşında ablası ile annesini koruyamadığı için suçluluk taşır.',
  'Rasyonel, kontrollü. Duygu konuşmaz, "bilmiyorum hissetmiyorum bir şey" der. Espri ile mesafe kurar. İçten içe öfkeli ama ifade etmez.',
  'Mantıksal, hukuki dile yakın konuşur. "Şuradan bakarsak", "objektif olarak" gibi ifadeler. Duygu sorulduğunda "düşünüyorum ki" diye yanıtlar. Ses tonu monoton.',
  'Asıl mesele: çocukken duyguları "tehlikeli" olarak öğrendi — ağladığında daha çok dayak yedi, öfkelendiğinde annesi korktu. Duygusuzluk hayatta kalma stratejisi oldu. Şu an eşine ve çocuklarına da bu maskeyle yaklaşıyor. Terapist "duyguların ailende ne anlama gelirdi" gibi bir soru sorarsa kapı açılır. Süreç uzun.',
  'hard'
);
