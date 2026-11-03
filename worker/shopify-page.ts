// The Tagora app's page inside the Shopify admin (GET /shopify). Shopify shows it in a frame and
// App Bridge (loaded first, from Shopify's CDN) gives it session tokens for /api/shopify/app/*.
// Plain HTML + a little JavaScript: no build step, and it works the same in every admin.
import { escapeHtml } from '../sync/text.ts';
import type { Env } from './env.ts';
import { SHOP_DOMAIN, shopifyConfigured } from './shopify.ts';

const STRINGS = {
  el: {
    title: 'Tagora',
    loading: 'Φόρτωση…',
    outside: 'Άνοιξε το Tagora από τη διαχείριση του Shopify (Εφαρμογές → Tagora).',
    notConfigured: 'Η εφαρμογή δεν έχει ρυθμιστεί ακόμη.',
    error: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.',
    retry: 'Δοκίμασε ξανά',
    introTitle: 'Τα προϊόντα σου στο Tagora',
    intro: 'Το Tagora είναι ελληνική σύγκριση τιμών και συνεργάτης CSS της Google. Κάνε αίτηση εδώ: όταν εγκριθεί, τα προϊόντα σου εμφανίζονται στο tagora.online και ενημερώνονται μόνα τους σε κάθε αλλαγή στο Shopify.',
    price: 'Οι πρώτοι 12 μήνες είναι δωρεάν. Μετά, 19 € τον μήνα + ΦΠΑ. Χωρίς προμήθεια ανά κλικ ή πώληση.',
    name: 'Όνομα καταστήματος',
    email: 'Email επικοινωνίας',
    emailHelp: 'Εδώ θα σου στείλουμε την έγκριση και τους συνδέσμους σύνδεσης στον πίνακα του Tagora.',
    phone: 'Τηλέφωνο (προαιρετικό)',
    countries: 'Χώρες όπου στέλνεις',
    shipping: 'Κόστος αποστολής (€, προαιρετικό)',
    freeOver: 'Δωρεάν αποστολή από (€, προαιρετικό)',
    consentA: 'Αποδέχομαι τους ',
    consentLink: 'Όρους για καταστήματα',
    consentB: ' του Tagora.',
    apply: 'Αίτηση στο Tagora',
    applying: 'Αποστολή…',
    currency: 'Το Tagora δείχνει τιμές σε ευρώ, ενώ το κατάστημά σου χρησιμοποιεί {c}.',
    taxes: 'Οι τιμές του καταστήματος δεν περιλαμβάνουν ΦΠΑ: θα τον προσθέσουμε με τον συντελεστή της χώρας σου.',
    status: { pending: 'Σε αναμονή έγκρισης', active: 'Ενεργό στο Tagora', paused: 'Σε παύση', rejected: 'Δεν εγκρίθηκε' },
    statusHelp: {
      pending: 'Ελέγχουμε την αίτηση, συνήθως μέσα σε 1–2 εργάσιμες. Θα σου στείλουμε email. Τα προϊόντα είναι ήδη έτοιμα και θα εμφανιστούν με την έγκριση.',
      active: 'Τα προϊόντα σου εμφανίζονται στο Tagora και ενημερώνονται σε κάθε αλλαγή.',
      paused: '',
      rejected: '',
    },
    products: 'Προϊόντα στο Tagora',
    lastSync: 'Τελευταίος πλήρης συγχρονισμός',
    never: 'Ακόμη όχι',
    syncing: 'Το Shopify ετοιμάζει τη λίστα προϊόντων…',
    syncNow: 'Συγχρονισμός τώρα',
    syncStarted: 'Ο συγχρονισμός ξεκίνησε',
    dashboard: 'Πίνακας Tagora',
    issues: 'Τι να διορθώσεις',
    issue: {
      missing_id: 'Χωρίς κωδικό', missing_title: 'Χωρίς τίτλο', missing_price: 'Χωρίς τιμή', missing_link: 'Δεν είναι στο Online Store',
      out_of_stock: 'Εξαντλημένα (δεν εμφανίζονται)', duplicate_id: 'Διπλός κωδικός', missing_image: 'Χωρίς φωτογραφία',
      missing_brand: 'Χωρίς μάρκα (Vendor)', missing_identifier: 'Χωρίς barcode (EAN)', truncated: 'Πάρα πολλά προϊόντα',
    },
    issueHelp: 'Τα barcode (EAN) και η μάρκα (Vendor) βοηθούν να εμφανίζεται το προϊόν σου δίπλα στα ίδια προϊόντα άλλων καταστημάτων.',
  },
  en: {
    title: 'Tagora',
    loading: 'Loading…',
    outside: 'Open Tagora from your Shopify admin (Apps → Tagora).',
    notConfigured: 'The app is not set up yet.',
    error: 'Something went wrong. Please try again.',
    retry: 'Try again',
    introTitle: 'Your products on Tagora',
    intro: 'Tagora is a Greek price comparison site and a Google CSS partner. Apply here: once approved, your products appear on tagora.online and update by themselves with every change in Shopify.',
    price: 'The first 12 months are free. After that, €19 a month + VAT. No fee per click or sale.',
    name: 'Shop name',
    email: 'Contact email',
    emailHelp: 'We send the approval and the sign-in links for your Tagora dashboard here.',
    phone: 'Phone (optional)',
    countries: 'Countries you deliver to',
    shipping: 'Delivery cost (€, optional)',
    freeOver: 'Free delivery from (€, optional)',
    consentA: 'I accept the Tagora ',
    consentLink: 'terms for shops',
    consentB: '.',
    apply: 'Apply to Tagora',
    applying: 'Sending…',
    currency: 'Tagora shows prices in euro, but your store uses {c}.',
    taxes: 'Your store prices do not include VAT: we add it at your country\'s rate.',
    status: { pending: 'Waiting for approval', active: 'Live on Tagora', paused: 'Paused', rejected: 'Not approved' },
    statusHelp: {
      pending: 'We review applications within 1–2 working days and will email you. Your products are ready and appear once approved.',
      active: 'Your products are on Tagora and update with every change.',
      paused: '',
      rejected: '',
    },
    products: 'Products on Tagora',
    lastSync: 'Last full sync',
    never: 'Not yet',
    syncing: 'Shopify is preparing the product list…',
    syncNow: 'Sync now',
    syncStarted: 'Sync started',
    dashboard: 'Tagora dashboard',
    issues: 'What to fix',
    issue: {
      missing_id: 'No id', missing_title: 'No title', missing_price: 'No price', missing_link: 'Not on the Online Store',
      out_of_stock: 'Sold out (not shown)', duplicate_id: 'Duplicate id', missing_image: 'No image',
      missing_brand: 'No brand (Vendor)', missing_identifier: 'No barcode (EAN)', truncated: 'Too many products',
    },
    issueHelp: 'Barcodes (EAN) and the brand (Vendor) let your product appear next to the same product from other shops.',
  },
};

const COUNTRY_NAMES: Record<'el' | 'en', Record<string, string>> = {
  el: { gr: 'Ελλάδα', cy: 'Κύπρος', ie: 'Ιρλανδία', mt: 'Μάλτα' },
  en: { gr: 'Greece', cy: 'Cyprus', ie: 'Ireland', mt: 'Malta' },
};

const CSS = `
:root{color-scheme:light;--bg:#f1f1f1;--card:#fff;--ink:#303030;--muted:#616161;--line:#e3e3e3;--accent:#C9361A;--ok:#0c7a43;--warn:#8a6100;--bad:#b42318}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"San Francisco","Segoe UI",Roboto,"Helvetica Neue",sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 40px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:0 0 10px}
.card{background:var(--card);border-radius:12px;box-shadow:0 1px 0 rgba(0,0,0,.07),0 0 0 1px rgba(0,0,0,.04);padding:18px;margin:14px 0}
.muted{color:var(--muted)}.small{font-size:13px}label{display:block;font-weight:600;margin:12px 0 4px}
input[type=text],input[type=email],input[type=tel],input[type=number]{width:100%;padding:8px 10px;border:1px solid #8a8a8a;border-radius:8px;font:inherit}
input:focus{outline:2px solid #005bd3;outline-offset:1px}.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:520px){.row{grid-template-columns:1fr}}
.checks{display:flex;flex-wrap:wrap;gap:6px 16px}.checks label,.consent{font-weight:400;display:flex;gap:8px;align-items:flex-start;margin:6px 0}
button,.btn{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:8px;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer;background:#303030;color:#fff;text-decoration:none}
.btn--ghost{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1px #8a8a8a}button:disabled{opacity:.55;cursor:default}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.badge{display:inline-block;border-radius:999px;padding:2px 10px;font-size:13px;font-weight:600}.badge--pending{background:#fff1c7;color:var(--warn)}.badge--active{background:#cdfee1;color:var(--ok)}
.badge--paused,.badge--rejected{background:#fee8e7;color:var(--bad)}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:12px}
.stat{border:1px solid var(--line);border-radius:10px;padding:10px 12px}.stat b{display:block;font-size:20px}.note{border-radius:10px;padding:10px 12px;margin:10px 0;background:#eaf4ff}
.note--bad{background:#fee8e7;color:var(--bad)}.note--warn{background:#fff1c7}ul.issues{margin:6px 0 0;padding-left:18px}.brand{font-weight:800;letter-spacing:-.4px}.brand span{color:#EF4A23}
.spin{display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:s 0.8s linear infinite;vertical-align:-2px}@keyframes s{to{transform:rotate(360deg)}}
`;

/** The script of the page; strings and settings arrive in window.TAGORA. */
const SCRIPT = `
(function(){
  var T = window.TAGORA, S = T.s, root = document.getElementById('app'), state = null, busy = false, polls = 0;
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function toast(msg, isError){ try { shopify.toast.show(msg, { isError: !!isError }); } catch (e) {} }
  function when(iso){ if (!iso) return S.never; try { return new Date(iso).toLocaleString(T.lang === 'el' ? 'el-GR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; } }
  async function api(path, body){
    for (var attempt = 0; attempt < 2; attempt++) {
      var token = await shopify.idToken();
      var res = await fetch('/api/shopify/app/' + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
      if (res.status === 401 && res.headers.get('X-Shopify-Retry-Invalid-Session-Request') && attempt === 0) continue;
      var data = await res.json().catch(function(){ return { ok: false }; });
      if (!res.ok || !data.ok) { var err = new Error(data.message || S.error); err.code = data.code; throw err; }
      return data;
    }
  }
  function form(st){
    var s = st.store, warn = '';
    if (s.currency && s.currency !== 'EUR') warn += '<div class="note note--bad">' + esc(S.currency.replace('{c}', s.currency)) + '</div>';
    if (!s.taxesIncluded) warn += '<div class="note note--warn">' + esc(S.taxes) + '</div>';
    var countries = st.markets.map(function(c){ return '<label><input type="checkbox" name="countries" value="' + c + '"' + (c === 'gr' ? ' checked' : '') + '> ' + esc(T.countries[c] || c) + '</label>'; }).join('');
    return '<div class="card"><h1>' + esc(S.introTitle) + '</h1><p>' + esc(S.intro) + '</p><p class="muted small">' + esc(S.price) + '</p>' + warn +
      '<form id="apply" novalidate>' +
      '<label for="f-name">' + esc(S.name) + '</label><input type="text" id="f-name" name="name" required maxlength="80" value="' + esc(s.name) + '">' +
      '<label for="f-email">' + esc(S.email) + '</label><input type="email" id="f-email" name="email" required value="' + esc(s.email) + '"><div class="muted small">' + esc(S.emailHelp) + '</div>' +
      '<label for="f-phone">' + esc(S.phone) + '</label><input type="tel" id="f-phone" name="phone" maxlength="40">' +
      '<label>' + esc(S.countries) + '</label><div class="checks">' + countries + '</div>' +
      '<div class="row"><div><label for="f-ship">' + esc(S.shipping) + '</label><input type="number" id="f-ship" name="defaultShipping" min="0" step="0.01" inputmode="decimal"></div>' +
      '<div><label for="f-free">' + esc(S.freeOver) + '</label><input type="number" id="f-free" name="freeShippingOver" min="0" step="0.01" inputmode="decimal"></div></div>' +
      '<label class="consent"><input type="checkbox" name="consent" required> <span>' + esc(S.consentA) + '<a href="' + esc(st.termsUrl) + '" target="_blank" rel="noopener">' + esc(S.consentLink) + '</a>' + esc(S.consentB) + '</span></label>' +
      '<div id="form-error"></div><div class="actions"><button type="submit">' + esc(S.apply) + '</button></div></form></div>';
  }
  function status(st){
    var t = st.tagora, issues = (t.issues || []).filter(function(i){ return i.count > 0; });
    var help = S.statusHelp[t.status] || t.statusReason || '';
    var list = issues.length ? '<div class="card"><h2>' + esc(S.issues) + '</h2><ul class="issues">' + issues.map(function(i){
      return '<li>' + esc(S.issue[i.code] || i.code) + ': <b>' + i.count + '</b>' + (i.examples && i.examples.length ? ' <span class="muted small">(' + esc(i.examples.slice(0, 3).join(', ')) + ')</span>' : '') + '</li>'; }).join('') +
      '</ul><p class="muted small">' + esc(S.issueHelp) + '</p></div>' : '';
    return '<div class="card"><h1><span class="brand">tag<span>o</span>ra</span> · ' + esc(t.name) + '</h1>' +
      '<p><span class="badge badge--' + t.status + '">' + esc(S.status[t.status] || t.status) + '</span></p>' +
      (help ? '<p>' + esc(help) + '</p>' : '') + (t.statusReason && help !== t.statusReason ? '<p class="note note--bad">' + esc(t.statusReason) + '</p>' : '') +
      (t.lastSyncStatus === 'error' && t.lastSyncMessage ? '<p class="note note--bad">' + esc(t.lastSyncMessage) + '</p>' : '') +
      '<div class="stats"><div class="stat"><span class="muted small">' + esc(S.products) + '</span><b>' + Number(t.productCount || 0).toLocaleString() + '</b></div>' +
      '<div class="stat"><span class="muted small">' + esc(S.lastSync) + '</span><b class="small">' + esc(when(t.lastSyncAt)) + '</b></div></div>' +
      (st.syncing ? '<p class="muted"><span class="spin"></span> ' + esc(S.syncing) + '</p>' : '') +
      '<div class="actions">' + (t.status === 'paused' || t.status === 'rejected' ? '' : '<button type="button" id="sync"' + (st.syncing ? ' disabled' : '') + '>' + esc(S.syncNow) + '</button>') +
      '<a class="btn btn--ghost" href="' + esc(t.dashboard) + '" target="_blank" rel="noopener">' + esc(S.dashboard) + '</a></div></div>' + list;
  }
  function render(){
    if (!state) return;
    root.innerHTML = state.tagora ? status(state) : form(state);
    var f = document.getElementById('apply');
    if (f) f.addEventListener('submit', apply);
    var b = document.getElementById('sync');
    if (b) b.addEventListener('click', sync);
    if (state.syncing && polls < 40) { polls++; setTimeout(load, 5000); }
  }
  function fail(e){ root.innerHTML = '<div class="card"><p class="note note--bad">' + esc(e.message || S.error) + '</p><button type="button" id="again">' + esc(S.retry) + '</button></div>'; document.getElementById('again').addEventListener('click', function(){ root.innerHTML = '<p class="muted">' + esc(S.loading) + '</p>'; load(); }); }
  async function load(){ try { state = await api('state'); render(); } catch (e) { fail(e); } }
  async function apply(ev){
    ev.preventDefault();
    if (busy) return;
    var f = ev.target, out = document.getElementById('form-error'), btn = f.querySelector('button[type=submit]');
    var countries = Array.prototype.slice.call(f.querySelectorAll('input[name=countries]:checked')).map(function(i){ return i.value; });
    busy = true; btn.disabled = true; btn.textContent = S.applying; out.innerHTML = '';
    try {
      // form.elements, because form.name is the form's own name attribute
      var v = function(n){ return f.elements.namedItem(n).value; };
      state = await api('apply', { name: v('name'), email: v('email'), phone: v('phone'), countries: countries, consent: f.elements.namedItem('consent').checked,
        defaultShipping: v('defaultShipping'), freeShippingOver: v('freeShippingOver'), lang: T.lang });
      polls = 0; render();
    } catch (e) {
      out.innerHTML = '<p class="note note--bad">' + esc(e.message) + '</p>'; btn.disabled = false; btn.textContent = S.apply;
    } finally { busy = false; }
  }
  async function sync(){
    var b = document.getElementById('sync'); b.disabled = true;
    try { state = await api('sync', {}); polls = 0; toast(S.syncStarted); render(); } catch (e) { toast(e.message, true); b.disabled = false; }
  }
  load();
})();
`;

export function shopifyPage(req: Request, env: Env): Response {
  const url = new URL(req.url);
  const lang = (url.searchParams.get('locale') ?? '').toLowerCase().startsWith('en') ? 'en' : 'el';
  const S = STRINGS[lang];
  const shop = (url.searchParams.get('shop') ?? '').toLowerCase();
  const inShopify = SHOP_DOMAIN.test(shop);
  const ready = inShopify && shopifyConfigured(env);
  // Only the store's own admin may show this page in a frame.
  const frameAncestors = inShopify ? `https://${shop} https://admin.shopify.com` : "'none'";
  const message = !inShopify ? S.outside : !shopifyConfigured(env) ? S.notConfigured : S.loading;
  const settings = JSON.stringify({ lang, s: S, countries: COUNTRY_NAMES[lang] }).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
${ready ? `<meta name="shopify-api-key" content="${escapeHtml(env.SHOPIFY_API_KEY!)}">
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>` : ''}
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${S.title}</title>
<style>${CSS}</style>
</head>
<body>
<main id="app"><p class="muted">${escapeHtml(message)}</p></main>
${ready ? `<script>window.TAGORA = ${settings};</script>
<script>${SCRIPT}</script>` : ''}
</body>
</html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `frame-ancestors ${frameAncestors};`,
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
