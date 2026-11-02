const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', euro: '€', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML to plain text, keeping paragraph and line breaks. */
export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n /g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain text to safe HTML paragraphs. */
export function toParagraphs(text: string, maxChars = 4000): string {
  const t = text.length > maxChars ? `${text.slice(0, maxChars).replace(/\s+\S*$/, '')}…` : text;
  return t.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`).join('');
}

/** First sentence (or the start) of a text, for result cards. */
export function summaryOf(text: string, max = 140): string | undefined {
  const flat = text.replace(/\s+/g, ' ').replace(/^•\s*/, '').trim();
  if (!flat) return undefined;
  const sentence = flat.match(/^.{20,}?[.!;·](\s|$)/)?.[0]?.trim();
  const s = sentence && sentence.length <= max ? sentence : flat;
  return s.length <= max ? s : `${s.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

const GREEK: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

/** URL-safe id: lowercase Latin letters, digits and dashes (Greek is transliterated). */
export function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[α-ως]/g, (c) => GREEK[c] ?? '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'x';
}

/** "19.90 EUR", "1,234.50", "1.234,50 €" and plain numbers. */
export function money(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  let n = String(v).replace(/[^\d.,-]/g, '');
  const dot = n.lastIndexOf('.'), comma = n.lastIndexOf(',');
  if (dot > -1 && comma > -1) n = dot > comma ? n.replace(/,/g, '') : n.replace(/\./g, '').replace(',', '.');
  else if (comma > -1) n = /,\d{1,2}$/.test(n) ? n.replace(',', '.') : n.replace(/,/g, '');
  else if (/^\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, ''); // 1.234 = one thousand
  const x = parseFloat(n);
  return Number.isFinite(x) ? x : undefined;
}

export const isHttpUrl = (s?: string) => !!s && /^https?:\/\/[^\s]+$/i.test(s);
