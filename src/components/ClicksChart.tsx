// Visitors per day for the last 30 days: one series, so no legend (the title names it).
// Thin columns with 4px rounded tops, 2px gaps, hairline grid, a tooltip per day on
// hover and focus, and the numbers as a table for screen readers and keyboard users.
import { useMemo } from 'react';
import { useLocale } from '../i18n';

const DAYS = 30;

function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / step) * step;
}

export function ClicksChart({ data }: { data: { day: string; clicks: number }[] }) {
  const { t, num, country } = useLocale();
  const days = useMemo(() => {
    const byDay = new Map(data.map((d) => [d.day, d.clicks]));
    return Array.from({ length: DAYS }, (_, i) => {
      const day = new Date(Date.now() - (DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10);
      return { day, clicks: byDay.get(day) ?? 0 };
    });
  }, [data]);
  const max = niceMax(Math.max(0, ...days.map((d) => d.clicks)));
  const fmt = new Intl.DateTimeFormat(country.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const label = (d: string) => fmt.format(new Date(`${d}T00:00:00Z`));
  const ticks = [max, max / 2, 0];

  return (
    <figure className="cchart">
      <figcaption className="cchart-head">
        <strong>{t('dash.chart')}</strong>
        <span>{t('dash.chartNote')}</span>
      </figcaption>
      <div className="cchart-plot" aria-hidden="true">
        <div className="cchart-grid">
          {ticks.map((v) => <div key={v} className="cchart-tick"><span>{num(v)}</span></div>)}
        </div>
        <div className="cchart-bars">
          {days.map((d) => (
            <div key={d.day} className="cchart-col" tabIndex={0}>
              <div className="cchart-bar" style={{ height: `${(d.clicks / max) * 100}%` }} />
              <div className="cchart-tip" role="tooltip">
                <span>{label(d.day)}</span>
                <strong>{t('dash.clicksN', { n: num(d.clicks) })}</strong>
              </div>
            </div>
          ))}
        </div>
        <div className="cchart-x">
          <span>{label(days[0].day)}</span>
          <span>{label(days[DAYS - 1].day)}</span>
        </div>
      </div>
      <details className="cchart-table">
        <summary>{t('dash.chartTable')}</summary>
        <table>
          <thead><tr><th scope="col">{t('dash.day')}</th><th scope="col">{t('dash.visits')}</th></tr></thead>
          <tbody>{days.filter((d) => d.clicks > 0).reverse().map((d) => <tr key={d.day}><td>{label(d.day)}</td><td>{num(d.clicks)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
