-- Google yorum takibi: kimden yorum istendi, kim yorum bıraktı.
--
-- Müşteri kartındaki "Google Yorumu İste" düğmesi `yorum_istendi_at` alanını yazar;
-- personel yorum geldiğinde `yorum_geldi_at` işaretini koyar. Kart kaydı (upsert)
-- bu sütunlara dokunmaz, yalnız `action: 'yorum'` uç noktası yazar.
--
-- Tekrar çalıştırılabilir DEĞİLDİR; uygulanıp uygulanmadığı
-- `SHOW COLUMNS FROM customers LIKE 'yorum_istendi_at'` ile kontrol edilebilir.

ALTER TABLE customers
  ADD COLUMN yorum_istendi_at DATETIME(3) NULL,
  ADD COLUMN yorum_geldi_at DATETIME(3) NULL;
