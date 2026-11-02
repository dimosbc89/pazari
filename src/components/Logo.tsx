// The pazari wordmark (same geometry as scripts/brand-geometry.mjs).
// Strokes use currentColor, so the wordmark takes the colour of its parent.
const R = 38;

export function Wordmark({ className = '', title = 'pazari' }: { className?: string; title?: string }) {
  const ring = (cx: number) => <circle cx={cx} cy={50} r={R} />;
  return (
    <svg className={`wordmark ${className}`} viewBox="-2 -51 583 201" role="img" aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round">
        {ring(50)}
        <path d="M12 12L12 136" />
        {ring(168)}
        <path d="M206 12L206 88" />
        <path d="M252 12H316L252 88H316" />
        {ring(396)}
        <path d="M434 12L434 88" />
        <path d="M484 88V52A38 38 0 0 1 522 12" />
        <path d="M564 12L564 88" />
      </g>
      <circle className="wordmark-dot" cx={564} cy={-34} r={15} />
    </svg>
  );
}
