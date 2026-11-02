// One inline SVG sprite for every UI icon; <Icon name="search" /> references it.
export type IconName =
  | 'search' | 'chevron' | 'location' | 'close' | 'filters' | 'info' | 'image' | 'external'
  | 'truck' | 'check' | 'arrow-left' | 'zoom' | 'tag' | 'store';

export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></symbol>
        <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-location" viewBox="0 0 24 24"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="10" r="2.4" fill="currentColor" /></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></symbol>
        <symbol id="i-filters" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
        <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 11v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="7.8" r="1.3" fill="currentColor" /></symbol>
        <symbol id="i-image" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="9" cy="10" r="1.8" fill="currentColor" /><path d="m4 17 5-5 4 4 2.5-2.5L20 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
        <symbol id="i-external" viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-truck" viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><circle cx="7" cy="17.5" r="1.8" fill="currentColor" /><circle cx="17.5" cy="17.5" r="1.8" fill="currentColor" /></symbol>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="i-zoom" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M15.5 15.5 20 20M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></symbol>
        <symbol id="i-tag" viewBox="0 0 24 24"><path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.5 6.5a1.4 1.4 0 0 1-2 0z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><circle cx="8.2" cy="8.2" r="1.6" fill="currentColor" /></symbol>
        <symbol id="i-store" viewBox="0 0 24 24"><path d="M4 9.5V20h16V9.5M3 4h18l-1 5.5H4z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" /><path d="M9.5 20v-5h5v5" fill="none" stroke="currentColor" strokeWidth="1.9" /></symbol>
      </defs>
    </svg>
  );
}

export function Icon({ name, className = '', title }: { name: IconName; className?: string; title?: string }) {
  return (
    <svg className={`icon ${className}`} aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} focusable="false">
      {title && <title>{title}</title>}
      <use href={`#i-${name}`} />
    </svg>
  );
}
