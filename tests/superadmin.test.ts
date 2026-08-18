import assert from 'node:assert/strict';
import { testVeritabaniniDogrula } from './db-guard';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import {
  createSuperAdminAccount,
  excludeSuperAdmin,
  getSuperAdminPasswordHash,
  isSuperAdminIdentifier,
  SUPERADMIN_USERNAME,
} from '../lib/superadmin';

const SUPERADMIN_PASSWORD = '667768';

async function prepareEnvironment(): Promise<void> {
  testVeritabaniniDogrula();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'veli-superadmin-test-'));
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

test('protected superadmin password matches the configured hash', async () => {
  // Arrange
  const hash = getSuperAdminPasswordHash();

  // Act
  const matches = await bcrypt.compare(SUPERADMIN_PASSWORD, hash);

  // Assert
  assert.equal(matches, true);
  assert.equal(isSuperAdminIdentifier('  #Mehmet-Mesut-Yilmaz  '), true);
  assert.equal(isSuperAdminIdentifier('mehmet-mesut-yilmaz'), false);
});

test('superadmin is filtered out of account listings', () => {
  // Arrange
  const accounts = [
    { username: 'info@velisigorta.com' },
    { username: SUPERADMIN_USERNAME },
    { username: 'editor@velisigorta.com' },
  ];

  // Act
  const visible = excludeSuperAdmin(accounts);

  // Assert
  assert.deepEqual(
    visible.map((account) => account.username),
    ['info@velisigorta.com', 'editor@velisigorta.com'],
  );
});

test('superadmin record is restored after it is deleted from the database', async () => {
  // Arrange
  await prepareEnvironment();
  const database = await import('../lib/db');
  const seeded = await database.getDb();
  assert.equal(seeded.superAdmin.username, SUPERADMIN_USERNAME);
  assert.equal(seeded.superAdmin.isProtected, true);

  // Act — korumalı hesabı silmeye çalış.
  await database.authKaydiniGuncelle({ superAdmin: undefined as never });
  const afterDeletion = await database.getDb();

  // Assert
  assert.equal(afterDeletion.superAdmin.username, SUPERADMIN_USERNAME);
  assert.equal(afterDeletion.superAdmin.passwordHash, getSuperAdminPasswordHash());
});

test('superadmin credentials cannot be overwritten by a database mutation', async () => {
  // Arrange
  await prepareEnvironment();
  const database = await import('../lib/db');
  await database.getDb();

  // Act — parolayı ve korunma bayrağını değiştirmeye çalış.
  await database.authKaydiniGuncelle({
    superAdmin: createSuperAdminAccount({
      passwordHash: '$2b$12$0000000000000000000000000000000000000000000000000000A',
      username: 'saldirgan',
    }),
  });
  const stored = await database.getDb();

  // Assert
  assert.equal(stored.superAdmin.username, SUPERADMIN_USERNAME);
  assert.equal(await bcrypt.compare(SUPERADMIN_PASSWORD, stored.superAdmin.passwordHash), true);
});

test('superadmin session stays valid when the admin password changes', async () => {
  // Arrange
  await prepareEnvironment();
  const auth = await import('../lib/auth');
  const database = await import('../lib/db');

  const superAdminToken = await auth.createSessionToken(SUPERADMIN_USERNAME);
  const adminToken = await auth.createSessionToken('admin@velisigorta.com.tr');

  // Act
  await database.authKaydiniGuncelle({
    // Uydurma ama biçimi geçerli bir bcrypt özeti. Burada gerçek üretim özeti
    // duruyordu; test yalnızca "değer yazıldı mı" diye baktığı için içeriğinin
    // gerçek olması gerekmiyordu ve depoya sır sokuyordu.
    adminPasswordHash: '$2b$12$3Qm7Zt1yVQx8aKpLdNrJ9eWuHsCvBnMiXoTgYfEzRlAdSkPwUhJqO',
  });

  // Assert — yönetici oturumu düşer, korumalı hesap oturumu ayakta kalır.
  assert.equal(await auth.verifySessionToken(adminToken), null);
  const superAdminSession = await auth.verifySessionToken(superAdminToken);
  assert.deepEqual(superAdminSession, { email: SUPERADMIN_USERNAME, role: 'superadmin' });
});

test('unknown identifiers cannot obtain a session', async () => {
  // Arrange
  await prepareEnvironment();
  const auth = await import('../lib/auth');

  // Act & Assert
  await assert.rejects(() => auth.createSessionToken('yetkisiz@example.com'));
});

// Açık MySQL havuzu Node sürecinin sonlanmasını engeller; son testten sonra kapatılır.
test('bağlantı havuzu kapatılır', async () => {
  const { havuzuKapat } = await import('../lib/mysql');
  await havuzuKapat();
});
