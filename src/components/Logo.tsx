// The tagora wordmark (same geometry as scripts/brand-geometry.mjs).
// Letters use currentColor; the "o" (the hole of a price tag) uses the accent colour.
const R = 38;

export function Wordmark({ className = '', title = 'tagora' }: { className?: string; title?: string }) {
  const ring = (cx: number) => <circle cx={cx} cy={50} r={R} />;
  return (
    <svg className={`wordmark ${className}`} viewBox="-2 -40 630 192" role="img" aria-label={title}>
      <g fill="none" strokeWidth={24} strokeLinecap="round" strokeLinejoin="round">
        <g stroke="currentColor">
          {/* t */}
          <path d="M36 -26V62A26 26 0 0 0 62 88" />
          <path d="M12 12H66" />
          {/* a */}
          {ring(142)}
          <path d="M180 12L180 88" />
          {/* g */}
          {ring(262)}
          <path d="M300 12V100A38 38 0 0 1 235 127" />
          {/* r */}
          <path d="M464 88V52A38 38 0 0 1 502 12" />
          {/* a */}
          {ring(572)}
          <path d="M610 12L610 88" />
        </g>
        {/* o */}
        <g className="wordmark-accent">{ring(382)}</g>
      </g>
    </svg>
  );
}
