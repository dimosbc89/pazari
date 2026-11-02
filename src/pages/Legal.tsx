import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { SITE } from '../config';
import { cookiesPolicy, privacyPolicy, type LegalBlock, type LegalPage } from '../content/legal';
import { contactPage, rankingPage } from '../content/pages';
import { shopTerms, termsOfUse } from '../content/terms';
import { useLocale } from '../i18n';
import { useDocumentTitle } from '../lib/hooks';

export type PageKind = 'privacy' | 'cookies' | 'terms' | 'shopTerms' | 'ranking' | 'contact';

const PAGES: Record<PageKind, Record<'el' | 'en', LegalPage>> = {
  privacy: privacyPolicy,
  cookies: cookiesPolicy,
  terms: termsOfUse,
  shopTerms,
  ranking: rankingPage,
  contact: contactPage,
};

/**
 * Company details are written once in src/config.ts (SITE.company). Until they are
 * filled in, the [PLACEHOLDERS] stay visible (highlighted) on every page.
 */
function fillCompany(text: string): string {
  const c = SITE.company;
  const real = (v: string) => (v && !v.startsWith('[') ? v : null);
  const map: Record<string, string | null> = {
    '[COMPANY LEGAL NAME]': real(c.legalName),
    '[ADDRESS]': real(c.address),
    '[GEMI NUMBER]': real(c.gemi),
    '[VAT NUMBER]': real(c.vat),
    '[CUSTOMER SERVICE PHONE]': real(c.phone),
    '[OPENING HOURS]': real(c.hours),
    '[CONTACT EMAIL]': real(c.email) ? `[${c.email}](mailto:${c.email})` : null,
  };
  return text.replace(/\[[A-Z][A-Z0-9 _-]+\]/g, (m) => map[m] ?? m);
}

/** **bold**, [link](/path or mailto:…) and highlighted [PLACEHOLDERS]. */
function rich(text: string, path: (p: string) => string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|\[[A-Z][A-Z0-9 _-]+\])/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{rich(part.slice(2, -2), path)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const [, label, href] = link;
      return href.startsWith('/') ? <Link key={i} to={path(href)}>{label}</Link> : <a key={i} href={href}>{label}</a>;
    }
    if (/^\[[A-Z]/.test(part)) return <mark key={i} className="placeholder">{part}</mark>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Block({ b, path }: { b: LegalBlock; path: (p: string) => string }) {
  const r = (s: string) => rich(fillCompany(s), path);
  switch (b.type) {
    case 'h2': return <h2>{r(b.text)}</h2>;
    case 'h3': return <h3>{r(b.text)}</h3>;
    case 'p': return <p>{r(b.text)}</p>;
    case 'ul': return <ul>{b.items.map((it, i) => <li key={i}>{r(it)}</li>)}</ul>;
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead><tr>{b.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{r(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
  }
}

/** Text pages: legal documents, how ranking works, contact. */
export function Legal({ kind }: { kind: PageKind }) {
  const { lang, path } = useLocale();
  const page = PAGES[kind][lang];
  useDocumentTitle(`${page.title} · Tagora`);
  return (
    <>
      <Header />
      <main className="legal container">
        <article>
          <h1>{page.title}</h1>
          {page.updated && <p className="legal-updated">{rich(fillCompany(page.updated), path)}</p>}
          <p className="legal-intro">{rich(fillCompany(page.intro), path)}</p>
          {page.blocks.map((b, i) => <Block key={i} b={b} path={path} />)}
        </article>
      </main>
      <Footer />
    </>
  );
}
