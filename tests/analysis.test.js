import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQuery} from '../src/api.js';
import {DEMO_RECORDS} from '../src/demo-data.js';
import {PATHWAYS} from '../src/taxonomy.js';
import {classifyRecord,escapeHtml,generateBrief,normalizeRecord,safeCsvCell,summarize,toCsv,fdaRecordUrl} from '../src/analysis.js';
const sample=()=>summarize(DEMO_RECORDS,PATHWAYS.map(p=>p.id));
test('synthetic demonstration records deduplicate by MDR key',()=>{
  const s=sample();assert.equal(s.loaded,8);assert.equal(s.rows[0].source,'demo');
  const doubled=summarize([...DEMO_RECORDS,...DEMO_RECORDS],PATHWAYS.map(p=>p.id));assert.equal(doubled.loaded,8);
});
test('recognizes packaging, labeling and distribution candidate phrases',()=>{
  const s=sample();
  assert.ok(s.rows[0].classified.some(x=>x.pathway.id==='barrier'));
  assert.ok(s.rows[3].classified.some(x=>x.pathway.id==='label'));
  assert.ok(s.rows[5].classified.some(x=>x.pathway.id==='aging'));
  assert.ok(s.rows[2].classified.some(x=>x.pathway.id==='transport'));
});
test('flags local negation and does not assert a confirmed failure',()=>{
  const s=sample();const match=s.rows[4].classified.find(x=>x.pathway.id==='barrier');
  assert.ok(match);assert.equal(match.cautioned,true);assert.ok(match.matches.some(x=>x.negated));
});
test('can show unmatched narratives and respect lens',()=>{
  const s=summarize(DEMO_RECORDS,['label']);assert.equal(s.loaded,8);assert.equal(s.themeStats.length,1);
  assert.equal(s.matched.length,1);
});
test('handles absent device/narrative fields',()=>{
  const r=normalizeRecord({mdr_report_key:'11',device:[],mdr_text:[]});assert.equal(r.narrative,'');assert.equal(r.generic,'Unspecified');
  assert.deepEqual(classifyRecord(r),[]);
});
test('escapes user supplied content and CSV injection',()=>{
  assert.equal(escapeHtml('<script>"'), '&lt;script&gt;&quot;');
  assert.equal(safeCsvCell('=HYPERLINK("bad")'),'"\'=HYPERLINK(""bad"")"');
  const row=sample().rows[0];assert.ok(toCsv([row]).includes('SYNTHETIC'));
});
test('builds safe, field-specific, date-scoped FDA query',()=>{
  const url=buildQuery({from:'2026-01-01',to:'2026-11-01',productCode:'dxy',keyword:'seal breach',manufacturer:'Example',eventType:'Malfunction',limit:100});
  const u=new URL(url);const s=u.searchParams.get('search');
  assert.ok(s.includes('date_received:[20260101 TO 20261101]'));
  assert.ok(s.includes('device.device_report_product_code:"DXY"'));
  assert.ok(s.includes('mdr_text.text:"seal breach"'));
  assert.equal(u.searchParams.get('limit'),'100');
});
test('rejects uncontrolled broad queries and malformed criteria',()=>{
  assert.throws(()=>buildQuery({from:'2026-01-01',to:'2026-10-01',limit:100}),/Add a product code/);
  assert.throws(()=>buildQuery({from:'2026-01-01',to:'2026-10-01',productCode:'XXXX',limit:100}),/exactly three/);
  assert.throws(()=>buildQuery({from:'2027-01-01',to:'2026-10-01',keyword:'seal',limit:100}),/valid date range/);
  assert.throws(()=>buildQuery({from:'2026-01-01',to:'2026-10-01',keyword:'seal',limit:251}),/between 1 and 250/);
});
test('brief retains limitations and synthetic status, no false FDA record URL',()=>{
  const s=sample();const text=generateBrief(s,{keyword:'pouch'},'All pathways','demo',null);
  assert.match(text,/SYNTHETIC DEMONSTRATION/);assert.match(text,/not a verified failure count/);
  assert.equal(fdaRecordUrl(s.rows[0]),null);
  const actual=normalizeRecord({mdr_report_key:'12345',report_number:'12345-2026-00001'});
  assert.match(fdaRecordUrl(actual),/mdr_report_key/);
});
