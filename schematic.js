// Terminal schematic — illustrative operational view, flat HMI style (grey field, colour reserved for state and product).
export const W = 1400, H = 800;
const RY = 392, DY = 416;
const TX0 = 372, TX1 = 1150;
const MONO = "'Overpass Mono', monospace", SANS = "'Barlow', sans-serif";
const PAL = {
  light: { bg: '#dcdfe2', bund: '#d3d7da', bundBd: '#9ea4aa', water: '#c6d0d8', waterBd: '#9eabb6', quay: '#b9bec3', pipe: '#9aa0a6', head: '#878e95', act: '#2f353b', sel: '#1f63c4', selSoft: 'rgba(31,99,196,.14)', pause: '#c27a00', txt: '#23272b', mute: '#5b636b', faint: '#7d858c', shell: '#f4f5f6', shellBd: '#4f565d', liquidA: 0.78, eq: '#f4f5f6', eqBd: '#5b636b', run: '#23272b', warn: '#e89412', crit: '#cf3b2e', hatch: 'rgba(0,0,0,.30)', hullFill: '#eef0f1', bayLine: '#c3c8cd', truck: '#4a5158' },
  dark: { bg: '#24282c', bund: '#2a2e33', bundBd: '#4b5259', water: '#1e2a33', waterBd: '#3a4b58', quay: '#3a4046', pipe: '#4f565d', head: '#5d656d', act: '#d9dde1', sel: '#7fb0ff', selSoft: 'rgba(127,176,255,.16)', pause: '#f2a531', txt: '#e5e8eb', mute: '#a4abb2', faint: '#7f878f', shell: '#353a40', shellBd: '#a3aab1', liquidA: 0.85, eq: '#30353a', eqBd: '#a3aab1', run: '#e5e8eb', warn: '#f2a531', crit: '#e5544a', hatch: 'rgba(0,0,0,.38)', hullFill: '#2f353b', bayLine: '#3d434a', truck: '#9aa1a8' },
};

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
    let x = TX0 + (TX1 - TX0 - rowW) / 2;
    row.forEach(b => {
      const ks = b.tanks.map(id => t.tanks.find(z => z.id === id));
      const w = slot * ks.length + pad * 2;
      bunds.push({ id: b.id, x, y: y0, w, h: y1 - y0, row: ri, codes: [...new Set(ks.map(k => D.prod(k.code).short))], nom: ks.reduce((a, k) => a + k.nominal, 0), n: ks.length });
      ks.forEach((k, i) => {
        const s0 = x + pad + slot * i, cx = s0 + slot / 2;
        const f = Math.sqrt(k.nominal / maxNom);
        const tw = Math.max(34, wMax * f), th = 58 + 62 * f;
        tanks[k.id] = { k, cx, tw, th, x0: cx - tw / 2, x1: cx + tw / 2, top: base - th, base, slot, s0, row: ri, gapX: s0 + slot, nozX: cx + tw / 2, nozY: base - 6, tagY: base + 16, tagW: slot - 14 };
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
  if (tr.type === 'Pipeline receipt') return [[[20, RY], [344, RY], ...into(tr.dst)]];
  const p = L.pr.find(x => x.id === tr.pump) || L.pr[0]; if (!p) return [];
  const srcs = tr.srcs || [[tr.src, 1]];
  const toPump = [[1176, DY], [1200, DY], [1200, p.py], [1208, p.py]];
  if (tr.type.includes('blend')) return srcs.map(([sid]) => [...outOf(sid), ...toPump, [1236, p.py], [1248, p.py], [1248, 594], [1236, 594], [1236, 628], [1160, 628], [1160, RY], ...into(tr.dst)]);
  const tgt = p.node ? p : (tr.node === 'gantry' ? L.pr.find(x => x.out === 'top') : L.pr.find(x => x.out === 'bot') || L.pr.find(x => x.out === 'top')) || p;
  return srcs.map(([sid]) => [...outOf(sid), ...toPump, [1236, p.py], [p.lx, p.py], [p.lx, tgt.ey], [(tgt.node || { x: 1296 }).x, tgt.ey]]);
}

const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const fit = (s, px, cw) => { const n = Math.max(3, Math.floor(px / cw)); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const wrap = (str, n) => { const out = []; let cur = ''; str.split(' ').forEach(w => { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) out.push(cur); return out; };

export function render(h, D, t, L, o) {
  const C = PAL[o.theme === 'dark' ? 'dark' : 'light'];
  const K = []; let key = 0; const k = () => 'e' + (key++);
  const P = (pp, st) => h('polyline', { key: k(), points: pts(pp), fill: 'none', strokeLinejoin: 'miter', strokeLinecap: 'square', ...st });
  const T = (x, y, s, st = {}) => h('text', { key: k(), x, y, fontFamily: SANS, fontSize: 12, fill: C.mute, ...st }, s);
  const dim = o.focus.size > 0;
  const pipe = (pp, header) => K.push(P(pp, { stroke: header ? C.head : C.pipe, strokeWidth: header ? 4 : 2, opacity: dim ? 0.55 : 1 }));

  K.push(h('defs', { key: k() },
    h('pattern', { id: 'tnHold', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: C.hatch, strokeWidth: 2.2 }))));
  K.push(h('rect', { key: k(), x: 0, y: 0, width: W, height: H, fill: C.bg }));

  // marine / inlet zone
  if (L.marine) {
    K.push(h('rect', { key: k(), x: 0, y: 0, width: 214, height: H, fill: C.water }));
    K.push(h('rect', { key: k(), x: 214, y: 0, width: 10, height: H, fill: C.quay }));
    K.push(h('line', { key: k(), x1: 214, x2: 214, y1: 0, y2: H, stroke: C.waterBd, strokeWidth: 1 }));
    K.push(T(14, 24, 'Harbour basin', { fill: C.faint }));
    L.berths.forEach(b => {
      const tr = D.TRANSFERS.find(x => x.term === t.id && x.marine && x.berth === b.name && (x.active || x.state === 'Delayed'));
      const y0 = b.y - b.len / 2, y1 = b.y + b.len / 2, cx = 62;
      K.push(h('rect', { key: k(), x: 150, y: b.y - 4, width: 64, height: 8, fill: C.quay, stroke: C.bundBd, strokeWidth: 0.8 }));
      K.push(h('rect', { key: k(), x: 112, y: b.y - 30, width: 38, height: 60, fill: C.quay, stroke: C.bundBd, strokeWidth: 0.8 }));
      K.push(T(131, b.y - 38, b.name, { fill: C.txt, fontWeight: 600, textAnchor: 'middle' }));
      const hull = `${cx},${y0} ${cx + 28},${y0 + 40} ${cx + 28},${y1 - 8} ${cx + 22},${y1} ${cx - 22},${y1} ${cx - 28},${y1 - 8} ${cx - 28},${y0 + 40}`;
      if (tr) {
        const p = D.prod(tr.code);
        K.push(h('polygon', { key: k(), points: hull, fill: C.hullFill, stroke: C.shellBd, strokeWidth: 1.2 }));
        const c0 = y0 + 52, c1 = y1 - 46, n = 6, step = (c1 - c0) / n;
        const m = tr.comp.match(/(\d)\s*[–-]\s*(\d)/); const act = new Set();
        if (m) { for (let i = +m[1]; i <= +m[2]; i++) { act.add(i + 'P'); act.add(i + 'S'); } } else (tr.comp.match(/\d[PSC]/g) || []).forEach(x => { act.add(x); if (x.endsWith('C')) { act.add(x[0] + 'P'); act.add(x[0] + 'S'); } });
        for (let i = 0; i < n; i++) ['P', 'S'].forEach((sd, j) => { const on = act.has((i + 1) + sd); K.push(h('rect', { key: k(), x: j ? cx + 1 : cx - 23, y: c0 + i * step + 1, width: 22, height: step - 2, fill: on ? p.color : 'none', fillOpacity: on ? 0.55 : 0, stroke: C.bundBd, strokeWidth: 0.8 })); });
        K.push(h('rect', { key: k(), x: cx - 18, y: y1 - 38, width: 36, height: 26, fill: C.quay, stroke: C.bundBd }));
        K.push(h('text', { key: k(), x: cx, y: (c0 + c1) / 2, transform: `rotate(-90 ${cx} ${(c0 + c1) / 2})`, textAnchor: 'middle', dominantBaseline: 'middle', fontFamily: SANS, fontSize: 12.5, fontWeight: 600, fill: C.txt, paintOrder: 'stroke', stroke: C.hullFill, strokeWidth: 5 }, tr.vessel));
        K.push(T(cx, y1 + 18, `${tr.voyage} · ${tr.state}`, { textAnchor: 'middle', fontSize: 11, fill: tr.state === 'In progress' ? C.mute : C.pause }));
      } else {
        K.push(h('polygon', { key: k(), points: hull, fill: 'none', stroke: C.waterBd, strokeDasharray: '5 4' }));
        K.push(T(cx, b.y + 4, 'Vacant', { textAnchor: 'middle', fill: C.faint }));
      }
      const armSel = o.selEq === b.arm;
      K.push(h('g', { key: k(), style: { cursor: 'pointer' }, onClick: ev => { ev.stopPropagation(); o.onEq(b.arm); }, role: 'button', tabIndex: 0, 'aria-label': `${b.name} loading arm ${b.arm}` },
        h('line', { x1: cx + 28, x2: 124, y1: b.y, y2: b.y, stroke: tr && tr.active ? C.act : C.pipe, strokeWidth: 2 }),
        h('circle', { cx: 131, cy: b.y, r: 7, fill: C.eq, stroke: armSel ? C.sel : C.eqBd, strokeWidth: armSel ? 2.2 : 1.2 }),
        h('title', null, `${b.name} · loading arm ${b.arm}`)));
      K.push(T(131, b.y + 22, b.arm, { textAnchor: 'middle', fontSize: 10, fontFamily: MONO, fill: C.faint }));
    });
  } else {
    K.push(T(14, 24, 'Pipeline corridor', { fill: C.faint }));
    const sel = o.selEq === 'PL-IN';
    K.push(h('g', { key: k(), style: { cursor: 'pointer' }, onClick: ev => { ev.stopPropagation(); o.onEq('PL-IN'); }, role: 'button', tabIndex: 0, 'aria-label': t.pipeIn || 'Pipeline receipt' },
      h('rect', { x: 64, y: RY - 12, width: 54, height: 24, fill: C.eq, stroke: sel ? C.sel : C.eqBd, strokeWidth: sel ? 2.2 : 1.2 }),
      h('text', { x: 91, y: RY + 4, textAnchor: 'middle', fontFamily: SANS, fontSize: 11, fill: C.txt }, 'Receiver'), h('title', null, t.pipeIn || 'Pipeline receipt')));
    wrap(t.pipeIn || 'Pipeline receipt', 18).forEach((ln, i) => K.push(T(20, RY + 34 + i * 15, ln, { fontSize: 11.5 })));
  }

  // bunds
  L.bunds.forEach(b => {
    K.push(h('rect', { key: k(), x: b.x, y: b.y, width: b.w, height: b.h, fill: C.bund, stroke: C.bundBd, strokeWidth: 1.5 }));
    const ty = b.row === 0 ? b.y - 10 : b.y + b.h + 20;
    K.push(T(b.x, ty, `Bund ${b.id}`, { fill: C.txt, fontWeight: 600, fontSize: 12.5 }));
    K.push(T(b.x + 54, ty, `${b.codes.join(' / ')} · ${b.n} tanks · ${D.fmt(b.nom)} kL nominal`, { fontSize: 11.5 }));
  });
  // pipework
  const tanksArr = Object.values(L.tanks);
  tanksArr.forEach(a => pipe([[a.nozX, a.nozY], [a.gapX, a.nozY], [a.gapX, a.row === 0 ? DY : RY]]));
  if (L.marine) L.berths.forEach(b => pipe([[150, b.y], [300, b.y], [300, RY], [336, RY]]));
  else { pipe([[20, RY], [64, RY]]); pipe([[118, RY], [336, RY]]); }
  pipe([[344, RY], [1160, RY]], true);
  pipe([[344, DY], [1166, DY]], true);
  if (L.pys.length) { pipe([[1176, DY], [1200, DY]]); pipe([[1200, Math.min(...L.pys)], [1200, Math.max(...L.pys)]]); }
  L.pr.forEach(p => { pipe([[1200, p.py], [1208, p.py]]); if (p.node) pipe([[1236, p.py], [p.lx, p.py], [p.lx, p.ey], [p.node.x, p.ey]]); if (p.out === 'blend') pipe([[1236, p.py], [1248, p.py], [1248, 594], [1236, 594]]); });
  if (L.blend) pipe([[1186, 628], [1160, 628], [1160, RY]]);
  K.push(T(352, RY - 8, 'Receipt header', { fontSize: 11, fill: C.faint }));
  K.push(T(352, DY + 17, 'Dispatch header', { fontSize: 11, fill: C.faint }));

  // movements
  const arrows = (pp, color, s = 1) => { for (let i = 0; i < pp.length - 1; i++) { const [ax, ay] = pp[i], [bx, by] = pp[i + 1]; const len = Math.hypot(bx - ax, by - ay); if (len < 48) continue; const n = Math.max(1, Math.floor(len / 170)); for (let j = 1; j <= n; j++) { const f = j / (n + 1); const ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI; K.push(h('path', { key: k(), d: `M${-5 * s} ${-4.5 * s}L${4 * s} 0L${-5 * s} ${4.5 * s}Z`, fill: color, transform: `translate(${ax + (bx - ax) * f},${ay + (by - ay) * f}) rotate(${ang})` })); } } };
  const drawn = [];
  o.active.forEach(tr => { const sel = o.selIds.includes(tr.id); route(L, tr).forEach(pp => { if (pp.length) drawn.push({ pp, sel, paused: tr.state === 'Paused' }); }); });
  drawn.filter(d => !d.sel).forEach(d => { K.push(P(d.pp, { stroke: d.paused ? C.pause : C.act, strokeWidth: 2.6, strokeDasharray: d.paused ? '7 5' : undefined, opacity: dim ? 0.4 : 1 })); if (!d.paused && !dim) arrows(d.pp, C.act, 0.85); });
  drawn.filter(d => d.sel).forEach(d => { K.push(P(d.pp, { stroke: C.selSoft, strokeWidth: 12 })); K.push(P(d.pp, { stroke: d.paused ? C.pause : C.sel, strokeWidth: 3.6, strokeDasharray: d.paused ? '7 5' : undefined })); if (!d.paused) { K.push(P(d.pp, { stroke: '#ffffff', strokeWidth: 1.2, strokeDasharray: '3 13', opacity: 0.9, style: { animation: 'tnflow 1.2s linear infinite' } })); arrows(d.pp, C.sel, 1.15); } });

  // equipment
  const stroke = id => { const e = L.eqs.find(x => x.id === id); if (o.selEq === id) return C.sel; if (e && /Comms|Fault/.test(e.status)) return C.warn; return C.eqBd; };
  const sw = id => o.selEq === id ? 2.2 : 1.2;
  const G = (id, kids, label) => { const e = L.eqs.find(x => x.id === id); return h('g', { key: k(), style: { cursor: 'pointer' }, onClick: ev => { ev.stopPropagation(); o.onEq(id); }, onKeyDown: ev => { if (ev.key === 'Enter') o.onEq(id); }, role: 'button', tabIndex: 0, 'aria-label': `${label}${e ? ' · ' + e.status : ''}` }, ...kids, h('title', null, `${label}${e ? ' · ' + e.status : ''}`)); };
  const meter = (id, x, y) => G(id, [h('rect', { x, y: y - 11, width: 34, height: 22, fill: C.eq, stroke: stroke(id), strokeWidth: sw(id) }), h('text', { x: x + 17, y: y + 4, textAnchor: 'middle', fontFamily: SANS, fontSize: 10.5, fontWeight: 600, fill: C.txt }, 'FQ'), h('text', { x: x + 17, y: y - 17, textAnchor: 'middle', fontFamily: MONO, fontSize: 10, fill: C.mute }, id)], 'Flow meter ' + id);
  if (L.marine) L.berths.forEach(b => b.meter && K.push(meter(b.meter, 240, b.y)));
  else if (L.meters[0]) K.push(meter(L.meters[0].id, 250, RY));
  [['M-01', 336, 'Receipt manifold M-01'], ['M-02', 1160, 'Dispatch manifold M-02']].forEach(([id, x, lab]) => K.push(G(id, [h('rect', { x, y: 372, width: 16, height: 64, fill: C.eq, stroke: stroke(id), strokeWidth: sw(id) }), h('path', { d: `M${x + 3} ${RY - 5}l10 10m0 -10l-10 10M${x + 3} ${DY - 5}l10 10m0 -10l-10 10`, stroke: C.eqBd, strokeWidth: 1 }), h('text', { x: x + 8, y: 364, textAnchor: 'middle', fontFamily: MONO, fontSize: 10, fill: C.mute }, id)], lab)));
  if (L.pys.length) {
    const y0 = Math.min(...L.pys) - 30, y1 = Math.max(...L.pys) + 32;
    K.push(h('rect', { key: k(), x: 1188, y: y0, width: 70, height: y1 - y0, fill: 'none', stroke: C.bundBd, strokeDasharray: '4 3' }));
    K.push(T(1188, y0 - 7, 'Pump house', { fontSize: 11.5 }));
    L.pr.forEach(p => { const e = L.eqs.find(x => x.id === p.id); const run = e && e.status === 'Running'; K.push(G(p.id, [h('circle', { cx: 1222, cy: p.py, r: 12, fill: run ? C.run : C.eq, stroke: stroke(p.id), strokeWidth: sw(p.id) }), h('path', { d: `M1222 ${p.py - 12}H1236V${p.py - 6}`, fill: 'none', stroke: stroke(p.id), strokeWidth: 1.2 }), h('text', { x: 1244, y: p.py + 4, fontFamily: MONO, fontSize: 10, fill: run ? C.txt : C.mute }, p.id.replace('P-0', 'P'))], `Pump ${p.id}`)); });
  }
  const box = (n, kids, label) => K.push(G(n.id, [h('rect', { x: n.x, y: n.y, width: n.w, height: n.h, fill: C.eq, stroke: stroke(n.id), strokeWidth: sw(n.id) }), ...kids], label));
  [L.top, L.bot].filter(Boolean).forEach(n => {
    if (n.kind === 'gantry') {
      const bays = t.truck, bh = (n.h - 12) / bays, act = {};
      D.TRANSFERS.filter(x => x.term === t.id && x.active && x.node === 'gantry').forEach(x => (x.dst.match(/\d+(?:\s*[–-]\s*\d+)?/g) || []).forEach(r => { const [a, b2] = r.split(/[–-]/).map(Number); for (let i = a; i <= (b2 || a); i++) act[i] = 1; }));
      const iso = D.EXCEPTIONS.filter(e => e.term === t.id && e.status !== 'Resolved' && /Gantry bay (\d+)/.test(e.asset)).map(e => +e.asset.match(/Gantry bay (\d+)/)[1]);
      const kids = [h('text', { x: n.x + n.w, y: n.y - 8, textAnchor: 'end', fontFamily: SANS, fontSize: 11.5, fill: C.mute }, `Gantry · ${bays} bays`)];
      for (let i = 0; i < bays; i++) { const y = n.y + 6 + i * bh, no = i + 1; if (i) kids.push(h('line', { key: 'l' + i, x1: n.x + 4, x2: n.x + n.w - 4, y1: y, y2: y, stroke: C.bayLine })); kids.push(h('text', { key: 't' + i, x: n.x + 8, y: y + bh / 2 + 4, fontFamily: MONO, fontSize: 10, fill: C.mute }, String(no))); if (iso.includes(no)) kids.push(h('path', { key: 'x' + i, d: `M${n.x + 30} ${y + 5}L${n.x + 76} ${y + bh - 5}M${n.x + 76} ${y + 5}L${n.x + 30} ${y + bh - 5}`, stroke: C.crit, strokeWidth: 1.8 })); else if (act[no]) { const th = Math.min(12, bh - 8); kids.push(h('rect', { key: 'c' + i, x: n.x + 28, y: y + bh / 2 - th / 2, width: 48, height: th, fill: C.truck })); } }
      box(n, kids, `Truck loading gantry · ${bays} bays`);
    } else if (n.kind === 'hydrant') {
      const kids = [h('text', { x: n.x + n.w, y: n.y - 8, textAnchor: 'end', fontFamily: SANS, fontSize: 11.5, fill: C.mute }, 'Hydrant network')];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) kids.push(h('circle', { key: i + '-' + j, cx: n.x + 22 + j * 22, cy: n.y + 32 + i * 28, r: 4.5, fill: 'none', stroke: C.eqBd }));
      box(n, kids, 'Hydrant network supply');
    } else {
      const lab = n.kind === 'pipeout' ? (t.pipeOut || 'Pipeline dispatch') : 'Ship loading via berths';
      box(n, [h('text', { x: n.x + n.w, y: n.y - 8, textAnchor: 'end', fontFamily: SANS, fontSize: 11.5, fill: C.mute }, n.kind === 'pipeout' ? 'Pipeline out' : 'Ship loading'), h('path', { d: `M${n.x + 12} ${n.y + 26}H${n.x + n.w - 12}M${n.x + n.w - 18} ${n.y + 20}l6 6-6 6`, stroke: C.eqBd, fill: 'none', strokeWidth: 1.4 }), ...wrap(lab, 13).slice(0, 3).map((ln, i) => h('text', { key: 'w' + i, x: n.x + 8, y: n.y + 56 + i * 14, fontFamily: SANS, fontSize: 11, fill: C.txt }, ln))], lab);
    }
  });
  if (L.blend) K.push(G('BS-1', [h('rect', { x: 1186, y: 594, width: 90, height: 66, fill: C.eq, stroke: stroke('BS-1'), strokeWidth: sw('BS-1') }), h('text', { x: 1231, y: 622, textAnchor: 'middle', fontFamily: MONO, fontSize: 11, fontWeight: 600, fill: C.txt }, 'BS-1'), h('text', { x: 1231, y: 640, textAnchor: 'middle', fontFamily: SANS, fontSize: 11, fill: C.mute }, `${t.blend.mode} blend`)], 'Blend skid BS-1'));

  tanksArr.forEach(a => K.push(tank(h, D, a, o, C)));
  const vh = o.view.w * H / W;
  return h('svg', { viewBox: `${o.view.x} ${o.view.y} ${o.view.w} ${vh}`, width: '100%', style: { display: 'block', aspectRatio: `${W} / ${H}`, background: C.bg }, role: 'img', 'aria-label': `Illustrative operational schematic of ${t.name}` }, ...K);
}

function tank(h, D, a, o, C) {
  const k = a.k, st = D.stock(k), p = D.prod(k.code);
  const { cx, tw, th, x0, x1, top, base } = a;
  const sel = o.selTank === k.id, rel = o.related.has(k.id), hov = o.hover === k.id;
  const faded = (o.focus.size > 0 && !o.focus.has(k.id)) || (!o.has(k.code) && k.kind !== 'component');
  const E = []; let i = 0; const q = () => 't' + (i++);
  const oos = k.status === 'Out of service';
  const fill = Math.min(1, st.fill), ly = base - th * fill;
  if (sel || hov || rel) E.push(h('rect', { key: q(), x: a.s0 + 3, y: top - 34, width: a.slot - 6, height: base - top + 96, fill: sel ? C.selSoft : 'none', stroke: sel ? C.sel : rel ? C.sel : C.mute, strokeWidth: sel ? 1.6 : 1, strokeDasharray: sel ? undefined : '4 3', opacity: sel ? 1 : 0.8 }));
  // shell + liquid
  E.push(h('rect', { key: q(), x: x0, y: top, width: tw, height: th, fill: C.shell }));
  if (!oos && fill > 0) {
    E.push(h('rect', { key: q(), x: x0, y: ly, width: tw, height: base - ly, fill: p.color, fillOpacity: C.liquidA }));
    if (k.q !== 'Released') E.push(h('rect', { key: q(), x: x0, y: ly, width: tw, height: base - ly, fill: 'url(#tnHold)' }));
    E.push(h('line', { key: q(), x1: x0, x2: x1, y1: ly, y2: ly, stroke: C.shellBd, strokeWidth: 1 }));
  }
  E.push(h('rect', { key: q(), x: x0, y: top, width: tw, height: th, fill: 'none', stroke: C.shellBd, strokeWidth: 1.4, strokeDasharray: oos ? '4 3' : undefined }));
  // roof by type
  if (k.roof.includes('Fixed cone')) E.push(h('path', { key: q(), d: `M${x0} ${top}L${cx} ${top - Math.max(5, tw * 0.09)}L${x1} ${top}`, fill: C.shell, stroke: C.shellBd, strokeWidth: 1.4 }));
  else if (k.roof.includes('Dome')) E.push(h('path', { key: q(), d: `M${x0} ${top}Q${cx} ${top - tw * 0.18} ${x1} ${top}`, fill: C.shell, stroke: C.shellBd, strokeWidth: 1.4 }));
  else if (k.roof.includes('Internal')) { E.push(h('path', { key: q(), d: `M${x0} ${top}L${cx} ${top - Math.max(4, tw * 0.06)}L${x1} ${top}`, fill: C.shell, stroke: C.shellBd, strokeWidth: 1.4 })); if (!oos) E.push(h('line', { key: q(), x1: x0 + 3, x2: x1 - 3, y1: ly - 2.5, y2: ly - 2.5, stroke: C.shellBd, strokeWidth: 1, strokeDasharray: '3 2' })); }
  else { E.push(h('line', { key: q(), x1: x0 - 3, x2: x1 + 3, y1: top + 5, y2: top + 5, stroke: C.shellBd, strokeWidth: 1.2 })); if (!oos) E.push(h('rect', { key: q(), x: x0 + 2, y: ly - 4, width: tw - 4, height: 4, fill: C.shellBd })); }
  // HLA marker
  const hy = base - th * (k.hla / k.nominal);
  E.push(h('path', { key: q(), d: `M${x1 + 2} ${hy}l6 -4v8z`, fill: C.mute }));
  // ID + alarm
  E.push(h('text', { key: q(), x: cx, y: top - 15, textAnchor: 'middle', fontFamily: MONO, fontSize: 12, fontWeight: 600, fill: C.txt }, k.id));
  const sev = k.alarm ? k.alarm.sev : null;
  if (sev) { const ax = cx + 26, ay = top - 26; E.push(sev === 'critical' ? h('rect', { key: q(), x: ax - 5, y: ay - 1, width: 10, height: 10, transform: `rotate(45 ${ax} ${ay + 4})`, fill: C.crit }) : h('path', { key: q(), d: `M${ax} ${ay - 1}l6.5 11h-13z`, fill: C.warn })); }
  if (k.q === 'On hold') { const ax = cx - 34; E.push(h('rect', { key: q(), x: ax, y: top - 26, width: 11, height: 11, fill: 'none', stroke: C.txt, strokeWidth: 1.2 })); E.push(h('path', { key: q(), d: `M${ax + 3.8} ${top - 23}v5M${ax + 7.2} ${top - 23}v5`, stroke: C.txt, strokeWidth: 1.4 })); }
  // tag
  const tx = a.s0 + 7, tw2 = a.tagW, ty = a.tagY;
  const temp = k.tempSrc === 'unavailable' ? 'Temp n/a' : D.fmt(k.temp, 1) + ' °C';
  const big = o.mode === 'temp' ? temp : o.mode === 'status' ? (k.q === 'Released' ? 'Released' : k.q === 'On hold' ? 'On hold' : 'Awaiting') : Math.round(st.fill * 100) + '%';
  const l2 = o.mode === 'temp' ? `${D.fmt(st.level)} mm` : o.mode === 'status' ? (k.activity ? k.activity.ref.replace(/^(TRF|BLD)-[A-Z]+-/, '') : '—') : `${D.fmt(k.vol)} kL`;
  const l3 = k.status;
  const l3c = sev === 'critical' ? C.crit : /Receiving|Dispatching|Blending/.test(l3) ? C.txt : C.mute;
  if (p.kind === 'component') E.push(h('rect', { key: q(), x: tx, y: ty - 9, width: 9, height: 9, fill: 'none', stroke: p.color, strokeWidth: 1.6 }));
  else E.push(h('rect', { key: q(), x: tx, y: ty - 9, width: 9, height: 9, fill: p.color }));
  E.push(h('text', { key: q(), x: tx + 14, y: ty, fontFamily: SANS, fontSize: 12, fontWeight: 500, fill: C.mute }, fit(p.short, tw2 - 14, 6.4)));
  E.push(h('text', { key: q(), x: tx, y: ty + 18, fontFamily: SANS, fontSize: 15, fontWeight: 600, fill: C.txt }, fit(big, tw2, 8)));
  E.push(h('text', { key: q(), x: tx, y: ty + 34, fontFamily: SANS, fontSize: 12, fill: C.txt }, fit(l2, tw2, 6.2)));
  E.push(h('text', { key: q(), x: tx, y: ty + 49, fontFamily: SANS, fontSize: 11.5, fill: l3c }, fit(l3, tw2, 6)));
  return h('g', { key: 'tank-' + k.id, opacity: faded ? 0.35 : 1, style: { cursor: 'pointer', transition: 'opacity .15s' }, onClick: ev => { ev.stopPropagation(); o.onTank(k.id); }, onMouseEnter: () => o.onHover(k.id), onMouseLeave: () => o.onHover(null), onKeyDown: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onTank(k.id); } }, role: 'button', tabIndex: 0, 'aria-pressed': sel, 'aria-label': `${k.id} ${p.label}, ${Math.round(st.fill * 100)}% full, ${D.fmt(k.vol)} kL, ${k.status}, ${k.q}` }, ...E, h('title', null, `${k.id} · ${p.label} · ${D.fmt(k.vol)} kL (${Math.round(st.fill * 100)}%) · ${k.status} · ${k.q}`));
}
