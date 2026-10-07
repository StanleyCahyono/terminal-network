// Lubricant superhub — catalog, plant model and live simulation for TBBM Terminal Lubricant Superhub Maiza Lubrika (MLB).
// Fictional demonstration data and a deterministic simulation. NOT live telemetry; no equipment is controlled.
//
// Interface (all used by data.js):
//   TERMINAL   terminal definition appended to the terminal list, with prebuilt bunds and tanks (superhub: true)
//   CATALOG    product registrations for prod(): finished grades (kind 'product') and base oils, additives,
//              grease raw materials (kind 'component')
//   RECIPES    blend recipes by finished-grade code ({ comps: [[code, % m/m], ...], tol, note, props })
//   isLube(code)          true for every code this module owns
//   createSuperhub(api) → hub with:
//     id                   terminal id
//     generate(s, ev)      slot boundary (every 5 scenario minutes): commit the slot, run the plant, plan the next slot
//     advance(from, to, ev) display interpolation inside a slot (tank levels move smoothly between boundaries)
//     flow(tankId, a, b)   { rec, dis } kL moved in/out of a tank by plant operations during [a, b]
//     schedule()           { lanes, items, conflicts } for the Scheduling board
//     tests(code)          QC test templates [{ prop, method, unit, spec, now }]
//     measure(test, code, r, bad)  a measured test { prop, method, result, unit, spec, status }
//     state                live object the Superhub workspace renders

const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const U = (r, lo, hi) => lo + r() * (hi - lo);
function poisson(r, lam) {
  if (!(lam > 0)) return 0;
  if (lam > 25) { const u = Math.max(1e-9, r()), v = r(); return Math.max(0, Math.round(lam + Math.sqrt(lam) * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v))); }
  const L = Math.exp(-lam); let k = 0, p = r(); while (p > L) { k++; p *= r(); } return k;
}

// ── 1. Families ───────────────────────────────────────────────────────
// share of the 4,380 t/d operating plan, density t/m³, pack mix (share of family mass by format), colour
export const FAMILIES = {
  AE: { name: 'Heavy-duty diesel engine oils', share: .36, dens: .880, color: 'oklch(0.66 0.14 55)', mix: { S1: .11, S4: .22, P20: .16, D209: .31, IBC: .05, BLK: .15 } },
  ME: { name: 'Marine & industrial diesel engine oils', share: .12, dens: .900, color: 'oklch(0.52 0.12 250)', mix: { P20: .08, D209: .38, IBC: .07, BLK: .47 } },
  MT: { name: 'Marine & railroad diesel engine oils', share: .10, dens: .900, color: 'oklch(0.64 0.09 222)', mix: { P20: .04, D209: .30, IBC: .04, BLK: .62 } },
  CB: { name: 'Circulating & bearing oils', share: .03, dens: .875, color: 'oklch(0.60 0.08 192)', mix: { P20: .15, D209: .45, IBC: .10, BLK: .30 } },
  SC: { name: 'Railway axle, steam-cylinder & specialities', share: .015, dens: .905, color: 'oklch(0.50 0.08 35)', mix: { P20: .20, D209: .70, IBC: .05, BLK: .05 } },
  GR: { name: 'Lubricating greases', share: .03, dens: .920, color: 'oklch(0.76 0.13 92)', mix: { GC: .12, GT: .18, GP: .35, GD: .35 } },
  GE: { name: 'Gas engine oils', share: .05, dens: .885, color: 'oklch(0.64 0.13 328)', mix: { P20: .04, D209: .32, IBC: .09, BLK: .55 } },
  TR: { name: 'Heavy-equipment drivetrain oils', share: .06, dens: .885, color: 'oklch(0.60 0.11 120)', mix: { S4: .08, P20: .30, D209: .42, IBC: .05, BLK: .15 } },
  CP: { name: 'Compressor oils', share: .02, dens: .900, color: 'oklch(0.56 0.13 300)', mix: { S4: .05, P20: .35, D209: .50, IBC: .05, BLK: .05 } },
  HY: { name: 'Hydraulic oils', share: .11, dens: .870, color: 'oklch(0.58 0.12 148)', mix: { S4: .05, P20: .32, D209: .38, IBC: .07, BLK: .18 } },
  HT: { name: 'Heat transfer oils', share: .015, dens: .870, color: 'oklch(0.58 0.16 25)', mix: { P20: .10, D209: .55, IBC: .10, BLK: .25 } },
  GO: { name: 'Industrial gear oils', share: .06, dens: .890, color: 'oklch(0.55 0.14 355)', mix: { S4: .03, P20: .33, D209: .46, IBC: .07, BLK: .11 } },
  TB: { name: 'Turbine oils', share: .03, dens: .865, color: 'oklch(0.66 0.09 272)', mix: { P20: .08, D209: .45, IBC: .10, BLK: .37 } },
};
export const PLAN = 5479, NAMEPLATE = 5479; // t/d · the plant runs flat out at its 2.0 Mt/y nameplate
// formats: small packs, pails, drums, IBC, bulk, grease cartridge / tub / pail / drum
export const FMTS = ['S1', 'S4', 'P20', 'D209', 'IBC', 'BLK', 'GC', 'GT', 'GP', 'GD'];
const FMT_OF = { B1: 'S1', B4: 'S4', B5: 'S4', P18: 'P20', P20: 'P20', D209: 'D209', IBC: 'IBC', BLK: 'BLK', ISO: 'BLK', VSL: 'BLK', G04: 'GC', G05: 'GT', G5: 'GT', G16: 'GP', G180: 'GD' };
// pack: label, litres (or kg for grease), units per pallet, store zone (HBW high-bay, DRM drum/IBC store)
export const PACKS = {
  B1: ['1 L bottle', 1, 960, 'HBW'], B4: ['4 L bottle', 4, 192, 'HBW'], B5: ['5 L bottle', 5, 160, 'HBW'],
  P18: ['18 L pail', 18, 36, 'HBW'], P20: ['20 L pail', 20, 36, 'HBW'], D209: ['209 L drum', 209, 4, 'DRM'], IBC: ['1,000 L IBC', 1000, 1, 'DRM'],
  G04: ['400 g cartridge', 0.4, 1920, 'HBW'], G05: ['0.5 kg tub', 0.5, 1440, 'HBW'], G5: ['5 kg tub', 5, 144, 'HBW'], G16: ['16 kg pail', 16, 36, 'HBW'], G180: ['180 kg drum', 180, 4, 'DRM'],
};
const KG_PACK = { G04: 1, G05: 1, G5: 1, G16: 1, G180: 1 };

// ── 2. Products: the owner's 84 products (names verbatim), grades and demand weights ─────────────
// key, name, family, segregation (MIN mineral · SYN synthetic · CLEAN turbine/ashless · FG food grade H1 · PAG · GRS grease),
// viscosity class (L/M/H/X; G grease), blend route, packs, demand weight, grades (grade:share/…), short stem, density kg/m³, BN
const PDEF = [
  ['MSU', 'Meditran Syn Ultimate SAE 10W-40', 'AE', 'SYN', 'M', 'ABB9', 'B5 P20 D209 IBC', 0.6, 'SAE 10W-40', 'Syn Ultimate', 858, 11],
  ['MSZ', 'Meditran SZ SAE 10W-40', 'AE', 'MIN', 'M', 'ABB', 'B5 P20 D209', 0.6, 'SAE 10W-40', 'Meditran SZ', 865, 10],
  ['MLE', 'Meditran LE Ultimate SAE 15W-40', 'AE', 'MIN', 'M', 'ILB', 'B5 P20 D209 IBC', 1, 'SAE 15W-40', 'LE Ultimate', 878, 10.5],
  ['MGL', 'Meditran SX Ultra GLE SAE 15W-40', 'AE', 'MIN', 'M', 'ILB', 'P20 D209 IBC BLK', 1.2, 'SAE 15W-40', 'SX Ultra GLE', 882, 10.5],
  ['MXU', 'Meditran SX Ultra SAE 15W-40', 'AE', 'MIN', 'M', 'ILB', 'B5 P20 D209 IBC BLK', 2.5, 'SAE 15W-40', 'SX Ultra', 882, 10.5],
  ['MXP', 'Meditran SX Plus SAE 15W-40', 'AE', 'MIN', 'M', 'ILB', 'B1 B5 P20 D209 IBC BLK ISO', 4.5, 'SAE 15W-40', 'SX Plus', 884, 10],
  ['MSX', 'Meditran SX SAE 15W-40', 'AE', 'MIN', 'M', 'ILB', 'B1 B4 B5 P20 D209 IBC BLK ISO VSL', 9, 'SAE 15W-40', 'Meditran SX', 885, 10],
  ['MS2', 'Meditran SX SAE 20W-50', 'AE', 'MIN', 'M', 'ILB', 'B1 B5 P20 D209 IBC BLK', 1.8, 'SAE 20W-50', 'Meditran SX', 890, 10],
  ['MDH', 'Meditran SX DH-1 SAE 15W-40', 'AE', 'MIN', 'M', 'ILB', 'B5 P20 D209 IBC BLK', 1.5, 'SAE 15W-40', 'SX DH-1', 884, 10],
  ['MSC', 'Meditran SC SAE 15W-40', 'AE', 'MIN', 'M', 'ILB', 'B1 B5 P20 D209 IBC BLK', 4, 'SAE 15W-40', 'Meditran SC', 886, 9],
  ['MDS', 'Meditran S Series', 'AE', 'MIN', 'M', 'ILB', 'B1 B4 B5 P20 D209 IBC BLK ISO', 5.5, 'SAE 10W:10/SAE 30:25/SAE 40:50/SAE 50:15', 'Meditran S', 892, 7.5],
  ['MSB', 'Mesran B Series', 'AE', 'MIN', 'M', 'ILB', 'B1 B4 P20 D209 BLK', 3, 'SAE 30:30/SAE 40:50/SAE 50:20', 'Mesran B', 893, 6],
  ['MDT', 'Meditran Series', 'AE', 'MIN', 'M', 'ABB', 'B1 B5 P20 D209 BLK', 2.8, 'SAE 30:35/SAE 40:50/SAE 50:15', 'Meditran', 892, 7.5],
  ['SMX', 'Meditran SMX SAE 15W-40', 'ME', 'MIN', 'M', 'ABB', 'P20 D209 IBC BLK', 0.8, 'SAE 15W-40', 'Meditran SMX', 886, 10],
  ['SM4', 'Meditran SMX SAE 40', 'ME', 'MIN', 'M', 'ILB', 'P20 D209 IBC BLK ISO', 1.4, 'SAE 40', 'Meditran SMX', 894, 10],
  ['MDP', 'Meditran P Series', 'ME', 'MIN', 'M', 'ABB', 'P20 D209 IBC', 0.6, 'SAE 30:25/SAE 40:75', 'Meditran P', 893, 9],
  ['MR7', 'Medripal 7 SAE 30', 'ME', 'MIN', 'M', 'ABB', 'D209 IBC BLK VSL', 0.5, 'SAE 30', 'Medripal 7', 896, 7],
  ['MR8', 'Medripal 8 SAE 40', 'ME', 'MIN', 'M', 'ABB', 'D209 IBC BLK', 0.3, 'SAE 40', 'Medripal 8', 898, 8],
  ['M11', 'Medripal 11 Series', 'ME', 'MIN', 'M', 'ABB', 'D209 IBC BLK', 0.4, 'SAE 30:25/SAE 40:75', 'Medripal 11', 899, 11],
  ['M12', 'Medripal 12 Series', 'ME', 'MIN', 'M', 'ILB', 'P20 D209 IBC BLK ISO VSL', 1.6, 'SAE 30:30/SAE 40:55/SAE 50:15', 'Medripal 12', 900, 12],
  ['M20', 'Medripal 20 Series', 'ME', 'MIN', 'M', 'ABB', 'D209 IBC BLK ISO', 0.6, 'SAE 30:25/SAE 40:75', 'Medripal 20', 904, 20],
  ['M30', 'Medripal 30 Series', 'ME', 'MIN', 'M', 'ABB', 'D209 IBC BLK ISO VSL', 0.9, 'SAE 30:25/SAE 40:75', 'Medripal 30', 908, 30],
  ['M40', 'Medripal 40 Series', 'ME', 'MIN', 'M', 'ILB', 'D209 IBC BLK ISO VSL', 1, 'SAE 30:25/SAE 40:75', 'Medripal 40', 912, 40],
  ['M50', 'Medripal 50 SAE 40', 'ME', 'MIN', 'M', 'ABB', 'D209 IBC BLK', 0.3, 'SAE 40', 'Medripal 50', 915, 50],
  ['M54', 'Medripal 5040', 'ME', 'MIN', 'M', 'ABB', 'D209 IBC ISO', 0.3, 'SAE 50', 'Medripal 5040', 925, 40],
  ['M70', 'Medripal 70 SAE 50', 'ME', 'MIN', 'X', 'SBB1', 'D209 IBC ISO', 0.2, 'SAE 50', 'Medripal 70', 932, 70],
  ['M1H', 'Medripal 100 SAE 50', 'ME', 'MIN', 'X', 'SBB1', 'D209 IBC', 0.1, 'SAE 50', 'Medripal 100', 940, 100],
  ['SL8', 'Salyx 8 Series', 'MT', 'MIN', 'M', 'ABB', 'D209 IBC BLK', 0.3, 'SAE 30:25/SAE 40:75', 'Salyx 8', 897, 8],
  ['S12', 'Salyx 12 Series', 'MT', 'MIN', 'M', 'ILB', 'D209 IBC BLK ISO VSL', 0.9, 'SAE 30:25/SAE 40:75', 'Salyx 12', 900, 12],
  ['S15', 'Salyx 15 Series', 'MT', 'MIN', 'M', 'ILB', 'D209 IBC BLK', 0.4, 'SAE 30:25/SAE 40:75', 'Salyx 15', 902, 15],
  ['S20', 'Salyx 20 Series', 'MT', 'MIN', 'M', 'ABB', 'D209 IBC BLK ISO', 0.5, 'SAE 30:25/SAE 40:75', 'Salyx 20', 904, 20],
  ['S30', 'Salyx 30 Series', 'MT', 'MIN', 'M', 'ILB', 'D209 IBC BLK ISO', 0.6, 'SAE 30:25/SAE 40:75', 'Salyx 30', 908, 30],
  ['S40', 'Salyx 40 SAE 40', 'MT', 'MIN', 'M', 'ILB', 'D209 IBC BLK ISO', 0.6, 'SAE 40', 'Salyx 40', 912, 40],
  ['S50', 'Salyx 50 Series', 'MT', 'MIN', 'M', 'ABB', 'D209 IBC ISO', 0.3, 'SAE 30:25/SAE 40:75', 'Salyx 50', 915, 50],
  ['S70', 'Salyx 70 SAE 50', 'MT', 'MIN', 'X', 'SBB1', 'D209 IBC ISO', 0.2, 'SAE 50', 'Salyx 70', 932, 70],
  ['DG7', 'Diloka Gen 7 SAE 40', 'MT', 'MIN', 'M', 'ABB', 'D209 IBC BLK ISO', 0.6, 'SAE 40', 'Diloka Gen 7', 893, 13],
  ['D44', 'Diloka 448X SAE 40', 'MT', 'MIN', 'M', 'ABB', 'D209 IBC BLK', 0.6, 'SAE 40', 'Diloka 448X', 893, 13],
  ['SHP', 'Sebana HP', 'CB', 'MIN', 'M', 'ABB', 'P20 D209', 0.4, 'SAE 20', 'Sebana HP', 876, 0],
  ['STB', 'Steelo B Series', 'CB', 'MIN', 'H', 'ABB', 'D209 IBC BLK ISO', 1, 'ISO VG 100:15/ISO VG 220:35/ISO VG 320:30/ISO VG 460:20', 'Steelo B', 898, 0],
  ['SBP', 'Sebana P Series', 'CB', 'MIN', 'M', 'ABB', 'P20 D209 IBC BLK', 1.8, 'ISO VG 32:20/ISO VG 68:40/ISO VG 150:25/ISO VG 460:15', 'Sebana P', 878, 0],
  ['SBN', 'Sebana Series', 'CB', 'MIN', 'M', 'ABB', 'P20 D209', 0.8, 'Grade 90/Grade 120/Grade 170/Grade 300', 'Sebana', 880, 0],
  ['MRS', 'Medripal Series', 'SC', 'MIN', 'H', 'ABB', 'D209 IBC', 0.8, 'SAE 30:25/SAE 40:75', 'Medripal Series', 898, 0],
  ['GND', 'Gandar 800', 'SC', 'MIN', 'H', 'SBB', 'D209', 0.3, 'ISO VG 460', 'Gandar 800', 902, 0],
  ['SLP', 'Silinap Series', 'SC', 'MIN', 'X', 'SBB1', 'D209', 0.4, 'ISO VG 460:40/ISO VG 1000:40/ISO VG 1500:20', 'Silinap', 905, 0],
  ['GSH', 'Grease Pertamina Super HDX-2', 'GR', 'GRS', 'G', 'LIX', 'G04 G16 G180', 0.35, 'NLGI 2', 'Super HDX-2', 920, 0],
  ['GHD', 'Grease Pertamina HDX-2', 'GR', 'GRS', 'G', 'LIX', 'G04 G16 G180', 0.45, 'NLGI 2', 'HDX-2', 918, 0],
  ['GOG', 'Grease Pertamina OGHD', 'GR', 'GRS', 'G', 'CAS', 'G16 G180', 0.25, 'NLGI 1', 'OGHD', 960, 0],
  ['GEM', 'Grease Pertamina EM Series', 'GR', 'GRS', 'G', 'LIX', 'G04 G16 G180', 0.2, 'NLGI 2:60/NLGI 3:40', 'EM', 915, 0],
  ['GLC', 'Grease Pertamina LI-CX Series', 'GR', 'GRS', 'G', 'LIX', 'G04 G16 G180', 0.45, 'NLGI 2:60/NLGI 3:40', 'LI-CX', 918, 0],
  ['GSE', 'Grease Pertamina Super EPX-2', 'GR', 'GRS', 'G', 'LI', 'G04 G05 G16 G180', 0.4, 'NLGI 2', 'Super EPX-2', 915, 0],
  ['GEP', 'Grease Pertamina EPX-NL Series', 'GR', 'GRS', 'G', 'LI', 'G04 G05 G16 G180', 0.9, 'NLGI 1:20/NLGI 2:60/NLGI 3:20', 'EPX-NL', 915, 0],
  ['GXN', 'Grease Pertamina X-NL Series', 'GR', 'GRS', 'G', 'LI', 'G05 G16 G180', 0.6, 'NLGI 2:70/NLGI 3:30', 'X-NL', 912, 0],
  ['GSG', 'Grease Pertamina SGX-NL', 'GR', 'GRS', 'G', 'LI', 'G04 G05 G5 G16 G180', 0.95, 'NLGI 2', 'SGX-NL', 912, 0],
  ['GWR', 'Grease Pertamina WR-NL', 'GR', 'GRS', 'G', 'CAS', 'G05 G16 G180', 0.3, 'NLGI 2', 'WR-NL', 950, 0],
  ['GTM', 'Grease Pertamina TMG', 'GR', 'GRS', 'G', 'OKL', 'G16 G180', 0.15, 'NLGI 0', 'TMG', 925, 0],
  ['NLL', 'NG Lube LL Series', 'GE', 'MIN', 'M', 'ABB', 'D209 IBC BLK ISO', 0.9, 'SAE 30:25/SAE 40:75', 'NG Lube LL', 885, 5.5],
  ['NGL', 'NG Lube Series', 'GE', 'MIN', 'M', 'ILB', 'D209 IBC BLK ISO', 1, 'SAE 30:25/SAE 40:75', 'NG Lube', 886, 5],
  ['NGA', 'NG Lube Ashless Series', 'GE', 'CLEAN', 'M', 'ABB9', 'D209 IBC', 0.4, 'SAE 30:25/SAE 40:75', 'NG Ashless', 882, 1.5],
  ['NGH', 'NG Lube HSG Series', 'GE', 'MIN', 'M', 'ABB', 'D209 IBC BLK', 0.5, 'SAE 30:25/SAE 40:75', 'NG Lube HSG', 888, 8],
  ['MGO', 'Meditran Geo SAE 15W-40', 'GE', 'MIN', 'M', 'ABB', 'B5 P20 D209', 0.7, 'SAE 15W-40', 'Meditran Geo', 884, 7],
  ['TFD', 'Translik FD-1 SAE 60', 'TR', 'MIN', 'H', 'ABB', 'P20 D209 IBC BLK', 1, 'SAE 60', 'Translik FD-1', 899, 0],
  ['THD', 'Translik HD Series', 'TR', 'MIN', 'M', 'ABB', 'P20 D209 IBC BLK ISO', 3.8, 'SAE 10W:35/SAE 30:35/SAE 50:20/SAE 60:10', 'Translik HD', 888, 0],
  ['PTO', 'Pertamina Tractor Oil SAE 10W-30', 'TR', 'MIN', 'L', 'ABB', 'B4 P20 D209 IBC BLK', 1.2, 'SAE 10W-30', 'Tractor Oil', 878, 0],
  ['GPG', 'GC Lube PGL Series', 'CP', 'PAG', 'M', 'SBB7', 'P18 D209', 0.2, 'ISO VG 100/ISO VG 150/ISO VG 220', 'GC Lube PGL', 1012, 0],
  ['GSY', 'GC Lube Syn Series', 'CP', 'SYN', 'M', 'SBB9', 'P18 D209', 0.5, 'ISO VG 46/ISO VG 68/ISO VG 100/ISO VG 150', 'GC Lube Syn', 930, 0],
  ['GPO', 'GC Lube Syn PO Series', 'CP', 'SYN', 'M', 'SBB9', 'P18 D209 IBC', 0.6, 'ISO VG 32/ISO VG 46/ISO VG 68', 'GC Syn PO', 845, 0],
  ['GCM', 'GC Lube M Series', 'CP', 'MIN', 'M', 'ABB', 'P20 D209 IBC BLK', 1.2, 'ISO VG 68:30/ISO VG 100:45/ISO VG 150:25', 'GC Lube M', 874, 0],
  ['FGH', 'Pertamina FG-HO 46', 'HY', 'FG', 'L', 'SBB8', 'P18 D209', 0.2, 'ISO VG 46', 'FG-HO', 858, 0],
  ['THE', 'Turalik HE Series', 'HY', 'CLEAN', 'L', 'ABB', 'P20 D209 IBC BLK', 1.8, 'ISO VG 32:20/ISO VG 46:45/ISO VG 68:35', 'Turalik HE', 845, 0],
  ['TCT', 'Turalik CXT Series', 'HY', 'MIN', 'L', 'ABB', 'P20 D209 IBC BLK', 1.5, 'ISO VG 32:20/ISO VG 46:40/ISO VG 68:30/ISO VG 100:10', 'Turalik CXT', 860, 0],
  ['TRT', 'Turalik T Series', 'HY', 'MIN', 'L', 'ABB', 'P20 D209 IBC BLK ISO', 3, 'ISO VG 32:20/ISO VG 46:45/ISO VG 68:35', 'Turalik T', 860, 0],
  ['TCX', 'Turalik CX Series', 'HY', 'MIN', 'L', 'ILB3', 'P20 D209 IBC BLK', 2.5, 'ISO VG 46:45/ISO VG 68:40/ISO VG 100:15', 'Turalik CX', 874, 0],
  ['TXT', 'Turalik XT Series', 'HY', 'MIN', 'L', 'ABB', 'P20 D209 IBC BLK', 2, 'ISO VG 32:20/ISO VG 46:45/ISO VG 68:35', 'Turalik XT', 862, 0],
  ['TUR', 'Turalik Series', 'HY', 'MIN', 'L', 'ILB3', 'B4 P20 D209 IBC BLK ISO VSL', 6, 'ISO VG 32:12/ISO VG 46:45/ISO VG 68:35/ISO VG 100:8', 'Turalik', 875, 0],
  ['TXR', 'Termo XT 32', 'HT', 'MIN', 'L', 'SBB5', 'D209 IBC BLK', 0.7, 'ISO VG 32', 'Termo XT', 836, 0],
  ['TRM', 'Termo Series', 'HT', 'MIN', 'L', 'ABB', 'D209 IBC BLK', 0.8, 'ISO VG 32:60/ISO VG 100:40', 'Termo', 865, 0],
  ['MSH', 'Masri Syn HD Series', 'GO', 'SYN', 'H', 'SBB9', 'P18 D209', 0.3, 'ISO VG 320:60/ISO VG 680:40', 'Masri Syn HD', 852, 0],
  ['FGG', 'Pertamina FG-GO Series', 'GO', 'FG', 'M', 'SBB8', 'P18 D209', 0.15, 'ISO VG 150/ISO VG 220/ISO VG 320/ISO VG 460', 'FG-GO', 870, 0],
  ['MFL', 'Masri FLG Series', 'GO', 'MIN', 'M', 'ABB', 'P20 D209 IBC', 0.8, 'ISO VG 150/ISO VG 220/ISO VG 320/ISO VG 460', 'Masri FLG', 893, 0],
  ['MRG', 'Masri RG Series', 'GO', 'MIN', 'M', 'ABB', 'P20 D209 IBC BLK ISO', 3, 'ISO VG 220:30/ISO VG 320:35/ISO VG 460:25/ISO VG 680:10', 'Masri RG', 898, 0],
  ['MSG', 'Masri SMG Series', 'GO', 'MIN', 'X', 'SBB1', 'D209 IBC BLK', 0.6, 'Grade 2/Grade 3/Grade 5/Grade 6', 'Masri SMG', 905, 0],
  ['MTX', 'Masri TXG 5', 'GO', 'MIN', 'M', 'ABB', 'P18 D209', 0.15, 'Grade 5', 'Masri TXG', 896, 0],
  ['TBX', 'Turbolube XT Series', 'TB', 'CLEAN', 'L', 'ABB9', 'D209 IBC BLK ISO', 1.2, 'ISO VG 32:45/ISO VG 46:40/ISO VG 68:15', 'Turbolube XT', 858, 0],
  ['TBL', 'Turbolube Series', 'TB', 'CLEAN', 'L', 'ABB', 'D209 IBC BLK', 0.8, 'ISO VG 32:45/ISO VG 46:40/ISO VG 68:15', 'Turbolube', 866, 0],
];
const HYHV = new Set(['FGH', 'THE', 'TCT', 'TRT']); // high-VI and food-grade hydraulics (the rest of HY is anti-wear)
const HV_COLOR = 'oklch(0.72 0.11 165)';
// numbered grades: KV40 targets (mm²/s) behind the line's own grade numbers
const NUMBERED = { SBN: { 90: 100, 120: 150, 170: 220, 300: 320 }, MSG: { 2: 680, 3: 1000, 5: 1500, 6: 2200 }, MTX: { 5: 320 } };

const gradeTag = g => { let m; if ((m = /^SAE (.+)$/.exec(g))) return m[1].replace('-', ''); if ((m = /^ISO VG (\d+)$/.exec(g))) return m[1]; if ((m = /^NLGI (\d)$/.exec(g))) return 'N' + m[1]; if ((m = /^Grade (\d+)$/.exec(g))) return 'G' + m[1]; return g.replace(/\W/g, ''); };
const gradeShort = g => { let m; if ((m = /^SAE (\d+W-\d+)$/.exec(g))) return m[1]; if (/^SAE /.test(g)) return g; if ((m = /^(?:ISO VG|NLGI|Grade) (\d+)$/.exec(g))) return m[1]; return g; };

export const PRODS = [];   // 84 products
export const GRADES = [];  // 169 product grades (the unit of stock, blending, filling and dispatch)
export const GRADE = {};   // code → grade
PDEF.forEach((row, i) => {
  const [key, name, fam, seg, visc, route, packs, w, grades, stem, dens, bn] = row;
  const gl = grades.split('/').map(x => { const [g, sh] = x.split(':'); return [g, sh == null ? null : +sh]; });
  const tot = gl.reduce((a, [, sh]) => a + (sh == null ? 0 : sh), 0);
  const P = { no: i + 1, key, name, fam, seg, visc, route, packs: packs.split(' '), w, stem, dens, bn, color: fam === 'HY' && HYHV.has(key) ? HV_COLOR : FAMILIES[fam].color, grades: [] };
  P.fmts = [...new Set(P.packs.map(p => FMT_OF[p]))];
  gl.forEach(([g, sh]) => {
    const tag = gradeTag(g), code = key + '-' + tag;
    const single = gl.length === 1, named = single && (name.includes(g) || name.endsWith(' ' + g.split(' ').pop()));
    const G = { code, P, grade: g, tag, share: sh == null ? 1 / gl.length : sh / tot, label: named ? name : `${name} · ${g}`, short: `${stem} ${gradeShort(g)}`, dens: dens + gradeDensShift(P, g) };
    P.grades.push(G); GRADES.push(G); GRADE[code] = G;
  });
  PRODS.push(P);
});
function gradeDensShift(P, g) { // heavier grades are a little denser
  const vg = vgOf(P, g); if (vg) return Math.round(clamp((Math.log(vg) - Math.log(68)) * 6, -8, 14));
  const m = /SAE (\d+)$/.exec(g); if (m && !/W-/.test(g)) return { 20: -4, 30: -2, 40: 0, 50: 3, 60: 6 }[m[1]] || 0;
  return 0;
}
function vgOf(P, g) { let m; if ((m = /^ISO VG (\d+)$/.exec(g))) return +m[1]; if ((m = /^Grade (\d+)$/.exec(g)) && NUMBERED[P.key]) return NUMBERED[P.key][m[1]] || null; return null; }

// ── 3. Components: base oils, additives, grease raw materials ─────────────────────────────────
// code, label, short, density kg/m³, KV100 mm²/s, API group / note
export const BASEOILS = [
  ['G1-SN150', 'Group I base oil SN150', 'SN150', 867, 5.3, 'I'], ['G1-SN500', 'Group I base oil SN500', 'SN500', 883, 10.8, 'I'],
  ['G1-BS150', 'Group I bright stock BS150', 'BS150', 900, 31.5, 'I'], ['G2-150N', 'Group II base oil 150N', '150N', 860, 5.4, 'II'],
  ['G2-600N', 'Group II base oil 600N', '600N', 872, 12.2, 'II'], ['G3-4', 'Group III base oil 4 cSt', 'G3-4', 829, 4.2, 'III'],
  ['G3-6', 'Group III base oil 6 cSt', 'G3-6', 836, 6.1, 'III'], ['PAO-6', 'Polyalphaolefin PAO 6', 'PAO 6', 827, 5.9, 'IV'],
  ['PAO-40', 'Polyalphaolefin PAO 40', 'PAO 40', 850, 40, 'IV'], ['EST-DE', 'Synthetic diester', 'Ester', 935, 7.5, 'V'],
  ['PAG', 'Polyalkylene glycol base', 'PAG', 1010, 9.3, 'V'], ['WO-H1', 'White oil, food grade (H1)', 'White oil', 850, 8.5, 'H1'],
];
export const ADDITIVES = [
  ['DI-HDD', 'Heavy-duty diesel engine oil DI package', 'DI-HDD', 960], ['DI-RR', 'Railroad engine oil package, zinc-free', 'DI-RR', 980],
  ['DI-MAR', 'Marine engine oil package (overbased)', 'DI-MAR', 1080], ['DI-GEO', 'Gas engine oil package, low ash', 'DI-GEO', 950],
  ['DI-DTF', 'Drivetrain fluid package', 'DI-DTF', 980], ['DI-HAW', 'Anti-wear hydraulic package (ZDDP)', 'DI-HAW', 1010],
  ['DI-HZF', 'Zinc-free anti-wear hydraulic package', 'DI-HZF', 960], ['DI-FG', 'Food-grade additive package (H1)', 'DI-FG', 950],
  ['DI-CMP', 'Compressor oil package', 'DI-CMP', 940], ['DI-TUR', 'Turbine oil package (R&O)', 'DI-TUR', 930],
  ['DI-CIR', 'Circulating & bearing oil package', 'DI-CIR', 950], ['DI-IGO', 'Industrial gear EP package', 'DI-IGO', 1050],
  ['AO-HTO', 'Heat-transfer oil antioxidant', 'AO-HTO', 920], ['DI-GRS', 'Grease EP / anti-wear package', 'DI-GRS', 1020],
  ['VII-OCP', 'OCP viscosity modifier concentrate', 'VII-OCP', 870], ['VII-PMA', 'PMA viscosity modifier', 'VII-PMA', 920],
  ['PPD-PMA', 'PMA pour-point depressant', 'PPD', 910], ['AF-SIL', 'Silicone antifoam (dilution)', 'AF-SIL', 900],
  ['AF-ACR', 'Acrylate antifoam', 'AF-ACR', 900], ['TCK-PIB', 'Polyisobutylene tackifier', 'PIB', 890],
];
export const RAWS = [['LIOH', 'Lithium hydroxide monohydrate', 'LiOH'], ['12HSA', '12-hydroxystearic acid', '12-HSA'], ['AZA', 'Azelaic acid', 'Azelaic acid'], ['CASUL', 'Overbased calcium sulfonate', 'Ca sulfonate'], ['MOS2', 'Molybdenum disulphide', 'MoS₂']];
const BO_COLOR = { I: 'oklch(0.70 0.10 75)', II: 'oklch(0.72 0.07 105)', III: 'oklch(0.74 0.06 160)', IV: 'oklch(0.70 0.07 230)', V: 'oklch(0.66 0.08 280)', H1: 'oklch(0.80 0.03 90)' };
export const COMP = {}; // code → { code, label, short, dens, kv100, kind: 'base'|'additive'|'raw' }
BASEOILS.forEach(([code, label, short, dens, kv100, grp]) => { COMP[code] = { code, label, short, dens, kv100, grp, kind: 'base', color: BO_COLOR[grp] }; });
ADDITIVES.forEach(([code, label, short, dens]) => { COMP[code] = { code, label, short, dens, kind: 'additive', color: 'oklch(0.60 0.10 310)' }; });
RAWS.forEach(([code, label, short]) => { COMP[code] = { code, label, short, dens: 1000, kind: 'raw', color: 'oklch(0.62 0.02 260)' }; });

// ── 4. Recipes (% m/m of finished product) ──────────────────────────────────────────────────
const MONO = { 'SAE 10W': [['G1-SN150', .7], ['G2-150N', .3]], 'SAE 20': [['G1-SN150', .4], ['G1-SN500', .6]], 'SAE 30': [['G1-SN500', .78], ['G1-SN150', .22]], 'SAE 40': [['G1-SN500', .8], ['G1-BS150', .2]], 'SAE 50': [['G1-SN500', .62], ['G1-BS150', .38]], 'SAE 60': [['G1-SN500', .48], ['G1-BS150', .52]] };
const GEMONO = { 'SAE 30': [['G2-600N', .78], ['G2-150N', .22]], 'SAE 40': [['G2-600N', .79], ['G1-BS150', .21]] };
const CYL = [['G1-SN500', .55], ['G1-BS150', .45]]; // cylinder and high-BN oils
const MULTI = { // base split, DI %, VII %
  MSU: [[['PAO-6', .44], ['G3-6', .44], ['G3-4', .12]], 13.5, 9], MSZ: [[['G3-6', .74], ['G3-4', .26]], 13, 10], MLE: [[['G3-6', .78], ['G2-600N', .22]], 13.5, 8.7],
  MGL: [[['G2-600N', .68], ['G2-150N', .32]], 13.5, 10], MXU: [[['G2-600N', .68], ['G2-150N', .32]], 13.5, 10], MDH: [[['G2-600N', .68], ['G2-150N', .32]], 13.5, 10],
  MXP: [[['G2-600N', .58], ['G2-150N', .26], ['G1-SN500', .16]], 13, 10.5], MSX: [[['G2-600N', .51], ['G1-SN500', .25], ['G2-150N', .24]], 12, 9],
  MS2: [[['G1-SN500', .45], ['G2-600N', .39], ['G1-BS150', .16]], 12, 10.3], MSC: [[['G1-SN500', .48], ['G2-600N', .31], ['G1-SN150', .21]], 11, 9],
  SMX: [[['G2-600N', .55], ['G1-SN500', .30], ['G2-150N', .15]], 12, 9], MGO: [[['G2-600N', .65], ['G2-150N', .35]], 8.5, 8], PTO: [[['G1-SN150', .55], ['G1-SN500', .45]], 8, 7],
};
const VGSPLIT = { 32: [['L', 1]], 46: [['L', .68], ['H', .32]], 68: [['H', .74], ['L', .26]], 100: [['H', 1]], 150: [['H', .8], ['B', .2]], 220: [['H', .55], ['B', .45]], 320: [['H', .22], ['B', .78]], 460: [['H', .05], ['B', .95]], 680: [['B', 1]], 1000: [['B', 1]], 1500: [['B', 1]], 2200: [['B', 1]] };
const PIB = { 680: 3, 1000: 7, 1500: 12, 2200: 15 };
const SYS = { G1: { L: 'G1-SN150', H: 'G1-SN500', B: 'G1-BS150' }, G2: { L: 'G2-150N', H: 'G2-600N', B: 'G1-BS150' }, G3: { L: 'G3-4', H: 'G3-6', B: 'G2-600N' }, PAO: { L: 'PAO-6', H: 'PAO-40', B: 'PAO-40' }, EST: { L: 'EST-DE', H: 'EST-DE', B: 'PAO-40' }, PAG: { L: 'PAG', H: 'PAG', B: 'PAG' }, WO: { L: 'WO-H1', H: 'WO-H1', B: 'WO-H1' } };
// industrial products: base system and additive package (code, % m/m), extra (VII, PPD)
const IND = {
  STB: ['G1', ['DI-CIR', .6]], SBP: ['G1', null], SBN: ['G1', ['DI-CIR', .5]], GND: ['G1', ['DI-CIR', .3]], SLP: ['G1', ['DI-CIR', .3]],
  GPG: ['PAG', ['DI-CMP', 1]], GSY: ['EST', ['DI-CMP', 1]], GPO: ['PAO', ['DI-CMP', 1]], GCM: ['G2', ['DI-CMP', 1]],
  FGH: ['WO', ['DI-FG', 2]], THE: ['G3', ['DI-HAW', .8], ['VII-PMA', 6], ['PPD-PMA', .2]], TCT: ['G2', ['DI-HZF', 1], ['VII-PMA', 6], ['PPD-PMA', .2]],
  TRT: ['G2', ['DI-HAW', .8], ['VII-PMA', 6], ['PPD-PMA', .2]], TCX: ['G1', ['DI-HZF', 1], ['PPD-PMA', .2]], TXT: ['G2', ['DI-HAW', .8], ['PPD-PMA', .2]], TUR: ['G1', ['DI-HAW', .7], ['PPD-PMA', .2]],
  TXR: ['G3', ['AO-HTO', .7]], TRM: ['G1', ['AO-HTO', .7]],
  MSH: ['PAO', ['DI-IGO', 2.5]], FGG: ['WO', ['DI-FG', 2]], MFL: ['G1', ['DI-IGO', 2], ['PPD-PMA', .2]], MRG: ['G1', ['DI-IGO', 2], ['PPD-PMA', .2]], MSG: ['G1', ['DI-IGO', 2.5]], MTX: ['G1', ['DI-IGO', 2]],
  TBX: ['G2', ['DI-TUR', .5]], TBL: ['G2', ['DI-TUR', .5]],
};
const BN_TREAT = [[7, 4], [12, 6], [20, 9], [30, 11.5], [40, 14.5], [50, 17.5], [70, 23.5], [100, 32]];
const bnTreat = bn => { for (let i = 1; i < BN_TREAT.length; i++) if (bn <= BN_TREAT[i][0]) { const [a, x] = BN_TREAT[i - 1], [b, y] = BN_TREAT[i]; return x + (y - x) * clamp((bn - a) / (b - a), 0, 1); } return 32; };
const NLGI_K = { 'NLGI 0': .75, 'NLGI 1': .9, 'NLGI 2': 1, 'NLGI 3': 1.15 };
function recipeOf(G) {
  const P = G.P, out = [], add = (c, v) => { if (v > 0) out.push([c, v]); };
  const base = (split, pct) => split.forEach(([c, f]) => add(c, pct * f));
  if (P.fam === 'GR') { // greases: base oil + thickener system + EP package
    const k = NLGI_K[G.grade] || 1, bo = P.key === 'GEM' ? [['G2-600N', .69], ['G1-BS150', .31]] : [['G1-SN500', .69], ['G1-BS150', .31]];
    let thick = [];
    if (P.route === 'LI') thick = [['12HSA', 8.2 * k], ['LIOH', 1.3 * k]];
    else if (P.route === 'LIX') thick = [['12HSA', 7 * k], ['AZA', 2.9 * k], ['LIOH', 1.9 * k]].concat(P.key === 'GSH' ? [['MOS2', 4]] : []);
    else if (P.route === 'CAS') thick = [['CASUL', (P.key === 'GOG' ? 32 : 30) * k], ['TCK-PIB', P.key === 'GOG' ? 5 : 4]];
    else thick = [['12HSA', 8.2 * k], ['LIOH', 1.3 * k], ['TCK-PIB', 5]];
    const fixed = thick.reduce((a, [, v]) => a + v, 0) + 3;
    base(bo, 100 - fixed); thick.forEach(([c, v]) => add(c, v)); add('DI-GRS', 3);
  } else if (MULTI[P.key]) {
    const [split, di, vii] = MULTI[P.key], pkg = P.fam === 'GE' ? 'DI-GEO' : P.fam === 'TR' ? 'DI-DTF' : 'DI-HDD';
    base(split, 100 - di - vii - .3); add(pkg, di); add(P.key === 'PTO' ? 'VII-PMA' : 'VII-OCP', vii); add('PPD-PMA', .3);
  } else if (/^SAE /.test(G.grade) && !IND[P.key]) { // engine and drivetrain monogrades
    let pkg = 'DI-HDD', treat = 10, split = MONO[G.grade] || MONO['SAE 40'];
    if (P.key === 'MSB') treat = 8;
    if (P.fam === 'ME' || P.fam === 'MT') { if (P.key === 'DG7' || P.key === 'D44') { pkg = 'DI-RR'; treat = 11; } else if (P.key === 'SM4' || P.key === 'MDP') treat = 11; else { pkg = 'DI-MAR'; treat = bnTreat(P.bn); } if (P.bn >= 40 && /50/.test(G.grade)) split = CYL; }
    if (P.fam === 'GE') { pkg = 'DI-GEO'; treat = P.key === 'NGA' ? 4.5 : P.key === 'NGH' ? 8.5 : P.key === 'NLL' ? 7.5 : 7; split = GEMONO[G.grade] || GEMONO['SAE 40']; }
    if (P.fam === 'TR') { pkg = 'DI-DTF'; treat = 7.5; }
    if (P.fam === 'CB' || P.fam === 'SC') { pkg = 'DI-CIR'; treat = P.fam === 'CB' ? .8 : .5; }
    const ppd = pkg === 'DI-CIR' ? 0 : .3;
    base(split, 100 - treat - ppd); add(pkg, treat); add('PPD-PMA', ppd);
  } else { // industrial ISO VG and numbered grades
    const [sys, ...adds] = IND[P.key] || ['G1', null], vg = vgOf(P, G.grade) || 68, split = (VGSPLIT[vg] || VGSPLIT[68]).map(([k, f]) => [SYS[sys][k], f]);
    const extra = adds.filter(Boolean).reduce((a, [, v]) => a + v, 0) + (PIB[vg] || 0);
    base(split, 100 - extra); adds.filter(Boolean).forEach(([c, v]) => add(c, v)); add('TCK-PIB', PIB[vg] || 0);
  }
  // merge duplicates, round to 0.1 %, put the rounding remainder on the main component
  const m = {}; out.forEach(([c, v]) => { m[c] = (m[c] || 0) + v; });
  const comps = Object.entries(m).map(([c, v]) => [c, Math.round(v * 10) / 10]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const diff = Math.round((100 - comps.reduce((a, [, v]) => a + v, 0)) * 10) / 10; comps[0][1] = Math.round((comps[0][1] + diff) * 10) / 10;
  return comps;
}
export const RECIPES = {};
GRADES.forEach(G => {
  G.recipe = recipeOf(G);
  RECIPES[G.code] = { comps: G.recipe, tol: G.P.fam === 'GR' ? 1.0 : 0.5, basis: '% m/m', note: 'Recipe in % m/m of finished product. Additive treat rates and thickener contents are formulation assumptions for this simulation, not product disclosures; release depends on laboratory results.', props: [['Kinematic viscosity @ 40 °C', 'mm²/s', null], ['Density @ 15 °C', 'kg/m³', null]] };
});

// ── 5. Demand model ───────────────────────────────────────────────────────────────────────────
// Family plan → product demand (weights) → format split fitted to the family pack mix (iterative proportional
// fitting over the packs each product is sold in) → grade demand by format, in t/d.
const FI = {}; FMTS.forEach((f, i) => { FI[f] = i; });
PRODS.forEach(P => { P.d = 0; P.df = new Float64Array(FMTS.length); });
Object.entries(FAMILIES).forEach(([fk, F]) => {
  const ps = PRODS.filter(P => P.fam === fk), D = PLAN * F.share, W = ps.reduce((a, P) => a + P.w, 0);
  ps.forEach(P => { P.d = D * P.w / W; });
  const T = new Float64Array(FMTS.length); Object.entries(F.mix).forEach(([f, sh]) => { T[FI[f]] = D * sh; });
  // formats nobody in the family is sold in: spread their mass over the others
  let lost = 0; T.forEach((v, i) => { if (v > 0 && !ps.some(P => P.fmts.includes(FMTS[i]))) { lost += v; T[i] = 0; } });
  const keep = T.reduce((a, v) => a + v, 0); if (lost > 0) T.forEach((v, i) => { T[i] = v + lost * v / keep; });
  // products whose packs all have no family target still sell what they make
  ps.forEach(P => { if (!P.fmts.some(f => T[FI[f]] > 0)) P.fmts.forEach(f => { T[FI[f]] += P.d / P.fmts.length; }); });
  const x = ps.map(P => { const a = new Float64Array(FMTS.length), s = P.fmts.reduce((q, f) => q + T[FI[f]], 0); P.fmts.forEach(f => { a[FI[f]] = s ? P.d * T[FI[f]] / s : 0; }); return a; });
  for (let it = 0; it < 40; it++) {
    for (let j = 0; j < FMTS.length; j++) { let c = 0; x.forEach(a => { c += a[j]; }); if (c > 0) x.forEach(a => { a[j] *= T[j] / c; }); }
    x.forEach((a, k) => { const r = a.reduce((q, v) => q + v, 0); if (r > 0) for (let j = 0; j < a.length; j++) a[j] *= ps[k].d / r; });
  }
  ps.forEach((P, k) => { P.df = x[k]; });
});
GRADES.forEach(G => { G.df = G.P.df.map(v => v * G.share); G.d = G.df.reduce((a, v) => a + v, 0); });

// ── 6. Finished-product tank allocation ──────────────────────────────────────────────────────
// FP-001..024 1,000 m³ and FP-025..060 400 m³ are dedicated to the runners; FP-061..090 150 m³ are swing tanks for
// low runners (assigned per blend, cleaned between products); FP-091/092 food grade, FP-093/094 PAG, FP-095/096
// synthetic and clean swing tanks. Bulk is sold only from dedicated tanks; low runners' bulk share goes to drums.
const LIQ = GRADES.filter(G => G.P.fam !== 'GR');
export const FPT_DEF = []; // [id, m3, use: 'dedicated'|'swing'|'FG'|'PAG'|'SPEC', code]
{
  const big = [], mid = [];
  for (let i = 1; i <= 24; i++) big.push('FP-' + String(i).padStart(3, '0'));
  for (let i = 25; i <= 60; i++) mid.push('FP-' + String(i).padStart(3, '0'));
  // bulk-heavy grades need a dedicated tank most: bulk can only be loaded from a dedicated tank
  const score = G => G.d + 2 * G.df[FI.BLK];
  const ranked = LIQ.filter(G => G.P.seg === 'MIN' || G.P.seg === 'CLEAN' || G.P.seg === 'SYN').sort((a, b) => score(b) - score(a));
  const own = {}, give = (G, id, m3) => (own[G.code] = own[G.code] || []).push([id, m3]);
  let i = 0;
  for (; i < ranked.length && big.length; i++) { const G = ranked[i], n = clamp(Math.ceil(G.d * 3 / (G.dens / 1000) / 1000), 1, 2); for (let k = 0; k < n && big.length; k++) give(G, big.shift(), 1000); }
  ranked.slice(0, i).filter(G => G.d > 140 && own[G.code].length < 2).forEach(G => { if (mid.length) give(G, mid.shift(), 400); }); // a second tank so one can receive while the other serves
  for (; i < ranked.length && mid.length; i++) give(ranked[i], mid.shift(), 400);
  Object.entries(own).forEach(([code, list]) => list.forEach(([id, m3]) => FPT_DEF.push([id, m3, 'dedicated', code])));
  for (let k = 61; k <= 96; k++) { const id = 'FP-' + String(k).padStart(3, '0'); FPT_DEF.push([id, 150, k <= 90 ? 'swing' : k <= 92 ? 'FG' : k <= 94 ? 'PAG' : 'SPEC', null]); }
  FPT_DEF.sort((a, b) => a[0] < b[0] ? -1 : 1);
  GRADES.forEach(G => { G.tanks = FPT_DEF.filter(t => t[3] === G.code).map(t => t[0]); G.runner = G.tanks.length > 0; });
  // low runners: no bulk (it moves into drums, or IBC/pails when the grade has no drums)
  GRADES.forEach(G => {
    if (G.runner || G.P.fam === 'GR') return; const b = G.df[FI.BLK]; if (!(b > 0)) return;
    const d = G.P.fmts.includes('D209'), c = G.P.fmts.includes('IBC');
    G.df[FI.BLK] = 0;
    if (d && c) { G.df[FI.D209] += b * .7; G.df[FI.IBC] += b * .3; } else G.df[FI[d ? 'D209' : c ? 'IBC' : G.P.fmts.find(f => f !== 'BLK')]] += b;
  });
}
GRADES.forEach(G => { G.dBulk = G.df[FI.BLK]; G.dPkg = G.d - G.dBulk; });

// ── 7. Quality: test plans per application group, specs resolved per grade, simulated results ──────────
// Release testing runs the tests with a turnaround of 4.5 h or less; longer tests (RPVOT, oil separation, D4048,
// D1743, penetration change) are periodic and not part of batch release. Limits are plausible internal release
// limits for the simulation, not published product specifications.
const GROUP_OF = { AE: 'hddo', ME: 'mido', MT: 'mrdo', CB: 'circ', SC: 'rasc', GR: 'grs', GE: 'geo', TR: 'hedo', CP: 'cmp', HT: 'hto', GO: 'igo', TB: 'tbo' };
export const groupOf = P => GROUP_OF[P.fam] || (HYHV.has(P.key) ? 'hyhv' : 'hyaw');
const tl = s => s.split(';').map(x => { const [prop, method, unit, tat] = x.split('|'); return [prop, method, unit, +tat]; });
const A_ = 'Appearance|Visual||0.1;Density @ 15 °C|ASTM D4052|kg/m³|0.2', K100 = 'Kinematic viscosity @ 100 °C|ASTM D445|mm²/s|0.5', K40 = 'Kinematic viscosity @ 40 °C|ASTM D445|mm²/s|0.5';
const VI = 'Viscosity index|ASTM D2270|—|0.5', FP = 'Flash point (COC)|ASTM D92|°C|1.5', PP = 'Pour point|ASTM D97|°C|2', KF = 'Water content (KF)|ASTM D6304|mg/kg|0.5', FOAM = 'Foaming, Sequence I|ASTM D892|mL|1.5';
const TBN = 'Total base number|ASTM D2896|mg KOH/g|1', TAN = 'Total acid number|ASTM D664|mg KOH/g|1', DEM = 'Demulsibility (40-37-3)|ASTM D1401|min|1', CU = 'Copper strip corrosion, 3 h @ 100 °C|ASTM D130|rating|3.5';
const RUSTA = 'Rust prevention, procedure A (distilled water)|ASTM D665||4.5', RUSTB = 'Rust prevention, procedure B (synthetic sea water)|ASTM D665||4.5', ZN = 'Zinc|ASTM D4951|mg/kg|2', ISO4406 = 'Particle cleanliness|ISO 4406|code|0.5';
const TESTS = {
  hddo: tl([A_, K100, K40, VI, 'Cold-cranking viscosity (CCS)|ASTM D5293|mPa·s|1', 'HTHS viscosity @ 150 °C|ASTM D4683|mPa·s|2', TBN, FP, PP, 'Additive elements Ca / Mg / Zn / P|ASTM D4951|% m/m|2', KF, FOAM].join(';')),
  mido: tl([A_, K100, K40, VI, TBN, FP, PP, 'Additive elements Ca / Zn|ASTM D4951|% m/m|2', KF, FOAM].join(';')),
  mrdo: tl([A_, K100, K40, VI, TBN, FP, PP, 'Zinc (railroad grades)|ASTM D4951|mg/kg|2', 'Additive elements Ca|ASTM D4951|% m/m|2', KF, FOAM].join(';')),
  circ: tl([A_, K40, VI, FP, PP, TAN, DEM, RUSTA, CU, FOAM, KF].join(';')),
  rasc: tl([A_, K40, K100, VI, FP, PP, TBN, 'Demulsibility @ 82 °C (steam-cylinder grades)|ASTM D1401|min|1.5', CU, KF].join(';')),
  grs: tl(['Appearance|Visual||0.1', 'Worked penetration, 60 strokes @ 25 °C|ASTM D217|0.1 mm|1', 'Penetration change, 100 000 strokes|ASTM D217|0.1 mm|6', 'Dropping point|ASTM D2265|°C|1', 'Water washout @ 79 °C|ASTM D1264|% m/m|1.5', 'Four-ball EP weld load|ASTM D2596|kgf|1.5', 'Four-ball wear scar|ASTM D2266|mm|1.5', 'Oil separation, 30 h @ 100 °C|ASTM D6184|% m/m|30', 'Copper corrosion, 24 h @ 100 °C|ASTM D4048|rating|24', 'Rust prevention|ASTM D1743||48', 'Base-oil viscosity @ 40 °C|ASTM D445|mm²/s|0.5'].join(';')),
  geo: tl([A_, K100, K40, VI, 'Sulphated ash|ASTM D874|% m/m|3', TBN, FP, PP, 'Additive elements Ca / Zn / P|ASTM D4951|% m/m|2', KF, FOAM].join(';')),
  hedo: tl([A_, K100, K40, VI, FP, PP, 'Shear stability, KV100 loss after 30 cycles|ASTM D6278|%|4', 'Copper strip corrosion, 3 h @ 121 °C|ASTM D130|rating|3.5', 'Additive elements Ca / Zn / P / B|ASTM D4951|% m/m|2', KF, FOAM].join(';')),
  cmp: tl([A_, K40, VI, FP, PP, TAN, 'Oxidation stability (RPVOT)|ASTM D2272|min|8', DEM, CU, FOAM, KF].join(';')),
  hyhv: tl([A_, K40, K100, VI, 'Shear stability, sonic (KV40 loss)|ASTM D5621|%|1', FP, PP, DEM, RUSTA, FOAM, ZN, ISO4406, KF].join(';')),
  hyaw: tl([A_, K40, VI, FP, PP, DEM, RUSTA, CU, 'Air release @ 50 °C|ASTM D3427|min|1', FOAM, ZN, ISO4406, KF].join(';')),
  hto: tl([A_, K40, FP, 'Fire point (COC)|ASTM D92|°C|1.5', PP, 'Carbon residue (micro method)|ASTM D4530|% m/m|3', TAN, CU, KF].join(';')),
  igo: tl([A_, K40, VI, 'Four-ball EP weld load|ASTM D2783|kgf|1.5', FP, PP, 'Demulsibility, free water|ASTM D2711|mL|5', CU, RUSTB, 'Foaming, Sequence I|ASTM D892|mL|1.5', KF].join(';')),
  tbo: tl([A_, K40, VI, FP, PP, TAN, DEM, 'Air release @ 50 °C|ASTM D3427|min|1', RUSTB, FOAM, 'Oxidation stability (RPVOT)|ASTM D2272|min|12', ISO4406, KF].join(';')),
};
const J300 = { '10W': [4.1, null], '20': [6.9, 9.3], '30': [9.3, 12.5], '40': [12.5, 16.3], '50': [16.3, 21.9], '60': [21.9, 26.1] };
const KV40_SAE = { '10W-30': 70, '10W-40': 92, '15W-40': 110, '20W-50': 165, '10W': 42, '20': 60, '30': 95, '40': 140, '50': 210, '60': 290 };
const KV100_VG = { 32: 5.4, 46: 6.8, 68: 8.7, 100: 11.2, 150: 14.7, 220: 19, 320: 24, 460: 30.5, 680: 39, 1000: 50, 1500: 65, 2200: 85 };
const FLASH = { hddo: 200, mido: 220, mrdo: 220, circ: 170, rasc: 230, geo: 220, hedo: 200, cmp: 200, hyhv: 190, hyaw: 200, hto: 200, igo: 210, tbo: 200 };
const WATER = { hddo: 500, mido: 500, mrdo: 500, rasc: 500, geo: 500, hedo: 500, circ: 200, cmp: 200, hyhv: 200, hyaw: 200, hto: 100, tbo: 100, igo: 300 };
const NLGI_PEN = { 0: [355, 385], 1: [310, 340], 2: [265, 295], 3: [220, 250] };
const GREASE_BO40 = { GSH: 220, GHD: 220, GOG: 460, GEM: 100, GLC: 220, GSE: 150, GEP: 150, GXN: 150, GSG: 150, GWR: 320, GTM: 680 };
const SASH = { NLL: .5, NGL: .45, NGH: .9, MGO: 1.0 };
const f1 = v => v.toFixed(1), fN = (v, dp) => Number(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
// spec object: t range|min|max|text|report; lo, hi (limits), m (typical margin), dp, ok/bad texts
const rng_ = (lo, hi, dp) => ({ t: 'range', lo, hi, dp, spec: `${fN(lo, dp)} – ${fN(hi, dp)}` });
const min_ = (lo, m, dp, txt) => ({ t: 'min', lo, m, dp, spec: txt || `≥ ${fN(lo, dp)}` });
const max_ = (hi, m, dp, txt, floor = 0) => ({ t: 'max', hi, m, dp, floor, spec: txt || `≤ ${fN(hi, dp)}` });
const txt_ = (spec, ok, bad) => ({ t: 'text', spec, ok, bad });
export function qcSpecs(G) {
  if (G._qc) return G._qc;
  const P = G.P, grp = groupOf(P), g = G.grade, out = [];
  const sae = /^SAE /.test(g) ? g.slice(4) : null, multi = !!sae && /W-/.test(sae), hot = sae ? (multi ? sae.split('-')[1] : sae) : null, wgr = multi ? sae.split('-')[0] : null;
  const vg = vgOf(P, g), nlgi = /^NLGI (\d)$/.exec(g) ? +g.slice(5) : null, syn = P.seg === 'SYN' || P.seg === 'PAG';
  const rc = G.recipe.map(([c]) => c), hasVII = rc.includes('VII-PMA') || rc.includes('VII-OCP');
  for (const [prop, method, unit, tat] of TESTS[grp]) {
    let s = null;
    switch (prop) {
      case 'Appearance': s = grp === 'grs' ? txt_('Smooth, homogeneous', ['Smooth, homogeneous'], 'Grainy, oil bleed') : grp === 'rasc' ? txt_('Bright, free of sediment', ['Bright, free of sediment'], 'Sediment present') : grp === 'igo' && vg >= 680 ? txt_('Homogeneous', ['Homogeneous'], 'Not homogeneous') : txt_('Clear & bright', ['Clear & bright'], 'Hazy'); break;
      case 'Density @ 15 °C': s = rng_(G.dens - 5, G.dens + 5, 1); s.target = G.dens; break;
      case 'Kinematic viscosity @ 100 °C':
        if (hot && J300[hot]) { const [lo, hi] = J300[hot]; s = hi ? { t: 'range', lo, hi: hi - 0.01, dp: 2, spec: `${lo} – < ${hi}` } : min_(lo, 2.4, 2); }
        else if (vg) s = { t: 'report', target: KV100_VG[vg] * (hasVII ? 1.18 : 1), dp: 2, spec: 'Report' };
        break;
      case 'Kinematic viscosity @ 40 °C':
        if (vg) s = rng_(vg * .9, vg * 1.1, 1);
        else if (sae) s = { t: 'report', target: KV40_SAE[sae] || 120, dp: 1, spec: 'Report' };
        break;
      case 'Viscosity index': {
        let thr = 95;
        if (grp === 'hddo' || grp === 'geo') thr = multi ? 125 : 95; else if (grp === 'hedo') thr = sae === '10W-30' ? 130 : 95; else if (grp === 'rasc') thr = 90;
        else if (grp === 'cmp') thr = P.key === 'GPG' || P.key === 'GPO' ? 130 : 95; else if (grp === 'hyhv') thr = 140; else if (grp === 'igo') thr = syn ? 140 : 90;
        if (P.key === 'FGH' || P.key === 'FGG') thr = grp === 'hyhv' ? 140 : 90;
        s = min_(thr, syn || hasVII || multi ? 28 : 12, 0); break;
      }
      case 'Cold-cranking viscosity (CCS)': if (multi) { const lim = wgr === '20W' ? 9500 : 7000, at = { '10W': '−25', '15W': '−20', '20W': '−15' }[wgr]; s = max_(lim, lim * .26, 0, `≤ ${fN(lim, 0)} @ ${at} °C`, lim * .6); } break;
      case 'HTHS viscosity @ 150 °C': { const m = { '30': 2.9, '10W-30': 2.9, '10W-40': 3.5, '15W-40': 3.7, '20W-50': 3.7, '40': 3.7, '50': 3.7, '60': 3.7 }[sae]; if (m) s = min_(m, .5, 2); break; }
      case 'Total base number': if (P.bn > 0) { s = rng_(P.bn * .9, P.bn * 1.1, 1); s.target = P.bn; } break;
      case 'Flash point (COC)': s = min_(FLASH[grp] || 200, 36, 0); break;
      case 'Fire point (COC)': s = min_(230, 30, 0); break;
      case 'Pour point': {
        let thr = -6;
        if (grp === 'hddo') thr = multi ? -21 : -6; else if (grp === 'rasc') thr = 0; else if (grp === 'geo') thr = multi ? -24 : -9;
        else if (grp === 'hedo') thr = /^10W/.test(sae) ? -27 : -9; else if (grp === 'cmp') thr = syn ? -30 : -9; else if (grp === 'hyhv') thr = -30;
        else if (grp === 'hyaw') thr = -12; else if (grp === 'hto' || grp === 'tbo') thr = -9; else if (grp === 'igo') thr = syn ? -30 : -6;
        s = { t: 'max', hi: thr, m: 9, dp: 0, step: 3, spec: `≤ ${thr < 0 ? '−' + Math.abs(thr) : thr}` }; break;
      }
      case 'Additive elements Ca / Mg / Zn / P': s = { t: 'elem', spec: 'Recipe target ± 10 %', els: [['Ca', .30], ['Mg', .03], ['Zn', .12], ['P', .11]] }; break;
      case 'Additive elements Ca / Zn': s = { t: 'elem', spec: 'Recipe target ± 10 %', els: [['Ca', Math.max(.2, P.bn * .036)], ['Zn', .04]] }; break;
      case 'Additive elements Ca': s = { t: 'elem', spec: 'Recipe target ± 10 %', els: [['Ca', Math.max(.2, (P.bn || 12) * .036)]] }; break;
      case 'Additive elements Ca / Zn / P': s = { t: 'elem', spec: 'Recipe target ± 10 %', els: [['Ca', P.key === 'NGA' ? .01 : .14], ['Zn', P.key === 'NGA' ? .01 : .035], ['P', P.key === 'NGA' ? .01 : .03]] }; break;
      case 'Additive elements Ca / Zn / P / B': s = { t: 'elem', spec: 'Recipe target ± 10 %', els: [['Ca', .26], ['Zn', .12], ['P', .11], ['B', .02]] }; break;
      case 'Zinc (railroad grades)': if (P.key === 'DG7' || P.key === 'D44') s = max_(10, 8, 0); break;
      case 'Water content (KF)': { const lim = P.key === 'GPG' ? 1000 : WATER[grp] || 300; s = max_(lim, lim * .85, 0, null, lim * .08); break; }
      case 'Foaming, Sequence I': { const lim = grp === 'igo' ? '≤ 75 / 10' : (grp === 'hddo' || grp === 'geo') ? '≤ 10 / 0' : '≤ 50 / 0'; s = txt_(lim, lim === '≤ 10 / 0' ? ['0 / 0', '5 / 0', '10 / 0'] : ['0 / 0', '10 / 0', '20 / 0', '30 / 0'], lim === '≤ 75 / 10' ? '90 / 10' : lim === '≤ 10 / 0' ? '30 / 0' : '70 / 0'); break; }
      case 'Total acid number':
        if (grp === 'hto') s = max_(.10, .08, 2, null, .01); else if (grp === 'tbo') s = max_(.20, .15, 2, null, .03);
        else { const t = grp === 'cmp' ? .15 : P.key === 'SBP' ? .05 : .25; s = rng_(Math.max(0, t - .1), t + .1, 2); }
        break;
      case 'Demulsibility (40-37-3)': if (!(grp === 'cmp' && P.key === 'GPG') && !(grp === 'hyhv' && P.key === 'FGH')) s = max_(30, 20, 0, '≤ 30', 8); break;
      case 'Demulsibility @ 82 °C (steam-cylinder grades)': if (P.key === 'GND' || P.key === 'SLP') s = max_(60, 40, 0, null, 15); break;
      case 'Demulsibility, free water': if (!syn && P.seg !== 'FG') s = min_(80, 8, 1); break;
      case 'Rust prevention, procedure A (distilled water)': if (P.key !== 'SBP') s = txt_(grp === 'circ' ? 'Pass (additive grades)' : 'Pass', ['Pass'], 'Fail'); break;
      case 'Rust prevention, procedure B (synthetic sea water)': s = txt_('Pass', ['Pass'], 'Fail'); break;
      case 'Copper strip corrosion, 3 h @ 100 °C': s = txt_('≤ 1b', ['1a', '1a', '1b'], '2c'); break;
      case 'Copper strip corrosion, 3 h @ 121 °C': s = txt_('≤ 2a', ['1b', '2a'], '3a'); break;
      case 'Air release @ 50 °C': if (grp === 'hyaw') { if (!vg || vg <= 68) s = max_(7, 4.5, 1, '≤ 7', 1.5); } else s = max_(vg === 32 ? 5 : 6, 3, 1, null, 1.2); break;
      case 'Zinc': s = rc.includes('DI-HAW') ? { ...rng_(315, 385, 0), target: 350 } : max_(10, 8, 0, '≤ 10 (zinc-free)'); break;
      case 'Particle cleanliness': { const lim = grp === 'tbo' ? [17, 15, 12] : grp === 'hyhv' ? [18, 16, 13] : [19, 17, 14]; s = { t: 'code', lim, spec: '≤ ' + lim.join('/') }; break; }
      case 'Shear stability, sonic (KV40 loss)': if (hasVII) s = max_(15, 9, 1, null, 4); break;
      case 'Shear stability, KV100 loss after 30 cycles': if (multi) s = max_(10, 6, 1, '≤ 10', 2.5); break;
      case 'Sulphated ash': if (P.key === 'NGA') s = max_(.10, .07, 2, '≤ 0.10 (ashless)', .02); else { const t = SASH[P.key] || .5; s = rng_(t - .05, t + .05, 2); s.target = t; } break;
      case 'Carbon residue (micro method)': s = max_(.05, .04, 2, null, .005); break;
      case 'Four-ball EP weld load': s = { t: 'pick', spec: '≥ 250', ok: [250, 280, 315, 400], bad: 200, unitDp: 0 }; break;
      case 'Four-ball wear scar': s = max_(.60, .2, 2, null, .36); break;
      case 'Worked penetration, 60 strokes @ 25 °C': if (nlgi != null) { const [lo, hi] = NLGI_PEN[nlgi]; s = rng_(lo, hi, 0); } break;
      case 'Dropping point': { const cx = P.route === 'LIX' || P.route === 'CAS'; s = min_(cx ? 250 : 180, cx ? 45 : 22, 0, cx ? '≥ 250 (complex thickener)' : '≥ 180 (lithium soap)'); break; }
      case 'Water washout @ 79 °C': { const wr = P.key === 'GWR' || P.key === 'GOG'; s = max_(wr ? 5 : 10, wr ? 3.5 : 7, 1, wr ? '≤ 5 (water-resistant)' : '≤ 10', 1); break; }
      case 'Base-oil viscosity @ 40 °C': { const t = GREASE_BO40[P.key] || 150; s = rng_(t * .9, t * 1.1, 0); s.target = t; break; }
      default: s = null; // periodic tests (RPVOT, oil separation, D4048, D1743, penetration change) are not part of release
    }
    if (s && tat <= 4.5) out.push({ prop, method, unit, tat, ...s });
  }
  return (G._qc = out);
}
// receipt testing of base oils and additives
const VI_GRP = { I: 95, II: 100, III: 120, IV: 130, V: 130, H1: 95 };
export function inSpecs(code) {
  const C = COMP[code]; if (!C) return [];
  if (C._qc) return C._qc;
  const out = [], T = (prop, method, unit, tat, s) => out.push({ prop, method, unit, tat, ...s });
  if (C.kind === 'base') {
    T('Appearance', 'Visual', '', 0.1, txt_('Clear & bright', ['Clear & bright'], 'Hazy'));
    T('Density @ 15 °C', 'ASTM D4052', 'kg/m³', 0.2, { ...rng_(C.dens - 5, C.dens + 5, 1), target: C.dens });
    T('Kinematic viscosity @ 100 °C', 'ASTM D445', 'mm²/s', 0.5, { ...rng_(C.kv100 * .92, C.kv100 * 1.08, 2), target: C.kv100 });
    T('Viscosity index', 'ASTM D2270', '—', 0.5, min_(VI_GRP[C.grp] || 95, 14, 0));
    T('Flash point (COC)', 'ASTM D92', '°C', 1.5, min_(C.kv100 > 25 ? 260 : C.kv100 > 9 ? 220 : 190, 30, 0));
    T('Water content (KF)', 'ASTM D6304', 'mg/kg', 0.5, max_(100, 80, 0, null, 10));
  } else if (C.kind === 'additive') {
    T('Appearance', 'Visual', '', 0.1, txt_('Homogeneous, free of sediment', ['Homogeneous, free of sediment'], 'Sediment present'));
    T('Density @ 15 °C', 'ASTM D4052', 'kg/m³', 0.2, { ...rng_(C.dens - 10, C.dens + 10, 1), target: C.dens });
    T('FTIR fingerprint vs reference', 'ASTM E1252', '% match', 0.5, min_(95, 4.5, 1));
    T('Kinematic viscosity @ 100 °C', 'ASTM D445', 'mm²/s', 0.5, { t: 'report', target: 60 + (code.length * 37) % 900, dp: 1, spec: 'Supplier CoA ± 10 %' });
    T('Additive elements', 'ASTM D4951', '% m/m', 1, { t: 'text', spec: 'Supplier CoA ± 10 %', ok: ['Within CoA'], bad: 'Outside CoA' });
  }
  return (C._qc = out);
}
// value generation; r = keyed draw, bad = this test fails
export function genResult(s, r, bad) {
  const nf = (v, dp) => +v.toFixed(dp);
  switch (s.t) {
    case 'range': { const tg = s.target != null ? s.target : (s.lo + s.hi) / 2, w = (s.hi - s.lo) / 2; if (bad) return nf(r() < .5 ? s.lo - w * U(r, .08, .3) : s.hi + w * U(r, .08, .3), s.dp); return nf(clamp(tg + w * U(r, -.55, .55), s.lo, s.hi), s.dp); }
    case 'min': return bad ? nf(s.lo - s.m * U(r, .05, .25), s.dp) : nf(s.lo + s.m * U(r, .15, 1), s.dp);
    case 'max': { if (bad) return nf(s.hi + Math.max(Math.abs(s.hi) * .05, s.m * U(r, .1, .5)), s.dp); let v = s.hi - s.m * U(r, .45, 1); if (s.step) v = s.hi - s.step * (1 + Math.floor(r() * 3)); return nf(Math.max(s.floor || -1e9, v), s.dp); }
    case 'report': return nf(s.target * U(r, .97, 1.03), s.dp);
    case 'text': return bad ? s.bad : s.ok[Math.floor(r() * s.ok.length)];
    case 'pick': return bad ? s.bad : s.ok[Math.floor(r() * s.ok.length)];
    case 'elem': return s.els.map(([e, v]) => `${e} ${(bad && e === s.els[0][0] ? v * U(r, .78, .86) : v * U(r, .95, 1.05)).toFixed(e === 'B' || v < .1 ? 3 : 2)}`).join(' · ');
    case 'code': { const d = bad ? [2, 2, 2] : [1 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), 1 + Math.floor(r() * 2)]; return s.lim.map((x, i) => bad ? x + d[i] : x - d[i]).join('/'); }
  }
  return '—';
}
const fmtRes = (v, s) => typeof v === 'number' ? (v < 0 ? '−' + fN(Math.abs(v), s.dp || 0) : fN(v, s.dp != null ? s.dp : s.unitDp || 0)) : v;
export function isLube(code) { return !!(GRADE[code] || COMP[code] || SERVICE[code]); }
export function testsFor(code) {
  const G = GRADE[code], list = G ? qcSpecs(G) : inSpecs(code);
  return list.map(s => ({ prop: s.prop, method: s.method, unit: s.unit, spec: s.spec, now: s.tat <= 0.2 }));
}
export function measureFor(x, code, r, bad) {
  const G = GRADE[code], s = (G ? qcSpecs(G) : inSpecs(code)).find(q => q.prop === x.prop);
  if (!s) return { prop: x.prop, method: x.method, result: x.result != null ? x.result : '—', unit: x.unit, spec: x.spec, status: 'Passed' };
  return { prop: s.prop, method: s.method, result: fmtRes(genResult(s, r, bad), s), unit: s.unit, spec: s.spec, status: bad ? 'Failed' : 'Passed' };
}

// ── 8. Plant layout ───────────────────────────────────────────────────────────────────────────
// Jetties: id, role, max LOA m, draft m, handling, vessel classes it takes
export const JETTIES = [
  ['J1', 'Deep-water base-oil import & re-export', 200, 12.5, '3 × 10" marine loading arms · JM-1', 'IMP CST BXP'], ['J2', 'Deep-water base-oil import & re-export', 200, 12.5, '3 × 10" marine loading arms · JM-1', 'IMP CST BXP'],
  ['J3', 'Coastal tankers in and out', 130, 8.5, '2 × 8" arms in · 2 × 6" hoses out · JM-2', 'CST FBC BXP'], ['J4', 'Coastal tankers in and out', 130, 8.5, '2 × 8" arms in · 2 × 6" hoses out · JM-2', 'CST FBC BXP'],
  ['J5', 'Additive / chemical berth', 120, 8.0, '4 × 6" stainless steam-traced hoses · JM-3', 'ADD'],
  ['J6', 'Barges and small tankers', 80, 5.0, '6 × 3" dedicated hoses, Coriolis meters · JM-4', 'SPOB FBC BXB'], ['J7', 'Barges and small tankers', 80, 5.0, '6 × 3" dedicated hoses, Coriolis meters · JM-4', 'SPOB BXB'],
  ['J8', 'Container feeder quay', 160, 10.0, 'Ship\'s cranes 2 × 40 t · terminal-tractor apron', 'FDR'], ['J9', 'Container feeder quay', 160, 10.0, 'Ship\'s cranes 2 × 40 t · terminal-tractor apron', 'FDR'],
].map(([id, role, loa, draft, kit, cls], i) => ({ id, name: 'Jetty ' + (i + 1), role, loa, draft, kit, cls: cls.split(' ') }));
// Base-oil tank farm: 24 tanks in 5 bunds + 5 specialty tanks; id, code, m³, bund, heated °C
const BOT_DEF = [
  ['BO-01', 'G1-SN150', 5000, 'BOT-A', 0], ['BO-02', 'G1-SN150', 3000, 'BOT-A', 0],
  ...[3, 4, 5, 6].map(n => ['BO-' + pad(n), 'G1-SN500', 5000, 'BOT-A', 0]), ...[7, 8, 9, 10].map(n => ['BO-' + pad(n), 'G1-SN500', 5000, 'BOT-B', 0]),
  ['BO-11', 'G1-BS150', 5000, 'BOT-C', 62], ['BO-12', 'G1-BS150', 5000, 'BOT-C', 62], ['BO-13', 'G1-BS150', 3000, 'BOT-C', 62], ['BO-14', 'G1-BS150', 3000, 'BOT-C', 62],
  ['BO-15', 'G2-150N', 5000, 'BOT-D', 0], ['BO-16', 'G2-150N', 5000, 'BOT-D', 0], ...[17, 18, 19, 20].map(n => ['BO-' + n, 'G2-600N', 5000, 'BOT-D', 45]),
  ['BO-21', 'G3-4', 3000, 'BOT-E', 0], ['BO-22', 'G3-4', 3000, 'BOT-E', 0], ['BO-23', 'G3-6', 3000, 'BOT-E', 0], ['BO-24', 'G3-6', 3000, 'BOT-E', 0],
  ['SP-01', 'PAO-6', 500, 'BOT-F', 0], ['SP-02', 'PAO-40', 300, 'BOT-F', 50], ['SP-03', 'EST-DE', 300, 'BOT-F', 0], ['SP-04', 'PAG', 300, 'BOT-F', 0], ['SP-05', 'WO-H1', 500, 'BOT-F', 0],
];
// Additive store: 20 heated, N₂-blanketed tanks; id, code, m³, °C
const ADD_DEF = [
  ['AD-01', 'DI-HDD', 500, 55], ['AD-02', 'DI-HDD', 500, 55], ['AD-03', 'DI-HDD', 500, 55], ['AD-04', 'DI-HDD', 400, 55],
  ['AD-05', 'DI-MAR', 450, 60], ['AD-06', 'DI-MAR', 450, 60], ['AD-07', 'DI-MAR', 300, 65], ['AD-08', 'VII-OCP', 600, 70], ['AD-09', 'VII-OCP', 600, 70],
  ['AD-10', 'PPD-PMA', 150, 45], ['AD-11', 'DI-GEO', 300, 55], ['AD-12', 'DI-HAW', 300, 45], ['AD-13', 'DI-TUR', 200, 45], ['AD-14', 'DI-IGO', 350, 50],
  ['AD-15', 'DI-DTF', 300, 50], ['AD-16', 'VII-PMA', 200, 45], ['AD-17', 'DI-RR', 150, 55], ['AD-18', 'DI-GRS', 150, 50], ['AD-19', 'DI-FG', 50, 40], ['AD-20', 'AF-SIL', 50, 0],
];
export const DRUM_STORE = ['DI-HZF', 'DI-CMP', 'AO-HTO', 'AF-ACR', 'TCK-PIB', 'DI-CIR']; // minor additives decanted from drums and IBCs
export const BAG_STORE = ['LIOH', '12HSA', 'AZA', 'CASUL', 'MOS2'];                    // grease thickener raw materials
const AUX_DEF = [['SL-1', 'SLOP', 200], ['SL-2', 'SLOP', 200], ['FL-1', 'FLUSH', 50], ['FL-2', 'FLUSH', 50], ['FL-3', 'FLUSH', 50], ['FL-4', 'FLUSH', 50], ['RW-1', 'REWORK', 150], ['RW-2', 'REWORK', 150]];
export const SERVICE = { SLOP: ['Slop oil (mixed, to re-refiner)', 'Slop'], FLUSH: ['Line flushing oil', 'Flush oil'], REWORK: ['Rework product', 'Rework'] };
// Blenders: id, type, hall, size (m³ vessel, or m³/h for in-line), families, segregation classes, heated
export const BLENDERS = [
  ['ILB-1', 'ILB', 'North hall', 100, 'AE', 'MIN'], ['ILB-2', 'ILB', 'North hall', 100, 'AE ME MT', 'MIN'], ['ILB-3', 'ILB', 'South hall', 80, 'HY GE ME', 'MIN'],
  ...[1, 2, 3, 4].map(n => ['ABB-' + pad(n), 'ABB', 'North hall', 70, 'AE ME MT GE TR', 'MIN']),
  ...[5, 6, 7, 8].map(n => ['ABB-' + pad(n), 'ABB', 'South hall', 50, 'HY CB GO TR CP HT TB SC', 'MIN CLEAN']),
  ['ABB-09', 'ABB', 'South hall', 25, 'AE TB GE CP GO HY', 'SYN CLEAN MIN'], ['ABB-10', 'ABB', 'South hall', 25, 'AE TB GE CP GO HY', 'SYN CLEAN MIN'],
  ...[1, 2, 3, 4].map(n => ['SBB-' + pad(n), 'SBB', 'Kettle hall', 30, 'SC ME MT GO CB', 'MIN', true]),
  ['SBB-05', 'SBB', 'Kettle hall', 20, 'TB HT CB', 'MIN CLEAN'], ['SBB-06', 'SBB', 'Kettle hall', 20, 'TB HT CB', 'MIN CLEAN'],
  ['SBB-07', 'SBB', 'Kettle hall', 10, 'CP', 'PAG'], ['SBB-08', 'SBB', 'Kettle hall', 10, 'HY GO', 'FG'],
  ['SBB-09', 'SBB', 'Kettle hall', 25, 'CP GO TR HY CB HT', 'MIN SYN'], ['SBB-10', 'SBB', 'Kettle hall', 25, 'CP GO TR HY CB HT', 'MIN SYN'],
].map(([id, type, hall, size, fams, segs, heated]) => ({ id, type, hall, size, fams: fams.split(' '), segs: segs.split(' '), heated: !!heated }));
// product route codes → blenders allowed (first choice; fall back to any eligible batch blender)
export const ROUTES = { ILB: ['ILB-1', 'ILB-2', 'ILB-3'], ILB3: ['ILB-3'], ABB: null, ABB9: ['ABB-09', 'ABB-10'], SBB: ['SBB-01', 'SBB-02', 'SBB-03', 'SBB-04', 'SBB-09', 'SBB-10'], SBB1: ['SBB-01', 'SBB-02', 'SBB-03', 'SBB-04'], SBB5: ['SBB-05', 'SBB-06'], SBB7: ['SBB-07'], SBB8: ['SBB-08'], SBB9: ['SBB-09', 'ABB-10'] };
// Grease plant
export const GREASE_UNITS = [
  ...[1, 2, 3].map(n => ({ id: 'CT-' + n, kind: 'Contactor', size: 18 })), ...[1, 2].map(n => ({ id: 'OK-' + n, kind: 'Open kettle', size: 12 })),
  ...[1, 2, 3, 4, 5, 6].map(n => ({ id: 'FK-' + n, kind: 'Finishing kettle', size: 20 })),
];
export const HOPPERS = [1, 2, 3, 4].map(n => ({ id: 'GH-' + n, size: 15 }));
// Filling lines: id, hall, format, rated units/h, standard OEE, families, segregation classes, heated
export const LINES = [
  ['PL-01', 'P', 'S1', 8400, .74, 'AE', 'MIN SYN'], ['PL-02', 'P', 'S1', 8400, .74, 'AE', 'MIN'],
  ['PL-03', 'P', 'S4', 2800, .74, 'AE', 'MIN SYN'], ['PL-04', 'P', 'S4', 2800, .74, 'AE', 'MIN'], ['PL-05', 'P', 'S4', 2100, .72, 'AE TR', 'MIN'], ['PL-06', 'P', 'S4', 1260, .70, 'AE TR HY GO CP', 'MIN'],
  ['PL-07', 'P', 'P20', 550, .74, 'AE ME MT HY', 'MIN'], ['PL-08', 'P', 'P20', 550, .74, 'AE ME MT GE TR', 'MIN'], ['PL-09', 'P', 'P20', 550, .72, 'AE HY TR GE', 'MIN'],
  ['PL-10', 'P', 'P20', 480, .72, 'HY TR CB', 'MIN'], ['PL-11', 'P', 'P20', 480, .72, 'HY GO CB CP HT', 'MIN'], ['PL-12', 'P', 'P20', 420, .70, 'GO TR HY SC CB ME', 'MIN', true],
  ['PL-13', 'P', 'P20', 340, .62, 'HY GO', 'FG'], ['PL-14', 'P', 'P20', 340, .62, 'CP GO AE', 'PAG SYN'], ['PL-15', 'P', 'P20', 420, .68, 'TB GE HY HT', 'CLEAN MIN'],
  ['PL-16', 'G', 'GC', 4200, .68, 'GR', 'GRS'], ['PL-17', 'G', 'GT', 4800, .68, 'GR', 'GRS'], ['PL-18', 'G', 'GP', 300, .68, 'GR', 'GRS'],
  ['DL-01', 'D', 'D209', 92, .74, 'AE GE', 'MIN SYN'], ['DL-02', 'D', 'D209', 92, .74, 'AE HY TR', 'MIN'], ['DL-03', 'D', 'D209', 92, .74, 'AE GE ME MT', 'MIN'], ['DL-04', 'D', 'D209', 92, .74, 'AE ME MT', 'MIN'],
  ['DL-05', 'D', 'D209', 92, .74, 'ME MT GE', 'MIN'], ['DL-06', 'D', 'D209', 92, .74, 'ME MT GE', 'MIN'], ['DL-07', 'D', 'D209', 92, .74, 'HY CB TR GO', 'MIN'], ['DL-08', 'D', 'D209', 92, .74, 'HY CB TR GO', 'MIN'],
  ['DL-09', 'D', 'D209', 46, .72, 'GO TR CB SC', 'MIN', true], ['DL-10', 'D', 'D209', 52, .74, 'GE CP HT CB TR HY GO', 'MIN'], ['DL-11', 'D', 'D209', 52, .72, 'TB GE HY', 'CLEAN'],
  ['DL-12', 'D', 'D209', 46, .70, 'SC ME MT GO', 'MIN', true], ['DL-13', 'D', 'D209', 35, .65, 'CP GO HY AE TB GE', 'FG PAG SYN CLEAN'], ['DL-14', 'G', 'GD', 25, .70, 'GR', 'GRS'],
  ['IBC-1', 'D', 'IBC', 18, .75, 'AE ME MT CB SC GE TR CP HY HT GO TB', 'MIN', true], ['IBC-2', 'D', 'IBC', 18, .75, 'AE ME MT CB GE TR CP HY HT GO TB', 'CLEAN FG PAG SYN MIN'],
].map(([id, hall, fmt, rate, oee, fams, segs, heated]) => ({ id, hall, fmt, rate, oee, fams: fams.split(' '), segs: segs.split(' '), heated: !!heated }));
// pack speed relative to the line's rated pack (5 kg tubs run at a sixth of the 0.5 kg rate on PL-17)
export const PACK_RATE = { B4: 1.1, P18: 1.05, G5: 1 / 6 };
export const HALLS = { P: 'Hall P · packaging', D: 'Hall D · drums & IBC', G: 'Hall G · grease' };
// Truck zone: 140 bays
export const BAYS = [
  ...Array.from({ length: 64 }, (_, i) => ['D-' + pad(i + 1), 'PKG']), ...Array.from({ length: 28 }, (_, i) => ['CS-' + pad(i + 1), 'STF']),
  ...Array.from({ length: 12 }, (_, i) => ['BT-' + pad(i + 1), 'BLK']), ...Array.from({ length: 24 }, (_, i) => ['RC-' + pad(i + 1), 'MAT']), ...Array.from({ length: 12 }, (_, i) => ['UL-' + pad(i + 1), 'UNL']),
];
export const BAY_CLASSES = { PKG: 'Packaged dispatch', STF: 'Container stuffing', BLK: 'Bulk tanker loading', MAT: 'Materials receiving', UNL: 'Tanker & ISO discharge' };
// ISO station: 18 positions in 4 bays
export const ISO_CRANES = Array.from({ length: 18 }, (_, i) => { const n = i + 1, bay = n <= 6 ? 'A' : n <= 12 ? 'B' : n <= 16 ? 'C' : 'D'; return { id: 'IC-' + pad(n), bay, role: { A: 'Base-oil discharge · mineral fill', B: 'Mineral & synthetic fill', C: 'Heated additive discharge · heavy fill', D: 'Clean, food-grade & PAG fill' }[bay] }; });
export const ISO_BLOCKS = ['Y-A', 'Y-B', 'Y-C', 'Y-D', 'Y-E']; // 25 rows × 2 tiers each; Y-D has the 30 steam heating points
export const RMGS = ['RMG-1', 'RMG-2', 'RMG-3', 'RMG-4'];
export const TRACKS = [{ id: 'RT-1', role: 'Loading track · 650 m' }, { id: 'RT-2', role: 'Loading track · 650 m' }, { id: 'RT-3', role: 'Arrival / departure · run-round' }];

// ── 9. Terminal definition with prebuilt bunds and tanks (data.js tank shape) ─────────────────────
function dims(nominal) { const h = Math.min(20, 12 + nominal / 30000 * 5.5); const d = Math.sqrt(nominal / (Math.PI / 4 * h)); return { d: +d.toFixed(1), h: +h.toFixed(1) }; }
const r10 = v => Math.round(v / 10) * 10;
function mkTank(id, code, m3, bund, zone, heated, kind, material) {
  const dm = dims(m3);
  return { id, term: 'MLB', bund, code, kind, nominal: m3, moc: r10(m3 * .95), hla: r10(m3 * .92), heel: r10(m3 * .05), vol: 0, diam: dm.d, height: dm.h,
    roof: 'Fixed cone roof · N₂ blanket', material, coating: zone === 'ADD' ? 'Stainless, heating coils, insulated' : zone === 'FPT' ? 'Internal epoxy lining' : heated ? 'Heating coils, insulated' : 'Uncoated (base oil service)',
    status: 'Idle', q: 'Released', reserved: 0, alarm: null, temp: heated || 31, tempSrc: 'measured', dens15: null, water: null, batch: null, zone, heated: heated || 0 };
}
const TANKS = [], BUNDS = [];
const bundOf = id => { let b = BUNDS.find(x => x.id === id); if (!b) { b = { id, tanks: [] }; BUNDS.push(b); } return b; };
const addTank = k => { TANKS.push(k); bundOf(k.bund).tanks.push(k.id); return k; };
BOT_DEF.forEach(([id, code, m3, bund, heat]) => addTank(mkTank(id, code, m3, bund, 'BOT', heat, 'component', 'Carbon steel shell')));
ADD_DEF.forEach(([id, code, m3, heat]) => addTank(mkTank(id, code, m3, 'ADD', 'ADD', heat, 'component', 'Stainless steel 316L')));
FPT_DEF.forEach(([id, m3, use, code], i) => {
  const G = code ? GRADE[code] : null, n = +id.slice(3), c = G ? G.code : use === 'FG' ? 'FGH-46' : use === 'PAG' ? 'GPG-150' : use === 'SPEC' ? 'TBX-46' : LIQ[(n * 7) % LIQ.length].code;
  const k = addTank(mkTank(id, c, m3, 'FPT-' + (1 + Math.floor((n - 1) / 12)), 'FPT', 0, 'product', use === 'FG' || use === 'PAG' ? 'Stainless steel 316L' : 'Carbon steel shell'));
  k.use = use; k.dedicated = use === 'dedicated'; if (!k.dedicated) { k.status = 'Free'; k.free = true; }
});
AUX_DEF.forEach(([id, code, m3]) => addTank(mkTank(id, code, m3, 'AUX', 'AUX', 0, 'component', 'Carbon steel shell')));
export const TERMINAL = {
  id: 'MLB', name: 'Terminal Lubricant Superhub Maiza Lubrika', area: 'Kendal, Jawa Tengah', tz: 'WIB', lat: -6.92, lon: 110.25,
  kind: 'Lubricant superhub', superhub: true, marine: JETTIES.map(j => j.name), truck: 140, rail: RMGS.length, isoCranes: ISO_CRANES.length, isoYard: 250,
  blenders: BLENDERS.length, lines: LINES.length, blend: { mode: 'In-line + batch', products: [] }, upd: 0.2, bunds: BUNDS, tanks: TANKS,
};
// Catalog registrations for data.js prod()
export const CATALOG = [
  ...GRADES.map(G => ({ code: G.code, label: G.label, short: G.short, fam: FAMILIES[G.P.fam].name, kind: 'product', color: G.P.color, dens: G.dens, lube: true, product: G.P.name, grade: G.grade, famCode: G.P.fam })),
  ...Object.values(COMP).map(C => ({ code: C.code, label: C.label, short: C.short, fam: C.kind === 'base' ? 'Base oil' : C.kind === 'additive' ? 'Lubricant additive' : 'Grease raw material', kind: 'component', color: C.color, dens: C.dens, lube: true })),
  ...Object.entries(SERVICE).map(([code, [label, short]]) => ({ code, label, short, fam: 'Plant service', kind: 'component', color: 'oklch(0.55 0.02 260)', dens: 880, lube: true })),
];

// ── 10. Live simulation ──────────────────────────────────────────────────────────────────────
// Discrete decisions at 5-minute slot boundaries in a fixed phase order; every flow gets a whole slot quantity,
// planned against stock and ullage at the boundary and committed at the next one, so the state at each boundary does
// not depend on how often the page ticks. Random draws come from keyed streams (one per subsystem per slot, or per
// entity), so the same run replays identically.
const NB = 576; // 48 h of slot buckets for tank movement history
const TANKERS = ['MT Sekar Samudra', 'MT Lintang Biru', 'MT Gita Bahari', 'MT Rinjani Nusantara', 'MT Wijaya Kusuma', 'MT Sapta Samudra', 'MT Mutiara Kendal', 'MT Bayu Lestari', 'MT Candra Kirana', 'MT Dharma Jaya', 'MT Ratu Pesisir', 'MT Nila Utama', 'MT Tunas Bahari', 'MT Arta Samudra', 'MT Permata Weleri', 'MT Sinar Kaliwungu', 'MT Samudra Kencana', 'MT Laut Biru Jaya', 'MT Kendal Perkasa', 'MT Bahari Lestari', 'MT Sinar Batang', 'MT Pelangi Nusa', 'MT Mega Samudra', 'MT Surya Kaliwungu', 'MT Bintang Jepara', 'MT Pesona Demak', 'MT Karimun Jaya', 'MT Nusa Indah', 'MT Tirta Mandiri', 'MT Arunika', 'MT Garuda Bahari', 'MT Merapi Jaya', 'MT Selat Muria', 'MT Bukit Kendal', 'MT Dewi Samudra', 'MT Ratna Bahari'];
const CHEMTANKERS = ['MT Kirana Kimia', 'MT Sari Kimia', 'MT Mega Kimia', 'MT Puspa Kimia', 'MT Delima Kimia'];
const BARGES = ['SPOB Kendal Jaya 3', 'SPOB Tirta Lube 7', 'SPOB Bintang Laut 9', 'SPOB Sinar Weleri 5', 'SPOB Kaliwungu 2', 'SPOB Samudra Pelumas 1', 'SPOB Kendal Jaya 5', 'SPOB Tirta Lube 9', 'SPOB Batang Mas 2', 'SPOB Weleri Indah 4', 'SPOB Jepara Bahari 6', 'SPOB Demak Sejahtera 3', 'SPOB Muria Lestari 8', 'SPOB Pantura Jaya 1', 'SPOB Sinar Pelumas 7', 'SPOB Kaliwungu 5'];
const FEEDERS = ['KM Nusantara Ekspres 7', 'KM Selat Karimata', 'KM Laut Jawa Satu', 'KM Kendal Raya', 'KM Muria Ekspres'];
const CARRIERS = ['PT Kendal Lintas Logistik', 'PT Weleri Mitra Logistik', 'PT Pantura Cargo Logistik', 'PT Semarang Raya Logistik', 'PT Muria Trans Logistik', 'PT Jati Kencana Logistik', 'PT Sinar Pelumas Logistik', 'PT Ungaran Jaya Logistik', 'PT Batang Prima Logistik', 'PT Demak Sentosa Logistik'];
const PLATES = [['H', 35], ['B', 15], ['L', 10], ['K', 8], ['G', 8], ['D', 8], ['AD', 6], ['AB', 5], ['R', 5]];
const ISO_OWNER = 'SJIU', ISO_TYPE = 'T11'; // every ISO tank is an SJIU-coded IMO T11 portable tank
const BOX_OWNERS = ['TGHU', 'MRKU', 'SEGU', 'CAIU', 'TCLU', 'BMOU', 'FCIU'];
const VCLS = {
  IMP: { label: 'Base-oil import tanker', pre: 240, post: 180, rate: [300, 420], loa: [165, 195], dwt: [15000, 25000], dir: 'in' },
  CST: { label: 'Coastal tanker · Group I', pre: 150, post: 120, rate: [180, 260], loa: [95, 125], dwt: [3500, 6500], dir: 'in' },
  ADD: { label: 'Chemical tanker · additives', pre: 180, post: 120, rate: [70, 110], loa: [90, 115], dwt: [3000, 6000], dir: 'in' },
  FBC: { label: 'Finished-bulk coastal tanker', pre: 120, post: 90, rate: [160, 230], loa: [70, 110], dwt: [1500, 3500], dir: 'out' },
  SPOB: { label: 'Bunker barge (SPOB)', pre: 60, post: 45, rate: [80, 120], loa: [45, 65], dwt: [300, 700], dir: 'out' },
  FDR: { label: 'Container feeder', pre: 60, post: 60, loa: [120, 150], dwt: [6000, 9000], dir: 'box' },
  BXP: { label: 'Base-oil re-export tanker', pre: 120, post: 90, rate: [300, 450], loa: [95, 128], dwt: [3500, 7000], dir: 'out' },
  BXB: { label: 'Base-oil barge', pre: 60, post: 45, rate: [140, 200], loa: [55, 78], dwt: [700, 1600], dir: 'out' },
};
const G1 = ['G1-SN150', 'G1-SN500', 'G1-BS150'], G23 = ['G2-150N', 'G2-600N', 'G3-4', 'G3-6'], SPEC = ['PAO-6', 'PAO-40', 'EST-DE', 'PAG', 'WO-H1'];
const TANK_ADD = ['DI-HDD', 'DI-MAR', 'VII-OCP', 'PPD-PMA', 'DI-GEO', 'DI-HAW', 'DI-TUR', 'DI-IGO', 'DI-DTF', 'VII-PMA', 'DI-RR', 'DI-GRS', 'DI-FG', 'AF-SIL'];
const SEA_ADD = ['DI-HDD', 'DI-MAR', 'VII-OCP', 'DI-DTF', 'DI-GEO', 'VII-PMA', 'DI-RR', 'PPD-PMA', 'DI-IGO'];
const P_PKG = [2.6, 2.3, 2.1, 2.1, 3, 5, 7, 8, 8, 7.5, 6.5, 5.5, 5, 5.5, 6, 6, 5.5, 5, 4.5, 4, 3.6, 3.2, 3, 2.8]; // despatch runs round the clock
const P_MAT = [.2, .2, .2, .2, .3, 1.5, 6, 9, 10, 10, 9, 7, 5, 8, 9, 8, 6, 4, 2.5, 1.5, .8, .4, .3, .2];
const P_BLK = [2, 1.5, 1.5, 1.5, 2.5, 4, 6, 7, 7, 6.5, 6, 5, 4.5, 5, 5.5, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 2];
const nrm = a => { const s = a.reduce((x, y) => x + y, 0); return a.map(x => x / s); };
const PROF = { PKG: nrm(P_PKG), MAT: nrm(P_MAT), BLK: nrm(P_BLK) };
const DOWF = [1.06, 1.06, 1.06, 1.06, 1.06, .95, .75]; // seven-day operation, lighter on Sundays
const WH_TGT = { HBW: 8, DRM: 4.8 }, WH_CAP = { HBW: 28000, DRM: 20000 };
const densOf = code => ((GRADE[code] || COMP[code] || { dens: 880 }).dens) / 1000;
function iso6346(owner, serial) {
  const code = owner + serial; let sum = 0;
  for (let i = 0; i < 10; i++) { const c = code.charCodeAt(i); let v; if (c >= 48 && c <= 57) v = c - 48; else { v = 10; for (let x = 65; x < c; x++) { v++; if (v % 11 === 0) v++; } } sum += v * Math.pow(2, i); }
  return `${owner} ${serial} ${sum % 11 % 10}`;
}

export function createSuperhub(api) {
  const { REF, R, tm, hhmm, dur, fmt, ymd, seq, TRANSFERS, EXCEPTIONS } = api;
  const T = api.term ? api.term('MLB') : null;
  if (!T || api.BASE == null) return { id: null, generate() {}, advance() {}, flow: () => ({ rec: 0, dis: 0 }), schedule: () => ({ lanes: [], items: [], conflicts: [] }), tests: testsFor, measure: measureFor, state: {} };
  const BASE = api.BASE, RS = k => R('MLB|' + k);
  // local WIB calendar
  const OFFM = 420;
  const dayOf = m => Math.floor((BASE + m + OFFM) / 1440);
  const minOf = m => ((Math.floor(BASE + m + OFFM) % 1440) + 1440) % 1440;
  const dowOf = m => ((dayOf(m) + 3) % 7 + 7) % 7; // 0 = Monday
  const monthOf = m => new Date(dayOf(m) * 86400000).getUTCMonth();
  const midnight = d => d * 1440 - OFFM - BASE;
  const yymm = m => ymd(m).slice(0, 4);
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const wpick = (r, list, w) => { let tot = 0; for (const x of list) tot += w(x); if (!(tot > 0)) return null; let u = r() * tot; for (const x of list) { u -= w(x); if (u <= 0) return x; } return list[list.length - 1]; };
  const plate = r => { const [p] = wpick(r, PLATES, x => x[1]); const L = 'ABCDEFGHJKLMNPRSTUVWXYZ'; return `${p} ${1000 + Math.floor(r() * 8999)} ${L[Math.floor(r() * L.length)]}${L[Math.floor(r() * L.length)]}`; };

  // ── tanks ──
  const TK = {}, BOT = [], ADDT = [], FPT = [], AUXT = [];
  T.tanks.forEach(k => {
    TK[k.id] = k; (k.zone === 'BOT' ? BOT : k.zone === 'ADD' ? ADDT : k.zone === 'FPT' ? FPT : AUXT).push(k);
    k.v0 = 0; k.pIn = 0; k.pOut = 0; k.hRec = new Float32Array(NB); k.hDis = new Float32Array(NB); k.d = densOf(k.code);
    k.state = k.zone === 'FPT' ? (k.free ? 'Free' : 'Released') : 'Released'; k.since = REF - 600; k.duty = null; k.holdUntil = null; k.batch = null;
    k.dens15 = Math.round(k.d * 10000) / 10;
  });
  const SLOTN = new Int32Array(NB).fill(-1e9);
  const avail = k => k.v0 - k.pOut - k.heel;                                      // kL that can still be drawn this slot
  const ullage = k => k.moc - k.v0 - k.pIn;                                        // kL that can still be received this slot
  const usable = k => k.state === 'Released' && k.q === 'Released';
  const byCode = {}; [...BOT, ...ADDT].forEach(k => { (byCode[k.code] = byCode[k.code] || []).push(k); });

  // ── grades, SKUs and the warehouse ──
  const GI = {}; GRADES.forEach((G, i) => { GI[G.code] = i; });
  const NG = GRADES.length, LIQG = GRADES.filter(G => G.P.fam !== 'GR'), GRSG = GRADES.filter(G => G.P.fam === 'GR');
  const relK = new Float64Array(NG), qcK = new Float64Array(NG), wipT = new Float64Array(NG), whT = new Float64Array(NG), relG = new Float64Array(NG), gqcT = new Float64Array(NG);
  const PF = { B1: 'S1', B4: 'S4', B5: 'S4', P18: 'P20', P20: 'P20', D209: 'D209', IBC: 'IBC', G04: 'GC', G05: 'GT', G5: 'GT', G16: 'GP', G180: 'GD' };
  const SKUS = [];
  GRADES.forEach((G, gi) => {
    FMTS.forEach((f, fi) => {
      const d = G.df[fi]; if (!(d > 0) || f === 'BLK') return;
      const pks = G.P.packs.filter(p => PF[p] === f);
      pks.forEach(pk => {
        const [label, size, perPal, zone] = PACKS[pk], unitT = size * (/^G/.test(pk) ? 1 : G.dens / 1000) / 1000;
        SKUS.push({ i: SKUS.length, gi, G, pk, label, size, perPal, zone, fmt: f, unitT, dU: d / pks.length / unitT, dPal: d / pks.length / unitT / perPal });
      });
    });
  });
  const NS = SKUS.length, whU = new Float64Array(NS);
  const zonePal = { HBW: 0, DRM: 0 };
  const skuOf = {}; SKUS.forEach(k => { (skuOf[k.gi] = skuOf[k.gi] || []).push(k); });
  const whAdd = (k, units) => { whU[k.i] += units; whT[k.gi] += units * k.unitT; zonePal[k.zone] += units / k.perPal; };
  const dPalTot = SKUS.reduce((a, k) => a + k.dPal, 0);

  // ── state the workspace renders ──
  const S = {
    id: 'MLB', name: T.name, tz: 'WIB', now: REF, slot: REF, frac: 0, warm: true, ready: false, seed: BASE,
    plan: { day: PLAN, nameplate: NAMEPLATE, util: PLAN / NAMEPLATE, hourly: PLAN / 24, mode: { road: 0, rail: 0, sea: 0 } },
    weather: { state: 'Clear', text: 'Clear', since: REF, until: null, season: '', tempC: 30, wind: 8 },
    jetties: JETTIES.map(j => ({ ...j, vessel: null, state: 'Free', closed: null })),
    vessels: [], trains: [], trucks: [], isos: [], boxes: [], samples: [], batches: [], wos: [], events: [], alarms: [], days: [],
    blenders: BLENDERS.map(b => ({ ...b, state: 'Idle', step: 'Idle', stepUntil: null, batch: null, since: REF, busyMin: 0, last: null, fault: null, pm: null, waitSince: null, alarm: null })),
    grease: { units: GREASE_UNITS.map(u => ({ ...u, state: 'Idle', step: 'Idle', stepUntil: null, batch: null, since: REF, fault: null })), hoppers: HOPPERS.map(h => ({ ...h, code: null, t: 0, q: 'Empty', since: REF, batch: null, relAt: null })), aux: [...['HM-1', 'HM-2'].map(id => ({ id, kind: 'Homogeniser', state: 'Idle', fault: null })), ...['DA-1', 'DA-2'].map(id => ({ id, kind: 'Deaerator', state: 'Idle', fault: null })), ...['TOH-1', 'TOH-2'].map(id => ({ id, kind: 'Thermal-oil heater', state: 'Running', fault: null }))], queue: [] },
    lab: { cap: 24, busy: 0, queue: 0, inTest: 0, doneToday: 0, tatAvg: 0, tatP90: 0, onTime: 1, rft: 1, instruments: [['VIS', 'Automatic viscometers', 6], ['ICP', 'ICP-OES', 2], ['XRF', 'XRF', 2], ['FTIR', 'FTIR', 3], ['TBN', 'TBN/TAN titrators', 2], ['KF', 'Karl Fischer', 2], ['FLASH', 'Flash point (COC/PMCC)', 2], ['POUR', 'Automatic pour point', 2], ['CCS', 'CCS', 2], ['FOAM', 'Foam testers', 4], ['DEMUL', 'Demulsibility', 2], ['PEN', 'Cone penetrometers', 4], ['DROP', 'Dropping point', 2], ['4BALL', 'Four-ball tester', 1]].map(([id, label, n]) => ({ id, label, n, down: 0, until: null })) },
    lines: LINES.map(l => ({ ...l, state: 'Idle – no orders', since: REF, until: null, wo: null, credit: 60, phi: .8, rho: .7, last: null, fault: null, alarm: null, starvedSince: null, pm: null, hb: new Float32Array(48 * 5), oee24: { a: 0, p: 0, q: 0, oee: 0 }, oeeShift: { a: 0, p: 0, q: 0, oee: 0 }, unitsToday: 0, tToday: 0, coToday: 0 })),
    warehouse: { hbw: { cap: WH_CAP.HBW, occ: 0, pct: 0 }, drm: { cap: WH_CAP.DRM, occ: 0, pct: 0 }, pm: { cap: 8000, occ: 0, pct: 0 }, cranes: Array.from({ length: 10 }, (_, i) => ({ id: 'SC-' + pad(i + 1), state: 'Running', fault: null })), byFam: {}, byFmt: {}, coverHBW: 0, coverDRM: 0 },
    materials: {},
    gate: { queue: 0, park: { cap: 220, occ: 0 }, waitAvg: 0, inLanes: Array.from({ length: 6 }, (_, i) => ({ id: 'GI-' + (i + 1), state: 'Open' })), outLanes: Array.from({ length: 6 }, (_, i) => ({ id: 'GO-' + (i + 1), state: 'Open' })), weighbridges: Array.from({ length: 8 }, (_, i) => ({ id: 'WB-' + (i + 1), dir: i < 4 ? 'in' : 'out', state: 'In service', fault: null })), outage: null, onSite: 0 },
    bays: BAYS.map(([id, cls]) => ({ id, cls, state: 'Free', truck: null, box: null, since: REF, until: null, pct: 0, fault: null })),
    iso: { cap: 250, occ: 0, byCat: { EC: 0, ED: 0, FO: 0, IF: 0, ER: 0, RP: 0 }, slots: new Int32Array(250).fill(-1), heatCap: 30, heatUsed: 0, wash: ['TW-1', 'TW-2', 'TW-3', 'TW-4'].map(id => ({ id, iso: null, until: null })), orders: [], divert: 0, fillsToday: 0, dischToday: 0 },
    isoCranes: ISO_CRANES.map(c => ({ ...c, state: 'Free', iso: null, op: null, step: null, since: REF, until: null, movesToday: 0, fault: null, pm: null })),
    rail: { tracks: TRACKS.map(x => ({ ...x, train: null })), cranes: RMGS.map(id => ({ id, state: 'Idle', train: null, movesHour: 0, movesToday: 0, fault: null })), icy: { cap: 900, dryEmpty: 0, full: { JKT: 0, SUB: 0, FDR: 0 }, fullT: { JKT: 0, SUB: 0, FDR: 0 }, isoRail: 0, isoSea: 0, teu: 0 }, movesToday: 0, movesHour: 0 },
    utilities: { steam: { demand: 0, cap: 30, boilers: [{ id: 'BLR-1', state: 'Running', load: 0 }, { id: 'BLR-2', state: 'Running', load: 0 }, { id: 'BLR-3', state: 'Standby', load: 0 }] }, power: { mw: 0, source: 'PLN grid', gens: 0 }, n2: { nm3h: 0, ln2Days: 9 }, air: { bar: 7.5 }, thermal: { mw: 0 }, events: [] },
    kpi: {}, today: null, hist: {},
  };
  const TR_BY_ID = {};

  // ── events, alarms, toasts, agenda ──
  let EVQ = [], lastToast = -1e9;
  const log = (s, sev, area, asset, text) => { S.events.unshift({ at: s, sev, area, asset, text }); if (S.events.length > 400) S.events.length = 400; };
  const say = (s, text, force) => { if (S.warm) return; if (!force && s - lastToast < 10) return; lastToast = s; EVQ.push(text); };
  function alarm(s, sev, area, asset, what, op, owner) {
    const id = 'EX-' + seq('EX', EXCEPTIONS, /^EX-(\d+)$/);
    const e = { id, sev, term: 'MLB', asset, what, since: s, op, owner, status: 'Open', ack: null, res: null, gen: true, hub: true, area };
    EXCEPTIONS.unshift(e); S.alarms.unshift(e); if (S.alarms.length > 120) S.alarms.length = 120;
    log(s, sev, area, asset, `${id} · ${what}`);
    if (sev === 'critical') say(s, `${id} · ${T.name}: ${what}.`, true);
    return e;
  }
  function clear(e, s, by, note) { if (!e || e.status === 'Resolved') return; e.status = 'Resolved'; e.ack = e.ack || { by, at: Math.min(s, e.since + 10) }; e.res = { by, at: s, note }; }
  const AG = []; // follow-ups: { at, fn }
  const later = (at, fn) => { let i = AG.length; while (i > 0 && AG[i - 1].at > at) i--; AG.splice(i, 0, { at, fn }); };

  // ── tank flow bookkeeping ──
  function commit(s) { // close slot [s − 5, s)
    const n = s / 5 - 1, i = ((n % NB) + NB) % NB; SLOTN[i] = n;
    for (const k of T.tanks) { k.hRec[i] = k.pIn; k.hDis[i] = k.pOut; k.v0 += k.pIn - k.pOut; if (k.v0 < 0) k.v0 = 0; k.vol = k.v0; k.pIn = 0; k.pOut = 0; }
  }
  let curSlot = 0;
  function flow(id, a, b) {
    const k = TK[id]; if (!k || !(b > a)) return { rec: 0, dis: 0 };
    let rec = 0, dis = 0; const n0 = Math.floor(a / 5), n1 = Math.floor((b - 1e-9) / 5);
    for (let n = Math.max(n0, curSlot - NB + 1); n <= n1; n++) {
      const s0 = n * 5, ov = Math.min(b, s0 + 5) - Math.max(a, s0); if (ov <= 0) continue;
      if (n === curSlot) { rec += k.pIn * ov / 5; dis += k.pOut * ov / 5; continue; }
      if (n > curSlot) continue;
      const i = ((n % NB) + NB) % NB; if (SLOTN[i] !== n) continue;
      rec += k.hRec[i] * ov / 5; dis += k.hDis[i] * ov / 5;
    }
    return { rec, dis };
  }
  // component draws (t) from released service tanks, or from the drum and bag stores
  const STORE = {}; [...DRUM_STORE, ...BAG_STORE].forEach(c => { STORE[c] = 0; });
  const compAvailT = code => { if (STORE[code] != null) return STORE[code]; let a = 0; for (const k of byCode[code] || []) if (usable(k)) a += Math.max(0, avail(k)) * k.d; return a; };
  function drawComp(code, t, who) {
    if (!(t > 0)) return 0;
    if (STORE[code] != null) { const q = Math.min(t, STORE[code]); STORE[code] -= q; return q; }
    const ks = (byCode[code] || []).filter(usable).sort((a, b) => avail(a) - avail(b));
    let left = t;
    for (const k of ks) { // run one tank down at a time
      const a = Math.max(0, avail(k)) * k.d; if (a < .05) continue;
      const q = Math.min(left, a); k.pOut += q / k.d; k.duty = who; left -= q; if (left <= 1e-6) break;
    }
    return t - left;
  }
  // finished-product draws (kL) from released tanks of a grade; lowest first so tanks empty and free up
  function gradeTanks(code) { const out = []; for (const k of FPT) if (k.code === code && !k.free) out.push(k); return out; }
  function drawGrade(code, kL, who) {
    if (!(kL > 0)) return 0;
    const ks = gradeTanks(code).filter(usable).sort((a, b) => avail(a) - avail(b));
    let left = kL;
    for (const k of ks) { const a = Math.max(0, avail(k)); if (a < .01) continue; const q = Math.min(left, a); k.pOut += q; k.duty = who; left -= q; if (left <= 1e-6) break; }
    return kL - left;
  }
  const drawBulk = (code, kL, who) => { const gi = GI[code], free = gradeAvailK(code) - (typeof resK !== 'undefined' && gi != null ? resK[gi] : 0); return drawGrade(code, Math.min(kL, Math.max(0, free)), who); };
  const gradeAvailK = code => { let a = 0; for (const k of FPT) if (k.code === code && !k.free && usable(k)) a += Math.max(0, avail(k)); return a; };
  function gradeStocks() {
    relK.fill(0); qcK.fill(0);
    for (const k of FPT) {
      if (k.free) continue; const gi = GI[k.code]; if (gi == null) continue;
      const v = Math.max(0, k.v0 - k.heel);
      if (usable(k)) relK[gi] += v; else qcK[gi] += v;
    }
  }
  const S_TODAY = () => ({ out: 0, pkgT: 0, bulkT: 0, road: 0, rail: 0, sea: 0, recSea: 0, recRail: 0, recRoad: 0, recIso: 0, blendT: 0, greaseT: 0, batches: 0, rftPass: 0, rftN: 0, isoFills: 0, isoDisch: 0, railMoves: 0, feederMoves: 0, trucksIn: 0, trucksOut: 0, palIn: 0, palOut: 0, boxes: 0, calls: 0, slopT: 0, coMin: 0, runMin: 0, planMin: 0, samples: 0, tatSum: 0, tatN: 0, late: 0, tats: [], wos: 0, alarms: 0, events: 0, units: 0, reexp: 0, reexpSea: 0, reexpIso: 0, reexpRoad: 0, recXd: 0 });
  S.today = S_TODAY();

  // ── plan use of components and bulk channels ──
  const useT = {}; GRADES.forEach(G => G.recipe.forEach(([c, p]) => { useT[c] = (useT[c] || 0) + G.d * p / 100; }));
  const stockT = code => { if (STORE[code] != null) return STORE[code]; let v = 0; for (const k of byCode[code] || []) v += k.v0 * k.d; return v; };
  const heelT = code => { let v = 0; for (const k of byCode[code] || []) v += k.heel * k.d; return v; };
  const capT = code => { let v = 0; for (const k of byCode[code] || []) v += k.moc * k.d; return v; };
  const coverD = code => useT[code] > 0 ? (stockT(code) - heelT(code)) / useT[code] : 99;
  // base-oil hub: re-export by sea, ISO and road on top of blending, sized so each grade keeps about 9 days in tank
  const BO_EXP = { 'G1-SN150': 300, 'G1-SN500': 1700, 'G1-BS150': 800, 'G2-150N': 380, 'G2-600N': 900, 'G3-4': 440, 'G3-6': 440 }; // t/d
  const EXP_CH = { sea: .75, iso: .12, road: .13 }, BO_CODES = Object.keys(BO_EXP), EXP_D = BO_CODES.reduce((a, c) => a + BO_EXP[c], 0);
  const useB = { ...useT }; BO_CODES.forEach(c => { useT[c] = (useT[c] || 0) + BO_EXP[c]; }); // cover counts blending and re-export
  const expAvailT = c => Math.max(0, compAvailT(c) - (useB[c] || 0) * 2); // re-export never takes a grade below 2 days of blending
  const drawExport = (c, t, who) => { const q = Math.min(t, expAvailT(c)); return q > .01 ? drawComp(c, q, who) : 0; };
  const RAIL_G1 = 30 * 19.5;                                  // t/d of Group I by the daily ISO shuttle
  const ISO_ADD = TANK_ADD.filter(c => useT[c] > 0); // tank additives also arrive by ISO (feeder and road)
  const BULKG = LIQG.filter(G => G.runner && G.dBulk > 0);
  const BULK_D = BULKG.reduce((a, G) => a + G.dBulk, 0);
  const CH = { FBC: .18, SPOB: .10, road: .30, iso: .42 };     // bulk channels, share of bulk demand
  const isoOK = G => G.P.packs.includes('ISO') || G.P.packs.includes('BLK');
  const spobOK = G => (G.P.fam === 'ME' || G.P.fam === 'MT') && G.dBulk > 0;
  const fbcOK = G => G.dBulk > 0;
  S.plan.mode = { road: 0, rail: 0, sea: 0 };

  // ── marine ──
  let nVes = 0, nVoy = 2600;
  const lastEta = {};
  function vesselName(cls, r) {
    const list = cls === 'ADD' ? CHEMTANKERS : cls === 'SPOB' || cls === 'BXB' ? BARGES : cls === 'FDR' ? FEEDERS : TANKERS;
    const used = new Set(S.vessels.filter(v => v.state !== 'Departed').map(v => v.name));
    const free = list.filter(n => !used.has(n)); return pick(r, free.length ? free : list);
  }
  function nominate(cls, eta, r) {
    const C = VCLS[cls];
    const v = { id: 'V' + (++nVes), cls, label: C.label, name: vesselName(cls, r), voyage: 'V.' + (++nVoy), loa: Math.round(U(r, C.loa[0], C.loa[1])), dwt: Math.round(U(r, C.dwt[0], C.dwt[1]) / 100) * 100,
      eta: Math.round(eta / 5) * 5, ata: null, clearAt: null, berthAt: null, startAt: null, endAt: null, atd: null, jetty: null, state: 'Expected', step: 'Expected', stepUntil: null,
      pause: null, parcels: [], pi: 0, rate: C.rate ? Math.round(U(r, C.rate[0], C.rate[1])) : 0, moves: null, reject: false, delays: [], trf: false, final: false, waitAlarm: null, anchorSince: null };
    if (cls === 'IMP') planParcels(v, G23, U(r, 5000, 8000), 2 + Math.floor(r() * 3), r);
    else if (cls === 'CST') planParcels(v, G1, U(r, 3600, 5400), 1 + Math.floor(r() * 3), r);
    else if (cls === 'ADD') planParcels(v, SEA_ADD, U(r, 600, 1800), 3 + Math.floor(r() * 4), r);
    else if (cls === 'FBC' || cls === 'SPOB') planOut(v, r);
    else if (cls === 'BXP' || cls === 'BXB') planExport(v, r);
    S.vessels.push(v); if (cls !== 'FDR') lastEta[cls] = Math.max(lastEta[cls] ?? -1e9, v.eta);
    return v;
  }
  // inbound parcels: the lowest projected-cover stocks, quantities by use, each within 85 % of the free ullage at ETA
  function projStock(code, at) {
    let st = stockT(code) - useT[code] * Math.max(0, at - S.now) / 1440;
    for (const v of S.vessels) if (v.state !== 'Departed' && VCLS[v.cls].dir === 'in' && v.eta < at) for (const p of v.parcels) if (p.code === code) st += p.t - p.done;
    return st;
  }
  function planParcels(v, codes, total, n, r) {
    let ranked = codes.filter(c => useT[c] > 0 && byCode[c]).map(c => [c, (projStock(c, v.eta) - heelT(c)) / useT[c]]).sort((a, b) => a[1] - b[1]);
    ranked = ranked.filter((x, i) => i === 0 || x[1] < (v.cls === 'ADD' ? 9 : 14)).slice(0, n); // grades already well covered stay off the nomination
    const w = ranked.reduce((a, [c]) => a + useT[c], 0);
    v.parcels = ranked.map(([c]) => {
      const room = (capT(c) - projStock(c, v.eta)) * .85;
      const t = Math.max(0, Math.min(total * useT[c] / w, room));
      return { code: c, t: Math.round(t / 10) * 10, done: 0, tank: null, tanks: [], state: 'Waiting', start: null, end: null, trf: null };
    }).filter(p => p.t >= 150);
  }
  // final nomination two days before arrival: quantities follow the cover the stocks are projected to have
  function finalNomination(v, s) {
    v.final = true; if (VCLS[v.cls].dir !== 'in') return;
    const tgt = v.cls === 'ADD' ? 7 : 6.5;
    v.parcels.forEach(p => {
      const cov = (projStock(p.code, v.eta) - heelT(p.code)) / useT[p.code], room = (capT(p.code) - projStock(p.code, v.eta)) * .9; // this vessel is not in its own projection
      const want = clamp((tgt + 2 - cov) * useT[p.code], p.t * .5, p.t * 1.35);
      p.t = Math.round(Math.max(0, Math.min(want, room)) / 10) * 10;
    });
    v.parcels = v.parcels.filter(p => p.t >= 100);
  }
  function planOut(v, r) {
    const isS = v.cls === 'SPOB', list = BULKG.filter(isS ? spobOK : fbcOK);
    const n = isS ? 2 + Math.floor(r() * 3) : 6 + Math.floor(r() * 5), total = isS ? U(r, 150, 450) : U(r, 800, 2500), chosen = [];
    for (let i = 0; i < n * 3 && chosen.length < n; i++) { const G = wpick(r, list, x => x.dBulk); if (G && !chosen.includes(G)) chosen.push(G); }
    const w = chosen.reduce((a, G) => a + G.dBulk, 0);
    v.parcels = chosen.map(G => ({ code: G.code, t: Math.max(isS ? 40 : 60, Math.round(total * G.dBulk / w / 5) * 5), done: 0, tanks: [], state: 'Waiting', start: null, end: null, trf: null }));
  }
  function planExport(v, r) { // base-oil re-export: one to three grades in the hub's re-export mix
    const isB = v.cls === 'BXB', n = isB ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2), total = isB ? U(r, 700, 1500) : U(r, 2800, 4800), chosen = [];
    for (let i = 0; i < n * 4 && chosen.length < n; i++) { const c = wpick(r, BO_CODES, x => BO_EXP[x]); if (c && !chosen.includes(c)) chosen.push(c); }
    const w = chosen.reduce((a, c) => a + BO_EXP[c], 0);
    v.parcels = chosen.map(c => ({ code: c, t: Math.max(isB ? 150 : 300, Math.round(total * BO_EXP[c] / w / 10) * 10), done: 0, tanks: [], state: 'Waiting', start: null, end: null, trf: null }));
  }
  function lineup(s) {
    const H = s + 10 * 1440;
    const plan = (cls, codes, parcel, perDay, tgt) => {
      if (!(perDay > 0)) return;
      const every = parcel / perDay * 1440, r = RS('lineup|' + cls + '|' + s);
      let cover = 0, use = 0; codes.forEach(c => { cover += projStock(c, s) - heelT(c); use += useT[c] || 0; }); cover /= use || 1;
      let next = (lastEta[cls] ?? (s - every * (.3 + r() * .5))) + every * clamp(1 + (cover - tgt) * .06, .7, 1.4);
      if (next < s + 90) next = s + 90 + r() * 180;
      while (next < H) { const v = nominate(cls, next + (r() - .5) * every * .3, r); next = v.eta + every; }
    };
    plan('CST', G1, 4500, G1.reduce((a, c) => a + useT[c], 0) - RAIL_G1, 6);
    plan('IMP', G23, 6500, G23.reduce((a, c) => a + useT[c], 0), 6.5);
    plan('ADD', SEA_ADD, 1200, SEA_ADD.reduce((a, c) => a + useT[c], 0) * .55, 7);
    plan('FBC', [], 1500, BULK_D * CH.FBC, 0); plan('SPOB', [], 300, BULK_D * CH.SPOB, 0);
    plan('BXP', [], 3800, EXP_D * EXP_CH.sea * .75, 0); plan('BXB', [], 1100, EXP_D * EXP_CH.sea * .25, 0);
    // container feeders: service A daily 06:00, service B daily 14:00
    for (let d = dayOf(s); d < dayOf(s) + 10; d++) ['A', 'B'].forEach(svc => {
      if (S.vessels.some(v => v.cls === 'FDR' && v.fday === d && v.svc === svc)) return;
      const A = svc === 'A', r = RS('fdr|' + d + svc), u = r();
      if (u < .03) return; // cancelled
      let eta = midnight(d) + (A ? 360 : 840) + (r() - .5) * 360; if (u < .18) eta += U(r, 360, 1440);
      const v = nominate('FDR', eta, r); v.fday = d; v.svc = svc; v.service = A ? 'Service A · Jakarta–Kendal–Surabaya' : 'Service B · Singapore–Jakarta–Kendal';
    });
  }
  function berth(v, j, s, r) {
    j.vessel = v.id; j.state = 'Occupied'; v.jetty = j.id; v.berthAt = s; v.state = 'Berthing'; v.step = 'Pilot on board · berthing'; v.stepUntil = s + 90;
    if (v.waitAlarm) { clear(v.waitAlarm, s, 'Harbour master', `${v.name} berthed at ${j.name}.`); v.waitAlarm = null; }
    log(s, 'info', 'Marine', j.name, `${v.name} berthing at ${j.name} · ${v.label}`); say(s, `${v.name} berthing at ${T.name} ${j.name}.`);
    v.parcels.forEach(p => { const tr = TR_BY_ID[p.trf]; if (tr) tr.berth = j.name; });
  }
  function depart(v, s) {
    v.state = 'Departed'; v.step = 'Departed'; v.atd = s;
    const j = S.jetties.find(x => x.id === v.jetty); if (j) { j.vessel = null; j.state = 'Free'; }
    log(s, 'info', 'Marine', j ? j.name : v.name, `${v.name} departed ${j ? j.name : ''}`.trim()); say(s, `${v.name} departed ${T.name}${j ? ' ' + j.name : ''}.`);
  }
  function pauseV(v, s, until, reason) { v.pause = { since: s, until, reason }; v.state = 'Paused'; v.step = reason; v.parcels.forEach(p => { const tr = TR_BY_ID[p.trf]; if (tr && p.state === 'Pumping') { tr.state = 'Paused'; tr.flow = 0; tr.pauses.push([s, null, reason]); } }); }
  function resumeV(v, s) {
    const pz = v.pause; v.pause = null; v.state = VCLS[v.cls].dir === 'in' ? 'Discharging' : VCLS[v.cls].dir === 'out' ? 'Loading' : 'Exchange'; v.step = v.state;
    v.parcels.forEach(p => { const tr = TR_BY_ID[p.trf]; if (tr && tr.state === 'Paused') { const z = tr.pauses.find(x => x[1] == null); if (z) z[1] = s; tr.state = 'In progress'; } });
    if (pz && pz.alarm) clear(pz.alarm, s, 'Loading master', `${pz.reason} cleared; cargo resumed ${tm(s, 'WIB')}.`);
  }
  function mkTrf(v, p, i, s) {
    const id = `TRF-MLB-${ymd(s).slice(0, 2)}-${String(seq('TRFMLB', TRANSFERS, /^TRF-MLB-\d\d-(\d+)$/)).padStart(4, '0')}`, inb = VCLS[v.cls].dir === 'in';
    const j = v.jetty ? S.jetties.find(x => x.id === v.jetty) : null, d = densOf(p.code), C = COMP[p.code], G = GRADE[p.code];
    const est = v.eta + 120 + VCLS[v.cls].pre + i * 300;
    const tr = { id, term: 'MLB', type: inb ? 'Ship-to-shore' : 'Ship loading', code: p.code, vessel: v.name, voyage: v.voyage, berth: j ? j.name : 'Jetty to be assigned', arm: inb ? 'MLA-' + (v.cls === 'ADD' ? 'J5' : v.cls === 'IMP' ? 'J1/J2' : 'J3/J4') : C ? 'Export arm' : 'Export hose',
      meter: 'FM-' + (v.jetty || 'J'), comp: `Parcel ${i + 1} of ${v.parcels.length}`, dst: inb ? 'Base-oil tank, assigned at discharge' : `${j ? j.name : 'Jetty'} · ${v.name}`, src: inb ? undefined : C ? 'Base-oil tanks' : 'Finished-product tanks', node: inb ? undefined : 'ship',
      planned: Math.round(p.t / d), recv: 0, qty: 0, flow: null, start: est, arrive: v.eta, pauses: [], state: 'Scheduled', batch: `${inb ? 'RCP' : 'DSP'}-MLB-${yymm(s)}-${(C ? C.short : G ? G.P.key : p.code).replace(/[^A-Z0-9]/gi, '')}`,
      temp: inb ? +(C && C.kind === 'additive' ? 55 + i : 34 + i).toFixed(1) : 38, dens: Math.round(d * 10000) / 10, gen: true, ext: true, hub: v.id };
    TRANSFERS.push(tr); TR_BY_ID[id] = tr; p.trf = id; api.derive(tr);
  }
  function syncTrf(v, s) {
    v.parcels.forEach((p, i) => {
      const tr = TR_BY_ID[p.trf]; if (!tr) return; const d = densOf(p.code);
      tr.planned = Math.max(1, Math.round(p.t / d)); tr.qty = p.done / d; tr.recv = Math.round(tr.qty);
      if (p.state === 'Waiting') { tr.state = v.state === 'At anchorage' && s - (v.ata || s) > 120 ? 'Delayed' : 'Scheduled'; tr.start = Math.max(s + 5, (v.startAt || v.eta + 120 + VCLS[v.cls].pre) + i * 240); }
      else if (p.state === 'Pumping') { tr.start = p.start; if (tr.state !== 'Paused') { tr.state = 'In progress'; tr.flow = Math.round(v.rate / d); tr.flow0 = tr.flow; } if (p.tanks.length) tr[VCLS[v.cls].dir === 'in' ? 'dst' : 'src'] = p.tanks.join(' + '); }
      else if (p.state === 'Done' && tr.state !== 'Completed') { tr.state = 'Completed'; tr.end = p.end; tr.flow = 0; tr.qty = tr.recv = tr.planned = Math.round(p.done / d); if (p.tanks.length) tr[VCLS[v.cls].dir === 'in' ? 'dst' : 'src'] = p.tanks.join(' + '); }
      tr.active = tr.state === 'In progress' || tr.state === 'Paused';
      api.derive(tr);
    });
  }
  function settleReceipt(k, s, src, small) {
    if (small) { k.state = 'Released'; k.q = 'Released'; k.since = s; k.duty = null; return; } // ISO and road receipts are tested before discharge
    k.state = 'QC hold'; k.q = 'Awaiting test results'; k.since = s; k.duty = null;
    k.batch = `RCP-${k.id}-${ymd(s).slice(2)}`;
    labSubmit(s, 'Receipt', k.code, k.batch, k.id, src, { kind: 'releaseTank', tank: k.id });
  }
  function pickRecvTank(code, need, big) {
    const ks = (byCode[code] || []).filter(k => k.state === 'Released' && !k.recv && ullage(k) > need).sort((a, b) => ullage(b) - ullage(a));
    if (!big) return ks[0] || null;
    // a vessel parcel never takes the last tank that can still feed the blenders
    for (const k of ks) if ((byCode[code] || []).some(o => o !== k && usable(o) && !o.recv && (o.v0 - o.heel) * o.d > .3 * (useT[code] || 0))) return k;
    return null;
  }
  function cargoIn(v, s, r) {
    let p = v.parcels[v.pi];
    if (!p) { v.state = 'Post-operations'; v.step = 'Stripping, N₂ line blow, outturn'; v.endAt = s; v.stepUntil = s + VCLS[v.cls].post; return; }
    const d = densOf(p.code);
    if (p.state === 'Waiting') {
      const k = pickRecvTank(p.code, Math.min(200, (p.t - p.done) / d * .3), true);
      if (!k) { if (!v.pause) pauseV(v, s, s + 30, 'Awaiting ullage'); return; }
      p.state = 'Pumping'; p.start = s; p.tank = k.id; p.tanks.push(k.id); k.recv = v.id; k.state = 'Receiving'; k.q = 'Awaiting test results'; k.since = s; k.duty = v.name;
    }
    let k = TK[p.tank];
    if (ullage(k) < 15) { // tank change at the high level
      k.recv = null; settleReceipt(k, s, v.name);
      const k2 = pickRecvTank(p.code, 100, true);
      if (!k2) { pauseV(v, s, s + 30, 'Awaiting ullage'); p.tank = null; p.state = 'Waiting'; return; }
      p.tank = k2.id; p.tanks.push(k2.id); k2.recv = v.id; k2.state = 'Receiving'; k2.q = 'Awaiting test results'; k2.since = s; k2.duty = v.name;
      pauseV(v, s, s + Math.round(U(r, 10, 15)), 'Tank change'); return;
    }
    const q = Math.min(v.rate * 5 / 60 / d, (p.t - p.done) / d, ullage(k));
    k.pIn += q; p.done += q * d; S.today.recSea += q * d;
    if (p.done >= p.t - .5) {
      p.state = 'Done'; p.end = s + 5; k.recv = null; settleReceipt(k, s + 5, v.name); v.pi++;
      if (v.pi < v.parcels.length) pauseV(v, s + 5, s + Math.round(U(r, 30, 45)), 'Line pigging between grades');
    }
  }
  function cargoOut(v, s, r) {
    const p = v.parcels[v.pi];
    if (!p) { v.state = 'Post-operations'; v.step = 'Hose disconnect, ullage, documents'; v.endAt = s; v.stepUntil = s + VCLS[v.cls].post; return; }
    const d = densOf(p.code);
    if (p.state === 'Waiting') { p.state = 'Pumping'; p.start = s; }
    const exp = !!COMP[p.code], want = Math.min(v.rate * 5 / 60, p.t - p.done), got = exp ? drawExport(p.code, want, v.name) : drawBulk(p.code, want / d, v.name) * d;
    (exp ? byCode[p.code] || [] : gradeTanks(p.code)).forEach(k => { if (k.duty === v.name && !p.tanks.includes(k.id)) p.tanks.push(k.id); });
    p.done += got; S.today.sea += got; if (exp) { S.today.reexp += got; S.today.reexpSea += got; } else { S.today.bulkT += got; S.today.out += got; }
    if (got < want * .3) p.t = p.done; // short-load what is not released in time
    if (p.done >= p.t - .5) { p.state = 'Done'; p.end = s + 5; v.pi++; if (v.pi < v.parcels.length) pauseV(v, s + 5, s + Math.round(U(r, 15, 30)), 'Grade change · line flush'); }
  }
  function feederStart(v, s, r) {
    const icy = S.rail.icy, boxes = icy.full.FDR, isoOut = S.isos.filter(x => x.cat === 'FO' && x.loc === 'ICY sea staging').length;
    const inEmpty = Math.round(U(r, 45, 75)), inIso = Math.min(isoSeaQueue.length, 16), inEmptyIso = Math.round(U(r, 4, 9)), erSea = Math.min(12, S.isos.filter(x => x.cat === 'ER' && x.ret === 'sea').length);
    v.moves = { out: boxes + isoOut + erSea, outBoxes: boxes, outIso: isoOut, erSea, inBoxes: inEmpty, inIso, inEmptyIso, planned: boxes + isoOut + erSea + inEmpty + inIso + inEmptyIso, done: 0, rate: U(r, 24, 30) * (r() < .1 ? .5 : 1) };
  }
  function feederDone(v, s, r) {
    const icy = S.rail.icy, m = v.moves;
    const t = icy.fullT.FDR; S.today.sea += t; icy.full.FDR = 0; icy.fullT.FDR = 0;
    let isoT = 0; S.isos.filter(x => x.cat === 'FO' && x.loc === 'ICY sea staging').forEach(x => { isoT += x.t; isoGone(x, s); });
    S.isos.filter(x => x.cat === 'ER' && x.ret === 'sea').slice(0, m.erSea).forEach(x => isoGone(x, s)); // supplier empties go back by sea
    S.today.sea += isoT; S.today.feederMoves += m.planned;
    icy.dryEmpty += m.inBoxes;
    isoSeaQueue.splice(0, m.inIso).forEach(c => isoArrive(s, r, 'sea', c));
    for (let i = 0; i < m.inEmptyIso; i++) isoArriveEmpty(s, r, 'sea');
    log(s, 'info', 'Marine', v.name, `${v.name} exchange complete · ${m.planned} moves · ${m.outBoxes} boxes and ${m.outIso} ISO tanks loaded`);
  }
  function marine(s) {
    const r = RS('mar|' + s), h = (minOf(s) / 60) | 0;
    for (const v of S.vessels) {
      if (v.state === 'Departed') continue;
      if (!v.final && v.eta - s <= 2880 && VCLS[v.cls].dir === 'in') finalNomination(v, s);
      if (!v.trf && v.cls !== 'FDR' && v.eta - s < 2880 && v.parcels.length) { v.trf = true; v.parcels.forEach((p, i) => mkTrf(v, p, i, s)); }
      switch (v.state) {
        case 'Expected':
          if (s >= v.eta) { v.state = 'At anchorage'; v.step = 'At anchorage · customs clearance'; v.ata = s; v.anchorSince = s; v.clearAt = s + (v.cls === 'IMP' ? U(r, 60, 300) + (r() < .15 ? U(r, 120, 480) : 0) : 30); log(s, 'info', 'Marine', 'Anchorage', `${v.name} arrived at anchorage · ${v.label}`); }
          break;
        case 'At anchorage': {
          if (s < v.clearAt) break;
          if (S.wx) { v.step = 'At anchorage · thunderstorm, berthing suspended'; break; }
          if (v.cls === 'IMP' && (h < 6 || h >= 17)) { v.step = 'At anchorage · J1/J2 berthing 06:00–17:00 only'; break; }
          if (v.cls === 'IMP' && S.swell) { v.step = 'At anchorage · swell, J1/J2 berthing suspended'; break; }
          const j = S.jetties.find(x => x.cls.includes(v.cls) && !x.vessel && !x.closed);
          if (!j) { v.step = 'At anchorage · waiting for a free berth'; if (!v.waitAlarm && s - v.anchorSince > 720) v.waitAlarm = alarm(s, 'attention', 'Marine', v.name, `${v.name} waiting at anchorage more than 12 h — berth congestion`, `Berths for ${v.label.toLowerCase()} occupied`, 'Harbour master · MLB'); break; }
          berth(v, j, s, r); break;
        }
        case 'Berthing':
          if (s >= v.stepUntil) {
            v.state = 'Pre-operations'; v.step = VCLS[v.cls].dir === 'in' ? 'Safety checklist, ullage, pre-discharge samples' : VCLS[v.cls].dir === 'out' ? 'Safety checklist, line-up, tank certificates' : 'Lashing, hatch covers, crane checks';
            v.stepUntil = s + VCLS[v.cls].pre;
            if (VCLS[v.cls].dir === 'in') {
              v.parcels.forEach(p => labSubmit(s, 'Vessel parcel', p.code, `${v.voyage}-${p.code}`, v.name, v.name, null));
              if (r() < .015) { const rej = r() < .13; v.stepUntil += Math.round(U(r, 120, 360)); v.reject = rej; v.qcAlarm = alarm(s, rej ? 'critical' : 'attention', 'Marine', v.name, rej ? `Cargo rejected — pre-discharge sample off-specification, ${v.name}` : `Pre-discharge sample off-specification — ${v.name} held for re-sampling`, rej ? 'Vessel will leave without discharging' : 'Discharge held for re-sample and supplier review', 'Quality officer · MLB'); }
            }
          }
          break;
        case 'Pre-operations':
          if (s >= v.stepUntil) {
            if (v.qcAlarm) { clear(v.qcAlarm, s, 'Quality officer', v.reject ? 'Cargo rejected; supplier informed.' : 'Re-sample within specification; discharge released.'); v.qcAlarm = null; }
            if (v.reject) { v.parcels.forEach(p => { p.state = 'Done'; p.t = 0; p.end = s; }); v.state = 'Post-operations'; v.step = 'Unberthing · cargo rejected'; v.stepUntil = s + 60; break; }
            v.startAt = s; v.state = VCLS[v.cls].dir === 'in' ? 'Discharging' : VCLS[v.cls].dir === 'out' ? 'Loading' : 'Exchange'; v.step = v.state;
            if (v.cls === 'FDR') feederStart(v, s, r);
            log(s, 'info', 'Marine', v.jetty, `${v.name} ${v.state.toLowerCase()} started at Jetty ${v.jetty.slice(1)}`);
          }
          break;
        case 'Discharging': case 'Loading': case 'Exchange': case 'Paused': {
          if (v.pause) { if (s < v.pause.until) break; resumeV(v, s); }
          if (S.wx) { pauseV(v, s, S.wxUntil, 'Thunderstorm · cargo operations suspended'); break; }
          if (v.cls === 'FDR') {
            const m = v.moves, q = Math.min(m.rate * 5 / 60, m.planned - m.done); m.done += q;
            if (m.done >= m.planned - 1e-6) { feederDone(v, s, r); v.state = 'Post-operations'; v.step = 'Lashing check, documents'; v.endAt = s; v.stepUntil = s + VCLS.FDR.post; }
            break;
          }
          if (VCLS[v.cls].dir === 'in' && r() < .004) { const e = alarm(s, 'attention', 'Marine', v.name, `Vessel cargo pump trip — discharge paused, ${v.name}`, `Jetty ${v.jetty.slice(1)} discharge`, `Loading master · Jetty ${v.jetty.slice(1)}`); pauseV(v, s, s + Math.round(U(r, 20, 60)), 'Vessel cargo pump trip'); v.pause.alarm = e; break; }
          if (VCLS[v.cls].dir === 'in') cargoIn(v, s, r); else cargoOut(v, s, r);
          break;
        }
        case 'Post-operations': if (s >= v.stepUntil) depart(v, s); break;
      }
      if (v.trf) syncTrf(v, s);
    }
    for (let i = S.vessels.length - 1; i >= 0; i--) if (S.vessels[i].state === 'Departed' && S.vessels[i].atd < s - 2880) S.vessels.splice(i, 1);
  }

  // ── rail: Surabaya liners 01:00 and 13:00, Jakarta liners 03:30 and 15:30, base-oil ISO shuttle 21:00, every day ──
  let nTrain = 2700;
  const SVC = { JKT: 'Jakarta liner · Cikarang dry port', SUB: 'Surabaya liner', ISO: 'Base-oil ISO shuttle · refinery railhead' };
  function railDay(d) {
    if (S.trains.some(x => x.day === d)) return;
    const r = RS('rail|' + d);
    const late = () => { const u = r(); return u < .55 ? U(r, -10, 15) : u < .9 ? U(r, 30, 120) : u < .98 ? U(r, 120, 360) : null; };
    const mk = (svc, at, wagons, inn, out) => { const l = late(), sched = midnight(d) + at; S.trains.push({ id: 'KA ' + (++nTrain), service: svc, name: SVC[svc], day: d, sched, eta: l == null ? sched : sched + Math.round(l / 5) * 5, etd: sched + 240, ata: null, atd: null, state: l == null ? 'Cancelled' : 'Expected', step: l == null ? 'Cancelled by the operator' : 'Expected', track: null, wagons, inPlan: inn, outPlan: out, moves: 0, done: 0, cranes: svc === 'SUB' ? 2 : 4, stepUntil: null, out: 0, outIso: 0, outT: 0, inn: 0, badOrder: 0 }); };
    mk('SUB', 60, 18, 18, 18); mk('JKT', 210, 24, 30, 30); mk('SUB', 780, 18, 18, 18); mk('JKT', 930, 24, 30, 30); mk('ISO', 1260, 18, 30, 30); // two liners each way and the base-oil shuttle, every day
  }
  function rail(s) {
    const r = RS('rail|' + s), icy = S.rail.icy;
    let working = 0;
    for (const tr of S.trains) {
      switch (tr.state) {
        case 'Expected':
          if (s >= tr.eta) {
            const trk = S.rail.tracks.find(x => !x.train && x.id !== 'RT-3') || S.rail.tracks.find(x => !x.train);
            if (!trk) { tr.step = 'Holding at the exchange signal · tracks occupied'; break; }
            trk.train = tr.id; tr.track = trk.id; tr.ata = s; tr.state = 'Shunting'; tr.step = 'Arrival, shunt to the loading track'; tr.stepUntil = s + Math.round(U(r, 30, 45));
            const lateBy = tr.eta - tr.sched; log(s, lateBy > 120 ? 'attention' : 'info', 'Rail', trk.id, `${tr.id} ${tr.name} arrived on ${trk.id}${lateBy > 20 ? ` · ${dur(lateBy)} late` : ''}`); say(s, `${tr.id} ${tr.name} arrived at ${T.name}.`);
          }
          break;
        case 'Shunting': if (s >= tr.stepUntil) { tr.state = 'Inspection'; tr.step = 'Brake and wagon inspection, locomotive off'; tr.stepUntil = s + Math.round(U(r, 20, 30)); tr.badOrder = r() < .5 ? Math.floor(r() * 2) : 0; } break;
        case 'Inspection':
          if (s >= tr.stepUntil) {
            tr.state = 'Working'; tr.step = 'Crane work';
            if (tr.service === 'ISO') { tr.inn = tr.inPlan; tr.outIso = Math.min(tr.outPlan, S.isos.filter(x => x.cat === 'ER' && x.ret === 'rail').length); tr.out = tr.outIso; }
            else { const boxes = Math.min(icy.full[tr.service], tr.outPlan - tr.badOrder), isos = S.isos.filter(x => x.cat === 'FO' && x.loc === 'ICY rail staging').length; tr.out = boxes + Math.min(isos, 8); tr.outBoxes = boxes; tr.outIso = Math.min(isos, 8); tr.inn = tr.inPlan; }
            tr.moves = tr.out + tr.inn; tr.done = 0;
          }
          break;
        case 'Working': {
          if (S.wx) { tr.step = 'Crane work paused · lightning'; break; }
          tr.step = 'Crane work';
          const cranes = S.rail.cranes.filter(c => !c.fault && (c.train === tr.id || !c.train)).slice(0, tr.cranes);
          cranes.forEach(c => { c.train = tr.id; c.state = 'Working'; });
          let q = 0; cranes.forEach(c => { const m = Math.min(U(r, 20, 25) * 5 / 60, tr.moves - tr.done - q); q += m; c.movesToday += m; c.mh = (c.mh || 0) + m; });
          tr.done += q; S.today.railMoves += q; working += q;
          if (tr.done >= tr.moves - 1e-6) {
            tr.state = 'Brake test'; tr.step = 'Lashing check, wagon list, full brake test'; tr.stepUntil = s + Math.round(U(r, 30, 45));
            S.rail.cranes.forEach(c => { if (c.train === tr.id) { c.train = null; c.state = 'Idle'; } });
            if (tr.service === 'ISO') { for (let i = 0; i < tr.inn; i++) isoArrive(s, r, 'rail', wpick(r, G1, c => useT[c] || 1)); S.isos.filter(x => x.cat === 'ER' && x.ret === 'rail').slice(0, tr.outIso).forEach(x => isoGone(x, s)); }
            else {
              const per = icy.full[tr.service] ? icy.fullT[tr.service] / icy.full[tr.service] : 15.5, t = per * tr.outBoxes; icy.full[tr.service] -= tr.outBoxes; icy.fullT[tr.service] = Math.max(0, icy.fullT[tr.service] - t);
              let isoT = 0; S.isos.filter(x => x.cat === 'FO' && x.loc === 'ICY rail staging').slice(0, tr.outIso).forEach(x => { isoT += x.t; isoGone(x, s); });
              tr.outT = t + isoT; S.today.rail += t + isoT; icy.dryEmpty += Math.round(tr.inn * .85); for (let i = 0; i < Math.round(tr.inn * .15); i++) isoArriveEmpty(s, r, 'rail');
            }
          }
          break;
        }
        case 'Brake test':
          if (s >= tr.stepUntil) {
            tr.state = 'Departed'; tr.step = 'Departed'; tr.atd = s + 15; const trk = S.rail.tracks.find(x => x.train === tr.id); if (trk) trk.train = null;
            log(s, 'info', 'Rail', tr.track, `${tr.id} ${tr.name} departed · ${tr.moves} crane moves, dwell ${dur(s + 15 - tr.ata)}`); say(s, `${tr.id} ${tr.name} departed ${T.name}.`);
          }
          break;
      }
    }
    S.rail.movesHour = working * 12;
    for (let i = S.trains.length - 1; i >= 0; i--) { const x = S.trains[i]; if ((x.state === 'Departed' && x.atd < s - 2880) || (x.state === 'Cancelled' && x.sched < s - 1440)) S.trains.splice(i, 1); }
  }

  // ── ISO station and yard ──
  // Categories: EC empty clean · ED empty dirty (wash) · FO full outbound · IF inbound full · ER empty to return · RP repair
  const HEAT0 = 150, HEAT1 = 180; // Y-D rows 1–15: the 30 steam heating points
  const yardLoc = i => `${ISO_BLOCKS[(i / 50) | 0]} ${pad(((i % 50) >> 1) + 1)}/${(i % 2) + 1}`;
  const isoSeaQueue = [];          // inbound ISO tanks booked on the next feeder (component codes)
  const pendIso = {};              // t ordered by ISO and not yet discharged, by component
  const needsHeat = code => code === 'G1-BS150' || code === 'PAO-40' || (COMP[code] && COMP[code].kind === 'additive' && code !== 'AF-SIL');
  const isoSerials = new Set();
  function newIsoId(r) { // a random six-digit serial, unique in the fleet, with its ISO 6346 check digit
    let serial;
    do { serial = String(Math.floor(r() * 1e6)).padStart(6, '0'); } while (isoSerials.has(serial));
    isoSerials.add(serial);
    return { own: ISO_OWNER, id: iso6346(ISO_OWNER, serial) };
  }
  function slotTake(heat) {
    const sl = S.iso.slots;
    if (heat) for (let i = HEAT0; i < HEAT1; i++) if (sl[i] < 0) return i;
    for (let i = 0; i < 250; i++) { if (i >= HEAT0 && i < HEAT1) continue; if (sl[i] < 0) return i; }
    for (let i = HEAT0; i < HEAT1; i++) if (sl[i] < 0) return i;
    return -1;
  }
  let nIsoObj = 0;
  function isoPlace(x, s, heat) {
    const i = slotTake(heat); if (i < 0) { S.iso.divert++; return false; }
    S.iso.slots[i] = ++nIsoObj; x.key = nIsoObj; x.slot = i; x.loc = yardLoc(i); x.since = s; return true;
  }
  function isoUnslot(x) { if (x.slot >= 0) { S.iso.slots[x.slot] = -1; x.slot = -1; } }
  function isoAdd(x, s, heat) { x.type = x.type || ISO_TYPE; if (!isoPlace(x, s, heat)) return null; S.isos.push(x); return x; }
  function isoGone(x, s) { isoUnslot(x); const i = S.isos.indexOf(x); if (i >= 0) S.isos.splice(i, 1); }
  function isoArrive(s, r, mode, code) { // inbound full ISO into the yard
    const c = code || pick(r, ISO_ADD), { own, id } = newIsoId(r), heat = needsHeat(c);
    const x = { id, own, cat: 'IF', code: c, t: +U(r, 18.5, 21).toFixed(1), tempC: heat ? Math.round(U(r, 28, 36)) : 31, heat, heatUntil: heat ? s + Math.round(U(r, 480, 960) + (r() < .1 ? U(r, 240, 480) : 0)) : s + Math.round(U(r, 0, 240)), slot: -1, loc: '', since: s, mode, ret: mode === 'rail' ? 'rail' : r() < .6 ? 'sea' : 'road', arrived: s };
    if (!isoAdd(x, s, heat)) return null;
    labSubmit(s, 'Receipt', c, x.id, x.id, mode === 'rail' ? 'Rail shuttle' : mode === 'sea' ? 'Feeder' : 'Road', { kind: 'isoOK', iso: x.id });
    log(s, 'info', 'ISO', x.loc, `${x.id} arrived full by ${mode} · ${COMP[c] ? COMP[c].label : c}`);
    return x;
  }
  function isoArriveEmpty(s, r, mode) {
    const { own, id } = newIsoId(r), u = r(), last = pick(r, BULKG).code;
    const x = { id, own, cat: u < .06 ? 'RP' : u < .35 ? 'ED' : 'EC', code: last, t: 0, tempC: 31, heat: false, slot: -1, loc: '', since: s, mode, arrived: s, repairUntil: null };
    if (x.cat === 'RP') x.repairUntil = s + Math.round(U(r, 1440, 4320));
    return isoAdd(x, s, false);
  }
  // fill orders (C6 keeps clean empties ≈ 3 days of fills; inbound ISO supply follows component cover)
  let nOrder = 0;
  function nextDeparture(mode, s) {
    if (mode === 'rail') { const t = S.trains.filter(x => x.service !== 'ISO' && x.state === 'Expected' && x.eta > s + 240).sort((a, b) => a.eta - b.eta)[0]; return t ? t.eta : s + 1440; }
    if (mode === 'sea') { const v = S.vessels.filter(x => x.cls === 'FDR' && x.state === 'Expected' && x.eta > s + 480).sort((a, b) => a.eta - b.eta)[0]; return v ? v.eta : s + 2880; }
    return s + U(RS('due|' + s), 720, 2880);
  }
  function isoOrders(s, r, df) {
    const lam = BULK_D * CH.iso / 19.5 / 288 * (.7 + .3 * df);
    const n = poisson(r, lam);
    for (let i = 0; i < n; i++) {
      const G = wpick(r, BULKG.filter(isoOK), x => x.dBulk); if (!G) break;
      const u = r(), mode = u < .25 ? 'road' : u < .5 ? 'rail' : 'sea';
      S.iso.orders.push({ id: 'ISO-ORD-' + (++nOrder), code: G.code, mode, due: Math.round(nextDeparture(mode, s)), at: s, iso: null });
    }
    const nb = poisson(r, EXP_D * EXP_CH.iso / 19.5 / 288 * (.7 + .3 * df)); // base-oil hub: re-export by ISO
    for (let i = 0; i < nb; i++) { const c = wpick(r, BO_CODES, x => BO_EXP[x]), u = r(), mode = u < .4 ? 'road' : u < .6 ? 'rail' : 'sea'; S.iso.orders.push({ id: 'ISO-ORD-' + (++nOrder), code: c, mode, due: Math.round(nextDeparture(mode, s)), at: s, iso: null, base: true }); }
    if (S.iso.orders.length > 90) S.iso.orders.splice(0, S.iso.orders.length - 90);
  }
  function isoSupply(s, r) { // every 6 h: book inbound ISO tanks for components below their cover target
    const plan = c => { const tgt = SPEC.includes(c) ? 12 : 7, cov = (stockT(c) + (pendIso[c] || 0) - heelT(c)) / useT[c]; return cov < tgt ? Math.ceil((tgt - cov) * useT[c] / 19.5 / 3) : 0; };
    [...SPEC, ...ISO_ADD].forEach(c => {
      if (!(useT[c] > 0)) return; let n = Math.min(8, plan(c));
      for (let i = 0; i < n; i++) {
        pendIso[c] = (pendIso[c] || 0) + 19.5;
        if (r() < .6) isoSeaQueue.push(c); else truckJob(s + Math.round(U(r, 60, 480)), 'UNL', { code: c, t: 19.5, iso: true });
      }
    });
  }
  function isoStation(s, r) {
    // crane steps
    for (const c of S.isoCranes) {
      if (c.fault) { if (s >= c.fault.until) { clear(c.fault.alarm, s, 'Crane technician', `${c.id} repaired and back in service.`); c.fault = null; c.state = c.iso ? c.state : 'Free'; } else continue; }
      if (!c.iso) continue;
      const x = c.iso;
      if (S.wx && (c.step === 'Lifting in' || c.step === 'Lifting out')) continue; // outdoor lifts stop in lightning
      if (c.step === 'Filling') {
        const k = TK[c.src], d = densOf(x.code), want = Math.min(c.rate * 5 / 60, (c.target - x.t) / d);
        const got = k && usable(k) ? Math.min(want, Math.max(0, avail(k))) : 0;
        if (got > 0) { k.pOut += got; k.duty = c.id; x.t += got * d; if (COMP[x.code]) { S.today.reexp += got * d; S.today.reexpIso += got * d; } else { S.today.bulkT += got * d; S.today.out += got * d; } }
        if (x.t >= c.target - .05 || got < want * .2) { c.step = 'Sealing & sampling'; c.state = 'Sealing'; c.until = s + 20 + (x.t < c.target * .84 ? 15 : 0); }
        continue;
      }
      if (c.step === 'Discharging') {
        const k = TK[c.dst], d = densOf(x.code), want = Math.min(c.rate * 5 / 60, x.t / d), q = k ? Math.min(want, Math.max(0, ullage(k))) : 0;
        if (q > 0) { k.pIn += q; k.duty = c.id; x.t -= q * d; if (x.mode === 'rail') S.today.recRail += q * d; else S.today.recIso += q * d; pendIso[x.code] = Math.max(0, (pendIso[x.code] || 0) - q * d); }
        if (x.t <= .05 || (k && ullage(k) < 1)) { if (k) { k.recv = null; settleReceipt(k, s, x.id, true); } x.t = 0; x.cat = 'ER'; c.step = 'Lifting out'; c.state = 'Lifting'; c.until = s + 10; S.today.isoDisch++; S.iso.dischToday++; }
        continue;
      }
      if (s < c.until) continue;
      if (c.step === 'Lifting in') { c.step = c.op === 'fill' ? 'Pre-fill check' : 'Connecting · heating check'; c.state = 'Preparing'; c.until = s + 10; }
      else if (c.step === 'Pre-fill check') { c.step = 'Filling'; c.state = 'Filling'; }
      else if (c.step === 'Connecting · heating check') { const k = TK[c.dst]; if (k) { k.recv = x.id; k.duty = c.id; } c.step = 'Discharging'; c.state = 'Discharging'; }
      else if (c.step === 'Sealing & sampling') {
        x.cat = 'FO'; x.filled = s; c.step = 'Lifting out'; c.state = 'Lifting'; c.until = s + 10; S.today.isoFills++; S.iso.fillsToday++;
        labSubmit(s, 'Retain', x.code, x.id, x.id, c.id, null);
      } else if (c.step === 'Lifting out') {
        if (!isoPlace(x, s, false)) { x.loc = 'Off-site depot'; S.iso.divert++; }
        c.movesToday += 2; c.iso = null; c.op = null; c.step = null; c.state = 'Free'; c.since = s;
      }
    }
    // assign free cranes: discharges first (inbound stock), then fills by due time
    const ready = S.isos.filter(x => x.cat === 'IF' && x.slot >= 0 && x.qcOK && s >= x.heatUntil).sort((a, b) => a.arrived - b.arrived);
    const orders = S.iso.orders.filter(o => !o.iso).sort((a, b) => a.due - b.due);
    for (const c of S.isoCranes) {
      if (c.iso || c.fault || c.pm || S.wx) continue;
      let job = null;
      if (c.bay === 'A' || c.bay === 'C') {
        for (const x of ready) {
          const add = COMP[x.code] && COMP[x.code].kind === 'additive';
          if ((c.bay === 'C') !== add) continue;
          const k = pickRecvTank(x.code, x.t / densOf(x.code) + 5); if (!k) continue;
          if (add && (k.v0 + k.pIn) / k.moc > .55) continue; // additive ISOs are rolling storage until the tank is below 55 %
          job = { op: 'disch', x, k }; break;
        }
      }
      if (!job) {
        for (const o of orders) {
          if (o.iso) continue;
          let src;
          if (o.base) { // base-oil re-export: bays A and B, bright stock (heated) at bay C
            if (o.code === 'G1-BS150' ? c.bay !== 'C' : c.bay !== 'A' && c.bay !== 'B') continue;
            src = (byCode[o.code] || []).filter(usable).sort((a, b) => avail(b) - avail(a))[0]; if (!src || avail(src) < 24 || expAvailT(o.code) < 22) continue;
          } else {
            const G = GRADE[o.code], seg = G.P.seg, heavy = G.P.visc === 'H' || G.P.visc === 'X';
            const okBay = c.bay === 'D' ? (seg === 'CLEAN' || seg === 'FG' || seg === 'PAG') : c.bay === 'C' ? heavy : c.bay === 'B' ? (seg === 'MIN' || seg === 'SYN') : seg === 'MIN';
            if (!okBay) continue;
            src = gradeTanks(o.code).filter(usable).sort((a, b) => avail(b) - avail(a))[0]; if (!src || avail(src) < 24) continue;
          }
          const e = S.isos.find(x => x.cat === 'EC' && x.slot >= 0); if (!e) break;
          job = { op: 'fill', x: e, o, k: src }; break;
        }
      }
      if (!job) continue;
      const x = job.x; isoUnslot(x); x.loc = c.id; c.iso = x; c.op = job.op; c.since = s; c.step = 'Lifting in'; c.state = 'Lifting'; c.until = s + 10;
      if (job.op === 'disch') { c.dst = job.k.id; c.src = null; c.rate = U(r, 20, 30); job.k.recv = x.id; ready.splice(ready.indexOf(x), 1); }
      else { const G = GRADE[job.o.code], heavy = G ? G.P.visc === 'H' || G.P.visc === 'X' : job.o.code === 'G1-BS150'; x.code = job.o.code; x.t = 0; x.mode = job.o.mode; x.due = job.o.due; x.order = job.o.id; job.o.iso = x.id; c.src = job.k.id; c.dst = null; c.rate = heavy ? U(r, 25, 35) : U(r, 40, 80); c.target = U(r, 20, 24) * .95 * densOf(x.code) * (r() < .01 ? .8 : 1); S.iso.orders.splice(S.iso.orders.indexOf(job.o), 1); }
    }
    // heating points, wash bays, repairs
    let heatUsed = 0; for (let i = HEAT0; i < HEAT1; i++) if (S.iso.slots[i] >= 0) heatUsed++; S.iso.heatUsed = heatUsed;
    S.iso.wash.forEach(w => {
      if (w.iso && s >= w.until) { const x = w.iso; w.iso = null; x.cat = 'EC'; isoPlace(x, s, false) || (x.loc = 'Off-site depot'); }
      if (!w.iso) { const x = S.isos.find(y => y.cat === 'ED' && y.slot >= 0); if (x) { isoUnslot(x); x.loc = w.id; w.iso = x; w.until = s + Math.round(U(r, 120, 180)); } }
    });
    S.isos.forEach(x => { if (x.cat === 'RP' && x.repairUntil != null && s >= x.repairUntil) { x.cat = 'EC'; x.repairUntil = null; } });
    // staging for departures and road moves
    const nextTrain = S.trains.filter(x => x.service !== 'ISO' && (x.state === 'Expected' || x.state === 'Shunting' || x.state === 'Inspection')).sort((a, b) => a.eta - b.eta)[0];
    const nextFeeder = S.vessels.filter(v => v.cls === 'FDR' && (v.state === 'Expected' || v.state === 'At anchorage' || v.state === 'Berthing' || v.state === 'Pre-operations')).sort((a, b) => a.eta - b.eta)[0];
    for (const x of S.isos) {
      if (x.cat !== 'FO' || x.slot < 0) continue;
      if (x.mode === 'rail' && nextTrain && nextTrain.eta - s < 240) { isoUnslot(x); x.loc = 'ICY rail staging'; }
      else if (x.mode === 'sea' && nextFeeder && nextFeeder.eta - s < 480) { isoUnslot(x); x.loc = 'ICY sea staging'; }
      else if (x.mode === 'road' && !x.pickup && x.due - s < 720) { x.pickup = true; truckJob(s + Math.round(U(r, 30, Math.max(60, x.due - s))), 'ISO', { pick: x.id }); }
    }
    // supplier empties going back by road
    S.isos.forEach(x => { if (x.cat === 'ER' && x.ret === 'road' && !x.pickup && x.slot >= 0) { x.pickup = true; truckJob(s + Math.round(U(r, 120, 1440)), 'ISO', { pick: x.id }); } });
    // C6: clean empties from the depot by road, suspended when the yard is nearly full
    const occ = S.isos.reduce((a, x) => a + (x.slot >= 0 ? 1 : 0), 0) / 250, ec = S.isos.reduce((a, x) => a + (x.cat === 'EC' && x.slot >= 0 ? 1 : 0), 0);
    if (occ < .86 && ec < 60 && r() < (60 - ec) / 12 * 5 / 60) truckJob(s + Math.round(U(r, 30, 180)), 'ISO', { drop: true });
    if (occ >= .9 && !S.iso.alarm) S.iso.alarm = alarm(s, occ >= .96 ? 'critical' : 'attention', 'ISO', 'ISO yard', `ISO yard ${Math.round(occ * 100)} % full — inbound empties diverted to the off-site depot`, 'Empty deliveries suspended', 'ISO yard supervisor');
    if (S.iso.alarm && occ < .86) { clear(S.iso.alarm, s, 'ISO yard supervisor', 'Yard back below 86 %.'); S.iso.alarm = null; }
  }

  // ── QC laboratory: 24 parallel test streams, 24/7 ──
  let nSmp = 0, smpDay = -1;
  const ENGINE = new Set(['AE', 'ME', 'MT', 'GE', 'TR']);
  const SMP_WAIT = [];   // queued
  const SMP_RUN = [];    // in test
  function labTat(type, code, r) {
    const G = GRADE[code];
    if (type === 'In-process') return U(r, 30, 45);
    if (type === 'Release') return G.P.fam === 'TB' ? U(r, 360, 480) : ENGINE.has(G.P.fam) ? U(r, 150, 210) : U(r, 120, 180);
    if (type === 'Grease') return U(r, 180, 240);
    if (type === 'Receipt' || type === 'Vessel parcel') return COMP[code] && COMP[code].kind === 'additive' ? U(r, 60, 90) : U(r, 90, 120);
    return 0;
  }
  function labSubmit(s, type, code, batch, src, by, cb) {
    const d = dayOf(s); if (d !== smpDay) { smpDay = d; nSmp = 0; }
    const id = `S-MLB-${ymd(s)}-${String(++nSmp).padStart(3, '0')}`, r = RS('smp|' + id);
    const smp = { id, type, code, batch, src, by, at: s, start: null, due: null, done: null, status: type === 'Retain' ? 'Retained' : 'Queued', tests: null, cb, tat: Math.round(labTat(type, code, r)), prio: type === 'In-process' ? 0 : type === 'Release' || type === 'Grease' ? 1 : 2 };
    S.samples.unshift(smp); S.today.samples++;
    if (type !== 'Retain') { let i = SMP_WAIT.length; while (i > 0 && SMP_WAIT[i - 1].prio > smp.prio) i--; SMP_WAIT.splice(i, 0, smp); }
    return smp;
  }
  function labTests(smp, r) {
    const G = GRADE[smp.code], bad = smp.fail ? smp.failAt : -1;
    let list = G ? qcSpecs(G) : inSpecs(smp.code);
    if (smp.type === 'In-process') list = list.filter(x => /Density|viscosity @ 100|viscosity @ 40|elements|Worked penetration/.test(x.prop)).slice(0, 3);
    return list.map((x, i) => ({ prop: x.prop, method: x.method, unit: x.unit, spec: x.spec, result: fmtRes(genResult(x, r, i === bad), x), status: i === bad ? 'Failed' : 'Passed' }));
  }
  function lab(s) {
    const r = RS('lab|' + s), cm = minOf(s), shiftChange = cm >= 360 && cm < 390 || cm >= 840 && cm < 870 || cm >= 1320 && cm < 1350;
    let down = 0; S.lab.instruments.forEach(x => { if (x.until != null && s >= x.until) { x.down = 0; x.until = null; if (x.alarm) { clear(x.alarm, s, 'Lab supervisor', `${x.label} back in service.`); x.alarm = null; } } down += x.down; });
    if (r() < 5 / (300 * 60) * 14) { const x = pick(r, S.lab.instruments); if (!x.down) { x.down = 1; x.until = s + Math.round(U(r, 120, 480)); x.alarm = alarm(s, 'attention', 'Lab', x.label, `${x.label} out of service — tests that need it wait`, 'Lab capacity reduced', 'Lab supervisor'); } }
    const cap = Math.max(4, Math.round(S.lab.cap * (shiftChange ? .7 : 1)) - down * 2);
    for (let i = SMP_RUN.length - 1; i >= 0; i--) {
      const smp = SMP_RUN[i]; if (s < smp.due) continue;
      SMP_RUN.splice(i, 1);
      const rr = RS('res|' + smp.id);
      const pFail = smp.type === 'Release' || smp.type === 'Grease' ? (smp.retest ? 0 : .03) : smp.type === 'In-process' ? .08 : smp.type === 'Receipt' ? .008 : 0;
      smp.fail = rr() < pFail; smp.tests = labTests(smp, rr); smp.failAt = smp.fail ? smp.tests.findIndex(x => x.status === 'Failed') : -1;
      if (smp.fail && smp.failAt < 0 && smp.tests.length) { smp.failAt = Math.floor(rr() * smp.tests.length); smp.tests = labTests(smp, RS('res2|' + smp.id)); }
      smp.status = smp.fail ? 'Failed' : 'Passed'; smp.done = s;
      const tat = s - smp.at; S.today.tatSum += tat; S.today.tatN++; S.today.tats.push(tat); if (tat > (smp.type === 'Release' && GRADE[smp.code] && GRADE[smp.code].P.fam === 'TB' ? 540 : 300)) S.today.late++;
      if (smp.type === 'Release' || smp.type === 'Grease') { S.today.rftN++; if (!smp.fail) S.today.rftPass++; }
      labDone(smp, s, rr);
    }
    while (SMP_RUN.length < cap && SMP_WAIT.length) { const smp = SMP_WAIT.shift(); smp.start = s; smp.due = s + Math.max(10, smp.tat - (s - smp.at) * .2); smp.status = 'In test'; SMP_RUN.push(smp); }
    // keep queued and in-test samples plus the most recent 220 completed ones
    let n = 0; for (let i = 0; i < S.samples.length; i++) { const x = S.samples[i]; if (x.status === 'Passed' || x.status === 'Failed' || x.status === 'Retained') { n++; if (n > 220) { S.samples.splice(i, 1); i--; } } }
  }
  function labDone(smp, s, r) {
    const cb = smp.cb; if (!cb) return;
    if (cb.kind === 'releaseTank') { const k = TK[cb.tank]; if (k && k.state === 'QC hold') { if (smp.fail) { k.state = 'QC hold'; k.q = 'On hold'; later(s + Math.round(U(r, 120, 360)), at => { k.state = 'Released'; k.q = 'Released'; k.since = at; log(at, 'info', 'Quality', k.id, `${k.id} released after re-sampling`); }); log(s, 'attention', 'Quality', k.id, `${smp.id} · ${smp.tests[smp.failAt].prop} outside specification for ${k.id} receipt — tank on hold, re-sampling`); } else { k.state = 'Released'; k.q = 'Released'; k.since = s; } } }
    else if (cb.kind === 'isoOK') { const x = S.isos.find(y => y.id === cb.iso); if (x) { if (smp.fail) { x.cat = 'RP'; x.qcFail = true; x.repairUntil = s + 2880; log(s, 'attention', 'ISO', x.id, `${x.id} rejected on receipt — ${smp.tests[smp.failAt].prop} outside the supplier certificate; returned to supplier`); } else x.qcOK = true; } }
    else if (cb.kind === 'inproc') { const b = S.batches.find(x => x.id === cb.batch); if (b) { b.ipc = smp.fail ? 'trim' : 'ok'; b.ipSample = smp.id; } }
    else if (cb.kind === 'releaseBatch') releaseBatch(cb, smp, s, r);
    else if (cb.kind === 'hopper') { const hp = S.grease.hoppers.find(x => x.id === cb.hopper); const b = S.batches.find(x => x.id === cb.batch); if (hp && hp.batch === cb.batch) { if (smp.fail) { hp.q = 'On hold'; log(s, 'attention', 'Grease', hp.id, `${smp.id} · ${smp.tests[smp.failAt].prop} outside specification — ${hp.id} on hold for re-work`); later(s + Math.round(U(r, 120, 240)), at => { if (hp.batch === cb.batch) { hp.q = 'Released'; hp.relAt = at; if (b) b.state = 'Released'; } }); if (b) b.state = 'On hold'; } else { hp.q = 'Released'; hp.relAt = s; if (b) { b.state = 'Released'; b.rel = s; } } } }
  }

  // ── blending: 3 in-line blenders, 10 automated batch blenders, 10 simple batch blenders ──
  let nBatch = 380;
  const BLD_BY = {}; S.blenders.forEach(b => { BLD_BY[b.id] = b; });
  const campaigns = []; // released low-runner batches waiting to be filled out: { code, tank, left: { fmt: kL } }
  const canBlend = (b, G) => b.fams.includes(G.P.fam) && b.segs.includes(G.P.seg) && (G.P.visc !== 'X' || b.heated) && !(b.id === 'SBB-07' && G.P.seg !== 'PAG') && !(b.id === 'SBB-08' && G.P.seg !== 'FG');
  const routeOf = G => ROUTES[G.P.route] || null;
  function flushMin(b, G) {
    if (!b.last) return 0; const L = GRADE[b.last]; if (!L || L.code === G.code) return 0;
    if (L.P.seg !== G.P.seg) return (L.P.seg === 'CLEAN' || G.P.seg === 'CLEAN') ? 45 : 35;
    return L.P.fam !== G.P.fam ? 25 : 15;
  }
  // dedicated tanks are refilled as one fill: batches from any eligible blenders run into the tank back to back and the
  // tank is released on one test at the end, so a single-tank grade is blocked for a few hours every few days only
  const fillRoom = k => k.fill ? k.fill.target - k.v0 - k.pIn - k.fill.pend : 0;
  function openFill(G, k, s) {
    const d = G.dens / 1000, gi = GI[G.code], pos = (relK[gi] + qcK[gi]) * d + wipT[gi];
    const minFill = G.P.route === 'ILB' || G.P.route === 'ILB3' ? 140 : 45; // an in-line run is worth starting from about 140 t
    k.fill = { target: Math.min(k.moc * .92, k.v0 + Math.max(3 * G.d - pos, minFill) / d), pend: 0, opened: s, lastBatch: s, batches: [], flowing: false };
    k.duty = 'Fill planned'; // stays in service until blended product starts to flow in
  }
  function fillFlow(k, s) { if (k.fill && !k.fill.flowing) { k.fill.flowing = true; k.state = 'Blending'; k.q = 'Awaiting test results'; k.since = s; } }
  function closeFill(k, s) {
    const f = k.fill; k.fill = null; k.duty = null;
    if (!f.batches.length || !f.flowing) { k.state = 'Released'; k.q = 'Released'; return; }
    k.state = 'QC hold'; k.q = 'Awaiting test results'; k.since = s;
    labSubmit(s, 'Release', k.code, f.batches[f.batches.length - 1], k.id, 'Fill complete', { kind: 'releaseBatch', batch: f.batches[f.batches.length - 1], tank: k.id, fill: f.batches.slice() });
    log(s, 'info', 'Blending', k.id, `${k.id} fill complete · ${f.batches.length} batch${f.batches.length > 1 ? 'es' : ''}, ${fmt((k.v0 - k.heel) * k.d, 0)} t awaiting release`);
  }
  function fillTanks(s) { // open fills for runners that are running low, close fills that are done
    for (const G of LIQG) {
      if (!G.runner) continue;
      const gi = GI[G.code], d = G.dens / 1000, ks = G.tanks.map(id => TK[id]);
      for (const k of ks) if (k.fill) { const busyIn = S.blenders.some(b => b.batch && b.batch.dst === k.id); if (!busyIn && k.fill.pend < .5 && (fillRoom(k) * d < 6 || s - k.fill.lastBatch > 180)) closeFill(k, s); }
      if (ks.some(k => k.fill)) continue;
      const pos = (relK[gi] + qcK[gi]) * d + wipT[gi];
      const c = ks.filter(k => k.state === 'Released').sort((a, b) => a.v0 - b.v0)[0]; if (!c) continue;
      const stockT = (c.v0 - c.heel) * d, capT = (c.moc - c.heel) * d;
      if (ks.length === 1 ? stockT < Math.max(1.3 * G.d, .15 * capT) : (pos < 2.6 * G.d && stockT < .35 * capT)) openFill(G, c, s);
    }
  }
  function dstFor(G, need) {
    if (G.runner) { for (const id of G.tanks) { const k = TK[id]; if (k.fill && fillRoom(k) >= Math.min(need, 25)) return k; } return null; }
    const pool = G.P.seg === 'FG' ? ['FG'] : G.P.seg === 'PAG' ? ['PAG'] : G.P.seg === 'SYN' || G.P.seg === 'CLEAN' ? ['SPEC', 'swing'] : ['swing'];
    for (const u of pool) { const k = FPT.find(x => x.use === u && x.free && x.state === 'Free'); if (k && k.moc - k.heel >= need + 2) return k; }
    return null;
  }
  function batchSteps(b, G, t, r, flush) {
    const vf = { L: .9, M: 1, H: 1.2, X: 1.5 }[G.P.visc] || 1, st = [];
    if (flush) st.push(['Flushing', flush]);
    if (b.type === 'ILB') { st.push(['Line-up & flush', Math.round(U(r, 15, 25))], ['Blending', Math.ceil(t / (b.size * G.dens / 1000) * 60)], ['Pigging', 10]); return st; }
    const heatWait = (b.heated || G.recipe.some(([c]) => c === 'G1-BS150' || (COMP[c] && COMP[c].kind === 'additive' && c !== 'AF-SIL'))) && r() < .1 * (S.night ? 2 : 1) * (S.weather.state !== 'Clear' ? 2 : 1);
    if (b.type === 'ABB') {
      st.push(['Charging base oils', Math.round(U(r, 30, 40))]); if (heatWait) st.push(['Waiting heat', Math.round(U(r, 20, 60))]);
      st.push(['Dosing additives', Math.round(U(r, 20, 30))], ['Mixing at 60 °C', Math.round(U(r, 45, 60) * vf)], ['In-process QC', 30], ['Transfer to tank', Math.round(U(r, 25, 35) * vf)], ['Drain & rinse', 10]);
    } else {
      st.push(['Charging', 45]); if (heatWait) st.push(['Waiting heat', Math.round(U(r, 20, 60))]);
      st.push(['Heating to 60–80 °C', Math.round(U(r, 60, 90))], ['Dosing additives', 30], ['Mixing', Math.round(90 * vf)], ['In-process QC', 45], ['Transfer to tank', Math.round(40 * vf)], ['Cleaning', Math.round(U(r, 30, 60))]);
    }
    return st;
  }
  function startBatch(b, G, k, t, s, r) {
    const id = `BLD-MLB-${yymm(s)}-${String(++nBatch).padStart(4, '0')}`, gi = GI[G.code];
    const comps = G.recipe.map(([c, pct]) => ({ c, pct, need: t * pct / 100, drawn: 0 }));
    const bt = { id, code: G.code, gi, product: G.P.name, grade: G.grade, fam: G.P.fam, blender: b.id, type: b.type, t, done: 0, charged: 0, dst: k.id, comps, start: s, eta: null, end: null, rel: null,
      state: 'In progress', step: null, steps: batchSteps(b, G, t, r, flushMin(b, G)), si: 0, stepAt: s, trim: false, ipc: null, sample: null, low: !G.runner };
    let tot = 0; bt.steps.forEach(([, m]) => { tot += m; }); bt.eta = s + tot;
    if (k.fill) { k.fill.pend += t / (G.dens / 1000); k.fill.lastBatch = s; k.fill.batches.push(id); k.batch = id; k.duty = b.id; }
    else { k.inBatch = id; if (k.free) { k.free = false; k.code = G.code; k.d = G.dens / 1000; k.dens15 = G.dens; } k.state = 'Blending'; k.q = 'Awaiting test results'; k.batch = id; k.since = s; k.duty = b.id; }
    b.batch = bt; b.state = 'Running'; b.since = s; b.last = G.code; b.waitSince = null;
    wipT[gi] += t; S.batches.unshift(bt); S.today.batches++;
    stepTo(b, bt, s);
    log(s, 'info', 'Blending', b.id, `${id} started on ${b.id} · ${G.label} · ${fmt(t, 1)} t into ${k.id}`);
  }
  function stepTo(b, bt, s) { const st = bt.steps[bt.si]; bt.step = st[0]; b.step = st[0]; bt.stepAt = s; b.stepUntil = s + st[1]; }
  function nextStep(b, bt, s, r) {
    bt.si++;
    if (bt.si >= bt.steps.length) return finishBatch(b, bt, s, r);
    stepTo(b, bt, s);
    if (bt.step === 'In-process QC') bt.sample = labSubmit(s, 'In-process', bt.code, bt.id, b.id, b.id, { kind: 'inproc', batch: bt.id }).id;
  }
  function cancelBatch(b, bt, s, why) {
    const k = TK[bt.dst]; wipT[bt.gi] = Math.max(0, wipT[bt.gi] - bt.t);
    if (k && k.fill) { k.fill.pend = Math.max(0, k.fill.pend - Math.max(0, bt.t - bt.done) / k.d); k.fill.batches = k.fill.batches.filter(x => x !== bt.id); }
    else if (k) { k.inBatch = null; if (k.v0 - k.heel < .5 && !k.dedicated) { k.state = 'Free'; k.free = true; } else { k.state = 'Released'; k.q = 'Released'; } k.duty = null; }
    bt.state = 'Cancelled'; bt.end = s; bt.step = 'Cancelled · ' + why; b.batch = null; b.state = 'Idle'; b.step = 'Idle'; b.stepUntil = null; b.waitSince = null;
    if (b.alarm) { clear(b.alarm, s, 'Blend supervisor', `${bt.id} cancelled — ${why}.`); b.alarm = null; }
    log(s, 'attention', 'Blending', b.id, `${bt.id} cancelled on ${b.id} · ${why}`);
  }
  function finishBatch(b, bt, s, r) {
    const k = TK[bt.dst]; wipT[bt.gi] = Math.max(0, wipT[bt.gi] - bt.t);
    bt.end = s; bt.state = 'QC hold'; bt.step = 'Awaiting release';
    b.batch = null; b.state = 'Idle'; b.step = 'Idle'; b.stepUntil = null; b.since = s;
    S.today.blendT += bt.done;
    if (k && k.fill) { k.fill.pend = Math.max(0, k.fill.pend - Math.max(0, bt.t - bt.done) / k.d); if (fillRoom(k) * k.d < 6 && k.fill.pend < .5 && !S.blenders.some(x => x.batch && x.batch.dst === k.id)) closeFill(k, s); }
    else { if (k) { k.inBatch = null; k.state = 'QC hold'; k.q = 'Awaiting test results'; k.since = s; k.duty = null; } bt.relSample = labSubmit(s, 'Release', bt.code, bt.id, bt.dst, b.id, { kind: 'releaseBatch', batch: bt.id, tank: bt.dst }).id; }
    log(s, 'info', 'Blending', b.id, `${bt.id} complete · ${fmt(bt.done, 1)} t in ${bt.dst}, awaiting release`);
  }
  function releaseBatch(cb, smp, s, r) {
    const bt = S.batches.find(x => x.id === cb.batch), k = TK[cb.tank]; if (!k) return;
    if (!smp.fail) {
      k.state = 'Released'; k.q = 'Released'; k.since = s; if (bt) { bt.state = 'Released'; bt.rel = s; bt.rft = !bt.refail; }
      if (cb.fill) S.batches.forEach(x => { if (cb.fill.includes(x.id) && x.state !== 'Released') { x.state = 'Released'; x.rel = s; x.rft = !x.refail; } });
      if (bt && bt.low) { // campaign: the batch is filled out by format; slivers under 4 kL join the largest format
        const G = GRADE[bt.code], left = {}; let tot = 0; FMTS.forEach((f, i) => { if (G.df[i] > 0 && f !== 'BLK') tot += G.df[i]; }); FMTS.forEach((f, i) => { if (G.df[i] > 0 && f !== 'BLK') left[f] = (k.v0 - k.heel) * G.df[i] / tot; });
        const big = Object.keys(left).sort((a, b) => left[b] - left[a])[0]; Object.keys(left).forEach(f => { if (f !== big && left[f] < 4) { left[big] += left[f]; left[f] = 0; } });
        campaigns.push({ code: bt.code, tank: k.id, left, at: s });
      }
      return;
    }
    const prop = smp.tests[smp.failAt] ? smp.tests[smp.failAt].prop : 'Test';
    const adj = r() < .8, until = s + Math.round(adj ? U(r, 180, 360) : U(r, 360, 720));
    k.state = adj ? 'Adjusting' : 'On hold'; k.q = 'On hold'; k.since = s; if (bt) { bt.state = adj ? 'Adjusting' : 'On hold'; bt.refail = true; }
    if (cb.fill) S.batches.forEach(x => { if (cb.fill.includes(x.id)) { x.state = adj ? 'Adjusting' : 'On hold'; x.refail = true; } });
    const e = alarm(s, 'attention', 'Blending', k.id, `${bt ? bt.id : k.id} failed release — ${prop} outside specification`, adj ? `${k.id} recirculating with trim, re-test due ${tm(until, 'WIB')}` : `${k.id} on hold for re-blend correction`, 'Quality officer · MLB');
    later(until, at => { if (k.state !== 'Adjusting' && k.state !== 'On hold') return; k.state = 'QC hold'; k.q = 'Awaiting test results'; clear(e, at, 'Quality officer', adj ? 'Trim added; re-test submitted.' : 'Correction blended in; re-test submitted.'); const sm = labSubmit(at, 'Release', k.code, bt ? bt.id : k.batch, k.id, 'Quality officer', { kind: 'releaseBatch', batch: bt ? bt.id : null, tank: k.id, fill: cb.fill }); sm.retest = true; if (bt) bt.state = 'QC hold'; });
  }
  function blendNeeds() {
    const out = [];
    for (const G of LIQG) {
      const gi = GI[G.code], dens = G.dens / 1000, pos = (relK[gi] + qcK[gi]) * dens + wipT[gi];
      if (G.runner) { let room = 0; for (const id of G.tanks) { const k = TK[id]; if (k.fill) room = Math.max(room, fillRoom(k)); } if (room * dens >= 4) out.push([G, Math.min(.95, (relK[gi] * dens + whT[gi] * .5) / (2.6 * G.d))]); } // released stock decides how urgent a fill is
      else { const tot = pos + whT[gi], rop = Math.max(6 * G.d, 4); if (tot < rop) out.push([G, .3 + tot / rop]); }
    }
    return out.sort((a, b) => a[1] - b[1]);
  }
  function blending(s) {
    const r = RS('bld|' + s);
    for (const b of S.blenders) {
      if (b.fault) { if (s >= b.fault.until) { clear(b.fault.alarm, s, 'Maintenance', `${b.id} back in service.`); b.fault = null; b.state = b.batch ? 'Running' : 'Idle'; } else continue; }
      if (b.pm) { if (s >= b.pm.until) { b.pm = null; b.state = 'Idle'; b.step = 'Idle'; log(s, 'info', 'Blending', b.id, `${b.id} planned maintenance complete`); } else continue; }
      const bt = b.batch; if (!bt) continue;
      b.busyMin += 5;
      const step = bt.step;
      if (b.type === 'ILB' && step === 'Blending') {
        if (r() < 5 / (80 * 60)) { b.fault = { until: s + Math.round(U(r, 15, 45)) }; b.fault.alarm = alarm(s, 'attention', 'Blending', b.id, `${b.id} dosing pump trip — in-line blend stopped`, `${bt.id} paused`, 'Blend operator · LOBP'); b.state = 'Fault'; continue; }
        const k = TK[bt.dst], d = GRADE[bt.code].dens / 1000, want = Math.min(b.size * d * 5 / 60, bt.t - bt.done, Math.max(0, ullage(k)) * d);
        let f = 1; for (const c of bt.comps) { const a = compAvailT(c.c); if (a < want * c.pct / 100) f = Math.min(f, a / (want * c.pct / 100)); }
        const q = want * Math.max(0, f);
        if (q > .01) { fillFlow(k, s); bt.comps.forEach(c => { c.drawn += drawComp(c.c, q * c.pct / 100, b.id); }); k.pIn += q / d; bt.done += q; bt.charged += q; b.state = 'Running'; if (k.fill) k.fill.pend = Math.max(0, k.fill.pend - q / d); }
        else { b.state = 'Waiting raw material'; b.waitSince = b.waitSince ?? s; }
        if (q < .01 && bt.done < 1 && s - (b.waitSince ?? s) > 120) { cancelBatch(b, bt, s, 'no raw material'); continue; }
        if (bt.done >= bt.t - .05 || (q < .01 && s - (b.waitSince ?? s) > 120)) { wipT[bt.gi] -= bt.t - bt.done; bt.t = bt.done; b.waitSince = null; nextStep(b, bt, s, r); }
        continue;
      }
      if (step === 'Charging base oils' || step === 'Charging' || step === 'Dosing additives') {
        const add = step === 'Dosing additives', slotsLeft = Math.max(1, Math.ceil((b.stepUntil - s) / 5));
        let short = false;
        bt.comps.forEach(c => { const isAdd = !(COMP[c.c] && COMP[c.c].kind === 'base'); if (isAdd !== add) return; const want = (c.need - c.drawn) / slotsLeft; if (want <= 0) return; const got = drawComp(c.c, want, b.id); c.drawn += got; bt.charged += got; if (got < want * .999) short = true; });
        if (short) { b.state = 'Waiting raw material'; b.waitSince = b.waitSince ?? s; b.stepUntil = Math.max(b.stepUntil, s + 5); if (!b.alarm && s - b.waitSince >= 60) b.alarm = alarm(s, 'attention', 'Blending', b.id, `${b.id} waiting raw material for ${bt.id} more than 60 min`, `${GRADE[bt.code].label}`, 'Blend supervisor'); continue; }
        b.state = 'Running'; if (b.alarm) { clear(b.alarm, s, 'Blend supervisor', 'Raw material available; charging resumed.'); b.alarm = null; } b.waitSince = null;
      }
      if (step === 'Transfer to tank') {
        const k = TK[bt.dst], d = GRADE[bt.code].dens / 1000, slotsLeft = Math.max(1, Math.ceil((b.stepUntil - s) / 5));
        const want = Math.max(0, (bt.charged - bt.done) / slotsLeft), q = Math.min(want, Math.max(0, ullage(k)) * d);
        if (q > 0) fillFlow(k, s); k.pIn += q / d; bt.done += q; if (k.fill) k.fill.pend = Math.max(0, k.fill.pend - q / d);
      }
      if (step === 'In-process QC') { if (!bt.ipc) { b.stepUntil = Math.max(b.stepUntil, s + 5); continue; } if (bt.ipc === 'trim' && !bt.trim) { bt.trim = true; bt.steps.splice(bt.si + 1, 0, ['Trim adjustment', Math.round(U(r, 40, 60))], ['Re-test', 30]); log(s, 'info', 'Blending', b.id, `${bt.id} in-process result off target — trim adjustment`); } }
      if (s >= b.stepUntil) { if (step === 'Transfer to tank' && bt.done < bt.charged - .05) { b.stepUntil = s + 5; continue; } nextStep(b, bt, s, r); }
    }
    // planned maintenance: each blender 12 h every 6 weeks, from 08:00
    if (minOf(s) === 480) S.blenders.forEach((b, i) => { if (!b.batch && !b.pm && (dayOf(s) + i * 2) % 42 === 0) { b.pm = { until: s + 720 }; b.state = 'Planned maintenance'; b.step = 'Planned maintenance'; log(s, 'info', 'Blending', b.id, `${b.id} planned maintenance 08:00–20:00`); } });
    // new batches for idle blenders, most urgent grades first
    gradeStocks(); fillTanks(s);
    const idle = S.blenders.filter(b => !b.batch && !b.fault && !b.pm);
    if (!idle.length) return;
    const needs = blendNeeds(); if (!needs.length) { idle.forEach(b => { b.state = 'Idle'; b.step = 'Idle'; }); return; }
    for (const b of idle) {
      let done = false;
      for (const [G, u] of needs) {
        if (!canBlend(b, G)) continue;
        const rt = routeOf(G);
        if (b.type === 'ILB') { // in-line runs: the product's route, or a large fill of a batch-route grade the in-line blender can make
          if (!G.runner) continue; const fk = G.tanks.map(id => TK[id]).find(k => k.fill);
          if (!(rt && rt.includes(b.id)) && !(G.P.route === 'ABB' && fk && fillRoom(fk) * G.dens / 1000 >= 90)) continue;
        }
        if (rt && !rt.includes(b.id) && b.type !== 'ILB') { if (u > .85) continue; const alt = rt.some(id => { const x = BLD_BY[id]; return !x.batch && !x.fault && !x.pm && (x.type !== 'ILB' || G.runner) && canBlend(x, G); }); if (alt) continue; }
        const d = G.dens / 1000, gi = GI[G.code];
        let t = b.type === 'ILB' ? 330 : b.size * U(r, .85, .95) * d;
        const k = dstFor(G, Math.min(t, 40) / d); if (!k) continue;
        t = Math.min(t, (k.fill ? fillRoom(k) : k.moc - k.v0 - k.pIn) * d * .98); if (t < (b.type === 'ILB' ? 40 : 4)) continue;
        if (G.recipe.some(([c, p]) => compAvailT(c) < t * p / 100 * .6)) { G.rmWait = G.rmWait ?? s; continue; }
        G.rmWait = null; startBatch(b, G, k, Math.round(t * 10) / 10, s, r); done = true;
        const i = needs.findIndex(x => x[0] === G); if (!G.runner || fillRoom(k) * d < 4) needs.splice(i, 1);
        break;
      }
      if (!done) { b.state = 'Idle'; b.step = 'Idle'; }
    }
  }
  // swing tanks empty out after their campaign and are cleaned for the next product
  function swingTanks(s, r) {
    for (const k of FPT) {
      if (k.dedicated) continue;
      if (k.state === 'Cleaning') { if (s >= k.cleanUntil) { k.state = 'Free'; k.status = 'Free'; k.free = true; k.batch = null; k.since = s; } continue; }
      if (k.state === 'Released' && !k.free && !k.inBatch && k.v0 - k.heel < .5 && k.pOut === 0) {
        const rest = Math.max(0, k.v0 - k.pOut); if (rest > 0) { k.pOut += rest; const sl = AUXT.filter(x => x.code === 'SLOP' || x.code === 'REWORK').sort((a, b) => ullage(b) - ullage(a))[0]; sl.pIn += Math.min(rest, Math.max(0, ullage(sl))); S.today.slopT += rest * k.d; }
        k.state = 'Cleaning'; k.q = 'Released'; k.cleanUntil = s + Math.round(U(r, 75, 150)); k.since = s; k.duty = null;
        const ci = campaigns.findIndex(c => c.tank === k.id); if (ci >= 0) campaigns.splice(ci, 1);
      }
    }
    // slop goes to the re-refiner by road tanker when a slop tank is two-thirds full
    AUXT.forEach(k => { if (k.code === 'SLOP' && k.v0 > k.nominal * .66 && !k.slopOut) { k.slopOut = true; truckJob(s + Math.round(U(r, 60, 360)), 'BLK', { slop: k.id }); } });
  }

  // ── grease plant: 3 contactors, 2 open kettles, 6 finishing kettles, 2 homogenisers, 4 holding hoppers ──
  const GUNITS = {}; S.grease.units.forEach(u => { GUNITS[u.id] = u; });
  const greaseRoute = G => G.P.route === 'LIX' ? 'CT' : G.P.route === 'LI' ? 'CT' : 'OK';
  function greaseSteps(G, kind, r) {
    if (kind === 'Contactor') return [['Charging', 40], ['Saponification', 150], ...(G.P.route === 'LIX' ? [['Complexing at 220 °C', 90]] : []), ['Dehydration at 200 °C', 60], ['Transfer to finishing kettle', 30], ['Turnaround', 20]];
    if (kind === 'Open kettle') return [['Charging', 60], ['Reaction', 600], ['Finishing', 240], ['Transfer to hopper', 60]];
    return [['Cut-back & cooling', 150], ['Additives', 40], ['Consistency check', 60], ['Milling & deaeration to hopper', 210]];
  }
  function greaseNeeds() {
    const out = [];
    for (const G of GRSG) {
      const gi = GI[G.code]; let hop = 0; S.grease.hoppers.forEach(h => { if (h.code === G.code) hop += h.t; });
      const pos = hop + wipT[gi] + whT[gi], rop = Math.max(6 * G.d, 6);
      if (pos < rop) out.push([G, pos / rop]);
    }
    return out.sort((a, b) => a[1] - b[1]);
  }
  function grease(s) {
    const r = RS('grs|' + s), units = S.grease.units, hops = S.grease.hoppers;
    hops.forEach(h => { if (h.code && h.t < .05 && (h.q === 'Released' || h.q === 'Empty')) { h.code = null; h.batch = null; h.q = 'Empty'; h.t = 0; } });
    const freeHopper = G => hops.find(h => h.code === G.code && h.q === 'Released' && h.t < 2) || hops.find(h => !h.code || (h.t < .05 && !h.batch));
    for (const u of units) {
      if (u.fault) { if (s >= u.fault.until) { clear(u.fault.alarm, s, 'Maintenance', `${u.id} back in service.`); u.fault = null; } else continue; }
      if (!u.batch && u.keep) { if (s >= u.stepUntil) { u.keep = null; u.state = 'Idle'; u.step = 'Idle'; u.stepUntil = null; } continue; }
      const bt = u.batch; if (!bt) continue;
      if (s < u.stepUntil) continue;
      const G = GRADE[bt.code];
      if (u.step === 'Transfer to finishing kettle') {
        const fk = units.find(x => x.kind === 'Finishing kettle' && !x.batch && !x.fault);
        if (!fk) { u.state = 'Waiting finishing kettle'; u.stepUntil = s + 5; continue; }
        fk.batch = bt; bt.fk = fk.id; fk.steps = greaseSteps(G, fk.kind, r); fk.si = 0; fk.step = fk.steps[0][0]; fk.stepUntil = s + fk.steps[0][1]; fk.state = 'Running'; fk.since = s;
        u.si++; u.step = u.steps[u.si][0]; u.stepUntil = s + u.steps[u.si][1]; u.state = 'Turnaround'; u.batch = null; u.keep = bt.id; continue;
      }
      if (u.step === 'Turnaround') { u.state = 'Idle'; u.step = 'Idle'; u.stepUntil = null; u.keep = null; continue; }
      if (u.step === 'Consistency check' && !bt.trimmed && r() < .08) { bt.trimmed = true; u.steps.splice(u.si + 1, 0, ['Adjusting consistency', Math.round(U(r, 120, 240))]); log(s, 'info', 'Grease', u.id, `${bt.id} off consistency — adjusting`); }
      if (u.step === 'Milling & deaeration to hopper' || u.step === 'Transfer to hopper') {
        if (!bt.hopper) {
          let hp = freeHopper(G);
          if (!hp && u.state === 'Waiting hopper' && s - (u.waitSince ?? s) >= 30) { // clear a remnant: fill it out into drums or pails
            const rem = hops.filter(h => h.code && h.q === 'Released' && h.t < 2).sort((a, b) => a.t - b.t)[0];
            if (rem) { const ks = (skuOf[GI[rem.code]] || []).sort((a, b) => b.size - a.size), k = ks[0]; if (k) { whAdd(k, Math.floor(rem.t * 1000 / k.size)); S.today.pkgT += rem.t; S.today.out += rem.t; } log(s, 'info', 'Grease', rem.id, `${rem.id} remnant ${fmt(rem.t, 1)} t ${(GRADE[rem.code] || {}).short || rem.code} filled out into ${k ? k.label.toLowerCase() + 's' : 'drums'} to free the hopper`); rem.code = null; rem.batch = null; rem.q = 'Empty'; rem.t = 0; hp = rem; }
          }
          if (!hp || S.grease.aux.filter(x => x.kind === 'Homogeniser' && !x.fault).length === 0) { if (u.state !== 'Waiting hopper') u.waitSince = s; u.state = 'Waiting hopper'; u.stepUntil = s + 5; continue; }
          u.waitSince = null; hp.code = G.code; hp.batch = bt.id; hp.q = 'Awaiting test results'; hp.since = s; bt.hopper = hp.id; hp.t += bt.t; S.today.greaseT += bt.t; }
        bt.state = 'QC hold'; bt.end = s; wipT[bt.gi] = Math.max(0, wipT[bt.gi] - bt.t);
        labSubmit(s, 'Grease', bt.code, bt.id, bt.hopper, u.id, { kind: 'hopper', hopper: bt.hopper, batch: bt.id });
        u.batch = null; u.state = 'Idle'; u.step = 'Idle'; u.stepUntil = null; u.since = s; continue;
      }
      u.si++; if (u.si >= u.steps.length) { u.batch = null; u.state = 'Idle'; u.step = 'Idle'; continue; }
      u.step = u.steps[u.si][0]; u.stepUntil = s + u.steps[u.si][1]; u.state = 'Running';
      if (u.step === 'Additives') drawComp('DI-GRS', bt.t * .03, u.id);
    }
    // homogeniser and deaerator status follow the finishing kettles
    const milling = units.filter(x => x.batch && x.step === 'Milling & deaeration to hopper').length;
    S.grease.aux.forEach((x, i) => { if (x.kind === 'Homogeniser' || x.kind === 'Deaerator') x.state = x.fault ? 'Fault' : (i % 2) < milling ? 'Running' : 'Idle'; });
    if (r() < 5 / (150 * 60) * 2) { const x = pick(r, S.grease.aux.filter(y => y.kind === 'Homogeniser' && !y.fault)); if (x) { x.fault = { until: s + Math.round(U(r, 60, 180)) }; x.fault.alarm = alarm(s, 'attention', 'Grease', x.id, `${x.id} homogeniser fault — finishing queue grows`, 'Milling capacity halved', 'Grease plant supervisor'); later(x.fault.until, at => { clear(x.fault && x.fault.alarm, at, 'Maintenance', `${x.id} repaired.`); x.fault = null; }); } }
    // new grease batches
    const needs = greaseNeeds(); if (!needs.length) return;
    for (const u of units) {
      if (u.batch || u.keep || u.fault || u.kind === 'Finishing kettle') continue;
      const want = u.kind === 'Contactor' ? 'CT' : 'OK';
      const it = needs.find(([G]) => greaseRoute(G) === want); if (!it) continue;
      const G = it[0], gi = GI[G.code], t = u.size * U(r, .9, 1);
      const base = G.recipe.filter(([c]) => COMP[c] && COMP[c].kind === 'base');
      if (base.some(([c, p]) => compAvailT(c) < t * p / 100)) continue;
      G.recipe.forEach(([c, p]) => { if (c !== 'DI-GRS') drawComp(c, t * p / 100, u.id); });
      const id = `BLD-MLB-${yymm(s)}-${String(++nBatch).padStart(4, '0')}`;
      const bt = { id, code: G.code, gi, product: G.P.name, grade: G.grade, fam: 'GR', blender: u.id, type: u.kind === 'Contactor' ? 'Grease · contactor' : 'Grease · open kettle', t: Math.round(t * 10) / 10, done: Math.round(t * 10) / 10, start: s, state: 'In progress', grease: true, comps: G.recipe.map(([c, pct]) => ({ c, pct })) };
      u.batch = bt; u.steps = greaseSteps(G, u.kind, r); u.si = 0; u.step = u.steps[0][0]; u.stepUntil = s + u.steps[0][1]; u.state = 'Running'; u.since = s;
      let tot = 0; u.steps.forEach(([, m]) => { tot += m; }); bt.eta = s + tot + (u.kind === 'Contactor' ? 460 : 0); bt.step = u.step;
      wipT[gi] += bt.t; S.batches.unshift(bt); S.today.batches++;
      needs.splice(needs.indexOf(it), 1);
      log(s, 'info', 'Grease', u.id, `${id} started on ${u.id} · ${G.label} · ${fmt(bt.t, 1)} t`);
      if (!needs.length) break;
    }
    S.batches.forEach(bt => { if (bt.grease && bt.state === 'In progress') { const u = units.find(x => x.batch === bt); if (u) bt.step = `${u.id} · ${u.step}`; } });
  }

  // ── packaging materials (C7: deliveries keep 1–3 days of cover) ──
  const MAT = {
    bottles: ['1 L bottles (blow-moulded)', 'pcs', 70000, 0], cans: ['4/5 L cans (blow-moulded)', 'pcs', 30000, 0], resin: ['HDPE resin', 't', 400, 25],
    pails: ['18/20 L pails', 'pcs', 160000, 3600], drums: ['209 L drums', 'pcs', 32000, 300], ibcs: ['1,000 L IBCs', 'pcs', 1300, 60],
    gpacks: ['Grease cartridges & tubs', 'pcs', 260000, 40000], gdrums: ['Grease pails & drums', 'pcs', 9000, 1200],
    labels: ['Labels', 'pcs', 900000, 250000], caps: ['Caps & bungs', 'pcs', 700000, 200000], cartons: ['Cartons', 'pcs', 60000, 15000],
    pallets: ['Pallets', 'pcs', 15000, 500], film: ['Stretch film', 'rolls', 2400, 600],
  };
  const USE = { B1: { bottles: 1, caps: 1, labels: 1, cartons: 1 / 12 }, B4: { cans: 1, caps: 1, labels: 1, cartons: .25 }, B5: { cans: 1, caps: 1, labels: 1, cartons: .25 }, P18: { pails: 1, caps: 1, labels: 1 }, P20: { pails: 1, caps: 1, labels: 1 }, D209: { drums: 1, caps: 2, labels: 1 }, IBC: { ibcs: 1, labels: 2 }, G04: { gpacks: 1, labels: 1, cartons: 1 / 24 }, G05: { gpacks: 1, labels: 1, cartons: 1 / 24 }, G5: { gpacks: 1, labels: 1 }, G16: { gdrums: 1, labels: 1 }, G180: { gdrums: 1, labels: 1 } };
  const matUse = {}; Object.keys(MAT).forEach(m => { matUse[m] = 0; });
  SKUS.forEach(k => { const u = USE[k.pk] || {}; Object.entries(u).forEach(([m, x]) => { matUse[m] += k.dU * x; }); matUse.pallets += k.dPal; matUse.film += k.dPal / 25; });
  matUse.resin = matUse.bottles * .045 / 1000 + matUse.cans * .18 / 1000;
  const MS = S.materials; Object.entries(MAT).forEach(([id, [label, unit, cap, load]]) => { MS[id] = { id, label, unit, cap, load, stock: 0, useD: matUse[id] || 0, coverH: 0, late: 0 }; });
  const MAT_TRUCKS = Object.values(MS).reduce((a, m) => a + (m.load ? m.useD / m.load : 0), 0) + 6; // + additive drums and grease raws
  S.blow = Array.from({ length: 8 }, (_, i) => ({ id: 'BM-' + pad(i + 1), makes: i < 4 ? 'bottles' : 'cans', rate: i < 4 ? 2800 : 1500, state: 'Running', fault: null }));
  function blowMoulding(s, r) {
    for (const m of S.blow) {
      if (m.fault) { if (s >= m.fault.until) { clear(m.fault.alarm, s, 'Maintenance', `${m.id} back in production.`); m.fault = null; } else { m.state = 'Fault'; continue; } }
      if (r() < 5 / (120 * 60)) { m.fault = { until: s + Math.round(U(r, 60, 180)) }; m.fault.alarm = alarm(s, 'attention', 'Filling', m.id, `${m.id} blow moulder down — ${m.makes === 'bottles' ? '1 L bottle' : '4/5 L can'} buffer draining`, `${m.makes === 'bottles' ? 'PL-01/02' : 'PL-03..06'} starve when the 6 h buffer runs out`, 'Blow-moulding technician'); m.state = 'Fault'; continue; }
      const M = MS[m.makes], room = M.cap - M.stock, q = Math.min(room, m.rate * 5 / 60), resin = q * (m.makes === 'bottles' ? .045 : .18) / 1000;
      if (q < 1 || MS.resin.stock < resin) { m.state = room < 1 ? 'Buffer full' : 'Starved – resin'; continue; }
      M.stock += q; MS.resin.stock -= resin; m.state = 'Running';
    }
  }
  const matCover = m => m.useD > 0 ? m.stock / (m.useD / 24) : 999;
  const booked = {};
  function bookMaterials(s, r) { // C7: book deliveries so every material keeps more than 40 h of cover; 8 % arrive 2–6 h late
    for (const m of Object.values(MS)) {
      if (!m.load) continue;
      while ((m.stock + (booked[m.id] || 0)) / Math.max(1e-6, m.useD / 24) < 40 && (m.stock + (booked[m.id] || 0)) < m.cap) {
        booked[m.id] = (booked[m.id] || 0) + m.load; const late = r() < .08 ? U(r, 120, 360) : 0;
        truckJob(dayWindow(s + Math.round(U(r, 90, 300)), r) + Math.round(late), 'MAT', { mat: m.id, qty: m.load, late: late > 0 });
      }
    }
    for (const c of [...DRUM_STORE, ...BAG_STORE]) { const use = useT[c] || .2; if ((STORE[c] + (booked[c] || 0)) / use < 10) { booked[c] = (booked[c] || 0) + 18; truckJob(dayWindow(s + Math.round(U(r, 120, 480)), r), 'MAT', { store: c, t: 18 }); } }
  }
  function dayWindow(at, r) { // suppliers deliver into the 07:00–18:00 receiving window
    const cm = minOf(at); if (cm >= 420 && cm < 1080) return at;
    return at + ((420 - cm + 1440) % 1440) + Math.round(r() * 240);
  }

  // ── filling lines ──
  const PKG_SHARE = { road: .513, rail: .181, sea: .306 };
  S.lines.forEach((l, li) => {
    l.idx = li; l.skus = SKUS.filter(k => k.fmt === l.fmt && l.fams.includes(k.G.P.fam) && l.segs.includes(k.G.P.seg) && (k.G.P.visc !== 'X' || l.heated)).map(k => k.i);
    l.zone = l.skus.length ? SKUS[l.skus[0]].zone : 'HBW'; l.breakGrp = /^PL-0[1-5]$/.test(l.id) ? 0 : 1 + (li % 2);
  });
  { // planned load per line (most-constrained first water filling) → level-loading ratio ρ
    const capU = l => l.rate * l.oee * 24, load = new Float64Array(S.lines.length);
    const jobs = SKUS.map(k => ({ k, ls: S.lines.filter(l => l.skus.includes(k.i)) })).filter(j => j.ls.length).sort((a, b) => a.ls.length - b.ls.length);
    for (const j of jobs) { const vf = { H: .8, X: .6 }[j.k.G.P.visc] || 1, u = j.k.dU / vf / (PACK_RATE[j.k.pk] || 1); for (let c = 0; c < 20; c++) { let best = j.ls[0], bl = 1e9; for (const l of j.ls) { const v = load[l.idx] / capU(l); if (v < bl) { bl = v; best = l; } } load[best.idx] += u / 20; } }
    S.lines.forEach(l => { l.planU = load[l.idx]; l.rho = clamp(load[l.idx] / (l.rate * .91 * 24) / .88, .05, .98); });
  }
  let nWo = 1100;
  const lineCover = l => { let st = 0, d = 0; for (const i of l.skus) { st += whU[i]; d += SKUS[i].dU; } return d ? st / d : 99; };
  const relFor = (G) => G.P.fam === 'GR' ? relG[GI[G.code]] : gradeAvailK(G.code);
  function coMin(l, G, pk) {
    const L = l.last; if (!L) return 15; const LG = GRADE[L.code];
    if (l.fmt === 'IBC') return LG.code === G.code ? 5 : LG.P.seg === G.P.seg ? 15 : 30; // IBC stations swap the fill lance and flush one hose
    let m = LG.code === G.code ? 5 : (LG.P.fam === G.P.fam && LG.P.seg === G.P.seg) ? 20 : LG.P.seg === G.P.seg ? 35 : (LG.P.seg === 'CLEAN' || G.P.seg === 'CLEAN') ? 75 : 50;
    if (l.segs.length === 1 && l.segs[0] === 'FG' && LG.code !== G.code) m = Math.max(m, 90);
    if (L.pk !== pk) m += { S1: 45, S4: 45, P20: 30, D209: 20 }[l.fmt] || 15;
    if (G.P.visc === 'H' || G.P.visc === 'X') m += 15;
    return m;
  }
  const resK = new Float64Array(NG); // released product reserved by open work orders (kL; t for grease)
  const perUnit = k => k.unitT / (k.G.P.fam === 'GR' ? 1 : k.G.dens / 1000);
  function reserveRecalc() { resK.fill(0); for (const l of S.lines) if (l.wo && !l.wo.campaign) { const k = SKUS[l.wo.sku]; resK[k.gi] += Math.max(0, l.wo.units - l.wo.done) * perUnit(k); } }
  function pickWO(l, s, r) {
    // 1. campaigns: released low-runner batches are filled out first; each work order reserves its share
    for (const c of campaigns) {
      const left = c.left[l.fmt] || 0; const gi = GI[c.code];
      const ks = l.skus.filter(i => SKUS[i].gi === gi); if (!ks.length) continue;
      const k = SKUS[ks[Math.floor(r() * ks.length)]], per = perUnit(k);
      if (left < Math.min(per * l.rate * l.oee, 4)) continue;
      const units = Math.max(1, Math.min(Math.floor(left / per), Math.ceil(l.rate * l.oee * 9)));
      c.left[l.fmt] = Math.max(0, left - units * per);
      return { k, units, campaign: c };
    }
    // 2. lowest relative cover with released, unreserved product; the current family and class are preferred (campaign rule)
    let best = null, bs = 1e9, minCov = 1e9, minBatch = 1e9;
    for (const i of l.skus) {
      const k = SKUS[i], G = k.G, tgt = WH_TGT[k.zone], cov = whU[i] / (k.dU * tgt);
      if (G.runner) { if (cov < minCov) minCov = cov; }                                                      // a runner out of stock is a shortage
      else if ((wipT[k.gi] > 0 || relFor(G) > 0 || (G.P.fam === 'GR' && S.grease.hoppers.some(h => h.code === G.code))) && cov < minBatch) minBatch = cov; // a batch in process
      const avl = relFor(G) - resK[k.gi], hour = l.rate * l.oee * perUnit(k);
      if (avl < hour * 3 && !(cov < .3 && avl > hour)) continue; // a run is planned for at least 3 h of released product
      let sc = cov; // the planner groups runs: same pack, then same grade, then same family and class
      if (l.last) { const LG = GRADE[l.last.code]; if (l.last.pk === k.pk) sc *= .8; if (LG.code === G.code) sc *= .8; else if (LG.P.fam === G.P.fam && LG.P.seg === G.P.seg) sc *= .9; }
      if (sc < bs) { bs = sc; best = k; }
    }
    l.minCov = minCov; l.minBatch = minBatch;
    if (!best || bs > 1.6) return null;
    const per = perUnit(best), avl = relFor(best.G) - resK[best.gi];
    const hrs = U(r, 6, 12), want = clamp(best.dU * WH_TGT[best.zone] * 1.35 - whU[best.i], l.rate * l.oee * 5, l.rate * l.oee * hrs);
    const units = Math.max(1, Math.floor(Math.min(want, avl * .95 / per)));
    resK[best.gi] += units * per;
    return { k: best, units };
  }
  function drawGrease(code, t, who) {
    let left = t; for (const h of S.grease.hoppers) { if (h.code !== code || h.q !== 'Released' || h.t <= 0) continue; const q = Math.min(left, h.t); h.t -= q; left -= q; if (left <= 1e-6) break; }
    return t - left;
  }
  function hourBucket(l, s) { const hn = Math.floor(s / 60), i = ((hn % 48) + 48) % 48; if (l.hbN !== hn) { if (l.hbI !== i) { for (let j = 0; j < 5; j++) l.hb[i * 5 + j] = 0; } l.hbN = hn; l.hbI = i; } return i * 5; }
  function lines(s) {
    const r = RS('lin|' + s), cm = minOf(s), hourTick = cm % 60 === 0; reserveRecalc();
    const handover = cm >= 360 && cm < 375 || cm >= 840 && cm < 855 || cm >= 1320 && cm < 1335;
    const brk = g => g === 0 ? 0 : (g === 1 ? (cm >= 690 && cm < 720) || (cm >= 1050 && cm < 1065) || (cm >= 90 && cm < 105) : (cm >= 720 && cm < 750) || (cm >= 1080 && cm < 1095) || (cm >= 120 && cm < 135));
    const scDown = S.warehouse.cranes.filter(c => c.fault).length;
    const fill = { HBW: zonePal.HBW / WH_CAP.HBW, DRM: zonePal.DRM / WH_CAP.DRM };
    const peakDock = S.bays.filter(b => b.cls === 'PKG' && b.state !== 'Free').length > 48;
    for (const l of S.lines) {
      const uF = r(), uR = r(), uQ = r(); // three draws per line per slot keep the stream aligned
      const hb = hourBucket(l, s);
      if (hourTick) { const cov = lineCover(l) / WH_TGT[l.zone]; l.phi = clamp(l.rho * (1 + 1.2 * (1 - cov)), .1, 1); }
      // planned maintenance: each line 8 h every 4 weeks from 06:00, rotating
      if (cm === 360 && !l.pm && (dayOf(s) + l.idx * 3) % 28 === 0) { l.pm = { until: s + 480 }; setLine(l, 'Planned maintenance', s, s + 480); log(s, 'info', 'Filling', l.id, `${l.id} planned maintenance 06:00–14:00`); }
      if (l.pm) { if (s < l.pm.until) continue; l.pm = null; setLine(l, 'Idle – no orders', s); }
      l.hb[hb] += 5; S.today.planMin += 5;
      if (l.state === 'Fault' || l.state === 'Jam' || l.state === 'Changeover') {
        if (s < l.until) { if (l.state === 'Changeover') S.today.coMin += 5; continue; }
        if (l.fault) { clear(l.fault, s, 'Line technician', `${l.id} repaired after ${dur(s - l.fault.since)}.`); l.fault = null; }
        setLine(l, 'Ready', s);
      }
      if (!l.wo || l.wo.done >= l.wo.units) {
        if (l.wo) closeWO(l, s, 'Done');
        const w = pickWO(l, s, r);
        if (!w) { const st = l.minCov < .7 ? 'Starved – no released product' : l.minBatch < .7 ? 'Waiting – batch in process' : 'Idle – no orders'; setLine(l, st, s); if (st !== 'Starved – no released product') l.hb[hb] -= 5; continue; }
        openWO(l, w, s);
        const co = coMin(l, w.k.G, w.k.pk); l.coToday += co;
        if (co > 5 || !l.last) { const prev = l.last; setLine(l, 'Changeover', s, s + co + 10); S.today.coMin += 5; if (prev && prev.code !== w.k.G.code) { const fl = (co >= 75 ? 400 : co >= 50 ? 300 : co >= 35 ? U(r, 150, 300) : U(r, 60, 150)) * .3 / 1000; const sl = AUXT.find(x => x.code === 'SLOP') ; if (sl && ullage(sl) > fl) { sl.pIn += fl; S.today.slopT += fl * .88; } } l.last = { code: w.k.G.code, pk: w.k.pk }; continue; }
        l.last = { code: w.k.G.code, pk: w.k.pk };
      }
      const k = SKUS[l.wo.sku], G = k.G, camp = !!l.wo.campaign;
      // C4 level loading: credit accrues at φ per minute; a running slot costs 5
      l.credit = Math.min(240, l.credit + l.phi * 5);
      if (l.credit < 0 && !camp) { setLine(l, 'Idle – no orders', s); l.hb[hb] -= 5; continue; }
      if (lineCover(l) > 1.6 * WH_TGT[l.zone] && !camp) { setLine(l, 'Idle – no orders', s); l.hb[hb] -= 5; continue; }
      if (brk(l.breakGrp) && l.fmt !== 'IBC') { setLine(l, 'Break', s); continue; }
      if (S.gridDown && l.idx % 10 < 7) { setLine(l, 'Stopped – power', s); continue; }
      if (uF < 5 / (45 * 60)) { const m = Math.round(25 + 95 * uR * uR); setLine(l, 'Fault', s, s + m); l.fault = m > 60 ? alarm(s, 'attention', 'Filling', l.id, `${l.id} breakdown — ${pick(r, ['filler valve', 'capper torque', 'labeller', 'conveyor', 'check-weigher', 'palletiser infeed'])}`, `${l.wo.label} stopped`, 'Line technician') : { since: s, status: 'Open', soft: true }; if (l.fault.soft) l.fault = null; continue; }
      if (uF > 1 - 1 / 90) { setLine(l, 'Jam', s, s + 5 + Math.round(uR * 10)); continue; }
      if (fill[l.zone] > .97 || (l.zone === 'HBW' && scDown >= 3)) { setLine(l, 'Blocked – warehouse', s); continue; }
      const use = USE[k.pk] || {}; let shortM = null; for (const m in use) if (MS[m].stock < use[m] * 50) { shortM = m; break; }
      if (shortM) { setLine(l, 'Starved – ' + MS[shortM].label.toLowerCase(), s); if (!l.starvedSince) l.starvedSince = s; if (!l.alarm && s - l.starvedSince >= 30) l.alarm = alarm(s, 'attention', 'Filling', l.id, `${l.id} starved of ${MS[shortM].label.toLowerCase()} more than 30 min`, 'Delivery called forward', 'Warehouse supervisor'); continue; }
      const vf = { H: .8, X: .6 }[G.P.visc] || 1, perf = .86 + uQ * .10;
      let units = Math.min(l.wo.units - l.wo.done, l.rate * (PACK_RATE[k.pk] || 1) * 5 / 60 * perf * vf * (handover ? .7 : 1) * (peakDock && l.zone === 'HBW' ? 1 : 1));
      const perU = k.unitT / (G.P.fam === 'GR' ? 1 : G.dens / 1000); // kL (or t of grease) per unit
      const got = G.P.fam === 'GR' ? drawGrease(G.code, units * perU, l.id) : drawGrade(G.code, units * perU, l.id);
      if (got < units * perU * .999) units = Math.floor(got / perU);
      if (units < 1) { setLine(l, 'Starved – no released product', s); if (!l.starvedSince) l.starvedSince = s; if (s - l.starvedSince > 30) closeWO(l, s, 'Short-closed'); continue; }
      if (l.alarm) { clear(l.alarm, s, 'Line supervisor', `${l.id} running again.`); l.alarm = null; }
      l.starvedSince = null; setLine(l, 'Running', s);
      const rej = Math.round(units * (.004 + uR * .008)), good = units - rej;
      l.wo.done += units; l.wo.good += good; l.credit -= 5;
      whAdd(k, good); const t = good * k.unitT;
      S.today.pkgT += t; S.today.out += t; S.today.units += good; S.today.palIn += good / k.perPal; S.today.runMin += 5; l.unitsToday += good; l.tToday += t;
      for (const m in use) MS[m].stock = Math.max(0, MS[m].stock - use[m] * units);
      MS.pallets.stock = Math.max(0, MS.pallets.stock - good / k.perPal); MS.film.stock = Math.max(0, MS.film.stock - good / k.perPal / 25);
      l.hb[hb + 1] += 5; l.hb[hb + 2] += l.rate * (PACK_RATE[k.pk] || 1) * vf * 5 / 60; l.hb[hb + 3] += units; l.hb[hb + 4] += good;
    }
    for (let i = campaigns.length - 1; i >= 0; i--) { const c = campaigns[i], k = TK[c.tank]; if (!k || k.code !== c.code || k.free || (Object.values(c.left).every(v => v < .3) && !S.lines.some(l => l.wo && l.wo.campaign === c))) campaigns.splice(i, 1); }
  }
  function setLine(l, st, s, until) { if (l.state !== st) { l.state = st; l.since = s; } l.until = until != null ? until : null; }
  function openWO(l, w, s) {
    const k = w.k, id = `WO-${yymm(s)}-${String(++nWo).padStart(4, '0')}`;
    l.wo = { id, line: l.id, sku: k.i, code: k.G.code, label: k.G.label, pack: k.pk, packLabel: k.label, units: w.units, done: 0, good: 0, start: s, eta: s + Math.round(w.units / (l.rate * (PACK_RATE[k.pk] || 1) * .9) * 60), end: null, state: 'Running', campaign: w.campaign || null, camp: !!w.campaign };
    S.wos.unshift(l.wo); if (S.wos.length > 160) S.wos.length = 160; S.today.wos++;
  }
  function closeWO(l, s, how) {
    if (!l.wo) return; const w = l.wo, c = w.campaign;
    if (c && w.units > w.done) { const k = SKUS[w.sku]; c.left[l.fmt] = (c.left[l.fmt] || 0) + (w.units - w.done) * perUnit(k); } // unfilled share goes back to the campaign
    w.end = s; w.state = how; w.campaign = null; l.wo = null;
  }

  // ── warehouse, dispatch picking and container stuffing ──
  // cross-dock: packaged lubricants from other lube plants, consolidated here and shipped on with the plant's own
  // pallets; kept apart from the plant's stock so they never stand in for production
  const XD_T = 2000, XD_PAY = 18.2, XD_PLANTS = ['Lube plant Jakarta', 'Lube plant Cilacap', 'Lube plant Gresik', 'Contract filler Cikarang', 'Contract filler Surabaya'];
  const XD_SHARE = XD_T / (XD_T + PLAN - BULK_D), XD_HBW = SKUS.filter(k => k.zone === 'HBW').reduce((a, k) => a + k.dPal, 0) / dPalTot;
  S.xdock = { HBW: 0, DRM: 0, t: 0 };
  function xdockIn(x) { const X = S.xdock, hb = x.pallets * XD_HBW; X.HBW += hb; X.DRM += x.pallets - hb; X.t += x.t; zonePal.HBW += hb; zonePal.DRM += x.pallets - hb; S.today.recXd += x.t; S.today.palIn += x.pallets; }
  function takePallets(n, label) { // pick pallets by the dispatch mix; returns { t, pal }
    let have = zonePal.HBW + zonePal.DRM; if (have < n * 3) return { t: 0, pal: 0 };
    let t = 0, pal = 0;
    const X = S.xdock, xp = X.HBW + X.DRM;
    if (xp > .5) { const q = Math.min(n * XD_SHARE * 1.1, xp), per = X.t / xp, qh = q * X.HBW / xp; X.HBW -= qh; X.DRM -= q - qh; zonePal.HBW -= qh; zonePal.DRM -= q - qh; X.t = Math.max(0, X.t - q * per); t += q * per; pal += q; }
    for (let pass = 0; pass < 2 && pal < n - .01; pass++) {
      const want = n - pal;
      for (const k of SKUS) {
        const share = pass === 0 ? k.dPal / dPalTot : (whU[k.i] / k.perPal) / Math.max(1, zonePal.HBW + zonePal.DRM);
        let q = Math.min(want * share, whU[k.i] / k.perPal); if (q <= 0) continue;
        if (pal + q > n) q = n - pal;
        const u = q * k.perPal; whU[k.i] -= u; whT[k.gi] = Math.max(0, whT[k.gi] - u * k.unitT); zonePal[k.zone] -= q; t += u * k.unitT; pal += q;
        if (pal >= n - .01) break;
      }
    }
    S.today.palOut += pal; return { t, pal };
  }
  function warehouse(s, r) {
    const W = S.warehouse;
    W.cranes.forEach(c => { if (c.fault && s >= c.fault.until) { clear(c.fault.alarm, s, 'Warehouse technician', `${c.id} repaired.`); c.fault = null; c.state = 'Running'; } });
    if (r() < 10 * 5 / (200 * 60)) { const c = pick(r, W.cranes.filter(x => !x.fault)); if (c) { c.fault = { until: s + Math.round(U(r, 30, 120)) }; c.state = 'Fault'; c.fault.alarm = alarm(s, 'attention', 'Warehouse', c.id, `Stacker crane ${c.id} fault — aisle out of service`, 'High-bay infeed reduced', 'Warehouse technician'); } }
    W.hbw.occ = Math.round(zonePal.HBW); W.drm.occ = Math.round(zonePal.DRM); W.hbw.pct = zonePal.HBW / WH_CAP.HBW; W.drm.pct = zonePal.DRM / WH_CAP.DRM;
    const worst = Math.max(W.hbw.pct, W.drm.pct);
    if (worst >= .88 && !W.alarm) W.alarm = alarm(s, worst >= .95 ? 'critical' : 'attention', 'Warehouse', worst === W.hbw.pct ? 'High-bay store' : 'Drum/IBC store', `Warehouse ${Math.round(worst * 100)} % full — lines may block`, 'Dispatch pull raised', 'Warehouse supervisor');
    if (W.alarm && worst < .85) { clear(W.alarm, s, 'Warehouse supervisor', 'Fill back below 85 %.'); W.alarm = null; }
  }
  let nBox = 0;
  const stuffQ = { JKT: 30, SUB: 18 };
  function stuffing(s, r) {
    const icy = S.rail.icy;
    // finish boxes
    for (const b of S.bays) {
      if (b.cls !== 'STF' || !b.box) continue; const x = b.box;
      if (s >= x.until) { x.state = 'Staged'; x.staged = s; icy.full[x.dest]++; icy.fullT[x.dest] += x.t; S.today.boxes++; b.box = null; b.state = 'Free'; b.since = s; b.until = null; }
      else b.pct = clamp((s - x.start) / (x.until - x.start), 0, 1);
    }
    // what is due: liner trains in the next 24 h and the next feeder within 36 h
    const due = [];
    S.trains.forEach(t => { if (t.service !== 'ISO' && t.state === 'Expected' && t.eta - s < 1440 && t.eta - 120 > s) due.push([t.service, t.eta - 120, Math.min(t.outPlan, stuffQ[t.service])]); });
    const f = S.vessels.find(v => v.cls === 'FDR' && v.state === 'Expected' && v.eta - s < 2160 && v.eta - 360 > s); if (f) due.push(['FDR', f.eta - 360, f.boxPlan || (f.boxPlan = Math.round(U(RS('box|' + f.id), 40, 56)))]);
    due.sort((a, b) => a[1] - b[1]);
    for (const [dest, cutoff, want] of due) {
      const inWork = S.bays.filter(b => b.box && b.box.dest === dest).length;
      let need = want - icy.full[dest] - inWork;
      while (need > 0) {
        const bay = S.bays.find(b => b.cls === 'STF' && !b.box && !b.fault); if (!bay || icy.dryEmpty < 1) return;
        const big = r() < .4, drums = !big && r() < .45, pal = big ? Math.round(U(r, 22, 24)) : drums ? 20 : Math.round(U(r, 18, 20));
        const got = takePallets(pal, 'stuffing'); if (!got.pal) return;
        icy.dryEmpty--; need--;
        const mins = (big ? U(r, 110, 140) : drums ? U(r, 90, 110) : U(r, 60, 80)) + 10 + 15;
        const own = pick(r, BOX_OWNERS), id = iso6346(own, String(100000 + ((++nBox * 104729) % 890000)).padStart(6, '0'));
        const x = { id, size: big ? '40HC' : '20DV', dest, bay: bay.id, pallets: Math.round(got.pal), t: got.t, start: s, until: s + Math.round(mins), cutoff, state: 'Stuffing', staged: null };
        bay.box = x; bay.state = 'Stuffing'; bay.since = s; bay.until = x.until; bay.pct = 0;
        S.boxes.unshift(x); if (S.boxes.length > 90) S.boxes.length = 90;
      }
    }
    if (icy.dryEmpty < 80 && r() < (80 - icy.dryEmpty) / 30 * 5 / 60 * 6) truckJob(s + Math.round(U(r, 30, 240)), 'BOX', { empties: 1 });
    icy.teu = Math.round(icy.dryEmpty * 1.4 + (icy.full.JKT + icy.full.SUB + icy.full.FDR) * 1.4 + S.isos.filter(x => /^ICY/.test(x.loc)).length);
  }

  // ── gate, park and the 140 truck bays ──
  let nTrk = 400;
  const PEND = []; // trucks booked to arrive later: { at, cls, job }
  function truckJob(at, cls, job) { let i = PEND.length; while (i > 0 && PEND[i - 1].at > at) i--; PEND.splice(i, 0, { at, cls, job }); }
  const PAYLOAD = [[2.5, 12], [4, 26], [7, 26], [10, 18], [16, 12], [24, 6]]; // distributor trucks, t and weight
  const PAY_AVG = PAYLOAD.reduce((a, p) => a + p[0] * p[1], 0) / PAYLOAD.reduce((a, p) => a + p[1], 0);
  function newTruck(s, cls, r, job) {
    const id = `TRK-${yymm(s)}-${String(++nTrk).padStart(4, '0')}`, rr = RS('tk|' + id);
    const x = { id, plate: plate(rr), carrier: pick(rr, CARRIERS), cls, job: job || null, state: 'Queue', arr: s, gin: null, bay: null, bayAt: null, until: null, gout: null, payload: 0, pallets: 0, t: 0, code: null, note: null, pct: 0 };
    if (cls === 'PKG') { x.payload = wpick(rr, PAYLOAD, p => p[1])[0]; x.pallets = Math.max(4, Math.round(x.payload / .62)); }
    if (cls === 'XDK') { x.pallets = Math.round(U(rr, 22, 30)); x.t = +(x.pallets * U(rr, .62, .78)).toFixed(1); x.payload = x.t; x.from = pick(rr, XD_PLANTS); }
    if (cls === 'BLK') { if (job && job.slop) { x.payload = 18; x.code = 'SLOP'; } else if (job && job.base) { const c = wpick(rr, BO_CODES, y => BO_EXP[y]); x.code = c; x.base = true; x.payload = pick(rr, [16, 20, 24, 24]) * densOf(c); } else { const G = wpick(rr, BULKG, g => g.dBulk); x.code = G.code; x.payload = pick(rr, [8, 12, 16, 16, 20, 24]) * G.dens / 1000; } }
    if (cls === 'MAT') x.load = job && (job.mat || job.store) ? { mat: job.mat, qty: job.qty, store: job.store, t: job.t } : matToBring(rr);
    if (cls === 'UNL') { x.code = job ? job.code : pick(rr, SPEC); x.payload = job ? job.t : 18; x.iso = !!(job && job.iso); }
    S.trucks.push(x); S.today.trucksIn++;
    return x;
  }
  function matToBring(r) { // an unbooked delivery: the material with the lowest cover
    let best = null, bc = 1e9; for (const m of Object.values(MS)) { if (!m.load) continue; const c = matCover(m) / 48 * (.85 + r() * .3); if (c < bc) { bc = c; best = m; } }
    return { mat: best.id, qty: best.load };
  }
  function trucks(s, df) {
    const r = RS('trk|' + s), cm = minOf(s), h = (cm / 60) | 0, dw = dowOf(s);
    // arrivals
    const whFill = (zonePal.HBW + zonePal.DRM) / (WH_CAP.HBW + WH_CAP.DRM), pull = clamp(1 + 2.2 * (whFill - .70), .8, 1.25);
    const pkgDay = (PLAN - BULK_D + XD_T) * PKG_SHARE.road / PAY_AVG, blkDay = BULK_D * CH.road / 13;
    const lam = { PKG: pkgDay * DOWF[dw] * pull * PROF.PKG[h] / 12, BLK: blkDay * (.85 + .15 * DOWF[dw]) * PROF.BLK[h] / 12, MAT: 6 * (dw === 6 ? .25 : 1) * PROF.MAT[h] / 12 }; // unbooked material trucks (returns, spares); the rest are booked by C7
    lam.XDK = XD_T / XD_PAY * DOWF[dw] * PROF.MAT[h] / 12; lam.BXR = EXP_D * EXP_CH.road / 21 * PROF.BLK[h] / 12;
    for (const cls of ['PKG', 'BLK', 'MAT', 'XDK']) { const n = poisson(r, lam[cls]); for (let i = 0; i < n; i++) newTruck(s, cls, r); }
    { const n = poisson(r, lam.BXR); for (let i = 0; i < n; i++) newTruck(s, 'BLK', r, { base: true }); } // base-oil re-export by road tanker
    while (PEND.length && PEND[0].at <= s) { const p = PEND.shift(); newTruck(s, p.cls, r, p.job); }
    // gate lanes (gate-in, ID, documents, safety check, weigh-in)
    if (!S.gate.outage && r() < 4 / 30 / 288) { S.gate.outage = { until: s + Math.round(U(r, 30, 90)) }; S.gate.outage.alarm = alarm(s, 'attention', 'Gate', 'Gate system', 'Gate system outage — manual check-in, service time doubled', 'Gate queue growing', 'Gate supervisor'); }
    if (S.gate.outage && s >= S.gate.outage.until) { clear(S.gate.outage.alarm, s, 'Gate supervisor', 'Gate system restored.'); S.gate.outage = null; }
    let lanes = 6 * 5 / (S.gate.outage ? 12 : 5) * (dw === 4 && cm >= 690 && cm < 780 ? .5 : 1), park = 0;
    for (const x of S.trucks) if (x.state === 'Park' || x.state === 'Gate-in' || x.state === 'Called') park++;
    for (const x of S.trucks) {
      if (x.state !== 'Queue') continue;
      if (lanes < 1) break;
      if (park >= 220) break;
      lanes--; park++; x.state = 'Gate-in'; x.gin = s; x.until = s + Math.round(U(r, 7, 12));
      if (r() < .04) { x.note = 'Documents incomplete'; x.until += Math.round(U(r, 30, 90)); }
    }
    // bays: finish work, then call trucks forward
    const free = {}; for (const b of S.bays) { if (b.fault && s >= b.fault.until) { clear(b.fault.alarm, s, 'Bay supervisor', `${b.id} clear.`); b.fault = null; b.state = 'Free'; b.truck = null; } }
    for (const x of S.trucks) {
      if (x.state === 'Gate-in' && s >= x.until) { x.state = x.cls === 'ISO' || x.cls === 'BOX' ? 'Yard' : 'Park'; x.until = x.state === 'Yard' ? s + Math.round(U(r, 20, 45)) : null; }
      else if (x.state === 'Yard' && s >= x.until) { yardJob(x, s, r); exitTruck(x, s, r); }
      else if (x.state === 'At bay') bayWork(x, s, r);
      else if (x.state === 'Weigh-out' && s >= x.until) { x.state = 'Gate-out'; x.until = s + 3; }
      else if (x.state === 'Gate-out' && s >= x.until) { x.state = 'Gone'; x.gout = s; S.today.trucksOut++; S.today['ta' + x.cls] = (S.today['ta' + x.cls] || []); S.today['ta' + x.cls].push(s - x.arr); }
    }
    const open = { PKG: true, MAT: cm >= 420 && cm < 1140, BLK: true, UNL: true };
    for (const b of S.bays) if (b.state === 'Free' && !b.fault && b.cls !== 'STF') (free[b.cls] = free[b.cls] || []).push(b);
    for (const x of S.trucks) {
      if (x.state !== 'Park') continue;
      // a road ISO with no tank room after 45 min is dropped in the ISO yard as rolling stock and discharged later by a crane
      if (x.cls === 'UNL' && x.iso && s - x.arr > 45 && !pickRecvTank(x.code, x.payload / densOf(x.code) + 2)) { x.state = 'Yard'; x.until = s + Math.round(U(r, 20, 40)); x.job = { ...(x.job || {}), dropFull: true }; continue; }
      const bc = x.cls === 'XDK' ? 'PKG' : x.cls, fl = free[bc]; if (!fl || !fl.length || !open[bc]) continue; // cross-dock trucks unload at the packaged docks
      if (x.cls === 'PKG') { const got = takePallets(x.pallets, 'road'); if (!got.pal) continue; x.t = got.t; x.palGot = got.pal; }
      if (x.cls === 'BLK' && x.base) { if (expAvailT(x.code) < x.payload) { if (s - x.arr > 120) { const c = wpick(r, BO_CODES.filter(y => expAvailT(y) > x.payload * 1.5), y => BO_EXP[y]); if (c) { x.code = c; x.note = 'Grade switched · first choice held for blending'; } } continue; } }
      else if (x.cls === 'BLK' && x.code !== 'SLOP' && gradeAvailK(x.code) - resK[GI[x.code]] < x.payload / (GRADE[x.code].dens / 1000)) { if (s - x.arr > 120) { const G = wpick(r, BULKG.filter(g => gradeAvailK(g.code) - resK[GI[g.code]] > x.payload / (g.dens / 1000)), g => g.dBulk); if (G) { x.code = G.code; x.note = 'Grade switched · first choice not released'; } } continue; }
      if (x.cls === 'UNL') { const k = pickRecvTank(x.code, x.payload / densOf(x.code) + 2); if (!k) continue; x.dst = k.id; k.recv = x.id; k.duty = x.plate; }
      const b = fl.shift(); b.state = x.cls === 'PKG' || x.cls === 'BLK' ? 'Loading' : 'Unloading'; b.truck = x.id; b.since = s; b.pct = 0;
      x.state = 'At bay'; x.bay = b.id; x.bayAt = s; x.done = 0;
      const mins = x.cls === 'PKG' ? 5 + x.palGot * U(r, 2.5, 4) * (S.bays.filter(y => y.cls === 'PKG' && y.state !== 'Free').length > 48 ? 1.2 : 1) + 15 : x.cls === 'XDK' ? 5 + x.pallets * U(r, 1.6, 2.6) + 10 : x.cls === 'MAT' ? U(r, 45, 110) : x.cls === 'BLK' ? 10 + x.payload / densOf(x.code) / U(r, 35, 60) * 60 + 12 : 15 + x.payload / densOf(x.code) / U(r, 20, 30) * 60;
      x.until = s + Math.round(mins); b.until = x.until;
      if (x.cls === 'PKG') { S.today.road += x.t; }
      if (r() < .008) { b.fault = { until: s + Math.round(U(r, 45, 120)) }; b.fault.alarm = alarm(s, 'attention', 'Gate', b.id, `Truck ${x.plate} broke down at ${b.id} — bay blocked`, 'Tow truck called', 'Bay supervisor'); }
    }
    // gate queue and turnaround statistics
    let q = 0, on = 0; for (const x of S.trucks) { if (x.state === 'Queue') q++; if (x.state !== 'Gone') on++; }
    S.gate.queue = q; S.gate.onSite = on; S.gate.park.occ = S.trucks.filter(x => x.state === 'Park').length;
    if (q >= 20 && !S.gate.qAlarm) S.gate.qAlarm = alarm(s, q >= 40 ? 'critical' : 'attention', 'Gate', 'Gate', `Gate queue ${q} trucks`, 'Road queue outside the terminal', 'Gate supervisor');
    if (S.gate.qAlarm && q < 12) { clear(S.gate.qAlarm, s, 'Gate supervisor', 'Queue cleared.'); S.gate.qAlarm = null; }
    for (let i = S.trucks.length - 1; i >= 0; i--) if (S.trucks[i].state === 'Gone' && S.trucks[i].gout < s - 360) S.trucks.splice(i, 1);
  }
  function bayWork(x, s, r) {
    const b = S.bays.find(y => y.id === x.bay); if (!b) return;
    if (b.fault) return;
    if (x.cls === 'BLK') {
      if (x.code === 'SLOP') { const k = TK[x.job && x.job.slop]; if (k) { const q = Math.min(Math.max(0, avail(k) + k.heel - 1), 45 * 5 / 60); k.pOut += Math.max(0, q); x.done += Math.max(0, q) * .88; } if (s >= x.until) { if (k) k.slopOut = false; finishBay(x, b, s, r); } return; }
      const d = densOf(x.code), want = Math.min(x.payload - x.done, 48 * 5 / 60 * d), got = x.base ? drawExport(x.code, want, b.id) : drawBulk(x.code, want / d, b.id) * d;
      x.done += got; x.t = x.done; S.today.road += got; if (x.base) { S.today.reexp += got; S.today.reexpRoad += got; } else { S.today.bulkT += got; S.today.out += got; } b.pct = x.done / x.payload;
      if (got > .01) x.lastFlow = s;
      const stalled = s - (x.lastFlow ?? x.bayAt) >= 60; // no released, unreserved product for an hour: the driver leaves with what is loaded
      if (x.done >= x.payload - .05 || stalled) {
        if (x.done < x.payload - .05) { x.note = x.done >= x.payload * .3 ? `Short-loaded ${fmt(x.done, 1)} t · grade not released` : 'Load cancelled · grade not released'; log(s, 'attention', 'Gate', b.id, `${x.plate} ${x.note.toLowerCase()} (${(GRADE[x.code] || COMP[x.code] || {}).short || x.code})`); }
        finishBay(x, b, s, r);
      } else if (s >= x.until) x.until = s + 5;
      return;
    }
    if (x.cls === 'UNL') {
      const k = TK[x.dst], d = densOf(x.code), q = k ? Math.min((x.payload - x.done) / d, 25 * 5 / 60, Math.max(0, ullage(k))) : 0;
      if (k && q > 0) { k.pIn += q; x.done += q * d; S.today.recRoad += q * d; pendIso[x.code] = Math.max(0, (pendIso[x.code] || 0) - q * d); }
      b.pct = x.done / x.payload;
      if (x.done >= x.payload - .05 || s >= x.until + 60) { if (k) { k.recv = null; settleReceipt(k, s, x.plate, true); } finishBay(x, b, s, r); }
      return;
    }
    b.pct = clamp((s - x.bayAt) / Math.max(5, x.until - x.bayAt), 0, 1);
    if (s >= x.until) {
      if (x.cls === 'XDK') xdockIn(x);
      if (x.cls === 'MAT') { const L = x.load; if (L.store) { STORE[L.store] += L.t; booked[L.store] = Math.max(0, (booked[L.store] || 0) - L.t); } else if (L.mat) { MS[L.mat].stock = Math.min(MS[L.mat].cap * 1.1, MS[L.mat].stock + L.qty); booked[L.mat] = Math.max(0, (booked[L.mat] || 0) - L.qty); } }
      finishBay(x, b, s, r);
    }
  }
  function finishBay(x, b, s, r) {
    b.state = 'Free'; b.truck = null; b.since = s; b.until = null; b.pct = 0;
    if (x.cls === 'PKG' && r() < .015) { x.note = 'Overweight at weigh-out · re-work at dock'; x.state = 'At bay'; x.until = s + Math.round(U(r, 30, 45)); b.state = 'Loading'; b.truck = x.id; b.until = x.until; x.cls2 = true; return; }
    exitTruck(x, s, r);
  }
  function exitTruck(x, s, r) { x.state = 'Weigh-out'; x.until = s + Math.round(U(r, 3, 6)); x.bay = x.bay || null; }
  function yardJob(x, s, r) {
    const j = x.job || {};
    if (x.cls === 'BOX') { S.rail.icy.dryEmpty += 1; return; }
    if (j.dropFull) { const y = isoArrive(s, r, 'road', x.code); if (y) { y.t = +x.payload.toFixed(1); x.note = `Dropped full ${y.id} in the ISO yard · receiving tank full`; } else { x.note = 'ISO yard full · tank sent to the off-site depot'; pendIso[x.code] = Math.max(0, (pendIso[x.code] || 0) - x.payload); } return; }
    if (j.drop) { const y = isoArriveEmpty(s, r, 'road'); if (y) x.note = `Dropped ${y.id}`; return; }
    if (j.pick) { const y = S.isos.find(z => z.id === j.pick); if (y) { if (y.cat === 'FO') { S.today.road += y.t; x.t = y.t; x.code = y.code; } x.note = `Collected ${y.id}`; isoGone(y, s); } }
  }

  // ── calendar, weather and utilities ──
  let lastDay = null, df = 1;
  const wxCache = new Map();
  function wxDay(d) {
    let w = wxCache.get(d); if (w) return w;
    const r = RS('wx|' + d), mo = new Date(d * 86400000).getUTCMonth(), m0 = midnight(d);
    const p = [.40, .40, .38, .35, .25, .10, .08, .08, .10, .20, .35, .42][mo];
    w = { storm: null, rain: null, swell: null };
    if (r() < p) { const st = m0 + (r() < .7 ? 780 + r() * 300 : r() * 1440), du = 45 + r() * 105; w.storm = [st, st + du]; if (r() < .75) w.rain = [st - 30 - r() * 60, st + du + 30 + r() * 120]; }
    else if (r() < p * .9) { const st = m0 + r() * 1440; w.rain = [st, st + 40 + r() * 120]; }
    if ((mo >= 10 || mo <= 3) && r() < .06) { const st = m0 + r() * 1440; w.swell = [st, st + 240 + r() * 480]; }
    wxCache.set(d, w); if (wxCache.size > 30) wxCache.delete(wxCache.keys().next().value);
    return w;
  }
  function calendar(s) {
    const d = dayOf(s), cm = minOf(s); S.night = cm < 360 || cm >= 1080;
    const r = RS('dayf|' + d); df = DOWF[dowOf(s)] * U(r, .94, 1.06);
    if (d !== lastDay) { if (lastDay != null) dayRoll(s, lastDay); lastDay = d; lineup(s); railDay(d); railDay(d + 1); }
  }
  let CUM0 = {};
  const CUMK = ['out', 'pkgT', 'bulkT', 'road', 'rail', 'sea', 'recSea', 'recRail', 'recRoad', 'recIso', 'blendT', 'greaseT', 'railMoves', 'feederMoves', 'trucksIn', 'boxes', 'isoFills', 'isoDisch', 'samples', 'reexp', 'recXd'];
  const cum = k => (CUM0[k] || 0) + (S.today[k] || 0);
  function dayRoll(s, d) {
    const X = S.today, ta = c => { const a = X['ta' + c] || []; if (!a.length) return null; const b = [...a].sort((p, q) => p - q); return { avg: Math.round(b.reduce((p, q) => p + q, 0) / b.length), p90: b[Math.floor(b.length * .9)] }; };
    S.days.unshift({ day: d, at: midnight(d), label: api.day(midnight(d) + 720, 'WIB'), out: X.out, pkgT: X.pkgT, bulkT: X.bulkT, road: X.road, rail: X.rail, sea: X.sea, recSea: X.recSea, recRail: X.recRail, recRoad: X.recRoad + X.recIso, blendT: X.blendT, greaseT: X.greaseT, reexp: X.reexp, recXd: X.recXd, batches: X.batches, rft: X.rftN ? X.rftPass / X.rftN : 1, isoFills: X.isoFills, isoDisch: X.isoDisch, railMoves: Math.round(X.railMoves), trucks: X.trucksIn, boxes: X.boxes, units: X.units, synthetic: false, partial: S.days.length === 0 && S.warm });
    if (S.days.length > 14) S.days.length = 14;
    CUMK.forEach(k => { CUM0[k] = (CUM0[k] || 0) + (X[k] || 0); });
    S.today = S_TODAY(); S.iso.fillsToday = 0; S.iso.dischToday = 0;
    S.lines.forEach(l => { l.unitsToday = 0; l.tToday = 0; l.coToday = 0; }); S.isoCranes.forEach(c => { c.movesToday = 0; }); S.rail.cranes.forEach(c => { c.movesToday = 0; });
  }
  function weather(s) {
    const d = dayOf(s), w0 = wxDay(d), w1 = wxDay(d - 1), inn = iv => iv && s >= iv[0] && s < iv[1];
    const storm = inn(w0.storm) ? w0.storm : inn(w1.storm) ? w1.storm : null, rain = inn(w0.rain) || inn(w1.rain), swell = inn(w0.swell) ? w0.swell : inn(w1.swell) ? w1.swell : null;
    S.wx = !!storm; S.wxUntil = storm ? Math.ceil(storm[1] / 5) * 5 : null; S.swell = !!swell;
    const st = storm ? 'Thunderstorm' : rain ? 'Rain' : 'Clear', W = S.weather, mo = monthOf(s);
    if (st !== W.state) {
      W.state = st; W.since = s;
      if (storm) { log(s, 'attention', 'Weather', 'Site', 'Thunderstorm over the site — cargo transfer, ship and rail cranes and outdoor ISO lifts suspended'); if (!S.wxAlarm) S.wxAlarm = alarm(s, 'attention', 'Weather', 'Lightning detector', 'Lightning within 8 km — outdoor operations suspended', 'Cargo, ship cranes, rail cranes and ISO lifts on hold; trucks continue', 'Shift supervisor · MLB'); }
      else if (S.wxAlarm) { clear(S.wxAlarm, s, 'Shift supervisor', 'Lightning risk passed; outdoor operations resumed.'); S.wxAlarm = null; }
    }
    if (swell && !S.swellAlarm) S.swellAlarm = alarm(s, 'attention', 'Marine', 'Jetty 1 · Jetty 2', 'Swell above the berthing limit — J1/J2 berthing suspended', 'Import tankers hold at anchorage', 'Harbour master · MLB');
    if (!swell && S.swellAlarm) { clear(S.swellAlarm, s, 'Harbour master', 'Swell eased; J1/J2 berthing resumed.'); S.swellAlarm = null; }
    W.until = storm ? storm[1] : null; W.season = mo >= 10 || mo <= 3 ? 'Wet season' : mo >= 5 && mo <= 8 ? 'Dry season' : 'Transition';
    const cm = minOf(s); W.tempC = +(27.5 + 4.5 * Math.sin((cm - 540) / 1440 * 2 * Math.PI) - (rain || storm ? 2.2 : 0)).toFixed(1);
    W.wind = Math.round(8 + 6 * Math.sin(cm / 1440 * 2 * Math.PI + d) + (storm ? 18 : 0));
    W.text = storm ? `Thunderstorm · until about ${hhmm(storm[1])}` : rain ? 'Rain' : W.tempC > 31 ? 'Hot, clear' : 'Clear';
  }
  function utilities(s) {
    const r = RS('utl|' + s), U_ = S.utilities;
    if (!S.gridDown && r() < .5 / 30 / 288) { const until = s + Math.round(U(r, 30, 120)); S.gridDown = { until }; S.gridDown.alarm = alarm(s, 'critical', 'Utilities', '150/20 kV substation', 'Grid outage — gensets carrying critical loads, 70 % of filling lines stopped', 'GEN-1..4 on line; high-bay store at 50 %', 'Electrical supervisor'); }
    if (S.gridDown && s >= S.gridDown.until) { clear(S.gridDown.alarm, s, 'Electrical supervisor', 'Grid restored; lines restarting.'); log(s, 'info', 'Utilities', 'Substation', 'Grid supply restored'); S.gridDown = null; }
    if (r() < 4 / 30 / 288) { // power dip: a third of running lines trip
      let n = 0; S.lines.forEach(l => { if (l.state === 'Running' && r() < .3) { setLine(l, 'Fault', s, s + Math.round(U(r, 10, 30))); n++; } });
      const e = alarm(s, 'attention', 'Utilities', 'Power supply', `Voltage dip — ${n} filling lines tripped, restarting`, 'Lines restart in 10–30 min', 'Electrical supervisor'); later(s + 30, at => clear(e, at, 'Electrical supervisor', 'All tripped lines restarted.'));
    }
    const B = U_.steam.boilers;
    B.forEach(b => { if (b.fault && s >= b.fault.until) { b.fault = null; b.state = 'Standby'; } });
    if (r() < 2 * 5 / (700 * 60)) { const b = B.find(x => x.state === 'Running'); const sb = B.find(x => x.state === 'Standby'); if (b) { b.state = 'Trip'; b.fault = { until: s + Math.round(U(r, 120, 360)) }; const e = alarm(s, 'attention', 'Utilities', b.id, `Boiler ${b.id} trip — standby boiler starting`, sb ? `${sb.id} on line in about 45 min` : 'No standby boiler', 'Utilities operator'); if (sb) later(s + 45, at => { sb.state = 'Running'; clear(e, at, 'Utilities operator', `${sb.id} on line.`); }); } }
    let heatedTanks = 0; for (const k of T.tanks) if (k.heated) heatedTanks++;
    const sbbHeat = S.blenders.filter(b => b.batch && /Heating|Charging/.test(b.step || '')).length;
    U_.steam.demand = +(4.2 + heatedTanks * .09 + sbbHeat * .8 + S.iso.heatUsed * .06 + (S.night || S.weather.state !== 'Clear' ? 1.8 : 0)).toFixed(1);
    const running = B.filter(b => b.state === 'Running').length; U_.steam.cap = running * 10; B.forEach(b => { b.load = b.state === 'Running' ? +(U_.steam.demand / Math.max(1, running)).toFixed(1) : 0; });
    const runL = S.lines.filter(l => l.state === 'Running').length, runB = S.blenders.filter(b => b.batch).length;
    U_.power.mw = +(3.2 + runL * .14 + runB * .22 + S.blow.filter(m => m.state === 'Running').length * .2 + .6 + S.rail.cranes.filter(c => c.state === 'Working').length * .4 + S.isoCranes.filter(c => c.iso).length * .06 + .3).toFixed(1);
    U_.power.source = S.gridDown ? 'Gensets GEN-1..4' : 'PLN grid · 150/20 kV'; U_.power.gens = S.gridDown ? 4 : 0;
    U_.n2.nm3h = Math.round(280 + runB * 8 + T.tanks.filter(k => k.state === 'Receiving').length * 15);
    U_.thermal.mw = +(1.2 + S.grease.units.filter(u => u.kind !== 'Finishing kettle' && u.batch).length * .45).toFixed(1);
  }

  // ── tank status for the network pages, KPIs and history ──
  function tankStatus() {
    for (const k of T.tanks) {
      if (k.zone === 'FPT') k.status = k.state === 'Free' ? 'Free · clean' : k.state === 'Cleaning' ? 'Cleaning' : k.state === 'Blending' ? 'Blending' : k.state === 'QC hold' ? 'Settling' : k.state === 'Adjusting' ? 'Adjusting · recirculating' : k.pOut > 0 ? 'Dispatching' : 'Idle';
      else if (k.zone === 'AUX') k.status = k.pIn > 0 ? 'Receiving' : k.pOut > 0 ? 'Dispatching' : 'Idle';
      else k.status = k.state === 'Receiving' || k.pIn > 0 ? 'Receiving' : k.state === 'QC hold' ? 'Settling' : k.pOut > 0 ? 'Dispatching' : 'Idle';
      if (k.pOut === 0 && k.pIn === 0 && !k.recv && k.state !== 'Receiving' && k.state !== 'Blending') k.duty = null;
      k.alarm = k.v0 + k.pIn > k.hla ? { sev: 'attention', text: 'High level' } : null;
    }
  }
  const p90 = a => { if (!a || !a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length * .9)]; };
  const avg = a => a && a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  function oeeOf(l, hours) {
    let pl = 0, run = 0, rated = 0, u = 0, g = 0; const hn = Math.floor(S.now / 60);
    for (let i = 0; i < hours; i++) { const h = hn - i, j = ((h % 48) + 48) % 48; if (l.hbN == null || h > l.hbN || h < l.hbN - 47) continue; pl += l.hb[j * 5]; run += l.hb[j * 5 + 1]; rated += l.hb[j * 5 + 2]; u += l.hb[j * 5 + 3]; g += l.hb[j * 5 + 4]; }
    const A = pl > 0 ? clamp(run / pl, 0, 1) : 0, P = rated > 0 ? clamp(u / rated, 0, 1) : 0, Q = u > 0 ? g / u : 1;
    return { a: A, p: P, q: Q, oee: A * P * Q, planH: pl / 60 };
  }
  function kpis(s) {
    const X = S.today, K = S.kpi, cm = minOf(s);
    const brkDip = 0.97; K.out = { today: X.out, planToNow: PLAN / 1440 * cm * brkDip, pct: cm > 30 ? X.out / (PLAN / 1440 * cm * brkDip) : null, pkg: X.pkgT, bulk: X.bulkT };
    const dw = dowOf(s), PK = PLAN - BULK_D + XD_T, roadPlan = PK * PKG_SHARE.road * DOWF[dw] + BULK_D * (CH.road + CH.iso * .25) + EXP_D * (EXP_CH.road + EXP_CH.iso * .4);
    K.disp = { road: X.road, rail: X.rail, sea: X.sea, roadPlan, railPlan: PK * PKG_SHARE.rail + BULK_D * CH.iso * .25 + EXP_D * EXP_CH.iso * .2, seaPlan: PK * PKG_SHARE.sea + BULK_D * (CH.iso * .5 + CH.FBC + CH.SPOB) + EXP_D * (EXP_CH.sea + EXP_CH.iso * .4) };
    K.rec = { sea: X.recSea, rail: X.recRail, road: X.recRoad, iso: X.recIso, xd: X.recXd };
    K.hub = { reexp: X.reexp, sea: X.reexpSea, iso: X.reexpIso, road: X.reexpRoad, xd: X.recXd, xdStock: S.xdock.t, plan: EXP_D, xdPlan: XD_T };
    const byRoute = { ILB: 0, ABB: 0, SBB: 0, GR: 0 }; S.blenders.forEach(b => { if (b.batch) byRoute[b.type]++; }); S.grease.units.forEach(u => { if (u.batch && u.kind !== 'Finishing kettle') byRoute.GR++; });
    K.blend = { t: X.blendT, batches: X.batches, inProcess: S.blenders.filter(b => b.batch).length, rft: X.rftN ? X.rftPass / X.rftN : null, byRoute, waiting: S.blenders.filter(b => b.state === 'Waiting raw material').length };
    const halls = { P: [0, 0], D: [0, 0], G: [0, 0] };
    S.lines.forEach(l => { l.oee24 = oeeOf(l, 24); l.oeeShift = oeeOf(l, Math.max(1, Math.ceil(((cm - ({ A: 360, B: 840, C: 1320 })[cm >= 360 && cm < 840 ? 'A' : cm >= 840 && cm < 1320 ? 'B' : 'C'] + 1440) % 1440) / 60))); const w = l.rate * l.oee; halls[l.hall][0] += l.oee24.oee * w; halls[l.hall][1] += w; });
    K.lines = { running: S.lines.filter(l => l.state === 'Running').length, of: S.lines.length, hall: { P: halls.P[1] ? halls.P[0] / halls.P[1] : 0, D: halls.D[1] ? halls.D[0] / halls.D[1] : 0, G: halls.G[1] ? halls.G[0] / halls.G[1] : 0 }, coShare: X.planMin ? X.coMin / X.planMin : 0 };
    K.base = [...G1, ...G23, ...SPEC].map(c => ({ code: c, short: COMP[c].short, label: COMP[c].label, t: stockT(c), days: coverD(c), pct: stockT(c) / Math.max(1, capT(c)) }));
    K.add = TANK_ADD.map(c => ({ code: c, short: COMP[c].short, t: stockT(c), days: coverD(c), pct: stockT(c) / Math.max(1, capT(c)) }));
    gradeStocks(); let rel = 0, qc = 0; LIQG.forEach(G => { const gi = GI[G.code]; rel += relK[gi] * G.dens / 1000; qc += qcK[gi] * G.dens / 1000; });
    K.fin = { rel, qc, days: rel / (PLAN - FAMILIES.GR.share * PLAN) };
    K.wh = { hbw: zonePal.HBW / WH_CAP.HBW, drm: zonePal.DRM / WH_CAP.DRM, palIn: X.palIn, palOut: X.palOut, coverHBW: SKUS.filter(k => k.zone === 'HBW').reduce((a, k) => a + whU[k.i], 0) / Math.max(1, SKUS.filter(k => k.zone === 'HBW').reduce((a, k) => a + k.dU, 0)), coverDRM: SKUS.filter(k => k.zone === 'DRM').reduce((a, k) => a + whU[k.i], 0) / Math.max(1, SKUS.filter(k => k.zone === 'DRM').reduce((a, k) => a + k.dU, 0)) };
    const busy = {}; S.bays.forEach(b => { busy[b.cls] = (busy[b.cls] || 0) + (b.state !== 'Free' ? 1 : 0); });
    K.docks = busy;
    K.ta = {}; ['PKG', 'BLK', 'MAT', 'UNL', 'XDK'].forEach(c => { const a = X['ta' + c]; K.ta[c] = a && a.length ? { avg: avg(a), p90: p90(a), n: a.length } : null; });
    const byCat = { EC: 0, ED: 0, FO: 0, IF: 0, ER: 0, RP: 0 }; let occ = 0; S.isos.forEach(x => { if (x.slot >= 0) { byCat[x.cat]++; occ++; } });
    S.iso.byCat = byCat; S.iso.occ = occ;
    K.iso = { occ: occ / 250, byCat, fills: X.isoFills, fillPlan: (BULK_D * CH.iso + EXP_D * EXP_CH.iso) / 19.5, disch: X.isoDisch, heat: S.iso.heatUsed, busy: S.isoCranes.filter(c => c.iso).length, orders: S.iso.orders.length };
    K.rail = { movesHour: S.rail.movesHour, movesToday: X.railMoves };
    K.berths = { busy: S.jetties.filter(j => j.vessel).length, anchorage: S.vessels.filter(v => v.state === 'At anchorage').length, expected72: S.vessels.filter(v => v.state === 'Expected' && v.eta - s < 4320).length };
    K.lab = { queue: SMP_WAIT.length, inTest: SMP_RUN.length, tatAvg: X.tatN ? X.tatSum / X.tatN : null, tatP90: p90(X.tats), onTime: X.tatN ? 1 - X.late / X.tatN : null, done: X.tatN, samples: X.samples };
    S.lab.queue = SMP_WAIT.length; S.lab.inTest = SMP_RUN.length; S.lab.doneToday = X.tatN; S.lab.tatAvg = K.lab.tatAvg; S.lab.tatP90 = K.lab.tatP90; S.lab.onTime = K.lab.onTime;
    K.grease = { inProcess: S.grease.units.filter(u => u.batch).length, t: X.greaseT, hoppers: S.grease.hoppers.reduce((a, h) => a + h.t, 0) };
    K.slop = { t: X.slopT, pct: X.out > 0 ? X.slopT / X.out : 0 };
    K.stuffing = { boxes: X.boxes, inWork: S.bays.filter(b => b.box).length, plan: 190 }; // four liners and two feeders a day
    K.util = { steam: S.utilities.steam.demand, steamCap: S.utilities.steam.cap, mw: S.utilities.power.mw, source: S.utilities.power.source, n2: S.utilities.n2.nm3h };
    K.alarms = { open: S.alarms.filter(e => e.status !== 'Resolved').length, critical: S.alarms.filter(e => e.status !== 'Resolved' && e.sev === 'critical').length };
    K.gate = { queue: S.gate.queue, onSite: S.gate.onSite, park: S.gate.park.occ };
    Object.values(MS).forEach(m => { m.coverH = matCover(m); });
  }
  const NH = 192, HK = ['out', 'pkgT', 'bulkT', 'road', 'rail', 'sea', 'recSea', 'recRail', 'recRoad', 'recIso', 'blendT', 'greaseT', 'railMoves', 'boxes', 'isoFills', 'gateQ', 'onSite', 'docksPKG', 'berths', 'isoOcc', 'isoBusy', 'whHBW', 'whDRM', 'linesRun', 'labQ', 'boG1', 'boG2', 'boG3', 'boSP', 'addT', 'finRel', 'steam', 'mw'];
  const HIST = {}; HK.forEach(k => { HIST[k] = new Float32Array(NH); }); const HT = new Float64Array(NH).fill(NaN); let lastCum = null;
  function history(s) {
    if (minOf(s) % 15 !== 0) return;
    const i = ((Math.floor(s / 15) % NH) + NH) % NH, c = {}; CUMK.forEach(k => { c[k] = cum(k); });
    const prev = lastCum, dlt = k => prev ? Math.max(0, c[k] - prev[k]) : 0; HT[i] = s;
    ['out', 'pkgT', 'bulkT', 'road', 'rail', 'sea', 'recSea', 'recRail', 'recRoad', 'recIso', 'blendT', 'greaseT', 'railMoves', 'boxes', 'isoFills'].forEach(k => { HIST[k][i] = dlt(k); });
    lastCum = c;
    const K = S.kpi; HIST.gateQ[i] = S.gate.queue; HIST.onSite[i] = S.gate.onSite; HIST.docksPKG[i] = (K.docks && K.docks.PKG) || 0; HIST.berths[i] = K.berths ? K.berths.busy : 0;
    HIST.isoOcc[i] = S.iso.occ; HIST.isoBusy[i] = S.isoCranes.filter(x => x.iso).length; HIST.whHBW[i] = zonePal.HBW / WH_CAP.HBW * 100; HIST.whDRM[i] = zonePal.DRM / WH_CAP.DRM * 100;
    HIST.linesRun[i] = S.lines.filter(l => l.state === 'Running').length; HIST.labQ[i] = SMP_WAIT.length + SMP_RUN.length;
    HIST.boG1[i] = G1.reduce((a, x) => a + stockT(x), 0); HIST.boG2[i] = ['G2-150N', 'G2-600N'].reduce((a, x) => a + stockT(x), 0); HIST.boG3[i] = ['G3-4', 'G3-6'].reduce((a, x) => a + stockT(x), 0); HIST.boSP[i] = SPEC.reduce((a, x) => a + stockT(x), 0);
    HIST.addT[i] = TANK_ADD.reduce((a, x) => a + stockT(x), 0); HIST.finRel[i] = K.fin ? K.fin.rel : 0; HIST.steam[i] = S.utilities.steam.demand; HIST.mw[i] = S.utilities.power.mw;
  }
  function seriesOf(key, hours = 24) { // [{ t, v }] oldest first, 15-minute points
    const a = HIST[key]; if (!a) return []; const out = [], n = Math.min(NH, Math.round(hours * 4)), i0 = Math.floor(S.now / 15);
    for (let j = n - 1; j >= 0; j--) { const i = (((i0 - j) % NH) + NH) % NH; if (!isFinite(HT[i]) || HT[i] < S.now - hours * 60 - 15) continue; out.push({ t: HT[i], v: a[i] }); }
    return out;
  }

  // ── Scheduling board ──
  function schedule() {
    const s = S.now, lanes = [...S.jetties.map(j => j.name), 'Rail · RT-1', 'Rail · RT-2', ...S.blenders.map(b => b.id), 'Grease plant'], items = [], conflicts = [];
    const jn = id => (S.jetties.find(j => j.id === id) || {}).name;
    S.vessels.forEach(v => {
      const C = VCLS[v.cls], lane = v.jetty ? jn(v.jetty) : jn(S.jetties.find(j => j.cls.includes(v.cls)).id);
      const cargoH = v.cls === 'FDR' ? 7 : v.parcels.reduce((a, p) => a + Math.max(0, p.t - p.done), 0) / Math.max(1, v.rate);
      const a = v.berthAt || Math.max(v.eta, (v.ata || v.eta) + 60), b = v.atd || Math.max(s + 30, (v.startAt || a + 90 + C.pre) + cargoH * 60 + C.post + 60);
      if (b < s - 1440) return;
      const p0 = v.parcels.find(p => p.trf);
      items.push({ id: v.id, lane, type: C.dir === 'in' ? 'Receipt' : 'Dispatch', label: `${v.name} · ${v.cls === 'FDR' ? 'feeder' : v.parcels.map(p => (COMP[p.code] || GRADE[p.code] || { short: p.code }).short).slice(0, 3).join(', ')}`, a, b, ref: p0 ? p0.trf : null });
      if (v.state === 'At anchorage' && s - v.anchorSince > 360) { const occ = S.vessels.find(x => x.jetty && S.jetties.find(j => j.id === x.jetty).cls.includes(v.cls) && x.state !== 'Departed'); conflicts.push({ id: 'CF-' + v.id, kind: 'Berth availability', items: occ ? [v.id, occ.id] : [v.id], text: `${v.name} has waited ${dur(s - v.anchorSince)} at anchorage for a ${C.label.toLowerCase()} berth.`, fix: v.cls === 'IMP' ? 'Berthing window 06:00–17:00 only; confirm the next daylight slot with the harbour master.' : 'Shorten the vessel alongside or shift it to the alternate berth.' }); }
    });
    S.trains.forEach(t => {
      if (t.state === 'Cancelled') return; const a = t.ata || t.eta, b = t.atd || Math.max(s + 15, a + 240); if (b < s - 1440) return;
      items.push({ id: t.id, lane: 'Rail · ' + (t.track && t.track !== 'RT-3' ? t.track : 'RT-1'), type: 'Transfer', label: `${t.id} · ${t.name}`, a, b });
      if (t.state === 'Expected' && t.eta - t.sched > 120 && t.eta > s) conflicts.push({ id: 'CF-' + t.id, kind: 'Rail window', items: [t.id], text: `${t.id} ${t.name} running ${dur(t.eta - t.sched)} late; staged boxes and ISO tanks wait in the container yard.`, fix: 'Re-sequence the rail cranes and hold stuffing for the next service.' });
    });
    S.batches.forEach(b => {
      const a = b.start, e = b.end || b.eta || a + 180; if (e < s - 1440) return;
      items.push({ id: b.id, lane: b.grease ? 'Grease plant' : b.blender, type: 'Blending', label: `${b.id} · ${(GRADE[b.code] || { short: b.code }).short}`, a, b: e });
      if (!b.end && !b.grease) { const bl = S.blenders.find(x => x.id === b.blender); if (bl && bl.state === 'Waiting raw material') conflicts.push({ id: 'CF-' + b.id, kind: 'Raw material', items: [b.id], text: `${b.blender} is waiting for raw material for ${b.id}.`, fix: 'Release the receiving base-oil tank or switch the component to another tank.' }); }
    });
    S.blenders.forEach(b => { if (b.pm) items.push({ id: 'PM-' + b.id, lane: b.id, type: 'Maintenance', label: 'Planned maintenance', a: b.pm.until - 720, b: b.pm.until }); });
    const d0 = dayOf(s); for (let d = d0; d < d0 + 2; d++) S.blenders.forEach((b, i) => { if ((d + i * 2) % 42 === 0) { const a = midnight(d) + 480; if (a > s) items.push({ id: `PM-${b.id}-${d}`, lane: b.id, type: 'Maintenance', label: 'Planned maintenance', a, b: a + 720 }); } });
    return { lanes, items, conflicts };
  }

  // ── seed and warm-up ──
  function seed(t0) {
    const r = RS('seed');
    Object.entries(byCode).forEach(([code, ks]) => {
      const use = useT[code] || .2, dens = densOf(code);
      const days = SPEC.includes(code) ? U(r, 10, 14) : (G1.includes(code) || G23.includes(code)) ? U(r, 10.5, 13.5) : TANK_ADD.includes(code) ? U(r, 6, 8.5) : 30;
      const room = ks.reduce((a, k) => a + (k.moc - k.heel), 0);
      const want = Math.min(use * days / dens, room * .82);
      const w = ks.map((k, i) => (k.moc - k.heel) * (ks.length > 1 && i === 0 ? .25 : U(r, .75, 1.25))), ws = w.reduce((a, x) => a + x, 0);
      ks.forEach((k, i) => { k.v0 = clamp(k.heel + want * w[i] / ws, k.heel + 3, k.moc * .9); k.vol = k.v0; k.batch = `RCP-${k.id}-${ymd(t0 - 1440 * (2 + i)).slice(2)}`; });
    });
    Object.keys(STORE).forEach(c => { STORE[c] = Math.max(2, (useT[c] || .2) * U(r, 12, 20)); });
    AUXT.forEach(k => { k.v0 = k.vol = k.nominal * (k.code === 'SLOP' ? U(r, .15, .4) : k.code === 'FLUSH' ? U(r, .4, .7) : U(r, .05, .2)); });
    LIQG.forEach(G => {
      if (!G.runner) return;
      const ks = G.tanks.map(id => TK[id]), dens = G.dens / 1000, rel = G.d * U(r, 1.5, 2.1) / dens, qc = ks.length > 1 && r() < .35 ? G.d * U(r, .3, .6) / dens : 0;
      ks.forEach((k, i) => {
        const capk = k.moc - k.heel;
        if (qc && i === ks.length - 1) { k.v0 = k.heel + Math.min(capk * .9, qc); k.state = 'QC hold'; k.q = 'Awaiting test results'; k.batch = `BLD-MLB-${yymm(t0)}-0${300 + Math.floor(r() * 80)}`; labSubmit(t0, 'Release', G.code, k.batch, k.id, 'Seed', { kind: 'releaseBatch', batch: null, tank: k.id }); }
        else k.v0 = k.heel + Math.min(capk * .92, rel / Math.max(1, ks.length - (qc ? 1 : 0)) * U(r, .8, 1.2));
        k.vol = k.v0; if (!k.batch) k.batch = `BLD-MLB-${yymm(t0)}-0${200 + Math.floor(r() * 99)}`;
      });
    });
    SKUS.forEach(k => whAdd(k, k.dU * WH_TGT[k.zone] * U(r, .72, .95)));
    // grease hoppers with released stock
    S.grease.hoppers.forEach((h, i) => { const G = GRSG[(i * 3 + 1) % GRSG.length]; h.code = G.code; h.t = U(r, 5, 12); h.q = 'Released'; h.batch = `BLD-MLB-${yymm(t0)}-0${150 + i}`; h.relAt = t0 - 600; });
    // ISO yard ≈ 185: clean and dirty empties, fulls waiting to leave, inbound fulls, empties to return, repairs
    const mk = (cat, n) => { for (let i = 0; i < n; i++) {
      if (cat === 'IF') { const x = isoArrive(t0 - Math.round(U(r, 0, 1200)), r, r() < .45 ? 'rail' : 'sea', r() < .45 ? pick(r, G1) : r() < .4 ? pick(r, SPEC) : pick(r, ISO_ADD)); if (x) { x.heatUntil = x.heat ? t0 + Math.round(U(r, -60, 900)) : t0; pendIso[x.code] = (pendIso[x.code] || 0) + x.t; } continue; }
      const { own, id } = newIsoId(r), G = pick(r, BULKG.filter(isoOK)), u = r(), mode = u < .25 ? 'road' : u < .5 ? 'rail' : 'sea';
      const x = { id, own, cat, code: G.code, t: cat === 'FO' ? +U(r, 18.5, 21).toFixed(1) : 0, tempC: 31, heat: false, slot: -1, loc: '', since: t0, mode, due: cat === 'FO' ? t0 + Math.round(U(r, 360, 2880)) : null, ret: cat === 'ER' ? (r() < .5 ? 'sea' : 'road') : null, arrived: t0 - Math.round(U(r, 60, 2880)), repairUntil: cat === 'RP' ? t0 + Math.round(U(r, 600, 4000)) : null };
      isoAdd(x, t0, false);
    } };
    mk('EC', 60); mk('ED', 12); mk('FO', 25); mk('IF', 52); mk('ER', 20); mk('RP', 8);
    const icy = S.rail.icy; icy.dryEmpty = 170; icy.full.JKT = 18; icy.full.SUB = 10; icy.full.FDR = 30; icy.fullT.JKT = 18 * 15.5; icy.fullT.SUB = 10 * 15.5; icy.fullT.FDR = 30 * 15.5;
    Object.values(MS).forEach(m => { m.stock = Math.min(m.cap, m.useD * U(r, 2.2, 2.8)); }); MS.resin.stock = 240; MS.bottles.stock = MS.bottles.cap * .8; MS.cans.stock = MS.cans.cap * .8;
    // story anchors: an import tanker discharging at J1, a coastal tanker and a feeder recently arrived
    const anchor = (cls, etaAgo) => { const v = nominate(cls, REF - etaAgo, RS('story|' + cls)); return v; };
    lastDay = dayOf(t0); railDay(lastDay - 1); railDay(lastDay); railDay(lastDay + 1);
    anchor('IMP', 1320); anchor('CST', 540); const f = anchor('FDR', 300); f.fday = dayOf(f.eta); f.svc = 'B'; f.service = 'Service B · Singapore–Jakarta–Kendal';
    { const X = S.xdock, p = XD_T / .7 * U(r, .8, 1.2), hb = p * XD_HBW; X.HBW = hb; X.DRM = p - hb; X.t = p * .7; zonePal.HBW += hb; zonePal.DRM += p - hb; } // about a day of cross-dock stock
    lineup(t0);
    T.tanks.forEach(k => { k.vol = k.v0; });
  }

  // ── interface ──
  function boundary(s, ev) {
    EVQ = ev || []; curSlot = s / 5;
    commit(s); S.now = s; S.slot = s; S.frac = 0;
    while (AG.length && AG[0].at <= s) AG.shift().fn(s);
    calendar(s); weather(s); utilities(s);
    marine(s); rail(s);
    const ri = RS('iso|' + s); isoStation(s, ri); isoOrders(s, ri, df); if (minOf(s) % 360 === 0) isoSupply(s, RS('isup|' + s));
    blending(s); swingTanks(s, RS('swg|' + s)); grease(s);
    lab(s);
    gradeStocks(); relG.fill(0); S.grease.hoppers.forEach(h => { if (h.code && h.q === 'Released') relG[GI[h.code]] += h.t; });
    lines(s); blowMoulding(s, RS('bm|' + s)); if (minOf(s) % 60 === 0) bookMaterials(s, RS('mat|' + s));
    warehouse(s, RS('wh|' + s)); stuffing(s, RS('stf|' + s));
    trucks(s, df);
    tankStatus(); kpis(s); history(s);
    for (let i = S.batches.length - 1; i >= 0; i--) { const b = S.batches[i]; if (b.end != null && b.end < s - 2880 && b.state !== 'QC hold' && b.state !== 'In progress') S.batches.splice(i, 1); }
    S.events.length > 400 && (S.events.length = 400);
  }
  function advance(from, to) {
    if (!S.ready) return;
    const s0 = curSlot * 5, frac = clamp((to - s0) / 5, 0, 1); S.frac = frac; S.now = to;
    for (const k of T.tanks) if (k.pIn || k.pOut) k.vol = k.v0 + (k.pIn - k.pOut) * frac;
  }
  const t0 = Math.floor((REF - 1800) / 5) * 5;
  seed(t0);
  curSlot = t0 / 5;
  for (let s = t0 + 5; s <= REF; s += 5) boundary(s, []);
  S.warm = false; S.ready = true;
  // days before the warm-up are synthesised around plan, flagged synthetic
  for (let i = S.days.length; i < 14; i++) { const d = (S.days.length ? S.days[S.days.length - 1].day : dayOf(REF)) - 1, r = RS('syn|' + d), w = ((d + 3) % 7 + 7) % 7, f = U(r, .94, 1.06), rf = DOWF[w];
    S.days.push({ day: d, at: midnight(d), label: api.day(midnight(d) + 720, 'WIB'), out: PLAN * f, pkgT: (PLAN - BULK_D) * f, bulkT: BULK_D * f, road: ((PLAN - BULK_D + XD_T) * PKG_SHARE.road * rf + BULK_D * (CH.road + CH.iso * .25) + EXP_D * (EXP_CH.road + EXP_CH.iso * .4)) * f, rail: ((PLAN - BULK_D + XD_T) * PKG_SHARE.rail + BULK_D * CH.iso * .25 + EXP_D * EXP_CH.iso * .2) * f, sea: ((PLAN - BULK_D + XD_T) * PKG_SHARE.sea + BULK_D * (CH.iso * .5 + CH.FBC + CH.SPOB) + EXP_D * (EXP_CH.sea + EXP_CH.iso * .4)) * U(r, .7, 1.3), recSea: 3400 * U(r, .5, 1.5), recRail: RAIL_G1 * f, recRoad: 220 * f, blendT: (PLAN - FAMILIES.GR.share * PLAN) * U(r, .9, 1.1), reexp: EXP_D * U(r, .85, 1.1), recXd: XD_T * U(r, .85, 1.1), greaseT: FAMILIES.GR.share * PLAN * U(r, .85, 1.1), batches: Math.round(95 * U(r, .9, 1.1)), rft: U(r, .955, .99), isoFills: Math.round(19 * f), isoDisch: Math.round(16 * f), railMoves: Math.round(130 * f), trucks: Math.round(300 * rf), boxes: Math.round(88 * f), units: Math.round(320000 * f), synthetic: true }); }
  return {
    id: 'MLB', state: S, generate: boundary, advance, flow, schedule, tests: testsFor, measure: measureFor, series: seriesOf,
    info: { FAMILIES, PRODS, GRADES, GRADE, COMP, FMTS, PACKS, JETTIES, LINES, BLENDERS, HALLS, BAY_CLASSES, ISO_CRANES, ISO_BLOCKS, RMGS, VCLS, PLAN, NAMEPLATE, groupOf },
    gradeStock: code => { const gi = GI[code]; if (gi == null) return null; const G = GRADES[gi], d = G.dens / 1000; return { rel: relK[gi] * d, qc: qcK[gi] * d, wip: wipT[gi], wh: whT[gi], d: G.d, cover: G.d ? (relK[gi] * d + whT[gi]) / G.d : null, tanks: FPT.filter(k => k.code === code && !k.free).map(k => k.id) }; },
    whOf: code => { const gi = GI[code]; return (skuOf[gi] || []).map(k => ({ pack: k.pk, label: k.label, units: whU[k.i], pallets: whU[k.i] / k.perPal, days: k.dU ? whU[k.i] / k.dU : null })); },
    stock: code => ({ t: stockT(code), days: coverD(code), cap: capT(code), use: useT[code] || 0 }),
    store: () => ({ ...STORE }), campaigns: () => campaigns.map(c => ({ ...c, left: { ...c.left } })), samplesQueued: () => SMP_WAIT.length,
    _why: id => { // diagnostics: why a line has nothing to run
      const l = S.lines.find(x => x.id === id); if (!l) return null;
      return l.skus.map(i => { const k = SKUS[i], G = k.G, gi = GI[G.code], tanks = G.runner ? G.tanks.map(t => TK[t]) : FPT.filter(t => t.code === G.code && !t.free);
        return { code: G.code, pk: k.pk, cov: whU[i] / (k.dU * WH_TGT[k.zone]), rel: relFor(G), res: resK[gi], runner: G.runner, tanks: tanks.map(t => `${t.id}:${t.state}${t.fill ? '/fill' + (t.fill.flowing ? '+' : '') : ''}:${Math.round(t.v0 - t.heel)}`).join(' '), wip: wipT[gi], wh: whT[gi], d: G.d }; }).sort((a, b) => a.cov - b.cov).slice(0, 6);
    },
  };
}
