import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getDb } from './db';
import { kullaniciGetirEposta, kullaniciKaydet } from './repo-ops';
import { authKaydiniGuncelle } from './db';
import {
  getSuperAdminPasswordHash,
  isSuperAdminIdentifier,
  SUPERADMIN_ROLE,
} from './superadmin';

const COOKIE_NAME = 'veli_cms_session';
const JWT_ISSUER = 'velisigorta-cms';
const JWT_AUDIENCE = 'velisigorta-admin';
const ADMIN_ROLE = 'admin';
const USER_ROLE = 'user';
const SESSION_DURATION_SECONDS = 60 * 60 * 24;
const developmentJwtSecret = randomBytes(32);

export type AdminRole = typeof ADMIN_ROLE | typeof USER_ROLE | typeof SUPERADMIN_ROLE;

const GECERLI_ROLLER: readonly string[] = [ADMIN_ROLE, USER_ROLE, SUPERADMIN_ROLE];

export interface AdminSession {
  email: string;
  role: AdminRole;
}

/**
 * Sistem kullanıcısını e-postaya göre bulur.
 *
 * Doğrudan indeksten tek satır okur; eskiden tüm kullanıcı listesi (ve onunla birlikte
 * tüm veritabanı) belleğe alınıp JavaScript'te taranıyordu.
 */
async function findSystemUser(email: string) {
  const kullanici = await kullaniciGetirEposta(email);
  return kullanici && kullanici.isActive ? kullanici : undefined;
}

function getPasswordSessionVersion(passwordHash: string): string {
  return createHmac('sha256', getJwtSecret())
    .update(passwordHash)
    .digest('base64url');
}

function safelyEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getJwtSecret(): Uint8Array {
  const configuredSecret = process.env.JWT_SECRET?.trim();

  if (configuredSecret) {
    const encodedSecret = new TextEncoder().encode(configuredSecret);
    if (encodedSecret.byteLength < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes.');
    }
    return encodedSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  return developmentJwtSecret;
}

function getConfiguredAdminEmails(): Set<string> {
  const emails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

  if (emails.length === 0) {
    throw new Error('ADMIN_EMAILS must contain at least one email address.');
  }

  return new Set(emails);
}

function isConfiguredAdmin(email: string): boolean {
  return getConfiguredAdminEmails().has(normalizeEmail(email));
}

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

async function getAdminPasswordHash(): Promise<string> {
  const db = await getDb();
  const passwordHash = db.adminPasswordHash?.trim();
  if (!passwordHash || !isBcryptHash(passwordHash)) {
    throw new Error('The database administrator password hash is missing or invalid.');
  }
  return passwordHash;
}

function signSession(
  identifier: string,
  role: AdminRole,
  sessionVersion: string,
): Promise<string> {
  return new SignJWT({ email: identifier, role, sessionVersion })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(identifier)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function createSessionToken(
  email: string,
  passwordHash?: string,
): Promise<string> {
  const normalizedEmail = normalizeEmail(email);

  if (isSuperAdminIdentifier(normalizedEmail)) {
    return signSession(
      normalizedEmail,
      SUPERADMIN_ROLE,
      getPasswordSessionVersion(getSuperAdminPasswordHash()),
    );
  }

  // Panelden tanımlanan sistem kullanıcıları kendi parola hash'leriyle imzalanır;
  // parolası değişince oturumu kendiliğinden düşer.
  const systemUser = await findSystemUser(normalizedEmail);
  if (systemUser) {
    return signSession(
      normalizedEmail,
      systemUser.role,
      getPasswordSessionVersion(systemUser.passwordHash),
    );
  }

  if (!isConfiguredAdmin(normalizedEmail)) {
    throw new Error('Cannot create a session for an unconfigured administrator.');
  }

  const sessionVersion = getPasswordSessionVersion(passwordHash ?? await getAdminPasswordHash());
  return signSession(normalizedEmail, ADMIN_ROLE, sessionVersion);
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (
      typeof payload.role !== 'string' ||
      !GECERLI_ROLLER.includes(payload.role) ||
      typeof payload.email !== 'string' ||
      typeof payload.sessionVersion !== 'string' ||
      payload.sub !== payload.email
    ) {
      return null;
    }

    const email = normalizeEmail(payload.email);
    if (email !== payload.email) return null;

    if (payload.role === SUPERADMIN_ROLE) {
      if (!isSuperAdminIdentifier(email)) return null;

      const expectedSuperVersion = getPasswordSessionVersion(getSuperAdminPasswordHash());
      if (!safelyEqual(payload.sessionVersion, expectedSuperVersion)) return null;

      return { email, role: SUPERADMIN_ROLE };
    }

    // Sistem kullanıcısı: rol ve oturum sürümü her istekte veritabanından doğrulanır.
    // Böylece kullanıcı pasife alınır, silinir ya da rolü değişirse oturum düşer.
    const systemUser = await findSystemUser(email);
    if (systemUser) {
      if (systemUser.role !== payload.role) return null;

      const expectedUserVersion = getPasswordSessionVersion(systemUser.passwordHash);
      if (!safelyEqual(payload.sessionVersion, expectedUserVersion)) return null;

      return { email, role: systemUser.role };
    }

    // Sistem kullanıcısı değilse yalnızca env'de tanımlı eski yönetici olabilir.
    if (payload.role !== ADMIN_ROLE) return null;
    if (!isConfiguredAdmin(email)) return null;

    const expectedVersion = getPasswordSessionVersion(await getAdminPasswordHash());
    if (!safelyEqual(payload.sessionVersion, expectedVersion)) return null;

    return { email, role: ADMIN_ROLE };
  } catch {
    return null;
  }
}

export async function getCurrentAdmin(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

export async function loginAdmin(email: string, passwordInput: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);

  if (isSuperAdminIdentifier(normalizedEmail)) {
    const isSuperAdminValid = await bcrypt.compare(passwordInput, getSuperAdminPasswordHash());
    if (!isSuperAdminValid) return false;

    await setSessionCookie(await createSessionToken(normalizedEmail));
    return true;
  }

  // Panelden tanımlanan sistem kullanıcıları kendi parolalarıyla giriş yapar.
  const systemUser = await findSystemUser(normalizedEmail);
  if (systemUser) {
    const isSystemUserValid = await bcrypt.compare(passwordInput, systemUser.passwordHash);
    if (!isSystemUserValid) return false;

    await setSessionCookie(await createSessionToken(normalizedEmail));
    return true;
  }

  const isAllowedEmail = isConfiguredAdmin(normalizedEmail);
  const passwordHash = await getAdminPasswordHash();
  const isValid = await bcrypt.compare(passwordInput, passwordHash);
  if (!isAllowedEmail || !isValid) return false;

  await setSessionCookie(await createSessionToken(normalizedEmail, passwordHash));
  return true;
}

export async function verifyAdminPassword(passwordInput: string): Promise<boolean> {
  return bcrypt.compare(passwordInput, await getAdminPasswordHash());
}

/**
 * Oturum açmış kişinin KENDİ parolasını değiştirmesinin sonucu.
 *
 * Neden ayrık birleşim: çağıran tarafın her durumu farklı HTTP koduyla
 * karşılaması gerekiyor (401 yanlış parola, 400 aynı parola, 409 desteklenmiyor)
 * ve bunları `boolean` ile ayırt etmek mümkün değildi.
 */
export type KendiParolaSonucu =
  | { durum: 'tamam'; paylasilanParola: boolean }
  | { durum: 'mevcut-yanlis' }
  | { durum: 'ayni-parola' }
  | { durum: 'desteklenmiyor'; mesaj: string };

/**
 * Oturum açmış kişinin kendi parolasını değiştirir.
 *
 * ÜÇ HESAP TÜRÜ VAR ve üçü farklı yerde saklanır:
 *  - **Süper yönetici:** parola özeti derleme sırasında gömülür, çalışma anında
 *    değiştirilemez. Sessizce başarısız olmak yerine açık bir mesaj döner.
 *  - **Sistem kullanıcısı:** `system_users` tablosunda kendi özeti vardır; yalnız
 *    kendi satırı güncellenir.
 *  - **Ortak yönetici hesabı (env'deki `ADMIN_EMAILS`):** TEK bir paylaşılan özet
 *    kullanır. Değiştirmek bu hesabı kullanan HERKESİ etkiler; çağırana
 *    `paylasilanParola` ile bildirilir ki ekranda uyarı gösterilebilsin.
 */
export async function kendiParolasiniDegistir(
  session: AdminSession,
  mevcutParola: string,
  yeniParola: string,
): Promise<KendiParolaSonucu> {
  const email = normalizeEmail(session.email);

  if (isSuperAdminIdentifier(email)) {
    return {
      durum: 'desteklenmiyor',
      mesaj:
        'Süper yönetici parolası uygulama yapılandırmasında tanımlıdır ve panelden değiştirilemez.',
    };
  }

  const systemUser = await findSystemUser(email);
  if (systemUser) {
    if (!(await bcrypt.compare(mevcutParola, systemUser.passwordHash))) {
      return { durum: 'mevcut-yanlis' };
    }
    if (await bcrypt.compare(yeniParola, systemUser.passwordHash)) {
      return { durum: 'ayni-parola' };
    }
    await kullaniciKaydet({ ...systemUser, passwordHash: await bcrypt.hash(yeniParola, 12) });
    return { durum: 'tamam', paylasilanParola: false };
  }

  if (!isConfiguredAdmin(email)) {
    return {
      durum: 'desteklenmiyor',
      mesaj: 'Bu hesabın parolası panelden yönetilmiyor.',
    };
  }

  if (!(await verifyAdminPassword(mevcutParola))) return { durum: 'mevcut-yanlis' };
  if (await verifyAdminPassword(yeniParola)) return { durum: 'ayni-parola' };

  await authKaydiniGuncelle({ adminPasswordHash: await bcrypt.hash(yeniParola, 12) });
  return { durum: 'tamam', paylasilanParola: true };
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
