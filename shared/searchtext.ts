// Text helpers for search, shared by the website (demo search) and the Worker (D1 search).

/** Lower case, no accents, final sigma as sigma: "Ακουστικά" -> "ακουστικα". */
export const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');

// Greek to Latin, the way people type "Greeklish" (ακουστικά -> akoustika).
const DIGRAPHS: [RegExp, string][] = [[/ου/g, 'ou'], [/αυ/g, 'av'], [/ευ/g, 'ev'], [/γγ/g, 'ng'], [/γκ/g, 'gk'], [/μπ/g, 'mp'], [/ντ/g, 'nt']];
const GREEK_TO_LATIN: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  ο: 'o', π: 'p', ρ: 'r', σ: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};
/** Latin spelling of folded Greek text; other characters stay as they are. */
export const toLatin = (s: string) => DIGRAPHS.reduce((acc, [re, to]) => acc.replace(re, to), s).replace(/[α-ω]/g, (c) => GREEK_TO_LATIN[c] ?? c);

/** Folded words of a text. */
export const tokens = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Folded words, plus their Latin spelling when a word is Greek. */
export const words = (s: string) => {
  const out = tokens(s);
  for (const w of [...out]) { const l = toLatin(w); if (l !== w) out.push(l); }
  return out;
};

/** Stable pseudo-random number, so "browse all" mixes categories instead of listing one product's sizes. */
export const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** True when a and b differ by at most one edit (insert, delete, substitute, swap). */
export function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length || i === b.length) return Math.abs(a.length - b.length) <= 1;
  if (a.length === b.length) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}
