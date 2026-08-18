/**
 * Google servis hesabı ile sunucu taraflı API erişimi.
 *
 * Kimlik bilgisi veritabanında değil, sunucudaki özel bir dosyada tutulur
 * (bkz. GOOGLE_SERVICE_ACCOUNT_FILE). Erişim jetonu bellekte önbelleklenir.
 */
import fs from 'node:fs/promises';
import { SignJWT, importPKCS8 } from 'jose';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const JWT_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const TOKEN_LIFETIME_SECONDS = 3600;
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 15_000;

export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
export const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

interface CachedToken {
  value: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();
let credentialsCache: ServiceAccountKey | null = null;

export class GoogleApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'GoogleApiError';
    this.status = status;
  }
}

function getCredentialsPath(): string {
  const configured = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim();
  if (!configured) {
    throw new GoogleApiError('GOOGLE_SERVICE_ACCOUNT_FILE tanımlı değil.', 503);
  }
  return configured;
}

async function loadCredentials(): Promise<ServiceAccountKey> {
  if (credentialsCache) return credentialsCache;

  const path = getCredentialsPath();
  let raw: string;
  try {
    raw = await fs.readFile(path, 'utf8');
  } catch {
    throw new GoogleApiError('Servis hesabı anahtar dosyası okunamadı.', 503);
  }

  let parsed: Partial<ServiceAccountKey>;
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccountKey>;
  } catch {
    throw new GoogleApiError('Servis hesabı anahtar dosyası geçerli JSON değil.', 503);
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new GoogleApiError('Servis hesabı anahtarında client_email veya private_key yok.', 503);
  }

  credentialsCache = { client_email: parsed.client_email, private_key: parsed.private_key };
  return credentialsCache;
}

/** İstenen kapsam için erişim jetonu üretir; süresi dolana kadar önbellekten döner. */
async function getAccessToken(scope: string): Promise<string> {
  const cached = tokenCache.get(scope);
  if (cached && cached.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) {
    return cached.value;
  }

  const credentials = await loadCredentials();
  const privateKey = await importPKCS8(credentials.private_key.replace(/\\n/g, '\n'), 'RS256');

  const assertion = await new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(credentials.client_email)
    .setAudience(TOKEN_ENDPOINT)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_LIFETIME_SECONDS}s`)
    .sign(privateKey);

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: JWT_GRANT_TYPE, assertion }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new GoogleApiError('Google erişim jetonu alınamadı.', 502);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new GoogleApiError('Google yanıtında erişim jetonu yok.', 502);
  }

  tokenCache.set(scope, {
    value: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? TOKEN_LIFETIME_SECONDS) * 1000,
  });

  return payload.access_token;
}

/** Yetkilendirilmiş POST isteği atar ve JSON gövdeyi döndürür. */
export async function callGoogleApi<T>(url: string, scope: string, body: unknown): Promise<T> {
  const token = await getAccessToken(scope);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    // Google'ın ayrıntılı hata gövdesi istemciye sızdırılmaz; sadece durum kodu taşınır.
    throw new GoogleApiError(
      response.status === 403
        ? 'Servis hesabının bu kaynağa erişim yetkisi yok.'
        : 'Google API isteği başarısız oldu.',
      response.status === 403 ? 403 : 502,
    );
  }

  return (await response.json()) as T;
}

export function isGoogleApiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim());
}
