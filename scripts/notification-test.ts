// Run with: node --test scripts/notification-test.ts
// Exercises real sync failure bookkeeping and notification selection in local D1.
// Every fetch is intercepted; fixture addresses are never contacted.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { getSetting, setSetting } from '../worker/catalogue.ts';
import type { Env } from '../worker/env.ts';
import { alertAdmins, silentSyncShopIds } from '../worker/notifications.ts';
import { getShop, syncShop } from '../worker/shops.ts';
import type { D1Database as CloudflareD1Database, Fetcher as CloudflareFetcher } from '@cloudflare/workers-types';

declare global {
  interface D1Database extends CloudflareD1Database {}
  interface Fetcher extends CloudflareFetcher {}
}

type CapturedMail = { to: string | string[]; subject: string; text: string };

test('silent scheduled failures keep error bookkeeping and preserve notifications for other shops', async (t) => {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: 'export default { fetch() { return new Response("Local tests only"); } }',
    d1Databases: ['DB'], compatibilityDate: '2026-11-01',
  }));
  try {
    const db = await mf.getD1Database('DB') as unknown as Env['DB'];
    const migrationDir = new URL('../migrations/', import.meta.url);
    for (const name of (await fs.readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort()) {
      for (const sql of unstable_splitSqlQuery(await fs.readFile(new URL(name, migrationDir), 'utf8'))) await db.prepare(sql).run();
    }
    const env = {
      DB: db, SITE_URL: 'https://example.test', MAIL_FROM: 'Fixture <sender@fixture.invalid>',
      RESEND_API_KEY: 'fixture-not-a-real-key', ADMIN_EMAILS: 'admin@fixture.invalid',
    } as Env;
    const mail: CapturedMail[] = [];
    let feedFetches = 0;
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url === 'https://example.test/feed.xml') {
        feedFetches++;
        return new Response('Feed unavailable', { status: 503 });
      }
      assert.equal(url, 'https://api.resend.com/emails', 'Unexpected network request');
      mail.push(JSON.parse(String(init?.body)) as CapturedMail);
      return new Response('{"id":"mock-only"}', { status: 200 });
    });
    const seedShop = async (id: string, name: string) => db.prepare(`INSERT INTO shops
      (id, name, website, email, countries, source_type, source_url, status, created_at, last_sync_status)
      VALUES (?, ?, 'https://example.test', ?, '["gr"]', 'feed', 'https://example.test/feed.xml', 'active', '2026-01-01', 'ok')`)
      .bind(id, name, `${id}@fixture.invalid`).run();
    await seedShop('silent-target', 'Silent Target');
    await seedShop('existing-shop', 'Existing Shop');
    const resetShop = async (id: string) => db.prepare("UPDATE shops SET last_sync_status = 'ok' WHERE id = ?").bind(id).run();
    const configure = async (value: string | null) => {
      if (value === null) await db.prepare("DELETE FROM settings WHERE key = 'silent_sync_shop_ids'").run();
      else await setSetting(env, 'silent_sync_shop_ids', value);
    };

    await configure('["silent-target"]');
    const first = await syncShop(env, await getShop(env, 'silent-target'), 'schedule');
    assert.equal(first.status, 'error');
    assert.equal(mail.length, 0, 'Suppressed shop must not call email transport');
    const silent = await getShop(env, 'silent-target');
    assert.equal(silent.last_sync_status, 'error');
    assert.ok(silent.last_sync_at && silent.next_sync_at && Date.parse(silent.next_sync_at) > Date.parse(silent.last_sync_at));
    const run = await db.prepare("SELECT status, finished_at FROM sync_runs WHERE shop_id = 'silent-target'").first<{ status: string; finished_at: string }>();
    assert.equal(run?.status, 'error');
    assert.ok(run?.finished_at);
    assert.equal((await getShop(env, 'existing-shop')).last_sync_status, 'ok');
    await alertAdmins(env);
    assert.equal(mail.length, 0, 'Only suppressed failures must not trigger an admin email');
    assert.equal(await getSetting(env, 'last_alert_at'), null);

    await syncShop(env, await getShop(env, 'existing-shop'), 'schedule');
    assert.equal(mail.length, 1);
    assert.equal(mail[0].to, 'existing-shop@fixture.invalid');
    await syncShop(env, await getShop(env, 'existing-shop'), 'schedule');
    assert.equal(mail.length, 1, 'Repeated failure must retain existing one-time notification behavior');
    await alertAdmins(env);
    assert.equal(mail.length, 2);
    assert.deepEqual(mail[1].to, ['admin@fixture.invalid']);
    assert.ok(mail[1].text.includes('Existing Shop'));
    assert.ok(!mail[1].text.includes('Silent Target'));
    await alertAdmins(env);
    assert.equal(mail.length, 2, 'Daily admin throttle must remain unchanged');

    for (const invalid of [null, '{broken', '{}', '["silent-target", 7]', '["silent-target", ""]']) {
      await configure(invalid);
      assert.deepEqual(await silentSyncShopIds(env), []);
      await resetShop('silent-target');
      const before: number = mail.length;
      await syncShop(env, await getShop(env, 'silent-target'), 'schedule');
      assert.equal(mail.length, before + 1, 'Absent or invalid configuration must preserve existing notification behavior');
      await db.prepare("DELETE FROM settings WHERE key = 'last_alert_at'").run();
      await alertAdmins(env);
      assert.equal(mail.length, before + 2);
      assert.ok(mail.at(-1)!.text.includes('Silent Target'));
      assert.ok(mail.at(-1)!.text.includes('Existing Shop'));
    }
    await configure('["silent-target", "silent-target"]');
    assert.deepEqual(await silentSyncShopIds(env), ['silent-target']);
    await resetShop('silent-target');
    const beforeManual = mail.length;
    await syncShop(env, await getShop(env, 'silent-target'), 'manual');
    assert.equal(mail.length, beforeManual, 'Manual failure must remain silent');

    // Exclusion must happen before the existing LIMIT 50, so unsuppressed shops
    // are still reported when a whole imported batch has failures.
    const batch = Array.from({ length: 50 }, (_, i) => `batch-${i}`);
    for (const id of batch) await seedShop(id, `AAA ${id}`);
    await db.prepare("UPDATE shops SET last_sync_status = 'error'").run();
    await configure(JSON.stringify([...batch, 'silent-target']));
    await db.prepare("DELETE FROM settings WHERE key = 'last_alert_at'").run();
    const beforeBatch = mail.length;
    await alertAdmins(env);
    assert.equal(mail.length, beforeBatch + 1);
    assert.ok(mail.at(-1)!.text.includes('Existing Shop'));
    assert.ok(!mail.at(-1)!.text.includes('AAA batch-'));
    assert.ok(!mail.at(-1)!.text.includes('Silent Target'));
    assert.ok(feedFetches > 0, 'Failure tests must exercise the production fetch path');
  } finally {
    await mf.dispose();
  }
});
