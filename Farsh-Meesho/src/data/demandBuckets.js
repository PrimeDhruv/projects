import { CATEGORIES } from './categories.js';

/**
 * DEMAND BY PRICE — SIMULATED. For each product group Meesho would supply, per price bucket, how many look-alike
 * listings sit there and how many orders a typical one got in the last 30 days, shown ONLY as a range (the middle
 * half of listings, rounded) and only for buckets with enough listings. Never one competitor's numbers.
 *
 * The A-line kurti group is the deck's illustrative example (Round 2, slide 6), reproduced exactly:
 *   ₹279–299 · 5 listings · 0–10 orders   … ₹360–389 · 25 listings · 40–100 orders … ₹450+ · 12 listings · 0–15
 * Every other group is generated around its own simulated price band with the same shape and a per-group volume
 * factor. None of this is live Meesho data.
 */

const KURTI = [
  { lo: 279, hi: 299, listings: 5,  orders: [0, 10],   rating: 3.6 },
  { lo: 300, hi: 329, listings: 8,  orders: [5, 20],   rating: 3.8 },
  { lo: 330, hi: 359, listings: 20, orders: [30, 80],  rating: 4.1 },
  { lo: 360, hi: 389, listings: 25, orders: [40, 100], rating: 4.2 },
  { lo: 390, hi: 419, listings: 15, orders: [20, 60],  rating: 4.2 },
  { lo: 420, hi: 449, listings: 15, orders: [10, 30],  rating: 4.0 },
  { lo: 450, hi: null, listings: 12, orders: [0, 15],  rating: 3.9 },
];

/** The deck's shape, by position relative to the busiest bucket (−3 … +3). */
const SHAPE = KURTI.map(({ listings, orders, rating }) => ({ listings, orders, rating }));

/** Per-group order volume vs the kurti example (invented, so groups don't all look identical). */
const VOLUME = { kurtaset: 0.6, bottoms: 0.9, leggings: 1.4, dupatta: 1.2, footwear: 1.0, home: 0.6, bags: 0.7 };

const r5 = (n) => Math.round(n / 5) * 5;
const f5 = (n) => Math.floor(n / 5) * 5;

function generated(cat) {
  const m = cat.band.median;
  const w = Math.max(10, r5(m * 0.08));          // bucket width ≈ 8% of the group median (kurti: ₹30)
  const busiestStart = f5(m - 0.63 * w);          // the median sits in the upper part of the busiest bucket (kurti: ₹360)
  const v = VOLUME[cat.id] ?? 1;
  return SHAPE.map((s, i) => {
    const lo = busiestStart + (i - 3) * w;
    return {
      lo, hi: i === SHAPE.length - 1 ? null : lo + w - 1, listings: s.listings,
      orders: [Math.round((s.orders[0] * v) / 5) * 5, Math.max(5, Math.round((s.orders[1] * v) / 5) * 5)],
      rating: s.rating,
    };
  });
}

export function demandFor(categoryId) {
  const cat = CATEGORIES[categoryId];
  return {
    categoryId, group: cat.group,
    buckets: categoryId === 'kurtis' ? KURTI : generated(cat),
    source: categoryId === 'kurtis' ? 'deck' : 'mock',
  };
}
