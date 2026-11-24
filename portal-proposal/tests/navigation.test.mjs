import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TABS,tabsFor,landingFor} from '../public/__nav/bar.mjs';
const P=(d,s,tl,ss,sc,t)=>({drawings:d,safety:s,timeline:tl,scurve_station:ss,scurve_caltex:sc,tasks:t});
test('tabs follow page access: Sites needs the Sites page; only admins and observers see Admin',()=>{
 assert.deepEqual(tabsFor({pages:P('none','none','view','view','none','edit')}).map(t=>t.id),['schedule','tasks']);
 assert.deepEqual(tabsFor({pages:P('view','view','view','none','none','edit')}).map(t=>t.id),['sites','schedule','tasks']);
 assert.deepEqual(tabsFor({pages:{...P('view','view','view','view','view','edit'),files:'view',meetings:'edit'},accessView:true}).map(t=>t.id),['sites','schedule','files','meetings','tasks','admin']);
 assert.deepEqual(tabsFor({}).map(t=>t.id),[]);
 assert.equal(landingFor({pages:P('none','none','view','view','none','none')}),'/milestones/');
 assert.equal(landingFor({pages:P('view','view','view','view','view','edit')}),'/sites/');
 assert.equal(landingFor({pages:P('none','none','view','view','none','edit')}),'/tasks.html','no Sites access: Tasks');
});
test('every tab stays on this site and has Thai and English names',()=>{
 for(const t of TABS){assert.ok(t.href.startsWith('/')&&!t.href.startsWith('//'),t.href);assert.ok(t.th&&t.en)}
 const js=fs.readFileSync(new URL('../public/__nav/bar.mjs',import.meta.url),'utf8');assert.doesNotMatch(js,/https?:|innerHTML/);
});
test('no home page files remain; every signed-in page loads the bar',()=>{
 assert.ok(!fs.existsSync(new URL('../public/project-home.html',import.meta.url)));
 for(const f of ['../public/sites/index.html','../public/sites/site.html','../public/milestones/index.html','../public/files/index.html','../public/meetings/index.html','../public/account.html','../../tasks/public/index.html'])
  assert.match(fs.readFileSync(new URL(f,import.meta.url),'utf8'),/<script type="module" src="\/__nav\/bar\.mjs"><\/script>/,f);
});
test('sub-tabs show only the parts a person may open',async()=>{
 const {subsFor}=await import('../public/__nav/bar.mjs');
 const tab=(id)=>TABS.find(t=>t.id===id);
 const ks={pages:{drawings:'none',safety:'none',timeline:'view',scurve_station:'view',scurve_caltex:'none',tasks:'edit'}};
 assert.deepEqual(subsFor({pages:{drawings:'view'}},tab('sites')).map(s=>s.href),['/sites/','/sites/programme/','/drawing-changes/']);
 assert.deepEqual(subsFor(ks,tab('sites')).map(s=>s.href),[],'no Sites sub-tabs without the Sites page');
 assert.ok(tab('sites').match('/sites/1703/')&&tab('sites').match('/drawing-changes/')&&tab('schedule').match('/milestones/')&&!tab('sites').match('/sitesx'));
 const all=tab('sites').subs[0],prog=tab('sites').subs[1];
 assert.ok(all.match('/sites/')&&all.match('/sites/1703/')&&!all.match('/sites/programme/')&&prog.match('/sites/programme/'));
});
