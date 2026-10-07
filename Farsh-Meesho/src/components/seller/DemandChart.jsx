import { Flame, TrendingDown, MapPin, Sparkles } from 'lucide-react';
import { inr, inrSigned, ordersRange } from '../../lib/format.js';
import { inBucket } from '../../engine/demand.js';

/**
 * "Where buyers buy": one row per price range of similar products, with the orders a typical listing got last
 * month (as a range), the busy range highlighted, and what THIS seller would make per order at that price.
 * Cheapest is shown honestly as the emptiest row: price alone does not decide where orders go.
 */
export function DemandChart({ coach, t, price, suggested }) {
  const { buckets, maxOrders, now } = coach;
  const w = (v) => `${(v / maxOrders) * 100}%`;
  return (
    <div className="demand" role="table" aria-label={t('s2.title')} data-testid="demand-chart">
      <div className="d-row d-head" role="row">
        <span role="columnheader">{t('s2.col.price')}</span>
        <span role="columnheader">{t('s2.col.orders')}</span>
        <span role="columnheader" className="r">{t('s2.col.you')}</span>
      </div>
      {buckets.map((b, i) => {
        const mine = price != null && inBucket(price, b);
        const sugg = suggested != null && inBucket(suggested, b);
        const loss = b.profitAtMid < 0;
        return (
          <div key={b.lo} role="row" className={`d-row ${b.busy ? 'busy' : ''} ${mine ? 'mine' : ''}`} data-testid={`bucket-${b.lo}`}>
            <span role="cell" className="d-price">
              <b>{b.label}</b>
              <span className="d-tags">
                {b.busiest && <span className="d-tag hot"><Flame size={12} aria-hidden />{t('s2.most')}</span>}
                {!b.busiest && b.busy && <span className="d-tag zone">{t('s2.busy')}</span>}
                {i === 0 && <span className="d-tag cheap"><TrendingDown size={12} aria-hidden />{t('s2.cheap')}</span>}
              </span>
            </span>
            <span role="cell" className="d-bar">
              <span className="d-track">
                <span className="d-hi" style={{ width: w(b.orders[1]) }} />
                <span className="d-lo" style={{ width: w(b.orders[0]) }} />
              </span>
              <span className="d-orders num">{ordersRange(b.orders)}</span>
              {mine && <span className="d-you"><MapPin size={12} aria-hidden />{t('s2.you')} {inr(price)}</span>}
              {sugg && !mine && <span className="d-sugg"><Sparkles size={12} aria-hidden />{inr(suggested)}</span>}
            </span>
            <span role="cell" className={`d-profit num r ${loss ? 'neg' : 'pos'}`} title={`At ${inr(b.mid)}`}>
              {loss ? `${inrSigned(b.profitAtMid)} ${t('term.loss')}` : inrSigned(b.profitAtMid)}
              <span className="tiny muted"> @ {inr(b.mid)}</span>
            </span>
          </div>
        );
      })}
      <p className="tiny muted" style={{ marginTop: 8 }}>{t('s2.foot')} · {t('term.floor')} {inr(now.floor)}</p>
    </div>
  );
}
