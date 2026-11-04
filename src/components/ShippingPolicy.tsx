import policies from '../content/shipping-policies.json';
import { useLocale } from '../i18n';

type Text = { el: string; en: string };
export interface ShopShippingPolicy {
  shopId: string;
  country: string;
  status: 'verified' | 'conditional' | 'unverified';
  checkedAt: string;
  summary: Text;
  deliveryTime: Text;
  conditions: Text;
  sources: { url: string; title: string }[];
}

const byShop = new Map((policies as ShopShippingPolicy[]).map((policy) => [policy.shopId, policy]));

/** Shop policies describe an order; they are not product-specific delivery quotes. */
export function shippingPolicyFor(shopId: string | undefined, country: string) {
  const policy = shopId ? byShop.get(shopId) : undefined;
  return policy?.country === country ? policy : undefined;
}

export function ShippingPolicy({ shopId, expanded = false }: { shopId?: string; expanded?: boolean }) {
  const { country, lang } = useLocale();
  const policy = shippingPolicyFor(shopId, country.code);
  if (!policy) return null;
  const el = lang === 'el';
  const checked = new Intl.DateTimeFormat(el ? 'el-GR' : 'en-GB', { dateStyle: 'short', timeZone: 'UTC' })
    .format(new Date(policy.checkedAt));

  return (
    <details className="shipping-policy" open={expanded || undefined}>
      <summary>{el ? 'Τρόποι και κόστος αποστολής' : 'Delivery methods and costs'}</summary>
      <div className="shipping-policy-body">
        <p className="shipping-policy-scope">{el ? 'Για παραγγελίες προς Ελλάδα' : 'For orders delivered to Greece'}</p>
        <p>{policy.summary[lang]}</p>
        {policy.deliveryTime[lang] && <p><strong>{el ? 'Παράδοση: ' : 'Delivery: '}</strong>{policy.deliveryTime[lang]}</p>}
        {policy.conditions[lang] && <p>{policy.conditions[lang]}</p>}
        <p className="shipping-policy-note">{el
          ? 'Η τελική χρέωση και ο χρόνος παράδοσης επιβεβαιώνονται στο κατάστημα για το καλάθι και τη διεύθυνσή σου.'
          : 'The shop confirms the final charge and delivery time for your basket and address.'}</p>
        <div className="shipping-policy-sources">
          {policy.sources.map((source, index) => (
            <a key={source.url} href={source.url} title={source.title} target="_blank" rel="noopener noreferrer">
              {el ? 'Όροι καταστήματος' : 'Shop policy'}{policy.sources.length > 1 ? ` ${index + 1}` : ''} ↗
            </a>
          ))}
        </div>
        <small>{el ? 'Έλεγχος: ' : 'Checked: '}<time dateTime={policy.checkedAt}>{checked}</time></small>
      </div>
    </details>
  );
}
