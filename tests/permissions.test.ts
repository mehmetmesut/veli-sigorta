import { kullaniciKaydet, kullanicilariGetir } from '../lib/repo-ops';
import { testVeritabaniniDogrula } from './db-guard';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import {
  canChangeAdminPassword,
  canManageRestrictedSettings,
  canManageUsers,
  isRestrictedEntity,
} from '../lib/permissions';
import { consumeRateLimit } from '../lib/rate-limit';

async function prepareEnvironment(): Promise<void> {
  testVeritabaniniDogrula();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'veli-perm-test-'));
  Object.assign(process.env, { NODE_ENV: 'test' });
  process.env.DB_PATH = path.join(tempDir, `${randomUUID()}.json`);
  process.env.JWT_SECRET = 'test-jwt-secret-value-with-at-least-thirty-two-bytes';
  process.env.ANALYTICS_SALT = 'test-analytics-salt-with-at-least-thirty-two-bytes';
  process.env.ADMIN_EMAILS = 'admin@velisigorta.com.tr';
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('Strong-password-123!', 10);

  // Test veritabani bostur; kimlik dogrulama tekil kaydi testin kendisi tarafindan hazirlanir.
  const { tekilKaydet } = await import('../lib/repo-content');
  const { createSuperAdminAccount } = await import('../lib/superadmin');
  await tekilKaydet('auth', {
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
    superAdmin: createSuperAdminAccount(),
  });
}

test('restricted settings can only be edited by superadmin and admin', () => {
  // Arrange & Act & Assert
  assert.equal(canManageRestrictedSettings('superadmin'), true);
  assert.equal(canManageRestrictedSettings('admin'), true);
  assert.equal(canManageRestrictedSettings('user'), false);

  assert.equal(canManageUsers('superadmin'), true);
  assert.equal(canManageUsers('admin'), true);
  assert.equal(canManageUsers('user'), false);
});

test('shared admin password can only be changed by superadmin and admin', () => {
  // Arrange & Act & Assert
  // "user" rolü bu ucu çağırabilseydi, yanlış parolada dönen 401 ile doğru
  // parolada dönen 200 arasındaki farkı kullanarak parolayı tahmin edebilirdi.
  assert.equal(canChangeAdminPassword('superadmin'), true);
  assert.equal(canChangeAdminPassword('admin'), true);
  assert.equal(canChangeAdminPassword('user'), false);
});

test('admin password attempts are rate limited per client', () => {
  // Arrange
  const policy = { limit: 5, windowMs: 15 * 60 * 1000 };
  const key = 'admin-password:test-client';
  const start = 1_000_000;

  // Act
  const sonuclar = Array.from({ length: 6 }, (_, index) =>
    consumeRateLimit(key, policy, start + index),
  );

  // Assert
  assert.deepEqual(
    sonuclar.map((r) => r.allowed),
    [true, true, true, true, true, false],
  );
  assert.ok(sonuclar[5].retryAfterSeconds > 0);

  // Pencere dolduğunda sayaç sıfırlanır.
  const pencereSonrasi = consumeRateLimit(key, policy, start + policy.windowMs + 1);
  assert.equal(pencereSonrasi.allowed, true);
});

test('only settings and companyInfo are restricted entities', () => {
  // Arrange & Act & Assert
  assert.equal(isRestrictedEntity('settings'), true);
  assert.equal(isRestrictedEntity('companyInfo'), true);
  assert.equal(isRestrictedEntity('campaigns'), false);
  assert.equal(isRestrictedEntity('blogs'), false);
  assert.equal(isRestrictedEntity('services'), false);
});

test('system user session carries its own role', async () => {
  // Arrange
  await prepareEnvironment();
  const auth = await import('../lib/auth');
  const database = await import('../lib/db');

  const passwordHash = await bcrypt.hash('Personel-parola-123', 10);
  await kullaniciKaydet(
      {
        id: 'user-1',
        name: 'Personel',
        email: 'personel@velisigorta.com.tr',
        role: 'user',
        passwordHash,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
  );

  // Act
  const token = await auth.createSessionToken('personel@velisigorta.com.tr');
  const session = await auth.verifySessionToken(token);

  // Assert
  assert.deepEqual(session, { email: 'personel@velisigorta.com.tr', role: 'user' });
  assert.equal(canManageRestrictedSettings(session!.role), false);
});

test('deactivating a system user invalidates the existing session', async () => {
  // Arrange
  await prepareEnvironment();
  const auth = await import('../lib/auth');
  const database = await import('../lib/db');

  const passwordHash = await bcrypt.hash('Personel-parola-123', 10);
  await kullaniciKaydet(
      {
        id: 'user-2',
        name: 'Personel',
        email: 'pasif@velisigorta.com.tr',
        role: 'admin',
        passwordHash,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
  );

  const token = await auth.createSessionToken('pasif@velisigorta.com.tr');
  assert.ok(await auth.verifySessionToken(token));

  // Act — hesabı pasife al.
  for (const u of await kullanicilariGetir()) await kullaniciKaydet({ ...u, isActive: false });

  // Assert
  assert.equal(await auth.verifySessionToken(token), null);
});

test('changing a system user password invalidates the existing session', async () => {
  // Arrange
  await prepareEnvironment();
  const auth = await import('../lib/auth');
  const database = await import('../lib/db');

  await kullaniciKaydet(
      {
        id: 'user-3',
        name: 'Personel',
        email: 'parola@velisigorta.com.tr',
        role: 'user',
        passwordHash: await bcrypt.hash('Ilk-parola-123', 10),
        isActive: true,
        createdAt: new Date().toISOString(),
      },
  );

  const token = await auth.createSessionToken('parola@velisigorta.com.tr');
  assert.ok(await auth.verifySessionToken(token));

  // Act
  const yeniHash = await bcrypt.hash('Ikinci-parola-456', 10);
  for (const u of await kullanicilariGetir()) await kullaniciKaydet({ ...u, passwordHash: yeniHash });

  // Assert
  assert.equal(await auth.verifySessionToken(token), null);
});

// Açık MySQL havuzu Node sürecinin sonlanmasını engeller; son testten sonra kapatılır.
test('bağlantı havuzu kapatılır', async () => {
  const { havuzuKapat } = await import('../lib/mysql');
  await havuzuKapat();
});
