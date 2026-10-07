// Component kit for the mobile app: React helpers, icons, formatting and touch components.
export const h = React.createElement;
export const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, useContext, createContext, Fragment, memo } = React;
export const cx = (...a) => a.filter(Boolean).join(' ');
export const NB = ' ';

// ── app context: data module, navigation and live revision ──
export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// ── icons (24 × 24, 1.8 stroke) ──
const P = {
  overview: 'M4 4h6.5v8H4zM13.5 4H20v4.5h-6.5zM13.5 11.5H20V20h-6.5zM4 15h6.5v5H4z',
  tank: 'M5 6.2C5 4.6 8.1 3.3 12 3.3s7 1.3 7 2.9v11.6c0 1.6-3.1 2.9-7 2.9s-7-1.3-7-2.9zM5 6.2c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9M5 12.8c0 1.6 3.1 2.9 7 2.9s7-1.3 7-2.9',
  transfer: 'M4 8h14.5l-3.7-3.7M20 16H5.5l3.7 3.7',
  bell: 'M6.2 16.5v-5.3a5.8 5.8 0 1 1 11.6 0v5.3l1.7 2H4.5zM9.8 20.6a2.4 2.4 0 0 0 4.4 0',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  search: 'M10.8 4.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2zM15.6 15.6 20 20',
  chevR: 'M9.5 5.5 16 12l-6.5 6.5', chevL: 'M15 5 8 12l7 7', chevD: 'M6 9.5l6 6 6-6', chevU: 'M6 14.5l6-6 6 6',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11', check: 'M5 12.5l4.5 4.5L19 7.5',
  filter: 'M4 6.5h16M7 12h10M10 17.5h4',
  ship: 'M3 14.2h18l-2.6 5.3H5.6zM6 14.2V9.5h12v4.7M10 9.5V5.5h4v4',
  truck: 'M2.8 6.5h10.8v9.2H2.8zM13.6 9.5h3.9l3 3.3v2.9h-6.9zM7 17.6a1.8 1.8 0 1 1 0 .01M17 17.6a1.8 1.8 0 1 1 0 .01',
  pipe: 'M3 8.5h4.5v7H3zM16.5 8.5H21v7h-4.5zM7.5 10.5h9M7.5 13.5h9',
  flask: 'M9 3.5v5.8L4.6 17.6a2.2 2.2 0 0 0 1.9 3.2h11a2.2 2.2 0 0 0 1.9-3.2L15 9.3V3.5M8 3.5h8M6.6 15h10.8',
  plane: 'M21 15.6l-7.6-4.3V5.8a1.4 1.4 0 0 0-2.8 0v5.5L3 15.6v2l7.6-2.3v3.6l-1.9 1.4v1.4l3.3-.9 3.3.9v-1.4l-1.9-1.4v-3.6l7.6 2.3z',
  shield: 'M12 3.2l7.3 2.9v5.4c0 4.5-3.1 7.7-7.3 9.4-4.2-1.7-7.3-4.9-7.3-9.4V6.1zM8.8 12l2.2 2.2 4.3-4.4',
  factory: 'M3 20.5V11l5.3 3.1V11l5.3 3.1V4h3v3h3v13.5zM3 20.5h18M7 17.5h2M12 17.5h2',
  clock: 'M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8zM12 7.6V12l3 2',
  warn: 'M12 4.2 21.2 19.8H2.8zM12 10v4.4M12 17v.2',
  crit: 'M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7zM12 7.6v5.6M12 16.2v.2',
  info: 'M12 3.6a8.4 8.4 0 1 1 0 16.8 8.4 8.4 0 0 1 0-16.8zM12 11v5.2M12 7.8v.2',
  pause: 'M9 6v12M15 6v12', play: 'M8 5.5l11 6.5-11 6.5z',
  sliders: 'M4 7h9M17.5 7H20M4 17h2.5M11 17h9M15.2 4.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM8.8 14.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z',
  moon: 'M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1z',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  monitor: 'M3.5 4.8h17v11.4h-17zM8.5 20h7M12 16.2V20',
  phone: 'M7.5 2.8h9a1.5 1.5 0 0 1 1.5 1.5v15.4a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.7V4.3a1.5 1.5 0 0 1 1.5-1.5zM10.5 18h3',
  user: 'M12 4.5a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zM4.6 20.2c1.3-3.6 4.1-5.5 7.4-5.5s6.1 1.9 7.4 5.5',
  share: 'M12 3.5v11M8 7.5l4-4 4 4M5.5 11.5v8h13v-8',
  install: 'M12 4v10.5M7.6 10.1 12 14.5l4.4-4.4M5 19.5h14',
  refresh: 'M19.5 7.5A8 8 0 1 0 20 12.5M19.5 3.5v4h-4',
  pin: 'M12 21s6.5-5.8 6.5-10.6a6.5 6.5 0 0 0-13 0C5.5 15.2 12 21 12 21zM12 8a2.4 2.4 0 1 1 0 4.8A2.4 2.4 0 0 1 12 8z',
  arrowR: 'M4 12h15.5M14 6l6 6-6 6',
  down: 'M12 4v11.5M7 10.5l5 5 5-5M5 20h14', up: 'M12 16.5V5M7 10l5-5 5 5M5 20h14',
  thermo: 'M10 14.6V5.2a2 2 0 0 1 4 0v9.4a4 4 0 1 1-4 0z',
  layers: 'M12 3.5l8.8 4.7L12 13 3.2 8.2zM3.2 12.5 12 17.3l8.8-4.8M3.2 16.5 12 21.3l8.8-4.8',
  gauge: 'M4.2 17.5a8 8 0 1 1 15.6 0M12 17.2l4.2-5.4',
  box: 'M3.5 7h17v11h-17zM7.6 7v11M11.8 7v11M16 7v11',
  train: 'M7 3.8h10a2.5 2.5 0 0 1 2.5 2.5v8.4a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5V6.3A2.5 2.5 0 0 1 7 3.8zM4.5 11h15M8.5 20.8l1.3-3.6M15.5 20.8l-1.3-3.6M8 14h.01M16 14h.01',
  crane: 'M5 21V5.5l7-2.3v2.3h8M12 5.5V21M5 5.5h7M17.5 5.5v5M15.8 10.5h3.4v2.8h-3.4zM3 21h11',
  warehouse: 'M3 20.5V9.2L12 4l9 5.2v11.3M7 20.5v-7.3h10v7.3M7 16.8h10',
  lab: 'M14.6 3.4l6 6M15.8 4.6l-9.6 9.6a3.5 3.5 0 0 0 5 5l9.6-9.6M8 12.4h7.4',
  list: 'M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
  ext: 'M13.5 4.5H19.5v6M19.5 4.5l-8 8M17.5 13.5v6h-13v-13h6',
  lock: 'M6.5 10.5h11v9.5h-11zM8.7 10.5V7.8a3.3 3.3 0 0 1 6.6 0v2.7',
  bolt: 'M13 3 5.5 13.5H12L11 21l7.5-10.5H12z',
  cal: 'M4 5.5h16v14.5H4zM4 9.5h16M8.5 3.5v4M15.5 3.5v4',
  eye: 'M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12zM12 9.3a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  drop: 'M12 3.5s6 6.6 6 10.7a6 6 0 0 1-12 0C6 10.1 12 3.5 12 3.5z',
  hold: 'M6 4.5h12v15H6zM10 8.5v7M14 8.5v7',
  tag: 'M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7zM7.8 7.6h.01',
  history: 'M4 12a8 8 0 1 0 2.4-5.7M4 4.5V8h3.5M12 8v4.3l3 1.8',
  bubble: 'M4.5 5h15v10.5h-8l-4.5 4v-4h-2.5z',
};
const FILLED = { more: true };
export function Icon({ n, s = 24, w = 1.8, c, style, className }) {
  const d = P[n] || P.info;
  return h('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: c || 'currentColor', strokeWidth: FILLED[n] ? 3.4 : w, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false', style, className }, h('path', { d }));
}
export const ic = (n, s, o) => h(Icon, { n, s, ...(o || {}) });

// ── formatting ──
let D = null; export const bindData = d => { D = d; };
export const fmt = (v, dp = 0) => v == null || !isFinite(v) ? '—' : D.fmt(v, dp);
export const kL = (v, dp = 0) => v == null || !isFinite(v) ? '—' : D.fmt(v, dp) + NB + 'kL';
export const tn = (v, dp = 0) => v == null || !isFinite(v) ? '—' : D.fmt(v, dp) + NB + 't';
export const pct = (v, dp = 0) => v == null || !isFinite(v) ? '—' : (v * 100).toFixed(dp) + NB + '%';
export const big = v => { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M' : a >= 1e4 ? Math.round(v / 1000) + 'k' : D.fmt(v); }; // abbreviated only from 10,000
const p2 = n => String(n).padStart(2, '0');
export const hm = (m, tz = 'WIB') => { if (m == null || !isFinite(m)) return '—'; const c = Math.round(D.clockMin(Math.round(m), tz)) % 1440; return p2(Math.floor(c / 60)) + ':' + p2(c % 60); }; // clock time only
export const when = (m, tz = 'WIB') => m == null || !isFinite(m) ? '—' : D.tm(m, tz, { tz: false }) + (tz !== 'WIB' ? ' ' + tz : ''); // clock time, with the date when not today
export const today = () => { try { return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' }).format(new Date()); } catch (e) { return D.tm(D.NOW, 'WIB', { date: true }).slice(0, 6); } };
export const ago = m => { if (m == null) return '—'; const d = Math.max(0, D.NOW - m); return d < 1 ? 'now' : d < 60 ? Math.round(d) + ' min ago' : d < 1440 ? Math.floor(d / 60) + ' h ' + (Math.round(d % 60) ? Math.round(d % 60) + ' min ' : '') + 'ago' : Math.floor(d / 1440) + ' d ago'; };
export const durS = m => { if (m == null || !isFinite(m)) return '—'; m = Math.max(0, Math.round(m)); const hh = Math.floor(m / 60), mm = m % 60; return hh >= 48 ? Math.round(hh / 24) + ' d' : hh ? `${hh} h ${mm} min` : `${mm} min`; };
export const prod = c => D.prod(c);
// product name for tight spaces: keeps the part that tells grades apart ("Jet A-1 · 5.3% bio")
export const plabel = c => { const p = D.prod(c) || {}; return String(p.label || c).replace(/\s*\((\d+(?:\.\d+)?)\s?%\s?bio(?:fuel)?\)/i, ' · $1% bio'); };
export const swatch = c => (D.prod(c) || {}).color || 'var(--ink4)';
export const plural = (n, a, b) => `${fmt(n)} ${n === 1 ? a : (b || a + 's')}`;

// tone for any state text: run · ok · warn · crit · idle · hold
export function toneOf(s) {
  if (!s) return 'idle';
  const x = String(s).toLowerCase();
  if (/critical|fail|fault|trip|breakdown|rejected|closed|stopped|offline/.test(x)) return 'crit';
  if (/hold/.test(x)) return 'hold';
  if (/attention|restricted|paused|delayed|waiting|starved|blocked|jam|anchorage|late|missing|adjust/.test(x)) return 'warn';
  if (/progress|receiving|dispatching|blending|running|pumping|loading|discharg|working|filling|exchange|berthing|charging|mixing|in test|testing/.test(x)) return 'run';
  if (/released|passed|operating|in service|completed|done|ok|resolved|accepted|received|departed/.test(x)) return 'ok';
  return 'idle';
}

// ── haptics (Android vibrate; iOS ignores) ──
export const haptic = (ms = 8) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };

// ── primitives ──
export function Pill({ t, children, title }) { return h('span', { className: 'pill t-' + (t || 'idle'), title }, h('i'), h('span', null, children)); }
export const Dot = ({ t, ring }) => h('span', { className: cx('dot', 'd-' + (t === 'hold' ? 'warn' : t || 'idle'), ring && 'ring'), 'aria-hidden': true });
// state shown as text with a leading dot, for list rows where a pill would crowd the title
export const StateText = ({ t, children }) => h('span', { className: 'st-t t' + (t || 'idle') }, h(Dot, { t }), h('span', null, children));
export const Sw = ({ c, title }) => h('span', { className: 'sw', style: { background: swatch(c) }, title, 'aria-hidden': !title });
export function Bar({ v, color, cls }) { return h('div', { className: cx('bar', cls), role: 'progressbar', 'aria-valuenow': Math.round((v || 0) * 100), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i', { style: { width: Math.max(0, Math.min(1, v || 0)) * 100 + '%', background: color || 'var(--acc)' } })); }
export function StackBar({ parts }) { const tot = parts.reduce((a, p) => a + Math.max(0, p.v), 0) || 1; return h('div', { className: 'stackbar', 'aria-hidden': true }, ...parts.filter(p => p.v > 0).map((p, i) => h('i', { key: i, style: { flexGrow: p.v / tot, background: p.c } }))); }
export function Ring({ v, size = 64, w = 7, color = 'var(--acc)', track = 'var(--fill)', children, label }) {
  const r = (size - w) / 2, C = 2 * Math.PI * r, f = Math.max(0, Math.min(1, v || 0));
  return h('div', { className: 'ring', style: { width: size, height: size }, role: 'img', 'aria-label': label },
    h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { transform: 'rotate(-90deg)' } },
      h('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: track, strokeWidth: w }),
      h('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: color, strokeWidth: w, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * (1 - f) })),
    children ? h('div', { className: 'ring-c' }, children) : null);
}
export function Prog({ v, color, label }) { return h('div', { className: 'prog' }, h(Bar, { v, color }), h('b', { className: 'num' }, label != null ? label : pct(v))); }

// a vertical tank with its level, the high-level alarm mark and a state cue
let SEQ = 0; const useUid = p => useState(() => p + (++SEQ))[0];
export function TankGlyph({ fill, color, hla, w = 34, ht = 46, state, hold }) {
  const id = useUid('tg'), f = Math.max(0, Math.min(1, fill || 0)), r = 5, inner = ht - 6, y = 3 + inner * (1 - f);
  return h('svg', { width: w, height: ht, viewBox: `0 0 ${w} ${ht}`, 'aria-hidden': true },
    h('defs', null, h('clipPath', { id }, h('rect', { x: 3, y: 3, width: w - 6, height: inner, rx: r - 2 }))),
    h('rect', { x: 1, y: 1, width: w - 2, height: ht - 2, rx: r, fill: 'var(--surf2)', stroke: 'var(--ink4)', strokeWidth: 1.2 }),
    h('g', { clipPath: `url(#${id})` },
      h('rect', { x: 3, y, width: w - 6, height: inner * f + 1, fill: color || 'var(--acc)', opacity: .92, style: { transition: 'y .6s, height .6s' } }),
      hold ? h('rect', { x: 3, y, width: w - 6, height: inner * f + 1, fill: 'url(#holdpat)' }) : null),
    hla ? h('line', { x1: 2, x2: w - 2, y1: 3 + inner * (1 - hla), y2: 3 + inner * (1 - hla), stroke: 'var(--crit)', strokeWidth: 1.2, strokeDasharray: '2.5 2' }) : null,
    state && f > .22 ? h('path', { d: state === 'in' ? `M${w / 2 - 4.5} ${y + inner * f / 2 - 2.5}l4.5 4.5 4.5-4.5` : `M${w / 2 - 4.5} ${y + inner * f / 2 + 2.5}l4.5-4.5 4.5 4.5`, stroke: '#fff', strokeWidth: 2, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }) : null);
}
export const HoldDefs = () => h('svg', { width: 0, height: 0, style: { position: 'absolute' }, 'aria-hidden': true }, h('defs', null, h('pattern', { id: 'holdpat', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: 'rgba(0,0,0,.35)', strokeWidth: 2 }))));

// pressable that also shows the pressed state on touch devices (iOS needs a touch listener for :active)
export function Press({ as = 'button', onPress, className, children, label, style, disabled, ...rest }) {
  return h(as, { type: as === 'button' ? 'button' : undefined, className, style, disabled, 'aria-label': label, onClick: disabled ? undefined : e => { if (onPress) { haptic(5); onPress(e); } }, ...rest }, children);
}

// ── lists ──
export function Section({ title, action, onAction, children, small, foot, id, className }) {
  return h('section', { className: cx('sec', className), id },
    title ? (small ? h('div', { className: 'grp-h' }, h('span', null, title), action ? h('button', { onClick: onAction, style: { color: 'var(--acc)', textTransform: 'none', letterSpacing: 0, fontWeight: 500, fontSize: 14 } }, action) : null)
      : h('div', { className: 'sec-h' }, h('h2', { className: 'ell' }, title), action ? h('button', { className: 'act', onClick: onAction }, action) : null)) : null,
    children, foot ? h('div', { className: 'grp-f' }, foot) : null);
}
export const Group = ({ children, style }) => h('div', { className: 'grp', style }, children);
// keeps hyphenated names such as Soekarno-Hatta on one line when a title wraps
export const keepHy = t => typeof t !== 'string' || !/\S-\S/.test(t) ? t : t.split(/(\S+-\S+)/).map((x, i) => i % 2 ? h('span', { key: i, style: { whiteSpace: 'nowrap' } }, x) : x);
export function Row({ icon, iconBg, iconSoft, lead, title, strong, sub, sub2, value, valueSub, plainValue, chevron, onPress, compact, tall, mono, right, label, two, wrap }) {
  const hasIc = !!(icon || lead);
  const body = [
    icon ? h('span', { key: 'ic', className: cx('row-ic', iconSoft && 'soft'), style: iconBg ? { background: iconBg } : null }, ic(icon, 18, { w: 2 })) : lead ? h('span', { key: 'ld', className: 'row-lead' }, lead) : null,
    h('span', { key: 'm', className: 'row-main' }, h('span', { className: cx('row-t', strong && 'strong', wrap ? 'wrap' : 'ell', mono && 'mono') }, wrap ? keepHy(title) : title), sub ? h('span', { className: cx('row-s', two ? 'two' : 'ell') }, sub) : null, sub2 ? h('span', { className: 'row-s ell' }, sub2) : null),
    right ? h('span', { key: 'r', style: { flex: 'none', display: 'flex', alignItems: 'center', gap: 8 } }, right) : null,
    value != null || valueSub != null ? h('span', { key: 'v', className: 'row-v' }, value != null ? h('b', { className: 'num' }, value) : null, valueSub != null ? h('span', null, valueSub) : null) : null,
    plainValue != null ? h('span', { key: 'pv', className: 'row-v plain' }, plainValue) : null,
    chevron || (onPress && chevron !== false) ? h('span', { key: 'c', className: 'chev' }, ic('chevR', 18, { w: 2.2 })) : null,
  ];
  const cls = cx('row', compact && 'compact', tall && 'tall', hasIc && 'has-ic', onPress && 'press');
  return onPress ? h(Press, { className: cls, onPress, label }, ...body) : h('div', { className: cls }, ...body);
}
export function KV({ rows }) { return h('dl', { className: 'grp', style: { margin: '0 var(--gut)' } }, ...rows.filter(Boolean).map((r, i) => h('div', { key: i, className: 'kv' }, h('dt', null, r[0]), h('dd', { className: cx('num', r[2] && r[2].mono && 'mono'), style: r[2] && r[2].color ? { color: r[2].color } : null }, r[1] == null || r[1] === '' ? '—' : r[1])))); }

// ── figures ──
export function Stat({ label, icon, value, unit, sub, t, onPress, ellSub }) {
  const kids = [h('div', { key: 'l', className: 'stat-l' }, icon ? ic(icon, 16, { w: 2 }) : null, h('span', { className: 'ell' }, label)), h('div', { key: 'v', className: 'stat-v num' }, value, unit ? h('small', null, unit) : null), sub ? h('div', { key: 's', className: cx('stat-s', ellSub && 'ell') }, sub) : null, t === 'warn' || t === 'crit' ? h('span', { key: 't', className: 'tone-dot' }, h(Dot, { t })) : null];
  return onPress ? h(Press, { className: 'stat press', onPress }, ...kids) : h('div', { className: 'stat' }, ...kids);
}
export function Fig({ l, v, u }) { return h('div', { className: 'fig' }, h('div', { className: 'fig-l ell' }, l), h('div', { className: 'fig-v num' }, v, u ? h('small', null, u) : null)); }

// ── controls ──
export function Seg({ items, value, onChange, label }) {
  const i = Math.max(0, items.findIndex(x => x[0] === value)), n = items.length;
  return h('div', { className: 'seg-wrap' }, h('div', { className: 'seg', role: 'tablist', 'aria-label': label },
    h('span', { className: 'seg-thumb', style: { width: `calc((100% - 4px) / ${n})`, transform: `translateX(${i * 100}%)` }, 'aria-hidden': true }),
    ...items.map(([id, l, n2]) => h('button', { key: id, role: 'tab', 'aria-selected': id === value ? 'true' : 'false', onClick: () => { if (id !== value) { haptic(4); onChange(id); } } }, h('span', null, l), n2 != null ? h('em', null, n2) : null))));
}
export function Chips({ items, value, onChange, label }) {
  return h('div', { className: 'chips', role: 'toolbar', 'aria-label': label }, ...items.map(([id, l, n]) => h('button', { key: id, className: 'chip', 'aria-pressed': id === value ? 'true' : 'false', onClick: () => { haptic(4); onChange(id === value && id !== items[0][0] ? items[0][0] : id); } }, l, n != null ? h('em', null, n) : null)));
}
export function SearchField({ value, onChange, placeholder, autoFocus, onFocus }) {
  return h('label', { className: 'search' }, ic('search', 18, { w: 2 }), h('input', { type: 'search', value, placeholder, autoFocus, onFocus, enterKeyHint: 'search', autoComplete: 'off', autoCorrect: 'off', spellCheck: false, onChange: e => onChange(e.target.value), 'aria-label': placeholder }), value ? h('button', { className: 'clr', onClick: e => { e.preventDefault(); onChange(''); }, 'aria-label': 'Clear search' }, ic('close', 16, { w: 2.4 })) : null);
}
export function Btn({ kind = 'primary', onPress, icon, children, disabled, small }) { return h(Press, { className: cx('btn', kind, small && 'small'), onPress, disabled }, icon ? ic(icon, 20, { w: 2 }) : null, children); }
export function Empty({ icon = 'check', title, text }) { return h('div', { className: 'empty' }, h('div', { className: 'e-ic' }, ic(icon, 26)), h('b', null, title), text ? h('p', null, text) : null); }

// ── touch chart: area line with a scrub readout ──
export function TrendChart({ pts, color = 'var(--acc)', unit = '', height = 150, refs = [], tz = 'WIB', fmtV = v => fmt(v), y0, y1 }) {
  const ref = useRef(null), [w, setW] = useState(340), [hi, setHi] = useState(null), gid = useUid('gr');
  useLayoutEffect(() => { const el = ref.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth || 340)); ro.observe(el); setW(el.clientWidth || 340); return () => ro.disconnect(); }, []);
  if (!pts || pts.length < 2) return h('div', { ref, className: 'empty', style: { padding: 24 } }, h('p', null, 'Collecting history…'));
  const L = 6, R = 6, T = 26, B = 22, iw = Math.max(10, w - L - R), ih = height - T - B;
  const ts = pts.map(p => p.t), vs = pts.map(p => p.v), t0 = ts[0], t1 = ts[ts.length - 1];
  let lo = y0 != null ? y0 : Math.min(...vs, ...refs.map(r => r.v)), hiV = y1 != null ? y1 : Math.max(...vs, ...refs.map(r => r.v));
  if (hiV - lo < 1e-6) { hiV += 1; lo -= 1; } const pad = (hiV - lo) * .08; if (y0 == null) lo -= pad; if (y1 == null) hiV += pad;
  const X = t => L + (t - t0) / Math.max(1, t1 - t0) * iw, Y = v => T + ih - (v - lo) / (hiV - lo) * ih;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(t1).toFixed(1)} ${T + ih} L${X(t0).toFixed(1)} ${T + ih} Z`;
  const ticks = []; const span = t1 - t0, step = span > 1440 * 2 ? 720 : span > 600 ? 360 : 120; for (let t = Math.ceil((t0 + 420) / step) * step - 420; t <= t1; t += step) ticks.push(t);
  const scrub = e => { const r = ref.current.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left, t = t0 + (x - L) / iw * (t1 - t0); let best = 0; pts.forEach((p, i) => { if (Math.abs(p.t - t) < Math.abs(pts[best].t - t)) best = i; }); setHi(best); };
  const p = hi != null ? pts[hi] : null;
  return h('div', { ref, className: 'chart', style: { height }, onTouchStart: scrub, onTouchMove: scrub, onTouchEnd: () => setHi(null), onMouseMove: scrub, onMouseLeave: () => setHi(null), role: 'img', 'aria-label': `Trend, latest ${fmtV(vs[vs.length - 1])} ${unit}` },
    h('svg', { width: w, height, viewBox: `0 0 ${w} ${height}` },
      h('defs', null, h('linearGradient', { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 }, h('stop', { offset: 0, stopColor: color, stopOpacity: .28 }), h('stop', { offset: 1, stopColor: color, stopOpacity: 0 }))),
      [0, .5, 1].map(f => h('line', { key: 'g' + f, x1: L, x2: L + iw, y1: T + ih * f, y2: T + ih * f, stroke: 'var(--sep)', strokeWidth: 1 })),
      ...refs.map((r, i) => h('g', { key: 'r' + i }, h('line', { x1: L, x2: L + iw, y1: Y(r.v), y2: Y(r.v), stroke: r.color || 'var(--crit)', strokeDasharray: '4 3', strokeWidth: 1.2 }), h('text', { x: L + iw, y: Y(r.v) - 5, textAnchor: 'end', fontSize: 11, fill: r.color || 'var(--crit)', fontWeight: 600 }, r.label))),
      h('path', { d: area, fill: `url(#${gid})` }), h('path', { d: line, fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round' }),
      ...ticks.filter(t => X(t) > L + 18 && X(t) < L + iw - 18).map(t => h('text', { key: 't' + t, x: X(t), y: height - 5, textAnchor: 'middle', fontSize: 11, fill: 'var(--ink3)' }, hm(t, tz))),
      h('text', { x: L, y: 13, fontSize: 11.5, fill: 'var(--ink3)' }, `${fmtV(hiV)} ${unit}`), h('text', { x: L, y: T + ih - 4, fontSize: 11.5, fill: 'var(--ink3)' }, `${fmtV(lo)}`),
      p ? h('g', null, h('line', { x1: X(p.t), x2: X(p.t), y1: T - 4, y2: T + ih, stroke: 'var(--ink3)', strokeWidth: 1 }), h('circle', { cx: X(p.t), cy: Y(p.v), r: 5, fill: color, stroke: 'var(--surf)', strokeWidth: 2.5 })) : h('circle', { cx: X(t1), cy: Y(vs[vs.length - 1]), r: 4, fill: color, stroke: 'var(--surf)', strokeWidth: 2 })),
    p ? h('div', { className: 'chart-tip', style: { left: Math.max(48, Math.min(w - 48, X(p.t))) } }, `${fmtV(p.v)} ${unit} · ${hm(p.t, tz)}`) : null);
}
