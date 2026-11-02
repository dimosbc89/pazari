// Home illustration: two market carts. Each letter typed in the search box drops
// one more item into them (up to five each). Decorative, so hidden from screen readers.

const SHAPES = [
  { kind: 'ball', x: 104, y: 178, r: 30, color: 'var(--paprika)' },
  { kind: 'box', x: 152, y: 150, w: 62, h: 58, rot: -8, color: 'var(--saffron)' },
  { kind: 'pill', x: 210, y: 166, w: 86, h: 34, rot: 18, color: 'var(--mint)' },
  { kind: 'ball', x: 250, y: 196, r: 22, color: 'var(--plum)' },
  { kind: 'box', x: 120, y: 120, w: 46, h: 46, rot: 14, color: 'var(--sky)' },
] as const;

function Cart({ filled, mirrored, label }: { filled: number; mirrored?: boolean; label: string }) {
  return (
    <svg className={`cart ${mirrored ? 'cart--right' : 'cart--left'}`} viewBox="0 0 360 300" aria-hidden="true" data-label={label}>
      <g transform={mirrored ? 'translate(360 0) scale(-1 1)' : undefined}>
        <ellipse cx="180" cy="290" rx="150" ry="8" className="cart-shadow" />
        {/* items: drawn before the basket front so they sit inside it */}
        {SHAPES.map((s, i) => {
          const on = i < filled;
          const style = { transitionDelay: on ? `${i * 40}ms` : '0ms' };
          const common = { className: `drop ${on ? 'is-in' : ''}`, style, fill: s.color };
          if (s.kind === 'ball') return <circle key={i} cx={s.x} cy={s.y} r={s.r} {...common} />;
          return (
            <g key={i} {...common}>
              <rect x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx={s.kind === 'pill' ? s.h / 2 : 10}
                transform={`rotate(${s.rot} ${s.x} ${s.y})`} />
            </g>
          );
        })}
        <g className="cart-frame" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 112h262l-24 110H72z" className="cart-basket" />
          <path d="M83 112l12 110M126 112l7 110M169 112l2 110M212 112l-3 110M255 112l-8 110M52 148h241M62 186h223" className="cart-grid" />
          <path d="M302 112l20-62h26" />
          <path d="M72 222l-8 28h222" />
          <circle cx="96" cy="272" r="15" />
          <circle cx="262" cy="272" r="15" />
        </g>
      </g>
    </svg>
  );
}

export function Carts({ progress }: { progress: number }) {
  return (
    <div className="carts" aria-hidden="true">
      <Cart filled={Math.min(progress, 5)} label="left" />
      <Cart filled={Math.min(Math.max(progress - 1, 0), 5)} mirrored label="right" />
    </div>
  );
}
