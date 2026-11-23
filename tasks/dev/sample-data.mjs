// Sample tasks for local previews and the staging copy ONLY. Never load into production.
// Dates are relative to "today" so the preview always looks current.
import { taskService } from '../src/service.mjs';

export async function loadSamples(db, today = new Date()) {
  const svc = taskService(db);
  const d = (n) => { const x = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + n)); return x.toISOString().slice(0, 10); };
  const T = async (by, title, o = {}) => (await svc.createTask(by, { title, start: d(o.start ?? -2), due: d(o.due ?? 5), ...o.f, assignees: o.to, checklist: o.cl, description: o.desc })).id;
  const act = (by, id, a) => svc.taskAction(by, id, a);
  const ver = async (id) => (await svc.state('brian')).tasks.find((t) => t.id === id).version;
  const tick = async (by, id, n) => { const s = await svc.state('brian'); const t = s.tasks.find((x) => x.id === id); for (const c of t.checklist.slice(0, n)) await act(by, id, { action: 'checklist_toggle', itemId: c.id, done: true }); };

  const canopy = await T('keng', 'Canopy steel column erection, grid C1–C6', { to: ['tle'], start: -6, due: 4, f: { area: 'canopy', priority: 'high' },
    cl: ['Baseplates grouted C1–C3', 'Columns C1–C3 lifted & plumbed', 'Columns C4–C6 lifted', 'Bolt torque check with KS'],
    desc: 'Crane booked 07:00–15:00. Follow lift plan LP-03. Exclusion zone around the forecourt while lifting.' });
  await tick('tle', canopy, 2);
  await act('tle', canopy, { action: 'comment', body: 'C1–C3 up and plumbed. @Ming can you get KS to check bolt torque before we lift the roof beams?' });

  const tanks = await T('keng', 'Underground tanks: set & hold-down (3 × 30,000 L)', { to: ['a', 'por'], start: -12, due: 3, f: { area: 'fuel', priority: 'urgent' },
    cl: ['Tank pit excavation', 'Concrete base slab', 'Tanks lifted in', 'Hold-down straps tensioned', 'Backfill with pea gravel'],
    desc: 'Tanks T1 ULG95, T2 ULG91, T3 Diesel. Do not backfill until KS signs the strap inspection.' });
  await tick('a', tanks, 3);

  const barricade = await T('noom', 'Excavation barricade & signage at tank pit', { to: ['noom', 'por'], start: -3, due: -1, f: { area: 'fuel', category: 'safety', priority: 'urgent' },
    cl: ['Hard barricade on 3 sides', 'Warning signs (TH/EN)', 'Night lighting', 'Ladder access'] });
  await tick('por', barricade, 2);

  const formwork = await T('brian', 'Check formwork at dispenser island 2', { to: ['a'], start: 0, due: 2, f: { area: 'fuel' } });
  await T('bo', 'Dispenser island forming, islands 1 & 2', { to: ['gift'], start: 2, due: 9, f: { area: 'fuel' } });
  const mdb = await T('keng', 'MDB installation & termination', { to: ['gift'], start: -1, due: 14, f: { area: 'electrical' } });
  await act('gift', mdb, { action: 'progress', progress: 25 });
  const trench = await T('bo', 'Storm drain trench along frontage, CH 0+000 to 0+045', { to: ['por'], start: -5, due: 2, f: { area: 'drainage' },
    cl: ['Set out & level pegs', 'Excavate 0+000 to 0+020', 'Excavate 0+020 to 0+045', 'Bedding & pipe laying'] });
  await tick('por', trench, 2);
  const purlins = await T('keng', 'Sales building roof purlins', { to: ['tle'], start: 4, due: 12, f: { area: 'building' } });
  const pylon = await T('keng', 'Pylon sign foundation pour', { to: ['a'], start: 1, due: 5, f: { area: 'sign', priority: 'high' }, cl: ['Rebar cage inspected', 'Anchor bolt template set', 'Cube samples × 6'] });
  const cubes = await T('ming', '7-day cube results: pylon & canopy footings', { to: ['bo'], start: -1, due: 1, f: { area: 'concrete', category: 'engineering' }, desc: 'Target 280 ksc at 28 days.' });
  await act('bo', cubes, { action: 'progress', progress: 100 });
  const permit = await T('brian', 'Highway sign permit: Dept. of Highways submission', { to: ['bo'], start: -14, due: 10, f: { area: 'sign', category: 'permits', priority: 'high', status: 'hold' },
    desc: 'Waiting for the stamped setback drawing from KS before we can submit.' });
  await T('noom', 'Weekly toolbox talk: hot work & lifting', { to: ['noom'], start: 0, due: 1, f: { area: 'misc', category: 'safety', repeat: 'weekly' }, cl: ['Attendance sheet', 'Photos for weekly report'] });
  await T('keng', 'Variation orders VO-03 to VO-05: cost review', { to: ['brian', 'ming'], start: -2, due: 5, f: { area: 'misc' }, desc: 'Internal only. Agree rates before anything goes to Caltex.' });
  await T('brian', 'Site team payment certificates, October', { to: ['ming'], start: -1, due: 6, f: { area: 'misc' } });
  await T('ming', 'Earthing pit resistance test (under 5 Ω)', { to: ['gift'], start: 6, due: 8, f: { area: 'electrical', category: 'engineering' } });
  const hoarding = await T('noom', 'Site hoarding repair, north side', { to: ['por'], start: -2, due: 0, f: { area: 'misc' } });

  // Gift sends work for sign-off; Tle (her lead) reviews.
  const giftEarth = await T('tle', 'Temporary lighting for night work', { to: ['gift'], start: -4, due: -1, f: { area: 'electrical' } });
  await act('gift', giftEarth, { action: 'progress', progress: 100 });
  await act('gift', giftEarth, { action: 'submit', version: await ver(giftEarth) });

  // Partner work
  const fascia = await T('boy', 'Canopy fascia panels: colour samples for brand approval', { to: ['bo'], start: -10, due: 6, f: { area: 'canopy', category: 'client' },
    cl: ['Get 3 samples from supplier', 'Photograph in daylight', 'Send samples to Bas & Boy'] });
  await tick('bo', fascia, 1);
  await act('boy', fascia, { action: 'comment', body: '@Bo please include the LED light box sample as well.' });
  const lux = await T('bas', 'Canopy lighting: lux levels to brand standard', { to: ['gift'], start: -2, due: 10, f: { area: 'canopy', category: 'client' } });
  await act('bas', lux, { action: 'comment', body: '@Gift please send the lux calculation for the canopy lights.' });
  await T('net', 'Office AC: confirm unit sizes', { to: ['brian'], start: -3, due: 9, f: { area: 'office', category: 'client' }, desc: 'Cashier area at 24°C.' });
  await T('tom', 'Site inspection report #6', { to: ['bo'], start: -1, due: 3, f: { area: 'misc', category: 'engineering' } });
  await T('chai', 'Boundary fence line: confirm east corner peg', { to: ['bo'], start: -4, due: 1, f: { area: 'misc', category: 'client' } });

  // Requests to partners
  await svc.sendRequest('brian', { recipient: 'net', title: 'Sign off progress payment claim #3', message: 'Claim #3 covers October works. Backup sheets are in the shared folder.', due: d(4), privateNote: 'Chase at Thursday meeting if not signed.' });
  const pack = await svc.sendRequest('gift', { recipient: 'oat', title: 'Review electrical safety pack against Caltex standards', message: 'Pack for MDB and dispenser wiring works.', due: d(5) });
  await svc.requestAction('oat', pack.id, { action: 'reply', body: 'Received. Will review by Wednesday.' });
  await svc.sendRequest('noom', { recipient: 'oat', title: 'Approve hot work procedure for canopy welding', due: d(2) });
  const vent = await svc.sendRequest('keng', { recipient: 'net', title: 'Confirm tank vent pipe height & location', due: d(3) });
  await svc.requestAction('net', vent.id, { action: 'answer', body: 'Vent 4 m above ground, 1.5 m from the boundary.', version: 1 });
  await svc.sendRequest('brian', { recipient: 'wut', title: 'Pre-pour inspection booking, forecourt Zone A', due: d(6) });

  // A closed task for History
  const clear = await T('keng', 'Site clearance & topsoil strip', { to: ['por'], start: -40, due: -31, f: { area: 'misc' } });
  await act('keng', clear, { action: 'approve', version: await ver(clear) });

  void formwork; void purlins; void pylon; void permit; void hoarding;
}
