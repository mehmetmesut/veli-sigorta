import { randomUUID } from 'node:crypto';
import type { AuditLog, QuoteRequest, SystemUser, VisitRecord } from './types';
import {
  boolCoz,
  calistir,
  dateToIso,
  isoToDate,
  metinVeyaNull,
  sorgula,
  tekSatir,
} from './mysql';

/**
 * Operasyonel kayıtlar: ziyaretler, teklif talepleri, denetim kayıtları, sistem kullanıcıları.
 *
 * Ziyaret tablosu en hızlı büyüyen tablodur ve ASLA tamamı belleğe alınmaz. Analitik
 * raporundaki sayılar SQL toplama sorgularıyla üretilir; eskiden tüm dizi belleğe alınıp
 * JavaScript'te süzülüyordu.
 */

// --- Ziyaretler --------------------------------------------------------------

export interface ZiyaretGirdisi {
  path: string;
  referrer: string;
  referrerCategory: VisitRecord['referrerCategory'];
  browser: string;
  deviceType: VisitRecord['deviceType'];
  sessionId: string;
  ipHash: string;
}

/**
 * Ziyareti kaydeder. Tek satır ekler — eskiden bu işlem tüm veritabanı dosyasını
 * yeniden yazıyordu.
 *
 * İki koruma korunur:
 * - Aynı IP'den son 24 saatte 200'den fazla kayıt varsa yeni kayıt alınmaz (bot/kötüye kullanım).
 * - Aynı oturum aynı yolu 5 saniye içinde tekrar bildirirse yinelenen sayılmaz.
 */
export async function ziyaretKaydet(g: ZiyaretGirdisi): Promise<boolean> {
  const asiri = await tekSatir(
    `SELECT COUNT(*) AS adet FROM visits
     WHERE ip_hash = ? AND ts >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)`,
    [g.ipHash],
  );
  if (Number(asiri?.adet ?? 0) >= 200) return false;

  const yinelenen = await tekSatir(
    `SELECT id FROM visits
     WHERE session_id = ? AND path = ? AND ts >= DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 5 SECOND)
     LIMIT 1`,
    [g.sessionId, g.path],
  );
  if (yinelenen) return false;

  await calistir(
    `INSERT INTO visits (ts, path, referrer, referrer_category, browser, device_type, session_id, ip_hash)
     VALUES (UTC_TIMESTAMP(3), ?, ?, ?, ?, ?, ?, ?)`,
    [g.path, g.referrer, g.referrerCategory, g.browser, g.deviceType, g.sessionId, g.ipHash],
  );
  return true;
}

export interface ZiyaretOzeti {
  bugun: number;
  son7Gun: number;
  son30Gun: number;
  benzersizOturum30Gun: number;
  benzersizZiyaretci30Gun: number;
  toplam: number;
  enCokGorulenSayfalar: { path: string; count: number }[];
  kaynakDagilimi: { kategori: string; count: number }[];
  cihazDagilimi: { cihaz: string; count: number }[];
  tarayiciDagilimi: { tarayici: string; count: number }[];
  gunlukSeri: { gun: string; count: number }[];
}

/**
 * Analitik özeti. Tüm hesaplama veritabanında yapılır.
 *
 * Tarih grupları Europe/Istanbul saatine göre hesaplanır: kayıtlar UTC saklanır ama
 * "bugün" acentenin yerel günü demektir.
 */
export async function ziyaretOzetiGetir(): Promise<ZiyaretOzeti> {
  const YEREL = "CONVERT_TZ(ts, '+00:00', '+03:00')";

  const [sayimlar] = await sorgula(`
    SELECT
      SUM(DATE(${YEREL}) = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+03:00')))          AS bugun,
      SUM(ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY))                                  AS son7,
      SUM(ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY))                                 AS son30,
      COUNT(*)                                                                              AS toplam
    FROM visits`);

  const [benzersiz] = await sorgula(`
    SELECT COUNT(DISTINCT session_id) AS oturum, COUNT(DISTINCT ip_hash) AS ziyaretci
    FROM visits WHERE ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)`);

  const sayfalar = await sorgula(`
    SELECT path, COUNT(*) AS adet FROM visits
    WHERE ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY path ORDER BY adet DESC LIMIT 10`);

  const kaynaklar = await sorgula(`
    SELECT referrer_category AS kategori, COUNT(*) AS adet FROM visits
    WHERE ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY referrer_category ORDER BY adet DESC`);

  const cihazlar = await sorgula(`
    SELECT device_type AS cihaz, COUNT(*) AS adet FROM visits
    WHERE ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY device_type ORDER BY adet DESC`);

  const tarayicilar = await sorgula(`
    SELECT browser AS tarayici, COUNT(*) AS adet FROM visits
    WHERE ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY browser ORDER BY adet DESC`);

  const gunluk = await sorgula(`
    SELECT DATE(${YEREL}) AS gun, COUNT(*) AS adet FROM visits
    WHERE ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY gun ORDER BY gun`);

  return {
    bugun: Number(sayimlar?.bugun ?? 0),
    son7Gun: Number(sayimlar?.son7 ?? 0),
    son30Gun: Number(sayimlar?.son30 ?? 0),
    toplam: Number(sayimlar?.toplam ?? 0),
    benzersizOturum30Gun: Number(benzersiz?.oturum ?? 0),
    benzersizZiyaretci30Gun: Number(benzersiz?.ziyaretci ?? 0),
    enCokGorulenSayfalar: sayfalar.map((r) => ({ path: String(r.path), count: Number(r.adet) })),
    kaynakDagilimi: kaynaklar.map((r) => ({ kategori: String(r.kategori), count: Number(r.adet) })),
    cihazDagilimi: cihazlar.map((r) => ({ cihaz: String(r.cihaz), count: Number(r.adet) })),
    tarayiciDagilimi: tarayicilar.map((r) => ({ tarayici: String(r.tarayici), count: Number(r.adet) })),
    gunlukSeri: gunluk.map((r) => ({ gun: String(r.gun), count: Number(r.adet) })),
  };
}

/** Arama motoru ve yapay zekâ kaynaklı ziyaretlerin hangi sayfalara indiği. */
export async function aramaVeYapayZekaInisleri(): Promise<
  { path: string; totalVisits: number; sourcesBreakdown: Record<string, number> }[]
> {
  const satirlar = await sorgula(`
    SELECT path, referrer_category AS kaynak, COUNT(*) AS adet
    FROM visits
    WHERE ts >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)
      AND referrer_category IN ('Google','Bing','Yandex','ChatGPT','Perplexity','Gemini','Copilot')
    GROUP BY path, referrer_category`);

  const harita = new Map<string, { totalVisits: number; sourcesBreakdown: Record<string, number> }>();
  for (const r of satirlar) {
    const yol = String(r.path);
    const adet = Number(r.adet);
    const kayit = harita.get(yol) ?? { totalVisits: 0, sourcesBreakdown: {} };
    kayit.totalVisits += adet;
    kayit.sourcesBreakdown[String(r.kaynak)] = adet;
    harita.set(yol, kayit);
  }

  return [...harita.entries()]
    .map(([path, v]) => ({ path, ...v }))
    .sort((a, b) => b.totalVisits - a.totalVisits);
}

/** Panelde gösterilen son ziyaretler. Tüm tablo değil, yalnız istenen kadarı okunur. */
export async function sonZiyaretler(limit = 50): Promise<VisitRecord[]> {
  const n = Math.max(1, Math.min(500, Math.floor(limit)));
  const satirlar = await sorgula(`SELECT * FROM visits ORDER BY ts DESC, id DESC LIMIT ${n}`);
  return satirlar.map((r) => ({
    id: String(r.id),
    timestamp: dateToIso(r.ts),
    path: String(r.path),
    referrer: String(r.referrer ?? ''),
    referrerCategory: String(r.referrer_category) as VisitRecord['referrerCategory'],
    browser: String(r.browser ?? 'Unknown'),
    deviceType: String(r.device_type) as VisitRecord['deviceType'],
    sessionId: String(r.session_id ?? ''),
    ipHash: String(r.ip_hash ?? ''),
  }));
}

/** Belirtilen günden eski ziyaret kayıtlarını siler (KVKK saklama süresi yönetimi). */
export async function eskiZiyaretleriTemizle(gunSayisi: number): Promise<number> {
  const { etkilenen } = await calistir(
    'DELETE FROM visits WHERE ts < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)',
    [gunSayisi],
  );
  return etkilenen;
}

// --- Teklif talepleri --------------------------------------------------------

function satirdanTeklif(r: Record<string, unknown>): QuoteRequest {
  return {
    id: String(r.id),
    timestamp: dateToIso(r.ts),
    serviceName: String(r.service_name),
    fullName: String(r.full_name),
    phone: String(r.phone),
    email: r.email ? String(r.email) : undefined,
    cityDistrict: r.city_district ? String(r.city_district) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    adminNotes: r.admin_notes ? String(r.admin_notes) : undefined,
    status: String(r.status) as QuoteRequest['status'],
    musteriId: r.musteri_id ? String(r.musteri_id) : undefined,
  };
}

export async function teklifleriGetir(): Promise<QuoteRequest[]> {
  const satirlar = await sorgula('SELECT * FROM quotes ORDER BY ts DESC');
  return satirlar.map(satirdanTeklif);
}

export async function teklifKaydet(q: QuoteRequest): Promise<QuoteRequest> {
  const id = !q.id || q.id === 'yeni' ? `quote-${randomUUID()}` : q.id;

  await calistir(
    `INSERT INTO quotes (id, ts, service_name, full_name, phone, email, city_district, notes, admin_notes, status, musteri_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       service_name = VALUES(service_name), full_name = VALUES(full_name), phone = VALUES(phone),
       email = VALUES(email), city_district = VALUES(city_district), notes = VALUES(notes),
       admin_notes = VALUES(admin_notes), status = VALUES(status), musteri_id = VALUES(musteri_id)`,
    [
      id, isoToDate(q.timestamp), q.serviceName, q.fullName, q.phone,
      metinVeyaNull(q.email), metinVeyaNull(q.cityDistrict), metinVeyaNull(q.notes),
      metinVeyaNull(q.adminNotes), q.status || 'Yeni', metinVeyaNull(q.musteriId),
    ],
  );

  const satir = await tekSatir('SELECT * FROM quotes WHERE id = ?', [id]);
  if (!satir) throw new Error('Teklif kaydedildi ama geri okunamadı.');
  return satirdanTeklif(satir);
}

export async function teklifDurumGuncelle(
  id: string,
  durum: QuoteRequest['status'],
  yoneticiNotu?: string,
): Promise<boolean> {
  const { etkilenen } = await calistir(
    `UPDATE quotes SET status = ?, admin_notes = COALESCE(?, admin_notes) WHERE id = ?`,
    [durum, yoneticiNotu ?? null, id],
  );
  return etkilenen > 0;
}

export async function teklifSil(id: string): Promise<boolean> {
  const { etkilenen } = await calistir('DELETE FROM quotes WHERE id = ?', [id]);
  return etkilenen > 0;
}

// --- Denetim kayıtları -------------------------------------------------------

export async function denetimKaydiEkle(
  userEmail: string,
  action: string,
  details: string,
): Promise<void> {
  await calistir(
    'INSERT INTO audit_logs (ts, user_email, action, details) VALUES (UTC_TIMESTAMP(3), ?, ?, ?)',
    [userEmail, action, details],
  );
}

export async function denetimKayitlariGetir(limit = 150): Promise<AuditLog[]> {
  // LIMIT hazır ifadeyle parametrelenemediği için sayıya zorlanır.
  const n = Math.max(1, Math.min(1000, Math.floor(limit)));
  const satirlar = await sorgula(`SELECT * FROM audit_logs ORDER BY ts DESC, id DESC LIMIT ${n}`);
  return satirlar.map((r) => ({
    id: String(r.id),
    timestamp: dateToIso(r.ts),
    userEmail: String(r.user_email),
    action: String(r.action),
    details: String(r.details ?? ''),
  }));
}

// --- Sistem kullanıcıları ----------------------------------------------------

function satirdanKullanici(r: Record<string, unknown>): SystemUser {
  return {
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    role: r.role === 'admin' ? 'admin' : 'user',
    passwordHash: String(r.password_hash),
    isActive: boolCoz(r.is_active),
    createdAt: dateToIso(r.created_at),
  };
}

export async function kullanicilariGetir(): Promise<SystemUser[]> {
  const satirlar = await sorgula('SELECT * FROM system_users ORDER BY created_at');
  return satirlar.map(satirdanKullanici);
}

export async function kullaniciGetirEposta(email: string): Promise<SystemUser | null> {
  const satir = await tekSatir('SELECT * FROM system_users WHERE email = ?', [email]);
  return satir ? satirdanKullanici(satir) : null;
}

export async function kullaniciKaydet(u: SystemUser): Promise<SystemUser> {
  const id = !u.id || u.id === 'yeni' ? `user-${randomUUID()}` : u.id;

  await calistir(
    `INSERT INTO system_users (id, name, email, role, password_hash, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), email = VALUES(email), role = VALUES(role),
       password_hash = VALUES(password_hash), is_active = VALUES(is_active)`,
    [id, u.name, u.email, u.role, u.passwordHash, u.isActive ? 1 : 0, isoToDate(u.createdAt)],
  );

  const satir = await tekSatir('SELECT * FROM system_users WHERE id = ?', [id]);
  if (!satir) throw new Error('Kullanıcı kaydedildi ama geri okunamadı.');
  return satirdanKullanici(satir);
}

export async function kullaniciSil(id: string): Promise<boolean> {
  const { etkilenen } = await calistir('DELETE FROM system_users WHERE id = ?', [id]);
  return etkilenen > 0;
}
