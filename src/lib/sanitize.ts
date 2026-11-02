// Product descriptions come from merchants' feeds. Before they go into the page,
// keep only simple formatting tags (no attributes, no links, no scripts).
const ALLOWED = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I']);

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const clean = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const d = document.createElement('div');
      d.textContent = node.textContent ?? '';
      return d.innerHTML;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as Element;
    const inner = [...el.childNodes].map(clean).join('');
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(el.tagName)) return '';
    if (!ALLOWED.has(el.tagName)) return inner;
    const tag = el.tagName.toLowerCase();
    return tag === 'br' ? '<br>' : `<${tag}>${inner}</${tag}>`;
  };
  return [...doc.body.firstChild!.childNodes].map(clean).join('');
}
