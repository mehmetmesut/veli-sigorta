# Poliçe Modülü — Veri Spesifikasyonu

> Kaynak: Kullanıcının 2026-08-14 tarihli tanımı. Poliçe takip modülü geliştirilirken
> bu belge esas alınacaktır. Alan başlıkları **CMS formunda görünecek Türkçe metinlerdir**;
> teknik alan adları geliştirme sırasında türetilecektir.

---

## BÖLÜM 1 — Mimari Model

### Varlık hiyerarşisi

```
TARAF / PARTY
├── GERÇEK KİŞİ
└── KURUM / TÜZEL KİŞİ
       └── N adet Yetkili / Temsilci

        ↓

MÜŞTERİ HESABI
        ↓
        ├───────────── POLİÇELER ─────────────┐
        │                                      │
        │                              POLİÇE TARAF ROLLERİ
        │                              ├ Sigorta Ettiren
        │                              ├ Sigortalı
        │                              ├ Lehtar
        │                              ├ Prim Ödeyen
        │                              ├ Malik
        │                              ├ İşleten
        │                              ├ Dain-i Mürtehin
        │                              └ Diğer
        │
        └── VARLIKLAR / RİSKLER
             ├ Araç
             ├ Taşınmaz
             ├ Sigortalı kişi
             ├ İşyeri / Lokasyon
             ├ Makine / Ekipman
             ├ İnşaat / Proje
             ├ Sevkiyat / Emtia
             ├ Tekne / Yat
             ├ Hava aracı
             ├ Tarımsal varlık
             ├ Hayvan
             ├ Evcil hayvan
             ├ Siber risk profili
             └ Sorumluluk riski
```

### Poliçenin alt bileşenleri

```
POLİÇE
├── Teminatlar
├── Prim / Tahsilat / Taksitler
├── Komisyon
├── Belgeler
├── Zeyiller
├── Versiyonlar
├── Yenileme
├── Hasarlar
├── Görevler / Hatırlatmalar
└── Poliçe tarihindeki Risk Snapshot'ı
```

### EN KRİTİK DÖRT KURAL

**1. Müşteri ≠ Sigortalı.**
Bir şirket, çalışanı için sağlık sigortası yaptırabilir. Şirket müşteridir/sigorta
ettirendir; çalışan sigortalıdır.

**2. Müşteri ≠ Varlık.**
Araç, ev veya makine müşteri tablosunun içine gömülmemelidir.

**3. Poliçe ≠ Varlık.**
Aynı araç aynı anda trafik + kasko + İMM poliçesine bağlanabilir.

**4. Güncel kayıt ≠ geçmiş poliçe bilgisi.**
Araç bugün plaka değiştirdiyse, iki yıl önceki poliçe açıldığında **eski plaka**
görünmelidir.

### Diğer yapısal ilkeler

- Müşteri hesabı bir "dosya / portföy" görevi görür.
- Müşteri gerçek kişi veya şirket olabilir.
- Bir şirketin **sınırsız sayıda** yetkilisi olabilir.
- Bir müşterinin **sınırsız sayıda** poliçesi olabilir.
- Poliçenin sigorta ettireni ile sigortalısı **farklı** olabilir.
- Bir poliçenin **birden fazla sigortalısı** olabilir.
- Bir poliçenin **birden fazla varlığı** olabilir.
- **Aynı varlık birden fazla poliçeye** bağlanabilir.
- **Yenileme = yeni poliçe.**
- **Zeyil = yeni poliçe versiyonu.**
- Güncel müşteri/varlık bilgileri ile eski poliçedeki bilgiler **birbirinden bağımsız** tutulur.
- Şirket/ürün özelindeki değişken sorular **dinamik form motoruyla** yönetilir.

### Biçim kuralları (doğrulama için)

| Alan | Kural |
|---|---|
| TCKN | 11 haneli, bitişik |
| VKN | 10 haneli, bitişik |
| Adı / Yetkili Adı | Sadece ilk harfler büyük — örn. `Mehmet Mesut` |
| Soyadı / Yetkili Soyadı | Tamamı büyük — örn. `YILMAZ` |
| Tarihler | `DD.MM.YYYY` |
| Mobil telefon | `0(5XX) XXX XX XX` |
| SGK Sicil No | `X.XXXX.XX.XX.XXXXXXX.XXX.XX.XX.XXX` |
| Tutarlar | Örn. `15.000,00 TL` |
| Oranlar | Örn. `%15` |

---

## BÖLÜM 2 — CMS Alan Listeleri

### 1. Bireysel Müşteri Bilgileri

Müşteri No · T.C. Kimlik No · Yabancı Kimlik No · Adı · İkinci Adı · Soyadı ·
Doğum Tarihi · Cinsiyeti · Uyruğu · Doğum Yeri · Mesleği · Çalışma Durumu ·
Medeni Durumu · Mobil Telefon · Alternatif Telefon · Sabit Telefon · E-Posta ·
İl · İlçe · Mahalle · Açık Adres · Posta Kodu · Tercih Edilen İletişim Kanalı ·
Müşteri Kaynağı · Müşteri Temsilcisi · Notlar

### 2. Kurumsal Müşteri Bilgileri

Müşteri No · Vergi Numarası · Vergi Dairesi · Firma Unvanı · Marka / Tabela Adı ·
MERSİS No · Ticaret Sicil No · Ticaret Sicil Müdürlüğü · Şirket Türü ·
Kuruluş Tarihi · NACE Kodu · Faaliyet Konusu · Sektörü · Çalışan Sayısı ·
Yıllık Ciro · Telefon · E-Posta · Muhasebe E-Postası · KEP Adresi ·
İnternet Sitesi · İl · İlçe · Mahalle · Açık Adres · Müşteri Temsilcisi · Notlar

### 3. Kurumsal Yetkili / Temsilci Bilgileri

> Her kurumsal müşteriye **birden fazla** yetkili eklenebilmelidir.

Adı · Soyadı · T.C. Kimlik No · Görev Unvanı · Departmanı · Yetkili Türü ·
Mobil Telefon · İş Telefonu · E-Posta · Ana Yetkili mi? ·
Poliçe İşlemleri Yetkilisi mi? · Hasar İşlemleri Yetkilisi mi? ·
Tahsilat / Finans Yetkilisi mi? · Temsil Yetkisi Var mı? · Yetki Kapsamı ·
Münferit / Müşterek Yetki · İmza Grubu · Yetki Başlangıç Tarihi ·
Yetki Bitiş Tarihi · İmza Sirküleri · Vekâletname · Yetki Belgesi · Notlar

### 4. Tüm Poliçelerde Ortak Bilgiler

Sigorta Şirketi · Sigorta Türü · Sigorta Alt Türü · Ürün / Paket · Poliçe No ·
Yenileme No · Zeyil No · Sigorta Ettiren · Sigortalı · Poliçe Düzenleme Tarihi ·
Sigorta Başlangıç Tarihi · Sigorta Bitiş Tarihi · Poliçe Durumu ·
Yeni Poliçe / Yenileme · Önceki Poliçe No · Önceki Sigorta Şirketi · Brüt Prim ·
Net Prim · Vergi ve Fonlar · İndirim · Ek Prim / Sürprim · Para Birimi ·
Ödeme Şekli · Taksit Sayısı · Tahsilat Durumu · Komisyon Oranı ·
Komisyon Tutarı · Poliçe PDF · Teklif No · Poliçe Notu · Sorumlu Personel

### 5. Zorunlu Trafik Sigortası

Araç · Plaka · Şasi No · Motor No · Marka · Model · Model Yılı · Araç Tipi ·
Araç Kullanım Şekli · Hususi / Ticari · İşleten · Araç Sahibi · Belge Seri No ·
Ruhsat Belge No · ASBİS Referans No · Tescil Tarihi · İlk Tescil Tarihi ·
Koltuk Sayısı · Yük Kapasitesi · Önceki Trafik Poliçe No · Önceki Sigorta Şirketi ·
Hasarsızlık / Tarife Basamağı · Gecikme Durumu · Tarife Bilgisi

### 6. Kasko Sigortası

Araç · Plaka · Şasi No · Motor No · Marka · Model · Model Yılı · Araç Tipi ·
Kullanım Şekli · Belge Seri No · Ruhsat Bilgileri · Kasko Değeri ·
Değerleme Tarihi · Kasko Türü · Hasarsızlık Kademesi · Önceki Kasko Poliçe No ·
Önceki Sigorta Şirketi · Önceki Hasarlar · Servis Seçeneği ·
Yetkili Servis Kullanımı · Parça Kullanım Şartı · Muafiyet · İkame Araç Var mı? ·
İkame Araç Gün Sayısı · İkame Araç Kullanım Adedi · Mini Onarım · Cam Teminatı ·
Anahtar Kaybı · Aksesuar Bedeli · Ses / Görüntü Sistemi Bedeli ·
Sel / Su Baskını · Deprem · Terör · Yurtdışı Teminatı · Yol Yardım ·
Sürücü Yaş Sınırı · Ehliyet Süresi Şartı

### 7. İhtiyari Mali Mesuliyet Sigortası

Araç · Bağlı Trafik Poliçesi · Bağlı Kasko Poliçesi · Maddi Zarar Limiti ·
Bedeni Zarar Limiti · Kişi Başı Limit · Olay Başı Limit · Toplam Limit ·
Manevi Tazminat Teminatı · Muafiyet · Coğrafi Kapsam

### 8. Yeşil Kart Sigortası

Araç · Plaka · Şasi No · Yeşil Kart No · Geçerli Ülkeler ·
Yurtdışı Başlangıç Tarihi · Yurtdışı Bitiş Tarihi · Kullanım Amacı

### 9. DASK

Taşınmaz · Adres Kodu · İl · İlçe · Mahalle · Açık Adres · Tapu Bilgileri · Ada ·
Parsel · Pafta · Bağımsız Bölüm No · Bina İnşa Yılı · Yapı Tarzı ·
Toplam Kat Sayısı · Bulunduğu Kat · Hasar Durumu · Brüt Yüzölçümü ·
Kullanım Şekli · Malik · Önceki DASK Poliçe No · Sigorta Bedeli

### 10. Konut Sigortası

Taşınmaz · Adres · Adres Kodu · Malik / Kiracı · Kullanım Şekli ·
Sürekli Kullanım / Yazlık · Bina İnşa Yılı · Yapı Tarzı · Kat Sayısı ·
Bulunduğu Kat · Brüt Metrekare · Bina Bedeli · Eşya Bedeli ·
Elektronik Cihaz Bedeli · Kıymetli Eşya Bedeli · Cam Bedeli · Dekorasyon Bedeli ·
Deprem Teminatı · Sel / Su Baskını Teminatı · Dahili Su Teminatı ·
Hırsızlık Teminatı · Cam Kırılması Teminatı · Kira Kaybı Teminatı ·
Alternatif Konaklama Teminatı · Komşuluk Mali Sorumluluk ·
Kiracı Mali Sorumluluk · Alarm · Kamera · Güvenlik · Çelik Kapı · Ev Asistans

### 11. İşyeri / KOBİ Sigortası

İşletme / Şube · Risk Adresi · NACE Kodu · Faaliyet Konusu · İşletme Alanı ·
Bina İnşa Yılı · Yapı Tarzı · Çalışan Sayısı · Yıllık Ciro · Bina Bedeli ·
Demirbaş Bedeli · Makine Bedeli · Elektronik Cihaz Bedeli · Stok / Emtia Bedeli ·
Nakit Bedeli · Kıymetli Eşya Bedeli · Cam Bedeli · Yangın Alarmı · Sprinkler ·
Yangın Söndürücü · Hidrant · Hırsız Alarmı · Kamera · Güvenlik Personeli · Kasa ·
Tehlikeli Madde Bulunuyor mu? · Yangın Teminatı · Deprem Teminatı ·
Sel / Su Baskını · Hırsızlık · Cam Kırılması · Kâr Kaybı · İş Durması ·
Kira Kaybı · Üçüncü Şahıs Sorumluluk · İşveren Sorumluluk · Ürün Sorumluluk ·
Makine Kırılması · Elektronik Cihaz

### 12. Tamamlayıcı Sağlık Sigortası

Sigortalı · T.C. Kimlik No · Doğum Tarihi · Cinsiyet · Meslek · SGK Durumu ·
SGK Uygunluk Kontrol Tarihi · Boy · Kilo · Plan · Anlaşmalı Kurum Ağı ·
Yatarak Tedavi · Ayakta Tedavi · Ayakta Tedavi Kullanım Adedi · Katılım Payı ·
Doğum Teminatı · Geçiş Talebi Var mı? ·
Başka Bir Sigorta Şirketinden Geçiş Yapılıyor mu? · Önceki Sigorta Şirketi ·
Önceki Poliçe No · Önceki Poliçe Başlangıç Tarihi · Önceki Poliçe Bitiş Tarihi ·
Geçiş Talep Tarihi · Geçiş Durumu · Geçiş Referans No ·
Ömür Boyu Yenileme Garantisi Durumu · Ömür Boyu Yenileme Garantisi Kazanım Tarihi ·
Devreden Bekleme Süreleri · Sağlık Beyanı · Mevcut Hastalıklar ·
Geçirilmiş Ameliyatlar · İstisnalar · Ek Prim · Bekleme Süreleri

### 13. Özel Sağlık Sigortası

Sigortalı · Boy · Kilo · Meslek · Plan · Anlaşmalı Kurum Ağı · Yatarak Tedavi ·
Ayakta Tedavi · Yıllık Toplam Limit · Yatarak Tedavi Limiti ·
Ayakta Tedavi Limiti · Ayakta Tedavi Kullanım Adedi · Katılım Payı · Muafiyet ·
Doğum Teminatı · Doğum Bekleme Süresi · Diş Teminatı · Gözlük Teminatı ·
Fizik Tedavi Teminatı · Check-Up Teminatı · Yurtdışı Teminatı ·
Acil Yurtdışı Teminatı · Geçiş Talebi · Önceki Sigorta Şirketi · Önceki Poliçe No ·
Sağlık Beyanı · Mevcut Hastalıklar · Geçirilmiş Ameliyatlar · İstisnalar ·
Ek Prim · Bekleme Süreleri · Ömür Boyu Yenileme Garantisi Durumu ·
Ömür Boyu Yenileme Garantisi Tarihi

### 14. Yabancı Sağlık Sigortası

Sigortalı · Adı · Soyadı · Doğum Tarihi · Cinsiyet · Uyruk · Yabancı Kimlik No ·
İkamet İzni Var mı? · İkamet İzin No · İkamet İzni Başlangıç Tarihi ·
İkamet İzni Bitiş Tarihi · Pasaport No · Pasaportu Düzenleyen Ülke ·
Pasaport Düzenleme Tarihi · Pasaport Geçerlilik Tarihi ·
Talep Edilen İkamet Başlangıç Tarihi · Talep Edilen İkamet Bitiş Tarihi · Plan ·
Yatarak Tedavi · Ayakta Tedavi · Katılım Payı

### 15. Seyahat Sağlık Sigortası

Sigortalı · Pasaport No · Uyruk · Çıkış Ülkesi · Gidilecek Ülke / Ülkeler ·
Seyahat Bölgesi · Seyahat Başlangıç Tarihi · Seyahat Bitiş Tarihi ·
Seyahat Süresi · Seyahat Amacı · Vize Başvurusu Var mı? · Vize Ülkesi ·
Sağlık Teminat Limiti · Acil Tedavi Limiti · Tıbbi Nakil · Ülkeye Geri Dönüş ·
Cenaze Nakli · Bagaj Teminatı · Bagaj Gecikmesi · Uçuş Gecikmesi ·
Seyahat İptali · Kişisel Sorumluluk · Kış Sporları Teminatı · Spor Teminatı

### 16. Grup Sağlık Sigortası

Kurum · Ana Poliçe No · Çalışan Sicil No · Sigortalı · Çalışan / Eş / Çocuk ·
Ana Çalışan · Yakınlık Derecesi · Plan · Anlaşmalı Kurum Ağı ·
Sigortalı Başlangıç Tarihi · Sigortalı Bitiş Tarihi · Gruba Eklenme Tarihi ·
Gruptan Çıkış Tarihi · Ekleme Zeyil No · Çıkış Zeyil No

### 17. Hayat Sigortası

Sigortalı · Meslek · Sigara Kullanımı · Tehlikeli Spor / Faaliyet ·
Sağlık Beyanı · Ölüm Teminatı · Süre · Lehtar · Lehtar Payı · İstisnalar

### 18. Kredi Bağlantılı Hayat Sigortası

Sigortalı · Banka / Kredi Kuruluşu · Kredi No · Kredi Türü · Kredi Tutarı ·
Güncel Kredi Bakiyesi · Kredi Başlangıç Tarihi · Kredi Bitiş Tarihi ·
Kredi Vadesi · Teminat Tutarı · Sabit / Azalan Teminat · Lehtar · Dain-i Mürtehin

### 19. Ferdi Kaza Sigortası

Sigortalı · Meslek · Meslek Risk Sınıfı · Tehlikeli Faaliyetler · Ölüm Teminatı ·
Sürekli Sakatlık Teminatı · Geçici İş Göremezlik Teminatı · Tedavi Giderleri ·
Hastane Günlük Tazminatı · Coğrafi Kapsam · Lehtar

### 20. İşveren Mali Sorumluluk Sigortası

İşveren · SGK İşyeri No · Risk Adresi · Faaliyet Konusu · NACE Kodu ·
Toplam Çalışan Sayısı · Meslek Gruplarına Göre Çalışan Sayısı ·
Yıllık Brüt Bordro · Alt İşveren Sayısı · Alt İşveren Çalışan Sayısı ·
Alt İşveren Bordro Tutarı · Yabancı Çalışan Sayısı · Yurtdışında Çalışan Sayısı ·
Geçmiş İş Kazaları · Ölümcül İş Kazaları · Kişi Başı Limit · Olay Başı Limit ·
Yıllık Toplam Limit

### 21. Üçüncü Şahıs Mali Sorumluluk Sigortası

Sigortalı Faaliyet · Risk Adresi · Yıllık Ciro · Çalışan Sayısı ·
Ziyaretçi / Müşteri Yoğunluğu · Kişi Başı Limit · Olay Başı Limit ·
Yıllık Toplam Limit · Maddi Zarar Limiti · Coğrafi Kapsam · Muafiyet ·
Geçmiş Hasarlar

### 22. Mesleki Sorumluluk Sigortası

Sigortalı · Meslek · Uzmanlık Alanı · Meslek Sicil No ·
Ruhsat / Yetki Belgesi No · Meslek Odası · Meslekte Geçen Süre ·
Çalışan Profesyonel Personel Sayısı · Yıllık Mesleki Ciro ·
En Büyük Sözleşme Bedeli · Geriye Yürürlük Tarihi · Önceki Hasarlar ·
Kişi Başı Limit · Olay Başı Limit · Yıllık Toplam Limit · Muafiyet ·
Coğrafi Kapsam

### 23. Tıbbi Kötü Uygulamaya İlişkin Zorunlu Mali Sorumluluk

Hekim Adı Soyadı · T.C. Kimlik No · Mesleği · Uzmanlık Alanı · Diploma No ·
Meslek Sicil No · Çalıştığı Sağlık Kurumu · Çalışma Şekli · Risk Grubu ·
Önceki Poliçe · Önceki Hasarlar

### 24. Ürün Sorumluluk Sigortası

Firma · Ürün Grubu · Ürün Açıklaması · Yıllık Ürün Satış Cirosu ·
Yıllık Üretim Adedi · İhracat Oranı · İhracat Yapılan Ülkeler ·
ABD / Kanada Satışı Var mı? · Kalite Belgeleri · Parti / Seri İzlenebilirliği ·
Ürün Geri Çağırma Planı · Geçmiş Ürün Geri Çağırmaları · Geçmiş Hasarlar ·
Olay Başı Limit · Yıllık Toplam Limit

### 25. Çevre Kirliliği Mali Sorumluluk Sigortası

Tesis · Risk Adresi · Faaliyet Konusu · Çevre İzin / Lisans Bilgileri ·
Tesis Alanı · Tehlikeli Madde Türleri · Tehlikeli Madde Miktarları ·
Yeraltı Tankları · Yerüstü Tankları · Tank Kapasiteleri · Tank Yaşları ·
İkincil Sızdırmazlık Sistemi · Atık Türleri · Atık Kodları · Yıllık Atık Miktarı ·
Atık Depolama Şekli · Yüzey Sularına Mesafe · Yeraltı Suyu Bilgileri ·
Geçmiş Toprak Kirliliği · Geçmiş Sızıntılar · Acil Durum Planı ·
Ani Kirlilik Limiti · Tedrici Kirlilik Teminatı · Temizleme Giderleri Limiti

### 26. Tehlikeli Maddeler / Tehlikeli Atık Sorumluluk Sigortası

İşletme · Tesis · Risk Adresi · Faaliyet Türü · İzin / Lisans No ·
Tehlikeli Madde Sınıfı · Madde Adı · Birleşmiş Milletler Numarası ·
Yıllık Miktar · Azami Depolama Miktarı · Tank / Konteyner Kapasitesi ·
Atık Kodları · Taşıma Araçları · Teminat Limiti

### 27. Makine Kırılması Sigortası

Makine · Marka · Model · Seri No · Üretim Yılı · Devreye Alma Tarihi ·
Kapasitesi · Kullanım Amacı · Bulunduğu Lokasyon · Yenileme Değeri ·
Bakım Sözleşmesi · Son Bakım Tarihi · Bir Sonraki Bakım Tarihi ·
Çalışma Süresi · Geçmiş Arızalar · Muafiyet

### 28. Elektronik Cihaz Sigortası

Cihaz · Marka · Model · Seri No · Üretim Yılı · Satın Alma Tarihi · Fatura No ·
Bulunduğu Lokasyon · Yenileme Değeri · Taşınabilir Cihaz mı? ·
Kesintisiz Güç Kaynağı Var mı? · Klima / Ortam Kontrolü · Veri Taşıyıcı Bedeli ·
Yazılım Yeniden Kurulum Bedeli · Muafiyet

### 29. İnşaat Bütün Riskler Sigortası

Proje Adı · Proje Adresi · İşveren · Ana Yüklenici · Alt Yükleniciler ·
Sözleşme No · Proje Türü · Sözleşme Bedeli · İnşaat İşleri Bedeli ·
Geçici İşler Bedeli · Şantiye Ekipmanları Bedeli · Mevcut Yapı Bedeli ·
Komşu Mallar Bedeli · Yer Teslim Tarihi · İş Başlangıç Tarihi ·
Planlanan Bitiş Tarihi · Bakım Dönemi · Üçüncü Şahıs Mali Sorumluluk Limiti ·
Doğal Afet Riskleri · Muafiyetler

### 30. Montaj Bütün Riskler Sigortası

Proje Adı · Proje Adresi · İşveren · Ana Yüklenici · Alt Yükleniciler ·
Sözleşme Bedeli · Makine / Ekipman Bedeli · Montaj İşleri Bedeli ·
Montaj Başlangıç Tarihi · Montaj Bitiş Tarihi · Test Başlangıç Tarihi ·
Test Bitiş Tarihi · Devreye Alma Tarihi · Bakım Dönemi · Mevcut Yapılar ·
Üçüncü Şahıs Mali Sorumluluk Limiti · Muafiyet

### 31. Emtia Nakliyat Sigortası

Malın Cinsi · Malın Açıklaması · Miktarı · Birimi · Fatura No · Fatura Bedeli ·
Sigorta Bedeli · Para Birimi · Ambalaj Şekli · Çıkış Noktası · Varış Noktası ·
Taşıma Şekli · Taşıyıcı Firma · Araç / Gemi / Uçuş Bilgisi · Konteyner No ·
Konşimento No · Hava Yük Senedi No · CMR No · Çıkış Tarihi ·
Tahmini Varış Tarihi · Aktarma Var mı? · Geçici Depolama Var mı? ·
Isı Kontrollü Taşıma mı? · Taşıma Sıcaklığı · Muafiyet

### 32. Açık Abonman Nakliyat Sigortası

Abonman No · Yıllık Tahmini Sevkiyat Tutarı · Sefer Başı Azami Tutar ·
Beyan Dönemi · Mal Grupları · Çıkış Ülkeleri · Varış Ülkeleri ·
Taşıma Şekilleri · Sevkiyat Beyanları

### 33. Kıymet Nakliyat Sigortası

Kıymetin Türü · Kıymetin Tutarı · Para Birimi · Çıkış Noktası · Varış Noktası ·
Taşıma Firması · Zırhlı Araç Kullanımı · Silahlı Güvenlik ·
Kasa / Güvenlik Konteyneri · Teslim Eden · Teslim Alan

### 34. Tekne / Yat Sigortası

Tekne Adı · Bayrak · Sicil Limanı · Sicil No · Tekne Türü · Kullanım Şekli ·
Yapım Yılı · Üretici · Gövde Malzemesi · Boy · En · Tonaj · Motor Markası ·
Motor Modeli · Motor Gücü · Seyir Bölgesi · Bağlama Yeri · Klas Kuruluşu ·
Gövde Bedeli · Makine Bedeli · Ekipman Bedeli · Kişisel Eşya Bedeli ·
Mürettebat Sayısı · Yolcu Kapasitesi · Muafiyet

### 35. Siber Güvenlik Sigortası

Firma · Sektör · Yıllık Ciro · Çalışan Sayısı ·
Bilgi Teknolojileri Personel Sayısı · Kişisel Veri Kayıt Sayısı ·
Hassas Veri Kayıt Sayısı · Kredi Kartı Verisi İşleniyor mu? · Kritik Sistemler ·
Bulut Hizmeti Kullanılıyor mu? · Bulut Sağlayıcıları ·
Dış Kaynak Bilgi Teknolojileri Hizmeti · Çok Faktörlü Kimlik Doğrulama ·
Çok Faktörlü Kimlik Doğrulama Kapsamı · Uç Nokta Güvenliği · Antivirüs ·
Güvenlik Duvarı · E-Posta Güvenliği · Yedekleme Var mı? · Yedekleme Sıklığı ·
Çevrimdışı / Değiştirilemez Yedekleme · Son Geri Yükleme Testi · Yama Yönetimi ·
Zafiyet Taraması · Son Sızma Testi Tarihi · Ayrıcalıklı Hesap Yönetimi ·
Olay Müdahale Planı · İş Sürekliliği Planı · Felaket Kurtarma Planı ·
Hedef Kurtarma Süresi · Hedef Veri Kaybı Süresi · Siber Güvenlik Eğitimi ·
Oltalama Testleri · Geçmiş Siber Olaylar · Geçmiş Fidye Yazılımı Olayları ·
Geçmiş Veri İhlalleri · Siber Şantaj Limiti · İş Durması Limiti ·
Veri Gizliliği Sorumluluk Limiti · Olay Müdahale Giderleri Limiti ·
Sosyal Mühendislik Limiti · Muafiyet · Bekleme Süresi

### 36. Ticari Alacak Sigortası

Sigortalı Firma · Yıllık Vadeli Satış Cirosu · Yurtiçi Satış Cirosu ·
İhracat Cirosu · Alıcı / Borçlu Firma · Vergi Numarası · Ülke · Sektör ·
Talep Edilen Kredi Limiti · Onaylanan Kredi Limiti · Vade Süresi ·
Açık Alacak Tutarı · Gecikmiş Alacak Tutarı · 0–30 Gün Alacak ·
31–60 Gün Alacak · 61–90 Gün Alacak · 90 Gün Üzeri Alacak · En Büyük Alıcılar ·
Geçmiş Alacak Zararları

### 37. Kefalet Sigortası

Borçlu / Yüklenici · Lehtar · Kefalet Türü · İhale No · Sözleşme No ·
İşin Açıklaması · Sözleşme Bedeli · Kefalet Tutarı · Kefalet Başlangıç Tarihi ·
Kefalet Bitiş Tarihi · Talep Koşulları · Teminat Türü · Teminat Değeri ·
Yıllık Ciro · Özsermaye · Toplam Borç · Risk / Kredi Skoru ·
Mevcut Kefalet Yükümlülükleri

### 38. Bina Tamamlama Sigortası

Proje Sahibi · Proje Adı · Proje Adresi · Yapı Ruhsat No · Yapı Ruhsat Tarihi ·
Proje Toplam Bedeli · Bağımsız Bölüm Sayısı · Satılmış Bağımsız Bölüm Sayısı ·
Alıcılar · Satış Sözleşme No · Satış Bedeli · Planlanan Tamamlanma Tarihi ·
Fiziki Gerçekleşme Oranı · Teminat Tutarı

### 39. Hukuksal Koruma Sigortası

Sigortalı · Bağlı Araç / Taşınmaz / İşletme · Hukuki Risk Türü · Coğrafi Kapsam ·
Avukatlık Gideri Limiti · Mahkeme Gideri Limiti · Bilirkişi Gideri Limiti ·
Teminat / Avans Limiti · Muafiyet · Bekleme Süresi

### 40. Bitkisel Ürün Sigortası

Üretici · ÇKS Yılı · ÇKS Kayıt No · İl · İlçe · Köy / Mahalle · Ada · Parsel ·
Ekili Alan · Ürün · Ürün Çeşidi · Ekim Tarihi · Hasat Tarihi · Üretim Şekli ·
Sulama Şekli · Beklenen Verim · Birim Fiyat · Sigorta Bedeli

### 41. Sera Sigortası

Üretici · Sera Kayıt No · Sera Adresi · Konum Bilgisi · Sera Alanı · Yapı Tipi ·
Konstrüksiyon Tipi · Örtü Malzemesi · Yapım Yılı · Isıtma Sistemi ·
Sulama Sistemi · Yetiştirilen Ürün · Ürün Bedeli · Sera Ekipman Bedeli

### 42. Büyükbaş Hayvan Sigortası

İşletme No · Küpe No · Hayvan Türü · Irkı · Cinsiyeti · Doğum Tarihi · Yaşı ·
Kullanım Amacı · Hayvan Bedeli · Sağlık Durumu · Aşı Durumu · Gebelik Durumu ·
İşletme Adresi

### 43. Küçükbaş Hayvan Sigortası

İşletme No · Küpe No · Sürü No · Hayvan Türü · Irkı · Cinsiyeti ·
Doğum Tarihi / Yaşı · Kullanım Amacı · Hayvan Bedeli · Sağlık Durumu · Aşı Durumu

### 44. Kümes Hayvanları Sigortası

İşletme No · Hayvan Türü · Üretim Türü · Sürü / Parti No · Hayvan Sayısı ·
Hayvan Yaşı · Birim Hayvan Bedeli · Kümes Tipi · Biyogüvenlik Bilgileri

### 45. Arıcılık Sigortası

Arıcı Kayıt No · Arılık No · Kovan Plaka No · Kovan Sayısı ·
Sabit / Gezgin Arıcılık · Mevcut Konum · Göç Rotası · Kovan Birim Değeri ·
Arıcılık Ekipmanları

### 46. Su Ürünleri Sigortası

İşletme No · İşletme Ruhsat No · Üretim Yeri · Havuz / Kafes Türü · Ürün Türü ·
Stok Adedi · Biyokütle · Ortalama Ağırlık · Yaş · Birim Değer · Su Sistemi ·
Kafes / Ağ Bedeli

### 47. Evcil Hayvan Sigortası

Hayvan Sahibi · Mikroçip No · Evcil Hayvan Pasaport No · Hayvan Türü · Irkı ·
Cinsiyeti · Doğum Tarihi · Yaşı · Rengi · Ayırt Edici Özellikleri ·
Kısırlaştırılmış mı? · Aşı Durumu · Aşı Tarihleri · Geçmiş Hastalıklar ·
Geçmiş Ameliyatlar · Veteriner · Anlaşmalı Veteriner Ağı · Ayakta Tedavi Limiti ·
Yatarak Tedavi Limiti · Ameliyat Limiti · Üçüncü Şahıs Sorumluluk Limiti ·
Katılım Payı · Bekleme Süresi

### 48. Araç Ruhsat / Plaka Geçmişi

> Araç kartında ayrıca tutulur. **Her plaka veya ruhsat değişikliğinde eski kayıt
> korunarak yeni kayıt eklenmelidir** (kural 4'ün uygulaması).

Plaka · Belge Seri No · Ruhsat Belge No · ASBİS Referans No · Araç Sahibi ·
İşleten · Tescil İli · Tescil Tarihi · Geçerlilik Başlangıç Tarihi ·
Geçerlilik Bitiş Tarihi · Güncel Kayıt mı? · Değişiklik Nedeni ·
Eski Ruhsat Belgesi · Yeni Ruhsat Belgesi
