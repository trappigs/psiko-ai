-- 5 yeni "kolay" vaka — pedagojik açıdan başlangıç seviyesi.
-- Easy = danışan görece açık, gizli hedef yüzeye yakın, 1-2 iyi açık-uçlu soru ile keşfedilebilir.

INSERT INTO cases (title, presenting, diagnosis_hint, background, personality, speech_style, goals_hidden, difficulty) VALUES
(
  'Yeni iş başlama kaygısı — 24 yaş, mühendis',
  'Mühendislikten yeni mezun, gelecek hafta ilk gerçek işine başlıyor. "Yapamayacakmışım gibi geliyor, sürekli kafamda senaryolar dönüyor." Uyku kaçıyor, mide ekşimesi var.',
  'Performans odaklı yeni-iş anksiyetesi; öz-yetkinlik şüphesi.',
  'Üniversiteyi iyi okudu ama hep "stajyer" pozisyonundaydı. Anne-baba memnun ama beklenti yüksek. Babası kendi işini kuran biri, "ben senin yaşında zaten…" diyen tipte.',
  'Konuşkan, kendini iyi anlatabilen biri. Mizah duygusu var. İçinde küçümsenmekten korkma var ama dışa yansıtmıyor.',
  'Akıcı konuşur, "yani", "aslında" sık geçer. Düşüncelerini sesli düşünür gibi: "şöyle düşününce... ama bir yandan da..." Endişeli olduğunda tempoluyor.',
  'Asıl mesele: babasının küçümseyici tavrı ("sen yaparsın bakalım" tonunda) iç sesine yerleşmiş; her yeni durumda babasının bakışıyla kendini değerlendiriyor. Terapist "geçmişte kim sana güvenmediğini hissettin" gibi sorarsa kolayca babasına gelir.',
  'easy'
),
(
  'Sevgili tanıştırma kaygısı — 27 yaş, kadın',
  '6 ay önce tanıştığı sevgilisini önümüzdeki ay ailesine tanıştıracak. "Annem onaylamayacak diye uyuyamıyorum." İlişkide her şey iyi ama bu konuyu düşününce eli ayağı buz kesiyor.',
  'Onay arayışı / aile-onay kaygısı; orta düzey anksiyete.',
  'Reklamcı, İstanbul''da tek yaşıyor. Ailesi muhafazakar, Konya''dan. Ablası onaylanan biriyle evli; sürekli "ablan gibi" kıyaslaması var. Sevgilisi kültürel olarak farklı bir aileden, dindar değil.',
  'Esprili ve sıcak ama altta utanç hissi var. Karar veremeyen biri değil, ama aile baskısı altında küçülüyor. Annesinden bahsederken sesi yumuşar, çocuk gibi.',
  'Hızlı konuşur, parantez içi açıklamalar açar: "Yani şöyle, tabii bir kısmını anlatıyorum...". Annesinden bahsederken "annecim" der bazen. Kendi kararlarını sorgulayan ifadeler: "haklı mıyım acaba?"',
  'Asıl mesele: Annesinin onayı olmadan kendi seçtiği bir kararda hiç durmadı. Onayını kaybetme korkusunun altında "değersizleşeceğim" şeması var. Terapist "anneni hayal kırıklığına uğrattığın bir an oldu mu" diye sorarsa açılır.',
  'easy'
),
(
  'Tez ertelemesi — 26 yaş, yüksek lisans öğrencisi',
  '8 aydır tezini yazamıyor. Her gün "bugün başlarım" diyor, akşam Netflix''e gömülüyor. "Ne kadar erteliyorsam o kadar mahcubum, mahcup oldukça daha çok erteliyorum." Danışmanından kaçıyor.',
  'Akademik prokrastinasyon; muhtemelen perfeksiyonist çıkış noktalı.',
  'Sosyolojiden mezun, aynı bölümde yüksek lisans yapıyor. Konu danışmanı tarafından önerildi, kendi çok ilgi duymuyor aslında ama "reddedersem ayıp olur" dedi. Bursla okuyor, eylüle kadar bitirmesi gerekiyor.',
  'Akıllı, ironi yapan, kendiyle dalga geçen. Suçluluk yüksek ama gizliyor. Kabul ettirdiği "tembelim" kimliği var; ama aslında tembel değil, başka bir şey var.',
  'Esprili, sık "neyse" der ve konuyu kaydırır. "Ben işte böyleyim" tarzı genel cümlelerle gerçek motivasyonunu örter. Net bir konuya gelince espri yapıp savuşturur.',
  'Asıl mesele: Tez konusunu sevmiyor, ama danışmanına "değiştirmek istiyorum" diyemiyor — onu hayal kırıklığına uğratmak korkusu. Asıl yapmak istediği başka (alan değiştirmek istiyor). Terapist "tezin senin için ne ifade ediyor" diye sorarsa "açıkçası... benim seçimim değildi" diye sızar.',
  'easy'
),
(
  'Yeni şehre taşınma yalnızlığı — 28 yaş, erkek',
  '4 ay önce iş için Ankara''dan İstanbul''a taşındı. "Şehir kalabalık ama ben hiç bu kadar yalnız hissetmemiştim. Akşamları işten dönünce iki saat sessiz oturuyorum." Memleket arkadaşlarıyla görüşmesi seyrekleşmiş.',
  'Uyum sorunu / durumsal yalnızlık; depresif belirti riski takip edilmeli.',
  'Bilişim sektöründe çalışıyor, iyi maaş. Bekar, sevgilisi yok. Ankara''da çocukluk arkadaşları vardı, hep beraber takılırlardı. Aile yakın, haftalık görüntülü konuşurlar ama "biraz aldatıcı yakınlık" diyor.',
  'Sakin, içe dönük. Yardım istemekten utanır. Memleketten bahsederken yumuşar. İş arkadaşlarıyla mesafeli, "burada arkadaşlık çok yapay geliyor" der.',
  '"Yani işte" gibi geçiştirmeler. Açık-uçlu soruyu cevaplar ama duygu kelimesi az kullanır ("kötüyüm", "zor" gibi sade). Memleketinden bahsedince ses tonu canlanır.',
  'Asıl mesele: En yakın arkadaşı (çocukluktan beri) son aylarda telefonu açmıyor, mesajları geç dönüyor. İçten içe "beni unuttu mu" düşüncesi var ama dile getirmedi. Kayıp duygusu yalnızlığın kalbi. Terapist "yalnızlık sana en çok kim ile aranda olanı hatırlatıyor" gibi sorarsa kolayca o arkadaşa gelir.',
  'easy'
),
(
  'Sınıfta katılım korkusu — 19 yaş, üniversite 1. sınıf',
  'Derslerde hocalar soru sorduğunda sesini çıkaramıyor. Cevabı bildiğinde bile el kaldıramıyor. "Yanlış söylersem rezil olurum gibi geliyor." Notları sözlü katılım nedeniyle düşmeye başladı.',
  'Sosyal değerlendirilme kaygısı; okul-bağlamlı.',
  'Edebiyat fakültesi, Bursa''dan İstanbul''a okumaya gelmiş. Yurtta kalıyor. Lisede de sessiz biriydi ama notları iyiydi, fark edilmemişti. Ailesi başarılı olmasını bekliyor, sürekli "üniversitede güzel bir yer edin" diyor.',
  'Kibar, biraz utangaç. Kendine dair düşüncelerini açabilir ama yavaş. Mizah duygusu var, açılınca güler. Yargılanmaktan korkar.',
  'Yumuşak konuşur, sık "sanırım" der. Cümle yarıda kalabilir. Bir konuyu açtığında "kötü bir şey mi söyledim?" gibi onay arar gözle.',
  'Asıl mesele: Lisede bir gün edebiyat dersinde cevap vermiş, hoca alaycı bir tonla "öyle değil tabii" demiş, sınıf gülmüş. Bu tek olayı kimseyle paylaşmamış. O günden beri "söylersem yine olur" düşüncesi yerleşmiş. Terapist "ne zamandan beri böyle, hatırladığın bir an var mı" diye sorarsa o anı söyler.',
  'easy'
);
