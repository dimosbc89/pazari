import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Icon } from '../components/Icons';
import { Lightbox } from '../components/Lightbox';
import { ShippingPolicy } from '../components/ShippingPolicy';
import { Loader, OfferTotal, Pills, Price, ProductImage, Shipping, discountLabel } from '../components/ui';
import { useLocale } from '../i18n';
import { trackClick } from '../lib/api';
import { track } from '../lib/consent';
import { sanitizeHtml } from '../lib/sanitize';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { backend, type Product } from '../search';
import { matchingOffers, selectedProductSize, sizeOptions } from '../../shared/offer-comparison';

async function loadProduct(id: string, country: string, size: string | undefined, requestKey: string) {
  try {
    const product = await backend.getProduct(id);
    if (!product || !product.countries.includes(country)) return { requestKey, product: null, variants: [], offers: [] };
    const key = product.matchKey ?? product.mpn;
    const [variants, offers] = await Promise.all([
      backend.getVariants(product.groupId, country),
      key ? backend.getOffers(key, country, product.id, size) : Promise.resolve([product]),
    ]);
    return { requestKey, product, variants: variants.filter((v) => v.id !== product.id), offers: matchingOffers(product, offers, size) };
  } catch {
    return { requestKey, product: null, variants: [], offers: [], failed: true };
  }
}

export function ProductPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const requestedSize = params.has('size') ? params.get('size')! : undefined;
  const { t, loc, path, country } = useLocale();
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify([id, country.code, requestedSize, attempt]);
  const { data, loading } = useAsync(() => loadProduct(id, country.code, requestedSize, requestKey), [requestKey]);
  // useAsync retains old data, including on the render before its effect starts.
  // Never expose a previous product/size's price or purchase links during that gap.
  const pending = loading || data?.requestKey !== requestKey;
  const p = pending ? undefined : data?.product;
  const sizes = p ? sizeOptions(p) : [];
  const selectedSize = p ? selectedProductSize(p, requestedSize) : undefined;
  const invalidSize = requestedSize !== undefined && selectedSize === undefined;

  const gallery = p ? [p.image, ...(p.images ?? [])].filter(Boolean) : [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => { setActive(0); setZoom(false); window.scrollTo(0, 0); }, [id]);
  useDocumentTitle(p ? `${loc(p.title)} · Tagora` : undefined);

  // Sticky buy bar once the main button has scrolled out of view.
  const buyRef = useRef<HTMLAnchorElement>(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    setSticky(false);
    const el = buyRef.current;
    if (!el || invalidSize) return;
    const io = new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [p, invalidSize]);

  const back = `${path('/products')}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const variantLink = (v: Product) => `${path(`/products/${encodeURIComponent(v.groupId)}/variant/${encodeURIComponent(v.id)}`)}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const selectSize = (size: string) => {
    const next = new URLSearchParams(params);
    next.set('size', size);
    setParams(next, { preventScrollReset: true });
  };
  const clickOut = (o: Product) => () => { trackClick(o.shopId); track('click_out', { shop: o.shop, product: o.id, price: o.price }); };

  if (pending) return (<><Header query={query} /><main className="product container" aria-busy="true"><Loader /></main><Footer /></>);
  if (data?.failed) return (
    <><Header query={query} /><main className="product container"><div className="empty" role="alert">
      <p>{t('product.loadError')}</p>
      <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>{t('product.retry')}</button>
      <Link className="back" to={back}>{t('product.back')}</Link>
    </div></main><Footer /></>
  );
  if (!p) {
    return (
      <>
        <Header query={query} />
        <main className="product container">
          <div className="empty">
            <Icon name="tag" />
            <h1>{t('product.notFound')}</h1>
            <Link className="btn" to={back}>{t('product.back')}</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const off = invalidSize ? undefined : discountLabel(p);
  const sizeUnconfirmed = Boolean(p.size) && sizes.length === 0;
  const needsSizeSelection = !invalidSize && !selectedSize && (sizes.length > 1 || sizeUnconfirmed);
  const offers = invalidSize ? [] : needsSizeSelection ? data!.offers.filter((o) => o.id === p.id) : data!.offers;
  const shopCount = new Set(offers.map((o) => o.shopId || o.shop)).size;
  const sizePrompt = t(sizeUnconfirmed ? 'product.sizeUnconfirmed' : 'product.chooseSizeToCompare');
  const details = (
    <>
      <div className="product-brand">{p.brand}</div>
      <h1 className="product-title">{loc(p.title)}</h1>
      <Pills p={{ color: p.color, size: selectedSize }} />
      {(sizes.length > 1 || (invalidSize && sizes.length > 0)) && (
        <div className="product-size-selector">
          <label htmlFor="product-size">{t('product.size')}</label>
          <select id="product-size" value={selectedSize ?? ''} onChange={(e) => selectSize(e.target.value)} aria-describedby={invalidSize || needsSizeSelection ? 'product-size-help' : undefined}>
            <option value="" disabled>{t('product.chooseSize')}</option>
            {sizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      )}
      {(invalidSize || needsSizeSelection) && <p id="product-size-help" className="product-size-help" role="status">
        {invalidSize ? t('product.sizeUnavailable', { size: requestedSize?.trim() || '—' }) : sizePrompt}
      </p>}
      {!invalidSize && <><div className="product-price">
        <Price p={p} large />
        {off && <span className="badge-off badge-off--inline">{off}</span>}
      </div>
      <Shipping fee={p.shipping} shopId={p.shopId} expanded />
      <a ref={buyRef} className="btn btn--buy" href={p.url} target="_blank" rel="noopener sponsored" onClick={clickOut(p)}>
        {t('product.buyAt', { shop: p.shop })} <Icon name="external" />
      </a></>}
      <p className="product-note">{t('product.priceNote')}</p>
      {p.description && <div className="product-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(loc(p.description)) }} />}
    </>
  );

  return (
    <>
      <Header query={query} />
      <main className="product container">
        <Link to={back} className="back"><Icon name="arrow-left" /> {t('product.back')}</Link>

        <div className="product-top">
          <div className="product-media">
            <button type="button" className="product-main-image" onClick={() => setZoom(true)} aria-label={t('product.zoom')}>
              <ProductImage key={gallery[active]} src={gallery[active]} alt={loc(p.title)} eager />
              {off && <span className="badge-off">{off}</span>}
              <span className="zoom-hint"><Icon name="zoom" /></span>
            </button>
            {gallery.length > 1 && (
              <div className="thumbs" role="list">
                {gallery.map((src, i) => (
                  <button key={src} type="button" role="listitem" className={`thumb ${i === active ? 'is-active' : ''}`}
                    onClick={() => setActive(i)} aria-label={t('product.image', { n: i + 1 })} aria-current={i === active}>
                    <ProductImage src={src} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="product-info">{details}</div>
        </div>

        {offers.length > 0 && (
          <section className="offers" aria-labelledby="offers-title">
            <h2 id="offers-title">{t(needsSizeSelection ? 'product.shopOffer' : 'product.compare')}</h2>
            <p className="section-note">
              {needsSizeSelection ? sizePrompt : shopCount === 1 ? t('product.compareOne') : t('product.compareText', { n: shopCount })}{' '}
              <Link to={path('/pages/ranking')}>{t('product.howCompared')}</Link>
            </p>
            <ol className="offers-list">
              {offers.map((o, i) => (
                <li key={o.id} className={`offer ${o.id === p.id ? 'is-current' : ''}`}>
                  <div className="offer-shop">
                    <Icon name="store" />
                    <strong>{o.shop}</strong>
                    {i === 0 && offers.length > 1 && <span className="badge-best">{t('product.bestPrice')}</span>}
                    {(selectedSize || sizeOptions(o).length > 0) && <div className="offer-sizes">
                      {selectedSize && <span>{t('product.selectedSize', { size: selectedSize })}</span>}
                      {(!selectedSize || sizeOptions(o).length > 1) && <span>{t('product.availableSizes', { sizes: sizeOptions(o).join(', ') })}</span>}
                    </div>}
                  </div>
                  <div className="offer-price"><Price p={o} /><Shipping fee={o.shipping} shopId={o.shopId} showPolicy={false} /></div>
                  <OfferTotal p={o} />
                  <a className={`btn ${i === 0 ? '' : 'btn--ghost'}`} href={o.url} target="_blank" rel="noopener sponsored" onClick={clickOut(o)}>
                    {t('product.goToShop')} <Icon name="external" />
                  </a>
                  <ShippingPolicy shopId={o.shopId} />
                </li>
              ))}
            </ol>
          </section>
        )}

        {data!.variants.length > 0 && (
          <section className="variants" aria-labelledby="variants-title">
            <h2 id="variants-title">{t('product.variants')}</h2>
            <ul className="variants-list">
              {data!.variants.map((v) => (
                <li key={v.id}>
                  <Link to={variantLink(v)} className="variant">
                    <ProductImage src={v.image} />
                    <div className="variant-text">
                      <Pills p={v} />
                      <Price p={v} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {!invalidSize && <div className={`buybar ${sticky ? 'is-visible' : ''}`} aria-hidden={!sticky}>
        <div className="buybar-inner container">
          <div className="buybar-title">{loc(p.title)}</div>
          <Price p={p} />
          <a className="btn" href={p.url} target="_blank" rel="noopener sponsored" tabIndex={sticky ? 0 : -1} onClick={clickOut(p)}>
            {t('product.buyAt', { shop: p.shop })}
          </a>
        </div>
      </div>}

      {zoom && <Lightbox images={gallery} start={active} alt={loc(p.title)} onClose={(i) => { setActive(i); setZoom(false); }} />}
      <Footer />
    </>
  );
}
