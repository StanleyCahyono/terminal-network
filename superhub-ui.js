// Superhub workspace views for TBBM Terminal Lubricant Superhub Maiza Lubrika (MLB).
// Rendered with React.createElement by Superhub.dc.html. Simulation only; no equipment is controlled.
let h = null, D = null, ctx = null, I = null, ST = null, A = null, HUB = null, S = null, tz = 'WIB';
const NB = ' ';
export const TABS = [['plan', 'Site plan'], ['marine', 'Marine'], ['tanks', 'Tank farms'], ['blend', 'Blending'], ['fill', 'Filling'], ['wh', 'Warehouse & gate'], ['iso', 'ISO & rail'], ['lab', 'Quality lab'], ['products', 'Products'], ['log', 'Events']];

// ── formatting ──
const T0 = (v, dp = 0) => v == null || !isFinite(v) ? '—' : D.fmt(v, dp) + NB + 't';
const KL = (v, dp = 0) => v == null || !isFinite(v) ? '—' : D.fmt(v, dp) + NB + 'kL';
const PCT = (v, dp = 0) => v == null || !isFinite(v) ? '—' : (v * 100).toFixed(dp) + NB + '%';
const DAYS = v => v == null || !isFinite(v) ? '—' : (v >= 99 ? '99+' : v.toFixed(1)) + NB + 'd';
const HRS = m => m == null || !isFinite(m) ? '—' : (m / 60).toFixed(1) + NB + 'h';
const TM = m => m == null ? '—' : D.tm(m, tz);
const AGO = m => m == null ? '—' : D.dur(Math.max(0, D.NOW - m));
const prodOf = c => D.prod(c);
const shortOf = c => (prodOf(c) || {}).short || c;
const famColor = c => (prodOf(c) || {}).color || 'var(--ink3)';

// ── state tones ──
export function tone(s) {
  if (!s) return 'idle';
  const x = String(s).toLowerCase();
  if (/fault|trip|breakdown|rejected|down|failed|critical|stopped/.test(x)) return 'crit';
  if (/starved|waiting|paused|blocked|jam|anchorage|delayed|on hold|adjust|awaiting ullage|attention|late/.test(x)) return 'warn';
  if (/maintenance|planned|cancelled/.test(x)) return 'off';
  if (/running|filling|discharg|loading|blending|working|exchange|charging|dosing|mixing|transfer|stuffing|lifting|sealing|heating|cleaning|flushing|pigging|line-up|in-process|preparing|berthing|pre-op|post-op|shunting|inspection|brake|settling|receiving|dispatching|unloading|at bay|gate|weigh|saponif|complex|dehydrat|cut-back|additives|consistency|milling|reaction|finishing|charg|in test|turnaround|qc hold|trim|re-test|drain|connecting/.test(x)) return 'run';
  if (/released|passed|done|departed|completed|free|ok|resolved/.test(x)) return 'ok';
  return 'idle';
}
const TC = { run: 'var(--acc)', ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)', off: 'var(--ink4)', idle: 'var(--ink4)' };
const TSOFT = { run: 'var(--accSoft)', ok: 'var(--okSoft)', warn: 'var(--warnSoft)', crit: 'var(--critSoft)', off: 'var(--surf2)', idle: 'var(--surf2)' };
const TINK = { run: 'var(--ink)', ok: 'var(--ink)', warn: 'var(--warnInk)', crit: 'var(--critInk)', off: 'var(--ink3)', idle: 'var(--ink3)' };
const STK = { run: 'active', ok: 'ok', warn: 'attention', crit: 'critical', off: 'off', idle: 'idle' };

// ── small building blocks ──
const k = () => undefined; // children are passed positionally, so React matches them by position; explicit keys only where identity matters
const div = (style, ...kids) => { if (style && style.key != null) { const { key, ...st } = style; return h('div', { key, style: st }, ...kids); } return h('div', { style }, ...kids); };
const span = (style, ...kids) => h('span', { style }, ...kids);
const ell = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
// a chip naming one piece of equipment: pressing it opens that equipment's details
function chipBtn(label, t, onClick, on, title) {
  const tn = t || tone(label);
  return h('button', { onClick, title: title || label, 'aria-pressed': on ? 'true' : 'false', className: 'sh-chip sh-press', style: { display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 7px', border: '1px solid ' + (on ? 'var(--acc)' : 'var(--line)'), boxShadow: on ? 'inset 0 0 0 1px var(--acc)' : 'none', background: TSOFT[tn], color: TINK[tn], font: 'inherit', fontSize: 12, whiteSpace: 'nowrap', maxWidth: '100%', minWidth: 0, cursor: 'pointer' } },
    I.st[STK[tn]], span({ ...ell }, label));
}
function chip(label, t, title) {
  const tn = t || tone(label);
  return h('span', { title: title || label, className: 'sh-chip', style: { display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 7px', border: '1px solid var(--line)', background: TSOFT[tn], color: TINK[tn], fontSize: 12, whiteSpace: 'nowrap', maxWidth: '100%', minWidth: 0 } },
    I.st[STK[tn]], span({ ...ell }, label));
}
function dot(t, size = 8) { return span({ width: size, height: size, flex: 'none', background: TC[t] || t, display: 'inline-block' }); }
function sw(color, comp) { return span({ width: 9, height: 9, flex: 'none', display: 'inline-block', background: comp ? `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 4px)` : color, border: comp ? `1px solid ${color}` : 'none' }); }
function bar(frac, color, height = 6, bg) {
  const f = Math.max(0, Math.min(1, frac || 0));
  return div({ height, background: bg || 'var(--surf3)', position: 'relative', overflow: 'hidden', flex: 'none' },
    h('div', { className: 'tn-bar', style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: (f * 100).toFixed(1) + '%', background: color || 'var(--acc)' } }));
}
function kv(label, value, o = {}) {
  return div({ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, padding: '5px 0', borderBottom: o.last ? 0 : '1px solid var(--line2)' },
    span({ color: 'var(--ink3)', fontSize: 12.5, flex: 'none', minWidth: o.w || 128 }, label),
    span({ ...ell, flex: 1, textAlign: 'right', fontFamily: o.f === 'sans' ? 'var(--fsans)' : 'var(--fnum)', fontSize: 13, color: o.color || 'var(--ink)' , whiteSpace: o.wrap ? 'normal' : 'nowrap' }, value));
}
function kpi(label, value, sub, t, onClick) {
  const tn = t || 'idle', body = [
    span({ fontSize: 12, color: 'var(--ink3)', ...ell }, label),
    span({ fontFamily: 'var(--fnum)', fontSize: 17, fontWeight: 500, color: t && t !== 'idle' && t !== 'run' && t !== 'ok' ? TINK[tn] : 'var(--ink)', ...ell }, value),
    sub != null ? span({ fontSize: 11.5, color: 'var(--ink3)', minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.35 }, sub) : null,
  ];
  const style = { display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 11px', minWidth: 0, background: 'var(--surf)', border: '1px solid var(--line)', borderLeft: t && t !== 'idle' ? `3px solid ${TC[tn]}` : '1px solid var(--line)', textAlign: 'left', color: 'var(--ink)' };
  return onClick ? h('button', { key: k(), onClick, className: 'sh-press', style: { ...style, cursor: 'pointer', font: 'inherit' } }, ...body) : h('div', { key: k(), style }, ...body);
}
function section(title, right, kids, o = {}) {
  return h('section', { key: o.key || 's-' + title, 'aria-label': o.aria || title, className: o.cls || 'tn-rise', style: { background: 'var(--surf)', border: '1px solid var(--pBd)', minWidth: 0, display: 'flex', flexDirection: 'column', ...(o.style || {}) } },
    div({ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--line)', minWidth: 0, flexWrap: 'wrap' },
      h('h2', { style: { margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '.01em', ...ell, flex: '1 1 auto' } }, title),
      right ? div({ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0, justifyContent: 'flex-end' }, ...(Array.isArray(right) ? right : [right])) : null),
    div({ padding: o.pad != null ? o.pad : '10px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: o.gap != null ? o.gap : 8, ...(o.body || {}) }, ...(Array.isArray(kids) ? kids : [kids])));
}
function grid(min, kids, gap = 10) { return div({ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`, gap, minWidth: 0 }, ...kids); }
// stock cover in days: a hub turning its tanks every few days is short below 3.5 days and critical below 2
const covInk = d => d < 2 ? 'var(--critInk)' : d < 3.5 ? 'var(--warnInk)' : 'var(--ink)';
function seg(list, cur, onPick, aria) {
  return h('div', { role: 'group', 'aria-label': aria, style: { display: 'flex', border: '1px solid var(--line)', flexWrap: 'wrap', minWidth: 0 } },
    ...list.map(([id, label], i) => h('button', { key: id, onClick: () => onPick(id), 'aria-pressed': cur === id ? 'true' : 'false', className: 'sh-seg', style: { height: 28, padding: '0 10px', border: 0, borderLeft: i ? '1px solid var(--line)' : 0, background: cur === id ? 'var(--ink)' : 'var(--surf)', color: cur === id ? 'var(--surf)' : 'var(--ink)', fontSize: 12.5, whiteSpace: 'nowrap', cursor: 'pointer' } }, label)));
}
// a list table: columns [{ label, w (css grid track), f: row → text|element, align, mono }]
function table(cols, rows, o = {}) {
  const tpl = cols.map(c => c.w || 'minmax(0,1fr)').join(' ');
  const head = div({ display: 'grid', gridTemplateColumns: tpl, gap: 10, padding: '6px 10px', borderBottom: '1px solid var(--line)', fontSize: 11.5, color: 'var(--ink3)', position: o.sticky ? 'sticky' : 'static', top: 0, background: 'var(--surf)', zIndex: 1 },
    ...cols.map(c => span({ ...ell, textAlign: c.align || 'left' }, c.label)));
  const body = rows.length ? rows.map((r, i) => {
    const cells = cols.map(c => { const v = c.f(r); return span({ ...ell, textAlign: c.align || 'left', fontFamily: c.mono ? 'var(--fnum)' : 'var(--fsans)', fontSize: 12.5, color: c.color ? c.color(r) : 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start' }, ...(Array.isArray(v) ? v : [typeof v === 'string' || typeof v === 'number' ? span({ ...ell, display: 'block' }, v) : v])); });
    const on = o.selected && o.selected(r), style = { display: 'grid', gridTemplateColumns: tpl, gap: 10, padding: '7px 10px', borderBottom: '1px solid var(--line2)', alignItems: 'center', minWidth: 0, background: on ? 'var(--accSoft)' : 'transparent', boxShadow: on ? 'inset 3px 0 0 var(--acc)' : 'none', textAlign: 'left', width: '100%', font: 'inherit', color: 'var(--ink)' };
    return o.onRow ? h('button', { key: o.key ? o.key(r) : i, onClick: () => o.onRow(r), 'aria-pressed': on ? 'true' : 'false', className: 'sh-row', style: { ...style, border: 0, borderBottom: '1px solid var(--line2)', cursor: 'pointer' } }, ...cells) : h('div', { key: o.key ? o.key(r) : i, style }, ...cells);
  }) : [div({ padding: '14px 10px', fontSize: 12.5, color: 'var(--ink3)' }, o.empty || 'Nothing to show.')];
  return div({ minWidth: 0, overflowX: o.scroll ? 'auto' : 'visible', maxHeight: o.max || 'none', overflowY: o.max ? 'auto' : 'visible' }, div({ minWidth: o.minW || 0 }, head, ...body));
}
function empty(text) { return div({ padding: '12px 2px', fontSize: 12.5, color: 'var(--ink3)' }, text); }
function btn(label, onClick, o = {}) {
  return h('button', { key: o.key || label, onClick, title: o.title, className: 'sh-press', style: { height: 30, padding: '0 11px', border: '1px solid ' + (o.primary ? 'var(--ink)' : 'var(--line)'), background: o.primary ? 'var(--ink)' : 'var(--surf)', color: o.primary ? 'var(--surf)' : 'var(--ink)', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer', flex: 'none' } }, o.icon || null, label);
}
// tile: a pressable card for an asset (tank, blender, line, crane …)
function tile(o) {
  const tn = o.tone || 'idle', on = !!o.on;
  return h('button', { key: o.key, onClick: o.onClick, 'aria-pressed': on ? 'true' : 'false', title: o.title || (o.state ? `${o.id} · ${o.state}` : o.id), className: 'sh-tile tn-lift', style: { display: 'flex', flexDirection: 'column', gap: 5, padding: '9px 10px 10px', minWidth: 0, textAlign: 'left', font: 'inherit', color: 'var(--ink)', background: on ? 'var(--accSoft)' : 'var(--surf)', border: '1px solid ' + (on ? 'var(--acc)' : 'var(--line)'), borderTop: `3px solid ${TC[tn]}`, cursor: 'pointer', position: 'relative' } },
    div({ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }, o.sw || null, span({ fontFamily: o.sans ? 'var(--fsans)' : 'var(--fid)', fontSize: o.sans ? 13 : 12.5, fontWeight: 600, flex: '0 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, o.id), span({ ...ell, flex: 1, fontSize: 11.5, color: TINK[tn], textAlign: 'right' }, o.state || '')),
    o.line1 != null ? span({ ...ell, fontSize: 12.5 }, o.line1) : null,
    o.line2 != null ? span({ ...ell, fontSize: 11.5, color: 'var(--ink3)' }, o.line2) : null,
    o.frac != null ? bar(o.frac, o.barColor || TC[tn], 5) : null);
}

// ── site plan (viewBox 1200 × 760): sea and jetties in the north, product flows north → south, ISO and rail on the east ──
const PAL = {
  light: { sea: '#c9d5de', seaBd: '#9fb1be', land: '#e1e4e7', zone: '#f4f5f6', zoneBd: '#a3a9af', txt: '#23272b', mute: '#545c64', faint: '#7d858c', tank: '#ffffff', tankBd: '#6a7279', pier: '#8d949a', hull: '#39414a', rail: '#6b7279', road: '#c3c8cd', pipe: '#9aa0a6', sel: '#1f63c4', selSoft: 'rgba(31,99,196,.10)', hatch: 'rgba(0,0,0,.30)', idle: '#c9cdd1', free: '#ffffff' },
  dark: { sea: '#1b2731', seaBd: '#36495a', land: '#22262b', zone: '#2a2f34', zoneBd: '#4d555c', txt: '#e5e8eb', mute: '#a8afb6', faint: '#7f878f', tank: '#30353b', tankBd: '#a3aab1', pier: '#5f676f', hull: '#cfd4d9', rail: '#8a9198', road: '#363c42', pipe: '#4f565d', sel: '#7fb0ff', selSoft: 'rgba(127,176,255,.13)', hatch: 'rgba(0,0,0,.45)', idle: '#4a5158', free: '#30353b' },
};
let P = PAL.light;
const sty = o => ({ style: o });
const txt = (x, y, s, o = {}) => h('text', { key: o.key || k(), x, y, textAnchor: o.a || 'start', style: { fontSize: o.fs || 12, fontWeight: o.fw || 400, fill: o.c || P.txt, fontFamily: o.mono ? 'var(--fnum)' : 'var(--fsans)', pointerEvents: 'none' } }, s);
const rect = (x, y, w, hh, st, o = {}) => h('rect', { key: o.key || k(), x, y, width: Math.max(0, w), height: Math.max(0, hh), className: o.cls, style: st }, o.title ? h('title', null, o.title) : null);
const stc = t => ({ run: 'var(--acc)', ok: 'var(--ok)', warn: 'var(--warn)', crit: 'var(--crit)', off: P.idle, idle: P.idle })[t] || t;
function zoneG(id, r, title, right, kids, label) {
  const [x, y, w, hh] = r, on = ST.zone === id;
  const pick = () => A.zone(id);
  return h('g', { key: 'z-' + id, className: 'sh-zone' + (on ? ' on' : ''), role: 'button', tabIndex: 0, 'aria-label': (label || title) + ' — show details', 'aria-pressed': on ? 'true' : 'false', onClick: pick, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } } },
    h('rect', { x, y, width: w, height: hh, className: 'sh-zbg', style: { fill: on ? P.selSoft : P.zone, stroke: on ? P.sel : P.zoneBd, strokeWidth: on ? 2 : 1 } }),
    txt(x + 9, y + 18, title, { fs: 14, fw: 600 }),
    right ? txt(x + w - 9, y + 18, right, { fs: 12, c: P.mute, a: 'end', mono: true }) : null,
    ...kids);
}
// a plan item that opens its own details; the press stops here instead of opening the zone underneath.
// box = [x, y, w, h]; the transparent hit box on top widens tiny targets by pad and shows hover and selection
function hit(kind, id, box, kids, o = {}) {
  const [x, y, w, hh] = box, on = isSel(kind, id), [px, py] = Array.isArray(o.pad) ? o.pad : [o.pad ?? 1.5, o.pad ?? 1.5];
  return h('g', { key: o.key || 'h-' + kind + id, className: 'sh-hit' + (on ? ' on' : ''), onClick: e => { e.stopPropagation(); A.sel(kind, id); } }, ...kids,
    h('rect', { key: 'hb', x: x - px, y: y - py, width: w + 2 * px, height: hh + 2 * py, className: 'sh-hitbox', style: on ? { fill: 'transparent', stroke: P.sel, strokeWidth: 2 } : { fill: 'transparent' } }, o.title ? h('title', null, o.title) : null));
}
// a tank square with a level fill and its state marks
function tankSq(x, y, s, kk, color, pad = 1.5) {
  const f = Math.max(0, Math.min(1, (kk.vol - 0) / kk.nominal)), free = kk.free || kk.state === 'Free', st = kk.state;
  const kids = [rect(x, y, s, s, { fill: free ? P.free : P.tank, stroke: st === 'Blending' ? 'var(--acc)' : st === 'Adjusting' || kk.q === 'On hold' ? 'var(--warn)' : P.tankBd, strokeWidth: st === 'Blending' ? 1.6 : 1, strokeDasharray: free ? '2 2' : 'none' })];
  if (!free) kids.push(rect(x + 1, y + s - 1 - (s - 2) * f, s - 2, (s - 2) * f, { fill: color, opacity: .9 }));
  if (st === 'QC hold' || st === 'Adjusting' || kk.q === 'On hold') kids.push(rect(x + 1, y + 1, s - 2, s - 2, { fill: 'url(#shHatch)' }));
  if (st === 'Cleaning') kids.push(h('path', { key: k(), d: `M${x + 3} ${y + s - 3}L${x + s - 3} ${y + 3}`, style: { stroke: P.mute, strokeWidth: 1.2 } }));
  if (kk.pIn > 0 || kk.state === 'Receiving') kids.push(h('circle', { key: k(), cx: x + s - 3, cy: y + 3, r: 2.4, className: 'sh-blink', style: { fill: 'var(--acc)' } }));
  return hit('tank', kk.id, [x, y, s, s], kids, { key: 't' + kk.id, pad, title: `${kk.id} · ${free ? 'Free, clean' : shortOf(kk.code)} · ${Math.round(f * 100)} % · ${kk.status}` });
}
function stateSq(x, y, w, hh, t, frac, title, o = {}) {
  const kids = [rect(x, y, w, hh, { fill: t === 'idle' || t === 'off' ? P.tank : stc(t), opacity: t === 'idle' || t === 'off' ? 1 : .22, stroke: t === 'idle' || t === 'off' ? P.tankBd : stc(t), strokeWidth: 1 }, o.hit ? {} : { title })];
  if (frac != null && t !== 'idle' && t !== 'off') kids.push(rect(x, y + hh - Math.max(1.5, hh * .22), w * Math.max(0, Math.min(1, frac)), Math.max(1.5, hh * .22), { fill: stc(t) }));
  if (t === 'warn' || t === 'crit') kids.push(rect(x + 1, y + 1, w - 2, hh - 2, { fill: 'none', stroke: stc(t), strokeWidth: 1.4 }));
  if (o.dot) kids.push(h('circle', { key: k(), cx: x + w / 2, cy: y + hh / 2, r: Math.min(w, hh) * .18, style: { fill: stc(t) } }));
  if (o.hit) return hit(o.hit[0], o.hit[1], [x, y, w, hh], kids, { key: o.key, pad: o.pad, title });
  return h('g', { key: o.key || k() }, ...kids);
}
const BUND_LABEL = { 'BOT-A': 'A · SN150/500', 'BOT-B': 'B · SN500', 'BOT-C': 'C · BS150', 'BOT-D': 'D · 150N/600N', 'BOT-E': 'E · Group III', 'BOT-F': 'F · specialty' };
const VW = { IMP: 70, CST: 56, ADD: 54, FBC: 48, SPOB: 34, FDR: 84, BXP: 60, BXB: 38 };
const VC = { IMP: 'oklch(0.55 0.10 230)', CST: 'oklch(0.62 0.09 75)', ADD: 'oklch(0.58 0.11 310)', FBC: 'oklch(0.60 0.10 150)', SPOB: 'oklch(0.62 0.08 190)', FDR: 'oklch(0.55 0.04 260)', BXP: 'oklch(0.52 0.12 25)', BXB: 'oklch(0.60 0.11 350)' };
function plan() {
  P = PAL[ctx.theme === 'dark' ? 'dark' : 'light'];
  const K = S.kpi, kids = [];
  kids.push(h('defs', { key: 'defs' }, h('pattern', { id: 'shHatch', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('line', { x1: 0, y1: 0, x2: 0, y2: 5, style: { stroke: P.hatch, strokeWidth: 2 } }))));
  kids.push(rect(0, 0, 1200, 760, { fill: P.land }));
  // ── sea, jetties, vessels and anchorage ──
  const seaKids = [rect(0, 0, 1200, 92, { fill: P.sea }), h('line', { key: 'coast', x1: 0, x2: 1200, y1: 92, y2: 92, style: { stroke: P.seaBd, strokeWidth: 1.5 } }), txt(680, 52, 'Java Sea', { fs: 13, c: P.faint })];
  const JX = { J1: 50, J2: 130, J3: 260, J4: 340, J5: 430, J6: 530, J7: 600, J8: 820, J9: 920 };
  seaKids.push(rect(770, 62, 200, 30, { fill: P.pier, opacity: .55 }));
  ['J8', 'J9'].forEach((id, i) => seaKids.push(hit('jetty', id, [770 + i * 100, 62, 100, 30], [], { key: 'q' + id, pad: 0, title: `${id} · container feeder quay` })));
  S.jetties.forEach(j => {
    const cx = JX[j.id], v = j.vessel ? S.vessels.find(x => x.id === j.vessel) : null;
    if (j.id !== 'J8' && j.id !== 'J9') seaKids.push(hit('jetty', j.id, [cx - 4, 30, 8, 62], [rect(cx - 4, 30, 8, 62, { fill: P.pier })], { key: 'p' + j.id, pad: [7, 0], title: `${j.id} · ${j.role}` }));
    seaKids.push(txt(cx + (j.id === 'J8' || j.id === 'J9' ? -30 : 7), 86, j.id, { fs: 12, c: P.mute, fw: 600, mono: true }));
    if (v) {
      const w = VW[v.cls] || 50, x = cx - w / 2, y = 10, done = v.parcels.length ? v.parcels.reduce((a, p) => a + p.done, 0) / Math.max(1, v.parcels.reduce((a, p) => a + p.t, 0)) : v.moves ? v.moves.done / Math.max(1, v.moves.planned) : 0;
      const tn = v.pause ? 'warn' : /Discharging|Loading|Exchange/.test(v.state) ? 'run' : 'idle';
      seaKids.push(hit('vessel', v.id, [x, y, w, 22.5], [h('path', { key: 'hull', d: `M${x} ${y}h${w - 8}l8 8l-8 8h${-(w - 8)}z`, style: { fill: VC[v.cls], stroke: P.hull, strokeWidth: 1 } }),
        txt(x + (w - 8) / 2, y + 12, v.cls, { fs: 10.5, c: '#fff', fw: 600, a: 'middle' }), rect(x, y + 19, w, 3.5, { fill: P.tank }), rect(x, y + 19, w * Math.min(1, done), 3.5, { fill: stc(tn) })], { key: 'v' + v.id, pad: 1, title: `${v.name} · ${v.label} · ${v.step}` }));
    }
  });
  const anch = S.vessels.filter(v => v.state === 'At anchorage'), exp = S.vessels.filter(v => v.state === 'Expected' && v.eta - D.NOW < 1440);
  seaKids.push(txt(1188, 18, `Anchorage · ${anch.length}`, { fs: 12, c: P.mute, a: 'end' }), txt(1188, 84, `Next 24 h · ${exp.length} arriving`, { fs: 12, c: P.mute, a: 'end' }));
  anch.slice(0, 5).forEach((v, i) => seaKids.push(hit('vessel', v.id, [1180 - i * 34 - 26, 34, 24, 12], [h('path', { key: 'a', d: `M${1180 - i * 34 - 26} 34h18l6 6l-6 6h-18z`, style: { fill: VC[v.cls], opacity: .85 } })], { key: 'a' + v.id, pad: 3, title: `${v.name} · at anchorage since ${TM(v.anchorSince)}` })));
  kids.push(zoneG('marine', [0, 0, 1200, 92], '', null, seaKids, 'Marine · 9 jetties'));
  // pipe rack
  kids.push(h('line', { key: 'rack', x1: 20, x2: 742, y1: 104, y2: 104, className: S.vessels.some(v => v.state === 'Discharging') ? 'sh-flow' : '', style: { stroke: P.pipe, strokeWidth: 3, strokeDasharray: '7 5' } }));
  // ── base-oil tank farm ──
  const BOT = S._tanks.BOT, bunds = ['BOT-A', 'BOT-B', 'BOT-C', 'BOT-D', 'BOT-E', 'BOT-F'], botK = [];
  bunds.forEach((b, i) => {
    const bx = 22 + (i % 3) * 102, by = 144 + Math.floor(i / 3) * 86, ts = BOT.filter(t => t.bund === b);
    botK.push(rect(bx, by, 96, 80, { fill: 'none', stroke: P.zoneBd, strokeDasharray: '3 2' }), txt(bx + 5, by + 13, BUND_LABEL[b], { fs: 11, c: P.mute }));
    ts.forEach((t, j) => botK.push(tankSq(bx + 6 + (j % 3) * 30, by + 20 + Math.floor(j / 3) * 29, 24, t, famColor(t.code), 2)));
  });
  const boCov = Math.min(...K.base.filter(b => ['G1-SN150', 'G1-SN500', 'G1-BS150', 'G2-150N', 'G2-600N'].includes(b.code)).map(b => b.days));
  kids.push(zoneG('bot', [12, 116, 320, 206], 'Base-oil tank farm', `${BOT.length} tanks · ≥ ${DAYS(boCov)}`, botK));
  // ── additive store ──
  const ADD = S._tanks.ADD, addK = ADD.map((t, j) => tankSq(354 + (j % 5) * 23, 141 + Math.floor(j / 5) * 20, 17, t, famColor(t.code)));
  addK.push(txt(354, 232, `≥ ${DAYS(Math.min(...K.add.filter(a => a.days < 90).map(a => a.days)))} cover`, { fs: 11, c: P.mute }));
  kids.push(zoneG('add', [344, 116, 132, 122], 'Additives', null, addK));
  // ── QC lab and utilities ──
  const L = K.lab, U_ = S.utilities;
  kids.push(zoneG('lab', [484, 116, 120, 122], 'QC lab', null, [txt(494, 154, `Queue ${L.queue}`, { mono: true }), txt(494, 171, `In test ${L.inTest}/${S.lab.cap}`, { mono: true }), txt(494, 188, `TAT ${HRS(L.tatAvg)}`, { mono: true }), txt(494, 205, `RFT ${PCT(K.blend.rft)}`, { mono: true }), txt(494, 226, `${L.done || 0} done today`, { fs: 11, c: P.mute })]));
  kids.push(zoneG('util', [612, 116, 130, 122], 'Utilities', null, [txt(622, 154, `Steam ${U_.steam.demand.toFixed(1)}/${U_.steam.cap} t/h`, { mono: true }), txt(622, 171, `Power ${U_.power.mw.toFixed(1)} MW`, { mono: true }), txt(622, 188, S.gridDown ? 'Gensets on line' : 'PLN grid', { c: S.gridDown ? 'var(--critInk)' : P.txt }), txt(622, 205, `N₂ ${U_.n2.nm3h} Nm³/h`, { mono: true }), txt(622, 226, S.weather.state === 'Clear' ? `${S.weather.tempC} °C clear` : S.weather.state, { fs: 11, c: S.weather.state === 'Thunderstorm' ? 'var(--warnInk)' : P.mute })]));
  // ── blend halls ──
  const B = S.blenders, rowsB = [['North', B.filter(b => b.hall === 'North hall')], ['South', B.filter(b => b.hall === 'South hall')], ['Kettle', B.filter(b => b.hall === 'Kettle hall')]], bK = [];
  rowsB.forEach(([lab, list], ri) => {
    const y = 278 + ri * 38; bK.push(txt(354, y + 13, lab, { fs: 11.5, c: P.mute }));
    let x = 404; list.forEach(b => { const w = b.type === 'ILB' ? 30 : 17, bt = b.batch, fr = bt ? (bt.t ? bt.done / bt.t : 0) : null; bK.push(stateSq(x, y, w, 18, blenderTone(b), fr, `${b.id} · ${b.state}${bt ? ' · ' + shortOf(bt.code) + ' · ' + b.step : ''}`, { key: 'b' + b.id, hit: ['blender', b.id] })); x += w + 3; });
  });
  kids.push(zoneG('blend', [344, 246, 270, 154], 'Blend halls', `${K.blend.inProcess}/23 busy`, bK));
  // ── grease plant ──
  const GU = S.grease.units, gK = [];
  [['CT', GU.filter(u => u.kind === 'Contactor')], ['OK', GU.filter(u => u.kind === 'Open kettle')], ['FK', GU.filter(u => u.kind === 'Finishing kettle')]].forEach(([lab, list], ri) => {
    const y = 276 + ri * 26; gK.push(txt(632, y + 12, lab, { fs: 11, c: P.mute, mono: true }));
    list.forEach((u, j) => gK.push(stateSq(656 + j * 13, y, 11, 16, unitTone(u), null, `${u.id} · ${u.state}${u.batch ? ' · ' + shortOf(u.batch.code) : ''}`, { key: 'g' + u.id, hit: ['gunit', u.id], pad: 1 })));
  });
  S.grease.hoppers.forEach((hp, j) => { const x = 632 + j * 27, f = hp.t / hp.size, hk = [rect(x, 362, 22, 26, { fill: P.tank, stroke: P.tankBd }), rect(x + 1, 388 - 1 - 24 * Math.min(1, f), 20, 24 * Math.min(1, f), { fill: hp.code ? famColor(hp.code) : 'none' })]; if (hp.q === 'Awaiting test results' || hp.q === 'On hold') hk.push(rect(x + 1, 363, 20, 24, { fill: 'url(#shHatch)' })); gK.push(hit('hopper', hp.id, [x, 362, 22, 26], hk, { key: 'hp' + hp.id, title: `${hp.id} · ${hp.code ? shortOf(hp.code) + ' · ' + hp.t.toFixed(1) + ' t · ' + hp.q : 'empty'}` })); });
  gK.push(txt(632, 356, 'Hoppers', { fs: 11, c: P.mute }));
  kids.push(zoneG('grease', [622, 246, 120, 154], 'Grease plant', null, gK));
  // ── finished-product tanks ──
  const FPT = S._tanks.FPT, fK = [];
  for (let b = 0; b < 8; b++) {
    const bx = 20 + (b % 2) * 156, by = 355 + Math.floor(b / 2) * 60, ts = FPT.slice(b * 12, b * 12 + 12);
    fK.push(rect(bx, by, 150, 55, { fill: 'none', stroke: P.zoneBd, strokeDasharray: '3 2' }), txt(bx + 5, by + 12, `FPT-${b + 1}`, { fs: 10.5, c: P.mute, mono: true }));
    ts.forEach((t, j) => fK.push(tankSq(bx + 6 + (j % 6) * 23.5, by + 16 + Math.floor(j / 6) * 19.5, 17, t, famColor(t.code), 1)));
  }
  kids.push(zoneG('fpt', [12, 330, 320, 268], 'Finished-product tanks', `96 · ${DAYS(K.fin.days)} rel.`, fK));
  // ── filling halls ──
  const Lns = S.lines, fillK = [], rowsL = [['Packaging', Lns.filter(l => l.hall === 'P')], ['Drums & IBC', Lns.filter(l => l.hall === 'D')], ['Grease', Lns.filter(l => l.hall === 'G')]];
  rowsL.forEach(([lab, list], ri) => {
    const y = 436 + ri * 36; fillK.push(txt(354, y + 15, lab, { fs: 11.5, c: P.mute }));
    list.forEach((l, j) => fillK.push(stateSq(432 + j * 20, y, 16, 22, lineTone(l), l.wo ? l.wo.done / Math.max(1, l.wo.units) : null, `${l.id} · ${l.state}${l.wo ? ' · ' + shortOf(l.wo.code) + ' ' + l.wo.pack : ''}`, { key: 'l' + l.id, hit: ['line', l.id], pad: 2 })));
  });
  S.blow.forEach((m, j) => fillK.push(stateSq(560 + j * 15, 508, 11, 11, m.fault ? 'crit' : m.state === 'Running' ? 'run' : 'idle', null, `${m.id} · blow moulder · ${m.state}`, { key: 'bm' + m.id, hit: ['blow', m.id], pad: 2 })));
  fillK.push(txt(684, 517, 'Blow', { fs: 11, c: P.mute }));
  kids.push(zoneG('fill', [344, 408, 398, 152], 'Filling halls', `${K.lines.running}/34 running`, fillK));
  // ── warehouse and docks ──
  const W = S.warehouse, whK = [];
  [['High-bay', K.wh.hbw, 596], ['Drum/IBC', K.wh.drm, 622]].forEach(([lab, f, y]) => { whK.push(txt(354, y + 10, lab, { fs: 11.5, c: P.mute }), rect(420, y, 270, 12, { fill: P.tank, stroke: P.tankBd }), rect(420, y, 270 * Math.min(1, f), 12, { fill: f > .88 ? 'var(--warn)' : 'var(--ink3)' }), txt(732, y + 10, PCT(f), { fs: 11.5, a: 'end', mono: true })); });
  W.cranes.forEach((c, j) => whK.push(stateSq(420 + j * 14, 645, 10, 10, c.fault ? 'crit' : 'run', null, `${c.id} · stacker crane · ${c.state}`, { key: 'sc' + c.id, hit: ['sc', c.id], pad: 2 })));
  whK.push(txt(354, 654, 'Cranes', { fs: 11, c: P.mute }));
  kids.push(zoneG('wh', [344, 568, 398, 96], 'Warehouse', `${D.fmt(W.hbw.occ + W.drm.occ)} pallets`, whK));
  const dK = [], bays = S.bays;
  bays.filter(b => b.cls === 'PKG').forEach((b, j) => dK.push(hit('bay', b.id, [400 + j * 4.6, 684, 3.6, 12], [rect(400 + j * 4.6, 684, 3.6, 12, { fill: b.state === 'Free' ? P.tank : b.fault ? 'var(--crit)' : 'var(--acc)', stroke: P.tankBd, strokeWidth: .5 })], { key: 'd' + b.id, pad: [.5, 3], title: `${b.id} · ${b.state}` })));
  dK.push(txt(352, 694, 'Docks', { fs: 11, c: P.mute }), txt(732, 694, `${K.docks.PKG || 0}/64`, { fs: 11, a: 'end', mono: true }));
  kids.push(zoneG('docks', [344, 670, 398, 32], '', null, dK, 'Packaged dispatch docks'));
  // ── bulk loading, discharge and receiving bays ──
  const bulkK = [];
  [['BT', 'BLK', 12, 14, 18, 632], ['UL', 'UNL', 12, 14, 18, 654], ['RC', 'MAT', 24, 9, 11, 678]].forEach(([lab, cls, n, sz, step, y]) => {
    bulkK.push(txt(22, y + 11, lab, { fs: 11, c: P.mute, mono: true }));
    bays.filter(b => b.cls === cls).forEach((b, j) => { const x = 48 + j * step + (cls === 'BLK' ? Math.floor(j / 4) * 8 : 0); bulkK.push(hit('bay', b.id, [x, y, sz, sz], [rect(x, y, sz, sz, { fill: b.state === 'Free' ? P.tank : b.fault ? 'var(--crit)' : 'var(--acc)', stroke: P.tankBd, strokeWidth: .7 })], { key: 'b' + b.id, pad: (step - sz) / 2, title: `${b.id} · ${b.state}` })); });
  });
  kids.push(zoneG('bulk', [12, 606, 320, 96], 'Bulk & receiving bays', `${(K.docks.BLK || 0) + (K.docks.UNL || 0) + (K.docks.MAT || 0)} busy`, bulkK));
  // ── ISO station and yard ──
  const isoK = [];
  S.isoCranes.forEach((c, j) => isoK.push(stateSq(764 + (j % 9) * 20, 142 + Math.floor(j / 9) * 22, 16, 16, c.fault ? 'crit' : c.iso ? 'run' : 'idle', null, `${c.id} · bay ${c.bay} · ${c.fault ? 'Fault' : c.step || 'Free'}${c.iso ? ' · ' + c.iso.id : ''}`, { key: 'ic' + c.id, hit: ['crane', c.id], pad: 2 })));
  const CAT = { EC: 'oklch(0.80 0.03 230)', ED: 'oklch(0.70 0.07 60)', FO: 'oklch(0.58 0.12 150)', IF: 'oklch(0.58 0.12 280)', ER: 'oklch(0.72 0.02 260)', RP: 'oklch(0.60 0.15 25)' };
  const bySlot = {}; S.isos.forEach(x => { if (x.slot >= 0) bySlot[x.slot] = x; });
  ['Y-A', 'Y-B', 'Y-C', 'Y-D', 'Y-E'].forEach((bl, bi) => {
    const bx = 764 + bi * 37; isoK.push(txt(bx + 15, 200, bl, { fs: 10.5, c: P.mute, a: 'middle', mono: true }));
    for (let i = 0; i < 50; i++) { const slot = bi * 50 + i, x = bySlot[slot], row = i >> 1, tier = i % 2, sx = bx + tier * 15, sy = 206 + row * 10.6; isoK.push(hit(x ? 'iso' : 'slot', x ? x.id : String(slot), [sx, sy, 14, 9.6], [rect(sx, sy, 14, 9.6, { fill: x ? CAT[x.cat] : P.tank, stroke: slot >= 150 && slot < 180 ? 'var(--warn)' : P.tankBd, strokeWidth: slot >= 150 && slot < 180 ? .9 : .4 })], { key: 'y' + slot, pad: [.5, .5], title: x ? `${x.id} · ${x.type || 'T11'} · ${x.cat} · ${x.loc}${x.code ? ' · ' + shortOf(x.code) : ''}` : `${bl} slot ${row + 1}/${tier + 1} · free` })); }
  });
  const bc = S.iso.byCat; [['EC', 'Clean empty'], ['ED', 'Dirty empty'], ['FO', 'Full out'], ['IF', 'Inbound full'], ['ER', 'To return'], ['RP', 'Repair']].forEach(([c, lab], i) => { const x = 764 + (i % 3) * 62, y = 486 + Math.floor(i / 3) * 18; isoK.push(rect(x, y, 9, 9, { fill: CAT[c] }), txt(x + 13, y + 9, `${c} ${bc[c] || 0}`, { fs: 11, mono: true })); });
  S.iso.wash.forEach((w, i) => isoK.push(stateSq(764 + i * 24, 528, 20, 14, w.iso ? 'run' : 'idle', null, `${w.id} · ${w.iso ? 'washing ' + w.iso.id : 'free'}`, { key: 'tw' + i, hit: ['wash', w.id], pad: 2 })));
  isoK.push(txt(764, 556, `Wash ${S.iso.wash.filter(w => w.iso).length}/${S.iso.wash.length}`, { fs: 11, c: P.mute }));
  isoK.push(txt(870, 539, `Heating ${S.iso.heatUsed}/30`, { fs: 11, c: P.mute }), txt(870, 556, `Orders ${S.iso.orders.length}`, { fs: 11, c: P.mute }));
  kids.push(zoneG('iso', [754, 116, 200, 490], 'ISO station & yard', `${S.iso.occ}/250`, isoK));
  // ── container stuffing ──
  const sK = []; bays.filter(b => b.cls === 'STF').forEach((b, j) => sK.push(stateSq(764 + (j % 14) * 13, 640 + Math.floor(j / 14) * 14, 10, 10, b.box ? 'run' : 'idle', b.box ? b.pct : null, `${b.id} · ${b.box ? b.box.size + ' for ' + b.box.dest + ' · ' + Math.round(b.pct * 100) + ' %' : 'free'}`, { key: 's' + b.id, hit: ['bay', b.id], pad: [1.5, 2] })));
  const icy = S.rail.icy; sK.push(txt(764, 694, `Staged JKT ${icy.full.JKT} · SUB ${icy.full.SUB} · FDR ${icy.full.FDR}`, { fs: 11, c: P.mute, mono: true }));
  kids.push(zoneG('stuff', [754, 614, 200, 88], 'Container stuffing', `${K.stuffing.inWork}/28`, sK));
  // ── rail terminal and container yard ──
  const rK = [], TX = { 'RT-1': 984, 'RT-2': 1004, 'RT-3': 1024 };
  Object.entries(TX).forEach(([id, x]) => rK.push(txt(x, 153, id.slice(3), { fs: 10.5, c: P.mute, a: 'middle', mono: true })));
  S.rail.tracks.forEach((tk, ti) => {
    const tr = tk.train ? S.trains.find(x => x.id === tk.train) : null, x = TX[tk.id], col = [h('line', { key: 'rl', x1: x, x2: x, y1: 158, y2: 696, style: { stroke: P.rail, strokeWidth: 2 } })];
    if (tr) { const n = Math.min(24, tr.wagons || 18); for (let i = 0; i < n; i++) col.push(rect(x - 5, 162 + i * 22, 10, 18, { fill: tr.state === 'Working' ? 'var(--acc)' : P.idle, opacity: tr.state === 'Working' ? .55 : 1, stroke: P.tankBd, strokeWidth: .6 }, { key: 'w' + i })); }
    rK.push(hit(tr ? 'train' : 'track', tr ? tr.id : tk.id, [x - 5, 158, 10, 538], col, { key: 'trk' + tk.id, pad: [4, 0], title: tr ? `${tr.id} · ${tr.name} · ${tr.step}` : `${tk.id} · ${tk.role} · free` }));
    const y = 160 + ti * 52; rK.push(txt(1046, y, `${tk.id}${tr ? ' · ' + tr.id : ' · free'}`, { fs: 11.5, fw: 600, mono: true }), txt(1046, y + 16, tr ? `${tr.service} · ${tr.state === 'Working' ? Math.round(tr.done) + '/' + tr.moves + ' moves' : tr.state}` : '—', { fs: 11, c: P.mute }));
  });
  S.rail.cranes.forEach((c, i) => { const y = 340 + i * 54; rK.push(hit('rmg', c.id, [976, y, 206, 6], [rect(976, y, 206, 6, { fill: c.fault ? 'var(--crit)' : c.state === 'Working' ? 'var(--acc)' : P.idle, opacity: .9 })], { key: 'rmg' + i, pad: [0, 4], title: `${c.id} · rail-mounted gantry · ${c.state}` }), txt(1046, y + 22, `${c.id} · ${c.fault ? 'Fault' : c.state}`, { fs: 11, mono: true, c: c.fault ? 'var(--critInk)' : P.txt })); });
  const nextT = S.trains.filter(t => t.state === 'Expected').sort((a, b) => a.eta - b.eta)[0];
  rK.push(txt(1046, 588, `Dry empties ${icy.dryEmpty}`, { fs: 11, mono: true }), txt(1046, 605, `Staged ISO ${S.isos.filter(x => /^ICY/.test(x.loc)).length}`, { fs: 11, mono: true }), txt(1046, 622, `Yard ${icy.teu}/900 TEU`, { fs: 11, mono: true }), txt(1046, 646, 'Next train', { fs: 11, c: P.mute }), txt(1046, 662, nextT ? `${nextT.service} ${D.tm(nextT.eta, tz, { tz: false })}` : '—', { fs: 11.5, mono: true }));
  kids.push(zoneG('rail', [966, 116, 222, 586], 'Rail & container yard', null, rK));
  // ── gate and truck park ──
  const G_ = S.gate, gtK = [rect(0, 756, 1200, 4, { fill: P.road })];
  const items = [`Queue ${G_.queue}`, `On site ${G_.onSite}`, `Park ${G_.park.occ}/220`, `Packaged turnaround ${K.ta.PKG ? HRS(K.ta.PKG.avg) : '—'}`, `Trucks today ${S.today.trucksIn}`];
  items.forEach((s, i) => gtK.push(txt(210 + i * 196, 739, s, { fs: 12, mono: true, c: i === 0 && G_.queue >= 20 ? 'var(--warnInk)' : P.txt })));
  kids.push(zoneG('gate', [12, 710, 1176, 44], 'Gate & park', null, gtK));
  return h('svg', { key: 'plan', viewBox: '0 0 1200 760', width: '100%', role: 'group', 'aria-label': 'Site plan of the superhub. Press a zone for details.', style: { display: 'block', maxWidth: 1500, margin: '0 auto', userSelect: 'none' } }, ...kids);
}

// ── header and tabs ──
function header() {
  const K = S.kpi, W = S.weather, mob = ctx.mobile, t = D.term('MLB');
  const outPct = K.out.pct, outT = outPct == null ? 'idle' : outPct < .85 ? 'crit' : outPct < .92 ? 'warn' : 'ok';
  const wxT = W.state === 'Thunderstorm' ? 'warn' : 'idle';
  const kp = [
    kpi('Output today', T0(K.out.today), outPct != null ? `${PCT(outPct)} of plan to now` : `plan ${D.fmt(HUB.info.PLAN)} t/d`, outT, () => A.tab('fill')),
    kpi('Dispatched', T0(K.disp.road + K.disp.rail + K.disp.sea), `road ${D.fmt(K.disp.road)} · rail ${D.fmt(K.disp.rail)} · sea ${D.fmt(K.disp.sea)}`, null, () => A.tab('wh')),
    kpi('Blended today', T0(K.blend.t), `${K.blend.batches} batches · ${K.blend.inProcess} in process`, K.blend.waiting ? 'warn' : null, () => A.tab('blend')),
    kpi('Filling lines', `${K.lines.running}/34 running`, `OEE P ${PCT(K.lines.hall.P)} · D ${PCT(K.lines.hall.D)}`, null, () => A.tab('fill')),
    kpi('Warehouse', `${PCT(K.wh.hbw)} · ${PCT(K.wh.drm)}`, `high-bay · drum store`, Math.max(K.wh.hbw, K.wh.drm) >= .88 ? 'warn' : null, () => A.tab('wh')),
    kpi('ISO yard', `${S.iso.occ}/250`, `${K.iso.fills} fills · ${K.iso.disch} discharges`, K.iso.occ >= .9 ? 'warn' : null, () => A.tab('iso')),
    kpi('Berths', `${K.berths.busy}/9 busy`, `${K.berths.anchorage} at anchorage · ${K.berths.expected72} due 72 h`, K.berths.anchorage > 2 ? 'warn' : null, () => A.tab('marine')),
    kpi('Lab', `${K.lab.queue + K.lab.inTest} samples`, `TAT ${HRS(K.lab.tatAvg)} · RFT ${PCT(K.blend.rft)}`, null, () => A.tab('lab')),
  ];
  return h('div', { key: 'hdr', style: { flex: 'none', padding: mob ? '12px 14px 10px' : '14px 20px 12px', borderBottom: '1px solid var(--line)', background: 'var(--surf)', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 } },
    div({ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', minWidth: 0 },
      div({ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: '1 1 380px' },
        div({ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 },
          h('h1', { style: { margin: 0, fontSize: mob ? 21 : 28, fontWeight: 500, letterSpacing: '-.015em', lineHeight: 1.15, minWidth: 0, overflowWrap: 'anywhere' } }, t.name),
          chip(t.status === 'Operating' ? 'Operating' : t.status, t.status === 'Operating' ? 'ok' : 'warn')),
        div({ fontSize: 12.5, color: 'var(--ink3)', display: 'flex', gap: '4px 12px', flexWrap: 'wrap', minWidth: 0 },
          span({}, `${t.area} · ${t.kind}`), span({ fontFamily: 'var(--fnum)' }, `Local ${D.tm(D.NOW, tz, { date: true })}`))),
      div({ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
        chip(W.text, wxT, `${W.season} · wind ${W.wind} km/h`),
        S.gridDown ? chip('On gensets', 'crit') : null,
        K.alarms.open ? h('button', { onClick: () => A.alarms(), className: 'sh-press', style: { height: 26, padding: '0 9px', border: '1px solid var(--line)', background: K.alarms.critical ? 'var(--critSoft)' : 'var(--warnSoft)', color: K.alarms.critical ? 'var(--critInk)' : 'var(--warnInk)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' } }, I.st[K.alarms.critical ? 'critical' : 'attention'], `${K.alarms.open} open alarm${K.alarms.open > 1 ? 's' : ''}`) : chip('No open alarms', 'ok'))),
    h('div', { style: { display: 'grid', gridTemplateColumns: mob ? 'repeat(2, minmax(0,1fr))' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6, minWidth: 0 } }, ...kp));
}
function tabBar(cur) {
  return h('div', { key: 'tabs', role: 'tablist', 'aria-label': 'Superhub views', className: 'sh-tabs', style: { flex: 'none', display: 'flex', gap: 0, overflowX: 'auto', borderBottom: '1px solid var(--line)', background: 'var(--surf)', padding: ctx.mobile ? '0 8px' : '0 14px', scrollbarWidth: 'thin' } },
    ...TABS.map(([id, label]) => h('button', { key: id, role: 'tab', 'aria-selected': cur === id ? 'true' : 'false', onClick: () => A.tab(id), className: 'sh-tab', style: { flex: 'none', height: 40, padding: '0 13px', border: 0, borderBottom: `2px solid ${cur === id ? 'var(--acc)' : 'transparent'}`, background: 'transparent', color: cur === id ? 'var(--ink)' : 'var(--ink2)', fontWeight: cur === id ? 600 : 400, fontSize: 13.5, whiteSpace: 'nowrap', cursor: 'pointer' } }, label)));
}

// ── site plan tab ──
const ZONES = { marine: 'Marine · 9 jetties', bot: 'Base-oil tank farm', add: 'Additive store', lab: 'QC laboratory', util: 'Utilities', blend: 'Blend halls', grease: 'Grease plant', fpt: 'Finished-product tanks', fill: 'Filling halls', wh: 'Warehouse', docks: 'Dispatch docks', bulk: 'Bulk & receiving bays', iso: 'ISO station & yard', stuff: 'Container stuffing', rail: 'Rail & container yard', gate: 'Gate & truck park' };
function zoneCards() { // phone: the zones as cards instead of the scaled plan
  const K = S.kpi, z = (id, line1, line2, t) => tile({ key: 'zc' + id, id: id === 'fpt' ? 'Finished products' : ZONES[id], title: ZONES[id], sans: true, state: '', tone: t || 'idle', line1, line2, on: ST.zone === id, onClick: () => A.zone(id) });
  return grid(160, [
    z('marine', `${K.berths.busy}/9 berths busy`, `${K.berths.anchorage} at anchorage`, K.berths.busy ? 'run' : 'idle'),
    z('bot', `≥ ${DAYS(Math.min(...K.base.map(b => b.days)))} base-oil cover`, `${S._tanks.BOT.filter(t => t.status === 'Receiving').length} receiving`, 'run'),
    z('add', `≥ ${DAYS(Math.min(...K.add.filter(a => a.days < 90).map(a => a.days)))} additive cover`, '20 heated tanks'),
    z('blend', `${K.blend.inProcess}/23 blenders busy`, `${T0(K.blend.t)} today`, 'run'), z('grease', `${K.grease.inProcess} kettles busy`, `${T0(K.grease.t)} today`, 'run'),
    z('lab', `${K.lab.queue} queued · ${K.lab.inTest} in test`, `TAT ${HRS(K.lab.tatAvg)}`), z('fpt', `${DAYS(K.fin.days)} released`, `${T0(K.fin.qc)} in QC`),
    z('fill', `${K.lines.running}/34 lines running`, `${D.fmt(S.today.units)} units today`, 'run'), z('wh', `High-bay ${PCT(K.wh.hbw)}`, `Drum store ${PCT(K.wh.drm)}`),
    z('docks', `${K.docks.PKG || 0}/64 docks busy`, `${S.gate.queue} at the gate`), z('bulk', `${K.docks.BLK || 0}/12 bulk bays`, `${K.docks.MAT || 0}/24 receiving`),
    z('iso', `${S.iso.occ}/250 in the yard`, `${K.iso.busy}/18 cranes working`, 'run'), z('stuff', `${K.stuffing.inWork}/28 boxes in work`, `${K.stuffing.boxes} stuffed today`),
    z('rail', `${S.trains.filter(t => t.state === 'Working').length} trains working`, `${Math.round(K.rail.movesToday)} moves today`), z('util', `Steam ${S.utilities.steam.demand.toFixed(1)} t/h`, `${S.utilities.power.mw.toFixed(1)} MW`), z('gate', `${S.gate.onSite} trucks on site`, `park ${S.gate.park.occ}/220`),
  ], 8);
}
function hourly(key, hours, color, label) {
  const pts = HUB.series(key, hours).map(p => ({ t: p.t, v: p.v * 4 })); // per 15 min → per hour
  if (pts.length < 3) return empty('Collecting history…');
  const xt = []; for (let x = Math.ceil(pts[0].t / 360) * 360; x <= D.NOW; x += 360) xt.push({ t: x, label: D.tm(x, tz, { tz: false }) });
  return D.lineChart(h, { w: 560, h: 170, l: 46, series: [{ pts, color, label, unit: 't/h', area: true }], y0: 0, y1: Math.ceil(Math.max(10, ...pts.map(p => p.v)) * 1.1 / 100) * 100, xTicks: xt, hover: ST.hv && ST.hv[key], onHover: v => A.hover(key, v), tz, aria: label + ' per hour' });
}
// trend charts from the 15-minute history (48 h ring)
const niceMax = v => { const x = Math.max(v, 1e-6) * 1.08, p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; };
const ticksFor = (t0, hours) => { const xt = [], step = hours > 30 ? 720 : 360; for (let x = Math.ceil(t0 / step) * step; x <= D.NOW; x += step) xt.push({ t: x, label: D.tm(x, tz, { tz: false }) }); return xt; };
function trend(title, specs, o = {}) {
  const hours = o.hours || 24, hk = o.key || title;
  const roll = (pts, n) => n > 1 && pts.length > n ? pts.map((p, i) => { const a = pts.slice(Math.max(0, i - n + 1), i + 1); return { t: p.t, v: a.reduce((x, q) => x + q.v, 0) / a.length }; }).slice(n - 1) : pts; // rolling mean for quantities booked when a batch ends
  const series = specs.map(sp => ({ pts: roll(HUB.series(sp.key, hours).map(p => ({ t: p.t, v: p.v * (sp.mul || 1) })), sp.smooth || 0), color: sp.color, label: sp.label, unit: o.unit || '', dp: o.dp || 0, area: specs.length === 1 }));
  const ok = series[0].pts.length >= 3, top = ok ? Math.max(...series.flatMap(x => x.pts.map(p => p.v))) : 0;
  const body = ok ? [D.lineChart(h, { w: o.wide && !ctx.tablet ? 1120 : 560, h: o.h || (o.wide && !ctx.tablet ? 190 : 170), l: 46, series, y0: 0, y1: o.y1 || niceMax(top), xTicks: ticksFor(series[0].pts[0].t, hours), hover: ST.hv && ST.hv[hk], onHover: v => A.hover(hk, v), tz, aria: title }),
    specs.length > 1 ? div({ display: 'flex', gap: '4px 14px', flexWrap: 'wrap', fontSize: 12, color: 'var(--ink2)' }, ...specs.map(sp => span({ display: 'inline-flex', alignItems: 'center', gap: 6 }, span({ width: 14, height: 2, background: sp.color, display: 'inline-block', flex: 'none' }), sp.label))) : null] : [empty('Collecting history…')];
  return section(title, o.sub ? span({ fontSize: 12, color: 'var(--ink3)' }, o.sub) : null, body, { key: 'tr-' + hk });
}
// today's material flow, received → stocked → blended → filled → shipped; each stage opens its tab
function flowStrip() {
  const K = S.kpi, X = S.today, base = K.base.reduce((a, b) => a + b.t, 0), add = K.add.reduce((a, b) => a + b.t, 0);
  const stage = (title, rows, col, tab) => h('button', { key: 'fs-' + tab, onClick: () => A.tab(tab), title: `Open ${TABS.find(t => t[0] === tab)[1]}`, className: 'sh-tile tn-lift', style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 11px 10px', minWidth: 0, textAlign: 'left', font: 'inherit', color: 'var(--ink)', background: 'var(--surf)', border: '1px solid var(--line)', borderTop: `3px solid ${col}`, cursor: 'pointer' } },
    span({ fontSize: 12.5, fontWeight: 600 }, title),
    ...rows.map(([l, v]) => div({ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, minWidth: 0, fontSize: 12.5 }, span({ ...ell, color: 'var(--ink2)' }, l), span({ fontFamily: 'var(--fnum)', flex: 'none' }, v))));
  const st = [
    stage('Received', [['By sea', T0(K.rec.sea)], ['Rail ISO tanks', T0(K.rec.rail)], ['Road tankers & ISO', T0(K.rec.road + K.rec.iso)], ['Cross-dock pallets', T0(K.hub.xd)]], 'var(--ink3)', 'marine'),
    stage('In stock', [['Base oils', T0(base)], ['Additives', T0(add)], ['Finished, released', T0(K.fin.rel)], ['Cross-dock floor', T0(K.hub.xdStock)]], 'var(--ink3)', 'tanks'),
    stage('Blended', [['Liquid blends', T0(K.blend.t)], ['Grease', T0(K.grease.t, 1)], ['Batches started', D.fmt(K.blend.batches)], ['Blenders busy', `${K.blend.inProcess}/23`]], 'var(--acc)', 'blend'),
    stage('Filled', [['Packed', T0(K.out.pkg)], ['Units', D.fmt(X.units)], ['Bulk & ISO loaded', T0(K.out.bulk)], ['Lines running', `${K.lines.running}/34`]], 'var(--acc)', 'fill'),
    stage('Shipped', [['Road', T0(K.disp.road)], ['Rail', T0(K.disp.rail)], ['Sea', T0(K.disp.sea)], ['Base oil re-exported', T0(K.hub.reexp)]], 'var(--ok)', 'wh'),
  ];
  const arrow = i => span({ key: 'fa' + i, alignSelf: 'center', textAlign: 'center', color: 'var(--ink4)', fontSize: 16 }, '→');
  const body = ctx.tablet ? grid(170, st, 8) : div({ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr) 16px minmax(0,1fr)', gap: 6, alignItems: 'stretch', minWidth: 0 }, ...st.flatMap((x, i) => i ? [arrow(i), x] : [x]));
  return section('Material flow today', span({ fontSize: 12, color: 'var(--ink3)' }, 'since 00:00 WIB · press a stage for details'), [body], { key: 'flow' });
}
function planTab() {
  const K = S.kpi;
  const planBox = section('Site plan', [span({ fontSize: 12, color: 'var(--ink3)' }, ctx.mobile ? 'Tap a zone for details' : 'Press a zone for details'), ctx.mobile ? seg([['cards', 'Zones'], ['map', 'Plan']], ST.pv || 'cards', v => A.set({ pv: v }), 'Plan view') : null], [
    ctx.mobile && (ST.pv || 'cards') === 'cards' ? zoneCards() : div({ overflowX: ctx.tablet ? 'auto' : 'visible', minWidth: 0 }, div({ minWidth: ctx.mobile ? 760 : ctx.tablet ? 900 : 0 }, plan())),
    div({ display: 'flex', gap: '6px 14px', flexWrap: 'wrap', fontSize: 11.5, color: 'var(--ink3)', alignItems: 'center' }, span({ display: 'inline-flex', alignItems: 'center', gap: 5 }, dot('run'), 'Running / in use'), span({ display: 'inline-flex', alignItems: 'center', gap: 5 }, dot('warn'), 'Waiting / attention'), span({ display: 'inline-flex', alignItems: 'center', gap: 5 }, dot('crit'), 'Fault'), span({ display: 'inline-flex', alignItems: 'center', gap: 5 }, span({ width: 10, height: 10, display: 'inline-block', background: 'repeating-linear-gradient(45deg, var(--ink3) 0 1.5px, transparent 1.5px 4px)', border: '1px solid var(--ink4)' }), 'QC hold'), span({ display: 'inline-flex', alignItems: 'center', gap: 5 }, span({ width: 10, height: 10, display: 'inline-block', border: '1px dashed var(--ink3)' }), 'Free tank'), span({}, 'Tank fill colour = product family; height = level')),
  ], { key: 'planbox', pad: ctx.mobile ? '8px' : '10px 12px' });
  const ev = S.events.slice(0, 9).map((e, i) => div({ key: 'e' + i, display: 'grid', gridTemplateColumns: '54px 16px minmax(0,1fr)', gap: 8, alignItems: 'start', padding: '6px 0', borderBottom: '1px solid var(--line2)' }, span({ fontFamily: 'var(--fnum)', fontSize: 12, color: 'var(--ink3)' }, D.tm(e.at, tz, { tz: false })), I.st[e.sev === 'critical' ? 'critical' : e.sev === 'attention' ? 'attention' : 'info'], span({ fontSize: 12.5, minWidth: 0, overflowWrap: 'anywhere' }, `${e.area} · ${e.text}`)));
  const disp = [['Road', K.disp.road, K.disp.roadPlan], ['Rail', K.disp.rail, K.disp.railPlan], ['Sea', K.disp.sea, K.disp.seaPlan]].map(([m, v, p]) => div({ key: m, display: 'flex', flexDirection: 'column', gap: 4 }, div({ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5 }, span({}, m), span({ fontFamily: 'var(--fnum)', ...ell }, `${T0(v)} of ${T0(p)} plan`)), bar(p ? v / p : 0, 'var(--ink3)', 7)));
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    planBox,
    flowStrip(),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1.2fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      section('Output, last 24 h', span({ fontSize: 12, color: 'var(--ink3)' }, 'packaged + bulk, t/h'), [hourly('out', 24, 'var(--acc)', 'Output')], { key: 'outc' }),
      section('Dispatch today by mode', span({ fontSize: 12, color: 'var(--ink3)', fontFamily: 'var(--fnum)' }, `${T0(K.disp.road + K.disp.rail + K.disp.sea)} shipped`), [...disp, kv('Base-oil re-export', `${T0(K.hub.reexp)} of ${T0(K.hub.plan)} plan`), kv('Re-export by sea · ISO · road', `${T0(K.hub.sea)} · ${T0(K.hub.iso)} · ${T0(K.hub.road)}`), kv('Cross-dock pallets received', T0(K.hub.xd)), kv('Receipts by sea', T0(K.rec.sea)), kv('Receipts by rail ISO', T0(K.rec.rail)), kv('Receipts by road tanker and ISO', T0(K.rec.road + K.rec.iso), { last: true })], { key: 'dispc' })),
    section('Latest events', btn('All events', () => A.tab('log')), ev.length ? ev : [empty('No events yet.')], { key: 'evc' }));
}

// ── marine ──
function vesselCard(v) {
  const j = v.jetty ? S.jetties.find(x => x.id === v.jetty) : null, tn = v.pause ? 'warn' : tone(v.state), tot = v.parcels.reduce((a, p) => a + p.t, 0), done = v.parcels.reduce((a, p) => a + p.done, 0);
  const prog = v.moves ? v.moves.done / Math.max(1, v.moves.planned) : tot ? done / tot : 0;
  return tile({ key: 'vc' + v.id, id: j ? j.id : v.state === 'At anchorage' ? 'ANCH' : 'ETA', sw: span({ width: 9, height: 9, display: 'inline-block', background: VC[v.cls] }), state: v.pause ? v.pause.reason : v.state, tone: tn, line1: `${v.name} · ${v.cls}`, line2: v.moves ? `${Math.round(v.moves.done)}/${v.moves.planned} moves · ${v.step}` : `${T0(done)} of ${T0(tot)} · ${v.parcels.map(p => shortOf(p.code)).join(', ')}`, frac: prog, on: ST.sel && ST.sel.id === v.id, onClick: () => A.sel('vessel', v.id) });
}
function marineTab() {
  const K = S.kpi, vs = S.vessels.filter(v => v.state !== 'Departed').sort((a, b) => a.eta - b.eta);
  const jet = S.jetties.map(j => { const v = j.vessel ? S.vessels.find(x => x.id === j.vessel) : null; return v ? vesselCard(v) : tile({ key: 'j' + j.id, id: j.id, state: j.closed ? 'Closed' : 'Free', tone: 'idle', line1: j.role, line2: `${j.loa} m LOA · ${j.draft} m draft`, onClick: () => A.zone('marine') }); });
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    grid(170, [kpi('Berths in use', `${K.berths.busy}/9`), kpi('At anchorage', String(K.berths.anchorage), null, K.berths.anchorage > 2 ? 'warn' : null), kpi('Due in 72 h', String(K.berths.expected72)), kpi('Received by sea today', T0(K.rec.sea)), kpi('Loaded to ships today', T0(S.today.sea))], 8),
    section('Jetties', span({ fontSize: 12, color: 'var(--ink3)' }, 'J1–J4 base oil in & re-export · J5 additives & barges · J6–J7 barges · J8–J9 feeders'), [grid(250, jet, 8)]),
    section('Line-up · next 10 days', span({ fontSize: 12, color: 'var(--ink3)' }, `${vs.length} vessels`), [table([
      { label: 'ETA', w: '118px', f: v => TM(v.ata || v.eta), mono: true }, { label: 'Vessel', w: 'minmax(140px,1.4fr)', f: v => [span({ width: 8, height: 8, display: 'inline-block', background: VC[v.cls], flex: 'none' }), span({ ...ell }, v.name)] },
      { label: 'Type', w: 'minmax(110px,1fr)', f: v => v.label }, { label: 'Cargo', w: 'minmax(140px,1.4fr)', f: v => v.cls === 'FDR' ? 'Containers and ISO tanks' : v.parcels.map(p => `${shortOf(p.code)} ${D.fmt(p.t)}`).join(' · ') },
      { label: 'Berth', w: '64px', f: v => v.jetty || '—', mono: true }, { label: 'State', w: 'minmax(110px,1fr)', f: v => chip(v.pause ? 'Paused' : v.state) }], vs, { onRow: v => A.sel('vessel', v.id), selected: v => ST.sel && ST.sel.id === v.id, key: v => v.id, scroll: true, minW: 760, max: 420, sticky: true })], { pad: 0 }));
}

// ── tank farms ──
function tankTile(t) {
  const G = HUB.info.GRADE[t.code], C = HUB.info.COMP[t.code], f = t.vol / t.nominal, state = t.free ? 'Free · clean' : t.state === 'QC hold' ? 'QC hold' : t.status;
  return tile({ key: 'tt' + t.id, id: t.id, sw: sw(famColor(t.code), !G), state, tone: t.free ? 'idle' : t.q === 'On hold' ? 'warn' : t.state === 'QC hold' ? 'warn' : tone(t.status), line1: t.free ? 'Unassigned swing tank' : (G ? G.short : C ? C.short : shortOf(t.code)), line2: `${D.fmt(t.vol)} of ${D.fmt(t.nominal)} kL · ${PCT(f)}${t.heated ? ' · ' + t.heated + ' °C' : ''}`, frac: f, barColor: famColor(t.code), on: ST.sel && ST.sel.id === t.id, onClick: () => A.sel('tank', t.id) });
}
function tanksTab() {
  const v = ST.tv || 'bot', K = S.kpi;
  const bar_ = seg([['bot', 'Base oils'], ['add', 'Additives'], ['fpt', 'Finished products'], ['aux', 'Slop & service']], v, x => A.set({ tv: x }), 'Tank group');
  let body = [];
  if (v === 'bot' || v === 'add') {
    const list = v === 'bot' ? K.base : K.add;
    body.push(section(v === 'bot' ? 'Base-oil stocks' : 'Additive stocks', span({ fontSize: 12, color: 'var(--ink3)' }, 'cover = stock above heel ÷ blending and re-export use'), [table([
      { label: 'Stock', w: 'minmax(150px,2fr)', f: b => [sw(HUB.info.COMP[b.code].color, true), span({ ...ell }, HUB.info.COMP[b.code].label)] }, { label: 'Tonnes', w: '96px', f: b => T0(b.t), mono: true, align: 'right' },
      { label: 'Cover', w: '76px', f: b => DAYS(b.days), mono: true, align: 'right', color: b => covInk(b.days) }, { label: 'Fill', w: 'minmax(80px,1fr)', f: b => div({ flex: 1, minWidth: 40 }, bar(b.pct, 'var(--ink3)', 6)) }], list.filter(b => b.t > 0 || v === 'bot'), { scroll: true, minW: 420 })], { pad: 0 }));
    if (v === 'add') { const st = HUB.store(); body.push(section('Drum, IBC and bag store', null, [table([{ label: 'Material', w: 'minmax(160px,2fr)', f: r => HUB.info.COMP[r[0]].label }, { label: 'Stock', w: '96px', f: r => T0(r[1], 1), mono: true, align: 'right' }, { label: 'Store', w: '110px', f: r => /^(LIOH|12HSA|AZA|CASUL|MOS2)$/.test(r[0]) ? 'Bag store' : 'Drum/IBC store' }], Object.entries(st), {})], { pad: 0 })); }
  }
  const tanks = S._tanks[v === 'bot' ? 'BOT' : v === 'add' ? 'ADD' : v === 'fpt' ? 'FPT' : 'AUX'];
  let shown = tanks;
  if (v === 'fpt') {
    const fam = ST.fam || 'all', fams = [['all', 'All'], ...Object.entries(HUB.info.FAMILIES).filter(([kk]) => kk !== 'GR').map(([kk, F]) => [kk, F.name.replace(/ oils?$/, '').replace(/^Heavy-duty diesel engine$/, 'HD diesel engine')])];
    body.push(div({ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }, ...fams.map(([id, lab]) => h('button', { key: id, onClick: () => A.set({ fam: id }), 'aria-pressed': fam === id ? 'true' : 'false', className: 'sh-seg', style: { height: 28, padding: '0 9px', border: '1px solid ' + (fam === id ? 'var(--ink)' : 'var(--line)'), background: fam === id ? 'var(--ink)' : 'var(--surf)', color: fam === id ? 'var(--surf)' : 'var(--ink)', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } }, id !== 'all' ? sw(HUB.info.FAMILIES[id].color) : null, lab))));
    if (fam !== 'all') shown = tanks.filter(t => !t.free && HUB.info.GRADE[t.code] && HUB.info.GRADE[t.code].P.fam === fam);
    const st = {}; tanks.forEach(t => { const x = t.free ? 'Free' : t.state; st[x] = (st[x] || 0) + 1; });
    body.push(div({ display: 'flex', gap: 8, flexWrap: 'wrap' }, ...Object.entries(st).map(([x, n]) => chip(`${x} ${n}`, x === 'Free' ? 'idle' : x === 'QC hold' ? 'warn' : tone(x)))));
  }
  if (v === 'bot') body.push(trend('Base-oil stock, last 48 h', [{ key: 'boG1', label: 'Group I', color: 'oklch(0.66 0.12 70)' }, { key: 'boG2', label: 'Group II', color: 'oklch(0.60 0.10 125)' }, { key: 'boG3', label: 'Group III', color: 'oklch(0.58 0.09 190)' }, { key: 'boSP', label: 'Synthetics & specialty', color: 'oklch(0.56 0.11 285)' }], { hours: 48, unit: 't', sub: 'tonnes in tank', wide: true }));
  if (v === 'add') body.push(trend('Additive stock, last 48 h', [{ key: 'addT', label: 'Additives in tank', color: 'oklch(0.58 0.11 310)' }], { hours: 48, unit: 't', sub: 'tonnes in the 20 heated tanks', wide: true }));
  if (v === 'fpt') body.push(trend('Released finished product, last 48 h', [{ key: 'finRel', label: 'Released stock', color: 'var(--acc)' }], { hours: 48, unit: 't', sub: 'tonnes released in tanks', wide: true }));
  body.push(section(v === 'fpt' ? 'Finished-product tanks · 60 dedicated, 36 swing' : 'Tanks', span({ fontSize: 12, color: 'var(--ink3)' }, `${shown.length} tanks`), [grid(200, shown.map(tankTile), 8)]));
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }, div({ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, bar_), ...body);
}

// ── shared helpers for the process tabs ──
const FMT_LABEL = { S1: '1 L bottles', S4: '4–5 L bottles', P20: '18–20 L pails', D209: '209 L drums', IBC: '1,000 L IBCs', BLK: 'Bulk', GC: 'Grease cartridges', GT: 'Grease tubs', GP: 'Grease pails', GD: 'Grease drums' };
const c01 = v => Math.max(0, Math.min(1, v || 0));
const GRD = c => HUB.info.GRADE[c];
const isSel = (kind, id) => !!(ST.sel && ST.sel.kind === kind && ST.sel.id === id);
const hh = m => m == null || !isFinite(m) ? '—' : D.tm(m, tz, { tz: false });
const note = t => span({ fontSize: 12, color: 'var(--ink3)', ...ell }, t);
function blenderTone(b) { return b.fault ? 'crit' : b.pm ? 'off' : b.state === 'Waiting raw material' || b.step === 'Waiting heat' ? 'warn' : b.batch ? 'run' : 'idle'; }
function blenderState(b) { return b.fault ? 'Fault' : b.pm ? 'Planned maintenance' : b.state === 'Waiting raw material' ? 'Waiting raw material' : b.batch ? b.step : 'Idle'; }
function batchProg(bt) {
  if (!bt) return null;
  if (bt.type === 'ILB' && bt.step === 'Blending') return bt.t ? c01(bt.done / bt.t) : 0;
  return bt.eta > bt.start ? c01((D.NOW - bt.start) / (bt.eta - bt.start)) : 0;
}
const sizeOf = b => b.type === 'ILB' ? `In-line · ${b.size} m³/h` : `${b.type === 'ABB' ? 'Automated batch' : 'Simple batch'} · ${b.size} m³${b.heated ? ' · heated' : ''}`;
function unitTone(u) { return u.fault ? 'crit' : /^Waiting/.test(u.state) ? 'warn' : u.batch ? 'run' : u.keep ? 'off' : 'idle'; }
function unitState(u) { return u.fault ? 'Fault' : /^Waiting/.test(u.state) ? u.state : u.batch ? u.step : u.keep ? 'Turnaround' : 'Idle'; }
function lineTone(l) {
  const s = l.state;
  if (s === 'Running') return 'run';
  if (s === 'Fault' || s === 'Stopped – power') return 'crit';
  if (/^Starved|^Blocked|^Jam/.test(s)) return 'warn';
  if (s === 'Idle – no orders' || s === 'Ready') return 'idle';
  return 'off'; // changeover, break, planned maintenance, waiting for a batch in process
}
function batchTone(bt) { return bt.state === 'Cancelled' ? 'off' : bt.state === 'Released' ? 'ok' : bt.state === 'In progress' ? 'run' : bt.state === 'QC hold' ? 'warn' : /Adjust|hold/i.test(bt.state) ? 'crit' : 'idle'; }
const batchChip = bt => chip(bt.state === 'QC hold' ? 'Awaiting release' : bt.state, batchTone(bt));

// ── blending ──
function blenderTile(b) {
  const bt = b.batch;
  return tile({ key: 'bl' + b.id, id: b.id, state: blenderState(b), tone: blenderTone(b), sw: bt ? sw(famColor(bt.code)) : null,
    line1: bt ? `${shortOf(bt.code)} · ${T0(bt.t, 1)}` : b.last ? `Last ran ${shortOf(b.last)}` : sizeOf(b),
    line2: bt ? `${bt.id.slice(-4)} → ${bt.dst} · ready ${hh(bt.eta)}` : sizeOf(b),
    frac: bt ? batchProg(bt) : null, on: isSel('blender', b.id), onClick: () => A.sel('blender', b.id) });
}
function greaseTile(u) {
  const bt = u.batch;
  return tile({ key: 'gu' + u.id, id: u.id, state: unitState(u), tone: unitTone(u), sw: bt ? sw(famColor(bt.code)) : null,
    line1: bt ? `${shortOf(bt.code)} · ${T0(bt.t, 1)}` : u.kind, line2: bt ? `${bt.id.slice(-4)} · ready ${hh(bt.eta)}` : `${u.size} t ${u.kind.toLowerCase()}`,
    frac: bt && u.stepUntil && u.since ? c01((D.NOW - u.since) / Math.max(30, (bt.eta || u.stepUntil) - u.since)) : null, on: isSel('gunit', u.id), onClick: () => A.sel('gunit', u.id) });
}
function hopperTile(hp) {
  const tn = !hp.code ? 'idle' : hp.q === 'Released' ? 'ok' : hp.q === 'On hold' ? 'crit' : 'warn';
  return tile({ key: 'hp' + hp.id, id: hp.id, state: hp.code ? (hp.q === 'Awaiting test results' ? 'In test' : hp.q) : 'Empty', tone: tn, sw: hp.code ? sw(famColor(hp.code)) : null,
    line1: hp.code ? shortOf(hp.code) : 'Empty, clean', line2: `${D.fmt(hp.t, 1)} of ${hp.size} t${hp.batch ? ' · ' + hp.batch.slice(-9) : ''}`, frac: hp.t / hp.size, barColor: hp.code ? famColor(hp.code) : null, on: isSel('hopper', hp.id), onClick: () => A.sel('hopper', hp.id) });
}
function batchTable(rows, o = {}) {
  return table([
    { label: 'Batch', w: '132px', f: b => b.id.replace('BLD-MLB-', ''), mono: true },
    { label: 'Grade', w: 'minmax(150px,1.6fr)', f: b => [sw(famColor(b.code)), span({ ...ell }, (GRD(b.code) || {}).label || b.code)] },
    { label: 'Unit', w: '70px', f: b => b.blender, mono: true },
    { label: 'Tonnes', w: '72px', f: b => D.fmt(b.state === 'In progress' && !b.grease ? b.done : b.t, 1), mono: true, align: 'right' },
    { label: 'Started', w: '86px', f: b => hh(b.start), mono: true },
    { label: 'Into', w: '62px', f: b => b.grease ? (b.hopper || '—') : b.dst, mono: true },
    { label: 'Step / state', w: 'minmax(150px,1.3fr)', f: b => b.state === 'In progress' ? span({ ...ell, color: 'var(--ink)' }, b.grease ? String(b.step || '').replace(/^[A-Z]+-\d+ · /, '') : b.step) : batchChip(b) },
  ], rows, { onRow: b => A.sel('batch', b.id), selected: b => isSel('batch', b.id), key: b => b.id, scroll: true, minW: 800, max: o.max || 460, sticky: true, empty: o.empty || 'No batches in this view.' });
}
function blendTab() {
  const K = S.kpi, B = S.blenders, bf = ST.bf || 'live';
  const fills = S._tanks.FPT.filter(k => k.fill).sort((a, b) => (b.fill.flowing - a.fill.flowing) || ((a.vol - a.heel) / a.nominal - (b.vol - b.heel) / b.nominal));
  const halls = [['North hall', 'ILB-1, ILB-2 in-line, 100 m³/h · ABB-01..04 automated batch, 70 m³'], ['South hall', 'ILB-3 in-line, 80 m³/h · ABB-05..10 automated batch, 25–50 m³'], ['Kettle hall', 'SBB-01..10 simple batch kettles, 10–30 m³']];
  const camp = HUB.campaigns();
  let rows = S.batches;
  if (bf === 'live') rows = rows.filter(b => b.state === 'In progress');
  else if (bf === 'qc') rows = rows.filter(b => b.state === 'QC hold' || b.state === 'Adjusting' || b.state === 'On hold');
  else if (bf === 'rel') rows = rows.filter(b => b.state === 'Released');
  else if (bf === 'grease') rows = rows.filter(b => b.grease);
  const wait = B.filter(b => b.state === 'Waiting raw material');
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    grid(160, [
      kpi('Blended today', T0(K.blend.t), `${K.blend.batches} batches started`),
      kpi('Blenders busy', `${K.blend.inProcess}/23`, `ILB ${K.blend.byRoute.ILB} · ABB ${K.blend.byRoute.ABB} · SBB ${K.blend.byRoute.SBB}`, 'run'),
      kpi('Right first time', K.blend.rft == null ? '—' : PCT(K.blend.rft, 1), 'release tests today', K.blend.rft != null && K.blend.rft < .95 ? 'warn' : null),
      kpi('Waiting raw material', String(wait.length), wait.length ? wait.map(b => b.id).join(', ') : 'none', wait.length ? 'warn' : null),
      kpi('Tank fills open', String(fills.length), `${fills.filter(k => k.fill.flowing).length} receiving product`),
      kpi('Grease today', T0(K.grease.t, 1), `${K.grease.inProcess} units busy · hoppers ${T0(K.grease.hoppers, 1)}`),
    ], 8),
    trend('Blended per hour, last 24 h', [{ key: 'blendT', label: 'Liquid blends', color: 'var(--acc)', mul: 4, smooth: 8 }, { key: 'greaseT', label: 'Grease', color: 'oklch(0.70 0.13 92)', mul: 4, smooth: 8 }], { unit: 't/h', sub: 'rolling 2 h, t per hour', wide: true }),
    ...halls.map(([hall, sub]) => section(hall, note(sub), [grid(196, B.filter(b => b.hall === hall).map(blenderTile), 8)], { key: 'h-' + hall })),
    section('Grease plant', note('3 contactors and 2 open kettles saponify; 6 finishing kettles cut back, mill and deaerate into 4 hoppers'), [
      grid(196, S.grease.units.map(greaseTile), 8),
      div({ fontSize: 12.5, fontWeight: 600, marginTop: 4 }, 'Hoppers to the grease filling lines'),
      grid(196, S.grease.hoppers.map(hopperTile), 8),
      div({ display: 'flex', gap: 6, flexWrap: 'wrap' }, ...S.grease.aux.map(x => chipBtn(`${x.id} · ${x.fault ? 'Fault' : x.state}`, x.fault ? 'crit' : x.state === 'Running' ? 'run' : 'idle', () => A.sel('gaux', x.id), isSel('gaux', x.id), `${x.kind} ${x.id}`))),
    ], { key: 'grease' }),
    section('Dedicated tank fills', note('several batches run into one tank, then one release test'), [fills.length ? table([
      { label: 'Tank', w: '72px', f: k => k.id, mono: true },
      { label: 'Grade', w: 'minmax(150px,1.6fr)', f: k => [sw(famColor(k.code)), span({ ...ell }, (GRD(k.code) || {}).label || k.code)] },
      { label: 'Batches', w: '70px', f: k => String(k.fill.batches.length), mono: true, align: 'right' },
      { label: 'Level', w: 'minmax(110px,1fr)', f: k => div({ flex: 1, minWidth: 60, display: 'flex', flexDirection: 'column', gap: 3 }, bar(k.vol / k.nominal, famColor(k.code), 6), span({ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--fnum)' }, `${D.fmt(k.vol)} → ${D.fmt(k.fill.target)} kL`)) },
      { label: 'State', w: 'minmax(120px,1fr)', f: k => chip(k.fill.flowing ? 'Receiving blend' : 'Fill planned', k.fill.flowing ? 'run' : 'idle') },
    ], fills, { onRow: k => A.sel('tank', k.id), selected: k => isSel('tank', k.id), key: k => k.id, scroll: true, minW: 640, max: 380, sticky: true }) : empty('No dedicated tank is being refilled right now.')], { key: 'fills', pad: fills.length ? 0 : undefined }),
    section('Low-runner campaigns', note('released swing-tank batches being filled out by format'), [camp.length ? table([
      { label: 'Tank', w: '72px', f: c => c.tank, mono: true },
      { label: 'Grade', w: 'minmax(150px,1.6fr)', f: c => [sw(famColor(c.code)), span({ ...ell }, (GRD(c.code) || {}).label || c.code)] },
      { label: 'Left to fill', w: 'minmax(180px,2fr)', f: c => Object.entries(c.left).filter(([, v]) => v > .3).map(([f, v]) => `${FMT_LABEL[f] || f} ${D.fmt(v)} kL`).join(' · ') || 'On the lines' },
      { label: 'Released', w: '86px', f: c => hh(c.at), mono: true },
    ], camp, { onRow: c => A.sel('tank', c.tank), selected: c => isSel('tank', c.tank), key: c => c.tank + c.code, scroll: true, minW: 600 }) : empty('No campaign is waiting on the filling lines.')], { key: 'camp', pad: camp.length ? 0 : undefined }),
    section('Batches, last 48 h', seg([['live', 'In progress'], ['qc', 'Awaiting release'], ['rel', 'Released'], ['grease', 'Grease'], ['all', 'All']], bf, x => A.set({ bf: x }), 'Batch filter'), [batchTable(rows)], { key: 'batches', pad: 0 }));
}

// ── filling ──
// bought-in materials keep 40 h of cover by booked deliveries; blow-moulded bottles and cans are a running buffer of a few hours
const matTone = m => { const inHouse = !m.load && m.id !== 'resin', c = m.coverH; return inHouse ? (c < 1.5 ? 'crit' : c < 3 ? 'warn' : 'idle') : (c < 12 ? 'crit' : c < 24 ? 'warn' : 'idle'); };
function lineTile(l) {
  const w = l.wo, tn = lineTone(l);
  return tile({ key: 'ln' + l.id, id: l.id, state: l.state, tone: tn, sw: w ? sw(famColor(w.code)) : null,
    line1: w ? `${shortOf(w.code)} · ${w.packLabel}` : FMT_LABEL[l.fmt] || l.fmt,
    line2: w ? `${D.fmt(w.done)} of ${D.fmt(w.units)} · done ${hh(w.eta)}` : `OEE 24 h ${PCT(l.oee24.oee)} · ${D.fmt(l.unitsToday)} today`,
    frac: w ? c01(w.done / Math.max(1, w.units)) : null, on: isSel('line', l.id), onClick: () => A.sel('line', l.id) });
}
function fillTab() {
  const K = S.kpi, X = S.today, L = S.lines;
  const byState = {}; L.forEach(l => { const k = l.state.replace(/ – .*/, ''); byState[k] = (byState[k] || 0) + 1; });
  const mats = Object.values(S.materials);
  const hallSub = { P: '15 lines · bottles, cans and pails', D: '13 drum lines and 2 IBC lines', G: '4 grease lines · cartridges, tubs, pails and drums' };
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    grid(160, [
      kpi('Packed today', T0(K.out.pkg), `${D.fmt(X.units)} units`),
      kpi('Lines running', `${K.lines.running}/34`, Object.entries(byState).filter(([k2]) => k2 !== 'Running').slice(0, 3).map(([k2, n]) => `${k2.toLowerCase()} ${n}`).join(' · '), 'run'),
      kpi('OEE, 24 h', `P ${PCT(K.lines.hall.P)}`, `D ${PCT(K.lines.hall.D)} · G ${PCT(K.lines.hall.G)}`),
      kpi('Changeover share', PCT(K.lines.coShare), 'of planned time today', K.lines.coShare > .2 ? 'warn' : null),
      kpi('Work orders today', String(X.wos), `${S.lines.filter(l => l.wo).length} open now`),
      kpi('Pallets to store', D.fmt(X.palIn), `${D.fmt(X.palOut)} picked for dispatch`),
    ], 8),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      trend('Packed per hour, last 24 h', [{ key: 'pkgT', label: 'Packed', color: 'var(--acc)', mul: 4 }, { key: 'bulkT', label: 'Bulk & ISO', color: 'var(--ink3)', mul: 4 }], { unit: 't/h', sub: 't per hour' }),
      trend('Lines running, last 24 h', [{ key: 'linesRun', label: 'Lines running', color: 'var(--acc)' }], { unit: 'lines', y1: 34, sub: 'of 34' })),
    ...['P', 'D', 'G'].map(hl => section(HUB.info.HALLS[hl], note(hallSub[hl]), [grid(196, L.filter(l => l.hall === hl).map(lineTile), 8)], { key: 'hall' + hl })),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1.3fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      section('Packaging materials', note('booked deliveries keep 40 h of cover; bottles and cans are blown on site'), [table([
        { label: 'Material', w: 'minmax(150px,2fr)', f: m => m.label },
        { label: 'Stock', w: '96px', f: m => `${D.fmt(m.stock)}${m.unit === 'pcs' ? '' : ' ' + m.unit}`, mono: true, align: 'right' },
        { label: 'Cover', w: '72px', f: m => m.coverH >= 999 ? '—' : HRS(m.coverH * 60), mono: true, align: 'right', color: m => matTone(m) === 'crit' ? 'var(--critInk)' : matTone(m) === 'warn' ? 'var(--warnInk)' : 'var(--ink)' },
        { label: 'Fill', w: 'minmax(70px,1fr)', f: m => div({ flex: 1, minWidth: 40 }, bar(m.stock / m.cap, matTone(m) === 'idle' ? 'var(--ink3)' : TC[matTone(m)], 6)) },
      ], mats, { scroll: true, minW: 440 })], { key: 'mats', pad: 0 }),
      section('Blow moulding', note('in-house 1 L bottles and 4–5 L cans'), [grid(150, S.blow.map(m => tile({ key: 'bm' + m.id, id: m.id, state: m.fault ? 'Fault' : m.state, tone: m.fault ? 'crit' : m.state === 'Running' ? 'run' : /Starved/.test(m.state) ? 'warn' : 'idle', line1: m.makes === 'bottles' ? '1 L bottles' : '4/5 L cans', line2: `${D.fmt(m.rate)} per hour`, on: isSel('blow', m.id), onClick: () => A.sel('blow', m.id) })), 8),
        kv('Bottle buffer', `${D.fmt(S.materials.bottles.stock)} pcs · ${HRS(S.materials.bottles.coverH * 60)}`), kv('Can buffer', `${D.fmt(S.materials.cans.stock)} pcs · ${HRS(S.materials.cans.coverH * 60)}`), kv('HDPE resin', `${D.fmt(S.materials.resin.stock, 1)} t`, { last: true })], { key: 'blow' })),
    section('Work orders', note(`${S.wos.length} most recent`), [table([
      { label: 'Order', w: '104px', f: w => w.id, mono: true },
      { label: 'Line', w: '62px', f: w => w.line, mono: true },
      { label: 'Grade', w: 'minmax(150px,1.6fr)', f: w => [sw(famColor(w.code)), span({ ...ell }, w.label)] },
      { label: 'Pack', w: 'minmax(96px,1fr)', f: w => w.packLabel },
      { label: 'Units', w: '120px', f: w => `${D.fmt(w.done)} / ${D.fmt(w.units)}`, mono: true, align: 'right' },
      { label: 'Start', w: '78px', f: w => hh(w.start), mono: true },
      { label: 'State', w: '118px', f: w => chip(w.state === 'Running' ? (w.camp ? 'Campaign' : 'Running') : w.state, w.state === 'Running' ? 'run' : w.state === 'Done' ? 'ok' : 'warn') },
    ], S.wos.slice(0, 80), { onRow: w => A.sel('line', w.line), selected: w => isSel('line', w.line) && !w.end, key: w => w.id, scroll: true, minW: 820, max: 420, sticky: true })], { key: 'wos', pad: 0 }));
}

// ── warehouse, docks and gate ──
const TRUCK_CLS = { PKG: 'Packaged', BLK: 'Bulk tanker', MAT: 'Materials', UNL: 'Discharge', ISO: 'ISO tank', BOX: 'Empty box', XDK: 'Cross-dock' };
const truckType = x => x.cls === 'BLK' && x.base ? 'Re-export' : TRUCK_CLS[x.cls] || x.cls;
function truckTone(x) { return x.state === 'At bay' || x.state === 'Gate-in' || x.state === 'Weigh-out' || x.state === 'Gate-out' || x.state === 'Yard' ? 'run' : x.state === 'Queue' && D.NOW - x.arr > 60 ? 'warn' : 'idle'; }
function cargoOf(x) {
  if (x.cls === 'PKG') return x.palGot ? `${Math.round(x.palGot)} pallets · ${T0(x.t, 1)}` : `${x.pallets} pallets booked`;
  if (x.cls === 'BLK') return `${shortOf(x.code)} · ${T0(x.done || 0, 1)} of ${T0(x.payload, 1)}${x.base ? ' · base-oil re-export' : ''}`;
  if (x.cls === 'XDK') return `${x.pallets} pallets · ${T0(x.t, 1)} from ${x.from}`;
  if (x.cls === 'UNL') return `${shortOf(x.code)} · ${T0(x.done || 0, 1)} of ${T0(x.payload, 1)}${x.iso ? ' · ISO' : ''}${x.from ? ' from ' + x.from : ''}`;
  if (x.cls === 'MAT') { const L = x.load || {}; return L.store ? `${shortOf(L.store)} · ${T0(L.t, 1)}` : L.mat && S.materials[L.mat] ? `${S.materials[L.mat].label} · ${D.fmt(L.qty)}` : 'Delivery'; }
  if (x.cls === 'ISO') return x.note || ((x.job || {}).drop ? 'Dropping a clean empty ISO' : 'Collecting an ISO tank');
  if (x.cls === 'BOX') return 'Empty 20/40 ft box to the container yard';
  return '';
}
function bayCell(b) {
  const t = b.fault ? 'crit' : b.state === 'Free' ? 'idle' : 'run', on = isSel('bay', b.id);
  return h('button', { key: 'bay' + b.id, onClick: () => A.sel('bay', b.id), 'aria-pressed': on ? 'true' : 'false', title: `${b.id} · ${b.fault ? 'Blocked' : b.state}`, className: 'sh-cell', style: { minWidth: 0, height: 30, padding: 0, border: '1px solid ' + (on ? 'var(--acc)' : 'var(--line)'), background: t === 'idle' ? 'var(--surf)' : TSOFT[t], color: t === 'idle' ? 'var(--ink3)' : TINK[t], fontFamily: 'var(--fnum)', fontSize: 10.5, position: 'relative', overflow: 'hidden', cursor: 'pointer', boxShadow: on ? 'inset 0 0 0 1px var(--acc)' : 'none' } },
    span({ position: 'relative', zIndex: 1 }, b.id.replace(/^[A-Z]+-/, '')),
    b.state !== 'Free' && b.pct ? span({ position: 'absolute', left: 0, bottom: 0, height: 3, width: (c01(b.pct) * 100).toFixed(0) + '%', background: TC[t] }) : null);
}
function whTab() {
  const K = S.kpi, W = S.warehouse, G_ = S.gate, X = S.today, tf = ST.tf || 'all';
  const on = S.trucks.filter(x => x.state !== 'Gone');
  const tr = (tf === 'all' ? on : on.filter(x => x.cls === tf)).sort((a, b) => a.arr - b.arr);
  const ta = c => K.ta[c] ? `${HRS(K.ta[c].avg)} avg · ${HRS(K.ta[c].p90)} P90 · ${K.ta[c].n} trucks` : 'no trucks out yet today';
  const zones = [['PKG', 'Packaged dispatch docks', 'D-01..64'], ['STF', 'Container stuffing', 'CS-01..28'], ['BLK', 'Bulk tanker loading', 'BT-01..12'], ['MAT', 'Materials receiving', 'RC-01..24'], ['UNL', 'Tanker & ISO discharge', 'UL-01..12']];
  const store = (label, z, cover, tgt) => div({ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 },
    div({ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, minWidth: 0 }, span({ ...ell, fontWeight: 600 }, label), span({ fontFamily: 'var(--fnum)', flex: 'none' }, `${D.fmt(z.occ)} / ${D.fmt(z.cap)} pallets`)),
    bar(z.pct, z.pct >= .88 ? 'var(--warn)' : 'var(--ink3)', 10),
    div({ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--ink3)', flexWrap: 'wrap' }, span({}, `${PCT(z.pct)} full`), span({}, `cover ${DAYS(cover)} · target ${tgt} d`)));
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    grid(160, [
      kpi('High-bay store', PCT(K.wh.hbw), `${D.fmt(W.hbw.occ)} pallets · ${DAYS(K.wh.coverHBW)}`, K.wh.hbw >= .88 ? 'warn' : null),
      kpi('Drum & IBC store', PCT(K.wh.drm), `${D.fmt(W.drm.occ)} pallets · ${DAYS(K.wh.coverDRM)}`, K.wh.drm >= .88 ? 'warn' : null),
      kpi('Gate queue', String(G_.queue), `${G_.onSite} trucks on site · park ${G_.park.occ}/220`, G_.queue >= 20 ? 'warn' : null),
      kpi('Trucks today', String(X.trucksIn), `${X.trucksOut} out · ${D.fmt(X.palOut)} pallets picked`),
      kpi('Packaged turnaround', K.ta.PKG ? HRS(K.ta.PKG.avg) : '—', K.ta.PKG ? `P90 ${HRS(K.ta.PKG.p90)}` : 'no trucks out yet', K.ta.PKG && K.ta.PKG.avg > 240 ? 'warn' : null),
      kpi('Boxes stuffed today', String(X.boxes), `${K.stuffing.inWork} in work · plan ≈ ${K.stuffing.plan}/d`),
    ], 8),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      section('Stores', note('automated high-bay with 10 stacker cranes; block-stacked drum and IBC store'), [
        store('High-bay store · small packs and pails', W.hbw, K.wh.coverHBW, 8), store('Drum & IBC store', W.drm, K.wh.coverDRM, 4.8),
        div({ display: 'flex', gap: 6, flexWrap: 'wrap' }, ...W.cranes.map(c => chipBtn(`${c.id} ${c.fault ? 'Fault' : 'OK'}`, c.fault ? 'crit' : 'ok', () => A.sel('sc', c.id), isSel('sc', c.id), `Stacker crane ${c.id}`))),
      ], { key: 'stores' }),
      section('Gate', note('6 in-lanes, 6 out-lanes, 8 weighbridges, 220-truck park'), [
        kv('Queue outside', `${G_.queue} trucks`, { color: G_.queue >= 20 ? 'var(--warnInk)' : 'var(--ink)' }), kv('In the park', `${G_.park.occ} of 220`), kv('On site', `${G_.onSite} trucks`),
        kv('Gate system', G_.outage ? 'Outage · manual check-in' : 'Normal', { f: 'sans', color: G_.outage ? 'var(--warnInk)' : 'var(--ink)' }),
        kv('Turnaround · packaged', ta('PKG'), { f: 'sans' }), kv('Turnaround · bulk', ta('BLK'), { f: 'sans' }), kv('Turnaround · cross-dock', ta('XDK'), { f: 'sans' }), kv('Turnaround · materials', ta('MAT'), { f: 'sans' }), kv('Turnaround · discharge', ta('UNL'), { f: 'sans', last: true }),
      ], { key: 'gate' })),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      trend('Store fill, last 48 h', [{ key: 'whHBW', label: 'High-bay store', color: 'var(--acc)' }, { key: 'whDRM', label: 'Drum & IBC store', color: 'oklch(0.62 0.10 60)' }], { hours: 48, unit: '%', y1: 100, sub: '% of pallet places' }),
      trend('Trucks, last 24 h', [{ key: 'onSite', label: 'On site', color: 'var(--acc)' }, { key: 'gateQ', label: 'Queue at the gate', color: 'var(--warn)' }, { key: 'docksPKG', label: 'Docks in use', color: 'var(--ink3)' }], { unit: 'trucks', sub: 'count' })),
    section('Truck bays · 140', note('press a bay for the truck or box in it'), zones.map(([cls, label, ids]) => {
      const list = S.bays.filter(b => b.cls === cls), busy = list.filter(b => b.state !== 'Free').length;
      return div({ key: 'z' + cls, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
        div({ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12.5, minWidth: 0, flexWrap: 'wrap' }, span({ fontWeight: 600 }, label), span({ color: 'var(--ink3)', fontFamily: 'var(--fnum)' }, `${ids} · ${busy}/${list.length} in use`)),
        div({ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${ctx.mobile ? 34 : 38}px, 1fr))`, gap: 4, minWidth: 0 }, ...list.map(bayCell)));
    }), { key: 'bays' }),
    section('Trucks on site', seg([['all', 'All'], ['PKG', 'Packaged'], ['XDK', 'Cross-dock'], ['BLK', 'Bulk'], ['MAT', 'Materials'], ['UNL', 'Discharge'], ['ISO', 'ISO']], tf, x => A.set({ tf: x }), 'Truck filter'), [table([
      { label: 'Plate', w: '104px', f: x => x.plate, mono: true },
      { label: 'Haulier', w: 'minmax(140px,1.3fr)', f: x => x.carrier.replace(/^PT /, '') },
      { label: 'Type', w: '96px', f: x => truckType(x) },
      { label: 'Cargo', w: 'minmax(170px,1.8fr)', f: x => cargoOf(x) },
      { label: 'Bay', w: '62px', f: x => x.bay || '—', mono: true },
      { label: 'On site', w: '84px', f: x => D.dur(D.NOW - x.arr), mono: true, align: 'right' },
      { label: 'State', w: '112px', f: x => chip(x.state, truckTone(x)) },
    ], tr, { onRow: x => A.sel('truck', x.id), selected: x => isSel('truck', x.id), key: x => x.id, scroll: true, minW: 860, max: 460, sticky: true, empty: 'No trucks of this type on site.' })], { key: 'trucks', pad: 0 }),
    section('Containers stuffed for rail and feeder', note(`${S.rail.icy.dryEmpty} dry empties in the container yard`), [table([
      { label: 'Container', w: '132px', f: x => x.id, mono: true },
      { label: 'Size', w: '56px', f: x => x.size, mono: true },
      { label: 'For', w: '70px', f: x => ({ JKT: 'Jakarta', SUB: 'Surabaya', FDR: 'Feeder' })[x.dest] || x.dest },
      { label: 'Pallets', w: '70px', f: x => String(x.pallets), mono: true, align: 'right' },
      { label: 'Tonnes', w: '70px', f: x => D.fmt(x.t, 1), mono: true, align: 'right' },
      { label: 'Bay', w: '62px', f: x => x.bay, mono: true },
      { label: 'State', w: 'minmax(120px,1fr)', f: x => chip(x.state === 'Staged' ? `Staged ${hh(x.staged)}` : `Stuffing · ready ${hh(x.until)}`, x.state === 'Staged' ? 'ok' : 'run') },
    ], S.boxes.slice(0, 40), { onRow: x => A.sel('box', x.id), selected: x => isSel('box', x.id), key: x => x.id, scroll: true, minW: 640, max: 360, sticky: true, empty: 'No containers stuffed yet.' })], { key: 'boxes', pad: 0 }));
}

// ── ISO station, yard and rail ──
const ISO_CAT = { EC: ['Clean empty', 'oklch(0.80 0.03 230)'], ED: ['Dirty empty, to wash', 'oklch(0.70 0.07 60)'], FO: ['Full, outbound', 'oklch(0.58 0.12 150)'], IF: ['Inbound full', 'oklch(0.58 0.12 280)'], ER: ['Empty, to return', 'oklch(0.72 0.02 260)'], RP: ['Repair', 'oklch(0.60 0.15 25)'] };
const craneTone = c => c.fault ? 'crit' : c.pm ? 'off' : c.iso ? 'run' : 'idle';
function isoCraneTile(c) {
  const x = c.iso, fr = x ? (c.op === 'fill' ? c01(x.t / Math.max(1, c.target || 20)) : c.step === 'Discharging' ? c01(1 - x.t / 21) : null) : null;
  return tile({ key: 'ic' + c.id, id: c.id, state: c.fault ? 'Fault' : c.step || 'Free', tone: craneTone(c), sw: x && x.code ? sw(famColor(x.code), !GRD(x.code)) : null,
    line1: x ? `${c.op === 'fill' ? 'Fill' : 'Discharge'} · ${shortOf(x.code)}` : `Bay ${c.bay}`, line2: x ? `${x.id} · ${T0(x.t, 1)}` : c.role, frac: fr, on: isSel('crane', c.id), onClick: () => A.sel('crane', c.id) });
}
// why an inbound full ISO tank is still in the yard
function isoInbound(x) {
  if (!x.qcOK) return 'Receipt sample in test';
  if (D.NOW < x.heatUntil) return `Heating to ${hh(x.heatUntil)}`;
  const C = HUB.info.COMP[x.code], add = C && C.kind === 'additive', ks = [...S._tanks.BOT, ...S._tanks.ADD].filter(k => k.code === x.code && k.state !== 'QC hold');
  if (!ks.length) return 'Ready to discharge';
  const room = Math.max(...ks.map(k => k.moc - k.vol)) * (C ? C.dens / 1000 : .88);
  if (add && Math.min(...ks.map(k => k.vol / k.moc)) > .55) return 'Rolling stock · tank above 55 %';
  return room < x.t + 2 ? 'Waiting for tank room' : 'Ready · next free crane';
}
function yardMap() {
  const bySlot = {}; S.isos.forEach(x => { if (x.slot >= 0) bySlot[x.slot] = x; });
  const P2 = PAL[ctx.theme === 'dark' ? 'dark' : 'light'], kids = [], cw = 15, ch = 9, gap = 1;
  ['Y-A', 'Y-B', 'Y-C', 'Y-D', 'Y-E'].forEach((bl, bi) => {
    const y0 = 8 + bi * 50; kids.push(h('text', { key: 't' + bl, x: 0, y: y0 + 20, style: { fontSize: 11, fill: P2.mute, fontFamily: 'var(--fnum)' } }, bl));
    for (let i = 0; i < 50; i++) {
      const slot = bi * 50 + i, x = bySlot[slot], row = i >> 1, tier = i % 2, heat = slot >= 150 && slot < 180, on = x ? isSel('iso', x.id) : isSel('slot', String(slot));
      kids.push(h('rect', { key: 's' + slot, x: 34 + row * (cw + gap), y: y0 + tier * (ch + 3), width: cw, height: ch, className: 'sh-slot', onClick: () => x ? A.sel('iso', x.id) : A.sel('slot', String(slot)),
        style: { fill: x ? ISO_CAT[x.cat][1] : P2.tank, stroke: on ? P2.sel : heat ? 'var(--warn)' : P2.tankBd, strokeWidth: on ? 2 : heat ? 1 : .5, cursor: 'pointer' } },
        h('title', null, x ? `${x.id} · ${x.type || 'T11'} · ${ISO_CAT[x.cat][0]}${x.code ? ' · ' + shortOf(x.code) : ''} · ${x.loc}` : `${bl} slot ${row + 1}/${tier + 1} · free${heat ? ' · steam heating point' : ''}`)));
    }
  });
  return h('svg', { viewBox: '0 0 440 254', width: '100%', role: 'img', 'aria-label': `ISO yard, ${S.iso.occ} of 250 slots occupied`, style: { display: 'block', maxWidth: 760 } }, ...kids);
}
function isoTab() {
  const K = S.kpi, Y = S.iso, icy = S.rail.icy, iv = ST.iv || 'IF';
  const inYard = S.isos.filter(x => iv === 'all' ? true : x.cat === iv).sort((a, b) => (a.slot < 0) - (b.slot < 0) || a.since - b.since);
  const trains = S.trains.filter(t => t.state !== 'Departed' || t.atd > D.NOW - 720).sort((a, b) => (a.ata || a.eta) - (b.ata || b.eta));
  const svc = { JKT: 'Jakarta liner', SUB: 'Surabaya liner', ISO: 'Base-oil ISO shuttle' };
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    grid(160, [
      kpi('ISO yard', `${Y.occ}/250`, Object.entries(Y.byCat).map(([c, n]) => `${c} ${n}`).join(' · '), Y.occ >= 225 ? 'warn' : null),
      kpi('ISO fills today', String(K.iso.fills), `plan ≈ ${Math.round(K.iso.fillPlan)} per day`),
      kpi('ISO discharges today', String(K.iso.disch), `${S.isos.filter(x => x.cat === 'IF').length} full inbound waiting`),
      kpi('Cranes working', `${K.iso.busy}/18`, `${Y.orders.length} fill orders open`, 'run'),
      kpi('Heating points', `${Y.heatUsed}/30`, 'Y-D steam points'),
      kpi('Rail moves today', D.fmt(K.rail.movesToday), `${D.fmt(K.rail.movesHour)} moves/h now`),
    ], 8),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      trend('ISO yard, last 48 h', [{ key: 'isoOcc', label: 'Tanks in the yard', color: 'var(--acc)' }], { hours: 48, unit: 'tanks', y1: 250, sub: 'of 250 slots' }),
      trend('Rail crane moves per hour, last 48 h', [{ key: 'railMoves', label: 'Moves', color: 'oklch(0.58 0.09 250)', mul: 4, smooth: 4 }], { hours: 48, unit: 'moves/h', sub: '4 rail-mounted gantries' })),
    section('ISO station · 18 positions', note('A base-oil discharge & mineral fill · B mineral & synthetic fill · C heated additive discharge & heavy fill · D clean, food-grade & PAG fill'), [grid(196, S.isoCranes.map(isoCraneTile), 8)], { key: 'cranes' }),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1.25fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      section('ISO yard · 5 blocks × 25 rows × 2 tiers', note('SJIU T11 tanks · press a tank'), [
        div({ overflowX: 'auto', minWidth: 0 }, div({ minWidth: 420 }, yardMap())),
        div({ display: 'flex', gap: '6px 14px', flexWrap: 'wrap', fontSize: 12 }, ...Object.entries(ISO_CAT).map(([c, [label, col]]) => span({ display: 'inline-flex', alignItems: 'center', gap: 5 }, span({ width: 10, height: 10, background: col, display: 'inline-block' }), `${label} ${Y.byCat[c] || 0}`)), span({ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--ink3)' }, span({ width: 10, height: 10, border: '1px solid var(--warn)', display: 'inline-block' }), 'Steam heating point')),
        div({ display: 'flex', gap: 6, flexWrap: 'wrap' }, ...Y.wash.map(w => chipBtn(`${w.id} ${w.iso ? 'washing ' + w.iso.id : 'free'}`, w.iso ? 'run' : 'idle', () => A.sel('wash', w.id), isSel('wash', w.id), `Wash bay ${w.id}`)), Y.divert ? chip(`${Y.divert} diverted to the depot`, 'warn') : null),
      ], { key: 'yard' }),
      section('Fill orders', note(`${Y.orders.length} waiting for a crane`), [table([
        { label: 'Order', w: '104px', f: o => o.id.replace('ISO-ORD-', 'ORD '), mono: true },
        { label: 'Grade', w: 'minmax(130px,1.5fr)', f: o => [sw(famColor(o.code)), span({ ...ell }, shortOf(o.code))] },
        { label: 'Leaves by', w: '64px', f: o => ({ road: 'Road', rail: 'Rail', sea: 'Feeder' })[o.mode] },
        { label: 'Due', w: '96px', f: o => D.tm(o.due, tz, { tz: false }), mono: true, align: 'right', color: o => o.due - D.NOW < 360 ? 'var(--warnInk)' : 'var(--ink)' },
      ], Y.orders.slice().sort((a, b) => a.due - b.due), { onRow: o => A.sel('grade', o.code), key: o => o.id, scroll: true, minW: 420, max: 360, sticky: true, empty: 'Every fill order has a crane.' })], { key: 'orders', pad: 0 })),
    section('ISO tanks', seg([['IF', 'Inbound full'], ['FO', 'Full outbound'], ['EC', 'Clean empty'], ['ED', 'To wash'], ['ER', 'To return'], ['RP', 'Repair'], ['all', 'All']], iv, x => A.set({ iv: x }), 'ISO filter'), [table([
      { label: 'Tank', w: '128px', f: x => x.id, mono: true },
      { label: 'Type', w: '48px', f: x => x.type || 'T11', mono: true },
      { label: 'Category', w: 'minmax(120px,1fr)', f: x => [span({ width: 9, height: 9, display: 'inline-block', background: ISO_CAT[x.cat][1], flex: 'none' }), span({ ...ell }, ISO_CAT[x.cat][0])] },
      { label: 'Product', w: 'minmax(140px,1.4fr)', f: x => x.code ? shortOf(x.code) : '—' },
      { label: 'Tonnes', w: '66px', f: x => x.t ? D.fmt(x.t, 1) : '—', mono: true, align: 'right' },
      { label: 'Location', w: '128px', f: x => x.loc || '—', mono: true },
      { label: 'Status', w: 'minmax(150px,1.3fr)', f: x => x.cat === 'IF' ? isoInbound(x) : x.cat === 'FO' ? `${({ road: 'Road', rail: 'Rail', sea: 'Feeder' })[x.mode] || ''} · due ${hh(x.due)}` : x.cat === 'RP' ? (x.repairUntil ? `Back ${hh(x.repairUntil)}` : 'Repair') : '—' },
    ], inYard, { onRow: x => A.sel('iso', x.id), selected: x => isSel('iso', x.id), key: x => x.id, scroll: true, minW: 820, max: 420, sticky: true, empty: 'No ISO tanks in this category.' })], { key: 'isos', pad: 0 }),
    div({ display: 'grid', gridTemplateColumns: ctx.tablet ? 'minmax(0,1fr)' : 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12, minWidth: 0 },
      section('Trains', note('every day · SUB liners 01:00, 09:00, 17:00 · JKT liners 03:30, 11:30, 19:30 · ISO shuttle 21:00'), [table([
        { label: 'Train', w: '78px', f: t => t.id, mono: true },
        { label: 'Service', w: 'minmax(130px,1.3fr)', f: t => svc[t.service] || t.name },
        { label: 'Due', w: '96px', f: t => hh(t.ata || t.eta), mono: true, color: t => t.eta - t.sched > 120 && !t.ata ? 'var(--warnInk)' : 'var(--ink)' },
        { label: 'Track', w: '56px', f: t => t.track || '—', mono: true },
        { label: 'Moves', w: '72px', f: t => t.moves ? `${Math.round(t.done)}/${t.moves}` : '—', mono: true, align: 'right' },
        { label: 'State', w: 'minmax(110px,1fr)', f: t => chip(t.state, t.state === 'Working' ? 'run' : t.state === 'Cancelled' ? 'off' : t.state === 'Departed' ? 'ok' : t.state === 'Expected' && t.eta - t.sched > 120 ? 'warn' : tone(t.state)) },
      ], trains, { onRow: t => A.sel('train', t.id), selected: t => isSel('train', t.id), key: t => t.id, scroll: true, minW: 600 })], { key: 'trains', pad: 0 }),
      section('Rail cranes & container yard', null, [
        grid(150, S.rail.cranes.map(c => tile({ key: 'rmg' + c.id, id: c.id, state: c.fault ? 'Fault' : c.state, tone: c.fault ? 'crit' : c.state === 'Working' ? 'run' : 'idle', line1: c.train ? `On ${c.train}` : 'Rail-mounted gantry', line2: `${D.fmt(c.movesToday)} moves today`, on: isSel('rmg', c.id), onClick: () => A.sel('rmg', c.id) })), 8),
        kv('Dry empties', `${icy.dryEmpty} boxes`), kv('Stuffed, staged', `JKT ${icy.full.JKT} · SUB ${icy.full.SUB} · feeder ${icy.full.FDR}`), kv('ISO tanks staged', String(S.isos.filter(x => /^ICY/.test(x.loc)).length)), kv('Yard use', `${icy.teu} of ${icy.cap} TEU`, { last: true }),
      ], { key: 'rmg' })));
}

// ── quality laboratory ──
const smpTone = x => x.status === 'Passed' ? 'ok' : x.status === 'Failed' ? 'crit' : x.status === 'In test' ? 'run' : x.status === 'Retained' ? 'off' : D.NOW - x.at > 120 ? 'warn' : 'idle';
function labTab() {
  const K = S.kpi, Lb = S.lab, lf = ST.lf || 'open';
  let rows = S.samples;
  if (lf === 'open') rows = rows.filter(x => x.status === 'Queued' || x.status === 'In test');
  else if (lf === 'rel') rows = rows.filter(x => x.type === 'Release' || x.type === 'Grease');
  else if (lf === 'rec') rows = rows.filter(x => x.type === 'Receipt' || x.type === 'Vessel parcel');
  else if (lf === 'fail') rows = rows.filter(x => x.status === 'Failed');
  const holds = [...S._tanks.FPT.filter(k => k.state === 'QC hold' || k.state === 'Adjusting' || k.state === 'On hold' || k.q === 'On hold'), ...S._tanks.BOT.filter(k => k.state === 'QC hold'), ...S._tanks.ADD.filter(k => k.state === 'QC hold')];
  const hop = S.grease.hoppers.filter(hp => hp.code && hp.q !== 'Released');
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    grid(160, [
      kpi('Queued', String(K.lab.queue), 'in-process first, then release, then receipt', K.lab.queue > 20 ? 'warn' : null),
      kpi('In test', `${K.lab.inTest}/${Lb.cap}`, 'parallel test streams', 'run'),
      kpi('Completed today', String(K.lab.done || 0), `${K.lab.samples} samples logged`),
      kpi('Turnaround', HRS(K.lab.tatAvg), `P90 ${HRS(K.lab.tatP90)}`),
      kpi('On time', K.lab.onTime == null ? '—' : PCT(K.lab.onTime), 'within 5 h · turbine oils 9 h', K.lab.onTime != null && K.lab.onTime < .9 ? 'warn' : null),
      kpi('Right first time', K.blend.rft == null ? '—' : PCT(K.blend.rft, 1), 'release and grease tests', K.blend.rft != null && K.blend.rft < .95 ? 'warn' : null),
    ], 8),
    trend('Samples in the lab, last 24 h', [{ key: 'labQ', label: 'Queued and in test', color: 'var(--acc)' }], { unit: 'samples', sub: '24 parallel test streams', wide: true }),
    section('Instruments', note('an instrument out of service slows the tests that need it'), [div({ display: 'flex', gap: 6, flexWrap: 'wrap' }, ...Lb.instruments.map(x => chipBtn(`${x.label} · ${x.n - x.down}/${x.n}${x.down ? ' · back ' + hh(x.until) : ''}`, x.down ? 'warn' : 'ok', () => A.sel('instr', x.id), isSel('instr', x.id), `${x.label}: ${x.n} units`)))], { key: 'inst' }),
    section('Awaiting release', note(`${holds.length} tanks and ${hop.length} hoppers held for results`), [holds.length || hop.length ? table([
      { label: 'Where', w: '72px', f: r => r.id, mono: true },
      { label: 'Product', w: 'minmax(150px,1.6fr)', f: r => [sw(famColor(r.code), !GRD(r.code)), span({ ...ell }, (GRD(r.code) || HUB.info.COMP[r.code] || {}).label || r.code)] },
      { label: 'Quantity', w: '96px', f: r => r.size ? T0(r.t, 1) : KL(Math.max(0, r.vol - r.heel)), mono: true, align: 'right' },
      { label: 'Batch', w: '132px', f: r => (r.batch || '—').replace('BLD-MLB-', ''), mono: true },
      { label: 'Held since', w: '86px', f: r => hh(r.since), mono: true },
      { label: 'State', w: 'minmax(130px,1fr)', f: r => r.size ? chip(r.q === 'Awaiting test results' ? 'In test' : r.q, r.q === 'On hold' ? 'crit' : 'warn') : chip(r.state === 'Adjusting' ? 'Adjusting · re-test' : r.q === 'On hold' ? 'On hold' : 'Awaiting results', r.state === 'Adjusting' || r.q === 'On hold' ? 'crit' : 'warn') },
    ], [...holds, ...hop], { onRow: r => r.size ? A.sel('hopper', r.id) : A.sel('tank', r.id), selected: r => isSel(r.size ? 'hopper' : 'tank', r.id), key: r => r.id, scroll: true, minW: 700, max: 320, sticky: true }) : empty('Nothing is held for results.')], { key: 'holds', pad: holds.length || hop.length ? 0 : undefined }),
    section('Samples', seg([['open', 'Open'], ['rel', 'Release'], ['rec', 'Receipt'], ['fail', 'Failed'], ['all', 'All']], lf, x => A.set({ lf: x }), 'Sample filter'), [table([
      { label: 'Sample', w: '112px', f: x => x.id.replace('S-MLB-', ''), mono: true },
      { label: 'Type', w: '92px', f: x => x.type },
      { label: 'Product', w: 'minmax(140px,1.5fr)', f: x => [sw(famColor(x.code), !GRD(x.code)), span({ ...ell }, shortOf(x.code))] },
      { label: 'Batch / source', w: 'minmax(120px,1.1fr)', f: x => String(x.batch || x.src || '—').replace('BLD-MLB-', '') },
      { label: 'Taken', w: '70px', f: x => hh(x.at), mono: true },
      { label: 'Result due', w: '84px', f: x => x.done ? hh(x.done) : x.due ? hh(x.due) : '—', mono: true },
      { label: 'Status', w: '104px', f: x => chip(x.status, smpTone(x)) },
    ], rows.slice(0, 160), { onRow: x => A.sel('sample', x.id), selected: x => isSel('sample', x.id), key: x => x.id, scroll: true, minW: 760, max: 520, sticky: true, empty: 'No samples in this view.' })], { key: 'smp', pad: 0 }));
}

// ── products ──
function productsTab() {
  const q = (ST.q || '').trim().toLowerCase(), pf = ST.pf || 'all', ps = ST.ps || 'cover';
  const FAM = HUB.info.FAMILIES;
  const allRows = HUB.info.GRADES.map(G => ({ G, st: HUB.gradeStock(G.code) }));
  let rows = allRows;
  if (pf !== 'all') rows = rows.filter(r => r.G.P.fam === pf);
  if (q) rows = rows.filter(r => (r.G.label + ' ' + r.G.code + ' ' + r.G.short + ' ' + FAM[r.G.P.fam].name).toLowerCase().includes(q));
  const cov = r => r.st && r.st.cover != null ? r.st.cover : 999;
  rows.sort(ps === 'name' ? (a, b) => a.G.label.localeCompare(b.G.label) : ps === 'demand' ? (a, b) => (b.G.d || 0) - (a.G.d || 0) : (a, b) => cov(a) - cov(b));
  const famBtns = [['all', 'All families'], ...Object.entries(FAM).map(([k2, F]) => [k2, F.name])];
  const low = allRows.filter(r => r.st && r.st.cover != null && r.G.d > 1 && r.st.cover < 2).length;
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    grid(160, [kpi('Products', '84', '13 families'), kpi('Grades', '169', `${HUB.info.GRADES.filter(G => G.runner).length} runners with dedicated tanks`), kpi('Released finished stock', T0(S.kpi.fin.rel), `${DAYS(S.kpi.fin.days)} of liquid demand`), kpi('In quality hold', T0(S.kpi.fin.qc), 'tanks awaiting release'), kpi('Grades under 2 days', String(low), 'released + warehouse cover', low > 6 ? 'warn' : null)], 8),
    section('Grades', div({ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 },
      h('input', { type: 'search', value: ST.q || '', onChange: e => A.set({ q: e.target.value }), placeholder: 'Search products and grades', 'aria-label': 'Search products and grades', style: { height: 30, width: 230, maxWidth: '100%', padding: '0 9px', border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--ink)', fontSize: 12.5, minWidth: 0 } }),
      h('select', { value: pf, onChange: e => A.set({ pf: e.target.value }), 'aria-label': 'Product family', style: { height: 30, maxWidth: 230, padding: '0 6px', border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--ink)', fontSize: 12.5, minWidth: 0 } }, ...famBtns.map(([id, lab]) => h('option', { key: id, value: id }, lab))),
      seg([['cover', 'Lowest cover'], ['demand', 'Demand'], ['name', 'Name']], ps, x => A.set({ ps: x }), 'Sort')), [table([
      { label: 'Grade', w: 'minmax(220px,2.4fr)', f: r => [sw(r.G.P.color), span({ ...ell }, r.G.label)] },
      { label: 'Family', w: 'minmax(120px,1.1fr)', f: r => FAM[r.G.P.fam].name },
      { label: 'Released', w: '86px', f: r => r.G.P.fam === 'GR' ? '—' : D.fmt(r.st.rel), mono: true, align: 'right' },
      { label: 'In QC', w: '72px', f: r => r.st.qc ? D.fmt(r.st.qc) : '—', mono: true, align: 'right' },
      { label: 'Warehouse', w: '86px', f: r => D.fmt(r.st.wh), mono: true, align: 'right' },
      { label: 'Demand', w: '80px', f: r => D.fmt(r.G.d, 1), mono: true, align: 'right' },
      { label: 'Cover', w: '68px', f: r => r.st.cover == null ? '—' : DAYS(r.st.cover), mono: true, align: 'right', color: r => r.st.cover != null && r.st.cover < 1.5 && r.G.d > 1 ? 'var(--critInk)' : r.st.cover != null && r.st.cover < 3 && r.G.d > 1 ? 'var(--warnInk)' : 'var(--ink)' },
      { label: 'Tanks', w: 'minmax(90px,.9fr)', f: r => r.st.tanks.length ? r.st.tanks.join(' ') : r.G.P.fam === 'GR' ? 'Hoppers' : 'Swing', mono: true },
    ], rows, { onRow: r => A.sel('grade', r.G.code), selected: r => isSel('grade', r.G.code), key: r => r.G.code, scroll: true, minW: 940, max: 620, sticky: true, empty: 'No grade matches the search.' })], { key: 'grades', pad: 0 }),
    note('Tonnes; demand is the planned average per day; cover = (released tank stock + warehouse stock) ÷ demand. Grease stock sits in the hoppers and the warehouse.'));
}

// ── events and alarms ──
function logTab() {
  const ev = ST.ev || 'events', ar = ST.ar || 'all';
  const areas = [...new Set(S.events.map(e => e.area))].sort();
  const evs = (ar === 'all' ? S.events : S.events.filter(e => e.area === ar)).slice(0, 220);
  const al = S.alarms.slice().sort((a, b) => (a.status === 'Resolved') - (b.status === 'Resolved') || b.since - a.since);
  return div({ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
    div({ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, seg([['events', 'Event log'], ['alarms', `Alarms · ${S.kpi.alarms.open} open`]], ev, x => A.set({ ev: x }), 'Log view'), btn('Open the alarm panel', () => A.alarms())),
    ev === 'events' ? section('Event log', h('select', { value: ar, onChange: e => A.set({ ar: e.target.value }), 'aria-label': 'Area', style: { height: 30, padding: '0 6px', border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--ink)', fontSize: 12.5, maxWidth: '100%' } }, h('option', { value: 'all' }, 'All areas'), ...areas.map(a => h('option', { key: a, value: a }, a))), [
      ...evs.map((e, i) => div({ key: 'e' + i, display: 'grid', gridTemplateColumns: ctx.mobile ? '48px 16px minmax(0,1fr)' : '62px 16px 96px minmax(0,1fr)', gap: 8, alignItems: 'start', padding: '6px 0', borderBottom: '1px solid var(--line2)' },
        span({ fontFamily: 'var(--fnum)', fontSize: 12, color: 'var(--ink3)' }, hh(e.at)), I.st[e.sev === 'critical' ? 'critical' : e.sev === 'attention' ? 'attention' : 'info'],
        ctx.mobile ? null : span({ fontSize: 12, color: 'var(--ink3)', ...ell }, e.area),
        span({ fontSize: 12.5, minWidth: 0, overflowWrap: 'anywhere' }, ctx.mobile ? `${e.area} · ${e.text}` : e.text))),
      evs.length ? null : empty('No events in this area yet.'),
    ], { key: 'evlog' }) :
    section('Alarms', note('acknowledge and resolve them in the alarm panel'), [table([
      { label: 'Alarm', w: '84px', f: e => e.id, mono: true },
      { label: 'Severity', w: '98px', f: e => chip(e.sev === 'critical' ? 'Critical' : e.sev === 'attention' ? 'Attention' : 'Advisory', e.sev === 'critical' ? 'crit' : e.sev === 'attention' ? 'warn' : 'idle') },
      { label: 'Asset', w: 'minmax(110px,1fr)', f: e => e.asset },
      { label: 'What happened', w: 'minmax(220px,2.6fr)', f: e => span({ ...ell }, e.what) },
      { label: 'Raised', w: '74px', f: e => hh(e.since), mono: true },
      { label: 'Status', w: '96px', f: e => chip(e.status, e.status === 'Resolved' ? 'ok' : e.status === 'Open' ? (e.sev === 'critical' ? 'crit' : 'warn') : 'run') },
    ], al, { onRow: () => A.alarms(), key: e => e.id, scroll: true, minW: 820, max: 620, sticky: true, empty: 'No alarms raised yet.' })], { key: 'alarms', pad: 0 }));
}

// ── detail drawer: a zone of the site plan or one asset ──
const KIND = { vessel: 'Vessel', tank: 'Tank', blender: 'Blender', gunit: 'Grease unit', hopper: 'Grease hopper', batch: 'Batch', line: 'Filling line', blow: 'Blow moulder', sample: 'Sample', truck: 'Truck', bay: 'Truck bay', box: 'Container', crane: 'ISO crane position', iso: 'ISO tank', train: 'Train', rmg: 'Rail crane', grade: 'Product grade', sc: 'Stacker crane', wash: 'Wash bay', jetty: 'Jetty', track: 'Rail track', slot: 'ISO yard slot', gaux: 'Grease plant', instr: 'Lab instrument' };
function dl(rows) {
  const list = rows.filter(Boolean);
  return div({ display: 'flex', flexDirection: 'column', minWidth: 0 }, ...list.map((r, i) => kv(r[0], r[1] == null || r[1] === '' ? '—' : r[1], { w: 118, ...(r[2] || {}), last: i === list.length - 1 })));
}
function sub(title, ...kids) { return div({ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }, h('h3', { style: { margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--ink2)' } }, title), ...kids); }
function link(label, onClick, title) { return h('button', { onClick, title: title || label, className: 'sh-link', style: { border: 0, background: 'transparent', padding: 0, color: 'var(--acc)', font: 'inherit', fontSize: 13, cursor: 'pointer', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label); }
// a compact pressable row for lists inside the drawer
function itemRow(o) {
  const tn = o.tone || 'idle';
  return h('button', { key: o.key, onClick: o.onClick, className: 'sh-row', 'aria-pressed': o.on ? 'true' : 'false', style: { display: 'grid', gridTemplateColumns: '10px 64px minmax(0,1fr) auto', gap: 8, alignItems: 'center', width: '100%', minWidth: 0, padding: '7px 8px', border: 0, borderBottom: '1px solid var(--line2)', background: o.on ? 'var(--accSoft)' : 'transparent', color: 'var(--ink)', font: 'inherit', textAlign: 'left', cursor: 'pointer' } },
    dot(tn, 8), span({ fontFamily: 'var(--fid)', fontSize: 12.5, fontWeight: 600, ...ell }, o.id), span({ fontSize: 12.5, ...ell }, o.label), span({ fontSize: 11.5, color: TINK[tn], ...ell, maxWidth: 150, textAlign: 'right' }, o.right || ''));
}
function steps(list, si, t0) { // [[name, minutes]] with the current index
  let at = t0;
  return div({ display: 'flex', flexDirection: 'column', minWidth: 0 }, ...list.map(([name, m], i) => {
    const a = at; at += m; const st = i < si ? 'done' : i === si ? 'now' : 'next';
    return div({ display: 'grid', gridTemplateColumns: '14px minmax(0,1fr) 54px 58px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--line2)', minWidth: 0, color: st === 'next' ? 'var(--ink3)' : 'var(--ink)' },
      span({ width: 9, height: 9, display: 'inline-block', background: st === 'done' ? 'var(--ok)' : st === 'now' ? 'var(--acc)' : 'transparent', border: st === 'next' ? '1px solid var(--ink4)' : 0 }, null),
      span({ fontSize: 12.5, fontWeight: st === 'now' ? 600 : 400, ...ell }, name), span({ fontFamily: 'var(--fnum)', fontSize: 12, textAlign: 'right' }, `${m} min`), span({ fontFamily: 'var(--fnum)', fontSize: 12, textAlign: 'right', color: 'var(--ink3)' }, hh(a)));
  }));
}
function tankChart(t) {
  const hist = D.tankHistory(t, 24, 30), pts = hist.map(p => ({ t: p.t, v: p.v }));
  const xt = []; for (let x = Math.ceil(pts[0].t / 360) * 360; x <= D.NOW; x += 360) xt.push({ t: x, label: hh(x) });
  return D.lineChart(h, { w: 400, h: 150, l: 52, series: [{ pts, color: famColor(t.code) === 'var(--ink3)' ? 'var(--ink)' : famColor(t.code), label: 'Volume', unit: 'kL', area: true }], refs: [{ v: t.hla, label: 'High-level alarm', color: 'var(--critInk)' }], y0: 0, y1: t.nominal, xTicks: xt, hover: ST.hv && ST.hv.tank, onHover: v => A.hover('tank', v), tz, aria: `${t.id} volume, last 24 h` });
}
const findTank = id => S._all[id];
function dTank(t) {
  const G = GRD(t.code), C = HUB.info.COMP[t.code], m = D.movements(t, D.dayStart(0, tz), D.NOW), f = t.fill;
  const users = t.zone === 'BOT' || t.zone === 'ADD' ? S.blenders.filter(b => b.batch && b.batch.comps && b.batch.comps.some(c => c.c === t.code)).map(b => b.id) : [];
  return [
    dl([['Product', t.free ? 'Free, clean swing tank' : G ? link(G.label, () => A.sel('grade', G.code)) : C ? C.label : shortOf(t.code), { f: 'sans' }], ['State', t.free ? 'Free' : t.state === 'QC hold' ? 'Quality hold · settling' : t.status, { f: 'sans' }], ['Quality', t.q, { f: 'sans', color: t.q === 'Released' ? 'var(--ink)' : 'var(--warnInk)' }],
      ['Volume', `${KL(t.vol)} · ${PCT(t.vol / t.nominal)}`], ['Ullage to MOC', KL(Math.max(0, t.moc - t.vol))], ['Nominal · MOC · HLA', `${D.fmt(t.nominal)} · ${D.fmt(t.moc)} · ${D.fmt(t.hla)} kL`], ['Heel', KL(t.heel)],
      ['Temperature', t.heated ? `${D.fmt(t.temp, 1)} °C · heated to ${t.heated} °C` : `${D.fmt(t.temp, 1)} °C`], ['Batch', t.batch ? t.batch.replace('BLD-MLB-', '') : null], t.duty ? ['Working with', t.duty, { f: 'sans' }] : null,
      ['Service', `${t.material} · ${t.roof}`, { f: 'sans' }], t.zone === 'FPT' ? ['Duty', t.dedicated ? 'Dedicated to one grade' : t.use === 'swing' ? 'Swing tank for low runners' : `Reserved for ${t.use}`, { f: 'sans' }] : null]),
    f ? sub('Tank fill in progress', dl([['Target', KL(f.target)], ['Batches', String(f.batches.length)], ['Opened', hh(f.opened)], ['Product flowing', f.flowing ? 'Yes' : 'Not yet', { f: 'sans' }]])) : null,
    sub('Volume, last 24 h', tankChart(t)),
    sub('Today since 00:00', dl([['Opening', KL(m.open)], ['Received', KL(m.rec)], ['Dispatched', KL(m.dis)], ['Now', KL(t.vol)]])),
    users.length ? sub('Feeding blends on', div({ display: 'flex', gap: 6, flexWrap: 'wrap' }, ...users.map(id => btn(id, () => A.sel('blender', id))))) : null,
  ];
}
function dVessel(v) {
  const j = v.jetty ? S.jetties.find(x => x.id === v.jetty) : null, C = HUB.info.VCLS[v.cls];
  return [
    dl([['Type', v.label, { f: 'sans' }], ['Voyage', v.voyage], ['Size', `${v.loa} m LOA · ${D.fmt(v.dwt)} DWT`], ['State', v.pause ? `Paused · ${v.pause.reason}` : v.state, { f: 'sans' }], ['Step', v.step, { f: 'sans', wrap: true }], ['Berth', j ? `${j.name} · ${j.role}` : '—', { f: 'sans' }],
      ['ETA', TM(v.eta)], v.ata ? ['Arrived', TM(v.ata)] : null, v.anchorSince && v.state === 'At anchorage' ? ['At anchorage', D.dur(D.NOW - v.anchorSince)] : null, v.berthAt ? ['Berthed', TM(v.berthAt)] : null, v.startAt ? ['Cargo started', TM(v.startAt)] : null, v.rate ? ['Pump rate', `${D.fmt(v.rate)} t/h`] : null, v.atd ? ['Departed', TM(v.atd)] : null]),
    v.moves ? sub('Container exchange', dl([['Moves', `${Math.round(v.moves.done)} of ${v.moves.planned}`], ['Ship\'s cranes', '2 × 40 t']]), bar(v.moves.done / Math.max(1, v.moves.planned), 'var(--acc)', 7)) : null,
    v.parcels.length ? sub(C.dir === 'in' ? 'Parcels to discharge' : 'Parcels to load', table([
      { label: 'Product', w: 'minmax(110px,1.6fr)', f: p => [sw(famColor(p.code), !GRD(p.code)), span({ ...ell }, shortOf(p.code))] },
      { label: 'Tonnes', w: '96px', f: p => `${D.fmt(p.done)} / ${D.fmt(p.t)}`, mono: true, align: 'right' },
      { label: 'State', w: '86px', f: p => chip(p.state, p.state === 'Pumping' ? 'run' : p.state === 'Done' ? 'ok' : 'idle') },
    ], v.parcels, { key: p => p.code })) : null,
    v.parcels.some(p => p.trf) ? div({ display: 'flex', gap: 8, flexWrap: 'wrap' }, btn('Open in Transfers', () => A.go('transfers', { terminalId: 'MLB', focus: { type: 'transfer', id: v.parcels.find(p => p.trf).trf } }))) : null,
  ];
}
function dBatch(bt) {
  const G = GRD(bt.code), k2 = bt.dst ? findTank(bt.dst) : null, unit = bt.grease ? S.grease.units.find(u => u.batch === bt) : S.blenders.find(b => b.batch === bt);
  const smp = id => { const x = S.samples.find(y => y.id === id); return x ? link(`${x.id.replace('S-MLB-', '')} · ${x.status}`, () => A.sel('sample', x.id)) : id; };
  return [
    dl([['Grade', G ? link(G.label, () => A.sel('grade', G.code)) : bt.code, { f: 'sans' }], ['Made on', link(bt.blender, () => A.sel(bt.grease ? 'gunit' : 'blender', bt.blender)), { f: 'sans' }], ['Route', bt.type, { f: 'sans' }],
      ['Quantity', bt.state === 'In progress' && !bt.grease ? `${T0(bt.done, 1)} of ${T0(bt.t, 1)}` : T0(bt.t, 1)], ['Into', bt.grease ? (bt.hopper ? link(bt.hopper, () => A.sel('hopper', bt.hopper)) : 'Hopper, at milling') : k2 ? link(k2.id, () => A.sel('tank', k2.id)) : bt.dst, { f: 'sans' }],
      ['Started', TM(bt.start)], bt.end ? ['Finished', TM(bt.end)] : ['Expected', TM(bt.eta)], ['State', bt.state === 'QC hold' ? 'Awaiting release' : bt.state, { f: 'sans' }], bt.rel ? ['Released', TM(bt.rel)] : null,
      bt.ipSample || bt.sample ? ['In-process sample', smp(bt.ipSample || bt.sample), { f: 'sans' }] : null, bt.relSample ? ['Release sample', smp(bt.relSample), { f: 'sans' }] : null]),
    bt.steps ? sub('Steps', steps(bt.steps, bt.state === 'In progress' ? bt.si : bt.steps.length, bt.start)) : unit && unit.steps && unit.batch === bt ? sub(`Steps on ${unit.id}`, steps(unit.steps, unit.si, unit.since)) : null,
    bt.comps ? sub('Recipe, % m/m', table([
      { label: 'Component', w: 'minmax(120px,2fr)', f: c => [sw((HUB.info.COMP[c.c] || {}).color || 'var(--ink3)', true), span({ ...ell }, (HUB.info.COMP[c.c] || {}).label || c.c)] },
      { label: '%', w: '54px', f: c => D.fmt(c.pct, c.pct < 1 ? 2 : 1), mono: true, align: 'right' },
      bt.grease ? null : { label: 'Charged', w: '90px', f: c => c.need != null ? `${D.fmt(c.drawn || 0, 2)} / ${D.fmt(c.need, 2)} t` : '—', mono: true, align: 'right' },
    ].filter(Boolean), bt.comps, { key: c => c.c })) : null,
  ];
}
function dBlender(b) {
  const bt = b.batch, recent = S.batches.filter(x => x.blender === b.id && x !== bt).slice(0, 6);
  return [
    dl([['Type', sizeOf(b), { f: 'sans' }], ['Hall', b.hall, { f: 'sans' }], ['Families', b.fams.map(f => HUB.info.FAMILIES[f].name.replace(/ oils?$/, '')).join(', '), { f: 'sans', wrap: true }], ['Classes', b.segs.join(' · ')], ['State', blenderState(b), { f: 'sans' }],
      b.stepUntil && bt ? ['Step ends', TM(b.stepUntil)] : null, b.fault ? ['Back in service', TM(b.fault.until)] : null, b.pm ? ['Maintenance until', TM(b.pm.until)] : null, b.last ? ['Last grade', shortOf(b.last), { f: 'sans' }] : null, ['Busy today', HRS(b.busyMin)]]),
    bt ? sub('Batch on the blender', itemRow({ key: bt.id, id: bt.id.slice(-4), label: `${(GRD(bt.code) || {}).label || bt.code} · ${T0(bt.t, 1)}`, right: bt.step, tone: blenderTone(b), onClick: () => A.sel('batch', bt.id) }), bar(batchProg(bt), 'var(--acc)', 6)) : null,
    recent.length ? sub('Recent batches', ...recent.map(x => itemRow({ key: x.id, id: x.id.slice(-4), label: `${shortOf(x.code)} · ${T0(x.t, 1)}`, right: x.state === 'QC hold' ? 'Awaiting release' : x.state, tone: batchTone(x), onClick: () => A.sel('batch', x.id) }))) : null,
  ];
}
function dGunit(u) {
  const bt = u.batch;
  return [
    dl([['Kind', `${u.kind} · ${u.size} t`, { f: 'sans' }], ['State', unitState(u), { f: 'sans' }], u.stepUntil ? ['Step ends', TM(u.stepUntil)] : null, u.fault ? ['Back in service', TM(u.fault.until)] : null]),
    bt ? sub('Batch', itemRow({ key: bt.id, id: bt.id.slice(-4), label: `${(GRD(bt.code) || {}).label || bt.code} · ${T0(bt.t, 1)}`, right: u.step, tone: 'run', onClick: () => A.sel('batch', bt.id) })) : null,
    bt && u.steps ? sub('Steps', steps(u.steps, u.si, u.since)) : null,
  ];
}
function dHopper(hp) {
  const bt = hp.batch ? S.batches.find(x => x.id === hp.batch) : null;
  return [dl([['Grease', hp.code ? link((GRD(hp.code) || {}).label || hp.code, () => A.sel('grade', hp.code)) : 'Empty', { f: 'sans' }], ['Contents', `${D.fmt(hp.t, 2)} of ${hp.size} t`], ['Quality', hp.q, { f: 'sans' }], ['Batch', hp.batch ? (bt ? link(hp.batch.replace('BLD-MLB-', ''), () => A.sel('batch', bt.id)) : hp.batch.replace('BLD-MLB-', '')) : null, { f: 'sans' }], hp.relAt ? ['Released', TM(hp.relAt)] : null, ['Feeds', 'PL-16 cartridges · PL-17 tubs · PL-18 pails · DL-14 drums', { f: 'sans', wrap: true }]]), bar(hp.t / hp.size, hp.code ? famColor(hp.code) : 'var(--ink3)', 8)];
}
function dLine(l) {
  const w = l.wo, o = l.oee24, os = l.oeeShift, wos = S.wos.filter(x => x.line === l.id).slice(0, 6);
  return [
    dl([['Hall', HUB.info.HALLS[l.hall], { f: 'sans' }], ['Format', FMT_LABEL[l.fmt] || l.fmt, { f: 'sans' }], ['Rated speed', `${D.fmt(l.rate)} units/h`], ['Families', l.fams.map(f => HUB.info.FAMILIES[f].name.replace(/ oils?$/, '')).join(', '), { f: 'sans', wrap: true }],
      ['State', l.state, { f: 'sans', color: TINK[lineTone(l)] === 'var(--ink3)' ? 'var(--ink)' : TINK[lineTone(l)] }], ['Since', `${TM(l.since)} · ${D.dur(D.NOW - l.since)}`], l.until ? ['Expected back', TM(l.until)] : null]),
    w ? sub('Work order', dl([['Order', w.id], ['Grade', link(w.label, () => A.sel('grade', w.code)), { f: 'sans' }], ['Pack', w.packLabel, { f: 'sans' }], ['Units', `${D.fmt(w.done)} of ${D.fmt(w.units)} · ${D.fmt(w.good)} good`], ['Started', TM(w.start)], ['Expected done', TM(w.eta)], w.camp ? ['Source', 'Low-runner campaign', { f: 'sans' }] : null]), bar(w.done / Math.max(1, w.units), 'var(--acc)', 7)) : null,
    sub('Performance', grid(110, [kpi('OEE 24 h', PCT(o.oee)), kpi('Availability', PCT(o.a)), kpi('Performance', PCT(o.p)), kpi('Quality', PCT(o.q, 1)), kpi('OEE this shift', PCT(os.oee)), kpi('Units today', D.fmt(l.unitsToday))], 6), dl([['Tonnes today', T0(l.tToday, 1)], ['Changeovers today', HRS(l.coToday)], ['Standard OEE', PCT(l.oee)]])),
    wos.length ? sub('Recent work orders', ...wos.map(x => itemRow({ key: x.id, id: x.id.slice(-4), label: `${shortOf(x.code)} · ${x.packLabel} · ${D.fmt(x.done)}/${D.fmt(x.units)}`, right: x.state, tone: x.state === 'Running' ? 'run' : x.state === 'Done' ? 'ok' : 'warn', onClick: () => A.sel('grade', x.code) }))) : null,
  ];
}
function dSample(x) {
  return [
    dl([['Type', x.type, { f: 'sans' }], ['Product', GRD(x.code) ? link(GRD(x.code).label, () => A.sel('grade', x.code)) : shortOf(x.code), { f: 'sans' }], ['Batch / source', String(x.batch || '—').replace('BLD-MLB-', ''), { f: 'sans' }], ['Sampled from', x.src, { f: 'sans' }], ['Taken by', x.by, { f: 'sans' }],
      ['Taken', TM(x.at)], x.start ? ['Testing started', TM(x.start)] : null, x.done ? ['Result', TM(x.done)] : x.due ? ['Result due', TM(x.due)] : null, ['Status', x.status, { f: 'sans', color: x.status === 'Failed' ? 'var(--critInk)' : 'var(--ink)' }], x.done ? ['Turnaround', D.dur(x.done - x.at)] : null]),
    x.tests && x.tests.length ? sub('Results', table([
      { label: 'Property', w: 'minmax(130px,2fr)', f: r => r.prop },
      { label: 'Spec', w: 'minmax(70px,1fr)', f: r => r.spec || '—', mono: true },
      { label: 'Result', w: '74px', f: r => r.result, mono: true, align: 'right', color: r => r.status === 'Failed' ? 'var(--critInk)' : 'var(--ink)' },
    ], x.tests, { key: r => r.prop })) : x.status === 'Retained' ? empty('Retain sample stored for 12 months; no tests run.') : empty('Results appear here when the tests finish.'),
    div({ display: 'flex', gap: 8, flexWrap: 'wrap' }, btn('Open in Quality', () => A.go('quality', { terminalId: 'MLB' }))),
  ];
}
function dTruck(x) {
  return [dl([['Plate', x.plate], ['Haulier', x.carrier, { f: 'sans' }], ['Type', truckType(x), { f: 'sans' }], ['Cargo', cargoOf(x), { f: 'sans', wrap: true }], ['State', x.state, { f: 'sans' }], x.bay ? ['Bay', link(x.bay, () => A.sel('bay', x.bay)), { f: 'sans' }] : null,
    ['Arrived', TM(x.arr)], x.gin ? ['Gate-in', TM(x.gin)] : null, x.bayAt ? ['At bay since', TM(x.bayAt)] : null, x.until && x.state !== 'Gone' ? ['Next step', TM(x.until)] : null, ['On site', D.dur((x.gout || D.NOW) - x.arr)], x.note ? ['Note', x.note, { f: 'sans', wrap: true, color: 'var(--warnInk)' }] : null])];
}
function dBay(b) {
  const x = b.truck ? S.trucks.find(y => y.id === b.truck) : null;
  return [dl([['Class', HUB.info.BAY_CLASSES[b.cls], { f: 'sans' }], ['State', b.fault ? 'Blocked · breakdown' : b.state, { f: 'sans' }], ['Since', TM(b.since)], b.until ? ['Expected free', TM(b.until)] : null, b.state !== 'Free' ? ['Progress', PCT(b.pct)] : null, b.fault ? ['Clear by', TM(b.fault.until)] : null]),
    x ? sub('Truck', itemRow({ key: x.id, id: x.plate, label: cargoOf(x), right: x.state, tone: truckTone(x), onClick: () => A.sel('truck', x.id) })) : null,
    b.box ? sub('Container', itemRow({ key: b.box.id, id: b.box.size, label: `${b.box.id} · ${b.box.pallets} pallets`, right: `ready ${hh(b.box.until)}`, tone: 'run', onClick: () => A.sel('box', b.box.id) })) : null];
}
function dBox(x) { return [dl([['Size', x.size], ['For', ({ JKT: 'Jakarta liner · Cikarang dry port', SUB: 'Surabaya liner', FDR: 'Container feeder' })[x.dest] || x.dest, { f: 'sans' }], ['Stuffing bay', x.bay], ['Pallets', String(x.pallets)], ['Weight', T0(x.t, 1)], ['Started', TM(x.start)], x.staged ? ['Staged', TM(x.staged)] : ['Ready', TM(x.until)], ['Cut-off', TM(x.cutoff)], ['State', x.state, { f: 'sans' }]])]; }
function dCrane(c) {
  const x = c.iso, k2 = c.src ? findTank(c.src) : c.dst ? findTank(c.dst) : null;
  return [dl([['Bay', `${c.bay} · ${c.role}`, { f: 'sans', wrap: true }], ['State', c.fault ? 'Fault' : c.step || 'Free', { f: 'sans' }], c.until && x ? ['Step ends', TM(c.until)] : null, x ? ['ISO tank', link(x.id, () => A.sel('iso', x.id)), { f: 'sans' }] : null, x ? ['Operation', c.op === 'fill' ? 'Fill from tank' : 'Discharge to tank', { f: 'sans' }] : null,
    k2 && x ? [c.op === 'fill' ? 'From tank' : 'To tank', link(k2.id, () => A.sel('tank', k2.id)), { f: 'sans' }] : null, x ? ['Product', shortOf(x.code), { f: 'sans' }] : null, x ? ['In the tank', T0(x.t, 1) + (c.op === 'fill' && c.target ? ` of ${D.fmt(c.target, 1)}` : '')] : null, x && c.rate ? ['Rate', `${D.fmt(c.rate)} kL/h`] : null, ['Moves today', D.fmt(c.movesToday)], c.fault ? ['Back in service', TM(c.fault.until)] : null])];
}
function dIso(x) {
  const cat = ISO_CAT[x.cat] || [x.cat];
  return [dl([['Category', cat[0], { f: 'sans' }], ['Tank type', `${x.type || 'T11'} · IMO portable tank`, { f: 'sans' }], ['Owner code', x.own], ['Product', x.code ? (GRD(x.code) ? link(GRD(x.code).label, () => A.sel('grade', x.code)) : shortOf(x.code)) : '—', { f: 'sans' }], ['Contents', x.t ? T0(x.t, 1) : 'Empty'], ['Location', x.loc || '—'], x.heat ? ['Heating until', TM(x.heatUntil)] : null, x.tempC ? ['Temperature', `${x.tempC} °C`] : null,
    ['Arrived', TM(x.arrived)], ['Mode', ({ road: 'Road', rail: 'Rail', sea: 'Feeder' })[x.mode] || x.mode, { f: 'sans' }], x.due ? ['Due out', TM(x.due)] : null, x.cat === 'IF' ? ['Receipt test', x.qcOK ? 'Passed' : 'In the lab', { f: 'sans' }] : null, x.repairUntil ? ['Repair until', TM(x.repairUntil)] : null, x.order ? ['Fill order', x.order] : null])];
}
function dTrain(t) {
  return [dl([['Service', t.name, { f: 'sans', wrap: true }], ['Scheduled', TM(t.sched)], ['Expected', TM(t.eta), { color: t.eta - t.sched > 120 ? 'var(--warnInk)' : 'var(--ink)' }], t.ata ? ['Arrived', TM(t.ata)] : null, t.atd ? ['Departed', TM(t.atd)] : null, ['State', t.state, { f: 'sans' }], ['Step', t.step, { f: 'sans', wrap: true }], ['Track', t.track || '—'], ['Wagons', String(t.wagons)],
    ['Crane moves', t.moves ? `${Math.round(t.done)} of ${t.moves}` : 'Planned at arrival'], ['Boxes in · out (plan)', `${t.inPlan} · ${t.outPlan}`], t.outT ? ['Shipped', T0(t.outT)] : null]), t.moves ? bar(t.done / t.moves, 'var(--acc)', 7) : null];
}
function dGrade(G) {
  const st = HUB.gradeStock(G.code), wh = HUB.whOf(G.code), F = HUB.info.FAMILIES[G.P.fam];
  const segName = { MIN: 'Mineral', SYN: 'Synthetic', CLEAN: 'Clean (turbine, ashless)', FG: 'Food grade H1', PAG: 'PAG', GRS: 'Grease' }[G.P.seg] || G.P.seg;
  const tanks = st.tanks.map(findTank).filter(Boolean);
  return [
    dl([['Product', G.P.name, { f: 'sans', wrap: true }], ['Grade', G.grade, { f: 'sans' }], ['Family', F.name, { f: 'sans' }], ['Class', segName, { f: 'sans' }], ['Blend route', G.P.route, { f: 'sans' }], ['Packs', G.P.packs.map(p => (HUB.info.PACKS[p] || [p])[0]).join(', '), { f: 'sans', wrap: true }], ['Density', `${D.fmt(G.dens)} kg/m³`], ['Demand', `${D.fmt(G.d, 1)} t/d`], ['Storage', G.runner ? `Dedicated tank${G.tanks.length > 1 ? 's' : ''}` : G.P.fam === 'GR' ? 'Grease hoppers' : 'Swing tanks by campaign', { f: 'sans' }]]),
    sub('Stock', dl([G.P.fam !== 'GR' ? ['Released in tanks', T0(st.rel, 1)] : null, st.qc ? ['In quality hold', T0(st.qc, 1)] : null, st.wip ? ['Being blended', T0(st.wip, 1)] : null, ['In the warehouse', T0(st.wh, 1)], ['Cover', st.cover == null ? '—' : DAYS(st.cover), { color: st.cover != null && st.cover < 1.5 ? 'var(--critInk)' : 'var(--ink)' }]])),
    tanks.length ? sub('Tanks', ...tanks.map(t => itemRow({ key: t.id, id: t.id, label: `${KL(t.vol)} · ${PCT(t.vol / t.nominal)}`, right: t.state === 'QC hold' ? 'Quality hold' : t.status, tone: t.state === 'QC hold' || t.q === 'On hold' ? 'warn' : tone(t.status), onClick: () => A.sel('tank', t.id) }))) : null,
    wh.length ? sub('Warehouse by pack', table([{ label: 'Pack', w: 'minmax(100px,1.6fr)', f: r => r.label }, { label: 'Units', w: '80px', f: r => D.fmt(r.units), mono: true, align: 'right' }, { label: 'Pallets', w: '66px', f: r => D.fmt(r.pallets, 1), mono: true, align: 'right' }, { label: 'Cover', w: '60px', f: r => DAYS(r.days), mono: true, align: 'right' }], wh, { key: r => r.pack })) : null,
    sub('Recipe, % m/m', table([{ label: 'Component', w: 'minmax(130px,2fr)', f: ([c]) => [sw((HUB.info.COMP[c] || {}).color || 'var(--ink3)', true), span({ ...ell }, (HUB.info.COMP[c] || {}).label || c)] }, { label: '%', w: '60px', f: ([, p]) => D.fmt(p, p < 1 ? 2 : 1), mono: true, align: 'right' }], G.recipe, { key: r => r[0] }), note('Treat rates and thickener contents are planning assumptions, not product disclosures.')),
  ];
}
function zoneBody(id) {
  const K = S.kpi, open = (tab, extra) => ctx.embed ? null : btn(`Open ${TABS.find(t => t[0] === tab)[1]}`, () => A.tab(tab, extra), { primary: true });
  const tankRows = list => list.map(t => itemRow({ key: t.id, id: t.id, label: `${t.free ? 'Free' : shortOf(t.code)} · ${PCT(t.vol / t.nominal)}`, right: t.free ? 'Clean' : t.state === 'QC hold' ? 'Quality hold' : t.status, tone: t.free ? 'idle' : t.state === 'QC hold' || t.q === 'On hold' ? 'warn' : tone(t.status), on: isSel('tank', t.id), onClick: () => A.sel('tank', t.id) }));
  switch (id) {
    case 'marine': return [dl([['Berths in use', `${K.berths.busy} of 9`], ['At anchorage', String(K.berths.anchorage)], ['Due in 72 h', String(K.berths.expected72)], ['Received by sea today', T0(K.rec.sea)], ['Loaded today', T0(S.today.sea)]]),
      sub('Jetties', ...S.jetties.map(j => { const v = j.vessel ? S.vessels.find(x => x.id === j.vessel) : null; return itemRow({ key: j.id, id: j.id, label: v ? v.name : j.role, right: v ? (v.pause ? 'Paused' : v.state) : 'Free', tone: v ? (v.pause ? 'warn' : 'run') : 'idle', on: v && isSel('vessel', v.id), onClick: () => v ? A.sel('vessel', v.id) : A.tab('marine') }); })), open('marine')];
    case 'bot': return [dl(K.base.map(b => [b.label, `${T0(b.t)} · ${DAYS(b.days)}`, { color: covInk(b.days) }])), sub('Tanks', ...tankRows(S._tanks.BOT)), open('tanks', { tv: 'bot' })];
    case 'add': return [dl(K.add.map(b => [HUB.info.COMP[b.code].label, `${T0(b.t)} · ${DAYS(b.days)}`, { color: covInk(b.days) }])), sub('Tanks', ...tankRows(S._tanks.ADD)), open('tanks', { tv: 'add' })];
    case 'fpt': { const fp = S._tanks.FPT, by = {}; fp.forEach(t => { const x = t.free ? 'Free' : t.state; by[x] = (by[x] || 0) + 1; }); return [dl([['Released stock', `${T0(K.fin.rel)} · ${DAYS(K.fin.days)}`], ['In quality hold', T0(K.fin.qc)], ...Object.entries(by).map(([x, n]) => [x, String(n)])]), sub('Being filled or tested', ...tankRows(fp.filter(t => t.fill || t.state === 'QC hold' || t.state === 'Blending' || t.state === 'Adjusting'))), open('tanks', { tv: 'fpt' })]; }
    case 'blend': return [dl([['Blended today', T0(K.blend.t)], ['Busy', `${K.blend.inProcess} of 23`], ['Right first time', K.blend.rft == null ? '—' : PCT(K.blend.rft, 1)]]), sub('Blenders', ...S.blenders.map(b => itemRow({ key: b.id, id: b.id, label: b.batch ? `${shortOf(b.batch.code)} · ${T0(b.batch.t, 1)}` : sizeOf(b), right: blenderState(b), tone: blenderTone(b), on: isSel('blender', b.id), onClick: () => A.sel('blender', b.id) }))), open('blend')];
    case 'grease': return [dl([['Made today', T0(K.grease.t, 1)], ['Units busy', String(K.grease.inProcess)], ['In hoppers', T0(K.grease.hoppers, 1)]]), sub('Units', ...S.grease.units.map(u => itemRow({ key: u.id, id: u.id, label: u.batch ? shortOf(u.batch.code) : u.kind, right: unitState(u), tone: unitTone(u), onClick: () => A.sel('gunit', u.id) }))), sub('Hoppers', ...S.grease.hoppers.map(hp => itemRow({ key: hp.id, id: hp.id, label: hp.code ? `${shortOf(hp.code)} · ${D.fmt(hp.t, 1)} t` : 'Empty', right: hp.q, tone: !hp.code ? 'idle' : hp.q === 'Released' ? 'ok' : 'warn', onClick: () => A.sel('hopper', hp.id) }))), open('blend')];
    case 'lab': return [dl([['Queued', String(K.lab.queue)], ['In test', `${K.lab.inTest} of ${S.lab.cap}`], ['Completed today', String(K.lab.done || 0)], ['Turnaround', `${HRS(K.lab.tatAvg)} · P90 ${HRS(K.lab.tatP90)}`], ['Right first time', K.blend.rft == null ? '—' : PCT(K.blend.rft, 1)]]), sub('Instruments', div({ display: 'flex', gap: 6, flexWrap: 'wrap' }, ...S.lab.instruments.map(x => chip(`${x.label} ${x.n - x.down}/${x.n}`, x.down ? 'warn' : 'ok')))), open('lab')];
    case 'util': { const U_ = S.utilities; return [dl([['Steam demand', `${U_.steam.demand.toFixed(1)} of ${U_.steam.cap} t/h`], ...U_.steam.boilers.map(b => [b.id, `${b.state}${b.load ? ' · ' + b.load + ' t/h' : ''}`, { f: 'sans', color: b.state === 'Trip' ? 'var(--critInk)' : 'var(--ink)' }]), ['Power', `${U_.power.mw.toFixed(1)} MW · ${U_.power.source}`, { f: 'sans' }], ['Nitrogen', `${U_.n2.nm3h} Nm³/h`], ['Instrument air', `${U_.air.bar} bar`], ['Thermal oil', `${U_.thermal.mw} MW`], ['Weather', `${S.weather.text} · ${S.weather.tempC} °C · wind ${S.weather.wind} km/h`, { f: 'sans', wrap: true }]])]; }
    case 'fill': return [dl([['Packed today', T0(K.out.pkg)], ['Units today', D.fmt(S.today.units)], ['Running', `${K.lines.running} of 34`], ['OEE 24 h', `P ${PCT(K.lines.hall.P)} · D ${PCT(K.lines.hall.D)} · G ${PCT(K.lines.hall.G)}`]]), sub('Lines', ...S.lines.map(l => itemRow({ key: l.id, id: l.id, label: l.wo ? `${shortOf(l.wo.code)} · ${l.wo.packLabel}` : FMT_LABEL[l.fmt], right: l.state, tone: lineTone(l), on: isSel('line', l.id), onClick: () => A.sel('line', l.id) }))), open('fill')];
    case 'wh': case 'docks': case 'gate': return [dl([['High-bay store', `${PCT(K.wh.hbw)} · ${D.fmt(S.warehouse.hbw.occ)} pallets`], ['Drum & IBC store', `${PCT(K.wh.drm)} · ${D.fmt(S.warehouse.drm.occ)} pallets`], ['Docks in use', `${K.docks.PKG || 0} of 64`], ['Gate queue', `${S.gate.queue} trucks`], ['On site', `${S.gate.onSite} trucks`], ['Park', `${S.gate.park.occ} of 220`], ['Packaged turnaround', K.ta.PKG ? `${HRS(K.ta.PKG.avg)} · P90 ${HRS(K.ta.PKG.p90)}` : '—']]), open('wh')];
    case 'bulk': return [sub('Bays in use', ...S.bays.filter(b => (b.cls === 'BLK' || b.cls === 'UNL' || b.cls === 'MAT') && b.state !== 'Free').map(b => { const x = S.trucks.find(y => y.id === b.truck); return itemRow({ key: b.id, id: b.id, label: x ? cargoOf(x) : b.state, right: x ? x.plate : '', tone: b.fault ? 'crit' : 'run', onClick: () => A.sel('bay', b.id) }); })), open('wh')];
    case 'iso': return [dl([['In the yard', `${S.iso.occ} of 250`], ['Fleet', 'SJIU · T11 portable tanks', { f: 'sans' }], ...Object.entries(S.iso.byCat).map(([c, n]) => [ISO_CAT[c][0], String(n)]), ['Heating points', `${S.iso.heatUsed} of 30`], ['Fills · discharges today', `${K.iso.fills} · ${K.iso.disch}`]]), sub('Crane positions', ...S.isoCranes.map(c => itemRow({ key: c.id, id: c.id, label: c.iso ? `${c.op === 'fill' ? 'Fill' : 'Discharge'} ${shortOf(c.iso.code)}` : c.role, right: c.fault ? 'Fault' : c.step || 'Free', tone: craneTone(c), on: isSel('crane', c.id), onClick: () => A.sel('crane', c.id) }))), open('iso')];
    case 'stuff': return [dl([['Stuffed today', String(K.stuffing.boxes)], ['In work', `${K.stuffing.inWork} of 28`], ['Dry empties', String(S.rail.icy.dryEmpty)]]), sub('Bays', ...S.bays.filter(b => b.cls === 'STF' && b.box).map(b => itemRow({ key: b.id, id: b.id, label: `${b.box.size} for ${({ JKT: 'Jakarta', SUB: 'Surabaya', FDR: 'feeder' })[b.box.dest]}`, right: `${Math.round(b.pct * 100)} %`, tone: 'run', onClick: () => A.sel('box', b.box.id) }))), open('wh')];
    case 'rail': return [dl([['Moves today', D.fmt(K.rail.movesToday)], ['Moves now', `${D.fmt(K.rail.movesHour)} per hour`], ['Container yard', `${S.rail.icy.teu} of ${S.rail.icy.cap} TEU`]]), sub('Trains', ...S.trains.filter(t => t.state !== 'Departed' && t.state !== 'Cancelled').sort((a, b) => a.eta - b.eta).slice(0, 6).map(t => itemRow({ key: t.id, id: t.id, label: t.name, right: t.state === 'Expected' ? hh(t.eta) : t.state, tone: t.state === 'Working' ? 'run' : 'idle', on: isSel('train', t.id), onClick: () => A.sel('train', t.id) }))), sub('Rail cranes', ...S.rail.cranes.map(c => itemRow({ key: c.id, id: c.id, label: c.train ? `On ${c.train}` : 'Rail-mounted gantry', right: c.fault ? 'Fault' : c.state, tone: c.fault ? 'crit' : c.state === 'Working' ? 'run' : 'idle', onClick: () => A.sel('rmg', c.id) }))), open('iso')];
    default: return [empty('No details for this zone.')];
  }
}
// ── equipment without a tab of its own ──
const para = t => h('p', { style: { margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink3)' } }, t);
const openTab = (tab, extra) => ctx.embed ? null : btn(`Open ${TABS.find(t => t[0] === tab)[1]}`, () => A.tab(tab, extra), { primary: true });
const YARD_BLOCKS = ['Y-A', 'Y-B', 'Y-C', 'Y-D', 'Y-E'];
const slotName = n => { const i = n % 50; return `${YARD_BLOCKS[Math.floor(n / 50)]}-${String((i >> 1) + 1).padStart(2, '0')}-${(i % 2) + 1}`; };
function dSc(c) {
  const W = S.warehouse, up = W.cranes.filter(x => !x.fault).length;
  return [dl([['State', c.fault ? 'Fault · out of service' : 'In service', { f: 'sans', color: c.fault ? 'var(--critInk)' : 'var(--ink)' }], c.fault ? ['Back in service', TM(c.fault.until)] : null, ['Store', 'High-bay · small packs and pails', { f: 'sans' }], ['Store fill', `${PCT(S.kpi.wh.hbw)} · ${D.fmt(W.hbw.occ)} pallets`], ['Cranes in service', `${up} of ${W.cranes.length}`], ['Pallets stored today', D.fmt(S.today.palIn)], ['Pallets picked today', D.fmt(S.today.palOut)]]),
    para('Each aisle of the high-bay store has one stacker crane. With three or more cranes down, the packaging lines that feed the store stop.'), openTab('wh')];
}
function dWash(w) {
  const x = w.iso, wait = S.isos.filter(y => y.cat === 'ED' && y.slot >= 0).length;
  return [dl([['State', x ? 'Washing' : 'Free', { f: 'sans' }], x ? ['ISO tank', link(x.id, () => A.sel('iso', x.id)), { f: 'sans' }] : null, x && x.code ? ['Last product', shortOf(x.code), { f: 'sans' }] : null, x ? ['Clean by', TM(w.until)] : null, ['Dirty empties waiting', String(wait)], ['Wash bays busy', `${S.iso.wash.filter(y => y.iso).length} of ${S.iso.wash.length}`]]),
    para('Hot-water and steam wash with a detergent rinse. A washed tank returns to the yard as a clean empty, ready for the next fill.'), openTab('iso')];
}
function dJetty(j) {
  const v = j.vessel ? S.vessels.find(x => x.id === j.vessel) : null, VC_ = HUB.info.VCLS;
  const next = S.vessels.filter(x => (x.state === 'Expected' || x.state === 'At anchorage') && j.cls.includes(x.cls)).sort((a, b) => a.eta - b.eta).slice(0, 4);
  return [dl([['Berth', j.name, { f: 'sans' }], ['Role', j.role, { f: 'sans', wrap: true }], ['Max LOA', `${j.loa} m`], ['Draft', `${j.draft} m`], ['Equipment', j.kit, { f: 'sans', wrap: true }], ['Takes', j.cls.map(c => VC_[c].label).join(', '), { f: 'sans', wrap: true }], ['State', j.closed ? 'Closed' : v ? (v.pause ? 'Paused' : v.state) : 'Free', { f: 'sans' }]]),
    v ? sub('Alongside', itemRow({ key: v.id, id: v.cls, label: v.name, right: v.pause ? 'Paused' : v.state, tone: v.pause ? 'warn' : 'run', onClick: () => A.sel('vessel', v.id) })) : null,
    next.length ? sub('Next ships that can use this berth', ...next.map(x => itemRow({ key: x.id, id: x.cls, label: x.name, right: x.state === 'At anchorage' ? 'At anchorage' : TM(x.eta), tone: x.state === 'At anchorage' ? 'warn' : 'idle', onClick: () => A.sel('vessel', x.id) }))) : null,
    openTab('marine')];
}
function dTrack(tk) {
  const tr = tk.train ? S.trains.find(t => t.id === tk.train) : null, next = S.trains.filter(t => t.state === 'Expected').sort((a, b) => a.eta - b.eta).slice(0, 4);
  return [dl([['Track', tk.role, { f: 'sans' }], ['State', tr ? 'Occupied' : 'Free', { f: 'sans' }], ['Rail cranes working', `${S.rail.cranes.filter(c => c.state === 'Working').length} of ${S.rail.cranes.length}`]]),
    tr ? sub('On the track', itemRow({ key: tr.id, id: tr.service, label: `${tr.id} · ${tr.name}`, right: tr.state, tone: 'run', onClick: () => A.sel('train', tr.id) })) : null,
    next.length ? sub('Next trains', ...next.map(t => itemRow({ key: t.id, id: t.service, label: `${t.id} · ${t.name}`, right: hh(t.eta), tone: 'idle', onClick: () => A.sel('train', t.id) }))) : null,
    openTab('iso')];
}
function dSlot(n) {
  const i = n % 50, heat = n >= 150 && n < 180, x = S.isos.find(y => y.slot === n);
  return [dl([['Block', YARD_BLOCKS[Math.floor(n / 50)]], ['Row · tier', `${(i >> 1) + 1} · ${(i % 2) + 1}`], ['Steam heating point', heat ? 'Yes' : 'No', { f: 'sans' }], ['State', x ? 'Occupied' : 'Free', { f: 'sans' }], ['Yard', `${S.iso.occ} of 250 slots in use`]]),
    x ? sub('ISO tank in this slot', itemRow({ key: x.id, id: x.cat, label: x.id, right: x.code ? shortOf(x.code) : '', tone: 'run', onClick: () => A.sel('iso', x.id) })) : null, openTab('iso')];
}
const GAUX_NOTE = { Homogeniser: 'Mills finished grease on its way to a holding hopper. With both homogenisers down, the kettles wait.', Deaerator: 'Draws entrained air out of the grease before it is filled.', 'Thermal-oil heater': 'Heats the contactors and kettles of the grease plant.' };
function dGaux(x) {
  return [dl([['Equipment', x.kind, { f: 'sans' }], ['State', x.fault ? 'Fault' : x.state, { f: 'sans', color: x.fault ? 'var(--critInk)' : 'var(--ink)' }], x.fault ? ['Back in service', TM(x.fault.until)] : null, ['Grease units busy', String(S.kpi.grease.inProcess)], ['Made today', T0(S.kpi.grease.t, 1)]]),
    GAUX_NOTE[x.kind] ? para(GAUX_NOTE[x.kind]) : null, openTab('blend')];
}
function dInstr(x) {
  return [dl([['Units in service', `${x.n - x.down} of ${x.n}`], x.down ? ['Back in service', TM(x.until)] : null, ['Lab queue', `${S.kpi.lab.queue} samples`], ['In test', `${S.kpi.lab.inTest} of ${S.lab.cap}`], ['Turnaround', `${HRS(S.kpi.lab.tatAvg)} · P90 ${HRS(S.kpi.lab.tatP90)}`]]),
    para('Tests that need this instrument wait while units are out of service.'), openTab('lab')];
}
function findSel(sel) {
  const id = sel.id;
  switch (sel.kind) {
    case 'vessel': return S.vessels.find(x => x.id === id);
    case 'tank': return findTank(id);
    case 'blender': return S.blenders.find(x => x.id === id);
    case 'gunit': return S.grease.units.find(x => x.id === id);
    case 'hopper': return S.grease.hoppers.find(x => x.id === id);
    case 'batch': return S.batches.find(x => x.id === id);
    case 'line': return S.lines.find(x => x.id === id);
    case 'blow': return S.blow.find(x => x.id === id);
    case 'sample': return S.samples.find(x => x.id === id);
    case 'truck': return S.trucks.find(x => x.id === id);
    case 'bay': return S.bays.find(x => x.id === id);
    case 'box': return S.boxes.find(x => x.id === id);
    case 'crane': return S.isoCranes.find(x => x.id === id);
    case 'iso': return S.isos.find(x => x.id === id) || S.isoCranes.map(c => c.iso).find(x => x && x.id === id) || S.iso.wash.map(w => w.iso).find(x => x && x.id === id);
    case 'train': return S.trains.find(x => x.id === id);
    case 'rmg': return S.rail.cranes.find(x => x.id === id);
    case 'grade': return GRD(id);
    case 'sc': return S.warehouse.cranes.find(x => x.id === id);
    case 'wash': return S.iso.wash.find(x => x.id === id);
    case 'jetty': return S.jetties.find(x => x.id === id);
    case 'track': return S.rail.tracks.find(x => x.id === id);
    case 'slot': { const n = +id; return Number.isInteger(n) && n >= 0 && n < 250 ? { id: n } : null; }
    case 'gaux': return S.grease.aux.find(x => x.id === id);
    case 'instr': return S.lab.instruments.find(x => x.id === id);
    default: return null;
  }
}
// the drawer's content: kicker, title, subtitle, tone and body of the selected asset or zone
function parts() {
  const sel = ST.sel, zone = !sel && ST.zone;
  if (!sel && !zone) return null;
  let kicker, title, subT = null, body, t = 'idle';
  if (sel) {
    const o = findSel(sel);
    kicker = KIND[sel.kind] || 'Detail';
    if (!o) { title = sel.id; body = [empty(sel.kind === 'truck' ? 'This truck has left the site.' : sel.kind === 'iso' ? 'This ISO tank has left the site.' : sel.kind === 'sample' ? 'This sample is no longer in the recent list.' : 'This item is no longer on site.')]; }
    else switch (sel.kind) {
      case 'vessel': title = o.name; subT = o.label; t = o.pause ? 'warn' : tone(o.state); body = dVessel(o); break;
      case 'tank': title = o.id; subT = o.free ? 'Free swing tank' : (GRD(o.code) || HUB.info.COMP[o.code] || { label: shortOf(o.code) }).label; t = o.free ? 'idle' : o.state === 'QC hold' || o.q === 'On hold' ? 'warn' : tone(o.status); body = dTank(o); break;
      case 'blender': title = o.id; subT = sizeOf(o); t = blenderTone(o); body = dBlender(o); break;
      case 'gunit': title = o.id; subT = o.kind; t = unitTone(o); body = dGunit(o); break;
      case 'hopper': title = o.id; subT = 'Grease hopper · 15 t'; t = !o.code ? 'idle' : o.q === 'Released' ? 'ok' : 'warn'; body = dHopper(o); break;
      case 'batch': title = o.id.replace('BLD-MLB-', ''); subT = (GRD(o.code) || {}).label || o.code; t = batchTone(o); body = dBatch(o); break;
      case 'line': title = o.id; subT = `${HUB.info.HALLS[o.hall]} · ${FMT_LABEL[o.fmt]}`; t = lineTone(o); body = dLine(o); break;
      case 'blow': title = o.id; subT = o.makes === 'bottles' ? '1 L bottle blow moulder' : '4/5 L can blow moulder'; t = o.fault ? 'crit' : o.state === 'Running' ? 'run' : 'warn'; body = [dl([['State', o.fault ? 'Fault' : o.state, { f: 'sans' }], ['Rate', `${D.fmt(o.rate)} per hour`], ['Buffer', `${D.fmt(S.materials[o.makes].stock)} pcs · ${HRS(S.materials[o.makes].coverH * 60)}`], o.fault ? ['Back in production', TM(o.fault.until)] : null])]; break;
      case 'sample': title = o.id.replace('S-MLB-', ''); subT = `${o.type} · ${shortOf(o.code)}`; t = smpTone(o); body = dSample(o); break;
      case 'truck': title = o.plate; subT = `${truckType(o)} · ${o.carrier}`; t = truckTone(o); body = dTruck(o); break;
      case 'bay': title = o.id; subT = HUB.info.BAY_CLASSES[o.cls]; t = o.fault ? 'crit' : o.state === 'Free' ? 'idle' : 'run'; body = dBay(o); break;
      case 'box': title = o.id; subT = `${o.size} container`; t = o.state === 'Staged' ? 'ok' : 'run'; body = dBox(o); break;
      case 'crane': title = o.id; subT = `ISO station bay ${o.bay}`; t = craneTone(o); body = dCrane(o); break;
      case 'iso': title = o.id; subT = (ISO_CAT[o.cat] || [o.cat])[0]; t = o.cat === 'RP' ? 'warn' : 'idle'; body = dIso(o); break;
      case 'train': title = o.id; subT = o.name; t = o.state === 'Working' ? 'run' : tone(o.state); body = dTrain(o); break;
      case 'rmg': title = o.id; subT = 'Rail-mounted gantry crane'; t = o.fault ? 'crit' : o.state === 'Working' ? 'run' : 'idle'; body = [dl([['State', o.fault ? 'Fault' : o.state, { f: 'sans' }], ['Train', o.train || '—'], ['Moves today', D.fmt(o.movesToday)]])]; break;
      case 'grade': title = o.short; subT = o.label; body = dGrade(o); break;
      case 'sc': title = o.id; subT = 'Stacker crane · high-bay store'; t = o.fault ? 'crit' : 'run'; body = dSc(o); break;
      case 'wash': title = o.id; subT = 'ISO tank wash bay'; t = o.iso ? 'run' : 'idle'; body = dWash(o); break;
      case 'jetty': title = o.id; subT = `${o.name} · ${o.role}`; t = o.closed ? 'warn' : o.vessel ? 'run' : 'idle'; body = dJetty(o); break;
      case 'track': title = o.id; subT = o.role; t = o.train ? 'run' : 'idle'; body = dTrack(o); break;
      case 'slot': title = slotName(o.id); subT = `ISO yard slot${o.id >= 150 && o.id < 180 ? ' · steam heating point' : ''}`; t = S.isos.some(y => y.slot === o.id) ? 'run' : 'idle'; body = dSlot(o.id); break;
      case 'gaux': title = o.id; subT = o.kind; t = o.fault ? 'crit' : o.state === 'Running' ? 'run' : 'idle'; body = dGaux(o); break;
      case 'instr': title = o.label; subT = 'QC laboratory instrument'; t = o.down ? 'warn' : 'ok'; body = dInstr(o); break;
      default: title = sel.id; body = [empty('No details.')];
    }
  } else { kicker = 'Zone'; title = ZONES[zone] || zone; body = zoneBody(zone); }
  return { kicker, title, subT, t, body: body.filter(Boolean), sel, zone, mono: !!sel && sel.kind !== 'grade' && sel.kind !== 'vessel' && sel.kind !== 'instr' };
}
function drawer() {
  const p = parts(); if (!p) return null;
  const { kicker, title, subT, t, body, sel, zone } = p;
  const mob = ctx.mobile;
  return h('aside', { key: 'drawer', className: 'tn-drawer sh-drawer', role: 'complementary', 'aria-label': `${kicker}: ${title}`, style: { position: 'absolute', top: 0, right: 0, bottom: 0, width: mob ? '100%' : 'min(440px, 100%)', zIndex: 6, background: 'var(--surf)', borderLeft: '1px solid var(--pBd)', boxShadow: mob ? 'none' : '-10px 0 28px rgba(20,24,28,.12)', display: 'flex', flexDirection: 'column', minWidth: 0 } },
    div({ flex: 'none', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px 10px', borderBottom: '1px solid var(--line)', borderTop: `3px solid ${TC[t]}`, minWidth: 0 },
      div({ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 },
        span({ fontSize: 11.5, color: 'var(--ink3)', letterSpacing: '.02em', ...ell }, kicker),
        h('h2', { style: { margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.25, fontFamily: sel && sel.kind !== 'grade' && sel.kind !== 'vessel' && sel.kind !== 'instr' ? 'var(--fid)' : 'var(--fsans)', overflowWrap: 'anywhere' } }, title),
        subT ? span({ fontSize: 12.5, color: 'var(--ink2)', overflowWrap: 'anywhere' }, subT) : null),
      sel && ST.zone ? h('button', { onClick: () => A.back(), title: 'Back to the zone', 'aria-label': 'Back to the zone', className: 'sh-press', style: { flex: 'none', height: 32, padding: '0 10px', border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--ink)', fontSize: 12.5, cursor: 'pointer' } }, 'Back') : null,
      h('button', { onClick: () => A.close(), title: 'Close (Esc)', 'aria-label': 'Close details', className: 'sh-press', style: { flex: 'none', width: 32, height: 32, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--ink)', fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '×')),
    h('div', { key: 'dbody-' + (sel ? sel.kind + sel.id : zone), className: 'tn-fade', style: { flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 14px 18px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 } }, ...body.filter(Boolean)));
}

// ── entry point ──
let TANKS0 = null;
function prime(h_, D_, ctx_, st, act) {
  h = h_; D = D_; ctx = ctx_; I = ctx_.I; ST = st || {}; A = act; HUB = D_.HUB; S = HUB && HUB.state;
  if (!S || !S.ready) return false;
  if (!TANKS0) {
    TANKS0 = { BOT: [], ADD: [], FPT: [], AUX: [] }; const all = {};
    D.term('MLB').tanks.forEach(t => { TANKS0[t.zone].push(t); all[t.id] = t; });
    TANKS0.FPT.sort((a, b) => a.id < b.id ? -1 : 1); S._all = all;
  }
  S._tanks = TANKS0;
  return true;
}
// details of one asset ({ sel: { kind, id } }) or zone ({ zone }) for another host, such as the mobile app (ctx.embed hides links to desktop tabs)
export function detail(h_, D_, ctx_, st, act) { return prime(h_, D_, ctx_, st, act) ? parts() : null; }
export function view(h_, D_, ctx_, st, act) {
  if (!prime(h_, D_, ctx_, st, act)) return null;
  const tab = TABS.some(([id]) => id === ST.tab) ? ST.tab : 'plan';
  const tabs = { plan: planTab, marine: marineTab, tanks: tanksTab, blend: blendTab, fill: fillTab, wh: whTab, iso: isoTab, lab: labTab, products: productsTab, log: logTab };
  return { header: header(), tabs: tabBar(tab), body: h('div', { key: 'tab-' + tab, className: 'tn-fade', style: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 } }, tabs[tab]()), drawer: drawer() };
}
// resolve an asset id from an alarm or a search result to a selection
export function resolve(D_, id) {
  const S2 = D_.HUB && D_.HUB.state; if (!S2 || !id) return null;
  const x = String(id).split(' ')[0];
  if (D_.term('MLB').tanks.some(t => t.id === x)) return { kind: 'tank', id: x };
  if (S2.blenders.some(b => b.id === x)) return { kind: 'blender', id: x };
  if (S2.lines.some(l => l.id === x)) return { kind: 'line', id: x };
  if (S2.isoCranes.some(c => c.id === x)) return { kind: 'crane', id: x };
  if (S2.grease.units.some(u => u.id === x)) return { kind: 'gunit', id: x };
  if (S2.grease.hoppers.some(u => u.id === x)) return { kind: 'hopper', id: x };
  if (S2.blow.some(m => m.id === x)) return { kind: 'blow', id: x };
  if (S2.rail.cranes.some(c => c.id === x)) return { kind: 'rmg', id: x };
  if (S2.bays.some(b => b.id === x)) return { kind: 'bay', id: x };
  if (S2.batches.some(b => b.id === id)) return { kind: 'batch', id };
  if (S2.samples.some(b => b.id === id)) return { kind: 'sample', id };
  if (D_.HUB.info.GRADE[id]) return { kind: 'grade', id };
  if (S2.warehouse.cranes.some(c => c.id === x)) return { kind: 'sc', id: x };
  if (S2.grease.aux.some(u => u.id === x)) return { kind: 'gaux', id: x };
  if (S2.iso.wash.some(w => w.id === x)) return { kind: 'wash', id: x };
  if (S2.jetties.some(j => j.id === x)) return { kind: 'jetty', id: x };
  if (S2.rail.tracks.some(t => t.id === x)) return { kind: 'track', id: x };
  const jn = S2.jetties.find(j => j.name === id); if (jn) return { kind: 'jetty', id: jn.id };
  const ins = S2.lab.instruments.find(i => i.label === id || i.id === x); if (ins) return { kind: 'instr', id: ins.id };
  const ves = S2.vessels.find(v => v.name === id); if (ves) return { kind: 'vessel', id: ves.id };
  if (S2.trains.some(t => t.id === id)) return { kind: 'train', id };
  if (S2.isos.some(t => t.id === id)) return { kind: 'iso', id };
  return null;
}
// plain helpers for hosts that draw their own screens (the mobile app): labels and tones as the console shows them
export function info(D_) {
  D = D_; HUB = D_.HUB; S = HUB && HUB.state;
  return { truckType, truckTone, cargoOf, lineTone, FMT: FMT_LABEL, HALLS: HUB.info.HALLS, VCLS: HUB.info.VCLS, grade: c => GRD(c) || HUB.info.COMP[c] || { label: shortOf(c) } };
}
