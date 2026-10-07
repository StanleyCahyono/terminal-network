// App shell: tabs with their own navigation stacks, push/pop transitions tied to browser history (so the phone's back
// button and gestures work), edge-swipe back, bottom sheets, alarm banners, toasts, the live data loop and preferences.
import { h, useState, useEffect, useRef, useLayoutEffect, useContext, createContext, useCallback, Ctx, useApp, cx, ic, haptic, HoldDefs, Press } from './kit.js';
import { SCREENS, titleOf } from './screens.js';

export const ScreenCtx = createContext(null);
export const TABS = [
  { id: 'home', label: 'Overview', icon: 'overview', root: 'overview' },
  { id: 'terminals', label: 'Terminals', icon: 'tank', root: 'terminals' },
  { id: 'transfers', label: 'Transfers', icon: 'transfer', root: 'transfers' },
  { id: 'alarms', label: 'Alarms', icon: 'bell', root: 'alarms' },
  { id: 'more', label: 'More', icon: 'more', root: 'more' },
];
export const ROLES = {
  operator: { label: 'Terminal operator', name: 'A. Nugroho', perm: { act: true, ack: true, resolve: false, release: false } },
  supervisor: { label: 'Shift supervisor', name: 'R. Hakim', perm: { act: true, ack: true, resolve: true, release: false } },
  quality: { label: 'Quality officer', name: 'S. Wulandari', perm: { act: false, ack: true, resolve: false, release: true } },
  viewer: { label: 'Viewer · read only', name: 'Head office', perm: { act: false, ack: false, resolve: false, release: false } },
};
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

// ── route encoding: #/tab/screen~param~param/… ──
const enc = e => [e.s, ...(e.p || [])].map(x => encodeURIComponent(String(x))).join('~');
const dec = (str, seq) => { const [s, ...p] = str.split('~').map(decodeURIComponent); return SCREENS[s] ? { s, p, k: s + ':' + seq() } : null; };
const hashOf = (tab, stack) => '#/' + tab + stack.slice(1).map(e => '/' + enc(e)).join('');
const same = (a, b) => a && b && a.s === b.s && (a.p || []).join('\u0001') === (b.p || []).join('\u0001');

function loadPrefs() {
  let p = {}, sh = {}; try { p = JSON.parse(localStorage.getItem('tnops:app')) || {}; } catch (e) {} try { sh = JSON.parse(localStorage.getItem('tnops:shell')) || {}; } catch (e) {}
  return { theme: p.theme || 'system', motion: p.motion || 'system', banners: p.banners !== false, role: ROLES[p.role] ? p.role : ROLES[sh.role] ? sh.role : 'supervisor', installSeen: !!p.installSeen };
}

export function App({ D }) {
  const seqRef = useRef(0), seq = () => ++seqRef.current;
  const rootOf = id => ({ s: TABS.find(t => t.id === id).root, p: [], k: TABS.find(t => t.id === id).root + ':' + seq() });
  const parse = hash => {
    const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean), tab = TABS.some(t => t.id === parts[0]) ? parts[0] : 'home';
    const stack = [rootOf(tab)]; parts.slice(1).forEach(x => { const e = dec(x, seq); if (e) stack.push(e); });
    return { tab, stack };
  };
  const [nav, setNav] = useState(() => { const r = parse(location.hash), stacks = {}; TABS.forEach(t => { stacks[t.id] = t.id === r.tab ? r.stack : [rootOf(t.id)]; }); return { tab: r.tab, stacks, anim: null, drag: null }; });
  const navRef = useRef(nav); navRef.current = nav;
  const mem = useRef(new Map()).current, memOf = k => { if (!mem.has(k)) mem.set(k, {}); return mem.get(k); };
  const [rev, setRev] = useState(0);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [sheet, setSheet] = useState(null); const sheetRef = useRef(null); sheetRef.current = sheet;
  const [banner, setBanner] = useState(null); const bq = useRef([]);
  const [toast, setToast] = useState(null);
  const [events, setEvents] = useState(() => { // seed the activity feed with the last few hours so it is never empty on launch
    const out = [], since = D.NOW - 240;
    D.TRANSFERS.forEach(tr => { const T = D.term(tr.term), P = D.prod(tr.code); if (!T || T.superhub) return;
      if (tr.state === 'Completed' && tr.end >= since) out.push({ at: tr.end, text: `${tr.type} of ${P.label} finished at ${T.name} · ${D.fmt(tr.qty)} kL.` });
      else if (tr.start >= since && tr.start <= D.NOW && tr.state !== 'Scheduled') out.push({ at: tr.start, text: `${tr.type} of ${P.label} started at ${T.name}${tr.vessel ? ' · ' + tr.vessel : ''}.` }); });
    ((D.HUB.state && D.HUB.state.events) || []).slice(0, 12).forEach(e => { if (e.at >= since) out.push({ at: e.at, text: `Maiza Lubrika · ${e.text}` }); });
    return out.sort((a, b) => b.at - a.at).slice(0, 20).map((e, i) => ({ ...e, id: 'seed' + i }));
  });
  const [sys, setSys] = useState(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [installEvt, setInstallEvt] = useState(null);
  const pendingAfterSheet = useRef(null), skipAnim = useRef(false), topListeners = useRef(new Set());

  // ── theme, motion and the browser chrome colour ──
  const theme = prefs.theme === 'system' ? sys : prefs.theme;
  const reduced = prefs.motion === 'off' || (prefs.motion === 'system' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useLayoutEffect(() => {
    const de = document.documentElement; de.dataset.theme = theme; de.dataset.motion = reduced ? 'off' : 'on';
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', theme === 'dark' ? '#16181b' : '#f7f7f9'));
  }, [theme, reduced]);
  useEffect(() => { const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)'); if (!mq) return; const f = e => setSys(e.matches ? 'dark' : 'light'); mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); return () => { mq.removeEventListener ? mq.removeEventListener('change', f) : mq.removeListener(f); }; }, []);
  const setPref = (k, v) => setPrefs(p => { const n = { ...p, [k]: v }; try { localStorage.setItem('tnops:app', JSON.stringify(n)); } catch (e) {} return n; });

  // ── live data: advance the network every 3 s and when the app returns to the foreground ──
  const seen = useRef(null);
  const step = useCallback(() => {
    const ev = D.tick();
    if (ev && ev.length) setEvents(list => [...ev.slice(0, 6).map((text, i) => ({ id: D.NOW + ':' + i + ':' + text.length, at: D.NOW, text })), ...list].slice(0, 60));
    if (!seen.current) seen.current = new Set(D.EXCEPTIONS.map(e => e.id));
    D.EXCEPTIONS.forEach(e => { if (!seen.current.has(e.id)) { seen.current.add(e.id); if (e.status !== 'Resolved' && e.sev !== 'info') bq.current.push(e.id); } });
    setRev(r => r + 1);
  }, []);
  useEffect(() => {
    seen.current = new Set(D.EXCEPTIONS.map(e => e.id));
    const t = setInterval(step, 3000);
    const vis = () => { if (document.visibilityState === 'visible') step(); };
    document.addEventListener('visibilitychange', vis);
    const bip = e => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', bip);
    const noop = () => {}; document.addEventListener('touchstart', noop, { passive: true }); // lets :active work on iOS
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('beforeinstallprompt', bip); document.removeEventListener('touchstart', noop); };
  }, []);
  // alarm banners, one at a time
  useEffect(() => {
    if (banner || !bq.current.length) return;
    const id = bq.current.shift(), e = D.EXCEPTIONS.find(x => x.id === id);
    if (!e || !prefs.banners) { bq.current = []; return; }
    haptic([12, 60, 12]); setBanner({ e, out: false });
  }, [rev, banner, prefs.banners]);
  useEffect(() => { if (!banner || banner.out) return; const t = setTimeout(() => setBanner(b => b && { ...b, out: true }), 5200); return () => clearTimeout(t); }, [banner]);

  // ── history ──
  const stateOf = (tab, stack, extra) => ({ tn: 1, tab, stack: stack.map(e => [e.s, ...(e.p || [])]), ...(extra || {}) });
  useEffect(() => {
    const n = navRef.current; history.replaceState(stateOf(n.tab, n.stacks[n.tab]), '', hashOf(n.tab, n.stacks[n.tab]));
    const onPop = ev => {
      const st = ev.state && ev.state.tn ? ev.state : null;
      if (sheetRef.current && !(st && st.sheet)) { setSheet(s => s && { ...s, out: true }); const f = pendingAfterSheet.current; pendingAfterSheet.current = null; if (f) setTimeout(f, 30); if (st && st.tab === navRef.current.tab && st.stack.length === navRef.current.stacks[navRef.current.tab].length) return; }
      const tgt = st ? { tab: st.tab, raw: st.stack } : (() => { const r = parse(location.hash); return { tab: r.tab, raw: r.stack.map(e => [e.s, ...e.p]) }; })();
      setNav(cur => {
        const curStack = cur.stacks[tgt.tab] || [rootOf(tgt.tab)];
        const next = tgt.raw.map((r, i) => { const e = { s: r[0], p: r.slice(1) }; return curStack[i] && same(curStack[i], e) && (i === 0 || same(curStack[i - 1], { s: tgt.raw[i - 1][0], p: tgt.raw[i - 1].slice(1) })) ? curStack[i] : { ...e, k: e.s + ':' + seq() }; });
        if (!next.length || !SCREENS[next[0].s]) return cur;
        let anim = null;
        if (tgt.tab === cur.tab && !skipAnim.current) {
          const a = curStack[curStack.length - 1], b = next[next.length - 1];
          if (a.k !== b.k) anim = next.length < curStack.length ? { type: 'pop', from: a, to: b, id: seq() } : { type: 'push', from: a, to: b, id: seq() };
        } else if (tgt.tab !== cur.tab) anim = { type: 'fade', to: next[next.length - 1], id: seq() };
        skipAnim.current = false;
        return { ...cur, tab: tgt.tab, stacks: { ...cur.stacks, [tgt.tab]: next }, anim, drag: null };
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ── navigation API ──
  const push = useCallback((s, p = []) => {
    const cur = navRef.current, stack = cur.stacks[cur.tab], top = stack[stack.length - 1], e = { s, p: p.map(String), k: s + ':' + seq() };
    if (same(top, e)) return;
    if (sheetRef.current) { pendingAfterSheet.current = () => push(s, p); closeSheet(); return; }
    const next = [...stack, e];
    history.pushState(stateOf(cur.tab, next), '', hashOf(cur.tab, next));
    setNav({ ...cur, stacks: { ...cur.stacks, [cur.tab]: next }, anim: { type: 'push', from: top, to: e, id: seq() }, drag: null });
  }, []);
  const pop = useCallback(() => { const cur = navRef.current; if (cur.stacks[cur.tab].length > 1) history.back(); }, []);
  const switchTab = useCallback(id => {
    const cur = navRef.current;
    if (sheetRef.current) closeSheet();
    if (id === cur.tab) {
      const st = cur.stacks[id];
      if (st.length > 1) { const root = st[0]; history.replaceState(stateOf(id, [root]), '', hashOf(id, [root])); setNav({ ...cur, stacks: { ...cur.stacks, [id]: [root] }, anim: { type: 'pop', from: st[st.length - 1], to: root, id: seq() }, drag: null }); }
      else topListeners.current.forEach(f => f());
      return;
    }
    haptic(4);
    history.pushState(stateOf(id, cur.stacks[id]), '', hashOf(id, cur.stacks[id]));
    setNav({ ...cur, tab: id, anim: { type: 'fade', to: cur.stacks[id][cur.stacks[id].length - 1], id: seq() }, drag: null });
  }, []);
  // go to a screen from anywhere: switch to its tab's root first when asked (e.g. from a banner)
  const goTab = useCallback((tab, s, p) => { const cur = navRef.current; if (tab && tab !== cur.tab) { switchTab(tab); if (s) setTimeout(() => push(s, p), 40); } else if (s) push(s, p); }, []);
  const openSheet = useCallback(spec => { if (!sheetRef.current) { const cur = navRef.current; history.pushState(stateOf(cur.tab, cur.stacks[cur.tab], { sheet: 1 }), '', location.hash); } setSheet({ ...spec, id: seq(), out: false }); }, []);
  const closeSheet = useCallback(() => { if (!sheetRef.current || sheetRef.current.out) return; if (history.state && history.state.sheet) history.back(); else setSheet(s => s && { ...s, out: true }); }, []);
  const showToast = useCallback((text, icon = 'check') => { setToast({ text, icon, id: seq(), out: false }); }, []);
  useEffect(() => { if (!toast) return; const t = toast.out ? setTimeout(() => setToast(x => x && x.out ? null : x), 300) : setTimeout(() => setToast(x => x && { ...x, out: true }), 2600); return () => clearTimeout(t); }, [toast]);
  const onTop = useCallback(f => { topListeners.current.add(f); return () => topListeners.current.delete(f); }, []);

  const role = ROLES[prefs.role];
  const app = { D, rev, now: D.NOW, push, pop, switchTab, goTab, sheet: openSheet, closeSheet, toast: showToast, prefs, setPref, role, roleId: prefs.role, perm: role.perm, events, theme, reduced, onTop, refresh: step,
    install: installEvt ? async () => { installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); setInstallEvt(null); if (r && r.outcome === 'accepted') showToast('Installed on your home screen'); } : null, ios: IOS, standalone: STANDALONE() };

  // ── edge-swipe back (iOS-style; the browser's own gesture handles this outside the installed app) ──
  const dragRef = useRef(null);
  const onTouchStart = e => {
    const cur = navRef.current; if (cur.anim || sheetRef.current || cur.stacks[cur.tab].length < 2) return;
    const t = e.touches[0]; if (t.clientX > 22 || (IOS && !STANDALONE())) return;
    dragRef.current = { x0: t.clientX, y0: t.clientY, x: 0, t0: performance.now(), lock: null };
  };
  const onTouchMove = e => {
    const d = dragRef.current; if (!d) return; const t = e.touches[0], dx = t.clientX - d.x0, dy = t.clientY - d.y0;
    if (d.lock == null) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; d.lock = Math.abs(dx) > Math.abs(dy) * 1.2 && dx > 0; if (!d.lock) { dragRef.current = null; return; } }
    d.x = Math.max(0, dx); setNav(n => ({ ...n, drag: { x: d.x } }));
  };
  const onTouchEnd = () => {
    const d = dragRef.current; dragRef.current = null; if (!d || !d.lock) return;
    const w = window.innerWidth, v = d.x / Math.max(1, performance.now() - d.t0);
    if (d.x > w * .32 || v > .55) { setNav(n => ({ ...n, drag: { x: d.x, done: true } })); haptic(6); setTimeout(() => { skipAnim.current = true; history.back(); }, 230); }
    else setNav(n => ({ ...n, drag: { x: 0, cancel: true } }));
  };
  useEffect(() => { if (nav.drag && nav.drag.cancel) { const t = setTimeout(() => setNav(n => n.drag && n.drag.cancel ? { ...n, drag: null } : n), 240); return () => clearTimeout(t); } }, [nav.drag]);
  useEffect(() => { if (!nav.anim) return; const t = setTimeout(() => setNav(n => n.anim && n.anim.id === nav.anim.id ? { ...n, anim: null } : n), reduced ? 30 : 470); return () => clearTimeout(t); }, [nav.anim]);

  // ── render the active tab: its top screen, plus the screen underneath while animating or dragging ──
  const stack = nav.stacks[nav.tab], top = stack[stack.length - 1], prev = stack[stack.length - 2];
  const layers = [];
  const ctxFor = (e, i) => ({ entry: e, depth: i, mem: memOf(e.k), prevTitle: i > 0 ? (memOf(stack[i - 1].k).title || titleOf(D, stack[i - 1])) : null });
  const A = nav.anim;
  if (nav.drag && prev) {
    const x = nav.drag.x, w = window.innerWidth, f = Math.min(1, x / w), done = nav.drag.done, cancel = nav.drag.cancel, tr = done || cancel ? 'transform .23s cubic-bezier(.2,.8,.2,1)' : 'none';
    layers.push({ e: prev, i: stack.length - 2, under: true, style: { transform: `translate3d(${done ? 0 : -28 * (1 - f)}%,0,0)`, transition: tr }, shade: done ? 0 : .12 * (1 - f) });
    layers.push({ e: top, i: stack.length - 1, cls: 'drag-top', style: { transform: `translate3d(${done ? w : x}px,0,0)`, transition: tr } });
  } else if (A && A.type === 'push' && A.to.k === top.k && A.from && stack.some(x => x.k === A.from.k)) {
    layers.push({ e: A.from, i: stack.findIndex(x => x.k === A.from.k), under: true, cls: 'a-out-l' });
    layers.push({ e: top, i: stack.length - 1, cls: 'a-in-r' });
  } else if (A && A.type === 'pop' && A.to.k === top.k && A.from) {
    layers.push({ e: top, i: stack.length - 1, cls: 'a-in-l' });
    layers.push({ e: A.from, i: stack.length, under: true, cls: 'a-out-r', gone: true });
  } else layers.push({ e: top, i: stack.length - 1, cls: A && A.type === 'fade' && A.to.k === top.k ? 'a-fade' : null });

  const alarmsOpen = D.EXCEPTIONS.filter(e => e.status !== 'Resolved' && !e.ack).length;
  return h(Ctx.Provider, { value: app },
    h('div', { className: 'app', onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
      h(HoldDefs),
      h('div', { className: 'stack' }, ...layers.map(L => {
        const Comp = SCREENS[L.e.s], c = L.gone ? { entry: L.e, depth: L.i, mem: memOf(L.e.k), prevTitle: (prev && memOf(prev.k).title) || null, gone: true } : ctxFor(L.e, L.i);
        return h(ScreenCtx.Provider, { key: L.e.k, value: { ...c, under: !!L.under, layerCls: L.cls, layerStyle: L.style, shade: L.shade } }, h(Comp, { p: L.e.p || [], app }));
      })),
      h('nav', { className: 'tabbar', role: 'tablist', 'aria-label': 'Sections' }, ...TABS.map(t => h('button', { key: t.id, className: 'tab', role: 'tab', 'aria-selected': nav.tab === t.id ? 'true' : 'false', onClick: () => switchTab(t.id) },
        h('span', { className: 'tab-ic' }, ic(t.icon, 25, { w: nav.tab === t.id ? 2.1 : 1.8 }), t.id === 'alarms' && alarmsOpen ? h('span', { className: 'badge num', 'aria-label': `${alarmsOpen} unacknowledged` }, alarmsOpen > 99 ? '99+' : alarmsOpen) : null),
        h('span', null, t.label)))),
      sheet ? h(Sheet, { key: sheet.id, spec: sheet, onClose: closeSheet, onGone: () => setSheet(s => s && s.out ? null : s) }) : null,
      banner ? h(Banner, { key: banner.e.id, b: banner, onTap: () => { const e = banner.e; setBanner(b => b && { ...b, out: true }); goTab(null, 'alarm', [e.id]); }, onGone: () => setBanner(b => b && b.out ? null : b), onDismiss: () => setBanner(b => b && { ...b, out: true }) }) : null,
      toast ? h('div', { key: toast.id, className: cx('toast', toast.out && 'out'), role: 'status', 'aria-live': 'polite', onAnimationEnd: () => { if (toast.out) setToast(null); } }, ic(toast.icon, 18, { w: 2.2 }), h('span', null, toast.text)) : null));
}

// ── screen frame: navigation bar, large title, pull to refresh, scroll memory, footer actions ──
export function Screen({ title, large, kicker, sub, right, children, onRefresh, foot, navTitle }) {
  const app = useApp(), sc = useContext(ScreenCtx), ref = useRef(null), mem = sc.mem;
  mem.title = navTitle || title;
  const [solid, setSolid] = useState(!!mem.y && mem.y > 2), [showT, setShowT] = useState(!large || (mem.y || 0) > 46);
  const [pull, setPull] = useState(0), [busy, setBusy] = useState(false), pr = useRef(null);
  useLayoutEffect(() => { const el = ref.current; if (el && mem.y) el.scrollTop = mem.y; }, []);
  useEffect(() => sc.depth === 0 && !sc.under ? app.onTop(() => { const el = ref.current; if (el) el.scrollTo({ top: 0, behavior: app.reduced ? 'auto' : 'smooth' }); }) : undefined, [sc.depth, sc.under]);
  const onScroll = e => { const y = e.currentTarget.scrollTop; mem.y = Math.max(0, y); const s = y > 2, t = !large || y > 46; if (s !== solid) setSolid(s); if (t !== showT) setShowT(t); if (onRefresh && y < 0) setPull(Math.min(110, -y)); };
  const ts = e => { if (!onRefresh || busy) return; const el = ref.current; if (el.scrollTop <= 0) pr.current = { y0: e.touches[0].clientY, d: 0 }; };
  const tm = e => { const p = pr.current; if (!p) return; const el = ref.current, dy = e.touches[0].clientY - p.y0; if (el.scrollTop > 0 || dy < 0) { pr.current = null; if (pull) setPull(0); return; } p.d = app.ios ? Math.max(p.d, -el.scrollTop) : Math.min(110, dy * .45); if (!app.ios) setPull(p.d); };
  const te = () => { const p = pr.current; pr.current = null; const d = Math.max(p ? p.d : 0, pull); if (d > 58) { setBusy(true); haptic(10); onRefresh(); setTimeout(() => { setBusy(false); setPull(0); }, 750); } else setPull(0); };
  const back = sc.depth > 0 ? h('button', { className: 'nav-back', onClick: () => app.pop(), 'aria-label': 'Back' }, ic('chevL', 26, { w: 2.4 }), h('span', null, sc.prevTitle && sc.prevTitle.length <= 13 ? sc.prevTitle : 'Back')) : null;
  return h('div', { className: cx('scr', sc.under && 'under', foot && 'has-foot', sc.layerCls), style: sc.layerStyle, 'aria-hidden': sc.under ? 'true' : undefined },
    h('header', { className: cx('nav', (solid || !large) && 'solid') }, h('div', { className: 'nav-l' }, back), h('div', { className: cx('nav-title', !showT && 'hide'), role: 'heading', 'aria-level': 1 }, navTitle || title), h('div', { className: 'nav-r' }, right)),
    onRefresh ? h('div', { className: 'ptr', 'aria-hidden': true }, h('div', { className: cx('ptr-ic', (pull > 8 || busy) && 'on', busy && 'busy'), style: !busy && pull ? { transform: `rotate(${pull * 3}deg)` } : null }, ic('refresh', 18, { w: 2.2 }))) : null,
    h('div', { ref, className: 'scr-scroll', onScroll, onTouchStart: ts, onTouchMove: tm, onTouchEnd: te },
      h('div', { className: 'pull', style: !app.ios && (pull || busy) ? { transform: `translate3d(0,${busy ? 48 : pull}px,0)`, transition: pr.current ? 'none' : 'transform .3s cubic-bezier(.2,.8,.2,1)' } : null },
        large ? h('div', { className: 'lt' }, kicker ? h('div', { className: 'lt-kicker' }, kicker) : null, h('h1', null, title), sub ? h('div', { className: 'lt-sub' }, sub) : null) : null,
        children)),
    foot ? h('div', { className: 'foot' }, foot) : null,
    h('div', { className: 'scr-shade', style: sc.shade != null ? { opacity: sc.shade } : null }));
}

// ── bottom sheet with drag to dismiss ──
function Sheet({ spec, onClose, onGone }) {
  const ref = useRef(null), drag = useRef(null), [dy, setDy] = useState(0), [st, setSt] = useState('');
  const start = e => { drag.current = { y0: e.touches[0].clientY, t0: performance.now() }; };
  const move = e => { const d = drag.current; if (!d) return; const v = Math.max(0, e.touches[0].clientY - d.y0); setDy(v); setSt('dragging'); };
  const end = () => { const d = drag.current; drag.current = null; if (!d) return; const v = dy / Math.max(1, performance.now() - d.t0); if (dy > 120 || v > .6) { onClose(); } else { setSt('settle'); setDy(0); } };
  useEffect(() => { const f = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, []);
  const out = spec.out;
  useEffect(() => { if (!out) return; const t = setTimeout(onGone, 420); return () => clearTimeout(t); }, [out]); // in case the animation end is missed
  return h(React.Fragment, null,
    h('div', { className: cx('scrim', out && 'out'), onClick: onClose, 'aria-hidden': true }),
    h('div', { ref, className: cx('sheet', out && 'out', !out && st), role: 'dialog', 'aria-modal': 'true', 'aria-label': spec.title || 'Details', style: { transform: !out && dy ? `translate3d(0,${dy}px,0)` : undefined, '--dy': dy + 'px' }, onAnimationEnd: e => { if (out && e.target === ref.current) onGone(); } },
      h('div', { className: 'sheet-grab', onTouchStart: start, onTouchMove: move, onTouchEnd: end }, h('i')),
      spec.title ? h('div', { className: 'sheet-hd', onTouchStart: start, onTouchMove: move, onTouchEnd: end }, h('h3', null, spec.title), h('button', { className: 'x', onClick: onClose, 'aria-label': 'Close' }, ic('close', 16, { w: 2.6 }))) : null,
      h('div', { className: 'sheet-body' }, typeof spec.body === 'function' ? h(spec.body) : spec.body)));
}

// ── alarm banner ──
function Banner({ b, onTap, onGone, onDismiss }) {
  const app = useApp(), e = b.e, T = app.D.term(e.term) || { name: e.term }, crit = e.sev === 'critical', y = useRef(null), [dy, setDy] = useState(0);
  useEffect(() => { if (!b.out) return; const t = setTimeout(onGone, 450); return () => clearTimeout(t); }, [b.out]);
  return h('div', { className: cx('banner', b.out && 'out'), role: 'alert', style: dy ? { transform: `translate3d(0,${dy}px,0)` } : null, onAnimationEnd: () => { if (b.out) onGone(); },
    onTouchStart: ev => { y.current = ev.touches[0].clientY; }, onTouchMove: ev => { if (y.current == null) return; setDy(Math.min(0, ev.touches[0].clientY - y.current)); }, onTouchEnd: () => { if (dy < -30) onDismiss(); else if (Math.abs(dy) < 6) onTap(); setDy(0); y.current = null; }, onClick: ev => { if (!('ontouchstart' in window)) onTap(); } },
    h('span', { className: 'b-ic ' + (crit ? 'sev-critical' : 'sev-attention') }, ic(crit ? 'crit' : 'warn', 21, { w: 2.1 })),
    h('div', { style: { minWidth: 0, flex: 1 } }, h('div', { className: 'b-k' }, h('span', null, (crit ? 'Critical alarm' : 'Alarm') + ' · ' + T.name.replace(/^TBBM |^DPPU /, '')), h('span', null, 'now')), h('div', { className: 'b-t' }, e.what), h('div', { className: 'b-s ell' }, `${e.asset} · ${e.owner}`)));
}
