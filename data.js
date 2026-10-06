// Fictional demonstration data for the terminal network prototype. NOT live telemetry.
// Times are scenario minutes. Minute REF is the moment the data below describes; it is pinned to the
// real clock when the console opens, and tick() runs transfers, blends and tank levels forward in real time.
const REF = 860;
const KEEP_H = 24; // reopening within this many hours continues the same run instead of starting a fresh one
const OFF = { WIB: 420, WITA: 480, WIT: 540 }; // minutes ahead of UTC
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
function anchor() { // shift the scenario by whole hours so planned times keep their minutes (08:00 stays on the hour)
  const now = Date.now(); let a = (REF + Math.floor((now / 60000 - REF) / 60) * 60) * 60000;
  try { const s = +localStorage.getItem('tnops:anchor'); if (s && now >= s && now - s < KEEP_H * 3600000) a = s; else localStorage.setItem('tnops:anchor', String(a)); } catch (e) {}
  return a;
}
const BASE = anchor() / 60000 - REF; // real UTC minute at scenario minute 0
export let NOW = REF; // scenario minute now, advanced by tick()
export let SNAPSHOT = '';
const zone = tz => OFF[tz] ?? OFF.WIB;
const local = (m, tz) => new Date((BASE + m + zone(tz)) * 60000); // read with getUTC* for local clock fields
const dayNo = (m, tz) => Math.floor((BASE + m + zone(tz)) / 1440);
const hhmm = (m, tz = 'WIB') => { const d = local(Math.round(m), tz); return pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); };
const sameDay = (m, tz = 'WIB') => dayNo(Math.round(m), tz) === dayNo(NOW, tz);
function day(m, tz = 'WIB', year = false) { const d = local(Math.round(m), tz); return pad(d.getUTCDate()) + ' ' + MON[d.getUTCMonth()] + (year ? ' ' + d.getUTCFullYear() : ''); }
export function tm(min, tz = 'WIB', o = {}) {
  if (min == null || !isFinite(min)) return null;
  const pre = (o.date || !sameDay(min, tz)) ? day(min, tz) + ' ' : '';
  return pre + hhmm(min, tz) + (o.tz === false ? '' : ' ' + tz);
}
export const clockMin = (m, tz = 'WIB') => (((BASE + m + zone(tz)) % 1440) + 1440) % 1440; // minutes after local midnight
export const dayStart = (d = 0, tz = 'WIB') => (dayNo(NOW, tz) + d) * 1440 - zone(tz) - BASE; // local midnight, d days from today
const at = (d, h, mi = 0, tz = 'WIB') => dayStart(d, tz) + h * 60 + mi;
export const grid = (m, step, tz = 'WIB') => { const k = BASE + zone(tz); return Math.ceil((m + k) / step) * step - k; }; // first local clock multiple of step ≥ m
const SHIFT_H = { A: 6, B: 14, C: 22 };
export const shiftNow = (tz = 'WIB') => { const h = clockMin(NOW, tz) / 60; return h >= 6 && h < 14 ? 'A' : h >= 14 && h < 22 ? 'B' : 'C'; };
export function shiftSpan(id, tz = 'WIB') { let a = at(0, SHIFT_H[id] ?? 14, 0, tz); while (a > NOW) a -= 1440; return [a, Math.min(a + 480, NOW)]; } // latest occurrence that has started
export function dur(min) { if (min == null || !isFinite(min)) return null; min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${pad(m)} min` : `${m} min`; }
export function fmt(n, dp = 0) { if (n == null || !isFinite(n)) return null; return Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
export function sgn(n, dp = 0) { if (n == null || !isFinite(n)) return null; const r = Number(n.toFixed(dp)); return (r > 0 ? '+' : r < 0 ? '−' : '±') + fmt(Math.abs(r), dp); }
export function ago(min) { if (min < 1) return Math.max(1, Math.round(min * 60)) + ' s ago'; if (min < 60) return Math.round(min) + ' min ago'; return dur(min) + ' ago'; }
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

// ── Products & components ─────────────────────────────────────────────
export const PRODUCTS = [
  { code: 'R92', label: 'RON 92', short: 'R92', fam: 'Gasoline', color: 'oklch(0.64 0.10 200)', dens: 735.0 },
  { code: 'R95', label: 'RON 95', short: 'R95', fam: 'Gasoline', color: 'oklch(0.56 0.13 290)', dens: 741.0 },
  { code: 'R98', label: 'RON 98', short: 'R98', fam: 'Gasoline', color: 'oklch(0.55 0.15 345)', dens: 746.0 },
  { code: 'R90', label: 'RON 90', short: 'R90', fam: 'Gasoline', color: 'oklch(0.76 0.12 125)', dens: 728.0 },
  { code: 'B40', label: 'Diesel B40', short: 'B40', fam: 'Diesel', color: 'oklch(0.58 0.08 100)', dens: 855.0 },
  { code: 'B0', label: 'Diesel B0', short: 'B0', fam: 'Diesel', color: 'oklch(0.47 0.02 260)', dens: 838.0 },
  { code: 'J2', label: 'Jet A-1 (2% biofuel)', short: 'JA1·2', fam: 'Aviation', color: 'oklch(0.80 0.08 230)', dens: 798.0 },
  { code: 'J53', label: 'Jet A-1 (5.3% Biofuel)', short: 'JA1·5.3', fam: 'Aviation', color: 'oklch(0.55 0.11 248)', dens: 797.0 },
];
export const COMPONENTS = [
  { code: 'FAME', label: 'FAME (B100)', short: 'FAME', fam: 'Bio component', color: 'oklch(0.66 0.07 80)', dens: 880.0 },
  { code: 'HOMC', label: 'HOMC high-octane component', short: 'HOMC', fam: 'Gasoline component', color: 'oklch(0.62 0.07 320)', dens: 772.0 },
  { code: 'NAP', label: 'Light naphtha', short: 'LNAP', fam: 'Gasoline component', color: 'oklch(0.68 0.06 160)', dens: 690.0 },
  { code: 'HEFA', label: 'HEFA-SPK synthetic component', short: 'HEFA', fam: 'Aviation component', color: 'oklch(0.68 0.07 200)', dens: 760.0 },
  { code: 'JFC', label: 'Jet fuel, conventional', short: 'JET-C', fam: 'Aviation component', color: 'oklch(0.66 0.03 240)', dens: 799.0 },
];
const ALL = {};
PRODUCTS.forEach(p => { ALL[p.code] = { ...p, kind: 'product', sw: p.color }; });
COMPONENTS.forEach(c => { ALL[c.code] = { ...c, kind: 'component', sw: `repeating-linear-gradient(135deg, ${c.color} 0 2px, transparent 2px 4px)` }; });
export const prod = c => ALL[c] || { code: c, label: c, short: c, color: '#888', sw: '#888', kind: 'product' };

// ── Terminals ──────────────────────────────────────────────────────────
const TDEF = [
  { id: 'PLM', name: 'TBBM Plumpang', area: 'Jakarta Utara', tz: 'WIB', lat: -6.1262, lon: 106.8968, kind: 'Fuel terminal', marine: ['Jetty 1', 'Jetty 2'], blend: { mode: 'Inline', products: ['B40'] }, truck: 8, pipeOut: null, hydrant: false, upd: 0.3, spec: 'R92:30,R92:30,R92:30,R92:30|R90:30,R90:30,R90:30,R98:10|B0:30,B0:30,B40:30,B40:30|B40:30,R95:15,R95:15,FAME:10' },
  { id: 'SBY', name: 'TBBM Surabaya', area: 'Tanjung Perak, Jawa Timur', tz: 'WIB', lat: -7.2046, lon: 112.7322, kind: 'Fuel terminal', marine: ['Berth 1', 'Berth 2'], blend: { mode: 'Inline', products: ['B40'] }, truck: 6, upd: 0.5, spec: 'R92:25,R92:25,R92:25|R90:25,R90:25,R90:25,R98:5|B40:25,B40:25,B40:25|B0:20,FAME:8,R95:10,R95:10' },
  { id: 'UPG', name: 'TBBM Ujung Pandang', area: 'Makassar, Sulawesi Selatan', tz: 'WITA', lat: -5.113, lon: 119.4124, kind: 'Fuel terminal', marine: ['Berth 1'], truck: 4, upd: 0.8, spec: 'R92:15,R92:15,R92:15|R90:15,R90:15,J2:5|B40:20,B40:20,B40:20,B0:10' },
  { id: 'BIK', name: 'TBBM Biak', area: 'Biak, Papua', tz: 'WIT', lat: -1.1868, lon: 136.0845, kind: 'Fuel terminal', marine: ['Berth 1'], truck: 2, upd: 1.2, status: 'Restricted', spec: 'R92:5,R92:5,R90:5|B40:5,B40:5,J2:3' },
  { id: 'BOY', name: 'TBBM Boyolali', area: 'Boyolali, Jawa Tengah', tz: 'WIB', lat: -7.512, lon: 110.656, kind: 'Fuel terminal', marine: null, pipeIn: 'Pipeline receipt', truck: 6, upd: 0.4, spec: 'R92:10,R92:10,R92:10,R90:10|R90:10,B40:10,B40:10,B40:10' },
  { id: 'SMB', name: 'TBBM Strategis Pulau Sambu', area: 'Pulau Sambu, Kepulauan Riau', tz: 'WIB', lat: 1.1617, lon: 103.8951, kind: 'Strategic storage', marine: ['Berth 1', 'Berth 2'], truck: 0, shipOut: true, upd: 0.6, spec: 'R92:35,R92:35,R92:35,R92:35|R90:35,R90:35,R95:20,R95:20|B0:35,B0:35,B0:35,B40:35' },
  { id: 'PLJ', name: 'TBBM Plaju', area: 'Palembang, Sumatera Selatan', tz: 'WIB', lat: -3.0003, lon: 104.8262, kind: 'Fuel terminal', marine: ['River berth 1'], blend: { mode: 'Batch', products: ['R92', 'R95', 'R98'] }, truck: 6, upd: 0.7, spec: 'R90:20,R90:20,R92:20,R98:5|R92:20,R92:20,R95:10,R95:10|HOMC:10,NAP:10,B40:15,B40:15' },
  { id: 'PNJ', name: 'TBBM Lampung - Panjang', area: 'Panjang, Lampung', tz: 'WIB', lat: -5.4679, lon: 105.3197, kind: 'Fuel terminal', marine: ['Berth 1'], truck: 4, upd: 0.5, spec: 'R92:15,R92:15,R92:15|R90:15,R90:15,B0:10|B40:20,B40:20,B40:20' },
  { id: 'JUA', name: 'AFT Juanda', area: 'Sidoarjo, Jawa Timur', tz: 'WIB', lat: -7.3798, lon: 112.7873, kind: 'Aviation fuel terminal', marine: null, pipeIn: 'Pipeline from TBBM Surabaya', hydrant: true, truck: 0, upd: 0.4, spec: 'J2:3,J2:3|J2:3,J2:3' },
  { id: 'CGK', name: 'AFT soetta CGK', area: 'Tangerang, Banten', tz: 'WIB', lat: -6.1192, lon: 106.6667, kind: 'Aviation fuel terminal', marine: null, pipeIn: 'Pipeline receipt', hydrant: true, truck: 0, upd: 0.7, spec: 'J2:8,J2:8,J2:8|J2:8,J53:8,J53:8' },
  { id: 'DPS', name: 'AFT Ngurah Rai DPS', area: 'Badung, Bali', tz: 'WITA', lat: -8.7467, lon: 115.17, kind: 'Aviation fuel terminal', marine: null, pipeIn: 'Pipeline receipt', hydrant: true, truck: 0, upd: 0.9, spec: 'J2:5,J2:5,J2:5|J53:5,J53:5' },
  { id: 'KNO', name: 'AFT Kualanamu KNO', area: 'Deli Serdang, Sumatera Utara', tz: 'WIB', lat: 3.6433, lon: 98.885, kind: 'Aviation fuel terminal', marine: null, pipeIn: 'Road receipt', hydrant: true, truck: 0, upd: 0.6, spec: 'J2:4,J2:4|J2:4,J2:4' },
  { id: 'BLG', name: 'TBBM Strategis (Jet A-1) Avtur Balongan', area: 'Indramayu, Jawa Barat', tz: 'WIB', lat: -6.3832, lon: 108.382, kind: 'Strategic aviation storage', marine: ['Berth 1'], blend: { mode: 'Batch', products: ['J2', 'J53'] }, pipeOut: 'Pipeline to AFT soetta CGK', truck: 0, upd: 0.5, spec: 'J2:20,J2:20,J2:20|J53:20,J53:20,HEFA:5|JFC:20,JFC:20' },
  { id: 'VPK', name: 'Vopak Terminal Jakarta', area: 'Tanjung Priok, Jakarta', tz: 'WIB', lat: -6.0982, lon: 106.8805, kind: 'Third-party storage', marine: ['Berth 1', 'Berth 2', 'Berth 3'], truck: 6, upd: 0.8, spec: 'R92:20,R92:20,R92:20,R92:20|R95:10,R95:10,R98:10,R98:10|B0:20,B0:20,B0:20,B40:20|J2:15,J2:15' },
];

function roofFor(code) { if (['FAME', 'B0', 'B40'].includes(code)) return 'Fixed cone roof'; if (['HOMC', 'NAP'].includes(code)) return 'External floating roof'; return 'Internal floating roof'; }
function dims(nominal) { const h = Math.min(20, 12 + nominal / 30000 * 5.5); const d = Math.sqrt(nominal / (Math.PI / 4 * h)); return { d: +d.toFixed(1), h: +h.toFixed(1) }; }
const r10 = v => Math.round(v / 10) * 10;

const PLM_OVR = {
  'T-01': { vol: 21437, reserved: 4768, batch: 'PLM-R92-2609-118' },
  'T-02': { vol: 26814, reserved: 5936, batch: 'PLM-R92-2609-118' },
  'T-03': { vol: 4123, batch: 'PLM-R92-2609-104', water: 6 },
  'T-04': { vol: 20087, q: 'Awaiting test results', batch: 'PLM-R92-2610-021', water: 4, temp: 31.4 },
  'T-05': { vol: 18906, batch: 'PLM-R90-2609-087' },
  'T-06': { vol: 24291, batch: 'PLM-R90-2609-087' },
  'T-07': { vol: 12452, q: 'On hold', batch: 'PLM-R90-2610-002', },
  'T-08': { vol: 6218, tempSrc: 'unavailable', manualTemp: 30.8, manualAt: 360, batch: 'PLM-R98-2609-019', alarm: { sev: 'attention', text: 'Temperature probe fault' } },
  'T-09': { vol: 17383, batch: 'PLM-B0-2609-044' },
  'T-10': { vol: 25961, q: 'Awaiting test results', status: 'Settling', batch: 'PLM-B0-2610-006' },
  'T-11': { vol: 22146, reserved: 5984, batch: 'BLD-PLM-2610-005' },
  'T-12': { vol: 8327, q: 'Awaiting test results', batch: 'BLD-PLM-2610-007' },
  'T-13': { vol: 27953, q: 'Awaiting test results', batch: 'BLD-PLM-2610-006', alarm: { sev: 'attention', text: 'High level' } },
  'T-14': { vol: 9874, water: 17, batch: 'PLM-R95-2609-033' },
  'T-15': { vol: 383, status: 'Out of service', water: null, batch: null, q: 'Released', note: `Internal inspection · returns ${day(7199)}` },
  'T-16': { vol: 6407, batch: 'PLM-FAME-2609-012' },
};

export const TERMINALS = TDEF.map(t => {
  const r = rng(hash(t.id));
  const bunds = []; const tanks = []; let n = 0;
  t.spec.split('|').forEach((b, bi) => {
    const bund = { id: String.fromCharCode(65 + bi), tanks: [] };
    b.split(',').forEach(s => {
      const [code, k] = s.split(':'); n++;
      const id = 'T-' + pad(n), p = prod(code), nominal = +k * 1000, dm = dims(nominal);
      const moc = Math.round(nominal * (0.946 + r() * 0.008));
      const tank = {
        id, term: t.id, bund: bund.id, code, kind: p.kind, nominal, moc, hla: r10(nominal * 0.925), heel: r10(nominal * 0.035),
        vol: Math.round(moc * (0.28 + r() * 0.58)), diam: dm.d, height: dm.h, roof: roofFor(code), material: 'Carbon steel shell', coating: 'Internal epoxy lining',
        status: 'Idle', q: 'Released', reserved: 0, alarm: null,
        temp: +(29.4 + r() * 2.6).toFixed(1), tempSrc: 'measured',
        dens15: +(p.dens + (r() - 0.5) * 3).toFixed(1),
        water: r() < 0.82 ? Math.round(r() * 18) : null,
        batch: `${t.id}-${p.short.replace(/[^A-Z0-9.]/gi, '')}-2609-${pad(10 + Math.floor(r() * 80))}`,
      };
      if (t.id === 'PLM' && PLM_OVR[id]) Object.assign(tank, PLM_OVR[id]);
      tanks.push(tank); bund.tanks.push(id);
    });
    bunds.push(bund);
  });
  return { ...t, status: t.status || 'Operating', bunds, tanks };
});
export const term = id => TERMINALS.find(t => t.id === id);
export const tank = (tid, kid) => (term(tid) || { tanks: [] }).tanks.find(k => k.id === kid);

// ── Transfers ──────────────────────────────────────────────────────────
export const TRANSFERS = [
  { id: 'TRF-PLM-26-0418', term: 'PLM', type: 'Ship-to-shore', code: 'R92', vessel: 'MT Sanggar Lestari', voyage: 'V.2614', berth: 'Jetty 2', arm: 'MLA-2', meter: 'FM-02', comp: 'COT 3P / 3S', dst: 'T-04', planned: 18463, recv: 11847, flow: 1446, start: 305, arrive: -150, pauses: [[580, 635, 'Vessel cargo pump trip (vessel side)']], state: 'In progress', press: 6.8, temp: 31.4, dens: 735.2, batch: 'PLM-R92-2610-021', vesselPress: 9.2, vesselTemp: 31.6 },
  { id: 'TRF-PLM-26-0412', term: 'PLM', type: 'Ship-to-shore', code: 'B0', vessel: 'MT Arung Samudra', voyage: 'V.0931', berth: 'Jetty 1', arm: 'MLA-1', meter: 'FM-01', comp: 'COT 1–5 P/S', dst: 'T-10', planned: 21964, recv: 21926, flow: 0, start: -470, end: 160, arrive: -650, pauses: [], state: 'Completed', press: null, temp: 30.6, dens: 838.4, batch: 'PLM-B0-2610-006',
    recon: { basis: 'GSV kL @ 15 °C', rows: [['Nominated quantity', 21964, 'Nomination NOM-2609-311'], ['Vessel figures — bill of lading (load port)', 21987, 'B/L 0931-07'], ['Vessel figures — arrival ullage, VEF applied', 21951, 'Ullage report UR-0931'], ['Shore meter FM-01', 21929, 'Meter ticket MT-FM01-77120'], ['Shore tank T-10 (closing − opening gauge)', 21926, 'Gauge GG-T10-1005']], ref: 3 } },
  { id: 'TRF-PLM-26-0422', term: 'PLM', type: 'Ship-to-shore', code: 'R92', vessel: 'MT Nusa Bahari', voyage: 'V.1207', berth: 'Jetty 1', arm: 'MLA-1', meter: 'FM-01', comp: 'COT 2P / 2S / 4P / 4S', dst: 'T-03', planned: 14936, recv: 0, flow: null, start: 1680, arrive: 1560, pauses: [], state: 'Scheduled', batch: 'PLM-R92-2610-024' },
  { id: 'TRF-PLM-26-0420', term: 'PLM', type: 'Truck dispatch', truck: 24, code: 'R92', src: 'T-01', dst: 'Gantry bays 1–4', node: 'gantry', pump: 'P-01', planned: 2183, flow: 126, start: 360, pauses: [], state: 'In progress' },
  { id: 'TRF-PLM-26-0423', term: 'PLM', type: 'Truck dispatch', truck: 24, code: 'R90', src: 'T-05', dst: 'Gantry bays 5–6', node: 'gantry', pump: 'P-02', planned: 1843, flow: 104, start: 360, pauses: [], state: 'In progress' },
  { id: 'TRF-PLM-26-0424', term: 'PLM', type: 'Truck dispatch', truck: 32, code: 'B40', src: 'T-11', dst: 'Gantry bays 7–8', node: 'gantry', pump: 'P-02', planned: 2903, flow: 171, start: 360, pauses: [], state: 'In progress' },
  { id: 'BLD-PLM-2610-007', term: 'PLM', type: 'Inline blend', code: 'B40', src: 'T-09 + T-16', srcs: [['T-09', 0.6], ['T-16', 0.4]], dst: 'T-12', pump: 'P-04', planned: 6120, recv: 4011, flow: 554, start: 431, pauses: [], state: 'In progress' },
  { id: 'TRF-SBY-26-0233', term: 'SBY', type: 'Ship-to-shore', code: 'B0', vessel: 'MT Wira Samudra', voyage: 'V.1120', berth: 'Berth 1', arm: 'MLA-1', meter: 'FM-01', comp: 'COT 1P / 1S / 3C', dst: 'T-11', planned: 13846, recv: 6417, flow: 0, start: 540, arrive: 300, pauses: [[810, null, 'Vessel ballast operation']], state: 'Paused', press: 0.4, temp: 30.2, dens: 838.9, batch: 'SBY-B0-2610-011', vesselPress: 0.0, vesselTemp: 30.5 },
  { id: 'TRF-SBY-26-0236', term: 'SBY', type: 'Truck dispatch', truck: 16, code: 'R92', src: 'T-02', dst: 'Gantry bays 1–3', node: 'gantry', pump: 'P-01', planned: 1500, flow: 118, start: 360, pauses: [], state: 'In progress' },
  { id: 'TRF-UPG-26-0102', term: 'UPG', type: 'Ship-to-shore', code: 'B40', vessel: 'MT Lintas Celebes', voyage: 'V.0447', berth: 'Berth 1', arm: 'MLA-1', meter: 'FM-01', comp: 'COT 2P / 2S', dst: 'T-08', planned: 9472, recv: 3108, flow: 817, start: 630, arrive: 420, pauses: [], state: 'In progress', press: 5.9, temp: 30.9, dens: 855.6, batch: 'UPG-B40-2610-008', vesselPress: 8.1, vesselTemp: 31.0 },
  { id: 'TRF-BIK-26-0077', term: 'BIK', type: 'Ship-to-shore', code: 'R92', vessel: 'MT Teluk Cendana', voyage: 'V.0215', berth: 'Berth 1', arm: 'MLA-1', meter: 'FM-01', comp: 'COT 1P / 1S', dst: 'T-02', planned: 3812, recv: 0, flow: null, start: 1080, arrive: 360, pauses: [], state: 'Delayed', batch: 'BIK-R92-2610-003' },
  { id: 'TRF-BOY-26-0058', term: 'BOY', type: 'Pipeline receipt', code: 'R92', src: 'Pipeline', dst: 'T-02', planned: 4036, recv: 2377, flow: 308, start: 400, pauses: [], state: 'In progress' },
  { id: 'TRF-SMB-26-0144', term: 'SMB', type: 'Ship-to-shore', code: 'R92', vessel: 'MT Kirana Bahari', voyage: 'V.0388', berth: 'Berth 2', arm: 'MLA-2', meter: 'FM-02', comp: 'COT 1–6 P/S', dst: 'T-03', planned: 29874, recv: 17236, flow: null, lastFlow: 2206, meterLost: 832, start: 360, arrive: 60, pauses: [], state: 'In progress', press: 7.1, temp: 31.0, dens: 735.8, batch: 'SMB-R92-2610-005', vesselPress: 9.6, vesselTemp: 31.2 },
  { id: 'TRF-PNJ-26-0201', term: 'PNJ', type: 'Truck dispatch', truck: 16, code: 'B40', src: 'T-07', dst: 'Gantry bays 1–2', node: 'gantry', pump: 'P-01', planned: 1291, flow: 88, start: 360, pauses: [], state: 'In progress' },
  { id: 'TRF-PLJ-26-0310', term: 'PLJ', type: 'Truck dispatch', truck: 16, code: 'R92', src: 'T-05', dst: 'Gantry bays 1–3', node: 'gantry', pump: 'P-01', planned: 1689, flow: 112, start: 360, pauses: [], state: 'In progress' },
  { id: 'TRF-JUA-26-0540', term: 'JUA', type: 'Pipeline receipt', code: 'J2', src: 'Pipeline', dst: 'T-02', planned: 2418, recv: 1507, flow: 238, start: 480, pauses: [], state: 'In progress' },
  { id: 'TRF-CGK-26-1188', term: 'CGK', type: 'Hydrant dispatch', code: 'J2', src: 'T-01', dst: 'Hydrant network', node: 'hydrant', pump: 'P-01', planned: 3642, flow: 412, start: 300, pauses: [], state: 'In progress' },
  { id: 'TRF-DPS-26-0610', term: 'DPS', type: 'Hydrant dispatch', code: 'J2', src: 'T-02', dst: 'Hydrant network', node: 'hydrant', pump: 'P-01', planned: 2388, flow: 277, start: 300, pauses: [], state: 'In progress' },
  { id: 'TRF-KNO-26-0233', term: 'KNO', type: 'Hydrant dispatch', code: 'J2', src: 'T-01', dst: 'Hydrant network', node: 'hydrant', pump: 'P-01', planned: 1296, flow: 158, start: 300, pauses: [], state: 'In progress' },
  { id: 'TRF-BLG-26-0091', term: 'BLG', type: 'Pipeline dispatch', code: 'J2', src: 'T-02', dst: 'Pipeline to AFT soetta CGK', node: 'pipeout', pump: 'P-02', planned: 6042, flow: 348, start: 240, pauses: [], state: 'In progress' },
  { id: 'TRF-VPK-26-0815', term: 'VPK', type: 'Ship-to-shore', code: 'R95', vessel: 'MT Sunda Mulia', voyage: 'V.0912', berth: 'Berth 2', arm: 'MLA-2', meter: 'FM-02', comp: 'COT 2P / 2S', dst: 'T-05', planned: 7463, recv: 2046, flow: 687, start: 690, arrive: 480, pauses: [], state: 'In progress', press: 5.4, temp: 31.1, dens: 741.3, batch: 'VPK-R95-2610-004', vesselPress: 7.6, vesselTemp: 31.3 },
  { id: 'TRF-VPK-26-0817', term: 'VPK', type: 'Truck dispatch', truck: 24, code: 'B0', src: 'T-09', dst: 'Gantry bays 1–2, 4–6', node: 'gantry', pump: 'P-01', planned: 1971, flow: 139, start: 360, pauses: [], state: 'In progress' },
];
function overlap(a, b, c, d) { return Math.max(0, Math.min(b, d) - Math.max(a, c)); }
function pumpMins(tr, a, b) {
  const s = tr.start, e = tr.end != null ? tr.end : NOW;
  let m = overlap(a, b, s, e);
  (tr.pauses || []).forEach(([p, q]) => { m -= overlap(a, b, Math.max(p, s), q == null ? e : Math.min(q, e)); });
  return Math.max(0, m);
}
const srcsOf = tr => tr.srcs || (tr.src && tr.src.startsWith('T-') ? [[tr.src, 1]] : []);
function derive(tr) {
  if (tr.truck) { tr.truckN = tr.planned / tr.truck; tr.trucksDone = tr.recv / tr.truck; tr.trucksH = (tr.flow || 0) / tr.truck; }
  const pm = pumpMins(tr, -1e9, 1e9);
  tr.avgRate = pm > 0 ? tr.recv / pm * 60 : 0;
  tr.remaining = Math.max(0, tr.planned - tr.recv);
  tr.active = ['In progress', 'Paused'].includes(tr.state);
  tr.pumpMin = pm;
  const flowKnown = tr.state === 'In progress' && tr.flow > 0;
  tr.etaMin = flowKnown ? NOW + Math.max(0, tr.planned - tr.qty) / tr.flow * 60 : null;
  tr.marine = tr.type === 'Ship-to-shore';
}
// tank status for a running or paused transfer
function mark(tr) {
  const t = term(tr.term); if (!t || !tr.active) return;
  const blend = tr.type.includes('blend');
  const dst = t.tanks.find(k => k.id === tr.dst);
  if (dst) { dst.status = blend ? 'Blending' : (tr.state === 'Paused' ? 'Receiving · paused' : 'Receiving'); dst.activity = { ref: tr.id, kind: 'receipt' }; }
  srcsOf(tr).forEach(([sid]) => { const k = t.tanks.find(x => x.id === sid); if (k) { k.status = blend ? 'Blending' : 'Dispatching'; k.activity = { ref: tr.id, kind: 'dispatch' }; } });
}
TRANSFERS.forEach(tr => {
  if (tr.recv == null) tr.recv = tr.truck ? Math.floor(tr.flow * Math.max(0, NOW - tr.start) / 60 / tr.truck) * tr.truck : Math.round(tr.flow * Math.max(0, NOW - tr.start) / 60);
  tr.qty = tr.truck ? tr.flow * Math.max(0, NOW - tr.start) / 60 : tr.recv; // quantity moved; for trucks recv counts completed loads only
  if (tr.truck) tr.planned = Math.ceil(tr.planned / tr.truck) * tr.truck;
  if (tr.state === 'In progress' && tr.flow > 0) tr.flow0 = tr.flow;
  derive(tr);
});
export function flowText(tr) { if (tr.flow == null) return null; return tr.truck ? `${fmt(tr.flow)} kL/h · ≈ ${tr.trucksH.toFixed(1)} trucks/h` : `${fmt(tr.flow)} kL/h`; }
export function moved(tr, a, b) { if (tr.start >= NOW && tr.state !== 'Completed') return 0; return tr.avgRate * pumpMins(tr, a, b) / 60; }

// apply transfer activity to tanks, keep capacities consistent
TRANSFERS.forEach(tr => {
  const t = term(tr.term); if (!t || !tr.active) return;
  const dst = t.tanks.find(k => k.id === tr.dst);
  if (dst && tr.term !== 'PLM') { const maxVol = dst.moc - tr.remaining - 400; const opening = Math.max(dst.heel + 600, Math.min(dst.vol - tr.recv, maxVol - tr.recv)); dst.vol = Math.round(opening + tr.recv); dst.q = tr.marine ? 'Awaiting test results' : dst.q; if (tr.marine) dst.batch = tr.batch; }
  srcsOf(tr).forEach(([sid]) => { const k = t.tanks.find(x => x.id === sid); if (k && tr.term !== 'PLM' && k.vol < k.heel + 3000) k.vol = Math.round(k.heel + 3127 + tr.recv); });
  mark(tr);
});
// a few deterministic holds outside PLM
[['PLJ', 'T-04', 'On hold'], ['BLG', 'T-04', 'Awaiting test results']].forEach(([a, b, q]) => { const k = tank(a, b); if (k) k.q = q; });
{ const k = tank('PLJ', 'T-09'); if (k) k.water = 21; }
{ const k = tank('DPS', 'T-04'); if (k) k.batch = 'DPS-J53-2610-004'; }
{ const k = tank('BLG', 'T-04'); if (k) k.batch = 'BLD-BLG-2610-004'; }
{ const k = tank('PLJ', 'T-04'); if (k) k.batch = 'BLD-PLJ-2610-011'; }

export function tankFlows(k) {
  const out = [];
  TRANSFERS.filter(tr => tr.term === k.term).forEach(tr => {
    if (tr.dst === k.id) out.push({ tr, sign: 1, share: 1 });
    srcsOf(tr).forEach(([sid, sh]) => { if (sid === k.id) out.push({ tr, sign: -1, share: sh }); });
  });
  return out;
}
export const ADJ = { 'PLM:T-08': -6, 'PLM:T-14': 3, 'SBY:T-03': -4, 'VPK:T-02': 5 };
export function movements(k, a, b) {
  let rec = 0, dis = 0;
  tankFlows(k).forEach(f => { const v = moved(f.tr, a, b) * f.share; if (f.sign > 0) rec += v; else dis += v; });
  const adj = (a <= 0 && b >= 600) ? (ADJ[k.term + ':' + k.id] || 0) : 0;
  rec = Math.round(rec); dis = Math.round(dis);
  return { open: k.vol - rec + dis - adj, rec, dis, adj, close: k.vol };
}
export function volAt(k, t) { let v = k.vol; tankFlows(k).forEach(f => { v -= f.sign * f.share * moved(f.tr, t, NOW); }); return v; }
export function tankHistory(k, hours = 24, step = 30) {
  const pts = [], seed = hash(k.term + k.id + 'h');
  const area = Math.PI / 4 * k.diam * k.diam;
  const ts = []; for (let t = grid(NOW - hours * 60, step); t < NOW; t += step) ts.push(t); ts.push(NOW);
  ts.forEach(t => {
    const v = volAt(k, t);
    const lvl = v / area * 1000;
    let temp = k.temp0 - diurnal(REF) + diurnal(t) + (rng(seed ^ Math.round(t))() - 0.5) * 0.12;
    if (k.tempSrc === 'unavailable' && t > 190) temp = null;
    pts.push({ t, v, lvl, temp: temp == null ? null : +temp.toFixed(2) });
  });
  return pts;
}
export function stock(k) {
  const total = k.vol, oos = k.status === 'Out of service';
  const usable = oos ? 0 : Math.max(0, total - k.heel);
  const held = k.q !== 'Released' ? usable : 0;
  const reserved = Math.min(k.reserved || 0, usable - held);
  const avail = usable - held - reserved;
  const rx = (oos || k.q === 'On hold') ? 0 : Math.max(0, k.moc - total);
  const area = Math.PI / 4 * k.diam * k.diam;
  return { total, usable, held, reserved, avail, rx, unp: total - usable, fill: total / k.nominal, level: total / area * 1000, hlaLevel: k.hla / area * 1000 };
}
export function vcf(code, temp) { const f = prod(code).fam; const a = f === 'Gasoline' || code === 'NAP' || code === 'HOMC' ? 0.00120 : f === 'Aviation' || code === 'HEFA' || code === 'JFC' ? 0.00095 : 0.00082; return 1 - a * (temp - 15); }

// ── Exceptions ─────────────────────────────────────────────────────────
export const EXCEPTIONS = [
  { id: 'EX-3107', sev: 'attention', term: 'BIK', asset: 'Berth 1', what: 'Berth closed for swell — vessel holding at anchorage', since: 462, op: 'Receipt TRF-BIK-26-0077 · MT Teluk Cendana delayed', owner: 'D. Rumbewas · Marine supervisor', status: 'Acknowledged', ack: { by: 'D. Rumbewas', at: 470 }, res: null },
  { id: 'EX-3109', sev: 'attention', term: 'PLM', asset: 'T-13', what: 'High level — 27,953 kL above high-level alarm 27,750 kL', since: 618, op: 'Further receipts into T-13 blocked', owner: 'R. Hakim · Shift supervisor', status: 'Acknowledged', ack: { by: 'R. Hakim', at: 626 }, res: null },
  { id: 'EX-3112', sev: 'attention', term: 'PLM', asset: 'TT-108 · T-08', what: 'Temperature probe fault — manual dip temperature in use', since: 190, op: `T-08 corrected volume based on ${hhmm(360)} manual temperature`, owner: 'Instrument technician on call', status: 'In progress', ack: { by: 'R. Hakim', at: 204 }, res: null },
  { id: 'EX-3117', sev: 'attention', term: 'SMB', asset: 'FM-02 · Berth 2 line', what: 'Flow meter FM-02 not reporting — tank gauging used for progress', since: 832, op: 'TRF-SMB-26-0144 · completion estimate unavailable', owner: 'Control room · SMB', status: 'Open', ack: null, res: null },
  { id: 'EX-3085', sev: 'attention', term: 'PLM', asset: 'MT Sanggar Lestari', what: 'Vessel cargo pump trip — transfer paused 55 min', since: 580, op: 'TRF-PLM-26-0418', owner: 'Loading master · Jetty 2', status: 'Resolved', ack: { by: 'R. Hakim', at: 584 }, res: { by: 'R. Hakim', at: 640, note: `Vessel pump restarted; transfer resumed ${tm(635)}.` } },
];
export const SEV = { critical: { label: 'Critical', rank: 0 }, attention: { label: 'Attention', rank: 1 }, info: { label: 'Advisory', rank: 2 } };

// ── Equipment ──────────────────────────────────────────────────────────
const M = (k, v, u, src = 'M') => ({ k, v, u, src });
export function equipment(t) {
  const E = [];
  const pumps = t.kind.startsWith('Aviation') ? 2 : t.tanks.length > 10 ? 4 : 3;
  E.push({ id: 'M-01', type: 'Manifold', name: 'Receipt manifold', status: 'In service', material: 'Carbon steel, ANSI 150 (configurable)', readings: [M('Header pressure', 4.6, 'bar(g)'), M('Valve line-up', 'Verified ' + tm(270, t.tz, { tz: false }), '', 'C')], note: 'MOV-101…116 tank inlet valves' });
  E.push({ id: 'M-02', type: 'Manifold', name: 'Dispatch manifold', status: 'In service', material: 'Carbon steel, ANSI 150 (configurable)', readings: [M('Header pressure', 3.1, 'bar(g)')] });
  (t.marine || []).forEach((b, i) => E.push({ id: 'MLA-' + (i + 1), type: 'Marine loading arm', name: b + ' loading arm', status: 'In service', material: '12" arm, stainless swivels (configurable)', readings: [M('Arm envelope', 'Within limits', '', 'M')] }));
  const nm = t.marine ? t.marine.length : 1;
  for (let i = 1; i <= nm; i++) E.push({ id: 'FM-0' + i, type: 'Flow meter', name: (t.marine ? t.marine[i - 1] : 'Receipt') + ' meter skid', status: 'In service', material: 'Turbine meter, prover connection', readings: [M('Last proving', day(NOW - 7 * 1440, t.tz, true), '', 'C'), M('Meter factor', 1.0012, '', 'C')] });
  for (let i = 1; i <= pumps; i++) E.push({ id: 'P-0' + i, type: 'Pump', name: 'Transfer pump ' + i, status: 'Standby', material: 'Centrifugal, ductile iron casing (configurable)', readings: [M('Discharge pressure', null, 'bar(g)'), M('Motor current', null, 'A'), M('Vibration', null, 'mm/s')] });
  if (t.truck) E.push({ id: 'GTY', type: 'Gantry', name: `Truck loading gantry · ${t.truck} bays`, status: 'In service', readings: [M('Bays in service', t.id === 'VPK' ? t.truck - 1 : t.truck, 'bays', 'M')] });
  if (t.hydrant) E.push({ id: 'HYD', type: 'Hydrant', name: 'Hydrant network supply', status: 'In service', readings: [M('Hydrant pressure', 8.4, 'bar(g)')] });
  if (t.blend) E.push({ id: 'BS-1', type: 'Blend skid', name: `${t.blend.mode} blend skid`, status: 'In service', material: 'Ratio controller, 2 component meters', readings: [M('Controller mode', 'Ratio control', '', 'M')] });
  if (t.pipeOut) E.push({ id: 'PL-OUT', type: 'Pipeline', name: t.pipeOut, status: 'In service', readings: [M('Line pressure', 22.5, 'bar(g)')] });
  if (t.pipeIn) E.push({ id: 'PL-IN', type: 'Pipeline', name: t.pipeIn, status: 'In service', readings: [M('Inlet pressure', 5.2, 'bar(g)')] });
  // running pumps from transfers
  TRANSFERS.filter(tr => tr.term === t.id && tr.active && tr.pump).forEach(tr => { const p = E.find(e => e.id === tr.pump); if (p) { p.status = tr.state === 'Paused' ? 'Standby' : 'Running'; p.duty = (p.duty ? p.duty + ' · ' : '') + tr.id; p.readings = [M('Flow', tr.flow, 'kL/h'), M('Discharge pressure', +(5.4 + (tr.flow % 7) / 3).toFixed(1), 'bar(g)'), M('Motor current', Math.round(28 + tr.flow / 12), 'A'), M('Vibration', +(1.6 + (tr.flow % 5) / 10).toFixed(1), 'mm/s')]; } });
  if (t.id === 'PLM') { const p3 = E.find(e => e.id === 'P-03'); Object.assign(p3, { status: 'Standby', note: `Seal replacement scheduled ${tm(1740, 'WIB', { date: true })}`, readings: [M('Discharge pressure', 0.2, 'bar(g)'), M('Motor current', 0, 'A'), M('Vibration', null, 'mm/s', 'U')] }); }
  // receipt meters and the blend skid follow the live transfers
  TRANSFERS.filter(tr => tr.term === t.id && tr.state === 'In progress' && tr.meter).forEach(tr => { const fm = E.find(e => e.id === tr.meter); if (!fm) return; if (tr.meterLost != null) { fm.status = 'Comms lost'; fm.readings.unshift(M('Flow', null, 'kL/h', 'U')); } else { fm.status = 'Running'; fm.readings.unshift(M('Flow', tr.flow, 'kL/h')); } });
  const bs = E.find(e => e.id === 'BS-1'), blend = BLENDS.find(b => b.term === t.id && b.state === 'In progress'); if (bs && blend) { bs.status = 'Running'; bs.duty = blend.id; }
  return E;
}

// ── Blending ───────────────────────────────────────────────────────────
export const RECIPES = {
  B40: { comps: [['B0', 59.6], ['FAME', 40.4]], tol: 0.5, note: 'FAME content is calculated from recipe volumes. Final FAME content requires laboratory confirmation.', props: [['FAME content', '%v/v', 'calc'], ['Density @ 15 °C', 'kg/m³', null], ['Cetane number', '—', null], ['Oxidation stability', 'h', null]] },
  R92: { comps: [['NAP', 37.4], ['HOMC', 62.6]], tol: 1.0, note: 'RON does not blend linearly; no validated octane model is configured.', props: [['Research octane number', 'RON', null], ['Density @ 15 °C', 'kg/m³', null], ['RVP', 'kPa', null], ['Distillation E70', '%v/v', null]] },
  R95: { comps: [['R92', 53.9], ['HOMC', 46.1]], tol: 1.0, note: 'RON does not blend linearly; no validated octane model is configured.', props: [['Research octane number', 'RON', null], ['Density @ 15 °C', 'kg/m³', null], ['RVP', 'kPa', null], ['Distillation E70', '%v/v', null]] },
  R98: { comps: [['R95', 41.7], ['HOMC', 58.3]], tol: 1.0, note: 'RON does not blend linearly; no validated octane model is configured.', props: [['Research octane number', 'RON', null], ['Density @ 15 °C', 'kg/m³', null], ['RVP', 'kPa', null]] },
  J2: { comps: [['JFC', 97.96], ['HEFA', 2.04]], tol: 0.1, note: 'Synthetic component share is a recipe quantity only. Release depends on component certificates, blend certificate and laboratory results.', props: [['Synthetic component share', '%v/v', 'calc'], ['Density @ 15 °C', 'kg/m³', null], ['Freezing point', '°C', null], ['Flash point', '°C', null], ['Thermal stability (JFTOT)', '—', null]] },
  J53: { comps: [['JFC', 94.62], ['HEFA', 5.38]], tol: 0.1, note: 'Synthetic component share is a recipe quantity only. Release depends on component certificates, blend certificate and laboratory results.', props: [['Synthetic component share', '%v/v', 'calc'], ['Density @ 15 °C', 'kg/m³', null], ['Freezing point', '°C', null], ['Flash point', '°C', null], ['Thermal stability (JFTOT)', '—', null]] },
};
export const BLENDS = [
  { id: 'BLD-PLM-2610-008', term: 'PLM', code: 'B40', mode: 'Inline', state: 'Draft', target: 5840, dst: 'T-11', comps: [{ c: 'B0', tank: 'T-09', qty: 3481 }, { c: 'FAME', tank: 'T-16', qty: 2359 }], rate: 554, created: `R. Hakim · ${tm(785, 'WIB', { date: true })}` },
  { id: 'BLD-PLM-2610-007', term: 'PLM', code: 'B40', mode: 'Inline', state: 'In progress', target: 6120, dst: 'T-12', comps: [{ c: 'B0', tank: 'T-09', qty: 3648, done: 2394, flow: 331 }, { c: 'FAME', tank: 'T-16', qty: 2472, done: 1617, flow: 223 }], rate: 554, start: 431, sample: 'S-PLM-261005-036' },
  { id: 'BLD-PLM-2610-006', term: 'PLM', code: 'B40', mode: 'Inline', state: 'Awaiting test results', target: 5962, dst: 'T-13', comps: [{ c: 'B0', tank: 'T-09', qty: 3553 }, { c: 'FAME', tank: 'T-16', qty: 2409 }], start: -760, end: -110, sample: 'S-PLM-261004-077' },
  { id: 'BLD-PLM-2610-005', term: 'PLM', code: 'B40', mode: 'Inline', state: 'Released', target: 6973, dst: 'T-11', comps: [{ c: 'B0', tank: 'T-10', qty: 4156 }, { c: 'FAME', tank: 'T-16', qty: 2817 }], start: -3300, end: -2540, sample: 'S-PLM-261003-041' },
  { id: 'BLD-PLJ-2610-012', term: 'PLJ', code: 'R95', mode: 'Batch', state: 'Draft', target: 3962, dst: 'T-07', comps: [{ c: 'R92', tank: 'T-06', qty: 2136 }, { c: 'HOMC', tank: 'T-09', qty: 1826 }], rate: 612 },
  { id: 'BLD-PLJ-2610-011', term: 'PLJ', code: 'R98', mode: 'Batch', state: 'On hold', target: 2486, dst: 'T-04', comps: [{ c: 'R95', tank: 'T-07', qty: 1037 }, { c: 'HOMC', tank: 'T-09', qty: 1449 }], start: -900, end: -560, sample: 'S-PLJ-261004-021' },
  { id: 'BLD-BLG-2610-005', term: 'BLG', code: 'J2', mode: 'Batch', state: 'Draft', target: 9842, dst: 'T-03', comps: [{ c: 'JFC', tank: 'T-07', qty: 9641 }, { c: 'HEFA', tank: 'T-06', qty: 201 }], rate: 893 },
  { id: 'BLD-BLG-2610-004', term: 'BLG', code: 'J53', mode: 'Batch', state: 'Awaiting test results', target: 11936, dst: 'T-04', comps: [{ c: 'JFC', tank: 'T-08', qty: 11294 }, { c: 'HEFA', tank: 'T-06', qty: 642 }], start: -1200, end: -380, sample: 'S-BLG-261004-012',
    certs: [['HEFA-SPK component certificate · lot HS-2609-17', 'Received', 'DOC-BLG-5531'], ['Conventional jet refinery certificate · JFC batch 2609-88', 'Received', 'DOC-BLG-5520'], ['Blended batch certificate of analysis', 'Pending', null], ['Release certificate (RCQ)', 'Not issued', null]], pathway: 'HEFA-SPK synthetic blending component · pathway per terminal procedure' },
  { id: 'BLD-SBY-2610-003', term: 'SBY', code: 'B40', mode: 'Inline', state: 'Scheduled', target: 4918, dst: 'T-09', comps: [{ c: 'B0', tank: 'T-11', qty: 2931 }, { c: 'FAME', tank: 'T-12', qty: 1987 }], start: 1500, rate: 517 },
];
export const BLEND_STATES = ['Draft', 'Scheduled', 'In progress', 'Awaiting test results', 'Released', 'On hold'];

// ── Quality ────────────────────────────────────────────────────────────
const tst = (prop, method, result, unit, spec, status) => ({ prop, method, result, unit, spec, status });
export const SAMPLES = [
  { id: 'S-PLM-261005-031', term: 'PLM', code: 'R92', batch: 'PLM-R92-2610-021', loc: 'T-04 · upper / middle / lower running sample', link: { type: 'tank', id: 'T-04' }, at: 750, status: 'Pending', lab: 'LAB-PLM · job 26-4471', decision: 'Pending', by: null,
    tests: [tst('Appearance', 'Visual', 'Clear & bright', '', 'Clear & bright', 'Passed'), tst('Density @ 15 °C', 'ASTM D4052', 735.6, 'kg/m³', '715 – 770', 'Passed'), tst('Research octane number', 'ASTM D2699', null, 'RON', '≥ 92.0', 'Pending'), tst('Distillation FBP', 'ASTM D86', null, '°C', '≤ 215', 'Pending')] },
  { id: 'S-PLM-261005-024', term: 'PLM', code: 'R92', batch: 'PLM-R92-2610-021', loc: 'MT Sanggar Lestari · COT 3P/3S composite', link: { type: 'transfer', id: 'TRF-PLM-26-0418' }, at: 135, status: 'Passed', lab: 'Load-port CoQ LP-88214 · verified', decision: 'Accepted for discharge', by: { who: 'S. Wulandari · Quality officer', at: 262 },
    tests: [tst('Appearance', 'Visual', 'Clear & bright', '', 'Clear & bright', 'Passed'), tst('Density @ 15 °C', 'ASTM D4052', 735.1, 'kg/m³', '715 – 770', 'Passed'), tst('Research octane number', 'ASTM D2699', 92.4, 'RON', '≥ 92.0', 'Passed')] },
  { id: 'S-PLM-261005-019', term: 'PLM', code: 'B0', batch: 'PLM-B0-2610-006', loc: 'T-10 · post-receipt running sample', link: { type: 'tank', id: 'T-10' }, at: 400, status: 'Pending', lab: 'LAB-PLM · job 26-4468', decision: 'Pending', by: null,
    tests: [tst('Density @ 15 °C', 'ASTM D4052', 838.2, 'kg/m³', '815 – 860', 'Passed'), tst('Sulphur content', 'ASTM D5453', null, 'mg/kg', '≤ 50', 'Pending'), tst('Water content', 'ASTM D6304', null, 'mg/kg', '≤ 200', 'Pending'), tst('FAME content', 'EN 14078', 0.1, '%v/v', '≤ 0.5', 'Passed')] },
  { id: 'S-PLM-261005-036', term: 'PLM', code: 'B40', batch: 'BLD-PLM-2610-007', loc: 'BS-1 outlet · in-process line sample', link: { type: 'blend', id: 'BLD-PLM-2610-007' }, at: 720, status: 'Pending', lab: 'LAB-PLM · job 26-4473', decision: 'Pending', by: null,
    tests: [tst('FAME content', 'EN 14078', null, '%v/v', '39.0 – 41.0', 'Pending'), tst('Density @ 15 °C', 'ASTM D4052', 855.4, 'kg/m³', '840 – 870', 'Passed')] },
  { id: 'S-PLM-261004-077', term: 'PLM', code: 'B40', batch: 'BLD-PLM-2610-006', loc: 'T-13 · upper / middle / lower running sample', link: { type: 'blend', id: 'BLD-PLM-2610-006' }, at: -50, status: 'Missing result', lab: 'LAB-PLM · job 26-4459', decision: 'Pending', by: null,
    tests: [tst('FAME content', 'EN 14078', 40.1, '%v/v', '39.0 – 41.0', 'Passed'), tst('Density @ 15 °C', 'ASTM D4052', 855.0, 'kg/m³', '840 – 870', 'Passed'), tst('Oxidation stability', 'EN 15751', null, 'h', '≥ 35', 'Missing result'), tst('Water content', 'ASTM D6304', 182, 'mg/kg', '≤ 350', 'Passed')] },
  { id: 'S-PLM-261004-062', term: 'PLM', code: 'R90', batch: 'PLM-R90-2610-002', loc: 'T-07 · upper / middle / lower running sample', link: { type: 'tank', id: 'T-07' }, at: -340, status: 'Failed', lab: 'LAB-PLM · job 26-4450', decision: 'On hold', by: { who: 'S. Wulandari · Quality officer', at: -322 },
    tests: [tst('Research octane number', 'ASTM D2699', 89.6, 'RON', '≥ 90.0', 'Failed'), tst('Density @ 15 °C', 'ASTM D4052', 727.4, 'kg/m³', '715 – 770', 'Passed'), tst('Distillation FBP', 'ASTM D86', 204, '°C', '≤ 215', 'Passed')] },
  { id: 'S-PLM-261003-041', term: 'PLM', code: 'B40', batch: 'BLD-PLM-2610-005', loc: 'T-11 · upper / middle / lower running sample', link: { type: 'blend', id: 'BLD-PLM-2610-005' }, at: -2400, status: 'Passed', lab: 'LAB-PLM · job 26-4402', decision: 'Released', by: { who: 'S. Wulandari · Quality officer', at: -1875 },
    tests: [tst('FAME content', 'EN 14078', 39.8, '%v/v', '39.0 – 41.0', 'Passed'), tst('Density @ 15 °C', 'ASTM D4052', 854.6, 'kg/m³', '840 – 870', 'Passed'), tst('Oxidation stability', 'EN 15751', 41, 'h', '≥ 35', 'Passed')] },
  { id: 'S-BLG-261004-012', term: 'BLG', code: 'J53', batch: 'BLD-BLG-2610-004', loc: 'T-04 · upper / middle / lower running sample', link: { type: 'blend', id: 'BLD-BLG-2610-004' }, at: -300, status: 'Pending', lab: 'LAB-BLG · job 26-1188', decision: 'Pending', by: null,
    tests: [tst('Density @ 15 °C', 'ASTM D4052', 797.3, 'kg/m³', '775 – 840', 'Passed'), tst('Flash point', 'IP 170', 42.5, '°C', '≥ 38', 'Passed'), tst('Freezing point', 'ASTM D5972', null, '°C', '≤ −47', 'Pending'), tst('Thermal stability (JFTOT)', 'ASTM D3241', null, '—', 'Pass', 'Pending')] },
  { id: 'S-DPS-261004-009', term: 'DPS', code: 'J53', batch: 'DPS-J53-2610-004', loc: 'T-04 · composite', link: { type: 'tank', id: 'T-04' }, at: 180, status: 'Pending', lab: `External lab · results due ${hhmm(900, 'WITA')}`, decision: 'Pending', by: { who: 'Quality officer · DPS', at: 545 },
    tests: [tst('Density @ 15 °C', 'ASTM D4052', 797.1, 'kg/m³', '775 – 840', 'Passed'), tst('Flash point', 'IP 170', null, '°C', '≥ 38', 'Pending')] },
  { id: 'S-PLJ-261004-021', term: 'PLJ', code: 'R98', batch: 'BLD-PLJ-2610-011', loc: 'T-04 · composite', link: { type: 'blend', id: 'BLD-PLJ-2610-011' }, at: -520, status: 'Failed', lab: 'LAB-PLJ · job 26-0933', decision: 'On hold', by: { who: 'M. Lubis · Quality officer', at: -480 },
    tests: [tst('Research octane number', 'ASTM D2699', 97.4, 'RON', '≥ 98.0', 'Failed'), tst('Density @ 15 °C', 'ASTM D4052', 747.0, 'kg/m³', '715 – 770', 'Passed')] },
  { id: 'S-SBY-261005-008', term: 'SBY', code: 'B0', batch: 'SBY-B0-2610-011', loc: 'MT Wira Samudra · composite', link: { type: 'transfer', id: 'TRF-SBY-26-0233' }, at: 420, status: 'Passed', lab: 'Load-port CoQ · verified', decision: 'Accepted for discharge', by: { who: 'Quality officer · SBY', at: 500 },
    tests: [tst('Density @ 15 °C', 'ASTM D4052', 838.7, 'kg/m³', '815 – 860', 'Passed'), tst('Sulphur content', 'ASTM D5453', 38, 'mg/kg', '≤ 50', 'Passed')] },
];
export const TRACE = {
  'BLD-PLM-2610-007': { product: 'B40', tank: 'T-12', comps: [{ c: 'B0', tank: 'T-09', batch: 'PLM-B0-2609-044', share: 59.6, src: 'TRF-PLM-26-0398 · MT Bahtera Jaya', docs: ['CoQ load port Q-0398', 'Shore receipt sample S-PLM-260927-012'] }, { c: 'FAME', tank: 'T-16', batch: 'PLM-FAME-2609-012', share: 40.4, src: 'Road receipts · FAME supplier', docs: ['Supplier CoA FM-2609-12', 'Receipt sample S-PLM-260929-004'] }], docs: ['Blend order BLD-PLM-2610-007', 'In-process sample S-PLM-261005-036'] },
  'BLD-PLM-2610-006': { product: 'B40', tank: 'T-13', comps: [{ c: 'B0', tank: 'T-09', batch: 'PLM-B0-2609-044', share: 59.6, src: 'TRF-PLM-26-0398 · MT Bahtera Jaya', docs: ['CoQ load port Q-0398'] }, { c: 'FAME', tank: 'T-16', batch: 'PLM-FAME-2609-012', share: 40.4, src: 'Road receipts · FAME supplier', docs: ['Supplier CoA FM-2609-12'] }], docs: ['Blend order BLD-PLM-2610-006', 'Tank sample S-PLM-261004-077'] },
  'BLD-PLM-2610-005': { product: 'B40', tank: 'T-11', comps: [{ c: 'B0', tank: 'T-10', batch: 'PLM-B0-2609-031', share: 59.6, src: 'TRF-PLM-26-0381 · MT Arung Samudra', docs: ['CoQ load port Q-0381'] }, { c: 'FAME', tank: 'T-16', batch: 'PLM-FAME-2609-009', share: 40.4, src: 'Road receipts · FAME supplier', docs: ['Supplier CoA FM-2609-09'] }], docs: ['Blend order BLD-PLM-2610-005', 'Release record REL-PLM-2610-005'] },
  'BLD-BLG-2610-004': { product: 'J53', tank: 'T-04', comps: [{ c: 'JFC', tank: 'T-08', batch: 'BLG-JETC-2609-88', share: 94.62, src: 'TRF-BLG-26-0084 · MT Cakra Biru', docs: ['Refinery certificate DOC-BLG-5520'] }, { c: 'HEFA', tank: 'T-06', batch: 'BLG-HEFA-2609-17', share: 5.38, src: 'Import parcel HS-2609-17', docs: ['Component certificate DOC-BLG-5531'] }], docs: ['Blend order BLD-BLG-2610-004', 'Tank sample S-BLG-261004-012'] },
  'BLD-PLJ-2610-011': { product: 'R98', tank: 'T-04', comps: [{ c: 'R95', tank: 'T-07', batch: 'PLJ-R95-2609-41', share: 41.7, src: 'Batch blend BLD-PLJ-2609-008', docs: ['Release record REL-PLJ-2609-008'] }, { c: 'HOMC', tank: 'T-09', batch: 'PLJ-HOMC-2609-12', share: 58.3, src: 'Refinery transfer · pipeline', docs: ['Refinery certificate RC-HOMC-2609-12'] }], docs: ['Blend order BLD-PLJ-2610-011', 'Tank sample S-PLJ-261004-021'] },
  'PLM-R92-2610-021': { product: 'R92', tank: 'T-04', comps: [{ c: 'R92', tank: 'MT Sanggar Lestari', batch: 'Cargo LP-88214', share: 59.0, src: 'TRF-PLM-26-0418 (in progress)', docs: ['B/L 2614-03', 'CoQ load port LP-88214', 'Vessel sample S-PLM-261005-024'] }, { c: 'R92', tank: 'T-04 heel', batch: 'PLM-R92-2609-104', share: 41.0, src: 'Existing tank stock before receipt', docs: ['Release record REL-PLM-2609-104'] }], docs: ['Tank sample S-PLM-261005-031'] },
};

// ── Scheduling ─────────────────────────────────────────────────────────
const span = (a, b) => `${hhmm(a)}–${hhmm(b)}, ${day(a)}`;
export const SCHEDULE = {
  PLM: {
    lanes: ['Jetty 1', 'Jetty 2', 'Jetty 1 line', 'T-03', 'T-04', 'T-11', 'T-12', 'T-15', 'BS-1', 'P-03', 'Gantry'],
    items: [
      { id: 'TRF-PLM-26-0412', lane: 'Jetty 1', type: 'Receipt', label: 'MT Arung Samudra · B0', a: -650, b: 220, ref: 'TRF-PLM-26-0412' },
      { id: 'TRF-PLM-26-0422', lane: 'Jetty 1', type: 'Receipt', label: 'MT Nusa Bahari · R92', a: 1560, b: 2460, ref: 'TRF-PLM-26-0422' },
      { id: 'TRF-PLM-26-0418', lane: 'Jetty 2', type: 'Receipt', label: 'MT Sanggar Lestari · R92', a: -150, b: 1195, ref: 'TRF-PLM-26-0418' },
      { id: 'SCH-PLM-0431', lane: 'Jetty 2', type: 'Receipt', label: 'MT Bima Perkasa · B0 (ETA)', a: 2280, b: 3300 },
      { id: 'L1-0412', lane: 'Jetty 1 line', type: 'Transfer', label: 'TRF-0412 discharge', a: -470, b: 160 },
      { id: 'L1-PIG', lane: 'Jetty 1 line', type: 'Maintenance', label: 'Line pigging', a: 1920, b: 2160 },
      { id: 'L1-0422', lane: 'Jetty 1 line', type: 'Transfer', label: 'TRF-0422 discharge', a: 1680, b: 2400 },
      { id: 'T03-0422', lane: 'T-03', type: 'Receipt', label: 'Receipt 14,936 kL R92', a: 1680, b: 2400 },
      { id: 'T04-0418', lane: 'T-04', type: 'Receipt', label: 'Receipt TRF-0418', a: 305, b: 1135 },
      { id: 'T04-QS', lane: 'T-04', type: 'Quality', label: 'Settle & sample', a: 1135, b: 1435 },
      { id: 'T11-D1', lane: 'T-11', type: 'Dispatch', label: 'Truck dispatch B40', a: 360, b: 1320 },
      { id: 'T11-D2', lane: 'T-11', type: 'Dispatch', label: 'Truck dispatch B40', a: 1800, b: 2640 },
      { id: 'T11-BLD', lane: 'T-11', type: 'Blending', label: 'BLD-008 receipt (draft)', a: 2100, b: 2760 },
      { id: 'T12-BLD', lane: 'T-12', type: 'Blending', label: 'BLD-007 receipt', a: 431, b: 1083 },
      { id: 'T12-QS', lane: 'T-12', type: 'Quality', label: 'Sample & test', a: 1083, b: 1380 },
      { id: 'T15-M', lane: 'T-15', type: 'Maintenance', label: 'Internal inspection · out of service', a: -2880, b: 7200 },
      { id: 'BS-007', lane: 'BS-1', type: 'Blending', label: 'BLD-PLM-2610-007', a: 431, b: 1083 },
      { id: 'BS-CAL', lane: 'BS-1', type: 'Maintenance', label: 'FAME meter calibration', a: 2220, b: 2340 },
      { id: 'BS-008', lane: 'BS-1', type: 'Blending', label: 'BLD-PLM-2610-008 (draft)', a: 2100, b: 2760 },
      { id: 'P03-M', lane: 'P-03', type: 'Maintenance', label: 'Seal replacement', a: 1740, b: 2100 },
    ],
    conflicts: [
      { id: 'CF-01', kind: 'Route availability', items: ['L1-PIG', 'L1-0422'], text: `Jetty 1 line pigging (${span(1920, 2160)}) overlaps the planned TRF-PLM-26-0422 discharge.`, fix: `Move pigging after ${hhmm(2400)} or delay discharge start.` },
      { id: 'CF-02', kind: 'Tank availability', items: ['T11-D2', 'T11-BLD'], text: `T-11 is scheduled to dispatch and receive BLD-PLM-2610-008 at the same time (${span(2100, 2640)}).`, fix: 'Select another destination tank or move the blend after dispatch.' },
      { id: 'CF-03', kind: 'Equipment', items: ['BS-CAL', 'BS-008'], text: `Blend skid BS-1 FAME meter calibration (${span(2220, 2340)}) falls inside BLD-PLM-2610-008.`, fix: `Start the blend after ${hhmm(2340)} or reschedule calibration.` },
    ],
  },
};
export function scheduleFor(tid) {
  const t = term(tid), S = SCHEDULE[tid]; // a fixed plan where one exists, plus everything generated live
  const lanes = S ? [...S.lanes] : [...(t.marine || [])], items = S ? [...S.items] : [];
  const lane = n => { if (!lanes.includes(n)) lanes.push(n); return n; };
  TRANSFERS.filter(tr => tr.term === tid && (!S || tr.gen) && !BLENDS.some(b => b.id === tr.id)).forEach(tr => {
    const end = tr.end != null ? tr.end : tr.etaMin || tr.start + Math.max(300, tr.planned / Math.max(tr.flow || tr.flow0 || 400, 1) * 60);
    if (tr.berth) items.push({ id: tr.id, lane: lane(tr.berth), type: tr.marine ? 'Receipt' : 'Dispatch', label: `${tr.vessel} · ${prod(tr.code).short}`, a: tr.arrive != null ? tr.arrive : tr.start, b: end + 60, ref: tr.id });
    items.push({ id: tr.id + '-t', lane: lane(tr.dst && tr.dst.startsWith('T-') ? tr.dst : tr.src), type: /dispatch|loading/i.test(tr.type) ? 'Dispatch' : 'Receipt', label: tr.id.slice(-7) + ' · ' + tr.type, a: tr.start, b: end });
  });
  BLENDS.filter(b => b.term === tid && b.start != null && b.state !== 'Released' && (!S || b.gen)).forEach(b => {
    const end = b.end || b.start + b.target / (b.rate || 500) * 60;
    items.push({ id: b.id, lane: lane(b.dst), type: 'Blending', label: b.id, a: b.start, b: end });
    if (S) items.push({ id: b.id + '-s', lane: lane('BS-1'), type: 'Blending', label: b.id, a: b.start, b: end });
  });
  // daily truck loading windows, moving with the scenario so dispatches stay inside them
  if (t.truck) { const d0 = Math.floor((NOW - 360) / 1440) * 1440; [-1440, 0, 1440, 2880].forEach((d, i) => items.push({ id: `${tid}-g${i}`, lane: lane('Gantry'), type: 'Dispatch', label: `Loading window ${hhmm(360 + d0 + d)}–${hhmm(1320 + d0 + d)}`, a: 360 + d0 + d, b: 1320 + d0 + d })); }
  if (t.hydrant) items.push({ id: tid + '-h', lane: lane('Hydrant'), type: 'Dispatch', label: 'Hydrant supply · continuous', a: NOW - 1440, b: NOW + 2880 });
  const conflicts = S ? S.conflicts.filter(c => c.items.some(id => { const i = items.find(x => x.id === id); return i && i.b > NOW; })) : [];
  return { lanes, items, conflicts };
}

// ── Summaries ──────────────────────────────────────────────────────────
export function tsum(t, prods) {
  const has = c => !prods || !prods.length || prods.includes(c);
  let inv = 0, cap = 0, held = 0, rx = 0, rsv = 0, avail = 0, holds = 0, comp = 0; const byProd = {};
  t.tanks.forEach(k => {
    const s = stock(k);
    if (k.kind === 'component') { comp += s.total; return; }
    if (!has(k.code)) return;
    inv += s.total; cap += k.moc; held += s.held; rx += s.rx; rsv += s.reserved; avail += s.avail;
    if (k.q !== 'Released') holds++;
    byProd[k.code] = (byProd[k.code] || 0) + s.total;
  });
  const trs = TRANSFERS.filter(tr => tr.term === t.id && tr.active && has(tr.code));
  const sch = scheduleFor(t.id).items.filter(i => i.a > NOW && i.a < NOW + 2880);
  const rxN = sch.filter(i => i.type === 'Receipt' && !i.lane.startsWith('T-') && !i.lane.includes('line')).length + (SCHEDULE[t.id] ? 0 : 0);
  const dxN = sch.filter(i => i.type === 'Dispatch').length;
  const ex = EXCEPTIONS.filter(e => e.term === t.id && e.status !== 'Resolved').sort((a, b) => SEV[a.sev].rank - SEV[b.sev].rank || a.since - b.since);
  const products = [...new Set(t.tanks.filter(k => k.kind === 'product').map(k => k.code))];
  return { inv, cap, held, rx, rsv, avail, holds, comp, byProd, trs, active: trs.length, rxN, dxN, ex, top: ex[0] || null, products, tankN: t.tanks.length };
}
export function invTrend(t, prods, hours = 24, step = 60) {
  const has = c => !prods || !prods.length || prods.includes(c);
  const out = [];
  for (let x = NOW - hours * 60; x <= NOW + 0.1; x += step) { let v = 0; t.tanks.forEach(k => { if (k.kind === 'product' && has(k.code)) v += volAt(k, x); }); out.push({ t: x, v }); }
  return out;
}
export function caps(t) {
  const c = [];
  if (t.marine) c.push('Marine'); if (t.blend) c.push('Blending'); if (t.truck) c.push('Truck loading'); if (t.hydrant) c.push('Hydrant'); if (t.pipeIn || t.pipeOut) c.push('Pipeline');
  return c;
}

// ── Search index ───────────────────────────────────────────────────────
export function searchIndex() {
  const out = [];
  TERMINALS.forEach(t => { out.push({ type: 'Terminal', label: t.name, sub: `${t.area} · ${t.tz}`, go: ['terminal', { terminalId: t.id }] }); t.tanks.forEach(k => out.push({ type: 'Tank', label: `${k.id} · ${prod(k.code).label}`, sub: t.name, go: ['terminal', { terminalId: t.id, focus: { type: 'tank', id: k.id } }] })); });
  TRANSFERS.forEach(tr => { out.push({ type: tr.type.includes('blend') ? 'Batch' : 'Transfer', label: tr.id, sub: `${tr.type} · ${prod(tr.code).label} · ${term(tr.term).name}`, go: tr.type.includes('blend') ? ['blending', { terminalId: tr.term, focus: { type: 'blend', id: tr.id } }] : ['transfers', { terminalId: tr.term, focus: { type: 'transfer', id: tr.id } }] }); if (tr.vessel) out.push({ type: 'Vessel', label: tr.vessel, sub: `${tr.voyage} · ${tr.berth} · ${term(tr.term).name}`, go: ['transfers', { terminalId: tr.term, focus: { type: 'transfer', id: tr.id } }] }); });
  BLENDS.forEach(b => { if (!out.find(o => o.label === b.id)) out.push({ type: 'Batch', label: b.id, sub: `${b.state} · ${prod(b.code).label} · ${term(b.term).name}`, go: ['blending', { terminalId: b.term, focus: { type: 'blend', id: b.id } }] }); });
  SAMPLES.forEach(s => out.push({ type: 'Sample', label: s.id, sub: `${s.batch} · ${s.status}`, go: ['quality', { terminalId: s.term, focus: { type: 'sample', id: s.id } }] }));
  return out;
}

// ── Mutable store actions (simulation only; no equipment is controlled) ─
export const LOG = [];
export function ackEx(id, who, at) { const e = EXCEPTIONS.find(x => x.id === id); if (e && !e.ack) { e.ack = { by: who, at }; if (e.status === 'Open') e.status = 'Acknowledged'; } }
export function resolveEx(id, who, at, note) { const e = EXCEPTIONS.find(x => x.id === id); if (e) { e.res = { by: who, at, note: note || 'Resolved by operator.' }; e.status = 'Resolved'; } }

// ── Live clock (simulation only; no equipment is controlled) ───────────
// The network runs in 5-minute slots. Product moves continuously; at every slot boundary new activity is
// generated: vessels, truck loading, pipeline and hydrant runs, blends, lab results, releases and the odd
// pump trip. Random draws are keyed to the run and the slot, so a reopened console replays the same story.
const SLOT = 5;
const diurnal = m => 0.7 * Math.sin((clockMin(m) - 600) / 1440 * 2 * Math.PI); // tank temperature swing, warmest late afternoon
const wave = (id, m, amp) => { const h = hash(id) & 1023; return 1 + amp * (0.67 * Math.sin(m / 3.7 + h) + 0.33 * Math.sin(m / 1.3 + h * 2)); };
const R = key => rng(hash(BASE + '|' + key));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const between = (r, lo, hi, step = 1) => Math.round((lo + r() * (hi - lo)) / step) * step;
const ymd = m => { const d = local(m, 'WIB'); return pad(d.getUTCFullYear() % 100) + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()); };
const SEQ = {};
function seq(key, list, re) { if (SEQ[key] == null) SEQ[key] = list.reduce((a, x) => { const m = re.exec(x.id); return m ? Math.max(a, +m[1]) : a; }, 0); return ++SEQ[key]; }
const VESSELS = ['MT Arunika Bahari', 'MT Seruni Jaya', 'MT Kencana Samudra', 'MT Larasati Timur', 'MT Tirta Mandala', 'MT Gelora Bahari', 'MT Baruna Sakti', 'MT Pelangi Timur', 'MT Mutiara Selatan', 'MT Surya Kencana', 'MT Bintang Selatan', 'MT Dewi Samudra', 'MT Cahaya Bahari', 'MT Rajawali Biru', 'MT Anggrek Laut', 'MT Sinar Kartika', 'MT Nirwana Jaya', 'MT Puspa Bahari', 'MT Melati Samudra', 'MT Kirana Timur', 'MT Samudra Abadi', 'MT Laut Teduh', 'MT Mega Lestari', 'MT Citra Samudra'];
const COTS = ['COT 1P / 1S', 'COT 2P / 2S', 'COT 1–4 P/S', 'COT 3P / 3S / 5C', 'COT 1–6 P/S', 'COT 2P / 2S / 4P / 4S'];
const RON = { R90: 90, R92: 92, R95: 95, R98: 98 };
const LIVE = ['Scheduled', 'Delayed', 'In progress', 'Paused'];
const QUEUE = []; // follow-ups due later: samples after a receipt or blend
const busy = (t, id) => TRANSFERS.some(tr => tr.term === t.id && LIVE.includes(tr.state) && (tr.dst === id || srcsOf(tr).some(([x]) => x === id))) || BLENDS.some(b => b.term === t.id && (b.state === 'Scheduled' || b.state === 'In progress') && (b.dst === id || b.comps.some(c => c.tank === id)));
const free = (t, k) => k.status === 'Idle' && k.q === 'Released' && !busy(t, k.id);
const room = k => k.hla - k.vol - 300;
const spare = k => stock(k).avail - 300;
const fill = t => { let v = 0, c = 0; t.tanks.forEach(k => { if (k.kind === 'product') { v += k.vol; c += k.nominal; } }); return c ? v / c : 0; };
const officer = tid => tid === 'PLM' ? 'S. Wulandari · Quality officer' : tid === 'PLJ' ? 'M. Lubis · Quality officer' : 'Quality officer · ' + tid;
const trfId = (t, s) => `TRF-${t.id}-${ymd(s).slice(0, 2)}-${String(seq('TRF' + t.id, TRANSFERS, new RegExp(`^TRF-${t.id}-\\d\\d-(\\d+)$`))).padStart(4, '0')}`;
function add(tr) { Object.assign(tr, { gen: true, pauses: [], recv: 0, qty: 0 }); TRANSFERS.push(tr); derive(tr); mark(tr); return tr; }

function begin(tr, ev) {
  const t = term(tr.term), r = R('go' + tr.id);
  tr.state = 'In progress'; tr.flow0 = tr.flow0 || tr.rate || Math.round(tr.planned / 10); tr.flow = tr.flow0; tr.recv = tr.qty = 0; tr.active = true;
  if (tr.marine) {
    tr.press = +(5 + r() * 2).toFixed(1); tr.vesselPress = +(tr.press + 1.5 + r()).toFixed(1); tr.vesselTemp = +((tr.temp || 31) + r() * 0.4).toFixed(1);
    const k = t.tanks.find(x => x.id === tr.dst); if (k) { k.q = 'Awaiting test results'; k.batch = tr.batch; }
  }
  mark(tr);
  if (tr.vessel) ev.push(`${tr.vessel} ${tr.marine ? 'discharging' : 'loading'} at ${t.name} ${tr.berth} · ${fmt(tr.planned)} kL ${prod(tr.code).label}.`);
}
function blendTransfer(b) {
  const done = b.comps.reduce((a, c) => a + (c.done || 0), 0), t = term(b.term);
  const tr = { id: b.id, term: b.term, type: b.mode + ' blend', code: b.code, src: b.comps.map(c => c.tank).join(' + '), srcs: b.comps.map(c => [c.tank, c.qty / b.target]), dst: b.dst, pump: 'P-04', planned: b.target, recv: Math.round(done), qty: done, flow: b.rate, flow0: b.rate, start: b.start, pauses: [], state: 'In progress', gen: b.gen };
  const k = t.tanks.find(x => x.id === b.dst); if (k) { k.batch = b.id; k.q = 'Awaiting test results'; }
  TRANSFERS.push(tr); derive(tr); mark(tr);
}
function settle(tr, end, ev) {
  const t = term(tr.term), blend = tr.type.includes('blend');
  tr.state = 'Completed'; tr.end = end; tr.flow = 0; tr.qty = tr.recv = tr.planned; tr.active = false;
  t.tanks.forEach(k => { if (k.activity && k.activity.ref === tr.id) { k.activity = null; k.status = k.id === tr.dst && (blend || tr.marine) ? 'Settling' : 'Idle'; if (k.id === tr.dst && blend) k.q = 'Awaiting test results'; } });
  const b = BLENDS.find(x => x.id === tr.id); if (b) { b.state = 'Awaiting test results'; b.end = end; b.comps.forEach(c => { c.done = c.qty; }); }
  if (!blend && !tr.vessel) return; // routine truck, pipeline and hydrant runs finish quietly
  ev.push(`${tr.id} completed · ${fmt(tr.planned)} kL ${t.tanks.some(k => k.id === tr.dst) ? 'received' : 'loaded'}${blend ? '. Batch awaiting test results — not released' : ''}.`);
  if (blend || tr.marine) { const k = t.tanks.find(x => x.id === tr.dst); QUEUE.push({ at: end + between(R('q' + tr.id), 20, 60, 5), run: at => takeSample(t, at, b ? b.id : k && k.batch, b ? { type: 'blend', id: b.id } : { type: 'tank', id: tr.dst }, tr.code, tr) }); }
}

// ── Quality: samples, results and release ─────────────────────────────
function testsFor(code) {
  const p = prod(code), d = Math.round(p.dens), T = (prop, method, unit, spec, now) => ({ prop, method, unit, spec, now });
  if (p.fam === 'Gasoline') return [T('Appearance', 'Visual', '', 'Clear & bright', 1), T('Density @ 15 °C', 'ASTM D4052', 'kg/m³', '715 – 770', 1), T('Research octane number', 'ASTM D2699', 'RON', '≥ ' + (RON[code] || 92).toFixed(1)), T('Distillation FBP', 'ASTM D86', '°C', '≤ 215')];
  if (code === 'B0') return [T('Density @ 15 °C', 'ASTM D4052', 'kg/m³', '815 – 860', 1), T('Sulphur content', 'ASTM D5453', 'mg/kg', '≤ 50'), T('Water content', 'ASTM D6304', 'mg/kg', '≤ 200'), T('FAME content', 'EN 14078', '%v/v', '≤ 0.5')];
  if (code === 'B40') return [T('FAME content', 'EN 14078', '%v/v', '39.0 – 41.0'), T('Density @ 15 °C', 'ASTM D4052', 'kg/m³', '840 – 870', 1), T('Oxidation stability', 'EN 15751', 'h', '≥ 35'), T('Water content', 'ASTM D6304', 'mg/kg', '≤ 350')];
  if (p.fam === 'Aviation') return [T('Density @ 15 °C', 'ASTM D4052', 'kg/m³', '775 – 840', 1), T('Flash point', 'IP 170', '°C', '≥ 38'), T('Freezing point', 'ASTM D5972', '°C', '≤ −47'), T('Thermal stability (JFTOT)', 'ASTM D3241', '—', 'Pass')];
  return [T('Appearance', 'Visual', '', 'Clear & bright', 1), T('Density @ 15 °C', 'ASTM D4052', 'kg/m³', `${d - 25} – ${d + 25}`, 1)];
}
function measure(x, code, r, bad) {
  const p = prod(code), v = (lo, hi, dp) => +(lo + r() * (hi - lo)).toFixed(dp), B40 = code === 'B40', m = RON[code] || 92;
  const res = {
    'Appearance': () => bad ? 'Hazy' : 'Clear & bright',
    'Research octane number': () => bad ? v(m - 0.8, m - 0.2, 1) : v(m + 0.2, m + 0.9, 1),
    'Distillation FBP': () => bad ? v(216, 221, 0) : v(194, 210, 0),
    'Sulphur content': () => bad ? v(52, 60, 0) : v(18, 45, 0),
    'Water content': () => B40 ? (bad ? v(360, 420, 0) : v(120, 280, 0)) : (bad ? v(205, 260, 0) : v(60, 170, 0)),
    'FAME content': () => B40 ? (bad ? v(38.1, 38.8, 1) : v(39.5, 40.6, 1)) : (bad ? v(0.6, 0.9, 1) : v(0, 0.3, 1)),
    'Oxidation stability': () => bad ? v(29, 34, 0) : v(37, 46, 0),
    'Flash point': () => bad ? v(35, 37.5, 1) : v(40, 48, 1),
    'Freezing point': () => bad ? v(-46.5, -45, 1) : v(-56, -49, 1),
    'Thermal stability (JFTOT)': () => bad ? 'Fail' : 'Pass',
  }[x.prop];
  const result = res ? res() : x.prop.startsWith('Density') ? v(p.dens - 1.5, p.dens + 1.5, 1) : (x.result != null ? x.result : '—');
  return { prop: x.prop, method: x.method, result, unit: x.unit, spec: x.spec, status: res && bad ? 'Failed' : 'Passed' };
}
function takeSample(t, at, batch, link, code, tr) {
  if (!batch || SAMPLES.some(x => x.batch === batch && (x.decision === 'Pending' || (tr && x.at >= tr.start)))) return; // already sampled during this movement
  const r = R('smp' + batch), id = `S-${t.id}-${ymd(at)}-${String(seq('S' + t.id, SAMPLES, new RegExp(`^S-${t.id}-\\d{6}-(\\d+)$`))).padStart(3, '0')}`;
  const tests = testsFor(code).map(x => x.now ? measure(x, code, r, false) : { prop: x.prop, method: x.method, result: null, unit: x.unit, spec: x.spec, status: 'Pending' });
  const b = BLENDS.find(x => x.id === batch);
  SAMPLES.unshift({ id, term: t.id, code, batch, loc: `${b ? b.dst : link.id} · upper / middle / lower running sample`, link, at, status: 'Pending', lab: `LAB-${t.id} · job ${ymd(at).slice(0, 2)}-${between(r, 1000, 9999)}`, decision: 'Pending', by: null, tests, resAt: at + between(r, 90, 180, 5), gen: true });
  if (b && !b.sample) b.sample = id;
  if (!TRACE[batch] && tr && tr.vessel) TRACE[batch] = { product: code, tank: link.id, comps: [{ c: code, tank: tr.vessel, batch: `Cargo ${tr.voyage}`, share: 100, src: tr.id, docs: [`Bill of lading ${tr.voyage}`, 'Load-port certificate of quality'] }], docs: [`Tank sample ${id}`] };
}
function results(smp, s, ev) {
  const r = R('res' + smp.id), bad = r() < 0.04 ? Math.floor(r() * smp.tests.length) : -1;
  smp.tests = smp.tests.map((x, i) => x.status === 'Pending' ? measure(x, smp.code, r, i === bad) : x);
  smp.status = smp.tests.some(x => x.status === 'Failed') ? 'Failed' : 'Passed';
  smp.decAt = s + between(r, 30, 90, 5);
  if (smp.status === 'Failed') ev.push(`${smp.id} · ${smp.tests.find(x => x.status === 'Failed').prop} out of specification for ${smp.batch}.`);
}
function decide(smp, s, ev) {
  const t = term(smp.term), b = BLENDS.find(x => x.id === smp.batch);
  const ready = smp.link.type === 'blend' ? b && b.state === 'Awaiting test results' : !TRANSFERS.some(x => x.term === smp.term && x.dst === smp.link.id && x.active);
  if (!ready) return; // a running sample waits until the tank or batch is complete
  const ok = smp.status === 'Passed';
  smp.decision = ok ? 'Released' : 'On hold'; smp.by = { who: officer(t.id), at: s };
  const k = t.tanks.find(x => x.batch === smp.batch); if (k) { k.q = ok ? 'Released' : 'On hold'; if (k.status === 'Settling') k.status = 'Idle'; }
  if (b) { b.state = ok ? 'Released' : 'On hold'; if (ok && b.certs) b.certs = b.certs.map(([n, , ref]) => [n, 'Received', ref || `DOC-${t.id}-${between(R('doc' + b.id + n), 5000, 9999)}`]); }
  ev.push(ok ? `${smp.batch} released at ${t.name} · all tests passed.` : `${smp.batch} placed on hold at ${t.name}.`);
}

// ── Generators ─────────────────────────────────────────────────────────
function genVessel(t, s, r, berth) {
  const bi = t.marine.indexOf(berth) + 1, vessel = pick(r, VESSELS.filter(v => !TRANSFERS.some(x => x.vessel === v && x.state !== 'Completed'))); if (!vessel) return;
  const arrive = s + between(r, 30, 180, 5), base = { id: trfId(t, s), term: t.id, vessel, voyage: 'V.' + between(r, 1000, 9999), berth, arm: 'MLA-' + bi, meter: 'FM-0' + bi, comp: pick(r, COTS), arrive, start: arrive + between(r, 45, 120, 5), state: 'Scheduled', flow: null };
  if (t.shipOut && fill(t) > 0.55 && r() < 0.6) { // strategic storage also loads vessels out
    const k = t.tanks.filter(x => x.kind === 'product' && free(t, x) && spare(x) >= 6000).sort((a, b) => spare(b) - spare(a))[0]; if (!k) return;
    add({ ...base, type: 'Ship loading', code: k.code, src: k.id, dst: `${berth} · ${vessel}`, node: 'ship', pump: 'P-01', planned: Math.min(Math.round(spare(k)), between(r, 8000, 20000)), flow0: between(r, 1200, 2000, 10), batch: k.batch });
    return;
  }
  const ks = t.tanks.filter(k => k.code !== 'FAME' && free(t, k) && room(k) >= Math.max(800, k.nominal * 0.3)).sort((a, b) => room(b) / b.nominal - room(a) / a.nominal);
  const k = pick(r, ks.slice(0, 3)); if (!k) return;
  const p = prod(k.code), planned = Math.min(30000, between(r, room(k) * 0.55, room(k) * 0.85));
  add({ ...base, type: 'Ship-to-shore', code: k.code, dst: k.id, planned, flow0: Math.max(250, between(r, planned / 13, planned / 8, 10)), temp: +(30 + r() * 2).toFixed(1), dens: +(p.dens + (r() - 0.5) * 2).toFixed(1), batch: `${t.id}-${p.short.replace(/[^A-Z0-9.]/gi, '')}-${ymd(s).slice(0, 4)}-${pad(30 + seq('B' + t.id, [], /$^/))}` });
}
function genTruck(t, s, r) {
  const sod = ((s % 1440) + 1440) % 1440; if (sod < 360 || sod > 1260) return; // inside the loading window
  const used = new Set();
  TRANSFERS.filter(x => x.term === t.id && x.active && x.node === 'gantry').forEach(x => (x.dst.match(/\d+(?:\s*[–-]\s*\d+)?/g) || []).forEach(g => { const [a, b] = g.split(/[–-]/).map(Number); for (let i = a; i <= (b || a); i++) used.add(i); }));
  const k = pick(r, t.tanks.filter(x => x.kind === 'product' && free(t, x) && spare(x) >= 1500).sort((a, b) => spare(b) - spare(a)).slice(0, 4)); if (!k) return;
  const truck = /^B/.test(k.code) ? 32 : t.truck <= 4 ? 16 : 24, flow0 = between(r, 80, 170), n = Math.max(1, Math.min(4, Math.round(flow0 / 45)));
  let a = 0; for (let i = 1; i + n - 1 <= t.truck && !a; i++) { let ok = true; for (let j = i; j < i + n; j++) if (used.has(j)) ok = false; if (ok) a = i; }
  const planned = Math.floor(Math.min(between(r, 1200, 2600), spare(k), flow0 * (1320 - sod) / 60) / truck) * truck;
  if (!a || planned < truck * 15) return;
  add({ id: trfId(t, s), term: t.id, type: 'Truck dispatch', truck, code: k.code, src: k.id, dst: n === 1 ? `Gantry bay ${a}` : `Gantry bays ${a}–${a + n - 1}`, node: 'gantry', pump: pick(r, ['P-01', 'P-02']), planned, flow: flow0, flow0, start: s, state: 'In progress' });
}
function genFeed(t, s, r, node) { // hydrant or outbound pipeline, run back to back
  const k = t.tanks.filter(x => x.kind === 'product' && free(t, x) && spare(x) >= 800).sort((a, b) => spare(b) - spare(a))[0]; if (!k) return;
  const size = Math.min(1, t.tanks.reduce((a, x) => a + x.nominal, 0) / 30000); // small airport depots draw less
  const flow0 = node === 'hydrant' ? Math.round(between(r, 150, 420) * size) : between(r, 280, 420);
  add({ id: trfId(t, s), term: t.id, type: node === 'hydrant' ? 'Hydrant dispatch' : 'Pipeline dispatch', code: k.code, src: k.id, dst: node === 'hydrant' ? 'Hydrant network' : t.pipeOut, node, pump: node === 'hydrant' ? 'P-01' : 'P-02', planned: Math.min(Math.round(spare(k)), between(r, 1500, 4500)), flow: flow0, flow0, start: s, state: 'In progress' });
}
function genInflow(t, s, r, type, fame) { // pipeline or road receipt into the emptiest tank
  const k = t.tanks.filter(x => (fame ? x.code === 'FAME' : x.kind === 'product') && free(t, x) && room(x) >= Math.max(500, x.nominal * 0.25)).sort((a, b) => a.vol / a.nominal - b.vol / b.nominal)[0]; if (!k) return;
  const flow0 = fame ? between(r, 60, 120) : between(r, 200, 350);
  add({ id: trfId(t, s), term: t.id, type, code: k.code, src: type === 'Road receipt' ? 'Road tankers' : 'Pipeline', dst: k.id, planned: between(r, room(k) * 0.5, room(k) * 0.85), flow: flow0, flow0, start: s, state: 'In progress' });
}
function genBlend(t, s, r, ev) {
  if (BLENDS.some(b => b.term === t.id && (b.state === 'Scheduled' || b.state === 'In progress'))) return; // one batch on the skid at a time
  const code = pick(r, t.blend.products), rec = RECIPES[code]; if (!rec) return;
  const dst = t.tanks.filter(k => k.code === code && free(t, k) && room(k) >= 1500).sort((a, b) => room(b) - room(a))[0]; if (!dst) return;
  const src = rec.comps.map(([c, pct]) => ({ c, pct, k: t.tanks.filter(k => k.code === c && free(t, k) && spare(k) > 500).sort((a, b) => spare(b) - spare(a))[0] }));
  if (src.some(x => !x.k)) return;
  const target = Math.floor(Math.min(room(dst) * 0.9, t.blend.mode === 'Inline' ? 6500 : 4500, ...src.map(x => spare(x.k) / x.pct * 100)) / 10) * 10; if (target < 1500) return;
  const comps = src.map(x => ({ c: x.c, tank: x.k.id, qty: Math.round(target * x.pct / 100) })); comps[0].qty += target - comps.reduce((a, c) => a + c.qty, 0);
  const id = `BLD-${t.id}-${ymd(s).slice(0, 4)}-${String(seq('BLD' + t.id, BLENDS, new RegExp(`^BLD-${t.id}-\\d{4}-(\\d+)$`))).padStart(3, '0')}`, start = s + between(r, 30, 90, 5);
  const b = { id, term: t.id, code, mode: t.blend.mode, state: 'Scheduled', target, dst: dst.id, comps, rate: t.blend.mode === 'Inline' ? between(r, 500, 600, 2) : between(r, 550, 900, 10), start, created: `${t.id === 'PLM' ? 'R. Hakim' : 'Shift supervisor · ' + t.id} · ${tm(s, t.tz, { date: true })}`, gen: true };
  if (prod(code).fam === 'Aviation') { b.certs = [[`HEFA-SPK component certificate · lot HS-${ymd(s).slice(0, 4)}-${between(r, 10, 99)}`, 'Received', `DOC-${t.id}-${between(r, 5000, 9999)}`], [`Conventional jet refinery certificate · JFC batch ${ymd(s).slice(0, 4)}-${between(r, 10, 99)}`, 'Received', `DOC-${t.id}-${between(r, 5000, 9999)}`], ['Blended batch certificate of analysis', 'Pending', null], ['Release certificate (RCQ)', 'Not issued', null]]; b.pathway = 'HEFA-SPK synthetic blending component · pathway per terminal procedure'; }
  BLENDS.push(b);
  TRACE[id] = { product: code, tank: dst.id, comps: src.map(x => ({ c: x.c, tank: x.k.id, batch: x.k.batch || '—', share: x.pct, src: 'Released tank stock', docs: [] })), docs: [`Blend order ${id}`] };
  ev.push(`${id} scheduled at ${t.name} · ${fmt(target)} kL ${prod(code).label} into ${dst.id}, start ${tm(start, t.tz)}.`);
}
function trip(tr, s, r, ev) { // vessel cargo pump trip pauses the discharge for a while
  const id = 'EX-' + seq('EX', EXCEPTIONS, /^EX-(\d+)$/);
  tr.state = 'Paused'; tr.flow = 0; tr.pauses.push([s, null, 'Vessel cargo pump trip (vessel side)']); tr.resumeAt = s + between(r, 20, 60, 5); tr.trip = id;
  EXCEPTIONS.unshift({ id, sev: 'attention', term: tr.term, asset: tr.vessel, what: 'Vessel cargo pump trip — transfer paused', since: s, op: tr.id, owner: `Loading master · ${tr.berth}`, status: 'Open', ack: null, res: null, gen: true });
  mark(tr); ev.push(`${id} · ${tr.vessel} cargo pump trip, ${tr.id} paused.`);
}
// story alarms that clear on their own: swell at Biak eases, the Sambu meter comes back
const CLEARS = [
  ['EX-3107', REF + 300, 'D. Rumbewas', 'Swell below berthing limit; Berth 1 reopened.'],
  ['EX-3117', REF + 200, 'Control room · SMB', 'FM-02 communication restored; metered flow available again.', () => { const tr = TRANSFERS.find(x => x.id === 'TRF-SMB-26-0144'); if (tr && tr.meterLost != null) { delete tr.meterLost; tr.flow0 = tr.lastFlow; } }],
];
const prune = (a, old) => { for (let i = a.length - 1; i >= 0; i--) if (old(a[i])) a.splice(i, 1); };

// slot boundary: follow-ups, quality, alarms and new activity
function generate(s, ev) {
  QUEUE.sort((a, b) => a.at - b.at); while (QUEUE.length && QUEUE[0].at <= s) QUEUE.shift().run(s);
  CLEARS.forEach(([id, at, by, note, fix]) => { const e = EXCEPTIONS.find(x => x.id === id); if (e && e.status !== 'Resolved' && s >= at) { e.status = 'Resolved'; e.ack = e.ack || { by, at }; e.res = { by, at: s, note }; if (fix) fix(); ev.push(`${id} resolved · ${note}`); } });
  TRANSFERS.forEach(tr => {
    if (tr.state === 'Delayed') { // waits while its cause is open, then berths
      if (EXCEPTIONS.some(e => e.status !== 'Resolved' && e.op.includes(tr.id))) { if (tr.start < s + 30) tr.start = Math.ceil(s / 15) * 15 + 60; }
      else { tr.state = 'Scheduled'; tr.start = Math.max(tr.start, Math.ceil(s / 15) * 15 + 60); ev.push(`${tr.vessel} cleared to berth at ${term(tr.term).name} · discharge from ${tm(tr.start, term(tr.term).tz)}.`); }
    }
    if (tr.state === 'Paused' && tr.resumeAt == null) tr.resumeAt = Math.max(s + 30, (tr.pauses.find(p => p[1] == null) || [s])[0] + between(R('rs' + tr.id), 150, 300, 5));
    if (tr.marine && tr.state === 'In progress' && tr.meterLost == null) { const r = R(`trip|${tr.id}|${s}`); if (r() < 0.002) trip(tr, s, r, ev); }
  });
  SAMPLES.forEach(smp => {
    if (smp.decision !== 'Pending') return;
    if (smp.status === 'Pending') { if (smp.resAt == null) smp.resAt = Math.max(smp.at + 120, REF + between(R('ra' + smp.id), 20, 240, 5)); if (s >= smp.resAt) results(smp, s, ev); }
    else if ((smp.status === 'Passed' || smp.status === 'Failed') && s >= (smp.decAt ?? 0)) decide(smp, s, ev);
  });
  TERMINALS.forEach(t => {
    const r = R(`${t.id}|${s}`), act = node => TRANSFERS.some(x => x.term === t.id && x.active && x.node === node);
    (t.marine || []).forEach(berth => {
      if (TRANSFERS.some(x => x.term === t.id && x.berth === berth && LIVE.includes(x.state))) return;
      if (EXCEPTIONS.some(e => e.term === t.id && e.status !== 'Resolved' && e.asset === berth)) return; // berth closed
      if (r() < 0.12) genVessel(t, s, r, berth);
    });
    if (t.truck && TRANSFERS.filter(x => x.term === t.id && x.active && x.node === 'gantry').length < Math.max(1, Math.min(3, Math.floor(t.truck / 2.5))) && r() < 0.25) genTruck(t, s, r);
    if (t.hydrant && !act('hydrant') && r() < 0.35) genFeed(t, s, r, 'hydrant');
    if (t.pipeOut && !act('pipeout') && r() < 0.35) genFeed(t, s, r, 'pipeout');
    if (t.pipeIn) { const type = /^Road/.test(t.pipeIn) ? 'Road receipt' : 'Pipeline receipt'; if (!TRANSFERS.some(x => x.term === t.id && x.active && x.type === type) && r() < 0.12) genInflow(t, s, r, type, false); }
    if (t.tanks.some(k => k.code === 'FAME') && !TRANSFERS.some(x => x.term === t.id && x.active && x.code === 'FAME' && x.type === 'Road receipt') && r() < 0.05) genInflow(t, s, r, 'Road receipt', true);
    if (t.blend && r() < 0.06) genBlend(t, s, r, ev);
  });
  prune(TRANSFERS, x => x.state === 'Completed' && x.end < s - 2880);
  prune(BLENDS, x => x.state === 'Released' && x.end != null && x.end < s - 4320);
  prune(SAMPLES, x => x.decision !== 'Pending' && x.at < s - 4320);
  prune(EXCEPTIONS, x => x.status === 'Resolved' && x.res && x.res.at < s - 1440);
}

// product movement between NOW and `to` (both inside one slot)
function advance(to, ev) {
  const from = NOW, slot = Math.floor(from / SLOT + 1e-9) * SLOT;
  BLENDS.forEach(b => {
    if (b.state === 'Scheduled' && b.start != null && b.start <= to) { b.state = 'In progress'; b.comps.forEach(c => { c.done = 0; c.flow = Math.round(b.rate * c.qty / b.target); }); ev.push(`${b.id} started into ${b.dst}.`); }
    if (b.state === 'In progress' && !TRANSFERS.some(tr => tr.id === b.id)) blendTransfer(b);
  });
  TRANSFERS.forEach(tr => {
    if (tr.state === 'Scheduled' && tr.start <= to) begin(tr, ev);
    if (tr.state === 'Paused' && tr.resumeAt != null && tr.resumeAt <= to) {
      const p = tr.pauses.find(x => x[1] == null), at = tr.resumeAt; if (p) p[1] = at;
      tr.state = 'In progress'; tr.resumedAt = at; tr.resumeAt = null; tr.flow0 = tr.flow0 || Math.round(tr.avgRate) || Math.round(tr.planned / 10); mark(tr);
      const e = tr.trip && EXCEPTIONS.find(x => x.id === tr.trip);
      if (e) { e.status = 'Resolved'; e.what = `Vessel cargo pump trip — transfer paused ${Math.round(at - e.since)} min`; e.ack = e.ack || { by: e.owner.split(' · ')[0], at: e.since + 5 }; e.res = { by: e.owner.split(' · ')[0], at, note: `Vessel pump restarted; transfer resumed ${tm(at, term(tr.term).tz)}.` }; }
      ev.push(`${tr.id} resumed${tr.vessel ? ' · ' + tr.vessel : ''}.`);
    }
    if (tr.state !== 'In progress') return;
    // flow holds for the whole slot, so the result does not depend on how often the page ticks
    if (tr.flow0) tr.flow = Math.round(tr.flow0 * wave(tr.id, slot, 0.012));
    if (tr.press != null) { if (tr.press0 == null) tr.press0 = tr.press; tr.press = +(tr.press0 * wave(tr.id + 'p', slot, 0.02)).toFixed(1); }
    const rate = tr.flow != null ? tr.flow : tr.lastFlow; // meter offline: progress from tank gauging
    const t0 = Math.max(from, tr.start, tr.resumedAt ?? -Infinity), mins = to - t0;
    if (!(rate > 0) || mins <= 0) return;
    const t = term(tr.term), dst = t.tanks.find(k => k.id === tr.dst);
    let q = Math.min(rate * mins / 60, tr.planned - tr.qty);
    if (dst && q > dst.moc - 50 - dst.vol) { q = Math.max(0, dst.moc - 50 - dst.vol); tr.planned = tr.qty + q; } // operator stops the receipt at the tank limit
    if (q > 0) {
      tr.qty += q; tr.recv = tr.truck ? Math.floor(tr.qty / tr.truck + 1e-9) * tr.truck : Math.round(tr.qty);
      if (dst) dst.vol += q;
      srcsOf(tr).forEach(([sid, sh]) => { const k = t.tanks.find(x => x.id === sid); if (k) k.vol -= q * sh; });
      const b = BLENDS.find(x => x.id === tr.id);
      if (b) { const fs = b.comps.reduce((a, c) => a + (c.flow || 0), 0) || 1; b.comps.forEach(c => { c.done = Math.min(c.qty, (c.done || 0) + q * (c.flow || 0) / fs); }); }
    }
    if (tr.qty >= tr.planned - 1e-6) settle(tr, t0 + Math.max(0, q) / rate * 60, ev);
  });
  NOW = to;
  TRANSFERS.forEach(tr => { if (tr.active) mark(tr); derive(tr); });
  TERMINALS.forEach(t => t.tanks.forEach(k => { k.temp = +(k.temp0 - diurnal(REF) + diurnal(NOW)).toFixed(1); }));
}
// Moves the network forward to the real clock. Returns events worth telling the operator about.
export function tick(to = Date.now() / 60000 - BASE) {
  const ev = [];
  while (NOW < to) {
    const edge = (Math.floor(NOW / SLOT + 1e-9) + 1) * SLOT, next = Math.min(to, edge);
    advance(next, ev);
    if (next === edge) generate(edge, ev);
  }
  SNAPSHOT = `${day(NOW, 'WIB', true)} · ${hhmm(NOW)} WIB`;
  return ev;
}
TERMINALS.forEach(t => t.tanks.forEach(k => { k.temp0 = k.temp; }));
tick(); // catch up from the reference moment to the real clock

// ── UI persistence ─────────────────────────────────────────────────────
export const ui = {
  load(key, def) { try { const v = JSON.parse(localStorage.getItem('tnops:' + key)); return v ? { ...def, ...v } : { ...def }; } catch (e) { return { ...def }; } },
  save(key, obj) { try { localStorage.setItem('tnops:' + key, JSON.stringify(obj)); } catch (e) { } },
};

// ── Icons (simple line glyphs) ─────────────────────────────────────────
export function icons(h) {
  const svg = (kids, s = 16) => h('svg', { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block', flex: 'none' }, 'aria-hidden': true }, ...kids);
  const p = d => h('path', { d });
  const c = (cx, cy, r, f) => h('circle', { cx, cy, r, fill: f ? 'currentColor' : 'none' });
  const I = {
    network: svg([c(3.5, 4, 1.6), c(12.5, 4, 1.6), c(8, 12.5, 1.6), p('M5.1 4h5.8M4.4 5.4l2.8 5.6M11.6 5.4l-2.8 5.6')]),
    tank: svg([p('M3 4.5C3 3.4 5.2 2.5 8 2.5s5 .9 5 2v7c0 1.1-2.2 2-5 2s-5-.9-5-2z'), p('M3 4.5c0 1.1 2.2 2 5 2s5-.9 5-2')]),
    transfer: svg([p('M2 5.5h10.5L10 3M14 10.5H3.5L6 13')]),
    blend: svg([p('M6 2v4.2L2.7 12.6a1 1 0 0 0 .9 1.4h8.8a1 1 0 0 0 .9-1.4L10 6.2V2M5 2h6M4.3 10h7.4')]),
    quality: svg([p('M8 1.8l5 2v3.9c0 3-2.1 5.1-5 6.5-2.9-1.4-5-3.5-5-6.5V3.8z'), p('M5.8 8l1.5 1.5 3-3')]),
    schedule: svg([p('M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 2v3M10.5 2v3M5 9h2M9 9h2M5 11.2h2')]),
    inventory: svg([p('M3 2.5h10v11H3zM5.5 5.5h5M5.5 8h5M5.5 10.5h3')]),
    maint: svg([p('M10.4 2.3a3.1 3.1 0 0 0-3 4L2.9 10.8a1.5 1.5 0 0 0 2.1 2.1l4.6-4.6a3.1 3.1 0 0 0 4-3l-1.9 1.9-1.9-.4-.4-1.9z')]),
    docs: svg([p('M4 1.5h5.5l3 3v10H4zM9.5 1.5v3h3M6 8h4.5M6 10.5h4.5')]),
    admin: svg([c(8, 5, 2.7), p('M2.8 14c.7-2.6 2.7-4.1 5.2-4.1s4.5 1.5 5.2 4.1')]),
    config: svg([p('M2.5 4h11M2.5 8h11M2.5 12h11'), c(5.5, 4, 1.4, true), c(10.5, 8, 1.4, true), c(6.5, 12, 1.4, true)]),
    search: svg([c(7, 7, 4.5), p('M10.4 10.4L14 14')]),
    bell: svg([p('M4 11V7.2a4 4 0 0 1 8 0V11l1.3 1.3H2.7zM6.6 14h2.8')]),
    chevD: svg([p('M4 6l4 4 4-4')]), chevR: svg([p('M6 4l4 4-4 4')]), chevL: svg([p('M10 4L6 8l4 4')]), chevU: svg([p('M4 10l4-4 4 4')]),
    close: svg([p('M4 4l8 8M12 4l-8 8')]), check: svg([p('M3 8.5l3 3 7-7')]),
    clock: svg([c(8, 8, 6), p('M8 4.6V8l2.4 1.5')]),
    pause: svg([p('M5.5 3.5v9M10.5 3.5v9')]), play: svg([p('M5 3.2l7.6 4.8L5 12.8z')]),
    lock: svg([p('M4 7.2h8v6.3H4zM5.6 7.2V5.3a2.4 2.4 0 0 1 4.8 0v1.9')]),
    arrowR: svg([p('M2.5 8h11M10 4.5L13.5 8 10 11.5')]),
    moon: svg([p('M13 9.6A5.4 5.4 0 1 1 6.4 3a4.4 4.4 0 0 0 6.6 6.6z')]),
    sun: svg([c(8, 8, 2.8), p('M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1')]),
    menu: svg([p('M2.5 4h11M2.5 8h11M2.5 12h11')]),
    filter: svg([p('M2 3h12L9.5 8.5V13l-3 1.5V8.5z')]),
    trace: svg([c(3.5, 8, 1.6), c(12.5, 3.5, 1.6), c(12.5, 12.5, 1.6), p('M5.1 8h3.4M8.5 3.5v9M8.5 3.5h2.4M8.5 12.5h2.4')]),
    vessel: svg([p('M1.5 10h13l-2 3.5h-9zM4 10V6.5h6V10M6 6.5V4h2')]),
    pump: svg([c(8, 8, 4.5), p('M8 3.5V1.8M12.5 8h1.8M6 8l1.5 1.5L10.5 6')]),
    signal: svg([p('M2.5 13v-1.5M6 13V9.5M9.5 13V7M13 13V4')]),
    grid: svg([p('M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z')]),
    rows: svg([p('M2.5 3.5h11M2.5 6.5h11M2.5 9.5h11M2.5 12.5h11')]),
    schematic: svg([c(4.5, 5, 2.2), c(11.5, 5, 2.2), p('M4.5 7.2V11h7V7.2M8 11v3')]),
    expand: svg([p('M6 3l5 5-5 5')]), collapse: svg([p('M10 3L5 8l5 5')]),
    flask: svg([p('M6 2v4.2L2.7 12.6a1 1 0 0 0 .9 1.4h8.8a1 1 0 0 0 .9-1.4L10 6.2V2M5 2h6')]),
    plus: svg([p('M8 3v10M3 8h10')]), minus: svg([p('M3 8h10')]),
    ext: svg([p('M9 2.5h4.5V7M13.5 2.5L7.5 8.5M12 9.5v4H2.5V4h4')]),
    pin: svg([p('M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14z'), c(8, 6.5, 1.6)]),
    unplug: svg([p('M2 14l3.2-3.2M14 2l-3.2 3.2M5.5 7.2l3.3 3.3M7.2 5.5l3.3 3.3M4.4 8.3l3.3 3.3-1.2 1.2a2.3 2.3 0 0 1-3.3-3.3zM8.3 4.4l1.2-1.2a2.3 2.3 0 0 1 3.3 3.3l-1.2 1.2')]),
    eye: svg([p('M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z'), c(8, 8, 2)]),
  };
  const stat = (k, s = 14) => {
    const base = { width: s, height: s, viewBox: '0 0 16 16', style: { display: 'block', flex: 'none' }, 'aria-hidden': true };
    if (k === 'critical') return h('svg', base, h('polygon', { points: '5.3,1.2 10.7,1.2 14.8,5.3 14.8,10.7 10.7,14.8 5.3,14.8 1.2,10.7 1.2,5.3', fill: 'var(--crit)' }), h('path', { d: 'M8 4.4v4.6M8 11.2v.4', stroke: '#fff', strokeWidth: 1.9, strokeLinecap: 'round' }));
    if (k === 'attention') return h('svg', base, h('path', { d: 'M8 1.6l7 12.6H1z', fill: 'var(--warn)', strokeLinejoin: 'round' }), h('path', { d: 'M8 6v3.8M8 11.9v.3', stroke: '#2b2105', strokeWidth: 1.8, strokeLinecap: 'round' }));
    if (k === 'ok') return h('svg', base, h('circle', { cx: 8, cy: 8, r: 6.6, fill: 'var(--ok)' }), h('path', { d: 'M5 8.3l2 2 4-4.2', stroke: '#fff', strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }));
    if (k === 'info') return h('svg', base, h('rect', { x: 1.8, y: 1.8, width: 12.4, height: 12.4, rx: 2, fill: 'var(--info)' }), h('path', { d: 'M8 7.2v4.4M8 4.7v.3', stroke: '#fff', strokeWidth: 1.8, strokeLinecap: 'round' }));
    if (k === 'hold') return h('svg', base, h('rect', { x: 2, y: 2, width: 12, height: 12, rx: 1.5, fill: 'none', stroke: 'var(--ink2)', strokeWidth: 1.4 }), h('path', { d: 'M6.3 5.2v5.6M9.7 5.2v5.6', stroke: 'var(--ink2)', strokeWidth: 1.6, strokeLinecap: 'round' }));
    if (k === 'pending') return h('svg', base, h('circle', { cx: 8, cy: 8, r: 6, fill: 'none', stroke: 'var(--ink3)', strokeWidth: 1.4, strokeDasharray: '2.2 1.8' }));
    if (k === 'active') return h('svg', base, h('circle', { cx: 8, cy: 8, r: 6, fill: 'none', stroke: 'var(--acc)', strokeWidth: 1.4 }), h('path', { d: 'M6.3 5.3l4.2 2.7-4.2 2.7z', fill: 'var(--acc)' }));
    if (k === 'off') return h('svg', base, h('circle', { cx: 8, cy: 8, r: 5.8, fill: 'none', stroke: 'var(--ink3)', strokeWidth: 1.4 }), h('path', { d: 'M4 12L12 4', stroke: 'var(--ink3)', strokeWidth: 1.4 }));
    return h('svg', base, h('circle', { cx: 8, cy: 8, r: 3.2, fill: 'var(--ink3)' }));
  };
  I.st = {}; ['critical', 'attention', 'ok', 'info', 'hold', 'pending', 'active', 'off', 'idle'].forEach(k => { I.st[k] = stat(k); });
  return I;
}
// maps any status string to a status icon kind
export function statKind(s) {
  if (!s) return 'idle';
  const x = s.toLowerCase();
  if (/critical|fail|comms lost|fault|closed|disconnected/.test(x)) return x.includes('fault') || x.includes('comms') ? 'attention' : 'critical';
  if (/attention|restricted|paused|delayed|missing|high level|stale|water/.test(x)) return 'attention';
  if (/hold/.test(x)) return 'hold';
  if (/awaiting|pending|scheduled|draft|settling/.test(x)) return 'pending';
  if (/progress|receiving|dispatching|blending|running/.test(x)) return 'active';
  if (/out of service|maintenance|offline/.test(x)) return 'off';
  if (/released|passed|operating|in service|completed|ok|accepted|resolved|verified|received/.test(x)) return 'ok';
  return 'idle';
}

// ── Charts (React elements built from data) ────────────────────────────
export function spark(h, vals, o = {}) {
  const w = o.w || 80, ht = o.h || 22; const v = vals.filter(x => x != null);
  if (!v.length) return null;
  const mn = Math.min(...v), mx = Math.max(...v), rg = mx - mn || 1;
  const pts = vals.map((y, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(ht - 2 - (y - mn) / rg * (ht - 4)).toFixed(1)}`).join(' ');
  return h('svg', { width: w, height: ht, viewBox: `0 0 ${w} ${ht}`, style: { display: 'block', overflow: 'visible' }, 'aria-hidden': true },
    h('polyline', { points: pts, fill: 'none', stroke: o.color || 'var(--ink2)', strokeWidth: 1.25, strokeLinejoin: 'round' }),
    h('circle', { cx: w, cy: ht - 2 - (v[v.length - 1] - mn) / rg * (ht - 4), r: 1.8, fill: o.color || 'var(--ink2)' }));
}
// line chart with hover. series: [{pts:[{t,v}], color, label, unit, dp, dash, area}]
export function lineChart(h, o) {
  const W = o.w || 640, H = o.h || 180, L = o.l ?? 48, R = o.r ?? 14, T = 12, B = 24;
  const xs = o.series.flatMap(s => s.pts.map(p => p.t));
  const x0 = o.x0 ?? Math.min(...xs), x1 = o.x1 ?? Math.max(...xs);
  const vs = o.series.flatMap(s => s.pts.map(p => p.v)).filter(v => v != null);
  let y0 = o.y0 ?? Math.min(...vs), y1 = o.y1 ?? Math.max(...vs); if (o.y0 == null) { const pd = (y1 - y0) * 0.12 || 1; y0 -= pd; y1 += pd; }
  const X = t => L + (t - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const kids = [];
  const ticks = o.yTicks || 4;
  for (let i = 0; i <= ticks; i++) { const v = y0 + (y1 - y0) * i / ticks; kids.push(h('line', { key: 'g' + i, x1: L, x2: W - R, y1: Y(v), y2: Y(v), stroke: 'var(--line2)', strokeWidth: 1 })); kids.push(h('text', { key: 'gt' + i, x: L - 6, y: Y(v) + 3.5, textAnchor: 'end', fontSize: 10, fill: 'var(--ink3)', fontFamily: 'Barlow' }, fmt(v, o.ydp ?? 0))); }
  (o.bands || []).forEach((b, i) => { const a = X(Math.max(b.a, x0)), z = X(Math.min(b.b ?? x1, x1)); kids.push(h('rect', { key: 'b' + i, x: a, y: T, width: Math.max(0, z - a), height: H - T - B, fill: b.fill || 'var(--warnSoft)' })); if (b.label) kids.push(h('text', { key: 'bt' + i, x: a + 4, y: T + 11, fontSize: 10, fill: 'var(--warnInk)', fontFamily: 'Barlow', fontWeight: 500 }, b.label)); });
  (o.refs || []).forEach((r, i) => { kids.push(h('line', { key: 'r' + i, x1: L, x2: W - R, y1: Y(r.v), y2: Y(r.v), stroke: r.color || 'var(--ink3)', strokeDasharray: '4 3', strokeWidth: 1 })); kids.push(h('text', { key: 'rt' + i, x: W - R - 2, y: Y(r.v) - 4, textAnchor: 'end', fontSize: 10, fill: r.color || 'var(--ink3)', fontFamily: 'Barlow' }, r.label)); });
  (o.xTicks || []).forEach((t, i) => { kids.push(h('line', { key: 'x' + i, x1: X(t.t), x2: X(t.t), y1: H - B, y2: H - B + 4, stroke: 'var(--line)' })); kids.push(h('text', { key: 'xt' + i, x: X(t.t), y: H - 6, textAnchor: 'middle', fontSize: 10, fill: 'var(--ink3)', fontFamily: 'Barlow' }, t.label)); });
  kids.push(h('line', { key: 'base', x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: 'var(--line)' }));
  o.series.forEach((s, si) => {
    let d = ''; let pen = false;
    s.pts.forEach(p => { if (p.v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1); pen = true; });
    if (s.area && d) { const f = s.pts.filter(p => p.v != null); kids.push(h('path', { key: 'a' + si, d: d + `L${X(f[f.length - 1].t)} ${H - B}L${X(f[0].t)} ${H - B}Z`, fill: s.color, opacity: 0.08 })); }
    kids.push(h('path', { key: 's' + si, d, fill: 'none', stroke: s.color, strokeWidth: s.width || 1.6, strokeDasharray: s.dash, strokeLinejoin: 'round' }));
  });
  (o.gaps || []).forEach((g, i) => { const a = X(g.a), z = X(Math.min(g.b ?? x1, x1)); kids.push(h('rect', { key: 'gp' + i, x: a, y: T, width: Math.max(0, z - a), height: H - T - B, fill: 'url(#hatch)', opacity: 0.9 })); kids.push(h('text', { key: 'gpt' + i, x: Math.min(a + 4, W - R - 60), y: T + 11, fontSize: 10, fill: 'var(--ink2)', fontFamily: 'Barlow' }, g.label)); });
  if (o.hover != null) {
    const ht = o.hover; const hx = X(ht);
    kids.push(h('line', { key: 'hv', x1: hx, x2: hx, y1: T, y2: H - B, stroke: 'var(--ink2)', strokeWidth: 1, strokeDasharray: '2 2' }));
    const rows = [];
    o.series.forEach((s, si) => { let best = null; s.pts.forEach(p => { if (best == null || Math.abs(p.t - ht) < Math.abs(best.t - ht)) best = p; }); if (best && best.v != null) { kids.push(h('circle', { key: 'hd' + si, cx: X(best.t), cy: Y(best.v), r: 3, fill: 'var(--surf)', stroke: s.color, strokeWidth: 1.6 })); } rows.push({ s, p: best }); });
    const bw = 172, bh = 22 + rows.length * 15; const bx = hx + 10 + bw > W - R ? hx - 10 - bw : hx + 10;
    kids.push(h('rect', { key: 'tb', x: bx, y: T + 4, width: bw, height: bh, rx: 0, fill: 'var(--surf)', stroke: 'var(--line)' }));
    kids.push(h('text', { key: 'tt', x: bx + 8, y: T + 18, fontSize: 10.5, fill: 'var(--ink3)', fontFamily: 'Barlow' }, tm(rows[0].p ? rows[0].p.t : ht, o.tz || 'WIB', { date: true })));
    rows.forEach((r, i) => kids.push(h('text', { key: 'tr' + i, x: bx + 8, y: T + 34 + i * 15, fontSize: 11, fill: 'var(--ink)', fontFamily: 'Barlow' }, `${r.s.label}: ${r.p && r.p.v != null ? fmt(r.p.v, r.s.dp ?? 0) + ' ' + r.s.unit : 'Unavailable'}`)));
  }
  const onMove = e => { if (!o.onHover) return; const rc = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - rc.left) / rc.width * W; if (px < L || px > W - R) { o.onHover(null); return; } const t = x0 + (px - L) / (W - L - R) * (x1 - x0); o.onHover(t); };
  return h('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', style: { display: 'block', maxHeight: H * 1.4 }, onMouseMove: onMove, onMouseLeave: () => o.onHover && o.onHover(null), role: 'img', 'aria-label': o.aria || 'Trend chart' },
    h('defs', null, h('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, h('rect', { width: 6, height: 6, fill: 'var(--surf2)' }), h('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--line)', strokeWidth: 2 }))),
    ...kids);
}
export const HATCH = 'repeating-linear-gradient(135deg, var(--holdA) 0 3px, var(--holdB) 3px 6px)';
