// Terminal schematic — illustrative operational view, flat HMI style (grey field, colour reserved for state and product).
// Every label is fitted with real text measurement (whatever font the browser ends up using), so labels never collide;
// elements carry stable keys so selection, hover and live updates transition smoothly instead of being re-created.
export const W = 1400, H = 800;
const RY = 392, DY = 416;
const TX0 = 372, TX1 = 1150;
const ROADX = 322; // road-tanker receipt inlet on the land side of marine terminals
const MONO = "'Overpass Mono', monospace", SANS = "'Barlow', sans-serif";
const PAL = {
  light: { bg: '#dcdfe2', bund: '#d3d7da', bundBd: '#9ea4aa', water: '#c6d0d8', waterBd: '#9eabb6', quay: '#b9bec3', pipe: '#9aa0a6', head: '#878e95', act: '#2f353b', sel: '#1f63c4', selSoft: 'rgba(31,99,196,.14)', selSoft0: 'rgba(31,99,196,0)', pause: '#c27a00', txt: '#23272b', mute: '#5b636b', faint: '#7d858c', shell: '#f4f5f6', shellBd: '#4f565d', liquidA: 0.78, eq: '#f4f5f6', eqBd: '#5b636b', run: '#23272b', warn: '#e89412', crit: '#cf3b2e', hatch: 'rgba(0,0,0,.30)', hullFill: '#eef0f1', bayLine: '#c3c8cd', truck: '#4a5158' },
  dark: { bg: '#24282c', bund: '#2a2e33', bundBd: '#4b5259', water: '#1e2a33', waterBd: '#3a4b58', quay: '#3a4046', pipe: '#4f565d', head: '#5d656d', act: '#d9dde1', sel: '#7fb0ff', selSoft: 'rgba(127,176,255,.16)', selSoft0: 'rgba(127,176,255,0)', pause: '#f2a531', txt: '#e5e8eb', mute: '#a4abb2', faint: '#7f878f', shell: '#353a40', shellBd: '#a3aab1', liquidA: 0.85, eq: '#30353a', eqBd: '#a3aab1', run: '#e5e8eb', warn: '#f2a531', crit: '#e5544a', hatch: 'rgba(0,0,0,.38)', hullFill: '#2f353b', bayLine: '#3d434a', truck: '#9aa1a8' },
};
// Motion: the shell's shared timing (with fallbacks). [data-motion="off"] and reduced motion switch all of it off.
const EASE = 'var(--ease-out, cubic-bezier(.2,.7,.2,1))', T_MED = 'var(--t-med, .2s)', T_FAST = 'var(--t-fast, .12s)', T_SLOW = 'var(--t-slow, .32s)';
const tx = (...props) => props.map(([p, d]) => `${p} ${d || T_MED} ${EASE}`).join(', ');
const FADE_IN = { animation: `tnfade ${T_MED} ${EASE} both` };

// ── text measurement ────────────────────────────────────────────────────
const MEAS = new Map(); let CTX;
function textW(s, size, wt = 400, fam = SANS) {
  const font = `${wt} ${size}px ${fam}`, key = font + '|' + s;
  let w = MEAS.get(key);
  if (w === undefined) {
    if (CTX === undefined) {
      CTX = null;
      try {
        CTX = document.createElement('canvas').getContext('2d');
        // web fonts arrive after the first paint: forget measurements taken with the fallback font
        if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => MEAS.clear());
      } catch (e) { CTX = null; }
    }
    if (CTX) { CTX.font = font; w = CTX.measureText(s).width; } else w = s.length * size * (fam === MONO ? 0.62 : 0.6);
    if (MEAS.size > 6000) MEAS.clear();
    MEAS.set(key, w);
  }
  return w;
}
// small safety margin: SVG text is shaped at its on-screen size, which can round a little wider than the canvas measure
const FIT_PAD = 1.5;
// longest prefix that fits, with an ellipsis
function clip(s, max, size, wt = 400, fam = SANS) {
  max -= FIT_PAD;
  if (textW(s, size, wt, fam) <= max) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (textW(s.slice(0, m).trimEnd() + '…', size, wt, fam) <= max) lo = m; else hi = m - 1; }
  return lo > 0 ? s.slice(0, lo).trimEnd() + '…' : '';
}
// first candidate text (full wording first, then abbreviations) at the largest size that fits; else the last one clipped
function pick(cands, max, sizes, wt = 400, fam = SANS) {
  for (const s of cands) for (const fs of sizes) if (textW(s, fs, wt, fam) <= max - FIT_PAD) return { s, fs };
  const fs = sizes[sizes.length - 1];
  return { s: clip(cands[cands.length - 1], max, fs, wt, fam), fs };
}
// word wrap by measured width, at most `lines` lines (the last one clipped when text remains)
function wrapW(str, max, size, lines = 9, wt = 400, fam = SANS) {
  const out = []; let cur = '';
  const words = String(str).split(' ');
  words.forEach(w => { const nx = cur ? cur + ' ' + w : w; if (cur && textW(nx, size, wt, fam) > max - FIT_PAD) { out.push(cur); cur = w; } else cur = nx; });
  if (cur) out.push(cur);
  if (out.length > lines) { const rest = out.slice(lines - 1).join(' '); out.length = lines - 1; out.push(clip(rest, max, size, wt, fam)); }
  return out.map(l => clip(l, max, size, wt, fam));
}

export function layout(D, t) {
  const marine = !!t.marine;
  const nb = t.bunds.length, topN = Math.ceil(nb / 2);
  const rowsB = [t.bunds.slice(0, topN), t.bunds.slice(topN)];
  const maxNom = Math.max(...t.tanks.map(k => k.nominal));
  const ROW = [{ y0: 58, y1: 354 }, { y0: 454, y1: 750 }];
  const tanks = {}, bunds = [];
  rowsB.forEach((row, ri) => {
    const n = row.reduce((a, b) => a + b.tanks.length, 0); if (!n) return;
    const bg = 28, pad = 14;
    const slot = Math.min(150, (TX1 - TX0 - bg * (row.length - 1) - pad * 2 * row.length) / n);
    const { y0, y1 } = ROW[ri];
    const wMax = Math.min(104, slot - 26);
    const base = y1 - 82;
    const rowW = n * slot + bg * (row.length - 1) + pad * 2 * row.length;
    // tag density follows the slot width: roomy slots get larger type and line spacing
    const wide = slot >= 128;
    const tagDy = wide ? [0, 19, 36, 52] : [0, 18, 34, 49];
    let x = TX0 + (TX1 - TX0 - rowW) / 2;
    row.forEach(b => {
      const ks = b.tanks.map(id => t.tanks.find(z => z.id === id));
      const w = slot * ks.length + pad * 2;
      bunds.push({ id: b.id, x, y: y0, w, h: y1 - y0, row: ri, codes: [...new Set(ks.map(k => D.prod(k.code).short))], nom: ks.reduce((a, k) => a + k.nominal, 0), n: ks.length });
      ks.forEach((k, i) => {
        const s0 = x + pad + slot * i, cx = s0 + slot / 2;
        const f = Math.sqrt(k.nominal / maxNom);
        const tw = Math.max(34, wMax * f), th = 58 + 62 * f;
        const tagY = base + 16;
        tanks[k.id] = { k, cx, tw, th, x0: cx - tw / 2, x1: cx + tw / 2, top: base - th, base, slot, s0, row: ri, gapX: s0 + slot, nozX: cx + tw / 2, nozY: base - 6, tagY, tagW: slot - 14, wide, tagDy, frameB: tagY + tagDy[3] + 7 };
      });
      x += w + bg;
    });
  });
  const eqs = D.equipment(t);
  const pumps = eqs.filter(e => e.type === 'Pump');
  const off = pumps.length < 4 ? 26 * (4 - pumps.length) : 0;
  const pys = pumps.map((p, i) => 326 + off + i * 52);
  const outTop = t.truck ? { id: 'GTY', kind: 'gantry', x: 1296, y: 92, w: 88, h: 214 } : null;
  const lowerKind = t.hydrant ? 'hydrant' : t.pipeOut ? 'pipeout' : t.shipOut ? 'ship' : null;
  let outBot = lowerKind ? { id: lowerKind === 'hydrant' ? 'HYD' : lowerKind === 'pipeout' ? 'PL-OUT' : 'SHIP', kind: lowerKind, x: 1296, y: 560, w: 88, h: 132 } : null;
  let top = outTop; if (!top && outBot) { top = { ...outBot, y: 92, h: 214 }; outBot = null; }
  const blend = !!t.blend;
  const pr = pumps.map((p, i) => {
    let out = top ? 'top' : 'none';
    if (outBot && i >= Math.ceil(pumps.length / 2)) out = 'bot';
    if (blend && i === pumps.length - 1) out = 'blend';
    const node = out === 'top' ? top : out === 'bot' ? outBot : null;
    const ey = out === 'top' ? top.y + 40 + i * 30 : out === 'bot' ? outBot.y + 36 + (i - Math.ceil(pumps.length / 2)) * 24 : 0;
    return { id: p.id, py: pys[i], lx: 1266 + i * 6, out, ey, node };
  });
  const bc = (t.marine || []).length;
  const by = bc === 1 ? [400] : bc === 2 ? [228, 576] : [150, 400, 650];
  const hl = bc === 1 ? 360 : bc === 2 ? 290 : 200;
  const meters = eqs.filter(e => e.type === 'Flow meter');
  const berths = (t.marine || []).map((name, i) => ({ name, y: by[i], len: hl, arm: 'MLA-' + (i + 1), meter: (meters[i] || meters[0] || {}).id }));
  return { marine, tanks, bunds, eqs, pumps, pys, pr, top, bot: outBot, blend, berths, meters };
}

export function route(L, tr) {
  const into = id => { const a = L.tanks[id]; return a ? [[a.gapX, RY], [a.gapX, a.nozY], [a.nozX, a.nozY]] : []; };
  const outOf = id => { const a = L.tanks[id]; return a ? [[a.nozX, a.nozY], [a.gapX, a.nozY], [a.gapX, DY]] : []; };
  if (tr.marine) { const b = L.berths.find(x => x.name === tr.berth) || L.berths[0]; if (!b) return []; return [[[150, b.y], [300, b.y], [300, RY], [344, RY], ...into(tr.dst)]]; }
  // road tankers unload on the land side; at a marine terminal the left edge is the harbour, so they come in from below
  if (tr.type === 'Road receipt' && L.marine) return [[[ROADX, H - 26], [ROADX, RY], [344, RY], ...into(tr.dst)]];
  if (tr.type === 'Pipeline receipt' || tr.type === 'Road receipt') return [[[20, RY], [344, RY], ...into(tr.dst)]];
  const p = L.pr.find(x => x.id === tr.pump) || L.pr[0]; if (!p) return [];
  const srcs = tr.srcs || [[tr.src, 1]];
  const toPump = [[1176, DY], [1200, DY], [1200, p.py], [1208, p.py]];
  if (tr.type.includes('blend')) return srcs.map(([sid]) => [...outOf(sid), ...toPump, [1236, p.py], [1248, p.py], [1248, 594], [1236, 594], [1236, 628], [1160, 628], [1160, RY], ...into(tr.dst)]);
  const tgt = p.node ? p : (tr.node === 'gantry' ? L.pr.find(x => x.out === 'top') : L.pr.find(x => x.out === 'bot') || L.pr.find(x => x.out === 'top')) || p;
  return srcs.map(([sid]) => [...outOf(sid), ...toPump, [1236, p.py], [p.lx, p.py], [p.lx, tgt.ey], [(tgt.node || { x: 1296 }).x, tgt.ey]]);
}

const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
// short forms used only when the full wording does not fit the tag
const SHORT = { 'Receiving · paused': ['Rx paused'], 'Out of service': ['Out of svc'], Dispatching: ['Dispatch'], Released: ['Rel.'], Awaiting: ['Await.'], 'On hold': ['Hold'], 'Temp n/a': ['n/a'] };

export function render(h, D, t, L, o) {
  const C = PAL[o.theme === 'dark' ? 'dark' : 'light'];
  const K = [];
  const P = (key, pp, st) => h('polyline', { key, points: pts(pp), fill: 'none', strokeLinejoin: 'miter', strokeLinecap: 'square', ...st });
  const T = (key, x, y, s, st = {}) => h('text', { key, x, y, fontFamily: SANS, fontSize: 12, fill: C.mute, ...st }, s);
  const dim = o.focus.size > 0;
  const pipe = (key, pp, header) => K.push(P(key, pp, { stroke: header ? C.head : C.pipe, strokeWidth: header ? 4 : 2, style: { opacity: dim ? 0.55 : 1, transition: tx(['opacity']) } }));
  const late = []; // drawn above the movement lines (labelled boxes the routes run into)

  K.push(h('defs', { key: 'defs' },
    h('pattern', { id: 'tnHold', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: C.hatch, strokeWidth: 2.2 }))));
  K.push(h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: C.bg }));

  // equipment group: a pressable box with a stroke that eases to the selection colour
  const stroke = id => { const e = L.eqs.find(x => x.id === id); if (o.selEq === id) return C.sel; if (e && /Comms|Fault/.test(e.status)) return C.warn; return C.eqBd; };
  const sw = id => o.selEq === id ? 2.2 : 1.2;
  const eqSt = id => ({ stroke: stroke(id), strokeWidth: sw(id), transition: tx(['stroke'], ['stroke-width'], ['fill']) });
  const G = (id, kids, label) => { const e = L.eqs.find(x => x.id === id); return h('g', { key: 'eq-' + id, style: { cursor: 'pointer', transition: tx(['transform', T_FAST], ['opacity']) }, onClick: ev => { ev.stopPropagation(); o.onEq(id); }, onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onEq(id); } }, role: 'button', tabIndex: 0, 'aria-pressed': o.selEq === id, 'aria-label': `${label}${e ? ' · ' + e.status : ''}` }, ...kids, h('title', { key: 'title' }, `${label}${e ? ' · ' + e.status : ''}`)); };

  // marine / inlet zone
  if (L.marine) {
    K.push(h('rect', { key: 'water', x: 0, y: 0, width: 214, height: H, fill: C.water }));
    K.push(h('rect', { key: 'quay', x: 214, y: 0, width: 10, height: H, fill: C.quay }));
    K.push(h('line', { key: 'quayline', x1: 214, x2: 214, y1: 0, y2: H, stroke: C.waterBd, strokeWidth: 1 }));
    K.push(T('basin', 14, 24, 'Harbour basin', { fill: C.faint }));
    L.berths.forEach((b, bi) => {
      const kb = 'b' + bi + '-';
      const tr = D.TRANSFERS.find(x => x.term === t.id && x.marine && x.berth === b.name && (x.active || x.state === 'Delayed'));
      const y0 = b.y - b.len / 2, y1 = b.y + b.len / 2, cx = 62;
      K.push(h('rect', { key: kb + 'jetty', x: 150, y: b.y - 4, width: 64, height: 8, fill: C.quay, stroke: C.bundBd, strokeWidth: 0.8 }));
      K.push(h('rect', { key: kb + 'plat', x: 112, y: b.y - 30, width: 38, height: 60, fill: C.quay, stroke: C.bundBd, strokeWidth: 0.8 }));
      // berth name sits clear of the hull (right of x = 90) and inside the basin
      const bn = clip(b.name, 210 - 96, 12, 600), bnw = textW(bn, 12, 600);
      K.push(T(kb + 'name', bnw <= 70 ? 131 - bnw / 2 : 96, b.y - 38, bn, { fill: C.txt, fontWeight: 600 }));
      const hull = `${cx},${y0} ${cx + 28},${y0 + 40} ${cx + 28},${y1 - 8} ${cx + 22},${y1} ${cx - 22},${y1} ${cx - 28},${y1 - 8} ${cx - 28},${y0 + 40}`;
      if (tr) {
        const p = D.prod(tr.code);
        K.push(h('polygon', { key: kb + 'hull', points: hull, fill: C.hullFill, stroke: C.shellBd, strokeWidth: 1.2, strokeDasharray: 'none' }));
        const c0 = y0 + 52, c1 = y1 - 46, n = 6, step = (c1 - c0) / n;
        const m = tr.comp.match(/(\d)\s*[–-]\s*(\d)/); const act = new Set();
        if (m) { for (let i = +m[1]; i <= +m[2]; i++) { act.add(i + 'P'); act.add(i + 'S'); } } else (tr.comp.match(/\d[PSC]/g) || []).forEach(x => { act.add(x); if (x.endsWith('C')) { act.add(x[0] + 'P'); act.add(x[0] + 'S'); } });
        for (let i = 0; i < n; i++) ['P', 'S'].forEach((sd, j) => { const on = act.has((i + 1) + sd); K.push(h('rect', { key: kb + 'c' + i + sd, x: j ? cx + 1 : cx - 23, y: c0 + i * step + 1, width: 22, height: step - 2, fill: on ? p.color : 'none', fillOpacity: on ? 0.55 : 0, stroke: C.bundBd, strokeWidth: 0.8 })); });
        K.push(h('rect', { key: kb + 'deck', x: cx - 18, y: y1 - 38, width: 36, height: 26, fill: C.quay, stroke: C.bundBd }));
        // vertical vessel name: fitted to the hull length (smaller type first, then an ellipsis)
        const vn = pick([tr.vessel], b.len - 90, [12.5, 11.5, 11], 600);
        K.push(h('text', { key: kb + 'vessel', x: cx, y: (c0 + c1) / 2, transform: `rotate(-90 ${cx} ${(c0 + c1) / 2})`, textAnchor: 'middle', dominantBaseline: 'middle', fontFamily: SANS, fontSize: vn.fs, fontWeight: 600, fill: C.txt, paintOrder: 'stroke', stroke: C.hullFill, strokeWidth: 5 }, vn.s, vn.s !== tr.vessel ? h('title', null, tr.vessel) : null));
        const voy = clip(`${tr.voyage} · ${tr.state}`, 204, 11), vw = textW(voy, 11);
        K.push(T(kb + 'voy', Math.max(5 + vw / 2, Math.min(209 - vw / 2, cx)), y1 + 18, voy, { textAnchor: 'middle', fontSize: 11, fill: tr.state === 'In progress' ? C.mute : C.pause }));
      } else {
        K.push(h('polygon', { key: kb + 'hull', points: hull, fill: 'none', stroke: C.waterBd, strokeWidth: 1, strokeDasharray: '5 4' }));
        K.push(T(kb + 'vacant', cx, b.y + 4, 'Vacant', { textAnchor: 'middle', fill: C.faint }));
      }
      const armSel = o.selEq === b.arm;
      K.push(h('g', { key: 'eq-' + b.arm, style: { cursor: 'pointer', transition: tx(['transform', T_FAST]) }, onClick: ev => { ev.stopPropagation(); o.onEq(b.arm); }, onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onEq(b.arm); } }, role: 'button', tabIndex: 0, 'aria-pressed': armSel, 'aria-label': `${b.name} loading arm ${b.arm}` },
        h('line', { x1: cx + 28, x2: 124, y1: b.y, y2: b.y, style: { stroke: tr && tr.active ? C.act : C.pipe, transition: tx(['stroke']) }, strokeWidth: 2 }),
        h('circle', { cx: 131, cy: b.y, r: 7, fill: C.eq, style: { stroke: armSel ? C.sel : C.eqBd, strokeWidth: armSel ? 2.2 : 1.2, transition: tx(['stroke'], ['stroke-width']) } }),
        h('title', null, `${b.name} · loading arm ${b.arm}`)));
      K.push(T(kb + 'armt', 131, b.y + 22, b.arm, { textAnchor: 'middle', fontSize: 10, fontFamily: MONO, fill: C.faint }));
    });
  } else {
    K.push(T('corridor', 14, 24, 'Pipeline corridor', { fill: C.faint }));
    const sel = o.selEq === 'PL-IN', name = t.pipeIn || 'Pipeline receipt';
    late.push(h('g', { key: 'eq-PL-IN', style: { cursor: 'pointer', transition: tx(['transform', T_FAST]) }, onClick: ev => { ev.stopPropagation(); o.onEq('PL-IN'); }, onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onEq('PL-IN'); } }, role: 'button', tabIndex: 0, 'aria-pressed': sel, 'aria-label': name },
      h('rect', { x: 62, y: RY - 12, width: 58, height: 24, fill: C.eq, style: { stroke: sel ? C.sel : C.eqBd, strokeWidth: sel ? 2.2 : 1.2, transition: tx(['stroke'], ['stroke-width']) } }),
      h('text', { x: 91, y: RY + 4, textAnchor: 'middle', fontFamily: SANS, fontSize: 11, fill: C.txt }, clip('Receiver', 52, 11)), h('title', null, name)));
    wrapW(name, 212, 11.5, 3).forEach((ln, i) => K.push(T('plw' + i, 20, RY + 34 + i * 15, ln, { fontSize: 11.5 })));
  }

  // bunds: the subtitle drops detail (then clips) to stay within its own bund
  L.bunds.forEach(b => {
    K.push(h('rect', { key: 'bund-' + b.id, x: b.x, y: b.y, width: b.w, height: b.h, fill: C.bund, stroke: C.bundBd, strokeWidth: 1.5 }));
    const ty = b.row === 0 ? b.y - 10 : b.y + b.h + 20;
    const title = `Bund ${b.id}`, w0 = textW(title, 12.5, 600);
    K.push(T('bundt-' + b.id, b.x, ty, title, { fill: C.txt, fontWeight: 600, fontSize: 12.5 }));
    const codes = b.codes.join(' / '), tanks = `${b.n} tank${b.n === 1 ? '' : 's'}`, nom = `${D.fmt(b.nom)} kL`;
    const sub = pick([`${codes} · ${tanks} · ${nom} nominal`, `${codes} · ${tanks} · ${nom}`, `${codes} · ${nom}`, codes], b.w - w0 - 10, [11.5]);
    if (sub.s) K.push(T('bunds-' + b.id, b.x + w0 + 8, ty, sub.s, { fontSize: 11.5 }));
  });
  // pipework
  const tanksArr = Object.values(L.tanks);
  tanksArr.forEach(a => pipe('tp-' + a.k.id, [[a.nozX, a.nozY], [a.gapX, a.nozY], [a.gapX, a.row === 0 ? DY : RY]]));
  if (L.marine) {
    L.berths.forEach((b, bi) => pipe('bp-' + bi, [[150, b.y], [300, b.y], [300, RY], [336, RY]]));
    pipe('road', [[ROADX, H - 26], [ROADX, RY]]);
  } else { pipe('pl-a', [[20, RY], [62, RY]]); pipe('pl-b', [[120, RY], [336, RY]]); }
  pipe('hdr-r', [[344, RY], [1160, RY]], true);
  pipe('hdr-d', [[344, DY], [1166, DY]], true);
  if (L.pys.length) { pipe('ph-in', [[1176, DY], [1200, DY]]); pipe('ph-col', [[1200, Math.min(...L.pys)], [1200, Math.max(...L.pys)]]); }
  L.pr.forEach(p => { pipe('pi-' + p.id, [[1200, p.py], [1208, p.py]]); if (p.node) pipe('po-' + p.id, [[1236, p.py], [p.lx, p.py], [p.lx, p.ey], [p.node.x, p.ey]]); if (p.out === 'blend') pipe('pb-' + p.id, [[1236, p.py], [1248, p.py], [1248, 594], [1236, 594]]); });
  if (L.blend) pipe('blend-ret', [[1186, 628], [1160, 628], [1160, RY]]);
  K.push(T('hdr-rt', 358, RY - 9, 'Receipt header', { fontSize: 11, fill: C.faint }));
  K.push(T('hdr-dt', 358, DY + 18, 'Dispatch header', { fontSize: 11, fill: C.faint }));

  // movements: one keyed group per route so dimming eases; the selected route gets an overlay that fades in on top
  const arrows = (key, pp, color, s = 1) => { const out = []; for (let i = 0; i < pp.length - 1; i++) { const [ax, ay] = pp[i], [bx, by] = pp[i + 1]; const len = Math.hypot(bx - ax, by - ay); if (len < 48) continue; const n = Math.max(1, Math.floor(len / 170)); for (let j = 1; j <= n; j++) { const f = j / (n + 1); const ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI; out.push(h('path', { key: key + i + '-' + j, d: `M${-5 * s} ${-4.5 * s}L${4 * s} 0L${-5 * s} ${4.5 * s}Z`, fill: color, transform: `translate(${ax + (bx - ax) * f},${ay + (by - ay) * f}) rotate(${ang})` })); } } return out; };
  const drawn = [];
  o.active.forEach(tr => { const sel = o.selIds.includes(tr.id); route(L, tr).forEach((pp, i) => { if (pp.length) drawn.push({ id: tr.id + '-' + i, pp, sel, paused: tr.state === 'Paused' }); }); });
  drawn.forEach(d => K.push(h('g', { key: 'mv-' + d.id, style: { opacity: dim && !d.sel ? 0.4 : 1, transition: tx(['opacity']) } },
    P('l', d.pp, { stroke: d.paused ? C.pause : C.act, strokeWidth: 2.6, strokeDasharray: d.paused ? '7 5' : undefined }),
    ...(d.paused ? [] : arrows('a', d.pp, C.act, 0.85)))));
  drawn.filter(d => d.sel).forEach(d => K.push(h('g', { key: 'sel-' + d.id, style: FADE_IN },
    P('halo', d.pp, { stroke: C.selSoft, strokeWidth: 12 }),
    P('l', d.pp, { stroke: d.paused ? C.pause : C.sel, strokeWidth: 3.6, strokeDasharray: d.paused ? '7 5' : undefined }),
    // flowing dashes: period 12 divides the 24-unit tnflow offset, so the loop is seamless
    ...(d.paused ? [] : [P('flow', d.pp, { stroke: '#ffffff', strokeWidth: 1.2, strokeDasharray: '3 9', opacity: 0.9, style: { animation: 'tnflow 1.2s linear infinite' } }), ...arrows('a', d.pp, C.sel, 1.15)]))));
  K.push(...late);

  // equipment
  const meter = (id, x, y) => G(id, [h('rect', { key: 'b', x, y: y - 11, width: 34, height: 22, fill: C.eq, style: eqSt(id) }), h('text', { key: 'q', x: x + 17, y: y + 4, textAnchor: 'middle', fontFamily: SANS, fontSize: 10.5, fontWeight: 600, fill: C.txt }, 'FQ'), h('text', { key: 'i', x: x + 17, y: y - 17, textAnchor: 'middle', fontFamily: MONO, fontSize: 10, fill: C.mute }, id)], 'Flow meter ' + id);
  if (L.marine) L.berths.forEach(b => b.meter && K.push(meter(b.meter, 240, b.y)));
  else if (L.meters[0]) K.push(meter(L.meters[0].id, 250, RY));
  if (L.marine) {
    // road-tanker receipt inlet (land side, below the berth meters)
    K.push(h('circle', { key: 'road-c', cx: ROADX, cy: H - 26, r: 4.5, fill: C.eq, stroke: C.eqBd, strokeWidth: 1.2 }));
    K.push(T('road-t', ROADX, H - 9, 'Road receipt', { textAnchor: 'middle', fontSize: 11, fill: C.faint }));
  }
  [['M-01', 336, 'Receipt manifold M-01'], ['M-02', 1160, 'Dispatch manifold M-02']].forEach(([id, x, lab]) => K.push(G(id, [h('rect', { key: 'b', x, y: 372, width: 16, height: 64, fill: C.eq, style: eqSt(id) }), h('path', { key: 'v', d: `M${x + 3} ${RY - 5}l10 10m0 -10l-10 10M${x + 3} ${DY - 5}l10 10m0 -10l-10 10`, stroke: C.eqBd, strokeWidth: 1 }), h('text', { key: 'i', x: x + 8, y: 364, textAnchor: 'middle', fontFamily: MONO, fontSize: 10, fill: C.mute }, id)], lab)));
  if (L.pys.length) {
    const y0 = Math.min(...L.pys) - 30, y1 = Math.max(...L.pys) + 32;
    K.push(h('rect', { key: 'ph', x: 1188, y: y0, width: 70, height: y1 - y0, fill: 'none', stroke: C.bundBd, strokeDasharray: '4 3' }));
    K.push(T('pht', 1188, y0 - 7, 'Pump house', { fontSize: 11.5 }));
    // pump number inside its circle: clear of the risers and the house outline
    L.pr.forEach(p => { const e = L.eqs.find(x => x.id === p.id); const run = e && e.status === 'Running'; K.push(G(p.id, [h('circle', { key: 'c', cx: 1222, cy: p.py, r: 12, style: { fill: run ? C.run : C.eq, ...eqSt(p.id) } }), h('path', { key: 'o', d: `M1222 ${p.py - 12}H1236V${p.py - 6}`, fill: 'none', style: { stroke: stroke(p.id), transition: tx(['stroke']) }, strokeWidth: 1.2 }), h('text', { key: 'i', x: 1222, y: p.py + 3.6, textAnchor: 'middle', fontFamily: MONO, fontSize: 10, fontWeight: 600, style: { fill: run ? C.shell : C.txt, transition: tx(['fill']) } }, p.id.replace('P-0', 'P'))], `Pump ${p.id}`)); });
  }
  const box = (n, kids, label) => K.push(G(n.id, [h('rect', { key: 'b', x: n.x, y: n.y, width: n.w, height: n.h, fill: C.eq, style: eqSt(n.id) }), ...kids], label));
  [L.top, L.bot].filter(Boolean).forEach(n => {
    if (n.kind === 'gantry') {
      const bays = t.truck, bh = (n.h - 12) / bays, act = {};
      D.TRANSFERS.filter(x => x.term === t.id && x.active && x.node === 'gantry').forEach(x => (x.dst.match(/\d+(?:\s*[–-]\s*\d+)?/g) || []).forEach(r => { const [a, b2] = r.split(/[–-]/).map(Number); for (let i = a; i <= (b2 || a); i++) act[i] = 1; }));
      const iso = D.EXCEPTIONS.filter(e => e.term === t.id && e.status !== 'Resolved' && /Gantry bay (\d+)/.test(e.asset)).map(e => +e.asset.match(/Gantry bay (\d+)/)[1]);
      const kids = [h('text', { key: 'lab', x: n.x + n.w, y: n.y - 8, textAnchor: 'end', fontFamily: SANS, fontSize: 11.5, fill: C.mute }, `Gantry · ${bays} bays`)];
      for (let i = 0; i < bays; i++) { const y = n.y + 6 + i * bh, no = i + 1; if (i) kids.push(h('line', { key: 'l' + i, x1: n.x + 4, x2: n.x + n.w - 4, y1: y, y2: y, stroke: C.bayLine })); kids.push(h('text', { key: 't' + i, x: n.x + 8, y: y + bh / 2 + 4, fontFamily: MONO, fontSize: 10, fill: C.mute }, String(no))); if (iso.includes(no)) kids.push(h('path', { key: 'x' + i, d: `M${n.x + 30} ${y + 5}L${n.x + 76} ${y + bh - 5}M${n.x + 76} ${y + 5}L${n.x + 30} ${y + bh - 5}`, stroke: C.crit, strokeWidth: 1.8 })); else if (act[no]) { const th = Math.min(12, bh - 8); kids.push(h('rect', { key: 'c' + i, x: n.x + 28, y: y + bh / 2 - th / 2, width: 48, height: th, fill: C.truck, style: FADE_IN })); } }
      box(n, kids, `Truck loading gantry · ${bays} bays`);
    } else if (n.kind === 'hydrant') {
      const kids = [h('text', { key: 'lab', x: n.x + n.w, y: n.y - 8, textAnchor: 'end', fontFamily: SANS, fontSize: 11.5, fill: C.mute }, 'Hydrant network')];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) kids.push(h('circle', { key: i + '-' + j, cx: n.x + 22 + j * 22, cy: n.y + 32 + i * 28, r: 4.5, fill: 'none', stroke: C.eqBd }));
      box(n, kids, 'Hydrant network supply');
    } else {
      const lab = n.kind === 'pipeout' ? (t.pipeOut || 'Pipeline dispatch') : 'Ship loading via berths';
      box(n, [h('text', { key: 'lab', x: n.x + n.w, y: n.y - 8, textAnchor: 'end', fontFamily: SANS, fontSize: 11.5, fill: C.mute }, n.kind === 'pipeout' ? 'Pipeline out' : 'Ship loading'), h('path', { key: 'ar', d: `M${n.x + 12} ${n.y + 26}H${n.x + n.w - 12}M${n.x + n.w - 18} ${n.y + 20}l6 6-6 6`, stroke: C.eqBd, fill: 'none', strokeWidth: 1.4 }), ...wrapW(lab, n.w - 16, 11, Math.max(1, Math.floor((n.h - 62) / 14))).map((ln, i) => h('text', { key: 'w' + i, x: n.x + 8, y: n.y + 56 + i * 14, fontFamily: SANS, fontSize: 11, fill: C.txt }, ln))], lab);
    }
  });
  if (L.blend) K.push(G('BS-1', [h('rect', { key: 'b', x: 1186, y: 594, width: 90, height: 66, fill: C.eq, style: eqSt('BS-1') }), h('text', { key: 'i', x: 1231, y: 622, textAnchor: 'middle', fontFamily: MONO, fontSize: 11, fontWeight: 600, fill: C.txt }, 'BS-1'), h('text', { key: 'm', x: 1231, y: 640, textAnchor: 'middle', fontFamily: SANS, fontSize: 11, fill: C.mute }, clip(`${t.blend.mode} blend`, 82, 11))], 'Blend skid BS-1'));

  tanksArr.forEach(a => K.push(tank(h, D, a, o, C)));
  const vh = o.view.w * H / W;
  return h('svg', { ref: o.svgRef, viewBox: `${o.view.x} ${o.view.y} ${o.view.w} ${vh}`, width: '100%', style: { display: 'block', aspectRatio: `${W} / ${H}`, background: C.bg, fontVariantNumeric: 'normal' }, role: 'group', 'aria-label': `Illustrative operational schematic of ${t.name}` }, ...K);
}

function tank(h, D, a, o, C) {
  const k = a.k, st = D.stock(k), p = D.prod(k.code);
  const { cx, tw, th, x0, x1, top, base } = a;
  const sel = o.selTank === k.id, rel = o.related.has(k.id), hov = o.hover === k.id;
  const faded = (o.focus.size > 0 && !o.focus.has(k.id)) || (!o.has(k.code) && k.kind !== 'component');
  const E = [];
  const oos = k.status === 'Out of service';
  const fill = Math.min(1, st.fill), ly = base - th * fill;
  // selection / hover frame: always present (it is also the tank's generous hit area) and eased in and out
  const on = sel || hov || rel;
  E.push(h('rect', { key: 'frame', x: a.s0 + 3, y: top - 34, width: a.slot - 6, height: a.frameB - (top - 34), strokeWidth: sel ? 1.6 : 1, strokeDasharray: sel ? undefined : '4 3', style: { fill: sel ? C.selSoft : C.selSoft0, stroke: sel || rel ? C.sel : C.mute, opacity: on ? (sel ? 1 : 0.8) : 0, transition: tx(['opacity'], ['fill'], ['stroke']) } }));
  // shell + liquid (the level eases between live updates)
  E.push(h('rect', { key: 'shell', x: x0, y: top, width: tw, height: th, fill: C.shell }));
  const liq = { y: ly, height: base - ly, transition: tx(['y', T_SLOW], ['height', T_SLOW]) };
  if (!oos && fill > 0) {
    E.push(h('rect', { key: 'liq', x: x0, y: ly, width: tw, height: base - ly, fill: p.color, fillOpacity: C.liquidA, style: liq }));
    if (k.q !== 'Released') E.push(h('rect', { key: 'hold', x: x0, y: ly, width: tw, height: base - ly, fill: 'url(#tnHold)', style: liq }));
    E.push(h('line', { key: 'lvl', x1: x0, x2: x1, y1: ly, y2: ly, stroke: C.shellBd, strokeWidth: 1 }));
  }
  E.push(h('rect', { key: 'outline', x: x0, y: top, width: tw, height: th, fill: 'none', strokeDasharray: oos ? '4 3' : undefined, style: { stroke: sel ? C.sel : C.shellBd, strokeWidth: sel ? 2 : 1.4, transition: tx(['stroke'], ['stroke-width']) } }));
  // roof by type
  if (k.roof.includes('Fixed cone')) E.push(h('path', { key: 'roof', d: `M${x0} ${top}L${cx} ${top - Math.max(5, tw * 0.09)}L${x1} ${top}`, fill: C.shell, stroke: C.shellBd, strokeWidth: 1.4 }));
  else if (k.roof.includes('Dome')) E.push(h('path', { key: 'roof', d: `M${x0} ${top}Q${cx} ${top - tw * 0.18} ${x1} ${top}`, fill: C.shell, stroke: C.shellBd, strokeWidth: 1.4 }));
  else if (k.roof.includes('Internal')) { E.push(h('path', { key: 'roof', d: `M${x0} ${top}L${cx} ${top - Math.max(4, tw * 0.06)}L${x1} ${top}`, fill: C.shell, stroke: C.shellBd, strokeWidth: 1.4 })); if (!oos) E.push(h('line', { key: 'deck', x1: x0 + 3, x2: x1 - 3, y1: ly - 2.5, y2: ly - 2.5, stroke: C.shellBd, strokeWidth: 1, strokeDasharray: '3 2' })); }
  else { E.push(h('line', { key: 'roof', x1: x0 - 3, x2: x1 + 3, y1: top + 5, y2: top + 5, stroke: C.shellBd, strokeWidth: 1.2 })); if (!oos) E.push(h('rect', { key: 'deck', x: x0 + 2, y: ly - 4, width: tw - 4, height: 4, fill: C.shellBd })); }
  // HLA marker
  const hy = base - th * (k.hla / k.nominal);
  E.push(h('path', { key: 'hla', d: `M${x1 + 2} ${hy}l6 -4v8z`, fill: C.mute }));
  // ID + alarm
  E.push(h('text', { key: 'id', x: cx, y: top - 15, textAnchor: 'middle', fontFamily: MONO, fontSize: 12, fontWeight: 600, style: { fill: sel ? C.sel : C.txt, transition: tx(['fill']) } }, k.id));
  const sev = k.alarm ? k.alarm.sev : null;
  if (sev) { const ax = cx + 26, ay = top - 26; E.push(sev === 'critical' ? h('rect', { key: 'alarm', x: ax - 5, y: ay - 1, width: 10, height: 10, transform: `rotate(45 ${ax} ${ay + 4})`, fill: C.crit }) : h('path', { key: 'alarm', d: `M${ax} ${ay - 1}l6.5 11h-13z`, fill: C.warn })); }
  if (k.q === 'On hold') { const ax = cx - 34; E.push(h('rect', { key: 'hold-i', x: ax, y: top - 26, width: 11, height: 11, fill: 'none', stroke: C.txt, strokeWidth: 1.2 })); E.push(h('path', { key: 'hold-b', d: `M${ax + 3.8} ${top - 23}v5M${ax + 7.2} ${top - 23}v5`, stroke: C.txt, strokeWidth: 1.4 })); }
  // tag: each line is measured into the slot (tagW) — full wording at the largest size that fits, then short forms
  const tx0 = a.s0 + 7, tw2 = a.tagW, ty = a.tagY, dy = a.tagDy, wide = a.wide;
  const temp = k.tempSrc === 'unavailable' ? 'Temp n/a' : D.fmt(k.temp, 1) + ' °C';
  const big = o.mode === 'temp' ? temp : o.mode === 'status' ? (k.q === 'Released' ? 'Released' : k.q === 'On hold' ? 'On hold' : 'Awaiting') : Math.round(st.fill * 100) + '%';
  const bigAlt = o.mode === 'temp' && k.tempSrc !== 'unavailable' ? [D.fmt(k.temp, 1) + '°C'] : (SHORT[big] || []);
  const l2 = o.mode === 'temp' ? `${D.fmt(st.level)} mm` : o.mode === 'status' ? (k.activity ? k.activity.ref.replace(/^(TRF|BLD)-[A-Z]+-/, '') : '—') : `${D.fmt(k.vol)} kL`;
  const l3 = k.status;
  const l3c = sev === 'critical' ? C.crit : /Receiving|Dispatching|Blending/.test(l3) ? C.txt : C.mute;
  const f1 = pick([p.short], tw2 - 14, wide ? [12.5, 12] : [12, 11.5], 500);
  const f2 = pick([big, ...bigAlt], tw2, wide ? [16, 15, 14] : [15, 14, 13], 600);
  const f3 = pick([l2], tw2, wide ? [12.5, 12, 11.5] : [12, 11.5, 11]);
  const f4 = pick([l3, ...(SHORT[l3] || [])], tw2, wide ? [12, 11.5, 11] : [11.5, 11]);
  E.push(h('rect', { key: 'sw', x: tx0, y: ty - 9, width: 9, height: 9, fill: p.kind === 'component' ? 'none' : p.color, stroke: p.kind === 'component' ? p.color : 'none', strokeWidth: 1.6 }));
  // the tag text cross-fades when the tag mode changes (its key carries the mode)
  E.push(h('g', { key: 'tag-' + o.mode, style: FADE_IN },
    h('text', { key: 'p', x: tx0 + 14, y: ty, fontFamily: SANS, fontSize: f1.fs, fontWeight: 500, fill: C.mute }, f1.s),
    h('text', { key: 'v', x: tx0, y: ty + dy[1], fontFamily: SANS, fontSize: f2.fs, fontWeight: 600, fill: C.txt }, f2.s),
    h('text', { key: 'l2', x: tx0, y: ty + dy[2], fontFamily: SANS, fontSize: f3.fs, fill: C.txt }, f3.s),
    h('text', { key: 'l3', x: tx0, y: ty + dy[3], fontFamily: SANS, fontSize: f4.fs, fill: l3c }, f4.s)));
  return h('g', { key: 'tank-' + k.term + '-' + k.id, style: { cursor: 'pointer', opacity: faded ? 0.35 : 1, transition: tx(['opacity'], ['transform', T_FAST]) }, onClick: ev => { ev.stopPropagation(); o.onTank(k.id); }, onMouseEnter: () => o.onHover(k.id), onMouseLeave: () => o.onHover(null), onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onTank(k.id); } }, role: 'button', tabIndex: 0, 'aria-pressed': sel, 'aria-label': `${k.id} ${p.label}, ${Math.round(st.fill * 100)}% full, ${D.fmt(k.vol)} kL, ${k.status}, ${k.q}` }, ...E, h('title', { key: 'title' }, `${k.id} · ${p.label} · ${D.fmt(k.vol)} kL (${Math.round(st.fill * 100)}%) · ${k.status} · ${k.q}`));
}
