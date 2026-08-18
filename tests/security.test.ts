import assert from 'node:assert/strict';
import { testVeritabaniniDogrula } from './db-guard';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { serializeJsonLd } from '../lib/json-ld';
import { sanitizeStoredHtml } from '../lib/html-sanitizer';
import { toSafeCsvCell } from '../lib/csv';
import {
  assertSameOrigin,
  ContentValidationError,
  parseContentEnvelope,
} from '../lib/admin-content-validation';
import { readLimitedJson, RequestBodyError } from '../lib/rate-limit';
import { buildRobotsTxt } from '../lib/robots';

test('JSON-LD serializer prevents script-element breakout', () => {
  const hostile = { title: '</script><script>alert(1)</script>&\u2028' };
  const serialized = serializeJsonLd(hostile);

  assert.equal(serialized.includes('<'), false);
  assert.equal(serialized.includes('</script>'), false);
  assert.deepEqual(JSON.parse(serialized), hostile);
});

test('rich HTML sanitizer uses an allowlist and removes common bypasses', () => {
  const sanitized = sanitizeStoredHtml(`
    <p onclick="alert(1)">Güvenli <strong>metin</strong></p>
    <script>alert(1)</script>
    <img src="data:image/svg+xml,<svg onload=alert(1)>" onerror="alert(1)">
    <a href="jav&#x61;script:alert(1)" style="background:url(javascript:alert(1))">bağlantı</a>
    <iframe srcdoc="<script>alert(1)</script>"></iframe>
  `);

  assert.match(sanitized, /<strong>metin<\/strong>/);
  assert.doesNotMatch(sanitized, /script|onclick|onerror|srcdoc|javascript:|data:/i);
});

test('CSV cells neutralize formulas even after leading whitespace', () => {
  assert.equal(toSafeCsvCell(' =WEBSERVICE("https://example.test")'), '"\' =WEBSERVICE(""https://example.test"")"');
  assert.equal(toSafeCsvCell('@SUM(1,2)'), '"\'@SUM(1,2)"');
  assert.equal(toSafeCsvCell('normal\r\nvalue'), '"normal value"');
});

test('admin envelopes reject unknown fields and foreign origins', () => {
  assert.throws(
    () => parseContentEnvelope({ entity: 'settings', data: {}, unexpected: true }),
    ContentValidationError,
  );

  process.env.APP_URL = 'https://velisigorta.com.tr';
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://internal.test', {
    headers: { origin: 'https://velisigorta.com.tr' },
  })));
  assert.throws(
    () => assertSameOrigin(new Request('https://internal.test', {
      headers: { origin: 'https://evil.example' },
    })),
    (error) => error instanceof ContentValidationError && error.status === 403,
  );
});

test('limited JSON reader rejects oversized bodies', async () => {
  const request = new Request('https://velisigorta.com.tr/api/admin/content', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(512) }),
  });

  await assert.rejects(
    () => readLimitedJson(request, 64),
    (error) => error instanceof RequestBodyError && error.status === 413,
  );
});

test('robots feature flags override managed custom directives', () => {
  const custom = 'User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nSitemap: https://old.example/sitemap.xml';
  const disabled = buildRobotsTxt(custom, false, false, 'https://velisigorta.com.tr');
  assert.doesNotMatch(disabled, /old\.example|Sitemap:/i);
  assert.match(disabled, /User-agent: GPTBot\nDisallow: \//);

  const enabled = buildRobotsTxt(custom, true, true, 'https://velisigorta.com.tr');
  assert.match(enabled, /User-agent: GPTBot\nAllow: \//);
  assert.match(enabled, /Sitemap: https:\/\/velisigorta\.com\.tr\/sitemap\.xml/);
});

test('changing the password invalidates existing admin sessions', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'veli-auth-test-'));
  Object.assign(process.env, { NODE_ENV: 'test' });
  testVeritabaniniDogrula();
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

  const auth = await import('../lib/auth');
  const database = await import('../lib/db');
  const token = await auth.createSessionToken('admin@velisigorta.com.tr');
  assert.ok(await auth.verifySessionToken(token));

  const replacementHash = await bcrypt.hash('Different-password-456!', 10);
  await database.authKaydiniGuncelle({ adminPasswordHash: replacementHash });

  assert.equal(await auth.verifySessionToken(token), null);
});

// Açık MySQL havuzu Node sürecinin sonlanmasını engeller; son testten sonra kapatılır.
test('bağlantı havuzu kapatılır', async () => {
  const { havuzuKapat } = await import('../lib/mysql');
  await havuzuKapat();
});
