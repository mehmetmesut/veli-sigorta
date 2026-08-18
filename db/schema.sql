-- Veli Sigorta — MySQL/MariaDB şeması
--
-- Tasarım ilkesi: SORGULANAN her alan gerçek sütundur (indekslenebilir, filtrelenebilir);
-- sorgulanmayan uzun kuyruk (diziler, iç içe nesneler, branşa özel dinamik alanlar) JSON
-- sütununda tutulur. Böylece 48 branşın onlarca alanı için şema değiştirmek gerekmez ama
-- poliçe bitiş tarihi, müşteri araması gibi işler indeksten yürür.
--
-- Karakter seti utf8mb4: Türkçe karakterler ve emoji güvenli.
-- Para alanları DECIMAL: kayan noktalı sayı asla para için kullanılmaz.
-- Zaman damgaları DATETIME(3) ve UTC saklanır; bağlantı `timezone: 'Z'` ile açılır.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Tekil kayıtlar (tek satırlık ayar tabloları)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS singletons (
  ad          VARCHAR(32)  NOT NULL PRIMARY KEY,
  veri        JSON         NOT NULL,
  updated_at  DATETIME(3)  NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Satırlar: 'companyInfo', 'settings', 'auth' (adminPasswordHash + superAdmin)

-- ---------------------------------------------------------------------------
-- İçerik tabloları
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  description TEXT         NOT NULL,
  icon_name   VARCHAR(64)  NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  updated_at  DATETIME(3)  NOT NULL,
  UNIQUE KEY uq_categories_slug (slug),
  KEY ix_categories_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id                  VARCHAR(64)  NOT NULL PRIMARY KEY,
  title               VARCHAR(255) NOT NULL,
  slug                VARCHAR(255) NOT NULL,
  category_id         VARCHAR(64)  NOT NULL,
  short_description   TEXT         NOT NULL,
  rich_content        LONGTEXT     NOT NULL,
  featured_image      VARCHAR(512) NOT NULL DEFAULT '',
  icon_name           VARCHAR(64)  NOT NULL DEFAULT '',
  legal_basis         TEXT         NOT NULL,
  who_needs_it        TEXT         NOT NULL,
  is_mandatory        TINYINT(1)   NOT NULL DEFAULT 0,
  is_published        TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order          INT          NOT NULL DEFAULT 0,
  seo_title           VARCHAR(512) NOT NULL DEFAULT '',
  meta_description    TEXT         NOT NULL,
  canonical_url       VARCHAR(512) NOT NULL DEFAULT '',
  ai_summary          TEXT         NOT NULL,
  short_direct_answer TEXT         NOT NULL,
  last_reviewed_date  VARCHAR(32)  NOT NULL DEFAULT '',
  -- Diziler ve iç içe nesneler: coverage, exclusions, documents, priceFactors,
  -- faq[], relatedServiceIds, sourceReferences[], *Tags, og* alanları
  veri                JSON         NOT NULL,
  updated_at          DATETIME(3)  NOT NULL,
  UNIQUE KEY uq_services_slug (slug),
  KEY ix_services_category (category_id),
  KEY ix_services_published_order (is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faqs (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  question    VARCHAR(512) NOT NULL,
  answer      TEXT         NOT NULL,
  service_id  VARCHAR(64)  NULL,
  category    VARCHAR(128) NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  updated_at  DATETIME(3)  NOT NULL,
  KEY ix_faqs_order (sort_order),
  KEY ix_faqs_service (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blogs (
  id                VARCHAR(64)  NOT NULL PRIMARY KEY,
  title             VARCHAR(512) NOT NULL,
  slug              VARCHAR(255) NOT NULL,
  excerpt           TEXT         NOT NULL,
  content           LONGTEXT     NOT NULL,
  featured_image    VARCHAR(512) NOT NULL DEFAULT '',
  category          VARCHAR(128) NOT NULL DEFAULT '',
  author            VARCHAR(255) NOT NULL DEFAULT '',
  published_at      VARCHAR(32)  NOT NULL DEFAULT '',
  is_published      TINYINT(1)   NOT NULL DEFAULT 0,
  read_time_minutes INT          NOT NULL DEFAULT 0,
  veri              JSON         NOT NULL,
  updated_at        DATETIME(3)  NOT NULL,
  UNIQUE KEY uq_blogs_slug (slug),
  KEY ix_blogs_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaigns (
  id                      VARCHAR(64)  NOT NULL PRIMARY KEY,
  title                   VARCHAR(512) NULL,
  badge                   VARCHAR(255) NULL,
  description             TEXT         NULL,
  cta_text                VARCHAR(255) NULL,
  cta_link                VARCHAR(512) NULL,
  image_url               VARCHAR(512) NULL,
  show_overlay_with_image TINYINT(1)   NULL,
  is_active               TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order              INT          NOT NULL DEFAULT 0,
  updated_at              DATETIME(3)  NOT NULL,
  KEY ix_campaigns_active_order (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partners (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  logo_url      VARCHAR(512) NOT NULL DEFAULT '',
  website_url   VARCHAR(512) NULL,
  discount_note VARCHAR(255) NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order    INT          NOT NULL DEFAULT 0,
  updated_at    DATETIME(3)  NOT NULL,
  KEY ix_partners_active_order (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Kullanıcılar
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS system_users (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  role          ENUM('admin','user') NOT NULL DEFAULT 'user',
  password_hash VARCHAR(255) NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME(3)  NOT NULL,
  UNIQUE KEY uq_system_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Müşteri ve poliçe — yıllar içinde büyüyecek asıl operasyonel veri
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customers (
  id                 VARCHAR(64)  NOT NULL PRIMARY KEY,
  musteri_no         VARCHAR(32)  NOT NULL,
  tip                ENUM('bireysel','kurumsal') NOT NULL,

  tc_kimlik_no       VARCHAR(11)  NULL,
  yabanci_kimlik_no  VARCHAR(32)  NULL,
  ad                 VARCHAR(128) NULL,
  soyad              VARCHAR(128) NULL,
  dogum_tarihi       DATE         NULL,
  cinsiyet           VARCHAR(16)  NULL,
  uyruk              VARCHAR(64)  NULL,
  meslek             VARCHAR(128) NULL,

  vergi_no           VARCHAR(16)  NULL,
  vergi_dairesi      VARCHAR(128) NULL,
  firma_unvani       VARCHAR(512) NULL,
  marka_adi          VARCHAR(255) NULL,
  mersis_no          VARCHAR(32)  NULL,
  nace_kodu          VARCHAR(32)  NULL,
  faaliyet_konusu    VARCHAR(512) NULL,
  calisan_sayisi     INT          NULL,

  mobil_telefon      VARCHAR(32)  NULL,
  sabit_telefon      VARCHAR(32)  NULL,
  email              VARCHAR(255) NULL,
  il                 VARCHAR(64)  NULL,
  ilce               VARCHAR(64)  NULL,
  acik_adres         TEXT         NULL,
  uavt_kodu          VARCHAR(32)  NULL,

  musteri_temsilcisi VARCHAR(128) NULL,
  notlar             TEXT         NULL,
  -- Kurumsal yetkililer (sınırsız sayıda, iç içe nesne dizisi)
  yetkililer         JSON         NOT NULL,

  is_active          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at         DATETIME(3)  NOT NULL,
  updated_at         DATETIME(3)  NOT NULL,

  UNIQUE KEY uq_customers_musteri_no (musteri_no),
  KEY ix_customers_tc (tc_kimlik_no),
  KEY ix_customers_vergi (vergi_no),
  KEY ix_customers_mobil (mobil_telefon),
  KEY ix_customers_tip (tip),
  -- Ad/unvan aramaları için: LIKE '%x%' indeks kullanamaz, bu yüzden tam metin indeksi
  FULLTEXT KEY ft_customers_arama (ad, soyad, firma_unvani, marka_adi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS policies (
  id                VARCHAR(64)  NOT NULL PRIMARY KEY,
  musteri_id        VARCHAR(64)  NOT NULL,
  sigortali_adi     VARCHAR(255) NULL,

  sigorta_sirketi   VARCHAR(255) NOT NULL,
  sigorta_turu      VARCHAR(255) NOT NULL,
  police_no         VARCHAR(128) NOT NULL DEFAULT '',
  yenileme_no       VARCHAR(64)  NULL,
  zeyil_no          VARCHAR(64)  NULL,

  duzenleme_tarihi  DATE         NULL,
  baslangic_tarihi  DATE         NOT NULL,
  -- Poliçe takibinin tamamı bu sütun üzerinden yürür; indeks kritik.
  bitis_tarihi      DATE         NOT NULL,

  durum             ENUM('Aktif','Yenilendi','İptal','Süresi Doldu') NOT NULL DEFAULT 'Aktif',
  yenileme_mi       TINYINT(1)   NOT NULL DEFAULT 0,
  onceki_police_no  VARCHAR(128) NULL,

  brut_prim         DECIMAL(15,2) NULL,
  net_prim          DECIMAL(15,2) NULL,
  komisyon_orani    DECIMAL(6,3)  NULL,
  komisyon_tutari   DECIMAL(15,2) NULL,
  para_birimi       VARCHAR(8)    NULL,
  odeme_sekli       VARCHAR(64)   NULL,
  taksit_sayisi     INT           NULL,
  tahsilat_durumu   VARCHAR(64)   NULL,

  risk_tanimi       VARCHAR(512)  NULL,
  -- Branşa özel dinamik alanlar (48 branş × onlarca alan) — şema değişikliği gerektirmez
  brans_alanlari    JSON          NULL,

  police_pdf_url    VARCHAR(512)  NULL,
  sorumlu_personel  VARCHAR(128)  NULL,
  notlar            TEXT          NULL,
  created_at        DATETIME(3)   NOT NULL,
  updated_at        DATETIME(3)   NOT NULL,

  KEY ix_policies_musteri (musteri_id),
  KEY ix_policies_bitis (bitis_tarihi),
  KEY ix_policies_durum_bitis (durum, bitis_tarihi),
  KEY ix_policies_police_no (police_no),
  KEY ix_policies_sirket (sigorta_sirketi),
  KEY ix_policies_turu (sigorta_turu),
  CONSTRAINT fk_policies_musteri FOREIGN KEY (musteri_id)
    REFERENCES customers (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Teklif talepleri
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quotes (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  ts            DATETIME(3)  NOT NULL,
  service_name  VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  phone         VARCHAR(32)  NOT NULL,
  email         VARCHAR(255) NULL,
  city_district VARCHAR(128) NULL,
  notes         TEXT         NULL,
  admin_notes   TEXT         NULL,
  status        ENUM('Yeni','Görüşüldü','Revize İstendi','Poliçeleştirildi','İptal Edildi') NOT NULL DEFAULT 'Yeni',
  -- Teklifin hangi müşteri kartından verildiği. Site formundan gelen tekliflerde
  -- boştur (henüz müşteri kaydı yoktur); müşteri detay sayfasından "Teklif Ver" ile
  -- açılanlarda doludur. Teklif poliçeye çevrilirken poliçenin hangi müşteriye
  -- bağlanacağı buradan bilinir — telefon eşleştirmesi kırılgan bir bağdı.
  -- Müşteri silinirse teklif kaydı kalsın diye ON DELETE SET NULL.
  musteri_id    VARCHAR(64)  NULL,
  KEY ix_quotes_ts (ts),
  KEY ix_quotes_status (status),
  KEY ix_quotes_musteri (musteri_id),
  CONSTRAINT fk_quotes_musteri FOREIGN KEY (musteri_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Ziyaret kayıtları — en hızlı büyüyen tablo
--
-- Birincil anahtar rastgele UUID yerine artan tam sayıdır: rastgele anahtar
-- B-ağacını parçalar ve milyonlarca satırda yazma maliyetini artırır.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS visits (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ts                DATETIME(3)  NOT NULL,
  path              VARCHAR(512) NOT NULL,
  referrer          VARCHAR(512) NOT NULL DEFAULT '',
  referrer_category VARCHAR(32)  NOT NULL DEFAULT 'Direct',
  browser           VARCHAR(32)  NOT NULL DEFAULT 'Unknown',
  device_type       ENUM('Desktop','Mobile','Tablet') NOT NULL DEFAULT 'Desktop',
  session_id        VARCHAR(64)  NOT NULL,
  ip_hash           CHAR(64)     NOT NULL,
  KEY ix_visits_ts (ts),
  KEY ix_visits_session_path_ts (session_id, path, ts),
  KEY ix_visits_ip_ts (ip_hash, ts),
  KEY ix_visits_path_ts (path, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Denetim kayıtları
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ts         DATETIME(3)  NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  action     VARCHAR(64)  NOT NULL,
  details    TEXT         NOT NULL,
  KEY ix_audit_ts (ts),
  KEY ix_audit_user (user_email, ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
