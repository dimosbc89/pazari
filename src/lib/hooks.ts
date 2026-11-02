import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FACETS, SORTS, type FacetKey, type Refinements, type SortKey } from '../search';

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}

/** Runs an async loader whenever deps change; keeps the previous data while the next load runs. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true });
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load().then(
      (data) => live && setState({ data, loading: false }),
      (error: Error) => live && setState((s) => ({ ...s, error, loading: false })),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

/**
 * Search state lives in the URL so results can be shared and the back button works:
 *   /gr/products?q=sneakers&brand=Velto&brand=Ardi&sort=price_asc
 */
export function useSearchState() {
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const sortParam = params.get('sort') as SortKey | null;
  const sort: SortKey = sortParam && SORTS.includes(sortParam) ? sortParam : 'relevance';
  const key = params.toString();
  const refinements = useMemo(() => {
    const r: Refinements = {};
    for (const f of FACETS) {
      const v = params.getAll(f);
      if (v.length) r[f] = v;
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (fn: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      fn(next);
      setParams(next, { preventScrollReset: true });
    },
    [params, setParams],
  );

  const toggle = (facet: FacetKey, value: string) =>
    update((p) => {
      const cur = p.getAll(facet);
      p.delete(facet);
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      next.forEach((v) => p.append(facet, v));
    });

  const clear = () => update((p) => FACETS.forEach((f) => p.delete(f)));
  const setSort = (s: SortKey) => update((p) => (s === 'relevance' ? p.delete('sort') : p.set('sort', s)));

  return { query, sort, refinements, toggle, remove: toggle, clear, setSort };
}

/** Locks page scroll while a drawer or dialog is open. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}
