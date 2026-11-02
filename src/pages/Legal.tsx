import { Fragment, type ReactNode } from 'react';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { cookiesPolicy, privacyPolicy, type LegalBlock } from '../content/legal';
import { useLocale } from '../i18n';
import { useDocumentTitle } from '../lib/hooks';

/** Renders **bold** spans and highlights [PLACEHOLDERS] that must be filled in before launch. */
function rich(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\[[A-Z][A-Z0-9 _-]+\])/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{rich(part.slice(2, -2))}</strong>;
    if (/^\[[A-Z]/.test(part)) return <mark key={i} className="placeholder">{part}</mark>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Block({ b }: { b: LegalBlock }) {
  switch (b.type) {
    case 'h2': return <h2>{rich(b.text)}</h2>;
    case 'h3': return <h3>{rich(b.text)}</h3>;
    case 'p': return <p>{rich(b.text)}</p>;
    case 'ul': return <ul>{b.items.map((it, i) => <li key={i}>{rich(it)}</li>)}</ul>;
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead><tr>{b.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{rich(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
  }
}

export function Legal({ kind }: { kind: 'privacy' | 'cookies' }) {
  const { lang } = useLocale();
  const page = (kind === 'privacy' ? privacyPolicy : cookiesPolicy)[lang];
  useDocumentTitle(`${page.title} · Tagora`);
  return (
    <>
      <Header />
      <main className="legal container">
        <article>
          <h1>{page.title}</h1>
          <p className="legal-updated">{rich(page.updated)}</p>
          <p className="legal-intro">{rich(page.intro)}</p>
          {page.blocks.map((b, i) => <Block key={i} b={b} />)}
        </article>
      </main>
      <Footer />
    </>
  );
}
