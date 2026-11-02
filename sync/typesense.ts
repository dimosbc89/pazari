// Server-side Typesense calls (admin key). Never import this from the website code.
import schema from '../shared/typesense-schema.json' with { type: 'json' };
import type { Product } from './types.ts';

export interface TypesenseAdmin {
  host: string;
  port?: string;
  protocol?: string;
  apiKey: string;
  collection?: string;
}

const esc = (v: string) => '`' + v.replace(/`/g, '') + '`';

export function typesenseClient(cfg: TypesenseAdmin) {
  const base = `${cfg.protocol || 'https'}://${cfg.host}:${cfg.port || '443'}`;
  const name = cfg.collection || 'products';
  const call = async (method: string, path: string, body?: string, contentType = 'application/json') => {
    const res = await fetch(base + path, { method, headers: { 'X-TYPESENSE-API-KEY': cfg.apiKey, 'Content-Type': contentType }, body });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  };

  return {
    /** Creates the collection, or adds fields that a newer version of the schema needs. */
    async ensureCollection() {
      const got = await call('GET', `/collections/${name}`);
      if (got.status === 404) {
        const r = await call('POST', '/collections', JSON.stringify({ name, ...schema }));
        if (!r.ok) throw new Error(`Typesense: could not create collection (${r.status} ${r.text.slice(0, 200)})`);
        return 'created';
      }
      if (!got.ok) throw new Error(`Typesense: ${got.status} ${got.text.slice(0, 200)}`);
      const have = new Set((JSON.parse(got.text).fields as { name: string }[]).map((f) => f.name));
      const missing = schema.fields.filter((f) => !have.has(f.name));
      if (missing.length) {
        const r = await call('PATCH', `/collections/${name}`, JSON.stringify({ fields: missing }));
        if (!r.ok) throw new Error(`Typesense: could not update schema (${r.status} ${r.text.slice(0, 200)})`);
        return 'updated';
      }
      return 'ok';
    },

    /** Upserts in batches. Returns how many documents failed and the first errors. */
    async upsert(products: Product[], batchSize = 2000) {
      let failed = 0;
      const errors: string[] = [];
      for (let i = 0; i < products.length; i += batchSize) {
        const jsonl = products.slice(i, i + batchSize).map((p) => JSON.stringify(p)).join('\n');
        const r = await call('POST', `/collections/${name}/documents/import?action=upsert`, jsonl, 'text/plain');
        if (!r.ok) throw new Error(`Typesense import failed (${r.status} ${r.text.slice(0, 200)})`);
        for (const line of r.text.split('\n')) {
          if (!line) continue;
          const res = JSON.parse(line) as { success: boolean; error?: string };
          if (!res.success) { failed++; if (errors.length < 5 && res.error) errors.push(res.error); }
        }
      }
      return { failed, errors };
    },

    async deleteWhere(filter: string): Promise<number> {
      const r = await call('DELETE', `/collections/${name}/documents?filter_by=${encodeURIComponent(filter)}&batch_size=500`);
      if (r.status === 404) return 0;
      if (!r.ok) throw new Error(`Typesense delete failed (${r.status} ${r.text.slice(0, 200)})`);
      return (JSON.parse(r.text) as { num_deleted?: number }).num_deleted ?? 0;
    },

    /** Removes a shop's products that were not in this sync (sold out, deleted). */
    deleteStale(shopId: string, syncId: string) {
      return this.deleteWhere(`shopId:=${esc(shopId)} && syncId:!=${esc(syncId)}`);
    },

    deleteShop(shopId: string) {
      return this.deleteWhere(`shopId:=${esc(shopId)}`);
    },
  };
}
