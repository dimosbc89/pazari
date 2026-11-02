import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Icon } from '../components/Icons';
import { Lightbox } from '../components/Lightbox';
import { Loader, Pills, Price, ProductImage, Shipping, discountLabel } from '../components/ui';
import { useLocale } from '../i18n';
import { trackClick } from '../lib/api';
import { track } from '../lib/consent';
import { sanitizeHtml } from '../lib/sanitize';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { backend, type Product } from '../search';

async function loadProduct(id: string, country: string) {
  const product = await backend.getProduct(id);
  if (!product || !product.countries.includes(country)) return null;
  const [variants, offers] = await Promise.all([
    backend.getVariants(product.groupId, country),
    product.matchKey ?? product.mpn ? backend.getOffers((product.matchKey ?? product.mpn)!, country) : Promise.resolve([product]),
  ]);
  return { product, variants: variants.filter((v) => v.id !== product.id), offers };
}

export function ProductPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const { t, loc, path, price, country } = useLocale();
  const { data, loading } = useAsync(() => loadProduct(id, country.code), [id, country.code]);
  const p = data?.product;

  const gallery = p ? [p.image, ...(p.images ?? [])].filter(Boolean) : [];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  useEffect(() => { setActive(0); window.scrollTo(0, 0); }, [id]);
  useDocumentTitle(p ? `${loc(p.title)} · Tagora` : undefined);

  // Sticky buy bar once the main button has scrolled out of view.
  const buyRef = useRef<HTMLAnchorElement>(null);
  const [sticky, setSticky] = useState(false);
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [p]);

  const back = `${path('/products')}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const variantLink = (v: Product) => `${path(`/products/${encodeURIComponent(v.groupId)}/variant/${encodeURIComponent(v.id)}`)}${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  const clickOut = (o: Product) => () => { trackClick(o.shopId); track('click_out', { shop: o.shop, product: o.id, price: o.price }); };

  if (!data && loading) return (<><Header query={query} /><main className="product container"><Loader /></main><Footer /></>);
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

  const off = discountLabel(p);
  const offers = data!.offers;
  const total = (o: Product) => o.price + (o.shipping ?? 0);
  const details = (
    <>
      <div className="product-brand">{p.brand}</div>
      <h1 className="product-title">{loc(p.title)}</h1>
      <Pills p={p} />
      <div className="product-price">
        <Price p={p} large />
        {off && <span className="badge-off badge-off--inline">{off}</span>}
      </div>
      <Shipping fee={p.shipping} />
      <a ref={buyRef} className="btn btn--buy" href={p.url} target="_blank" rel="noopener sponsored" onClick={clickOut(p)}>
        {t('product.buyAt', { shop: p.shop })} <Icon name="external" />
      </a>
      <p className="product-note">{t('product.priceNote')}</p>
      {p.description && <div className="product-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(loc(p.description)) }} />}
    </>
  );

  return (
    <>
      <Header query={query} />
      <main className="product container">
        <Link to={back} className="back"><Icon name="arrow-left" /> {t('product.back')}</Link>

        <div className={`product-top ${loading ? 'is-stale' : ''}`}>
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
            <h2 id="offers-title">{t('product.compare')}</h2>
            <p className="section-note">
              {offers.length === 1 ? t('product.compareOne') : t('product.compareText', { n: offers.length })}{' '}
              <Link to={path('/pages/ranking')}>{t('product.howCompared')}</Link>
            </p>
            <ol className="offers-list">
              {offers.map((o, i) => (
                <li key={o.id} className={`offer ${o.id === p.id ? 'is-current' : ''}`}>
                  <div className="offer-shop">
                    <Icon name="store" />
                    <strong>{o.shop}</strong>
                    {i === 0 && offers.length > 1 && <span className="badge-best">{t('product.bestPrice')}</span>}
                  </div>
                  <div className="offer-price"><Price p={o} /><Shipping fee={o.shipping} /></div>
                  <div className="offer-total"><span>{t('product.total')}</span> <strong>{price(total(o))}</strong></div>
                  <a className={`btn ${i === 0 ? '' : 'btn--ghost'}`} href={o.url} target="_blank" rel="noopener sponsored" onClick={clickOut(o)}>
                    {t('product.goToShop')} <Icon name="external" />
                  </a>
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

      <div className={`buybar ${sticky ? 'is-visible' : ''}`} aria-hidden={!sticky}>
        <div className="buybar-inner container">
          <div className="buybar-title">{loc(p.title)}</div>
          <Price p={p} />
          <a className="btn" href={p.url} target="_blank" rel="noopener sponsored" tabIndex={sticky ? 0 : -1} onClick={clickOut(p)}>
            {t('product.buyAt', { shop: p.shop })}
          </a>
        </div>
      </div>

      {zoom && <Lightbox images={gallery} start={active} alt={loc(p.title)} onClose={(i) => { setActive(i); setZoom(false); }} />}
      <Footer />
    </>
  );
}
