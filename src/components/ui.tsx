import { useState } from 'react';
import { useLocale } from '../i18n';
import type { Product } from '../search';
import { Icon } from './Icons';

export function Loader({ inline = false }: { inline?: boolean }) {
  const { t } = useLocale();
  return (
    <div className={`loader ${inline ? 'loader--inline' : ''}`} role="status">
      <span className="loader-dot" /><span className="loader-dot" /><span className="loader-dot" />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}

/** Image with a soft placeholder while loading and an icon if it fails. */
export function ProductImage({ src, alt = '', eager = false }: { src?: string; alt?: string; eager?: boolean }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(src ? 'loading' : 'error');
  return (
    <div className={`pimg is-${state}`}>
      {state !== 'error' && src && (
        <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
          onLoad={() => setState('ok')} onError={() => setState('error')} />
      )}
      {state === 'error' && <Icon name="image" className="pimg-fallback" />}
    </div>
  );
}

export const discountLabel = (p: Pick<Product, 'price' | 'oldPrice'>) =>
  p.oldPrice && p.oldPrice > p.price ? `-${Math.round((1 - p.price / p.oldPrice) * 100)}%` : null;

export function Price({ p, large = false }: { p: Pick<Product, 'price' | 'oldPrice'>; large?: boolean }) {
  const { price } = useLocale();
  return (
    <div className={`price ${large ? 'price--lg' : ''}`}>
      <span className="price-now">{price(p.price)}</span>
      {p.oldPrice && p.oldPrice > p.price && <s className="price-old">{price(p.oldPrice)}</s>}
    </div>
  );
}

export function Shipping({ fee }: { fee?: number }) {
  const { t, price } = useLocale();
  if (fee === undefined) return null;
  return (
    <div className={`shipping ${fee === 0 ? 'is-free' : ''}`}>
      <Icon name="truck" />
      {fee === 0 ? t('hit.freeShipping') : t('hit.shipping', { fee: price(fee) })}
    </div>
  );
}

/** Colours with a swatch in the stylesheet (the demo's colour keys); feed colours are free text. */
const KNOWN_COLORS = new Set(['black', 'white', 'red', 'blue', 'navy', 'green', 'olive', 'yellow', 'orange', 'pink', 'purple', 'grey', 'beige']);

export function Pills({ p }: { p: Pick<Product, 'size' | 'color'> }) {
  const { loc, facetLabel, t } = useLocale();
  if (!p.size && !p.color) return null;
  return (
    <div className="pills">
      {p.color && <span title={t('product.color')}>{KNOWN_COLORS.has(p.color) && <i className={`swatch swatch--${p.color}`} />}{facetLabel('color', p.color)}</span>}
      {p.size && <span title={t('product.size')}>{loc(p.size)}</span>}
    </div>
  );
}
