// Superhub screens for the mobile app: the site at a glance, one screen per area, and asset details. Asset details reuse the
// console's superhub detail content (superhub-ui.js detail()) inside native screens, so both apps show the same facts.
import { h, useState, useMemo, ic, fmt, tn, pct, big, hm, when, ago, prod, swatch, toneOf, Pill, Dot, Sw, Bar, Ring, TankGlyph, Press, Section, Group, Row, Stat, Fig, Seg, Chips, Empty, cx } from './kit.js';
import { Screen } from './shell.js';
import { useMem, AlarmRow } from './screens.js';
import * as SU from '../superhub-ui.js';

const AREAS = [
  ['marine', 'Marine', 'ship', '#2f6fc0'], ['tanks', 'Tank farms', 'tank', '#7a59c9'], ['blend', 'Blending', 'flask', '#c97a12'], ['fill', 'Filling', 'box', '#2a9d74'],
  ['wh', 'Warehouse & gate', 'warehouse', '#3b4450'], ['iso', 'ISO & rail', 'train', '#1d8fd1'], ['lab', 'Quality lab', 'lab', '#3d9638'], ['util', 'Utilities', 'bolt', '#b08a00'], ['events', 'Events', 'history', '#6b737c'],
];
const AREA = Object.fromEntries(AREAS.map(a => [a[0], a]));
const ZONE_AREA = { marine: 'marine', bot: 'tanks', add: 'tanks', fpt: 'tanks', blend: 'blend', grease: 'blend', fill: 'fill', wh: 'wh', docks: 'wh', gate: 'wh', bulk: 'wh', iso: 'iso', stuff: 'iso', rail: 'iso', lab: 'lab', util: 'util' };
const TAB_AREA = { plan: null, marine: 'marine', tanks: 'tanks', blend: 'blend', fill: 'fill', wh: 'wh', iso: 'iso', lab: 'lab', products: null, log: 'events' };
const KIND_LABEL = { vessel: 'Vessel', tank: 'Tank', blender: 'Blender', gunit: 'Grease unit', hopper: 'Hopper', batch: 'Batch', line: 'Line', blow: 'Blow moulder', sample: 'Sample', truck: 'Truck', bay: 'Bay', box: 'Container', crane: 'ISO crane', iso: 'ISO tank', train: 'Train', rmg: 'Rail crane', grade: 'Product', sc: 'Stacker crane', wash: 'Wash bay', jetty: 'Jetty', track: 'Track', slot: 'Yard slot', gaux: 'Equipment', instr: 'Instrument' };
export const hubRoute = (D, id) => SU.resolve(D, id);
export function hubTitle(D, e) { const p = e.p || []; return e.s === 'hub' ? 'Superhub' : e.s === 'hubArea' ? (AREA[p[0]] || [0, 'Area'])[1] : e.s === 'hubItem' ? p[1] : null; }
const tone = s => { const t = SU.tone(s); return t === 'off' ? 'idle' : t; };
const ready = D => D.HUB && D.HUB.state && D.HUB.state.ready;
const Loading = () => h(Screen, { title: 'Superhub' }, h(Empty, { icon: 'factory', title: 'Starting the superhub…' }));

// ── superhub at a glance ──
function Hub({ app }) {
  const D = app.D; if (!ready(D)) return h(Loading);
  const S = D.HUB.state, K = S.kpi, X = S.today, tz = 'WIB', plan = D.HUB.info.PLAN;
  const alarms = D.EXCEPTIONS.filter(e => e.hub && e.status !== 'Resolved').sort((a, b) => (a.sev === 'critical' ? 0 : 1) - (b.sev === 'critical' ? 0 : 1) || b.since - a.since);
  const trainsW = S.trains.filter(t => t.state === 'Working').length, op = K.out.pct;
  const sub = {
    marine: `${K.berths.busy} of 9 berths busy · ${K.berths.anchorage} at anchorage`, tanks: `Base oil ≥ ${Math.min(...K.base.map(b => b.days)).toFixed(1)} days · ${fmt(K.fin.rel)} t finished`,
    blend: `${K.blend.inProcess} of 23 blenders busy · ${fmt(K.blend.t)} t today`, fill: `${K.lines.running} of 34 lines running · ${big(X.units)} units`,
    wh: `${S.gate.onSite} trucks on site · ${S.gate.queue} at the gate`, iso: `${S.iso.occ} of 250 ISO tanks · ${trainsW} train${trainsW === 1 ? '' : 's'} working`,
    lab: `${K.lab.queue} queued · ${K.lab.inTest} in test`, util: `Steam ${S.utilities.steam.demand.toFixed(1)} t/h · ${S.utilities.power.mw.toFixed(1)} MW`, events: `${S.events.length} recent events`,
  };
  return h(Screen, { title: 'Maiza Lubrika', navTitle: 'Superhub', large: true, kicker: h(React.Fragment, null, h(Pill, { t: 'ok' }, 'Operating'), h('span', null, 'Lubricant superhub')), sub: 'Kendal, Jawa Tengah · 2.0 Mt/y' },
    h(Section, null, h('div', { className: 'card' }, h('div', { className: 'split', style: { gap: 18 } },
      h(Ring, { v: op || 0, size: 108, w: 10, color: (op || 0) >= .92 ? 'var(--ok)' : (op || 0) >= .85 ? 'var(--warn)' : 'var(--crit)', label: `Output ${pct(op)} of plan to now` }, h('b', { className: 'num', style: { fontSize: 23, letterSpacing: '-.02em' } }, pct(op)), h('span', { style: { fontSize: 11.5, color: 'var(--ink3)' } }, 'of plan')),
      h('div', { className: 'figs' }, h(Fig, { l: 'Output today', v: fmt(K.out.today), u: 't' }), h(Fig, { l: 'Plan per day', v: fmt(plan), u: 't' }), h(Fig, { l: 'Packed', v: fmt(K.out.pkg), u: 't' }), h(Fig, { l: 'Bulk & ISO', v: fmt(K.out.bulk), u: 't' }))))),
    h(Section, null, h('div', { className: 'grid2' },
      h(Stat, { label: 'Dispatched', icon: 'truck', value: big(K.disp.road + K.disp.rail + K.disp.sea), unit: 't', sub: `road ${big(K.disp.road)} · rail ${big(K.disp.rail)} · sea ${big(K.disp.sea)}`, onPress: () => app.push('hubArea', ['wh']) }),
      h(Stat, { label: 'Blended today', icon: 'flask', value: big(K.blend.t), unit: 't', sub: `${K.blend.batches} batches`, t: 'run', onPress: () => app.push('hubArea', ['blend']) }),
      h(Stat, { label: 'Filling lines', icon: 'box', value: `${K.lines.running}/34`, sub: `OEE ${pct(K.lines.hall.P)} · ${pct(K.lines.hall.D)}`, t: 'run', onPress: () => app.push('hubArea', ['fill']) }),
      h(Stat, { label: 'Warehouse', icon: 'warehouse', value: pct(K.wh.hbw), sub: `drum store ${pct(K.wh.drm)}`, t: Math.max(K.wh.hbw, K.wh.drm) >= .88 ? 'warn' : null, onPress: () => app.push('hubArea', ['wh']) }),
      h(Stat, { label: 'ISO yard', icon: 'train', value: `${S.iso.occ}`, unit: '/250', sub: `${K.iso.fills} fills · ${K.iso.disch} discharges`, onPress: () => app.push('hubArea', ['iso']) }),
      h(Stat, { label: 'Berths', icon: 'ship', value: `${K.berths.busy}/9`, sub: `${K.berths.anchorage} at anchorage · ${K.berths.expected72} due 72 h`, onPress: () => app.push('hubArea', ['marine']) }))),
    alarms.length ? h(Section, { title: `Alarms · ${alarms.length}`, small: true }, h(Group, null, ...alarms.slice(0, 4).map(e => h(AlarmRow, { key: e.id, app, e })))) : null,
    h(Section, { title: 'Areas', small: true }, h(Group, null, ...AREAS.map(([id, l, icn, col]) => h(Row, { key: id, icon: icn, iconBg: col, title: l, sub: sub[id], onPress: () => app.push('hubArea', [id]) })))),
    h(Section, { title: 'Material flow today', small: true }, h('div', { className: 'card' }, h('div', { className: 'figs' },
      h(Fig, { l: 'Received by sea', v: big(K.rec.sea), u: 't' }), h(Fig, { l: 'Rail and road in', v: big(K.rec.rail + K.rec.road + K.rec.iso), u: 't' }),
      h(Fig, { l: 'Base oil re-exported', v: big(K.hub.reexp), u: 't' }), h(Fig, { l: 'Cross-dock pallets', v: big(K.hub.xd), u: 't' }),
      h(Fig, { l: 'Trucks today', v: fmt(X.trucksIn) }), h(Fig, { l: 'Containers stuffed', v: fmt(X.boxes) })))));
}

// ── one area ──
function HubArea({ p, app }) {
  const D = app.D; if (!ready(D)) return h(Loading);
  const a = AREA[p[0]] || AREAS[0], S = D.HUB.state, K = S.kpi, push = (k, id) => app.push('hubItem', [k, id]);
  const [v, setV] = useMem('v', null);
  let body = [];
  if (a[0] === 'marine') {
    const exp = S.vessels.filter(x => x.state === 'Expected' || x.state === 'At anchorage').sort((x, y) => x.eta - y.eta);
    body = [
      h(Section, { key: 'k' }, h('div', { className: 'grid2' }, h(Stat, { label: 'Berths busy', value: `${K.berths.busy}/9` }), h(Stat, { label: 'At anchorage', value: String(K.berths.anchorage), t: K.berths.anchorage > 2 ? 'warn' : null }), h(Stat, { label: 'Received by sea', value: big(K.rec.sea), unit: 't' }), h(Stat, { label: 'Loaded to ships', value: big(S.today.sea), unit: 't' }))),
      h(Section, { key: 'j', title: 'Jetties', small: true }, h(Group, null, ...S.jetties.map(j => { const ves = j.vessel && S.vessels.find(x => x.id === j.vessel), tot = ves ? ves.parcels.reduce((s, q) => s + q.t, 0) : 0, done = ves ? ves.parcels.reduce((s, q) => s + q.done, 0) : 0, fr = ves ? (ves.moves ? ves.moves.done / Math.max(1, ves.moves.planned) : tot ? done / tot : 0) : 0;
        return h(Row, { key: j.id, icon: 'ship', iconBg: ves ? (ves.pause ? 'var(--warn)' : 'var(--acc)') : undefined, iconSoft: !ves, title: ves ? `${j.id} · ${ves.name}` : `${j.id} · free`, sub: ves ? `${ves.label} · ${ves.pause ? ves.pause.reason : ves.state}` : j.role, value: ves ? pct(fr) : null, valueSub: ves ? ves.cls : null, onPress: () => ves ? push('vessel', ves.id) : push('jetty', j.id) }); }))),
      h(Section, { key: 'l', title: `Line-up · ${exp.length}`, small: true }, exp.length ? h(Group, null, ...exp.slice(0, 30).map(x => h(Row, { key: x.id, compact: true, icon: 'ship', iconSoft: true, title: x.name, sub: `${x.label}${x.parcels.length ? ' · ' + big(x.parcels.reduce((s, q) => s + q.t, 0)) + ' t' : ''}`, value: x.state === 'At anchorage' ? 'Anchorage' : when(x.eta), valueSub: x.state === 'At anchorage' ? `since ${hm(x.anchorSince)}` : x.cls, onPress: () => push('vessel', x.id) }))) : h(Empty, { icon: 'ship', title: 'No ships due' })),
    ];
  } else if (a[0] === 'tanks') {
    const g = v || 'BOT', tanks = D.term('MLB').tanks.filter(t => t.zone === g).sort((x, y) => x.id < y.id ? -1 : 1);
    const cov = g === 'BOT' ? K.base : g === 'ADD' ? K.add : null;
    body = [
      h(Seg, { key: 's', value: g, onChange: setV, label: 'Tank group', items: [['BOT', 'Base oil'], ['ADD', 'Additives'], ['FPT', 'Finished'], ['AUX', 'Service']] }),
      cov ? h(Section, { key: 'c', title: 'Cover', small: true, foot: 'Days of stock above heel at today’s blending and re-export use.' }, h(Group, null, ...cov.filter(b => b.t > 0 || g === 'BOT').map(b => h(Row, { key: b.code, compact: true, lead: h(Sw, { c: b.code }), title: (prod(b.code) || {}).label || b.code, sub: `${fmt(b.t)} t`, value: b.days >= 99 ? '99+ d' : `${b.days.toFixed(1)} d`, valueSub: pct(b.pct) + ' full' })))) : null,
      h(Section, { key: 't', title: `Tanks · ${tanks.length}`, small: true }, h(Group, null, ...tanks.map(t => h(Row, { key: t.id, onPress: () => push('tank', t.id), lead: h(TankGlyph, { fill: t.vol / t.nominal, color: swatch(t.code), w: 26, ht: 34, hold: t.q === 'On hold' }), title: `${t.id} · ${t.free ? 'Free · clean' : (prod(t.code) || {}).short || t.code}`, sub: t.free ? 'Swing tank' : `${t.status}${t.q && t.q !== 'Released' ? ' · ' + t.q : ''}`, value: pct(t.vol / t.nominal), valueSub: `${big(t.vol)} kL`, mono: false })))),
    ];
  } else if (a[0] === 'blend') {
    const g = v || 'blenders';
    body = [
      h(Section, { key: 'k' }, h('div', { className: 'grid2' }, h(Stat, { label: 'Blenders busy', value: `${K.blend.inProcess}/23`, t: 'run' }), h(Stat, { label: 'Blended today', value: big(K.blend.t), unit: 't', sub: `${K.blend.batches} batches` }))),
      h(Section, { key: 's' }, h(Seg, { value: g, onChange: setV, label: 'Blending view', items: [['blenders', 'Blenders'], ['batches', 'Batches'], ['grease', 'Grease']] })),
      g === 'blenders' ? h(Section, { key: 'b' }, h(Group, null, ...S.blenders.map(b => { const bt = b.batch; return h(Row, { key: b.id, onPress: () => push('blender', b.id), lead: h(Dot, { t: tone(b.fault ? 'fault' : b.state), pulse: !!bt }), title: `${b.id} · ${bt ? (prod(bt.code) || {}).short || bt.code : 'Idle'}`, sub: bt ? `${b.step || b.state}` : `${b.type} · ${b.hall}`, value: bt ? pct(bt.t ? bt.done / bt.t : 0) : null, valueSub: bt ? `${fmt(bt.t, 1)} t` : null }); })))
      : g === 'batches' ? h(Section, { key: 'bt' }, h(Group, null, ...S.batches.slice(0, 40).map(b => h(Row, { key: b.id, onPress: () => push('batch', b.id), lead: h(Sw, { c: b.code }), title: `${(prod(b.code) || {}).short || b.code}`, sub: `${b.id.replace('BLD-MLB-', '')} · ${b.blender} · ${fmt(b.t, 1)} t`, right: h(Pill, { t: tone(b.state) }, b.state === 'QC hold' ? 'Awaiting release' : b.state) }))))
      : h(Section, { key: 'g' }, h(Group, null, ...S.grease.units.map(u => h(Row, { key: u.id, onPress: () => push('gunit', u.id), lead: h(Dot, { t: tone(u.fault ? 'fault' : u.state), pulse: !!u.batch }), title: `${u.id} · ${u.kind}`, sub: u.batch ? `${(prod(u.batch.code) || {}).short || u.batch.code} · ${u.step}` : u.state })), ...S.grease.hoppers.map(hp => h(Row, { key: hp.id, onPress: () => push('hopper', hp.id), icon: 'drop', iconSoft: true, title: `${hp.id} · hopper`, sub: hp.code ? `${(prod(hp.code) || {}).short || hp.code} · ${hp.q}` : 'Empty', value: hp.code ? `${fmt(hp.t, 1)} t` : null })))),
    ];
  } else if (a[0] === 'fill') {
    const halls = [['P', 'Packaging hall'], ['D', 'Drums & IBC'], ['G', 'Grease filling']];
    body = [
      h(Section, { key: 'k' }, h('div', { className: 'grid2' }, h(Stat, { label: 'Lines running', value: `${K.lines.running}/34`, t: 'run' }), h(Stat, { label: 'Packed today', value: big(K.out.pkg), unit: 't', sub: `${big(S.today.units)} units` }))),
      ...halls.map(([id, l]) => h(Section, { key: id, title: l, small: true }, h(Group, null, ...S.lines.filter(x => x.hall === id).map(x => h(Row, { key: x.id, onPress: () => push('line', x.id), lead: h(Dot, { t: tone(x.state), pulse: x.state === 'Running' }), title: `${x.id}${x.wo ? ' · ' + ((prod(x.wo.code) || {}).short || x.wo.code) : ''}`, sub: x.wo ? `${x.wo.packLabel || x.wo.pack} · ${x.state}` : x.state, value: x.wo ? pct(x.wo.done / Math.max(1, x.wo.units)) : null, valueSub: x.wo ? `${big(x.wo.done)}/${big(x.wo.units)}` : null }))))),
      h(Section, { key: 'bm', title: 'Blow moulding', small: true }, h(Group, null, ...S.blow.map(m => h(Row, { key: m.id, compact: true, onPress: () => push('blow', m.id), lead: h(Dot, { t: m.fault ? 'crit' : m.state === 'Running' ? 'run' : 'idle' }), title: m.id, sub: m.makes === 'bottles' ? '1 L bottles' : '4/5 L cans', plainValue: m.fault ? 'Fault' : m.state })))),
    ];
  } else if (a[0] === 'wh') {
    const trucks = S.trucks.filter(x => x.state !== 'Gone').sort((x, y) => x.arr - y.arr), CLS = { PKG: 'Packaged', BLK: 'Bulk tanker', MAT: 'Materials', UNL: 'Discharge', ISO: 'ISO tank', BOX: 'Empty box', XDK: 'Cross-dock' };
    body = [
      h(Section, { key: 'k' }, h('div', { className: 'grid2' }, h(Stat, { label: 'High-bay store', value: pct(K.wh.hbw), t: K.wh.hbw >= .88 ? 'warn' : null }), h(Stat, { label: 'Drum & IBC store', value: pct(K.wh.drm), t: K.wh.drm >= .88 ? 'warn' : null }), h(Stat, { label: 'Trucks on site', value: String(S.gate.onSite), sub: `${S.gate.queue} queuing · park ${S.gate.park.occ}/220` }), h(Stat, { label: 'Trucks today', value: fmt(S.today.trucksIn), sub: K.ta.PKG ? `packaged ${(K.ta.PKG.avg / 60).toFixed(1)} h turnaround` : null }))),
      h(Section, { key: 't', title: `Trucks on site · ${trucks.length}`, small: true }, h(Group, null, ...trucks.slice(0, 80).map(x => h(Row, { key: x.id, compact: true, onPress: () => push('truck', x.id), icon: 'truck', iconSoft: true, title: `${x.plate} · ${x.cls === 'BLK' && x.base ? 'Re-export' : CLS[x.cls] || x.cls}`, sub: `${x.carrier.replace(/^PT /, '')}${x.bay ? ' · ' + x.bay : ''}`, value: x.state, valueSub: `${Math.round(D.NOW - x.arr)} min on site` })))),
    ];
  } else if (a[0] === 'iso') {
    const g = v || 'cranes';
    body = [
      h(Section, { key: 'k' }, h('div', { className: 'grid2' }, h(Stat, { label: 'ISO yard', value: `${S.iso.occ}`, unit: '/250', t: S.iso.occ >= 225 ? 'warn' : null }), h(Stat, { label: 'Cranes working', value: `${K.iso.busy}/18`, t: 'run' }), h(Stat, { label: 'Fills today', value: String(K.iso.fills) }), h(Stat, { label: 'Rail moves today', value: fmt(K.rail.movesToday) }))),
      h(Section, { key: 's' }, h(Seg, { value: g, onChange: setV, label: 'ISO and rail view', items: [['cranes', 'Cranes'], ['trains', 'Trains'], ['tanks', 'ISO tanks']] })),
      g === 'cranes' ? h(Section, { key: 'c' }, h(Group, null, ...S.isoCranes.map(c => h(Row, { key: c.id, onPress: () => push('crane', c.id), lead: h(Dot, { t: c.fault ? 'crit' : c.iso ? 'run' : 'idle', pulse: !!c.iso }), title: `${c.id} · bay ${c.bay}`, sub: c.iso ? `${c.op === 'fill' ? 'Filling' : 'Discharging'} ${(prod(c.iso.code) || {}).short || c.iso.code}` : c.fault ? 'Fault' : 'Free', plainValue: c.iso ? c.iso.id : null }))))
      : g === 'trains' ? h(Section, { key: 't' }, h(Group, null, ...S.trains.filter(t => t.state !== 'Departed' && t.state !== 'Cancelled').sort((x, y) => x.eta - y.eta).map(t => h(Row, { key: t.id, onPress: () => push('train', t.id), icon: 'train', iconBg: t.state === 'Working' ? 'var(--acc)' : undefined, iconSoft: t.state !== 'Working', title: `${t.id} · ${t.service}`, sub: t.name, value: t.state === 'Expected' ? hm(t.eta) : t.state, valueSub: t.state === 'Working' ? `${Math.round(t.done)}/${t.moves} moves` : t.track || null }))))
      : h(Section, { key: 'i' }, h(Group, null, ...S.isos.filter(x => x.slot >= 0).sort((x, y) => x.cat < y.cat ? -1 : 1).slice(0, 120).map(x => h(Row, { key: x.id, compact: true, onPress: () => push('iso', x.id), icon: 'box', iconSoft: true, title: x.id, sub: `${x.cat} · ${x.code ? (prod(x.code) || {}).short || x.code : 'empty'}`, plainValue: x.loc })))),
    ];
  } else if (a[0] === 'lab') {
    body = [
      h(Section, { key: 'k' }, h('div', { className: 'grid2' }, h(Stat, { label: 'Queued', value: String(K.lab.queue) }), h(Stat, { label: 'In test', value: `${K.lab.inTest}/${S.lab.cap}`, t: 'run' }), h(Stat, { label: 'Turnaround', value: K.lab.tatAvg != null ? (K.lab.tatAvg / 60).toFixed(1) : '—', unit: 'h' }), h(Stat, { label: 'Right first time', value: pct(K.blend.rft) }))),
      h(Section, { key: 's', title: 'Samples', small: true }, h(Group, null, ...S.samples.slice(0, 50).map(x => h(Row, { key: x.id, compact: true, onPress: () => push('sample', x.id), lead: h(Sw, { c: x.code }), title: x.id.replace('S-MLB-', ''), sub: `${x.type} · ${(prod(x.code) || {}).short || x.code}`, right: h(Pill, { t: tone(x.status) }, x.status) })))),
    ];
  } else if (a[0] === 'events') {
    body = [h(Section, { key: 'e' }, h('div', { className: 'feed' }, ...S.events.slice(0, 80).map((e, i) => h('div', { key: i, className: 'feed-i' }, h('time', { className: 'num' }, hm(e.at)), h('span', null, h('b', { style: { fontWeight: 600 } }, e.area), ` · ${e.text}`)))))];
  } else {
    body = [h(Section, { key: 'z' }, h(Embed, { app, st: { zone: a[0] } }))];
  }
  return h(Screen, { title: a[1], large: true, kicker: h('span', null, 'Maiza Lubrika') }, ...body);
}

// ── one asset: the console's detail content in a native screen ──
function HubItem({ p, app }) {
  const D = app.D; if (!ready(D)) return h(Loading);
  const [hv, setHv] = useState({});
  const parts = useParts(app, { sel: { kind: p[0], id: p[1] }, hv }, setHv);
  if (!parts) return h(Loading);
  return h(Screen, { title: parts.title, navTitle: p[1], large: true, kicker: h(React.Fragment, null, h(Dot, { t: parts.t === 'off' ? 'idle' : parts.t }), h('span', null, parts.kicker)), sub: parts.subT },
    h(Section, null, h('div', { className: 'hubx' }, ...parts.body)));
}
function Embed({ app, st }) { const [hv, setHv] = useState({}); const parts = useParts(app, { ...st, hv }, setHv); return parts ? h('div', { className: 'hubx' }, ...parts.body) : null; }
function useParts(app, st, setHv) {
  const D = app.D, I = useMemo(() => D.icons(h), []);
  const ctx = { screen: 'terminal', terminalId: 'MLB', mobile: true, tablet: true, theme: app.theme, I, focus: null, embed: true };
  const act = {
    sel: (kind, id) => app.push('hubItem', [kind, id]), zone: z => app.push('hubArea', [ZONE_AREA[z] || 'util']), tab: t => TAB_AREA[t] ? app.push('hubArea', [TAB_AREA[t]]) : app.push('hub'),
    hover: (key, v) => setHv(x => ({ ...x, [key]: v })), close: () => app.pop(), back: () => app.pop(), set: () => {}, alarms: () => app.switchTab('alarms'),
    go: (screen, patch) => { const f = patch && patch.focus; if (screen === 'transfers' && f && f.id) app.push('transfer', [f.id]); else if (screen === 'quality') app.push('hubArea', ['lab']); else app.push('hub'); },
  };
  return SU.detail(h, D, ctx, st, act);
}

export const HUB_SCREENS = { hub: Hub, hubArea: HubArea, hubItem: HubItem };
