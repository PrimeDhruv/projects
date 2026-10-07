const n0 = (n) => Math.abs(Math.round(n)).toLocaleString('en-IN');
export const inr = (n) => (n == null ? '—' : `${n < 0 ? '−' : ''}₹${n0(n)}`);
export const inrSigned = (n) => (n == null ? '—' : `${Math.round(n) < 0 ? '−' : '+'}₹${n0(n)}`);
export const pct = (x, d = 0) => (x == null ? '—' : `${(x * 100).toFixed(d)}%`);
/** "₹750–2,000"; a range that is all loss reads "−₹2,450 to −₹1,050". */
export const inrRange = (r) => {
  if (!r) return '—';
  if (r.hi <= 0 && r.lo < 0) return `${inr(r.lo)} … ${inr(r.hi)}`;
  if (r.lo < 0) return `${inr(r.lo)} … ${inr(r.hi)}`;
  return `₹${n0(r.lo)}–${n0(r.hi)}`;
};
export const ordersRange = (o) => (o ? `${o[0]}–${o[1]}` : '—');
