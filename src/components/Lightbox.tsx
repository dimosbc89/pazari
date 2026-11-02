import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n';
import { useScrollLock } from '../lib/hooks';
import { Icon } from './Icons';

/** Full-screen image viewer. Arrow keys / swipe-free buttons, Escape closes. */
export function Lightbox({ images, start, alt, onClose }: { images: string[]; start: number; alt: string; onClose: (index: number) => void }) {
  const { t } = useLocale();
  const [i, setI] = useState(start);
  const close = useRef<HTMLButtonElement>(null);
  useScrollLock(true);

  useEffect(() => {
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(i);
      if (e.key === 'ArrowRight') setI((n) => (n + 1) % images.length);
      if (e.key === 'ArrowLeft') setI((n) => (n - 1 + images.length) % images.length);
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [i, images.length, onClose]);

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={() => onClose(i)}>
      <button ref={close} type="button" className="icon-btn lightbox-close" aria-label={t('product.closeImage')} onClick={() => onClose(i)}>
        <Icon name="close" />
      </button>
      <img src={images[i]} alt={alt} onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <div className="lightbox-dots" onClick={(e) => e.stopPropagation()}>
          {images.map((src, n) => (
            <button key={src} type="button" className={n === i ? 'is-active' : ''} aria-label={t('product.image', { n: n + 1 })} onClick={() => setI(n)} />
          ))}
        </div>
      )}
    </div>
  );
}
