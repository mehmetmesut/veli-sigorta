-- Teklif → müşteri bağı ve "Revize İstendi" durumu
--
-- 1. `musteri_id`: teklifin hangi müşteri kartından verildiği. Site formundan gelen
--    eski tekliflerde NULL kalır. Teklif poliçeye çevrilirken poliçenin sahibi
--    buradan bilinir; önceden telefon eşleştirmesiyle tahmin ediliyordu.
--
-- 2. `Revize İstendi`: müşteri teklifi görüp değişiklik istediğinde takip edilecek
--    ara durum. Bu olmadan teklif ya "görüşüldü"de takılıyor ya da iptal ediliyordu.
--
-- Tekrar çalıştırılabilir DEĞİLDİR; bir kez uygulanır. Uygulanıp uygulanmadığı
-- `SHOW COLUMNS FROM quotes LIKE 'musteri_id'` ile kontrol edilebilir.

ALTER TABLE quotes
  ADD COLUMN musteri_id VARCHAR(64) NULL AFTER status,
  ADD KEY ix_quotes_musteri (musteri_id),
  ADD CONSTRAINT fk_quotes_musteri
    FOREIGN KEY (musteri_id) REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE quotes
  MODIFY COLUMN status
    ENUM('Yeni','Görüşüldü','Revize İstendi','Poliçeleştirildi','İptal Edildi')
    NOT NULL DEFAULT 'Yeni';

-- Poliçe numarası artık boş olabilir: onaylanan teklif poliçeye çevrilirken numara
-- çoğu zaman henüz belli değil ama takibin hemen başlaması gerekiyor.
ALTER TABLE policies
  MODIFY COLUMN police_no VARCHAR(128) NOT NULL DEFAULT '';
