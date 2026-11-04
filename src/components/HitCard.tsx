import { Link } from 'react-router-dom';
import { useLocale } from '../i18n';
import { trackClick } from '../lib/api';
import { track } from '../lib/consent';
import type { Product } from '../search';
import { Icon } from './Icons';
import { Pills, Price, ProductImage, Shipping, discountLabel } from './ui';

/** One result. Image and shop button go to the shop (click-out); the title opens the comparison page. */
export function HitCard({ hit, query }: { hit: Product; query: string }) {
  const { loc, path, t } = useLocale();
  const title = loc(hit.title);
  const details = `${path(`/products/${encodeURIComponent(hit.groupId)}/variant/${encodeURIComponent(hit.id)}`)}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const off = discountLabel(hit);
  const clickOut = () => { trackClick(hit.shopId); track('click_out', { shop: hit.shop, product: hit.id, price: hit.price }); };

  return (
    <article className="hit">
      <Link to={details} className="hit-image" tabIndex={-1} aria-hidden="true">
        <ProductImage src={hit.image} alt="" />
        {off && <span className="badge-off">{off}</span>}
      </Link>
      <div className="hit-body">
        <div className="hit-brand">{hit.brand}</div>
        <h3 className="hit-title"><Link to={details}>{title}</Link></h3>
        {hit.summary && <p className="hit-summary">{loc(hit.summary)}</p>}
        <Pills p={hit} />
        <div className="hit-bottom">
          <Price p={hit} />
          <Shipping fee={hit.shipping} shopId={hit.shopId} />
        </div>
      </div>
      <div className="hit-actions">
        <a className="hit-shop" href={hit.url} target="_blank" rel="noopener sponsored" onClick={clickOut}>
          <Icon name="store" /> <span>{hit.shop}</span> <Icon name="external" className="hit-ext" />
        </a>
        <Link className="hit-info" to={details} aria-label={t('hit.details')} title={t('hit.details')}>
          <Icon name="info" />
        </Link>
      </div>
    </article>
  );
}
