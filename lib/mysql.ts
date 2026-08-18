import mysql from 'mysql2/promise';

/**
 * MySQL (MariaDB) bağlantı havuzu ve sorgu yardımcıları.
 *
 * Neden havuz: Next.js sunucusu tek süreçtir ama istekler eşzamanlı gelir. Havuz,
 * bağlantıları yeniden kullanarak her sorguda el sıkışma maliyetini ortadan kaldırır.
 *
 * Zaman dilimi: `timezone: 'Z'` ile DATETIME değerleri UTC kabul edilir; uygulama ISO
 * dizeleriyle çalıştığı için dönüşüm kayıpsız olur. DATE sütunları (`baslangicTarihi`,
 * `bitisTarihi`) ise `dateStrings` ile ham 'YYYY-MM-DD' olarak okunur — Date nesnesine
 * çevrilseydi yerel saat dilimine göre bir gün kayabilirdi.
 */

let havuz: mysql.Pool | null = null;

function gerekliDeger(ad: string): string {
  const deger = process.env[ad];
  if (!deger) {
    throw new Error(`${ad} tanımlı değil. Veritabanı bağlantısı kurulamaz.`);
  }
  return deger;
}

export function getPool(): mysql.Pool {
  if (havuz) return havuz;

  havuz = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: gerekliDeger('MYSQL_DATABASE'),
    user: gerekliDeger('MYSQL_USER'),
    password: gerekliDeger('MYSQL_PASSWORD'),
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    dateStrings: ['DATE'],
    connectionLimit: 10,
    waitForConnections: true,
    // Sorgu 10 saniyede dönmediyse bir şey ters gitmiştir; isteği sonsuza dek bekletme.
    connectTimeout: 10_000,
    // DECIMAL alanları JavaScript sayısına çevrilirken hassasiyet kaybı olmasın diye
    // dize olarak alınır; para alanlarını eşleme katmanı Number'a çevirir.
    decimalNumbers: false,
  });

  return havuz;
}

/** Sorgu parametresi olarak geçirilebilecek değerler. */
export type SorguParametresi = string | number | boolean | Date | null;

/** Satır listesi döndüren sorgu. */
export async function sorgula<T = Record<string, unknown>>(
  sql: string,
  parametreler: SorguParametresi[] = [],
): Promise<T[]> {
  const [satirlar] = await getPool().execute(sql, parametreler);
  return satirlar as T[];
}

/** Tek satır döndüren sorgu; bulunamazsa null. */
export async function tekSatir<T = Record<string, unknown>>(
  sql: string,
  parametreler: SorguParametresi[] = [],
): Promise<T | null> {
  const satirlar = await sorgula<T>(sql, parametreler);
  return satirlar[0] ?? null;
}

/** Yazma işlemi; etkilenen satır sayısını döndürür. */
export async function calistir(
  sql: string,
  parametreler: SorguParametresi[] = [],
): Promise<{ etkilenen: number; sonEklenenId: number }> {
  const [sonuc] = await getPool().execute(sql, parametreler);
  const r = sonuc as mysql.ResultSetHeader;
  return { etkilenen: r.affectedRows ?? 0, sonEklenenId: r.insertId ?? 0 };
}

/**
 * Birden çok yazmayı tek işlemde (transaction) yürütür.
 *
 * Aynı kaydın iki yerden değiştirilmesi, poliçe eklerken müşteri kontrolü gibi
 * "ya hep ya hiç" olması gereken işler bunun içinde yapılır.
 */
export async function islem<T>(
  govde: (baglanti: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const baglanti = await getPool().getConnection();
  try {
    await baglanti.beginTransaction();
    const sonuc = await govde(baglanti);
    await baglanti.commit();
    return sonuc;
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

// --- Dönüştürme yardımcıları -------------------------------------------------

/** ISO dizesini MySQL DATETIME değerine çevirir. Geçersizse şimdiki zamanı verir. */
export function isoToDate(iso: string | undefined | null): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** MySQL'den gelen DATETIME değerini ISO dizesine çevirir. */
export function dateToIso(deger: unknown): string {
  if (deger instanceof Date) return deger.toISOString();
  if (typeof deger === 'string' && deger) return new Date(deger).toISOString();
  return new Date(0).toISOString();
}

/** 'YYYY-MM-DD' bekleyen DATE sütunları için: boş dize NULL olarak yazılır. */
export function tarihVeyaNull(deger: string | undefined | null): string | null {
  const t = (deger || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

/** Boş dizeyi NULL'a çevirir; "girilmedi" ile "boş bırakıldı" ayrımı korunur. */
export function metinVeyaNull(deger: string | undefined | null): string | null {
  const t = (deger || '').trim();
  return t === '' ? null : t;
}

/** DECIMAL sütunları dize olarak geldiği için sayıya çevirir. */
export function sayiVeyaUndefined(deger: unknown): number | undefined {
  if (deger === null || deger === undefined || deger === '') return undefined;
  const n = typeof deger === 'number' ? deger : Number(deger);
  return Number.isFinite(n) ? n : undefined;
}

/** JSON sütununu güvenle çözer. mysql2 bazı sürümlerde nesne, bazılarında dize döndürür. */
export function jsonCoz<T>(deger: unknown, varsayilan: T): T {
  if (deger === null || deger === undefined) return varsayilan;
  if (typeof deger === 'object') return deger as T;
  if (typeof deger === 'string') {
    try {
      return JSON.parse(deger) as T;
    } catch {
      return varsayilan;
    }
  }
  return varsayilan;
}

/** MySQL TINYINT(1) değerini boolean'a çevirir. */
export function boolCoz(deger: unknown): boolean {
  return deger === 1 || deger === true || deger === '1';
}

/**
 * Bağlantı havuzunu kapatır.
 *
 * Sunucuda çağrılmaz — havuz sürecin ömrü boyunca açık kalmalıdır. Testlerde ise
 * açık havuz Node sürecinin sonlanmasını engellediği için son test bittiğinde çağrılır.
 */
export async function havuzuKapat(): Promise<void> {
  if (!havuz) return;
  const kapatilacak = havuz;
  havuz = null;
  await kapatilacak.end();
}
