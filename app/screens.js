// Screens of the mobile app for the fuel network: overview, terminals, tanks, transfers, alarms, quality, blending, search, more.
import { h, useState, useContext, useMemo, useEffect, ic, fmt, kL, pct, big, hm, when, today, ago, durS, prod, plabel, swatch, plural, toneOf, Pill, Dot, StateText, Sw, Bar, StackBar, Ring, TankGlyph, Press, Section, Group, Row, KV, Stat, Fig, Seg, Chips, SearchField, Btn, Empty, TrendChart, cx, haptic } from './kit.js';
import { Screen, ScreenCtx, ROLES } from './shell.js';
import { HUB_SCREENS, hubTitle, hubRoute } from './hub.js';

// ── shared helpers ──
export function useMem(key, init) { const sc = useContext(ScreenCtx); const [v, setV] = useState(() => (sc.mem[key] !== undefined ? sc.mem[key] : init)); return [v, x => { sc.mem[key] = x; setV(x); }]; }
const SHORT = { PLM: 'Plumpang', SBY: 'Surabaya', UPG: 'Ujung Pandang', BIK: 'Biak', BOY: 'Boyolali', SMB: 'Pulau Sambu', PLJ: 'Plaju', PNJ: 'Panjang', JUA: 'Juanda', CGK: 'Soetta CGK', DPS: 'Ngurah Rai', KNO: 'Kualanamu', BLG: 'Balongan', VPK: 'Vopak Jakarta', MLB: 'Maiza Lubrika' };
export const short = t => (t && (SHORT[t.id] || t.name)) || '';
const kindGroup = k => /lubricant/i.test(k) ? 'lube' : /aviation/i.test(k) ? 'avi' : /storage/i.test(k) ? 'store' : 'fuel';
export const LIVE = ['In progress', 'Paused', 'Delayed'];
const TYPE = {
  'Ship-to-shore': ['ship', '#2f6fc0', 'Ship receipt'], 'Ship loading': ['ship', '#1f8a8a', 'Ship loading'], 'Truck dispatch': ['truck', '#7a59c9', 'Truck loading'], 'Road receipt': ['truck', '#6b7a8a', 'Road receipt'],
  'Pipeline receipt': ['pipe', '#2a9d74', 'Pipeline receipt'], 'Pipeline dispatch': ['pipe', '#2a8a9d', 'Pipeline dispatch'], 'Hydrant dispatch': ['plane', '#1d8fd1', 'Hydrant supply'], 'Inline blend': ['flask', '#c97a12', 'In-line blend'], 'Batch blend': ['flask', '#c97a12', 'Batch blend'],
};
const typeOf = tr => TYPE[tr.type] || ['transfer', '#6b737c', tr.type];
const trTone = tr => tr.state === 'In progress' ? 'run' : tr.state === 'Completed' ? 'ok' : tr.state === 'Paused' || tr.state === 'Delayed' ? 'warn' : 'idle';
const trFrac = tr => tr.planned ? Math.max(0, Math.min(1, (tr.qty || 0) / tr.planned)) : 0;
const sevTone = s => s === 'critical' ? 'crit' : s === 'attention' ? 'warn' : 'idle';
const SEV = { critical: 'Critical', attention: 'Attention', info: 'Advisory' };
const openAlarms = D => D.EXCEPTIONS.filter(e => e.status !== 'Resolved');
const tankState = k => /receiving/i.test(k.status) ? 'in' : /dispatching/i.test(k.status) ? 'out' : null;
function routeOf(D, tr) {
  const t = D.term(tr.term), isTank = id => !!(t && t.tanks.some(k => k.id === id));
  const from = tr.vessel && tr.type === 'Ship-to-shore' ? { l: tr.vessel, s: tr.berth, icon: 'ship' } : { l: tr.src || (tr.type === 'Pipeline receipt' ? 'Pipeline' : '—'), s: isTank(tr.src) ? 'Tank' : '', icon: isTank(tr.src) ? 'tank' : /pipe/i.test(tr.src || tr.type) ? 'pipe' : /road/i.test(tr.src || '') ? 'truck' : 'tank', tank: isTank(tr.src) ? tr.src : null };
  const via = [tr.arm, tr.pump, tr.meter].filter(Boolean);
  const to = tr.type === 'Ship loading' ? { l: tr.vessel || tr.dst, s: tr.berth, icon: 'ship' } : { l: tr.dst || '—', s: isTank(tr.dst) ? 'Tank' : '', icon: isTank(tr.dst) ? 'tank' : tr.node === 'gantry' ? 'truck' : tr.node === 'hydrant' ? 'plane' : /pipe/i.test(tr.dst || '') ? 'pipe' : 'tank', tank: isTank(tr.dst) ? tr.dst : null };
  return { from, via, to };
}
const routeText = (D, tr) => { const r = routeOf(D, tr); return `${r.from.l} → ${r.to.l}`; };
function trTime(D, tr) {
  const T = D.term(tr.term) || {}, tz = T.tz || 'WIB';
  if (tr.state === 'Completed') return `Finished ${when(tr.end, tz)}`;
  if (tr.state === 'Scheduled') return `Starts ${when(tr.start, tz)}`;
  if (tr.state === 'Paused') return 'Paused';
  if (tr.state === 'Delayed') return 'Delayed';
  return tr.etaMin ? `Ends ${when(tr.etaMin, tz)}` : 'In progress';
}
// transfer card used in lists
export function TransferCard({ app, tr }) {
  const D = app.D, T = D.term(tr.term), [icn, col] = typeOf(tr), P = prod(tr.code), f = trFrac(tr), t = trTone(tr);
  const pause = tr.state === 'Paused' && tr.pauses && tr.pauses.length ? tr.pauses[tr.pauses.length - 1][2] : null;
  return h(Press, { className: 'card press trf', onPress: () => app.push('transfer', [tr.id]), label: `${typeOf(tr)[2]} ${P.label}, ${short(T)}` },
    h('div', { className: 'trf-top' }, h('span', { className: 'trf-ic', style: { background: 'var(--fill)', color: 'var(--ink2)' } }, ic(icn, 20, { w: 2 })),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'row-t strong', style: { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 } }, h(Sw, { c: tr.code }), h('span', { className: 'ell' }, plabel(tr.code))), h('div', { className: 'row-s ell' }, `${typeOf(tr)[2]} · ${short(T)}`), h('div', { className: 'row-s ell' }, routeText(D, tr))),
      h(Pill, { t }, tr.state === 'In progress' ? (tr.truck ? 'Loading' : 'Pumping') : tr.state)),
    tr.state !== 'Scheduled' ? h('div', { className: 'prog' }, h(Bar, { v: f, color: t === 'warn' ? 'var(--warn)' : t === 'ok' ? 'var(--ok)' : 'var(--acc)' }), h('b', { className: 'num' }, pct(f))) : null,
    h('div', { className: 'trf-meta' }, h('span', { className: 'ell' }, h('b', { className: 'num' }, kL(tr.state === 'Scheduled' ? tr.planned : tr.qty)), tr.state !== 'Scheduled' ? ` of ${fmt(tr.planned)}` : ' planned', tr.flow && tr.state === 'In progress' ? ` · ${fmt(tr.flow)} kL/h` : ''), h('span', { style: { flex: 'none', color: pause ? 'var(--warnInk)' : undefined } }, pause ? pause.replace(/ \(.*\)$/, '') : trTime(D, tr))));
}
export function AlarmRow({ app, e }) {
  const T = app.D.term(e.term), crit = e.sev === 'critical', fresh = !e.ack && !e.res;
  return h(Press, { className: 'row press tall', onPress: () => app.push('alarm', [e.id]), label: `${fresh ? 'New alarm: ' : ''}${e.what}` },
    fresh ? h('span', { className: 'unread', 'aria-hidden': true }) : null,
    h('div', { className: 'al', style: { flex: 1, minWidth: 0 } }, h('span', { className: 'al-ic sev-' + e.sev }, ic(crit ? 'crit' : e.sev === 'attention' ? 'warn' : 'info', 18, { w: 2.1 })),
      h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'al-t', style: fresh ? null : { fontWeight: 500 } }, e.what), h('div', { className: 'al-s' }, `${short(T)} · ${e.asset} · ${ago(e.since)}${e.res ? ' · Resolved' : e.ack ? ' · Acknowledged' : ''}`))),
    h('span', { className: 'chev' }, ic('chevR', 18, { w: 2.2 })));
}
const searchBtn = app => h('button', { className: 'nav-ic', onClick: () => app.push('search'), 'aria-label': 'Search' }, ic('search', 23, { w: 2 }));

// ── Overview ──
function Overview({ app }) {
  const D = app.D, now = D.NOW, Ts = D.TERMINALS;
  const live = D.TRANSFERS.filter(x => LIVE.includes(x.state)), open = openAlarms(D), crit = open.filter(e => e.sev === 'critical'), fresh = open.filter(e => !e.ack);
  const pumping = live.filter(x => x.type === 'Ship-to-shore' || x.type === 'Ship loading'), trucking = live.filter(x => x.truck);
  const waiting = D.TRANSFERS.filter(x => x.marine && (x.state === 'Scheduled' || x.state === 'Delayed') && x.arrive != null && x.arrive <= now).length;
  const fuel = Ts.filter(t => !t.superhub);
  const sums = useMemo(() => fuel.map(t => ({ t, s: D.tsum(t, []) })), [app.rev]);
  const byProd = {}; let inv = 0, cap = 0; sums.forEach(({ s }) => { inv += s.inv; cap += s.cap; Object.entries(s.byProd || {}).forEach(([c, v]) => { if (prod(c).kind === 'product') byProd[c] = (byProd[c] || 0) + v; }); });
  const prods = Object.entries(byProd).sort((a, b) => b[1] - a[1]), totP = prods.reduce((a, x) => a + x[1], 0);
  const S = D.HUB.state, K = S && S.kpi;
  const tz = 'WIB', shift = D.shiftNow(tz), date = today();
  const install = (app.install || (app.ios && !app.standalone)) && !app.prefs.installSeen;
  const busyT = sums.map(({ t, s }) => ({ t, s, n: live.filter(x => x.term === t.id).length, a: open.filter(e => e.term === t.id).length })).sort((a, b) => (b.a * 3 + b.n) - (a.a * 3 + a.n));
  const status = crit.length ? { t: 'crit', icon: 'crit', title: `${plural(crit.length, 'critical alarm')} need${crit.length === 1 ? 's' : ''} action`, text: crit.slice(0, 2).map(e => `${short(D.term(e.term))}: ${e.what}`).join(' · ') }
    : fresh.length ? { t: 'warn', icon: 'warn', title: `${plural(fresh.length, 'new alarm')} to acknowledge`, text: fresh.slice(0, 2).map(e => `${short(D.term(e.term))}: ${e.what}`).join(' · ') }
    : { t: 'ok', icon: 'check', title: 'Every terminal is running normally', text: `${plural(open.length, 'alarm')} open, all acknowledged.` };
  return h(Screen, { title: 'Overview', large: true, kicker: h('span', { className: 'live' }, h('i'), `Live · ${hm(now)} WIB`), sub: `${date} · Shift ${shift}`, right: searchBtn(app), onRefresh: () => { app.refresh(); app.toast(`Up to date · ${hm(D.NOW)} WIB`); } },
    install ? h(Section, null, h('div', { className: 'card', style: { display: 'flex', gap: 14, alignItems: 'center' } },
      h('img', { src: 'icons/icon-192.png', alt: '', width: 48, height: 48, style: { borderRadius: 12, flex: 'none' } }),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'row-t strong' }, 'Add to your home screen'), h('div', { className: 'row-s' }, 'Opens full screen, like any other app.')),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, flex: 'none' } }, h(Btn, { small: true, onPress: () => app.install ? app.install() : app.sheet({ title: 'Install on iPhone', body: IosInstall }) }, 'Install'), h('button', { style: { fontSize: 13.5, color: 'var(--ink3)', padding: 4 }, onClick: () => app.setPref('installSeen', true) }, 'Not now')))) : null,
    h(Section, null, h(Press, { className: 'card press callout', style: { margin: '0 var(--gut)', background: `var(--${status.t === 'ok' ? 'ok' : status.t === 'crit' ? 'crit' : 'warn'}Soft)`, color: 'var(--ink)' }, onPress: () => app.switchTab('alarms') },
      h('span', { style: { color: `var(--${status.t === 'ok' ? 'ok' : status.t === 'crit' ? 'crit' : 'warnInk'})`, marginTop: 1 } }, ic(status.icon, 22, { w: 2.2 })),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('b', null, status.title), h('div', { className: 'row-s two', style: { color: 'var(--ink2)', marginTop: 2, fontSize: 14 } }, status.text)), h('span', { className: 'chev', style: { alignSelf: 'center' } }, ic('chevR', 18, { w: 2.2 })))),
    h(Section, null, h('div', { className: 'grid2' },
      h(Stat, { label: 'Live transfers', icon: 'transfer', value: fmt(live.length), sub: `${pumping.length} ships · ${trucking.length} truck lines`, t: 'run', onPress: () => app.switchTab('transfers') }),
      h(Stat, { label: 'Open alarms', icon: 'bell', value: fmt(open.length), sub: crit.length ? `${crit.length} critical · ${fresh.length} new` : `${fresh.length} new`, t: crit.length ? 'crit' : fresh.length ? 'warn' : 'ok', onPress: () => app.switchTab('alarms') }),
      h(Stat, { label: 'Ships alongside', icon: 'ship', value: fmt(pumping.length), sub: waiting ? `${waiting} waiting to berth` : 'none waiting', onPress: () => { app.switchTab('transfers'); } }),
      h(Stat, { label: 'Truck loading', icon: 'truck', value: fmt(trucking.reduce((a, x) => a + (x.trucksH || 0), 0), 0), unit: '/h', sub: `${fmt(trucking.reduce((a, x) => a + (x.trucksDone || 0), 0))} trucks so far`, onPress: () => app.switchTab('transfers') }))),
    h(Section, { title: 'Stock by product' }, h('div', { className: 'hero' },
      h('div', { className: 'hero-k' }, h('span', null, 'Finished fuels in storage'), h('span', null, `${pct(inv / cap)} of capacity`)),
      h('div', { className: 'hero-v num' }, fmt(totP), h('small', null, 'kL')),
      h(StackBar, { parts: prods.map(([c, v]) => ({ v, c: swatch(c) })) }),
      h('div', { className: 'legend' }, ...prods.slice(0, 8).map(([c, v]) => h('div', { key: c }, h(Sw, { c }), h('span', null, plabel(c)), h('b', { className: 'num' }, big(v))))))),
    h(Section, { title: 'Terminals', action: 'See all', onAction: () => app.switchTab('terminals') }, h('div', { className: 'carousel' }, ...busyT.map(({ t, s, n, a }) => h(Press, { key: t.id, className: 'hc press', onPress: () => app.push('terminal', [t.id]), label: t.name },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 } }, h('div', { className: 'hc-t' }, short(t)), h(Pill, { t: t.status === 'Operating' ? 'ok' : 'warn' }, t.status)),
      h('div', { className: 'hc-s' }, t.area),
      h(Bar, { v: s.inv / s.cap }),
      h('div', { className: 'hc-row' }, h('span', null, 'Stock'), h('b', { className: 'num' }, `${pct(s.inv / s.cap)} · ${big(s.inv)} kL`)),
      h('div', { className: 'hc-row' }, h('span', null, 'Live transfers'), h('b', { className: 'num' }, n)),
      h('div', { className: 'hc-row' }, h('span', null, 'Open alarms'), h('b', { className: 'num', style: { color: a ? 'var(--warnInk)' : undefined } }, a)))))),
    K ? h(Section, { title: 'Maiza Lubrika' }, h(Press, { className: 'card press', onPress: () => app.push('hub'), label: 'Maiza Lubrika lubricant superhub' },
      h('div', { className: 'split' }, h(Ring, { v: K.out.pct || 0, size: 84, w: 8, color: (K.out.pct || 0) >= .92 ? 'var(--ok)' : 'var(--warn)', label: `Output ${pct(K.out.pct)} of plan` }, h('b', { className: 'num', style: { fontSize: 18 } }, pct(K.out.pct)), h('span', { style: { fontSize: 11, color: 'var(--ink3)' } }, 'of plan')),
        h('div', { style: { minWidth: 0 } }, h('div', { className: 'row-t strong ell' }, 'Lubricant superhub'), h('div', { className: 'row-s ell', style: { marginBottom: 10 } }, 'Kendal · 2.0 Mt/y'),
          h('div', { className: 'figs' }, h(Fig, { l: 'Output today', v: fmt(K.out.today), u: 't' }), h(Fig, { l: 'Lines running', v: `${K.lines.running}/34` }), h(Fig, { l: 'Berths busy', v: `${K.berths.busy}/9` }), h(Fig, { l: 'Trucks on site', v: fmt(S.gate.onSite) })))))) : null,
    h(Section, { title: 'Live activity' }, app.events.length ? h('div', { className: 'feed', role: 'log', 'aria-live': 'polite' }, ...app.events.slice(0, 10).map((e, i) => h('div', { key: e.id, className: cx('feed-i', i < 2 && 'new') }, h('time', { className: 'num' }, hm(e.at)), h('span', null, e.text))))
      : h('div', { className: 'feed' }, h('div', { className: 'feed-i' }, h('time', null, hm(now)), h('span', { style: { color: 'var(--ink3)' } }, 'New activity appears here as it happens.')))));
}
function IosInstall() {
  return h('div', { className: 'sheet-pad', style: { display: 'flex', flexDirection: 'column', gap: 14, fontSize: 16, lineHeight: 1.45 } },
    ...[['share', 'Tap the Share button in Safari.'], ['plus', 'Choose “Add to Home Screen”.'], ['check', 'Open Terminal Network from your home screen. It runs full screen and keeps your place.']].map(([i, t], n) =>
      h('div', { key: n, style: { display: 'flex', gap: 14, alignItems: 'center' } }, h('span', { className: 'row-ic soft', style: { width: 40, height: 40, borderRadius: 12 } }, ic(i === 'plus' ? 'install' : i, 21)), h('span', null, t))));
}

// ── Terminals ──
function Terminals({ app }) {
  const D = app.D, [q, setQ] = useMem('q', ''), [f, setF] = useMem('f', 'all');
  const live = D.TRANSFERS.filter(x => LIVE.includes(x.state)), open = openAlarms(D);
  const all = D.TERMINALS, counts = { all: all.length }; all.forEach(t => { const g = kindGroup(t.kind); counts[g] = (counts[g] || 0) + 1; });
  const ql = q.trim().toLowerCase();
  const list = all.filter(t => (f === 'all' || kindGroup(t.kind) === f) && (!ql || `${t.name} ${t.area} ${t.id} ${t.kind}`.toLowerCase().includes(ql)));
  const op = all.filter(t => t.status === 'Operating').length;
  return h(Screen, { title: 'Terminals', large: true, sub: `${all.length} sites · ${op} operating`, right: searchBtn(app) },
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, h(SearchField, { value: q, onChange: setQ, placeholder: 'Search terminals' }),
      h(Chips, { value: f, onChange: setF, label: 'Terminal type', items: [['all', 'All', counts.all], ['fuel', 'Fuel', counts.fuel], ['avi', 'Aviation', counts.avi], ['store', 'Storage', counts.store], ['lube', 'Lubricants', counts.lube]].filter(x => x[2]) })),
    h(Section, null, list.length ? h(Group, null, ...list.map(t => {
      const s = t.superhub ? null : D.tsum(t, []), n = live.filter(x => x.term === t.id).length, a = open.filter(e => e.term === t.id).length;
      const fill = s ? s.inv / s.cap : null, S = t.superhub && D.HUB.state;
      return h(Row, { key: t.id, onPress: () => app.push(t.superhub ? 'hub' : 'terminal', t.superhub ? [] : [t.id]), tall: true, label: t.name,
        lead: t.superhub ? h('span', { className: 'row-ic', style: { width: 30, height: 40, borderRadius: 8, background: '#1f8a8a' } }, ic('factory', 18, { w: 2 })) : h(TankGlyph, { fill, color: t.status === 'Operating' ? 'var(--acc)' : 'var(--warn)', w: 30, ht: 40 }),
        title: t.name, sub: `${t.area}`, sub2: t.status !== 'Operating' ? h(StateText, { t: 'warn' }, `${t.status} · ${[n ? `${n} live` : null, a ? `${a} alarm${a > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')}`) : [t.kind, n ? `${n} live` : null, a ? `${a} alarm${a > 1 ? 's' : ''}` : null].filter(Boolean).join(' · '),
        value: s ? pct(fill) : S ? pct(S.kpi.out.pct) : '', valueSub: s ? 'full' : 'of plan' });
    })) : h(Empty, { icon: 'search', title: 'No terminals found', text: 'Try another name or clear the filter.' })));
}

// ── Terminal ──
function Terminal({ p, app }) {
  const D = app.D, t = D.term(p[0]);
  if (!t) return h(Screen, { title: 'Terminal' }, h(Empty, { icon: 'info', title: 'Terminal not found' }));
  if (t.superhub) return h(HUB_SCREENS.hub, { p: [], app });
  const s = D.tsum(t, []), tz = t.tz, live = D.TRANSFERS.filter(x => x.term === t.id && LIVE.includes(x.state)).sort((a, b) => (a.etaMin || 1e9) - (b.etaMin || 1e9));
  const next = D.TRANSFERS.filter(x => x.term === t.id && x.state === 'Scheduled').sort((a, b) => a.start - b.start);
  const alarms = openAlarms(D).filter(e => e.term === t.id), samples = D.SAMPLES.filter(x => x.term === t.id && x.decision === 'Pending');
  const blends = D.BLENDS.filter(b => b.term === t.id && b.state !== 'Draft').sort((a, b) => (b.start || 0) - (a.start || 0));
  const [tv, setTv] = useMem('tv', 'grid'), eq = D.equipment(t);
  return h(Screen, { title: t.name, navTitle: short(t), large: true, kicker: h(React.Fragment, null, h(Pill, { t: t.status === 'Operating' ? 'ok' : 'warn' }, t.status), h('span', null, `Local ${hm(D.NOW, tz)} ${tz}`)), sub: `${t.area} · ${t.kind}` },
    alarms.length ? h(Section, { title: 'Alarms', small: true }, h(Group, null, ...alarms.map(e => h(AlarmRow, { key: e.id, app, e })))) : null,
    h(Section, { title: alarms.length ? 'Stock' : null, small: true }, h('div', { className: 'card' },
      h('div', { className: 'hero-k' }, h('span', null, 'Total stock'), h('span', null, `${pct(s.inv / s.cap)} of ${big(s.cap)} kL`)),
      h('div', { className: 'hero-v num', style: { fontSize: 34, margin: '2px 0 10px' } }, fmt(s.inv), h('small', null, 'kL')),
      h(StackBar, { parts: Object.entries(s.byProd || {}).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ v, c: swatch(c) })) }),
      h('div', { className: 'figs', style: { marginTop: 14 } }, h(Fig, { l: 'Available to dispatch', v: fmt(s.avail), u: 'kL' }), h(Fig, { l: 'Room to receive', v: fmt(s.rx), u: 'kL' }), h(Fig, { l: 'On quality hold', v: fmt(s.held), u: 'kL' }), h(Fig, { l: 'Reserved', v: fmt(s.rsv), u: 'kL' })),
      h('div', { className: 'row-s', style: { marginTop: 14 } }, D.caps(t).join(' · ')))),
    h(Section, { title: `Tanks · ${t.tanks.length}`, action: tv === 'grid' ? 'List' : 'Grid', onAction: () => setTv(tv === 'grid' ? 'list' : 'grid') },
      tv === 'grid' ? h('div', { className: 'tiles' }, ...t.tanks.map(k => { const st = D.stock(k), P = prod(k.code), hold = k.q === 'On hold';
        return h(Press, { key: k.id, className: 'tile press', onPress: () => app.push('tank', [t.id, k.id]), label: `${k.id} ${P.label} ${pct(st.fill)}` },
          h(TankGlyph, { fill: st.fill, color: swatch(k.code), hla: k.hla / k.nominal, w: 30, ht: 44, state: tankState(k), hold }),
          h('div', { className: 'tile-main' }, h('div', { className: 'tile-id' }, k.id), h('div', { className: 'tile-p' }, plabel(k.code)), h('div', { className: 'tile-v num' }, `${pct(st.fill)} · ${big(k.vol)} kL`)),
          k.alarm || hold ? h('span', { className: 'tile-st' }, h(Dot, { t: k.alarm ? 'crit' : 'warn' })) : null); }))
      : h(Group, null, ...t.tanks.map(k => { const st = D.stock(k); return h(Row, { key: k.id, onPress: () => app.push('tank', [t.id, k.id]), lead: h(Sw, { c: k.code }), title: `${k.id} · ${plabel(k.code)}`, sub: `${k.status}${k.q !== 'Released' ? ' · ' + k.q : ''}`, value: pct(st.fill), valueSub: kL(k.vol) }); }))),
    h(Section, { title: `Live transfers · ${live.length}`, action: 'See all', onAction: () => app.push('transfers', [t.id]) }, live.length ? h('div', { className: 'cards' }, ...live.slice(0, 6).map(tr => h(TransferCard, { key: tr.id, app, tr })))
      : h('div', { className: 'card', style: { color: 'var(--ink3)', fontSize: 15 } }, next.length ? `Nothing pumping now. Next: ${typeOf(next[0])[2].toLowerCase()} ${when(next[0].start, tz)}.` : 'Nothing pumping now.')),
    next.length ? h(Section, { title: 'Up next', small: true }, h(Group, null, ...next.slice(0, 4).map(tr => h(Row, { key: tr.id, onPress: () => app.push('transfer', [tr.id]), icon: typeOf(tr)[0], iconSoft: true, title: `${plabel(tr.code)} · ${typeOf(tr)[2]}`, sub: routeText(D, tr), value: when(tr.start, tz), valueSub: kL(tr.planned) })))) : null,
    (t.marine || []).length ? h(Section, { title: 'Berths', small: true }, h(Group, null, ...t.marine.map(b => { const on = D.TRANSFERS.find(x => x.term === t.id && x.berth === b && (x.state === 'In progress' || x.state === 'Paused')), nx = D.TRANSFERS.filter(x => x.term === t.id && x.berth === b && (x.state === 'Scheduled' || x.state === 'Delayed')).sort((a, c) => a.start - c.start)[0];
      return h(Row, { key: b, icon: 'ship', iconBg: on ? 'var(--acc)' : undefined, iconSoft: !on, title: b, sub: on ? `${on.vessel} · ${plabel(on.code)}` : nx ? `Free · next ${nx.vessel || ''} ${when(nx.start, tz)}` : 'Free', value: on ? pct(trFrac(on)) : null, valueSub: on ? (on.state === 'Paused' ? 'Paused' : `ends ${when(on.etaMin, tz)}`) : null, onPress: on ? () => app.push('transfer', [on.id]) : nx ? () => app.push('transfer', [nx.id]) : undefined }); }))) : null,
    blends.length ? h(Section, { title: 'Blending', small: true }, h(Group, null, ...blends.slice(0, 3).map(b => h(Row, { key: b.id, lead: h(Sw, { c: b.code }), onPress: () => app.push('batch', [b.id]), title: `${plabel(b.code)} · ${b.mode}`, sub: `${b.id} → ${b.dst}`, value: kL(b.target), valueSub: b.state })))) : null,
    h(Section, { title: 'Quality', small: true, action: 'All samples', onAction: () => app.push('quality', [t.id]) }, samples.length ? h(Group, null, ...samples.slice(0, 4).map(x => h(SampleRow, { key: x.id, app, x }))) : h('div', { className: 'card', style: { color: 'var(--ink3)', fontSize: 15 } }, 'No samples waiting for a decision.')),
    h(Section, { title: 'Equipment', small: true }, h(Group, null, ...eq.map(x => h(Row, { key: x.id, compact: true, title: `${x.id} · ${x.name}`, sub: x.type, right: h(Pill, { t: toneOf(x.status) }, x.status), onPress: () => app.sheet({ title: `${x.id} · ${x.name}`, body: () => h(EquipSheet, { x }) }) })))));
}
function EquipSheet({ x }) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
    h('div', { className: 'grp' }, ...[['Type', x.type], ['Status', x.status], ['Material', x.material], ...(x.readings || []).map(r => [r.k, `${r.v}${r.u ? ' ' + r.u : ''}`])].filter(r => r[1] != null && r[1] !== '').map((r, i) => h('div', { key: i, className: 'kv' }, h('dt', null, r[0]), h('dd', null, String(r[1]))))),
    x.note ? h('div', { className: 'grp-f', style: { paddingTop: 0 } }, x.note) : null);
}

// ── Tank ──
function Tank({ p, app }) {
  const D = app.D, t = D.term(p[0]), k = t && t.tanks.find(x => x.id === p[1]);
  if (!k) return h(Screen, { title: 'Tank' }, h(Empty, { icon: 'info', title: 'Tank not found' }));
  const st = D.stock(k), P = prod(k.code), tz = t.tz, flows = D.tankFlows(k), hist = useMemo(() => D.tankHistory(k, 24, 30), [app.rev, k.id]);
  const smp = D.SAMPLES.filter(x => x.term === t.id && x.link && x.link.id === k.id).sort((a, b) => b.at - a.at)[0];
  const hold = k.q === 'On hold', qt = k.q === 'Released' ? 'ok' : hold ? 'warn' : 'idle';
  return h(Screen, { title: k.id, large: true, kicker: h(React.Fragment, null, h(Sw, { c: k.code }), h('span', null, plabel(k.code))), sub: `${t.name} · bund ${k.bund}` },
    h(Section, null, h('div', { className: 'card' }, h('div', { className: 'split', style: { gap: 20 } },
      h(TankGlyph, { fill: st.fill, color: swatch(k.code), hla: k.hla / k.nominal, w: 74, ht: 112, state: tankState(k), hold }),
      h('div', { className: 'figs' }, h(Fig, { l: 'Fill', v: pct(st.fill, 1) }), h(Fig, { l: 'Volume', v: fmt(k.vol), u: 'kL' }), h(Fig, { l: 'Room to MOC', v: fmt(Math.max(0, k.moc - k.vol)), u: 'kL' }), h(Fig, { l: 'Available', v: fmt(st.avail), u: 'kL' }))),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 } }, h(Pill, { t: toneOf(k.status) }, k.status), h(Pill, { t: qt }, k.q), k.alarm ? h(Pill, { t: 'crit' }, k.alarm) : null))),
    flows.length ? h(Section, { title: 'Moving now', small: true }, h(Group, null, ...flows.map(f => { const tr = f.tr; return h(Row, { key: tr.id, onPress: () => app.push('transfer', [tr.id]), icon: f.sign > 0 ? 'down' : 'up', iconBg: f.sign > 0 ? 'var(--ok)' : 'var(--acc)', title: typeOf(tr)[2], sub: `${f.sign > 0 ? 'In from' : 'Out to'} ${f.sign > 0 ? routeOf(D, tr).from.l : routeOf(D, tr).to.l} · ${tr.state}`, value: tr.flow ? `${fmt(tr.flow * (f.share || 1))} kL/h` : tr.state, valueSub: tr.etaMin ? `ends ${when(tr.etaMin, tz)}` : null }); }))) : null,
    h(Section, { title: 'Last 24 hours', small: true }, h('div', { className: 'card', style: { padding: '12px 10px 6px' } }, h(TrendChart, { pts: hist.map(x => ({ t: x.t, v: x.v })), color: swatch(k.code), unit: 'kL', tz, refs: [{ v: k.hla, label: 'High level', color: 'var(--crit)' }], y0: 0, y1: k.nominal }))),
    h(Section, { title: 'Quality', small: true }, h(Group, null, h(Row, { icon: 'shield', iconBg: qt === 'ok' ? 'var(--ok)' : qt === 'warn' ? 'var(--warn)' : 'var(--ink4)', title: k.q, sub: `Batch ${k.batch || '—'}` }), smp ? h(SampleRow, { app, x: smp }) : null)),
    h(Section, { title: 'Details', small: true }, h(KV, { rows: [['Nominal capacity', kL(k.nominal)], ['Max operating (MOC)', kL(k.moc)], ['High-level alarm', kL(k.hla)], ['Heel', kL(k.heel)], ['Level', `${fmt(st.level / 1000, 2)} m of ${fmt(k.height, 1)} m`], ['Temperature', k.temp != null ? `${fmt(k.temp, 1)} °C${k.tempSrc && k.tempSrc !== 'measured' ? ' · ' + k.tempSrc : ''}` : null], ['Density @ 15 °C', k.dens15 ? `${fmt(k.dens15, 1)} kg/m³` : null], ['Water', k.water != null ? `${fmt(k.water)} mm` : null], ['Roof', k.roof], ['Shell', k.material], ['Coating', k.coating], ['Diameter', k.diam ? `${fmt(k.diam, 1)} m` : null]] })));
}

// ── Transfers ──
function Transfers({ p, app }) {
  const D = app.D, tid = p[0], T = tid ? D.term(tid) : null;
  const [v, setV] = useMem('v', 'live'), [f, setF] = useMem('f', 'all'), [tf, setTf] = useMem('tf', tid || 'all');
  const kinds = { ships: x => /^Ship/.test(x.type), trucks: x => /Truck|Road/.test(x.type), pipes: x => /Pipeline/.test(x.type), avi: x => /Hydrant/.test(x.type), blends: x => /blend/i.test(x.type) };
  const base = D.TRANSFERS.filter(x => (tf === 'all' || x.term === tf) && (f === 'all' || kinds[f](x)));
  const lists = { live: base.filter(x => LIVE.includes(x.state)).sort((a, b) => (a.state === 'Paused' ? -1 : 0) - (b.state === 'Paused' ? -1 : 0) || (a.etaMin || 1e9) - (b.etaMin || 1e9)), next: base.filter(x => x.state === 'Scheduled').sort((a, b) => a.start - b.start), done: base.filter(x => x.state === 'Completed').sort((a, b) => (b.end || 0) - (a.end || 0)) };
  const list = lists[v], allLive = D.TRANSFERS.filter(x => (tf === 'all' || x.term === tf) && LIVE.includes(x.state)).length;
  const fT = tf !== 'all' ? D.term(tf) : null;
  const pickTerm = () => app.sheet({ title: 'Terminal', body: () => h('div', { className: 'grp' }, ...[['all', 'All terminals'], ...D.TERMINALS.map(t => [t.id, t.name])].map(([id, l]) => h('button', { key: id, className: 'opt', onClick: () => { setTf(id); app.closeSheet(); } }, h('span', { className: 'ell' }, l), tf === id ? h('span', { className: 'ck' }, ic('check', 20, { w: 2.4 })) : null))) });
  const [lim, setLim] = useState(40);
  return h(Screen, { title: T ? `Transfers` : 'Transfers', navTitle: T ? `${short(T)} transfers` : 'Transfers', large: true, sub: `${fT ? short(fT) + ' · ' : ''}${allLive} live now`, right: h('button', { className: 'nav-ic', onClick: pickTerm, 'aria-label': 'Choose terminal' }, ic('filter', 23, { w: 2 }), tf !== 'all' ? h('span', { className: 'dot', style: { background: 'var(--acc)', top: 10, right: 8, minWidth: 8 } }) : null), onRefresh: () => { app.refresh(); app.toast(`Up to date · ${hm(D.NOW)} WIB`); } },
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      h(Seg, { value: v, onChange: x => { setV(x); setLim(40); }, label: 'Transfer state', items: [['live', 'Live', lists.live.length], ['next', 'Scheduled', lists.next.length], ['done', 'Done', lists.done.length]] }),
      h(Chips, { value: f, onChange: setF, label: 'Transfer type', items: [['all', 'All'], ['ships', 'Ships'], ['trucks', 'Trucks'], ['pipes', 'Pipelines'], ['avi', 'Hydrant'], ['blends', 'Blends']] }),
      fT ? h('div', { style: { padding: '0 var(--gut)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, color: 'var(--ink2)' } }, ic('pin', 16, { w: 2 }), h('span', { className: 'ell', style: { flex: 1 } }, fT.name), h('button', { style: { color: 'var(--acc)', fontSize: 14.5 }, onClick: () => setTf('all') }, 'All terminals')) : null),
    h(Section, null, list.length ? h('div', { className: 'cards' }, ...list.slice(0, lim).map(tr => h(TransferCard, { key: tr.id, app, tr })), list.length > lim ? h('div', { style: { padding: '4px var(--gut)' } }, h(Btn, { kind: 'secondary', onPress: () => setLim(lim + 40) }, `Show ${Math.min(40, list.length - lim)} more`)) : null)
      : h(Empty, { icon: 'transfer', title: v === 'live' ? 'Nothing pumping' : v === 'next' ? 'Nothing scheduled' : 'Nothing finished yet', text: f !== 'all' || tf !== 'all' ? 'Try a different filter.' : 'Transfers appear here as they are planned and run.' })));
}

// ── Transfer ──
function Transfer({ p, app }) {
  const D = app.D, tr = D.TRANSFERS.find(x => x.id === p[0]);
  if (!tr) return h(Screen, { title: 'Transfer' }, h(Empty, { icon: 'transfer', title: 'Transfer no longer listed', text: 'Finished transfers are kept for two days.' }));
  const T = D.term(tr.term), tz = T.tz, [icn, col, tl] = typeOf(tr), P = prod(tr.code), f = trFrac(tr), t = trTone(tr), r = routeOf(D, tr);
  const toTank = id => id && T.tanks.some(k => k.id === id) ? () => app.push(T.superhub ? 'hubItem' : 'tank', T.superhub ? ['tank', id] : [T.id, id]) : undefined;
  const left = tr.etaMin ? tr.etaMin - D.NOW : null;
  return h(Screen, { title: `${plabel(tr.code)} · ${tl}`, navTitle: tr.id, large: true, kicker: h(React.Fragment, null, h('span', { className: 'mono' }, tr.id)), sub: T.name },
    h(Section, null, h('div', { className: 'card' }, h('div', { className: 'split', style: { gap: 18 } },
      h(Ring, { v: f, size: 104, w: 9, color: t === 'warn' ? 'var(--warn)' : t === 'ok' ? 'var(--ok)' : col, label: `${pct(f)} done` }, h('b', { className: 'num', style: { fontSize: 23, letterSpacing: '-.02em' } }, pct(f)), h('span', { style: { fontSize: 11.5, color: 'var(--ink3)' } }, tr.state === 'Completed' ? 'complete' : 'done')),
      h('div', { className: 'figs' }, h(Fig, { l: 'Moved', v: fmt(tr.qty), u: 'kL' }), h(Fig, { l: 'Planned', v: fmt(tr.planned), u: 'kL' }), h(Fig, { l: tr.state === 'Completed' ? 'Finished' : 'Remaining', v: tr.state === 'Completed' ? hm(tr.end, tz) : fmt(Math.max(0, tr.planned - (tr.qty || 0))), u: tr.state === 'Completed' ? '' : 'kL' }), h(Fig, { l: tr.truck ? 'Trucks' : 'Flow', v: tr.truck ? `${tr.trucksDone || 0}/${tr.truckN || '—'}` : tr.flow ? fmt(tr.flow) : '—', u: tr.truck ? '' : 'kL/h' }))),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' } }, h(Pill, { t }, tr.state === 'In progress' ? (tr.truck ? 'Loading' : 'Pumping') : tr.state), h('span', { style: { fontSize: 14.5, color: 'var(--ink2)' } }, tr.state === 'In progress' && left != null ? `Ends ${when(tr.etaMin, tz)} · in ${durS(left)}` : trTime(D, tr))))),
    h(Section, { title: 'Route', small: true }, h('div', { className: 'grp steps' },
      h(Step, { icon: r.from.icon, t: r.from.l, s: r.from.s || 'Source', on: tr.state !== 'Scheduled', done: tr.state === 'Completed', onPress: toTank(r.from.tank) }),
      ...r.via.map((x, i) => h(Step, { key: i, icon: /MLA|arm|hose/i.test(x) ? 'ship' : /FM|meter/i.test(x) ? 'gauge' : 'bolt', t: x, s: /MLA|arm/i.test(x) ? 'Loading arm' : /hose/i.test(x) ? 'Hose' : /FM|meter/i.test(x) ? 'Meter' : 'Pump', on: tr.state === 'In progress', done: tr.state === 'Completed' })),
      h(Step, { icon: r.to.icon, t: r.to.l, s: r.to.s || 'Destination', on: tr.state === 'In progress', done: tr.state === 'Completed', onPress: toTank(r.to.tank) }))),
    h(Section, { title: 'Details', small: true }, h(KV, { rows: [['Terminal', T.name], ['Product', P.label], ['Type', tr.type], tr.batch ? ['Batch', tr.batch, { mono: true }] : null, tr.vessel ? ['Vessel', `${tr.vessel}${tr.voyage ? ' · ' + tr.voyage : ''}`] : null, tr.berth ? ['Berth', tr.berth] : null, tr.comp ? ['Compartments', tr.comp] : null, ['Start', when(tr.start, tz)], tr.arrive != null && tr.marine ? ['Arrived', when(tr.arrive, tz)] : null, tr.temp ? ['Temperature', `${fmt(tr.temp, 1)} °C`] : null, tr.dens ? ['Density @ 15 °C', `${fmt(tr.dens, 1)} kg/m³`] : null, tr.press ? ['Line pressure', `${fmt(tr.press, 1)} bar`] : null] })),
    tr.pauses && tr.pauses.length ? h(Section, { title: 'Pauses', small: true }, h(Group, null, ...tr.pauses.map((x, i) => h(Row, { key: i, icon: 'pause', iconBg: 'var(--warn)', title: x[2], sub: `${when(x[0], tz)}${x[1] ? ' – ' + hm(x[1], tz) + ' · ' + durS(x[1] - x[0]) : ' · ongoing'}` })))) : null,
    h(Section, null, h(Group, null, h(Row, { icon: 'tank', iconBg: 'var(--ink3)', title: T.name, sub: 'Open the terminal', onPress: () => app.push(T.superhub ? 'hub' : 'terminal', T.superhub ? [] : [T.id]) }))));
}
function Step({ icon, t, s, on, done, onPress }) {
  const kids = [h('span', { key: 'd', className: cx('step-dot', done ? 'done' : on && 'on') }, ic(done ? 'check' : icon, 15, { w: 2.2 })), h('div', { key: 'b', style: { minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 } }, h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'step-t ell' }, t), h('div', { className: 'step-s' }, s)), onPress ? h('span', { className: 'chev' }, ic('chevR', 18, { w: 2.2 })) : null)];
  return onPress ? h(Press, { className: 'step step-press', onPress }, ...kids) : h('div', { className: 'step' }, ...kids);
}

// ── Alarms ──
function Alarms({ app }) {
  const D = app.D, [v, setV] = useMem('v', 'open'), [f, setF] = useMem('f', 'all');
  const open = openAlarms(D), res = D.EXCEPTIONS.filter(e => e.status === 'Resolved');
  const base = (v === 'open' ? open : res).filter(e => f === 'all' || (f === 'hub' ? e.hub : f === 'net' ? !e.hub : e.sev === f));
  const order = { critical: 0, attention: 1, info: 2 }, list = base.slice().sort((a, b) => v === 'open' ? order[a.sev] - order[b.sev] || (!!a.ack - !!b.ack) || b.since - a.since : (b.res ? b.res.at : 0) - (a.res ? a.res.at : 0));
  const groups = v === 'open' ? ['critical', 'attention', 'info'].map(s => [s, list.filter(e => e.sev === s)]).filter(g => g[1].length) : [['all', list]];
  const fresh = open.filter(e => !e.ack).length;
  return h(Screen, { title: 'Alarms', large: true, sub: `${open.length} open · ${fresh} to acknowledge`, onRefresh: () => { app.refresh(); app.toast(`Up to date · ${hm(D.NOW)} WIB`); } },
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      h(Seg, { value: v, onChange: setV, label: 'Alarm state', items: [['open', 'Open', open.length], ['res', 'Resolved', res.length]] }),
      h(Chips, { value: f, onChange: setF, label: 'Alarm filter', items: [['all', 'All'], ['critical', 'Critical'], ['attention', 'Attention'], ['net', 'Fuel network'], ['hub', 'Superhub']] })),
    list.length ? groups.map(([s, l]) => h(Section, { key: s, title: s === 'all' ? null : `${SEV[s]} · ${l.length}`, small: true }, h(Group, null, ...l.slice(0, 80).map(e => h(AlarmRow, { key: e.id, app, e })))))
      : h(Empty, { icon: v === 'open' ? 'check' : 'history', title: v === 'open' ? 'No open alarms' : 'Nothing resolved yet', text: v === 'open' ? 'You will see a banner when a new alarm is raised.' : 'Resolved alarms stay here for a day.' }));
}

// ── Alarm ──
function Alarm({ p, app }) {
  const D = app.D, e = D.EXCEPTIONS.find(x => x.id === p[0]);
  if (!e) return h(Screen, { title: 'Alarm' }, h(Empty, { icon: 'history', title: 'Alarm closed', text: 'Resolved alarms are cleared after a day.' }));
  const T = D.term(e.term), tz = T.tz, crit = e.sev === 'critical', perm = app.perm, who = app.role.name;
  const k = T.tanks.find(x => x.id === String(e.asset).split(' ')[0]), trId = (String(e.op).match(/TRF-[A-Z]+-\d+-\d+/) || [])[0];
  const hubSel = e.hub ? hubRoute(D, e.asset) : null;
  const ack = () => { D.ackEx(e.id, who, D.NOW); haptic(12); app.toast(`${e.id} acknowledged`); };
  const resolve = () => app.sheet({ title: 'Resolve alarm', body: () => h(ResolveSheet, { app, e }) });
  const canAck = perm.ack && !e.ack && !e.res, canRes = perm.resolve && !e.res;
  const foot = e.res ? null : h('div', null, canAck || canRes ? h('div', { className: 'btns' }, canAck ? h(Btn, { kind: 'primary', icon: 'check', onPress: ack }, 'Acknowledge') : null, canRes ? h(Btn, { kind: canAck ? 'secondary' : 'primary', onPress: resolve }, 'Resolve') : null)
    : h('div', { className: 'lock' }, ic('lock', 16, { w: 2 }), !perm.ack ? 'Acknowledging needs the operator role' : 'Resolving needs the shift supervisor role'));
  return h(Screen, { title: e.what, navTitle: e.id, large: true, kicker: h(React.Fragment, null, h(Pill, { t: sevTone(e.sev) }, SEV[e.sev]), h('span', { className: 'mono' }, e.id)), sub: `${short(T)} · ${e.asset}`, foot },
    h(Section, null, h('div', { className: 'callout', style: { background: crit ? 'var(--critSoft)' : e.sev === 'attention' ? 'var(--warnSoft)' : 'var(--fill)' } }, h('span', { style: { color: crit ? 'var(--crit)' : 'var(--warnInk)', marginTop: 1 } }, ic(crit ? 'crit' : 'warn', 22, { w: 2.2 })), h('div', null, h('b', null, e.op), h('div', { style: { color: 'var(--ink2)', marginTop: 3 } }, `Owner: ${e.owner}`)))),
    h(Section, { title: 'Timeline', small: true }, h('div', { className: 'grp steps' },
      h(Step, { icon: 'warn', t: 'Raised', s: `${when(e.since, tz)} · ${ago(e.since)}`, done: true }),
      h(Step, { icon: 'check', t: e.ack ? `Acknowledged by ${e.ack.by}` : 'Acknowledgement pending', s: e.ack ? when(e.ack.at, tz) : 'Waiting for the control room', done: !!e.ack, on: !e.ack }),
      h(Step, { icon: 'shield', t: e.res ? `Resolved by ${e.res.by}` : 'Resolution pending', s: e.res ? `${when(e.res.at, tz)} · ${e.res.note}` : `With ${e.owner}`, done: !!e.res, on: !!e.ack && !e.res }))),
    h(Section, { title: 'Details', small: true }, h(KV, { rows: [['Terminal', T.name], ['Asset', e.asset], ['Area', e.area || null], ['Since', `${when(e.since, tz)} (${ago(e.since)})`], ['Status', e.status]] })),
    k || trId || hubSel ? h(Section, { title: 'Related', small: true }, h(Group, null,
      k && !T.superhub ? h(Row, { icon: 'tank', iconBg: swatch(k.code), title: `${k.id} · ${plabel(k.code)}`, sub: `${pct(D.stock(k).fill)} full · ${k.status}`, onPress: () => app.push('tank', [T.id, k.id]) }) : null,
      trId ? h(Row, { icon: 'transfer', iconBg: 'var(--acc)', title: trId, sub: 'Affected transfer', onPress: () => app.push('transfer', [trId]) }) : null,
      hubSel ? h(Row, { icon: 'factory', iconBg: '#1f8a8a', title: `${hubSel.id}`, sub: 'Open at Maiza Lubrika', onPress: () => app.push('hubItem', [hubSel.kind, hubSel.id]) }) : null,
      h(Row, { icon: 'pin', iconSoft: true, title: T.name, sub: 'Open the terminal', onPress: () => app.push(T.superhub ? 'hub' : 'terminal', T.superhub ? [] : [T.id]) }))) : null);
}
function ResolveSheet({ app, e }) {
  const [note, setNote] = useState('');
  return h('div', { className: 'sheet-pad', style: { display: 'flex', flexDirection: 'column', gap: 12 } },
    h('div', { style: { fontSize: 15, color: 'var(--ink2)' } }, e.what),
    h('textarea', { className: 'note', placeholder: 'What was done? (optional)', value: note, onChange: x => setNote(x.target.value), rows: 4, 'aria-label': 'Resolution note' }),
    h(Btn, { kind: 'primary', icon: 'check', onPress: () => { app.D.resolveEx(e.id, app.role.name, app.D.NOW, note.trim() || 'Resolved from the mobile app.'); haptic(14); app.closeSheet(); app.toast(`${e.id} resolved`); } }, 'Mark as resolved'));
}

// ── Quality ──
export function SampleRow({ app, x }) {
  const T = app.D.term(x.term), tone = x.decision === 'Released' || x.decision === 'Accepted for discharge' ? 'ok' : x.decision === 'On hold' || x.status === 'Failed' ? 'warn' : x.status === 'Passed' ? 'run' : 'idle';
  const label = x.decision !== 'Pending' ? x.decision : x.status === 'Passed' ? 'Ready to release' : x.status === 'Failed' ? 'Failed' : x.status === 'Missing result' ? 'Missing result' : 'In test';
  return h(Row, { onPress: () => app.push('sample', [x.id]), lead: h(Sw, { c: x.code }), title: `${plabel(x.code)} · ${String(x.loc).split(' · ')[0]}`, sub: `${short(T)} · ${x.batch}`, sub2: h(React.Fragment, null, h(StateText, { t: tone === 'run' ? 'ok' : tone }, label), x.at != null ? h('span', { style: { color: 'var(--ink3)' } }, ` · sampled ${when(x.at, T.tz)}`) : null) });
}
function Quality({ p, app }) {
  const D = app.D, tid = p[0], T = tid ? D.term(tid) : null;
  const base = D.SAMPLES.filter(x => !tid || x.term === tid);
  const bad = x => x.status === 'Failed' || x.decision === 'On hold';
  const is = { ready: x => x.decision === 'Pending' && x.status === 'Passed', test: x => x.decision === 'Pending' && x.status !== 'Passed' && !bad(x), fail: bad, done: x => x.decision !== 'Pending' && !bad(x), all: () => true };
  const n = k => base.filter(is[k]).length, [f, setF] = useMem('f', n('ready') ? 'ready' : 'test');
  const list = base.filter(is[f]).sort((a, b) => b.at - a.at);
  return h(Screen, { title: 'Quality', navTitle: T ? `${short(T)} quality` : 'Quality', large: true, sub: `${T ? short(T) + ' · ' : ''}${n('ready')} ready to release · ${n('test')} in test` },
    h(Chips, { value: f, onChange: setF, label: 'Sample filter', items: [['ready', 'Ready to release', n('ready')], ['test', 'In test', n('test')], ['fail', 'Failed or held', n('fail')], ['done', 'Decided', n('done')], ['all', 'All', base.length]] }),
    h(Section, null, list.length ? h(Group, null, ...list.map(x => h(SampleRow, { key: x.id, app, x }))) : h(Empty, { icon: 'shield', title: 'Nothing here', text: 'Samples appear when receipts and blends are tested.' })),
    !T ? h(Section, { title: 'Maiza Lubrika', small: true }, h(Group, null, h(Row, { icon: 'lab', iconBg: '#1f8a8a', title: 'Superhub laboratory', sub: 'Release tests for blends, receipts and ISO tanks', onPress: () => app.push('hubArea', ['lab']) }))) : null);
}
function Sample({ p, app }) {
  const D = app.D, x = D.SAMPLES.find(s => s.id === p[0]);
  if (!x) return h(Screen, { title: 'Sample' }, h(Empty, { icon: 'shield', title: 'Sample no longer listed' }));
  const T = D.term(x.term), tz = T.tz, P = prod(x.code), perm = app.perm, pending = x.decision === 'Pending';
  const k = x.link && x.link.type === 'tank' ? T.tanks.find(t => t.id === x.link.id) : null;
  const decide = (decision, msg) => { x.decision = decision; x.by = { who: `${app.role.name} · ${app.role.label}`, at: D.NOW }; haptic(14); app.toast(msg); };
  const release = () => { if (k && k.batch === x.batch) k.q = 'Released'; const b = D.BLENDS.find(y => y.id === x.batch); if (b) b.state = 'Released'; decide('Released', `${x.batch} released`); };
  const hold = () => { const kk = T.tanks.find(y => y.batch === x.batch); if (kk) kk.q = 'On hold'; const b = D.BLENDS.find(y => y.id === x.batch); if (b) b.state = 'On hold'; decide('On hold', `${x.batch} placed on hold`); };
  const canRel = perm.release && pending && x.status === 'Passed', canHold = perm.release && pending && x.status !== 'Pending';
  const foot = pending ? h('div', null, canRel || canHold ? h('div', { className: 'btns' }, canHold ? h(Btn, { kind: canRel ? 'secondary' : 'danger', icon: 'hold', onPress: hold }, 'Hold') : null, canRel ? h(Btn, { kind: 'ok', icon: 'check', onPress: release }, 'Release') : null)
    : h('div', { className: 'lock' }, ic('lock', 16, { w: 2 }), perm.release ? 'Results are still coming in' : 'Releasing needs the quality officer role')) : null;
  const passed = x.tests.filter(t => t.status === 'Passed').length;
  return h(Screen, { title: plabel(x.code), navTitle: x.id.replace(/^S-/, ''), large: true, kicker: h('span', { className: 'mono' }, x.id), sub: `${T.name} · ${x.loc}`, foot },
    h(Section, null, h('div', { className: 'card' }, h('div', { className: 'split' }, h(Ring, { v: passed / Math.max(1, x.tests.length), size: 72, w: 7, color: x.status === 'Failed' ? 'var(--crit)' : x.status === 'Passed' ? 'var(--ok)' : 'var(--acc)', label: `${passed} of ${x.tests.length} tests passed` }, h('b', { className: 'num', style: { fontSize: 17 } }, `${passed}/${x.tests.length}`)),
      h('div', { style: { minWidth: 0 } }, h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } }, h(Pill, { t: toneOf(x.status) }, `Tests: ${x.status === 'Pending' ? 'in progress' : x.status.toLowerCase()}`), h(Pill, { t: x.decision === 'Pending' ? 'idle' : toneOf(x.decision) }, `Decision: ${x.decision.toLowerCase()}`)), h('div', { className: 'row-s', style: { marginTop: 8 } }, `Sampled ${when(x.at, tz)} · ${x.lab}`), x.by ? h('div', { className: 'row-s' }, `Decided by ${x.by.who} · ${when(x.by.at, tz)}`) : null)))),
    h(Section, { title: 'Results', small: true }, h(Group, null, ...x.tests.map((t, i) => h(Row, { key: i, lead: h('span', { style: { color: t.status === 'Passed' ? 'var(--ok)' : t.status === 'Failed' ? 'var(--crit)' : 'var(--ink4)' } }, ic(t.status === 'Passed' ? 'check' : t.status === 'Failed' ? 'close' : 'clock', 20, { w: 2.4 })), title: t.prop, sub: `${t.method} · spec ${t.spec}`, value: t.result == null ? null : `${typeof t.result === 'number' ? fmt(t.result, t.result % 1 ? 1 : 0) : t.result}${t.unit ? ' ' + t.unit : ''}`, valueSub: t.result == null ? null : t.status, plainValue: t.result == null ? 'Pending' : null })))),
    h(Section, { title: 'Batch', small: true }, h(Group, null, h(Row, { icon: 'tag', iconSoft: true, title: x.batch, sub: 'Batch under test', mono: true }), k ? h(Row, { icon: 'tank', iconBg: swatch(k.code), title: `${k.id} · ${plabel(k.code)}`, sub: `${pct(D.stock(k).fill)} full · ${k.q}`, onPress: () => app.push('tank', [T.id, k.id]) }) : null)));
}

// ── Blending ──
function Blending({ app }) {
  const D = app.D, [v, setV] = useMem('v', 'active');
  const is = { active: b => b.state === 'In progress' || b.state === 'Awaiting test results', plan: b => b.state === 'Scheduled' || b.state === 'Draft', done: b => b.state === 'Released' || b.state === 'On hold' };
  const list = D.BLENDS.filter(is[v]).sort((a, b) => (b.start || 0) - (a.start || 0)), n = k => D.BLENDS.filter(is[k]).length;
  const K = D.HUB.state && D.HUB.state.kpi;
  return h(Screen, { title: 'Blending', large: true, sub: `${n('active')} batches active across the network` },
    h(Seg, { value: v, onChange: setV, label: 'Batch state', items: [['active', 'Active', n('active')], ['plan', 'Planned', n('plan')], ['done', 'Done', n('done')]] }),
    h(Section, null, list.length ? h(Group, null, ...list.map(b => { const T = D.term(b.term), tr = blendTrf(D, b); const fr = tr && b.state === 'In progress' ? trFrac(tr) : null; return h(Row, { key: b.id, tall: true, onPress: () => app.push('batch', [b.id]), lead: h(Sw, { c: b.code }), title: `${plabel(b.code)} · ${short(T)}`, sub: `${b.mode} · ${kL(b.target)} into ${b.dst}`, sub2: h(StateText, { t: toneOf(b.state) }, b.state), value: fr != null ? pct(fr) : b.start != null ? hm(b.start, T.tz) : null, valueSub: fr != null ? 'blended' : b.start != null ? (b.state === 'Scheduled' || b.state === 'Draft' ? 'start' : 'started') : null }); })) : h(Empty, { icon: 'flask', title: 'No batches', text: 'Batches appear here when they are planned.' })),
    K ? h(Section, { title: 'Maiza Lubrika', small: true }, h(Group, null, h(Row, { icon: 'factory', iconBg: '#1f8a8a', title: 'Superhub blend halls', sub: `${K.blend.inProcess} of 23 blenders busy · ${fmt(K.blend.t)} t today`, onPress: () => app.push('hubArea', ['blend']) }))) : null);
}
const blendTrf = (D, b) => D.TRANSFERS.find(x => /blend/i.test(x.type) && x.term === b.term && x.dst === b.dst && (b.state === 'In progress' ? LIVE.includes(x.state) : true) && x.start === b.start) || (b.state === 'In progress' ? D.TRANSFERS.find(x => /blend/i.test(x.type) && x.term === b.term && x.dst === b.dst && LIVE.includes(x.state)) : null);
function Batch({ p, app }) {
  const D = app.D, b = D.BLENDS.find(x => x.id === p[0]);
  if (!b) return h(Screen, { title: 'Batch' }, h(Empty, { icon: 'flask', title: 'Batch no longer listed' }));
  const T = D.term(b.term), tz = T.tz, P = prod(b.code), tr = blendTrf(D, b), f = tr ? trFrac(tr) : b.state === 'Released' || b.state === 'Awaiting test results' ? 1 : 0;
  const smp = b.sample && D.SAMPLES.find(x => x.id === b.sample), k = T.tanks.find(x => x.id === b.dst);
  return h(Screen, { title: plabel(b.code), navTitle: b.id.replace(/^BLD-/, ''), large: true, kicker: h('span', { className: 'mono' }, b.id), sub: `${T.name} · ${b.mode} blend` },
    h(Section, null, h('div', { className: 'card' }, h('div', { className: 'split' }, h(Ring, { v: f, size: 84, w: 8, color: '#c97a12', label: `${pct(f)} blended` }, h('b', { className: 'num', style: { fontSize: 18 } }, pct(f))),
      h('div', { className: 'figs' }, h(Fig, { l: 'Target', v: fmt(b.target), u: 'kL' }), h(Fig, { l: 'Rate', v: b.rate ? fmt(b.rate) : '—', u: 'kL/h' }), h(Fig, { l: 'Started', v: b.start != null ? hm(b.start, tz) : '—' }), h(Fig, { l: b.end ? 'Finished' : 'Ends', v: b.end ? hm(b.end, tz) : tr && tr.etaMin ? hm(tr.etaMin, tz) : '—' }))))),
    h(Section, { title: 'Recipe', small: true }, h(Group, null, ...b.comps.map((c, i) => h(Row, { key: i, lead: h(Sw, { c: c.c }), title: plabel(c.c), sub: `From ${c.tank}${c.flow ? ' · ' + fmt(c.flow) + ' kL/h' : ''}`, value: kL(c.qty), valueSub: `${pct(c.qty / b.target)}${c.done != null ? ' · ' + pct(c.done / c.qty) + ' in' : ''}`, onPress: T.tanks.some(x => x.id === c.tank) ? () => app.push('tank', [T.id, c.tank]) : undefined })))),
    h(Section, { title: 'Destination and quality', small: true }, h(Group, null, k ? h(Row, { icon: 'tank', iconBg: swatch(k.code), title: `${k.id} · ${plabel(k.code)}`, sub: `${pct(D.stock(k).fill)} full · ${k.status}`, onPress: () => app.push('tank', [T.id, k.id]) }) : null, smp ? h(SampleRow, { app, x: smp }) : h(Row, { icon: 'shield', iconSoft: true, title: 'Release sample', sub: 'Taken when the batch is complete' }), tr ? h(Row, { icon: 'transfer', iconBg: 'var(--acc)', title: tr.id, sub: 'Blend transfer', onPress: () => app.push('transfer', [tr.id]) }) : null)),
    b.created ? h(Section, { small: true, foot: `Planned by ${b.created}` }) : null);
}

// ── Search ──
function Search({ app }) {
  const D = app.D, [q, setQ] = useMem('q', ''), ql = q.trim().toLowerCase();
  const idx = useMemo(() => D.searchIndex(), [Math.floor(app.rev / 10)]);
  const res = ql.length < 1 ? [] : idx.filter(x => `${x.label} ${x.sub} ${x.type}`.toLowerCase().includes(ql)).slice(0, 60);
  const alarms = ql.length < 2 ? [] : openAlarms(D).filter(e => `${e.what} ${e.asset} ${e.id}`.toLowerCase().includes(ql)).slice(0, 8);
  const groups = {}; res.forEach(x => { (groups[x.type] = groups[x.type] || []).push(x); });
  const ICON = { Terminal: 'pin', Tank: 'tank', Transfer: 'transfer', Vessel: 'ship', Batch: 'flask', Sample: 'shield', Blender: 'flask', Line: 'box', Crane: 'crane', Product: 'tag' };
  const go = x => { const [scr, pt] = x.go, f = pt.focus; if (f && f.type === 'tank') app.push('tank', [pt.terminalId, f.id]); else if (f && f.type === 'transfer') app.push('transfer', [f.id]); else if (f && f.type === 'blend') app.push('batch', [f.id]); else if (f && f.type === 'sample') app.push('sample', [f.id]); else if (f && f.type === 'asset') { const s = hubRoute(D, f.id); s ? app.push('hubItem', [s.kind, s.id]) : app.push('hub'); } else if (pt.terminalId) app.push(pt.terminalId === 'MLB' ? 'hub' : 'terminal', pt.terminalId === 'MLB' ? [] : [pt.terminalId]); };
  return h(Screen, { title: 'Search' },
    h('div', { style: { paddingTop: 6 } }, h(SearchField, { value: q, onChange: setQ, placeholder: 'Terminals, tanks, vessels, batches', autoFocus: true })),
    ql ? (res.length || alarms.length ? [alarms.length ? h(Section, { key: 'al', title: 'Alarms', small: true }, h(Group, null, ...alarms.map(e => h(AlarmRow, { key: e.id, app, e })))) : null, ...Object.entries(groups).map(([type, l]) => h(Section, { key: type, title: `${type}s`, small: true }, h(Group, null, ...l.slice(0, 12).map((x, i) => h(Row, { key: i, icon: ICON[type] || 'search', iconSoft: true, title: x.label, sub: x.sub, onPress: () => go(x) })))))]
      : h(Empty, { icon: 'search', title: 'No results', text: `Nothing matches “${q}”.` }))
      : h(Section, { title: 'Terminals', small: true }, h(Group, null, ...D.TERMINALS.map(t => h(Row, { key: t.id, icon: t.superhub ? 'factory' : 'pin', iconSoft: true, title: t.name, sub: t.area, onPress: () => app.push(t.superhub ? 'hub' : 'terminal', t.superhub ? [] : [t.id]) })))));
}

// ── More and settings ──
function More({ app }) {
  const D = app.D, wait = D.SAMPLES.filter(x => x.decision === 'Pending').length, act = D.BLENDS.filter(b => b.state === 'In progress' || b.state === 'Awaiting test results').length, S = D.HUB.state, initials = app.role.name.split(/[ .]+/).filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase();
  return h(Screen, { title: 'More', large: true },
    h(Section, null, h(Press, { className: 'card press', onPress: () => app.sheet({ title: 'Signed-in role', body: () => h(RolePick, { app }) }), label: 'Change role' }, h('div', { style: { display: 'flex', gap: 14, alignItems: 'center' } }, h('span', { className: 'avatar' }, initials),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { className: 'row-t strong', style: { fontSize: 19 } }, app.role.name), h('div', { className: 'row-s' }, app.role.label)), h('span', { className: 'chev' }, ic('chevR', 18, { w: 2.2 }))))),
    h(Section, { title: 'Operations', small: true }, h(Group, null,
      h(Row, { icon: 'shield', iconBg: '#3d9638', title: 'Quality', sub: 'Samples, results and release', value: wait ? String(wait) : null, valueSub: wait ? 'waiting' : null, onPress: () => app.push('quality') }),
      h(Row, { icon: 'flask', iconBg: '#c97a12', title: 'Blending', sub: 'Batches across the network', value: act ? String(act) : null, valueSub: act ? 'active' : null, onPress: () => app.push('blending') }),
      h(Row, { icon: 'factory', iconBg: '#1f8a8a', title: 'Maiza Lubrika', sub: 'Lubricant superhub, Kendal', value: S && S.kpi ? pct(S.kpi.out.pct) : null, valueSub: 'of plan', onPress: () => app.push('hub') }))),
    h(Section, { title: 'App', small: true }, h(Group, null,
      h(Row, { icon: 'sliders', iconBg: '#6b737c', title: 'Settings', sub: 'Appearance, motion and alerts', onPress: () => app.push('settings') }),
      app.install ? h(Row, { icon: 'install', iconBg: 'var(--acc)', title: 'Install the app', sub: 'Add to your home screen', onPress: () => app.install() }) : app.ios && !app.standalone ? h(Row, { icon: 'install', iconBg: 'var(--acc)', title: 'Add to Home Screen', sub: 'Run it full screen on your iPhone', onPress: () => app.sheet({ title: 'Install on iPhone', body: IosInstall }) }) : null,
      h(Row, { icon: 'monitor', iconBg: '#3b4450', title: 'Desktop console', sub: 'The full operations console', onPress: () => window.open('../Terminal%20Network.dc.html', '_blank'), chevron: false, right: h('span', { style: { color: 'var(--ink4)' } }, ic('ext', 18, { w: 2 })) }))),
    h(Section, { small: true, foot: `Terminal Network · live data refreshed every 3 seconds · ${D.SNAPSHOT}` }));
}
function RolePick({ app }) {
  return h('div', null, h('div', { className: 'grp' }, ...Object.entries(ROLES).map(([id, r]) => h('button', { key: id, className: 'opt', onClick: () => { app.setPref('role', id); app.closeSheet(); app.toast(`Signed in as ${r.label.split(' ·')[0].toLowerCase()}`); } },
    h('span', { style: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 } }, h('span', null, r.label), h('span', { style: { fontSize: 13.5, color: 'var(--ink3)' } }, r.name)), app.roleId === id ? h('span', { className: 'ck' }, ic('check', 20, { w: 2.4 })) : null))),
    h('div', { className: 'grp-f' }, 'The role decides which actions you can take, such as acknowledging alarms or releasing batches.'));
}
function Settings({ app }) {
  const pr = app.prefs, opt = (k, v, l, sub) => h('button', { key: v, className: 'opt', onClick: () => { haptic(4); app.setPref(k, v); } }, h('span', { style: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 } }, h('span', null, l), sub ? h('span', { style: { fontSize: 13.5, color: 'var(--ink3)' } }, sub) : null), pr[k] === v ? h('span', { className: 'ck' }, ic('check', 20, { w: 2.4 })) : null);
  return h(Screen, { title: 'Settings', large: true },
    h(Section, { title: 'Appearance', small: true }, h('div', { className: 'grp' }, opt('theme', 'system', 'Match the phone', `Now ${app.theme}`), opt('theme', 'light', 'Light'), opt('theme', 'dark', 'Dark'))),
    h(Section, { title: 'Motion', small: true, foot: 'Reduced motion swaps slides and springs for quick fades.' }, h('div', { className: 'grp' }, opt('motion', 'system', 'Match the phone'), opt('motion', 'on', 'Full motion'), opt('motion', 'off', 'Reduced motion'))),
    h(Section, { title: 'Alerts', small: true, foot: 'A banner slides in when a new alarm is raised anywhere in the network.' }, h('div', { className: 'grp' }, h('button', { className: 'opt', role: 'switch', 'aria-checked': pr.banners ? 'true' : 'false', onClick: () => { haptic(5); app.setPref('banners', !pr.banners); } }, h('span', null, 'Alarm banners'), h(Switch, { on: pr.banners })))),
    h(Section, { title: 'Role', small: true }, h(RolePick, { app })));
}
export function Switch({ on }) { return h('span', { className: 'switch', 'aria-checked': on ? 'true' : 'false', 'aria-hidden': true, style: { marginLeft: 'auto' } }, h('i')); }

// ── registry and back-button titles ──
export const SCREENS = { overview: Overview, terminals: Terminals, terminal: Terminal, tank: Tank, transfers: Transfers, transfer: Transfer, alarms: Alarms, alarm: Alarm, quality: Quality, sample: Sample, blending: Blending, batch: Batch, search: Search, more: More, settings: Settings, ...HUB_SCREENS };
export function titleOf(D, e) {
  const p = e.p || [];
  switch (e.s) {
    case 'overview': return 'Overview'; case 'terminals': return 'Terminals'; case 'alarms': return 'Alarms'; case 'more': return 'More'; case 'settings': return 'Settings'; case 'search': return 'Search';
    case 'transfers': return p[0] ? `${short(D.term(p[0]))} transfers` : 'Transfers'; case 'quality': return 'Quality'; case 'blending': return 'Blending';
    case 'terminal': return short(D.term(p[0])); case 'tank': return p[1]; case 'transfer': return p[0]; case 'alarm': return p[0]; case 'sample': return 'Sample'; case 'batch': return 'Batch';
    default: return hubTitle(D, e) || 'Back';
  }
}
