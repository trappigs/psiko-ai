# Aydınlatma Metni (Taslak — Proje Sahibi Tamamlayacak)

> Bu metin bir taslaktır. Yayına almadan önce proje sahibi tarafından doldurulmalı, hukuki danışmanlıkla nihai hâle getirilmelidir.

## 1. Veri Sorumlusu

[Veri sorumlusunun unvanı/ismi, adresi, iletişim bilgileri buraya]

## 2. Toplanan Veriler

- **Hesap verileri:** e-posta adresi, şifre (hashed), display_name
- **Kullanım verileri:** seans transkriptleri (öğrencinin yazdığı mesajlar ve AI yanıtları), seans süreleri, mesaj sayısı, günlük token kullanımı
- **Değerlendirme raporları:** Oturum sonunda AI tarafından üretilen değerlendirme metni
- **Teknik veriler:** IP adresi (Supabase/Vercel logları), tarayıcı bilgisi (Sentry hata izleme)

## 3. İşleme Amaçları

- Hizmetin sağlanması (kayıt, oturum açma, vaka pratiği yapabilme)
- Kullanım limitlerinin uygulanması (kötüye kullanım önleme)
- Hizmet kalitesinin iyileştirilmesi (anonim metrikler)
- Hata ayıklama ve güvenlik

## 4. Üçüncü Taraflarla Paylaşım

- **Supabase (ABD/AB):** Veritabanı ve kimlik doğrulama altyapısı
- **OpenAI (ABD):** AI danışan ve değerlendirici yanıtlarının üretilmesi için seans içerikleri OpenAI sunucularına iletilir
- **Vercel (ABD):** Uygulama hosting'i
- **Sentry (ABD):** Hata izleme (mesaj içeriği yollanmaz)

## 5. Saklama Süresi

- Hesap aktif olduğu süre boyunca + hesap silindikten sonra 30 gün backup'larda
- Hesap silme talebi anlık işlenir; tüm seans/mesaj/rapor verileri silinir

## 6. KVKK 11. Madde Hakları

Verisi işlenen kişiler aşağıdaki haklara sahiptir:

- İşlenip işlenmediğini öğrenme
- İşlenmişse bilgi talep etme
- İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme
- Yurt içi/yurt dışı aktarılan üçüncü kişileri bilme
- Eksik/yanlış işlenmişse düzeltme talep etme
- Silme veya yok etme talep etme
- Otomatik sistemlerle yapılan analize itiraz etme
- Kanuna aykırı işleme nedeniyle zarara uğranması halinde tazminat talep etme

## 7. Başvuru ve İletişim

Yukarıdaki haklarınızı kullanmak için: [iletişim e-posta adresi]

## 8. Önemli Sorumluluk Reddi

Bu uygulama yalnızca eğitim amaçlıdır. AI danışan gerçek bir kişi değildir. Üretilen değerlendirmeler gerçek profesyonel süpervizyonun yerini tutmaz, klinik karar ve müdahale aracı olarak kullanılamaz.
