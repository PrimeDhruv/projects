import { createContext, useContext, useMemo, useState, useCallback, useRef } from 'react';
import { PRODUCTS, WORKED_EXAMPLE_ID } from '../data/products.js';
import { analyseProduct, STATUS } from '../engine/position.js';

const Ctx = createContext(null);
export const useProducts = () => useContext(Ctx);

/**
 * Products + selected product + derived analysis (floor, busy zone, status) for every SKU.
 * Seller actions in Price Coach (apply a cost fix, use a suggested price, edit cost) update the catalogue here,
 * so the Dashboard, Products and Farsh Watch always show the same numbers. In-memory only: nothing is sent anywhere.
 */
export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(PRODUCTS);
  const [selectedId, setSelectedId] = useState(WORKED_EXAMPLE_ID);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const items = useMemo(() => products.map((p) => ({ ...p, a: analyseProduct(p) })), [products]);
  const selected = items.find((p) => p.id === selectedId) || items[0];

  const summary = useMemo(() => {
    const live = items.filter((p) => p.status === 'live'), priced = items.filter((p) => p.a.contribution != null);
    const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
    const count = (...st) => items.filter((p) => st.includes(p.a.status)).length;
    return {
      total: items.length, live: live.length, drafts: items.length - live.length,
      alerts: items.filter((p) => p.a.isAlert).length,
      attention: items.filter((p) => p.a.needsAttention).length,
      losing: count('below_floor', 'skip'), fewerOrders: count('wont_rank', 'above_zone'),
      smallFix: count('thin', 'unpriced'), onTrack: count('healthy'),
      avgContribution: avg(priced.map((p) => p.a.contribution)),
      avgMarginPct: avg(priced.map((p) => p.a.marginPct)),
      pricedCount: priced.length,
    };
  }, [items]);

  const notify = useCallback((message, tone = 'green') => {
    setToast({ message, tone, id: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const updateProduct = useCallback((id, patch) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const toggleFix = useCallback((id, fixId) => {
    setProducts((ps) => ps.map((p) => {
      if (p.id !== id) return p;
      const fixes = p.fixes ?? [];
      return { ...p, fixes: fixes.includes(fixId) ? fixes.filter((f) => f !== fixId) : [...fixes, fixId] };
    }));
  }, []);

  const addProduct = useCallback(({ name, categoryId, cost, packaging }) => {
    const id = `SKU-${1000 + products.length + 1}`;
    setProducts((ps) => [...ps, { id, name, categoryId, cost, packaging, status: 'draft', listedPrice: null, orders: 0, note: 'Created in this session.' }]);
    setSelectedId(id);
    return id;
  }, [products.length]);

  const resetDemo = useCallback(() => { setProducts(PRODUCTS); setSelectedId(WORKED_EXAMPLE_ID); }, []);

  const value = {
    items, selected, selectedId, select: setSelectedId, addProduct, updateProduct, toggleFix, resetDemo,
    summary, STATUS, toast, notify, dismissToast: () => setToast(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
