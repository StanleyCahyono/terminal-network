// Lubricant superhub — catalog, plant model and live simulation for the specialised terminal.
// STUB: defines the interface data.js uses. Until TERMINAL is set, the superhub is not part of the network.
//
// Interface (all used by data.js):
//   TERMINAL   terminal definition appended to the terminal list (same shape as data.js TDEF entries, plus
//              superhub: true, blenders: n). null = no superhub.
//   CATALOG    product registrations for prod(): { code, label, short, fam, kind: 'product'|'component', color, dens, ... }
//   RECIPES    blend recipes by finished-product code, same shape as data.js RECIPES
//              ({ comps: [[code, pct], ...], tol, note, props: [[name, unit, 'calc'|null], ...] })
//   isLube(code)          true for codes this module owns (QC tests and results come from the hub)
//   createSuperhub(api) → hub with:
//     id                   terminal id
//     generate(s, ev)      slot boundary (every 5 scenario minutes): create activity, push operator events to ev
//     advance(from, to, ev) continuous flows between from and to (scenario minutes, same slot)
//     flow(tankId, a, b)   { rec, dis } kL moved in/out of a tank by hub-internal operations during [a, b]
//     schedule()           { lanes, items, conflicts } for the Scheduling board
//     tests(code)          QC test templates [{ prop, method, unit, spec, now }]
//     measure(test, code, r, bad)  a measured test { prop, method, result, unit, spec, status }
//     state                live object the Superhub screen renders
export const TERMINAL = null;
export const CATALOG = [];
export const RECIPES = {};
export const isLube = () => false;
export function createSuperhub() {
  return {
    id: null,
    generate() {}, advance() {},
    flow: () => ({ rec: 0, dis: 0 }),
    schedule: () => ({ lanes: [], items: [], conflicts: [] }),
    tests: () => [], measure: x => ({ ...x, result: '—', status: 'Passed' }),
    state: {},
  };
}
