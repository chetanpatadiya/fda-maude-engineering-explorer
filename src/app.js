import {PATHWAYS,LENSES} from './taxonomy.js';
import {DEMO_RECORDS} from './demo-data.js';
import {buildQuery,fetchReports} from './api.js';
import {summarize,escapeHtml,toCsv,generateBrief,fdaRecordUrl} from './analysis.js';

const $ = id=>document.getElementById(id);
const state={records:DEMO_RECORDS,source:'demo',total:null,url:null,query:{},lens:'all',showMatchedOnly:true,summary:null,busy:false};
let toastHandle;

function criteria(){return {
  from:$('from').value,to:$('to').value,productCode:$('productCode').value.trim(),
  manufacturer:$('manufacturer').value.trim(),keyword:$('keyword').value.trim(),
  eventType:$('eventType').value,limit:Number($('limit').value)
};}
function notify(message,isError=false){
  const t=$('toast');t.textContent=message;t.className='toast'+(isError?' error':'');t.hidden=false;
  clearTimeout(toastHandle);toastHandle=setTimeout(()=>{t.hidden=true},6500);
}
function notice(title,content,type){
  const n=$('sourceNotice');n.className='notice '+(type||'');
  n.innerHTML=`<span class="notice-dot"></span><div><strong>${escapeHtml(title)}</strong><span> ${escapeHtml(content)}</span></div>`;
}
function updateQuery(){
  try {const url=buildQuery(criteria());$('queryPreview').textContent=url;return url;}
  catch(e){$('queryPreview').textContent=e.message;return null;}
}
function setSourceSelection(){
  $('demoBtn').classList.toggle('selected',state.source==='demo');
  $('liveBtn').classList.toggle('selected',state.source==='live');
}
function render(){
  setSourceSelection();
  const lens=LENSES.find(x=>x.id===state.lens)??LENSES[0];
  const s=summarize(state.records,lens.pathways);state.summary=s;
  $('statReports').textContent=s.loaded.toLocaleString();
  $('statNarratives').textContent=s.narrativeAvailable.toLocaleString();
  $('statMatched').textContent=s.matched.length.toLocaleString();
  $('statCaution').textContent=s.cautioned.toLocaleString();
  const max=Math.max(...s.themeStats.map(x=>x.count),1);
  $('pathwayChart').innerHTML=s.themeStats.map(x=>`<div class="chart-row">
    <div class="chart-label">${escapeHtml(x.pathway.name)}</div>
    <div class="chart-track" aria-label="${escapeHtml(x.pathway.name)}: ${x.count} reports"><div class="chart-fill" style="width:${(100*x.count/max).toFixed(1)}%"></div></div>
    <div class="chart-number">${x.count}</div>
  </div>`).join('')||'<div class="no-data">No pathways selected.</div>';
  const items=state.showMatchedOnly?s.matched:s.rows;
  $('reportList').innerHTML=items.length?items.slice(0,250).map(r=>{
    const caution=r.classified.some(c=>c.cautioned);
    const evidence=r.classified.flatMap(c=>c.matches);
    const snippet=evidence.length?evidence[0].context:r.narrative.slice(0,320)||'No narrative provided in this report.';
    const link=fdaRecordUrl(r);
    return `<article class="report-row">
      <div class="report-head"><div><strong>${escapeHtml(r.reportNumber||r.id)}</strong>
      <div class="report-meta">${escapeHtml(r.date)} · ${escapeHtml(r.generic)} · ${escapeHtml(r.manufacturer)} · Product code ${escapeHtml(r.productCode)}</div></div><span class="event-tag">${escapeHtml(r.eventType)}</span></div>
      <div class="theme-badges">${r.classified.map(c=>`<span class="theme-badge">${escapeHtml(c.pathway.name)}</span>`).join('')}
      ${caution?'<span class="theme-badge warning">Qualification flag: read full narrative</span>':''}
      ${!r.classified.length?'<span class="theme-badge warning">No dictionary match</span>':''}</div>
      <blockquote class="excerpt">${escapeHtml(snippet)}${r.narrative.length>snippet.length?' …':''}</blockquote>
      <div class="report-footer"><small>${r.source==='demo'?'FICTIONAL RECORD — for interface demonstration':r.source==='import'?'Locally imported data — verify provenance':'Public openFDA response · sample only'}${evidence.length?' · '+evidence.length+' lexical mention(s)':''}</small>${link?`<a target="_blank" rel="noopener noreferrer" href="${escapeHtml(link)}">Inspect source JSON ↗</a>`:''}</div>
      </article>`;
  }).join(''):`<div class="no-data">${s.loaded?'No pathways matched this cohort and lens. Try another lens or disable “Matched records only.”':'No reports returned. Narrow or revise your query.'}</div>`;
}
function download(name,content,type){
  const blob=new Blob([content],{type});
  const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);
}
async function searchLive(){
  if(state.busy)return;
  let params=criteria(),url;
  try{url=buildQuery(params);}catch(e){notify(e.message,true);return;}
  $('liveBtn').disabled=true;$('fetchBtn').disabled=true;$('fetchBtn').textContent='Retrieving from openFDA…';state.busy=true;
  try{
    const data=await fetchReports(params);
    state.records=data.records.map(r=>({...r,__source:'live'}));
    state.source='live';state.total=data.total;state.url=data.url;state.query=params;
    notice('Live FDA data loaded',`${data.records.length} reports inspected locally${data.total!==null?' from '+data.total.toLocaleString()+' matching reports':''}. Counts are sample-limited; no incidence or cause is inferred.`,'live');
    render();notify(`${data.records.length} records retrieved. Inspect source narratives before interpreting.`);
  }catch(e){
    notify(`Search failed: ${e.message}. Synthetic demo and JSON import remain available.`,true);
  }finally{
    state.busy=false;$('liveBtn').disabled=false;$('fetchBtn').disabled=false;
    $('fetchBtn').innerHTML='Search live FDA data <span>→</span>';
  }
}
function loadDemo(){
  state.records=DEMO_RECORDS;state.source='demo';state.total=null;state.url=null;state.query={data:'synthetic demo'};
  notice('Synthetic demonstration loaded','All eight example narratives are fictional. Select “Search live FDA” to access public openFDA records.','');
  render();
}
async function importJson(file){
  if(!file)return;
  if(file.size>20*1024*1024){notify('Import file exceeds 20 MB browser prototype limit.',true);return;}
  try{
    const obj=JSON.parse(await file.text());
    const rows=Array.isArray(obj)?obj:obj?.results;
    if(!Array.isArray(rows))throw Error('JSON must be an openFDA response with a results array, or an array of MAUDE report objects.');
    if(rows.length>5000)throw Error('Import at most 5,000 reports for this prototype.');
    state.records=rows.map(r=>({...r,__source:'import'}));state.source='import';state.query={importedFile:file.name,reportCount:rows.length};
    state.total=Number.isFinite(obj?.meta?.results?.total)?obj.meta.results.total:null;state.url=null;
    notice('Locally imported JSON',`${rows.length} records from “${file.name}”. Content and provenance have not been independently verified.`,'import');
    render();notify(`Imported ${rows.length} records locally.`);
  }catch(e){notify(`Cannot import JSON: ${e.message}`,true);}finally{$('fileImport').value='';}
}

$('searchForm').addEventListener('submit',e=>{e.preventDefault();searchLive();});
$('demoBtn').addEventListener('click',loadDemo);
$('liveBtn').addEventListener('click',()=>{if(!criteria().productCode&&!criteria().manufacturer&&!criteria().keyword){$('keyword').value='pouch';updateQuery();}searchLive();});
$('fileImport').addEventListener('change',e=>importJson(e.target.files?.[0]));
for(const p of document.querySelectorAll('.preset'))p.addEventListener('click',()=>{$('keyword').value=p.dataset.keyword;updateQuery();notify(`Narrative phrase set to “${p.dataset.keyword}”. Press Search live FDA data to retrieve matching reports.`);});
for(const control of $('searchForm').querySelectorAll('input,select'))control.addEventListener('input',updateQuery);
document.querySelectorAll('[name="lens"]').forEach(el=>el.addEventListener('change',e=>{state.lens=e.target.value;render();}));
$('matchedOnly').addEventListener('change',e=>{state.showMatchedOnly=e.target.checked;render();});
$('downloadCsv').addEventListener('click',()=>{download('maude-explorer-loaded-sample-v0.1.csv',toCsv(state.summary.rows),'text/csv;charset=utf-8');notify('Export includes the loaded sample, not the full FDA cohort.');});
$('downloadBrief').addEventListener('click',()=>{
  const lens=LENSES.find(x=>x.id===state.lens);
  download('maude-engineering-investigation-brief-v0.1.md',generateBrief(state.summary,state.query,lens.label,state.source,state.total,state.url),'text/markdown;charset=utf-8');
});
$('copyQuery').addEventListener('click',async()=>{
  const query=updateQuery();if(!query){notify('Define a valid cohort before copying the URL.',true);return;}
  try{await navigator.clipboard.writeText(query);notify('FDA API query URL copied.');}
  catch{notify('Clipboard unavailable here. Select the URL in the preview and copy it.',true);}
});
state.query={data:'synthetic demo'};updateQuery();render();
