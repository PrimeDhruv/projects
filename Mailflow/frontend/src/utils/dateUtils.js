// Force UTC interpretation for strings coming from PostgreSQL (no timezone suffix)
function toUTCDate(dateStr) {
  if (!dateStr) return new Date(NaN);
  let s = String(dateStr).trim().replace(' ', 'T');
  // If no timezone info, treat as UTC (PostgreSQL stores UTC without suffix)
  if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
  return new Date(s);
}

export function formatIST(dateStr, opts = {}) {
  if (!dateStr) return '—';
  const d = toUTCDate(dateStr);
  if (isNaN(d)) return '—';
  const defaultOpts = { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
  return d.toLocaleString('en-IN', { ...defaultOpts, ...opts });
}

export function formatISTDate(dateStr) {
  if (!dateStr) return '—';
  const d = toUTCDate(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
}

// Convert IST datetime-local string to UTC ISO (for sending to backend)
export function istLocalToUTC(istStr) {
  if (!istStr) return '';
  // istStr is like "2026-04-12T16:00" — treat as IST
  const [date, time] = istStr.split('T');
  const [year, month, day] = date.split('-');
  const [hour, min] = time.split(':');
  // IST is UTC+5:30
  const utcMs = Date.UTC(year, month-1, day, hour, min) - (5*60+30)*60*1000;
  return new Date(utcMs).toISOString();
}

// Convert UTC ISO to IST datetime-local string (for input value)
export function utcToISTLocal(utcStr) {
  if (!utcStr) return '';
  const d = toUTCDate(utcStr);
  if (isNaN(d)) return '';
  // Add 5:30 to UTC
  const istMs = d.getTime() + (5*60+30)*60*1000;
  const ist = new Date(istMs);
  const pad = n => String(n).padStart(2, '0');
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth()+1)}-${pad(ist.getUTCDate())}T${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}
