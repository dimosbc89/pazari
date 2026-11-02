// Generates the demo catalogue: public/demo/products.json + public/demo/img/*.svg
// Every brand, shop and product here is fictional. Deterministic (seeded), so
// re-running produces the same files. Run: npm run demo:data
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productSVG } from './product-art.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public/demo');
const IMG = path.join(OUT, 'img');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(IMG, { recursive: true });

// ---------- seeded random ----------
let seed = 20261102;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const sample = (arr, n) => { const a = [...arr]; const out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const price = (v) => { const whole = Math.floor(v); return +(whole + pick([0.9, 0.99, 0.5, 0])).toFixed(2); };

// ---------- shops (fictional) ----------
const SHOPS = [
  { name: 'Meltemi Store', countries: ['gr', 'cy'], fee: 2.9, freeOver: 39 },
  { name: 'Kyma Shop', countries: ['gr', 'cy'], fee: 3.5, freeOver: 50 },
  { name: 'Plaka Market', countries: ['gr'], fee: 2.5, freeOver: 30 },
  { name: 'Ostria Tech', countries: ['gr', 'cy', 'mt'], fee: 4.9, freeOver: 100 },
  { name: 'Limani Online', countries: ['gr', 'cy', 'ie', 'mt'], fee: 3.9, freeOver: 60 },
  { name: 'Thalassa Home', countries: ['gr', 'cy'], fee: 0, freeOver: 0 },
  { name: 'Liffey Goods', countries: ['ie'], fee: 4.5, freeOver: 45 },
  { name: 'Valletta Mart', countries: ['mt', 'ie'], fee: 3.0, freeOver: 40 },
];

// ---------- colours ----------
const HEX = {
  black: '#2B2836', white: '#EDEBE6', red: '#E2462B', blue: '#2E8FD8', navy: '#2C3E73', green: '#1E9E6A',
  olive: '#6E7F5C', yellow: '#F6B32B', orange: '#F07A2B', pink: '#DB5A8E', purple: '#7458E0', grey: '#8B8797', beige: '#D9C9A8',
};

// ---------- catalogue spec ----------
const T = (el, en) => ({ el, en });
const SPEC = [
  {
    type: 'sneakers', category: 'shoes', noun: T('Αθλητικά παπούτσια', 'sneakers'), sizes: ['40', '41', '42', '43', '44'], sizePerItem: true,
    features: [T('Αναπνέον πλέγμα στο πάνω μέρος', 'Breathable mesh upper'), T('Αφρώδης ενδιάμεση σόλα για απορρόφηση κραδασμών', 'Foam midsole for cushioning'), T('Αντιολισθητική εξωτερική σόλα', 'Grippy rubber outsole')],
    models: [
      { brand: 'Velto', model: 'Aero Runner', base: 89, colors: ['red', 'navy', 'white'], sum: T('Ελαφριά παπούτσια για τρέξιμο και καθημερινή χρήση.', 'Lightweight shoes for running and everyday wear.') },
      { brand: 'Ardi', model: 'Street Classic', base: 64, colors: ['white', 'black', 'beige'], sum: T('Κλασικό low-top σχέδιο που ταιριάζει με όλα.', 'A classic low-top that goes with everything.') },
      { brand: 'Runo', model: 'Trail X', base: 119, colors: ['olive', 'orange'], sum: T('Για βουνό και μονοπάτι, με ενισχυμένη μύτη.', 'Built for trails, with a reinforced toe cap.') },
    ],
  },
  {
    type: 'headphones', category: 'audio', noun: T('Ασύρματα ακουστικά', 'wireless headphones'),
    features: [T('Ενεργή ακύρωση θορύβου', 'Active noise cancelling'), T('Έως 40 ώρες αυτονομία', 'Up to 40 hours of battery'), T('Γρήγορη φόρτιση USB-C', 'Fast USB-C charging')],
    models: [
      { brand: 'Sonaro', model: 'Q40', base: 149, colors: ['black', 'blue', 'white'], sum: T('Over-ear ακουστικά με ακύρωση θορύβου.', 'Over-ear headphones with noise cancelling.') },
      { brand: 'Aurel', model: 'Studio One', base: 229, colors: ['black', 'beige'], sum: T('Καθαρός ήχος στούντιο και άνετα μαξιλαράκια.', 'Studio-clear sound with plush ear cushions.') },
      { brand: 'Basso', model: 'Go', base: 59, colors: ['red', 'purple', 'grey'], sum: T('Οικονομικά ακουστικά για κάθε μέρα.', 'Affordable headphones for every day.') },
    ],
  },
  {
    type: 'smartphone', category: 'phones', noun: T('Smartphone', 'smartphone'), sizes: ['128 GB', '256 GB'], sizePerItem: true, sizeStep: 70,
    features: [T('Οθόνη OLED 6,4"', '6.4" OLED display'), T('Τριπλή κάμερα 50 MP', 'Triple 50 MP camera'), T('Μπαταρία 5.000 mAh', '5,000 mAh battery')],
    models: [
      { brand: 'Nexa', model: 'S12', base: 399, colors: ['black', 'green', 'blue'], sum: T('Δυνατό smartphone με εξαιρετική κάμερα.', 'A capable phone with an excellent camera.') },
      { brand: 'Orbi', model: 'Lite 5', base: 219, colors: ['purple', 'black'], sum: T('Όλα τα βασικά σε προσιτή τιμή.', 'All the essentials at a friendly price.') },
      { brand: 'Nexa', model: 'S12 Pro', base: 649, colors: ['grey', 'navy'], sum: T('Η πιο προηγμένη έκδοση της σειράς S12.', 'The most advanced model in the S12 range.') },
    ],
  },
  {
    type: 'backpack', category: 'bags', noun: T('Σακίδιο πλάτης', 'backpack'), sizes: ['20 L', '28 L'], sizePerItem: true, sizeStep: 15,
    features: [T('Αδιάβροχο ύφασμα', 'Water-resistant fabric'), T('Θήκη laptop έως 15"', 'Padded sleeve for up to 15" laptops'), T('Εργονομικές τιράντες', 'Ergonomic padded straps')],
    models: [
      { brand: 'Trekka', model: 'City Pack', base: 49, colors: ['black', 'navy', 'olive'], sum: T('Το σακίδιο για δουλειά, σχολή και ταξίδια.', 'Your bag for work, campus and travel.') },
      { brand: 'Pelto', model: 'Roll Top', base: 79, colors: ['yellow', 'black'], sum: T('Roll-top κλείσιμο που μεγαλώνει όσο χρειάζεσαι.', 'A roll-top that grows with your load.') },
    ],
  },
  {
    type: 'tshirt', category: 'clothing', noun: T('T-shirt', 't-shirt'), sizes: ['S', 'M', 'L', 'XL'], sizePerItem: true,
    features: [T('100% οργανικό βαμβάκι', '100% organic cotton'), T('Άνετη, κλασική γραμμή', 'Relaxed classic fit'), T('Πλένεται στο πλυντήριο', 'Machine washable')],
    models: [
      { brand: 'Linea', model: 'Essential Tee', base: 19, colors: ['white', 'black', 'yellow', 'green'], sum: T('Το βασικό t-shirt που φοριέται παντού.', 'The everyday tee you will reach for first.') },
      { brand: 'Cotta', model: 'Heavy Tee', base: 29, colors: ['beige', 'navy', 'red'], sum: T('Πιο χοντρό βαμβάκι, πιο δομημένη εφαρμογή.', 'Heavier cotton for a more structured fit.') },
    ],
  },
  {
    type: 'watch', category: 'watches', noun: T('Ρολόι χειρός', 'wristwatch'),
    features: [T('Αδιάβροχο έως 50 m', 'Water-resistant to 50 m'), T('Κρύσταλλο ζαφείρι', 'Sapphire crystal'), T('Λουράκι σιλικόνης που αλλάζει εύκολα', 'Quick-release silicone strap')],
    models: [
      { brand: 'Horo', model: 'Field 38', base: 129, colors: ['olive', 'black', 'orange'], sum: T('Λιτό αναλογικό ρολόι με ευανάγνωστο καντράν.', 'A clean analogue watch with a legible dial.') },
      { brand: 'Tempo', model: 'Diver', base: 189, colors: ['navy', 'red'], sum: T('Σπορ ρολόι για θάλασσα και πόλη.', 'A sporty watch for the sea and the city.') },
    ],
  },
  {
    type: 'moka', category: 'kitchen', noun: T('Καφετιέρα espresso εστίας', 'stovetop espresso maker'), sizes: ['3 φλ.', '6 φλ.'], sizeLabelEn: ['3 cups', '6 cups'], sizePerItem: true, sizeStep: 8,
    features: [T('Αλουμίνιο υψηλής αντοχής', 'Durable cast aluminium'), T('Βαλβίδα ασφαλείας', 'Safety valve'), T('Για όλες τις εστίες εκτός επαγωγικής', 'For all hobs except induction')],
    models: [
      { brand: 'Caffeo', model: 'Moka Classica', base: 24, colors: ['grey', 'red', 'black'], sum: T('Ο κλασικός τρόπος για αρωματικό espresso στο σπίτι.', 'The classic way to make rich espresso at home.') },
      { brand: 'Caffeo', model: 'Moka Color', base: 32, colors: ['yellow', 'blue', 'pink'], sum: T('Η αγαπημένη μόκα σε ζωηρά χρώματα.', 'The favourite moka pot in bright colours.') },
    ],
  },
  {
    type: 'sunglasses', category: 'eyewear', noun: T('Γυαλιά ηλίου', 'sunglasses'),
    features: [T('Πολωτικοί φακοί', 'Polarised lenses'), T('Προστασία UV400', 'UV400 protection'), T('Ελαφρύς σκελετός', 'Lightweight frame')],
    models: [
      { brand: 'Solis', model: 'Cove', base: 69, colors: ['black', 'pink', 'blue'], sum: T('Στρογγυλός σκελετός για ηλιόλουστες μέρες.', 'A rounded frame for sunny days.') },
      { brand: 'Helio', model: 'Wayline', base: 99, colors: ['navy', 'orange'], sum: T('Διαχρονικό σχέδιο με πολωτικούς φακούς.', 'A timeless shape with polarised lenses.') },
    ],
  },
  {
    type: 'bottle', category: 'sports', noun: T('Θερμός νερού', 'insulated water bottle'), sizes: ['500 ml', '750 ml'], sizePerItem: true, sizeStep: 5,
    features: [T('Κρατά κρύο 24 ώρες', 'Keeps drinks cold for 24 hours'), T('Ανοξείδωτο ατσάλι', 'Stainless steel'), T('Χωρίς BPA', 'BPA-free')],
    models: [
      { brand: 'Rivo', model: 'Flow', base: 22, colors: ['olive', 'blue', 'pink', 'black'], sum: T('Θερμός διπλού τοιχώματος για κάθε μέρα.', 'A double-walled bottle for every day.') },
      { brand: 'Rivo', model: 'Trail', base: 34, colors: ['orange', 'grey'], sum: T('Ανθεκτικός θερμός για πεζοπορία.', 'A rugged bottle for hiking.') },
    ],
  },
  {
    type: 'lamp', category: 'home', noun: T('Φωτιστικό γραφείου', 'desk lamp'),
    features: [T('Ρυθμιζόμενος βραχίονας', 'Adjustable arm'), T('Λάμπα LED χαμηλής κατανάλωσης', 'Low-energy LED bulb'), T('Βάση από ατσάλι', 'Steel base')],
    models: [
      { brand: 'Lumo', model: 'Arc', base: 45, colors: ['red', 'black', 'white'], sum: T('Ρετρό φωτιστικό με αρθρωτό βραχίονα.', 'A retro lamp with an articulated arm.') },
      { brand: 'Fos', model: 'Studio', base: 79, colors: ['yellow', 'green'], sum: T('Δυνατό φως για διάβασμα και δουλειά.', 'Bright light for reading and work.') },
    ],
  },
];

const COLOR_EL = { black: 'Μαύρο', white: 'Λευκό', red: 'Κόκκινο', blue: 'Μπλε', navy: 'Navy', green: 'Πράσινο', olive: 'Λαδί', yellow: 'Κίτρινο', orange: 'Πορτοκαλί', pink: 'Ροζ', purple: 'Μωβ', grey: 'Γκρι', beige: 'Μπεζ' };
const COLOR_EN = { black: 'Black', white: 'White', red: 'Red', blue: 'Blue', navy: 'Navy', green: 'Green', olive: 'Olive', yellow: 'Yellow', orange: 'Orange', pink: 'Pink', purple: 'Purple', grey: 'Grey', beige: 'Beige' };

// ---------- build ----------
const products = [];
const images = new Set();

for (const spec of SPEC) {
  for (const m of spec.models) {
    const shops = sample(SHOPS, 2 + Math.floor(rnd() * 3));
    // Make sure every market has something from every category.
    if (!shops.some((s) => s.countries.includes('ie'))) shops.push(SHOPS[4]);
    const modelSlug = slug(`${m.brand}-${m.model}`);
    const sizes = spec.sizes ? (spec.sizePerItem ? sample(spec.sizes, Math.min(spec.sizes.length, spec.type === 'sneakers' || spec.type === 'tshirt' ? 3 : 2)).sort((a, b) => spec.sizes.indexOf(a) - spec.sizes.indexOf(b)) : [null]) : [null];

    for (const shop of [...new Set(shops)]) {
      const shopFactor = 0.9 + rnd() * 0.18;
      const discount = rnd() < 0.4 ? 0.1 + rnd() * 0.35 : 0;
      m.colors.forEach((color, ci) => {
        const imgBase = `${modelSlug}-${color}`;
        if (!images.has(imgBase)) {
          images.add(imgBase);
          for (const v of [1, 2, 3]) fs.writeFileSync(path.join(IMG, `${imgBase}-${v}.svg`), productSVG(spec.type, HEX[color], v));
        }
        sizes.forEach((size, si) => {
          if (size && rnd() < 0.15) return; // not every shop stocks every size
          const mpn = `${m.brand.slice(0, 3).toUpperCase()}-${slug(m.model).toUpperCase()}-${color.slice(0, 3).toUpperCase()}${size ? '-' + slug(size).toUpperCase() : ''}`;
          const p = price((m.base + (spec.sizeStep || 0) * si + ci * 2) * shopFactor);
          const old = discount ? price(p / (1 - discount)) : undefined;
          const pct = old ? Math.round((1 - p / old) * 100) : 0;
          const sizeEn = size && spec.sizeLabelEn ? spec.sizeLabelEn[spec.sizes.indexOf(size)] : size;
          const titleEl = `${spec.noun.el} ${m.brand} ${m.model}`;
          const titleEn = `${m.brand} ${m.model} ${spec.noun.en}`;
          const shopSlug = slug(shop.name);
          products.push({
            id: `${shopSlug}-${slug(mpn)}`,
            groupId: `${shopSlug}-${modelSlug}`,
            title: T(titleEl, titleEn),
            brand: m.brand,
            summary: m.sum,
            description: T(
              `<p>${m.sum.el} Χρώμα: ${COLOR_EL[color].toLowerCase()}${size ? `, μέγεθος ${size}` : ''}.</p><ul>${spec.features.map((f) => `<li>${f.el}</li>`).join('')}</ul>`,
              `<p>${m.sum.en} Colour: ${COLOR_EN[color].toLowerCase()}${sizeEn ? `, size ${sizeEn}` : ''}.</p><ul>${spec.features.map((f) => `<li>${f.en}</li>`).join('')}</ul>`,
            ),
            url: `https://example.com/${shopSlug}/${slug(mpn)}`,
            image: `/demo/img/${imgBase}-1.svg`,
            images: [2, 3].map((v) => `/demo/img/${imgBase}-${v}.svg`),
            price: p,
            ...(old ? { oldPrice: old } : {}),
            shipping: shop.fee === 0 || p >= shop.freeOver ? 0 : shop.fee,
            shop: shop.name,
            category: spec.category,
            color,
            ...(size ? { size: spec.sizeLabelEn ? T(size, sizeEn) : size } : {}),
            mpn,
            countries: shop.countries,
            discount: pct === 0 ? undefined : pct < 20 ? 'upto20' : pct < 35 ? '20to35' : '35plus',
            discountPct: pct,
            rank: ci * 10 + (size ? spec.sizes.indexOf(size) : 0),
            demo: true,
          });
        });
      });
    }
  }
}

fs.writeFileSync(path.join(OUT, 'products.json'), JSON.stringify(products));
const by = (k) => [...new Set(products.map((p) => p[k]))].length;
console.log(`products: ${products.length}, groups: ${by('groupId')}, shops: ${by('shop')}, brands: ${by('brand')}, images: ${images.size * 3}`);
for (const c of ['gr', 'cy', 'ie', 'mt']) console.log(`  ${c}: ${products.filter((p) => p.countries.includes(c)).length} offers`);
